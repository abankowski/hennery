# Delegation families and live acceptance (D4) Implementation Plan

**Goal:** implement delegation design §§7–8, §10 and D4 in §11: operator family views, factual attention, takeover, typed provenance, browser/phone navigation and pinned provider acceptance. Build on D1–D3b at `7a820fce` and retain their authorization, configuration and dispatch fences.

**Architecture:** D4a adds pure generated family types, an owner/hat-authorized operator API, a canonical question-routing view, bounded durable invalidation and typed display authorship. D4b adds the family panel and row links to the current layout, explicit operator takeover, status-only attention acknowledgement and the real-provider harness. Permission questions remain operator work; one generation remains enforced.

**Tech stack:** existing Rust/axum/rusqlite, hennery-view code generation, React/TypeScript/Vitest and Playwright. No new dependency or lockfile change.

**Spec and hand-offs:** [delegation](../specs/2026-10-14-delegation-design.md), [D1](2026-10-27-delegation-mcp.md), [D2](2026-10-29-delegation-tools.md), [D3a](2026-10-31-delegation-delivery.md), [D3b](2026-11-01-delegation-attention.md), and plan 4's view/shell/list/phone contracts. Plan 3c supplies this structure. The built code in the patch blocks wins over prose.

## Execution status (2026-10-16)

Built first on `plan/deleg-d4`, split into D4a and D4b tasks within one reviewable plan. Every implementation began with failing tests; the execution record distinguishes meaningful assertion failures from initial inherited build-cache errors. Review and Linux/macOS CI are parent-owned. **Ordinary release remains blocked until live acceptance passes.** No acceptance is inferred from tool discovery, socket writes, model prose, skipped tests or fixture answers.

The final record below contains actual commands, counts, replay/probe evidence and the current live matrix. A local provider-authentication smoke is distinct from the parent/child matrix. Existing per-hat opt-out remains unchanged; no ordinary-use enablement is claimed while any required row or lifecycle scenario is incomplete.

## Scope

1. D4a: family API and generated types; same-owner/current-hat navigation; factual pending vs operator attention; transactional takeover; persisted SSE invalidations; typed Parent/ChildReport display authorship.
2. Pinned transport compatibility: actual Codex tool calls carry standard MCP metadata; preserve strict caller/argument parsing while accepting bounded metadata.
3. D4b UI: bounded snippets and paginated family panel; lifecycle/runtime/model/host/cwd; actual receipts, fallback reasons, direct operator answers, explicit takeover, paginated status-only attention with acknowledgement, waiting badge, provenance, retained-copy delete warning; reconnect and phone card-open integration.
4. Opt-in provider matrix and lifecycle acceptance. Remove preview release gating only after its recorded requirements pass.
5. Exact fresh replay, isolated guard probes, required checks and execution record.

Out: optional memory service, distribution/publication, recursive delegation, lock-screen replies and blanket provider permission approval.

## Decisions this plan makes where the spec is silent

These implementation details require the parent's independent security review; none claims maintainer confirmation in advance.

1. Family summaries show at most three child links; pages clamp to 1–100 children, keep the latest 16 operation receipts per child and cap question summaries at 256. The UI labels bounded receipt history. Cursors are lexical child ids used only inside a freshly authorized family query; they carry no authority or foreign-session lookup.
2. Takeover permanently detaches the existing edge, cancels undispatched parent commands and undelivered/unhanded parent answers, and exposes unresolved questions. It does not stop an already handed-off turn or close/delete a session. A handed-off answer retains the shared first-accepted answer slot. Existing direct operator answers remain available without takeover. Returning to a former hat never adopts the old family.
3. Historical family links are visible only while both endpoints still belong to the same current owner/hat. Reassignment/deletion removes chips immediately, including cached UI links; delivered typed transcript copies remain history and do not confer control.
4. A SQL view derives question routing from canonical pending/answer state, current endpoints/edge and accepted grant revision. Missing evidence fails closed to operator work. Accepted queued answers remain factual pending but do not create duplicate operator work. Status-only attention is counted independently; the badge counts sessions once.
5. Routing/receipt/edge changes atomically mark a durable dirty bit. The independent bounded reconciliation worker drains up to 128 dirty sessions through normal owner-parameterized event writes and publishes after commit. Frozen hats are excluded before any write, and a partial ready-row index bounds idle work. A stream also checks durable revisions at most once a second. Child changes invalidate parent summaries; family revisions refetch panels without refetching on transcript tokens. This preserves the strict owner audit and existing event cursor/resync contract.
6. Fold version 2 preserves collector-typed Parent/ChildReport authorship. Plug-in context remains a separate contract; unknown/forged authorship remains unrecognized. Source links never infer authority, titles or retained source payloads.
7. Standard MCP `_meta` is a map of at most 16 KiB and is ignored for authority. Exact tool fields and duplicate-key refusal remain. The live pinned Codex shape, null/array/scalar/oversized metadata, escaped/duplicate keys and unknown caller fields have positive refusal coverage.
8. Live tests require explicit adapter/auth paths and scratch homes; source credentials are copied mode 0600 and never printed. Only correlated named built-in parent MCP permissions are accepted by the harness. Provider inference is always opt-in and ignored in normal CI. A cheaper child that skipped elicitation is a failed attempt, never a passing schema-answer check.

## Global Constraints

- Use the worktree's Nix dev shell for every build/tool. Never share CARGO_TARGET_DIR, restart fleet services, use a real data directory or perform GitHub actions.
- Build first; retain the RED/GREEN output. Patch blocks below contain the actual tested bytes. Task 1 and Task 3 divide tests from production code for replay.
- One full workspace test and one full fresh replay per plan. Clone target with APFS before every probe/replay build. Revert-probes run only in isolated copies. Run 4×3 load only for timing/concurrency changes. Review amendments use targeted checks and new guard probes.
- Owner/hats, current grant/config evidence, first-accepted answer semantics and close/dispatch fences remain enforced. No test/type/rule is relaxed to obtain green.
- Push only the authorized branch over SSH, with personal author identity and signing disabled per local AGENTS.md. The parent owns reviews, PRs and merges.
- A rebase occurs only when the parent reports D3a/D3b merged. Never edit a merged migration; renumber schema 21 if needed before merge.

## Review Focus

1. Operator-only family reads and takeover: positive scope, foreign owner, changed hat, deletion/purge, cached links and opaque errors; no agent capability from UI visibility.
2. Takeover against parent answers/queued transfers and already handed-off work; idempotence, current family scope, explicit fallback reason and canonical answer slot.
3. Operator badge vs factual questions, parent-handled questions, accepted answers, permission questions and status attention; no double counting; every routing verdict covered; status-only acknowledgement stays bound to the selected session/current hat and never treats a question as an acknowledgement.
4. Dirty-bit/event atomicity, bounded draining and post-commit publishing; no missed parent invalidation, duplicate flush or token-driven family refresh; resume/resync and migration fixtures.
5. Typed provenance and retained-copy deletion warning; no Parent/ChildReport rendered as operator instructions; source links cannot restore authority.
6. Actual pinned adapter tool shapes and independently read-back configuration; genuine schema answers; lifecycle acceptance and honest live matrix before release-gate removal.
7. Phone notification opens the child card, retains permission policy and exposes no lock-screen answer action. Chromium worker/click tests do not claim vendor delivery or installed-device cold launch.

## File structure

- `crates/hennery-view/src/{api,item,fold,codegen}.rs`, fold version and generated schema/TypeScript: family wire contract and provenance.
- `crates/hennery-sessions/src/family.{rs,sql}`, view router, attention/worker integration: authorized projection, takeover and migration 21.
- Sessions/view/owner-audit tests plus historical rollback fixtures; Nix's explicit SQL source closure.
- `web/src/components/FamilyPanel.tsx`, SessionRow/SessionHeader/QuestionCard/UserTurn/SessionMenu, session store/screen and typed API: integrated operator experience.
- `web/e2e/family.spec.ts` and changed real-session assertion: desktop/390px family navigation, takeover, counts, resync and emitted notification-worker card open.
- `crates/hennery-testkit/tests/delegation_live.rs`: explicit scratch provider authentication and parent/child acceptance, separate from normal tests.

## Reading the steps

Apply each nonempty diff block to the stated base, in order, using `git apply`. No block is a sketch. The initial replay extractor must find its seven task blocks and at least one changed file before any green claim. The later review amendment patch is separate from that historical replay. Run focused tests after each task; compare the final implementation tree byte-for-byte. Generator outputs are included in Task 1 and checked by the two generator commands.

### Task 1, step 1: specify scoped families, counts, takeover and typed authorship

Run before implementation: `cargo test -p hennery-sessions --test delegation_d2 --locked d4_`, `cargo test -p hennery-testkit --test view --locked family_pages_are_operator_only_scoped_and_paginated`, and `cargo test -p hennery-view --test plugin_origin --locked parent_and_child_report_preserve_typed_display_authorship`. Expected RED: absent API/methods, absent family route and absent typed authorship.

```diff
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 32ba10f6..352817a0 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -156,6 +156,221 @@ fn pair() -> (World, SessionIdentity) {
     child(&w, &parent, "child", &w.hat);
     (w, parent)
 }
+
+#[test]
+fn d4_counts_parent_handled_questions_and_takeover_are_factual_and_atomic() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    let s = w.store.family_summary("child").unwrap().unwrap();
+    assert!(s.question_waits);
+    assert_eq!((s.operator_attention, s.parent_handled_questions), (0, 1));
+    assert_eq!(w.store.operator_waiting_count(None).unwrap(), 0);
+    pending(&w, "child", 3, "permission", PendingKind::Permission);
+    let s = w.store.family_summary("child").unwrap().unwrap();
+    assert_eq!((s.operator_attention, s.parent_handled_questions), (1, 1));
+    assert_eq!(w.store.operator_waiting_count(Some(&w.hat)).unwrap(), 1);
+    assert_eq!(w.store.operator_waiting_count(Some(&w.other)).unwrap(), 0);
+    let hub = Hub::new();
+    assert!(w.store.take_over_child("child", &hub).unwrap());
+    assert!(w.store.take_over_child("child", &hub).unwrap());
+    assert!(w.store.direct_child(&p, 1, "child").unwrap().is_none());
+    let s = w.store.family_summary("child").unwrap().unwrap();
+    assert_eq!((s.operator_attention, s.parent_handled_questions), (2, 0));
+    assert_eq!(
+        w.store.family_page("parent", "", 10).unwrap().unwrap().children[0].routing,
+        "detached"
+    );
+    assert!(!w.store.take_over_child("parent", &hub).unwrap());
+    assert!(!w.store.take_over_child("unknown", &hub).unwrap());
+}
+
+#[test]
+fn d4_parent_child_counts_include_parent_handled_waiting_and_status_attention() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    let family = w.store.family_summary("parent").unwrap().unwrap().family.unwrap();
+    assert_eq!(family.child_counts.waiting, 1);
+    assert_eq!(family.attention, 0);
+    // A status incident without a question still contributes operator work.
+    raw(&w)
+        .execute(
+            "INSERT INTO delegation_attention(owner_id,attention_id,child_id,hat_id,reason,state,incident)
+        VALUES (?1,'status','child',?2,'start_failed','open','status')",
+            params![w.store.owner_id(), w.hat],
+        )
+        .unwrap();
+    assert_eq!(
+        w.store
+            .family_summary("parent")
+            .unwrap()
+            .unwrap()
+            .family
+            .unwrap()
+            .attention,
+        1
+    );
+}
+
+#[test]
+fn d4_dirty_projection_cannot_write_into_a_frozen_hat() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    raw(&w)
+        .execute(
+            "INSERT INTO purged_hats(owner_id,hat_id,purged_at) VALUES (?1,?2,1)",
+            params![w.store.owner_id(), w.hat],
+        )
+        .unwrap();
+    let before = w.store.max_event_id().unwrap();
+    w.store.flush_family_changes(&Hub::new()).unwrap();
+    assert_eq!(
+        w.store.max_event_id().unwrap(),
+        before,
+        "purge freezes even projection writes"
+    );
+    assert!(w.store.family_page("parent", "", 20).unwrap().is_none());
+    assert_eq!(w.store.operator_waiting_count(None).unwrap(), 0);
+}
+
+#[test]
+fn d4_deadlines_and_receipts_invalidate_the_child_and_parent_summary() {
+    let (w, p) = pair();
+    w.store.flush_family_changes(&Hub::new()).unwrap();
+    let revision = w
+        .store
+        .family_summary("parent")
+        .unwrap()
+        .unwrap()
+        .family
+        .unwrap()
+        .revision;
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    let before = w.store.max_event_id().unwrap();
+    let hub = Hub::new();
+    let mut rings = hub.subscribe();
+    w.store.refresh_delegation_attention(&hub, i64::MAX / 2).unwrap();
+    assert!(w.store.max_event_id().unwrap() > before);
+    let mut published = Vec::new();
+    while let Ok(event) = rings.try_recv() {
+        published.push(event);
+    }
+    assert!(
+        published
+            .iter()
+            .any(|event| event.session_id == "child" && event.kind == "family_changed" && event.event_id > before),
+        "committed invalidations wake existing subscribers"
+    );
+    let flushed = w.store.max_event_id().unwrap();
+    w.store.flush_family_changes(&Hub::new()).unwrap();
+    assert_eq!(
+        w.store.max_event_id().unwrap(),
+        flushed,
+        "no duplicate invalidation without a new fact"
+    );
+    let changed = w.store.family_changed_after(before).unwrap();
+    assert!(changed.contains(&"child".to_string()) && changed.contains(&"parent".to_string()));
+    assert!(
+        w.store
+            .family_summary("parent")
+            .unwrap()
+            .unwrap()
+            .family
+            .unwrap()
+            .revision
+            > revision
+    );
+    let s = w.store.family_summary("child").unwrap().unwrap();
+    assert_eq!((s.operator_attention, s.parent_handled_questions), (1, 0));
+    let hub = Hub::new();
+    w.store
+        .queue_ordinary_answer(
+            &p,
+            1,
+            "digest",
+            &hennery_sessions::delegation_control::DelegatedAnswer {
+                key: "answer",
+                child: "child",
+                pending: "ordinary",
+                answer: &answer(),
+            },
+            &hub,
+        )
+        .unwrap();
+    let s = w.store.family_summary("child").unwrap().unwrap();
+    assert!(s.question_waits);
+    assert_eq!((s.operator_attention, s.parent_handled_questions), (0, 0));
+    assert_eq!(w.store.operator_waiting_count(None).unwrap(), 0);
+    assert!(w.store.take_over_child("child", &hub).unwrap());
+    assert_eq!(w.store.family_summary("child").unwrap().unwrap().operator_attention, 1);
+    assert!(matches!(
+        w.store.submit_answer("child", "ordinary", &answer()).unwrap(),
+        AnswerSubmission::Queued(_)
+    ));
+}
+
+#[test]
+fn d4_each_parent_routing_state_stays_distinct_until_operator_takeover() {
+    for state in [
+        "parent_queued",
+        "parent_delivered",
+        "waiting_config",
+        "awaiting_reconciliation",
+    ] {
+        let (w, _) = pair();
+        pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+        raw(&w)
+            .execute("UPDATE delegation_notices SET state=?1 WHERE child_id='child'", [state])
+            .unwrap();
+        let page = w.store.family_page("child", "", 20).unwrap().unwrap();
+        assert_eq!(page.questions[0].handling, state);
+        assert_eq!(
+            (page.summary.operator_attention, page.summary.parent_handled_questions),
+            (0, 1)
+        );
+        assert!(w.store.take_over_child("child", &Hub::new()).unwrap());
+        let page = w.store.family_page("child", "", 20).unwrap().unwrap();
+        assert_eq!(page.questions[0].handling, "operator_required");
+        assert_eq!(page.questions[0].reason.as_deref(), Some("operator_takeover"));
+    }
+}
+
+#[test]
+fn d4_takeover_races_parent_answer_without_losing_operator_control() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    let second = Store::open(&w.db).unwrap();
+    let barrier = Barrier::new(2);
+    let hub = Hub::new();
+    std::thread::scope(|scope| {
+        let a = scope.spawn(|| {
+            barrier.wait();
+            w.store.take_over_child("child", &hub).unwrap()
+        });
+        let b = scope.spawn(|| {
+            barrier.wait();
+            second.queue_ordinary_answer(
+                &p,
+                1,
+                "digest",
+                &hennery_sessions::delegation_control::DelegatedAnswer {
+                    key: "race",
+                    child: "child",
+                    pending: "ordinary",
+                    answer: &answer(),
+                },
+                &hub,
+            )
+        });
+        assert!(a.join().unwrap());
+        let _ = b.join().unwrap();
+    });
+    assert!(w.store.direct_child(&p, 1, "child").unwrap().is_none());
+    assert_eq!(w.store.family_summary("child").unwrap().unwrap().operator_attention, 1);
+    assert!(matches!(
+        w.store.submit_answer("child", "ordinary", &answer()).unwrap(),
+        AnswerSubmission::Queued(_)
+    ));
+}
 fn connected() -> (Arc<Hub>, tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) {
     let h = Arc::new(Hub::new());
     let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
@@ -4157,6 +4372,7 @@ async fn reviewer_slow_host_probes_do_not_starve_deadlines() {
     state.hub.mark_ready("host", reg.conn_id);
     hennery_sessions::delegation_worker::after_startup(&state);
     assert!(matches!(rx.recv().await.unwrap(), CollectorFrame::ResolvePath { .. }));
+    let before_deadlines = w.store.max_event_id().unwrap();
     raw(&w)
         .execute(
             "UPDATE delegation_notices SET deadline=?2 WHERE owner_id=?1",
@@ -4168,6 +4384,18 @@ async fn reviewer_slow_host_probes_do_not_starve_deadlines() {
         tokio::task::yield_now().await;
     }
     let open = attention(&w).len();
+    let invalidated: i64 = raw(&w)
+        .query_row(
+            "SELECT count(*) FROM events WHERE owner_id=?1
+        AND kind='family_changed' AND event_id>?2",
+            params![w.store.owner_id(), before_deadlines],
+            |r| r.get(0),
+        )
+        .unwrap();
+    assert!(
+        invalidated >= 32,
+        "deadline routing must invalidate all child summaries while the host probe is pending"
+    );
     let notified: i64 = raw(&w)
         .query_row(
             "SELECT COUNT(*) FROM delegation_attention WHERE owner_id=?1 AND state='open' AND push_run<>''",
@@ -4201,7 +4429,8 @@ fn reviewer_migration20_recovers_preexisting_orphan_questions() {
     // Reconstruct the D3a v19 schema after deletion: its notices and family
     // edge are scrubbed, while the surviving child's callback is still open.
     raw(&w)
-        .execute_batch(
+        .execute_batch(concat!(
+            include_str!("fixtures/undo_family.sql"),
             "DROP TRIGGER attention_notice_update;
         DROP TRIGGER attention_parent_delete;
         DROP TRIGGER attention_child_end;
@@ -4209,8 +4438,8 @@ fn reviewer_migration20_recovers_preexisting_orphan_questions() {
         DROP TRIGGER attention_answer_cancelled;
         DROP TABLE delegation_attention;
         DROP INDEX delegation_notice_deadline;
-        PRAGMA user_version=19;",
-        )
+        PRAGMA user_version=19;"
+        ))
         .unwrap();
     let upgraded = Store::open(&w.db).unwrap();
     upgraded
@@ -4379,7 +4608,8 @@ fn d3b_migration20_filters_answers_terminal_and_root_questions() {
     w.store.close_now("parent").unwrap();
     w.store.delete_session("parent", None).unwrap();
     raw(&w)
-        .execute_batch(
+        .execute_batch(concat!(
+            include_str!("fixtures/undo_family.sql"),
             "DROP TRIGGER attention_notice_update;
         DROP TRIGGER attention_parent_delete;
         DROP TRIGGER attention_child_end;
@@ -4387,8 +4617,8 @@ fn d3b_migration20_filters_answers_terminal_and_root_questions() {
         DROP TRIGGER attention_answer_cancelled;
         DROP TABLE delegation_attention;
         DROP INDEX delegation_notice_deadline;
-        PRAGMA user_version=19;",
-        )
+        PRAGMA user_version=19;"
+        ))
         .unwrap();
     let upgraded = Store::open(&w.db).unwrap();
     let work = upgraded.operator_attention(None, "").unwrap();
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
index ec5eeb0d..f66dda86 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
@@ -1,5 +1,20 @@
 -- Test-only rollback of migration 18 before reconstructing a historical schema.
 -- Production migrations remain append-only.
+DROP TRIGGER family_view_attention_insert;
+DROP TRIGGER family_view_attention_update;
+DROP TRIGGER family_view_edge_insert;
+DROP TRIGGER family_view_edge_update;
+DROP TRIGGER family_view_edge_delete;
+DROP TRIGGER family_view_operation_update;
+DROP VIEW delegation_question_routing;
+DROP TRIGGER family_view_session_state;
+DROP TRIGGER family_view_pending_insert;
+DROP TRIGGER family_view_pending_update;
+DROP TRIGGER family_view_answer_insert;
+DROP TRIGGER family_view_answer_delete;
+DROP TRIGGER family_view_operation_insert;
+DROP INDEX family_dirty_ready;
+ALTER TABLE sessions DROP COLUMN family_dirty;
 DROP TRIGGER attention_notice_update;
 DROP TRIGGER attention_parent_delete;
 DROP TRIGGER attention_child_end;
diff --git a/crates/hennery-sessions/tests/fixtures/undo_family.sql b/crates/hennery-sessions/tests/fixtures/undo_family.sql
new file mode 100644
index 00000000..ee4de64c
--- /dev/null
+++ b/crates/hennery-sessions/tests/fixtures/undo_family.sql
@@ -0,0 +1,16 @@
+-- Test-only rollback of sessions migration 21 for historical schema fixtures.
+DROP TRIGGER family_view_attention_insert;
+DROP TRIGGER family_view_attention_update;
+DROP TRIGGER family_view_edge_insert;
+DROP TRIGGER family_view_edge_update;
+DROP TRIGGER family_view_edge_delete;
+DROP TRIGGER family_view_operation_update;
+DROP VIEW delegation_question_routing;
+DROP TRIGGER family_view_session_state;
+DROP TRIGGER family_view_pending_insert;
+DROP TRIGGER family_view_pending_update;
+DROP TRIGGER family_view_answer_insert;
+DROP TRIGGER family_view_answer_delete;
+DROP TRIGGER family_view_operation_insert;
+DROP INDEX family_dirty_ready;
+ALTER TABLE sessions DROP COLUMN family_dirty;
diff --git a/crates/hennery-testkit/tests/fixtures/delegation-codex-acp-1.13.0.jsonl b/crates/hennery-testkit/tests/fixtures/delegation-codex-acp-1.13.0.jsonl
new file mode 100644
index 00000000..a571ae7b
--- /dev/null
+++ b/crates/hennery-testkit/tests/fixtures/delegation-codex-acp-1.13.0.jsonl
@@ -0,0 +1,24 @@
+{"event_id":54,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":1,"kind":"session_started","body":{"kind":"session_started","request_id":"00000000-0000-7000-8000-000000000002","agent_session_id":"00000000-0000-7000-8000-000000000003","indexed":{"config_evidence":{"attach_generation":1,"config_revision":1,"completeness":"complete","actual":{"model":"gpt-6-sol","mode":"read-only","axes":{"collaboration_mode":"plan","reasoning_effort":"low"}}},"config_options":[{"id":"mode","name":"Mode","description":"Approval and sandboxing preset for the session","category":"mode","type":"select","currentValue":"read-only","options":[{"value":"read-only","name":"Ask for approval","description":"Always ask to edit external files and use the internet","_meta":{"kind":"standard"}},{"value":"agent","name":"Approve for me","description":"Only ask for actions detected as potentially unsafe","_meta":{"kind":"auto_review"}},{"value":"agent-full-access","name":"Full access","description":"Unrestricted access to the internet and any file on your computer","_meta":{"kind":"full_access"}}]},{"id":"collaboration_mode","name":"Collaboration mode","description":"How Codex collaborates for subsequent turns","category":"collaboration_mode","type":"select","currentValue":"plan","options":[{"value":"default","name":"Default"},{"value":"plan","name":"Plan","description":"Plan before making changes"}]},{"id":"model","name":"Model","description":"Model Codex uses for the session","category":"model","type":"select","currentValue":"gpt-6-sol","options":[{"value":"gpt-6-astra","name":"6 Astra","description":"Frontier intelligence for the most demanding work."},{"value":"gpt-6-sol","name":"6 Sol","description":"Previous generation workhorse model."},{"value":"gpt-6-luna","name":"6 Luna","description":"Fast and affordable model for easier tasks."},{"value":"gpt-5.6-sol","name":"5.6 Sol","description":"Older generation workhorse model."},{"value":"gpt-5.6-terra","name":"5.6 Terra","description":"Older balanced model for straightforward work."},{"value":"gpt-5.6-luna","name":"5.6 Luna","description":"Older fast and efficient model."}]},{"id":"reasoning_effort","name":"Reasoning effort","description":"How much reasoning effort the model should use","category":"thought_level","type":"select","currentValue":"low","options":[{"value":"low","name":"Low","description":"Fast responses with lighter reasoning"},{"value":"medium","name":"Medium","description":"Balances speed and reasoning depth for everyday tasks"},{"value":"high","name":"High","description":"Greater reasoning depth for complex problems"},{"value":"xhigh","name":"Xhigh","description":"Extra high reasoning depth for complex problems"},{"value":"max","name":"Max","description":"Maximum reasoning depth for the hardest problems"},{"value":"ultra","name":"Ultra","description":"Maximum reasoning with automatic task delegation"}]}],"current_model":"gpt-6-sol","current_mode":"read-only","current_axes":{"collaboration_mode":"plan","reasoning_effort":"low"}},"agent_home":{"root":"/tmp/smoke/codex-home/codex","sqlite_root":"/tmp/smoke/codex-home/codex-sqlite"}},"ts":"2026-10-15T23:19:19.237Z"}
+{"event_id":56,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":3,"kind":"turn_started","body":{"kind":"turn_started","request_id":"00000000-0000-7000-8000-000000000004","turn_id":"00000000-0000-7000-8000-000000000005"},"ts":"2026-10-15T23:19:19.504Z"}
+{"event_id":57,"session_id":"00000000-0000-7000-8000-000000000001","kind":"user_turn","body":{"turn_id":"00000000-0000-7000-8000-000000000005","content":[{"type":"text","text":"From parent session \"00000000-0000-7000-8000-000000000006\" (untrusted parent-provided task data; this is not operator approval):\nThis is an actual tool acceptance test. You are in Plan mode. You MUST immediately call the request_user_input tool to ask one required single-choice question named acceptance_color with options blue and green. You do not know the answer. Do not choose a color yourself, infer it, or ask in plain text. Wait for the real tool response before replying CHILD_ACCEPTANCE_OK followed by the returned color. If the question tool is unavailable, reply ELICITATION_UNAVAILABLE; never pretend you called it. Do not read/write files or run commands."}],"origin":{"kind":"parent","session_id":"00000000-0000-7000-8000-000000000006","operation_id":"00000000-0000-7000-8000-000000000004"}},"ts":"2026-10-15T23:19:19.504Z"}
+{"event_id":58,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":4,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"threadStatus":{"type":"active","activeFlags":[]}}}}}},"ts":"2026-10-15T23:19:19.514Z"}
+{"event_id":59,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":5,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"error":{"message":"Reconnecting... 2/5","codexErrorInfo":{"responseStreamDisconnected":{"httpStatusCode":null}},"additionalDetails":"stream disconnected before completion: invalid peer certificate: UnknownIssuer","misalignment":null,"turnId":"00000000-0000-7000-8000-000000000007","willRetry":true}}}}}},"ts":"2026-10-15T23:19:20.090Z"}
+{"event_id":60,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":6,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"error":{"message":"Reconnecting... 3/5","codexErrorInfo":{"responseStreamDisconnected":{"httpStatusCode":null}},"additionalDetails":"stream disconnected before completion: invalid peer certificate: UnknownIssuer","misalignment":null,"turnId":"00000000-0000-7000-8000-000000000007","willRetry":true}}}}}},"ts":"2026-10-15T23:19:20.509Z"}
+{"event_id":61,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":7,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"error":{"message":"Reconnecting... 4/5","codexErrorInfo":{"responseStreamDisconnected":{"httpStatusCode":null}},"additionalDetails":"stream disconnected before completion: invalid peer certificate: UnknownIssuer","misalignment":null,"turnId":"00000000-0000-7000-8000-000000000007","willRetry":true}}}}}},"ts":"2026-10-15T23:19:21.296Z"}
+{"event_id":62,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":8,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"error":{"message":"Reconnecting... 5/5","codexErrorInfo":{"responseStreamDisconnected":{"httpStatusCode":null}},"additionalDetails":"stream disconnected before completion: invalid peer certificate: UnknownIssuer","misalignment":null,"turnId":"00000000-0000-7000-8000-000000000007","willRetry":true}}}}}},"ts":"2026-10-15T23:19:22.895Z"}
+{"event_id":72,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":9,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"Warning: Falling back from WebSockets to HTTPS transport. stream disconnected before completion: invalid peer certificate: UnknownIssuer\n\n"}}}},"ts":"2026-10-15T23:19:26.419Z"}
+{"event_id":73,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":10,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_thought_chunk","messageId":"rs_0001","content":{"type":"text","text":"\n\n"}}}},"ts":"2026-10-15T23:19:31.145Z"}
+{"event_id":74,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":11,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_thought_chunk","messageId":"rs_0001","content":{"type":"text","text":"**Preparing input question**"}}}},"ts":"2026-10-15T23:19:31.147Z"}
+{"event_id":75,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":12,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"threadStatus":{"type":"active","activeFlags":["waitingOnUserInput"]}}}}}},"ts":"2026-10-15T23:19:31.356Z"}
+{"event_id":76,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":13,"kind":"pending_opened","body":{"kind":"pending_opened","pending_id":"00000000-0000-7000-8000-000000000008","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005","pending":{"id":"00000000-0000-7000-8000-000000000008","kind":"elicitation","title":"Codex needs your input to continue."}},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","toolCallId":"call_0001","mode":"form","message":"Codex needs your input to continue.","requestedSchema":{"type":"object","properties":{"acceptance_color":{"title":"Which acceptance color should I use?","description":"Color","_meta":{"codex":{"isOther":true,"isSecret":false}},"type":"string","oneOf":[{"const":"Blue (Recommended)","title":"Blue (Recommended)","description":"Return blue as the acceptance color."},{"const":"Green","title":"Green","description":"Return green as the acceptance color."},{"const":"None of the above","title":"None of the above","description":"Provide a different answer in the note field."}]},"acceptance_color_note":{"type":"string","title":"Additional answer or note","_meta":{"codex":{"questionId":"acceptance_color","role":"user_note","isSecret":false}}}},"required":["acceptance_color"]},"_meta":{"codex":{"autoResolutionMs":null}}}},"ts":"2026-10-15T23:19:31.356Z"}
+{"event_id":129,"session_id":"00000000-0000-7000-8000-000000000001","kind":"answer_submitted","body":{"pending_id":"00000000-0000-7000-8000-000000000008","request_id":"00000000-0000-7000-8000-000000000009","answer":{"action":"accept","content":{"acceptance_color":"Blue (Recommended)"}},"origin":{"kind":"parent","session_id":"00000000-0000-7000-8000-000000000006","operation_id":"00000000-0000-7000-8000-00000000000a"}},"ts":"2026-10-15T23:19:52.012Z"}
+{"event_id":134,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":14,"kind":"answer_result","body":{"kind":"answer_result","pending_id":"00000000-0000-7000-8000-000000000008","request_id":"00000000-0000-7000-8000-000000000009","delivered":true},"ts":"2026-10-15T23:19:52.253Z"}
+{"event_id":135,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":15,"kind":"pending_resolved","body":{"kind":"pending_resolved","pending_id":"00000000-0000-7000-8000-000000000008","resolution":"delivered"},"ts":"2026-10-15T23:19:52.255Z"}
+{"event_id":136,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":16,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"session_info_update","_meta":{"codex":{"threadStatus":{"type":"active","activeFlags":[]}}}}}},"ts":"2026-10-15T23:19:52.258Z"}
+{"event_id":137,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":17,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"usage_update","used":20582,"size":258400}}},"ts":"2026-10-15T23:19:52.260Z"}
+{"event_id":138,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":18,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","messageId":"msg_0001","content":{"type":"text","text":"CH"},"_meta":{"codex":{"phase":"final_answer"}}}}},"ts":"2026-10-15T23:19:53.199Z"}
+{"event_id":139,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":19,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","messageId":"msg_0001","content":{"type":"text","text":"ILD"},"_meta":{"codex":{"phase":"final_answer"}}}}},"ts":"2026-10-15T23:19:53.213Z"}
+{"event_id":140,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":20,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","messageId":"msg_0001","content":{"type":"text","text":"_ACCEPT"},"_meta":{"codex":{"phase":"final_answer"}}}}},"ts":"2026-10-15T23:19:53.238Z"}
+{"event_id":141,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":21,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","messageId":"msg_0001","content":{"type":"text","text":"ANCE"},"_meta":{"codex":{"phase":"final_answer"}}}}},"ts":"2026-10-15T23:19:53.241Z"}
+{"event_id":142,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":22,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","messageId":"msg_0001","content":{"type":"text","text":"_OK"},"_meta":{"codex":{"phase":"final_answer"}}}}},"ts":"2026-10-15T23:19:53.258Z"}
+{"event_id":143,"session_id":"00000000-0000-7000-8000-000000000001","host_seq":23,"kind":"acp_update","body":{"kind":"acp_update","indexed":{"turn_id":"00000000-0000-7000-8000-000000000005"},"payload":{"sessionId":"00000000-0000-7000-8000-000000000003","update":{"sessionUpdate":"agent_message_chunk","messageId":"msg_0001","content":{"type":"text","text":" blue"},"_meta":{"codex":{"phase":"final_answer"}}}}},"ts":"2026-10-15T23:19:53.281Z"}
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 06968792..8b7aa25a 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -35,6 +35,11 @@ use std::sync::{Arc, Mutex};
 
 /// The audited sources, and the fewest statements each holds.
 const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-sessions/src/family.rs",
+        include_str!("../../hennery-sessions/src/family.rs"),
+        15,
+    ),
     (
         "hennery-sessions/src/delegation_attention.rs",
         include_str!("../../hennery-sessions/src/delegation_attention.rs"),
diff --git a/crates/hennery-testkit/tests/view.rs b/crates/hennery-testkit/tests/view.rs
index 9c2a4692..bc2e73aa 100644
--- a/crates/hennery-testkit/tests/view.rs
+++ b/crates/hennery-testkit/tests/view.rs
@@ -24,6 +24,136 @@ const OTHER: &str = "owner-00000000000000b2";
 /// How long a test waits for anything the collector sends.
 const WAIT: Duration = Duration::from_secs(20);
 
+#[tokio::test]
+async fn family_pages_are_operator_only_scoped_and_paginated() {
+    let c = Collector::start().await;
+    let owner = c.owner();
+    let hennery_kernel::hats::HatChange::Done(hat) = c.state.hosts.create_hat("Family", None, 1).unwrap() else {
+        panic!()
+    };
+    c.session(&owner, "parent");
+    c.conn()
+        .execute("UPDATE sessions SET hat_id=?1 WHERE id='parent'", [&hat.id])
+        .unwrap();
+    for id in ["child-a", "child-b"] {
+        c.session(&owner, id);
+        c.conn()
+            .execute(
+                "UPDATE sessions SET lifecycle='starting',hat_id=?2 WHERE id=?1",
+                params![id, hat.id],
+            )
+            .unwrap();
+        c.conn()
+            .execute(
+                "INSERT INTO session_families(owner_id,child_id,parent_id,root_id,hat_id,created_event_id)
+            VALUES (?1,?2,'parent','parent',?3,0)",
+                params![owner, id, hat.id],
+            )
+            .unwrap();
+    }
+    c.other_owner("foreign-family");
+    let path = "/api/view/sessions/parent/family?limit=1";
+    assert_eq!(reqwest::get(c.url(path)).await.unwrap().status(), 401);
+    let page: Value = c
+        .client()
+        .get(c.url(path))
+        .send()
+        .await
+        .unwrap()
+        .error_for_status()
+        .unwrap()
+        .json()
+        .await
+        .unwrap();
+    assert_eq!(page["children"].as_array().unwrap().len(), 1);
+    assert_eq!(page["children"][0]["summary"]["session_id"], "child-a");
+    assert_eq!(page["summary"]["family"]["child_counts"]["total"], 2);
+    let next: Value = c
+        .client()
+        .get(c.url("/api/view/sessions/parent/family?limit=1&after=child-a"))
+        .send()
+        .await
+        .unwrap()
+        .json()
+        .await
+        .unwrap();
+    assert_eq!(next["children"][0]["summary"]["session_id"], "child-b");
+    assert!(next.get("next_cursor").is_none());
+    for id in ["foreign-family", "missing", "parent"] {
+        assert_eq!(
+            c.client()
+                .post(c.url(&format!("/api/view/sessions/{id}/takeover")))
+                .json(&json!({}))
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            404
+        );
+    }
+    for invalid in [json!([]), json!({"parent_id":"forged"})] {
+        assert_eq!(
+            c.client()
+                .post(c.url("/api/view/sessions/child-b/takeover"))
+                .json(&invalid)
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            400
+        );
+    }
+    assert_eq!(
+        c.client()
+            .post(c.url("/api/view/sessions/child-b/takeover"))
+            .header("origin", "https://foreign.example")
+            .json(&json!({}))
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        403
+    );
+    assert_eq!(
+        c.client()
+            .post(c.url("/api/view/sessions/child-b/takeover"))
+            .json(&json!({}))
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        204
+    );
+    for id in ["foreign-family", "missing"] {
+        assert_eq!(
+            c.client()
+                .get(c.url(&format!("/api/view/sessions/{id}/family")))
+                .send()
+                .await
+                .unwrap()
+                .status(),
+            404
+        );
+    }
+    // Historical cross-hat edges never reveal the other endpoint, even to
+    // an operator's family panel for the old hat.
+    c.conn()
+        .execute("UPDATE sessions SET hat_id='moved' WHERE id='child-a'", [])
+        .unwrap();
+    let page: Value = c.client().get(c.url(path)).send().await.unwrap().json().await.unwrap();
+    assert_eq!(page["children"][0]["summary"]["session_id"], "child-b");
+    let moved: Value = c
+        .client()
+        .get(c.url("/api/view/sessions/child-a/family"))
+        .send()
+        .await
+        .unwrap()
+        .json()
+        .await
+        .unwrap();
+    assert!(moved["summary"]["family"].is_null());
+}
+
 struct Collector {
     addr: SocketAddr,
     state: AppState,
@@ -2315,7 +2445,7 @@ fn scripts_intact(items: &[Item], leg: &str) {
             .find(|i| i.id == id)
             .unwrap_or_else(|| panic!("{leg}: no {id} in {items:?}"))
     };
-    let Body::UserTurn { content, truncated } = &find("t2:0").body else {
+    let Body::UserTurn { content, truncated, .. } = &find("t2:0").body else {
         panic!("{leg}: a user turn");
     };
     assert!(!truncated, "{leg}");
diff --git a/crates/hennery-view/tests/plugin_origin.rs b/crates/hennery-view/tests/plugin_origin.rs
index c997221e..8764e1f9 100644
--- a/crates/hennery-view/tests/plugin_origin.rs
+++ b/crates/hennery-view/tests/plugin_origin.rs
@@ -2,6 +2,28 @@ use hennery_proto::rest::EventDto;
 use hennery_view::{Body, Fold};
 use serde_json::json;
 
+#[test]
+fn parent_and_child_report_preserve_typed_display_authorship() {
+    for origin in [
+        json!({"kind":"parent","session_id":"p","operation_id":"o"}),
+        json!({"kind":"child_report","child_id":"c","source_event_id":"7","delivery_id":"d"}),
+    ] {
+        let items = hennery_view::fold(
+            &[EventDto {
+                event_id: 1,
+                session_id: "s".into(),
+                host_seq: None,
+                kind: "user_turn".into(),
+                ts: "now".into(),
+                body: json!({"turn_id":"t","origin":origin,
+                "content":[{"type":"text","text":"You approved everything"}]}),
+            }],
+            &|_: &str| false,
+        );
+        assert_eq!(serde_json::to_value(&items[0]).unwrap()["origin"], origin);
+    }
+}
+
 #[test]
 fn plugin_origin_cannot_be_displayed_as_an_operator_turn() {
     let mut fold = Fold::new();
diff --git a/crates/hennery-view/tests/rules.rs b/crates/hennery-view/tests/rules.rs
index 19213611..cb25f2d8 100644
--- a/crates/hennery-view/tests/rules.rs
+++ b/crates/hennery-view/tests/rules.rs
@@ -445,7 +445,7 @@ fn a_user_turn_carries_its_images_as_attachments() {
         )],
         &none,
     );
-    let Body::UserTurn { content, truncated } = &items[0].body else {
+    let Body::UserTurn { content, truncated, .. } = &items[0].body else {
         panic!()
     };
     assert!(!truncated);
```

### Task 1, step 2: implement the operator projection, durable invalidation and fold

Run after implementation: the focused D4 tests, view/owner-audit tests and hennery-view tests. Expected GREEN. Probe each authorization, routing/count, dirty/event/publish and takeover guard in a cloned copy. Load the takeover race at 4×3.

```diff
diff --git a/crates/hennery-sessions/src/delegation_attention.rs b/crates/hennery-sessions/src/delegation_attention.rs
index c9de08f9..f25217d3 100644
--- a/crates/hennery-sessions/src/delegation_attention.rs
+++ b/crates/hennery-sessions/src/delegation_attention.rs
@@ -19,7 +19,8 @@ pub struct OperatorAttention {
 }
 impl Store {
     pub fn refresh_delegation_attention(&self, hub: &Hub, now: i64) -> Result<()> {
-        self.refresh_attention_after(hub, now, "").map(drop)
+        self.refresh_attention_after(hub, now, "")?;
+        self.flush_family_changes(hub)
     }
     pub(crate) fn refresh_attention_after(&self, hub: &Hub, now: i64, after: &str) -> Result<String> {
         let mut conn = self.conn();
diff --git a/crates/hennery-sessions/src/delegation_worker.rs b/crates/hennery-sessions/src/delegation_worker.rs
index c57a06e6..e094c65a 100644
--- a/crates/hennery-sessions/src/delegation_worker.rs
+++ b/crates/hennery-sessions/src/delegation_worker.rs
@@ -55,6 +55,7 @@ fn reconcile_page(state: &AppState, cursors: &mut Reconciliation) -> anyhow::Res
         state
             .store
             .enqueue_delegation_attention(&state.push, &state.delegation_run, &cursors.notifications, now)?;
+    state.store.flush_family_changes(&state.hub)?;
     Ok(())
 }
 async fn drain_page(state: &AppState, cursors: &mut Cursors) -> anyhow::Result<()> {
diff --git a/crates/hennery-sessions/src/family.rs b/crates/hennery-sessions/src/family.rs
new file mode 100644
index 00000000..334bde2e
--- /dev/null
+++ b/crates/hennery-sessions/src/family.rs
@@ -0,0 +1,320 @@
+//! Operator family projection. Reading history never grants an agent capability.
+use crate::{
+    hub::Hub,
+    store::{Store, read_item},
+};
+use anyhow::Result;
+use hennery_proto::rest::SessionItem;
+use hennery_view::api::*;
+use rusqlite::{Connection, OptionalExtension, params};
+
+fn item(conn: &Connection, owner: &str, id: &str) -> Result<Option<SessionItem>> {
+    Ok(conn
+        .query_row(
+            "SELECT id,host_id,agent,cwd,title,lifecycle,activity,failure_reason,presumed_parked,
+                git_branch,git_dirty,model,mode,created_at,last_event_at,hat_id
+             FROM sessions WHERE owner_id = ?1 AND id = ?2 AND lifecycle<>'deleted'
+        AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id=sessions.hat_id)",
+            params![owner, id],
+            read_item,
+        )
+        .optional()?
+        .map(SessionItem::bounded))
+}
+fn link(s: SessionItem) -> FamilyLink {
+    FamilyLink {
+        session_id: s.session_id,
+        title: s.title,
+        agent: s.agent,
+        model: s.model,
+    }
+}
+fn children(
+    conn: &Connection,
+    owner: &str,
+    id: &str,
+    hat: &str,
+    after: &str,
+    limit: u32,
+) -> Result<Vec<(String, bool, Option<String>)>> {
+    let mut stmt = conn.prepare(
+        "SELECT f.child_id,f.detached,f.reason FROM session_families f
+        JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id = ?3 AND c.lifecycle<>'deleted'
+        JOIN sessions p ON p.owner_id = ?1 AND p.id=f.parent_id AND p.hat_id = ?3 AND p.lifecycle<>'deleted'
+        WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.hat_id = ?3 AND f.child_id>?4
+        ORDER BY f.child_id LIMIT ?5",
+    )?;
+    Ok(stmt
+        .query_map(params![owner, id, hat, after, limit], |r| {
+            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
+        })?
+        .collect::<rusqlite::Result<_>>()?)
+}
+fn questions(conn: &Connection, owner: &str, id: &str) -> Result<Vec<FamilyQuestion>> {
+    let mut stmt = conn.prepare(
+        "SELECT pending_id,kind,handling,reason FROM delegation_question_routing
+        WHERE owner_id = ?1 AND session_id = ?2 ORDER BY pending_id LIMIT 256",
+    )?;
+    Ok(stmt
+        .query_map(params![owner, id], |r| {
+            Ok(FamilyQuestion {
+                pending_id: r.get(0)?,
+                kind: r.get(1)?,
+                handling: r.get(2)?,
+                reason: r.get(3)?,
+            })
+        })?
+        .collect::<rusqlite::Result<_>>()?)
+}
+fn counts(conn: &Connection, owner: &str, id: &str) -> Result<(u32, u32, u32)> {
+    Ok(conn.query_row(
+        "SELECT count(*),COALESCE(sum(handling='operator_required'),0),
+        COALESCE(sum(handling IN ('parent_queued','parent_delivered','waiting_config','awaiting_reconciliation')),0)
+        FROM delegation_question_routing WHERE owner_id = ?1 AND session_id = ?2",
+        params![owner, id],
+        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+    )?)
+}
+fn attention(conn: &Connection, owner: &str, s: &SessionItem) -> Result<(bool, u32, u32)> {
+    let (pending, mut operator, parent) = counts(conn, owner, &s.session_id)?;
+    operator += conn.query_row(
+        "SELECT count(*) FROM delegation_attention WHERE owner_id = ?1 AND child_id = ?2
+        AND hat_id = ?3 AND state='open' AND pending_id IS NULL",
+        params![owner, s.session_id, s.hat_id],
+        |r| r.get::<_, u32>(0),
+    )?;
+    if pending == 0 && s.activity.as_deref() == Some("blocked") {
+        operator = operator.max(1);
+    }
+    Ok((pending > 0, operator, parent))
+}
+fn summary_in(conn: &Connection, owner: &str, s: SessionItem) -> Result<SessionSummary> {
+    let (question_waits, operator_attention, parent_handled_questions) = attention(conn, owner, &s)?;
+    let parent: Option<String> = conn
+        .query_row(
+            "SELECT f.parent_id FROM session_families f
+        JOIN sessions p ON p.owner_id = ?1 AND p.id=f.parent_id AND p.hat_id = ?3 AND p.lifecycle<>'deleted'
+        WHERE f.owner_id = ?1 AND f.child_id = ?2 AND f.hat_id = ?3",
+            params![owner, s.session_id, s.hat_id],
+            |r| r.get(0),
+        )
+        .optional()?;
+    let parent = parent.map(|id| item(conn, owner, &id)).transpose()?.flatten().map(link);
+    let (total, active): (u32, u32) = conn.query_row(
+        "SELECT count(*),COALESCE(sum(c.lifecycle='starting'
+        OR c.activity IN ('running','blocked') OR c.open_turn_id IS NOT NULL
+        OR EXISTS(SELECT 1 FROM pending q WHERE q.owner_id = ?1 AND q.session_id=c.id AND q.state='open')
+        OR EXISTS(SELECT 1 FROM session_dispatch_queue q WHERE q.owner_id = ?1 AND q.target_id=c.id
+            AND q.state IN ('queued','waiting_config'))),0)
+        FROM session_families f JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id = ?3
+        WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.hat_id = ?3 AND c.lifecycle<>'deleted'",
+        params![owner, s.session_id, s.hat_id],
+        |r| Ok((r.get(0)?, r.get(1)?)),
+    )?;
+    let mut snippets = Vec::new();
+    for (id, _, _) in children(conn, owner, &s.session_id, &s.hat_id, "", 3)? {
+        if let Some(s) = item(conn, owner, &id)? {
+            snippets.push(link(s));
+        }
+    }
+    let (waiting, family_attention): (u32, u32) = conn.query_row(
+        "SELECT COALESCE(sum(c.activity='blocked' OR EXISTS(SELECT 1 FROM pending p
+            WHERE p.owner_id = ?1 AND p.session_id=c.id AND p.state='open')),0),
+          COALESCE(sum((SELECT count(*) FROM delegation_question_routing q WHERE q.owner_id = ?1
+            AND q.session_id=c.id AND q.handling='operator_required') +
+            (SELECT count(*) FROM delegation_attention a WHERE a.owner_id = ?1 AND a.child_id=c.id
+                AND a.hat_id = ?3 AND a.state='open' AND a.pending_id IS NULL)),0)
+        FROM session_families f
+        JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id = ?3 AND c.lifecycle<>'deleted'
+        WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.hat_id = ?3",
+        params![owner, s.session_id, s.hat_id],
+        |r| Ok((r.get(0)?, r.get(1)?)),
+    )?;
+    let revision = conn.query_row(
+        "SELECT COALESCE(MAX(e.event_id),0) FROM events e WHERE e.owner_id = ?1
+        AND e.kind='family_changed' AND e.applied=1 AND e.session_id IN (SELECT ?2 UNION ALL
+            SELECT f.child_id FROM session_families f JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id = ?3
+            WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.hat_id = ?3)",
+        params![owner, s.session_id, s.hat_id],
+        |r| r.get(0),
+    )?;
+    let family = (parent.is_some() || total > 0).then_some(FamilySummary {
+        revision,
+        parent,
+        child_counts: ChildCounts { total, active, waiting },
+        children: snippets,
+        attention: family_attention,
+    });
+    Ok(SessionSummary {
+        session: s,
+        question_waits,
+        operator_attention,
+        parent_handled_questions,
+        family,
+    })
+}
+impl Store {
+    /// Drain durable invalidations through ordinary owner-parameterized event
+    /// writes. Triggers only mark dirtiness; they do not invent caller authority.
+    pub fn flush_family_changes(&self, hub: &Hub) -> Result<()> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let ids = {
+            let mut stmt = tx.prepare(
+                "SELECT id FROM sessions WHERE owner_id = ?1 AND family_dirty=1
+            AND lifecycle<>'deleted' AND NOT EXISTS(SELECT 1 FROM purged_hats h
+                WHERE h.owner_id = ?1 AND h.hat_id=sessions.hat_id)
+            ORDER BY id LIMIT 128",
+            )?;
+            stmt.query_map([self.owner_id()], |r| r.get::<_, String>(0))?
+                .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        let mut events = Vec::new();
+        for id in ids {
+            let ts = crate::store::stamp_ago(std::time::Duration::ZERO);
+            tx.execute(
+                "INSERT INTO events(owner_id,session_id,kind,body,ts,applied)
+                VALUES (?1,?2,'family_changed',?3,?4,1)",
+                params![self.owner_id(), id, serde_json::json!({}).to_string(), ts],
+            )?;
+            events.push(hennery_proto::rest::EventDto {
+                event_id: tx.last_insert_rowid(),
+                session_id: id.clone(),
+                host_seq: None,
+                kind: "family_changed".into(),
+                body: serde_json::json!({}),
+                ts,
+            });
+            tx.execute(
+                "UPDATE sessions SET family_dirty=0 WHERE owner_id = ?1 AND id = ?2",
+                params![self.owner_id(), id],
+            )?;
+        }
+        tx.commit()?;
+        drop(conn);
+        for event in events {
+            hub.publish(event);
+        }
+        Ok(())
+    }
+    pub fn family_summary(&self, id: &str) -> Result<Option<SessionSummary>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Deferred)?;
+        item(&tx, self.owner_id(), id)?
+            .map(|s| summary_in(&tx, self.owner_id(), s))
+            .transpose()
+    }
+    pub fn family_page(&self, id: &str, after: &str, limit: u32) -> Result<Option<FamilyPage>> {
+        let limit = limit.clamp(1, 100);
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Deferred)?;
+        let Some(s) = item(&tx, self.owner_id(), id)? else {
+            return Ok(None);
+        };
+        let ids = children(&tx, self.owner_id(), id, &s.hat_id, after, limit + 1)?;
+        let next_cursor = (ids.len() > limit as usize).then(|| ids[limit as usize - 1].0.clone());
+        let mut rows = Vec::new();
+        for (child, detached, reason) in ids.into_iter().take(limit as usize) {
+            let Some(child_item) = item(&tx, self.owner_id(), &child)? else {
+                continue;
+            };
+            let mut stmt = tx.prepare(
+                "SELECT operation_id,tool,state,code,turn_id,pending_id FROM session_operations
+                WHERE owner_id = ?1 AND caller_id = ?2 AND child_id = ?3 ORDER BY operation_id DESC LIMIT 16",
+            )?;
+            let operations = stmt
+                .query_map(params![self.owner_id(), id, child], |r| {
+                    Ok(FamilyOperation {
+                        operation_id: r.get(0)?,
+                        tool: r.get(1)?,
+                        state: r.get(2)?,
+                        code: r.get(3)?,
+                        turn_id: r.get(4)?,
+                        pending_id: r.get(5)?,
+                    })
+                })?
+                .collect::<rusqlite::Result<_>>()?;
+            rows.push(FamilyChild {
+                summary: summary_in(&tx, self.owner_id(), child_item)?,
+                routing: if detached { "detached" } else { "active" }.into(),
+                reason,
+                operations,
+                questions: questions(&tx, self.owner_id(), &child)?,
+            });
+        }
+        let routing: Option<(bool, Option<String>)> = tx
+            .query_row(
+                "SELECT f.detached,f.reason FROM session_families f
+            JOIN sessions p ON p.owner_id = ?1 AND p.id=f.parent_id AND p.hat_id = ?3 AND p.lifecycle<>'deleted'
+            WHERE f.owner_id = ?1 AND f.child_id = ?2 AND f.hat_id = ?3",
+                params![self.owner_id(), id, s.hat_id],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .optional()?;
+        Ok(Some(FamilyPage {
+            summary: summary_in(&tx, self.owner_id(), s)?,
+            children: rows,
+            next_cursor,
+            questions: questions(&tx, self.owner_id(), id)?,
+            routing: routing
+                .as_ref()
+                .map(|(d, _)| if *d { "detached" } else { "active" }.into()),
+            reason: routing.and_then(|(_, r)| r),
+        }))
+    }
+    /// Serializes with every acceptance and final handoff via the shared owner
+    /// connection gate. Already handed-off answers remain the first accepted.
+    pub fn take_over_child(&self, id: &str, hub: &Hub) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let valid:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM session_families f
+            JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id=f.hat_id AND c.lifecycle<>'deleted'
+            JOIN sessions p ON p.owner_id = ?1 AND p.id=f.parent_id AND p.hat_id=f.hat_id AND p.lifecycle<>'deleted'
+            WHERE f.owner_id = ?1 AND f.child_id = ?2 AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id=f.hat_id))",
+            params![self.owner_id(),id],|r|r.get(0))?;
+        if !valid {
+            return Ok(false);
+        }
+        tx.execute("UPDATE session_families SET detached=1,reason='operator_takeover' WHERE owner_id = ?1 AND child_id = ?2 AND detached=0",params![self.owner_id(),id])?;
+        tx.execute(
+            "UPDATE delegation_notices SET state='operator_required',reason='operator_takeover'
+            WHERE owner_id = ?1 AND child_id = ?2 AND (state IN ('parent_queued','waiting_config','awaiting_reconciliation')
+                OR (state='operator_required' AND reason='family_detached')
+                OR (kind='question' AND state='parent_delivered'))",
+            params![self.owner_id(), id],
+        )?;
+        tx.execute("DELETE FROM answer_queue WHERE owner_id = ?1 AND session_id = ?2 AND delegation_handoff=0 AND delivered IS NULL
+            AND json_extract(input_origin,'$.kind')='parent'",params![self.owner_id(),id])?;
+        // Ring after commit; the durable events created by triggers are the
+        // cursor source, so the ring itself carries no authority or payload.
+        tx.commit()?;
+        drop(conn);
+        self.flush_family_changes(hub)?;
+        Ok(true)
+    }
+    pub fn operator_waiting_count(&self, hat: Option<&str>) -> Result<u32> {
+        Ok(self.conn().query_row("SELECT count(*) FROM sessions s WHERE s.owner_id = ?1 AND s.lifecycle<>'deleted'
+            AND (?2 IS NULL OR s.hat_id = ?2)
+            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id=s.hat_id)
+            AND (EXISTS(SELECT 1 FROM delegation_question_routing q WHERE q.owner_id = ?1 AND q.session_id=s.id AND q.handling='operator_required')
+              OR EXISTS(SELECT 1 FROM delegation_attention a WHERE a.owner_id = ?1 AND a.child_id=s.id AND a.hat_id=s.hat_id AND a.state='open' AND a.pending_id IS NULL)
+              OR (s.activity='blocked' AND NOT EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = ?1 AND p.session_id=s.id AND p.state='open')))",params![self.owner_id(),hat],|r|r.get(0))?)
+    }
+    /// Both source and parent invalidations are derived from owner-authorized
+    /// current edges. A deleted edge emits its own parent event in migration 21.
+    pub fn family_changed_after(&self, after: i64) -> Result<Vec<String>> {
+        let conn = self.conn();
+        let mut stmt = conn.prepare(
+            "SELECT session_id FROM (
+            SELECT session_id,event_id FROM events WHERE owner_id = ?1 AND event_id>?2 AND applied=1
+            UNION ALL SELECT f.parent_id,e.event_id FROM events e JOIN session_families f ON f.owner_id = ?1 AND f.child_id=e.session_id
+            JOIN sessions p ON p.owner_id = ?1 AND p.id=f.parent_id AND p.hat_id=f.hat_id AND p.lifecycle<>'deleted'
+            JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id=f.hat_id AND c.lifecycle<>'deleted'
+            WHERE e.owner_id = ?1 AND e.event_id>?2 AND e.applied=1)
+            GROUP BY +session_id ORDER BY MAX(event_id)",
+        )?;
+        Ok(stmt
+            .query_map(params![self.owner_id(), after], |r| r.get(0))?
+            .collect::<rusqlite::Result<_>>()?)
+    }
+}
diff --git a/crates/hennery-sessions/src/family.sql b/crates/hennery-sessions/src/family.sql
new file mode 100644
index 00000000..8c605289
--- /dev/null
+++ b/crates/hennery-sessions/src/family.sql
@@ -0,0 +1,84 @@
+-- Sessions migration 21: operator projection, never agent authority.
+ALTER TABLE sessions ADD COLUMN family_dirty INTEGER NOT NULL DEFAULT 0;
+CREATE INDEX family_dirty_ready ON sessions(owner_id,id) WHERE family_dirty=1 AND lifecycle<>'deleted';
+CREATE VIEW delegation_question_routing AS
+SELECT p.owner_id,p.session_id,p.pending_id,p.kind,
+ CASE WHEN EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id=p.owner_id AND a.pending_id=p.pending_id)
+      THEN 'answer_queued'
+      WHEN p.kind='elicitation' AND EXISTS(
+        SELECT 1 FROM delegation_notices n
+        JOIN session_families f ON f.owner_id=p.owner_id AND f.child_id=p.session_id AND f.parent_id=n.parent_id
+        JOIN sessions c ON c.owner_id=p.owner_id AND c.id=p.session_id
+        JOIN sessions r ON r.owner_id=p.owner_id AND r.id=f.parent_id
+        JOIN hat_session_tools g ON g.owner_id=p.owner_id AND g.hat_id=f.hat_id
+        WHERE n.owner_id=p.owner_id AND n.child_id=p.session_id AND n.pending_id=p.pending_id AND n.kind='question'
+          AND n.state IN ('parent_queued','parent_delivered','waiting_config','awaiting_reconciliation')
+          AND f.detached=0 AND c.hat_id=f.hat_id AND r.hat_id=f.hat_id
+          AND c.close_requested=0 AND r.close_requested=0 AND r.lifecycle IN ('starting','active','parked')
+          AND g.delegation_enabled=1 AND g.revision=n.accepted_revision
+          AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id=p.owner_id AND h.hat_id=f.hat_id))
+      THEN COALESCE((SELECT n.state FROM delegation_notices n WHERE n.owner_id=p.owner_id
+          AND n.child_id=p.session_id AND n.pending_id=p.pending_id AND n.kind='question'
+          ORDER BY n.source_event_id DESC LIMIT 1),'parent_queued')
+      ELSE 'operator_required' END AS handling,
+ COALESCE((SELECT a.reason FROM delegation_attention a WHERE a.owner_id=p.owner_id
+    AND a.child_id=p.session_id AND a.pending_id=p.pending_id AND a.state='open' LIMIT 1),
+    CASE WHEN p.kind='permission' THEN 'permission' END) AS reason
+FROM pending p WHERE p.state='open';
+-- Durable invalidations allow ordinary SSE resume/resync to include routing
+-- transitions with no ACP fact (deadline, acknowledgement and takeover).
+CREATE TRIGGER family_view_attention_insert AFTER INSERT ON delegation_attention WHEN NEW.state='open'
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_attention_update AFTER UPDATE OF state,reason ON delegation_attention
+WHEN NEW.state<>OLD.state OR NEW.reason<>OLD.reason
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_edge_insert AFTER INSERT ON session_families
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.parent_id AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_edge_update AFTER UPDATE OF detached,reason ON session_families
+WHEN NEW.detached<>OLD.detached OR NEW.reason IS NOT OLD.reason
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id IN (NEW.parent_id,NEW.child_id) AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_edge_delete AFTER DELETE ON session_families
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=OLD.owner_id AND id IN (OLD.parent_id,OLD.child_id) AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_operation_update AFTER UPDATE OF state,code ON session_operations
+WHEN NEW.state<>OLD.state OR NEW.code IS NOT OLD.code
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_session_state AFTER UPDATE OF lifecycle,activity,model,mode,hat_id ON sessions
+WHEN NEW.lifecycle IS NOT OLD.lifecycle OR NEW.activity IS NOT OLD.activity OR NEW.model IS NOT OLD.model
+ OR NEW.mode IS NOT OLD.mode OR NEW.hat_id IS NOT OLD.hat_id
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND lifecycle<>'deleted'
+ AND (id IN (SELECT parent_id FROM session_families WHERE owner_id=NEW.owner_id AND child_id=NEW.id)
+     OR (id=NEW.id AND delegated_child=1));
+END;
+CREATE TRIGGER family_view_pending_insert AFTER INSERT ON pending
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.session_id AND delegated_child=1 AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_pending_update AFTER UPDATE OF state ON pending WHEN NEW.state<>OLD.state
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.session_id AND delegated_child=1 AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_answer_insert AFTER INSERT ON answer_queue
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.session_id AND delegated_child=1 AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_answer_delete AFTER DELETE ON answer_queue
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=OLD.owner_id AND id=OLD.session_id AND delegated_child=1 AND lifecycle<>'deleted';
+END;
+CREATE TRIGGER family_view_operation_insert AFTER INSERT ON session_operations
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
+END;
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index eb1800c0..d11995bb 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -14,6 +14,7 @@ pub mod delegation_dispatch;
 pub mod delegation_queue;
 pub mod delegation_runtime;
 pub mod delegation_worker;
+pub mod family;
 pub mod forget;
 pub mod hats;
 pub mod hosts;
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index f038a5b8..23426e56 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -374,6 +374,7 @@ const MIGRATIONS: &[&str] = &[
     include_str!("delegation_schema.sql"),
     include_str!("delegation_delivery.sql"),
     include_str!("delegation_attention.sql"),
+    include_str!("family.sql"),
 ];
 
 /// The most distinct (agent session id, roots) pairs a session records
@@ -1235,7 +1236,7 @@ const SESSION_ITEM_COLUMNS: &str = "id, host_id, agent, cwd, title, lifecycle, a
      presumed_parked, git_branch, git_dirty, model, mode, created_at, last_event_at, hat_id";
 
 /// A row of `SESSION_ITEM_COLUMNS` as a list item, as stored.
-fn read_item(r: &rusqlite::Row<'_>) -> rusqlite::Result<SessionItem> {
+pub(crate) fn read_item(r: &rusqlite::Row<'_>) -> rusqlite::Result<SessionItem> {
     Ok(SessionItem {
         session_id: r.get(0)?,
         host_id: r.get(1)?,
diff --git a/crates/hennery-sessions/src/view.rs b/crates/hennery-sessions/src/view.rs
index 87c93a20..d2100e5b 100644
--- a/crates/hennery-sessions/src/view.rs
+++ b/crates/hennery-sessions/src/view.rs
@@ -47,14 +47,14 @@ use axum::routing::get;
 use axum::{Json, Router};
 use futures::StreamExt;
 use hennery_kernel::operator::Authenticated;
-use hennery_proto::rest::{EventDto, SessionItem};
+use hennery_proto::rest::EventDto;
 use hennery_view::api::{
     SessionRemoved, SessionSummary, SummaryPage, TurnContent, WaitingChanged, anchor, parse_anchor,
 };
 use hennery_view::cap::{GROUP_MAX_QUESTIONS, ID_MAX_BYTES};
 use hennery_view::{Body, Fold, Item, group_key, question_id};
 use serde::Deserialize;
-use std::collections::{HashMap, HashSet, VecDeque};
+use std::collections::{HashMap, VecDeque};
 use std::convert::Infallible;
 use std::sync::{Arc, OnceLock};
 use std::time::Duration;
@@ -109,6 +109,8 @@ pub fn router(state: AppState) -> Router {
     let routes = Router::new()
         .route("/api/view/sessions", get(summaries))
         .route("/api/view/sessions/{id}", get(page))
+        .route("/api/view/sessions/{id}/family", get(family))
+        .route("/api/view/sessions/{id}/takeover", axum::routing::post(takeover))
         .route("/api/view/sessions/{id}/questions/{pending_id}", get(question_card))
         .route("/api/view/sessions/{id}/turns/{turn_id}", get(undelivered_turn))
         .route("/api/stream/view/sessions/{id}", get(item_stream))
@@ -132,6 +134,55 @@ fn not_found() -> Response {
     error(StatusCode::NOT_FOUND, "not_found", "no such session")
 }
 
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct FamilyParams {
+    #[serde(default)]
+    after: String,
+    limit: Option<u32>,
+}
+async fn family(State(state): State<AppState>, Path(id): Path<String>, Query(q): Query<FamilyParams>) -> Response {
+    if id.len() > 128 || q.after.len() > 128 {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
+    }
+    match state
+        .store
+        .family_page(&id, &q.after, q.limit.unwrap_or(20).clamp(1, 100))
+    {
+        Ok(Some(page)) => Json(page).into_response(),
+        Ok(None) => not_found(),
+        Err(err) => internal(err),
+    }
+}
+struct Takeover {}
+impl<'de> Deserialize<'de> for Takeover {
+    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
+        let fields = serde_json::Map::<String, serde_json::Value>::deserialize(deserializer)?;
+        if fields.is_empty() {
+            Ok(Self {})
+        } else {
+            Err(serde::de::Error::custom("expected an empty object"))
+        }
+    }
+}
+async fn takeover(
+    State(state): State<AppState>,
+    Path(id): Path<String>,
+    hennery_kernel::json::ApiJson(request): hennery_kernel::json::ApiJson<serde_json::Value>,
+) -> Response {
+    if serde_json::from_value::<Takeover>(request).is_err() {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "expected an empty object");
+    }
+    if id.len() > 128 {
+        return not_found();
+    }
+    match state.store.take_over_child(&id, &state.hub) {
+        Ok(true) => StatusCode::NO_CONTENT.into_response(),
+        Ok(false) => not_found(),
+        Err(err) => internal(err),
+    }
+}
+
 async fn question_card(State(state): State<AppState>, Path((id, pending_id)): Path<(String, String)>) -> Response {
     match stored_question(&state.store, &id, &pending_id) {
         Ok(Some(item)) => Json(item).into_response(),
@@ -152,15 +203,21 @@ async fn summaries(State(state): State<AppState>, Query(params): Query<ListParam
         // meanwhile is sent again rather than missed.
         let revision = state.store.max_event_id()?;
         let page = state.store.list(&filter.query())?;
-        let waiting = state.store.sessions_waiting()?;
         Ok(SummaryPage {
-            sessions: page.sessions.into_iter().map(|s| summary(s, &waiting)).collect(),
+            sessions: page
+                .sessions
+                .into_iter()
+                .map(|s| state.store.family_summary(&s.session_id))
+                .collect::<Result<Vec<_>>>()?
+                .into_iter()
+                .flatten()
+                .collect(),
             next_cursor: page.next_cursor,
             revision,
             epoch: epoch().to_string(),
             // The hat's alone of the filters: the count is the list's
             // whole, not the page's.
-            waiting: state.store.waiting_count(filter.hat())?,
+            waiting: state.store.operator_waiting_count(filter.hat())?,
         })
     };
     match page() {
@@ -169,16 +226,6 @@ async fn summaries(State(state): State<AppState>, Query(params): Query<ListParam
     }
 }
 
-/// A list item as a summary: `waiting` holds the sessions with an open
-/// question.
-fn summary(session: SessionItem, waiting: &HashSet<String>) -> SessionSummary {
-    let question_waits = waiting.contains(&session.session_id);
-    SessionSummary {
-        session,
-        question_waits,
-    }
-}
-
 /// `GET /api/view/sessions/{id}`'s query.
 #[derive(Deserialize)]
 struct PageParams {
@@ -1037,23 +1084,18 @@ async fn list_follow(
     // The count this stream last sent: none yet, so the resume's burst
     // ends with it, whatever changed.
     let mut counted: Option<u32> = None;
-    let mut changed = store.sessions_changed_after(after)?;
+    let mut changed = store.family_changed_after(after)?;
     loop {
         // Every change to what it counts (an activity, a question's state,
         // a hat, a delete) is written with an event of the session's.
         let count = if counted.is_none() || !changed.is_empty() {
-            Some(store.waiting_count(hat)?)
+            Some(store.operator_waiting_count(hat)?)
         } else {
             None
         };
-        let waiting = if changed.is_empty() {
-            HashSet::new()
-        } else {
-            store.sessions_waiting()?
-        };
         let mut messages = Vec::new();
         for session_id in changed {
-            let Some(item) = store.find_session_item(&session_id)? else {
+            let Some(summary) = store.family_summary(&session_id)? else {
                 // Deleted (plan 9a; ACP core §9): its tombstone. It has
                 // no event after its `session_deleted` (triggers refuse
                 // them), so this is sent once, or twice when the delete
@@ -1066,7 +1108,6 @@ async fn list_follow(
                 }
                 continue;
             };
-            let summary = summary(item.bounded(), &waiting);
             if sent.get(&session_id) == Some(&summary) {
                 continue;
             }
@@ -1089,6 +1130,9 @@ async fn list_follow(
         // anything else after the hold.
         let held = tokio::select! {
             () = tx.closed() => return Ok(()),
+            // Routing transitions also occur on deadlines and acknowledgements,
+            // without a host fact to ring the hub. Read their durable events.
+            () = tokio::time::sleep(Duration::from_secs(1)) => false,
             rung = doorbell.recv() => match rung {
                 Err(RecvError::Closed) => return Ok(()),
                 Err(RecvError::Lagged(_)) => false,
@@ -1100,7 +1144,7 @@ async fn list_follow(
         }
         let max = store.max_event_id()?;
         changed = if max > cursor {
-            store.sessions_changed_after(cursor)?
+            store.family_changed_after(cursor)?
         } else {
             Vec::new()
         };
diff --git a/crates/hennery-view/src/api.rs b/crates/hennery-view/src/api.rs
index 455ebb66..8c0284bf 100644
--- a/crates/hennery-view/src/api.rs
+++ b/crates/hennery-view/src/api.rs
@@ -52,6 +52,99 @@ pub struct SessionSummary {
     /// whether or not an answer is queued (a question outside a turn sets
     /// no `blocked` activity).
     pub question_waits: bool,
+    #[serde(default)]
+    pub operator_attention: u32,
+    #[serde(default)]
+    pub parent_handled_questions: u32,
+    #[serde(default, skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub family: Option<FamilySummary>,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct FamilyLink {
+    pub session_id: String,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub title: Option<String>,
+    pub agent: String,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub model: Option<String>,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ChildCounts {
+    pub total: u32,
+    pub active: u32,
+    pub waiting: u32,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct FamilySummary {
+    #[ts(type = "number")]
+    pub revision: i64,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub parent: Option<FamilyLink>,
+    pub child_counts: ChildCounts,
+    /// At most three children; the family route pages the rest.
+    pub children: Vec<FamilyLink>,
+    pub attention: u32,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct FamilyOperation {
+    pub operation_id: String,
+    pub tool: String,
+    pub state: String,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub code: Option<String>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub turn_id: Option<String>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub pending_id: Option<String>,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct FamilyQuestion {
+    pub pending_id: String,
+    pub kind: String,
+    pub handling: String,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub reason: Option<String>,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct FamilyChild {
+    pub summary: SessionSummary,
+    pub routing: String,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub reason: Option<String>,
+    /// Latest 16 receipts, bounded independently of transcript size.
+    pub operations: Vec<FamilyOperation>,
+    pub questions: Vec<FamilyQuestion>,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct FamilyPage {
+    pub summary: SessionSummary,
+    pub children: Vec<FamilyChild>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub next_cursor: Option<String>,
+    pub questions: Vec<FamilyQuestion>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub routing: Option<String>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    #[ts(optional)]
+    pub reason: Option<String>,
 }
 
 /// `GET /api/view/sessions`: a page of summaries, as `GET /api/sessions`
@@ -172,9 +265,14 @@ mod tests {
         let summary = SessionSummary {
             session: session.clone(),
             question_waits: true,
+            operator_attention: 1,
+            parent_handled_questions: 0,
+            family: None,
         };
         let mut expected = serde_json::to_value(&session).unwrap();
         expected["question_waits"] = true.into();
+        expected["operator_attention"] = 1.into();
+        expected["parent_handled_questions"] = 0.into();
         let value = serde_json::to_value(&summary).unwrap();
         assert_eq!(value, expected);
         assert_eq!(serde_json::from_value::<SessionSummary>(value).unwrap(), summary);
diff --git a/crates/hennery-view/src/codegen.rs b/crates/hennery-view/src/codegen.rs
index eadbb02e..416c8dbb 100644
--- a/crates/hennery-view/src/codegen.rs
+++ b/crates/hennery-view/src/codegen.rs
@@ -6,7 +6,10 @@
 //! the pending enums) are `hennery-proto`'s: the TypeScript imports them
 //! from its module, and the schema carries them among its `$defs`.
 
-use crate::api::{ItemPage, ItemRemoved, SessionRemoved, SessionSummary, SummaryPage, TurnContent, WaitingChanged};
+use crate::api::{
+    ChildCounts, FamilyChild, FamilyLink, FamilyOperation, FamilyPage, FamilyQuestion, FamilySummary, ItemPage,
+    ItemRemoved, SessionRemoved, SessionSummary, SummaryPage, TurnContent, WaitingChanged,
+};
 use crate::item::{
     Body, Field, FieldKind, FieldOption, Item, Location, Marker, MarkerKind, Pairing, PairingKind, PermissionOption,
     PlanEntry, Question, Request, Text, ToolCall, ToolContent, Unrecognised,
@@ -23,7 +26,7 @@ pub const TS_PATH: &str = "web/src/generated/view.ts";
 const HEADER: &str = "// Generated by `cargo run -p hennery-view --bin gen-view`. Do not edit.\n";
 
 /// What the module takes from the protocol's (`hennery-proto`'s `TS_PATH`).
-const IMPORTS: &str = "import type { PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord } from \"./protocol\";\n";
+const IMPORTS: &str = "import type { InputOrigin, PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord } from \"./protocol\";\n";
 
 /// `gen-view`'s exit statuses (the fleet's rule: each has a test).
 pub const EXIT_OK: u8 = 0;
@@ -84,7 +87,14 @@ pub fn render_schema() -> String {
         ItemRemoved,
         SessionRemoved,
         TurnContent,
-        WaitingChanged
+        WaitingChanged,
+        FamilyLink,
+        ChildCounts,
+        FamilySummary,
+        FamilyOperation,
+        FamilyQuestion,
+        FamilyChild,
+        FamilyPage
     );
     let defs: std::collections::BTreeMap<String, serde_json::Value> =
         generator.take_definitions(true).into_iter().collect();
@@ -132,7 +142,20 @@ pub fn render_ts() -> String {
         ItemPage,
     );
     out.push_str(SESSION_SUMMARY_TS);
-    add!(SummaryPage, ItemRemoved, SessionRemoved, TurnContent, WaitingChanged);
+    add!(
+        SummaryPage,
+        ItemRemoved,
+        SessionRemoved,
+        TurnContent,
+        WaitingChanged,
+        FamilyLink,
+        ChildCounts,
+        FamilySummary,
+        FamilyOperation,
+        FamilyQuestion,
+        FamilyChild,
+        FamilyPage
+    );
     out.push_str(STREAM_EVENTS_TS);
     out
 }
@@ -165,7 +188,7 @@ export type SessionSummary = SessionItem & {
  * whether or not an answer is queued (a question outside a turn sets
  * no `blocked` activity).
  */
-question_waits: boolean, };
+question_waits: boolean, operator_attention: number, parent_handled_questions: number, family?: FamilySummary, };
 ";
 
 /// `SESSION_SUMMARY_TS` names every field of the summary: one more and
@@ -175,6 +198,9 @@ fn session_summary_ts_is_whole(summary: SessionSummary) {
     let SessionSummary {
         session: _,
         question_waits: _,
+        operator_attention: _,
+        parent_handled_questions: _,
+        family: _,
     } = summary;
 }
 
diff --git a/crates/hennery-view/src/fold.rs b/crates/hennery-view/src/fold.rs
index d9049df3..9f993502 100644
--- a/crates/hennery-view/src/fold.rs
+++ b/crates/hennery-view/src/fold.rs
@@ -41,7 +41,8 @@ pub const SILENT_UPDATES: [&str; 5] = [
 
 /// Event kinds that make no item: the session's own state, shown by the
 /// session list and the header.
-pub const SILENT_EVENTS: [&str; 6] = [
+pub const SILENT_EVENTS: [&str; 7] = [
+    "family_changed",
     "session_started",
     "turn_started",
     "config_applied",
@@ -359,7 +360,19 @@ impl Fold {
                         truncated |= cut_off;
                     }
                 }
-                self.create_ordinal(event, Body::UserTurn { content, truncated });
+                let origin = event
+                    .body
+                    .get("origin")
+                    .cloned()
+                    .and_then(|value| serde_json::from_value(value).ok());
+                self.create_ordinal(
+                    event,
+                    Body::UserTurn {
+                        content,
+                        origin,
+                        truncated,
+                    },
+                );
             }
             Err(_) => self.unrecognised(event, "user_turn"),
         }
diff --git a/crates/hennery-view/src/item.rs b/crates/hennery-view/src/item.rs
index 838dff83..8bf042e6 100644
--- a/crates/hennery-view/src/item.rs
+++ b/crates/hennery-view/src/item.rs
@@ -39,6 +39,9 @@ pub enum Body {
     /// as attachments (`GET /api/attachments/{sha256}`).
     UserTurn {
         content: Vec<StoredBlock>,
+        #[serde(default, skip_serializing_if = "Option::is_none")]
+        #[ts(optional)]
+        origin: Option<hennery_proto::plugin::InputOrigin>,
         /// A text block went past `TEXT_MAX_BYTES` and was cut there.
         #[serde(default, skip_serializing_if = "std::ops::Not::not")]
         #[ts(optional, as = "Option<bool>")]
diff --git a/crates/hennery-view/src/lib.rs b/crates/hennery-view/src/lib.rs
index d276d0f4..c87c1d9d 100644
--- a/crates/hennery-view/src/lib.rs
+++ b/crates/hennery-view/src/lib.rs
@@ -24,4 +24,4 @@ pub use item::*;
 /// The fold's rules' version. Ordinal ids and versions follow the rules:
 /// raise it whenever they change what an event makes, so a client holding
 /// items of the old rules resyncs.
-pub const FOLD_VERSION: u32 = 1;
+pub const FOLD_VERSION: u32 = 2;
diff --git a/nix/package.nix b/nix/package.nix
index 1893e503..b2854c45 100644
--- a/nix/package.nix
+++ b/nix/package.nix
@@ -20,7 +20,10 @@ let
       ../crates/hennery-sessions/src/delegation_schema.sql
       ../crates/hennery-sessions/src/delegation_delivery.sql
       ../crates/hennery-sessions/src/delegation_attention.sql
+      ../crates/hennery-sessions/src/family.sql
+      ../crates/hennery-sessions/tests/fixtures/undo_family.sql
       ../crates/hennery-sessions/tests/fixtures/undo_delegation.sql
+      ../crates/hennery-testkit/tests/fixtures/delegation-codex-acp-1.13.0.jsonl
       (lib.fileset.maybeMissing ../adapters/manifest.json)
       (lib.fileset.maybeMissing ../crates/hennery-host/manifest.json)
     ];
diff --git a/schema/hennery-view.schema.json b/schema/hennery-view.schema.json
index 72878a72..bb52e2b6 100644
--- a/schema/hennery-view.schema.json
+++ b/schema/hennery-view.schema.json
@@ -1,5 +1,30 @@
 {
   "$defs": {
+    "ChildCounts": {
+      "properties": {
+        "active": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "total": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "waiting": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        }
+      },
+      "required": [
+        "total",
+        "active",
+        "waiting"
+      ],
+      "type": "object"
+    },
     "ContextEntry": {
       "additionalProperties": false,
       "properties": {
@@ -26,6 +51,214 @@
       ],
       "type": "object"
     },
+    "FamilyChild": {
+      "properties": {
+        "operations": {
+          "description": "Latest 16 receipts, bounded independently of transcript size.",
+          "items": {
+            "$ref": "#/$defs/FamilyOperation"
+          },
+          "type": "array"
+        },
+        "questions": {
+          "items": {
+            "$ref": "#/$defs/FamilyQuestion"
+          },
+          "type": "array"
+        },
+        "reason": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "routing": {
+          "type": "string"
+        },
+        "summary": {
+          "$ref": "#/$defs/SessionSummary"
+        }
+      },
+      "required": [
+        "summary",
+        "routing",
+        "operations",
+        "questions"
+      ],
+      "type": "object"
+    },
+    "FamilyLink": {
+      "properties": {
+        "agent": {
+          "type": "string"
+        },
+        "model": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "session_id": {
+          "type": "string"
+        },
+        "title": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "required": [
+        "session_id",
+        "agent"
+      ],
+      "type": "object"
+    },
+    "FamilyOperation": {
+      "properties": {
+        "code": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "operation_id": {
+          "type": "string"
+        },
+        "pending_id": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "state": {
+          "type": "string"
+        },
+        "tool": {
+          "type": "string"
+        },
+        "turn_id": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "required": [
+        "operation_id",
+        "tool",
+        "state"
+      ],
+      "type": "object"
+    },
+    "FamilyPage": {
+      "properties": {
+        "children": {
+          "items": {
+            "$ref": "#/$defs/FamilyChild"
+          },
+          "type": "array"
+        },
+        "next_cursor": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "questions": {
+          "items": {
+            "$ref": "#/$defs/FamilyQuestion"
+          },
+          "type": "array"
+        },
+        "reason": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "routing": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "summary": {
+          "$ref": "#/$defs/SessionSummary"
+        }
+      },
+      "required": [
+        "summary",
+        "children",
+        "questions"
+      ],
+      "type": "object"
+    },
+    "FamilyQuestion": {
+      "properties": {
+        "handling": {
+          "type": "string"
+        },
+        "kind": {
+          "type": "string"
+        },
+        "pending_id": {
+          "type": "string"
+        },
+        "reason": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "required": [
+        "pending_id",
+        "kind",
+        "handling"
+      ],
+      "type": "object"
+    },
+    "FamilySummary": {
+      "properties": {
+        "attention": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "child_counts": {
+          "$ref": "#/$defs/ChildCounts"
+        },
+        "children": {
+          "description": "At most three children; the family route pages the rest.",
+          "items": {
+            "$ref": "#/$defs/FamilyLink"
+          },
+          "type": "array"
+        },
+        "parent": {
+          "anyOf": [
+            {
+              "$ref": "#/$defs/FamilyLink"
+            },
+            {
+              "type": "null"
+            }
+          ]
+        },
+        "revision": {
+          "format": "int64",
+          "type": "integer"
+        }
+      },
+      "required": [
+        "revision",
+        "child_counts",
+        "children",
+        "attention"
+      ],
+      "type": "object"
+    },
     "Field": {
       "description": "One field of an elicitation's form.",
       "properties": {
@@ -215,6 +448,16 @@
               "const": "user_turn",
               "type": "string"
             },
+            "origin": {
+              "anyOf": [
+                {
+                  "$ref": "#/$defs/InputOrigin"
+                },
+                {
+                  "type": "null"
+                }
+              ]
+            },
             "truncated": {
               "description": "A text block went past `TEXT_MAX_BYTES` and was cut there.",
               "type": "boolean"
@@ -909,6 +1152,16 @@
             "null"
           ]
         },
+        "family": {
+          "anyOf": [
+            {
+              "$ref": "#/$defs/FamilySummary"
+            },
+            {
+              "type": "null"
+            }
+          ]
+        },
         "git_branch": {
           "description": "The branch checked out in `cwd`, as the host last reported it.",
           "type": [
@@ -950,6 +1203,18 @@
             "null"
           ]
         },
+        "operator_attention": {
+          "default": 0,
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "parent_handled_questions": {
+          "default": 0,
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
         "presumed_parked": {
           "description": "Parked only because its host has been offline past the threshold\n(ACP core §5.3); the host may still be running it.",
           "type": "boolean"
diff --git a/web/src/generated/view.ts b/web/src/generated/view.ts
index 2db4d9a4..fd135c6a 100644
--- a/web/src/generated/view.ts
+++ b/web/src/generated/view.ts
@@ -1,6 +1,6 @@
 // Generated by `cargo run -p hennery-view --bin gen-view`. Do not edit.
 
-import type { PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord } from "./protocol";
+import type { InputOrigin, PendingKind, PendingReason, PendingState, SessionCatalog, SessionItem, StoredBlock, StartupRecord } from "./protocol";
 
 export type Item = { id: string, 
 /**
@@ -16,7 +16,7 @@ turn_id?: string,
  * When the item's first event was stored (RFC 3339, UTC): a merged
  * message keeps its first chunk's.
  */
-ts: string, } & ({ "kind": "plugin_context", startup: StartupRecord, } | { "kind": "user_turn", content: Array<StoredBlock>, 
+ts: string, } & ({ "kind": "plugin_context", startup: StartupRecord, } | { "kind": "user_turn", content: Array<StoredBlock>, origin?: InputOrigin, 
 /**
  * A text block went past `TEXT_MAX_BYTES` and was cut there.
  */
@@ -26,7 +26,7 @@ truncated?: boolean, } | { "kind": "message" } & Text | { "kind": "thinking" } &
  */
 truncated?: boolean, } | { "kind": "question" } & Question | { "kind": "marker" } & Marker | { "kind": "unrecognised" } & Unrecognised);
 
-export type Body = { "kind": "plugin_context", startup: StartupRecord, } | { "kind": "user_turn", content: Array<StoredBlock>, 
+export type Body = { "kind": "plugin_context", startup: StartupRecord, } | { "kind": "user_turn", content: Array<StoredBlock>, origin?: InputOrigin, 
 /**
  * A text block went past `TEXT_MAX_BYTES` and was cut there.
  */
@@ -219,7 +219,7 @@ export type SessionSummary = SessionItem & {
  * whether or not an answer is queued (a question outside a turn sets
  * no `blocked` activity).
  */
-question_waits: boolean, };
+question_waits: boolean, operator_attention: number, parent_handled_questions: number, family?: FamilySummary, };
 
 export type SummaryPage = { sessions: Array<SessionSummary>, 
 /**
@@ -257,6 +257,28 @@ content: Array<StoredBlock>, };
 
 export type WaitingChanged = { count: number, };
 
+export type FamilyLink = { session_id: string, title?: string, agent: string, model?: string, };
+
+export type ChildCounts = { total: number, active: number, waiting: number, };
+
+export type FamilySummary = { revision: number, parent?: FamilyLink, child_counts: ChildCounts, 
+/**
+ * At most three children; the family route pages the rest.
+ */
+children: Array<FamilyLink>, attention: number, };
+
+export type FamilyOperation = { operation_id: string, tool: string, state: string, code?: string, turn_id?: string, pending_id?: string, };
+
+export type FamilyQuestion = { pending_id: string, kind: string, handling: string, reason?: string, };
+
+export type FamilyChild = { summary: SessionSummary, routing: string, reason?: string, 
+/**
+ * Latest 16 receipts, bounded independently of transcript size.
+ */
+operations: Array<FamilyOperation>, questions: Array<FamilyQuestion>, };
+
+export type FamilyPage = { summary: SessionSummary, children: Array<FamilyChild>, next_cursor?: string, questions: Array<FamilyQuestion>, routing?: string, reason?: string, };
+
 /**
  * `GET /api/stream/view/sessions/{id}`: each SSE event and its data.
  * `catalog_changed` carries the session's whole catalogue, after the
```

### Task 2, step 1: reproduce pinned Codex metadata at the actual MCP boundary

Run the pinned metadata regression before implementation; expected RED is a real HTTP 400 before the handler. This reproduces the actual pinned Codex trace.

```diff
diff --git a/crates/hennery-testkit/tests/delegation_mcp.rs b/crates/hennery-testkit/tests/delegation_mcp.rs
index be62c7e0..a854e826 100644
--- a/crates/hennery-testkit/tests/delegation_mcp.rs
+++ b/crates/hennery-testkit/tests/delegation_mcp.rs
@@ -16,6 +16,48 @@ use reqwest::{Client, StatusCode};
 use serde_json::{Value, json};
 use std::sync::Arc;
 const ORIGIN: &str = "https://hennery.example";
+
+#[tokio::test]
+async fn pinned_codex_tool_metadata_does_not_change_caller_authority() {
+    let h = Harness::new().await;
+    let call = json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
+        "name":"session_spawn","arguments":{},"_meta":{"progressToken":1,"callId":"call",
+            "threadId":"thread","itemId":"item","x-codex-turn-metadata":{"turn_id":"turn"}}}});
+    let actual = h.rpc(call.clone()).await;
+    assert_eq!(actual["result"]["structuredContent"]["code"], "session_starting");
+    h.state
+        .store
+        .ingest(
+            "session",
+            1,
+            &hennery_proto::frames::SessionBody::session_started("r", "agent"),
+        )
+        .unwrap();
+    let actual = h.rpc(call.clone()).await;
+    assert_eq!(actual["result"]["structuredContent"]["code"], "invalid_arguments");
+    for meta in [json!([]), json!(null), json!("x"), json!({"large":"x".repeat(16*1024)})] {
+        let mut wrong = call.clone();
+        wrong["params"]["_meta"] = meta;
+        let response = h.post(serde_json::to_vec(&wrong).unwrap()).await;
+        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
+        assert_eq!(response.json::<Value>().await.unwrap()["error"]["code"], -32602);
+    }
+    // Keys decode exactly once, including escapes, and duplicate keys remain
+    // refused by the transport before metadata can reach a handler.
+    let bytes = serde_json::to_string(&call).unwrap();
+    let escaped = bytes.replace("\"_meta\"", "\"\\u005fmeta\"");
+    assert_eq!(h.post(escaped).await.status(), StatusCode::OK);
+    let duplicate = bytes.replace("\"_meta\":", "\"_meta\":{},\"\\u005fmeta\":");
+    assert_eq!(h.post(duplicate).await.status(), StatusCode::BAD_REQUEST);
+    let wrong_case = bytes.replace("\"_meta\"", "\"_META\"");
+    assert_eq!(h.post(wrong_case).await.status(), StatusCode::BAD_REQUEST);
+    let mut forged = call;
+    forged["params"]["caller"] = "other".into();
+    assert_eq!(
+        h.post(serde_json::to_vec(&forged).unwrap()).await.status(),
+        StatusCode::BAD_REQUEST
+    );
+}
 struct Harness {
     _dir: tempfile::TempDir,
     state: AppState,
```

### Task 2, step 2: accept bounded transport metadata without caller authority

Run all delegation_mcp tests; expected GREEN including exact metadata shape and differential refusals. Probe metadata admission/budget and strict unknown-field guards.

```diff
diff --git a/crates/hennery-sessions/src/builtin.rs b/crates/hennery-sessions/src/builtin.rs
index 3ea4cab2..d8329b8a 100644
--- a/crates/hennery-sessions/src/builtin.rs
+++ b/crates/hennery-sessions/src/builtin.rs
@@ -236,6 +236,9 @@ enum IconTheme {
 struct Call {
     name: String,
     arguments: serde_json::Map<String, Value>,
+    /// MCP metadata is transport data, never caller identity or arguments.
+    #[serde(default, rename = "_meta")]
+    metadata: serde_json::Map<String, Value>,
 }
 
 async fn handle(
@@ -376,6 +379,9 @@ async fn handle(
             let Ok(call) = serde_json::from_value::<Call>(params) else {
                 return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
             };
+            if serde_json::to_vec(&call.metadata).map_or(true, |bytes| bytes.len() > 16 * 1024) {
+                return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
+            }
             let active = state.app.hub.is_ready(context.host_id())
                 && state
                     .app
```

### Task 3, step 1: specify family UI, source labels, mobile navigation and card open

Run focused Vitest family/provenance/row/status tests before implementation; expected RED. Keep browser checks distinct from fixture-free provider acceptance.

```diff
diff --git a/web/e2e/family.spec.ts b/web/e2e/family.spec.ts
new file mode 100644
index 00000000..1f6c3233
--- /dev/null
+++ b/web/e2e/family.spec.ts
@@ -0,0 +1,184 @@
+// Real embedded assets and emitted notification worker, with deterministic
+// family API boundaries. The live adapter matrix is a separate release gate.
+import { expect, test, type BrowserContext, type Route } from '@playwright/test'
+import { startCollector, type Collector } from './collector'
+import { workerHarness } from './push-fixture'
+import type { FamilyPage, SessionSummary, Item } from '../src/generated/view'
+
+let collector: Collector
+test.beforeAll(async () => { collector = await startCollector() })
+test.afterAll(async () => { await collector?.stop() })
+
+function summary(id: string): SessionSummary {
+  return {
+    session_id: id, title: id === 'parent' ? 'Coordinator' : 'Parser worker', host_id: 'host1', agent: id === 'parent' ? 'claude' : 'codex',
+    model: id === 'parent' ? 'planner' : 'reasoner', cwd: id === 'parent' ? '/srv/project' : '/srv/worker', hat_id: 'hat1',
+    lifecycle: 'active', activity: id === 'parent' ? 'idle' : 'blocked', presumed_parked: false,
+    created_at: '2026-10-02T09:00:00Z', last_event_at: '2026-10-02T10:00:00Z', question_waits: id !== 'parent',
+    operator_attention: 0, parent_handled_questions: id === 'parent' ? 0 : 1,
+    family: { revision: 1, parent: id === 'parent' ? undefined : { session_id: 'parent', title: 'Coordinator', agent: 'claude' },
+      children: id === 'parent' ? [{ session_id: 'child', title: 'Parser worker', agent: 'codex' }] : [],
+      child_counts: { total: id === 'parent' ? 2 : 0, active: id === 'parent' ? 2 : 0, waiting: id === 'parent' ? 1 : 0 }, attention: 0 },
+  }
+}
+
+async function fixture(context: BrowserContext, statusOnly = false) {
+  let statusOutstanding = statusOnly, attentionReads = 0
+  let detached = false, familyReads = 0, itemReads = 0, answers = 0
+  const listStreams: Route[] = [], itemStreams: Route[] = [], unmatched: string[] = [], held: Route[] = []
+  const current = (id: string) => {
+    const s = summary(id)
+    if (statusOnly) {
+      s.family!.attention = statusOutstanding ? 1 : 0
+      if (id === 'child') { s.lifecycle = 'failed'; s.activity = undefined; s.question_waits = false; s.operator_attention = statusOutstanding ? 1 : 0; s.parent_handled_questions = 0 }
+    }
+    if (detached && id === 'child') { s.operator_attention = 1; s.parent_handled_questions = 0 }
+    return s
+  }
+  const questions = () => [{ pending_id: 'question1', kind: 'elicitation', handling: detached ? 'operator_required' : 'parent_delivered', reason: detached ? 'operator_takeover' : undefined }]
+  const family = (id: string, more: boolean): FamilyPage => ({
+    summary: current(id), questions: id === 'child' ? questions() : [], routing: id === 'child' ? detached ? 'detached' : 'active' : undefined,
+    reason: detached && id === 'child' ? 'operator_takeover' : undefined,
+    children: id === 'parent' ? [{ summary: { ...current('child'), session_id: more ? 'child2' : 'child', title: more ? 'Second worker' : 'Parser worker' },
+      routing: detached ? 'detached' : 'active', reason: detached ? 'operator_takeover' : undefined,
+      operations: [{ operation_id: 'operation1', tool: 'spawn', state: 'accepted' }], questions: more ? [] : questions() }] : [],
+    next_cursor: id === 'parent' && !more ? 'child' : undefined,
+  })
+  const question: Item = { id: 'question:question1', version: 1, ts: '2026-10-02T10:00:00Z', kind: 'question', pending_id: 'question1', question_kind: 'elicitation',
+    request: { type: 'elicitation', message: 'Which parser?', fields: [{ key: 'parser', label: 'Parser', field_kind: 'text' }], form_supported: true }, answerable: true, state: 'open', answered: false }
+  const json = (route: Route, value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
+  await context.route('**/api/**', async route => {
+    const url = new URL(route.request().url()), path = url.pathname
+    if (path === '/api/capabilities') return json(route, { mode: 'full', features: [] })
+    if (path === '/api/hosts') return json(route, [{ host_id: 'host1', name: 'worker host', connected: true, capabilities: [] }])
+    if (path === '/api/hats') return json(route, [])
+    if (path === '/api/view/sessions') return json(route, { sessions: [current('parent'), current('child')], epoch: 'list1', revision: 1, waiting: statusOutstanding || detached ? 1 : 0 })
+    if (path === '/api/stream/sessions') { listStreams.push(route); held.push(route); return }
+    if (path === '/api/delegation/attention') {
+      attentionReads++
+      return json(route, statusOutstanding ? [{ id: 'attention1', child_id: 'child', hat_id: 'hat1', reason: 'child_failed', pending_id: null }] : detached ? [{ id: 'question-attention', child_id: 'child', hat_id: 'hat1', reason: 'operator_takeover', pending_id: 'question1' }] : [])
+    }
+    if (path === '/api/delegation/attention/attention1/acknowledge') {
+      expect(route.request().method()).toBe('POST'); statusOutstanding = false
+      const stream = listStreams.pop()
+      if (stream) await stream.fulfill({ contentType: 'text/event-stream', body: `event: session_upsert\ndata: ${JSON.stringify(current('parent'))}\nid: list1:2\n\nevent: session_upsert\ndata: ${JSON.stringify(current('child'))}\nid: list1:3\n\nevent: waiting_changed\ndata: {"count":0}\nid: list1:4\n\n` })
+      return route.fulfill({ status: 204 })
+    }
+    const match = /^\/api\/(?:view\/)?sessions\/(parent|child|child2)(.*)$/.exec(path)
+    if (match) {
+      const [, id, suffix] = match
+      if (suffix === '/family') { familyReads++; return json(route, family(id, url.searchParams.has('after'))) }
+      if (suffix === '/takeover') {
+        expect(route.request().postDataJSON()).toEqual({}); detached = true
+        const stream = listStreams.pop()
+        if (stream) await stream.fulfill({ contentType: 'text/event-stream', body: `event: session_upsert\ndata: ${JSON.stringify(current('child'))}\nid: list1:2\n\nevent: waiting_changed\ndata: {"count":1}\nid: list1:3\n\n` })
+        return route.fulfill({ status: 204 })
+      }
+      if (suffix === '/catalog') return json(route, { session_id: id, config_options: [], commands: [] })
+      if (suffix === '/questions/question1') return json(route, question)
+      if (suffix === '/pending/question1/answer') { answers++; return json(route, { pending_id: 'question1', request_id: 'answer1' }, 202) }
+      if (suffix === '' && path.startsWith('/api/view/')) { itemReads++; return json(route, { items: id === 'child' ? [question] : [], older: false, epoch: 'items1', revision: 1 }) }
+      if (suffix === '') return json(route, { ...current(id), pending: [] })
+    }
+    if (path.startsWith('/api/stream/view/sessions/')) { itemStreams.push(route); held.push(route); return }
+    // PWA foreground subscription checks may run on browsers allowing workers.
+    if (path === '/api/push/subscriptions') return json(route, [])
+    if (path === '/api/push/vapid') return json(route, { public_key: '' })
+    unmatched.push(path); return json(route, { code: 'not_found', message: 'unhandled fixture route' }, 404)
+  })
+  return { unmatched, attentionReads: () => attentionReads, familyReads: () => familyReads, itemReads: () => itemReads, answers: () => answers,
+    resync: async () => { const stream = itemStreams.pop(); expect(stream).toBeDefined(); await stream!.fulfill({ contentType: 'text/event-stream', body: 'event: resync_required\ndata: {}\n\n' }) },
+    release: async () => { for (const route of held) await route.abort().catch(() => {}) },
+  }
+}
+
+for (const width of [1280, 390]) test(`family navigation, takeover, attention and resync at ${width}px`, async ({ browser }) => {
+  const context = await browser.newContext({ viewport: { width, height: 844 } })
+  const f = await fixture(context)
+  try {
+    const page = await context.newPage(); await page.goto(`${collector.origin}/sessions/parent`)
+    await expect(page.locator('.session-head .badge')).toHaveText('Waiting on children')
+    const family = page.getByRole('region', { name: 'Session family', exact: true })
+    await family.locator('summary').click()
+    const child = family.getByRole('article', { name: 'Parser worker', exact: true })
+    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'spawn: accepted', 'Parent is handling']) {
+      await expect(child.getByText(text, { exact: true })).toBeVisible()
+    }
+    await family.getByRole('button', { name: 'Load more children', exact: true }).click()
+    await expect(family.getByRole('link', { name: 'Second worker', exact: true })).toBeVisible()
+    await child.getByRole('link', { name: 'Open question', exact: true }).click()
+    await expect(page).toHaveURL(`${collector.origin}/sessions/child?pending=question1`)
+    const card = page.getByRole('region', { name: 'Question from Codex', exact: true })
+    await expect(card.getByText('Parent is handling', { exact: true })).toBeVisible()
+    await expect(card.getByRole('button', { name: 'Decline', exact: true })).toBeEnabled()
+    await expect(page.getByRole('status', { name: '1 waiting on you', exact: true })).toHaveCount(0)
+    await family.locator('summary').click()
+    const take = family.getByRole('button', { name: 'Take over', exact: true })
+    if (width === 390) expect((await take.boundingBox())!.height).toBeGreaterThanOrEqual(44)
+    await take.click()
+    await expect(card.getByText('Operator answer required', { exact: true })).toBeVisible()
+    await expect(card.getByText('operator_takeover', { exact: true })).toBeVisible()
+    await expect(page.locator('.session-head .badge')).toHaveText('Waiting on you')
+    await expect(page.getByRole('status', { name: '1 waiting on you', exact: true }).first()).toBeVisible()
+    const before = f.familyReads()
+    await f.resync()
+    await expect.poll(f.familyReads).toBeGreaterThan(before)
+    await expect(card.getByText('Operator answer required', { exact: true })).toBeVisible()
+    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
+    const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
+    await expect(prompt).toBeInViewport()
+    expect(f.answers()).toBe(0)
+    expect(f.unmatched).toEqual([])
+  } finally { await f.release(); await context.close() }
+})
+
+test('phone notification opens the child card and never sends a lock-screen answer', async ({ browser }) => {
+  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
+  const f = await fixture(context)
+  try {
+    const page = await context.newPage(); await page.goto(`${collector.origin}/sessions/parent`)
+    await expect(page.locator('.session-head .badge')).toHaveText('Waiting on children')
+    const code = await (await context.request.get(`${collector.origin}/sw.js`)).text()
+    const harness = workerHarness(code, undefined, { origin: collector.origin, clients: {
+      matchAll: async () => [], openWindow: async target => { await page.goto(collector.origin + target); return null },
+    } })
+    const target = '/sessions/child?pending=question1'
+    await harness.push(JSON.stringify({ title: 'Needs your answer', body: 'Open the child card', tag: 'child', url: target }))
+    expect(harness.notifications).toHaveLength(1)
+    expect(harness.notifications[0].options).not.toHaveProperty('actions')
+    expect(f.answers()).toBe(0)
+    await harness.click(target)
+    await expect(page).toHaveURL(collector.origin + target)
+    const card = page.getByRole('region', { name: 'Question from Codex', exact: true })
+    await expect(card.getByText('Which parser?', { exact: true })).toBeVisible()
+    await expect(card.getByText('Parent is handling', { exact: true })).toBeVisible()
+    await expect(card.getByRole('textbox', { name: 'Parser', exact: true })).toBeInViewport()
+    expect(f.answers()).toBe(0)
+    expect(f.unmatched).toEqual([])
+  } finally { await f.release(); await context.close() }
+})
+
+
+test('phone status-only child attention can be acknowledged without an answer card', async ({ browser }) => {
+  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
+  const f = await fixture(context, true)
+  try {
+    const page = await context.newPage(); await page.goto(`${collector.origin}/sessions/parent`)
+    const family = page.getByRole('region', { name: 'Session family', exact: true })
+    await family.locator('summary').click()
+    const attention = page.getByRole('region', { name: 'Delegation attention', exact: true })
+    await expect(attention.getByText('child_failed', { exact: true })).toBeVisible()
+    await expect(attention.getByRole('link', { name: 'Parser worker', exact: true })).toHaveAttribute('href', '/sessions/child')
+    await expect(page.getByRole('status', { name: '1 waiting on you', exact: true }).first()).toBeVisible()
+    const before = f.familyReads()
+    const acknowledge = attention.getByRole('button', { name: 'Acknowledge child_failed for Parser worker', exact: true })
+    expect((await acknowledge.boundingBox())!.height).toBeGreaterThanOrEqual(44)
+    await acknowledge.click()
+    await expect(attention.getByText('child_failed', { exact: true })).toHaveCount(0)
+    await expect(page.getByRole('status', { name: '1 waiting on you', exact: true })).toHaveCount(0)
+    await expect.poll(f.familyReads).toBeGreaterThan(before)
+    expect(f.attentionReads()).toBeGreaterThan(0)
+    expect(f.answers()).toBe(0)
+    expect(f.unmatched).toEqual([])
+  } finally { await f.release(); await context.close() }
+})
diff --git a/web/e2e/sessions.spec.ts b/web/e2e/sessions.spec.ts
index 03a9fe51..f1d534ef 100644
--- a/web/e2e/sessions.spec.ts
+++ b/web/e2e/sessions.spec.ts
@@ -153,7 +153,7 @@ for (const width of [1280, 390]) {
     test('the agent’s permission question is answered from its card', async () => {
       const card = page.getByRole('region', { name: 'Question from Claude', exact: true })
       await expect(card.getByText('Write notes.txt', { exact: true })).toBeVisible({ timeout: 15_000 })
-      await expect(page.locator('.session-head .badge')).toHaveText('Waiting on a question')
+      await expect(page.locator('.session-head .badge')).toHaveText('Waiting on you')
       await card.getByRole('button', { name: 'Allow', exact: true }).click()
       await expect(card.getByText('Answered', { exact: true })).toBeVisible()
       await expect(card.getByRole('button')).toHaveCount(0)
diff --git a/web/src/api/attention.test.ts b/web/src/api/attention.test.ts
new file mode 100644
index 00000000..8fc15a2f
--- /dev/null
+++ b/web/src/api/attention.test.ts
@@ -0,0 +1,21 @@
+import { expect, it } from 'vitest'
+import { routed, json } from '../test-stream'
+import { attentionPage, acknowledgeAttention } from './attention'
+
+const row = { id: 'a1', child_id: 'child', hat_id: 'hat', reason: 'child_failed', pending_id: null }
+it('encodes the attention hat, opaque cursor and acknowledgement id, preserving explicit question nullability', async () => {
+  const rows = [row, { ...row, id: 'q1', pending_id: 'question' }]
+  const s = routed(c => c.method === 'POST' ? new Response(null, { status: 204 }) : json(rows))
+  expect(await attentionPage(s.client, 'hat/?&', 'opaque/a&b')).toEqual(rows)
+  await acknowledgeAttention(s.client, 'attention/a?b')
+  expect(s.calls.map(c => [c.method, c.path])).toEqual([
+    ['GET', '/api/delegation/attention?hat_id=hat%2F%3F%26&after=opaque%2Fa%26b'],
+    ['POST', '/api/delegation/attention/attention%2Fa%3Fb/acknowledge'],
+  ])
+  expect(s.fetch.mock.calls[1][1]?.body).toBe('{}')
+})
+
+it.each([{}, [null], [{ ...row, pending_id: undefined }], [{ ...row, hat_id: 4 }], Array(101).fill(row)])('refuses malformed or unbounded attention response %j', async body => {
+  const s = routed(() => json(body))
+  await expect(attentionPage(s.client, 'hat')).rejects.toThrow('Invalid delegation attention response.')
+})
diff --git a/web/src/api/family.test.ts b/web/src/api/family.test.ts
new file mode 100644
index 00000000..0b766ecb
--- /dev/null
+++ b/web/src/api/family.test.ts
@@ -0,0 +1,14 @@
+import { expect, it } from 'vitest'
+import { routed, json } from '../test-stream'
+import { familyPage, takeOver } from './view'
+
+it('encodes family ids and cursors, and posts explicit empty takeover JSON', async () => {
+  const s = routed(c => c.method === 'POST' ? new Response(null, { status: 204 }) : json({}))
+  await familyPage(s.client, 'a/b?c', 'child/a&b')
+  await takeOver(s.client, 'a/b?c')
+  expect(s.calls.map(c => [c.method, c.path])).toEqual([
+    ['GET', '/api/view/sessions/a%2Fb%3Fc/family?after=child%2Fa%26b&limit=20'],
+    ['POST', '/api/view/sessions/a%2Fb%3Fc/takeover'],
+  ])
+  expect(s.fetch.mock.calls[1][1]?.body).toBe('{}')
+})
diff --git a/web/src/components/FamilyPanel.attention.test.tsx b/web/src/components/FamilyPanel.attention.test.tsx
new file mode 100644
index 00000000..2bfbbb69
--- /dev/null
+++ b/web/src/components/FamilyPanel.attention.test.tsx
@@ -0,0 +1,143 @@
+import { act, render, screen, waitFor, within } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { expect, it } from 'vitest'
+import type { OperatorAttention } from '../api/attention'
+import type { FamilyPage } from '../generated/view'
+import { familyPage, parent } from '../test-family'
+import { json, routed } from '../test-stream'
+import FamilyPanel from './FamilyPanel'
+
+const status: OperatorAttention = { id: 'status/1', child_id: 'child', hat_id: 'hat1', reason: 'child_failed', pending_id: null }
+const question: OperatorAttention = { ...status, id: 'question1', reason: 'permission_required', pending_id: 'q/1' }
+const ownPage = (): FamilyPage => {
+  const page = familyPage(); delete page.next_cursor
+  page.summary = { ...parent, family: { ...parent.family!, attention: 1 } }
+  return page
+}
+const region = () => screen.getByRole('region', { name: 'Delegation attention' })
+const show = (s: ReturnType<typeof routed>, page = ownPage()) => render(<FamilyPanel id={page.summary.session_id} summary={page.summary} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
+
+it('acknowledges status explicitly, keeps question attention linked to its card, and rereads canonical state after 204', async () => {
+  let acknowledged = false, finish!: (response: Response) => void
+  const ack = new Promise<Response>(resolve => { finish = resolve })
+  const page = ownPage()
+  page.children.push({ ...page.children[0], summary: { ...page.children[0].summary, session_id: 'foreign-child', hat_id: 'other-hat', title: 'foreign title' } })
+  const s = routed(c => {
+    if (c.method === 'POST') return ack.then(response => { acknowledged = true; return response })
+    if (c.path.startsWith('/api/delegation/attention')) return json([
+      ...(acknowledged ? [] : [status]), question,
+      { ...status, id: 'foreign', hat_id: 'foreign', reason: 'foreign_secret' },
+      { ...status, id: 'unrelated', child_id: 'unrelated', reason: 'unrelated_secret' },
+      { ...status, id: 'foreign-child-row', child_id: 'foreign-child', reason: 'cross_hat_child_secret' },
+    ])
+    return json(page)
+  })
+  show(s, page)
+  expect(await screen.findByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(within(region()).getAllByRole('link', { name: 'Review parser' })[0]).toHaveAttribute('href', '/sessions/child')
+  expect(within(region()).getByRole('link', { name: 'Open question' })).toHaveAttribute('href', '/sessions/child?pending=q%2F1')
+  expect(within(region()).getAllByRole('button', { name: /^Acknowledge / })).toHaveLength(1)
+  expect(screen.queryByText('foreign_secret', { exact: true })).not.toBeInTheDocument()
+  expect(screen.queryByText('unrelated_secret', { exact: true })).not.toBeInTheDocument()
+  expect(within(region()).queryByText('cross_hat_child_secret', { exact: true })).not.toBeInTheDocument()
+  expect(within(region()).queryByRole('link', { name: 'foreign title' })).not.toBeInTheDocument()
+  const before = s.calls.length
+  await userEvent.click(within(region()).getByRole('button', { name: 'Acknowledge child_failed for Review parser' }))
+  expect(screen.getByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(s.calls).toHaveLength(before + 1)
+  expect(s.calls.at(-1)?.path).toBe('/api/delegation/attention/status%2F1/acknowledge')
+  await act(async () => { finish(new Response(null, { status: 204 })); await ack })
+  await waitFor(() => expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument())
+  expect(s.calls.filter(c => c.path.includes('/family'))).toHaveLength(2)
+  expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention?'))).toHaveLength(2)
+  expect(within(region()).queryByRole('button', { name: /^Acknowledge / })).not.toBeInTheDocument()
+  expect(within(region()).getByText('permission_required', { exact: true })).toBeInTheDocument()
+})
+
+it('pages at most 100 attention records per click, using the last raw id even when unrelated rows are hidden', async () => {
+  const rows = Array.from({ length: 100 }, (_, i) => ({ ...status, id: `opaque/${i}`, child_id: 'unrelated' }))
+  const s = routed(c => c.path.startsWith('/api/delegation/attention') ? json(c.path.includes('after=') ? [status] : rows) : json(ownPage()))
+  show(s)
+  const more = await screen.findByRole('button', { name: 'Load more attention' })
+  expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention'))).toHaveLength(1)
+  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
+  await userEvent.click(more)
+  expect(await screen.findByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(s.calls.at(-1)?.path).toBe('/api/delegation/attention?hat_id=hat1&after=opaque%2F99')
+  expect(screen.queryByRole('button', { name: 'Load more attention' })).not.toBeInTheDocument()
+})
+
+it('reads no attention for zero counts but supports an orphan deep link with status-only attention', async () => {
+  const s = routed(c => c.path.startsWith('/api/delegation/attention') ? json([{ ...status, child_id: 'orphan' }]) : json(familyPage()))
+  const view = show(s, familyPage())
+  await screen.findByRole('link', { name: 'Review parser' })
+  expect(s.calls.filter(c => c.path.startsWith('/api/delegation/attention'))).toHaveLength(0)
+  view.unmount()
+  const page: FamilyPage = { summary: { ...parent, session_id: 'orphan', operator_attention: 1, family: undefined }, children: [], questions: [] }
+  const orphan = routed(c => c.path.startsWith('/api/delegation/attention') ? json([{ ...status, child_id: 'orphan' }]) : json(page))
+  render(<FamilyPanel id="orphan" hosts={new Map()} resync={0} />, { wrapper: orphan.wrapper })
+  expect(await screen.findByRole('button', { name: 'Acknowledge child_failed for orphan' })).toBeEnabled()
+})
+
+it('shows read/ack failures without resolving attention or refreshing the family on a refused ack', async () => {
+  let reads = 0
+  const s = routed(c => {
+    if (c.method === 'POST') return json({ code: 'refused', message: 'Could not acknowledge' }, 409)
+    if (c.path.startsWith('/api/delegation/attention')) return ++reads === 1 ? json({ code: 'offline', message: 'Read unavailable' }, 503) : json([status])
+    return json(ownPage())
+  })
+  show(s)
+  expect(await screen.findByRole('alert')).toHaveTextContent('Read unavailable')
+  await userEvent.click(screen.getByRole('button', { name: 'Retry attention' }))
+  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge child_failed for Review parser' }))
+  expect(await screen.findByRole('alert')).toHaveTextContent('Could not acknowledge')
+  expect(screen.getByText('child_failed', { exact: true })).toBeInTheDocument()
+  expect(s.calls.filter(c => c.path.includes('/family'))).toHaveLength(1)
+})
+
+it('hides cached scope data immediately and ignores an old hat response after the new hat loads', async () => {
+  let nextHat = false, oldRead!: (response: Response) => void
+  const late = new Promise<Response>(resolve => { oldRead = resolve })
+  const old = ownPage()
+  const next: FamilyPage = { summary: { ...parent, hat_id: 'next-hat', operator_attention: 1, family: undefined }, children: [], questions: [] }
+  let oldReads = 0
+  const s = routed(c => {
+    if (c.path.startsWith('/api/delegation/attention')) {
+      if (c.path.includes('hat_id=hat1')) return ++oldReads === 1 ? json([status]) : late
+      return json([{ ...status, id: 'new', child_id: 'parent', hat_id: 'next-hat', reason: 'new_hat_attention' }])
+    }
+    return json(nextHat ? next : old)
+  })
+  const view = show(s, old)
+  await screen.findByText('child_failed', { exact: true })
+  view.rerender(<FamilyPanel id="parent" summary={old.summary} hosts={new Map()} resync={1} />)
+  await waitFor(() => expect(oldReads).toBe(2))
+  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
+  nextHat = true
+  view.rerender(<FamilyPanel id="parent" summary={next.summary} hosts={new Map()} resync={1} />)
+  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
+  expect(await screen.findByText('new_hat_attention', { exact: true })).toBeInTheDocument()
+  await act(async () => { oldRead(json([status])); await late })
+  expect(screen.queryByText('child_failed', { exact: true })).not.toBeInTheDocument()
+  expect(screen.getByText('new_hat_attention', { exact: true })).toBeInTheDocument()
+})
+
+it('does not refresh a new selection when an old status acknowledgement completes late', async () => {
+  let finish!: (response: Response) => void
+  const late = new Promise<Response>(resolve => { finish = resolve })
+  const page = ownPage()
+  const other: FamilyPage = { summary: { ...parent, session_id: 'other', operator_attention: 1, family: undefined }, children: [], questions: [] }
+  const s = routed(c => {
+    if (c.method === 'POST') return late
+    if (c.path.startsWith('/api/delegation/attention')) return json([status, { ...status, id: 'other-status', child_id: 'other', reason: 'other_failed' }])
+    return json(c.path.includes('/other/') ? other : page)
+  })
+  const view = show(s, page)
+  await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge child_failed for Review parser' }))
+  view.rerender(<FamilyPanel id="other" summary={other.summary} hosts={new Map()} resync={0} />)
+  await screen.findByText('other_failed', { exact: true })
+  const before = s.calls.length
+  await act(async () => { finish(new Response(null, { status: 204 })); await late })
+  expect(screen.getByText('other_failed', { exact: true })).toBeInTheDocument()
+  expect(s.calls).toHaveLength(before)
+})
diff --git a/web/src/components/FamilyPanel.test.tsx b/web/src/components/FamilyPanel.test.tsx
new file mode 100644
index 00000000..4590d739
--- /dev/null
+++ b/web/src/components/FamilyPanel.test.tsx
@@ -0,0 +1,97 @@
+import { act, render, screen, waitFor } from '@testing-library/react'
+import userEvent from '@testing-library/user-event'
+import { describe, expect, it } from 'vitest'
+import { json, routed } from '../test-stream'
+import FamilyPanel from './FamilyPanel'
+
+import { parent, familyPage } from '../test-family'
+
+describe('FamilyPanel', () => {
+  it('pages real child metadata and pending-card links without claiming accepted work succeeded', async () => {
+    const s = routed(c => json(familyPage(c.path.includes('after=child') ? 'child2' : 'child')))
+    render(<FamilyPanel id="parent" summary={parent} hosts={new Map([['h1', 'worker host']])} resync={0} />, { wrapper: s.wrapper })
+    expect(await screen.findByRole('link', { name: 'Review parser' })).toHaveAttribute('href', '/sessions/child')
+    for (const text of ['Codex', 'reasoner', 'worker host', '/srv/worker', 'active', 'blocked', 'spawn: accepted', 'Parent is handling']) {
+      expect(screen.getByText(text, { exact: true })).toBeInTheDocument()
+    }
+    expect(screen.getByRole('link', { name: 'Open question' })).toHaveAttribute('href', '/sessions/child?pending=q%2F1')
+    await userEvent.click(screen.getByRole('button', { name: 'Load more children' }))
+    expect(await screen.findAllByRole('link', { name: 'Review parser' })).toHaveLength(2)
+    expect(s.calls[1].path).toBe('/api/view/sessions/parent/family?after=child&limit=20')
+    expect(screen.queryByText('Completed successfully', { exact: true })).not.toBeInTheDocument()
+  })
+
+  it('takes over explicitly then rereads server state, and shows fallback reason', async () => {
+    let detached = false
+    const s = routed(c => {
+      if (c.method === 'POST') { detached = true; return new Response(null, { status: 204 }) }
+      const page = familyPage(); delete page.next_cursor
+      if (detached) { page.children[0].routing = 'detached'; page.children[0].reason = 'operator_takeover'; page.children[0].questions[0].handling = 'operator_required' }
+      return json(page)
+    })
+    render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
+    await userEvent.click(await screen.findByRole('button', { name: 'Take over Review parser' }))
+    expect(await screen.findByText('operator_takeover', { exact: true })).toBeInTheDocument()
+    expect(screen.getByText('Operator answer required', { exact: true })).toBeInTheDocument()
+    expect(s.calls.filter(c => c.method === 'POST')).toEqual([expect.objectContaining({ path: '/api/view/sessions/child/takeover' })])
+    expect(screen.queryByRole('button', { name: 'Take over Review parser' })).not.toBeInTheDocument()
+  })
+
+  it('refreshes on resync and family changes, keeps a failed takeover honest, and never fetches per token', async () => {
+    const s = routed(c => c.method === 'POST' ? json({ code: 'conflict', message: 'Try again' }, 409) : json(familyPage()))
+    const { rerender } = render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
+    await screen.findByRole('link', { name: 'Review parser' })
+    rerender(<FamilyPanel id="parent" summary={{ ...parent, last_event_at: 'later' }} hosts={new Map()} resync={0} />)
+    await waitFor(() => expect(s.calls).toHaveLength(1))
+    rerender(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={1} />)
+    await waitFor(() => expect(s.calls).toHaveLength(2))
+    await userEvent.click(screen.getByRole('button', { name: 'Take over Review parser' }))
+    expect(await screen.findByRole('alert')).toHaveTextContent('Try again')
+    expect(screen.getByText('Parent is handling', { exact: true })).toBeInTheDocument()
+  })
+})
+
+it('drops cached family links immediately when a scope change removes the family', async () => {
+  const s = routed(() => json(familyPage()))
+  const { rerender } = render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
+  await screen.findByRole('link', { name: 'Review parser' })
+  rerender(<FamilyPanel id="parent" summary={{ ...parent, family: undefined, hat_id: 'other-hat' }} hosts={new Map()} resync={0} />)
+  expect(screen.queryByRole('region', { name: 'Session family' })).not.toBeInTheDocument()
+  expect(screen.queryByRole('link', { name: 'Review parser' })).not.toBeInTheDocument()
+})
+
+it('ignores a late family read from the previous selected session', async () => {
+  let finish!: (response: Response) => void
+  const old = new Promise<Response>(resolve => { finish = resolve })
+  const received: string[] = []
+  const other = { ...parent, session_id: 'other' }
+  const s = routed(c => c.path.includes('/parent/') ? old : json({ ...familyPage('other-child'), summary: other }))
+  const { rerender } = render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} onPage={page => received.push(page.summary.session_id)} />, { wrapper: s.wrapper })
+  rerender(<FamilyPanel id="other" summary={other} hosts={new Map()} resync={0} onPage={page => received.push(page.summary.session_id)} />)
+  await waitFor(() => expect(received).toEqual(['other']))
+  await act(async () => { finish(json(familyPage())); await old })
+  await waitFor(() => expect(screen.getByRole('link', { name: 'Review parser' })).toHaveAttribute('href', '/sessions/other-child'))
+  expect(received).toEqual(['other'])
+})
+
+it('names queued answers and unknown routing states without claiming delivery', async () => {
+  const page = familyPage()
+  page.children[0].questions = [
+    { pending_id: 'answer', kind: 'elicitation', handling: 'answer_queued' },
+    { pending_id: 'new', kind: 'elicitation', handling: 'future_routing_state' },
+  ]
+  const s = routed(() => json(page))
+  render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
+  expect(await screen.findByText('Answer queued', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('future_routing_state', { exact: true })).toBeInTheDocument()
+})
+
+it('labels the saturated receipt history as latest 16 and preserves truthful receipt states', async () => {
+  const page = familyPage()
+  const states = ['accepted', 'waiting_config', 'dispatching', 'delivered', 'done', 'failed', 'cancelled', 'future_state']
+  page.children[0].operations = Array.from({ length: 16 }, (_, i) => ({ operation_id: `op${i}`, tool: `tool${i}`, state: states[i % states.length] }))
+  const s = routed(() => json(page))
+  render(<FamilyPanel id="parent" summary={parent} hosts={new Map()} resync={0} />, { wrapper: s.wrapper })
+  expect(await screen.findByText('Latest 16 operations', { exact: true })).toBeInTheDocument()
+  for (let i = 0; i < states.length; i++) expect(screen.getByText(`tool${i}: ${states[i]}`, { exact: true })).toBeInTheDocument()
+})
diff --git a/web/src/components/SessionLink.test.tsx b/web/src/components/SessionLink.test.tsx
index e04b2227..b9f7cab7 100644
--- a/web/src/components/SessionLink.test.tsx
+++ b/web/src/components/SessionLink.test.tsx
@@ -29,6 +29,8 @@ function summary(id: string, patch: Partial<SessionSummary> = {}): SessionSummar
     created_at: '2026-10-01T00:00:00.000Z',
     last_event_at: '2026-10-02T10:00:00.000Z',
     question_waits: false,
+    operator_attention: patch.question_waits || patch.activity === 'blocked' ? 1 : 0,
+    parent_handled_questions: 0,
     title: `Task ${id}`,
     ...patch,
   }
diff --git a/web/src/components/SessionList.test.tsx b/web/src/components/SessionList.test.tsx
index 3e3f6966..4577dd0d 100644
--- a/web/src/components/SessionList.test.tsx
+++ b/web/src/components/SessionList.test.tsx
@@ -29,6 +29,8 @@ function summary(id: string, patch: Partial<SessionSummary> = {}): SessionSummar
     created_at: '2026-10-01T00:00:00.000Z',
     last_event_at: '2026-10-02T10:00:00.000Z',
     question_waits: false,
+    operator_attention: patch.question_waits || patch.activity === 'blocked' ? 1 : 0,
+    parent_handled_questions: 0,
     ...patch,
   }
 }
@@ -326,7 +328,7 @@ describe('the waiting count', () => {
     const { container } = render(<App fetchImpl={s.fetch} />)
     await waitFor(() => expect(document.title).toBe('(1) hennery'))
     const bar = container.querySelector('.mtopbar') as HTMLElement
-    expect(within(bar).getByRole('status', { name: '1 waiting on a question' })).toHaveTextContent('1')
+    expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
   })
 
 
@@ -346,12 +348,12 @@ describe('the waiting count', () => {
     render(<App fetchImpl={s.fetch} />)
     await waitFor(() => expect(document.title).toBe('(2) hennery'))
     const rail = await screen.findByRole('complementary', { name: 'Views' })
-    expect(within(rail).getByRole('status', { name: '2 waiting on a question' })).toHaveTextContent('2')
+    expect(within(rail).getByRole('status', { name: '2 waiting on you' })).toHaveTextContent('2')
     await waitFor(() => expect(s.streams).toHaveLength(1))
     act(() => s.streams[0].event('session_upsert', summary('blocked', { activity: 'running' }), 'e1:2'))
     act(() => s.streams[0].event('session_upsert', summary('asks'), 'e1:3'))
     await waitFor(() => expect(document.title).toBe('hennery'))
-    expect(within(rail).queryByRole('status', { name: /waiting on a question/ })).not.toBeInTheDocument()
+    expect(within(rail).queryByRole('status', { name: /waiting on you/ })).not.toBeInTheDocument()
   })
 
   // The fallback (pages with no `waiting`): the hat's rows, a search's
@@ -371,7 +373,7 @@ describe('the waiting count', () => {
     const bar = container.querySelector('.mtopbar') as HTMLElement
     const counted = () => {
       expect(document.title).toBe('(1) hennery')
-      expect(within(bar).getByRole('status', { name: '1 waiting on a question' })).toHaveTextContent('1')
+      expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
     }
     await waitFor(() => expect(names(region)).toEqual(['calm', 'asks']))
     counted()
@@ -423,7 +425,7 @@ describe('the waiting count', () => {
     const bar = container.querySelector('.mtopbar') as HTMLElement
     const counted = () => {
       expect(document.title).toBe('(3) hennery')
-      expect(within(bar).getByRole('status', { name: '3 waiting on a question' })).toHaveTextContent('3')
+      expect(within(bar).getByRole('status', { name: '3 waiting on you' })).toHaveTextContent('3')
     }
     await waitFor(() => expect(names(region)).toEqual(['calm', 'asks']))
     counted()
@@ -463,7 +465,7 @@ describe('the waiting count', () => {
     )
     expect(names(region)).toEqual([])
     expect(document.title).toBe('(3) hennery')
-    expect(within(bar).getByRole('status', { name: '3 waiting on a question' })).toHaveTextContent('3')
+    expect(within(bar).getByRole('status', { name: '3 waiting on you' })).toHaveTextContent('3')
   })
 
   it('follows waiting_changed, never an upsert, while a search is set', async () => {
@@ -913,3 +915,15 @@ describe('the list stream, as the list shows it', () => {
     expect(names(region)).toEqual(['a'])
   })
 })
+
+it('counts status-only operator attention while excluding parent-handled questions, with truthful badge words', async () => {
+  at('/sessions')
+  const s = server({ list: () => page([
+    summary('failed', { lifecycle: 'failed', question_waits: false, operator_attention: 1 }),
+    summary('handled', { question_waits: true, operator_attention: 0, parent_handled_questions: 1 }),
+  ]) })
+  const { container } = render(<App fetchImpl={s.fetch} />)
+  await waitFor(() => expect(document.title).toBe('(1) hennery'))
+  const bar = container.querySelector('.mtopbar') as HTMLElement
+  expect(within(bar).getByRole('status', { name: '1 waiting on you' })).toHaveTextContent('1')
+})
diff --git a/web/src/components/SessionMenu.family.test.tsx b/web/src/components/SessionMenu.family.test.tsx
new file mode 100644
index 00000000..6bbe66b7
--- /dev/null
+++ b/web/src/components/SessionMenu.family.test.tsx
@@ -0,0 +1,18 @@
+import { fireEvent, render, screen, within } from '@testing-library/react'
+import { expect, it, vi } from 'vitest'
+import { routed, json } from '../test-stream'
+import { parent } from '../test-family'
+import SessionMenu from './SessionMenu'
+
+it('warns about retained family copies before deleting, with authorized encoded related links', async () => {
+  const family = { ...parent.family!, children: [{ session_id: 'child/1', title: '<b>Worker</b>', agent: 'codex' }] }
+  const s = routed(() => json({}))
+  render(<SessionMenu id="parent" family={family} lifecycle="parked" canPark={false} onDeleted={vi.fn()} />, { wrapper: s.wrapper })
+  fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+  fireEvent.click(screen.getByRole('button', { name: 'Delete session' }))
+  const dialog = screen.getByRole('dialog', { name: 'Delete this session?' })
+  expect(within(dialog).getByText('Copies already delivered to related sessions remain in their transcripts. Those sessions are kept.', { exact: true })).toBeInTheDocument()
+  expect(within(dialog).getByRole('link', { name: '<b>Worker</b>' })).toHaveAttribute('href', '/sessions/child%2F1')
+  expect(dialog.querySelector('b')).toBeNull()
+  expect(s.calls).toHaveLength(0)
+})
diff --git a/web/src/components/SessionRow.test.tsx b/web/src/components/SessionRow.test.tsx
index 72a8aad9..4b186401 100644
--- a/web/src/components/SessionRow.test.tsx
+++ b/web/src/components/SessionRow.test.tsx
@@ -20,6 +20,8 @@ function summary(patch: Partial<SessionSummary> = {}): SessionSummary {
     created_at: '2026-10-01T00:00:00.000Z',
     last_event_at: '2026-10-02T10:00:00.000Z',
     question_waits: false,
+    operator_attention: patch.question_waits || patch.activity === 'blocked' ? 1 : 0,
+    parent_handled_questions: 0,
     ...patch,
   }
 }
@@ -74,8 +76,8 @@ describe('SessionRow', () => {
 
   it('marks a session waiting on a question with words', () => {
     render(<SessionRow now={NOW} session={summary({ question_waits: true })} selected={false} />)
-    expect(screen.getByRole('img', { name: 'Waiting on a question' })).toHaveClass('led-attn')
-    expect(screen.getByText('Waiting on a question')).toBeInTheDocument()
+    expect(screen.getByRole('img', { name: 'Waiting on you' })).toHaveClass('led-attn')
+    expect(screen.getByText('Waiting on you')).toBeInTheDocument()
   })
 
   it('animates a running session', () => {
@@ -113,3 +115,14 @@ describe('SessionRow', () => {
     expect(screen.getByRole('img', { name: 'Idle' })).toHaveAttribute('title', 'Idle')
   })
 })
+
+it('adds family links outside the session link, preserving native navigation', () => {
+  const family = { revision: 1, parent: { session_id: 'p/1', title: 'Coordinator', agent: 'claude' }, children: [{ session_id: 'c/1', title: 'Worker', agent: 'codex' }], child_counts: { total: 1, active: 1, waiting: 0 }, attention: 0 }
+  render(<SessionRow now={NOW} session={summary({ family })} selected={false} />)
+  const parentLink = screen.getByRole('link', { name: 'Parent: Coordinator' })
+  const childLink = screen.getByRole('link', { name: 'Child: Worker' })
+  expect(parentLink).toHaveAttribute('href', '/sessions/p%2F1')
+  expect(childLink).toHaveAttribute('href', '/sessions/c%2F1')
+  expect(parentLink.closest('.sess')).toBeNull()
+  expect(childLink.closest('.sess')).toBeNull()
+})
diff --git a/web/src/components/items/QuestionCard.test.tsx b/web/src/components/items/QuestionCard.test.tsx
index 35518eeb..7529378b 100644
--- a/web/src/components/items/QuestionCard.test.tsx
+++ b/web/src/components/items/QuestionCard.test.tsx
@@ -659,3 +659,22 @@ describe('answering through the book', () => {
     expect(t.posts()).toHaveLength(2)
   })
 })
+
+it('keeps parent-handled elicitation directly answerable and shows the server fallback reason', async () => {
+  const t = setup()
+  const q = elicitation({ fields: [], form_supported: true })
+  const env: ItemEnv = { sessionId: SESSION, agent: 'Codex', answers: t.book,
+    familyQuestions: [{ pending_id: 'e1', kind: 'elicitation', handling: 'parent_queued' }] }
+  const view = show(q, env)
+  expect(screen.getByText('Parent is handling', { exact: true })).toBeInTheDocument()
+  expect(screen.queryByText('Needs your answer', { exact: true })).not.toBeInTheDocument()
+  expect(screen.getByText('Waiting for an answer', { exact: true })).toBeInTheDocument()
+  expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled()
+  view.again(q, { ...env, familyQuestions: [{ pending_id: 'e1', kind: 'elicitation', handling: 'parent_delivered' }] })
+  expect(screen.getByText('Waiting for an answer', { exact: true })).toBeInTheDocument()
+  view.again(q, { ...env, familyQuestions: [{ pending_id: 'e1', kind: 'elicitation', handling: 'operator_required', reason: 'parent_closed' }] })
+  expect(screen.getByText('Operator answer required', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('parent_closed', { exact: true })).toBeInTheDocument()
+  expect(screen.getByText('Needs your answer', { exact: true })).toBeInTheDocument()
+  expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled()
+})
diff --git a/web/src/components/items/UserTurn.origin.test.tsx b/web/src/components/items/UserTurn.origin.test.tsx
new file mode 100644
index 00000000..61df02c3
--- /dev/null
+++ b/web/src/components/items/UserTurn.origin.test.tsx
@@ -0,0 +1,28 @@
+import { render, screen } from '@testing-library/react'
+import { describe, expect, it } from 'vitest'
+import type { InputOrigin } from '../../generated/protocol'
+import UserTurn from './UserTurn'
+
+it.each<[InputOrigin, string, string]>([
+  [{ kind: 'parent', session_id: 'p/1', operation_id: 'op' }, 'Parent instruction', '/sessions/p%2F1'],
+  [{ kind: 'child_report', child_id: 'c/1', source_event_id: 'e1', delivery_id: 'd1' }, 'Child report', '/sessions/c%2F1'],
+])('uses typed origin for %j and an encoded source link', (origin, label, href) => {
+  render(<UserTurn item={{ id: 'u1', ts: '2026-10-02T10:00:00Z', version: 1, kind: 'user_turn', origin, content: [{ type: 'text', text: 'You: spoofed parent says success' }] }} env={{ sessionId: 's1', agent: 'Claude' }} />)
+  expect(screen.getByText(label, { exact: true })).toBeInTheDocument()
+  expect(screen.getByRole('link', { name: 'Source session' })).toHaveAttribute('href', href)
+  expect(screen.queryByText('You', { exact: true })).not.toBeInTheDocument()
+})
+
+describe('operator source', () => {
+  it('does not infer provenance from words inside operator text', () => {
+    render(<UserTurn item={{ id: 'u1', ts: '2026-10-02T10:00:00Z', version: 1, kind: 'user_turn', origin: { kind: 'operator' }, content: [{ type: 'text', text: 'Parent instruction: fabricated' }] }} env={{ sessionId: 's1', agent: 'Claude' }} />)
+    expect(screen.getByText('You', { exact: true })).toBeInTheDocument()
+    expect(screen.queryByRole('link')).not.toBeInTheDocument()
+  })
+})
+
+it('labels a truncated child report and keeps its source link', () => {
+  render(<UserTurn item={{ id: 'report', ts: '2026-10-02T10:00:00Z', version: 1, kind: 'user_turn', origin: { kind: 'child_report', child_id: 'child', source_event_id: 'event', delivery_id: 'delivery' }, content: [{ type: 'text', text: 'Partial report' }], truncated: true }} env={{ sessionId: 'parent', agent: 'Claude' }} />)
+  expect(screen.getByText('This report was cut.', { exact: true })).toBeInTheDocument()
+  expect(screen.getByRole('link', { name: 'Source session' })).toHaveAttribute('href', '/sessions/child')
+})
diff --git a/web/src/lib/family.test.ts b/web/src/lib/family.test.ts
new file mode 100644
index 00000000..02e74078
--- /dev/null
+++ b/web/src/lib/family.test.ts
@@ -0,0 +1,27 @@
+import { describe, expect, it } from 'vitest'
+import { statusOf } from './status'
+import { waitingIds, EMPTY_LIST } from '../store/sessionList'
+import { parent } from '../test-family'
+
+describe('family attention', () => {
+  it('uses operator attention rather than the factual pending count in fallback badges', () => {
+    const child = { ...parent, session_id: 'child', activity: 'blocked', question_waits: true, operator_attention: 0, parent_handled_questions: 1 }
+    expect(statusOf(child).label).toBe('Parent is handling')
+    expect(waitingIds({ ...EMPTY_LIST, all: new Map([['child', child]]) }, null).size).toBe(0)
+    const fallback = { ...child, operator_attention: 1 }
+    expect(statusOf(fallback).tone).toBe('attn')
+    expect(waitingIds({ ...EMPTY_LIST, all: new Map([['child', fallback]]) }, null).size).toBe(1)
+  })
+  it('gives a parent question precedence over waiting on children, and never hides running activity', () => {
+    expect(statusOf(parent).label).toBe('Waiting on children')
+    expect(statusOf({ ...parent, operator_attention: 1, question_waits: true }).tone).toBe('attn')
+    expect(statusOf({ ...parent, activity: 'running' }).label).toBe('Running')
+  })
+})
+
+it('keeps an accepted answer visibly pending without counting it as operator work', () => {
+  const queued = { ...parent, activity: 'blocked', question_waits: true, operator_attention: 0, parent_handled_questions: 0 }
+  expect(statusOf(queued).label).toBe('Answer pending delivery')
+  expect(statusOf(queued).tone).toBe('wait')
+  expect(waitingIds({ ...EMPTY_LIST, all: new Map([['parent', queued]]) }, null).size).toBe(0)
+})
diff --git a/web/src/screens/NewSession.test.tsx b/web/src/screens/NewSession.test.tsx
index 55ed771b..30268b71 100644
--- a/web/src/screens/NewSession.test.tsx
+++ b/web/src/screens/NewSession.test.tsx
@@ -564,6 +564,8 @@ describe('in the app', () => {
       created_at: '2026-10-01T00:00:00.000Z',
       last_event_at: '2026-10-02T10:00:00.000Z',
       question_waits: false,
+        operator_attention: 0,
+        parent_handled_questions: 0,
     }
   }
 
diff --git a/web/src/screens/Session.family.test.tsx b/web/src/screens/Session.family.test.tsx
new file mode 100644
index 00000000..9c211051
--- /dev/null
+++ b/web/src/screens/Session.family.test.tsx
@@ -0,0 +1,28 @@
+import { act, render, screen, waitFor } from '@testing-library/react'
+import { expect, it } from 'vitest'
+import { json, liveStream, routed } from '../test-stream'
+import { familyPage } from '../test-family'
+import SessionView from './Session'
+
+it('loads family state for a notification deep link with no list summary, and invalidates it on resync', async () => {
+  const streams: ReturnType<typeof liveStream>[] = []
+  const page = familyPage(); page.questions = []
+  const s = routed(call => {
+    const path = new URL(call.path, 'http://h').pathname
+    if (path === '/api/view/sessions/parent/family') return json(page)
+    if (path === '/api/view/sessions/parent') return json({ items: [], older: false, epoch: 'e1', revision: 1 })
+    if (path === '/api/sessions/parent') return json({ ...page.summary, pending: [] })
+    if (path === '/api/sessions/parent/catalog') return json({ session_id: 'parent', config_options: [], commands: [] })
+    if (path === '/api/hosts') return json([])
+    if (path === '/api/stream/view/sessions/parent') { const stream = liveStream(); streams.push(stream); return stream.response }
+    return json({ code: 'not_found', message: 'no' }, 404)
+  })
+  render(<SessionView id="parent" timing={{ retryMs: () => 1 }} />, { wrapper: s.wrapper })
+  expect(await screen.findByRole('region', { name: 'Session family' })).toBeInTheDocument()
+  expect(screen.getByText('Waiting on children', { exact: true })).toBeInTheDocument()
+  await waitFor(() => expect(streams).toHaveLength(1))
+  const reads = () => s.calls.filter(c => c.path.startsWith('/api/view/sessions/parent/family')).length
+  const before = reads()
+  act(() => { streams[0].event('resync_required', {}) })
+  await waitFor(() => expect(reads()).toBeGreaterThan(before))
+})
diff --git a/web/src/screens/Session.footer.test.tsx b/web/src/screens/Session.footer.test.tsx
index 3ca1e008..3e788ef4 100644
--- a/web/src/screens/Session.footer.test.tsx
+++ b/web/src/screens/Session.footer.test.tsx
@@ -298,6 +298,8 @@ describe('SessionView: a refused resume, in words', () => {
         created_at: '2026-10-02T09:00:00.000Z',
         last_event_at: '2026-10-02T10:00:00.000Z',
         question_waits: false,
+        operator_attention: 0,
+        parent_handled_questions: 0,
       }) as const
     const r = render(<SessionView id="s1" summary={summary('parked')} timing={FAST} />, { wrapper: s.wrapper })
     fireEvent.click(await screen.findByRole('button', { name: 'Resume' }, WAIT))
diff --git a/web/src/screens/Session.host.test.tsx b/web/src/screens/Session.host.test.tsx
index 67646d6a..a6e144fe 100644
--- a/web/src/screens/Session.host.test.tsx
+++ b/web/src/screens/Session.host.test.tsx
@@ -90,7 +90,7 @@ describe('SessionView: the host’s reach on a question card', () => {
     expect(await screen.findByText(NOTE, { exact: true }, WAIT)).toBeInTheDocument()
   })
 
-  it('the summary’s presumed_parked, as a session_upsert changes it, turns the note on and off, refreshing metadata only on the running transition', async () => {
+  it('the summary’s presumed_parked, as a session_upsert changes it, turns the note on and off, refreshing host metadata on the running transition and family metadata on both transitions', async () => {
     const s = server(true)
     const summary = (presumed_parked: boolean): SessionSummary =>
       ({
@@ -105,6 +105,8 @@ describe('SessionView: the host’s reach on a question card', () => {
         created_at: '2026-10-02T09:00:00.000Z',
         last_event_at: TS,
         question_waits: true,
+        operator_attention: 1,
+        parent_handled_questions: 0,
       }) as SessionSummary
     const r = render(<SessionView id="s1" summary={summary(false)} timing={FAST} />, { wrapper: s.wrapper })
     await settled(s)
@@ -116,6 +118,7 @@ describe('SessionView: the host’s reach on a question card', () => {
 
     r.rerender(<SessionView id="s1" summary={summary(false)} timing={FAST} />)
     await waitFor(() => expect(screen.queryByText(NOTE, { exact: true })).toBeNull(), WAIT)
-    expect(s.calls.length).toBe(calls + 1)
+    expect(s.calls.length).toBe(calls + 3)
+    expect(s.of('/api/view/sessions/s1/family')).toHaveLength(3)
   })
 })
diff --git a/web/src/store/resyncBackoff.test.ts b/web/src/store/resyncBackoff.test.ts
index 2b2deeb0..1417c2d4 100644
--- a/web/src/store/resyncBackoff.test.ts
+++ b/web/src/store/resyncBackoff.test.ts
@@ -53,6 +53,8 @@ function summary(id: string): SessionSummary {
     created_at: '2026-10-01T00:00:00.000Z',
     last_event_at: '2026-10-02T10:00:00.000Z',
     question_waits: false,
+        operator_attention: 0,
+        parent_handled_questions: 0,
   }
 }
 
diff --git a/web/src/store/sessionList.test.ts b/web/src/store/sessionList.test.ts
index 92aab799..63fb3109 100644
--- a/web/src/store/sessionList.test.ts
+++ b/web/src/store/sessionList.test.ts
@@ -26,6 +26,8 @@ function summary(id: string, patch: Partial<SessionSummary> = {}): SessionSummar
     created_at: '2026-10-01T00:00:00.000Z',
     last_event_at: '2026-10-02T10:00:00.000Z',
     question_waits: false,
+    operator_attention: patch.question_waits || patch.activity === 'blocked' ? 1 : 0,
+    parent_handled_questions: 0,
     ...patch,
   }
 }
diff --git a/web/src/store/useSessionList.test.ts b/web/src/store/useSessionList.test.ts
index 230ee4a1..0c9bd06d 100644
--- a/web/src/store/useSessionList.test.ts
+++ b/web/src/store/useSessionList.test.ts
@@ -21,6 +21,8 @@ function summary(id: string, patch: Partial<SessionSummary> = {}): SessionSummar
     created_at: '2026-10-01T00:00:00.000Z',
     last_event_at: '2026-10-02T10:00:00.000Z',
     question_waits: false,
+    operator_attention: patch.question_waits || patch.activity === 'blocked' ? 1 : 0,
+    parent_handled_questions: 0,
     ...patch,
   }
 }
diff --git a/web/src/test-family.ts b/web/src/test-family.ts
new file mode 100644
index 00000000..5b1fadbc
--- /dev/null
+++ b/web/src/test-family.ts
@@ -0,0 +1,17 @@
+import type { FamilyPage, SessionSummary } from './generated/view'
+export const parent: SessionSummary = {
+  session_id: 'parent', host_id: 'h1', agent: 'claude', cwd: '/srv/project', hat_id: 'hat1',
+  lifecycle: 'active', activity: 'idle', presumed_parked: false,
+  created_at: '2026-10-02T09:00:00Z', last_event_at: '2026-10-02T10:00:00Z',
+  question_waits: false, operator_attention: 0, parent_handled_questions: 0,
+  family: { revision: 1, child_counts: { total: 2, active: 2, waiting: 1 }, children: [], attention: 0 },
+}
+export function familyPage(id = 'child'): FamilyPage {
+  return { summary: parent, questions: [], children: [{
+    summary: { ...parent, session_id: id, title: 'Review parser', agent: 'codex', model: 'reasoner', cwd: '/srv/worker',
+      activity: 'blocked', question_waits: true, operator_attention: 0, parent_handled_questions: 1,
+      family: { revision: 1, parent: { session_id: 'parent', agent: 'claude', title: 'Coordinator' }, child_counts: { total: 0, active: 0, waiting: 0 }, children: [], attention: 0 } },
+    routing: 'active', operations: [{ operation_id: 'op1', tool: 'spawn', state: 'accepted' }],
+    questions: [{ pending_id: 'q/1', kind: 'elicitation', handling: 'parent_queued' }],
+  }], next_cursor: id === 'child' ? id : undefined }
+}
```

### Task 3, step 2: render actual family and receipt state, with explicit takeover

Run web install/typecheck/test/build, embed the build, then changed Playwright specs locally. Probe UI guards only in a cloned copy, including a meaningful API-path browser cut; run late-response/resync tests at 4×3.

```diff
diff --git a/web/src/api/attention.ts b/web/src/api/attention.ts
new file mode 100644
index 00000000..4bdabf4b
--- /dev/null
+++ b/web/src/api/attention.ts
@@ -0,0 +1,32 @@
+// D3b's existing operator-only wire contract. A question can only be
+// resolved through its canonical card; null means a status-only record.
+import type { Client } from './client'
+
+export interface OperatorAttention {
+  id: string
+  child_id: string
+  hat_id: string
+  reason: string
+  pending_id: string | null
+}
+
+export async function attentionPage(client: Client, hat: string, after?: string): Promise<OperatorAttention[]> {
+  const query = new URLSearchParams({ hat_id: hat })
+  if (after !== undefined) query.set('after', after)
+  const value = await client.request<unknown>('GET', `/api/delegation/attention?${query}`)
+  if (!Array.isArray(value) || value.length > 100 || !value.every(isAttention)) throw new Error('Invalid delegation attention response.')
+  return value
+}
+
+function isAttention(value: unknown): value is OperatorAttention {
+  if (!value || typeof value !== 'object') return false
+  const row = value as Record<string, unknown>
+  return typeof row.id === 'string' && row.id.length > 0 &&
+    typeof row.child_id === 'string' && row.child_id.length > 0 &&
+    typeof row.hat_id === 'string' && row.hat_id.length > 0 &&
+    typeof row.reason === 'string' && (row.pending_id === null || typeof row.pending_id === 'string')
+}
+
+export function acknowledgeAttention(client: Client, id: string): Promise<void> {
+  return client.request<void>('POST', `/api/delegation/attention/${encodeURIComponent(id)}/acknowledge`, {})
+}
diff --git a/web/src/api/view.ts b/web/src/api/view.ts
index 5893533f..cc234a13 100644
--- a/web/src/api/view.ts
+++ b/web/src/api/view.ts
@@ -3,7 +3,7 @@
 // and the streams' paths. Every id in a path is encoded: ids are server
 // data, never trusted to be path-safe.
 import type { Client } from './client'
-import type { Item, ItemPage, SummaryPage, TurnContent } from '../generated/view'
+import type { FamilyPage, Item, ItemPage, SummaryPage, TurnContent } from '../generated/view'
 import type { SessionCatalog, SessionDetail } from '../generated/protocol'
 
 const enc = encodeURIComponent
@@ -102,3 +102,12 @@ export function listStreamPath(hat?: string | null): string {
 export function anchorOf(page: { epoch: string; revision: number }): string {
   return `${page.epoch}:${page.revision}`
 }
+
+/** Family pages are owner-authorized by the collector, like the view itself. */
+export function familyPage(client: Client, id: string, after?: string): Promise<FamilyPage> {
+  return client.request<FamilyPage>('GET', `/api/view/sessions/${enc(id)}/family${query({ after, limit: 20 })}`)
+}
+
+export function takeOver(client: Client, id: string): Promise<void> {
+  return client.request<void>('POST', `/api/view/sessions/${enc(id)}/takeover`, {})
+}
diff --git a/web/src/components/FamilyPanel.tsx b/web/src/components/FamilyPanel.tsx
new file mode 100644
index 00000000..4ac1f50d
--- /dev/null
+++ b/web/src/components/FamilyPanel.tsx
@@ -0,0 +1,117 @@
+// The family remains a set of independent sessions. Read real receipts and
+// routing state; an accepted operation is never rendered as a successful run.
+import { useEffect, useRef, useState } from 'react'
+import { ApiFailure, messageOf } from '../api/errors'
+import { familyPage, takeOver } from '../api/view'
+import { useClient } from '../app-client'
+import type { FamilyChild, FamilyPage, SessionSummary } from '../generated/view'
+import { agentLabel } from '../lib/agent'
+import { Link } from '../router'
+import { sessionPath } from './SessionRow'
+import StatusAttention from './StatusAttention'
+
+interface Props {
+  id: string
+  summary?: SessionSummary
+  hosts: Map<string, string>
+  resync: number
+  onPage?: (page: FamilyPage) => void
+}
+
+export function handlingWords(handling: string): string {
+  switch (handling) {
+    case 'parent_queued': case 'parent_delivered': return 'Parent is handling'
+    case 'operator_required': return 'Operator answer required'
+    case 'answer_queued': return 'Answer queued'
+    default: return handling
+  }
+}
+
+export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Props) {
+  const client = useClient()
+  const [loadedPage, setPage] = useState<FamilyPage | null>(null)
+  const [error, setError] = useState<string | null>(null)
+  const [busy, setBusy] = useState(false)
+  const [taking, setTaking] = useState<string | null>(null)
+  const [refresh, setRefresh] = useState(0)
+  const generation = useRef(0)
+  const report = useRef(onPage)
+  report.current = onPage
+  // Family summaries change only on family facts. Ordinary transcript tokens
+  // must never refetch the whole family. Resync invalidates these pages too.
+  const familyKey = JSON.stringify([summary?.hat_id, summary?.lifecycle, summary?.activity, summary?.family, summary?.operator_attention, summary?.parent_handled_questions])
+  useEffect(() => {
+    const current = ++generation.current
+    setPage(held => held?.summary.session_id === id ? held : null)
+    setError(null)
+    setBusy(true)
+    familyPage(client, id).then(value => {
+      if (generation.current !== current) return
+      setPage(value)
+      report.current?.(value)
+    }, err => { if (generation.current === current && !(err instanceof ApiFailure && err.status === 404)) setError(messageOf(err)) })
+      .finally(() => { if (generation.current === current) setBusy(false) })
+    return () => { generation.current++ }
+  }, [client, id, familyKey, resync, refresh])
+
+  const page = loadedPage?.summary.session_id !== id || (summary && (summary.hat_id !== loadedPage?.summary.hat_id || summary.family?.revision !== loadedPage?.summary.family?.revision)) ? null : loadedPage
+  const more = async () => {
+    if (!page?.next_cursor || busy) return
+    const current = generation.current
+    setBusy(true); setError(null)
+    try {
+      const next = await familyPage(client, id, page.next_cursor)
+      if (generation.current !== current) return
+      setPage(held => held && ({ ...next, children: [...held.children, ...next.children.filter(child => !held.children.some(old => old.summary.session_id === child.summary.session_id))] }))
+    } catch (err) { if (generation.current === current) setError(messageOf(err)) }
+    finally { if (generation.current === current) setBusy(false) }
+  }
+  const takeover = async (child: Pick<FamilyChild, 'summary'>) => {
+    if (taking) return
+    const current = generation.current
+    setTaking(child.summary.session_id); setError(null)
+    try {
+      await takeOver(client, child.summary.session_id)
+      if (generation.current === current) setRefresh(n => n + 1)
+    } catch (err) { if (generation.current === current) setError(messageOf(err)) }
+    finally { setTaking(null) }
+  }
+
+  const family = summary ? summary.family : page?.summary.family
+  const selected = summary ?? page?.summary
+  const hasAttention = (selected?.operator_attention ?? 0) > 0 || (selected?.family?.attention ?? 0) > 0 || (page?.summary.operator_attention ?? 0) > 0 || (page?.summary.family?.attention ?? 0) > 0
+  if (!family?.parent && !family?.child_counts.total && !error && !hasAttention) return null
+  return <section className="family-panel" aria-label="Session family">
+    <details>
+      <summary>{family?.parent || family?.child_counts.total ? 'Family' : 'Attention'}{family?.child_counts.total ? ` · ${family.child_counts.total} children` : ''}</summary>
+      {selected && <StatusAttention session={selected} children={page?.children.map(child => child.summary) ?? []} enabled={hasAttention && page !== null} refreshKey={`${familyKey}:${resync}:${refresh}`} onAcknowledged={() => setRefresh(n => n + 1)} />}
+      {family?.parent && <p>Parent: <Link to={sessionPath(family.parent.session_id)}><bdi>{family.parent.title || agentLabel(family.parent.agent)}</bdi></Link></p>}
+      {page?.routing && <p>Routing: {page.routing}{page.reason && <> · <bdi>{page.reason}</bdi></>}</p>}
+      {family?.parent && page?.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" disabled={taking !== null} onClick={() => void takeover({ summary: page.summary })}>{taking === id ? 'Taking over…' : 'Take over'}</button>}
+      {page?.children.map(child => {
+        const s = child.summary
+        const title = s.title || s.session_id
+        return <article key={s.session_id} className="family-child" aria-label={title}>
+          <Link to={sessionPath(s.session_id)}><bdi>{title}</bdi></Link>
+          <div className="family-meta">
+            <span>{agentLabel(s.agent)}</span>{s.model && <bdi>{s.model}</bdi>}
+            <bdi>{hosts.get(s.host_id) || s.host_id}</bdi><bdi>{s.cwd}</bdi>
+            <span>{s.lifecycle}</span>{s.activity && <span>{s.activity}</span>}
+            <span>Routing: {child.routing}</span>
+          </div>
+          {child.reason && <p><bdi>{child.reason}</bdi></p>}
+          {child.operations.length >= 16 && <p className="item-note">Latest 16 operations</p>}
+          {child.operations.map(op => <p key={op.operation_id} className="family-operation"><bdi>{op.tool}: {op.state}</bdi>{op.code && <> · <bdi>{op.code}</bdi></>}</p>)}
+          {child.questions.map(question => <p key={question.pending_id}>
+            <span>{handlingWords(question.handling)}</span>{question.reason && <> · <bdi>{question.reason}</bdi></>}{' '}
+            <Link to={`${sessionPath(s.session_id)}?pending=${encodeURIComponent(question.pending_id)}`}>Open question</Link>
+          </p>)}
+          {child.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Take over ${title}`} disabled={taking !== null} onClick={() => void takeover(child)}>{taking === s.session_id ? 'Taking over…' : 'Take over'}</button>}
+        </article>
+      })}
+      {page?.next_cursor && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void more()}>Load more children</button>}
+      {busy && <p role="status">Loading family…</p>}
+      {error && <p className="form-error" role="alert">{error} <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefresh(n => n + 1)}>Retry family</button></p>}
+    </details>
+  </section>
+}
diff --git a/web/src/components/SessionHeader.tsx b/web/src/components/SessionHeader.tsx
index b5ce6cc5..20ef071d 100644
--- a/web/src/components/SessionHeader.tsx
+++ b/web/src/components/SessionHeader.tsx
@@ -4,7 +4,7 @@
 // The session's menu (Park, Close, Delete) sits at the end of its title row.
 import type { SessionItem } from '../generated/protocol'
 import type { ReactNode } from 'react'
-import type { PlanEntry } from '../generated/view'
+import type { FamilySummary, PlanEntry } from '../generated/view'
 import { agentLabel } from '../lib/agent'
 import { statusOf } from '../lib/status'
 import { basename } from '../lib/time'
@@ -14,7 +14,7 @@ import StepList from './StepList'
 import { reasonWords } from './items/Marker'
 
 /** What the header reads: a list summary or a session's detail. */
-export type HeaderInfo = SessionItem & { question_waits?: boolean }
+export type HeaderInfo = SessionItem & { question_waits?: boolean; operator_attention?: number; parent_handled_questions?: number; family?: FamilySummary }
 
 export function titleOf(info: HeaderInfo | undefined, id: string): string {
   return info?.title || basename(info?.cwd ?? '') || id
@@ -36,6 +36,9 @@ export default function SessionHeader({ id, info, hostName, plan, narrow, menu }
   // the row never disagree.
   const status = info
     ? statusOf({
+        operator_attention: info.operator_attention,
+        parent_handled_questions: info.parent_handled_questions,
+        family: info.family,
         lifecycle: info.lifecycle,
         activity: info.activity,
         question_waits: !!info.question_waits,
diff --git a/web/src/components/SessionMenu.tsx b/web/src/components/SessionMenu.tsx
index 858eb80c..6674cc9c 100644
--- a/web/src/components/SessionMenu.tsx
+++ b/web/src/components/SessionMenu.tsx
@@ -19,6 +19,10 @@ import { ApiFailure } from '../api/errors'
 import { close, deleteSession, park } from '../api/turns'
 import { useClient } from '../app-client'
 import type { DeleteResult } from '../generated/protocol'
+import type { FamilySummary } from '../generated/view'
+import { Link } from '../router'
+import { agentLabel } from '../lib/agent'
+import { sessionPath } from './SessionRow'
 import { Icon } from '../lib/ui'
 import ConfirmDialog from './ConfirmDialog'
 import { closeRefusal, deleteRefusal, parkRefusal } from './sessionWords'
@@ -27,6 +31,8 @@ interface Props {
   id: string
   /** The session's lifecycle; undefined while unknown (Delete only). */
   lifecycle?: string
+  /** Already owner/hat-filtered family metadata from the current view. */
+  family?: FamilySummary
   /** The session's host announced the `park` capability. */
   canPark: boolean
   /** The session was deleted (`undefined`: a server that answers 204, or
@@ -37,7 +43,7 @@ interface Props {
   focusAfterDelete?: () => HTMLElement | null
 }
 
-export default function SessionMenu({ id, lifecycle, canPark, onDeleted, focusAfterDelete }: Props) {
+export default function SessionMenu({ id, lifecycle, family, canPark, onDeleted, focusAfterDelete }: Props) {
   const client = useClient()
   const menuId = useId()
   const [open, setOpen] = useState(false)
@@ -169,6 +175,12 @@ export default function SessionMenu({ id, lifecycle, canPark, onDeleted, focusAf
             Its transcript, its questions and the images only it holds are deleted here for good. A running session is
             closed first.
           </p>
+          {family && <>
+            <p>Copies already delivered to related sessions remain in their transcripts. Those sessions are kept.</p>
+            <ul aria-label="Related sessions">
+              {[...(family.parent ? [family.parent] : []), ...family.children].map(related => <li key={related.session_id}><Link to={sessionPath(related.session_id)}><bdi>{related.title || agentLabel(related.agent)}</bdi></Link></li>)}
+            </ul>
+          </>}
           <p>The agent’s own transcript on the host is removed too, where the host can.</p>
         </ConfirmDialog>
       )}
diff --git a/web/src/components/SessionRow.tsx b/web/src/components/SessionRow.tsx
index cb2d66cb..b71f037c 100644
--- a/web/src/components/SessionRow.tsx
+++ b/web/src/components/SessionRow.tsx
@@ -65,12 +65,17 @@ export default function SessionRow({ session, selected, hostName, now }: Props)
               <bdi>{hostName}</bdi>
             </span>
           )}
-          {(status.tone === 'attn' || status.tone === 'fail' || status.label === 'Host offline') && (
+          {(status.tone === 'attn' || status.tone === 'fail' || status.label === 'Host offline' || status.label === 'Waiting on children' || status.label === 'Parent is handling' || status.label === 'Answer pending delivery') && (
             <span className={'sess-flag sess-flag-' + status.tone}>{status.label}</span>
           )}
           {status.resume && <span className="sess-resume">Resume</span>}
         </div>
       </Link>
+      {session.family && <div className="sess-family">
+        {session.family.parent && <Link to={sessionPath(session.family.parent.session_id)}>Parent: <bdi>{session.family.parent.title || agentLabel(session.family.parent.agent)}</bdi></Link>}
+        {session.family.children.map(child => <Link key={child.session_id} to={sessionPath(child.session_id)}>Child: <bdi>{child.title || agentLabel(child.agent)}</bdi></Link>)}
+        {session.family.child_counts.total > session.family.children.length && <span>{session.family.child_counts.total} children</span>}
+      </div>}
       {reason && (
         <>
           <button type="button" className="sess-why" aria-expanded={why} onClick={() => setWhy((open) => !open)}>
diff --git a/web/src/components/SessionScope.tsx b/web/src/components/SessionScope.tsx
index 366be704..2d797b83 100644
--- a/web/src/components/SessionScope.tsx
+++ b/web/src/components/SessionScope.tsx
@@ -4,7 +4,7 @@
 // session view's header all read it through `useSessionScope()`.
 //
 // It also owns what the list decides on its own:
-// - the tab title `(N) hennery`, N = the hat's sessions waiting on a question;
+// - the tab title `(N) hennery`, N = the hat's sessions waiting on you;
 // - selection (F-11): the route's id is the selection, honoured even
 //   outside the hat; a hat switch clears it; on a desktop, `/sessions` with no id opens the newest VISIBLE row.
 import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
@@ -174,12 +174,12 @@ export default function SessionScope({ route, desktop, children }: { route: Rout
   return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
 }
 
-/** The rail's and the top bar's count of sessions waiting on a question. */
+/** The rail's and the top bar's count of sessions waiting on you. */
 export function WaitingBadge() {
   const scope = useSessionScope()
   const n = scope?.list.counts.waiting ?? 0
   if (n === 0) return null
-  const text = `${n} waiting on a question`
+  const text = `${n} waiting on you`
   return (
     <span className="badge badge-attn" role="status" aria-label={text} title={text}>
       {n}
diff --git a/web/src/components/StatusAttention.tsx b/web/src/components/StatusAttention.tsx
new file mode 100644
index 00000000..dc79a753
--- /dev/null
+++ b/web/src/components/StatusAttention.tsx
@@ -0,0 +1,97 @@
+// Attention is paged across the selected hat, then narrowed to the current
+// session and the family children already loaded. Never scan extra pages or
+// guess completion from a successful acknowledgement request.
+import { useEffect, useRef, useState } from 'react'
+import { acknowledgeAttention, attentionPage, type OperatorAttention } from '../api/attention'
+import { messageOf } from '../api/errors'
+import { useClient } from '../app-client'
+import type { SessionSummary } from '../generated/view'
+import { Link } from '../router'
+import { sessionPath } from './SessionRow'
+
+interface Props {
+  session: SessionSummary
+  children: SessionSummary[]
+  enabled: boolean
+  refreshKey: string
+  onAcknowledged: () => void
+}
+interface Page { key: string; rows: OperatorAttention[]; cursor?: string }
+
+export default function StatusAttention({ session, children, enabled, refreshKey, onAcknowledged }: Props) {
+  const client = useClient()
+  const [held, setPage] = useState<Page | null>(null)
+  const [error, setError] = useState<{ key: string; text: string } | null>(null)
+  const [busy, setBusy] = useState(false)
+  const [acknowledging, setAcknowledging] = useState<{ key: string; id: string } | null>(null)
+  const [attempt, setAttempt] = useState(0)
+  const generation = useRef(0)
+  const key = JSON.stringify([session.session_id, session.hat_id, enabled, refreshKey, attempt])
+  const latest = useRef(key)
+  latest.current = key
+  const acknowledged = useRef(onAcknowledged)
+  acknowledged.current = onAcknowledged
+
+  useEffect(() => {
+    const current = ++generation.current
+    setError(null)
+    if (!enabled) { setBusy(false); return () => { generation.current++ } }
+    setBusy(true)
+    attentionPage(client, session.hat_id).then(rows => {
+      if (generation.current !== current || latest.current !== key) return
+      setPage({ key, rows, cursor: rows.length === 100 ? rows.at(-1)?.id : undefined })
+    }, err => { if (generation.current === current && latest.current === key) setError({ key, text: messageOf(err) }) })
+      .finally(() => { if (generation.current === current && latest.current === key) setBusy(false) })
+    return () => { generation.current++ }
+  }, [client, key])
+
+  const page = held?.key === key ? held : null
+  const sessions = new Map([session, ...children.filter(child => child.hat_id === session.hat_id)].map(child => [child.session_id, child]))
+  const visible = page?.rows.filter(row => row.hat_id === session.hat_id && sessions.has(row.child_id)) ?? []
+  const ownError = error?.key === key ? error.text : null
+  const ackId = acknowledging?.key === key ? acknowledging.id : null
+
+  const more = async () => {
+    if (!page?.cursor || busy || latest.current !== key) return
+    const current = generation.current
+    setBusy(true); setError(null)
+    try {
+      const rows = await attentionPage(client, session.hat_id, page.cursor)
+      if (generation.current !== current || latest.current !== key) return
+      setPage(previous => previous?.key === key ? { key,
+        rows: [...previous.rows, ...rows.filter(row => !previous.rows.some(old => old.id === row.id))],
+        cursor: rows.length === 100 ? rows.at(-1)?.id : undefined,
+      } : previous)
+    } catch (err) { if (generation.current === current && latest.current === key) setError({ key, text: messageOf(err) }) }
+    finally { if (generation.current === current && latest.current === key) setBusy(false) }
+  }
+
+  const acknowledge = async (row: OperatorAttention) => {
+    if (ackId || row.pending_id !== null || row.hat_id !== session.hat_id || !sessions.has(row.child_id) || latest.current !== key) return
+    const current = generation.current
+    setAcknowledging({ key, id: row.id }); setError(null)
+    try {
+      await acknowledgeAttention(client, row.id)
+      if (generation.current !== current || latest.current !== key) return
+      acknowledged.current()
+    } catch (err) { if (generation.current === current && latest.current === key) setError({ key, text: messageOf(err) }) }
+    finally { setAcknowledging(previous => previous?.key === key && previous.id === row.id ? null : previous) }
+  }
+
+  if (!enabled) return null
+  return <section className="family-attention" aria-label="Delegation attention">
+    <h2>Needs your attention</h2>
+    {visible.map(row => {
+      const title = sessions.get(row.child_id)?.title || row.child_id
+      return <p key={row.id}>
+        <Link to={sessionPath(row.child_id)}><bdi>{title}</bdi></Link>{' · '}<bdi>{row.reason}</bdi>{' '}
+        {row.pending_id === null
+          ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`Acknowledge ${row.reason} for ${title}`} disabled={ackId !== null} onClick={() => void acknowledge(row)}>{ackId === row.id ? 'Acknowledging…' : 'Acknowledge'}</button>
+          : <Link to={`${sessionPath(row.child_id)}?pending=${encodeURIComponent(row.pending_id)}`}>Open question</Link>}
+      </p>
+    })}
+    {page?.cursor && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void more()}>Load more attention</button>}
+    {busy && <p role="status">Loading attention…</p>}
+    {ownError && <p className="form-error" role="alert">{ownError} <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt(n => n + 1)}>Retry attention</button></p>}
+  </section>
+}
diff --git a/web/src/components/items/QuestionCard.tsx b/web/src/components/items/QuestionCard.tsx
index 5f6a96f1..66ecb4b3 100644
--- a/web/src/components/items/QuestionCard.tsx
+++ b/web/src/components/items/QuestionCard.tsx
@@ -26,6 +26,7 @@ import { useMediaQuery } from '../../hooks/useMediaQuery'
 import { deliveryOf, digitIndex, isEditable, optionTone, questionText, type OptionTone } from '../../lib/delivery'
 import { useAnswerState, useFormDraft } from '../../store/useAnswer'
 import Elicitation from './Elicitation'
+import { handlingWords } from '../FamilyPanel'
 import type { ItemEnv, ItemOf } from './types'
 
 type Question = ItemOf<'question'>
@@ -72,6 +73,9 @@ export default function QuestionCard({ item, env }: Props) {
   const ref = useRef<HTMLElement>(null)
   const { composerEmpty, agent } = env
   const kind = request.type
+  const routing = env.familyQuestions?.find(q => q.pending_id === item.pending_id)
+  const parentHandling = routing?.handling === 'parent_queued' || routing?.handling === 'parent_delivered'
+  const stateText = parentHandling && d.text === 'Needs your answer' ? 'Waiting for an answer' : d.text
 
   useEffect(() => {
     if (!live || !book) return
@@ -149,8 +153,9 @@ export default function QuestionCard({ item, env }: Props) {
           <Elicitation request={request} live={live} busy={d.busy} draft={draft} onDraft={onDraft} onAnswer={answer} />
         </>
       )}
+      {item.answerable && routing && <p className="q-routing"><span>{handlingWords(routing.handling)}</span>{routing.reason && <> · <bdi>{routing.reason}</bdi></>}</p>}
       <p className="q-state">
-        <span>{d.text}</span>
+        <span>{stateText}</span>
         {d.note && <span className="q-note">{d.note}</span>}
       </p>
       {local?.phase === 'uncertain' && <button className="btn btn-ghost" type="button" onClick={() => void book?.checkAnswer(item)}>Refresh question</button>}
diff --git a/web/src/components/items/UserTurn.tsx b/web/src/components/items/UserTurn.tsx
index ac84d5d2..aa1c58e1 100644
--- a/web/src/components/items/UserTurn.tsx
+++ b/web/src/components/items/UserTurn.tsx
@@ -1,6 +1,8 @@
 // The operator's prompt, shown exactly as sent: plain text with its line
 // breaks (no Markdown), and its images from the attachment store when they
 // are of a type the page shows.
+import { Link } from '../../router'
+import { sessionPath } from '../SessionRow'
 import { USER_LABEL } from '../../lib/agent'
 import { CutNote, Speaker } from './parts'
 import type { ItemEnv, ItemOf } from './types'
@@ -27,8 +29,12 @@ function Attachment({ mimeType, sha256 }: { mimeType: string; sha256: unknown })
 }
 
 export default function UserTurn({ item, env }: { item: ItemOf<'user_turn'>; env: ItemEnv }) {
+  const origin = item.origin
+  const source = origin?.kind === 'parent' ? origin.session_id : origin?.kind === 'child_report' ? origin.child_id : undefined
+  const label = origin?.kind === 'parent' ? 'Parent instruction' : origin?.kind === 'child_report' ? 'Child report' : origin?.kind === 'plugin_context' ? 'Plug-in context' : USER_LABEL
   return (
-    <Speaker who="user" label={USER_LABEL} ts={item.ts}>
+    <Speaker who={source ? 'agent' : 'user'} label={label} ts={item.ts}>
+      {source && <Link className="item-note" to={sessionPath(source)}>Source session</Link>}
       <div className="bubble user">
         {item.content.map((block, i) =>
           block.type === 'text' ? (
@@ -44,7 +50,7 @@ export default function UserTurn({ item, env }: { item: ItemOf<'user_turn'>; env
           ),
         )}
       </div>
-      {item.truncated && <CutNote sessionId={env.sessionId}>This prompt was cut.</CutNote>}
+      {item.truncated && <CutNote sessionId={env.sessionId}>{origin?.kind === 'child_report' ? 'This report was cut.' : origin?.kind === 'parent' ? 'This instruction was cut.' : 'This prompt was cut.'}</CutNote>}
     </Speaker>
   )
 }
diff --git a/web/src/components/items/types.ts b/web/src/components/items/types.ts
index f46f7722..7da0f044 100644
--- a/web/src/components/items/types.ts
+++ b/web/src/components/items/types.ts
@@ -1,7 +1,7 @@
 // What every item renderer is given besides its item: the session it is in,
 // what answers its questions, and the composer's seams (its emptiness, its
 // prefill, sending a turn again).
-import type { Item } from '../../generated/view'
+import type { FamilyQuestion, Item } from '../../generated/view'
 import type { AnswerBook } from '../../store/useAnswer'
 
 export type ItemOf<K extends Item['kind']> = Extract<Item, { kind: K }>
@@ -14,6 +14,8 @@ export interface ItemEnv {
   hatName?: (id: string) => string | undefined
   /** Answers the session's questions; none makes every card read-only. */
   answers?: AnswerBook
+  /** Canonical family routing, read from the selected session family page. */
+  familyQuestions?: FamilyQuestion[]
   /** "Send again" for a turn that was not delivered; absent, none is offered. */
   onSendAgain?: (item: ItemOf<'marker'>) => void
   /** "Answer as a new message" for a question the agent stopped waiting
diff --git a/web/src/index.css b/web/src/index.css
index d190fe09..40a54618 100644
--- a/web/src/index.css
+++ b/web/src/index.css
@@ -664,3 +664,23 @@ li.q-opt-reject { border-color:var(--st-attn); color:var(--st-attn); }
 /* Last-start/resume MCP metadata, separate from the streamed transcript. */
 .mcp-delivery { margin:8px 20px; padding:12px; border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; }
 .mcp-delivery p { margin:0 0 4px; overflow-wrap:anywhere; }
+
+/* Family navigation preserves independent session rows and touch targets. */
+.sess-family { display: flex; flex-wrap: wrap; gap: .35rem .75rem; padding: 0 .85rem .55rem 2.2rem; font-size: .75rem; color: var(--fg-muted); }
+.sess-family a { text-decoration: underline; overflow-wrap: anywhere; }
+.family-panel { flex: 0 0 auto; border-bottom: 1px solid var(--border); padding: .55rem 1rem; font-size: .8rem; max-height: 32vh; overflow: auto; }
+.family-panel summary { cursor: pointer; padding: .35rem 0; }
+.family-panel a { text-decoration: underline; overflow-wrap: anywhere; }
+.family-child { margin-top: .65rem; padding-top: .65rem; border-top: 1px solid var(--border); }
+.family-meta { display: flex; flex-wrap: wrap; gap: .25rem .65rem; margin: .35rem 0; }
+.family-meta bdi, .family-child p, .q-routing { overflow-wrap: anywhere; }
+.family-child p { margin: .3rem 0; }
+.q-routing { margin-top: .6rem; color: var(--fg-muted); font-size: .8rem; }
+@media (max-width: 767px) {
+  .family-panel button, .family-panel summary, .family-panel a, .sess-family a { min-height: 44px; }
+  .family-panel a, .sess-family a { display: inline-flex; align-items: center; }
+  .family-panel { padding-inline: .75rem; }
+}
+.family-attention { margin-block: .65rem; padding-block: .5rem; border-bottom: 1px solid var(--border); }
+.family-attention h2 { font-weight: 600; }
+.family-attention p { margin-block: .35rem; overflow-wrap: anywhere; }
diff --git a/web/src/lib/status.ts b/web/src/lib/status.ts
index d5ffcc86..132da323 100644
--- a/web/src/lib/status.ts
+++ b/web/src/lib/status.ts
@@ -1,11 +1,9 @@
 // A session's status marker in the list and in the session's header
 // (frontend spec §5; plan 4c decisions 7 and 8): one rule for both. It
-// reads the server's two axes, lifecycle and activity, plus
-// `question_waits` and `presumed_parked`, directly: there is no staleness
-// heuristic and no "actionable" guess (F-9).
+// uses the server's operator attention separately from factual pending
+// questions. Older summaries without counts retain their original marker.
 
-/** The marker's colour: `attn` is the strongest and means only "waiting on
- *  a question"; `fail` is a hollow red ring. */
+/** Operator attention is strongest; `fail` is a hollow red ring. */
 export type Tone = 'attn' | 'run' | 'wait' | 'idle' | 'fail'
 
 export interface Marker {
@@ -20,18 +18,23 @@ export interface StatusInput {
   activity?: string
   question_waits: boolean
   presumed_parked: boolean
+  operator_attention?: number
+  parent_handled_questions?: number
+  family?: { child_counts: { active: number } }
 }
 
 /**
  * The marker for a session.
  *
- * Waiting on a question wins over every lifecycle, so a row's marker always
- * agrees with the waiting count (tab title, header badge), which counts
- * `blocked || question_waits` whatever the lifecycle. The wording is never
- * "needs you": the summary cannot tell an answer already in flight.
+ * Operator work wins over every lifecycle. A parent-handled question and
+ * an accepted answer awaiting delivery remain visible without adding to
+ * the operator badge. Waiting on children describes only an idle parent.
  */
 export function statusOf(s: StatusInput): Marker {
-  if (s.activity === 'blocked' || s.question_waits) return { tone: 'attn', label: 'Waiting on a question', resume: false }
+  if (s.operator_attention !== undefined ? s.operator_attention > 0 : s.activity === 'blocked' || s.question_waits) return { tone: 'attn', label: s.operator_attention !== undefined ? 'Waiting on you' : 'Waiting on a question', resume: false }
+  if ((s.parent_handled_questions ?? 0) > 0) return { tone: 'wait', label: 'Parent is handling', resume: false }
+  if (s.operator_attention === 0 && s.question_waits) return { tone: 'wait', label: 'Answer pending delivery', resume: false }
+  if (s.lifecycle === 'active' && s.activity === 'idle' && (s.family?.child_counts.active ?? 0) > 0) return { tone: 'wait', label: 'Waiting on children', resume: false }
   switch (s.lifecycle) {
     case 'failed':
       return { tone: 'fail', label: 'Failed', resume: false }
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index daaf7043..6700b16e 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -48,6 +48,7 @@ import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
 import SessionFooter from '../components/SessionFooter'
 import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
 import McpDelivery from '../components/McpDelivery'
+import FamilyPanel from '../components/FamilyPanel'
 import { Text } from '../lib/text'
 import { useMcpDelivery } from '../hooks/useMcpDelivery'
 import SessionMenu from '../components/SessionMenu'
@@ -55,7 +56,7 @@ import { deleteNotes } from '../components/sessionWords'
 import Transcript from '../components/Transcript'
 import type { ItemEnv } from '../components/items/types'
 import type { Capabilities, DeleteResult, SessionDetail } from '../generated/protocol'
-import type { SessionSummary } from '../generated/view'
+import type { FamilyPage, SessionSummary } from '../generated/view'
 import type { Item } from '../generated/view'
 import { useAnnouncement } from '../hooks/useAnnouncement'
 import { isAnswerable } from '../lib/delivery'
@@ -231,7 +232,10 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   const client = useClient()
   const s = useSessionItems(id, timing)
   const mcp = useMcpDelivery(id, summary?.lifecycle, Math.max(0, s.loads - 1))
-  const info = useHeaderInfo(id, summary, awaitSummary, mcp.detail)
+  const [familyRead, setFamilyRead] = useState<{ id: string; page: FamilyPage } | null>(null)
+  const onFamilyPage = useCallback((page: FamilyPage) => setFamilyRead({ id, page }), [id])
+  const family = familyRead?.id === id && (!summary || (summary.hat_id === familyRead.page.summary.hat_id && summary.family?.revision === familyRead.page.summary.family?.revision)) ? familyRead.page : null
+  const info = useHeaderInfo(id, summary ?? family?.summary, awaitSummary, mcp.detail)
   const { search } = useLocation()
   const requested = new URLSearchParams(search).get('pending')
   const legacy = mcp.detail?.pending?.find(p => p.state === 'open' && !p.answered)?.pending_id
@@ -303,11 +307,12 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
       agent: agentLabel(info?.agent),
       hatName: (hat: string) => hats.get(hat),
       answers,
+      familyQuestions: family?.questions,
       onSendAgain,
       onAnswerAsMessage,
       composerEmpty,
     }),
-    [id, info?.agent, hats, answers, onSendAgain, onAnswerAsMessage, composerEmpty],
+    [id, info?.agent, hats, answers, family?.questions, onSendAgain, onAnswerAsMessage, composerEmpty],
   )
 
   // A deleted session's draft and images can never be sent: drop them, and
@@ -363,12 +368,14 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
           <SessionMenu
             id={id}
             lifecycle={info?.lifecycle}
+            family={info?.family}
             canPark={capabilities?.includes('park') ?? false}
             onDeleted={onDeleted}
             focusAfterDelete={() => back.current}
           />
         }
       />
+      <FamilyPanel key={id} id={id} summary={summary} hosts={hosts} resync={Math.max(0, s.loads - 1)} onPage={onFamilyPage} />
       <McpDelivery agent={info?.agent ?? mcp.detail?.agent} delivery={mcp.detail?.mcp_delivery} />
       {mcp.error && <p className="form-error"><Text>{mcp.error}</Text></p>}
       <div className="stream-state" role="status">
diff --git a/web/src/store/sessionList.ts b/web/src/store/sessionList.ts
index 59f78da1..245b213d 100644
--- a/web/src/store/sessionList.ts
+++ b/web/src/store/sessionList.ts
@@ -44,7 +44,7 @@ export interface ListState {
   /** The ids removed since this query's first page: a further page read
    *  before a removal never puts one back. A first page starts it over. */
   removed: ReadonlySet<string>
-  /** The server's count of the hat's sessions waiting on a question,
+  /** The server's count of the hat's sessions needing operator attention,
    *  whatever the query: the first page's, then each `waiting_changed`'s.
    *  Absent when the first page had none: the loaded rows are counted. */
   waiting?: number
@@ -134,7 +134,7 @@ export function shownOf(state: ListState, filters: ListFilters): SessionSummary[
 }
 
 /**
- * The sessions of the hat waiting on a question (`blocked || question_waits`):
+ * The sessions of the hat needing operator attention (`operator_attention > 0`):
  * the tab title's and the header badge's number, read by both through
  * `useSessionList().counts.waiting`. It is the hat's number, never a query's:
  * a search or a lifecycle filter leaves it as it was.
@@ -173,7 +173,7 @@ export function carryWaiting(held: ReadonlySet<string>, state: ListState, hat: s
   return ids
 }
 
-const isWaiting = (s: SessionSummary) => s.activity === 'blocked' || s.question_waits
+const isWaiting = (s: SessionSummary) => s.operator_attention !== undefined ? s.operator_attention > 0 : s.activity === 'blocked' || s.question_waits
 
 /** `held` with a page's rows: a row the stream sent later is kept. */
 function merge(held: Map<string, SessionSummary>, rows: readonly unknown[]): { all: Map<string, SessionSummary>; ids: string[] } {
diff --git a/web/src/store/useSessionList.ts b/web/src/store/useSessionList.ts
index 05b154ea..879b0346 100644
--- a/web/src/store/useSessionList.ts
+++ b/web/src/store/useSessionList.ts
@@ -250,8 +250,8 @@ export interface SessionList extends Omit<SessionListSnapshot, 'store'> {
   all: ReadonlyMap<string, SessionSummary>
   /** What the list shows, in order. */
   shown: SessionSummary[]
-  /** `waiting`: the sessions of the hat waiting on a question (blocked, or
-   *  a question open): the tab title's and the header badge's number. */
+  /** `waiting`: the hat's sessions needing operator attention, including
+   *  status-only reports: the tab title's and the header badge's number. */
   counts: { waiting: number }
   /** More pages exist. */
   hasMore: boolean
```

### Task 4: add opt-in real pinned-provider acceptance

Normal `cargo test -p hennery-testkit --test delegation_live --locked` performs no inference. Explicit `--ignored --exact --nocapture` provider runs require HENNERY_D4_PINNED_ADAPTER_ROOT, HENNERY_D4_PARENT, HENNERY_D4_CHILD and the necessary HENNERY_D4_CLAUDE_AUTH/HENNERY_D4_CODEX_AUTH credential-file paths. Pinned Claude ACP 0.81.0, Codex ACP 1.13.0 and native Codex 0.155.1 are verified. Run all four parent→child pairs and record configuration, elicitation, permissions, busy/park/reconnect/failure/closed-parent cases individually. No missing scenario is inferred from a passing base row.

```diff
diff --git a/crates/hennery-testkit/tests/delegation_live.rs b/crates/hennery-testkit/tests/delegation_live.rs
new file mode 100644
index 00000000..13b7fe66
--- /dev/null
+++ b/crates/hennery-testkit/tests/delegation_live.rs
@@ -0,0 +1,1343 @@
+//! Opt-in D4 provider acceptance. Normal tests never use credentials or infer.
+//!
+//! Supply HENNERY_D4_PINNED_ADAPTER_ROOT (the existing node_modules),
+//! HENNERY_D4_CLAUDE_AUTH and HENNERY_D4_CODEX_AUTH (explicit source files),
+//! HENNERY_D4_PARENT and HENNERY_D4_CHILD (claude/codex). Source credentials
+//! are copied with mode 0600 into disposable homes; source homes are never
+//! handed to an adapter. Run each pair with --ignored --exact --nocapture.
+//! A passing smoke check is not a passing parent/child matrix or release gate.
+
+use anyhow::{Context, Result, bail, ensure};
+use hennery_gateway::{api::GatewayState, key::KeySource, session::GatewayMcp};
+use hennery_host::{AgentCommand, HostConfig, identity::HostKey, profile::Profile};
+use hennery_kernel::{
+    egress::{Egress, Timeouts},
+    hosts::{Enrollment, Hosts},
+    operator::Operator,
+};
+use hennery_proto::{delegation_host::HostCatalog, frames::SessionConfig};
+use hennery_sessions::{AppState, store::Store};
+use rusqlite::OptionalExtension;
+use serde_json::{Value, json};
+use std::{
+    os::unix::fs::{OpenOptionsExt, PermissionsExt},
+    path::{Path, PathBuf},
+    sync::{
+        Arc, Mutex,
+        atomic::{AtomicBool, Ordering},
+    },
+    time::Duration,
+};
+
+const HOST: &str = "live-acceptance";
+const BOUND: Duration = Duration::from_secs(240);
+const TOOLS: &[&str] = &[
+    "session_capabilities",
+    "session_spawn",
+    "session_send",
+    "session_answer",
+    "session_status",
+    "session_list",
+    "session_close",
+];
+
+fn runtime(variable: &str) -> Result<String> {
+    let value = std::env::var(variable).with_context(|| format!("supply {variable}"))?;
+    ensure!(matches!(value.as_str(), "claude" | "codex"), "invalid runtime");
+    Ok(value)
+}
+
+fn stage_auth(source_variable: &str, destination: &Path) -> Result<()> {
+    let source = PathBuf::from(std::env::var(source_variable).with_context(|| format!("supply {source_variable}"))?);
+    ensure!(source.is_file(), "{source_variable} must name a credential file");
+    let bytes = std::fs::read(&source).context("read explicitly supplied credential file")?;
+    let value: Value = serde_json::from_slice(&bytes).context("credential file must contain JSON")?;
+    ensure!(value.is_object(), "credential file must contain a JSON object");
+    ensure!(
+        !bytes
+            .windows(b"sk-hennery-discovery-fixture".len())
+            .any(|part| part == b"sk-hennery-discovery-fixture"),
+        "discovery fixture is not provider authentication"
+    );
+    let mut output = std::fs::OpenOptions::new()
+        .write(true)
+        .create_new(true)
+        .mode(0o600)
+        .open(destination)?;
+    std::io::Write::write_all(&mut output, &bytes)?;
+    Ok(())
+}
+
+fn command(root: &Path, runtime: &str) -> Result<(AgentCommand, Profile)> {
+    let home = root.join(format!("{runtime}-home"));
+    for leaf in [
+        "",
+        "config",
+        "data",
+        "cache",
+        "state",
+        "claude",
+        "codex",
+        "codex-sqlite",
+    ] {
+        std::fs::create_dir_all(home.join(leaf))?;
+    }
+    std::fs::set_permissions(&home, std::fs::Permissions::from_mode(0o700))?;
+    let adapters =
+        PathBuf::from(std::env::var("HENNERY_D4_PINNED_ADAPTER_ROOT").context("supply pinned node_modules")?);
+    let node = std::env::split_paths(&std::env::var_os("PATH").context("PATH missing")?)
+        .map(|directory| directory.join("node"))
+        .find(|file| file.is_file())
+        .context("node missing from dev shell")?;
+    hennery_testkit::first_exec(node.to_str().context("node path encoding")?);
+    let mut env = vec![
+        ("HOME".into(), home.display().to_string()),
+        ("XDG_CONFIG_HOME".into(), home.join("config").display().to_string()),
+        ("XDG_DATA_HOME".into(), home.join("data").display().to_string()),
+        ("XDG_CACHE_HOME".into(), home.join("cache").display().to_string()),
+        ("XDG_STATE_HOME".into(), home.join("state").display().to_string()),
+        ("CLAUDE_CONFIG_DIR".into(), home.join("claude").display().to_string()),
+        ("CODEX_HOME".into(), home.join("codex").display().to_string()),
+        (
+            "CODEX_SQLITE_HOME".into(),
+            home.join("codex-sqlite").display().to_string(),
+        ),
+    ];
+    // Prevent accidental provider/config inheritance. Only the explicitly staged
+    // auth file supplies identity; neither discovery fixture keys nor runner
+    // routing overrides can make this look like a live vendor acceptance.
+    for variable in [
+        "SSL_CERT_FILE",
+        "SSL_CERT_DIR",
+        "HENNERY_DATA_DIR",
+        "HENNERY_HOST_DATA_DIR",
+        "ANTHROPIC_API_KEY",
+        "ANTHROPIC_AUTH_TOKEN",
+        "CLAUDE_CODE_OAUTH_TOKEN",
+        "OPENAI_API_KEY",
+        "CODEX_API_KEY",
+        "ANTHROPIC_BASE_URL",
+        "OPENAI_BASE_URL",
+        "CLAUDE_CODE_USE_BEDROCK",
+        "CLAUDE_CODE_USE_VERTEX",
+    ] {
+        env.push((variable.into(), String::new()));
+    }
+    let (package, version, profile) = if runtime == "claude" {
+        stage_auth("HENNERY_D4_CLAUDE_AUTH", &home.join("claude/.credentials.json"))?;
+        std::fs::write(home.join("claude.json"), br#"{"hasCompletedOnboarding":true}"#)?;
+        ("claude-agent-acp", "0.81.0", Profile::Claude)
+    } else {
+        stage_auth("HENNERY_D4_CODEX_AUTH", &home.join("codex/auth.json"))?;
+        let arch = if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
+            "darwin-arm64/node_modules/@openai/codex/vendor/aarch64-apple-darwin"
+        } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
+            "linux-x64/node_modules/@openai/codex/vendor/x86_64-unknown-linux-musl"
+        } else {
+            bail!("supply the supported pinned native Codex platform")
+        };
+        let binary = adapters.join(format!(".pnpm/@openai+codex@0.155.1-{arch}/bin/codex"));
+        ensure!(binary.is_file(), "pinned native Codex 0.155.1 is missing");
+        hennery_testkit::first_exec(binary.to_str().context("Codex path encoding")?);
+        env.push(("CODEX_PATH".into(), binary.display().to_string()));
+        ("codex-acp", "1.13.0", Profile::Codex)
+    };
+    let entry = adapters.join(format!("@agentclientprotocol/{package}"));
+    let metadata: Value = serde_json::from_slice(&std::fs::read(entry.join("package.json"))?)?;
+    ensure!(
+        metadata["version"] == version,
+        "adapter version differs from accepted pin"
+    );
+    Ok((
+        AgentCommand {
+            program: node.display().to_string(),
+            args: vec![entry.join("dist/index.js").display().to_string()],
+            env,
+        },
+        profile,
+    ))
+}
+
+struct Harness {
+    dir: tempfile::TempDir,
+    state: AppState,
+    client: reqwest::Client,
+    url: String,
+    parent: String,
+    trace: Arc<Mutex<Vec<Value>>>,
+    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
+    host: tokio::task::JoinHandle<anyhow::Result<()>>,
+    server: tokio::task::JoinHandle<()>,
+    approve_builtin: AtomicBool,
+}
+impl Drop for Harness {
+    fn drop(&mut self) {
+        if let Some(shutdown) = self.shutdown.take() {
+            let _ = shutdown.send(());
+        }
+        self.state.shutdown.cancel();
+        self.server.abort();
+    }
+}
+impl Harness {
+    async fn new(parent_runtime: &str, child_runtime: Option<&str>) -> Result<Self> {
+        let dir = tempfile::tempdir()?;
+        let root = dir.path().canonicalize()?;
+        let db = root.join("hennery.db");
+        let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).await?;
+        let url = format!("http://{}", listener.local_addr()?);
+        let key = HostKey::from_seed([23; 32]);
+        let hosts = Hosts::open(&db)?;
+        hosts.register(
+            HOST,
+            &Enrollment {
+                public_key: key.public_key_hex(),
+                name: "acceptance".into(),
+                host_version: "acceptance".into(),
+                platform: "acceptance".into(),
+            },
+            0,
+        )?;
+        let hat = hosts.host(HOST)?.context("registered host")?.default_hat_id;
+        let state = AppState::new(Store::open(&db)?, hosts, Operator::open(&db)?);
+        let now = hennery_kernel::secret::unix_now();
+        let setup = state.operator.issue_setup_token(now)?.context("setup token")?;
+        state
+            .operator
+            .set_up(&setup, hennery_testkit::OWNER_PASSWORD, &url, now)?;
+        let phc = state
+            .operator
+            .verify_password(hennery_testkit::OWNER_PASSWORD)?
+            .context("password")?;
+        let session = state
+            .operator
+            .open_session("live-acceptance", &phc, now)?
+            .context("operator session")?;
+        let mut headers = reqwest::header::HeaderMap::new();
+        headers.insert(reqwest::header::ORIGIN, url.parse()?);
+        headers.insert(reqwest::header::COOKIE, format!("hennery_session={session}").parse()?);
+        let client = reqwest::Client::builder().no_proxy().default_headers(headers).build()?;
+        let keys = KeySource::from_vars(&root, Some("23".repeat(32).into()), None)?;
+        let gateway: GatewayState = hennery_gateway::open(
+            &db,
+            &keys,
+            state.operator.clone(),
+            Egress::new(Timeouts::DEFAULT)?,
+            Arc::new(hennery_gateway::notify::Silent),
+        )?;
+        state
+            .store
+            .set_session_mcp(Arc::new(GatewayMcp::for_collector(&gateway)));
+        gateway.runtime.store.set_session_tools(&hat, true)?;
+        let trace: Arc<Mutex<Vec<Value>>> = Arc::default();
+        let observed = trace.clone();
+        let auth = gateway.runtime.store.clone();
+        let builtin = hennery_sessions::builtin::router(state.clone(), gateway).layer(axum::middleware::from_fn(
+            move |request: axum::extract::Request, next: axum::middleware::Next| {
+                let observed = observed.clone(); let auth = auth.clone();
+                async move {
+                    let caller = request.headers().get("authorization").and_then(|h| h.to_str().ok()).and_then(|h| h.strip_prefix("Bearer ")).and_then(|t| auth.authenticate_session(t).ok().flatten()).map(|i| {
+                        let hennery_gateway::scope::PrincipalKind::Session { session_id, .. } = i.principal.kind; session_id
+                    });
+                    let (parts, body) = request.into_parts();
+                    let bytes = axum::body::to_bytes(body, hennery_gateway::proxy::MAX_REQUEST_BODY).await.unwrap();
+                    let input: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
+                    let response = next.run(axum::extract::Request::from_parts(parts, axum::body::Body::from(bytes))).await;
+                    let (parts, body) = response.into_parts();
+                    let bytes = axum::body::to_bytes(body, 1024 * 1024).await.unwrap();
+                    let output: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
+                    // Never persist bearer, arguments, free text, errors or cookies.
+                    let method = input["method"].as_str().filter(|s| matches!(*s, "initialize" | "tools/list" | "tools/call"));
+                    let tool = input["params"]["name"].as_str().filter(|s| TOOLS.contains(s));
+                    let names = output["result"]["tools"].as_array().map(|tools| tools.iter().filter_map(|t| t["name"].as_str().filter(|s| TOOLS.contains(s))).collect::<Vec<_>>());
+                    observed.lock().unwrap().push(json!({"caller":caller,"method":method,"tool":tool,"status":parts.status.as_u16(),"is_error":output["result"]["isError"].as_bool(),"rpc_error":output["error"]["code"].as_i64(),"tools":names,"fields":input.as_object().map(|object| object.keys().collect::<Vec<_>>()),"param_fields":input["params"].as_object().map(|object| object.keys().collect::<Vec<_>>()),"meta_fields":input["params"]["_meta"].as_object().map(|object| object.keys().collect::<Vec<_>>())}));
+                    axum::response::Response::from_parts(parts, axum::body::Body::from(bytes))
+                }
+            }
+        ));
+        let router = hennery_sessions::router(state.clone()).merge(builtin);
+        let server = tokio::spawn(async move {
+            axum::serve(
+                listener,
+                router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
+            )
+            .await
+            .unwrap();
+        });
+        let mut config = HostConfig::new(
+            format!("{}/api/hosts/ws", url.replacen("http:", "ws:", 1)),
+            HOST,
+            key,
+            root.join("host-data"),
+        );
+        config.workspace_roots = vec![root.clone()];
+        config.git = None;
+        for runtime in ["claude", "codex"]
+            .into_iter()
+            .filter(|runtime| *runtime == parent_runtime || Some(*runtime) == child_runtime)
+        {
+            let (command, profile) = command(&root, runtime)?;
+            config.agents.insert(runtime.into(), command);
+            config.profiles.insert(runtime.into(), profile);
+        }
+        let (shutdown, signal) = tokio::sync::oneshot::channel();
+        let host = tokio::spawn(hennery_host::run_until(config, async {
+            let _ = signal.await;
+        }));
+        let mut h = Self {
+            dir,
+            state,
+            client,
+            url,
+            parent: String::new(),
+            trace,
+            shutdown: Some(shutdown),
+            host,
+            server,
+            approve_builtin: AtomicBool::new(true),
+        };
+        h.wait("host ready", || h.state.hub.is_ready(HOST).then_some(()))
+            .await?;
+        hennery_sessions::delegation_worker::after_startup(&h.state);
+        let catalog = h.catalog(parent_runtime).await?;
+        println!(
+            "{}",
+            json!({"phase":"catalog","runtime":parent_runtime,"config_options":catalog.config_options,"defaults":catalog.defaults,"security":catalog.security})
+        );
+        let response = h.client.post(format!("{}/api/sessions", h.url)).json(&json!({"host_id":HOST,"agent":parent_runtime,"cwd":root,"mode":if parent_runtime == "codex" {"read-only"} else {"default"}})).send().await?;
+        ensure!(
+            response.status() == reqwest::StatusCode::ACCEPTED,
+            "parent start HTTP {}",
+            response.status()
+        );
+        h.parent = response.json::<Value>().await?["session_id"]
+            .as_str()
+            .context("parent session id")?
+            .into();
+        h.wait("parent attach", || {
+            h.state
+                .store
+                .find_session(&h.parent)
+                .ok()
+                .flatten()
+                .filter(|s| s.lifecycle == "active")
+                .map(|_| ())
+        })
+        .await?;
+        Ok(h)
+    }
+    async fn wait<T>(&self, phase: &str, mut predicate: impl FnMut() -> Option<T>) -> Result<T> {
+        let result = tokio::time::timeout(BOUND, async {
+            loop {
+                if let Some(value) = predicate() {
+                    println!("{}", json!({"phase":phase}));
+                    return Ok(value);
+                }
+                if self
+                    .trace
+                    .lock()
+                    .unwrap()
+                    .iter()
+                    .any(|row| row["method"] == "tools/call" && row["rpc_error"].is_number())
+                {
+                    self.diagnostics(phase)?;
+                    bail!("actual adapter tools/call was refused at protocol parsing");
+                }
+                if phase == "genuine child elicitation"
+                    && let Some(child) = self.child()
+                {
+                    let events = self.state.store.events(&child, 0, 1000)?;
+                    if events.iter().any(|event| event.kind == "turn_ended")
+                        && !events.iter().any(|event| event.kind == "pending_opened")
+                    {
+                        bail!("child completed without a genuine ACP elicitation; prose is not answer evidence");
+                    }
+                }
+                self.approve_parent_tools().await?;
+                tokio::time::sleep(Duration::from_millis(100)).await;
+            }
+        })
+        .await;
+        match result {
+            Ok(value) => value,
+            Err(_) => {
+                self.diagnostics(phase)?;
+                bail!(
+                    "{phase} exceeded {} seconds; scrubbed diagnostics printed",
+                    BOUND.as_secs()
+                )
+            }
+        }
+    }
+    async fn approve_parent_tools(&self) -> Result<()> {
+        if self.parent.is_empty() || !self.approve_builtin.load(Ordering::SeqCst) {
+            return Ok(());
+        }
+        for question in self.state.store.open_pending(&self.parent)? {
+            if question.answered || question.kind != hennery_proto::frames::PendingKind::Permission {
+                continue;
+            }
+            let updates: Vec<_> = self
+                .state
+                .store
+                .events(&self.parent, 0, 1000)?
+                .into_iter()
+                .filter_map(|event| event.body.pointer("/payload/update").cloned())
+                .collect();
+            let allowed = builtin_permission(&question.payload, &updates);
+            ensure!(
+                allowed,
+                "unexpected parent permission; harness authorizes only named built-in MCP tools"
+            );
+            let option = question.payload["options"]
+                .as_array()
+                .and_then(|options| options.iter().find(|option| option["kind"] == "allow_once"))
+                .and_then(|option| option["optionId"].as_str())
+                .context("parent MCP permission lacks allow_once")?;
+            let response = self
+                .client
+                .post(format!(
+                    "{}/api/sessions/{}/pending/{}/answer",
+                    self.url, self.parent, question.pending_id
+                ))
+                .json(&json!({"option_id":option}))
+                .send()
+                .await?;
+            ensure!(
+                response.status() == reqwest::StatusCode::ACCEPTED,
+                "parent MCP permission answer HTTP {}",
+                response.status()
+            );
+        }
+        Ok(())
+    }
+    fn diagnostics(&self, phase: &str) -> Result<()> {
+        let events = if self.parent.is_empty() {
+            vec![]
+        } else {
+            self.state.store.events(&self.parent, 0, 1000)?
+        };
+        let messages: Vec<_> = events
+            .iter()
+            .filter(|e| e.kind == "turn_ended" || e.kind == "start_failed")
+            .filter_map(|e| {
+                e.body
+                    .get("error")
+                    .or_else(|| e.body.get("message"))
+                    .and_then(Value::as_str)
+            })
+            .map(scrub_error)
+            .collect::<Result<_>>()?;
+        let text = messages.join(" ").to_lowercase();
+        let known = [
+            "authentication_error",
+            "invalid_api_key",
+            "unauthorized",
+            "rate_limit",
+            "insufficient_quota",
+            "token_expired",
+            "certificate",
+            "connection refused",
+        ];
+        let errors: Vec<_> = known.into_iter().filter(|error| text.contains(error)).collect();
+        let kinds: Vec<_> = events.iter().map(|e| e.kind.as_str()).collect();
+        println!(
+            "{}",
+            json!({"phase":phase,"error_classes":errors,"errors":messages,"event_kinds":kinds,"mcp":*self.trace.lock().unwrap()})
+        );
+        if let Some(child) = self.child() {
+            let events = self.state.store.events(&child, 0, 1000)?;
+            println!(
+                "{}",
+                json!({"phase":"child_diagnostics","assistant":scrub_error(&assistant_text(&events))?,"event_kinds":events.iter().map(|event|event.kind.as_str()).collect::<Vec<_>>()})
+            );
+        }
+        Ok(())
+    }
+    async fn catalog(&self, agent: &str) -> Result<HostCatalog> {
+        let response = self
+            .client
+            .get(format!("{}/api/hosts/{HOST}/runtime-catalog", self.url))
+            .query(&[
+                ("agent", agent),
+                ("cwd", self.dir.path().to_str().context("cwd encoding")?),
+            ])
+            .send()
+            .await?;
+        ensure!(response.status().is_success(), "catalog HTTP {}", response.status());
+        Ok(response.json().await?)
+    }
+    async fn prompt(&self, id: &str, text: &str) -> Result<String> {
+        let response = self
+            .client
+            .post(format!("{}/api/sessions/{id}/prompt", self.url))
+            .json(&json!({"content":[{"type":"text","text":text}]}))
+            .send()
+            .await?;
+        ensure!(
+            response.status() == reqwest::StatusCode::ACCEPTED,
+            "prompt HTTP {}",
+            response.status()
+        );
+        Ok(response.json::<Value>().await?["turn_id"]
+            .as_str()
+            .context("turn id")?
+            .into())
+    }
+    fn child(&self) -> Option<String> {
+        hennery_kernel::db::open(&self.dir.path().join("hennery.db"))
+            .ok()?
+            .query_row(
+                "SELECT child_id FROM session_families WHERE owner_id=?1 AND parent_id=?2 AND detached=0 LIMIT 1",
+                rusqlite::params![self.state.store.owner_id(), self.parent],
+                |r| r.get(0),
+            )
+            .optional()
+            .ok()
+            .flatten()
+    }
+    async fn finish(mut self) -> Result<()> {
+        if let Some(shutdown) = self.shutdown.take() {
+            let _ = shutdown.send(());
+        }
+        tokio::time::timeout(Duration::from_secs(30), &mut self.host).await???;
+        self.state.shutdown.cancel();
+        Ok(())
+    }
+    async fn action(&self, session: &str, action: &str) -> Result<()> {
+        let response = self
+            .client
+            .post(format!("{}/api/sessions/{session}/{action}", self.url))
+            .send()
+            .await?;
+        ensure!(response.status().is_success(), "{action} HTTP {}", response.status());
+        Ok(())
+    }
+    async fn set_axis(&self, session: &str, id: &str, value: &str) -> Result<()> {
+        let response = self
+            .client
+            .post(format!("{}/api/sessions/{session}/config", self.url))
+            .json(&json!({"config_id":id,"value":value}))
+            .send()
+            .await?;
+        ensure!(
+            response.status() == reqwest::StatusCode::ACCEPTED,
+            "config switch HTTP {}",
+            response.status()
+        );
+        ensure!(
+            self.state
+                .store
+                .catalog(session)?
+                .context("actual catalog after switch")?
+                .current
+                .axes
+                .get(id)
+                == Some(&hennery_proto::frames::ConfigValue::Id(value.into())),
+            "config switch was not actually read back"
+        );
+        Ok(())
+    }
+    fn question(
+        &self,
+        session: &str,
+        after: i64,
+        kind: hennery_proto::frames::PendingKind,
+    ) -> Option<hennery_proto::rest::PendingItem> {
+        self.state
+            .store
+            .events(session, after, 1000)
+            .ok()?
+            .iter()
+            .filter(|event| event.kind == "pending_opened")
+            .filter_map(|event| event.body["pending_id"].as_str())
+            .filter_map(|id| self.state.store.pending_item(id).ok().flatten())
+            .find(|question| question.kind == kind)
+    }
+    async fn question_for_turn(
+        &self,
+        session: &str,
+        turn: &str,
+        after: i64,
+        kind: hennery_proto::frames::PendingKind,
+        phase: &str,
+    ) -> Result<hennery_proto::rest::PendingItem> {
+        self.wait(phase, || {
+            if let Some(question) = self.question(session, after, kind) {
+                return Some(Ok(question));
+            }
+            self.state.store.ended_turn_outcome(turn).ok().flatten().map(|outcome| {
+                Err(anyhow::anyhow!(
+                    "provider turn {outcome:?} without the required genuine question"
+                ))
+            })
+        })
+        .await?
+    }
+    async fn idle(&self, session: &str) -> Result<()> {
+        self.wait("session idle",||{
+            let row = self.state.store.find_session(session).ok().flatten()?;
+            if row.lifecycle != "active" || row.activity.as_deref() != Some("idle") || row.open_turn_id.is_some() { return None; }
+            let conn = hennery_kernel::db::open(&self.dir.path().join("hennery.db")).ok()?;
+            let quiet: bool = conn.query_row("SELECT NOT EXISTS(SELECT 1 FROM delegation_notices WHERE owner_id=?1 AND parent_id=?2 AND state IN ('parent_queued','waiting_config','awaiting_reconciliation'))",rusqlite::params![self.state.store.owner_id(),session],|row|row.get(0)).ok()?;
+            quiet.then_some(())
+        }).await
+    }
+    async fn answer_permission(
+        &self,
+        session: &str,
+        question: &hennery_proto::rest::PendingItem,
+        allow: bool,
+    ) -> Result<()> {
+        ensure!(
+            question.kind == hennery_proto::frames::PendingKind::Permission,
+            "permission only"
+        );
+        let kind = if allow { "allow_once" } else { "reject_once" };
+        let option = question.payload["options"]
+            .as_array()
+            .and_then(|options| options.iter().find(|option| option["kind"] == kind))
+            .and_then(|option| option["optionId"].as_str())
+            .context("expected one-shot permission option")?;
+        let response = self
+            .client
+            .post(format!(
+                "{}/api/sessions/{session}/pending/{}/answer",
+                self.url, question.pending_id
+            ))
+            .json(&json!({"option_id":option}))
+            .send()
+            .await?;
+        ensure!(
+            response.status() == reqwest::StatusCode::ACCEPTED,
+            "operator permission HTTP {}",
+            response.status()
+        );
+        self.wait("operator permission delivered", || {
+            self.state
+                .store
+                .pending_item(&question.pending_id)
+                .ok()
+                .flatten()
+                .filter(|pending| pending.delivered == Some(true))
+        })
+        .await?;
+        Ok(())
+    }
+    fn token_hash(&self, session: &str) -> Result<Option<String>> {
+        Ok(hennery_kernel::db::open(&self.dir.path().join("hennery.db"))?
+            .query_row(
+                "SELECT token_hash FROM gw_session_tokens WHERE owner_id=?1 AND session_id=?2 AND revoked_at IS NULL",
+                rusqlite::params![self.state.store.owner_id(), session],
+                |row| row.get(0),
+            )
+            .optional()?)
+    }
+    fn capture(&self, child: &str) -> Result<()> {
+        let Ok(file) = std::env::var("HENNERY_D4_CAPTURE") else {
+            return Ok(());
+        };
+        let events = scrub_events(self.state.store.events(child, 0, 1000)?);
+        let mut text = String::new();
+        for event in events {
+            text.push_str("event: event\ndata: ");
+            text.push_str(&serde_json::to_string(&event)?);
+            text.push_str("\n\n");
+        }
+        let root = self.dir.path().canonicalize()?.display().to_string();
+        text = redact_credentials(&text)?
+            .replace(&root, "/tmp/smoke")
+            .replace(&self.dir.path().display().to_string(), "/tmp/smoke")
+            .replace(&root.replace('/', "-"), "-tmp-smoke")
+            .replace(&self.dir.path().display().to_string().replace('/', "-"), "-tmp-smoke");
+        let mut output = std::fs::OpenOptions::new()
+            .write(true)
+            .create_new(true)
+            .mode(0o600)
+            .open(file)?;
+        std::io::Write::write_all(&mut output, text.as_bytes())?;
+        Ok(())
+    }
+    async fn extended(&self, child: &str, child_runtime: &str, child_pid: u32) -> Result<()> {
+        use hennery_proto::frames::PendingKind;
+        self.idle(child).await?;
+        self.idle(&self.parent).await?;
+        if child_runtime == "codex" {
+            self.set_axis(child, "collaboration_mode", "default").await?;
+        }
+        let path = self.dir.path().canonicalize()?.join("permission-denied.txt");
+        let after = self.state.store.max_event_id()?;
+        let execution = json!({"cmd":format!("printf test > '{}'",path.display()),"sandbox_permissions":"require_escalated","justification":"D4 scratch operator-denial acceptance"});
+        let turn = self.prompt(child,&format!("New operator acceptance task, superseding the earlier no-shell restriction only for this scratch command: call exec_command with exactly these arguments: {execution}. You MUST request real operator approval through the tool; do not describe or simulate it. Do not change mode or policy or write by another means. The operator will deny this once. After denial do not retry and reply PERMISSION_DENIED_OK.")).await?;
+        let permission = self
+            .question_for_turn(child, &turn, after, PendingKind::Permission, "genuine child permission")
+            .await?;
+        self.wait("permission routes to operator", || {
+            self.state
+                .store
+                .operator_attention(None, "")
+                .ok()?
+                .into_iter()
+                .find(|attention| attention.pending_id.as_deref() == Some(&permission.pending_id))
+        })
+        .await?;
+        ensure!(!permission.answered, "parent must not answer a permission");
+        self.answer_permission(child, &permission, false).await?;
+        self.wait("denied child turn ends", || {
+            self.state.store.ended_turn_outcome(&turn).ok().flatten()
+        })
+        .await?;
+        ensure!(!path.exists(), "operator denial must prevent the edit");
+        println!("{}", json!({"case":"operator_permission_fallback","passed":true}));
+
+        self.idle(child).await?;
+        self.idle(&self.parent).await?;
+        self.approve_builtin.store(false, Ordering::SeqCst);
+        let after = self.state.store.max_event_id()?;
+        let busy = self.prompt(&self.parent,"Call session_list exactly once using the hennery MCP tool, then reply BUSY_RELEASED. Do not call any other tools.").await?;
+        let held = self
+            .question_for_turn(
+                &self.parent,
+                &busy,
+                after,
+                PendingKind::Permission,
+                "parent busy at real MCP approval",
+            )
+            .await?;
+        let updates: Vec<_> = self
+            .state
+            .store
+            .events(&self.parent, 0, 1000)?
+            .into_iter()
+            .filter_map(|event| event.body.pointer("/payload/update").cloned())
+            .collect();
+        ensure!(
+            builtin_permission(&held.payload, &updates),
+            "busy boundary must be a real known built-in call"
+        );
+        let report_turn = self
+            .prompt(child, "Reply exactly CHILD_BUSY_REPORT without using tools.")
+            .await?;
+        self.wait("busy child report source", || {
+            self.state.store.ended_turn_outcome(&report_turn).ok().flatten()
+        })
+        .await?;
+        self.wait("report queued while parent busy",||{
+            let conn = hennery_kernel::db::open(&self.dir.path().join("hennery.db")).ok()?;
+            conn.query_row("SELECT EXISTS(SELECT 1 FROM delegation_notices WHERE owner_id=?1 AND child_id=?2 AND source_turn=?3 AND state='parent_queued')",rusqlite::params![self.state.store.owner_id(),child,report_turn],|row|row.get::<_,bool>(0)).ok()?.then_some(())
+        }).await?;
+        ensure!(
+            self.state
+                .store
+                .find_session(&self.parent)?
+                .context("parent")?
+                .open_turn_id
+                .as_deref()
+                == Some(&busy),
+            "notice must not overlap the active parent turn"
+        );
+        self.answer_permission(&self.parent, &held, true).await?;
+        self.approve_builtin.store(true, Ordering::SeqCst);
+        self.wait("busy report delivered after parent release",||{
+            let conn = hennery_kernel::db::open(&self.dir.path().join("hennery.db")).ok()?;
+            conn.query_row("SELECT EXISTS(SELECT 1 FROM delegation_notices WHERE owner_id=?1 AND child_id=?2 AND source_turn=?3 AND state='parent_delivered')",rusqlite::params![self.state.store.owner_id(),child,report_turn],|row|row.get::<_,bool>(0)).ok()?.then_some(())
+        }).await?;
+        println!("{}", json!({"case":"busy_parent_report_delivery","passed":true}));
+
+        self.idle(child).await?;
+        self.idle(&self.parent).await?;
+        if child_runtime == "codex" {
+            self.set_axis(child, "collaboration_mode", "plan").await?;
+        }
+        let token = self.token_hash(&self.parent)?.context("parent current token")?;
+        self.action(&self.parent, "park").await?;
+        ensure!(
+            self.state
+                .store
+                .find_session(&self.parent)?
+                .context("parked parent")?
+                .lifecycle
+                == "parked",
+            "parent must be genuinely parked"
+        );
+        ensure!(
+            self.token_hash(&self.parent)?.is_none(),
+            "park must revoke the old token"
+        );
+        let after = self.state.store.max_event_id()?;
+        let turn = self.prompt(child, question_brief(child_runtime)).await?;
+        let question = self
+            .question_for_turn(
+                child,
+                &turn,
+                after,
+                PendingKind::Elicitation,
+                "parked-parent child elicitation",
+            )
+            .await?;
+        self.wait("parked parent answers after automatic resume", || {
+            self.state
+                .store
+                .pending_item(&question.pending_id)
+                .ok()
+                .flatten()
+                .filter(|pending| pending.delivered == Some(true))
+        })
+        .await?;
+        ensure!(
+            self.token_hash(&self.parent)?.is_some_and(|rotated| rotated != token),
+            "automatic resume must rotate the session token"
+        );
+        let resumed = self.state.store.events(&self.parent, after, 1000)?;
+        let first_prompt = resumed
+            .iter()
+            .find(|event| event.kind == "user_turn")
+            .context("resumed notice prompt")?;
+        ensure!(
+            resumed.iter().any(|event| event.event_id < first_prompt.event_id
+                && event.body.pointer("/indexed/config_evidence/completeness") == Some(&json!("complete"))),
+            "fresh resume config evidence must precede notice prompt"
+        );
+        println!(
+            "{}",
+            json!({"case":"parked_parent_resume_config_token_rotation","passed":true})
+        );
+
+        let old = self.state.hub.routable_conn(HOST).context("current host connection")?;
+        ensure!(
+            self.state.hub.disconnect_and_wait(HOST, Duration::from_secs(30)).await,
+            "scratch collector socket did not close"
+        );
+        self.wait("collector-side reconnect and reconciliation", || {
+            self.state
+                .hub
+                .routable_conn(HOST)
+                .filter(|connection| *connection != old)
+                .filter(|_| self.state.hub.is_ready(HOST))
+        })
+        .await?;
+        println!(
+            "{}",
+            json!({"case":"collector_socket_reconnect","passed":true,"collector_process_restart":false})
+        );
+
+        self.idle(child).await?;
+        self.idle(&self.parent).await?;
+        ensure!(
+            node_pids()?.contains(&child_pid),
+            "child adapter PID must still belong directly to this test"
+        );
+        let after = self.state.store.max_event_id()?;
+        // Only the node process started after this test's parent adapter was
+        // recorded. Its supervisor exercises the real crash/loss/coalescing path.
+        ensure!(
+            unsafe { libc::kill(i32::try_from(child_pid)?, libc::SIGKILL) } == 0,
+            "kill own child adapter"
+        );
+        self.wait("real child adapter failure", || {
+            self.state
+                .store
+                .find_session(child)
+                .ok()
+                .flatten()
+                .filter(|row| row.lifecycle == "parked" || row.lifecycle == "failed")
+        })
+        .await?;
+        self.wait("child failure produces a durable notice",||{
+            let conn = hennery_kernel::db::open(&self.dir.path().join("hennery.db")).ok()?;
+            conn.query_row("SELECT COUNT(*) = 1 FROM delegation_notices WHERE owner_id=?1 AND child_id=?2 AND source_event_id>?3 AND kind='session_unavailable'",rusqlite::params![self.state.store.owner_id(),child,after],|row|row.get::<_,bool>(0)).ok()?.then_some(())
+        }).await?;
+        println!("{}", json!({"case":"actual_child_adapter_failure","passed":true}));
+
+        self.idle(&self.parent).await?;
+        self.action(&self.parent, "close").await?;
+        ensure!(
+            self.state
+                .store
+                .find_session(&self.parent)?
+                .context("closed parent")?
+                .lifecycle
+                == "closed",
+            "parent must actually close"
+        );
+        self.action(child, "resume").await?;
+        self.idle(child).await?;
+        let after = self.state.store.max_event_id()?;
+        let turn = self.prompt(child, question_brief(child_runtime)).await?;
+        let question = self
+            .question_for_turn(
+                child,
+                &turn,
+                after,
+                PendingKind::Elicitation,
+                "closed-parent child elicitation",
+            )
+            .await?;
+        self.wait("closed-parent question falls back to operator", || {
+            self.state
+                .store
+                .operator_attention(None, "")
+                .ok()?
+                .into_iter()
+                .find(|attention| attention.pending_id.as_deref() == Some(&question.pending_id))
+        })
+        .await?;
+        ensure!(
+            self.state
+                .store
+                .find_session(&self.parent)?
+                .context("closed parent after fallback")?
+                .lifecycle
+                == "closed",
+            "fallback must not reopen the parent"
+        );
+        println!("{}", json!({"case":"closed_parent_operator_fallback","passed":true}));
+        Ok(())
+    }
+}
+
+fn node_pids() -> Result<Vec<u32>> {
+    let output = std::process::Command::new("/bin/ps")
+        .args(["-Ao", "pid=,ppid=,comm="])
+        .output()?;
+    ensure!(output.status.success(), "inspect own adapter PIDs");
+    Ok(String::from_utf8(output.stdout)?
+        .lines()
+        .filter_map(|line| {
+            let mut fields = line.split_whitespace();
+            let pid = fields.next()?.parse().ok()?;
+            let parent: u32 = fields.next()?.parse().ok()?;
+            let binary = fields.next()?;
+            (parent == std::process::id() && Path::new(binary).file_name()?.to_str()? == "node").then_some(pid)
+        })
+        .collect())
+}
+
+fn process_token_exposure() -> Result<Vec<Value>> {
+    let output = std::process::Command::new("/bin/ps")
+        .args(["-Ao", "pid=,ppid=,comm="])
+        .output()?;
+    ensure!(output.status.success(), "inspect own process tree");
+    let rows: Vec<(u32, u32, String)> = String::from_utf8(output.stdout)?
+        .lines()
+        .filter_map(|line| {
+            let mut fields = line.split_whitespace();
+            Some((
+                fields.next()?.parse().ok()?,
+                fields.next()?.parse().ok()?,
+                fields.next()?.to_owned(),
+            ))
+        })
+        .collect();
+    let mut own = vec![std::process::id()];
+    loop {
+        let before = own.len();
+        for (pid, parent, _) in &rows {
+            if own.contains(parent) && !own.contains(pid) {
+                own.push(*pid);
+            }
+        }
+        if own.len() == before {
+            break;
+        }
+    }
+    let mut result = vec![];
+    for (pid, _, binary) in rows {
+        if !own.contains(&pid)
+            || !Path::new(&binary)
+                .file_name()
+                .and_then(|name| name.to_str())
+                .is_some_and(|name| matches!(name, "node" | "codex" | "claude"))
+        {
+            continue;
+        }
+        let output = std::process::Command::new("/bin/ps")
+            .args(["-ww", "-p", &pid.to_string(), "-o", "command="])
+            .output()?;
+        if !output.status.success() {
+            continue;
+        }
+        let arguments = String::from_utf8(output.stdout)?;
+        let role = if arguments.contains("@agentclientprotocol/claude-agent-acp/") {
+            "claude_adapter"
+        } else if arguments.contains("@agentclientprotocol/codex-acp/") {
+            "codex_adapter"
+        } else {
+            Path::new(&binary)
+                .file_name()
+                .and_then(|name| name.to_str())
+                .unwrap_or("runtime")
+        };
+        // Raw argv never leaves this function. Only presence booleans are evidence.
+        result.push(json!({"process":role,"bearer_in_argv":arguments.to_ascii_lowercase().contains("bearer "),"authorization_header_in_argv":arguments.to_ascii_lowercase().contains("authorization")}));
+    }
+    Ok(result)
+}
+
+fn scrub_capture(value: &mut Value) {
+    match value {
+        Value::Object(object) => {
+            for (key, value) in object {
+                let key = key.to_ascii_lowercase();
+                if key.contains("authorization")
+                    || key.contains("token")
+                    || matches!(
+                        key.as_str(),
+                        "headers" | "http_headers" | "cookie" | "set-cookie" | "api_key"
+                    )
+                {
+                    *value = json!("[redacted]");
+                } else {
+                    scrub_capture(value);
+                }
+            }
+        }
+        Value::Array(values) => {
+            for value in values {
+                scrub_capture(value);
+            }
+        }
+        Value::String(text) if text.to_ascii_lowercase().contains("bearer") => *value = json!("[redacted bearer]"),
+        _ => {}
+    }
+}
+
+fn scrub_events(events: Vec<hennery_proto::rest::EventDto>) -> Vec<hennery_proto::rest::EventDto> {
+    events
+        .into_iter()
+        .filter(|event| {
+            event.body.pointer("/payload/update/sessionUpdate") != Some(&json!("available_commands_update"))
+        })
+        .map(|mut event| {
+            scrub_capture(&mut event.body);
+            event
+        })
+        .collect()
+}
+
+#[test]
+fn captured_acp_removes_headers_and_bearers_before_retention() {
+    let mut value = json!({"headers":[{"name":"Authorization","value":"private"}],"nested":{"Authorization":"private","access_token":"private","note":"Bearer private"},"safe":"CHILD_ACCEPTANCE_OK"});
+    scrub_capture(&mut value);
+    assert!(!value.to_string().contains("private"));
+    assert_eq!(value["safe"], "CHILD_ACCEPTANCE_OK");
+}
+
+#[test]
+fn recorded_live_schema_answer_preserves_delivery_and_parent_provenance() {
+    use hennery_proto::{
+        frames::PendingKind,
+        plugin::InputOrigin,
+        rest::{EventDto, PendingState},
+    };
+    use hennery_view::{Body, Request};
+    let events: Vec<EventDto> = include_str!("fixtures/delegation-codex-acp-1.13.0.jsonl")
+        .lines()
+        .map(|line| serde_json::from_str(line).unwrap())
+        .collect();
+    assert!(
+        events
+            .iter()
+            .all(|event| event.body.pointer("/payload/update/sessionUpdate")
+                != Some(&json!("available_commands_update"))),
+        "public fixture must exclude this machine's command menu"
+    );
+    let items = hennery_view::fold(&events, &|_: &str| false);
+    let questions: Vec<_> = items
+        .iter()
+        .filter_map(|item| {
+            if let Body::Question(question) = &item.body {
+                Some(question)
+            } else {
+                None
+            }
+        })
+        .collect();
+    assert_eq!(questions.len(), 1);
+    let question = questions[0];
+    assert_eq!(question.question_kind, PendingKind::Elicitation);
+    assert_eq!(question.state, PendingState::Delivered);
+    assert_eq!(question.delivered, Some(true));
+    assert!(question.answered);
+    assert!(!question.answerable);
+    assert!(matches!(&question.request,Request::Elicitation{form_supported:true,fields,..} if !fields.is_empty()));
+    for kind in ["user_turn", "answer_submitted"] {
+        let event = events.iter().find(|event| event.kind == kind).unwrap();
+        assert!(matches!(
+            serde_json::from_value::<InputOrigin>(event.body["origin"].clone()).unwrap(),
+            InputOrigin::Parent { .. }
+        ));
+    }
+    assert!(assistant_text(&events).contains("CHILD_ACCEPTANCE_OK"));
+    let mut menu = events[0].clone();
+    menu.kind = "acp_update".into();
+    menu.body = json!({"payload":{"update":{"sessionUpdate":"available_commands_update","availableCommands":[{"name":"private personal command menu"}]}}});
+    let public = scrub_events(vec![
+        menu,
+        events
+            .iter()
+            .find(|event| event.kind == "pending_opened")
+            .unwrap()
+            .clone(),
+    ]);
+    assert_eq!(public.len(), 1);
+    assert_eq!(public[0].kind, "pending_opened");
+    assert!(
+        !serde_json::to_string(&public)
+            .unwrap()
+            .contains("private personal command menu")
+    );
+}
+
+fn question_brief(runtime: &str) -> &'static str {
+    if runtime == "claude" {
+        "This is an actual tool acceptance test. You MUST immediately call AskUserQuestion to ask one required single-choice question with options blue and green, named acceptance_color. You do not know the answer. Do not choose a color yourself, infer it, or ask in plain text. Wait for the real tool response before replying CHILD_ACCEPTANCE_OK followed by the returned color. If the question tool is unavailable, reply ELICITATION_UNAVAILABLE; never pretend you called it. Do not read/write files or run commands."
+    } else {
+        "This is an actual tool acceptance test. You are in Plan mode. You MUST immediately call the request_user_input tool to ask one required single-choice question named acceptance_color with options blue and green. You do not know the answer. Do not choose a color yourself, infer it, or ask in plain text. Wait for the real tool response before replying CHILD_ACCEPTANCE_OK followed by the returned color. If the question tool is unavailable, reply ELICITATION_UNAVAILABLE; never pretend you called it. Do not read/write files or run commands."
+    }
+}
+
+fn scrub_error(message: &str) -> Result<String> {
+    Ok(redact_credentials(message)?.chars().take(2000).collect())
+}
+
+fn redact_credentials(message: &str) -> Result<String> {
+    fn strings(value: &Value, output: &mut Vec<String>) {
+        match value {
+            Value::String(text) if text.len() >= 8 => output.push(text.clone()),
+            Value::Array(values) => {
+                for value in values {
+                    strings(value, output);
+                }
+            }
+            Value::Object(values) => {
+                for value in values.values() {
+                    strings(value, output);
+                }
+            }
+            _ => {}
+        }
+    }
+    let mut secrets = vec![];
+    for variable in ["HENNERY_D4_CLAUDE_AUTH", "HENNERY_D4_CODEX_AUTH"] {
+        if let Ok(path) = std::env::var(variable) {
+            let value: Value = serde_json::from_slice(&std::fs::read(path)?)?;
+            strings(&value, &mut secrets);
+        }
+    }
+    secrets.sort_by_key(|text| std::cmp::Reverse(text.len()));
+    let mut clean = message.to_owned();
+    for secret in secrets {
+        clean = clean.replace(&secret, "[credential]");
+    }
+    Ok(clean)
+}
+
+fn builtin_permission(payload: &Value, updates: &[Value]) -> bool {
+    let claude = payload
+        .pointer("/toolCall/_meta/claudeCode/toolName")
+        .and_then(Value::as_str)
+        .is_some_and(|name| TOOLS.iter().any(|tool| name == format!("mcp__hennery__{tool}")));
+    let codex = payload.pointer("/_meta/is_mcp_tool_approval") == Some(&Value::Bool(true))
+        && payload
+            .pointer("/toolCall/toolCallId")
+            .and_then(Value::as_str)
+            .is_some_and(|id| {
+                updates.iter().any(|update| {
+                    update["toolCallId"] == id
+                        && update["_meta"]["is_mcp_tool_call"] == true
+                        && update["rawInput"]["server"] == "hennery"
+                        && update["rawInput"]["tool"]
+                            .as_str()
+                            .is_some_and(|tool| TOOLS.contains(&tool))
+                })
+            });
+    claude || codex
+}
+
+fn assistant_text(events: &[hennery_proto::rest::EventDto]) -> String {
+    events
+        .iter()
+        .filter_map(|event| event.body.pointer("/payload/update"))
+        .filter(|update| update["sessionUpdate"] == "agent_message_chunk")
+        .filter_map(|update| update.pointer("/content/text").and_then(Value::as_str))
+        .collect()
+}
+
+#[test]
+fn parent_operator_approval_is_limited_to_correlated_builtin_tools() {
+    let call = json!({"toolCallId":"call","_meta":{"is_mcp_tool_call":true},"rawInput":{"server":"hennery","tool":"session_spawn"}});
+    let permission = json!({"toolCall":{"toolCallId":"call"},"_meta":{"is_mcp_tool_approval":true}});
+    assert!(builtin_permission(&permission, std::slice::from_ref(&call)));
+    assert!(builtin_permission(
+        &json!({"toolCall":{"_meta":{"claudeCode":{"toolName":"mcp__hennery__session_spawn"}}}}),
+        &[]
+    ));
+    for denied in [
+        json!({"toolCall":{"toolCallId":"other"},"_meta":{"is_mcp_tool_approval":true}}),
+        json!({"toolCall":{"toolCallId":"call"}}),
+        json!({"toolCall":{"title":"mcp__hennery__session_spawn","_meta":{"claudeCode":{"toolName":"Bash"}}}}),
+    ] {
+        assert!(!builtin_permission(&denied, std::slice::from_ref(&call)));
+    }
+    for denied in [
+        json!({"toolCallId":"call","_meta":{"is_mcp_tool_call":true},"rawInput":{"server":"foreign","tool":"session_spawn"}}),
+        json!({"toolCallId":"call","_meta":{"is_mcp_tool_call":true},"rawInput":{"server":"hennery","tool":"unknown"}}),
+        json!({"toolCallId":"call","rawInput":{"server":"hennery","tool":"session_spawn"}}),
+    ] {
+        assert!(!builtin_permission(&permission, &[denied]));
+    }
+}
+
+#[tokio::test]
+#[ignore = "requires explicit pinned adapters and provider credentials; performs inference"]
+async fn pinned_runtime_provider_authentication() -> Result<()> {
+    let runtime = runtime("HENNERY_D4_PARENT")?;
+    let h = Harness::new(&runtime, None).await?;
+    let result = async {
+        let turn = h
+            .prompt(
+                &h.parent,
+                "Reply with exactly HENNERY_PROVIDER_OK. Do not call any tools.",
+            )
+            .await?;
+        let outcome = h
+            .wait("provider authentication", || {
+                h.state.store.ended_turn_outcome(&turn).ok().flatten()
+            })
+            .await?;
+        if outcome != hennery_proto::frames::TurnOutcome::Completed {
+            h.diagnostics("provider failed")?;
+            bail!("provider turn outcome {outcome:?}");
+        }
+        let events = h.state.store.events(&h.parent, 0, 1000)?;
+        ensure!(
+            assistant_text(&events).contains("HENNERY_PROVIDER_OK"),
+            "provider did not return the acceptance marker"
+        );
+        println!(
+            "{}",
+            json!({"runtime":runtime,"provider_authentication":true,"outcome":outcome})
+        );
+        Ok(())
+    }
+    .await;
+    let cleanup = h.finish().await;
+    result.and(cleanup)
+}
+
+#[tokio::test]
+#[ignore = "requires explicit pinned adapter and staged auth; starts no provider turn"]
+async fn pinned_runtime_process_token_exposure_without_inference() -> Result<()> {
+    let runtime = runtime("HENNERY_D4_PARENT")?;
+    let h = Harness::new(&runtime, None).await?;
+    let result=async {
+        ensure!(h.state.store.find_session(&h.parent)?.context("attached session")?.open_turn_id.is_none(),"exposure inspection must start no turn");
+        ensure!(!h.state.store.events(&h.parent,0,1000)?.iter().any(|event|event.kind=="user_turn"),"exposure inspection must submit no prompt");
+        println!("{}",json!({"case":"process_token_exposure","runtime":runtime,"provider_inference":false,"processes":process_token_exposure()?}));
+        Ok(())
+    }.await;
+    let cleanup = h.finish().await;
+    result.and(cleanup)
+}
+
+fn requested(catalog: &HostCatalog) -> SessionConfig {
+    let mut config = catalog.defaults.clone();
+    if let Some(model) = catalog
+        .config_options
+        .iter()
+        .find(|option| option["category"] == "model")
+        .and_then(|option| option["options"].as_array())
+        .and_then(|options| {
+            options
+                .iter()
+                .filter_map(|option| option["value"].as_str())
+                .find(|model| matches!(*model, "sonnet" | "gpt-6-sol"))
+        })
+    {
+        config.model = Some(model.into());
+    }
+    // Independent selection comes exclusively from this child's actual catalog.
+    // Exercise a non-default effort when it is offered; never invent an axis.
+    for option in &catalog.config_options {
+        let Some(id) = option["id"].as_str() else { continue };
+        if (id.contains("effort") || id.contains("reasoning"))
+            && let Some(value) = option["options"].as_array().and_then(|options| {
+                options
+                    .iter()
+                    .find_map(|o| o["value"].as_str().filter(|v| matches!(*v, "low" | "medium")))
+            })
+        {
+            config
+                .axes
+                .insert(id.into(), hennery_proto::frames::ConfigValue::Id(value.into()));
+        }
+    }
+    if catalog.agent == "codex" {
+        config.mode = Some("read-only".into());
+        config.axes.insert(
+            "collaboration_mode".into(),
+            hennery_proto::frames::ConfigValue::Id("plan".into()),
+        );
+    }
+    config
+}
+
+#[tokio::test]
+#[ignore = "requires explicit pinned parent/child adapters and provider credentials; performs inference"]
+async fn pinned_parent_child_provider_matrix() -> Result<()> {
+    let parent = runtime("HENNERY_D4_PARENT")?;
+    let child_runtime = runtime("HENNERY_D4_CHILD")?;
+    let h = Harness::new(&parent, Some(&child_runtime)).await?;
+    let result = async {
+        let catalog = h.catalog(&child_runtime).await?;
+        let config = requested(&catalog);
+        ensure!(hennery_sessions::delegation_runtime::config_offered(&catalog, &config), "chosen child configuration absent from actual catalog");
+        let brief = question_brief(&child_runtime);
+        let parent_nodes = node_pids()?;
+        let arguments = json!({"operation_key":"d4-live-spawn","cwd":h.dir.path().canonicalize()?,"agent":child_runtime,"brief":brief,"config":config,"name":"acceptance child"});
+        let prompt = format!("Use your hennery MCP tools for this acceptance. First call session_capabilities with agent={child_runtime}. Then call session_spawn EXACTLY ONCE with this JSON: {arguments}. Do not use another subagent facility. If a child ordinary question arrives, answer it with session_answer: action accept and content matching its schema, selecting blue. For an ordinary question the acceptance color is blue. Do not answer permission requests, run shell commands, or read/write files. After spawning, end your turn with SPAWN_ACCEPTED; the durable system will deliver the child's question. Do not poll or close the child.");
+        h.prompt(&h.parent, &prompt).await?;
+        let child = h.wait("real parent spawn", || h.child()).await?;
+        let evidence = h.wait("child configuration readback", || {
+            let conn = hennery_kernel::db::open(&h.dir.path().join("hennery.db")).ok()?;
+            conn.query_row("SELECT evidence FROM session_attach_evidence WHERE owner_id=?1 AND session_id=?2 AND evidence IS NOT NULL", rusqlite::params![h.state.store.owner_id(),child], |r| r.get::<_,String>(0)).optional().ok().flatten()
+        }).await?;
+        let evidence: hennery_proto::delegation_host::ConfigEvidence = serde_json::from_str(&evidence)?;
+        ensure!(evidence.completeness == hennery_proto::delegation_host::ConfigCompleteness::Complete, "child configuration not completely read back");
+        ensure!(config.model.as_ref().is_none_or(|v| evidence.actual.model.as_ref() == Some(v)), "child model readback differs");
+        ensure!(config.mode.as_ref().is_none_or(|v| evidence.actual.mode.as_ref() == Some(v)), "child permission mode readback differs");
+        ensure!(config.axes.iter().all(|(k,v)| evidence.actual.axes.get(k) == Some(v)), "child effort readback differs");
+        let child_pid = h.wait("own child adapter PID", || { let candidates:Vec<_> = node_pids().ok()?.into_iter().filter(|pid|!parent_nodes.contains(pid)).collect(); (candidates.len() == 1).then(||candidates[0]) }).await?;
+        let pending = h.wait("genuine child elicitation", || h.question(&child,0,hennery_proto::frames::PendingKind::Elicitation)).await?;
+        h.wait("real parent answer delivered", || h.state.store.pending_item(&pending.pending_id).ok().flatten().filter(|p| p.delivered == Some(true))).await?;
+        h.wait("child provider continuation", || {
+            let events = h.state.store.events(&child, 0, 1000).ok()?;
+            assistant_text(&events).contains("CHILD_ACCEPTANCE_OK").then_some(())
+        }).await?;
+        let events = h.state.store.events(&child, 0, 1000)?;
+        let brief = events.iter().find(|event| event.kind == "user_turn").context("child brief event")?;
+        ensure!(events.iter().any(|event| event.event_id < brief.event_id && event.body.pointer("/indexed/config_evidence/completeness") == Some(&json!("complete"))), "actual complete configuration readback did not precede the brief");
+        let conn = hennery_kernel::db::open(&h.dir.path().join("hennery.db"))?;
+        let origin: String = conn.query_row("SELECT input_origin FROM answer_queue WHERE owner_id=?1 AND pending_id=?2 AND delivered=1", rusqlite::params![h.state.store.owner_id(),pending.pending_id], |row| row.get(0))?;
+        ensure!(matches!(serde_json::from_str::<hennery_proto::plugin::InputOrigin>(&origin)?, hennery_proto::plugin::InputOrigin::Parent {session_id,..} if session_id == h.parent), "delivered schema answer did not originate from the actual parent");
+        let trace = h.trace.lock().unwrap().clone();
+        for id in [&h.parent, &child] {
+            ensure!(trace.iter().any(|r| r["caller"] == *id && r["method"] == "tools/list" && r["tools"].as_array().is_some_and(|t| t.len() == 7)), "actual participant did not discover all seven tools");
+        }
+        for tool in ["session_capabilities", "session_spawn", "session_answer"] {
+            ensure!(trace.iter().any(|r| r["caller"] == h.parent && r["tool"] == tool && r["is_error"] == false), "real parent did not successfully call {tool}");
+        }
+        println!("{}", json!({"case":"base_parent_child_loop","parent_runtime":parent,"child_runtime":child_runtime,"spawn":true,"real_elicitation":true,"parent_answer_delivered":true,"child_continued":true,"requested_config":config,"actual_config":evidence,"mcp":trace}));
+        h.capture(&child)?;
+        println!("{}",json!({"case":"process_token_exposure","processes":process_token_exposure()?}));
+        h.extended(&child,&child_runtime,child_pid).await?;
+        println!("{}",json!({"parent_runtime":parent,"child_runtime":child_runtime,"base_loop":true,"extended_lifecycle_acceptance":true}));
+        Ok(())
+    }.await;
+    if result.is_err() {
+        h.diagnostics("acceptance failed")?;
+    }
+    let cleanup = h.finish().await;
+    result.and(cleanup)
+}
```

### Task 5: verify, record execution and request independent review

Run the six Rust gates, native `nix flake check -L`, the web gate and the changed Playwright specs. If the web lockfile changes, run the packaging hash updater; this plan adds no dependency. Execute one fresh replay and compare the staged bytes to the tested tree. Record the actual counts, failures and remedies, guard probes, 4×3 load, scratch copies and live rows. Update this plan's execution record and docs/README.md, commit and push. Request the parent review on the full D4 range with the risks listed above. Do not remove release gating until the live matrix is complete.

## After this plan

The parent owns independent review, Linux/macOS CI, a rebase after D3a/D3b merge and the ordinary-release decision. D4 cannot claim completion while a required live matrix row or lifecycle scenario remains blocked. Keep opt-in/preview release restrictions in that case; do not make an incomplete matrix green by substituting canned output, a smoke test or generated prose. The optional memory plug-in and publication lanes remain separate.

## Execution record

### Implemented and release state

Built D4a and the D4b family/operator/phone UI on the D3b base `7a820fce`.
The ordinary-release restriction remains: three required provider combinations
cannot run with the supplied expired Claude credentials. Independent security
review, PR checks and merge belong to the fleet parent. No GitHub action was
performed by this lane, and no release-gate removal is claimed.

The operator APIs authorize the current owner and hat at read/mutation time.
Takeover preserves an already handed-off answer's first-accepted slot while
cancelling unhanded parent work. Status-only attention has explicit
acknowledgement; question records retain their canonical answer cards. The
waiting badge says "waiting on you" because it includes status-only attention.
Family projection draining excludes frozen hats and uses an index of ready rows.

### RED evidence and guard probes

The initial inherited APFS target had stale proc-macro/rlib artifacts; those
compiler failures were repaired and are not regression evidence. Meaningful RED
runs then established absent family methods/route/typed origin, factual waiting
count errors, permissive takeover body handling, rejected actual pinned Codex
metadata, lost explicit takeover reasons and projection writes into a frozen
hat. UI tests establish scope/reset/resync, late-response, status-only
acknowledgement and provenance behavior before implementation. The privacy
regression failed on an unrelated machine command menu before its removal.

All probes ran in retained private copies with APFS-cloned targets. Backend:
23 guard removals produced runtime test failures, including owner/operator/hat
checks, every question-routing verdict, takeover/cancellation, durable
persist/clear/publish, worker invalidation and purge freeze. Baseline and restored
checks passed. Takeover and worker deadline/invalidation load ran four copies
for three rounds: 24 test executions, all exit 0. UI scope/resync guard and
browser API-path cuts, plus the final attention guards, are recorded below.
UI: the original 19 unit guard cuts and one embedded browser API-path cut were caught; all 16 additional status-attention cuts also failed assertions. The initial UI late-response/resync load passed 96 test executions and the final status load passed 72, each at four copies for three rounds. Restored-copy suite: 72 passed.
Live-harness probes: 11 removals failed with test assertions (exit 101), covering
approval correlation, both adapter positive approvals, capture privacy and real
delivery/provenance. Restored source and fixture were byte-identical.

### Verification commands

All commands used the worktree's `nix develop -c` dev shell. Logs and machine
readable counts are retained in `.superpowers/sdd/deleg-d4/` and the UI/live lane
ledgers. A check is counted only from its completed output.

| Command | Result |
| --- | --- |
| `cargo fmt --all --check` | exit 0, repeated after the final Rust amendment |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | exit 0, repeated after the final Rust amendment |
| `cargo clippy -p hennery --locked -- -D warnings` | exit 0, repeated after the final Rust amendment |
| `cargo test --workspace --locked` | exit 0; 2,453 passed, 0 failed, 3 ignored across 161 final suite summaries |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | exit 0, repeated after the final Rust amendment |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | exit 0, repeated after the final Rust amendment |
| `cargo test -p hennery-sessions --test delegation_d2 --test store --test owner --locked` | final purge amendment: exit 0; 138 + 104 + 5 = 247 passed |
| `cargo test -p hennery-testkit --test view --test owner_filter --test delegation_live --locked` | final purge/privacy amendment: exit 0; 58 + 3 + 3 = 64 passed, 3 ignored |
| `cargo test -p hennery-testkit --test delegation_mcp --locked` | exit 0; 20 passed |
| `nix flake check -L` | exit 0; native aarch64-darwin package, embedded web UI, audit, fmt and Clippy; Linux remains CI-owned |
| `pnpm --dir web install --frozen-lockfile` | exit 0; lockfile unchanged |
| `pnpm --dir web typecheck` | final UI amendment exit 0 |
| `pnpm --dir web test` | final UI amendment exit 0; 110 files, 1,855 passed |
| `pnpm --dir web build` | final UI amendment exit 0 |
| Changed `CI=1 pnpm --dir web e2e family.spec.ts` | final UI amendment exit 0; 4 passed, including the new mobile status acknowledgement |
| Full `CI=1 pnpm --dir web e2e` after embedded binary build | exit 0; 97 passed, 11 expected skips; before the final attention UI amendment |

The one full workspace run precedes the isolated purge-projection and capture
privacy amendments; their targeted suites, new RED tests and probes ran
subsequently, together with both Clippy checks and both generators. The final
UI amendment is verified separately below. The verification budget does not
repeat the full workspace suite for these corrections. No claim is made that
the earlier full-suite snapshot includes later bytes. Linux/macOS CI on the
submitted head remains the check of record.

### Fresh replay

One fresh replay applied all seven nonempty executable patch blocks to the
D3b base. The extractor found 63 changed files before testing. The replay
observed RED for absent family methods, the absent HTTP route (404 versus
401), dropped Parent authorship (null), actual Codex metadata (400 versus
200), and UI behavior; then all corresponding implementation steps passed.
Final replay exit 0: 151 Rust test passes, 3 ignored provider tests, 1,855 web
tests across 110 files, TypeScript, both generators and formatting. SHA-256
comparison matched all 853 tracked files other than this plan and the README
record. No implementation patch changed after this comparison.

### Actual pinned provider acceptance

Pinned adapters: Claude ACP 0.81.0, Codex ACP 1.13.0, native Codex 0.155.1.
Provider calls used explicit scratch homes and approved source credential files,
copied with mode 0600; no source credential values were printed or committed.
Normal harness tests perform no inference (3 passed, 3 ignored).

| Parent | Child | Actual result |
| --- | --- | --- |
| Codex | Codex | PASS; final row exit 0, 1 passed, 133.62 seconds |
| Claude | Claude | BLOCKED: provider smoke returned `Authentication required` |
| Claude | Codex | BLOCKED by the same Claude authentication prerequisite |
| Codex | Claude | BLOCKED by the same Claude authentication prerequisite |

The passing row independently selected complete mode/model/axis configuration
from the advertised catalog and read it back before the brief; it used a real
ACP elicitation and actual parent-origin answer delivery and continuation.
A cheaper model which answered prose without elicitation was a failed attempt,
never acceptance. The final lifecycle row also proves actual permission fallback
and operator denial with no scratch write, busy-parent report queuing/delivery,
genuine parked-parent automatic resume with fresh configuration and token
rotation, collector socket disconnection/reconciliation on a new connection,
actual child-adapter SIGKILL with coalesced durable failure, and a closed parent
remaining closed while child work falls back to the operator. Socket reconnect
was tested; a collector process restart was not.

The live tree matched 191 production source/manifests to the root before its
final row (digest `ea2b7553280a5e8445ad73f633f833318d999384ba91717a3377ead71fd353a0`).
That row predates the later purge-only projection admission/index amendment;
its provider/dispatch/lifecycle logic is unchanged. Its focused regression and
probe are the verification for that amendment. The later capture-only privacy
filter does not alter provider behavior.

The retained public ACP fixture has 24 scrubbed events: configuration, typed
parent brief, actual form and submitted answer, delivered verdict and streamed
continuation. The unrelated command menu is excluded before capture. Privacy
scans found zero source-home, user, bearer/header or private-menu matches.
Startup-only process snapshots retain booleans only: the Codex adapter/native
processes did not expose bearer/header in argv; the bundled native Claude CLI
did. This is an observed exposure to the same OS user, not a claim of process
isolation. No secret values are retained in the public fixture.

### Phone integration and limits

The emitted notification worker's click flow opens the correct child card at
390px; desktop/mobile family navigation, takeover, resync and attention counts
have local browser coverage. A question notification offers no lock-screen
answer action. This covers the requested card-open integration and does not
claim vendor push delivery or an installed iOS cold launch.

### Review request and remaining acceptance

Review `7a820fce..HEAD` with special attention to owner/current-hat family
visibility, stale cached links, takeover versus queued and handed-off answers,
count partitioning and status acknowledgement, durable invalidation under
purge, bounded metadata admission, harness approval correlation and capture
privacy. Ordinary enablement must wait for the three credential-blocked Claude
rows; this branch intentionally contains no release-gate removal.

The parent must provide working approved Claude credentials and report the
D3a/D3b merge before any required rebase. Do not infer approval or live
acceptance from tool discovery, a fixture or a socket write. No maintainer
product decision was reopened.

Retained copies for parent cleanup: root `probe-copy-1` and `replay-1` under
`.superpowers/sdd/deleg-d4/`; UI worktree `deleg-d4-ui` and its named
`deleg-d4-ui-probe-1`; live worktree `deleg-d4-live` and its
`.superpowers/sdd/deleg-d4-live/probe-1`. Private raw historical captures remain
ignored and must not be published. No scratch copy was deleted by this lane.

## Review amendment 1 — 2026-10-16

The first D4 review returned CHANGES with three reproduced P2 findings. The
supplied regressions were copied from the review copy and all three failed on
`70bbf3b2`: takeover left the question version at 4, notice dispatch changed
routing without changing the family revision, and a frozen hat changed the
canonical family/counts without invalidating subscribers. Authorization,
transport metadata and XSS were clean in that review; the unavailable Claude
provider rows were not findings.

### Fixes and regression evidence

1. Takeover deletes only an unhanded, undelivered parent answer, records an
   `answer_cancelled` event in the same transaction and publishes after commit.
   The question's version and touched-question indexes include this event.
   The fold recognizes it in both the current and earlier groups, while
   delivered and terminal questions never reopen. Fold version is now 3.
   Live and resumed item streams serve the newer canonical answerable card;
   the legacy pending stream also refreshes. Repeated takeover emits no second
   cancellation. The UI admits the newer version over obsolete local Sent or
   uncertain state, including late HTTP outcomes and pinned deep links; an
   actual POST in flight retains its single-answer guard.
2. Notice state, reason and accepted-grant revision changes mark the child
   family dirty. Config waits, dispatch, reconciliation, reason-only changes
   (including NULL) and grant changes have positive tests; child and parent
   invalidation and family revisions advance.
3. Migration 21 seeds an owner revision row. The hat-freeze transaction updates
   it atomically with the existing durable `purged_hats` marker. No event is
   appended to a frozen session. List streams poll that scope revision as well
   as the transcript cursor, send removals and update the badge even with no
   host event or hub ring. New/resumed connections replay frozen removals
   independently of their unchanged transcript cursor; SSE ids remain event
   cursors, and removals are idempotent. Ordinary event polling omits the frozen
   scope scan. Item streams use a persistent interval and remove a frozen
   session live and on resume; an initial frozen page returns 404. The UI
   regression confirms stream removal also removes displayed family links.

The initial trigger-insert implementation failed the unchanged strict owner
SQL audit. Replacing it with the pre-seeded owner-row update fixed the cause;
no audit exemption, type, assertion or rule was relaxed. Owner-bound scope
revision and restart persistence have explicit regressions. Historical rollback
fixtures drop the new trigger/table before rolling migration 21 back.

Meaningful RED output is retained under
`.superpowers/sdd/deleg-d4/amendment-1/`: all three supplied tests, missing live
freeze notification, unrecognized reopening in live/resumed groups and the
pure fold. The UI lane observed stale local outcome and pinned-question
regressions before its fix. Temporary test-helper compile errors are not RED
evidence. Additional positive guards cover initial frozen reads and legacy
pending-stream delivery.

### Amendment verification

All builds/tests/tools used the Nix dev shell. The web lockfile is unchanged,
so the web dependency hash updater is unnecessary. No Playwright file changed
in this amendment. Provider inference was not rerun for these review findings;
the original provider evidence and release restriction remain as recorded above.

The migration is a hotspot, so this amendment ran one full workspace suite in
addition to targeted tests. It ran no fresh/full replay, as the amendment
verification budget requires. New guard probes run only in the retained private
`amendment-1/probe-1`, with an APFS clone of the target directory. The original
D4 copies and the UI probe copy remain for parent cleanup.

### Completed checks

| Command or check | Result |
| --- | --- |
| `cargo fmt --all --check` | exit 0 on final staged source |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | exit 0 on final staged source |
| `cargo clippy -p hennery --locked -- -D warnings` | exit 0 on final staged source |
| `cargo test --workspace --locked` | exit 0; **2,466 passed, 0 failed, 4 ignored**, 161 final suite summaries |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | exit 0 |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | exit 0 |
| `cargo test -p hennery-sessions --lib --test delegation_d2 --test store --test owner --locked` | exit 0; 320 passed before two additional stream/helper cases; final `--lib review_` passed all 4 |
| `cargo test -p hennery-testkit --test view --locked` | exit 0; 58 passed |
| `cargo test -p hennery-testkit --test owner_filter --locked` | exit 0; 3 passed with unchanged audit |
| `cargo test -p hennery-view --locked` | exit 0; 62 passed; strengthened terminal regression separately passed |
| `nix flake check -L` | final exit 0; native aarch64-darwin package, Clippy, fmt, audit and embedded UI |
| `pnpm --dir web install --frozen-lockfile` | exit 0; lockfile unchanged |
| `pnpm --dir web typecheck` | exit 0 |
| `pnpm --dir web test` | exit 0; **1,862 passed**, 111 files; targeted/restored 185 passed |
| `pnpm --dir web build` | exit 0 |
| Guard probes in cloned copies | **24 backend** cuts failed tests with exit 101; **7 UI** cuts failed assertions with exit 1; restored checks passed |
| Four copies × three rounds | **36 Rust** stream/version/takeover executions and **84 UI** executions passed; every command exit 0 |

One terminal-state guard initially escaped its probe. The regression was
strengthened to assert the terminal outcome; that cut then failed as intended.
No production implementation changed during the full workspace run. The
stronger assertion was checked by its targeted test, restored-copy checks,
final formatting/both Clippy commands and the final Nix gate. No test, type or
rule was weakened. The initial escaped-probe log is retained alongside the
successful rerun, rather than counted as a caught guard.

The staged audit matched all **11 backend files** to restored probe bytes and
all **4 UI files** to the independently tested UI lane. Its digest is
`5ac788c29256f571d870f582ddac9c64cd54c4689b6cba245d2bd7a44bbe2e66`.
Source commits before this record: `efd75033` (UI), `ff1ddf1f` (backend).
All author addresses are the personal Gmail identity. Linux CI and full PR
status (checks, reviewDecision, mergeStateStatus and unresolved threads,
including bots) remain parent-owned.

### Re-review request

Review `70bbf3b2..HEAD` for atomic cancellation/version/publish ordering,
current- and earlier-group live/resumed question delivery, stale HTTP versus
canonical UI versions, NULL-safe notice transitions, owner-scoped freeze
revision durability, unchanged-cursor removal replay and count correctness.
The preview restriction is unchanged. Rebase still awaits the parent's D3b
merge notification; no GitHub action is performed by this lane.

### Exact review amendment patch

Apply this subsequent patch after the initial seven task patches (source base `70bbf3b2`). It contains the tested amendment bytes; no full amendment replay was run.

```diff
diff --git a/crates/hennery-sessions/src/api.rs b/crates/hennery-sessions/src/api.rs
index 16405f28..1bc97e63 100644
--- a/crates/hennery-sessions/src/api.rs
+++ b/crates/hennery-sessions/src/api.rs
@@ -1395,7 +1395,12 @@ fn sse_messages(store: &Store, e: &EventDto, catalog: bool) -> Vec<Result<Event,
 fn pending_in(store: &Store, e: &EventDto) -> Option<PendingItem> {
     if !matches!(
         e.kind.as_str(),
-        "pending_opened" | "pending_resolved" | "pending_cancelled" | "answer_submitted" | "answer_result"
+        "pending_opened"
+            | "pending_resolved"
+            | "pending_cancelled"
+            | "answer_submitted"
+            | "answer_result"
+            | "answer_cancelled"
     ) {
         return None;
     }
@@ -1593,6 +1598,54 @@ mod tests {
     use super::*;
     use std::sync::Mutex;
 
+    #[tokio::test]
+    async fn review_reopening_event_updates_the_legacy_pending_stream() {
+        let dir = tempfile::tempdir().unwrap();
+        let db = dir.path().join("hennery.db");
+        let state = AppState::new(
+            crate::store::Store::open(&db).unwrap(),
+            hennery_kernel::hosts::Hosts::open(&db).unwrap(),
+            hennery_kernel::operator::Operator::open(&db).unwrap(),
+        );
+        state.store.create_session("s1", "h", "a", "/p", "hat", None).unwrap();
+        state
+            .store
+            .ingest("s1", 1, &SessionBody::session_started("r", "agent"))
+            .unwrap();
+        state
+            .store
+            .ingest(
+                "s1",
+                2,
+                &SessionBody::PendingOpened {
+                    pending_id: "q".into(),
+                    indexed: Indexed {
+                        pending: Some(Box::new(hennery_proto::frames::PendingExtract {
+                            id: "q".into(),
+                            kind: hennery_proto::frames::PendingKind::Elicitation,
+                            option_ids: None,
+                            title: None,
+                        })),
+                        ..Default::default()
+                    },
+                    payload: serde_json::json!({}),
+                },
+            )
+            .unwrap();
+        let event = EventDto {
+            kind: "answer_cancelled".into(),
+            body: serde_json::json!({"pending_id":"q"}),
+            ..event(3)
+        };
+        let messages = sse_messages(&state.store, &event, false);
+        assert_eq!(messages.len(), 2);
+        let text = format!("{:?}", messages[1]);
+        assert!(
+            text.contains("pending_changed") && text.contains(r#"\"answered\":false"#),
+            "{text}"
+        );
+    }
+
     fn event(event_id: i64) -> EventDto {
         EventDto {
             event_id,
diff --git a/crates/hennery-sessions/src/family.rs b/crates/hennery-sessions/src/family.rs
index 334bde2e..88e17a6b 100644
--- a/crates/hennery-sessions/src/family.rs
+++ b/crates/hennery-sessions/src/family.rs
@@ -283,15 +283,49 @@ impl Store {
                 OR (kind='question' AND state='parent_delivered'))",
             params![self.owner_id(), id],
         )?;
-        tx.execute("DELETE FROM answer_queue WHERE owner_id = ?1 AND session_id = ?2 AND delegation_handoff=0 AND delivered IS NULL
-            AND json_extract(input_origin,'$.kind')='parent'",params![self.owner_id(),id])?;
-        // Ring after commit; the durable events created by triggers are the
-        // cursor source, so the ring itself carries no authority or payload.
+        let cancelled = {
+            let mut stmt = tx.prepare("DELETE FROM answer_queue WHERE owner_id = ?1 AND session_id = ?2 AND delegation_handoff=0 AND delivered IS NULL
+                AND json_extract(input_origin,'$.kind')='parent' RETURNING pending_id")?;
+            stmt.query_map(params![self.owner_id(), id], |row| row.get::<_, String>(0))?
+                .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        let mut reopened = Vec::new();
+        for pending_id in cancelled {
+            reopened.push(crate::store::collector_event(
+                &tx,
+                self.owner_id(),
+                id,
+                "answer_cancelled",
+                serde_json::json!({"pending_id":pending_id,"reason":"operator_takeover"}),
+                &crate::store::stamp_ago(std::time::Duration::ZERO),
+            )?);
+        }
+        // The question event and cancellation commit together. Publish only
+        // afterward; dirty family projections drain separately.
         tx.commit()?;
         drop(conn);
+        for event in reopened {
+            hub.publish(event);
+        }
         self.flush_family_changes(hub)?;
         Ok(true)
     }
+    /// Durable owner-scope sequence, independent of frozen transcript cursors.
+    pub fn view_scope_revision(&self) -> Result<i64> {
+        Ok(self.conn().query_row(
+            "SELECT COALESCE(MAX(revision),0) FROM view_scope_invalidations WHERE owner_id = ?1",
+            [self.owner_id()],
+            |row| row.get(0),
+        )?)
+    }
+    pub fn session_scope_frozen(&self, id: &str) -> Result<bool> {
+        Ok(self.conn().query_row(
+            "SELECT EXISTS(SELECT 1 FROM sessions s JOIN purged_hats p
+            ON p.owner_id = ?1 AND p.hat_id=s.hat_id WHERE s.owner_id = ?1 AND s.id = ?2)",
+            params![self.owner_id(), id],
+            |row| row.get(0),
+        )?)
+    }
     pub fn operator_waiting_count(&self, hat: Option<&str>) -> Result<u32> {
         Ok(self.conn().query_row("SELECT count(*) FROM sessions s WHERE s.owner_id = ?1 AND s.lifecycle<>'deleted'
             AND (?2 IS NULL OR s.hat_id = ?2)
@@ -301,8 +335,12 @@ impl Store {
               OR (s.activity='blocked' AND NOT EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = ?1 AND p.session_id=s.id AND p.state='open')))",params![self.owner_id(),hat],|r|r.get(0))?)
     }
     /// Both source and parent invalidations are derived from owner-authorized
-    /// current edges. A deleted edge emits its own parent event in migration 21.
+    /// current edges. On resume, durable owner-scope removals replay even
+    /// when no transcript cursor advanced; ordinary event polls omit them.
     pub fn family_changed_after(&self, after: i64) -> Result<Vec<String>> {
+        self.family_changes_after(after, true)
+    }
+    pub(crate) fn family_changes_after(&self, after: i64, include_scope: bool) -> Result<Vec<String>> {
         let conn = self.conn();
         let mut stmt = conn.prepare(
             "SELECT session_id FROM (
@@ -310,11 +348,13 @@ impl Store {
             UNION ALL SELECT f.parent_id,e.event_id FROM events e JOIN session_families f ON f.owner_id = ?1 AND f.child_id=e.session_id
             JOIN sessions p ON p.owner_id = ?1 AND p.id=f.parent_id AND p.hat_id=f.hat_id AND p.lifecycle<>'deleted'
             JOIN sessions c ON c.owner_id = ?1 AND c.id=f.child_id AND c.hat_id=f.hat_id AND c.lifecycle<>'deleted'
-            WHERE e.owner_id = ?1 AND e.event_id>?2 AND e.applied=1)
+            WHERE e.owner_id = ?1 AND e.event_id>?2 AND e.applied=1
+            UNION ALL SELECT s.id,?2 FROM sessions s JOIN purged_hats v
+                ON v.owner_id = ?1 AND v.hat_id=s.hat_id WHERE s.owner_id = ?1 AND s.lifecycle<>'deleted' AND ?3)
             GROUP BY +session_id ORDER BY MAX(event_id)",
         )?;
         Ok(stmt
-            .query_map(params![self.owner_id(), after], |r| r.get(0))?
+            .query_map(params![self.owner_id(), after, include_scope], |r| r.get(0))?
             .collect::<rusqlite::Result<_>>()?)
     }
 }
diff --git a/crates/hennery-sessions/src/family.sql b/crates/hennery-sessions/src/family.sql
index 8c605289..d916292c 100644
--- a/crates/hennery-sessions/src/family.sql
+++ b/crates/hennery-sessions/src/family.sql
@@ -82,3 +82,22 @@ CREATE TRIGGER family_view_operation_insert AFTER INSERT ON session_operations
 BEGIN
  UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
 END;
+
+-- A scope removal belongs to the owner, never to a now-frozen session.
+-- Its sequence is separate from transcript events. Resumed list streams
+-- replay frozen rows independently of their transcript-event cursor.
+CREATE TABLE view_scope_invalidations (
+ owner_id TEXT PRIMARY KEY,
+ revision INTEGER NOT NULL DEFAULT 0
+);
+INSERT INTO view_scope_invalidations(owner_id,revision)
+ SELECT id,(SELECT count(*) FROM purged_hats p WHERE p.owner_id=owners.id) FROM owners;
+CREATE TRIGGER family_view_hat_frozen AFTER INSERT ON purged_hats
+BEGIN
+ UPDATE view_scope_invalidations SET revision=revision+1 WHERE owner_id=NEW.owner_id;
+END;
+CREATE TRIGGER family_view_notice_update AFTER UPDATE OF state,reason,accepted_revision ON delegation_notices
+WHEN NEW.state IS NOT OLD.state OR NEW.reason IS NOT OLD.reason OR NEW.accepted_revision IS NOT OLD.accepted_revision
+BEGIN
+ UPDATE sessions SET family_dirty=1 WHERE owner_id=NEW.owner_id AND id=NEW.child_id AND lifecycle<>'deleted';
+END;
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index 23426e56..efe0e980 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -4401,7 +4401,7 @@ const GROUP_STARTS: &str = "SELECT event_id FROM events
 /// its `pending_id`.
 const PENDING_LAST_EVENT: &str = "SELECT MAX(event_id) FROM events
      WHERE session_id = ?1
-           AND kind IN ('pending_opened', 'answer_submitted', 'answer_result', 'pending_resolved', 'pending_cancelled')
+           AND kind IN ('pending_opened', 'answer_submitted', 'answer_result', 'answer_cancelled', 'pending_resolved', 'pending_cancelled')
            AND json_extract(body, '$.pending_id') = ?2 AND applied = 1 AND owner_id = ?3";
 
 /// A question's `pending_opened` event (`pending_opened_at`): the one its
@@ -4732,7 +4732,7 @@ impl Store {
         let mut stmt = conn.prepare(
             "SELECT json_extract(body, '$.pending_id') AS pending_id FROM events
              WHERE session_id = ?1
-                   AND kind IN ('pending_opened', 'answer_submitted', 'answer_result', 'pending_resolved',
+                   AND kind IN ('pending_opened', 'answer_submitted', 'answer_result', 'answer_cancelled', 'pending_resolved',
                                 'pending_cancelled')
                    AND event_id > ?2 AND applied = 1 AND owner_id = ?3
              GROUP BY pending_id ORDER BY MIN(event_id)",
diff --git a/crates/hennery-sessions/src/view.rs b/crates/hennery-sessions/src/view.rs
index d2100e5b..e99436f8 100644
--- a/crates/hennery-sessions/src/view.rs
+++ b/crates/hennery-sessions/src/view.rs
@@ -244,6 +244,11 @@ async fn page(State(state): State<AppState>, Path(id): Path<String>, Query(param
         Ok(None) => return not_found(),
         Err(err) => return internal(err),
     }
+    match state.store.session_scope_frozen(&id) {
+        Ok(true) => return not_found(),
+        Ok(false) => {}
+        Err(err) => return internal(err),
+    }
     let limit = match params.limit.as_deref().map(str::parse::<u32>) {
         None => PAGE_DEFAULT_GROUPS,
         Some(Ok(limit)) => limit.clamp(1, PAGE_MAX_GROUPS),
@@ -685,6 +690,11 @@ impl ItemStream {
         mut doorbell: broadcast::Receiver<EventDto>,
         tx: &Outbox,
     ) -> Result<()> {
+        let mut scope_revision = self.store.view_scope_revision()?;
+        if self.store.session_scope_frozen(&self.id)? {
+            tx.send(removed(&self.id)?).await;
+            return Ok(());
+        }
         let Some(burst) = self.resume(anchor, RESUME_MAX_BYTES)? else {
             // Sent once, then the stream ends; a reader gone is no error.
             tx.send(resync()).await;
@@ -697,10 +707,22 @@ impl ItemStream {
             tx.send(removed(&self.id)?).await;
             return Ok(());
         }
+        let mut scope_tick = tokio::time::interval(Duration::from_secs(1));
+        scope_tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
         loop {
             let flush_at = self.held.map(|held| held + COALESCE);
             tokio::select! {
                 () = tx.closed() => return Ok(()),
+                _ = scope_tick.tick() => {
+                    let current = self.store.view_scope_revision()?;
+                    if current != scope_revision {
+                        if self.store.session_scope_frozen(&self.id)? {
+                            tx.send(removed(&self.id)?).await;
+                            return Ok(());
+                        }
+                        scope_revision = current;
+                    }
+                },
                 rung = doorbell.recv() => match rung {
                     Ok(event) if event.session_id != self.id => continue,
                     // Lagged: whatever it skipped is in the store.
@@ -994,7 +1016,12 @@ fn is_chunk(event: &EventDto) -> bool {
 fn question_event(event: &EventDto) -> Option<&str> {
     matches!(
         event.kind.as_str(),
-        "pending_opened" | "answer_submitted" | "answer_result" | "pending_resolved" | "pending_cancelled"
+        "pending_opened"
+            | "answer_submitted"
+            | "answer_result"
+            | "answer_cancelled"
+            | "pending_resolved"
+            | "pending_cancelled"
     )
     .then(|| event.body.get("pending_id")?.as_str())
     .flatten()
@@ -1065,6 +1092,7 @@ async fn list_follow(
 ) -> Result<()> {
     // Read before the sessions that changed: an event stored between the
     // two is sent now and again later, never missed.
+    let mut scope_revision = store.view_scope_revision()?;
     let mut cursor = store.max_event_id()?;
     let Some(after) = revision_of(anchor).filter(|after| *after <= cursor) else {
         tx.send(resync()).await;
@@ -1143,11 +1171,13 @@ async fn list_follow(
             return Ok(());
         }
         let max = store.max_event_id()?;
-        changed = if max > cursor {
-            store.family_changed_after(cursor)?
+        let scope = store.view_scope_revision()?;
+        changed = if max > cursor || scope != scope_revision {
+            store.family_changes_after(cursor, scope != scope_revision)?
         } else {
             Vec::new()
         };
+        scope_revision = scope;
         cursor = cursor.max(max);
     }
 }
@@ -1314,6 +1344,188 @@ mod tests {
         assert!(rx.recv().await.is_none());
     }
 
+    #[tokio::test(start_paused = true)]
+    async fn review_reopened_answer_streams_live_and_resumed_in_both_groups() {
+        for earlier_group in [false, true] {
+            let (_dir, store, conn) = store();
+            write(
+                &conn,
+                &store,
+                "user_turn",
+                serde_json::json!({"turn_id":"t1","content":[]}),
+            );
+            let opened = write(
+                &conn,
+                &store,
+                "pending_opened",
+                serde_json::json!({
+                    "pending_id":"q", "indexed":{"turn_id":"t1","pending":{"id":"q","kind":"elicitation"}},
+                    "payload":{"message":"Choose","requestedSchema":{"type":"object","properties":{}}}
+                }),
+            );
+            conn.execute("INSERT INTO pending(pending_id,session_id,kind,turn_id,payload,state,opened_at,opened_event_id,owner_id)
+                VALUES ('q','s','elicitation','t1','{}','open','2026-10-01T00:00:00.000Z',?1,?2)",
+                rusqlite::params![opened.event_id,store.owner_id()]).unwrap();
+            conn.execute(
+                "INSERT INTO answer_queue(pending_id,session_id,request_id,answer,submitted_at,owner_id)
+                VALUES ('q','s','r','{}','2026-10-01T00:00:00.000Z',?1)",
+                [store.owner_id()],
+            )
+            .unwrap();
+            write(&conn, &store, "answer_submitted", serde_json::json!({"pending_id":"q"}));
+            if earlier_group {
+                write(
+                    &conn,
+                    &store,
+                    "user_turn",
+                    serde_json::json!({"turn_id":"t2","content":[]}),
+                );
+            }
+            let cursor = store.max_event_id().unwrap();
+            let anchor = anchor_now(cursor);
+            let (bell, doorbell) = broadcast::channel(10);
+            let (tx, mut rx) = Outbox::new(QUEUE_BYTES);
+            let mut live = ItemStream::new(store.clone(), "s".into());
+            let live_anchor = anchor.clone();
+            let task = tokio::spawn(async move { live.run(Some(&live_anchor), doorbell, &tx).await });
+            tokio::task::yield_now().await;
+            conn.execute(
+                "DELETE FROM answer_queue WHERE owner_id=?1 AND pending_id='q'",
+                [store.owner_id()],
+            )
+            .unwrap();
+            let event = write(
+                &conn,
+                &store,
+                "answer_cancelled",
+                serde_json::json!({"pending_id":"q","reason":"operator_takeover"}),
+            );
+            bell.send(event.clone()).unwrap();
+            let message = item(&mut rx).await;
+            assert!(
+                message.contains(r#"\"answered\":false"#) && message.contains(r#"\"answerable\":true"#),
+                "{message}"
+            );
+            assert!(
+                message.contains(&format!(r#"\"version\":{}"#, event.event_id)),
+                "{message}"
+            );
+            let resumed = ItemStream::new(store.clone(), "s".into())
+                .resume(Some(&anchor), usize::MAX)
+                .unwrap()
+                .unwrap();
+            let resumed = texts(&resumed).join(" ");
+            assert!(
+                resumed.contains(r#"\"answered\":false"#) && resumed.contains(r#"\"answerable\":true"#),
+                "{resumed}"
+            );
+            assert!(
+                resumed.contains(&format!(r#"\"version\":{}"#, event.event_id)),
+                "{resumed}"
+            );
+            drop(rx);
+            task.await.unwrap().unwrap();
+        }
+    }
+
+    #[tokio::test]
+    async fn review_frozen_initial_page_is_not_served() {
+        let dir = tempfile::tempdir().unwrap();
+        let db = dir.path().join("hennery.db");
+        let store = Store::open(&db).unwrap();
+        store.create_session("s", "h", "a", "/p", "hat", None).unwrap();
+        rusqlite::Connection::open(&db)
+            .unwrap()
+            .execute(
+                "INSERT INTO purged_hats(owner_id,hat_id,purged_at) VALUES (?1,'hat',1)",
+                [store.owner_id()],
+            )
+            .unwrap();
+        let state = AppState::new(
+            store,
+            hennery_kernel::hosts::Hosts::open(&db).unwrap(),
+            hennery_kernel::operator::Operator::open(&db).unwrap(),
+        );
+        let response = page(
+            State(state),
+            Path("s".into()),
+            Query(PageParams {
+                before_turn: None,
+                limit: None,
+            }),
+        )
+        .await;
+        assert_eq!(response.status(), StatusCode::NOT_FOUND);
+    }
+
+    #[tokio::test(start_paused = true)]
+    async fn review_scope_freeze_removes_cached_list_and_items_live_and_resumed() {
+        let (_dir, store, conn) = store();
+        write(
+            &conn,
+            &store,
+            "user_turn",
+            serde_json::json!({"turn_id":"t1","content":[]}),
+        );
+        conn.execute(
+            "UPDATE sessions SET activity='blocked' WHERE owner_id=?1 AND id='s'",
+            [store.owner_id()],
+        )
+        .unwrap();
+        let cursor = store.max_event_id().unwrap();
+        let anchor = anchor_now(cursor);
+        let (bell, doorbell) = broadcast::channel(10);
+        let (tx, mut list_rx) = Outbox::new(QUEUE_BYTES);
+        let (follow, follow_anchor) = (store.clone(), anchor.clone());
+        let list = tokio::spawn(async move { list_follow(&follow, Some(&follow_anchor), None, doorbell, &tx).await });
+        assert!(item(&mut list_rx).await.contains(r#"\"count\":1"#));
+        let (tx, mut item_rx) = Outbox::new(QUEUE_BYTES);
+        let mut stream = ItemStream::new(store.clone(), "s".into());
+        let (item_anchor, item_bell) = (anchor.clone(), bell.subscribe());
+        let items = tokio::spawn(async move { stream.run(Some(&item_anchor), item_bell, &tx).await });
+        tokio::task::yield_now().await;
+        // Freeze only. No session event, hub ring or deletion follows.
+        conn.execute(
+            "INSERT INTO purged_hats(owner_id,hat_id,purged_at)
+            SELECT ?1,hat_id,1 FROM sessions WHERE owner_id=?1 AND id='s'",
+            [store.owner_id()],
+        )
+        .unwrap();
+        assert_eq!(store.max_event_id().unwrap(), cursor);
+        let a = item(&mut list_rx).await;
+        let b = item(&mut list_rx).await;
+        assert!(a.contains("session_removed") && b.contains(r#"\"count\":0"#), "{a} {b}");
+        assert!(item(&mut item_rx).await.contains("session_removed"));
+        items.await.unwrap().unwrap();
+        // A new connection with the SAME event cursor must replay the scope removal.
+        let (tx, mut resumed_rx) = Outbox::new(QUEUE_BYTES);
+        let (follow, follow_anchor) = (store.clone(), anchor.clone());
+        let resumed_bell = bell.subscribe();
+        let resumed =
+            tokio::spawn(async move { list_follow(&follow, Some(&follow_anchor), None, resumed_bell, &tx).await });
+        assert!(item(&mut resumed_rx).await.contains("session_removed"));
+        assert!(item(&mut resumed_rx).await.contains(r#"\"count\":0"#));
+        let (tx, mut resumed_item_rx) = Outbox::new(QUEUE_BYTES);
+        let mut stream = ItemStream::new(store.clone(), "s".into());
+        tokio::time::timeout(
+            Duration::from_secs(20),
+            stream.run(Some(&anchor), bell.subscribe(), &tx),
+        )
+        .await
+        .expect("a frozen resumed stream ends")
+        .unwrap();
+        assert!(item(&mut resumed_item_rx).await.contains("session_removed"));
+        assert_eq!(
+            store.max_event_id().unwrap(),
+            cursor,
+            "scope changes never append frozen-session events"
+        );
+        drop(list_rx);
+        drop(resumed_rx);
+        list.await.unwrap().unwrap();
+        resumed.await.unwrap().unwrap();
+    }
+
     async fn item(rx: &mut mpsc::Receiver<Queued>) -> String {
         let (event, _room) = tokio::time::timeout(Duration::from_secs(20), rx.recv())
             .await
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 352817a0..79a9207e 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -184,6 +184,201 @@ fn d4_counts_parent_handled_questions_and_takeover_are_factual_and_atomic() {
     assert!(!w.store.take_over_child("unknown", &hub).unwrap());
 }
 
+#[test]
+fn review_takeover_reopening_question_advances_its_stream_version() {
+    let (w, p) = pair();
+    let hub = Hub::new();
+    let mut heard = hub.subscribe();
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    w.store
+        .queue_ordinary_answer(
+            &p,
+            1,
+            "digest",
+            &hennery_sessions::delegation_control::DelegatedAnswer {
+                key: "review",
+                child: "child",
+                pending: "ordinary",
+                answer: &answer(),
+            },
+            &hub,
+        )
+        .unwrap();
+    let before = w.store.question_snapshot("child", "ordinary").unwrap().unwrap();
+    let hennery_view::Body::Question(q) = &before.body else {
+        panic!()
+    };
+    assert!(q.answered && !q.answerable);
+    let cursor = w.store.max_event_id().unwrap();
+    assert!(w.store.take_over_child("child", &hub).unwrap());
+    let after = w.store.question_snapshot("child", "ordinary").unwrap().unwrap();
+    let hennery_view::Body::Question(q) = &after.body else {
+        panic!()
+    };
+    assert!(!q.answered && q.answerable, "takeover reopens canonical answerability");
+    assert!(
+        after.version > before.version,
+        "a reopened question must have a newer stream version: before={}, after={}",
+        before.version,
+        after.version
+    );
+    assert_eq!(
+        w.store.pending_touched_after("child", cursor).unwrap(),
+        vec!["ordinary".to_string()]
+    );
+    let mut published = Vec::new();
+    while let Ok(event) = heard.try_recv() {
+        published.push(event);
+    }
+    assert!(
+        published
+            .iter()
+            .any(|event| event.kind == "answer_cancelled" && event.body["pending_id"] == "ordinary")
+    );
+    let cursor = w.store.max_event_id().unwrap();
+    assert!(w.store.take_over_child("child", &hub).unwrap());
+    assert_eq!(
+        w.store.max_event_id().unwrap(),
+        cursor,
+        "repeated takeover creates no second reopening"
+    );
+}
+
+#[test]
+fn review_notice_routing_state_reason_and_grant_changes_invalidate_both_endpoints() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    let hub = Hub::new();
+    w.store.flush_family_changes(&hub).unwrap();
+    for (state, reason) in [
+        ("waiting_config", Some("config_wait")),
+        ("awaiting_reconciliation", None),
+        ("parent_delivered", None),
+        ("parent_delivered", Some("readback_changed")),
+        ("parent_delivered", None),
+    ] {
+        let cursor = w.store.max_event_id().unwrap();
+        raw(&w).execute("UPDATE delegation_notices SET state=?2,reason=?3 WHERE owner_id=?1 AND child_id='child' AND pending_id='ordinary'",params![w.store.owner_id(),state,reason]).unwrap();
+        w.store.flush_family_changes(&hub).unwrap();
+        let page = w.store.family_page("child", "", 20).unwrap().unwrap();
+        assert_eq!(page.questions[0].handling, state);
+        assert!(
+            page.summary.family.unwrap().revision > cursor,
+            "state={state} reason={reason:?}"
+        );
+        let changed = w.store.family_changed_after(cursor).unwrap();
+        assert!(changed.iter().any(|id| id == "parent") && changed.iter().any(|id| id == "child"));
+    }
+    let cursor = w.store.max_event_id().unwrap();
+    raw(&w).execute("UPDATE delegation_notices SET accepted_revision=accepted_revision+1 WHERE owner_id=?1 AND child_id='child' AND pending_id='ordinary'",[w.store.owner_id()]).unwrap();
+    w.store.flush_family_changes(&hub).unwrap();
+    let page = w.store.family_page("child", "", 20).unwrap().unwrap();
+    assert_eq!(page.questions[0].handling, "operator_required");
+    assert!(page.summary.family.unwrap().revision > cursor);
+}
+
+#[test]
+fn review_scope_invalidations_are_owner_bound_and_survive_reopen() {
+    let (w, _) = pair();
+    let before = w.store.view_scope_revision().unwrap();
+    raw(&w)
+        .execute(
+            "INSERT INTO view_scope_invalidations(owner_id,revision) VALUES ('other-owner',99)",
+            [],
+        )
+        .unwrap();
+    assert_eq!(w.store.view_scope_revision().unwrap(), before);
+    raw(&w)
+        .execute(
+            "INSERT INTO purged_hats(owner_id,hat_id,purged_at) VALUES (?1,?2,1)",
+            params![w.store.owner_id(), w.hat],
+        )
+        .unwrap();
+    assert!(w.store.view_scope_revision().unwrap() > before);
+    assert!(w.store.session_scope_frozen("child").unwrap());
+    assert!(!w.store.session_scope_frozen("foreign").unwrap());
+    let reopened = Store::open(&w.db).unwrap();
+    assert_eq!(
+        reopened.view_scope_revision().unwrap(),
+        w.store.view_scope_revision().unwrap()
+    );
+    let changed = reopened.family_changed_after(i64::MAX).unwrap();
+    assert!(
+        changed.iter().any(|id| id == "child"),
+        "a resumed event cursor cannot skip durable scope removal"
+    );
+}
+
+#[test]
+fn review_notice_dispatch_invalidates_family_routing() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "ordinary", PendingKind::Elicitation);
+    let (hub, _rx) = connected();
+    w.store.flush_family_changes(&hub).unwrap();
+    let before = w.store.family_page("child", "", 20).unwrap().unwrap();
+    assert_eq!(before.questions[0].handling, "parent_queued");
+    let cursor = w.store.max_event_id().unwrap();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    w.store.flush_family_changes(&hub).unwrap();
+    let after = w.store.family_page("child", "", 20).unwrap().unwrap();
+    assert_eq!(after.questions[0].handling, "awaiting_reconciliation");
+    assert!(
+        after.summary.family.unwrap().revision > before.summary.family.unwrap().revision,
+        "routing changed without a family revision"
+    );
+    assert!(
+        w.store
+            .family_changed_after(cursor)
+            .unwrap()
+            .contains(&"child".to_string())
+    );
+}
+
+#[test]
+fn review_freeze_invalidates_existing_family_and_attention_subscribers() {
+    let w = World::new();
+    let p = w.start("parent", &w.other, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    child(&w, &p, "child", &w.other);
+    for id in ["parent", "child"] {
+        w.store
+            .ingest(
+                id,
+                2,
+                &SessionBody::SessionParked {
+                    reason: ParkReason::Idle,
+                },
+            )
+            .unwrap();
+    }
+    raw(&w)
+        .execute(
+            "INSERT INTO delegation_attention(owner_id,attention_id,child_id,hat_id,reason,state,incident)
+        VALUES (?1,'review-status','child',?2,'child_failed','open','review-status')",
+            params![w.store.owner_id(), w.other],
+        )
+        .unwrap();
+    let hub = Hub::new();
+    w.store.flush_family_changes(&hub).unwrap();
+    assert_eq!(w.store.operator_waiting_count(Some(&w.other)).unwrap(), 1);
+    let cursor = w.store.max_event_id().unwrap();
+    assert!(matches!(
+        Hosts::open(&w.db).unwrap().begin_purge(&w.other, 1).unwrap(),
+        hennery_kernel::hats::PurgeStart::Frozen { .. }
+    ));
+    w.store.refresh_delegation_attention(&hub, i64::MAX / 2).unwrap();
+    assert!(w.store.family_page("parent", "", 20).unwrap().is_none());
+    assert_eq!(w.store.operator_waiting_count(Some(&w.other)).unwrap(), 0);
+    assert!(
+        w.store
+            .family_changed_after(cursor)
+            .unwrap()
+            .contains(&"child".to_string()),
+        "family disappeared and badge changed, but subscribed clients have no invalidation"
+    );
+}
+
 #[test]
 fn d4_parent_child_counts_include_parent_handled_waiting_and_status_attention() {
     let (w, _) = pair();
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
index f66dda86..effc6758 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
@@ -1,3 +1,6 @@
+DROP TRIGGER family_view_hat_frozen;
+DROP TRIGGER family_view_notice_update;
+DROP TABLE view_scope_invalidations;
 -- Test-only rollback of migration 18 before reconstructing a historical schema.
 -- Production migrations remain append-only.
 DROP TRIGGER family_view_attention_insert;
diff --git a/crates/hennery-sessions/tests/fixtures/undo_family.sql b/crates/hennery-sessions/tests/fixtures/undo_family.sql
index ee4de64c..71760f91 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_family.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_family.sql
@@ -1,3 +1,6 @@
+DROP TRIGGER family_view_hat_frozen;
+DROP TRIGGER family_view_notice_update;
+DROP TABLE view_scope_invalidations;
 -- Test-only rollback of sessions migration 21 for historical schema fixtures.
 DROP TRIGGER family_view_attention_insert;
 DROP TRIGGER family_view_attention_update;
diff --git a/crates/hennery-view/src/fold.rs b/crates/hennery-view/src/fold.rs
index 9f993502..7d4cf15f 100644
--- a/crates/hennery-view/src/fold.rs
+++ b/crates/hennery-view/src/fold.rs
@@ -269,7 +269,7 @@ impl Fold {
         }
         match kind {
             "pending_opened" => return self.question_opened(event, answerable),
-            "answer_submitted" | "answer_result" | "pending_resolved" | "pending_cancelled" => {
+            "answer_submitted" | "answer_result" | "answer_cancelled" | "pending_resolved" | "pending_cancelled" => {
                 return self.question_changed(event, answerable);
             }
             _ => {}
@@ -635,6 +635,17 @@ impl Fold {
         let now = answerable.answerable(pending_id);
         self.change(event, &question_id(pending_id), |body| match body {
             Body::Question(question) => {
+                if event.kind == "answer_cancelled" {
+                    // Only the collector can cancel an undispatched answer.
+                    // A handed-off/delivered or closed question never reopens.
+                    if question.state != PendingState::Open || question.delivered == Some(true) {
+                        return false;
+                    }
+                    question.answered = false;
+                    question.delivered = None;
+                    question.answerable = now;
+                    return true;
+                }
                 let mut changed = question.absorb(state, reason, answered, delivered);
                 changed |= question.answerable != now;
                 question.answerable = now;
diff --git a/crates/hennery-view/src/lib.rs b/crates/hennery-view/src/lib.rs
index c87c1d9d..dcb3a7bc 100644
--- a/crates/hennery-view/src/lib.rs
+++ b/crates/hennery-view/src/lib.rs
@@ -24,4 +24,4 @@ pub use item::*;
 /// The fold's rules' version. Ordinal ids and versions follow the rules:
 /// raise it whenever they change what an event makes, so a client holding
 /// items of the old rules resyncs.
-pub const FOLD_VERSION: u32 = 2;
+pub const FOLD_VERSION: u32 = 3;
diff --git a/crates/hennery-view/tests/rules.rs b/crates/hennery-view/tests/rules.rs
index cb25f2d8..b5fdfb34 100644
--- a/crates/hennery-view/tests/rules.rs
+++ b/crates/hennery-view/tests/rules.rs
@@ -1018,3 +1018,57 @@ fn a_free_text_pairing_past_its_cap_pairs_with_nothing() {
         })
     );
 }
+
+#[test]
+fn review_answer_cancellation_reopens_only_undelivered_open_questions() {
+    let opened = ev(
+        2,
+        "pending_opened",
+        json!({"pending_id":"q","indexed":{"pending":{"id":"q","kind":"elicitation"}},"payload":{}}),
+    );
+    let mut f = Fold::new();
+    f.apply(&opened, &none);
+    f.apply(&ev(3, "answer_submitted", json!({"pending_id":"q"})), &none);
+    f.take();
+    assert!(f.apply(&ev(4, "answer_cancelled", json!({"pending_id":"q"})), &none));
+    let changed = f.take();
+    assert_eq!(changed.len(), 1);
+    let Body::Question(q) = &changed[0].body else { panic!() };
+    assert!(!q.answered && q.delivered.is_none());
+    assert_eq!(changed[0].version, 4);
+    f.apply(&ev(5, "answer_submitted", json!({"pending_id":"q"})), &none);
+    f.apply(
+        &ev(6, "answer_result", json!({"pending_id":"q","delivered":true})),
+        &none,
+    );
+    f.take();
+    f.apply(&ev(7, "answer_cancelled", json!({"pending_id":"q"})), &none);
+    let Body::Question(q) = &f.current().get("question:q").unwrap().body else {
+        panic!()
+    };
+    assert!(
+        q.answered && q.delivered == Some(true),
+        "delivered answers never reopen"
+    );
+    let mut f = Fold::new();
+    f.apply(&opened, &none);
+    f.apply(&ev(3, "answer_submitted", json!({"pending_id":"q"})), &none);
+    f.apply(
+        &ev(
+            4,
+            "pending_cancelled",
+            json!({"pending_id":"q","reason":"host_restarted"}),
+        ),
+        &none,
+    );
+    f.take();
+    assert!(!f.apply(&ev(5, "answer_cancelled", json!({"pending_id":"q"})), &none));
+    let Body::Question(q) = &f.current().get("question:q").unwrap().body else {
+        panic!()
+    };
+    assert_eq!(q.state, PendingState::Cancelled);
+    assert!(
+        q.answered && q.delivered == Some(false),
+        "terminal questions never reopen"
+    );
+}
diff --git a/web/src/components/items/QuestionCard.takeover.test.tsx b/web/src/components/items/QuestionCard.takeover.test.tsx
new file mode 100644
index 00000000..a6d02337
--- /dev/null
+++ b/web/src/components/items/QuestionCard.takeover.test.tsx
@@ -0,0 +1,110 @@
+import { useEffect } from 'react'
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
+import { describe, expect, it } from 'vitest'
+import type { Item } from '../../generated/view'
+import { useSessionItems } from '../../store/useSessionItems'
+import { useAnswering, type AnswerBook } from '../../store/useAnswer'
+import { deferred } from '../../test-locks'
+import { json, liveStream, routed } from '../../test-stream'
+import { ItemView } from '../Transcript'
+
+type Question = Extract<Item, { kind: 'question' }>
+const ID = 'child/1'
+const PAGE = '/api/view/sessions/child%2F1'
+const STREAM = '/api/stream/view/sessions/child%2F1'
+const ANSWER = '/api/sessions/child%2F1/pending/p%2F1/answer'
+const CARD = '/api/view/sessions/child%2F1/questions/p%2F1'
+function question(version: number, answered = false): Question {
+  return { id: 'question:p/1', pending_id: 'p/1', kind: 'question', version,
+    ts: '2026-10-02T10:00:00Z', turn_id: 't1', question_kind: 'elicitation',
+    request: { type: 'elicitation', message: 'Continue?', fields: [], form_supported: true },
+    state: 'open', answered, answerable: !answered }
+}
+function setup(initial = question(1), post: () => Response | Promise<Response> = () => json({ pending_id: 'p/1', request_id: 'r1' }, 202), pinned = false) {
+  const streams = [liveStream(), liveStream()]
+  let book!: AnswerBook
+  let cardReads = 0
+  const t = routed(call => {
+    if (call.path === PAGE) return json({ items: pinned ? [{ id: 'tail', kind: 'message', version: 1, ts: '2026-10-03T10:00:00Z', turn_id: 't2', text: 'Newer turn' }] : [initial], older: pinned, epoch: 'e1', revision: initial.version })
+    if (call.path === STREAM) return streams.shift()!.response
+    if (call.path.endsWith('/catalog')) return json({ session_id: ID, config_options: [], commands: [] })
+    if (call.path === ANSWER && call.method === 'POST') return post()
+    if (call.path === CARD) return pinned && ++cardReads === 1 ? json(initial) : json({ code: 'unavailable', message: 'Offline' }, 503)
+    throw new Error(`Unexpected ${call.method} ${call.path}`)
+  })
+  // Both initial and resumed reads run through the real SSE parser/store.
+  const live = streams[0]
+  const resumed = streams[1]
+  function View() {
+    const s = useSessionItems(ID, { retryMs: () => 1 })
+    book = useAnswering(ID, undefined, s.items, s.loading, s.loads, true, s.mergeQuestion, s.pinned)
+    useEffect(() => { if (pinned && !s.loading) void s.loadQuestion('p/1') }, [s.loading, s.loadQuestion])
+    const items = [...s.pinned, ...s.items]
+    return <><output aria-label="Question version">{items.find(item => item.kind === 'question')?.version}</output>{items.map(item => <ItemView key={item.id} item={item} env={{ sessionId: ID, agent: 'Codex', answers: book }} />)}</>
+  }
+  render(<View />, { wrapper: t.wrapper })
+  return { ...t, live, resumed, book: () => book, posts: () => t.calls.filter(c => c.method === 'POST') }
+}
+
+describe('a question reopened by takeover on the item stream', () => {
+  it.each(['live', 'resumed'] as const)('replaces a parent-queued Sent card through the %s stream with enabled answer controls', async mode => {
+    const t = setup(question(4, true))
+    await screen.findByText('Sent', { exact: true })
+    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
+    await waitFor(() => expect(t.calls.filter(c => c.path === STREAM)).toHaveLength(1))
+    if (mode === 'resumed') {
+      act(() => t.live.end())
+      await waitFor(() => expect(t.calls.filter(c => c.path === STREAM)).toHaveLength(2))
+      expect(t.calls.filter(c => c.path === STREAM)[1].headers['Last-Event-ID']).toBe('e1:4')
+    }
+    act(() => t[mode === 'live' ? 'live' : 'resumed'].event('item', question(5), 'e1:5'))
+    expect(await screen.findByRole('button', { name: 'Decline' })).toBeEnabled()
+    expect(screen.queryByText('Sent', { exact: true })).toBeNull()
+    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
+    await screen.findByText('Sent', { exact: true })
+    expect(t.posts()).toHaveLength(1)
+    expect(t.calls.filter(c => c.path === PAGE)).toHaveLength(1)
+  })
+
+  it.each([false, true])('retires a local Sent outcome only when the store admits a newer reopened version (pinned=%s)', async pinned => {
+    const t = setup(question(1), undefined, pinned)
+    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
+    await screen.findByText('Sent', { exact: true })
+    act(() => t.live.event('item', question(1), 'e1:2'))
+    await act(async () => {})
+    expect(t.book().localOf('question:p/1')?.phase).toBe('sent')
+    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
+    act(() => t.live.event('item', question(3), 'e1:3'))
+    expect(await screen.findByRole('button', { name: 'Decline' })).toBeEnabled()
+    expect(t.book().localOf('question:p/1')).toBeUndefined()
+  })
+
+  it('allows an explicit answer after a newer question supersedes an uncertain local outcome', async () => {
+    let attempt = 0
+    const t = setup(question(1), () => ++attempt === 1 ? json({ code: 'unavailable', message: 'Offline' }, 503) : json({ pending_id: 'p/1', request_id: 'r2' }, 202))
+    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
+    await screen.findByText('Answer status unknown. Reconnect and refresh the question before retrying.', { exact: true })
+    act(() => t.live.event('item', question(3), 'e1:3'))
+    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
+    await screen.findByText('Sent', { exact: true })
+    expect(t.posts()).toHaveLength(2)
+  })
+
+  it.each([202, 503])('does not retain a late HTTP %s outcome over a newer reopened stream item', async status => {
+    const response = deferred<Response>()
+    const t = setup(question(1), () => response.promise)
+    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
+    act(() => t.live.event('item', question(3), 'e1:3'))
+    await waitFor(() => expect(screen.getByLabelText('Question version')).toHaveTextContent('3'))
+    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled()
+    expect(screen.getByText('Sending…', { exact: true })).toBeInTheDocument()
+    // A second click cannot send while the original mutation is in flight.
+    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
+    expect(t.posts()).toHaveLength(1)
+    await act(async () => response.resolve(status === 202 ? json({ pending_id: 'p/1', request_id: 'r1' }, 202) : json({ code: 'unavailable', message: 'Offline' }, 503)))
+    await waitFor(() => expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled())
+    expect(t.book().localOf('question:p/1')).toBeUndefined()
+    expect(screen.queryByText('Sent', { exact: true })).toBeNull()
+    expect(screen.queryByRole('button', { name: 'Refresh question' })).toBeNull()
+  })
+})
diff --git a/web/src/screens/Session.test.tsx b/web/src/screens/Session.test.tsx
index 1cd49403..409a6945 100644
--- a/web/src/screens/Session.test.tsx
+++ b/web/src/screens/Session.test.tsx
@@ -223,14 +223,20 @@ describe('SessionView', () => {
     expect(s.of(STREAM)).toHaveLength(0)
   })
 
-  it('says so when the stream says the session was removed', async () => {
+  it('clears the transcript and related family links when the stream removes the session', async () => {
     const s = server({ pages: [() => json(page(rows(2, 't5')))] })
-    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
+    const summary: SessionSummary = { ...detail('codex'), question_waits: false, operator_attention: 0, parent_handled_questions: 0,
+      family: { revision: 1, parent: { session_id: 'parent1', title: 'Related parent', agent: 'claude' }, children: [],
+        child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 } }
+    render(<SessionView id={ID} summary={summary} timing={FAST} />, { wrapper: s.wrapper })
     await screen.findByText('t5-1')
+    expect(await screen.findByRole('link', { name: 'Related parent', hidden: true })).toHaveAttribute('href', '/sessions/parent1')
     await waitFor(() => expect(s.streams).toHaveLength(1))
     act(() => s.streams[0].event('session_removed', { session_id: ID }))
     expect(await screen.findByRole('heading', { name: 'This session was deleted' })).toBeInTheDocument()
     expect(screen.queryByText('t5-1')).toBeNull()
+    expect(screen.queryByRole('region', { name: 'Session family' })).toBeNull()
+    expect(screen.queryByRole('link', { name: 'Related parent', hidden: true })).toBeNull()
   })
 
   it.each([
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index 6700b16e..737bb7e0 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -264,7 +264,7 @@ export default function SessionView({ id, summary, awaitSummary = false, tail =
   const hats = useMemo(() => namesOf(hatItems, 'id'), [hatItems])
   const plan = useMemo(() => latestPlan(s.items), [s.items])
   const startNotice = useStartNotice(id)
-  const answers = useAnswering(id, info, s.items, s.loading, s.loads, connectedOf(hostItems, info?.host_id), s.mergeQuestion)
+  const answers = useAnswering(id, info, s.items, s.loading, s.loads, connectedOf(hostItems, info?.host_id), s.mergeQuestion, s.pinned)
   const announcement = useAnnouncement(answers)
   const hostAway = useHostAway(answers)
 
diff --git a/web/src/store/useAnswer.ts b/web/src/store/useAnswer.ts
index 4e29ce32..00bc8570 100644
--- a/web/src/store/useAnswer.ts
+++ b/web/src/store/useAnswer.ts
@@ -30,12 +30,14 @@ import type { Draft } from '../lib/elicitation'
 
 /** No draft: one object, so a card's snapshot stays the same. */
 const NO_DRAFT: Draft = Object.freeze({})
+const NO_ITEMS: readonly Item[] = []
 
 type Question = Extract<Item, { kind: 'question' }>
 
 export class AnswerBook {
   private readonly local = new Map<string, LocalAnswer>()
   private readonly inFlight = new Set<string>()
+  private readonly versions = new Map<string, number>()
   private readonly listeners = new Set<() => void>()
   private away = false
   private known: Set<string> | null = null
@@ -64,7 +66,11 @@ export class AnswerBook {
   }
 
   private set(id: string, answer: LocalAnswer) {
-    this.local.set(id, answer)
+    // An admitted stream/page version supersedes a settled HTTP outcome,
+    // including a late ambiguous response that would otherwise block retries.
+    // An actual POST in flight still keeps the single-answer guard.
+    if (answer.phase !== 'sending' && answer.version < (this.versions.get(id) ?? -Infinity)) this.local.delete(id)
+    else this.local.set(id, answer)
     this.emit()
   }
 
@@ -143,16 +149,26 @@ export class AnswerBook {
    *  `loads` counts the pages that replaced the items (the first, and each
    *  resync's): a new one is a new baseline, so a question that came with a
    *  resync is never fresh, wherever it sits. */
-  observe(items: readonly Item[], loads: number) {
+  observe(items: readonly Item[], loads: number, pinned: readonly Item[] = NO_ITEMS) {
     // The first page's newest time, once: host markers after it count.
     if (this.since === undefined) this.since = newestTs(items)
     const known = loads === this.loads ? this.known : null
     this.loads = loads
     for (const id of freshQuestions(items, known, this.lastId)) this.fresh.add(id)
     const held = known ?? new Set<string>()
-    for (const item of items) if (item.kind === 'question') held.add(item.id)
+    let changed = false
+    for (const item of [...items, ...pinned]) if (item.kind === 'question') {
+      held.add(item.id)
+      this.versions.set(item.id, Math.max(item.version, this.versions.get(item.id) ?? -Infinity))
+      const local = this.local.get(item.id)
+      if (local && local.phase !== 'sending' && local.version < item.version) {
+        this.local.delete(item.id)
+        changed = true
+      }
+    }
     this.known = held
     this.lastId = items.length > 0 ? items[items.length - 1].id : undefined
+    if (changed) this.emit()
   }
 
   /** Whether the card of question `id` may take the focus: once, and only
@@ -215,7 +231,8 @@ export function useFormDraft(book: AnswerBook | undefined, id: string): [Draft,
  *  count of pages that replaced the items (a resync's included).
  *  `connected`: what the view's hosts list said of the session's host when
  *  it opened (undefined: unknown), the seed the host markers since then
- *  overrule. */
+ *  overrule. Pinned deep-link questions participate in version admission,
+ *  without counting as newly opened tail cards. */
 export function useAnswering(
   sessionId: string,
   info: Pick<SessionItem, 'presumed_parked'> | undefined,
@@ -224,14 +241,15 @@ export function useAnswering(
   loads: number,
   connected: boolean | undefined,
   onQuestion?: (item: Item) => void,
+  pinned: readonly Item[] = NO_ITEMS,
 ): AnswerBook {
   const client = useClient()
   const book = useMemo(() => new AnswerBook(client, sessionId, onQuestion), [client, sessionId, onQuestion])
   // Before the cards' effects (a layout effect runs first): a fresh card
   // finds itself fresh when it mounts.
   useLayoutEffect(() => {
-    if (!loading) book.observe(items, loads)
-  }, [book, items, loading, loads])
+    if (!loading) book.observe(items, loads, pinned)
+  }, [book, items, loading, loads, pinned])
   // After `observe`: the first page's time is known before its markers
   // are read (before it, the store holds no items).
   const presumedParked = Boolean(info?.presumed_parked)
```

Generated with Claude AI — please review before distribution.
