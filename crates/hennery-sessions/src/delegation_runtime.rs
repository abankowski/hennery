//! One host catalog service for launcher and tools; never infer models from a
//! different session's retained catalog or from a model-name allowlist.
use crate::AppState;
use anyhow::{Result, ensure};
use hennery_proto::{
    delegation_host::{CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog},
    frames::{Capability, CollectorFrame, ConfigValue, HostFrame, SessionConfig},
};
use rusqlite::{OptionalExtension, Transaction, params};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    sync::{Arc, Weak},
    time::{Duration, SystemTime},
};
use tokio::{sync::Mutex, time::Instant};

pub(crate) fn same_hat_in(tx: &Transaction<'_>, owner: &str, host: &str, hat: &str, cwd: &str) -> Result<bool> {
    Ok(
        matches!(hennery_kernel::hats::session_hat_in(tx,owner,host,cwd)?,Some(hennery_kernel::hats::SessionHat::Decided(resolution)) if resolution.hat_id==hat),
    )
}
type CatalogKey = (String, String, String, String, String, u64, bool);
#[derive(Default)]
struct CatalogCache {
    values: BTreeMap<CatalogKey, CachedCatalog>,
    probes: BTreeMap<CatalogKey, Weak<Mutex<()>>>,
}
#[derive(Clone)]
struct CachedCatalog {
    received: Instant,
    captured: SystemTime,
    result: std::result::Result<HostCatalog, String>,
}
impl CachedCatalog {
    fn live(&self) -> bool {
        let fresh = matches!(&self.result, Ok(catalog) if catalog.freshness == CatalogFreshness::Fresh);
        self.received.elapsed() < Duration::from_secs(if fresh { 30 } else { 5 })
    }

    fn reusable(&self, origin: &CatalogOrigin, requested: Instant) -> bool {
        if !self.live() {
            return false;
        }
        match origin {
            // Failures and non-fresh previews back off only operations admitted
            // before they were captured; newer operations must observe recovery.
            CatalogOrigin::Attach(not_before) => self.captured >= *not_before,
            CatalogOrigin::Spawn => self.received >= requested,
            // Independent tool retries can observe sign-in immediately, while
            // callers already waiting on the same probe share its failure.
            CatalogOrigin::Agent | CatalogOrigin::Operator => self.result.is_ok() || self.received >= requested,
        }
    }

    fn result(self) -> Result<HostCatalog> {
        self.result.map_err(anyhow::Error::msg)
    }
}
#[derive(Default)]
pub struct Catalogs {
    cache: Mutex<CatalogCache>,
}
enum CatalogOrigin {
    Operator,
    Agent,
    Spawn,
    Attach(SystemTime),
}
impl CatalogOrigin {
    fn result(&self, result: Result<HostCatalog>) -> Result<HostCatalog> {
        let catalog = result?;
        ensure!(
            !matches!(self, Self::Attach(_)) || catalog.freshness == CatalogFreshness::Fresh,
            "catalog_unavailable"
        );
        Ok(catalog)
    }
}
impl Catalogs {
    pub async fn get(&self, state: &AppState, host: &str, hat: &str, cwd: &str, agent: &str) -> Result<HostCatalog> {
        self.get_for_origin(state, host, hat, cwd, agent, CatalogOrigin::Agent)
            .await
    }
    /// A spawn must see values currently offered, including changes since the
    /// last preview or capability read. Never authorize from that cached view.
    pub async fn get_for_spawn(
        &self,
        state: &AppState,
        host: &str,
        hat: &str,
        cwd: &str,
        agent: &str,
    ) -> Result<HostCatalog> {
        self.get_for_origin(state, host, hat, cwd, agent, CatalogOrigin::Spawn)
            .await
    }
    /// Reuse the operation's successful preflight only while it is still fresh
    /// and was captured after admission. Older previews never authorize attach.
    pub async fn get_for_attach(
        &self,
        state: &AppState,
        host: &str,
        hat: &str,
        cwd: &str,
        agent: &str,
        not_before: SystemTime,
    ) -> Result<HostCatalog> {
        self.get_for_origin(state, host, hat, cwd, agent, CatalogOrigin::Attach(not_before))
            .await
    }
    pub async fn get_operator(
        &self,
        state: &AppState,
        host: &str,
        hat: &str,
        cwd: &str,
        agent: &str,
    ) -> Result<HostCatalog> {
        self.get_for_origin(state, host, hat, cwd, agent, CatalogOrigin::Operator)
            .await
    }
    async fn get_for_origin(
        &self,
        state: &AppState,
        host: &str,
        hat: &str,
        cwd: &str,
        agent: &str,
        origin: CatalogOrigin,
    ) -> Result<HostCatalog> {
        let requested_at = Instant::now();
        let operator_initiated = matches!(origin, CatalogOrigin::Operator);
        state.store.catalog_scope(host, hat, cwd)?;
        let connection = state
            .hub
            .routable_conn(host)
            .ok_or_else(|| anyhow::anyhow!("host_offline"))?;
        ensure!(
            state.hub.has_capability(host, Capability::CatalogProbe),
            "catalog_unavailable"
        );
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
            operator_initiated,
        );
        let check_scope = || -> Result<()> {
            ensure!(state.hub.routable_conn(host) == Some(connection), "catalog_stale");
            state.store.catalog_scope(host, hat, cwd)
        };
        // Hold the global cache lock only for map access. Independent keys can
        // probe concurrently; identical in-flight requests share a per-key lock.
        let probe = {
            let mut cache = self.cache.lock().await;
            cache.values.retain(|_, catalog| catalog.live());
            if let Some(catalog) = cache
                .values
                .get(&key)
                .filter(|entry| entry.reusable(&origin, requested_at))
            {
                let catalog = catalog.clone();
                drop(cache);
                check_scope()?;
                return origin.result(catalog.result());
            }
            cache.probes.retain(|_, probe| probe.strong_count() > 0);
            ensure!(cache.values.len() < 128 || cache.values.contains_key(&key), "busy");
            if let Some(probe) = cache.probes.get(&key).and_then(Weak::upgrade) {
                probe
            } else {
                ensure!(cache.probes.len() < 128, "busy");
                let probe = Arc::new(Mutex::new(()));
                cache.probes.insert(key.clone(), Arc::downgrade(&probe));
                probe
            }
        };
        let _in_flight = probe.lock().await;
        check_scope()?;
        {
            let cache = self.cache.lock().await;
            if let Some(catalog) = cache
                .values
                .get(&key)
                .filter(|entry| entry.reusable(&origin, requested_at))
            {
                let catalog = catalog.clone();
                drop(cache);
                check_scope()?;
                return origin.result(catalog.result());
            }
        }
        let request_id = uuid::Uuid::now_v7().to_string();
        let frame = CollectorFrame::ProbeCatalog {
            request_id: request_id.clone(),
            agent: agent.into(),
            cwd: cwd.into(),
            operator_initiated,
        };
        let result = async {
            let answer = state
                .hub
                .probe(host, &request_id, frame, Duration::from_secs(30))
                .await
                .map_err(|error| {
                    anyhow::anyhow!(match error {
                        crate::hub::RequestError::Rejected { code, .. } => match code.as_str() {
                            "cwd_unavailable" => "cwd_unavailable",
                            "busy" => "busy",
                            "timeout" => "timeout",
                            "auth_required" => "auth_required",
                            "unknown_agent" | "runtime_unavailable" => "runtime_unavailable",
                            _ => "adapter_failed",
                        },
                        crate::hub::RequestError::Busy => "busy",
                        crate::hub::RequestError::NotConnected => "host_offline",
                        crate::hub::RequestError::DeliveryUnknown => "timeout",
                        _ => "catalog_unavailable",
                    })
                })?;
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
            let mut value = serde_json::to_value(catalog)?;
            hennery_kernel::redact::value(&mut value);
            let catalog: HostCatalog = serde_json::from_value(value)?;
            Ok::<_, anyhow::Error>(catalog)
        }
        .await;
        state.store.catalog_scope(host, hat, cwd)?;
        if state.hub.routable_conn(host) != Some(connection) {
            // Preserve transport failures (notably offline), but never cache a
            // reply after its connection changed or admit a successful stale one.
            return match result {
                Ok(_) => Err(anyhow::anyhow!("catalog_stale")),
                Err(error) => Err(error),
            };
        }
        let cached = CachedCatalog {
            received: Instant::now(),
            captured: SystemTime::now(),
            result: result.as_ref().cloned().map_err(ToString::to_string),
        };
        let mut cache = self.cache.lock().await;
        // Concurrent different-key probes may fill the cache while we await I/O.
        if cache.values.len() >= 128 && !cache.values.contains_key(&key) {
            cache.values.pop_first();
        }
        cache.values.insert(key, cached);
        origin.result(result)
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

/// Only verified installed profiles map the two modes that never ask.
pub fn cross_runtime_mode(
    parent: Option<hennery_proto::delegation_host::RuntimeProfile>,
    child: Option<hennery_proto::delegation_host::RuntimeProfile>,
    mode: Option<&str>,
) -> Option<&'static str> {
    use hennery_proto::delegation_host::RuntimeProfile::{Claude, Codex};
    match (parent, child, mode) {
        (Some(Claude), Some(Codex), Some("bypassPermissions")) => Some("agent-full-access"),
        (Some(Codex), Some(Claude), Some("agent-full-access")) => Some("bypassPermissions"),
        _ => None,
    }
}
pub fn launch_configuration(catalog: &HostCatalog, requested: &SessionConfig) -> SessionConfig {
    let mut required = if catalog.freshness == CatalogFreshness::Fresh {
        catalog.defaults.clone()
    } else {
        SessionConfig::default()
    };
    if requested
        .model
        .as_ref()
        .is_some_and(|model| Some(model) != catalog.defaults.model.as_ref())
    {
        // A cold probe describes its default model. Other models may remove
        // nonsecurity options (Claude Sonnet has effort, but no fast toggle).
        // Keep every security baseline, and every explicit request below.
        required.axes.retain(|id, _| catalog.security.axes.contains_key(id));
    }
    if requested.model.is_some() {
        required.model.clone_from(&requested.model);
    }
    if requested.mode.is_some() {
        required.mode.clone_from(&requested.mode);
    }
    required.axes.extend(requested.axes.clone());
    required
}
pub fn evidence_satisfies(
    evidence: &ConfigEvidence,
    generation: u64,
    required: &SessionConfig,
    catalog: &HostCatalog,
) -> bool {
    catalog.freshness == CatalogFreshness::Fresh
        && evidence.attach_generation == generation
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
        && config_offered(catalog, required)
        && config_offered(
            catalog,
            &SessionConfig {
                // Unrequested, nonsecurity settings may have current values outside
                // an adapter's option list. They are not part of the release proof.
                model: None,
                mode: evidence.actual.mode.clone(),
                axes: evidence
                    .actual
                    .axes
                    .iter()
                    .filter(|(key, _)| catalog.security.axes.contains_key(*key))
                    .map(|(key, value)| (key.clone(), value.clone()))
                    .collect(),
            },
        )
        && catalog.security.axes.keys().all(|key| {
            if key == "mode" {
                evidence.actual.mode.is_some()
            } else {
                evidence.actual.axes.contains_key(key)
            }
        })
}
impl crate::store::Store {
    pub fn catalog_scope(&self, host: &str, hat: &str, cwd: &str) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let eligible: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM hosts WHERE owner_id = ?1 AND id = ?2 AND revoked_at IS NULL)
            AND NOT EXISTS (SELECT 1 FROM purged_hats WHERE owner_id = ?1 AND hat_id = ?3)",
            params![self.owner_id(), host, hat],
            |r| r.get(0),
        )?;
        ensure!(
            eligible && same_hat_in(&tx, self.owner_id(), host, hat, cwd)?,
            "not_found"
        );
        Ok(())
    }
}

impl crate::store::Store {
    /// Cold discovery may be unavailable. Only current-generation complete
    /// host evidence can upgrade the attached child's own catalog for release.
    pub fn attached_delegation_catalog(&self, session: &str, prestart: &HostCatalog) -> Result<HostCatalog> {
        if prestart.freshness == CatalogFreshness::Fresh {
            return Ok(prestart.clone());
        }
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let row: Option<(i64, String, Option<String>)> = tx
            .query_row(
                "SELECT e.attach_generation,e.evidence,c.config_options FROM session_attach_evidence e
            JOIN sessions s ON s.owner_id = ?1 AND s.id = e.session_id
            LEFT JOIN session_catalog c ON c.owner_id = ?1 AND c.session_id = s.id
            WHERE e.owner_id = ?1 AND e.session_id = ?2 AND e.evidence IS NOT NULL
            AND s.lifecycle = 'active' AND s.close_requested = 0 AND s.presumed_parked = 0",
                params![self.owner_id(), session],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()?;
        let Some((generation, raw, options)) = row else {
            return Ok(prestart.clone());
        };
        let evidence: ConfigEvidence = serde_json::from_str(&raw)?;
        if evidence.attach_generation != u64::try_from(generation)?
            || evidence.completeness != ConfigCompleteness::Complete
        {
            return Ok(prestart.clone());
        }
        let mut actual = prestart.clone();
        actual.defaults = evidence.actual;
        actual.config_options = options
            .map(|raw| serde_json::from_str(&raw))
            .transpose()?
            .unwrap_or_default();
        actual.freshness = CatalogFreshness::Fresh;
        Ok(actual)
    }
}
