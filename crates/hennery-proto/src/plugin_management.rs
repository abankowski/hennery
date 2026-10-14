//! Generic owner management and machine lease wire shapes.
use crate::plugin::ForgetStatus;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Clone, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct RegisterPluginRequest {
    pub connection_id: String,
    pub lifecycle_credential: String,
    pub activity: bool,
    pub startup: bool,
    /// Owner confirmation that the upstream credential isolates this owner/hat.
    pub namespace_isolated: bool,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginGrantResponse {
    pub connection_id: String,
    pub namespace_epoch: String,
    /// One-time handover; never present on a GET.
    pub token: String,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginRegistration {
    pub connection_id: String,
    pub hat_id: String,
    pub namespace_epoch: String,
    pub state: String,
    pub activity: bool,
    pub startup: bool,
    pub rotation_pending: bool,
    pub deletion: Option<ForgetStatus>,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RotationAction {
    Prepare,
    Finish,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct RotatePluginRequest {
    pub action: RotationAction,
    pub handover_id: Option<String>,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct RotatePluginResponse {
    pub namespace_epoch: String,
    pub handover_id: String,
    pub token: Option<String>,
}
#[derive(Clone, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PluginLease {
    pub namespace_epoch: String,
    #[ts(type = "number")]
    pub lease_until: i64,
}
