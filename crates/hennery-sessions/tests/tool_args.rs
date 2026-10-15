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
