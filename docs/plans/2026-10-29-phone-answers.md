# Phone answers, deep links and gateway relay (P2) Implementation Plan

> **For agentic workers:** Execute one task at a time with test-before-feature evidence. The fleet parent supplies independent task, security and whole-branch reviews; no self-review is claimed.

**Goal:** A notification opens the current authenticated question card, including one outside the tail. Mobile answers use the existing durable queue. Gateway push invalidates its existing shared reader. Preserve input and in-flight operations across notification taps.

**Architecture:** A DEFERRED SQLite snapshot constructs every stored/overlaid Question Item. The client pins bounded old-card reads alongside its paged tail and shares one stable-id/version fence with SSE. The worker validates links twice, focuses exact targets without a reload, and leases a ready document before navigation. Gateway push carries only an untrusted invalidation hint.

**Tech stack:** Existing Rust/rusqlite/axum/hennery-view and React/TypeScript/Vite service worker. No dependency, migration, generated DTO, PushPayload or answer-protocol change.

**Spec:** [Phone design](../specs/2026-10-14-phone-design.md) §§6–7 and 10; [client view](../specs/2026-10-02-client-view-design.md) §§3–4; [frontend](../specs/2026-09-26-frontend-design.md) §§6.3, 9–10. Builds on [P1](2026-10-26-phone-pwa.md) and [4e-ii-b](2026-10-24-web-mcp-oauth.md), especially their After this plan handoffs. Base: `256691fe` (P1 included).

## Execution status

Built first in `plan/phone-p2`. The exact patches below are extracted from the built files; fresh replay and final verification are recorded in Task 4. Independent review and installed-device/vendor acceptance remain parent-owned. This is not release approval.

## Scope

Four tasks: (1) coherent question lookup, shared HTTP/SSE overlay and encoded trigger URLs; (2) worker navigation/readiness and gateway relay; (3) live/pinned cards and safe mobile answers with embedded-browser acceptance; (4) replay, probes, gates and the manual installed-iOS checklist.

Out: lock-screen approval/text submission, an offline answer outbox, another SSE connection/poller, subscription-protocol changes, full Settings, WSS or standalone-gateway delivery, deployment and vendor/installed-device acceptance claims.

## Decisions

1. **Settled operator default:** tap opens the live card; answers happen in the authenticated app. Existing Origin, ownership and durable-queue semantics decide all mutations.
2. **One snapshot:** the owner/session existence check, pending row, opened event, version and group use one guarded DEFERRED transaction. A writer can commit between reads while the reader retains its original snapshot. HTTP, SSE outside-tail construction and overlay all call this accessor. Serialization and sends happen after it returns.
3. **Ready-document ownership:** a dedicated MessageChannel binds attempt id, canonical target and a 2-second lease; the worker waits at most 500 ms for the acknowledgement and re-enumerates the exact client before navigating. Edits, interactions and API mutations cannot start during a granted lease. Failure releases the lease; expiry bounds a lost worker. Exact-target focus needs no readiness and never navigates.
4. **Conservative input retention:** a document that has been edited/interacted with stays dirty until it closes, including unmounted drafts/images. This can open an extra window after edits were later cleared, but avoids declaring an in-memory draft safe by inspecting only currently mounted fields. Ordinary non-standalone Chromium windows acknowledge separately opening targets, covered by the browser gate. Every existing same-origin document must be accounted for; standalone, unknown or unresponsive contexts receive a non-destructive in-app link hint instead. The hint's explicit link uses a native blank target with noopener/noreferrer, preserving the current document rather than switching its SPA route. Its touch target is at least 44 px, asserted by the browser gate. Actual installed-app reuse remains a manual acceptance gate.
5. **Bounded old cards:** keep up to 256 old question items outside loaded groups; each uses the Rust view caps. A newer item wins regardless of HTTP/SSE arrival order, and paging joins a pin once. Session removal invalidates an in-flight read. A linked delivered/withdrawn card is revealed even above the rendered tail; a late event never activates an option or steals typing.
6. **Ambiguous sends:** preserve form input; read the current bounded question before exposing an explicit retry. Failed recovery offers Refresh question. No reconnect or refresh replays a POST. Delivered verdicts remain monotonic. An API retry after step-up retains mutation ownership until its response is read.
7. **Gateway:** after notification display, only a validated /mcp target sends the two-field v1 hint. The app checks its active registration, coalesces through McpScope.refresh, retains hidden dirty state and reads on visibility/focus. Timer reads alone pause during consent. Hints never patch a status or invoke authorization/probes.
8. **Browser gate repair:** the existing MCP focus assertion failed reproducibly at both widths. Capture the pre-dialog control in App before inert blurs it; StepUpDialog returns there. The existing browser assertion is retained, and jsdom is not used to claim inert/focus layout proof. This small accessibility correction was needed to complete the unchanged web gate.

These implementation choices require the parent's independent security/task review; none is labelled independently approved here.

## Global constraints

- Use plain nix develop from this worktree; no shared Cargo target, global installs or real data/home for spawned binaries. Clear SSL_CERT_FILE/SSL_CERT_DIR for process tests; the browser spawn helper already uses an environment allowlist.
- Keep P1's digest/static-cache, registration journal, ownership fences, natural worker activation, CSP and subscription/privacy controls. No production push/click injection endpoint.
- Never take a database guard across async delivery. Preserve owner/session filters and add the accessor's statements to the owner audit.
- Every new effect/security guard is exercised and revert-probed in a COPY. Do not mutate the implementation worktree for probes. Compare staged bytes with the tested files.
- The parent owns GitHub, review, CI and merges. Push only plan/phone-p2 over SSH, with the personal author and signing disabled per AGENTS.md.

## Review focus

Review the DEFERRED snapshot and shared overlay, especially equal-version HTTP/SSE semantics; phantom events in another session cannot establish association. Review readiness source/port/target/lease binding, edits racing acknowledgement, expiry and failed navigation, ordinary-browser separate targets versus installed-app hints, conservative dirty lifetime and every mutation boundary. Review HTTP/SSE ordering, session-removal fencing, pin/page deduplication, ambiguous-answer recovery, preserved drafts and delivered verdicts. Review the gateway hint with focus/timers/visibility fallbacks suppressed and verify it starts no second reader. Confirm the accessibility gate repair and all manual coverage gaps.

## File structure

Task 1:

- `crates/hennery-sessions/src/notify.rs`
- `crates/hennery-sessions/src/store.rs`
- `crates/hennery-sessions/src/view.rs`
- `crates/hennery-sessions/tests/push_edges.rs`
- `crates/hennery-testkit/tests/owner_filter.rs`
- `crates/hennery-testkit/tests/reconcile.rs`
- `crates/hennery-testkit/tests/view.rs`

Task 2:

- `web/e2e/push-fixture.ts`
- `web/src/App.tsx`
- `web/src/api/client.ts`
- `web/src/components/McpScope.test.tsx`
- `web/src/components/McpScope.tsx`
- `web/src/components/NotificationNavigation.tsx`
- `web/src/components/StepUpDialog.tsx`
- `web/src/main.tsx`
- `web/src/pwa/navigation.test.ts`
- `web/src/pwa/navigation.ts`
- `web/src/pwa/notification.test.ts`
- `web/src/pwa/notification.ts`
- `web/src/pwa/worker.test.ts`
- `web/worker.js`

Task 3:

- `web/e2e/pwa.spec.ts`
- `web/src/api/view.ts`
- `web/src/components/items/QuestionCard.tsx`
- `web/src/lib/delivery.ts`
- `web/src/screens/Session.answer.test.tsx`
- `web/src/screens/Session.tsx`
- `web/src/store/items.test.ts`
- `web/src/store/items.ts`
- `web/src/store/useAnswer.test.ts`
- `web/src/store/useAnswer.ts`
- `web/src/store/useSessionItems.test.ts`
- `web/src/store/useSessionItems.ts`

## Reading the steps

Apply each fenced **diff** verbatim with git apply, in order. Save the fence body to a patch file; never include the Markdown fences. Test patches precede feature patches. A replay extracts the six fences from this plan, asserts a nonzero file count, and compares every final implementation file with the built tree byte for byte. No source files or pre-generated patch files substitute for extracting the plan itself. Expected RED is a nonzero result; Expected GREEN is exit 0.

## Task 1: Coherent question snapshots and producer links

- [ ] Step 1: add the tests.

```diff
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index b2c5fa95..c5335af4 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -4645,6 +4645,65 @@ mod tests {
     use hennery_kernel::hosts::{EnrollOutcome, Enrollment, Hosts};
     use hennery_kernel::operator::{Operator, SetupOutcome};
 
+    #[test]
+    fn question_snapshot_retains_state_and_version_when_answer_commits_between_reads() {
+        let dir = tempfile::tempdir().unwrap();
+        let db = dir.path().join("hennery.db");
+        let store = Store::open(&db).unwrap();
+        let mut writer = Connection::open(&db).unwrap();
+        writer
+            .execute(
+                "INSERT INTO sessions(id,host_id,agent,cwd,lifecycle,created_at,last_event_at,owner_id)
+            VALUES ('s','h','fake','/tmp','active','t','t',?1)",
+                [store.owner_id()],
+            )
+            .unwrap();
+        writer
+            .execute(
+                "INSERT INTO pending(pending_id,session_id,kind,option_ids,payload,state,opened_at,owner_id)
+            VALUES ('p','s','permission','[]','{}','open','t',?1)",
+                [store.owner_id()],
+            )
+            .unwrap();
+        writer
+            .execute(
+                "INSERT INTO events(session_id,kind,body,ts,applied,owner_id)
+            VALUES ('s','pending_opened','{\"pending_id\":\"p\"}','t',1,?1)",
+                [store.owner_id()],
+            )
+            .unwrap();
+        let before = store
+            .question_snapshot_between("s", "p", || {
+                let tx = writer.transaction().unwrap();
+                tx.execute(
+                    "INSERT INTO answer_queue(pending_id,session_id,request_id,answer,submitted_at,owner_id)
+                VALUES ('p','s','r','{}','t',?1)",
+                    [store.owner_id()],
+                )
+                .unwrap();
+                tx.execute(
+                    "INSERT INTO events(session_id,kind,body,ts,applied,owner_id)
+                VALUES ('s','answer_submitted','{\"pending_id\":\"p\"}','t',1,?1)",
+                    [store.owner_id()],
+                )
+                .unwrap();
+                tx.commit().unwrap();
+            })
+            .unwrap()
+            .unwrap();
+        assert_eq!(before.version, 1);
+        let hennery_view::Body::Question(q) = before.body else {
+            panic!()
+        };
+        assert!(q.answerable && !q.answered);
+        let after = store.question_snapshot("s", "p").unwrap().unwrap();
+        assert_eq!(after.version, 2);
+        let hennery_view::Body::Question(q) = after.body else {
+            panic!()
+        };
+        assert!(!q.answerable && q.answered);
+    }
+
     /// A page of events reads a range of `events_by_session` in order: no
     /// scan of the session's other rows and no sort (smoke test #1, F2).
     #[test]
diff --git a/crates/hennery-sessions/tests/push_edges.rs b/crates/hennery-sessions/tests/push_edges.rs
index e82aa1e6..4e545206 100644
--- a/crates/hennery-sessions/tests/push_edges.rs
+++ b/crates/hennery-sessions/tests/push_edges.rs
@@ -339,6 +339,34 @@ fn session(store: &Store) -> EdgeSession {
     (&store.find_session("s1").unwrap().unwrap()).into()
 }
 
+#[test]
+fn question_urls_encode_both_ids_and_completion_keeps_the_legacy_target() {
+    let store = Store::open_in_memory().unwrap();
+    running(&store);
+    let mut s = session(&store);
+    s.id = "session space".into();
+    for edge in [
+        PushEdge::Blocked {
+            pending_id: "ż one'".into(),
+            title: None,
+        },
+        PushEdge::QuestionOutsideTurn {
+            pending_id: "ż one'".into(),
+            title: None,
+        },
+    ] {
+        let notice = notice_for(&edge, &s).unwrap();
+        assert_eq!(notice.url, "/sessions/session%20space?pending=%C5%BC%20one%27");
+        assert_eq!(notice.tag, "session space");
+    }
+    assert_eq!(
+        notice_for(&PushEdge::TurnEnded(TurnOutcome::Completed), &s)
+            .unwrap()
+            .url,
+        "/sessions/session%20space"
+    );
+}
+
 #[test]
 fn only_blocked_finished_and_failed_notify() {
     let store = Store::open_in_memory().unwrap();
@@ -360,7 +388,7 @@ fn only_blocked_finished_and_failed_notify() {
     assert_eq!(blocked.detail.as_deref(), Some("Run cargo test"));
     assert_eq!(
         (blocked.url.as_str(), blocked.tag.as_str(), blocked.hat_id.as_str()),
-        ("/sessions/s1", "s1", "hat-1")
+        ("/sessions/s1?pending=p1", "s1", "hat-1")
     );
 
     let finished = notice_for(&PushEdge::TurnEnded(TurnOutcome::Completed), &s).unwrap();
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index fde5c510..69745bcf 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -109,7 +109,7 @@ const SOURCES: &[(&str, &str, usize)] = &[
     (
         "hennery-sessions/src/store.rs",
         include_str!("../../hennery-sessions/src/store.rs"),
-        153,
+        156,
     ),
     (
         "hennery-gateway/src/store.rs",
diff --git a/crates/hennery-testkit/tests/reconcile.rs b/crates/hennery-testkit/tests/reconcile.rs
index 69e688cc..28e92628 100644
--- a/crates/hennery-testkit/tests/reconcile.rs
+++ b/crates/hennery-testkit/tests/reconcile.rs
@@ -2655,7 +2655,7 @@ async fn a_blocked_turn_and_its_end_each_queue_one_notice() {
         (notices[0].urgency, notices[0].body.as_str(), notices[0].tag.as_str()),
         (Urgency::High, "needs your answer", session.as_str())
     );
-    assert_eq!(notices[0].url, format!("/sessions/{session}"));
+    assert_eq!(notices[0].url, format!("/sessions/{session}?pending=p1"));
     host.emit(&session, opened("p2", &turn)).await;
     host.emit(
         &session,
diff --git a/crates/hennery-testkit/tests/view.rs b/crates/hennery-testkit/tests/view.rs
index 643941dd..9c2a4692 100644
--- a/crates/hennery-testkit/tests/view.rs
+++ b/crates/hennery-testkit/tests/view.rs
@@ -611,6 +611,98 @@ fn question(collector: &Collector, session: &str, pending_id: &str, turn: &str)
     event
 }
 
+#[tokio::test]
+async fn question_lookup_is_owned_bounded_and_matches_the_live_overlay() {
+    let c = Collector::start().await;
+    c.session(&c.owner(), "s");
+    c.session(&c.owner(), "elsewhere");
+    c.other_owner("foreign");
+    c.write(OTHER, "foreign", "pending_opened", &json!({"pending_id":"foreign-p"}));
+    c.conn()
+        .execute(
+            "INSERT INTO pending(pending_id,session_id,kind,option_ids,payload,state,opened_at,owner_id)
+        VALUES ('foreign-p','foreign','permission','[]','{}','open','t',?1)",
+            [OTHER],
+        )
+        .unwrap();
+    let opened = question(&c, "s", "p1", "outside");
+    // An event naming an id is not proof the pending row belongs here.
+    c.write(&c.owner(), "elsewhere", "pending_opened", &json!({"pending_id":"p1"}));
+    let path = "/api/view/sessions/s/questions/p1";
+    let response = c.client().get(c.url(path)).send().await.unwrap();
+    assert_eq!(response.status(), 200);
+    let before: Item = response.json().await.unwrap();
+    assert_eq!(before.version, opened.event_id);
+    assert_eq!(before.turn_id, None);
+    let Body::Question(q) = &before.body else { panic!() };
+    assert!(q.answerable);
+    for path in [
+        "/api/view/sessions/elsewhere/questions/p1",
+        "/api/view/sessions/foreign/questions/p1",
+        "/api/view/sessions/foreign/questions/foreign-p",
+        "/api/view/sessions/unknown/questions/p1",
+        "/api/view/sessions/s/questions/unknown",
+    ] {
+        assert_eq!(
+            c.client().get(c.url(path)).send().await.unwrap().status(),
+            404,
+            "{path}"
+        );
+    }
+    assert_eq!(
+        c.client()
+            .post(c.url("/api/sessions/s/pending/p1/answer"))
+            .json(&json!({"option_id":"allow"}))
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        202
+    );
+    let after: Item = c.client().get(c.url(path)).send().await.unwrap().json().await.unwrap();
+    assert!(after.version > before.version);
+    let Body::Question(q) = &after.body else { panic!() };
+    assert!(q.answered && !q.answerable);
+    assert_eq!(
+        c.page("s", "").await.items.iter().find(|i| i.id == after.id),
+        Some(&after)
+    );
+    c.conn()
+        .execute(
+            "UPDATE pending SET state='cancelled', reason='agent_withdrew' WHERE pending_id='p1'",
+            [],
+        )
+        .unwrap();
+    c.write(
+        &c.owner(),
+        "s",
+        "pending_cancelled",
+        &json!({"pending_id":"p1", "reason":"agent_withdrew"}),
+    );
+    let cancelled: Item = c.client().get(c.url(path)).send().await.unwrap().json().await.unwrap();
+    let Body::Question(q) = cancelled.body else { panic!() };
+    assert!(!q.answerable);
+    assert_eq!(q.state, hennery_proto::rest::PendingState::Cancelled);
+    let long = "p".repeat(hennery_view::cap::ID_MAX_BYTES + 1);
+    assert_eq!(
+        c.client()
+            .get(c.url(&format!("/api/view/sessions/s/questions/{long}")))
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        404
+    );
+    c.conn()
+        .execute("UPDATE sessions SET lifecycle='closed' WHERE id='s'", [])
+        .unwrap();
+    assert!(matches!(
+        c.state.store.delete_session("s", None).unwrap(),
+        Deletion::Done { .. }
+    ));
+    assert_eq!(c.client().get(c.url(path)).send().await.unwrap().status(), 404);
+}
+
 /// A session with a turn, whose page has been read: the stream's anchor.
 async fn opened(collector: &Collector, session: &str) -> String {
     collector.session(&collector.owner(), session);
@@ -923,6 +1015,16 @@ async fn a_question_answered_after_the_next_prompt_is_sent_from_the_store() {
     let submitted = collector.state.store.revision("s").unwrap();
     let item = stream.message().await.item();
     assert_eq!((item.id.as_str(), item.turn_id.as_deref()), ("question:p1", Some("t1")));
+    let lookup: Item = collector
+        .client()
+        .get(collector.url("/api/view/sessions/s/questions/p1"))
+        .send()
+        .await
+        .unwrap()
+        .json()
+        .await
+        .unwrap();
+    assert_eq!(lookup, item, "HTTP and SSE must agree at equal versions");
     assert_eq!(item.version, submitted);
     let Body::Question(q) = &item.body else { panic!() };
     assert!(q.answered && !q.answerable);
```

Run inside the dev shell; each command must be seen RED before Step 2:

```sh
cargo test -p hennery-sessions --lib question_snapshot --locked
cargo test -p hennery-testkit --test view question_lookup --locked
```

- [ ] Step 2: add the feature.

```diff
diff --git a/crates/hennery-sessions/src/notify.rs b/crates/hennery-sessions/src/notify.rs
index 89ddc5d5..83d89a8a 100644
--- a/crates/hennery-sessions/src/notify.rs
+++ b/crates/hennery-sessions/src/notify.rs
@@ -46,11 +46,27 @@ pub fn notice_for(edge: &PushEdge, session: &EdgeSession) -> Option<Notice> {
         generic_title: generic_title.into(),
         body: body.into(),
         detail,
-        url: format!("/sessions/{}", session.id),
+        url: match edge {
+            PushEdge::Blocked { pending_id, .. } | PushEdge::QuestionOutsideTurn { pending_id, .. } => format!(
+                "/sessions/{}?pending={}",
+                encoded_id(&session.id),
+                encoded_id(pending_id)
+            ),
+            _ => format!("/sessions/{}", encoded_id(&session.id)),
+        },
         tag: session.id.clone(),
     })
 }
 
+fn encoded_id(id: &str) -> String {
+    id.bytes()
+        .map(|byte| match byte {
+            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (byte as char).to_string(),
+            _ => format!("%{byte:02X}"),
+        })
+        .collect()
+}
+
 /// The session's title, else the name of its project directory, else
 /// "Session" (ACP core §10). The directory's name is put on one line as a
 /// title is (10b-i's review, A4): it reaches a lock screen.
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index c5335af4..4f17298c 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -4491,6 +4491,77 @@ impl Store {
         )?)
     }
 
+    /// A bounded question with its state, version and group from one read
+    /// snapshot. Explicitly DEFERRED: readers must allow independent WAL
+    /// writers to commit without changing the snapshot they already read.
+    pub fn question_snapshot(&self, session_id: &str, pending_id: &str) -> Result<Option<hennery_view::Item>> {
+        self.question_snapshot_between(session_id, pending_id, || {})
+    }
+
+    fn question_snapshot_between(
+        &self,
+        session_id: &str,
+        pending_id: &str,
+        between: impl FnOnce(),
+    ) -> Result<Option<hennery_view::Item>> {
+        use hennery_view::{Body, Item, Question, group_key, question_id};
+        if [session_id, pending_id]
+            .iter()
+            .any(|id| id.is_empty() || id.len() > hennery_view::cap::ID_MAX_BYTES)
+        {
+            return Ok(None);
+        }
+        let mut conn = self.view_conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Deferred)?;
+        let owned: bool = tx.query_row(
+            "SELECT EXISTS (SELECT 1 FROM sessions WHERE id = ?1 AND owner_id = ?2 AND lifecycle != 'deleted')",
+            [session_id, &self.owner],
+            |r| r.get(0),
+        )?;
+        if !owned {
+            return Ok(None);
+        }
+        let record = tx
+            .query_row(
+                &format!("SELECT {PENDING_COLUMNS} WHERE p.pending_id = ?1 AND p.session_id = ?2 AND p.owner_id = ?3"),
+                [pending_id, session_id, &self.owner],
+                PendingRow::read,
+            )
+            .optional()?
+            .map(PendingRow::item)
+            .transpose()?;
+        let Some(record) = record else { return Ok(None) };
+        between();
+        let opened = tx
+            .query_row(PENDING_OPENED_AT, [session_id, pending_id, &self.owner], |r| {
+                Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
+            })
+            .optional()?;
+        let version: Option<i64> =
+            tx.query_row(PENDING_LAST_EVENT, [session_id, pending_id, &self.owner], |r| r.get(0))?;
+        let (Some((opened, ts)), Some(version)) = (opened, version) else {
+            return Ok(None);
+        };
+        let group = tx
+            .query_row(
+                "SELECT event_id, json_extract(body, '$.turn_id') FROM events
+             WHERE session_id = ?1 AND kind = 'user_turn' AND event_id <= ?2 AND applied = 1 AND owner_id = ?3
+             ORDER BY event_id DESC LIMIT 1",
+                params![session_id, opened, self.owner],
+                |r| Ok((r.get::<_, i64>(0)?, text(r.get(1)?))),
+            )
+            .optional()?;
+        let item = Item {
+            id: question_id(pending_id),
+            version,
+            ts,
+            turn_id: group.map(|(start, turn)| group_key(start, turn.as_deref())),
+            body: Body::Question(Question::from_pending(&record)),
+        };
+        tx.commit()?;
+        Ok(Some(item))
+    }
+
     /// One question of the session, whatever its state: by its id, the
     /// session's and the owner's (the review's A-8).
     pub fn session_pending(&self, session_id: &str, pending_id: &str) -> Result<Option<PendingItem>> {
diff --git a/crates/hennery-sessions/src/view.rs b/crates/hennery-sessions/src/view.rs
index 5520a32e..f50279af 100644
--- a/crates/hennery-sessions/src/view.rs
+++ b/crates/hennery-sessions/src/view.rs
@@ -47,12 +47,12 @@ use axum::routing::get;
 use axum::{Json, Router};
 use futures::StreamExt;
 use hennery_kernel::operator::Authenticated;
-use hennery_proto::rest::{EventDto, PendingState, SessionItem};
+use hennery_proto::rest::{EventDto, SessionItem};
 use hennery_view::api::{
     SessionRemoved, SessionSummary, SummaryPage, TurnContent, WaitingChanged, anchor, parse_anchor,
 };
 use hennery_view::cap::{GROUP_MAX_QUESTIONS, ID_MAX_BYTES};
-use hennery_view::{Body, Fold, Item, Question, group_key, question_id};
+use hennery_view::{Body, Fold, Item, group_key, question_id};
 use serde::Deserialize;
 use std::collections::{HashMap, HashSet, VecDeque};
 use std::convert::Infallible;
@@ -109,6 +109,7 @@ pub fn router(state: AppState) -> Router {
     let routes = Router::new()
         .route("/api/view/sessions", get(summaries))
         .route("/api/view/sessions/{id}", get(page))
+        .route("/api/view/sessions/{id}/questions/{pending_id}", get(question_card))
         .route("/api/view/sessions/{id}/turns/{turn_id}", get(undelivered_turn))
         .route("/api/stream/view/sessions/{id}", get(item_stream))
         .route("/api/stream/sessions", get(list_stream));
@@ -131,6 +132,14 @@ fn not_found() -> Response {
     error(StatusCode::NOT_FOUND, "not_found", "no such session")
 }
 
+async fn question_card(State(state): State<AppState>, Path((id, pending_id)): Path<(String, String)>) -> Response {
+    match stored_question(&state.store, &id, &pending_id) {
+        Ok(Some(item)) => Json(item).into_response(),
+        Ok(None) => not_found(),
+        Err(err) => internal(err),
+    }
+}
+
 /// `GET /api/view/sessions` (A7): the session list's page, each item a
 /// summary, filtered and paged as `GET /api/sessions` is.
 async fn summaries(State(state): State<AppState>, Query(params): Query<ListParams>) -> Response {
@@ -377,19 +386,11 @@ fn unanswerable(_: &str) -> bool {
 /// holds, short of a delete racing the read) it stays as folded: not
 /// answerable.
 fn overlay(store: &Store, id: &str, item: &mut Item) -> Result<()> {
-    let Body::Question(question) = &mut item.body else {
-        return Ok(());
-    };
-    let Some(record) = store.session_pending(id, &question.pending_id)? else {
+    let Body::Question(question) = &item.body else {
         return Ok(());
     };
-    let before = question.clone();
-    question.absorb(record.state, record.reason, record.answered, record.delivered);
-    question.answerable = record.state == PendingState::Open && !record.answered;
-    if *question != before
-        && let Some(last) = store.pending_last_event(id, &question.pending_id)?
-    {
-        item.version = item.version.max(last);
+    if let Some(current) = store.question_snapshot(id, &question.pending_id)? {
+        *item = current;
     }
     Ok(())
 }
@@ -399,26 +400,7 @@ fn overlay(store: &Store, id: &str, item: &mut Item) -> Result<()> {
 /// that event's time, at the version of its last event. `None` without a
 /// record or that event, and for an id no fold would give an item.
 fn stored_question(store: &Store, id: &str, pending_id: &str) -> Result<Option<Item>> {
-    if !shown(pending_id) {
-        return Ok(None);
-    }
-    let Some(record) = store.session_pending(id, pending_id)? else {
-        return Ok(None);
-    };
-    let (Some((opened, ts)), Some(version)) = (
-        store.pending_opened_at(id, pending_id)?,
-        store.pending_last_event(id, pending_id)?,
-    ) else {
-        return Ok(None);
-    };
-    let (start, turn) = store.group_start_at(id, opened)?;
-    Ok(Some(Item {
-        id: question_id(pending_id),
-        version,
-        turn_id: (start > 0).then(|| group_key(start, turn.as_deref())),
-        ts,
-        body: Body::Question(Question::from_pending(&record)),
-    }))
+    store.question_snapshot(id, pending_id)
 }
 
 /// Whether a pending id is one the fold makes an item of: not empty, and
```

- [ ] Step 3: verify GREEN, inspect staged bytes, commit and push the task; request independent review from the parent.

```sh
cargo test -p hennery-sessions --lib --test push_edges --locked
cargo test -p hennery-testkit --test view --test reconcile --test owner_filter --locked
```

## Task 2: Worker navigation, ownership and gateway invalidation

- [ ] Step 1: add the tests.

```diff
diff --git a/web/e2e/push-fixture.ts b/web/e2e/push-fixture.ts
index 84ae0f96..c30f7e68 100644
--- a/web/e2e/push-fixture.ts
+++ b/web/e2e/push-fixture.ts
@@ -6,6 +6,8 @@ import { runInNewContext } from 'node:vm'
 import { webcrypto } from 'node:crypto'
 import type { PushRecord } from '../src/pwa/journal'
 import { testLocks } from '../src/test-locks'
+import type { AppWindow, Windows } from '../src/pwa/navigation'
+import { MessageChannel as WorkerMessageChannel } from 'node:worker_threads'
 
 export async function mockPush(context: BrowserContext) {
   await context.addInitScript(() => {
@@ -37,8 +39,8 @@ export async function mockPush(context: BrowserContext) {
   })
 }
 
-export function workerHarness(code: string, persistence = { row: { generation: 0, enabled: false } as PushRecord }, dependencies: { pushManager?: PushManager; locks?: ReturnType<typeof testLocks>; fetch?: typeof fetch; onWrite?: (row: PushRecord) => void } = {}) {
-  type Event = { data?: { text(): string }; oldSubscription?: PushSubscription | null; newSubscription?: PushSubscription | null; request?: Request; respondWith?(promise: Promise<Response>): void; waitUntil(promise: Promise<unknown>): void }
+export function workerHarness(code: string, persistence = { row: { generation: 0, enabled: false } as PushRecord }, dependencies: { origin?: string; clients?: Windows; pushManager?: PushManager; locks?: ReturnType<typeof testLocks>; fetch?: typeof fetch; onWrite?: (row: PushRecord) => void } = {}) {
+  type Event = { notification?: { data: { url: unknown }; close(): void }; data?: { text(): string }; oldSubscription?: PushSubscription | null; newSubscription?: PushSubscription | null; request?: Request; respondWith?(promise: Promise<Response>): void; waitUntil(promise: Promise<unknown>): void }
   const handlers = new Map<string, (event: Event) => void>()
   const notifications: { title: string; options: unknown }[] = [], fetches: string[] = []
   const attempts: RequestInit[] = []
@@ -61,9 +63,10 @@ export function workerHarness(code: string, persistence = { row: { generation: 0
     return request
   } }
   runInNewContext(code, { self: { addEventListener: (name: string, handler: typeof handlers extends Map<string, infer V> ? V : never) => handlers.set(name, handler),
+    clients: dependencies.clients ?? { matchAll: async () => [], openWindow: async () => null },
     registration: { pushManager: dependencies.pushManager, showNotification: async (title: string, options: unknown) => { notifications.push({ title, options }) } } },
     navigator: { locks: dependencies.locks ?? testLocks() },
-    location: { origin: 'https://app.example' }, URL, Response, Request, crypto: webcrypto, AbortController, setTimeout, clearTimeout, indexedDB, structuredClone, caches: { keys: async () => [] },
+    location: { origin: dependencies.origin ?? 'https://app.example' }, URL, Response, Request, TextEncoder, MessageChannel: WorkerMessageChannel, crypto: webcrypto, AbortController, setTimeout, clearTimeout, indexedDB, structuredClone, caches: { keys: async () => [] },
     fetch: async (url: string, init: RequestInit) => { fetches.push(url); attempts.push(init); return dependencies.fetch ? dependencies.fetch(url, init) : new Response(JSON.stringify({ id: persistence.row.id })) },
   })
   const dispatch = async (name: string, event: Omit<Event, 'waitUntil'>) => {
@@ -73,6 +76,7 @@ export function workerHarness(code: string, persistence = { row: { generation: 0
     await work
   }
   return { notifications, fetches, attempts,
+    click: (url: unknown, close = () => {}) => dispatch('notificationclick', { notification: { data: { url }, close } }),
     push: (text: string | null) => dispatch('push', text === null ? {} : { data: { text: () => text } }),
     change: (oldSubscription: PushSubscription | null, newSubscription: PushSubscription | null) => dispatch('pushsubscriptionchange', { oldSubscription, newSubscription }),
     handles(request: Request) {
@@ -82,3 +86,42 @@ export function workerHarness(code: string, persistence = { row: { generation: 0
     },
   }
 }
+
+/** OS event harness ↔ real documents. The browser gets the production
+ * listener and lease, using its real active worker as the trusted source.
+ * Only this test bridge synthesizes the event; no injection ships. */
+export function browserWindows(context: BrowserContext, origin: string): Windows {
+  let sequence = 0
+  const ids = new WeakMap<object, string>()
+  const make = (page: ReturnType<BrowserContext['pages']>[number]): AppWindow => {
+    if (!ids.has(page)) ids.set(page, `window-${++sequence}`)
+    return {
+      id: ids.get(page)!, url: page.url(), visibilityState: 'visible',
+      focus: () => page.bringToFront(),
+      navigate: async target => { await page.goto(origin + target); return make(page) },
+      postMessage: (message, transfer) => {
+        const port = transfer?.[0] as MessagePort | undefined
+        if (port) port.onmessage = event => { void page.evaluate(data => {
+          const ports = (window as unknown as { __notificationPorts?: Map<string, MessagePort> }).__notificationPorts
+          const m = data as { id: string }
+          ports?.get(m.id)?.postMessage(data)
+        }, event.data).catch(() => {}) }
+        void page.evaluate(async ({ message, hasPort }) => {
+          const registration = await navigator.serviceWorker.ready
+          const m = message as { id: string }
+          if (!hasPort) { navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: message, source: registration.active })); return null }
+          const channel = new MessageChannel()
+          const holder = window as unknown as { __notificationPorts?: Map<string, MessagePort> }
+          ;(holder.__notificationPorts ??= new Map()).set(m.id, channel.port1)
+          const reply = new Promise<unknown>(resolve => { channel.port1.onmessage = e => resolve(e.data) })
+          navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: message, source: registration.active, ports: [channel.port2] }))
+          return reply
+        }, { message, hasPort: !!port }).then(reply => { if (port) port.postMessage(reply) }).catch(() => {})
+      },
+    }
+  }
+  return {
+    matchAll: async () => context.pages().filter(page => page.url().startsWith(origin + '/')).map(make),
+    openWindow: async target => { const page = await context.newPage(); await page.goto(origin + target); return make(page) },
+  }
+}
diff --git a/web/src/components/McpScope.test.tsx b/web/src/components/McpScope.test.tsx
index 0f5849f4..22006437 100644
--- a/web/src/components/McpScope.test.tsx
+++ b/web/src/components/McpScope.test.tsx
@@ -7,6 +7,30 @@ import { json } from '../test-server'
 import McpScope, { McpBadge, useMcpScope } from './McpScope'
 
 afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
+it('active-worker relay reads through the shared reader during consent, coalesces, and defers while hidden', async () => {
+  const service = new EventTarget(), active = {} as ServiceWorker
+  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, { getRegistration: async () => ({ active }) }) })
+  const fetch = vi.fn(async () => json(200, [connection({ label: 'Current' })]))
+  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
+  const view = render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
+  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
+  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
+  const hint = (source = active, data: unknown = { version: 1, kind: 'mcp_invalidated' }) => service.dispatchEvent(new MessageEvent('message', { source, data }))
+  await act(async () => { hint({} as ServiceWorker); hint(active, { version: 2, kind: 'mcp_invalidated' }); hint(active, { version: 1, kind: 'answer' }) })
+  expect(fetch).toHaveBeenCalledTimes(1)
+  await act(async () => { hint(); hint(); hint() })
+  expect(fetch).toHaveBeenCalledTimes(2)
+  expect(screen.getByText('Current', { exact: true })).toBeVisible()
+  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
+  await act(async () => { hint(); hint() })
+  expect(fetch).toHaveBeenCalledTimes(2)
+  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
+  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
+  expect(fetch).toHaveBeenCalledTimes(3)
+  view.unmount()
+  // @ts-expect-error restore missing browser API
+  delete navigator.serviceWorker
+})
 it('counts only the last fetched needs_auth and error reports', async () => {
   const fetch = vi.fn(async () => json(200, [connection({ status: 'needs_auth' }), connection({ id: 'other', status: 'error' }), connection({ id: 'working', status: 'ok' })]))
   const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
diff --git a/web/src/pwa/navigation.test.ts b/web/src/pwa/navigation.test.ts
new file mode 100644
index 00000000..8527ad37
--- /dev/null
+++ b/web/src/pwa/navigation.test.ts
@@ -0,0 +1,155 @@
+import { afterEach, expect, it, vi } from 'vitest'
+import { NavigationGate, clickNotification, listenForNavigation, navigationGate, type AppWindow } from './navigation'
+import { Client } from '../api/client'
+import { deferred } from '../test-locks'
+
+afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
+it('reserves a clean page before acknowledging; edits and mutations cannot race readiness', () => {
+  const gate = new NavigationGate()
+  expect(gate.reserve('a', '/sessions/s', 1000, 0)).toBe(true)
+  expect(gate.edit(10)).toBe(false)
+  expect(() => gate.mutation(10)).toThrow()
+  gate.release('other')
+  expect(gate.edit(20)).toBe(false)
+  gate.release('a')
+  expect(gate.edit(30)).toBe(true)
+  expect(gate.reserve('b', '/mcp', 1000, 40)).toBe(false)
+})
+it('leases expire and mutations keep a page busy', () => {
+  const gate = new NavigationGate()
+  const finish = gate.mutation(0)
+  expect(gate.reserve('a', '/mcp', 1000, 1)).toBe(false)
+  finish()
+  expect(gate.reserve('a', '/mcp', 1000, 2)).toBe(true)
+  expect(gate.edit(1001)).toBe(true)
+})
+const windowClient = (url: string) => ({ id: url, url: `https://app.example${url}`, type: 'window', visibilityState: 'visible', focus: vi.fn(async () => {}), navigate: vi.fn(async (_url: string): Promise<AppWindow | null> => null), postMessage: vi.fn((_message: unknown, _transfer?: Transferable[]) => {}) })
+it('exact targets focus even while dirty, without navigation or a readiness request', async () => {
+  const exact = windowClient('/sessions/s?pending=p')
+  const clients = { matchAll: async () => [exact], openWindow: vi.fn() }
+  await clickNotification('/sessions/s?pending=p', clients, 'https://app.example')
+  expect(exact.focus).toHaveBeenCalledOnce()
+  expect(exact.navigate).not.toHaveBeenCalled()
+  expect(exact.postMessage).not.toHaveBeenCalled()
+  expect(clients.openWindow).not.toHaveBeenCalled()
+})
+
+function channels() {
+  class Port {
+    onmessage: ((e: { data: unknown }) => void) | null = null
+    other!: Port
+    postMessage(data: unknown) { queueMicrotask(() => this.other.onmessage?.({ data })) }
+    close() {}
+  }
+  vi.stubGlobal('MessageChannel', class {
+    port1 = new Port(); port2 = new Port()
+    constructor() { this.port1.other = this.port2; this.port2.other = this.port1 }
+  })
+}
+function responsive(path: string, gate = new NavigationGate()) {
+  const client = windowClient(path)
+  client.postMessage.mockImplementation((message: unknown, transfer?: Transferable[]) => {
+    const m = message as { kind: string; id: string; target: string; until: number }
+    if (m.kind !== 'navigation_prepare') return
+    const port = transfer![0] as MessagePort
+    port.onmessage = e => { if (e.data.kind === 'navigation_release') gate.release(e.data.id) }
+    port.postMessage({ ...m, version: 1, kind: 'navigation_ready', ready: gate.reserve(m.id, m.target, m.until), separate: false })
+  })
+  return { client, gate }
+}
+it('a clean ready window navigates once, then releases the exact lease', async () => {
+  channels()
+  const { client, gate } = responsive('/settings')
+  const next = windowClient('/sessions/s')
+  client.navigate.mockImplementation(async () => { expect(gate.edit()).toBe(false); return next })
+  const clients = { matchAll: async () => [client], openWindow: vi.fn() }
+  await clickNotification('/sessions/s', clients, 'https://app.example')
+  expect(client.navigate).toHaveBeenCalledExactlyOnceWith('/sessions/s')
+  expect(next.focus).toHaveBeenCalledOnce()
+  expect(gate.edit()).toBe(true)
+})
+it.each(['dirty', 'missing', 'untrusted'])('preserves an unavailable window and sends a non-destructive hint: %s', async reason => {
+  channels(); vi.useFakeTimers()
+  const { client, gate } = responsive('/sessions/old')
+  if (reason === 'dirty') gate.edit()
+  if (reason === 'missing') client.postMessage.mockImplementation(() => {})
+  if (reason === 'untrusted') client.postMessage.mockImplementation((m: unknown, transfer?: Transferable[]) => (transfer![0] as MessagePort).postMessage({ ...(m as object), kind: 'navigation_ready', version: 1, id: 'other', ready: true }))
+  const clients = { matchAll: async () => [client], openWindow: vi.fn() }
+  const clicking = clickNotification('/sessions/new?pending=p', clients, 'https://app.example')
+  await vi.advanceTimersByTimeAsync(501); await clicking
+  expect(client.navigate).not.toHaveBeenCalled()
+  expect(clients.openWindow).not.toHaveBeenCalled()
+  expect(client.postMessage).toHaveBeenLastCalledWith({ version: 1, kind: 'notification_target', target: '/sessions/new?pending=p' })
+})
+it('rechecks the lease after a deferred window enumeration and never navigates an expired consent', async () => {
+  channels(); vi.useFakeTimers()
+  const { client, gate } = responsive('/sessions/old')
+  let release!: (windows: AppWindow[]) => void, reads = 0
+  const clients = { matchAll: async () => ++reads === 2 ? new Promise<AppWindow[]>(resolve => { release = resolve }) : [client], openWindow: vi.fn() }
+  const clicking = clickNotification('/sessions/new', clients, 'https://app.example')
+  await vi.advanceTimersByTimeAsync(1)
+  await vi.advanceTimersByTimeAsync(2001)
+  release([client]); await clicking
+  expect(client.navigate).not.toHaveBeenCalled()
+  expect(gate.edit()).toBe(true)
+})
+it('a cold click opens the validated target and never trusts a forged absolute URL', async () => {
+  const clients = { matchAll: async () => [], openWindow: vi.fn(async () => null) }
+  await clickNotification('https://foreign.example/mcp', clients, 'https://app.example')
+  expect(clients.openWindow).toHaveBeenCalledExactlyOnceWith('/sessions')
+})
+it('the transport cannot start any mutation after a page has acknowledged readiness', async () => {
+  const fetch = vi.fn()
+  const client = new Client({ fetch, navigate: vi.fn(), here: () => ({ pathname: '/sessions/s', search: '' }), stepUp: vi.fn() })
+  expect(navigationGate.reserve('transport', '/mcp', Date.now() + 1000)).toBe(true)
+  try {
+    await expect(client.request('POST', '/api/sessions/s/pending/p/answer', { option_id: 'allow' })).rejects.toThrow('Opening a notification')
+    expect(fetch).not.toHaveBeenCalled()
+  } finally { navigationGate.release('transport') }
+})
+it('step-up and its deferred retry keep mutation ownership through the retry response', async () => {
+  const confirmation = deferred(), retry = deferred<Response>(), retried = deferred()
+  let calls = 0
+  const client = new Client({ fetch: vi.fn(async () => {
+    if (++calls === 1) return new Response(JSON.stringify({ code: 'step_up_required' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
+    retried.resolve(); return retry.promise
+  }), navigate: vi.fn(), here: () => ({ pathname: '/settings', search: '' }), stepUp: () => confirmation.promise })
+  const mutation = client.request('POST', '/api/example', {})
+  await Promise.resolve(); await Promise.resolve()
+  expect(navigationGate.reserve('during-step-up', '/mcp', Date.now() + 1000)).toBe(false)
+  confirmation.resolve(); await retried.promise
+  await Promise.resolve(); await Promise.resolve()
+  expect(navigationGate.reserve('during-retry', '/mcp', Date.now() + 1000)).toBe(false)
+  retry.resolve(new Response(null, { status: 204 })); await mutation
+  expect(navigationGate.reserve('after-retry', '/mcp', Date.now() + 1000)).toBe(true)
+  navigationGate.release('after-retry')
+})
+it('only the active registration and dedicated bound port can reserve or release a page', async () => {
+  channels()
+  window.history.replaceState(null, '', '/sessions/old')
+  const service = new EventTarget(), active = {} as ServiceWorker
+  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, { getRegistration: async () => ({ active }) }) })
+  const hint = vi.fn(), stop = listenForNavigation(hint)
+  const channel = new MessageChannel(), replies: unknown[] = []
+  channel.port1.onmessage = e => replies.push(e.data)
+  const data = { version: 1, kind: 'navigation_prepare', id: 'owned', target: '/mcp', until: Date.now() + 1800 }
+  service.dispatchEvent(new MessageEvent('message', { source: {} as ServiceWorker, data, ports: [channel.port2] }))
+  await Promise.resolve(); await Promise.resolve()
+  expect(replies).toEqual([])
+  service.dispatchEvent(new MessageEvent('message', { source: active, data, ports: [channel.port2] }))
+  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
+  expect(replies).toEqual([expect.objectContaining({ kind: 'navigation_ready', id: 'owned', target: '/mcp', ready: true })])
+  expect(navigationGate.edit()).toBe(false)
+  channel.port1.postMessage({ version: 1, kind: 'navigation_release', id: 'wrong' })
+  await Promise.resolve()
+  expect(navigationGate.edit()).toBe(false)
+  channel.port1.postMessage({ version: 1, kind: 'navigation_release', id: 'owned' })
+  await Promise.resolve()
+  expect(navigationGate.edit()).toBe(true)
+  service.dispatchEvent(new MessageEvent('message', { source: {} as ServiceWorker, data: { version: 1, kind: 'notification_target', target: '/mcp' } }))
+  await Promise.resolve(); await Promise.resolve()
+  expect(hint).not.toHaveBeenCalled()
+  stop()
+  // @ts-expect-error restore missing browser API
+  delete navigator.serviceWorker
+})
diff --git a/web/src/pwa/notification.test.ts b/web/src/pwa/notification.test.ts
index d0bda90a..dd4f48aa 100644
--- a/web/src/pwa/notification.test.ts
+++ b/web/src/pwa/notification.test.ts
@@ -10,5 +10,7 @@ describe('bounded Rust PushPayload decoder', () => {
     expect(decodePush(text)).toEqual({ title: 'hennery needs your attention', body: 'Open hennery to check the current state.', url: '/sessions', tag: 'hennery-attention' })
   })
   it.each(['https://evil.example/sessions/a', '//evil.example/sessions/a', '/sessions/a\\b', '/sessions/%2f', '/sessions/%252f', '/sessions/a#x', '/sessions/a?pending=p&pending=q', '/sessions/a?other=x', '/mcp/mount', '/login', '/sessions/../mcp', '/sessions/a?pending=%2f', '/sessions/a?%70ending=p', '/sessions/a?pending=p&', '/sessions/a?pending=', '/sessions/a?pending=p#f'])('rejects ambiguous target %s', (target) => expect(notificationTarget(target)).toBe('/sessions'))
+  it.each(['/sessions/%73', '/sessions/a?pending=%70', '/sessions/a?pending=%2520', '/sessions/a?pending=p%26pending%3Dq', '/sessions/a?pending=p%00', '/sessions/a?pending=%c5%bc'])('rejects alternate decoding %s', target => expect(notificationTarget(target)).toBe('/sessions'))
   it.each(['/sessions', '/sessions/s-1', '/mcp', '/sessions/s-1?pending=p_1'])('accepts rooted target %s', (target) => expect(notificationTarget(target)).toBe(target))
+  it.each(['/sessions/s%20one?pending=%C5%BC%20two', '/sessions/s~1?pending=p%27one'])('accepts canonical encoded opaque ids %s', target => expect(notificationTarget(target)).toBe(target))
 })
diff --git a/web/src/pwa/worker.test.ts b/web/src/pwa/worker.test.ts
index 8ea44e2d..f53f5ee9 100644
--- a/web/src/pwa/worker.test.ts
+++ b/web/src/pwa/worker.test.ts
@@ -10,6 +10,29 @@ import { Client } from '../api/client'
 beforeAll(async () => { await build() })
 afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
 
+it('the emitted click handler closes the notice and focuses an exact target without reloading', async () => {
+  const client = { id: 'app', url: 'https://app.example/sessions/s?pending=p', focus: vi.fn(async () => {}), navigate: vi.fn(), postMessage: vi.fn() }
+  const close = vi.fn()
+  const harness = workerHarness(readFileSync('dist/sw.js', 'utf8'), undefined, { clients: { matchAll: async () => [client], openWindow: vi.fn() } })
+  await harness.click('/sessions/s?pending=p', close)
+  expect(close).toHaveBeenCalledOnce()
+  expect(client.focus).toHaveBeenCalledOnce()
+  expect(client.navigate).not.toHaveBeenCalled()
+})
+
+it('gateway display relays only a validated target, and never copies a status claim', async () => {
+  const app = { id: 'app', url: 'https://app.example/mcp', focus: vi.fn(), navigate: vi.fn(), postMessage: vi.fn() }
+  const foreign = { ...app, id: 'foreign', url: 'https://foreign.example/mcp', postMessage: vi.fn() }
+  const harness = workerHarness(readFileSync('dist/sw.js', 'utf8'), undefined, { clients: { matchAll: async () => [app, foreign], openWindow: vi.fn() } })
+  await harness.push(JSON.stringify({ title: 'Recovery', body: 'not a health certificate', url: '/mcp', tag: 'anything' }))
+  expect(app.postMessage).toHaveBeenCalledExactlyOnceWith({ version: 1, kind: 'mcp_invalidated' })
+  expect(foreign.postMessage).not.toHaveBeenCalled()
+  app.postMessage.mockClear()
+  await harness.push(JSON.stringify({ title: 'MCP', body: 'recovered', url: '/sessions/s', tag: 'mcp-123' }))
+  expect(app.postMessage).not.toHaveBeenCalled()
+  expect(harness.notifications).toHaveLength(2)
+})
+
 function renewalSetup() {
   const persistence = { row: { generation: 1, enabled: true, id: 'id', endpoint: 'https://push.example/a', key: 'key' } as PushRecord }
   const store: PushStore = { async transact(fn) { return fn(persistence.row) } }
```

Run inside the dev shell; each command must be seen RED before Step 2:

```sh
pnpm --dir web test src/pwa/navigation.test.ts src/components/McpScope.test.tsx
```

- [ ] Step 2: add the feature.

```diff
diff --git a/web/src/App.tsx b/web/src/App.tsx
index b0dedf92..88a61a26 100644
--- a/web/src/App.tsx
+++ b/web/src/App.tsx
@@ -10,6 +10,7 @@ import Login from './screens/Login'
 import Setup from './screens/Setup'
 import PwaStatus from './components/PwaStatus'
 import { completeLogout } from './pwa/logout'
+import NotificationNavigation from './components/NotificationNavigation'
 
 interface Waiting {
   resolve: () => void
@@ -18,8 +19,13 @@ interface Waiting {
 
 export default function App({ fetchImpl }: { fetchImpl?: typeof fetch }) {
   const [waiting, setWaiting] = useState<Waiting | null>(null)
+  const focusBeforeStepUp = useRef<HTMLElement | null>(null)
   const open = useRef<() => Promise<void>>(() => Promise.reject(new StepUpCancelled()))
-  open.current = () => new Promise<void>((resolve, reject) => setWaiting({ resolve, reject }))
+  open.current = () => new Promise<void>((resolve, reject) => {
+    // Capture before `inert` blurs the underlying control in real browsers.
+    focusBeforeStepUp.current = document.activeElement as HTMLElement | null
+    setWaiting({ resolve, reject })
+  })
   const client = useMemo(() => browserClient(() => open.current(), fetchImpl), [fetchImpl])
   const { pathname } = useLocation()
   const route = match(pathname)
@@ -48,12 +54,13 @@ export default function App({ fetchImpl }: { fetchImpl?: typeof fetch }) {
     <ClientContext.Provider value={client}>
       <div className="application-root">
       <PwaStatus />
+      <NotificationNavigation />
       {/* While the step-up dialog is open, nothing under it can be focused
           or clicked. */}
       <div className="page" inert={waiting !== null} style={{ display: 'contents' }}>
         {route.name === 'setup' ? <Setup /> : route.name === 'login' ? <Login /> : <Shell route={route} />}
       </div>
-      {waiting && <StepUpDialog onDone={() => close('done')} onCancel={() => close('cancelled')} />}
+      {waiting && <StepUpDialog returnTo={focusBeforeStepUp.current} onDone={() => close('done')} onCancel={() => close('cancelled')} />}
       </div>
     </ClientContext.Provider>
   )
diff --git a/web/src/api/client.ts b/web/src/api/client.ts
index e72326d1..488bdf90 100644
--- a/web/src/api/client.ts
+++ b/web/src/api/client.ts
@@ -16,6 +16,7 @@
 // `Referrer-Policy: no-referrer`.
 import { ApiFailure, Unauthenticated, retryAfterSeconds } from './errors'
 import { loginHref } from './next'
+import { navigationGate } from '../pwa/navigation'
 
 export interface ClientDeps {
   fetch: typeof fetch
@@ -53,12 +54,15 @@ export class Client {
 
   /** A fresh confirmation without resending a request (OAuth needs a new click). */
   async confirm(): Promise<void> {
-    await this.stepUpOnce()
+    const finish = navigationGate.mutation()
+    try { await this.stepUpOnce() } finally { finish() }
   }
 
   /** `method path` with a JSON body, answered as JSON (`undefined` for an
    *  empty answer). */
   async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
+    const finish = method === 'GET' || method === 'HEAD' ? () => {} : navigationGate.mutation()
+    try {
     const first = await this.networkAttempt<{ retry: true } | { retry: false; value: T }>(method, path, body, options, async (response) => {
       if (options.stepUp !== false && await isStepUpRequired(response)) return { retry: true }
       options.onResponse?.(response)
@@ -66,10 +70,11 @@ export class Client {
     })
     if (!first.retry) return first.value
     await this.stepUpOnce()
-    return this.networkAttempt(method, path, body, options, async (response) => {
+    return await this.networkAttempt(method, path, body, options, async (response) => {
       options.onResponse?.(response)
       return this.answer<T>(response)
     })
+    } finally { finish() }
   }
 
   private async networkAttempt<T>(method: string, path: string, body: unknown, options: RequestOptions, read: (response: Response) => Promise<T>): Promise<T> {
diff --git a/web/src/components/McpScope.tsx b/web/src/components/McpScope.tsx
index 9011ae4e..01a8a38d 100644
--- a/web/src/components/McpScope.tsx
+++ b/web/src/components/McpScope.tsx
@@ -22,6 +22,7 @@ export default function McpScope({ children, active }: { children: ReactNode; ac
   const waits = useRef(new Set<string>())
   const epoch = useRef(0)
   const dirty = useRef(false)
+  const pushDirty = useRef(false)
   const pending = useRef<Promise<McpConnectionItem[]> | null>(null)
   const controller = useRef(new AbortController())
   const refresh = useCallback((): Promise<McpConnectionItem[]> => {
@@ -55,12 +56,22 @@ export default function McpScope({ children, active }: { children: ReactNode; ac
     return () => { controller.current.abort(); epoch.current++ }
   }, [refresh])
   useEffect(() => {
-    const read = () => { void refresh().catch(() => {}) }
+    const read = () => { pushDirty.current = false; void refresh().catch(() => {}) }
     const visible = () => { if (document.visibilityState === 'visible') read() }
+    let live = true
+    const relay = async (event: MessageEvent<unknown>) => {
+      const m = event.data as Record<string, unknown> | null
+      if (!m || m.version !== 1 || m.kind !== 'mcp_invalidated' || Object.keys(m).length !== 2) return
+      const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
+      if (!live || !registration?.active || event.source !== registration.active) return
+      if (document.visibilityState === 'hidden') { pushDirty.current = true; return }
+      read()
+    }
+    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', relay)
     window.addEventListener('focus', read); document.addEventListener('visibilitychange', visible)
     // Event reads remain enabled during consent; only timer reads pause.
     const timer = setInterval(() => { if (!paused && document.visibilityState === 'visible') read() }, active ? 60000 : 300000)
-    return () => { clearInterval(timer); window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', visible) }
+    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', visible); if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', relay) }
   }, [active, paused, refresh])
   useEffect(() => { if (active) void refresh().catch(() => {}) }, [active, refresh])
   return <Context.Provider value={{ data, error, set: publish, refresh, waiting }}>{children}</Context.Provider>
diff --git a/web/src/components/NotificationNavigation.tsx b/web/src/components/NotificationNavigation.tsx
new file mode 100644
index 00000000..ef657154
--- /dev/null
+++ b/web/src/components/NotificationNavigation.tsx
@@ -0,0 +1,8 @@
+import { useEffect, useState } from 'react'
+import { listenForNavigation } from '../pwa/navigation'
+
+export default function NotificationNavigation() {
+  const [target, setTarget] = useState<string | null>(null)
+  useEffect(() => listenForNavigation(setTarget), [])
+  return target ? <aside className="notification-link pwa-banner" role="status">Notification received. Your current input is preserved. <a className="btn btn-ghost" href={target} target="_blank" rel="noopener noreferrer">Open notification</a></aside> : null
+}
diff --git a/web/src/components/StepUpDialog.tsx b/web/src/components/StepUpDialog.tsx
index 71950e7f..35377661 100644
--- a/web/src/components/StepUpDialog.tsx
+++ b/web/src/components/StepUpDialog.tsx
@@ -12,9 +12,10 @@ import { useClient } from '../app-client'
 interface Props {
   onDone: () => void
   onCancel: () => void
+  returnTo?: HTMLElement | null
 }
 
-export default function StepUpDialog({ onDone, onCancel }: Props) {
+export default function StepUpDialog({ onDone, onCancel, returnTo }: Props) {
   const client = useClient()
   const [ceremony, setCeremony] = useState<PasskeyCeremony | null>(null)
   const [password, setPassword] = useState('')
@@ -39,10 +40,10 @@ export default function StepUpDialog({ onDone, onCancel }: Props) {
 
   // Focus moves into the dialog and back where it was when it closes.
   useEffect(() => {
-    const before = document.activeElement as HTMLElement | null
+    const before = returnTo ?? document.activeElement as HTMLElement | null
     dialog.current?.querySelector<HTMLElement>('button, input')?.focus()
     return () => before?.focus?.()
-  }, [])
+  }, [returnTo])
 
   const withPasskey = async () => {
     if (!ceremony) return
diff --git a/web/src/main.tsx b/web/src/main.tsx
index 42e6f40c..93d10ede 100644
--- a/web/src/main.tsx
+++ b/web/src/main.tsx
@@ -6,7 +6,9 @@ import { createRoot } from 'react-dom/client'
 import App from './App'
 import './index.css'
 import { registerWorker } from './pwa/lifecycle'
+import { watchNavigationEdits } from './pwa/navigation'
 
+watchNavigationEdits()
 void registerWorker()
 
 createRoot(document.getElementById('root')!).render(
diff --git a/web/src/pwa/navigation.ts b/web/src/pwa/navigation.ts
new file mode 100644
index 00000000..682ac124
--- /dev/null
+++ b/web/src/pwa/navigation.ts
@@ -0,0 +1,153 @@
+import { notificationTarget } from './notification'
+import { appRoute } from './shell'
+
+const LEASE_MS = 2000
+type Lease = { id: string; target: string; until: number }
+/** Conservative: an edited document stays dirty until it closes. This also
+ * protects drafts whose controls were unmounted, and images held in memory. */
+export class NavigationGate {
+  private dirty = false
+  private mutations = 0
+  private lease: Lease | null = null
+  private frozen(now: number) { return this.lease !== null && this.lease.until > now }
+  edit(now = Date.now()): boolean {
+    if (this.frozen(now)) return false
+    this.dirty = true
+    return true
+  }
+  mutation(now = Date.now()): () => void {
+    if (this.frozen(now)) throw new Error('Opening a notification. Try again in a moment.')
+    this.mutations++
+    let finished = false
+    return () => { if (!finished) { finished = true; this.mutations-- } }
+  }
+  reserve(id: string, target: string, until: number, now = Date.now()): boolean {
+    if (this.dirty || this.mutations > 0 || this.frozen(now) || until <= now || until > now + LEASE_MS) return false
+    this.lease = { id, target, until }
+    return true
+  }
+  release(id: string) { if (this.lease?.id === id) this.lease = null }
+  blocked(now = Date.now()) { return this.frozen(now) }
+}
+export const navigationGate = new NavigationGate()
+
+export interface AppWindow {
+  id: string; url: string; visibilityState?: string; focused?: boolean
+  focus(): Promise<unknown>; navigate(url: string): Promise<AppWindow | null>
+  postMessage(message: unknown, transfer?: Transferable[]): void
+}
+export interface Windows {
+  matchAll(options: { type: 'window'; includeUncontrolled: boolean }): Promise<readonly AppWindow[]>
+  openWindow(url: string): Promise<unknown>
+}
+function appTarget(url: string, origin: string): string | null {
+  try {
+    const u = new URL(url)
+    if (u.origin !== origin || u.hash) return null
+    const path = u.pathname + u.search
+    return notificationTarget(path) === path || (appRoute(u.pathname) && !u.search) ? path : null
+  } catch { return null }
+}
+type Reply = { version: 1; kind: 'navigation_ready'; id: string; target: string; until: number; ready: boolean; separate: boolean }
+async function ready(client: AppWindow, target: string): Promise<{ reply: Reply; release(): void } | null> {
+  const id = crypto.randomUUID(), until = Date.now() + LEASE_MS
+  const channel = new MessageChannel()
+  const release = () => { channel.port1.postMessage({ version: 1, kind: 'navigation_release', id }); channel.port1.close() }
+  return new Promise(resolve => {
+    const timer = setTimeout(() => { release(); resolve(null) }, 500)
+    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
+      const r = event.data as Partial<Reply> | null
+      if (!r || r.version !== 1 || r.kind !== 'navigation_ready' || r.id !== id || r.target !== target || r.until !== until || typeof r.ready !== 'boolean' || typeof r.separate !== 'boolean') return
+      clearTimeout(timer)
+      if (Date.now() >= until) { release(); resolve(null) }
+      else resolve({ reply: r as Reply, release })
+    }
+    try { client.postMessage({ version: 1, kind: 'navigation_prepare', id, target, until }, [channel.port2]) }
+    catch { clearTimeout(timer); release(); resolve(null) }
+  })
+}
+
+/** An OS may reuse a standalone context for openWindow. If an app window
+ * cannot consent, deliver a link hint instead of risking its unsent input. */
+export async function clickNotification(raw: unknown, clients: Windows, origin: string): Promise<void> {
+  const target = notificationTarget(raw)
+  const windows = (await clients.matchAll({ type: 'window', includeUncontrolled: false })).filter(c => appTarget(c.url, origin) !== null)
+  const exact = windows.find(c => appTarget(c.url, origin) === target)
+  if (exact) { await exact.focus().catch(() => {}); return }
+  windows.sort((a, b) => Number(!!b.focused) - Number(!!a.focused) || Number(b.visibilityState === 'visible') - Number(a.visibilityState === 'visible'))
+  let separate = windows.length > 0
+  for (const client of windows) {
+    const consent = await ready(client, target)
+    if (!consent) { separate = false; continue }
+    separate &&= consent.reply.separate
+    if (!consent.reply.ready) { consent.release(); continue }
+    try {
+      // Re-enumerate after the handshake: the client may have navigated or
+      // closed meanwhile. Ownership covers this exact client/document URL.
+      const current = (await clients.matchAll({ type: 'window', includeUncontrolled: false })).find(c => c.id === client.id && c.url === client.url)
+      if (!current || Date.now() >= consent.reply.until) continue
+      let timer: ReturnType<typeof setTimeout> | undefined
+      const navigated = await Promise.race([
+        current.navigate(target),
+        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), Math.max(0, consent.reply.until - Date.now())) }),
+      ]).finally(() => clearTimeout(timer))
+      if (navigated) { await navigated.focus().catch(() => {}); return }
+    } catch { /* Release and offer the bounded fallback. */ }
+    finally { consent.release() }
+  }
+  // Include uncontrolled auth/callback documents in the reuse decision,
+  // but never ask them to navigate or overwrite them.
+  const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
+  const own = all.filter(c => { try { return new URL(c.url).origin === origin } catch { return false } })
+  const unchanged = own.length === windows.length && own.every(c => windows.some(w => w.id === c.id && w.url === c.url))
+  if (own.length > 0 && !(separate && unchanged)) {
+    for (const client of windows) {
+      try { client.postMessage({ version: 1, kind: 'notification_target', target }) } catch { /* Closed. */ }
+    }
+    return
+  }
+  try { await clients.openWindow(target) } catch { /* Manual launch remains available. */ }
+}
+
+/** Only our active registration may request readiness or supply a hint. */
+export function listenForNavigation(onHint: (target: string) => void): () => void {
+  if (!('serviceWorker' in navigator)) return () => {}
+  let live = true
+  const message = async (event: MessageEvent<unknown>) => {
+    const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
+    if (!live || !registration?.active || event.source !== registration.active) return
+    const m = event.data as Record<string, unknown> | null
+    if (!m || m.version !== 1) return
+    if (m.kind === 'notification_target' && typeof m.target === 'string' && notificationTarget(m.target) === m.target) { onHint(m.target); return }
+    if (m.kind !== 'navigation_prepare' || typeof m.id !== 'string' || m.id.length > 128 || typeof m.target !== 'string' || notificationTarget(m.target) !== m.target || typeof m.until !== 'number' || !Number.isFinite(m.until) || !event.ports[0]) return
+    const port = event.ports[0]
+    const allowed = appTarget(location.href, location.origin) !== null
+    const ready = allowed && navigationGate.reserve(m.id, m.target, m.until)
+    const id = m.id
+    port.onmessage = e => { if (e.data?.version === 1 && e.data?.kind === 'navigation_release' && e.data?.id === id) { navigationGate.release(id); port.close() } }
+    // Chromium's ordinary browser windows have separately opening targets,
+    // exercised by the browser gate. Standalone and unknown platforms keep
+    // the in-app hint: their OS may reuse the installed browsing context.
+    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
+    const separate = !standalone && /(?:Chrome|Chromium)\//.test(navigator.userAgent)
+    port.postMessage({ version: 1, kind: 'navigation_ready', id, target: m.target, until: m.until, ready, separate })
+    setTimeout(() => { navigationGate.release(id); port.close() }, Math.max(0, m.until - Date.now()))
+  }
+  navigator.serviceWorker.addEventListener('message', message)
+  return () => { live = false; navigator.serviceWorker.removeEventListener('message', message) }
+}
+
+export function watchNavigationEdits(): void {
+  const prevent = (e: Event) => {
+    if (navigationGate.blocked()) { e.preventDefault(); e.stopImmediatePropagation() }
+  }
+  for (const name of ['pointerdown', 'click', 'keydown', 'submit', 'beforeinput', 'drop', 'paste']) document.addEventListener(name, prevent, true)
+  for (const name of ['beforeinput', 'input', 'change', 'drop', 'paste']) document.addEventListener(name, () => { navigationGate.edit() }, true)
+  document.addEventListener('click', event => {
+    // Browser APIs such as permission prompts can precede their HTTP
+    // mutation. Retain conservative ownership as soon as a control acts.
+    if (event.target instanceof Element && event.target.closest('button,input,select,textarea')) navigationGate.edit()
+  }, true)
+  // Persisted composer text can predate this document's event listeners.
+  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith('hennery.draft.') && sessionStorage.getItem(key)) navigationGate.edit() } catch { navigationGate.edit() }
+}
diff --git a/web/src/pwa/notification.ts b/web/src/pwa/notification.ts
index 6355d379..92896715 100644
--- a/web/src/pwa/notification.ts
+++ b/web/src/pwa/notification.ts
@@ -1,15 +1,24 @@
 import type { PushPayload } from '../generated/protocol'
 const neutral: PushPayload = { title: 'hennery needs your attention', body: 'Open hennery to check the current state.', url: '/sessions', tag: 'hennery-attention' }
 
-// Canonical literal paths only. P2 owns card targeting and window navigation.
+// One canonical encoding prevents URL/route/query decoders disagreeing.
+function idPart(encoded: string): boolean {
+  try {
+    const id = decodeURIComponent(encoded)
+    if (!id || new TextEncoder().encode(id).length > 256 || /[/%\\?#&=\u0000-\u001f\u007f]/.test(id) || id === '.' || id === '..') return false
+    const canonical = encodeURIComponent(id).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
+    return encoded === canonical
+  } catch { return false }
+}
 export function notificationTarget(value: unknown): string {
-  if (typeof value !== 'string' || value.length > 512 || /[\\#\s]/.test(value)) return '/sessions'
+  if (typeof value !== 'string' || value.length > 1600 || /[\\#\s]/.test(value)) return '/sessions'
   try {
     const parsed = new URL(value, 'https://hennery.invalid')
     if (parsed.origin !== 'https://hennery.invalid' || parsed.pathname + parsed.search !== value) return '/sessions'
   } catch { return '/sessions' }
   if (value === '/mcp' || value === '/sessions') return value
-  return /^\/sessions\/[A-Za-z0-9_-]{1,128}(\?pending=[A-Za-z0-9_-]{1,128})?$/.test(value) ? value : '/sessions'
+  const match = /^\/sessions\/([^/?]+)(?:\?pending=([^&?]+))?$/.exec(value)
+  return match && idPart(match[1]) && (match[2] === undefined || idPart(match[2])) ? value : '/sessions'
 }
 export function decodePush(text: string | null): PushPayload {
   if (!text || text.length > 8192) return { ...neutral }
diff --git a/web/worker.js b/web/worker.js
index 1e29a3ee..47ec3c0f 100644
--- a/web/worker.js
+++ b/web/worker.js
@@ -3,6 +3,7 @@ import { pushJournal } from './src/pwa/journal'
 import { decodePush } from './src/pwa/notification'
 import { subscriptionBody } from './src/pwa/subscription'
 import { withPushOwnership } from './src/pwa/ownership'
+import { clickNotification } from './src/pwa/navigation'
 
 self.addEventListener('install', (event) => {
   event.waitUntil(installShell(caches, fetch, __PRECACHE__, __BUILD_ID__, crypto.randomUUID()))
@@ -35,6 +36,14 @@ self.addEventListener('push', (event) => {
       body: payload.body, tag: payload.tag, icon: '/icon-192.png', badge: '/icon-192.png',
       data: { url: payload.url, tag: payload.tag },
     })
+    if (payload.url === '/mcp') {
+      for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: false })) {
+        try {
+          const url = new URL(client.url)
+          if (url.origin === location.origin && appRoute(url.pathname)) client.postMessage({ version: 1, kind: 'mcp_invalidated' })
+        } catch { /* A closed or foreign document supplies no authority. */ }
+      }
+    }
   })())
 })
 self.addEventListener('pushsubscriptionchange', (event) => {
@@ -70,3 +79,7 @@ self.addEventListener('pushsubscriptionchange', (event) => {
     })
   })())
 })
+self.addEventListener('notificationclick', (event) => {
+  event.notification.close()
+  event.waitUntil(clickNotification(event.notification.data?.url, self.clients, location.origin))
+})
```

- [ ] Step 3: verify GREEN, inspect staged bytes, commit and push the task; request independent review from the parent.

```sh
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web build
```

## Task 3: Bounded live cards and mobile answer recovery

- [ ] Step 1: add the tests.

```diff
diff --git a/web/e2e/pwa.spec.ts b/web/e2e/pwa.spec.ts
index 88412e65..79c8d196 100644
--- a/web/e2e/pwa.spec.ts
+++ b/web/e2e/pwa.spec.ts
@@ -1,6 +1,7 @@
 import { expect, test, type BrowserContext, type Page } from '@playwright/test'
 import { startCollector, type Collector } from './collector'
-import { mockPush, workerHarness } from './push-fixture'
+import { browserWindows, mockPush, workerHarness } from './push-fixture'
+import type { HostItem, SessionDetail, StartSessionResponse } from '../src/generated/protocol'
 import { readFileSync } from 'node:fs'
 import { resolve } from 'node:path'
 import { deployProxy } from './pwa-proxy'
@@ -15,7 +16,7 @@ test.beforeAll(async ({ browser }) => {
   const token = new URL(collector.setupLink).hash.slice(1)
   const response = await context.request.post(`${collector.origin}/api/setup`, { headers: { Origin: collector.origin }, data: { token, password: PASSWORD, public_url: collector.origin, default_hat_name: 'Personal' } })
   expect(response.ok()).toBe(true)
-  host = testHost(fakeAgent('claude', { asks: [], chunks: ['PWA acceptance agent'], chunk_delay_ms: 0 }))
+  host = testHost(fakeAgent('claude', { asks: ['permission'], chunks: ['PWA acceptance agent'], chunk_delay_ms: 0 }))
   const pairing = await context.request.post(`${collector.origin}/api/hosts/pairing-codes`, { headers: { Origin: collector.origin } })
   expect(pairing.ok()).toBe(true)
   expect(await host.join(`hennery host join ${collector.origin} ${(await pairing.json()).code}`, ['--name', 'pwa fake host', '--no-runtime'])).toBe(0)
@@ -165,6 +166,124 @@ test('mixed digest install fails, preserving the old offline shell; a complete n
   } finally { await context.close(); await proxy.stop(); await a.stop(); await b.stop() }
 })
 
+for (const width of [1280, 390]) test(`notification click reaches the live card and preserves busy input at ${width}px`, async ({ browser }) => {
+  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'allow' })
+  try {
+    await login(context); await mockPush(context)
+    const page = await context.newPage(); await controlled(page)
+    const headers = { Origin: collector.origin }
+    const hosts = async () => (await (await context.request.get(`${collector.origin}/api/hosts`)).json()) as HostItem[]
+    await expect.poll(async () => (await hosts()).some(h => h.connected)).toBe(true)
+    const hostId = (await hosts()).find(h => h.connected)!.host_id
+    const started = await context.request.post(`${collector.origin}/api/sessions`, { headers, data: { host_id: hostId, agent: 'claude', cwd: host.dir } })
+    expect(started.ok()).toBe(true)
+    const { session_id: id } = await started.json() as StartSessionResponse
+    expect((await context.request.post(`${collector.origin}/api/sessions/${id}/prompt`, { headers, data: { content: [{ type: 'text', text: 'Ask before writing.' }] } })).status()).toBe(202)
+    const detail = async () => (await (await context.request.get(`${collector.origin}/api/sessions/${id}`)).json()) as SessionDetail
+    await expect.poll(async () => (await detail()).pending.length).toBe(1)
+    const pending = (await detail()).pending[0].pending_id
+    const target = `/sessions/${id}?pending=${encodeURIComponent(pending)}`
+    const code = await (await context.request.get(`${collector.origin}/sw.js`)).text()
+    const harness = workerHarness(code, undefined, { origin: collector.origin, clients: browserWindows(context, collector.origin) })
+    await harness.push(JSON.stringify({ title: 'Needs your answer', body: 'Open current state', tag: id, url: target }))
+    expect(harness.notifications).toHaveLength(1)
+    await harness.click(target)
+    await expect(page).toHaveURL(collector.origin + target)
+    const card = page.getByRole('region', { name: 'Question from Claude', exact: true })
+    await expect(card.getByText('Write notes.txt', { exact: true })).toBeVisible()
+    const draft = page.getByLabel('Prompt', { exact: true })
+    await draft.fill('Keep this unsent text')
+    await page.evaluate(() => { (window as unknown as { __documentSentinel: string }).__documentSentinel = 'same-document' })
+    await harness.click(target)
+    expect(await page.evaluate(() => (window as unknown as { __documentSentinel: string }).__documentSentinel)).toBe('same-document')
+    await expect(draft).toHaveValue('Keep this unsent text')
+    await harness.click('/sessions/another?pending=other')
+    await expect.poll(() => context.pages().length).toBe(2)
+    await expect(page).toHaveURL(collector.origin + target)
+    await expect(draft).toHaveValue('Keep this unsent text')
+    expect(context.pages()).toHaveLength(2)
+    await context.pages().find(other => other !== page)!.close()
+    await page.evaluate(() => Object.defineProperty(navigator, 'standalone', { configurable: true, value: true }))
+    await harness.click('/sessions/third?pending=next')
+    await expect(page.getByRole('link', { name: 'Open notification', exact: true })).toBeVisible()
+    expect(await page.getByRole('link', { name: 'Open notification', exact: true }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
+    expect(context.pages()).toHaveLength(1)
+    await expect(draft).toHaveValue('Keep this unsent text')
+    const openedHint = context.waitForEvent('page')
+    await page.getByRole('link', { name: 'Open notification', exact: true }).click()
+    const hinted = await openedHint
+    await expect(hinted).toHaveURL(collector.origin + '/sessions/third?pending=next')
+    await expect(page).toHaveURL(collector.origin + target)
+    await expect(draft).toHaveValue('Keep this unsent text')
+    await hinted.close()
+    expect(await card.getByRole('button', { name: 'Allow', exact: true }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(width < 768 ? 44 : 28)
+    const desktop = await browser.newContext({ viewport: { width: 1280, height: 844 }, serviceWorkers: 'allow' })
+    let releaseHeldPhone = () => {}
+    try {
+      await login(desktop)
+      const desktopPage = await desktop.newPage(); await desktopPage.goto(collector.origin + target)
+      const desktopCard = desktopPage.getByRole('region', { name: 'Question from Claude', exact: true })
+      await expect(desktopCard.getByRole('button', { name: 'Allow', exact: true })).toBeVisible()
+      let intercepted!: () => void, release!: () => void
+      const held = new Promise<void>(resolve => { intercepted = resolve })
+      const allowed = new Promise<void>(resolve => { release = resolve })
+      releaseHeldPhone = release
+      let phonePosts = 0
+      const answerPath = `/api/sessions/${id}/pending/${encodeURIComponent(pending)}/answer`
+      await page.route(`**${answerPath}`, async route => { phonePosts++; intercepted(); await allowed; await route.continue() })
+      const lateResponse = page.waitForResponse(response => new URL(response.url()).pathname === answerPath)
+      const clicking = card.getByRole('button', { name: 'Allow', exact: true }).click()
+      await held
+      await desktopCard.getByRole('button', { name: 'Allow', exact: true }).click()
+      await expect(desktopCard.getByText('Answered', { exact: true })).toBeVisible()
+      release(); await clicking
+      expect((await lateResponse).status()).toBe(409)
+      expect(phonePosts).toBe(1)
+      await page.unroute(`**${answerPath}`)
+    } finally { releaseHeldPhone(); await desktop.close() }
+    await expect(card.getByText('Answered', { exact: true })).toBeVisible()
+    await expect(draft).toHaveValue('Keep this unsent text')
+    await page.screenshot({ path: `test-results/phone-p2-${width}.png`, fullPage: true })
+  } finally { await context.close() }
+})
+
+test('gateway worker relay alone refreshes the shared reader with focus and timers suppressed', async ({ browser }) => {
+  const context = await browser.newContext({ serviceWorkers: 'allow' })
+  try {
+    await login(context); await mockPush(context)
+    await context.addInitScript(() => {
+      const add = window.addEventListener.bind(window)
+      window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => { if (type !== 'focus') add(type, listener, options) }) as typeof window.addEventListener
+      const docAdd = document.addEventListener.bind(document)
+      document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => { if (type !== 'visibilitychange') docAdd(type, listener, options) }) as typeof document.addEventListener
+      const observed = { started: 0, settled: 0, succeeded: 0 }
+      ;(window as unknown as { __mcpReads: typeof observed }).__mcpReads = observed
+      const fetcher = window.fetch.bind(window)
+      window.fetch = async (...args) => {
+        const url = new URL(String(args[0]), location.href)
+        const connectionRead = url.pathname === '/api/mcp/connections' && (args[1]?.method ?? 'GET') === 'GET'
+        if (connectionRead) observed.started++
+        try { const response = await fetcher(...args); if (connectionRead && response.ok) observed.succeeded++; return response }
+        finally { if (connectionRead) observed.settled++ }
+      }
+    })
+    const page = await context.newPage()
+    await page.clock.install({ time: new Date('2026-10-15T12:00:00Z') })
+    await page.clock.pauseAt(new Date('2026-10-15T12:00:00Z'))
+    let reads = 0
+    page.on('request', request => { if (new URL(request.url()).pathname === '/api/mcp/connections' && request.method() === 'GET') reads++ })
+    await controlled(page)
+    await expect.poll(() => reads).toBeGreaterThan(0)
+    await expect.poll(() => page.evaluate(() => { const r = (window as unknown as { __mcpReads: { started: number; settled: number; succeeded: number } }).__mcpReads; return r.succeeded > 0 && r.started === r.settled })).toBe(true)
+    const baseline = reads
+    const harness = workerHarness(await (await context.request.get(`${collector.origin}/sw.js`)).text(), undefined, { origin: collector.origin, clients: browserWindows(context, collector.origin) })
+    await harness.push(JSON.stringify({ title: 'A fabricated recovered status', body: 'never trusted', tag: 'arbitrary', url: '/mcp' }))
+    await expect.poll(() => reads).toBe(baseline + 1)
+    expect(await page.getByText('A fabricated recovered status', { exact: true }).count()).toBe(0)
+    expect(harness.notifications).toHaveLength(1)
+  } finally { await context.close() }
+})
+
 test('permission denial stays off without another permission loop', async ({ browser }) => {
   const context = await browser.newContext({ serviceWorkers: 'allow' })
   try {
diff --git a/web/src/screens/Session.answer.test.tsx b/web/src/screens/Session.answer.test.tsx
index f3d23339..b6d3f508 100644
--- a/web/src/screens/Session.answer.test.tsx
+++ b/web/src/screens/Session.answer.test.tsx
@@ -66,6 +66,16 @@ beforeEach(() => {
 })
 
 describe('SessionView answering', () => {
+  it('a pending link reveals a delivered card above the rendered tail', async () => {
+    window.history.replaceState(null, '', '/sessions/s1?pending=p1')
+    try {
+      const s = server([question({ answered: true, answerable: false, delivered: true }), ...Array.from({ length: 10 }, (_, n) => said(n))])
+      render(<SessionView id={ID} timing={FAST} tail={2} />, { wrapper: s.wrapper })
+      expect(await screen.findByText('Run it?', { exact: true }, WAIT)).toBeVisible()
+      expect(screen.getByText('Answered', { exact: true })).toBeVisible()
+      expect(s.posted('/answer')).toEqual([])
+    } finally { window.history.replaceState(null, '', '/sessions/s1') }
+  })
   it('answers a question through its route, as the session’s agent asks it', async () => {
     const s = server([message('m1', 't1'), question()])
     render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
diff --git a/web/src/store/items.test.ts b/web/src/store/items.test.ts
index 6d065de4..73967dc5 100644
--- a/web/src/store/items.test.ts
+++ b/web/src/store/items.test.ts
@@ -17,6 +17,22 @@ function loaded(items: Item[], older = false): ItemsState {
 }
 
 describe('itemsReducer', () => {
+  it('pins an older linked question, fences HTTP/SSE in both orders and deduplicates paging', () => {
+    const question = (version: number) => ({ ...message('question:p', 'old', version, '2020-01-01T00:00:00Z'), kind: 'question' } as Item)
+    let state = loaded([message('tail', 'new')], true)
+    state = itemsReducer(state, { type: 'pin', item: question(10) })
+    state = itemsReducer(state, { type: 'upsert', item: question(12) })
+    state = itemsReducer(state, { type: 'pin', item: question(11) })
+    expect(state.pinned).toHaveLength(1)
+    expect(state.pinned[0].version).toBe(12)
+    state = itemsReducer(state, { type: 'pin', item: question(14) })
+    state = itemsReducer(state, { type: 'upsert', item: question(13) })
+    expect(state.pinned[0].version).toBe(14)
+    state = itemsReducer(state, { type: 'prepended', page: page([question(11)], false) })
+    expect(state.pinned).toEqual([])
+    expect(state.items.filter(i => i.id === 'question:p')).toHaveLength(1)
+    expect(state.items[0].version).toBe(14)
+  })
   it('takes a first page whole, with its anchor', () => {
     const state = loaded([message('a', 't1'), message('b', 't2')], true)
     expect(ids(state)).toEqual(['a', 'b'])
diff --git a/web/src/store/useAnswer.test.ts b/web/src/store/useAnswer.test.ts
index 65ae7973..ec28db9c 100644
--- a/web/src/store/useAnswer.test.ts
+++ b/web/src/store/useAnswer.test.ts
@@ -38,6 +38,23 @@ function use(t: ReturnType<typeof routed>, initial: Props) {
 }
 
 describe('useAnswering', () => {
+  it('refreshes after an ambiguous answer without resending or dropping the draft', async () => {
+    let finish!: (response: Response) => void
+    const t = routed(call => call.method === 'POST' ? Promise.reject(new TypeError('network lost')) : new Promise<Response>(resolve => { finish = resolve }))
+    const book = new AnswerBook(t.client, 's1')
+    const q = question('p') as Extract<Item, { kind: 'question' }>
+    book.updateDraft(q.id, () => ({ note: 'kept' }))
+    const answering = book.answer(q, { option_id: 'a' })
+    await waitFor(() => expect(t.calls.some(c => c.path.endsWith('/questions/p'))).toBe(true))
+    expect(book.localOf(q.id)?.phase).toBe('checking')
+    await book.answer(q, { option_id: 'a' })
+    expect(t.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+    finish(json({ ...q, version: 2, answered: true, answerable: false }))
+    await answering
+    expect(book.localOf(q.id)?.phase).toBe('sent')
+    expect(book.draftOf(q.id)).toEqual({ note: 'kept' })
+    expect(t.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+  })
   it('keeps one book for the session', () => {
     const t = hosts([])
     const h = use(t, { items: [], loading: true })
diff --git a/web/src/store/useSessionItems.test.ts b/web/src/store/useSessionItems.test.ts
index e4d7bbdb..594e5d50 100644
--- a/web/src/store/useSessionItems.test.ts
+++ b/web/src/store/useSessionItems.test.ts
@@ -4,6 +4,7 @@ import type { SessionCatalog } from '../generated/protocol'
 import type { Item, ItemPage } from '../generated/view'
 import { json, liveStream, routed, type Call, type LiveStream } from '../test-stream'
 import { useSessionItems } from './useSessionItems'
+import { deferred } from '../test-locks'
 
 // A session id that needs encoding in a path.
 const ID = 's/1 x'
@@ -56,6 +57,32 @@ afterEach(() => {
 })
 
 describe('useSessionItems', () => {
+  it.each(['http-first', 'sse-first', 'removed'])('fences a bounded old-card read against the stream: %s', async order => {
+    const response = deferred<Response>()
+    const stream = liveStream()
+    const q = (version: number) => ({ id: 'question:p', kind: 'question', pending_id: 'p', version, turn_id: 'old', ts: '2020-01-01T00:00:00Z' } as Item)
+    const t = routed(call => {
+      if (call.path.includes('/questions/')) return response.promise
+      if (call.path === STREAM_PATH) return stream.response
+      if (call.path === CATALOG_PATH) return json(catalog('m'))
+      return json(page([message('tail', 'new')], 10, true))
+    })
+    const { result } = renderHook(() => useSessionItems(ID, FAST), { wrapper: t.wrapper })
+    await waitFor(() => expect(result.current.stream).toBe('open'))
+    let reading!: Promise<void>
+    act(() => { reading = result.current.loadQuestion('p') })
+    if (order !== 'http-first') {
+      act(() => stream.event(order === 'removed' ? 'session_removed' : 'item', q(12)))
+      await waitFor(() => expect(order === 'removed' ? result.current.removed : result.current.pinned[0]?.version).toBe(order === 'removed' ? true : 12))
+    }
+    await act(async () => { response.resolve(json(q(order === 'http-first' ? 14 : 11))); await reading })
+    if (order === 'removed') { expect(result.current.pinned).toEqual([]); return }
+    act(() => stream.event('item', q(order === 'http-first' ? 13 : 12)))
+    await act(async () => {})
+    expect(result.current.pinned).toHaveLength(1)
+    expect(result.current.pinned[0].version).toBe(order === 'http-first' ? 14 : 12)
+    expect(t.calls.filter(c => c.path === STREAM_PATH)).toHaveLength(1)
+  })
   it('opens: the first page, the catalogue, then the stream from the page’s anchor', async () => {
     const s = server([page([message('a', 't1')], 10)])
     const { result } = renderHook(() => useSessionItems(ID, FAST), { wrapper: s.wrapper })
```

Run inside the dev shell; each command must be seen RED before Step 2:

```sh
pnpm --dir web test src/store/items.test.ts src/store/useAnswer.test.ts src/store/useSessionItems.test.ts src/screens/Session.answer.test.tsx
```

- [ ] Step 2: add the feature.

```diff
diff --git a/web/src/api/view.ts b/web/src/api/view.ts
index 848e1654..5893533f 100644
--- a/web/src/api/view.ts
+++ b/web/src/api/view.ts
@@ -3,11 +3,15 @@
 // and the streams' paths. Every id in a path is encoded: ids are server
 // data, never trusted to be path-safe.
 import type { Client } from './client'
-import type { ItemPage, SummaryPage, TurnContent } from '../generated/view'
+import type { Item, ItemPage, SummaryPage, TurnContent } from '../generated/view'
 import type { SessionCatalog, SessionDetail } from '../generated/protocol'
 
 const enc = encodeURIComponent
 
+export function questionCard(client: Client, id: string, pending: string): Promise<Item> {
+  return client.request<Item>('GET', `/api/view/sessions/${enc(id)}/questions/${enc(pending)}`)
+}
+
 /** `?a=1&b=2` of the params that are set, or nothing. */
 function query(params: Record<string, string | number | undefined>): string {
   const search = new URLSearchParams()
diff --git a/web/src/components/items/QuestionCard.tsx b/web/src/components/items/QuestionCard.tsx
index 691508b3..5f6a96f1 100644
--- a/web/src/components/items/QuestionCard.tsx
+++ b/web/src/components/items/QuestionCard.tsx
@@ -98,6 +98,7 @@ export default function QuestionCard({ item, env }: Props) {
   return (
     <section
       ref={ref}
+      data-pending-id={item.pending_id}
       className={'ask fade-in' + (live ? '' : ' stale')}
       aria-label={`Question from ${agent}`}
       tabIndex={live ? 0 : undefined}
@@ -152,6 +153,7 @@ export default function QuestionCard({ item, env }: Props) {
         <span>{d.text}</span>
         {d.note && <span className="q-note">{d.note}</span>}
       </p>
+      {local?.phase === 'uncertain' && <button className="btn btn-ghost" type="button" onClick={() => void book?.checkAnswer(item)}>Refresh question</button>}
       {d.error && (
         <p className="form-error q-error" role="alert">
           <bdi>{d.error}</bdi>
diff --git a/web/src/lib/delivery.ts b/web/src/lib/delivery.ts
index 38901f53..6485d04f 100644
--- a/web/src/lib/delivery.ts
+++ b/web/src/lib/delivery.ts
@@ -28,6 +28,8 @@ export const REASON_WORDS: Record<PendingReason, string> = {
  *  answered: an outcome holds only while the item is at it. */
 export type LocalAnswer =
   | { phase: 'sending'; version: number }
+  | { phase: 'checking'; version: number }
+  | { phase: 'uncertain'; version: number }
   | { phase: 'sent'; version: number }
   /** 409 `already_answered`: another tab or device answered first. */
   | { phase: 'taken'; version: number }
@@ -100,6 +102,10 @@ export function deliveryOf(q: Question, local: LocalAnswer | undefined, hostAway
   const none: Delivery = { text: '', controls: false, busy: false, answerAsMessage: false }
   const awayNote = hostAway ? { note: HOST_AWAY_NOTE } : {}
   switch (held?.phase) {
+    case 'checking':
+      return { ...none, text: 'Checking whether your answer was accepted…', controls: true, busy: true }
+    case 'uncertain':
+      return { ...none, text: 'Answer status unknown. Reconnect and refresh the question before retrying.' }
     case 'sending':
       if (isAnswerable(q)) return { ...none, text: 'Sending…', controls: true, busy: true }
       break
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index 3521c6b6..daaf7043 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -187,10 +187,12 @@ function useStartNotice(id: string): string | null {
  *  when a question that can be answered is held above it. Decided while
  *  rendering, never after: a card that left the window for one render
  *  would be mounted again. */
-function windowStart(items: readonly Item[], pin: string | null, size: number): number {
+function windowStart(items: readonly Item[], pin: string | null, size: number, pending?: string): number {
   const tail = Math.max(0, items.length - size)
   const at = pin === null ? -1 : items.findIndex((item) => item.id === pin)
-  const start = at < 0 ? tail : at
+  let start = at < 0 ? tail : at
+  const target = pending ? items.findIndex(item => item.kind === 'question' && item.pending_id === pending) : -1
+  if (target >= 0) start = Math.min(start, target)
   const open = items.findIndex((item) => item.kind === 'question' && isAnswerable(item))
   return open >= 0 && open < start ? open : start
 }
@@ -198,10 +200,10 @@ function windowStart(items: readonly Item[], pin: string | null, size: number):
 /** The transcript's window over `items`: its first row pinned by id, `TAIL`
  *  rows at first, more revealed on demand; back to the tail when `loads`
  *  changes (a resync replaced the items). */
-function useTailWindow(items: Item[], loads: number, size: number) {
+function useTailWindow(items: Item[], loads: number, size: number, pending?: string) {
   const [pinned, setPinned] = useState<{ id: string; loads: number } | null>(null)
   const pin = pinned && pinned.loads === loads ? pinned.id : null
-  const start = windowStart(items, pin, size)
+  const start = windowStart(items, pin, size, pending)
   const visible = useMemo(() => (start === 0 ? items : items.slice(start)), [items, start])
   const firstHeld = useRef<string | undefined>(undefined)
 
@@ -230,7 +232,26 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   const s = useSessionItems(id, timing)
   const mcp = useMcpDelivery(id, summary?.lifecycle, Math.max(0, s.loads - 1))
   const info = useHeaderInfo(id, summary, awaitSummary, mcp.detail)
-  const win = useTailWindow(s.items, s.loads, tail)
+  const { search } = useLocation()
+  const requested = new URLSearchParams(search).get('pending')
+  const legacy = mcp.detail?.pending?.find(p => p.state === 'open' && !p.answered)?.pending_id
+  const targetQuestion = requested || legacy
+  const focusTarget = useRef<string | null>(null)
+  const questionRegion = useRef<HTMLDivElement>(null)
+  useEffect(() => {
+    if (!s.loading && !s.removed && targetQuestion) void s.loadQuestion(targetQuestion)
+  }, [id, targetQuestion, s.loading, s.removed, s.loads, s.loadQuestion])
+  useEffect(() => {
+    if (!targetQuestion || focusTarget.current === `${id}:${targetQuestion}`) return
+    const card = [...(questionRegion.current?.querySelectorAll<HTMLElement>('[data-pending-id]') ?? [])].find(el => el.dataset.pendingId === targetQuestion)
+    if (!card) return
+    focusTarget.current = `${id}:${targetQuestion}`
+    if (document.activeElement === document.body || document.activeElement === null) {
+      if (!card.hasAttribute('tabindex')) card.tabIndex = -1
+      card.scrollIntoView?.({ block: 'nearest' }); card.focus({ preventScroll: true })
+    }
+  }, [id, targetQuestion, s.items, s.pinned])
+  const win = useTailWindow(s.items, s.loads, tail, targetQuestion)
   const narrow = useMediaQuery('(max-width: 767px)')
   const hostItems = useList('hosts', true)
   const hosts = useMemo(() => namesOf(hostItems, 'host_id'), [hostItems])
@@ -239,7 +260,7 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   const hats = useMemo(() => namesOf(hatItems, 'id'), [hatItems])
   const plan = useMemo(() => latestPlan(s.items), [s.items])
   const startNotice = useStartNotice(id)
-  const answers = useAnswering(id, info, s.items, s.loading, s.loads, connectedOf(hostItems, info?.host_id))
+  const answers = useAnswering(id, info, s.items, s.loading, s.loads, connectedOf(hostItems, info?.host_id), s.mergeQuestion)
   const announcement = useAnnouncement(answers)
   const hostAway = useHostAway(answers)
 
@@ -331,7 +352,7 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   }
 
   return (
-    <div className="session">
+    <div className="session" ref={questionRegion}>
       <SessionHeader
         id={id}
         info={info}
@@ -363,6 +384,7 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
           <bdi>{s.error}</bdi>
         </p>
       )}
+      {s.questionError && <p className="form-error" role="status">{s.questionError}</p>}
       <Scroller
         items={win.visible}
         loads={s.loads}
@@ -372,7 +394,10 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
           if (!win.reveal() && s.older && !s.loadingOlder) void s.loadOlder()
         }}
       >
-        {s.loading ? <p className="transcript-empty">Loading…</p> : <Transcript items={win.visible} env={env} />}
+        {s.loading ? <p className="transcript-empty">Loading…</p> : <>
+          {s.pinned.length > 0 && <div className="pinned-questions" aria-label="Earlier questions"><Transcript items={s.pinned} env={env} /></div>}
+          <Transcript items={win.visible} env={env} />
+        </>}
       </Scroller>
       {startNotice && (
         <p className="start-notice" role="status">
diff --git a/web/src/store/items.ts b/web/src/store/items.ts
index 13c5b6b1..f230b830 100644
--- a/web/src/store/items.ts
+++ b/web/src/store/items.ts
@@ -15,6 +15,8 @@ import { foldVerdict } from '../lib/delivery'
 
 export interface ItemsState {
   items: Item[]
+  /** Bounded question reads whose groups have not been paged in. */
+  pinned: Item[]
   /** Groups exist before the first loaded one. */
   older: boolean
   /** The first page's anchor: where the item stream resumes. */
@@ -28,9 +30,10 @@ export type ItemsAction =
   /** An older page: its items go first, skipping ids already held. */
   | { type: 'prepended'; page: ItemPage }
   | { type: 'upsert'; item: Item }
+  | { type: 'pin'; item: Item }
   | { type: 'removed'; id: string }
 
-export const EMPTY_ITEMS: ItemsState = { items: [], older: false, epoch: '', revision: 0 }
+export const EMPTY_ITEMS: ItemsState = { items: [], pinned: [], older: false, epoch: '', revision: 0 }
 
 /** Whether `value` has what the store reads of an item. */
 export function isItem(value: unknown): value is Item {
@@ -92,14 +95,19 @@ export function itemsReducer(state: ItemsState, action: ItemsAction): ItemsState
     case 'loaded': {
       if (!isItemPage(action.page)) return state
       const { page } = action
-      return { items: distinct(page.items), older: page.older, epoch: page.epoch, revision: page.revision }
+      return { items: distinct(page.items), pinned: [], older: page.older, epoch: page.epoch, revision: page.revision }
     }
     case 'prepended': {
       if (!isItemPage(action.page)) return state
       const held = new Set(state.items.map((item) => item.id))
-      const before = distinct(action.page.items, held)
-      return { ...state, items: [...before, ...state.items], older: action.page.older }
+      const before = distinct(action.page.items, held).map(item => {
+        const pin = state.pinned.find(p => p.id === item.id)
+        return pin && pin.version > item.version ? foldVerdict(item, pin) : pin ? foldVerdict(pin, item) : item
+      })
+      const joined = new Set(before.map(i => i.id))
+      return { ...state, items: [...before, ...state.items], pinned: state.pinned.filter(i => !joined.has(i.id)), older: action.page.older }
     }
+    case 'pin':
     case 'upsert': {
       const { item } = action
       if (!isItem(item)) return state
@@ -110,6 +118,13 @@ export function itemsReducer(state: ItemsState, action: ItemsAction): ItemsState
         items[at] = foldVerdict(state.items[at], item)
         return { ...state, items }
       }
+      const pinned = state.pinned.findIndex(p => p.id === item.id)
+      if (pinned >= 0) {
+        if (item.version < state.pinned[pinned].version) return state
+        const pins = state.pinned.slice()
+        pins[pinned] = foldVerdict(pins[pinned], item)
+        return { ...state, pinned: pins }
+      }
       const group = groupOf(item)
       let last = -1
       for (let i = 0; i < state.items.length; i++) if (groupOf(state.items[i]) === group) last = i
@@ -119,13 +134,15 @@ export function itemsReducer(state: ItemsState, action: ItemsAction): ItemsState
         return { ...state, items }
       }
       if (isNewer(state, item)) return { ...state, items: [...state.items, item] }
+      if (item.kind === 'question') return { ...state, pinned: [...state.pinned, item].slice(-256) }
       // A turn not loaded (4a-i O-6): its page brings it.
       return state
     }
     case 'removed': {
       if (typeof action.id !== 'string') return state
       const items = state.items.filter((item) => item.id !== action.id)
-      return items.length === state.items.length ? state : { ...state, items }
+      const pinned = state.pinned.filter(item => item.id !== action.id)
+      return items.length === state.items.length && pinned.length === state.pinned.length ? state : { ...state, items, pinned }
     }
     default:
       return state
diff --git a/web/src/store/useAnswer.ts b/web/src/store/useAnswer.ts
index c831a939..4e29ce32 100644
--- a/web/src/store/useAnswer.ts
+++ b/web/src/store/useAnswer.ts
@@ -17,6 +17,8 @@
 //   without taking the focus.
 import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
 import { answerQuestion } from '../api/answer'
+import { questionCard } from '../api/view'
+import { navigationGate } from '../pwa/navigation'
 import type { Client } from '../api/client'
 import { ApiFailure, messageOf } from '../api/errors'
 import { useClient } from '../app-client'
@@ -47,6 +49,7 @@ export class AnswerBook {
   constructor(
     private readonly client: Client,
     readonly sessionId: string,
+    private readonly onQuestion?: (item: Item) => void,
   ) {}
 
   subscribe = (listener: () => void): (() => void) => {
@@ -78,6 +81,7 @@ export class AnswerBook {
 
   /** Change the draft of the question `id`, from the one held now. */
   updateDraft(id: string, next: (draft: Draft) => Draft) {
+    if (!navigationGate.edit()) return
     const held = this.draftOf(id)
     const draft = next(held)
     if (draft === held) return
@@ -102,7 +106,8 @@ export class AnswerBook {
 
   /** Send `body` as the answer to `item`, unless one is in flight already. */
   async answer(item: Question, body: AnswerRequest): Promise<void> {
-    if (this.inFlight.has(item.id)) return
+    if (this.inFlight.has(item.id) || this.localOf(item.id)?.phase === 'uncertain' || navigationGate.blocked()) return
+    const finish = navigationGate.mutation()
     this.inFlight.add(item.id)
     const version = item.version
     this.set(item.id, { phase: 'sending', version })
@@ -110,9 +115,26 @@ export class AnswerBook {
       await answerQuestion(this.client, this.sessionId, item.pending_id, body)
       this.set(item.id, { phase: 'sent', version })
     } catch (err) {
-      this.set(item.id, outcomeOf(err, version))
+      if (!(err instanceof ApiFailure) || err.status >= 500) {
+        await this.checkAnswer(item, messageOf(err))
+      } else this.set(item.id, outcomeOf(err, version))
     } finally {
       this.inFlight.delete(item.id)
+      finish()
+    }
+  }
+
+  /** Read only: an ambiguous POST never causes an automatic replay. */
+  async checkAnswer(item: Question, error = 'Check the current question before retrying.'): Promise<void> {
+    this.set(item.id, { phase: 'checking', version: item.version })
+    try {
+      const current = await questionCard(this.client, this.sessionId, item.pending_id)
+      if (current.kind !== 'question' || current.pending_id !== item.pending_id || current.version < item.version) throw new Error('Invalid question response.')
+      this.onQuestion?.(current)
+      if (current.delivered === true || current.state !== 'open') { this.local.delete(item.id); this.emit() }
+      else this.set(item.id, current.answered ? { phase: 'sent', version: current.version } : { phase: 'failed', version: current.version, message: error })
+    } catch (err) {
+      this.set(item.id, err instanceof ApiFailure && err.status === 404 ? { phase: 'gone', version: item.version } : { phase: 'uncertain', version: item.version })
     }
   }
 
@@ -201,9 +223,10 @@ export function useAnswering(
   loading: boolean,
   loads: number,
   connected: boolean | undefined,
+  onQuestion?: (item: Item) => void,
 ): AnswerBook {
   const client = useClient()
-  const book = useMemo(() => new AnswerBook(client, sessionId), [client, sessionId])
+  const book = useMemo(() => new AnswerBook(client, sessionId, onQuestion), [client, sessionId, onQuestion])
   // Before the cards' effects (a layout effect runs first): a fresh card
   // finds itself fresh when it mounts.
   useLayoutEffect(() => {
diff --git a/web/src/store/useSessionItems.ts b/web/src/store/useSessionItems.ts
index 6aaeb8e2..ebde1854 100644
--- a/web/src/store/useSessionItems.ts
+++ b/web/src/store/useSessionItems.ts
@@ -19,7 +19,7 @@ import { useClient } from '../app-client'
 import type { Client } from '../api/client'
 import { ApiFailure, Unauthenticated, messageOf } from '../api/errors'
 import { openStream, type Stream, type StreamEvent, type StreamState } from '../api/sse'
-import { anchorOf, catalog as fetchCatalog, itemPage, itemStreamPath } from '../api/view'
+import { anchorOf, catalog as fetchCatalog, itemPage, itemStreamPath, questionCard } from '../api/view'
 import type { SessionCatalog } from '../generated/protocol'
 import type { Item } from '../generated/view'
 import { useMediaQuery } from '../hooks/useMediaQuery'
@@ -105,6 +105,7 @@ export interface SessionItemsSnapshot {
   /** First pages taken: bumped by the first load and by every resync (the
    *  items were replaced). */
   loads: number
+  questionError: string | null
 }
 
 const INITIAL: SessionItemsSnapshot = {
@@ -117,6 +118,7 @@ const INITIAL: SessionItemsSnapshot = {
   resynced: false,
   catalog: null,
   loads: 0,
+  questionError: null,
 }
 
 /** `JSON.parse`, or `undefined` for text that is not JSON. */
@@ -154,6 +156,7 @@ export class SessionItemsController {
   private readonly limit: () => number | undefined
   private readonly timing: Timing
   private readonly backoff: ResyncBackoff
+  private questionSeq = 0
 
   constructor(client: Client, id: string, limit: () => number | undefined, timing: Partial<Timing> = {}) {
     this.client = client
@@ -211,6 +214,27 @@ export class SessionItemsController {
   /** The session was deleted from here: as a `session_removed`. */
   markRemoved = (): void => this.gone()
 
+  mergeQuestion = (item: Item): void => {
+    if (!this.snapshot.removed && item.kind === 'question') this.apply({ type: 'pin', item })
+  }
+
+  /** Shares the stream's version fence and lifecycle generation. A late
+   * read cannot restore a removed session or overwrite a newer SSE card. */
+  loadQuestion = async (pending: string): Promise<void> => {
+    const run = this.run, seq = ++this.questionSeq
+    if (this.snapshot.removed) return
+    this.update({ questionError: null })
+    try {
+      const item = await questionCard(this.client, this.id, pending)
+      if (run !== this.run || seq !== this.questionSeq || this.snapshot.removed) return
+      if (!isItem(item) || item.kind !== 'question' || item.pending_id !== pending) throw new Error('Invalid question response.')
+      this.apply({ type: 'pin', item })
+    } catch (err) {
+      if (run !== this.run || seq !== this.questionSeq || this.snapshot.removed) return
+      this.update({ questionError: err instanceof ApiFailure && err.status === 404 ? 'Question no longer available' : messageOf(err) })
+    }
+  }
+
   /** A catalogue from a config answer (202) replaces the one held. */
   setCatalog = (catalog: SessionCatalog): void => {
     this.catalogSeq++
@@ -351,11 +375,14 @@ export class SessionItemsController {
 
 export interface SessionItems extends Omit<SessionItemsSnapshot, 'store'> {
   items: Item[]
+  pinned: Item[]
   /** Groups exist before the first loaded one. */
   older: boolean
   loadOlder: () => Promise<void>
   setCatalog: (catalog: SessionCatalog) => void
   markRemoved: () => void
+  loadQuestion: (pending: string) => Promise<void>
+  mergeQuestion: (item: Item) => void
 }
 
 export function useSessionItems(id: string, timing?: Partial<Timing>): SessionItems {
@@ -376,5 +403,5 @@ export function useSessionItems(id: string, timing?: Partial<Timing>): SessionIt
   }, [controller])
   const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
   const { store, ...rest } = snapshot
-  return { ...rest, items: store.items, older: store.older, loadOlder: controller.loadOlder, setCatalog: controller.setCatalog, markRemoved: controller.markRemoved }
+  return { ...rest, items: store.items, pinned: store.pinned, older: store.older, mergeQuestion: controller.mergeQuestion, loadQuestion: controller.loadQuestion, loadOlder: controller.loadOlder, setCatalog: controller.setCatalog, markRemoved: controller.markRemoved }
 }
```

- [ ] Step 3: verify GREEN, inspect staged bytes, commit and push the task; request independent review from the parent.

```sh
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web build
```

## Task 4: verification, replay and installed-iOS acceptance

- [ ] Extract/apply the six patches to a FRESH directory at `256691fe`. Assert extracted files > 0. Run each RED then GREEN phase above. Compare every implementation file and the final changed-file set byte for byte with the built tree. Use its own Cargo target.
- [ ] Run the six Rust checks: cargo fmt --all --check; cargo clippy --workspace --all-targets --locked -- -D warnings; cargo clippy -p hennery --locked -- -D warnings; cargo test --workspace --locked; cargo run -p hennery-proto --bin gen --locked -- --check; cargo run -p hennery-view --bin gen-view --locked -- --check.
- [ ] Run pnpm --dir web install --frozen-lockfile, typecheck, test and build. Build hennery/testkit binaries, then CI=1 pnpm --dir web e2e. The e2e entry embeds the ordinary and update builds. Both 1280 px and 390 px phone-loop checks must run. Inspect their screenshots.
- [ ] Run revert-probes in a copy: snapshot boundary/DEFERRED behavior; session and pending owner filters; pending/session association with a phantom same-id event elsewhere; overlay replacement; pending URL selection/encoding; exact focus/no reload, readiness, lease recheck, dirty and mutation gates, active-worker source, separate/cold open, navigate/focus/close; gateway relay/source/hidden deferral; lifecycle fence, both item-version fences, duplicate answer and ambiguous recovery. Every probe must fail a relevant test. Retain original misses and strengthen their fixtures; never report INERT as BITE.
- [ ] Record the real commands, exit statuses, counts, replay extraction/tree comparison and open manual gates below. Update docs/README.md, commit as docs(plan): record the execution of plan P2, and push. Stop for the parent's reviews.

### Maintainer's installed-iOS acceptance checklist

Status: **NOT RUN — requires maintainer hardware, trusted HTTPS and actual vendor delivery.** Chromium OS-event/PushManager mocks and a WebKit viewport cannot replace this acceptance. The manual scope below is a checklist to run, not a pass claim.

Record date, hardware, OS/browser versions (minimum iOS/iPadOS 16.4+ where available and current release), origin topology without hostnames, collector commit, embedded build/worker id, adapter pin, each result and scrubbed failures. Do not retain endpoints, tokens, cookies or question secrets. Missing minimum-version hardware remains an explicit coverage gap.

| Check | Pass evidence to record | Result |
|---|---|---|
| Install/auth | Trusted HTTPS; Safari tab gives install guidance without prompting; install to Home Screen, launch standalone, icon/safe areas and authenticated session | Not run |
| Permission/device | Fresh step-up followed by a fresh Enable tap, grant and matching server row; denial and OS re-enable | Not run |
| Real push/privacy | Background/locked phone receives real vendor push for permission, outside-turn, completion/failure and gateway attention; default/generic/details/muted policy verified without retaining secret content | Not run |
| Warm/cold/login links | Wrong-session window, app closed, expired login, another hat, old card beyond tail, delivered/withdrawn/deleted target; default tap works without actions | Not run |
| Input/OS context reuse | Exact-target tap never reloads with question text, composer text, images and an answer in flight; another target leaves these untouched via a separate window or deferred hint; verify actual installed-app reuse | Not run |
| Mobile answers | Permission, single/multi select, custom text exclusivity, text and unsupported forms; real keyboard and safe areas keep card/composer Send reachable; no digit shortcut approval; queued to actual delivered verdict | Not run |
| Races/outages | Concurrent desktop answer, duplicate taps, host away then reconnect, collector unreachable and ambiguous send; input retained, live refresh before explicit retry and no automatic resend | Not run |
| Revocation | Disable/re-enable; desktop removal and reopen does not recreate a row; mobile sign-out and remote login revocation end rows/streams; an old notice requires login | Not run |
| Offline/update/eviction | Installed shell offline shows reconnect state with no transcript/API cache; reconnect retains choice; two edited windows never silently reload on update; storage clear/removal and next-launch update | Not run |
| Delivery/renewal | Focus enabled/disabled timing described; vendor renewal where observable, synthetic coverage labelled separately | Not run |
| Real pinned adapters | Temporary credentials/homes/data; one genuine question/elicitation from each pinned Claude and Codex adapter, vendor push to installed phone, app answer and actual adapter continuation | Not run |

### Evidence and limitations

Execution results are recorded after replay. Mock service composition proves the producer/worker/app logic, not APNs/vendor transport or an OS cold launch. The existing encrypted Rust delivery fixture verifies encryption/VAPID/privacy/retry; the page PushManager mock and emitted-worker OS event harness are separate explicit boundaries. No real vendor subscription is redirected to a loopback mock. The acceptance table stays open until the maintainer runs it.

## After this plan

The parent runs independent per-task, security and whole-branch review, opens the PR, checks Linux/macOS CI and resolves review threads. Keep the early-tester release gate. Installed-iOS/vendor and pinned real-adapter acceptance stay open above; no deployment or live acceptance is implied. Full Settings and standalone gateway delivery remain their original lanes. Consider replacing conservative document-dirty tracking only with independently verified per-draft ownership that protects unmounted forms and images.

Generated with Claude AI — please review before distribution.
