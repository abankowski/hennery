//! Credential-fixed namespace storage. All data tables reference one immutable
//! owner/hat/epoch namespace. No caller can select that identity in a tool.
use anyhow::{Context, Result, ensure};
use hennery_kernel::{
    db, redact,
    secret::{random_bytes, sha256_hex, unix_now},
};
use hennery_proto::plugin::{Provenance, SourceRef};
use hmac::{Hmac, Mac};
use rusqlite::{OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{collections::HashMap, path::Path, sync::Mutex, time::Instant};

pub struct Store {
    pub(crate) inner: Mutex<Inner>,
}
pub(crate) struct Inner {
    pub db: db::OwnedConnection,
    pub leases: HashMap<String, (Instant, i64)>,
}
pub struct Credentials {
    pub namespace: String,
    pub tool: String,
    pub lifecycle: String,
}
#[derive(Clone)]
pub(crate) struct Namespace {
    pub id: String,
    pub epoch: String,
    pub cursor_key: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Remember {
    pub title: String,
    pub body: String,
    pub kind: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub idempotency_key: String,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Remembered {
    pub id: String,
    pub revision: u64,
    pub redacted: bool,
}
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Query {
    pub query: Option<String>,
    pub kind: Option<String>,
    pub project_key: Option<String>,
    pub limit: Option<usize>,
    pub cursor: Option<String>,
}
impl Query {
    pub fn search(text: &str) -> Self {
        Self {
            query: Some(text.into()),
            ..Self::default()
        }
    }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub project_key: Option<String>,
    pub author: String,
    pub created_at: i64,
    pub revision: u64,
    pub memory_kind: Option<String>,
    pub tags: Vec<String>,
    pub provenance: Vec<Provenance>,
    pub source_refs: Vec<SourceRef>,
    pub truncated: bool,
    pub stale: bool,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub turns: Vec<hennery_proto::plugin::PluginActivityItem>,
    #[serde(default)]
    pub older_turns: u64,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Page {
    pub entries: Vec<Entry>,
    pub next_cursor: Option<String>,
    pub stale: bool,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Cursor {
    binding: String,
    offset: usize,
    mac: String,
}

pub(crate) fn bounded(text: &str, cap: usize) -> String {
    let mut end = text.len().min(cap);
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    text[..end].into()
}
pub(crate) fn random() -> String {
    hex::encode(random_bytes::<32>())
}
impl Store {
    pub fn open(path: &Path) -> Result<Self> {
        let mut db = db::open(path)?;
        db::migrate_component(&mut db, "memory", &[include_str!("schema.sql")])?;
        Ok(Self {
            inner: Mutex::new(Inner {
                db,
                leases: HashMap::new(),
            }),
        })
    }
    pub fn create(&self, owner: &str, hat: &str) -> Result<Credentials> {
        ensure!(
            !owner.is_empty() && owner.len() <= 256 && !hat.is_empty() && hat.len() <= 256,
            "invalid identity"
        );
        let c = Credentials {
            namespace: random(),
            tool: format!("hnry_plugin_{}", random()),
            lifecycle: format!("hnry_lifecycle_{}", random()),
        };
        let inner = self.inner.lock().expect("store");
        inner.db.execute("INSERT INTO namespaces(id,owner,hat,epoch,tool_hash,lifecycle_hash,cursor_key) VALUES(?1,?2,?3,?4,?5,?6,?7)",
            params![c.namespace,owner,hat,random(),sha256_hex(c.tool.as_bytes()),sha256_hex(c.lifecycle.as_bytes()),random()])?;
        Ok(c)
    }
    pub fn remember(&self, token: &str, input: Remember) -> Result<Remembered> {
        ensure!(
            input.title.chars().count() <= 160
                && !input.title.trim().is_empty()
                && input.body.len() <= 16384
                && input.tags.len() <= 16
                && input.tags.iter().all(|s| s.len() <= 64)
                && !input.idempotency_key.is_empty()
                && input.idempotency_key.len() <= 128,
            "invalid memory"
        );
        ensure!(
            input
                .kind
                .as_deref()
                .is_none_or(|k| ["user", "feedback", "project", "reference", "decision", "entity"].contains(&k)),
            "invalid kind"
        );
        let mut value = serde_json::to_value(&input)?;
        let mut original = value.clone();
        original.as_object_mut().expect("object").remove("idempotency_key");
        let digest = sha256_hex(&serde_json::to_vec(&original)?);
        let changed = redact::value(&mut value);
        let safe: Remember = serde_json::from_value(value.clone())?;
        ensure!(
            safe.title.chars().count() <= 160 && safe.body.len() <= 16384 && safe.tags.iter().all(|s| s.len() <= 64),
            "redacted memory too large"
        );
        // The opaque idempotency key is hashed, never indexed or echoed.
        let key = sha256_hex(input.idempotency_key.as_bytes());
        let mut inner = self.inner.lock().expect("store");
        let ns = inner.auth(token, false, true)?;
        let tx = inner.db.transaction()?;
        if let Some((old, result)) = tx
            .query_row(
                "SELECT digest,result FROM requests WHERE namespace=?1 AND key=?2",
                params![ns.id, key],
                |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
            )
            .optional()?
        {
            ensure!(old == digest, "idempotency conflict");
            return Ok(serde_json::from_str(&result)?);
        }
        let (count, bytes): (i64, i64) = tx.query_row(
            "SELECT count(*),coalesce(sum(length(CAST(data AS BLOB))),0) FROM entries WHERE namespace=?1",
            [&ns.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        ensure!(count < 10000 && bytes < 64 * 1024 * 1024, "namespace full");
        let entry = Entry {
            id: random(),
            kind: "memory".into(),
            title: safe.title,
            body: safe.body,
            project_key: None,
            author: "agent".into(),
            created_at: unix_now(),
            revision: 1,
            memory_kind: safe.kind,
            tags: safe.tags,
            provenance: vec![Provenance::Unverified {}],
            source_refs: vec![],
            truncated: false,
            stale: false,
            turns: vec![],
            older_turns: 0,
        };
        put(&tx, &ns.id, &entry)?;
        let result = Remembered {
            id: entry.id,
            revision: 1,
            redacted: changed,
        };
        tx.execute(
            "INSERT INTO requests(namespace,key,digest,result) VALUES(?1,?2,?3,?4)",
            params![ns.id, key, digest, serde_json::to_string(&result)?],
        )?;
        tx.commit()?;
        Ok(result)
    }
    pub fn recent(&self, token: &str, q: &Query) -> Result<Page> {
        ensure!(q.query.is_none() && q.kind.is_none(), "invalid recent query");
        self.list(token, q, true)
    }
    pub fn search(&self, token: &str, q: &Query) -> Result<Page> {
        self.list(token, q, false)
    }
    fn list(&self, token: &str, q: &Query, recent: bool) -> Result<Page> {
        let limit = q.limit.unwrap_or(if recent { 5 } else { 10 });
        ensure!((1..=20).contains(&limit), "invalid limit");
        ensure!(
            q.project_key.as_ref().is_none_or(|p| p.len() <= 1024),
            "invalid project"
        );
        ensure!(
            q.kind
                .as_deref()
                .is_none_or(|k| ["memory", "note", "source"].contains(&k)),
            "invalid kind"
        );
        let terms = terms(q.query.as_deref().unwrap_or(""))?;
        let inner = self.inner.lock().expect("store");
        let ns = inner.auth(token, false, false)?;
        let binding = sha256_hex(&serde_json::to_vec(&(
            recent,
            &q.query,
            &q.kind,
            &q.project_key,
            limit,
        ))?);
        let offset = if let Some(c) = &q.cursor {
            ensure!(c.len() <= 2048, "invalid cursor");
            let c: Cursor = serde_json::from_slice(&hex::decode(c)?)?;
            ensure!(
                c.binding == binding && c.mac == cursor_mac(&ns, &binding, c.offset),
                "invalid cursor"
            );
            c.offset
        } else {
            0
        };
        ensure!(offset <= 10000, "invalid cursor");
        if !recent && terms.is_empty() {
            return Ok(Page {
                entries: vec![],
                next_cursor: None,
                stale: inner.stale(&ns.id),
            });
        }
        let kind = if recent { Some("note") } else { q.kind.as_deref() };
        // FTS is a boolean candidate selector only. Never use global bm25,
        // corpus counts or vocabulary. Foreign additions cannot alter ranking.
        let matched = terms
            .iter()
            .map(|t| format!("\"{}\"", t.replace('"', "\"\"")))
            .collect::<Vec<_>>()
            .join(" OR ");
        let coverage = terms
            .iter()
            .enumerate()
            .map(|(i, _)| {
                format!(
                    "CASE WHEN EXISTS (SELECT 1 FROM entries_fts WHERE rowid=e.seq AND entries_fts MATCH ?{}) THEN 1 ELSE 0 END",
                    i + 6
                )
            })
            .collect::<Vec<_>>()
            .join(" + ");
        let coverage = if coverage.is_empty() { "0".to_string() } else { coverage };
        let sql=format!("SELECT e.data, ({coverage}) AS coverage FROM entries e WHERE e.namespace=?1 AND (?2 IS NULL OR e.kind=?2) AND (?3 IS NULL OR e.project=?3)
            AND ((?4='' AND {}) OR EXISTS (SELECT 1 FROM entries_fts WHERE rowid=e.seq AND entries_fts MATCH ?4)) ORDER BY coverage DESC,e.seq DESC LIMIT 21 OFFSET ?5",if recent{"1"}else{"0"});
        let mut values: Vec<rusqlite::types::Value> = vec![
            ns.id.clone().into(),
            kind.map(String::from).into(),
            q.project_key.clone().into(),
            matched.into(),
            (offset as i64).into(),
        ];
        values.extend(terms.iter().map(|t| rusqlite::types::Value::Text(format!("\"{t}\""))));
        let mut stmt = inner.db.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(values), |r| r.get::<_, String>(0))?;
        let mut entries = Vec::new();
        let mut more = false;
        for row in rows {
            let mut entry: Entry = serde_json::from_str(&row?)?;
            if entries.len() == limit {
                more = true;
                break;
            }
            let clipped = bounded(&entry.body, 1024);
            entry.truncated |= clipped.len() < entry.body.len();
            entry.body = clipped;
            entry.stale |= inner.stale(&ns.id);
            // Preserve typed evidence and roles. Only display text/tags may
            // shrink, visibly, so a single escaped entry cannot stall a page.
            while serde_json::to_vec(&serde_json::to_string(&entry)?)?.len() > 12 * 1024 {
                let before = serde_json::to_vec(&entry)?.len();
                entry.body = bounded(&entry.body, entry.body.len() / 2);
                entry.title = bounded(&entry.title, entry.title.len() / 2);
                for tag in &mut entry.tags {
                    *tag = bounded(tag, tag.len() / 2);
                }
                for turn in &mut entry.turns {
                    if let hennery_proto::plugin::ActivityBody::CompletedTurn {
                        excerpts, truncated, ..
                    } = &mut turn.body
                    {
                        for excerpt in excerpts {
                            excerpt.text = bounded(&excerpt.text, excerpt.text.len() / 2);
                        }
                        *truncated = true;
                    }
                }
                entry.truncated = true;
                ensure!(
                    serde_json::to_vec(&entry)?.len() < before,
                    "source evidence exceeds response bound"
                );
            }
            entries.push(entry);
            let size = serde_json::to_vec(&serde_json::to_string(&entries)?)?.len();
            if size > 14 * 1024 {
                entries.pop();
                more = true;
                break;
            }
        }
        let next_cursor = more.then(|| {
            let offset = offset + entries.len();
            hex::encode(
                serde_json::to_vec(&Cursor {
                    binding: binding.clone(),
                    offset,
                    mac: cursor_mac(&ns, &binding, offset),
                })
                .expect("cursor"),
            )
        });
        Ok(Page {
            entries,
            next_cursor,
            stale: inner.stale(&ns.id),
        })
    }
    pub fn brief(&self, token: &str, subject: &str, project: Option<String>) -> Result<Value> {
        let page = self.search(
            token,
            &Query {
                query: Some(subject.into()),
                project_key: project,
                limit: Some(8),
                ..Query::default()
            },
        )?;
        Ok(json!({"sources":page.entries,"mode_used":"deterministic","fallback_reason":null,"stale":page.stale}))
    }
}
pub(crate) fn put(tx: &rusqlite::Transaction<'_>, ns: &str, e: &Entry) -> Result<()> {
    tx.execute("DELETE FROM entries WHERE namespace=?1 AND id=?2", params![ns, e.id])?;
    tx.execute(
        "INSERT INTO entries(namespace,id,kind,project,title,body,data) VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![
            ns,
            e.id,
            e.kind,
            e.project_key,
            e.title,
            e.body,
            serde_json::to_string(e)?
        ],
    )?;
    Ok(())
}
impl Inner {
    pub(crate) fn auth(&self, token: &str, admin: bool, write: bool) -> Result<Namespace> {
        ensure!(token.len() <= 256, "unavailable");
        let column = if admin { "lifecycle_hash" } else { "tool_hash" };
        let sql = format!("SELECT id,epoch,cursor_key,registered,writes,state FROM namespaces WHERE {column}=?1");
        let row = self
            .db
            .query_row(&sql, [sha256_hex(token.as_bytes())], |r| {
                Ok((
                    Namespace {
                        id: r.get(0)?,
                        epoch: r.get(1)?,
                        cursor_key: r.get(2)?,
                    },
                    r.get::<_, bool>(3)?,
                    r.get::<_, bool>(4)?,
                    r.get::<_, String>(5)?,
                ))
            })
            .optional()?
            .context("unavailable")?;
        if !admin {
            ensure!(row.3 == "active" && (!write || row.2), "unavailable");
            ensure!(
                !row.1
                    || self
                        .leases
                        .get(&row.0.id)
                        .is_some_and(|(end, unix)| *end > Instant::now() && *unix > unix_now()),
                "lease unavailable"
            );
        }
        Ok(row.0)
    }
    pub(crate) fn stale(&self, id: &str) -> bool {
        !self.leases.contains_key(id)
    }
}
fn terms(query: &str) -> Result<Vec<String>> {
    ensure!(query.chars().count() <= 512, "query too long");
    let terms: Vec<_> = query
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect();
    ensure!(terms.len() <= 16, "too many terms");
    Ok(terms)
}
fn cursor_mac(ns: &Namespace, binding: &str, offset: usize) -> String {
    let mut mac = Hmac::<sha2::Sha256>::new_from_slice(ns.cursor_key.as_bytes()).expect("HMAC key");
    mac.update(format!("memory-cursor-v1:{}:{}:{}:{}", ns.id, ns.epoch, binding, offset).as_bytes());
    hex::encode(mac.finalize().into_bytes())
}
