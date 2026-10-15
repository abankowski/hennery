use hennery_proto::delegation::SetSessionTools;
#[test]
fn policy_authorization_is_a_single_strict_object() {
    for bad in [
        "[true]",
        "[]",
        "true",
        r#"{"Delegation_enabled":true}"#,
        r#"{"delegation_enabled":true,"delegation_enabled":false}"#,
        r#"{"delegation_enabled":true,"\u0064elegation_enabled":false}"#,
        r#"{"delegation_enabled":true,"owner_id":"spoof"}"#,
    ] {
        assert!(serde_json::from_str::<SetSessionTools>(bad).is_err(), "{bad}");
    }
    assert!(
        serde_json::from_str::<SetSessionTools>(r#"{ "\u0064elegation_enabled" : true }"#)
            .unwrap()
            .delegation_enabled
    );
}

#[path = "../../hennery-gateway/tests/support/differential.rs"]
mod differential;
#[test]
fn policy_bytes_have_the_same_authorization_meaning_under_each_decoder() {
    use differential::{DECODERS, Node};
    for (raw, enabled) in [
        (r#"{"delegation_enabled":true}"#, true),
        ("\r\n{ \"\\u0064elegation_enabled\" : false }\t", false),
    ] {
        let strict: SetSessionTools = serde_json::from_slice(raw.as_bytes()).unwrap();
        assert_eq!(strict.delegation_enabled, enabled);
        let tree: Node = serde_json::from_slice(raw.as_bytes()).unwrap();
        let exact: serde_json::Value = serde_json::from_slice(raw.as_bytes()).unwrap();
        assert_eq!(exact["delegation_enabled"], enabled);
        for decoder in DECODERS {
            assert!(
                matches!(decoder.get(&tree, "delegation_enabled"), Some(Node::Bool)),
                "{decoder:?}: {raw}"
            );
        }
    }
    for raw in [
        r#"{"delegation_enabled":true,"Delegation_enabled":false}"#,
        r#"{"delegation_enabled":false,"delegation_enabled":true}"#,
        r#"{"delegation_enabled":true,"\u0064elegation_enabled":false}"#,
        "\u{feff}{\"delegation_enabled\":true}",
    ] {
        assert!(
            serde_json::from_slice::<SetSessionTools>(raw.as_bytes()).is_err(),
            "{raw}"
        );
    }
    assert!(serde_json::from_slice::<SetSessionTools>(&[0xff]).is_err());
}
