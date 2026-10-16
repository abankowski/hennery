//! Resource contract for untrusted elicitation forms, shared by host and collector.
use serde_json::Value;
mod evaluation;
mod formats;
pub use evaluation::validate;

pub const MAX_DEPTH: usize = 24;
pub const MAX_EXPANDED_NODES: usize = 512;
pub const MAX_FAN_OUT: usize = 8;
pub const MAX_SCHEMA_BYTES: usize = 16 * 1024;
pub const MAX_INSTANCE_NODES: usize = 256;
pub const MAX_VALIDATION_WORK: usize = 131_072;
pub const MAX_ENUM_LABEL_BYTES: usize = 256;

#[derive(Debug, Clone, Copy)]
pub struct Bound {
    pub expanded_nodes: usize,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Refused(pub &'static str);
impl std::fmt::Display for Refused {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "elicitation schema refused: {}", self.0)
    }
}
impl std::error::Error for Refused {}

fn measure(
    value: &Value,
    depth: usize,
    nodes: &mut usize,
    bytes: &mut usize,
    max_nodes: usize,
    max_bytes: usize,
) -> Result<(), Refused> {
    if depth > MAX_DEPTH {
        return Err(Refused("maximum depth exceeded"));
    }
    *nodes += 1;
    if *nodes > max_nodes {
        return Err(Refused("node budget exceeded"));
    }
    *bytes = bytes.saturating_add(2);
    match value {
        Value::Object(map) => {
            for (key, value) in map {
                *bytes = bytes.saturating_add(key.len() + 3);
                measure(value, depth + 1, nodes, bytes, max_nodes, max_bytes)?;
            }
        }
        Value::Array(values) => {
            for value in values {
                measure(value, depth + 1, nodes, bytes, max_nodes, max_bytes)?;
            }
        }
        Value::String(text) => *bytes = bytes.saturating_add(text.len()),
        _ => *bytes = bytes.saturating_add(32),
    }
    if *bytes > max_bytes {
        return Err(Refused("byte budget exceeded"));
    }
    Ok(())
}

pub fn check(schema: &Value) -> Result<Bound, Refused> {
    measure(schema, 0, &mut 0, &mut 0, MAX_EXPANDED_NODES, MAX_SCHEMA_BYTES)?;
    if serde_json::to_vec(schema).map_or(true, |bytes| bytes.len() > MAX_SCHEMA_BYTES) {
        return Err(Refused("byte budget exceeded"));
    }
    let mut remaining = MAX_EXPANDED_NODES;
    visit(schema, schema, 0, &mut remaining, &mut Vec::new())?;
    Ok(Bound {
        expanded_nodes: MAX_EXPANDED_NODES - remaining,
    })
}

fn visit<'a>(
    root: &'a Value,
    schema: &'a Value,
    depth: usize,
    remaining: &mut usize,
    refs: &mut Vec<&'a str>,
) -> Result<(), Refused> {
    if depth > MAX_DEPTH {
        return Err(Refused("expanded depth exceeded"));
    }
    *remaining = remaining
        .checked_sub(1)
        .ok_or(Refused("reference expansion budget exceeded"))?;
    if schema.is_boolean() {
        return Ok(());
    }
    let object = schema
        .as_object()
        .ok_or(Refused("schema must be an object or boolean"))?;
    for (key, value) in object {
        let recursive = matches!(
            key.as_str(),
            "$ref"
                | "$defs"
                | "definitions"
                | "properties"
                | "allOf"
                | "anyOf"
                | "oneOf"
                | "items"
                | "additionalProperties"
                | "not"
        );
        if matches!(
            key.as_str(),
            "$ref" | "$defs" | "definitions" | "properties" | "allOf" | "anyOf" | "oneOf"
        ) {
            *remaining = remaining
                .checked_sub(1)
                .ok_or(Refused("reference expansion budget exceeded"))?;
        }
        match key.as_str() {
            "$ref" => {
                let reference = value
                    .as_str()
                    .filter(|s| s.starts_with("#/$defs/") || s.starts_with("#/definitions/"))
                    .ok_or(Refused("only bounded local definition references are supported"))?;
                if refs.contains(&reference) {
                    return Err(Refused("cyclic references are unsupported"));
                }
                let target = root
                    .pointer(&reference[1..])
                    .ok_or(Refused("local reference is missing"))?;
                refs.push(reference);
                visit(root, target, depth + 1, remaining, refs)?;
                refs.pop();
            }
            "$defs" | "definitions" | "properties" => {
                let fields = value.as_object().ok_or(Refused("schema fields must be objects"))?;
                for child in fields.values() {
                    visit(root, child, depth + 1, remaining, refs)?;
                }
            }
            "allOf" | "anyOf" | "oneOf" => {
                let branches = value
                    .as_array()
                    .filter(|values| !values.is_empty() && values.len() <= MAX_FAN_OUT)
                    .ok_or(Refused("combinator fan-out exceeded"))?;
                for child in branches {
                    visit(root, child, depth + 1, remaining, refs)?;
                }
            }
            "items" | "additionalProperties" | "not" => visit(root, value, depth + 1, remaining, refs)?,
            "pattern" | "patternProperties" => return Err(Refused("pattern and patternProperties are unsupported")),
            "format" => {
                if !matches!(value.as_str(), Some("email" | "uri" | "date" | "date-time")) {
                    return Err(Refused("unsupported format; expected email, uri, date or date-time"));
                }
            }
            "$schema" => {
                if !value.as_str().is_some_and(|s| {
                    matches!(
                        s,
                        "https://json-schema.org/draft/2020-12/schema" | "https://json-schema.org/draft/2019-09/schema"
                    )
                }) {
                    return Err(Refused("unsupported schema dialect"));
                }
            }
            "type" => {
                let valid = |v: &Value| {
                    v.as_str().is_some_and(|s| {
                        matches!(
                            s,
                            "object" | "array" | "string" | "number" | "integer" | "boolean" | "null"
                        )
                    })
                };
                if !(valid(value)
                    || value
                        .as_array()
                        .is_some_and(|types| !types.is_empty() && types.len() <= 7 && types.iter().all(valid)))
                {
                    return Err(Refused("unsupported value type"));
                }
            }
            "enum" => {
                if !value
                    .as_array()
                    .is_some_and(|values| !values.is_empty() && values.len() <= 64)
                {
                    return Err(Refused("enum budget exceeded"));
                }
            }
            "enumNames" => {
                if !value.as_array().is_some_and(|labels| {
                    labels.len() <= 64
                        && object
                            .get("enum")
                            .and_then(Value::as_array)
                            .is_some_and(|values| values.len() == labels.len())
                        && labels
                            .iter()
                            .all(|label| label.as_str().is_some_and(|s| s.len() <= MAX_ENUM_LABEL_BYTES))
                }) {
                    return Err(Refused(
                        "enumNames must match enum with at most 64 string labels of at most 256 bytes",
                    ));
                }
            }
            "required" => {
                if !value
                    .as_array()
                    .is_some_and(|values| values.len() <= 64 && values.iter().all(Value::is_string))
                {
                    return Err(Refused("invalid required fields"));
                }
            }
            "minLength" | "maxLength" | "minItems" | "maxItems" | "minProperties" | "maxProperties" => {
                if value.as_u64().is_none() {
                    return Err(Refused("invalid length or count constraint"));
                }
            }
            "minimum" | "maximum" | "exclusiveMinimum" | "exclusiveMaximum" => {
                if !value.is_number() {
                    return Err(Refused("invalid numeric constraint"));
                }
            }
            "multipleOf" => return Err(Refused("multipleOf is unsupported")),
            "uniqueItems" | "readOnly" | "writeOnly" | "deprecated" => {
                if !value.is_boolean() {
                    return Err(Refused("invalid boolean constraint"));
                }
            }
            "title" | "description" | "$comment" => {
                if !value.is_string() {
                    return Err(Refused("invalid schema annotation"));
                }
            }
            "const" | "default" | "examples" | "_meta" => {}
            _ => return Err(Refused("unsupported schema keyword")),
        }
        if !recursive {
            let mut nodes = 0;
            measure(value, 0, &mut nodes, &mut 0, MAX_EXPANDED_NODES, MAX_SCHEMA_BYTES)?;
            *remaining = remaining
                .checked_sub(nodes)
                .ok_or(Refused("reference expansion budget exceeded"))?;
        }
    }
    Ok(())
}

pub fn check_instance(bound: Bound, value: &Value) -> Result<(), Refused> {
    let mut nodes = 0;
    measure(value, 0, &mut nodes, &mut 0, MAX_INSTANCE_NODES, 64 * 1024)?;
    if bound.expanded_nodes.saturating_mul(nodes).saturating_mul(nodes) > MAX_VALIDATION_WORK {
        return Err(Refused("validation work budget exceeded"));
    }
    Ok(())
}

/// Refusal evidence contains the question and reason, never the rejected schema.
pub fn refusal_note(payload: &Value) -> Option<String> {
    let result = match payload.get("requestedSchema") {
        Some(schema) => check(schema),
        None if payload.get("mode").and_then(Value::as_str) == Some("form") => {
            Err(Refused("requestedSchema is missing"))
        }
        None => return None,
    };
    result.err().map(|error| {
        format!(
            "{error}. Question: {}",
            payload
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("Form question")
                .chars()
                .take(200)
                .collect::<String>()
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn exponential_reference_expansion_is_refused_without_expanding_it() {
        let mut defs = serde_json::Map::new();
        defs.insert("s0".into(), json!({"type":"object"}));
        for i in 1..=10 {
            let previous = format!("#/$defs/s{}", i - 1);
            defs.insert(format!("s{i}"), json!({"allOf":[{"$ref":previous},{"$ref":previous}]}));
        }
        assert_eq!(
            check(&json!({"$defs":defs,"$ref":"#/$defs/s10"})).unwrap_err().0,
            "reference expansion budget exceeded"
        );
    }
    #[test]
    fn nesting_combinator_fan_out_regex_and_external_or_cyclic_refs_are_refused() {
        let mut deep = json!({"type":"string"});
        for _ in 0..MAX_DEPTH + 1 {
            deep = json!({"properties":{"next":deep}});
        }
        for schema in [
            deep,
            json!({"allOf":vec![json!({});MAX_FAN_OUT+1]}),
            json!({"type":"string","pattern":"^(a+)+$"}),
            json!({"patternProperties":{".*":{}}}),
            json!({"$ref":"https://example.invalid/form"}),
            json!({"$defs":{"loop":{"$ref":"#/$defs/loop"}},"$ref":"#/$defs/loop"}),
        ] {
            assert!(check(&schema).is_err());
        }
    }
    #[test]
    fn normal_forms_and_bounded_local_refs_are_supported() {
        let schema = json!({"type":"object","$defs":{"choice":{"type":"string","oneOf":[{"const":"blue"},{"const":"green"}]}},"properties":{"question_0":{"$ref":"#/$defs/choice"},"note":{"type":"string","_meta":{"questionId":"question_0"}}},"required":["question_0"],"additionalProperties":false});
        assert!(check(&schema).is_ok());
        assert!(
            check(&json!({"properties":{"pattern":{"type":"string"}}})).is_ok(),
            "a field named pattern is not a regex keyword"
        );
    }
    #[test]
    fn instance_size_depth_and_validation_work_have_independent_bounds() {
        let bound = check(&serde_json::json!({"type":"object","properties":{"ok":{"type":"boolean"}}})).unwrap();
        assert!(check_instance(bound, &json!({"ok":true})).is_ok());
        assert!(check_instance(bound, &json!("x".repeat(64 * 1024 + 1))).is_err());
        assert!(check_instance(bound, &json!(vec![true; MAX_INSTANCE_NODES + 1])).is_err());
        assert!(
            check_instance(
                Bound {
                    expanded_nodes: MAX_EXPANDED_NODES
                },
                &json!(vec![true; 32])
            )
            .is_err()
        );
        let mut deep = json!(null);
        for _ in 0..MAX_DEPTH + 1 {
            deep = json!([deep]);
        }
        assert!(check_instance(bound, &deep).is_err());
    }
    #[test]
    fn bounded_evaluator_preserves_constraints_and_numeric_precision() {
        let valid = |schema: Value, value: Value| validate(&schema, &value).unwrap();
        assert!(valid(
            json!({"minimum":9007199254740993_u64}),
            json!(9007199254740993_u64)
        ));
        assert!(!valid(
            json!({"minimum":9007199254740993_u64}),
            json!(9007199254740992_u64)
        ));
        assert!(valid(json!({"enum":[1]}), json!(1.0)));
        assert!(!valid(json!({"uniqueItems":true}), json!([1, 1.0])));
        assert!(valid(json!({"type":"integer"}), json!(1.0)));
        assert!(!valid(json!({"type":"integer"}), json!(1.1)));
        assert!(valid(json!({"minLength":2,"maxLength":2}), json!("é🙂")));
        assert!(!valid(json!({"maxLength":1}), json!("é🙂")));
        assert!(valid(
            json!({"allOf":[{"minimum":-2},{"exclusiveMaximum":0}]}),
            json!(-1.5)
        ));
        assert!(!valid(json!({"exclusiveMinimum":1.0}), json!(1)));
        assert!(!valid(json!({"oneOf":[true,true]}), json!({})));
        assert!(valid(json!({"anyOf":[false,{"not":{"type":"null"}}]}), json!({})));
        assert!(valid(
            json!({"properties":{"ok":true},"additionalProperties":{"type":"boolean"},"minProperties":2,"maxProperties":2}),
            json!({"ok":0,"other":true})
        ));
        assert!(!valid(
            json!({"properties":{"ok":true},"additionalProperties":{"type":"boolean"}}),
            json!({"other":0})
        ));
        assert!(!valid(json!({"type":["string","null"]}), json!(false)));
        assert!(!valid(
            json!({"items":{"const":"a"},"minItems":1,"maxItems":2}),
            json!(["b"])
        ));
        for schema in [
            json!({"multipleOf":0.1}),
            json!({"format":"hostname"}),
            json!({"$schema":"http://json-schema.org/draft-07/schema#"}),
        ] {
            assert!(validate(&schema, &json!({})).is_err());
        }
    }
    #[test]
    fn evaluation_itself_has_a_work_budget() {
        // Small tree/node counts do not bound repeated long string comparisons.
        let text = "x".repeat(4000);
        let schema = json!({"uniqueItems":true});
        let values = Value::Array((0..16).map(|i| json!(format!("{text}{i}"))).collect());
        assert!(check_instance(check(&schema).unwrap(), &values).is_ok());
        assert_eq!(
            validate(&schema, &values).unwrap_err().0,
            "evaluation work budget exceeded"
        );
    }
}
