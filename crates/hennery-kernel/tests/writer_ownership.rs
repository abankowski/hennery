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
