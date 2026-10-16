# Delegation attention and operator fallback (D3b) Implementation Plan

**Goal:** finish D3's durable parent/child loop with handling deadlines, durable operator fallback and reconciled Web Push, including deletion and reassignment races. Consume the [delegation design](../specs/2026-10-14-delegation-design.md), §§5–7 and 9–11, and the [D3a delivery plan](2026-10-31-delegation-delivery.md). Delegation remains preview-gated until D4.

**Architecture:** migration 20 reserves attention in the source transaction, separate from delivery receipts and push attempts. An independent bounded task reconciles deadlines and notifications while the dispatch scheduler awaits host I/O. Operator routes expose attention, explicit rearm and status acknowledgement. The merged push lane supplies policies, encryption, retries and card links; an owner-module guard revalidates queued work at transport admission.

**Tech stack:** existing Rust/SQLite/tokio workspace. No dependencies, wire-contract changes, generated assets or web changes.

## Execution status (2026-10-16)

**Review amendment:** all four D3b findings against **f3f559d1** are fixed test-first. The final six Rust gates (**2,443 tests**) and native Nix passed; eleven guard mutations were detected in an APFS-cloned COPY, and the new deadline test passed 4×3 under load. No full replay was repeated. See [D3b review amendment](#d3b-review-amendment-2026-10-16). D3a and C2 implementation files were left untouched; independent re-review remains required.

**C2 integration baseline:** rebased onto **1888d687 /main 7fe43fbe**. Both runtime patches are preserved, 316 targeted tests and the single combined full gate set passed (**2,436 Rust tests**); native Nix passed. See [C2 rebase and combined verification](#c2-rebase-and-combined-verification-2026-10-15). Prior replay/load evidence below is historical.

Built first on D3a, paused at a committed WIP boundary for review amendments, then rebased onto **79304d58**. Every initial regression was run RED before the corresponding implementation: missing attention/guard APIs and HTTP 404, followed by behavioral failures for old operator epochs, canonical answer queues, revoked hosts, missing question detail, repeated notification runs, orphan facts after parent deletion, automatic report completion push routing, and suppressed pushes incorrectly changing device errors. Exact resulting tests and implementation are embedded below. Both fresh replays, COPY probes, 4×3 load and the final six Rust/native Nix gates passed as recorded below. The implementation is committed at **6ce346de**. Parent-run independent review and CI remain required; no approval is claimed.

## Scope

In: five-minute persisted handling deadlines including delivered unanswered questions; immediate fallback for unsupported/unavailable parents and permission requests; durable operator work independent of notice deletion; explicit rearm after a new factual root Operator prompt; status acknowledgement; bounded attention pagination; restart and dropped-queue push reconciliation with stable tags; ordinary/delegated push routing; current owner/hat/pending/purge admission; parent/child deletion and reassignment; facts arriving after parent deletion; actual worker→HTTP/operator answer→child completion loop.

Out: D4 family UI, attention rendering/counts and pinned live inference acceptance; memory plug-in and C2 startup implementation; changing preview gates; lock-screen replies; publication. Notifications open the child card. Push is best effort and never proves handling or answers a question.

## Decisions this plan makes where the spec is silent

| Detail | Choice and consequence | Review authority |
|---|---|---|
| Durable attention | One inert row per source incident, reserved in the source transaction. Operator fallback activates it; answers and terminal facts resolve it. No question/report transcript is duplicated | Parent review requested |
| Deadline | Persist the D3a five-minute deadline. Unsupported connected hosts and invalid current routes fall back immediately; offline/busy parents retain the grace. Pending callbacks never expire because of this deadline | Parent review requested |
| Rearm | Explicit operator action plus a new, actually acknowledged root Operator turn after fallback. A plain prompt alone never retries old work. Delivered questions retain their destination association; uncertain/not-delivered associated turns cannot be replaced. Permissions and detached relationships cannot be rearmed | Parent review requested |
| Status acknowledgement | Operator-only acknowledgement resolves a report without sending a prompt, granting permission or answering a question | Parent review requested |
| Push reconciliation | Per-collector run identity, stable attention tag, restart reconciliation and at most one attempt every five minutes within a run. Muted, dropped or failed push leaves durable work open | Parent review requested |
| Deletion | Parent deletion preserves only surviving child attention, stripping the receipt link. The immutable delegated-child flag lets later facts create operator work without retaining deleted parent identifiers. Resolved coalescible incidents retain only a child/incident tombstone with no parent, delivery or push references. Canonical open questions keep an inert reservation while an answer is queued. Child deletion removes attention; reassignment moves it to the current hat and invalidates old payloads | Plan 9 purge semantics; parent review requested |
| Admission | Revalidate before payload creation, after semaphore acquisition and before each transport attempt. Guard success admits that attempt; an external copy already admitted cannot be recalled. Suppression never changes subscription health | Parent security/race review requested |
| Automatic completion | Root completion push uses the exact applied source event and C1 turn origin. Automatic ChildReport turns remain quiet; actual Operator turns retain ordinary notifications | Parent review requested |

## Global Constraints

- Consume shared C1 Operator/Parent/ChildReport provenance; never redefine it or infer operator intent from a report.
- Permission requests always go to the operator. One generation of children, existing control fences, and preview gating remain in force.
- Durable attention and delivery facts are separate from in-memory push attempts. A send, timeout or notification click is never an answer or delivery acknowledgement.
- All SQL is owner-scoped, and new modules join the unchanged owner audit with nonzero statement minima. Source ingestion and attention creation roll back together.
- Recheck current family, hat, grant, close, canonical pending and actual Operator epoch for rearm. No orphan adoption, silent resend or changing uncertain turn identities.
- Reuse push plan 10 policies, encrypted payloads and escaped card links. No notification actions/replies or credentials from agent content.
- Hold the existing owner gate through synchronous enqueue; never hold it across asynchronous transport. Reassignment/deletion/purge/answers invalidate later admissions.
- Preserve plan 9 purge honesty: no deleted-parent link or content in surviving attention. Historical C1 evidence remains only in already surviving destination turns as specified by D3a's amendment.
- Touch no C2 startup/API/wire implementation. Shared AppState run identity, store migration registration and internal Edge source-event identity are minimal coordination seams.
- Build first; observe RED; embed; run one fresh replay before first review. Clone target/ into each replay/probe COPY with cp -c -R, batch guard-family probes, and never share a target directory or delete scratch copies.
- Follow the operator's verification budget: load 4×3 only for concurrency/timing tests; one full workspace run per plan, repeated only after a conflicting or hotspot rebase. Post-review amendments use targeted RED tests, cloned-copy guard probes and staged-byte checks, without another full replay.

## Review Focus

1. Source/attention rollback, schema backfill and state-trigger ordering; deadline versus late turn_started/answer/close; delivered unanswered questions and already delivered reports.
2. Parent deletion before/after fallback, after parent delivery, and between actual host crash frames; surviving child questions/status/start failures; no deleted routing identifiers beyond historical C1 evidence.
3. Delete/reassign versus enqueue and transport admission; old-hat payloads, purge, canonical answer queue and retry delays; externally admitted copies are explicitly outside recall.
4. Explicit rearm epoch snapshot at first fallback, genuine Operator origin, accepted destination association, permissions, detach and current grants; acknowledge cannot answer questions.
5. Stable tags, collector-wide run identity, queue saturation/no reader/muting, bounded page advancement and startup reconciliation. Automatic parent completions must not bypass operator routing.
6. Existing end-to-end parent/child loop plus deadline fallback, operator HTTP answer and completion acknowledgement; D4 UI/live acceptance remains a release blocker.

## File structure

- sessions delegation_attention.sql / delegation_attention.rs: migration, bounded deadlines, projection, rearm/acknowledge, push reconciliation/current guard and orphan fallback.
- sessions delegation_delivery / delegation_worker: transactional reservation, orphan facts and bounded scheduler integration.
- sessions delegation_api / ws / notify / lib / store: operator routes, push routing and minimal shared run/source-event seams.
- kernel push / delivery: installed dynamic owner-module guard and suppression without subscription-health errors.
- sessions delegation_d2 / store, kernel delivery and testkit delegation_tools / owner_filter: behavioral, integration, schema and owner regressions.
- historical undo fixture and nix/package.nix: migration compatibility and SQL source closure.

**Reading the steps:** apply each nonempty fenced diff with git apply --index in order on pinned base **79304d58**. The first block is the final regression state and must fail; the second is implementation and must pass. These synthetic final states do not claim intermediate edits never needed correction. The replay refuses zero blocks/files and compares the complete tracked implementation tree byte-for-byte, excluding only this plan and its README index line.

### Task 1, step 1: specify attention, push admission and the operator loop

- [x] Run each regression against the missing behavior and observe RED. Preserve logs in the ledger.

<!-- replay {"checks":[["cargo test -p hennery-sessions --test delegation_d2 --locked d3b_",101],["cargo test -p hennery-kernel --test delivery --locked d3b_",101],["cargo test -p hennery-testkit --test delegation_tools --locked d3b_",101]]} -->
```diff
diff --git a/crates/hennery-kernel/tests/delivery.rs b/crates/hennery-kernel/tests/delivery.rs
index 2cecef76..e0fa7f73 100644
--- a/crates/hennery-kernel/tests/delivery.rs
+++ b/crates/hennery-kernel/tests/delivery.rs
@@ -650,3 +650,69 @@ async fn an_answer_for_a_rotated_endpoint_leaves_the_new_one_alone() {
         assert_eq!(subs[0].last_success_at, None, "{code}");
     }
 }
+
+#[tokio::test]
+async fn d3b_guard_rejects_a_stale_queued_notice_before_encryption_or_send() {
+    let setup = Setup::new("https://hennery.example");
+    setup.subscribe("https://push.example.net/device", &Browser::new(21), None);
+    let delivery = setup.delivery(at_once());
+    let (push, notices) = Push::new();
+    let current_guard = notices.guard();
+    push.set_guard(Arc::new(|_| false));
+    let done = delivery
+        .deliver_guarded(&notice(&setup.hat()), current_guard)
+        .await
+        .unwrap();
+    assert!(done.is_empty());
+    assert!(setup.fake.sent().is_empty());
+}
+#[tokio::test(start_paused = true)]
+async fn d3b_guard_is_rechecked_after_retry_delay() {
+    let setup = Setup::new("https://hennery.example");
+    setup.subscribe("https://push.example.net/device", &Browser::new(22), None);
+    setup.fake.answer(
+        "https://push.example.net/device",
+        &[Sent::Status {
+            code: 503,
+            retry_after: None,
+        }],
+    );
+    let current = Arc::new(std::sync::atomic::AtomicBool::new(true));
+    let change = current.clone();
+    setup.fake.on_send(move || {
+        change.store(false, std::sync::atomic::Ordering::SeqCst);
+    });
+    let (push, notices) = Push::new();
+    push.set_guard(Arc::new(move |_| current.load(std::sync::atomic::Ordering::SeqCst)));
+    let result = setup
+        .delivery(at_once())
+        .deliver_guarded(&notice(&setup.hat()), notices.guard())
+        .await
+        .unwrap();
+    assert_eq!(setup.fake.sent().len(), 1, "revoked work must not retry");
+    assert_eq!(result[0].1, Outcome::Suppressed);
+    assert_eq!(
+        setup.hosts.subscriptions().unwrap()[0].last_error,
+        None,
+        "revoked work is not a device failure"
+    );
+}
+#[tokio::test]
+async fn d3b_production_queue_uses_the_installed_guard() {
+    let setup = Setup::new("https://hennery.example");
+    setup.subscribe("https://push.example.net/device", &Browser::new(23), None);
+    let (push, notices) = Push::new();
+    let (seen, mut seen_rx) = tokio::sync::mpsc::unbounded_channel();
+    push.set_guard(Arc::new(move |_| {
+        seen.send(()).unwrap();
+        false
+    }));
+    let task = tokio::spawn(setup.delivery(at_once()).run(notices));
+    push.notify(notice(&setup.hat()));
+    tokio::time::timeout(Duration::from_secs(5), seen_rx.recv())
+        .await
+        .unwrap()
+        .unwrap();
+    assert!(setup.fake.sent().is_empty());
+    task.abort();
+}
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 621b03b1..7ca7e1e3 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -3172,3 +3172,812 @@ fn reviewer_host_crash_delivered_between_frames_never_wakes_twice_and_keeps_erro
         );
     }
 }
+
+// D3b: operator attention is durable state, independent of push success.
+#[test]
+fn d3b_delegated_edges_use_durable_routing_and_ordinary_edges_still_notify() {
+    let (w, _) = pair();
+    let edge = pending(&w, "child", 2, "question", PendingKind::Elicitation)
+        .edge
+        .unwrap();
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store.route_push_edge(&edge, &push).unwrap();
+    assert!(
+        notices.try_recv().is_none(),
+        "parent-handled work gets the grace period"
+    );
+    let mut ordinary = edge;
+    ordinary.session.id = "parent".into();
+    w.store.route_push_edge(&ordinary, &push).unwrap();
+    assert_eq!(notices.try_recv().unwrap().tag, "parent");
+}
+#[test]
+fn d3b_permission_cannot_be_rearmed_as_parent_work() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    let id = attention(&w)[0].id.clone();
+    user_turn_with_origin(&w, "parent", 3, "operator", InputOrigin::Operator {});
+    assert!(!w.store.rearm_delegation_attention(&id, "operator", unix_now()).unwrap());
+    assert_eq!(attention(&w).len(), 1);
+}
+#[test]
+fn d3b_delete_racing_enqueue_leaves_no_current_push_or_attention() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    let start = Barrier::new(3);
+    std::thread::scope(|scope| {
+        scope.spawn(|| {
+            start.wait();
+            w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+        });
+        scope.spawn(|| {
+            start.wait();
+            w.store.close_now("child").unwrap();
+            w.store.delete_session("child", None).unwrap();
+        });
+        start.wait();
+    });
+    while let Some(notice) = notices.try_recv() {
+        assert!(!w.store.delegation_push_current(&notice).unwrap());
+    }
+    assert!(attention(&w).is_empty());
+}
+fn attention(w: &World) -> Vec<hennery_sessions::delegation_attention::OperatorAttention> {
+    w.store.operator_attention(None, "").unwrap()
+}
+fn deadline(w: &World) -> i64 {
+    raw(w)
+        .query_row(
+            "SELECT deadline FROM delegation_notices WHERE owner_id=?1 ORDER BY rowid LIMIT 1",
+            [w.store.owner_id()],
+            |r| r.get(0),
+        )
+        .unwrap()
+}
+#[test]
+fn d3b_deadline_is_persisted_and_does_not_expire_the_question() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (hub, _) = connected();
+    let due = deadline(&w);
+    w.store.refresh_delegation_attention(&hub, due - 1).unwrap();
+    assert!(attention(&w).is_empty());
+    Store::open(&w.db)
+        .unwrap()
+        .refresh_delegation_attention(&hub, due)
+        .unwrap();
+    assert_eq!(attention(&w)[0].reason, "handling_deadline");
+    assert!(w.store.still_open("child", "question").unwrap());
+    assert_eq!(notices(&w)[0].1, "operator_required");
+}
+#[test]
+fn d3b_delivered_unanswered_question_escalation_is_sticky() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (hub, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "parent",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    w.store.refresh_delegation_attention(&hub, deadline(&w)).unwrap();
+    assert_eq!(attention(&w).len(), 1);
+    ended(&w, "parent", 4, &turn);
+    w.store.refresh_delegation_attention(&hub, deadline(&w) + 1).unwrap();
+    assert_eq!(attention(&w).len(), 1, "delivery facts cannot erase fallback");
+    assert!(!w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    assert!(rx.try_recv().is_err());
+    let id = attention(&w)[0].id.clone();
+    let now = deadline(&w) + 2;
+    user_turn_with_origin(&w, "parent", 5, "new-operator", InputOrigin::Operator {});
+    w.store.refresh_delegation_attention(&hub, now).unwrap();
+    assert!(w.store.rearm_delegation_attention(&id, "new-operator", now).unwrap());
+    assert!(attention(&w).is_empty());
+    assert_eq!(notices(&w)[0].1, "parent_delivered");
+    assert!(!w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    assert!(rx.try_recv().is_err(), "rearm must not duplicate a delivered question");
+}
+#[test]
+fn d3b_delivered_report_needs_no_answer_or_deadline_fallback() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    user_turn_with_origin(&w, "child", 2, "report-turn", InputOrigin::Operator {});
+    ended(&w, "child", 3, "report-turn");
+    let (hub, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "parent",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn,
+            },
+        )
+        .unwrap();
+    w.store.refresh_delegation_attention(&hub, deadline(&w) + 1).unwrap();
+    assert!(attention(&w).is_empty());
+}
+#[test]
+fn d3b_permission_and_parent_close_commit_attention_atomically() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    assert_eq!(attention(&w).len(), 1);
+    pending(&w, "child", 3, "question", PendingKind::Elicitation);
+    assert_eq!(attention(&w).len(), 1);
+    w.store.record_close_request("parent").unwrap();
+    assert_eq!(attention(&w).len(), 2);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store
+        .enqueue_delegation_attention(&push, "run", "", unix_now())
+        .unwrap();
+    let notice = notices.try_recv().unwrap();
+    assert!(notice.url.contains("pending="));
+    assert!(notice.tag.starts_with("delegation:"));
+    assert_eq!(notice.detail.as_deref(), Some("question"));
+}
+#[test]
+fn d3b_attention_write_failure_rolls_back_permission_source() {
+    let (w, _) = pair();
+    raw(&w).execute_batch("CREATE TRIGGER reject_attention BEFORE INSERT ON delegation_attention BEGIN SELECT RAISE(ABORT,'attention rejected'); END;").unwrap();
+    let result = w.store.ingest(
+        "child",
+        2,
+        &SessionBody::PendingOpened {
+            pending_id: "permission".into(),
+            indexed: Indexed {
+                pending: Some(Box::new(PendingExtract {
+                    id: "permission".into(),
+                    kind: PendingKind::Permission,
+                    option_ids: Some(vec!["allow".into()]),
+                    title: None,
+                })),
+                ..Default::default()
+            },
+            payload: json!({}),
+        },
+    );
+    assert!(result.is_err());
+    assert!(!w.store.still_open("child", "permission").unwrap());
+}
+#[test]
+fn d3b_push_reconciliation_reuses_tags_and_never_resolves_attention() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store.enqueue_delegation_attention(&push, "first", "", 1000).unwrap();
+    let first = notices.try_recv().unwrap();
+    w.store.enqueue_delegation_attention(&push, "first", "", 1001).unwrap();
+    assert!(notices.try_recv().is_none());
+    Store::open(&w.db)
+        .unwrap()
+        .enqueue_delegation_attention(&push, "restart", "", 1001)
+        .unwrap();
+    assert_eq!(notices.try_recv().unwrap(), first);
+    w.store
+        .enqueue_delegation_attention(&push, "restart", "", 1301)
+        .unwrap();
+    assert_eq!(
+        notices.try_recv().unwrap(),
+        first,
+        "bounded retry after in-memory queue loss"
+    );
+    assert_eq!(attention(&w).len(), 1);
+    assert!(w.store.delegation_push_current(&first).unwrap());
+    w.store
+        .submit_answer(
+            "child",
+            "permission",
+            &AnswerRequest::Permission {
+                option_id: "allow".into(),
+            },
+        )
+        .unwrap();
+    assert!(attention(&w).is_empty());
+    assert!(!w.store.delegation_push_current(&first).unwrap());
+}
+#[test]
+fn d3b_parent_delete_preserves_scrubbed_surviving_child_attention() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store.close_now("parent").unwrap();
+    w.store.delete_session("parent", None).unwrap();
+    assert!(notices(&w).is_empty());
+    let rows = attention(&w);
+    assert_eq!(rows.len(), 1);
+    assert_eq!(rows[0].child_id, "child");
+    assert_eq!(rows[0].reason, "parent_deleted");
+    assert!(w.store.find_session("child").unwrap().is_some());
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT delivery_id FROM delegation_attention WHERE owner_id=?1",
+                [w.store.owner_id()],
+                |r| r.get::<_, Option<String>>(0)
+            )
+            .unwrap(),
+        None
+    );
+    assert!(matches!(
+        w.store.submit_answer("child", "question", &answer()).unwrap(),
+        AnswerSubmission::Queued(_)
+    ));
+    assert!(
+        attention(&w).is_empty(),
+        "the detached child remains directly answerable"
+    );
+    w.store.close_now("child").unwrap();
+    w.store.delete_session("child", None).unwrap();
+    assert!(attention(&w).is_empty());
+}
+#[test]
+fn d3b_reassignment_invalidates_old_hat_push_and_moves_fallback() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+    let old = notices.try_recv().unwrap();
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::SessionParked {
+                reason: ParkReason::Idle,
+            },
+        )
+        .unwrap();
+    assert!(matches!(
+        w.store.reassign_hat("child", &w.other).unwrap(),
+        hennery_sessions::store::Reassign::Done(_)
+    ));
+    assert!(!w.store.delegation_push_current(&old).unwrap());
+    assert!(w.store.operator_attention(Some(&w.hat), "").unwrap().is_empty());
+    // Park cancelled the permission. Its separate loss status moves to the
+    // child's new hat, without retaining an answer link to the cancelled callback.
+    let rows = attention(&w);
+    assert_eq!(rows.len(), 1);
+    assert_eq!(rows[0].hat_id, w.other);
+    assert_eq!(rows[0].pending_id, None);
+    assert_ne!(format!("delegation:{}", rows[0].id), old.tag);
+}
+#[test]
+fn d3b_rearm_requires_explicit_intent_a_new_factual_operator_turn_and_live_edge() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (hub, _) = connected();
+    let due = deadline(&w);
+    w.store.refresh_delegation_attention(&hub, due).unwrap();
+    let id = attention(&w)[0].id.clone();
+    assert!(!w.store.rearm_delegation_attention(&id, "missing", due + 1).unwrap());
+    user_turn_with_origin(
+        &w,
+        "parent",
+        3,
+        "copied-report",
+        InputOrigin::ChildReport {
+            child_id: "child".into(),
+            source_event_id: "7".into(),
+            delivery_id: "copy".into(),
+        },
+    );
+    assert!(
+        !w.store
+            .rearm_delegation_attention(&id, "copied-report", due + 1)
+            .unwrap()
+    );
+    user_turn_with_origin(&w, "parent", 5, "operator", InputOrigin::Operator {});
+    assert_eq!(attention(&w).len(), 1, "a plain operator prompt does not rearm");
+    assert!(w.store.rearm_delegation_attention(&id, "operator", due + 1).unwrap());
+    assert!(attention(&w).is_empty());
+    assert_eq!(notices(&w)[0].1, "parent_queued");
+    assert!(!w.store.rearm_delegation_attention(&id, "operator", due + 2).unwrap());
+    w.store.refresh_delegation_attention(&hub, due + 301).unwrap();
+    assert_eq!(attention(&w).len(), 1);
+    w.store.record_close_request("parent").unwrap();
+    assert!(!w.store.rearm_delegation_attention(&id, "operator", due + 302).unwrap());
+}
+#[test]
+fn d3b_unsupported_connected_parent_falls_back_immediately_but_offline_gets_grace() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let hub = Hub::new();
+    w.store.refresh_delegation_attention(&hub, deadline(&w) - 299).unwrap();
+    assert!(attention(&w).is_empty());
+    let (sender, _) = tokio::sync::mpsc::unbounded_channel();
+    let reg = hub
+        .register("host", sender, Capabilities(vec![]), AgentIsolation::default())
+        .unwrap();
+    hub.mark_ready("host", reg.conn_id);
+    w.store.refresh_delegation_attention(&hub, deadline(&w) - 299).unwrap();
+    assert_eq!(attention(&w)[0].reason, "unsupported_delivery");
+}
+#[test]
+fn d3b_final_push_guard_rejects_purge_and_deleted_children() {
+    for purge in [false, true] {
+        let (w, _) = pair();
+        pending(&w, "child", 2, "permission", PendingKind::Permission);
+        let (push, mut notices) = hennery_kernel::push::Push::new();
+        w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+        let n = notices.try_recv().unwrap();
+        assert!(w.store.delegation_push_current(&n).unwrap());
+        if purge {
+            raw(&w)
+                .execute(
+                    "INSERT INTO purged_hats(owner_id,hat_id,purged_at) VALUES (?1,?2,1)",
+                    params![w.store.owner_id(), w.hat],
+                )
+                .unwrap();
+        } else {
+            w.store.close_now("child").unwrap();
+            w.store.delete_session("child", None).unwrap();
+        }
+        assert!(!w.store.delegation_push_current(&n).unwrap());
+    }
+}
+
+#[test]
+fn d3b_acknowledging_a_report_is_durable_but_cannot_answer_a_question() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store.record_close_request("parent").unwrap();
+    let question = attention(&w)[0].id.clone();
+    assert!(!w.store.acknowledge_delegation_attention(&question).unwrap());
+    assert!(w.store.still_open("child", "question").unwrap());
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::AdapterExited {
+                code: Some(1),
+                signal: None,
+                stderr_tail: String::new(),
+            },
+        )
+        .unwrap();
+    let report = attention(&w).into_iter().find(|a| a.pending_id.is_none()).unwrap().id;
+    assert!(w.store.acknowledge_delegation_attention(&report).unwrap());
+    assert_eq!(
+        notices(&w)
+            .into_iter()
+            .find(|n| n.0 == "session_unavailable")
+            .unwrap()
+            .1,
+        "resolved"
+    );
+    assert!(!w.store.acknowledge_delegation_attention(&report).unwrap());
+    let (hub, _) = connected();
+    Store::open(&w.db)
+        .unwrap()
+        .refresh_delegation_attention(&hub, unix_now() + 600)
+        .unwrap();
+    assert!(attention(&w).is_empty());
+}
+#[test]
+fn d3b_rearm_rejects_an_operator_prompt_that_predates_the_fallback() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    user_turn_with_origin(&w, "parent", 3, "before-deadline", InputOrigin::Operator {});
+    let (hub, _) = connected();
+    let due = deadline(&w);
+    w.store.refresh_delegation_attention(&hub, due).unwrap();
+    let id = attention(&w)[0].id.clone();
+    assert!(
+        !w.store
+            .rearm_delegation_attention(&id, "before-deadline", due + 1)
+            .unwrap()
+    );
+}
+
+#[test]
+fn d3b_revoked_parent_host_falls_back_without_waiting_for_deadline() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    Hosts::open(&w.db).unwrap().revoke("host", unix_now()).unwrap();
+    w.store.revoke_host("host").unwrap();
+    w.store
+        .refresh_delegation_attention(&Hub::new(), deadline(&w) - 299)
+        .unwrap();
+    assert!(attention(&w).iter().any(|a| a.reason == "parent_unavailable"));
+}
+#[test]
+fn d3b_push_admission_checks_the_canonical_answer_queue() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+    let notice = notices.try_recv().unwrap();
+    w.store
+        .submit_answer(
+            "child",
+            "permission",
+            &AnswerRequest::Permission {
+                option_id: "allow".into(),
+            },
+        )
+        .unwrap();
+    // Final admission remains safe even if a derived projection is stale.
+    raw(&w)
+        .execute(
+            "UPDATE delegation_attention SET state='open' WHERE owner_id=?1",
+            [w.store.owner_id()],
+        )
+        .unwrap();
+    assert!(!w.store.delegation_push_current(&notice).unwrap());
+}
+#[test]
+fn d3b_reassignment_racing_enqueue_rejects_old_hat_payloads() {
+    let (w, _) = pair();
+    user_turn_with_origin(&w, "child", 2, "report", InputOrigin::Operator {});
+    w.store.record_close_request("parent").unwrap();
+    w.store
+        .ingest(
+            "child",
+            4,
+            &SessionBody::SessionParked {
+                reason: ParkReason::Idle,
+            },
+        )
+        .unwrap();
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    let start = Barrier::new(3);
+    std::thread::scope(|scope| {
+        scope.spawn(|| {
+            start.wait();
+            w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+        });
+        scope.spawn(|| {
+            start.wait();
+            assert!(matches!(
+                w.store.reassign_hat("child", &w.other).unwrap(),
+                hennery_sessions::store::Reassign::Done(_)
+            ));
+        });
+        start.wait();
+    });
+    while let Some(notice) = notices.try_recv() {
+        assert_eq!(
+            w.store.delegation_push_current(&notice).unwrap(),
+            notice.hat_id == w.other
+        );
+    }
+    assert!(w.store.operator_attention(Some(&w.hat), "").unwrap().is_empty());
+    assert_eq!(w.store.operator_attention(Some(&w.other), "").unwrap().len(), 1);
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM delegation_attention WHERE owner_id=?1 AND delivery_id IS NOT NULL",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+}
+#[test]
+fn d3b_muted_and_dropped_pushes_leave_durable_work_for_reconciliation() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    w.store
+        .enqueue_delegation_attention(&hennery_kernel::push::Push::detached(), "lost", "", 1000)
+        .unwrap();
+    assert_eq!(attention(&w).len(), 1);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store
+        .enqueue_delegation_attention(&push, "restart", "", 1001)
+        .unwrap();
+    let template = notices.try_recv().unwrap();
+    assert!(
+        hennery_kernel::delivery::payload_for(
+            &template,
+            hennery_kernel::push::PushPolicy {
+                muted: true,
+                ..Default::default()
+            }
+        )
+        .is_none()
+    );
+    for i in 0..hennery_kernel::push::NOTICE_QUEUE {
+        let mut notice = template.clone();
+        notice.tag = format!("fill-{i}");
+        push.notify(notice);
+    }
+    w.store
+        .enqueue_delegation_attention(&push, "overflow", "", 1002)
+        .unwrap();
+    assert_eq!(notices.dropped(), 1);
+    assert_eq!(attention(&w).len(), 1);
+    while notices.try_recv().is_some() {}
+    w.store
+        .enqueue_delegation_attention(&push, "overflow", "", 1302)
+        .unwrap();
+    assert_eq!(notices.try_recv().unwrap(), template);
+    assert_eq!(attention(&w).len(), 1);
+}
+#[test]
+fn d3b_parent_delete_removes_inert_attention_metadata_for_delivered_reports() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    user_turn_with_origin(&w, "child", 2, "report", InputOrigin::Operator {});
+    let (hub, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "parent",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    ended(&w, "parent", 4, &turn);
+    w.store.close_now("parent").unwrap();
+    w.store.delete_session("parent", None).unwrap();
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM delegation_attention WHERE owner_id=?1",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+}
+#[test]
+fn d3b_attention_pages_and_push_pages_are_bounded_and_advance() {
+    let (w, _) = pair();
+    for i in 0..129 {
+        pending(&w, "child", 2 + i, &format!("permission-{i}"), PendingKind::Permission);
+    }
+    let first = w.store.operator_attention(Some(&w.hat), "").unwrap();
+    assert_eq!(first.len(), 100);
+    let second = w
+        .store
+        .operator_attention(Some(&w.hat), &first.last().unwrap().id)
+        .unwrap();
+    assert_eq!(second.len(), 29);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    let after = w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+    assert!(!after.is_empty());
+    let mut count = 0;
+    while notices.try_recv().is_some() {
+        count += 1;
+    }
+    assert_eq!(count, 128);
+    w.store
+        .enqueue_delegation_attention(&push, "run", &after, 1000)
+        .unwrap();
+    assert!(notices.try_recv().is_some());
+    assert!(notices.try_recv().is_none());
+}
+
+#[tokio::test]
+async fn d3b_repeated_drains_share_one_notification_run_but_restart_reconciles() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    let mut state = hennery_sessions::AppState::new(
+        Store::open(&w.db).unwrap(),
+        Hosts::open(&w.db).unwrap(),
+        Operator::open(&w.db).unwrap(),
+    );
+    state.push = push.clone();
+    hennery_sessions::delegation_worker::drain(&state).await.unwrap();
+    let first = notices.try_recv().unwrap();
+    hennery_sessions::delegation_worker::drain(&state.clone())
+        .await
+        .unwrap();
+    assert!(
+        notices.try_recv().is_none(),
+        "workers in one collector share a run identity"
+    );
+    let mut restarted = hennery_sessions::AppState::new(
+        Store::open(&w.db).unwrap(),
+        Hosts::open(&w.db).unwrap(),
+        Operator::open(&w.db).unwrap(),
+    );
+    restarted.push = push;
+    hennery_sessions::delegation_worker::drain(&restarted).await.unwrap();
+    assert_eq!(notices.try_recv().unwrap(), first);
+}
+
+#[test]
+fn d3b_automatic_report_completion_does_not_bypass_operator_push_routing() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (hub, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "parent",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    let ended = w
+        .store
+        .ingest_fact(
+            "parent",
+            4,
+            &SessionBody::TurnEnded {
+                turn_id: turn,
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store.route_push_edge(&ended.edge.unwrap(), &push).unwrap();
+    assert!(
+        notices.try_recv().is_none(),
+        "automatic root reports must not create ordinary completion pushes"
+    );
+    assert!(
+        w.store
+            .open_turn("parent", "operator", &[json!({"type":"text","text":"continue"})])
+            .unwrap()
+    );
+    w.store
+        .ingest(
+            "parent",
+            5,
+            &SessionBody::TurnStarted {
+                request_id: "operator".into(),
+                turn_id: "operator".into(),
+            },
+        )
+        .unwrap();
+    let ended = w
+        .store
+        .ingest_fact(
+            "parent",
+            6,
+            &SessionBody::TurnEnded {
+                turn_id: "operator".into(),
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+    w.store.route_push_edge(&ended.edge.unwrap(), &push).unwrap();
+    assert_eq!(notices.try_recv().unwrap().tag, "parent");
+}
+#[test]
+fn d3b_new_completion_after_parent_delete_creates_durable_operator_work() {
+    let (w, _) = pair();
+    assert!(
+        w.store
+            .open_turn("child", "ongoing", &[json!({"type":"text","text":"work"})])
+            .unwrap()
+    );
+    w.store
+        .ingest(
+            "child",
+            2,
+            &SessionBody::TurnStarted {
+                request_id: "work".into(),
+                turn_id: "ongoing".into(),
+            },
+        )
+        .unwrap();
+    w.store.close_now("parent").unwrap();
+    w.store.delete_session("parent", None).unwrap();
+    let ended = w
+        .store
+        .ingest_fact(
+            "child",
+            3,
+            &SessionBody::TurnEnded {
+                turn_id: "ongoing".into(),
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+    let rows = attention(&w);
+    assert_eq!(rows.len(), 1);
+    assert_eq!(rows[0].pending_id, None);
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    w.store.route_push_edge(&ended.edge.unwrap(), &push).unwrap();
+    assert!(notices.try_recv().is_none());
+    w.store.enqueue_delegation_attention(&push, "run", "", 1000).unwrap();
+    assert!(notices.try_recv().unwrap().tag.starts_with("delegation:"));
+}
+#[test]
+fn d3b_orphan_host_crash_coalesces_and_obsoletes_question_before_cancel_frame() {
+    let (w, _) = pair();
+    assert!(w.store.open_turn("child", "ongoing", &[]).unwrap());
+    w.store
+        .ingest(
+            "child",
+            2,
+            &SessionBody::TurnStarted {
+                request_id: "work".into(),
+                turn_id: "ongoing".into(),
+            },
+        )
+        .unwrap();
+    pending(&w, "child", 3, "question", PendingKind::Elicitation);
+    w.store.close_now("parent").unwrap();
+    w.store.delete_session("parent", None).unwrap();
+    let frames = [
+        SessionBody::TurnEnded {
+            turn_id: "ongoing".into(),
+            outcome: TurnOutcome::Interrupted,
+            stop_reason: None,
+            error: Some("lost".into()),
+        },
+        SessionBody::PendingResolved {
+            pending_id: "question".into(),
+            resolution: PendingResolution::Cancelled,
+            reason: Some(PendingReason::AdapterLost),
+        },
+        SessionBody::AdapterExited {
+            code: Some(1),
+            signal: None,
+            stderr_tail: String::new(),
+        },
+        SessionBody::SessionParked {
+            reason: ParkReason::AdapterExited,
+        },
+    ];
+    let mut identity = None;
+    for (i, frame) in frames.iter().enumerate() {
+        w.store.ingest("child", 4 + i as u64, frame).unwrap();
+        let rows = attention(&w);
+        assert_eq!(rows.len(), 1);
+        assert_eq!(rows[0].pending_id, None);
+        if let Some(id) = &identity {
+            assert_eq!(&rows[0].id, id);
+        } else {
+            identity = Some(rows[0].id.clone());
+        }
+    }
+}
+
+#[test]
+fn d3b_start_failure_after_parent_delete_remains_durable_operator_work() {
+    let (w, parent) = pair();
+    w.start("starting", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    {
+        let mut conn = raw(&w);
+        let tx = conn.transaction().unwrap();
+        assert!(w.store.bind_family_in(&tx, &parent, 1, "starting", 0).unwrap());
+        tx.commit().unwrap();
+    }
+    w.store.close_now("parent").unwrap();
+    w.store.delete_session("parent", None).unwrap();
+    w.store.mark_failed_if_starting("starting", "late failure").unwrap();
+    assert_eq!(w.store.find_session("starting").unwrap().unwrap().lifecycle, "failed");
+    let rows = attention(&w);
+    assert_eq!(rows.len(), 1);
+    assert_eq!(rows[0].child_id, "starting");
+    assert!(
+        w.store
+            .events("starting", 0, 100)
+            .unwrap()
+            .iter()
+            .any(|e| e.kind == "start_failed")
+    );
+}
diff --git a/crates/hennery-testkit/tests/delegation_tools.rs b/crates/hennery-testkit/tests/delegation_tools.rs
index 9d63ffac..17a47f09 100644
--- a/crates/hennery-testkit/tests/delegation_tools.rs
+++ b/crates/hennery-testkit/tests/delegation_tools.rs
@@ -19,6 +19,109 @@ use std::{
 const HOST: &str = "delegation-host";
 const BOUND: Duration = Duration::from_secs(30);
 
+#[tokio::test]
+async fn d3b_deadline_worker_exposes_durable_attention_and_opens_the_child_card() {
+    let mut worker = script();
+    worker.asks = vec![FakeAsk::Elicitation];
+    let mut h = Harness::with_worker(worker, None, false).await;
+    let spawned = h.spawn("fallback", json!({})).await;
+    let child = spawned["child_id"].as_str().unwrap();
+    let question = eventually("child question", async || {
+        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+        h.state.store.open_pending(child).unwrap().into_iter().next()
+    })
+    .await;
+    let db = h._dir.path().join("hennery.db");
+    // Force only the persisted deadline; pending callbacks have no timeout.
+    hennery_kernel::db::open(&db)
+        .unwrap()
+        .execute(
+            "UPDATE delegation_notices SET deadline = 0 WHERE owner_id = ?1 AND child_id = ?2",
+            rusqlite::params![h.state.store.owner_id(), child],
+        )
+        .unwrap();
+    let (push, mut notices) = hennery_kernel::push::Push::new();
+    h.state.push = push;
+    hennery_sessions::delegation_worker::after_startup(&h.state);
+    let notice = tokio::time::timeout(BOUND, notices.recv()).await.unwrap();
+    assert!(notice.url.starts_with(&format!("/sessions/{child}?pending=")));
+    assert!(notice.url.contains(&question.pending_id));
+    assert!(notice.tag.starts_with("delegation:"));
+    assert!((notices.guard())(&notice));
+    assert!(h.state.store.still_open(child, &question.pending_id).unwrap());
+    let response = h
+        .client
+        .get(format!("{}/api/delegation/attention", h.url))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(response.status(), reqwest::StatusCode::OK);
+    let rows: Value = response.json().await.unwrap();
+    assert_eq!(rows[0]["child_id"], child);
+    assert_eq!(rows[0]["reason"], "handling_deadline");
+    let denied = h
+        .raw
+        .get(format!("{}/api/delegation/attention", h.url))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(denied.status(), reqwest::StatusCode::UNAUTHORIZED);
+    let id = rows[0]["id"].as_str().unwrap();
+    let refused = h
+        .client
+        .post(format!("{}/api/delegation/attention/{id}/rearm", h.url))
+        .json(&json!({"operator_turn_id":"unknown"}))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(refused.status(), reqwest::StatusCode::CONFLICT);
+    let refused = h
+        .client
+        .post(format!("{}/api/delegation/attention/{id}/acknowledge", h.url))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(
+        refused.status(),
+        reqwest::StatusCode::CONFLICT,
+        "a status acknowledgement cannot answer a question"
+    );
+    h.state.store.record_close_request(&h.parent).unwrap();
+    let answered = h
+        .client
+        .post(format!(
+            "{}/api/sessions/{child}/pending/{}/answer",
+            h.url, question.pending_id
+        ))
+        .json(&json!({"action":"accept","content":{"name":"operator"}}))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(answered.status(), reqwest::StatusCode::ACCEPTED);
+    assert!(
+        !(notices.guard())(&notice),
+        "operator answers withdraw queued notification attempts"
+    );
+    let report = eventually("completed child report falls back after parent close", async || {
+        h.state
+            .store
+            .operator_attention(None, "")
+            .unwrap()
+            .into_iter()
+            .find(|a| a.pending_id.is_none())
+    })
+    .await;
+    let acknowledged = h
+        .client
+        .post(format!("{}/api/delegation/attention/{}/acknowledge", h.url, report.id))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(acknowledged.status(), reqwest::StatusCode::NO_CONTENT);
+    assert!(h.state.store.operator_attention(None, "").unwrap().is_empty());
+    h.finish().await;
+}
+
 struct LiveSse {
     response: reqwest::Response,
     buffered: Vec<u8>,
```

### Task 1, step 2: implement durable fallback and finish the loop

- [x] Implement only the failing behavior, using existing coordination and push seams.
- [x] Replay in a fresh directory, run COPY probes, 4×3 load and all gates.
- [x] Review staged bytes and personal author identity; commit and attempt one SSH push.

<!-- replay {"checks":[["cargo test -p hennery-sessions --test delegation_d2 --test store --locked",0],["cargo test -p hennery-kernel --test delivery --locked",0],["cargo test -p hennery-testkit --test delegation_tools --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-kernel/src/delivery.rs b/crates/hennery-kernel/src/delivery.rs
index 67baaa12..9dfffd79 100644
--- a/crates/hennery-kernel/src/delivery.rs
+++ b/crates/hennery-kernel/src/delivery.rs
@@ -175,6 +175,8 @@ impl Default for RetryPolicy {
 /// What became of one subscription's push.
 #[derive(Debug, Clone, PartialEq, Eq)]
 pub enum Outcome {
+    /// The owning module withdrew this work before transport admission.
+    Suppressed,
     /// The push service took it (2xx).
     Delivered,
     /// The subscription is gone (404, 410): removed.
@@ -281,7 +283,7 @@ impl<T: Transport> Delivery<T> {
     pub async fn run(self: Arc<Self>, mut notices: Notices) {
         loop {
             let notice = notices.recv().await;
-            if let Err(err) = self.deliver(&notice).await {
+            if let Err(err) = self.deliver_guarded(&notice, notices.guard()).await {
                 tracing::warn!(tag = %notice.tag, error = %err, "push not delivered");
             }
         }
@@ -291,6 +293,19 @@ impl<T: Transport> Delivery<T> {
     /// once: each subscription's outcome, by its id. Expired subscriptions
     /// are removed first and get nothing; a muted hat gets nothing.
     pub async fn deliver(self: &Arc<Self>, notice: &Notice) -> Result<Vec<(String, Outcome)>> {
+        self.deliver_guarded(notice, Arc::new(|_| true)).await
+    }
+
+    /// Eligibility is checked before payload construction and each transport attempt.
+    /// An attempt admitted before revocation may complete; external copies cannot be recalled.
+    pub async fn deliver_guarded(
+        self: &Arc<Self>,
+        notice: &Notice,
+        guard: crate::push::NoticeGuard,
+    ) -> Result<Vec<(String, Outcome)>> {
+        if !guard(notice) {
+            return Ok(Vec::new());
+        }
         let now = unix_now();
         self.hosts.prune_expired_subscriptions(now)?;
         let Some(payload) = payload_for(notice, self.hosts.push_policy(&notice.hat_id)?) else {
@@ -312,9 +327,16 @@ impl<T: Transport> Delivery<T> {
             let plaintext = plaintext.clone();
             let subject = subject.clone();
             let permits = permits.clone();
+            let guard = guard.clone();
+            let notice = notice.clone();
             sending.spawn(async move {
                 let _permit = permits.acquire_owned().await;
-                let outcome = this.send_one(&sub, &plaintext, urgency, subject.as_deref()).await;
+                let outcome = if guard(&notice) {
+                    this.send_one(&sub, &plaintext, urgency, subject.as_deref(), &notice, &guard)
+                        .await
+                } else {
+                    Outcome::Suppressed
+                };
                 (sub.id, outcome)
             });
         }
@@ -333,15 +355,24 @@ impl<T: Transport> Delivery<T> {
 
     /// One subscription's push, retried as `retry` says; its outcome is
     /// recorded on it.
-    async fn send_one(&self, sub: &Subscription, plaintext: &[u8], urgency: &str, subject: Option<&str>) -> Outcome {
+    async fn send_one(
+        &self,
+        sub: &Subscription,
+        plaintext: &[u8],
+        urgency: &str,
+        subject: Option<&str>,
+        notice: &Notice,
+        guard: &crate::push::NoticeGuard,
+    ) -> Outcome {
         let outcome = match self.request(sub, plaintext, urgency, subject) {
-            Ok(request) => self.send_retrying(request).await,
+            Ok(request) => self.send_retrying(request, notice, guard).await,
             Err(err) => {
                 tracing::warn!(id = %sub.id, error = %err, "push not built");
                 Outcome::Failed("could not encrypt to this device".into())
             }
         };
         let recorded = match &outcome {
+            Outcome::Suppressed => Ok(()),
             Outcome::Delivered => self.hosts.record_push_success(&sub.id, &sub.endpoint, unix_now()),
             Outcome::Removed => self.hosts.remove_gone_subscription(&sub.id, &sub.endpoint).map(|_| ()),
             Outcome::Failed(why) => self.hosts.record_push_error(&sub.id, &sub.endpoint, why),
@@ -354,7 +385,7 @@ impl<T: Transport> Delivery<T> {
                 tracing::info!(id = %sub.id, host = %sub.endpoint_host(), "push subscription gone; removed")
             }
             Outcome::Failed(why) => tracing::warn!(id = %sub.id, host = %sub.endpoint_host(), %why, "push failed"),
-            Outcome::Delivered => {}
+            Outcome::Delivered | Outcome::Suppressed => {}
         }
         outcome
     }
@@ -403,10 +434,13 @@ impl<T: Transport> Delivery<T> {
     /// `Retry-After`, if longer, up to its cap). Any other answer is final.
     /// Each try has `attempt_timeout`, and no retry is made that could not
     /// finish within `budget` of the first.
-    async fn send_retrying(&self, request: PushRequest) -> Outcome {
+    async fn send_retrying(&self, request: PushRequest, notice: &Notice, guard: &crate::push::NoticeGuard) -> Outcome {
         let started = tokio::time::Instant::now();
         let mut delays = self.retry.delays.iter();
         loop {
+            if !guard(notice) {
+                return Outcome::Suppressed;
+            }
             let sent = tokio::time::timeout(self.retry.attempt_timeout, self.transport.send(request.clone()))
                 .await
                 .unwrap_or(Sent::Timeout);
diff --git a/crates/hennery-kernel/src/push.rs b/crates/hennery-kernel/src/push.rs
index bb655c31..41890473 100644
--- a/crates/hennery-kernel/src/push.rs
+++ b/crates/hennery-kernel/src/push.rs
@@ -819,7 +819,11 @@ struct Queue {
     read: bool,
 }
 
+/// Modules may revoke queued notification attempts without changing delivery policy.
+pub type NoticeGuard = std::sync::Arc<dyn Fn(&Notice) -> bool + Send + Sync>;
+
 struct Shared {
+    guard: std::sync::RwLock<NoticeGuard>,
     queue: std::sync::Mutex<Queue>,
     ready: tokio::sync::Notify,
 }
@@ -847,6 +851,7 @@ impl Push {
                 ..Queue::default()
             }),
             ready: tokio::sync::Notify::new(),
+            guard: std::sync::RwLock::new(std::sync::Arc::new(|_| true)),
         });
         (Push { shared: shared.clone() }, Notices { shared })
     }
@@ -857,6 +862,16 @@ impl Push {
         Push::new().0
     }
 
+    /// Install the owning module's final admission check. Delivery consults the
+    /// current callback before payload construction and each transport attempt.
+    pub fn set_guard(&self, guard: NoticeGuard) {
+        *self
+            .shared
+            .guard
+            .write()
+            .unwrap_or_else(std::sync::PoisonError::into_inner) = guard;
+    }
+
     /// Queue `notice` for delivery. Never waits. A notice for a tag already
     /// waiting replaces it there, keeping its place: a device shows one
     /// notification per tag anyway. A new tag when `NOTICE_QUEUE` are
@@ -889,6 +904,14 @@ impl Push {
 }
 
 impl Notices {
+    /// Reads the current guard on every attempt, including when installed after run starts.
+    pub fn guard(&self) -> NoticeGuard {
+        let shared = self.shared.clone();
+        std::sync::Arc::new(move |notice| {
+            (shared.guard.read().unwrap_or_else(std::sync::PoisonError::into_inner))(notice)
+        })
+    }
+
     /// The next notice, oldest tag first; waits for one.
     pub async fn recv(&mut self) -> Notice {
         let shared = self.shared.clone();
diff --git a/crates/hennery-sessions/src/delegation_api.rs b/crates/hennery-sessions/src/delegation_api.rs
index d9925eac..324f3e63 100644
--- a/crates/hennery-sessions/src/delegation_api.rs
+++ b/crates/hennery-sessions/src/delegation_api.rs
@@ -10,7 +10,7 @@ use axum::{
     http::StatusCode,
     middleware,
     response::{IntoResponse, Response},
-    routing::get,
+    routing::{get, post},
 };
 use hennery_kernel::json::ApiJson;
 use hennery_proto::delegation_status::SetExecutionPolicy;
@@ -23,9 +23,65 @@ pub fn router(state: AppState) -> Router {
             get(policy).patch(set_policy.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
         )
         .route("/api/hosts/{id}/runtime-catalog", get(catalog))
+        .route("/api/delegation/attention", get(attention))
+        .route("/api/delegation/attention/{id}/rearm", post(rearm))
+        .route("/api/delegation/attention/{id}/acknowledge", post(acknowledge))
         .layer(DefaultBodyLimit::max(32 * 1024));
     hennery_kernel::auth::operator_only(routes, state.operator.clone()).with_state(state)
 }
+
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct AttentionQuery {
+    hat_id: Option<String>,
+    #[serde(default)]
+    after: String,
+}
+async fn attention(State(state): State<AppState>, Query(query): Query<AttentionQuery>) -> Response {
+    if query.after.len() > 128 || query.hat_id.as_ref().is_some_and(|hat| hat.len() > 128) {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
+    }
+    match state.store.operator_attention(query.hat_id.as_deref(), &query.after) {
+        Ok(rows) => Json(rows).into_response(),
+        Err(err) => internal(err),
+    }
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct Rearm {
+    operator_turn_id: String,
+}
+async fn rearm(State(state): State<AppState>, Path(id): Path<String>, ApiJson(request): ApiJson<Rearm>) -> Response {
+    if id.len() > 128 || request.operator_turn_id.len() > 128 {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
+    }
+    match state
+        .store
+        .rearm_delegation_attention(&id, &request.operator_turn_id, hennery_kernel::secret::unix_now())
+    {
+        Ok(true) => StatusCode::NO_CONTENT.into_response(),
+        Ok(false) => error(
+            StatusCode::CONFLICT,
+            "rearm_unavailable",
+            "a new operator prompt and eligible routing are required",
+        ),
+        Err(err) => internal(err),
+    }
+}
+async fn acknowledge(State(state): State<AppState>, Path(id): Path<String>) -> Response {
+    if id.len() > 128 {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
+    }
+    match state.store.acknowledge_delegation_attention(&id) {
+        Ok(true) => StatusCode::NO_CONTENT.into_response(),
+        Ok(false) => error(
+            StatusCode::CONFLICT,
+            "acknowledgement_unavailable",
+            "only an outstanding status report can be acknowledged",
+        ),
+        Err(err) => internal(err),
+    }
+}
 async fn policy(State(state): State<AppState>, Path(hat): Path<String>) -> Response {
     if !matches!(state.hosts.hat(&hat), Ok(Some(_))) {
         return error(StatusCode::NOT_FOUND, "not_found", "not found");
diff --git a/crates/hennery-sessions/src/delegation_attention.rs b/crates/hennery-sessions/src/delegation_attention.rs
new file mode 100644
index 00000000..c9de08f9
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_attention.rs
@@ -0,0 +1,344 @@
+//! Durable operator fallback. Push is a best-effort projection, never a receipt.
+use crate::{
+    hub::Hub,
+    store::{Edge, EdgeSession, PushEdge, Store},
+};
+use anyhow::Result;
+use hennery_kernel::push::{Notice, Push, Urgency};
+use hennery_proto::{frames::Capability, plugin::InputOrigin, rest::EventDto};
+use rusqlite::{OptionalExtension, Transaction, params};
+use serde::Serialize;
+
+#[derive(Debug, Serialize)]
+pub struct OperatorAttention {
+    pub id: String,
+    pub child_id: String,
+    pub hat_id: String,
+    pub reason: String,
+    pub pending_id: Option<String>,
+}
+impl Store {
+    pub fn refresh_delegation_attention(&self, hub: &Hub, now: i64) -> Result<()> {
+        self.refresh_attention_after(hub, now, "").map(drop)
+    }
+    pub(crate) fn refresh_attention_after(&self, hub: &Hub, now: i64, after: &str) -> Result<String> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        self.settle_notices_in(&tx)?;
+        let rows = {
+            let mut statement = tx.prepare(
+                "SELECT n.delivery_id,n.deadline,p.host_id,
+                f.detached = 0 AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id
+                AND p.close_requested = 0 AND p.lifecycle IN ('starting','active','parked')
+                AND c.close_requested = 0 AND c.lifecycle IN ('starting','active','parked','failed')
+                AND h.revoked_at IS NULL
+                AND (p.mcp_delivery_mode = 'isolated' OR (p.mcp_delivery_mode = 'unisolated' AND p.hat_id = h.default_hat_id))
+                AND NOT EXISTS(SELECT 1 FROM purged_hats x WHERE x.owner_id = ?1 AND x.hat_id = n.hat_id)
+                AND g.delegation_enabled = 1 AND g.revision = n.accepted_revision
+                FROM delegation_notices n JOIN session_families f ON f.owner_id = ?1 AND f.child_id = n.child_id
+                JOIN sessions p ON p.owner_id = ?1 AND p.id = n.parent_id
+                JOIN sessions c ON c.owner_id = ?1 AND c.id = n.child_id
+                JOIN hosts h ON h.owner_id = ?1 AND h.id = p.host_id
+                JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = n.hat_id
+                WHERE n.owner_id = ?1 AND n.delivery_id > ?2
+                AND (n.state IN ('parent_queued','waiting_config','awaiting_reconciliation')
+                    OR (n.state = 'parent_delivered' AND n.kind = 'question'))
+                ORDER BY n.delivery_id LIMIT 128",
+            )?;
+            statement
+                .query_map(params![self.owner_id(), after], |r| {
+                    Ok((
+                        r.get::<_, String>(0)?,
+                        r.get::<_, i64>(1)?,
+                        r.get::<_, String>(2)?,
+                        r.get::<_, bool>(3)?,
+                    ))
+                })?
+                .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        let cursor = rows.last().map(|r| r.0.clone()).unwrap_or_default();
+        for (id, deadline, host, eligible) in rows {
+            let reason = if !eligible {
+                Some("parent_unavailable")
+            } else if hub.is_ready(&host) && !hub.has_capability(&host, Capability::DelegationConfig) {
+                Some("unsupported_delivery")
+            } else if now >= deadline {
+                Some("handling_deadline")
+            } else {
+                None
+            };
+            if let Some(reason) = reason {
+                tx.execute(
+                    "UPDATE delegation_notices SET state = 'operator_required',reason = ?3
+                    WHERE owner_id = ?1 AND delivery_id = ?2",
+                    params![self.owner_id(), id, reason],
+                )?;
+            }
+        }
+        tx.commit()?;
+        Ok(cursor)
+    }
+    /// The factual pending counts remain separate; D4 consumes this projection.
+    pub fn operator_attention(&self, hat: Option<&str>, after: &str) -> Result<Vec<OperatorAttention>> {
+        let conn = self.conn();
+        let mut stmt = conn.prepare(
+            "SELECT a.attention_id,a.child_id,a.hat_id,a.reason,a.pending_id
+            FROM delegation_attention a JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
+            WHERE a.owner_id = ?1 AND a.state = 'open' AND c.lifecycle <> 'deleted'
+            AND (?2 IS NULL OR a.hat_id = ?2) AND a.attention_id > ?3
+            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id)
+            ORDER BY a.attention_id LIMIT 100",
+        )?;
+        Ok(stmt
+            .query_map(params![self.owner_id(), hat, after], |r| {
+                Ok(OperatorAttention {
+                    id: r.get(0)?,
+                    child_id: r.get(1)?,
+                    hat_id: r.get(2)?,
+                    reason: r.get(3)?,
+                    pending_id: r.get(4)?,
+                })
+            })?
+            .collect::<rusqlite::Result<_>>()?)
+    }
+    /// Requeue at startup, then at most once per five minutes. A kernel queue
+    /// drop or failed network request never changes the attention disposition.
+    pub fn enqueue_delegation_attention(&self, push: &Push, run: &str, after: &str, now: i64) -> Result<String> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let rows = {
+            let mut stmt=tx.prepare("SELECT a.attention_id,c.id,c.hat_id,c.title,c.cwd,a.pending_id,
+                json_extract(e.body,'$.indexed.pending.title')
+                FROM delegation_attention a JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
+                LEFT JOIN pending p ON p.owner_id = ?1 AND p.session_id = c.id AND p.pending_id = a.pending_id
+                LEFT JOIN events e ON e.owner_id = ?1 AND e.session_id = c.id AND e.event_id = p.opened_event_id
+                WHERE a.owner_id = ?1 AND a.state = 'open' AND c.lifecycle <> 'deleted' AND a.attention_id > ?2
+                AND (a.push_run <> ?3 OR a.push_at <= ?4 - 300)
+                AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id)
+                ORDER BY a.attention_id LIMIT 128")?;
+            stmt.query_map(params![self.owner_id(), after, run, now], |r| {
+                Ok((
+                    r.get::<_, String>(0)?,
+                    EdgeSession {
+                        id: r.get(1)?,
+                        hat_id: r.get(2)?,
+                        title: r.get(3)?,
+                        cwd: r.get(4)?,
+                    },
+                    r.get::<_, Option<String>>(5)?,
+                    r.get::<_, Option<String>>(6)?,
+                ))
+            })?
+            .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        let cursor = rows.last().map(|r| r.0.clone()).unwrap_or_default();
+        let mut notices = Vec::new();
+        for (id, session, pending, title) in rows {
+            let mut notice = if let Some(pending) = pending {
+                crate::notify::notice_for(
+                    &PushEdge::QuestionOutsideTurn {
+                        pending_id: pending,
+                        title: title.and_then(|text| {
+                            crate::store::one_line(
+                                &text,
+                                hennery_proto::rest::TITLE_MAX_CHARS,
+                                hennery_proto::rest::TITLE_MAX_JSON_BYTES,
+                            )
+                        }),
+                    },
+                    &session,
+                )
+                .expect("question notifies")
+            } else {
+                Notice {
+                    hat_id: session.hat_id.clone(),
+                    urgency: Urgency::High,
+                    title: "Session needs attention".into(),
+                    generic_title: "Session needs attention".into(),
+                    body: "needs your attention".into(),
+                    detail: None,
+                    url: format!("/sessions/{}", crate::notify::encoded_id(&session.id)),
+                    tag: String::new(),
+                }
+            };
+            notice.tag = format!("delegation:{id}");
+            tx.execute(
+                "UPDATE delegation_attention SET push_run = ?3,push_at = ?4
+                WHERE owner_id = ?1 AND attention_id = ?2 AND state = 'open'",
+                params![self.owner_id(), id, run, now],
+            )?;
+            notices.push(notice);
+        }
+        tx.commit()?;
+        // Still hold the shared owner gate: delete/reassign cannot interleave
+        // before enqueue. Kernel revalidates again at transport admission.
+        for notice in notices {
+            push.notify(notice);
+        }
+        Ok(cursor)
+    }
+    /// A plain operator epoch changes budgets, never routing. Re-arm is an
+    /// explicit operator action naming a NEW actually acknowledged root prompt.
+    pub fn rearm_delegation_attention(&self, attention: &str, operator_turn: &str, now: i64) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let found: Option<(String, i64, Option<String>)> = tx
+            .query_row(
+                "SELECT n.delivery_id,e.event_id,n.target_turn
+            FROM delegation_attention a JOIN delegation_notices n ON n.owner_id = ?1 AND n.delivery_id = a.delivery_id
+            JOIN session_families f ON f.owner_id = ?1 AND f.child_id = n.child_id AND f.parent_id = n.parent_id
+            JOIN sessions p ON p.owner_id = ?1 AND p.id = n.parent_id
+            JOIN sessions c ON c.owner_id = ?1 AND c.id = n.child_id
+            JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = n.hat_id
+            JOIN events e ON e.owner_id = ?1 AND e.session_id = n.root_id
+            WHERE a.owner_id = ?1 AND a.attention_id = ?2 AND a.state = 'open'
+            AND e.kind = 'user_turn' AND e.applied = 1 AND json_extract(e.body,'$.turn_id') = ?3
+            AND COALESCE(json_extract(e.body,'$.origin.kind'),'operator') = 'operator' AND e.event_id > a.operator_epoch
+            AND f.detached = 0 AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id
+            AND p.close_requested = 0 AND c.close_requested = 0 AND p.presumed_parked = 0
+            AND p.lifecycle IN ('active','parked') AND c.lifecycle IN ('starting','active','parked','failed')
+            AND g.delegation_enabled = 1 AND g.revision = n.accepted_revision
+            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = n.hat_id)
+            AND (n.target_turn IS NULL OR (n.kind = 'question' AND EXISTS(SELECT 1 FROM turns t
+                WHERE t.owner_id = ?1 AND t.turn_id = n.target_turn AND t.state IN ('started','ended'))))
+            AND (n.kind <> 'question' OR EXISTS(SELECT 1 FROM pending q WHERE q.owner_id = ?1
+                AND q.session_id = n.child_id AND q.pending_id = n.pending_id AND q.kind = 'elicitation' AND q.state = 'open'
+                AND NOT EXISTS(SELECT 1 FROM answer_queue b WHERE b.owner_id = ?1 AND b.pending_id = q.pending_id)))",
+                params![self.owner_id(), attention, operator_turn],
+                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+            )
+            .optional()?;
+        let Some((delivery, epoch, target)) = found else {
+            return Ok(false);
+        };
+        tx.execute(
+            "UPDATE delegation_notices SET state = ?3,reason = NULL,deadline = ?4 + 300
+            WHERE owner_id = ?1 AND delivery_id = ?2",
+            params![
+                self.owner_id(),
+                delivery,
+                if target.is_some() {
+                    "parent_delivered"
+                } else {
+                    "parent_queued"
+                },
+                now
+            ],
+        )?;
+        tx.execute(
+            "UPDATE delegation_attention SET state = 'resolved',operator_epoch = ?3,push_run = '',push_at = 0
+            WHERE owner_id = ?1 AND attention_id = ?2",
+            params![self.owner_id(), attention, epoch],
+        )?;
+        tx.commit()?;
+        Ok(true)
+    }
+    /// Kernel-owned guard: only reserved delegation tags are interpreted here.
+    /// Success admits a push attempt; an already admitted external copy cannot
+    /// be recalled. No database gate is retained across asynchronous transport.
+    pub fn delegation_push_current(&self, notice: &Notice) -> Result<bool> {
+        let Some(id) = notice.tag.strip_prefix("delegation:") else {
+            return Ok(true);
+        };
+        Ok(self.conn().query_row(
+            "SELECT EXISTS(SELECT 1 FROM delegation_attention a
+            JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
+            WHERE a.owner_id = ?1 AND a.attention_id = ?2 AND a.hat_id = ?3 AND a.state = 'open'
+            AND c.lifecycle <> 'deleted'
+            AND (a.pending_id IS NULL OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = ?1
+                AND p.session_id = a.child_id AND p.pending_id = a.pending_id AND p.state = 'open'
+                AND NOT EXISTS(SELECT 1 FROM answer_queue q WHERE q.owner_id = ?1 AND q.pending_id = p.pending_id)))
+            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id))",
+            params![self.owner_id(), id, notice.hat_id],
+            |r| r.get(0),
+        )?)
+    }
+    /// Acknowledge a status report without impersonating an answer or retrying
+    /// an uncertain prompt. Questions resolve only through canonical answers.
+    pub fn acknowledge_delegation_attention(&self, id: &str) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let delivery: Option<Option<String>> = tx
+            .query_row(
+                "SELECT a.delivery_id FROM delegation_attention a
+            JOIN sessions c ON c.owner_id = ?1 AND c.id = a.child_id AND c.hat_id = a.hat_id
+            WHERE a.owner_id = ?1 AND a.attention_id = ?2 AND a.state = 'open' AND a.pending_id IS NULL
+            AND c.lifecycle <> 'deleted'
+            AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id = a.hat_id)",
+                params![self.owner_id(), id],
+                |r| r.get(0),
+            )
+            .optional()?;
+        let Some(delivery) = delivery else { return Ok(false) };
+        tx.execute(
+            "UPDATE delegation_notices SET state = 'resolved' WHERE owner_id = ?1 AND delivery_id = ?2",
+            params![self.owner_id(), delivery],
+        )?;
+        tx.execute(
+            "UPDATE delegation_attention SET state = 'resolved' WHERE owner_id = ?1 AND attention_id = ?2",
+            params![self.owner_id(), id],
+        )?;
+        tx.commit()?;
+        Ok(true)
+    }
+    pub fn route_push_edge(&self, edge: &Edge, push: &Push) -> Result<()> {
+        let conn = self.conn();
+        let delegated: Option<bool> = conn
+            .query_row(
+                "SELECT delegated_child FROM sessions WHERE owner_id = ?1 AND id = ?2 AND lifecycle <> 'deleted'",
+                params![self.owner_id(), edge.session.id],
+                |r| r.get(0),
+            )
+            .optional()?;
+        if delegated != Some(false) {
+            return Ok(());
+        }
+        if matches!(edge.kind, PushEdge::TurnEnded(_)) {
+            let origin:Option<String>=conn.query_row("SELECT t.input_origin FROM events e JOIN turns t
+                ON t.owner_id = ?1 AND t.session_id = e.session_id AND t.turn_id = json_extract(e.body,'$.turn_id')
+                WHERE e.owner_id = ?1 AND e.session_id = ?2 AND e.event_id = ?3 AND e.kind = 'turn_ended' AND e.applied = 1",
+                params![self.owner_id(),edge.session.id,edge.source_event_id],|r|r.get(0)).optional()?;
+            if !origin
+                .and_then(|raw| serde_json::from_str::<InputOrigin>(&raw).ok())
+                .is_some_and(|origin| matches!(origin, InputOrigin::Operator {}))
+            {
+                return Ok(());
+            }
+        }
+        if let Some(notice) = crate::notify::notice_for(&edge.kind, &edge.session) {
+            push.notify(notice);
+        }
+        Ok(())
+    }
+}
+
+/// Parent deletion removes routing edges, but the immutable delegated identity
+/// survives. New facts still create operator work, coalesced with any incident
+/// preserved during deletion. No deleted parent id or payload is retained.
+pub(crate) fn record_orphan_in(
+    tx: &Transaction<'_>,
+    owner: &str,
+    event: &EventDto,
+    kind: &str,
+    incident: &str,
+    pending: Option<&str>,
+) -> Result<()> {
+    tx.execute(
+        "INSERT INTO delegation_attention(owner_id,attention_id,child_id,hat_id,reason,pending_id,state,incident)
+        SELECT ?1,?2,s.id,s.hat_id,'parent_unavailable',CASE WHEN ?4 = 'question' THEN ?5 END,'open',?6
+        FROM sessions s WHERE s.owner_id = ?1 AND s.id = ?3 AND s.delegated_child = 1 AND s.lifecycle <> 'deleted'
+        AND (?4 <> 'question' OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = ?1 AND p.session_id = s.id
+            AND p.pending_id = ?5 AND p.state = 'open' AND NOT EXISTS(SELECT 1 FROM answer_queue a
+                WHERE a.owner_id = ?1 AND a.pending_id = p.pending_id)))
+        ON CONFLICT(owner_id,child_id,incident) DO NOTHING",
+        params![
+            owner,
+            uuid::Uuid::now_v7().to_string(),
+            event.session_id,
+            kind,
+            pending,
+            incident
+        ],
+    )?;
+    Ok(())
+}
diff --git a/crates/hennery-sessions/src/delegation_attention.sql b/crates/hennery-sessions/src/delegation_attention.sql
new file mode 100644
index 00000000..eff8b2f5
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_attention.sql
@@ -0,0 +1,64 @@
+-- Sessions migration 20: durable operator work, independent of push delivery.
+-- Reserve an inert row with each source notice; triggers only activate it.
+CREATE TABLE delegation_attention (
+    owner_id TEXT NOT NULL, attention_id TEXT NOT NULL, delivery_id TEXT,
+    child_id TEXT NOT NULL, hat_id TEXT NOT NULL, reason TEXT NOT NULL, pending_id TEXT,
+    state TEXT NOT NULL DEFAULT 'standby', operator_epoch INTEGER NOT NULL DEFAULT 0, incident TEXT NOT NULL,
+    push_run TEXT NOT NULL DEFAULT '', push_at INTEGER NOT NULL DEFAULT 0,
+    PRIMARY KEY(owner_id,attention_id), UNIQUE(owner_id,child_id,incident),
+    FOREIGN KEY(child_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE INDEX delegation_attention_ready ON delegation_attention(owner_id,state,attention_id);
+CREATE INDEX delegation_attention_child ON delegation_attention(owner_id,child_id);
+CREATE INDEX delegation_notice_deadline ON delegation_notices(owner_id,deadline,state);
+CREATE TRIGGER attention_notice_update AFTER UPDATE OF state ON delegation_notices
+BEGIN
+    UPDATE delegation_attention SET state = 'open',reason = COALESCE(NEW.reason,'operator_required'),
+        operator_epoch = CASE WHEN state = 'open' THEN operator_epoch ELSE
+            COALESCE((SELECT MAX(event_id) FROM events WHERE owner_id = NEW.owner_id AND session_id = NEW.root_id
+                AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'),0) END
+    WHERE owner_id = NEW.owner_id AND delivery_id = NEW.delivery_id AND NEW.state = 'operator_required'
+      AND (NEW.kind <> 'question' OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = NEW.owner_id
+          AND p.session_id = NEW.child_id AND p.pending_id = NEW.pending_id AND p.state = 'open'
+          AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = NEW.owner_id AND a.pending_id = p.pending_id)));
+    UPDATE delegation_attention SET state = 'resolved'
+    WHERE owner_id = NEW.owner_id AND delivery_id = NEW.delivery_id
+      AND (NEW.state IN ('obsolete','resolved') OR (NEW.state = 'parent_delivered' AND NEW.kind <> 'question'));
+END;
+-- D3a scrubs parent-related notices on deletion. Preserve only surviving work,
+-- without a parent/source reference; remove inert/resolved metadata entirely.
+CREATE TRIGGER attention_parent_delete BEFORE UPDATE OF lifecycle ON sessions
+WHEN NEW.lifecycle = 'deleted' AND OLD.lifecycle <> 'deleted'
+BEGIN
+    UPDATE delegation_attention SET state = 'open',delivery_id = NULL,reason = 'parent_deleted'
+    WHERE owner_id = NEW.owner_id AND delivery_id IN (
+        SELECT n.delivery_id FROM delegation_notices n JOIN sessions c ON c.owner_id = NEW.owner_id AND c.id = n.child_id
+        WHERE n.owner_id = NEW.owner_id AND n.parent_id = NEW.id AND c.lifecycle <> 'deleted'
+          AND n.state NOT IN ('obsolete','resolved') AND (n.kind = 'question' OR n.state <> 'parent_delivered')
+          AND (n.kind <> 'question' OR EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = NEW.owner_id
+              AND p.session_id = n.child_id AND p.pending_id = n.pending_id AND p.state = 'open'
+              AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = NEW.owner_id AND a.pending_id = p.pending_id))));
+    DELETE FROM delegation_attention WHERE owner_id = NEW.owner_id AND delivery_id IN (
+        SELECT delivery_id FROM delegation_notices WHERE owner_id = NEW.owner_id AND parent_id = NEW.id);
+END;
+CREATE TRIGGER attention_child_end AFTER UPDATE OF lifecycle,hat_id ON sessions
+BEGIN
+    DELETE FROM delegation_attention WHERE owner_id = NEW.owner_id AND child_id = NEW.id AND NEW.lifecycle = 'deleted';
+    UPDATE delegation_attention SET hat_id = NEW.hat_id,delivery_id = NULL,reason = 'reassigned',push_run = '',push_at = 0,
+        state = CASE WHEN state = 'standby' THEN 'open' ELSE state END
+    WHERE owner_id = NEW.owner_id AND child_id = NEW.id AND NEW.hat_id <> OLD.hat_id;
+END;
+CREATE TRIGGER attention_pending_end AFTER UPDATE OF state ON pending WHEN NEW.state <> 'open'
+BEGIN
+    UPDATE delegation_attention SET state = 'resolved' WHERE owner_id = NEW.owner_id
+        AND child_id = NEW.session_id AND pending_id = NEW.pending_id;
+END;
+INSERT INTO delegation_attention(owner_id,attention_id,delivery_id,child_id,hat_id,reason,pending_id,state,operator_epoch,incident)
+SELECT n.owner_id,n.delivery_id,n.delivery_id,n.child_id,c.hat_id,COALESCE(n.reason,'operator_required'),
+    CASE WHEN n.kind = 'question' THEN n.pending_id END,
+    CASE WHEN n.state = 'operator_required' THEN 'open'
+         WHEN n.state IN ('obsolete','resolved') OR (n.state = 'parent_delivered' AND n.kind <> 'question') THEN 'resolved'
+         ELSE 'standby' END,
+    COALESCE((SELECT MAX(event_id) FROM events WHERE owner_id = n.owner_id AND session_id = n.root_id
+        AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'),0),n.incident
+FROM delegation_notices n JOIN sessions c ON c.owner_id = n.owner_id AND c.id = n.child_id
+WHERE c.lifecycle <> 'deleted';
diff --git a/crates/hennery-sessions/src/delegation_delivery.rs b/crates/hennery-sessions/src/delegation_delivery.rs
index 1d11c5e5..ffbd9e5b 100644
--- a/crates/hennery-sessions/src/delegation_delivery.rs
+++ b/crates/hennery-sessions/src/delegation_delivery.rs
@@ -57,9 +57,9 @@ pub(crate) fn record_in(tx: &Transaction<'_>, owner: &str, event: &EventDto) ->
             |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
         )
         .optional()?;
-    let Some((parent, root, hat, revision, eligible, required)) = family else {
+    if family.is_none() && !delegated_in(tx, owner, &event.session_id)? {
         return Ok(());
-    };
+    }
     let attach:i64 = tx.query_row("SELECT COALESCE(MAX(event_id),0) FROM events WHERE owner_id = ?1 AND session_id = ?2 AND kind = 'session_started' AND applied = 1", params![owner,event.session_id],|r|r.get(0))?;
     let incident = if loss {
         format!("loss:{attach}")
@@ -69,6 +69,10 @@ pub(crate) fn record_in(tx: &Transaction<'_>, owner: &str, event: &EventDto) ->
     } else {
         format!("{}:{}", event.event_id, kind)
     };
+    let Some((parent, root, hat, revision, eligible, required)) = family else {
+        crate::delegation_attention::record_orphan_in(tx, owner, event, kind, &incident, pending)?;
+        return Ok(());
+    };
     let permission = kind == "question" && tx.query_row("SELECT EXISTS(SELECT 1 FROM pending WHERE owner_id = ?1 AND session_id = ?2 AND pending_id = ?3 AND kind = 'permission')",params![owner,event.session_id,pending],|r|r.get::<_,bool>(0))?;
     let queued:i64 = tx.query_row("SELECT COUNT(*) FROM delegation_notices WHERE owner_id = ?1 AND parent_id = ?2 AND state IN ('parent_queued','waiting_config')",params![owner,parent],|r|r.get(0))?;
     let disposition = if !eligible {
@@ -91,6 +95,17 @@ pub(crate) fn record_in(tx: &Transaction<'_>, owner: &str, event: &EventDto) ->
         WHERE delegation_notices.owner_id = ?1 AND json_array_length(delegation_notices.source_events) < 128",
         params![owner,uuid::Uuid::now_v7().to_string(),event.session_id,parent,root,hat,event.event_id,kind,turn,pending,incident,revision,now,
         if disposition.is_some(){"operator_required"}else{"parent_queued"},disposition,required])?;
+    // Reserve attention in the source transaction. Lifecycle/grant triggers
+    // activate this row using UPDATE, preserving the existing SQL owner audit.
+    tx.execute("INSERT INTO delegation_attention(owner_id,attention_id,delivery_id,child_id,hat_id,reason,pending_id,state,operator_epoch,incident)
+        SELECT ?1,n.delivery_id,n.delivery_id,n.child_id,c.hat_id,COALESCE(n.reason,'operator_required'),
+        CASE WHEN n.kind = 'question' THEN n.pending_id END,
+        CASE WHEN n.state = 'operator_required' THEN 'open' ELSE 'standby' END,
+        COALESCE((SELECT MAX(event_id) FROM events WHERE owner_id = ?1 AND session_id = n.root_id
+            AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'),0),n.incident
+        FROM delegation_notices n JOIN sessions c ON c.owner_id = ?1 AND c.id = n.child_id
+        WHERE n.owner_id = ?1 AND n.child_id = ?2 AND n.incident = ?3
+        ON CONFLICT DO NOTHING",params![owner,event.session_id,incident])?;
     Ok(())
 }
 
@@ -101,16 +116,17 @@ fn obsolete_in(tx: &Transaction<'_>, owner: &str, child: &str, pending: Option<&
         AND state IN ('parent_queued','waiting_config','operator_required','parent_delivered')",
         params![owner, child, pending],
     )?;
+    tx.execute(
+        "UPDATE delegation_attention SET state = 'resolved' WHERE owner_id = ?1 AND child_id = ?2
+        AND pending_id IS NOT NULL AND (?3 IS NULL OR pending_id = ?3)",
+        params![owner, child, pending],
+    )?;
     Ok(())
 }
 
 impl crate::store::Store {
     pub(crate) fn record_delegation_failure_in(&self, tx: &Transaction<'_>, session: &str, code: &str) -> Result<()> {
-        let child: bool = tx.query_row(
-            "SELECT EXISTS(SELECT 1 FROM session_families WHERE owner_id = ?1 AND child_id = ?2)",
-            params![self.owner_id(), session],
-            |r| r.get(0),
-        )?;
+        let child = delegated_in(tx, self.owner_id(), session)?;
         if child {
             crate::store::collector_event(
                 tx,
@@ -153,6 +169,14 @@ impl crate::store::Store {
     }
 }
 
+fn delegated_in(tx: &Transaction<'_>, owner: &str, session: &str) -> Result<bool> {
+    Ok(tx.query_row(
+        "SELECT EXISTS(SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = ?2 AND delegated_child = 1)",
+        params![owner, session],
+        |r| r.get(0),
+    )?)
+}
+
 #[cfg(test)]
 mod tests {
     use super::*;
diff --git a/crates/hennery-sessions/src/delegation_worker.rs b/crates/hennery-sessions/src/delegation_worker.rs
index 7a3b46ff..55957a31 100644
--- a/crates/hennery-sessions/src/delegation_worker.rs
+++ b/crates/hennery-sessions/src/delegation_worker.rs
@@ -6,8 +6,14 @@ struct Cursors {
     prompts: String,
     answers: String,
     notices: String,
+    attention: String,
+    notifications: String,
 }
 pub fn after_startup(state: &AppState) {
+    let store = state.store.clone();
+    state.push.set_guard(std::sync::Arc::new(move |notice| {
+        store.delegation_push_current(notice).unwrap_or(false)
+    }));
     let state = state.clone();
     tokio::spawn(async move {
         let mut tick = tokio::time::interval(Duration::from_millis(250));
@@ -24,6 +30,14 @@ pub async fn drain(state: &AppState) -> anyhow::Result<()> {
     drain_page(state, &mut Cursors::default()).await
 }
 async fn drain_page(state: &AppState, cursors: &mut Cursors) -> anyhow::Result<()> {
+    let now = hennery_kernel::secret::unix_now();
+    cursors.attention = state
+        .store
+        .refresh_attention_after(&state.hub, now, &cursors.attention)?;
+    cursors.notifications =
+        state
+            .store
+            .enqueue_delegation_attention(&state.push, &state.delegation_run, &cursors.notifications, now)?;
     cursors.answers = state
         .store
         .dispatch_delegation_answers_after(&state.hub, &cursors.answers)?
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index 9d35a185..4ae5ba4c 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -6,6 +6,7 @@ pub mod builtin;
 pub mod content;
 pub mod delegation;
 pub mod delegation_api;
+pub mod delegation_attention;
 pub mod delegation_control;
 pub mod delegation_delivery;
 pub mod delegation_delivery_dispatch;
@@ -75,6 +76,8 @@ pub struct AppState {
     /// The host removals with an attempt in flight (plan 9d B7).
     pub forgets: Arc<forget::InFlight>,
     pub catalogs: Arc<delegation_runtime::Catalogs>,
+    /// One notification reconciliation identity per collector, shared by workers.
+    pub(crate) delegation_run: Arc<str>,
 }
 
 impl AppState {
@@ -94,6 +97,7 @@ impl AppState {
             sweep_interval: sweep::INTERVAL,
             forgets: Arc::new(forget::InFlight::default()),
             catalogs: Arc::default(),
+            delegation_run: uuid::Uuid::now_v7().to_string().into(),
         }
     }
 }
diff --git a/crates/hennery-sessions/src/notify.rs b/crates/hennery-sessions/src/notify.rs
index 83d89a8a..60a2014b 100644
--- a/crates/hennery-sessions/src/notify.rs
+++ b/crates/hennery-sessions/src/notify.rs
@@ -58,7 +58,7 @@ pub fn notice_for(edge: &PushEdge, session: &EdgeSession) -> Option<Notice> {
     })
 }
 
-fn encoded_id(id: &str) -> String {
+pub(crate) fn encoded_id(id: &str) -> String {
     id.bytes()
         .map(|byte| match byte {
             b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (byte as char).to_string(),
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index a30c1bdc..10aab4b9 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -373,6 +373,7 @@ const MIGRATIONS: &[&str] = &[
     ",
     include_str!("delegation_schema.sql"),
     include_str!("delegation_delivery.sql"),
+    include_str!("delegation_attention.sql"),
 ];
 
 /// The most distinct (agent session id, roots) pairs a session records
@@ -529,6 +530,7 @@ pub struct Ingested {
 /// hat's policy applies (10b-i's review, A3).
 #[derive(Debug, Clone, PartialEq, Eq)]
 pub struct Edge {
+    pub source_event_id: i64,
     pub kind: PushEdge,
     pub session: EdgeSession,
 }
@@ -4154,6 +4156,7 @@ impl Store {
         // The session as this fact left it, for the notice (A3).
         let edge = match edge {
             Some(kind) => Some(Edge {
+                source_event_id: fact_id,
                 kind,
                 session: tx.query_row(
                     "SELECT id, hat_id, title, cwd FROM sessions WHERE id = ?1 AND owner_id = ?2",
diff --git a/crates/hennery-sessions/src/ws.rs b/crates/hennery-sessions/src/ws.rs
index 5e786f54..d4982e57 100644
--- a/crates/hennery-sessions/src/ws.rs
+++ b/crates/hennery-sessions/src/ws.rs
@@ -604,8 +604,8 @@ async fn retry_repark(state: AppState, host_id: String) {
 /// Notify the owner of `edge`, which a host fact crossed, if it notifies
 /// (`notify::notice_for`). Queued, never waited on.
 fn notify(state: &AppState, edge: &Edge) {
-    if let Some(notice) = crate::notify::notice_for(&edge.kind, &edge.session) {
-        state.push.notify(notice);
+    if let Err(error) = state.store.route_push_edge(edge, &state.push) {
+        tracing::warn!(code=%crate::session_tools::error_code(&error), "push routing deferred");
     }
 }
 
@@ -709,6 +709,7 @@ mod tests {
 
     fn ended(outcome: TurnOutcome) -> Edge {
         Edge {
+            source_event_id: 0,
             kind: PushEdge::TurnEnded(outcome),
             session: EdgeSession {
                 id: "s1".into(),
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
index df396d62..e15f9cea 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
@@ -1,5 +1,11 @@
 -- Test-only rollback of migration 18 before reconstructing a historical schema.
 -- Production migrations remain append-only.
+DROP TRIGGER attention_notice_update;
+DROP TRIGGER attention_parent_delete;
+DROP TRIGGER attention_child_end;
+DROP TRIGGER attention_pending_end;
+DROP TABLE delegation_attention;
+DROP INDEX delegation_notice_deadline;
 DROP TRIGGER notice_endpoint_end;
 DROP TRIGGER notice_family_end;
 DROP TRIGGER notice_grant_end;
diff --git a/crates/hennery-sessions/tests/store.rs b/crates/hennery-sessions/tests/store.rs
index 50fa0d13..d1157446 100644
--- a/crates/hennery-sessions/tests/store.rs
+++ b/crates/hennery-sessions/tests/store.rs
@@ -2752,6 +2752,7 @@ fn rows_of(conn: &Connection, id: &str, events: &[i64], turns: &[String], hashes
             "session_operations" => format!("caller_id = '{id}' OR child_id = '{id}'"),
             "delegation_start_budgets" => format!("caller_id = '{id}'"),
             "delegation_budgets" => format!("root_id = '{id}'"),
+            "delegation_attention" => format!("child_id = '{id}'"),
             "delegation_notices" => format!("child_id = '{id}' OR parent_id = '{id}' OR root_id = '{id}'"),
             "event_attachments" => format!("event_id IN ({})", list(events.iter().map(i64::to_string).collect())),
             "turn_attachments" => format!("turn_id IN ({})", quoted(turns)),
@@ -2843,6 +2844,8 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
              SELECT owner_id, 's1', 1, '{}' FROM sessions WHERE id = 's1';
          INSERT INTO delegation_start_budgets(owner_id,caller_id,epoch,starts)
              SELECT owner_id, 's1', 0, 1 FROM sessions WHERE id = 's1';
+         INSERT INTO delegation_attention(owner_id,attention_id,child_id,hat_id,reason,incident)
+             SELECT owner_id, 'delete-attention', 's1', hat_id, 'test','delete-attention' FROM sessions WHERE id = 's1';
          INSERT INTO delegation_budgets(owner_id,root_id,epoch,wakes)
              SELECT owner_id, 's1', 0, 1 FROM sessions WHERE id = 's1';
          INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,
@@ -2867,6 +2870,7 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
         "session_attach_evidence",
         "delegation_start_budgets",
         "delegation_budgets",
+        "delegation_attention",
         "delegation_notices",
         "sessions",
         "turn_attachments",
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 5502bfc9..99269efb 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -35,6 +35,11 @@ use std::sync::{Arc, Mutex};
 
 /// The audited sources, and the fewest statements each holds.
 const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-sessions/src/delegation_attention.rs",
+        include_str!("../../hennery-sessions/src/delegation_attention.rs"),
+        15,
+    ),
     (
         "hennery-sessions/src/delegation_delivery_dispatch.rs",
         include_str!("../../hennery-sessions/src/delegation_delivery_dispatch.rs"),
@@ -43,7 +48,7 @@ const SOURCES: &[(&str, &str, usize)] = &[
     (
         "hennery-sessions/src/delegation_delivery.rs",
         include_str!("../../hennery-sessions/src/delegation_delivery.rs"),
-        9,
+        11,
     ),
     (
         "hennery-sessions/src/delegation_control.rs",
diff --git a/nix/package.nix b/nix/package.nix
index 40c8903f..6a99d85a 100644
--- a/nix/package.nix
+++ b/nix/package.nix
@@ -19,6 +19,7 @@ let
       # Crane's common set omits SQL read by Rust's include_str!.
       ../crates/hennery-sessions/src/delegation_schema.sql
       ../crates/hennery-sessions/src/delegation_delivery.sql
+      ../crates/hennery-sessions/src/delegation_attention.sql
       ../crates/hennery-sessions/tests/fixtures/undo_delegation.sql
       (lib.fileset.maybeMissing ../adapters/manifest.json)
       (lib.fileset.maybeMissing ../crates/hennery-host/manifest.json)
```

### Task 2: record verification and request independent review

- [x] Add the execution record and docs/README.md index entry with actual command output, test counts, probe results and replay file count.
- [x] Request parent-run review of this range, deletion/reassignment/admission races and shared C2 seams. Parent owns PR checks, reviewDecision, mergeStateStatus and unresolved threads, bots included.

## Execution record

The implementation and strengthened tests were built before embedding. Base **79304d58** contains D3a's review fixes awaiting re-review; implementation **6ce346de** follows the rebased WIP checkpoint **8365e4f4**. All logs and harnesses are under .superpowers/sdd/deleg-d3b/. The final summary records hashes for eighteen implementation files and exact equality against both the restored probe copy and final fresh replay.

All commands below ran from this worktree in the flake dev shell, with isolated tool homes. Final logs are /tmp/deleg-d3b-final-*.log and retained under the ledger's final-gates/.

| Command | Exit | Output |
|---|---|---|
| cargo fmt --all --check | 0 | clean |
| cargo clippy --workspace --all-targets --locked -- -D warnings | 0 | finished |
| cargo clippy -p hennery --locked -- -D warnings | 0 | finished |
| cargo test --workspace --locked | 0 | **2,400 passed**, 155 suites, one pre-existing ignored test |
| cargo run -p hennery-proto --bin gen --locked -- --check | 0 | current |
| cargo run -p hennery-view --bin gen-view --locked -- --check | 0 | current |
| nix flake check -L | 0 | native aarch64-darwin checks including package, Clippy and embedded UI |

Tests increased **2,369 → 2,400**: 27 attention/race regressions, three push guard regressions and one actual worker/HTTP fallback loop. Targeted/replay suites passed 125 delegation tests, 104 storage tests, 16 push-delivery tests, 14 HTTP delegation tests (one pre-existing ignored) and three owner-filter tests. No web files changed, so the separate web gate was not run. Linux CI and independent review remain parent-owned. Existing ts-rs diagnostic text and the Nix warning about incompatible Linux systems do not change the recorded zero exits.

**RED evidence:** initial missing attention/guard APIs and HTTP 404, plus behavioral failures for pre-fallback operator intent, answer-queue admission, revoked hosts, missing question details, repeated drain notification identity, automatic root completion push, orphan completion/loss/start failure, and subscription errors on suppression. The three final test-strengthening changes were first made in a COPY, observed failing with the corresponding behavior removed, restored GREEN, then copied into the worktree. Initial and final full gate logs are retained separately.

**Probes:** 41 initial mutations produced 38 detected regressions and three coverage findings. The attention-only deletion command did not inspect physical retention; the existing schema-walk storage test detects that mutation. A strengthened receipt assertion detects omitted status acknowledgement. The answer-queue trigger was redundant because every accepted answer records answer_submitted and resolves attention in the same transaction; the duplicate trigger and its rollback-fixture entry were removed. A final probe disabling that canonical attention update now fails the orphan-answer regression. Six strengthening probes and five final probes all detect their mutations, each after a successful exact-command baseline and with restored GREEN checks: **49 detected mutations in total**, with all three initial findings resolved. The initial probe harness's exit 1 is retained honestly as the coverage-finding result; follow-up harnesses exit 0. One initial case injects an invalid SQL table; the additional source-insertion removal probe independently verifies the actual reservation side effect.

The probes cover source reservation/rollback, deadline handling and reason classes, delivered-question/report distinction, fallback epoch snapshot/stability, parent deletion preservation/unlink/scrub, child physical scrub, reassignment, explicit rearm and question acknowledgement fences, stable tags/retries/detail/enqueue, collector run identity, ordinary versus automatic completion routing, orphan facts/start/loss/coalescing, purge and canonical answer admission, production/dynamic/startup kernel guard wiring, retry suppression/device health, route exposure, owner audit, page bounds and exact source-event identity. They ran only in probe-copy-1 and probe-copy-2; all eighteen final implementation files in probe-copy-2 were restored byte-for-byte.

**Load:** final 4×3 runs for attention (27), kernel guard (3), actual HTTP fallback loop (1) and inherited actual-host crash regressions (3): **48 nonempty binary runs / 408 passing test executions**, all exit 0. The earlier targeted load run also passed. The final audit caught twelve zero-test HTTP invocations caused by selecting a different crate's same-named binary; those logs are retained as the pre-audit result and excluded from the valid totals. Only that spawn/timing group was corrected, with twelve actual HTTP test executions. The final audit now rejects every empty load group. Final logs are separately named load-final-*.

**Replay:** replay-1 and final **replay-2** are separate fresh directories archived from 79304d58. Each extracted two nonempty blocks over **18 implementation files**, observed exits **101, 101, 101, 0, 0, 0**, and compared **784 tracked files** exactly against the built tree. Only this plan and its README execution index are excluded. replay-2 uses a private copy of build artifacts and a scratch registry cache; targets are never shared. No probe was applied to the worktree. All eighteen staged implementation files matched the tested tree and final replay before commit; the personal gmail author was audited before each push.

**Verification budget change:** the operator's new budget arrived after the two full workspace runs and both replay runs had finished; no redundant run remained active. No further full run/replay was started. The only subsequent load was the missing HTTP spawn/timing group. Future copies use cp -c -R target cloning, probes stay batched, post-review amendments use targeted RED/guard/staged-byte verification, and further full runs are reserved for the rebases specified by AGENTS.md.

**Review request:** review 79304d58..6ce346de, plus the following execution-record commit. Examine deadline/late acknowledgement ordering; actual host crash facts interleaved with parent deletion; detached surviving children and subsequent startup failures; parent/child deletion and reassignment versus enqueue/admission/retry; first-fallback Operator epoch and delivered/uncertain rearm association; status acknowledgement; queue-loss/restart reconciliation and automatic root completion suppression. Kernel admission cannot recall already admitted external requests. Review the minimal shared C2 seams (AppState's private run id, migration 20 and internal Edge source-event id). Parent owns draft/PR creation, independent security/whole-branch review, all checks/reviewDecision/mergeStateStatus/unresolved bot threads, and merge.

Retain replay-1, replay-2, probe-copy-1 and probe-copy-2 for parent cleanup. D3a's amendment scratch copies remain in its separate ledger. No D3b implementation remainder is deferred; D4 family UI/attention presentation and pinned live acceptance still block ordinary release.


## After the plan

D3b completes durable delivery and operator fallback. D4 still owns family UI/attention presentation and the pinned live inference acceptance matrix. Keep delegation preview-gated until those acceptance criteria and independent reviews pass. Rebase C2 through the minimal shared AppState/store seams without touching its dedicated implementation.

## C2 rebase and combined verification (2026-10-15)

Rebased onto D3a **1888d687**, itself based on merged C2 main **7fe43fbe**. The unsigned --onto rebase maps checkpoint 8365e4f4 → **e5ed4872**, implementation 6ce346de → **e4f3ce73**, and execution record d546a526 → **eb9d9e51**. Range-diff shows both runtime commits patch-identical; the sole D3b conflict was README documentation, resolved preserving C2/D3a integration and D3b records. This record commit changes documentation only; the compiled source remains exactly the verified eb9d9e51 tree.

D3a's original review fix maps 79304d58 → **d91aa92d**. Its additional compatibility amendment **1888d687** makes factual ChildReport input visible while retaining C2's Parent-display regression and PluginContext denial. That new regression was seen RED in the D3a worktree, fixed, and covered by four detected guard probes in one COPY with target cloned using cp -c -R. D3a standalone targeted tests passed **370**, with one pre-existing ignored test; see its rebase record. Its review-fix range is **9ea880dc..1888d687**. D3b's review range starts at **1888d687** and ends at this branch's published tip.

The shared seams compose explicitly:

- C2 startup_dispatch and startup prompt reservations coexist with D3b's private collector-wide delegation_run identity.
- C2's final websocket startup-context guard remains; D3b's durable push routing and internal Edge.source_event_id remain. The latter is not a wire field.
- C2 added no sessions migration. D3 delivery/attention remain **19/20**. A programmatic comparison verifies the merged migration prefix is unchanged; no merged migration was edited.
- All **27** owner-audit entries survive at the stricter minimum from either side, including C2 context/startup sources, gateway minimum 42 and D3b delivery minimum 11/attention minimum 15.
- Four shared source files compose C2 changes (lib, store, ws and owner_filter); the other **14** D3b implementation files are byte-identical to the prior D3b tip.
- Retired verified_child_report_in and conflict markers are absent from source. C2's Hub::notify remains with its mutable-frame signature; constructors compile with plugin_context, and both startup and delegated prompt fences pass.

Both generators ran to regenerate their outputs, rather than hand-merging. All four generated schema/TypeScript files match merged C2 **7fe43fbe** exactly. No D3 generated-type change requires the conditional web gate.

Targeted combined-head commands all exited **0**:

| Command | Passed |
|---|---|
| cargo test -p hennery-sessions --test delegation_d2 --test store --locked | **125 +104** |
| cargo test -p hennery-testkit --test delegation_host --test delegation_tools --test plugin_feed --test owner_filter --test plugin_startup --test plugin_startup_host --locked | **16 +14 +23 +3 +26 +2**, one pre-existing ignored |
| cargo test -p hennery-view --test plugin_origin --locked | **3** |

The full set ran **once**, on the final combined runtime head, as required for a conflicting hotspot rebase. All commands ran inside the dev shell with the existing isolated tool home; logs are .superpowers/sdd/deleg-d3b/rebase-c2/.

| Command | Exit | Output |
|---|---|---|
| cargo fmt --all --check | 0 | clean |
| cargo clippy --workspace --all-targets --locked -- -D warnings | 0 | finished |
| cargo clippy -p hennery --locked -- -D warnings | 0 | finished |
| cargo test --workspace --locked | 0 | **2,436 passed**, 160 suites, one pre-existing ignored |
| cargo run -p hennery-proto --bin gen --locked -- --check | 0 | current |
| cargo run -p hennery-view --bin gen-view --locked -- --check | 0 | current |
| nix flake check -L | 0 | native aarch64-darwin package/Clippy/embedded UI checks |

The previous D3b baseline had 2,400 passing tests; merged C2 adds 35 and the compatibility regression adds 1, giving **2,436**. No full replay was run, and no load repetition was needed because the new regression is synchronous display logic. Existing spawn, deadline, socket and race suites ran normally. D3b-only tests require D3b implementation, so they run here; the D3a shared suites and C2 integration tests also passed on its standalone head. Linux CI remains parent-owned.

The runtime/source snapshot covers **344** tracked files and matches the tree after verification. Source and staged-byte audits, personal gmail authors and the specified old remote leases are checked before pushing the rebased branches. Historical embedded patches, replay/load/probe results and old SHAs above remain evidence for their original pinned bases, not instructions to repeat full verification under the new budget. The only new scratch copy is D3a's rebase-c2/probe-copy-1; retain it for parent cleanup.

Review **9ea880dc..1888d687** for D3a fixes and **1888d687..HEAD** for D3b. Examine ChildReport/Parent display versus PluginContext authority denial, retained origin evidence after deletion, C2 context exclusion from delegated prompts, close/configuration/socket fences, deadline/fallback and push admission after deletion/reassignment. Delegation remains preview-gated pending D4; no family UI, memory service or publication is added. Parent owns PR checks, reviewDecision, mergeStateStatus and unresolved threads, bots included.

## D3b review amendment (2026-10-16)

The parent reported four reproduced findings on **f3f559d1**. The reviewer's reproductions.patch was applied first in this worktree. All four regressions failed as assertions with exit **101**, before runtime changes; three inherited reviewer regressions passed. Logs, the exact four-file implementation patch, APFS-cloned copies and verification scripts are under .superpowers/sdd/deleg-d3b/review-fixes/. D3a was left untouched, and no C2 implementation, merged migration, generated type or web file changed.

The fixes are confined to the private delegation worker, unmerged sessions migration **20**, its rollback fixture and delegation_d2 regressions:

1. An AFTER DELETE answer-queue trigger restores operator attention in the cancellation transaction only for an undelivered, unhanded parent answer whose canonical question is still open without another accepted answer. It unlinks the obsolete routing notice and resets notification attempts. Parent deletion preserves the inert canonical-question reservation before deleting routing receipts, so trigger order cannot lose the fallback. Tests cover close, the public close/delete path, direct lifecycle tombstoning, restart/deadline refresh, transaction rollback and terminal/handed-off/delivered/operator cleanup fences.
2. Startup now runs bounded deadline and notification reconciliation in a separate shutdown-aware 250 ms task, independent of sequential host probes. Dispatch retains its own fair cursors. The paused-clock regression creates **32** slow parent probes and requires all deadlines and notification attempts to reconcile within **one second**, while the first **15-second** probe is still pending. The explicit drain helper retains its reconciliation behavior.
3. Parent deletion retains resolved coalescible loss/start incidents as child/incident tombstones. It replaces the former delivery-shaped attention identity and clears delivery/pending references, reason details, Operator epoch and push run/time. The surviving child and its incident key are the deduplication evidence; no deleted-parent identifier or transcript is retained. A later AdapterExited frame after deletion/reopen cannot resurrect acknowledged work. Ordinary inert/resolved report metadata is still removed, and child deletion still removes all attention.
4. Migration 20 also reconciles canonical open questions on surviving delegated children when no attention/routing notice exists. It uses the canonical opened-event identity, with a deterministic pending-ID fallback for older rows, and creates no open work for accepted answers. An accepted callback may keep a resolved, inert reservation so a later cancellation can restore attention atomically; it does not notify or appear as operator work. Reconstructed schema-19 tests cover the deleted-parent orphan, accepted and terminal callbacks, nondelegated roots and repeated opens.

Verification ran inside the flake dev shell with the existing isolated tool home. These are actual exits and output counts:

| Command | Exit | Output |
|---|---|---|
| cargo fmt --all --check | 0 | clean |
| cargo clippy --workspace --all-targets --locked -- -D warnings | 0 | finished |
| cargo clippy -p hennery --locked -- -D warnings | 0 | finished |
| cargo test --workspace --locked | 0 | **2,443 passed**, 160 suites, one pre-existing ignored |
| cargo run -p hennery-proto --bin gen --locked -- --check | 0 | current |
| cargo run -p hennery-view --bin gen-view --locked -- --check | 0 | current |
| nix flake check -L | 0 | native aarch64-darwin checks |

The full workspace ran **once** for this amendment, explicitly required by the parent because migration 20 is a hotspot. Test counts increased **2,436 → 2,443**: the four reviewer regressions plus three guard/rollback/upgrade tests. Targeted suites passed **132 delegation +104 store**, **16 host +14 delegation HTTP +3 owner audit +23 plugin feed +2 C2 startup host**, and **16 kernel delivery** tests, all exit 0, with one existing ignored HTTP test. All seven new tests are included in the full result. The separate web gate was skipped because no web/generated files changed.

**Probes:** one completed guard-family COPY, **probe-copy-3**, cloned target/ using /bin/cp -c -R before building. Six nonempty exact baselines passed, all **11** source mutations caused test failures (101), and six restored exact commands passed. Guards cover cancellation activation, deletion-safe question reservation, canonical-open admission, incident retention, delivery identity and push scrubbing, independent deadline and notification scheduling, orphan backfill, accepted-answer filtering and delegated-child filtering. All **797 tracked files** matched the built tree after restoration; a separate source audit pins **342 implementation files** through verification. No probe touched the worktree. A shortened exact filter once ran zero tests; that output is excluded and superseded by the full delegation suite and nonempty exact checks.

**Load:** only the new timing regression ran 4×3, giving **12 nonempty executions**, all exit 0. The other findings received targeted tests/probes without load repetition. **Replay:** none for this review amendment, as required by the verification budget; earlier replay evidence above remains historical.

Retain review-fixes/probe-copy-1, probe-copy-2 and probe-copy-3 for parent cleanup, along with the prior copies. The first setup was stopped while an overly broad Git add hashed target; the second target clone encountered a disappearing artifact while the last targeted Cargo build finished. Both stopped before any probes ran. The completed third copy indexed only the explicit tracked list, then cloned the idle target. Their setup logs remain available; no redundant full run was started.

The six staged files matched the verified source snapshot and working tree. The diff was checked against the applicable rules, with no weakened tests/types/rules or new client identifiers; the author audit showed only the personal gmail. The review range is **f3f559d1..this amendment's tip**. Examine cancellation versus canonical resolution/accepted answers and parent deletion, deadline/notification progress during slow probes and shutdown, acknowledged loss frames arriving after deletion/restart, minimal tombstone scrubbing, and schema-19 canonical orphan/accepted-answer backfill. Parent owns re-review and all PR checks, reviewDecision, mergeStateStatus and unresolved threads, bots included. Preview gating and the D4 UI/live acceptance obligations remain unchanged.

Generated with Claude AI — please review before distribution.
