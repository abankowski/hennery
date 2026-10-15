# Plug-in inventory paging (C1b) Implementation Plan

> **For agentic workers:** Execute one task at a time using the house plan 3c structure. The superpowers skills are unavailable in this session; the worktree's AGENTS.md requires following their build-first, test-first, exact-embedding and fresh-replay workflow by hand.

**Goal:** A registered opt-in plug-in can reconcile a 10,000-source reset within the existing registration request and byte budgets. Inventory pages carry source ids only; completed activity retains its own smaller content limit. The generic core remains independent of any memory implementation.

**Architecture:** C1's optional control database retains scoped inventory snapshots. Its second append-only inventory migration adds an immutable absolute deadline. Each successful page atomically renews idle expiry, retains the original watermark/resume cursor, and checks the complete typed response's byte size. HTTP and session-store inventory validation use the independent inventory cap.

**Base:** `7fe43fbe` (merged C2). **Branch:** `plan/plugin-c1b`.

## Execution status (2026-10-15)

Built before this plan was embedded. Task 1 is `31303d4e`; task 2 is `de5048d8`; refusal/rollback coverage and spec precision are `3a937412`. All six Rust checks passed (2,383 tests, one ignored), native Nix passed, the fresh replay matched 790 tracked files and all 23 removal probes were detected. The detailed execution record below distinguishes the initial coverage gaps and their fixes. Independent review and Linux/macOS PR CI belong to the parent and have not been claimed here.

## Scope

Two implementation tasks, followed by the plan execution record:

1. Scoped, renewable, byte-bounded inventory snapshots and deterministic migration/clock regressions.
2. Separate inventory query/store limits, a real HTTP 10,000-source reset, shared-budget verification and spec write-back.

In: the generic C1 inventory path and its tests. Out: activity projection, registration authority, namespace identity, deletion semantics, MCP tools, startup context, UI, models and publication. The reference recall service consumes this contract in a separately scoped branch.

## Decisions this plan makes where the spec is silent

The **parent, on the maintainer's behalf, 2026-10-15**, authorized this separate C1b scope and these bounds. This records the ruling; it is not an implementer's security approval.

| Decision | Choice and reason | Cost if wrong |
|---|---|---|
| Inventory count | Default/max 500 source ids, independent of content's default/max 20. A 10,000-source inventory takes 20 requests, leaving request-budget room for leases and the resume. | Larger id-only responses; the complete 128-KiB response limit still applies. |
| Idle lease | Successful inventory pages renew 60 seconds of idle expiry; refusal rolls renewal back. | A client must restart after an idle stall. |
| Absolute lifetime | Immutable 20-minute deadline from creation, within the authorized 15–30-minute range. At 500 ids/request and the existing 60 requests/minute budget it permits up to 600,000 ordinary ids in 20 minutes while bounding usable snapshot lifetime. | A reset taking longer must restart; consumers may not apply a partial reconciliation. |
| Migration | Append inventory migration 2. Existing snapshots receive deadline 0 and return explicit `reset_required`. | An in-flight legacy reset restarts once after upgrade. |
| Wire contract | Version 1, cursor format, watermark and resume identity unchanged. Invalid query stays 400; expired snapshots stay 409 `reset_required`; the existing 60-request/minute and 8-MiB registration budgets stay shared. | Consumers must use the latest authenticated page lease and handle reset atomically. |

## Global Constraints

- Inventory contains authenticated source ids only, with no transcript backfill.
- Preserve owner, hat, connection, epoch and snapshot checks before retrieval/renewal. Scope is derived from the authenticated grant, never the query.
- Keep the original snapshot watermark and resume cursor even if a session is deleted during paging. The subsequent activity cursor observes the tombstone.
- Apply count and escaped JSON byte bounds before delivery. No page may exceed 128 KiB including its envelope and cursors. An unrepresentable item/cursor fails explicitly.
- Renew only in a transaction that produces a valid page; cap renewal at the immutable deadline. Both expiry comparisons are strict.
- Expiry invalidates access. Physical source-id rows retain C1's existing cleanup on snapshot replacement or lifecycle completion; this plan adds no background sweeper.
- Build/test inside `nix develop`. Never share target directories. Clone `target/` with `cp -c -R` into each isolated replay/probe copy.
- Run removal probes in copies only. Use one fresh end-of-plan replay; use 4×3 load only for the actual concurrency test, not deterministic simulated clocks. One full workspace test run per plan.
- Commit with personal Gmail author and signing disabled. One SSH push attempt per finished task; no GitHub action by the child. Parent owns PR creation, independent review and merge.

## Review Focus

Review `7fe43fbe..HEAD` for auth/scope isolation; renewal rollback and absolute expiry; migration compatibility; escaped-byte accounting and cursor continuity; inventory/content endpoint separation; and unchanged shared budgets. Independently verify the 10,000-source proof does not silently skip ids or backfill content. No self-approval is recorded.

## File structure

| File | Responsibility |
|---|---|
| `crates/hennery-gateway/src/plugin/feed.rs` | Inventory migration, caps, transactional scoped renewal and bounded page construction |
| `crates/hennery-gateway/src/plugin_api.rs` | Shared strict query decoder with independent inventory/content maxima |
| `crates/hennery-sessions/src/plugin.rs` | Inventory-only store validation |
| `crates/hennery-sessions/src/plugin_api.rs` | Choose the endpoint's decoder |
| `crates/hennery-testkit/tests/plugin_feed.rs` | Deterministic expiry, migration, identity, escaped-size and continuity regressions |
| `crates/hennery-testkit/tests/plugin_http.rs` | HTTP endpoint separation, 10,000-source/20-page reset and shared request budget |
| `docs/specs/2026-10-14-memory-design.md` | Generic inventory contract write-back |
| `docs/README.md` | Plan index and execution status |

### Task 1: Scoped renewable inventory snapshots

- [x] Build the regression tests first. On the base, `cargo test -p hennery-testkit --test plugin_feed inventory_ --locked` exits 101 with runtime assertion failures: missing renewal/absolute expiry, legacy reset, count and escaped-byte bounds.
- [x] Apply the exact test patch below before the implementation patch.

Run before and after the implementation patch:

```sh
nix develop -c cargo test -p hennery-testkit --test plugin_feed inventory_ --locked
```

Expected: runtime assertion failures with exit 101 before the fix; all inventory tests pass with exit 0 after it. Then run the complete feed and owner-audit targets:

```sh
nix develop -c cargo test -p hennery-testkit --test plugin_feed --test owner_filter --locked
```

<!-- replay: task1-tests.patch -->
```diff
diff --git a/crates/hennery-testkit/tests/plugin_feed.rs b/crates/hennery-testkit/tests/plugin_feed.rs
index 9ca68f6f5d668a28a090028e6834f038a3669f95..8b7b809fba481f19ba7e659f33c285dd7594afec 100644
--- a/crates/hennery-testkit/tests/plugin_feed.rs
+++ b/crates/hennery-testkit/tests/plugin_feed.rs
@@ -13,0 +14,188 @@ use serde_json::json;
+fn inventory_begin(w: &World, now: i64, ids: Vec<String>) -> String {
+    w.core(|core| {
+        let control = w.gateway.plugins();
+        let grant = control.authenticate_in(core, &w.token, now).unwrap().unwrap();
+        control
+            .begin_inventory_in(core, &grant, 0, ids.into_iter().map(Ok), now)
+            .unwrap()
+    })
+}
+fn inventory_slice(
+    w: &World,
+    cursor: &str,
+    limit: usize,
+    now: i64,
+) -> anyhow::Result<hennery_gateway::plugin::feed::InventorySlice> {
+    w.core(|core| {
+        let control = w.gateway.plugins();
+        let grant = control.authenticate_in(core, &w.token, now)?.unwrap();
+        control.inventory_slice_in(core, &grant, cursor, limit, now)
+    })
+}
+
+#[test]
+fn inventory_pages_renew_idle_expiry_without_changing_watermark() {
+    let w = World::new(true);
+    let cursor = inventory_begin(&w, 1000, vec!["source".into()]);
+    let first = inventory_slice(&w, &cursor, 1, 1059).unwrap();
+    assert_eq!(first.expires, 1119);
+    let second = inventory_slice(&w, &cursor, 1, 1118).unwrap();
+    assert_eq!(second.expires, 1178);
+    assert_eq!(first.resume_cursor, second.resume_cursor);
+    assert_eq!(first.watermark, second.watermark);
+}
+
+#[test]
+fn inventory_idle_and_twenty_minute_absolute_expiry_are_strict() {
+    let w = World::new(true);
+    let idle = inventory_begin(&w, 1000, vec!["source".into()]);
+    assert_eq!(
+        inventory_slice(&w, &idle, 1, 1060).err().unwrap().to_string(),
+        "reset_required"
+    );
+    let cursor = inventory_begin(&w, 1000, vec!["source".into()]);
+    for now in (1050..2200).step_by(50) {
+        let page = inventory_slice(&w, &cursor, 1, now).unwrap();
+        assert_eq!(page.expires, (now + 60).min(2200));
+    }
+    assert_eq!(inventory_slice(&w, &cursor, 1, 2199).unwrap().expires, 2200);
+    assert_eq!(
+        inventory_slice(&w, &cursor, 1, 2200).err().unwrap().to_string(),
+        "reset_required"
+    );
+}
+
+#[test]
+fn inventory_snapshot_identity_and_each_expiry_guard_fail_closed() {
+    for (column, value) in [
+        ("owner_id", "foreign"),
+        ("hat_id", "foreign"),
+        ("connection_id", "foreign"),
+        ("epoch", "foreign"),
+        ("snapshot", "foreign"),
+        ("expires", "0"),
+        ("deadline", "0"),
+    ] {
+        let w = World::new(true);
+        let cursor = inventory_begin(&w, 1000, vec!["source".into()]);
+        let raw = rusqlite::Connection::open(w._dir.path().join("plugin-control.db")).unwrap();
+        // On v1 there is no absolute deadline; this case intentionally shows
+        // the missing guard as successful access rather than a fixture error.
+        let has_column = raw
+            .prepare("PRAGMA table_info(plugin_inventory)")
+            .unwrap()
+            .query_map([], |r| r.get::<_, String>(1))
+            .unwrap()
+            .collect::<rusqlite::Result<Vec<_>>>()
+            .unwrap()
+            .iter()
+            .any(|c| c == column);
+        if has_column {
+            raw.execute(&format!("UPDATE plugin_inventory SET {column}=?1"), [value])
+                .unwrap();
+        }
+        assert_eq!(
+            inventory_slice(&w, &cursor, 1, 1001).err().unwrap().to_string(),
+            "reset_required",
+            "{column}"
+        );
+    }
+}
+
+#[test]
+fn inventory_legacy_snapshot_expires_conservatively_on_upgrade() {
+    let w = World::new(true);
+    let cursor = inventory_begin(&w, 1000, vec!["source".into()]);
+    let raw = rusqlite::Connection::open(w._dir.path().join("plugin-control.db")).unwrap();
+    let columns = raw
+        .prepare("PRAGMA table_info(plugin_inventory)")
+        .unwrap()
+        .query_map([], |r| r.get::<_, String>(1))
+        .unwrap()
+        .collect::<rusqlite::Result<Vec<_>>>()
+        .unwrap();
+    if columns.iter().any(|c| c == "deadline") {
+        raw.execute_batch("ALTER TABLE plugin_inventory DROP COLUMN deadline")
+            .unwrap();
+    }
+    raw.execute(
+        "UPDATE schema_versions SET version=1 WHERE component='plugin_inventory'",
+        [],
+    )
+    .unwrap();
+    assert_eq!(
+        inventory_slice(&w, &cursor, 1, 1001).err().unwrap().to_string(),
+        "reset_required"
+    );
+}
+
+#[test]
+fn inventory_count_and_escaped_byte_limits_never_skip_sources() {
+    let w = World::new(true);
+    let expected = (0..700)
+        .map(|i| format!("{i:04}{}", "\0".repeat(64)))
+        .collect::<Vec<_>>();
+    let mut cursor = Some(inventory_begin(&w, 1000, expected.clone()));
+    let mut found = Vec::new();
+    let mut pages = 0;
+    while let Some(after) = cursor {
+        let slice = inventory_slice(&w, &after, 500, 1001).unwrap();
+        let page = hennery_proto::plugin::PluginSourceInventoryPage {
+            version: 1,
+            source_ids: slice.source_ids,
+            next_cursor: slice.next_cursor,
+            resume_cursor: slice.resume_cursor.clone(),
+            watermark: slice.resume_cursor,
+            lease_until: slice.expires,
+        };
+        assert!(page.source_ids.len() < 500, "escaped bytes must bind before count");
+        assert!(serde_json::to_vec(&page).unwrap().len() <= 128 * 1024);
+        assert!(!page.source_ids.is_empty());
+        found.extend(page.source_ids);
+        cursor = page.next_cursor;
+        pages += 1;
+        assert!(pages <= 4);
+    }
+    assert_eq!(found, expected);
+}
+
+#[test]
+fn inventory_slice_rejects_zero_oversized_and_unrepresentable_pages() {
+    let w = World::new(true);
+    let cursor = inventory_begin(&w, 1000, vec!["source".into()]);
+    for limit in [0, 501, usize::MAX] {
+        assert!(inventory_slice(&w, &cursor, limit, 1001).is_err(), "{limit}");
+    }
+    let cursor = inventory_begin(&w, 1000, vec!["x".repeat(128 * 1024)]);
+    assert_eq!(
+        inventory_slice(&w, &cursor, 500, 1001).err().unwrap().to_string(),
+        "reset_required"
+    );
+}
+
+#[test]
+fn inventory_oversized_cursor_and_envelope_fail_without_renewing_the_snapshot() {
+    let w = World::new(true);
+    let cursor = inventory_begin(&w, 1000, vec!["x".repeat(1400), "z".into()]);
+    assert_eq!(
+        inventory_slice(&w, &cursor, 1, 1059).err().unwrap().to_string(),
+        "reset_required"
+    );
+    let raw = rusqlite::Connection::open(w._dir.path().join("plugin-control.db")).unwrap();
+    let expires: i64 = raw
+        .query_row("SELECT expires FROM plugin_inventory", [], |r| r.get(0))
+        .unwrap();
+    assert_eq!(expires, 1060, "a refused cursor must not renew idle expiry");
+    let cursor = inventory_begin(&w, 1000, vec!["source".into()]);
+    raw.execute("UPDATE plugin_inventory SET resume_cursor=?1", ["x".repeat(128 * 1024)])
+        .unwrap();
+    assert_eq!(
+        inventory_slice(&w, &cursor, 1, 1059).err().unwrap().to_string(),
+        "reset_required"
+    );
+    let expires: i64 = raw
+        .query_row("SELECT expires FROM plugin_inventory", [], |r| r.get(0))
+        .unwrap();
+    assert_eq!(expires, 1060, "a refused envelope must not renew idle expiry");
+}
+
```

- [x] Append migration 2, enforce bounds and renew only inside a successful scoped page transaction. Re-run the inventory tests: exit 0. Then run the complete feed target and the SQL owner audit.

<!-- replay: task1-code.patch -->
```diff
diff --git a/crates/hennery-gateway/src/plugin/feed.rs b/crates/hennery-gateway/src/plugin/feed.rs
index 9901a2868d224e6b82829de1fa40c83812c272a0..dde67b3de3d0db00b3a0562019aead26988ca101 100644
--- a/crates/hennery-gateway/src/plugin/feed.rs
+++ b/crates/hennery-gateway/src/plugin/feed.rs
@@ -7 +7,10 @@ use serde::{Deserialize, Serialize};
-pub const INVENTORY_MIGRATIONS: &[&str] = &["
+pub const INVENTORY_MAX_IDS: usize = 500;
+pub const INVENTORY_PAGE_BYTES: usize = 128 * 1024;
+const INVENTORY_IDLE_SECS: i64 = 60;
+const INVENTORY_ABSOLUTE_SECS: i64 = 20 * 60;
+// Two cursor strings (each at most 2048 bytes), watermark/resume identity
+// and the envelope fit here. The complete typed page is checked as well.
+const INVENTORY_ENVELOPE_BYTES: usize = 8192;
+
+pub const INVENTORY_MIGRATIONS: &[&str] = &[
+    "
@@ -16 +25,5 @@ CREATE TABLE plugin_inventory_sources (
-"];
+",
+    "
+ALTER TABLE plugin_inventory ADD COLUMN deadline INTEGER NOT NULL DEFAULT 0;
+",
+];
@@ -101,2 +114,2 @@ impl Control {
-                "INSERT INTO plugin_inventory(owner_id,hat_id,connection_id,epoch,snapshot,watermark,expires,resume_cursor)
-                VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
+                "INSERT INTO plugin_inventory(owner_id,hat_id,connection_id,epoch,snapshot,watermark,expires,resume_cursor,deadline)
+                VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
@@ -110,2 +123,3 @@ impl Control {
-                    now.saturating_add(60),
-                    resume
+                    now.saturating_add(INVENTORY_IDLE_SECS),
+                    resume,
+                    now.saturating_add(INVENTORY_ABSOLUTE_SECS)
@@ -141,0 +156,4 @@ impl Control {
+        ensure!(
+            (1..=INVENTORY_MAX_IDS).contains(&limit),
+            "invalid plug-in inventory limit"
+        );
@@ -147,5 +165,23 @@ impl Control {
-            let row: Option<(i64,i64,String)> = conn.query_row("SELECT watermark,expires,resume_cursor FROM plugin_inventory
-                WHERE owner_id = ?1 AND hat_id = ?2 AND connection_id = ?3 AND epoch = ?4 AND snapshot = ?5 AND expires > ?6",
-                params![self.owner,grant.hat_id,grant.connection_id,grant.epoch,position.snapshot,now],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional()?;
-            let (watermark,expires,resume_cursor)=row.context("reset_required")?;
-            let mut stmt=conn.prepare("SELECT session_id FROM plugin_inventory_sources
+            let tx = conn.transaction()?;
+            let row: Option<(i64, i64, String)> = tx
+                .query_row(
+                    "UPDATE plugin_inventory
+                SET expires = min(?7, deadline)
+                WHERE owner_id = ?1 AND hat_id = ?2 AND connection_id = ?3 AND epoch = ?4 AND snapshot = ?5
+                AND expires > ?6 AND deadline > ?6
+                RETURNING watermark,expires,resume_cursor",
+                    params![
+                        self.owner,
+                        grant.hat_id,
+                        grant.connection_id,
+                        grant.epoch,
+                        position.snapshot,
+                        now,
+                        now.saturating_add(INVENTORY_IDLE_SECS)
+                    ],
+                    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+                )
+                .optional()?;
+            let (watermark, expires, resume_cursor) = row.context("reset_required")?;
+            let mut stmt = tx.prepare(
+                "SELECT session_id FROM plugin_inventory_sources
@@ -153,7 +189,64 @@ impl Control {
-                ORDER BY session_id LIMIT ?6")?;
-            let mut ids=stmt.query_map(params![self.owner,grant.hat_id,grant.connection_id,position.snapshot,position.after,limit as i64+1],|r|r.get::<_,String>(0))?.collect::<rusqlite::Result<Vec<_>>>()?;
-            let has_more=ids.len()>limit;
-            ids.truncate(limit);
-            let next_cursor=if has_more {Some(self.inventory_cursor(grant,&Position {snapshot:position.snapshot,after:ids.last().cloned().context("empty inventory page")?})?)} else {None};
-            Ok(InventorySlice {source_ids:ids,next_cursor,watermark,expires,resume_cursor})
-        })?.context("reset_required")
+                ORDER BY session_id LIMIT ?6",
+            )?;
+            let mut rows = stmt.query_map(
+                params![
+                    self.owner,
+                    grant.hat_id,
+                    grant.connection_id,
+                    position.snapshot,
+                    position.after,
+                    limit as i64 + 1
+                ],
+                |r| r.get::<_, String>(0),
+            )?;
+            let mut ids = Vec::new();
+            let mut bytes = 2usize;
+            let mut has_more = false;
+            for id in rows.by_ref() {
+                let id = id?;
+                let weight = serde_json::to_vec(&id)?.len().saturating_add(1);
+                if ids.len() == limit || bytes.saturating_add(weight) > INVENTORY_PAGE_BYTES - INVENTORY_ENVELOPE_BYTES
+                {
+                    has_more = true;
+                    break;
+                }
+                bytes += weight;
+                ids.push(id);
+            }
+            ensure!(!has_more || !ids.is_empty(), "reset_required");
+            let next_cursor = if has_more {
+                Some(self.inventory_cursor(
+                    grant,
+                    &Position {
+                        snapshot: position.snapshot,
+                        after: ids.last().cloned().context("reset_required")?,
+                    },
+                )?)
+            } else {
+                None
+            };
+            ensure!(next_cursor.as_ref().is_none_or(|c| c.len() <= 2048), "reset_required");
+            let page = hennery_proto::plugin::PluginSourceInventoryPage {
+                version: 1,
+                source_ids: ids.clone(),
+                next_cursor: next_cursor.clone(),
+                resume_cursor: resume_cursor.clone(),
+                watermark: resume_cursor.clone(),
+                lease_until: expires,
+            };
+            ensure!(
+                serde_json::to_vec(&page)?.len() <= INVENTORY_PAGE_BYTES,
+                "reset_required"
+            );
+            drop(rows);
+            drop(stmt);
+            tx.commit()?;
+            Ok(InventorySlice {
+                source_ids: ids,
+                next_cursor,
+                watermark,
+                expires,
+                resume_cursor,
+            })
+        })?
+        .context("reset_required")
```

### Task 2: Independent HTTP inventory limits and a complete reset

- [x] Add real HTTP regressions before changing the endpoint. `cargo test -p hennery-testkit --test plugin_http inventory_ --locked` exits 101: inventory limit 500 returns 400 and the default page contains only 20 ids.
- [x] The 10,000-source fixture uses a single prepared-statement seed transaction with historical session-start markers only. Registration then starts at that watermark; the inventory exposes ids without transcript backfill.

Run before and after the endpoint implementation:

```sh
nix develop -c cargo test -p hennery-testkit --test plugin_http inventory_ --locked
```

Expected: 3 pass/2 fail with exit 101 before; 5 pass with exit 0 after. Then run:

```sh
nix develop -c cargo test -p hennery-testkit --test plugin_http --test plugin_feed --test owner_filter --locked
```

Expected: all tests pass, exit 0.

<!-- replay: task2-tests.patch -->
```diff
diff --git a/crates/hennery-testkit/tests/plugin_http.rs b/crates/hennery-testkit/tests/plugin_http.rs
index 847cc6b0e07a3d5f56fba6a998b5a41bff21bb52..77f1a4b089a518284345df6d52c27407d43bedcb 100644
--- a/crates/hennery-testkit/tests/plugin_http.rs
+++ b/crates/hennery-testkit/tests/plugin_http.rs
@@ -83,0 +84,17 @@ impl World {
+    fn seed_inventory(&self, count: usize) {
+        let mut core = hennery_kernel::db::open(&self._dir.path().join("hennery.db")).unwrap();
+        let tx = core.transaction().unwrap();
+        let owner = self.runtime.store.owner_id();
+        let hat = self.runtime.store.connection(&self.id).unwrap().unwrap().hat_id;
+        {
+            let mut session = tx.prepare("INSERT INTO sessions(id,host_id,agent,cwd,lifecycle,created_at,last_event_at,owner_id,hat_id) VALUES(?1,'host','fake','/scratch/project','parked','now','now',?2,?3)").unwrap();
+            let mut event = tx.prepare("INSERT INTO events(session_id,host_seq,kind,body,ts,owner_id) VALUES(?1,1,'session_started','{}','now',?2)").unwrap();
+            for i in 0..count {
+                let id = format!("source-{i:05}");
+                session.execute(rusqlite::params![id, owner, hat]).unwrap();
+                event.execute(rusqlite::params![id, owner]).unwrap();
+            }
+        }
+        tx.commit().unwrap();
+    }
+
@@ -200,0 +218,113 @@ impl World {
+#[tokio::test]
+async fn inventory_query_limit_is_separate_from_content_and_aliases_stay_strict() {
+    let world = World::new().await;
+    let grant = world.register().await;
+    let token = grant["token"].as_str().unwrap();
+    let client = reqwest::Client::new();
+    for query in ["limit=500", "%6cimit=500"] {
+        let response = client
+            .get(format!("{}/api/plugins/inventory?{query}", world.server.base))
+            .bearer_auth(token)
+            .send()
+            .await
+            .unwrap();
+        assert_eq!(response.status(), StatusCode::OK, "{query}");
+        let response = client
+            .get(format!("{}/api/plugins/activity?{query}", world.server.base))
+            .bearer_auth(token)
+            .send()
+            .await
+            .unwrap();
+        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{query}");
+    }
+    for route in ["activity", "inventory"] {
+        for query in [
+            "limit=0",
+            "limit=501",
+            "limit=18446744073709551616",
+            "limit=1&%6cimit=2",
+            "owner=other",
+            "hat_id=other",
+            "token=secret",
+            "after=",
+            "unknown=value",
+        ] {
+            let response = client
+                .get(format!("{}/api/plugins/{route}?{query}", world.server.base))
+                .bearer_auth(token)
+                .send()
+                .await
+                .unwrap();
+            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{route}?{query}");
+            assert_eq!(response.headers()["cache-control"], "no-store");
+            assert_eq!(response.json::<Value>().await.unwrap()["code"], "invalid_query");
+        }
+    }
+}
+
+#[tokio::test]
+async fn inventory_ten_thousand_sources_complete_in_twenty_pages_with_shared_budget() {
+    let world = World::new().await;
+    world.seed_inventory(10_000);
+    let grant = world.register().await;
+    let token = grant["token"].as_str().unwrap();
+    let client = reqwest::Client::new();
+    assert_eq!(world.lease(token).await.status(), StatusCode::OK);
+    let mut after = None;
+    let mut seen = Vec::new();
+    let mut stable = None;
+    let mut pages = 0;
+    loop {
+        let mut request = client
+            .get(format!("{}/api/plugins/inventory", world.server.base))
+            .bearer_auth(token);
+        if let Some(cursor) = &after {
+            request = request.query(&[("after", cursor)]);
+        }
+        let response = request.send().await.unwrap();
+        assert_eq!(response.status(), StatusCode::OK);
+        assert_eq!(response.headers()["cache-control"], "no-store");
+        let body = response.bytes().await.unwrap();
+        assert!(body.len() <= 128 * 1024);
+        let page: Value = serde_json::from_slice(&body).unwrap();
+        assert_eq!(page["source_ids"].as_array().unwrap().len(), 500);
+        let pair = (page["watermark"].clone(), page["resume_cursor"].clone());
+        assert_eq!(pair.0, pair.1);
+        match &stable {
+            Some(expected) => assert_eq!(&pair, expected),
+            None => stable = Some(pair),
+        }
+        seen.extend(
+            page["source_ids"]
+                .as_array()
+                .unwrap()
+                .iter()
+                .map(|id| id.as_str().unwrap().to_owned()),
+        );
+        pages += 1;
+        after = page["next_cursor"].as_str().map(str::to_owned);
+        if after.is_none() {
+            break;
+        }
+        assert!(pages < 21);
+    }
+    assert_eq!(pages, 20);
+    assert_eq!(seen, (0..10_000).map(|i| format!("source-{i:05}")).collect::<Vec<_>>());
+    let response = client
+        .get(format!("{}/api/plugins/activity", world.server.base))
+        .query(&[("after", stable.unwrap().1.as_str().unwrap())])
+        .bearer_auth(token)
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(response.status(), StatusCode::OK);
+    assert_eq!(response.json::<Value>().await.unwrap()["items"], json!([]));
+    // One lease, twenty inventory pages and one resume consume 22 requests.
+    for _ in 22..60 {
+        assert_eq!(world.lease(token).await.status(), StatusCode::OK);
+    }
+    let busy = world.lease(token).await;
+    assert_eq!(busy.status(), StatusCode::TOO_MANY_REQUESTS);
+    assert_eq!(busy.json::<Value>().await.unwrap()["code"], "busy");
+}
+
```

- [x] Preserve strict URL decoding, duplicate/unknown-field rejection, cursor bounds, authentication and all existing budgets. Select a separate inventory max/default at HTTP and storage boundaries; write the contract back into the spec.
- [x] Re-run the inventory HTTP target: exit 0. Run complete `plugin_http`, `plugin_feed` and `owner_filter` targets: exit 0.

<!-- replay: task2-code.patch -->
```diff
diff --git a/crates/hennery-gateway/src/plugin_api.rs b/crates/hennery-gateway/src/plugin_api.rs
index 1055913d3c70b7f426db7b200cb45ea182420728..9126c1b5ae142d32eaf753e9b8b29ccc075d24df 100644
--- a/crates/hennery-gateway/src/plugin_api.rs
+++ b/crates/hennery-gateway/src/plugin_api.rs
@@ -110,0 +111,8 @@ pub fn machine_query(query: Option<&str>) -> Result<(Option<String>, usize), Inv
+    bounded_machine_query(query, 20)
+}
+/// Source ids contain no activity bodies; their independent cap permits a
+/// reset to finish without consuming the registration's whole minute budget.
+pub fn inventory_query(query: Option<&str>) -> Result<(Option<String>, usize), InvalidQuery> {
+    bounded_machine_query(query, plugin::feed::INVENTORY_MAX_IDS)
+}
+fn bounded_machine_query(query: Option<&str>, max: usize) -> Result<(Option<String>, usize), InvalidQuery> {
@@ -123 +131 @@ pub fn machine_query(query: Option<&str>) -> Result<(Option<String>, usize), Inv
-                let parsed = value.parse::<usize>().ok().filter(|n| (1..=20).contains(n));
+                let parsed = value.parse::<usize>().ok().filter(|n| (1..=max).contains(n));
@@ -132 +140 @@ pub fn machine_query(query: Option<&str>) -> Result<(Option<String>, usize), Inv
-    Ok((cursor, limit.unwrap_or(20)))
+    Ok((cursor, limit.unwrap_or(max)))
diff --git a/crates/hennery-sessions/src/plugin.rs b/crates/hennery-sessions/src/plugin.rs
index 415743b91c3f4465699ec0c4b1503e9590b27533..e7ae7393fde726d3a45684d3dd4c48f29d243ef5 100644
--- a/crates/hennery-sessions/src/plugin.rs
+++ b/crates/hennery-sessions/src/plugin.rs
@@ -301 +301,4 @@ impl Store {
-        let limit = page_limit(limit)?;
+        ensure!(
+            (1..=hennery_gateway::plugin::feed::INVENTORY_MAX_IDS).contains(&limit),
+            "invalid plug-in inventory limit"
+        );
diff --git a/crates/hennery-sessions/src/plugin_api.rs b/crates/hennery-sessions/src/plugin_api.rs
index 76920042704a7b842671c3029ecdde571e0e5209..1273bb63c028b00f588c8c7dd20d117039cbd280 100644
--- a/crates/hennery-sessions/src/plugin_api.rs
+++ b/crates/hennery-sessions/src/plugin_api.rs
@@ -12 +12 @@ use hennery_gateway::plugin_api::{
-    empty_machine_body, error, machine_failure, machine_query, machine_token, no_store, watched_json,
+    empty_machine_body, error, inventory_query, machine_failure, machine_query, machine_token, no_store, watched_json,
@@ -55 +55,5 @@ async fn serve(state: AppState, request: Request, inventory: bool) -> Response {
-    let query = match machine_query(request.uri().query()) {
+    let query = match if inventory {
+        inventory_query(request.uri().query())
+    } else {
+        machine_query(request.uri().query())
+    } {
diff --git a/docs/specs/2026-10-14-memory-design.md b/docs/specs/2026-10-14-memory-design.md
index 252044676aab5affb702e5088c09b5a2c4d34e65..59f342e2202bc61894fb3d813abdc72613febd27 100644
--- a/docs/specs/2026-10-14-memory-design.md
+++ b/docs/specs/2026-10-14-memory-design.md
@@ -275,0 +276,15 @@ observations absent from the inventory. No transcript backfill is implied.
+Inventory pages contain only source ids: default and maximum 500 ids, with
+the complete serialized JSON response capped at 128 KiB. Content pages keep
+their separate 20-item limit. A snapshot retains its original watermark and
+resume cursor while each successful inventory page renews a 60-second idle
+expiry, bounded by an immutable 20-minute lifetime from snapshot creation.
+The existing registration-wide 60-request/minute and 8-MiB budgets still
+apply. Expired snapshots, including snapshots created before this lifetime
+contract, return `reset_required`; consumers discard partial inventories and
+restart without applying a partial reconciliation. The absolute cap bounds
+snapshot usability even when a client keeps paging or replays a cursor.
+Expired source-id rows are removed on snapshot replacement or lifecycle
+cleanup; expiry alone does not promise physical erasure.
+These inventory-only bounds were confirmed by the parent on the maintainer's
+behalf, 2026-10-15 (C1b).
+
```

## Fresh replay

Extract the four marked diff blocks from this file (assert exactly four non-empty blocks and at least one extracted file), apply them with `git apply --unidiff-zero` in the documented order to a fresh copy at `7fe43fbe`, and run each task's RED then GREEN command. These are exact `git diff --binary --full-index --unified=0` patches, which avoid trailing context-only whitespace in Markdown. A compile failure does not count as RED: require exit 101 and `test result: FAILED`. After the fourth patch, compare every tracked implementation/spec byte against the built tree. The plan and index execution record are a later documentation-only commit.

The replay uses a distinct APFS-cloned target. Its record lists extracted block/file counts, runtime assertion results and the number of matching tracked files. Do not reuse a previous replay directory.

## Revert-probes

Batch removal probes in an isolated copy with an APFS-cloned target. For each mutation restore the original file bytes before the next probe; require a runtime test failure, then restore all bytes and require GREEN. Probe the initial idle and absolute deadlines, conservative migration default, renewal assignment/cap/commit, every owner/hat/connection/epoch/snapshot/idle/deadline predicate, escaped byte cap, included-id cursor continuity, cursor/envelope bounds, independent parser defaults/caps, HTTP route selection and storage cap. Report an undetected or compile-only mutation honestly and strengthen the test before claiming coverage.

The unchanged existing delete-versus-inventory race runs four concurrent copies, three rounds, under the same isolated copy. Clock simulations require no load. No probe mutation is ever staged in the implementation worktree.

## Verification and execution record

Built from merged C2 `7fe43fbe`; implementation commits `31303d4e` and `de5048d8`, coverage/spec-precision follow-up `3a937412`. All three were pushed once successfully via SSH with the personal Gmail author. Independent review and PR CI are pending with the parent.

| Command (inside the dev shell) | Exit | Evidence |
|---|---|---|
| `cargo fmt --all --check` | 0 | completed successfully |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 | completed successfully |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 | completed successfully |
| `cargo test --workspace --locked` | 0 | 2,383 passed; 1 ignored |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 | completed successfully |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 | completed successfully |
| `nix flake check -L` | 0 | completed successfully |

The workspace suite ran **once** for this plan. Web checks were not run because `web/` did not change. The Nix source filter already includes Rust files and the existing embedded SQL files; this change's migration is inline in `feed.rs`, so no new source-file exception is needed. Native Nix checks passed; Linux remains a PR CI responsibility.

Targeted build evidence: task 1's six new regressions first failed at runtime (5 old tests passed/6 new failed), then its inventory target passed 11 tests. Task 2 first failed at runtime (3 passed/2 failed), then its inventory HTTP target passed 5 tests. The complete initial targets passed 27 feed + 30 HTTP + 3 audit tests. The final refusal/rollback coverage follows below; restored final targets passed **28 feed + 30 HTTP + 3 audit = 61 tests**, exit 0.

The live HTTP fixture seeds 10,000 historical source markers in one transaction, registers the plug-in, and receives exactly 20 default-size pages. It checks every id in order, no duplicates/omissions, fixed watermark/resume identity, every complete JSON response <=128 KiB and an empty activity resume (no transcript backfill). One lease + 20 pages + one activity resume consumes 22 requests; 38 further leases succeed and the next request returns 429. This is an HTTP core-contract proof, separate from the reference plug-in's real MCP-tool proof.

**Removal probes:** 23 distinct mutations, all caught by runtime test failures. Initially 21/23 were detected; generated-cursor and complete-envelope removals passed. The strengthened refusal/rollback regression was then seen RED separately for each missing guard and GREEN after restoration. It also checks idle expiry stays unchanged after refusal. The other mutations cover initial idle/absolute deadlines, the conservative migration default, renewal/cap/commit, every owner/hat/connection/epoch/snapshot/idle/deadline predicate, count/escaped bytes, cursor continuity and independent query/store/route caps. All source bytes were restored; no probe mutation was staged.

**Replay:** four non-empty embedded patch blocks, seven changed files. One fresh source copy at `7fe43fbe` showed task 1 RED (5 pass/7 fail), then GREEN (12 pass); task 2 RED (3 pass/2 fail), then GREEN (5 pass). All **790 tracked implementation/spec files** matched `3a937412` exactly before this documentation record. The first test command was interrupted during setup because the APFS target clone had not finished; no runtime verdict from that setup was counted. It resumed only after the clone completed, in the same fresh source copy. The final Markdown patches use exact zero-context Git diffs to avoid whitespace-only context lines; reversing them returned the completed replay copy to the base, then applying them forward matched all 790 runtime bytes again without another full test/replay build.

**Load and isolation:** the actual inventory/delete race passed four concurrent copies for three rounds (12 executions). The combined load batch also ran the 10,000-source count/budget test 12 extra times before the parent clarified that this was unnecessary; all passed, and no repeats followed. Simulated clock tests were not loaded. Every probe/replay copy received its own APFS-cloned target; no target directory was shared. Probe/replay/final-gate tools used scratch HOME/XDG/CARGO_HOME. The registry-path move required a dependency rebuild; its outputs were then cloned for reuse.

Evidence logs and scripts are retained under `.superpowers/sdd/plugin-c1b/`. Copies retained for parent cleanup: `probe-1/`, `replay-1/`, `target-before-home/`, plus scratch tool/registry homes. Nothing was deleted. This record does not claim independent approval.


## After this plan

- Reference plug-ins consume id-only pages of up to 500 ids and the latest page's authenticated lease. Reconcile only after the complete stable-watermark snapshot; an expiry discards the partial inventory and restarts.
- Optional plug-in implementations remain separate binaries with separate storage/auth. This change adds no memory feature to core and enables no plug-in by default.
- Parent requests independent review of the SHA range and the risks listed above, opens the PR and reports checks, reviewDecision, mergeStateStatus and unresolved threads before merge.

Generated with Claude AI — please review before distribution.
