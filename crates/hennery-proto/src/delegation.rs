//! D1 policy and family metadata. Delegated inputs and plug-in context use
//! `plugin::{InputOrigin, Provenance, PluginContext}`; no parallel types.
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct HatSessionTools {
    pub delegation_enabled: bool,
    #[ts(type = "number")]
    pub revision: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct SetSessionTools {
    pub delegation_enabled: bool,
}

// Derived struct decoding can accept positional JSON arrays. Authorization
// requests require the schema's object shape, with one exact, nonduplicate key.
impl<'de> Deserialize<'de> for SetSessionTools {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct Policy;
        impl<'de> serde::de::Visitor<'de> for Policy {
            type Value = SetSessionTools;
            fn expecting(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str("a session-tools policy object")
            }
            fn visit_map<A: serde::de::MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let mut enabled = None;
                while let Some(key) = map.next_key::<String>()? {
                    if key != "delegation_enabled" {
                        return Err(serde::de::Error::unknown_field(&key, &["delegation_enabled"]));
                    }
                    if enabled.is_some() {
                        return Err(serde::de::Error::duplicate_field("delegation_enabled"));
                    }
                    enabled = Some(map.next_value::<bool>()?);
                }
                Ok(SetSessionTools {
                    delegation_enabled: enabled.ok_or_else(|| serde::de::Error::missing_field("delegation_enabled"))?,
                })
            }
        }
        deserializer.deserialize_map(Policy)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct SessionFamily {
    pub child_id: String,
    pub parent_id: String,
    pub root_id: String,
    pub hat_id: String,
    #[ts(type = "number")]
    pub created_event_id: i64,
    pub detached: bool,
    pub reason: Option<String>,
}
