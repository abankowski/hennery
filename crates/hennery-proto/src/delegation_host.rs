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
    /// Persisted operator preview; never live delegation evidence.
    Cached,
    Stale,
    Unknown,
}

/// Profile-owned security axes and their baseline values for operator warnings. `mode`
/// means `SessionConfig.mode`; other keys name `SessionConfig.axes` entries.
/// Evidence must confirm these axes were applied; baseline values never narrow delegation.
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
    /// Collector observation time (Unix seconds), absent for a live host reply.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "number")]
    pub saved_at: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
pub struct CatalogIdentity {
    pub adapter_revision: String,
    pub security: SecurityClassification,
}

/// Host-owned adapter identity for cross-runtime permission-mode inheritance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeProfile {
    Claude,
    Codex,
    ClaudeOwnCli,
    Generic,
    /// A newer host profile is unverified here and never maps permission modes.
    #[serde(other)]
    Unknown,
}
