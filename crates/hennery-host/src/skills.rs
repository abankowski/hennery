//! The host's skill store (skills spec §6): each skill's files live in
//! `<data_dir>/skills/<id>.<hash12>/<name>/`, and both agents' skill
//! directories hold a symlink `<name>` into it. A sqlite registry records
//! what was installed and which links were made, so removal touches only
//! what hennery created.

use crate::agent_home::{self, CLAUDE, CODEX};
use crate::runtime::extract::{self, Limits, replace_symlink};
use anyhow::{Context, Result};
use hennery_proto::frames::{SkillFailed, SkillFailure, SkillSyncItem};
use hennery_proto::skills::{frontmatter, valid_name};
use rusqlite::{Connection, params};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// The store's directory in the host's data directory.
pub const DIR: &str = "skills";
/// The registry's file in the host's data directory.
pub const FILE: &str = "skills.db";

/// Bounds on an extracted skill (spec §5: 8 MiB, 512 files, 2 MiB a file;
/// the entry bound also counts directories).
const LIMITS: Limits = Limits {
    max_bytes: 8 << 20,
    max_entries: 1024,
    max_file: 2 << 20,
};

/// The agents' skill directories: `<agent root>/skills`, `None` when the
/// agent's root does not exist.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AgentDirs {
    pub claude: Option<PathBuf>,
    pub codex: Option<PathBuf>,
}

/// The skill directories of both agents under `env`.
pub fn agent_dirs(env: &[(String, String)]) -> AgentDirs {
    let dir = |agent| agent_home::resolve(agent, env).map(|home| PathBuf::from(home.root).join("skills"));
    AgentDirs {
        claude: dir(CLAUDE),
        codex: dir(CODEX),
    }
}

/// Whether the host holds a skill the collector lists.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Need {
    Have,
    Fetch,
}

pub struct Store {
    root: PathBuf,
    registry: Mutex<Connection>,
}

impl std::fmt::Debug for Store {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Store")
    }
}

fn failed(id: &str, reason: SkillFailure, agent: Option<&str>) -> SkillFailed {
    SkillFailed {
        id: id.to_string(),
        reason,
        agent: agent.map(str::to_string),
    }
}

/// A skill id is used in a directory name: plain characters only.
fn safe_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 128 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// What the registry held for a skill before a new install.
struct Previous {
    dir: Option<String>,
    links: Vec<PathBuf>,
}

impl Store {
    /// Open the store in `data_dir`: create `skills/` (0700) and the registry.
    pub fn open(data_dir: &Path) -> Result<Self> {
        use std::os::unix::fs::DirBuilderExt;
        let root = data_dir.join(DIR);
        std::fs::DirBuilder::new()
            .recursive(true)
            .mode(0o700)
            .create(&root)
            .with_context(|| format!("create {}", root.display()))?;
        let root = std::fs::canonicalize(&root).with_context(|| format!("resolve {}", root.display()))?;
        let path = data_dir.join(FILE);
        let conn = Connection::open(&path).with_context(|| format!("open {}", path.display()))?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "FULL")?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS skills (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 content_hash TEXT NOT NULL,
                 dir TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS links (
                 id TEXT NOT NULL,
                 agent TEXT NOT NULL,
                 path TEXT NOT NULL,
                 PRIMARY KEY (id, agent));",
        )?;
        Ok(Self {
            root,
            registry: Mutex::new(conn),
        })
    }

    /// The directory name the registry holds for `id`.
    fn dir_of(&self, id: &str) -> Option<String> {
        let conn = self.registry.lock().expect("skills registry lock");
        conn.query_row("SELECT dir FROM skills WHERE id = ?1", [id], |row| row.get(0))
            .ok()
    }

    /// Which of `items` the host holds already: the same id with the same hash.
    pub fn plan(&self, items: &[SkillSyncItem]) -> Vec<(SkillSyncItem, Need)> {
        let conn = self.registry.lock().expect("skills registry lock");
        items
            .iter()
            .map(|item| {
                let hash: Option<String> = conn
                    .query_row("SELECT content_hash FROM skills WHERE id = ?1", [&item.id], |row| {
                        row.get(0)
                    })
                    .ok();
                let need = if hash.as_deref() == Some(item.content_hash.as_str()) {
                    Need::Have
                } else {
                    Need::Fetch
                };
                (item.clone(), need)
            })
            .collect()
    }

    /// Check, extract and link `tgz` for `item`. Empty on full success.
    pub fn install(&self, item: &SkillSyncItem, tgz: &[u8], dirs: &AgentDirs) -> Vec<SkillFailed> {
        let invalid = || vec![failed(&item.id, SkillFailure::Invalid, None)];
        let hash = hex::encode(Sha256::digest(tgz));
        if !safe_id(&item.id) || !valid_name(&item.name) || hash != item.content_hash {
            return invalid();
        }
        let dir_name = format!("{}.{}", item.id, &item.content_hash[..12]);
        let store_dir = self.root.join(&dir_name);
        let skill_dir = store_dir.join(&item.name);
        if std::fs::symlink_metadata(&store_dir).is_ok() {
            // A leftover of an earlier attempt, in hennery's own directory.
            if let Err(err) = std::fs::remove_dir_all(&store_dir) {
                tracing::warn!(error = %err, path = %store_dir.display(), "cannot clear a skill's store directory");
                return vec![failed(&item.id, SkillFailure::Io, None)];
            }
        }
        let extracted = std::fs::create_dir(&store_dir)
            .map_err(anyhow::Error::from)
            .and_then(|()| extract::tree(tgz, &skill_dir, LIMITS));
        if let Err(err) = extracted {
            let _ = std::fs::remove_dir_all(&store_dir);
            tracing::info!(id = %item.id, error = %format!("{err:#}"), "a skill archive did not extract");
            // A refusal is the archive's fault; a failed write is the host's.
            let io = err.chain().find_map(|cause| cause.downcast_ref::<std::io::Error>());
            let reason = match io.map(std::io::Error::kind) {
                Some(
                    std::io::ErrorKind::InvalidData
                    | std::io::ErrorKind::InvalidInput
                    | std::io::ErrorKind::UnexpectedEof
                    | std::io::ErrorKind::Other,
                )
                | None => SkillFailure::Invalid,
                Some(_) => SkillFailure::Io,
            };
            return vec![failed(&item.id, reason, None)];
        }
        let named = std::fs::read_to_string(skill_dir.join("SKILL.md"))
            .ok()
            .and_then(|text| frontmatter(&text).ok())
            .is_some_and(|front| front.name == item.name);
        if !named {
            let _ = std::fs::remove_dir_all(&store_dir);
            return invalid();
        }

        let mut failures = Vec::new();
        let mut made = Vec::new();
        for (agent, dir) in [(CLAUDE, &dirs.claude), (CODEX, &dirs.codex)] {
            match self.link(dir.as_deref(), agent, item, &skill_dir) {
                None => made.push((agent, dir.as_ref().expect("linked").join(&item.name))),
                Some(failure) => failures.push(failure),
            }
        }

        match self.record(item, &dir_name, &made) {
            Ok(previous) => {
                for stale in previous.links {
                    if !made.iter().any(|(_, path)| *path == stale) {
                        self.unlink_ours(&stale);
                    }
                }
                if let Some(old) = previous.dir.filter(|old| *old != dir_name) {
                    self.remove_store_dir(&old);
                }
            }
            Err(err) => {
                tracing::warn!(id = %item.id, error = %format!("{err:#}"), "cannot record a skill");
                failures.push(failed(&item.id, SkillFailure::Io, None));
            }
        }
        failures
    }

    /// Replace the registry rows of `item`; returns the rows it had before.
    fn record(&self, item: &SkillSyncItem, dir: &str, made: &[(&str, PathBuf)]) -> Result<Previous> {
        let mut conn = self.registry.lock().expect("skills registry lock");
        let tx = conn.transaction()?;
        let old_dir = tx
            .query_row("SELECT dir FROM skills WHERE id = ?1", [&item.id], |row| row.get(0))
            .ok();
        let mut old_links = Vec::new();
        {
            let mut stmt = tx.prepare("SELECT path FROM links WHERE id = ?1")?;
            for path in stmt.query_map([&item.id], |row| row.get::<_, String>(0))? {
                old_links.push(PathBuf::from(path?));
            }
        }
        tx.execute("DELETE FROM links WHERE id = ?1", [&item.id])?;
        tx.execute(
            "INSERT OR REPLACE INTO skills (id, name, content_hash, dir) VALUES (?1, ?2, ?3, ?4)",
            params![item.id, item.name, item.content_hash, dir],
        )?;
        for (agent, path) in made {
            tx.execute(
                "INSERT INTO links (id, agent, path) VALUES (?1, ?2, ?3)",
                params![item.id, agent, path.to_string_lossy()],
            )?;
        }
        tx.commit()?;
        Ok(Previous {
            dir: old_dir,
            links: old_links,
        })
    }

    /// Point `agent_dir/<name>` at `target`. `None` on success.
    fn link(&self, agent_dir: Option<&Path>, agent: &str, item: &SkillSyncItem, target: &Path) -> Option<SkillFailed> {
        let Some(agent_dir) = agent_dir else {
            return Some(failed(&item.id, SkillFailure::AgentDirMissing, Some(agent)));
        };
        let io = || Some(failed(&item.id, SkillFailure::Io, Some(agent)));
        // The agent's root exists (`agent_dirs`); its `skills` may not yet.
        if !agent_dir.parent().is_some_and(Path::is_dir) {
            return Some(failed(&item.id, SkillFailure::AgentDirMissing, Some(agent)));
        }
        if let Err(err) = std::fs::create_dir_all(agent_dir) {
            tracing::warn!(error = %err, path = %agent_dir.display(), "cannot create an agent's skills directory");
            return io();
        }
        let link = agent_dir.join(&item.name);
        match std::fs::symlink_metadata(&link) {
            Ok(_) if !self.is_ours(&link) => {
                return Some(failed(&item.id, SkillFailure::Conflict, Some(agent)));
            }
            Ok(_) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
            Err(err) => {
                tracing::warn!(error = %err, path = %link.display(), "cannot inspect a skill link");
                return io();
            }
        }
        match replace_symlink(&link, target) {
            Ok(()) => None,
            Err(err) => {
                tracing::warn!(error = %err, path = %link.display(), "cannot link a skill");
                io()
            }
        }
    }

    /// `path` is a symlink into the store (it may dangle).
    fn is_ours(&self, path: &Path) -> bool {
        std::fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_symlink())
            && std::fs::read_link(path).is_ok_and(|target| target.starts_with(&self.root))
    }

    /// Remove `path` if it is a symlink into the store; never follows it.
    fn unlink_ours(&self, path: &Path) {
        if self.is_ours(path)
            && let Err(err) = std::fs::remove_file(path)
        {
            tracing::warn!(error = %err, path = %path.display(), "cannot remove a skill link");
        }
    }

    /// Remove a store directory by its name in the registry.
    fn remove_store_dir(&self, dir: &str) {
        let name = Path::new(dir);
        if name.components().count() != 1 || dir.starts_with('.') {
            tracing::warn!(dir, "a registry directory name is not plain; not removed");
            return;
        }
        let path = self.root.join(name);
        if let Err(err) = std::fs::remove_dir_all(&path)
            && err.kind() != std::io::ErrorKind::NotFound
        {
            tracing::warn!(error = %err, path = %path.display(), "cannot remove a skill's store directory");
        }
    }

    /// Unlink what hennery linked for `id`, delete its files and rows. A link
    /// path that is something else now is left and reported as a conflict.
    pub fn remove(&self, id: &str) -> Vec<SkillFailed> {
        let dir = self.dir_of(id);
        let links = {
            let conn = self.registry.lock().expect("skills registry lock");
            (|| -> rusqlite::Result<Vec<(String, String)>> {
                let mut stmt = conn.prepare("SELECT agent, path FROM links WHERE id = ?1")?;
                stmt.query_map([id], |row| Ok((row.get(0)?, row.get(1)?)))?.collect()
            })()
            .unwrap_or_default()
        };
        let mut failures = Vec::new();
        for (agent, path) in links {
            let path = PathBuf::from(path);
            if self.is_ours(&path) {
                self.unlink_ours(&path);
            } else if std::fs::symlink_metadata(&path).is_ok() {
                failures.push(failed(id, SkillFailure::Conflict, Some(&agent)));
            }
        }
        if let Some(dir) = dir {
            self.remove_store_dir(&dir);
        }
        let conn = self.registry.lock().expect("skills registry lock");
        let deleted = conn
            .execute("DELETE FROM links WHERE id = ?1", [id])
            .and_then(|_| conn.execute("DELETE FROM skills WHERE id = ?1", [id]));
        if let Err(err) = deleted {
            tracing::warn!(id, error = %err, "cannot delete a skill's registry rows");
            failures.push(failed(id, SkillFailure::Io, None));
        }
        failures
    }

    /// Bring the store to `items`: remove what is not listed, repair the
    /// links of what is held, and return what must be fetched. The first
    /// result lists the held skills linked in every agent directory.
    pub fn reconcile(
        &self,
        items: &[SkillSyncItem],
        dirs: &AgentDirs,
    ) -> (Vec<String>, Vec<SkillFailed>, Vec<SkillSyncItem>) {
        let listed: BTreeSet<&str> = items.iter().map(|item| item.id.as_str()).collect();
        let held: Vec<String> = {
            let conn = self.registry.lock().expect("skills registry lock");
            (|| -> rusqlite::Result<Vec<String>> {
                let mut stmt = conn.prepare("SELECT id FROM skills")?;
                stmt.query_map([], |row| row.get(0))?.collect()
            })()
            .unwrap_or_default()
        };
        let mut failures = Vec::new();
        for id in held.iter().filter(|id| !listed.contains(id.as_str())) {
            failures.extend(self.remove(id));
        }
        let (mut applied, mut fetch) = (Vec::new(), Vec::new());
        for (item, need) in self.plan(items) {
            let Some(dir) = self.dir_of(&item.id).filter(|_| need == Need::Have) else {
                fetch.push(item);
                continue;
            };
            let target = self.root.join(&dir).join(&item.name);
            if !target.is_dir() {
                // The files are gone: fetch again.
                self.remove(&item.id);
                fetch.push(item);
                continue;
            }
            let mut ok = true;
            let mut made = Vec::new();
            for (agent, agent_dir) in [(CLAUDE, &dirs.claude), (CODEX, &dirs.codex)] {
                let path = agent_dir.as_ref().map(|agent_dir| agent_dir.join(&item.name));
                let intact = path
                    .as_ref()
                    .is_some_and(|link| self.is_ours(link) && std::fs::read_link(link).is_ok_and(|t| t == target));
                let failure = if intact {
                    None
                } else {
                    self.link(agent_dir.as_deref(), agent, &item, &target)
                };
                match failure {
                    None => made.extend(path.map(|path| (agent, path))),
                    Some(failure) => {
                        ok = false;
                        failures.push(failure);
                    }
                }
            }
            if let Err(err) = self.record(&item, &dir, &made) {
                tracing::warn!(id = %item.id, error = %format!("{err:#}"), "cannot record a skill's links");
                ok = false;
                failures.push(failed(&item.id, SkillFailure::Io, None));
            }
            if ok {
                applied.push(item.id.clone());
            }
        }
        (applied, failures, fetch)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::os::unix::fs::PermissionsExt;

    /// A gzip tarball of `(path, mode, body)` files.
    fn tgz(entries: &[(&str, u32, &[u8])]) -> Vec<u8> {
        let mut builder = tar::Builder::new(Vec::new());
        for (path, mode, body) in entries {
            let mut header = tar::Header::new_gnu();
            header.set_entry_type(tar::EntryType::Regular);
            header.set_mode(*mode);
            header.set_size(body.len() as u64);
            builder.append_data(&mut header, path, *body).unwrap();
        }
        let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
        gz.write_all(&builder.into_inner().unwrap()).unwrap();
        gz.finish().unwrap()
    }

    fn skill_md(name: &str) -> String {
        format!("---\nname: {name}\ndescription: does {name}\n---\nbody\n")
    }

    fn item(id: &str, name: &str, archive: &[u8]) -> SkillSyncItem {
        SkillSyncItem {
            id: id.into(),
            name: name.into(),
            content_hash: hex::encode(Sha256::digest(archive)),
        }
    }

    struct Env {
        tmp: tempfile::TempDir,
        store: Store,
        dirs: AgentDirs,
    }

    impl Env {
        fn new(agents: &[&str]) -> Self {
            let tmp = tempfile::tempdir().unwrap();
            std::fs::create_dir(tmp.path().join("data")).unwrap();
            std::fs::create_dir(tmp.path().join("home")).unwrap();
            for agent in agents {
                std::fs::create_dir(tmp.path().join("home").join(agent)).unwrap();
            }
            let home = tmp.path().join("home").to_str().unwrap().to_string();
            let dirs = agent_dirs(&[("HOME".into(), home)]);
            let store = Store::open(&tmp.path().join("data")).unwrap();
            Self { tmp, store, dirs }
        }

        fn both() -> Self {
            Self::new(&[".claude", ".codex"])
        }

        fn claude(&self, name: &str) -> PathBuf {
            self.tmp.path().join("home/.claude/skills").join(name)
        }

        fn codex(&self, name: &str) -> PathBuf {
            self.tmp.path().join("home/.codex/skills").join(name)
        }

        fn rows(&self, table: &str) -> i64 {
            let conn = self.store.registry.lock().unwrap();
            conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| row.get(0))
                .unwrap()
        }
    }

    fn pdf() -> Vec<u8> {
        tgz(&[
            ("SKILL.md", 0o666, skill_md("pdf").as_bytes()),
            ("scripts/x.py", 0o755, b"print(1)\n"),
            ("notes.sh", 0o755, b"#!/bin/sh\n"),
        ])
    }

    #[test]
    fn install_extracts_and_links_into_both_agents() {
        let env = Env::both();
        let archive = pdf();
        let it = item("s1", "pdf", &archive);
        assert_eq!(env.store.install(&it, &archive, &env.dirs), vec![]);
        for link in [env.claude("pdf"), env.codex("pdf")] {
            assert!(std::fs::symlink_metadata(&link).unwrap().file_type().is_symlink());
            assert!(link.join("SKILL.md").is_file());
        }
        let mode = |p: PathBuf| std::fs::metadata(p).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode(env.claude("pdf").join("scripts/x.py")), 0o755);
        assert_eq!(mode(env.claude("pdf").join("SKILL.md")), 0o644);
        assert_eq!(
            mode(env.claude("pdf").join("notes.sh")),
            0o644,
            "only scripts/ keeps the bit"
        );
        assert_eq!((env.rows("skills"), env.rows("links")), (1, 2));
        assert_eq!(env.store.plan(std::slice::from_ref(&it))[0].1, Need::Have);
    }

    #[test]
    fn a_missing_agent_dir_is_reported_and_the_other_still_links() {
        let env = Env::new(&[".claude"]);
        let archive = pdf();
        let it = item("s1", "pdf", &archive);
        assert_eq!(
            env.store.install(&it, &archive, &env.dirs),
            vec![failed("s1", SkillFailure::AgentDirMissing, Some("codex"))]
        );
        assert!(env.claude("pdf").join("SKILL.md").is_file());
        assert!(!env.tmp.path().join("home/.codex").exists());
        assert_eq!(env.rows("links"), 1);
    }

    #[test]
    fn a_foreign_path_is_a_conflict_and_survives_removal() {
        let env = Env::both();
        std::fs::create_dir_all(env.claude("pdf")).unwrap();
        std::fs::write(env.claude("pdf").join("mine.txt"), "mine").unwrap();
        let archive = pdf();
        let it = item("s1", "pdf", &archive);
        assert_eq!(
            env.store.install(&it, &archive, &env.dirs),
            vec![failed("s1", SkillFailure::Conflict, Some("claude"))]
        );
        assert!(env.codex("pdf").join("SKILL.md").is_file());
        assert_eq!(env.store.remove("s1"), vec![]);
        assert_eq!(std::fs::read(env.claude("pdf").join("mine.txt")).unwrap(), b"mine");
        assert!(std::fs::symlink_metadata(env.codex("pdf")).is_err());
        assert_eq!(env.rows("skills"), 0);
    }

    #[test]
    fn a_hash_mismatch_or_bad_name_is_invalid() {
        let env = Env::both();
        let archive = pdf();
        let invalid = vec![failed("s1", SkillFailure::Invalid, None)];
        let mut wrong = item("s1", "pdf", &archive);
        wrong.content_hash = "0".repeat(64);
        assert_eq!(env.store.install(&wrong, &archive, &env.dirs), invalid);
        let bad_name = item("s1", "Bad Name", &archive);
        assert_eq!(env.store.install(&bad_name, &archive, &env.dirs), invalid);
        // SKILL.md names another skill.
        let other = tgz(&[("SKILL.md", 0o644, skill_md("other").as_bytes())]);
        assert_eq!(
            env.store.install(&item("s1", "pdf", &other), &other, &env.dirs),
            invalid
        );
        // Not a gzip tarball at all.
        assert_eq!(
            env.store.install(&item("s1", "pdf", b"junk"), b"junk", &env.dirs),
            invalid
        );
        assert_eq!((env.rows("skills"), env.rows("links")), (0, 0));
        assert!(std::fs::symlink_metadata(env.claude("pdf")).is_err());
        assert_eq!(
            std::fs::read_dir(env.tmp.path().join("data/skills")).unwrap().count(),
            0
        );
    }

    #[test]
    fn extraction_refuses_an_escaping_path() {
        let dir = tempfile::tempdir().unwrap();
        let mut builder = tar::Builder::new(Vec::new());
        let mut header = tar::Header::new_gnu();
        header.as_old_mut().name[..4].copy_from_slice(b"../x");
        header.set_entry_type(tar::EntryType::Regular);
        header.set_mode(0o644);
        header.set_size(1);
        header.set_cksum();
        builder.append(&header, &b"x"[..]).unwrap();
        let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
        gz.write_all(&builder.into_inner().unwrap()).unwrap();
        let bytes = gz.finish().unwrap();
        let dest = dir.path().join("out/skill");
        assert!(extract::tree(&bytes, &dest, LIMITS).is_err());
        assert!(!dir.path().join("out/x").exists() && !dir.path().join("x").exists());
    }

    #[test]
    fn a_changed_hash_replaces_the_directory_and_switches_the_link() {
        let env = Env::both();
        let v1 = pdf();
        let i1 = item("s1", "pdf", &v1);
        assert_eq!(env.store.install(&i1, &v1, &env.dirs), vec![]);
        let before = std::fs::read_link(env.claude("pdf")).unwrap();
        let v2 = tgz(&[
            ("SKILL.md", 0o644, skill_md("pdf").as_bytes()),
            ("new.txt", 0o644, b"n"),
        ]);
        let i2 = item("s1", "pdf", &v2);
        assert_eq!(env.store.plan(std::slice::from_ref(&i2))[0].1, Need::Fetch);
        assert_eq!(env.store.install(&i2, &v2, &env.dirs), vec![]);
        let after = std::fs::read_link(env.claude("pdf")).unwrap();
        assert_ne!(before, after);
        assert!(!before.exists(), "the old directory is gone");
        assert!(env.codex("pdf").join("new.txt").is_file());
        assert_eq!((env.rows("skills"), env.rows("links")), (1, 2));
    }

    #[test]
    fn reconcile_drops_unlisted_skills_and_relinks_missing_links() {
        let env = Env::both();
        let a = pdf();
        let b = tgz(&[("SKILL.md", 0o644, skill_md("docx").as_bytes())]);
        let (ia, ib) = (item("a", "pdf", &a), item("b", "docx", &b));
        assert_eq!(env.store.install(&ia, &a, &env.dirs), vec![]);
        assert_eq!(env.store.install(&ib, &b, &env.dirs), vec![]);
        std::fs::remove_file(env.claude("pdf")).unwrap();
        let fresh = item("c", "new", b"never fetched");
        let (applied, failures, fetch) = env.store.reconcile(&[ia.clone(), fresh.clone()], &env.dirs);
        assert_eq!((applied, failures, fetch), (vec!["a".to_string()], vec![], vec![fresh]));
        assert!(env.claude("pdf").join("SKILL.md").is_file());
        assert!(std::fs::symlink_metadata(env.claude("docx")).is_err());
        assert!(std::fs::symlink_metadata(env.codex("docx")).is_err());
        assert_eq!(env.rows("skills"), 1);
        // A foreign directory where a link is missing is a conflict, left alone.
        std::fs::remove_file(env.codex("pdf")).unwrap();
        std::fs::create_dir(env.codex("pdf")).unwrap();
        let (applied, failures, _) = env.store.reconcile(&[ia], &env.dirs);
        assert!(applied.is_empty());
        assert_eq!(failures, vec![failed("a", SkillFailure::Conflict, Some("codex"))]);
        assert!(env.codex("pdf").is_dir());
    }

    #[test]
    fn remove_only_touches_links_into_the_store() {
        let env = Env::both();
        let archive = pdf();
        let it = item("s1", "pdf", &archive);
        assert_eq!(env.store.install(&it, &archive, &env.dirs), vec![]);
        // The user replaced the codex link by their own symlink.
        let elsewhere = env.tmp.path().join("elsewhere");
        std::fs::create_dir(&elsewhere).unwrap();
        std::fs::write(elsewhere.join("keep"), "k").unwrap();
        std::fs::remove_file(env.codex("pdf")).unwrap();
        std::os::unix::fs::symlink(&elsewhere, env.codex("pdf")).unwrap();
        let dir = std::fs::read_link(env.claude("pdf")).unwrap();
        assert_eq!(
            env.store.remove("s1"),
            vec![failed("s1", SkillFailure::Conflict, Some("codex"))]
        );
        assert!(std::fs::symlink_metadata(env.claude("pdf")).is_err());
        assert!(!dir.exists());
        assert_eq!(std::fs::read_link(env.codex("pdf")).unwrap(), elsewhere);
        assert_eq!(std::fs::read(elsewhere.join("keep")).unwrap(), b"k");
        assert_eq!((env.rows("skills"), env.rows("links")), (0, 0));
    }
}
