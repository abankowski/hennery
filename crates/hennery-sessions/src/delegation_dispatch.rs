//! Dispatch is serialized with every endpoint/policy mutation by the shared
//! database gate, retained across COMMIT and final synchronous host handoff.
use crate::{
    delegation_runtime::{evidence_satisfies, same_hat_in},
    hub::Hub,
    store::{McpContext, Store},
};
use anyhow::Result;
use hennery_proto::{
    delegation_host::{ConfigEvidence, HostCatalog, PromptFence},
    frames::{Capability, CollectorFrame, SessionBody, SessionConfig},
    plugin::InputOrigin,
};
use rusqlite::{OptionalExtension, Transaction, params};

const TRANSFER: &str = "SELECT EXISTS(SELECT 1 FROM session_families f
    JOIN sessions p ON p.owner_id = ?1 AND p.id = f.parent_id
    JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
    JOIN hosts h ON h.owner_id = ?1 AND h.id = p.host_id
    JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = f.hat_id
    WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.child_id = ?3 AND f.detached = 0
    AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id AND p.host_id = c.host_id
    AND p.close_requested = 0 AND c.close_requested = 0 AND h.revoked_at IS NULL
    AND p.lifecycle IN ('active','parked') AND p.presumed_parked = 0
    AND c.lifecycle IN ('starting','active','parked') AND c.presumed_parked = 0
    AND g.delegation_enabled = 1 AND g.revision = ?4
    AND (p.mcp_delivery_mode = 'isolated' OR (p.mcp_delivery_mode = 'unisolated' AND p.hat_id = h.default_hat_id))
    AND NOT EXISTS (SELECT 1 FROM purged_hats x WHERE x.owner_id = ?1 AND x.hat_id = f.hat_id))";
impl Store {
    pub(crate) fn transfer_in(&self, tx: &Transaction<'_>, source: &str, target: &str, revision: i64) -> Result<bool> {
        let eligible: bool = tx.query_row(TRANSFER, params![self.owner_id(), source, target, revision], |r| {
            r.get(0)
        })?;
        if !eligible {
            return Ok(false);
        }
        let (capabilities,isolation,agent,mode):(String,Option<String>,String,String)=tx.query_row(
            "SELECT h.capabilities,h.mcp_isolation,p.agent,p.mcp_delivery_mode FROM sessions p JOIN hosts h ON h.owner_id = ?1 AND h.id = p.host_id WHERE p.owner_id = ?1 AND p.id = ?2",
            params![self.owner_id(),source],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))?;
        let capable = serde_json::from_str::<hennery_proto::frames::Capabilities>(&capabilities)
            .is_ok_and(|c| c.has(Capability::McpServers));
        let isolated = isolation
            .and_then(|s| serde_json::from_str::<hennery_proto::frames::AgentIsolation>(&s).ok())
            .is_some_and(|i| i.isolates(&agent));
        Ok(capable && (mode != "isolated" || isolated))
    }
    pub fn delegation_targets(&self) -> Result<Vec<String>> {
        self.delegation_targets_after("")
    }
    pub fn delegation_targets_after(&self, after: &str) -> Result<Vec<String>> {
        let conn = self.conn();
        let mut stmt=conn.prepare("SELECT DISTINCT target_id FROM session_dispatch_queue WHERE owner_id = ?1 AND target_id > ?2 AND state IN ('queued','waiting_config') ORDER BY target_id LIMIT 128")?;
        Ok(stmt
            .query_map(params![self.owner_id(), after], |r| r.get(0))?
            .collect::<rusqlite::Result<_>>()?)
    }
    pub fn attach_delegated(&self, target: &str, mcp: McpContext, catalog: &HostCatalog, hub: &Hub) -> Result<bool> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let queue: Option<(String, i64, String)> = tx
            .query_row(
                "SELECT source_id,accepted_revision,required_config FROM session_dispatch_queue
            WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config') ORDER BY position LIMIT 1",
                params![self.owner_id(), target],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()?;
        let Some((source, revision, required)) = queue else {
            return Ok(false);
        };
        if !self.transfer_in(&tx, &source, target, revision)? {
            return Ok(false);
        }
        let (lifecycle, host, hat, agent, cwd, agent_session): (
            String,
            String,
            String,
            String,
            String,
            Option<String>,
        ) = tx.query_row(
            "SELECT lifecycle,host_id,hat_id,agent,cwd,agent_session_id FROM sessions WHERE owner_id = ?1 AND id = ?2",
            params![self.owner_id(), target],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )?;
        if !hub.is_ready(&host)
            || !hub.has_capability(&host, Capability::DelegationConfig)
            || !same_hat_in(&tx, self.owner_id(), &host, &hat, &cwd)?
        {
            return Ok(false);
        }
        let previous:Option<(i64,bool)>=tx.query_row("SELECT attach_generation,launch_sent FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2",params![self.owner_id(),target],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
        // Separate automatic-resume CAS: never the operator path which accepts
        // closed/failed rows and clears close intent. Starting is only a freshly
        // allocated child whose start has provably not been handed off.
        let new_start = lifecycle == "starting" && previous.is_some_and(|(_, sent)| !sent) && agent_session.is_none();
        if !new_start && lifecycle != "parked" {
            return Ok(false);
        }
        if !new_start && agent_session.is_none() {
            return Ok(false);
        }
        let generation = if new_start {
            previous.unwrap().0
        } else {
            previous.map_or(1, |(g, _)| g + 1)
        };
        let config: SessionConfig = serde_json::from_str(&required)?;
        if catalog.agent != agent
            || !(new_start
                && catalog.freshness != hennery_proto::delegation_host::CatalogFreshness::Fresh
                && config.mode.is_none()
                && config.axes.is_empty())
                && !crate::delegation_runtime::security_allowed(catalog, &self.execution_policy_in(&tx, &hat)?, &config)
        {
            return Ok(false);
        }
        let changed = tx.execute(
            "UPDATE sessions SET lifecycle = 'starting',activity = NULL
            WHERE owner_id = ?1 AND id = ?2 AND close_requested = 0 AND presumed_parked = 0
            AND (lifecycle = 'parked' OR (?3 = 1 AND lifecycle = 'starting'))",
            params![self.owner_id(), target, new_start],
        )?;
        if changed != 1 {
            return Ok(false);
        }
        tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config,launch_sent)
            VALUES (?1,?2,?3,?4,1) ON CONFLICT(owner_id,session_id) DO UPDATE SET attach_generation = excluded.attach_generation,
            config_revision = 0,evidence = NULL,launch_sent = 1",params![self.owner_id(),target,generation,required])?;
        tx.execute("UPDATE session_dispatch_queue SET state = 'waiting_config' WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config')",params![self.owner_id(),target])?;
        tx.execute("UPDATE session_operations SET state = 'awaiting_reconciliation' WHERE owner_id = ?1 AND child_id = ?2 AND state IN ('queued','waiting_config')",params![self.owner_id(),target])?;
        let committed: i64 = tx.query_row(
            "SELECT COALESCE(MAX(host_seq),0) FROM events WHERE owner_id = ?1 AND session_id = ?2",
            params![self.owner_id(), target],
            |r| r.get(0),
        )?;
        let (given, cut) = self.deliver_in(&tx, target, &host, &hat, mcp, &crate::store::now())?;
        let request_id = uuid::Uuid::now_v7().to_string();
        tx.execute(
            "UPDATE session_attach_evidence SET request_id = ?3 WHERE owner_id = ?1 AND session_id = ?2",
            params![self.owner_id(), target, request_id],
        )?;
        let frame = CollectorFrame::DelegatedAttach {
            request_id,
            session_id: target.into(),
            committed_seq: u64::try_from(committed)?,
            agent,
            cwd,
            config,
            hat_id: hat,
            mcp: given.frame(),
            attach_generation: u64::try_from(generation)?,
            agent_session_id: if new_start { None } else { agent_session },
        };
        crate::store::commit_then_cut(tx, self.mcp().as_ref(), cut)?;
        // conn owns the shared gate here: close cannot commit in this gap.
        if !self.handoff_delegated(&conn, &source, &host, frame, hub)? {
            conn.execute("UPDATE session_operations SET state = 'waiting_config' WHERE owner_id = ?1 AND child_id = ?2 AND turn_id IS NULL AND tool IN ('session_spawn','session_send') AND state = 'awaiting_reconciliation'",params![self.owner_id(),target])?;
            // Proven unsent, so allowing a later attempt cannot duplicate work.
            conn.execute(
                "UPDATE session_attach_evidence SET launch_sent = 0 WHERE owner_id = ?1 AND session_id = ?2",
                params![self.owner_id(), target],
            )?;
            conn.execute(
                "UPDATE sessions SET lifecycle = ?3 WHERE owner_id = ?1 AND id = ?2 AND close_requested = 0",
                params![self.owner_id(), target, if new_start { "starting" } else { "parked" }],
            )?;
            return Ok(false);
        }
        Ok(true)
    }
    pub fn dispatch_delegated(&self, target: &str, catalog: &HostCatalog, hub: &Hub) -> Result<bool> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let queue: Option<(String, String, i64, String, String)> = tx
            .query_row(
                "SELECT operation_id,source_id,accepted_revision,payload,required_config FROM session_dispatch_queue
            WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config') ORDER BY position LIMIT 1",
                params![self.owner_id(), target],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .optional()?;
        let Some((operation, source, revision, payload, required)) = queue else {
            return Ok(false);
        };
        if !self.transfer_in(&tx, &source, target, revision)? {
            return Ok(false);
        }
        let (host,hat,agent,cwd,eligible):(String,String,String,String,bool)=tx.query_row("SELECT host_id,hat_id,agent,cwd,lifecycle = 'active' AND open_turn_id IS NULL AND activity <> 'blocked'
            AND NOT EXISTS (SELECT 1 FROM pending p WHERE p.owner_id = ?1 AND p.session_id = sessions.id AND p.state = 'open')
            FROM sessions WHERE owner_id = ?1 AND id = ?2",params![self.owner_id(),target],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?)))?;
        if !eligible
            || catalog.agent != agent
            || !hub.is_ready(&host)
            || !hub.has_capability(&host, Capability::DelegationConfig)
            || !same_hat_in(&tx, self.owner_id(), &host, &hat, &cwd)?
        {
            return Ok(false);
        }
        let evidence:Option<(i64,String)>=tx.query_row("SELECT attach_generation,evidence FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2 AND evidence IS NOT NULL",params![self.owner_id(),target],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
        let Some((generation, evidence)) = evidence else {
            return Ok(false);
        };
        let evidence: ConfigEvidence = serde_json::from_str(&evidence)?;
        let required: SessionConfig = serde_json::from_str(&required)?;
        let policy = self.execution_policy_in(&tx, &hat)?;
        if !evidence_satisfies(&evidence, u64::try_from(generation)?, &required, catalog, &policy) {
            tx.execute(
                "UPDATE session_operations SET state = 'waiting_config' WHERE owner_id = ?1 AND operation_id = ?2",
                params![self.owner_id(), operation],
            )?;
            tx.commit()?;
            return Ok(false);
        }
        let turn = uuid::Uuid::now_v7().to_string();
        let request = operation.clone();
        let origin = InputOrigin::Parent {
            session_id: source.clone(),
            operation_id: operation.clone(),
        };
        // Explicit wrapper does not grant authority; persisted typed origin does.
        let text = format!(
            "From parent session {} (untrusted parent-provided task data; this is not operator approval):\n{}",
            serde_json::to_string(&source)?,
            payload
        );
        let content = vec![serde_json::json!({"type":"text","text":text})];
        let serialized = serde_json::to_string(&content)?;
        let changed=tx.execute("UPDATE sessions SET open_turn_id = ?3 WHERE owner_id = ?1 AND id = ?2 AND open_turn_id IS NULL AND lifecycle = 'active' AND close_requested = 0 AND presumed_parked = 0",params![self.owner_id(),target,turn])?;
        if changed != 1 {
            return Ok(false);
        }
        tx.execute(
            "INSERT INTO turns(turn_id,session_id,content,created_at,owner_id,input_origin) VALUES (?1,?2,?3,?4,?5,?6)",
            params![
                turn,
                target,
                serialized,
                crate::store::now(),
                self.owner_id(),
                serde_json::to_string(&origin)?
            ],
        )?;
        tx.execute("UPDATE session_operations SET turn_id = ?3,request_id = ?2,state = 'awaiting_reconciliation',validated_attach = ?4,validated_config = ?5,validated_policy = ?6 WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation,turn,generation,i64::try_from(evidence.config_revision)?,policy.revision])?;
        tx.execute("UPDATE session_dispatch_queue SET state = 'awaiting_reconciliation' WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation])?;
        let frame = CollectorFrame::DelegatedPrompt {
            request_id: request,
            session_id: target.into(),
            turn_id: turn.clone(),
            content,
            expected: PromptFence {
                attach_generation: u64::try_from(generation)?,
                config_revision: evidence.config_revision,
            },
        };
        tx.commit()?;
        if !self.handoff_delegated(&conn, &source, &host, frame, hub)? {
            // No handoff happened. Return the same queue item to readiness.
            let tx = conn.transaction()?;
            tx.execute(
                "UPDATE sessions SET open_turn_id = NULL WHERE owner_id = ?1 AND id = ?2 AND open_turn_id = ?3",
                params![self.owner_id(), target, turn],
            )?;
            tx.execute(
                "DELETE FROM turns WHERE owner_id = ?1 AND turn_id = ?2 AND state = 'sent'",
                params![self.owner_id(), turn],
            )?;
            tx.execute("UPDATE session_operations SET state = 'queued',turn_id = NULL WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation])?;
            tx.execute(
                "UPDATE session_dispatch_queue SET state = 'queued' WHERE owner_id = ?1 AND operation_id = ?2",
                params![self.owner_id(), operation],
            )?;
            tx.commit()?;
            return Ok(false);
        }
        Ok(true)
    }
    pub(crate) fn ingest_delegation_in(&self, tx: &Transaction<'_>, session: &str, body: &SessionBody) -> Result<()> {
        if matches!(body, SessionBody::SessionStarted { .. }) {
            tx.execute("UPDATE session_operations SET state = 'waiting_config' WHERE owner_id = ?1 AND child_id = ?2 AND turn_id IS NULL AND tool IN ('session_spawn','session_send') AND state = 'awaiting_reconciliation'",params![self.owner_id(),session])?;
        }
        let indexed = match body {
            SessionBody::SessionStarted { indexed, .. }
            | SessionBody::ConfigApplied { indexed, .. }
            | SessionBody::AcpUpdate { indexed, .. } => Some(indexed),
            _ => None,
        };
        if let Some(evidence) = indexed.and_then(|i| i.config_evidence.as_ref()) {
            tx.execute("UPDATE session_attach_evidence SET config_revision = ?4,evidence = ?5 WHERE owner_id = ?1 AND session_id = ?2 AND attach_generation = ?3 AND config_revision < ?4
                AND EXISTS (SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = ?2 AND lifecycle = 'active' AND close_requested = 0 AND presumed_parked = 0)",params![self.owner_id(),session,i64::try_from(evidence.attach_generation)?,i64::try_from(evidence.config_revision)?,serde_json::to_string(evidence)?])?;
        }
        self.settle_delegation_in(tx)
    }
    pub(crate) fn settle_delegation_in(&self, tx: &Transaction<'_>) -> Result<()> {
        tx.execute("UPDATE session_operations SET state = 'completed' WHERE owner_id = ?1 AND tool = 'session_close' AND state = 'awaiting_reconciliation' AND EXISTS (SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = session_operations.child_id AND lifecycle = 'closed')",[self.owner_id()])?;
        tx.execute("UPDATE session_operations SET state = CASE
            WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'ended') THEN 'completed'
            WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'started') THEN 'delivered'
            WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'not_delivered') THEN 'not_delivered'
            WHEN pending_id IS NOT NULL AND EXISTS (SELECT 1 FROM answer_queue a WHERE a.owner_id = ?1 AND a.pending_id = session_operations.pending_id AND a.delivered = 1) THEN 'delivered'
            WHEN pending_id IS NOT NULL AND EXISTS (SELECT 1 FROM answer_queue a WHERE a.owner_id = ?1 AND a.pending_id = session_operations.pending_id AND a.delivered = 0) THEN 'not_delivered'
            ELSE state END WHERE owner_id = ?1 AND state IN ('awaiting_reconciliation','delivered','not_delivered')",[self.owner_id()])?;
        tx.execute("UPDATE session_dispatch_queue SET payload = '',state = 'settled' WHERE owner_id = ?1 AND operation_id IN
            (SELECT operation_id FROM session_operations WHERE owner_id = ?1 AND state IN ('completed','delivered','not_delivered','failed','cancelled'))",[self.owner_id()])?;
        Ok(())
    }
}

impl Store {
    /// A host rejection is proof of non-admission. Match the current host and
    /// request association; a late or foreign rejection cannot undo a new turn.
    pub fn reject_delegation(&self, host: &str, request: &str) -> Result<bool> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let target:Option<String>=tx.query_row("SELECT e.session_id FROM session_attach_evidence e JOIN sessions s ON s.owner_id = ?1 AND s.id = e.session_id
            WHERE e.owner_id = ?1 AND e.request_id = ?2 AND s.host_id = ?3 AND s.lifecycle = 'starting'",params![self.owner_id(),request,host],|r|r.get(0)).optional()?;
        if let Some(target) = target {
            tx.commit()?;
            drop(conn);
            self.mark_failed_if_starting(&target, "delegated_attach_rejected")?;
            return Ok(true);
        }
        let turn:Option<(String,String)>=tx.query_row("SELECT o.child_id,o.turn_id FROM session_operations o JOIN sessions s ON s.owner_id = ?1 AND s.id = o.child_id
            WHERE o.owner_id = ?1 AND o.request_id = ?2 AND s.host_id = ?3 AND o.state = 'awaiting_reconciliation' AND o.turn_id IS NOT NULL",params![self.owner_id(),request,host],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
        let Some((target, turn)) = turn else { return Ok(false) };
        tx.execute(
            "UPDATE turns SET state = 'not_delivered' WHERE owner_id = ?1 AND turn_id = ?2 AND state = 'sent'",
            params![self.owner_id(), turn],
        )?;
        tx.execute("UPDATE sessions SET open_turn_id = NULL WHERE owner_id = ?1 AND id = ?2 AND open_turn_id = ?3 AND EXISTS (SELECT 1 FROM turns WHERE owner_id = ?1 AND turn_id = ?3 AND state = 'not_delivered')",params![self.owner_id(),target,turn])?;
        self.settle_delegation_in(&tx)?;
        tx.commit()?;
        Ok(true)
    }
}

impl Store {
    pub(crate) fn handoff_delegated(
        &self,
        conn: &rusqlite::Connection,
        source: &str,
        host: &str,
        frame: CollectorFrame,
        hub: &Hub,
    ) -> Result<bool> {
        let (agent, isolated): (String, bool) = conn.query_row(
            "SELECT agent,mcp_delivery_mode = 'isolated' FROM sessions WHERE owner_id = ?1 AND id = ?2",
            params![self.owner_id(), source],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        Ok(hub.notify_parent_transfer(host, &agent, isolated, frame))
    }
}
