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
