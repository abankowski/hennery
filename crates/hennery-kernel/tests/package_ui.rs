#[path = "../package_ui.rs"]
mod package_ui;

use sha2::{Digest, Sha256};
use std::fs;

fn fixture() -> tempfile::TempDir {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("web-dist")).unwrap();
    fs::write(root.path().join("web-dist/index.html"), "<html>real UI</html>").unwrap();
    fs::write(
        root.path().join("release-ui.json"),
        serde_json::json!({
            "schema": 1, "source_sha": "a".repeat(40),
            "files": {"index.html": format!("{:x}", Sha256::digest(b"<html>real UI</html>"))}
        })
        .to_string(),
    )
    .unwrap();
    root
}

#[test]
fn accepts_inventory_and_rejects_each_damaged_package() {
    let root = fixture();
    assert!(package_ui::validate(root.path()).is_ok());
    for damage in [
        "missing",
        "changed",
        "extra",
        "map",
        "escape",
        "revision",
        "schema",
        "empty",
        "malformed",
    ] {
        let root = fixture();
        let marker = root.path().join("release-ui.json");
        let mut json: serde_json::Value = serde_json::from_slice(&fs::read(&marker).unwrap()).unwrap();
        match damage {
            "missing" => fs::remove_file(root.path().join("web-dist/index.html")).unwrap(),
            "changed" => fs::write(root.path().join("web-dist/index.html"), "bad").unwrap(),
            "extra" => fs::write(root.path().join("web-dist/extra.js"), "bad").unwrap(),
            "map" => {
                json["files"]["app.js.map"] = "a".repeat(64).into();
            }
            "escape" => {
                json["files"]["../secret"] = "a".repeat(64).into();
            }
            "revision" => json["source_sha"] = "main".into(),
            "schema" => json["schema"] = 2.into(),
            "empty" => json["files"] = serde_json::json!({}),
            "malformed" => {
                fs::write(&marker, "{}").unwrap();
                assert!(package_ui::validate(root.path()).is_err());
                continue;
            }
            _ => unreachable!(),
        }
        fs::write(&marker, json.to_string()).unwrap();
        assert!(package_ui::validate(root.path()).is_err(), "accepted {damage}");
    }
}

#[cfg(unix)]
#[test]
fn rejects_symlinked_assets() {
    let root = fixture();
    fs::rename(root.path().join("web-dist/index.html"), root.path().join("outside")).unwrap();
    std::os::unix::fs::symlink("../outside", root.path().join("web-dist/index.html")).unwrap();
    assert!(package_ui::validate(root.path()).is_err());
}
