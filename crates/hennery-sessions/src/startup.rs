//! Typed startup evidence is stored with the ordinary prompt. All terminal
//! checks run again at the actual synchronous socket dispatch boundary.
use crate::store::Store;
use anyhow::Result;
use hennery_proto::{
    frames::CollectorFrame,
    plugin::{InputOrigin, Provenance, StartupRecord, StartupStatus},
    rest::StoredBlock,
};
use rusqlite::{OptionalExtension, Transaction, params};
use serde::Deserialize;
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
};

pub struct PromptReservation {
    entries: Arc<Mutex<HashSet<String>>>,
    session: String,
}
impl Drop for PromptReservation {
    fn drop(&mut self) {
        self.entries.lock().expect("prompt admissions").remove(&self.session);
    }
}
pub(crate) fn reserve(entries: &Arc<Mutex<HashSet<String>>>, session: &str) -> Option<PromptReservation> {
    entries
        .lock()
        .expect("prompt admissions")
        .insert(session.into())
        .then(|| PromptReservation {
            entries: entries.clone(),
            session: session.into(),
        })
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Evidence {
    turn_id: String,
    origin: InputOrigin,
    content: serde::de::IgnoredAny,
}

pub(crate) fn prepare_in(
    store: &Store,
    tx: &Transaction<'_>,
    session: &str,
    turn: &str,
    startup: &mut Option<StartupRecord>,
) -> Result<()> {
    if startup.is_none() {
        return Ok(());
    }
    let fresh: bool = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id = ?1 AND s.id = ?2
        AND s.lifecycle = 'active' AND s.close_requested = 0 AND s.open_turn_id = ?3
        AND NOT EXISTS(SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.session_id = s.id)
        AND NOT EXISTS(SELECT 1 FROM events e WHERE e.owner_id = ?1 AND e.session_id = s.id
            AND e.kind = 'operator_resumed' AND e.applied = 1))",
        params![store.owner_id(), session, turn],
        |r| r.get(0),
    )?;
    if !fresh {
        *startup = None;
        return Ok(());
    }
    let record = startup.as_mut().expect("startup record");
    let Some(block) = record.block.as_mut() else {
        return Ok(());
    };
    if record.request_id != block.request_id
        || record.status != StartupStatus::Delivered
        || store.plugins().validate_context_in(tx, session, block).is_err()
    {
        record.status = StartupStatus::Revoked;
        record.block = None;
        return Ok(());
    }
    for entry in &mut block.context.entries {
        for provenance in &mut entry.provenance {
            let verified = if let Provenance::Source { origin, source } = provenance {
                if !entry.source_refs.contains(source) || matches!(origin, InputOrigin::PluginContext { .. }) {
                    false
                } else {
                    let raw:Option<String>=tx.query_row("SELECT e.body FROM events e JOIN sessions s
                        ON s.owner_id = ?1 AND s.id = e.session_id JOIN sessions target ON target.owner_id = ?1
                        AND target.id = ?2 AND target.hat_id = s.hat_id
                        WHERE e.owner_id = ?1 AND e.session_id = ?3 AND e.event_id = ?4
                        AND e.kind = 'user_turn' AND e.applied = 1 AND s.lifecycle <> 'deleted'
                        AND e.event_id > COALESCE((SELECT max(a.event_id) FROM events a WHERE a.owner_id = ?1
                            AND a.session_id = s.id AND a.kind = 'hat_reassigned' AND a.applied = 1),0)
                        AND EXISTS(SELECT 1 FROM gw_mounts m JOIN hosts h ON h.owner_id = ?1 AND h.id = m.host_id
                            WHERE m.owner_id = ?1 AND m.connection_id = ?5 AND m.host_id = s.host_id AND h.revoked_at IS NULL)",
                        params![store.owner_id(),session,source.session_id,source.event_id,block.connection_id],|r|r.get(0)).optional()?;
                    raw.and_then(|raw| serde_json::from_str::<Evidence>(&raw).ok())
                        .is_some_and(|e| {
                            let _ = e.content;
                            e.origin == *origin && source.turn_id.as_deref() == Some(e.turn_id.as_str())
                        })
                }
            } else {
                false
            };
            if !verified {
                *provenance = Provenance::Unverified {}
            }
        }
    }
    block.context = hennery_kernel::plugin_context::sanitize(block.context.clone())?;
    Ok(())
}

impl Store {
    /// Socket readiness must be awaited before calling. `send` is synchronous
    /// start_send, with this owner gate held through its enqueue. A later
    /// network flush may be uncertain and uses the existing reconciliation.
    pub fn dispatch_startup(
        &self,
        frame: &mut CollectorFrame,
        supported: bool,
        send: impl FnOnce(&CollectorFrame) -> Result<()>,
    ) -> Result<()> {
        let CollectorFrame::Prompt {
            session_id,
            turn_id,
            request_id,
            plugin_context,
            ..
        } = frame
        else {
            return send(frame);
        };
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let found: Option<(String, bool)> = tx
            .query_row(
                "SELECT t.content,(s.lifecycle = 'active' AND s.close_requested = 0
            AND s.open_turn_id = t.turn_id AND t.state = 'sent') FROM turns t JOIN sessions s
            ON s.owner_id = ?1 AND s.id = t.session_id WHERE t.owner_id = ?1 AND t.turn_id = ?2 AND t.session_id = ?3",
                params![self.owner_id(), turn_id.as_str(), session_id.as_str()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;
        *plugin_context = None;
        if let Some((raw, live)) = found {
            let mut content: Vec<StoredBlock> = serde_json::from_str(&raw)?;
            let mut changed = false;
            for block in &mut content {
                let StoredBlock::PluginContext { startup } = block else {
                    continue;
                };
                if let Some(context) = startup.block.as_ref() {
                    let valid = live
                        && startup.request_id == *request_id
                        && startup.status == StartupStatus::Delivered
                        && self.plugins().validate_context_in(&tx, session_id, context).is_ok();
                    if !supported || !valid {
                        startup.block = None;
                        startup.status = if supported {
                            StartupStatus::Revoked
                        } else {
                            StartupStatus::Unsupported
                        };
                        changed = true;
                    }
                }
                *plugin_context = startup.block.clone();
            }
            if changed {
                tx.execute(
                    "UPDATE turns SET content = ?4 WHERE owner_id = ?1 AND turn_id = ?2 AND session_id = ?3",
                    params![
                        self.owner_id(),
                        turn_id.as_str(),
                        session_id.as_str(),
                        serde_json::to_string(&content)?
                    ],
                )?;
            }
        }
        tx.commit()?;
        send(frame)
    }
}

/// A test-only hold in the real socket path, after readiness and before the
/// final guard. Production builds contain neither the hook nor its await.
#[cfg(feature = "test-hooks")]
#[derive(Default)]
pub struct DispatchHold {
    armed: std::sync::atomic::AtomicBool,
    pub entered: tokio::sync::Notify,
    release: tokio::sync::Notify,
}
#[cfg(feature = "test-hooks")]
impl DispatchHold {
    pub fn arm(&self) {
        self.armed.store(true, std::sync::atomic::Ordering::Release);
    }
    pub fn release(&self) {
        self.release.notify_one();
    }
    pub(crate) async fn hold_if_armed(&self) {
        if self.armed.swap(false, std::sync::atomic::Ordering::AcqRel) {
            self.entered.notify_one();
            self.release.notified().await;
        }
    }
}
