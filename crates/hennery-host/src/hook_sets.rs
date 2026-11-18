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
    /// The adapter lacks `_codex/hooks/list` or `_codex/hooks/trust`.
    NoExtension,
    /// The adapter listed none of the hooks it was given.
    NotListed,
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
            Self::NotListed => f.write_str("the adapter listed none of the hooks it was given"),
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
            config.insert(
                "hooks".into(),
                serde_json::to_value(&merged).expect("hook config serialises"),
            );
            Ok(Rendered {
                claude_meta_hooks: None,
                codex_config: Some(Value::Object(config).to_string()),
                applied,
            })
        }
    }
}

/// Trust the hooks a Codex adapter was started with (skills spec §8):
/// `_codex/hooks/list` for `cwd`, then `_codex/hooks/trust` with the
/// `{key, currentHash}` of every hook it lists from the session's flags.
/// Codex skips an untrusted hook silently, so anything but `trusted: true`
/// is an error.
pub async fn trust_codex(conn: &ConnectionTo<Agent>, cwd: &Path) -> Result<(), HookSetsError> {
    let listed = call(conn, "_codex/hooks/list", json!({ "cwd": cwd })).await?;
    let hooks: Vec<Value> = listed
        .get("hooks")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|hook| hook.get("source").and_then(Value::as_str) == Some("sessionFlags"))
        .filter_map(|hook| {
            let key = hook.get("key")?.as_str()?;
            let hash = hook.get("currentHash")?.as_str()?;
            Some(json!({ "key": key, "currentHash": hash }))
        })
        .collect();
    if hooks.is_empty() {
        return Err(HookSetsError::NotListed);
    }
    let answer = call(conn, "_codex/hooks/trust", json!({ "cwd": cwd, "hooks": hooks })).await?;
    match answer.get("trusted").and_then(Value::as_bool) {
        Some(true) => Ok(()),
        _ => Err(HookSetsError::NotTrusted),
    }
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

        let rendered = render(Profile::Codex, &delivery(), Some(r#"{"model":"x","hooks":{}}"#)).unwrap();
        let config: Value = serde_json::from_str(&rendered.codex_config.unwrap()).unwrap();
        assert_eq!(config, json!({"model": "x", "hooks": {"PreToolUse": pre}}));

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
    fn a_generic_agent_cannot_run_hook_sets() {
        assert_eq!(
            render(Profile::Generic, &delivery(), None),
            Err(HookSetsError::Unsupported)
        );
        assert!(applied(Profile::Generic, &delivery()).is_empty());
    }
}
