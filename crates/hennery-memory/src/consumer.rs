//! Pull only from explicit C1 grants. Every late response is fenced against
//! the same namespace epoch/config/cursor revision under the store mutex.
use crate::store::{Entry, Inner, Namespace, Observation, Store, bounded, put};
use anyhow::{Context, Result, ensure};
use hennery_gateway::{crypto, key::MasterKey};
use hennery_kernel::{
    egress::{self, Allowance, Egress, Timeouts},
    redact,
    secret::{sha256_hex, unix_now},
};
use hennery_proto::{plugin::*, plugin_management::PluginLease};
use rusqlite::{OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::{
    sync::Arc,
    time::{Duration, Instant},
};
use url::Url;
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FeedConfig {
    pub collector_url: String,
    pub namespace_epoch: String,
    pub activity_token: String,
    pub activity: bool,
    #[serde(default)]
    pub internal_network: bool,
}
struct Job {
    id: String,
    epoch: String,
    revision: i64,
    cursor: Option<String>,
    config: FeedConfig,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Forget {
    pub request_id: String,
    pub namespace_epoch: String,
    pub target: Target,
}
#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Target {
    Scope,
    Session { session_id: String },
}
impl Drop for FeedConfig {
    fn drop(&mut self) {
        use zeroize::Zeroize;
        self.activity_token.zeroize();
    }
}
pub struct Consumer {
    egress: Egress,
    http: reqwest::Client,
}
impl Consumer {
    pub fn new() -> Result<Self> {
        Ok(Self {
            egress: Egress::new(Timeouts {
                connect: Duration::from_secs(3),
                request: Duration::from_secs(5),
            })?,
            http: reqwest::Client::new(),
        })
    }
    pub async fn poll(&self, store: &Store, key: &MasterKey, id: &str) -> Result<bool> {
        let job = store.job(key, id)?;
        let result = tokio::time::timeout(Duration::from_secs(30), self.run(store, &job)).await;
        match result {
            Ok(Ok(more)) => Ok(more),
            _ => {
                store.failed(&job, true);
                anyhow::bail!("activity unavailable")
            }
        }
    }
    async fn request(&self, job: &Job, path: &str, after: Option<&str>, post: bool) -> Result<Vec<u8>> {
        let mut url = Url::parse(&job.config.collector_url)?;
        url.set_path(path);
        if !post {
            let mut q = url.query_pairs_mut();
            q.append_pair("limit", "20");
            if let Some(c) = after {
                q.append_pair("after", c);
            }
        }
        let request = self
            .http
            .request(
                if post {
                    reqwest::Method::POST
                } else {
                    reqwest::Method::GET
                },
                url,
            )
            .bearer_auth(&job.config.activity_token)
            .build()?;
        let response = self
            .egress
            .client(if job.config.internal_network {
                Allowance::InternalNetwork
            } else {
                Allowance::PublicOnly
            })
            .send(request)
            .await?;
        let status = response.status();
        if status == reqwest::StatusCode::NOT_FOUND {
            anyhow::bail!("grant denied");
        }
        if status == reqwest::StatusCode::CONFLICT {
            anyhow::bail!("reset required");
        }
        ensure!(
            status.is_success()
                && response
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .is_some_and(|v| v.split(';').next() == Some("application/json")),
            "invalid activity response"
        );
        Ok(egress::read_capped(response, 128 * 1024).await?)
    }
    async fn run(&self, store: &Store, job: &Job) -> Result<bool> {
        let start = Instant::now();
        let began = unix_now();
        // Lease has an explicit epoch even for an empty feed. Never infer an epoch
        // from a caller's hints or accept an empty foreign-token response.
        let lease: PluginLease = match self.request(job, "/api/plugins/lease", None, true).await {
            Ok(bytes) => serde_json::from_slice(&bytes)?,
            Err(e) => {
                if e.to_string() == "grant denied" {
                    store.failed(job, true);
                }
                return Err(e);
            }
        };
        ensure!(lease.namespace_epoch == job.epoch, "epoch mismatch");
        let mut until = lease.lease_until.min(began + 60);
        ensure!(until > unix_now(), "expired lease");
        if !job.config.activity {
            store.renew(job, start, until)?;
            return Ok(false);
        }
        match self
            .request(job, "/api/plugins/activity", job.cursor.as_deref(), false)
            .await
        {
            Ok(bytes) => {
                let page: PluginActivityPage = serde_json::from_slice(&bytes)?;
                until = until.min(page.lease_until);
                let more = page.has_more;
                store.apply(job, page, start, until)?;
                Ok(more)
            }
            Err(e) => {
                if e.to_string() == "grant denied" {
                    store.failed(job, true);
                    return Err(e);
                }
                if e.to_string() != "reset required" {
                    return Err(e);
                }
                let mut after = None;
                let mut pages = 0;
                let mut ids = std::collections::BTreeSet::new();
                let mut marker = None;
                let mut resume = None;
                loop {
                    pages += 1;
                    ensure!(pages <= 512, "inventory page limit");
                    let bytes = self
                        .request(job, "/api/plugins/inventory", after.as_deref(), false)
                        .await?;
                    let page: PluginSourceInventoryPage = serde_json::from_slice(&bytes)?;
                    ensure!(
                        page.version == 1
                            && page.source_ids.len() <= 20
                            && page.watermark.len() <= 2048
                            && page.resume_cursor.len() <= 2048,
                        "invalid inventory"
                    );
                    if let Some(m) = &marker {
                        ensure!(
                            m == &page.watermark && resume.as_ref() == Some(&page.resume_cursor),
                            "inventory changed"
                        );
                    }
                    marker = Some(page.watermark);
                    resume = Some(page.resume_cursor);
                    until = until.min(page.lease_until);
                    for id in page.source_ids {
                        ensure!(!id.is_empty() && id.len() <= 256, "invalid source");
                        ids.insert(id);
                    }
                    ensure!(ids.len() <= 10000, "inventory too large");
                    let Some(next) = page.next_cursor else {
                        break;
                    };
                    ensure!(
                        next.len() <= 2048 && after.as_ref() != Some(&next),
                        "invalid inventory cursor"
                    );
                    after = Some(next);
                }
                store.inventory(job, ids, resume.context("missing inventory")?, start, until)?;
                Ok(false)
            }
        }
    }
}
impl Store {
    pub fn attach(&self, id: &str, mut config: FeedConfig, key: &MasterKey) -> Result<()> {
        let url = Url::parse(&config.collector_url)?;
        ensure!(
            url.path() == "/"
                && url.query().is_none()
                && url.fragment().is_none()
                && url.username().is_empty()
                && url.password().is_none(),
            "collector origin required"
        );
        egress::check_url(
            &url,
            if config.internal_network {
                Allowance::InternalNetwork
            } else {
                Allowance::PublicOnly
            },
        )
        .map_err(|_| anyhow::anyhow!("collector origin refused"))?;
        ensure!(
            hex64(&config.namespace_epoch) && config.activity_token.strip_prefix("hnry_activity_").is_some_and(hex64),
            "invalid grant"
        );
        config.collector_url = url.to_string();
        let mut inner = self.inner.lock().expect("store");
        let tx = inner.db.transaction()?;
        let (registered, epoch, state): (bool, String, String) =
            tx.query_row("SELECT registered,epoch,state FROM namespaces WHERE id=?1", [id], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?))
            })?;
        ensure!(state == "active", "namespace terminal");
        if registered {
            ensure!(epoch == config.namespace_epoch, "cannot replace epoch");
            let previous: Vec<u8> = tx.query_row("SELECT config FROM feeds WHERE namespace=?1", [id], |r| r.get(0))?;
            let previous = crypto::open(key, &format!("{id}:{epoch}"), "memory.feed", 1, &previous)?;
            let previous: FeedConfig = serde_json::from_slice(&previous)?;
            ensure!(
                Url::parse(&previous.collector_url)? == url,
                "cannot change collector origin"
            );
        } else {
            let entries: i64 = tx.query_row("SELECT count(*) FROM entries WHERE namespace=?1", [id], |r| r.get(0))?;
            ensure!(entries == 0, "attach requires empty namespace");
        }
        let feeds: i64 = tx.query_row("SELECT count(*) FROM feeds", [], |r| r.get(0))?;
        ensure!(registered || feeds < 128, "too many feeds");
        let blob = crypto::seal(
            key,
            &format!("{id}:{}", config.namespace_epoch),
            "memory.feed",
            &serde_json::to_vec(&config)?,
        );
        tx.execute(
            "UPDATE namespaces SET registered=1,epoch=?2 WHERE id=?1",
            params![id, config.namespace_epoch],
        )?;
        tx.execute("INSERT INTO feeds(namespace,config) VALUES(?1,?2) ON CONFLICT(namespace) DO UPDATE SET config=excluded.config,revision=revision+1",params![id,blob])?;
        tx.commit()?;
        inner.invalidate(id);
        inner.leases.remove(id);
        inner.stale.insert(id.into());
        Ok(())
    }
    pub fn feed_ids(&self) -> Result<Vec<String>> {
        let inner = self.inner.lock().expect("store");
        let mut stmt=inner.db.prepare("SELECT f.namespace FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE n.state='active' ORDER BY f.namespace LIMIT 129")?;
        let ids = stmt
            .query_map([], |r| r.get(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        ensure!(ids.len() <= 128, "too many feeds");
        Ok(ids)
    }
    pub fn has_feed_credentials(&self) -> Result<bool> {
        let inner = self.inner.lock().expect("store");
        Ok(inner
            .db
            .query_row("SELECT EXISTS(SELECT 1 FROM feeds)", [], |r| r.get(0))?)
    }
    fn job(&self, key: &MasterKey, id: &str) -> Result<Job> {
        let mut inner = self.inner.lock().expect("store");
        let (epoch,revision,cursor,blob):(String,i64,Option<String>,Vec<u8>)=inner.db.query_row("SELECT n.epoch,f.revision,f.cursor,f.config FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE f.namespace=?1 AND n.state='active'",[id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))?;
        let decoded = (|| -> Result<FeedConfig> {
            let bytes = zeroize::Zeroizing::new(crypto::open(key, &format!("{id}:{epoch}"), "memory.feed", 1, &blob)?);
            let config: FeedConfig = serde_json::from_slice(&bytes)?;
            ensure!(config.namespace_epoch == epoch, "epoch mismatch");
            Ok(config)
        })();
        let config = match decoded {
            Ok(config) => config,
            Err(e) => {
                inner.leases.remove(id);
                inner.stale.insert(id.into());
                return Err(e);
            }
        };
        Ok(Job {
            id: id.into(),
            epoch,
            revision,
            cursor,
            config,
        })
    }
    fn failed(&self, job: &Job, denied: bool) {
        let mut inner = self.inner.lock().expect("store");
        if inner.live(job).is_ok() {
            if denied {
                inner.leases.remove(&job.id);
            }
            inner.stale.insert(job.id.clone());
        }
    }
    fn renew(&self, job: &Job, start: Instant, until: i64) -> Result<()> {
        let mut inner = self.inner.lock().expect("store");
        inner.live(job)?;
        inner.lease(job, start, until)
    }
    fn apply(&self, job: &Job, page: PluginActivityPage, start: Instant, until: i64) -> Result<()> {
        ensure!(
            page.version == 1
                && page.items.len() <= 20
                && page.next_cursor.len() <= 2048
                && serde_json::to_vec(&page)?.len() <= 128 * 1024,
            "invalid page"
        );
        for item in &page.items {
            validate(item, &job.epoch)?;
        }
        let digests = page
            .items
            .iter()
            .map(|item| serde_json::to_vec(item).map(|bytes| sha256_hex(&bytes)))
            .collect::<std::result::Result<Vec<_>, _>>()?;
        let mut value = serde_json::to_value(page)?;
        redact::value(&mut value);
        let page: PluginActivityPage = serde_json::from_value(value)?;
        let mut inner = self.inner.lock().expect("store");
        inner.live(job)?;
        check_lease(start, until)?;
        let tx = inner.db.transaction()?;
        let erased = page
            .items
            .iter()
            .any(|item| !matches!(item.body, ActivityBody::CompletedTurn { .. }));
        for (item, digest) in page.items.into_iter().zip(digests) {
            let old: Option<String> = tx
                .query_row(
                    "SELECT digest FROM seen WHERE namespace=?1 AND event_key=?2",
                    params![job.id, item.event_key],
                    |r| r.get(0),
                )
                .optional()?;
            if let Some(old) = old {
                ensure!(old == digest, "source event changed");
                continue;
            }
            match &item.body {
                ActivityBody::SessionRemoved | ActivityBody::SourceReset => {
                    remove_source(&tx, &job.id, &item.session_id)?;
                    if matches!(item.body, ActivityBody::SessionRemoved) {
                        tx.execute(
                            "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
                            params![job.id, item.session_id],
                        )?;
                    }
                }
                ActivityBody::CompletedTurn { project_key, .. } => {
                    let suppressed: bool = tx.query_row(
                        "SELECT EXISTS(SELECT 1 FROM suppressed WHERE namespace=?1 AND session=?2)",
                        params![job.id, item.session_id],
                        |r| r.get(0),
                    )?;
                    if !suppressed {
                        let id = sha256_hex(format!("native-note:{}", item.session_id).as_bytes());
                        let old: Option<String> = tx
                            .query_row(
                                "SELECT data FROM entries WHERE namespace=?1 AND id=?2",
                                params![job.id, id],
                                |r| r.get(0),
                            )
                            .optional()?;
                        let mut entry = if let Some(old) = old {
                            serde_json::from_str::<Entry>(&old)?
                        } else {
                            Entry {
                                id,
                                kind: "note".into(),
                                title: "Completed-session observation".into(),
                                body: String::new(),
                                project_key: Some(project_key.clone()),
                                author: "observation".into(),
                                created_at: unix_now(),
                                updated_at: 0,
                                covered_through: None,
                                project_key_omitted: false,
                                project_key_digest: None,
                                revision: 0,
                                memory_kind: None,
                                tags: vec![],
                                provenance: vec![],
                                source_refs: vec![],
                                truncated: false,
                                stale: false,
                                turns: vec![],
                                older_turns: 0,
                            }
                        };
                        if let ActivityBody::CompletedTurn { completed_at, .. } = &item.body {
                            entry.updated_at = time::OffsetDateTime::parse(
                                completed_at,
                                &time::format_description::well_known::Rfc3339,
                            )?
                            .unix_timestamp();
                            if entry.revision == 0 {
                                entry.created_at = entry.updated_at;
                            }
                        }
                        entry.covered_through = Some(item.event_key.clone());
                        entry.turns.push(observation(&item)?);
                        entry.revision += 1;
                        entry.project_key = Some(project_key.clone());
                        while entry.turns.len() > 3 {
                            entry.turns.remove(0);
                            entry.older_turns += 1;
                            entry.truncated = true;
                        }
                        render_note(&mut entry)?;
                        put(&tx, &job.id, &entry)?;
                        tx.execute("INSERT INTO sources(namespace,session,event_key) VALUES(?1,?2,?3) ON CONFLICT(namespace,session) DO UPDATE SET event_key=excluded.event_key",params![job.id,item.session_id,item.event_key])?;
                    }
                }
            }
            tx.execute(
                "INSERT INTO seen(namespace,event_key,digest) VALUES(?1,?2,?3)",
                params![job.id, item.event_key, digest],
            )?;
        }
        budget(&tx, &job.id)?;
        tx.execute(
            "UPDATE feeds SET cursor=?2,revision=revision+1 WHERE namespace=?1",
            params![job.id, page.next_cursor],
        )?;
        check_lease(start, until)?;
        tx.commit()?;
        if erased {
            inner.invalidate(&job.id);
        }
        inner.leases.remove(&job.id);
        inner.stale.insert(job.id.clone());
        checkpoint(&inner)?;
        inner.lease(job, start, until)
    }
    fn inventory(
        &self,
        job: &Job,
        ids: std::collections::BTreeSet<String>,
        resume: String,
        start: Instant,
        until: i64,
    ) -> Result<()> {
        let mut inner = self.inner.lock().expect("store");
        inner.live(job)?;
        check_lease(start, until)?;
        let tx = inner.db.transaction()?;
        let old = {
            let mut stmt = tx.prepare("SELECT session FROM sources WHERE namespace=?1")?;
            stmt.query_map([&job.id], |r| r.get::<_, String>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        for id in old {
            if !ids.contains(&id) {
                remove_source(&tx, &job.id, &id)?;
            }
        }
        let retained = {
            let mut stmt = tx.prepare("SELECT data FROM entries WHERE namespace=?1 AND kind='note'")?;
            stmt.query_map([&job.id], |r| r.get::<_, String>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        for data in retained {
            let mut entry: Entry = serde_json::from_str(&data)?;
            entry.stale = true;
            for turn in &mut entry.turns {
                turn.gaps = true;
            }
            put(&tx, &job.id, &entry)?;
        }
        tx.execute(
            "UPDATE feeds SET cursor=?2,revision=revision+1 WHERE namespace=?1",
            params![job.id, resume],
        )?;
        check_lease(start, until)?;
        tx.commit()?;
        inner.invalidate(&job.id);
        inner.leases.remove(&job.id);
        inner.stale.insert(job.id.clone());
        checkpoint(&inner)?;
        inner.lease(job, start, until)
    }
    pub fn suppress(&self, id: &str, session: &str) -> Result<()> {
        ensure!(
            !session.is_empty() && session.len() <= 256 && redact::text(session).is_none(),
            "invalid session"
        );
        let mut inner = self.inner.lock().expect("store");
        let tx = inner.db.transaction()?;
        remove_source(&tx, id, session)?;
        tx.execute("UPDATE feeds SET revision=revision+1 WHERE namespace=?1", [id])?;
        tx.execute(
            "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
            params![id, session],
        )?;
        budget(&tx, id)?;
        tx.commit()?;
        inner.invalidate(id);
        checkpoint(&inner)?;
        Ok(())
    }
    pub fn forget(&self, token: &str, request: Forget) -> Result<ForgetReceipt> {
        ensure!(
            !request.request_id.is_empty()
                && request.request_id.len() <= 128
                && redact::text(&request.request_id).is_none(),
            "invalid request"
        );
        let mut inner = self.inner.lock().expect("store");
        let ns = inner.auth(token, true, false)?;
        Self::forget_inner(&mut inner, ns, request)
    }
    fn forget_inner(inner: &mut Inner, ns: Namespace, request: Forget) -> Result<ForgetReceipt> {
        ensure!(request.namespace_epoch == ns.epoch, "epoch mismatch");
        let target = serde_json::to_string(&request.target)?;
        let tx = inner.db.transaction()?;
        let old: Option<(String, String)> = tx
            .query_row(
                "SELECT epoch,target FROM receipts WHERE namespace=?1 AND request=?2",
                params![ns.id, request.request_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;
        if let Some((epoch, old)) = old {
            ensure!(epoch == request.namespace_epoch && old == target, "request conflict");
        } else {
            let active: bool = tx.query_row("SELECT state='active' FROM namespaces WHERE id=?1", [&ns.id], |r| {
                r.get(0)
            })?;
            ensure!(active, "namespace terminal");
            match request.target {
                Target::Scope => {
                    tx.execute("DELETE FROM receipts WHERE namespace=?1", [&ns.id])?;
                    tx.execute(
                        "UPDATE namespaces SET state='purged',tool_hash=id,cursor_key='',writes=0 WHERE id=?1",
                        [&ns.id],
                    )?;
                    for table in ["entries", "sources", "requests", "suppressed", "seen", "feeds"] {
                        tx.execute(&format!("DELETE FROM {table} WHERE namespace=?1"), [&ns.id])?;
                    }
                }
                Target::Session { ref session_id } => {
                    ensure!(
                        !session_id.is_empty() && session_id.len() <= 256 && redact::text(session_id).is_none(),
                        "invalid session"
                    );
                    remove_source(&tx, &ns.id, session_id)?;
                    tx.execute(
                        "INSERT OR IGNORE INTO suppressed(namespace,session) VALUES(?1,?2)",
                        params![ns.id, session_id],
                    )?;
                    tx.execute("UPDATE feeds SET revision=revision+1 WHERE namespace=?1", [&ns.id])?;
                }
            }
            tx.execute(
                "INSERT INTO receipts(namespace,request,epoch,target) VALUES(?1,?2,?3,?4)",
                params![ns.id, request.request_id, request.namespace_epoch, target],
            )?;
            budget(&tx, &ns.id)?;
        }
        tx.commit()?;
        inner.invalidate(&ns.id);
        inner.leases.remove(&ns.id);
        let previously: bool =
            inner
                .db
                .query_row("SELECT erasure_confirmed FROM namespaces WHERE id=?1", [&ns.id], |r| {
                    r.get(0)
                })?;
        let (busy, _, _): (i64, i64, i64) = inner.db.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        })?;
        let busy = if previously { 0 } else { busy };
        if busy == 0 && matches!(request.target, Target::Scope) {
            inner
                .db
                .execute("UPDATE namespaces SET erasure_confirmed=1 WHERE id=?1", [&ns.id])?;
        }
        Ok(ForgetReceipt {
            request_id: request.request_id,
            status: if busy == 0 {
                ForgetStatus::Confirmed
            } else {
                ForgetStatus::Unconfirmed
            },
            remaining_kinds: if busy == 0 {
                vec![]
            } else {
                vec!["storage_checkpoint".into()]
            },
        })
    }
    pub fn owner_purge(&self, id: &str) -> Result<ForgetReceipt> {
        let mut inner = self.inner.lock().expect("store");
        let ns = inner
            .db
            .query_row("SELECT id,epoch,cursor_key FROM namespaces WHERE id=?1", [id], |r| {
                Ok(Namespace {
                    id: r.get(0)?,
                    epoch: r.get(1)?,
                    cursor_key: r.get(2)?,
                })
            })?;
        let active: bool = inner
            .db
            .query_row("SELECT state='active' FROM namespaces WHERE id=?1", [id], |r| r.get(0))?;
        let request_id = if active {
            format!("owner-{}", crate::store::random())
        } else {
            inner.db.query_row(
                "SELECT request FROM receipts WHERE namespace=?1 AND target=?2 ORDER BY request LIMIT 1",
                params![id, serde_json::to_string(&Target::Scope)?],
                |r| r.get(0),
            )?
        };
        let epoch = ns.epoch.clone();
        Self::forget_inner(
            &mut inner,
            ns,
            Forget {
                request_id,
                namespace_epoch: epoch,
                target: Target::Scope,
            },
        )
    }
    pub fn set_writes(&self, id: &str, enabled: bool) -> Result<()> {
        let inner = self.inner.lock().expect("store");
        ensure!(
            inner.db.execute(
                "UPDATE namespaces SET writes=?2 WHERE id=?1 AND state='active'",
                params![id, enabled]
            )? == 1,
            "unavailable"
        );
        Ok(())
    }
    pub fn status(&self, id: &str) -> Result<serde_json::Value> {
        let inner = self.inner.lock().expect("store");
        let (state, registered, writes, confirmed): (String, bool, bool, bool) = inner.db.query_row(
            "SELECT state,registered,writes,erasure_confirmed FROM namespaces WHERE id=?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )?;
        let lease = inner
            .leases
            .get(id)
            .filter(|(end, unix)| *end > Instant::now() && *unix > unix_now())
            .map(|(_, unix)| *unix);
        Ok(
            serde_json::json!({"state":state,"registered":registered,"writes":writes,"lease_until":lease,"stale":inner.stale(id)||registered&&lease.is_none(),"erasure_confirmed":confirmed}),
        )
    }
    pub fn lifecycle_active(&self, token: &str) -> Result<()> {
        let inner = self.inner.lock().expect("store");
        let ns = inner.auth(token, true, false)?;
        let active: bool = inner
            .db
            .query_row("SELECT state='active' FROM namespaces WHERE id=?1", [ns.id], |r| {
                r.get(0)
            })?;
        ensure!(active, "unavailable");
        Ok(())
    }
}
impl Inner {
    fn live(&self, job: &Job) -> Result<()> {
        let current:Option<(String,i64,Option<String>)>=self.db.query_row("SELECT n.epoch,f.revision,f.cursor FROM feeds f JOIN namespaces n ON n.id=f.namespace WHERE f.namespace=?1 AND n.state='active'",[&job.id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional()?;
        ensure!(
            current == Some((job.epoch.clone(), job.revision, job.cursor.clone())),
            "stale feed result"
        );
        Ok(())
    }
    fn lease(&mut self, job: &Job, start: Instant, until: i64) -> Result<()> {
        let end = check_lease(start, until)?;
        self.leases.insert(job.id.clone(), (end, until));
        self.stale.remove(&job.id);
        Ok(())
    }
}
fn check_lease(start: Instant, until: i64) -> Result<Instant> {
    let remaining = until.checked_sub(unix_now()).context("invalid lease")?;
    ensure!(
        remaining > 0 && start.elapsed() < Duration::from_secs(60),
        "expired lease"
    );
    Ok((Instant::now() + Duration::from_secs(remaining.min(60) as u64)).min(start + Duration::from_secs(60)))
}
fn hex64(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
fn validate(item: &PluginActivityItem, epoch: &str) -> Result<()> {
    ensure!(
        item.namespace_epoch == epoch
            && !item.session_id.is_empty()
            && item.session_id.len() <= 256
            && item.event_key.len() <= 512
            && !item.event_key.is_empty()
            && item.provenance.len() <= 8
            && serde_json::to_vec(&item.provenance)?.len() <= 2048,
        "invalid source"
    );
    if let ActivityBody::CompletedTurn {
        turn_id,
        project_key,
        completed_at,
        excerpts,
        source_refs,
        ..
    } = &item.body
    {
        ensure!(
            !turn_id.is_empty()
                && turn_id.len() <= 256
                && project_key.len() <= 128 * 1024
                && completed_at.len() <= 64
                && excerpts.len() <= 2
                && excerpts.iter().map(|e| e.text.len()).sum::<usize>() <= 8192
                && source_refs.len() <= 8
                && !item.provenance.is_empty(),
            "invalid completed turn"
        );
        let _ = time::OffsetDateTime::parse(completed_at, &time::format_description::well_known::Rfc3339)?;
        for source in source_refs {
            ensure!(
                source.session_id == item.session_id
                    && source.turn_id.as_deref() == Some(turn_id.as_str())
                    && source.event_id >= 0,
                "invalid reference"
            );
        }
        for provenance in &item.provenance {
            let Provenance::Source { source, origin } = provenance else {
                anyhow::bail!("unsupported source evidence");
            };
            ensure!(source_refs.contains(source), "invalid provenance");
            match origin {
                InputOrigin::Operator {} => {}
                InputOrigin::Parent {
                    session_id,
                    operation_id,
                } => ensure!(
                    !session_id.is_empty() && session_id.len() <= 256 && operation_id.len() <= 256,
                    "invalid parent evidence"
                ),
                InputOrigin::ChildReport {
                    child_id,
                    source_event_id,
                    delivery_id,
                } => ensure!(
                    child_id.len() <= 256 && source_event_id.len() <= 256 && delivery_id.len() <= 256,
                    "invalid child evidence"
                ),
            }
        }
    }
    Ok(())
}
fn checkpoint(inner: &Inner) -> Result<()> {
    let (busy, _, _): (i64, i64, i64) = inner.db.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    })?;
    ensure!(busy == 0, "storage checkpoint unconfirmed");
    Ok(())
}
fn observation(item: &PluginActivityItem) -> Result<Observation> {
    let ActivityBody::CompletedTurn {
        turn_id,
        completed_at,
        excerpts,
        source_refs,
        truncated,
        gaps,
        ..
    } = &item.body
    else {
        anyhow::bail!("not a completed turn");
    };
    Ok(Observation {
        event_key: item.event_key.clone(),
        turn_id: turn_id.clone(),
        completed_at: completed_at.clone(),
        excerpts: excerpts.clone(),
        source_refs: source_refs.clone(),
        provenance: item.provenance.clone(),
        truncated: *truncated,
        gaps: *gaps,
    })
}
fn render_note(entry: &mut Entry) -> Result<()> {
    loop {
        entry.body.clear();
        entry.provenance.clear();
        entry.source_refs.clear();
        for turn in &entry.turns {
            entry.body.push_str(&format!("[{}]\n", turn.completed_at));
            entry.provenance.extend(turn.provenance.clone());
            entry.source_refs.extend(turn.source_refs.clone());
            entry.truncated |= turn.truncated;
            entry.stale |= turn.gaps;
            for excerpt in &turn.excerpts {
                entry.body.push_str(&format!("{:?}: {}\n", excerpt.role, excerpt.text));
            }
        }
        if entry.body.len() <= 8192 {
            return Ok(());
        }
        entry.truncated = true;
        for turn in &mut entry.turns {
            for excerpt in &mut turn.excerpts {
                excerpt.text = bounded(&excerpt.text, excerpt.text.len() / 2);
            }
            turn.truncated = true;
        }
    }
}
fn remove_source(tx: &rusqlite::Transaction<'_>, ns: &str, session: &str) -> Result<()> {
    tx.execute(
        "DELETE FROM entries WHERE namespace=?1 AND id=?2 AND kind='note'",
        params![ns, sha256_hex(format!("native-note:{session}").as_bytes())],
    )?;
    tx.execute(
        "DELETE FROM sources WHERE namespace=?1 AND session=?2",
        params![ns, session],
    )?;
    let entries = {
        let mut stmt = tx.prepare("SELECT data FROM entries WHERE namespace=?1 AND kind!='note'")?;
        stmt.query_map([ns], |r| r.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };
    for data in entries {
        let mut e: Entry = serde_json::from_str(&data)?;
        let old = e.source_refs.len();
        e.source_refs.retain(|r| r.session_id != session);
        e.provenance
            .retain(|p| !matches!(p,Provenance::Source{source,..} if source.session_id==session));
        if old != e.source_refs.len() {
            if e.provenance.is_empty() {
                e.provenance.push(Provenance::Unverified {});
            }
            put(tx, ns, &e)?;
        }
    }
    Ok(())
}
fn budget(tx: &rusqlite::Transaction<'_>, id: &str) -> Result<()> {
    let (count, bytes): (i64, i64) = tx.query_row(
        "SELECT count(*),coalesce(sum(length(CAST(data AS BLOB))),0) FROM entries WHERE namespace=?1",
        [id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    ensure!(count <= 10000 && bytes <= 64 * 1024 * 1024, "namespace full");
    for table in ["sources", "seen", "suppressed", "receipts"] {
        let count: i64 = tx.query_row(&format!("SELECT count(*) FROM {table} WHERE namespace=?1"), [id], |r| {
            r.get(0)
        })?;
        ensure!(count <= 100000, "namespace full");
    }
    Ok(())
}
pub async fn worker(store: Arc<Store>, key: Arc<MasterKey>) {
    let mut running = std::collections::HashSet::new();
    let mut tasks = tokio::task::JoinSet::new();
    loop {
        while let Some(result) = tasks.try_join_next() {
            if let Ok(id) = result {
                running.remove(&id);
            }
        }
        if let Ok(ids) = store.feed_ids() {
            for id in ids {
                if running.insert(id.clone()) {
                    let store = store.clone();
                    let key = key.clone();
                    tasks.spawn(async move {
                        let Ok(consumer) = Consumer::new() else {
                            return id;
                        };
                        let mut backoff = 1;
                        loop {
                            if !store.feed_ids().is_ok_and(|ids| ids.contains(&id)) {
                                break;
                            }
                            let delay = match consumer.poll(&store, &key, &id).await {
                                Ok(more) => {
                                    backoff = 1;
                                    if more {
                                        Duration::from_millis(100)
                                    } else {
                                        Duration::from_secs(15)
                                    }
                                }
                                Err(_) => {
                                    let delay = Duration::from_secs(backoff);
                                    backoff = (backoff * 2).min(300);
                                    delay
                                }
                            };
                            tokio::time::sleep(delay).await;
                        }
                        id
                    });
                }
            }
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
