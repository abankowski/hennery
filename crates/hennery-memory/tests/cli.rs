use std::{os::unix::fs::PermissionsExt, path::Path, process::Command};
fn command(home: &Path) -> Command {
    let binary = env!("CARGO_BIN_EXE_hennery-memory");
    hennery_testkit::first_exec(binary);
    let mut command = Command::new(binary);
    command
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join("config"))
        .env("XDG_DATA_HOME", home.join("data"))
        .env("XDG_STATE_HOME", home.join("state"))
        .env("XDG_CACHE_HOME", home.join("cache"))
        .env_remove("HENNERY_DATA_DIR")
        .env_remove("HENNERY_HOST_DATA_DIR")
        .env_remove("HENNERY_MASTER_KEY")
        .env_remove("CREDENTIALS_DIRECTORY")
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR");
    command
}
#[test]
fn bootstrap_is_explicit_private_and_only_hashes_credentials() {
    let dir = tempfile::tempdir().unwrap();
    let data = dir.path().join("private");
    let output = command(dir.path())
        .arg("--data-dir")
        .arg(&data)
        .args(["create", "--owner", "owner", "--hat", "hat"])
        .output()
        .unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    let created: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert!(created["tool_credential"].as_str().unwrap().starts_with("hnry_plugin_"));
    assert!(
        created["lifecycle_credential"]
            .as_str()
            .unwrap()
            .starts_with("hnry_lifecycle_")
    );
    assert_eq!(data.metadata().unwrap().permissions().mode() & 0o777, 0o700);
    assert_eq!(
        data.join("memory.db").metadata().unwrap().permissions().mode() & 0o777,
        0o600
    );
    let bytes = std::fs::read(data.join("memory.db")).unwrap();
    for key in ["tool_credential", "lifecycle_credential"] {
        let token = created[key].as_str().unwrap().as_bytes();
        assert!(!bytes.windows(token.len()).any(|s| s == token));
    }
}
#[test]
fn missing_data_dir_and_unsafe_directory_are_refused() {
    let dir = tempfile::tempdir().unwrap();
    assert!(
        !command(dir.path())
            .args(["create", "--owner", "owner", "--hat", "hat"])
            .status()
            .unwrap()
            .success()
    );
    let public = dir.path().join("public");
    std::fs::create_dir(&public).unwrap();
    std::fs::set_permissions(&public, std::fs::Permissions::from_mode(0o755)).unwrap();
    assert!(
        !command(dir.path())
            .arg("--data-dir")
            .arg(&public)
            .args(["create", "--owner", "owner", "--hat", "hat"])
            .status()
            .unwrap()
            .success()
    );
    assert!(!public.join("memory.db").exists());
    let target = dir.path().join("target");
    std::fs::create_dir(&target).unwrap();
    std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o700)).unwrap();
    let link = dir.path().join("link");
    std::os::unix::fs::symlink(&target, &link).unwrap();
    assert!(
        !command(dir.path())
            .arg("--data-dir")
            .arg(&link)
            .args(["create", "--owner", "owner", "--hat", "hat"])
            .status()
            .unwrap()
            .success()
    );
    assert!(!target.join("memory.db").exists());
}
