//! Host-authored catalog and configuration evidence for delegated prompts.

use crate::frames::{ConfigValue, SessionConfig};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
pub struct PromptFence {
    #[ts(type = "number")]
    pub attach_generation: u64,
    #[ts(type = "number")]
    pub config_revision: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(rename_all = "snake_case")]
pub enum ConfigCompleteness {
    Complete,
    Partial,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct ConfigEvidence {
    #[ts(type = "number")]
    pub attach_generation: u64,
    #[ts(type = "number")]
    pub config_revision: u64,
    pub completeness: ConfigCompleteness,
    pub actual: SessionConfig,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(rename_all = "snake_case")]
pub enum CatalogFreshness {
    Fresh,
    Stale,
    Unknown,
}

/// Profile-owned security axes and their baseline allowed values. `mode`
/// means `SessionConfig.mode`; other keys name `SessionConfig.axes` entries.
/// Metadata supports defaults and operator warnings; it does not narrow an enabled hat.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct SecurityClassification {
    pub known: bool,
    pub axes: BTreeMap<String, Vec<ConfigValue>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct HostCatalog {
    pub agent: String,
    /// Opaque digest of the configured adapter command/environment and catalog.
    pub adapter_revision: String,
    #[ts(type = "unknown[]")]
    pub config_options: Vec<Value>,
    pub defaults: SessionConfig,
    pub security: SecurityClassification,
    pub freshness: CatalogFreshness,
}
