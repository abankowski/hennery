//! Parent answers use the child's original JSON Schema, not the UI's lossy
//! presentation. No external references or submitted values appear in errors.
use hennery_proto::{frames::ElicitationAction, rest::AnswerRequest};
use serde_json::Value;

pub(crate) const SCHEMA_BYTES: usize = 4096;

#[derive(Debug)]
pub(crate) struct InvalidContent(pub String);
impl std::fmt::Display for InvalidContent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for InvalidContent {}

pub(crate) fn advertised(payload: &Value) -> Option<Value> {
    payload
        .get("requestedSchema")
        .filter(|schema| schema.to_string().len() <= SCHEMA_BYTES)
        .cloned()
}

pub(crate) fn validate(payload: &Value, answer: &AnswerRequest) -> anyhow::Result<()> {
    let AnswerRequest::Elicitation {
        action: ElicitationAction::Accept,
        content,
    } = answer
    else {
        return Ok(());
    };
    let schema = payload.get("requestedSchema");
    let valid = schema
        .filter(|s| s.to_string().len() <= 64 * 1024)
        .and_then(|schema| {
            jsonschema::options()
                .offline()
                .should_validate_formats(true)
                .build(schema)
                .ok()
        })
        .is_some_and(|validator| {
            content
                .as_ref()
                .is_some_and(|value| value.is_object() && validator.is_valid(value))
        });
    if !valid {
        let contract = advertised(payload)
            .map(|s| s.to_string())
            .unwrap_or_else(|| "the child's requestedSchema (unavailable or too large; ask the operator)".into());
        return Err(InvalidContent(format!("content must be a JSON object matching: {contract}. Correct the content and retry; if the schema is unsupported, decline/cancel or ask the operator. No answer was queued.")).into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn answer(content: Value) -> AnswerRequest {
        AnswerRequest::Elicitation {
            action: ElicitationAction::Accept,
            content: Some(content),
        }
    }
    #[test]
    fn validates_original_constraints_including_refs_enums_and_arrays() {
        let payload = json!({"requestedSchema":{"type":"object","$defs":{"choice":{"type":"string","oneOf":[{"const":"blue"},{"const":"green"}]}},"properties":{"color":{"$ref":"#/$defs/choice"},"note":{"type":"string","minLength":2},"count":{"type":"integer","minimum":1,"maximum":3},"tags":{"type":"array","uniqueItems":true,"items":{"type":"string"},"maxItems":2}},"required":["color"],"additionalProperties":false}});
        assert!(
            validate(
                &payload,
                &answer(json!({"color":"blue","note":"ok","count":2,"tags":["a"]}))
            )
            .is_ok()
        );
        for content in [
            json!({"color":"red"}),
            json!({}),
            json!({"color":"blue","note":"x"}),
            json!({"color":"blue","count":0}),
            json!({"color":"blue","count":1.5}),
            json!({"color":"blue","tags":["a","a"]}),
            json!({"color":"blue","extra":"bad"}),
        ] {
            assert!(validate(&payload, &answer(content)).is_err());
        }
    }
    #[test]
    fn unsupported_missing_and_external_schemas_fail_closed_but_decline_remains_possible() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("valid-schema.json");
        std::fs::write(&file, r#"{"type":"object"}"#).unwrap();
        for payload in [
            json!({}),
            json!({"requestedSchema":{"type":"invented"}}),
            json!({"requestedSchema":{"$ref":format!("file://{}",file.display())}}),
            json!({"requestedSchema":{"$ref":"https://example.invalid/form.json"}}),
        ] {
            assert!(validate(&payload, &answer(json!({}))).is_err());
            assert!(
                validate(
                    &payload,
                    &AnswerRequest::Elicitation {
                        action: ElicitationAction::Decline,
                        content: None
                    }
                )
                .is_ok()
            );
        }
        assert!(advertised(&json!({"requestedSchema":{"description":"x".repeat(SCHEMA_BYTES)}})).is_none());
    }
}
