//! Opaque, expiring source-inventory snapshots. Only authenticated source ids,
//! never transcript bodies, are retained in the optional control database.

use super::*;
use serde::{Deserialize, Serialize};

pub const INVENTORY_MAX_IDS: usize = 500;
pub const INVENTORY_PAGE_BYTES: usize = 128 * 1024;
const INVENTORY_IDLE_SECS: i64 = 60;
const INVENTORY_ABSOLUTE_SECS: i64 = 20 * 60;
// Two cursor strings (each at most 2048 bytes), watermark/resume identity
// and the envelope fit here. The complete typed page is checked as well.
const INVENTORY_ENVELOPE_BYTES: usize = 8192;

pub const INVENTORY_MIGRATIONS: &[&str] = &[
    "
CREATE TABLE plugin_inventory (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, connection_id TEXT NOT NULL,
    epoch TEXT NOT NULL, snapshot TEXT NOT NULL, watermark INTEGER NOT NULL,
    expires INTEGER NOT NULL, resume_cursor TEXT NOT NULL, PRIMARY KEY(owner_id, connection_id));
CREATE TABLE plugin_inventory_sources (
    owner_id TEXT NOT NULL, hat_id TEXT NOT NULL, connection_id TEXT NOT NULL,
    snapshot TEXT NOT NULL, session_id TEXT NOT NULL,
    PRIMARY KEY(owner_id, connection_id, snapshot, session_id));
",
    "
ALTER TABLE plugin_inventory ADD COLUMN deadline INTEGER NOT NULL DEFAULT 0;
",
];

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Position {
    snapshot: String,
    after: String,
}

pub struct InventorySlice {
    pub source_ids: Vec<String>,
    pub next_cursor: Option<String>,
    pub watermark: i64,
    pub resume_cursor: String,
    pub expires: i64,
}

impl Control {
    /// Terminal disposition/restore repair calls this within its already-open
    /// control transaction, after taking the owner gate and core transaction.
    pub fn erase_inventory_in(&self, conn: &Connection, connection: &str) -> Result<()> {
        if conn.table_exists(None, "plugin_inventory")? {
            conn.execute(
                "DELETE FROM plugin_inventory_sources WHERE owner_id = ?1 AND connection_id = ?2",
                params![self.owner, connection],
            )?;
            conn.execute(
                "DELETE FROM plugin_inventory WHERE owner_id = ?1 AND connection_id = ?2",
                params![self.owner, connection],
            )?;
        }
        Ok(())
    }

    /// Purge calls this under its core transaction. Do not create a feed
    /// component for a namespace that never used source inventories.
    pub fn clear_feed_in(&self, _: &Transaction<'_>, hat: &str) -> Result<()> {
        self.with(false, |conn| {
            if conn.table_exists(None, "plugin_inventory")? {
                let tx = conn.transaction()?;
                tx.execute(
                    "DELETE FROM plugin_inventory_sources WHERE owner_id = ?1 AND hat_id = ?2",
                    params![self.owner, hat],
                )?;
                tx.execute(
                    "DELETE FROM plugin_inventory WHERE owner_id = ?1 AND hat_id = ?2",
                    params![self.owner, hat],
                )?;
                tx.commit()?;
            }
            Ok(())
        })?;
        Ok(())
    }

    /// Subscribe while the caller holds the owner gate and core transaction.
    pub fn watch_grant_in(&self, core: &Transaction<'_>, token: &str, now: i64) -> Result<Watch> {
        let grant = self
            .authenticate_in(core, token, now)?
            .context("plug-in access denied")?;
        Ok(self.work.watch(&grant.connection_id))
    }

    pub fn begin_inventory_in(
        &self,
        _: &Transaction<'_>,
        grant: &Grant,
        watermark: i64,
        ids: impl IntoIterator<Item = Result<String>>,
        now: i64,
    ) -> Result<String> {
        let snapshot = hex::encode(random_bytes::<32>());
        let resume = self.encode_cursor(grant, watermark)?;
        self.with(false, |conn| {
            db::migrate_component(conn, "plugin_inventory", INVENTORY_MIGRATIONS)?;
            let tx = conn.transaction()?;
            tx.execute(
                "DELETE FROM plugin_inventory_sources WHERE owner_id = ?1 AND connection_id = ?2",
                params![self.owner, grant.connection_id],
            )?;
            tx.execute(
                "DELETE FROM plugin_inventory WHERE owner_id = ?1 AND connection_id = ?2",
                params![self.owner, grant.connection_id],
            )?;
            tx.execute(
                "INSERT INTO plugin_inventory(owner_id,hat_id,connection_id,epoch,snapshot,watermark,expires,resume_cursor,deadline)
                VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                params![
                    self.owner,
                    grant.hat_id,
                    grant.connection_id,
                    grant.epoch,
                    snapshot,
                    watermark,
                    now.saturating_add(INVENTORY_IDLE_SECS),
                    resume,
                    now.saturating_add(INVENTORY_ABSOLUTE_SECS)
                ],
            )?;
            for id in ids {
                tx.execute(
                    "INSERT INTO plugin_inventory_sources(owner_id,hat_id,connection_id,snapshot,session_id)
                    VALUES(?1,?2,?3,?4,?5)",
                    params![self.owner, grant.hat_id, grant.connection_id, snapshot, id?],
                )?;
            }
            tx.commit()?;
            Ok(())
        })?
        .context("plug-in access denied")?;
        self.inventory_cursor(
            grant,
            &Position {
                snapshot,
                after: String::new(),
            },
        )
    }

    pub fn inventory_slice_in(
        &self,
        _: &Transaction<'_>,
        grant: &Grant,
        cursor: &str,
        limit: usize,
        now: i64,
    ) -> Result<InventorySlice> {
        ensure!(
            (1..=INVENTORY_MAX_IDS).contains(&limit),
            "invalid plug-in inventory limit"
        );
        let position = self
            .inventory_position(grant, cursor)
            .map_err(|_| anyhow::anyhow!("reset_required"))?;
        self.with(false, |conn| {
            db::migrate_component(conn, "plugin_inventory", INVENTORY_MIGRATIONS)?;
            let tx = conn.transaction()?;
            let row: Option<(i64, i64, String)> = tx
                .query_row(
                    "UPDATE plugin_inventory
                SET expires = min(?7, deadline)
                WHERE owner_id = ?1 AND hat_id = ?2 AND connection_id = ?3 AND epoch = ?4 AND snapshot = ?5
                AND expires > ?6 AND deadline > ?6
                RETURNING watermark,expires,resume_cursor",
                    params![
                        self.owner,
                        grant.hat_id,
                        grant.connection_id,
                        grant.epoch,
                        position.snapshot,
                        now,
                        now.saturating_add(INVENTORY_IDLE_SECS)
                    ],
                    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                )
                .optional()?;
            let (watermark, expires, resume_cursor) = row.context("reset_required")?;
            let mut stmt = tx.prepare(
                "SELECT session_id FROM plugin_inventory_sources
                WHERE owner_id = ?1 AND hat_id = ?2 AND connection_id = ?3 AND snapshot = ?4 AND session_id > ?5
                ORDER BY session_id LIMIT ?6",
            )?;
            let mut rows = stmt.query_map(
                params![
                    self.owner,
                    grant.hat_id,
                    grant.connection_id,
                    position.snapshot,
                    position.after,
                    limit as i64 + 1
                ],
                |r| r.get::<_, String>(0),
            )?;
            let mut ids = Vec::new();
            let mut bytes = 2usize;
            let mut has_more = false;
            for id in rows.by_ref() {
                let id = id?;
                let weight = serde_json::to_vec(&id)?.len().saturating_add(1);
                if ids.len() == limit || bytes.saturating_add(weight) > INVENTORY_PAGE_BYTES - INVENTORY_ENVELOPE_BYTES
                {
                    has_more = true;
                    break;
                }
                bytes += weight;
                ids.push(id);
            }
            ensure!(!has_more || !ids.is_empty(), "reset_required");
            let next_cursor = if has_more {
                Some(self.inventory_cursor(
                    grant,
                    &Position {
                        snapshot: position.snapshot,
                        after: ids.last().cloned().context("reset_required")?,
                    },
                )?)
            } else {
                None
            };
            ensure!(next_cursor.as_ref().is_none_or(|c| c.len() <= 2048), "reset_required");
            let page = hennery_proto::plugin::PluginSourceInventoryPage {
                version: 1,
                source_ids: ids.clone(),
                next_cursor: next_cursor.clone(),
                resume_cursor: resume_cursor.clone(),
                watermark: resume_cursor.clone(),
                lease_until: expires,
            };
            ensure!(
                serde_json::to_vec(&page)?.len() <= INVENTORY_PAGE_BYTES,
                "reset_required"
            );
            drop(rows);
            drop(stmt);
            tx.commit()?;
            Ok(InventorySlice {
                source_ids: ids,
                next_cursor,
                watermark,
                expires,
                resume_cursor,
            })
        })?
        .context("reset_required")
    }

    fn inventory_cursor(&self, grant: &Grant, position: &Position) -> Result<String> {
        let bytes: [u8; 32] = hex::decode(&grant.cursor_key)?
            .try_into()
            .map_err(|_| anyhow::anyhow!("reset_required"))?;
        let key = MasterKey::from_bytes(bytes);
        let aad = serde_json::to_string(&(&self.owner, &grant.hat_id, &grant.connection_id, &grant.epoch))?;
        Ok(hex::encode(crypto::seal(
            &key,
            &aad,
            "plugin.inventory",
            &serde_json::to_vec(position)?,
        )))
    }
    fn inventory_position(&self, grant: &Grant, cursor: &str) -> Result<Position> {
        ensure!(cursor.len() <= 2048, "reset_required");
        let bytes: [u8; 32] = hex::decode(&grant.cursor_key)?
            .try_into()
            .map_err(|_| anyhow::anyhow!("reset_required"))?;
        let key = MasterKey::from_bytes(bytes);
        let aad = serde_json::to_string(&(&self.owner, &grant.hat_id, &grant.connection_id, &grant.epoch))?;
        let opened = crypto::open(&key, &aad, "plugin.inventory", key.version(), &hex::decode(cursor)?)?;
        Ok(serde_json::from_slice(&opened)?)
    }
}
