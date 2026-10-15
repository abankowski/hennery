//! Operator configuration and bounded agent-facing delegation status.
use crate::{
    delegation::OperationReceipt,
    delegation_host::HostCatalog,
    frames::{ConfigValue, PendingKind, SessionConfig},
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use ts_rs::TS;

pub type ExecutionAllowlist = BTreeMap<String, BTreeMap<String, Vec<ConfigValue>>>;
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct ExecutionPolicy {
    #[ts(type = "number")]
    pub revision: i64,
    /// Runtime -> profile security option id -> explicitly permitted values.
    pub allowed: ExecutionAllowlist,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct SetExecutionPolicy {
    pub allowed: ExecutionAllowlist,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct DelegationLimits {
    pub children: u16,
    pub starts_per_operator_epoch: u16,
    pub queued_prompts: u16,
    pub queued_bytes: u32,
    pub message_bytes: u32,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct CapabilitiesResult {
    pub runtimes: Vec<String>,
    pub catalogs: Vec<HostCatalog>,
    pub cwd: String,
    pub policy: ExecutionPolicy,
    pub limits: DelegationLimits,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct ChildQuestion {
    pub pending_id: String,
    pub kind: PendingKind,
    pub operator_required: bool,
    pub answered: bool,
    /// The display fold's elicitation question. Permissions expose no schema.
    #[ts(type = "unknown")]
    pub question: Option<serde_json::Value>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct ChildSummary {
    pub child_id: String,
    pub lifecycle: String,
    pub activity: Option<String>,
    pub queued: u32,
    pub close_requested: bool,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct ChildList {
    pub children: Vec<ChildSummary>,
    pub next_cursor: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct ChildStatus {
    pub summary: ChildSummary,
    pub requested: SessionConfig,
    pub actual: Option<SessionConfig>,
    pub questions: Vec<ChildQuestion>,
    pub operations: Vec<OperationReceipt>,
    pub last_outcome: Option<String>,
    pub last_report: Option<String>,
    pub truncated: bool,
    pub reason: Option<String>,
    pub url: String,
}
