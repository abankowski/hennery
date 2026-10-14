use hennery_kernel::redact::{self, Assembly};

#[test]
fn all_first_party_classes_are_redacted_after_assembly_and_before_truncation() {
    for prefix in redact::TOKEN_PREFIXES {
        let token = format!("{prefix}{}", "aB".repeat(32));
        for split in 0..=token.len() {
            let mut text = Assembly::new(1024);
            text.push(&token[..split]);
            text.push(&token[split..]);
            let output = text.finish(8192);
            assert!(!output.text.contains("aBaB"), "{prefix} split {split}");
            assert!(output.text.contains("<redacted>"));
        }
        for cap in 1..token.len() {
            let mut text = Assembly::new(cap);
            text.push(&token);
            let output = text.finish(8192);
            assert!(output.truncated);
            assert!(!output.text.contains("aB"), "assembly cap {cap}: {}", output.text);
        }
        assert!(redact::text(&token.to_uppercase()).is_some());
        assert!(redact::text(&token[..prefix.len() + 8]).is_some());
        assert!(redact::text(&token[..prefix.len() + 7]).is_none());
    }
    assert!(redact::text("arbitrary-provider-secret").is_none());
    let mut value = serde_json::json!({"hnry_activity_deadbeef": ["hnry_plugin_DEADBEEF", "hnry_lifecycle_deadbeef"]});
    assert!(redact::value(&mut value));
    assert!(!value.to_string().contains("deadbeef"));
    assert!(!value.to_string().contains("DEADBEEF"));
}
