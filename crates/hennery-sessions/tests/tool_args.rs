#[path = "../src/tool_args.rs"]
mod tool_args;
use hennery_proto::delegation::*;
use serde_json::{Value, json};
use tool_args::{ToolArgsError, ToolCall, decode_tool, discovery};

fn spawn() -> Value {
    json!({"operation_key":"op.1", "cwd":"/workspace", "brief":"Research 🐔", "config":{"model":"model:any", "axes":{"effort":"high"}}})
}

#[test]
fn all_seven_tools_decode_and_discover_generated_strict_schemas() {
    let cases = [
        ("session_capabilities", json!({})),
        ("session_spawn", spawn()),
        (
            "session_send",
            json!({"operation_key":"s", "child_id":"child", "text":"Continue"}),
        ),
        (
            "session_answer",
            json!({"operation_key":"a", "child_id":"child", "pending_id":"question", "action":"accept", "content":{}}),
        ),
        ("session_status", json!({"child_id":"child"})),
        ("session_list", json!({"limit":100})),
        ("session_close", json!({"operation_key":"c", "child_id":"child"})),
    ];
    let listed = discovery();
    let tools = listed["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 7);
    for (name, args) in cases {
        let call = decode_tool(name, &args).unwrap();
        assert_eq!(call.name(), name);
        assert_eq!(call.canonical_request()["name"], name);
        assert_eq!(call.request_digest().len(), 64);
        assert_eq!(call.operation_key(), args.get("operation_key").and_then(Value::as_str));
        let mut forged = args.clone();
        forged["owner_id"] = json!("spoof");
        assert_eq!(decode_tool(name, &forged).unwrap_err(), ToolArgsError::InvalidArguments);
        let schema = tools.iter().find(|tool| tool["name"] == name).unwrap();
        assert_eq!(schema["inputSchema"]["type"], "object");
        assert_eq!(schema["inputSchema"]["additionalProperties"], false);
        assert!(!schema["description"].as_str().unwrap().is_empty());
    }
    let descriptions = listed.to_string();
    for required in ["operation_conflict", "across tool names", "operator", "substitute"] {
        assert!(descriptions.contains(required), "{required}");
    }
    assert!(decode_tool("Session_spawn", &spawn()).is_err());
    assert_eq!(
        decode_tool("unknown", &json!({})).unwrap_err(),
        ToolArgsError::UnknownTool
    );
}

#[test]
fn every_argument_and_nested_config_requires_exact_object_fields() {
    for value in [json!([]), json!(null), json!(false), json!("bad")] {
        for name in [
            "session_capabilities",
            "session_spawn",
            "session_send",
            "session_answer",
            "session_status",
            "session_list",
            "session_close",
        ] {
            assert!(decode_tool(name, &value).is_err(), "{name}: {value}");
        }
    }
    for field in [
        "owner_id",
        "parent_id",
        "host_id",
        "hat_id",
        "session_id",
        "Operation_key",
        "operation_Key",
    ] {
        let mut args = spawn();
        args[field] = json!("spoof");
        assert!(decode_tool("session_spawn", &args).is_err(), "{field}");
    }
    for config in [
        json!([]),
        json!(["model", "mode", {}]),
        json!({"Model":"forged"}),
        json!({"model":"ok", "owner_id":"spoof"}),
        json!({"axes":[]}),
    ] {
        let mut args = spawn();
        args["config"] = config;
        assert!(decode_tool("session_spawn", &args).is_err(), "{args}");
        assert!(serde_json::from_value::<SpawnArgs>(args).is_err());
    }
    assert!(serde_json::from_str::<CapabilitiesArgs>("[]").is_err());
    assert!(serde_json::from_str::<ListArgs>("[]").is_err());
    assert!(
        serde_json::from_str::<SpawnArgs>(
            r#"{"operation_key":"a","cwd":"/w","brief":"b","config":{"model":"x","model":"y"}}"#
        )
        .is_err()
    );
}

#[test]
fn bounds_count_utf8_bytes_and_opaque_authority_ids_are_restricted() {
    for key in ["", "x y", "x/y", "é", "x\n", &"x".repeat(129)] {
        let mut args = spawn();
        args["operation_key"] = json!(key);
        assert!(decode_tool("session_spawn", &args).is_err(), "{key:?}");
    }
    let mut args = spawn();
    args["brief"] = json!("🐔".repeat(16_384));
    assert!(decode_tool("session_spawn", &args).is_ok());
    args["brief"] = json!("🐔".repeat(16_385));
    assert!(decode_tool("session_spawn", &args).is_err());
    for limit in [0, 101, 65536, -1] {
        assert!(decode_tool("session_list", &json!({"limit":limit})).is_err());
    }
    for child_id in ["", "bad child", "bad/child", "é"] {
        assert!(decode_tool("session_status", &json!({"child_id":child_id})).is_err());
    }
    args = spawn();
    args["cwd"] = json!("/bad\u{0000}path");
    assert!(decode_tool("session_spawn", &args).is_err());
}

#[test]
fn answer_accepts_only_elicitation_actions_and_object_content() {
    for (action, content, allowed) in [
        ("accept", json!({"answer":"yes"}), true),
        ("accept", Value::Null, false),
        ("accept", json!([]), false),
        ("decline", Value::Null, true),
        ("cancel", Value::Null, true),
        ("approve", json!({}), false),
        ("Accept", json!({}), false),
    ] {
        assert_eq!(
            decode_tool(
                "session_answer",
                &json!({"operation_key":"a", "child_id":"c", "pending_id":"p", "action":action, "content":content})
            )
            .is_ok(),
            allowed
        );
    }
    assert!(decode_tool("session_answer", &json!({"operation_key":"a", "child_id":"c", "pending_id":"p", "action":"accept", "content":{}, "option_id":"allow_always"})).is_err());
}

#[test]
fn answer_discovery_requires_object_content_and_explains_the_child_schema() {
    let listed = discovery();
    let answer = listed["tools"]
        .as_array()
        .unwrap()
        .iter()
        .find(|t| t["name"] == "session_answer")
        .unwrap();
    assert_eq!(answer["inputSchema"]["properties"]["content"]["type"], "object");
    assert!(answer["description"].as_str().unwrap().contains("requestedSchema"));
}

#[test]
fn parent_facing_tool_contract_snapshot() {
    let expected: Value = serde_json::from_str(include_str!("fixtures/session_tool_contract.json")).unwrap();
    assert_eq!(
        discovery(),
        expected,
        "review every parent-facing schema change and rerun pinned discovery plus the live matrix"
    );
}

#[test]
fn json_encoded_answer_objects_normalize_before_idempotency_but_ambiguous_json_is_refused() {
    let args = json!({"operation_key":"a","child_id":"c","pending_id":"p","action":"accept","content":{"ok":true}});
    let object = decode_tool("session_answer", &args).unwrap();
    for text in [r#"{"ok":true}"#, r#" {"\u006fk":true} "#] {
        let mut encoded = args.clone();
        encoded["content"] = json!(text);
        let parsed = decode_tool("session_answer", &encoded).unwrap();
        assert_eq!(object.canonical_request(), parsed.canonical_request());
        assert_eq!(object.request_digest(), parsed.request_digest());
    }
    for text in [
        r#"{"ok":false,"ok":true}"#,
        r#"{"ok":false,"\u006fk":true}"#,
        "[]",
        "null",
        "true",
        "broken",
        "\u{feff}{}",
        r#"{"nested":{"k":1,"k":2}}"#,
    ] {
        let mut encoded = args.clone();
        encoded["content"] = json!(text);
        assert!(decode_tool("session_answer", &encoded).is_err(), "{text}");
    }
}

#[test]
fn canonical_request_and_digest_bind_typed_defaults_tool_and_content() {
    let a = decode_tool("session_spawn", &spawn()).unwrap();
    let mut same = spawn();
    same["name"] = Value::Null;
    same["agent"] = Value::Null;
    let b = decode_tool("session_spawn", &same).unwrap();
    assert_eq!(a.canonical_request(), b.canonical_request());
    assert_eq!(a.request_digest(), b.request_digest());
    assert_eq!(a.request_digest().len(), 64);
    assert_eq!(a.operation_key(), Some("op.1"));
    let mut changed = spawn();
    changed["brief"] = json!("Different");
    assert_ne!(
        a.request_digest(),
        decode_tool("session_spawn", &changed).unwrap().request_digest()
    );
    let close = decode_tool("session_close", &json!({"operation_key":"op.1","child_id":"c"})).unwrap();
    assert_ne!(a.request_digest(), close.request_digest());
    assert!(matches!(a, ToolCall::Spawn(_)));
}

#[path = "../../hennery-gateway/tests/support/differential.rs"]
mod differential;
#[test]
fn same_wire_bytes_are_filtered_once_before_typed_dispatch() {
    use differential::{DECODERS, Node};
    for bytes in [
        br#"{"operation_key":"op","cwd":"/w","brief":"go","config":{}}"#.as_slice(),
        b"\r\n{ \"\\u006fperation_key\":\"op\", \"cwd\":\"/w\", \"brief\":\"go\", \"config\":{} }\t",
    ] {
        let tree: Node = serde_json::from_slice(bytes).unwrap();
        for decoder in DECODERS {
            assert!(decoder.get(&tree, "operation_key").is_some());
        }
        let retained = hennery_gateway::decode_json_once(bytes).unwrap();
        assert!(decode_tool("session_spawn", &retained).is_ok());
        assert!(serde_json::from_slice::<SpawnArgs>(bytes).is_ok());
    }
    for bytes in [
        br#"{"operation_key":"op","operation_key":"other","cwd":"/w","brief":"go","config":{}}"#.as_slice(),
        br#"{"operation_key":"op","\u006fperation_key":"other","cwd":"/w","brief":"go","config":{}}"#,
        br#"{"operation_key":"op","Operation_key":"other","cwd":"/w","brief":"go","config":{}}"#,
        br#"{"operation_key":"op","cwd":"/w","brief":"go","config":{"model":"x","model":"y"}}"#,
        b"\xef\xbb\xbf{\"operation_key\":\"op\",\"cwd\":\"/w\",\"brief\":\"go\",\"config\":{}}",
        b"{\x0b\"operation_key\":\"op\",\"cwd\":\"/w\",\"brief\":\"go\",\"config\":{}}",
    ] {
        let strict = hennery_gateway::decode_json_once(bytes).and_then(|tree| decode_tool("session_spawn", &tree).ok());
        assert!(strict.is_none(), "{}", String::from_utf8_lossy(bytes));
        assert!(
            serde_json::from_slice::<SpawnArgs>(bytes).is_err(),
            "{}",
            String::from_utf8_lossy(bytes)
        );
    }
}

#[test]
fn every_text_config_axis_and_pagination_bound_has_an_edge_case() {
    for (field, max) in [("cwd", 4096), ("brief", 65536), ("name", 256), ("agent", 128)] {
        let mut args = spawn();
        args[field] = json!("x".repeat(max));
        assert!(decode_tool("session_spawn", &args).is_ok(), "{field} at limit");
        for bad in [String::new(), "x".repeat(max + 1)] {
            args[field] = json!(bad);
            assert!(decode_tool("session_spawn", &args).is_err(), "{field}: {}", bad.len());
        }
    }
    for field in ["model", "mode"] {
        let mut args = spawn();
        args["config"][field] = json!("x".repeat(512));
        assert!(decode_tool("session_spawn", &args).is_ok());
        args["config"][field] = json!("x".repeat(513));
        assert!(decode_tool("session_spawn", &args).is_err());
    }
    for (count, allowed) in [(64, true), (65, false)] {
        let mut args = spawn();
        args["config"]["axes"] = Value::Object((0..count).map(|i| (format!("axis{i}"), json!(true))).collect());
        assert_eq!(decode_tool("session_spawn", &args).is_ok(), allowed);
    }
    for (key, value) in [
        ("".into(), json!(true)),
        ("x".repeat(513), json!(true)),
        ("x".into(), json!("")),
        ("x".into(), json!("x".repeat(513))),
    ] {
        let mut args = spawn();
        args["config"]["axes"] = json!({ key: value });
        assert!(decode_tool("session_spawn", &args).is_err());
    }
    assert!(decode_tool("session_capabilities", &json!({"agent":"x".repeat(129)})).is_err());
    assert!(decode_tool("session_capabilities", &json!({"cwd":"x".repeat(4097)})).is_err());
    for field in ["operation_key", "child_id", "text"] {
        let mut args = json!({"operation_key":"k", "child_id":"c", "text":"go"});
        args[field] = json!("x".repeat(if field == "text" { 65537 } else { 129 }));
        assert!(decode_tool("session_send", &args).is_err(), "{field}");
    }
    for field in ["pending_id", "child_id", "content"] {
        let mut args = json!({"operation_key":"k", "child_id":"c", "pending_id":"p", "action":"accept", "content":{}});
        args[field] = if field == "content" {
            json!({"value":"x".repeat(65536)})
        } else {
            json!("x".repeat(129))
        };
        assert!(decode_tool("session_answer", &args).is_err(), "{field}");
    }
    assert!(decode_tool("session_list", &json!({"cursor":"x".repeat(129)})).is_err());
    assert!(
        decode_tool(
            "session_status",
            &json!({"child_id":"c", "operation_key":"x".repeat(129)})
        )
        .is_err()
    );
}
