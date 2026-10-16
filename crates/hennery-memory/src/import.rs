//! One-shot predecessor import. No live database, git history, hooks, extraction,
//! model or authority inferred from source prose. Preview is a signed, redacted
//! portable proposal; only apply writes canonical entries, one hat transaction.
use crate::{
    management::{LegacyEvidence, Manager, NewMemory, owner_entry},
    store::{Entry, Store, put},
};
use anyhow::{Context, Result, ensure};
use hennery_kernel::{
    redact,
    secret::{sha256_hex, unix_now},
};
use hmac::{Hmac, Mac};
use rusqlite::{OptionalExtension, params};
use serde::{
    Deserialize, Serialize,
    de::{MapAccess, Visitor},
};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    io::{Read, Write},
    os::unix::fs::{MetadataExt, OpenOptionsExt},
    path::Path,
};
const FILE_CAP: usize = 2 * 1024 * 1024;
const TOTAL_CAP: usize = 100 * 1024 * 1024;
const COUNT_CAP: usize = 10000;
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct VaultFile {
    pub path: String,
    pub body: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Bundle {
    pub version: u32,
    pub vault: String,
    pub files: Vec<VaultFile>,
    #[serde(default)]
    pub rejected: Vec<FileReport>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
pub enum Target {
    Namespace {
        namespace: String,
        project_key: Option<String>,
    },
    Exclude {},
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Mapping {
    #[serde(deserialize_with = "unique_map")]
    pub scopes: BTreeMap<String, Target>,
    #[serde(deserialize_with = "unique_map")]
    pub files: BTreeMap<String, Target>,
    pub mixed: BTreeSet<String>,
}
fn unique_map<'de, D: serde::Deserializer<'de>>(de: D) -> std::result::Result<BTreeMap<String, Target>, D::Error> {
    struct Unique;
    impl<'de> Visitor<'de> for Unique {
        type Value = BTreeMap<String, Target>;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("a mapping with unique exact keys")
        }
        fn visit_map<M: MapAccess<'de>>(self, mut map: M) -> std::result::Result<Self::Value, M::Error> {
            let mut result = BTreeMap::new();
            while let Some((key, value)) = map.next_entry::<String, Target>()? {
                if result.insert(key, value).is_some() {
                    return Err(serde::de::Error::custom("duplicate mapping key"));
                }
                if result.len() > COUNT_CAP {
                    return Err(serde::de::Error::custom("mapping limit"));
                }
            }
            Ok(result)
        }
    }
    de.deserialize_map(Unique)
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FileReport {
    pub path: String,
    pub status: String,
    pub redactions: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ImportItem {
    pub vault: String,
    pub path: String,
    pub digest: String,
    pub entry: Entry,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HatPreview {
    pub namespace: String,
    pub epoch: String,
    pub items: Vec<ImportItem>,
    pub conflict: bool,
    pub counts: BTreeMap<String, usize>,
    pub proof: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preview {
    pub version: u32,
    pub digest: String,
    pub expires: i64,
    pub blocked: bool,
    pub reports: Vec<FileReport>,
    pub hats: Vec<HatPreview>,
}
#[derive(Debug, Serialize)]
pub struct Applied {
    pub namespace: String,
    pub status: String,
    pub imported: usize,
    pub unchanged: usize,
    pub reason: Option<String>,
}
struct HashWriter(Sha256);
impl Write for HashWriter {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        self.0.update(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
fn digest(value: &impl Serialize) -> Result<String> {
    let mut writer = HashWriter(Sha256::new());
    serde_json::to_writer(&mut writer, value)?;
    Ok(hex::encode(writer.0.finalize()))
}
fn preview_hash(preview: &Preview) -> Result<String> {
    let hats = preview
        .hats
        .iter()
        .map(|h| (&h.namespace, &h.epoch, &h.items, h.conflict, &h.counts))
        .collect::<Vec<_>>();
    digest(&(
        preview.version,
        &preview.digest,
        preview.expires,
        preview.blocked,
        &preview.reports,
        hats,
    ))
}
fn mac(key: &str, owner: &str, hash: &str) -> Result<Hmac<Sha256>> {
    let mut mac = Hmac::<Sha256>::new_from_slice(key.as_bytes()).expect("HMAC key");
    mac.update(digest(&(owner, hash))?.as_bytes());
    Ok(mac)
}
/// Normalized, relative, UTF-8 archive names only; never joined to a server path.
fn components(path: &str) -> Result<Vec<&str>> {
    ensure!(
        !path.is_empty()
            && path.len() <= 512
            && !path.starts_with('/')
            && !path.contains(['\\', ':'])
            && !path.chars().any(char::is_control),
        "invalid snapshot path"
    );
    let parts = path.split('/').collect::<Vec<_>>();
    ensure!(
        parts.len() <= 8 && parts.iter().all(|s| !s.is_empty() && *s != "." && *s != ".."),
        "invalid snapshot path"
    );
    ensure!(
        ["notes", "memories", "sources", ".git", ".memory"].contains(&parts[0]),
        "unknown snapshot subtree"
    );
    Ok(parts)
}
impl Bundle {
    pub fn from_snapshot(path: &Path, vault: &str) -> Result<Self> {
        let mut file = std::fs::OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK | libc::O_CLOEXEC)
            .open(path)?;
        let meta = file.metadata()?;
        ensure!(
            meta.is_file() && meta.nlink() == 1 && meta.len() <= 110 * 1024 * 1024,
            "bounded regular snapshot required"
        );
        let mut bytes = Vec::new();
        (&mut file).take(110 * 1024 * 1024 + 1).read_to_end(&mut bytes)?;
        ensure!(bytes.len() <= 110 * 1024 * 1024, "snapshot size limit");
        Self::from_tar(&bytes, vault)
    }
    pub fn from_tar(bytes: &[u8], vault: &str) -> Result<Self> {
        ensure!(bytes.len() <= 110 * 1024 * 1024, "snapshot size limit");
        let mut archive = tar::Archive::new(bytes);
        let mut files = Vec::new();
        let mut rejected = Vec::new();
        let mut names = BTreeSet::new();
        let mut total = 0usize;
        let mut count = 0;
        for item in archive.entries()?.raw(true) {
            count += 1;
            ensure!(count <= 20000, "archive entry limit");
            let mut item = item?;
            let path = std::str::from_utf8(&item.path_bytes())?
                .trim_end_matches('/')
                .to_string();
            let parts = components(&path)?;
            ensure!(names.insert(path.clone()), "duplicate snapshot entry");
            let kind = item.header().entry_type();
            if kind.is_dir() {
                ensure!(item.size() == 0, "directory payload refused");
                continue;
            }
            ensure!(kind.is_file(), "links, devices and extended archive metadata refused");
            let size = usize::try_from(item.size())?;
            total = total.checked_add(size).context("expanded input limit")?;
            ensure!(total <= TOTAL_CAP, "expanded input limit");
            if parts.iter().any(|p| [".git", ".memory"].contains(p)) {
                continue;
            }
            ensure!(files.len() + rejected.len() < COUNT_CAP, "file count limit");
            if size > FILE_CAP {
                rejected.push(FileReport {
                    path,
                    status: "oversized".into(),
                    redactions: Vec::new(),
                });
                continue;
            }
            let mut content = Vec::new();
            item.read_to_end(&mut content)?;
            ensure!(content.len() == size, "truncated snapshot file");
            match String::from_utf8(content) {
                Ok(body) => files.push(VaultFile { path, body }),
                Err(_) => rejected.push(FileReport {
                    path,
                    status: "unparseable".into(),
                    redactions: Vec::new(),
                }),
            }
        }
        Ok(Self {
            version: 1,
            vault: vault.into(),
            files,
            rejected,
        })
    }
}
fn pointer_only(path: &str, body: &str) -> bool {
    path.rsplit('/').next() == Some("MEMORY.md")
        && body.lines().filter(|l| !l.trim().is_empty()).all(|l| {
            let line = l.trim();
            line.starts_with('#')
                || ((line.starts_with('[') || line.starts_with("- [")) && line.contains("](") && line.ends_with(')'))
        })
}
/// Deliberately constrained YAML subset: ASCII identifier keys; plain, JSON
/// double-quoted or YAML single-quoted scalars; two-space metadata/times maps;
/// scalar flow/block sequences. No aliases, tags, merges, duplicate keys,
/// block scalars, nested collections, inline comments or YAML coercion.
fn scalar(raw: &str) -> Result<String> {
    let raw = raw.trim();
    ensure!(raw.len() <= 8192, "metadata scalar limit");
    if raw.starts_with('"') {
        return Ok(serde_json::from_str::<String>(raw)?);
    }
    if raw.starts_with('\'') {
        ensure!(raw.len() >= 2 && raw.ends_with('\''), "unclosed quoted scalar");
        let inner = &raw[1..raw.len() - 1];
        ensure!(!inner.replace("''", "").contains('\''), "invalid single quote");
        return Ok(inner.replace("''", "'"));
    }
    ensure!(
        !raw.starts_with(['&', '*', '!', '{', '[', '|', '>', '@', '`']) && !raw.contains(" #") && !raw.contains(": "),
        "unsupported YAML scalar"
    );
    Ok(raw.into())
}
fn scalar_or_list(raw: &str) -> Result<String> {
    if raw.trim().starts_with('[') {
        let raw = raw.trim();
        ensure!(raw.ends_with(']'), "unclosed sequence");
        let inside = &raw[1..raw.len() - 1];
        let mut items = Vec::new();
        // Commas inside quoted values are outside this documented subset.
        for item in inside.split(',').filter(|_| !inside.trim().is_empty()) {
            ensure!(!item.trim().is_empty(), "empty sequence item");
            items.push(scalar(item)?);
            ensure!(items.len() <= 64, "sequence limit");
        }
        return Ok(serde_json::to_string(&items)?);
    }
    scalar(raw)
}
struct Parsed {
    metadata: BTreeMap<String, String>,
    body: String,
    scope: Option<String>,
}
fn frontmatter(text: &str) -> Result<Parsed> {
    ensure!(
        !text.contains('\0') && !text.starts_with('\u{feff}'),
        "unsupported text encoding"
    );
    let normalized = text.replace("\r\n", "\n");
    let Some(rest) = normalized.strip_prefix("---\n") else {
        return Ok(Parsed {
            metadata: BTreeMap::new(),
            body: text.into(),
            scope: None,
        });
    };
    let (front, body) = rest.split_once("\n---\n").context("unclosed frontmatter")?;
    ensure!(front.len() <= 65536, "frontmatter limit");
    let mut metadata = BTreeMap::new();
    let mut section = None::<String>;
    let mut sequence = None::<String>;
    let mut lists = BTreeMap::<String, Vec<String>>::new();
    let mut seen = BTreeSet::new();
    for line in front.lines() {
        ensure!(!line.contains('\t'), "tabs in frontmatter refused");
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }
        let indent = line.len() - line.trim_start_matches(' ').len();
        if let Some(item) = line.trim_start().strip_prefix("- ") {
            let key = sequence.as_ref().context("unexpected sequence")?;
            let expected = if key.contains('.') { 4 } else { 2 };
            ensure!(indent == expected, "sequence indentation");
            let list = lists.get_mut(key).context("sequence")?;
            list.push(scalar(item)?);
            ensure!(list.len() <= 64, "sequence limit");
            continue;
        }
        let (key, raw) = line.trim_start().split_once(':').context("expected scalar key")?;
        ensure!(
            !key.is_empty() && key.len() <= 64 && key.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_'),
            "invalid metadata key"
        );
        let folded = key.to_ascii_lowercase();
        let key = if [
            "scope",
            "metadata",
            "times",
            "session_id",
            "source_session",
            "originsessionid",
            "origin",
            "machine",
            "cwd",
            "git_branch",
            "name",
            "description",
            "title",
            "type",
            "entities",
            "in_flight",
            "supersedes",
            "checksum",
            "updated_at",
            "created_at",
            "last_event_id",
            "stale",
            "error",
        ]
        .contains(&folded.as_str())
        {
            folded
        } else {
            key.to_string()
        };
        let full = if indent == 0 {
            section = None;
            key.clone()
        } else {
            ensure!(indent == 2, "unsupported nesting");
            format!("{}.{}", section.as_ref().context("unexpected indent")?, key)
        };
        let canonical = if full.eq_ignore_ascii_case("metadata.originsessionid") {
            "metadata.source_session".to_string()
        } else {
            full.to_ascii_lowercase()
        };
        ensure!(seen.insert(canonical), "duplicate authoritative/metadata key");
        sequence = None;
        if raw.trim().is_empty() && indent == 0 && ["metadata", "times"].contains(&key.as_str()) {
            section = Some(key);
            continue;
        }
        if raw.trim().is_empty() && ["entities", "in_flight", "supersedes"].contains(&key.as_str()) {
            lists.insert(full.clone(), Vec::new());
            sequence = Some(full);
            continue;
        }
        ensure!(!raw.trim().is_empty(), "unsupported empty or nested structure");
        let value = if ["entities", "in_flight", "supersedes"].contains(&key.as_str()) {
            scalar_or_list(raw)?
        } else {
            scalar(raw)?
        };
        metadata.insert(full, value);
        ensure!(metadata.len() <= 128, "metadata field limit");
    }
    for (key, list) in lists {
        metadata.insert(key, serde_json::to_string(&list)?);
    }
    ensure!(metadata.len() <= 128, "metadata field limit");
    let top = metadata.get("scope");
    let nested = metadata.get("metadata.scope");
    ensure!(
        top.is_none() || nested.is_none() || top == nested,
        "conflicting scope metadata"
    );
    let scope = top.or(nested).cloned();
    Ok(Parsed {
        metadata,
        body: body.into(),
        scope,
    })
}
fn safe_text(text: &str) -> String {
    redact::text(text).unwrap_or_else(|| text.into())
}
fn imported_entry(
    bundle: &Bundle,
    file: &VaultFile,
    parsed: Parsed,
    namespace: &str,
    project: Option<String>,
) -> Result<(ImportItem, Vec<String>)> {
    let vault = sha256_hex(bundle.vault.as_bytes());
    let path = sha256_hex(file.path.as_bytes());
    let kind = match file.path.split('/').next() {
        Some("notes") => "note",
        Some("memories") => "memory",
        _ => "source",
    };
    let mut redactions = Vec::new();
    let mut metadata = BTreeMap::new();
    for (key, value) in parsed.metadata {
        let safe_key = safe_text(&key);
        let safe = safe_text(&value);
        if safe_key != key || safe != value {
            redactions.push(format!("metadata.{safe_key}"));
        }
        ensure!(
            metadata.insert(safe_key, safe).is_none(),
            "redacted metadata key collision"
        );
    }
    let body = if kind == "source" {
        file.body.as_str()
    } else {
        parsed.body.as_str()
    };
    let safe_body = safe_text(body);
    if safe_body != body {
        redactions.push("body".into());
    }
    ensure!(safe_body.len() <= FILE_CAP, "redacted content too large");
    let title = metadata
        .get("name")
        .or_else(|| metadata.get("title"))
        .cloned()
        .unwrap_or_else(|| {
            file.path
                .rsplit('/')
                .next()
                .unwrap_or("Imported reference")
                .trim_end_matches(".md")
                .into()
        });
    let safe_title = safe_text(&title);
    let title = safe_title.chars().take(160).collect::<String>();
    if title != safe_title {
        redactions.push("title_truncated".into());
    }
    let source_path = safe_text(&file.path);
    if source_path != file.path {
        redactions.push("path".into());
    }
    let source_vault = safe_text(&bundle.vault);
    if source_vault != bundle.vault {
        redactions.push("vault".into());
    }
    if let Some(project) = &project {
        ensure!(
            project.len() <= 1024 && redact::text(project).is_none(),
            "invalid explicit project"
        );
    }
    let content = digest(&(kind, &title, &safe_body, &metadata, &project))?;
    let mut entry = owner_entry(NewMemory { title, body: safe_body });
    entry.id = sha256_hex(format!("legacy:{namespace}:{vault}:{path}").as_bytes());
    entry.kind = kind.into();
    entry.author = "import".into();
    entry.project_key = project;
    entry.stale = kind == "note";
    let date = metadata
        .get("metadata.updated_at")
        .or_else(|| metadata.get("updated_at"))
        .or_else(|| metadata.get("times.updated_at"));
    if let Some(date) = date
        && let Ok(date) = time::OffsetDateTime::parse(date, &time::format_description::well_known::Rfc3339)
    {
        entry.created_at = date.unix_timestamp();
        entry.updated_at = date.unix_timestamp();
    }
    entry.memory_kind = metadata
        .get("metadata.type")
        .filter(|t| ["user", "feedback", "project", "reference", "decision", "entity"].contains(&t.as_str()))
        .cloned();
    let session_id = metadata
        .get("session_id")
        .or_else(|| metadata.get("metadata.source_session"))
        .or_else(|| metadata.get("metadata.originsessionid"))
        .map(|id| format!("legacy:{vault}:{}", sha256_hex(id.as_bytes())));
    entry.legacy = Some(LegacyEvidence {
        vault: source_vault,
        path: source_path,
        metadata,
        metadata_omitted: false,
        session_id,
        imported_at: unix_now(),
        content_digest: content.clone(),
    });
    Ok((
        ImportItem {
            vault,
            path,
            digest: content,
            entry,
        },
        redactions,
    ))
}
impl Store {
    pub fn preview_import(&self, manager: &Manager, bundle: &Bundle, mapping: &Mapping) -> Result<Preview> {
        ensure!(
            bundle.version == 1
                && !bundle.vault.is_empty()
                && bundle.vault.len() <= 128
                && bundle.files.len() + bundle.rejected.len() <= COUNT_CAP,
            "bundle limits/version"
        );
        ensure!(
            mapping.scopes.len() <= COUNT_CAP && mapping.files.len() <= COUNT_CAP && mapping.mixed.len() <= COUNT_CAP,
            "mapping limits"
        );
        let total = bundle.files.iter().try_fold(0usize, |sum, file| {
            sum.checked_add(file.body.len())
                .and_then(|n| n.checked_add(file.path.len()))
                .context("input overflow")
        })?;
        ensure!(total <= TOTAL_CAP, "expanded input limit");
        let mut names = BTreeSet::new();
        for file in &bundle.files {
            components(&file.path)?;
            ensure!(names.insert(file.path.clone()), "duplicate snapshot entry");
        }
        for file in &bundle.rejected {
            components(&file.path)?;
            ensure!(
                names.insert(file.path.clone())
                    && ["oversized", "unparseable"].contains(&file.status.as_str())
                    && file.redactions.is_empty(),
                "invalid rejected file report"
            );
        }
        for key in mapping.files.keys().chain(mapping.mixed.iter()) {
            components(key)?;
            ensure!(names.contains(key), "mapping refers to absent file");
        }
        ensure!(
            mapping
                .scopes
                .keys()
                .all(|s| !s.is_empty() && s.len() <= 256 && !s.chars().any(char::is_control)),
            "invalid scope mapping"
        );
        let mut preview = Preview {
            version: 1,
            digest: digest(&(bundle, mapping))?,
            expires: unix_now() + 3600,
            blocked: false,
            reports: Vec::new(),
            hats: Vec::new(),
        };
        for file in &bundle.rejected {
            let excluded = matches!(mapping.files.get(&file.path), Some(Target::Exclude {}));
            preview.blocked |= !excluded;
            preview.reports.push(FileReport {
                path: safe_text(&file.path),
                status: if excluded {
                    "excluded".into()
                } else {
                    file.status.clone()
                },
                redactions: Vec::new(),
            });
        }
        let mut hats = BTreeMap::<String, HatPreview>::new();
        let mut keys = BTreeMap::new();
        for file in &bundle.files {
            let parts = components(&file.path)?;
            let mut report = FileReport {
                path: safe_text(&file.path),
                status: String::new(),
                redactions: Vec::new(),
            };
            if parts.iter().any(|p| [".git", ".memory"].contains(p)) {
                report.status = "excluded_internal".into();
                preview.reports.push(report);
                continue;
            }
            if matches!(mapping.files.get(&file.path), Some(Target::Exclude {})) {
                report.status = "excluded".into();
                preview.reports.push(report);
                continue;
            }
            if pointer_only(&file.path, &file.body) {
                report.status = "pointer_only".into();
                preview.reports.push(report);
                continue;
            }
            if file.body.len() > FILE_CAP {
                report.status = "oversized".into();
                preview.blocked = true;
                preview.reports.push(report);
                continue;
            }
            let parsed = match frontmatter(&file.body) {
                Ok(p) => p,
                Err(_) => {
                    report.status = "unparseable".into();
                    preview.blocked = true;
                    preview.reports.push(report);
                    continue;
                }
            };
            let directory = if parts.len() >= 3 { Some(parts[1]) } else { None };
            let scope = parsed.scope.as_deref().or(directory);
            let ambiguous = scope.is_none()
                || scope.is_some_and(|s| s.eq_ignore_ascii_case("shared"))
                || (directory.is_some() && parsed.scope.as_deref().is_some() && directory != parsed.scope.as_deref())
                || mapping.mixed.contains(&file.path);
            let target = mapping.files.get(&file.path).or_else(|| {
                (!ambiguous)
                    .then(|| scope.and_then(|s| mapping.scopes.get(s)))
                    .flatten()
            });
            let Some(target) = target else {
                report.status = "unresolved".into();
                preview.blocked = true;
                preview.reports.push(report);
                continue;
            };
            if mapping.mixed.contains(&file.path) && !matches!(target, Target::Exclude {}) {
                report.status = "mixed_exclude_required".into();
                preview.blocked = true;
                preview.reports.push(report);
                continue;
            }
            let Target::Namespace { namespace, project_key } = target else {
                report.status = "excluded".into();
                preview.reports.push(report);
                continue;
            };
            let (epoch, key) = {
                let inner = self.inner.lock().expect("store");
                if inner.managed_scope(manager, namespace, false).is_err() {
                    report.status = "target_unavailable".into();
                    preview.blocked = true;
                    preview.reports.push(report);
                    continue;
                }
                let (epoch, key): (String, String) = inner.db.query_row(
                    "SELECT epoch,cursor_key FROM namespaces WHERE id=?1 AND owner=?2 AND state='active'",
                    params![namespace, manager.owner],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )?;
                (epoch, key)
            };
            let (item, redactions) = match imported_entry(bundle, file, parsed, namespace, project_key.clone()) {
                Ok(item) => item,
                Err(_) => {
                    report.status = "unparseable".into();
                    preview.blocked = true;
                    preview.reports.push(report);
                    continue;
                }
            };
            report.redactions = redactions;
            let prior: Option<(String, String)> = self
                .inner
                .lock()
                .expect("store")
                .db
                .query_row(
                    "SELECT digest,entry_id FROM imports WHERE namespace=?1 AND vault=?2 AND path=?3",
                    params![namespace, item.vault, item.path],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .optional()?;
            report.status = match &prior {
                Some((old, _)) if old != &item.digest => "conflict",
                Some(_) => "unchanged",
                None => "ready",
            }
            .into();
            let hat = hats.entry(namespace.clone()).or_insert_with(|| HatPreview {
                namespace: namespace.clone(),
                epoch,
                items: Vec::new(),
                conflict: false,
                counts: BTreeMap::new(),
                proof: String::new(),
            });
            hat.conflict |= report.status == "conflict";
            *hat.counts.entry(item.entry.kind.clone()).or_default() += 1;
            hat.items.push(item);
            keys.insert(namespace.clone(), key);
            preview.reports.push(report);
        }
        preview.hats = hats.into_values().collect();
        let hash = preview_hash(&preview)?;
        for hat in &mut preview.hats {
            hat.proof = hex::encode(
                mac(&keys[&hat.namespace], &manager.owner, &hash)?
                    .finalize()
                    .into_bytes(),
            );
        }
        Ok(preview)
    }
    pub fn apply_import(&self, manager: &Manager, preview: &Preview, expected_digest: &str) -> Result<Vec<Applied>> {
        ensure!(
            preview.version == 1
                && preview.digest == expected_digest
                && !preview.blocked
                && preview.expires > unix_now()
                && preview.expires <= unix_now() + 3600
                && preview.reports.len() <= COUNT_CAP
                && preview.hats.len() <= 1000,
            "preview approval unavailable"
        );
        let hash = preview_hash(preview)?;
        let mut names = BTreeSet::new();
        for hat in &preview.hats {
            ensure!(
                names.insert(&hat.namespace) && hat.items.len() <= COUNT_CAP,
                "duplicate/oversized hat proposal"
            );
            let (epoch, key): (String, String) = {
                let inner = self.inner.lock().expect("store");
                inner.db.query_row(
                    "SELECT epoch,cursor_key FROM namespaces WHERE id=?1 AND owner=?2 AND state='active'",
                    params![hat.namespace, manager.owner],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )?
            };
            ensure!(epoch == hat.epoch && key.len() == 64, "namespace epoch changed");
            mac(&key, &manager.owner, &hash)?
                .verify_slice(&hex::decode(&hat.proof)?)
                .map_err(|_| anyhow::anyhow!("preview signature refused"))?;
        }
        #[cfg(test)]
        self.reset_phase(crate::consumer::ResetPhase::ImportVerified);
        let mut results = Vec::new();
        for hat in &preview.hats {
            let result = self.managed_transaction(
                manager,
                &hat.namespace,
                true,
                false,
                Some((&hat.epoch, preview.expires)),
                |tx| {
                    ensure!(!hat.conflict, "changed imported content conflicts");
                    let mut imported = 0;
                    let mut unchanged = 0;
                    // Preflight every ledger row in this hat before the first write.
                    for item in &hat.items {
                        let old: Option<String> = tx
                            .query_row(
                                "SELECT digest FROM imports WHERE namespace=?1 AND vault=?2 AND path=?3",
                                params![hat.namespace, item.vault, item.path],
                                |r| r.get(0),
                            )
                            .optional()?;
                        ensure!(
                            old.as_ref().is_none_or(|old| old == &item.digest),
                            "changed imported content conflicts"
                        );
                    }
                    for item in &hat.items {
                        let exists: bool = tx.query_row(
                            "SELECT EXISTS(SELECT 1 FROM imports WHERE namespace=?1 AND vault=?2 AND path=?3)",
                            params![hat.namespace, item.vault, item.path],
                            |r| r.get(0),
                        )?;
                        if exists {
                            unchanged += 1;
                            continue;
                        }
                        ensure!(
                            item.entry.author == "import"
                                && item.entry.source_refs.is_empty()
                                && item.entry.turns.is_empty()
                                && item.entry.legacy.is_some()
                                && item.entry.provenance == vec![hennery_proto::plugin::Provenance::Unverified {}],
                            "invalid imported authority"
                        );
                        put(tx, &hat.namespace, &item.entry)?;
                        tx.execute(
                            "INSERT INTO imports(namespace,vault,path,digest,entry_id) VALUES(?1,?2,?3,?4,?5)",
                            params![hat.namespace, item.vault, item.path, item.digest, item.entry.id],
                        )?;
                        imported += 1;
                    }
                    crate::consumer::budget(tx, &hat.namespace)?;
                    let count: i64 = tx.query_row(
                        "SELECT count(*) FROM imports WHERE namespace=?1",
                        [&hat.namespace],
                        |r| r.get(0),
                    )?;
                    ensure!(count <= 100000, "import ledger limit");
                    Ok((imported, unchanged))
                },
            );
            match result {
                Ok((imported, unchanged)) => {
                    results.push(Applied {
                        namespace: hat.namespace.clone(),
                        status: "committed".into(),
                        imported,
                        unchanged,
                        reason: None,
                    });
                }
                Err(_) => results.push(Applied {
                    namespace: hat.namespace.clone(),
                    status: "untouched".into(),
                    imported: 0,
                    unchanged: 0,
                    reason: Some("Conflict, unavailable lease or storage limit/failure; no writes for this hat".into()),
                }),
            }
        }
        Ok(results)
    }
}

/// Local CLI inputs only. No HTTP handler accepts a filesystem path.
pub fn read_local_json<T: serde::de::DeserializeOwned>(path: &Path, cap: usize) -> Result<T> {
    let mut file = std::fs::OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK | libc::O_CLOEXEC)
        .open(path)?;
    let meta = file.metadata()?;
    ensure!(
        meta.is_file() && meta.nlink() == 1 && meta.len() <= cap as u64,
        "bounded regular JSON file required"
    );
    let mut bytes = Vec::new();
    (&mut file).take(cap as u64 + 1).read_to_end(&mut bytes)?;
    ensure!(
        bytes.len() <= cap && bytes.iter().copied().find(|b| !b.is_ascii_whitespace()) == Some(b'{'),
        "bounded JSON object required"
    );
    Ok(serde_json::from_slice(&bytes)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verified_import_epoch_change_is_fenced() {
        verified_import_approval("epoch");
    }
    #[test]
    fn verified_import_expiry_before_sql_is_fenced() {
        verified_import_approval("expiry_before");
    }
    #[test]
    fn verified_import_expiry_during_sql_is_fenced() {
        verified_import_approval("expiry_during");
    }
    fn verified_import_approval(mode: &'static str) {
        use crate::consumer::{FeedConfig, ResetPhase};
        use std::{
            sync::Arc,
            time::{Duration, Instant},
        };
        {
            let dir = tempfile::tempdir().unwrap();
            let store = Arc::new(Store::open(&dir.path().join("memory.db")).unwrap());
            let c = store.create("owner", "garden").unwrap();
            let manager = store.filesystem_manager("owner").unwrap();
            let input = Bundle {
                version: 1,
                vault: "synthetic".into(),
                files: vec![VaultFile {
                    path: "memories/garden/reference.md".into(),
                    body: "signed approval marker".into(),
                }],
                rejected: vec![],
            };
            let mapping = Mapping {
                scopes: BTreeMap::from([(
                    "garden".into(),
                    Target::Namespace {
                        namespace: c.namespace.clone(),
                        project_key: None,
                    },
                )]),
                files: Default::default(),
                mixed: Default::default(),
            };
            let mut preview = store.preview_import(&manager, &input, &mapping).unwrap();
            if mode.starts_with("expiry") {
                preview.expires = unix_now() + 2;
                let key = store
                    .inner
                    .lock()
                    .unwrap()
                    .auth(&c.lifecycle, true, false)
                    .unwrap()
                    .cursor_key;
                let hash = preview_hash(&preview).unwrap();
                for hat in &mut preview.hats {
                    hat.proof = hex::encode(mac(&key, &manager.owner, &hash).unwrap().finalize().into_bytes());
                }
            }
            let weak = Arc::downgrade(&store);
            let namespace = c.namespace.clone();
            *store.reset_hook.lock().unwrap() = Some(Arc::new(move |at| {
                if mode == "epoch" && at == ResetPhase::ImportVerified {
                    let store = weak.upgrade().unwrap();
                    store
                        .attach(
                            &namespace,
                            FeedConfig {
                                collector_url: "http://localhost/".into(),
                                namespace_epoch: "a".repeat(64),
                                activity_token: format!("hnry_activity_{}", "b".repeat(64)),
                                activity: true,
                                internal_network: true,
                            },
                            &hennery_gateway::key::MasterKey::from_bytes([9; 32]),
                        )
                        .unwrap();
                    // Model a successful poll in the new epoch. Approval must
                    // remain bound to its old epoch even with a fresh lease.
                    store.inner.lock().unwrap().leases.insert(
                        namespace.clone(),
                        (Instant::now() + Duration::from_secs(60), unix_now() + 60),
                    );
                }
                if (mode == "expiry_before" && at == ResetPhase::ImportVerified)
                    || (mode == "expiry_during" && at == ResetPhase::ManagedCommit)
                {
                    std::thread::sleep(Duration::from_secs(3));
                }
            }));
            let result = store.apply_import(&manager, &preview, &preview.digest).unwrap();
            *store.reset_hook.lock().unwrap() = None;
            assert_eq!(result[0].status, "untouched", "{mode}: stale signed approval committed");
            assert!(
                store
                    .managed_snapshot(&manager, &c.namespace)
                    .unwrap()
                    .entries
                    .is_empty()
            );
        }
    }

    #[test]
    fn correctly_signed_expired_or_overlong_previews_cannot_apply() {
        let d = tempfile::tempdir().unwrap();
        let store = Store::open(&d.path().join("memory.db")).unwrap();
        let c = store.create("owner", "garden").unwrap();
        let manager = store.filesystem_manager("owner").unwrap();
        let input = Bundle {
            version: 1,
            vault: "synthetic".into(),
            files: vec![VaultFile {
                path: "memories/garden/reference.md".into(),
                body: "synthetic content".into(),
            }],
            rejected: Vec::new(),
        };
        let mapping = Mapping {
            scopes: BTreeMap::from([(
                "garden".into(),
                Target::Namespace {
                    namespace: c.namespace.clone(),
                    project_key: None,
                },
            )]),
            files: BTreeMap::new(),
            mixed: BTreeSet::new(),
        };
        let original = store.preview_import(&manager, &input, &mapping).unwrap();
        let key = store
            .inner
            .lock()
            .unwrap()
            .auth(&c.lifecycle, true, false)
            .unwrap()
            .cursor_key;
        for expires in [unix_now() - 1, unix_now() + 7200] {
            let mut proposal = original.clone();
            proposal.expires = expires;
            let hash = preview_hash(&proposal).unwrap();
            // Valid fixture signatures isolate expiry from tamper detection.
            for hat in &mut proposal.hats {
                hat.proof = hex::encode(mac(&key, &manager.owner, &hash).unwrap().finalize().into_bytes());
            }
            assert!(store.apply_import(&manager, &proposal, &proposal.digest).is_err());
            assert!(
                store
                    .managed_snapshot(&manager, &c.namespace)
                    .unwrap()
                    .entries
                    .is_empty()
            );
        }
        assert_eq!(
            store.apply_import(&manager, &original, &original.digest).unwrap()[0].status,
            "committed"
        );
    }
}
