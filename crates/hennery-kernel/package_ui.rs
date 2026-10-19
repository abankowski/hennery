//! Validates a release package's complete UI inventory before embedding it.
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Component, Path};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Inventory {
    schema: u32,
    source_sha: String,
    files: BTreeMap<String, String>,
}

pub fn validate(root: &Path) -> Result<(), String> {
    let marker = fs::read(root.join("release-ui.json")).map_err(|e| e.to_string())?;
    let inventory: Inventory = serde_json::from_slice(&marker).map_err(|e| e.to_string())?;
    if inventory.schema != 1 || !hex(&inventory.source_sha, 40) || !inventory.files.contains_key("index.html") {
        return Err("invalid release UI schema, source revision or index.html".into());
    }
    for (name, digest) in &inventory.files {
        if !hex(digest, 64)
            || name.contains('\\')
            || Path::new(name).components().any(|c| !matches!(c, Component::Normal(_)))
            || name.split('/').any(|part| part.starts_with('.'))
            || name.ends_with(".map")
        {
            return Err(format!("invalid release UI entry: {name}"));
        }
    }
    let mut actual = BTreeMap::new();
    collect(&root.join("web-dist"), &root.join("web-dist"), &mut actual)?;
    if actual != inventory.files {
        return Err("release UI files differ from the approved inventory".into());
    }
    Ok(())
}

fn hex(value: &str, len: usize) -> bool {
    value.len() == len && value.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn collect(root: &Path, dir: &Path, files: &mut BTreeMap<String, String>) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let kind = entry.file_type().map_err(|e| e.to_string())?;
        if kind.is_symlink() {
            return Err("release UI contains a symlink".into());
        }
        if kind.is_dir() {
            collect(root, &path, files)?;
        } else if kind.is_file() {
            let bytes = fs::read(&path).map_err(|e| e.to_string())?;
            let name = path.strip_prefix(root).unwrap().to_str().ok_or("non-UTF8 UI path")?;
            files.insert(name.into(), hex::encode(Sha256::digest(bytes)));
        } else {
            return Err("release UI contains a non-regular file".into());
        }
    }
    Ok(())
}
