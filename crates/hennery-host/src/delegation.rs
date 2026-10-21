//! Bounded disposable adapter discovery and the host's workspace boundary.

use crate::{AgentCommand, profile::Profile};
use anyhow::{Context, Result, ensure};
use hennery_proto::{
    delegation_host::{CatalogFreshness, HostCatalog, SecurityClassification},
    frames::ConfigValue,
};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};
use tokio::sync::Semaphore;

pub fn checked_cwd(cwd: &str, roots: &[PathBuf]) -> Result<PathBuf> {
    let resolved = crate::paths::resolve(cwd, None).map_err(anyhow::Error::msg)?;
    ensure!(resolved.is_dir && resolved.canonical == cwd, "cwd_unavailable");
    let inside = roots.iter().any(|root| {
        let Ok(canonical) = root.canonicalize() else {
            return false;
        };
        canonical.is_dir() && Path::new(cwd).starts_with(canonical)
    });
    ensure!(inside, "cwd_unavailable");
    Ok(PathBuf::from(cwd))
}

/// Security decisions come from the installed profile, never an adapter's
/// display labels or model-supplied category. Overrides remain unverified.
pub fn security_classification(profile: Profile) -> SecurityClassification {
    let safe: &[&str] = match profile {
        Profile::Claude => &["default", "plan"],
        Profile::Codex => &["read-only"],
        Profile::ClaudeOwnCli | Profile::Generic => &[],
    };
    SecurityClassification {
        known: !safe.is_empty(),
        axes: if safe.is_empty() {
            BTreeMap::new()
        } else {
            BTreeMap::from([(
                "mode".into(),
                safe.iter().map(|v| ConfigValue::Id((*v).into())).collect(),
            )])
        },
    }
}

#[derive(Clone)]
pub struct CatalogProbes {
    slots: Arc<Semaphore>,
    timeout: Duration,
}

impl Default for CatalogProbes {
    fn default() -> Self {
        Self::new(2, Duration::from_secs(30))
    }
}

impl CatalogProbes {
    pub fn new(capacity: usize, timeout: Duration) -> Self {
        Self {
            slots: Arc::new(Semaphore::new(capacity)),
            timeout,
        }
    }

    pub async fn catalog(
        &self,
        agent: &str,
        command: AgentCommand,
        profile: Profile,
        cwd: PathBuf,
        roots: Vec<PathBuf>,
    ) -> Result<HostCatalog> {
        self.catalog_in(agent, command, profile, cwd, Some(roots)).await
    }

    pub async fn operator_catalog(
        &self,
        agent: &str,
        command: AgentCommand,
        profile: Profile,
        cwd: PathBuf,
    ) -> Result<HostCatalog> {
        self.catalog_in(agent, command, profile, cwd, None).await
    }

    async fn catalog_in(
        &self,
        agent: &str,
        command: AgentCommand,
        profile: Profile,
        cwd: PathBuf,
        roots: Option<Vec<PathBuf>>,
    ) -> Result<HostCatalog> {
        let _permit = self.slots.clone().try_acquire_owned().context("busy")?;
        let path = cwd.to_str().context("cwd_unavailable")?;
        if let Some(roots) = roots {
            checked_cwd(path, &roots).map_err(|_| anyhow::anyhow!("cwd_unavailable"))?;
        } else {
            let resolved = crate::paths::resolve(path, None).map_err(|_| anyhow::anyhow!("cwd_unavailable"))?;
            ensure!(resolved.is_dir && resolved.canonical == path, "cwd_unavailable");
        }
        let indexed = crate::session::probe_catalog(&command, cwd, profile, self.timeout)
            .await
            .map_err(|error| {
                anyhow::anyhow!(if error
                    .downcast_ref::<crate::session::StartError>()
                    .is_some_and(|error| error.is_auth_required())
                {
                    "auth_required"
                } else if error.to_string() == "catalog probe timed out" {
                    "timeout"
                } else {
                    "adapter_failed"
                })
            })?;
        let config_options = indexed.config_options.clone().unwrap_or_default();
        let defaults = indexed.current_config().unwrap_or_default();
        // Neither command arguments nor environment values leave this host.
        let material = serde_json::to_vec(&(&command.program, &command.args, &command.env, &config_options))?;
        Ok(HostCatalog {
            agent: agent.into(),
            adapter_revision: hex::encode(Sha256::digest(material)),
            freshness: if config_options.is_empty() {
                CatalogFreshness::Unknown
            } else {
                CatalogFreshness::Fresh
            },
            config_options,
            defaults,
            security: security_classification(profile),
        })
    }
}
