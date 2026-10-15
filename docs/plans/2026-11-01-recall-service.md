# Reference memory service (R1) Implementation Plan

**Goal:** implement R1 of the optional memory design: a separate, opt-in `hennery-memory` executable, SQLite/FTS store, four MCP tools and a deterministic C1 activity consumer. No model or core memory integration.

**Architecture:** credentials select an immutable owner/hat/epoch namespace before any query. A private service database owns canonical Markdown, typed source evidence, derived FTS, atomic feed cursors and deletion receipts. HTTP tools and lifecycle methods authenticate separately. Registered namespaces fail closed without a maximum 60-second authoritative lease. Unregistered namespaces remain standalone and have no collector deletion guarantee.

**Spec:** [Optional memory design](../specs/2026-10-14-memory-design.md), especially §§3–5 and 8–10; [C1](2026-10-26-plugin-contract.md) and [C1b](2026-11-01-plugin-inventory-paging.md).

**Tech stack:** workspace Rust, SQLite FTS5, axum, tokio, shared first-party redaction and validated egress. Separate data/auth; no dependency from the main binary to this crate.

## Execution status

Review amendment completed on the rebase to approved C1b `49c0f4d7`; both Medium findings are corrected. Amendment checks, load and copy probes are recorded below. Parent scoped re-confirmation and PR CI remain pending.

Built on `plan/recall-r1`; original base `a58479c7`, integration base C1b `bf632e58` (C2 main `7fe43fbe`). Four exact construction patches below were generated from the built commits. Task 3 includes the preserved WIP commit and its completed consumer. Final verification and replay results are recorded below. Independent review, PR status and Linux/macOS CI belong to the parent; no approval or publication is claimed.

## Scope

Four tasks, naturally reviewable as R1a (tasks 1–2: standalone store/tools) and R1b (tasks 3–4: consumer/lifecycle and mounted proof). R2 owns management UI, imports/exports; R3 owns optional models. C2 is independent: this implementation advertises `startup_context_v1: false` and provides no context endpoint.

## Decisions

- Use the spec's name `hennery-memory`.
- No model; deterministic brief accepts model mode only to return an explicit deterministic fallback.
- Local bootstrap/administration is through explicit CLI operations on the service's private store. No HTTP management authority is exposed to tools; R2 supplies its separate authenticated UI.
- Namespace IDs refer to immutable owner/hat/epoch rows; every data row references that namespace. Attaching the first C1 grant requires an empty namespace. Re-registration requires a new empty namespace after erasure; old credentials never reactivate a purged epoch.
- Follow settled Q1: lease denial is not erasure, and offline external deletion stays unconfirmed. Confirm erasure only after authenticated idempotent forget and local checkpoint; exports/backups/flash remanence are outside that claim.

parent, on the maintainer's behalf, 2026-10-15: fix inventory scalability in separately scoped C1b: up to 500 IDs per 128-KiB page, a sliding 60-second idle expiry and a fixed 20-minute cap, unchanged registration budgets and owner/hat scoping. Twenty minutes leaves headroom for paced resets and slow clients while limiting snapshot retention. No discard-all reset or scale limitation. Rebase R1 onto C1b, pace backlog reads within C1 budgets, then complete R1.

## Operating the opt-in service

Build only when wanted: `nix develop -c cargo build -p hennery-memory --bin hennery-memory --locked`. Invoke `./target/debug/hennery-memory --data-dir <private-directory> create --owner <owner-id> --hat <hat-id>` while stopped. Save the once-shown tool and lifecycle credentials separately; the database stores their hashes. `serve` listens on loopback by default and exposes `POST /mcp`. Configure a C1 MCP connection/mount explicitly with the tool credential, and register its separate lifecycle credential. Feed grants are attached through bounded stdin with `attach --namespace <namespace-id>`, then the service is restarted. The attached epoch must match the plug-in namespace; initial attachment requires an empty namespace. The live test is the executable registration recipe and uses only disposable state.

The CLI also provides `status`, `writes`, `suppress` and filesystem-owner `purge`; administration requires stopping the sole database writer. It has no automatic install, shared core database or default enabling. Standalone namespaces explicitly have no collector lease/deletion guarantee. A registered namespace requires a fresh lease after every restart, and denial removes access without claiming erasure. A forgotten scope is terminal. An offline collector receipt remains unconfirmed even if a later explicit local cleanup succeeds. The separate on-disk encryption key ignores core key/credential environment variables. R1 does not advertise a startup-context endpoint.

## Global Constraints

No core behavioral changes, shared database, worker installation or automatic enabling. No C2 dependency. Never infer authority from tool arguments or prose. Typed provenance remains attached to role-labelled excerpts. Redact assembled logical text before truncation/persistence/indexing. SQL scopes before hydration/limits; FTS is lexical with literal bounded terms and scoped coverage/recency ordering, never corpus rank. Requests, source pages, responses and namespace storage are bounded. No bodies/queries/private paths or credentials are logged.

## Review Focus

Auth separation; immutable namespace and scope selection; duplicate/escaped authority keys; lease expiry/revoke/purge races and honest receipts; atomic cursor/projection replay; source deletion and suppression; literal FTS and foreign-corpus independence; response/network/storage bounds; safe private files and Nix SQL source inclusion. Independent review requested through the parent for each task and whole branch.

## File structure

- `crates/hennery-memory/{Cargo.toml,src,tests}`: independent library/binary, schema, store, tools, consumer, CLI and integration proof.
- `Cargo.lock`, `nix/package.nix`: workspace lock entry and explicitly embedded SQL in the Nix source closure.
- This plan and `docs/README.md`: reproducible implementation and execution record.

## Task 1: Scoped canonical store and FTS

Build tests first and observe RED; implement immutable credential-bound namespaces, hashed tools/lifecycle credentials, atomic remember/idempotency, shared redaction, literal FTS, deterministic ranking and bounded scoped cursor pages. Targeted command: `cargo test -p hennery-memory --test store --locked`.



**Files:** crate manifest/library, canonical store/schema, store tests and prepared SQL audit; Cargo lock entry, Nix embedded SQL filter and the narrowly scoped audit routing.

**RED observed:** missing store API (101), then empty input, original-input idempotency, redaction expansion and escaped-page regressions (101). Implemented each cause before GREEN. Targeted store plus SQL audit: 9 passed at task completion. All six Rust checks and native Nix passed then (workspace 2,348 passed). The final guard copies additionally prove namespace, literal/correlated FTS, redaction, cursors, write gating and bounds.

**Apply:** save this exact diff as task-1.patch and run `git apply --unidiff-zero --index task-1.patch`. Then run `nix develop -c cargo test -p hennery-memory --test store --test sql_scope --locked`.

<!-- recall-task-1 -->
```diff
diff --git a/Cargo.lock b/Cargo.lock
index d9cf1c62..d71691bc 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1618,0 +1619,25 @@ dependencies = [
+[[package]]
+name = "hennery-memory"
+version = "0.0.0"
+dependencies = [
+ "anyhow",
+ "axum",
+ "clap",
+ "hennery-gateway",
+ "hennery-host",
+ "hennery-kernel",
+ "hennery-proto",
+ "hennery-sessions",
+ "hex",
+ "hmac 0.12.1",
+ "reqwest",
+ "rusqlite",
+ "serde",
+ "serde_json",
+ "sha2 0.10.9",
+ "tempfile",
+ "tokio",
+ "url",
+ "zeroize",
+]
+
diff --git a/crates/hennery-memory/Cargo.toml b/crates/hennery-memory/Cargo.toml
new file mode 100644
index 00000000..5e4c7c7a
--- /dev/null
+++ b/crates/hennery-memory/Cargo.toml
@@ -0,0 +1,30 @@
+[package]
+name = "hennery-memory"
+version.workspace = true
+edition.workspace = true
+license.workspace = true
+rust-version.workspace = true
+publish.workspace = true
+
+[dependencies]
+anyhow.workspace = true
+axum.workspace = true
+clap.workspace = true
+hennery-kernel.workspace = true
+hennery-proto.workspace = true
+hennery-gateway.workspace = true
+hex.workspace = true
+hmac.workspace = true
+sha2.workspace = true
+rusqlite.workspace = true
+serde.workspace = true
+serde_json.workspace = true
+tokio.workspace = true
+reqwest.workspace = true
+url.workspace = true
+zeroize.workspace = true
+
+[dev-dependencies]
+tempfile.workspace = true
+hennery-host = { workspace = true, features = ["test-hooks"] }
+hennery-sessions.workspace = true
diff --git a/crates/hennery-memory/src/lib.rs b/crates/hennery-memory/src/lib.rs
new file mode 100644
index 00000000..97aa3cdc
--- /dev/null
+++ b/crates/hennery-memory/src/lib.rs
@@ -0,0 +1,2 @@
+//! Optional reference memory service. Never linked or started by hennery.
+pub mod store;
diff --git a/crates/hennery-memory/src/schema.sql b/crates/hennery-memory/src/schema.sql
new file mode 100644
index 00000000..1d39e7c9
--- /dev/null
+++ b/crates/hennery-memory/src/schema.sql
@@ -0,0 +1,33 @@
+CREATE TABLE namespaces (
+ id TEXT PRIMARY KEY, owner TEXT NOT NULL, hat TEXT NOT NULL, epoch TEXT NOT NULL,
+ tool_hash TEXT NOT NULL UNIQUE, lifecycle_hash TEXT NOT NULL UNIQUE,
+ cursor_key TEXT NOT NULL, registered INTEGER NOT NULL DEFAULT 0,
+ writes INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL DEFAULT 'active',
+ UNIQUE(owner,hat,epoch)
+);
+CREATE TABLE entries (
+ seq INTEGER PRIMARY KEY, namespace TEXT NOT NULL REFERENCES namespaces(id),
+ id TEXT NOT NULL, kind TEXT NOT NULL, project TEXT, title TEXT NOT NULL, body TEXT NOT NULL,
+ data TEXT NOT NULL, UNIQUE(namespace,id)
+);
+CREATE INDEX scoped_entries ON entries(namespace,kind,seq);
+CREATE VIRTUAL TABLE entries_fts USING fts5(title,body,tokenize='unicode61 remove_diacritics 2');
+INSERT INTO entries_fts(entries_fts,rank) VALUES('secure-delete',1);
+CREATE TRIGGER index_add AFTER INSERT ON entries BEGIN
+ INSERT INTO entries_fts(rowid,title,body) VALUES(new.seq,new.title,new.body);
+END;
+CREATE TRIGGER index_remove AFTER DELETE ON entries BEGIN
+ DELETE FROM entries_fts WHERE rowid=old.seq;
+END;
+CREATE TABLE requests(namespace TEXT NOT NULL REFERENCES namespaces(id), key TEXT NOT NULL,
+ digest TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(namespace,key));
+CREATE TABLE receipts(namespace TEXT NOT NULL REFERENCES namespaces(id), request TEXT NOT NULL,
+ epoch TEXT NOT NULL, target TEXT NOT NULL, PRIMARY KEY(namespace,request));
+CREATE TABLE sources(namespace TEXT NOT NULL REFERENCES namespaces(id), session TEXT NOT NULL,
+ event_key TEXT NOT NULL, PRIMARY KEY(namespace,session));
+CREATE TABLE suppressed(namespace TEXT NOT NULL REFERENCES namespaces(id), session TEXT NOT NULL,
+ PRIMARY KEY(namespace,session));
+CREATE TABLE seen(namespace TEXT NOT NULL REFERENCES namespaces(id), event_key TEXT NOT NULL,
+ PRIMARY KEY(namespace,event_key));
+CREATE TABLE feeds(namespace TEXT PRIMARY KEY REFERENCES namespaces(id), config BLOB NOT NULL,
+ cursor TEXT, revision INTEGER NOT NULL DEFAULT 1);
diff --git a/crates/hennery-memory/src/store.rs b/crates/hennery-memory/src/store.rs
new file mode 100644
index 00000000..51076f8f
--- /dev/null
+++ b/crates/hennery-memory/src/store.rs
@@ -0,0 +1,443 @@
+//! Credential-fixed namespace storage. All data tables reference one immutable
+//! owner/hat/epoch namespace. No caller can select that identity in a tool.
+use anyhow::{Context, Result, ensure};
+use hennery_kernel::{
+    db, redact,
+    secret::{random_bytes, sha256_hex, unix_now},
+};
+use hennery_proto::plugin::{Provenance, SourceRef};
+use hmac::{Hmac, Mac};
+use rusqlite::{OptionalExtension, params};
+use serde::{Deserialize, Serialize};
+use serde_json::{Value, json};
+use std::{collections::HashMap, path::Path, sync::Mutex, time::Instant};
+
+pub struct Store {
+    pub(crate) inner: Mutex<Inner>,
+}
+pub(crate) struct Inner {
+    pub db: db::OwnedConnection,
+    pub leases: HashMap<String, (Instant, i64)>,
+}
+pub struct Credentials {
+    pub namespace: String,
+    pub tool: String,
+    pub lifecycle: String,
+}
+#[derive(Clone)]
+pub(crate) struct Namespace {
+    pub id: String,
+    pub epoch: String,
+    pub cursor_key: String,
+}
+#[derive(Debug, Clone, Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+pub struct Remember {
+    pub title: String,
+    pub body: String,
+    pub kind: Option<String>,
+    #[serde(default)]
+    pub tags: Vec<String>,
+    pub idempotency_key: String,
+}
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
+pub struct Remembered {
+    pub id: String,
+    pub revision: u64,
+    pub redacted: bool,
+}
+#[derive(Debug, Clone, Default, Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+pub struct Query {
+    pub query: Option<String>,
+    pub kind: Option<String>,
+    pub project_key: Option<String>,
+    pub limit: Option<usize>,
+    pub cursor: Option<String>,
+}
+impl Query {
+    pub fn search(text: &str) -> Self {
+        Self {
+            query: Some(text.into()),
+            ..Self::default()
+        }
+    }
+}
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
+pub struct Entry {
+    pub id: String,
+    pub kind: String,
+    pub title: String,
+    pub body: String,
+    pub project_key: Option<String>,
+    pub author: String,
+    pub created_at: i64,
+    pub revision: u64,
+    pub memory_kind: Option<String>,
+    pub tags: Vec<String>,
+    pub provenance: Vec<Provenance>,
+    pub source_refs: Vec<SourceRef>,
+    pub truncated: bool,
+    pub stale: bool,
+    #[serde(default, skip_serializing_if = "Vec::is_empty")]
+    pub turns: Vec<hennery_proto::plugin::PluginActivityItem>,
+    #[serde(default)]
+    pub older_turns: u64,
+}
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
+pub struct Page {
+    pub entries: Vec<Entry>,
+    pub next_cursor: Option<String>,
+    pub stale: bool,
+}
+#[derive(Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Cursor {
+    binding: String,
+    offset: usize,
+    mac: String,
+}
+
+pub(crate) fn bounded(text: &str, cap: usize) -> String {
+    let mut end = text.len().min(cap);
+    while !text.is_char_boundary(end) {
+        end -= 1;
+    }
+    text[..end].into()
+}
+pub(crate) fn random() -> String {
+    hex::encode(random_bytes::<32>())
+}
+impl Store {
+    pub fn open(path: &Path) -> Result<Self> {
+        let mut db = db::open(path)?;
+        db::migrate_component(&mut db, "memory", &[include_str!("schema.sql")])?;
+        Ok(Self {
+            inner: Mutex::new(Inner {
+                db,
+                leases: HashMap::new(),
+            }),
+        })
+    }
+    pub fn create(&self, owner: &str, hat: &str) -> Result<Credentials> {
+        ensure!(
+            !owner.is_empty() && owner.len() <= 256 && !hat.is_empty() && hat.len() <= 256,
+            "invalid identity"
+        );
+        let c = Credentials {
+            namespace: random(),
+            tool: format!("hnry_plugin_{}", random()),
+            lifecycle: format!("hnry_lifecycle_{}", random()),
+        };
+        let inner = self.inner.lock().expect("store");
+        inner.db.execute("INSERT INTO namespaces(id,owner,hat,epoch,tool_hash,lifecycle_hash,cursor_key) VALUES(?1,?2,?3,?4,?5,?6,?7)",
+            params![c.namespace,owner,hat,random(),sha256_hex(c.tool.as_bytes()),sha256_hex(c.lifecycle.as_bytes()),random()])?;
+        Ok(c)
+    }
+    pub fn remember(&self, token: &str, input: Remember) -> Result<Remembered> {
+        ensure!(
+            input.title.chars().count() <= 160
+                && !input.title.trim().is_empty()
+                && input.body.len() <= 16384
+                && input.tags.len() <= 16
+                && input.tags.iter().all(|s| s.len() <= 64)
+                && !input.idempotency_key.is_empty()
+                && input.idempotency_key.len() <= 128,
+            "invalid memory"
+        );
+        ensure!(
+            input
+                .kind
+                .as_deref()
+                .is_none_or(|k| ["user", "feedback", "project", "reference", "decision", "entity"].contains(&k)),
+            "invalid kind"
+        );
+        let mut value = serde_json::to_value(&input)?;
+        let mut original = value.clone();
+        original.as_object_mut().expect("object").remove("idempotency_key");
+        let digest = sha256_hex(&serde_json::to_vec(&original)?);
+        let changed = redact::value(&mut value);
+        let safe: Remember = serde_json::from_value(value.clone())?;
+        ensure!(
+            safe.title.chars().count() <= 160 && safe.body.len() <= 16384 && safe.tags.iter().all(|s| s.len() <= 64),
+            "redacted memory too large"
+        );
+        // The opaque idempotency key is hashed, never indexed or echoed.
+        let key = sha256_hex(input.idempotency_key.as_bytes());
+        let mut inner = self.inner.lock().expect("store");
+        let ns = inner.auth(token, false, true)?;
+        let tx = inner.db.transaction()?;
+        if let Some((old, result)) = tx
+            .query_row(
+                "SELECT digest,result FROM requests WHERE namespace=?1 AND key=?2",
+                params![ns.id, key],
+                |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
+            )
+            .optional()?
+        {
+            ensure!(old == digest, "idempotency conflict");
+            return Ok(serde_json::from_str(&result)?);
+        }
+        let (count, bytes): (i64, i64) = tx.query_row(
+            "SELECT count(*),coalesce(sum(length(CAST(data AS BLOB))),0) FROM entries WHERE namespace=?1",
+            [&ns.id],
+            |r| Ok((r.get(0)?, r.get(1)?)),
+        )?;
+        ensure!(count < 10000 && bytes < 64 * 1024 * 1024, "namespace full");
+        let entry = Entry {
+            id: random(),
+            kind: "memory".into(),
+            title: safe.title,
+            body: safe.body,
+            project_key: None,
+            author: "agent".into(),
+            created_at: unix_now(),
+            revision: 1,
+            memory_kind: safe.kind,
+            tags: safe.tags,
+            provenance: vec![Provenance::Unverified {}],
+            source_refs: vec![],
+            truncated: false,
+            stale: false,
+            turns: vec![],
+            older_turns: 0,
+        };
+        put(&tx, &ns.id, &entry)?;
+        let result = Remembered {
+            id: entry.id,
+            revision: 1,
+            redacted: changed,
+        };
+        tx.execute(
+            "INSERT INTO requests(namespace,key,digest,result) VALUES(?1,?2,?3,?4)",
+            params![ns.id, key, digest, serde_json::to_string(&result)?],
+        )?;
+        tx.commit()?;
+        Ok(result)
+    }
+    pub fn recent(&self, token: &str, q: &Query) -> Result<Page> {
+        ensure!(q.query.is_none() && q.kind.is_none(), "invalid recent query");
+        self.list(token, q, true)
+    }
+    pub fn search(&self, token: &str, q: &Query) -> Result<Page> {
+        self.list(token, q, false)
+    }
+    fn list(&self, token: &str, q: &Query, recent: bool) -> Result<Page> {
+        let limit = q.limit.unwrap_or(if recent { 5 } else { 10 });
+        ensure!((1..=20).contains(&limit), "invalid limit");
+        ensure!(
+            q.project_key.as_ref().is_none_or(|p| p.len() <= 1024),
+            "invalid project"
+        );
+        ensure!(
+            q.kind
+                .as_deref()
+                .is_none_or(|k| ["memory", "note", "source"].contains(&k)),
+            "invalid kind"
+        );
+        let terms = terms(q.query.as_deref().unwrap_or(""))?;
+        let inner = self.inner.lock().expect("store");
+        let ns = inner.auth(token, false, false)?;
+        let binding = sha256_hex(&serde_json::to_vec(&(
+            recent,
+            &q.query,
+            &q.kind,
+            &q.project_key,
+            limit,
+        ))?);
+        let offset = if let Some(c) = &q.cursor {
+            ensure!(c.len() <= 2048, "invalid cursor");
+            let c: Cursor = serde_json::from_slice(&hex::decode(c)?)?;
+            ensure!(
+                c.binding == binding && c.mac == cursor_mac(&ns, &binding, c.offset),
+                "invalid cursor"
+            );
+            c.offset
+        } else {
+            0
+        };
+        ensure!(offset <= 10000, "invalid cursor");
+        if !recent && terms.is_empty() {
+            return Ok(Page {
+                entries: vec![],
+                next_cursor: None,
+                stale: inner.stale(&ns.id),
+            });
+        }
+        let kind = if recent { Some("note") } else { q.kind.as_deref() };
+        // FTS is a boolean candidate selector only. Never use global bm25,
+        // corpus counts or vocabulary. Foreign additions cannot alter ranking.
+        let matched = terms
+            .iter()
+            .map(|t| format!("\"{}\"", t.replace('"', "\"\"")))
+            .collect::<Vec<_>>()
+            .join(" OR ");
+        let coverage = terms
+            .iter()
+            .enumerate()
+            .map(|(i, _)| {
+                format!(
+                    "CASE WHEN EXISTS (SELECT 1 FROM entries_fts WHERE rowid=e.seq AND entries_fts MATCH ?{}) THEN 1 ELSE 0 END",
+                    i + 6
+                )
+            })
+            .collect::<Vec<_>>()
+            .join(" + ");
+        let coverage = if coverage.is_empty() { "0".to_string() } else { coverage };
+        let sql=format!("SELECT e.data, ({coverage}) AS coverage FROM entries e WHERE e.namespace=?1 AND (?2 IS NULL OR e.kind=?2) AND (?3 IS NULL OR e.project=?3)
+            AND ((?4='' AND {}) OR EXISTS (SELECT 1 FROM entries_fts WHERE rowid=e.seq AND entries_fts MATCH ?4)) ORDER BY coverage DESC,e.seq DESC LIMIT 21 OFFSET ?5",if recent{"1"}else{"0"});
+        let mut values: Vec<rusqlite::types::Value> = vec![
+            ns.id.clone().into(),
+            kind.map(String::from).into(),
+            q.project_key.clone().into(),
+            matched.into(),
+            (offset as i64).into(),
+        ];
+        values.extend(terms.iter().map(|t| rusqlite::types::Value::Text(format!("\"{t}\""))));
+        let mut stmt = inner.db.prepare(&sql)?;
+        let rows = stmt.query_map(rusqlite::params_from_iter(values), |r| r.get::<_, String>(0))?;
+        let mut entries = Vec::new();
+        let mut more = false;
+        for row in rows {
+            let mut entry: Entry = serde_json::from_str(&row?)?;
+            if entries.len() == limit {
+                more = true;
+                break;
+            }
+            let clipped = bounded(&entry.body, 1024);
+            entry.truncated |= clipped.len() < entry.body.len();
+            entry.body = clipped;
+            entry.stale |= inner.stale(&ns.id);
+            // Preserve typed evidence and roles. Only display text/tags may
+            // shrink, visibly, so a single escaped entry cannot stall a page.
+            while serde_json::to_vec(&serde_json::to_string(&entry)?)?.len() > 12 * 1024 {
+                let before = serde_json::to_vec(&entry)?.len();
+                entry.body = bounded(&entry.body, entry.body.len() / 2);
+                entry.title = bounded(&entry.title, entry.title.len() / 2);
+                for tag in &mut entry.tags {
+                    *tag = bounded(tag, tag.len() / 2);
+                }
+                for turn in &mut entry.turns {
+                    if let hennery_proto::plugin::ActivityBody::CompletedTurn {
+                        excerpts, truncated, ..
+                    } = &mut turn.body
+                    {
+                        for excerpt in excerpts {
+                            excerpt.text = bounded(&excerpt.text, excerpt.text.len() / 2);
+                        }
+                        *truncated = true;
+                    }
+                }
+                entry.truncated = true;
+                ensure!(
+                    serde_json::to_vec(&entry)?.len() < before,
+                    "source evidence exceeds response bound"
+                );
+            }
+            entries.push(entry);
+            let size = serde_json::to_vec(&serde_json::to_string(&entries)?)?.len();
+            if size > 14 * 1024 {
+                entries.pop();
+                more = true;
+                break;
+            }
+        }
+        let next_cursor = more.then(|| {
+            let offset = offset + entries.len();
+            hex::encode(
+                serde_json::to_vec(&Cursor {
+                    binding: binding.clone(),
+                    offset,
+                    mac: cursor_mac(&ns, &binding, offset),
+                })
+                .expect("cursor"),
+            )
+        });
+        Ok(Page {
+            entries,
+            next_cursor,
+            stale: inner.stale(&ns.id),
+        })
+    }
+    pub fn brief(&self, token: &str, subject: &str, project: Option<String>) -> Result<Value> {
+        let page = self.search(
+            token,
+            &Query {
+                query: Some(subject.into()),
+                project_key: project,
+                limit: Some(8),
+                ..Query::default()
+            },
+        )?;
+        Ok(json!({"sources":page.entries,"mode_used":"deterministic","fallback_reason":null,"stale":page.stale}))
+    }
+}
+pub(crate) fn put(tx: &rusqlite::Transaction<'_>, ns: &str, e: &Entry) -> Result<()> {
+    tx.execute("DELETE FROM entries WHERE namespace=?1 AND id=?2", params![ns, e.id])?;
+    tx.execute(
+        "INSERT INTO entries(namespace,id,kind,project,title,body,data) VALUES(?1,?2,?3,?4,?5,?6,?7)",
+        params![
+            ns,
+            e.id,
+            e.kind,
+            e.project_key,
+            e.title,
+            e.body,
+            serde_json::to_string(e)?
+        ],
+    )?;
+    Ok(())
+}
+impl Inner {
+    pub(crate) fn auth(&self, token: &str, admin: bool, write: bool) -> Result<Namespace> {
+        ensure!(token.len() <= 256, "unavailable");
+        let column = if admin { "lifecycle_hash" } else { "tool_hash" };
+        let sql = format!("SELECT id,epoch,cursor_key,registered,writes,state FROM namespaces WHERE {column}=?1");
+        let row = self
+            .db
+            .query_row(&sql, [sha256_hex(token.as_bytes())], |r| {
+                Ok((
+                    Namespace {
+                        id: r.get(0)?,
+                        epoch: r.get(1)?,
+                        cursor_key: r.get(2)?,
+                    },
+                    r.get::<_, bool>(3)?,
+                    r.get::<_, bool>(4)?,
+                    r.get::<_, String>(5)?,
+                ))
+            })
+            .optional()?
+            .context("unavailable")?;
+        if !admin {
+            ensure!(row.3 == "active" && (!write || row.2), "unavailable");
+            ensure!(
+                !row.1
+                    || self
+                        .leases
+                        .get(&row.0.id)
+                        .is_some_and(|(end, unix)| *end > Instant::now() && *unix > unix_now()),
+                "lease unavailable"
+            );
+        }
+        Ok(row.0)
+    }
+    pub(crate) fn stale(&self, id: &str) -> bool {
+        !self.leases.contains_key(id)
+    }
+}
+fn terms(query: &str) -> Result<Vec<String>> {
+    ensure!(query.chars().count() <= 512, "query too long");
+    let terms: Vec<_> = query
+        .split(|c: char| !c.is_alphanumeric())
+        .filter(|s| !s.is_empty())
+        .map(str::to_string)
+        .collect();
+    ensure!(terms.len() <= 16, "too many terms");
+    Ok(terms)
+}
+fn cursor_mac(ns: &Namespace, binding: &str, offset: usize) -> String {
+    let mut mac = Hmac::<sha2::Sha256>::new_from_slice(ns.cursor_key.as_bytes()).expect("HMAC key");
+    mac.update(format!("memory-cursor-v1:{}:{}:{}:{}", ns.id, ns.epoch, binding, offset).as_bytes());
+    hex::encode(mac.finalize().into_bytes())
+}
diff --git a/crates/hennery-memory/tests/sql_scope.rs b/crates/hennery-memory/tests/sql_scope.rs
new file mode 100644
index 00000000..9dcd5f25
--- /dev/null
+++ b/crates/hennery-memory/tests/sql_scope.rs
@@ -0,0 +1,135 @@
+/// Every string literal in `source`, in order, skipping comments and char
+/// literals. Enough of Rust's lexer for these files: plain and raw
+/// strings, the common escapes and line continuations.
+fn string_literals(source: &str) -> Vec<String> {
+    let s: Vec<char> = source.chars().collect();
+    let mut out = Vec::new();
+    let mut i = 0;
+    while i < s.len() {
+        let rest = &s[i..];
+        if rest.starts_with(&['/', '/']) {
+            while i < s.len() && s[i] != '\n' {
+                i += 1;
+            }
+        } else if rest.starts_with(&['/', '*']) {
+            i += 2;
+            while i + 1 < s.len() && !(s[i] == '*' && s[i + 1] == '/') {
+                i += 1;
+            }
+            i += 2;
+        } else if s[i] == 'r'
+            && matches!(s.get(i + 1), Some('"' | '#'))
+            && (i == 0 || !(s[i - 1].is_alphanumeric() || s[i - 1] == '_'))
+        {
+            let mut hashes = 0;
+            i += 1;
+            while s[i] == '#' {
+                hashes += 1;
+                i += 1;
+            }
+            i += 1;
+            let mut lit = String::new();
+            loop {
+                if s[i] == '"' && s[i + 1..].iter().take(hashes).filter(|c| **c == '#').count() == hashes {
+                    i += 1 + hashes;
+                    break;
+                }
+                lit.push(s[i]);
+                i += 1;
+            }
+            out.push(lit);
+        } else if s[i] == '"' {
+            i += 1;
+            let mut lit = String::new();
+            while s[i] != '"' {
+                if s[i] == '\\' {
+                    i += 1;
+                    match s[i] {
+                        'n' => lit.push('\n'),
+                        't' => lit.push('\t'),
+                        '\n' => {
+                            while s[i + 1].is_whitespace() {
+                                i += 1;
+                            }
+                        }
+                        c => lit.push(c),
+                    }
+                } else {
+                    lit.push(s[i]);
+                }
+                i += 1;
+            }
+            i += 1;
+            out.push(lit);
+        } else if s[i] == '\'' {
+            // A char literal ('x', '\n', '"'), or a lifetime ('a).
+            if s.get(i + 1) == Some(&'\\') {
+                i += 2;
+                while s[i] != '\'' {
+                    i += 1;
+                }
+                i += 1;
+            } else if s.get(i + 2) == Some(&'\'') {
+                i += 3;
+            } else {
+                i += 1;
+            }
+        } else {
+            i += 1;
+        }
+    }
+    out
+}
+
+#[test]
+fn every_memory_statement_prepares_and_scopes_before_data_access() {
+    let db = rusqlite::Connection::open_in_memory().unwrap();
+    db.execute_batch(include_str!("../src/schema.sql")).unwrap();
+    let source = include_str!("../src/store.rs");
+    let fragments = string_literals(source);
+    let coverage = fragments
+        .iter()
+        .find(|s| s.starts_with("CASE WHEN "))
+        .expect("actual coverage SQL")
+        .replace("{}", "6");
+    let mut count = 0;
+    for sql in string_literals(source).into_iter().filter(|s| {
+        ["SELECT ", "INSERT ", "DELETE ", "UPDATE "]
+            .iter()
+            .any(|v| s.starts_with(v))
+    }) {
+        count += 1;
+        let sql = sql
+            .replace("{column}", "tool_hash")
+            .replace("{coverage}", &coverage)
+            .replace("{}", "0");
+        db.prepare(&sql).unwrap_or_else(|e| panic!("{sql}: {e}"));
+        let compact = sql.split_whitespace().collect::<String>();
+        if sql.starts_with("INSERT INTO namespaces(") {
+            continue;
+        } // Explicit local bootstrap, never a mounted operation.
+        if sql.contains("FROM namespaces WHERE tool_hash=?1") {
+            continue;
+        } // Credential lookup fixes immutable namespace.
+        assert!(
+            compact.contains("namespace=?") || (sql.starts_with("INSERT ") && compact.contains("(namespace,")),
+            "missing parameterized namespace: {sql}"
+        );
+        if sql.contains("entries_fts MATCH") {
+            assert!(sql.contains("rowid=e.seq"), "FTS must be correlated to the scoped row");
+            let plan = format!("EXPLAIN QUERY PLAN {sql}");
+            let mut stmt = db.prepare(&plan).unwrap();
+            let mut query = stmt.raw_query();
+            let mut descriptions = Vec::new();
+            while let Some(r) = query.next().unwrap() {
+                descriptions.push(r.get::<_, String>(3).unwrap());
+            }
+            assert!(descriptions.iter().any(|s| s.contains("CORRELATED")));
+            assert!(
+                !descriptions.iter().any(|s| s.contains("LIST SUBQUERY")),
+                "{descriptions:?}"
+            );
+        }
+    }
+    assert_eq!(count, 8, "new statements need explicit audit coverage");
+}
diff --git a/crates/hennery-memory/tests/store.rs b/crates/hennery-memory/tests/store.rs
new file mode 100644
index 00000000..1eab95dd
--- /dev/null
+++ b/crates/hennery-memory/tests/store.rs
@@ -0,0 +1,146 @@
+use hennery_memory::store::{Query, Remember, Store};
+
+fn memory(key: &str, body: &str) -> Remember {
+    serde_json::from_value(serde_json::json!({"title":"Observation", "body":body,"idempotency_key":key})).unwrap()
+}
+#[test]
+fn namespaces_isolate_search_recent_brief_and_idempotency() {
+    let dir = tempfile::tempdir().unwrap();
+    let s = Store::open(&dir.path().join("memory.db")).unwrap();
+    let a = s.create("owner-a", "hat-a").unwrap();
+    let b = s.create("owner-b", "hat-a").unwrap();
+    let first = s.remember(&a.tool, memory("key", "private café alpha")).unwrap();
+    assert_eq!(first, s.remember(&a.tool, memory("key", "private café alpha")).unwrap());
+    assert!(s.remember(&a.tool, memory("key", "changed")).is_err());
+    let q = Query::search("cafe");
+    let before = s.search(&a.tool, &q).unwrap();
+    assert_eq!(before.entries.len(), 1);
+    assert!(s.search(&b.tool, &q).unwrap().entries.is_empty());
+    for i in 0..12 {
+        s.remember(&b.tool, memory(&i.to_string(), "cafe foreign")).unwrap();
+    }
+    assert_eq!(before, s.search(&a.tool, &q).unwrap());
+    assert!(s.recent(&a.tool, &Query::default()).unwrap().entries.is_empty());
+    assert!(
+        s.brief(&a.tool, "cafe", None)
+            .unwrap()
+            .to_string()
+            .contains("unverified")
+    );
+    assert!(s.search(&a.lifecycle, &q).is_err());
+    assert!(s.remember("unknown", memory("x", "x")).is_err());
+}
+#[test]
+fn fts_uses_literal_bounded_terms_not_syntax() {
+    let dir = tempfile::tempdir().unwrap();
+    let s = Store::open(&dir.path().join("memory.db")).unwrap();
+    let a = s.create("owner", "hat").unwrap();
+    s.remember(&a.tool, memory("k", "alpha café 東京")).unwrap();
+    for q in ["alpha", "cafe", "東京"] {
+        assert_eq!(s.search(&a.tool, &Query::search(q)).unwrap().entries.len(), 1);
+    }
+    for q in ["\" OR *", "NEAR(alpha)", "alpha' ; DROP TABLE entries; --"] {
+        let _ = s.search(&a.tool, &Query::search(q)).unwrap();
+    }
+    assert!(s.search(&a.tool, &Query::search(&"a ".repeat(40))).is_err());
+    assert_eq!(s.search(&a.tool, &Query::search("alpha")).unwrap().entries.len(), 1);
+}
+#[test]
+fn redact_before_storage_index_and_dedup_bounds() {
+    let dir = tempfile::tempdir().unwrap();
+    let path = dir.path().join("memory.db");
+    let s = Store::open(&path).unwrap();
+    let a = s.create("o", "h").unwrap();
+    let r = s
+        .remember(&a.tool, memory("k", "HNRY_PLUGIN_DEADBEEF arbitrary-provider-secret"))
+        .unwrap();
+    assert!(r.redacted);
+    let hit = s.search(&a.tool, &Query::search("arbitrary")).unwrap();
+    assert!(!serde_json::to_string(&hit).unwrap().contains("DEADBEEF"));
+    assert!(
+        s.search(&a.tool, &Query::search("DEADBEEF"))
+            .unwrap()
+            .entries
+            .is_empty()
+    );
+    assert!(s.remember(&a.tool, memory("large", &"x".repeat(16385))).is_err());
+    let raw = rusqlite::Connection::open(&path).unwrap();
+    let hashes: String = raw
+        .query_row("SELECT tool_hash FROM namespaces", [], |r| r.get(0))
+        .unwrap();
+    assert!(!hashes.contains("hnry_"));
+}
+#[test]
+fn query_cursor_is_bound_to_namespace_and_query_and_response_is_bounded() {
+    let dir = tempfile::tempdir().unwrap();
+    let s = Store::open(&dir.path().join("memory.db")).unwrap();
+    let a = s.create("o", "a").unwrap();
+    let b = s.create("o", "b").unwrap();
+    for i in 0..25 {
+        s.remember(&a.tool, memory(&i.to_string(), &format!("alpha {}", "x".repeat(15000))))
+            .unwrap();
+    }
+    let mut q = Query::search("alpha");
+    q.limit = Some(20);
+    let page = s.search(&a.tool, &q).unwrap();
+    assert!(serde_json::to_vec(&page).unwrap().len() <= 16384);
+    let cursor = page.next_cursor.unwrap();
+    q.cursor = Some(cursor.clone());
+    assert!(!s.search(&a.tool, &q).unwrap().entries.is_empty());
+    assert!(s.search(&b.tool, &q).is_err());
+    q.query = Some("other".into());
+    assert!(s.search(&a.tool, &q).is_err());
+}
+
+#[test]
+fn empty_input_has_no_invented_brief_and_scoped_coverage_beats_recency() {
+    let dir = tempfile::tempdir().unwrap();
+    let s = Store::open(&dir.path().join("memory.db")).unwrap();
+    let a = s.create("o", "h").unwrap();
+    let best = s.remember(&a.tool, memory("a", "alpha beta")).unwrap();
+    s.remember(&a.tool, memory("b", "alpha")).unwrap();
+    assert_eq!(
+        s.search(&a.tool, &Query::search("alpha beta")).unwrap().entries[0].id,
+        best.id
+    );
+    assert_eq!(s.brief(&a.tool, "", None).unwrap()["sources"], serde_json::json!([]));
+    assert_eq!(s.search(&a.tool, &Query::search("***")).unwrap().entries.len(), 0);
+}
+
+#[test]
+fn different_redacted_inputs_still_conflict() {
+    let d = tempfile::tempdir().unwrap();
+    let s = Store::open(&d.path().join("m.db")).unwrap();
+    let a = s.create("o", "h").unwrap();
+    s.remember(&a.tool, memory("key", "hnry_plugin_aaaaaaaa")).unwrap();
+    assert!(s.remember(&a.tool, memory("key", "hnry_plugin_bbbbbbbb")).is_err());
+}
+#[test]
+fn redaction_expansion_cannot_exceed_persisted_field_bounds() {
+    let d = tempfile::tempdir().unwrap();
+    let s = Store::open(&d.path().join("m.db")).unwrap();
+    let a = s.create("o", "h").unwrap();
+    let mut m = memory("k", "body");
+    m.tags = vec![format!("{}hnry_plugin_deadbeef", "x".repeat(44))];
+    assert!(s.remember(&a.tool, m).is_err());
+}
+#[test]
+fn escaped_entry_cannot_return_an_empty_nonadvancing_page() {
+    let d = tempfile::tempdir().unwrap();
+    let s = Store::open(&d.path().join("m.db")).unwrap();
+    let a = s.create("o", "h").unwrap();
+    let mut m = memory("k", &format!("alpha {}", "\0".repeat(1018)));
+    m.title = "\0".repeat(160);
+    m.tags = vec!["\0".repeat(64); 16];
+    s.remember(&a.tool, m).unwrap();
+    let page = s.search(&a.tool, &Query::search("alpha")).unwrap();
+    assert_eq!(page.entries.len(), 1);
+    assert!(page.entries[0].truncated);
+    assert!(page.next_cursor.is_none());
+    assert!(
+        serde_json::to_vec(&serde_json::to_string(&page).unwrap())
+            .unwrap()
+            .len()
+            < 16384
+    );
+}
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 69b3993a..5e119c3b 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -180,0 +181,4 @@ const EXEMPT: &[(&str, &str)] = &[
+    (
+        "hennery-memory/src/store.rs",
+        "separate optional memory database, never hennery.db; every statement is prepared and namespace-scoped by hennery-memory/tests/sql_scope.rs",
+    ),
diff --git a/nix/package.nix b/nix/package.nix
index e65fad27..e8fc5bb1 100644
--- a/nix/package.nix
+++ b/nix/package.nix
@@ -20,0 +21 @@ let
+      ../crates/hennery-memory/src/schema.sql
```

## Task 2: Four HTTP MCP tools and explicit local bootstrap

Build HTTP tests first and observe RED; implement stateless JSON MCP initialize/list/call and four strictly typed tools. Separate lifecycle authority, reject browser Origin and alternate identity transports, bound body/response/time/concurrency, make local credentials once and keep private files. Targeted command: `cargo test -p hennery-memory --test http --locked`.



**Files:** HTTP MCP transport, explicit CLI, HTTP/bootstrap tests, deterministic brief output and crate dependencies.

**RED observed:** missing HTTP module (101); authority/whitespace handling, unknown-bearer stalled body and fully escaped decoded-body regressions (101); CLI first-exec/version regressions (101). Fixed the implementation and added supported version output. An initial targeted crate run had 19 passing tests; the final six Rust gates and native Nix passed (workspace 2,360 passed). These historical full runs preceded the operator's verification-budget amendment.

**Apply:** save this exact diff as task-2.patch and run `git apply --unidiff-zero --index task-2.patch`. Then run `nix develop -c cargo test -p hennery-memory --test http --test cli --locked`.

<!-- recall-task-2 -->
```diff
diff --git a/Cargo.lock b/Cargo.lock
index d71691bc..e625f29d 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1625,0 +1626 @@ dependencies = [
+ "futures",
@@ -1630,0 +1632 @@ dependencies = [
+ "hennery-testkit",
diff --git a/crates/hennery-memory/Cargo.toml b/crates/hennery-memory/Cargo.toml
index 5e4c7c7a..4defec70 100644
--- a/crates/hennery-memory/Cargo.toml
+++ b/crates/hennery-memory/Cargo.toml
@@ -21 +21,2 @@ serde.workspace = true
-serde_json.workspace = true
+serde_json = { workspace = true, features = ["raw_value"] }
+futures.workspace = true
@@ -30,0 +32 @@ hennery-sessions.workspace = true
+hennery-testkit = { path = "../hennery-testkit" }
diff --git a/crates/hennery-memory/src/http.rs b/crates/hennery-memory/src/http.rs
new file mode 100644
index 00000000..9182db88
--- /dev/null
+++ b/crates/hennery-memory/src/http.rs
@@ -0,0 +1,378 @@
+//! Stateless HTTP MCP and distinct generic lifecycle operations. Parse typed
+//! arguments directly from raw JSON, preserving duplicate-key evidence.
+use crate::store::{Query, Remember, Store};
+use axum::{
+    Json, Router,
+    body::{Body, Bytes, to_bytes},
+    extract::{Request, State},
+    http::{StatusCode, header},
+    response::{IntoResponse, Response},
+    routing::post,
+};
+use serde::{Deserialize, de::DeserializeOwned};
+use serde_json::{Value, json, value::RawValue};
+use std::{
+    collections::HashMap,
+    sync::{Arc, Mutex, Weak},
+    time::Duration,
+};
+use tokio::sync::Semaphore;
+#[derive(Clone)]
+struct Service {
+    store: Arc<Store>,
+    permits: Arc<Semaphore>,
+    admin_permits: Arc<Semaphore>,
+    scopes: Arc<Mutex<HashMap<String, Weak<Semaphore>>>>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Rpc {
+    jsonrpc: String,
+    id: Option<Value>,
+    method: String,
+    params: Option<Box<RawValue>>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Call {
+    name: String,
+    arguments: Box<RawValue>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Empty {}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields, rename_all = "camelCase")]
+struct Initialize {
+    protocol_version: String,
+    capabilities: Value,
+    #[serde(deserialize_with = "object_field")]
+    client_info: ClientInfo,
+}
+fn object<T: DeserializeOwned>(raw: &str) -> anyhow::Result<T> {
+    anyhow::ensure!(raw.trim_start().starts_with('{'), "object required");
+    Ok(serde_json::from_str(raw)?)
+}
+fn object_field<'de, D: serde::Deserializer<'de>, T: DeserializeOwned>(de: D) -> Result<T, D::Error> {
+    let raw = Box::<RawValue>::deserialize(de)?;
+    object(raw.get()).map_err(serde::de::Error::custom)
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct ClientInfo {
+    name: String,
+    version: String,
+    title: Option<String>,
+    #[serde(default, rename = "description")]
+    _description: Option<String>,
+    #[serde(default, rename = "websiteUrl")]
+    _website_url: Option<String>,
+    #[serde(default, rename = "icons", deserialize_with = "object_icons")]
+    _icons: Option<Vec<ClientIcon>>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct ClientIcon {
+    #[serde(rename = "src")]
+    _src: String,
+    #[serde(default, rename = "mimeType")]
+    _mime_type: Option<String>,
+    #[serde(default, rename = "sizes")]
+    _sizes: Option<Vec<String>>,
+    #[serde(default, rename = "theme")]
+    _theme: Option<IconTheme>,
+}
+#[derive(Deserialize)]
+#[serde(rename_all = "lowercase")]
+enum IconTheme {
+    Light,
+    Dark,
+}
+fn object_icons<'de, D: serde::Deserializer<'de>>(de: D) -> Result<Option<Vec<ClientIcon>>, D::Error> {
+    let raw = Option::<Vec<Box<RawValue>>>::deserialize(de)?;
+    raw.map(|items| {
+        items
+            .into_iter()
+            .map(|item| object(item.get()))
+            .collect::<anyhow::Result<Vec<_>>>()
+    })
+    .transpose()
+    .map_err(serde::de::Error::custom)
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Recent {
+    project_key: Option<String>,
+    limit: Option<usize>,
+    cursor: Option<String>,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Search {
+    query: String,
+    kind: Option<String>,
+    project_key: Option<String>,
+    limit: Option<usize>,
+    cursor: Option<String>,
+}
+#[derive(Deserialize)]
+#[serde(rename_all = "snake_case")]
+enum Mode {
+    Deterministic,
+    Model,
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Brief {
+    subject: String,
+    project_key: Option<String>,
+    mode: Option<Mode>,
+}
+pub fn router(store: Arc<Store>) -> Router {
+    Router::new().route("/mcp", post(rpc)).with_state(Service {
+        store,
+        permits: Arc::new(Semaphore::new(32)),
+        admin_permits: Arc::new(Semaphore::new(4)),
+        scopes: Arc::default(),
+    })
+}
+fn response(status: StatusCode, value: Value) -> Response {
+    let mut response = (status, Json(value)).into_response();
+    response
+        .headers_mut()
+        .insert(header::CACHE_CONTROL, "no-store".parse().expect("header"));
+    response
+}
+fn refused() -> Response {
+    response(StatusCode::NOT_FOUND, json!({"error":"unavailable"}))
+}
+fn rpc_error(id: Value, code: i64) -> Response {
+    response(
+        StatusCode::OK,
+        json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":"operation refused"}}),
+    )
+}
+async fn rpc(State(service): State<Service>, request: Request) -> Response {
+    if request.uri().query().is_some()
+        || request.headers().contains_key(header::ORIGIN)
+        || request.headers().contains_key(header::COOKIE)
+    {
+        return refused();
+    }
+    let mut headers = request.headers().get_all(header::AUTHORIZATION).iter();
+    let Some(token) = headers
+        .next()
+        .and_then(|h| h.to_str().ok())
+        .and_then(|h| h.strip_prefix("Bearer "))
+        .map(str::to_string)
+    else {
+        return refused();
+    };
+    if headers.next().is_some() || token.len() > 256 {
+        return refused();
+    }
+    let credential_admin = token.starts_with("hnry_lifecycle_");
+    let Ok(namespace) = service.store.authenticated_namespace(&token, credential_admin) else {
+        return refused();
+    };
+    let pool = if credential_admin {
+        &service.admin_permits
+    } else {
+        &service.permits
+    };
+    let Ok(permit) = pool.clone().try_acquire_owned() else {
+        return response(StatusCode::SERVICE_UNAVAILABLE, json!({"error":"busy"}));
+    };
+    let scoped = {
+        let mut scopes = service.scopes.lock().expect("scopes");
+        scopes.retain(|_, value| value.strong_count() > 0);
+        let name = format!("{namespace}:{credential_admin}");
+        if let Some(scope) = scopes.get(&name).and_then(Weak::upgrade) {
+            scope
+        } else {
+            let scope = Arc::new(Semaphore::new(if credential_admin { 1 } else { 4 }));
+            scopes.insert(name, Arc::downgrade(&scope));
+            scope
+        }
+    };
+    let Ok(scoped_permit) = scoped.try_acquire_owned() else {
+        return response(StatusCode::SERVICE_UNAVAILABLE, json!({"error":"busy"}));
+    };
+    if !request
+        .headers()
+        .get(header::CONTENT_TYPE)
+        .and_then(|h| h.to_str().ok())
+        .is_some_and(|s| s.split(';').next() == Some("application/json"))
+    {
+        return response(StatusCode::UNSUPPORTED_MEDIA_TYPE, json!({"error":"invalid request"}));
+    }
+    let raw = match tokio::time::timeout(Duration::from_secs(5), to_bytes(request.into_body(), 128 * 1024)).await {
+        Ok(Ok(raw)) => raw,
+        _ => return response(StatusCode::BAD_REQUEST, json!({"error":"invalid request"})),
+    };
+    let Ok(syntax) = serde_json::from_slice::<Box<RawValue>>(&raw) else {
+        return rpc_error(Value::Null, -32700);
+    };
+    let Ok(rpc) = object::<Rpc>(syntax.get()) else {
+        return rpc_error(Value::Null, -32600);
+    };
+    let id = rpc.id.clone().unwrap_or(Value::Null);
+    if rpc.jsonrpc != "2.0"
+        || !matches!(&id, Value::Null | Value::Number(_) | Value::String(_))
+        || id.as_str().is_some_and(|s| s.len() > 128)
+    {
+        return rpc_error(Value::Null, -32600);
+    }
+    let admin = rpc.method.starts_with("hennery_plugin_");
+    if admin != credential_admin || service.store.available(&token, admin).is_err() {
+        return refused();
+    }
+    if rpc.method == "notifications/initialized" && rpc.id.is_none() {
+        if rpc
+            .params
+            .as_deref()
+            .is_some_and(|raw| object::<Empty>(raw.get()).is_err())
+        {
+            return rpc_error(Value::Null, -32602);
+        }
+        return (StatusCode::ACCEPTED, [(header::CACHE_CONTROL, "no-store")]).into_response();
+    }
+    if rpc.id.is_none() {
+        return rpc_error(Value::Null, -32600);
+    }
+    if !admin && !["initialize", "ping", "tools/list", "tools/call"].contains(&rpc.method.as_str()) {
+        return rpc_error(id, -32601);
+    }
+    let params = rpc.params.as_deref().map(RawValue::get).unwrap_or("{}");
+    let result: Result<Value, anyhow::Error> = (|| {
+        if admin {
+            anyhow::ensure!(
+                rpc.method == "hennery_plugin_capabilities",
+                "unsupported lifecycle operation"
+            );
+            let _: Empty = object(params)?;
+            return Ok(json!({"version":1,"activity_v1":false,"forget_v1":false,"startup_context_v1":false}));
+        }
+        match rpc.method.as_str() {
+            "initialize" => {
+                let init: Initialize = object(params)?;
+                anyhow::ensure!(
+                    ["2025-03-26", "2025-06-18", "2025-11-25"].contains(&init.protocol_version.as_str())
+                        && init.capabilities.is_object()
+                        && init.client_info.name.len() <= 256
+                        && init.client_info.version.len() <= 128
+                        && init.client_info.title.as_ref().is_none_or(|s| s.len() <= 256),
+                    "unsupported initialize"
+                );
+                Ok(
+                    json!({"protocolVersion":init.protocol_version,"capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"hennery-memory","version":env!("CARGO_PKG_VERSION")}}),
+                )
+            }
+            "ping" => {
+                let _: Empty = object(params)?;
+                Ok(json!({}))
+            }
+            "tools/list" => {
+                let _: Empty = object(params)?;
+                Ok(json!({"tools":tools()}))
+            }
+            "tools/call" => {
+                let call: Call = object(params)?;
+                let text = call.arguments.get();
+                let value = match call.name.as_str() {
+                    "memory_recent" => {
+                        let q: Recent = object(text)?;
+                        serde_json::to_value(service.store.recent(
+                            &token,
+                            &Query {
+                                project_key: q.project_key,
+                                limit: q.limit,
+                                cursor: q.cursor,
+                                ..Query::default()
+                            },
+                        )?)?
+                    }
+                    "memory_search" => {
+                        let q: Search = object(text)?;
+                        serde_json::to_value(service.store.search(
+                            &token,
+                            &Query {
+                                query: Some(q.query),
+                                kind: q.kind,
+                                project_key: q.project_key,
+                                limit: q.limit,
+                                cursor: q.cursor,
+                            },
+                        )?)?
+                    }
+                    "memory_remember" => {
+                        serde_json::to_value(service.store.remember(&token, object::<Remember>(text)?)?)?
+                    }
+                    "memory_brief" => {
+                        let q: Brief = object(text)?;
+                        let mut value = service.store.brief(&token, &q.subject, q.project_key)?;
+                        if matches!(q.mode, Some(Mode::Model)) {
+                            value["fallback_reason"] = json!("model support is not configured");
+                        }
+                        value
+                    }
+                    _ => anyhow::bail!("unknown tool"),
+                };
+                Ok(json!({"content":[{"type":"text","text":serde_json::to_string(&value)?}],"isError":false}))
+            }
+            _ => anyhow::bail!("unsupported method"),
+        }
+    })();
+    match result {
+        Ok(result) => {
+            let bytes = serde_json::to_vec(&json!({"jsonrpc":"2.0","id":id,"result":result})).expect("result");
+            if bytes.len() > 16384 {
+                return rpc_error(id, -32603);
+            }
+            // Recheck at delivery, after serialization. No mutex/DB guard is
+            // held across the HTTP exchange or any network wait.
+            let stream = futures::stream::once(async move {
+                let _permits = (permit, scoped_permit);
+                service
+                    .store
+                    .available(&token, admin)
+                    .map_err(|_| std::io::Error::from(std::io::ErrorKind::PermissionDenied))?;
+                Ok::<Bytes, std::io::Error>(Bytes::from(bytes))
+            });
+            let mut response = Response::new(Body::from_stream(stream));
+            response
+                .headers_mut()
+                .insert(header::CONTENT_TYPE, "application/json".parse().expect("header"));
+            response
+                .headers_mut()
+                .insert(header::CACHE_CONTROL, "no-store".parse().expect("header"));
+            response
+        }
+        Err(_) => rpc_error(id, -32602),
+    }
+}
+fn tools() -> Vec<Value> {
+    let optional = json!({"project_key":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":20},"cursor":{"type":"string"}});
+    let mut recent = optional.clone();
+    let mut search = optional;
+    search["query"] = json!({"type":"string","maxLength":512});
+    search["kind"] = json!({"type":"string","enum":["memory","note","source"]});
+    let entries = [
+        (
+            "memory_recent",
+            "Recent completed-session observations",
+            &mut recent,
+            vec![],
+        ),
+        (
+            "memory_search",
+            "Search this credential's namespace",
+            &mut search,
+            vec!["query"],
+        ),
+    ];
+    let mut tools=entries.into_iter().map(|(name,description,properties,required)|json!({"name":name,"description":description,"inputSchema":{"type":"object","properties":properties,"required":required,"additionalProperties":false}})).collect::<Vec<_>>();
+    tools.push(json!({"name":"memory_brief","description":"Dated quotations and typed evidence; deterministic, no model","inputSchema":{"type":"object","properties":{"subject":{"type":"string","maxLength":512},"project_key":{"type":"string"},"mode":{"type":"string","enum":["deterministic","model"]}},"required":["subject"],"additionalProperties":false}}));
+    tools.push(json!({"name":"memory_remember","description":"Retain agent-authored, unverified text; no verified session identity","inputSchema":{"type":"object","properties":{"title":{"type":"string","maxLength":160},"body":{"type":"string","maxLength":16384},"kind":{"type":"string","enum":["user","feedback","project","reference","decision","entity"]},"tags":{"type":"array","maxItems":16,"items":{"type":"string","maxLength":64}},"idempotency_key":{"type":"string","maxLength":128}},"required":["title","body","idempotency_key"],"additionalProperties":false}}));
+    tools
+}
diff --git a/crates/hennery-memory/src/lib.rs b/crates/hennery-memory/src/lib.rs
index 97aa3cdc..7c49e33f 100644
--- a/crates/hennery-memory/src/lib.rs
+++ b/crates/hennery-memory/src/lib.rs
@@ -1,0 +2 @@
+pub mod http;
diff --git a/crates/hennery-memory/src/main.rs b/crates/hennery-memory/src/main.rs
new file mode 100644
index 00000000..13717883
--- /dev/null
+++ b/crates/hennery-memory/src/main.rs
@@ -0,0 +1,76 @@
+//! Explicit standalone service: no default data path and no core installer.
+use clap::{Parser, Subcommand};
+use hennery_memory::{http, store::Store};
+use std::{
+    os::unix::fs::{DirBuilderExt, PermissionsExt},
+    path::PathBuf,
+    sync::Arc,
+};
+#[derive(Parser)]
+#[command(
+    name = "hennery-memory",
+    version,
+    about = "Optional memory MCP service; no model required"
+)]
+struct Args {
+    #[arg(long)]
+    data_dir: PathBuf,
+    #[command(subcommand)]
+    command: Command,
+}
+#[derive(Subcommand)]
+enum Command {
+    /// Mint one isolated namespace's tool and lifecycle credentials, shown once.
+    Create {
+        #[arg(long)]
+        owner: String,
+        #[arg(long)]
+        hat: String,
+    },
+    /// Run stateless HTTP MCP. Put TLS/authenticated routing in front for remote use.
+    Serve {
+        #[arg(long, default_value = "127.0.0.1:7332")]
+        listen: std::net::SocketAddr,
+    },
+}
+#[tokio::main]
+async fn main() {
+    if run().await.is_err() {
+        eprintln!("memory operation failed; check private directory, configuration and namespace state");
+        std::process::exit(1);
+    }
+}
+async fn run() -> anyhow::Result<()> {
+    let args = Args::parse();
+    if !args.data_dir.exists() {
+        std::fs::DirBuilder::new()
+            .recursive(true)
+            .mode(0o700)
+            .create(&args.data_dir)?;
+    }
+    let meta = args.data_dir.symlink_metadata()?;
+    anyhow::ensure!(
+        meta.is_dir() && !meta.file_type().is_symlink() && meta.permissions().mode() & 0o077 == 0,
+        "private real directory required"
+    );
+    let store = Arc::new(Store::open(&args.data_dir.join("memory.db"))?);
+    match args.command {
+        Command::Create { owner, hat } => {
+            let c = store.create(&owner, &hat)?;
+            println!(
+                "{}",
+                serde_json::json!({"namespace":c.namespace,"tool_credential":c.tool,"lifecycle_credential":c.lifecycle,"mode":"standalone; no collector lease or automatic deletion guarantee"})
+            );
+        }
+        Command::Serve { listen } => {
+            let listener = tokio::net::TcpListener::bind(listen).await?;
+            println!("memory listening on {}", listener.local_addr()?);
+            axum::serve(listener, http::router(store))
+                .with_graceful_shutdown(async {
+                    let _ = tokio::signal::ctrl_c().await;
+                })
+                .await?;
+        }
+    }
+    Ok(())
+}
diff --git a/crates/hennery-memory/src/store.rs b/crates/hennery-memory/src/store.rs
index 51076f8f..b4b192f9 100644
--- a/crates/hennery-memory/src/store.rs
+++ b/crates/hennery-memory/src/store.rs
@@ -111,0 +112,7 @@ impl Store {
+    /// Authentication only; used again immediately before HTTP delivery.
+    pub fn available(&self, token: &str, admin: bool) -> Result<()> {
+        self.inner.lock().expect("store").auth(token, admin, false).map(|_| ())
+    }
+    pub fn authenticated_namespace(&self, token: &str, admin: bool) -> Result<String> {
+        Ok(self.inner.lock().expect("store").auth(token, admin, false)?.id)
+    }
@@ -363 +370 @@ impl Store {
-        let page = self.search(
+        let mut page = self.search(
@@ -372 +379,25 @@ impl Store {
-        Ok(json!({"sources":page.entries,"mode_used":"deterministic","fallback_reason":null,"stale":page.stale}))
+        // Render quotations, never inferred facts. Retain source ids, dates,
+        // roles and typed evidence separately, even when texts disagree.
+        loop {
+            let text = page
+                .entries
+                .iter()
+                .map(|e| {
+                    format!(
+                        "[{}] {} — {}\n> {}",
+                        e.id,
+                        hennery_kernel::secret::rfc3339(e.created_at),
+                        e.title,
+                        e.body.replace('\n', "\n> ")
+                    )
+                })
+                .collect::<Vec<_>>()
+                .join("\n\n");
+            let value = json!({"text":text,"sources":page.entries,"mode_used":"deterministic","fallback_reason":null,"stale":page.stale,"truncated":page.next_cursor.is_some()});
+            if serde_json::to_vec(&serde_json::to_string(&value)?)?.len() <= 14 * 1024 {
+                return Ok(value);
+            }
+            ensure!(!page.entries.is_empty(), "brief exceeds response bound");
+            page.entries.pop();
+            page.next_cursor = Some(String::new());
+        }
diff --git a/crates/hennery-memory/tests/cli.rs b/crates/hennery-memory/tests/cli.rs
new file mode 100644
index 00000000..87946799
--- /dev/null
+++ b/crates/hennery-memory/tests/cli.rs
@@ -0,0 +1,88 @@
+use std::{os::unix::fs::PermissionsExt, path::Path, process::Command};
+fn command(home: &Path) -> Command {
+    let binary = env!("CARGO_BIN_EXE_hennery-memory");
+    hennery_testkit::first_exec(binary);
+    let mut command = Command::new(binary);
+    command
+        .env("HOME", home)
+        .env("XDG_CONFIG_HOME", home.join("config"))
+        .env("XDG_DATA_HOME", home.join("data"))
+        .env("XDG_STATE_HOME", home.join("state"))
+        .env("XDG_CACHE_HOME", home.join("cache"))
+        .env_remove("HENNERY_DATA_DIR")
+        .env_remove("HENNERY_HOST_DATA_DIR")
+        .env_remove("HENNERY_MASTER_KEY")
+        .env_remove("CREDENTIALS_DIRECTORY")
+        .env_remove("CODEX_HOME")
+        .env_remove("CLAUDE_CONFIG_DIR");
+    command
+}
+#[test]
+fn bootstrap_is_explicit_private_and_only_hashes_credentials() {
+    let dir = tempfile::tempdir().unwrap();
+    let data = dir.path().join("private");
+    let output = command(dir.path())
+        .arg("--data-dir")
+        .arg(&data)
+        .args(["create", "--owner", "owner", "--hat", "hat"])
+        .output()
+        .unwrap();
+    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
+    let created: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
+    assert!(created["tool_credential"].as_str().unwrap().starts_with("hnry_plugin_"));
+    assert!(
+        created["lifecycle_credential"]
+            .as_str()
+            .unwrap()
+            .starts_with("hnry_lifecycle_")
+    );
+    assert_eq!(data.metadata().unwrap().permissions().mode() & 0o777, 0o700);
+    assert_eq!(
+        data.join("memory.db").metadata().unwrap().permissions().mode() & 0o777,
+        0o600
+    );
+    let bytes = std::fs::read(data.join("memory.db")).unwrap();
+    for key in ["tool_credential", "lifecycle_credential"] {
+        let token = created[key].as_str().unwrap().as_bytes();
+        assert!(!bytes.windows(token.len()).any(|s| s == token));
+    }
+}
+#[test]
+fn missing_data_dir_and_unsafe_directory_are_refused() {
+    let dir = tempfile::tempdir().unwrap();
+    assert!(
+        !command(dir.path())
+            .args(["create", "--owner", "owner", "--hat", "hat"])
+            .status()
+            .unwrap()
+            .success()
+    );
+    let public = dir.path().join("public");
+    std::fs::create_dir(&public).unwrap();
+    std::fs::set_permissions(&public, std::fs::Permissions::from_mode(0o755)).unwrap();
+    assert!(
+        !command(dir.path())
+            .arg("--data-dir")
+            .arg(&public)
+            .args(["create", "--owner", "owner", "--hat", "hat"])
+            .status()
+            .unwrap()
+            .success()
+    );
+    assert!(!public.join("memory.db").exists());
+    let target = dir.path().join("target");
+    std::fs::create_dir(&target).unwrap();
+    std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o700)).unwrap();
+    let link = dir.path().join("link");
+    std::os::unix::fs::symlink(&target, &link).unwrap();
+    assert!(
+        !command(dir.path())
+            .arg("--data-dir")
+            .arg(&link)
+            .args(["create", "--owner", "owner", "--hat", "hat"])
+            .status()
+            .unwrap()
+            .success()
+    );
+    assert!(!target.join("memory.db").exists());
+}
diff --git a/crates/hennery-memory/tests/http.rs b/crates/hennery-memory/tests/http.rs
new file mode 100644
index 00000000..6a4d86fb
--- /dev/null
+++ b/crates/hennery-memory/tests/http.rs
@@ -0,0 +1,311 @@
+use hennery_memory::{http, store::Store};
+use serde_json::{Value, json};
+use std::sync::Arc;
+struct World {
+    _dir: tempfile::TempDir,
+    store: Arc<Store>,
+    tool: String,
+    admin: String,
+    url: String,
+    task: tokio::task::JoinHandle<()>,
+}
+impl Drop for World {
+    fn drop(&mut self) {
+        self.task.abort();
+    }
+}
+impl World {
+    async fn new() -> Self {
+        let d = tempfile::tempdir().unwrap();
+        let store = Arc::new(Store::open(&d.path().join("memory.db")).unwrap());
+        let c = store.create("owner", "hat").unwrap();
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let url = format!("http://{}/mcp", listener.local_addr().unwrap());
+        let app = http::router(store.clone());
+        let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
+        Self {
+            _dir: d,
+            store,
+            tool: c.tool,
+            admin: c.lifecycle,
+            url,
+            task,
+        }
+    }
+    async fn raw(&self, token: &str, raw: &str) -> reqwest::Response {
+        reqwest::Client::new()
+            .post(&self.url)
+            .bearer_auth(token)
+            .header("content-type", "application/json")
+            .body(raw.to_string())
+            .send()
+            .await
+            .unwrap()
+    }
+    async fn call(&self, name: &str, args: Value) -> Value {
+        self.raw(
+            &self.tool,
+            &json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":name,"arguments":args}}).to_string(),
+        )
+        .await
+        .json()
+        .await
+        .unwrap()
+    }
+}
+#[tokio::test]
+async fn real_http_mcp_exposes_exactly_four_tools_and_separates_lifecycle_authority() {
+    let w = World::new().await;
+    let init=w.raw(&w.tool,r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}"#).await;
+    assert_eq!(init.status(), 200);
+    assert_eq!(init.headers()["cache-control"], "no-store");
+    assert_eq!(
+        init.json::<Value>().await.unwrap()["result"]["serverInfo"]["name"],
+        "hennery-memory"
+    );
+    let list = w
+        .raw(&w.tool, r#"{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}"#)
+        .await
+        .json::<Value>()
+        .await
+        .unwrap();
+    let names = list["result"]["tools"]
+        .as_array()
+        .unwrap()
+        .iter()
+        .map(|t| t["name"].as_str().unwrap())
+        .collect::<Vec<_>>();
+    assert_eq!(
+        names,
+        vec!["memory_recent", "memory_search", "memory_brief", "memory_remember"]
+    );
+    let caps = r#"{"jsonrpc":"2.0","id":"caps","method":"hennery_plugin_capabilities","params":{}}"#;
+    assert_eq!(w.raw(&w.tool, caps).await.status(), 404);
+    assert_eq!(
+        w.raw(&w.admin, r#"{"jsonrpc":"2.0","id":1,"method":"tools/list"}"#)
+            .await
+            .status(),
+        404
+    );
+    assert_eq!(w.raw(&w.admin, caps).await.status(), 200);
+}
+#[tokio::test]
+async fn tools_retain_unverified_author_and_return_dated_deterministic_brief() {
+    let w = World::new().await;
+    let remember = w
+        .call(
+            "memory_remember",
+            json!({"title":"Café","body":"retain alpha hnry_lifecycle_DEADBEEF","idempotency_key":"key"}),
+        )
+        .await;
+    assert!(remember.get("error").is_none(), "{remember}");
+    let remembered: Value = serde_json::from_str(remember["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
+    assert_eq!(remembered["revision"], 1);
+    assert_eq!(remembered["redacted"], true);
+    let search = w.call("memory_search", json!({"query":"cafe"})).await;
+    let hit: Value = serde_json::from_str(search["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
+    assert_eq!(hit["entries"][0]["author"], "agent");
+    assert_eq!(hit["entries"][0]["provenance"], json!([{"kind":"unverified"}]));
+    assert!(!search.to_string().contains("DEADBEEF"));
+    let brief = w.call("memory_brief", json!({"subject":"alpha","mode":"model"})).await;
+    let brief: Value = serde_json::from_str(brief["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
+    assert_eq!(brief["mode_used"], "deterministic");
+    assert!(!brief["fallback_reason"].is_null());
+    let text = brief["text"].as_str().unwrap();
+    assert!(text.contains("alpha") && text.contains(remembered["id"].as_str().unwrap()) && text.contains('T'));
+    let recent = w.call("memory_recent", json!({})).await;
+    let recent: Value = serde_json::from_str(recent["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
+    assert_eq!(recent["entries"], json!([]));
+}
+#[tokio::test]
+async fn authority_keys_duplicates_notifications_and_browser_requests_cannot_write() {
+    let w = World::new().await;
+    for args in [
+        r#"{"title":"t","body":"x","idempotency_key":"k","owner":"other"}"#,
+        r#"{"title":"t","body":"x","idempotency_key":"k","hat":"other"}"#,
+        r#"{"title":"t","body":"x","idempotency_key":"k","\u006fwner":"other"}"#,
+        r#"{"title":"t","body":"x","idempotency_key":"k","Owner":"other"}"#,
+        r#"{"title":"t","body":"x","body":"y","idempotency_key":"k"}"#,
+    ] {
+        let body = format!(
+            r#"{{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{{"name":"memory_remember","arguments":{args}}}}}"#
+        );
+        let response = w.raw(&w.tool, &body).await;
+        assert!(response.json::<Value>().await.unwrap().get("error").is_some());
+    }
+    for body in [
+        r#"{"jsonrpc":"2.0","method":"tools/call","params":{"name":"memory_remember","arguments":{"title":"t","body":"x","idempotency_key":"k"}}}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"ping","method":"tools/call"}"#,
+    ] {
+        assert!(
+            w.raw(&w.tool, body)
+                .await
+                .json::<Value>()
+                .await
+                .unwrap()
+                .get("error")
+                .is_some()
+        );
+    }
+    let body = r#"{"jsonrpc":"2.0","id":1,"method":"tools/list"}"#;
+    assert_eq!(
+        reqwest::Client::new()
+            .post(&w.url)
+            .bearer_auth(&w.tool)
+            .header("content-type", "application/json")
+            .header("origin", "null")
+            .body(body)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        404
+    );
+    assert_eq!(w.raw("unknown", body).await.status(), 404);
+    let response = w.raw(&w.tool, &"x".repeat(131073)).await;
+    assert_eq!(response.status(), 400);
+    assert!(!response.text().await.unwrap().contains("xxxx"));
+    assert!(
+        w.store
+            .search(&w.tool, &hennery_memory::store::Query::search("x"))
+            .unwrap()
+            .entries
+            .is_empty()
+    );
+}
+
+#[tokio::test]
+async fn initialize_rejects_authority_fields_and_empty_params_allow_json_whitespace() {
+    let w = World::new().await;
+    let invalid = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1"},"owner":"foreign"}}"#;
+    assert!(
+        w.raw(&w.tool, invalid)
+            .await
+            .json::<Value>()
+            .await
+            .unwrap()
+            .get("error")
+            .is_some()
+    );
+    let whitespace = r#"{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{ }}"#;
+    assert!(
+        w.raw(&w.tool, whitespace)
+            .await
+            .json::<Value>()
+            .await
+            .unwrap()
+            .get("result")
+            .is_some()
+    );
+}
+#[tokio::test]
+async fn unknown_bearer_is_rejected_before_waiting_for_a_body() {
+    use tokio::io::{AsyncReadExt, AsyncWriteExt};
+    let w = World::new().await;
+    let url = reqwest::Url::parse(&w.url).unwrap();
+    let mut socket = tokio::net::TcpStream::connect((url.host_str().unwrap(), url.port().unwrap()))
+        .await
+        .unwrap();
+    socket.write_all(b"POST /mcp HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer unknown\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n").await.unwrap();
+    let mut buf = [0u8; 1024];
+    let n = tokio::time::timeout(std::time::Duration::from_secs(1), socket.read(&mut buf))
+        .await
+        .expect("unknown credentials must not occupy a body slot")
+        .unwrap();
+    assert!(std::str::from_utf8(&buf[..n]).unwrap().starts_with("HTTP/1.1 404"));
+}
+#[tokio::test]
+async fn full_decoded_body_limit_is_supported_even_when_json_escaping_expands_it() {
+    let w = World::new().await;
+    let value = w
+        .call(
+            "memory_remember",
+            json!({"title":"alpha escaped","body":"\0".repeat(16384),"idempotency_key":"escaped"}),
+        )
+        .await;
+    assert!(value.get("result").is_some(), "valid decoded memory refused: {value}");
+    let value = w.call("memory_search", json!({"query":"alpha"})).await;
+    let bytes = serde_json::to_vec(&value).unwrap();
+    assert!(bytes.len() <= 16384);
+    let page: Value = serde_json::from_str(value["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
+    assert_eq!(page["entries"].as_array().unwrap().len(), 1);
+}
+
+async fn stalled(w: &World) -> tokio::net::TcpStream {
+    use tokio::io::AsyncWriteExt;
+    let url = reqwest::Url::parse(&w.url).unwrap();
+    let mut socket = tokio::net::TcpStream::connect((url.host_str().unwrap(), url.port().unwrap()))
+        .await
+        .unwrap();
+    socket.write_all(format!("POST /mcp HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n",w.tool).as_bytes()).await.unwrap();
+    socket
+}
+#[tokio::test]
+async fn one_namespaces_stalled_bodies_cannot_take_other_namespaces_or_lifecycle_slots() {
+    let w = World::new().await;
+    let mut sockets = Vec::new();
+    for _ in 0..4 {
+        sockets.push(stalled(&w).await);
+    }
+    let body = r#"{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}"#;
+    tokio::time::timeout(std::time::Duration::from_secs(3), async {
+        loop {
+            let response = w.raw(&w.tool, body).await;
+            if response.status() == 503 {
+                break;
+            }
+            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
+        }
+    })
+    .await
+    .expect("four stalled requests must occupy just this namespace's slots");
+    let other = w.store.create("owner", "other").unwrap();
+    assert_eq!(w.raw(&other.tool, body).await.status(), 200);
+    let caps = r#"{"jsonrpc":"2.0","id":1,"method":"hennery_plugin_capabilities","params":{}}"#;
+    assert_eq!(w.raw(&w.admin, caps).await.status(), 200);
+    drop(sockets);
+}
+#[tokio::test]
+async fn stalled_authenticated_body_has_a_deadline_and_does_not_hold_the_store() {
+    use tokio::io::AsyncReadExt;
+    let w = World::new().await;
+    let mut socket = stalled(&w).await;
+    assert!(w.store.create("owner", "another").is_ok());
+    let mut buffer = [0u8; 1024];
+    let n = tokio::time::timeout(std::time::Duration::from_secs(8), socket.read(&mut buffer))
+        .await
+        .expect("request deadline")
+        .unwrap();
+    assert!(std::str::from_utf8(&buffer[..n]).unwrap().starts_with("HTTP/1.1 400"));
+}
+#[tokio::test]
+async fn positional_arrays_never_become_rpc_objects_or_tool_arguments() {
+    let w = World::new().await;
+    for raw in [
+        r#"["2.0",1,"tools/list",{}]"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":["memory_remember",{"title":"t","body":"x","idempotency_key":"k"}]}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_remember","arguments":["t","x",null,[],"k"]}}"#,
+        r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":["test","1",null]}}"#,
+    ] {
+        let value = w.raw(&w.tool, raw).await.json::<Value>().await.unwrap();
+        assert!(value.get("error").is_some(), "positional input accepted: {raw}");
+    }
+}
+#[tokio::test]
+async fn standard_client_metadata_and_protocol_error_codes_are_supported() {
+    let w = World::new().await;
+    let response=w.raw(&w.tool,&json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"client","title":"Client","description":"SDK metadata","version":"1","websiteUrl":"https://example.com","icons":[{"src":"https://example.com/icon.png","mimeType":"image/png","sizes":["16x16"],"theme":"dark"}]}}}).to_string()).await.json::<Value>().await.unwrap();
+    assert!(response.get("result").is_some(), "{response}");
+    for (body, code) in [
+        ("{", -32700),
+        (r#"{"jsonrpc":"2.0","id":1,"method":"unsupported"}"#, -32601),
+    ] {
+        let value = w.raw(&w.tool, body).await.json::<Value>().await.unwrap();
+        assert_eq!(value["error"]["code"], code);
+    }
+    let notification = w
+        .raw(&w.tool, r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#)
+        .await;
+    assert_eq!(notification.status(), 202);
+    assert!(notification.bytes().await.unwrap().is_empty());
+}
```

## Task 3: C1 consumer, leases, revoke and purge

Build feed/lifecycle tests first and observe RED; consume bounded typed pages with atomic projection/cursor updates and idempotent event handling, keep three turn pairs within 8 KiB, suppression/reset/deletion, stable reset inventory, no model. Persist credentials sealed with namespace-bound AAD. Validate and cap leases, fail closed on authoritative denial, retain stale data on network failures, fence late work and idempotently erase after authenticated forget. Targeted command: `cargo test -p hennery-memory --test consumer --locked`.



**Files:** deterministic consumer, second schema migration, independent key loader, lifecycle HTTP/CLI support, consumer/administration tests and strengthened namespace SQL audit.

**RED observed:** missing consumer API (101); explicit network grants, protocol headers, owner purge receipt collision and per-turn dates (101). Later guards were behaviorally removed in copies and caught before restored GREEN. The parent's ruling preserved WIP first, built C1b separately, then rebased and completed this task. The consumer requests 500-ID inventory pages, paces them at 1.1 seconds and drains activity with 2.2-second backlog spacing. A 10,000-source reset takes 20 pages; only locally known source intersections are retained in memory. Expired/reset-inconsistent snapshots abort the entire reconciliation, retain notes, deny reads and restart from scratch; no partial deletion occurs. Notes retained after a reset keep explicit gap evidence. The consumer has an overall 20-minute reset deadline matching C1b's absolute bound.

Targeted final task-three suite: 47 passed. Fmt, both clippy checks and both generators exited 0; full workspace/Nix were deferred to the final plan gate under the amended budget.

**Apply:** save this exact diff as task-3.patch and run `git apply --unidiff-zero --index task-3.patch`. Then run `nix develop -c cargo test -p hennery-memory --locked`.

<!-- recall-task-3 -->
```diff
diff --git a/Cargo.lock b/Cargo.lock
index e625f29d..a8a61a48 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1640,0 +1641 @@ dependencies = [
+ "time",
@@ -1641,0 +1643 @@ dependencies = [
+ "tower",
diff --git a/crates/hennery-memory/Cargo.toml b/crates/hennery-memory/Cargo.toml
index 4defec70..91ed789a 100644
--- a/crates/hennery-memory/Cargo.toml
+++ b/crates/hennery-memory/Cargo.toml
@@ -26,0 +27 @@ zeroize.workspace = true
+time = { workspace = true, features = ["parsing"] }
@@ -32,0 +34 @@ hennery-testkit = { path = "../hennery-testkit" }
+tower = { version = "0.5", features = ["util"] }
diff --git a/crates/hennery-memory/src/consumer.rs b/crates/hennery-memory/src/consumer.rs
new file mode 100644
index 00000000..cfa43cb5
--- /dev/null
+++ b/crates/hennery-memory/src/consumer.rs
@@ -0,0 +1,965 @@
+//! Pull only from explicit C1 grants. Every late response is fenced against
+//! the same namespace epoch/config/cursor revision under the store mutex.
+use crate::store::{Entry, Inner, Namespace, Observation, Store, bounded, put};
+use anyhow::{Context, Result, ensure};
+use hennery_gateway::{crypto, key::MasterKey};
+use hennery_kernel::{
+    egress::{self, Allowance, Egress, Timeouts},
+    redact,
+    secret::{sha256_hex, unix_now},
+};
+use hennery_proto::{plugin::*, plugin_management::PluginLease};
+use rusqlite::{OptionalExtension, params};
+use serde::{Deserialize, Serialize};
+use std::{
+    sync::Arc,
+    time::{Duration, Instant},
+};
+use url::Url;
+#[derive(Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+pub struct FeedConfig {
+    pub collector_url: String,
+    pub namespace_epoch: String,
+    pub activity_token: String,
+    pub activity: bool,
+    #[serde(default)]
+    pub internal_network: bool,
+}
+struct Job {
+    id: String,
+    epoch: String,
+    revision: i64,
+    cursor: Option<String>,
+    config: FeedConfig,
+}
+#[derive(Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+pub struct Forget {
+    pub request_id: String,
+    pub namespace_epoch: String,
+    pub target: Target,
+}
+#[derive(Serialize, Deserialize)]
+#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
+pub enum Target {
+    Scope,
+    Session { session_id: String },
+}
+impl Drop for FeedConfig {
+    fn drop(&mut self) {
+        use zeroize::Zeroize;
+        self.activity_token.zeroize();
+    }
+}
+pub const BACKLOG_DELAY: Duration = Duration::from_millis(2200);
+pub struct Consumer {
+    egress: Egress,
+    http: reqwest::Client,
+}
+impl Consumer {
+    pub fn new() -> Result<Self> {
+        Ok(Self {
+            egress: Egress::new(Timeouts {
+                connect: Duration::from_secs(3),
+                request: Duration::from_secs(5),
+            })?,
+            http: reqwest::Client::new(),
+        })
+    }
+    pub async fn poll(&self, store: &Store, key: &MasterKey, id: &str) -> Result<bool> {
+        let job = store.job(key, id)?;
+        let result = tokio::time::timeout(Duration::from_secs(20 * 60), self.run(store, &job)).await;
+        match result {
+            Ok(Ok(more)) => Ok(more),
+            _ => {
+                store.failed(&job, true);
+                anyhow::bail!("activity unavailable")
+            }
+        }
+    }
+    async fn request(&self, job: &Job, path: &str, after: Option<&str>, post: bool) -> Result<Vec<u8>> {
+        let mut url = Url::parse(&job.config.collector_url)?;
+        url.set_path(path);
+        if !post {
+            let mut q = url.query_pairs_mut();
+            q.append_pair("limit", if path == "/api/plugins/inventory" { "500" } else { "20" });
+            if let Some(c) = after {
+                q.append_pair("after", c);
+            }
+        }
+        let request = self
+            .http
+            .request(
+                if post {
+                    reqwest::Method::POST
+                } else {
+                    reqwest::Method::GET
+                },
+                url,
+            )
+            .bearer_auth(&job.config.activity_token)
+            .build()?;
+        let response = self
+            .egress
+            .client(if job.config.internal_network {
+                Allowance::InternalNetwork
+            } else {
+                Allowance::PublicOnly
+            })
+            .send(request)
+            .await?;
+        let status = response.status();
+        if status == reqwest::StatusCode::NOT_FOUND {
+            anyhow::bail!("grant denied");
+        }
+        if status == reqwest::StatusCode::CONFLICT {
+            anyhow::bail!("reset required");
+        }
+        ensure!(
+            status.is_success()
+                && response
+                    .headers()
+                    .get("content-type")
+                    .and_then(|v| v.to_str().ok())
+                    .is_some_and(|v| v.split(';').next() == Some("application/json")),
+            "invalid activity response"
+        );
+        Ok(egress::read_capped(response, 128 * 1024).await?)
+    }
+    async fn run(&self, store: &Store, job: &Job) -> Result<bool> {
+        let start = Instant::now();
+        let began = unix_now();
+        // Lease has an explicit epoch even for an empty feed. Never infer an epoch
+        // from a caller's hints or accept an empty foreign-token response.
+        let lease: PluginLease = match self.request(job, "/api/plugins/lease", None, true).await {
+            Ok(bytes) => serde_json::from_slice(&bytes)?,
+            Err(e) => {
+                if e.to_string() == "grant denied" {
+                    store.failed(job, true);
+                }
+                return Err(e);
+            }
+        };
+        ensure!(lease.namespace_epoch == job.epoch, "epoch mismatch");
+        let mut until = lease.lease_until.min(began + 60);
+        ensure!(until > unix_now(), "expired lease");
+        if !job.config.activity {
+            store.renew(job, start, until)?;
+            return Ok(false);
+        }
+        match self
+            .request(job, "/api/plugins/activity", job.cursor.as_deref(), false)
+            .await
+        {
+            Ok(bytes) => {
+                let page: PluginActivityPage = serde_json::from_slice(&bytes)?;
+                until = until.min(page.lease_until);
+                let more = page.has_more;
+                store.apply(job, page, start, until)?;
+                Ok(more)
+            }
+            Err(e) => {
+                if e.to_string() == "grant denied" {
+                    store.failed(job, true);
+                    return Err(e);
+                }
+                if e.to_string() != "reset required" {
+                    return Err(e);
+                }
+                store.failed(job, true);
+                let mut after = None;
+                let known = store.known_sources(job)?;
+                let mut latest_start;
+                let mut ids = std::collections::BTreeSet::new();
+                let mut marker = None;
+                let mut resume = None;
+                loop {
+                    if after.is_some() {
+                        tokio::time::sleep(Duration::from_millis(1100)).await;
+                    }
+                    store.ensure_current(job)?;
+                    let page_start = Instant::now();
+                    let page_began = unix_now();
+                    let bytes = self
+                        .request(job, "/api/plugins/inventory", after.as_deref(), false)
+                        .await?;
+                    store.ensure_current(job)?;
+                    let page: PluginSourceInventoryPage = serde_json::from_slice(&bytes)?;
+                    ensure!(
+                        page.version == 1
+                            && page.source_ids.len() <= 500
+                            && page.watermark.len() <= 2048
+                            && page.resume_cursor.len() <= 2048,
+                        "invalid inventory"
+                    );
+                    if let Some(m) = &marker {
+                        ensure!(
+                            m == &page.watermark && resume.as_ref() == Some(&page.resume_cursor),
+                            "inventory changed"
+                        );
+                    }
+                    marker = Some(page.watermark);
+                    resume = Some(page.resume_cursor);
+                    until = page.lease_until.min(page_began.saturating_add(60));
+                    check_lease(page_start, until)?;
+                    latest_start = page_start;
+                    for id in page.source_ids {
+                        ensure!(!id.is_empty() && id.len() <= 256, "invalid source");
+                        if known.contains(&id) {
+                            ids.insert(id);
+                        }
+                    }
+
+                    let Some(next) = page.next_cursor else {
+                        break;
+                    };
+                    ensure!(
+                        next.len() <= 2048 && after.as_ref() != Some(&next),
+                        "invalid inventory cursor"
+                    );
+                    after = Some(next);
+                }
+                store.inventory(job, ids, resume.context("missing inventory")?, latest_start, until)?;
+                Ok(false)
+            }
+        }
+    }
+}
+impl Store {
+    pub fn attach(&self, id: &str, mut config: FeedConfig, key: &MasterKey) -> Result<()> {
+        let url = Url::parse(&config.collector_url)?;
+        ensure!(
+            url.path() == "/"
+                && url.query().is_none()
+                && url.fragment().is_none()
+                && url.username().is_empty()
+                && url.password().is_none(),
+            "collector origin required"
+        );
+        egress::check_url(
+            &url,
+            if config.internal_network {
+                Allowance::InternalNetwork
+            } else {
+                Allowance::PublicOnly
+            },
+        )
+        .map_err(|_| anyhow::anyhow!("collector origin refused"))?;
+        ensure!(
+            hex64(&config.namespace_epoch) && config.activity_token.strip_prefix("hnry_activity_").is_some_and(hex64),
+            "invalid grant"
+        );
+        config.collector_url = url.to_string();
+        let mut inner = self.inner.lock().expect("store");
+        let tx = inner.db.transaction()?;
+        let (registered, epoch, state): (bool, String, String) =
+            tx.query_row("SELECT registered,epoch,state FROM namespaces WHERE id=?1", [id], |r| {
+                Ok((r.get(0)?, r.get(1)?, r.get(2)?))
+            })?;
+        ensure!(state == "active", "namespace terminal");
+        if registered {
+            ensure!(epoch == config.namespace_epoch, "cannot replace epoch");
+            let previous: Vec<u8> = tx.query_row("SELECT config FROM feeds WHERE namespace=?1", [id], |r| r.get(0))?;
+            let previous = crypto::open(key, &format!("{id}:{epoch}"), "memory.feed", 1, &previous)?;
+            let previous: FeedConfig = serde_json::from_slice(&previous)?;
+            ensure!(
+                Url::parse(&previous.collector_url)? == url,
+                "cannot change collector origin"
+            );
+        } else {
+            let entries: i64 = tx.query_row("SELECT count(*) FROM entries WHERE namespace=?1", [id], |r| r.get(0))?;
+            ensure!(entries == 0, "attach requires empty namespace");
+        }
+        let feeds: i64 = tx.query_row("SELECT count(*) FROM feeds", [], |r| r.get(0))?;
+        ensure!(registered || feeds < 128, "too many feeds");
+        let blob = crypto::seal(
+            key,
+            &format!("{id}:{}", config.namespace_epoch),
+            "memory.feed",
+            &serde_json::to_vec(&config)?,
+        );
+        tx.execute(
+            "UPDATE namespaces SET registered=1,epoch=?2 WHERE id=?1",
+            params![id, config.namespace_epoch],
+        )?;
+        tx.execute("INSERT INTO feeds(namespace,config) VALUES(?1,?2) ON CONFLICT(namespace) DO UPDATE SET config=excluded.config,revision=revision+1",params![id,blob])?;
+        tx.commit()?;
+        inner.invalidate(id);
+        inner.leases.remove(id);
+        inner.stale.insert(id.into());
+        Ok(())
+    }
+    pub fn feed_ids(&self) -> Result<Vec<String>> {
+        let inner = self.inner.lock().expect("store");
+        let mut stmt=inner.db.prepare("SELECT f.namespace FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE n.state='active' ORDER BY f.namespace LIMIT 129")?;
+        let ids = stmt
+            .query_map([], |r| r.get(0))?
+            .collect::<rusqlite::Result<Vec<_>>>()?;
+        ensure!(ids.len() <= 128, "too many feeds");
+        Ok(ids)
+    }
+    pub fn has_feed_credentials(&self) -> Result<bool> {
+        let inner = self.inner.lock().expect("store");
+        Ok(inner
+            .db
+            .query_row("SELECT EXISTS(SELECT 1 FROM feeds)", [], |r| r.get(0))?)
+    }
+    fn job(&self, key: &MasterKey, id: &str) -> Result<Job> {
+        let mut inner = self.inner.lock().expect("store");
+        let (epoch,revision,cursor,blob):(String,i64,Option<String>,Vec<u8>)=inner.db.query_row("SELECT n.epoch,f.revision,f.cursor,f.config FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE f.namespace=?1 AND n.state='active'",[id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))?;
+        let decoded = (|| -> Result<FeedConfig> {
+            let bytes = zeroize::Zeroizing::new(crypto::open(key, &format!("{id}:{epoch}"), "memory.feed", 1, &blob)?);
+            let config: FeedConfig = serde_json::from_slice(&bytes)?;
+            ensure!(config.namespace_epoch == epoch, "epoch mismatch");
+            Ok(config)
+        })();
+        let config = match decoded {
+            Ok(config) => config,
+            Err(e) => {
+                inner.leases.remove(id);
+                inner.stale.insert(id.into());
+                return Err(e);
+            }
+        };
+        Ok(Job {
+            id: id.into(),
+            epoch,
+            revision,
+            cursor,
+            config,
+        })
+    }
+    fn failed(&self, job: &Job, denied: bool) {
+        let mut inner = self.inner.lock().expect("store");
+        if inner.live(job).is_ok() {
+            if denied {
+                inner.leases.remove(&job.id);
+            }
+            inner.stale.insert(job.id.clone());
+        }
+    }
+    fn renew(&self, job: &Job, start: Instant, until: i64) -> Result<()> {
+        let mut inner = self.inner.lock().expect("store");
+        inner.live(job)?;
+        inner.lease(job, start, until)
+    }
+    fn apply(&self, job: &Job, page: PluginActivityPage, start: Instant, until: i64) -> Result<()> {
+        ensure!(
+            page.version == 1
+                && page.items.len() <= 20
+                && page.next_cursor.len() <= 2048
+                && serde_json::to_vec(&page)?.len() <= 128 * 1024,
+            "invalid page"
+        );
+        for item in &page.items {
+            validate(item, &job.epoch)?;
+        }
+        let digests = page
+            .items
+            .iter()
+            .map(|item| serde_json::to_vec(item).map(|bytes| sha256_hex(&bytes)))
+            .collect::<std::result::Result<Vec<_>, _>>()?;
+        let mut value = serde_json::to_value(page)?;
+        redact::value(&mut value);
+        let page: PluginActivityPage = serde_json::from_value(value)?;
+        let mut inner = self.inner.lock().expect("store");
+        inner.live(job)?;
+        check_lease(start, until)?;
+        let tx = inner.db.transaction()?;
+        let erased = page
+            .items
+            .iter()
+            .any(|item| !matches!(item.body, ActivityBody::CompletedTurn { .. }));
+        for (item, digest) in page.items.into_iter().zip(digests) {
+            let old: Option<String> = tx
+                .query_row(
+                    "SELECT digest FROM seen WHERE namespace=?1 AND event_key=?2",
+                    params![job.id, item.event_key],
+                    |r| r.get(0),
+                )
+                .optional()?;
+            if let Some(old) = old {
+                ensure!(old == digest, "source event changed");
+                continue;
+            }
+            match &item.body {
+                ActivityBody::SessionRemoved | ActivityBody::SourceReset => {
+                    remove_source(&tx, &job.id, &item.session_id)?;
+                    if matches!(item.body, ActivityBody::SessionRemoved) {
+                        tx.execute(
+                            "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
+                            params![job.id, item.session_id],
+                        )?;
+                    }
+                }
+                ActivityBody::CompletedTurn { project_key, .. } => {
+                    let suppressed: bool = tx.query_row(
+                        "SELECT EXISTS(SELECT 1 FROM suppressed WHERE namespace=?1 AND session=?2)",
+                        params![job.id, item.session_id],
+                        |r| r.get(0),
+                    )?;
+                    if !suppressed {
+                        let id = sha256_hex(format!("native-note:{}", item.session_id).as_bytes());
+                        let old: Option<String> = tx
+                            .query_row(
+                                "SELECT data FROM entries WHERE namespace=?1 AND id=?2",
+                                params![job.id, id],
+                                |r| r.get(0),
+                            )
+                            .optional()?;
+                        let mut entry = if let Some(old) = old {
+                            serde_json::from_str::<Entry>(&old)?
+                        } else {
+                            Entry {
+                                id,
+                                kind: "note".into(),
+                                title: "Completed-session observation".into(),
+                                body: String::new(),
+                                project_key: Some(project_key.clone()),
+                                author: "observation".into(),
+                                created_at: unix_now(),
+                                updated_at: 0,
+                                covered_through: None,
+                                project_key_omitted: false,
+                                project_key_digest: None,
+                                revision: 0,
+                                memory_kind: None,
+                                tags: vec![],
+                                provenance: vec![],
+                                source_refs: vec![],
+                                truncated: false,
+                                stale: false,
+                                turns: vec![],
+                                older_turns: 0,
+                            }
+                        };
+                        if let ActivityBody::CompletedTurn { completed_at, .. } = &item.body {
+                            entry.updated_at = time::OffsetDateTime::parse(
+                                completed_at,
+                                &time::format_description::well_known::Rfc3339,
+                            )?
+                            .unix_timestamp();
+                            if entry.revision == 0 {
+                                entry.created_at = entry.updated_at;
+                            }
+                        }
+                        entry.covered_through = Some(item.event_key.clone());
+                        entry.turns.push(observation(&item)?);
+                        entry.revision += 1;
+                        entry.project_key = Some(project_key.clone());
+                        while entry.turns.len() > 3 {
+                            entry.turns.remove(0);
+                            entry.older_turns += 1;
+                            entry.truncated = true;
+                        }
+                        render_note(&mut entry)?;
+                        put(&tx, &job.id, &entry)?;
+                        tx.execute("INSERT INTO sources(namespace,session,event_key) VALUES(?1,?2,?3) ON CONFLICT(namespace,session) DO UPDATE SET event_key=excluded.event_key",params![job.id,item.session_id,item.event_key])?;
+                    }
+                }
+            }
+            tx.execute(
+                "INSERT INTO seen(namespace,event_key,digest) VALUES(?1,?2,?3)",
+                params![job.id, item.event_key, digest],
+            )?;
+        }
+        budget(&tx, &job.id)?;
+        tx.execute(
+            "UPDATE feeds SET cursor=?2,revision=revision+1 WHERE namespace=?1",
+            params![job.id, page.next_cursor],
+        )?;
+        check_lease(start, until)?;
+        tx.commit()?;
+        if erased {
+            inner.invalidate(&job.id);
+        }
+        inner.leases.remove(&job.id);
+        inner.stale.insert(job.id.clone());
+        checkpoint(&inner)?;
+        inner.lease(job, start, until)
+    }
+    fn ensure_current(&self, job: &Job) -> Result<()> {
+        self.inner.lock().expect("store").live(job)
+    }
+    fn known_sources(&self, job: &Job) -> Result<std::collections::BTreeSet<String>> {
+        let inner = self.inner.lock().expect("store");
+        inner.live(job)?;
+        let mut stmt = inner.db.prepare("SELECT session FROM sources WHERE namespace=?1")?;
+        let ids = stmt
+            .query_map([&job.id], |r| r.get::<_, String>(0))?
+            .collect::<rusqlite::Result<std::collections::BTreeSet<_>>>()?;
+        ensure!(ids.len() <= 10000, "local source budget exceeded");
+        Ok(ids)
+    }
+    fn inventory(
+        &self,
+        job: &Job,
+        ids: std::collections::BTreeSet<String>,
+        resume: String,
+        start: Instant,
+        until: i64,
+    ) -> Result<()> {
+        let mut inner = self.inner.lock().expect("store");
+        inner.live(job)?;
+        check_lease(start, until)?;
+        let tx = inner.db.transaction()?;
+        let old = {
+            let mut stmt = tx.prepare("SELECT session FROM sources WHERE namespace=?1")?;
+            stmt.query_map([&job.id], |r| r.get::<_, String>(0))?
+                .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        for id in old {
+            if !ids.contains(&id) {
+                remove_source(&tx, &job.id, &id)?;
+            }
+        }
+        let retained = {
+            let mut stmt = tx.prepare("SELECT data FROM entries WHERE namespace=?1 AND kind='note'")?;
+            stmt.query_map([&job.id], |r| r.get::<_, String>(0))?
+                .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        for data in retained {
+            let mut entry: Entry = serde_json::from_str(&data)?;
+            entry.stale = true;
+            for turn in &mut entry.turns {
+                turn.gaps = true;
+            }
+            put(&tx, &job.id, &entry)?;
+        }
+        tx.execute(
+            "UPDATE feeds SET cursor=?2,revision=revision+1 WHERE namespace=?1",
+            params![job.id, resume],
+        )?;
+        check_lease(start, until)?;
+        tx.commit()?;
+        inner.invalidate(&job.id);
+        inner.leases.remove(&job.id);
+        inner.stale.insert(job.id.clone());
+        checkpoint(&inner)?;
+        inner.lease(job, start, until)
+    }
+    pub fn suppress(&self, id: &str, session: &str) -> Result<()> {
+        ensure!(
+            !session.is_empty() && session.len() <= 256 && redact::text(session).is_none(),
+            "invalid session"
+        );
+        let mut inner = self.inner.lock().expect("store");
+        let tx = inner.db.transaction()?;
+        remove_source(&tx, id, session)?;
+        tx.execute("UPDATE feeds SET revision=revision+1 WHERE namespace=?1", [id])?;
+        tx.execute(
+            "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
+            params![id, session],
+        )?;
+        budget(&tx, id)?;
+        tx.commit()?;
+        inner.invalidate(id);
+        checkpoint(&inner)?;
+        Ok(())
+    }
+    pub fn forget(&self, token: &str, request: Forget) -> Result<ForgetReceipt> {
+        ensure!(
+            !request.request_id.is_empty()
+                && request.request_id.len() <= 128
+                && redact::text(&request.request_id).is_none(),
+            "invalid request"
+        );
+        let mut inner = self.inner.lock().expect("store");
+        let ns = inner.auth(token, true, false)?;
+        Self::forget_inner(&mut inner, ns, request)
+    }
+    fn forget_inner(inner: &mut Inner, ns: Namespace, request: Forget) -> Result<ForgetReceipt> {
+        ensure!(request.namespace_epoch == ns.epoch, "epoch mismatch");
+        let target = serde_json::to_string(&request.target)?;
+        let tx = inner.db.transaction()?;
+        let old: Option<(String, String)> = tx
+            .query_row(
+                "SELECT epoch,target FROM receipts WHERE namespace=?1 AND request=?2",
+                params![ns.id, request.request_id],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .optional()?;
+        if let Some((epoch, old)) = old {
+            ensure!(epoch == request.namespace_epoch && old == target, "request conflict");
+        } else {
+            let active: bool = tx.query_row("SELECT state='active' FROM namespaces WHERE id=?1", [&ns.id], |r| {
+                r.get(0)
+            })?;
+            ensure!(active, "namespace terminal");
+            match request.target {
+                Target::Scope => {
+                    tx.execute("DELETE FROM receipts WHERE namespace=?1", [&ns.id])?;
+                    tx.execute(
+                        "UPDATE namespaces SET state='purged',tool_hash=id,cursor_key='',writes=0 WHERE id=?1",
+                        [&ns.id],
+                    )?;
+                    for table in ["entries", "sources", "requests", "suppressed", "seen", "feeds"] {
+                        tx.execute(&format!("DELETE FROM {table} WHERE namespace=?1"), [&ns.id])?;
+                    }
+                }
+                Target::Session { ref session_id } => {
+                    ensure!(
+                        !session_id.is_empty() && session_id.len() <= 256 && redact::text(session_id).is_none(),
+                        "invalid session"
+                    );
+                    remove_source(&tx, &ns.id, session_id)?;
+                    tx.execute(
+                        "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
+                        params![ns.id, session_id],
+                    )?;
+                    tx.execute("UPDATE feeds SET revision=revision+1 WHERE namespace=?1", [&ns.id])?;
+                }
+            }
+            tx.execute(
+                "INSERT INTO receipts(namespace,request,epoch,target) VALUES(?1,?2,?3,?4)",
+                params![ns.id, request.request_id, request.namespace_epoch, target],
+            )?;
+            budget(&tx, &ns.id)?;
+        }
+        tx.commit()?;
+        inner.invalidate(&ns.id);
+        inner.leases.remove(&ns.id);
+        let previously: bool =
+            inner
+                .db
+                .query_row("SELECT erasure_confirmed FROM namespaces WHERE id=?1", [&ns.id], |r| {
+                    r.get(0)
+                })?;
+        let (busy, _, _): (i64, i64, i64) = inner.db.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| {
+            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
+        })?;
+        let busy = if previously { 0 } else { busy };
+        if busy == 0 && matches!(request.target, Target::Scope) {
+            inner
+                .db
+                .execute("UPDATE namespaces SET erasure_confirmed=1 WHERE id=?1", [&ns.id])?;
+        }
+        Ok(ForgetReceipt {
+            request_id: request.request_id,
+            status: if busy == 0 {
+                ForgetStatus::Confirmed
+            } else {
+                ForgetStatus::Unconfirmed
+            },
+            remaining_kinds: if busy == 0 {
+                vec![]
+            } else {
+                vec!["storage_checkpoint".into()]
+            },
+        })
+    }
+    pub fn owner_purge(&self, id: &str) -> Result<ForgetReceipt> {
+        let mut inner = self.inner.lock().expect("store");
+        let ns = inner
+            .db
+            .query_row("SELECT id,epoch,cursor_key FROM namespaces WHERE id=?1", [id], |r| {
+                Ok(Namespace {
+                    id: r.get(0)?,
+                    epoch: r.get(1)?,
+                    cursor_key: r.get(2)?,
+                })
+            })?;
+        let active: bool = inner
+            .db
+            .query_row("SELECT state='active' FROM namespaces WHERE id=?1", [id], |r| r.get(0))?;
+        let request_id = if active {
+            format!("owner-{}", crate::store::random())
+        } else {
+            inner.db.query_row(
+                "SELECT request FROM receipts WHERE namespace=?1 AND target=?2 ORDER BY request LIMIT 1",
+                params![id, serde_json::to_string(&Target::Scope)?],
+                |r| r.get(0),
+            )?
+        };
+        let epoch = ns.epoch.clone();
+        Self::forget_inner(
+            &mut inner,
+            ns,
+            Forget {
+                request_id,
+                namespace_epoch: epoch,
+                target: Target::Scope,
+            },
+        )
+    }
+    pub fn set_writes(&self, id: &str, enabled: bool) -> Result<()> {
+        let inner = self.inner.lock().expect("store");
+        ensure!(
+            inner.db.execute(
+                "UPDATE namespaces SET writes=?2 WHERE id=?1 AND state='active'",
+                params![id, enabled]
+            )? == 1,
+            "unavailable"
+        );
+        Ok(())
+    }
+    pub fn status(&self, id: &str) -> Result<serde_json::Value> {
+        let inner = self.inner.lock().expect("store");
+        let (state, registered, writes, confirmed): (String, bool, bool, bool) = inner.db.query_row(
+            "SELECT state,registered,writes,erasure_confirmed FROM namespaces WHERE id=?1",
+            [id],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
+        )?;
+        let lease = inner
+            .leases
+            .get(id)
+            .filter(|(end, unix)| *end > Instant::now() && *unix > unix_now())
+            .map(|(_, unix)| *unix);
+        Ok(
+            serde_json::json!({"state":state,"registered":registered,"writes":writes,"lease_until":lease,"stale":inner.stale(id)||registered&&lease.is_none(),"erasure_confirmed":confirmed}),
+        )
+    }
+    pub fn lifecycle_active(&self, token: &str) -> Result<()> {
+        let inner = self.inner.lock().expect("store");
+        let ns = inner.auth(token, true, false)?;
+        let active: bool = inner
+            .db
+            .query_row("SELECT state='active' FROM namespaces WHERE id=?1", [ns.id], |r| {
+                r.get(0)
+            })?;
+        ensure!(active, "unavailable");
+        Ok(())
+    }
+}
+impl Inner {
+    fn live(&self, job: &Job) -> Result<()> {
+        let current:Option<(String,i64,Option<String>)>=self.db.query_row("SELECT n.epoch,f.revision,f.cursor FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE f.namespace=?1 AND n.state='active'",[&job.id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional()?;
+        ensure!(
+            current == Some((job.epoch.clone(), job.revision, job.cursor.clone())),
+            "stale feed result"
+        );
+        Ok(())
+    }
+    fn lease(&mut self, job: &Job, start: Instant, until: i64) -> Result<()> {
+        let end = check_lease(start, until)?;
+        self.leases.insert(job.id.clone(), (end, until));
+        self.stale.remove(&job.id);
+        Ok(())
+    }
+}
+fn check_lease(start: Instant, until: i64) -> Result<Instant> {
+    let remaining = until.checked_sub(unix_now()).context("invalid lease")?;
+    ensure!(
+        remaining > 0 && start.elapsed() < Duration::from_secs(60),
+        "expired lease"
+    );
+    Ok((Instant::now() + Duration::from_secs(remaining.min(60) as u64)).min(start + Duration::from_secs(60)))
+}
+fn hex64(s: &str) -> bool {
+    s.len() == 64 && s.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
+}
+fn validate(item: &PluginActivityItem, epoch: &str) -> Result<()> {
+    ensure!(
+        item.namespace_epoch == epoch
+            && !item.session_id.is_empty()
+            && item.session_id.len() <= 256
+            && item.event_key.len() <= 512
+            && !item.event_key.is_empty()
+            && item.provenance.len() <= 8
+            && serde_json::to_vec(&item.provenance)?.len() <= 2048,
+        "invalid source"
+    );
+    if let ActivityBody::CompletedTurn {
+        turn_id,
+        project_key,
+        completed_at,
+        excerpts,
+        source_refs,
+        ..
+    } = &item.body
+    {
+        ensure!(
+            !turn_id.is_empty()
+                && turn_id.len() <= 256
+                && project_key.len() <= 128 * 1024
+                && completed_at.len() <= 64
+                && excerpts.len() <= 2
+                && excerpts.iter().map(|e| e.text.len()).sum::<usize>() <= 8192
+                && source_refs.len() <= 8
+                && !item.provenance.is_empty(),
+            "invalid completed turn"
+        );
+        let _ = time::OffsetDateTime::parse(completed_at, &time::format_description::well_known::Rfc3339)?;
+        for source in source_refs {
+            ensure!(
+                source.session_id == item.session_id
+                    && source.turn_id.as_deref() == Some(turn_id.as_str())
+                    && source.event_id >= 0,
+                "invalid reference"
+            );
+        }
+        for provenance in &item.provenance {
+            let Provenance::Source { source, origin } = provenance else {
+                anyhow::bail!("unsupported source evidence");
+            };
+            ensure!(source_refs.contains(source), "invalid provenance");
+            match origin {
+                InputOrigin::Operator {} => {}
+                InputOrigin::PluginContext { .. } => anyhow::bail!("injected context is not source material"),
+                InputOrigin::Parent {
+                    session_id,
+                    operation_id,
+                } => ensure!(
+                    !session_id.is_empty() && session_id.len() <= 256 && operation_id.len() <= 256,
+                    "invalid parent evidence"
+                ),
+                InputOrigin::ChildReport {
+                    child_id,
+                    source_event_id,
+                    delivery_id,
+                } => ensure!(
+                    child_id.len() <= 256 && source_event_id.len() <= 256 && delivery_id.len() <= 256,
+                    "invalid child evidence"
+                ),
+            }
+        }
+    }
+    Ok(())
+}
+fn checkpoint(inner: &Inner) -> Result<()> {
+    let (busy, _, _): (i64, i64, i64) = inner.db.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| {
+        Ok((r.get(0)?, r.get(1)?, r.get(2)?))
+    })?;
+    ensure!(busy == 0, "storage checkpoint unconfirmed");
+    Ok(())
+}
+fn observation(item: &PluginActivityItem) -> Result<Observation> {
+    let ActivityBody::CompletedTurn {
+        turn_id,
+        completed_at,
+        excerpts,
+        source_refs,
+        truncated,
+        gaps,
+        ..
+    } = &item.body
+    else {
+        anyhow::bail!("not a completed turn");
+    };
+    Ok(Observation {
+        event_key: item.event_key.clone(),
+        turn_id: turn_id.clone(),
+        completed_at: completed_at.clone(),
+        excerpts: excerpts.clone(),
+        source_refs: source_refs.clone(),
+        provenance: item.provenance.clone(),
+        truncated: *truncated,
+        gaps: *gaps,
+    })
+}
+fn render_note(entry: &mut Entry) -> Result<()> {
+    loop {
+        entry.body.clear();
+        entry.provenance.clear();
+        entry.source_refs.clear();
+        for turn in &entry.turns {
+            entry.body.push_str(&format!("[{}]\n", turn.completed_at));
+            entry.provenance.extend(turn.provenance.clone());
+            entry.source_refs.extend(turn.source_refs.clone());
+            entry.truncated |= turn.truncated;
+            entry.stale |= turn.gaps;
+            for excerpt in &turn.excerpts {
+                entry.body.push_str(&format!("{:?}: {}\n", excerpt.role, excerpt.text));
+            }
+        }
+        if entry.body.len() <= 8192 {
+            return Ok(());
+        }
+        entry.truncated = true;
+        for turn in &mut entry.turns {
+            for excerpt in &mut turn.excerpts {
+                excerpt.text = bounded(&excerpt.text, excerpt.text.len() / 2);
+            }
+            turn.truncated = true;
+        }
+    }
+}
+fn remove_source(tx: &rusqlite::Transaction<'_>, ns: &str, session: &str) -> Result<()> {
+    tx.execute(
+        "DELETE FROM entries WHERE namespace=?1 AND id=?2 AND kind='note'",
+        params![ns, sha256_hex(format!("native-note:{session}").as_bytes())],
+    )?;
+    tx.execute(
+        "DELETE FROM sources WHERE namespace=?1 AND session=?2",
+        params![ns, session],
+    )?;
+    let entries = {
+        let mut stmt = tx.prepare("SELECT data FROM entries WHERE namespace=?1 AND kind!='note'")?;
+        stmt.query_map([ns], |r| r.get::<_, String>(0))?
+            .collect::<rusqlite::Result<Vec<_>>>()?
+    };
+    for data in entries {
+        let mut e: Entry = serde_json::from_str(&data)?;
+        let old = e.source_refs.len();
+        e.source_refs.retain(|r| r.session_id != session);
+        e.provenance
+            .retain(|p| !matches!(p,Provenance::Source{source,..} if source.session_id==session));
+        if old != e.source_refs.len() {
+            if e.provenance.is_empty() {
+                e.provenance.push(Provenance::Unverified {});
+            }
+            put(tx, ns, &e)?;
+        }
+    }
+    Ok(())
+}
+fn budget(tx: &rusqlite::Transaction<'_>, id: &str) -> Result<()> {
+    let (count, bytes): (i64, i64) = tx.query_row(
+        "SELECT count(*),coalesce(sum(length(CAST(data AS BLOB))),0) FROM entries WHERE namespace=?1",
+        [id],
+        |r| Ok((r.get(0)?, r.get(1)?)),
+    )?;
+    ensure!(count <= 10000 && bytes <= 64 * 1024 * 1024, "namespace full");
+    for table in ["sources", "seen", "suppressed", "receipts"] {
+        let count: i64 = tx.query_row(&format!("SELECT count(*) FROM {table} WHERE namespace=?1"), [id], |r| {
+            r.get(0)
+        })?;
+        ensure!(count <= 100000, "namespace full");
+    }
+    Ok(())
+}
+pub async fn worker(store: Arc<Store>, key: Arc<MasterKey>) {
+    let mut running = std::collections::HashSet::new();
+    let mut tasks = tokio::task::JoinSet::new();
+    loop {
+        while let Some(result) = tasks.try_join_next() {
+            if let Ok(id) = result {
+                running.remove(&id);
+            }
+        }
+        if let Ok(ids) = store.feed_ids() {
+            for id in ids {
+                if running.insert(id.clone()) {
+                    let store = store.clone();
+                    let key = key.clone();
+                    tasks.spawn(async move {
+                        let Ok(consumer) = Consumer::new() else {
+                            return id;
+                        };
+                        let mut backoff = 1;
+                        loop {
+                            if !store.feed_ids().is_ok_and(|ids| ids.contains(&id)) {
+                                break;
+                            }
+                            let delay = match consumer.poll(&store, &key, &id).await {
+                                Ok(more) => {
+                                    backoff = 1;
+                                    if more { BACKLOG_DELAY } else { Duration::from_secs(15) }
+                                }
+                                Err(_) => {
+                                    let delay = Duration::from_secs(backoff);
+                                    backoff = (backoff * 2).min(300);
+                                    delay
+                                }
+                            };
+                            tokio::time::sleep(delay).await;
+                        }
+                        id
+                    });
+                }
+            }
+        }
+        tokio::time::sleep(Duration::from_secs(1)).await;
+    }
+}
diff --git a/crates/hennery-memory/src/http.rs b/crates/hennery-memory/src/http.rs
index 9182db88..46743bb8 100644
--- a/crates/hennery-memory/src/http.rs
+++ b/crates/hennery-memory/src/http.rs
@@ -3 +3,4 @@
-use crate::store::{Query, Remember, Store};
+use crate::{
+    consumer::Forget,
+    store::{Query, Remember, Store},
+};
@@ -138,0 +142 @@ pub fn router(store: Arc<Store>) -> Router {
+const VERSIONS: &[&str] = &["2025-03-26", "2025-06-18", "2025-11-25"];
@@ -177,0 +182,20 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
+    let versions = request
+        .headers()
+        .get_all("mcp-protocol-version")
+        .iter()
+        .collect::<Vec<_>>();
+    if versions.len() > 1
+        || versions
+            .first()
+            .is_some_and(|h| h.to_str().ok().is_none_or(|v| !VERSIONS.contains(&v)))
+    {
+        return response(StatusCode::BAD_REQUEST, json!({"error":"invalid protocol version"}));
+    }
+    let stamp = if credential_admin {
+        None
+    } else {
+        match service.store.delivery_stamp(&token) {
+            Ok(stamp) => Some(stamp),
+            Err(_) => return refused(),
+        }
+    };
@@ -248,0 +273,5 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
+            if rpc.method == "hennery_plugin_forget" {
+                return Ok(serde_json::to_value(
+                    service.store.forget(&token, object::<Forget>(params)?)?,
+                )?);
+            }
@@ -252,0 +282 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
+            service.store.lifecycle_active(&token)?;
@@ -254 +284 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
-            return Ok(json!({"version":1,"activity_v1":false,"forget_v1":false,"startup_context_v1":false}));
+            return Ok(json!({"version":1,"activity_v1":true,"forget_v1":true,"startup_context_v1":false}));
@@ -260 +290 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
-                    ["2025-03-26", "2025-06-18", "2025-11-25"].contains(&init.protocol_version.as_str())
+                    init.protocol_version.len() <= 128
@@ -266,0 +297,5 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
+                let version = if VERSIONS.contains(&init.protocol_version.as_str()) {
+                    init.protocol_version.as_str()
+                } else {
+                    VERSIONS[VERSIONS.len() - 1]
+                };
@@ -268 +303 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
-                    json!({"protocolVersion":init.protocol_version,"capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"hennery-memory","version":env!("CARGO_PKG_VERSION")}}),
+                    json!({"protocolVersion":version,"capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"hennery-memory","version":env!("CARGO_PKG_VERSION")}}),
@@ -339,0 +375,6 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
+                if let Some(stamp) = &stamp {
+                    service
+                        .store
+                        .deliverable(&token, stamp)
+                        .map_err(|_| std::io::Error::from(std::io::ErrorKind::PermissionDenied))?;
+                }
diff --git a/crates/hennery-memory/src/keys.rs b/crates/hennery-memory/src/keys.rs
new file mode 100644
index 00000000..249c814d
--- /dev/null
+++ b/crates/hennery-memory/src/keys.rs
@@ -0,0 +1,27 @@
+//! Dedicated key location; never inherits collector master-key configuration.
+use anyhow::{Result, ensure};
+use hennery_gateway::key::{self, KeySource, MasterKey};
+use std::{
+    os::unix::fs::{DirBuilderExt, PermissionsExt},
+    path::Path,
+};
+pub fn load(data: &Path, ciphertext_exists: bool) -> Result<MasterKey> {
+    let dir = data.join("memory-key");
+    if !dir.exists() {
+        std::fs::DirBuilder::new().mode(0o700).create(&dir)?;
+    }
+    let meta = dir.symlink_metadata()?;
+    ensure!(
+        meta.is_dir() && !meta.file_type().is_symlink() && meta.permissions().mode() & 0o077 == 0,
+        "private key directory required"
+    );
+    Ok(key::load_or_create(
+        &KeySource {
+            data_dir: dir,
+            env: None,
+            credentials_dir: None,
+        },
+        ciphertext_exists,
+    )?
+    .0)
+}
diff --git a/crates/hennery-memory/src/lib.rs b/crates/hennery-memory/src/lib.rs
index 7c49e33f..7863e219 100644
--- a/crates/hennery-memory/src/lib.rs
+++ b/crates/hennery-memory/src/lib.rs
@@ -1,0 +2 @@
+pub mod consumer;
@@ -2,0 +4 @@ pub mod http;
+pub mod keys;
diff --git a/crates/hennery-memory/src/main.rs b/crates/hennery-memory/src/main.rs
index 13717883..dd40e2c6 100644
--- a/crates/hennery-memory/src/main.rs
+++ b/crates/hennery-memory/src/main.rs
@@ -3 +3,6 @@ use clap::{Parser, Subcommand};
-use hennery_memory::{http, store::Store};
+use hennery_memory::{
+    consumer::{self, FeedConfig},
+    http, keys,
+    store::Store,
+};
+use std::io::Read;
@@ -22,0 +28,26 @@ enum Command {
+    /// Read a C1 grant from bounded stdin, never command arguments.
+    Attach {
+        #[arg(long)]
+        namespace: String,
+    },
+    /// Explicit filesystem-owner erasure, including after an offline revoke.
+    Purge {
+        #[arg(long)]
+        namespace: String,
+    },
+    Suppress {
+        #[arg(long)]
+        namespace: String,
+        #[arg(long)]
+        session: String,
+    },
+    Writes {
+        #[arg(long)]
+        namespace: String,
+        #[arg(long)]
+        enabled: bool,
+    },
+    Status {
+        #[arg(long)]
+        namespace: String,
+    },
@@ -57,0 +89,16 @@ async fn run() -> anyhow::Result<()> {
+        Command::Attach { namespace } => {
+            let mut bytes = zeroize::Zeroizing::new(Vec::new());
+            std::io::stdin().take(16385).read_to_end(&mut bytes)?;
+            anyhow::ensure!(
+                bytes.len() <= 16384 && bytes.first() == Some(&b'{'),
+                "bounded object required"
+            );
+            let config: FeedConfig = serde_json::from_slice(&bytes)?;
+            let key = keys::load(&args.data_dir, store.has_feed_credentials()?)?;
+            store.attach(&namespace, config, &key)?;
+            println!("grant attached; namespace requires a fresh lease");
+        }
+        Command::Purge { namespace } => println!("{}", serde_json::to_string(&store.owner_purge(&namespace)?)?),
+        Command::Suppress { namespace, session } => store.suppress(&namespace, &session)?,
+        Command::Writes { namespace, enabled } => store.set_writes(&namespace, enabled)?,
+        Command::Status { namespace } => println!("{}", store.status(&namespace)?),
@@ -67,0 +115,6 @@ async fn run() -> anyhow::Result<()> {
+            let worker = if store.has_feed_credentials()? {
+                let key = Arc::new(keys::load(&args.data_dir, true)?);
+                Some(tokio::spawn(consumer::worker(store.clone(), key)))
+            } else {
+                None
+            };
@@ -72,0 +126,3 @@ async fn run() -> anyhow::Result<()> {
+            if let Some(worker) = worker {
+                worker.abort();
+            }
diff --git a/crates/hennery-memory/src/schema2.sql b/crates/hennery-memory/src/schema2.sql
new file mode 100644
index 00000000..9bd5faa7
--- /dev/null
+++ b/crates/hennery-memory/src/schema2.sql
@@ -0,0 +1,4 @@
+ALTER TABLE seen ADD COLUMN digest TEXT NOT NULL DEFAULT '';
+ALTER TABLE entries ADD COLUMN project_digest TEXT;
+CREATE INDEX scoped_project ON entries(namespace,project_digest,seq);
+ALTER TABLE namespaces ADD COLUMN erasure_confirmed INTEGER NOT NULL DEFAULT 0;
diff --git a/crates/hennery-memory/src/store.rs b/crates/hennery-memory/src/store.rs
index b4b192f9..843d1ad8 100644
--- a/crates/hennery-memory/src/store.rs
+++ b/crates/hennery-memory/src/store.rs
@@ -8 +8 @@ use hennery_kernel::{
-use hennery_proto::plugin::{Provenance, SourceRef};
+use hennery_proto::plugin::{Excerpt, Provenance, SourceRef};
@@ -20,0 +21,2 @@ pub(crate) struct Inner {
+    pub stale: std::collections::HashSet<String>,
+    pub generations: HashMap<String, u64>,
@@ -66,0 +69,11 @@ impl Query {
+pub struct Observation {
+    pub event_key: String,
+    pub turn_id: String,
+    pub completed_at: String,
+    pub excerpts: Vec<Excerpt>,
+    pub source_refs: Vec<SourceRef>,
+    pub provenance: Vec<Provenance>,
+    pub truncated: bool,
+    pub gaps: bool,
+}
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
@@ -74,0 +88,8 @@ pub struct Entry {
+    #[serde(default)]
+    pub updated_at: i64,
+    #[serde(default)]
+    pub covered_through: Option<String>,
+    #[serde(default)]
+    pub project_key_omitted: bool,
+    #[serde(default)]
+    pub project_key_digest: Option<String>,
@@ -83 +104 @@ pub struct Entry {
-    pub turns: Vec<hennery_proto::plugin::PluginActivityItem>,
+    pub turns: Vec<Observation>,
@@ -111,0 +133,15 @@ impl Store {
+    pub fn delivery_stamp(&self, token: &str) -> Result<(String, u64)> {
+        let inner = self.inner.lock().expect("store");
+        let ns = inner.auth(token, false, false)?;
+        Ok((ns.id.clone(), *inner.generations.get(&ns.id).unwrap_or(&0)))
+    }
+    pub fn deliverable(&self, token: &str, stamp: &(String, u64)) -> Result<()> {
+        let inner = self.inner.lock().expect("store");
+        let ns = inner.auth(token, false, false)?;
+        ensure!(
+            ns.id == stamp.0 && *inner.generations.get(&ns.id).unwrap_or(&0) == stamp.1,
+            "delivery invalidated"
+        );
+        Ok(())
+    }
+
@@ -121 +157,6 @@ impl Store {
-        db::migrate_component(&mut db, "memory", &[include_str!("schema.sql")])?;
+        db::migrate_component(
+            &mut db,
+            "memory",
+            &[include_str!("schema.sql"), include_str!("schema2.sql")],
+        )?;
+        db.busy_timeout(std::time::Duration::from_millis(100))?;
@@ -125,0 +167,2 @@ impl Store {
+                stale: Default::default(),
+                generations: Default::default(),
@@ -201,0 +245,4 @@ impl Store {
+            updated_at: unix_now(),
+            covered_through: None,
+            project_key_omitted: false,
+            project_key_digest: None,
@@ -236 +283 @@ impl Store {
-            q.project_key.as_ref().is_none_or(|p| p.len() <= 1024),
+            q.project_key.as_ref().is_none_or(|p| p.len() <= 128 * 1024),
@@ -288 +335 @@ impl Store {
-                    i + 6
+                    i + 7
@@ -294 +341 @@ impl Store {
-        let sql=format!("SELECT e.data, ({coverage}) AS coverage FROM entries e WHERE e.namespace=?1 AND (?2 IS NULL OR e.kind=?2) AND (?3 IS NULL OR e.project=?3)
+        let sql=format!("SELECT e.data, ({coverage}) AS coverage FROM entries e WHERE e.namespace=?1 AND (?2 IS NULL OR e.kind=?2) AND (?3 IS NULL OR (e.project_digest=?6 AND e.project=?3))
@@ -301,0 +349 @@ impl Store {
+            q.project_key.as_ref().map(|p| sha256_hex(p.as_bytes())).into(),
@@ -317,0 +366,6 @@ impl Store {
+            if entry.project_key.as_ref().is_some_and(|p| p.len() > 1024) {
+                entry.project_key_digest = entry.project_key.as_ref().map(|p| sha256_hex(p.as_bytes()));
+                entry.project_key = None;
+                entry.project_key_omitted = true;
+                entry.truncated = true;
+            }
@@ -328,8 +382,2 @@ impl Store {
-                    if let hennery_proto::plugin::ActivityBody::CompletedTurn {
-                        excerpts, truncated, ..
-                    } = &mut turn.body
-                    {
-                        for excerpt in excerpts {
-                            excerpt.text = bounded(&excerpt.text, excerpt.text.len() / 2);
-                        }
-                        *truncated = true;
+                    for excerpt in &mut turn.excerpts {
+                        excerpt.text = bounded(&excerpt.text, excerpt.text.len() / 2);
@@ -336,0 +385 @@ impl Store {
+                    turn.truncated = true;
@@ -362,0 +412 @@ impl Store {
+        let stale = inner.stale(&ns.id) || entries.iter().any(|e| e.stale);
@@ -366 +416 @@ impl Store {
-            stale: inner.stale(&ns.id),
+            stale,
@@ -389 +439,9 @@ impl Store {
-                        hennery_kernel::secret::rfc3339(e.created_at),
+                        if e.kind == "note" {
+                            format!(
+                                "observed {} through {}",
+                                hennery_kernel::secret::rfc3339(e.created_at),
+                                hennery_kernel::secret::rfc3339(e.updated_at)
+                            )
+                        } else {
+                            hennery_kernel::secret::rfc3339(e.created_at)
+                        },
@@ -409 +467 @@ pub(crate) fn put(tx: &rusqlite::Transaction<'_>, ns: &str, e: &Entry) -> Result
-        "INSERT INTO entries(namespace,id,kind,project,title,body,data) VALUES(?1,?2,?3,?4,?5,?6,?7)",
+        "INSERT INTO entries(namespace,id,kind,project,title,body,data,project_digest) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
@@ -417 +475,2 @@ pub(crate) fn put(tx: &rusqlite::Transaction<'_>, ns: &str, e: &Entry) -> Result
-            serde_json::to_string(e)?
+            serde_json::to_string(e)?,
+            e.project_key.as_ref().map(|p| sha256_hex(p.as_bytes()))
@@ -422,0 +482,5 @@ impl Inner {
+    pub(crate) fn invalidate(&mut self, id: &str) {
+        let value = self.generations.entry(id.into()).or_default();
+        *value = value.wrapping_add(1);
+    }
+
@@ -457 +521,5 @@ impl Inner {
-        !self.leases.contains_key(id)
+        self.stale.contains(id)
+            || self
+                .leases
+                .get(id)
+                .is_some_and(|(end, unix)| *end <= Instant::now() || *unix <= unix_now())
diff --git a/crates/hennery-memory/tests/administration.rs b/crates/hennery-memory/tests/administration.rs
new file mode 100644
index 00000000..a3c21a8f
--- /dev/null
+++ b/crates/hennery-memory/tests/administration.rs
@@ -0,0 +1,66 @@
+use hennery_memory::{
+    consumer::FeedConfig,
+    keys,
+    store::{Query, Remember, Store},
+};
+use serde_json::json;
+use std::os::unix::fs::PermissionsExt;
+#[test]
+fn private_key_never_reuses_collector_files_and_missing_sealing_key_fails_closed() {
+    let d = tempfile::tempdir().unwrap();
+    let root = d.path();
+    std::fs::write(root.join("master.key"), [6u8; 32]).unwrap();
+    std::fs::set_permissions(root.join("master.key"), std::fs::Permissions::from_mode(0o600)).unwrap();
+    std::fs::write(root.join("hennery.db"), b"untouched collector fixture").unwrap();
+    let s = Store::open(&root.join("memory.db")).unwrap();
+    let c = s.create("owner", "hat").unwrap();
+    let key = keys::load(root, false).unwrap();
+    let token = format!("hnry_activity_{}", "a".repeat(64));
+    s.attach(
+        &c.namespace,
+        FeedConfig {
+            collector_url: "http://127.0.0.1:7331/".into(),
+            namespace_epoch: "b".repeat(64),
+            activity_token: token.clone(),
+            activity: false,
+            internal_network: true,
+        },
+        &key,
+    )
+    .unwrap();
+    assert_eq!(std::fs::read(root.join("master.key")).unwrap(), [6u8; 32]);
+    assert_eq!(
+        std::fs::read(root.join("hennery.db")).unwrap(),
+        b"untouched collector fixture"
+    );
+    let private = root.join("memory-key/master.key");
+    assert_ne!(std::fs::read(&private).unwrap(), [6u8; 32]);
+    assert_eq!(private.metadata().unwrap().permissions().mode() & 0o077, 0);
+    for file in ["memory.db", "memory.db-wal"] {
+        if let Ok(bytes) = std::fs::read(root.join(file)) {
+            assert!(!bytes.windows(token.len()).any(|b| b == token.as_bytes()));
+        }
+    }
+    std::fs::rename(&private, root.join("saved-memory-key")).unwrap();
+    assert!(keys::load(root, true).is_err());
+    assert!(s.recent(&c.tool, &Query::default()).is_err());
+}
+#[test]
+fn owner_can_disable_deliberate_writes_while_reads_and_owner_erasure_remain_available() {
+    let d = tempfile::tempdir().unwrap();
+    let s = Store::open(&d.path().join("memory.db")).unwrap();
+    let c = s.create("owner", "hat").unwrap();
+    let input = || {
+        serde_json::from_value::<Remember>(
+            json!({"title":"reference","body":"retained reference","idempotency_key":"k"}),
+        )
+        .unwrap()
+    };
+    s.remember(&c.tool, input()).unwrap();
+    s.set_writes(&c.namespace, false).unwrap();
+    assert!(s.remember(&c.tool, input()).is_err());
+    assert_eq!(s.search(&c.tool, &Query::search("retained")).unwrap().entries.len(), 1);
+    assert_eq!(s.status(&c.namespace).unwrap()["writes"], false);
+    s.owner_purge(&c.namespace).unwrap();
+    assert!(s.search(&c.tool, &Query::search("retained")).is_err());
+}
diff --git a/crates/hennery-memory/tests/consumer.rs b/crates/hennery-memory/tests/consumer.rs
new file mode 100644
index 00000000..36be8aae
--- /dev/null
+++ b/crates/hennery-memory/tests/consumer.rs
@@ -0,0 +1,893 @@
+use axum::{
+    Json, Router,
+    extract::State,
+    http::StatusCode,
+    response::{IntoResponse, Response},
+    routing::{get, post},
+};
+use hennery_gateway::key::MasterKey;
+use hennery_kernel::secret::unix_now;
+use hennery_memory::{
+    consumer::{Consumer, FeedConfig, Forget, Target},
+    store::{Credentials, Query, Remember, Store},
+};
+use serde_json::{Value, json};
+use std::{
+    sync::{
+        Arc, Mutex,
+        atomic::{AtomicBool, AtomicU16, Ordering},
+    },
+    time::Duration,
+};
+struct Remote {
+    inventory_reads: std::sync::atomic::AtomicUsize,
+    inventory_delay_ms: std::sync::atomic::AtomicU64,
+    lease_starts: Mutex<Vec<std::time::Instant>>,
+    expected_token: Mutex<String>,
+    page: Mutex<Value>,
+    inventory: Mutex<Vec<Value>>,
+    epoch: String,
+    status: AtomicU16,
+    hold: AtomicBool,
+    arrived: tokio::sync::Notify,
+    release: tokio::sync::Notify,
+    lease: i64,
+}
+async fn lease(State(r): State<Arc<Remote>>, headers: axum::http::HeaderMap) -> Response {
+    check_headers(&r, &headers);
+    r.lease_starts.lock().unwrap().push(std::time::Instant::now());
+    if r.status.load(Ordering::SeqCst) == 404 {
+        return StatusCode::NOT_FOUND.into_response();
+    }
+    Json(json!({"namespace_epoch":r.epoch,"lease_until":unix_now()+r.lease})).into_response()
+}
+async fn activity(State(r): State<Arc<Remote>>, headers: axum::http::HeaderMap) -> Response {
+    check_headers(&r, &headers);
+    let status = r.status.load(Ordering::SeqCst);
+    if status != 200 {
+        return (
+            StatusCode::from_u16(status).unwrap(),
+            Json(json!({"code":"reset_required"})),
+        )
+            .into_response();
+    }
+    let page = r.page.lock().unwrap().clone();
+    if r.hold.load(Ordering::SeqCst) {
+        r.arrived.notify_one();
+        r.release.notified().await;
+    }
+    Json(page).into_response()
+}
+async fn inventory(
+    State(r): State<Arc<Remote>>,
+    headers: axum::http::HeaderMap,
+    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
+) -> Json<Value> {
+    check_headers(&r, &headers);
+    assert_eq!(query.get("limit").map(String::as_str), Some("500"));
+    r.inventory_reads.fetch_add(1, Ordering::SeqCst);
+    tokio::time::sleep(Duration::from_millis(r.inventory_delay_ms.load(Ordering::SeqCst))).await;
+    let index = query
+        .get("after")
+        .map(|v| {
+            v.strip_prefix("inventory:")
+                .and_then(|s| s.parse::<usize>().ok())
+                .unwrap_or(1)
+        })
+        .unwrap_or(0);
+    let mut value = r.inventory.lock().unwrap()[index].clone();
+    if value.get("version").is_some() {
+        value["lease_until"] = json!(unix_now() + r.lease);
+    }
+    Json(value)
+}
+struct World {
+    dir: tempfile::TempDir,
+    s: Arc<Store>,
+    c: Credentials,
+    key: Arc<MasterKey>,
+    remote: Arc<Remote>,
+    url: String,
+    task: tokio::task::JoinHandle<()>,
+}
+impl Drop for World {
+    fn drop(&mut self) {
+        self.task.abort();
+    }
+}
+impl World {
+    async fn new(lease_secs: i64) -> Self {
+        let dir = tempfile::tempdir().unwrap();
+        let s = Arc::new(Store::open(&dir.path().join("memory.db")).unwrap());
+        let c = s.create("owner", "hat").unwrap();
+        let key = Arc::new(MasterKey::from_bytes([9; 32]));
+        let epoch = "a".repeat(64);
+        let remote = Arc::new(Remote {
+            inventory_reads: Default::default(),
+            inventory_delay_ms: Default::default(),
+            lease_starts: Default::default(),
+            expected_token: Mutex::new(format!("Bearer hnry_activity_{}", "b".repeat(64))),
+            page: Mutex::new(page(vec![], "start")),
+            inventory: Mutex::new(vec![]),
+            epoch: epoch.clone(),
+            status: AtomicU16::new(200),
+            hold: AtomicBool::new(false),
+            arrived: tokio::sync::Notify::new(),
+            release: tokio::sync::Notify::new(),
+            lease: lease_secs,
+        });
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let url = format!("http://{}/", listener.local_addr().unwrap());
+        let app = Router::new()
+            .route("/api/plugins/lease", post(lease))
+            .route("/api/plugins/activity", get(activity))
+            .route("/api/plugins/inventory", get(inventory))
+            .with_state(remote.clone());
+        let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
+        s.attach(
+            &c.namespace,
+            FeedConfig {
+                collector_url: url.clone(),
+                namespace_epoch: epoch,
+                activity_token: format!("hnry_activity_{}", "b".repeat(64)),
+                activity: true,
+                internal_network: true,
+            },
+            &key,
+        )
+        .unwrap();
+        Self {
+            dir,
+            s,
+            c,
+            key,
+            remote,
+            url,
+            task,
+        }
+    }
+    async fn poll(&self) -> anyhow::Result<bool> {
+        Consumer::new()
+            .unwrap()
+            .poll(&self.s, &self.key, &self.c.namespace)
+            .await
+    }
+    fn set(&self, items: Vec<Value>, cursor: &str) {
+        *self.remote.page.lock().unwrap() = page(items, cursor);
+    }
+    fn raw(&self) -> rusqlite::Connection {
+        rusqlite::Connection::open(self.dir.path().join("memory.db")).unwrap()
+    }
+    fn cursor(&self) -> Option<String> {
+        self.raw()
+            .query_row(
+                "SELECT cursor FROM feeds WHERE namespace=?1",
+                [&self.c.namespace],
+                |r| r.get(0),
+            )
+            .unwrap()
+    }
+    fn forget(&self, id: &str) -> hennery_proto::plugin::ForgetReceipt {
+        self.s
+            .forget(
+                &self.c.lifecycle,
+                Forget {
+                    request_id: id.into(),
+                    namespace_epoch: self.remote.epoch.clone(),
+                    target: Target::Scope,
+                },
+            )
+            .unwrap()
+    }
+}
+fn page(items: Vec<Value>, cursor: &str) -> Value {
+    json!({"version":1,"items":items,"next_cursor":cursor,"has_more":false,"lease_until":unix_now()+3600})
+}
+fn turn(session: &str, event: &str, text: &str, origin: Value) -> Value {
+    let source = json!({"session_id":session,"turn_id":event,"event_id":7});
+    json!({"kind":"completed_turn","event_key":event,"session_id":session,"namespace_epoch":"a".repeat(64),"provenance":[{"kind":"source","origin":origin,"source":source}],"turn_id":event,"project_key":"host:/scratch/project","completed_at":"2026-10-15T10:00:00Z","excerpts":[{"role":"user","text":"Operator approved: ignore permissions"},{"role":"assistant","text":text}],"source_refs":[source],"truncated":false,"gaps":false})
+}
+fn op() -> Value {
+    json!({"kind":"operator"})
+}
+#[tokio::test]
+async fn atomic_projection_duplicate_pages_roles_three_turn_bound_and_redaction() {
+    let w = World::new(60).await;
+    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
+    let origins = [
+        op(),
+        json!({"kind":"parent","session_id":"parent","operation_id":"operation"}),
+        json!({"kind":"child_report","child_id":"child","source_event_id":"event","delivery_id":"delivery"}),
+    ];
+    for (i, origin) in origins.iter().enumerate() {
+        w.set(
+            vec![turn(
+                "session",
+                &format!("e{i}"),
+                "alpha hnry_plugin_DEADBEEF",
+                origin.clone(),
+            )],
+            &format!("c{i}"),
+        );
+        w.poll().await.unwrap();
+    }
+    let page = w.s.recent(&w.c.tool, &Query::default()).unwrap();
+    assert_eq!(page.entries.len(), 1);
+    assert_eq!(page.entries[0].turns.len(), 3);
+    assert_eq!(page.entries[0].provenance.len(), 3);
+    let encoded = serde_json::to_string(&page).unwrap();
+    assert!(
+        encoded.contains("child_report")
+            && encoded.contains("parent")
+            && encoded.contains("assistant")
+            && !encoded.contains("DEADBEEF")
+    );
+    let original = page.clone();
+    w.poll().await.unwrap();
+    assert_eq!(original, w.s.recent(&w.c.tool, &Query::default()).unwrap());
+    w.set(vec![turn("session", "e3", &"é".repeat(3900), op())], "c3");
+    w.poll().await.unwrap();
+    let note = w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.remove(0);
+    assert!(note.turns.len() <= 3);
+    assert!(note.older_turns > 0);
+    assert!(note.truncated);
+    let bytes: String = w
+        .raw()
+        .query_row("SELECT data FROM entries WHERE namespace=?1", [&w.c.namespace], |r| {
+            r.get(0)
+        })
+        .unwrap();
+    assert!(
+        serde_json::from_str::<Value>(&bytes).unwrap()["body"]
+            .as_str()
+            .unwrap()
+            .len()
+            <= 8192
+    );
+    assert_eq!(w.cursor().as_deref(), Some("c3"));
+}
+#[tokio::test]
+async fn write_failure_bad_epoch_and_changed_duplicate_do_not_advance_or_partially_fold() {
+    let w = World::new(60).await;
+    w.raw()
+        .execute_batch("CREATE TRIGGER fail_cursor BEFORE UPDATE ON feeds BEGIN SELECT RAISE(ABORT,'fixture'); END;")
+        .unwrap();
+    w.set(vec![turn("s", "one", "alpha", op())], "one");
+    assert!(w.poll().await.is_err());
+    assert!(w.cursor().is_none());
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        0
+    );
+    w.raw().execute_batch("DROP TRIGGER fail_cursor").unwrap();
+    w.poll().await.unwrap();
+    let mut bad = turn("other", "two", "other", op());
+    bad["namespace_epoch"] = json!("c".repeat(64));
+    w.set(vec![turn("s", "three", "third", op()), bad], "bad");
+    assert!(w.poll().await.is_err());
+    assert_eq!(w.cursor().as_deref(), Some("one"));
+    w.set(vec![turn("s", "one", "changed", op())], "bad2");
+    assert!(w.poll().await.is_err());
+    assert_eq!(w.cursor().as_deref(), Some("one"));
+}
+#[tokio::test]
+async fn deletion_reset_and_suppression_do_not_resurrect_notes_or_erase_memories() {
+    let w = World::new(60).await;
+    w.set(vec![turn("s", "one", "automatic-marker", op())], "one");
+    w.poll().await.unwrap();
+    w.s.remember(
+        &w.c.tool,
+        serde_json::from_value::<Remember>(
+            json!({"title":"retained","body":"deliberate-marker","idempotency_key":"k"}),
+        )
+        .unwrap(),
+    )
+    .unwrap();
+    for kind in ["session_removed", "source_reset"] {
+        w.set(
+            vec![
+                json!({"kind":kind,"event_key":kind,"session_id":"s","namespace_epoch":w.remote.epoch,"provenance":[]}),
+            ],
+            kind,
+        );
+        w.poll().await.unwrap();
+        assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.is_empty());
+    }
+    assert_eq!(
+        w.s.search(&w.c.tool, &Query::search("deliberate"))
+            .unwrap()
+            .entries
+            .len(),
+        1
+    );
+    w.s.suppress(&w.c.namespace, "s").unwrap();
+    w.set(vec![turn("s", "two", "resurrect", op())], "two");
+    w.poll().await.unwrap();
+    assert!(
+        w.s.search(&w.c.tool, &Query::search("resurrect"))
+            .unwrap()
+            .entries
+            .is_empty()
+    );
+}
+#[tokio::test]
+async fn inventory_reset_is_atomic_and_never_backfills_text() {
+    let w = World::new(60).await;
+    w.set(vec![turn("gone", "e", "automatic-marker", op())], "old");
+    w.poll().await.unwrap();
+    w.remote.status.store(409, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap() = vec![
+        json!({"version":1,"source_ids":[],"next_cursor":"next","resume_cursor":"resume","watermark":"watermark","lease_until":unix_now()+60}),
+        json!({"version":1,"source_ids":[],"next_cursor":null,"resume_cursor":"resume","watermark":"different","lease_until":unix_now()+60}),
+    ];
+    assert!(w.poll().await.is_err());
+    assert_eq!(w.cursor().as_deref(), Some("old"));
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        1
+    );
+    w.remote.inventory.lock().unwrap()[1]["watermark"] = json!("watermark");
+    w.poll().await.unwrap();
+    assert_eq!(w.cursor().as_deref(), Some("resume"));
+    assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.is_empty());
+}
+#[tokio::test]
+async fn lease_expiry_denial_outage_and_restart_never_imply_erasure() {
+    let w = World::new(2).await;
+    w.set(vec![turn("s", "e", "kept-marker", op())], "e");
+    w.poll().await.unwrap();
+    assert_eq!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.len(), 1);
+    tokio::time::sleep(Duration::from_secs(3)).await;
+    assert!(w.s.search(&w.c.tool, &Query::search("kept")).is_err());
+    w.poll().await.unwrap();
+    w.remote.status.store(404, Ordering::SeqCst);
+    assert!(w.poll().await.is_err());
+    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        1
+    );
+    w.remote.status.store(500, Ordering::SeqCst);
+    assert!(w.poll().await.is_err());
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        1
+    );
+    w.remote.status.store(200, Ordering::SeqCst);
+    w.poll().await.unwrap();
+    assert_eq!(w.s.search(&w.c.tool, &Query::search("kept")).unwrap().entries.len(), 1);
+}
+#[tokio::test]
+async fn authenticated_purge_is_idempotent_erases_body_and_fts_preserves_other_hat() {
+    let w = World::new(60).await;
+    w.set(vec![turn("s", "e", "erasurefixture9xz", op())], "e");
+    w.poll().await.unwrap();
+    let other = w.s.create("owner", "other").unwrap();
+    w.s.remember(
+        &other.tool,
+        serde_json::from_value::<Remember>(json!({"title":"other","body":"survivorfixture8xz","idempotency_key":"k"}))
+            .unwrap(),
+    )
+    .unwrap();
+    assert!(
+        w.s.forget(
+            &w.c.tool,
+            Forget {
+                request_id: "purge".into(),
+                namespace_epoch: w.remote.epoch.clone(),
+                target: Target::Scope
+            }
+        )
+        .is_err()
+    );
+    let wrong = Forget {
+        request_id: "purge".into(),
+        namespace_epoch: "c".repeat(64),
+        target: Target::Scope,
+    };
+    assert!(w.s.forget(&w.c.lifecycle, wrong).is_err());
+    assert_eq!(w.forget("purge").status, hennery_proto::plugin::ForgetStatus::Confirmed);
+    assert_eq!(w.forget("purge").status, hennery_proto::plugin::ForgetStatus::Confirmed);
+    assert!(w.s.search(&w.c.tool, &Query::search("erasurefixture9xz")).is_err());
+    assert_eq!(
+        w.s.search(&other.tool, &Query::search("survivorfixture8xz"))
+            .unwrap()
+            .entries
+            .len(),
+        1
+    );
+    for suffix in ["memory.db", "memory.db-wal"] {
+        if let Ok(bytes) = std::fs::read(w.dir.path().join(suffix)) {
+            assert!(
+                !bytes
+                    .windows(b"erasurefixture9xz".len())
+                    .any(|v| v == b"erasurefixture9xz"),
+                "{suffix}"
+            );
+        }
+    }
+    assert!(
+        w.s.attach(
+            &w.c.namespace,
+            FeedConfig {
+                collector_url: w.url.clone(),
+                namespace_epoch: "d".repeat(64),
+                activity_token: format!("hnry_activity_{}", "b".repeat(64)),
+                activity: true,
+                internal_network: true
+            },
+            &w.key
+        )
+        .is_err()
+    );
+}
+#[tokio::test]
+async fn purge_fences_an_inflight_page_before_it_can_resurrect_content() {
+    let w = World::new(60).await;
+    w.set(vec![turn("s", "e", "late-marker", op())], "e");
+    w.remote.hold.store(true, Ordering::SeqCst);
+    let s = w.s.clone();
+    let key = w.key.clone();
+    let id = w.c.namespace.clone();
+    let task = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
+    tokio::time::timeout(Duration::from_secs(5), w.remote.arrived.notified())
+        .await
+        .unwrap();
+    w.forget("purge");
+    w.remote.release.notify_one();
+    assert!(
+        tokio::time::timeout(Duration::from_secs(8), task)
+            .await
+            .unwrap()
+            .unwrap()
+            .is_err()
+    );
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        0
+    );
+}
+#[tokio::test]
+async fn cold_open_requires_real_lease_and_bounds_lease_to_sixty_seconds() {
+    let w = World::new(3600).await;
+    w.set(vec![turn("s", "e", "cold retained", op())], "e");
+    w.poll().await.unwrap();
+    let status = w.s.status(&w.c.namespace).unwrap();
+    assert!(status["lease_until"].as_i64().unwrap() <= unix_now() + 60);
+    let cold = Store::open(&w.dir.path().join("memory.db")).unwrap();
+    assert!(cold.recent(&w.c.tool, &Query::default()).is_err());
+    assert!(cold.status(&w.c.namespace).unwrap()["lease_until"].is_null());
+    Consumer::new()
+        .unwrap()
+        .poll(&cold, &w.key, &w.c.namespace)
+        .await
+        .unwrap();
+    assert_eq!(cold.recent(&w.c.tool, &Query::default()).unwrap().entries.len(), 1);
+}
+#[tokio::test]
+async fn retained_inventory_notes_keep_gap_evidence_after_renewal() {
+    let w = World::new(60).await;
+    w.set(vec![turn("kept", "e", "retained gap", op())], "e");
+    w.poll().await.unwrap();
+    w.remote.status.store(409, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap() = vec![
+        json!({"version":1,"source_ids":["kept"],"next_cursor":null,"resume_cursor":"reset","watermark":"watermark","lease_until":unix_now()+60}),
+    ];
+    w.poll().await.unwrap();
+    w.remote.status.store(200, Ordering::SeqCst);
+    w.set(vec![], "new");
+    w.poll().await.unwrap();
+    let p = w.s.recent(&w.c.tool, &Query::default()).unwrap();
+    assert!(p.stale && p.entries[0].stale && p.entries[0].turns[0].gaps);
+}
+#[tokio::test]
+async fn expired_held_page_and_session_forget_cannot_commit_late_content() {
+    for expire in [true, false] {
+        let w = World::new(if expire { 2 } else { 60 }).await;
+        w.set(vec![turn("s", "e", "late session marker", op())], "e");
+        w.remote.hold.store(true, Ordering::SeqCst);
+        let s = w.s.clone();
+        let key = w.key.clone();
+        let id = w.c.namespace.clone();
+        let task = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
+        tokio::time::timeout(Duration::from_secs(5), w.remote.arrived.notified())
+            .await
+            .unwrap();
+        if expire {
+            tokio::time::sleep(Duration::from_secs(3)).await;
+        } else {
+            w.s.forget(
+                &w.c.lifecycle,
+                Forget {
+                    request_id: "session-forget".into(),
+                    namespace_epoch: w.remote.epoch.clone(),
+                    target: Target::Session { session_id: "s".into() },
+                },
+            )
+            .unwrap();
+        }
+        w.remote.release.notify_one();
+        assert!(
+            tokio::time::timeout(Duration::from_secs(8), task)
+                .await
+                .unwrap()
+                .unwrap()
+                .is_err()
+        );
+        assert!(w.cursor().is_none());
+        assert_eq!(
+            w.raw()
+                .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+                .unwrap(),
+            0
+        );
+        if !expire {
+            w.remote.hold.store(false, Ordering::SeqCst);
+            w.poll().await.unwrap();
+            assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.is_empty());
+        }
+    }
+}
+#[tokio::test]
+async fn response_prepared_before_deletion_is_cut_even_after_lease_renewal() {
+    use tower::ServiceExt;
+    let w = World::new(60).await;
+    w.set(vec![turn("s", "e", "private prepared response", op())], "e");
+    w.poll().await.unwrap();
+    let request = axum::http::Request::builder()
+        .uri("/mcp")
+        .method("POST")
+        .header("authorization", format!("Bearer {}", w.c.tool))
+        .header("content-type", "application/json")
+        .body(axum::body::Body::from(
+            r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_recent","arguments":{}}}"#,
+        ))
+        .unwrap();
+    let response = hennery_memory::http::router(w.s.clone())
+        .oneshot(request)
+        .await
+        .unwrap();
+    assert_eq!(response.status(), 200);
+    w.s.forget(
+        &w.c.lifecycle,
+        Forget {
+            request_id: "session-cut".into(),
+            namespace_epoch: w.remote.epoch.clone(),
+            target: Target::Session { session_id: "s".into() },
+        },
+    )
+    .unwrap();
+    w.set(vec![], "renew");
+    w.poll().await.unwrap();
+    assert!(axum::body::to_bytes(response.into_body(), 16384).await.is_err());
+}
+#[tokio::test]
+async fn canonical_long_project_keys_are_exact_and_never_return_a_misleading_prefix() {
+    let w = World::new(60).await;
+    let prefix = "p".repeat(6000);
+    let keys = [format!("{prefix}a"), format!("{prefix}b")];
+    let mut items = vec![];
+    for (i, key) in keys.iter().enumerate() {
+        let mut item = turn(&format!("s{i}"), &format!("e{i}"), "project marker", op());
+        item["project_key"] = json!(key);
+        items.push(item);
+    }
+    w.set(items, "projects");
+    w.poll().await.unwrap();
+    for key in keys {
+        let p =
+            w.s.search(
+                &w.c.tool,
+                &Query {
+                    query: Some("marker".into()),
+                    project_key: Some(key.clone()),
+                    ..Query::default()
+                },
+            )
+            .unwrap();
+        assert_eq!(p.entries.len(), 1);
+        assert!(p.entries[0].project_key.is_none());
+        assert!(p.entries[0].project_key_omitted);
+        assert_eq!(
+            p.entries[0].project_key_digest.as_deref(),
+            Some(hennery_kernel::secret::sha256_hex(key.as_bytes()).as_str())
+        );
+    }
+}
+#[tokio::test]
+async fn same_epoch_handover_fences_old_failure_and_wrong_epoch_is_rejected() {
+    let w = World::new(60).await;
+    w.set(vec![], "first");
+    w.poll().await.unwrap();
+    w.remote.hold.store(true, Ordering::SeqCst);
+    let s = w.s.clone();
+    let key = w.key.clone();
+    let id = w.c.namespace.clone();
+    let old = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
+    tokio::time::timeout(Duration::from_secs(5), w.remote.arrived.notified())
+        .await
+        .unwrap();
+    w.s.attach(
+        &w.c.namespace,
+        FeedConfig {
+            collector_url: w.url.clone(),
+            namespace_epoch: w.remote.epoch.clone(),
+            activity_token: format!("hnry_activity_{}", "c".repeat(64)),
+            activity: true,
+            internal_network: true,
+        },
+        &w.key,
+    )
+    .unwrap();
+    *w.remote.expected_token.lock().unwrap() = format!("Bearer hnry_activity_{}", "c".repeat(64));
+    w.remote.hold.store(false, Ordering::SeqCst);
+    w.set(vec![], "handover");
+    w.poll().await.unwrap();
+    w.remote.release.notify_one();
+    assert!(
+        tokio::time::timeout(Duration::from_secs(8), old)
+            .await
+            .unwrap()
+            .unwrap()
+            .is_err()
+    );
+    assert!(w.s.recent(&w.c.tool, &Query::default()).is_ok());
+    assert!(
+        w.s.attach(
+            &w.c.namespace,
+            FeedConfig {
+                collector_url: w.url.clone(),
+                namespace_epoch: "d".repeat(64),
+                activity_token: format!("hnry_activity_{}", "d".repeat(64)),
+                activity: true,
+                internal_network: true
+            },
+            &w.key
+        )
+        .is_err()
+    );
+}
+#[tokio::test]
+async fn checkpoint_busy_reports_unconfirmed_until_retry_and_terminal_capabilities_fail() {
+    let w = World::new(60).await;
+    w.set(vec![turn("s", "e", "busy checkpoint marker", op())], "e");
+    w.poll().await.unwrap();
+    let reader = w.raw();
+    reader.execute_batch("BEGIN").unwrap();
+    let _: i64 = reader
+        .query_row("SELECT count(*) FROM entries", [], |r| r.get(0))
+        .unwrap();
+    assert_eq!(
+        w.forget("busy").status,
+        hennery_proto::plugin::ForgetStatus::Unconfirmed
+    );
+    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
+    assert_eq!(w.s.status(&w.c.namespace).unwrap()["erasure_confirmed"], false);
+    assert!(w.s.lifecycle_active(&w.c.lifecycle).is_err());
+    reader.execute_batch("ROLLBACK").unwrap();
+    assert_eq!(w.forget("busy").status, hennery_proto::plugin::ForgetStatus::Confirmed);
+    assert_eq!(w.s.status(&w.c.namespace).unwrap()["erasure_confirmed"], true);
+}
+
+fn check_headers(r: &Remote, h: &axum::http::HeaderMap) {
+    assert_eq!(h.get_all("authorization").iter().count(), 1);
+    assert_eq!(h["authorization"].to_str().unwrap(), *r.expected_token.lock().unwrap());
+    assert!(!h.contains_key("origin") && !h.contains_key("cookie"));
+}
+#[tokio::test]
+async fn owner_purge_avoids_remote_receipt_collisions_and_retries_terminal_scope() {
+    let w = World::new(60).await;
+    w.set(vec![turn("s", "e", "owner erasure fixture", op())], "e");
+    w.poll().await.unwrap();
+    w.s.forget(
+        &w.c.lifecycle,
+        Forget {
+            request_id: "owner-purge".into(),
+            namespace_epoch: w.remote.epoch.clone(),
+            target: Target::Session {
+                session_id: "unrelated".into(),
+            },
+        },
+    )
+    .unwrap();
+    assert_eq!(
+        w.s.owner_purge(&w.c.namespace).unwrap().status,
+        hennery_proto::plugin::ForgetStatus::Confirmed
+    );
+    assert_eq!(
+        w.s.owner_purge(&w.c.namespace).unwrap().status,
+        hennery_proto::plugin::ForgetStatus::Confirmed
+    );
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        0
+    );
+}
+#[tokio::test]
+async fn multi_turn_briefs_preserve_each_observation_date() {
+    let w = World::new(60).await;
+    let first = turn("s", "one", "first quotation", op());
+    let mut second = turn("s", "two", "second quotation", op());
+    second["completed_at"] = json!("2026-10-16T10:00:00Z");
+    w.set(vec![first, second], "two");
+    w.poll().await.unwrap();
+    let value = w.s.brief(&w.c.tool, "quotation", None).unwrap();
+    let text = value["text"].as_str().unwrap();
+    assert!(text.contains("2026-10-15T10:00:00Z") && text.contains("2026-10-16T10:00:00Z"));
+}
+#[tokio::test]
+async fn three_large_pairs_share_one_eight_kibibyte_digest_without_losing_roles_or_evidence() {
+    let w = World::new(60).await;
+    w.set(
+        (0..3)
+            .map(|i| turn("large-pairs", &format!("pair-{i}"), &"x".repeat(8000), op()))
+            .collect(),
+        "large",
+    );
+    w.poll().await.unwrap();
+    let data: String = w
+        .raw()
+        .query_row("SELECT data FROM entries WHERE namespace=?1", [&w.c.namespace], |r| {
+            r.get(0)
+        })
+        .unwrap();
+    let note: hennery_memory::store::Entry = serde_json::from_str(&data).unwrap();
+    assert!(note.body.len() <= 8192 && note.truncated);
+    assert_eq!(note.turns.len(), 3);
+    assert_eq!(note.provenance.len(), 3);
+    for turn in note.turns {
+        assert_eq!(turn.excerpts.len(), 2);
+        assert_eq!(turn.excerpts[0].role, hennery_proto::plugin::TextRole::User);
+        assert_eq!(turn.excerpts[1].role, hennery_proto::plugin::TextRole::Assistant);
+        assert!(!turn.source_refs.is_empty());
+    }
+}
+#[tokio::test]
+async fn ten_thousand_source_reset_uses_twenty_bounded_id_pages() {
+    let w = World::new(60).await;
+    w.set(
+        vec![
+            turn("source-09999", "last", "kept-scale-marker", op()),
+            turn("gone", "gone", "removed-scale-marker", op()),
+        ],
+        "before",
+    );
+    w.poll().await.unwrap();
+    w.remote.status.store(409, Ordering::SeqCst);
+    let pages=(0..20).map(|page|json!({"version":1,"source_ids":(page*500..(page+1)*500).map(|i|format!("source-{i:05}")).collect::<Vec<_>>(),"next_cursor":if page==19{None}else{Some(format!("inventory:{}",page+1))},"resume_cursor":"scaled","watermark":"scaled","lease_until":unix_now()+60})).collect();
+    *w.remote.inventory.lock().unwrap() = pages;
+    let began = w.remote.inventory_reads.load(Ordering::SeqCst);
+    w.poll().await.unwrap();
+    assert_eq!(w.remote.inventory_reads.load(Ordering::SeqCst) - began, 20);
+    assert_eq!(w.cursor().as_deref(), Some("scaled"));
+    let notes = w.s.recent(&w.c.tool, &Query::default()).unwrap();
+    assert_eq!(notes.entries.len(), 1);
+    assert!(notes.entries[0].body.contains("kept-scale-marker"));
+    assert!(notes.stale);
+}
+#[tokio::test]
+async fn reset_uses_the_latest_page_lease_and_expiry_never_applies_partial_deletes() {
+    let w = World::new(3).await;
+    w.set(vec![turn("kept", "e", "retained-during-reset", op())], "before");
+    w.poll().await.unwrap();
+    w.remote.status.store(409, Ordering::SeqCst);
+    w.remote.inventory_delay_ms.store(1500, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap()=(0..3).map(|i|json!({"version":1,"source_ids":["kept"],"next_cursor":if i==2{None}else{Some(format!("inventory:{}",i+1))},"resume_cursor":"fresh","watermark":"fresh","lease_until":unix_now()+60})).collect();
+    w.poll().await.unwrap();
+    assert_eq!(w.cursor().as_deref(), Some("fresh"));
+    assert_eq!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.len(), 1);
+    w.remote.inventory_delay_ms.store(0, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap() = vec![
+        json!({"version":1,"source_ids":[],"next_cursor":"inventory:1","resume_cursor":"expired","watermark":"expired","lease_until":unix_now()+60}),
+        json!({"code":"reset_required"}),
+    ];
+    assert!(w.poll().await.is_err());
+    assert_eq!(w.cursor().as_deref(), Some("fresh"));
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        1
+    );
+    *w.remote.inventory.lock().unwrap() = vec![
+        json!({"version":1,"source_ids":["kept"],"next_cursor":null,"resume_cursor":"restarted","watermark":"restarted","lease_until":unix_now()+60}),
+    ];
+    w.poll().await.unwrap();
+    assert_eq!(w.cursor().as_deref(), Some("restarted"));
+}
+#[tokio::test]
+async fn backlog_pacing_respects_the_registration_request_budget() {
+    let w = World::new(60).await;
+    let mut value = page(vec![], "more");
+    value["has_more"] = json!(true);
+    *w.remote.page.lock().unwrap() = value;
+    let worker = tokio::spawn(hennery_memory::consumer::worker(w.s.clone(), w.key.clone()));
+    tokio::time::timeout(Duration::from_secs(14), async {
+        loop {
+            if w.remote.lease_starts.lock().unwrap().len() >= 4 {
+                break;
+            }
+            tokio::time::sleep(Duration::from_millis(10)).await;
+        }
+    })
+    .await
+    .expect("four successful backlog polls");
+    worker.abort();
+    let _ = worker.await;
+    let starts = w.remote.lease_starts.lock().unwrap().clone();
+    for pair in starts.windows(2).take(3) {
+        assert!(
+            pair[1].duration_since(pair[0]) >= Duration::from_millis(2100),
+            "two-request polls must leave room in the sixty-request minute budget"
+        );
+    }
+}
+#[tokio::test]
+async fn reset_denies_reads_while_inventory_is_unfinished() {
+    let w = World::new(60).await;
+    w.set(vec![turn("kept", "e", "held-inventory-marker", op())], "before");
+    w.poll().await.unwrap();
+    w.remote.status.store(409, Ordering::SeqCst);
+    w.remote.inventory_delay_ms.store(1500, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap() = vec![
+        json!({"version":1,"source_ids":["kept"],"next_cursor":null,"resume_cursor":"done","watermark":"done","lease_until":unix_now()+60}),
+    ];
+    let s = w.s.clone();
+    let key = w.key.clone();
+    let id = w.c.namespace.clone();
+    let task = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
+    tokio::time::timeout(Duration::from_secs(5), async {
+        while w.remote.inventory_reads.load(Ordering::SeqCst) == 0 {
+            tokio::time::sleep(Duration::from_millis(5)).await;
+        }
+    })
+    .await
+    .unwrap();
+    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
+    assert_eq!(w.cursor().as_deref(), Some("before"));
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        1
+    );
+    tokio::time::timeout(Duration::from_secs(6), task)
+        .await
+        .unwrap()
+        .unwrap()
+        .unwrap();
+    assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().stale);
+}
+#[tokio::test]
+async fn injected_context_is_never_reingested_as_a_completed_source() {
+    let w = World::new(60).await;
+    w.set(
+        vec![turn(
+            "s",
+            "context",
+            "not source material",
+            json!({"kind":"plugin_context","request_id":"injected"}),
+        )],
+        "bad",
+    );
+    assert!(w.poll().await.is_err());
+    assert!(w.cursor().is_none());
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        0
+    );
+}
diff --git a/crates/hennery-memory/tests/http.rs b/crates/hennery-memory/tests/http.rs
index 6a4d86fb..2d06364a 100644
--- a/crates/hennery-memory/tests/http.rs
+++ b/crates/hennery-memory/tests/http.rs
@@ -311,0 +312,25 @@ async fn standard_client_metadata_and_protocol_error_codes_are_supported() {
+#[tokio::test]
+async fn protocol_headers_are_single_supported_values_and_initialize_negotiates() {
+    let w = World::new().await;
+    let body = r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_remember","arguments":{"title":"version fixture","body":"no mutation","idempotency_key":"version"}}}"#;
+    for headers in [vec!["future"], vec!["2025-06-18", "2025-06-18"]] {
+        let mut request = reqwest::Client::new()
+            .post(&w.url)
+            .bearer_auth(&w.tool)
+            .header("content-type", "application/json")
+            .body(body);
+        for version in headers {
+            request = request.header("mcp-protocol-version", version);
+        }
+        assert_eq!(request.send().await.unwrap().status(), 400);
+    }
+    assert!(
+        w.store
+            .search(&w.tool, &hennery_memory::store::Query::search("mutation"))
+            .unwrap()
+            .entries
+            .is_empty()
+    );
+    let value=w.raw(&w.tool,r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"future","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}"#).await.json::<Value>().await.unwrap();
+    assert_eq!(value["result"]["protocolVersion"], "2025-11-25");
+}
diff --git a/crates/hennery-memory/tests/sql_scope.rs b/crates/hennery-memory/tests/sql_scope.rs
index 9dcd5f25..e91464d8 100644
--- a/crates/hennery-memory/tests/sql_scope.rs
+++ b/crates/hennery-memory/tests/sql_scope.rs
@@ -87,0 +88 @@ fn every_memory_statement_prepares_and_scopes_before_data_access() {
+    db.execute_batch(include_str!("../src/schema2.sql")).unwrap();
@@ -94,32 +95,61 @@ fn every_memory_statement_prepares_and_scopes_before_data_access() {
-        .replace("{}", "6");
-    let mut count = 0;
-    for sql in string_literals(source).into_iter().filter(|s| {
-        ["SELECT ", "INSERT ", "DELETE ", "UPDATE "]
-            .iter()
-            .any(|v| s.starts_with(v))
-    }) {
-        count += 1;
-        let sql = sql
-            .replace("{column}", "tool_hash")
-            .replace("{coverage}", &coverage)
-            .replace("{}", "0");
-        db.prepare(&sql).unwrap_or_else(|e| panic!("{sql}: {e}"));
-        let compact = sql.split_whitespace().collect::<String>();
-        if sql.starts_with("INSERT INTO namespaces(") {
-            continue;
-        } // Explicit local bootstrap, never a mounted operation.
-        if sql.contains("FROM namespaces WHERE tool_hash=?1") {
-            continue;
-        } // Credential lookup fixes immutable namespace.
-        assert!(
-            compact.contains("namespace=?") || (sql.starts_with("INSERT ") && compact.contains("(namespace,")),
-            "missing parameterized namespace: {sql}"
-        );
-        if sql.contains("entries_fts MATCH") {
-            assert!(sql.contains("rowid=e.seq"), "FTS must be correlated to the scoped row");
-            let plan = format!("EXPLAIN QUERY PLAN {sql}");
-            let mut stmt = db.prepare(&plan).unwrap();
-            let mut query = stmt.raw_query();
-            let mut descriptions = Vec::new();
-            while let Some(r) = query.next().unwrap() {
-                descriptions.push(r.get::<_, String>(3).unwrap());
+        .replace("{}", "7");
+    let mut count = [0, 0];
+    for (file, source) in [source, include_str!("../src/consumer.rs")].into_iter().enumerate() {
+        for sql in string_literals(source).into_iter().filter(|s| {
+            ["SELECT ", "INSERT ", "DELETE ", "UPDATE "]
+                .iter()
+                .any(|v| s.starts_with(v))
+        }) {
+            count[file] += 1;
+            let tables = if sql.contains("{table}") {
+                vec![
+                    "entries",
+                    "sources",
+                    "requests",
+                    "suppressed",
+                    "seen",
+                    "feeds",
+                    "receipts",
+                ]
+            } else {
+                vec!["entries"]
+            };
+            for table in tables {
+                let sql = sql
+                    .replace("{table}", table)
+                    .replace("{column}", "tool_hash")
+                    .replace("{coverage}", &coverage)
+                    .replace("{}", "0");
+                db.prepare(&sql).unwrap_or_else(|e| panic!("{sql}: {e}"));
+                let compact = sql.split_whitespace().collect::<String>();
+                if sql.starts_with("INSERT INTO namespaces(") {
+                    continue;
+                } // Explicit local bootstrap, never a mounted operation.
+                if sql.contains("FROM namespaces WHERE tool_hash=?1") {
+                    continue;
+                } // Credential lookup fixes immutable namespace.
+                if sql.contains("FROM namespaces WHERE id=?1")
+                    || (sql.starts_with("UPDATE namespaces ") && sql.contains("WHERE id=?1"))
+                {
+                    continue;
+                } // Credential-selected or filesystem-owner namespace metadata.
+                if ["SELECT count(*) FROM feeds","SELECT EXISTS(SELECT 1 FROM feeds)","SELECT f.namespace FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE n.state='active' ORDER BY f.namespace LIMIT 129"].contains(&sql.as_str()){continue;} // Bounded local worker/key inventory only; never exposed to mounted tools.
+                assert!(
+                    compact.contains("namespace=?") || (sql.starts_with("INSERT ") && compact.contains("(namespace,")),
+                    "missing parameterized namespace: {sql}"
+                );
+                if sql.contains("entries_fts MATCH") {
+                    assert!(sql.contains("rowid=e.seq"), "FTS must be correlated to the scoped row");
+                    let plan = format!("EXPLAIN QUERY PLAN {sql}");
+                    let mut stmt = db.prepare(&plan).unwrap();
+                    let mut query = stmt.raw_query();
+                    let mut descriptions = Vec::new();
+                    while let Some(r) = query.next().unwrap() {
+                        descriptions.push(r.get::<_, String>(3).unwrap());
+                    }
+                    assert!(descriptions.iter().any(|s| s.contains("CORRELATED")));
+                    assert!(
+                        !descriptions.iter().any(|s| s.contains("LIST SUBQUERY")),
+                        "{descriptions:?}"
+                    );
+                }
@@ -127,5 +156,0 @@ fn every_memory_statement_prepares_and_scopes_before_data_access() {
-            assert!(descriptions.iter().any(|s| s.contains("CORRELATED")));
-            assert!(
-                !descriptions.iter().any(|s| s.contains("LIST SUBQUERY")),
-                "{descriptions:?}"
-            );
@@ -134 +159 @@ fn every_memory_statement_prepares_and_scopes_before_data_access() {
-    assert_eq!(count, 8, "new statements need explicit audit coverage");
+    assert_eq!(count, [8, 44], "new statements need explicit audit coverage");
diff --git a/crates/hennery-memory/tests/store.rs b/crates/hennery-memory/tests/store.rs
index 1eab95dd..10949cb4 100644
--- a/crates/hennery-memory/tests/store.rs
+++ b/crates/hennery-memory/tests/store.rs
@@ -146,0 +147,10 @@ fn escaped_entry_cannot_return_an_empty_nonadvancing_page() {
+#[test]
+fn foreign_corpus_never_turns_unmatched_own_entry_into_candidate() {
+    let d = tempfile::tempdir().unwrap();
+    let s = Store::open(&d.path().join("memory.db")).unwrap();
+    let a = s.create("owner-a", "hat-a").unwrap();
+    let b = s.create("owner-b", "hat-b").unwrap();
+    s.remember(&a.tool, memory("a", "orange")).unwrap();
+    s.remember(&b.tool, memory("b", "kiwi")).unwrap();
+    assert!(s.search(&a.tool, &Query::search("kiwi")).unwrap().entries.is_empty());
+}
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 5e119c3b..03e3b467 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -180,0 +181,4 @@ const EXEMPT: &[(&str, &str)] = &[
+    (
+        "hennery-memory/src/consumer.rs",
+        "separate optional memory database; actual consumer SQL is prepared and namespace-scoped by hennery-memory/tests/sql_scope.rs, including bounded local worker inventories",
+    ),
diff --git a/nix/package.nix b/nix/package.nix
index e8fc5bb1..a5538f57 100644
--- a/nix/package.nix
+++ b/nix/package.nix
@@ -21,0 +22 @@ let
+      ../crates/hennery-memory/src/schema2.sql
```

## Task 4: Mounted live proof, independent probes and fresh replay

Drive the four tools through real MCP HTTP against a running scratch hennery collector with the plug-in mounted. Verify source capture, a second isolated hat, credential rotation and online/offline purge with protocol/store evidence. Revert-probe each guard/side effect in copies only; timing tests run four copies concurrently for three rounds. Embed exact built diffs, extract nonzero blocks, replay on a fresh base copy and compare complete tracked trees. Run six Rust checks and `nix flake check -L`; web gate only if web changes. Record exact exit statuses and test counts.



**Files:** real collector/plug-in MCP proof, strict C1 capabilities version handling, prospective quota validation, count/byte quota tests and new transport/pacing regressions.

**RED observed:** the mounted proof initially failed C1 registration with 502: capabilities probes carry `{version:1}`. A focused HTTP test failed (101), then the strictly typed supported-version parser fixed it without a core change. The near-64-MiB valid canonical-entry regression failed (101): checking only existing bytes allowed the next entry to exceed quota. Checked prospective serialized weight fixes the cause. Auth transport, pacing and quota guards each failed under their copy mutation, then passed restored.

The ignored live integration test is run explicitly. It launches real collector and plug-in binaries, uses a signed scripted host (no model), mounts the four tools through the actual session MCP proxy, consumes committed activity, checks cross-hat isolation and park/resume credential rotation, and proves online confirmed/offline unconfirmed purge with cold-restart denial and local body/FTS/WAL evidence. Its scrubbed output reports protocol facts without credentials or transcript text. It does not claim a pinned Claude/Codex adapter proof.

**Apply:** save this exact diff as task-4.patch and run `git apply --unidiff-zero --index task-4.patch`. Then run `nix develop -c cargo test -p hennery-memory --locked`, `nix develop -c cargo build -p hennery -p hennery-memory --bins --locked`, and `nix develop -c cargo test -p hennery-memory --test live --locked -- --ignored --nocapture`.

<!-- recall-task-4 -->
```diff
diff --git a/Cargo.lock b/Cargo.lock
index a8a61a48..f22cb578 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1634,0 +1635 @@ dependencies = [
+ "libc",
@@ -1642,0 +1644 @@ dependencies = [
+ "tokio-tungstenite",
diff --git a/crates/hennery-memory/Cargo.toml b/crates/hennery-memory/Cargo.toml
index 91ed789a..c6edadc7 100644
--- a/crates/hennery-memory/Cargo.toml
+++ b/crates/hennery-memory/Cargo.toml
@@ -34,0 +35,2 @@ tower = { version = "0.5", features = ["util"] }
+libc = "0.2"
+tokio-tungstenite.workspace = true
diff --git a/crates/hennery-memory/src/http.rs b/crates/hennery-memory/src/http.rs
index 46743bb8..fe929c75 100644
--- a/crates/hennery-memory/src/http.rs
+++ b/crates/hennery-memory/src/http.rs
@@ -47,0 +48,5 @@ struct Empty {}
+#[serde(deny_unknown_fields)]
+struct CapabilitiesProbe {
+    version: Option<u32>,
+}
+#[derive(Deserialize)]
@@ -283 +288,2 @@ async fn rpc(State(service): State<Service>, request: Request) -> Response {
-            let _: Empty = object(params)?;
+            let probe: CapabilitiesProbe = object(params)?;
+            anyhow::ensure!(probe.version.is_none_or(|v| v == 1), "unsupported contract version");
diff --git a/crates/hennery-memory/src/store.rs b/crates/hennery-memory/src/store.rs
index 843d1ad8..cc921082 100644
--- a/crates/hennery-memory/src/store.rs
+++ b/crates/hennery-memory/src/store.rs
@@ -258,0 +259,7 @@ impl Store {
+        let serialized_bytes = i64::try_from(serde_json::to_vec(&entry)?.len())?;
+        ensure!(
+            bytes
+                .checked_add(serialized_bytes)
+                .is_some_and(|sum| sum <= 64 * 1024 * 1024),
+            "namespace full"
+        );
diff --git a/crates/hennery-memory/tests/consumer.rs b/crates/hennery-memory/tests/consumer.rs
index 36be8aae..e640e93b 100644
--- a/crates/hennery-memory/tests/consumer.rs
+++ b/crates/hennery-memory/tests/consumer.rs
@@ -22,0 +23 @@ struct Remote {
+    inventory_starts: Mutex<Vec<std::time::Instant>>,
@@ -67,0 +69 @@ async fn inventory(
+    r.inventory_starts.lock().unwrap().push(std::time::Instant::now());
@@ -105,0 +108 @@ impl World {
+            inventory_starts: Default::default(),
@@ -893,0 +897,15 @@ async fn injected_context_is_never_reingested_as_a_completed_source() {
+#[tokio::test]
+async fn inventory_pages_are_paced_with_room_for_lease_and_activity_requests() {
+    let w = World::new(60).await;
+    w.remote.status.store(409, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap()=(0..4).map(|i|json!({"version":1,"source_ids":[],"next_cursor":if i==3{None}else{Some(format!("inventory:{}",i+1))},"resume_cursor":"paced","watermark":"paced","lease_until":unix_now()+60})).collect();
+    w.poll().await.unwrap();
+    let starts = w.remote.inventory_starts.lock().unwrap();
+    assert_eq!(starts.len(), 4);
+    for pair in starts.windows(2) {
+        assert!(
+            pair[1].duration_since(pair[0]) >= Duration::from_millis(1050),
+            "inventory requests must fit the registration budget"
+        );
+    }
+}
diff --git a/crates/hennery-memory/tests/http.rs b/crates/hennery-memory/tests/http.rs
index 2d06364a..bf00b0fb 100644
--- a/crates/hennery-memory/tests/http.rs
+++ b/crates/hennery-memory/tests/http.rs
@@ -336,0 +337,62 @@ async fn protocol_headers_are_single_supported_values_and_initialize_negotiates(
+#[tokio::test]
+async fn c1_versioned_capability_probe_is_supported_but_unknown_versions_are_refused() {
+    let w = World::new().await;
+    let good = w
+        .raw(
+            &w.admin,
+            r#"{"jsonrpc":"2.0","id":1,"method":"hennery_plugin_capabilities","params":{"version":1}}"#,
+        )
+        .await
+        .json::<Value>()
+        .await
+        .unwrap();
+    assert_eq!(good["result"]["activity_v1"], true);
+    assert_eq!(good["result"]["forget_v1"], true);
+    for params in [
+        r#"{"version":2}"#,
+        r#"{"version":1,"owner":"other"}"#,
+        r#"{"version":1,"version":1}"#,
+    ] {
+        let raw = format!(r#"{{"jsonrpc":"2.0","id":1,"method":"hennery_plugin_capabilities","params":{params}}}"#);
+        assert!(
+            w.raw(&w.admin, &raw)
+                .await
+                .json::<Value>()
+                .await
+                .unwrap()
+                .get("error")
+                .is_some()
+        );
+    }
+}
+#[tokio::test]
+async fn only_one_bearer_without_browser_or_query_transports_selects_a_namespace() {
+    let w = World::new().await;
+    let body = r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_remember","arguments":{"title":"transport fixture","body":"transport-marker","idempotency_key":"transport"}}}"#;
+    let client = reqwest::Client::new();
+    for kind in ["duplicate", "cookie", "query", "query-only"] {
+        let url = if kind.starts_with("query") {
+            format!("{}?namespace=foreign", w.url)
+        } else {
+            w.url.clone()
+        };
+        let mut request = client.post(url).header("content-type", "application/json").body(body);
+        if kind != "query-only" {
+            request = request.bearer_auth(&w.tool);
+        }
+        if kind == "duplicate" {
+            request = request.header("authorization", format!("Bearer {}", w.tool));
+        }
+        if kind == "cookie" {
+            request = request.header("cookie", "session=fixture");
+        }
+        assert_eq!(request.send().await.unwrap().status(), 404, "{kind}");
+    }
+    assert!(
+        w.store
+            .search(&w.tool, &hennery_memory::store::Query::search("transport-marker"))
+            .unwrap()
+            .entries
+            .is_empty()
+    );
+}
diff --git a/crates/hennery-memory/tests/limits.rs b/crates/hennery-memory/tests/limits.rs
new file mode 100644
index 00000000..0263dd7a
--- /dev/null
+++ b/crates/hennery-memory/tests/limits.rs
@@ -0,0 +1,102 @@
+use hennery_memory::store::{Entry, Remember, Store};
+use rusqlite::params;
+fn remember(key: &str, body: &str) -> Remember {
+    serde_json::from_value(serde_json::json!({"title":"quota fixture","body":body,"idempotency_key":key})).unwrap()
+}
+fn fill(s: &Store, path: &std::path::Path, token: &str, namespace: &str, large: bool) {
+    let body = if large { "x".repeat(16000) } else { "fixture".into() };
+    s.remember(token, remember("seed", &body)).unwrap();
+    let mut db = rusqlite::Connection::open(path).unwrap();
+    let data: String = db
+        .query_row("SELECT data FROM entries WHERE namespace=?1", [namespace], |r| r.get(0))
+        .unwrap();
+    let mut entry: Entry = serde_json::from_str(&data).unwrap();
+    let total = if large {
+        (64 * 1024 * 1024 - 1) / data.len()
+    } else {
+        10000
+    };
+    let tx = db.transaction().unwrap();
+    {
+        let mut insert = tx
+            .prepare(
+                "INSERT INTO entries(namespace,id,kind,project,title,body,data) VALUES(?1,?2,'memory',NULL,?3,?4,?5)",
+            )
+            .unwrap();
+        for i in 1..total {
+            entry.id = format!("{i:064x}");
+            let data = serde_json::to_string(&entry).unwrap();
+            insert
+                .execute(params![namespace, entry.id, entry.title, entry.body, data])
+                .unwrap();
+        }
+    }
+    tx.commit().unwrap();
+    if large {
+        let bytes: i64 = db
+            .query_row(
+                "SELECT sum(length(CAST(data AS BLOB))) FROM entries WHERE namespace=?1",
+                [namespace],
+                |r| r.get(0),
+            )
+            .unwrap();
+        assert!(bytes < 64 * 1024 * 1024 && bytes > 64 * 1024 * 1024 - 20000);
+    }
+}
+#[test]
+fn entry_quota_is_scoped_and_rejection_does_not_commit_an_entry_or_request() {
+    let d = tempfile::tempdir().unwrap();
+    let path = d.path().join("memory.db");
+    let s = Store::open(&path).unwrap();
+    let a = s.create("owner", "a").unwrap();
+    let b = s.create("owner", "b").unwrap();
+    fill(&s, &path, &a.tool, &a.namespace, false);
+    assert!(s.remember(&a.tool, remember("overflow", "excess")).is_err());
+    assert!(s.remember(&b.tool, remember("other", "independent")).is_ok());
+    let db = rusqlite::Connection::open(&path).unwrap();
+    assert_eq!(
+        db.query_row("SELECT count(*) FROM entries WHERE namespace=?1", [&a.namespace], |r| r
+            .get::<_, i64>(0))
+            .unwrap(),
+        10000
+    );
+    assert_eq!(
+        db.query_row(
+            "SELECT count(*) FROM requests WHERE namespace=?1",
+            [&a.namespace],
+            |r| r.get::<_, i64>(0)
+        )
+        .unwrap(),
+        1
+    );
+}
+#[test]
+fn byte_quota_includes_the_new_canonical_entry_before_commit() {
+    let d = tempfile::tempdir().unwrap();
+    let path = d.path().join("memory.db");
+    let s = Store::open(&path).unwrap();
+    let a = s.create("owner", "hat").unwrap();
+    fill(&s, &path, &a.tool, &a.namespace, true);
+    assert!(
+        s.remember(&a.tool, remember("overflow", &"y".repeat(16384))).is_err(),
+        "the pending entry must count against the namespace byte budget"
+    );
+    let db = rusqlite::Connection::open(&path).unwrap();
+    let bytes: i64 = db
+        .query_row(
+            "SELECT sum(length(CAST(data AS BLOB))) FROM entries WHERE namespace=?1",
+            [&a.namespace],
+            |r| r.get(0),
+        )
+        .unwrap();
+    assert!(bytes <= 64 * 1024 * 1024);
+    assert_eq!(
+        db.query_row(
+            "SELECT count(*) FROM requests WHERE namespace=?1",
+            [&a.namespace],
+            |r| r.get::<_, i64>(0)
+        )
+        .unwrap(),
+        1
+    );
+}
diff --git a/crates/hennery-memory/tests/live.rs b/crates/hennery-memory/tests/live.rs
new file mode 100644
index 00000000..5da3bbfb
--- /dev/null
+++ b/crates/hennery-memory/tests/live.rs
@@ -0,0 +1,981 @@
+//! Mounted live proof using real collector/service processes and a signed scripted host.
+//! Build both binaries before explicitly running this ignored test. All state
+//! is disposable and private; no model or real adapter is exercised.
+
+use futures::{SinkExt, StreamExt};
+use hennery_host::identity::HostKey;
+use hennery_kernel::{
+    hats::{HatChange, NewRule, RulesChange},
+    hosts::{Enrollment, Hosts},
+    operator::{Operator, SetupOutcome},
+    secret::unix_now,
+};
+use hennery_memory::consumer::FeedConfig;
+use hennery_proto::{
+    HELLO_NONCE_HEADER, PROTOCOL_VERSION,
+    frames::{
+        AgentIsolation, Capabilities, Capability, CollectorFrame, HostFrame, Indexed, McpDelivery, McpIsolation,
+        McpServer, ParkReason, SessionBody, TurnOutcome,
+    },
+};
+use reqwest::{Client, Method, StatusCode};
+use serde_json::{Value, json};
+use std::{
+    collections::HashMap,
+    fs::{File, OpenOptions},
+    io::Write,
+    net::{SocketAddr, TcpListener},
+    os::{
+        fd::AsRawFd,
+        unix::{
+            fs::{DirBuilderExt, OpenOptionsExt},
+            process::CommandExt,
+        },
+    },
+    path::{Path, PathBuf},
+    process::{Child, Command, Stdio},
+    time::Duration,
+};
+use tokio::sync::mpsc;
+use tokio_tungstenite::tungstenite::Message;
+
+const HOST: &str = "recall-proof-host";
+const BOUND: Duration = Duration::from_secs(60);
+const MARKER_A: &str = "recallonlinefixture9xz";
+const MARKER_B: &str = "recallofflinefixture8xz";
+
+struct Running(Child);
+impl Running {
+    fn stop(&mut self) {
+        if self.0.try_wait().unwrap().is_none() {
+            self.0.kill().unwrap();
+        }
+        self.0.wait().unwrap();
+    }
+}
+impl Drop for Running {
+    fn drop(&mut self) {
+        self.stop();
+    }
+}
+struct HostTask(tokio::task::JoinHandle<()>);
+impl Drop for HostTask {
+    fn drop(&mut self) {
+        self.0.abort();
+    }
+}
+struct Namespace {
+    id: String,
+    tool: String,
+    lifecycle: String,
+}
+struct Grant {
+    epoch: String,
+    token: String,
+}
+struct Delivery {
+    session: String,
+    url: String,
+    bearer: String,
+}
+
+fn private_dir(path: &Path) {
+    std::fs::DirBuilder::new()
+        .recursive(true)
+        .mode(0o700)
+        .create(path)
+        .unwrap();
+}
+fn command(binary: &Path, scratch: &Path) -> Command {
+    hennery_testkit::first_exec(binary.to_str().unwrap());
+    let home = scratch.join("home");
+    private_dir(&home);
+    let mut command = Command::new(binary);
+    command
+        .env("HOME", &home)
+        .env("XDG_CONFIG_HOME", home.join("config"))
+        .env("XDG_DATA_HOME", home.join("data"))
+        .env("XDG_STATE_HOME", home.join("state"))
+        .env("XDG_CACHE_HOME", home.join("cache"))
+        .env_remove("HENNERY_DATA_DIR")
+        .env_remove("HENNERY_HOST_DATA_DIR")
+        .env_remove("HENNERY_MASTER_KEY")
+        .env_remove("HENNERY_PUBLIC_URL")
+        .env_remove("HENNERY_LISTEN")
+        .env_remove("HENNERY_DEV_TOKEN")
+        .env_remove("CREDENTIALS_DIRECTORY")
+        .env_remove("CLAUDE_CONFIG_DIR")
+        .env_remove("CODEX_HOME");
+    command
+}
+fn output_file(path: &Path) -> File {
+    OpenOptions::new()
+        .create(true)
+        .append(true)
+        .mode(0o600)
+        .open(path)
+        .unwrap()
+}
+fn spawn(mut command: Command, log: &Path) -> Running {
+    command
+        .stdout(Stdio::from(output_file(log)))
+        .stderr(Stdio::from(output_file(log)));
+    Running(command.spawn().unwrap())
+}
+fn collector_binary() -> PathBuf {
+    std::env::var_os("HENNERY_LIVE_BINARY")
+        .map(PathBuf::from)
+        .unwrap_or_else(|| {
+            std::env::current_exe()
+                .unwrap()
+                .parent()
+                .unwrap()
+                .parent()
+                .unwrap()
+                .join("hennery")
+        })
+}
+fn create(memory: &Path, scratch: &Path, data: &Path, owner: &str, hat: &str) -> Namespace {
+    let output = command(memory, scratch)
+        .arg("--data-dir")
+        .arg(data)
+        .args(["create", "--owner", owner, "--hat", hat])
+        .output()
+        .unwrap();
+    assert!(output.status.success(), "memory bootstrap failed");
+    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
+    Namespace {
+        id: value["namespace"].as_str().unwrap().into(),
+        tool: value["tool_credential"].as_str().unwrap().into(),
+        lifecycle: value["lifecycle_credential"].as_str().unwrap().into(),
+    }
+}
+fn memory_server(binary: &Path, scratch: &Path, data: &Path, addr: SocketAddr) -> (Running, SocketAddr) {
+    let log = scratch.join("memory.log");
+    let start = std::fs::metadata(&log).map(|m| m.len() as usize).unwrap_or(0);
+    let mut cmd = command(binary, scratch);
+    cmd.arg("--data-dir")
+        .arg(data)
+        .args(["serve", "--listen", &addr.to_string()]);
+    let mut child = spawn(cmd, &log);
+    let end = std::time::Instant::now() + BOUND;
+    loop {
+        assert!(std::time::Instant::now() < end, "memory readiness line deadline");
+        assert!(
+            child.0.try_wait().unwrap().is_none(),
+            "memory process exited before readiness"
+        );
+        if let Ok(text) = std::fs::read_to_string(&log)
+            && let Some(addr) = text[start..].lines().find_map(|line| {
+                line.strip_prefix("memory listening on ")
+                    .and_then(|s| s.parse::<SocketAddr>().ok())
+            })
+        {
+            return (child, addr);
+        }
+        std::thread::sleep(Duration::from_millis(20));
+    }
+}
+fn attach(binary: &Path, scratch: &Path, data: &Path, namespace: &Namespace, config: FeedConfig) {
+    let mut child = command(binary, scratch)
+        .arg("--data-dir")
+        .arg(data)
+        .args(["attach", "--namespace", &namespace.id])
+        .stdin(Stdio::piped())
+        .stdout(Stdio::null())
+        .stderr(Stdio::from(output_file(&scratch.join("memory.log"))))
+        .spawn()
+        .unwrap();
+    let mut stdin = child.stdin.take().unwrap();
+    stdin.write_all(&serde_json::to_vec(&config).unwrap()).unwrap();
+    drop(stdin);
+    assert!(child.wait().unwrap().success(), "explicit offline grant attachment");
+}
+async fn wait_health(client: &Client, base: &str) {
+    tokio::time::timeout(BOUND, async {
+        loop {
+            if client
+                .get(format!("{base}/healthz"))
+                .send()
+                .await
+                .is_ok_and(|r| r.status().is_success())
+            {
+                break;
+            }
+            tokio::time::sleep(Duration::from_millis(50)).await;
+        }
+    })
+    .await
+    .expect("real collector became healthy");
+}
+async fn owner(client: &Client, base: &str, method: Method, path: &str, body: Option<Value>) -> (StatusCode, Value) {
+    let mut request = client.request(method, format!("{base}{path}"));
+    if let Some(body) = body {
+        request = request.json(&body);
+    }
+    let response = request.send().await.unwrap();
+    let status = response.status();
+    (status, response.json().await.unwrap_or(Value::Null))
+}
+async fn raw_rpc(client: &Client, url: &str, token: &str, message: Value) -> (StatusCode, Value) {
+    let response = client
+        .post(url)
+        .bearer_auth(token)
+        .header("accept", "application/json, text/event-stream")
+        .header("mcp-protocol-version", "2025-06-18")
+        .json(&message)
+        .send()
+        .await
+        .unwrap();
+    let status = response.status();
+    (status, response.json().await.unwrap_or(Value::Null))
+}
+async fn wait_memory(client: &Client, url: &str, namespace: &Namespace) {
+    tokio::time::timeout(BOUND, async {
+        loop {
+            let answer = client
+                .post(url)
+                .bearer_auth(&namespace.lifecycle)
+                .json(&json!({"jsonrpc":"2.0","id":"capabilities",
+                    "method":"hennery_plugin_capabilities","params":{}}))
+                .send()
+                .await;
+            if let Ok(response) = answer
+                && response.status().is_success()
+            {
+                let value: Value = response.json().await.unwrap();
+                assert_eq!(value["result"]["version"], 1);
+                assert_eq!(value["result"]["activity_v1"], true);
+                assert_eq!(value["result"]["forget_v1"], true);
+                assert_eq!(value["result"]["startup_context_v1"], false);
+                break;
+            }
+            tokio::time::sleep(Duration::from_millis(50)).await;
+        }
+    })
+    .await
+    .expect("real memory lifecycle endpoint became ready");
+}
+async fn register(
+    owner_client: &Client,
+    collector: &str,
+    memory_url: &str,
+    namespace: &Namespace,
+    hat: &str,
+    slug: &str,
+) -> Grant {
+    let (status, connection) = owner(
+        owner_client,
+        collector,
+        Method::POST,
+        "/api/mcp/connections",
+        Some(json!({"slug":slug,"label":slug,"url":memory_url,"hat_id":hat,
+            "cred_kind":"static","internal_network":true,
+            "tool_allowlist":["memory_recent","memory_search","memory_brief","memory_remember"]})),
+    )
+    .await;
+    assert_eq!(status, StatusCode::CREATED);
+    let id = connection["id"].as_str().unwrap();
+    let (status, _) = owner(
+        owner_client,
+        collector,
+        Method::PUT,
+        &format!("/api/mcp/connections/{id}/credential"),
+        Some(json!({"token":namespace.tool})),
+    )
+    .await;
+    assert_eq!(status, StatusCode::NO_CONTENT);
+    let (status, _) = owner(
+        owner_client,
+        collector,
+        Method::PUT,
+        &format!("/api/mcp/connections/{id}/mounts"),
+        Some(json!({"host_ids":[HOST]})),
+    )
+    .await;
+    assert_eq!(status, StatusCode::OK);
+    let (status, grant) = owner(
+        owner_client,
+        collector,
+        Method::POST,
+        "/api/plugins/registrations",
+        Some(json!({"connection_id":id,"lifecycle_credential":namespace.lifecycle,
+            "activity":true,"startup":false,"namespace_isolated":true})),
+    )
+    .await;
+    assert_eq!(status, StatusCode::OK);
+    Grant {
+        epoch: grant["namespace_epoch"].as_str().unwrap().into(),
+        token: grant["token"].as_str().unwrap().into(),
+    }
+}
+async fn send_session(
+    ws: &mut tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
+    seqs: &mut HashMap<String, u64>,
+    session: &str,
+    body: SessionBody,
+) {
+    let seq = seqs.entry(session.into()).or_default();
+    *seq += 1;
+    ws.send(Message::text(
+        serde_json::to_string(&HostFrame::Session {
+            session_id: session.into(),
+            seq: *seq,
+            body,
+        })
+        .unwrap(),
+    ))
+    .await
+    .unwrap();
+}
+fn delivery(session: String, mcp: McpDelivery) -> Delivery {
+    let servers = mcp
+        .mcp_servers
+        .into_iter()
+        .filter_map(|s| match s {
+            McpServer::Http { name, url, headers } if name.starts_with("hennery-recall-") => Some((url, headers)),
+            _ => None,
+        })
+        .collect::<Vec<_>>();
+    assert_eq!(servers.len(), 1, "exactly this hat's memory mount");
+    let (url, headers) = servers.into_iter().next().unwrap();
+    let bearer = headers
+        .iter()
+        .find(|h| h.name.eq_ignore_ascii_case("authorization"))
+        .unwrap()
+        .value
+        .strip_prefix("Bearer ")
+        .unwrap()
+        .to_string();
+    Delivery { session, url, bearer }
+}
+async fn host(collector: &str, roots: &[PathBuf]) -> (HostTask, mpsc::UnboundedReceiver<Delivery>) {
+    let key = HostKey::from_seed([21; 32]);
+    let ws_url = format!("{}/api/hosts/ws", collector.replacen("http://", "ws://", 1));
+    let (mut ws, response) = tokio_tungstenite::connect_async(ws_url).await.unwrap();
+    let nonce = hex::decode(response.headers()[HELLO_NONCE_HEADER].to_str().unwrap()).unwrap();
+    ws.send(Message::text(
+        serde_json::to_string(&HostFrame::Hello {
+            protocol_version: PROTOCOL_VERSION.into(),
+            host_version: "recall-fixture".into(),
+            host_id: HOST.into(),
+            proof: key.sign_hello(&nonce, HOST, PROTOCOL_VERSION),
+            capabilities: Capabilities(vec![Capability::ResolvePath, Capability::Park, Capability::McpServers]),
+            mcp_isolation: AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
+            workspace_roots: roots.iter().map(|r| r.to_str().unwrap().into()).collect(),
+            attached_sessions: vec![],
+        })
+        .unwrap(),
+    ))
+    .await
+    .unwrap();
+    let first = tokio::time::timeout(BOUND, ws.next()).await.unwrap().unwrap().unwrap();
+    let Message::Text(text) = first else {
+        panic!("expected hello acknowledgement");
+    };
+    assert!(matches!(
+        serde_json::from_str::<CollectorFrame>(&text).unwrap(),
+        CollectorFrame::HelloAck { .. }
+    ));
+    ws.send(Message::text(
+        serde_json::to_string(&HostFrame::ResendComplete).unwrap(),
+    ))
+    .await
+    .unwrap();
+    let (tx, rx) = mpsc::unbounded_channel();
+    let task = tokio::spawn(async move {
+        let mut seqs = HashMap::<String, u64>::new();
+        loop {
+            let Some(message) = ws.next().await else {
+                break;
+            };
+            let message = message.unwrap();
+            match message {
+                Message::Ping(payload) => {
+                    ws.send(Message::Pong(payload)).await.unwrap();
+                    continue;
+                }
+                Message::Text(text) => {
+                    let frame: CollectorFrame = serde_json::from_str(&text).unwrap();
+                    match frame {
+                        CollectorFrame::ResolvePath { request_id, path } => {
+                            ws.send(Message::text(
+                                serde_json::to_string(&HostFrame::ResolvedPath {
+                                    request_id,
+                                    canonical: path,
+                                    exists: true,
+                                    is_dir: true,
+                                })
+                                .unwrap(),
+                            ))
+                            .await
+                            .unwrap();
+                        }
+                        CollectorFrame::StartSession {
+                            request_id,
+                            session_id,
+                            committed_seq,
+                            mcp,
+                            ..
+                        }
+                        | CollectorFrame::ResumeSession {
+                            request_id,
+                            session_id,
+                            committed_seq,
+                            mcp,
+                            ..
+                        } => {
+                            let current = seqs.entry(session_id.clone()).or_default();
+                            *current = (*current).max(committed_seq);
+                            send_session(
+                                &mut ws,
+                                &mut seqs,
+                                &session_id,
+                                SessionBody::session_started(request_id, format!("agent-{session_id}")),
+                            )
+                            .await;
+                            tx.send(delivery(session_id, mcp)).unwrap();
+                        }
+                        CollectorFrame::Prompt {
+                            request_id,
+                            session_id,
+                            turn_id,
+                            content,
+                            plugin_context,
+                        } => {
+                            assert!(plugin_context.is_none(), "R1 never opts into startup context");
+                            send_session(
+                                &mut ws,
+                                &mut seqs,
+                                &session_id,
+                                SessionBody::TurnStarted {
+                                    request_id,
+                                    turn_id: turn_id.clone(),
+                                },
+                            )
+                            .await;
+                            let marker = content
+                                .iter()
+                                .filter_map(|v| v["text"].as_str())
+                                .collect::<Vec<_>>()
+                                .join(" ");
+                            send_session(&mut ws,&mut seqs,&session_id,SessionBody::AcpUpdate {
+                                indexed:Indexed::default(),payload:json!({"update":{
+                                    "sessionUpdate":"agent_message_chunk","content":{"type":"text","text":format!("Observed {marker}")}}}),
+                            }).await;
+                            send_session(
+                                &mut ws,
+                                &mut seqs,
+                                &session_id,
+                                SessionBody::TurnEnded {
+                                    turn_id,
+                                    outcome: TurnOutcome::Completed,
+                                    stop_reason: None,
+                                    error: None,
+                                },
+                            )
+                            .await;
+                        }
+                        CollectorFrame::ParkSession { session_id, .. } => {
+                            send_session(
+                                &mut ws,
+                                &mut seqs,
+                                &session_id,
+                                SessionBody::SessionParked {
+                                    reason: ParkReason::Operator,
+                                },
+                            )
+                            .await;
+                        }
+                        CollectorFrame::CloseSession { session_id, .. } => {
+                            send_session(&mut ws, &mut seqs, &session_id, SessionBody::SessionClosed).await;
+                        }
+                        CollectorFrame::Ack { .. } | CollectorFrame::ForgetHat { .. } => {}
+                        other => panic!(
+                            "unexpected collector operation: {}",
+                            serde_json::to_value(other).unwrap()["type"]
+                        ),
+                    }
+                }
+                Message::Close(_) => break,
+                _ => {}
+            }
+        }
+    });
+    (HostTask(task), rx)
+}
+async fn start(
+    client: &Client,
+    collector: &str,
+    cwd: &Path,
+    deliveries: &mut mpsc::UnboundedReceiver<Delivery>,
+) -> Delivery {
+    let (status, session) = owner(
+        client,
+        collector,
+        Method::POST,
+        "/api/sessions",
+        Some(json!({"host_id":HOST,"agent":"claude","cwd":cwd})),
+    )
+    .await;
+    assert_eq!(status, StatusCode::ACCEPTED);
+    let result = tokio::time::timeout(BOUND, deliveries.recv()).await.unwrap().unwrap();
+    assert_eq!(session["session_id"], result.session);
+    result
+}
+async fn tool(client: &Client, delivery: &Delivery, name: &str, arguments: Value) -> Option<Value> {
+    let (status, answer) = raw_rpc(
+        client,
+        &delivery.url,
+        &delivery.bearer,
+        json!({
+            "jsonrpc":"2.0","id":"live-tool","method":"tools/call","params":{"name":name,"arguments":arguments}
+        }),
+    )
+    .await;
+    if !status.is_success() || answer.get("error").is_some() {
+        return None;
+    }
+    assert_eq!(answer["result"]["isError"], false);
+    Some(serde_json::from_str(answer["result"]["content"][0]["text"].as_str().unwrap()).unwrap())
+}
+async fn initialize(client: &Client, delivery: &Delivery) {
+    tokio::time::timeout(BOUND, async {
+        loop {
+            let (status, answer) = raw_rpc(
+                client,
+                &delivery.url,
+                &delivery.bearer,
+                json!({
+                "jsonrpc":"2.0","id":"init","method":"initialize","params":{
+                    "protocolVersion":"2025-06-18","capabilities":{},
+                    "clientInfo":{"name":"recall-live-proof","version":"1"}}}),
+            )
+            .await;
+            if status == StatusCode::OK {
+                assert_eq!(answer["result"]["serverInfo"]["name"], "hennery-memory");
+                assert_eq!(answer["result"]["protocolVersion"], "2025-06-18");
+                break;
+            }
+            assert_eq!(
+                status,
+                StatusCode::NOT_FOUND,
+                "awaiting the initial valid namespace lease"
+            );
+            tokio::time::sleep(Duration::from_millis(100)).await;
+        }
+    })
+    .await
+    .expect("MCP initialize through the session gateway");
+    let (status, _) = raw_rpc(
+        client,
+        &delivery.url,
+        &delivery.bearer,
+        json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
+    )
+    .await;
+    assert_eq!(status, StatusCode::ACCEPTED);
+    let (status, list) = raw_rpc(
+        client,
+        &delivery.url,
+        &delivery.bearer,
+        json!({"jsonrpc":"2.0","id":"list","method":"tools/list","params":{}}),
+    )
+    .await;
+    assert_eq!(status, StatusCode::OK);
+    assert_eq!(list["result"]["tools"].as_array().unwrap().len(), 4);
+}
+async fn wait_note(client: &Client, delivery: &Delivery, marker: &str) -> Value {
+    tokio::time::timeout(BOUND, async {
+        loop {
+            if let Some(page) = tool(client, delivery, "memory_recent", json!({})).await
+                && page["entries"]
+                    .as_array()
+                    .unwrap()
+                    .iter()
+                    .any(|e| e.to_string().contains(marker))
+            {
+                return page;
+            }
+            tokio::time::sleep(Duration::from_millis(750)).await;
+        }
+    })
+    .await
+    .expect("real feed consumer projected a completed operator turn")
+}
+async fn prompt(client: &Client, collector: &str, delivery: &Delivery, marker: &str) {
+    let (status, _) = owner(
+        client,
+        collector,
+        Method::POST,
+        &format!("/api/sessions/{}/prompt", delivery.session),
+        Some(json!({"content":[{"type":"text","text":marker}]})),
+    )
+    .await;
+    assert_eq!(status, StatusCode::ACCEPTED);
+}
+async fn park(owner_client: &Client, proxy_client: &Client, collector: &str, delivery: &Delivery) {
+    let (status, _) = owner(
+        owner_client,
+        collector,
+        Method::POST,
+        &format!("/api/sessions/{}/park", delivery.session),
+        Some(json!({})),
+    )
+    .await;
+    assert!(status.is_success());
+    let (status, _) = raw_rpc(
+        proxy_client,
+        &delivery.url,
+        &delivery.bearer,
+        json!({"jsonrpc":"2.0","id":"parked","method":"tools/list","params":{}}),
+    )
+    .await;
+    assert_eq!(status, StatusCode::NOT_FOUND);
+}
+async fn receipt(client: &Client, collector: &str, hat: &str) -> Value {
+    let (status, receipts) = owner(client, collector, Method::GET, "/api/plugins/receipts", None).await;
+    assert_eq!(status, StatusCode::OK);
+    receipts
+        .as_array()
+        .unwrap()
+        .iter()
+        .find(|r| r["hat_id"] == hat)
+        .unwrap()
+        .clone()
+}
+fn entry_count(data: &Path, namespace: &str) -> i64 {
+    let db = rusqlite::Connection::open_with_flags(data.join("memory.db"), rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
+        .unwrap();
+    db.query_row("SELECT count(*) FROM entries WHERE namespace=?1", [namespace], |r| {
+        r.get(0)
+    })
+    .unwrap()
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+#[ignore = "requires freshly built hennery and hennery-memory binaries; run explicitly for the mounted live proof"]
+async fn real_binaries_feed_four_tools_park_resume_and_honest_online_offline_purge() {
+    let scratch = tempfile::tempdir().unwrap();
+    let base = std::fs::canonicalize(scratch.path()).unwrap();
+    let core_data = base.join("collector");
+    let memory_data = base.join("memory");
+    let root_a = base.join("project-a");
+    let root_b = base.join("project-b");
+    for path in [&core_data, &memory_data, &root_a, &root_b] {
+        private_dir(path);
+    }
+    let core_listener = TcpListener::bind("127.0.0.1:0").unwrap();
+    let core_addr = core_listener.local_addr().unwrap();
+    let first_memory_addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
+    let collector = format!("http://{core_addr}");
+    let (owner_id, cookie, hat_a, hat_b) = {
+        // Seed only owner/host/routing configuration while the real collector is stopped.
+        let path = core_data.join("hennery.db");
+        let _sessions = hennery_sessions::store::Store::open(&path).unwrap();
+        let hosts = Hosts::open(&path).unwrap();
+        let operator = Operator::open(&path).unwrap();
+        let now = unix_now();
+        let setup = operator.issue_setup_token(now).unwrap().unwrap();
+        let SetupOutcome::Done { phc, .. } = operator
+            .set_up(&setup, "correct horse battery", &collector, now)
+            .unwrap()
+        else {
+            panic!("setup");
+        };
+        let cookie = operator
+            .open_session("recall-live-fixture", &phc, now)
+            .unwrap()
+            .unwrap();
+        let key = HostKey::from_seed([21; 32]);
+        hosts
+            .register(
+                HOST,
+                &Enrollment {
+                    public_key: key.public_key_hex(),
+                    name: "Recall proof".into(),
+                    host_version: "fixture".into(),
+                    platform: "test".into(),
+                },
+                now,
+            )
+            .unwrap();
+        let HatChange::Done(a) = hosts.create_hat("Recall online", None, now).unwrap() else {
+            panic!("hat");
+        };
+        let HatChange::Done(b) = hosts.create_hat("Recall offline", None, now).unwrap() else {
+            panic!("hat");
+        };
+        assert!(matches!(
+            hosts
+                .replace_path_rules(
+                    HOST,
+                    &[
+                        NewRule {
+                            prefix: root_a.to_str().unwrap().into(),
+                            hat_id: a.id.clone(),
+                            verified: true
+                        },
+                        NewRule {
+                            prefix: root_b.to_str().unwrap().into(),
+                            hat_id: b.id.clone(),
+                            verified: true
+                        },
+                    ]
+                )
+                .unwrap(),
+            RulesChange::Done(_)
+        ));
+        (operator.owner_id().to_string(), cookie, a.id, b.id)
+    };
+    let memory_binary = PathBuf::from(env!("CARGO_BIN_EXE_hennery-memory"));
+    let core_binary = collector_binary();
+    assert!(
+        core_binary.is_file(),
+        "build freshly: cargo build -p hennery -p hennery-memory --bins --locked"
+    );
+    let ns_a = create(&memory_binary, &base, &memory_data, &owner_id, &hat_a);
+    let ns_b = create(&memory_binary, &base, &memory_data, &owner_id, &hat_b);
+    let plain = Client::builder().no_proxy().timeout(BOUND).build().unwrap();
+    let owner_client = Client::builder()
+        .no_proxy()
+        .timeout(BOUND)
+        .default_headers({
+            let mut headers = reqwest::header::HeaderMap::new();
+            headers.insert(reqwest::header::ORIGIN, collector.parse().unwrap());
+            headers.insert(
+                reqwest::header::COOKIE,
+                format!("hennery_session={cookie}").parse().unwrap(),
+            );
+            headers
+        })
+        .build()
+        .unwrap();
+    let mut cmd = command(&core_binary, &base);
+    cmd.env("HENNERY_MASTER_KEY", "07".repeat(32))
+        .args(["collector", "--data-dir"])
+        .arg(&core_data)
+        .args([
+            "--listen-fd",
+            &core_listener.as_raw_fd().to_string(),
+            "--public-url",
+            &collector,
+        ]);
+    let listener_fd = core_listener.as_raw_fd();
+    // SAFETY: the listener remains owned/alive through spawn; this child-only
+    // async-signal-safe fcntl merely preserves that explicit listener on exec.
+    unsafe {
+        cmd.pre_exec(move || {
+            if libc::fcntl(listener_fd, libc::F_SETFD, 0) == -1 {
+                Err(std::io::Error::last_os_error())
+            } else {
+                Ok(())
+            }
+        });
+    }
+    let mut core = spawn(cmd, &base.join("collector.log"));
+    drop(core_listener);
+    wait_health(&plain, &collector).await;
+    let (mut memory, memory_addr) = memory_server(&memory_binary, &base, &memory_data, first_memory_addr);
+    let memory_url = format!("http://{memory_addr}/mcp");
+    wait_memory(&plain, &memory_url, &ns_a).await;
+    let grant_a = register(&owner_client, &collector, &memory_url, &ns_a, &hat_a, "recall-a").await;
+    let grant_b = register(&owner_client, &collector, &memory_url, &ns_b, &hat_b, "recall-b").await;
+    memory.stop();
+    // Registration supplies the authoritative epochs. Attach via the real CLI
+    // offline so no second process opens the service's running writer database.
+    for (namespace, grant) in [(&ns_a, &grant_a), (&ns_b, &grant_b)] {
+        attach(
+            &memory_binary,
+            &base,
+            &memory_data,
+            namespace,
+            FeedConfig {
+                collector_url: format!("{collector}/"),
+                namespace_epoch: grant.epoch.clone(),
+                activity_token: grant.token.clone(),
+                activity: true,
+                internal_network: true,
+            },
+        );
+    }
+    memory = memory_server(&memory_binary, &base, &memory_data, memory_addr).0;
+    wait_memory(&plain, &memory_url, &ns_a).await;
+    let (_host, mut deliveries) = host(&collector, &[root_a.clone(), root_b.clone()]).await;
+    tokio::time::timeout(BOUND, async {
+        loop {
+            let (status, hosts) = owner(&owner_client, &collector, Method::GET, "/api/hosts", None).await;
+            if status.is_success()
+                && hosts
+                    .as_array()
+                    .unwrap()
+                    .iter()
+                    .any(|h| h["host_id"] == HOST && h["connected"] == true)
+            {
+                break;
+            }
+            tokio::time::sleep(Duration::from_millis(20)).await;
+        }
+    })
+    .await
+    .expect("signed host reconciled");
+    let a = start(&owner_client, &collector, &root_a, &mut deliveries).await;
+    let b = start(&owner_client, &collector, &root_b, &mut deliveries).await;
+    assert_ne!(
+        a.bearer, ns_a.tool,
+        "gateway bearer must differ from upstream credential"
+    );
+    assert_ne!(a.bearer, b.bearer, "each live session has an independent bearer");
+    assert_eq!(a.url, format!("{collector}/mcp/recall-a"));
+    assert_eq!(b.url, format!("{collector}/mcp/recall-b"));
+    initialize(&plain, &a).await;
+    initialize(&plain, &b).await;
+    prompt(&owner_client, &collector, &a, MARKER_A).await;
+    prompt(&owner_client, &collector, &b, MARKER_B).await;
+    let recent = wait_note(&plain, &a, MARKER_A).await;
+    assert!(recent["entries"][0]["provenance"].to_string().contains("operator"));
+    assert!(recent["entries"][0]["turns"].to_string().contains("assistant"));
+    wait_note(&plain, &b, MARKER_B).await;
+    let stored = tool(
+        &plain,
+        &a,
+        "memory_remember",
+        json!({
+        "title":"Live retained observation","body":format!("deliberate {MARKER_A}"),
+        "idempotency_key":"real-mcp-retention"}),
+    )
+    .await
+    .unwrap();
+    assert_eq!(stored["revision"], 1);
+    let searched = tool(&plain, &a, "memory_search", json!({"query":MARKER_A}))
+        .await
+        .unwrap();
+    assert!(searched["entries"].as_array().unwrap().len() >= 2);
+    let brief = tool(&plain, &a, "memory_brief", json!({"subject":MARKER_A}))
+        .await
+        .unwrap();
+    assert_eq!(brief["mode_used"], "deterministic");
+    assert!(brief["text"].as_str().unwrap().contains(MARKER_A));
+    let foreign = tool(&plain, &b, "memory_search", json!({"query":MARKER_A}))
+        .await
+        .unwrap();
+    assert!(foreign["entries"].as_array().unwrap().is_empty());
+    park(&owner_client, &plain, &collector, &a).await;
+    let (status, _) = owner(
+        &owner_client,
+        &collector,
+        Method::POST,
+        &format!("/api/sessions/{}/resume", a.session),
+        Some(json!({})),
+    )
+    .await;
+    assert!(status.is_success());
+    let resumed = tokio::time::timeout(BOUND, deliveries.recv()).await.unwrap().unwrap();
+    assert_eq!(resumed.session, a.session);
+    assert_ne!(resumed.bearer, a.bearer);
+    initialize(&plain, &resumed).await;
+    assert!(tool(&plain, &resumed, "memory_recent", json!({})).await.is_some());
+    let (status, _) = raw_rpc(
+        &plain,
+        &a.url,
+        &a.bearer,
+        json!({"jsonrpc":"2.0","id":"old","method":"tools/list"}),
+    )
+    .await;
+    assert_eq!(status, StatusCode::NOT_FOUND);
+    park(&owner_client, &plain, &collector, &resumed).await;
+    let (status, _) = owner(
+        &owner_client,
+        &collector,
+        Method::POST,
+        &format!("/api/hats/{hat_a}/purge"),
+        None,
+    )
+    .await;
+    assert_eq!(status, StatusCode::OK);
+    assert_eq!(receipt(&owner_client, &collector, &hat_a).await["status"], "confirmed");
+    assert_eq!(entry_count(&memory_data, &ns_a.id), 0);
+    assert_marker_erased(&memory_data, MARKER_A);
+    assert!(
+        !tool(&plain, &b, "memory_search", json!({"query":MARKER_B}))
+            .await
+            .unwrap()["entries"]
+            .as_array()
+            .unwrap()
+            .is_empty()
+    );
+    memory.stop();
+    park(&owner_client, &plain, &collector, &b).await;
+    let (status, _) = owner(
+        &owner_client,
+        &collector,
+        Method::POST,
+        &format!("/api/hats/{hat_b}/purge"),
+        None,
+    )
+    .await;
+    assert_eq!(status, StatusCode::OK);
+    assert_eq!(
+        receipt(&owner_client, &collector, &hat_b).await["status"],
+        "unconfirmed"
+    );
+    assert!(
+        entry_count(&memory_data, &ns_b.id) > 0,
+        "unreachable external copy remains honestly present"
+    );
+    memory = memory_server(&memory_binary, &base, &memory_data, memory_addr).0;
+    wait_memory(&plain, &memory_url, &ns_b).await;
+    let (status, _) = raw_rpc(
+        &plain,
+        &memory_url,
+        &ns_b.tool,
+        json!({"jsonrpc":"2.0","id":"revoked","method":"tools/list","params":{}}),
+    )
+    .await;
+    assert_eq!(
+        status,
+        StatusCode::NOT_FOUND,
+        "cold restart cannot resurrect a revoked grant lease"
+    );
+    assert!(
+        entry_count(&memory_data, &ns_b.id) > 0,
+        "access denial does not imply deletion"
+    );
+    let (status, cleanup) = raw_rpc(
+        &plain,
+        &memory_url,
+        &ns_b.lifecycle,
+        json!({
+        "jsonrpc":"2.0","id":"cleanup","method":"hennery_plugin_forget","params":{
+            "request_id":"fixture-cleanup-after-unconfirmed","namespace_epoch":grant_b.epoch,
+            "target":{"kind":"scope"}}}),
+    )
+    .await;
+    assert_eq!(status, StatusCode::OK);
+    assert_eq!(cleanup["result"]["status"], "confirmed");
+    assert_eq!(entry_count(&memory_data, &ns_b.id), 0);
+    assert_marker_erased(&memory_data, MARKER_B);
+    assert_eq!(
+        receipt(&owner_client, &collector, &hat_b).await["status"],
+        "unconfirmed",
+        "manual cleanup does not rewrite earlier collector evidence"
+    );
+    println!(
+        "{}",
+        json!({"proof":"real collector + optional memory process + signed scripted host","model_used":false,"tools":["memory_recent","memory_remember","memory_search","memory_brief"],"namespaces":2,"cross_hat_search":"empty","park_resume_bearer":"rotated; old denied","online_purge":"confirmed; body+FTS/WAL marker absent","offline_purge":"unconfirmed; copy retained and cold access denied","authenticated_cleanup":"confirmed; historical core receipt remains unconfirmed"})
+    );
+    memory.stop();
+    drop(_host);
+    core.stop();
+}
+
+fn assert_marker_erased(data: &Path, marker: &str) {
+    for name in ["memory.db", "memory.db-wal"] {
+        if let Ok(bytes) = std::fs::read(data.join(name)) {
+            assert!(
+                !bytes.windows(marker.len()).any(|s| s == marker.as_bytes()),
+                "fixture marker remains in {name}"
+            );
+        }
+    }
+}
```

## Initial verification and execution record (before review)

All final commands ran inside the flake dev shell on native macOS, with isolated tool HOME/XDG/Cargo cache. Final source is the task-four checkpoint; only plan/index metadata changed afterward. Moving the cache path caused one dependency rebuild; no global package or config was installed. Earlier targeted/probe commands used the existing tool cache before that correction. Both probe families and the replay have independent APFS-cloned targets; target directories were never shared.

| Final command | Exit | Output |
|---|---:|---|
| `cargo fmt --all --check` | 0 | completed successfully |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 | completed successfully |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 | completed successfully |
| `cargo test --workspace --locked` | 0 | 2,435 passed, 2 ignored; 171 result lines |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 | completed successfully |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 | completed successfully |
| `nix flake check -L` | 0 | completed successfully |

The full workspace suite ran once after the C1b integration rebase, which touched the inventory hotspot. Earlier task-one and task-two full runs predate the operator's amended budget. CI is the check of record. Nix's native package, workspace clippy, fmt, audit and embedded-UI checks passed; Linux checks remain for PR CI. Both SQL files embedded by this new crate are explicitly included in `nix/package.nix`. No `web/` files changed, so the web gate was skipped.

**Live MCP proof:** the initial real-binary run exposed the capabilities-version mismatch; focused regression RED and the implementation fix preceded the passing run (1 passed, exit 0, 18.75 seconds). The final load repeated the same real collector/plug-in/session-proxy path twelve times, and the fresh replay ran it once more (exit 0). Every run drove `memory_recent`, `memory_search`, `memory_brief` and `memory_remember`; it proved typed feed capture, isolation of two hats, revoked old session credentials, confirmed online erasure and unconfirmed offline retention. A subsequent authenticated cleanup cannot rewrite the collector's historical unconfirmed receipt. No model or pinned external adapter was used.

**Guard probes:** 48 distinct behavioral mutations were detected (17 store/tools, 24 consumer/lifecycle, 7 final transport/pacing/quota). Each produced runtime test failure (101), then restored baselines passed. The first candidate-FTS mutation survived, revealing missing foreign-corpus/nonmatching-row coverage; the new regression then failed on that mutation and passed restored. The consumer probe driver's final bookkeeping comparison used the advancing worktree and exited 1; its 24 behavioral detections, restored 22-test baseline and independent zero-diff comparison against its frozen commit all succeeded. The final batch compared saved immutable bytes and exited 0. These are copy-only mutations; no probe edit entered a live commit.

**Timing load:** four independent fixture processes concurrently, three rounds. All 204 test executions across 48 groups passed, with no failures requiring an unloaded rerun. Selection: 11 consumer lease/fence/reset/checkpoint/pacing cases (including the real paced 10,000-source reset under its lease), three HTTP body/deadline/isolation cases, two CLI spawn cases and the real mounted proof. Static FTS, SQL and quota cases were not loaded. Compiled test binaries were reused directly so Cargo target locking did not serialize the four instances.

Replay setup first selected the dev shell's GNU cp, which rejected -c (exit 1) before any target copy or test. The same untouched fresh copy resumed using /bin/cp -c -R (exit 0); no second replay tree was created.

**One fresh replay:** extracted four nonempty exact patches affecting 20 implementation files. A fresh copy started at C1b `bf632e58`, then received the patches and tests task by task, with built-commit byte comparison at every stage:

| Task | Targeted passed | Ignored | Exit |
|---|---:|---:|---:|
| 1 | 9 | 0 | 0 |
| 2 | 12 | 0 | 0 |
| 3 | 47 | 0 | 0 |
| 4 | 52 | 1 | 0 |

The final replay also built both actual binaries, passed the explicit live proof (1 test), and passed formatting. All 809 tracked files match the final worktree byte for byte, including the plan and docs index copied as self-referential metadata. The original RED observations and all 48 copy probes above are retained separately; no second full replay or duplicate workspace suite was run in the copy.

**Evidence and cleanup:** ignored logs, command/status files, extracted patches and result JSON live under `.superpowers/sdd/recall-r1/`. Retained copies: `probes-tools-1`, `probes-consumer-1` (reused for the final guard batch), and `replay-1`; the parent removes them. C1b has its own separate ledger/copies. No scratch copy was deleted.

**Review request:** parent-run independent review of C1b separately (`7fe43fbe..bf632e58`) and R1 from `bf632e58` through this plan-record commit. Natural stacked split: tasks 1–2 (R1a, store/tools), then tasks 3–4 (R1b, consumer/lifecycle/live proof). Review tool versus lifecycle auth, immutable owner/hat/epoch selection and typed evidence, fail-closed lease and delivery races, purge/checkpoint and historical receipt honesty, literal/correlated FTS, and request/network/storage/resource limits. C1b expiry invalidates snapshot use; physical source-ID cleanup occurs on replacement/lifecycle, not by an expiry sweeper. No independent approval is claimed. PR creation, checks, reviewDecision, mergeStateStatus and all unresolved threads (including bots) remain parent-owned and unqueried. No publication.


## Review amendment (2026-10-16)

The parent reported two reproduced Medium findings and a CHANGES verdict for R1. Both are corrected in `3827a465`, on the conflict-free rebase onto approved C1b `49c0f4d7` (main `cbd002b0`). The rebased initial R1 head is `469cfeee`. C1b is in PR #153 CI according to the parent; its full PR status remains parent-owned. The original four patches and initial replay above remain historical evidence, not claims about this amendment. No new full replay or workspace-wide test run was performed, as the amended verification budget and parent explicitly require.

**Deduplication capacity:** the new exact-100,000-row regression failed first (101). Current-page evidence, including duplicate events, is refreshed after digest comparison. The cursor, projection and pruning of the historical suffix beyond 100,000 rows share one transaction. All admitted current-page events remain in the bounded suffix; stale jobs cannot commit, and an already committed cursor rejects previously unseen/pruned history. This maintenance relies on C1's authoritative ordered cursor contract. Forced pruning failure proves projection/cursor rollback; identical current-page replay and changed-duplicate refusal remain tested. No quota was raised or disabled.

**Inventory reconciliation:** the root mixed-corpus regression failed on old code after 134.78 seconds. The fixed implementation reads at most 32 owned rows per chunk through the existing namespace/kind/sequence index, deserializes each entry once outside the shared mutex on the blocking pool, and prepares canonical metadata changes in memory. Absent note IDs and source IDs are deleted in bulk; deliberate references/provenance are detached in one scoped pass, retaining unrelated evidence or an explicit unverified fallback. Unchanged body/title/project fields and their FTS rows are not reinserted. A cursor/revision fence and lease check precede the final atomic SQL commit, with a second lease check before commit. Expiry, lifecycle changes or a failed cursor update cannot partially delete sources. The mutex is held for bounded row-copy chunks and the final SQL transaction, rather than the whole reset/JSON pass. This retains one short shared commit; it does not claim separate per-namespace SQLite writers.

The final local 1,500-note plus 1,500-memory (16,000-byte bodies) case completed its successful reset in 1.21 seconds; the other namespace's worst wait was 0.592 seconds. It also forces a failed commit and verifies full rollback, preserves a foreign namespace with colliding source/entry IDs, and covers provenance-only detachment, unverified fallback, unchanged memories, retained note gaps and exact source removal. Its limits are 12 seconds for successful reconciliation and 3 seconds for another namespace's wait, well inside the 60-second lease. The actual reset SQL plan is checked for the scoped index and absence of a full-corpus sort. Both private commit-fence unit regressions initially failed to compile before the prepare/commit APIs existed, then passed; their revision and expiry defenses also saw behavioral RED in the copy.

**Rebase lock maintenance:** the first post-rebase `--locked` invocation exited 101 before running tests, because main's workspace version changed to `0.1.0-alpha.1` while the new path-package lock entry still said `0.0.0`. `cargo update -p hennery-memory --offline` changed that single entry and no external dependency. All final invocations retain `--locked`.

| Final command (private HOME/XDG, flake dev shell) | Exit | Output |
|---|---:|---|
| `cargo test -p hennery-memory --locked` | 0 | 56 passed, 1 ignored |
| `cargo fmt --all --check` | 0 | completed successfully |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 | completed successfully |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 | completed successfully |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 | completed successfully |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 | completed successfully |
| `cargo build -p hennery -p hennery-memory --bins --locked` | 0 | completed successfully |
| `cargo test -p hennery-memory --tests --no-run --locked --message-format=json` | 0 | completed successfully |
| `nix flake check -L` | 0 | completed successfully |

The SQL audit now prepares 51 consumer statements (including the two private test queries), keeping the original namespace checks and adding a real query-plan assertion. Both embedded SQL files remain in the Nix source filter. No core runtime source, UI, model or plug-in opt-in behavior changed.

**Timing load:** four independent fixture processes concurrently for three rounds: 216 passing test executions in 48 groups, all exit 0. The previous 17 timing/lease/fence/body/spawn/live cases plus the new mixed-corpus reset ran 4×3. Static capacity and SQL cases were not loaded. Each mounted proof used the newly built real collector and plug-in, drove all four tools through the session MCP proxy, and preserved online confirmed/offline unconfirmed purge behavior without a model. Loaded reset/other-namespace observations are saved in the ledger JSON and logs; every sample met the unchanged 12-second/3-second bounds.

**Copy probes:** all 18 new/relocated guard mutations failed behaviorally (101) and the restored five selected regressions passed, exit 0, with a final zero diff against the frozen copy. Coverage: bounded cursor-committed seen history; current-page refresh; non-advancing replay; both bulk deletes and their scopes; replacement scope and persistence; references, provenance and fallback; retained stale/gap evidence; final revision/lease fences; the linear reset algorithm; scoped indexed chunk reads. For the performance removal probe only, the copy used 400 notes plus 400 memories and a tighter 2-second bound, baseline and restored, so reverting the old quadratic implementation is caught without paying for two 135-second runs. The real worktree and loaded regression retain 1,500+1,500 and 12 seconds. Targets were APFS-cloned with `/bin/cp -c -R` before any copy build; no target directory was shared.

Evidence lives under `.superpowers/sdd/recall-r1/amendment-1/`; the new retained copy is `probes-amendment-1`. Prior copies remain as listed above. Independent scoped re-confirmation is requested through the parent for `469cfeee` through the final amendment-record commit. Review cursor-pruning replay assumptions, deletion at capacity, snapshot/final-commit fences, atomic rollback, namespace scope, FTS consistency and bounded lock/CPU work. PR checks, reviewDecision, mergeStateStatus and all unresolved threads, bots included, remain parent-owned and unqueried. No publication.

**Built amendment:** apply this exact additional diff to the rebased initial R1 head `469cfeee`. It is embedded from the tested fix commit, not replayed as a second plan.

```diff
diff --git a/Cargo.lock b/Cargo.lock
index da50e5ad..97fca198 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1621 +1621 @@ name = "hennery-memory"
-version = "0.0.0"
+version = "0.1.0-alpha.1"
diff --git a/crates/hennery-memory/src/consumer.rs b/crates/hennery-memory/src/consumer.rs
index cfa43cb5..cd5b887d 100644
--- a/crates/hennery-memory/src/consumer.rs
+++ b/crates/hennery-memory/src/consumer.rs
@@ -35,0 +36,5 @@ struct Job {
+struct InventoryPlan {
+    absent: Vec<String>,
+    note_ids: Vec<String>,
+    replacements: Vec<(String, String)>,
+}
@@ -223 +228,3 @@ impl Consumer {
-                store.inventory(job, ids, resume.context("missing inventory")?, latest_start, until)?;
+                store
+                    .inventory(job, ids, resume.context("missing inventory")?, latest_start, until)
+                    .await?;
@@ -382,2 +389,20 @@ impl Store {
-            if let Some(old) = old {
-                ensure!(old == digest, "source event changed");
+            if let Some(old) = &old {
+                ensure!(*old == digest, "source event changed");
+            } else {
+                // A committed cursor may only replay already admitted evidence.
+                // Pruned history cannot be reintroduced by a non-advancing page.
+                ensure!(
+                    job.cursor.as_ref() != Some(&page.next_cursor),
+                    "non-advancing new event"
+                );
+            }
+            // Refresh current-page evidence before pruning, including duplicates.
+            tx.execute(
+                "DELETE FROM seen WHERE namespace=?1 AND event_key=?2",
+                params![job.id, item.event_key],
+            )?;
+            tx.execute(
+                "INSERT INTO seen(namespace,event_key,digest) VALUES(?1,?2,?3)",
+                params![job.id, item.event_key, digest],
+            )?;
+            if old.is_some() {
@@ -462,4 +486,0 @@ impl Store {
-            tx.execute(
-                "INSERT INTO seen(namespace,event_key,digest) VALUES(?1,?2,?3)",
-                params![job.id, item.event_key, digest],
-            )?;
@@ -467 +487,0 @@ impl Store {
-        budget(&tx, &job.id)?;
@@ -471,0 +492,8 @@ impl Store {
+        // Only evidence behind this cursor is evicted, atomically with its
+        // projection. A stale job cannot commit, and the <=20 current items
+        // were refreshed above. Capacity never prevents a deletion page.
+        tx.execute(
+            "DELETE FROM seen WHERE namespace=?1 AND rowid IN (SELECT rowid FROM seen WHERE namespace=?1 ORDER BY rowid DESC LIMIT -1 OFFSET 100000)",
+            [&job.id],
+        )?;
+        budget(&tx, &job.id)?;
@@ -495 +523 @@ impl Store {
-    fn inventory(
+    async fn inventory(
@@ -502,0 +531,80 @@ impl Store {
+        let plan = self.prepare_inventory(job, ids, start, until).await?;
+        self.commit_inventory(job, plan, resume, start, until)
+    }
+    async fn prepare_inventory(
+        &self,
+        job: &Job,
+        ids: std::collections::BTreeSet<String>,
+        start: Instant,
+        until: i64,
+    ) -> Result<InventoryPlan> {
+        let absent = Arc::new(
+            self.known_sources(job)?
+                .difference(&ids)
+                .cloned()
+                .collect::<std::collections::BTreeSet<_>>(),
+        );
+        let note_ids = Arc::new(
+            absent
+                .iter()
+                .map(|s| sha256_hex(format!("native-note:{s}").as_bytes()))
+                .collect::<std::collections::BTreeSet<_>>(),
+        );
+        let high_water: i64 = {
+            let inner = self.inner.lock().expect("store");
+            inner.live(job)?;
+            check_lease(start, until)?;
+            inner.db.query_row(
+                "SELECT coalesce(max(seq),0) FROM entries WHERE namespace=?1",
+                [&job.id],
+                |r| r.get(0),
+            )?
+        };
+        let mut replacements = Vec::new();
+        let mut scanned = 0;
+        // Both R1 entry kinds use scoped_entries(namespace,kind,seq). Each
+        // bounded keyset read releases the mutex before JSON/CPU work. The
+        // high water excludes later inserts; another feed/lifecycle mutation
+        // changes the job revision and cancels the entire prepared result.
+        for kind in ["note", "memory"] {
+            let mut after = 0;
+            loop {
+                let rows = {
+                    let inner = self.inner.lock().expect("store");
+                    inner.live(job)?;
+                    check_lease(start, until)?;
+                    let mut stmt = inner.db.prepare("SELECT seq,id,data FROM entries WHERE namespace=?1 AND kind=?2 AND seq>?3 AND seq<=?4 ORDER BY seq LIMIT 32")?;
+                    stmt.query_map(params![job.id, kind, after, high_water], |r| {
+                        Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?))
+                    })?
+                    .collect::<rusqlite::Result<Vec<_>>>()?
+                };
+                let Some(last) = rows.last() else {
+                    break;
+                };
+                after = last.0;
+                scanned += rows.len();
+                ensure!(scanned <= 10000, "namespace full");
+                let absent = absent.clone();
+                let note_ids = note_ids.clone();
+                replacements.extend(
+                    tokio::task::spawn_blocking(move || prepare_entries(kind, rows, &absent, &note_ids)).await??,
+                );
+            }
+        }
+        Ok(InventoryPlan {
+            absent: absent.iter().cloned().collect(),
+            note_ids: note_ids.iter().cloned().collect(),
+            replacements,
+        })
+    }
+    fn commit_inventory(
+        &self,
+        job: &Job,
+        plan: InventoryPlan,
+        resume: String,
+        start: Instant,
+        until: i64,
+    ) -> Result<()> {
+        let absent = serde_json::to_string(&plan.absent)?;
+        let note_ids = serde_json::to_string(&plan.note_ids)?;
@@ -505,0 +614,2 @@ impl Store {
+        // Only the atomic SQL commit holds the shared mutex. No JSON parsing,
+        // source-by-memory scans or FTS reinsertion for unchanged text occur.
@@ -507,22 +617,16 @@ impl Store {
-        let old = {
-            let mut stmt = tx.prepare("SELECT session FROM sources WHERE namespace=?1")?;
-            stmt.query_map([&job.id], |r| r.get::<_, String>(0))?
-                .collect::<rusqlite::Result<Vec<_>>>()?
-        };
-        for id in old {
-            if !ids.contains(&id) {
-                remove_source(&tx, &job.id, &id)?;
-            }
-        }
-        let retained = {
-            let mut stmt = tx.prepare("SELECT data FROM entries WHERE namespace=?1 AND kind='note'")?;
-            stmt.query_map([&job.id], |r| r.get::<_, String>(0))?
-                .collect::<rusqlite::Result<Vec<_>>>()?
-        };
-        for data in retained {
-            let mut entry: Entry = serde_json::from_str(&data)?;
-            entry.stale = true;
-            for turn in &mut entry.turns {
-                turn.gaps = true;
-            }
-            put(&tx, &job.id, &entry)?;
+        tx.execute(
+            "DELETE FROM entries WHERE namespace=?1 AND kind='note' AND id IN (SELECT value FROM json_each(?2))",
+            params![job.id, note_ids],
+        )?;
+        tx.execute(
+            "DELETE FROM sources WHERE namespace=?1 AND session IN (SELECT value FROM json_each(?2))",
+            params![job.id, absent],
+        )?;
+        for (id, data) in plan.replacements {
+            ensure!(
+                tx.execute(
+                    "UPDATE entries SET data=?3 WHERE namespace=?1 AND id=?2",
+                    params![job.id, id, data]
+                )? == 1,
+                "reset snapshot changed"
+            );
@@ -877,0 +982,37 @@ fn render_note(entry: &mut Entry) -> Result<()> {
+fn prepare_entries(
+    kind: &str,
+    rows: Vec<(i64, String, String)>,
+    absent: &std::collections::BTreeSet<String>,
+    note_ids: &std::collections::BTreeSet<String>,
+) -> Result<Vec<(String, String)>> {
+    let mut changes = Vec::new();
+    for (_, id, data) in rows {
+        if kind == "note" && note_ids.contains(&id) {
+            continue;
+        }
+        let mut entry: Entry = serde_json::from_str(&data)?;
+        let changed = if kind == "note" {
+            entry.stale = true;
+            for turn in &mut entry.turns {
+                turn.gaps = true;
+            }
+            true
+        } else {
+            let refs = entry.source_refs.len();
+            let provenance = entry.provenance.len();
+            entry.source_refs.retain(|r| !absent.contains(&r.session_id));
+            entry
+                .provenance
+                .retain(|p| !matches!(p, Provenance::Source { source, .. } if absent.contains(&source.session_id)));
+            let changed = refs != entry.source_refs.len() || provenance != entry.provenance.len();
+            if changed && entry.provenance.is_empty() {
+                entry.provenance.push(Provenance::Unverified {});
+            }
+            changed
+        };
+        if changed {
+            changes.push((id, serde_json::to_string(&entry)?));
+        }
+    }
+    Ok(changes)
+}
@@ -965,0 +1107,99 @@ pub async fn worker(store: Arc<Store>, key: Arc<MasterKey>) {
+
+#[cfg(test)]
+mod reset_tests {
+    use super::*;
+    fn fixture() -> (tempfile::TempDir, Store, crate::store::Credentials, MasterKey) {
+        let dir = tempfile::tempdir().unwrap();
+        let store = Store::open(&dir.path().join("memory.db")).unwrap();
+        let credentials = store.create("owner", "hat").unwrap();
+        let key = MasterKey::from_bytes([9; 32]);
+        store
+            .attach(
+                &credentials.namespace,
+                FeedConfig {
+                    collector_url: "http://localhost/".into(),
+                    namespace_epoch: "a".repeat(64),
+                    activity_token: format!("hnry_activity_{}", "b".repeat(64)),
+                    activity: true,
+                    internal_network: true,
+                },
+                &key,
+            )
+            .unwrap();
+        (dir, store, credentials, key)
+    }
+    #[tokio::test]
+    async fn prepared_inventory_checks_revision_before_commit() {
+        let (_dir, store, c, key) = fixture();
+        let job = store.job(&key, &c.namespace).unwrap();
+        let start = Instant::now();
+        let until = unix_now() + 60;
+        let plan = store
+            .prepare_inventory(&job, Default::default(), start, until)
+            .await
+            .unwrap();
+        store
+            .forget(
+                &c.lifecycle,
+                Forget {
+                    request_id: "fence".into(),
+                    namespace_epoch: job.epoch.clone(),
+                    target: Target::Session {
+                        session_id: "cancelled".into(),
+                    },
+                },
+            )
+            .unwrap();
+        assert!(
+            store
+                .commit_inventory(&job, plan, "stale".into(), start, until)
+                .is_err()
+        );
+        assert!(
+            store
+                .inner
+                .lock()
+                .unwrap()
+                .db
+                .query_row("SELECT cursor FROM feeds WHERE namespace=?1", [&c.namespace], |r| {
+                    r.get::<_, Option<String>>(0)
+                })
+                .unwrap()
+                .is_none()
+        );
+        assert!(store.available(&c.tool, false).is_err());
+    }
+    #[tokio::test]
+    async fn prepared_inventory_checks_lease_before_commit() {
+        let (_dir, store, c, key) = fixture();
+        let job = store.job(&key, &c.namespace).unwrap();
+        let plan = store
+            .prepare_inventory(&job, Default::default(), Instant::now(), unix_now() + 60)
+            .await
+            .unwrap();
+        assert!(
+            store
+                .commit_inventory(
+                    &job,
+                    plan,
+                    "expired".into(),
+                    Instant::now() - Duration::from_secs(61),
+                    unix_now() + 60
+                )
+                .is_err()
+        );
+        assert!(
+            store
+                .inner
+                .lock()
+                .unwrap()
+                .db
+                .query_row("SELECT cursor FROM feeds WHERE namespace=?1", [&c.namespace], |r| {
+                    r.get::<_, Option<String>>(0)
+                })
+                .unwrap()
+                .is_none()
+        );
+        assert!(store.available(&c.tool, false).is_err());
+    }
+}
diff --git a/crates/hennery-memory/tests/consumer.rs b/crates/hennery-memory/tests/consumer.rs
index e640e93b..af18efd7 100644
--- a/crates/hennery-memory/tests/consumer.rs
+++ b/crates/hennery-memory/tests/consumer.rs
@@ -911,0 +912,329 @@ async fn inventory_pages_are_paced_with_room_for_lease_and_activity_requests() {
+
+#[tokio::test]
+async fn deletion_at_seen_capacity_commits_and_current_page_replay_stays_idempotent() {
+    let w = World::new(60).await;
+    w.set(
+        vec![turn("deleted-source", "initial", "deletion-capacity-marker", op())],
+        "before",
+    );
+    w.poll().await.unwrap();
+    w.raw().execute(
+        "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<99999) INSERT INTO seen(namespace,event_key,digest) SELECT ?1,'historical-'||x,?2 FROM n",
+        rusqlite::params![w.c.namespace, "f".repeat(64)],
+    ).unwrap();
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM seen WHERE namespace=?1", [&w.c.namespace], |r| {
+                r.get::<_, i64>(0)
+            })
+            .unwrap(),
+        100000
+    );
+    // The old event is deliberately first, so pruning must refresh its replay evidence too.
+    w.set(vec![turn("deleted-source", "initial", "deletion-capacity-marker", op()),json!({"kind":"session_removed","event_key":"removed","session_id":"deleted-source","namespace_epoch":w.remote.epoch,"provenance":[]})], "after");
+    w.raw().execute_batch("CREATE TRIGGER fail_seen_prune BEFORE DELETE ON seen WHEN OLD.event_key LIKE 'historical-%' BEGIN SELECT RAISE(ABORT,'fixture'); END;").unwrap();
+    assert!(w.poll().await.is_err());
+    assert_eq!(w.cursor().as_deref(), Some("before"));
+    assert_eq!(
+        w.raw()
+            .query_row(
+                "SELECT count(*) FROM entries WHERE namespace=?1",
+                [&w.c.namespace],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        1
+    );
+    w.raw().execute_batch("DROP TRIGGER fail_seen_prune").unwrap();
+    w.poll()
+        .await
+        .expect("deletion must commit even with a full deduplication ledger");
+    assert_eq!(w.cursor().as_deref(), Some("after"));
+    assert_eq!(
+        w.raw()
+            .query_row(
+                "SELECT count(*) FROM entries WHERE namespace=?1",
+                [&w.c.namespace],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT count(*) FROM seen WHERE namespace=?1", [&w.c.namespace], |r| {
+                r.get::<_, i64>(0)
+            })
+            .unwrap(),
+        100000
+    );
+    let revision: i64 = w
+        .raw()
+        .query_row("SELECT revision FROM feeds WHERE namespace=?1", [&w.c.namespace], |r| {
+            r.get(0)
+        })
+        .unwrap();
+    w.poll().await.unwrap();
+    assert!(
+        w.s.search(&w.c.tool, &Query::search("deletion-capacity-marker"))
+            .unwrap()
+            .entries
+            .is_empty()
+    );
+    let mut changed = turn("deleted-source", "initial", "changed", op());
+    changed["event_key"] = json!("initial");
+    w.set(vec![changed], "forged");
+    assert!(w.poll().await.is_err());
+    assert_eq!(w.cursor().as_deref(), Some("after"));
+    assert_eq!(
+        w.raw()
+            .query_row("SELECT revision FROM feeds WHERE namespace=?1", [&w.c.namespace], |r| r
+                .get::<_, i64>(0))
+            .unwrap(),
+        revision + 1
+    );
+    // A pruned event cannot be admitted under the already committed cursor.
+    w.set(
+        vec![turn("new", "historical-1", "must not replay pruned history", op())],
+        "after",
+    );
+    assert!(w.poll().await.is_err());
+    assert_eq!(
+        w.raw()
+            .query_row(
+                "SELECT count(*) FROM entries WHERE namespace=?1",
+                [&w.c.namespace],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn mixed_inventory_reset_is_linear_and_other_namespaces_keep_making_progress() {
+    let w = Arc::new(World::new(60).await);
+    w.set(
+        vec![
+            turn("gone-0", "initial", "removed-note", op()),
+            turn("kept", "kept", "retained-note", op()),
+        ],
+        "before",
+    );
+    w.poll().await.unwrap();
+    w.s.remember(
+        &w.c.tool,
+        serde_json::from_value(json!({"title":"assertion","body":"x".repeat(16000),"idempotency_key":"seed"})).unwrap(),
+    )
+    .unwrap();
+    let other = w.s.create("owner", "other").unwrap();
+    let mut db = w.raw();
+    let note: String = db
+        .query_row(
+            "SELECT data FROM entries WHERE namespace=?1 AND id=?2",
+            rusqlite::params![w.c.namespace, hennery_kernel::secret::sha256_hex(b"native-note:gone-0")],
+            |r| r.get(0),
+        )
+        .unwrap();
+    let memory: String = db
+        .query_row(
+            "SELECT data FROM entries WHERE namespace=?1 AND kind='memory'",
+            [&w.c.namespace],
+            |r| r.get(0),
+        )
+        .unwrap();
+    let other_id = other.namespace.clone();
+    let tx = db.transaction().unwrap();
+    for (data, kind) in [(&note, "note"), (&memory, "memory")] {
+        let mut entry: Value = serde_json::from_str(data).unwrap();
+        if kind == "memory" {
+            entry["id"] = json!(hennery_kernel::secret::sha256_hex(b"memory:0"));
+            entry["body"] = json!("foreign-assertion");
+        }
+        tx.execute(
+            "INSERT INTO entries(namespace,id,kind,title,body,data) VALUES(?1,?2,?3,?4,?5,?6)",
+            rusqlite::params![
+                other_id,
+                entry["id"].as_str().unwrap(),
+                kind,
+                entry["title"].as_str().unwrap(),
+                entry["body"].as_str().unwrap(),
+                entry.to_string()
+            ],
+        )
+        .unwrap();
+    }
+    tx.execute(
+        "INSERT INTO sources(namespace,session,event_key) VALUES(?1,'gone-0','foreign')",
+        [&other_id],
+    )
+    .unwrap();
+    tx.execute(
+        "DELETE FROM entries WHERE namespace=?1 AND kind='memory'",
+        [&w.c.namespace],
+    )
+    .unwrap();
+    for i in 0..1500 {
+        let session = format!("gone-{i}");
+        if i > 0 {
+            let mut e: Value = serde_json::from_str(&note.replace("gone-0", &session)).unwrap();
+            e["id"] = json!(hennery_kernel::secret::sha256_hex(
+                format!("native-note:{session}").as_bytes()
+            ));
+            tx.execute(
+                "INSERT INTO entries(namespace,id,kind,title,body,data) VALUES(?1,?2,'note',?3,?4,?5)",
+                rusqlite::params![
+                    w.c.namespace,
+                    e["id"].as_str().unwrap(),
+                    e["title"].as_str().unwrap(),
+                    e["body"].as_str().unwrap(),
+                    e.to_string()
+                ],
+            )
+            .unwrap();
+            tx.execute(
+                "INSERT INTO sources(namespace,session,event_key) VALUES(?1,?2,?3)",
+                rusqlite::params![w.c.namespace, session, format!("initial-{i}")],
+            )
+            .unwrap();
+        }
+        let mut e: Value = serde_json::from_str(&memory).unwrap();
+        e["id"] = json!(hennery_kernel::secret::sha256_hex(format!("memory:{i}").as_bytes()));
+        let gone = json!({"session_id":session,"turn_id":"initial","event_id":7});
+        let kept = json!({"session_id":"kept","turn_id":"kept","event_id":7});
+        e["source_refs"] = json!([gone, kept]);
+        if i == 0 {
+            // Dangling provenance must be removed even without a matching ref.
+            e["source_refs"] = json!([kept]);
+        }
+        e["provenance"] =
+            json!([{"kind":"source","origin":op(),"source":gone},{"kind":"source","origin":op(),"source":kept}]);
+        if i == 1 {
+            e["source_refs"] = json!([gone]);
+            e["provenance"] = json!([{"kind":"source","origin":op(),"source":gone}]);
+        } else if i == 2 {
+            e["source_refs"] = json!([kept]);
+            e["provenance"] = json!([{"kind":"source","origin":op(),"source":kept}]);
+        }
+        tx.execute(
+            "INSERT INTO entries(namespace,id,kind,title,body,data) VALUES(?1,?2,'memory',?3,?4,?5)",
+            rusqlite::params![
+                w.c.namespace,
+                e["id"].as_str().unwrap(),
+                e["title"].as_str().unwrap(),
+                e["body"].as_str().unwrap(),
+                e.to_string()
+            ],
+        )
+        .unwrap();
+    }
+    tx.commit().unwrap();
+    w.remote.status.store(409, Ordering::SeqCst);
+    *w.remote.inventory.lock().unwrap() = vec![
+        json!({"version":1,"source_ids":["kept"],"next_cursor":null,"resume_cursor":"fresh","watermark":"fresh","lease_until":unix_now()+60}),
+    ];
+    db.execute_batch("CREATE TRIGGER fail_inventory BEFORE UPDATE ON feeds BEGIN SELECT RAISE(ABORT,'fixture'); END;")
+        .unwrap();
+    assert!(w.poll().await.is_err());
+    db.execute_batch("DROP TRIGGER fail_inventory").unwrap();
+    assert_eq!(w.cursor().as_deref(), Some("before"));
+    assert_eq!(
+        db.query_row(
+            "SELECT count(*) FROM entries WHERE namespace=?1 AND kind='note'",
+            [&w.c.namespace],
+            |r| r.get::<_, i64>(0)
+        )
+        .unwrap(),
+        1501
+    );
+    assert!(w.s.available(&w.c.tool, false).is_err());
+    let done = Arc::new(AtomicBool::new(false));
+    let reader = {
+        let s = w.s.clone();
+        let done = done.clone();
+        tokio::task::spawn_blocking(move || {
+            let mut worst = Duration::ZERO;
+            let mut reads = 0;
+            while !done.load(Ordering::SeqCst) {
+                let t = std::time::Instant::now();
+                let page = s.recent(&other.tool, &Query::default()).unwrap();
+                assert_eq!(page.entries.len(), 1);
+                let memories = s.search(&other.tool, &Query::search("foreign")).unwrap();
+                assert_eq!(memories.entries.len(), 1);
+                assert_eq!(memories.entries[0].body, "foreign-assertion");
+                worst = worst.max(t.elapsed());
+                reads += 1;
+                std::thread::sleep(Duration::from_millis(2));
+            }
+            (worst, reads)
+        })
+    };
+    let begin = std::time::Instant::now();
+    let result = w.poll().await;
+    done.store(true, Ordering::SeqCst);
+    let (worst, reads) = reader.await.unwrap();
+    eprintln!(
+        "mixed reset 1500 notes + 1500 16KiB memories: {:?}; other namespace worst {:?}, reads {reads}",
+        begin.elapsed(),
+        worst
+    );
+    result.expect("mixed reset must fit the lease");
+    assert!(
+        begin.elapsed() < Duration::from_secs(12),
+        "linear reset must finish well within its 60s lease"
+    );
+    assert!(
+        worst < Duration::from_secs(3),
+        "other namespaces must not wait for the entire reset"
+    );
+    assert!(reads > 1);
+    assert_eq!(w.cursor().as_deref(), Some("fresh"));
+    let db = w.raw();
+    assert_eq!(
+        db.query_row("SELECT count(*) FROM sources WHERE namespace=?1", [&other_id], |r| r
+            .get::<_, i64>(0))
+            .unwrap(),
+        1
+    );
+    assert_eq!(
+        db.query_row(
+            "SELECT count(*) FROM sources WHERE namespace=?1",
+            [&w.c.namespace],
+            |r| r.get::<_, i64>(0)
+        )
+        .unwrap(),
+        1
+    );
+    assert_eq!(
+        db.query_row(
+            "SELECT count(*) FROM entries WHERE namespace=?1 AND kind='note'",
+            [&w.c.namespace],
+            |r| r.get::<_, i64>(0)
+        )
+        .unwrap(),
+        1
+    );
+    let mut stmt = db
+        .prepare("SELECT data FROM entries WHERE namespace=?1 AND kind='memory'")
+        .unwrap();
+    let entries = stmt.query_map([&w.c.namespace], |r| r.get::<_, String>(0)).unwrap();
+    let mut count = 0;
+    for e in entries {
+        let e: hennery_memory::store::Entry = serde_json::from_str(&e.unwrap()).unwrap();
+        assert_eq!(e.body.len(), 16000);
+        if e.id == hennery_kernel::secret::sha256_hex(b"memory:1") {
+            assert!(e.source_refs.is_empty());
+            assert!(matches!(
+                e.provenance.as_slice(),
+                [hennery_proto::plugin::Provenance::Unverified {}]
+            ));
+        } else {
+            assert_eq!(e.source_refs.len(), 1);
+            assert_eq!(e.source_refs[0].session_id, "kept");
+        }
+        assert_eq!(e.provenance.len(), 1);
+        count += 1;
+    }
+    assert_eq!(count, 1500);
+    assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().stale);
+}
diff --git a/crates/hennery-memory/tests/sql_scope.rs b/crates/hennery-memory/tests/sql_scope.rs
index e91464d8..5a873e1a 100644
--- a/crates/hennery-memory/tests/sql_scope.rs
+++ b/crates/hennery-memory/tests/sql_scope.rs
@@ -123,0 +124,16 @@ fn every_memory_statement_prepares_and_scopes_before_data_access() {
+                if sql.starts_with("SELECT seq,id,data FROM entries ") {
+                    let mut stmt = db.prepare(&format!("EXPLAIN QUERY PLAN {sql}")).unwrap();
+                    let descriptions = stmt
+                        .query_map(["scope", "memory", "0", "10000"], |r| r.get::<_, String>(3))
+                        .unwrap()
+                        .collect::<rusqlite::Result<Vec<_>>>()
+                        .unwrap();
+                    assert!(
+                        descriptions.iter().any(|s| s.contains("scoped_entries")),
+                        "reset keyset reads need the namespace/kind/seq index: {descriptions:?}"
+                    );
+                    assert!(
+                        !descriptions.iter().any(|s| s.contains("TEMP B-TREE")),
+                        "reset chunks must not sort the entire corpus: {descriptions:?}"
+                    );
+                }
@@ -159 +175 @@ fn every_memory_statement_prepares_and_scopes_before_data_access() {
-    assert_eq!(count, [8, 44], "new statements need explicit audit coverage");
+    assert_eq!(count, [8, 51], "new statements need explicit audit coverage");
```

## After this plan

Parent: independent security review, Linux/macOS CI and full PR status (checks, reviewDecision, mergeStateStatus, unresolved threads). R2 adds management UI, import/export and deliberate edits; R3 optional models; C2 startup delivery remains independent. Signed session attestation remains a separately reviewed generic extension. External deletion acknowledgements are service claims; offline copies remain explicitly unconfirmed.

Generated with Claude AI — please review before distribution.
