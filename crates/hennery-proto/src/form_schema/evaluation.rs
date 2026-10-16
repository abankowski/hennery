//! Deliberately bounded form vocabulary, not a general JSON Schema compiler.
//! Every recursive evaluation and potentially long comparison spends work.
use super::{MAX_VALIDATION_WORK, Refused, check, check_instance};
use serde_json::Value;
use std::cmp::Ordering;

/// Unsupported constraints are refused before any evaluation, never ignored.
pub fn validate(schema: &Value, value: &Value) -> Result<bool, Refused> {
    check_instance(check(schema)?, value)?;
    Evaluator {
        remaining: MAX_VALIDATION_WORK,
    }
    .matches(schema, schema, value)
}

struct Evaluator {
    remaining: usize,
}
impl Evaluator {
    fn spend(&mut self, work: usize) -> Result<(), Refused> {
        self.remaining = self
            .remaining
            .checked_sub(work)
            .ok_or(Refused("evaluation work budget exceeded"))?;
        Ok(())
    }
    fn equal(&mut self, a: &Value, b: &Value) -> Result<bool, Refused> {
        self.spend(1)?;
        Ok(match (a, b) {
            (Value::Number(a), Value::Number(b)) => number_cmp(a, b) == Ordering::Equal,
            (Value::String(a), Value::String(b)) => {
                self.spend(a.len().max(b.len()))?;
                a == b
            }
            (Value::Array(a), Value::Array(b)) => {
                if a.len() != b.len() {
                    return Ok(false);
                }
                for (a, b) in a.iter().zip(b) {
                    if !self.equal(a, b)? {
                        return Ok(false);
                    }
                }
                true
            }
            (Value::Object(a), Value::Object(b)) => {
                if a.len() != b.len() {
                    return Ok(false);
                }
                for (key, a) in a {
                    self.spend(key.len())?;
                    let Some(b) = b.get(key) else { return Ok(false) };
                    if !self.equal(a, b)? {
                        return Ok(false);
                    }
                }
                true
            }
            _ => a == b,
        })
    }
    fn matches(&mut self, root: &Value, schema: &Value, value: &Value) -> Result<bool, Refused> {
        self.spend(1)?;
        if let Some(allowed) = schema.as_bool() {
            return Ok(allowed);
        }
        // check() has validated every branch and local reference, with no cycles.
        let fields = schema.as_object().ok_or(Refused("invalid bounded schema"))?;
        for (keyword, constraint) in fields {
            self.spend(keyword.len() + 1)?;
            let valid = match keyword.as_str() {
                "$ref" => self.matches(
                    root,
                    root.pointer(&constraint.as_str().ok_or(Refused("invalid reference"))?[1..])
                        .ok_or(Refused("missing reference"))?,
                    value,
                )?,
                "type" => match constraint.as_array() {
                    Some(types) => types.iter().any(|t| is_type(t.as_str().unwrap_or_default(), value)),
                    None => is_type(constraint.as_str().unwrap_or_default(), value),
                },
                "const" => self.equal(value, constraint)?,
                "enum" => {
                    let mut found = false;
                    for candidate in constraint.as_array().ok_or(Refused("invalid enum"))? {
                        if self.equal(candidate, value)? {
                            found = true;
                            break;
                        }
                    }
                    found
                }
                "allOf" | "anyOf" | "oneOf" => {
                    let mut count = 0;
                    let branches = constraint.as_array().ok_or(Refused("invalid combinator"))?;
                    for branch in branches {
                        if self.matches(root, branch, value)? {
                            count += 1;
                        }
                    }
                    match keyword.as_str() {
                        "allOf" => count == branches.len(),
                        "anyOf" => count > 0,
                        _ => count == 1,
                    }
                }
                "not" => !self.matches(root, constraint, value)?,
                "required" => {
                    if let Some(object) = value.as_object() {
                        let mut present = true;
                        for key in constraint.as_array().ok_or(Refused("invalid required"))? {
                            let key = key.as_str().ok_or(Refused("invalid required"))?;
                            self.spend(key.len() + 1)?;
                            present &= object.contains_key(key);
                        }
                        present
                    } else {
                        true
                    }
                }
                "properties" => {
                    if let Some(object) = value.as_object() {
                        for (key, property) in constraint.as_object().ok_or(Refused("invalid properties"))? {
                            self.spend(key.len() + 1)?;
                            if let Some(value) = object.get(key)
                                && !self.matches(root, property, value)?
                            {
                                return Ok(false);
                            }
                        }
                    }
                    true
                }
                "additionalProperties" => {
                    if let Some(object) = value.as_object() {
                        for (key, value) in object {
                            self.spend(key.len() + 1)?;
                            if !fields
                                .get("properties")
                                .and_then(Value::as_object)
                                .is_some_and(|p| p.contains_key(key))
                                && !self.matches(root, constraint, value)?
                            {
                                return Ok(false);
                            }
                        }
                    }
                    true
                }
                "items" => {
                    if let Some(array) = value.as_array() {
                        for item in array {
                            if !self.matches(root, constraint, item)? {
                                return Ok(false);
                            }
                        }
                    }
                    true
                }
                "uniqueItems" => {
                    if constraint.as_bool() == Some(true)
                        && let Some(array) = value.as_array()
                    {
                        for (i, a) in array.iter().enumerate() {
                            for b in &array[i + 1..] {
                                if self.equal(a, b)? {
                                    return Ok(false);
                                }
                            }
                        }
                    }
                    true
                }
                "minLength" | "maxLength" => {
                    if let Some(text) = value.as_str() {
                        self.spend(text.len())?;
                        count_matches(keyword, text.chars().count(), constraint)
                    } else {
                        true
                    }
                }
                "minItems" | "maxItems" => value
                    .as_array()
                    .is_none_or(|a| count_matches(keyword, a.len(), constraint)),
                "minProperties" | "maxProperties" => value
                    .as_object()
                    .is_none_or(|o| count_matches(keyword, o.len(), constraint)),
                "minimum" | "maximum" | "exclusiveMinimum" | "exclusiveMaximum" => {
                    if let Some(number) = value.as_number() {
                        let order = number_cmp(
                            number,
                            constraint.as_number().ok_or(Refused("invalid numeric constraint"))?,
                        );
                        match keyword.as_str() {
                            "minimum" => order != Ordering::Less,
                            "maximum" => order != Ordering::Greater,
                            "exclusiveMinimum" => order == Ordering::Greater,
                            _ => order == Ordering::Less,
                        }
                    } else {
                        true
                    }
                }
                // Only these annotations/dialect declarations can reach here.
                "$defs" | "definitions" | "$schema" | "title" | "description" | "$comment" | "default" | "examples"
                | "_meta" | "readOnly" | "writeOnly" | "deprecated" => true,
                _ => return Err(Refused("unsupported schema keyword")),
            };
            if !valid {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
fn count_matches(keyword: &str, count: usize, constraint: &Value) -> bool {
    let limit = constraint.as_u64().unwrap_or_default();
    if keyword.starts_with("min") {
        count as u64 >= limit
    } else {
        count as u64 <= limit
    }
}
fn is_type(kind: &str, value: &Value) -> bool {
    match kind {
        "object" => value.is_object(),
        "array" => value.is_array(),
        "string" => value.is_string(),
        "boolean" => value.is_boolean(),
        "null" => value.is_null(),
        "number" => value.is_number(),
        "integer" => value.as_number().is_some_and(|n| Decimal::new(n).exponent >= 0),
        _ => false,
    }
}

// Compare JSON decimal representations without rounding u64/i64 through f64.
// serde_json bounds each Number's representation; no arbitrary precision input.
struct Decimal {
    negative: bool,
    digits: Vec<u8>,
    exponent: i32,
}
impl Decimal {
    fn new(number: &serde_json::Number) -> Self {
        let raw = number.to_string();
        let negative = raw.starts_with('-');
        let raw = raw.trim_start_matches('-');
        let (mantissa, exponent) = raw
            .split_once(['e', 'E'])
            .map_or((raw, 0), |(m, e)| (m, e.parse::<i32>().unwrap_or(0)));
        let fraction = mantissa.split_once('.').map_or(0, |(_, f)| f.len() as i32);
        let mut digits: Vec<u8> = mantissa
            .bytes()
            .filter(|b| *b != b'.')
            .skip_while(|b| *b == b'0')
            .collect();
        let mut exponent = exponent - fraction;
        while digits.last() == Some(&b'0') {
            digits.pop();
            exponent += 1;
        }
        if digits.is_empty() {
            return Self {
                negative: false,
                digits: vec![b'0'],
                exponent: 0,
            };
        }
        Self {
            negative,
            digits,
            exponent,
        }
    }
}
fn number_cmp(a: &serde_json::Number, b: &serde_json::Number) -> Ordering {
    let a = Decimal::new(a);
    let b = Decimal::new(b);
    let zero = |v: &Decimal| v.digits == *b"0";
    if zero(&a) && zero(&b) {
        return Ordering::Equal;
    }
    if a.negative != b.negative {
        return if a.negative { Ordering::Less } else { Ordering::Greater };
    }
    let order = if zero(&a) {
        Ordering::Less
    } else if zero(&b) {
        Ordering::Greater
    } else {
        (a.digits.len() as i32 + a.exponent)
            .cmp(&(b.digits.len() as i32 + b.exponent))
            .then_with(|| {
                for i in 0..a.digits.len().max(b.digits.len()) {
                    let order = a.digits.get(i).unwrap_or(&b'0').cmp(b.digits.get(i).unwrap_or(&b'0'));
                    if order != Ordering::Equal {
                        return order;
                    }
                }
                Ordering::Equal
            })
    };
    if a.negative { order.reverse() } else { order }
}
