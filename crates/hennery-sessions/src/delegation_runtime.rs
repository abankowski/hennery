//! One host catalog service for launcher and tools; never infer models from a
//! different session's retained catalog or from a model-name allowlist.
use crate::AppState;
use anyhow::{Result, ensure};
use hennery_proto::{
    delegation_host::{CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog},
    delegation_status::ExecutionPolicy,
    frames::{Capability, CollectorFrame, ConfigValue, HostFrame, SessionConfig},
};
use rusqlite::{OptionalExtension, Transaction, params};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

pub(crate) fn same_hat_in(tx: &Transaction<'_>, owner: &str, host: &str, hat: &str, cwd: &str) -> Result<bool> {
    Ok(
        matches!(hennery_kernel::hats::session_hat_in(tx,owner,host,cwd)?,Some(hennery_kernel::hats::SessionHat::Decided(resolution)) if resolution.hat_id==hat),
    )
}
#[derive(Default)]
pub struct Catalogs {
    cache: Mutex<BTreeMap<(String, String, String, String, String, u64), (Instant, HostCatalog)>>,
}
impl Catalogs {
    pub async fn get(&self, state: &AppState, host: &str, hat: &str, cwd: &str, agent: &str) -> Result<HostCatalog> {
        ensure!(
            state.hub.has_capability(host, Capability::CatalogProbe),
            "catalog_unavailable"
        );
        let connection = state
            .hub
            .routable_conn(host)
            .ok_or_else(|| anyhow::anyhow!("host_offline"))?;
        ensure!(
            state.hub.runtime_ids(host).contains(&agent.to_string()),
            "runtime_unavailable"
        );
        let key = (
            state.store.owner_id().into(),
            host.into(),
            hat.into(),
            cwd.into(),
            agent.into(),
            connection,
        );
        // A single bounded disposable probe at a time also deduplicates identical
        // cold requests. The probe has its own timeout and the host its own cap.
        let mut cache = self.cache.lock().await;
        cache.retain(|_, (when, _)| when.elapsed() < Duration::from_secs(30));
        if let Some((_, catalog)) = cache.get(&key) {
            return Ok(catalog.clone());
        }
        ensure!(cache.len() < 128, "catalog_busy");
        let request_id = uuid::Uuid::now_v7().to_string();
        let frame = CollectorFrame::ProbeCatalog {
            request_id: request_id.clone(),
            agent: agent.into(),
            cwd: cwd.into(),
        };
        let answer = state
            .hub
            .probe(host, &request_id, frame, Duration::from_secs(30))
            .await
            .map_err(|_| anyhow::anyhow!("catalog_unavailable"))?;
        let HostFrame::Catalog { catalog, .. } = answer else {
            anyhow::bail!("catalog_unavailable")
        };
        ensure!(
            catalog.agent == agent
                && catalog.adapter_revision.len() <= 256
                && catalog.config_options.len() <= 128
                && serde_json::to_vec(&catalog)?.len() <= 256 * 1024,
            "catalog_unavailable"
        );
        ensure!(state.hub.routable_conn(host) == Some(connection), "catalog_stale");
        if catalog.freshness == CatalogFreshness::Fresh {
            cache.insert(key, (Instant::now(), catalog.clone()));
        }
        Ok(catalog)
    }
}
/// Host resolves canonical existence; the collector compares scope with its
/// authoritative rules. Refusals intentionally expose neither rule nor hat name.
pub async fn checked_cwd(state: &AppState, host: &str, hat: &str, cwd: &str) -> Result<String> {
    let resolved = crate::resolve::resolve_on_host(state, host, cwd)
        .await
        .map_err(|_| anyhow::anyhow!("invalid_cwd"))?;
    ensure!(resolved.exists && resolved.is_dir, "invalid_cwd");
    let Some(record) = state.hosts.host(host)? else {
        anyhow::bail!("not_found")
    };
    // The host probe and delegated attach enforce current canonical roots; raw hello roots may contain symlinks.
    let _ = record;
    ensure!(
        matches!(state.hosts.session_hat(host,&resolved.canonical)?,Some(hennery_kernel::hats::SessionHat::Decided(r)) if r.hat_id==hat),
        "not_found"
    );
    Ok(resolved.canonical)
}
fn options_contain(options: &Value, value: &ConfigValue) -> bool {
    options.as_array().is_some_and(|options| {
        options.iter().any(|o| {
            o.get("value")
                .and_then(Value::as_str)
                .is_some_and(|v| *value == ConfigValue::Id(v.into()))
                || o.get("options").is_some_and(|g| options_contain(g, value))
        })
    })
}
pub fn config_offered(catalog: &HostCatalog, requested: &SessionConfig) -> bool {
    if catalog.freshness != CatalogFreshness::Fresh {
        return false;
    }
    let has = |key: &str, value: &ConfigValue| {
        catalog.config_options.iter().any(|option| {
            (option.get("id").and_then(Value::as_str) == Some(key)
                || option.get("category").and_then(Value::as_str) == Some(key))
                && (option.get("options").is_some_and(|o| options_contain(o, value))
                    || (option.get("type").and_then(Value::as_str) == Some("boolean")
                        && matches!(value, ConfigValue::Bool(_))))
        })
    };
    requested
        .model
        .as_ref()
        .is_none_or(|v| has("model", &ConfigValue::Id(v.clone())))
        && requested
            .mode
            .as_ref()
            .is_none_or(|v| has("mode", &ConfigValue::Id(v.clone())))
        && requested.axes.iter().all(|(key, value)| has(key, value))
}
pub fn security_allowed(catalog: &HostCatalog, policy: &ExecutionPolicy, actual: &SessionConfig) -> bool {
    let overrides = policy.allowed.get(&catalog.agent);
    if !catalog.security.known && overrides.is_none() {
        return false;
    }
    let mut axes = catalog.security.axes.clone();
    if let Some(overrides) = overrides {
        for (key, values) in overrides {
            axes.insert(key.clone(), values.clone());
        }
    }
    if !catalog.security.known {
        if actual.mode.is_some() && !axes.contains_key("mode") {
            return false;
        }
        if actual.axes.keys().any(|key| !axes.contains_key(key)) {
            return false;
        }
        if actual.mode.is_none() && actual.axes.is_empty() {
            return false;
        }
    }
    axes.iter().all(|(key, permitted)| {
        let actual = if key == "mode" {
            actual.mode.clone().map(ConfigValue::Id)
        } else {
            actual.axes.get(key).cloned()
        };
        actual.is_some_and(|value| permitted.contains(&value))
    })
}
pub fn evidence_satisfies(
    evidence: &ConfigEvidence,
    generation: u64,
    required: &SessionConfig,
    catalog: &HostCatalog,
    policy: &ExecutionPolicy,
) -> bool {
    evidence.attach_generation == generation
        && evidence.config_revision > 0
        && evidence.completeness == ConfigCompleteness::Complete
        && required
            .model
            .as_ref()
            .is_none_or(|v| evidence.actual.model.as_ref() == Some(v))
        && required
            .mode
            .as_ref()
            .is_none_or(|v| evidence.actual.mode.as_ref() == Some(v))
        && required
            .axes
            .iter()
            .all(|(key, value)| evidence.actual.axes.get(key) == Some(value))
        && security_allowed(catalog, policy, &evidence.actual)
}
impl crate::store::Store {
    pub fn execution_policy(&self, hat: &str) -> Result<ExecutionPolicy> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        self.execution_policy_in(&tx, hat)
    }
    pub(crate) fn execution_policy_in(&self, tx: &Transaction<'_>, hat: &str) -> Result<ExecutionPolicy> {
        let stored: Option<(i64, String)> = tx
            .query_row(
                "SELECT revision,allowed FROM delegation_execution_policy WHERE owner_id = ?1 AND hat_id = ?2",
                params![self.owner_id(), hat],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;
        match stored {
            Some((revision, raw)) => Ok(ExecutionPolicy {
                revision,
                allowed: serde_json::from_str(&raw)?,
            }),
            None => Ok(ExecutionPolicy {
                revision: 0,
                allowed: Default::default(),
            }),
        }
    }
    pub fn set_execution_policy(
        &self,
        hat: &str,
        allowed: &hennery_proto::delegation_status::ExecutionAllowlist,
    ) -> Result<ExecutionPolicy> {
        ensure!(serde_json::to_vec(allowed)?.len() <= 32 * 1024, "invalid_policy");
        ensure!(
            allowed.len() <= 32
                && allowed.iter().all(|(agent, axes)| !agent.is_empty()
                    && agent.len() <= 128
                    && axes.len() <= 64
                    && axes.iter().all(|(key, values)| key.len() <= 512 && values.len() <= 128)),
            "invalid_policy"
        );
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO delegation_execution_policy(owner_id,hat_id,allowed,configured)
            SELECT ?1,?2,?3,1 WHERE EXISTS (SELECT 1 FROM hats WHERE owner_id = ?1 AND id = ?2)
            AND NOT EXISTS (SELECT 1 FROM purged_hats WHERE owner_id = ?1 AND hat_id = ?2)
            ON CONFLICT(owner_id,hat_id) DO UPDATE SET allowed = excluded.allowed,revision = revision+1,configured = 1",
            params![self.owner_id(), hat, serde_json::to_string(allowed)?],
        )?;
        let policy = self.execution_policy_in(&tx, hat)?;
        tx.commit()?;
        Ok(policy)
    }
}
