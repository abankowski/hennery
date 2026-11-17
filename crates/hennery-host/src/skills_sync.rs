//! The host's side of skill delivery (skills spec §6): a `skill_sync`
//! is reconciled against the store, what is missing is fetched, and the
//! outcome goes back as one `skill_state` once nothing is left to fetch.

use crate::skills::{self, AgentDirs};
use crate::uplink::Uplink;
use base64::Engine;
use hennery_proto::frames::{HostFrame, SkillFailed, SkillFailure, SkillSyncItem};
use std::collections::BTreeMap;
use std::sync::Mutex;

/// The revision being applied, and what it still waits for.
#[derive(Default)]
struct Pending {
    revision: u64,
    /// The skills fetched but not yet delivered, by id.
    waiting: BTreeMap<String, SkillSyncItem>,
    applied: Vec<String>,
    failed: Vec<SkillFailed>,
}

/// The store, the agents' directories and the revision in progress.
pub struct SkillSync {
    store: skills::Store,
    dirs: AgentDirs,
    pending: Mutex<Pending>,
}

impl SkillSync {
    pub fn new(store: skills::Store, dirs: AgentDirs) -> Self {
        Self {
            store,
            dirs,
            pending: Mutex::default(),
        }
    }

    /// `skill_sync`: reconcile, ask for what is missing, and answer at once
    /// when nothing is. A new revision replaces the one in progress; an
    /// older one is ignored.
    pub fn on_sync(&self, uplink: &Uplink, revision: u64, items: Vec<SkillSyncItem>) {
        // Held throughout, so frames are applied one at a time.
        let mut pending = self.pending.lock().expect("skill sync lock");
        if revision < pending.revision {
            return;
        }
        let (applied, failed, fetch) = self.store.reconcile(&items, &self.dirs);
        for item in &fetch {
            uplink.reply(HostFrame::SkillFetch {
                id: item.id.clone(),
                content_hash: item.content_hash.clone(),
            });
        }
        *pending = Pending {
            revision,
            waiting: fetch.into_iter().map(|item| (item.id.clone(), item)).collect(),
            applied,
            failed,
        };
        finish(uplink, &pending);
    }

    /// `skill_archive`: install what was fetched. An archive nobody waits
    /// for (an older revision, another hash) is dropped.
    pub fn on_archive(&self, uplink: &Uplink, id: &str, content_hash: &str, data: &str) {
        let mut pending = self.pending.lock().expect("skill sync lock");
        let Some(item) = pending
            .waiting
            .get(id)
            .filter(|item| item.content_hash == content_hash)
            .cloned()
        else {
            tracing::debug!(id, "a skill archive nobody waits for");
            return;
        };
        pending.waiting.remove(id);
        let failures = match base64::engine::general_purpose::STANDARD.decode(data) {
            Ok(tgz) => self.store.install(&item, &tgz, &self.dirs),
            Err(_) => vec![SkillFailed {
                id: id.to_string(),
                reason: SkillFailure::Invalid,
                agent: None,
            }],
        };
        if failures.is_empty() {
            pending.applied.push(item.id);
        } else {
            pending.failed.extend(failures);
        }
        finish(uplink, &pending);
    }
}

/// Send `skill_state` when nothing is awaited.
fn finish(uplink: &Uplink, pending: &Pending) {
    if pending.waiting.is_empty() {
        uplink.reply(HostFrame::SkillState {
            revision: pending.revision,
            applied: pending.applied.clone(),
            failed: pending.failed.clone(),
        });
    }
}
