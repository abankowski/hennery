//! A session's delivered hook sets (skills spec §8): rendered per agent
//! before its adapter is spawned, and, for Codex, trusted through the
//! adapter after `initialize`. Delivery is fail-closed: a set the host
//! cannot apply fails the start, never runs unloaded.

use crate::profile::Profile;
use agent_client_protocol::v1::ConnectionTo;
use agent_client_protocol::{Agent, ErrorCode, UntypedMessage};
use hennery_proto::frames::{HookDelivery, HookSetApplied};
use hennery_proto::hooks::{CODEX_EVENTS, HookSetConfig, merge};
use serde_json::{Map, Value, json};
use std::path::Path;

/// What a delivery becomes for one profile.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Rendered {
    /// Claude: `_meta.claudeCode.options.settings.hooks`.
    pub claude_meta_hooks: Option<HookSetConfig>,
    /// Codex: the adapter's `CODEX_CONFIG`, as JSON. When set, the adapter's
    /// hooks must be trusted after `initialize`.
    pub codex_config: Option<String>,
    /// Codex: the `hooks` inside `codex_config` (the operator's own first,
    /// then hennery's), which the adapter's listing must match.
    pub codex_hooks: Option<HookSetConfig>,
    /// The sets that reach the agent, in delivery order.
    pub applied: Vec<HookSetApplied>,
}

/// Why a delivery cannot be applied; the `Display` text is the
/// `start_failed` message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HookSetsError {
    /// The profile has no way to run hooks.
    Unsupported,
    /// The agent's own `CODEX_CONFIG` is not a JSON object.
    CodexConfigNotObject,
    /// The `hooks` in the agent's own `CODEX_CONFIG` are not a hook config.
    CodexHooksInvalid(String),
    /// The adapter lacks `_codex/hooks/list` or `_codex/hooks/trust`.
    NoExtension,
    /// The adapter's session-flag hooks are not the ones it was given (an
    /// agent command that sets its own `CODEX_CONFIG`, say): handler
    /// positions `<event>:<group>:<handler>`, sorted.
    Mismatch { expected: Vec<String>, listed: Vec<String> },
    /// The adapter's trust call did not answer `trusted: true`.
    NotTrusted,
    /// Any other failure of the adapter's hook calls.
    Adapter(String),
}

impl std::fmt::Display for HookSetsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unsupported => f.write_str("this agent cannot run hook sets"),
            Self::CodexConfigNotObject => f.write_str("the agent's CODEX_CONFIG is not a JSON object"),
            Self::NoExtension => f.write_str("the adapter does not offer _codex/hooks/list and _codex/hooks/trust"),
            Self::CodexHooksInvalid(why) => write!(f, "the hooks in the agent's CODEX_CONFIG are invalid: {why}"),
            Self::Mismatch { expected, listed } => write!(
                f,
                "the adapter lists other hooks than it was given: expected [{}], listed [{}]",
                expected.join(", "),
                listed.join(", ")
            ),
            Self::NotTrusted => f.write_str("the adapter did not trust the hooks it was given"),
            Self::Adapter(message) => write!(f, "the adapter's hook call failed: {message}"),
        }
    }
}

impl std::error::Error for HookSetsError {}

/// The sets of `delivery` that reach a `profile` agent: every set for
/// Claude, every set with at least one event Codex runs for Codex, none
/// otherwise. In delivery order.
pub fn applied(profile: Profile, delivery: &HookDelivery) -> Vec<HookSetApplied> {
    delivery
        .sets
        .iter()
        .filter(|set| match profile {
            Profile::Claude | Profile::ClaudeOwnCli => true,
            Profile::Codex => !hennery_proto::hooks::render(&set.hooks, CODEX_EVENTS).0.is_empty(),
            Profile::Generic => false,
        })
        .map(|set| HookSetApplied {
            id: set.id.clone(),
            name: set.name.clone(),
            content_hash: set.content_hash.clone(),
        })
        .collect()
}

/// Render `delivery` for a `profile` agent: the sets merged event by event
/// in delivery order, for Codex with only the events it runs and inside
/// `existing_codex_config` (the agent's own `CODEX_CONFIG`) when it has one.
/// Hooks already in that config come first, hennery's groups after them,
/// and the trust call after `initialize` trusts both: that value comes from
/// the operator's own agent command (`host.toml`), not from a third party.
pub fn render(
    profile: Profile,
    delivery: &HookDelivery,
    existing_codex_config: Option<&str>,
) -> Result<Rendered, HookSetsError> {
    let applied = applied(profile, delivery);
    match profile {
        Profile::Generic => Err(HookSetsError::Unsupported),
        Profile::Claude | Profile::ClaudeOwnCli => {
            let merged = merge(delivery.sets.iter().map(|set| &set.hooks));
            Ok(Rendered {
                claude_meta_hooks: (!merged.0.is_empty()).then_some(merged),
                codex_config: None,
                codex_hooks: None,
                applied,
            })
        }
        Profile::Codex => {
            let rendered: Vec<HookSetConfig> = delivery
                .sets
                .iter()
                .map(|set| hennery_proto::hooks::render(&set.hooks, CODEX_EVENTS))
                .collect();
            let merged = merge(&rendered);
            if merged.0.is_empty() {
                return Ok(Rendered {
                    applied,
                    ..Default::default()
                });
            }
            let mut config = match existing_codex_config {
                None => Map::new(),
                Some(raw) => match serde_json::from_str::<Value>(raw) {
                    Ok(Value::Object(config)) => config,
                    _ => return Err(HookSetsError::CodexConfigNotObject),
                },
            };
            let operator = match config.remove("hooks") {
                None => HookSetConfig::default(),
                Some(hooks) => serde_json::from_value::<HookSetConfig>(hooks)
                    .map_err(|err| HookSetsError::CodexHooksInvalid(err.to_string()))?,
            };
            let hooks = merge([&operator, &merged]);
            config.insert(
                "hooks".into(),
                serde_json::to_value(&hooks).expect("hook config serialises"),
            );
            Ok(Rendered {
                claude_meta_hooks: None,
                codex_config: Some(Value::Object(config).to_string()),
                codex_hooks: Some(hooks),
                applied,
            })
        }
    }
}

/// Trust the hooks a Codex adapter was started with (skills spec §8):
/// `_codex/hooks/list` for `cwd`, then `_codex/hooks/trust` with the
/// `{key, currentHash}` of every hook it lists from the session's flags.
/// The listing must name exactly the handler positions of `sent` (the
/// `hooks` of the `CODEX_CONFIG` hennery passed): an agent command that
/// sets its own `CODEX_CONFIG` replaces hennery's, and those hooks must not
/// be trusted in its place. Codex skips an untrusted hook silently, so
/// anything but `trusted: true` is an error.
pub async fn trust_codex(conn: &ConnectionTo<Agent>, cwd: &Path, sent: &HookSetConfig) -> Result<(), HookSetsError> {
    let listed = call(conn, "_codex/hooks/list", json!({ "cwd": cwd })).await?;
    let entries: Vec<(&str, &str)> = listed
        .get("hooks")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|hook| hook.get("source").and_then(Value::as_str) == Some("sessionFlags"))
        .filter_map(|hook| Some((hook.get("key")?.as_str()?, hook.get("currentHash")?.as_str()?)))
        .collect();
    let expected = positions(sent);
    let mut listed: Vec<String> = entries.iter().map(|(key, _)| position_of(key)).collect();
    listed.sort();
    if listed != expected {
        return Err(HookSetsError::Mismatch { expected, listed });
    }
    let hooks: Vec<Value> = entries
        .iter()
        .map(|(key, hash)| json!({ "key": key, "currentHash": hash }))
        .collect();
    let answer = call(conn, "_codex/hooks/trust", json!({ "cwd": cwd, "hooks": hooks })).await?;
    match answer.get("trusted").and_then(Value::as_bool) {
        Some(true) => Ok(()),
        _ => Err(HookSetsError::NotTrusted),
    }
}

/// Every handler position Codex lists for `hooks`, sorted: the
/// `<event>:<group>:<handler>` that ends its key, the event in snake case
/// (`PreToolUse` is `pre_tool_use`). Events Codex does not run are not
/// listed.
fn positions(hooks: &HookSetConfig) -> Vec<String> {
    let mut positions: Vec<String> = hennery_proto::hooks::render(hooks, CODEX_EVENTS)
        .0
        .iter()
        .flat_map(|(event, groups)| {
            let event = snake_case(event);
            groups.iter().enumerate().flat_map(move |(group, matcher)| {
                let event = event.clone();
                (0..matcher.hooks.len()).map(move |handler| format!("{event}:{group}:{handler}"))
            })
        })
        .collect();
    positions.sort();
    positions
}

/// The `<event>:<group>:<handler>` that ends a listed key
/// (`/<session-flags>/config.toml:pre_tool_use:0:0`); the whole key when
/// it has no such ending.
fn position_of(key: &str) -> String {
    let parts: Vec<&str> = key.rsplitn(4, ':').collect();
    match parts.as_slice() {
        [handler, group, event, _] => format!("{event}:{group}:{handler}"),
        _ => key.to_string(),
    }
}

fn snake_case(event: &str) -> String {
    let mut out = String::with_capacity(event.len() + 4);
    for (i, c) in event.chars().enumerate() {
        if c.is_ascii_uppercase() {
            if i > 0 {
                out.push('_');
            }
            out.push(c.to_ascii_lowercase());
        } else {
            out.push(c);
        }
    }
    out
}

async fn call(conn: &ConnectionTo<Agent>, method: &str, params: Value) -> Result<Value, HookSetsError> {
    let request = UntypedMessage::new(method, params).expect("JSON value is serializable");
    conn.send_request(request)
        .block_task()
        .await
        .map_err(|err| match err.code {
            ErrorCode::METHOD_NOT_FOUND => HookSetsError::NoExtension,
            _ => HookSetsError::Adapter(err.to_string()),
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use hennery_proto::frames::HookSetDelivery;

    fn set(id: &str, hooks: Value) -> HookSetDelivery {
        HookSetDelivery {
            id: id.into(),
            name: format!("{id}-name"),
            content_hash: format!("sha256:{id}"),
            hooks: serde_json::from_value(hooks).unwrap(),
        }
    }

    fn delivery() -> HookDelivery {
        HookDelivery {
            sets: vec![
                set(
                    "a",
                    json!({"PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "/bin/a"}]}],
                           "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "/bin/a2"}]}]}),
                ),
                set(
                    "b",
                    json!({"UserPromptSubmit": [{"hooks": [{"type": "command", "command": "/bin/b"}]}]}),
                ),
                set(
                    "c",
                    json!({"PreToolUse": [{"hooks": [{"type": "command", "command": "/bin/c", "timeout": 5}]}]}),
                ),
            ],
        }
    }

    fn ids(applied: &[HookSetApplied]) -> Vec<&str> {
        applied.iter().map(|a| a.id.as_str()).collect()
    }

    #[test]
    fn claude_takes_every_set_merged_in_delivery_order() {
        for profile in [Profile::Claude, Profile::ClaudeOwnCli] {
            let rendered = render(profile, &delivery(), Some("ignored")).unwrap();
            assert_eq!(ids(&rendered.applied), ["a", "b", "c"]);
            assert_eq!(rendered.codex_config, None);
            assert_eq!(
                serde_json::to_value(rendered.claude_meta_hooks.unwrap()).unwrap(),
                json!({
                    "PreToolUse": [
                        {"matcher": "Bash", "hooks": [{"type": "command", "command": "/bin/a"}]},
                        {"hooks": [{"type": "command", "command": "/bin/c", "timeout": 5}]}
                    ],
                    "UserPromptSubmit": [
                        {"hooks": [{"type": "command", "command": "/bin/a2"}]},
                        {"hooks": [{"type": "command", "command": "/bin/b"}]}
                    ]
                })
            );
        }
    }

    #[test]
    fn codex_takes_only_the_events_it_runs_inside_its_own_config() {
        let rendered = render(Profile::Codex, &delivery(), None).unwrap();
        assert_eq!(ids(&rendered.applied), ["a", "c"]);
        assert_eq!(rendered.claude_meta_hooks, None);
        let pre = json!([
            {"matcher": "Bash", "hooks": [{"type": "command", "command": "/bin/a"}]},
            {"hooks": [{"type": "command", "command": "/bin/c", "timeout": 5}]}
        ]);
        let config: Value = serde_json::from_str(&rendered.codex_config.unwrap()).unwrap();
        assert_eq!(config, json!({"hooks": {"PreToolUse": pre}}));

        let operator = json!({"type": "command", "command": "/bin/operator"});
        let rendered = render(
            Profile::Codex,
            &delivery(),
            Some(&json!({"model": "x", "hooks": {"PreToolUse": [{"hooks": [operator]}]}}).to_string()),
        )
        .unwrap();
        let config: Value = serde_json::from_str(&rendered.codex_config.unwrap()).unwrap();
        let mut merged = vec![json!({"hooks": [operator]})];
        merged.extend(pre.as_array().unwrap().iter().cloned());
        assert_eq!(config, json!({"model": "x", "hooks": {"PreToolUse": merged}}));
        assert_eq!(
            serde_json::to_value(rendered.codex_hooks.unwrap()).unwrap(),
            config["hooks"]
        );
        assert!(matches!(
            render(Profile::Codex, &delivery(), Some(r#"{"hooks":{"PreToolUse":"nope"}}"#)),
            Err(HookSetsError::CodexHooksInvalid(_))
        ));

        for bad in ["[]", "\"x\"", "not json", "null"] {
            assert_eq!(
                render(Profile::Codex, &delivery(), Some(bad)),
                Err(HookSetsError::CodexConfigNotObject),
                "{bad}"
            );
        }
    }

    #[test]
    fn codex_with_nothing_it_runs_gets_no_config_and_no_trust() {
        let only_prompts = HookDelivery {
            sets: vec![delivery().sets.remove(1)],
        };
        let rendered = render(Profile::Codex, &only_prompts, Some("[]")).unwrap();
        assert_eq!(rendered, Rendered::default());
    }

    #[test]
    fn codex_lists_handlers_by_snake_case_event_group_and_handler() {
        let hooks: HookSetConfig = serde_json::from_value(json!({
            "PreToolUse": [
                {"hooks": [{"type": "command", "command": "/bin/a"}, {"type": "command", "command": "/bin/b"}]},
                {"hooks": [{"type": "command", "command": "/bin/c"}]}
            ],
            "SessionStart": [{"hooks": [{"type": "command", "command": "/bin/d"}]}],
            "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "/bin/e"}]}]
        }))
        .unwrap();
        assert_eq!(
            positions(&hooks),
            [
                "pre_tool_use:0:0",
                "pre_tool_use:0:1",
                "pre_tool_use:1:0",
                "session_start:0:0"
            ]
        );
        assert_eq!(
            position_of("/<session-flags>/config.toml:pre_tool_use:0:1"),
            "pre_tool_use:0:1"
        );
        assert_eq!(position_of("odd"), "odd");
    }

    #[test]
    fn a_generic_agent_cannot_run_hook_sets() {
        assert_eq!(
            render(Profile::Generic, &delivery(), None),
            Err(HookSetsError::Unsupported)
        );
        assert!(applied(Profile::Generic, &delivery()).is_empty());
    }
}
