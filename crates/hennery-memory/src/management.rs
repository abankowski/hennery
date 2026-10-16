//! Owner-only management capabilities, separate from mounted MCP credentials.
use crate::store::{Entry, Inner, Store, put, random};
use anyhow::{Context, Result, ensure};
use hennery_kernel::{redact, secret::unix_now};
use hennery_proto::plugin::Provenance;
use rusqlite::{OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Issued only after the independent operator principal has been authenticated.
/// Never deserializable from an HTTP request or a tool call.
#[derive(Clone)]
pub struct Manager {
    pub(crate) owner: String,
}
#[derive(Debug, Serialize)]
pub struct NamespaceInfo {
    pub id: String,
    pub hat: String,
    pub state: String,
}
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NewMemory {
    pub title: String,
    pub body: String,
}
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Edit {
    pub revision: u64,
    pub title: String,
    pub body: String,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LegacyEvidence {
    pub vault: String,
    pub path: String,
    pub metadata: BTreeMap<String, String>,
    pub imported_at: i64,
    pub content_digest: String,
}
#[derive(Debug, Serialize)]
pub struct Snapshot {
    pub version: u32,
    pub namespace: String,
    pub hat: String,
    pub exported_at: i64,
    pub entries: Vec<Entry>,
    #[serde(skip)]
    pub generation: u64,
}
impl Store {
    pub fn managed_writes(&self, manager: &Manager, namespace: &str, enabled: bool) -> Result<()> {
        {
            let inner = self.inner.lock().expect("store");
            inner.managed_scope(manager, namespace, false)?;
        }
        self.set_writes(namespace, enabled)
    }
    pub fn managed_purge(&self, manager: &Manager, namespace: &str) -> Result<hennery_proto::plugin::ForgetReceipt> {
        {
            let inner = self.inner.lock().expect("store");
            inner.db.query_row(
                "SELECT id FROM namespaces WHERE id=?1 AND owner=?2",
                params![namespace, manager.owner],
                |r| r.get::<_, String>(0),
            )?;
        }
        self.owner_purge(namespace)
    }
    /// Explicit local bootstrap, not reachable through either HTTP credential.
    pub fn bind_manager(&self, principal: &str, owner: &str) -> Result<()> {
        ensure!(
            !principal.is_empty() && principal.len() <= 256 && !owner.is_empty() && owner.len() <= 256,
            "invalid binding"
        );
        let inner = self.inner.lock().expect("store");
        let old: Option<String> = inner
            .db
            .query_row("SELECT owner FROM ui_bindings WHERE principal=?1", [principal], |r| {
                r.get(0)
            })
            .optional()?;
        if let Some(old) = old {
            ensure!(old == owner, "binding is immutable");
        } else {
            inner.db.execute(
                "INSERT INTO ui_bindings(principal,owner) VALUES(?1,?2)",
                params![principal, owner],
            )?;
        }
        Ok(())
    }
    pub fn manager(&self, principal: &str) -> Result<Manager> {
        let inner = self.inner.lock().expect("store");
        Ok(Manager {
            owner: inner
                .db
                .query_row("SELECT owner FROM ui_bindings WHERE principal=?1", [principal], |r| {
                    r.get(0)
                })?,
        })
    }
    pub fn managed_namespaces(&self, manager: &Manager) -> Result<Vec<NamespaceInfo>> {
        let inner = self.inner.lock().expect("store");
        let mut stmt = inner
            .db
            .prepare("SELECT id,hat,state FROM namespaces WHERE owner=?1 ORDER BY id LIMIT 1001")?;
        let rows = stmt
            .query_map([&manager.owner], |r| {
                Ok(NamespaceInfo {
                    id: r.get(0)?,
                    hat: r.get(1)?,
                    state: r.get(2)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        ensure!(rows.len() <= 1000, "namespace listing limit");
        Ok(rows)
    }
    /// Bounded management listing; exact kind and literal text match, never
    /// interpolated SQL or an unscoped global FTS vocabulary.
    pub fn managed_list(
        &self,
        manager: &Manager,
        namespace: &str,
        kind: &str,
        query: &str,
        offset: usize,
    ) -> Result<Vec<Entry>> {
        ensure!(
            ["memory", "note", "source"].contains(&kind) && query.chars().count() <= 512 && offset <= 10000,
            "invalid listing"
        );
        let inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let mut stmt = inner.db.prepare("SELECT data FROM entries WHERE namespace=?1 AND kind=?2 AND (?3='' OR instr(lower(title || char(10) || body),lower(?3))>0) ORDER BY seq DESC LIMIT 21 OFFSET ?4")?;
        let rows = stmt
            .query_map(params![namespace, kind, query, offset as i64], |r| {
                r.get::<_, String>(0)
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        rows.into_iter()
            .map(|row| {
                let mut entry: Entry = serde_json::from_str(&row)?;
                entry.body = crate::store::bounded(&entry.body, 512);
                entry.turns.clear();
                entry.stale |= inner.stale(namespace);
                Ok(entry)
            })
            .collect()
    }
    pub fn managed_entry(&self, manager: &Manager, namespace: &str, id: &str) -> Result<Entry> {
        let inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let mut entry = read_entry(&inner.db, namespace, id)?;
        entry.stale |= inner.stale(namespace);
        Ok(entry)
    }
    pub fn managed_create(&self, manager: &Manager, namespace: &str, input: NewMemory) -> Result<Entry> {
        let input = safe_memory(input)?;
        let mut inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let tx = inner.db.transaction()?;
        let entry = owner_entry(input);
        put(&tx, namespace, &entry)?;
        crate::consumer::budget(&tx, namespace)?;
        tx.commit()?;
        inner.invalidate(namespace);
        Ok(entry)
    }
    pub fn managed_edit(&self, manager: &Manager, namespace: &str, id: &str, input: Edit) -> Result<Entry> {
        let safe = safe_memory(NewMemory {
            title: input.title,
            body: input.body,
        })?;
        let mut inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let tx = inner.db.transaction()?;
        let mut entry = revision(&tx, namespace, id, input.revision)?;
        ensure!(
            entry.kind != "note" || entry.legacy.is_some(),
            "annotate native observations instead"
        );
        entry.title = safe.title;
        entry.body = safe.body;
        advance(&mut entry)?;
        put(&tx, namespace, &entry)?;
        crate::consumer::budget(&tx, namespace)?;
        tx.commit()?;
        inner.invalidate(namespace);
        // Replaced content has the same honest erasure boundary as deletion.
        crate::consumer::checkpoint(&inner)?;
        Ok(entry)
    }
    pub fn managed_annotate(
        &self,
        manager: &Manager,
        namespace: &str,
        id: &str,
        expected: u64,
        annotation: &str,
    ) -> Result<Entry> {
        ensure!(annotation.len() <= 16384, "annotation too large");
        let annotation = redact::text(annotation).unwrap_or_else(|| annotation.into());
        ensure!(annotation.len() <= 16384, "redacted annotation too large");
        let mut inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let tx = inner.db.transaction()?;
        let mut entry = revision(&tx, namespace, id, expected)?;
        ensure!(entry.kind == "note", "only notes have annotations");
        entry.owner_annotation = annotation;
        advance(&mut entry)?;
        put(&tx, namespace, &entry)?;
        crate::consumer::budget(&tx, namespace)?;
        tx.commit()?;
        inner.invalidate(namespace);
        crate::consumer::checkpoint(&inner)?;
        Ok(entry)
    }
    pub fn managed_pin(
        &self,
        manager: &Manager,
        namespace: &str,
        id: &str,
        expected: u64,
        pinned: bool,
    ) -> Result<Entry> {
        let mut inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let tx = inner.db.transaction()?;
        let mut entry = revision(&tx, namespace, id, expected)?;
        ensure!(entry.kind == "memory", "only deliberate memories can be pinned");
        let pins: i64 = tx.query_row(
            "SELECT count(*) FROM entries WHERE namespace=?1 AND kind='memory' AND json_extract(data,'$.pinned')=1",
            [namespace],
            |r| r.get(0),
        )?;
        ensure!(!pinned || entry.pinned || pins < 5, "at most five pinned memories");
        entry.pinned = pinned;
        advance(&mut entry)?;
        put(&tx, namespace, &entry)?;
        crate::consumer::budget(&tx, namespace)?;
        tx.commit()?;
        inner.invalidate(namespace);
        Ok(entry)
    }
    pub fn managed_retain(
        &self,
        manager: &Manager,
        namespace: &str,
        id: &str,
        expected: u64,
        title: &str,
        selected: &str,
    ) -> Result<Entry> {
        ensure!(!selected.trim().is_empty(), "select text to retain");
        let safe = safe_memory(NewMemory {
            title: title.into(),
            body: selected.into(),
        })?;
        let mut inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let tx = inner.db.transaction()?;
        let source = revision(&tx, namespace, id, expected)?;
        ensure!(
            source.kind == "note" && source.body.contains(selected),
            "selection must occur in this note revision"
        );
        let mut entry = owner_entry(safe);
        // Retaining text does not upgrade the source's typed origin.
        entry.provenance = source.provenance;
        entry.source_refs = source.source_refs;
        entry.legacy = source.legacy;
        put(&tx, namespace, &entry)?;
        crate::consumer::budget(&tx, namespace)?;
        tx.commit()?;
        inner.invalidate(namespace);
        Ok(entry)
    }
    /// A note delete also suppresses its native source. No older body/revision
    /// survives in a history table or the remember result cache.
    pub fn managed_delete(&self, manager: &Manager, namespace: &str, id: &str, expected: u64) -> Result<()> {
        let mut inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, false)?;
        let tx = inner.db.transaction()?;
        let entry = revision(&tx, namespace, id, expected)?;
        if entry.kind == "note" && entry.legacy.is_none() {
            for source in &entry.source_refs {
                tx.execute(
                    "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
                    params![namespace, source.session_id],
                )?;
                crate::consumer::remove_source(&tx, namespace, &source.session_id)?;
            }
            tx.execute("UPDATE feeds SET revision=revision+1 WHERE namespace=?1", [namespace])?;
        }
        tx.execute(
            "DELETE FROM entries WHERE namespace=?1 AND id=?2",
            params![namespace, id],
        )?;
        tx.execute(
            "DELETE FROM requests WHERE namespace=?1 AND json_extract(result,'$.id')=?2",
            params![namespace, id],
        )?;
        tx.commit()?;
        inner.invalidate(namespace);
        crate::consumer::checkpoint(&inner)
    }
    pub fn managed_snapshot(&self, manager: &Manager, namespace: &str) -> Result<Snapshot> {
        let inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        let hat: String = inner.db.query_row(
            "SELECT hat FROM namespaces WHERE id=?1 AND owner=?2",
            params![namespace, manager.owner],
            |r| r.get(0),
        )?;
        let mut stmt = inner
            .db
            .prepare("SELECT data FROM entries WHERE namespace=?1 ORDER BY id LIMIT 10001")?;
        let rows = stmt
            .query_map([namespace], |r| r.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        ensure!(
            rows.len() <= 10000 && rows.iter().map(String::len).sum::<usize>() <= 64 * 1024 * 1024,
            "snapshot limit"
        );
        let entries = rows
            .into_iter()
            .map(|row| {
                let mut value: serde_json::Value = serde_json::from_str(&row)?;
                redact::value(&mut value);
                Ok(serde_json::from_value(value)?)
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(Snapshot {
            version: 1,
            namespace: namespace.into(),
            hat: redact::text(&hat).unwrap_or(hat),
            exported_at: unix_now(),
            entries,
            generation: *inner.generations.get(namespace).unwrap_or(&0),
        })
    }
    pub fn managed_deliverable(&self, manager: &Manager, namespace: &str, generation: u64) -> Result<()> {
        let inner = self.inner.lock().expect("store");
        inner.managed_scope(manager, namespace, true)?;
        ensure!(
            *inner.generations.get(namespace).unwrap_or(&0) == generation,
            "snapshot invalidated"
        );
        Ok(())
    }
}
impl Inner {
    pub(crate) fn managed_scope(&self, manager: &Manager, namespace: &str, live: bool) -> Result<()> {
        ensure!(namespace.len() == 64, "unavailable");
        let (registered, state): (bool, String) = self.db.query_row(
            "SELECT registered,state FROM namespaces WHERE id=?1 AND owner=?2",
            params![namespace, manager.owner],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        ensure!(state == "active", "unavailable");
        if live && registered {
            ensure!(
                self.leases
                    .get(namespace)
                    .is_some_and(|(end, unix)| *end > std::time::Instant::now() && *unix > unix_now()),
                "lease unavailable"
            );
        }
        Ok(())
    }
}
pub(crate) fn read_entry(db: &rusqlite::Connection, namespace: &str, id: &str) -> Result<Entry> {
    ensure!(id.len() == 64, "invalid entry");
    let data: String = db
        .query_row(
            "SELECT data FROM entries WHERE namespace=?1 AND id=?2",
            params![namespace, id],
            |r| r.get(0),
        )
        .optional()?
        .context("entry unavailable")?;
    Ok(serde_json::from_str(&data)?)
}
pub(crate) fn revision(tx: &Transaction<'_>, ns: &str, id: &str, expected: u64) -> Result<Entry> {
    let entry = read_entry(tx, ns, id)?;
    ensure!(entry.revision == expected, "revision conflict; reload before editing");
    Ok(entry)
}
fn advance(entry: &mut Entry) -> Result<()> {
    entry.revision = entry.revision.checked_add(1).context("revision exhausted")?;
    entry.updated_at = unix_now();
    Ok(())
}
fn safe_memory(input: NewMemory) -> Result<NewMemory> {
    ensure!(
        !input.title.trim().is_empty() && input.title.chars().count() <= 160 && input.body.len() <= 16384,
        "invalid content"
    );
    let safe = NewMemory {
        title: redact::text(&input.title).unwrap_or(input.title),
        body: redact::text(&input.body).unwrap_or(input.body),
    };
    ensure!(
        safe.title.chars().count() <= 160 && safe.body.len() <= 16384,
        "redacted content too large"
    );
    Ok(safe)
}
pub(crate) fn owner_entry(input: NewMemory) -> Entry {
    Entry {
        id: random(),
        kind: "memory".into(),
        title: input.title,
        body: input.body,
        project_key: None,
        author: "owner".into(),
        created_at: unix_now(),
        updated_at: unix_now(),
        covered_through: None,
        project_key_omitted: false,
        project_key_digest: None,
        revision: 1,
        memory_kind: None,
        tags: vec![],
        provenance: vec![Provenance::Unverified {}],
        source_refs: vec![],
        truncated: false,
        stale: false,
        turns: vec![],
        older_turns: 0,
        pinned: false,
        owner_annotation: String::new(),
        legacy: None,
    }
}
