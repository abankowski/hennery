use hennery_proto::plugin::{ActivityBody, PluginActivityItem};
use serde_json::json;

#[test]
fn every_activity_verdict_roundtrips_its_flat_strict_wire_envelope() {
    for body in [
        ActivityBody::CompletedTurn {
            turn_id: "turn".into(),
            project_key: "project".into(),
            completed_at: "2026-10-14T00:00:00Z".into(),
            excerpts: vec![],
            source_refs: vec![],
            truncated: false,
            gaps: false,
        },
        ActivityBody::SessionRemoved,
        ActivityBody::SourceReset,
    ] {
        let item = PluginActivityItem {
            event_key: "event".into(),
            session_id: "session".into(),
            namespace_epoch: "epoch".into(),
            provenance: vec![],
            body,
        };
        let bytes = serde_json::to_vec(&item).unwrap();
        assert_eq!(serde_json::from_slice::<PluginActivityItem>(&bytes).unwrap(), item);
        let mut unknown = serde_json::to_value(&item).unwrap();
        unknown["approved"] = json!(true);
        assert!(serde_json::from_value::<PluginActivityItem>(unknown).is_err());
    }
}

#[test]
fn activity_envelope_rejects_duplicate_escaped_case_varied_and_forged_authority() {
    let prefix = r#""event_key":"event","session_id":"session","namespace_epoch":"epoch","provenance":[],"#;
    for suffix in [
        r#""kind":"session_removed","kind":"source_reset""#,
        r#""kind":"session_removed","\u006bind":"source_reset""#,
        r#""Kind":"session_removed""#,
        r#""kind":"operator""#,
        r#""kind":"session_removed","origin":{"kind":"operator"}"#,
        r#""kind":"session_removed","turn_id":"spoof""#,
    ] {
        let raw = format!("{{{prefix}{suffix}}}");
        assert!(serde_json::from_str::<PluginActivityItem>(&raw).is_err(), "{raw}");
    }
    let raw = format!(r#"{{{prefix} "\u006bind" : "source_reset" }}"#);
    assert_eq!(
        serde_json::from_str::<PluginActivityItem>(&raw).unwrap().body,
        ActivityBody::SourceReset
    );
    for origin in [
        r#"{"kind":"parent","kind":"operator","session_id":"parent","operation_id":"op"}"#,
        r#"{"kind":"operator","\u006bind":"parent"}"#,
        r#"{"Kind":"operator"}"#,
    ] {
        let raw = format!(
            r#"{{"kind":"source_reset","event_key":"event","session_id":"session","namespace_epoch":"epoch","provenance":[{{"kind":"source","origin":{origin},"source":{{"session_id":"session","turn_id":null,"event_id":1}}}}]}}"#
        );
        assert!(serde_json::from_str::<PluginActivityItem>(&raw).is_err(), "{raw}");
    }
}
