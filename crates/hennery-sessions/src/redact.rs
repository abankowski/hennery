//! A session token the agent printed (plan 8e decision 11; the maintainer's
//! open question Q2 of plan 8c, default chosen, reversible): what hennery
//! stores of a session's ACP payloads, and what it forwards of them to the
//! timeline and its stream, has every session token in it redacted (ACP
//! core §8: tokens are never in events or SSE). The rest of the payload is
//! kept as the host sent it (§2.3).
//!
//! By shape, not by value: the gateway keeps only a token's hash, so the
//! collector cannot know the plaintext of a session's earlier tokens. Every
//! run that starts with `hnry_session_` (in any case) and goes on with at
//! least 8 hexadecimal digits is replaced whole, whoever's token it is: a
//! token cut short or upper-cased is still most of a secret. What this does
//! not catch: a token split across two updates (streamed chunks), or
//! encoded otherwise (base64, spaced out). Those reach the timeline as the
//! agent sent them; the token stops working at the session's next park.

use anyhow::{Context, Result};
#[cfg(test)]
use hennery_gateway::tokens::SESSION_TOKEN_PREFIX;
use hennery_proto::frames::SessionBody;
#[cfg(test)]
use serde_json::Value;
#[cfg(test)]
const MIN_DIGITS: usize = 8;

#[cfg(test)]
pub use hennery_kernel::redact::REDACTED;
pub use hennery_kernel::redact::{text, value};

pub fn shown(text: &str) -> std::borrow::Cow<'_, str> {
    match self::text(text) {
        Some(redacted) => std::borrow::Cow::Owned(redacted),
        None => std::borrow::Cow::Borrowed(text),
    }
}

/// `body` with its tokens redacted, read back as a body; `None` if it had
/// none, which is the common case and costs one serialisation.
pub fn body(body: &SessionBody) -> Result<Option<SessionBody>> {
    let mut json = serde_json::to_value(body)?;
    if !value(&mut json) {
        return Ok(None);
    }
    // Only strings changed, so the shape is the same; the context names no
    // content.
    serde_json::from_value(json)
        .map(Some)
        .context("a session frame with a token redacted no longer reads")
}

// The gateway's differential harness (lane L16): its decoders read what
// this module stores and forwards.
#[cfg(test)]
#[path = "../../hennery-gateway/tests/support/differential.rs"]
mod differential;

#[cfg(test)]
mod tests {
    use super::differential::{DECODERS, Decoder, Node};
    use super::*;
    use serde_json::json;

    fn token() -> String {
        format!("{SESSION_TOKEN_PREFIX}{}", "0a".repeat(32))
    }

    #[test]
    fn a_token_is_redacted_wherever_it_is_in_a_string() {
        let t = token();
        assert_eq!(text(&t).as_deref(), Some(REDACTED));
        assert_eq!(
            text(&format!("Bearer {t}, again {t}.")).as_deref(),
            Some(format!("Bearer {REDACTED}, again {REDACTED}.").as_str())
        );
        assert_eq!(
            text(&format!("é{t}é")).as_deref(),
            Some(format!("é{REDACTED}é").as_str())
        );
    }

    #[test]
    fn a_token_cut_short_or_upper_cased_is_redacted_too() {
        let t = token();
        assert!(text(&t[..SESSION_TOKEN_PREFIX.len() + 8]).is_some());
        assert!(text(&t.to_uppercase()).is_some());
        assert!(text(&format!("{t}ff")).is_some_and(|r| r == REDACTED), "the whole run");
    }

    #[test]
    fn what_is_not_a_token_is_left_alone() {
        for kept in [
            "",
            "hnry_session_",
            "hnry_session_0a0a0a0",
            "hnry_session_<redacted>",
            "a hnry_client_0a0a0a0a0a0a0a0a",
            "plain text",
        ] {
            assert_eq!(text(kept), None, "{kept}");
        }
    }

    /// A token-shaped run, judged apart from `text`: the prefix in any
    /// case, then 8 or more hexadecimal digits.
    fn has_token(s: &str) -> bool {
        let lower = s.to_ascii_lowercase();
        lower.match_indices(SESSION_TOKEN_PREFIX).any(|(at, prefix)| {
            lower[at + prefix.len()..]
                .bytes()
                .take_while(u8::is_ascii_hexdigit)
                .count()
                >= MIN_DIGITS
        })
    }

    /// Every string and key of `node` as `decoder` hands it on.
    fn strings(decoder: Decoder, node: &Node, out: &mut Vec<String>) {
        match node {
            Node::Str(_) => out.extend(decoder.str(Some(node))),
            Node::Arr(items) => items.iter().for_each(|item| strings(decoder, item, out)),
            Node::Obj(entries) => {
                for (key, value) in entries {
                    out.push(decoder.key(key));
                    out.push(key.clone());
                    strings(decoder, value, out);
                }
            }
            Node::Null | Node::Bool | Node::Num(_) => {}
        }
    }

    /// Lane L16: a payload as a host may send it, read as serde reads a
    /// frame, redacted, and written back as hennery stores and forwards
    /// it; then read by each of the six decoders, which find no
    /// token-shaped run in any string or key. A token in a key repeated
    /// (the first or the last copy), spelled with escapes, upper-cased, or
    /// in a key a decoder folds, is redacted or gone.
    #[test]
    fn no_decoder_reads_a_token_in_what_is_stored() {
        let t = token();
        let upper = t.to_uppercase();
        let escaped = t.replace('_', "\\u005f");
        let vectors = [
            format!(r#"{{"text":"{t}"}}"#),
            format!(r#"{{"text":"{t}","text":"clean"}}"#),
            format!(r#"{{"text":"clean","text":"{t}"}}"#),
            format!(r#"{{"text":"{escaped}"}}"#),
            format!(r#"{{"Text":"{upper}","text":"clean"}}"#),
            format!(r#"{{"{t}":1,"{t}":2}}"#),
            format!(r#"{{"te\u0000xt":"{t}"}}"#),
            format!(r#"{{"\u017fession":"{t}","session":"x"}}"#),
            format!(r#"[{{"a":["x","{t}"]}},"{t} and {t}"]"#),
        ];
        for raw in vectors {
            let mut payload: Value = serde_json::from_str(&raw).unwrap();
            value(&mut payload);
            let stored = serde_json::to_vec(&payload).unwrap();
            assert!(!has_token(&String::from_utf8_lossy(&stored)), "{raw}");
            let node: Node = serde_json::from_slice(&stored).unwrap();
            for &decoder in DECODERS {
                let mut seen = Vec::new();
                strings(decoder, &node, &mut seen);
                assert!(!seen.iter().any(|s| has_token(s)), "{decoder:?} reads a token in {raw}");
            }
        }
    }

    #[test]
    fn every_string_of_a_value_is_redacted_keys_too() {
        let t = token();
        let mut v = json!({"a": [t, {"b": format!("x{t}")}], t.clone(): 1, "n": 2});
        assert!(value(&mut v));
        assert!(!v.to_string().contains(&t), "{v}");
        assert_eq!(v["n"], 2);
        let mut clean = json!({"a": ["b"], "c": 1});
        assert!(!value(&mut clean));
    }
}
