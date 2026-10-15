use hennery_proto::delegation::{OperationReceipt, OperationState, argument_schemas};
use serde_json::{Value, json};

#[test]
fn discovery_schemas_reject_unknown_config_and_resolve_every_reference() {
    fn refs(value: &Value, root: &Value) {
        match value {
            Value::Object(map) => {
                if let Some(reference) = map.get("$ref").and_then(Value::as_str) {
                    assert!(
                        root.pointer(reference.strip_prefix('#').unwrap()).is_some(),
                        "{reference}"
                    );
                }
                for value in map.values() {
                    refs(value, root);
                }
            }
            Value::Array(items) => {
                for item in items {
                    refs(item, root);
                }
            }
            _ => {}
        }
    }
    for (name, schema) in argument_schemas() {
        assert_eq!(schema["additionalProperties"], false, "{name}");
        refs(&schema, &schema);
        if name == "session_spawn" {
            let reference = schema["properties"]["config"]["$ref"].as_str().unwrap();
            let config = schema.pointer(reference.strip_prefix('#').unwrap()).unwrap();
            assert_eq!(config["type"], "object");
            assert_eq!(config["additionalProperties"], false);
        }
    }
}

#[test]
fn receipt_states_roundtrip_with_delivery_distinct_from_completion() {
    let states = [
        OperationState::Accepted,
        OperationState::WaitingConfig,
        OperationState::Queued,
        OperationState::AwaitingReconciliation,
        OperationState::Delivered,
        OperationState::Completed,
        OperationState::NotDelivered,
        OperationState::Cancelled,
        OperationState::Failed {
            code: "operation_conflict".into(),
        },
    ];
    for state in states {
        let receipt = OperationReceipt {
            operation_id: "operation".into(),
            child_id: Some("child".into()),
            turn_id: None,
            pending_id: None,
            state,
        };
        let json = serde_json::to_value(&receipt).unwrap();
        assert_eq!(
            serde_json::from_value::<OperationReceipt>(json.clone()).unwrap(),
            receipt
        );
        assert!(json["state"]["state"].is_string());
    }
    assert!(serde_json::from_value::<OperationState>(json!({"state":"failed"})).is_err());
    assert!(serde_json::from_value::<OperationState>(json!({"state":"delivered","code":"forged"})).is_err());
    assert_ne!(OperationState::Delivered, OperationState::Completed);
}
