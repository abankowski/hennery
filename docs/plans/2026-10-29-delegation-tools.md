# Delegation tools, catalog and configuration (D2) Implementation Plan

**Goal:** implement D2 from the approved [delegation design](../specs/2026-10-14-delegation-design.md): seven tools on D1's session endpoint, a shared host catalog, durable owned-child commands, configuration proof and safe automatic resume. Stop for independent review.

**Architecture:** the retained D1 request tree feeds one strict typed decoder. The sessions module owns operation keys, scoped family admission, a durable FIFO and current generation/configuration evidence. A bounded worker transfers accepted commands through the same host actor used by operator input. The host probes its configured adapters without prompting and checks a configuration fence immediately before every delegated prompt. Existing kernel owner coordination spans the durable reservation and final live-host handoff. Migration 18 follows D1's sessions migration 17; kernel 13 and gateway 5 stay unchanged. No dependency is added.

**Tech stack:** existing Rust workspace, SQLite, tokio, axum, schemars and ts-rs; generated JSON Schema and TypeScript.

## Execution status (2026-10-15)

Built first on **plan/deleg-d2**, rebased onto merged P1 at 256691fe before replay. Codex gpt-6-astra reviewed **256691fe..2443592e** on the maintainer's behalf: **APPROVE AFTER AMENDMENTS**, no Critical findings, 126 focused tests passed. The reviewer confirmed the redundant owner UPSERT predicate mutation is **EQUIVALENT**; the predicate stays. Tasks 5–6 below address the two Important findings test-first: committed close/answer event publication and answer pagination with wraparound. The verification record distinguishes original evidence from amendment checks, copy probes, load and a fresh complete replay. Scoped review confirmation and Linux/macOS CI remain parent-owned.

Implementation base: **256691feb9cba161f0c29b14016bc857a4da86e5**. Embedded implementation head: **395fa1401a6c046c0ed7afae27f6248f74e8bde4**.

The replay compares every tracked implementation file with the embedded head. Only this plan and its README index are excluded from that comparison; both documentation files remain exactly at the pinned base during replay. Each patch still has an exact complete staged-tree assertion.

## Scope

In: session_capabilities, session_spawn, session_send, session_status, session_list, session_close and session_answer; strict typed arguments and idempotent receipts; host-scoped runtime/model/configuration catalogs shared with the operator launcher; bounded busy queues; genuinely parked resume; generation-bound actual configuration evidence; close-intent fences; same owner/hat/host direct-child authority; one generation; ordinary elicitation answers through the operator's existing validator; factual operation settlement, InputOrigin::Parent and its existing provenance/read-model support.

Out: D3 durable child-to-parent delivery, child-report production, attention/operator fallback and reverse-delivery scheduling; D4 family UI and live inference acceptance. Status may read an already stored report, but D2 produces no report or parent wake-up. Permission questions always go to the operator (Q1 default); children cannot delegate (Q2 default). A new child may be attached solely to learn its actual catalog; its brief stays durable and withheld until validation succeeds.

## Decisions this plan makes where the spec is silent

| Detail | Choice and consequence | Review authority |
|---|---|---|
| Idempotency | One caller-session/operation-key namespace spans mutating tool names; canonical typed arguments plus tool name determine the digest. Reads never reserve a key. Retry returns the same durable receipt; changed input is operation_conflict. Deleted targets leave an opaque failed/gone deduplication receipt without child/request/turn/config references; deleting the caller removes it | Parent's independent review requested |
| Limits | Eight live children, 32 starts per actual operator-root prompt epoch, 32 queued entries per target, 1 MiB queued payload; 64 KiB input text, 128-byte opaque ids/keys, list limit 100. A separate transactional start counter survives child deletion and receipt scrubbing; deleting the caller removes its counter. Limits are surfaced by capabilities | Parent's independent review requested |
| Catalog lifetime | Current host connection, adapter revision, owner, hat, cwd and runtime scope; 30-second fresh and 5-second unknown cache; bounded to 128 entries and deduplicated probes | Parent's independent review requested |
| Cold catalog | A model-only request may create a child without dispatching its brief when pre-start discovery is unavailable. Only that child's current complete attach evidence can validate and release it. No retained model is proof; mismatch holds | Design cold-catalog amendment; parent review requested |
| Safe defaults | Known pinned Claude default/plan and Codex read-only are classified; Codex retains isolation None. Unknown/overridden/Generic profiles need explicit stepped-up operator policy and actual security-axis evidence | Design security amendment; parent review requested |
| Resume | Separate CAS for genuinely parked state, never the permissive operator resume path. It increments attach generation and clears old proof. New evidence must be complete, current and match all required values before a prompt | Design amendments |
| Uncertain handoff | Reserve before handing off; require the same ready/reconciled live host. Never infer delivery from a socket write and never resend an uncertain reservation. Settle from matching factual turn/answer/close events | Parent's independent review requested |
| Answer slot | Reuse submit_answer_in and its schema validator; ordinary elicitation only. A pending parent answer competes atomically with the operator. Closing the source frees only an answer not handed to the host | Q1 default and design |
| Permanent child identity | Immutable delegated_child survives family deletion, so deletion cannot let a formerly delegated child spawn grandchildren | Q2 default; parent review requested |
| Status bounds | Only owned direct children; scoped compact opaque pagination; bounded ordinary question schemas, permission metadata without options/schema; bounded folded report text preserves its tail | Parent's independent review requested |

## Global Constraints

- D1's verified caller and delivered revision are the only authority; arguments cannot name owner, hat or parent. Every mutation rechecks inside its transaction. Dispatch rechecks source, family, target, current grant/policy, host eligibility and close intent.
- A persisted capability is not current connection proof. The final hub handoff checks the same live hello, readiness and reconciliation under the owner coordination gate.
- Runtime selection uses the host's actual configured inventory. Same-runtime omitted model may inherit the parent's model; explicit runtime/model values are never silently substituted. Cwd remains inside current workspace rules at catalog, attach and dispatch.
- New attach/resume invalidates evidence. Retained/downtime config, partial or unknown evidence, stale generation/revision, pending config switches and unknown security selections cannot release a prompt. The host actor checks the expected fence before forwarding.
- Close is non-cascading and never deletes a session. Close intent prevents later delegated dispatch and the fallback close CAS cannot close a concurrently resumed session. Historical status remains readable without reviving routing authority.
- Permission answers stay operator-only. Parent text is untrusted data, not configuration authority; durable InputOrigin::Parent comes from verified operation mapping, never text. It does not count as a new operator root prompt or operator push.
- No new shared token definition, plugin authority or guessed delivery. Queue payload/config/evidence is scrubbed on terminal lifecycle changes; deletion removes queues and evidence, scrubs target receipts and removes caller receipts/counters. Accepted work can survive a normal parent park but cannot borrow a new grant revision.
- Strict duplicate-free HTTP parsing feeds the same typed decoder used for dispatch. Differential tests cover case, duplicate and escaped keys, BOM and whitespace, unknown fields, shape changes, UTF-8 byte limits and canonical digests.
- All tool commands run inside plain nix develop with scratch HOME/XDG/tool configuration. Binary tests clear SSL_CERT_FILE/SSL_CERT_DIR and use first_exec. Probes run only in fresh copies, with no shared target directory. No GitHub action is performed by this lane.

## Review Focus

1. Source/target owner, hat, host, live grant and permanent one-generation predicates at acceptance and every delayed dispatch; concurrent disable/reassign/delete/close and operation-key races.
2. Catalog revision/connection scoping, independent runtime/model defaults, known safe policy classification, cold start without a brief, complete current attach evidence and host-side final prompt fence.
3. Genuine park CAS, close intent, attach generation invalidation, busy FIFO, uncertain handoff recovery and factual receipts; no duplicate prompt after reconnect.
4. Ordinary elicitation shared validation, permission operator_required, single parent/operator answer slot, source-close before/after handoff, non-cascading close and concurrent operator resume.
5. Parent provenance/push suppression, bounded/redacted status and catalogs, cross-family pagination, operation error redaction and append-only migration 18. owner_filter prepares every new statement.
6. D3 hooks below are seams only. Independent reviews and Ubuntu CI are required before merge; local startup discovery/spawn proves no provider inference behavior.

## File structure

- proto delegation, delegation_host and delegation_status: strict arguments, receipts, catalog/evidence/fences, policy and status; codegen and generated schema/TypeScript.
- host connection/profile/projects/session and delegation: disposable probes, configured inventory, canonical cwd, security classification, attach evidence and final actor fence.
- sessions tool_args/session_tools/builtin: canonical decoding, seven verified handlers, matching structured/text results and bounded host waits.
- sessions delegation_schema/queue/runtime/dispatch/control/worker/api: migration 18, idempotent bounded queue, shared catalog, transactional admission/handoff, answer/close/status, fair bounded drain and operator routes.
- kernel hats, sessions store/plugin/hub/ws/api, full-mode main: shared authoritative hat resolution, existing answer validator, verified provenance, live handoff/reconciliation and worker wiring.
- proto/session/testkit tests: differential contract, storage/races, host actor and real HTTP suites; owner_filter audit.

**Reading the steps:** each nonempty fenced diff applies exactly to the preceding state using **git apply --index**. These are synthetic final test/feature states, rather than a claim that historical development commits contained no intermediate corrections. Each RED command is observed during the fresh replay. The harness refuses zero extracted blocks, checks every expected exit and compares the complete tracked final tree with the embedded implementation head. This document and the docs index execution line are written after that head.

### Task 1, step 1: test(delegation): specify strict tool contracts and differential decoding

- [x] Specify the behavior; each listed command must produce the observed RED exit.

<!-- replay {"subject":"test(delegation): specify strict tool contracts and differential decoding","tree":"705b6165a4da0b694d32124710e9db154e1041e7","checks":[["cargo test -p hennery-proto --test delegation_tools --locked",101],["cargo test -p hennery-sessions --test tool_args --locked",101]]} -->
```diff
diff --git a/crates/hennery-proto/tests/delegation_tools.rs b/crates/hennery-proto/tests/delegation_tools.rs
new file mode 100644
index 0000000000000000000000000000000000000000..1275e439c4e5e13d66171d9a170b7e4558e9d74e
--- /dev/null
+++ b/crates/hennery-proto/tests/delegation_tools.rs
@@ -0,0 +1,72 @@
+use hennery_proto::delegation::{OperationReceipt, OperationState, argument_schemas};
+use serde_json::{Value, json};
+
+#[test]
+fn discovery_schemas_reject_unknown_config_and_resolve_every_reference() {
+    fn refs(value: &Value, root: &Value) {
+        match value {
+            Value::Object(map) => {
+                if let Some(reference) = map.get("$ref").and_then(Value::as_str) {
+                    assert!(
+                        root.pointer(reference.strip_prefix('#').unwrap()).is_some(),
+                        "{reference}"
+                    );
+                }
+                for value in map.values() {
+                    refs(value, root);
+                }
+            }
+            Value::Array(items) => {
+                for item in items {
+                    refs(item, root);
+                }
+            }
+            _ => {}
+        }
+    }
+    for (name, schema) in argument_schemas() {
+        assert_eq!(schema["additionalProperties"], false, "{name}");
+        refs(&schema, &schema);
+        if name == "session_spawn" {
+            let reference = schema["properties"]["config"]["$ref"].as_str().unwrap();
+            let config = schema.pointer(reference.strip_prefix('#').unwrap()).unwrap();
+            assert_eq!(config["type"], "object");
+            assert_eq!(config["additionalProperties"], false);
+        }
+    }
+}
+
+#[test]
+fn receipt_states_roundtrip_with_delivery_distinct_from_completion() {
+    let states = [
+        OperationState::Accepted,
+        OperationState::WaitingConfig,
+        OperationState::Queued,
+        OperationState::AwaitingReconciliation,
+        OperationState::Delivered,
+        OperationState::Completed,
+        OperationState::NotDelivered,
+        OperationState::Cancelled,
+        OperationState::Failed {
+            code: "operation_conflict".into(),
+        },
+    ];
+    for state in states {
+        let receipt = OperationReceipt {
+            operation_id: "operation".into(),
+            child_id: Some("child".into()),
+            turn_id: None,
+            pending_id: None,
+            state,
+        };
+        let json = serde_json::to_value(&receipt).unwrap();
+        assert_eq!(
+            serde_json::from_value::<OperationReceipt>(json.clone()).unwrap(),
+            receipt
+        );
+        assert!(json["state"]["state"].is_string());
+    }
+    assert!(serde_json::from_value::<OperationState>(json!({"state":"failed"})).is_err());
+    assert!(serde_json::from_value::<OperationState>(json!({"state":"delivered","code":"forged"})).is_err());
+    assert_ne!(OperationState::Delivered, OperationState::Completed);
+}
diff --git a/crates/hennery-sessions/tests/tool_args.rs b/crates/hennery-sessions/tests/tool_args.rs
new file mode 100644
index 0000000000000000000000000000000000000000..952ef40db5c273877dd3bb430ed2a9f6c886045d
--- /dev/null
+++ b/crates/hennery-sessions/tests/tool_args.rs
@@ -0,0 +1,266 @@
+#[path = "../src/tool_args.rs"]
+mod tool_args;
+use hennery_proto::delegation::*;
+use serde_json::{Value, json};
+use tool_args::{ToolArgsError, ToolCall, decode_tool, discovery};
+
+fn spawn() -> Value {
+    json!({"operation_key":"op.1", "cwd":"/workspace", "brief":"Research 🐔", "config":{"model":"model:any", "axes":{"effort":"high"}}})
+}
+
+#[test]
+fn all_seven_tools_decode_and_discover_generated_strict_schemas() {
+    let cases = [
+        ("session_capabilities", json!({})),
+        ("session_spawn", spawn()),
+        (
+            "session_send",
+            json!({"operation_key":"s", "child_id":"child", "text":"Continue"}),
+        ),
+        (
+            "session_answer",
+            json!({"operation_key":"a", "child_id":"child", "pending_id":"question", "action":"accept", "content":{}}),
+        ),
+        ("session_status", json!({"child_id":"child"})),
+        ("session_list", json!({"limit":100})),
+        ("session_close", json!({"operation_key":"c", "child_id":"child"})),
+    ];
+    let listed = discovery();
+    let tools = listed["tools"].as_array().unwrap();
+    assert_eq!(tools.len(), 7);
+    for (name, args) in cases {
+        let call = decode_tool(name, &args).unwrap();
+        assert_eq!(call.name(), name);
+        assert_eq!(call.canonical_request()["name"], name);
+        assert_eq!(call.request_digest().len(), 64);
+        assert_eq!(call.operation_key(), args.get("operation_key").and_then(Value::as_str));
+        let mut forged = args.clone();
+        forged["owner_id"] = json!("spoof");
+        assert_eq!(decode_tool(name, &forged).unwrap_err(), ToolArgsError::InvalidArguments);
+        let schema = tools.iter().find(|tool| tool["name"] == name).unwrap();
+        assert_eq!(schema["inputSchema"]["type"], "object");
+        assert_eq!(schema["inputSchema"]["additionalProperties"], false);
+        assert!(!schema["description"].as_str().unwrap().is_empty());
+    }
+    let descriptions = listed.to_string();
+    for required in ["operation_conflict", "across tool names", "operator", "substitute"] {
+        assert!(descriptions.contains(required), "{required}");
+    }
+    assert!(decode_tool("Session_spawn", &spawn()).is_err());
+    assert_eq!(
+        decode_tool("unknown", &json!({})).unwrap_err(),
+        ToolArgsError::UnknownTool
+    );
+}
+
+#[test]
+fn every_argument_and_nested_config_requires_exact_object_fields() {
+    for value in [json!([]), json!(null), json!(false), json!("bad")] {
+        for name in [
+            "session_capabilities",
+            "session_spawn",
+            "session_send",
+            "session_answer",
+            "session_status",
+            "session_list",
+            "session_close",
+        ] {
+            assert!(decode_tool(name, &value).is_err(), "{name}: {value}");
+        }
+    }
+    for field in [
+        "owner_id",
+        "parent_id",
+        "host_id",
+        "hat_id",
+        "session_id",
+        "Operation_key",
+        "operation_Key",
+    ] {
+        let mut args = spawn();
+        args[field] = json!("spoof");
+        assert!(decode_tool("session_spawn", &args).is_err(), "{field}");
+    }
+    for config in [
+        json!([]),
+        json!(["model", "mode", {}]),
+        json!({"Model":"forged"}),
+        json!({"model":"ok", "owner_id":"spoof"}),
+        json!({"axes":[]}),
+    ] {
+        let mut args = spawn();
+        args["config"] = config;
+        assert!(decode_tool("session_spawn", &args).is_err(), "{args}");
+        assert!(serde_json::from_value::<SpawnArgs>(args).is_err());
+    }
+    assert!(serde_json::from_str::<CapabilitiesArgs>("[]").is_err());
+    assert!(serde_json::from_str::<ListArgs>("[]").is_err());
+    assert!(
+        serde_json::from_str::<SpawnArgs>(
+            r#"{"operation_key":"a","cwd":"/w","brief":"b","config":{"model":"x","model":"y"}}"#
+        )
+        .is_err()
+    );
+}
+
+#[test]
+fn bounds_count_utf8_bytes_and_opaque_authority_ids_are_restricted() {
+    for key in ["", "x y", "x/y", "é", "x\n", &"x".repeat(129)] {
+        let mut args = spawn();
+        args["operation_key"] = json!(key);
+        assert!(decode_tool("session_spawn", &args).is_err(), "{key:?}");
+    }
+    let mut args = spawn();
+    args["brief"] = json!("🐔".repeat(16_384));
+    assert!(decode_tool("session_spawn", &args).is_ok());
+    args["brief"] = json!("🐔".repeat(16_385));
+    assert!(decode_tool("session_spawn", &args).is_err());
+    for limit in [0, 101, 65536, -1] {
+        assert!(decode_tool("session_list", &json!({"limit":limit})).is_err());
+    }
+    for child_id in ["", "bad child", "bad/child", "é"] {
+        assert!(decode_tool("session_status", &json!({"child_id":child_id})).is_err());
+    }
+    args = spawn();
+    args["cwd"] = json!("/bad\u{0000}path");
+    assert!(decode_tool("session_spawn", &args).is_err());
+}
+
+#[test]
+fn answer_accepts_only_elicitation_actions_and_object_content() {
+    for (action, content, allowed) in [
+        ("accept", json!({"answer":"yes"}), true),
+        ("accept", Value::Null, false),
+        ("accept", json!([]), false),
+        ("decline", Value::Null, true),
+        ("cancel", Value::Null, true),
+        ("approve", json!({}), false),
+        ("Accept", json!({}), false),
+    ] {
+        assert_eq!(
+            decode_tool(
+                "session_answer",
+                &json!({"operation_key":"a", "child_id":"c", "pending_id":"p", "action":action, "content":content})
+            )
+            .is_ok(),
+            allowed
+        );
+    }
+    assert!(decode_tool("session_answer", &json!({"operation_key":"a", "child_id":"c", "pending_id":"p", "action":"accept", "content":{}, "option_id":"allow_always"})).is_err());
+}
+
+#[test]
+fn canonical_request_and_digest_bind_typed_defaults_tool_and_content() {
+    let a = decode_tool("session_spawn", &spawn()).unwrap();
+    let mut same = spawn();
+    same["name"] = Value::Null;
+    same["agent"] = Value::Null;
+    let b = decode_tool("session_spawn", &same).unwrap();
+    assert_eq!(a.canonical_request(), b.canonical_request());
+    assert_eq!(a.request_digest(), b.request_digest());
+    assert_eq!(a.request_digest().len(), 64);
+    assert_eq!(a.operation_key(), Some("op.1"));
+    let mut changed = spawn();
+    changed["brief"] = json!("Different");
+    assert_ne!(
+        a.request_digest(),
+        decode_tool("session_spawn", &changed).unwrap().request_digest()
+    );
+    let close = decode_tool("session_close", &json!({"operation_key":"op.1","child_id":"c"})).unwrap();
+    assert_ne!(a.request_digest(), close.request_digest());
+    assert!(matches!(a, ToolCall::Spawn(_)));
+}
+
+#[path = "../../hennery-gateway/tests/support/differential.rs"]
+mod differential;
+#[test]
+fn same_wire_bytes_are_filtered_once_before_typed_dispatch() {
+    use differential::{DECODERS, Node};
+    for bytes in [
+        br#"{"operation_key":"op","cwd":"/w","brief":"go","config":{}}"#.as_slice(),
+        b"\r\n{ \"\\u006fperation_key\":\"op\", \"cwd\":\"/w\", \"brief\":\"go\", \"config\":{} }\t",
+    ] {
+        let tree: Node = serde_json::from_slice(bytes).unwrap();
+        for decoder in DECODERS {
+            assert!(decoder.get(&tree, "operation_key").is_some());
+        }
+        let retained = hennery_gateway::decode_json_once(bytes).unwrap();
+        assert!(decode_tool("session_spawn", &retained).is_ok());
+        assert!(serde_json::from_slice::<SpawnArgs>(bytes).is_ok());
+    }
+    for bytes in [
+        br#"{"operation_key":"op","operation_key":"other","cwd":"/w","brief":"go","config":{}}"#.as_slice(),
+        br#"{"operation_key":"op","\u006fperation_key":"other","cwd":"/w","brief":"go","config":{}}"#,
+        br#"{"operation_key":"op","Operation_key":"other","cwd":"/w","brief":"go","config":{}}"#,
+        br#"{"operation_key":"op","cwd":"/w","brief":"go","config":{"model":"x","model":"y"}}"#,
+        b"\xef\xbb\xbf{\"operation_key\":\"op\",\"cwd\":\"/w\",\"brief\":\"go\",\"config\":{}}",
+        b"{\x0b\"operation_key\":\"op\",\"cwd\":\"/w\",\"brief\":\"go\",\"config\":{}}",
+    ] {
+        let strict = hennery_gateway::decode_json_once(bytes).and_then(|tree| decode_tool("session_spawn", &tree).ok());
+        assert!(strict.is_none(), "{}", String::from_utf8_lossy(bytes));
+        assert!(
+            serde_json::from_slice::<SpawnArgs>(bytes).is_err(),
+            "{}",
+            String::from_utf8_lossy(bytes)
+        );
+    }
+}
+
+#[test]
+fn every_text_config_axis_and_pagination_bound_has_an_edge_case() {
+    for (field, max) in [("cwd", 4096), ("brief", 65536), ("name", 256), ("agent", 128)] {
+        let mut args = spawn();
+        args[field] = json!("x".repeat(max));
+        assert!(decode_tool("session_spawn", &args).is_ok(), "{field} at limit");
+        for bad in [String::new(), "x".repeat(max + 1)] {
+            args[field] = json!(bad);
+            assert!(decode_tool("session_spawn", &args).is_err(), "{field}: {}", bad.len());
+        }
+    }
+    for field in ["model", "mode"] {
+        let mut args = spawn();
+        args["config"][field] = json!("x".repeat(512));
+        assert!(decode_tool("session_spawn", &args).is_ok());
+        args["config"][field] = json!("x".repeat(513));
+        assert!(decode_tool("session_spawn", &args).is_err());
+    }
+    for (count, allowed) in [(64, true), (65, false)] {
+        let mut args = spawn();
+        args["config"]["axes"] = Value::Object((0..count).map(|i| (format!("axis{i}"), json!(true))).collect());
+        assert_eq!(decode_tool("session_spawn", &args).is_ok(), allowed);
+    }
+    for (key, value) in [
+        ("".into(), json!(true)),
+        ("x".repeat(513), json!(true)),
+        ("x".into(), json!("")),
+        ("x".into(), json!("x".repeat(513))),
+    ] {
+        let mut args = spawn();
+        args["config"]["axes"] = json!({ key: value });
+        assert!(decode_tool("session_spawn", &args).is_err());
+    }
+    assert!(decode_tool("session_capabilities", &json!({"agent":"x".repeat(129)})).is_err());
+    assert!(decode_tool("session_capabilities", &json!({"cwd":"x".repeat(4097)})).is_err());
+    for field in ["operation_key", "child_id", "text"] {
+        let mut args = json!({"operation_key":"k", "child_id":"c", "text":"go"});
+        args[field] = json!("x".repeat(if field == "text" { 65537 } else { 129 }));
+        assert!(decode_tool("session_send", &args).is_err(), "{field}");
+    }
+    for field in ["pending_id", "child_id", "content"] {
+        let mut args = json!({"operation_key":"k", "child_id":"c", "pending_id":"p", "action":"accept", "content":{}});
+        args[field] = if field == "content" {
+            json!({"value":"x".repeat(65536)})
+        } else {
+            json!("x".repeat(129))
+        };
+        assert!(decode_tool("session_answer", &args).is_err(), "{field}");
+    }
+    assert!(decode_tool("session_list", &json!({"cursor":"x".repeat(129)})).is_err());
+    assert!(
+        decode_tool(
+            "session_status",
+            &json!({"child_id":"c", "operation_key":"x".repeat(129)})
+        )
+        .is_err()
+    );
+}
```

Run:

```bash
nix develop -c cargo test -p hennery-proto --test delegation_tools --locked # expected exit 101
nix develop -c cargo test -p hennery-sessions --test tool_args --locked # expected exit 101
```

### Task 1, step 2: feat(delegation): define seven typed tools and canonical receipts

- [x] Implement the preceding contract; each listed GREEN command must succeed.

<!-- replay {"subject":"feat(delegation): define seven typed tools and canonical receipts","tree":"b38d645e626e2b9c46ce66baa616ab8e91ff1022","checks":[["cargo test -p hennery-proto --test delegation_tools --locked",0],["cargo test -p hennery-sessions --test tool_args --locked",0]]} -->
```diff
diff --git a/crates/hennery-proto/src/codegen.rs b/crates/hennery-proto/src/codegen.rs
index f6c2749f19b7699acffbe3d223354b3f246b26de..de1927c4874fc6afd1e37f34710e0d9845ff12e0 100644
--- a/crates/hennery-proto/src/codegen.rs
+++ b/crates/hennery-proto/src/codegen.rs
@@ -47,6 +47,15 @@ pub fn render_schema() -> String {
         delegation::HatSessionTools,
         delegation::SetSessionTools,
         delegation::SessionFamily,
+        delegation::CapabilitiesArgs,
+        delegation::SpawnArgs,
+        delegation::SendArgs,
+        delegation::AnswerArgs,
+        delegation::StatusArgs,
+        delegation::ListArgs,
+        delegation::CloseArgs,
+        delegation::OperationReceipt,
+        delegation::OperationState,
         plugin::PluginCapabilities,
         plugin::ForgetReceipt,
         frames::HostFrame,
@@ -217,6 +226,15 @@ pub fn render_ts() -> String {
         delegation::HatSessionTools,
         delegation::SetSessionTools,
         delegation::SessionFamily,
+        delegation::CapabilitiesArgs,
+        delegation::SpawnArgs,
+        delegation::SendArgs,
+        delegation::AnswerArgs,
+        delegation::StatusArgs,
+        delegation::ListArgs,
+        delegation::CloseArgs,
+        delegation::OperationReceipt,
+        delegation::OperationState,
         plugin::TextRole,
         plugin::Excerpt,
         plugin::PluginActivityItem,
diff --git a/crates/hennery-proto/src/delegation.rs b/crates/hennery-proto/src/delegation.rs
index ff35f2116ba049176f31fdfc1e376276c290aae6..69c4e4660701149f9785381e79fa5961e5762355 100644
--- a/crates/hennery-proto/src/delegation.rs
+++ b/crates/hennery-proto/src/delegation.rs
@@ -60,3 +60,190 @@ pub struct SessionFamily {
     pub detached: bool,
     pub reason: Option<String>,
 }
+
+// Derived struct decoding accepts positional sequences. Every tool argument is
+// map-only, so its JSON Schema and actual parser agree at authorization edges.
+macro_rules! tool_args {
+    ($(#[$meta:meta])* pub struct $name:ident { $($(#[$field_meta:meta])* pub $field:ident: $ty:ty),* $(,)? }) => {
+        $(#[$meta])*
+        #[derive(Debug, Clone, PartialEq, Serialize, JsonSchema, TS)]
+        #[serde(deny_unknown_fields)]
+        pub struct $name { $($(#[$field_meta])* pub $field: $ty),* }
+        impl<'de> Deserialize<'de> for $name {
+            fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
+                #[derive(Deserialize, JsonSchema, TS)]
+                #[serde(deny_unknown_fields)]
+                struct Fields { $($(#[$field_meta])* $field: $ty),* }
+                struct Object;
+                impl<'de> serde::de::Visitor<'de> for Object {
+                    type Value = $name;
+                    fn expecting(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+                        f.write_str(concat!(stringify!($name), " object"))
+                    }
+                    fn visit_map<A: serde::de::MapAccess<'de>>(self, map: A) -> Result<Self::Value, A::Error> {
+                        let fields = Fields::deserialize(serde::de::value::MapAccessDeserializer::new(map))?;
+                        Ok($name { $($field: fields.$field),* })
+                    }
+                }
+                deserializer.deserialize_map(Object)
+            }
+        }
+    };
+}
+
+tool_args! {
+    /// Caller-host capabilities, scoped to the caller's hat and validated cwd.
+    pub struct CapabilitiesArgs {
+        pub agent: Option<String>,
+        pub cwd: Option<String>,
+    }
+}
+tool_args! {
+    /// Start one independently configured direct child, without provider fallback.
+    pub struct SpawnArgs {
+        pub operation_key: String,
+        pub cwd: String,
+        pub brief: String,
+        pub name: Option<String>,
+        pub agent: Option<String>,
+        #[serde(deserialize_with = "strict_config")]
+        #[schemars(with = "ConfigFields")]
+        pub config: crate::frames::SessionConfig,
+    }
+}
+tool_args! {
+    /// Queue an ordinary follow-up for an owned direct child.
+    pub struct SendArgs {
+        pub operation_key: String,
+        pub child_id: String,
+        pub text: String,
+    }
+}
+tool_args! {
+    /// Answer ordinary elicitation only. ACP permissions remain operator-only.
+    pub struct AnswerArgs {
+        pub operation_key: String,
+        pub child_id: String,
+        pub pending_id: String,
+        pub action: crate::frames::ElicitationAction,
+        #[ts(type = "unknown | null")]
+        pub content: Option<serde_json::Value>,
+    }
+}
+tool_args! {
+    /// Read a direct child's state, optionally selecting one operation receipt.
+    pub struct StatusArgs {
+        pub child_id: String,
+        pub operation_key: Option<String>,
+    }
+}
+tool_args! {
+    /// Page direct children only, never owner-wide sessions or grandchildren.
+    pub struct ListArgs {
+        pub cursor: Option<String>,
+        pub limit: Option<u16>,
+    }
+}
+tool_args! {
+    /// Close one direct child. Does not delete sessions or clean files.
+    pub struct CloseArgs {
+        pub operation_key: String,
+        pub child_id: String,
+    }
+}
+
+tool_args! {
+    /// Object-only strict decoding/schema adapter for the shared session config.
+    pub struct ConfigFields {
+        pub model: Option<String>,
+        pub mode: Option<String>,
+        #[serde(default)]
+        pub axes: std::collections::BTreeMap<String, crate::frames::ConfigValue>,
+    }
+}
+fn strict_config<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<crate::frames::SessionConfig, D::Error> {
+    let fields = ConfigFields::deserialize(deserializer)?;
+    Ok(crate::frames::SessionConfig {
+        model: fields.model,
+        mode: fields.mode,
+        axes: fields.axes,
+    })
+}
+
+/// Durable acceptance/delivery record. Delivery never implies completion.
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(deny_unknown_fields)]
+pub struct OperationReceipt {
+    pub operation_id: String,
+    pub child_id: Option<String>,
+    pub turn_id: Option<String>,
+    pub pending_id: Option<String>,
+    pub state: OperationState,
+}
+
+/// A delegation operation's state, independent of the session lifecycle.
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, JsonSchema, TS)]
+#[serde(tag = "state", rename_all = "snake_case", deny_unknown_fields)]
+pub enum OperationState {
+    Accepted,
+    WaitingConfig,
+    Queued,
+    AwaitingReconciliation,
+    Delivered,
+    Completed,
+    NotDelivered,
+    Cancelled,
+    Failed { code: String },
+}
+
+// Serde's internally tagged unit variants ignore additional fields even with
+// deny_unknown_fields. Empty struct variants enforce the advertised shape.
+impl<'de> Deserialize<'de> for OperationState {
+    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
+        #[derive(Deserialize)]
+        #[serde(tag = "state", rename_all = "snake_case", deny_unknown_fields)]
+        enum Wire {
+            Accepted {},
+            WaitingConfig {},
+            Queued {},
+            AwaitingReconciliation {},
+            Delivered {},
+            Completed {},
+            NotDelivered {},
+            Cancelled {},
+            Failed { code: String },
+        }
+        Ok(match Wire::deserialize(deserializer)? {
+            Wire::Accepted {} => Self::Accepted,
+            Wire::WaitingConfig {} => Self::WaitingConfig,
+            Wire::Queued {} => Self::Queued,
+            Wire::AwaitingReconciliation {} => Self::AwaitingReconciliation,
+            Wire::Delivered {} => Self::Delivered,
+            Wire::Completed {} => Self::Completed,
+            Wire::NotDelivered {} => Self::NotDelivered,
+            Wire::Cancelled {} => Self::Cancelled,
+            Wire::Failed { code } => Self::Failed { code },
+        })
+    }
+}
+
+/// Self-contained tool argument schemas for MCP discovery.
+pub fn argument_schemas() -> [(&'static str, serde_json::Value); 7] {
+    macro_rules! schema {
+        ($name:literal, $ty:ty) => {
+            (
+                $name,
+                serde_json::to_value(schemars::schema_for!($ty)).expect("argument schema serializes"),
+            )
+        };
+    }
+    [
+        schema!("session_capabilities", CapabilitiesArgs),
+        schema!("session_spawn", SpawnArgs),
+        schema!("session_send", SendArgs),
+        schema!("session_answer", AnswerArgs),
+        schema!("session_status", StatusArgs),
+        schema!("session_list", ListArgs),
+        schema!("session_close", CloseArgs),
+    ]
+}
diff --git a/crates/hennery-sessions/src/tool_args.rs b/crates/hennery-sessions/src/tool_args.rs
new file mode 100644
index 0000000000000000000000000000000000000000..db966f2044b83a2796dc2b74b78f2c3ccb20796f
--- /dev/null
+++ b/crates/hennery-sessions/src/tool_args.rs
@@ -0,0 +1,189 @@
+//! Typed D2 dispatch contract. The endpoint passes its retained, duplicate-free
+//! JSON tree here; this module never reparses the HTTP body or trusts authority
+//! supplied in tool arguments.
+use hennery_proto::delegation::*;
+use hennery_proto::frames::{ConfigValue, ElicitationAction};
+use serde::Serialize;
+use serde_json::{Value, json};
+use sha2::{Digest, Sha256};
+
+pub const MAX_OPERATION_KEY_BYTES: usize = 128;
+pub const MAX_TEXT_BYTES: usize = 64 * 1024;
+pub const MAX_CWD_BYTES: usize = 4096;
+pub const MAX_CONFIG_ID_BYTES: usize = 512;
+pub const MAX_AXES: usize = 64;
+pub const MAX_LIST_LIMIT: u16 = 100;
+
+#[derive(Debug, Clone, PartialEq)]
+pub enum ToolCall {
+    Capabilities(CapabilitiesArgs),
+    Spawn(SpawnArgs),
+    Send(SendArgs),
+    Answer(AnswerArgs),
+    Status(StatusArgs),
+    List(ListArgs),
+    Close(CloseArgs),
+}
+#[derive(Debug, Clone, Copy, PartialEq, Eq)]
+pub enum ToolArgsError {
+    UnknownTool,
+    InvalidArguments,
+}
+impl std::fmt::Display for ToolArgsError {
+    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+        f.write_str(match self {
+            Self::UnknownTool => "unknown tool",
+            Self::InvalidArguments => "invalid tool arguments",
+        })
+    }
+}
+impl std::error::Error for ToolArgsError {}
+
+/// Exact names and exact typed object fields only. No session, owner, hat or
+/// parent identifiers from the caller can become authorization context.
+pub fn decode_tool(name: &str, arguments: &Value) -> Result<ToolCall, ToolArgsError> {
+    if !arguments.is_object() {
+        return Err(ToolArgsError::InvalidArguments);
+    }
+    macro_rules! decode {
+        ($ty:ty, $variant:ident) => {
+            ToolCall::$variant(
+                serde_json::from_value::<$ty>(arguments.clone()).map_err(|_| ToolArgsError::InvalidArguments)?,
+            )
+        };
+    }
+    let call = match name {
+        "session_capabilities" => decode!(CapabilitiesArgs, Capabilities),
+        "session_spawn" => decode!(SpawnArgs, Spawn),
+        "session_send" => decode!(SendArgs, Send),
+        "session_answer" => decode!(AnswerArgs, Answer),
+        "session_status" => decode!(StatusArgs, Status),
+        "session_list" => decode!(ListArgs, List),
+        "session_close" => decode!(CloseArgs, Close),
+        _ => return Err(ToolArgsError::UnknownTool),
+    };
+    if !call.valid() {
+        return Err(ToolArgsError::InvalidArguments);
+    }
+    Ok(call)
+}
+fn bounded(value: &str, max: usize) -> bool {
+    !value.is_empty() && value.len() <= max && !value.contains('\0')
+}
+fn opaque(value: &str) -> bool {
+    bounded(value, MAX_OPERATION_KEY_BYTES)
+        && value
+            .bytes()
+            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.' | b':'))
+}
+fn optional(value: &Option<String>, check: impl Fn(&str) -> bool) -> bool {
+    value.as_deref().is_none_or(check)
+}
+impl ToolCall {
+    pub fn name(&self) -> &'static str {
+        match self {
+            Self::Capabilities(_) => "session_capabilities",
+            Self::Spawn(_) => "session_spawn",
+            Self::Send(_) => "session_send",
+            Self::Answer(_) => "session_answer",
+            Self::Status(_) => "session_status",
+            Self::List(_) => "session_list",
+            Self::Close(_) => "session_close",
+        }
+    }
+    pub fn operation_key(&self) -> Option<&str> {
+        match self {
+            Self::Spawn(a) => Some(&a.operation_key),
+            Self::Send(a) => Some(&a.operation_key),
+            Self::Answer(a) => Some(&a.operation_key),
+            Self::Close(a) => Some(&a.operation_key),
+            Self::Status(a) => a.operation_key.as_deref(),
+            _ => None,
+        }
+    }
+    fn valid(&self) -> bool {
+        if self.operation_key().is_some_and(|key| !opaque(key)) {
+            return false;
+        }
+        match self {
+            Self::Capabilities(a) => {
+                optional(&a.agent, |s| bounded(s, 128)) && optional(&a.cwd, |s| bounded(s, MAX_CWD_BYTES))
+            }
+            Self::Spawn(a) => {
+                bounded(&a.cwd, MAX_CWD_BYTES)
+                    && bounded(&a.brief, MAX_TEXT_BYTES)
+                    && optional(&a.name, |s| bounded(s, 256))
+                    && optional(&a.agent, |s| bounded(s, 128))
+                    && optional(&a.config.model, |s| bounded(s, MAX_CONFIG_ID_BYTES))
+                    && optional(&a.config.mode, |s| bounded(s, MAX_CONFIG_ID_BYTES))
+                    && a.config.axes.len() <= MAX_AXES
+                    && a.config.axes.iter().all(|(key, value)| {
+                        bounded(key, MAX_CONFIG_ID_BYTES)
+                            && match value {
+                                ConfigValue::Bool(_) => true,
+                                ConfigValue::Id(id) => bounded(id, MAX_CONFIG_ID_BYTES),
+                            }
+                    })
+            }
+            Self::Send(a) => opaque(&a.child_id) && bounded(&a.text, MAX_TEXT_BYTES),
+            Self::Answer(a) => {
+                opaque(&a.child_id)
+                    && opaque(&a.pending_id)
+                    && a.content.as_ref().is_none_or(|v| v.to_string().len() <= MAX_TEXT_BYTES)
+                    && match a.action {
+                        ElicitationAction::Accept => a.content.as_ref().is_some_and(Value::is_object),
+                        ElicitationAction::Decline | ElicitationAction::Cancel => a.content.is_none(),
+                    }
+            }
+            Self::Status(a) => opaque(&a.child_id),
+            Self::List(a) => {
+                optional(&a.cursor, opaque) && a.limit.is_none_or(|limit| (1..=MAX_LIST_LIMIT).contains(&limit))
+            }
+            Self::Close(a) => opaque(&a.child_id),
+        }
+    }
+    /// Canonical typed request, including the tool name. Optional absent/null
+    /// fields and sorted nested keys have identical semantics and digests.
+    pub fn canonical_request(&self) -> Value {
+        fn value<T: Serialize>(args: &T) -> Value {
+            serde_json::to_value(args).expect("typed tool args serialize")
+        }
+        let arguments = match self {
+            Self::Capabilities(a) => value(a),
+            Self::Spawn(a) => value(a),
+            Self::Send(a) => value(a),
+            Self::Answer(a) => value(a),
+            Self::Status(a) => value(a),
+            Self::List(a) => value(a),
+            Self::Close(a) => value(a),
+        };
+        hennery_proto::codegen::sort_keys(json!({"name":self.name(),"arguments":arguments}))
+    }
+    /// Persist alongside the operation receipt before performing side effects.
+    /// The caller scope lives in storage's unique key, never in these arguments.
+    pub fn request_digest(&self) -> String {
+        hex::encode(Sha256::digest(self.canonical_request().to_string().as_bytes()))
+    }
+}
+
+/// MCP discovery uses Rust-generated argument schemas. Returned schemas are
+/// self-contained; no manually maintained JSON or TypeScript argument contract.
+pub fn discovery() -> Value {
+    const RETRY: &str = " Mutations use a durable operation_key scoped to this caller session across tool names, including token rotation. Retry the same canonical typed request with the same key to retrieve its receipt; changed requests return operation_conflict. Delivery is not completion.";
+    let tools: Vec<Value> = argument_schemas().into_iter().map(|(name, schema)| {
+        let summary = match name {
+            "session_capabilities" => "Discover the caller host's runtimes and configuration catalogs for a same-hat cwd. Unknown or stale catalogs are reported honestly.",
+            "session_spawn" => "Spawn one direct child using an independently selected runtime and model. No provider or model substitute is used. The brief waits for confirmed configuration. Permissions remain operator-only; children cannot spawn grandchildren.",
+            "session_send" => "Queue bounded follow-up text for a direct child. A genuinely parked child may resume after fresh configuration evidence; a closed child never reopens.",
+            "session_answer" => "Answer ordinary elicitation only using its pending_id. accept requires object content. Permission requests are operator-only and return operator_required. Escalate missing facts and product decisions to the operator.",
+            "session_status" => "Read one owned direct child's lifecycle, configuration, questions, reports and operation receipts. Permission questions have no parent-answerable schema.",
+            "session_list" => "Page only the caller's direct children; never all owner sessions or grandchildren.",
+            "session_close" => "Close one direct child and cancel its unstarted follow-ups. Does not delete files, cascade or delete sessions.",
+            _ => unreachable!("generated tool names are fixed"),
+        };
+        let mutation = matches!(name, "session_spawn" | "session_send" | "session_answer" | "session_close");
+        let description = if mutation { format!("{summary}{RETRY}") } else { summary.to_owned() };
+        json!({"name":name,"description":description,"inputSchema":schema})
+    }).collect();
+    json!({"tools":tools})
+}
```

Run:

```bash
nix develop -c cargo test -p hennery-proto --test delegation_tools --locked # expected exit 0
nix develop -c cargo test -p hennery-sessions --test tool_args --locked # expected exit 0
```

### Task 2, step 1: test(delegation): specify host catalogs and generation-fenced configuration

- [x] Specify the behavior; each listed command must produce the observed RED exit.

<!-- replay {"subject":"test(delegation): specify host catalogs and generation-fenced configuration","tree":"c548d614e3c58a4248e28dc7a13c8997a3f062ae","checks":[["cargo test -p hennery-testkit --test delegation_host --locked",101]]} -->
```diff
diff --git a/crates/hennery-host/tests/runtime.rs b/crates/hennery-host/tests/runtime.rs
index cdc5c7ed4c325118e186d603ce3459d1f8221d39..91e6be1320686bd1cdd504a723c887f9d8a6d0a8 100644
--- a/crates/hennery-host/tests/runtime.rs
+++ b/crates/hennery-host/tests/runtime.rs
@@ -561,7 +561,11 @@ async fn a_host_start_installs_the_pinned_set_and_launches_from_its_absolute_pat
     // The pinned Claude is isolated; Codex is not, until plan 8h.
     use hennery_host::profile::Profile;
     assert_eq!(prepared.agents.profiles["claude"], Profile::Claude);
-    assert_eq!(prepared.agents.profiles["codex"], Profile::Generic);
+    assert_eq!(prepared.agents.profiles["codex"], Profile::Codex);
+    assert_eq!(
+        prepared.agents.profiles["codex"].mcp_isolation(),
+        hennery_proto::frames::McpIsolation::None
+    );
     // Plan 9d decision 9: a forget's app-server is the set's bundled Codex,
     // `<node> <set>/codex/<the pinned launcher>`, once the set has it.
     assert!(
diff --git a/crates/hennery-testkit/tests/delegation_host.rs b/crates/hennery-testkit/tests/delegation_host.rs
new file mode 100644
index 0000000000000000000000000000000000000000..7f2130fdf7b4e2ee402459733f3cd3a0a2da514f
--- /dev/null
+++ b/crates/hennery-testkit/tests/delegation_host.rs
@@ -0,0 +1,734 @@
+use hennery_host::{
+    AgentCommand,
+    delegation::{CatalogProbes, checked_cwd, security_classification},
+    outbox::Outbox,
+    profile::Profile,
+    session::{self, Attach, Launch, SessionCmd, SessionOptions},
+    uplink::Uplink,
+};
+use hennery_proto::{
+    delegation_host::{ConfigCompleteness, PromptFence},
+    frames::{ConfigValue, HostFrame, SessionBody, SessionConfig},
+};
+use hennery_testkit::{FakeScript, SCRIPT_ENV, sample_config_options};
+use serde_json::json;
+use std::{path::Path, time::Duration};
+
+fn fake(script: FakeScript, root: &Path) -> AgentCommand {
+    let program = env!("CARGO_BIN_EXE_hennery-fake-acp");
+    hennery_testkit::first_exec(program);
+    AgentCommand {
+        program: program.into(),
+        args: vec![],
+        env: vec![
+            (SCRIPT_ENV.into(), serde_json::to_string(&script).unwrap()),
+            ("HOME".into(), root.display().to_string()),
+            ("XDG_CONFIG_HOME".into(), root.display().to_string()),
+            ("XDG_DATA_HOME".into(), root.display().to_string()),
+            ("XDG_CACHE_HOME".into(), root.display().to_string()),
+            ("SSL_CERT_FILE".into(), String::new()),
+            ("SSL_CERT_DIR".into(), String::new()),
+        ],
+    }
+}
+fn script() -> FakeScript {
+    FakeScript {
+        config_options: sample_config_options(),
+        ..Default::default()
+    }
+}
+async fn until(up: &Uplink, pred: impl Fn(&[HostFrame]) -> bool) -> Vec<HostFrame> {
+    tokio::time::timeout(Duration::from_secs(20), async {
+        loop {
+            let f = up.pending().unwrap();
+            if pred(&f) {
+                return f;
+            }
+            tokio::time::sleep(Duration::from_millis(10)).await;
+        }
+    })
+    .await
+    .expect("host fact")
+}
+fn evidence(f: &[HostFrame]) -> hennery_proto::delegation_host::ConfigEvidence {
+    f.iter()
+        .rev()
+        .find_map(|f| match f {
+            HostFrame::Session {
+                body:
+                    SessionBody::SessionStarted { indexed, .. }
+                    | SessionBody::ConfigApplied { indexed, .. }
+                    | SessionBody::AcpUpdate { indexed, .. },
+                ..
+            } => indexed.config_evidence.as_deref().cloned(),
+            _ => None,
+        })
+        .expect("generation-bound evidence")
+}
+fn launch(root: &Path, script: FakeScript, attach: Attach) -> Launch {
+    Launch {
+        request_id: "start".into(),
+        session_id: "s".into(),
+        attach,
+        config: SessionConfig::default(),
+        agent: fake(script, root),
+        cwd: root.canonicalize().unwrap(),
+        profile: Profile::Generic,
+        mcp_servers: vec![],
+    }
+}
+fn prompt(expected: PromptFence, request: &str) -> SessionCmd {
+    SessionCmd::FencedPrompt {
+        request_id: request.into(),
+        turn_id: request.into(),
+        content: vec![json!({"type":"text","text":"brief"})],
+        expected,
+    }
+}
+async fn stop(handle: session::SessionHandle) {
+    handle.send(SessionCmd::Close {
+        request_id: "close".into(),
+    });
+    handle.finished().await;
+}
+
+#[test]
+fn workspace_fence_rejects_outside_and_symlink_swap() {
+    let root = tempfile::tempdir().unwrap();
+    let outside = tempfile::tempdir().unwrap();
+    let cwd = root.path().canonicalize().unwrap();
+    assert_eq!(
+        checked_cwd(cwd.to_str().unwrap(), std::slice::from_ref(&cwd)).unwrap(),
+        cwd
+    );
+    assert!(
+        checked_cwd(
+            outside.path().canonicalize().unwrap().to_str().unwrap(),
+            std::slice::from_ref(&cwd)
+        )
+        .is_err()
+    );
+    assert!(checked_cwd(cwd.to_str().unwrap(), &[]).is_err());
+    std::os::unix::fs::symlink(outside.path(), cwd.join("swapped")).unwrap();
+    assert!(checked_cwd(cwd.join("swapped").to_str().unwrap(), &[cwd]).is_err());
+    let cwd = root.path().canonicalize().unwrap();
+    std::fs::create_dir(cwd.join("inside")).unwrap();
+    std::os::unix::fs::symlink(cwd.join("inside"), cwd.join("alias")).unwrap();
+    assert!(checked_cwd(cwd.join("alias").to_str().unwrap(), std::slice::from_ref(&cwd)).is_err());
+}
+#[test]
+fn security_is_profile_bound_and_never_authorizes_bypass() {
+    let safe = security_classification(Profile::Claude);
+    assert!(safe.known);
+    assert!(safe.axes["mode"].contains(&ConfigValue::Id("default".into())));
+    assert!(!safe.axes["mode"].contains(&ConfigValue::Id("bypassPermissions".into())));
+    assert!(!security_classification(Profile::Generic).known);
+    assert!(!security_classification(Profile::ClaudeOwnCli).known);
+    let codex = security_classification(Profile::Codex);
+    assert!(codex.known);
+    assert_eq!(codex.axes["mode"], vec![ConfigValue::Id("read-only".into())]);
+}
+#[tokio::test]
+async fn cold_catalog_uses_selected_adapter_without_prompt_or_mcp() {
+    let root = tempfile::tempdir().unwrap();
+    let cwd = root.path().canonicalize().unwrap();
+    let log = cwd.join("sessions");
+    let mut s = script();
+    s.session_log = Some(log.display().to_string());
+    s.prompt_error = Some("no prompt allowed".into());
+    let probes = CatalogProbes::new(1, Duration::from_secs(10));
+    let result = probes
+        .catalog("chosen", fake(s, &cwd), Profile::Claude, cwd.clone(), vec![cwd.clone()])
+        .await
+        .unwrap();
+    assert_eq!(result.agent, "chosen");
+    assert_eq!(result.defaults.model.as_deref(), Some("small"));
+    assert!(!result.adapter_revision.is_empty());
+    assert!(result.security.known);
+    assert_eq!(
+        result.freshness,
+        hennery_proto::delegation_host::CatalogFreshness::Fresh
+    );
+    let requests = std::fs::read_to_string(log).unwrap();
+    let first: serde_json::Value = serde_json::from_str(requests.lines().next().unwrap()).unwrap();
+    assert_eq!(first["params"]["mcpServers"], json!([]));
+    assert_eq!(requests.lines().count(), 1);
+}
+#[tokio::test]
+async fn catalog_timeout_releases_permit_and_leaves_no_adapter() {
+    let root = tempfile::tempdir().unwrap();
+    let cwd = root.path().canonicalize().unwrap();
+    let probes = CatalogProbes::new(1, Duration::from_secs(2));
+    let pid_file = cwd.join("probe.pid");
+    let hanging = AgentCommand {
+        program: "sh".into(),
+        args: vec!["-c".into(), "echo $$ > \"$PROBE_PID_FILE\"; exec sleep 100".into()],
+        env: vec![("PROBE_PID_FILE".into(), pid_file.display().to_string())],
+    };
+    assert!(
+        probes
+            .catalog("hang", hanging, Profile::Generic, cwd.clone(), vec![cwd.clone()])
+            .await
+            .is_err()
+    );
+    let pid: i32 = std::fs::read_to_string(pid_file).unwrap().trim().parse().unwrap();
+    assert!(!hennery_testkit::pid_alive(pid), "probe process survived timeout");
+    assert!(
+        probes
+            .catalog("fine", fake(script(), &cwd), Profile::Generic, cwd.clone(), vec![cwd])
+            .await
+            .is_ok()
+    );
+}
+#[tokio::test]
+async fn fresh_attach_evidence_admits_matching_prompt_and_rejects_stale_generation() {
+    let root = tempfile::tempdir().unwrap();
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let h = session::launch_delegated(
+        up.clone(),
+        launch(root.path(), script(), Attach::New),
+        SessionOptions::default(),
+        9,
+    );
+    let f = until(&up, |f| !f.is_empty()).await;
+    let ev = evidence(&f);
+    assert_eq!(ev.attach_generation, 9);
+    assert_eq!(ev.completeness, ConfigCompleteness::Complete);
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 8,
+            config_revision: ev.config_revision,
+        },
+        "stale",
+    ));
+    assert!(
+        matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+    );
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 9,
+            config_revision: ev.config_revision,
+        },
+        "fresh",
+    ));
+    until(&up, |f| {
+        f.iter().any(|f| {
+            matches!(
+                f,
+                HostFrame::Session {
+                    body: SessionBody::TurnEnded { .. },
+                    ..
+                }
+            )
+        })
+    })
+    .await;
+    stop(h).await;
+}
+#[tokio::test]
+async fn no_resume_readback_is_not_old_configuration_evidence() {
+    let root = tempfile::tempdir().unwrap();
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let mut s = script();
+    s.config_in_update_only = true;
+    let h = session::launch_delegated(
+        up.clone(),
+        launch(
+            root.path(),
+            s,
+            Attach::Load {
+                agent_session_id: "old".into(),
+            },
+        ),
+        SessionOptions::default(),
+        12,
+    );
+    let ev = evidence(&until(&up, |f| !f.is_empty()).await);
+    assert_eq!(ev.completeness, ConfigCompleteness::Partial);
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 12,
+            config_revision: ev.config_revision,
+        },
+        "held",
+    ));
+    assert!(
+        matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+    );
+    stop(h).await;
+}
+#[tokio::test]
+async fn switch_in_flight_fences_prompt_then_new_readback_repairs() {
+    let root = tempfile::tempdir().unwrap();
+    let marker = root.path().join("answer");
+    let log = root.path().join("switches");
+    let mut s = script();
+    s.model_switch_answer_on_file = Some(marker.display().to_string());
+    s.config_log = Some(log.display().to_string());
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let h = session::launch_delegated(
+        up.clone(),
+        launch(root.path(), s, Attach::New),
+        SessionOptions::default(),
+        2,
+    );
+    let ev = evidence(&until(&up, |f| !f.is_empty()).await);
+    h.send(SessionCmd::SetConfig {
+        request_id: "switch".into(),
+        config_id: "model".into(),
+        value: ConfigValue::Id("large".into()),
+    });
+    tokio::time::timeout(Duration::from_secs(10), async {
+        while !log.exists() {
+            tokio::time::sleep(Duration::from_millis(10)).await
+        }
+    })
+    .await
+    .unwrap();
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 2,
+            config_revision: ev.config_revision,
+        },
+        "old",
+    ));
+    assert!(
+        matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+    );
+    std::fs::write(marker, "").unwrap();
+    let f = until(&up, |f| {
+        f.iter().any(|f| {
+            matches!(
+                f,
+                HostFrame::Session {
+                    body: SessionBody::ConfigApplied { .. },
+                    ..
+                }
+            )
+        })
+    })
+    .await;
+    let new = evidence(&f);
+    assert!(new.config_revision > ev.config_revision);
+    assert_eq!(new.actual.model.as_deref(), Some("large"));
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 2,
+            config_revision: new.config_revision,
+        },
+        "repaired",
+    ));
+    until(&up, |f| {
+        f.iter().any(|f| {
+            matches!(
+                f,
+                HostFrame::Session {
+                    body: SessionBody::TurnEnded { .. },
+                    ..
+                }
+            )
+        })
+    })
+    .await;
+    stop(h).await;
+}
+#[tokio::test]
+async fn failed_or_empty_reapply_never_produces_complete_evidence() {
+    for empty in [false, true] {
+        let root = tempfile::tempdir().unwrap();
+        let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+        let mut s = script();
+        s.empty_config_read_back = empty;
+        if !empty {
+            s.config_in_update_only = true;
+            s.config_error = Some("cannot reapply".into());
+        }
+        let mut launch = launch(
+            root.path(),
+            s,
+            Attach::Load {
+                agent_session_id: "old".into(),
+            },
+        );
+        launch.config.model = Some("large".into());
+        let h = session::launch_delegated(up.clone(), launch, SessionOptions::default(), 4);
+        let ev = evidence(&until(&up, |f| !f.is_empty()).await);
+        assert_eq!(ev.completeness, ConfigCompleteness::Partial);
+        assert!(ev.actual.is_empty());
+        h.send(prompt(
+            PromptFence {
+                attach_generation: 4,
+                config_revision: ev.config_revision,
+            },
+            "held",
+        ));
+        assert!(
+            matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+        );
+        stop(h).await;
+    }
+}
+#[tokio::test]
+async fn independent_config_notification_advances_fence() {
+    let root = tempfile::tempdir().unwrap();
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let mut s = script();
+    s.prompt_sets_mode = Some("bypass".into());
+    let h = session::launch_delegated(
+        up.clone(),
+        launch(root.path(), s, Attach::New),
+        SessionOptions::default(),
+        7,
+    );
+    let ev = evidence(&until(&up, |f| !f.is_empty()).await);
+    let old = PromptFence {
+        attach_generation: 7,
+        config_revision: ev.config_revision,
+    };
+    h.send(prompt(old.clone(), "first"));
+    let f = until(&up, |f| {
+        f.iter().any(|f| {
+            matches!(
+                f,
+                HostFrame::Session {
+                    body: SessionBody::TurnEnded { .. },
+                    ..
+                }
+            )
+        })
+    })
+    .await;
+    let current = evidence(&f);
+    assert!(current.config_revision > ev.config_revision);
+    assert_eq!(current.actual.mode.as_deref(), Some("bypass"));
+    h.send(prompt(old, "late"));
+    assert!(
+        matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+    );
+    stop(h).await;
+}
+
+#[tokio::test]
+async fn delegated_actor_rechecks_roots_immediately_before_spawn() {
+    let root = tempfile::tempdir().unwrap();
+    let outside = tempfile::tempdir().unwrap();
+    let (up, _replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let h = session::launch_delegated_in(
+        up.clone(),
+        launch(outside.path(), script(), Attach::New),
+        SessionOptions::default(),
+        1,
+        vec![root.path().canonicalize().unwrap()],
+    );
+    let f = until(&up, |f| !f.is_empty()).await;
+    assert!(matches!(&f[0],HostFrame::Session{body:SessionBody::StartFailed{code,..},..} if code=="cwd_unavailable"));
+    h.finished().await;
+}
+
+#[tokio::test]
+async fn host_wire_routes_catalog_attach_and_fenced_prompt() {
+    use futures::{SinkExt, StreamExt};
+    use hennery_host::{HostConfig, identity::HostKey};
+    use hennery_proto::{
+        HELLO_NONCE_HEADER, PROTOCOL_VERSION,
+        frames::{Capability, CollectorFrame},
+    };
+    use tokio_tungstenite::tungstenite::Message;
+    let root = tempfile::tempdir().unwrap();
+    let cwd = root.path().canonicalize().unwrap();
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let addr = listener.local_addr().unwrap();
+    let mut cfg = HostConfig::new(
+        format!("ws://{addr}/api/hosts/ws"),
+        "host-test",
+        HostKey::from_seed([8; 32]),
+        cwd.join("host"),
+    );
+    cfg.agents.insert("chosen".into(), fake(script(), &cwd));
+    cfg.workspace_roots = vec![cwd.clone()];
+    cfg.git = None;
+    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();
+    let task = tokio::spawn(hennery_host::run_until(cfg, async {
+        let _ = shutdown_rx.await;
+    }));
+    let (tcp, _) = listener.accept().await.unwrap();
+    struct Nonce;
+    impl tokio_tungstenite::tungstenite::handshake::server::Callback for Nonce {
+        fn on_request(
+            self,
+            _: &tokio_tungstenite::tungstenite::handshake::server::Request,
+            mut response: tokio_tungstenite::tungstenite::handshake::server::Response,
+        ) -> Result<
+            tokio_tungstenite::tungstenite::handshake::server::Response,
+            tokio_tungstenite::tungstenite::handshake::server::ErrorResponse,
+        > {
+            response
+                .headers_mut()
+                .insert(HELLO_NONCE_HEADER, hex::encode([5u8; 32]).parse().unwrap());
+            Ok(response)
+        }
+    }
+    let mut ws = tokio_tungstenite::accept_hdr_async(tcp, Nonce).await.unwrap();
+    async fn read(ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>) -> HostFrame {
+        tokio::time::timeout(Duration::from_secs(20), async {
+            loop {
+                if let Some(Ok(Message::Text(s))) = ws.next().await {
+                    return serde_json::from_str(&s).unwrap();
+                }
+            }
+        })
+        .await
+        .unwrap()
+    }
+    async fn send(ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>, frame: CollectorFrame) {
+        ws.send(Message::text(serde_json::to_string(&frame).unwrap()))
+            .await
+            .unwrap();
+    }
+    match read(&mut ws).await {
+        HostFrame::Hello {
+            capabilities,
+            mcp_isolation,
+            ..
+        } => {
+            assert!(capabilities.has(Capability::CatalogProbe));
+            assert!(capabilities.has(Capability::DelegationConfig));
+            assert!(mcp_isolation.0.contains_key("chosen"));
+        }
+        other => panic!("{other:?}"),
+    }
+    send(
+        &mut ws,
+        CollectorFrame::HelloAck {
+            protocol_version: PROTOCOL_VERSION.into(),
+            collector_version: "test".into(),
+            committed: Default::default(),
+        },
+    )
+    .await;
+    assert!(matches!(read(&mut ws).await, HostFrame::ResendComplete));
+    send(
+        &mut ws,
+        CollectorFrame::ProbeCatalog {
+            request_id: "catalog".into(),
+            agent: "chosen".into(),
+            cwd: cwd.display().to_string(),
+        },
+    )
+    .await;
+    assert!(
+        matches!(read(&mut ws).await,HostFrame::Catalog{catalog,..} if catalog.defaults.model.as_deref()==Some("small"))
+    );
+    let attach = |generation| CollectorFrame::DelegatedAttach {
+        request_id: format!("attach-{generation}"),
+        session_id: "wire-child".into(),
+        committed_seq: 0,
+        agent: "chosen".into(),
+        cwd: cwd.display().to_string(),
+        config: SessionConfig::default(),
+        hat_id: "hat-test".into(),
+        mcp: Default::default(),
+        attach_generation: generation,
+        agent_session_id: None,
+    };
+    send(&mut ws, attach(3)).await;
+    let evidence = match read(&mut ws).await {
+        HostFrame::Session {
+            body: SessionBody::SessionStarted { indexed, .. },
+            ..
+        } => indexed.config_evidence.unwrap(),
+        other => panic!("{other:?}"),
+    };
+    assert_eq!(evidence.attach_generation, 3);
+    send(&mut ws, attach(4)).await;
+    assert!(matches!(read(&mut ws).await,HostFrame::Error{code,..} if code=="attach_generation_conflict"));
+    let prompt = |generation, id: &str| CollectorFrame::DelegatedPrompt {
+        request_id: id.into(),
+        session_id: "wire-child".into(),
+        turn_id: id.into(),
+        content: vec![json!({"type":"text","text":"brief"})],
+        expected: PromptFence {
+            attach_generation: generation,
+            config_revision: evidence.config_revision,
+        },
+    };
+    send(&mut ws, prompt(2, "stale")).await;
+    assert!(matches!(read(&mut ws).await,HostFrame::Error{code,..} if code=="config_fence"));
+    send(&mut ws, prompt(3, "fresh")).await;
+    loop {
+        if matches!(
+            read(&mut ws).await,
+            HostFrame::Session {
+                body: SessionBody::TurnEnded { .. },
+                ..
+            }
+        ) {
+            break;
+        }
+    }
+    send(
+        &mut ws,
+        CollectorFrame::CloseSession {
+            request_id: "close".into(),
+            session_id: "wire-child".into(),
+        },
+    )
+    .await;
+    assert!(matches!(
+        read(&mut ws).await,
+        HostFrame::Session {
+            body: SessionBody::SessionClosed,
+            ..
+        }
+    ));
+    shutdown_tx.send(()).unwrap();
+    tokio::time::timeout(Duration::from_secs(20), task)
+        .await
+        .unwrap()
+        .unwrap()
+        .unwrap();
+}
+
+#[tokio::test]
+async fn zero_probe_capacity_is_busy_without_starting_adapter() {
+    let root = tempfile::tempdir().unwrap();
+    let cwd = root.path().canonicalize().unwrap();
+    let err = CatalogProbes::new(0, Duration::from_secs(1))
+        .catalog("none", fake(script(), &cwd), Profile::Generic, cwd.clone(), vec![cwd])
+        .await
+        .unwrap_err();
+    assert_eq!(err.to_string(), "busy");
+}
+
+#[tokio::test]
+async fn absent_catalog_is_unknown_and_never_admits_a_prompt() {
+    let root = tempfile::tempdir().unwrap();
+    let cwd = root.path().canonicalize().unwrap();
+    let catalog = CatalogProbes::new(1, Duration::from_secs(10))
+        .catalog(
+            "none",
+            fake(FakeScript::default(), &cwd),
+            Profile::Generic,
+            cwd.clone(),
+            vec![cwd],
+        )
+        .await
+        .unwrap();
+    assert_eq!(
+        catalog.freshness,
+        hennery_proto::delegation_host::CatalogFreshness::Unknown
+    );
+    assert!(catalog.defaults.is_empty());
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let h = session::launch_delegated(
+        up.clone(),
+        launch(root.path(), FakeScript::default(), Attach::New),
+        SessionOptions::default(),
+        5,
+    );
+    let ev = evidence(&until(&up, |f| !f.is_empty()).await);
+    assert_eq!(ev.completeness, ConfigCompleteness::Unknown);
+    assert!(ev.actual.is_empty());
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 5,
+            config_revision: ev.config_revision,
+        },
+        "held",
+    ));
+    assert!(
+        matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+    );
+    stop(h).await;
+}
+
+#[tokio::test]
+async fn out_of_turn_question_fences_delegated_prompt() {
+    let root = tempfile::tempdir().unwrap();
+    let mut s = script();
+    s.ask_on_load = true;
+    s.asks = vec![hennery_testkit::FakeAsk::Permission];
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let h = session::launch_delegated(
+        up.clone(),
+        launch(
+            root.path(),
+            s,
+            Attach::Load {
+                agent_session_id: "old".into(),
+            },
+        ),
+        SessionOptions::default(),
+        6,
+    );
+    let f = until(&up, |f| {
+        f.iter().any(|f| {
+            matches!(
+                f,
+                HostFrame::Session {
+                    body: SessionBody::PendingOpened { .. },
+                    ..
+                }
+            )
+        })
+    })
+    .await;
+    let ev = evidence(&f);
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 6,
+            config_revision: ev.config_revision,
+        },
+        "held",
+    ));
+    assert!(
+        matches!(tokio::time::timeout(Duration::from_secs(5),replies.recv()).await.unwrap().unwrap(),HostFrame::Error{code,..} if code=="config_fence")
+    );
+    stop(h).await;
+}
+
+#[tokio::test]
+async fn queued_close_fences_prompt_before_actor_reads_close() {
+    let root = tempfile::tempdir().unwrap();
+    let (up, mut replies) = Uplink::new(Outbox::open_in_memory().unwrap());
+    let hooks = hennery_host::session::test_hooks::TestHooks::hold_after_first_switch();
+    let options = SessionOptions {
+        test_hooks: Some(hooks.clone()),
+        ..Default::default()
+    };
+    let h = session::launch_delegated(up.clone(), launch(root.path(), script(), Attach::New), options, 8);
+    let ev = evidence(&until(&up, |f| !f.is_empty()).await);
+    h.send(SessionCmd::SetConfig {
+        request_id: "switch".into(),
+        config_id: "model".into(),
+        value: ConfigValue::Id("large".into()),
+    });
+    tokio::time::timeout(Duration::from_secs(20), hooks.holding())
+        .await
+        .unwrap();
+    tokio::time::timeout(Duration::from_secs(20), hooks.answers_queued(1))
+        .await
+        .unwrap();
+    h.send(prompt(
+        PromptFence {
+            attach_generation: 8,
+            config_revision: ev.config_revision + 1,
+        },
+        "fenced-by-close",
+    ));
+    h.send(SessionCmd::Close {
+        request_id: "close".into(),
+    });
+    hooks.release();
+    tokio::time::timeout(Duration::from_secs(20), h.finished())
+        .await
+        .unwrap();
+    assert!(matches!(replies.try_recv().unwrap(),HostFrame::Error{code,..} if code=="config_fence"));
+    assert!(!up.pending().unwrap().iter().any(|f| matches!(
+        f,
+        HostFrame::Session {
+            body: SessionBody::TurnStarted { .. },
+            ..
+        }
+    )));
+}
diff --git a/crates/hennery-testkit/tests/host_connection.rs b/crates/hennery-testkit/tests/host_connection.rs
index f502f4a0d702cdabeb659adfd3df1aa8a37441b8..593a26ab6661c3de8d3936962774de0cd8420e65 100644
--- a/crates/hennery-testkit/tests/host_connection.rs
+++ b/crates/hennery-testkit/tests/host_connection.rs
@@ -822,6 +822,8 @@ async fn a_host_announces_that_it_can_park_take_images_and_serve_projects() {
             Capability::ResolvePath,
             Capability::ForgetSession,
             Capability::McpServers,
+            Capability::CatalogProbe,
+            Capability::DelegationConfig,
         ])
     );
 }
```

Run:

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_host --locked # expected exit 101
```

### Task 2, step 2: feat(delegation): probe configured runtimes and fence host prompts

- [x] Implement the preceding contract; each listed GREEN command must succeed.

<!-- replay {"subject":"feat(delegation): probe configured runtimes and fence host prompts","tree":"a8dd53cdc54b0123020606daff702d69fd30cce7","checks":[["cargo test -p hennery-testkit --test delegation_host --locked",0],["cargo test -p hennery-host --locked",0]]} -->
```diff
diff --git a/crates/hennery-host/src/connection.rs b/crates/hennery-host/src/connection.rs
index 87742836cee458495bd49f550b4ec6889f7aa0c5..e117e195dcd9b2959b979a7f85bc6af002f85966 100644
--- a/crates/hennery-host/src/connection.rs
+++ b/crates/hennery-host/src/connection.rs
@@ -379,6 +379,8 @@ async fn handshake(
                 Capability::ResolvePath,
                 Capability::ForgetSession,
                 Capability::McpServers,
+                Capability::CatalogProbe,
+                Capability::DelegationConfig,
             ]),
             mcp_isolation: announce.mcp_isolation,
             workspace_roots: announce.workspace_roots,
@@ -561,6 +563,8 @@ fn not_attached(uplink: &Uplink, request_id: String) {

 /// A `start_session` or `resume_session`.
 struct AttachRequest {
+    generation: Option<u64>,
+    roots: Vec<PathBuf>,
     request_id: String,
     session_id: String,
     committed_seq: u64,
@@ -698,6 +702,17 @@ fn spawn_or_restart(
         });
         return;
     }
+    if let Some(handle) = map.handles.get(&req.session_id).filter(|h| !h.is_ended())
+        && req.generation.is_some()
+        && handle.attach_generation() != req.generation
+    {
+        uplink.reply(HostFrame::Error {
+            request_id: req.request_id,
+            code: "attach_generation_conflict".into(),
+            message: "attached generation differs".into(),
+        });
+        return;
+    }
     if let Some(handle) = map.handles.get(&req.session_id).filter(|h| !h.is_ended())
         && handle.send(SessionCmd::Restart {
             request_id: req.request_id.clone(),
@@ -715,8 +730,11 @@ fn spawn_or_restart(
         profile,
         mcp_servers: req.mcp.mcp_servers,
     };
-    map.handles
-        .insert(req.session_id, session::launch(uplink.clone(), launch, options));
+    let handle = match req.generation {
+        Some(generation) => session::launch_delegated_in(uplink.clone(), launch, options, generation, req.roots),
+        None => session::launch(uplink.clone(), launch, options),
+    };
+    map.handles.insert(req.session_id, handle);
 }

 fn handle(
@@ -728,6 +746,88 @@ fn handle(
     frame: CollectorFrame,
 ) -> Result<()> {
     match frame {
+        CollectorFrame::ProbeCatalog { request_id, agent, cwd } => {
+            let Some(command) = cfg.agents.get(&agent).cloned() else {
+                uplink.reply(HostFrame::Error {
+                    request_id,
+                    code: "unknown_agent".into(),
+                    message: "runtime unavailable".into(),
+                });
+                return Ok(());
+            };
+            let (catalogs, profile, roots, uplink) = (
+                probes.catalog.clone(),
+                cfg.profile(&agent),
+                cfg.workspace_roots.clone(),
+                uplink.clone(),
+            );
+            tokio::spawn(async move {
+                let result = catalogs
+                    .catalog(&agent, command, profile, PathBuf::from(cwd), roots)
+                    .await;
+                uplink.reply(match result {
+                    Ok(catalog) => HostFrame::Catalog { request_id, catalog },
+                    Err(error) => HostFrame::Error {
+                        request_id,
+                        code: if error.to_string() == "busy" {
+                            "busy"
+                        } else {
+                            "catalog_unavailable"
+                        }
+                        .into(),
+                        message: "runtime catalog unavailable".into(),
+                    },
+                });
+            });
+        }
+        CollectorFrame::DelegatedAttach {
+            request_id,
+            session_id,
+            committed_seq,
+            agent,
+            cwd,
+            config,
+            hat_id: _,
+            mcp,
+            attach_generation,
+            agent_session_id,
+        } => attach(
+            cfg,
+            uplink,
+            sessions,
+            homes,
+            AttachRequest {
+                generation: Some(attach_generation),
+                roots: cfg.workspace_roots.clone(),
+                request_id,
+                session_id,
+                committed_seq,
+                agent,
+                cwd,
+                config,
+                mcp,
+                attach: match agent_session_id {
+                    Some(agent_session_id) => Attach::Load { agent_session_id },
+                    None => Attach::New,
+                },
+            },
+        )?,
+        CollectorFrame::DelegatedPrompt {
+            request_id,
+            session_id,
+            turn_id,
+            content,
+            expected,
+        } => match live_session(sessions, &session_id) {
+            Some(handle)
+                if handle.send(SessionCmd::FencedPrompt {
+                    request_id: request_id.clone(),
+                    turn_id,
+                    content,
+                    expected,
+                }) => {}
+            _ => not_attached(uplink, request_id),
+        },
         CollectorFrame::StartSession {
             request_id,
             session_id,
@@ -744,6 +844,8 @@ fn handle(
             sessions,
             homes,
             AttachRequest {
+                generation: None,
+                roots: cfg.workspace_roots.clone(),
                 request_id,
                 session_id,
                 committed_seq,
@@ -770,6 +872,8 @@ fn handle(
             sessions,
             homes,
             AttachRequest {
+                generation: None,
+                roots: cfg.workspace_roots.clone(),
                 request_id,
                 session_id,
                 committed_seq,
diff --git a/crates/hennery-host/src/delegation.rs b/crates/hennery-host/src/delegation.rs
new file mode 100644
index 0000000000000000000000000000000000000000..ff10d0a627c2cd08829b56381db4ab5f2e18548b
--- /dev/null
+++ b/crates/hennery-host/src/delegation.rs
@@ -0,0 +1,100 @@
+//! Bounded disposable adapter discovery and the host's workspace boundary.
+
+use crate::{AgentCommand, profile::Profile};
+use anyhow::{Context, Result, ensure};
+use hennery_proto::{
+    delegation_host::{CatalogFreshness, HostCatalog, SecurityClassification},
+    frames::ConfigValue,
+};
+use sha2::{Digest, Sha256};
+use std::{
+    collections::BTreeMap,
+    path::{Path, PathBuf},
+    sync::Arc,
+    time::Duration,
+};
+use tokio::sync::Semaphore;
+
+pub fn checked_cwd(cwd: &str, roots: &[PathBuf]) -> Result<PathBuf> {
+    let resolved = crate::paths::resolve(cwd, None).map_err(anyhow::Error::msg)?;
+    ensure!(resolved.is_dir && resolved.canonical == cwd, "cwd_unavailable");
+    let inside = roots.iter().any(|root| {
+        let Ok(canonical) = root.canonicalize() else {
+            return false;
+        };
+        canonical.is_dir() && Path::new(cwd).starts_with(canonical)
+    });
+    ensure!(inside, "cwd_unavailable");
+    Ok(PathBuf::from(cwd))
+}
+
+/// Security decisions come from the installed profile, never an adapter's
+/// display labels or model-supplied category. Overrides remain unverified.
+pub fn security_classification(profile: Profile) -> SecurityClassification {
+    let safe: &[&str] = match profile {
+        Profile::Claude => &["default", "plan"],
+        Profile::Codex => &["read-only"],
+        Profile::ClaudeOwnCli | Profile::Generic => &[],
+    };
+    SecurityClassification {
+        known: !safe.is_empty(),
+        axes: if safe.is_empty() {
+            BTreeMap::new()
+        } else {
+            BTreeMap::from([(
+                "mode".into(),
+                safe.iter().map(|v| ConfigValue::Id((*v).into())).collect(),
+            )])
+        },
+    }
+}
+
+#[derive(Clone)]
+pub struct CatalogProbes {
+    slots: Arc<Semaphore>,
+    timeout: Duration,
+}
+
+impl Default for CatalogProbes {
+    fn default() -> Self {
+        Self::new(2, Duration::from_secs(30))
+    }
+}
+
+impl CatalogProbes {
+    pub fn new(capacity: usize, timeout: Duration) -> Self {
+        Self {
+            slots: Arc::new(Semaphore::new(capacity)),
+            timeout,
+        }
+    }
+
+    pub async fn catalog(
+        &self,
+        agent: &str,
+        command: AgentCommand,
+        profile: Profile,
+        cwd: PathBuf,
+        roots: Vec<PathBuf>,
+    ) -> Result<HostCatalog> {
+        let _permit = self.slots.clone().try_acquire_owned().context("busy")?;
+        checked_cwd(cwd.to_str().context("cwd_unavailable")?, &roots)?;
+        let indexed = crate::session::probe_catalog(&command, cwd, profile, self.timeout).await?;
+        let config_options = indexed.config_options.clone().unwrap_or_default();
+        let defaults = indexed.current_config().unwrap_or_default();
+        // Neither command arguments nor environment values leave this host.
+        let material = serde_json::to_vec(&(&command.program, &command.args, &command.env, &config_options))?;
+        Ok(HostCatalog {
+            agent: agent.into(),
+            adapter_revision: hex::encode(Sha256::digest(material)),
+            freshness: if config_options.is_empty() {
+                CatalogFreshness::Unknown
+            } else {
+                CatalogFreshness::Fresh
+            },
+            config_options,
+            defaults,
+            security: security_classification(profile),
+        })
+    }
+}
diff --git a/crates/hennery-host/src/lib.rs b/crates/hennery-host/src/lib.rs
index 4d0eec927a9110e665bc8773f2ae9d1ae160bfd1..05584f1b1cce927c004aad3a986c6ead2f25cbd9 100644
--- a/crates/hennery-host/src/lib.rs
+++ b/crates/hennery-host/src/lib.rs
@@ -4,6 +4,7 @@
 pub mod adapter;
 pub mod agent_home;
 pub mod connection;
+pub mod delegation;
 pub mod enrollment;
 pub mod forget;
 pub mod forget_codex;
diff --git a/crates/hennery-host/src/profile.rs b/crates/hennery-host/src/profile.rs
index 072b4070b994c4c71e787df9fddd3a8fdcd21762..0ba5bf6ec85aefb2fc4fac25a48b129c56cfcb2c 100644
--- a/crates/hennery-host/src/profile.rs
+++ b/crates/hennery-host/src/profile.rs
@@ -16,8 +16,10 @@ pub enum Profile {
     /// sent, but an override is unverified (ACP core §6), so the host
     /// reports no isolation.
     ClaudeOwnCli,
-    /// Anything else: a `--agent` command, and Codex until its composed
-    /// `CODEX_HOME` (plan 8h). No `_meta`, no isolation.
+    /// Pinned Codex adapter. Execution modes are known; MCP isolation is not.
+    Codex,
+    /// Anything else, including an arbitrary `--agent` command. No `_meta`,
+    /// no verified security profile and no MCP isolation.
     #[default]
     Generic,
 }
@@ -29,6 +31,7 @@ impl Profile {
         match (name, own_cli) {
             ("claude", false) => Self::Claude,
             ("claude", true) => Self::ClaudeOwnCli,
+            ("codex", false) => Self::Codex,
             _ => Self::Generic,
         }
     }
@@ -37,7 +40,7 @@ impl Profile {
     pub fn mcp_isolation(self) -> McpIsolation {
         match self {
             Self::Claude => McpIsolation::ClaudeStrict,
-            Self::ClaudeOwnCli | Self::Generic => McpIsolation::None,
+            Self::ClaudeOwnCli | Self::Codex | Self::Generic => McpIsolation::None,
         }
     }

@@ -57,7 +60,7 @@ impl Profile {
                 );
                 Some(meta)
             }
-            Self::Generic => None,
+            Self::Codex | Self::Generic => None,
         }
     }
 }
@@ -250,7 +253,7 @@ mod tests {
     fn only_the_pinned_claude_with_its_own_cli_is_isolated() {
         assert_eq!(Profile::of_installed("claude", false), Profile::Claude);
         assert_eq!(Profile::of_installed("claude", true), Profile::ClaudeOwnCli);
-        assert_eq!(Profile::of_installed("codex", false), Profile::Generic);
+        assert_eq!(Profile::of_installed("codex", false), Profile::Codex);
         assert_eq!(Profile::Claude.mcp_isolation(), McpIsolation::ClaudeStrict);
         assert_eq!(Profile::ClaudeOwnCli.mcp_isolation(), McpIsolation::None);
         assert_eq!(Profile::Generic.mcp_isolation(), McpIsolation::None);
diff --git a/crates/hennery-host/src/projects.rs b/crates/hennery-host/src/projects.rs
index 2351115e5c1b65e53525b17535d8bcc028c087b7..cfd0b7b63dd4749f35d6a622e174bc48059665e5 100644
--- a/crates/hennery-host/src/projects.rs
+++ b/crates/hennery-host/src/projects.rs
@@ -414,6 +414,7 @@ fn refusal_below(fence: &Fence, path: &Path, err: &std::io::Error) -> BrowseErro
 /// it is ready; another connection's reply is dropped by the collector.
 #[derive(Clone)]
 pub struct Probes {
+    pub(crate) catalog: crate::delegation::CatalogProbes,
     lists: Arc<Semaphore>,
     browses: Arc<Semaphore>,
     resolves: Arc<Semaphore>,
@@ -429,6 +430,7 @@ impl Default for Probes {
 impl Probes {
     pub fn with_capacity(limits: Limits, lists: usize, browses: usize) -> Self {
         Self {
+            catalog: crate::delegation::CatalogProbes::default(),
             lists: Arc::new(Semaphore::new(lists)),
             browses: Arc::new(Semaphore::new(browses)),
             resolves: Arc::new(Semaphore::new(MAX_RESOLVES)),
diff --git a/crates/hennery-host/src/session.rs b/crates/hennery-host/src/session.rs
index 4320e754c4b2999d5109591024c673cb7b3dfe06..f01f8cec22bd51c45e81027751f966b3f8cea7a2 100644
--- a/crates/hennery-host/src/session.rs
+++ b/crates/hennery-host/src/session.rs
@@ -20,6 +20,7 @@ use agent_client_protocol::schema::v1::{
 };
 use agent_client_protocol::schema::{MaybeUndefined, ProtocolVersion};
 use agent_client_protocol::{Agent, ByteStreams, Client, ConnectionTo, ErrorCode, Responder, UntypedMessage};
+use hennery_proto::delegation_host::{ConfigCompleteness, ConfigEvidence, PromptFence};
 use hennery_proto::frames::{
     ConfigValue, ElicitationAction, HostFrame, Indexed, McpServer, ParkReason, PendingExtract, PendingKind,
     PendingReason, PendingResolution, SessionBody, SessionConfig, TurnOutcome,
@@ -100,6 +101,12 @@ const STATE_KINDS: &[&str] = &[
 /// Messages from the connection task to a session actor.
 #[derive(Debug)]
 pub enum SessionCmd {
+    FencedPrompt {
+        request_id: String,
+        turn_id: String,
+        content: Vec<Value>,
+        expected: PromptFence,
+    },
     Prompt {
         request_id: String,
         turn_id: String,
@@ -249,6 +256,7 @@ pub struct Launch {
 /// The connection task's handle on a session actor.
 #[derive(Clone)]
 pub struct SessionHandle {
+    attach_generation: Option<u64>,
     commands: mpsc::UnboundedSender<SessionCmd>,
     open_turn: Arc<Mutex<Option<String>>>,
     /// Cancelled when the actor's task has finished (its adapter is gone).
@@ -263,6 +271,9 @@ pub struct SessionHandle {
 }

 impl SessionHandle {
+    pub fn attach_generation(&self) -> Option<u64> {
+        self.attach_generation
+    }
     /// The agent's own session id, if known yet (plan 9d B7): a forget for
     /// it is refused while this actor has not ended.
     pub fn agent_session_id(&self) -> Option<String> {
@@ -373,6 +384,38 @@ pub fn resume(
 /// Spawn a session actor for `launch`: `session/new` or `session/load`,
 /// then its config. Otherwise like [`spawn`].
 pub fn launch(uplink: Uplink, launch: Launch, options: SessionOptions) -> SessionHandle {
+    launch_inner(uplink, launch, options, None, None)
+}
+
+pub fn launch_delegated(
+    uplink: Uplink,
+    launch: Launch,
+    options: SessionOptions,
+    attach_generation: u64,
+) -> SessionHandle {
+    let roots = vec![launch.cwd.clone()];
+    launch_delegated_in(uplink, launch, options, attach_generation, roots)
+}
+
+/// The connection supplies its current canonical workspace roots. Rechecked
+/// in the actor immediately before `Adapter::spawn`, after scheduling delays.
+pub fn launch_delegated_in(
+    uplink: Uplink,
+    launch: Launch,
+    options: SessionOptions,
+    attach_generation: u64,
+    roots: Vec<PathBuf>,
+) -> SessionHandle {
+    launch_inner(uplink, launch, options, Some(attach_generation), Some(roots))
+}
+
+fn launch_inner(
+    uplink: Uplink,
+    launch: Launch,
+    options: SessionOptions,
+    attach_generation: Option<u64>,
+    workspace_roots: Option<Vec<PathBuf>>,
+) -> SessionHandle {
     let (tx, rx) = mpsc::unbounded_channel();
     let open_turn = Arc::new(Mutex::new(None));
     let ending = Arc::new(AtomicBool::new(false));
@@ -381,6 +424,9 @@ pub fn launch(uplink: Uplink, launch: Launch, options: SessionOptions) -> Sessio
         Attach::New => None,
     }));
     let actor = Actor {
+        workspace_roots,
+        attach_generation,
+        config_revision: AtomicU64::new(1),
         agent_session_id: agent_session_id.clone(),
         uplink,
         session_id: launch.session_id.clone(),
@@ -401,6 +447,7 @@ pub fn launch(uplink: Uplink, launch: Launch, options: SessionOptions) -> Sessio
         actor.run(launch, rx).await;
     });
     SessionHandle {
+        attach_generation,
         commands: tx,
         open_turn,
         done,
@@ -754,6 +801,9 @@ impl Drop for AcpTask {
 }

 struct Actor {
+    workspace_roots: Option<Vec<PathBuf>>,
+    attach_generation: Option<u64>,
+    config_revision: AtomicU64,
     uplink: Uplink,
     session_id: String,
     open_turn: Arc<Mutex<Option<String>>>,
@@ -796,11 +846,26 @@ impl Actor {
     /// stale.
     fn catalogue_extracts(&self) -> Indexed {
         let catalogue = self.catalogue.lock().expect("catalogue lock");
-        if catalogue.current {
+        let mut indexed = if catalogue.current {
             catalogue_extracts(&catalogue.options)
         } else {
             Indexed::default()
-        }
+        };
+        indexed.config_evidence = self.attach_generation.map(|attach_generation| {
+            Box::new(ConfigEvidence {
+                attach_generation,
+                config_revision: self.config_revision.load(Ordering::SeqCst),
+                completeness: if catalogue.current && !catalogue.options.is_empty() {
+                    ConfigCompleteness::Complete
+                } else if catalogue.options.is_empty() {
+                    ConfigCompleteness::Unknown
+                } else {
+                    ConfigCompleteness::Partial
+                },
+                actual: indexed.current_config().unwrap_or_default(),
+            })
+        });
+        indexed
     }

     /// This actor is about to end by itself: from now on a start or resume
@@ -893,6 +958,7 @@ impl Actor {
         while let Some(cmd) = commands.recv().await {
             match cmd {
                 SessionCmd::Prompt { request_id, .. }
+                | SessionCmd::FencedPrompt { request_id, .. }
                 | SessionCmd::Restart { request_id }
                 | SessionCmd::Park { request_id }
                 | SessionCmd::Close { request_id }
@@ -934,6 +1000,20 @@ impl Actor {
         // Where the agent's data is resolved from (plan 9d decision 1).
         let agent_env = agent.env.clone();
         let loaded = matches!(attach, Attach::Load { .. });
+        if let Some(roots) = &self.workspace_roots
+            && (self.attach_generation == Some(0)
+                || cwd
+                    .to_str()
+                    .is_none_or(|cwd| crate::delegation::checked_cwd(cwd, roots).is_err()))
+        {
+            return self.start_failed(
+                request_id,
+                StartError {
+                    code: "cwd_unavailable",
+                    message: "delegated workspace unavailable".into(),
+                },
+            );
+        }
         let (mut adapter, io) = match Adapter::spawn(&agent, &cwd) {
             Ok(spawned) => spawned,
             Err(err) => {
@@ -1171,7 +1251,12 @@ impl Actor {
                         adapter.terminate(self.options.kill_grace).await;
                         return;
                     }
-                    Some(SessionCmd::Prompt { request_id, turn_id, content }) => {
+                    Some(command @ SessionCmd::Prompt { .. }) | Some(command @ SessionCmd::FencedPrompt { .. }) => {
+                        let (request_id, turn_id, content, expected) = match command {
+                            SessionCmd::Prompt {request_id,turn_id,content} => (request_id,turn_id,content,None),
+                            SessionCmd::FencedPrompt {request_id,turn_id,content,expected} => (request_id,turn_id,content,Some(expected)),
+                            _ => unreachable!(),
+                        };
                         let blocks = match parse_prompt(content) {
                             Ok(blocks) => blocks,
                             Err(message) => {
@@ -1200,6 +1285,18 @@ impl Actor {
                         // now, not left for this new turn's own reply to
                         // discover (same pattern as the reply arm below).
                         self.send_next_switch(&conn, &agent_session, &switch_tx, &mut configs);
+                        if let Some(expected) = expected {
+                            let current = self.catalogue.lock().expect("catalogue lock");
+                            if self.attach_generation != Some(expected.attach_generation)
+                                || self.config_revision.load(Ordering::SeqCst) != expected.config_revision
+                                || !current.current || current.options.is_empty()
+                                || configs.out.is_some() || configs.orphan.is_some() || !configs.queued.is_empty()
+                                || self.ending.load(Ordering::SeqCst) || self.has_questions()
+                            {
+                                self.reject(request_id, "config_fence", "delegated configuration is not current".into());
+                                continue;
+                            }
+                        }
                         seen_turns.insert(turn_id.clone());
                         self.set_open_turn(Some(turn_id.clone()));
                         self.emit(SessionBody::TurnStarted { request_id, turn_id: turn_id.clone() });
@@ -1496,6 +1593,7 @@ impl Actor {
     /// empty one means the current values are unknown, not that the adapter
     /// has no options (decision 3).
     fn apply_read_back(&self, response: SetSessionConfigOptionResponse) {
+        self.config_revision.fetch_add(1, Ordering::SeqCst);
         let mut catalogue = self.catalogue.lock().expect("catalogue lock");
         if response.config_options.is_empty() {
             catalogue.current = false;
@@ -1848,12 +1946,14 @@ impl Actor {
         if let SessionBody::AcpUpdate { indexed, payload } = &mut body
             && let Some(options) = config_update(payload)
         {
+            self.config_revision.fetch_add(1, Ordering::SeqCst);
             *self.catalogue.lock().expect("catalogue lock") = Catalogue { options, current: true };
             let catalogue = self.catalogue_extracts();
             indexed.config_options = catalogue.config_options;
             indexed.current_model = catalogue.current_model;
             indexed.current_mode = catalogue.current_mode;
             indexed.current_axes = catalogue.current_axes;
+            indexed.config_evidence = catalogue.config_evidence;
         }
         body
     }
@@ -2127,6 +2227,69 @@ async fn negotiate(
     }
 }

+/// Discover a runtime's actual initial catalog using a disposable adapter.
+/// No user session, MCP entries, prompt, registry entry or outbox is created.
+/// Questions asked by startup hooks are refused, never sent to an operator.
+pub(crate) async fn probe_catalog(
+    command: &AgentCommand,
+    cwd: PathBuf,
+    profile: Profile,
+    bound: Duration,
+) -> anyhow::Result<Indexed> {
+    let (mut adapter, io) = Adapter::spawn(command, &cwd)?;
+    let result = tokio::time::timeout(bound, async {
+        let (updates_tx, mut updates) = mpsc::unbounded_channel::<Inbound>();
+        let (ready_tx, ready_rx) = oneshot::channel();
+        let (_stop_tx, stop_rx) = oneshot::channel::<()>();
+        let transport = ByteStreams::new(io.stdin.compat_write(), io.stdout.compat());
+        let _acp = AcpTask(tokio::spawn(async move {
+            let _ = Client
+                .builder()
+                .name("hennery-catalog-probe")
+                .on_receive_notification(
+                    async move |msg: UntypedMessage, _cx| {
+                        if msg.method == "session/update" {
+                            let _ = updates_tx.send(Inbound::Update(msg.params));
+                        }
+                        Ok(())
+                    },
+                    agent_client_protocol::on_receive_notification!(),
+                )
+                .on_receive_request(
+                    async move |msg: UntypedMessage, responder: Responder<Value>, _cx| {
+                        responder.respond_with_error(agent_client_protocol::Error::method_not_found().data(msg.method))
+                    },
+                    agent_client_protocol::on_receive_request!(),
+                )
+                .connect_with(transport, async move |conn: ConnectionTo<Agent>| {
+                    let _ = ready_tx.send(conn);
+                    let _ = stop_rx.await;
+                    Ok(())
+                })
+                .await;
+        }));
+        let conn = ready_rx
+            .await
+            .map_err(|_| anyhow::anyhow!("catalog transport unavailable"))?;
+        let mut replay = Replay::default();
+        let mcp = SessionMcp {
+            servers: vec![],
+            meta: profile.session_meta(),
+        };
+        let (_, catalog, _) = negotiate(&conn, cwd, &Attach::New, &mcp, &mut updates, &mut replay)
+            .await
+            .map_err(|_| anyhow::anyhow!("catalog negotiation failed"))?;
+        Ok(if catalog.authoritative {
+            catalogue_extracts(&catalog.options)
+        } else {
+            Indexed::default()
+        })
+    })
+    .await;
+    adapter.terminate(Duration::from_millis(250)).await;
+    result.map_err(|_| anyhow::anyhow!("catalog probe timed out"))?
+}
+
 /// What `session/new` and `session/load` carry besides the cwd (plan 8c):
 /// the session's MCP servers as ACP entries, and the profile's `_meta`.
 /// Never `Debug`: the entries hold the session's secrets.
diff --git a/crates/hennery-proto/src/codegen.rs b/crates/hennery-proto/src/codegen.rs
index de1927c4874fc6afd1e37f34710e0d9845ff12e0..003e68fa674f32923fd464bbdc3a12599bc32e53 100644
--- a/crates/hennery-proto/src/codegen.rs
+++ b/crates/hennery-proto/src/codegen.rs
@@ -56,6 +56,12 @@ pub fn render_schema() -> String {
         delegation::CloseArgs,
         delegation::OperationReceipt,
         delegation::OperationState,
+        crate::delegation_host::PromptFence,
+        crate::delegation_host::ConfigCompleteness,
+        crate::delegation_host::ConfigEvidence,
+        crate::delegation_host::CatalogFreshness,
+        crate::delegation_host::SecurityClassification,
+        crate::delegation_host::HostCatalog,
         plugin::PluginCapabilities,
         plugin::ForgetReceipt,
         frames::HostFrame,
@@ -226,6 +232,12 @@ pub fn render_ts() -> String {
         delegation::HatSessionTools,
         delegation::SetSessionTools,
         delegation::SessionFamily,
+        crate::delegation_host::PromptFence,
+        crate::delegation_host::ConfigCompleteness,
+        crate::delegation_host::ConfigEvidence,
+        crate::delegation_host::CatalogFreshness,
+        crate::delegation_host::SecurityClassification,
+        crate::delegation_host::HostCatalog,
         delegation::CapabilitiesArgs,
         delegation::SpawnArgs,
         delegation::SendArgs,
diff --git a/crates/hennery-proto/src/delegation_host.rs b/crates/hennery-proto/src/delegation_host.rs
new file mode 100644
index 0000000000000000000000000000000000000000..9f09509a5842a00f445d11857714348e8f5552ac
--- /dev/null
+++ b/crates/hennery-proto/src/delegation_host.rs
@@ -0,0 +1,63 @@
+//! Host-authored catalog and configuration evidence for delegated prompts.
+
+use crate::frames::{ConfigValue, SessionConfig};
+use schemars::JsonSchema;
+use serde::{Deserialize, Serialize};
+use serde_json::Value;
+use std::collections::BTreeMap;
+use ts_rs::TS;
+
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct PromptFence {
+    #[ts(type = "number")]
+    pub attach_generation: u64,
+    #[ts(type = "number")]
+    pub config_revision: u64,
+}
+
+#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(rename_all = "snake_case")]
+pub enum ConfigCompleteness {
+    Complete,
+    Partial,
+    Unknown,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ConfigEvidence {
+    #[ts(type = "number")]
+    pub attach_generation: u64,
+    #[ts(type = "number")]
+    pub config_revision: u64,
+    pub completeness: ConfigCompleteness,
+    pub actual: SessionConfig,
+}
+
+#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(rename_all = "snake_case")]
+pub enum CatalogFreshness {
+    Fresh,
+    Stale,
+    Unknown,
+}
+
+/// Profile-owned security axes and their baseline allowed values. `mode`
+/// means `SessionConfig.mode`; other keys name `SessionConfig.axes` entries.
+/// Unknown profiles require explicit operator configuration on the collector.
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct SecurityClassification {
+    pub known: bool,
+    pub axes: BTreeMap<String, Vec<ConfigValue>>,
+}
+
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct HostCatalog {
+    pub agent: String,
+    /// Opaque digest of the configured adapter command/environment and catalog.
+    pub adapter_revision: String,
+    #[ts(type = "unknown[]")]
+    pub config_options: Vec<Value>,
+    pub defaults: SessionConfig,
+    pub security: SecurityClassification,
+    pub freshness: CatalogFreshness,
+}
diff --git a/crates/hennery-proto/src/frames.rs b/crates/hennery-proto/src/frames.rs
index 8e6e30725443500798b887c29acdc95b1f4afa82..244093489f529eac2ddfce7ae52d177f8b239534 100644
--- a/crates/hennery-proto/src/frames.rs
+++ b/crates/hennery-proto/src/frames.rs
@@ -37,6 +37,10 @@ pub enum Capability {
     /// servers it cannot isolate unless the collector waived that
     /// (`mcp_isolation_unavailable`). A host without it gets no servers.
     McpServers,
+    /// Disposable runtime catalog discovery without a user prompt.
+    CatalogProbe,
+    /// Generation-bound evidence and serialized delegated prompt admission.
+    DelegationConfig,
 }

 /// The longest agent data root a host may report (plan 9d, O12's shape
@@ -577,6 +581,9 @@ impl SessionConfig {
 /// empty).
 #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
 pub struct Indexed {
+    /// Fresh host-produced configuration proof, never retained collector values.
+    #[serde(default, skip_serializing_if = "Option::is_none")]
+    pub config_evidence: Option<Box<crate::delegation_host::ConfigEvidence>>,
     #[serde(default, skip_serializing_if = "Option::is_none")]
     pub turn_id: Option<String>,
     /// On a `session_info_update` that names a title: the title the agent
@@ -792,6 +799,10 @@ pub struct DirEntry {
 #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
 #[serde(tag = "type", rename_all = "snake_case")]
 pub enum HostFrame {
+    Catalog {
+        request_id: String,
+        catalog: crate::delegation_host::HostCatalog,
+    },
     Hello {
         protocol_version: String,
         host_version: String,
@@ -899,6 +910,7 @@ impl CollectorFrame {
         match self {
             Self::ListProjects { .. } | Self::BrowseDirectory { .. } => Ok(Some(Capability::Projects)),
             Self::ResolvePath { .. } => Ok(Some(Capability::ResolvePath)),
+            Self::ProbeCatalog { .. } => Ok(Some(Capability::CatalogProbe)),
             // Not a probe of state, but carried as one (`session_forgotten`).
             Self::ForgetSession { .. } => Ok(Some(Capability::ForgetSession)),
             Self::HelloAck { .. }
@@ -906,6 +918,8 @@ impl CollectorFrame {
             | Self::StartSession { .. }
             | Self::ResumeSession { .. }
             | Self::Prompt { .. }
+            | Self::DelegatedAttach { .. }
+            | Self::DelegatedPrompt { .. }
             | Self::CancelTurn { .. }
             | Self::SetConfig { .. }
             | Self::AnswerPermission { .. }
@@ -923,10 +937,14 @@ impl CollectorFrame {
     /// compile.
     pub fn mcp_delivery(&self) -> Option<&McpDelivery> {
         match self {
-            Self::StartSession { mcp, .. } | Self::ResumeSession { mcp, .. } => Some(mcp),
+            Self::StartSession { mcp, .. } | Self::ResumeSession { mcp, .. } | Self::DelegatedAttach { mcp, .. } => {
+                Some(mcp)
+            }
             Self::HelloAck { .. }
             | Self::HelloError { .. }
             | Self::Prompt { .. }
+            | Self::DelegatedPrompt { .. }
+            | Self::ProbeCatalog { .. }
             | Self::CancelTurn { .. }
             | Self::SetConfig { .. }
             | Self::AnswerPermission { .. }
@@ -945,7 +963,9 @@ impl CollectorFrame {
     /// The agent a start or resume names.
     pub fn agent(&self) -> Option<&str> {
         match self {
-            Self::StartSession { agent, .. } | Self::ResumeSession { agent, .. } => Some(agent),
+            Self::StartSession { agent, .. }
+            | Self::ResumeSession { agent, .. }
+            | Self::DelegatedAttach { agent, .. } => Some(agent),
             _ => None,
         }
     }
@@ -957,7 +977,8 @@ impl HostFrame {
     /// or this does not compile (umbrella §5.4).
     pub fn probe_request_id(&self) -> Option<&str> {
         match self {
-            Self::Projects { request_id, .. }
+            Self::Catalog { request_id, .. }
+            | Self::Projects { request_id, .. }
             | Self::Directory { request_id, .. }
             | Self::ResolvedPath { request_id, .. }
             | Self::SessionForgotten { request_id, .. } => Some(request_id),
@@ -970,6 +991,37 @@ impl HostFrame {
 #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
 #[serde(tag = "type", rename_all = "snake_case")]
 pub enum CollectorFrame {
+    ProbeCatalog {
+        request_id: String,
+        agent: String,
+        cwd: String,
+    },
+    /// A delegated attach uses an independently allocated, nonzero generation.
+    /// `agent_session_id` absent starts a new adapter session; present loads it.
+    DelegatedAttach {
+        request_id: String,
+        session_id: String,
+        #[ts(type = "number")]
+        committed_seq: u64,
+        agent: String,
+        cwd: String,
+        #[serde(flatten)]
+        config: SessionConfig,
+        hat_id: String,
+        #[serde(flatten)]
+        mcp: McpDelivery,
+        #[ts(type = "number")]
+        attach_generation: u64,
+        agent_session_id: Option<String>,
+    },
+    DelegatedPrompt {
+        request_id: String,
+        session_id: String,
+        turn_id: String,
+        #[ts(type = "unknown[]")]
+        content: Vec<Value>,
+        expected: crate::delegation_host::PromptFence,
+    },
     HelloAck {
         protocol_version: String,
         collector_version: String,
diff --git a/crates/hennery-proto/src/lib.rs b/crates/hennery-proto/src/lib.rs
index e47bc59876091b463b81ae414f8397730b6ef87f..979b8082f4357a97cc08ca7571e819df9e001f47 100644
--- a/crates/hennery-proto/src/lib.rs
+++ b/crates/hennery-proto/src/lib.rs
@@ -4,6 +4,7 @@
 //! Schema and TypeScript are generated from these types by the `gen` binary;
 //! ACP payloads travel inside them as raw JSON and are never modelled here.

+pub mod delegation_host;
 pub mod frames;
 pub mod paths;
 pub mod plugin;
diff --git a/crates/hennery-sessions/src/ws.rs b/crates/hennery-sessions/src/ws.rs
index 4f382480d8375704cee086285a1fc9d59a136c4d..7323c9b749264d80449e266621102e7c31b29c74 100644
--- a/crates/hennery-sessions/src/ws.rs
+++ b/crates/hennery-sessions/src/ws.rs
@@ -443,6 +443,7 @@ async fn serve(socket: WebSocket, state: AppState, nonce: [u8; 32]) {
             // Probe replies answer the probe of this connection that they
             // name, if it still waits (ACP core §3.3).
             frame @ (HostFrame::Projects { .. }
+            | HostFrame::Catalog { .. }
             | HostFrame::Directory { .. }
             | HostFrame::ResolvedPath { .. }
             | HostFrame::SessionForgotten { .. }) => {
```

Run:

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_host --locked # expected exit 0
nix develop -c cargo test -p hennery-host --locked # expected exit 0
```

### Task 3, step 1: test(delegation): specify owned durable queue and ordinary answer fences

- [x] Specify the behavior; each listed command must produce the observed RED exit.

<!-- replay {"subject":"test(delegation): specify owned durable queue and ordinary answer fences","tree":"13c0c7f1d7b08b46eeecc1575a2ec2eb59c05814","checks":[["cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked",101],["cargo test -p hennery-sessions --test owner --test store --locked",101],["cargo test -p hennery-proto --test codegen --locked delegation_wire_dependencies_are_exported_once",101]]} -->
```diff
diff --git a/crates/hennery-proto/tests/codegen.rs b/crates/hennery-proto/tests/codegen.rs
index 00703ac04250a91665d1150ce7b05124bd51aaac..da09acb1d5c3662f051cef0673636123bc7419f4 100644
--- a/crates/hennery-proto/tests/codegen.rs
+++ b/crates/hennery-proto/tests/codegen.rs
@@ -1,6 +1,31 @@
 use hennery_proto::codegen::{SCHEMA_PATH, TS_PATH, render_schema, render_ts};
 use std::path::Path;

+#[test]
+fn delegation_wire_dependencies_are_exported_once() {
+    let ts = render_ts();
+    let schema: serde_json::Value = serde_json::from_str(&render_schema()).unwrap();
+    for name in [
+        "ExecutionPolicy",
+        "SetExecutionPolicy",
+        "DelegationLimits",
+        "CapabilitiesResult",
+        "ChildQuestion",
+        "ChildSummary",
+        "ChildList",
+        "ChildStatus",
+        "PromptFence",
+        "ConfigCompleteness",
+        "ConfigEvidence",
+        "CatalogFreshness",
+        "SecurityClassification",
+        "HostCatalog",
+    ] {
+        assert_eq!(ts.matches(&format!("export type {name} =")).count(), 1, "{name}");
+        assert!(schema["$defs"].get(name).is_some(), "{name}");
+    }
+}
+
 /// The generated output must not depend on which packages this test binary
 /// was built with: `cargo test --workspace` unifies `serde_json`'s
 /// `preserve_order` feature across the whole build graph (because
diff --git a/crates/hennery-sessions/tests/delegation.rs b/crates/hennery-sessions/tests/delegation.rs
index bb844ceff90429649f85991f1e5210a1f68f4a5e..3d1dfd0d0e05926002d4c6c2d386637157984344 100644
--- a/crates/hennery-sessions/tests/delegation.rs
+++ b/crates/hennery-sessions/tests/delegation.rs
@@ -442,3 +442,349 @@ fn purging_an_old_hat_scrubs_detached_edges_when_both_endpoints_moved() {
         .unwrap();
     assert_eq!(count, 2);
 }
+
+#[test]
+fn d2_followups_are_durable_idempotent_scoped_and_close_fenced() {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.start("unrelated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &parent, 1, "child", 0).unwrap());
+    tx.commit().unwrap();
+    w.active("child");
+    let first = w
+        .store
+        .queue_followup(&parent, 1, "key", "digest", "child", "hello")
+        .unwrap();
+    let again = w
+        .store
+        .queue_followup(&parent, 1, "key", "digest", "child", "hello")
+        .unwrap();
+    assert_eq!(first, again);
+    assert!(
+        w.store
+            .queue_followup(&parent, 1, "key", "other", "child", "changed")
+            .unwrap_err()
+            .to_string()
+            .contains("operation_conflict")
+    );
+    assert!(
+        w.store
+            .queue_followup(&parent, 1, "bad", "digest", "unrelated", "hidden")
+            .is_err()
+    );
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (1, 5));
+    w.store.record_close_request("parent").unwrap();
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (0, 0));
+    assert!(
+        w.store
+            .queue_followup(&parent, 1, "late", "digest", "child", "late")
+            .is_err()
+    );
+}
+
+#[test]
+fn d2_queue_caps_and_policy_changes_cancel_without_reviving() {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &parent, 1, "child", 0).unwrap());
+    tx.commit().unwrap();
+    for i in 0..32 {
+        w.store
+            .queue_followup(
+                &parent,
+                1,
+                &format!("key-{i}"),
+                &format!("digest-{i}"),
+                "child",
+                "hello",
+            )
+            .unwrap();
+    }
+    assert!(
+        w.store
+            .queue_followup(&parent, 1, "overflow", "digest", "child", "hello")
+            .unwrap_err()
+            .to_string()
+            .contains("queue_full")
+    );
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (32, 160));
+    w.gateway.set_session_tools(&w.hat, false).unwrap();
+    w.gateway.set_session_tools(&w.hat, true).unwrap();
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (0, 0));
+}
+
+fn child_world() -> (World, SessionIdentity) {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &parent, 1, "child", 0).unwrap());
+    tx.commit().unwrap();
+    w.active("child");
+    (w, parent)
+}
+#[test]
+fn d2_answers_reuse_the_operator_slot_but_permissions_require_operator() {
+    use hennery_proto::{
+        frames::{ElicitationAction, Indexed, PendingExtract, PendingKind},
+        rest::AnswerRequest,
+    };
+    let (w, parent) = child_world();
+    for (seq, id, kind) in [
+        (2, "ordinary", PendingKind::Elicitation),
+        (3, "permission", PendingKind::Permission),
+    ] {
+        w.store
+            .ingest(
+                "child",
+                seq,
+                &SessionBody::PendingOpened {
+                    pending_id: id.into(),
+                    indexed: Indexed {
+                        pending: Some(Box::new(PendingExtract {
+                            id: id.into(),
+                            kind,
+                            option_ids: Some(vec!["allow".into()]),
+                            title: Some("question".into()),
+                        })),
+                        ..Default::default()
+                    },
+                    payload: serde_json::json!({"message":"question","requestedSchema":{"type":"object"}}),
+                },
+            )
+            .unwrap();
+    }
+    let answer = AnswerRequest::Elicitation {
+        action: ElicitationAction::Accept,
+        content: Some(serde_json::json!({"yes":true})),
+    };
+    let receipt = w
+        .store
+        .queue_ordinary_answer(
+            &parent,
+            1,
+            "digest",
+            &hennery_sessions::delegation_control::DelegatedAnswer {
+                key: "answer",
+                child: "child",
+                pending: "ordinary",
+                answer: &answer,
+            },
+        )
+        .unwrap();
+    assert_eq!(
+        receipt,
+        w.store
+            .queue_ordinary_answer(
+                &parent,
+                1,
+                "digest",
+                &hennery_sessions::delegation_control::DelegatedAnswer {
+                    key: "answer",
+                    child: "child",
+                    pending: "ordinary",
+                    answer: &answer
+                }
+            )
+            .unwrap()
+    );
+    assert!(matches!(
+        w.store.submit_answer("child", "ordinary", &answer).unwrap(),
+        hennery_sessions::store::AnswerSubmission::AlreadyAnswered
+    ));
+    assert!(
+        w.store
+            .queue_ordinary_answer(
+                &parent,
+                1,
+                "other",
+                &hennery_sessions::delegation_control::DelegatedAnswer {
+                    key: "permission",
+                    child: "child",
+                    pending: "permission",
+                    answer: &answer
+                }
+            )
+            .unwrap_err()
+            .to_string()
+            .contains("operator_required")
+    );
+}
+#[test]
+fn d2_spawns_are_atomic_independent_and_one_generation() {
+    let (w, parent) = child_world();
+    let config = hennery_proto::frames::SessionConfig {
+        model: Some("independent".into()),
+        ..Default::default()
+    };
+    let receipt = w
+        .store
+        .queue_spawn(
+            &parent,
+            1,
+            "digest",
+            &hennery_sessions::delegation_queue::DelegatedLaunch {
+                key: "spawn",
+                agent: "codex",
+                cwd: "/project",
+                brief: "brief",
+                name: Some("worker"),
+                config: &config,
+                mcp: McpContext::NONE,
+            },
+        )
+        .unwrap();
+    let child = receipt.child_id.as_ref().unwrap();
+    assert_eq!(w.store.find_session(child).unwrap().unwrap().agent, "codex");
+    assert_eq!(
+        w.store
+            .queue_spawn(
+                &parent,
+                1,
+                "digest",
+                &hennery_sessions::delegation_queue::DelegatedLaunch {
+                    key: "spawn",
+                    agent: "codex",
+                    cwd: "/project",
+                    brief: "brief",
+                    name: Some("worker"),
+                    config: &config,
+                    mcp: McpContext::NONE
+                }
+            )
+            .unwrap(),
+        receipt
+    );
+    assert_eq!(w.store.delegation_queue_depth(child).unwrap(), (1, 5));
+    let child_identity = w.start("other-child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &parent, 1, "other-child", 0).unwrap());
+    tx.commit().unwrap();
+    w.active("other-child");
+    assert!(
+        w.store
+            .queue_spawn(
+                &child_identity,
+                1,
+                "digest",
+                &hennery_sessions::delegation_queue::DelegatedLaunch {
+                    key: "nested",
+                    agent: "claude",
+                    cwd: "/project",
+                    brief: "brief",
+                    name: None,
+                    config: &Default::default(),
+                    mcp: McpContext::NONE
+                }
+            )
+            .unwrap_err()
+            .to_string()
+            .contains("generation_limit")
+    );
+}
+#[test]
+fn d2_resume_and_dispatch_require_fresh_complete_generation_evidence() {
+    use hennery_proto::delegation_host::{
+        CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog, SecurityClassification,
+    };
+    use hennery_proto::frames::{AgentIsolation, Capabilities, Capability, ConfigValue, Indexed};
+    let (w, parent) = child_world();
+    let hub = hennery_sessions::hub::Hub::new();
+    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
+    let caps = Capabilities(vec![Capability::McpServers, Capability::DelegationConfig]);
+    let reg = hub
+        .register(
+            "host",
+            tx,
+            caps,
+            AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
+        )
+        .unwrap();
+    hub.mark_ready("host", reg.conn_id);
+    let catalog = HostCatalog {
+        agent: "claude".into(),
+        adapter_revision: "v1".into(),
+        config_options: vec![],
+        defaults: Default::default(),
+        security: SecurityClassification {
+            known: true,
+            axes: Default::default(),
+        },
+        freshness: CatalogFreshness::Fresh,
+    };
+    w.store
+        .queue_followup(&parent, 1, "send", "digest", "child", "hello")
+        .unwrap();
+    assert!(!w.store.dispatch_delegated("child", &catalog, &hub).unwrap());
+    w.store
+        .ingest(
+            "child",
+            2,
+            &SessionBody::SessionParked {
+                reason: hennery_proto::frames::ParkReason::Operator,
+            },
+        )
+        .unwrap();
+    assert!(
+        w.store
+            .attach_delegated("child", McpContext::NONE, &catalog, &hub)
+            .unwrap()
+    );
+    let frame = rx.try_recv().unwrap();
+    let generation = match frame {
+        hennery_proto::frames::CollectorFrame::DelegatedAttach { attach_generation, .. } => attach_generation,
+        other => panic!("{other:?}"),
+    };
+    let mut seq = 3;
+    w.store
+        .ingest("child", seq, &SessionBody::session_started("resume", "agent-child"))
+        .unwrap();
+    seq += 1;
+    for (attach_gen, complete, should_send) in [
+        (generation - 1, ConfigCompleteness::Complete, false),
+        (generation, ConfigCompleteness::Partial, false),
+        (generation, ConfigCompleteness::Complete, true),
+    ] {
+        w.store
+            .ingest(
+                "child",
+                seq,
+                &SessionBody::AcpUpdate {
+                    indexed: Indexed {
+                        config_evidence: Some(Box::new(ConfigEvidence {
+                            attach_generation: attach_gen,
+                            config_revision: seq,
+                            completeness: complete,
+                            actual: Default::default(),
+                        })),
+                        ..Default::default()
+                    },
+                    payload: serde_json::json!({}),
+                },
+            )
+            .unwrap();
+        seq += 1;
+        assert_eq!(
+            w.store.dispatch_delegated("child", &catalog, &hub).unwrap(),
+            should_send
+        );
+    }
+    let prompt = rx.try_recv().unwrap();
+    assert!(matches!(
+        prompt,
+        hennery_proto::frames::CollectorFrame::DelegatedPrompt { .. }
+    ));
+    assert!(!w.store.dispatch_delegated("child", &catalog, &hub).unwrap());
+    let _ = ConfigValue::Bool(false);
+}
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
new file mode 100644
index 0000000000000000000000000000000000000000..703fa57c040ec3c0420bec0f56c2896d35cda5c7
--- /dev/null
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -0,0 +1,2195 @@
+use hennery_gateway::api::GatewayState;
+use hennery_gateway::identity::SessionIdentity;
+use hennery_gateway::key::MasterKey;
+use hennery_gateway::scope::ProxyStore;
+use hennery_gateway::session::GatewayMcp;
+use hennery_gateway::store::GatewayStore;
+use hennery_kernel::hats::HatChange;
+use hennery_kernel::hosts::{Enrollment, Hosts};
+use hennery_kernel::operator::{Operator, SetupOutcome};
+use hennery_kernel::secret::unix_now;
+use hennery_proto::frames::{McpIsolation, McpServer, SessionBody};
+use hennery_sessions::store::{McpContext, Store};
+use std::sync::Arc;
+struct World {
+    _dir: tempfile::TempDir,
+    db: std::path::PathBuf,
+    store: Store,
+    gateway: Arc<GatewayStore>,
+    revocations: hennery_gateway::revocation::Revocations,
+    hat: String,
+    other: String,
+}
+impl World {
+    fn new() -> Self {
+        let dir = tempfile::tempdir().unwrap();
+        let db = dir.path().join("hennery.db");
+        let hosts = Hosts::open(&db).unwrap();
+        hosts
+            .register(
+                "host",
+                &Enrollment {
+                    public_key: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a".into(),
+                    name: "test".into(),
+                    host_version: "0".into(),
+                    platform: "linux".into(),
+                },
+                1,
+            )
+            .unwrap();
+        hosts
+            .record_hello(
+                "host",
+                "0",
+                &hennery_proto::frames::Capabilities(vec![hennery_proto::frames::Capability::McpServers]),
+                unix_now(),
+            )
+            .unwrap();
+        hosts
+            .record_mcp_isolation(
+                "host",
+                &hennery_proto::frames::AgentIsolation(
+                    [("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect(),
+                ),
+            )
+            .unwrap();
+        let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
+        let HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else {
+            panic!()
+        };
+        let operator = Arc::new(Operator::open(&db).unwrap());
+        let setup = operator.issue_setup_token(unix_now()).unwrap().unwrap();
+        assert!(matches!(
+            operator
+                .set_up(&setup, "correct horse battery", "https://hennery.example", unix_now())
+                .unwrap(),
+            SetupOutcome::Done { .. }
+        ));
+        let gateway = Arc::new(GatewayStore::open(&db).unwrap());
+        let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(
+            gateway.clone(),
+            Arc::new(ProxyStore::open(&db).unwrap()),
+            Arc::new(MasterKey::from_bytes([7; 32])),
+            hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
+            Arc::new(hennery_gateway::notify::Silent),
+        ));
+        let revocations = runtime.revocations.clone();
+        let state = GatewayState { runtime, operator };
+        let store = Store::open(&db).unwrap();
+        store.set_session_mcp(Arc::new(GatewayMcp::for_collector(&state)));
+        gateway.set_session_tools(&hat, true).unwrap();
+        gateway.set_session_tools(&other.id, true).unwrap();
+        Self {
+            _dir: dir,
+            db,
+            store,
+            gateway,
+            revocations,
+            hat,
+            other: other.id,
+        }
+    }
+    fn start(&self, id: &str, hat: &str, isolation: McpIsolation) -> Option<SessionIdentity> {
+        let given = self
+            .store
+            .create_session_with_mcp(
+                id,
+                "host",
+                "claude",
+                "/project",
+                hat,
+                None,
+                McpContext {
+                    capable: true,
+                    isolation,
+                    rules_name_other_hats: false,
+                },
+            )
+            .unwrap()
+            .unwrap();
+        given.servers.iter().find_map(|s| match s {
+            McpServer::Http { name, headers, .. } if name == "hennery" => self
+                .gateway
+                .authenticate_session(headers[0].value.strip_prefix("Bearer ").unwrap())
+                .unwrap(),
+            _ => None,
+        })
+    }
+    fn active(&self, id: &str) {
+        self.store
+            .ingest(id, 1, &SessionBody::session_started("request", format!("agent-{id}")))
+            .unwrap();
+    }
+}
+
+use hennery_proto::{
+    delegation::{OperationReceipt, OperationState},
+    delegation_host::{CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog, SecurityClassification},
+    frames::{
+        AgentIsolation, Capabilities, Capability, CollectorFrame, ConfigValue, ElicitationAction, Indexed, ParkReason,
+        PendingExtract, PendingKind, PendingReason, PendingResolution, SessionConfig, TurnOutcome,
+    },
+    plugin::InputOrigin,
+    rest::AnswerRequest,
+};
+use hennery_sessions::{hub::Hub, store::AnswerSubmission};
+use rusqlite::params;
+use serde_json::json;
+use std::{collections::BTreeMap, sync::Barrier};
+
+fn raw(w: &World) -> hennery_kernel::db::OwnedConnection {
+    hennery_kernel::db::open(&w.db).unwrap()
+}
+fn child(w: &World, parent: &SessionIdentity, id: &str, hat: &str) -> SessionIdentity {
+    let identity = w.start(id, hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = raw(w);
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, parent, 1, id, 0).unwrap());
+    tx.commit().unwrap();
+    w.active(id);
+    identity
+}
+fn pair() -> (World, SessionIdentity) {
+    let w = World::new();
+    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    child(&w, &parent, "child", &w.hat);
+    (w, parent)
+}
+fn connected() -> (Arc<Hub>, tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) {
+    let h = Arc::new(Hub::new());
+    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
+    let reg = h
+        .register(
+            "host",
+            tx,
+            Capabilities(vec![
+                Capability::McpServers,
+                Capability::DelegationConfig,
+                Capability::CatalogProbe,
+            ]),
+            AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
+        )
+        .unwrap();
+    h.mark_ready("host", reg.conn_id);
+    (h, rx)
+}
+fn catalog() -> HostCatalog {
+    HostCatalog {
+        agent: "claude".into(),
+        adapter_revision: "pin".into(),
+        config_options: vec![],
+        defaults: SessionConfig::default(),
+        security: SecurityClassification {
+            known: true,
+            axes: Default::default(),
+        },
+        freshness: CatalogFreshness::Fresh,
+    }
+}
+fn config(model: &str) -> SessionConfig {
+    SessionConfig {
+        model: Some(model.into()),
+        ..Default::default()
+    }
+}
+fn seed(w: &World, id: &str, required: &SessionConfig, generation: u64) {
+    raw(w).execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config) VALUES (?1,?2,?3,?4)",params![w.store.owner_id(),id,i64::try_from(generation).unwrap(),serde_json::to_string(required).unwrap()]).unwrap();
+}
+fn proof(
+    w: &World,
+    id: &str,
+    seq: u64,
+    generation: u64,
+    revision: u64,
+    completeness: ConfigCompleteness,
+    actual: SessionConfig,
+) {
+    w.store
+        .ingest(
+            id,
+            seq,
+            &SessionBody::AcpUpdate {
+                indexed: Indexed {
+                    config_evidence: Some(Box::new(ConfigEvidence {
+                        attach_generation: generation,
+                        config_revision: revision,
+                        completeness,
+                        actual,
+                    })),
+                    ..Default::default()
+                },
+                payload: json!({}),
+            },
+        )
+        .unwrap();
+}
+fn ready(w: &World) {
+    seed(w, "child", &config("wanted"), 5);
+    proof(w, "child", 2, 5, 10, ConfigCompleteness::Complete, config("wanted"));
+}
+fn queue(w: &World, p: &SessionIdentity, key: &str) -> OperationReceipt {
+    w.store.queue_followup(p, 1, key, key, "child", key).unwrap()
+}
+fn receipt(w: &World, p: &SessionIdentity, key: &str) -> OperationReceipt {
+    w.store.delegation_receipt(p, 1, key).unwrap().unwrap()
+}
+fn take_prompt(rx: &mut tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) -> (String, String) {
+    match rx.try_recv().unwrap() {
+        CollectorFrame::DelegatedPrompt {
+            request_id, turn_id, ..
+        } => (request_id, turn_id),
+        other => panic!("{other:?}"),
+    }
+}
+fn ended(w: &World, id: &str, seq: u64, turn: &str) {
+    w.store
+        .ingest(
+            id,
+            seq,
+            &SessionBody::TurnEnded {
+                turn_id: turn.into(),
+                outcome: TurnOutcome::Completed,
+                stop_reason: None,
+                error: None,
+            },
+        )
+        .unwrap();
+}
+fn pending(w: &World, id: &str, seq: u64, pending: &str, kind: PendingKind) -> hennery_sessions::store::Ingested {
+    w.store.ingest_fact(id,seq,&SessionBody::PendingOpened{pending_id:pending.into(),indexed:Indexed{pending:Some(Box::new(PendingExtract{id:pending.into(),kind,option_ids:Some(vec!["allow".into()]),title:Some("question".into())})),..Default::default()},payload:json!({"message":"question","requestedSchema":{"type":"object","properties":{"ok":{"type":"boolean"}}}})}).unwrap()
+}
+fn answer() -> AnswerRequest {
+    AnswerRequest::Elicitation {
+        action: ElicitationAction::Accept,
+        content: Some(json!({"ok":true})),
+    }
+}
+
+#[test]
+fn close_intent_at_either_endpoint_cancels_before_prompt_handoff() {
+    for endpoint in ["parent", "child"] {
+        let (w, p) = pair();
+        ready(&w);
+        let q = queue(&w, &p, "followup");
+        let (h, mut rx) = connected();
+        w.store.record_close_request(endpoint).unwrap();
+        assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+        assert!(rx.try_recv().is_err());
+        assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (0, 0));
+        let(state,payload):(String,String)=raw(&w).query_row("SELECT o.state,q.payload FROM session_operations o JOIN session_dispatch_queue q USING(owner_id,operation_id) WHERE o.operation_id=?1",[q.operation_id],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();
+        assert_eq!(state, "cancelled");
+        assert!(payload.is_empty());
+    }
+}
+#[test]
+fn automatic_resume_accepts_only_genuinely_parked_and_ready_host() {
+    for (lifecycle, presumed, close, host_ready, expected) in [
+        ("parked", false, false, true, true),
+        ("parked", true, false, true, false),
+        ("closed", false, false, true, false),
+        ("failed", false, false, true, false),
+        ("active", false, false, true, false),
+        ("parked", false, true, true, false),
+        ("parked", false, false, false, false),
+    ] {
+        let (w, p) = pair();
+        ready(&w);
+        queue(&w, &p, "followup");
+        let (h, mut rx) = connected();
+        raw(&w)
+            .execute(
+                "UPDATE sessions SET lifecycle=?1,presumed_parked=?2,close_requested=?3 WHERE id='child'",
+                params![lifecycle, presumed, close],
+            )
+            .unwrap();
+        if !host_ready {
+            h.unregister("host", h.routable_conn("host").unwrap());
+        }
+        let old_hash: String = raw(&w)
+            .query_row(
+                "SELECT token_hash FROM gw_session_tokens WHERE session_id='child'",
+                [],
+                |r| r.get(0),
+            )
+            .unwrap();
+        let old_watch = w.revocations.watch(&old_hash);
+        assert!(!old_watch.token().is_cancelled());
+        assert_eq!(
+            w.store
+                .attach_delegated("child", McpContext::NONE, &catalog(), &h)
+                .unwrap(),
+            expected,
+            "{lifecycle} {presumed} {close} {host_ready}"
+        );
+        assert_eq!(old_watch.token().is_cancelled(), expected);
+        if expected {
+            assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "starting");
+            assert!(matches!(rx.try_recv().unwrap(), CollectorFrame::DelegatedAttach { .. }));
+        } else {
+            assert!(rx.try_recv().is_err());
+            assert_eq!(w.store.find_session("child").unwrap().unwrap().close_requested, close);
+        }
+    }
+}
+#[test]
+fn automatic_resume_invalidates_stored_proof_until_new_complete_generation() {
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "followup");
+    let (h, mut rx) = connected();
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::SessionParked {
+                reason: ParkReason::Idle,
+            },
+        )
+        .unwrap();
+    assert!(
+        w.store
+            .attach_delegated("child", McpContext::NONE, &catalog(), &h)
+            .unwrap()
+    );
+    let generation = match rx.try_recv().unwrap() {
+        CollectorFrame::DelegatedAttach { attach_generation, .. } => attach_generation,
+        other => panic!("{other:?}"),
+    };
+    assert_eq!(generation, 6);
+    let old: Option<String> = raw(&w)
+        .query_row(
+            "SELECT evidence FROM session_attach_evidence WHERE session_id='child'",
+            [],
+            |r| r.get(0),
+        )
+        .unwrap();
+    assert!(old.is_none());
+    w.store
+        .ingest("child", 4, &SessionBody::session_started("resume", "agent-child"))
+        .unwrap();
+    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    for (seq, generation, complete) in [
+        (5, 5, ConfigCompleteness::Complete),
+        (6, 6, ConfigCompleteness::Partial),
+        (7, 6, ConfigCompleteness::Unknown),
+    ] {
+        proof(&w, "child", seq, generation, seq, complete, config("wanted"));
+        assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+        assert!(rx.try_recv().is_err());
+    }
+    proof(&w, "child", 8, 6, 8, ConfigCompleteness::Complete, config("wanted"));
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    take_prompt(&mut rx);
+}
+#[test]
+fn required_model_mode_and_axes_hold_mismatch_then_current_repair_releases() {
+    for field in ["model", "mode", "effort"] {
+        let (w, p) = pair();
+        let required = SessionConfig {
+            model: Some("wanted".into()),
+            mode: Some("plan".into()),
+            axes: BTreeMap::from([("effort".into(), ConfigValue::Id("high".into()))]),
+        };
+        seed(&w, "child", &required, 5);
+        let mut wrong = required.clone();
+        match field {
+            "model" => wrong.model = Some("other".into()),
+            "mode" => wrong.mode = Some("default".into()),
+            _ => {
+                wrong.axes.insert("effort".into(), ConfigValue::Id("low".into()));
+            }
+        }
+        proof(&w, "child", 2, 5, 10, ConfigCompleteness::Complete, wrong.clone());
+        queue(&w, &p, "followup");
+        let (h, mut rx) = connected();
+        assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap(), "{field}");
+        assert_eq!(receipt(&w, &p, "followup").state, OperationState::WaitingConfig);
+        let status = w.store.child_status(&p, 1, "child", None).unwrap();
+        assert_eq!(status.requested, required);
+        assert_eq!(status.actual, Some(wrong));
+        proof(&w, "child", 3, 5, 11, ConfigCompleteness::Complete, required);
+        assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+        take_prompt(&mut rx);
+    }
+}
+#[test]
+fn stale_config_evidence_cannot_overwrite_current_proof_and_config_changes_clear_it() {
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "followup");
+    let (h, mut rx) = connected();
+    proof(&w, "child", 3, 5, 9, ConfigCompleteness::Complete, config("wrong"));
+    proof(&w, "child", 4, 4, 11, ConfigCompleteness::Complete, config("wrong"));
+    assert_eq!(
+        w.store.child_status(&p, 1, "child", None).unwrap().actual,
+        Some(config("wanted"))
+    );
+    raw(&w)
+        .execute("UPDATE sessions SET model='changed' WHERE id='child'", [])
+        .unwrap();
+    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    assert!(rx.try_recv().is_err());
+    proof(&w, "child", 5, 5, 11, ConfigCompleteness::Complete, config("wanted"));
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    take_prompt(&mut rx);
+}
+#[test]
+fn execution_policy_is_rechecked_and_current_revision_is_bound_to_dispatch() {
+    let (w, p) = pair();
+    let mut required = config("wanted");
+    required.mode = Some("default".into());
+    seed(&w, "child", &required, 5);
+    proof(&w, "child", 2, 5, 10, ConfigCompleteness::Complete, required);
+    let q = queue(&w, &p, "followup");
+    let (h, mut rx) = connected();
+    let mut c = catalog();
+    c.security
+        .axes
+        .insert("mode".into(), vec![ConfigValue::Id("default".into())]);
+    let policy = BTreeMap::from([(
+        "claude".into(),
+        BTreeMap::from([("mode".into(), vec![ConfigValue::Id("plan".into())])]),
+    )]);
+    assert_eq!(w.store.set_execution_policy(&w.hat, &policy).unwrap().revision, 1);
+    assert!(!w.store.dispatch_delegated("child", &c, &h).unwrap());
+    assert!(rx.try_recv().is_err());
+    assert_eq!(
+        w.store
+            .set_execution_policy(&w.hat, &Default::default())
+            .unwrap()
+            .revision,
+        2
+    );
+    assert!(w.store.dispatch_delegated("child", &c, &h).unwrap());
+    take_prompt(&mut rx);
+    let validated: (i64, i64, i64) = raw(&w)
+        .query_row(
+            "SELECT validated_attach,validated_config,validated_policy FROM session_operations WHERE operation_id=?1",
+            [q.operation_id],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+        )
+        .unwrap();
+    assert_eq!(validated, (5, 10, 2));
+}
+
+#[test]
+fn collector_restart_preserves_receipts_and_operation_key_namespace_across_tools() {
+    let (w, p) = pair();
+    let first = w
+        .store
+        .queue_spawn(
+            &p,
+            1,
+            "spawn-digest",
+            &hennery_sessions::delegation_queue::DelegatedLaunch {
+                key: "shared",
+                agent: "claude",
+                cwd: "/project",
+                brief: "brief",
+                name: None,
+                config: &config("wanted"),
+                mcp: McpContext::NONE,
+            },
+        )
+        .unwrap();
+    let child = first.child_id.clone().unwrap();
+    let reopened = Store::open(&w.db).unwrap();
+    assert_eq!(
+        reopened.delegation_retry(&p, 1, "shared", "spawn-digest").unwrap(),
+        Some(first.clone())
+    );
+    assert_eq!(reopened.delegation_receipt(&p, 1, "shared").unwrap(), Some(first));
+    assert!(
+        reopened
+            .queue_followup(&p, 1, "shared", "send-digest", &child, "other")
+            .unwrap_err()
+            .to_string()
+            .contains("operation_conflict")
+    );
+    assert!(
+        reopened
+            .queue_ordinary_answer(
+                &p,
+                1,
+                "answer-digest",
+                &hennery_sessions::delegation_control::DelegatedAnswer {
+                    key: "shared",
+                    child: &child,
+                    pending: "missing",
+                    answer: &answer()
+                }
+            )
+            .unwrap_err()
+            .to_string()
+            .contains("operation_conflict")
+    );
+    let (h, mut rx) = connected();
+    assert!(
+        reopened
+            .queue_child_close(&p, 1, "shared", "close-digest", &child, &h)
+            .unwrap_err()
+            .to_string()
+            .contains("operation_conflict")
+    );
+    assert!(rx.try_recv().is_err());
+    assert!(!reopened.find_session(&child).unwrap().unwrap().close_requested);
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM session_operations WHERE caller_id='parent'",
+                [],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        1
+    );
+}
+#[test]
+fn four_workers_reserve_one_turn_and_drain_fifo_after_factual_completion() {
+    let (w, p) = pair();
+    ready(&w);
+    for i in 0..4 {
+        queue(&w, &p, &format!("fifo-{i}"));
+    }
+    let (h, mut rx) = connected();
+    let barrier = Arc::new(Barrier::new(4));
+    let results = std::thread::scope(|scope| {
+        let jobs: Vec<_> = (0..4)
+            .map(|_| {
+                let db = w.db.clone();
+                let h = h.clone();
+                let barrier = barrier.clone();
+                scope.spawn(move || {
+                    let s = Store::open(&db).unwrap();
+                    barrier.wait();
+                    s.dispatch_delegated("child", &catalog(), &h).unwrap()
+                })
+            })
+            .collect();
+        jobs.into_iter().map(|j| j.join().unwrap()).collect::<Vec<_>>()
+    });
+    assert_eq!(results.iter().filter(|sent| **sent).count(), 1);
+    let (request, turn) = match rx.try_recv().unwrap() {
+        CollectorFrame::DelegatedPrompt {
+            request_id,
+            turn_id,
+            content,
+            ..
+        } => {
+            assert!(content[0]["text"].as_str().unwrap().ends_with("fifo-0"));
+            (request_id, turn_id)
+        }
+        other => panic!("{other:?}"),
+    };
+    assert!(rx.try_recv().is_err());
+    assert_eq!(receipt(&w, &p, "fifo-0").state, OperationState::AwaitingReconciliation);
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    ended(&w, "child", 4, &turn);
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    match rx.try_recv().unwrap() {
+        CollectorFrame::DelegatedPrompt { content, .. } => {
+            assert!(content[0]["text"].as_str().unwrap().ends_with("fifo-1"))
+        }
+        other => panic!("{other:?}"),
+    }
+}
+#[test]
+fn queue_count_cap_is_atomic_for_four_workers() {
+    let (w, p) = pair();
+    let barrier = Arc::new(Barrier::new(4));
+    let accepted = std::thread::scope(|scope| {
+        let jobs: Vec<_> = (0..4)
+            .map(|worker| {
+                let db = w.db.clone();
+                let p = p.clone();
+                let barrier = barrier.clone();
+                scope.spawn(move || {
+                    let s = Store::open(&db).unwrap();
+                    barrier.wait();
+                    let mut accepted = 0;
+                    for n in 0..20 {
+                        let key = format!("worker-{worker}-{n}");
+                        match s.queue_followup(&p, 1, &key, &key, "child", "é") {
+                            Ok(_) => accepted += 1,
+                            Err(e) => assert_eq!(e.to_string(), "queue_full"),
+                        }
+                    }
+                    accepted
+                })
+            })
+            .collect();
+        jobs.into_iter().map(|j| j.join().unwrap()).sum::<usize>()
+    });
+    assert_eq!(accepted, 32);
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (32, 64));
+}
+#[test]
+fn queue_byte_limit_counts_utf8_bytes_and_oversized_message_is_rejected() {
+    let (w, p) = pair();
+    let text = "é".repeat(32768);
+    for i in 0..16 {
+        let key = format!("bytes-{i}");
+        w.store.queue_followup(&p, 1, &key, &key, "child", &text).unwrap();
+    }
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (16, 1024 * 1024));
+    assert_eq!(
+        w.store
+            .queue_followup(&p, 1, "overflow", "overflow", "child", "x")
+            .unwrap_err()
+            .to_string(),
+        "queue_full"
+    );
+    assert_eq!(
+        w.store
+            .queue_followup(&p, 1, "oversized", "oversized", "child", &"x".repeat(65537))
+            .unwrap_err()
+            .to_string(),
+        "invalid_arguments"
+    );
+}
+#[test]
+fn concurrent_identical_keys_create_one_durable_operation() {
+    let (w, p) = pair();
+    let barrier = Arc::new(Barrier::new(4));
+    let receipts = std::thread::scope(|scope| {
+        let jobs: Vec<_> = (0..4)
+            .map(|_| {
+                let db = w.db.clone();
+                let p = p.clone();
+                let barrier = barrier.clone();
+                scope.spawn(move || {
+                    let s = Store::open(&db).unwrap();
+                    barrier.wait();
+                    s.queue_followup(&p, 1, "same", "digest", "child", "same").unwrap()
+                })
+            })
+            .collect();
+        jobs.into_iter().map(|j| j.join().unwrap()).collect::<Vec<_>>()
+    });
+    assert!(receipts.iter().all(|r| r == &receipts[0]));
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (1, 4));
+}
+fn spawn(w: &World, p: &SessionIdentity, key: &str) -> anyhow::Result<OperationReceipt> {
+    w.store.queue_spawn(
+        p,
+        1,
+        key,
+        &hennery_sessions::delegation_queue::DelegatedLaunch {
+            key,
+            agent: "claude",
+            cwd: "/project",
+            brief: "brief",
+            name: None,
+            config: &SessionConfig::default(),
+            mcp: McpContext::NONE,
+        },
+    )
+}
+fn user_turn_with_origin(w: &World, id: &str, seq: u64, turn: &str, origin: InputOrigin) {
+    assert!(
+        w.store
+            .open_turn(id, turn, &[json!({"type":"text","text":"message"})])
+            .unwrap()
+    );
+    raw(w)
+        .execute(
+            "UPDATE turns SET input_origin=?1 WHERE turn_id=?2",
+            params![serde_json::to_string(&origin).unwrap(), turn],
+        )
+        .unwrap();
+    w.store
+        .ingest(
+            id,
+            seq,
+            &SessionBody::TurnStarted {
+                request_id: format!("request-{turn}"),
+                turn_id: turn.into(),
+            },
+        )
+        .unwrap();
+    ended(w, id, seq + 1, turn);
+}
+#[test]
+fn live_child_cap_and_one_generation_are_independent_of_runtime_choice() {
+    let (w, p) = pair();
+    for i in 0..7 {
+        spawn(&w, &p, &format!("spawn-{i}")).unwrap();
+    }
+    assert_eq!(spawn(&w, &p, "ninth").unwrap_err().to_string(), "child_limit");
+    let child_identity = w.start("nested-parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut conn = raw(&w);
+    let tx = conn.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &p, 1, "nested-parent", 0).unwrap());
+    tx.commit().unwrap();
+    w.active("nested-parent");
+    assert_eq!(
+        spawn(&w, &child_identity, "grandchild").unwrap_err().to_string(),
+        "generation_limit"
+    );
+}
+#[test]
+fn replacement_children_cannot_reset_starts_budget_or_parent_report_cannot_reset_epoch() {
+    let (w, p) = pair();
+    for i in 0..32 {
+        let q = spawn(&w, &p, &format!("spawn-{i}")).unwrap();
+        raw(&w)
+            .execute(
+                "UPDATE sessions SET lifecycle='closed' WHERE id=?1",
+                [q.child_id.unwrap()],
+            )
+            .unwrap();
+    }
+    assert_eq!(spawn(&w, &p, "33rd").unwrap_err().to_string(), "start_budget");
+    user_turn_with_origin(
+        &w,
+        "parent",
+        2,
+        "parent-data",
+        InputOrigin::Parent {
+            session_id: "foreign-parent".into(),
+            operation_id: "report".into(),
+        },
+    );
+    assert_eq!(spawn(&w, &p, "after-parent").unwrap_err().to_string(), "start_budget");
+    user_turn_with_origin(
+        &w,
+        "parent",
+        4,
+        "child-data",
+        InputOrigin::ChildReport {
+            child_id: "child".into(),
+            source_event_id: "source".into(),
+            delivery_id: "delivery".into(),
+        },
+    );
+    assert_eq!(spawn(&w, &p, "after-report").unwrap_err().to_string(), "start_budget");
+    user_turn_with_origin(&w, "parent", 6, "operator", InputOrigin::Operator {});
+    assert!(spawn(&w, &p, "new-operator-epoch").is_ok());
+    let epochs: Vec<i64> = {
+        let c = raw(&w);
+        let mut s=c.prepare("SELECT DISTINCT epoch FROM session_operations WHERE caller_id='parent' AND tool='session_spawn' ORDER BY epoch").unwrap();
+        s.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect()
+    };
+    assert_eq!(epochs.len(), 2);
+    assert_eq!(epochs[0], 0);
+    assert!(epochs[1] > 0);
+}
+#[test]
+fn owned_child_checks_reject_owner_hat_sibling_ancestor_and_scope_changed_cursor() {
+    let (w, p) = pair();
+    let child_identity = w.start("sibling", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    let mut c = raw(&w);
+    let tx = c.transaction().unwrap();
+    assert!(w.store.bind_family_in(&tx, &p, 1, "sibling", 0).unwrap());
+    tx.commit().unwrap();
+    w.active("sibling");
+    let unrelated = w.start("unrelated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("unrelated");
+    let foreign = w.start("foreign-hat", &w.other, McpIsolation::ClaudeStrict).unwrap();
+    w.active("foreign-hat");
+    queue(&w, &p, "owned-key");
+    assert!(
+        w.store
+            .delegation_receipt(&unrelated, 1, "owned-key")
+            .unwrap()
+            .is_none()
+    );
+    assert_eq!(
+        w.store
+            .child_status(&p, 1, "child", Some("owned-key"))
+            .unwrap()
+            .operations
+            .len(),
+        1
+    );
+    assert!(
+        w.store
+            .child_status(&p, 1, "sibling", Some("owned-key"))
+            .unwrap()
+            .operations
+            .is_empty()
+    );
+    for target in ["parent", "unrelated", "foreign-hat", "missing"] {
+        assert!(w.store.child_status(&p, 1, target, None).is_err(), "{target}");
+        assert!(
+            w.store
+                .queue_followup(&p, 1, &format!("deny-{target}"), target, target, "hidden")
+                .is_err()
+        );
+    }
+    for target in ["parent", "child"] {
+        assert!(w.store.child_status(&child_identity, 1, target, None).is_err());
+    }
+    assert!(w.store.child_status(&unrelated, 1, "child", None).is_err());
+    assert!(w.store.child_status(&foreign, 1, "child", None).is_err());
+    let mut owner = p.clone();
+    owner.owner_id = "other-owner".into();
+    assert!(w.store.child_status(&owner, 1, "child", None).is_err());
+    let first = w.store.child_list(&p, 1, None, 1).unwrap();
+    assert_eq!(first.children.len(), 1);
+    let cursor = first.next_cursor.unwrap();
+    let second = w.store.child_list(&p, 1, Some(&cursor), 1).unwrap();
+    assert_eq!(second.children.len(), 1);
+    assert_ne!(first.children[0].child_id, second.children[0].child_id);
+    assert!(second.next_cursor.is_none());
+    assert!(
+        w.store
+            .child_list(&unrelated, 1, Some(&cursor), 1)
+            .unwrap_err()
+            .to_string()
+            .contains("invalid_cursor")
+    );
+    let (scope, last) = cursor.split_once('.').unwrap();
+    for cursor in [
+        format!("foreign.{last}"),
+        format!("{scope}.{}", "x".repeat(129)),
+        "malformed".into(),
+    ] {
+        assert_eq!(
+            w.store.child_list(&p, 1, Some(&cursor), 1).unwrap_err().to_string(),
+            "invalid_cursor"
+        );
+    }
+    assert!(w.store.child_list(&p, 1, None, 0).is_err());
+    assert!(w.store.child_list(&p, 1, None, 101).is_err());
+}
+#[test]
+fn ordinary_answers_share_one_slot_under_four_worker_race() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    let barrier = Arc::new(Barrier::new(4));
+    let accepted = std::thread::scope(|scope| {
+        let jobs: Vec<_> = (0..4)
+            .map(|i| {
+                let db = w.db.clone();
+                let p = p.clone();
+                let barrier = barrier.clone();
+                scope.spawn(move || {
+                    let s = Store::open(&db).unwrap();
+                    barrier.wait();
+                    if i % 2 == 0 {
+                        match s.queue_ordinary_answer(
+                            &p,
+                            1,
+                            "digest",
+                            &hennery_sessions::delegation_control::DelegatedAnswer {
+                                key: &format!("parent-{i}"),
+                                child: "child",
+                                pending: "question",
+                                answer: &answer(),
+                            },
+                        ) {
+                            Ok(_) => 1,
+                            Err(e) => {
+                                assert_eq!(e.to_string(), "already_answered");
+                                0
+                            }
+                        }
+                    } else {
+                        match s.submit_answer("child", "question", &answer()).unwrap() {
+                            AnswerSubmission::Queued(_) => 1,
+                            AnswerSubmission::AlreadyAnswered => 0,
+                            other => panic!("{other:?}"),
+                        }
+                    }
+                })
+            })
+            .collect();
+        jobs.into_iter().map(|j| j.join().unwrap()).sum::<u32>()
+    });
+    assert_eq!(accepted, 1);
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM answer_queue WHERE pending_id='question'",
+                [],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        1
+    );
+}
+#[test]
+fn parent_close_frees_unhanded_answer_without_stealing_operator_slot() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store
+        .queue_ordinary_answer(
+            &p,
+            1,
+            "digest",
+            &hennery_sessions::delegation_control::DelegatedAnswer {
+                key: "answer",
+                child: "child",
+                pending: "question",
+                answer: &answer(),
+            },
+        )
+        .unwrap();
+    assert!(w.store.answers_to_send("host").unwrap().is_empty());
+    assert!(matches!(
+        w.store.submit_answer("child", "question", &answer()).unwrap(),
+        AnswerSubmission::AlreadyAnswered
+    ));
+    w.store.record_close_request("parent").unwrap();
+    assert!(matches!(
+        w.store.submit_answer("child", "question", &answer()).unwrap(),
+        AnswerSubmission::Queued(_)
+    ));
+    assert_eq!(w.store.answers_to_send("host").unwrap().len(), 1);
+}
+#[test]
+fn permissions_are_operator_only_and_status_contains_no_answer_capable_schema() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "permission", PendingKind::Permission);
+    assert_eq!(
+        w.store
+            .queue_ordinary_answer(
+                &p,
+                1,
+                "digest",
+                &hennery_sessions::delegation_control::DelegatedAnswer {
+                    key: "permission",
+                    child: "child",
+                    pending: "permission",
+                    answer: &answer()
+                }
+            )
+            .unwrap_err()
+            .to_string(),
+        "operator_required"
+    );
+    let status = w.store.child_status(&p, 1, "child", None).unwrap();
+    assert!(status.questions[0].operator_required);
+    assert!(status.questions[0].question.is_none());
+    assert!(matches!(
+        w.store
+            .submit_answer(
+                "child",
+                "permission",
+                &AnswerRequest::Permission {
+                    option_id: "allow".into()
+                }
+            )
+            .unwrap(),
+        AnswerSubmission::Queued(_)
+    ));
+}
+#[test]
+fn accepted_answer_is_not_delivered_until_factual_host_verdict_and_survives_source_close_after_handoff() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "question", PendingKind::Elicitation);
+    w.store
+        .queue_ordinary_answer(
+            &p,
+            1,
+            "digest",
+            &hennery_sessions::delegation_control::DelegatedAnswer {
+                key: "answer",
+                child: "child",
+                pending: "question",
+                answer: &answer(),
+            },
+        )
+        .unwrap();
+    let (h, mut rx) = connected();
+    w.store.dispatch_delegation_answers(&h).unwrap();
+    let request = match rx.try_recv().unwrap() {
+        CollectorFrame::AnswerElicitation { request_id, .. } => request_id,
+        other => panic!("{other:?}"),
+    };
+    assert_eq!(receipt(&w, &p, "answer").state, OperationState::AwaitingReconciliation);
+    w.store.record_close_request("parent").unwrap();
+    assert!(matches!(
+        w.store.submit_answer("child", "question", &answer()).unwrap(),
+        AnswerSubmission::AlreadyAnswered
+    ));
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::AnswerResult {
+                pending_id: "question".into(),
+                request_id: request,
+                delivered: true,
+            },
+        )
+        .unwrap();
+    let state: String = raw(&w)
+        .query_row(
+            "SELECT state FROM session_operations WHERE caller_id='parent' AND operation_key='answer'",
+            [],
+            |r| r.get(0),
+        )
+        .unwrap();
+    assert_eq!(state, "delivered");
+    assert!(matches!(
+        w.store.submit_answer("child", "question", &answer()).unwrap(),
+        AnswerSubmission::AlreadyAnswered
+    ));
+}
+#[test]
+fn delivery_and_completion_follow_facts_not_handoff_and_late_rejection_is_ignored() {
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "followup");
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    assert_eq!(
+        receipt(&w, &p, "followup").state,
+        OperationState::AwaitingReconciliation
+    );
+    assert!(!w.store.reject_delegation("foreign-host", &request).unwrap());
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request.clone(),
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Delivered);
+    ended(&w, "child", 4, &turn);
+    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Completed);
+    assert!(!w.store.reject_delegation("host", &request).unwrap());
+}
+#[test]
+fn proven_rejection_is_not_delivered_but_late_factual_start_can_reconcile() {
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "followup");
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    assert!(w.store.reject_delegation("host", &request).unwrap());
+    assert_eq!(receipt(&w, &p, "followup").state, OperationState::NotDelivered);
+    assert!(w.store.find_session("child").unwrap().unwrap().open_turn_id.is_none());
+    w.store
+        .ingest(
+            "child",
+            3,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Delivered);
+    ended(&w, "child", 4, &turn);
+    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Completed);
+}
+#[test]
+fn typed_parent_provenance_does_not_reset_operator_push_epoch() {
+    let (w, p) = pair();
+    ready(&w);
+    assert!(
+        pending(&w, "child", 3, "first", PendingKind::Elicitation)
+            .edge
+            .is_some()
+    );
+    w.store
+        .ingest(
+            "child",
+            4,
+            &SessionBody::PendingResolved {
+                pending_id: "first".into(),
+                resolution: PendingResolution::Cancelled,
+                reason: Some(PendingReason::AgentWithdrew),
+            },
+        )
+        .unwrap();
+    queue(&w, &p, "followup");
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "child",
+            5,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn.clone(),
+            },
+        )
+        .unwrap();
+    ended(&w, "child", 6, &turn);
+    let events = w.store.events("child", 0, 100).unwrap();
+    let event = events.iter().find(|e| e.kind == "user_turn").unwrap();
+    assert_eq!(event.body["origin"]["kind"], "parent");
+    assert_eq!(event.body["origin"]["session_id"], "parent");
+    assert!(event.body["origin"]["operation_id"].is_string());
+    assert!(
+        pending(&w, "child", 7, "second", PendingKind::Elicitation)
+            .edge
+            .is_none()
+    );
+    w.store
+        .ingest(
+            "child",
+            8,
+            &SessionBody::PendingResolved {
+                pending_id: "second".into(),
+                resolution: PendingResolution::Cancelled,
+                reason: Some(PendingReason::AgentWithdrew),
+            },
+        )
+        .unwrap();
+    queue(&w, &p, "followup-running");
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    let (request, turn) = take_prompt(&mut rx);
+    w.store
+        .ingest(
+            "child",
+            9,
+            &SessionBody::TurnStarted {
+                request_id: request,
+                turn_id: turn,
+            },
+        )
+        .unwrap();
+    assert!(
+        pending(&w, "child", 10, "third", PendingKind::Elicitation)
+            .edge
+            .is_none()
+    );
+    assert_eq!(
+        w.store.find_session("child").unwrap().unwrap().activity.as_deref(),
+        Some("blocked")
+    );
+}
+
+fn persisted_state_case(stored: &str, code: Option<&str>, expected: OperationState) {
+    let (w, p) = pair();
+    let q = queue(&w, &p, "state");
+    raw(&w)
+        .execute(
+            "UPDATE session_operations SET state=?1,code=?2 WHERE operation_id=?3",
+            params![stored, code, q.operation_id],
+        )
+        .unwrap();
+    assert_eq!(receipt(&w, &p, "state").state, expected);
+}
+macro_rules! receipt_case {
+    ($name:ident,$stored:literal,$code:expr,$expected:expr) => {
+        #[test]
+        fn $name() {
+            persisted_state_case($stored, $code, $expected);
+        }
+    };
+}
+receipt_case!(receipt_accepted, "accepted", None, OperationState::Accepted);
+receipt_case!(
+    receipt_waiting_config,
+    "waiting_config",
+    None,
+    OperationState::WaitingConfig
+);
+receipt_case!(receipt_queued, "queued", None, OperationState::Queued);
+receipt_case!(
+    receipt_awaiting_reconciliation,
+    "awaiting_reconciliation",
+    None,
+    OperationState::AwaitingReconciliation
+);
+receipt_case!(receipt_delivered, "delivered", None, OperationState::Delivered);
+receipt_case!(receipt_completed, "completed", None, OperationState::Completed);
+receipt_case!(
+    receipt_not_delivered,
+    "not_delivered",
+    None,
+    OperationState::NotDelivered
+);
+receipt_case!(receipt_cancelled, "cancelled", None, OperationState::Cancelled);
+receipt_case!(
+    receipt_failed_preserves_code,
+    "failed",
+    Some("adapter_failed"),
+    OperationState::Failed {
+        code: "adapter_failed".into()
+    }
+);
+receipt_case!(
+    receipt_failed_default_code,
+    "failed",
+    None,
+    OperationState::Failed { code: "failed".into() }
+);
+receipt_case!(
+    receipt_unknown_state_is_failure,
+    "future_state",
+    Some("future_failure"),
+    OperationState::Failed {
+        code: "future_failure".into()
+    }
+);
+receipt_case!(
+    receipt_failure_detail_is_redacted,
+    "failed",
+    Some("private provider failure text"),
+    OperationState::Failed { code: "failed".into() }
+);
+#[test]
+fn receipt_failure_code_is_bounded() {
+    persisted_state_case(
+        "failed",
+        Some(&"x".repeat(129)),
+        OperationState::Failed { code: "failed".into() },
+    );
+    persisted_state_case(
+        "failed",
+        Some(&"x".repeat(128)),
+        OperationState::Failed { code: "x".repeat(128) },
+    );
+}
+macro_rules! error_case {
+    ($name:ident,$code:literal) => {
+        #[test]
+        fn $name() {
+            assert_eq!(
+                hennery_sessions::session_tools::error_code(&anyhow::anyhow!($code)),
+                $code
+            );
+            assert_eq!(
+                hennery_sessions::session_tools::error_code(&anyhow::anyhow!(concat!($code, " untrusted detail"))),
+                "invalid_arguments"
+            );
+        }
+    };
+}
+error_case!(error_not_found, "not_found");
+error_case!(error_operation_conflict, "operation_conflict");
+error_case!(error_operator_required, "operator_required");
+error_case!(error_queue_full, "queue_full");
+error_case!(error_child_limit, "child_limit");
+error_case!(error_start_budget, "start_budget");
+error_case!(error_generation_limit, "generation_limit");
+error_case!(error_session_starting, "session_starting");
+error_case!(error_runtime_unavailable, "runtime_unavailable");
+error_case!(error_configuration_unavailable, "configuration_unavailable");
+error_case!(error_session_tools_unavailable, "session_tools_unavailable");
+error_case!(error_catalog_unavailable, "catalog_unavailable");
+error_case!(error_catalog_stale, "catalog_stale");
+error_case!(error_catalog_busy, "catalog_busy");
+error_case!(error_host_offline, "host_offline");
+error_case!(error_invalid_cwd, "invalid_cwd");
+error_case!(error_not_open, "not_open");
+error_case!(error_already_answered, "already_answered");
+error_case!(error_invalid_arguments, "invalid_arguments");
+error_case!(error_invalid_cursor, "invalid_cursor");
+#[test]
+fn error_unknown_details_are_opaque_fallback() {
+    assert_eq!(
+        hennery_sessions::session_tools::error_code(&anyhow::anyhow!("database/internal/arbitrary")),
+        "invalid_arguments"
+    );
+}
+
+#[test]
+fn actual_foreign_owner_rows_receipts_and_queue_targets_remain_invisible() {
+    let (w, p) = pair();
+    let c = raw(&w);
+    c.execute_batch("INSERT INTO owners(id,created_at,set_up_at) VALUES ('owner-other',9223372036854775807,9223372036854775807);
+    INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('hat-other','owner-other','Other','#64748b',1);
+    INSERT INTO hosts(id,owner_id,name,public_key,platform,host_version,default_hat_id,created_at) VALUES ('host-other','owner-other','Fixture','other-key','linux','0','hat-other',1);
+    INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('parent-other','owner-other','host-other','hat-other','claude','/foreign','active','idle','0','0');
+    INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('child-other','owner-other','host-other','hat-other','claude','/foreign','starting','idle','0','0');
+    INSERT INTO session_families(owner_id,parent_id,child_id,root_id,hat_id,created_event_id) VALUES ('owner-other','parent-other','child-other','parent-other','hat-other',0);
+    UPDATE sessions SET lifecycle='active' WHERE id='child-other';
+    INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES ('owner-other','parent-other','guessed','foreign-operation','digest','session_send','child-other','queued','foreign-request');
+    INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES ('owner-other','foreign-operation','parent-other','child-other',1,'private fixture','{}');").unwrap();
+    assert_eq!(w.store.child_list(&p, 1, None, 100).unwrap().children.len(), 1);
+    assert!(w.store.child_status(&p, 1, "child-other", None).is_err());
+    assert!(w.store.delegation_receipt(&p, 1, "guessed").unwrap().is_none());
+    assert!(w.store.delegation_targets().unwrap().is_empty());
+    assert_eq!(w.store.delegation_queue_depth("child-other").unwrap(), (0, 0));
+    assert!(!w.store.reject_delegation("host-other", "foreign-request").unwrap());
+    assert_eq!(
+        c.query_row(
+            "SELECT COUNT(*) FROM session_dispatch_queue WHERE owner_id='owner-other'",
+            [],
+            |r| r.get::<_, i64>(0)
+        )
+        .unwrap(),
+        1
+    );
+    assert_eq!(queue(&w, &p, "own").state, OperationState::Queued);
+}
+#[test]
+fn historical_child_status_does_not_authorize_new_close_after_operator_reopens() {
+    let (w, p) = pair();
+    raw(&w)
+        .execute("UPDATE sessions SET lifecycle='closed' WHERE id='child'", [])
+        .unwrap();
+    raw(&w)
+        .execute(
+            "UPDATE sessions SET lifecycle='active',activity='idle' WHERE id='child'",
+            [],
+        )
+        .unwrap();
+    assert!(w.store.child_status(&p, 1, "child", None).is_ok());
+    let (h, mut rx) = connected();
+    assert_eq!(
+        w.store
+            .queue_child_close(&p, 1, "new-close", "digest", "child", &h)
+            .unwrap_err()
+            .to_string(),
+        "not_found"
+    );
+    assert!(rx.try_recv().is_err());
+    assert!(!w.store.find_session("child").unwrap().unwrap().close_requested);
+}
+#[test]
+fn child_identity_cannot_spawn_grandchildren_after_parent_deletion_removes_edge() {
+    let w = World::new();
+    let p = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("parent");
+    let identity = child(&w, &p, "child", &w.hat);
+    raw(&w)
+        .execute("UPDATE sessions SET lifecycle='deleted' WHERE id='parent'", [])
+        .unwrap();
+    assert_eq!(
+        raw(&w)
+            .query_row("SELECT COUNT(*) FROM session_families", [], |r| r.get::<_, i64>(0))
+            .unwrap(),
+        0
+    );
+    assert_eq!(
+        spawn(&w, &identity, "nested-after-delete").unwrap_err().to_string(),
+        "generation_limit"
+    );
+}
+
+#[test]
+fn disabling_and_reenabling_grant_cancels_queue_without_reviving_old_token() {
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "followup");
+    pending(&w, "child", 3, "grant-question", PendingKind::Elicitation);
+    w.store
+        .queue_ordinary_answer(
+            &p,
+            1,
+            "digest",
+            &hennery_sessions::delegation_control::DelegatedAnswer {
+                key: "grant-answer",
+                child: "child",
+                pending: "grant-question",
+                answer: &answer(),
+            },
+        )
+        .unwrap();
+    let (h, mut rx) = connected();
+    w.gateway.set_session_tools(&w.hat, false).unwrap();
+    w.gateway.set_session_tools(&w.hat, true).unwrap();
+    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (0, 0));
+    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    assert!(rx.try_recv().is_err());
+    assert!(w.store.session_tool_context(&p, 1, true).unwrap().is_none());
+    let states: Vec<String> = {
+        let c = raw(&w);
+        let mut stmt = c
+            .prepare("SELECT state FROM session_operations WHERE caller_id='parent'")
+            .unwrap();
+        stmt.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect()
+    };
+    assert!(states.iter().all(|state| state == "cancelled"));
+    let payload: String = raw(&w)
+        .query_row(
+            "SELECT payload FROM session_dispatch_queue WHERE source_id='parent'",
+            [],
+            |r| r.get(0),
+        )
+        .unwrap();
+    assert!(payload.is_empty());
+    assert!(matches!(
+        w.store.submit_answer("child", "grant-question", &answer()).unwrap(),
+        AnswerSubmission::Queued(_)
+    ));
+    assert_eq!(
+        w.store
+            .queue_followup(&p, 1, "later", "later", "child", "later")
+            .unwrap_err()
+            .to_string(),
+        "not_found"
+    );
+}
+
+#[test]
+fn current_path_rule_blocks_cross_hat_allocation_and_queued_dispatch() {
+    use hennery_kernel::hats::{NewRule, RulesChange};
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "followup");
+    let hosts = Hosts::open(&w.db).unwrap();
+    assert!(matches!(
+        hosts
+            .replace_path_rules(
+                "host",
+                &[NewRule {
+                    prefix: "/other".into(),
+                    hat_id: w.other.clone(),
+                    verified: true
+                }]
+            )
+            .unwrap(),
+        RulesChange::Done(_)
+    ));
+    assert_eq!(
+        w.store
+            .queue_spawn(
+                &p,
+                1,
+                "digest",
+                &hennery_sessions::delegation_queue::DelegatedLaunch {
+                    key: "foreign-cwd",
+                    agent: "claude",
+                    cwd: "/other",
+                    brief: "brief",
+                    name: None,
+                    config: &SessionConfig::default(),
+                    mcp: McpContext::NONE
+                }
+            )
+            .unwrap_err()
+            .to_string(),
+        "not_found"
+    );
+    assert!(matches!(
+        hosts
+            .replace_path_rules(
+                "host",
+                &[NewRule {
+                    prefix: "/project".into(),
+                    hat_id: w.other.clone(),
+                    verified: true
+                }]
+            )
+            .unwrap(),
+        RulesChange::Done(_)
+    ));
+    let (h, mut rx) = connected();
+    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    assert!(rx.try_recv().is_err());
+}
+
+#[test]
+fn evidence_validator_requires_each_independent_proof_field() {
+    use hennery_proto::delegation_status::ExecutionPolicy;
+    use hennery_sessions::delegation_runtime::evidence_satisfies;
+    let required = SessionConfig {
+        model: Some("wanted".into()),
+        mode: Some("default".into()),
+        axes: BTreeMap::from([("effort".into(), ConfigValue::Id("high".into()))]),
+    };
+    let mut c = catalog();
+    c.security.axes.insert(
+        "mode".into(),
+        vec![ConfigValue::Id("default".into()), ConfigValue::Id("plan".into())],
+    );
+    let policy = ExecutionPolicy {
+        revision: 2,
+        allowed: Default::default(),
+    };
+    let good = ConfigEvidence {
+        attach_generation: 7,
+        config_revision: 2,
+        completeness: ConfigCompleteness::Complete,
+        actual: required.clone(),
+    };
+    assert!(evidence_satisfies(&good, 7, &required, &c, &policy));
+    for field in ["generation", "revision", "partial", "unknown", "model", "mode", "axis"] {
+        let mut bad = good.clone();
+        match field {
+            "generation" => bad.attach_generation = 6,
+            "revision" => bad.config_revision = 0,
+            "partial" => bad.completeness = ConfigCompleteness::Partial,
+            "unknown" => bad.completeness = ConfigCompleteness::Unknown,
+            "model" => bad.actual.model = Some("other".into()),
+            "mode" => bad.actual.mode = Some("plan".into()),
+            _ => {
+                bad.actual.axes.insert("effort".into(), ConfigValue::Id("low".into()));
+            }
+        }
+        assert!(!evidence_satisfies(&bad, 7, &required, &c, &policy), "{field}");
+    }
+    let mut unknown = c.clone();
+    unknown.security.known = false;
+    unknown
+        .security
+        .axes
+        .insert("effort".into(), vec![ConfigValue::Id("high".into())]);
+    assert!(!evidence_satisfies(&good, 7, &required, &unknown, &policy));
+    let mut forbidden = c.clone();
+    forbidden
+        .security
+        .axes
+        .insert("mode".into(), vec![ConfigValue::Id("plan".into())]);
+    assert!(!evidence_satisfies(&good, 7, &required, &forbidden, &policy));
+}
+
+#[test]
+fn endpoint_and_family_transition_each_cancel_and_scrub_undispatched_transfer() {
+    for transition in ["endpoint", "family"] {
+        let (w, p) = pair();
+        ready(&w);
+        queue(&w, &p, "followup");
+        if transition == "endpoint" {
+            // Isolate endpoint cleanup from the independently tested family hook.
+            raw(&w).execute_batch("DROP TRIGGER delegation_family_end;").unwrap();
+            w.store.record_close_request("child").unwrap();
+            let proof: Option<String> = raw(&w)
+                .query_row(
+                    "SELECT evidence FROM session_attach_evidence WHERE session_id='child'",
+                    [],
+                    |r| r.get(0),
+                )
+                .unwrap();
+            assert!(proof.is_none());
+        } else {
+            raw(&w)
+                .execute(
+                    "UPDATE session_families SET detached=1,reason='reassigned' WHERE child_id='child'",
+                    [],
+                )
+                .unwrap();
+        }
+        let (operation,queue,payload):(String,String,String)=raw(&w).query_row("SELECT o.state,q.state,q.payload FROM session_operations o JOIN session_dispatch_queue q USING(owner_id,operation_id) WHERE o.operation_key='followup'",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap();
+        assert_eq!(operation, "cancelled", "{transition}");
+        assert_eq!(queue, "cancelled", "{transition}");
+        assert!(payload.is_empty(), "{transition}");
+    }
+}
+
+#[test]
+fn parent_close_receipt_waits_for_confirmed_child_close_and_retry_sends_nothing() {
+    let (w, p) = pair();
+    let (h, mut rx) = connected();
+    let accepted = w
+        .store
+        .queue_child_close(&p, 1, "close", "digest", "child", &h)
+        .unwrap();
+    assert_eq!(accepted.state, OperationState::AwaitingReconciliation);
+    assert!(matches!(rx.try_recv().unwrap(),CollectorFrame::CloseSession{session_id,..} if session_id=="child"));
+    assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "active");
+    assert!(w.store.find_session("child").unwrap().unwrap().close_requested);
+    w.store.ingest("child", 2, &SessionBody::SessionClosed).unwrap();
+    let completed = receipt(&w, &p, "close");
+    assert_eq!(completed.state, OperationState::Completed);
+    assert_eq!(
+        w.store
+            .queue_child_close(&p, 1, "close", "digest", "child", &h)
+            .unwrap(),
+        completed
+    );
+    assert!(rx.try_recv().is_err());
+    assert_eq!(w.store.find_session("parent").unwrap().unwrap().lifecycle, "active");
+}
+
+#[test]
+fn deleted_endpoint_scrubs_handed_payload_and_required_config_and_removes_evidence() {
+    let (w, p) = pair();
+    ready(&w);
+    queue(&w, &p, "delete");
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    take_prompt(&mut rx);
+    let before: (String, String) = raw(&w)
+        .query_row("SELECT payload,required_config FROM session_dispatch_queue", [], |r| {
+            Ok((r.get(0)?, r.get(1)?))
+        })
+        .unwrap();
+    assert!(!before.0.is_empty());
+    assert!(before.1.contains("wanted"));
+    // Exercise the deletion hook independently of prior close/settlement hooks.
+    raw(&w)
+        .execute("UPDATE sessions SET lifecycle='deleted' WHERE id='child'", [])
+        .unwrap();
+    let remaining: i64 = raw(&w)
+        .query_row("SELECT COUNT(*) FROM session_dispatch_queue", [], |r| r.get(0))
+        .unwrap();
+    assert_eq!(remaining, 0);
+    let evidence_count: i64 = raw(&w)
+        .query_row(
+            "SELECT COUNT(*) FROM session_attach_evidence WHERE session_id='child'",
+            [],
+            |r| r.get(0),
+        )
+        .unwrap();
+    assert_eq!(evidence_count, 0);
+}
+
+fn delete_endpoint(w: &World, id: &str) {
+    use hennery_sessions::store::{Deletion, Unattached};
+    let current = w.store.find_session(id).unwrap().unwrap();
+    assert!(matches!(
+        w.store
+            .delete_session(
+                id,
+                Some(&Unattached {
+                    lifecycle: current.lifecycle,
+                    presumed_parked: current.presumed_parked,
+                })
+            )
+            .unwrap(),
+        Deletion::Done { .. }
+    ));
+}
+
+fn stored_operation(w: &World, operation: &str) -> serde_json::Value {
+    let row: String = raw(w).query_row(
+        "SELECT json_object('owner_id',owner_id,'caller_id',caller_id,'operation_key',operation_key,
+        'operation_id',operation_id,'digest',digest,'tool',tool,'child_id',child_id,'state',state,'code',code,
+        'turn_id',turn_id,'pending_id',pending_id,'request_id',request_id,'accepted_revision',accepted_revision,
+        'epoch',epoch,'validated_attach',validated_attach,'validated_config',validated_config,'validated_policy',validated_policy)
+        FROM session_operations WHERE operation_id=?1",
+        [operation], |r| r.get(0)
+    ).unwrap();
+    serde_json::from_str(&row).unwrap()
+}
+
+#[test]
+fn deleted_target_keeps_only_opaque_gone_dedup_and_spawn_retry_never_allocates() {
+    for prior in ["queued", "delivered", "completed"] {
+        let (w, p) = pair();
+        let accepted = w
+            .store
+            .queue_spawn(
+                &p,
+                1,
+                "digest-private",
+                &hennery_sessions::delegation_queue::DelegatedLaunch {
+                    key: "old-spawn",
+                    agent: "claude",
+                    cwd: "/project/private",
+                    brief: "private brief",
+                    name: Some("private title"),
+                    config: &config("private-model"),
+                    mcp: McpContext::NONE,
+                },
+            )
+            .unwrap();
+        let target = accepted.child_id.as_deref().unwrap();
+        w.active(target);
+        proof(
+            &w,
+            target,
+            2,
+            1,
+            9,
+            ConfigCompleteness::Complete,
+            config("private-model"),
+        );
+        raw(&w)
+            .execute(
+                "UPDATE session_operations SET state=?1,turn_id='private-turn',pending_id='private-question',
+            request_id='private-request',accepted_revision=7,epoch=11,validated_attach=13,validated_config=17,
+            validated_policy=19 WHERE operation_id=?2",
+                params![prior, accepted.operation_id],
+            )
+            .unwrap();
+        let before: (i64, i64) = raw(&w)
+            .query_row(
+                "SELECT (SELECT COUNT(*) FROM sessions),
+            (SELECT COUNT(*) FROM session_operations)",
+                [],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .unwrap();
+        delete_endpoint(&w, target);
+        assert_eq!(
+            stored_operation(&w, &accepted.operation_id),
+            json!({
+                "owner_id":w.store.owner_id(),"caller_id":"parent","operation_key":"old-spawn",
+                "operation_id":accepted.operation_id,"digest":"digest-private","tool":"","child_id":null,
+                "state":"failed","code":"gone","turn_id":null,"pending_id":null,"request_id":null,
+                "accepted_revision":0,"epoch":0,"validated_attach":null,"validated_config":null,"validated_policy":null
+            }),
+            "{prior}"
+        );
+        let gone = receipt(&w, &p, "old-spawn");
+        assert_eq!(gone.operation_id, accepted.operation_id);
+        assert_eq!(gone.child_id, None);
+        assert_eq!(gone.turn_id, None);
+        assert_eq!(gone.pending_id, None);
+        assert_eq!(gone.state, OperationState::Failed { code: "gone".into() });
+        let retry = w
+            .store
+            .queue_spawn(
+                &p,
+                1,
+                "digest-private",
+                &hennery_sessions::delegation_queue::DelegatedLaunch {
+                    key: "old-spawn",
+                    agent: "claude",
+                    cwd: "/project/private",
+                    brief: "private brief",
+                    name: Some("private title"),
+                    config: &config("private-model"),
+                    mcp: McpContext::NONE,
+                },
+            )
+            .unwrap();
+        assert_eq!(retry, gone);
+        assert_eq!(
+            w.store.delegation_retry(&p, 1, "old-spawn", "digest-private").unwrap(),
+            Some(gone)
+        );
+        assert_eq!(
+            w.store
+                .delegation_retry(&p, 1, "old-spawn", "different")
+                .unwrap_err()
+                .to_string(),
+            "operation_conflict"
+        );
+        let after: (i64, i64) = raw(&w)
+            .query_row(
+                "SELECT (SELECT COUNT(*) FROM sessions),
+            (SELECT COUNT(*) FROM session_operations)",
+                [],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .unwrap();
+        assert_eq!(after, before);
+        let remaining: (i64, i64, i64) = raw(&w)
+            .query_row(
+                "SELECT
+            (SELECT COUNT(*) FROM session_dispatch_queue WHERE source_id=?1 OR target_id=?1),
+            (SELECT COUNT(*) FROM session_attach_evidence WHERE session_id=?1),
+            (SELECT COUNT(*) FROM session_families WHERE parent_id=?1 OR child_id=?1)",
+                [target],
+                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+            )
+            .unwrap();
+        assert_eq!(remaining, (0, 0, 0));
+        assert_eq!(w.store.find_session("parent").unwrap().unwrap().lifecycle, "active");
+        delete_endpoint(&w, "parent");
+        assert_eq!(
+            raw(&w)
+                .query_row(
+                    "SELECT COUNT(*) FROM session_operations WHERE operation_id=?1",
+                    [&accepted.operation_id],
+                    |r| r.get::<_, i64>(0)
+                )
+                .unwrap(),
+            0
+        );
+    }
+}
+
+#[test]
+fn deleting_caller_removes_receipts_and_queues_while_child_work_survives() {
+    let (w, p) = pair();
+    ready(&w);
+    let delivered = queue(&w, &p, "delivered");
+    let (h, mut rx) = connected();
+    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
+    let (_, turn) = take_prompt(&mut rx);
+    queue(&w, &p, "queued");
+    let unrelated = w.start("unrelated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
+    w.active("unrelated");
+    child(&w, &unrelated, "unrelated-child", &w.hat);
+    let kept = w
+        .store
+        .queue_followup(&unrelated, 1, "kept", "digest", "unrelated-child", "kept private")
+        .unwrap();
+    let kept_row = stored_operation(&w, &kept.operation_id);
+    delete_endpoint(&w, "parent");
+    let child = w.store.find_session("child").unwrap().unwrap();
+    assert_eq!(child.lifecycle, "active");
+    assert_eq!(child.open_turn_id, Some(turn));
+    assert!(!child.close_requested);
+    let remaining: (i64, i64, i64) = raw(&w)
+        .query_row(
+            "SELECT
+        (SELECT COUNT(*) FROM session_operations WHERE caller_id='parent'),
+        (SELECT COUNT(*) FROM session_dispatch_queue WHERE source_id='parent' OR target_id='parent'),
+        (SELECT COUNT(*) FROM session_families WHERE parent_id='parent')",
+            [],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+        )
+        .unwrap();
+    assert_eq!(remaining, (0, 0, 0));
+    assert_eq!(stored_operation(&w, &kept.operation_id), kept_row);
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT payload FROM session_dispatch_queue WHERE operation_id=?1",
+                [&kept.operation_id],
+                |r| r.get::<_, String>(0)
+            )
+            .unwrap(),
+        "kept private"
+    );
+    assert!(w.store.delegation_receipt(&p, 1, "delivered").is_err());
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM session_operations WHERE operation_id=?1",
+                [delivered.operation_id],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+}
+
+#[test]
+fn only_gone_disposition_allows_retry_without_owned_child_reference() {
+    let (w, p) = pair();
+    let accepted = queue(&w, &p, "opaque");
+    raw(&w)
+        .execute(
+            "UPDATE session_operations SET child_id=NULL WHERE operation_id=?1",
+            [&accepted.operation_id],
+        )
+        .unwrap();
+    for (state, code) in [("queued", "gone"), ("failed", "other")] {
+        raw(&w)
+            .execute(
+                "UPDATE session_operations SET state=?1,code=?2 WHERE operation_id=?3",
+                params![state, code, accepted.operation_id],
+            )
+            .unwrap();
+        assert_eq!(
+            w.store
+                .delegation_retry(&p, 1, "opaque", "opaque")
+                .unwrap_err()
+                .to_string(),
+            "not_found"
+        );
+    }
+    raw(&w)
+        .execute(
+            "UPDATE session_operations SET state='failed',code='gone' WHERE operation_id=?1",
+            [&accepted.operation_id],
+        )
+        .unwrap();
+    let gone = w.store.delegation_retry(&p, 1, "opaque", "opaque").unwrap().unwrap();
+    assert_eq!(gone.child_id, None);
+    assert_eq!(gone.state, OperationState::Failed { code: "gone".into() });
+}
+
+#[test]
+fn deleted_replacement_children_do_not_reset_starts_budget_and_caller_delete_removes_it() {
+    let (w, p) = pair();
+    for i in 0..32 {
+        let accepted = spawn(&w, &p, &format!("deleted-spawn-{i}")).unwrap();
+        delete_endpoint(&w, accepted.child_id.as_deref().unwrap());
+    }
+    assert_eq!(
+        spawn(&w, &p, "33rd-after-delete").unwrap_err().to_string(),
+        "start_budget"
+    );
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT starts FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent' AND epoch=0",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        32
+    );
+    user_turn_with_origin(&w, "parent", 2, "operator", InputOrigin::Operator {});
+    assert!(spawn(&w, &p, "new-operator-epoch").is_ok());
+    let epochs: Vec<(i64, i64)> = {
+        let c = raw(&w);
+        let mut s=c.prepare("SELECT epoch,starts FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent' ORDER BY epoch").unwrap();
+        s.query_map([w.store.owner_id()], |r| Ok((r.get(0)?, r.get(1)?)))
+            .unwrap()
+            .map(Result::unwrap)
+            .collect()
+    };
+    assert_eq!(epochs.len(), 2);
+    assert_eq!(epochs[0], (0, 32));
+    assert!(epochs[1].0 > 0);
+    assert_eq!(epochs[1].1, 1);
+    w.store.record_close_request("parent").unwrap();
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        2
+    );
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM session_operations WHERE owner_id=?1 AND caller_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        33
+    );
+    delete_endpoint(&w, "parent");
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT COUNT(*) FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        0
+    );
+}
+
+#[test]
+fn starts_budget_last_slot_is_atomic_for_four_workers_after_target_deletion() {
+    let (w, p) = pair();
+    for i in 0..31 {
+        let accepted = spawn(&w, &p, &format!("prefill-{i}")).unwrap();
+        delete_endpoint(&w, accepted.child_id.as_deref().unwrap());
+    }
+    let barrier = Arc::new(Barrier::new(4));
+    let accepted = std::thread::scope(|scope| {
+        let jobs: Vec<_> = (0..4)
+            .map(|i| {
+                let db = w.db.clone();
+                let identity = p.clone();
+                let barrier = barrier.clone();
+                scope.spawn(move || {
+                    let store = Store::open(&db).unwrap();
+                    barrier.wait();
+                    match store.queue_spawn(
+                        &identity,
+                        1,
+                        "digest",
+                        &hennery_sessions::delegation_queue::DelegatedLaunch {
+                            key: &format!("racing-{i}"),
+                            agent: "claude",
+                            cwd: "/project",
+                            brief: "brief",
+                            name: None,
+                            config: &SessionConfig::default(),
+                            mcp: McpContext::NONE,
+                        },
+                    ) {
+                        Ok(_) => 1,
+                        Err(error) => {
+                            assert_eq!(error.to_string(), "start_budget");
+                            0
+                        }
+                    }
+                })
+            })
+            .collect();
+        jobs.into_iter().map(|job| job.join().unwrap()).sum::<i32>()
+    });
+    assert_eq!(accepted, 1);
+    assert_eq!(
+        raw(&w)
+            .query_row(
+                "SELECT starts FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent' AND epoch=0",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+        32
+    );
+}
+
+#[test]
+fn endpoint_deletion_preserves_unrelated_owner_commands_proof_and_budget() {
+    for endpoint in ["parent", "child"] {
+        let (w, p) = pair();
+        ready(&w);
+        queue(&w, &p, "own");
+        spawn(&w, &p, "budget").unwrap();
+        let c = raw(&w);
+        c.execute_batch("INSERT INTO owners(id,created_at,set_up_at) VALUES ('owner-other',9223372036854775807,9223372036854775807);
+        INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('hat-other','owner-other','Other','#64748b',1);
+        INSERT INTO hosts(id,owner_id,name,public_key,platform,host_version,default_hat_id,created_at) VALUES ('host-other','owner-other','Fixture','other-key','linux','0','hat-other',1);
+        INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('parent-other','owner-other','host-other','hat-other','claude','/foreign','active','idle','0','0');
+        INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('child-other','owner-other','host-other','hat-other','claude','/foreign','starting','idle','0','0');
+        INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES ('owner-other','parent-other','foreign-key','foreign-operation','digest','session_send','child-other','queued','foreign-request');
+        INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES ('owner-other','foreign-operation','parent-other','child-other',7,'foreign private brief','{\"model\":\"foreign-model\"}');
+        INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,config_revision,evidence,requested_config,request_id) VALUES ('owner-other','child-other',7,9,'{\"private\":\"proof\"}','{\"model\":\"foreign-model\"}','foreign-attach');
+        INSERT INTO delegation_start_budgets(owner_id,caller_id,epoch,starts) VALUES ('owner-other','parent-other',0,23);").unwrap();
+        let before = stored_operation(&w, "foreign-operation");
+        delete_endpoint(&w, endpoint);
+        assert_eq!(stored_operation(&w, "foreign-operation"), before);
+        let preserved: (String, String, i64, String, String, i64, i64) = c
+            .query_row(
+                "SELECT q.payload,q.required_config,q.accepted_revision,
+            e.evidence,e.requested_config,e.attach_generation,b.starts FROM session_dispatch_queue q
+            JOIN session_attach_evidence e ON e.owner_id=q.owner_id AND e.session_id=q.target_id
+            JOIN delegation_start_budgets b ON b.owner_id=q.owner_id AND b.caller_id=q.source_id
+            WHERE q.owner_id='owner-other'",
+                [],
+                |r| {
+                    Ok((
+                        r.get(0)?,
+                        r.get(1)?,
+                        r.get(2)?,
+                        r.get(3)?,
+                        r.get(4)?,
+                        r.get(5)?,
+                        r.get(6)?,
+                    ))
+                },
+            )
+            .unwrap();
+        assert_eq!(
+            preserved,
+            (
+                "foreign private brief".into(),
+                "{\"model\":\"foreign-model\"}".into(),
+                7,
+                "{\"private\":\"proof\"}".into(),
+                "{\"model\":\"foreign-model\"}".into(),
+                7,
+                23
+            )
+        );
+        assert_eq!(
+            c.query_row(
+                "SELECT COUNT(*) FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent'",
+                [w.store.owner_id()],
+                |r| r.get::<_, i64>(0)
+            )
+            .unwrap(),
+            i64::from(endpoint == "child")
+        );
+    }
+}
+
+#[test]
+fn delegated_unattached_close_requires_unchanged_intent_lifecycle_and_presence() {
+    use hennery_sessions::store::Unattached;
+    for (guard, mutation) in [
+        ("intent", "UPDATE sessions SET close_requested=0 WHERE id='child'"),
+        ("lifecycle", "UPDATE sessions SET lifecycle='starting' WHERE id='child'"),
+        ("presence", "UPDATE sessions SET presumed_parked=1 WHERE id='child'"),
+    ] {
+        let (w, _) = pair();
+        w.store.record_close_request("child").unwrap();
+        raw(&w).execute(mutation, []).unwrap();
+        let before = w.store.find_session("child").unwrap().unwrap();
+        let events_before: i64 = raw(&w)
+            .query_row("SELECT COUNT(*) FROM events WHERE session_id='child'", [], |r| r.get(0))
+            .unwrap();
+        assert!(
+            w.store
+                .close_delegated_unattached(
+                    "child",
+                    &Unattached {
+                        lifecycle: "active".into(),
+                        presumed_parked: false
+                    },
+                )
+                .unwrap()
+                .is_empty(),
+            "{guard}"
+        );
+        let after = w.store.find_session("child").unwrap().unwrap();
+        assert_eq!(after.lifecycle, before.lifecycle, "{guard}");
+        assert_eq!(after.close_requested, before.close_requested, "{guard}");
+        assert_eq!(after.presumed_parked, before.presumed_parked, "{guard}");
+        let events_after: i64 = raw(&w)
+            .query_row("SELECT COUNT(*) FROM events WHERE session_id='child'", [], |r| r.get(0))
+            .unwrap();
+        assert_eq!(events_after, events_before, "{guard}");
+    }
+    let (w, _) = pair();
+    w.store.record_close_request("child").unwrap();
+    w.store
+        .close_delegated_unattached(
+            "child",
+            &Unattached {
+                lifecycle: "active".into(),
+                presumed_parked: false,
+            },
+        )
+        .unwrap();
+    assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "closed");
+}
+
+#[test]
+fn operator_resume_clears_delegated_close_intent_before_late_unattached_verdict() {
+    use hennery_sessions::store::{ResumeRequest, Unattached};
+    let (w, _) = pair();
+    w.store
+        .ingest(
+            "child",
+            2,
+            &SessionBody::SessionParked {
+                reason: ParkReason::Idle,
+            },
+        )
+        .unwrap();
+    w.store.record_close_request("child").unwrap();
+    let judged = Unattached {
+        lifecycle: "parked".into(),
+        presumed_parked: false,
+    };
+    assert!(matches!(
+        w.store.request_resume("child", &w.hat).unwrap(),
+        ResumeRequest::Starting { .. }
+    ));
+    assert!(w.store.close_delegated_unattached("child", &judged).unwrap().is_empty());
+    let resumed = w.store.find_session("child").unwrap().unwrap();
+    assert_eq!(resumed.lifecycle, "starting");
+    assert!(!resumed.close_requested);
+}
+
+#[test]
+fn target_pages_bound_progress_and_wrap_without_foreign_or_settled_rows() {
+    let (w, _) = pair();
+    let mut c = raw(&w);
+    let tx = c.transaction().unwrap();
+    for i in 0..133 {
+        let id = if i < 131 {
+            format!("target-{i:03}")
+        } else {
+            format!("hidden-{i}")
+        };
+        let state = if i == 131 {
+            "cancelled"
+        } else if i == 132 {
+            "settled"
+        } else if i % 2 == 0 {
+            "queued"
+        } else {
+            "waiting_config"
+        };
+        tx.execute("INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES (?1,?2,'host',?3,'claude','/project','active','idle','0','0')",params![id,w.store.owner_id(),w.hat]).unwrap();
+        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES (?1,'parent',?2,?2,'digest','session_send',?2,'queued',?2)",params![w.store.owner_id(),id]).unwrap();
+        tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config,state) VALUES (?1,?2,'parent',?2,1,'fixture','{}',?3)",params![w.store.owner_id(),id,state]).unwrap();
+    }
+    tx.execute_batch("INSERT INTO owners(id,created_at,set_up_at) VALUES ('owner-other',9223372036854775807,9223372036854775807);
+    INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('hat-other','owner-other','Other','#64748b',1);
+    INSERT INTO hosts(id,owner_id,name,public_key,platform,host_version,default_hat_id,created_at) VALUES ('host-other','owner-other','Fixture','other-key','linux','0','hat-other',1);
+    INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('foreign-first','owner-other','host-other','hat-other','claude','/foreign','active','idle','0','0');
+    INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES ('owner-other','foreign-first','foreign','foreign-operation','digest','session_send','foreign-first','queued','foreign-request');
+    INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES ('owner-other','foreign-operation','foreign-first','foreign-first',1,'fixture','{}');").unwrap();
+    tx.commit().unwrap();
+    let first = w.store.delegation_targets_after("").unwrap();
+    assert_eq!(first, (0..128).map(|i| format!("target-{i:03}")).collect::<Vec<_>>());
+    let second = w.store.delegation_targets_after(first.last().unwrap()).unwrap();
+    assert_eq!(second, ["target-128", "target-129", "target-130"]);
+    assert!(
+        w.store
+            .delegation_targets_after(second.last().unwrap())
+            .unwrap()
+            .is_empty()
+    );
+    assert_eq!(w.store.delegation_targets_after("").unwrap(), first);
+}
diff --git a/crates/hennery-sessions/tests/fixtures/undo_delegation.sql b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
new file mode 100644
index 0000000000000000000000000000000000000000..6580ca112b1eb33d9984e3d589716ac65e847695
--- /dev/null
+++ b/crates/hennery-sessions/tests/fixtures/undo_delegation.sql
@@ -0,0 +1,19 @@
+-- Test-only rollback of migration 18 before reconstructing a historical schema.
+-- Production migrations remain append-only.
+DROP TRIGGER delegation_child_identity;
+DROP TRIGGER delegation_child_immutable;
+DROP TRIGGER delegation_endpoint_end;
+DROP TRIGGER delegation_family_end;
+DROP TRIGGER delegation_grant_end;
+DROP TRIGGER delegation_answer_endpoint_end;
+DROP TRIGGER delegation_answer_grant_end;
+DROP TRIGGER delegation_config_invalidated;
+DROP TABLE session_dispatch_queue;
+DROP TABLE session_operations;
+DROP TABLE session_attach_evidence;
+DROP TABLE delegation_start_budgets;
+DROP TABLE delegation_execution_policy;
+ALTER TABLE sessions DROP COLUMN delegated_child;
+ALTER TABLE turns DROP COLUMN input_origin;
+ALTER TABLE answer_queue DROP COLUMN input_origin;
+ALTER TABLE answer_queue DROP COLUMN delegation_handoff;
diff --git a/crates/hennery-sessions/tests/owner.rs b/crates/hennery-sessions/tests/owner.rs
index 9801ea0296b22805f26314dd2e0586ceef5d2c10..32d0e7d50c8a95e9ada96574471e5e42c13e1df7 100644
--- a/crates/hennery-sessions/tests/owner.rs
+++ b/crates/hennery-sessions/tests/owner.rs
@@ -118,10 +118,13 @@ fn the_owner_id_migration_gives_every_row_the_owner() {
     {
         let conn = rusqlite::Connection::open(&db).unwrap();
         write_world(&conn, &owner, "a");
-        // Back to the store's schema before this plan (version 6): plan
+        // Back to the store's schema before this plan (version 6): D2's
+        // migration (version 18), D1's family migration (version 17), plan
         // 9a's migration (version 13), 10b-iii's (version 11), 5c's (version
         // 10) and 6b's (version 9) undone first, their indexes on `owner_id`
         // included; the events index (version 12) is made again if missing.
+        conn.execute_batch(include_str!("fixtures/undo_delegation.sql"))
+            .unwrap();
         conn.execute_batch(
             "
             DROP TRIGGER family_scope_end;
diff --git a/crates/hennery-sessions/tests/store.rs b/crates/hennery-sessions/tests/store.rs
index c7854a90ca6ed42ca7dca6a59bebdb6fba71ad3f..d8653a2d90fb4b6c1a98ddad02febe3f1dfea940 100644
--- a/crates/hennery-sessions/tests/store.rs
+++ b/crates/hennery-sessions/tests/store.rs
@@ -375,6 +375,8 @@ fn the_teardown_migration_upgrades_skeleton_turns() {
     // Roll the file back to the walking skeleton's schema (version 1).
     {
         let conn = rusqlite::Connection::open(&db).unwrap();
+        conn.execute_batch(include_str!("fixtures/undo_delegation.sql"))
+            .unwrap();
         conn.execute_batch(
             "DROP TRIGGER family_scope_end;
              DROP TRIGGER family_scope;
@@ -2464,6 +2466,8 @@ fn the_hat_migration_gives_each_session_its_hosts_default_hat() {
     // Back to the store's schema before hats (version 9): plan 10b-iii's
     // migration (version 11) and plan 9a's (version 13) undone too.
     let conn = rusqlite::Connection::open(&db).unwrap();
+    conn.execute_batch(include_str!("fixtures/undo_delegation.sql"))
+        .unwrap();
     conn.execute_batch(
         "DROP TRIGGER family_scope_end;
          DROP TRIGGER family_scope;
@@ -2744,6 +2748,9 @@ fn rows_of(conn: &Connection, id: &str, events: &[i64], turns: &[String], hashes
         let filter = match table.as_str() {
             "sessions" => format!("id = '{id}'"),
             "session_families" => format!("child_id = '{id}' OR parent_id = '{id}' OR root_id = '{id}'"),
+            "session_dispatch_queue" => format!("source_id = '{id}' OR target_id = '{id}'"),
+            "session_operations" => format!("caller_id = '{id}' OR child_id = '{id}'"),
+            "delegation_start_budgets" => format!("caller_id = '{id}'"),
             "event_attachments" => format!("event_id IN ({})", list(events.iter().map(i64::to_string).collect())),
             "turn_attachments" => format!("turn_id IN ({})", quoted(turns)),
             "attachments" => format!("sha256 IN ({})", quoted(hashes)),
@@ -2823,7 +2830,17 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
              SELECT 'family-child', host_id, agent, cwd, hat_id, 'starting', created_at, last_event_at, owner_id
              FROM sessions WHERE id = 's1';
          INSERT INTO session_families(owner_id, child_id, parent_id, root_id, hat_id, created_event_id)
-             SELECT owner_id, 'family-child', 's1', 's1', hat_id, 0 FROM sessions WHERE id = 's1';",
+             SELECT owner_id, 'family-child', 's1', 's1', hat_id, 0 FROM sessions WHERE id = 's1';
+         INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state)
+             SELECT owner_id, 's1', 'delete-queue', 'delete-operation', 'digest', 'session_send', 'family-child', 'queued'
+             FROM sessions WHERE id = 's1';
+         INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config)
+             SELECT owner_id, 'delete-operation', 's1', 'family-child', 1, 'queued private brief', '{}'
+             FROM sessions WHERE id = 's1';
+         INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config)
+             SELECT owner_id, 's1', 1, '{}' FROM sessions WHERE id = 's1';
+         INSERT INTO delegation_start_budgets(owner_id,caller_id,epoch,starts)
+             SELECT owner_id, 's1', 0, 1 FROM sessions WHERE id = 's1';",
     )
     .unwrap();
     store.close_now("s1").unwrap();
@@ -2837,6 +2854,10 @@ fn a_deleted_session_leaves_only_its_tombstone_row_and_one_event() {
         "pending",
         "session_catalog",
         "session_families",
+        "session_operations",
+        "session_dispatch_queue",
+        "session_attach_evidence",
+        "delegation_start_budgets",
         "sessions",
         "turn_attachments",
         "turns",
```

Run:

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked # expected exit 101
nix develop -c cargo test -p hennery-sessions --test owner --test store --locked # expected exit 101
nix develop -c cargo test -p hennery-proto --test codegen --locked delegation_wire_dependencies_are_exported_once # expected exit 101
```

### Task 3, step 2: feat(delegation): validate current scope and dispatch durable owned work

- [x] Implement the preceding contract; each listed GREEN command must succeed.

<!-- replay {"subject":"feat(delegation): validate current scope and dispatch durable owned work","tree":"f0380a7ff0fa124637aaf066a5f863772fbb7180","checks":[["cargo test -p hennery-sessions --test delegation --test delegation_d2 --test tool_args --test owner --test store --locked",0],["cargo test -p hennery-testkit --test owner_filter --locked",0],["cargo test -p hennery-proto --test codegen --locked",0],["cargo run -p hennery-proto --bin gen --locked -- --check",0]]} -->
```diff
diff --git a/crates/hennery-kernel/src/hats.rs b/crates/hennery-kernel/src/hats.rs
index 2d374365124f46e85b412f1583828ce17826eec4..d28b35d489b8362219ac79a5b0a147174089ba7b 100644
--- a/crates/hennery-kernel/src/hats.rs
+++ b/crates/hennery-kernel/src/hats.rs
@@ -532,16 +532,9 @@ impl Hosts {
         anyhow::ensure!(is_canonical(path), "not a canonical path: {path:?}");
         let mut conn = self.conn();
         let tx = conn.transaction()?;
-        let Some(default_hat) = host_default_hat(&tx, self.owner_id(), host_id)? else {
-            return Ok(None);
-        };
-        let rules = rules_of(&tx, self.owner_id(), host_id)?;
+        let result = session_hat_in(&tx, self.owner_id(), host_id, path)?;
         tx.commit()?;
-        let decided = resolve(&rules, &default_hat, path);
-        Ok(Some(match near_miss(&rules, path, &decided) {
-            Some(rule) => SessionHat::Ambiguous(rule.clone()),
-            None => SessionHat::Decided(decided),
-        }))
+        Ok(result)
     }

     /// Whether one of the host's rules names a hat other than its default:
@@ -682,6 +675,26 @@ impl Hosts {
     }
 }

+/// Resolve placement in the caller's mutation transaction. Delegated allocation
+/// and dispatch use this rather than retaining a preflight path-rule decision.
+pub fn session_hat_in(
+    conn: &rusqlite::Transaction<'_>,
+    owner: &str,
+    host_id: &str,
+    path: &str,
+) -> Result<Option<SessionHat>> {
+    anyhow::ensure!(is_canonical(path), "not a canonical path");
+    let Some(default_hat) = host_default_hat(conn, owner, host_id)? else {
+        return Ok(None);
+    };
+    let rules = rules_of(conn, owner, host_id)?;
+    let decided = resolve(&rules, &default_hat, path);
+    Ok(Some(match near_miss(&rules, path, &decided) {
+        Some(rule) => SessionHat::Ambiguous(rule.clone()),
+        None => SessionHat::Decided(decided),
+    }))
+}
+
 fn host_exists(conn: &rusqlite::Connection, owner: &str, host_id: &str) -> Result<bool> {
     Ok(host_default_hat(conn, owner, host_id)?.is_some())
 }
diff --git a/crates/hennery-proto/src/codegen.rs b/crates/hennery-proto/src/codegen.rs
index 003e68fa674f32923fd464bbdc3a12599bc32e53..a302f6dfad3094bb7bb9cf6539bc892bf0327fec 100644
--- a/crates/hennery-proto/src/codegen.rs
+++ b/crates/hennery-proto/src/codegen.rs
@@ -56,6 +56,14 @@ pub fn render_schema() -> String {
         delegation::CloseArgs,
         delegation::OperationReceipt,
         delegation::OperationState,
+        crate::delegation_status::ExecutionPolicy,
+        crate::delegation_status::SetExecutionPolicy,
+        crate::delegation_status::DelegationLimits,
+        crate::delegation_status::CapabilitiesResult,
+        crate::delegation_status::ChildQuestion,
+        crate::delegation_status::ChildSummary,
+        crate::delegation_status::ChildList,
+        crate::delegation_status::ChildStatus,
         crate::delegation_host::PromptFence,
         crate::delegation_host::ConfigCompleteness,
         crate::delegation_host::ConfigEvidence,
@@ -232,6 +240,14 @@ pub fn render_ts() -> String {
         delegation::HatSessionTools,
         delegation::SetSessionTools,
         delegation::SessionFamily,
+        crate::delegation_status::ExecutionPolicy,
+        crate::delegation_status::SetExecutionPolicy,
+        crate::delegation_status::DelegationLimits,
+        crate::delegation_status::CapabilitiesResult,
+        crate::delegation_status::ChildQuestion,
+        crate::delegation_status::ChildSummary,
+        crate::delegation_status::ChildList,
+        crate::delegation_status::ChildStatus,
         crate::delegation_host::PromptFence,
         crate::delegation_host::ConfigCompleteness,
         crate::delegation_host::ConfigEvidence,
diff --git a/crates/hennery-proto/src/delegation_status.rs b/crates/hennery-proto/src/delegation_status.rs
new file mode 100644
index 0000000000000000000000000000000000000000..ca02d91d22126b628e91940c90c1b7647f040d4b
--- /dev/null
+++ b/crates/hennery-proto/src/delegation_status.rs
@@ -0,0 +1,77 @@
+//! Operator configuration and bounded agent-facing delegation status.
+use crate::{
+    delegation::OperationReceipt,
+    delegation_host::HostCatalog,
+    frames::{ConfigValue, PendingKind, SessionConfig},
+};
+use schemars::JsonSchema;
+use serde::{Deserialize, Serialize};
+use std::collections::BTreeMap;
+use ts_rs::TS;
+
+pub type ExecutionAllowlist = BTreeMap<String, BTreeMap<String, Vec<ConfigValue>>>;
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(deny_unknown_fields)]
+pub struct ExecutionPolicy {
+    #[ts(type = "number")]
+    pub revision: i64,
+    /// Runtime -> profile security option id -> explicitly permitted values.
+    pub allowed: ExecutionAllowlist,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+#[serde(deny_unknown_fields)]
+pub struct SetExecutionPolicy {
+    pub allowed: ExecutionAllowlist,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct DelegationLimits {
+    pub children: u16,
+    pub starts_per_operator_epoch: u16,
+    pub queued_prompts: u16,
+    pub queued_bytes: u32,
+    pub message_bytes: u32,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct CapabilitiesResult {
+    pub runtimes: Vec<String>,
+    pub catalogs: Vec<HostCatalog>,
+    pub cwd: String,
+    pub policy: ExecutionPolicy,
+    pub limits: DelegationLimits,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ChildQuestion {
+    pub pending_id: String,
+    pub kind: PendingKind,
+    pub operator_required: bool,
+    pub answered: bool,
+    /// The display fold's elicitation question. Permissions expose no schema.
+    #[ts(type = "unknown")]
+    pub question: Option<serde_json::Value>,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ChildSummary {
+    pub child_id: String,
+    pub lifecycle: String,
+    pub activity: Option<String>,
+    pub queued: u32,
+    pub close_requested: bool,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ChildList {
+    pub children: Vec<ChildSummary>,
+    pub next_cursor: Option<String>,
+}
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct ChildStatus {
+    pub summary: ChildSummary,
+    pub requested: SessionConfig,
+    pub actual: Option<SessionConfig>,
+    pub questions: Vec<ChildQuestion>,
+    pub operations: Vec<OperationReceipt>,
+    pub last_outcome: Option<String>,
+    pub last_report: Option<String>,
+    pub truncated: bool,
+    pub reason: Option<String>,
+    pub url: String,
+}
diff --git a/crates/hennery-proto/src/lib.rs b/crates/hennery-proto/src/lib.rs
index 979b8082f4357a97cc08ca7571e819df9e001f47..b24e244d737d53296bb64298d7575a71d109f642 100644
--- a/crates/hennery-proto/src/lib.rs
+++ b/crates/hennery-proto/src/lib.rs
@@ -5,6 +5,7 @@
 //! ACP payloads travel inside them as raw JSON and are never modelled here.

 pub mod delegation_host;
+pub mod delegation_status;
 pub mod frames;
 pub mod paths;
 pub mod plugin;
diff --git a/crates/hennery-sessions/src/api.rs b/crates/hennery-sessions/src/api.rs
index b79482572a46d439d09d837287d9993c6ede96c5..f08424f97aa59e71ea155e5b7c30c3cdca8034c3 100644
--- a/crates/hennery-sessions/src/api.rs
+++ b/crates/hennery-sessions/src/api.rs
@@ -405,7 +405,7 @@ const MCP_UNDELIVERABLE: &str = "mcp_isolation_unavailable";
 /// L2): its live connection's capability and `agent`'s isolation, from the
 /// hub, and whether its rules name another hat, from the kernel. A host not
 /// connected takes nothing.
-fn mcp_context(state: &AppState, host_id: &str, agent: &str) -> anyhow::Result<McpContext> {
+pub(crate) fn mcp_context(state: &AppState, host_id: &str, agent: &str) -> anyhow::Result<McpContext> {
     let Some((capable, isolation)) = state.hub.mcp_isolation(host_id, agent) else {
         return Ok(McpContext::NONE);
     };
diff --git a/crates/hennery-sessions/src/delegation_api.rs b/crates/hennery-sessions/src/delegation_api.rs
new file mode 100644
index 0000000000000000000000000000000000000000..d9925eac91483ec3f1bf0646f8d04ceacc411cdd
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_api.rs
@@ -0,0 +1,91 @@
+//! Operator-only execution policy and the launcher's shared host catalog.
+use crate::{
+    AppState,
+    api::{error, internal},
+};
+use axum::{
+    Json, Router,
+    extract::{DefaultBodyLimit, Path, Query, State},
+    handler::Handler,
+    http::StatusCode,
+    middleware,
+    response::{IntoResponse, Response},
+    routing::get,
+};
+use hennery_kernel::json::ApiJson;
+use hennery_proto::delegation_status::SetExecutionPolicy;
+use serde::Deserialize;
+use serde_json::Value;
+pub fn router(state: AppState) -> Router {
+    let routes = Router::new()
+        .route(
+            "/api/hats/{id}/delegation-policy",
+            get(policy).patch(set_policy.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
+        )
+        .route("/api/hosts/{id}/runtime-catalog", get(catalog))
+        .layer(DefaultBodyLimit::max(32 * 1024));
+    hennery_kernel::auth::operator_only(routes, state.operator.clone()).with_state(state)
+}
+async fn policy(State(state): State<AppState>, Path(hat): Path<String>) -> Response {
+    if !matches!(state.hosts.hat(&hat), Ok(Some(_))) {
+        return error(StatusCode::NOT_FOUND, "not_found", "not found");
+    }
+    match state.store.execution_policy(&hat) {
+        Ok(policy) => Json(policy).into_response(),
+        Err(err) => internal(err),
+    }
+}
+async fn set_policy(
+    State(state): State<AppState>,
+    Path(hat): Path<String>,
+    ApiJson(value): ApiJson<Value>,
+) -> Response {
+    if !value.is_object() {
+        return error(StatusCode::BAD_REQUEST, "invalid_policy", "invalid policy");
+    }
+    let Ok(request) = serde_json::from_value::<SetExecutionPolicy>(value) else {
+        return error(StatusCode::BAD_REQUEST, "invalid_policy", "invalid policy");
+    };
+    if !matches!(state.hosts.hat(&hat), Ok(Some(_))) {
+        return error(StatusCode::NOT_FOUND, "not_found", "not found");
+    }
+    match state.store.set_execution_policy(&hat, &request.allowed) {
+        Ok(policy) => Json(policy).into_response(),
+        Err(_) => error(StatusCode::BAD_REQUEST, "invalid_policy", "invalid policy"),
+    }
+}
+#[derive(Deserialize)]
+#[serde(deny_unknown_fields)]
+struct CatalogQuery {
+    agent: String,
+    cwd: String,
+}
+async fn catalog(
+    State(state): State<AppState>,
+    Path(host): Path<String>,
+    Query(query): Query<CatalogQuery>,
+) -> Response {
+    if query.agent.is_empty() || query.agent.len() > 128 || query.cwd.len() > 4096 {
+        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
+    }
+    let resolved = match crate::resolve::resolve_on_host(&state, &host, &query.cwd).await {
+        Ok(cwd) if cwd.exists && cwd.is_dir => cwd,
+        _ => return error(StatusCode::BAD_REQUEST, "invalid_cwd", "invalid cwd"),
+    };
+    let hat = match state.hosts.session_hat(&host, &resolved.canonical) {
+        Ok(Some(hennery_kernel::hats::SessionHat::Decided(r))) => r.hat_id,
+        _ => return error(StatusCode::NOT_FOUND, "not_found", "not found"),
+    };
+    match state
+        .catalogs
+        .get(&state, &host, &hat, &resolved.canonical, &query.agent)
+        .await
+    {
+        Ok(catalog) => Json(catalog).into_response(),
+        Err(error_) => error(
+            StatusCode::CONFLICT,
+            crate::session_tools::error_code(&error_),
+            "catalog unavailable",
+        ),
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_control.rs b/crates/hennery-sessions/src/delegation_control.rs
new file mode 100644
index 0000000000000000000000000000000000000000..3668dbb4bac0d6915ffe835a0f357179094c6215
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_control.rs
@@ -0,0 +1,376 @@
+//! Direct-child inspection and ordinary elicitation, using canonical extracts.
+use crate::{
+    hub::Hub,
+    store::{AnswerSubmission, Store},
+};
+use anyhow::{Result, bail, ensure};
+use hennery_gateway::identity::SessionIdentity;
+use hennery_proto::{
+    delegation::OperationReceipt,
+    delegation_status::{ChildList, ChildQuestion, ChildStatus, ChildSummary},
+    frames::{CollectorFrame, PendingKind},
+    plugin::InputOrigin,
+    rest::AnswerRequest,
+};
+use rusqlite::{OptionalExtension, params};
+use sha2::{Digest, Sha256};
+
+/// One ordinary answer, admitted through the same validator as operator input.
+pub struct DelegatedAnswer<'a> {
+    pub key: &'a str,
+    pub child: &'a str,
+    pub pending: &'a str,
+    pub answer: &'a AnswerRequest,
+}
+impl Store {
+    pub fn queue_ordinary_answer(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        digest: &str,
+        input: &DelegatedAnswer<'_>,
+    ) -> Result<OperationReceipt> {
+        let DelegatedAnswer {
+            key,
+            child,
+            pending,
+            answer,
+        } = *input;
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        if let Some(receipt) = self.retry_in(&tx, &caller, key, digest)? {
+            return Ok(receipt);
+        }
+        ensure!(self.owned_child_in(&tx, &caller, child, false)?, "not_found");
+        let kind: Option<String> = tx
+            .query_row(
+                "SELECT kind FROM pending WHERE owner_id = ?1 AND session_id = ?2 AND pending_id = ?3",
+                params![self.owner_id(), child, pending],
+                |r| r.get(0),
+            )
+            .optional()?;
+        ensure!(kind.as_deref() != Some("permission"), "operator_required");
+        ensure!(kind.as_deref() == Some("elicitation"), "not_found");
+        let operation = uuid::Uuid::now_v7().to_string();
+        let origin = InputOrigin::Parent {
+            session_id: caller.session_id().into(),
+            operation_id: operation.clone(),
+        };
+        let queued = match self.submit_answer_in(&tx, child, pending, answer, &origin)? {
+            AnswerSubmission::Queued(q) => q,
+            AnswerSubmission::NotFound => bail!("not_found"),
+            AnswerSubmission::NotOpen => bail!("not_open"),
+            AnswerSubmission::AlreadyAnswered => bail!("already_answered"),
+            AnswerSubmission::Invalid(_) => bail!("invalid_arguments"),
+        };
+        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,pending_id,request_id,state,accepted_revision)
+            VALUES (?1,?2,?3,?4,?5,'session_answer',?6,?7,?8,'queued',?9)",params![self.owner_id(),caller.session_id(),key,operation,digest,child,pending,queued.request_id,revision])?;
+        tx.execute(
+            "UPDATE answer_queue SET delegation_handoff = 0 WHERE owner_id = ?1 AND pending_id = ?2",
+            params![self.owner_id(), pending],
+        )?;
+        let receipt = self.receipt_in(&tx, caller.session_id(), key)?.expect("inserted");
+        tx.commit()?;
+        Ok(receipt)
+    }
+    pub fn queue_child_close(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        key: &str,
+        digest: &str,
+        child: &str,
+        hub: &Hub,
+    ) -> Result<OperationReceipt> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        if let Some(receipt) = self.retry_in(&tx, &caller, key, digest)? {
+            return Ok(receipt);
+        }
+        ensure!(self.owned_child_in(&tx, &caller, child, true)?, "not_found");
+        let routing:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM session_families WHERE owner_id = ?1 AND parent_id = ?2 AND child_id = ?3 AND detached = 0)",params![self.owner_id(),caller.session_id(),child],|r|r.get(0))?;
+        ensure!(routing, "not_found");
+        let (host, lifecycle, presumed): (String, String, bool) = tx.query_row(
+            "SELECT host_id,lifecycle,presumed_parked FROM sessions WHERE owner_id = ?1 AND id = ?2",
+            params![self.owner_id(), child],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+        )?;
+        let operation = uuid::Uuid::now_v7().to_string();
+        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,request_id,state)
+            VALUES (?1,?2,?3,?4,?5,'session_close',?6,?4,?7)",params![self.owner_id(),caller.session_id(),key,operation,digest,child,if lifecycle=="closed" {"completed"}else{"awaiting_reconciliation"}])?;
+        tx.execute("UPDATE sessions SET close_requested = 1 WHERE owner_id = ?1 AND id = ?2 AND lifecycle NOT IN ('closed','deleted')",params![self.owner_id(),child])?;
+        let receipt = self.receipt_in(&tx, caller.session_id(), key)?.expect("inserted");
+        tx.commit()?;
+        let handed = hub.notify(
+            &host,
+            CollectorFrame::CloseSession {
+                request_id: operation,
+                session_id: child.into(),
+            },
+        );
+        drop(conn);
+        if !handed || !matches!(lifecycle.as_str(), "active" | "starting") {
+            self.close_delegated_unattached(
+                child,
+                &crate::store::Unattached {
+                    lifecycle: lifecycle.clone(),
+                    presumed_parked: presumed,
+                },
+            )?;
+        }
+        Ok(receipt)
+    }
+    pub fn child_list(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        cursor: Option<&str>,
+        limit: u16,
+    ) -> Result<ChildList> {
+        ensure!((1..=100).contains(&limit), "invalid_arguments");
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        let scope = hex::encode(Sha256::digest(serde_json::to_vec(&(
+            self.owner_id(),
+            caller.session_id(),
+            caller.hat_id(),
+        ))?));
+        let after = if let Some(cursor) = cursor {
+            let (bound, after) = cursor
+                .split_once('.')
+                .ok_or_else(|| anyhow::anyhow!("invalid_cursor"))?;
+            ensure!(bound == scope && after.len() <= 128, "invalid_cursor");
+            after.to_owned()
+        } else {
+            String::new()
+        };
+        let mut stmt=tx.prepare("SELECT c.id,c.lifecycle,c.activity,c.close_requested,
+            (SELECT COUNT(*) FROM session_dispatch_queue q WHERE q.owner_id = ?1 AND q.target_id = c.id AND q.state IN ('queued','waiting_config'))
+            FROM session_families f JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
+            WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.hat_id = ?3 AND c.hat_id = ?3 AND c.host_id = ?4
+            AND c.lifecycle <> 'deleted' AND (f.detached = 0 OR f.reason = 'closed') AND c.id > ?5 ORDER BY c.id LIMIT ?6")?;
+        let mut children: Vec<ChildSummary> = stmt
+            .query_map(
+                params![
+                    self.owner_id(),
+                    caller.session_id(),
+                    caller.hat_id(),
+                    caller.host_id(),
+                    after,
+                    limit as i64 + 1
+                ],
+                |r| {
+                    Ok(ChildSummary {
+                        child_id: r.get(0)?,
+                        lifecycle: r.get(1)?,
+                        activity: r.get(2)?,
+                        close_requested: r.get(3)?,
+                        queued: r.get(4)?,
+                    })
+                },
+            )?
+            .collect::<rusqlite::Result<_>>()?;
+        let next_cursor = if children.len() > limit as usize {
+            children.pop();
+            Some(format!("{scope}.{}", children.last().unwrap().child_id))
+        } else {
+            None
+        };
+        Ok(ChildList { children, next_cursor })
+    }
+    pub fn child_status(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        child: &str,
+        key: Option<&str>,
+    ) -> Result<ChildStatus> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        ensure!(self.owned_child_in(&tx, &caller, child, true)?, "not_found");
+        self.settle_delegation_in(&tx)?;
+        let summary=tx.query_row("SELECT id,lifecycle,activity,close_requested,(SELECT COUNT(*) FROM session_dispatch_queue q WHERE q.owner_id = ?1 AND q.target_id = sessions.id AND q.state IN ('queued','waiting_config')) FROM sessions WHERE owner_id = ?1 AND id = ?2",params![self.owner_id(),child],|r|Ok(ChildSummary {child_id:r.get(0)?,lifecycle:r.get(1)?,activity:r.get(2)?,close_requested:r.get(3)?,queued:r.get(4)?}))?;
+        let config: Option<(String, Option<String>)> = tx
+            .query_row(
+                "SELECT requested_config,evidence FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2",
+                params![self.owner_id(), child],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .optional()?;
+        let (requested, actual) = match config {
+            Some((r, e)) => (
+                serde_json::from_str(&r)?,
+                e.map(|e| serde_json::from_str::<hennery_proto::delegation_host::ConfigEvidence>(&e).map(|e| e.actual))
+                    .transpose()?,
+            ),
+            None => (Default::default(), None),
+        };
+        let mut operations = Vec::new();
+        let mut stmt=tx.prepare("SELECT operation_key FROM session_operations WHERE owner_id = ?1 AND caller_id = ?2 AND child_id = ?3 AND (?4 IS NULL OR operation_key = ?4) ORDER BY rowid DESC LIMIT 100")?;
+        let keys = stmt
+            .query_map(params![self.owner_id(), caller.session_id(), child, key], |r| {
+                r.get::<_, String>(0)
+            })?
+            .collect::<rusqlite::Result<Vec<_>>>()?;
+        drop(stmt);
+        for key in keys {
+            if let Some(receipt) = self.receipt_in(&tx, caller.session_id(), &key)? {
+                operations.push(receipt)
+            }
+        }
+        let last_outcome:Option<String>=tx.query_row("SELECT outcome FROM turns WHERE owner_id = ?1 AND session_id = ?2 AND state = 'ended' ORDER BY rowid DESC LIMIT 1",params![self.owner_id(),child],|r|r.get(0)).optional()?.flatten();
+        let mut questions = Vec::new();
+        let mut question_bytes = 0usize;
+        let mut truncated = false;
+        for pending in self.open_pending_in(&tx, child, 100)? {
+            let permission = pending.kind == PendingKind::Permission;
+            let mut question = if permission {
+                None
+            } else {
+                Some(serde_json::to_value(hennery_view::item::Question::from_pending(
+                    &pending,
+                ))?)
+            };
+            if let Some(value) = &question {
+                let bytes = serde_json::to_vec(value)?.len();
+                if bytes > 8192 || question_bytes + bytes > 32768 {
+                    question = None;
+                    truncated = true;
+                } else {
+                    question_bytes += bytes;
+                }
+            }
+            questions.push(ChildQuestion {
+                pending_id: pending.pending_id.clone(),
+                kind: pending.kind,
+                operator_required: permission,
+                answered: pending.answered,
+                question,
+            });
+        }
+        let mut fold = hennery_view::Fold::new();
+        let mut events = Vec::new();
+        let mut stmt=tx.prepare("SELECT event_id,host_seq,kind,body,ts FROM events WHERE owner_id = ?1 AND session_id = ?2 AND applied = 1 ORDER BY event_id DESC LIMIT 1000")?;
+        let mut rows = stmt.query(params![self.owner_id(), child])?;
+        let mut bytes = 0usize;
+        while let Some(row) = rows.next()? {
+            let raw: String = row.get(3)?;
+            if bytes + raw.len() > 128 * 1024 {
+                truncated = true;
+                break;
+            }
+            bytes += raw.len();
+            let kind: String = row.get(2)?;
+            let boundary = kind == "user_turn";
+            events.push(hennery_proto::rest::EventDto {
+                event_id: row.get(0)?,
+                session_id: child.into(),
+                host_seq: row.get::<_, Option<i64>>(1)?.map(|n| n as u64),
+                kind,
+                body: serde_json::from_str(&raw)?,
+                ts: row.get(4)?,
+            });
+            if boundary {
+                break;
+            }
+        }
+        drop(rows);
+        drop(stmt);
+        events.reverse();
+        for event in &events {
+            fold.apply(event, &|_: &str| false);
+        }
+        let mut report = String::new();
+        truncated |= events.len() == 1000;
+        for item in fold.take() {
+            if let hennery_view::Body::Message(text) = item.body {
+                report = text.text;
+                truncated |= text.truncated;
+            }
+        }
+        if report.len() > 8192 {
+            let mut start = report.len() - 8192;
+            while !report.is_char_boundary(start) {
+                start += 1;
+            }
+            report = report[start..].into();
+            truncated = true;
+        }
+        tx.commit()?;
+        Ok(ChildStatus {
+            summary,
+            requested,
+            actual,
+            questions,
+            operations,
+            last_outcome,
+            last_report: (!report.is_empty()).then_some(report),
+            truncated,
+            reason: None,
+            url: format!("/sessions/{child}"),
+        })
+    }
+}
+
+impl Store {
+    pub fn dispatch_delegation_answers(&self, hub: &Hub) -> Result<()> {
+        let mut conn = self.conn();
+        let rows = {
+            let mut stmt=conn.prepare("SELECT o.operation_id,o.caller_id,o.child_id,o.pending_id,o.request_id,o.accepted_revision,a.answer,s.host_id
+            FROM session_operations o JOIN answer_queue a ON a.owner_id = ?1 AND a.pending_id = o.pending_id
+            JOIN sessions s ON s.owner_id = ?1 AND s.id = o.child_id
+            WHERE o.owner_id = ?1 AND o.tool = 'session_answer' AND o.state = 'queued' AND a.delegation_handoff = 0 AND a.delivered IS NULL LIMIT 128")?;
+            stmt.query_map([self.owner_id()], |r| {
+                Ok((
+                    r.get::<_, String>(0)?,
+                    r.get::<_, String>(1)?,
+                    r.get::<_, String>(2)?,
+                    r.get::<_, String>(3)?,
+                    r.get::<_, String>(4)?,
+                    r.get::<_, i64>(5)?,
+                    r.get::<_, String>(6)?,
+                    r.get::<_, String>(7)?,
+                ))
+            })?
+            .collect::<rusqlite::Result<Vec<_>>>()?
+        };
+        for (operation, source, child, pending, request, revision, answer, host) in rows {
+            let tx = conn.transaction()?;
+            if !self.transfer_in(&tx, &source, &child, revision)? || !hub.is_ready(&host) {
+                continue;
+            }
+            tx.execute(
+                "UPDATE answer_queue SET delegation_handoff = 1 WHERE owner_id = ?1 AND pending_id = ?2",
+                params![self.owner_id(), pending],
+            )?;
+            tx.execute("UPDATE session_operations SET state = 'awaiting_reconciliation' WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation])?;
+            tx.commit()?;
+            let frame = crate::store::answer_frame(request, &child, &pending, serde_json::from_str(&answer)?);
+            if !self.handoff_delegated(&conn, &source, &host, frame, hub)? {
+                let tx = conn.transaction()?;
+                tx.execute(
+                    "UPDATE answer_queue SET delegation_handoff = 0 WHERE owner_id = ?1 AND pending_id = ?2",
+                    params![self.owner_id(), pending],
+                )?;
+                tx.execute(
+                    "UPDATE session_operations SET state = 'queued' WHERE owner_id = ?1 AND operation_id = ?2",
+                    params![self.owner_id(), operation],
+                )?;
+                tx.commit()?;
+            }
+        }
+        Ok(())
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_dispatch.rs b/crates/hennery-sessions/src/delegation_dispatch.rs
new file mode 100644
index 0000000000000000000000000000000000000000..0ec110f489645dff0f447e07db69d393b2b94783
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_dispatch.rs
@@ -0,0 +1,353 @@
+//! Dispatch is serialized with every endpoint/policy mutation by the shared
+//! database gate, retained across COMMIT and final synchronous host handoff.
+use crate::{
+    delegation_runtime::{evidence_satisfies, same_hat_in},
+    hub::Hub,
+    store::{McpContext, Store},
+};
+use anyhow::Result;
+use hennery_proto::{
+    delegation_host::{ConfigEvidence, HostCatalog, PromptFence},
+    frames::{Capability, CollectorFrame, SessionBody, SessionConfig},
+    plugin::InputOrigin,
+};
+use rusqlite::{OptionalExtension, Transaction, params};
+
+const TRANSFER: &str = "SELECT EXISTS(SELECT 1 FROM session_families f
+    JOIN sessions p ON p.owner_id = ?1 AND p.id = f.parent_id
+    JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
+    JOIN hosts h ON h.owner_id = ?1 AND h.id = p.host_id
+    JOIN hat_session_tools g ON g.owner_id = ?1 AND g.hat_id = f.hat_id
+    WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.child_id = ?3 AND f.detached = 0
+    AND p.hat_id = f.hat_id AND c.hat_id = f.hat_id AND p.host_id = c.host_id
+    AND p.close_requested = 0 AND c.close_requested = 0 AND h.revoked_at IS NULL
+    AND p.lifecycle IN ('active','parked') AND p.presumed_parked = 0
+    AND c.lifecycle IN ('starting','active','parked') AND c.presumed_parked = 0
+    AND g.delegation_enabled = 1 AND g.revision = ?4
+    AND (p.mcp_delivery_mode = 'isolated' OR (p.mcp_delivery_mode = 'unisolated' AND p.hat_id = h.default_hat_id))
+    AND NOT EXISTS (SELECT 1 FROM purged_hats x WHERE x.owner_id = ?1 AND x.hat_id = f.hat_id))";
+impl Store {
+    pub(crate) fn transfer_in(&self, tx: &Transaction<'_>, source: &str, target: &str, revision: i64) -> Result<bool> {
+        let eligible: bool = tx.query_row(TRANSFER, params![self.owner_id(), source, target, revision], |r| {
+            r.get(0)
+        })?;
+        if !eligible {
+            return Ok(false);
+        }
+        let (capabilities,isolation,agent,mode):(String,Option<String>,String,String)=tx.query_row(
+            "SELECT h.capabilities,h.mcp_isolation,p.agent,p.mcp_delivery_mode FROM sessions p JOIN hosts h ON h.owner_id = ?1 AND h.id = p.host_id WHERE p.owner_id = ?1 AND p.id = ?2",
+            params![self.owner_id(),source],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))?;
+        let capable = serde_json::from_str::<hennery_proto::frames::Capabilities>(&capabilities)
+            .is_ok_and(|c| c.has(Capability::McpServers));
+        let isolated = isolation
+            .and_then(|s| serde_json::from_str::<hennery_proto::frames::AgentIsolation>(&s).ok())
+            .is_some_and(|i| i.isolates(&agent));
+        Ok(capable && (mode != "isolated" || isolated))
+    }
+    pub fn delegation_targets(&self) -> Result<Vec<String>> {
+        self.delegation_targets_after("")
+    }
+    pub fn delegation_targets_after(&self, after: &str) -> Result<Vec<String>> {
+        let conn = self.conn();
+        let mut stmt=conn.prepare("SELECT DISTINCT target_id FROM session_dispatch_queue WHERE owner_id = ?1 AND target_id > ?2 AND state IN ('queued','waiting_config') ORDER BY target_id LIMIT 128")?;
+        Ok(stmt
+            .query_map(params![self.owner_id(), after], |r| r.get(0))?
+            .collect::<rusqlite::Result<_>>()?)
+    }
+    pub fn attach_delegated(&self, target: &str, mcp: McpContext, catalog: &HostCatalog, hub: &Hub) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let queue: Option<(String, i64, String)> = tx
+            .query_row(
+                "SELECT source_id,accepted_revision,required_config FROM session_dispatch_queue
+            WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config') ORDER BY position LIMIT 1",
+                params![self.owner_id(), target],
+                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+            )
+            .optional()?;
+        let Some((source, revision, required)) = queue else {
+            return Ok(false);
+        };
+        if !self.transfer_in(&tx, &source, target, revision)? {
+            return Ok(false);
+        }
+        let (lifecycle, host, hat, agent, cwd, agent_session): (
+            String,
+            String,
+            String,
+            String,
+            String,
+            Option<String>,
+        ) = tx.query_row(
+            "SELECT lifecycle,host_id,hat_id,agent,cwd,agent_session_id FROM sessions WHERE owner_id = ?1 AND id = ?2",
+            params![self.owner_id(), target],
+            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
+        )?;
+        if !hub.is_ready(&host)
+            || !hub.has_capability(&host, Capability::DelegationConfig)
+            || !same_hat_in(&tx, self.owner_id(), &host, &hat, &cwd)?
+        {
+            return Ok(false);
+        }
+        let previous:Option<(i64,bool)>=tx.query_row("SELECT attach_generation,launch_sent FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2",params![self.owner_id(),target],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
+        // Separate automatic-resume CAS: never the operator path which accepts
+        // closed/failed rows and clears close intent. Starting is only a freshly
+        // allocated child whose start has provably not been handed off.
+        let new_start = lifecycle == "starting" && previous.is_some_and(|(_, sent)| !sent) && agent_session.is_none();
+        if !new_start && lifecycle != "parked" {
+            return Ok(false);
+        }
+        if !new_start && agent_session.is_none() {
+            return Ok(false);
+        }
+        let generation = if new_start {
+            previous.unwrap().0
+        } else {
+            previous.map_or(1, |(g, _)| g + 1)
+        };
+        let config: SessionConfig = serde_json::from_str(&required)?;
+        if catalog.agent != agent
+            || !(new_start
+                && catalog.freshness != hennery_proto::delegation_host::CatalogFreshness::Fresh
+                && config.mode.is_none()
+                && config.axes.is_empty())
+                && !crate::delegation_runtime::security_allowed(catalog, &self.execution_policy_in(&tx, &hat)?, &config)
+        {
+            return Ok(false);
+        }
+        let changed = tx.execute(
+            "UPDATE sessions SET lifecycle = 'starting',activity = NULL
+            WHERE owner_id = ?1 AND id = ?2 AND close_requested = 0 AND presumed_parked = 0
+            AND (lifecycle = 'parked' OR (?3 = 1 AND lifecycle = 'starting'))",
+            params![self.owner_id(), target, new_start],
+        )?;
+        if changed != 1 {
+            return Ok(false);
+        }
+        tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config,launch_sent)
+            VALUES (?1,?2,?3,?4,1) ON CONFLICT(owner_id,session_id) DO UPDATE SET attach_generation = excluded.attach_generation,
+            config_revision = 0,evidence = NULL,launch_sent = 1",params![self.owner_id(),target,generation,required])?;
+        tx.execute("UPDATE session_dispatch_queue SET state = 'waiting_config' WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config')",params![self.owner_id(),target])?;
+        tx.execute("UPDATE session_operations SET state = 'awaiting_reconciliation' WHERE owner_id = ?1 AND child_id = ?2 AND state IN ('queued','waiting_config')",params![self.owner_id(),target])?;
+        let committed: i64 = tx.query_row(
+            "SELECT COALESCE(MAX(host_seq),0) FROM events WHERE owner_id = ?1 AND session_id = ?2",
+            params![self.owner_id(), target],
+            |r| r.get(0),
+        )?;
+        let (given, cut) = self.deliver_in(&tx, target, &host, &hat, mcp, &crate::store::now())?;
+        let request_id = uuid::Uuid::now_v7().to_string();
+        tx.execute(
+            "UPDATE session_attach_evidence SET request_id = ?3 WHERE owner_id = ?1 AND session_id = ?2",
+            params![self.owner_id(), target, request_id],
+        )?;
+        let frame = CollectorFrame::DelegatedAttach {
+            request_id,
+            session_id: target.into(),
+            committed_seq: u64::try_from(committed)?,
+            agent,
+            cwd,
+            config,
+            hat_id: hat,
+            mcp: given.frame(),
+            attach_generation: u64::try_from(generation)?,
+            agent_session_id: if new_start { None } else { agent_session },
+        };
+        crate::store::commit_then_cut(tx, self.mcp().as_ref(), cut)?;
+        // conn owns the shared gate here: close cannot commit in this gap.
+        if !self.handoff_delegated(&conn, &source, &host, frame, hub)? {
+            conn.execute("UPDATE session_operations SET state = 'waiting_config' WHERE owner_id = ?1 AND child_id = ?2 AND turn_id IS NULL AND tool IN ('session_spawn','session_send') AND state = 'awaiting_reconciliation'",params![self.owner_id(),target])?;
+            // Proven unsent, so allowing a later attempt cannot duplicate work.
+            conn.execute(
+                "UPDATE session_attach_evidence SET launch_sent = 0 WHERE owner_id = ?1 AND session_id = ?2",
+                params![self.owner_id(), target],
+            )?;
+            conn.execute(
+                "UPDATE sessions SET lifecycle = ?3 WHERE owner_id = ?1 AND id = ?2 AND close_requested = 0",
+                params![self.owner_id(), target, if new_start { "starting" } else { "parked" }],
+            )?;
+            return Ok(false);
+        }
+        Ok(true)
+    }
+    pub fn dispatch_delegated(&self, target: &str, catalog: &HostCatalog, hub: &Hub) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let queue: Option<(String, String, i64, String, String)> = tx
+            .query_row(
+                "SELECT operation_id,source_id,accepted_revision,payload,required_config FROM session_dispatch_queue
+            WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config') ORDER BY position LIMIT 1",
+                params![self.owner_id(), target],
+                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
+            )
+            .optional()?;
+        let Some((operation, source, revision, payload, required)) = queue else {
+            return Ok(false);
+        };
+        if !self.transfer_in(&tx, &source, target, revision)? {
+            return Ok(false);
+        }
+        let (host,hat,agent,cwd,eligible):(String,String,String,String,bool)=tx.query_row("SELECT host_id,hat_id,agent,cwd,lifecycle = 'active' AND open_turn_id IS NULL AND activity <> 'blocked'
+            AND NOT EXISTS (SELECT 1 FROM pending p WHERE p.owner_id = ?1 AND p.session_id = sessions.id AND p.state = 'open')
+            FROM sessions WHERE owner_id = ?1 AND id = ?2",params![self.owner_id(),target],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?)))?;
+        if !eligible
+            || catalog.agent != agent
+            || !hub.is_ready(&host)
+            || !hub.has_capability(&host, Capability::DelegationConfig)
+            || !same_hat_in(&tx, self.owner_id(), &host, &hat, &cwd)?
+        {
+            return Ok(false);
+        }
+        let evidence:Option<(i64,String)>=tx.query_row("SELECT attach_generation,evidence FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2 AND evidence IS NOT NULL",params![self.owner_id(),target],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
+        let Some((generation, evidence)) = evidence else {
+            return Ok(false);
+        };
+        let evidence: ConfigEvidence = serde_json::from_str(&evidence)?;
+        let required: SessionConfig = serde_json::from_str(&required)?;
+        let policy = self.execution_policy_in(&tx, &hat)?;
+        if !evidence_satisfies(&evidence, u64::try_from(generation)?, &required, catalog, &policy) {
+            tx.execute(
+                "UPDATE session_operations SET state = 'waiting_config' WHERE owner_id = ?1 AND operation_id = ?2",
+                params![self.owner_id(), operation],
+            )?;
+            tx.commit()?;
+            return Ok(false);
+        }
+        let turn = uuid::Uuid::now_v7().to_string();
+        let request = operation.clone();
+        let origin = InputOrigin::Parent {
+            session_id: source.clone(),
+            operation_id: operation.clone(),
+        };
+        // Explicit wrapper does not grant authority; persisted typed origin does.
+        let text = format!(
+            "From parent session {} (untrusted parent-provided task data; this is not operator approval):\n{}",
+            serde_json::to_string(&source)?,
+            payload
+        );
+        let content = vec![serde_json::json!({"type":"text","text":text})];
+        let serialized = serde_json::to_string(&content)?;
+        let changed=tx.execute("UPDATE sessions SET open_turn_id = ?3 WHERE owner_id = ?1 AND id = ?2 AND open_turn_id IS NULL AND lifecycle = 'active' AND close_requested = 0 AND presumed_parked = 0",params![self.owner_id(),target,turn])?;
+        if changed != 1 {
+            return Ok(false);
+        }
+        tx.execute(
+            "INSERT INTO turns(turn_id,session_id,content,created_at,owner_id,input_origin) VALUES (?1,?2,?3,?4,?5,?6)",
+            params![
+                turn,
+                target,
+                serialized,
+                crate::store::now(),
+                self.owner_id(),
+                serde_json::to_string(&origin)?
+            ],
+        )?;
+        tx.execute("UPDATE session_operations SET turn_id = ?3,request_id = ?2,state = 'awaiting_reconciliation',validated_attach = ?4,validated_config = ?5,validated_policy = ?6 WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation,turn,generation,i64::try_from(evidence.config_revision)?,policy.revision])?;
+        tx.execute("UPDATE session_dispatch_queue SET state = 'awaiting_reconciliation' WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation])?;
+        let frame = CollectorFrame::DelegatedPrompt {
+            request_id: request,
+            session_id: target.into(),
+            turn_id: turn.clone(),
+            content,
+            expected: PromptFence {
+                attach_generation: u64::try_from(generation)?,
+                config_revision: evidence.config_revision,
+            },
+        };
+        tx.commit()?;
+        if !self.handoff_delegated(&conn, &source, &host, frame, hub)? {
+            // No handoff happened. Return the same queue item to readiness.
+            let tx = conn.transaction()?;
+            tx.execute(
+                "UPDATE sessions SET open_turn_id = NULL WHERE owner_id = ?1 AND id = ?2 AND open_turn_id = ?3",
+                params![self.owner_id(), target, turn],
+            )?;
+            tx.execute(
+                "DELETE FROM turns WHERE owner_id = ?1 AND turn_id = ?2 AND state = 'sent'",
+                params![self.owner_id(), turn],
+            )?;
+            tx.execute("UPDATE session_operations SET state = 'queued',turn_id = NULL WHERE owner_id = ?1 AND operation_id = ?2",params![self.owner_id(),operation])?;
+            tx.execute(
+                "UPDATE session_dispatch_queue SET state = 'queued' WHERE owner_id = ?1 AND operation_id = ?2",
+                params![self.owner_id(), operation],
+            )?;
+            tx.commit()?;
+            return Ok(false);
+        }
+        Ok(true)
+    }
+    pub(crate) fn ingest_delegation_in(&self, tx: &Transaction<'_>, session: &str, body: &SessionBody) -> Result<()> {
+        if matches!(body, SessionBody::SessionStarted { .. }) {
+            tx.execute("UPDATE session_operations SET state = 'waiting_config' WHERE owner_id = ?1 AND child_id = ?2 AND turn_id IS NULL AND tool IN ('session_spawn','session_send') AND state = 'awaiting_reconciliation'",params![self.owner_id(),session])?;
+        }
+        let indexed = match body {
+            SessionBody::SessionStarted { indexed, .. }
+            | SessionBody::ConfigApplied { indexed, .. }
+            | SessionBody::AcpUpdate { indexed, .. } => Some(indexed),
+            _ => None,
+        };
+        if let Some(evidence) = indexed.and_then(|i| i.config_evidence.as_ref()) {
+            tx.execute("UPDATE session_attach_evidence SET config_revision = ?4,evidence = ?5 WHERE owner_id = ?1 AND session_id = ?2 AND attach_generation = ?3 AND config_revision < ?4
+                AND EXISTS (SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = ?2 AND lifecycle = 'active' AND close_requested = 0 AND presumed_parked = 0)",params![self.owner_id(),session,i64::try_from(evidence.attach_generation)?,i64::try_from(evidence.config_revision)?,serde_json::to_string(evidence)?])?;
+        }
+        self.settle_delegation_in(tx)
+    }
+    pub(crate) fn settle_delegation_in(&self, tx: &Transaction<'_>) -> Result<()> {
+        tx.execute("UPDATE session_operations SET state = 'completed' WHERE owner_id = ?1 AND tool = 'session_close' AND state = 'awaiting_reconciliation' AND EXISTS (SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = session_operations.child_id AND lifecycle = 'closed')",[self.owner_id()])?;
+        tx.execute("UPDATE session_operations SET state = CASE
+            WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'ended') THEN 'completed'
+            WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'started') THEN 'delivered'
+            WHEN EXISTS (SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.turn_id = session_operations.turn_id AND t.state = 'not_delivered') THEN 'not_delivered'
+            WHEN pending_id IS NOT NULL AND EXISTS (SELECT 1 FROM answer_queue a WHERE a.owner_id = ?1 AND a.pending_id = session_operations.pending_id AND a.delivered = 1) THEN 'delivered'
+            WHEN pending_id IS NOT NULL AND EXISTS (SELECT 1 FROM answer_queue a WHERE a.owner_id = ?1 AND a.pending_id = session_operations.pending_id AND a.delivered = 0) THEN 'not_delivered'
+            ELSE state END WHERE owner_id = ?1 AND state IN ('awaiting_reconciliation','delivered','not_delivered')",[self.owner_id()])?;
+        tx.execute("UPDATE session_dispatch_queue SET payload = '',state = 'settled' WHERE owner_id = ?1 AND operation_id IN
+            (SELECT operation_id FROM session_operations WHERE owner_id = ?1 AND state IN ('completed','delivered','not_delivered','failed','cancelled'))",[self.owner_id()])?;
+        Ok(())
+    }
+}
+
+impl Store {
+    /// A host rejection is proof of non-admission. Match the current host and
+    /// request association; a late or foreign rejection cannot undo a new turn.
+    pub fn reject_delegation(&self, host: &str, request: &str) -> Result<bool> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let target:Option<String>=tx.query_row("SELECT e.session_id FROM session_attach_evidence e JOIN sessions s ON s.owner_id = ?1 AND s.id = e.session_id
+            WHERE e.owner_id = ?1 AND e.request_id = ?2 AND s.host_id = ?3 AND s.lifecycle = 'starting'",params![self.owner_id(),request,host],|r|r.get(0)).optional()?;
+        if let Some(target) = target {
+            tx.commit()?;
+            drop(conn);
+            self.mark_failed_if_starting(&target, "delegated_attach_rejected")?;
+            return Ok(true);
+        }
+        let turn:Option<(String,String)>=tx.query_row("SELECT o.child_id,o.turn_id FROM session_operations o JOIN sessions s ON s.owner_id = ?1 AND s.id = o.child_id
+            WHERE o.owner_id = ?1 AND o.request_id = ?2 AND s.host_id = ?3 AND o.state = 'awaiting_reconciliation' AND o.turn_id IS NOT NULL",params![self.owner_id(),request,host],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
+        let Some((target, turn)) = turn else { return Ok(false) };
+        tx.execute(
+            "UPDATE turns SET state = 'not_delivered' WHERE owner_id = ?1 AND turn_id = ?2 AND state = 'sent'",
+            params![self.owner_id(), turn],
+        )?;
+        tx.execute("UPDATE sessions SET open_turn_id = NULL WHERE owner_id = ?1 AND id = ?2 AND open_turn_id = ?3 AND EXISTS (SELECT 1 FROM turns WHERE owner_id = ?1 AND turn_id = ?3 AND state = 'not_delivered')",params![self.owner_id(),target,turn])?;
+        self.settle_delegation_in(&tx)?;
+        tx.commit()?;
+        Ok(true)
+    }
+}
+
+impl Store {
+    pub(crate) fn handoff_delegated(
+        &self,
+        conn: &rusqlite::Connection,
+        source: &str,
+        host: &str,
+        frame: CollectorFrame,
+        hub: &Hub,
+    ) -> Result<bool> {
+        let (agent, isolated): (String, bool) = conn.query_row(
+            "SELECT agent,mcp_delivery_mode = 'isolated' FROM sessions WHERE owner_id = ?1 AND id = ?2",
+            params![self.owner_id(), source],
+            |r| Ok((r.get(0)?, r.get(1)?)),
+        )?;
+        Ok(hub.notify_parent_transfer(host, &agent, isolated, frame))
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_queue.rs b/crates/hennery-sessions/src/delegation_queue.rs
new file mode 100644
index 0000000000000000000000000000000000000000..062794729373db482c9871a31446461b415ab21b
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_queue.rs
@@ -0,0 +1,361 @@
+//! Durable parent commands. D3 can reuse the dispatch/evidence gate but owns
+//! child notices and attention; no child-to-parent delivery is produced here.
+use crate::{
+    delegation::SessionToolContext,
+    store::{McpContext, Store, now},
+};
+use anyhow::{Result, ensure};
+use hennery_gateway::identity::SessionIdentity;
+use hennery_proto::{
+    delegation::{OperationReceipt, OperationState},
+    frames::SessionConfig,
+};
+use rusqlite::{OptionalExtension, Transaction, params};
+
+pub const MAX_QUEUE: i64 = 32;
+pub const MAX_QUEUE_BYTES: i64 = 1024 * 1024;
+pub const MAX_CHILDREN: i64 = 8;
+pub const MAX_STARTS: i64 = 32;
+
+/// Validated launch values retained together through atomic allocation.
+pub struct DelegatedLaunch<'a> {
+    pub key: &'a str,
+    pub agent: &'a str,
+    pub cwd: &'a str,
+    pub brief: &'a str,
+    pub name: Option<&'a str>,
+    pub config: &'a SessionConfig,
+    pub mcp: McpContext,
+}
+
+fn uuid() -> String {
+    uuid::Uuid::now_v7().to_string()
+}
+fn state(value: &str, code: Option<String>) -> OperationState {
+    match value {
+        "accepted" => OperationState::Accepted,
+        "waiting_config" => OperationState::WaitingConfig,
+        "queued" => OperationState::Queued,
+        "awaiting_reconciliation" => OperationState::AwaitingReconciliation,
+        "delivered" => OperationState::Delivered,
+        "completed" => OperationState::Completed,
+        "not_delivered" => OperationState::NotDelivered,
+        "cancelled" => OperationState::Cancelled,
+        _ => OperationState::Failed {
+            code: code
+                .filter(|code| {
+                    code.len() <= 128
+                        && code
+                            .bytes()
+                            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
+                })
+                .unwrap_or_else(|| "failed".into()),
+        },
+    }
+}
+fn receipt_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<OperationReceipt> {
+    Ok(OperationReceipt {
+        operation_id: r.get(0)?,
+        child_id: r.get(1)?,
+        turn_id: r.get(2)?,
+        pending_id: r.get(3)?,
+        state: state(&r.get::<_, String>(4)?, r.get(5)?),
+    })
+}
+struct QueuedInput<'a> {
+    key: &'a str,
+    digest: &'a str,
+    child: &'a str,
+    text: &'a str,
+    config: &'a SessionConfig,
+    tool: &'a str,
+}
+const RECEIPT: &str = "SELECT operation_id, child_id, turn_id, pending_id, state, code FROM session_operations
+    WHERE owner_id = ?1 AND caller_id = ?2 AND operation_key = ?3";
+
+impl Store {
+    pub fn delegation_retry(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        key: &str,
+        digest: &str,
+    ) -> Result<Option<OperationReceipt>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        self.retry_in(&tx, &caller, key, digest)
+    }
+    pub fn delegation_receipt(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        key: &str,
+    ) -> Result<Option<OperationReceipt>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        self.receipt_in(&tx, caller.session_id(), key)
+    }
+    pub(crate) fn receipt_in(&self, tx: &Transaction<'_>, caller: &str, key: &str) -> Result<Option<OperationReceipt>> {
+        Ok(tx
+            .query_row(RECEIPT, params![self.owner_id(), caller, key], receipt_row)
+            .optional()?)
+    }
+    pub(crate) fn retry_in(
+        &self,
+        tx: &Transaction<'_>,
+        caller: &SessionToolContext,
+        key: &str,
+        digest: &str,
+    ) -> Result<Option<OperationReceipt>> {
+        let stored: Option<String> = tx
+            .query_row(
+                "SELECT digest FROM session_operations WHERE owner_id = ?1 AND caller_id = ?2 AND operation_key = ?3",
+                params![self.owner_id(), caller.session_id(), key],
+                |r| r.get(0),
+            )
+            .optional()?;
+        if let Some(stored) = stored {
+            ensure!(stored == digest, "operation_conflict");
+            let receipt = self.receipt_in(tx, caller.session_id(), key)?;
+            if let Some(receipt) = &receipt {
+                if let Some(child) = receipt.child_id.as_deref() {
+                    ensure!(self.owned_child_in(tx, caller, child, true)?, "not_found");
+                } else {
+                    ensure!(
+                        matches!(&receipt.state, OperationState::Failed { code } if code == "gone"),
+                        "not_found"
+                    );
+                }
+            }
+            Ok(receipt)
+        } else {
+            Ok(None)
+        }
+    }
+    pub(crate) fn owned_child_in(
+        &self,
+        tx: &Transaction<'_>,
+        caller: &SessionToolContext,
+        child: &str,
+        terminal: bool,
+    ) -> Result<bool> {
+        Ok(tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM session_families f
+            JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
+            WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND f.child_id = ?3 AND f.hat_id = ?4
+            AND c.hat_id = ?4 AND c.host_id = ?5 AND c.lifecycle <> 'deleted'
+            AND (f.detached = 0 OR (f.reason = 'closed' AND ?6 = 1))
+            AND (?6 = 1 OR (f.detached = 0 AND c.close_requested = 0 AND c.lifecycle NOT IN ('closed','failed'))))",
+            params![
+                self.owner_id(),
+                caller.session_id(),
+                child,
+                caller.hat_id(),
+                caller.host_id(),
+                terminal
+            ],
+            |r| r.get(0),
+        )?)
+    }
+    pub fn delegation_queue_depth(&self, child: &str) -> Result<(i64, i64)> {
+        let conn = self.conn();
+        Ok(conn.query_row(
+            "SELECT COUNT(*), COALESCE(SUM(length(CAST(payload AS BLOB))),0) FROM session_dispatch_queue
+            WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config')",
+            params![self.owner_id(), child],
+            |r| Ok((r.get(0)?, r.get(1)?)),
+        )?)
+    }
+    fn enqueue_in(
+        &self,
+        tx: &Transaction<'_>,
+        caller: &SessionToolContext,
+        input: QueuedInput<'_>,
+    ) -> Result<OperationReceipt> {
+        let QueuedInput {
+            key,
+            digest,
+            child,
+            text,
+            config,
+            tool,
+        } = input;
+        ensure!(text.len() <= 65536, "invalid_arguments");
+        let text = hennery_kernel::redact::text(text).unwrap_or_else(|| text.to_owned());
+        let (count,bytes):(i64,i64)=tx.query_row("SELECT COUNT(*), COALESCE(SUM(length(CAST(payload AS BLOB))),0)
+            FROM session_dispatch_queue WHERE owner_id = ?1 AND target_id = ?2 AND state IN ('queued','waiting_config')",
+            params![self.owner_id(),child],|r|Ok((r.get(0)?,r.get(1)?)))?;
+        ensure!(
+            count < MAX_QUEUE && bytes + text.len() as i64 <= MAX_QUEUE_BYTES,
+            "queue_full"
+        );
+        let operation = uuid();
+        tx.execute(
+            "INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state)
+            VALUES (?1,?2,?3,?4,?5,?6,?7,'queued')",
+            params![
+                self.owner_id(),
+                caller.session_id(),
+                key,
+                operation,
+                digest,
+                tool,
+                child
+            ],
+        )?;
+        tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config)
+            VALUES (?1,?2,?3,?4,?5,?6,?7)",params![self.owner_id(),operation,caller.session_id(),child,caller.grant_revision(),text,serde_json::to_string(config)?])?;
+        Ok(self
+            .receipt_in(tx, caller.session_id(), key)?
+            .expect("inserted receipt"))
+    }
+    pub fn queue_followup(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        key: &str,
+        digest: &str,
+        child: &str,
+        text: &str,
+    ) -> Result<OperationReceipt> {
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        if let Some(receipt) = self.retry_in(&tx, &caller, key, digest)? {
+            return Ok(receipt);
+        }
+        ensure!(self.owned_child_in(&tx, &caller, child, false)?, "not_found");
+        let raw: Option<String> = tx
+            .query_row(
+                "SELECT requested_config FROM session_attach_evidence WHERE owner_id = ?1 AND session_id = ?2",
+                params![self.owner_id(), child],
+                |r| r.get(0),
+            )
+            .optional()?;
+        let config = raw.map(|v| serde_json::from_str(&v)).transpose()?.unwrap_or_default();
+        let receipt = self.enqueue_in(
+            &tx,
+            &caller,
+            QueuedInput {
+                key,
+                digest,
+                child,
+                text,
+                config: &config,
+                tool: "session_send",
+            },
+        )?;
+        tx.commit()?;
+        Ok(receipt)
+    }
+    pub fn queue_spawn(
+        &self,
+        identity: &SessionIdentity,
+        revision: i64,
+        digest: &str,
+        launch: &DelegatedLaunch<'_>,
+    ) -> Result<OperationReceipt> {
+        let DelegatedLaunch {
+            key,
+            agent,
+            cwd,
+            brief,
+            name,
+            config,
+            mcp,
+        } = *launch;
+        let mut conn = self.conn();
+        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
+        let caller = self
+            .session_tool_context_in(&tx, identity, revision, true)?
+            .ok_or_else(|| anyhow::anyhow!("not_found"))?;
+        if let Some(receipt) = self.retry_in(&tx, &caller, key, digest)? {
+            return Ok(receipt);
+        }
+        let nested: bool = tx.query_row(
+            "SELECT delegated_child = 1 FROM sessions WHERE owner_id = ?1 AND id = ?2",
+            params![self.owner_id(), caller.session_id()],
+            |r| r.get(0),
+        )?;
+        ensure!(!nested, "generation_limit");
+        ensure!(hennery_kernel::hats::is_canonical(cwd), "invalid_cwd");
+        // Resolve under the same shared writer gate as allocation, so path rule,
+        // default-hat and purge changes cannot race family/token persistence.
+        ensure!(
+            crate::delegation_runtime::same_hat_in(&tx, self.owner_id(), caller.host_id(), caller.hat_id(), cwd)?,
+            "not_found"
+        );
+        let live: i64 = tx.query_row(
+            "SELECT COUNT(*) FROM session_families f JOIN sessions c ON c.owner_id = ?1 AND c.id = f.child_id
+            WHERE f.owner_id = ?1 AND f.parent_id = ?2 AND c.lifecycle NOT IN ('closed','deleted')",
+            params![self.owner_id(), caller.session_id()],
+            |r| r.get(0),
+        )?;
+        ensure!(live < MAX_CHILDREN, "child_limit");
+        let epoch:i64=tx.query_row("SELECT COALESCE(MAX(event_id),0) FROM events WHERE owner_id = ?1 AND session_id = ?2
+            AND kind = 'user_turn' AND applied = 1 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'",params![self.owner_id(),caller.session_id()],|r|r.get(0))?;
+        let starts: i64 = tx.query_row(
+            "SELECT COALESCE((SELECT starts FROM delegation_start_budgets
+            WHERE owner_id = ?1 AND caller_id = ?2 AND epoch = ?3),0)",
+            params![self.owner_id(), caller.session_id(), epoch],
+            |r| r.get(0),
+        )?;
+        ensure!(starts < MAX_STARTS, "start_budget");
+        tx.execute(
+            "INSERT INTO delegation_start_budgets(owner_id,caller_id,epoch,starts) VALUES (?1,?2,?3,1)
+            ON CONFLICT(owner_id,caller_id,epoch) DO UPDATE SET starts = starts + 1
+            WHERE delegation_start_budgets.owner_id = ?1",
+            params![self.owner_id(), caller.session_id(), epoch],
+        )?;
+        let child = uuid();
+        let ts = now();
+        tx.execute(
+            "INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,created_at,last_event_at,title)
+            VALUES (?1,?2,?3,?4,?5,?6,'starting',?7,?7,?8)",
+            params![
+                child,
+                self.owner_id(),
+                caller.host_id(),
+                caller.hat_id(),
+                agent,
+                cwd,
+                ts,
+                name
+            ],
+        )?;
+        ensure!(
+            self.bind_family_in(&tx, identity, revision, &child, epoch)?,
+            "not_found"
+        );
+        // Delivery commits at allocation, but launch is performed by the worker
+        // with a fresh descriptor on attach (never put a bearer in the queue).
+        let (_, cut) = self.deliver_in(&tx, &child, caller.host_id(), caller.hat_id(), mcp, &ts)?;
+        let receipt = self.enqueue_in(
+            &tx,
+            &caller,
+            QueuedInput {
+                key,
+                digest,
+                child: &child,
+                text: brief,
+                config,
+                tool: "session_spawn",
+            },
+        )?;
+        tx.execute(
+            "UPDATE session_operations SET epoch = ?3 WHERE owner_id = ?1 AND operation_id = ?2",
+            params![self.owner_id(), receipt.operation_id, epoch],
+        )?;
+        tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config) VALUES (?1,?2,1,?3)",params![self.owner_id(),child,serde_json::to_string(config)?])?;
+        crate::store::commit_then_cut(tx, self.mcp().as_ref(), cut)?;
+        Ok(receipt)
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_runtime.rs b/crates/hennery-sessions/src/delegation_runtime.rs
new file mode 100644
index 0000000000000000000000000000000000000000..f9b23eb09a6cf7d8332901b91cd8e97605216dc0
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_runtime.rs
@@ -0,0 +1,311 @@
+//! One host catalog service for launcher and tools; never infer models from a
+//! different session's retained catalog or from a model-name allowlist.
+use crate::AppState;
+use anyhow::{Result, ensure};
+use hennery_proto::{
+    delegation_host::{CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog},
+    delegation_status::ExecutionPolicy,
+    frames::{Capability, CollectorFrame, ConfigValue, HostFrame, SessionConfig},
+};
+use rusqlite::{OptionalExtension, Transaction, params};
+use serde_json::Value;
+use std::{
+    collections::BTreeMap,
+    time::{Duration, Instant},
+};
+use tokio::sync::Mutex;
+
+pub(crate) fn same_hat_in(tx: &Transaction<'_>, owner: &str, host: &str, hat: &str, cwd: &str) -> Result<bool> {
+    Ok(
+        matches!(hennery_kernel::hats::session_hat_in(tx,owner,host,cwd)?,Some(hennery_kernel::hats::SessionHat::Decided(resolution)) if resolution.hat_id==hat),
+    )
+}
+type CatalogKey = (String, String, String, String, String, u64);
+type CatalogCache = BTreeMap<CatalogKey, (Instant, HostCatalog)>;
+#[derive(Default)]
+pub struct Catalogs {
+    cache: Mutex<CatalogCache>,
+}
+impl Catalogs {
+    pub async fn get(&self, state: &AppState, host: &str, hat: &str, cwd: &str, agent: &str) -> Result<HostCatalog> {
+        state.store.catalog_scope(host, hat, cwd)?;
+        ensure!(
+            state.hub.has_capability(host, Capability::CatalogProbe),
+            "catalog_unavailable"
+        );
+        let connection = state
+            .hub
+            .routable_conn(host)
+            .ok_or_else(|| anyhow::anyhow!("host_offline"))?;
+        ensure!(
+            state.hub.runtime_ids(host).contains(&agent.to_string()),
+            "runtime_unavailable"
+        );
+        let key = (
+            state.store.owner_id().into(),
+            host.into(),
+            hat.into(),
+            cwd.into(),
+            agent.into(),
+            connection,
+        );
+        // A single bounded disposable probe at a time also deduplicates identical
+        // cold requests. The probe has its own timeout and the host its own cap.
+        let mut cache = self.cache.lock().await;
+        cache.retain(|_, (when, catalog)| {
+            when.elapsed()
+                < Duration::from_secs(if catalog.freshness == CatalogFreshness::Fresh {
+                    30
+                } else {
+                    5
+                })
+        });
+        if let Some((_, catalog)) = cache.get(&key) {
+            return Ok(catalog.clone());
+        }
+        ensure!(cache.len() < 128, "catalog_busy");
+        let request_id = uuid::Uuid::now_v7().to_string();
+        let frame = CollectorFrame::ProbeCatalog {
+            request_id: request_id.clone(),
+            agent: agent.into(),
+            cwd: cwd.into(),
+        };
+        let answer = state
+            .hub
+            .probe(host, &request_id, frame, Duration::from_secs(30))
+            .await
+            .map_err(|_| anyhow::anyhow!("catalog_unavailable"))?;
+        let HostFrame::Catalog { catalog, .. } = answer else {
+            anyhow::bail!("catalog_unavailable")
+        };
+        ensure!(
+            catalog.agent == agent
+                && catalog.adapter_revision.len() <= 256
+                && catalog.config_options.len() <= 128
+                && serde_json::to_vec(&catalog)?.len() <= 256 * 1024,
+            "catalog_unavailable"
+        );
+        ensure!(state.hub.routable_conn(host) == Some(connection), "catalog_stale");
+        state.store.catalog_scope(host, hat, cwd)?;
+        let mut value = serde_json::to_value(catalog)?;
+        hennery_kernel::redact::value(&mut value);
+        let catalog: HostCatalog = serde_json::from_value(value)?;
+        cache.insert(key, (Instant::now(), catalog.clone()));
+        Ok(catalog)
+    }
+}
+/// Host resolves canonical existence; the collector compares scope with its
+/// authoritative rules. Refusals intentionally expose neither rule nor hat name.
+pub async fn checked_cwd(state: &AppState, host: &str, hat: &str, cwd: &str) -> Result<String> {
+    let resolved = crate::resolve::resolve_on_host(state, host, cwd)
+        .await
+        .map_err(|_| anyhow::anyhow!("invalid_cwd"))?;
+    ensure!(resolved.exists && resolved.is_dir, "invalid_cwd");
+    let Some(record) = state.hosts.host(host)? else {
+        anyhow::bail!("not_found")
+    };
+    // The host probe and delegated attach enforce current canonical roots; raw hello roots may contain symlinks.
+    let _ = record;
+    ensure!(
+        matches!(state.hosts.session_hat(host,&resolved.canonical)?,Some(hennery_kernel::hats::SessionHat::Decided(r)) if r.hat_id==hat),
+        "not_found"
+    );
+    Ok(resolved.canonical)
+}
+fn options_contain(options: &Value, value: &ConfigValue) -> bool {
+    options.as_array().is_some_and(|options| {
+        options.iter().any(|o| {
+            o.get("value")
+                .and_then(Value::as_str)
+                .is_some_and(|v| *value == ConfigValue::Id(v.into()))
+                || o.get("options").is_some_and(|g| options_contain(g, value))
+        })
+    })
+}
+pub fn config_offered(catalog: &HostCatalog, requested: &SessionConfig) -> bool {
+    if catalog.freshness != CatalogFreshness::Fresh {
+        return false;
+    }
+    let has = |key: &str, value: &ConfigValue| {
+        catalog.config_options.iter().any(|option| {
+            (option.get("id").and_then(Value::as_str) == Some(key)
+                || option.get("category").and_then(Value::as_str) == Some(key))
+                && (option.get("options").is_some_and(|o| options_contain(o, value))
+                    || (option.get("type").and_then(Value::as_str) == Some("boolean")
+                        && matches!(value, ConfigValue::Bool(_))))
+        })
+    };
+    requested
+        .model
+        .as_ref()
+        .is_none_or(|v| has("model", &ConfigValue::Id(v.clone())))
+        && requested
+            .mode
+            .as_ref()
+            .is_none_or(|v| has("mode", &ConfigValue::Id(v.clone())))
+        && requested.axes.iter().all(|(key, value)| has(key, value))
+}
+pub fn security_allowed(catalog: &HostCatalog, policy: &ExecutionPolicy, actual: &SessionConfig) -> bool {
+    let overrides = policy.allowed.get(&catalog.agent);
+    if !catalog.security.known && overrides.is_none() {
+        return false;
+    }
+    let mut axes = catalog.security.axes.clone();
+    if let Some(overrides) = overrides {
+        for (key, values) in overrides {
+            axes.insert(key.clone(), values.clone());
+        }
+    }
+    if !catalog.security.known {
+        if actual.mode.is_some() && !axes.contains_key("mode") {
+            return false;
+        }
+        if actual.axes.keys().any(|key| !axes.contains_key(key)) {
+            return false;
+        }
+        if actual.mode.is_none() && actual.axes.is_empty() {
+            return false;
+        }
+    }
+    axes.iter().all(|(key, permitted)| {
+        let actual = if key == "mode" {
+            actual.mode.clone().map(ConfigValue::Id)
+        } else {
+            actual.axes.get(key).cloned()
+        };
+        actual.is_some_and(|value| permitted.contains(&value))
+    })
+}
+pub fn evidence_satisfies(
+    evidence: &ConfigEvidence,
+    generation: u64,
+    required: &SessionConfig,
+    catalog: &HostCatalog,
+    policy: &ExecutionPolicy,
+) -> bool {
+    catalog.freshness == CatalogFreshness::Fresh
+        && evidence.attach_generation == generation
+        && evidence.config_revision > 0
+        && evidence.completeness == ConfigCompleteness::Complete
+        && required
+            .model
+            .as_ref()
+            .is_none_or(|v| evidence.actual.model.as_ref() == Some(v))
+        && required
+            .mode
+            .as_ref()
+            .is_none_or(|v| evidence.actual.mode.as_ref() == Some(v))
+        && required
+            .axes
+            .iter()
+            .all(|(key, value)| evidence.actual.axes.get(key) == Some(value))
+        && security_allowed(catalog, policy, &evidence.actual)
+}
+impl crate::store::Store {
+    pub fn catalog_scope(&self, host: &str, hat: &str, cwd: &str) -> Result<()> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let eligible: bool = tx.query_row(
+            "SELECT EXISTS(SELECT 1 FROM hosts WHERE owner_id = ?1 AND id = ?2 AND revoked_at IS NULL)
+            AND NOT EXISTS (SELECT 1 FROM purged_hats WHERE owner_id = ?1 AND hat_id = ?3)",
+            params![self.owner_id(), host, hat],
+            |r| r.get(0),
+        )?;
+        ensure!(
+            eligible && same_hat_in(&tx, self.owner_id(), host, hat, cwd)?,
+            "not_found"
+        );
+        Ok(())
+    }
+    pub fn execution_policy(&self, hat: &str) -> Result<ExecutionPolicy> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        self.execution_policy_in(&tx, hat)
+    }
+    pub(crate) fn execution_policy_in(&self, tx: &Transaction<'_>, hat: &str) -> Result<ExecutionPolicy> {
+        let stored: Option<(i64, String)> = tx
+            .query_row(
+                "SELECT revision,allowed FROM delegation_execution_policy WHERE owner_id = ?1 AND hat_id = ?2",
+                params![self.owner_id(), hat],
+                |r| Ok((r.get(0)?, r.get(1)?)),
+            )
+            .optional()?;
+        match stored {
+            Some((revision, raw)) => Ok(ExecutionPolicy {
+                revision,
+                allowed: serde_json::from_str(&raw)?,
+            }),
+            None => Ok(ExecutionPolicy {
+                revision: 0,
+                allowed: Default::default(),
+            }),
+        }
+    }
+    pub fn set_execution_policy(
+        &self,
+        hat: &str,
+        allowed: &hennery_proto::delegation_status::ExecutionAllowlist,
+    ) -> Result<ExecutionPolicy> {
+        ensure!(serde_json::to_vec(allowed)?.len() <= 32 * 1024, "invalid_policy");
+        ensure!(
+            allowed.len() <= 32
+                && allowed.iter().all(|(agent, axes)| !agent.is_empty()
+                    && agent.len() <= 128
+                    && axes.len() <= 64
+                    && axes.iter().all(|(key, values)| key.len() <= 512 && values.len() <= 128)),
+            "invalid_policy"
+        );
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        tx.execute(
+            "INSERT INTO delegation_execution_policy(owner_id,hat_id,allowed,configured)
+            SELECT ?1,?2,?3,1 WHERE EXISTS (SELECT 1 FROM hats WHERE owner_id = ?1 AND id = ?2)
+            AND NOT EXISTS (SELECT 1 FROM purged_hats WHERE owner_id = ?1 AND hat_id = ?2)
+            ON CONFLICT(owner_id,hat_id) DO UPDATE SET allowed = excluded.allowed,revision = revision+1,configured = 1",
+            params![self.owner_id(), hat, serde_json::to_string(allowed)?],
+        )?;
+        let policy = self.execution_policy_in(&tx, hat)?;
+        tx.commit()?;
+        Ok(policy)
+    }
+}
+
+impl crate::store::Store {
+    /// Cold discovery may be unavailable. Only current-generation complete
+    /// host evidence can upgrade the attached child's own catalog for release.
+    pub fn attached_delegation_catalog(&self, session: &str, prestart: &HostCatalog) -> Result<HostCatalog> {
+        if prestart.freshness == CatalogFreshness::Fresh {
+            return Ok(prestart.clone());
+        }
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let row: Option<(i64, String, Option<String>)> = tx
+            .query_row(
+                "SELECT e.attach_generation,e.evidence,c.config_options FROM session_attach_evidence e
+            JOIN sessions s ON s.owner_id = ?1 AND s.id = e.session_id
+            LEFT JOIN session_catalog c ON c.owner_id = ?1 AND c.session_id = s.id
+            WHERE e.owner_id = ?1 AND e.session_id = ?2 AND e.evidence IS NOT NULL
+            AND s.lifecycle = 'active' AND s.close_requested = 0 AND s.presumed_parked = 0",
+                params![self.owner_id(), session],
+                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
+            )
+            .optional()?;
+        let Some((generation, raw, options)) = row else {
+            return Ok(prestart.clone());
+        };
+        let evidence: ConfigEvidence = serde_json::from_str(&raw)?;
+        if evidence.attach_generation != u64::try_from(generation)?
+            || evidence.completeness != ConfigCompleteness::Complete
+        {
+            return Ok(prestart.clone());
+        }
+        let mut actual = prestart.clone();
+        actual.defaults = evidence.actual;
+        actual.config_options = options
+            .map(|raw| serde_json::from_str(&raw))
+            .transpose()?
+            .unwrap_or_default();
+        actual.freshness = CatalogFreshness::Fresh;
+        Ok(actual)
+    }
+}
diff --git a/crates/hennery-sessions/src/delegation_schema.sql b/crates/hennery-sessions/src/delegation_schema.sql
new file mode 100644
index 0000000000000000000000000000000000000000..7e7fce25b7007f681b4b9e4b6d404853920ef941
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_schema.sql
@@ -0,0 +1,111 @@
+-- Sessions migration 18: delegation commands, dispatch eligibility and receipts.
+ALTER TABLE sessions ADD COLUMN delegated_child INTEGER NOT NULL DEFAULT 0;
+UPDATE sessions SET delegated_child = 1 WHERE EXISTS (SELECT 1 FROM session_families f WHERE f.owner_id = sessions.owner_id AND f.child_id = sessions.id);
+CREATE TRIGGER delegation_child_identity AFTER INSERT ON session_families
+BEGIN UPDATE sessions SET delegated_child = 1 WHERE owner_id = NEW.owner_id AND id = NEW.child_id; END;
+CREATE TRIGGER delegation_child_immutable BEFORE UPDATE OF delegated_child ON sessions
+WHEN OLD.delegated_child = 1 AND NEW.delegated_child <> 1
+BEGIN SELECT RAISE(ABORT,'immutable delegated identity'); END;
+CREATE TABLE session_operations (
+    owner_id TEXT NOT NULL, caller_id TEXT NOT NULL, operation_key TEXT NOT NULL,
+    operation_id TEXT NOT NULL, digest TEXT NOT NULL, tool TEXT NOT NULL,
+    child_id TEXT, state TEXT NOT NULL, code TEXT,
+    turn_id TEXT, pending_id TEXT, request_id TEXT, accepted_revision INTEGER NOT NULL DEFAULT 0,
+    epoch INTEGER NOT NULL DEFAULT 0,
+    PRIMARY KEY(owner_id, caller_id, operation_key), UNIQUE(owner_id, operation_id),
+    FOREIGN KEY(caller_id, owner_id) REFERENCES sessions(id, owner_id),
+    FOREIGN KEY(child_id, owner_id) REFERENCES sessions(id, owner_id));
+CREATE INDEX delegation_operations_child ON session_operations(owner_id, child_id);
+CREATE TABLE delegation_start_budgets (
+    owner_id TEXT NOT NULL, caller_id TEXT NOT NULL, epoch INTEGER NOT NULL,
+    starts INTEGER NOT NULL DEFAULT 0 CHECK(starts >= 0),
+    PRIMARY KEY(owner_id,caller_id,epoch),
+    FOREIGN KEY(caller_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE TABLE session_dispatch_queue (
+    position INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL,
+    operation_id TEXT NOT NULL, source_id TEXT NOT NULL, target_id TEXT NOT NULL,
+    accepted_revision INTEGER NOT NULL, payload TEXT NOT NULL,
+    required_config TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'queued',
+    UNIQUE(owner_id,operation_id),
+    FOREIGN KEY(owner_id,operation_id) REFERENCES session_operations(owner_id,operation_id),
+    FOREIGN KEY(source_id,owner_id) REFERENCES sessions(id,owner_id),
+    FOREIGN KEY(target_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE INDEX delegation_queue_ready ON session_dispatch_queue(owner_id, target_id, position);
+CREATE TABLE session_attach_evidence (
+    owner_id TEXT NOT NULL, session_id TEXT NOT NULL, attach_generation INTEGER NOT NULL,
+    config_revision INTEGER NOT NULL DEFAULT 0, evidence TEXT,
+    requested_config TEXT NOT NULL, launch_sent INTEGER NOT NULL DEFAULT 0,
+    PRIMARY KEY(owner_id,session_id),
+    FOREIGN KEY(session_id,owner_id) REFERENCES sessions(id,owner_id));
+CREATE TABLE delegation_execution_policy (
+    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
+    allowed TEXT NOT NULL DEFAULT '{}', configured INTEGER NOT NULL DEFAULT 0,
+    PRIMARY KEY(owner_id,hat_id),
+    FOREIGN KEY(hat_id,owner_id) REFERENCES hats(id,owner_id) ON DELETE CASCADE);
+ALTER TABLE turns ADD COLUMN input_origin TEXT NOT NULL DEFAULT '{"kind":"operator"}';
+ALTER TABLE answer_queue ADD COLUMN input_origin TEXT NOT NULL DEFAULT '{"kind":"operator"}';
+ALTER TABLE answer_queue ADD COLUMN delegation_handoff INTEGER NOT NULL DEFAULT 1;
+CREATE TRIGGER delegation_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
+WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
+BEGIN
+    UPDATE session_operations SET state = CASE WHEN NEW.lifecycle = 'failed' AND child_id = NEW.id THEN 'failed' ELSE 'cancelled' END,
+        code = CASE WHEN NEW.lifecycle = 'failed' AND child_id = NEW.id THEN COALESCE(NEW.failure_reason,'start_failed') ELSE 'endpoint_unavailable' END
+    WHERE owner_id = NEW.owner_id AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')))
+      AND (caller_id = NEW.id OR child_id = NEW.id);
+    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
+    WHERE owner_id = NEW.owner_id AND (source_id = NEW.id OR target_id = NEW.id)
+      AND state IN ('queued','waiting_config');
+    UPDATE session_attach_evidence SET evidence = NULL
+    WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
+    DELETE FROM session_dispatch_queue
+    WHERE owner_id = NEW.owner_id AND (source_id = NEW.id OR target_id = NEW.id) AND NEW.lifecycle = 'deleted';
+    DELETE FROM session_operations
+    WHERE owner_id = NEW.owner_id AND caller_id = NEW.id AND NEW.lifecycle = 'deleted';
+    UPDATE session_operations SET child_id = NULL, tool = '', state = 'failed', code = 'gone',
+        turn_id = NULL, pending_id = NULL, request_id = NULL, accepted_revision = 0, epoch = 0,
+        validated_attach = NULL, validated_config = NULL, validated_policy = NULL
+    WHERE owner_id = NEW.owner_id AND child_id = NEW.id AND NEW.lifecycle = 'deleted';
+    DELETE FROM delegation_start_budgets
+    WHERE owner_id = NEW.owner_id AND caller_id = NEW.id AND NEW.lifecycle = 'deleted';
+    DELETE FROM session_attach_evidence WHERE owner_id = NEW.owner_id AND session_id = NEW.id AND NEW.lifecycle = 'deleted';
+END;
+CREATE TRIGGER delegation_family_end AFTER UPDATE OF detached ON session_families
+WHEN NEW.detached = 1
+BEGIN
+    UPDATE session_operations SET state = 'cancelled', code = 'family_detached'
+    WHERE owner_id = NEW.owner_id AND caller_id = NEW.parent_id AND child_id = NEW.child_id
+      AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')));
+    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
+    WHERE owner_id = NEW.owner_id AND source_id = NEW.parent_id AND target_id = NEW.child_id
+      AND state IN ('queued','waiting_config');
+END;
+CREATE TRIGGER delegation_grant_end AFTER UPDATE OF revision ON hat_session_tools
+BEGIN
+    UPDATE session_operations SET state = 'cancelled', code = 'grant_changed'
+    WHERE owner_id = NEW.owner_id AND (state IN ('accepted','queued','waiting_config') OR (state = 'awaiting_reconciliation' AND turn_id IS NULL AND tool IN ('session_spawn','session_send')))
+      AND caller_id IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id);
+    UPDATE session_dispatch_queue SET state = 'cancelled', payload = ''
+    WHERE owner_id = NEW.owner_id AND accepted_revision <> NEW.revision
+      AND source_id IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id)
+      AND state IN ('queued','waiting_config');
+END;
+CREATE TRIGGER delegation_answer_endpoint_end AFTER UPDATE OF close_requested,lifecycle,hat_id ON sessions
+WHEN NEW.close_requested = 1 OR NEW.lifecycle IN ('closed','deleted','failed') OR NEW.hat_id <> OLD.hat_id
+BEGIN
+    DELETE FROM answer_queue WHERE owner_id = NEW.owner_id AND delegation_handoff = 0
+      AND (session_id = NEW.id OR json_extract(input_origin,'$.session_id') = NEW.id);
+END;
+CREATE TRIGGER delegation_answer_grant_end AFTER UPDATE OF revision ON hat_session_tools
+BEGIN
+    DELETE FROM answer_queue WHERE owner_id = NEW.owner_id AND delegation_handoff = 0
+      AND json_extract(input_origin,'$.session_id') IN (SELECT id FROM sessions WHERE owner_id = NEW.owner_id AND hat_id = NEW.hat_id);
+END;
+CREATE TRIGGER delegation_config_invalidated AFTER UPDATE OF model,mode,config_axes ON sessions
+BEGIN
+    UPDATE session_attach_evidence SET evidence = NULL
+    WHERE owner_id = NEW.owner_id AND session_id = NEW.id;
+END;
+ALTER TABLE session_operations ADD COLUMN validated_attach INTEGER;
+ALTER TABLE session_operations ADD COLUMN validated_config INTEGER;
+ALTER TABLE session_operations ADD COLUMN validated_policy INTEGER;
+ALTER TABLE session_attach_evidence ADD COLUMN request_id TEXT;
diff --git a/crates/hennery-sessions/src/delegation_worker.rs b/crates/hennery-sessions/src/delegation_worker.rs
new file mode 100644
index 0000000000000000000000000000000000000000..6298414747979dbf212be1e3e356bc0cae0d9724
--- /dev/null
+++ b/crates/hennery-sessions/src/delegation_worker.rs
@@ -0,0 +1,54 @@
+//! D2 drains parent commands only. D3 will produce durable child notices and
+//! operator attention, then reuse these same transfer/config/close gates.
+use crate::{AppState, delegation_runtime::checked_cwd};
+use std::time::Duration;
+pub fn after_startup(state: &AppState) {
+    let state = state.clone();
+    tokio::spawn(async move {
+        let mut tick = tokio::time::interval(Duration::from_millis(250));
+        let mut after = String::new();
+        loop {
+            tokio::select! {biased; ()=state.shutdown.cancelled()=>break,_=tick.tick()=>{}}
+            if let Err(error) = drain_page(&state, &mut after).await {
+                tracing::warn!(code=%crate::session_tools::error_code(&error),"delegation dispatch deferred");
+            }
+        }
+    });
+}
+pub async fn drain(state: &AppState) -> anyhow::Result<()> {
+    drain_page(state, &mut String::new()).await
+}
+async fn drain_page(state: &AppState, after: &mut String) -> anyhow::Result<()> {
+    state.store.dispatch_delegation_answers(&state.hub)?;
+    let targets = state.store.delegation_targets_after(after)?;
+    *after = targets.last().cloned().unwrap_or_default();
+    for target in targets {
+        let Some(session) = state.store.find_session(&target)? else {
+            continue;
+        };
+        if !state.hub.is_ready(&session.host_id)
+            || !matches!(session.lifecycle.as_str(), "starting" | "active" | "parked")
+        {
+            continue;
+        }
+        let work = async {
+            let cwd = checked_cwd(state, &session.host_id, &session.hat_id, &session.cwd).await?;
+            anyhow::ensure!(cwd == session.cwd, "invalid_cwd");
+            let catalog = state
+                .catalogs
+                .get(state, &session.host_id, &session.hat_id, &cwd, &session.agent)
+                .await
+                .unwrap_or_else(|_| crate::session_tools::unknown_catalog(session.agent.clone()));
+            if session.lifecycle == "active" {
+                let catalog = state.store.attached_delegation_catalog(&target, &catalog)?;
+                state.store.dispatch_delegated(&target, &catalog, &state.hub)?;
+            } else {
+                let mcp = crate::api::mcp_context(state, &session.host_id, &session.agent)?;
+                state.store.attach_delegated(&target, mcp, &catalog, &state.hub)?;
+            }
+            Ok::<_, anyhow::Error>(())
+        };
+        tokio::select! {biased; ()=state.shutdown.cancelled()=>return Ok(()),_ = work=>{}}
+    }
+    Ok(())
+}
diff --git a/crates/hennery-sessions/src/hub.rs b/crates/hennery-sessions/src/hub.rs
index a874c9a5a2922df85ed94129fb3f06ad65051d42..55f3ba24b787ede1349347bcf2c32bd79e5c3ded 100644
--- a/crates/hennery-sessions/src/hub.rs
+++ b/crates/hennery-sessions/src/hub.rs
@@ -108,6 +108,13 @@ impl HostConn {
     /// lock, against the very connection the frame goes out on, so a host
     /// that reconnects on an older build cannot slip in between.
     fn takes(&self, frame: &CollectorFrame) -> bool {
+        if matches!(
+            frame,
+            CollectorFrame::DelegatedAttach { .. } | CollectorFrame::DelegatedPrompt { .. }
+        ) && !self.capabilities.has(Capability::DelegationConfig)
+        {
+            return false;
+        }
         let Some(mcp) = frame.mcp_delivery() else {
             return true;
         };
@@ -361,6 +368,39 @@ impl Hub {
             .is_some_and(|h| h.tx.send(frame).is_ok())
     }

+    /// Final transfer check uses the same hello and lock as frame handoff.
+    pub fn notify_parent_transfer(
+        &self,
+        host_id: &str,
+        source_agent: &str,
+        isolated: bool,
+        frame: CollectorFrame,
+    ) -> bool {
+        self.hosts
+            .lock()
+            .expect("hosts lock")
+            .get(host_id)
+            .filter(|h| {
+                h.routable()
+                    && h.capabilities.has(Capability::McpServers)
+                    && (!isolated || h.mcp_isolation.isolates(source_agent))
+                    && h.takes(&frame)
+            })
+            .is_some_and(|h| h.tx.send(frame).is_ok())
+    }
+
+    /// This live hello map contains every configured runtime, including ones
+    /// with no MCP isolation. It is an inventory, never a model allowlist.
+    pub fn runtime_ids(&self, host_id: &str) -> Vec<String> {
+        self.hosts
+            .lock()
+            .expect("hosts lock")
+            .get(host_id)
+            .filter(|h| h.routable())
+            .map(|h| h.mcp_isolation.0.keys().cloned().collect())
+            .unwrap_or_default()
+    }
+
     /// Send a request and wait until the outboxed fact carrying `request_id`
     /// is ingested (`resolve`), the host rejects it (`reject`), the
     /// connection drops, or `timeout` passes.
diff --git a/crates/hennery-sessions/src/lib.rs b/crates/hennery-sessions/src/lib.rs
index f7803ed9f7bf1ca228f8b55ab27ac442a2dcf970..628918ce23380509ed334f0a5d966a6da39d319e 100644
--- a/crates/hennery-sessions/src/lib.rs
+++ b/crates/hennery-sessions/src/lib.rs
@@ -5,6 +5,12 @@ pub mod attachments;
 pub mod builtin;
 pub mod content;
 pub mod delegation;
+pub mod delegation_api;
+pub mod delegation_control;
+pub mod delegation_dispatch;
+pub mod delegation_queue;
+pub mod delegation_runtime;
+pub mod delegation_worker;
 pub mod forget;
 pub mod hats;
 pub mod hosts;
@@ -17,9 +23,11 @@ pub mod projects;
 pub mod push;
 mod redact;
 mod resolve;
+pub mod session_tools;
 mod shared_files;
 pub mod store;
 pub mod sweep;
+pub mod tool_args;
 pub mod view;
 pub mod ws;

@@ -64,6 +72,7 @@ pub struct AppState {
     pub sweep_interval: Duration,
     /// The host removals with an attempt in flight (plan 9d B7).
     pub forgets: Arc<forget::InFlight>,
+    pub catalogs: Arc<delegation_runtime::Catalogs>,
 }

 impl AppState {
@@ -82,6 +91,7 @@ impl AppState {
             push: Push::detached(),
             sweep_interval: sweep::INTERVAL,
             forgets: Arc::new(forget::InFlight::default()),
+            catalogs: Arc::default(),
         }
     }
 }
@@ -166,6 +176,7 @@ pub async fn serve_all(
 /// the client's address.
 pub fn router(state: AppState) -> Router {
     api::router(state.clone())
+        .merge(delegation_api::router(state.clone()))
         .merge(builtin::policy_router(state.clone()))
         .merge(hosts::router(state.clone()))
         .merge(hats::router(state.clone()))
diff --git a/crates/hennery-sessions/src/plugin.rs b/crates/hennery-sessions/src/plugin.rs
index 4338ae6e829bee63212b6f4022f222570cf7c134..4694802b6d884bbae1c4aaa4196dfab888387750 100644
--- a/crates/hennery-sessions/src/plugin.rs
+++ b/crates/hennery-sessions/src/plugin.rs
@@ -196,7 +196,7 @@ impl Store {
                 let input: OperatorInput =
                     serde_json::from_str(&raw).map_err(|_| anyhow::anyhow!("unsupported input origin"))?;
                 ensure!(
-                    matches!(input.origin, InputOrigin::Operator {}) && input.turn_id == *turn,
+                    self.verified_input_in(core, &input.origin, &candidate.session_id, turn)? && input.turn_id == *turn,
                     "unsupported input origin"
                 );
                 let mut user = Assembly::new(ASSEMBLY_BYTES);
@@ -345,3 +345,13 @@ impl Store {
         Ok(page)
     }
 }
+
+impl Store {
+    fn verified_input_in(&self, tx: &Transaction<'_>, origin: &InputOrigin, target: &str, turn: &str) -> Result<bool> {
+        match origin {
+            InputOrigin::Operator {}=>Ok(true),
+            InputOrigin::Parent {session_id,operation_id}=>Ok(tx.query_row("SELECT EXISTS(SELECT 1 FROM session_operations WHERE owner_id = ?1 AND operation_id = ?2 AND caller_id = ?3 AND child_id = ?4 AND turn_id = ?5 AND tool IN ('session_send','session_spawn'))",params![self.owner_id(),operation_id,session_id,target,turn],|r|r.get(0))?),
+            InputOrigin::ChildReport {..}=>Ok(false),
+        }
+    }
+}
diff --git a/crates/hennery-sessions/src/session_tools.rs b/crates/hennery-sessions/src/session_tools.rs
new file mode 100644
index 0000000000000000000000000000000000000000..669ce9a2b188316cd481455f19062229333d22ae
--- /dev/null
+++ b/crates/hennery-sessions/src/session_tools.rs
@@ -0,0 +1,223 @@
+//! D2 handlers accept only the verified caller and one canonical typed request.
+use crate::{
+    AppState,
+    delegation_runtime::{checked_cwd, config_offered, security_allowed},
+    tool_args::{ToolCall, decode_tool},
+};
+use anyhow::{Result, ensure};
+use hennery_gateway::identity::SessionIdentity;
+use hennery_proto::{
+    delegation_host::{CatalogFreshness, HostCatalog, SecurityClassification},
+    delegation_status::{CapabilitiesResult, DelegationLimits},
+    frames::Capability,
+    rest::AnswerRequest,
+};
+use serde_json::Value;
+
+pub(crate) fn unknown_catalog(agent: String) -> HostCatalog {
+    HostCatalog {
+        agent,
+        adapter_revision: String::new(),
+        config_options: vec![],
+        defaults: Default::default(),
+        security: SecurityClassification {
+            known: false,
+            axes: Default::default(),
+        },
+        freshness: CatalogFreshness::Unknown,
+    }
+}
+pub async fn execute(
+    state: &AppState,
+    identity: &SessionIdentity,
+    revision: i64,
+    name: &str,
+    args: Value,
+) -> Result<Value> {
+    let call = decode_tool(name, &args)?;
+    let digest = call.request_digest();
+    let caller = state
+        .store
+        .session_tool_context(identity, revision, true)?
+        .ok_or_else(|| anyhow::anyhow!("session_starting"))?;
+    if let Some(key) = call.operation_key().filter(|_| !matches!(call, ToolCall::Status(_)))
+        && let Some(receipt) = state.store.delegation_retry(identity, revision, key, &digest)?
+    {
+        return Ok(serde_json::to_value(receipt)?);
+    }
+    match call {
+        ToolCall::Capabilities(args) => {
+            let cwd = checked_cwd(
+                state,
+                caller.host_id(),
+                caller.hat_id(),
+                args.cwd.as_deref().unwrap_or(caller.canonical_cwd()),
+            )
+            .await?;
+            let runtimes = state.hub.runtime_ids(caller.host_id());
+            if let Some(agent) = &args.agent {
+                ensure!(runtimes.contains(agent), "runtime_unavailable");
+            }
+            let mut catalogs = Vec::new();
+            for agent in runtimes
+                .iter()
+                .filter(|agent| args.agent.as_ref().is_none_or(|a| a == *agent))
+            {
+                catalogs.push(
+                    state
+                        .catalogs
+                        .get(state, caller.host_id(), caller.hat_id(), &cwd, agent)
+                        .await
+                        .unwrap_or_else(|_| unknown_catalog(agent.clone())),
+                );
+            }
+            Ok(serde_json::to_value(CapabilitiesResult {
+                runtimes,
+                catalogs,
+                cwd,
+                policy: state.store.execution_policy(caller.hat_id())?,
+                limits: DelegationLimits {
+                    children: 8,
+                    starts_per_operator_epoch: 32,
+                    queued_prompts: 32,
+                    queued_bytes: 1024 * 1024,
+                    message_bytes: 65536,
+                },
+            })?)
+        }
+        ToolCall::Spawn(mut args) => {
+            ensure!(
+                state.hub.has_capability(caller.host_id(), Capability::DelegationConfig),
+                "session_tools_unavailable"
+            );
+            let agent = args.agent.as_deref().unwrap_or(caller.agent());
+            ensure!(
+                state.hub.runtime_ids(caller.host_id()).contains(&agent.to_string()),
+                "runtime_unavailable"
+            );
+            let cwd = checked_cwd(state, caller.host_id(), caller.hat_id(), &args.cwd).await?;
+            let catalog = state
+                .catalogs
+                .get(state, caller.host_id(), caller.hat_id(), &cwd, agent)
+                .await
+                .unwrap_or_else(|_| unknown_catalog(agent.to_string()));
+            if args.config.model.is_none() && agent == caller.agent() {
+                args.config.model = state
+                    .store
+                    .find_session(caller.session_id())?
+                    .and_then(|s| s.config.model);
+            }
+            let fresh = catalog.freshness == CatalogFreshness::Fresh;
+            if fresh {
+                ensure!(config_offered(&catalog, &args.config), "configuration_unavailable");
+            }
+            let mut required = if fresh {
+                catalog.defaults.clone()
+            } else {
+                Default::default()
+            };
+            if args.config.model.is_some() {
+                required.model = args.config.model;
+            }
+            if args.config.mode.is_some() {
+                required.mode = args.config.mode;
+            }
+            required.axes.extend(args.config.axes);
+            ensure!(
+                (!fresh && required.mode.is_none() && required.axes.is_empty())
+                    || security_allowed(&catalog, &state.store.execution_policy(caller.hat_id())?, &required),
+                "operator_required"
+            );
+            let mcp = crate::api::mcp_context(state, caller.host_id(), agent)?;
+            Ok(serde_json::to_value(state.store.queue_spawn(
+                identity,
+                revision,
+                &digest,
+                &crate::delegation_queue::DelegatedLaunch {
+                    key: &args.operation_key,
+                    agent,
+                    cwd: &cwd,
+                    brief: &args.brief,
+                    name: args.name.as_deref(),
+                    config: &required,
+                    mcp,
+                },
+            )?)?)
+        }
+        ToolCall::Send(args) => Ok(serde_json::to_value(state.store.queue_followup(
+            identity,
+            revision,
+            &args.operation_key,
+            &digest,
+            &args.child_id,
+            &args.text,
+        )?)?),
+        ToolCall::Answer(args) => {
+            let answer = AnswerRequest::Elicitation {
+                action: args.action,
+                content: args.content,
+            };
+            Ok(serde_json::to_value(state.store.queue_ordinary_answer(
+                identity,
+                revision,
+                &digest,
+                &crate::delegation_control::DelegatedAnswer {
+                    key: &args.operation_key,
+                    child: &args.child_id,
+                    pending: &args.pending_id,
+                    answer: &answer,
+                },
+            )?)?)
+        }
+        ToolCall::Status(args) => Ok(serde_json::to_value(state.store.child_status(
+            identity,
+            revision,
+            &args.child_id,
+            args.operation_key.as_deref(),
+        )?)?),
+        ToolCall::List(args) => Ok(serde_json::to_value(state.store.child_list(
+            identity,
+            revision,
+            args.cursor.as_deref(),
+            args.limit.unwrap_or(25),
+        )?)?),
+        ToolCall::Close(args) => Ok(serde_json::to_value(state.store.queue_child_close(
+            identity,
+            revision,
+            &args.operation_key,
+            &digest,
+            &args.child_id,
+            &state.hub,
+        )?)?),
+    }
+}
+pub fn error_code(error: &anyhow::Error) -> &'static str {
+    const CODES: &[&str] = &[
+        "not_found",
+        "operation_conflict",
+        "operator_required",
+        "queue_full",
+        "child_limit",
+        "start_budget",
+        "generation_limit",
+        "session_starting",
+        "runtime_unavailable",
+        "configuration_unavailable",
+        "session_tools_unavailable",
+        "catalog_unavailable",
+        "catalog_stale",
+        "catalog_busy",
+        "host_offline",
+        "invalid_cwd",
+        "not_open",
+        "already_answered",
+        "invalid_arguments",
+        "invalid_cursor",
+    ];
+    let message = error.to_string();
+    CODES
+        .iter()
+        .copied()
+        .find(|code| *code == message)
+        .unwrap_or("invalid_arguments")
+}
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index b2c5fa958622c4441c8d594a25d41472a5e64dcf..db58c68e91fc604f2eb74d520ffe237e865d9323 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -371,6 +371,7 @@ const MIGRATIONS: &[&str] = &[
           AND detached = 0 AND (NEW.hat_id <> OLD.hat_id OR NEW.close_requested = 1 OR NEW.lifecycle = 'closed');
     END;
     ",
+    include_str!("delegation_schema.sql"),
 ];

 /// The most distinct (agent session id, roots) pairs a session records
@@ -1069,7 +1070,7 @@ fn fact_applies(tx: &Transaction<'_>, owner: &str, session_id: &str, turn_id: Op
 /// with its streams cut, and a request arriving between the cut and the
 /// commit would hold a fresh watch nothing cuts. The one place the sessions
 /// module cuts (`tests/cut_after_commit.rs` holds it to that).
-fn commit_then_cut(tx: Transaction<'_>, mcp: &dyn SessionMcp, cut: Cut) -> Result<()> {
+pub(crate) fn commit_then_cut(tx: Transaction<'_>, mcp: &dyn SessionMcp, cut: Cut) -> Result<()> {
     tx.commit()?;
     mcp.cut(cut);
     Ok(())
@@ -1479,7 +1480,12 @@ fn check_answer(kind: PendingKind, option_ids: Option<&[String]>, answer: &Answe
 }

 /// The frame that carries a queued answer to its host.
-fn answer_frame(request_id: String, session_id: &str, pending_id: &str, answer: AnswerRequest) -> CollectorFrame {
+pub(crate) fn answer_frame(
+    request_id: String,
+    session_id: &str,
+    pending_id: &str,
+    answer: AnswerRequest,
+) -> CollectorFrame {
     let (session_id, pending_id) = (session_id.to_string(), pending_id.to_string());
     match answer {
         AnswerRequest::Permission { option_id } => CollectorFrame::AnswerPermission {
@@ -2434,10 +2440,13 @@ impl Store {
     /// session detail).
     pub fn open_pending(&self, session_id: &str) -> Result<Vec<PendingItem>> {
         let conn = self.conn();
+        self.open_pending_in(&conn, session_id, u32::MAX)
+    }
+    pub(crate) fn open_pending_in(&self, conn: &Connection, session_id: &str, limit: u32) -> Result<Vec<PendingItem>> {
         let mut stmt = conn.prepare(&format!(
-            "SELECT {PENDING_COLUMNS} WHERE p.session_id = ?1 AND p.state = 'open' AND p.owner_id = ?2 ORDER BY p.rowid"
+            "SELECT {PENDING_COLUMNS} WHERE p.session_id = ?1 AND p.state = 'open' AND p.owner_id = ?2 ORDER BY p.rowid LIMIT ?3"
         ))?;
-        let rows = stmt.query_map([session_id, &self.owner], PendingRow::read)?;
+        let rows = stmt.query_map(params![session_id, self.owner, limit], PendingRow::read)?;
         let mut out = Vec::new();
         for row in rows {
             out.push(row?.item()?);
@@ -2471,6 +2480,25 @@ impl Store {
     ) -> Result<AnswerSubmission> {
         let mut conn = self.conn();
         let tx = conn.transaction()?;
+        let result = self.submit_answer_in(
+            &tx,
+            session_id,
+            pending_id,
+            answer,
+            &hennery_proto::plugin::InputOrigin::Operator {},
+        )?;
+        tx.commit()?;
+        Ok(result)
+    }
+
+    pub(crate) fn submit_answer_in(
+        &self,
+        tx: &Transaction<'_>,
+        session_id: &str,
+        pending_id: &str,
+        answer: &AnswerRequest,
+        origin: &hennery_proto::plugin::InputOrigin,
+    ) -> Result<AnswerSubmission> {
         let row: Option<(String, String, Option<String>, String, bool)> = tx
             .query_row(
                 "SELECT p.kind, p.state, p.option_ids, s.host_id,
@@ -2497,20 +2525,20 @@ impl Store {
         let request_id = uuid::Uuid::now_v7().to_string();
         let ts = now();
         tx.execute(
-            "INSERT INTO answer_queue(pending_id, session_id, request_id, answer, submitted_at, owner_id)
-             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
+            "INSERT INTO answer_queue(pending_id, session_id, request_id, answer, submitted_at, owner_id, input_origin)
+             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
             params![
                 pending_id,
                 session_id,
                 request_id,
                 serde_json::to_string(answer)?,
                 ts,
-                self.owner
+                self.owner,
+                serde_json::to_string(origin)?
             ],
         )?;
-        let body = json!({ "pending_id": pending_id, "request_id": request_id, "answer": answer });
-        let event = collector_event(&tx, &self.owner, session_id, "answer_submitted", body, &ts)?;
-        tx.commit()?;
+        let body = json!({ "pending_id": pending_id, "request_id": request_id, "answer": answer, "origin": origin });
+        let event = collector_event(tx, &self.owner, session_id, "answer_submitted", body, &ts)?;
         Ok(AnswerSubmission::Queued(Box::new(QueuedAnswer {
             event,
             host_id,
@@ -2530,7 +2558,7 @@ impl Store {
              FROM answer_queue q
                  JOIN pending p ON p.pending_id = q.pending_id AND p.owner_id = q.owner_id
                  JOIN sessions s ON s.id = q.session_id AND s.owner_id = q.owner_id
-             WHERE s.host_id = ?1 AND q.delivered IS NULL AND p.state = 'open' AND q.owner_id = ?2
+             WHERE s.host_id = ?1 AND q.delivered IS NULL AND q.delegation_handoff = 1 AND p.state = 'open' AND q.owner_id = ?2
              ORDER BY q.rowid",
         )?;
         let rows = stmt.query_map([host_id, &self.owner], |r| {
@@ -2590,8 +2618,8 @@ impl Store {
         self.open_turn_with(session_id, turn_id, content, &[])
     }

-    /// C1's typed production boundary. Delegation producers are not enabled
-    /// until D3; accepting their wire types here would manufacture authority.
+    /// Public callers may produce Operator input only. The internal durable
+    /// dispatcher writes Parent provenance with its verified operation mapping.
     pub fn open_turn_with_origin(
         &self,
         session_id: &str,
@@ -3153,6 +3181,21 @@ impl Store {
         Ok(events)
     }

+    /// A delegated close judged unreachable must not tear down a newer
+    /// operator resume which deliberately cleared that close intent.
+    pub fn close_delegated_unattached(&self, session_id: &str, expected: &Unattached) -> Result<Vec<EventDto>> {
+        let mut conn = self.conn();
+        let tx = conn.transaction()?;
+        let eligible:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = ?2 AND close_requested = 1 AND lifecycle = ?3 AND presumed_parked = ?4)",params![self.owner,session_id,expected.lifecycle,expected.presumed_parked],|r|r.get(0))?;
+        if !eligible {
+            return Ok(Vec::new());
+        }
+        let mcp = self.mcp();
+        let (events, cut) = close_in(&tx, &self.owner, mcp.as_ref(), session_id)?;
+        commit_then_cut(tx, mcp.as_ref(), cut)?;
+        Ok(events)
+    }
+
     /// A `close_session` that reconciliation sent was answered
     /// `not_attached`: close collector-side like `close_now`, but only while
     /// the session is still what reconciliation asked to close — attached
@@ -3750,11 +3793,15 @@ impl Store {
                         )
                         .optional()?;
                     if let Some(content) = content {
-                        // Only the authenticated operator producer exists in
-                        // C1. This event is collector-written, never copied
-                        // from an ACP payload or inferred from prompt text.
-                        let body = json!({ "turn_id": turn_id, "content": serde_json::from_str::<Value>(&content)?,
-                            "origin": hennery_proto::plugin::InputOrigin::Operator {} });
+                        // Origin belongs to the reserved turn, written by an
+                        // authenticated operator or verified parent dispatcher.
+                        let raw_origin: String = tx.query_row(
+                            "SELECT input_origin FROM turns WHERE owner_id = ?1 AND turn_id = ?2",
+                            params![self.owner, turn_id],
+                            |r| r.get(0),
+                        )?;
+                        let origin: hennery_proto::plugin::InputOrigin = serde_json::from_str(&raw_origin)?;
+                        let body = json!({ "turn_id": turn_id, "content": serde_json::from_str::<Value>(&content)?, "origin": origin });
                         let user_turn = collector_event(&tx, &self.owner, session_id, "user_turn", body, &ts)?;
                         link_attachments(&tx, &self.owner, user_turn.event_id, &user_turn.body["content"])?;
                         created.push(user_turn);
@@ -3946,7 +3993,7 @@ impl Store {
                                  AND pending_id <> ?3 AND owner_id = ?4 AND turn_id IS NULL
                                  AND reason = 'agent_withdrew'
                                  AND opened_event_id > coalesce((SELECT max(event_id) FROM events
-                                     WHERE session_id = ?1 AND kind = 'user_turn' AND owner_id = ?4), 0)))",
+                                     WHERE session_id = ?1 AND kind = 'user_turn' AND owner_id = ?4 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'), 0)))",
                             params![session_id, indexed.turn_id, pending_id, self.owner],
                             |r| r.get::<_, bool>(0),
                         )?;
@@ -3963,7 +4010,7 @@ impl Store {
                              OR EXISTS(SELECT 1 FROM pending WHERE session_id = ?1 AND pending_id <> ?2
                                  AND owner_id = ?3 AND turn_id IS NULL AND reason = 'agent_withdrew'
                                  AND opened_event_id > coalesce((SELECT max(event_id) FROM events
-                                     WHERE session_id = ?1 AND kind = 'user_turn' AND owner_id = ?3), 0))",
+                                     WHERE session_id = ?1 AND kind = 'user_turn' AND owner_id = ?3 AND COALESCE(json_extract(body,'$.origin.kind'),'operator') = 'operator'), 0))",
                             params![session_id, pending_id, self.owner],
                             |r| r.get::<_, bool>(0),
                         )?;
@@ -4117,6 +4164,9 @@ impl Store {
             }),
             None => None,
         };
+        if !created.is_empty() {
+            self.ingest_delegation_in(&tx, session_id, body)?;
+        }
         commit_then_cut(tx, mcp.as_ref(), cut)?;
         Ok(Ingested { events: created, edge })
     }
@@ -4264,6 +4314,15 @@ impl Store {
     /// facts stored but not applied are left out (final review F1).
     pub fn events(&self, session_id: &str, after: i64, limit: u32) -> Result<Vec<EventDto>> {
         let conn = self.conn();
+        self.events_in(&conn, session_id, after, limit)
+    }
+    pub(crate) fn events_in(
+        &self,
+        conn: &Connection,
+        session_id: &str,
+        after: i64,
+        limit: u32,
+    ) -> Result<Vec<EventDto>> {
         let mut stmt = conn.prepare(EVENTS_AFTER)?;
         let rows = stmt.query_map(params![session_id, after, limit, self.owner], EventRow::read)?;
         let mut out = Vec::new();
diff --git a/crates/hennery-sessions/src/ws.rs b/crates/hennery-sessions/src/ws.rs
index 7323c9b749264d80449e266621102e7c31b29c74..5e786f54a537208c6bd4e36665915d386271f02b 100644
--- a/crates/hennery-sessions/src/ws.rs
+++ b/crates/hennery-sessions/src/ws.rs
@@ -333,6 +333,11 @@ async fn serve(socket: WebSocket, state: AppState, nonce: [u8; 32]) {
                 if state.hub.probe_rejected(conn_id, &request_id, &code, &message) {
                     continue;
                 }
+                match state.store.reject_delegation(&host_id, &request_id) {
+                    Ok(true) => continue,
+                    Ok(false) => {}
+                    Err(_) => break,
+                }
                 if let Some(session_id) = reconcile_closes.remove(&request_id) {
                     if code == "not_attached" {
                         match state.store.close_after_rejected_reconcile_close(&session_id) {
diff --git a/crates/hennery-testkit/tests/owner_filter.rs b/crates/hennery-testkit/tests/owner_filter.rs
index fde5c5100b83d67defe2811282c24c1f09b55be9..12ba481935a3d835d22c87255b5c15a0e681a65d 100644
--- a/crates/hennery-testkit/tests/owner_filter.rs
+++ b/crates/hennery-testkit/tests/owner_filter.rs
@@ -35,6 +35,26 @@ use std::sync::{Arc, Mutex};

 /// The audited sources, and the fewest statements each holds.
 const SOURCES: &[(&str, &str, usize)] = &[
+    (
+        "hennery-sessions/src/delegation_control.rs",
+        include_str!("../../hennery-sessions/src/delegation_control.rs"),
+        1,
+    ),
+    (
+        "hennery-sessions/src/delegation_dispatch.rs",
+        include_str!("../../hennery-sessions/src/delegation_dispatch.rs"),
+        1,
+    ),
+    (
+        "hennery-sessions/src/delegation_runtime.rs",
+        include_str!("../../hennery-sessions/src/delegation_runtime.rs"),
+        1,
+    ),
+    (
+        "hennery-sessions/src/delegation_queue.rs",
+        include_str!("../../hennery-sessions/src/delegation_queue.rs"),
+        15,
+    ),
     (
         "hennery-sessions/src/delegation.rs",
         include_str!("../../hennery-sessions/src/delegation.rs"),
diff --git a/crates/hennery/src/main.rs b/crates/hennery/src/main.rs
index cdabe779ed9e0c10ab0f79d6d198555664f4d49c..0c0520e8a5ad6ddd15ef628a7c62a7813b23f8e1 100644
--- a/crates/hennery/src/main.rs
+++ b/crates/hennery/src/main.rs
@@ -517,6 +517,7 @@ async fn run_collector(args: CollectorArgs) -> Result<()> {
     state.offline_threshold = std::time::Duration::from_secs(args.host_offline_secs);
     hennery_sessions::offline::after_startup(&state);
     hennery_sessions::sweep::after_startup(&state);
+    hennery_sessions::delegation_worker::after_startup(&state);
     let listeners = listeners
         .into_iter()
         .map(tokio::net::TcpListener::from_std)
diff --git a/schema/hennery-protocol.schema.json b/schema/hennery-protocol.schema.json
index 27686f385e2da37113630f1ce1ba7612a0ff001d..0837fb290a0218f6e36801cec7f156440b19981e 100644
--- a/schema/hennery-protocol.schema.json
+++ b/schema/hennery-protocol.schema.json
@@ -25,6 +25,32 @@
       "description": "`hello.mcp_isolation`: per agent id, how the host isolates its MCP\nservers. An agent left out is not isolated. Deserialized leniently, like\n`Capabilities`: an unknown mechanism counts as `none`, never as isolated\nand never a reason to refuse the `hello`.",
       "type": "object"
     },
+    "AnswerArgs": {
+      "additionalProperties": false,
+      "description": "Answer ordinary elicitation only. ACP permissions remain operator-only.",
+      "properties": {
+        "action": {
+          "$ref": "#/$defs/ElicitationAction"
+        },
+        "child_id": {
+          "type": "string"
+        },
+        "content": true,
+        "operation_key": {
+          "type": "string"
+        },
+        "pending_id": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "operation_key",
+        "child_id",
+        "pending_id",
+        "action"
+      ],
+      "type": "object"
+    },
     "AnswerRequest": {
       "anyOf": [
         {
@@ -196,6 +222,25 @@
       },
       "type": "array"
     },
+    "CapabilitiesArgs": {
+      "additionalProperties": false,
+      "description": "Caller-host capabilities, scoped to the caller's hat and validated cwd.",
+      "properties": {
+        "agent": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "cwd": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "type": "object"
+    },
     "CapabilitiesResponse": {
       "description": "`GET /api/capabilities` (kernel spec §8): the mode, which decides the\nviews the web UI shows, and the features this collector has switched\non. `features` is an open list: a client ignores a name it does not\nknow.",
       "properties": {
@@ -215,6 +260,39 @@
       ],
       "type": "object"
     },
+    "CapabilitiesResult": {
+      "properties": {
+        "catalogs": {
+          "items": {
+            "$ref": "#/$defs/HostCatalog"
+          },
+          "type": "array"
+        },
+        "cwd": {
+          "type": "string"
+        },
+        "limits": {
+          "$ref": "#/$defs/DelegationLimits"
+        },
+        "policy": {
+          "$ref": "#/$defs/ExecutionPolicy"
+        },
+        "runtimes": {
+          "items": {
+            "type": "string"
+          },
+          "type": "array"
+        }
+      },
+      "required": [
+        "runtimes",
+        "catalogs",
+        "cwd",
+        "policy",
+        "limits"
+      ],
+      "type": "object"
+    },
     "Capability": {
       "description": "A feature a host implements, announced in `hello` (ACP core §3.3). The\ncollector never sends a frame that needs a capability to a host that\nlacks it.",
       "oneOf": [
@@ -247,12 +325,326 @@
           "const": "mcp_servers",
           "description": "A session's MCP servers (plan 8c): the host passes a start's or\nresume's `mcp_servers` into `session/new` / `session/load` with the\nagent's isolation, as `hello.mcp_isolation` reports it, and refuses\nservers it cannot isolate unless the collector waived that\n(`mcp_isolation_unavailable`). A host without it gets no servers.",
           "type": "string"
+        },
+        {
+          "const": "catalog_probe",
+          "description": "Disposable runtime catalog discovery without a user prompt.",
+          "type": "string"
+        },
+        {
+          "const": "delegation_config",
+          "description": "Generation-bound evidence and serialized delegated prompt admission.",
+          "type": "string"
         }
       ]
     },
+    "CatalogFreshness": {
+      "enum": [
+        "fresh",
+        "stale",
+        "unknown"
+      ],
+      "type": "string"
+    },
+    "ChildList": {
+      "properties": {
+        "children": {
+          "items": {
+            "$ref": "#/$defs/ChildSummary"
+          },
+          "type": "array"
+        },
+        "next_cursor": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "required": [
+        "children"
+      ],
+      "type": "object"
+    },
+    "ChildQuestion": {
+      "properties": {
+        "answered": {
+          "type": "boolean"
+        },
+        "kind": {
+          "$ref": "#/$defs/PendingKind"
+        },
+        "operator_required": {
+          "type": "boolean"
+        },
+        "pending_id": {
+          "type": "string"
+        },
+        "question": {
+          "description": "The display fold's elicitation question. Permissions expose no schema."
+        }
+      },
+      "required": [
+        "pending_id",
+        "kind",
+        "operator_required",
+        "answered"
+      ],
+      "type": "object"
+    },
+    "ChildStatus": {
+      "properties": {
+        "actual": {
+          "anyOf": [
+            {
+              "$ref": "#/$defs/SessionConfig"
+            },
+            {
+              "type": "null"
+            }
+          ]
+        },
+        "last_outcome": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "last_report": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "operations": {
+          "items": {
+            "$ref": "#/$defs/OperationReceipt"
+          },
+          "type": "array"
+        },
+        "questions": {
+          "items": {
+            "$ref": "#/$defs/ChildQuestion"
+          },
+          "type": "array"
+        },
+        "reason": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "requested": {
+          "$ref": "#/$defs/SessionConfig"
+        },
+        "summary": {
+          "$ref": "#/$defs/ChildSummary"
+        },
+        "truncated": {
+          "type": "boolean"
+        },
+        "url": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "summary",
+        "requested",
+        "questions",
+        "operations",
+        "truncated",
+        "url"
+      ],
+      "type": "object"
+    },
+    "ChildSummary": {
+      "properties": {
+        "activity": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "child_id": {
+          "type": "string"
+        },
+        "close_requested": {
+          "type": "boolean"
+        },
+        "lifecycle": {
+          "type": "string"
+        },
+        "queued": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        }
+      },
+      "required": [
+        "child_id",
+        "lifecycle",
+        "queued",
+        "close_requested"
+      ],
+      "type": "object"
+    },
+    "CloseArgs": {
+      "additionalProperties": false,
+      "description": "Close one direct child. Does not delete sessions or clean files.",
+      "properties": {
+        "child_id": {
+          "type": "string"
+        },
+        "operation_key": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "operation_key",
+        "child_id"
+      ],
+      "type": "object"
+    },
     "CollectorFrame": {
       "description": "Collector -> host.",
       "oneOf": [
+        {
+          "properties": {
+            "agent": {
+              "type": "string"
+            },
+            "cwd": {
+              "type": "string"
+            },
+            "request_id": {
+              "type": "string"
+            },
+            "type": {
+              "const": "probe_catalog",
+              "type": "string"
+            }
+          },
+          "required": [
+            "type",
+            "request_id",
+            "agent",
+            "cwd"
+          ],
+          "type": "object"
+        },
+        {
+          "description": "A delegated attach uses an independently allocated, nonzero generation.\n`agent_session_id` absent starts a new adapter session; present loads it.",
+          "properties": {
+            "agent": {
+              "type": "string"
+            },
+            "agent_session_id": {
+              "type": [
+                "string",
+                "null"
+              ]
+            },
+            "attach_generation": {
+              "format": "uint64",
+              "minimum": 0,
+              "type": "integer"
+            },
+            "axes": {
+              "additionalProperties": {
+                "$ref": "#/$defs/ConfigValue"
+              },
+              "type": "object"
+            },
+            "committed_seq": {
+              "format": "uint64",
+              "minimum": 0,
+              "type": "integer"
+            },
+            "cwd": {
+              "type": "string"
+            },
+            "hat_id": {
+              "type": "string"
+            },
+            "isolation_waived": {
+              "description": "The collector knowingly delivers to an agent the host cannot isolate\n(the mixed-host fallback's default hat, or a single-hat host,\numbrella §8.5). Absent, the host refuses servers for such an agent\n(`mcp_isolation_unavailable`): isolation is never lost by omission.",
+              "type": "boolean"
+            },
+            "mcp_servers": {
+              "description": "Passed in `session/new` / `session/load`. Only to a host that\nannounced `mcp_servers`.",
+              "items": {
+                "$ref": "#/$defs/McpServer"
+              },
+              "type": "array"
+            },
+            "mode": {
+              "type": [
+                "string",
+                "null"
+              ]
+            },
+            "model": {
+              "type": [
+                "string",
+                "null"
+              ]
+            },
+            "request_id": {
+              "type": "string"
+            },
+            "session_id": {
+              "type": "string"
+            },
+            "type": {
+              "const": "delegated_attach",
+              "type": "string"
+            }
+          },
+          "required": [
+            "type",
+            "request_id",
+            "session_id",
+            "committed_seq",
+            "agent",
+            "cwd",
+            "hat_id",
+            "attach_generation"
+          ],
+          "type": "object"
+        },
+        {
+          "properties": {
+            "content": {
+              "items": true,
+              "type": "array"
+            },
+            "expected": {
+              "$ref": "#/$defs/PromptFence"
+            },
+            "request_id": {
+              "type": "string"
+            },
+            "session_id": {
+              "type": "string"
+            },
+            "turn_id": {
+              "type": "string"
+            },
+            "type": {
+              "const": "delegated_prompt",
+              "type": "string"
+            }
+          },
+          "required": [
+            "type",
+            "request_id",
+            "session_id",
+            "turn_id",
+            "content",
+            "expected"
+          ],
+          "type": "object"
+        },
         {
           "properties": {
             "collector_version": {
@@ -764,6 +1156,67 @@
         }
       ]
     },
+    "ConfigCompleteness": {
+      "enum": [
+        "complete",
+        "partial",
+        "unknown"
+      ],
+      "type": "string"
+    },
+    "ConfigEvidence": {
+      "properties": {
+        "actual": {
+          "$ref": "#/$defs/SessionConfig"
+        },
+        "attach_generation": {
+          "format": "uint64",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "completeness": {
+          "$ref": "#/$defs/ConfigCompleteness"
+        },
+        "config_revision": {
+          "format": "uint64",
+          "minimum": 0,
+          "type": "integer"
+        }
+      },
+      "required": [
+        "attach_generation",
+        "config_revision",
+        "completeness",
+        "actual"
+      ],
+      "type": "object"
+    },
+    "ConfigFields": {
+      "additionalProperties": false,
+      "description": "Object-only strict decoding/schema adapter for the shared session config.",
+      "properties": {
+        "axes": {
+          "additionalProperties": {
+            "$ref": "#/$defs/ConfigValue"
+          },
+          "default": {},
+          "type": "object"
+        },
+        "mode": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "model": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "type": "object"
+    },
     "ConfigRequest": {
       "description": "`POST /api/sessions/{id}/config`: switch one config option.",
       "properties": {
@@ -898,6 +1351,46 @@
       ],
       "type": "object"
     },
+    "DelegationLimits": {
+      "properties": {
+        "children": {
+          "format": "uint16",
+          "maximum": 65535,
+          "minimum": 0,
+          "type": "integer"
+        },
+        "message_bytes": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "queued_bytes": {
+          "format": "uint32",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "queued_prompts": {
+          "format": "uint16",
+          "maximum": 65535,
+          "minimum": 0,
+          "type": "integer"
+        },
+        "starts_per_operator_epoch": {
+          "format": "uint16",
+          "maximum": 65535,
+          "minimum": 0,
+          "type": "integer"
+        }
+      },
+      "required": [
+        "children",
+        "starts_per_operator_epoch",
+        "queued_prompts",
+        "queued_bytes",
+        "message_bytes"
+      ],
+      "type": "object"
+    },
     "DeleteResult": {
       "description": "`DELETE /api/sessions/{id}` (ACP core §4.10; plan 9d decision 7).",
       "properties": {
@@ -1069,6 +1562,33 @@
       ],
       "type": "object"
     },
+    "ExecutionPolicy": {
+      "additionalProperties": false,
+      "properties": {
+        "allowed": {
+          "additionalProperties": {
+            "additionalProperties": {
+              "items": {
+                "$ref": "#/$defs/ConfigValue"
+              },
+              "type": "array"
+            },
+            "type": "object"
+          },
+          "description": "Runtime -> profile security option id -> explicitly permitted values.",
+          "type": "object"
+        },
+        "revision": {
+          "format": "int64",
+          "type": "integer"
+        }
+      },
+      "required": [
+        "revision",
+        "allowed"
+      ],
+      "type": "object"
+    },
     "ForgetKind": {
       "description": "What a forget names on the host (plan 9d decision 4, B2): a kind of\nentry, never a path. The masked path each stands for is `masked`.",
       "oneOf": [
@@ -1400,9 +1920,62 @@
       ],
       "type": "object"
     },
+    "HostCatalog": {
+      "properties": {
+        "adapter_revision": {
+          "description": "Opaque digest of the configured adapter command/environment and catalog.",
+          "type": "string"
+        },
+        "agent": {
+          "type": "string"
+        },
+        "config_options": {
+          "items": true,
+          "type": "array"
+        },
+        "defaults": {
+          "$ref": "#/$defs/SessionConfig"
+        },
+        "freshness": {
+          "$ref": "#/$defs/CatalogFreshness"
+        },
+        "security": {
+          "$ref": "#/$defs/SecurityClassification"
+        }
+      },
+      "required": [
+        "agent",
+        "adapter_revision",
+        "config_options",
+        "defaults",
+        "security",
+        "freshness"
+      ],
+      "type": "object"
+    },
     "HostFrame": {
       "description": "Host -> collector.",
       "oneOf": [
+        {
+          "properties": {
+            "catalog": {
+              "$ref": "#/$defs/HostCatalog"
+            },
+            "request_id": {
+              "type": "string"
+            },
+            "type": {
+              "const": "catalog",
+              "type": "string"
+            }
+          },
+          "required": [
+            "type",
+            "request_id",
+            "catalog"
+          ],
+          "type": "object"
+        },
         {
           "properties": {
             "attached_sessions": {
@@ -1887,6 +2460,17 @@
             "null"
           ]
         },
+        "config_evidence": {
+          "anyOf": [
+            {
+              "$ref": "#/$defs/ConfigEvidence"
+            },
+            {
+              "type": "null"
+            }
+          ],
+          "description": "Fresh host-produced configuration proof, never retained collector values."
+        },
         "config_options": {
           "description": "The full config catalogue: the adapter's ACP `SessionConfigOption`\nobjects, for the UI. The collector stores it and never reads it.",
           "items": true,
@@ -2029,6 +2613,28 @@
       ],
       "type": "object"
     },
+    "ListArgs": {
+      "additionalProperties": false,
+      "description": "Page direct children only, never owner-wide sessions or grandchildren.",
+      "properties": {
+        "cursor": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "limit": {
+          "format": "uint16",
+          "maximum": 65535,
+          "minimum": 0,
+          "type": [
+            "integer",
+            "null"
+          ]
+        }
+      },
+      "type": "object"
+    },
     "LoginRequest": {
       "description": "`POST /api/auth/login` (kernel spec §3.2): the owner's password. 204 and\nthe session cookie on success. `Debug` leaves the password out.",
       "properties": {
@@ -2760,6 +3366,167 @@
       ],
       "type": "object"
     },
+    "OperationReceipt": {
+      "additionalProperties": false,
+      "description": "Durable acceptance/delivery record. Delivery never implies completion.",
+      "properties": {
+        "child_id": {
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
+          "$ref": "#/$defs/OperationState"
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
+        "state"
+      ],
+      "type": "object"
+    },
+    "OperationState": {
+      "description": "A delegation operation's state, independent of the session lifecycle.",
+      "oneOf": [
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "accepted",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "waiting_config",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "queued",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "awaiting_reconciliation",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "delivered",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "completed",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "not_delivered",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "state": {
+              "const": "cancelled",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state"
+          ],
+          "type": "object"
+        },
+        {
+          "additionalProperties": false,
+          "properties": {
+            "code": {
+              "type": "string"
+            },
+            "state": {
+              "const": "failed",
+              "type": "string"
+            }
+          },
+          "required": [
+            "state",
+            "code"
+          ],
+          "type": "object"
+        }
+      ]
+    },
     "PairingCodeResponse": {
       "description": "201 to `POST /api/hosts/pairing-codes` (kernel spec §4.1): a single-use\ncode for `hennery host join`, shown once.",
       "properties": {
@@ -3446,6 +4213,25 @@
       ],
       "type": "object"
     },
+    "PromptFence": {
+      "properties": {
+        "attach_generation": {
+          "format": "uint64",
+          "minimum": 0,
+          "type": "integer"
+        },
+        "config_revision": {
+          "format": "uint64",
+          "minimum": 0,
+          "type": "integer"
+        }
+      },
+      "required": [
+        "attach_generation",
+        "config_revision"
+      ],
+      "type": "object"
+    },
     "PromptRequest": {
       "additionalProperties": false,
       "properties": {
@@ -4016,6 +4802,49 @@
       ],
       "type": "string"
     },
+    "SecurityClassification": {
+      "description": "Profile-owned security axes and their baseline allowed values. `mode`\nmeans `SessionConfig.mode`; other keys name `SessionConfig.axes` entries.\nUnknown profiles require explicit operator configuration on the collector.",
+      "properties": {
+        "axes": {
+          "additionalProperties": {
+            "items": {
+              "$ref": "#/$defs/ConfigValue"
+            },
+            "type": "array"
+          },
+          "type": "object"
+        },
+        "known": {
+          "type": "boolean"
+        }
+      },
+      "required": [
+        "known",
+        "axes"
+      ],
+      "type": "object"
+    },
+    "SendArgs": {
+      "additionalProperties": false,
+      "description": "Queue an ordinary follow-up for an owned direct child.",
+      "properties": {
+        "child_id": {
+          "type": "string"
+        },
+        "operation_key": {
+          "type": "string"
+        },
+        "text": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "operation_key",
+        "child_id",
+        "text"
+      ],
+      "type": "object"
+    },
     "SessionBody": {
       "description": "The body of a sequenced, outboxed session frame.",
       "oneOf": [
@@ -4422,6 +5251,30 @@
       ],
       "type": "object"
     },
+    "SessionConfig": {
+      "description": "Model, mode and the other config axes of a session (ACP core §3.3,\n§4.3): what a start asks for, and what a resume re-applies. `model` and\n`mode` are the values of the adapter's model and mode options; `axes`\nholds every other option, by config id. Flattened into the frames and\nthe start request, so the wire stays `model?, mode?, axes{}`.",
+      "properties": {
+        "axes": {
+          "additionalProperties": {
+            "$ref": "#/$defs/ConfigValue"
+          },
+          "type": "object"
+        },
+        "mode": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "model": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "type": "object"
+    },
     "SessionDetail": {
       "description": "`GET /api/sessions/{id}` (ACP core §9): the list item, as stored, the\nopen turn and the pending requests still open.",
       "properties": {
@@ -4702,6 +5555,27 @@
       ],
       "type": "object"
     },
+    "SetExecutionPolicy": {
+      "additionalProperties": false,
+      "properties": {
+        "allowed": {
+          "additionalProperties": {
+            "additionalProperties": {
+              "items": {
+                "$ref": "#/$defs/ConfigValue"
+              },
+              "type": "array"
+            },
+            "type": "object"
+          },
+          "type": "object"
+        }
+      },
+      "required": [
+        "allowed"
+      ],
+      "type": "object"
+    },
     "SetHatLogoRequest": {
       "additionalProperties": false,
       "description": "`PUT /api/hats/{id}/logo` (kernel spec §5.1, §8; plan 4d-B2): a PNG, at\nmost 64 KiB, as standard base64 with its padding and nothing around it\n(no `data:` prefix, no whitespace). The body is at most 96 KiB. Step-up.\nThe collector decodes it and writes it afresh, so what is served is\nnever the upload's bytes. 200 with the `HatItem`.\n\nIts own codes: 400 `invalid_logo` (not base64; not a readable PNG; over\n1024 pixels either way); 413 `logo_too_large` (over 64 KiB, or over 256\nKiB once re-encoded); 413 `body_too_large`; 415 `unsupported_logo` (not\na PNG: the web UI turns an SVG, a WebP or a JPEG into one first); 404\n`not_found`; 409 `hat_purging` (a hat frozen for its purge takes no new\nlogo). `DELETE /api/hats/{id}/logo` (step-up) removes it: 200 with the\n`HatItem`, a frozen hat's too, or 404.",
@@ -4856,6 +5730,43 @@
       ],
       "type": "object"
     },
+    "SpawnArgs": {
+      "additionalProperties": false,
+      "description": "Start one independently configured direct child, without provider fallback.",
+      "properties": {
+        "agent": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "brief": {
+          "type": "string"
+        },
+        "config": {
+          "$ref": "#/$defs/ConfigFields"
+        },
+        "cwd": {
+          "type": "string"
+        },
+        "name": {
+          "type": [
+            "string",
+            "null"
+          ]
+        },
+        "operation_key": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "operation_key",
+        "cwd",
+        "brief",
+        "config"
+      ],
+      "type": "object"
+    },
     "StartSessionRequest": {
       "description": "`POST /api/sessions` (ACP core §9): `{host_id, agent, cwd, model?, mode?, axes?}`.",
       "properties": {
@@ -4905,6 +5816,25 @@
       ],
       "type": "object"
     },
+    "StatusArgs": {
+      "additionalProperties": false,
+      "description": "Read a direct child's state, optionally selecting one operation receipt.",
+      "properties": {
+        "child_id": {
+          "type": "string"
+        },
+        "operation_key": {
+          "type": [
+            "string",
+            "null"
+          ]
+        }
+      },
+      "required": [
+        "child_id"
+      ],
+      "type": "object"
+    },
     "StepUpRequest": {
       "description": "`POST /api/auth/step-up/password` (kernel spec §3.4): the owner's\npassword again, within a session. 204 on success. `Debug` leaves the\npassword out.",
       "properties": {
diff --git a/web/src/generated/protocol.ts b/web/src/generated/protocol.ts
index ca1ee9090bc00b69eccdb61e82ab740c6d675ed0..c4cb7033d76443b4dec3d82701958e40f20aa258 100644
--- a/web/src/generated/protocol.ts
+++ b/web/src/generated/protocol.ts
@@ -53,6 +53,96 @@ export type SetSessionTools = { delegation_enabled: boolean, };

 export type SessionFamily = { child_id: string, parent_id: string, root_id: string, hat_id: string, created_event_id: number, detached: boolean, reason: string | null, };

+export type ExecutionPolicy = { revision: number,
+/**
+ * Runtime -> profile security option id -> explicitly permitted values.
+ */
+allowed: { [key in string]: { [key in string]: Array<ConfigValue> } }, };
+
+export type SetExecutionPolicy = { allowed: { [key in string]: { [key in string]: Array<ConfigValue> } }, };
+
+export type DelegationLimits = { children: number, starts_per_operator_epoch: number, queued_prompts: number, queued_bytes: number, message_bytes: number, };
+
+export type CapabilitiesResult = { runtimes: Array<string>, catalogs: Array<HostCatalog>, cwd: string, policy: ExecutionPolicy, limits: DelegationLimits, };
+
+export type ChildQuestion = { pending_id: string, kind: PendingKind, operator_required: boolean, answered: boolean,
+/**
+ * The display fold's elicitation question. Permissions expose no schema.
+ */
+question: unknown, };
+
+export type ChildSummary = { child_id: string, lifecycle: string, activity: string | null, queued: number, close_requested: boolean, };
+
+export type ChildList = { children: Array<ChildSummary>, next_cursor: string | null, };
+
+export type ChildStatus = { summary: ChildSummary, requested: SessionConfig, actual: SessionConfig | null, questions: Array<ChildQuestion>, operations: Array<OperationReceipt>, last_outcome: string | null, last_report: string | null, truncated: boolean, reason: string | null, url: string, };
+
+export type PromptFence = { attach_generation: number, config_revision: number, };
+
+export type ConfigCompleteness = "complete" | "partial" | "unknown";
+
+export type ConfigEvidence = { attach_generation: number, config_revision: number, completeness: ConfigCompleteness, actual: SessionConfig, };
+
+export type CatalogFreshness = "fresh" | "stale" | "unknown";
+
+/**
+ * Profile-owned security axes and their baseline allowed values. `mode`
+ * means `SessionConfig.mode`; other keys name `SessionConfig.axes` entries.
+ * Unknown profiles require explicit operator configuration on the collector.
+ */
+export type SecurityClassification = { known: boolean, axes: { [key in string]: Array<ConfigValue> }, };
+
+export type HostCatalog = { agent: string,
+/**
+ * Opaque digest of the configured adapter command/environment and catalog.
+ */
+adapter_revision: string, config_options: unknown[], defaults: SessionConfig, security: SecurityClassification, freshness: CatalogFreshness, };
+
+/**
+ * Caller-host capabilities, scoped to the caller's hat and validated cwd.
+ */
+export type CapabilitiesArgs = { agent: string | null, cwd: string | null, };
+
+/**
+ * Start one independently configured direct child, without provider fallback.
+ */
+export type SpawnArgs = { operation_key: string, cwd: string, brief: string, name: string | null, agent: string | null, config: SessionConfig, };
+
+/**
+ * Queue an ordinary follow-up for an owned direct child.
+ */
+export type SendArgs = { operation_key: string, child_id: string, text: string, };
+
+/**
+ * Answer ordinary elicitation only. ACP permissions remain operator-only.
+ */
+export type AnswerArgs = { operation_key: string, child_id: string, pending_id: string, action: ElicitationAction, content: unknown | null, };
+
+/**
+ * Read a direct child's state, optionally selecting one operation receipt.
+ */
+export type StatusArgs = { child_id: string, operation_key: string | null, };
+
+/**
+ * Page direct children only, never owner-wide sessions or grandchildren.
+ */
+export type ListArgs = { cursor: string | null, limit: number | null, };
+
+/**
+ * Close one direct child. Does not delete sessions or clean files.
+ */
+export type CloseArgs = { operation_key: string, child_id: string, };
+
+/**
+ * Durable acceptance/delivery record. Delivery never implies completion.
+ */
+export type OperationReceipt = { operation_id: string, child_id: string | null, turn_id: string | null, pending_id: string | null, state: OperationState, };
+
+/**
+ * A delegation operation's state, independent of the session lifecycle.
+ */
+export type OperationState = { "state": "accepted" } | { "state": "waiting_config" } | { "state": "queued" } | { "state": "awaiting_reconciliation" } | { "state": "delivered" } | { "state": "completed" } | { "state": "not_delivered" } | { "state": "cancelled" } | { "state": "failed", code: string, };
+
 export type TextRole = "user" | "assistant";

 export type Excerpt = { role: TextRole, text: string, };
@@ -99,7 +189,7 @@ export type SessionConfig = { model?: string | null, mode?: string | null, axes?
  * collector never sends a frame that needs a capability to a host that
  * lacks it.
  */
-export type Capability = "projects" | "images" | "park" | "resolve_path" | "forget_session" | "mcp_servers";
+export type Capability = "projects" | "images" | "park" | "resolve_path" | "forget_session" | "mcp_servers" | "catalog_probe" | "delegation_config";

 /**
  * `hello.capabilities`. Deserialized leniently: a capability this build
@@ -225,7 +315,11 @@ title?: string | null, };
  * "the adapter has no config" (a response that failed to parse looks
  * empty).
  */
-export type Indexed = { turn_id?: string | null,
+export type Indexed = {
+/**
+ * Fresh host-produced configuration proof, never retained collector values.
+ */
+config_evidence?: ConfigEvidence | null, turn_id?: string | null,
 /**
  * On a `session_info_update` that names a title: the title the agent
  * reported, as it sent it; empty when it cleared it (ACP `null`). The
@@ -367,7 +461,7 @@ export type ForgetOutcome = "complete" | "partial";
 /**
  * Host -> collector.
  */
-export type HostFrame = { "type": "hello", protocol_version: string, host_version: string, host_id: string,
+export type HostFrame = { "type": "catalog", request_id: string, catalog: HostCatalog, } | { "type": "hello", protocol_version: string, host_version: string, host_id: string,
 /**
  * Proof of possession of the host's key (ACP core §3.5): its
  * Ed25519 signature, hex, over `hello_proof_message(nonce, host_id,
@@ -416,7 +510,19 @@ truncated: boolean, };
 /**
  * Collector -> host.
  */
-export type CollectorFrame = { "type": "hello_ack", protocol_version: string, collector_version: string,
+export type CollectorFrame = { "type": "probe_catalog", request_id: string, agent: string, cwd: string, } | { "type": "delegated_attach", request_id: string, session_id: string, committed_seq: number, agent: string, cwd: string, hat_id: string, attach_generation: number, agent_session_id: string | null, model?: string | null, mode?: string | null, axes?: { [key in string]: ConfigValue },
+/**
+ * Passed in `session/new` / `session/load`. Only to a host that
+ * announced `mcp_servers`.
+ */
+mcp_servers?: Array<McpServer>,
+/**
+ * The collector knowingly delivers to an agent the host cannot isolate
+ * (the mixed-host fallback's default hat, or a single-hat host,
+ * umbrella §8.5). Absent, the host refuses servers for such an agent
+ * (`mcp_isolation_unavailable`): isolation is never lost by omission.
+ */
+isolation_waived?: boolean, } | { "type": "delegated_prompt", request_id: string, session_id: string, turn_id: string, content: unknown[], expected: PromptFence, } | { "type": "hello_ack", protocol_version: string, collector_version: string,
 /**
  * Highest committed seq per session listed in `hello`; the host
  * fast-forwards its counters if they are lower (lost outbox).
```

Run:

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --test delegation_d2 --test tool_args --test owner --test store --locked # expected exit 0
nix develop -c cargo test -p hennery-testkit --test owner_filter --locked # expected exit 0
nix develop -c cargo test -p hennery-proto --test codegen --locked # expected exit 0
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check # expected exit 0
```

### Task 4, step 1: test(delegation): specify HTTP tool execution and cold catalog holds

- [x] Specify the behavior; each listed command must produce the observed RED exit.

<!-- replay {"subject":"test(delegation): specify HTTP tool execution and cold catalog holds","tree":"9f53493fdb7ea121c747e7b9f3a7014f3c7596bc","checks":[["cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --locked",101]]} -->
```diff
diff --git a/crates/hennery-testkit/tests/delegation_mcp.rs b/crates/hennery-testkit/tests/delegation_mcp.rs
index 918425eedaa42c79ba2ca80941922f71bc805c6b..be62c7e08bdb8a07ac496d9b7ce0bfa67ef08d9f 100644
--- a/crates/hennery-testkit/tests/delegation_mcp.rs
+++ b/crates/hennery-testkit/tests/delegation_mcp.rs
@@ -167,7 +167,7 @@ impl Harness {
     }
 }
 #[tokio::test]
-async fn starting_discovery_stateless_protocol_and_no_enabled_tools() {
+async fn starting_discovery_stateless_protocol_and_seven_control_tools() {
     let h = Harness::new().await;
     for version in ["2025-03-26", "2025-06-18", "2025-11-25"] {
         let response = h.rpc(json!({"jsonrpc":"2.0", "id":1, "method":"initialize", "params":{"protocolVersion":version,"capabilities":{},"clientInfo":{"name":"fixture", "version":"1"}}})).await;
@@ -179,9 +179,26 @@ async fn starting_discovery_stateless_protocol_and_no_enabled_tools() {
         .await;
     assert_eq!(initialized.status(), StatusCode::ACCEPTED);
     assert!(initialized.bytes().await.unwrap().is_empty());
+    let discovery = h.rpc(json!({"jsonrpc":"2.0","id":"list","method":"tools/list"})).await;
+    let names: std::collections::BTreeSet<_> = discovery["result"]["tools"]
+        .as_array()
+        .unwrap()
+        .iter()
+        .map(|tool| tool["name"].as_str().unwrap())
+        .collect();
     assert_eq!(
-        h.rpc(json!({"jsonrpc":"2.0","id":"list","method":"tools/list"})).await["result"],
-        json!({"tools":[]})
+        names,
+        [
+            "session_capabilities",
+            "session_spawn",
+            "session_send",
+            "session_status",
+            "session_list",
+            "session_close",
+            "session_answer"
+        ]
+        .into_iter()
+        .collect()
     );
     assert_eq!(
         h.rpc(json!({"jsonrpc":"2.0","id":2,"method":"ping"})).await["result"],
@@ -203,7 +220,7 @@ async fn starting_discovery_stateless_protocol_and_no_enabled_tools() {
     let call = h
         .rpc(json!({"jsonrpc":"2.0","id":3,"method":"tools/call", "params":{"name":"session_spawn","arguments":{}}}))
         .await;
-    assert_eq!(call["result"]["structuredContent"]["code"], "tool_unavailable");
+    assert_eq!(call["result"]["structuredContent"]["code"], "invalid_arguments");
     assert_eq!(
         serde_json::from_str::<Value>(call["result"]["content"][0]["text"].as_str().unwrap()).unwrap(),
         call["result"]["structuredContent"]
@@ -913,3 +930,51 @@ async fn standard_client_icons_are_typed_data_and_positional_icons_are_refused()
         StatusCode::BAD_REQUEST
     );
 }
+
+#[tokio::test]
+async fn tool_deadline_bounds_an_unanswered_host_probe_and_reclaims_request_permit() {
+    use hennery_proto::frames::CollectorFrame;
+    use std::time::Duration;
+    let h = Harness::with_limits(
+        hennery_gateway::proxy::Limits::new(1, 32, Duration::from_secs(1), Duration::from_millis(50))
+            .with_answer_timeout(Duration::from_millis(50)),
+    )
+    .await;
+    let capabilities = Capabilities(vec![Capability::McpServers, Capability::ResolvePath]);
+    h.state
+        .hosts
+        .record_hello("host", "fixture", &capabilities, unix_now())
+        .unwrap();
+    let previous = h.state.hub.routable_conn("host").unwrap();
+    h.state.hub.unregister("host", previous);
+    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
+    let registered = h
+        .state
+        .hub
+        .register(
+            "host",
+            tx,
+            capabilities,
+            AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
+        )
+        .unwrap();
+    h.state.hub.mark_ready("host", registered.conn_id);
+    h.state
+        .store
+        .ingest(
+            "session",
+            1,
+            &hennery_proto::frames::SessionBody::session_started("start", "adapter"),
+        )
+        .unwrap();
+    let (probe,call)=tokio::join!(
+        tokio::time::timeout(Duration::from_secs(2),rx.recv()),
+        tokio::time::timeout(Duration::from_secs(2),h.rpc(json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_capabilities","arguments":{}}})))
+    );
+    assert!(matches!(probe.unwrap().unwrap(), CollectorFrame::ResolvePath { .. }));
+    let call = call.expect("tool deadline must bound a stalled host probe");
+    assert_eq!(call["result"]["isError"], true);
+    assert_eq!(call["result"]["structuredContent"]["code"], "request_timeout");
+    let ping = h.rpc(json!({"jsonrpc":"2.0","id":2,"method":"ping"})).await;
+    assert_eq!(ping["result"], json!({}));
+}
diff --git a/crates/hennery-testkit/tests/delegation_tools.rs b/crates/hennery-testkit/tests/delegation_tools.rs
new file mode 100644
index 0000000000000000000000000000000000000000..bbca877378b8993da2896a3873095d270df21998
--- /dev/null
+++ b/crates/hennery-testkit/tests/delegation_tools.rs
@@ -0,0 +1,1104 @@
+//! Seven D2 MCP handlers over real HTTP/WebSocket sockets and fake ACP
+//! processes. No model provider calls; every adapter home and data dir is scratch.
+use hennery_gateway::{api::GatewayState, key::KeySource, session::GatewayMcp};
+use hennery_host::{AgentCommand, HostConfig, identity::HostKey, profile::Profile};
+use hennery_kernel::{
+    egress::{Egress, Timeouts},
+    hosts::{Enrollment, Hosts},
+    operator::Operator,
+};
+use hennery_sessions::{AppState, store::Store};
+use hennery_testkit::{FakeAsk, FakeScript, SCRIPT_ENV, sample_config_options};
+use serde_json::{Value, json};
+use std::{
+    path::{Path, PathBuf},
+    sync::{Arc, Mutex},
+    time::Duration,
+};
+
+const HOST: &str = "delegation-host";
+const BOUND: Duration = Duration::from_secs(30);
+struct Harness {
+    _dir: tempfile::TempDir,
+    state: AppState,
+    client: reqwest::Client,
+    raw: reqwest::Client,
+    url: String,
+    parent: String,
+    token: String,
+    cwd: PathBuf,
+    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
+    host_task: tokio::task::JoinHandle<anyhow::Result<()>>,
+    server_task: tokio::task::JoinHandle<()>,
+    discovery: Arc<Mutex<Vec<Value>>>,
+}
+impl Drop for Harness {
+    fn drop(&mut self) {
+        if let Some(shutdown) = self.shutdown.take() {
+            let _ = shutdown.send(());
+        }
+        self.state.shutdown.cancel();
+        self.server_task.abort();
+    }
+}
+fn script() -> FakeScript {
+    FakeScript {
+        config_options: sample_config_options(),
+        chunks: vec!["child-result".into()],
+        ..Default::default()
+    }
+}
+fn fake(root: &Path, runtime: &str, mut script: FakeScript) -> AgentCommand {
+    let home = root.join(format!("{runtime}-home"));
+    std::fs::create_dir_all(&home).unwrap();
+    script.session_log = Some(root.join(format!("{runtime}-sessions.jsonl")).display().to_string());
+    AgentCommand {
+        program: env!("CARGO_BIN_EXE_hennery-fake-acp").into(),
+        args: vec![],
+        env: vec![
+            (SCRIPT_ENV.into(), serde_json::to_string(&script).unwrap()),
+            ("HOME".into(), home.display().to_string()),
+            ("XDG_CONFIG_HOME".into(), home.join("config").display().to_string()),
+            ("XDG_DATA_HOME".into(), home.join("data").display().to_string()),
+            ("XDG_CACHE_HOME".into(), home.join("cache").display().to_string()),
+            ("SSL_CERT_FILE".into(), String::new()),
+            ("SSL_CERT_DIR".into(), String::new()),
+            ("HENNERY_DATA_DIR".into(), String::new()),
+            ("HENNERY_HOST_DATA_DIR".into(), String::new()),
+        ],
+    }
+}
+async fn eventually<T>(what: &str, mut probe: impl AsyncFnMut() -> Option<T>) -> T {
+    tokio::time::timeout(BOUND, async {
+        loop {
+            if let Some(result) = probe().await {
+                return result;
+            }
+            tokio::time::sleep(Duration::from_millis(20)).await;
+        }
+    })
+    .await
+    .unwrap_or_else(|_| panic!("timed out: {what}"))
+}
+impl Harness {
+    async fn new(worker: FakeScript) -> Self {
+        Self::with_worker(worker, None, true).await
+    }
+    async fn with_worker(worker: FakeScript, mut pinned: Option<(AgentCommand, Profile)>, dispatch: bool) -> Self {
+        hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery-fake-acp"));
+        let dir = tempfile::tempdir().unwrap();
+        let cwd = dir.path().canonicalize().unwrap();
+        let db = cwd.join("hennery.db");
+        let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
+            .await
+            .unwrap();
+        let addr = listener.local_addr().unwrap();
+        let key = HostKey::from_seed([9; 32]);
+        let hosts = Hosts::open(&db).unwrap();
+        hosts
+            .register(
+                HOST,
+                &Enrollment {
+                    public_key: key.public_key_hex(),
+                    name: "fixture".into(),
+                    host_version: "fixture".into(),
+                    platform: "fixture".into(),
+                },
+                0,
+            )
+            .unwrap();
+        let hat = hosts.host(HOST).unwrap().unwrap().default_hat_id;
+        let state = AppState::new(Store::open(&db).unwrap(), hosts, Operator::open(&db).unwrap());
+        let url = format!("http://{addr}");
+        let now = hennery_kernel::secret::unix_now();
+        let setup = state.operator.issue_setup_token(now).unwrap().unwrap();
+        state
+            .operator
+            .set_up(&setup, hennery_testkit::OWNER_PASSWORD, &url, now)
+            .unwrap();
+        let phc = state
+            .operator
+            .verify_password(hennery_testkit::OWNER_PASSWORD)
+            .unwrap()
+            .unwrap();
+        let session = state.operator.open_session("integration", &phc, now).unwrap().unwrap();
+        let mut headers = reqwest::header::HeaderMap::new();
+        headers.insert(reqwest::header::ORIGIN, url.parse().unwrap());
+        headers.insert(
+            reqwest::header::COOKIE,
+            format!("hennery_session={session}").parse().unwrap(),
+        );
+        let client = reqwest::Client::builder()
+            .no_proxy()
+            .default_headers(headers)
+            .build()
+            .unwrap();
+        let keys = KeySource::from_vars(&cwd, Some("09".repeat(32).into()), None).unwrap();
+        let gateway: GatewayState = hennery_gateway::open(
+            &db,
+            &keys,
+            state.operator.clone(),
+            Egress::new(Timeouts::DEFAULT).unwrap(),
+            Arc::new(hennery_gateway::notify::Silent),
+        )
+        .unwrap();
+        state
+            .store
+            .set_session_mcp(Arc::new(GatewayMcp::for_collector(&gateway)));
+        gateway.runtime.store.set_session_tools(&hat, true).unwrap();
+        let discovery: Arc<Mutex<Vec<Value>>> = Arc::default();
+        let observed = discovery.clone();
+        let trace_auth = gateway.runtime.store.clone();
+        let builtin = hennery_sessions::builtin::router(state.clone(), gateway).layer(axum::middleware::from_fn(
+            move |request: axum::extract::Request, next: axum::middleware::Next| {
+                let observed = observed.clone();
+                let trace_auth = trace_auth.clone();
+                async move {
+                    let caller_session = request.headers().get("authorization")
+                        .and_then(|value| value.to_str().ok())
+                        .and_then(|value| value.strip_prefix("Bearer "))
+                        .and_then(|token| trace_auth.authenticate_session(token).unwrap())
+                        .map(|identity| {
+                            let hennery_gateway::scope::PrincipalKind::Session { session_id, .. } = identity.principal.kind;
+                            session_id
+                        });
+                    let (parts, body) = request.into_parts();
+                    let bytes = axum::body::to_bytes(body, hennery_gateway::proxy::MAX_REQUEST_BODY).await.unwrap();
+                    let message: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
+                    let response = next.run(axum::extract::Request::from_parts(parts, axum::body::Body::from(bytes))).await;
+                    if matches!(message["method"].as_str(), Some("initialize" | "tools/list")) {
+                        let (parts, body) = response.into_parts();
+                        let bytes = axum::body::to_bytes(body, 1024*1024).await.unwrap();
+                        let answer: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
+                        observed.lock().unwrap().push(json!({"caller_session":caller_session,"method":message["method"],"status":parts.status.as_u16(),"tool_count":answer["result"]["tools"].as_array().map(Vec::len)}));
+                        axum::response::Response::from_parts(parts, axum::body::Body::from(bytes))
+                    } else { response }
+                }
+            }
+        ));
+        let router = hennery_sessions::router(state.clone()).merge(builtin);
+        let server_task = tokio::spawn(async move {
+            axum::serve(
+                listener,
+                router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
+            )
+            .await
+            .unwrap();
+        });
+        if dispatch {
+            hennery_sessions::delegation_worker::after_startup(&state);
+        }
+        let mut cfg = HostConfig::new(format!("ws://{addr}/api/hosts/ws"), HOST, key, cwd.join("host-data"));
+        cfg.workspace_roots = vec![cwd.clone()];
+        cfg.git = None;
+        for (runtime, s) in [("claude", script()), ("worker", worker)] {
+            let (command, profile) = if runtime == "worker" {
+                pinned
+                    .take()
+                    .unwrap_or_else(|| (fake(&cwd, runtime, s), Profile::Claude))
+            } else {
+                (fake(&cwd, runtime, s), Profile::Claude)
+            };
+            cfg.agents.insert(runtime.into(), command);
+            cfg.profiles.insert(runtime.into(), profile);
+        }
+        let (shutdown, signal) = tokio::sync::oneshot::channel();
+        let host_task = tokio::spawn(hennery_host::run_until(cfg, async {
+            let _ = signal.await;
+        }));
+        eventually("ready host", async || state.hub.is_ready(HOST).then_some(())).await;
+        let response = client
+            .post(format!("{url}/api/sessions"))
+            .json(&json!({"host_id":HOST,"agent":"claude","cwd":cwd}))
+            .send()
+            .await
+            .unwrap();
+        let status = response.status();
+        let body: Value = response.json().await.unwrap();
+        assert_eq!(status, reqwest::StatusCode::ACCEPTED, "{body}");
+        let parent = body["session_id"].as_str().unwrap().to_owned();
+        eventually("active parent", async || {
+            state
+                .store
+                .find_session(&parent)
+                .unwrap()
+                .filter(|s| s.lifecycle == "active")
+                .map(|_| ())
+        })
+        .await;
+        let log = std::fs::read_to_string(cwd.join("claude-sessions.jsonl")).unwrap();
+        let servers: Value =
+            serde_json::from_str::<Value>(log.lines().last().unwrap()).unwrap()["params"]["mcpServers"].clone();
+        let token = servers[0]["headers"][0]["value"]
+            .as_str()
+            .unwrap()
+            .strip_prefix("Bearer ")
+            .unwrap()
+            .to_owned();
+        Self {
+            _dir: dir,
+            state,
+            client,
+            raw: reqwest::Client::builder().no_proxy().build().unwrap(),
+            url,
+            parent,
+            token,
+            cwd,
+            shutdown: Some(shutdown),
+            host_task,
+            server_task,
+            discovery,
+        }
+    }
+    async fn rpc(&self, method: &str, params: Value) -> Value {
+        let response = self
+            .raw
+            .post(format!("{}/mcp/builtin/hennery", self.url))
+            .bearer_auth(&self.token)
+            .header("accept", "application/json")
+            .json(&json!({"jsonrpc":"2.0","id":1,"method":method,"params":params}))
+            .send()
+            .await
+            .unwrap();
+        assert_eq!(response.status(), reqwest::StatusCode::OK);
+        response.json::<Value>().await.unwrap()["result"].clone()
+    }
+    async fn call(&self, name: &str, args: Value) -> Value {
+        self.rpc("tools/call", json!({"name":name,"arguments":args})).await
+    }
+    async fn ok(&self, name: &str, args: Value) -> Value {
+        let r = self.call(name, args).await;
+        assert_eq!(r["isError"], false, "{name}: {r}");
+        r["structuredContent"].clone()
+    }
+    async fn spawn(&self, key: &str, config: Value) -> Value {
+        self.ok(
+            "session_spawn",
+            json!({"operation_key":key,"cwd":self.cwd,"agent":"worker","brief":"child brief","config":config}),
+        )
+        .await
+    }
+    async fn status(&self, child: &str) -> Value {
+        self.ok("session_status", json!({"child_id":child})).await
+    }
+    async fn done(&self, child: &str, key: &str) {
+        eventually("completed operation", async || {
+            let s = self
+                .ok("session_status", json!({"child_id":child,"operation_key":key}))
+                .await;
+            s["operations"]
+                .as_array()
+                .unwrap()
+                .iter()
+                .any(|r| r["state"]["state"] == "completed" && r["child_id"] == child)
+                .then_some(())
+        })
+        .await;
+    }
+    async fn post(&self, path: &str, body: Value) -> (reqwest::StatusCode, Value) {
+        let r = self
+            .client
+            .post(format!("{}{path}", self.url))
+            .json(&body)
+            .send()
+            .await
+            .unwrap();
+        let status = r.status();
+        (status, r.json().await.unwrap_or(Value::Null))
+    }
+    async fn finish(mut self) {
+        if let Some(shutdown) = self.shutdown.take() {
+            shutdown.send(()).unwrap();
+        }
+        tokio::time::timeout(BOUND, &mut self.host_task)
+            .await
+            .unwrap()
+            .unwrap()
+            .unwrap();
+        self.state.shutdown.cancel();
+    }
+}
+
+#[tokio::test]
+async fn execution_policy_routes_require_operator_origin_and_step_up_and_preserve_strict_shape() {
+    use reqwest::StatusCode;
+    let h = Harness::with_worker(script(), None, false).await;
+    let hat = h.state.store.find_session(&h.parent).unwrap().unwrap().hat_id;
+    let endpoint = format!("{}/api/hats/{hat}/delegation-policy", h.url);
+    let allowed = json!({"worker":{"mode":["default","plan"]}});
+    let request = json!({"allowed":allowed});
+    // Both reads and writes are covered by this route's own operator wrapper.
+    assert_eq!(
+        h.raw.get(&endpoint).send().await.unwrap().status(),
+        StatusCode::UNAUTHORIZED
+    );
+    assert_eq!(
+        h.raw
+            .patch(&endpoint)
+            .header("origin", &h.url)
+            .json(&request)
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::UNAUTHORIZED
+    );
+    assert_eq!(
+        h.raw
+            .get(format!("{}/api/hosts/{HOST}/runtime-catalog", h.url))
+            .query(&[("agent", "worker"), ("cwd", h.cwd.to_str().unwrap())])
+            .send()
+            .await
+            .unwrap()
+            .status(),
+        StatusCode::UNAUTHORIZED
+    );
+    let phc = h
+        .state
+        .operator
+        .verify_password(hennery_testkit::OWNER_PASSWORD)
+        .unwrap()
+        .unwrap();
+    let now = hennery_kernel::secret::unix_now();
+    let stale = h
+        .state
+        .operator
+        .open_session("policy-stale", &phc, now - 600)
+        .unwrap()
+        .unwrap();
+    let fresh = h
+        .state
+        .operator
+        .open_session("policy-fresh", &phc, now)
+        .unwrap()
+        .unwrap();
+    for (session, origin, code) in [
+        (&stale, Some(h.url.as_str()), "step_up_required"),
+        (&fresh, None, "origin_mismatch"),
+        (&fresh, Some("https://foreign.example"), "origin_mismatch"),
+    ] {
+        let mut r = h
+            .raw
+            .patch(&endpoint)
+            .header("cookie", format!("hennery_session={session}"))
+            .json(&request);
+        if let Some(origin) = origin {
+            r = r.header("origin", origin);
+        }
+        let response = r.send().await.unwrap();
+        assert_eq!(response.status(), StatusCode::FORBIDDEN, "{code}");
+        assert_eq!(response.json::<Value>().await.unwrap()["code"], code);
+    }
+    let bad_origin = h
+        .raw
+        .get(&endpoint)
+        .header("cookie", format!("hennery_session={fresh}"))
+        .header("origin", "https://foreign.example")
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(bad_origin.status(), StatusCode::FORBIDDEN);
+    // Same-origin GET needs neither a recent step-up nor an Origin header.
+    let initial = h
+        .raw
+        .get(&endpoint)
+        .header("cookie", format!("hennery_session={stale}"))
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(initial.status(), StatusCode::OK);
+    assert_eq!(
+        initial.json::<Value>().await.unwrap(),
+        json!({"revision":0,"allowed":{}})
+    );
+    for body in [
+        r#"{"allowed":{},"owner_id":"foreign"}"#,
+        r#"{"allowed":{},"revision":999}"#,
+        r#"{"allowed":[]}"#,
+        "[]",
+        "null",
+        "{broken",
+    ] {
+        let response = h
+            .client
+            .patch(&endpoint)
+            .header("content-type", "application/json")
+            .body(body)
+            .send()
+            .await
+            .unwrap();
+        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{body}");
+    }
+    for revision in 1..=2 {
+        let changed = h.client.patch(&endpoint).json(&request).send().await.unwrap();
+        assert_eq!(changed.status(), StatusCode::OK);
+        let expected = json!({"revision":revision,"allowed":allowed});
+        assert_eq!(changed.json::<Value>().await.unwrap(), expected);
+        let read = h.client.get(&endpoint).send().await.unwrap();
+        assert_eq!(read.status(), StatusCode::OK);
+        assert_eq!(read.json::<Value>().await.unwrap(), expected);
+    }
+    let absent = format!("{}/api/hats/absent-hat/delegation-policy", h.url);
+    assert_eq!(
+        h.client.get(&absent).send().await.unwrap().status(),
+        StatusCode::NOT_FOUND
+    );
+    assert_eq!(
+        h.client.patch(&absent).json(&request).send().await.unwrap().status(),
+        StatusCode::NOT_FOUND
+    );
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn seven_handlers_share_launcher_catalog_and_choose_runtime_and_model_without_substitute() {
+    let h = Harness::new(script()).await;
+    let tools = h.rpc("tools/list", json!({})).await;
+    assert_eq!(tools["tools"].as_array().unwrap().len(), 7);
+    let caps = h.ok("session_capabilities", json!({"agent":"worker"})).await;
+    assert_eq!(caps["runtimes"], json!(["claude", "worker"]));
+    assert_eq!(caps["catalogs"][0]["defaults"]["model"], "small");
+    let catalog = h
+        .client
+        .get(format!("{}/api/hosts/{HOST}/runtime-catalog", h.url))
+        .query(&[("agent", "worker"), ("cwd", h.cwd.to_str().unwrap())])
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(catalog.status(), reqwest::StatusCode::OK);
+    assert_eq!(catalog.json::<Value>().await.unwrap(), caps["catalogs"][0]);
+    let receipt = h.spawn("spawn-large", json!({"model":"large"})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    h.done(child, "spawn-large").await;
+    let s = h.status(child).await;
+    assert_eq!(s["requested"]["model"], "large");
+    assert_eq!(s["actual"]["model"], "large");
+    assert_eq!(h.state.store.find_session(child).unwrap().unwrap().agent, "worker");
+    let again = h.spawn("spawn-large", json!({"model":"large"})).await;
+    assert_eq!(again["child_id"], child);
+    let conflict = h
+        .call("session_close", json!({"operation_key":"spawn-large","child_id":child}))
+        .await;
+    assert_eq!(conflict["structuredContent"]["code"], "operation_conflict");
+    for (agent, model, code) in [
+        ("absent", "small", "runtime_unavailable"),
+        ("worker", "absent", "configuration_unavailable"),
+    ] {
+        let r=h.call("session_spawn",json!({"operation_key":format!("invalid-{agent}-{model}"),"cwd":h.cwd,"agent":agent,"brief":"never substitute","config":{"model":model}})).await;
+        assert_eq!(r["structuredContent"]["code"], code);
+    }
+    let list = h.ok("session_list", json!({})).await;
+    assert_eq!(list["children"].as_array().unwrap().len(), 1);
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn initial_brief_waits_for_new_child_configuration_readback() {
+    let mut s = script();
+    s.sticky_options = vec!["model".into()];
+    let h = Harness::new(s).await;
+    let receipt = h.spawn("held", json!({"model":"large"})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    eventually("waiting config after readback", async || {
+        let s = h.status(child).await;
+        (s["operations"][0]["state"]["state"] == "waiting_config" && s["actual"]["model"] == "small").then_some(())
+    })
+    .await;
+    // Exercise the real release path after evidence exists. Sampling the
+    // initial waiting state alone would race the periodic worker's next pass.
+    hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+    let state = h.status(child).await;
+    assert_eq!(state["requested"]["model"], "large");
+    assert_eq!(state["actual"]["model"], "small");
+    assert!(state["last_outcome"].is_null());
+    assert!(state["last_report"].is_null());
+    assert!(
+        h.state
+            .store
+            .find_session(child)
+            .unwrap()
+            .unwrap()
+            .open_turn_id
+            .is_none()
+    );
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn direct_children_only_and_close_does_not_cascade_or_reopen() {
+    let h = Harness::new(script()).await;
+    let a = h.spawn("a", json!({})).await;
+    let a = a["child_id"].as_str().unwrap();
+    h.done(a, "a").await;
+    let b = h.spawn("b", json!({})).await;
+    let b = b["child_id"].as_str().unwrap();
+    h.done(b, "b").await;
+    let (http, independent) = h
+        .post("/api/sessions", json!({"host_id":HOST,"agent":"claude","cwd":h.cwd}))
+        .await;
+    assert_eq!(http, reqwest::StatusCode::ACCEPTED);
+    let independent = independent["session_id"].as_str().unwrap();
+    eventually("independent parent active", async || {
+        h.state
+            .store
+            .find_session(independent)
+            .unwrap()
+            .filter(|s| s.lifecycle == "active")
+            .map(|_| ())
+    })
+    .await;
+    let independent_log = std::fs::read_to_string(h.cwd.join("claude-sessions.jsonl")).unwrap();
+    let independent_session: Value = serde_json::from_str(independent_log.lines().last().unwrap()).unwrap();
+    let independent_token = independent_session["params"]["mcpServers"][0]["headers"][0]["value"]
+        .as_str()
+        .unwrap()
+        .strip_prefix("Bearer ")
+        .unwrap();
+    let separate=h.raw.post(format!("{}/mcp/builtin/hennery",h.url)).bearer_auth(independent_token).header("accept","application/json")
+        .json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_spawn","arguments":{"operation_key":"other-family","cwd":h.cwd,"agent":"worker","brief":"independent family","config":{}}}})).send().await.unwrap().json::<Value>().await.unwrap();
+    assert_eq!(separate["result"]["isError"], false, "{separate}");
+    let separate = separate["result"]["structuredContent"]["child_id"].as_str().unwrap();
+    let hidden_child = h.call("session_status", json!({"child_id":separate})).await;
+    assert_eq!(hidden_child["structuredContent"]["code"], "not_found");
+    let hidden = h.call("session_status", json!({"child_id":independent})).await;
+    assert_eq!(hidden["structuredContent"]["code"], "not_found");
+    let log = std::fs::read_to_string(h.cwd.join("worker-sessions.jsonl")).unwrap();
+    let child_token = log
+        .lines()
+        .rev()
+        .find_map(|line| {
+            let line: Value = serde_json::from_str(line).unwrap();
+            line["params"]["mcpServers"][0]["headers"][0]["value"]
+                .as_str()
+                .and_then(|v| v.strip_prefix("Bearer "))
+                .map(str::to_owned)
+        })
+        .unwrap();
+    let nested=h.raw.post(format!("{}/mcp/builtin/hennery",h.url)).bearer_auth(child_token).header("accept","application/json")
+        .json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_spawn","arguments":{"operation_key":"grandchild","cwd":h.cwd,"brief":"never nest","config":{}}}})).send().await.unwrap().json::<Value>().await.unwrap();
+    assert_eq!(nested["result"]["structuredContent"]["code"], "generation_limit");
+    let unrelated = h.call("session_status", json!({"child_id":h.parent})).await;
+    assert_eq!(unrelated["structuredContent"]["code"], "not_found");
+    let close = h
+        .ok("session_close", json!({"operation_key":"close-a","child_id":a}))
+        .await;
+    assert_eq!(close["child_id"], a);
+    eventually("closed direct child", async || {
+        h.state
+            .store
+            .find_session(a)
+            .unwrap()
+            .filter(|s| s.lifecycle == "closed")
+            .map(|_| ())
+    })
+    .await;
+    assert_eq!(h.state.store.find_session(b).unwrap().unwrap().lifecycle, "active");
+    assert_eq!(
+        h.state.store.find_session(&h.parent).unwrap().unwrap().lifecycle,
+        "active"
+    );
+    let send = h
+        .call(
+            "session_send",
+            json!({"operation_key":"no-reopen","child_id":a,"text":"do not reopen"}),
+        )
+        .await;
+    assert_eq!(send["isError"], true);
+    let full = h.ok("session_list", json!({"limit":100})).await;
+    let ids: std::collections::BTreeSet<_> = full["children"]
+        .as_array()
+        .unwrap()
+        .iter()
+        .map(|c| c["child_id"].as_str().unwrap())
+        .collect();
+    assert_eq!(ids, [a, b].into_iter().collect());
+    let page = h.ok("session_list", json!({"limit":1})).await;
+    assert_eq!(page["children"].as_array().unwrap().len(), 1);
+    let cursor = page["next_cursor"].as_str().unwrap();
+    let foreign_cursor=h.raw.post(format!("{}/mcp/builtin/hennery",h.url)).bearer_auth(independent_token).header("accept","application/json")
+        .json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_list","arguments":{"cursor":cursor,"limit":1}}})).send().await.unwrap().json::<Value>().await.unwrap();
+    assert_eq!(foreign_cursor["result"]["structuredContent"]["code"], "invalid_cursor");
+    let rest = h.ok("session_list", json!({"cursor":cursor,"limit":1})).await;
+    assert_eq!(rest["children"].as_array().unwrap().len(), 1);
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn busy_send_is_durable_and_parked_followup_resumes_with_fresh_readback() {
+    let mut s = script();
+    s.asks = vec![FakeAsk::Elicitation];
+    let h = Harness::new(s).await;
+    let receipt = h.spawn("busy-start", json!({})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    let pending = eventually("child elicitation", async || {
+        h.state
+            .store
+            .open_pending(child)
+            .unwrap()
+            .into_iter()
+            .find(|p| !p.answered)
+    })
+    .await;
+    let first_turn = h
+        .state
+        .store
+        .find_session(child)
+        .unwrap()
+        .unwrap()
+        .open_turn_id
+        .unwrap();
+    let follow = h
+        .ok(
+            "session_send",
+            json!({"operation_key":"busy-follow","child_id":child,"text":"follow up"}),
+        )
+        .await;
+    assert_eq!(follow["state"]["state"], "queued");
+    assert_eq!(
+        h.state
+            .store
+            .find_session(child)
+            .unwrap()
+            .unwrap()
+            .open_turn_id
+            .as_deref(),
+        Some(first_turn.as_str())
+    );
+    let queued = h.status(child).await;
+    assert_eq!(queued["summary"]["queued"], 1);
+    h.ok("session_answer",json!({"operation_key":"release-first","child_id":child,"pending_id":pending.pending_id,"action":"accept","content":{"name":"first"}})).await;
+    eventually("follow-up has its own turn", async || {
+        h.state
+            .store
+            .find_session(child)
+            .unwrap()
+            .unwrap()
+            .open_turn_id
+            .filter(|turn| turn != &first_turn)
+    })
+    .await;
+    h.finish().await;
+
+    let h = Harness::new(script()).await;
+    let receipt = h.spawn("park-start", json!({"model":"large"})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    h.done(child, "park-start").await;
+    let (status, body) = h.post(&format!("/api/sessions/{child}/park"), json!({})).await;
+    assert!(status.is_success(), "{body}");
+    eventually("genuinely parked child", async || {
+        h.state
+            .store
+            .find_session(child)
+            .unwrap()
+            .filter(|s| s.lifecycle == "parked" && !s.presumed_parked)
+            .map(|_| ())
+    })
+    .await;
+    h.ok(
+        "session_send",
+        json!({"operation_key":"resume-follow","child_id":child,"text":"continue after parking"}),
+    )
+    .await;
+    h.done(child, "resume-follow").await;
+    assert_eq!(h.status(child).await["actual"]["model"], "large");
+    let log = std::fs::read_to_string(h.cwd.join("worker-sessions.jsonl")).unwrap();
+    assert!(
+        log.lines()
+            .any(|line| serde_json::from_str::<Value>(line).unwrap()["method"] == "session/load")
+    );
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn permission_questions_remain_operator_only_and_elicitation_has_one_answer_winner() {
+    use hennery_proto::frames::PendingKind;
+    let mut s = script();
+    s.asks = vec![FakeAsk::Permission, FakeAsk::Elicitation];
+    s.asks_at_once = true;
+    let h = Harness::new(s).await;
+    let receipt = h.spawn("questions", json!({})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    let pending = eventually("both canonical pending requests", async || {
+        let p = h.state.store.open_pending(child).unwrap();
+        (p.len() == 2).then_some(p)
+    })
+    .await;
+    let permission = pending.iter().find(|p| p.kind == PendingKind::Permission).unwrap();
+    let elicitation = pending.iter().find(|p| p.kind == PendingKind::Elicitation).unwrap();
+    let status = h.status(child).await;
+    let permission_card = status["questions"]
+        .as_array()
+        .unwrap()
+        .iter()
+        .find(|q| q["pending_id"] == permission.pending_id)
+        .unwrap();
+    assert_eq!(permission_card["operator_required"], true);
+    assert!(permission_card["question"].is_null());
+    let refused=h.call("session_answer",json!({"operation_key":"not-permission","child_id":child,"pending_id":permission.pending_id,"action":"accept","content":{}})).await;
+    assert_eq!(refused["structuredContent"]["code"], "operator_required");
+    assert!(
+        !h.state
+            .store
+            .pending_item(&permission.pending_id)
+            .unwrap()
+            .unwrap()
+            .answered
+    );
+    let elicitation_path = format!("/api/sessions/{child}/pending/{}/answer", elicitation.pending_id);
+    let (parent,operator)=tokio::join!(
+        h.call("session_answer",json!({"operation_key":"parent-answer","child_id":child,"pending_id":elicitation.pending_id,"action":"accept","content":{"name":"parent"}})),
+        h.post(&elicitation_path,json!({"action":"accept","content":{"name":"operator"}}))
+    );
+    let parent_won = parent["isError"] == false;
+    let operator_won = operator.0 == reqwest::StatusCode::ACCEPTED;
+    assert_ne!(parent_won, operator_won, "parent:{parent}, operator:{operator:?}");
+    assert!(
+        h.state
+            .store
+            .pending_item(&elicitation.pending_id)
+            .unwrap()
+            .unwrap()
+            .answered
+    );
+    let (status, body) = h
+        .post(
+            &format!("/api/sessions/{child}/pending/{}/answer", permission.pending_id),
+            json!({"option_id":"allow"}),
+        )
+        .await;
+    assert_eq!(status, reqwest::StatusCode::ACCEPTED, "{body}");
+    eventually("both answers delivered", async || {
+        let permission = h.state.store.pending_item(&permission.pending_id).unwrap().unwrap();
+        let elicitation = h.state.store.pending_item(&elicitation.pending_id).unwrap().unwrap();
+        (permission.delivered == Some(true) && elicitation.delivered == Some(true)).then_some(())
+    })
+    .await;
+    h.done(child, "questions").await;
+    h.finish().await;
+}
+
+/// Local acceptance only: adapters are supplied explicitly, never installed by
+/// the test. The dispatch worker is disabled and drained exactly once to attach
+/// the accepted child; its saved brief is never submitted to the adapter.
+#[tokio::test]
+#[ignore = "requires explicitly supplied pinned adapter; starts no provider turn"]
+async fn pinned_adapter_discovers_seven_tools_and_attaches_one_child_without_inference() {
+    let adapters = PathBuf::from(std::env::var("HENNERY_D2_PINNED_ADAPTER_ROOT").expect("pinned adapter root"));
+    let runtime = std::env::var("HENNERY_D2_RUNTIME").unwrap_or_else(|_| "claude".into());
+    assert!(matches!(runtime.as_str(), "claude" | "codex"));
+    let node = std::env::var("HENNERY_D2_NODE").unwrap_or_else(|_| {
+        std::env::split_paths(&std::env::var_os("PATH").unwrap())
+            .map(|dir| dir.join("node"))
+            .find(|file| file.is_file())
+            .expect("node in dev shell")
+            .display()
+            .to_string()
+    });
+    hennery_testkit::first_exec(&node);
+    let home = tempfile::tempdir().unwrap();
+    for leaf in ["config", "data", "cache", "claude", "codex", "codex-sqlite"] {
+        std::fs::create_dir(home.path().join(leaf)).unwrap();
+    }
+    let entry = if runtime == "codex" {
+        "@agentclientprotocol/codex-acp/dist/index.js"
+    } else {
+        "@agentclientprotocol/claude-agent-acp/dist/index.js"
+    };
+    let command = AgentCommand {
+        program: node,
+        args: vec![adapters.join(entry).display().to_string()],
+        env: vec![
+            ("HOME".into(), home.path().display().to_string()),
+            (
+                "XDG_CONFIG_HOME".into(),
+                home.path().join("config").display().to_string(),
+            ),
+            ("XDG_DATA_HOME".into(), home.path().join("data").display().to_string()),
+            ("XDG_CACHE_HOME".into(), home.path().join("cache").display().to_string()),
+            (
+                "CLAUDE_CONFIG_DIR".into(),
+                home.path().join("claude").display().to_string(),
+            ),
+            ("CODEX_HOME".into(), home.path().join("codex").display().to_string()),
+            (
+                "CODEX_SQLITE_HOME".into(),
+                home.path().join("codex-sqlite").display().to_string(),
+            ),
+            ("SSL_CERT_FILE".into(), String::new()),
+            ("SSL_CERT_DIR".into(), String::new()),
+            ("CLAUDECODE".into(), String::new()),
+        ],
+    };
+    let mut command = command;
+    let profile = if runtime == "codex" {
+        std::fs::write(
+            home.path().join("codex/auth.json"),
+            serde_json::to_vec(&json!({"OPENAI_API_KEY":"sk-hennery-discovery-fixture"})).unwrap(),
+        )
+        .unwrap();
+        let binary = adapters.join(
+            ".pnpm/@openai+codex@0.155.1-darwin-arm64/node_modules/@openai/codex/vendor/aarch64-apple-darwin/bin/codex",
+        );
+        hennery_testkit::first_exec(binary.to_str().unwrap());
+        command.env.push(("CODEX_PATH".into(), binary.display().to_string()));
+        command
+            .env
+            .push(("OPENAI_API_KEY".into(), "sk-hennery-discovery-fixture".into()));
+        Profile::Codex
+    } else {
+        Profile::Claude
+    };
+    let h = Harness::with_worker(script(), Some((command, profile)), false).await;
+    let caps = h.ok("session_capabilities", json!({"agent":"worker"})).await;
+    assert_eq!(caps["catalogs"][0]["freshness"], "fresh");
+    assert_eq!(caps["catalogs"][0]["agent"], "worker");
+    assert_eq!(caps["catalogs"][0]["security"]["known"], true);
+    let config = if runtime == "codex" {
+        json!({"mode":"read-only"})
+    } else {
+        json!({})
+    };
+    let receipt = h.spawn("pinned-startup", config).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    // This pass sends only DelegatedAttach. With no periodic worker running,
+    // no pass can dispatch the brief after SessionStarted/config evidence.
+    hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+    eventually("pinned child active after startup only", async || {
+        h.state
+            .store
+            .find_session(child)
+            .unwrap()
+            .filter(|s| s.lifecycle == "active")
+            .map(|_| ())
+    })
+    .await;
+    let delivery = h.state.store.mcp_delivery(child).unwrap().unwrap();
+    assert_eq!(delivery.servers, 1);
+    assert_eq!(
+        delivery.mode,
+        if runtime == "codex" {
+            hennery_proto::rest::McpSessionDeliveryMode::Unisolated
+        } else {
+            hennery_proto::rest::McpSessionDeliveryMode::Isolated
+        }
+    );
+    assert_eq!(
+        h.state.hub.mcp_isolation(HOST, "worker").unwrap().1,
+        profile.mcp_isolation()
+    );
+    let trace = eventually("pinned MCP seven-tool discovery", async || {
+        let trace: Vec<_> = h
+            .discovery
+            .lock()
+            .unwrap()
+            .iter()
+            .filter(|t| t["caller_session"] == child)
+            .cloned()
+            .collect();
+        trace
+            .iter()
+            .any(|t| t["method"] == "tools/list" && t["status"] == 200 && t["tool_count"] == 7)
+            .then_some(trace)
+    })
+    .await;
+    assert!(trace.iter().any(|t| t["method"] == "initialize" && t["status"] == 200));
+    assert!(
+        h.state
+            .store
+            .find_session(child)
+            .unwrap()
+            .unwrap()
+            .open_turn_id
+            .is_none()
+    );
+    let status = h.status(child).await;
+    assert!(status["last_outcome"].is_null());
+    assert!(status["last_report"].is_null());
+    println!(
+        "{}",
+        json!({"runtime":runtime,"child_id":child,"child_attached":true,"brief_dispatched":false,"catalog_agent":caps["catalogs"][0]["agent"],"profile_security_known":caps["catalogs"][0]["security"]["known"],"catalog_freshness":caps["catalogs"][0]["freshness"],"mcp_delivery":delivery,"mcp_isolation":profile.mcp_isolation(),"mcp":trace})
+    );
+    h.finish().await;
+}
+
+// Probe adapters receive no MCP entries; attached children receive the built-in
+// entry. This wrapper removes only the disposable probe's catalog response,
+// leaving the real fake ACP process and attached-child readback unchanged.
+const COLD_CATALOG_ADAPTER: &str = r#"
+const {spawn}=require('node:child_process');
+const readline=require('node:readline');
+const child=spawn(process.argv[2],[],{env:process.env,stdio:['pipe','pipe','inherit']});
+const probes=new Set();
+readline.createInterface({input:process.stdin}).on('line',line=>{
+ const request=JSON.parse(line);
+ if(request.method==='session/new' && request.params.mcpServers.length===0)probes.add(JSON.stringify(request.id));
+ child.stdin.write(line+'\n');
+}).on('close',()=>child.stdin.end());
+readline.createInterface({input:child.stdout}).on('line',line=>{
+ const response=JSON.parse(line);
+ if(probes.has(JSON.stringify(response.id)) && response.result)response.result.configOptions=[];
+ process.stdout.write(JSON.stringify(response)+'\n');
+});
+child.on('exit',code=>process.exit(code??1));
+"#;
+
+#[tokio::test]
+async fn unavailable_prestart_catalog_validates_explicit_model_against_new_child_before_brief() {
+    for clamped in [false, true] {
+        let root = tempfile::tempdir().unwrap();
+        let wrapper = root.path().join("cold-catalog.cjs");
+        std::fs::write(&wrapper, COLD_CATALOG_ADAPTER).unwrap();
+        let node = std::env::split_paths(&std::env::var_os("PATH").unwrap())
+            .map(|p| p.join("node"))
+            .find(|p| p.is_file())
+            .unwrap();
+        hennery_testkit::first_exec(node.to_str().unwrap());
+        let mut s = script();
+        if clamped {
+            s.sticky_options = vec!["model".into()];
+        }
+        let mut command = fake(root.path(), "cold", s);
+        command.args = vec![wrapper.display().to_string(), command.program];
+        command.program = node.display().to_string();
+        let h = Harness::with_worker(script(), Some((command, Profile::Claude)), true).await;
+        let caps = h.ok("session_capabilities", json!({"agent":"worker"})).await;
+        assert_eq!(caps["catalogs"][0]["freshness"], "unknown");
+        assert!(caps["catalogs"][0]["defaults"].get("model").is_none());
+        let receipt = h.spawn("cold-explicit", json!({"model":"large"})).await;
+        let child = receipt["child_id"].as_str().unwrap();
+        if clamped {
+            eventually("cold catalog mismatch held", async || {
+                let s = h.status(child).await;
+                (s["actual"]["model"] == "small" && s["operations"][0]["state"]["state"] == "waiting_config")
+                    .then_some(())
+            })
+            .await;
+            hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+            assert!(
+                h.state
+                    .store
+                    .find_session(child)
+                    .unwrap()
+                    .unwrap()
+                    .open_turn_id
+                    .is_none()
+            );
+            assert!(h.status(child).await["last_outcome"].is_null());
+        } else {
+            h.done(child, "cold-explicit").await;
+            assert_eq!(h.status(child).await["actual"]["model"], "large");
+        }
+        h.finish().await;
+    }
+}
+
+#[tokio::test]
+async fn background_worker_advances_past_offline_page_and_wraps_to_repaired_earlier_target() {
+    use hennery_proto::frames::McpIsolation;
+    use hennery_sessions::store::McpContext;
+    use rusqlite::params;
+    let h = Harness::with_worker(script(), None, false).await;
+    let later = h.spawn("later-page", json!({})).await;
+    let later = later["child_id"].as_str().unwrap();
+    // Attach once before adding global pressure. Its brief stays queued,
+    // so one later page visit can complete it without first needing a wrap.
+    hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+    eventually("later child ready for one dispatch", async || {
+        let s = h.status(later).await;
+        (s["actual"]["model"] == "small").then_some(())
+    })
+    .await;
+    let db = h.cwd.join("hennery.db");
+    let parent = h.state.store.find_session(&h.parent).unwrap().unwrap();
+    let gateway = hennery_gateway::store::GatewayStore::open(&db).unwrap();
+    let identity = gateway.authenticate_session(&h.token).unwrap().unwrap();
+    let revision = identity.delivered_delegation_revision().unwrap();
+    let earlier = "000-earlier-child";
+    let earlier_cwd = h.cwd.join("repairable-workspace");
+    std::fs::create_dir(&earlier_cwd).unwrap();
+    h.state
+        .store
+        .create_delegated_session(
+            &identity,
+            revision,
+            earlier,
+            "worker",
+            earlier_cwd.to_str().unwrap(),
+            McpContext {
+                capable: true,
+                isolation: McpIsolation::ClaudeStrict,
+                rules_name_other_hats: false,
+            },
+            0,
+        )
+        .unwrap()
+        .unwrap();
+    // A directory can disappear after acceptance and before host admission.
+    // Recreating this same path later makes the held target eligible again.
+    std::fs::remove_dir(&earlier_cwd).unwrap();
+    h.state
+        .hosts
+        .register(
+            "offline-backlog",
+            &Enrollment {
+                public_key: HostKey::from_seed([11; 32]).public_key_hex(),
+                name: "offline fixture".into(),
+                host_version: "fixture".into(),
+                platform: "fixture".into(),
+            },
+            0,
+        )
+        .unwrap();
+    let mut conn = hennery_kernel::db::open(&db).unwrap();
+    {
+        let tx = conn.transaction().unwrap();
+        let owner = h.state.store.owner_id();
+        let required = r#"{"model":"small","mode":"default"}"#;
+        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,accepted_revision) VALUES (?1,?2,'earlier','earlier-operation','fixture','session_spawn',?3,'queued',?4)",params![owner,h.parent,earlier,revision]).unwrap();
+        tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES (?1,'earlier-operation',?2,?3,?4,'earlier brief',?5)",params![owner,h.parent,earlier,revision,required]).unwrap();
+        tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config) VALUES (?1,?2,1,?3)",params![owner,earlier,required]).unwrap();
+        // Global pressure is fixture data, bypassing per-parent admission caps;
+        // offline rows are skipped before family/launch validation. The two
+        // live targets retain real family grants, host actors and ACP traffic.
+        for i in 0..129 {
+            let id = format!("000-offline-{i:04}");
+            let operation = format!("backlog-{i:04}");
+            tx.execute("INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,created_at,last_event_at) VALUES (?1,?2,'offline-backlog',?3,'worker',?4,'starting','fixture','fixture')",params![id,owner,parent.hat_id,h.cwd.to_str().unwrap()]).unwrap();
+            tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,accepted_revision) VALUES (?1,?2,?3,?3,'fixture','session_send',?4,'queued',?5)",params![owner,h.parent,operation,id,revision]).unwrap();
+            tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES (?1,?2,?3,?4,?5,'offline brief',?6)",params![owner,operation,h.parent,id,revision,required]).unwrap();
+        }
+        tx.commit().unwrap();
+    }
+    let first_page = h.state.store.delegation_targets_after("").unwrap();
+    assert_eq!(first_page.len(), 128);
+    assert_eq!(first_page[0], earlier);
+    assert!(!first_page.iter().any(|id| id == later));
+    hennery_sessions::delegation_worker::after_startup(&h.state);
+    eventually("later ready child beyond the offline first page", async || {
+        let s = h.status(later).await;
+        s["operations"]
+            .as_array()
+            .unwrap()
+            .iter()
+            .any(|o| o["state"]["state"] == "completed")
+            .then_some(())
+    })
+    .await;
+    assert_eq!(
+        h.state.store.find_session(earlier).unwrap().unwrap().lifecycle,
+        "starting"
+    );
+    std::fs::create_dir(&earlier_cwd).unwrap();
+    eventually("earlier repaired child after cursor wrap", async || {
+        let s = h.status(earlier).await;
+        s["operations"]
+            .as_array()
+            .unwrap()
+            .iter()
+            .any(|o| o["state"]["state"] == "completed")
+            .then_some(())
+    })
+    .await;
+    assert_eq!(h.status(earlier).await["last_outcome"], "completed");
+    h.finish().await;
+}
```

Run:

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --locked # expected exit 101
```

### Task 4, step 2: feat(delegation): enable verified bounded built-in tool dispatch

- [x] Implement the preceding contract; each listed GREEN command must succeed.

<!-- replay {"subject":"feat(delegation): enable verified bounded built-in tool dispatch","tree":"02d48dc54c609aac625ded76e165b287d10363fd","checks":[["cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/src/builtin.rs b/crates/hennery-sessions/src/builtin.rs
index c6bee1ec51bda1c8526d048da9c061d0c088ec0d..3ea4cab26ccffd24734498bf78eab1eb53775a2c 100644
--- a/crates/hennery-sessions/src/builtin.rs
+++ b/crates/hennery-sessions/src/builtin.rs
@@ -367,7 +367,7 @@ async fn handle(
             json!({"protocolVersion":version, "capabilities":{"tools":{}}, "serverInfo":{"name":"hennery","version":env!("CARGO_PKG_VERSION")}})
         }
         "ping" if no_params => json!({}),
-        "tools/list" if no_params => json!({"tools":[]}),
+        "tools/list" if no_params => crate::tool_args::discovery(),
         "tools/call" => {
             let params = message.params.unwrap_or(Value::Null);
             if !params.is_object() {
@@ -376,8 +376,6 @@ async fn handle(
             let Ok(call) = serde_json::from_value::<Call>(params) else {
                 return rpc_error(id, -32602, StatusCode::BAD_REQUEST);
             };
-            let _ = (call.name, call.arguments);
-            // D2 supplies typed handlers, accepted revisions and receipts.
             let active = state.app.hub.is_ready(context.host_id())
                 && state
                     .app
@@ -386,14 +384,37 @@ async fn handle(
                     .ok()
                     .flatten()
                     .is_some();
-            let code = if active { "tool_unavailable" } else { "session_starting" };
-            let structured = serde_json::to_value(hennery_proto::rest::ApiError {
-                code: code.into(),
-                message: "session control tools are unavailable".into(),
-                session_id: None,
-            })
-            .expect("a typed error serializes");
-            json!({"isError":true, "structuredContent":structured, "content":[{"type":"text","text":structured.to_string()}]})
+            let (structured, failed) = if !active {
+                (
+                    json!({"code":"session_starting","message":"the session is starting"}),
+                    true,
+                )
+            } else {
+                match tokio::time::timeout(
+                    state.limits.answer_timeout.min(std::time::Duration::from_secs(30)),
+                    crate::session_tools::execute(
+                        &state.app,
+                        &identity,
+                        revision,
+                        &call.name,
+                        Value::Object(call.arguments),
+                    ),
+                )
+                .await
+                {
+                    Ok(Ok(value)) => (value, false),
+                    Ok(Err(error)) => (
+                        json!({"code":crate::session_tools::error_code(&error),"message":"the session operation was refused"}),
+                        true,
+                    ),
+
+                    Err(_) => (
+                        json!({"code":"request_timeout","message":"retry with the same operation key"}),
+                        true,
+                    ),
+                }
+            };
+            json!({"isError":failed,"structuredContent":structured,"content":[{"type":"text","text":structured.to_string()}]})
         }
         "ping" | "tools/list" => return rpc_error(id, -32602, StatusCode::BAD_REQUEST),
         _ => return rpc_error(id, -32601, StatusCode::OK),
```

Run:

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --test owner_filter --locked # expected exit 0
```


### Task 5, step 1: test(delegation): specify committed close and answer event delivery

- [x] Observe each regression RED before the fix.

<!-- replay {"subject":"test(delegation): specify committed close and answer event delivery","tree":"353c2bc394ff6ef90aa6dfa3b861d5b974ee5fd6","checks":[["cargo test -p hennery-sessions --test delegation_d2 --locked delegated_unattached_close_records_parent_intent_and_publishes_all_committed_events -- --exact",101],["cargo test -p hennery-testkit --test delegation_tools --locked delegated_parked_close_is_attributed_and_reaches_existing_dashboard_stream -- --exact",101],["cargo test -p hennery-testkit --test delegation_tools --locked queued_parent_answer_reaches_existing_session_stream_before_dispatch -- --exact",101]]} -->
```diff
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 703fa57c040ec3c0420bec0f56c2896d35cda5c7..7381e3d386a266b0eb139f02522fae77aa652f57 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -266,6 +266,47 @@ fn answer() -> AnswerRequest {
     }
 }

+#[test]
+fn delegated_unattached_close_records_parent_intent_and_publishes_all_committed_events() {
+    let (w, p) = pair();
+    pending(&w, "child", 2, "closing-question", PendingKind::Elicitation);
+    let hub = Hub::new();
+    let mut live = hub.subscribe();
+    let before = w.store.max_event_id().unwrap();
+    let accepted = w
+        .store
+        .queue_child_close(&p, 1, "close-events", "digest", "child", &hub)
+        .unwrap();
+    assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "closed");
+    let events = w.store.events("child", before, 100).unwrap();
+    let close = events
+        .iter()
+        .find(|event| event.kind == "operator_closed")
+        .expect("durable close intent");
+    assert_eq!(close.host_seq, None);
+    assert_eq!(
+        close.body["origin"],
+        json!(InputOrigin::Parent {
+            session_id: "parent".into(),
+            operation_id: accepted.operation_id.clone()
+        })
+    );
+    assert!(events.iter().any(|event| event.kind == "pending_cancelled"));
+    let published: Vec<_> = std::iter::from_fn(|| live.try_recv().ok()).collect();
+    assert_eq!(
+        published, events,
+        "every committed close change must wake existing subscribers"
+    );
+    assert_eq!(
+        w.store
+            .queue_child_close(&p, 1, "close-events", "digest", "child", &hub)
+            .unwrap()
+            .operation_id,
+        accepted.operation_id
+    );
+    assert!(live.try_recv().is_err(), "idempotent retry publishes nothing");
+}
+
 #[test]
 fn close_intent_at_either_endpoint_cancels_before_prompt_handoff() {
     for endpoint in ["parent", "child"] {
diff --git a/crates/hennery-testkit/tests/delegation_tools.rs b/crates/hennery-testkit/tests/delegation_tools.rs
index bbca877378b8993da2896a3873095d270df21998..323da8bdaaf8b2592361256cdc3e7d2fd864ba3e 100644
--- a/crates/hennery-testkit/tests/delegation_tools.rs
+++ b/crates/hennery-testkit/tests/delegation_tools.rs
@@ -18,6 +18,59 @@ use std::{

 const HOST: &str = "delegation-host";
 const BOUND: Duration = Duration::from_secs(30);
+
+struct LiveSse {
+    response: reqwest::Response,
+    buffered: Vec<u8>,
+}
+impl LiveSse {
+    async fn open(h: &Harness, path: &str, after: Option<i64>) -> Self {
+        let mut request = h.client.get(format!("{}{path}", h.url));
+        if let Some(after) = after {
+            request = request.header("last-event-id", after.to_string());
+        }
+        let response = request.send().await.unwrap();
+        assert_eq!(response.status(), reqwest::StatusCode::OK);
+        Self {
+            response,
+            buffered: Vec::new(),
+        }
+    }
+    async fn next(&mut self) -> (String, Value) {
+        tokio::time::timeout(BOUND, async {
+            loop {
+                while let Some(end) = self.buffered.windows(2).position(|bytes| bytes == b"\n\n") {
+                    let block: Vec<_> = self.buffered.drain(..end + 2).collect();
+                    let block = std::str::from_utf8(&block).unwrap();
+                    let name = block
+                        .lines()
+                        .find_map(|line| line.strip_prefix("event:"))
+                        .map(str::trim);
+                    let data = block.lines().find_map(|line| line.strip_prefix("data:")).map(str::trim);
+                    if let (Some(name), Some(data)) = (name, data) {
+                        return (name.to_owned(), serde_json::from_str(data).unwrap());
+                    }
+                }
+                self.buffered
+                    .extend_from_slice(&self.response.chunk().await.unwrap().expect("live SSE ended"));
+            }
+        })
+        .await
+        .expect("live SSE message before deadline")
+    }
+    async fn matching(&mut self, name: &str, predicate: impl Fn(&Value) -> bool) -> Value {
+        tokio::time::timeout(BOUND, async {
+            loop {
+                let (kind, data) = self.next().await;
+                if kind == name && predicate(&data) {
+                    return data;
+                }
+            }
+        })
+        .await
+        .expect("matching live SSE message before deadline")
+    }
+}
 struct Harness {
     _dir: tempfile::TempDir,
     state: AppState,
@@ -777,6 +830,102 @@ async fn permission_questions_remain_operator_only_and_elicitation_has_one_answe
     h.finish().await;
 }

+#[tokio::test]
+async fn delegated_parked_close_is_attributed_and_reaches_existing_dashboard_stream() {
+    let h = Harness::with_worker(script(), None, false).await;
+    let receipt = h.spawn("park-close", json!({})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    eventually("completed child before parking", async || {
+        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+        (h.status(child).await["last_outcome"] == "completed").then_some(())
+    })
+    .await;
+    let (status, body) = h.post(&format!("/api/sessions/{child}/park"), json!({})).await;
+    assert!(status.is_success(), "{body}");
+    eventually("idle genuinely parked child", async || {
+        let session = h.state.store.find_session(child).unwrap().unwrap();
+        (session.lifecycle == "parked" && !session.presumed_parked && session.open_turn_id.is_none()).then_some(())
+    })
+    .await;
+    let page: Value = h
+        .client
+        .get(format!("{}/api/view/sessions", h.url))
+        .send()
+        .await
+        .unwrap()
+        .json()
+        .await
+        .unwrap();
+    let mut dashboard = LiveSse::open(
+        &h,
+        &format!(
+            "/api/stream/sessions?after={}:{}",
+            page["epoch"].as_str().unwrap(),
+            page["revision"].as_i64().unwrap()
+        ),
+        None,
+    )
+    .await;
+    assert_eq!(dashboard.next().await.0, "waiting_changed");
+    let before = h.state.store.max_event_id().unwrap();
+    let arguments = json!({"operation_key":"close-parked","child_id":child});
+    let closed = h.ok("session_close", arguments.clone()).await;
+    let events = h.state.store.events(child, before, 100).unwrap();
+    let close: Vec<_> = events.iter().filter(|event| event.kind == "operator_closed").collect();
+    assert_eq!(close.len(), 1, "one durable close marker for an idle parked child");
+    assert_eq!(
+        close[0].body["origin"],
+        json!({"kind":"parent","session_id":h.parent,"operation_id":closed["operation_id"]})
+    );
+    let summary = dashboard
+        .matching("session_upsert", |summary| {
+            summary["session_id"] == child && summary["lifecycle"] == "closed"
+        })
+        .await;
+    assert_eq!(summary["question_waits"], false);
+    h.ok("session_close", arguments).await;
+    assert_eq!(h.state.store.events(child, before, 100).unwrap().len(), events.len());
+    h.finish().await;
+}
+
+#[tokio::test]
+async fn queued_parent_answer_reaches_existing_session_stream_before_dispatch() {
+    let mut worker = script();
+    worker.asks = vec![FakeAsk::Elicitation];
+    let h = Harness::with_worker(worker, None, false).await;
+    let receipt = h.spawn("answer-stream", json!({})).await;
+    let child = receipt["child_id"].as_str().unwrap();
+    let pending = eventually("ordinary child question", async || {
+        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+        h.state.store.open_pending(child).unwrap().into_iter().next()
+    })
+    .await;
+    let last = h.state.store.events(child, 0, 100).unwrap().last().unwrap().event_id;
+    let mut stream = LiveSse::open(&h, &format!("/api/stream/sessions/{child}"), Some(last - 1)).await;
+    stream.matching("event", |event| event["event_id"] == last).await;
+    let mut published = h.state.hub.subscribe();
+    let arguments = json!({"operation_key":"answer-live","child_id":child,"pending_id":pending.pending_id,"action":"accept","content":{"name":"parent"}});
+    let accepted = h.ok("session_answer", arguments.clone()).await;
+    let event = stream
+        .matching("event", |event| event["kind"] == "answer_submitted")
+        .await;
+    assert_eq!(
+        event["body"]["origin"],
+        json!({"kind":"parent","session_id":h.parent,"operation_id":accepted["operation_id"]})
+    );
+    let changed = stream
+        .matching("pending_changed", |item| item["pending_id"] == pending.pending_id)
+        .await;
+    assert_eq!(changed["answered"], true);
+    assert!(changed["delivered"].is_null(), "publication precedes host handoff");
+    let committed = h.state.store.events(child, last, 100).unwrap();
+    assert_eq!(committed.len(), 1);
+    assert_eq!(published.try_recv().unwrap(), committed[0]);
+    h.ok("session_answer", arguments).await;
+    assert!(published.try_recv().is_err(), "retry must not republish the answer");
+    h.finish().await;
+}
+
 /// Local acceptance only: adapters are supplied explicitly, never installed by
 /// the test. The dispatch worker is disabled and drained exactly once to attach
 /// the accepted child; its saved brief is never submitted to the adapter.
```

Run:

```bash
nix develop -c cargo test -p hennery-sessions --test delegation_d2 --locked delegated_unattached_close_records_parent_intent_and_publishes_all_committed_events -- --exact # expected exit 101
nix develop -c cargo test -p hennery-testkit --test delegation_tools --locked delegated_parked_close_is_attributed_and_reaches_existing_dashboard_stream -- --exact # expected exit 101
nix develop -c cargo test -p hennery-testkit --test delegation_tools --locked queued_parent_answer_reaches_existing_session_stream_before_dispatch -- --exact # expected exit 101
```


### Task 5, step 2: fix(delegation): publish committed parent answer and attributed close changes

- [x] Implement the preceding contract and observe GREEN.

<!-- replay {"subject":"fix(delegation): publish committed parent answer and attributed close changes","tree":"6ba20ab0a57eb522b1a5ab83b61d2e1ec1c52023","checks":[["cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked",0],["cargo test -p hennery-testkit --test delegation_tools --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/src/delegation_control.rs b/crates/hennery-sessions/src/delegation_control.rs
index 3668dbb4bac0d6915ffe835a0f357179094c6215..6a224f7f4cde6082e2a3ca3968e9cac6ec6507b4 100644
--- a/crates/hennery-sessions/src/delegation_control.rs
+++ b/crates/hennery-sessions/src/delegation_control.rs
@@ -29,6 +29,7 @@ impl Store {
         revision: i64,
         digest: &str,
         input: &DelegatedAnswer<'_>,
+        hub: &Hub,
     ) -> Result<OperationReceipt> {
         let DelegatedAnswer {
             key,
@@ -74,6 +75,8 @@ impl Store {
         )?;
         let receipt = self.receipt_in(&tx, caller.session_id(), key)?.expect("inserted");
         tx.commit()?;
+        drop(conn);
+        hub.publish(queued.event);
         Ok(receipt)
     }
     pub fn queue_child_close(
@@ -105,6 +108,21 @@ impl Store {
         tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,request_id,state)
             VALUES (?1,?2,?3,?4,?5,'session_close',?6,?4,?7)",params![self.owner_id(),caller.session_id(),key,operation,digest,child,if lifecycle=="closed" {"completed"}else{"awaiting_reconciliation"}])?;
         tx.execute("UPDATE sessions SET close_requested = 1 WHERE owner_id = ?1 AND id = ?2 AND lifecycle NOT IN ('closed','deleted')",params![self.owner_id(),child])?;
+        let event = if lifecycle != "closed" {
+            Some(crate::store::collector_event(
+                &tx,
+                self.owner_id(),
+                child,
+                "operator_closed",
+                serde_json::json!({"origin": InputOrigin::Parent {
+                    session_id: caller.session_id().into(),
+                    operation_id: operation.clone(),
+                }}),
+                &crate::store::now(),
+            )?)
+        } else {
+            None
+        };
         let receipt = self.receipt_in(&tx, caller.session_id(), key)?.expect("inserted");
         tx.commit()?;
         let handed = hub.notify(
@@ -115,14 +133,25 @@ impl Store {
             },
         );
         drop(conn);
-        if !handed || !matches!(lifecycle.as_str(), "active" | "starting") {
+        let closed = if !handed || !matches!(lifecycle.as_str(), "active" | "starting") {
             self.close_delegated_unattached(
                 child,
                 &crate::store::Unattached {
                     lifecycle: lifecycle.clone(),
                     presumed_parked: presumed,
                 },
-            )?;
+            )
+        } else {
+            Ok(Vec::new())
+        };
+        // Publish after the fallback commits, so a dashboard wake-up observes
+        // its final lifecycle even when closing an idle parked child emits
+        // no additional event. The durable intent is published on error too.
+        if let Some(event) = event {
+            hub.publish(event);
+        }
+        for event in closed? {
+            hub.publish(event);
         }
         Ok(receipt)
     }
diff --git a/crates/hennery-sessions/src/session_tools.rs b/crates/hennery-sessions/src/session_tools.rs
index 669ce9a2b188316cd481455f19062229333d22ae..ff451943727928fdbd5970d590d510d4dd57d238 100644
--- a/crates/hennery-sessions/src/session_tools.rs
+++ b/crates/hennery-sessions/src/session_tools.rs
@@ -167,6 +167,7 @@ pub async fn execute(
                     pending: &args.pending_id,
                     answer: &answer,
                 },
+                &state.hub,
             )?)?)
         }
         ToolCall::Status(args) => Ok(serde_json::to_value(state.store.child_status(
diff --git a/crates/hennery-sessions/src/store.rs b/crates/hennery-sessions/src/store.rs
index db58c68e91fc604f2eb74d520ffe237e865d9323..d851978d810f94e4a442532c63c4198548008218 100644
--- a/crates/hennery-sessions/src/store.rs
+++ b/crates/hennery-sessions/src/store.rs
@@ -856,7 +856,7 @@ pub(crate) fn now() -> String {
 /// Write a collector-originated event (`host_seq` NULL, ACP core §8), for
 /// a session of `owner`'s only: for any other, or a tombstone (plan 9a
 /// A1), it fails and writes nothing.
-fn collector_event(
+pub(crate) fn collector_event(
     tx: &Transaction<'_>,
     owner: &str,
     session_id: &str,
diff --git a/crates/hennery-sessions/tests/delegation.rs b/crates/hennery-sessions/tests/delegation.rs
index 3d1dfd0d0e05926002d4c6c2d386637157984344..b3e34e8d768b9e1f651955e82ca57c95bdf42eff 100644
--- a/crates/hennery-sessions/tests/delegation.rs
+++ b/crates/hennery-sessions/tests/delegation.rs
@@ -9,6 +9,7 @@ use hennery_kernel::hosts::{Enrollment, Hosts};
 use hennery_kernel::operator::{Operator, SetupOutcome};
 use hennery_kernel::secret::unix_now;
 use hennery_proto::frames::{McpIsolation, McpServer, SessionBody};
+use hennery_sessions::hub::Hub;
 use hennery_sessions::store::{McpContext, Store};
 use std::sync::Arc;
 struct World {
@@ -580,6 +581,7 @@ fn d2_answers_reuse_the_operator_slot_but_permissions_require_operator() {
                 pending: "ordinary",
                 answer: &answer,
             },
+            &Hub::new(),
         )
         .unwrap();
     assert_eq!(
@@ -594,7 +596,8 @@ fn d2_answers_reuse_the_operator_slot_but_permissions_require_operator() {
                     child: "child",
                     pending: "ordinary",
                     answer: &answer
-                }
+                },
+                &Hub::new(),
             )
             .unwrap()
     );
@@ -613,7 +616,8 @@ fn d2_answers_reuse_the_operator_slot_but_permissions_require_operator() {
                     child: "child",
                     pending: "permission",
                     answer: &answer
-                }
+                },
+                &Hub::new(),
             )
             .unwrap_err()
             .to_string()
diff --git a/crates/hennery-sessions/tests/delegation_d2.rs b/crates/hennery-sessions/tests/delegation_d2.rs
index 7381e3d386a266b0eb139f02522fae77aa652f57..69f79ef547b0d0d75f63b35e9d64e993cb69e61c 100644
--- a/crates/hennery-sessions/tests/delegation_d2.rs
+++ b/crates/hennery-sessions/tests/delegation_d2.rs
@@ -559,7 +559,8 @@ fn collector_restart_preserves_receipts_and_operation_key_namespace_across_tools
                     child: &child,
                     pending: "missing",
                     answer: &answer()
-                }
+                },
+                &Hub::new(),
             )
             .unwrap_err()
             .to_string()
@@ -929,6 +930,7 @@ fn ordinary_answers_share_one_slot_under_four_worker_race() {
                                 pending: "question",
                                 answer: &answer(),
                             },
+                            &Hub::new(),
                         ) {
                             Ok(_) => 1,
                             Err(e) => {
@@ -975,6 +977,7 @@ fn parent_close_frees_unhanded_answer_without_stealing_operator_slot() {
                 pending: "question",
                 answer: &answer(),
             },
+            &Hub::new(),
         )
         .unwrap();
     assert!(w.store.answers_to_send("host").unwrap().is_empty());
@@ -1004,7 +1007,8 @@ fn permissions_are_operator_only_and_status_contains_no_answer_capable_schema()
                     child: "child",
                     pending: "permission",
                     answer: &answer()
-                }
+                },
+                &Hub::new(),
             )
             .unwrap_err()
             .to_string(),
@@ -1041,6 +1045,7 @@ fn accepted_answer_is_not_delivered_until_factual_host_verdict_and_survives_sour
                 pending: "question",
                 answer: &answer(),
             },
+            &Hub::new(),
         )
         .unwrap();
     let (h, mut rx) = connected();
@@ -1430,6 +1435,7 @@ fn disabling_and_reenabling_grant_cancels_queue_without_reviving_old_token() {
                 pending: "grant-question",
                 answer: &answer(),
             },
+            &Hub::new(),
         )
         .unwrap();
     let (h, mut rx) = connected();
```

Run:

```bash
nix develop -c cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked # expected exit 0
nix develop -c cargo test -p hennery-testkit --test delegation_tools --locked # expected exit 0
```


### Task 6, step 1: test(delegation): specify answer page advancement and wraparound

- [x] Observe each regression RED before the fix.

<!-- replay {"subject":"test(delegation): specify answer page advancement and wraparound","tree":"27e6f9f984dd9ee172c24bab3bb77a2b2b148540","checks":[["cargo test -p hennery-testkit --test delegation_tools --locked background_answer_worker_advances_past_held_page_and_wraps_to_repaired_earlier_answer -- --exact",101]]} -->
```diff
diff --git a/crates/hennery-testkit/tests/delegation_tools.rs b/crates/hennery-testkit/tests/delegation_tools.rs
index 323da8bdaaf8b2592361256cdc3e7d2fd864ba3e..28f639d30e6c9141a85a3dd6477778fcb118a6c2 100644
--- a/crates/hennery-testkit/tests/delegation_tools.rs
+++ b/crates/hennery-testkit/tests/delegation_tools.rs
@@ -1251,3 +1251,91 @@ async fn background_worker_advances_past_offline_page_and_wraps_to_repaired_earl
     assert_eq!(h.status(earlier).await["last_outcome"], "completed");
     h.finish().await;
 }
+
+#[tokio::test]
+async fn background_answer_worker_advances_past_held_page_and_wraps_to_repaired_earlier_answer() {
+    use rusqlite::params;
+    let mut worker = script();
+    worker.asks = vec![FakeAsk::Elicitation];
+    let h = Harness::with_worker(worker, None, false).await;
+    let earlier = h.spawn("answer-earlier", json!({})).await;
+    let earlier = earlier["child_id"].as_str().unwrap();
+    let later = h.spawn("answer-later", json!({})).await;
+    let later = later["child_id"].as_str().unwrap();
+    let (earlier_pending, later_pending) = eventually("both children asking", async || {
+        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
+        let earlier = h
+            .state
+            .store
+            .open_pending(earlier)
+            .unwrap()
+            .into_iter()
+            .find(|p| !p.answered)?;
+        let later = h
+            .state
+            .store
+            .open_pending(later)
+            .unwrap()
+            .into_iter()
+            .find(|p| !p.answered)?;
+        Some((earlier, later))
+    })
+    .await;
+    h.ok("session_answer", json!({"operation_key":"earlier-answer","child_id":earlier,"pending_id":earlier_pending.pending_id,"action":"accept","content":{"name":"answer"}})).await;
+    let mut conn = hennery_kernel::db::open(&h.cwd.join("hennery.db")).unwrap();
+    let revision: i64;
+    {
+        let tx = conn.transaction().unwrap();
+        let owner = h.state.store.owner_id();
+        revision = tx.query_row("SELECT accepted_revision FROM session_operations WHERE owner_id=?1 AND caller_id=?2 AND operation_key='earlier-answer'",params![owner,h.parent],|r|r.get(0)).unwrap();
+        // These accepted rows are held by a changed delegation grant. Fixture
+        // pressure bypasses admission limits; both live answers still use real
+        // parent grants, pending records, host actors and ACP traffic.
+        tx.execute("UPDATE session_operations SET operation_id='000-earlier-answer',accepted_revision=?3 WHERE owner_id=?1 AND caller_id=?2 AND operation_key='earlier-answer'",params![owner,h.parent,revision-1]).unwrap();
+        for i in 0..127 {
+            let pending = format!("held-answer-question-{i:04}");
+            let operation = format!("100-held-answer-{i:04}");
+            tx.execute("INSERT INTO pending(pending_id,session_id,turn_id,kind,option_ids,payload,state,opened_at,owner_id) SELECT ?1,session_id,turn_id,kind,option_ids,payload,'open',opened_at,owner_id FROM pending WHERE owner_id=?2 AND pending_id=?3",params![pending,owner,earlier_pending.pending_id]).unwrap();
+            tx.execute("INSERT INTO answer_queue(owner_id,pending_id,session_id,request_id,answer,submitted_at,delegation_handoff) SELECT owner_id,?1,session_id,?2,answer,submitted_at,0 FROM answer_queue WHERE owner_id=?3 AND pending_id=?4",params![pending,operation,owner,earlier_pending.pending_id]).unwrap();
+            tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,pending_id,request_id,state,accepted_revision) VALUES (?1,?2,?3,?3,'fixture','session_answer',?4,?5,?3,'queued',?6)",params![owner,h.parent,operation,earlier,pending,revision-1]).unwrap();
+        }
+        tx.commit().unwrap();
+    }
+    h.ok("session_answer", json!({"operation_key":"later-answer","child_id":later,"pending_id":later_pending.pending_id,"action":"accept","content":{"name":"answer"}})).await;
+    conn.execute("UPDATE session_operations SET operation_id='999-later-answer' WHERE owner_id=?1 AND caller_id=?2 AND operation_key='later-answer'",params![h.state.store.owner_id(),h.parent]).unwrap();
+    assert_eq!(conn.query_row("SELECT COUNT(*) FROM session_operations WHERE owner_id=?1 AND tool='session_answer' AND state='queued' AND operation_id < '999-later-answer'",[h.state.store.owner_id()],|r|r.get::<_,i64>(0)).unwrap(),128);
+    hennery_sessions::delegation_worker::after_startup(&h.state);
+    eventually("eligible answer beyond 128 held answers", async || {
+        (h.state
+            .store
+            .pending_item(&later_pending.pending_id)
+            .unwrap()
+            .unwrap()
+            .delivered
+            == Some(true))
+        .then_some(())
+    })
+    .await;
+    assert_eq!(
+        h.state
+            .store
+            .pending_item(&earlier_pending.pending_id)
+            .unwrap()
+            .unwrap()
+            .delivered,
+        None
+    );
+    conn.execute("UPDATE session_operations SET accepted_revision=?3 WHERE owner_id=?1 AND caller_id=?2 AND operation_key='earlier-answer'",params![h.state.store.owner_id(),h.parent,revision]).unwrap();
+    eventually("repaired earlier answer after cursor wrap", async || {
+        (h.state
+            .store
+            .pending_item(&earlier_pending.pending_id)
+            .unwrap()
+            .unwrap()
+            .delivered
+            == Some(true))
+        .then_some(())
+    })
+    .await;
+    h.finish().await;
+}
```

Run:

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_tools --locked background_answer_worker_advances_past_held_page_and_wraps_to_repaired_earlier_answer -- --exact # expected exit 101
```


### Task 6, step 2: fix(delegation): retain independent answer cursor across bounded worker ticks

- [x] Implement the preceding contract and observe GREEN.

<!-- replay {"subject":"fix(delegation): retain independent answer cursor across bounded worker ticks","tree":"a384924c24414263405c0cb6389c24a774d1f0f0","checks":[["cargo test -p hennery-testkit --test delegation_tools --test owner_filter --locked",0]]} -->
```diff
diff --git a/crates/hennery-sessions/src/delegation_control.rs b/crates/hennery-sessions/src/delegation_control.rs
index 6a224f7f4cde6082e2a3ca3968e9cac6ec6507b4..291bf05a9b5a67528ccc53051ca26d388b8b1715 100644
--- a/crates/hennery-sessions/src/delegation_control.rs
+++ b/crates/hennery-sessions/src/delegation_control.rs
@@ -355,13 +355,18 @@ impl Store {

 impl Store {
     pub fn dispatch_delegation_answers(&self, hub: &Hub) -> Result<()> {
+        self.dispatch_delegation_answers_after(hub, "").map(|_| ())
+    }
+    /// Dispatch one bounded page, including held rows in cursor progress. An
+    /// empty page returns `None`, so a persistent caller can wrap to the start.
+    pub fn dispatch_delegation_answers_after(&self, hub: &Hub, after: &str) -> Result<Option<String>> {
         let mut conn = self.conn();
         let rows = {
             let mut stmt=conn.prepare("SELECT o.operation_id,o.caller_id,o.child_id,o.pending_id,o.request_id,o.accepted_revision,a.answer,s.host_id
             FROM session_operations o JOIN answer_queue a ON a.owner_id = ?1 AND a.pending_id = o.pending_id
             JOIN sessions s ON s.owner_id = ?1 AND s.id = o.child_id
-            WHERE o.owner_id = ?1 AND o.tool = 'session_answer' AND o.state = 'queued' AND a.delegation_handoff = 0 AND a.delivered IS NULL LIMIT 128")?;
-            stmt.query_map([self.owner_id()], |r| {
+            WHERE o.owner_id = ?1 AND o.tool = 'session_answer' AND o.state = 'queued' AND a.delegation_handoff = 0 AND a.delivered IS NULL AND o.operation_id > ?2 ORDER BY o.operation_id LIMIT 128")?;
+            stmt.query_map(params![self.owner_id(), after], |r| {
                 Ok((
                     r.get::<_, String>(0)?,
                     r.get::<_, String>(1)?,
@@ -375,6 +380,7 @@ impl Store {
             })?
             .collect::<rusqlite::Result<Vec<_>>>()?
         };
+        let next = rows.last().map(|row| row.0.clone());
         for (operation, source, child, pending, request, revision, answer, host) in rows {
             let tx = conn.transaction()?;
             if !self.transfer_in(&tx, &source, &child, revision)? || !hub.is_ready(&host) {
@@ -400,6 +406,6 @@ impl Store {
                 tx.commit()?;
             }
         }
-        Ok(())
+        Ok(next)
     }
 }
diff --git a/crates/hennery-sessions/src/delegation_worker.rs b/crates/hennery-sessions/src/delegation_worker.rs
index 6298414747979dbf212be1e3e356bc0cae0d9724..a8f59dcceb24ce69cf0f5e06b38cea4279d3836f 100644
--- a/crates/hennery-sessions/src/delegation_worker.rs
+++ b/crates/hennery-sessions/src/delegation_worker.rs
@@ -2,26 +2,34 @@
 //! operator attention, then reuse these same transfer/config/close gates.
 use crate::{AppState, delegation_runtime::checked_cwd};
 use std::time::Duration;
+#[derive(Default)]
+struct Cursors {
+    prompts: String,
+    answers: String,
+}
 pub fn after_startup(state: &AppState) {
     let state = state.clone();
     tokio::spawn(async move {
         let mut tick = tokio::time::interval(Duration::from_millis(250));
-        let mut after = String::new();
+        let mut cursors = Cursors::default();
         loop {
             tokio::select! {biased; ()=state.shutdown.cancelled()=>break,_=tick.tick()=>{}}
-            if let Err(error) = drain_page(&state, &mut after).await {
+            if let Err(error) = drain_page(&state, &mut cursors).await {
                 tracing::warn!(code=%crate::session_tools::error_code(&error),"delegation dispatch deferred");
             }
         }
     });
 }
 pub async fn drain(state: &AppState) -> anyhow::Result<()> {
-    drain_page(state, &mut String::new()).await
+    drain_page(state, &mut Cursors::default()).await
 }
-async fn drain_page(state: &AppState, after: &mut String) -> anyhow::Result<()> {
-    state.store.dispatch_delegation_answers(&state.hub)?;
-    let targets = state.store.delegation_targets_after(after)?;
-    *after = targets.last().cloned().unwrap_or_default();
+async fn drain_page(state: &AppState, cursors: &mut Cursors) -> anyhow::Result<()> {
+    cursors.answers = state
+        .store
+        .dispatch_delegation_answers_after(&state.hub, &cursors.answers)?
+        .unwrap_or_default();
+    let targets = state.store.delegation_targets_after(&cursors.prompts)?;
+    cursors.prompts = targets.last().cloned().unwrap_or_default();
     for target in targets {
         let Some(session) = state.store.find_session(&target)? else {
             continue;
```

Run:

```bash
nix develop -c cargo test -p hennery-testkit --test delegation_tools --test owner_filter --locked # expected exit 0
```


## After this plan

D3 adds reverse durable delivery at the **Store::ingest_delegation_in** seam, inside the transaction that applies a factual child event. D2's transfer/evidence/handoff predicates are the shared fenced admission primitives. D3 must add its own reverse-direction durable operation, provenance, wake budget, cancellation/replay, acknowledgement and operator-attention path; it must not infer a notice from a socket send or use operator resume to bypass close intent. D2 deliberately emits no parent notice and no ChildReport activity.

D4 consumes the catalog and policy routes plus family/status metadata for the operator UI and runs the designed live cross-runtime/provider matrix. Explicit policy grants require the existing browser cookie/origin and step-up flow. Unknown catalog/security evidence remains visibly held; UI must not offer a guessed runtime/model or present accepted/delivered as completed.

The parent runs independent task, security and whole-branch reviews on the embedded code, opens the PR, checks **checks, reviewDecision, mergeStateStatus and all unresolved review threads**, and obtains Linux/macOS CI evidence. No merge or PR status is claimed by this child.

## Verification record

### Review amendments for draft PR 149

Codex gpt-6-astra reviewed **256691fe..2443592e** on the maintainer's behalf: **APPROVE AFTER AMENDMENTS**, no Critical findings; 126 focused tests passed. The two Important findings were answer starvation behind the first 128 held rows, and unrecorded/unpublished delegated close changes plus unpublished queued parent answers.

Both amendments were implemented test-first. The event regressions observed RED exit 101 for the missing durable close marker and a live answer-stream timeout. The valid dashboard RED used the documented epoch/revision anchor; earlier fixture field mistakes were corrected and are not counted as behavioral evidence. GREEN then passed 87 store tests (13 + 74) and 10 HTTP tests; after pagination integration, 11 HTTP tests plus the 3-test owner audit passed. The pagination regression independently reproduced RED exit 101 in the root lane: 128 held answers, then eligible work that never dispatched. Its GREEN also verifies repaired earlier work after cursor wrap.

A delegated close now records the existing close marker with typed parent session/operation provenance in the same transaction as intent. It publishes that committed marker and every fallback close change, with the dashboard reading the final closed lifecycle. Queued ordinary answers publish their committed event before dispatch. Idempotent retries publish nothing. The worker retains separate bounded prompt/answer cursors and wraps each at the end. No wire types, generated files, migration or tool-argument parsing changed.

#### Amendment checks

All six commands ran on final implementation **395fa140** inside the dev shell with scratch HOME/XDG/tool configuration.

| Command | Exit | Passed |
|---|---:|---:|
| `cargo fmt --all --check` | 0 | 0 |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 | 0 |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 | 0 |
| `cargo test --workspace --locked` | 0 | 2302 |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 | 0 |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 | 0 |

Evidence: `.superpowers/sdd/deleg-d2/checks-review/`. No wire/generated file changed against 2443592e, so the conditional web rerun was skipped. Earlier web results remain historical evidence below. No type, test, audit or rule was weakened.

#### Amendment copy probes

Nine independent mutations ran in copies and were caught by behavioral failures (each exit **101**, no compiler failure).

| Mutation | Observed result |
|---|---|
| answer-publish | 101, caught |
| close-intent-publish | 101, caught |
| close-fallback-publishes | 101, caught |
| close-intent-record | 101, caught |
| close-parent-session | 101, caught |
| close-parent-operation | 101, caught |
| query-progress | 101, caught |
| worker-progress | 101, caught |
| worker-wrap | 101, caught |

The restored event copy passed **84 tests** (74 store + 10 HTTP); the restored pagination copy passed its **1** regression, both exit **0**. The combined manifest now records **227 executed / 226 caught / 1 equivalent**. The one equivalent case is the original UPSERT mutation, independently ruled equivalent rather than rerun or relabelled caught. Copy directories and per-case logs are retained in the cleanup ledger.

#### Amendment load

Both suites passed **four simultaneous copies × three rounds**, all 12 exits 0 per suite.

| Final-source suite | Tests per copy | Total passed |
|---|---:|---:|
| Store (including queue/answer/start races and committed close publication) | 74 | 888 |
| HTTP (including both live SSE regressions and answer worker advance/wrap) | 11 | 132 |

The accepted store run uses the workspace binary rebuilt from 395fa140 (`delegation_d2-35a902e3477d510d`); the HTTP run uses its targeted final-source binary (`delegation_tools-ecc9ea5581687c27`). An earlier load used the preceding event-fix store binary and is not counted toward final-source proof. Logs are `review-store-load-final/` and the HTTP entries in `review-load/`.

#### Complete fresh replay after amendments

Fresh **deleg-d2-replay-5**, pinned to **256691feb9cba161f0c29b14016bc857a4da86e5**, extracted and applied **12 nonempty exact patch blocks** and reproduced **all 23 expected exits** (**11 RED**, **12 GREEN**). Every complete staged tree matched its recorded ID. Every tracked implementation file matched **395fa1401a6c046c0ed7afae27f6248f74e8bde4**; only this plan and its README index were excluded from that comparison, and both documentation files were separately verified unchanged from the pinned base during replay. Final replay head: **57078b3f29935ecf01ea26ff9a6fa6758b30c450**. The target was a private APFS clone made while root compilation was quiescent, never shared.

| Replay step | Command | Expected / actual | Passed |
|---|---|---:|---:|
| 1 | `cargo test -p hennery-proto --test delegation_tools --locked` | 101 / 101 | 0 |
| 1 | `cargo test -p hennery-sessions --test tool_args --locked` | 101 / 101 | 0 |
| 2 | `cargo test -p hennery-proto --test delegation_tools --locked` | 0 / 0 | 2 |
| 2 | `cargo test -p hennery-sessions --test tool_args --locked` | 0 / 0 | 7 |
| 3 | `cargo test -p hennery-testkit --test delegation_host --locked` | 101 / 101 | 0 |
| 4 | `cargo test -p hennery-testkit --test delegation_host --locked` | 0 / 0 | 15 |
| 4 | `cargo test -p hennery-host --locked` | 0 / 0 | 199 |
| 5 | `cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked` | 101 / 101 | 0 |
| 5 | `cargo test -p hennery-sessions --test owner --test store --locked` | 101 / 101 | 0 |
| 5 | `cargo test -p hennery-proto --test codegen --locked delegation_wire_dependencies_are_exported_once` | 101 / 101 | 0 |
| 6 | `cargo test -p hennery-sessions --test delegation --test delegation_d2 --test tool_args --test owner --test store --locked` | 0 / 0 | 202 |
| 6 | `cargo test -p hennery-testkit --test owner_filter --locked` | 0 / 0 | 3 |
| 6 | `cargo test -p hennery-proto --test codegen --locked` | 0 / 0 | 10 |
| 6 | `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 / 0 | 0 |
| 7 | `cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --locked` | 101 / 101 | 0 |
| 8 | `cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --test owner_filter --locked` | 0 / 0 | 30 |
| 9 | `cargo test -p hennery-sessions --test delegation_d2 --locked delegated_unattached_close_records_parent_intent_and_publishes_all_committed_events -- --exact` | 101 / 101 | 0 |
| 9 | `cargo test -p hennery-testkit --test delegation_tools --locked delegated_parked_close_is_attributed_and_reaches_existing_dashboard_stream -- --exact` | 101 / 101 | 0 |
| 9 | `cargo test -p hennery-testkit --test delegation_tools --locked queued_parent_answer_reaches_existing_session_stream_before_dispatch -- --exact` | 101 / 101 | 0 |
| 10 | `cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked` | 0 / 0 | 87 |
| 10 | `cargo test -p hennery-testkit --test delegation_tools --locked` | 0 / 0 | 10 |
| 11 | `cargo test -p hennery-testkit --test delegation_tools --locked background_answer_worker_advances_past_held_page_and_wraps_to_repaired_earlier_answer -- --exact` | 101 / 101 | 0 |
| 12 | `cargo test -p hennery-testkit --test delegation_tools --test owner_filter --locked` | 0 / 0 | 14 |

The final documentation update is checked against the exact 12 patch blocks tested by this replay. D3 reverse delivery/operator fallback and D4 family UI/provider acceptance remain outside this amendment. The parent owns scoped confirmation for **2443592e..395fa140**, the final record, and draft PR **149** status: checks, reviewDecision, mergeStateStatus and every unresolved review thread, bots included. No GitHub action was performed by this lane.

The reviewer confirmed the old UPSERT mutation **EQUIVALENT**: conflict key `(owner_id, caller_id, epoch)` already fixes the owner. The explicit predicate remains. This is a recorded review ruling, not a new mutation run or an invented passing test. Scoped confirmation of these amendments remains parent-owned.

### Original implementation evidence (before the amendments)

The implementation was built before embedding. The final branch was rebased without conflicts onto **256691fe** (merged P1); sessions migration **18** follows merged 17, with kernel 13 and gateway 5 unchanged. The original exact replay used **ef8ccc40** as its implementation head. The following is the original verification record, retained separately from the later review amendment evidence above.

### Fresh replay

Fresh **deleg-d2-replay-3** applied **8 nonempty exact patch blocks**, reproduced **all 16 expected exits** (7 RED, 9 GREEN), and matched the **complete tracked implementation tree** at ef8ccc40 byte for byte. Replay head: **b51ea448cb2729b54938c84b952a1536b62ce47c**. Per-state tree IDs, expected/actual exits and logs are retained in its replay ledger.

| Step | Command | Expected / actual | Passed |
|---|---|---:|---:|
| 1 | `cargo test -p hennery-proto --test delegation_tools --locked` | 101 / 101 | 0 |
| 1 | `cargo test -p hennery-sessions --test tool_args --locked` | 101 / 101 | 0 |
| 2 | `cargo test -p hennery-proto --test delegation_tools --locked` | 0 / 0 | 2 |
| 2 | `cargo test -p hennery-sessions --test tool_args --locked` | 0 / 0 | 7 |
| 3 | `cargo test -p hennery-testkit --test delegation_host --locked` | 101 / 101 | 0 |
| 4 | `cargo test -p hennery-testkit --test delegation_host --locked` | 0 / 0 | 15 |
| 4 | `cargo test -p hennery-host --locked` | 0 / 0 | 199 |
| 5 | `cargo test -p hennery-sessions --test delegation --test delegation_d2 --locked` | 101 / 101 | 0 |
| 5 | `cargo test -p hennery-sessions --test owner --test store --locked` | 101 / 101 | 0 |
| 5 | `cargo test -p hennery-proto --test codegen --locked delegation_wire_dependencies_are_exported_once` | 101 / 101 | 0 |
| 6 | `cargo test -p hennery-sessions --test delegation --test delegation_d2 --test tool_args --test owner --test store --locked` | 0 / 0 | 202 |
| 6 | `cargo test -p hennery-testkit --test owner_filter --locked` | 0 / 0 | 3 |
| 6 | `cargo test -p hennery-proto --test codegen --locked` | 0 / 0 | 10 |
| 6 | `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 / 0 | 0 |
| 7 | `cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --locked` | 101 / 101 | 0 |
| 8 | `cargo test -p hennery-testkit --test delegation_mcp --test delegation_tools --test owner_filter --locked` | 0 / 0 | 30 |

The replay uses a new named worktree at the pinned base. Its Cargo target is a private APFS clone of a quiescent target, never a shared target; every staged source state is applied from this document and compared with its recorded tree. The harness rejects zero extracted blocks, unexpected exits and a final tree mismatch. Replay 1 was prepared on the old base and never executed. Replay 2 reproduced its first four expected exits, then was deliberately superseded when the deletion audit required more code and tests; it has no final-tree claim. All scratch trees remain for parent cleanup.

Markdown whitespace cleanup removed only the leading space on blank diff context lines. Fresh **deleg-d2-replay-4** then applied all eight final encoded patches with git apply --index and matched every recorded intermediate tree plus the final ef8ccc40 tree (head **07565ae8**). This encoding-only validation reran no test command; its eight byte-identical code states are the states tested by replay 3 above.

### Final checks

Every command below ran inside the flake shell with scratch HOME/XDG/tool configuration and exited **0**. The full run includes the final runtime, deletion cleanup, separate start counters, historical migration fixtures and owner audit. Two subsequent test-only amendments strengthen close-boundary assertions and attribute live discovery to the actual child; their final targeted run passed **100 tests** (73 store, 19 MCP and 8 HTTP), with formatting and targeted Clippy also exit 0. These test-only amendments are included in the final exact replay; the full six-check run is not relabelled as a second run after them.

| Command | Observed result |
|---|---|
| `cargo fmt --all --check` | 0 |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 |
| `cargo test --workspace --locked` | 0; **2,298 passed** |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 |
| `pnpm --dir web install --frozen-lockfile` | 0 |
| `pnpm --dir web typecheck` | 0 |
| `pnpm --dir web test` | 0; **1,784 passed**, 100 files |
| `pnpm --dir web build` | 0 |

Evidence is retained under `.superpowers/sdd/deleg-d2/checks-acceptance/`, including per-command logs and `results.json`. Final test amendments are recorded in `/tmp/deleg-d2-final-test-amendments.log`. The broad targeted run before those amendments passed **233 tests**, including all 104 existing store cases, five owner cases, the shared-cut audit and owner_filter.

### Failures found and corrected

| Observed RED or failed check | Correction |
|---|---|
| Missing queue, configuration and typed argument APIs; host protocol/catalog behavior; seven HTTP tools | Implemented the corresponding task after its tests; fresh replay reproduces the test/feature transitions |
| Serde internally tagged unit states accepted unknown fields | Strict receipt-state deserialization and independent per-state tests/probes |
| Status with an operation key incorrectly entered mutation idempotency lookup | Reads bypass the mutation-key preflight |
| Cold pre-start discovery refused an explicit model before child allocation | Attach without the brief; validate only that child's complete current configuration evidence before release |
| An unanswered host probe outlasted the tool deadline | Bound tool execution and reclaim its request permit; accepted durable work remains retryable |
| Generated TypeScript referenced missing evidence/catalog/fence declarations | Export every D2 dependency, with an independent per-type regression and 14 caught copy mutations |
| Existing commit-after-cut audit found two direct cut sites | Both use the existing shared commit_then_cut helper; no audit was weakened. A cut-only mutation fails the old-token-watch assertion after automatic resume |
| Version 1/6/9 rollback fixtures tried to drop columns still referenced by D2 triggers | Undo migration 18 in test-only fixture setup before the original historical reconstruction; all original assertions remain |
| The schema-walking deletion test found new cross-session references, then proved queue rows survived deletion | Walk and populate every new reference; delete queues/caller receipts/counters and scrub surviving target receipts to opaque failed/gone deduplication tombstones |
| Scrubbing deleted-target operation metadata reset the derived starts count; a 33rd start and four concurrent starts were accepted | Separate transactional start counters survive child deletion, preserve the operator-prompt epoch and disappear with the caller |
| A proof-mode mutation survived because the safety allowlist independently rejected the mismatch | Permit both safe modes in that fixture, then independently remove the requested-mode comparison: behavioral failure; restored baseline passes |
| Initial live discovery traces could be satisfied by the fake parent | New child-attribution assertion observed RED; record authenticated caller session and require both initialize/list to belong to the actual pinned child |

Initial partial workspace runs stopped at generated output, shared-cut or migration-fixture failures and are not green evidence. Their logs remain separate from the final acceptance logs. No type, test assertion, audit or lint rule was weakened to obtain a passing check.

### Copy probes and load

**218 named mutation cases executed: 217 caught, one equivalent survivor confirmed by independent review.** Each caught case produced an assertion/test failure and exit 101; compiler failures are not counted. Mutations ran only in copies and were restored before normal verification. Historical source patterns changed where deletion now removes an entire queue row rather than clearing its payload/config fields; the new cleanup matrix covers the stronger final behavior. The original masked mode survivor is preserved in its historical manifest and independently caught after the fixture correction.

The one remaining survivor removes the UPSERT clause `WHERE delegation_start_budgets.owner_id = ?1`. The INSERT still binds owner_id and its conflict target is `(owner_id,caller_id,epoch)`; removing that redundant clause did not change the updated row. The production clause remains. The cleanup probe driver correctly exited **1** for **32 caught / 1 survivor**, followed by a passing restored baseline. Codex gpt-6-astra subsequently confirmed this mutation **EQUIVALENT** on the maintainer’s behalf: the composite conflict key already fixes the owner. The production predicate remains. The historical probe exit and counts are preserved.

| Matrix | Caught / executed |
|---|---|
| Strict tool/parser and receipt states | 34 / 34 |
| Host catalog/configuration/close fences | 26 / 26 |
| Scoped store, receipts, answer, ownership, queue and cut fences | 96 / 96 after the mode-fixture correction |
| HTTP tools, deadline, cold fallback, pagination and operator auth | 15 / 15 |
| TypeScript wire exports | 14 / 14 |
| Final deletion, receipt scrubbing and start counters | 32 / 33; redundant predicate above |

Each load suite ran **four simultaneous copies × three rounds**, all 12 exits 0:

| Suite | Tests per copy | Total passed |
|---|---:|---:|
| Strict tool arguments | 7 | 84 |
| Host actors and wire fences | 15 | 180 |
| Store, including four-worker queue/answer/start-limit races | 73 | 876 |
| HTTP tools, busy/resume and actual worker pagination/wrap | 8 | 96 |

The live adapter case remains explicitly ignored during normal/load runs and is run separately below. Complete named mutations follow this record. The normalized manifest is `.superpowers/sdd/deleg-d2/probe-manifest.json`; per-case logs and restored baselines remain in the named host/tools/store/integration ledgers and copy directories.

### Actual pinned adapters

On the final root implementation, ran `cargo test -p hennery-testkit --test delegation_tools --locked pinned_adapter_discovers_seven_tools_and_attaches_one_child_without_inference -- --ignored --exact --nocapture` twice inside the flake shell, with HENNERY_D2_RUNTIME set to claude/codex and HENNERY_D2_PINNED_ADAPTER_ROOT pointing at the existing pinned scratch installation. The test installs nothing, uses scratch adapter homes, clears SSL_CERT_* and sends no provider prompt.

| Adapter | Exit / tests | Actual child discovery | Delivery and limits |
|---|---|---|---|
| Claude | 0 / 1 passed, 2.13 s | Child-authenticated initialize 200 and tools/list 200 with **7 tools** | Isolated delivery, claude_strict |
| Codex | 0 / 1 passed, 1.14 s | Child-authenticated initialize 200 and tools/list 200 with **7 tools** | Existing **default-hat unisolated fallback**, isolation **None**; no 8h isolation claim |

Both obtained a fresh actual worker catalog, accepted a spawn and attached that child. Each trace's caller_session exactly equals that child_id. Each child has no open turn/outcome/report and **brief_dispatched=false**. These are local startup/discovery checks, not provider inference, credentials or D4 live-matrix acceptance. Final root evidence is `/tmp/deleg-d2-root-live-{claude,codex}.log`; earlier unattributed traces are superseded, not counted as actual-adapter proof.

### Original independent review scope

Review **256691fe..ef8ccc40** and this execution record: current owner/hat/host and accepted-revision fences; current live-host handoff; catalog/profile/policy and complete generation-bound configuration evidence; close intent and genuine park; ordinary-answer/operator contention; nullable gone receipts, deletion scrubbing and durable starts counters; InputOrigin::Parent and push/budget suppression; migrations and owner_filter. The subsequent review confirmed the redundant UPSERT mutation equivalent and requested the two amendments recorded above. D3 reverse durable delivery/attention and D4 UI/provider acceptance remain outside this change.

PR creation, all checks, reviewDecision, mergeStateStatus, unresolved threads (including bots), Linux/macOS CI and merge are parent-owned. No GitHub action was performed by this lane. Retain named replay/probe worktrees and scratch copies for parent cleanup; the ledger lists them.

### Named mutation results

| Area | Mutation | Observed result |
|---|---|---|
| Host | cwd-root | 101, assertion detected |
| Host | cwd-canonical | 101, assertion detected |
| Host | unknown-profile | 101, assertion detected |
| Host | claude-policy | 101, assertion detected |
| Host | codex-policy | 101, assertion detected |
| Host | probe-bound | 101, assertion detected |
| Host | actor-root-fence | 101, assertion detected |
| Host | evidence-generation | 101, assertion detected |
| Host | evidence-completeness | 101, assertion detected |
| Host | evidence-actual | 101, assertion detected |
| Host | prompt-generation | 101, assertion detected |
| Host | prompt-revision | 101, assertion detected |
| Host | prompt-pending-switch | 101, assertion detected |
| Host | prompt-pending-question | 101, assertion detected |
| Host | readback-revision | 101, assertion detected |
| Host | notification-revision | 101, assertion detected |
| Host | probe-no-mcp | 101, assertion detected |
| Host | probe-termination | 101, assertion detected |
| Host | attach-generation-conflict | 101, assertion detected |
| Host | catalog-capability | 101, assertion detected |
| Host | fence-capability | 101, assertion detected |
| Host | prompt-close-intent | 101, assertion detected |
| Host | unknown-config-outcome | 101, assertion detected |
| Host | partial-config-outcome | 101, assertion detected |
| Host | fresh-catalog-outcome | 101, assertion detected |
| Host | unknown-catalog-outcome | 101, assertion detected |
| Strict tools | object-only | 101, assertion detected |
| Strict tools | unknown-fields | 101, assertion detected |
| Strict tools | strict-config | 101, assertion detected |
| Strict tools | opaque-ids | 101, assertion detected |
| Strict tools | utf8-byte-limit | 101, assertion detected |
| Strict tools | nul-rejection | 101, assertion detected |
| Strict tools | list-limit | 101, assertion detected |
| Strict tools | accept-object | 101, assertion detected |
| Strict tools | tool-name-binding | 101, assertion detected |
| Strict tools | digest-content-binding | 101, assertion detected |
| Strict tools | unknown-tool-outcome | 101, assertion detected |
| Strict tools | receipt-extra-fields | 101, assertion detected |
| Strict tools | bound-nonempty | 101, assertion detected |
| Strict tools | bound-cwd | 101, assertion detected |
| Strict tools | bound-text | 101, assertion detected |
| Strict tools | bound-config-ids | 101, assertion detected |
| Strict tools | bound-axes-count | 101, assertion detected |
| Strict tools | bound-opaque-length | 101, assertion detected |
| Strict tools | bound-list-upper | 101, assertion detected |
| Strict tools | bound-name | 101, assertion detected |
| Strict tools | bound-agent | 101, assertion detected |
| Strict tools | bound-answer-content | 101, assertion detected |
| Strict tools | strict-discovery-config | 101, assertion detected |
| Strict tools | duplicate-wire-keys | 101, assertion detected |
| Strict tools | state-Accepted | 101, assertion detected |
| Strict tools | state-WaitingConfig | 101, assertion detected |
| Strict tools | state-Queued | 101, assertion detected |
| Strict tools | state-AwaitingReconciliation | 101, assertion detected |
| Strict tools | state-Delivered | 101, assertion detected |
| Strict tools | state-Completed | 101, assertion detected |
| Strict tools | state-NotDelivered | 101, assertion detected |
| Strict tools | state-Cancelled | 101, assertion detected |
| Strict tools | state-Failed | 101, assertion detected |
| Strict tools | invalid-arguments-outcome | 101, assertion detected |
| Store | receipt-accepted | 101, assertion detected |
| Store | receipt-waiting_config | 101, assertion detected |
| Store | receipt-queued | 101, assertion detected |
| Store | receipt-awaiting_reconciliation | 101, assertion detected |
| Store | receipt-delivered | 101, assertion detected |
| Store | receipt-completed | 101, assertion detected |
| Store | receipt-not_delivered | 101, assertion detected |
| Store | receipt-cancelled | 101, assertion detected |
| Store | receipt-failure-code | 101, assertion detected |
| Store | receipt-failure-default | 101, assertion detected |
| Store | receipt-unknown-fallback | 101, assertion detected |
| Store | receipt-code-bound | 101, assertion detected |
| Store | receipt-code-redaction | 101, assertion detected |
| Store | error-not_found | 101, assertion detected |
| Store | error-operation_conflict | 101, assertion detected |
| Store | error-operator_required | 101, assertion detected |
| Store | error-queue_full | 101, assertion detected |
| Store | error-child_limit | 101, assertion detected |
| Store | error-start_budget | 101, assertion detected |
| Store | error-generation_limit | 101, assertion detected |
| Store | error-session_starting | 101, assertion detected |
| Store | error-runtime_unavailable | 101, assertion detected |
| Store | error-configuration_unavailable | 101, assertion detected |
| Store | error-session_tools_unavailable | 101, assertion detected |
| Store | error-catalog_unavailable | 101, assertion detected |
| Store | error-catalog_stale | 101, assertion detected |
| Store | error-catalog_busy | 101, assertion detected |
| Store | error-host_offline | 101, assertion detected |
| Store | error-invalid_cwd | 101, assertion detected |
| Store | error-not_open | 101, assertion detected |
| Store | error-already_answered | 101, assertion detected |
| Store | error-invalid_cursor | 101, assertion detected |
| Store | error-fallback | 101, assertion detected |
| Store | error-invalid_arguments | 101, assertion detected |
| Store | receipt-digest | 101, assertion detected |
| Store | caller-receipt-scope | 101, assertion detected |
| Store | owned-direct-parent | 101, assertion detected |
| Store | queue-count | 101, assertion detected |
| Store | queue-bytes | 101, assertion detected |
| Store | message-bound | 101, assertion detected |
| Store | children-bound | 101, assertion detected |
| Store | starts-bound | 101, assertion detected |
| Store | permanent-child-depth | 101, assertion detected |
| Store | operator-budget-epoch | 101, assertion detected |
| Store | foreign-owner-targets | 101, assertion detected |
| Store | foreign-owner-depth | 101, assertion detected |
| Store | status-child-operations | 101, assertion detected |
| Store | cursor-scope | 101, assertion detected |
| Store | cursor-bound | 101, assertion detected |
| Store | permission-boundary | 101, assertion detected |
| Store | historical-close | 101, assertion detected |
| Store | proof-generation | 101, assertion detected |
| Store | proof-revision | 101, assertion detected |
| Store | proof-complete | 101, assertion detected |
| Store | proof-model | 101, assertion detected |
| Store | proof-mode | 101, assertion detected |
| Store | proof-axis | 101, assertion detected |
| Store | proof-policy | 101, assertion detected |
| Store | unknown-profile-default | 101, assertion detected |
| Store | ingest-generation | 101, assertion detected |
| Store | ingest-monotonic-revision | 101, assertion detected |
| Store | initial-resume-generation | 101, assertion detected |
| Store | resume-clear-proof | 101, assertion detected |
| Store | config-invalidation | 101, assertion detected |
| Store | delegation_endpoint_end-operation | 101, assertion detected |
| Store | delegation_endpoint_end-queue | 101, assertion detected |
| Store | delegation_endpoint_end-payload | 101, assertion detected |
| Store | delegation_family_end-operation | 101, assertion detected |
| Store | delegation_family_end-queue | 101, assertion detected |
| Store | delegation_family_end-payload | 101, assertion detected |
| Store | delegation_grant_end-operation | 101, assertion detected |
| Store | delegation_grant_end-queue | 101, assertion detected |
| Store | delegation_grant_end-payload | 101, assertion detected |
| Store | endpoint-clear-proof | 101, assertion detected |
| Store | unhanded-answer-endpoint | 101, assertion detected |
| Store | unhanded-answer-grant | 101, assertion detected |
| Store | parent-turn-provenance | 101, assertion detected |
| Store | blocked-push-epoch | 101, assertion detected |
| Store | outside-push-epoch | 101, assertion detected |
| Store | settle-started | 101, assertion detected |
| Store | settle-ended | 101, assertion detected |
| Store | settle-not-delivered | 101, assertion detected |
| Store | settle-answer-delivered | 101, assertion detected |
| Store | settle-close | 101, assertion detected |
| Store | deleted-handoff-payload | 101, assertion detected |
| Store | deleted-required-config | 101, assertion detected |
| Store | deleted-proof-row | 101, assertion detected |
| Store | close-cas-intent | 101, assertion detected |
| Store | close-cas-lifecycle | 101, assertion detected |
| Store | close-cas-presence | 101, assertion detected |
| Store | close-cas-positive | 101, assertion detected |
| Store | target-page-owner | 101, assertion detected |
| Store | target-page-after | 101, assertion detected |
| Store | target-page-state | 101, assertion detected |
| Store | target-page-limit | 101, assertion detected |
| Store | typed-resume-cut-mutant | 101, assertion detected |
| HTTP | status-key-preflight | 101, assertion detected |
| HTTP | known-model-check | 101, assertion detected |
| HTTP | configuration-release | 101, assertion detected |
| HTTP | permission-denial | 101, assertion detected |
| HTTP | permission-schema | 101, assertion detected |
| HTTP | owned-direct-child | 101, assertion detected |
| HTTP | list-direct-parent | 101, assertion detected |
| HTTP | cursor-parent-binding | 101, assertion detected |
| HTTP | one-generation | 101, assertion detected |
| HTTP | cold-model-fallback | 101, assertion detected |
| HTTP | tool-deadline | 101, assertion detected |
| HTTP | worker-cursor-advance | 101, assertion detected |
| HTTP | worker-cursor-reset | 101, assertion detected |
| HTTP | policy-operator-wrapper | 101, assertion detected |
| HTTP | policy-step-up | 101, assertion detected |
| TypeScript exports | ExecutionPolicy | 101, assertion detected |
| TypeScript exports | SetExecutionPolicy | 101, assertion detected |
| TypeScript exports | DelegationLimits | 101, assertion detected |
| TypeScript exports | CapabilitiesResult | 101, assertion detected |
| TypeScript exports | ChildQuestion | 101, assertion detected |
| TypeScript exports | ChildSummary | 101, assertion detected |
| TypeScript exports | ChildList | 101, assertion detected |
| TypeScript exports | ChildStatus | 101, assertion detected |
| TypeScript exports | PromptFence | 101, assertion detected |
| TypeScript exports | ConfigCompleteness | 101, assertion detected |
| TypeScript exports | ConfigEvidence | 101, assertion detected |
| TypeScript exports | CatalogFreshness | 101, assertion detected |
| TypeScript exports | SecurityClassification | 101, assertion detected |
| TypeScript exports | HostCatalog | 101, assertion detected |
| Deletion | delete-child-nullable | 101, assertion detected |
| Deletion | delete-queue-source | 101, assertion detected |
| Deletion | delete-queue-target | 101, assertion detected |
| Deletion | delete-queue-all-states | 101, assertion detected |
| Deletion | delete-queue-only-deleted | 101, assertion detected |
| Deletion | delete-caller-receipts | 101, assertion detected |
| Deletion | delete-caller-only-deleted | 101, assertion detected |
| Deletion | delete-scrub-child | 101, assertion detected |
| Deletion | delete-scrub-tool | 101, assertion detected |
| Deletion | delete-scrub-state | 101, assertion detected |
| Deletion | delete-scrub-code | 101, assertion detected |
| Deletion | delete-scrub-turn | 101, assertion detected |
| Deletion | delete-scrub-pending | 101, assertion detected |
| Deletion | delete-scrub-request | 101, assertion detected |
| Deletion | delete-scrub-accepted-revision | 101, assertion detected |
| Deletion | delete-scrub-epoch | 101, assertion detected |
| Deletion | delete-scrub-validated-attach | 101, assertion detected |
| Deletion | delete-scrub-validated-config | 101, assertion detected |
| Deletion | delete-scrub-validated-policy | 101, assertion detected |
| Deletion | delete-scrub-only-deleted | 101, assertion detected |
| Deletion | delete-budget-cleanup | 101, assertion detected |
| Deletion | delete-budget-only-deleted | 101, assertion detected |
| Deletion | delete-attach-evidence | 101, assertion detected |
| Deletion | delete-optional-receipt | 101, assertion detected |
| Deletion | delete-gone-retry-positive | 101, assertion detected |
| Deletion | delete-gone-code-guard | 101, assertion detected |
| Deletion | delete-gone-state-guard | 101, assertion detected |
| Deletion | delete-budget-initial-count | 101, assertion detected |
| Deletion | delete-budget-increment | 101, assertion detected |
| Deletion | delete-budget-read | 101, assertion detected |
| Deletion | delete-budget-limit | 101, assertion detected |
| Deletion | delete-budget-read-owner | 101, assertion detected |
| Deletion | delete-budget-increment-owner | 0, survived; **EQUIVALENT**, confirmed by Codex gpt-6-astra on the maintainer’s behalf; predicate retained |



Generated with Claude AI — please review before distribution.
