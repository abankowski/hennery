# Needs you: durable result inbox — v0.3.1

Base: `3a101767`. Feature branch: `feat/needs-you-inbox`.

## Execution status

Built and committed on `feat/needs-you-inbox` (implementation `0bb698f0`), based on `3a101767`. Independent review remains parent-owned. The operator holds this feature for v0.3.1 until v0.3.0 is live. No version bump, release tag, publication, PR, merge or deployment was performed.

All six Rust commands were run. Formatting, both clippy commands and both generator checks exited 0. The full command was `cargo test --workspace --locked --no-fail-fast`: **2835 passed, 9 ignored, 1 failed** (exit 101). The sole remaining failure was the foreign-owner projection fixture, which moved a session without its new owner-bound inbox row. That test-only fixture now moves both rows under a deferred composite constraint, validated at commit; its entire suite was rerun with **30 passed, 0 failed** (exit 0). Together the full run and corrected suite cover **2836 passed and 9 ignored**. The full workspace was not repeated after this final fixture-only correction, in keeping with the verification budget. The no-fail-fast flag changes continuation on failure, not the tests selected. Initial attempts exposed historical test rollback fixtures missing the new migration's table/trigger; both fixture families were repaired and their owner/store/delegation migration tests rerun before the completed no-fail-fast run.

Web install, typecheck, test and build exited 0: **2599 tests in 155 files**. Binary build and the local Chromium attention/review checks exited 0: **4 tests**, covering desktop/mobile queue behavior, independent browser profiles, explicit acknowledgement and actual scrolling. Store review regressions: 9; new HTTP regressions: 2; owner SQL audit: 3, all passed. Focus/visibility/SSE checks passed 4 concurrent copies for 3 rounds (132 test executions).

All **17 guard-removal probes** failed as expected in the copied tree, then restored baselines passed. Initial publish, final-content-version and dismissed-result probes exposed weak assertions; the tests were strengthened, observed RED with the safeguards removed, then GREEN with the actual code. The final embedded patch was replayed from its base in the same fresh copy; **1,145 tracked files matched byte-for-byte**. The copied target directory was APFS-cloned, never shared.

Scratch copy retained for parent cleanup: `.claude/worktrees/needs-you-inbox-replay-1`. Native aarch64-darwin Nix package evaluation exited 0. Linux/macOS CI, a native Nix package build and independent review were not run here. The new SQL file is included in Nix's source fileset. Review should check migration 29 against the eventual v0.3.0 main, stale acknowledgement ordering, child/owner/deletion fences, ordinary SSE invalidation, and actual final-result visibility. Rebase and resolve any migration conflict before a later merge.

## Scope

The existing Needs you queue counts formal operator requests but misses ordinary final messages. Add a durable review entry for newly completed/failed non-delegated turns. Show Mark as read in the queue and session, synchronize via list SSE, and automatically acknowledge only a verified final result whose end is visible in a focused visible tab. Reading is independent of formal permission/elicitation decisions.

## Decisions

Operator approved on 2026-10-22:
- Needs you contains formal requests and results to review.
- Mark as read does not require a reply and must not consume newer work.
- Reading a result never answers a formal pending question.
- Children are observed by their parent; their ordinary results must not enter the operator inbox or trigger ordinary completion pushes. Existing operator escalations remain authoritative.
- Hold this work on a feature branch until v0.3.0 is live, then target v0.3.1.

Implementation choices:
- Migration 31 (renumbered after the v0.3.0 migrations 29–30) creates an initially empty, owner-scoped session_reviews table. Existing history is not retrospectively marked unread. Latest completion and monotonic read event ids are stored independently.
- Only applied completed/failed turn ends record a result. Immutable delegated identity suppresses child results even if family links disappear. Existing delegation push routing stays in place.
- POST /api/view/sessions/{id}/read accepts one observed completion event id. Unknown/foreign/deleted/frozen sessions are 404, invalid result ids are rejected, repeated acknowledgements are idempotent. A result_read event invalidates existing list SSE and is silent in the transcript fold.
- A bounded last-turn view read verifies final item identity/version before automatic acknowledgement. The list and item streams may arrive in either order. Geometry, document visibility and focus are checked together; queue previews never acknowledge.
- A successful prompt acknowledges the completion captured by its send callback. Refusal and delayed responses cannot acknowledge newer results.

## Global constraints

Work only in the named feature worktree. No GitHub actions or publication. Preserve owner/hat isolation, deletion fences, formal question routing and the one list SSE contract. Run the six Rust gates, web typecheck/test/build, changed Playwright checks, copied guard probes, timing-sensitive load checks and one fresh exact-tree replay. Independent review remains parent-owned.

## Review focus

Check stale/read id monotonicity, cross-device invalidation, foreign-event and owner/hat filtering, deleted-data cleanup, delegated/orphan child identity, formal question persistence, delayed prompt acknowledgements, and final-result visibility when the item stream lags the list stream. Check migration numbering against the eventual v0.3.0 main before merging.

## File structure

- crates/hennery-sessions/src/review.{rs,sql}: owner-scoped storage and acknowledgement.
- store.rs, family.rs, view.rs: ingest, projection/count and operator route.
- hennery-view api/codegen/fold plus generated schema/TypeScript: optional review metadata, silent receipts.
- Web queue, result actions/visibility observer, session/composer, status/list/palette: shared attention behavior.
- Rust store/HTTP/owner tests, web regression tests and desktop/mobile Playwright checks.
- nix/package.nix: include the new migration in packaged source.
- UI specification and docs index: approved behavior and release hold.

## Task 1 — implement and verify the result inbox

The exact implementation is the unified patch below. On the base commit, extract exactly one nonempty diff block and apply it with git apply --unidiff-zero --index. Copy this plan into the replay afterwards; it is the plan, not an input to its own implementation patch. Compare every tracked file byte-for-byte with the implementation tree. Guard mutations run only in the replay copy, each restored before the next probe and before the final comparison.

1. Apply the patch below.
2. Run the verification commands and copied guard probes; verify each removed guard causes its regression to fail.
3. Compare the replay tree with the implementation, including the copied plan.
4. Commit as feat(attention): add a durable result review inbox; record actual verification evidence and request parent review. Leave the branch unmerged and unreleased.

```diff
diff --git a/crates/hennery-sessions/src/family.rs b/crates/hennery-sessions/src/family.rs
index 184d31b5..bdd6b0c9 100644
--- a/crates/hennery-sessions/src/family.rs
+++ b/crates/hennery-sessions/src/family.rs
@@ -149,0 +150 @@ fn summary_in(conn: &Connection, owner: &str, s: SessionItem) -> Result<SessionS
+    let review = crate::review::unread(conn, owner, &s.session_id)?;
@@ -158,0 +160 @@ fn summary_in(conn: &Connection, owner: &str, s: SessionItem) -> Result<SessionS
+        review,
@@ -340 +342,3 @@ impl Store {
-            AND (EXISTS(SELECT 1 FROM delegation_question_routing q WHERE q.owner_id = ?1 AND q.session_id=s.id AND q.handling='operator_required')
+            AND (EXISTS(SELECT 1 FROM session_reviews r WHERE r.owner_id = ?1 AND r.session_id=s.id
+                AND r.event_id>r.read_event_id AND s.delegated_child=0)
+              OR EXISTS(SELECT 1 FROM delegation_question_routing q WHERE q.owner_id = ?1 AND q.session_id=s.id AND q.handling='operator_required')
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index 7f5f34f2..c932ff6e 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -33,0 +34 @@ mod resolve;
+pub mod review;
diff --git a/crates/hennery-sessions/src/review.rs b/crates/hennery-sessions/src/review.rs
new file mode 100644
index 00000000..60ce09e3
--- /dev/null
+++ b/crates/hennery-sessions/src/review.rs
@@ -0,0 +1,93 @@
+//! Durable review of a particular result, independent of formal pending requests.
+use crate::{hub::Hub, store::Store};
+use anyhow::Result;
+use hennery_view::api::ReviewResult;
+use rusqlite::{Connection, OptionalExtension, params};
+
+pub(crate) fn unread(conn: &Connection, owner: &str, session: &str) -> Result<Option<ReviewResult>> {
+    let row: Option<(i64, String, String)> = conn
+        .query_row(
+            "SELECT r.event_id,json_extract(e.body,'$.turn_id'),json_extract(e.body,'$.outcome')
+         FROM session_reviews r JOIN sessions s ON s.owner_id = ?1 AND s.id=r.session_id
+         JOIN events e ON e.owner_id = ?1 AND e.session_id=r.session_id AND e.event_id=r.event_id
+         WHERE r.owner_id = ?1 AND r.session_id = ?2 AND r.event_id>r.read_event_id
+         AND s.delegated_child=0 AND s.lifecycle<>'deleted'
+         AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id=s.hat_id)",
+            params![owner, session],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+        )
+        .optional()?;
+    row.map(|(event_id, turn_id, outcome)| {
+        Ok(ReviewResult {
+            event_id,
+            turn_id,
+            outcome: serde_json::from_value(serde_json::Value::String(outcome))?,
+        })
+    })
+    .transpose()
+}
+
+pub(crate) fn record(conn: &Connection, owner: &str, session: &str, event_id: i64) -> Result<()> {
+    conn.execute(
+        "INSERT INTO session_reviews(owner_id,session_id,event_id)
+         SELECT ?1,id,?3 FROM sessions WHERE owner_id = ?1 AND id = ?2
+         AND delegated_child=0 AND lifecycle<>'deleted'
+         ON CONFLICT(owner_id,session_id) DO UPDATE SET event_id=excluded.event_id",
+        params![owner, session, event_id],
+    )?;
+    Ok(())
+}
+
+impl Store {
+    /// Only the supplied, actually completed result is acknowledged. An old tab
+    /// cannot consume a newer completion, and acknowledgements never go backwards.
+    pub fn mark_result_read(&self, session: &str, event_id: i64, hub: &Hub) -> Result<Option<bool>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let exists: bool = tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id = ?1 AND s.id = ?2
+             AND s.lifecycle<>'deleted' AND NOT EXISTS(SELECT 1 FROM purged_hats h
+                WHERE h.owner_id = ?1 AND h.hat_id=s.hat_id))",
+            params![self.owner_id(), session],
+            |r| r.get(0),
+        )?;
+        if !exists {
+            return Ok(None);
+        }
+        let valid: bool = tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM session_reviews r JOIN events e ON e.owner_id = ?1
+             AND e.session_id=r.session_id AND e.event_id = ?3
+             WHERE r.owner_id = ?1 AND r.session_id = ?2 AND r.event_id>=?3
+             AND e.applied=1 AND e.kind='turn_ended'
+             AND json_extract(e.body,'$.outcome') IN ('completed','failed'))",
+            params![self.owner_id(), session, event_id],
+            |r| r.get(0),
+        )?;
+        if !valid {
+            return Ok(Some(false));
+        }
+        let changed = tx.execute(
+            "UPDATE session_reviews SET read_event_id = ?3
+             WHERE owner_id = ?1 AND session_id = ?2 AND read_event_id<?3",
+            params![self.owner_id(), session, event_id],
+        )?;
+        let event = if changed > 0 {
+            Some(crate::store::collector_event(
+                &tx,
+                self.owner_id(),
+                session,
+                "result_read",
+                serde_json::json!({"event_id":event_id}),
+                &crate::store::stamp_ago(std::time::Duration::ZERO),
+            )?)
+        } else {
+            None
+        };
+        tx.commit()?;
+        drop(conn);
+        if let Some(event) = event {
+            hub.publish(event);
+        }
+        Ok(Some(true))
+    }
+}
diff --git a/crates/hennery-sessions/src/review.sql b/crates/hennery-sessions/src/review.sql
new file mode 100644
index 00000000..02690467
--- /dev/null
+++ b/crates/hennery-sessions/src/review.sql
@@ -0,0 +1,13 @@
+-- Sessions migration 29: only results produced after this upgrade enter the inbox.
+CREATE TABLE session_reviews (
+    owner_id TEXT NOT NULL,
+    session_id TEXT NOT NULL,
+    event_id INTEGER NOT NULL CHECK(event_id > 0),
+    read_event_id INTEGER NOT NULL DEFAULT 0 CHECK(read_event_id >= 0 AND read_event_id <= event_id),
+    PRIMARY KEY(owner_id,session_id),
+    FOREIGN KEY(session_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE TRIGGER review_delete AFTER UPDATE OF lifecycle ON sessions
+WHEN NEW.lifecycle = 'deleted'
+BEGIN
+    DELETE FROM session_reviews WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
+END;
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index 40f1a157..a6022e7f 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -443,0 +444 @@ END;",
+    include_str!("review.sql"),
@@ -4072,0 +4074,3 @@ impl Store {
+                    if matches!(outcome, TurnOutcome::Completed | TurnOutcome::Failed) {
+                        crate::review::record(&tx, &self.owner, session_id, fact_id)?;
+                    }
diff --git a/crates/hennery-sessions/src/view.rs b/crates/hennery-sessions/src/view.rs
index 1023d486..a2b87a82 100644
--- a/crates/hennery-sessions/src/view.rs
+++ b/crates/hennery-sessions/src/view.rs
@@ -113,0 +114 @@ pub fn router(state: AppState) -> Router {
+        .route("/api/view/sessions/{id}/read", axum::routing::post(mark_read))
@@ -138,0 +140,27 @@ fn not_found() -> Response {
+struct ReadResult {
+    event_id: i64,
+}
+async fn mark_read(
+    State(state): State<AppState>,
+    Path(id): Path<String>,
+    hennery_kernel::json::ApiJson(request): hennery_kernel::json::ApiJson<serde_json::Value>,
+) -> Response {
+    let Ok(request) = serde_json::from_value::<ReadResult>(request) else {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "expected a result event");
+    };
+    if id.len() > 128 {
+        return not_found();
+    }
+    if request.event_id <= 0 || request.event_id > 9_007_199_254_740_991 {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid result event");
+    }
+    match state.store.mark_result_read(&id, request.event_id, &state.hub) {
+        Ok(Some(true)) => StatusCode::NO_CONTENT.into_response(),
+        Ok(Some(false)) => error(StatusCode::CONFLICT, "invalid_result", "no such completed result"),
+        Ok(None) => not_found(),
+        Err(err) => internal(err),
+    }
+}
+
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
index d1381439..3f5bb05f 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
@@ -0,0 +1,3 @@
+-- Test-only rollback of sessions migration 29 before historical fixtures.
+DROP TRIGGER review_delete;
+DROP TABLE session_reviews;
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation_limits.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation_limits.sql
index f68fbc55..3a899434 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_delegation_limits.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation_limits.sql
@@ -0,0 +1,3 @@
+-- Test-only rollback of sessions migration 29 before historical fixtures.
+DROP TRIGGER review_delete;
+DROP TABLE session_reviews;
diff --git a/crates/hennery-sessions/tests/review.rs b/crates/hennery-sessions/tests/review.rs
new file mode 100644
index 00000000..fb1817ab
--- /dev/null
+++ b/crates/hennery-sessions/tests/review.rs
@@ -0,0 +1,291 @@
+use hennery_proto::frames::{Indexed, SessionBody, TurnOutcome};
+use hennery_sessions::{hub::Hub, store::Store};
+use serde_json::json;
+
+fn start(store: &Store, id: &str) {
+    store.create_session(id, "host", "fake", "/tmp", "hat", None).unwrap();
+    store
+        .ingest(id, 1, &SessionBody::session_started("start", "agent"))
+        .unwrap();
+}
+fn finish(store: &Store, session: &str, turn: &str, seq: u64, outcome: TurnOutcome) -> i64 {
+    assert!(
+        store
+            .open_turn(session, turn, &[json!({"type":"text","text":"work"})])
+            .unwrap()
+    );
+    store
+        .ingest(
+            session,
+            seq,
+            &SessionBody::TurnStarted {
+                request_id: turn.into(),
+                turn_id: turn.into(),
+            },
+        )
+        .unwrap();
+    store
+        .ingest(
+            session,
+            seq + 1,
+            &SessionBody::AcpUpdate {
+                indexed: Indexed::default(),
+                payload: json!({"text":"result"}),
+            },
+        )
+        .unwrap();
+    store
+        .ingest(
+            session,
+            seq + 2,
+            &SessionBody::TurnEnded {
+                turn_id: turn.into(),
+                outcome,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap()[0]
+        .event_id
+}
+
+#[test]
+fn completed_and_failed_results_wait_until_read_without_a_reply() {
+    let store = Store::open_in_memory().unwrap();
+    let hub = Hub::new();
+    start(&store, "s");
+    for (n, outcome) in [TurnOutcome::Completed, TurnOutcome::Failed].into_iter().enumerate() {
+        let event = finish(&store, "s", &format!("t{n}"), 2 + n as u64 * 3, outcome);
+        let summary = store.family_summary("s").unwrap().unwrap();
+        let review = summary.review.unwrap();
+        assert_eq!((review.event_id, review.outcome), (event, outcome));
+        assert_eq!(summary.operator_attention, 0);
+        assert_eq!(store.operator_waiting_count(None).unwrap(), 1);
+        assert_eq!(store.operator_waiting_count(Some("different-hat")).unwrap(), 0);
+        assert_eq!(store.mark_result_read("s", event, &hub).unwrap(), Some(true));
+        assert!(store.family_summary("s").unwrap().unwrap().review.is_none());
+        assert_eq!(store.operator_waiting_count(None).unwrap(), 0);
+    }
+}
+
+#[test]
+fn stale_acknowledgements_are_monotonic_and_do_not_consume_newer_results() {
+    let store = Store::open_in_memory().unwrap();
+    let hub = Hub::new();
+    start(&store, "s");
+    let first = finish(&store, "s", "t1", 2, TurnOutcome::Completed);
+    let second = finish(&store, "s", "t2", 5, TurnOutcome::Completed);
+    assert_eq!(store.mark_result_read("s", first, &hub).unwrap(), Some(true));
+    assert_eq!(
+        store.family_summary("s").unwrap().unwrap().review.unwrap().event_id,
+        second
+    );
+    assert_eq!(store.mark_result_read("s", second, &hub).unwrap(), Some(true));
+    let events = store.events("s", 0, 100).unwrap().len();
+    assert_eq!(store.mark_result_read("s", first, &hub).unwrap(), Some(true));
+    assert_eq!(
+        store.events("s", 0, 100).unwrap().len(),
+        events,
+        "repeated reads write no event"
+    );
+    assert!(store.family_summary("s").unwrap().unwrap().review.is_none());
+    assert_eq!(store.mark_result_read("s", second + 100, &hub).unwrap(), Some(false));
+    assert_eq!(store.mark_result_read("s", 1, &hub).unwrap(), Some(false));
+    start(&store, "other");
+    assert_eq!(store.mark_result_read("other", second, &hub).unwrap(), Some(false));
+    assert_eq!(store.mark_result_read("missing", second, &hub).unwrap(), None);
+}
+
+#[test]
+fn cancelled_interrupted_and_unapplied_ends_do_not_create_review() {
+    let store = Store::open_in_memory().unwrap();
+    start(&store, "s");
+    for (n, outcome) in [TurnOutcome::Cancelled, TurnOutcome::Interrupted]
+        .into_iter()
+        .enumerate()
+    {
+        finish(&store, "s", &format!("t{n}"), 2 + n as u64 * 3, outcome);
+        assert!(store.family_summary("s").unwrap().unwrap().review.is_none());
+    }
+    store
+        .ingest(
+            "s",
+            8,
+            &SessionBody::TurnEnded {
+                turn_id: "missing".into(),
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+    assert_eq!(store.operator_waiting_count(None).unwrap(), 0);
+}
+
+#[test]
+fn read_state_survives_restart_and_deleted_results_cannot_be_reopened() {
+    let dir = tempfile::tempdir().unwrap();
+    let db = dir.path().join("test.db");
+    let hub = Hub::new();
+    let store = Store::open(&db).unwrap();
+    start(&store, "s");
+    let event = finish(&store, "s", "t1", 2, TurnOutcome::Completed);
+    drop(store);
+    let store = Store::open(&db).unwrap();
+    assert_eq!(
+        store.family_summary("s").unwrap().unwrap().review.unwrap().event_id,
+        event
+    );
+    store.mark_result_read("s", event, &hub).unwrap();
+    drop(store);
+    let store = Store::open(&db).unwrap();
+    assert_eq!(store.operator_waiting_count(None).unwrap(), 0);
+    store.ingest("s", 5, &SessionBody::SessionClosed).unwrap();
+    store.delete_session("s", None).unwrap();
+    assert_eq!(store.mark_result_read("s", event, &hub).unwrap(), None);
+    let conn = rusqlite::Connection::open(db).unwrap();
+    assert_eq!(
+        conn.query_row("SELECT count(*) FROM session_reviews", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        0
+    );
+}
+
+#[test]
+fn child_results_stay_with_the_parent_even_when_family_links_are_gone() {
+    let dir = tempfile::tempdir().unwrap();
+    let db = dir.path().join("test.db");
+    let store = Store::open(&db).unwrap();
+    // The immutable delegated identity is set at creation, before any family.
+    let conn = rusqlite::Connection::open(&db).unwrap();
+    conn.execute(
+        "INSERT INTO sessions(id,host_id,agent,cwd,hat_id,lifecycle,created_at,last_event_at,owner_id,delegated_child)
+        VALUES ('child','host','fake','/tmp','hat','starting','t','t',?1,1)",
+        [store.owner_id()],
+    )
+    .unwrap();
+    store
+        .ingest("child", 1, &SessionBody::session_started("start", "agent"))
+        .unwrap();
+    finish(&store, "child", "t1", 2, TurnOutcome::Completed);
+    assert!(store.family_summary("child").unwrap().unwrap().review.is_none());
+    assert_eq!(store.operator_waiting_count(None).unwrap(), 0);
+}
+
+#[test]
+fn reading_a_result_keeps_formal_questions_and_operator_attention_open() {
+    use hennery_proto::frames::{PendingExtract, PendingKind};
+    let store = Store::open_in_memory().unwrap();
+    start(&store, "s");
+    let event = finish(&store, "s", "t1", 2, TurnOutcome::Completed);
+    store
+        .ingest(
+            "s",
+            5,
+            &SessionBody::PendingOpened {
+                pending_id: "permission".into(),
+                indexed: Indexed {
+                    pending: Some(Box::new(PendingExtract {
+                        id: "permission".into(),
+                        kind: PendingKind::Permission,
+                        option_ids: Some(vec!["allow".into()]),
+                        title: None,
+                    })),
+                    ..Indexed::default()
+                },
+                payload: json!({"toolCall":{"toolCallId":"call"}}),
+            },
+        )
+        .unwrap();
+    store.mark_result_read("s", event, &Hub::new()).unwrap();
+    let summary = store.family_summary("s").unwrap().unwrap();
+    assert!(summary.review.is_none());
+    assert!(summary.question_waits);
+    assert_eq!(summary.operator_attention, 1);
+    assert_eq!(store.operator_waiting_count(None).unwrap(), 1);
+    assert_eq!(store.open_pending("s").unwrap().len(), 1);
+}
+
+#[test]
+fn another_owners_session_and_event_are_not_readable_or_acknowledgeable() {
+    let dir = tempfile::tempdir().unwrap();
+    let db = dir.path().join("test.db");
+    let store = Store::open(&db).unwrap();
+    start(&store, "s");
+    let event = finish(&store, "s", "t1", 2, TurnOutcome::Completed);
+    let conn = rusqlite::Connection::open(db).unwrap();
+    conn.execute(
+        "INSERT INTO owners(id,created_at) VALUES ('other',9223372036854775807)",
+        [],
+    )
+    .unwrap();
+    conn.execute(
+        "INSERT INTO sessions(id,host_id,agent,cwd,hat_id,lifecycle,created_at,last_event_at,owner_id)
+        VALUES ('foreign','host','fake','/tmp','hat','active','t','t','other')",
+        [],
+    )
+    .unwrap();
+    conn.execute(
+        "INSERT INTO events(owner_id,session_id,kind,body,ts) VALUES ('other','foreign','turn_ended',?1,'t')",
+        [json!({"turn_id":"foreign-turn","outcome":"completed"}).to_string()],
+    )
+    .unwrap();
+    let foreign = conn.last_insert_rowid();
+    conn.execute(
+        "INSERT INTO session_reviews(owner_id,session_id,event_id) VALUES ('other','foreign',?1)",
+        [foreign],
+    )
+    .unwrap();
+    assert!(store.family_summary("foreign").unwrap().is_none());
+    assert_eq!(store.mark_result_read("foreign", foreign, &Hub::new()).unwrap(), None);
+    assert_eq!(store.mark_result_read("s", foreign, &Hub::new()).unwrap(), Some(false));
+    assert_eq!(
+        store.family_summary("s").unwrap().unwrap().review.unwrap().event_id,
+        event
+    );
+    assert_eq!(store.operator_waiting_count(None).unwrap(), 1);
+}
+
+#[test]
+fn acknowledgement_publishes_its_committed_receipt_once() {
+    let store = Store::open_in_memory().unwrap();
+    let hub = Hub::new();
+    start(&store, "s");
+    let event = finish(&store, "s", "t1", 2, TurnOutcome::Completed);
+    let mut notifications = hub.subscribe();
+    store.mark_result_read("s", event, &hub).unwrap();
+    let receipt = notifications
+        .try_recv()
+        .expect("the read receipt must ring list subscribers");
+    assert_eq!(receipt.kind, "result_read");
+    assert_eq!(receipt.session_id, "s");
+    assert_eq!(receipt.body, json!({"event_id":event}));
+    assert!(store.family_summary("s").unwrap().unwrap().review.is_none());
+    assert_eq!(store.events("s", receipt.event_id - 1, 1).unwrap()[0], receipt);
+    store.mark_result_read("s", event, &hub).unwrap();
+    assert!(notifications.try_recv().is_err());
+}
+
+#[test]
+fn upgrading_from_v28_starts_empty_and_keeps_historical_transcripts() {
+    let dir = tempfile::tempdir().unwrap();
+    let db = dir.path().join("test.db");
+    let store = Store::open(&db).unwrap();
+    start(&store, "s");
+    finish(&store, "s", "old", 2, TurnOutcome::Completed);
+    let history = store.events("s", 0, 100).unwrap();
+    drop(store);
+    rusqlite::Connection::open(&db)
+        .unwrap()
+        .execute_batch("DROP TRIGGER review_delete; DROP TABLE session_reviews; PRAGMA user_version=28;")
+        .unwrap();
+    let upgraded = Store::open(&db).unwrap();
+    assert_eq!(upgraded.events("s", 0, 100).unwrap(), history);
+    assert!(upgraded.family_summary("s").unwrap().unwrap().review.is_none());
+    assert_eq!(upgraded.operator_waiting_count(None).unwrap(), 0);
+    finish(&upgraded, "s", "new", 5, TurnOutcome::Completed);
+    assert_eq!(
+        upgraded.family_summary("s").unwrap().unwrap().review.unwrap().turn_id,
+        "new"
+    );
+}
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 1123d0d4..58880779 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -37,0 +38,5 @@ const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-sessions/src/review.rs",
+        include_str!("../../hennery-sessions/src/review.rs"),
+        5,
+    ),
diff --git a/crates/hennery-testkit/tests/plugin_feed.rs b/crates/hennery-testkit/tests/plugin_feed.rs
index 1f9bb588..71384c03 100644
--- a/crates/hennery-testkit/tests/plugin_feed.rs
+++ b/crates/hennery-testkit/tests/plugin_feed.rs
@@ -948,0 +949,5 @@ fn foreign_owner_rows_and_future_cursor_never_reach_projection() {
+        // Move the owner-bound inbox row together with the deliberately
+        // foreign session; validate the composite reference at commit.
+        core.execute_batch("PRAGMA defer_foreign_keys=ON;").unwrap();
+        core.execute("UPDATE session_reviews SET owner_id='other-owner' WHERE session_id='foreign-session'", [])
+            .unwrap();
diff --git a/crates/hennery-testkit/tests/view.rs b/crates/hennery-testkit/tests/view.rs
index fbff8e78..f3d6c503 100644
--- a/crates/hennery-testkit/tests/view.rs
+++ b/crates/hennery-testkit/tests/view.rs
@@ -26,0 +27,137 @@ const WAIT: Duration = Duration::from_secs(20);
+fn complete_review_turn(c: &Collector, session: &str, name: &str, seq: u64) -> i64 {
+    use hennery_proto::frames::{SessionBody, TurnOutcome};
+    assert!(
+        c.state
+            .store
+            .open_turn(session, name, &[json!({"type":"text","text":"work"})])
+            .unwrap()
+    );
+    for (n, body) in [
+        SessionBody::TurnStarted {
+            request_id: name.into(),
+            turn_id: name.into(),
+        },
+        SessionBody::TurnEnded {
+            turn_id: name.into(),
+            outcome: TurnOutcome::Completed,
+            stop_reason: None,
+            error: None,
+        },
+    ]
+    .iter()
+    .enumerate()
+    {
+        for event in c.state.store.ingest(session, seq + n as u64, body).unwrap() {
+            c.state.hub.publish(event);
+        }
+    }
+    c.state
+        .store
+        .family_summary(session)
+        .unwrap()
+        .unwrap()
+        .review
+        .unwrap()
+        .event_id
+}
+
+#[tokio::test]
+async fn reading_a_result_updates_another_devices_list_and_does_not_hide_a_newer_completion() {
+    let c = Collector::start().await;
+    c.session(&c.owner(), "result");
+    let first = complete_review_turn(&c, "result", "one", 1);
+    let page = c.summaries("").await;
+    assert_eq!(page.waiting, 1);
+    let mut other_device = c
+        .stream(
+            "/api/stream/sessions",
+            Some(&format!("{}:{}", page.epoch, page.revision)),
+        )
+        .await;
+    assert_eq!(other_device.counted().await.0, 1);
+    let reader = c.client();
+    let response = reader
+        .post(c.url("/api/view/sessions/result/read"))
+        .json(&json!({"event_id":first}))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(response.status(), 204);
+    assert!(other_device.message().await.summary().review.is_none());
+    assert_eq!(other_device.counted().await.0, 0);
+    let second = complete_review_turn(&c, "result", "two", 3);
+    assert_eq!(
+        reader
+            .post(c.url("/api/view/sessions/result/read"))
+            .json(&json!({"event_id":first}))
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        204
+    );
+    let page = c.summaries("").await;
+    assert_eq!(page.waiting, 1);
+    assert_eq!(page.sessions[0].review.as_ref().unwrap().event_id, second);
+    let items = c.page("result", "").await;
+    assert!(
+        items
+            .items
+            .iter()
+            .all(|item| !matches!(&item.body, Body::Unrecognised(u) if u.update_kind == "result_read"))
+    );
+}
+
+#[tokio::test]
+async fn result_read_route_is_operator_only_scoped_and_rejects_invalid_event_ids() {
+    let c = Collector::start().await;
+    c.session(&c.owner(), "result");
+    c.other_owner("foreign");
+    let event = complete_review_turn(&c, "result", "one", 1);
+    let path = "/api/view/sessions/result/read";
+    assert!(
+        !reqwest::Client::new()
+            .post(c.url(path))
+            .json(&json!({"event_id":event}))
+            .send()
+            .await
+            .unwrap()
+            .status()
+            .is_success()
+    );
+    for id in ["foreign", "missing"] {
+        assert_eq!(
+            c.client()
+                .post(c.url(&format!("/api/view/sessions/{id}/read")))
+                .json(&json!({"event_id":event}))
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            404
+        );
+    }
+    for body in [
+        json!({"event_id":0}),
+        json!({"event_id":-1}),
+        json!({"event_id":event,"extra":true}),
+        json!({"event_id":"1"}),
+    ] {
+        assert_eq!(
+            c.client().post(c.url(path)).json(&body).send().await.unwrap().status(),
+            400
+        );
+    }
+    assert_eq!(
+        c.client()
+            .post(c.url(path))
+            .json(&json!({"event_id":event+100}))
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        409
+    );
+    assert_eq!(c.summaries("").await.waiting, 1);
+}
+
diff --git a/crates/hennery-view/src/api.rs b/crates/hennery-view/src/api.rs
index b9feab09..0862567b 100644
--- a/crates/hennery-view/src/api.rs
+++ b/crates/hennery-view/src/api.rs
@@ -59,0 +60,5 @@ pub struct SessionSummary {
+    /// A completed or failed result the operator has not read. Reading it
+    /// never answers a permission or an elicitation.
+    #[serde(default, skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub review: Option<ReviewResult>,
@@ -66,0 +72,8 @@ pub struct SessionSummary {
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ReviewResult {
+    #[ts(type = "number")]
+    pub event_id: i64,
+    pub turn_id: String,
+    pub outcome: hennery_proto::frames::TurnOutcome,
+}
+
@@ -272,0 +286 @@ mod tests {
+            review: None,
diff --git a/crates/hennery-view/src/codegen.rs b/crates/hennery-view/src/codegen.rs
index cab3873b..8f89f607 100644
--- a/crates/hennery-view/src/codegen.rs
+++ b/crates/hennery-view/src/codegen.rs
@@ -11 +11 @@ use crate::api::{
-    ItemRemoved, SessionRemoved, SessionSummary, SummaryPage, TurnContent, WaitingChanged,
+    ItemRemoved, ReviewResult, SessionRemoved, SessionSummary, SummaryPage, TurnContent, WaitingChanged,
@@ -29 +29 @@ const HEADER: &str = "// Generated by `cargo run -p hennery-view --bin gen-view`
-const IMPORTS: &str = "import type { InputOrigin, PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord, TitleSource } from \"./protocol\";\n";
+const IMPORTS: &str = "import type { InputOrigin, PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord, TitleSource, TurnOutcome } from \"./protocol\";\n";
@@ -146,0 +147 @@ pub fn render_ts() -> String {
+        ReviewResult,
@@ -191 +192 @@ export type SessionSummary = SessionItem & {
-question_waits: boolean, operator_attention: number, parent_handled_questions: number, family?: FamilySummary, configuration_error?: string, };
+question_waits: boolean, operator_attention: number, review?: ReviewResult, parent_handled_questions: number, family?: FamilySummary, configuration_error?: string, };
@@ -201,0 +203 @@ fn session_summary_ts_is_whole(summary: SessionSummary) {
+        review: _,
diff --git a/crates/hennery-view/src/fold.rs b/crates/hennery-view/src/fold.rs
index 7d4cf15f..5bbcf93c 100644
--- a/crates/hennery-view/src/fold.rs
+++ b/crates/hennery-view/src/fold.rs
@@ -44 +44 @@ pub const SILENT_UPDATES: [&str; 5] = [
-pub const SILENT_EVENTS: [&str; 7] = [
+pub const SILENT_EVENTS: [&str; 8] = [
@@ -45,0 +46 @@ pub const SILENT_EVENTS: [&str; 7] = [
+    "result_read",
diff --git a/docs/README.md b/docs/README.md
index 28c475ac..e25b6c9f 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -34,0 +35 @@ slice); everything else is design. The maintainer's decisions are recorded below
+   - [Needs you result inbox](plans/2026-10-22-needs-you-inbox.md) — approved operator follow-up for v0.3.1, held until v0.3.0 is live: durable result review, explicit/read-on-visible acknowledgement, captured-result prompt acknowledgement, and delegated-child completion suppression. Implementation and local verification are recorded in the plan; independent review and merge remain parent-owned. No release or version bump.
diff --git a/docs/specs/2026-10-20-ui-redesign-design.md b/docs/specs/2026-10-20-ui-redesign-design.md
index d3af4f9e..03bb294f 100644
--- a/docs/specs/2026-10-20-ui-redesign-design.md
+++ b/docs/specs/2026-10-20-ui-redesign-design.md
@@ -343 +343,21 @@ pages load; never display prototype fixture totals as real counts.
-Needs you selects summaries with `operator_attention > 0`. Preserve
+Needs you selects summaries with `operator_attention > 0` or an unread
+`review` result. **Operator amendment, 2026-10-22; target v0.3.1, after v0.3.0
+is live:** completed and failed turns of non-delegated sessions create durable
+"To review" work, independently of pending permissions and questions. The
+queue and session offer "Mark as read" without requiring a reply. The server
+acknowledges a specific completion event monotonically; stale clients cannot
+consume a newer result. The state survives restart and synchronizes through
+ordinary list SSE. Automatic reading requires the actual final result's end
+to be visible in the focused, visible tab; queue previews never acknowledge.
+A successful operator prompt acknowledges only the result captured when the
+send began. Reading never answers a formal pending request. Migration starts
+with an empty review inbox, avoiding a flood of historical results.
+
+Delegated children never produce operator review work, even after their
+parent or family edge disappears. Their ordinary completion pushes remain
+suppressed. Existing explicit operator-required questions and escalation
+records remain authoritative; this amendment does not grant parents approval
+authority. No version bump, tag, publication or deployment belongs to this
+feature branch.
+
+Preserve
@@ -345,2 +365,2 @@ Needs you selects summaries with `operator_attention > 0`. Preserve
-becomes operator work. Do not regex assistant prose for a final question
-or create a read/unread state. A factual `question_waits` alone does not
+becomes operator work. Do not regex assistant prose for a final question.
+Read/unread applies only to completed results. A factual `question_waits` alone does not
@@ -363 +383 @@ this all-lifecycle query is exhausted, not after an overview-filtered cursor
-ends. Its session predicate remains `operator_attention > 0`, so a closed
+ends. Its session predicate is `operator_attention > 0 || review != null`, so a closed
diff --git a/nix/package.nix b/nix/package.nix
index a99c12f8..f75f0704 100644
--- a/nix/package.nix
+++ b/nix/package.nix
@@ -25,0 +26 @@ let
+      ../crates/hennery-sessions/src/review.sql
diff --git a/schema/hennery-view.schema.json b/schema/hennery-view.schema.json
index 13be246c..9be60ac9 100644
--- a/schema/hennery-view.schema.json
+++ b/schema/hennery-view.schema.json
@@ -1126,0 +1127,20 @@
+    "ReviewResult": {
+      "properties": {
+        "event_id": {
+          "format": "int64",
+          "type": "integer"
+        },
+        "outcome": {
+          "$ref": "#/$defs/TurnOutcome"
+        },
+        "turn_id": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "event_id",
+        "turn_id",
+        "outcome"
+      ],
+      "type": "object"
+    },
@@ -1241,0 +1262,11 @@
+        "review": {
+          "anyOf": [
+            {
+              "$ref": "#/$defs/ReviewResult"
+            },
+            {
+              "type": "null"
+            }
+          ],
+          "description": "A completed or failed result the operator has not read. Reading it\nnever answers a permission or an elicitation."
+        },
@@ -1683,0 +1715,10 @@
+    "TurnOutcome": {
+      "description": "How a turn ended. Exactly one `turn_ended` per accepted turn (ACP core §4.4).",
+      "enum": [
+        "completed",
+        "cancelled",
+        "failed",
+        "interrupted"
+      ],
+      "type": "string"
+    },
diff --git a/web/e2e/review.spec.ts b/web/e2e/review.spec.ts
new file mode 100644
index 00000000..3c40ecc6
--- /dev/null
+++ b/web/e2e/review.spec.ts
@@ -0,0 +1,67 @@
+import { expect, test, type Route } from '@playwright/test'
+import type { Item, SessionSummary } from '../src/generated/view'
+import { startCollector, type Collector } from './collector'
+
+let collector: Collector
+test.beforeAll(async () => { collector = await startCollector() })
+test.afterAll(async () => { await collector?.stop() })
+
+for (const width of [1280, 390]) test(`durable review action and visible-result reading at ${width}px`, async ({ browser }) => {
+  const contexts = await Promise.all([browser.newContext({ viewport: { width, height: 900 } }), browser.newContext({ viewport: { width, height: 900 } })])
+  const held: Route[] = [], snapshots: Route[] = [], reads: number[] = []
+  let eventId = 10, readId = 0, holdSnapshot = false
+  const ts = '2026-10-22T10:00:00Z'
+  const base: SessionSummary = { session_id: 'root', title: 'Review coordinator', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/srv/project', created_at: ts, last_event_at: ts, lifecycle: 'active', activity: 'idle', question_waits: false, operator_attention: 0, parent_handled_questions: 0, presumed_parked: false }
+  const row = (): SessionSummary => ({ ...base, review: readId < eventId ? { event_id: eventId, turn_id: 'turn', outcome: 'completed' } : undefined })
+  const child: SessionSummary = { ...base, session_id: 'child', title: 'Parent handled worker', family: { revision: 1, parent: { session_id: 'root', agent: 'claude' }, child_counts: { total: 0, active: 0, waiting: 0 }, children: [], attention: 0 } }
+  const items: Item[] = Array.from({ length: 4 }, (_, n) => ({ id: `message-${n}`, version: 9, ts, turn_id: 'turn', kind: 'message', text: `Result ${n}\n\n` + 'A line of the completed result. '.repeat(400) }))
+  const pageBody = () => ({ items, revision: eventId, epoch: 'items', older: false })
+  for (const context of contexts) await context.route('**/api/**', route => {
+    const request = route.request(), url = new URL(request.url()), path = url.pathname
+    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) })
+    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+    if (path === '/api/hats') return json([{ id: 'hat', name: 'Personal', colour: '#8050d0', created_at: ts, purging: false, default_for_new_hosts: false }])
+    if (path === '/api/hosts') return json([{ host_id: 'host', name: 'Test workstation', connected: true, capabilities: [] }])
+    if (path === '/api/view/sessions') return json({ sessions: [row(), child], waiting: readId < eventId ? 1 : 0, epoch: 'list', revision: eventId })
+    if (path.startsWith('/api/stream/')) { held.push(route); return }
+    if (path === '/api/view/sessions/root/read') { const token = request.postDataJSON().event_id as number; reads.push(token); readId = Math.max(readId, token); return route.fulfill({ status: 204 }) }
+    if (path === '/api/view/sessions/root') {
+      if (holdSnapshot && url.searchParams.get('limit') === '1') { snapshots.push(route); return }
+      return json(pageBody())
+    }
+    if (path === '/api/sessions/root') return json({ ...row(), pending: [] })
+    if (path === '/api/sessions/root/catalog') return json({ session_id: 'root', config_options: [], commands: [] })
+    if (path === '/api/sessions/root/events' || path === '/api/delegation/attention' || path === '/api/push/subscriptions') return json([])
+    if (path === '/api/view/sessions/root/family') return json({ summary: row(), children: [], questions: [] })
+    return route.fulfill({ status: 404, body: '{}' })
+  })
+  try {
+    const a = await contexts[0].newPage(), b = await contexts[1].newPage()
+    await a.goto(collector.origin + '/needs-you')
+    await expect(a.getByRole('article', { name: 'Review coordinator', exact: true })).toBeVisible()
+    await expect(a.getByRole('article', { name: 'Parent handled worker', exact: true })).toHaveCount(0)
+    await b.goto(collector.origin + '/needs-you')
+    await b.getByRole('button', { name: 'Mark as read', exact: true }).click()
+    expect(reads).toEqual([10])
+    await a.reload()
+    await expect(a.getByText('Nothing needs you', { exact: true })).toBeVisible()
+    eventId = 20
+    await a.reload()
+    await expect(a.getByRole('button', { name: 'Mark as read', exact: true })).toBeVisible()
+    holdSnapshot = true
+    await a.goto(collector.origin + '/sessions/root')
+    await expect(a.locator('.result-read-sentinel')).toHaveCount(1)
+    await a.locator('.transcript').evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')) })
+    await expect.poll(() => snapshots.length).toBeGreaterThan(0)
+    for (const route of snapshots.splice(0)) await route.fulfill({ contentType: 'application/json', body: JSON.stringify(pageBody()) })
+    await expect(a.locator('[data-review-ready="true"]')).toHaveCount(1)
+    await a.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
+    expect(reads).toEqual([10])
+    await a.bringToFront()
+    await a.locator('.transcript').evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')) })
+    await expect.poll(() => reads).toEqual([10, 20])
+  } finally {
+    for (const route of [...held, ...snapshots]) await route.abort().catch(() => {})
+    for (const context of contexts) await context.close()
+  }
+})
diff --git a/web/src/api/view.ts b/web/src/api/view.ts
index 716ab770..4b3efeff 100644
--- a/web/src/api/view.ts
+++ b/web/src/api/view.ts
@@ -115,0 +116,5 @@ export function takeOver(client: Client, id: string): Promise<void> {
+
+/** A captured result only; a stale browser cannot acknowledge newer work. */
+export function markResultRead(client: Client, id: string, eventId: number): Promise<void> {
+  return client.request<void>('POST', `/api/view/sessions/${enc(id)}/read`, { event_id: eventId })
+}
diff --git a/web/src/components/AttentionPreview.test.tsx b/web/src/components/AttentionPreview.test.tsx
index 9d389d99..42de719d 100644
--- a/web/src/components/AttentionPreview.test.tsx
+++ b/web/src/components/AttentionPreview.test.tsx
@@ -9,0 +10,12 @@ const question = (pending: string): Item => ({ id: 'question:' + pending, versio
+
+it('reads a completed result preview once per result instead of once per session token update', async () => {
+  const server = routed(() => json({ items: [{ id: 'm', kind: 'message', turn_id: 'turn', version: 9, text: 'Continue?' }], revision: 10, epoch: 'e', older: false }))
+  const reader = new PreviewReader(server.client)
+  const row = { ...session('s'), activity: 'idle', operator_attention: 0, question_waits: false, review: { event_id: 10, turn_id: 'turn', outcome: 'completed' as const } }
+  expect(await reader.read(row)).toEqual({ result: 'Continue?' })
+  expect(await reader.read({ ...row, last_event_at: 'new-token' })).toEqual({ result: 'Continue?' })
+  expect(server.calls.map(call => [call.method, call.path])).toEqual([['GET', '/api/view/sessions/s?limit=1']])
+  await reader.read({ ...row, review: { ...row.review, event_id: 20 } })
+  expect(server.calls).toHaveLength(2)
+  reader.stop()
+})
diff --git a/web/src/components/AttentionPreview.tsx b/web/src/components/AttentionPreview.tsx
index 1aa2e308..7b14841b 100644
--- a/web/src/components/AttentionPreview.tsx
+++ b/web/src/components/AttentionPreview.tsx
@@ -5 +5,2 @@ import { messageOf } from '../api/errors'
-import { questionCard, sessionDetail } from '../api/view'
+import { itemPage, questionCard, sessionDetail } from '../api/view'
+import ResultReview from './ResultReview'
@@ -40 +41 @@ function InlinePermission({ question, session }: { question: Extract<Item, { kin
-type Preview = { question?: Extract<Item, { kind: 'question' }>; attention?: OperatorAttention; partial?: boolean }
+type Preview = { question?: Extract<Item, { kind: 'question' }>; attention?: OperatorAttention; partial?: boolean; result?: string }
@@ -47,0 +49 @@ export class PreviewReader {
+  private results = new Map<string, Promise<Preview>>()
@@ -50 +52 @@ export class PreviewReader {
-  stop() { this.stopped = true; this.abort.abort(); this.queue = []; this.cache = new WeakMap(); this.questions.clear() }
+  stop() { this.stopped = true; this.abort.abort(); this.queue = []; this.cache = new WeakMap(); this.results.clear(); this.questions.clear() }
@@ -61,0 +64,10 @@ export class PreviewReader {
+    if (session.review && session.operator_attention === 0) {
+      const key = JSON.stringify([session.session_id, session.review.event_id])
+      let result = this.results.get(key)
+      if (!result) {
+        result = this.load(session)
+        if (this.results.size >= 256) this.results.delete(this.results.keys().next().value!)
+        this.results.set(key, result)
+      }
+      return result
+    }
@@ -70,0 +83,5 @@ export class PreviewReader {
+    if (session.review && session.operator_attention === 0) {
+      const page = await this.task(() => itemPage(this.client, session.session_id, { limit: 1 }))
+      const message = [...page.items].reverse().find(item => item.turn_id === session.review?.turn_id && item.kind === 'message')
+      return { result: message?.kind === 'message' ? message.text.slice(0, 400) : undefined }
+    }
@@ -145 +162,2 @@ export default function AttentionPreview({ session }: { session: SessionSummary
-    <button type="button" className="attention-dismiss" aria-label={dismissed ? 'Restore' : 'Dismiss'} title={attention ? 'Acknowledge this attention' : 'Dismiss in this browser'} disabled={!key || dismissing} onClick={() => void dismiss()}>{dismissed ? '↶' : '×'}</button>
+    {!session.review && <button type="button" className="attention-dismiss" aria-label={dismissed ? 'Restore' : 'Dismiss'} title={attention ? 'Acknowledge this attention' : 'Dismiss in this browser'} disabled={!key || dismissing} onClick={() => void dismiss()}>{dismissed ? '↶' : '×'}</button>}
+    {session.review && <><p className="preview-result-label">{session.review.outcome === 'failed' ? 'Turn failed · To review' : 'Result to review'}</p>{held?.value?.result && <p className="preview-question"><bdi>{held.value.result}</bdi></p>}<ResultReview key={session.review.event_id} id={session.session_id} review={session.review} /></>}
diff --git a/web/src/components/CommandPalette.tsx b/web/src/components/CommandPalette.tsx
index 24194c26..ef1a188a 100644
--- a/web/src/components/CommandPalette.tsx
+++ b/web/src/components/CommandPalette.tsx
@@ -1,0 +2 @@ import { useSessionNames } from './SessionNames'
+import { needsOperator } from '../lib/status'
@@ -80 +81 @@ export default function CommandPalette({ actions, loaded, close }: {
-    icon: (row.operator_attention > 0 ? 'hand-raised' : row.activity === 'running' ? 'play-circle' : 'clock') as IconName,
+    icon: (needsOperator(row) ? 'hand-raised' : row.activity === 'running' ? 'play-circle' : 'clock') as IconName,
@@ -91 +92 @@ export default function CommandPalette({ actions, loaded, close }: {
-    { label: 'Needs you', results: rows.filter(row => row.operator_attention > 0 && (q || !recentIds.has(row.session_id))).map(sessionResult) },
+    { label: 'Needs you', results: rows.filter(row => needsOperator(row) && (q || !recentIds.has(row.session_id))).map(sessionResult) },
@@ -93 +94 @@ export default function CommandPalette({ actions, loaded, close }: {
-    { label: q ? 'Matching sessions' : 'Sessions', results: rows.filter(row => row.operator_attention === 0 && (q || !recentIds.has(row.session_id))).map(sessionResult) },
+    { label: q ? 'Matching sessions' : 'Sessions', results: rows.filter(row => !needsOperator(row) && (q || !recentIds.has(row.session_id))).map(sessionResult) },
diff --git a/web/src/components/Composer.test.tsx b/web/src/components/Composer.test.tsx
index 2c6baa0f..488c9699 100644
--- a/web/src/components/Composer.test.tsx
+++ b/web/src/components/Composer.test.tsx
@@ -106,0 +107,22 @@ const sendButton = () => screen.getByRole('button', { name: 'Send' })
+it('acknowledges only the displayed result captured when a successful send began', async () => {
+  let finish!: (response: Response) => void
+  const first = vi.fn(), newer = vi.fn()
+  const view = mount(() => new Promise<Response>(resolve => { finish = resolve }), { onSent: first })
+  type('Continue')
+  fireEvent.click(sendButton())
+  await waitFor(() => expect(view.prompts()).toHaveLength(1))
+  view.rerender({ onSent: newer })
+  await act(async () => { finish(json({ turn_id: 't-new' }, 202)) })
+  expect(first).toHaveBeenCalledOnce()
+  expect(newer).not.toHaveBeenCalled()
+})
+
+it('does not acknowledge a result when sending a prompt is refused', async () => {
+  const read = vi.fn()
+  mount(() => json({ code: 'turn_in_progress', message: 'Busy' }, 409), { onSent: read })
+  type('Continue')
+  fireEvent.click(sendButton())
+  await waitFor(() => expect(sendButton()).toBeEnabled())
+  expect(read).not.toHaveBeenCalled()
+})
+
diff --git a/web/src/components/Composer.tsx b/web/src/components/Composer.tsx
index 4cab8631..d9954c03 100644
--- a/web/src/components/Composer.tsx
+++ b/web/src/components/Composer.tsx
@@ -92,0 +93,2 @@ export interface ComposerProps {
+  /** Acknowledges only the result visible when this send began. */
+  onSent?: () => void
@@ -119 +121 @@ type Outcome = { sent: true } | { sent: false; notice: Notice }
-function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog, onResume, onJumpToQuestion, handle }: ComposerProps) {
+function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog, onResume, onJumpToQuestion, onSent, handle }: ComposerProps) {
@@ -344,0 +347 @@ function SessionComposer({ sessionId, session, capabilities, catalog, onCatalog,
+    onSent?.()
diff --git a/web/src/components/NeedsYou.test.tsx b/web/src/components/NeedsYou.test.tsx
index 356ff6ec..61a5af5a 100644
--- a/web/src/components/NeedsYou.test.tsx
+++ b/web/src/components/NeedsYou.test.tsx
@@ -12,0 +13,33 @@ const page = (sessions: SessionSummary[], next?: string) => json({ sessions, nex
+
+it('an unread result bypasses an old local dismiss and reading it keeps formal work in the queue', async () => {
+  history.replaceState(null, '', '/needs-you')
+  localStorage.setItem('hennery.dismissedAttention', JSON.stringify({ result: `session:${ts}:0` }))
+  const streams: LiveStream[] = []
+  let current = row('result', { title: 'Review result', activity: 'idle', operator_attention: 0, review: { event_id: 10, turn_id: 't', outcome: 'completed' } })
+  const server = routed(({ path, method }) => {
+    const url = new URL(path, 'http://h')
+    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
+    if (path === '/api/hats') return json([hat()])
+    if (path === '/api/hosts') return json([host()])
+    if (url.pathname === '/api/view/sessions') return json({ sessions: [current], waiting: 1, epoch: 'list', revision: 10 })
+    if (url.pathname === '/api/stream/sessions') { const live = liveStream(); streams.push(live); return live.response }
+    if (url.pathname === '/api/view/sessions/result/read' && method === 'POST') {
+      current = { ...current, review: undefined, operator_attention: 1, question_waits: true }
+      streams.at(-1)!.event('session_upsert', current)
+      return new Response(null, { status: 204 })
+    }
+    if (url.pathname === '/api/view/sessions/result') return json({ items: [{ id: 'm', kind: 'message', turn_id: 't', version: 9, ts, text: 'Continue?' }], older: false, epoch: 'items', revision: 10 })
+    if (url.pathname === '/api/sessions/result') return json({ ...current, pending: [{ pending_id: 'permission', state: 'open', answered: false }] })
+    if (url.pathname.includes('/questions/')) return json({ id: 'question:permission', kind: 'question', version: 11, ts, pending_id: 'permission', question_kind: 'permission', request: { type: 'permission', title: 'Approve deployment', options: [{ option_id: 'allow', name: 'Allow', option_kind: 'allow_once' }] }, state: 'open', answered: false, answerable: true })
+    return json({}, 404)
+  })
+  render(<App fetchImpl={server.fetch} />)
+  const queue = await screen.findByRole('region', { name: 'Attention queue' })
+  const card = await within(queue).findByRole('article', { name: 'Review result' })
+  await within(card).findByText('Continue?', { exact: true })
+  await waitFor(() => expect(streams.length).toBeGreaterThan(0))
+  await userEvent.click(within(card).getByRole('button', { name: 'Mark as read' }))
+  await within(card).findByRole('button', { name: 'Allow' })
+  expect(within(queue).getByRole('article', { name: 'Review result' })).toBeVisible()
+  expect(server.calls.filter(call => call.method === 'POST').map(call => call.path)).toEqual(['/api/view/sessions/result/read'])
+})
diff --git a/web/src/components/NeedsYouQueue.tsx b/web/src/components/NeedsYouQueue.tsx
index 7fe26c7a..680410b8 100644
--- a/web/src/components/NeedsYouQueue.tsx
+++ b/web/src/components/NeedsYouQueue.tsx
@@ -33 +33 @@ export default function NeedsYouQueue({ embedded = false }: { embedded?: boolean
-    {embedded && <h2 className="queue-title">Needs you <span>Permissions, questions, and requests waiting for you</span></h2>}
+    {embedded && <h2 className="queue-title">Needs you <span>Questions, permissions, and results to review</span></h2>}
diff --git a/web/src/components/ResultReadObserver.tsx b/web/src/components/ResultReadObserver.tsx
new file mode 100644
index 00000000..63bf3327
--- /dev/null
+++ b/web/src/components/ResultReadObserver.tsx
@@ -0,0 +1,47 @@
+import { useEffect, useRef, useState } from 'react'
+import { useClient } from '../app-client'
+import { itemPage } from '../api/view'
+import type { Item, ReviewResult } from '../generated/view'
+import { useReadResult } from './ResultReview'
+
+/** The list and item streams can arrive in either order. Verify the final
+ * item against a page taken after completion before observing its visible end. */
+export default function ResultReadObserver({ id, review, lastItem }: { id: string; review: ReviewResult; lastItem: Item }) {
+  const client = useClient(), ref = useRef<HTMLDivElement>(null)
+  const [target, setTarget] = useState<{ token: number; item: Item } | null>(null)
+  const { read } = useReadResult(id, review)
+  useEffect(() => {
+    let alive = true
+    void itemPage(client, id, { limit: 1 }).then(page => {
+      const item = [...page.items].reverse().find(item => item.turn_id === review.turn_id)
+      if (alive && page.revision >= review.event_id && item) setTarget({ token: review.event_id, item })
+    }).catch(() => { /* Manual acknowledgement remains available. */ })
+    return () => { alive = false }
+  }, [client, id, review.event_id, review.turn_id])
+  useEffect(() => {
+    if (target?.token !== review.event_id || target.item.id !== lastItem.id || target.item.version > lastItem.version) return
+    const el = ref.current, root = el?.closest<HTMLElement>('.transcript')
+    if (!el || !root) return
+    const check = () => {
+      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
+      const box = el.getBoundingClientRect(), viewport = root.getBoundingClientRect()
+      if (box.width > 0 && box.height > 0 && viewport.height > 0 && box.top >= Math.max(0, viewport.top)
+        && box.bottom <= Math.min(window.innerHeight, viewport.bottom)
+        && box.left < Math.min(window.innerWidth, viewport.right) && box.right > Math.max(0, viewport.left)) void read()
+    }
+    const frame = requestAnimationFrame(check)
+    root.addEventListener('scroll', check)
+    window.addEventListener('focus', check)
+    window.addEventListener('resize', check)
+    document.addEventListener('visibilitychange', check)
+    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(check, { root })
+    observer?.observe(el)
+    return () => {
+      cancelAnimationFrame(frame); observer?.disconnect()
+      root.removeEventListener('scroll', check); window.removeEventListener('focus', check)
+      window.removeEventListener('resize', check); document.removeEventListener('visibilitychange', check)
+    }
+  }, [target, review.event_id, lastItem.id, lastItem.version, read])
+  const ready = target?.token === review.event_id && target.item.id === lastItem.id && target.item.version <= lastItem.version
+  return <div ref={ref} data-review-ready={ready ? 'true' : 'false'} className="result-read-sentinel" aria-hidden="true" style={{ height: 1 }} />
+}
diff --git a/web/src/components/ResultReview.test.tsx b/web/src/components/ResultReview.test.tsx
new file mode 100644
index 00000000..7f9196d1
--- /dev/null
+++ b/web/src/components/ResultReview.test.tsx
@@ -0,0 +1,107 @@
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { expect, it, vi } from 'vitest'
+import { json, routed } from '../test-stream'
+import ResultReview from './ResultReview'
+import ResultReadObserver from './ResultReadObserver'
+import type { Item, ReviewResult } from '../generated/view'
+import { needsOperator, statusOf } from '../lib/status'
+
+const review: ReviewResult = { event_id: 10, turn_id: 'turn', outcome: 'completed' }
+const message: Item = { id: 'result', version: 9, ts: '', turn_id: 'turn', kind: 'message', text: 'Continue?' }
+const rect = (top: number, bottom: number) => ({ x: 0, y: top, top, bottom, left: 0, right: 300, width: 300, height: bottom - top, toJSON: () => ({}) })
+
+it('marks a captured result read without sending a message and re-arms for a newer result', async () => {
+  const server = routed(() => new Response(null, { status: 204 }))
+  const view = render(<ResultReview id="s/1" review={review} />, { wrapper: server.wrapper })
+  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
+  await screen.findByRole('button', { name: 'Read' })
+  expect(server.calls.map(call => [call.method, call.path])).toEqual([['POST', '/api/view/sessions/s%2F1/read']])
+  expect(JSON.parse(server.fetch.mock.calls[0][1]!.body as string)).toEqual({ event_id: 10 })
+  view.rerender(<ResultReview id="s/1" review={{ ...review, event_id: 20 }} />)
+  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
+  expect(JSON.parse(server.fetch.mock.calls[1][1]!.body as string)).toEqual({ event_id: 20 })
+})
+
+it('a delayed acknowledgement never marks the newly displayed result read', async () => {
+  let release!: (response: Response) => void
+  const server = routed(() => new Promise<Response>(resolve => { release = resolve }))
+  const view = render(<ResultReview id="s" review={review} />, { wrapper: server.wrapper })
+  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
+  view.rerender(<ResultReview id="s" review={{ ...review, event_id: 20 }} />)
+  await act(async () => { release(new Response(null, { status: 204 })) })
+  expect(screen.getByRole('button', { name: 'Mark as read' })).toBeEnabled()
+  expect(server.calls).toHaveLength(1)
+})
+
+it('keeps an unsuccessful acknowledgement available to retry', async () => {
+  const server = routed(() => json({ error: { code: 'internal', message: 'Could not save read state' } }, 500))
+  render(<ResultReview id="s" review={review} />, { wrapper: server.wrapper })
+  await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
+  await screen.findByRole('alert')
+  expect(screen.getByRole('button', { name: 'Mark as read' })).toBeEnabled()
+})
+
+it('waits for the final content, visible result end and focused tab before automatic reading', async () => {
+  let focused = false, visible = 'hidden', bottom = 400
+  let finishSnapshot!: (response: Response) => void
+  const snapshot = new Promise<Response>(resolve => { finishSnapshot = resolve })
+  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
+  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible as DocumentVisibilityState)
+  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
+    return this.classList.contains('transcript') ? rect(0, 300) : rect(bottom - 1, bottom)
+  })
+  const server = routed(call => call.method === 'POST' ? new Response(null, { status: 204 }) : snapshot)
+  const view = render(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={{ ...message, version: 8 }} /></div>, { wrapper: server.wrapper })
+  await waitFor(() => expect(server.calls).toHaveLength(1))
+  focused = true; visible = 'visible'; bottom = 200
+  fireEvent.focus(window)
+  await act(async () => { finishSnapshot(json({ items: [message], revision: 10, epoch: 'e', older: false })) })
+  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)) })
+  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
+  view.rerender(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={message} /></div>)
+  await waitFor(() => expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1))
+  fireEvent.focus(window)
+  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1)
+})
+
+it('a hidden or scrolled-away result stays unread even after its content loads', async () => {
+  let focused = false, bottom = 400
+  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
+  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
+  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
+    return this.classList.contains('transcript') ? rect(0, 300) : rect(bottom - 1, bottom)
+  })
+  const server = routed(call => call.method === 'POST' ? new Response(null, { status: 204 }) : json({ items: [message], revision: 10, epoch: 'e', older: false }))
+  const view = render(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={message} /></div>, { wrapper: server.wrapper })
+  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)) })
+  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
+  focused = true; fireEvent.focus(window)
+  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
+  bottom = 200; fireEvent.scroll(view.container.querySelector('.transcript')!)
+  await waitFor(() => expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1))
+})
+
+it('review membership and labels preserve formal question precedence', () => {
+  const row = { lifecycle: 'closed', presumed_parked: false, question_waits: false, operator_attention: 0, review }
+  expect(needsOperator(row)).toBe(true)
+  expect(statusOf(row).label).toBe('To review')
+  expect(statusOf({ ...row, operator_attention: 1 }).label).toBe('Waiting on you')
+  expect(needsOperator({ ...row, review: undefined })).toBe(false)
+})
+
+it.each(['focus', 'visibility', 'viewport'])('automatic reading requires %s independently', async gate => {
+  let ready = false
+  vi.spyOn(document, 'hasFocus').mockImplementation(() => ready || gate !== 'focus')
+  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => ready || gate !== 'visibility' ? 'visible' : 'hidden')
+  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
+    return this.classList.contains('transcript') ? rect(0, 300) : !ready && gate === 'viewport' ? rect(399, 400) : rect(199, 200)
+  })
+  const server = routed(call => call.method === 'POST' ? new Response(null, { status: 204 }) : json({ items: [message], revision: 10, epoch: 'e', older: false }))
+  const view = render(<div className="transcript"><ResultReadObserver id="s" review={review} lastItem={message} /></div>, { wrapper: server.wrapper })
+  await waitFor(() => expect(view.container.querySelector('[data-review-ready="true"]')).not.toBeNull())
+  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)) })
+  expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0)
+  ready = true; fireEvent.focus(window)
+  await waitFor(() => expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(1))
+})
diff --git a/web/src/components/ResultReview.tsx b/web/src/components/ResultReview.tsx
new file mode 100644
index 00000000..342a5ae9
--- /dev/null
+++ b/web/src/components/ResultReview.tsx
@@ -0,0 +1,38 @@
+import { useCallback, useEffect, useRef, useState } from 'react'
+import { useClient } from '../app-client'
+import { markResultRead } from '../api/view'
+import { messageOf } from '../api/errors'
+import type { ReviewResult } from '../generated/view'
+
+/** The acknowledgement is scoped to the rendered result, never to whatever
+ * result happens to be current when the HTTP response arrives. */
+export function useReadResult(id: string, review?: ReviewResult) {
+  const client = useClient()
+  const token = review?.event_id
+  const [state, setState] = useState<{ token: number; busy?: boolean; read?: boolean; error?: string } | null>(null)
+  const sending = useRef<number | undefined>(undefined)
+  const completed = useRef<number | undefined>(undefined)
+  const alive = useRef(true)
+  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
+  const read = useCallback(async () => {
+    if (token === undefined || sending.current === token || completed.current === token) return
+    sending.current = token
+    setState({ token, busy: true })
+    try {
+      await markResultRead(client, id, token)
+      completed.current = token
+      if (alive.current) setState({ token, read: true })
+    } catch (error) {
+      if (alive.current) setState({ token, error: messageOf(error) })
+    } finally { if (sending.current === token) sending.current = undefined }
+  }, [client, id, token])
+  return { read, state: state?.token === token ? state : null }
+}
+
+export default function ResultReview({ id, review }: { id: string; review: ReviewResult }) {
+  const { read, state } = useReadResult(id, review)
+  return <div className="result-review-actions">
+    <button type="button" className="btn btn-ghost btn-sm" disabled={state?.busy || state?.read} onClick={() => void read()}>{state?.read ? 'Read' : state?.busy ? 'Marking as read…' : 'Mark as read'}</button>
+    {state?.error && <p role="alert" className="form-error">{state.error}</p>}
+  </div>
+}
diff --git a/web/src/components/SessionHeader.tsx b/web/src/components/SessionHeader.tsx
index 751af86a..14d2da4c 100644
--- a/web/src/components/SessionHeader.tsx
+++ b/web/src/components/SessionHeader.tsx
@@ -7 +7 @@ import { useRef, useState, type ReactNode, type RefObject } from 'react'
-import type { FamilySummary, PlanEntry } from '../generated/view'
+import type { FamilySummary, PlanEntry, ReviewResult } from '../generated/view'
@@ -21 +21 @@ import RenameSession from './RenameSession'
-export type HeaderInfo = SessionItem & { question_waits?: boolean; operator_attention?: number; parent_handled_questions?: number; family?: FamilySummary }
+export type HeaderInfo = SessionItem & { question_waits?: boolean; operator_attention?: number; review?: ReviewResult; parent_handled_questions?: number; family?: FamilySummary }
@@ -65,0 +66 @@ export default function SessionHeader({ id, info, hostName, menu, detailsOpen, t
+        review: info.review,
diff --git a/web/src/components/SessionScope.tsx b/web/src/components/SessionScope.tsx
index 8e6ab255..d52672db 100644
--- a/web/src/components/SessionScope.tsx
+++ b/web/src/components/SessionScope.tsx
@@ -127 +127 @@ export default function SessionScope({ route, children, onReconnect }: { route:
-  const isAttentionDismissed = useCallback((id: string) => Object.hasOwn(dismissed, id) && (!attentionKeys.has(id) || dismissed[id] === attentionKeys.get(id)), [dismissed, attentionKeys])
+  const isAttentionDismissed = useCallback((id: string) => !list.all.get(id)?.review && !attentionRows.find(row => row.session_id === id)?.review && Object.hasOwn(dismissed, id) && (!attentionKeys.has(id) || dismissed[id] === attentionKeys.get(id)), [dismissed, attentionKeys, list.all, attentionRows])
diff --git a/web/src/components/Transcript.tsx b/web/src/components/Transcript.tsx
index f17d77a3..86f943b7 100644
--- a/web/src/components/Transcript.tsx
+++ b/web/src/components/Transcript.tsx
@@ -10 +10,2 @@ import { clockTime } from '../lib/time'
-import type { Item } from '../generated/view'
+import type { Item, ReviewResult } from '../generated/view'
+import ResultReadObserver from './ResultReadObserver'
@@ -74 +75 @@ const Row = memo(function Row({ item, env }: { item: Item; env: ItemEnv }) {
-export default function Transcript({ items, env, turnEnds, waiting = false }: { items: Item[]; env: ItemEnv; turnEnds?: ReadonlyMap<string, string>; waiting?: boolean }) {
+export default function Transcript({ items, env, turnEnds, waiting = false, review }: { items: Item[]; env: ItemEnv; turnEnds?: ReadonlyMap<string, string>; waiting?: boolean; review?: ReviewResult }) {
@@ -80 +81,2 @@ export default function Transcript({ items, env, turnEnds, waiting = false }: {
-        return <Fragment key={item.id}><Row item={item} env={env} />{end && <div className="divider turn-complete"><span>Turn complete{waiting && index === items.length - 1 ? ' — waiting for input' : ''} · <time dateTime={end}>{clockTime(end)}</time></span></div>}</Fragment>
+        const reviewEnd = review && item.turn_id === review.turn_id && item.turn_id !== items[index + 1]?.turn_id
+        return <Fragment key={item.id}><Row item={item} env={env} />{end && <div className="divider turn-complete"><span>Turn complete{waiting && index === items.length - 1 ? ' — waiting for input' : ''} · <time dateTime={end}>{clockTime(end)}</time></span></div>}{reviewEnd && <ResultReadObserver key={review.event_id} id={env.sessionId} review={review} lastItem={item} />}</Fragment>
diff --git a/web/src/generated/view.ts b/web/src/generated/view.ts
index d52aa378..f86b8405 100644
--- a/web/src/generated/view.ts
+++ b/web/src/generated/view.ts
@@ -3 +3 @@
-import type { InputOrigin, PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord, TitleSource } from "./protocol";
+import type { InputOrigin, PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord, TitleSource, TurnOutcome } from "./protocol";
@@ -222 +222 @@ export type SessionSummary = SessionItem & {
-question_waits: boolean, operator_attention: number, parent_handled_questions: number, family?: FamilySummary, configuration_error?: string, };
+question_waits: boolean, operator_attention: number, review?: ReviewResult, parent_handled_questions: number, family?: FamilySummary, configuration_error?: string, };
@@ -245,0 +246,2 @@ waiting: number, };
+export type ReviewResult = { event_id: number, turn_id: string, outcome: TurnOutcome, };
+
diff --git a/web/src/lib/status.ts b/web/src/lib/status.ts
index f70fa4c8..4eb1ddd0 100644
--- a/web/src/lib/status.ts
+++ b/web/src/lib/status.ts
@@ -21,0 +22 @@ export interface StatusInput {
+  review?: { event_id: number }
@@ -34,0 +36 @@ export function statusOf(s: StatusInput): Marker {
+  if (s.review) return { tone: 'attn', label: 'To review', resume: s.lifecycle === 'parked' }
@@ -66 +68 @@ export const STATUS_LABEL: Record<StatusFilter, string> = { all: 'All', attentio
-export function needsOperator(s: StatusInput): boolean { return (s.operator_attention ?? 0) > 0 }
+export function needsOperator(s: StatusInput): boolean { return (s.operator_attention ?? 0) > 0 || !!s.review }
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index c19171b8..bafc1173 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -1,0 +2 @@ import SessionName from '../components/SessionNames'
+import ResultReview, { useReadResult } from '../components/ResultReview'
@@ -265,0 +267 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
+  const { read: acknowledgeResult } = useReadResult(id, info?.review)
@@ -486,0 +489 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
+      {info?.review && <ResultReview key={info.review.event_id} id={id} review={info.review} />}
@@ -517 +520 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
-          <Transcript items={win.visible} env={env} turnEnds={turnEnds} waiting={info?.lifecycle === 'active' && info.activity === 'idle' && !info.question_waits && !info.family?.child_counts.active} />
+          <Transcript items={win.visible} env={env} review={info?.review} turnEnds={turnEnds} waiting={info?.lifecycle === 'active' && info.activity === 'idle' && !info.question_waits && !info.family?.child_counts.active} />
@@ -525,0 +529 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
+        onSent={info?.review ? () => void acknowledgeResult() : undefined}
diff --git a/web/src/store/sessionList.ts b/web/src/store/sessionList.ts
index 26630c34..c3b4cf92 100644
--- a/web/src/store/sessionList.ts
+++ b/web/src/store/sessionList.ts
@@ -178 +178 @@ export function carryWaiting(held: ReadonlySet<string>, state: ListState, hat: s
-const isWaiting = (s: SessionSummary) => s.operator_attention !== undefined ? s.operator_attention > 0 : s.activity === 'blocked' || s.question_waits
+const isWaiting = (s: SessionSummary) => !!s.review || (s.operator_attention !== undefined ? s.operator_attention > 0 : s.activity === 'blocked' || s.question_waits)
```

## Verification commands

From the worktree root, inside nix develop:

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo clippy -p hennery --locked -- -D warnings
cargo test --workspace --locked
cargo run -p hennery-proto --bin gen --locked -- --check
cargo run -p hennery-view --bin gen-view --locked -- --check
pnpm --dir web install --frozen-lockfile
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web build
cargo build -p hennery -p hennery-testkit --bins --locked
CI=1 pnpm --dir web exec playwright test attention.spec.ts review.spec.ts --project=chromium
```

## After this plan

The parent runs independent review and opens/merges a PR only after the v0.3.0 release is live. Rebase then, resolve any migration-number conflict, regenerate/check contracts and rerun checks required for the eventual base. CI on Linux and macOS is the platform check of record. No release artifacts have been published by this plan.

Generated with Claude AI — please review before distribution.
