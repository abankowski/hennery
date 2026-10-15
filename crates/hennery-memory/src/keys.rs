//! Dedicated key location; never inherits collector master-key configuration.
use anyhow::{Result, ensure};
use hennery_gateway::key::{self, KeySource, MasterKey};
use std::{
    os::unix::fs::{DirBuilderExt, PermissionsExt},
    path::Path,
};
pub fn load(data: &Path, ciphertext_exists: bool) -> Result<MasterKey> {
    let dir = data.join("memory-key");
    if !dir.exists() {
        std::fs::DirBuilder::new().mode(0o700).create(&dir)?;
    }
    let meta = dir.symlink_metadata()?;
    ensure!(
        meta.is_dir() && !meta.file_type().is_symlink() && meta.permissions().mode() & 0o077 == 0,
        "private key directory required"
    );
    Ok(key::load_or_create(
        &KeySource {
            data_dir: dir,
            env: None,
            credentials_dir: None,
        },
        ciphertext_exists,
    )?
    .0)
}
