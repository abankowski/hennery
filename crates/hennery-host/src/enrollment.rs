//! Conservative, durable enrollment intent. No pairing code is persisted.
use crate::identity::exists;
use crate::{
    identity::{CONFIG_FILE, HostKey, KEY_FILE, fsync_parent, write_private},
    transport::{CollectorEndpoint, CollectorTrust},
};
use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub const JOURNAL: &str = "enrollment.pending.toml";
pub const RECOVERY: &str = "enrollment.recovery.toml";
const ARCHIVE_FILES: [&str; 6] = [
    JOURNAL,
    "host.key.pending",
    "host.toml.pending",
    "host.key.pending.tmp",
    "host.toml.pending.tmp",
    "enrollment.pending.toml.tmp",
];
pub fn has_artifacts(dir: &Path) -> bool {
    ARCHIVE_FILES
        .into_iter()
        .chain([RECOVERY])
        .any(|name| dir.join(name).symlink_metadata().is_ok())
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EnrollmentAttempt {
    pub version: u32,
    pub attempt_id: String,
    pub phase: Phase,
    pub collector_origin: String,
    pub trust: CollectorTrust,
    pub public_key: String,
    pub prior_host_id: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Phase {
    MayHaveCommitted,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EnrollmentState {
    Clear,
    Uncertain(EnrollmentAttempt),
    Confirmed(EnrollmentAttempt),
}
impl EnrollmentAttempt {
    pub fn new(
        endpoint: &CollectorEndpoint,
        trust: CollectorTrust,
        key: &HostKey,
        prior_host_id: Option<String>,
    ) -> Self {
        Self {
            version: 1,
            attempt_id: uuid::Uuid::now_v7().to_string(),
            phase: Phase::MayHaveCommitted,
            collector_origin: endpoint.origin().to_string(),
            trust,
            public_key: key.public_key_hex(),
            prior_host_id,
        }
    }
    pub fn save(&self, dir: &Path) -> Result<()> {
        if exists(&dir.join(JOURNAL))? {
            bail!("an enrollment attempt already exists; do not overwrite it");
        }
        write_private(&dir.join(JOURNAL), toml::to_string(self)?.as_bytes())
    }
    pub fn diagnostic(&self) -> String {
        format!(
            "uncertain enrollment attempt {} at {}; no new enrollment is permitted. Check the collector Hosts list, revoke any entry created by this attempt, then explicitly archive it with `hennery host enrollment archive {}`",
            self.attempt_id, self.collector_origin, self.attempt_id
        )
    }
}
fn read_attempt(path: &Path) -> Result<EnrollmentAttempt> {
    let text = crate::identity::read_regular(path, 512 * 1024)?;
    let attempt: EnrollmentAttempt = toml::from_str(&text)
        .map_err(|_| anyhow::anyhow!("malformed enrollment journal; preserve artifacts for explicit recovery"))?;
    if attempt.version != 1
        || uuid::Uuid::parse_str(&attempt.attempt_id).is_err()
        || attempt.public_key.len() != 64
        || !attempt
            .public_key
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
    {
        bail!("invalid enrollment journal; preserve artifacts for explicit recovery");
    }
    let endpoint = CollectorEndpoint::public(&attempt.collector_origin)?;
    if endpoint.origin().as_str() != attempt.collector_origin {
        bail!("noncanonical enrollment destination");
    }
    if !endpoint.secure() && attempt.trust != CollectorTrust::System {
        bail!("plaintext enrollment journal contains TLS trust");
    }
    Ok(attempt)
}
fn receipt_matches(path: &Path, attempt: &EnrollmentAttempt) -> Result<bool> {
    let text = crate::identity::read_regular(path, 512 * 1024)?;
    let table: toml::Table = toml::from_str(&text).map_err(|_| anyhow::anyhow!("invalid enrollment receipt"))?;
    let Some(url) = table.get("collector").and_then(|v| v.as_str()) else {
        return Ok(false);
    };
    let endpoint = CollectorEndpoint::stored(url)?;
    let trust: CollectorTrust = table
        .get("collector_tls")
        .cloned()
        .map(|v| v.try_into())
        .transpose()
        .map_err(|_| anyhow::anyhow!("invalid receipt TLS policy"))?
        .unwrap_or_default();
    Ok(
        table.get("public_key").and_then(|v| v.as_str()) == Some(attempt.public_key.as_str())
            && table
                .get("host_id")
                .and_then(|v| v.as_str())
                .is_some_and(crate::pairing::is_valid_host_id)
            && endpoint.origin().as_str() == attempt.collector_origin
            && trust == attempt.trust,
    )
}
pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
    if exists(&dir.join(RECOVERY))? {
        bail!(
            "interrupted enrollment archive recovery; repeat the explicit archive action for its attempt id; automatic enrollment is blocked"
        );
    }
    let journal = dir.join(JOURNAL);
    let pending = dir.join(format!("{KEY_FILE}.pending"));
    let receipt = dir.join(format!("{CONFIG_FILE}.pending"));
    if !exists(&journal)? {
        if ARCHIVE_FILES[3..]
            .iter()
            .any(|name| dir.join(name).symlink_metadata().is_ok())
        {
            bail!(
                "pending enrollment fragments require explicit archive recovery with id {}; no automatic enrollment is allowed",
                artifacts_id(dir)?
            );
        }
        if exists(&pending)? && !exists(&receipt)? {
            bail!("lone pending enrollment key; preserve it for explicit recovery, never generate or overwrite a key");
        }
        if exists(&receipt)? {
            crate::identity::inspect_receipt(dir)?;
        }
        return Ok(EnrollmentState::Clear);
    }
    let attempt = read_attempt(&journal)?;
    let key = if exists(&pending)? { pending } else { dir.join(KEY_FILE) };
    if !exists(&key)? || HostKey::load(&key)?.public_key_hex() != attempt.public_key {
        bail!("enrollment journal has no matching key; preserve artifacts for explicit recovery");
    }
    if exists(&receipt)? {
        if !receipt_matches(&receipt, &attempt)? {
            bail!("enrollment journal and staged receipt disagree; preserve both");
        }
        return Ok(EnrollmentState::Confirmed(attempt));
    }
    if exists(&dir.join(CONFIG_FILE))? && receipt_matches(&dir.join(CONFIG_FILE), &attempt)? {
        let installed = dir.join(KEY_FILE);
        if !exists(&installed)? || HostKey::load(&installed)?.public_key_hex() != attempt.public_key {
            bail!("installed enrollment receipt has no matching installed key; preserve all artifacts");
        }
        return Ok(EnrollmentState::Confirmed(attempt));
    }
    Ok(EnrollmentState::Uncertain(attempt))
}
pub fn require_resolved(dir: &Path) -> Result<()> {
    match inspect(dir)? {
        EnrollmentState::Uncertain(attempt) => bail!("{}", attempt.diagnostic()),
        _ => Ok(()),
    }
}
pub(crate) fn clear_confirmed(dir: &Path) -> Result<()> {
    match inspect(dir)? {
        EnrollmentState::Confirmed(attempt) if receipt_matches(&dir.join(CONFIG_FILE), &attempt)? => {
            std::fs::File::open(dir.join(KEY_FILE))?.sync_all()?;
            std::fs::File::open(dir.join(CONFIG_FILE))?.sync_all()?;
            fsync_parent(&dir.join(CONFIG_FILE))?;
            let pending = dir.join("host.key.pending");
            if exists(&pending)? {
                crate::identity::durable_remove(&pending)?;
            }
            crate::identity::durable_remove(&dir.join(JOURNAL))?;
            Ok(())
        }
        EnrollmentState::Clear => Ok(()),
        _ => bail!("enrollment is not durably installed; journal retained"),
    }
}
/// Caller holds host.lock and has explicitly checked/revoked the possible
/// remote enrollment. Local state never claims that remote revocation happened.
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct ArchiveIntent {
    attempt_id: String,
    files: Vec<String>,
}
/// An identifier bound to legacy or damaged artifacts, without exposing keys.
pub fn artifacts_id(dir: &Path) -> Result<String> {
    use sha2::{Digest, Sha256};
    let mut hash = Sha256::new();
    for name in ARCHIVE_FILES {
        let path = dir.join(name);
        if exists(&path)? {
            hash.update(name.as_bytes());
            hash.update(crate::identity::read_regular(&path, 512 * 1024)?.as_bytes());
        }
    }
    Ok(format!("artifacts-{}", hex::encode(hash.finalize())))
}
/// Recovery archives always require a subsequent explicit join. up and its
/// automatic host join must not mint a code after any local archive action.
pub fn require_automatic_join_allowed(dir: &Path) -> Result<()> {
    if exists(dir)?
        && std::fs::read_dir(dir)?
            .filter_map(Result::ok)
            .any(|entry| entry.file_name().to_string_lossy().starts_with("enrollment-archive-"))
    {
        bail!(
            "enrollment was archived; automatic pairing is suppressed. Check remote Hosts and use explicit `hennery host join` when recovery is complete"
        );
    }
    Ok(())
}
pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
    let marker = dir.join(RECOVERY);
    let intent = if exists(&marker)? {
        let text = crate::identity::read_regular(&marker, 8192)?;
        let intent: ArchiveIntent =
            toml::from_str(&text).map_err(|_| anyhow::anyhow!("malformed archive recovery marker; preserve it"))?;
        if intent.files.is_empty() || intent.files.iter().any(|name| !ARCHIVE_FILES.contains(&name.as_str())) {
            bail!("invalid archive recovery marker");
        }
        intent
    } else {
        if matches!(inspect(dir), Ok(EnrollmentState::Confirmed(_))) {
            bail!("confirmed enrollment must roll forward, never be archived as uncertain");
        }
        let expected = if exists(&dir.join(JOURNAL))? {
            read_attempt(&dir.join(JOURNAL)).ok().map(|a| a.attempt_id)
        } else {
            None
        }
        .unwrap_or(artifacts_id(dir)?);
        if expected != attempt_id {
            bail!("archive attempt id does not match; for legacy or malformed artifacts use id {expected}");
        }
        let files: Vec<_> = ARCHIVE_FILES
            .into_iter()
            .filter(|name| dir.join(name).exists())
            .map(str::to_string)
            .collect();
        if files.is_empty() {
            bail!("no active enrollment artifacts to archive");
        }
        ArchiveIntent {
            attempt_id: expected,
            files,
        }
    };
    if intent.attempt_id != attempt_id {
        bail!("archive attempt id does not match; nothing changed");
    }
    if uuid::Uuid::parse_str(attempt_id).is_err()
        && (!attempt_id.starts_with("artifacts-")
            || attempt_id.len() != 74
            || !attempt_id[10..].bytes().all(|b| b.is_ascii_hexdigit()))
    {
        bail!("invalid archive attempt id");
    }
    let archive = dir.join(format!("enrollment-archive-{attempt_id}"));
    crate::identity::create_private_dir(&archive)?;
    for name in &intent.files {
        let from = dir.join(name);
        let to = archive.join(name);
        if exists(&from)? {
            let bytes = crate::identity::read_regular(&from, 512 * 1024)?.into_bytes();
            if exists(&to)? && std::fs::read(&to)? != bytes {
                bail!("archive artifact mismatch; preserve both copies");
            }
            write_private(&to, &bytes)?;
        } else if !exists(&to)? {
            bail!("missing archive artifact; automatic enrollment remains blocked");
        }
    }
    fsync_parent(&archive)?;
    if !exists(&marker)? {
        write_private(&marker, toml::to_string(&intent)?.as_bytes())?;
    }
    for name in &intent.files {
        let from = dir.join(name);
        if exists(&from)? {
            std::fs::remove_file(&from)?;
            fsync_parent(&from)?;
        }
    }
    std::fs::remove_file(&marker)?;
    if let Err(error) = fsync_parent(&marker) {
        // Retain the blocking marker when cleanup visibility changed but
        // durability did not finish. Archived copies were already fsynced.
        let _ = write_private(&marker, toml::to_string(&intent)?.as_bytes());
        return Err(error.context("archive cleanup durability uncertain; repeat explicit archive recovery"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn attempt(dir: &Path) -> EnrollmentAttempt {
        let key = HostKey::from_seed([29; 32]);
        key.save(&dir.join("host.key.pending")).unwrap();
        let attempt = EnrollmentAttempt::new(
            &CollectorEndpoint::public("https://c.example").unwrap(),
            CollectorTrust::System,
            &key,
            None,
        );
        attempt.save(dir).unwrap();
        attempt
    }
    #[test]
    fn uncertainty_survives_restarts_and_contains_no_code() {
        let dir = tempfile::tempdir().unwrap();
        let a = attempt(dir.path());
        let bytes = std::fs::read(dir.path().join("host.key.pending")).unwrap();
        for _ in 0..3 {
            assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Uncertain(a.clone()));
            assert!(require_resolved(dir.path()).is_err());
            assert!(crate::identity::Paired::load(dir.path()).is_err());
            assert!(crate::identity::Paired::read(dir.path()).is_err());
        }
        assert_eq!(std::fs::read(dir.path().join("host.key.pending")).unwrap(), bytes);
        assert!(a.save(dir.path()).is_err());
        assert!(
            !std::fs::read_to_string(dir.path().join(JOURNAL))
                .unwrap()
                .contains("code")
        );
    }
    #[test]
    fn missing_mismatched_and_malformed_artifacts_block() {
        for kind in ["missing", "mismatch", "malformed", "receipt"] {
            let dir = tempfile::tempdir().unwrap();
            attempt(dir.path());
            match kind {
                "missing" => std::fs::remove_file(dir.path().join("host.key.pending")).unwrap(),
                "mismatch" => HostKey::from_seed([30; 32])
                    .save(&dir.path().join("host.key.pending"))
                    .unwrap(),
                "malformed" => std::fs::write(dir.path().join(JOURNAL), "not toml secret").unwrap(),
                _ => std::fs::write(
                    dir.path().join("host.toml.pending"),
                    "collector='wss://other.example/api/hosts/ws'\nhost_id='host-0123456789abcdef'\npublic_key='wrong'",
                )
                .unwrap(),
            }
            assert!(inspect(dir.path()).is_err(), "{kind}");
            assert!(crate::identity::Paired::load(dir.path()).is_err(), "{kind}");
        }
    }
    #[test]
    fn confirmed_receipt_rolls_forward_and_clears_the_journal_without_post() {
        let dir = tempfile::tempdir().unwrap();
        let a = attempt(dir.path());
        let key = HostKey::load(&dir.path().join("host.key.pending")).unwrap();
        crate::identity::write_config_to(
            &dir.path().join("host.toml.pending"),
            "wss://c.example/api/hosts/ws",
            "host-0123456789abcdef",
            &key,
        )
        .unwrap();
        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(a.clone()));
        assert!(crate::identity::Paired::read(dir.path()).is_err());
        let loaded = crate::identity::Paired::load(dir.path()).unwrap().unwrap();
        assert_eq!(loaded.key.public_key_hex(), a.public_key);
        assert!(!dir.path().join(JOURNAL).exists());
        a.save(dir.path()).unwrap();
        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(a));
        crate::identity::Paired::load(dir.path()).unwrap();
        assert!(!dir.path().join(JOURNAL).exists());
    }
    #[test]
    fn explicit_archive_is_id_bound_and_preserves_the_artifacts() {
        let dir = tempfile::tempdir().unwrap();
        let a = attempt(dir.path());
        let before = std::fs::read(dir.path().join("host.key.pending")).unwrap();
        assert!(archive(dir.path(), &uuid::Uuid::now_v7().to_string()).is_err());
        assert!(dir.path().join(JOURNAL).exists());
        archive(dir.path(), &a.attempt_id).unwrap();
        let saved = dir.path().join(format!("enrollment-archive-{}", a.attempt_id));
        assert_eq!(std::fs::read(saved.join("host.key.pending")).unwrap(), before);
        assert!(saved.join(JOURNAL).exists());
        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
    }
    #[test]
    fn interrupted_archive_remains_blocking_and_resumes_explicitly() {
        let dir = tempfile::tempdir().unwrap();
        let a = attempt(dir.path());
        crate::identity::storage_hooks::fail_once(dir.path().join(RECOVERY), "directory_sync");
        assert!(archive(dir.path(), &a.attempt_id).is_err());
        assert!(inspect(dir.path()).is_err());
        assert!(crate::identity::Paired::load(dir.path()).is_err());
        archive(dir.path(), &a.attempt_id).unwrap();
        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
    }
    #[test]
    fn atomic_write_reports_visibility_separately_from_crash_durability() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings");
        write_private(&path, b"old").unwrap();
        crate::identity::storage_hooks::fail_once(path.clone(), "before_rename");
        assert!(write_private(&path, b"new").is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"old");
        crate::identity::storage_hooks::fail_once(path.clone(), "directory_sync");
        let error = write_private(&path, b"new").unwrap_err();
        assert!(error.downcast_ref::<crate::identity::DurabilityUncertain>().is_some());
        assert_eq!(std::fs::read(&path).unwrap(), b"new");
        write_private(&path, b"new").unwrap();
    }
}

#[cfg(test)]
mod recovery_tests {
    use super::*;
    #[test]
    fn legacy_artifacts_archive_under_their_bound_id_and_never_auto_pair() {
        let dir = tempfile::tempdir().unwrap();
        HostKey::from_seed([81; 32])
            .save(&dir.path().join("host.key.pending"))
            .unwrap();
        let before = std::fs::read(dir.path().join("host.key.pending")).unwrap();
        let id = artifacts_id(dir.path()).unwrap();
        assert!(archive(dir.path(), "artifacts-wrong").is_err());
        archive(dir.path(), &id).unwrap();
        assert_eq!(
            std::fs::read(dir.path().join(format!("enrollment-archive-{id}/host.key.pending"))).unwrap(),
            before
        );
        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
        assert!(require_automatic_join_allowed(dir.path()).is_err());
    }
}

#[cfg(test)]
mod fragment_tests {
    use super::*;
    #[test]
    fn dangling_links_and_nonregular_pending_fragments_are_never_absent_state() {
        for name in ARCHIVE_FILES {
            let dir = tempfile::tempdir().unwrap();
            std::os::unix::fs::symlink(dir.path().join("missing"), dir.path().join(name)).unwrap();
            assert!(has_artifacts(dir.path()));
            assert!(crate::identity::Paired::load(dir.path()).is_err(), "{name}");
            assert!(crate::identity::Paired::read(dir.path()).is_err(), "{name}");
        }
    }
}

#[cfg(test)]
mod installed_receipt_tests {
    use super::*;
    #[test]
    fn an_installed_receipt_checks_the_installed_key_before_pruning_a_duplicate_pending_key() {
        let dir = tempfile::tempdir().unwrap();
        let key = HostKey::from_seed([120; 32]);
        key.save(&dir.path().join("host.key.pending")).unwrap();
        let attempt = EnrollmentAttempt::new(
            &CollectorEndpoint::public("https://c.example").unwrap(),
            CollectorTrust::System,
            &key,
            None,
        );
        attempt.save(dir.path()).unwrap();
        HostKey::from_seed([121; 32]).save(&dir.path().join(KEY_FILE)).unwrap();
        crate::identity::write_config_to(
            &dir.path().join(CONFIG_FILE),
            "wss://c.example/api/hosts/ws",
            "host-0123456789abcdef",
            &key,
        )
        .unwrap();
        assert!(inspect(dir.path()).is_err());
        assert!(crate::identity::Paired::load(dir.path()).is_err());
        assert!(dir.path().join(JOURNAL).exists());
        assert!(dir.path().join("host.key.pending").exists());
        key.save(&dir.path().join(KEY_FILE)).unwrap();
        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(attempt));
        let loaded = crate::identity::Paired::load(dir.path()).unwrap().unwrap();
        assert_eq!(loaded.key.public_key_hex(), key.public_key_hex());
        assert!(!dir.path().join("host.key.pending").exists());
        assert!(!dir.path().join(JOURNAL).exists());
    }
}
