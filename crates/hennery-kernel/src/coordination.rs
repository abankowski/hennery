//! Process ownership and the owner lifecycle gate. Every writer opens through
//! `db::open`, even before the first optional registration exists.

use anyhow::{Context, Result, bail};
use std::collections::HashMap;
use std::os::fd::AsRawFd;
use std::os::unix::fs::MetadataExt;
use std::os::unix::fs::OpenOptionsExt;
use std::path::Path;
use std::sync::{Arc, Condvar, Mutex, OnceLock, Weak};

/// Reentrant on one thread so a store can call a second module while it
/// owns the gate. Guards cannot cross an await or move to another thread.
#[derive(Debug, Default)]
pub struct Gate {
    state: Mutex<GateState>,
    ready: Condvar,
}
#[derive(Debug, Default)]
struct GateState {
    owner: Option<std::thread::ThreadId>,
    depth: usize,
}
pub struct GateGuard {
    gate: Arc<Gate>,
    _thread: std::marker::PhantomData<std::rc::Rc<()>>,
}
impl Gate {
    pub fn lock(self: &Arc<Self>) -> GateGuard {
        let thread = std::thread::current().id();
        let mut state = self.state.lock().expect("lifecycle gate");
        while state.owner.is_some_and(|owner| owner != thread) {
            state = self.ready.wait(state).expect("lifecycle gate");
        }
        state.owner = Some(thread);
        state.depth += 1;
        GateGuard {
            gate: self.clone(),
            _thread: std::marker::PhantomData,
        }
    }
}
impl Drop for GateGuard {
    fn drop(&mut self) {
        let mut state = self.gate.state.lock().expect("lifecycle gate");
        state.depth -= 1;
        if state.depth == 0 {
            state.owner = None;
            self.gate.ready.notify_all();
        }
    }
}

#[derive(Debug, Default)]
pub struct Coordination {
    pub gate: Arc<Gate>,
    // Pin the identity used by OWNERS even after the last SQLite connection
    // closes. An unlinked inode must not be recycled into a live registry key.
    _database: Option<std::fs::File>,
    _ownership: Option<std::fs::File>,
}

impl Coordination {
    pub(crate) fn acquire(file: std::fs::File, path: &Path) -> Result<Arc<Self>> {
        type Registry = Mutex<HashMap<(u64, u64), Weak<Coordination>>>;
        static OWNERS: OnceLock<Registry> = OnceLock::new();
        let metadata = file.metadata()?;
        anyhow::ensure!(metadata.nlink() == 1, "hard-linked databases are refused");
        let identity = (metadata.dev(), metadata.ino());
        let mut owners = OWNERS.get_or_init(Mutex::default).lock().expect("writer registry");
        if let Some(owner) = owners.get(&identity).and_then(Weak::upgrade) {
            return Ok(owner);
        }
        // Darwin SQLite may itself use flock on its database. Ownership
        // therefore has a distinct private sidecar, never the SQLite file.
        let canonical = path.canonicalize()?;
        let mut lock_path = canonical.as_os_str().to_os_string();
        lock_path.push(".writer.lock");
        let lock_file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW)
            .open(lock_path)?;
        anyhow::ensure!(
            lock_file.metadata()?.nlink() == 1,
            "hard-linked writer locks are refused"
        );
        // SAFETY: lock_file owns this descriptor; released when the handle closes.
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        while unsafe { libc::flock(lock_file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            let err = std::io::Error::last_os_error();
            if err.raw_os_error() == Some(libc::EWOULDBLOCK) {
                if std::time::Instant::now() < deadline {
                    std::thread::sleep(std::time::Duration::from_millis(20));
                    continue;
                }
                bail!("another process owns this database writer");
            }
            return Err(err).context("acquire database writer ownership");
        }
        let owner = Arc::new(Self {
            gate: Arc::default(),
            _database: Some(file),
            _ownership: Some(lock_file),
        });
        owners.insert(identity, Arc::downgrade(&owner));
        Ok(owner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inspect_descriptor(descriptor: std::os::fd::RawFd) -> std::io::Result<libc::stat> {
        // SAFETY: fstat only inspects the descriptor; the output is read only
        // when libc reports that it initialized the stat structure.
        let mut metadata = std::mem::MaybeUninit::<libc::stat>::uninit();
        if unsafe { libc::fstat(descriptor, metadata.as_mut_ptr()) } != 0 {
            return Err(std::io::Error::last_os_error());
        }
        Ok(unsafe { metadata.assume_init() })
    }

    #[test]
    fn registry_identity_stays_pinned_until_coordination_is_released() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("hennery.db");
        let file = std::fs::File::create(&path).unwrap();
        let descriptor = file.as_raw_fd();
        let identity = inspect_descriptor(descriptor).unwrap();
        let owner = Coordination::acquire(file, &path).unwrap();
        // Model fixture teardown or removal while a recovery worker still
        // holds coordination after the last SQLite connection has closed.
        std::fs::remove_file(&path).unwrap();
        let metadata = inspect_descriptor(descriptor).expect("registry identity descriptor was closed");
        assert_eq!((metadata.st_dev, metadata.st_ino), (identity.st_dev, identity.st_ino));
        assert_eq!(metadata.st_nlink, 0);
        drop(owner);
    }
}
