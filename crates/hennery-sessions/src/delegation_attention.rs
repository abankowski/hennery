//! Durable operator fallback. Push is a best-effort projection, never a receipt.
use crate::{
    hub::Hub,
    store::{Edge, EdgeSession, PushEdge, Store},
};
use anyhow::Result;
use hennery_kernel::push::{Notice, Push, Urgency};
use hennery_proto::frames::Capability;
use rusqlite::{OptionalExtension, params};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct OperatorAttention {
    pub id: String,
    pub child_id: String,
    pub hat_id: String,
    pub reason: String,
    pub pending_id: Option<String>,
}
impl Store {
    pub fn refresh_delegation_attention(&self, hub: &Hub, now: i64) -> Result<()> {
        self.refresh_attention_after(hub, now, "").map(drop)
    }
    pub(crate) fn refresh_attention_after(&self, hub: &Hub, now: i64, after: &str) -> Result<String> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        self.settle_notices_in(&tx)?;
        let rows = {
            let mut statement = tx.prepare(
                "SELECT n.delivery_id,n.deadline,p.host_id,
                f.detached = 0 AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id
                AND p.close_requested = 0 AND p.lifecycle IN ('starting','active','parked')
                AND g.delegation_enabled = 1 AND g.revision = n.accepted_revision
                FROM delegation_notices n JOIN session_families f ON f.owner_id = ?1 AND f.child_id = n.child_id
                JOIN sessions p ON p.owner_id = ?1 AND p.id = n.parent_id
                JOIN sessions c ON c.owner_id = ?1 AND c.id = n.child_id
                JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = n.hat_id
                WHERE n.owner_id = ?1 AND n.delivery_id > ?2
                AND (n.state IN ('parent_queued','waiting_config','awaiting_reconciliation')
                    OR (n.state = 'parent_delivered' AND n.kind = 'question'))
                ORDER BY n.delivery_id LIMIT 128",
            )?;
            statement
                .query_map(params![self.owner_id(), after], |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, i64>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, bool>(3)?,
                    ))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        let cursor = rows.last().map(|r| r.0.clone()).unwrap_or_default();
        for (id, deadline, host, eligible) in rows {
            let reason = if !eligible {
                Some("parent_unavailable")
            } else if hub.is_ready(&host) && !hub.has_capability(&host, Capability::DelegationConfig) {
                Some("unsupported_delivery")
            } else if now >= deadline {
                Some("handling_deadline")
            } else {
                None
            };
            if let Some(reason) = reason {
                tx.execute(
                    "UPDATE delegation_notices SET state = 'operator_required',reason = ?3
                    WHERE owner_id = ?1 AND delivery_id = ?2",
                    params![self.owner_id(), id, reason],
                )?;
            }
        }
        tx.commit()?;
        Ok(cursor)
    }
    /// The factual pending counts remain separate; D4 consumes this projection.
    pub fn operator_attention(&self, hat: Option<&str>, after: &str) -> Result<Vec<OperatorAttention>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT a.attention_id,a.child_id,a.hat_id,a.reason,a.pending_id
            FROM delegation_attention a JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
            WHERE a.owner_id = ?1 AND a.state = 'open' AND c.lifecycle <> 'deleted'
            AND (?2 IS NULL OR a.hat_id = ?2) AND a.attention_id > ?3
            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id)
            ORDER BY a.attention_id LIMIT 100",
        )?;
        Ok(stmt
            .query_map(params![self.owner_id(), hat, after], |r| {
                Ok(OperatorAttention {
                    id: r.get(0)?,
                    child_id: r.get(1)?,
                    hat_id: r.get(2)?,
                    reason: r.get(3)?,
                    pending_id: r.get(4)?,
                })
            })?
            .collect::<rusqlite::Result<_>>()?)
    }
    /// Requeue at startup, then at most once per five minutes. A kernel queue
    /// drop or failed network request never changes the attention disposition.
    pub fn enqueue_delegation_attention(&self, push: &Push, run: &str, after: &str, now: i64) -> Result<String> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let rows = {
            let mut stmt=tx.prepare("SELECT a.attention_id,c.id,c.hat_id,c.title,c.cwd,a.pending_id
                FROM delegation_attention a JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
                WHERE a.owner_id = ?1 AND a.state = 'open' AND c.lifecycle <> 'deleted' AND a.attention_id > ?2
                AND (a.push_run <> ?3 OR a.push_at <= ?4 - 300)
                AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id)
                ORDER BY a.attention_id LIMIT 128")?;
            stmt.query_map(params![self.owner_id(), after, run, now], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    EdgeSession {
                        id: r.get(1)?,
                        hat_id: r.get(2)?,
                        title: r.get(3)?,
                        cwd: r.get(4)?,
                    },
                    r.get::<_, Option<String>>(5)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?
        };
        let cursor = rows.last().map(|r| r.0.clone()).unwrap_or_default();
        let mut notices = Vec::new();
        for (id, session, pending) in rows {
            let mut notice = if let Some(pending) = pending {
                crate::notify::notice_for(
                    &PushEdge::QuestionOutsideTurn {
                        pending_id: pending,
                        title: None,
                    },
                    &session,
                )
                .expect("question notifies")
            } else {
                Notice {
                    hat_id: session.hat_id.clone(),
                    urgency: Urgency::High,
                    title: "Session needs attention".into(),
                    generic_title: "Session needs attention".into(),
                    body: "needs your attention".into(),
                    detail: None,
                    url: format!("/sessions/{}", crate::notify::encoded_id(&session.id)),
                    tag: String::new(),
                }
            };
            notice.tag = format!("delegation:{id}");
            tx.execute(
                "UPDATE delegation_attention SET push_run = ?3,push_at = ?4
                WHERE owner_id = ?1 AND attention_id = ?2 AND state = 'open'",
                params![self.owner_id(), id, run, now],
            )?;
            notices.push(notice);
        }
        tx.commit()?;
        // Still hold the shared owner gate: delete/reassign cannot interleave
        // before enqueue. Kernel revalidates again at transport admission.
        for notice in notices {
            push.notify(notice);
        }
        Ok(cursor)
    }
    /// A plain operator epoch changes budgets, never routing. Re-arm is an
    /// explicit operator action naming a NEW actually acknowledged root prompt.
    pub fn rearm_delegation_attention(&self, attention: &str, operator_turn: &str, now: i64) -> Result<bool> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let found: Option<(String, i64, Option<String>)> = tx
            .query_row(
                "SELECT n.delivery_id,e.event_id,n.target_turn
            FROM delegation_attention a JOIN delegation_notices n ON n.owner_id = ?1 AND n.delivery_id = a.delivery_id
            JOIN session_families f ON f.owner_id = ?1 AND f.child_id = n.child_id AND f.parent_id = n.parent_id
            JOIN sessions p ON p.owner_id = ?1 AND p.id = n.parent_id
            JOIN sessions c ON c.owner_id = ?1 AND c.id = n.child_id
            JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = n.hat_id
            JOIN events e ON e.owner_id = ?1 AND e.session_id = n.root_id
            WHERE a.owner_id = ?1 AND a.attention_id = ?2 AND a.state = 'open'
            AND e.kind = 'user_turn' AND e.applied = 1 AND json_extract(e.body,'$.turn_id') = ?3
            AND COALESCE(json_extract(e.body,'$.origin.kind'),'operator') = 'operator' AND e.event_id > a.operator_epoch
            AND f.detached = 0 AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id
            AND p.close_requested = 0 AND c.close_requested = 0 AND p.presumed_parked = 0
            AND p.lifecycle IN ('active','parked') AND c.lifecycle IN ('starting','active','parked','failed')
            AND g.delegation_enabled = 1 AND g.revision = n.accepted_revision
            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = n.hat_id)
            AND (n.target_turn IS NULL OR (n.kind = 'question' AND EXISTS(SELECT 1 FROM turns t
                WHERE t.owner_id = ?1 AND t.turn_id = n.target_turn AND t.state IN ('started','ended'))))
            AND (n.kind <> 'question' OR EXISTS(SELECT 1 FROM pending q WHERE q.owner_id = ?1
                AND q.session_id = n.child_id AND q.pending_id = n.pending_id AND q.kind = 'elicitation' AND q.state = 'open'
                AND NOT EXISTS(SELECT 1 FROM answer_queue b WHERE b.owner_id = ?1 AND b.pending_id = q.pending_id)))",
                params![self.owner_id(), attention, operator_turn],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()?;
        let Some((delivery, epoch, target)) = found else {
            return Ok(false);
        };
        tx.execute(
            "UPDATE delegation_notices SET state = ?3,reason = NULL,deadline = ?4 + 300
            WHERE owner_id = ?1 AND delivery_id = ?2",
            params![
                self.owner_id(),
                delivery,
                if target.is_some() {
                    "parent_delivered"
                } else {
                    "parent_queued"
                },
                now
            ],
        )?;
        tx.execute(
            "UPDATE delegation_attention SET state = 'resolved',operator_epoch = ?3,push_run = '',push_at = 0
            WHERE owner_id = ?1 AND attention_id = ?2",
            params![self.owner_id(), attention, epoch],
        )?;
        tx.commit()?;
        Ok(true)
    }
    /// Kernel-owned guard: only reserved delegation tags are interpreted here.
    /// Success admits a push attempt; an already admitted external copy cannot
    /// be recalled. No database gate is retained across asynchronous transport.
    pub fn delegation_push_current(&self, notice: &Notice) -> Result<bool> {
        let Some(id) = notice.tag.strip_prefix("delegation:") else {
            return Ok(true);
        };
        Ok(self.conn().query_row(
            "SELECT EXISTS(SELECT 1 FROM delegation_attention a
            JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
            WHERE a.owner_id = ?1 AND a.attention_id = ?2 AND a.hat_id = ?3 AND a.state = 'open'
            AND c.lifecycle <> 'deleted'
            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id))",
            params![self.owner_id(), id, notice.hat_id],
            |r| r.get(0),
        )?)
    }
    pub fn route_push_edge(&self, edge: &Edge, push: &Push) -> Result<()> {
        let conn = self.conn();
        let delegated: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM session_families WHERE owner_id = ?1 AND child_id = ?2)",
            params![self.owner_id(), edge.session.id],
            |r| r.get(0),
        )?;
        if !delegated && let Some(notice) = crate::notify::notice_for(&edge.kind, &edge.session) {
            push.notify(notice);
        }
        Ok(())
    }
}
