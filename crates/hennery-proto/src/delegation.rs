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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct SetSessionTools {
    pub delegation_enabled: bool,
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
