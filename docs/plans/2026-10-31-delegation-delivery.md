# Durable delegation delivery (D3a) Implementation Plan

**Goal:** implement the first reviewable part of D3 from the [delegation design](../specs/2026-10-14-delegation-design.md), §§5–7 and 9–11: transactional child notices, bounded automatic parent delivery, shared provenance, durable wake budgets and restart reconciliation. Delegation remains preview-gated. This is infrastructure for the end-to-end loop, not an ordinary-use release.

**Architecture:** sessions migration 19 stores source references and stable delivery identities separately from D2's caller-key operations. The existing worker drains both directions through the same host actor and owner coordination gate. Reverse reservation writes its turn, ChildReport origin and wake charge atomically, retaining the database gate through synchronous handoff. Host facts, never socket writes, acknowledge delivery. Existing forward command semantics stay directional.

**Tech stack:** existing Rust/SQLite/tokio workspace and hennery-view; no dependency, wire contract or generated asset changes.

## Execution status (2026-10-15)

**Current integration:** rebased onto merged C2 **7fe43fbe**; targeted tests, four cloned-copy guard probes and generated-output verification passed. See [C2 rebase integration](#c2-rebase-integration-2026-10-15). Full combined gates are recorded by D3b; prior replay evidence remains historical.

Built first in `plan/deleg-d3` on D2 **89d74bf2**. Initial behavioral tests were observed RED: seven missing-table failures, missing reverse-dispatch APIs, ordinary-parent missing evidence, answer acceptance not obsoleting a question, missing collector failure notices and duplicate late start failure. The plan below embeds the resulting exact source changes. The fresh replay, copy probes, 4×3 load runs and final gates are complete; evidence follows below. Rebased without conflicts onto merged D2 at **a58479c7**, whose tree is identical to the pinned replay base. Independent security/whole-branch review and Linux/macOS CI remain parent-owned; no review approval is claimed.

## Scope

In: same-transaction notices for applied host and collector facts; questions and withdrawals; out-of-turn adapter loss; attach-incident coalescing; bounded source references; reverse FIFO and operator slot contention; exact-source folded reports with bounded UTF-8 tail; typed C1 ChildReport origins and verification; genuine-park automatic parent resume with fresh config proof; persisted root operator epochs and twenty-wake cap; uncertain association retention, rejection and late-start settlement; terminal routing fences and deletion scrubbing; an actual HTTP/WebSocket/fake-ACP question→parent→answer→completion-report loop.

Out: D3b attention deadlines and durable operator attention projection/push reconciliation; operator rearming and full delete/reassign race acceptance; D4 family API/UI, provenance rendering and pinned live inference matrix; optional memory/startup implementation. No feature gate is relaxed, publication performed or lock-screen reply mechanism added.

## Decisions this plan makes where the spec is silent

| Detail | Choice and consequence | Review authority |
|---|---|---|
| Reverse identity | Separate delivery table with explicit child, parent, source event and destination turn. D2 operation `child_id` is never repurposed as a parent destination | Parent review requested |
| Claims | No asynchronous pre-dispatch claim window: one immediate transaction selects/reserves the turn and the shared owner gate is held through synchronous handoff. A crash after reservation leaves its stable uncertain association for reconciliation, never lease-based resend | Parent review requested; equivalent bounded implementation of the claim requirement |
| Loss identity | Latest applied session_started event identifies an attachment incident. Start failures additionally use attach generation, merging a late factual failure with the collector's initial guess. References are unique and capped at 128; an already delivered incident never queues another turn | Parent review requested |
| Bounds | Thirty-two automatic notice prompts per destination, 8 KiB injected text, 1,000 source events/128 KiB folded input, 2 KiB question projection, twenty root wake-ups between actually acknowledged operator prompts. Overflow has an explicit operator_required disposition, without storing another transcript | Spec defaults; parent review requested |
| Ordinary parent proof | The normal host actor uses attachment generation zero and emits typed evidence. Only an applied normal SessionStarted seeds that proof. Automatic resume uses positive generations and always clears prior evidence. A stale/unapplied normal start cannot seed it | Minimal shared C2 seam; parent coordination/review requested |
| Fallback boundary | D3a records operator_required reasons but does not claim the deadline, dashboard attention or push path is complete. D3b must consume those dispositions before ordinary release | Explicit split authorized by the brief |

## Global Constraints

- Consume C1 InputOrigin::ChildReport. No parallel provenance enum, agent-provided owner or claimed operator approval is introduced. Text is untrusted reference data; server-written turn origin identifies the source.
- Every new SQL source joins owner_filter with a nonzero statement minimum. Source facts and notice failures roll back together. Replayed/unapplied host facts create nothing.
- Both endpoints, family, owner/hat/host, current grant, pending state, close intent, ready reconciliation, config proof and host serialized admission are checked before dispatch. Busy/blocked destinations and out-of-turn pending requests prevent automatic input.
- Automatic resume is a genuinely-parked-only CAS; it never calls the permissive operator resume API or clears close intent. No old/default configuration can release a resumed report.
- Reservation is not delivery. An uncertain turn retains its id; not_delivered is explicit and never automatically replaced. Late factual acknowledgement remains authoritative.
- Parent reports and child prompts never reset root budgets. Proven-unsent handoff releases the turn and refunds that charge while retaining the coordination gate.
- Build/test/probe artifacts and homes are scratch. Probes run only in a fresh COPY, never the working tree. Targets are not shared between copies. No GitHub action is performed here.
- C2 startup, API, connection and wire implementation is untouched. Shared store/lib/audit wiring and the ordinary host actor evidence line are the minimal seams for parent coordination.

## Review Focus

1. Applied-source filtering and atomic rollback; idle crashes, out-of-turn callbacks and exit/cancel/park/interrupted-turn coalescing, including a late factual failure after reconciliation.
2. Reverse versus forward scope; two workers and an operator reserving one slot; close at either endpoint before handoff; grant disable, detach, deletion and reassignment under the shared gate.
3. Generation-zero normal attachment evidence versus positive automatic-resume generations; stale/partial proof, config switches, host final admission and C2 rebase interaction.
4. Durable delivery association across restart/reject/late turn_started; wake reservation/refund and root epochs surviving child replacement and restart.
5. Exact source-turn folding, truncation, unrecognized output, hostile report text and C1 provenance verification. Historical copies remain in surviving transcripts. The review amendment below verifies their strict typed origin against the server-written destination turn, so deleting the source never poisons a later feed page. This evidence grants no current control authority.
6. D3a operator_required is not yet operator attention/push. D3b and D4 remain release blockers. Parent-run independent review and Ubuntu CI are required before merge.

## File structure

- sessions delegation_delivery.sql / delegation_delivery.rs: migration, transactional source classification, coalescing, lifecycle cuts and C1 verification.
- sessions delegation_delivery_dispatch.rs: explicit reverse eligibility, resume, folding, wake budget, reservation and settlement.
- sessions delegation_dispatch / delegation_worker: normal attachment proof, rejection routing and bounded automatic draining.
- sessions store / lib / plugin: applied and collector hooks, failure/reconciliation seams and C1 origin consumption.
- host session: normal actor evidence; existing final fenced prompt admission is reused.
- session D2 suite, testkit delegation_host/delegation_tools/owner_filter and historical-schema fixture: regressions and SQL audit.
- nix/package.nix: include the new SQL file in the Nix source closure.

**Reading the steps:** apply each nonempty fenced diff with `git apply --index` in order on the pinned base. The first block contains the integration/host tests; its commands must fail. The second block contains the implementation, owner audit, internal provenance test and source closure. It must pass. These are synthetic final test/feature states, not a claim that intermediate local edits never required corrections. The harness refuses zero extracted blocks/files and compares every affected final file byte-for-byte with the built tree. The plan and README execution index are excluded from that implementation comparison.

### Task 1, step 1: specify durable parent delivery and the automatic loop

- [x] Run the tests against the base and observe RED before implementation.

<!-- replay {"checks":[["cargo test -p hennery-sessions --test delegation_d2 --locked d3_",101],["cargo test -p hennery-testkit --test delegation_host --locked ordinary_parent_attach",101],["cargo test -p hennery-testkit --test delegation_tools --locked durable_question_answer_and_report",101]]} -->
```diff
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 69f79ef5..7d69e2d7 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -266,6 +266,721 @@ fn answer() -> AnswerRequest {
     }
 }
 
+fn notices(w: &World) -> Vec<(String, String, String)> {
+    raw(w)
+        .prepare("SELECT kind,state,source_events FROM delegation_notices WHERE owner_id = ?1 ORDER BY rowid")
+        .unwrap()
+        .query_map([w.store.owner_id()], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
+        .unwrap()
+        .collect::<rusqlite::Result<_>>()
+        .unwrap()
+}
+
+#[test]
+fn d3_question_is_transactional_and_replayed_or_unapplied_facts_add_nothing() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    assert_eq!(notices(&w).len(), 1);
+    assert_eq!(notices(&w)[0].0, "question");
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    ended(&w, "child", 3, "unknown");
+    assert_eq!(notices(&w).len(), 1);
+    let conn = raw(&w);
+    conn.execute_batch("CREATE TRIGGER fail_notice BEFORE INSERT ON delegation_notices BEGIN SELECT RAISE(ABORT,'notice failed'); END;").unwrap();
+    assert!(
+        w.store
+            .ingest(
+                "child",
+                4,
+                &SessionBody::PendingOpened {
+                    pending_id: "rollback".into(),
+                    indexed: Indexed {
+                        pending: Some(Box::new(PendingExtract {
+                            id: "rollback".into(),
+                            kind: PendingKind::Elicitation,
+                            option_ids: None,
+                            title: None
+                        })),
+                        ..Default::default()
+                    },
+                    payload: json!({})
+                }
+            )
+            .is_err()
+    );
+    assert!(!w.store.still_open("child", "rollback").unwrap());
+}
+
+#[test]
+fn d3_idle_adapter_loss_and_following_park_share_one_incident() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    w.store
+        .ingest(
+            "child",
+            2,
+            &SessionBody::AdapterExited {
+                code: Some(1),
+                signal: None,
+                stderr_tail: String::new(),
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w).len(), 1);
+    assert_eq!(notices(&w)[0].0, "session_unavailable");
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
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
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::SessionParked {
+                reason: ParkReason::AdapterExited,
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w).len(), 1);
+    assert_eq!(
+        notices(&w)[0].1,
+        "parent_delivered",
+        "coalescing must not wake the parent twice"
+    );
+    let refs: Vec<i64> = serde_json::from_str(&notices(&w)[0].2).unwrap();
+    assert_eq!(refs.len(), 2);
+}
+
+#[test]
+fn d3_loss_obsoletes_out_of_turn_question_before_cancellation_frame() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
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
+    assert_eq!(notices(&w)[0].1, "obsolete");
+    assert!(
+        w.store.still_open("child", "question").unwrap(),
+        "canonical cancellation comes later"
+    );
+    w.store
+        .ingest(
+            "child",
+            4,
+            &SessionBody::SessionParked {
+                reason: ParkReason::AdapterExited,
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w).len(), 2);
+    assert_eq!(notices(&w)[1].0, "session_unavailable");
+}
+
+#[test]
+fn d3_withdrawal_is_distinct_and_idle_park_does_not_wake_parent() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::PendingResolved {
+                pending_id: "question".into(),
+                resolution: PendingResolution::Cancelled,
+                reason: Some(PendingReason::AgentWithdrew),
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w)[0].1, "obsolete");
+    assert_eq!(notices(&w)[1].0, "question_cancelled");
+    w.store
+        .ingest(
+            "child",
+            4,
+            &SessionBody::SessionParked {
+                reason: ParkReason::Idle,
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w).len(), 2);
+}
+
+#[test]
+fn d3_collector_reconciliation_and_host_revoke_record_loss() {
+    for revoke in [false, true] {
+        let (w, _) = pair();
+        pending(&w, "child", 2, "question", PendingKind::Elicitation);
+        if revoke {
+            w.store.revoke_host("host").unwrap();
+        } else {
+            w.store.reconcile_host("host", &[]).unwrap();
+        }
+        assert_eq!(notices(&w)[0].1, "obsolete");
+        assert_eq!(notices(&w).iter().filter(|n| n.0 == "session_unavailable").count(), 1);
+    }
+}
+
+#[test]
+fn d3_permission_and_closed_parent_record_operator_disposition() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    assert_eq!(notices(&w)[0].1, "operator_required");
+    w.store.record_close_request("parent").unwrap();
+    pending(&w, "child", 3, "question", PendingKind::Elicitation);
+    assert!(notices(&w).iter().all(|n| n.1 == "operator_required"));
+}
+
+#[test]
+fn d3_delete_scrubs_notices_and_reassignment_disables_routing() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    raw(&w)
+        .execute(
+            "UPDATE sessions SET hat_id = ?1 WHERE owner_id = ?2 AND id = 'child'",
+            params![w.other, w.store.owner_id()],
+        )
+        .unwrap();
+    assert_eq!(notices(&w)[0].1, "operator_required");
+    w.store.close_now("child").unwrap();
+    w.store.delete_session("child", None).unwrap();
+    assert!(notices(&w).is_empty());
+}
+
+fn ready_parent(w: &World) {
+    seed(w, "parent", &config("wanted"), 7);
+    proof(w, "parent", 2, 7, 10, ConfigCompleteness::Complete, config("wanted"));
+}
+
+#[test]
+fn d3_ordinary_parent_start_is_the_only_generation_zero_seed() {
+    let w = World::new();
+    let p = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut started = SessionBody::session_started("start", "agent-parent");
+    if let SessionBody::SessionStarted { indexed, .. } = &mut started {
+        indexed.config_evidence = Some(Box::new(ConfigEvidence {
+            attach_generation: 0,
+            config_revision: 1,
+            completeness: ConfigCompleteness::Complete,
+            actual: config("wanted"),
+        }));
+    }
+    w.store.ingest("parent", 1, &started).unwrap();
+    child(&w, &p, "child", &w.hat);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (h, _rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    // An unapplied duplicate start cannot replace current attach proof.
+    proof(&w, "parent", 2, 0, 5, ConfigCompleteness::Complete, config("wanted"));
+    w.store.ingest("parent", 3, &started).unwrap();
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT config_revision FROM session_attach_evidence WHERE owner_id=?1 AND session_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        5
+    );
+}
+
+#[test]
+fn d3_collector_start_failure_has_one_durable_factual_source() {
+    for starting in [false, true] {
+        let (w, _) = pair();
+        if starting {
+            raw(&w)
+                .execute(
+                    "UPDATE sessions SET lifecycle='starting' WHERE owner_id=?1 AND id='child'",
+                    [w.store.owner_id()],
+                )
+                .unwrap();
+            w.store.mark_failed_if_starting("child", "start_failed").unwrap();
+            w.store.mark_failed_if_starting("child", "start_failed").unwrap();
+        } else {
+            w.store.mark_failed("child", "start_failed").unwrap();
+            w.store.mark_failed("child", "start_failed").unwrap();
+        }
+        assert_eq!(notices(&w).len(), 1);
+        assert_eq!(notices(&w)[0].0, "session_failed");
+    }
+}
+
+#[test]
+fn d3_late_factual_start_failure_updates_the_existing_incident() {
+    let (w, _) = pair();
+    w.store.mark_failed("child", "start_not_delivered").unwrap();
+    w.store
+        .ingest(
+            "child",
+            2,
+            &SessionBody::StartFailed {
+                request_id: "late".into(),
+                code: "adapter_failed".into(),
+                message: "failure".into(),
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w).len(), 1);
+    let refs: Vec<i64> = serde_json::from_str(&notices(&w)[0].2).unwrap();
+    assert_eq!(refs.len(), 2);
+}
+
+#[test]
+fn d3_operator_answer_obsoletes_queued_question_in_its_acceptance_transaction() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store.submit_answer("child", "question", &answer()).unwrap();
+    assert_eq!(notices(&w)[0].1, "obsolete");
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::PendingResolved {
+                pending_id: "question".into(),
+                resolution: PendingResolution::Delivered,
+                reason: None,
+            },
+        )
+        .unwrap();
+    assert_eq!(notices(&w).len(), 1, "a delivered answer is not a cancellation notice");
+}
+
+#[test]
+fn d3_report_uses_exact_source_turn_and_keeps_utf8_tail_under_eight_kib() {
+    let (w, p) = pair();
+    ready(&w);
+    ready_parent(&w);
+    let (h, mut rx) = connected();
+    let mut seq = 3;
+    for (key, text) in [
+        ("first", format!("{}END-第一", "ą".repeat(6000))),
+        ("second", "SECOND-ONLY".to_string()),
+    ] {
+        queue(&w, &p, key);
+        assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+        let (request, turn) = take_prompt(&mut rx);
+        w.store
+            .ingest(
+                "child",
+                seq,
+                &SessionBody::TurnStarted {
+                    request_id: request,
+                    turn_id: turn.clone(),
+                },
+            )
+            .unwrap();
+        seq += 1;
+        w.store.ingest("child",seq,&SessionBody::AcpUpdate {indexed:Indexed {turn_id:Some(turn.clone()),..Default::default()},payload:json!({"update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":text}}})}).unwrap();
+        seq += 1;
+        ended(&w, "child", seq, &turn);
+        seq += 1;
+    }
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    let frame = rx.try_recv().unwrap();
+    let CollectorFrame::DelegatedPrompt { content, .. } = frame else {
+        panic!()
+    };
+    let text = content[0]["text"].as_str().unwrap();
+    assert!(text.len() <= 8192);
+    assert!(text.contains("END-第一"));
+    assert!(!text.contains("SECOND-ONLY"));
+    assert!(text.contains("\"truncated\":true"));
+}
+
+#[test]
+fn d3_reverse_delivery_reserves_once_and_only_facts_acknowledge_it() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    assert_eq!(
+        w.store.find_session("parent").unwrap().unwrap().open_turn_id.as_deref(),
+        Some(turn.as_str())
+    );
+    assert_eq!(notices(&w)[0].1, "awaiting_reconciliation");
+    assert!(!w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
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
+    assert_eq!(notices(&w)[0].1, "parent_delivered");
+    let user = w
+        .store
+        .events("parent", 0, 100)
+        .unwrap()
+        .into_iter()
+        .find(|e| e.kind == "user_turn")
+        .unwrap();
+    let origin: InputOrigin = serde_json::from_value(user.body["origin"].clone()).unwrap();
+    assert!(matches!(origin,InputOrigin::ChildReport {child_id,..} if child_id=="child"));
+    assert!(
+        user.body["content"][0]["text"]
+            .as_str()
+            .unwrap()
+            .contains("not operator input or approval")
+    );
+    ended(&w, "parent", 4, &turn);
+    assert_eq!(
+        notices(&w)[0].1,
+        "parent_delivered",
+        "a delivered question remains unresolved"
+    );
+}
+
+#[test]
+fn d3_reverse_delivery_checks_pending_config_close_grant_and_family() {
+    for cut in [
+        "pending",
+        "config",
+        "partial",
+        "stale",
+        "close_parent",
+        "close_child",
+        "grant",
+        "family",
+    ] {
+        let (w, _) = pair();
+        ready_parent(&w);
+        pending(&w, "child", 2, "question", PendingKind::Elicitation);
+        match cut {
+            "pending" => {
+                pending(&w, "parent", 3, "parent-question", PendingKind::Elicitation);
+            }
+            "config" => {
+                raw(&w)
+                    .execute(
+                        "UPDATE session_attach_evidence SET evidence=NULL WHERE owner_id=?1 AND session_id='parent'",
+                        [w.store.owner_id()],
+                    )
+                    .unwrap();
+            }
+            "partial" => {
+                proof(&w, "parent", 3, 7, 11, ConfigCompleteness::Partial, config("wanted"));
+            }
+            "stale" => {
+                let stale = ConfigEvidence {
+                    attach_generation: 8,
+                    config_revision: 11,
+                    completeness: ConfigCompleteness::Complete,
+                    actual: config("wanted"),
+                };
+                raw(&w)
+                    .execute(
+                        "UPDATE session_attach_evidence SET evidence=?2 WHERE owner_id=?1 AND session_id='parent'",
+                        params![w.store.owner_id(), serde_json::to_string(&stale).unwrap()],
+                    )
+                    .unwrap();
+            }
+            "close_parent" => {
+                w.store.record_close_request("parent").unwrap();
+            }
+            "close_child" => {
+                w.store.record_close_request("child").unwrap();
+            }
+            "grant" => {
+                w.gateway.set_session_tools(&w.hat, false).unwrap();
+            }
+            _ => {
+                raw(&w)
+                    .execute(
+                        "UPDATE session_families SET detached=1 WHERE owner_id=?1 AND child_id='child'",
+                        [w.store.owner_id()],
+                    )
+                    .unwrap();
+            }
+        }
+        let (h, mut rx) = connected();
+        if cut == "family" {
+            assert_eq!(notices(&w)[0].1, "operator_required");
+        }
+        assert!(
+            !w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap(),
+            "{cut}"
+        );
+        assert!(rx.try_recv().is_err(), "{cut}");
+    }
+}
+
+#[test]
+fn d3_two_reverse_workers_and_an_operator_compete_for_one_slot() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (h, mut rx) = connected();
+    let second = Store::open(&w.db).unwrap();
+    let third = Store::open(&w.db).unwrap();
+    let gate = Barrier::new(3);
+    let results = std::thread::scope(|scope| {
+        let a = scope.spawn(|| {
+            gate.wait();
+            w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap()
+        });
+        let b = scope.spawn(|| {
+            gate.wait();
+            second.dispatch_child_notice("parent", &catalog(), &h).unwrap()
+        });
+        let c = scope.spawn(|| {
+            gate.wait();
+            third
+                .open_turn("parent", "operator-race", &[json!({"type":"text","text":"operator"})])
+                .unwrap()
+        });
+        (a.join().unwrap(), b.join().unwrap(), c.join().unwrap())
+    });
+    assert_eq!([results.0, results.1, results.2].into_iter().filter(|v| *v).count(), 1);
+    if results.0 || results.1 {
+        take_prompt(&mut rx);
+    }
+    assert!(rx.try_recv().is_err());
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM turns WHERE owner_id=?1 AND session_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        1
+    );
+}
+
+#[test]
+fn d3_restart_keeps_uncertain_association_and_late_start_can_win() {
+    for rejection in [true, false] {
+        let (w, _) = pair();
+        ready_parent(&w);
+        pending(&w, "child", 2, "question", PendingKind::Elicitation);
+        let (h, mut rx) = connected();
+        assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+        let (request, turn) = take_prompt(&mut rx);
+        let reopened = Store::open(&w.db).unwrap();
+        assert!(!reopened.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+        if rejection {
+            assert!(reopened.reject_delegation("host", &request).unwrap());
+        } else {
+            reopened
+                .reconcile_host(
+                    "host",
+                    &[
+                        hennery_proto::frames::AttachedSession {
+                            session_id: "parent".into(),
+                            last_seq: 2,
+                            open_turn_id: None,
+                        },
+                        hennery_proto::frames::AttachedSession {
+                            session_id: "child".into(),
+                            last_seq: 2,
+                            open_turn_id: None,
+                        },
+                    ],
+                )
+                .unwrap();
+        }
+        assert_eq!(notices(&w)[0].1, "operator_required");
+        reopened
+            .ingest(
+                "parent",
+                3,
+                &SessionBody::TurnStarted {
+                    request_id: request,
+                    turn_id: turn.clone(),
+                },
+            )
+            .unwrap();
+        assert_eq!(notices(&w)[0].1, "parent_delivered");
+        assert!(!reopened.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+        assert!(rx.try_recv().is_err());
+    }
+}
+
+#[test]
+fn d3_wake_budget_survives_reopen_and_child_questions_do_not_reset_it() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    let (h, mut rx) = connected();
+    for n in 0..21 {
+        pending(&w, "child", n + 2, &format!("question-{n}"), PendingKind::Elicitation);
+        let reopened = Store::open(&w.db).unwrap();
+        let sent = reopened.dispatch_child_notice("parent", &catalog(), &h).unwrap();
+        assert_eq!(sent, n < 20);
+        if sent {
+            let (request, turn) = take_prompt(&mut rx);
+            w.store
+                .ingest(
+                    "parent",
+                    n * 2 + 3,
+                    &SessionBody::TurnStarted {
+                        request_id: request,
+                        turn_id: turn.clone(),
+                    },
+                )
+                .unwrap();
+            ended(&w, "parent", n * 2 + 4, &turn);
+        }
+    }
+    assert_eq!(notices(&w).last().unwrap().1, "operator_required");
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT SUM(wakes) FROM delegation_budgets WHERE owner_id=?1",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        20
+    );
+    user_turn_with_origin(&w, "parent", 43, "operator-root", InputOrigin::Operator {});
+    pending(&w, "child", 23, "new-epoch-question", PendingKind::Elicitation);
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    assert_eq!(
+        notices(&w)[20].1,
+        "operator_required",
+        "a new operator epoch does not replay an escalated notice"
+    );
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM delegation_budgets WHERE owner_id=?1",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        2
+    );
+}
+
+#[test]
+fn d3_unsent_handoff_spends_no_budget_and_does_not_leave_a_turn() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let (h, rx) = connected();
+    drop(rx);
+    assert!(!w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    assert_eq!(notices(&w)[0].1, "parent_queued");
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COALESCE(SUM(wakes),0) FROM delegation_budgets WHERE owner_id=?1",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+    assert!(w.store.find_session("parent").unwrap().unwrap().open_turn_id.is_none());
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM turns WHERE owner_id=?1 AND session_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+    assert!(
+        raw(&w)
+            .query_row(
+                "SELECT target_turn FROM delegation_notices WHERE owner_id=?1",
+                [w.store.owner_id()],
+                |r| r.get::<_, Option<String>>(0)
+            )
+            .unwrap()
+            .is_none()
+    );
+}
+
+#[test]
+fn d3_queue_overflow_has_a_durable_disposition_without_evicting_questions() {
+    let (w, _) = pair();
+    for n in 0..33 {
+        pending(&w, "child", n + 2, &format!("q-{n}"), PendingKind::Elicitation);
+    }
+    let rows = notices(&w);
+    assert_eq!(rows.len(), 33);
+    assert_eq!(rows.iter().filter(|r| r.1 == "parent_queued").count(), 32);
+    assert_eq!(rows.last().unwrap().1, "operator_required");
+    assert_eq!(w.store.open_pending("child").unwrap().len(), 33);
+}
+
+#[test]
+fn d3_automatic_parent_resume_requires_genuine_park_and_fresh_proof() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store
+        .ingest(
+            "parent",
+            3,
+            &SessionBody::SessionParked {
+                reason: ParkReason::Idle,
+            },
+        )
+        .unwrap();
+    let (h, mut rx) = connected();
+    let mcp = McpContext {
+        capable: true,
+        isolation: McpIsolation::ClaudeStrict,
+        rules_name_other_hats: false,
+    };
+    assert!(w.store.attach_notice_parent("parent", mcp, &catalog(), &h).unwrap());
+    let generation = match rx.try_recv().unwrap() {
+        CollectorFrame::DelegatedAttach { attach_generation, .. } => attach_generation,
+        other => panic!("{other:?}"),
+    };
+    assert_eq!(generation, 8);
+    assert!(!w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    w.store
+        .ingest("parent", 4, &SessionBody::session_started("resume", "agent-parent"))
+        .unwrap();
+    proof(
+        &w,
+        "parent",
+        5,
+        generation,
+        1,
+        ConfigCompleteness::Complete,
+        config("wanted"),
+    );
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+}
+
+#[test]
+fn d3_collector_close_obsoletes_its_question_before_endpoint_routing_cuts() {
+    let (w, _) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store.close_now("child").unwrap();
+    assert_eq!(notices(&w)[0].1, "obsolete");
+    assert!(notices(&w).iter().any(|n| n.0 == "question_cancelled"));
+}
+
 #[test]
 fn delegated_unattached_close_records_parent_intent_and_publishes_all_committed_events() {
     let (w, p) = pair();
diff --git a/crates/hennery-sessions/tests/store.rs b/crates/hennery-sessions/tests/store.rs
index d8653a2d..50fa0d13 100644
--- a/crates/hennery-sessions/tests/store.rs
+++ b/crates/hennery-sessions/tests/store.rs
@@ -2751,6 +2751,8 @@ fn rows_of(conn: &Connection, id: &str, events: &[i64], turns: &[String], hashes
             "session_dispatch_queue" => format!("source_id = '{id}' OR target_id = '{id}'"),
             "session_operations" => format!("caller_id = '{id}' OR child_id = '{id}'"),
             "delegation_start_budgets" => format!("caller_id = '{id}'"),
+            "delegation_budgets" => format!("root_id = '{id}'"),
+            "delegation_notices" => format!("child_id = '{id}' OR parent_id = '{id}' OR root_id = '{id}'"),
             "event_attachments" => format!("event_id IN ({})", list(events.iter().map(i64::to_string).collect())),
             "turn_attachments" => format!("turn_id IN ({})", quoted(turns)),
             "attachments" => format!("sha256 IN ({})", quoted(hashes)),
@@ -2840,7 +2842,13 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
          INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config)
              SELECT owner_id, 's1', 1, '{}' FROM sessions WHERE id = 's1';
          INSERT INTO delegation_start_budgets(owner_id,caller_id,epoch,starts)
-             SELECT owner_id, 's1', 0, 1 FROM sessions WHERE id = 's1';",
+             SELECT owner_id, 's1', 0, 1 FROM sessions WHERE id = 's1';
+         INSERT INTO delegation_budgets(owner_id,root_id,epoch,wakes)
+             SELECT owner_id, 's1', 0, 1 FROM sessions WHERE id = 's1';
+         INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,
+             source_events,kind,incident,accepted_revision,created_at,deadline,required_config)
+             SELECT owner_id, 'delete-delivery', 'family-child', 's1', 's1', hat_id, 0, '[0]', 'turn_ended',
+             'delete-incident', 1, 0, 300, '{}' FROM sessions WHERE id = 's1';",
     )
     .unwrap();
     store.close_now("s1").unwrap();
@@ -2858,6 +2866,8 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
         "session_dispatch_queue",
         "session_attach_evidence",
         "delegation_start_budgets",
+        "delegation_budgets",
+        "delegation_notices",
         "sessions",
         "turn_attachments",
         "turns",
diff --git a/crates/hennery-testkit/tests/delegation_host.rs b/crates/hennery-testkit/tests/delegation_host.rs
index 7f2130fd..abe8a8d0 100644
--- a/crates/hennery-testkit/tests/delegation_host.rs
+++ b/crates/hennery-testkit/tests/delegation_host.rs
@@ -92,6 +92,34 @@ async fn stop(handle: session::SessionHandle) {
     handle.finished().await;
 }
 
+#[tokio::test]
+async fn ordinary_parent_attach_produces_evidence_and_accepts_a_fenced_report() {
+    let root = tempfile::tempdir().unwrap();
+    let (up, _) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let h = session::launch(
+        up.clone(),
+        launch(root.path(), script(), Attach::New),
+        SessionOptions::default(),
+    );
+    let f = until(&up, |f| !f.is_empty()).await;
+    let ev = evidence(&f);
+    assert_eq!(ev.attach_generation, 0);
+    assert_eq!(ev.completeness, ConfigCompleteness::Complete);
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 0,
+            config_revision: ev.config_revision,
+        },
+        "report",
+    ));
+    until(&up, |f| {
+        f.iter()
+            .any(|f| matches!(f,HostFrame::Session {body:SessionBody::TurnEnded {turn_id,..},..} if turn_id=="report"))
+    })
+    .await;
+    stop(h).await;
+}
+
 #[test]
 fn workspace_fence_rejects_outside_and_symlink_swap() {
     let root = tempfile::tempdir().unwrap();
diff --git a/crates/hennery-testkit/tests/delegation_tools.rs b/crates/hennery-testkit/tests/delegation_tools.rs
index 28f639d3..9d63ffac 100644
--- a/crates/hennery-testkit/tests/delegation_tools.rs
+++ b/crates/hennery-testkit/tests/delegation_tools.rs
@@ -545,6 +545,117 @@ async fn seven_handlers_share_launcher_catalog_and_choose_runtime_and_model_with
     h.finish().await;
 }
 
+#[tokio::test]
+async fn durable_question_answer_and_report_complete_the_automatic_parent_child_loop() {
+    let mut worker = script();
+    worker.asks = vec![FakeAsk::Elicitation];
+    let h = Harness::new(worker).await;
+    let receipt = h.spawn("delivery-loop", json!({"model":"large"})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    let question = eventually(
+        "ordinary child question automatically delivered to parent",
+        async || {
+            h.state.store.events(&h.parent, 0, 100).unwrap().into_iter().find(|e| {
+                e.kind == "user_turn"
+                    && e.body["origin"]["kind"] == "child_report"
+                    && e.body["content"][0]["text"]
+                        .as_str()
+                        .is_some_and(|s| s.contains("\"kind\":\"question\""))
+            })
+        },
+    )
+    .await;
+    assert_eq!(question.body["origin"]["child_id"], child);
+    let pending = h.state.store.open_pending(child).unwrap().pop().unwrap();
+    h.ok("session_answer",json!({"operation_key":"loop-answer","child_id":child,"pending_id":pending.pending_id,"action":"accept","content":{"name":"parent"}})).await;
+    h.done(child, "delivery-loop").await;
+    let report = eventually("child completion automatically delivered to parent", async || {
+        h.state.store.events(&h.parent, 0, 100).unwrap().into_iter().find(|e| {
+            e.kind == "user_turn"
+                && e.body["origin"]["kind"] == "child_report"
+                && e.body["content"][0]["text"]
+                    .as_str()
+                    .is_some_and(|s| s.contains("\"kind\":\"turn_ended\""))
+        })
+    })
+    .await;
+    assert!(
+        report.body["content"][0]["text"]
+            .as_str()
+            .unwrap()
+            .contains("child-result")
+    );
+    assert_ne!(
+        question.body["origin"]["delivery_id"],
+        report.body["origin"]["delivery_id"]
+    );
+    assert_eq!(
+        h.state
+            .store
+            .pending_item(&pending.pending_id)
+            .unwrap()
+            .unwrap()
+            .delivered,
+        Some(true)
+    );
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn child_completion_resumes_a_genuinely_parked_parent_and_delivers_its_report() {
+    let mut worker = script();
+    worker.asks = vec![FakeAsk::Elicitation];
+    let h = Harness::new(worker).await;
+    let receipt = h.spawn("resume-report", json!({"model":"large"})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    let pending = eventually("child asks", async || h.state.store.open_pending(child).unwrap().pop()).await;
+    eventually("parent handled its question notice", async || {
+        let s = h.state.store.find_session(&h.parent).unwrap().unwrap();
+        let received = h
+            .state
+            .store
+            .events(&h.parent, 0, 100)
+            .unwrap()
+            .iter()
+            .any(|e| e.kind == "user_turn" && e.body["origin"]["kind"] == "child_report");
+        (received && s.open_turn_id.is_none()).then_some(())
+    })
+    .await;
+    let (status, body) = h.post(&format!("/api/sessions/{}/park", h.parent), json!({})).await;
+    assert!(status.is_success(), "{body}");
+    eventually("parent genuinely parked", async || {
+        h.state
+            .store
+            .find_session(&h.parent)
+            .unwrap()
+            .filter(|s| s.lifecycle == "parked" && !s.presumed_parked)
+    })
+    .await;
+    let (status, body) = h
+        .post(
+            &format!("/api/sessions/{child}/pending/{}/answer", pending.pending_id),
+            json!({"action":"accept","content":{"name":"operator"}}),
+        )
+        .await;
+    assert_eq!(status, reqwest::StatusCode::ACCEPTED, "{body}");
+    eventually("completion resumes parent and delivers report", async || {
+        h.state.store.events(&h.parent, 0, 100).unwrap().into_iter().find(|e| {
+            e.kind == "user_turn"
+                && e.body["origin"]["kind"] == "child_report"
+                && e.body["content"][0]["text"]
+                    .as_str()
+                    .is_some_and(|s| s.contains("\"kind\":\"turn_ended\""))
+        })
+    })
+    .await;
+    let log = std::fs::read_to_string(h.cwd.join("claude-sessions.jsonl")).unwrap();
+    assert!(
+        log.lines()
+            .any(|line| serde_json::from_str::<Value>(line).unwrap()["method"] == "session/load")
+    );
+    h.finish().await;
+}
+
 #[tokio::test]
 async fn initial_brief_waits_for_new_child_configuration_readback() {
     let mut s = script();
@@ -920,9 +1031,18 @@ async fn queued_parent_answer_reaches_existing_session_stream_before_dispatch()
     assert!(changed["delivered"].is_null(), "publication precedes host handoff");
     let committed = h.state.store.events(child, last, 100).unwrap();
     assert_eq!(committed.len(), 1);
-    assert_eq!(published.try_recv().unwrap(), committed[0]);
+    let child_events: Vec<_> = std::iter::from_fn(|| published.try_recv().ok())
+        .filter(|event| event.session_id == child)
+        .collect();
+    assert_eq!(
+        child_events, committed,
+        "the child publishes exactly its committed answer; parent reports have their own stream"
+    );
     h.ok("session_answer", arguments).await;
-    assert!(published.try_recv().is_err(), "retry must not republish the answer");
+    assert!(
+        !std::iter::from_fn(|| published.try_recv().ok()).any(|event| event.session_id == child),
+        "retry must not republish the child's answer"
+    );
     h.finish().await;
 }
 
diff --git a/crates/hennery-testkit/tests/host_session.rs b/crates/hennery-testkit/tests/host_session.rs
index bcd62aa6..49e8ab03 100644
--- a/crates/hennery-testkit/tests/host_session.rs
+++ b/crates/hennery-testkit/tests/host_session.rs
@@ -16,6 +16,18 @@ use std::path::Path;
 use std::process::Command;
 use std::time::Duration;
 
+fn unknown_normal_configuration() -> Indexed {
+    Indexed {
+        config_evidence: Some(Box::new(hennery_proto::delegation_host::ConfigEvidence {
+            attach_generation: 0,
+            config_revision: 1,
+            completeness: hennery_proto::delegation_host::ConfigCompleteness::Partial,
+            actual: SessionConfig::default(),
+        })),
+        ..Indexed::default()
+    }
+}
+
 fn kinds(frames: &[HostFrame]) -> Vec<String> {
     frames
         .iter()
@@ -1459,7 +1471,7 @@ async fn a_switch_without_a_read_back_announces_no_catalogue() {
     );
     let frames = wait_until(&uplink, has("session_started")).await;
     assert_eq!(switches(&log), "model=large\n");
-    assert_eq!(started_extracts(&frames), Indexed::default());
+    assert_eq!(started_extracts(&frames), unknown_normal_configuration());
     assert_eq!(kinds(&frames), ["session_started"]);
 }
 
@@ -1484,7 +1496,7 @@ async fn a_hung_switch_is_reported_and_the_session_still_starts() {
     );
     let frames = wait_until(&uplink, has("host_note:config_failed")).await;
     assert_eq!(kinds(&frames), ["session_started", "host_note:config_failed"]);
-    assert_eq!(started_extracts(&frames), Indexed::default());
+    assert_eq!(started_extracts(&frames), unknown_normal_configuration());
     let text = note_text(&frames, "config_failed");
     assert!(text.contains("model=large: no answer within"), "{text}");
     // Nothing is sent after a switch that did not answer.
@@ -1528,7 +1540,11 @@ async fn a_late_model_switch_stops_the_starts_switches_so_its_clamp_cannot_undo_
         "model=large\n",
         "the mode switch went out behind a late model switch"
     );
-    assert_eq!(started_extracts(&frames), Indexed::default(), "the values are unknown");
+    assert_eq!(
+        started_extracts(&frames),
+        unknown_normal_configuration(),
+        "the values are unknown"
+    );
     let text = note_text(&frames, "config_failed");
     assert!(
         text.contains("mode=plan: not sent: an earlier switch did not answer"),
@@ -1667,7 +1683,7 @@ async fn a_switch_without_a_read_back_does_not_skip_later_values_on_stale_data()
     );
     let frames = wait_until(&uplink, has("session_started")).await;
     assert_eq!(switches(&log), "model=large\nmode=default\n");
-    assert_eq!(started_extracts(&frames), Indexed::default());
+    assert_eq!(started_extracts(&frames), unknown_normal_configuration());
     assert_eq!(kinds(&frames), ["session_started"]);
 }
 
```

### Task 1, step 2: implement transactional reverse delivery and provenance

<!-- replay {"checks":[["cargo test -p hennery-sessions --test delegation_d2 --test store --locked",0],["cargo test -p hennery-testkit --test delegation_host --test delegation_tools --test host_session --test owner_filter --locked",0],["cargo test -p hennery-sessions --lib --locked child_report_provenance",0]]} -->
```diff
diff --git a/crates/hennery-host/src/session.rs b/crates/hennery-host/src/session.rs
index f01f8cec..e2b35b1a 100644
--- a/crates/hennery-host/src/session.rs
+++ b/crates/hennery-host/src/session.rs
@@ -384,7 +384,9 @@ pub fn resume(
 /// Spawn a session actor for `launch`: `session/new` or `session/load`,
 /// then its config. Otherwise like [`spawn`].
 pub fn launch(uplink: Uplink, launch: Launch, options: SessionOptions) -> SessionHandle {
-    launch_inner(uplink, launch, options, None, None)
+    // Ordinary attachments use generation zero; automatic delegation resumes
+    // allocate positive generations and still require fresh read-back.
+    launch_inner(uplink, launch, options, Some(0), None)
 }
 
 pub fn launch_delegated(
diff --git a/crates/hennery-sessions/src/delegation_delivery.rs b/crates/hennery-sessions/src/delegation_delivery.rs
new file mode 100644
index 00000000..c57bf6e6
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_delivery.rs
@@ -0,0 +1,194 @@
+//! Durable reverse delivery. Source facts and notices commit together; only
+//! matching turn facts acknowledge delivery. All content is read from the log.
+use anyhow::Result;
+use hennery_proto::{plugin::InputOrigin, rest::EventDto};
+use rusqlite::{OptionalExtension, Transaction, params};
+
+/// Called for applied host facts and collector facts in their own transaction.
+pub(crate) fn record_in(tx: &Transaction<'_>, owner: &str, event: &EventDto) -> Result<()> {
+    let pending = event.body.get("pending_id").and_then(serde_json::Value::as_str);
+    let reason = event.body.get("reason").and_then(serde_json::Value::as_str);
+    let turn = event.body.get("turn_id").and_then(serde_json::Value::as_str);
+    let loss = matches!(event.kind.as_str(), "adapter_exited" | "host_restarted")
+        || event.kind == "presumed_parked" && reason == Some("host_revoked")
+        || event.kind == "session_parked" && reason == Some("adapter_exited")
+        || event.kind == "turn_ended_synthesized"
+        || event.kind == "pending_cancelled"
+            && matches!(
+                reason,
+                Some("adapter_lost" | "host_restarted" | "host_revoked" | "session_parked")
+            );
+    let kind = if loss {
+        "session_unavailable"
+    } else {
+        match event.kind.as_str() {
+            "answer_submitted" => {
+                obsolete_in(tx, owner, &event.session_id, pending)?;
+                return Ok(());
+            }
+            "turn_ended" => "turn_ended",
+            "pending_opened" => "question",
+            "pending_resolved" | "pending_cancelled" => {
+                obsolete_in(tx, owner, &event.session_id, pending)?;
+                if event.body["resolution"] == "delivered" {
+                    return Ok(());
+                }
+                "question_cancelled"
+            }
+            "start_failed" | "start_not_delivered" => "session_failed",
+            _ => return Ok(()),
+        }
+    };
+    if loss {
+        obsolete_in(tx, owner, &event.session_id, None)?;
+    }
+    let family: Option<(String, String, String, i64, bool, String)> = tx
+        .query_row(
+            "SELECT f.parent_id,f.root_id,f.hat_id,g.revision,
+         f.detached = 0 AND p.close_requested = 0 AND p.lifecycle IN ('starting','active','parked')
+         AND g.delegation_enabled = 1 AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id,
+         json_object('model',p.model,'mode',p.mode,'axes',json(COALESCE(p.config_axes,json_object())))
+         FROM session_families f JOIN sessions p ON p.owner_id = ?1 AND p.id = f.parent_id
+         JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
+         JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = f.hat_id
+         WHERE f.owner_id = ?1 AND f.child_id = ?2",
+            params![owner, event.session_id],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
+        )
+        .optional()?;
+    let Some((parent, root, hat, revision, eligible, required)) = family else {
+        return Ok(());
+    };
+    let attach:i64 = tx.query_row("SELECT COALESCE(MAX(event_id),0) FROM events WHERE owner_id = ?1 AND session_id = ?2 AND kind = 'session_started' AND applied = 1", params![owner,event.session_id],|r|r.get(0))?;
+    let incident = if loss {
+        format!("loss:{attach}")
+    } else if kind == "session_failed" {
+        let generation:i64=tx.query_row("SELECT COALESCE((SELECT attach_generation FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2),0)",params![owner,event.session_id],|r|r.get(0))?;
+        format!("failure:{attach}:{generation}")
+    } else {
+        format!("{}:{}", event.event_id, kind)
+    };
+    let permission = kind == "question" && tx.query_row("SELECT EXISTS(SELECT 1 FROM pending WHERE owner_id = ?1 AND session_id = ?2 AND pending_id = ?3 AND kind = 'permission')",params![owner,event.session_id,pending],|r|r.get::<_,bool>(0))?;
+    let queued:i64 = tx.query_row("SELECT COUNT(*) FROM delegation_notices WHERE owner_id = ?1 AND parent_id = ?2 AND state IN ('parent_queued','waiting_config')",params![owner,parent],|r|r.get(0))?;
+    let disposition = if !eligible {
+        Some("parent_unavailable")
+    } else if permission {
+        Some("operator_required")
+    } else if queued >= 32 {
+        Some("queue_full")
+    } else {
+        None
+    };
+    let now = hennery_kernel::secret::unix_now();
+    tx.execute("INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,
+        source_event_id,source_events,kind,source_turn,pending_id,incident,accepted_revision,created_at,deadline,state,reason,required_config)
+        VALUES (?1,?2,?3,?4,?5,?6,?7,json_array(?7),?8,?9,?10,?11,?12,?13,?13+300,?14,?15,?16)
+        ON CONFLICT(owner_id,child_id,incident) DO UPDATE SET
+        source_events = CASE WHEN instr(',' || trim(delegation_notices.source_events,'[]') || ',', ',' || CAST(?7 AS TEXT) || ',') = 0
+            THEN json_insert(delegation_notices.source_events,'$[#]',?7) ELSE delegation_notices.source_events END,
+        source_turn = COALESCE(delegation_notices.source_turn,excluded.source_turn)
+        WHERE delegation_notices.owner_id = ?1 AND json_array_length(delegation_notices.source_events) < 128",
+        params![owner,uuid::Uuid::now_v7().to_string(),event.session_id,parent,root,hat,event.event_id,kind,turn,pending,incident,revision,now,
+        if disposition.is_some(){"operator_required"}else{"parent_queued"},disposition,required])?;
+    Ok(())
+}
+
+fn obsolete_in(tx: &Transaction<'_>, owner: &str, child: &str, pending: Option<&str>) -> Result<()> {
+    tx.execute(
+        "UPDATE delegation_notices SET state = 'obsolete',reason = 'question_unavailable'
+        WHERE owner_id = ?1 AND child_id = ?2 AND kind = 'question' AND (?3 IS NULL OR pending_id = ?3)
+        AND state IN ('parent_queued','waiting_config','operator_required','parent_delivered')",
+        params![owner, child, pending],
+    )?;
+    Ok(())
+}
+
+impl crate::store::Store {
+    pub(crate) fn record_delegation_failure_in(&self, tx: &Transaction<'_>, session: &str, code: &str) -> Result<()> {
+        let child: bool = tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM session_families WHERE owner_id = ?1 AND child_id = ?2)",
+            params![self.owner_id(), session],
+            |r| r.get(0),
+        )?;
+        if child {
+            crate::store::collector_event(
+                tx,
+                self.owner_id(),
+                session,
+                "start_failed",
+                serde_json::json!({"code":code}),
+                &crate::store::now(),
+            )?;
+        }
+        Ok(())
+    }
+    /// C1 validates server-written provenance against this durable association.
+    pub(crate) fn verified_child_report_in(
+        &self,
+        tx: &Transaction<'_>,
+        origin: &InputOrigin,
+        target: &str,
+        turn: &str,
+    ) -> Result<bool> {
+        let InputOrigin::ChildReport {
+            child_id,
+            source_event_id,
+            delivery_id,
+        } = origin
+        else {
+            return Ok(false);
+        };
+        Ok(tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM delegation_notices WHERE owner_id = ?1 AND delivery_id = ?2
+            AND child_id = ?3 AND parent_id = ?4 AND target_turn = ?5 AND CAST(source_event_id AS TEXT) = ?6)",
+            params![self.owner_id(), delivery_id, child_id, target, turn, source_event_id],
+            |r| r.get(0),
+        )?)
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    #[test]
+    fn child_report_provenance_requires_every_committed_delivery_reference() {
+        let store = crate::store::Store::open_in_memory().unwrap();
+        for id in ["parent", "child"] {
+            store
+                .create_session(id, "host", "fake", "/project", "hat", None)
+                .unwrap();
+        }
+        let mut conn = store.conn();
+        let tx = conn.transaction().unwrap();
+        tx.execute(
+            "INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,
+            source_events,kind,incident,accepted_revision,created_at,deadline,required_config,target_turn)
+            VALUES (?1,'delivery','child','parent','parent','hat',7,'[7]','turn_ended','incident',1,1,301,?2,'turn')",
+            params![store.owner_id(), "{}"],
+        )
+        .unwrap();
+        let origin = |child: &str, event: &str, delivery: &str| InputOrigin::ChildReport {
+            child_id: child.into(),
+            source_event_id: event.into(),
+            delivery_id: delivery.into(),
+        };
+        assert!(
+            store
+                .verified_child_report_in(&tx, &origin("child", "7", "delivery"), "parent", "turn")
+                .unwrap()
+        );
+        for (child, event, delivery, parent, turn) in [
+            ("other", "7", "delivery", "parent", "turn"),
+            ("child", "8", "delivery", "parent", "turn"),
+            ("child", "7", "other", "parent", "turn"),
+            ("child", "7", "delivery", "other", "turn"),
+            ("child", "7", "delivery", "parent", "other"),
+        ] {
+            assert!(
+                !store
+                    .verified_child_report_in(&tx, &origin(child, event, delivery), parent, turn)
+                    .unwrap()
+            );
+        }
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_delivery.sql b/crates/hennery-sessions/src/delegation_delivery.sql
new file mode 100644
index 00000000..135b2462
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_delivery.sql
@@ -0,0 +1,42 @@
+-- Sessions migration 19: source references and reverse-delivery reservations.
+CREATE TABLE delegation_notices (
+    owner_id TEXT NOT NULL, delivery_id TEXT NOT NULL, child_id TEXT NOT NULL,
+    parent_id TEXT NOT NULL, root_id TEXT NOT NULL, hat_id TEXT NOT NULL,
+    source_event_id INTEGER NOT NULL, source_events TEXT NOT NULL,
+    kind TEXT NOT NULL, source_turn TEXT, pending_id TEXT, incident TEXT NOT NULL,
+    accepted_revision INTEGER NOT NULL, created_at INTEGER NOT NULL, deadline INTEGER NOT NULL,
+    state TEXT NOT NULL DEFAULT 'parent_queued', reason TEXT,
+    target_turn TEXT, required_config TEXT NOT NULL,
+    PRIMARY KEY(owner_id,delivery_id), UNIQUE(owner_id,child_id,incident),
+    FOREIGN KEY(child_id,owner_id) REFERENCES sessions(id,owner_id),
+    FOREIGN KEY(parent_id,owner_id) REFERENCES sessions(id,owner_id),
+    FOREIGN KEY(root_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE INDEX delegation_notice_ready ON delegation_notices(owner_id,parent_id,state,source_event_id);
+CREATE INDEX delegation_notice_pending ON delegation_notices(owner_id,child_id,pending_id);
+CREATE TABLE delegation_budgets (
+    owner_id TEXT NOT NULL, root_id TEXT NOT NULL, epoch INTEGER NOT NULL,
+    wakes INTEGER NOT NULL CHECK(wakes >= 0 AND wakes <= 20),
+    PRIMARY KEY(owner_id,root_id,epoch),
+    FOREIGN KEY(root_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE TRIGGER notice_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
+WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
+BEGIN
+    UPDATE delegation_notices SET state = 'operator_required',reason = 'endpoint_unavailable'
+    WHERE owner_id = NEW.owner_id AND (parent_id = NEW.id OR (child_id = NEW.id AND NEW.lifecycle <> 'failed'))
+      AND state IN ('parent_queued','waiting_config');
+    DELETE FROM delegation_notices WHERE owner_id = NEW.owner_id
+      AND (child_id = NEW.id OR parent_id = NEW.id) AND NEW.lifecycle = 'deleted';
+    DELETE FROM delegation_budgets WHERE owner_id = NEW.owner_id AND root_id = NEW.id AND NEW.lifecycle = 'deleted';
+END;
+CREATE TRIGGER notice_family_end AFTER UPDATE OF detached ON session_families WHEN NEW.detached = 1
+BEGIN
+    UPDATE delegation_notices SET state = 'operator_required',reason = 'family_detached'
+    WHERE owner_id = NEW.owner_id AND child_id = NEW.child_id AND parent_id = NEW.parent_id
+      AND state IN ('parent_queued','waiting_config');
+END;
+CREATE TRIGGER notice_grant_end AFTER UPDATE OF revision ON hat_session_tools
+BEGIN
+    UPDATE delegation_notices SET state = 'operator_required',reason = 'grant_changed'
+    WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id
+      AND state IN ('parent_queued','waiting_config');
+END;
diff --git a/crates/hennery-sessions/src/delegation_delivery_dispatch.rs b/crates/hennery-sessions/src/delegation_delivery_dispatch.rs
new file mode 100644
index 00000000..3184c9e4
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_delivery_dispatch.rs
@@ -0,0 +1,391 @@
+//! Reverse transfers have their own delivery identity and explicit destination;
+//! they share D2's host/config admission, never its parent→child assumptions.
+use crate::{
+    delegation_runtime::{evidence_satisfies, same_hat_in},
+    hub::Hub,
+    store::{McpContext, Store},
+};
+use anyhow::Result;
+use hennery_proto::{
+    delegation_host::{ConfigEvidence, HostCatalog, PromptFence},
+    frames::{Capability, CollectorFrame, SessionConfig},
+    plugin::InputOrigin,
+    rest::EventDto,
+};
+use rusqlite::{OptionalExtension, Transaction, params};
+
+struct Notice {
+    id: String,
+    child: String,
+    parent: String,
+    root: String,
+    hat: String,
+    event: i64,
+    kind: String,
+    turn: Option<String>,
+    pending: Option<String>,
+    revision: i64,
+    required: String,
+}
+fn next_in(tx: &Transaction<'_>, owner: &str, parent: &str) -> Result<Option<Notice>> {
+    Ok(tx.query_row("SELECT delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,kind,source_turn,pending_id,accepted_revision,required_config
+        FROM delegation_notices WHERE owner_id = ?1 AND parent_id = ?2 AND state IN ('parent_queued','waiting_config')
+        ORDER BY source_event_id,delivery_id LIMIT 1",params![owner,parent],|r|Ok(Notice {id:r.get(0)?,child:r.get(1)?,parent:r.get(2)?,root:r.get(3)?,hat:r.get(4)?,event:r.get(5)?,kind:r.get(6)?,turn:r.get(7)?,pending:r.get(8)?,revision:r.get(9)?,required:r.get(10)?})).optional()?)
+}
+fn eligible_in(tx: &Transaction<'_>, owner: &str, n: &Notice) -> Result<bool> {
+    Ok(tx.query_row(
+        "SELECT EXISTS(SELECT 1 FROM session_families f
+        JOIN sessions p ON p.owner_id = ?1 AND p.id = f.parent_id
+        JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
+        JOIN hosts h ON h.owner_id = ?1 AND h.id = p.host_id
+        JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = f.hat_id
+        WHERE f.owner_id = ?1 AND f.child_id = ?2 AND f.parent_id = ?3 AND f.detached = 0
+        AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id AND p.host_id = c.host_id
+        AND p.close_requested = 0 AND c.close_requested = 0 AND p.presumed_parked = 0
+        AND p.lifecycle IN ('active','parked') AND c.lifecycle IN ('starting','active','parked','failed')
+        AND h.revoked_at IS NULL AND g.delegation_enabled = 1 AND g.revision = ?4
+        AND (p.mcp_delivery_mode = 'isolated' OR (p.mcp_delivery_mode = 'unisolated' AND p.hat_id = h.default_hat_id))
+        AND NOT EXISTS(SELECT 1 FROM purged_hats x WHERE x.owner_id = ?1 AND x.hat_id = f.hat_id)
+        AND (?5 <> 'question' OR EXISTS(SELECT 1 FROM pending q WHERE q.owner_id = ?1 AND q.session_id = c.id
+            AND q.pending_id = ?6 AND q.kind = 'elicitation' AND q.state = 'open'
+            AND NOT EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = ?1 AND a.pending_id = q.pending_id))))",
+        params![owner, n.child, n.parent, n.revision, n.kind, n.pending],
+        |r| r.get(0),
+    )?)
+}
+
+impl Store {
+    pub fn attach_notice_parent(
+        &self,
+        parent: &str,
+        mcp: McpContext,
+        catalog: &HostCatalog,
+        hub: &Hub,
+    ) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        self.settle_notices_in(&tx)?;
+        let Some(n) = next_in(&tx, self.owner_id(), parent)? else {
+            tx.commit()?;
+            return Ok(false);
+        };
+        if !eligible_in(&tx, self.owner_id(), &n)? {
+            tx.commit()?;
+            return Ok(false);
+        }
+        let (host,agent,cwd,agent_session,parked):(String,String,String,Option<String>,bool)=tx.query_row(
+            "SELECT host_id,agent,cwd,agent_session_id,lifecycle = 'parked' AND presumed_parked = 0 AND close_requested = 0
+             FROM sessions WHERE owner_id = ?1 AND id = ?2",params![self.owner_id(),parent],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?)))?;
+        let config: SessionConfig = serde_json::from_str(&n.required)?;
+        if !parked
+            || agent_session.is_none()
+            || catalog.agent != agent
+            || !hub.is_ready(&host)
+            || !hub.has_capability(&host, Capability::DelegationConfig)
+            || !same_hat_in(&tx, self.owner_id(), &host, &n.hat, &cwd)?
+            || !crate::delegation_runtime::security_allowed(catalog, &self.execution_policy_in(&tx, &n.hat)?, &config)
+        {
+            tx.commit()?;
+            return Ok(false);
+        }
+        let generation:i64=tx.query_row("SELECT COALESCE((SELECT attach_generation FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2),0)+1",params![self.owner_id(),parent],|r|r.get(0))?;
+        let changed = tx.execute(
+            "UPDATE sessions SET lifecycle = 'starting',activity = NULL WHERE owner_id = ?1 AND id = ?2
+            AND lifecycle = 'parked' AND presumed_parked = 0 AND close_requested = 0",
+            params![self.owner_id(), parent],
+        )?;
+        if changed != 1 {
+            return Ok(false);
+        }
+        let request = uuid::Uuid::now_v7().to_string();
+        tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config,launch_sent,request_id)
+            VALUES (?1,?2,?3,?4,1,?5) ON CONFLICT(owner_id,session_id) DO UPDATE SET attach_generation = excluded.attach_generation,
+            requested_config = excluded.requested_config,config_revision = 0,evidence = NULL,launch_sent = 1,request_id = excluded.request_id
+            WHERE session_attach_evidence.owner_id = ?1",params![self.owner_id(),parent,generation,n.required,request])?;
+        tx.execute("UPDATE delegation_notices SET state = 'waiting_config' WHERE owner_id = ?1 AND parent_id = ?2 AND state = 'parent_queued'",params![self.owner_id(),parent])?;
+        let committed: i64 = tx.query_row(
+            "SELECT COALESCE(MAX(host_seq),0) FROM events WHERE owner_id = ?1 AND session_id = ?2",
+            params![self.owner_id(), parent],
+            |r| r.get(0),
+        )?;
+        let (given, cut) = self.deliver_in(&tx, parent, &host, &n.hat, mcp, &crate::store::now())?;
+        let frame = CollectorFrame::DelegatedAttach {
+            request_id: request,
+            session_id: parent.into(),
+            committed_seq: u64::try_from(committed)?,
+            agent,
+            cwd,
+            config,
+            hat_id: n.hat,
+            mcp: given.frame(),
+            attach_generation: u64::try_from(generation)?,
+            agent_session_id: agent_session,
+        };
+        crate::store::commit_then_cut(tx, self.mcp().as_ref(), cut)?;
+        if !self.handoff_delegated(&conn, parent, &host, frame, hub)? {
+            conn.execute("UPDATE sessions SET lifecycle = 'parked' WHERE owner_id = ?1 AND id = ?2 AND lifecycle = 'starting' AND close_requested = 0",params![self.owner_id(),parent])?;
+            conn.execute(
+                "UPDATE session_attach_evidence SET launch_sent = 0 WHERE owner_id = ?1 AND session_id = ?2",
+                params![self.owner_id(), parent],
+            )?;
+            return Ok(false);
+        }
+        Ok(true)
+    }
+    pub fn notice_parents_after(&self, after: &str) -> Result<Vec<String>> {
+        let conn = self.conn();
+        let mut stmt = conn.prepare(
+            "SELECT DISTINCT parent_id FROM delegation_notices WHERE owner_id = ?1 AND parent_id > ?2
+            AND state IN ('parent_queued','waiting_config') ORDER BY parent_id LIMIT 128",
+        )?;
+        Ok(stmt
+            .query_map(params![self.owner_id(), after], |r| r.get(0))?
+            .collect::<rusqlite::Result<_>>()?)
+    }
+    pub(crate) fn settle_notices_in(&self, tx: &Transaction<'_>) -> Result<()> {
+        tx.execute(
+            "UPDATE delegation_notices SET state = 'parent_delivered',reason = NULL
+            WHERE owner_id = ?1 AND target_turn IS NOT NULL AND state IN ('awaiting_reconciliation','operator_required')
+            AND EXISTS(SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.session_id = delegation_notices.parent_id
+                AND t.turn_id = delegation_notices.target_turn AND t.state IN ('started','ended'))",
+            [self.owner_id()],
+        )?;
+        tx.execute("UPDATE delegation_notices SET state = 'operator_required',reason = 'not_delivered'
+            WHERE owner_id = ?1 AND state = 'awaiting_reconciliation'
+            AND EXISTS(SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = delegation_notices.target_turn AND t.state = 'not_delivered')",[self.owner_id()])?;
+        tx.execute("UPDATE delegation_notices SET state = 'obsolete',reason = 'question_resolved'
+            WHERE owner_id = ?1 AND kind = 'question' AND state IN ('parent_queued','waiting_config','parent_delivered','operator_required')
+            AND (NOT EXISTS(SELECT 1 FROM pending p WHERE p.owner_id = ?1 AND p.session_id = delegation_notices.child_id
+                AND p.pending_id = delegation_notices.pending_id AND p.state = 'open')
+            OR EXISTS(SELECT 1 FROM answer_queue a WHERE a.owner_id = ?1 AND a.session_id = delegation_notices.child_id
+                AND a.pending_id = delegation_notices.pending_id))",[self.owner_id()])?;
+        Ok(())
+    }
+    pub fn dispatch_child_notice(&self, parent: &str, catalog: &HostCatalog, hub: &Hub) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        self.settle_notices_in(&tx)?;
+        let Some(n) = next_in(&tx, self.owner_id(), parent)? else {
+            tx.commit()?;
+            return Ok(false);
+        };
+        if !eligible_in(&tx, self.owner_id(), &n)? {
+            tx.commit()?;
+            return Ok(false);
+        }
+        let (host,agent,cwd,available):(String,String,String,bool)=tx.query_row("SELECT host_id,agent,cwd,
+            lifecycle = 'active' AND open_turn_id IS NULL AND COALESCE(activity,'idle') <> 'blocked'
+            AND NOT EXISTS(SELECT 1 FROM pending q WHERE q.owner_id = ?1 AND q.session_id = sessions.id AND q.state = 'open')
+            FROM sessions WHERE owner_id = ?1 AND id = ?2",params![self.owner_id(),parent],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))?;
+        if !available
+            || catalog.agent != agent
+            || !hub.is_ready(&host)
+            || !hub.has_capability(&host, Capability::DelegationConfig)
+            || !same_hat_in(&tx, self.owner_id(), &host, &n.hat, &cwd)?
+        {
+            tx.commit()?;
+            return Ok(false);
+        }
+        let proof: Option<(i64, String)> = tx
+            .query_row(
+                "SELECT attach_generation,evidence FROM session_attach_evidence
+            WHERE owner_id = ?1 AND session_id = ?2 AND evidence IS NOT NULL",
+                params![self.owner_id(), parent],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .optional()?;
+        let Some((generation, proof)) = proof else {
+            tx.commit()?;
+            return Ok(false);
+        };
+        let evidence: ConfigEvidence = serde_json::from_str(&proof)?;
+        let required: SessionConfig = serde_json::from_str(&n.required)?;
+        if !evidence_satisfies(
+            &evidence,
+            u64::try_from(generation)?,
+            &required,
+            catalog,
+            &self.execution_policy_in(&tx, &n.hat)?,
+        ) {
+            tx.execute("UPDATE delegation_notices SET state = 'waiting_config',reason = 'config_unverified' WHERE owner_id = ?1 AND delivery_id = ?2",params![self.owner_id(),n.id])?;
+            tx.commit()?;
+            return Ok(false);
+        }
+        let epoch:i64=tx.query_row("SELECT COALESCE(MAX(event_id),0) FROM events WHERE owner_id = ?1 AND session_id = ?2
+            AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'",params![self.owner_id(),n.root],|r|r.get(0))?;
+        let spent:i64=tx.query_row("SELECT COALESCE((SELECT wakes FROM delegation_budgets WHERE owner_id = ?1 AND root_id = ?2 AND epoch = ?3),0)",params![self.owner_id(),n.root,epoch],|r|r.get(0))?;
+        if spent >= 20 {
+            tx.execute("UPDATE delegation_notices SET state = 'operator_required',reason = 'wake_budget' WHERE owner_id = ?1 AND delivery_id = ?2",params![self.owner_id(),n.id])?;
+            tx.commit()?;
+            return Ok(false);
+        }
+        let text = report_in(&tx, self.owner_id(), &n)?;
+        let content = vec![serde_json::json!({"type":"text","text":text})];
+        let turn = uuid::Uuid::now_v7().to_string();
+        let origin = InputOrigin::ChildReport {
+            child_id: n.child.clone(),
+            source_event_id: n.event.to_string(),
+            delivery_id: n.id.clone(),
+        };
+        tx.execute(
+            "INSERT INTO delegation_budgets(owner_id,root_id,epoch,wakes) VALUES (?1,?2,?3,1)
+            ON CONFLICT(owner_id,root_id,epoch) DO UPDATE SET wakes = wakes + 1 WHERE delegation_budgets.owner_id = ?1",
+            params![self.owner_id(), n.root, epoch],
+        )?;
+        tx.execute("UPDATE sessions SET open_turn_id = ?3 WHERE owner_id = ?1 AND id = ?2 AND open_turn_id IS NULL AND close_requested = 0",params![self.owner_id(),parent,turn])?;
+        tx.execute(
+            "INSERT INTO turns(owner_id,turn_id,session_id,content,created_at,input_origin) VALUES (?1,?2,?3,?4,?5,?6)",
+            params![
+                self.owner_id(),
+                turn,
+                parent,
+                serde_json::to_string(&content)?,
+                crate::store::now(),
+                serde_json::to_string(&origin)?
+            ],
+        )?;
+        tx.execute("UPDATE delegation_notices SET state = 'awaiting_reconciliation',target_turn = ?3,reason = NULL WHERE owner_id = ?1 AND delivery_id = ?2",params![self.owner_id(),n.id,turn])?;
+        let frame = CollectorFrame::DelegatedPrompt {
+            request_id: n.id.clone(),
+            session_id: parent.into(),
+            turn_id: turn.clone(),
+            content,
+            expected: PromptFence {
+                attach_generation: u64::try_from(generation)?,
+                config_revision: evidence.config_revision,
+            },
+        };
+        tx.commit()?;
+        // Retain the owner gate through handoff: neither endpoint can close in
+        // the gap. No asynchronous claim exists for an expired lease to steal.
+        if !self.handoff_delegated(&conn, parent, &host, frame, hub)? {
+            let tx = conn.transaction()?;
+            tx.execute(
+                "UPDATE sessions SET open_turn_id = NULL WHERE owner_id = ?1 AND id = ?2 AND open_turn_id = ?3",
+                params![self.owner_id(), parent, turn],
+            )?;
+            tx.execute(
+                "DELETE FROM turns WHERE owner_id = ?1 AND turn_id = ?2 AND state = 'sent'",
+                params![self.owner_id(), turn],
+            )?;
+            tx.execute("UPDATE delegation_notices SET state = 'parent_queued',target_turn = NULL WHERE owner_id = ?1 AND delivery_id = ?2",params![self.owner_id(),n.id])?;
+            tx.execute(
+                "UPDATE delegation_budgets SET wakes = wakes - 1 WHERE owner_id = ?1 AND root_id = ?2 AND epoch = ?3",
+                params![self.owner_id(), n.root, epoch],
+            )?;
+            tx.commit()?;
+            return Ok(false);
+        }
+        Ok(true)
+    }
+    pub(crate) fn reject_child_notice(&self, host: &str, request: &str) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let target: Option<(String, String)> = tx
+            .query_row(
+                "SELECT n.parent_id,n.target_turn FROM delegation_notices n
+            JOIN sessions s ON s.owner_id = ?1 AND s.id = n.parent_id
+            WHERE n.owner_id = ?1 AND n.delivery_id = ?2 AND s.host_id = ?3 AND n.state = 'awaiting_reconciliation'",
+                params![self.owner_id(), request, host],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .optional()?;
+        let Some((parent, turn)) = target else { return Ok(false) };
+        tx.execute(
+            "UPDATE turns SET state = 'not_delivered' WHERE owner_id = ?1 AND turn_id = ?2 AND state = 'sent'",
+            params![self.owner_id(), turn],
+        )?;
+        tx.execute(
+            "UPDATE sessions SET open_turn_id = NULL WHERE owner_id = ?1 AND id = ?2 AND open_turn_id = ?3
+            AND EXISTS(SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = ?3 AND t.state = 'not_delivered')",
+            params![self.owner_id(), parent, turn],
+        )?;
+        self.settle_notices_in(&tx)?;
+        tx.commit()?;
+        Ok(true)
+    }
+}
+
+fn tail(text: &str, bytes: usize) -> &str {
+    let mut start = text.len().saturating_sub(bytes);
+    while !text.is_char_boundary(start) {
+        start += 1;
+    }
+    &text[start..]
+}
+fn report_in(tx: &Transaction<'_>, owner: &str, n: &Notice) -> Result<String> {
+    let start:i64=tx.query_row("SELECT COALESCE(MAX(event_id),0) FROM events WHERE owner_id = ?1 AND session_id = ?2
+        AND kind = 'user_turn' AND applied = 1 AND event_id <= ?3 AND (?4 IS NULL OR json_extract(body,'$.turn_id') = ?4)",params![owner,n.child,n.event,n.turn],|r|r.get(0))?;
+    let mut stmt = tx.prepare(
+        "SELECT event_id,host_seq,kind,body,ts FROM events WHERE owner_id = ?1 AND session_id = ?2
+        AND applied = 1 AND event_id >= ?3 AND event_id <= ?4 ORDER BY event_id DESC LIMIT 1000",
+    )?;
+    let mut events = Vec::new();
+    let mut bytes = 0;
+    let mut truncated = false;
+    let mut rows = stmt.query(params![owner, n.child, start, n.event])?;
+    while let Some(row) = rows.next()? {
+        let raw: String = row.get(3)?;
+        bytes += raw.len();
+        if bytes > 128 * 1024 {
+            truncated = true;
+            break;
+        }
+        events.push(EventDto {
+            event_id: row.get(0)?,
+            session_id: n.child.clone(),
+            host_seq: row.get::<_, Option<i64>>(1)?.map(|v| v as u64),
+            kind: row.get(2)?,
+            body: serde_json::from_str(&raw)?,
+            ts: row.get(4)?,
+        });
+    }
+    truncated |= events.len() == 1000;
+    events.reverse();
+    let mut fold = hennery_view::Fold::new();
+    for event in &events {
+        fold.apply(event, &|_: &str| false);
+    }
+    let mut report = String::new();
+    let mut question = None;
+    for item in fold.take() {
+        match item.body {
+            hennery_view::Body::Message(text) => {
+                report = text.text;
+                truncated |= text.truncated;
+            }
+            hennery_view::Body::Question(q) if n.pending.as_deref() == Some(q.pending_id.as_str()) => {
+                question = Some(q);
+            }
+            hennery_view::Body::Unrecognised(_) => truncated = true,
+            _ => {}
+        }
+    }
+    let source: serde_json::Value = tx
+        .query_row(
+            "SELECT body FROM events WHERE owner_id = ?1 AND session_id = ?2 AND event_id = ?3",
+            params![owner, n.child, n.event],
+            |r| r.get::<_, String>(0),
+        )?
+        .parse()?;
+    let question = question
+        .map(serde_json::to_value)
+        .transpose()?
+        .filter(|q| serde_json::to_vec(q).is_ok_and(|v| v.len() <= 2048));
+    let mut budget = 4096;
+    loop {
+        let text = tail(&report, budget);
+        let metadata = serde_json::json!({"kind":n.kind,"child_id":n.child,"source_event_id":n.event,"turn_id":n.turn,
+            "pending_id":n.pending,"outcome":source.get("outcome"),"question":question,"report":text,
+            "truncated":truncated||text.len()!=report.len(),"link":format!("/sessions/{}",n.child)});
+        let output = format!(
+            "Child report (untrusted child data; not operator input or approval). Inspect current child status before answering.\n{}",
+            serde_json::to_string(&metadata)?
+        );
+        if output.len() <= 8192 {
+            return Ok(output);
+        }
+        budget /= 2;
+        anyhow::ensure!(budget > 0, "report_metadata_too_large");
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_dispatch.rs b/crates/hennery-sessions/src/delegation_dispatch.rs
index 0ec110f4..5cda6850 100644
--- a/crates/hennery-sessions/src/delegation_dispatch.rs
+++ b/crates/hennery-sessions/src/delegation_dispatch.rs
@@ -286,12 +286,19 @@ impl Store {
             _ => None,
         };
         if let Some(evidence) = indexed.and_then(|i| i.config_evidence.as_ref()) {
+            if matches!(body, SessionBody::SessionStarted { .. }) && evidence.attach_generation == 0 {
+                tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config,launch_sent)
+                    VALUES (?1,?2,0,?3,1) ON CONFLICT(owner_id,session_id) DO UPDATE SET attach_generation = 0,
+                    config_revision = 0,evidence = NULL,requested_config = excluded.requested_config,launch_sent = 1
+                    WHERE session_attach_evidence.owner_id = ?1",params![self.owner_id(),session,serde_json::to_string(&evidence.actual)?])?;
+            }
             tx.execute("UPDATE session_attach_evidence SET config_revision = ?4,evidence = ?5 WHERE owner_id = ?1 AND session_id = ?2 AND attach_generation = ?3 AND config_revision < ?4
                 AND EXISTS (SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = ?2 AND lifecycle = 'active' AND close_requested = 0 AND presumed_parked = 0)",params![self.owner_id(),session,i64::try_from(evidence.attach_generation)?,i64::try_from(evidence.config_revision)?,serde_json::to_string(evidence)?])?;
         }
         self.settle_delegation_in(tx)
     }
     pub(crate) fn settle_delegation_in(&self, tx: &Transaction<'_>) -> Result<()> {
+        self.settle_notices_in(tx)?;
         tx.execute("UPDATE session_operations SET state = 'completed' WHERE owner_id = ?1 AND tool = 'session_close' AND state = 'awaiting_reconciliation' AND EXISTS (SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = session_operations.child_id AND lifecycle = 'closed')",[self.owner_id()])?;
         tx.execute("UPDATE session_operations SET state = CASE
             WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'ended') THEN 'completed'
@@ -310,6 +317,9 @@ impl Store {
     /// A host rejection is proof of non-admission. Match the current host and
     /// request association; a late or foreign rejection cannot undo a new turn.
     pub fn reject_delegation(&self, host: &str, request: &str) -> Result<bool> {
+        if self.reject_child_notice(host, request)? {
+            return Ok(true);
+        }
         let mut conn = self.conn();
         let tx = conn.transaction()?;
         let target:Option<String>=tx.query_row("SELECT e.session_id FROM session_attach_evidence e JOIN sessions s ON s.owner_id = ?1 AND s.id = e.session_id
diff --git a/crates/hennery-sessions/src/delegation_worker.rs b/crates/hennery-sessions/src/delegation_worker.rs
index a8f59dcc..7a3b46ff 100644
--- a/crates/hennery-sessions/src/delegation_worker.rs
+++ b/crates/hennery-sessions/src/delegation_worker.rs
@@ -1,11 +1,11 @@
-//! D2 drains parent commands only. D3 will produce durable child notices and
-//! operator attention, then reuse these same transfer/config/close gates.
+//! Bounded fair draining of accepted parent commands and child notices.
 use crate::{AppState, delegation_runtime::checked_cwd};
 use std::time::Duration;
 #[derive(Default)]
 struct Cursors {
     prompts: String,
     answers: String,
+    notices: String,
 }
 pub fn after_startup(state: &AppState) {
     let state = state.clone();
@@ -28,8 +28,13 @@ async fn drain_page(state: &AppState, cursors: &mut Cursors) -> anyhow::Result<(
         .store
         .dispatch_delegation_answers_after(&state.hub, &cursors.answers)?
         .unwrap_or_default();
-    let targets = state.store.delegation_targets_after(&cursors.prompts)?;
+    let mut targets = state.store.delegation_targets_after(&cursors.prompts)?;
     cursors.prompts = targets.last().cloned().unwrap_or_default();
+    let parents = state.store.notice_parents_after(&cursors.notices)?;
+    cursors.notices = parents.last().cloned().unwrap_or_default();
+    targets.extend(parents);
+    targets.sort();
+    targets.dedup();
     for target in targets {
         let Some(session) = state.store.find_session(&target)? else {
             continue;
@@ -50,9 +55,11 @@ async fn drain_page(state: &AppState, cursors: &mut Cursors) -> anyhow::Result<(
             if session.lifecycle == "active" {
                 let catalog = state.store.attached_delegation_catalog(&target, &catalog)?;
                 state.store.dispatch_delegated(&target, &catalog, &state.hub)?;
+                state.store.dispatch_child_notice(&target, &catalog, &state.hub)?;
             } else {
                 let mcp = crate::api::mcp_context(state, &session.host_id, &session.agent)?;
                 state.store.attach_delegated(&target, mcp, &catalog, &state.hub)?;
+                state.store.attach_notice_parent(&target, mcp, &catalog, &state.hub)?;
             }
             Ok::<_, anyhow::Error>(())
         };
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index 628918ce..9d35a185 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -7,6 +7,8 @@ pub mod content;
 pub mod delegation;
 pub mod delegation_api;
 pub mod delegation_control;
+pub mod delegation_delivery;
+pub mod delegation_delivery_dispatch;
 pub mod delegation_dispatch;
 pub mod delegation_queue;
 pub mod delegation_runtime;
diff --git a/crates/hennery-sessions/src/plugin.rs b/crates/hennery-sessions/src/plugin.rs
index 4694802b..b5458bfb 100644
--- a/crates/hennery-sessions/src/plugin.rs
+++ b/crates/hennery-sessions/src/plugin.rs
@@ -351,7 +351,7 @@ impl Store {
         match origin {
             InputOrigin::Operator {}=>Ok(true),
             InputOrigin::Parent {session_id,operation_id}=>Ok(tx.query_row("SELECT EXISTS(SELECT 1 FROM session_operations WHERE owner_id = ?1 AND operation_id = ?2 AND caller_id = ?3 AND child_id = ?4 AND turn_id = ?5 AND tool IN ('session_send','session_spawn'))",params![self.owner_id(),operation_id,session_id,target,turn],|r|r.get(0))?),
-            InputOrigin::ChildReport {..}=>Ok(false),
+            InputOrigin::ChildReport {..}=>self.verified_child_report_in(tx,origin,target,turn),
         }
     }
 }
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index 16448a9b..a30c1bdc 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -372,6 +372,7 @@ const MIGRATIONS: &[&str] = &[
     END;
     ",
     include_str!("delegation_schema.sql"),
+    include_str!("delegation_delivery.sql"),
 ];
 
 /// The most distinct (agent session id, roots) pairs a session records
@@ -876,14 +877,16 @@ pub(crate) fn collector_event(
         "UPDATE sessions SET last_event_at = ?2, last_event_id = ?3 WHERE id = ?1 AND owner_id = ?4",
         params![session_id, ts, event_id, owner],
     )?;
-    Ok(EventDto {
+    let event = EventDto {
         event_id,
         session_id: session_id.to_string(),
         host_seq: None,
         kind: kind.to_string(),
         body,
         ts: ts.to_string(),
-    })
+    };
+    crate::delegation_delivery::record_in(tx, owner, &event)?;
+    Ok(event)
 }
 
 /// The image blocks of a stored content that name their image, each with
@@ -2156,10 +2159,12 @@ impl Store {
         let tx = conn.transaction()?;
         let failed = tx.execute(
             "UPDATE sessions SET lifecycle = 'failed', failure_reason = ?2
-             WHERE id = ?1 AND lifecycle <> 'deleted' AND owner_id = ?3",
+             WHERE id = ?1 AND lifecycle <> 'deleted' AND owner_id = ?3
+                 AND (lifecycle <> 'failed' OR failure_reason IS NOT ?2)",
             params![id, reason, self.owner],
         )?;
         let cut = if failed == 1 {
+            self.record_delegation_failure_in(&tx, id, reason)?;
             self.mcp().revoke_in(&tx, id)?
         } else {
             Cut::default()
@@ -2182,6 +2187,7 @@ impl Store {
             params![id, reason, self.owner],
         )?;
         let cut = if failed == 1 {
+            self.record_delegation_failure_in(&tx, id, reason)?;
             self.mcp().revoke_in(&tx, id)?
         } else {
             Cut::default()
@@ -4166,6 +4172,9 @@ impl Store {
         };
         if !created.is_empty() {
             self.ingest_delegation_in(&tx, session_id, body)?;
+            for event in &created {
+                crate::delegation_delivery::record_in(&tx, &self.owner, event)?;
+            }
         }
         commit_then_cut(tx, mcp.as_ref(), cut)?;
         Ok(Ingested { events: created, edge })
@@ -4305,6 +4314,7 @@ impl Store {
                 _ => {}
             }
         }
+        self.settle_notices_in(&tx)?;
         commit_then_cut(tx, mcp.as_ref(), cut)?;
         Ok(out)
     }
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
index 6580ca11..df396d62 100644
--- a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
@@ -1,5 +1,10 @@
 -- Test-only rollback of migration 18 before reconstructing a historical schema.
 -- Production migrations remain append-only.
+DROP TRIGGER notice_endpoint_end;
+DROP TRIGGER notice_family_end;
+DROP TRIGGER notice_grant_end;
+DROP TABLE delegation_notices;
+DROP TABLE delegation_budgets;
 DROP TRIGGER delegation_child_identity;
 DROP TRIGGER delegation_child_immutable;
 DROP TRIGGER delegation_endpoint_end;
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index 2aec5087..5502bfc9 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -35,6 +35,16 @@ use std::sync::{Arc, Mutex};
 
 /// The audited sources, and the fewest statements each holds.
 const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-sessions/src/delegation_delivery_dispatch.rs",
+        include_str!("../../hennery-sessions/src/delegation_delivery_dispatch.rs"),
+        34,
+    ),
+    (
+        "hennery-sessions/src/delegation_delivery.rs",
+        include_str!("../../hennery-sessions/src/delegation_delivery.rs"),
+        9,
+    ),
     (
         "hennery-sessions/src/delegation_control.rs",
         include_str!("../../hennery-sessions/src/delegation_control.rs"),
diff --git a/nix/package.nix b/nix/package.nix
index e65fad27..40c8903f 100644
--- a/nix/package.nix
+++ b/nix/package.nix
@@ -18,6 +18,7 @@ let
       (craneLib.fileset.commonCargoSources ../.)
       # Crane's common set omits SQL read by Rust's include_str!.
       ../crates/hennery-sessions/src/delegation_schema.sql
+      ../crates/hennery-sessions/src/delegation_delivery.sql
       ../crates/hennery-sessions/tests/fixtures/undo_delegation.sql
       (lib.fileset.maybeMissing ../adapters/manifest.json)
       (lib.fileset.maybeMissing ../crates/hennery-host/manifest.json)
```

### Task 1, step 3: verification and independent review

- [x] Run all six Rust checks and nix flake check -L. No web gate is required because web/ is untouched.
- [x] Revert-probe source recording, scope/close/config/pending guards, budget accounting, turn/association persistence, factual acknowledgement, loss obsolescence/coalescing, terminal cleanup, C1 references and the scheduler in a scratch COPY. Record each detected mutation and any equivalent/uncovered mutation honestly.
- [x] Run timing-sensitive store/host/HTTP tests with four binaries concurrently, three rounds.
- [x] Replay both nonempty blocks in a FRESH directory on the pinned base; verify expected RED/GREEN exits, positive file count and exact final implementation bytes.
- [x] Check staged bytes contain no probe mutations, author identity and repository rules; commit and push plan/deleg-d3. Ask the parent for independent security and whole-branch review with the SHA range and races above. The parent opens the PR and reports complete status.

### Task 2: record execution

- [x] Add actual command exits, test counts, copy-probe/load and replay evidence below; update docs/README.md. Commit as docs(plan): record D3a delivery execution and push.

The original implementation and execution record were pushed by the parent at 15bd2205, and draft PR #151 was opened. This lane's SSH attempt had exited 128 because the agent refused signing; no alternative publishing route was attempted here. The parent review returned CHANGES, addressed in the amendment below; re-review and complete PR status remain parent-owned.

## After this plan

D3b owns persisted five-minute handling grace, immediate fallback reasons projected as durable operator attention, unresolved delivered-question deadlines, stable-tag hat-scoped push re-enqueue on startup, operator rearming and the remaining delete/reassign/purge races. Phone notifications open the child card; they never answer on the lock screen. These must use canonical routing, not merely parent_id presence. A muted/failed notification cannot erase durable work.

D4 owns family API/UI, factual operator_attention counts, provenance display and the full pinned Claude/Codex cross-runtime acceptance matrix. Keep ordinary delegation preview-gated until D3b and D4 pass; this plan does not ship a polling-only release.

C2 must retain the ordinary generation-zero evidence line and the applied SessionStarted seed when rebasing; automatic delegation resumes use positive generations and the common config/close fence. Startup data remains C2's responsibility, with C1 provenance preserved. The parent coordinates this minimal shared seam and independent review.

## Verification record

All six Rust gates completed with exit **0**. Logs are retained in the lane ledger and under the following temporary prefixes; the trailing EXIT marker is written after the foreground command exits.

| Command (inside nix develop) | Exit | Evidence |
|---|---:|---|
| cargo fmt --all --check | 0 | /tmp/deleg-d3-complete-fmt.log |
| cargo clippy --workspace --all-targets --locked -- -D warnings | 0 | /tmp/deleg-d3-complete-clippy.log |
| cargo clippy -p hennery --locked -- -D warnings | 0 | /tmp/deleg-d3-complete-binary-clippy.log |
| cargo test --workspace --locked | 0 | /tmp/deleg-d3-complete-tests.log: **2,364 passed across 155 suites** |
| cargo run -p hennery-proto --bin gen --locked -- --check | 0 | /tmp/deleg-d3-complete-proto.log |
| cargo run -p hennery-view --bin gen-view --locked -- --check | 0 | /tmp/deleg-d3-complete-view.log |
| nix flake check -L | 0 | /tmp/deleg-d3-flake-complete.log; native macOS checks only |

The separately archived, unmodified D2 baseline passed **2,339 tests across 155 suites** (exit 0, /tmp/deleg-d3-clean-baseline.log): **25 added tests**. Targeted final suites passed: delegation_d2 95, store 104, delegation_host 16, delegation_tools 13 (one pre-existing ignored pinned external-adapter test), host_session 81, owner_filter 3 and the C1 provenance unit test 1. Web files are untouched, so no separate web gate was required. Linux remains parent-owned CI; native Nix omitted incompatible Linux systems explicitly.

The actual automatic HTTP/WebSocket/fake-ACP question→parent→MCP answer→child→completion-report loop passes. A separate real collector test parks the parent and verifies automatic resume and report delivery. The existing scheduler injects prompts; agents need not poll. Operator attention and push are still D3b work; delegation stays preview-gated.

### Copy probes

All mutations ran only in **probe-copy-1**, restoring each source before the next mutation. The first pass detected 40/44 mutations. Three missed assertions were strengthened (collector withdrawal obsolescence, present-but-partial/stale evidence, and explicit detached-family routing). Nine refinement mutations were then detected, including the combined read-bound mutation and five extra effects: **49 effective detected mutations**. Successful baselines and each expected test failure are in probe-initial-results.json, probe-refinement-results.json and their referenced logs.

The original tests did not detect individual source-turn or upper-bound removals; removing both was detected. **Review correction:** the source-turn predicate is redundant under current ordering, but the upper bound is necessary. The reviewer supplied an out-of-turn question followed by an ordinary operator turn; removing the source-event upper bound loses its question projection. That regression and its isolated mutation probe are included in the amendment below. No guard was removed to accommodate a probe.

The ownership mutation was separately rechecked after the audit's correct nine production-statement minimum was established (the tenth INSERT is a cfg(test) fixture, intentionally excluded by the existing scanner). Exact owner audit command: cargo test -p hennery-testkit --test owner_filter --locked. Positive baseline exit 0 (3 tests), owner predicate removal exit 101 with the specific missing-owner assertion. See owner-recheck.json. Existing source minima and audit rules were unchanged.

| Mutation | Test command | Detected exit |
|---|---|---:|
| applied-host-source | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_question_is_transactional` | 101 |
| collector-source | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_collector_reconciliation` | 101 |
| loss-obsolescence | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_loss_obsoletes` | 101 |
| answer-obsolescence | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_operator_answer` | 101 |
| loss-coalescing | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_idle_adapter_loss` | 101 |
| failure-coalescing | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_late_factual` | 101 |
| source-reference-merge | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_idle_adapter_loss` | 101 |
| permission-disposition | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_permission` | 101 |
| unavailable-parent-disposition | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_permission` | 101 |
| queue-cap | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_queue_overflow` | 101 |
| notice-insertion | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_question_is_transactional` | 101 |
| failure-source | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_collector_start_failure` | 101 |
| busy-admission | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_checks` | 101 |
| wake-cap | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_wake_budget` | 101 |
| operator-only-epoch | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_wake_budget` | 101 |
| wake-reservation | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_wake_budget` | 101 |
| turn-reservation | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_reserves` | 101 |
| turn-insertion | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_reserves` | 101 |
| typed-report-origin | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_reserves` | 101 |
| delivery-association | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_reserves` | 101 |
| factual-settlement | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_reserves` | 101 |
| late-acknowledgement | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_restart_keeps` | 101 |
| rejection-disposition | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_restart_keeps` | 101 |
| unsent-turn-cleanup | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_unsent_handoff` | 101 |
| unsent-slot-release | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_unsent_handoff` | 101 |
| unsent-association-release | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_unsent_handoff` | 101 |
| wake-refund | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_unsent_handoff` | 101 |
| automatic-resume-generation | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_automatic_parent_resume` | 101 |
| ordinary-parent-evidence | `cargo test -p hennery-testkit --test delegation_host --locked ordinary_parent_attach` | 101 |
| ordinary-parent-seed | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_ordinary_parent_start` | 101 |
| provenance-child | `cargo test -p hennery-sessions --lib --locked child_report_provenance` | 101 |
| provenance-parent | `cargo test -p hennery-sessions --lib --locked child_report_provenance` | 101 |
| provenance-turn | `cargo test -p hennery-sessions --lib --locked child_report_provenance` | 101 |
| provenance-source | `cargo test -p hennery-sessions --lib --locked child_report_provenance` | 101 |
| provenance-delivery | `cargo test -p hennery-sessions --lib --locked child_report_provenance` | 101 |
| provenance-owner | `cargo test -p hennery-testkit --test owner_filter --locked every_query` | 101 |
| report-tail | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_report_uses_exact` | 101 |
| endpoint-cleanup | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_delete_scrubs` | 101 |
| scheduler-dispatch | `cargo test -p hennery-testkit --test delegation_tools --locked durable_question_answer_and_report` | 101 |
| scheduler-resume | `cargo test -p hennery-testkit --test delegation_tools --locked child_completion_resumes` | 101 |
| withdrawal-obsolescence | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_collector_close` | 101 |
| configuration-proof | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_checks` | 101 |
| family-routing-cut | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_reverse_delivery_checks` | 101 |
| source-upper-bound | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_report_uses_exact` | 101 |
| root-budget-deletion | `cargo test -p hennery-sessions --test store --locked a_deleted_session_leaves_only` | 101 |
| starting-failure-source | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_collector_start_failure` | 101 |
| reconciliation-settlement | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_restart_keeps` | 101 |
| delivered-answer-is-not-cancellation | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_operator_answer` | 101 |
| delivered-loss-is-not-requeued | `cargo test -p hennery-sessions --test delegation_d2 --locked d3_idle_adapter_loss` | 101 |

### Timing load

Four copies concurrently, three rounds for each of four groups: D3 store tests, delegation host tests, automatic question/answer/report HTTP loop, and automatic parked-parent resume loop. **48 binaries, 468 passed test executions, all exit 0**. The store run also includes the two-workers/operator same-slot race. Individual logs and exits are in load-results.json. All copies use isolated test data and scratch homes; no target directory is shared between trees.

### Fresh replay

**replay-7** extracted **2 nonempty diff blocks affecting 17 files**, applied them in order on archived **89d74bf2**, and observed expected exits **101, 101, 101, 0, 0, 0**. It compared the entire tracked inventory and **781 files byte-for-byte**, excluding only this plan and the README execution index: exact match. The test-only state produced the missing reverse API, missing ordinary evidence and missing automatic delivery failures; the implementation state passed all listed checks. Evidence is replay-result.json and replay-7-*.log.

Earlier replay attempts are retained honestly: unsupported copy option; unscoped global hub-publication assertion exposed by concurrent parent events (fixed to assert every exact child event); corrupted context whitespace caused by trimming embedded diffs; an intermediate draft; ownership fixture counted as production (corrected after inspecting the existing scanner); and omitted tracked-but-ignored .envrc in replay initialization (fixed with git add --force). These are not final successful replays. Exact diff context spaces in this plan must be preserved.

The following is the exact executed replay harness. Save it as .superpowers/sdd/deleg-d3/replay.mjs and run it with nix develop -c node .superpowers/sdd/deleg-d3/replay.mjs replay-N, selecting a **fresh** N. The ledger's tool-home/cargo/registry is a scratch copy of the available Cargo cache, used to keep replay tool writes out of the operator home. Every replay uses its own target and home.

```javascript
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const ledger=path.join(root,'.superpowers/sdd/deleg-d3');
const destination=path.join(ledger,process.argv[2]??'replay-1');
if(fs.existsSync(destination))throw Error('fresh directory required');
fs.mkdirSync(destination,{recursive:true});
const run=(args,cwd=destination,options={})=>{
  const result=spawnSync(args[0],args.slice(1),{cwd,encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(result.status!==0)throw Error(`${args[0]} exited ${result.status}: ${result.stderr}`);
  return result.stdout;
};
const archive=spawnSync('git',['archive','89d74bf2'],{cwd:root,maxBuffer:32*1024*1024});
if(archive.status!==0)throw Error('archive failed');
run(['tar','-x'],destination,{input:archive.stdout});
run(['git','init','-q']);run(['git','add','--force','.']);
run(['git','-c','user.name=Marcin Wadoń','-c','user.email=marcin.wadon@gmail.com','-c','commit.gpgsign=false','commit','-qm','test(delegation): pin D3 replay base']);
const home=path.join(destination,'.superpowers/tool-home');fs.mkdirSync(path.join(home,'cargo'),{recursive:true});
fs.cpSync(path.join(ledger,'tool-home/cargo/registry'),path.join(home,'cargo/registry'),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
const source=fs.readFileSync(path.join(root,'docs/plans/2026-10-31-delegation-delivery.md'),'utf8');
const blocks=[...source.matchAll(/<!-- replay (.+?) -->\n```diff\n([\s\S]*?)\n```/g)];
if(blocks.length!==2)throw Error(`expected 2 blocks, found ${blocks.length}`);
const files=new Set();const checks=[];
for(const [index,block]of blocks.entries()) {
  const meta=JSON.parse(block[1]);const patch=block[2]+'\n';
  for(const match of patch.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)){if(match[1]!==match[2])throw Error('rename unsupported');files.add(match[2]);}
  run(['git','apply','--index','-'],destination,{input:patch});
  for(const [command,expected]of meta.checks) {
    const log=path.join(ledger,`${path.basename(destination)}-${index}-${checks.length}.log`);
    const fd=fs.openSync(log,'w');
    const result=spawnSync('nix',['develop','-c','bash','-c',command],{cwd:destination,env:{...process.env,HOME:home,CARGO_HOME:path.join(home,'cargo'),XDG_CONFIG_HOME:path.join(home,'config'),XDG_DATA_HOME:path.join(home,'data'),XDG_CACHE_HOME:path.join(home,'cache')},stdio:['ignore',fd,fd]});
    fs.closeSync(fd);fs.appendFileSync(log,`\nEXIT=${result.status}\n`);
    checks.push({command,expected,exit:result.status,log});
    fs.writeFileSync(path.join(ledger,'replay-progress.json'),JSON.stringify({destination,files:files.size,checks},null,2));
    if(result.status!==expected)throw Error(`${command}: ${result.status}, expected ${expected}; ${log}`);
  }
}
if(files.size===0)throw Error('zero extracted files');
const excluded=new Set(['docs/plans/2026-10-31-delegation-delivery.md','docs/README.md']);
const inventory=cwd=>run(['git','ls-files','-z'],cwd).split('\0').filter(f=>f&&!excluded.has(f)).sort();
const actual=inventory(root),replayed=inventory(destination);
if(JSON.stringify(actual)!==JSON.stringify(replayed))throw Error('complete tracked inventory mismatch');
for(const file of actual){if(!fs.readFileSync(path.join(destination,file)).equals(fs.readFileSync(path.join(root,file))))throw Error(`tree mismatch: ${file}`);}
const summary={destination,blocks:blocks.length,files:files.size,compared:actual.length,checks,exact:true};
fs.writeFileSync(path.join(ledger,'replay-result.json'),JSON.stringify(summary,null,2));
process.stdout.write(JSON.stringify(summary,null,2)+'\n');
```

Scratch directories retained for parent cleanup: baseline-1, probe-copy-1 and replay-1 through replay-7, all under .superpowers/sdd/deleg-d3/. No scratch tree was deleted or used as a live mutation target. The superseded baseline attempted in the changing worktree is not the clean baseline result above.

### Review and coordination

Independent security and whole-branch review is requested for the final a58479c7..HEAD range, focusing on the six Review Focus items above, synchronous gated reservation as the claim implementation, and the corrected source-bound evidence. C2's minimal shared seam includes the host generation-zero line, the applied SessionStarted seed, and four host_session assertions now requiring exact typed Partial evidence while preserving every unknown-field assertion. C2 must compose startup/prompt reservations with the common owner/config/close fences. Its startup/API/connection/wire implementation was untouched.

PR creation, checks, reviewDecision, mergeStateStatus and unresolved review threads (including bots) are parent-owned. This execution record claims no external review or CI result. D3b and D4 remain release blockers.


## Review amendment: host loss, retained provenance and source bounds (2026-10-15)

Parent review of draft PR #151 returned CHANGES. D3b is paused at local WIP 0f5bf731; these fixes build on 15bd2205. Two Important findings and one Minor are addressed here; independent re-review remains parent-owned.

### Scope and decisions

- Classify the actual host-produced interrupted ending and adapter-loss pending resolution as the same attach incident as exit/park/collector facts. Keep source references and a bounded failure detail. Delivery between any two frames must not create another parent turn or wake charge.
- Treat the existing server-written destination turns.input_origin as the durable provenance evidence. Public prompts reject delegated origins; the internal dispatchers write Parent/ChildReport atomically with reservation, and the host cannot choose an origin. Strictly deserialize and compare every field, scoped to owner, destination session and turn. This also fixes the symmetric Parent-origin failure after deleting its parent. No new content, identifiers, table or migration is retained. Existing plan 9 deletion/purge removes the destination turn normally; historical copies in a surviving conversation remain as already documented. Provenance never grants current family or control rights.
- The reviewer's out-of-turn question regression proves the source-event upper bound is necessary. Only the source-turn predicate remains redundant under current serialization/order.

### Review focus

Examine actual host versus collector loss classification, dispatch interleavings and preserved error detail; strict surviving-turn attestation including duplicate/unknown origin fields, owner/session/turn scope, source deletion and reopen; both origin directions, feed cursors and purge boundaries; and the isolated upper-bound probe.

### Amendment task, step 1: regressions first

Initial runtime RED: actual crash fan-out, between-frame report missing error, deleted-child feed and symmetric deleted-parent feed. The out-of-turn regression passes the correct baseline and must fail its isolated upper-bound mutation in a scratch COPY.

<!-- amend-replay {"checks":[["cargo test -p hennery-sessions --test delegation_d2 --locked reviewer_",101],["cargo test -p hennery-testkit --test plugin_feed --locked reviewer_",101]]} -->
```diff
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 7d69e2d7..621b03b1 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -2955,3 +2955,220 @@ fn target_pages_bound_progress_and_wrap_without_foreign_or_settled_rows() {
     );
     assert_eq!(w.store.delegation_targets_after("").unwrap(), first);
 }
+
+#[test]
+fn reviewer_actual_host_crash_has_one_parent_delivery() {
+    let (w, p) = pair();
+    ready(&w);
+    ready_parent(&w);
+    let (h, mut rx) = connected();
+    queue(&w, &p, "crash-work");
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    let (request_id, turn_id) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::TurnStarted {
+                request_id,
+                turn_id: turn_id.clone(),
+            },
+        )
+        .unwrap();
+    pending(&w, "child", 4, "crash-question", PendingKind::Elicitation);
+    // Exact order emitted by Actor::adapter_exited.
+    w.store
+        .ingest(
+            "child",
+            5,
+            &SessionBody::TurnEnded {
+                turn_id,
+                outcome: TurnOutcome::Interrupted,
+                stop_reason: None,
+                error: Some("the adapter exited".into()),
+            },
+        )
+        .unwrap();
+    w.store
+        .ingest(
+            "child",
+            6,
+            &SessionBody::PendingResolved {
+                pending_id: "crash-question".into(),
+                resolution: PendingResolution::Cancelled,
+                reason: Some(PendingReason::AdapterLost),
+            },
+        )
+        .unwrap();
+    w.store
+        .ingest(
+            "child",
+            7,
+            &SessionBody::AdapterExited {
+                code: Some(1),
+                signal: None,
+                stderr_tail: String::new(),
+            },
+        )
+        .unwrap();
+    w.store
+        .ingest(
+            "child",
+            8,
+            &SessionBody::SessionParked {
+                reason: ParkReason::AdapterExited,
+            },
+        )
+        .unwrap();
+    let mut delivered = 0;
+    while w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap() {
+        let (request_id, turn_id) = take_prompt(&mut rx);
+        w.store
+            .ingest(
+                "parent",
+                3 + delivered * 2,
+                &SessionBody::TurnStarted {
+                    request_id,
+                    turn_id: turn_id.clone(),
+                },
+            )
+            .unwrap();
+        ended(&w, "parent", 4 + delivered * 2, &turn_id);
+        delivered += 1;
+        assert!(delivered < 10);
+    }
+    assert_eq!(
+        delivered,
+        1,
+        "one adapter incident must not cause several parent turns: {:?}",
+        notices(&w)
+    );
+}
+
+#[test]
+fn reviewer_out_of_turn_question_keeps_its_projection_after_later_operator_turn() {
+    let (w, _) = pair();
+    ready_parent(&w);
+    pending(&w, "child", 2, "early-question", PendingKind::Elicitation);
+    // An ordinary operator prompt may start while an out-of-turn callback remains open.
+    assert!(
+        w.store
+            .open_turn("child", "later-operator", &[json!({"type":"text","text":"continue"})])
+            .unwrap()
+    );
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: "operator-request".into(),
+                turn_id: "later-operator".into(),
+            },
+        )
+        .unwrap();
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_child_notice("parent", &catalog(), &h).unwrap());
+    let CollectorFrame::DelegatedPrompt { content, .. } = rx.try_recv().unwrap() else {
+        panic!()
+    };
+    let text = content[0]["text"].as_str().unwrap();
+    let metadata: serde_json::Value = serde_json::from_str(text.split_once('\n').unwrap().1).unwrap();
+    assert!(
+        metadata["question"].is_object(),
+        "the queued question must not be lost to a later user_turn: {text}"
+    );
+}
+
+#[test]
+fn reviewer_host_crash_delivered_between_frames_never_wakes_twice_and_keeps_error() {
+    for cut in 1..=4 {
+        let (w, p) = pair();
+        ready(&w);
+        ready_parent(&w);
+        let (hub, mut rx) = connected();
+        queue(&w, &p, "crash-work");
+        assert!(w.store.dispatch_delegated("child", &catalog(), &hub).unwrap());
+        let (request, turn) = take_prompt(&mut rx);
+        w.store
+            .ingest(
+                "child",
+                3,
+                &SessionBody::TurnStarted {
+                    request_id: request,
+                    turn_id: turn.clone(),
+                },
+            )
+            .unwrap();
+        pending(&w, "child", 4, "crash-question", PendingKind::Elicitation);
+        let frames = [
+            SessionBody::TurnEnded {
+                turn_id: turn,
+                outcome: TurnOutcome::Interrupted,
+                stop_reason: None,
+                error: Some("the adapter exited: diagnostic".into()),
+            },
+            SessionBody::PendingResolved {
+                pending_id: "crash-question".into(),
+                resolution: PendingResolution::Cancelled,
+                reason: Some(PendingReason::AdapterLost),
+            },
+            SessionBody::AdapterExited {
+                code: Some(1),
+                signal: None,
+                stderr_tail: "diagnostic stderr".into(),
+            },
+            SessionBody::SessionParked {
+                reason: ParkReason::AdapterExited,
+            },
+        ];
+        for (i, frame) in frames.iter().enumerate() {
+            w.store.ingest("child", 5 + i as u64, frame).unwrap();
+            if i + 1 == cut {
+                assert!(w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+                let CollectorFrame::DelegatedPrompt {
+                    request_id,
+                    turn_id,
+                    content,
+                    ..
+                } = rx.try_recv().unwrap()
+                else {
+                    panic!()
+                };
+                assert!(
+                    content[0]["text"]
+                        .as_str()
+                        .unwrap()
+                        .contains("the adapter exited: diagnostic")
+                );
+                w.store
+                    .ingest(
+                        "parent",
+                        3,
+                        &SessionBody::TurnStarted {
+                            request_id,
+                            turn_id: turn_id.clone(),
+                        },
+                    )
+                    .unwrap();
+                ended(&w, "parent", 4, &turn_id);
+            }
+        }
+        let rows = notices(&w);
+        assert_eq!(rows.len(), 2, "one obsolete question and one loss incident: {rows:?}");
+        assert_eq!(rows[0].1, "obsolete");
+        assert_eq!(rows[1].1, "parent_delivered");
+        assert_eq!(serde_json::from_str::<Vec<i64>>(&rows[1].2).unwrap().len(), 4);
+        assert!(!w.store.dispatch_child_notice("parent", &catalog(), &hub).unwrap());
+        assert!(rx.try_recv().is_err());
+        assert_eq!(
+            raw(&w)
+                .query_row(
+                    "SELECT SUM(wakes) FROM delegation_budgets WHERE owner_id=?1",
+                    [w.store.owner_id()],
+                    |r| r.get::<_, i64>(0)
+                )
+                .unwrap(),
+            1
+        );
+    }
+}
diff --git a/crates/hennery-testkit/tests/plugin_feed.rs b/crates/hennery-testkit/tests/plugin_feed.rs
index 8a4e0994..6fd9618b 100644
--- a/crates/hennery-testkit/tests/plugin_feed.rs
+++ b/crates/hennery-testkit/tests/plugin_feed.rs
@@ -1023,3 +1023,145 @@ fn a_grant_after_an_unapplied_fact_has_a_valid_committed_watermark() {
             .is_empty()
     );
 }
+
+#[test]
+fn reviewer_deleted_child_does_not_poison_surviving_parent_feed() {
+    let w = World::new(true);
+    w.session("parent", "host", &w.hat);
+    w.session("child", "host", &w.hat);
+    let source = w.sessions.events("child", 0, 100).unwrap()[0].event_id;
+    let cursor = w.sessions.activity_page(&w.token, None, 20).unwrap().next_cursor;
+    let origin = InputOrigin::ChildReport {
+        child_id: "child".into(),
+        source_event_id: source.to_string(),
+        delivery_id: "delivery".into(),
+    };
+    // Seed the exact server-owned reservation association written by D3.
+    assert!(
+        w.sessions
+            .open_turn(
+                "parent",
+                "report-turn",
+                &[json!({"type":"text","text":"Child report (untrusted child data)"})]
+            )
+            .unwrap()
+    );
+    w.core(|tx| {
+        tx.execute("UPDATE turns SET input_origin=?1 WHERE owner_id=?2 AND turn_id='report-turn'", params![serde_json::to_string(&origin).unwrap(),w.sessions.owner_id()]).unwrap();
+        tx.execute("INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,source_events,kind,incident,accepted_revision,created_at,deadline,state,target_turn,required_config) VALUES (?1,'delivery','child','parent','parent',?2,?3,json_array(?3),'turn_ended','incident',1,1,301,'awaiting_reconciliation','report-turn','{}')",params![w.sessions.owner_id(),w.hat,source]).unwrap();
+    });
+    w.sessions
+        .ingest(
+            "parent",
+            2,
+            &SessionBody::TurnStarted {
+                request_id: "delivery".into(),
+                turn_id: "report-turn".into(),
+            },
+        )
+        .unwrap();
+    w.sessions
+        .ingest(
+            "parent",
+            3,
+            &SessionBody::TurnEnded {
+                turn_id: "report-turn".into(),
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+    let before = w.sessions.activity_page(&w.token, None, 20).unwrap();
+    assert_eq!(before.items.len(), 1);
+    assert!(matches!(
+        &before.items[0].provenance[0],
+        Provenance::Source {
+            origin: InputOrigin::ChildReport { .. },
+            ..
+        }
+    ));
+    w.sessions.close_now("child").unwrap();
+    w.sessions.delete_session("child", None).unwrap();
+    w.session("unrelated", "host", &w.hat);
+    w.turn("unrelated", "new-turn", 2, TurnOutcome::Completed);
+    let after = w.sessions.activity_page(&w.token, None, 20);
+    let after = after.expect("deleting the child must not stop the parent and unrelated activity");
+    assert!(after.items.iter().any(|item| item.provenance.iter().any(|p| matches!(
+        p,
+        Provenance::Source {
+            origin: InputOrigin::ChildReport { .. },
+            ..
+        }
+    ))));
+    let reopened = Store::open(&w.path).unwrap();
+    let mut next = cursor;
+    let mut saw_unrelated = false;
+    for _ in 0..4 {
+        let page = reopened.activity_page(&w.token, Some(&next), 1).unwrap();
+        assert_ne!(page.next_cursor, next, "the feed must advance past retained provenance");
+        saw_unrelated |= serde_json::to_string(&page).unwrap().contains("new-turn");
+        next = page.next_cursor;
+        if !page.has_more {
+            break;
+        }
+    }
+    assert!(saw_unrelated);
+}
+
+#[test]
+fn reviewer_deleted_parent_does_not_poison_surviving_child_feed() {
+    let w = World::new(true);
+    w.session("parent", "host", &w.hat);
+    w.session("child", "host", &w.hat);
+    let origin = InputOrigin::Parent {
+        session_id: "parent".into(),
+        operation_id: "operation".into(),
+    };
+    assert!(
+        w.sessions
+            .open_turn(
+                "child",
+                "child-turn",
+                &[json!({"type":"text","text":"untrusted parent copy"})]
+            )
+            .unwrap()
+    );
+    w.core(|tx|{
+        tx.execute("UPDATE turns SET input_origin=?1 WHERE owner_id=?2 AND turn_id='child-turn'",params![serde_json::to_string(&origin).unwrap(),w.sessions.owner_id()]).unwrap();
+        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,turn_id) VALUES (?1,'parent','key','operation','digest','session_send','child','awaiting_reconciliation','child-turn')",[w.sessions.owner_id()]).unwrap();
+    });
+    w.sessions
+        .ingest(
+            "child",
+            2,
+            &SessionBody::TurnStarted {
+                request_id: "operation".into(),
+                turn_id: "child-turn".into(),
+            },
+        )
+        .unwrap();
+    w.sessions
+        .ingest(
+            "child",
+            3,
+            &SessionBody::TurnEnded {
+                turn_id: "child-turn".into(),
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+    assert!(w.sessions.activity_page(&w.token, None, 20).is_ok());
+    w.sessions.close_now("parent").unwrap();
+    w.sessions.delete_session("parent", None).unwrap();
+    let page = Store::open(&w.path).unwrap().activity_page(&w.token, None, 20).unwrap();
+    assert!(page.items.iter().any(|item| item.provenance.iter().any(|p| matches!(
+        p,
+        Provenance::Source {
+            origin: InputOrigin::Parent { .. },
+            ..
+        }
+    ))));
+}
```

### Amendment task, step 2: implement retained attestation and host coalescing

<!-- amend-replay {"checks":[["cargo test -p hennery-sessions --lib --test delegation_d2 --locked",0],["cargo test -p hennery-testkit --test plugin_feed --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/src/delegation_delivery.rs b/crates/hennery-sessions/src/delegation_delivery.rs
index c57bf6e6..1d11c5e5 100644
--- a/crates/hennery-sessions/src/delegation_delivery.rs
+++ b/crates/hennery-sessions/src/delegation_delivery.rs
@@ -13,7 +13,8 @@ pub(crate) fn record_in(tx: &Transaction<'_>, owner: &str, event: &EventDto) ->
         || event.kind == "presumed_parked" && reason == Some("host_revoked")
         || event.kind == "session_parked" && reason == Some("adapter_exited")
         || event.kind == "turn_ended_synthesized"
-        || event.kind == "pending_cancelled"
+        || event.kind == "turn_ended" && event.body["outcome"] == "interrupted"
+        || matches!(event.kind.as_str(), "pending_cancelled" | "pending_resolved")
             && matches!(
                 reason,
                 Some("adapter_lost" | "host_restarted" | "host_revoked" | "session_parked")
@@ -122,28 +123,33 @@ impl crate::store::Store {
         }
         Ok(())
     }
-    /// C1 validates server-written provenance against this durable association.
-    pub(crate) fn verified_child_report_in(
+    /// The destination's origin is written by the internal dispatcher in the
+    /// reservation transaction. Public prompts cannot supply delegated origins,
+    /// and host facts copy this value rather than choosing one. Compare strict
+    /// typed bytes from the surviving turn: deleting a source scrubs its routing
+    /// receipts without invalidating already delivered historical provenance.
+    /// This evidence grants no current family or session-control authority.
+    pub(crate) fn verified_delegated_input_in(
         &self,
         tx: &Transaction<'_>,
         origin: &InputOrigin,
         target: &str,
         turn: &str,
     ) -> Result<bool> {
-        let InputOrigin::ChildReport {
-            child_id,
-            source_event_id,
-            delivery_id,
-        } = origin
-        else {
+        if !matches!(origin, InputOrigin::ChildReport { .. } | InputOrigin::Parent { .. }) {
             return Ok(false);
-        };
-        Ok(tx.query_row(
-            "SELECT EXISTS(SELECT 1 FROM delegation_notices WHERE owner_id = ?1 AND delivery_id = ?2
-            AND child_id = ?3 AND parent_id = ?4 AND target_turn = ?5 AND CAST(source_event_id AS TEXT) = ?6)",
-            params![self.owner_id(), delivery_id, child_id, target, turn, source_event_id],
-            |r| r.get(0),
-        )?)
+        }
+        let saved: Option<String> = tx
+            .query_row(
+                "SELECT input_origin FROM turns WHERE owner_id = ?1 AND session_id = ?2 AND turn_id = ?3",
+                params![self.owner_id(), target, turn],
+                |r| r.get(0),
+            )
+            .optional()?;
+        Ok(saved
+            .and_then(|raw| serde_json::from_str::<InputOrigin>(&raw).ok())
+            .as_ref()
+            == Some(origin))
     }
 }
 
@@ -161,10 +167,17 @@ mod tests {
         let mut conn = store.conn();
         let tx = conn.transaction().unwrap();
         tx.execute(
-            "INSERT INTO delegation_notices(owner_id,delivery_id,child_id,parent_id,root_id,hat_id,source_event_id,
-            source_events,kind,incident,accepted_revision,created_at,deadline,required_config,target_turn)
-            VALUES (?1,'delivery','child','parent','parent','hat',7,'[7]','turn_ended','incident',1,1,301,?2,'turn')",
-            params![store.owner_id(), "{}"],
+            "INSERT INTO turns(owner_id,turn_id,session_id,content,created_at,input_origin)
+            VALUES (?1,'turn','parent','[]','test',?2)",
+            params![
+                store.owner_id(),
+                serde_json::to_string(&InputOrigin::ChildReport {
+                    child_id: "child".into(),
+                    source_event_id: "7".into(),
+                    delivery_id: "delivery".into()
+                })
+                .unwrap()
+            ],
         )
         .unwrap();
         let origin = |child: &str, event: &str, delivery: &str| InputOrigin::ChildReport {
@@ -174,7 +187,7 @@ mod tests {
         };
         assert!(
             store
-                .verified_child_report_in(&tx, &origin("child", "7", "delivery"), "parent", "turn")
+                .verified_delegated_input_in(&tx, &origin("child", "7", "delivery"), "parent", "turn")
                 .unwrap()
         );
         for (child, event, delivery, parent, turn) in [
@@ -186,7 +199,30 @@ mod tests {
         ] {
             assert!(
                 !store
-                    .verified_child_report_in(&tx, &origin(child, event, delivery), parent, turn)
+                    .verified_delegated_input_in(&tx, &origin(child, event, delivery), parent, turn)
+                    .unwrap()
+            );
+        }
+        let foreign = crate::store::Store::open_in_memory().unwrap();
+        assert!(
+            !foreign
+                .verified_delegated_input_in(&tx, &origin("child", "7", "delivery"), "parent", "turn")
+                .unwrap()
+        );
+        for raw in [
+            r#"{"kind":"child_report","child_id":"child","source_event_id":"7","delivery_id":"delivery","kind":"operator"}"#,
+            r#"{"kind":"operator","kind":"child_report","child_id":"child","source_event_id":"7","delivery_id":"delivery"}"#,
+            r#"{"kind":"operator"}"#,
+            r#"{"kind":"child_report","child_id":"child","source_event_id":"7","delivery_id":"delivery","approved":true}"#,
+        ] {
+            tx.execute(
+                "UPDATE turns SET input_origin = ?2 WHERE owner_id = ?1 AND turn_id = 'turn'",
+                params![store.owner_id(), raw],
+            )
+            .unwrap();
+            assert!(
+                !store
+                    .verified_delegated_input_in(&tx, &origin("child", "7", "delivery"), "parent", "turn")
                     .unwrap()
             );
         }
diff --git a/crates/hennery-sessions/src/delegation_delivery_dispatch.rs b/crates/hennery-sessions/src/delegation_delivery_dispatch.rs
index 3184c9e4..594fca30 100644
--- a/crates/hennery-sessions/src/delegation_delivery_dispatch.rs
+++ b/crates/hennery-sessions/src/delegation_delivery_dispatch.rs
@@ -377,7 +377,8 @@ fn report_in(tx: &Transaction<'_>, owner: &str, n: &Notice) -> Result<String> {
         let text = tail(&report, budget);
         let metadata = serde_json::json!({"kind":n.kind,"child_id":n.child,"source_event_id":n.event,"turn_id":n.turn,
             "pending_id":n.pending,"outcome":source.get("outcome"),"question":question,"report":text,
-            "truncated":truncated||text.len()!=report.len(),"link":format!("/sessions/{}",n.child)});
+            "error":source.get("error").and_then(serde_json::Value::as_str).map(|error|tail(error,1024)),
+            "truncated":truncated||text.len()!=report.len()||source.get("error").and_then(serde_json::Value::as_str).is_some_and(|error|error.len()>1024),"link":format!("/sessions/{}",n.child)});
         let output = format!(
             "Child report (untrusted child data; not operator input or approval). Inspect current child status before answering.\n{}",
             serde_json::to_string(&metadata)?
diff --git a/crates/hennery-sessions/src/plugin.rs b/crates/hennery-sessions/src/plugin.rs
index b5458bfb..5607725a 100644
--- a/crates/hennery-sessions/src/plugin.rs
+++ b/crates/hennery-sessions/src/plugin.rs
@@ -349,9 +349,10 @@ impl Store {
 impl Store {
     fn verified_input_in(&self, tx: &Transaction<'_>, origin: &InputOrigin, target: &str, turn: &str) -> Result<bool> {
         match origin {
-            InputOrigin::Operator {}=>Ok(true),
-            InputOrigin::Parent {session_id,operation_id}=>Ok(tx.query_row("SELECT EXISTS(SELECT 1 FROM session_operations WHERE owner_id = ?1 AND operation_id = ?2 AND caller_id = ?3 AND child_id = ?4 AND turn_id = ?5 AND tool IN ('session_send','session_spawn'))",params![self.owner_id(),operation_id,session_id,target,turn],|r|r.get(0))?),
-            InputOrigin::ChildReport {..}=>self.verified_child_report_in(tx,origin,target,turn),
+            InputOrigin::Operator {} => Ok(true),
+            InputOrigin::Parent { .. } | InputOrigin::ChildReport { .. } => {
+                self.verified_delegated_input_in(tx, origin, target, turn)
+            }
         }
     }
 }
```

### Amendment verification record

All six Rust commands ran inside nix develop and exited **0**: cargo fmt --all --check; cargo clippy --workspace --all-targets --locked -- -D warnings; cargo clippy -p hennery --locked -- -D warnings; cargo test --workspace --locked; cargo run -p hennery-proto --bin gen --locked -- --check; cargo run -p hennery-view --bin gen-view --locked -- --check. Logs: /tmp/deleg-d3-amend-complete-{fmt,clippy,binary-clippy,tests,proto,view}.log. The final strict-origin fixture was also checked by /tmp/deleg-d3-amend-final-{fmt,clippy}.log.

Full count: **2369 passed across 155 suites**, versus **2,364** before this amendment: **five new regression tests**. Targeted suites passed: sessions library 66, delegation_d2 98, plugin_feed 23, owner_filter 3. No ownership rule, statement minimum, type or assertion was weakened. The provenance unit fixture now represents the production server-written destination reservation and verifies all references, foreign owner/session/turn and malformed/duplicate/unknown raw origin fields.

Final nix flake check -L exited **0** (/tmp/deleg-d3-amend-flake-final.log), including native package, clippy, audit, rustfmt and embedded UI checks. Incompatible Linux systems were explicitly omitted; Linux/macOS CI and complete PR status remain parent-owned. Web files are untouched.

**RED:** the actual host sequence and between-frame diagnostic tests failed before the fix; both deletion-direction feed tests failed with unsupported input origin. Fresh replay independently reproduced these failures. The new out-of-turn question test passes the correct baseline and fails when only the source-event upper bound is removed.

**COPY probes:** 12 detected mutations, each with a successful exact-command baseline. Mutations ran only in amendment/probe-copy-1 and each source was restored. Requiring the deleted source notice again fails the child-deletion feed test specifically. Source-turn predicate removal alone passed all 98 delegation tests; the isolated upper-bound removal failed its regression. The earlier equivalence candidate for the upper bound is withdrawn. Details: probe-results.json, post-probes.json and their referenced logs.

| Mutation | Detected exit | Test command |
|---|---:|---|
| host-interrupted-loss | 101 | cargo test -p hennery-sessions --test delegation_d2 --locked reviewer_actual_host_crash |
| host-pending-loss | 101 | cargo test -p hennery-sessions --test delegation_d2 --locked reviewer_actual_host_crash |
| delivered-incident-not-requeued | 101 | cargo test -p hennery-sessions --test delegation_d2 --locked reviewer_host_crash_delivered |
| bounded-failure-detail | 101 | cargo test -p hennery-sessions --test delegation_d2 --locked reviewer_host_crash_delivered |
| source-event-upper-bound | 101 | cargo test -p hennery-sessions --test delegation_d2 --locked reviewer_out_of_turn_question |
| origin-owner | 101 | cargo test -p hennery-sessions --lib --locked child_report_provenance |
| origin-destination | 101 | cargo test -p hennery-sessions --lib --locked child_report_provenance |
| origin-turn | 101 | cargo test -p hennery-sessions --lib --locked child_report_provenance |
| origin-strict-decoding | 101 | cargo test -p hennery-sessions --lib --locked child_report_provenance |
| origin-all-fields | 101 | cargo test -p hennery-sessions --lib --locked child_report_provenance |
| feed-retained-origin | 101 | cargo test -p hennery-testkit --test plugin_feed --locked reviewer_ |
| deleted-notice-required-again | 101 | cargo test -p hennery-testkit --test plugin_feed --locked reviewer_deleted_child |

**Load:** four binaries concurrently, three rounds per regression group: 24 binaries, 60 passed test executions, all exit **0**. Store cases exercise the actual host sequence and delivery after each of its four frames; feed cases exercise deletion/reopen/cursor safety in both directions. Evidence: load-results.json and individual logs.

**Fresh amendment replay:** archived base **15bd2205**, two nonempty blocks, **5 files extracted**, expected exits **101, 101, 0, 0**. Compared **781 tracked files byte-for-byte**, excluding only this plan and the README execution index: exact. Evidence: replay-result.json and replay-1-*.log. Scratch amendment/replay-1 and amendment/probe-copy-1 remain for parent cleanup; no scratch tree was deleted and no mutation ran in the worktree.

The exact executed amendment replay harness follows (the scratch registry is copied from the lane tool cache). Its invocation was nix develop -c node .superpowers/sdd/deleg-d3/amendment/replay.mjs replay-1, always in a fresh directory.

```javascript
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const ledger=path.join(root,'.superpowers/sdd/deleg-d3/amendment');
const destination=path.join(ledger,process.argv[2]??'replay-1');
if(fs.existsSync(destination))throw Error('fresh directory required');
fs.mkdirSync(destination,{recursive:true});
const run=(args,cwd=destination,options={})=>{
  const result=spawnSync(args[0],args.slice(1),{cwd,encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(result.status!==0)throw Error(`${args[0]} exited ${result.status}: ${result.stderr}`);
  return result.stdout;
};
const archive=spawnSync('git',['archive','15bd2205'],{cwd:root,maxBuffer:32*1024*1024});
if(archive.status!==0)throw Error('archive failed');
run(['tar','-x'],destination,{input:archive.stdout});
run(['git','init','-q']);run(['git','add','--force','.']);
run(['git','-c','user.name=Marcin Wadoń','-c','user.email=marcin.wadon@gmail.com','-c','commit.gpgsign=false','commit','-qm','test(delegation): pin D3 replay base']);
const home=path.join(destination,'.superpowers/tool-home');fs.mkdirSync(path.join(home,'cargo'),{recursive:true});
fs.cpSync(path.join(root,'.superpowers/sdd/deleg-d3/tool-home/cargo/registry'),path.join(home,'cargo/registry'),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
const source=fs.readFileSync(path.join(root,'docs/plans/2026-10-31-delegation-delivery.md'),'utf8');
const blocks=[...source.matchAll(/<!-- amend-replay (.+?) -->\n```diff\n([\s\S]*?)\n```/g)];
if(blocks.length!==2)throw Error(`expected 2 blocks, found ${blocks.length}`);
const files=new Set();const checks=[];
for(const [index,block]of blocks.entries()) {
  const meta=JSON.parse(block[1]);const patch=block[2]+'\n';
  for(const match of patch.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)){if(match[1]!==match[2])throw Error('rename unsupported');files.add(match[2]);}
  run(['git','apply','--index','-'],destination,{input:patch});
  for(const [command,expected]of meta.checks) {
    const log=path.join(ledger,`${path.basename(destination)}-${index}-${checks.length}.log`);
    const fd=fs.openSync(log,'w');
    const result=spawnSync('nix',['develop','-c','bash','-c',command],{cwd:destination,env:{...process.env,HOME:home,CARGO_HOME:path.join(home,'cargo'),XDG_CONFIG_HOME:path.join(home,'config'),XDG_DATA_HOME:path.join(home,'data'),XDG_CACHE_HOME:path.join(home,'cache')},stdio:['ignore',fd,fd]});
    fs.closeSync(fd);fs.appendFileSync(log,`\nEXIT=${result.status}\n`);
    checks.push({command,expected,exit:result.status,log});
    fs.writeFileSync(path.join(ledger,'replay-progress.json'),JSON.stringify({destination,files:files.size,checks},null,2));
    if(result.status!==expected)throw Error(`${command}: ${result.status}, expected ${expected}; ${log}`);
  }
}
if(files.size===0)throw Error('zero extracted files');
const excluded=new Set(['docs/plans/2026-10-31-delegation-delivery.md','docs/README.md']);
const inventory=cwd=>run(['git','ls-files','-z'],cwd).split('\0').filter(f=>f&&!excluded.has(f)).sort();
const actual=inventory(root),replayed=inventory(destination);
if(JSON.stringify(actual)!==JSON.stringify(replayed))throw Error('complete tracked inventory mismatch');
for(const file of actual){if(!fs.readFileSync(path.join(destination,file)).equals(fs.readFileSync(path.join(root,file))))throw Error(`tree mismatch: ${file}`);}
const summary={destination,blocks:blocks.length,files:files.size,compared:actual.length,checks,exact:true};
fs.writeFileSync(path.join(ledger,'replay-result.json'),JSON.stringify(summary,null,2));
process.stdout.write(JSON.stringify(summary,null,2)+'\n');
```

Re-review requested for **15bd2205..HEAD**, including the symmetric Parent-origin fix. Check that retained turn provenance confers no current authority, purge removes destination history normally, host and collector facts form one loss incident, late facts cannot requeue it, and the upper bound protects an earlier out-of-turn question. The parent owns pushing if SSH refuses, PR #151 checks, reviewDecision, mergeStateStatus and unresolved review threads, bots included. D3b resumes after rebasing onto this amendment; D3b/D4 still block ordinary release.

## C2 rebase integration (2026-10-15)

Rebased unsigned onto merged C2 main **7fe43fbe**. Original commits 542948ae, 15bd2205 and 79304d58 map to **82a435f7**, **9ea880dc** and **d91aa92d** before this integration amendment. Both plugin.rs conflicts preserve D3's server-written destination-turn verification for Parent/ChildReport and C2's explicit PluginContext feed denial. The auto-merged host startup rendering, prompt admission, final websocket dispatch guard and test fixtures were inspected; no C2 implementation was discarded.

C2 introduced no sessions migration. D3a remains migration **19**, leaving D3b **20** available; the entire merged migration prefix is byte-identical to main. Every owner-audit case from both branches survives with at least the stricter minimum, including C2 startup/context sources and the gateway minimum of 42. Retired verified_child_report_in call sites and conflict markers were searched in crates and are absent; the replacement is verified_delegated_input_in.

A semantic integration regression was found: C2's transcript-origin guard accepted Parent but rejected factual ChildReport input. The new test below was run **RED (exit 101)** in the worktree, then the guard explicitly accepted ChildReport while retaining PluginContext denial. Parent display remains covered by C2's unchanged regression. This adds one test; it introduces no timing/concurrency behavior.

All D3a-targeted commands ran inside the dev shell with the existing isolated tool home and exited **0**:

- cargo test -p hennery-sessions --test delegation_d2 --test store --locked: **98 +104 passed**.
- cargo test -p hennery-testkit --test delegation_host --test delegation_tools --test host_session --test plugin_feed --test owner_filter --test plugin_startup --test plugin_startup_host --locked: **16 +13 +81 +23 +3 +26 +2 passed**, one pre-existing ignored test.
- cargo test -p hennery-sessions --lib --locked child_report_provenance: **1 passed**.
- cargo test -p hennery-view --test plugin_origin --locked: **3 passed**.
- cargo fmt --all --check: clean.
- Both generators ran without --check to regenerate, with exit 0. All four generated schema/TypeScript files match merged C2 **7fe43fbe** exactly; no generated files were hand-merged and the conditional web gate is unnecessary.

Four guard probes were batched in a single fresh COPY with target/ cloned using **cp -c -R**: remove ChildReport display, remove Parent display, allow PluginContext feed input, and reject retained delegated feed evidence. Each had a successful exact-command baseline, failed its regression with exit 101, and restored GREEN. Source bytes match the restored copy. No full replay or load repetition was run under the operator verification budget. The one full workspace/six-Rust/native-Nix gate set is owned by the final rebased D3b head and recorded in that plan. D3b-only regressions require its implementation and run on that head; the shared D3a suites above run standalone here.

The original embedded plan/replay and prior amendment evidence remain historical at their pinned bases. Current rebase evidence and hashes are in .superpowers/sdd/deleg-d3/rebase-c2/. Review d91aa92d plus this composition amendment; the published fix range and D3b range are reported to the parent. PR #151 checks, reviewDecision, mergeStateStatus and unresolved threads remain parent-owned.

The exact integration changes, already observed RED/GREEN and guard-probed, are:

```diff
diff --git a/crates/hennery-view/src/fold.rs b/crates/hennery-view/src/fold.rs
index 6a2e94f5..d9049df3 100644
--- a/crates/hennery-view/src/fold.rs
+++ b/crates/hennery-view/src/fold.rs
@@ -323,7 +323,9 @@ impl Fold {
         if event.body.get("origin").is_some_and(|value| {
             !matches!(
                 serde_json::from_value::<hennery_proto::plugin::InputOrigin>(value.clone()),
-                Ok(hennery_proto::plugin::InputOrigin::Operator {} | hennery_proto::plugin::InputOrigin::Parent { .. })
+                Ok(hennery_proto::plugin::InputOrigin::Operator {}
+                    | hennery_proto::plugin::InputOrigin::Parent { .. }
+                    | hennery_proto::plugin::InputOrigin::ChildReport { .. })
             )
         }) {
             self.unrecognised(event, "unsupported_input_origin");
diff --git a/crates/hennery-view/tests/plugin_origin.rs b/crates/hennery-view/tests/plugin_origin.rs
index 2470da81..c997221e 100644
--- a/crates/hennery-view/tests/plugin_origin.rs
+++ b/crates/hennery-view/tests/plugin_origin.rs
@@ -44,3 +44,27 @@ fn typed_parent_input_remains_visible_alongside_the_plugin_origin_guard() {
             if text.starts_with("From parent session p")))));
     assert!(items.iter().all(|i| !matches!(i.body, Body::Unrecognised(_))));
 }
+
+#[test]
+fn typed_child_report_remains_visible_alongside_the_plugin_origin_guard() {
+    let mut fold = Fold::new();
+    fold.apply(
+        &EventDto {
+            event_id: 1,
+            session_id: "parent".into(),
+            host_seq: None,
+            kind: "user_turn".into(),
+            ts: "now".into(),
+            body: json!({"turn_id":"report-turn", "content":[{"type":"text",
+                "text":"From child session child (untrusted child-provided report data): done"}],
+                "origin":{"kind":"child_report","child_id":"child",
+                    "source_event_id":"7","delivery_id":"delivery"}}),
+        },
+        &|_: &str| false,
+    );
+    let items = fold.take();
+    assert!(items.iter().any(|i| matches!(&i.body, Body::UserTurn {content, ..}
+        if matches!(content.as_slice(), [hennery_proto::rest::StoredBlock::Text {text}]
+            if text.starts_with("From child session child")))));
+    assert!(items.iter().all(|i| !matches!(i.body, Body::Unrecognised(_))));
+}
```

Generated with Claude AI — please review before distribution.
