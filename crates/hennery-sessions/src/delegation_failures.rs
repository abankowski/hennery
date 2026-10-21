//! Pre-attach catalog refusals settle accepted work without failing an
//! operator's existing session or changing the established offline semantics.
use crate::{delegation_runtime::same_hat_in, store::Store};
use anyhow::Result;
use rusqlite::params;

fn terminal(code: &str, operation: &str, now: i64) -> bool {
    match code {
        "auth_required" | "runtime_unavailable" | "adapter_failed" | "cwd_unavailable" | "catalog_unavailable" => true,
        // Operation identities are UUIDv7, so their acceptance timestamp is
        // durable across retries/restarts without another queue clock column.
        "busy" | "timeout" => uuid::Uuid::parse_str(operation)
            .ok()
            .and_then(|id| id.get_timestamp())
            .is_some_and(|at| now.saturating_sub(at.to_unix().0 as i64) >= 30),
        _ => false,
    }
}
impl Store {
    pub(crate) fn fail_delegation_catalog(&self, target: &str, code: &str, now: i64) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let operations = {
            let mut statement = tx.prepare(
                "SELECT q.operation_id,q.source_id,q.accepted_revision FROM session_dispatch_queue q
                 JOIN sessions s ON s.owner_id = ?1 AND s.id=q.target_id
                 WHERE q.owner_id = ?1 AND q.target_id=?2 AND q.state IN ('queued','waiting_config')
                 AND (s.lifecycle='parked' OR (s.lifecycle='starting' AND s.agent_session_id IS NULL
                   AND EXISTS(SELECT 1 FROM session_attach_evidence e WHERE e.owner_id = ?1
                     AND e.session_id=s.id AND e.launch_sent=0))) ORDER BY q.position",
            )?;
            statement
                .query_map(params![self.owner_id(), target], |r| {
                    Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, i64>(2)?))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        let mut failed = false;
        for (operation, source, revision) in operations {
            if !terminal(code, &operation, now) || !self.transfer_in(&tx, &source, target, revision)? {
                continue;
            }
            let (host, hat, cwd): (String, String, String) = tx.query_row(
                "SELECT host_id,hat_id,cwd FROM sessions WHERE owner_id = ?1 AND id=?2",
                params![self.owner_id(), target],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )?;
            if !same_hat_in(&tx, self.owner_id(), &host, &hat, &cwd)? {
                continue;
            }
            failed |= tx.execute(
                "UPDATE session_operations SET state='failed',code=?3 WHERE owner_id = ?1 AND operation_id=?2
                 AND state IN ('queued','waiting_config','awaiting_reconciliation') AND turn_id IS NULL",
                params![self.owner_id(), operation, code],
            )? > 0;
        }
        if failed {
            // Set operation codes before the lifecycle trigger: the session UI
            // retains its established login help, while tool receipts use ACP's
            // auth_required classification.
            let session_code = if code == "auth_required" {
                "agent_not_logged_in"
            } else {
                code
            };
            let changed = tx.execute(
                "UPDATE sessions SET lifecycle='failed',failure_reason=?3
                 WHERE owner_id = ?1 AND id=?2 AND lifecycle='starting' AND agent_session_id IS NULL
                 AND EXISTS(SELECT 1 FROM session_attach_evidence e WHERE e.owner_id = ?1
                   AND e.session_id=sessions.id AND e.launch_sent=0)",
                params![self.owner_id(), target, session_code],
            )?;
            tx.execute(
                "UPDATE sessions SET family_dirty=1 WHERE owner_id = ?1 AND id=?2",
                params![self.owner_id(), target],
            )?;
            self.settle_delegation_in(&tx)?;
            if changed > 0 {
                self.record_delegation_failure_in(&tx, target, session_code)?;
                let cut = self.mcp().revoke_in(&tx, target)?;
                return crate::store::commit_then_cut(tx, self.mcp().as_ref(), cut);
            }
        }
        tx.commit()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::terminal;
    #[test]
    fn catalog_retry_deadline_is_durable_and_only_transient_errors_wait() {
        let id = uuid::Uuid::now_v7();
        let now = id.get_timestamp().unwrap().to_unix().0 as i64;
        for code in [
            "auth_required",
            "runtime_unavailable",
            "adapter_failed",
            "cwd_unavailable",
            "catalog_unavailable",
        ] {
            assert!(terminal(code, &id.to_string(), now));
        }
        for code in ["busy", "timeout"] {
            assert!(!terminal(code, &id.to_string(), now + 29));
            assert!(terminal(code, &id.to_string(), now + 30));
        }
        assert!(!terminal("host_offline", &id.to_string(), now + 3600));
    }
}
