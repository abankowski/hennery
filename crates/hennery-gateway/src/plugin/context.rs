//! Generic collector-only startup operation. No session bearer or operator
//! input is sent to the upstream, and every namespace stays bound by C1.
use super::*;
use hennery_proto::plugin::{InputOrigin, PluginContext, StartupContext, StartupRecord, StartupStatus};
use std::time::Duration;

struct ContextWork {
    connection: String,
    epoch: String,
    endpoint: String,
    internal: bool,
    secret: zeroize::Zeroizing<String>,
    project: String,
    watch: Watch,
}

impl Control {
    fn startup_work_in(
        &self,
        core: &Transaction<'_>,
        session: &str,
        key: &MasterKey,
        supported: bool,
    ) -> Result<Option<ContextWork>> {
        let scope: Option<(String, String, String)> = core
            .query_row(
                "SELECT s.hat_id,s.host_id,s.cwd FROM sessions s WHERE s.owner_id = ?1 AND s.id = ?2
             AND s.lifecycle = 'active' AND s.close_requested = 0
             AND NOT EXISTS(SELECT 1 FROM turns t WHERE t.owner_id = ?1 AND t.session_id = s.id)
             AND NOT EXISTS(SELECT 1 FROM events e WHERE e.owner_id = ?1 AND e.session_id = s.id
                AND e.kind = 'operator_resumed' AND e.applied = 1)",
                params![self.owner, session],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()?;
        let Some((hat, host, cwd)) = scope else { return Ok(None) };
        self.require_control_for_hat(core, &hat)?;
        let snapshot=self.with(false, |conn| {
            let ids={
                let mut stmt=conn.prepare("SELECT connection_id FROM plugin_registrations
                    WHERE owner_id = ?1 AND hat_id = ?2 AND state = 'active' AND startup = 1 ORDER BY connection_id LIMIT 2")?;
                stmt.query_map(params![self.owner,hat],|r|r.get::<_,String>(0))?.collect::<rusqlite::Result<Vec<_>>>()?
            };
            ensure!(ids.len() <= 1,"multiple startup providers");
            let Some(id)=ids.first() else{return Ok(None)};
            let row=Self::row(conn,&self.owner,id)?.context("startup provider missing")?;
            let mounted:bool=core.query_row("SELECT EXISTS(SELECT 1 FROM gw_mounts m JOIN hosts h
                ON h.owner_id = ?1 AND h.id = m.host_id WHERE m.owner_id = ?1 AND m.connection_id = ?2
                AND m.host_id = ?3 AND h.revoked_at IS NULL)",params![self.owner,id,host],|r|r.get(0))?;
            if !mounted{return Ok(None)};
            let aad=serde_json::to_string(&(&self.owner,&hat,id,&row.grant.epoch))?;
            let secret=crypto::open(key,&aad,LIFECYCLE_FIELD,key.version(),row.lifecycle.as_deref().context("startup credential missing")?)?;
            let project=serde_json::to_string(&(host,cwd))?;
            Ok(Some((id.clone(),row.grant.epoch,row.endpoint.context("startup endpoint missing")?,row.internal_network,
                zeroize::Zeroizing::new(String::from_utf8(secret.to_vec())?),hennery_kernel::redact::text(&project).unwrap_or(project))))
        })?.flatten();
        let Some((connection, epoch, endpoint, internal, secret, project)) = snapshot else {
            return Ok(None);
        };
        let watch = if supported {
            self.admit_in(core, &connection, session, &hat)?
        } else {
            self.work.watch(&connection)
        };
        Ok(Some(ContextWork {
            connection,
            epoch,
            endpoint,
            internal,
            secret,
            project,
            watch,
        }))
    }

    /// Recheck the immutable namespace and current C1 scope, then preserve
    /// exposure before committing or synchronously dispatching a context.
    pub fn validate_context_in(&self, core: &Transaction<'_>, session: &str, block: &StartupContext) -> Result<Watch> {
        block.reference_text().map_err(anyhow::Error::msg)?;
        let hat = self
            .with(false, |conn| {
                let row = Self::row(conn, &self.owner, &block.connection_id)?.context("startup provider missing")?;
                ensure!(
                    row.state == "active" && row.grant.startup && row.grant.epoch == block.namespace_epoch,
                    "startup grant revoked"
                );
                Ok(row.grant.hat_id)
            })?
            .context("startup control missing")?;
        // scope_live may be kept alive by a different mounted host. Check
        // this session's actual host under the same gate at both boundaries.
        let target_live: bool = core.query_row(
            "SELECT EXISTS(SELECT 1 FROM sessions s JOIN hosts h
             ON h.owner_id = ?1 AND h.id = s.host_id
             WHERE s.owner_id = ?1 AND s.id = ?2 AND h.revoked_at IS NULL)",
            params![self.owner, session],
            |r| r.get(0),
        )?;
        ensure!(target_live, "startup target host revoked");
        self.admit_in(core, &block.connection_id, session, &hat)
    }
}

impl crate::runtime::Runtime {
    /// The caller reserves prompt admission across this bounded operation;
    /// no retry is issued once the first prompt has committed.
    pub async fn startup_context(&self, session: &str, request_id: &str, supported: bool) -> Option<StartupRecord> {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(2);
        let mut record = StartupRecord {
            request_id: request_id.into(),
            status: StartupStatus::Unavailable,
            block: None,
        };
        let work = {
            let mut conn = self.store.conn();
            let tx = match conn.transaction() {
                Ok(tx) => tx,
                Err(_) => return Some(record),
            };
            let work = self.store.plugins().startup_work_in(&tx, session, &self.key, supported);
            if tx.commit().is_err() {
                return Some(record);
            };
            match work {
                Ok(Some(work)) => work,
                Ok(None) => return None,
                Err(_) => return Some(record),
            }
        };
        if !supported {
            record.status = StartupStatus::Unsupported;
            return Some(record);
        }
        let cancelled = work.watch.token();
        let call = rpc::<PluginContext>(
            self,
            RpcCall {
                endpoint: &work.endpoint,
                internal: work.internal,
                credential: &work.secret,
                request_id,
                method: "hennery_plugin_context",
                params: serde_json::json!({"request_id":request_id,
                "namespace_epoch":work.epoch,"project_key":work.project}),
            },
            Duration::from_secs(5),
        );
        let result = tokio::select! {biased;
            _=cancelled.cancelled()=>{record.status=StartupStatus::Revoked;return Some(record)},
            result=tokio::time::timeout_at(deadline,call)=>result
        };
        let context = match result {
            Err(_) => {
                record.status = StartupStatus::TimedOut;
                return Some(record);
            }
            Ok(Err(_)) => return Some(record),
            Ok(Ok(context)) => match hennery_kernel::plugin_context::sanitize(context) {
                Ok(context) => context,
                Err(_) => return Some(record),
            },
        };
        if cancelled.is_cancelled() {
            record.status = StartupStatus::Revoked;
            return Some(record);
        }
        record.status = StartupStatus::Delivered;
        record.block = Some(StartupContext {
            request_id: request_id.into(),
            connection_id: work.connection,
            namespace_epoch: work.epoch,
            origin: InputOrigin::PluginContext {
                request_id: request_id.into(),
            },
            context,
        });
        Some(record)
    }
}
