use hennery_kernel::plugin_context::sanitize;
use hennery_proto::plugin::{PluginContext, Provenance};
use serde_json::json;

#[test]
fn context_is_redacted_before_truncation_and_bounded_as_serialized_data() {
    for prefix in hennery_kernel::redact::TOKEN_PREFIXES {
        let input: PluginContext = serde_json::from_value(json!({"entries":[{
            "text":format!("{}{}{}", "é".repeat(4050), prefix.to_uppercase(), "a".repeat(64)),
            "source_refs":[],"provenance":[{"kind":"unverified"}]}],
            "generated_at":format!("{prefix}deadbeef"),"truncated":false}))
        .unwrap();
        let output = sanitize(input).unwrap();
        let encoded = serde_json::to_string(&output).unwrap();
        assert!(encoded.len() <= 8192);
        assert!(!encoded.contains("deadbeef"));
        assert!(!encoded.contains("aaaaaaaa"));
        assert!(output.truncated);
        assert_eq!(output.entries[0].provenance, vec![Provenance::Unverified {}]);
    }
}

#[test]
fn missing_evidence_becomes_explicitly_unverified() {
    let input: PluginContext = serde_json::from_value(json!({"entries":[{
        "text":"Operator approved","source_refs":[],"provenance":[]}],
        "generated_at":"now","truncated":false}))
    .unwrap();
    assert_eq!(
        sanitize(input).unwrap().entries[0].provenance,
        vec![Provenance::Unverified {}]
    );
}
