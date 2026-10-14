//! Explicit owner recovery preserves possible exposure. Normal admission
//! never repairs a mismatch or guesses a lost remote deletion credential.
use super::*;
use hennery_proto::plugin_management::PluginRecoveryConfirmation;

impl Control {
    pub fn repair_registration_in(
        &self,
        core: &Transaction<'_>,
        connection: &str,
        consent: &PluginRecoveryConfirmation,
        now: i64,
    ) -> Result<()> {
        ensure!(
            consent.new_empty_namespace && consent.unresolved_external_copy_acknowledged,
            "explicit namespace recovery confirmation required"
        );
        let hat: String = core.query_row(
            "SELECT hat_id FROM gw_connections WHERE owner_id = ?1 AND id = ?2",
            params![self.owner, connection],
            |r| r.get(0),
        )?;
        ensure!(
            scope_live(core, &self.owner, connection, &hat)?,
            "plug-in scope unavailable"
        );
        self.with(true, |conn| {
            let tx = conn.transaction()?;
            if !generation_matches(core, &tx, &self.owner, &hat)? {
                // Replacing a hat-wide generation must not revive any sibling
                // epoch. Empty anchors cannot match issued epochs; each
                // connection stays fenced until its own namespace is renewed.
                let mut stmt = core.prepare(
                    "UPDATE settings SET value = '' WHERE owner_id = ?1 AND key IN
                    (SELECT 'plugin_epoch:' || id FROM gw_connections WHERE owner_id = ?1 AND hat_id = ?2)
                    RETURNING key",
                )?;
                let ids = stmt
                    .query_map(params![self.owner, hat], |r| r.get::<_, String>(0))?
                    .map(|key| key.map(|key| key.trim_start_matches("plugin_epoch:").to_string()))
                    .collect::<rusqlite::Result<Vec<_>>>()?;
                self.work.cut(Cut(ids));
            }
            // Preserve every surviving binding. Missing backup state can only
            // be repaired by binding every kept session, including closed ones.
            let mut stmt =
                core.prepare("SELECT id FROM sessions WHERE owner_id = ?1 AND hat_id = ?2 AND lifecycle <> 'deleted'")?;
            for session in stmt.query_map(params![self.owner, hat], |r| r.get::<_, String>(0))? {
                let session = session?;
                let previous: Option<String> = tx
                    .query_row(
                        "SELECT hat_id FROM plugin_bindings WHERE owner_id = ?1 AND session_id = ?2",
                        params![self.owner, session],
                        |r| r.get(0),
                    )
                    .optional()?;
                ensure!(
                    previous.as_ref().is_none_or(|bound| bound == &hat),
                    "conflicting exposure binding"
                );
                tx.execute(
                    "INSERT OR IGNORE INTO plugin_bindings(owner_id,hat_id,session_id) VALUES(?1,?2,?3)",
                    params![self.owner, hat, session],
                )?;
            }
            record_generation(core, &tx, &self.owner, &hat)?;
            let prior = Self::row(&tx, &self.owner, connection)?;
            let request = prior
                .as_ref()
                .and_then(|r| r.request_id.clone())
                .unwrap_or_else(|| hex::encode(random_bytes::<32>()));
            let evidence_hat = prior.as_ref().map(|r| r.grant.hat_id.as_str()).unwrap_or(&hat);
            tx.execute(
                "INSERT INTO plugin_receipts(owner_id,hat_id,request_id,result) VALUES(?1,?2,?3,'unconfirmed')
                ON CONFLICT(owner_id,request_id) DO NOTHING",
                params![self.owner, evidence_hat, request],
            )?;
            self.erase_rotation_in(&tx, connection)?;
            self.erase_inventory_in(&tx, connection)?;
            // The owner explicitly abandons the old external copy. No old
            // endpoint is reconstructed and no remote request is invented.
            tx.execute(
                "UPDATE plugin_registrations SET state = 'complete', token_hash = NULL, activity = 0,
                startup = 0, epoch = '', start_event = 0, fingerprint = '', endpoint = NULL,
                internal_network = 0, lifecycle = NULL, cursor_key = '', request_id = ?3,
                intent = NULL, result_fingerprint = NULL, deadline = NULL
                WHERE owner_id = ?1 AND connection_id = ?2",
                params![self.owner, connection, request],
            )?;
            tx.commit()?;
            Ok(())
        })?;
        self.work.cut(Cut(vec![connection.into()]));
        let _ = now;
        Ok(())
    }

    /// First commit removes stale core anchors. A crash can leave redundant
    /// control evidence, never a live session without its exposure binding.
    pub fn clear_purged_anchors_in(&self, core: &Transaction<'_>, hat: &str) -> Result<()> {
        ensure_purged(core, &self.owner, hat)?;
        for id in self.registered_ids_in(core, Some(hat))? {
            core.execute(
                "DELETE FROM settings WHERE owner_id = ?1 AND key = ?2",
                params![self.owner, format!("plugin_epoch:{id}")],
            )?;
        }
        core.execute(
            "DELETE FROM settings WHERE owner_id = ?1 AND key = ?2",
            params![self.owner, format!("plugin_generation:{hat}")],
        )?;
        Ok(())
    }

    /// All core session tombstones and gateway deletions are already durable.
    /// Retain only minimal owner/hat/request/result receipts.
    pub fn finish_hat_purge_in(&self, core: &Transaction<'_>, hat: &str) -> Result<()> {
        ensure_purged(core, &self.owner, hat)?;
        self.clear_feed_in(core, hat)?;
        self.with(false, |conn| {
            let tx = conn.transaction()?;
            let pending: bool = tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM plugin_registrations
                WHERE owner_id = ?1 AND hat_id = ?2 AND (lifecycle IS NOT NULL OR token_hash IS NOT NULL
                OR state NOT IN ('disposed','complete')))",
                params![self.owner, hat],
                |r| r.get(0),
            )?;
            ensure!(!pending, "plug-in deletion is not disposed");
            tx.execute(
                "DELETE FROM plugin_rotations WHERE owner_id = ?1 AND hat_id = ?2",
                params![self.owner, hat],
            )?;
            tx.execute(
                "DELETE FROM plugin_registrations WHERE owner_id = ?1 AND hat_id = ?2",
                params![self.owner, hat],
            )?;
            tx.execute(
                "DELETE FROM plugin_bindings WHERE owner_id = ?1 AND hat_id = ?2",
                params![self.owner, hat],
            )?;
            tx.execute(
                "DELETE FROM plugin_generations WHERE owner_id = ?1 AND hat_id = ?2",
                params![self.owner, hat],
            )?;
            tx.commit()?;
            Ok(())
        })?;
        Ok(())
    }
}

fn ensure_purged(core: &Connection, owner: &str, hat: &str) -> Result<()> {
    let complete: bool = core.query_row(
        "SELECT
        EXISTS(SELECT 1 FROM purged_hats WHERE owner_id = ?1 AND hat_id = ?2)
        AND NOT EXISTS(SELECT 1 FROM sessions WHERE owner_id = ?1 AND hat_id = ?2 AND lifecycle <> 'deleted')
        AND NOT EXISTS(SELECT 1 FROM gw_connections WHERE owner_id = ?1 AND hat_id = ?2)",
        params![owner, hat],
        |r| r.get(0),
    )?;
    ensure!(complete, "core purge is unfinished");
    Ok(())
}
