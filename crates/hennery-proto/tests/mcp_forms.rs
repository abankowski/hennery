use hennery_proto::form_schema::{check, refusal_note, validate};
use serde_json::json;

fn format_cases(format: &str, good: &[&str], bad: &[&str]) {
    let schema = json!({"type":"object","properties":{"value":{"type":"string","format":format}},"required":["value"]});
    assert!(refusal_note(&json!({"mode":"form","requestedSchema":schema})).is_none());
    for value in good {
        assert!(validate(&schema, &json!({"value":value})).unwrap(), "{format}: {value}");
    }
    for value in bad {
        assert!(
            !validate(&schema, &json!({"value":value})).unwrap(),
            "{format}: {value}"
        );
    }
    assert!(
        validate(&json!({"format":format}), &json!(42)).unwrap(),
        "formats apply to strings"
    );
}

#[test]
fn email_forms_support_mailboxes_and_reject_malformed_answers() {
    format_cases(
        "email",
        &[
            "person@example.org",
            "a+b@localhost",
            "o'hara@example.org",
            "\"a b@c\"@example.org",
            "\"a\\\"b\"@example.org",
            "a@[IPv6:::1]",
        ],
        &[
            "",
            "a",
            "@example.org",
            "a@",
            "a@@example.org",
            ".a@example.org",
            "a..b@example.org",
            "a.@example.org",
            "a b@example.org",
            "a@-bad.org",
            "a@bad_.org",
            "a@bad..org",
            "a@bad.org\n",
            "ü@example.org",
            "\"unfinished@example.org",
            "a@[IPv6:not-an-address]",
        ],
    );
}

#[test]
fn uri_forms_support_absolute_uris_without_fetching_or_normalizing_them() {
    format_cases(
        "uri",
        &[
            "https://example.org/a%20b?q=x#part",
            "urn:example:animal:ferret:nose",
            "mailto:person@example.org",
            "file:///tmp/form",
            "custom:",
            "x://user:pass@example.org:8080/a?b/c?d",
            "x://[::1]/",
            "x://[v1.a:b]/",
        ],
        &[
            "",
            "/relative",
            "example.org",
            "1bad:thing",
            "https://example.org/has space",
            "x:a%",
            "x:a%2",
            "x:a%zz",
            "x:a#b#c",
            "x://[not-ip]/",
            "x://host:bad/",
            "x://a@b@host/",
            "x://host]/",
            "x:a\\b",
            "x:é",
        ],
    );
}

#[test]
fn date_forms_check_calendar_days_and_leap_years() {
    format_cases(
        "date",
        &["2024-02-29", "2000-02-29", "2026-06-30", "0000-01-01"],
        &[
            "",
            "1900-02-29",
            "2025-02-29",
            "2026-04-31",
            "2026-00-01",
            "2026-13-01",
            "2026-01-00",
            "2026-1-01",
            "2026-01-01Z",
            "2026-01-01\n",
            "２０２６-01-01",
        ],
    );
}

#[test]
fn date_time_forms_check_offsets_fractions_and_shifted_leap_seconds() {
    format_cases(
        "date-time",
        &[
            "2026-10-16T12:34:56Z",
            "2026-10-16t12:34:56.123z",
            "2024-02-29T00:00:00+02:30",
            "2026-01-01T00:00:00-00:00",
            "1998-12-31T23:59:60Z",
            "1998-12-31T15:59:60-08:00",
            "1999-01-01T00:59:60+01:00",
            "1998-06-30T23:59:60Z",
        ],
        &[
            "",
            "2025-02-29T00:00:00Z",
            "2026-10-16 12:34:56Z",
            "2026-10-16T24:00:00Z",
            "2026-10-16T12:60:00Z",
            "2026-10-16T12:34:61Z",
            "2026-10-16T12:34:56",
            "2026-10-16T12:34:56.Z",
            "2026-10-16T12:34:56+24:00",
            "2026-10-16T12:34:56+01:60",
            "2026-10-16T12:34:56+0100",
            "2026-10-16T12:34:56Zextra",
            "2026-10-16T12:34:60Z",
            "1998-12-31T22:59:60Z",
            "1998-12-31T23:59:60+01:00",
        ],
    );
}

#[test]
fn enum_names_are_display_labels_not_answer_values() {
    let schema = json!({"type":"object","properties":{"color":{"type":"string","enum":["r","g"],"enumNames":["Red","Grün"]}},"required":["color"]});
    assert!(refusal_note(&json!({"mode":"form","requestedSchema":schema})).is_none());
    for value in ["r", "g"] {
        assert!(validate(&schema, &json!({"color":value})).unwrap());
    }
    for value in ["Red", "Grün", "bad"] {
        assert!(!validate(&schema, &json!({"color":value})).unwrap());
    }
}

#[test]
fn enum_label_count_length_type_and_enum_alignment_are_bounded() {
    assert!(
        check(&json!({"enum":(0..64).map(|n|format!("v{n}")).collect::<Vec<_>>(),"enumNames":vec!["Choice";64]}))
            .is_ok()
    );
    assert!(check(&json!({"enum":["x"],"enumNames":["é".repeat(128)]})).is_ok());
    for schema in [
        json!({"enum":["r","g"],"enumNames":["Red"]}),
        json!({"enum":["r"],"enumNames":["Red","Green"]}),
        json!({"enumNames":["Red"]}),
        json!({"enum":["r"],"enumNames":[42]}),
        json!({"enum":["r"],"enumNames":"Red"}),
        json!({"enum":["r"],"enumNames":["é".repeat(129)]}),
        json!({"enum":vec!["x";65],"enumNames":vec!["X";65]}),
    ] {
        assert!(check(&schema).is_err(), "{schema}");
    }
}

#[test]
fn other_assertions_and_formats_stay_refused_and_answers_stay_bounded() {
    for format in [
        json!("regex"),
        json!("hostname"),
        json!("iri"),
        json!("EMAIL"),
        json!(null),
        json!(1),
    ] {
        assert!(check(&json!({"format":format})).is_err());
    }
    for schema in [
        json!({"pattern":"a+"}),
        json!({"multipleOf":2}),
        json!({"invented":true}),
    ] {
        assert!(check(&schema).is_err());
    }
    assert!(validate(&json!({"format":"uri"}), &json!(format!("x:{}", "a".repeat(64 * 1024)))).is_err());
    let schema = json!({"allOf":vec![json!({"format":"uri"});8]});
    assert!(
        validate(&schema, &json!(format!("x:{}", "a".repeat(20_000)))).is_err(),
        "format scans consume evaluation work"
    );
}
