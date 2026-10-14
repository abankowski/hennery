//! Generic plug-in data. Text is reference data; only server-written typed
//! origins identify who supplied an input. C2 owns prompt delivery.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum InputOrigin {
    Operator {},
    Parent {
        session_id: String,
        operation_id: String,
    },
    ChildReport {
        child_id: String,
        source_event_id: String,
        delivery_id: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct SourceRef {
    pub session_id: String,
    pub turn_id: Option<String>,
    #[ts(type = "number")]
    pub event_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Provenance {
    Source { origin: InputOrigin, source: SourceRef },
    Unverified {},
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct ContextEntry {
    pub text: String,
    pub source_refs: Vec<SourceRef>,
    pub provenance: Vec<Provenance>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginContext {
    pub entries: Vec<ContextEntry>,
    pub generated_at: String,
    pub truncated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(rename_all = "snake_case")]
pub enum TextRole {
    User,
    Assistant,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct Excerpt {
    pub role: TextRole,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginActivityItem {
    pub event_key: String,
    pub session_id: String,
    pub namespace_epoch: String,
    /// Empty for a system-generated reset/deletion, never invented Operator.
    pub provenance: Vec<Provenance>,
    #[serde(flatten)]
    pub body: ActivityBody,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ActivityBody {
    CompletedTurn {
        turn_id: String,
        project_key: String,
        completed_at: String,
        excerpts: Vec<Excerpt>,
        source_refs: Vec<SourceRef>,
        truncated: bool,
        gaps: bool,
    },
    SessionRemoved,
    SourceReset,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginActivityPage {
    pub version: u32,
    pub items: Vec<PluginActivityItem>,
    pub next_cursor: String,
    pub has_more: bool,
    #[ts(type = "number")]
    pub lease_until: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginCapabilities {
    pub version: u32,
    pub activity_v1: bool,
    pub forget_v1: bool,
    pub startup_context_v1: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(rename_all = "snake_case")]
pub enum ForgetStatus {
    Confirmed,
    Unconfirmed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct ForgetReceipt {
    pub request_id: String,
    pub status: ForgetStatus,
    pub remaining_kinds: Vec<String>,
}
