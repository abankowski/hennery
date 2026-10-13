//! L16: quoted auth-param text cannot name a discovery URL. Compare raw,
//! quoted and escaped spellings; duplicate first/last readers get neither.
use hennery_gateway::oauth::challenge_metadata;
use hennery_kernel::egress::header::{HeaderMap, HeaderValue, WWW_AUTHENTICATE};
#[test]
fn challenge_parameters_respect_quotes_and_have_one_reading() {
    for (raw, expected) in [
        (
            r#"Bearer resource_metadata="https://as.example/pr""#,
            Some("https://as.example/pr"),
        ),
        (
            r#"Bearer RESOURCE_METADATA=https://as.example/pr"#,
            Some("https://as.example/pr"),
        ),
        (r#"Bearer realm="x resource_metadata=https://evil.example/pr""#, None),
        (
            r#"Bearer realm="x, resource_metadata=https://evil.example/pr", resource_metadata="https://as.example/pr""#,
            Some("https://as.example/pr"),
        ),
        (
            r#"Bearer realm="x \" resource_metadata=https://evil.example/pr", resource_metadata="https://as.example/pr""#,
            Some("https://as.example/pr"),
        ),
        (
            r#"Bearer resource_metadata="https://as.example/a,b""#,
            Some("https://as.example/a,b"),
        ),
        (
            r#"Bearer resource_metadata="https://as.example/pr", resource_metadata="https://evil.example/pr""#,
            None,
        ),
        (
            r#"Bearer resource_metadata="https://evil.example/pr", RESOURCE_METADATA="https://as.example/pr""#,
            None,
        ),
        ("Bearer resource_metadata=\"https://as.exa\tmple/pr\"", None),
        (r#"Bearer resource_metadata="https://as.example/pr"junk"#, None),
    ] {
        let mut headers = HeaderMap::new();
        headers.insert(WWW_AUTHENTICATE, HeaderValue::from_str(raw).unwrap());
        assert_eq!(challenge_metadata(&headers).as_deref(), expected, "{raw}");
    }
    let mut headers = HeaderMap::new();
    headers.append(
        WWW_AUTHENTICATE,
        HeaderValue::from_static("Bearer resource_metadata=https://first.example/pr"),
    );
    headers.append(
        WWW_AUTHENTICATE,
        HeaderValue::from_static("Bearer resource_metadata=https://last.example/pr"),
    );
    assert_eq!(
        challenge_metadata(&headers),
        None,
        "first and last header readers disagree"
    );
}
