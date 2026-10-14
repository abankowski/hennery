use hennery_kernel::db;

#[test]
fn writer_ownership_precedes_configuration_and_is_shared_only_within_process() {
    if let Ok(path) = std::env::var("HENNERY_TEST_WRITER_DB") {
        assert!(db::open(std::path::Path::new(&path)).is_err());
        return;
    }
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    let first = db::open(&path).unwrap();
    let second = db::open(&path).unwrap();
    assert!(std::sync::Arc::ptr_eq(&first.coordination(), &second.coordination()));
    let status = std::process::Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "writer_ownership_precedes_configuration_and_is_shared_only_within_process",
        ])
        .env("HENNERY_TEST_WRITER_DB", &path)
        .status()
        .unwrap();
    assert!(status.success());
    assert!(!dir.path().join("plugin-control.db").exists());
}

#[test]
fn a_forked_child_cannot_cause_a_false_live_writer_refusal() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    let first = db::open(&path).unwrap();
    // SAFETY: the child calls only libc's delay and _exit, never Rust or
    // inherited mutexes. This deterministically models the pre-exec window.
    let child = unsafe { libc::fork() };
    assert!(child >= 0);
    if child == 0 {
        unsafe {
            libc::usleep(150_000);
            libc::_exit(0);
        }
    }
    drop(first);
    let reopened = db::open(&path);
    unsafe {
        libc::waitpid(child, std::ptr::null_mut(), 0);
    }
    assert!(reopened.is_ok(), "{:?}", reopened.err());
}

#[test]
fn database_and_writer_lock_hard_links_are_refused() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    drop(db::open(&path).unwrap());
    let alias = dir.path().join("alias.db");
    std::fs::hard_link(&path, &alias).unwrap();
    assert!(
        db::open(&path).is_err(),
        "database aliases must not create independent writer domains"
    );
    std::fs::remove_file(&alias).unwrap();
    let lock = dir.path().join("hennery.db.writer.lock");
    let alias_lock = dir.path().join("alias.lock");
    std::fs::hard_link(&lock, &alias_lock).unwrap();
    assert!(db::open(&path).is_err(), "writer lock aliases must be refused");
}

#[test]
fn distinct_store_connections_take_the_shared_owner_gate_before_their_own_mutex() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    let first = db::open(&path).unwrap();
    let second = db::CoordinatedConnection::new(db::open(&path).unwrap());
    let owner = first.coordination();
    let held = owner.gate.lock();
    let (ready_sent, ready) = std::sync::mpsc::channel();
    let (entered_sent, entered) = std::sync::mpsc::channel();
    std::thread::scope(|threads| {
        let worker = threads.spawn(move || {
            ready_sent.send(()).unwrap();
            let _conn = second.lock().unwrap();
            entered_sent.send(()).unwrap();
        });
        ready.recv().unwrap();
        assert!(
            matches!(
                entered.recv_timeout(std::time::Duration::from_millis(500)),
                Err(std::sync::mpsc::RecvTimeoutError::Timeout)
            ),
            "a distinct connection must not enter while the owner gate is held"
        );
        drop(held);
        entered.recv_timeout(std::time::Duration::from_secs(5)).unwrap();
        worker.join().unwrap();
    });
}
