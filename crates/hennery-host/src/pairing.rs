//! `hennery host join <url> <code>` (kernel spec §4.1): generate the host's
//! key, enroll it with a pairing code, and store the pairing.

use crate::connection::Standing;
use crate::identity::{CONFIG_FILE, HostKey, KEY_FILE, Paired, create_private_dir, fsync_parent, pending_path};
use crate::outbox::FILE as OUTBOX_FILE;
use anyhow::{Context, Result, bail};
use hennery_proto::rest::{ApiError, EnrollRequest, EnrollResponse};
use reqwest::Url;
use std::path::{Path, PathBuf};

/// What `join` did.
#[derive(Debug, Clone, PartialEq)]
pub enum Joined {
    /// Enrolled now, under this id.
    Paired { host_id: String },
    /// The collector still accepts the stored pairing; the code was not
    /// used.
    AlreadyPaired { host_id: String },
}

/// The collector's base URL, checked: `https://`, or `http://` to a
/// loopback address only (umbrella spec §7.5), with no path.
pub fn parse_public_url(public_url: &str) -> Result<Url> {
    Ok(crate::transport::CollectorEndpoint::public(public_url)?
        .origin()
        .clone())
}

/// The host WebSocket of the collector at `public_url`.
pub fn collector_ws_url(public_url: &str) -> Result<String> {
    let mut url = parse_public_url(public_url)?;
    let scheme = if url.scheme() == "https" { "wss" } else { "ws" };
    url.set_scheme(scheme).expect("ws and wss are valid schemes here");
    url.set_path("/api/hosts/ws");
    Ok(url.to_string())
}

/// `<os>-<arch>`, as enrollment reports it.
pub fn platform() -> String {
    format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH)
}

/// This machine's host name, the default name of a new host.
pub fn default_name() -> String {
    let mut buf = [0u8; 256];
    // SAFETY: gethostname(2) writes at most `buf.len()` bytes into `buf`.
    let rc = unsafe { libc::gethostname(buf.as_mut_ptr().cast(), buf.len()) };
    let len = buf.iter().position(|&b| b == 0).unwrap_or(buf.len());
    match std::str::from_utf8(&buf[..len]) {
        Ok(name) if rc == 0 && !name.is_empty() => name.chars().take(64).collect(),
        _ => "host".into(),
    }
}

/// Move an outbox that belongs to another identity out of the way, so the
/// new one starts empty and the old frames are kept for inspection:
/// `outbox.db` (and its `-wal`, `-shm`) becomes `outbox.db.orphaned-<label>`
/// (with a numeric suffix if that name is taken). `None` if there was none.
pub fn orphan_outbox(data_dir: &Path, label: &str) -> Result<Option<PathBuf>> {
    let db = data_dir.join(OUTBOX_FILE);
    if !db.exists() {
        return Ok(None);
    }
    let target = |n: u32| {
        let name = match n {
            0 => format!("{OUTBOX_FILE}.orphaned-{label}"),
            n => format!("{OUTBOX_FILE}.orphaned-{label}.{n}"),
        };
        data_dir.join(name)
    };
    let mut n = 0;
    while target(n).exists() {
        n += 1;
    }
    let base = target(n);
    for suffix in ["", "-wal", "-shm"] {
        let from = data_dir.join(format!("{OUTBOX_FILE}{suffix}"));
        if from.exists() {
            let mut to = base.clone().into_os_string();
            to.push(suffix);
            std::fs::rename(&from, &to).with_context(|| format!("move {} aside", from.display()))?;
        }
    }
    // Durable before anything goes on to use the new identity.
    fsync_parent(&db)?;
    tracing::warn!(kept = %base.display(), "moved an outbox of an earlier identity aside");
    Ok(Some(base))
}

/// Whether two host WebSocket URLs name the same collector: equal, or both
/// on loopback (the all-in-one host's collector may listen on another port,
/// or be reached as `localhost` instead of `127.0.0.1`).
pub fn same_collector(a: &str, b: &str) -> bool {
    match (
        crate::transport::CollectorEndpoint::stored(a),
        crate::transport::CollectorEndpoint::stored(b),
    ) {
        (Ok(a), Ok(b)) => a.compatible(&b),
        _ => false,
    }
}

/// Pair the host whose data directory is `data_dir` with the collector at
/// `public_url` (kernel spec §4.1). Idempotent: if the collector still
/// accepts the stored key, nothing changes and the code is not spent. A
/// pairing it revoked is replaced by a new key and a new host id, and the
/// outbox of the old identity is moved aside (`orphan_outbox`). A pairing
/// it does not know is refused: that needs the operator's decision.
/// A caller must hold host.lock while preparing and completing enrollment.
pub enum PreparedJoin {
    Already(Joined),
    Ready {
        transport: Box<crate::transport::CollectorTransport>,
        prior_host_id: Option<String>,
    },
}
/// Inspect durable state and probe an existing identity before requesting a code.
pub async fn prepare_join(
    public_url: &str,
    trust: Option<crate::transport::CollectorTrust>,
    data_dir: &Path,
) -> Result<PreparedJoin> {
    use crate::transport::{CollectorEndpoint, CollectorTransport};
    let endpoint = CollectorEndpoint::public(public_url)?;
    let paired = Paired::load(data_dir)?;
    let effective_trust = trust.unwrap_or_else(|| paired.as_ref().map(|p| p.trust.clone()).unwrap_or_default());
    if let Some(paired) = &paired {
        CollectorEndpoint::stored(&paired.collector_url)?.require_compatible(&endpoint)?;
        if effective_trust != paired.trust {
            bail!("trust change requires `hennery host transport set`; no hello or enrollment sent");
        }
    }
    let transport = CollectorTransport::new(endpoint, effective_trust)?;
    if let Some(paired) = paired {
        match crate::connection::probe_transport(&transport, &paired.host_id, &paired.key).await? {
            Standing::Accepted | Standing::Connected => {
                return Ok(PreparedJoin::Already(Joined::AlreadyPaired {
                    host_id: paired.host_id,
                }));
            }
            Standing::Revoked => {
                return Ok(PreparedJoin::Ready {
                    transport: Box::new(transport),
                    prior_host_id: Some(paired.host_id),
                });
            }
            Standing::Unknown => bail!(
                "the collector does not know this host or key; check the collector and revoke/recover deliberately before re-pairing"
            ),
        }
    }
    Ok(PreparedJoin::Ready {
        transport: Box::new(transport),
        prior_host_id: None,
    })
}
/// The CLI and up already hold host.lock; no second lock is taken.
pub async fn join_locked(
    public_url: &str,
    code: &str,
    data_dir: &Path,
    name: &str,
    trust: Option<crate::transport::CollectorTrust>,
) -> Result<Joined> {
    let prepared = prepare_join(public_url, trust, data_dir).await?;
    complete_join(prepared, code, data_dir, name).await
}
/// Library entry point also serializes all pairing-state reads and writes.
pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) -> Result<Joined> {
    create_private_dir(data_dir)?;
    let _guard = PairingLock::acquire(data_dir)?;
    join_locked(public_url, code, data_dir, name, None).await
}
pub struct PairingLock(std::fs::File);
impl PairingLock {
    pub fn acquire(dir: &Path) -> Result<Self> {
        use std::os::{fd::AsRawFd, unix::fs::OpenOptionsExt};
        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(dir.join("host.lock"))?;
        if !file.metadata()?.is_file() {
            bail!("host.lock must be a regular file");
        }
        // SAFETY: flock operates on the file owned by this guard.
        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } < 0 {
            bail!(
                "host.lock is held; park sessions and stop the host service before changing its pairing or transport"
            );
        }
        Ok(Self(file))
    }
}
impl Drop for PairingLock {
    fn drop(&mut self) {
        let _ = self.0.metadata();
    }
}
pub async fn complete_join(prepared: PreparedJoin, code: &str, data_dir: &Path, name: &str) -> Result<Joined> {
    use crate::enrollment::EnrollmentAttempt;
    let PreparedJoin::Ready {
        transport,
        prior_host_id,
    } = prepared
    else {
        let PreparedJoin::Already(joined) = prepared else {
            unreachable!()
        };
        return Ok(joined);
    };
    crate::enrollment::require_resolved(data_dir)?;
    create_private_dir(data_dir)?;
    // Validate the existing destination before spending a code. This also
    // refuses corruption instead of destroying operator configuration.
    crate::identity::read_table(&data_dir.join(CONFIG_FILE))?;
    transport.preflight().await?;
    let key = HostKey::generate();
    let pending = pending_path(data_dir, KEY_FILE);
    if pending.try_exists()? {
        bail!("a pending key exists; no overwrite is permitted");
    }
    key.save(&pending)?;
    let attempt = EnrollmentAttempt::new(&transport.endpoint, transport.trust.clone(), &key, prior_host_id);
    attempt.save(data_dir)?;
    let result = enroll(&transport, code, &key, name).await;
    let host_id = match result {
        Ok(host_id) => host_id,
        Err(err) => {
            if err.downcast_ref::<DefinitiveRejection>().is_some() {
                clear_rejected(data_dir)?;
                return Err(err);
            }
            return Err(err.context(attempt.diagnostic()));
        }
    };
    let config_pending = pending_path(data_dir, CONFIG_FILE);
    crate::identity::write_config_with(&config_pending, |table| {
        table.insert("collector".into(), toml::Value::String(transport.endpoint.ws().into()));
        table.insert("host_id".into(), toml::Value::String(host_id.clone()));
        table.insert("public_key".into(), toml::Value::String(key.public_key_hex()));
        table.insert(
            "collector_tls".into(),
            toml::Value::try_from(&transport.trust).expect("TLS policy serializes"),
        );
    })
    .context("confirmed enrollment; receipt staging failed; retain journal and pending key")?;
    Paired::load(data_dir).context("confirmed enrollment needs roll-forward; retain its receipt")?;
    if let Err(err) = crate::connection::probe_transport(&transport, &host_id, &key).await {
        bail!("paired as {host_id}; connection failed: {err}; identity retained for retry");
    }
    Ok(Joined::Paired { host_id })
}
#[derive(Debug)]
struct DefinitiveRejection;
impl std::fmt::Display for DefinitiveRejection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("pairing rejected: invalid_code; no enrollment occurred")
    }
}
impl std::error::Error for DefinitiveRejection {}
fn clear_rejected(dir: &Path) -> Result<()> {
    std::fs::remove_file(dir.join("host.key.pending"))?;
    fsync_parent(&dir.join(crate::enrollment::JOURNAL))?;
    std::fs::remove_file(dir.join(crate::enrollment::JOURNAL))?;
    fsync_parent(&dir.join(crate::enrollment::JOURNAL))
}
async fn enroll(
    transport: &crate::transport::CollectorTransport,
    code: &str,
    key: &HostKey,
    name: &str,
) -> Result<String> {
    let url = transport.endpoint.origin().join("/api/hosts/enroll")?;
    let mut response = transport
        .http()
        .await?
        .post(url)
        .json(&EnrollRequest {
            code: code.into(),
            public_key: key.public_key_hex(),
            name: name.into(),
            host_version: env!("CARGO_PKG_VERSION").into(),
            platform: platform(),
        })
        .send()
        .await
        .map_err(|_| anyhow::anyhow!("enrollment reply unavailable; possible remote enrollment"))?;
    let status = response.status().as_u16();
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| anyhow::anyhow!("enrollment reply truncated"))?
    {
        if bytes.len() + chunk.len() > 8192 {
            bail!("enrollment reply exceeds limit");
        }
        bytes.extend_from_slice(&chunk);
    }
    if status == 201 {
        let reply: EnrollResponse =
            serde_json::from_slice(&bytes).map_err(|_| anyhow::anyhow!("malformed enrollment success"))?;
        if !is_valid_host_id(&reply.host_id) {
            bail!("malformed returned host id");
        }
        return Ok(reply.host_id);
    }
    if status == 401 && serde_json::from_slice::<ApiError>(&bytes).is_ok_and(|reply| reply.code == "invalid_code") {
        return Err(DefinitiveRejection.into());
    }
    bail!("enrollment answered HTTP {status}; result may have committed")
}
/// Move an identity to an explicitly authorized HTTPS origin without enrollment.
/// Caller holds host.lock, and an omitted trust choice only retains same-origin trust.
pub async fn set_transport(
    data_dir: &Path,
    public_url: &str,
    trust: Option<crate::transport::CollectorTrust>,
) -> Result<Standing> {
    use crate::transport::{CollectorEndpoint, CollectorTransport};
    let paired = Paired::load(data_dir)?.context("transport set requires an existing pairing")?;
    let endpoint = CollectorEndpoint::public(public_url)?;
    if !endpoint.secure() {
        bail!("transport set requires HTTPS; plaintext downgrades are refused before hello");
    }
    let old = CollectorEndpoint::stored(&paired.collector_url)?;
    if old.origin() != endpoint.origin() && trust.is_none() {
        bail!("a different origin requires --ca-cert or --system-roots; no hello sent");
    }
    let transport = CollectorTransport::new(endpoint, trust.unwrap_or(paired.trust))?;
    let standing = crate::connection::probe_transport(&transport, &paired.host_id, &paired.key).await?;
    if !matches!(standing, Standing::Accepted | Standing::Connected) {
        bail!("transport probe refused: {standing:?}; old configuration retained");
    }
    let save = crate::identity::write_config_with(&data_dir.join(CONFIG_FILE), |table| {
        table.insert("collector".into(), toml::Value::String(transport.endpoint.ws().into()));
        table.insert(
            "collector_tls".into(),
            toml::Value::try_from(&transport.trust).expect("TLS policy serializes"),
        );
    });
    if let Err(err) = save {
        if err.downcast_ref::<crate::identity::DurabilityUncertain>().is_some() {
            let read_back = Paired::read(data_dir)
                .ok()
                .flatten()
                .and_then(|p| CollectorEndpoint::stored(&p.collector_url).ok())
                .map(|e| e.origin().to_string())
                .unwrap_or_else(|| "unavailable; inspect host.toml".into());
            return Err(err.context(format!("visible saved endpoint read-back: {read_back}")));
        }
        return Err(err);
    }
    Ok(standing)
}

/// `host-` followed by 16 lowercase hex characters (kernel spec §4.1): the
/// only shape a host id ever takes.
pub(crate) fn is_valid_host_id(id: &str) -> bool {
    id.strip_prefix("host-")
        .is_some_and(|rest| rest.len() == 16 && rest.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f')))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collector_policy_rejects_credentials_and_all_secure_loopback_aliases() {
        for input in [
            "https://user:secret@localhost",
            "https://localhost:0",
            "https://localhost/?x=1",
            "https://localhost/#x",
        ] {
            let error = parse_public_url(input).unwrap_err().to_string();
            assert!(!error.contains("secret"));
        }
        for a in ["wss://localhost/api/hosts/ws", "wss://127.0.0.1:443/api/hosts/ws"] {
            for b in [
                "ws://localhost/api/hosts/ws",
                "ws://127.0.0.1:7117/api/hosts/ws",
                "wss://localhost:8443/api/hosts/ws",
            ] {
                assert!(!same_collector(a, b), "{a} -> {b}");
            }
        }
        assert!(!same_collector("ws://localhost/wrong", "ws://127.0.0.1/api/hosts/ws"));
    }

    #[test]
    fn the_host_websocket_is_derived_from_the_public_url() {
        assert_eq!(
            collector_ws_url("https://c.example").unwrap(),
            "wss://c.example/api/hosts/ws"
        );
        assert_eq!(
            collector_ws_url("https://c.example:8443/").unwrap(),
            "wss://c.example:8443/api/hosts/ws"
        );
        assert_eq!(
            collector_ws_url("http://127.0.0.1:7117").unwrap(),
            "ws://127.0.0.1:7117/api/hosts/ws"
        );
        assert_eq!(
            collector_ws_url("http://localhost:7117").unwrap(),
            "ws://localhost:7117/api/hosts/ws"
        );
        assert_eq!(
            collector_ws_url("http://[::1]:7117").unwrap(),
            "ws://[::1]:7117/api/hosts/ws"
        );
    }

    #[test]
    fn an_outbox_moved_aside_keeps_its_files_together_under_a_free_name() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(orphan_outbox(dir.path(), "host-1").unwrap(), None);
        for round in ["first", "second"] {
            for suffix in ["", "-wal", "-shm"] {
                std::fs::write(dir.path().join(format!("outbox.db{suffix}")), round).unwrap();
            }
            orphan_outbox(dir.path(), "host-1").unwrap().unwrap();
        }
        for name in [
            "outbox.db.orphaned-host-1",
            "outbox.db.orphaned-host-1-wal",
            "outbox.db.orphaned-host-1-shm",
            "outbox.db.orphaned-host-1.1",
            "outbox.db.orphaned-host-1.1-wal",
        ] {
            assert!(dir.path().join(name).exists(), "{name}");
        }
        assert_eq!(
            std::fs::read_to_string(dir.path().join("outbox.db.orphaned-host-1")).unwrap(),
            "first"
        );
        assert!(!dir.path().join("outbox.db").exists());
    }

    #[test]
    fn a_host_id_is_valid_only_as_host_plus_16_lowercase_hex_chars() {
        for id in ["host-0123456789abcdef", "host-aaaaaaaaaaaaaaaa"] {
            assert!(is_valid_host_id(id), "{id}");
        }
        for id in [
            "host-0123456789ABCDEF",  // uppercase hex is another key entirely
            "host-0123456789abcde",   // 15 chars
            "host-0123456789abcdef0", // 17 chars
            "host_0123456789abcdef",  // wrong separator
            "host-01234567-9abcdef",  // not hex throughout
            "../../etc/passwd",
            "",
        ] {
            assert!(!is_valid_host_id(id), "{id}");
        }
    }

    #[test]
    fn any_two_loopback_urls_name_the_same_collector() {
        assert!(same_collector(
            "ws://127.0.0.1:7117/api/hosts/ws",
            "ws://localhost:7200/api/hosts/ws"
        ));
        assert!(same_collector(
            "ws://[::1]:7117/api/hosts/ws",
            "ws://127.0.0.2:7117/api/hosts/ws"
        ));
        assert!(same_collector(
            "wss://c.example/api/hosts/ws",
            "wss://c.example/api/hosts/ws"
        ));
        assert!(!same_collector(
            "wss://c.example/api/hosts/ws",
            "wss://d.example/api/hosts/ws"
        ));
        assert!(!same_collector(
            "ws://127.0.0.1:7117/api/hosts/ws",
            "wss://c.example/api/hosts/ws"
        ));
    }

    #[test]
    fn plain_http_off_loopback_paths_and_other_schemes_are_refused() {
        for (url, why) in [
            ("http://c.example", "only allowed to a loopback"),
            ("http://192.168.1.2:7117", "only allowed to a loopback"),
            ("ftp://c.example", "unsupported scheme"),
            ("https://c.example/hennery", "without a path"),
            ("c.example", "not a URL"),
        ] {
            let err = collector_ws_url(url).unwrap_err().to_string();
            assert!(err.contains(why), "{url}: {err}");
        }
    }
}
