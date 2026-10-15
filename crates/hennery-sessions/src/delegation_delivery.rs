//! Durable reverse delivery. Source facts and notices commit together; only
//! matching turn facts acknowledge delivery. All content is read from the log.
use anyhow::Result;
use hennery_proto::{plugin::InputOrigin, rest::EventDto};
use rusqlite::{OptionalExtension, Transaction, params};

/// Called for applied host facts and collector facts in their own transaction.
pub(crate) fn record_in(tx: &Transaction<'_>, owner: &str, event: &EventDto) -> Result<()> {
    let pending = event.body.get("pending_id").and_then(serde_json::Value::as_str);
    let reason = event.body.get("reason").and_then(serde_json::Value::as_str);
    let turn = event.body.get("turn_id").and_then(serde_json::Value::as_str);
    let loss = matches!(event.kind.as_str(), "adapter_exited" | "host_restarted")
        || event.kind == "presumed_parked" && reason == Some("host_revoked")
        || event.kind == "session_parked" && reason == Some("adapter_exited")
        || event.kind == "turn_ended_synthesized"
        || event.kind == "pending_cancelled"
            && matches!(
                reason,
                Some("adapter_lost" | "host_restarted" | "host_revoked" | "session_parked")
            );
    let kind = if loss {
        "session_unavailable"
    } else {
        match event.kind.as_str() {
            "answer_submitted" => {
                obsolete_in(tx, owner, &event.session_id, pending)?;
                return Ok(());
            }
            "turn_ended" => "turn_ended",
            "pending_opened" => "question",
            "pending_resolved" | "pending_cancelled" => {
                obsolete_in(tx, owner, &event.session_id, pending)?;
                if event.body["resolution"] == "delivered" {
                    return Ok(());
                }
                "question_cancelled"
            }
            "start_failed" | "start_not_delivered" => "session_failed",
            _ => return Ok(()),
        }
    };
    if loss {
        obsolete_in(tx, owner, &event.session_id, None)?;
    }
    let family: Option<(String, String, String, i64, bool, String)> = tx
        .query_row(
            "SELECT f.parent_id,f.root_id,f.hat_id,g.revision,
         f.detached = 0 AND p.close_requested = 0 AND p.lifecycle IN ('starting','active','parked')
         AND g.delegation_enabled = 1 AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id,
         json_object('model',p.model,'mode',p.mode,'axes',json(COALESCE(p.config_axes,json_object())))
         FROM session_families f JOIN sessions p ON p.owner_id = ?1 AND p.id = f.parent_id
         JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
         JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = f.hat_id
         WHERE f.owner_id = ?1 AND f.child_id = ?2",
            params![owner, event.session_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )
        .optional()?;
    let Some((parent, root, hat, revision, eligible, required)) = family else {
        return Ok(());
    };
    let attach:i64 = tx.query_row("SELECT COALESCE(MAX(event_id),0) FROM events WHERE owner_id = ?1 AND session_id = ?2 AND kind = 'session_started' AND applied = 1", params![owner,event.session_id],|r|r.get(0))?;
    let incident = if loss {
        format!("loss:{attach}")
    } else if kind == "session_failed" {
        let generation:i64=tx.query_row("SELECT COALESCE((SELECT attach_generation FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2),0)",params![owner,event.session_id],|r|r.get(0))?;
        format!("failure:{attach}:{generation}")
    } else {
        format!("{}:{}", event.event_id, kind)
    };
    let permission = kind == "question" && tx.query_row("SELECT EXISTS(SELECT 1 FROM pending WHERE owner_id = ?1 AND session_id = ?2 AND pending_id = ?3 AND kind = 'permission')",params![owner,event.session_id,pending],|r|r.get::<_,bool>(0))?;
    let queued:i64 = tx.query_row("SELECT COUNT(*) FROM delegation_notices WHERE owner_id = ?1 AND parent_id = ?2 AND state IN ('parent_queued','waiting_config')",params![owner,parent],|r|r.get(0))?;
    let disposition = if !eligible {
        Some("parent_unavailable")
    } else if permission {
        Some("operator_required")
    } else if queued >= 32 {
        Some("queue_full")
    } else {
        None
    };
    let now = hennery_kernel::secret::unix_now();
    tx.execute("INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,
        source_event_id,source_events,kind,source_turn,pending_id,incident,accepted_revision,created_at,deadline,state,reason,required_config)
        VALUES (?1,?2,?3,?4,?5,?6,?7,json_array(?7),?8,?9,?10,?11,?12,?13,?13+300,?14,?15,?16)
        ON CONFLICT(owner_id,child_id,incident) DO UPDATE SET
        source_events = CASE WHEN instr(',' || trim(delegation_notices.source_events,'[]') || ',', ',' || CAST(?7 AS TEXT) || ',') = 0
            THEN json_insert(delegation_notices.source_events,'$[#]',?7) ELSE delegation_notices.source_events END,
        source_turn = COALESCE(delegation_notices.source_turn,excluded.source_turn)
        WHERE delegation_notices.owner_id = ?1 AND json_array_length(delegation_notices.source_events) < 128",
        params![owner,uuid::Uuid::now_v7().to_string(),event.session_id,parent,root,hat,event.event_id,kind,turn,pending,incident,revision,now,
        if disposition.is_some(){"operator_required"}else{"parent_queued"},disposition,required])?;
    Ok(())
}

fn obsolete_in(tx: &Transaction<'_>, owner: &str, child: &str, pending: Option<&str>) -> Result<()> {
    tx.execute(
        "UPDATE delegation_notices SET state = 'obsolete',reason = 'question_unavailable'
        WHERE owner_id = ?1 AND child_id = ?2 AND kind = 'question' AND (?3 IS NULL OR pending_id = ?3)
        AND state IN ('parent_queued','waiting_config','operator_required','parent_delivered')",
        params![owner, child, pending],
    )?;
    Ok(())
}

impl crate::store::Store {
    pub(crate) fn record_delegation_failure_in(&self, tx: &Transaction<'_>, session: &str, code: &str) -> Result<()> {
        let child: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM session_families WHERE owner_id = ?1 AND child_id = ?2)",
            params![self.owner_id(), session],
            |r| r.get(0),
        )?;
        if child {
            crate::store::collector_event(
                tx,
                self.owner_id(),
                session,
                "start_failed",
                serde_json::json!({"code":code}),
                &crate::store::now(),
            )?;
        }
        Ok(())
    }
    /// C1 validates server-written provenance against this durable association.
    pub(crate) fn verified_child_report_in(
        &self,
        tx: &Transaction<'_>,
        origin: &InputOrigin,
        target: &str,
        turn: &str,
    ) -> Result<bool> {
        let InputOrigin::ChildReport {
            child_id,
            source_event_id,
            delivery_id,
        } = origin
        else {
            return Ok(false);
        };
        Ok(tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM delegation_notices WHERE owner_id = ?1 AND delivery_id = ?2
            AND child_id = ?3 AND parent_id = ?4 AND target_turn = ?5 AND CAST(source_event_id AS TEXT) = ?6)",
            params![self.owner_id(), delivery_id, child_id, target, turn, source_event_id],
            |r| r.get(0),
        )?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn child_report_provenance_requires_every_committed_delivery_reference() {
        let store = crate::store::Store::open_in_memory().unwrap();
        for id in ["parent", "child"] {
            store
                .create_session(id, "host", "fake", "/project", "hat", None)
                .unwrap();
        }
        let mut conn = store.conn();
        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,
            source_events,kind,incident,accepted_revision,created_at,deadline,required_config,target_turn)
            VALUES (?1,'delivery','child','parent','parent','hat',7,'[7]','turn_ended','incident',1,1,301,?2,'turn')",
            params![store.owner_id(), "{}"],
        )
        .unwrap();
        let origin = |child: &str, event: &str, delivery: &str| InputOrigin::ChildReport {
            child_id: child.into(),
            source_event_id: event.into(),
            delivery_id: delivery.into(),
        };
        assert!(
            store
                .verified_child_report_in(&tx, &origin("child", "7", "delivery"), "parent", "turn")
                .unwrap()
        );
        for (child, event, delivery, parent, turn) in [
            ("other", "7", "delivery", "parent", "turn"),
            ("child", "8", "delivery", "parent", "turn"),
            ("child", "7", "other", "parent", "turn"),
            ("child", "7", "delivery", "other", "turn"),
            ("child", "7", "delivery", "parent", "other"),
        ] {
            assert!(
                !store
                    .verified_child_report_in(&tx, &origin(child, event, delivery), parent, turn)
                    .unwrap()
            );
        }
    }
}
