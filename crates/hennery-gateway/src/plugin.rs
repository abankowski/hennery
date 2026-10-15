//! Generic optional plug-in registration, exposure, and terminal transitions.
//! The core transaction is always held before opening the control transaction.

mod context;
pub mod feed;
pub mod management;
pub mod recovery;

use crate::{
    crypto,
    key::MasterKey,
    revocation::{Cut, Revocations, Watch},
};
use anyhow::{Context, Result, ensure};
use hennery_kernel::{
    coordination::Coordination,
    db,
    secret::{random_bytes, sha256_hex},
};
use hennery_proto::plugin::PluginCapabilities;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, OnceLock, Weak},
};

pub const ACTIVITY_PREFIX: &str = "hnry_activity_";
const LIFECYCLE_FIELD: &str = "plugin_registrations.lifecycle";
/// Only the optional file receives this migration, never hennery.db.
pub const MIGRATIONS: &[&str] = &["
CREATE TABLE plugin_registrations (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, connection_id TEXT NOT NULL,
    epoch TEXT NOT NULL, state TEXT NOT NULL, token_hash TEXT,
    activity INTEGER NOT NULL, startup INTEGER NOT NULL, start_event INTEGER NOT NULL,
    fingerprint TEXT NOT NULL, endpoint TEXT, internal_network INTEGER NOT NULL,
    lifecycle BLOB, cursor_key TEXT NOT NULL,
    request_id TEXT, intent TEXT, result_fingerprint TEXT, deadline INTEGER,
    PRIMARY KEY(owner_id, connection_id));
CREATE TABLE plugin_bindings (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, session_id TEXT NOT NULL,
    PRIMARY KEY(owner_id, session_id));
CREATE TABLE plugin_generations (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, generation TEXT NOT NULL,
    PRIMARY KEY(owner_id, hat_id));
CREATE TABLE plugin_receipts (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, request_id TEXT NOT NULL,
    result TEXT NOT NULL, PRIMARY KEY(owner_id, request_id));
"];

pub struct RegistrationInput<'a> {
    pub connection_id: &'a str,
    pub lifecycle_credential: &'a str,
    pub activity: bool,
    pub startup: bool,
    pub capabilities: PluginCapabilities,
}
pub struct IssuedGrant {
    pub token: String,
    pub epoch: String,
}
#[derive(Clone)]
pub struct Grant {
    pub connection_id: String,
    pub hat_id: String,
    pub epoch: String,
    pub activity: bool,
    pub startup: bool,
    pub start_event: i64,
    pub(crate) cursor_key: String,
}
struct Row {
    grant: Grant,
    state: String,
    fingerprint: String,
    endpoint: Option<String>,
    internal_network: bool,
    lifecycle: Option<Vec<u8>>,
    request_id: Option<String>,
    intent: Option<String>,
    result_fingerprint: Option<String>,
    deadline: Option<i64>,
}
/// Its Display never contains the mutation payload, destination, or secret.
#[derive(Debug, thiserror::Error)]
#[error("registered connection has a pending lifecycle transition")]
pub struct PendingMutation;

pub struct Control {
    owner: String,
    path: Option<PathBuf>,
    coordination: Arc<Coordination>,
    conn: Mutex<Option<db::OwnedConnection>>,
    work: Revocations,
    pub(crate) management: management::State,
    pub(crate) pending: tokio::sync::Notify,
}

impl Control {
    pub fn configured(&self) -> Result<bool> {
        Ok(self.conn.lock().expect("plug-in control").is_some()
            || self.path.as_ref().map(|p| p.try_exists()).transpose()?.unwrap_or(false))
    }
    pub fn cut_connections(&self, ids: &[String]) {
        self.work.cut(Cut(ids.to_vec()));
    }
    pub fn cut_all(&self) {
        self.work.cut_all();
    }

    pub(crate) fn prepare_purge_in(&self, core: &Transaction<'_>, hat: &str, now: i64) -> Result<Vec<String>> {
        self.require_control_for_hat(core, hat)?;
        let ids = self.registered_ids_in(core, Some(hat))?;
        self.with(false, |conn| {
            let tx=conn.transaction()?;
            for id in &ids {
                let row=Self::row(&tx,&self.owner,id)?.context("registration disappeared")?;
                if row.state=="active" {
                    tx.execute("UPDATE plugin_registrations SET state = 'terminal', token_hash = NULL, request_id = ?3,
                        intent = 'purge', result_fingerprint = 'deleted', deadline = ?4 WHERE owner_id = ?1 AND connection_id = ?2",
                        params![self.owner,id,hex::encode(random_bytes::<32>()),now.saturating_add(5)])?;
                }
            }
            tx.commit()?;
            Ok(())
        })?;
        Ok(ids)
    }
    pub(crate) fn guard_purge_in(&self, core: &Transaction<'_>, hat: &str) -> Result<()> {
        self.require_control_for_hat(core, hat)?;
        for id in self.registered_ids_in(core, Some(hat))? {
            self.with(false, |conn| {
                let row = Self::row(conn, &self.owner, &id)?.context("registration disappeared")?;
                ensure!(
                    matches!(row.state.as_str(), "disposed" | "complete") && row.lifecycle.is_none(),
                    PendingMutation
                );
                Ok(())
            })?;
        }
        Ok(())
    }

    fn require_control_for_hat(&self, core: &Connection, hat: &str) -> Result<()> {
        let anchored: bool = core.query_row(
            "SELECT EXISTS(SELECT 1 FROM settings s JOIN gw_connections c
             ON s.key = 'plugin_epoch:' || c.id AND c.owner_id = ?1
             WHERE s.owner_id = ?1 AND c.hat_id = ?2)",
            params![self.owner, hat],
            |r| r.get(0),
        )?;
        ensure!(
            !anchored || self.with(false, |_| Ok(()))?.is_some(),
            "plug-in control state missing"
        );
        Ok(())
    }

    pub fn encode_cursor(&self, grant: &Grant, after: i64) -> Result<String> {
        let bytes: [u8; 32] = hex::decode(&grant.cursor_key)?
            .try_into()
            .map_err(|_| anyhow::anyhow!("invalid cursor key"))?;
        let key = MasterKey::from_bytes(bytes);
        let aad = serde_json::to_string(&(&self.owner, &grant.hat_id, &grant.connection_id, &grant.epoch))?;
        Ok(hex::encode(crypto::seal(
            &key,
            &aad,
            "plugin.cursor",
            &after.to_be_bytes(),
        )))
    }
    pub fn decode_cursor(&self, grant: &Grant, cursor: &str) -> Result<i64> {
        ensure!(cursor.len() <= 256, "reset_required");
        let bytes: [u8; 32] = hex::decode(&grant.cursor_key)?
            .try_into()
            .map_err(|_| anyhow::anyhow!("invalid cursor key"))?;
        let key = MasterKey::from_bytes(bytes);
        let aad = serde_json::to_string(&(&self.owner, &grant.hat_id, &grant.connection_id, &grant.epoch))?;
        let opened = crypto::open(&key, &aad, "plugin.cursor", key.version(), &hex::decode(cursor)?)?;
        let position = i64::from_be_bytes(
            opened
                .as_slice()
                .try_into()
                .map_err(|_| anyhow::anyhow!("reset_required"))?,
        );
        ensure!(position >= grant.start_event, "reset_required");
        Ok(position)
    }
    pub fn for_core(path: Option<&Path>, owner: &str, coordination: Arc<Coordination>) -> Arc<Self> {
        static CONTROLS: OnceLock<Mutex<HashMap<usize, Weak<Control>>>> = OnceLock::new();
        let key = Arc::as_ptr(&coordination) as usize;
        let mut controls = CONTROLS.get_or_init(Mutex::default).lock().expect("plug-in controls");
        if let Some(control) = controls.get(&key).and_then(Weak::upgrade) {
            return control;
        }
        let control = Arc::new(Self {
            owner: owner.to_string(),
            path: path.and_then(Path::parent).map(|p| p.join("plugin-control.db")),
            coordination,
            conn: Mutex::new(None),
            work: Revocations::new(),
            management: management::State::default(),
            pending: tokio::sync::Notify::new(),
        });
        controls.insert(key, Arc::downgrade(&control));
        control
    }
    fn with<T>(&self, create: bool, f: impl FnOnce(&mut db::OwnedConnection) -> Result<T>) -> Result<Option<T>> {
        let _gate = self.coordination.gate.lock();
        let mut conn = self.conn.lock().expect("plug-in control database");
        if conn.is_none() {
            match &self.path {
                Some(path) if create || path.try_exists()? => {
                    let mut opened = db::open(path).context("plug-in control unavailable")?;
                    db::migrate(&mut opened, MIGRATIONS)?;
                    management::migrate(&mut opened)?;
                    *conn = Some(opened);
                }
                None if create => {
                    let mut opened = db::open_in_memory()?;
                    db::migrate(&mut opened, MIGRATIONS)?;
                    management::migrate(&mut opened)?;
                    *conn = Some(opened);
                }
                _ => return Ok(None),
            }
        }
        f(conn.as_mut().expect("control opened")).map(Some)
    }
    fn row(conn: &Connection, owner: &str, id: &str) -> Result<Option<Row>> {
        Ok(conn
            .query_row(
                "SELECT hat_id, epoch, state, activity, startup, start_event, fingerprint, endpoint,
                    internal_network, lifecycle, cursor_key, request_id, intent, result_fingerprint, deadline
             FROM plugin_registrations WHERE owner_id = ?1 AND connection_id = ?2",
                params![owner, id],
                |r| {
                    Ok(Row {
                        grant: Grant {
                            connection_id: id.into(),
                            hat_id: r.get(0)?,
                            epoch: r.get(1)?,
                            activity: r.get(3)?,
                            startup: r.get(4)?,
                            start_event: r.get(5)?,
                            cursor_key: r.get(10)?,
                        },
                        state: r.get(2)?,
                        fingerprint: r.get(6)?,
                        endpoint: r.get(7)?,
                        internal_network: r.get(8)?,
                        lifecycle: r.get(9)?,
                        request_id: r.get(11)?,
                        intent: r.get(12)?,
                        result_fingerprint: r.get(13)?,
                        deadline: r.get(14)?,
                    })
                },
            )
            .optional()?)
    }
    /// The trusted caller holds the core owner gate and IMMEDIATE transaction.
    /// Remote capability discovery has already completed outside both locks.
    pub fn register_in(
        &self,
        core: &Transaction<'_>,
        input: RegistrationInput<'_>,
        key: &MasterKey,
        now: i64,
    ) -> Result<IssuedGrant> {
        let caps = input.capabilities;
        ensure!(
            caps.version == 1
                && caps.forget_v1
                && (!input.activity || caps.activity_v1)
                && (!input.startup || caps.startup_context_v1),
            "unsupported plug-in capabilities"
        );
        ensure!(
            !input.lifecycle_credential.is_empty()
                && input.lifecycle_credential.len() <= 8192
                && input.lifecycle_credential.bytes().all(|b| (0x21..=0x7e).contains(&b)),
            "invalid lifecycle credential"
        );
        let (hat, endpoint, internal_network, allowlist): (String, String, bool, Option<String>) = core.query_row(
            "SELECT hat_id, url, internal_network, tool_allowlist FROM gw_connections
             WHERE owner_id = ?1 AND id = ?2",
            params![self.owner, input.connection_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )?;
        let (kind, version, sealed): (String, u32, Vec<u8>) = core.query_row(
            "SELECT c.cred_kind, k.key_version, k.ciphertext FROM gw_connections c
             JOIN gw_credentials k ON k.connection_id = c.id AND k.owner_id = ?1
             WHERE c.owner_id = ?1 AND c.id = ?2",
            params![self.owner, input.connection_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;
        let kind = crate::model::CredKind::parse(&kind).context("invalid credential kind")?;
        ensure!(kind != crate::model::CredKind::None, "namespace credential required");
        let opened = crypto::open(
            key,
            input.connection_id,
            crypto::credential_field(kind),
            version,
            &sealed,
        )?;
        let namespace = if kind.is_oauth() {
            let tokens = crate::model::GrantTokens::from_opened(&opened).context("invalid namespace grant")?;
            ensure!(
                tokens
                    .refresh_token
                    .as_ref()
                    .is_none_or(|token| token.as_str() != input.lifecycle_credential),
                "distinct lifecycle credential required"
            );
            tokens.access_token
        } else {
            zeroize::Zeroizing::new(String::from_utf8(opened.to_vec())?)
        };
        ensure!(
            namespace.as_str() != input.lifecycle_credential,
            "distinct lifecycle credential required"
        );
        let tools: Vec<String> = serde_json::from_str(
            allowlist
                .as_deref()
                .context("registered tools require an explicit allowlist")?,
        )?;
        ensure!(
            !tools
                .iter()
                .any(|tool| tool.to_ascii_lowercase().starts_with("hennery_plugin_")),
            "management tools cannot be mounted"
        );
        ensure!(
            scope_live(core, &self.owner, input.connection_id, &hat)?,
            "plug-in scope unavailable"
        );
        let fingerprint = fingerprint(core, &self.owner, input.connection_id)?;
        let start_event: i64 = core.query_row(
            "SELECT COALESCE(MAX(event_id), 0) FROM events WHERE owner_id = ?1",
            [&self.owner],
            |r| r.get(0),
        )?;
        let epoch = hex::encode(random_bytes::<32>());
        let token = format!("{ACTIVITY_PREFIX}{}", hex::encode(random_bytes::<32>()));
        let aad = serde_json::to_string(&(&self.owner, &hat, input.connection_id, &epoch))?;
        let sealed = crypto::seal(key, &aad, LIFECYCLE_FIELD, input.lifecycle_credential.as_bytes());
        self.with(true, |conn| {
            let tx = conn.transaction()?;
            if input.startup {
                let conflict:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM plugin_registrations
                    WHERE owner_id = ?1 AND hat_id = ?2 AND connection_id <> ?3
                    AND startup = 1 AND state IN ('active','pending'))",
                    params![self.owner,hat,input.connection_id],|r|r.get(0))?;
                ensure!(!conflict,"one startup provider per hat");
            }
            if let Some(old) = Self::row(&tx, &self.owner, input.connection_id)? {
                ensure!(old.state == "complete", "old namespace must finish deletion before re-registration");
            }
            tx.execute(
                "INSERT INTO plugin_registrations(owner_id, hat_id, connection_id, epoch, state, token_hash,
                    activity, startup, start_event, fingerprint, endpoint, internal_network, lifecycle, cursor_key)
                 VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                 ON CONFLICT(owner_id, connection_id) DO UPDATE SET hat_id = excluded.hat_id, epoch = excluded.epoch,
                    state = 'pending', token_hash = excluded.token_hash, activity = excluded.activity, startup = excluded.startup,
                    start_event = excluded.start_event, fingerprint = excluded.fingerprint, endpoint = excluded.endpoint,
                    internal_network = excluded.internal_network, lifecycle = excluded.lifecycle, cursor_key = excluded.cursor_key,
                    request_id = NULL, intent = NULL, result_fingerprint = NULL, deadline = NULL",
                params![self.owner, hat, input.connection_id, epoch, sha256_hex(token.as_bytes()), input.activity, input.startup,
                    start_event, fingerprint, endpoint, internal_network, sealed, hex::encode(random_bytes::<32>())])?;
            let mut stmt = core.prepare(
                "SELECT s.id FROM sessions s WHERE s.owner_id = ?1 AND s.hat_id = ?2
                 AND (s.lifecycle IN ('starting', 'active') OR s.presumed_parked = 1) AND EXISTS
                     (SELECT 1 FROM gw_mounts m JOIN hosts h ON h.id = m.host_id AND h.owner_id = ?1
                      WHERE m.owner_id = ?1 AND m.connection_id = ?3 AND m.host_id = s.host_id AND h.revoked_at IS NULL)")?;
            for id in stmt.query_map(params![self.owner, hat, input.connection_id], |r|r.get::<_,String>(0))? {
                bind(core, &tx, &self.owner, &hat, &id?)?;
            }
            // Cuts include traffic admitted before registration existed.
            self.work.cut(Cut(vec![input.connection_id.into()]));
            tx.execute("UPDATE plugin_registrations SET state = 'active' WHERE owner_id = ?1 AND connection_id = ?2", params![self.owner, input.connection_id])?;
            tx.commit()?;
            Ok(())
        })?;
        // An epoch anchor in the existing settings table detects a missing or
        // mismatched restore without changing the unconfigured core schema.
        core.execute(
            "INSERT INTO settings(owner_id,key,value) VALUES(?1,?2,?3)
            ON CONFLICT(owner_id,key) DO UPDATE SET value = excluded.value",
            params![self.owner, format!("plugin_epoch:{}", input.connection_id), epoch],
        )?;
        let _ = now; // Grant lifetime is terminal-state based; leases are bounded separately.
        Ok(IssuedGrant { token, epoch })
    }
    pub fn bound_in(&self, core: &Transaction<'_>, session: &str) -> Result<bool> {
        let anchors: Vec<String> = {
            let mut stmt =
                core.prepare("SELECT key FROM settings WHERE owner_id = ?1 AND key LIKE 'plugin_generation:%'")?;
            stmt.query_map([&self.owner], |r| r.get(0))?
                .collect::<rusqlite::Result<_>>()?
        };
        let found = self.with(false, |conn| {
            for key in &anchors {
                verify_generation(core, conn, &self.owner, key.trim_start_matches("plugin_generation:"))?;
            }
            Ok(conn
                .query_row(
                    "SELECT 1 FROM plugin_bindings WHERE owner_id = ?1 AND session_id = ?2",
                    params![self.owner, session],
                    |_| Ok(()),
                )
                .optional()?
                .is_some())
        })?;
        ensure!(found.is_some() || anchors.is_empty(), "plug-in control state missing");
        Ok(found.unwrap_or(false))
    }
    /// Called only after the core tombstone is durable, while still holding
    /// the owner gate. A crash can preserve a conservative binding, never
    /// release one for a live session.
    pub fn remove_binding_in(&self, core: &Transaction<'_>, session: &str) -> Result<()> {
        let deleted: bool = core.query_row(
            "SELECT EXISTS(SELECT 1 FROM sessions WHERE owner_id = ?1 AND id = ?2 AND lifecycle = 'deleted')",
            params![self.owner, session],
            |r| r.get(0),
        )?;
        ensure!(deleted, "live session exposure cannot be removed");
        self.with(false, |conn| {
            let tx = conn.transaction()?;
            let hat: Option<String> = tx
                .query_row(
                    "SELECT hat_id FROM plugin_bindings WHERE owner_id = ?1 AND session_id = ?2",
                    params![self.owner, session],
                    |r| r.get(0),
                )
                .optional()?;
            if let Some(hat) = &hat {
                // Deletion cannot repair a restore that may have lost other
                // sessions' exposure. Only explicit conservative recovery can.
                verify_generation(core, &tx, &self.owner, hat)?;
            }
            tx.execute(
                "DELETE FROM plugin_bindings WHERE owner_id = ?1 AND session_id = ?2",
                params![self.owner, session],
            )?;
            if let Some(hat) = hat {
                record_generation(core, &tx, &self.owner, &hat)?;
            }
            tx.commit()?;
            Ok(())
        })?;
        Ok(())
    }
    pub fn authenticate_in(&self, core: &Transaction<'_>, token: &str, _: i64) -> Result<Option<Grant>> {
        if !is_activity_token(token) {
            return Ok(None);
        }
        self.with(false, |conn| {
            let id: Option<String> = conn.query_row(
                "SELECT connection_id FROM plugin_registrations WHERE owner_id = ?1 AND token_hash = ?2 AND state = 'active'",
                params![self.owner,sha256_hex(token.as_bytes())], |r|r.get(0)).optional()?;
            let id = match id { Some(id) => Some(id), None => self.rotation_connection_in(conn, token)? };
            let Some(row) = id.map(|id| Self::row(conn, &self.owner, &id)).transpose()?.flatten() else {
                return Ok(None);
            };
            verify_generation(core, conn, &self.owner, &row.grant.hat_id)?;
            if epoch_anchor(core, &self.owner, &row.grant.connection_id)?.as_deref() != Some(&row.grant.epoch)
                || row.fingerprint != fingerprint(core, &self.owner, &row.grant.connection_id)?
                || !scope_live(core, &self.owner, &row.grant.connection_id, &row.grant.hat_id)?
            {
                return Ok(None);
            }
            Ok(Some(row.grant))
        })
        .map(Option::flatten)
    }
    /// Watch all connection traffic, registered or ordinary. Registration cuts
    /// ordinary requests before activating a namespace. A terminal fence never
    /// falls back to ordinary routing after its token/secret has been erased.
    pub fn admit_in(&self, core: &Transaction<'_>, connection: &str, session: &str, hat: &str) -> Result<Watch> {
        let found = self.with(false, |conn| {
            if let Some(row) = Self::row(conn, &self.owner, connection)? {
                ensure!(
                    row.state == "active"
                        && row.grant.hat_id == hat
                        && epoch_anchor(core, &self.owner, connection)?.as_deref() == Some(&row.grant.epoch)
                        && row.fingerprint == fingerprint(core, &self.owner, connection)?
                        && scope_live(core, &self.owner, connection, hat)?,
                    "registered plug-in access revoked"
                );
                let live: bool = core.query_row(
                    "SELECT EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id = ?1 AND s.id = ?2 AND s.hat_id = ?3
                     AND s.lifecycle <> 'deleted' AND EXISTS(SELECT 1 FROM gw_mounts m WHERE m.owner_id = ?1
                     AND m.connection_id = ?4 AND m.host_id = s.host_id))",
                    params![self.owner, session, hat, connection],
                    |r| r.get(0),
                )?;
                ensure!(live, "registered session scope changed");
                let tx = conn.transaction()?;
                bind(core, &tx, &self.owner, hat, session)?;
                tx.commit()?;
            } else {
                ensure!(
                    epoch_anchor(core, &self.owner, connection)?.is_none(),
                    "plug-in control state missing"
                );
            }
            Ok(())
        })?;
        if found.is_none() {
            ensure!(
                epoch_anchor(core, &self.owner, connection)?.is_none(),
                "plug-in control state missing"
            );
        }
        Ok(self.work.watch(connection))
    }
    /// Called after validating/simulating a core mutation in its uncommitted
    /// transaction. The first call commits terminal state and returns Pending;
    /// only a matching retry after durable receipt/secret erasure may commit.
    pub fn authorize_mutation_in(
        &self,
        core: &Transaction<'_>,
        connection: &str,
        old: &str,
        intent: &str,
        result: &str,
        now: i64,
    ) -> Result<()> {
        let anchored = epoch_anchor(core, &self.owner, connection)?.is_some();
        let allowed = self
            .with(false, |conn| {
                let Some(row) = Self::row(conn, &self.owner, connection)? else {
                    ensure!(!anchored, "plug-in control state missing");
                    return Ok(true);
                };
                if row.state == "complete" {
                    return Ok(true);
                }
                if row.state == "active" {
                    ensure!(row.fingerprint == old, "registered connection changed unexpectedly");
                    let tx = conn.transaction()?;
                    tx.execute(
                        "UPDATE plugin_registrations SET state = 'terminal', token_hash = NULL, request_id = ?3,
                    intent = ?4, result_fingerprint = ?5, deadline = ?6 WHERE owner_id = ?1 AND connection_id = ?2",
                        params![
                            self.owner,
                            connection,
                            hex::encode(random_bytes::<32>()),
                            intent,
                            result,
                            now.saturating_add(5)
                        ],
                    )?;
                    tx.commit()?;
                    self.work.cut(Cut(vec![connection.into()]));
                    return Ok(false);
                }
                ensure!(
                    row.fingerprint == old
                        && row.intent.as_deref() == Some(intent),
                    "conflicting registered connection mutation"
                );
                // A matching credential retry seals the same logical value
                // with a fresh nonce. Persist its exact result before core
                // commits, so recovery can still compare the committed blob.
                if row.state == "disposed" && row.result_fingerprint.as_deref() != Some(result) {
                    conn.execute("UPDATE plugin_registrations SET result_fingerprint = ?3 WHERE owner_id = ?1 AND connection_id = ?2",params![self.owner,connection,result])?;
                }
                Ok(row.state == "disposed" || row.state == "complete")
            })?
            .unwrap_or(!anchored);
        ensure!(allowed, PendingMutation);
        Ok(())
    }
    pub fn complete_in(&self, core: &Connection, connection: &str) -> Result<()> {
        self.with(false, |conn| {
            if let Some(row) = Self::row(conn, &self.owner, connection)?
                && row.state == "disposed"
                && row.result_fingerprint.as_deref() == Some(&fingerprint(core, &self.owner, connection)?)
            {
                if row.result_fingerprint.as_deref() == Some("deleted") {
                    conn.execute(
                        "DELETE FROM plugin_registrations WHERE owner_id = ?1 AND connection_id = ?2",
                        params![self.owner, connection],
                    )?;
                    core.execute(
                        "DELETE FROM settings WHERE owner_id = ?1 AND key = ?2",
                        params![self.owner, format!("plugin_epoch:{connection}")],
                    )?;
                } else {
                    conn.execute(
                        "UPDATE plugin_registrations SET state = 'complete', epoch = '', start_event = 0,
                         fingerprint = '', internal_network = 0, intent = NULL, result_fingerprint = NULL,
                         deadline = NULL WHERE owner_id = ?1 AND connection_id = ?2",
                        params![self.owner, connection],
                    )?;
                }
            }
            Ok(())
        })?;
        Ok(())
    }

    pub fn mount_added_in(&self, core: &Transaction<'_>, connection: &str, old: &str) -> Result<()> {
        self.with(false, |conn| {
            let Some(row) = Self::row(conn, &self.owner, connection)? else {
                return Ok(());
            };
            if row.state == "complete" {
                return Ok(());
            }
            ensure!(
                row.state == "active" && row.fingerprint == old,
                "registered connection is fenced"
            );
            let tx = conn.transaction()?;
            let mut stmt = core.prepare(
                "SELECT s.id FROM sessions s WHERE s.owner_id = ?1 AND s.hat_id = ?2
                AND (s.lifecycle IN ('starting','active') OR s.presumed_parked = 1)
                AND EXISTS(SELECT 1 FROM gw_mounts m JOIN hosts h ON h.id = m.host_id AND h.owner_id = ?1
                    WHERE m.owner_id = ?1 AND m.connection_id = ?3 AND m.host_id = s.host_id AND h.revoked_at IS NULL)",
            )?;
            for session in stmt.query_map(params![self.owner, row.grant.hat_id, connection], |r| {
                r.get::<_, String>(0)
            })? {
                bind(core, &tx, &self.owner, &row.grant.hat_id, &session?)?;
            }
            tx.execute(
                "UPDATE plugin_registrations SET fingerprint = ?3 WHERE owner_id = ?1 AND connection_id = ?2",
                params![self.owner, connection, fingerprint(core, &self.owner, connection)?],
            )?;
            tx.commit()?;
            Ok(())
        })?;
        Ok(())
    }

    /// Pending snapshots stay pinned to the old endpoint and original total
    /// deadline. They are opened only for collector lifecycle traffic.
    pub(crate) fn pending_in(&self, _: &Transaction<'_>, id: &str, key: &MasterKey) -> Result<Option<ForgetWork>> {
        self.with(false, |conn| {
            let Some(row) = Self::row(conn, &self.owner, id)? else {
                return Ok(None);
            };
            if row.state != "terminal" {
                return Ok(None);
            }
            self.work.cut(Cut(vec![id.into()]));
            let aad = serde_json::to_string(&(&self.owner, &row.grant.hat_id, id, &row.grant.epoch))?;
            let secret = crypto::open(
                key,
                &aad,
                LIFECYCLE_FIELD,
                key.version(),
                row.lifecycle.as_deref().context("missing lifecycle snapshot")?,
            )?;
            let secret = zeroize::Zeroizing::new(String::from_utf8(secret.to_vec())?);
            Ok(Some(ForgetWork {
                connection_id: id.into(),
                hat_id: row.grant.hat_id,
                epoch: row.grant.epoch,
                endpoint: row.endpoint.context("missing lifecycle destination")?,
                secret,
                internal_network: row.internal_network,
                request_id: row.request_id.context("missing forget id")?,
                deadline: row.deadline.context("missing forget deadline")?,
            }))
        })
        .map(Option::flatten)
    }
    pub(crate) fn dispose_in(&self, _: &Transaction<'_>, work: &ForgetWork, confirmed: bool) -> Result<()> {
        self.with(false, |conn| {
            let tx = conn.transaction()?;
            let changed = tx.execute(
                "UPDATE plugin_registrations SET state = 'disposed',endpoint = NULL,lifecycle = NULL,
                token_hash = NULL,activity = 0,startup = 0,cursor_key = '' WHERE owner_id = ?1 AND connection_id = ?2
                AND state = 'terminal' AND request_id = ?3",
                params![self.owner, work.connection_id, work.request_id],
            )?;
            if changed == 1 {
                self.erase_rotation_in(&tx, &work.connection_id)?;
                self.erase_inventory_in(&tx, &work.connection_id)?;
                tx.execute(
                    "INSERT INTO plugin_receipts(owner_id,hat_id,request_id,result) VALUES(?1,?2,?3,?4)",
                    params![
                        self.owner,
                        work.hat_id,
                        work.request_id,
                        if confirmed { "confirmed" } else { "unconfirmed" }
                    ],
                )?;
            }
            tx.commit()?;
            Ok(())
        })?;
        Ok(())
    }
    pub(crate) fn registered_ids_in(&self, _: &Transaction<'_>, hat: Option<&str>) -> Result<Vec<String>> {
        Ok(self
            .with(false, |conn| {
                let mut stmt = conn.prepare(
                    "SELECT connection_id FROM plugin_registrations WHERE owner_id = ?1 AND (?2 IS NULL OR hat_id = ?2)",
                )?;
                Ok(stmt
                    .query_map(params![self.owner, hat], |r| r.get(0))?
                    .collect::<rusqlite::Result<_>>()?)
            })?
            .unwrap_or_default())
    }
    /// Recovery does not invent edits: disposed transitions can be completed
    /// only when their intended fingerprint is already present in core.
    pub(crate) fn reconcile_in(&self, core: &Transaction<'_>, now: i64) -> Result<()> {
        for id in self.registered_ids_in(core, None)? {
            self.with(false, |conn| {
                let row = Self::row(conn, &self.owner, &id)?.context("registration disappeared")?;
                if row.state == "active"
                    && (row.fingerprint != fingerprint(core, &self.owner, &id)?
                        || epoch_anchor(core, &self.owner, &id)?.as_deref() != Some(&row.grant.epoch)
                        || !scope_live(core, &self.owner, &id, &row.grant.hat_id)?)
                {
                    conn.execute(
                        "UPDATE plugin_registrations SET state = 'terminal',token_hash = NULL,request_id = ?3,
                        intent = 'recovery',result_fingerprint = ?4,deadline = ?5 WHERE owner_id = ?1 AND connection_id = ?2",
                        params![
                            self.owner,
                            id,
                            hex::encode(random_bytes::<32>()),
                            fingerprint(core, &self.owner, &id)?,
                            now.saturating_add(5)
                        ],
                    )?;
                }
                if row.state != "active" {
                    self.work.cut(Cut(vec![id.clone()]));
                }
                Ok(())
            })?;
            self.complete_in(core, &id)?;
        }
        Ok(())
    }
}

pub(crate) struct ForgetWork {
    pub connection_id: String,
    pub hat_id: String,
    pub epoch: String,
    pub endpoint: String,
    pub secret: zeroize::Zeroizing<String>,
    pub internal_network: bool,
    pub request_id: String,
    pub deadline: i64,
}
fn epoch_anchor(core: &Connection, owner: &str, id: &str) -> Result<Option<String>> {
    Ok(core
        .query_row(
            "SELECT value FROM settings WHERE owner_id = ?1 AND key = ?2",
            params![owner, format!("plugin_epoch:{id}")],
            |r| r.get(0),
        )
        .optional()?)
}

fn bind(core: &Transaction<'_>, tx: &Transaction<'_>, owner: &str, hat: &str, session: &str) -> Result<()> {
    verify_generation(core, tx, owner, hat)?;
    let inserted = tx.execute(
        "INSERT INTO plugin_bindings(owner_id,hat_id,session_id) VALUES(?1,?2,?3)
        ON CONFLICT(owner_id,session_id) DO NOTHING",
        params![owner, hat, session],
    )?;
    if inserted == 1 {
        record_generation(core, tx, owner, hat)?;
    }
    let stored: String = tx.query_row(
        "SELECT hat_id FROM plugin_bindings WHERE owner_id = ?1 AND session_id = ?2",
        params![owner, session],
        |r| r.get(0),
    )?;
    ensure!(stored == hat, "session already exposed in another hat");
    Ok(())
}
pub fn is_activity_token(token: &str) -> bool {
    token
        .strip_prefix(ACTIVITY_PREFIX)
        .is_some_and(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)))
}

pub(crate) fn secret_intent(key: &MasterKey, id: &str, operation: &str, payload: &[u8]) -> String {
    use hmac::{Hmac, Mac};
    let mut mac = Hmac::<sha2::Sha256>::new_from_slice(key.bytes()).expect("master key length");
    for bytes in [id.as_bytes(), operation.as_bytes(), payload] {
        mac.update(&(bytes.len() as u64).to_be_bytes());
        mac.update(bytes);
    }
    hex::encode(mac.finalize().into_bytes())
}
fn scope_live(core: &Connection, owner: &str, connection: &str, hat: &str) -> Result<bool> {
    Ok(core.query_row(
        "SELECT EXISTS(SELECT 1 FROM gw_connections c JOIN hats h ON h.id = c.hat_id AND h.owner_id = ?1
        WHERE c.owner_id = ?1 AND c.id = ?2 AND c.hat_id = ?3
        AND NOT EXISTS(SELECT 1 FROM purged_hats p WHERE p.owner_id = ?1 AND p.hat_id = ?3)
        AND EXISTS(SELECT 1 FROM gw_mounts m JOIN hosts x ON x.id = m.host_id AND x.owner_id = ?1
            WHERE m.owner_id = ?1 AND m.connection_id = c.id AND x.revoked_at IS NULL))",
        params![owner, connection, hat],
        |r| r.get(0),
    )?)
}
/// Stable security fingerprint, excluding health observations and timestamps.
pub(crate) fn fingerprint(core: &Connection, owner: &str, id: &str) -> Result<String> {
    let json: Option<String> = core
        .query_row(
            "SELECT json_array(c.id,c.hat_id,c.slug,c.label,c.url,c.cred_kind,c.static_header,c.static_prefix,
        c.tool_allowlist,c.internal_network,c.accepted_resource,hex(k.ciphertext),
        (SELECT json_array(o.client_id,hex(o.client_secret_ciphertext),o.issuer,o.token_endpoint,
            o.token_endpoint_auth_method,o.resource,o.scopes,o.pending_client_id,hex(o.pending_secret_ciphertext),
            o.pending_issuer,o.pending_token_endpoint) FROM gw_oauth_clients o WHERE o.owner_id = ?1 AND o.connection_id = c.id)) FROM gw_connections c
        LEFT JOIN gw_credentials k ON k.connection_id = c.id AND k.owner_id = ?1 WHERE c.owner_id = ?1 AND c.id = ?2",
            params![owner, id],
            |r| r.get(0),
        )
        .optional()?;
    let Some(json) = json else { return Ok("deleted".into()) };
    let mut stmt =
        core.prepare("SELECT host_id FROM gw_mounts WHERE owner_id = ?1 AND connection_id = ?2 ORDER BY host_id")?;
    let hosts = stmt
        .query_map(params![owner, id], |r| r.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(sha256_hex(serde_json::to_string(&(json, hosts))?.as_bytes()))
}

/// Fixed, bounded collector-only JSON-RPC. No response/error text is logged.
pub(crate) struct RpcCall<'a> {
    pub endpoint: &'a str,
    pub internal: bool,
    pub credential: &'a str,
    pub request_id: &'a str,
    pub method: &'a str,
    pub params: serde_json::Value,
}
pub(crate) async fn rpc<T: serde::de::DeserializeOwned>(
    runtime: &crate::runtime::Runtime,
    call: RpcCall<'_>,
    deadline: std::time::Duration,
) -> Result<T> {
    let RpcCall {
        endpoint,
        internal,
        credential,
        request_id,
        method,
        params,
    } = call;
    use futures::StreamExt;
    #[derive(serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Answer<T> {
        jsonrpc: String,
        id: String,
        result: T,
    }
    let work = async {
        let url = url::Url::parse(endpoint)?;
        let mut request = reqwest::Request::new(reqwest::Method::POST, url);
        request
            .headers_mut()
            .insert(reqwest::header::CONTENT_TYPE, "application/json".parse()?);
        request
            .headers_mut()
            .insert(reqwest::header::AUTHORIZATION, format!("Bearer {credential}").parse()?);
        *request.body_mut() = Some(
            serde_json::to_vec(&serde_json::json!({"jsonrpc":"2.0","id":request_id,"method":method,"params":params}))?
                .into(),
        );
        let response = runtime.client(internal).send(request).await?;
        ensure!(response.status().is_success(), "plug-in refused operation");
        ensure!(
            response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|h| h.to_str().ok())
                .is_some_and(|h| h
                    .split(';')
                    .next()
                    .is_some_and(|h| h.trim().eq_ignore_ascii_case("application/json"))),
            "plug-in response type refused"
        );
        let mut stream = response.bytes_stream();
        let mut bytes = Vec::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            ensure!(
                bytes.len().saturating_add(chunk.len()) <= 16 * 1024,
                "plug-in response too large"
            );
            bytes.extend_from_slice(&chunk);
        }
        let answer: Answer<T> = serde_json::from_slice(&bytes).context("invalid plug-in response")?;
        ensure!(
            answer.jsonrpc == "2.0" && answer.id == request_id,
            "plug-in response identity mismatch"
        );
        Ok(answer.result)
    };
    tokio::time::timeout(deadline, work)
        .await
        .context("plug-in operation timed out")?
}

fn forget_budget(deadline: i64, now: std::time::SystemTime) -> std::time::Duration {
    let Ok(seconds) = u64::try_from(deadline) else {
        return std::time::Duration::ZERO;
    };
    let Some(at) = std::time::UNIX_EPOCH.checked_add(std::time::Duration::from_secs(seconds)) else {
        return std::time::Duration::ZERO;
    };
    at.duration_since(now)
        .unwrap_or_default()
        .min(std::time::Duration::from_secs(5))
}

impl crate::runtime::Runtime {
    pub async fn purge_plugins(&self, hat: &str) -> Result<()> {
        let ids = {
            let mut conn = self.store.conn();
            let tx = conn.transaction()?;
            let mut ids = {
                let mut stmt = tx.prepare("SELECT id FROM gw_connections WHERE owner_id = ?1 AND hat_id = ?2")?;
                stmt.query_map(params![self.store.owner_id(), hat], |r| r.get::<_, String>(0))?
                    .collect::<rusqlite::Result<Vec<_>>>()?
            };
            let prepared = self
                .store
                .plugins()
                .prepare_purge_in(&tx, hat, hennery_kernel::secret::unix_now());
            let cut = Cut(crate::tokens::hat_hashes_in(&tx, self.store.owner_id(), hat)?);
            crate::tokens::revoke_hat_in(&tx, self.store.owner_id(), hat, hennery_kernel::secret::unix_now())?;
            tx.commit()?;
            self.revocations.cut(cut);
            match prepared {
                Ok(registered) => ids.extend(registered),
                Err(err) => {
                    self.store.plugins().cut_all();
                    return Err(err);
                }
            }
            self.store.plugins().cut_connections(&ids);
            ids.sort();
            ids.dedup();
            ids
        };
        for id in ids {
            self.settle_plugin(&id).await?;
        }
        Ok(())
    }
    pub async fn settle_plugin(&self, id: &str) -> Result<()> {
        let control = self.store.plugins();
        let pending = {
            let mut conn = self.store.conn();
            let tx = conn.transaction()?;
            let pending = control.pending_in(&tx, id, &self.key)?;
            tx.commit()?;
            pending
        };
        let Some(work) = pending else { return Ok(()) };
        let remaining = forget_budget(work.deadline, std::time::SystemTime::now());
        let receipt = if !remaining.is_zero() {
            rpc::<hennery_proto::plugin::ForgetReceipt>(
                self,
                RpcCall {
                    endpoint: &work.endpoint,
                    internal: work.internal_network,
                    credential: &work.secret,
                    request_id: &work.request_id,
                    method: "hennery_plugin_forget",
                    params: serde_json::json!({
                    "request_id":work.request_id,"namespace_epoch":work.epoch,"target":{"kind":"scope"}}),
                },
                remaining,
            )
            .await
            .ok()
        } else {
            None
        };
        let confirmed = receipt.is_some_and(|r| {
            r.request_id == work.request_id
                && r.status == hennery_proto::plugin::ForgetStatus::Confirmed
                && r.remaining_kinds.is_empty()
        });
        let mut conn = self.store.conn();
        let tx = conn.transaction()?;
        control.dispose_in(&tx, &work, confirmed)?;
        tx.commit()?;
        Ok(())
    }
    /// Execute a store entry point. Its first attempt durably fences the old
    /// registration, and rolls back core; its matching retry may commit only
    /// after deletion disposition and snapshot erasure are durable.
    pub async fn plugin_mutation<T>(&self, id: &str, mut mutate: impl FnMut() -> Result<T>) -> Result<T> {
        match mutate() {
            Err(err) if err.is::<PendingMutation>() => {
                self.settle_plugin(id).await?;
                mutate()
            }
            result => result,
        }
    }
    pub async fn recover_plugins(&self) -> Result<()> {
        let frozen = {
            let conn = self.store.conn();
            let anchored: bool = conn.query_row(
                "SELECT EXISTS(SELECT 1 FROM settings WHERE owner_id = ?1 AND key LIKE 'plugin_epoch:%')",
                [self.store.owner_id()],
                |r| r.get(0),
            )?;
            let configured = self.store.plugins().configured()?;
            ensure!(configured || !anchored, "plug-in control database missing");
            if !configured {
                return Ok(());
            }
            let mut stmt = conn.prepare("SELECT hat_id FROM purged_hats WHERE owner_id = ?1")?;
            stmt.query_map([self.store.owner_id()], |r| r.get::<_, String>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        // Frozen hats always take the coordinator's early token/cancellation
        // phase before any recovery path can send a forget request.
        for hat in frozen {
            self.purge_plugins(&hat).await?;
        }
        let ids = {
            let mut conn = self.store.conn();
            let tx = conn.transaction()?;
            self.store
                .plugins()
                .reconcile_in(&tx, hennery_kernel::secret::unix_now())?;
            let ids = self.store.plugins().registered_ids_in(&tx, None)?;
            tx.commit()?;
            ids
        };
        for id in ids {
            self.settle_plugin(&id).await?;
        }
        Ok(())
    }
}

fn verify_generation(core: &Connection, control: &Connection, owner: &str, hat: &str) -> Result<()> {
    ensure!(
        generation_matches(core, control, owner, hat)?,
        "plug-in binding restore mismatch"
    );
    Ok(())
}
fn generation_matches(core: &Connection, control: &Connection, owner: &str, hat: &str) -> Result<bool> {
    let expected: Option<String> = core
        .query_row(
            "SELECT value FROM settings WHERE owner_id = ?1 AND key = ?2",
            params![owner, format!("plugin_generation:{hat}")],
            |r| r.get(0),
        )
        .optional()?;
    let actual: Option<String> = control
        .query_row(
            "SELECT generation FROM plugin_generations WHERE owner_id = ?1 AND hat_id = ?2",
            params![owner, hat],
            |r| r.get(0),
        )
        .optional()?;
    Ok(expected == actual)
}
fn record_generation(core: &Transaction<'_>, control: &Transaction<'_>, owner: &str, hat: &str) -> Result<()> {
    let generation = hex::encode(random_bytes::<32>());
    control.execute(
        "INSERT INTO plugin_generations(owner_id,hat_id,generation) VALUES(?1,?2,?3)
        ON CONFLICT(owner_id,hat_id) DO UPDATE SET generation = excluded.generation",
        params![owner, hat, generation],
    )?;
    core.execute(
        "INSERT INTO settings(owner_id,key,value) VALUES(?1,?2,?3)
        ON CONFLICT(owner_id,key) DO UPDATE SET value = excluded.value",
        params![owner, format!("plugin_generation:{hat}"), generation],
    )?;
    Ok(())
}

#[cfg(test)]
mod deadline_tests {
    use super::forget_budget;
    use std::time::{Duration, UNIX_EPOCH};

    #[test]
    fn recovery_budget_never_rounds_past_the_persisted_absolute_deadline() {
        assert_eq!(
            forget_budget(105, UNIX_EPOCH + Duration::from_millis(100_900)),
            Duration::from_millis(4100)
        );
        assert_eq!(
            forget_budget(105, UNIX_EPOCH + Duration::from_millis(104_800)),
            Duration::from_millis(200)
        );
        assert_eq!(
            forget_budget(105, UNIX_EPOCH + Duration::from_millis(105_001)),
            Duration::ZERO
        );
        assert_eq!(forget_budget(-1, UNIX_EPOCH), Duration::ZERO);
        assert_eq!(
            forget_budget(1100, UNIX_EPOCH + Duration::from_millis(100_100)),
            Duration::from_secs(5)
        );
    }
}
