//! Host-local Git workspace provisioning. Never changes the source checkout.
use anyhow::{Context, Result, ensure};
use std::path::{Path, PathBuf};
use tokio::process::Command;

#[derive(Debug)]
pub struct CreatedWorkspace {
    pub root: PathBuf,
    pub repository: PathBuf,
    pub branch: String,
    pub base_commit: String,
}

async fn git(source: &Path, args: &[&str]) -> Result<String> {
    let output = crate::git::command(Path::new("git"), source, args, std::env::vars_os())
        .output()
        .await
        .context("running workspace Git")?;
    ensure!(
        output.status.success(),
        "workspace Git operation failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    Ok(String::from_utf8(output.stdout)?.trim_end().to_owned())
}

/// `destination` is selected by the host, never adopted if it already exists.
/// `id` is a generated identifier; refs are resolved to an immutable commit
/// before checkout. A linked worktree always gets a new branch.
pub async fn create(source: &Path, destination: &Path, id: &str, base: &str) -> Result<CreatedWorkspace> {
    ensure!(
        !id.is_empty() && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-'),
        "invalid workspace id"
    );
    ensure!(destination.is_absolute(), "workspace destination must be absolute");
    ensure!(
        tokio::fs::symlink_metadata(destination)
            .await
            .is_err_and(|e| e.kind() == std::io::ErrorKind::NotFound),
        "workspace destination already exists or is inaccessible"
    );
    let source = tokio::fs::canonicalize(source).await?;
    let root = git(&source, &["rev-parse", "--show-toplevel"]).await?;
    let revision = format!("{base}^{{commit}}");
    let commit = git(&source, &["rev-parse", "--verify", "--end-of-options", &revision]).await?;
    ensure!(
        commit.len() >= 40 && commit.bytes().all(|b| b.is_ascii_hexdigit()),
        "invalid resolved commit"
    );
    let branch = format!("hennery/{id}");
    git(
        &source,
        &[
            "worktree",
            "add",
            "-b",
            &branch,
            destination.to_str().context("non UTF-8 workspace destination")?,
            &commit,
        ],
    )
    .await?;
    Ok(CreatedWorkspace {
        root: destination.to_owned(),
        repository: PathBuf::from(root),
        branch,
        base_commit: commit,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn provisioning_is_idempotent_and_failed_preparation_remains_inspectable() {
        let temp = tempfile::tempdir().unwrap();
        let source = temp.path().join("repo");
        tokio::fs::create_dir(&source).await.unwrap();
        git(&source, &["init", "-q"]).await.unwrap();
        tokio::fs::create_dir(source.join("src")).await.unwrap();
        tokio::fs::write(source.join("src/file"), "base").await.unwrap();
        git(&source, &["add", "."]).await.unwrap();
        git(
            &source,
            &[
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.invalid",
                "commit",
                "-qm",
                "base",
            ],
        )
        .await
        .unwrap();
        let request = serde_json::json!({"kind":"create","id":"retry","source":source,"base":"HEAD","files":[]});
        let roots = vec![temp.path().to_owned()];
        let first = operate(request.clone(), &roots).await.unwrap();
        assert_eq!(operate(request.clone(), &roots).await.unwrap(), first);
        let original = PathBuf::from(first["root"].as_str().unwrap());
        git(&source, &["worktree", "remove", original.to_str().unwrap()])
            .await
            .unwrap();
        git(
            &source,
            &[
                "worktree",
                "add",
                "-b",
                "external-replacement",
                original.to_str().unwrap(),
                "HEAD",
            ],
        )
        .await
        .unwrap();
        tokio::fs::write(original.join("keep"), "external work").await.unwrap();
        assert!(
            operate(
                serde_json::json!({"kind":"cleanup","id":"retry","repository":source,"root":original,"discard":true}),
                &roots
            )
            .await
            .is_err()
        );
        assert_eq!(
            tokio::fs::read_to_string(original.join("keep")).await.unwrap(),
            "external work"
        );
        let mut changed = request.clone();
        changed["base"] = "HEAD~1".into();
        assert!(operate(changed, &roots).await.is_err());
        let mut failed = request.clone();
        failed["id"] = "failed".into();
        failed["files"] = serde_json::json!(["missing"]);
        let result = operate(failed, &roots).await.unwrap();
        assert!(result["error"].is_string());
        assert_eq!(
            operate(
                serde_json::json!({"kind":"inspect","id":"failed","source":source}),
                &roots
            )
            .await
            .unwrap(),
            result
        );
        let mut narrow = request;
        narrow["id"] = "outside".into();
        narrow["source"] = serde_json::json!(source.join("src"));
        assert!(operate(narrow, &[source.join("src")]).await.is_err());
        assert!(!source.join(".git/hennery-workspaces/outside").exists());
    }

    #[tokio::test]
    async fn prepared_workspace_cleanup_keeps_branch_and_refuses_local_files() {
        let temp = tempfile::tempdir().unwrap();
        let source = temp.path().join("repo");
        tokio::fs::create_dir(&source).await.unwrap();
        git(&source, &["init", "-q"]).await.unwrap();
        tokio::fs::write(source.join("tracked"), "base").await.unwrap();
        git(&source, &["add", "tracked"]).await.unwrap();
        git(
            &source,
            &[
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.invalid",
                "commit",
                "-qm",
                "base",
            ],
        )
        .await
        .unwrap();
        tokio::fs::write(source.join("AGENTS.md"), "local instructions")
            .await
            .unwrap();
        let roots = vec![temp.path().to_path_buf()];
        let result = operate(
            serde_json::json!({"kind":"create","id":"prepared","source":source,"base":"HEAD","files":["AGENTS.md"]}),
            &roots,
        )
        .await
        .unwrap();
        let root = PathBuf::from(result["root"].as_str().unwrap());
        assert_eq!(
            tokio::fs::read_to_string(root.join("AGENTS.md")).await.unwrap(),
            "local instructions"
        );
        let cleanup = serde_json::json!({"kind":"cleanup","id":"prepared","repository":source});
        assert!(operate(cleanup.clone(), &roots).await.is_err());
        tokio::fs::remove_file(root.join("AGENTS.md")).await.unwrap();
        assert_eq!(operate(cleanup.clone(), &roots).await.unwrap()["removed"], true);
        assert_eq!(operate(cleanup, &roots).await.unwrap()["removed"], true);
        assert!(
            !git(&source, &["rev-parse", "refs/heads/hennery/prepared"])
                .await
                .unwrap()
                .is_empty()
        );
    }

    #[tokio::test]
    async fn new_workspace_uses_committed_files_and_keeps_source_changes() {
        let temp = tempfile::tempdir().unwrap();
        let source = temp.path().join("source");
        tokio::fs::create_dir(&source).await.unwrap();
        git(&source, &["init", "-q"]).await.unwrap();
        tokio::fs::write(source.join("file"), "committed").await.unwrap();
        git(&source, &["add", "file"]).await.unwrap();
        git(
            &source,
            &[
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.invalid",
                "commit",
                "-qm",
                "initial",
            ],
        )
        .await
        .unwrap();
        tokio::fs::write(source.join("file"), "local changes").await.unwrap();
        let destination = temp.path().join("workspace");
        let created = create(&source, &destination, "test-1", "HEAD").await.unwrap();
        assert_eq!(
            tokio::fs::read_to_string(destination.join("file")).await.unwrap(),
            "committed"
        );
        assert_eq!(
            tokio::fs::read_to_string(source.join("file")).await.unwrap(),
            "local changes"
        );
        assert_eq!(created.branch, "hennery/test-1");
        assert!(create(&source, &destination, "test-2", "HEAD").await.is_err());
    }
}

#[derive(serde::Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum Operation {
    Preview {
        id: String,
        source: PathBuf,
        base: String,
    },
    Inspect {
        id: String,
        source: PathBuf,
    },
    Create {
        id: String,
        source: PathBuf,
        base: String,
        #[serde(default)]
        files: Vec<PathBuf>,
        command: Option<String>,
    },
    Cleanup {
        id: String,
        repository: PathBuf,
        root: Option<PathBuf>,
        #[serde(default)]
        discard: bool,
    },
}

/// Operations are host-local and bounded; only persisted ownership records may
/// authorize cleanup. No recursive directory deletion is used.
pub async fn operate(value: serde_json::Value, roots: &[PathBuf]) -> Result<serde_json::Value> {
    static OPERATIONS: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
    let _operation_guard = OPERATIONS.lock().await;
    let operation: Operation = serde_json::from_value(value)?;
    let (id, source) = match &operation {
        Operation::Create { id, source, .. }
        | Operation::Inspect { id, source }
        | Operation::Preview { id, source, .. } => (id, source),
        Operation::Cleanup { id, repository, .. } => (id, repository),
    };
    ensure!(
        !id.is_empty() && id.len() <= 80 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-'),
        "invalid workspace id"
    );
    let source = tokio::fs::canonicalize(source).await?;
    ensure!(
        roots.iter().any(|root| source.starts_with(root)),
        "workspace outside host roots"
    );
    let common = PathBuf::from(git(&source, &["rev-parse", "--path-format=absolute", "--git-common-dir"]).await?);
    if let Operation::Preview { ref base, .. } = operation {
        let commit = git(
            &source,
            &[
                "rev-parse",
                "--verify",
                "--end-of-options",
                &format!("{base}^{{commit}}"),
            ],
        )
        .await?;
        let branch = git(&source, &["rev-parse", "--abbrev-ref", "HEAD"]).await?;
        return Ok(serde_json::json!({"base_commit":commit,"branch":branch}));
    }
    let common = tokio::fs::canonicalize(common).await?;
    let registry = common.join("hennery-workspaces");
    ensure!(
        roots.iter().any(|root| registry.starts_with(root)),
        "generated workspace outside host roots"
    );
    if let Ok(metadata) = tokio::fs::symlink_metadata(&registry).await {
        ensure!(
            metadata.is_dir() && !metadata.file_type().is_symlink(),
            "invalid workspace registry"
        );
    } else {
        tokio::fs::DirBuilder::new().mode(0o700).create(&registry).await?;
    }
    let record = registry.join(format!("{id}.json"));
    match operation {
        Operation::Preview { .. } => unreachable!("preview returned above"),
        Operation::Inspect { .. } => Ok(serde_json::from_slice(&tokio::fs::read(&record).await?)?),
        Operation::Create {
            id,
            base,
            files,
            command,
            ..
        } => {
            ensure!(files.len() <= 64, "too many preparation files");
            let repository = PathBuf::from(git(&source, &["rev-parse", "--show-toplevel"]).await?);
            let fingerprint = serde_json::json!({"source":source,"base":base,"files":files,"command":command});
            if tokio::fs::try_exists(&record).await? {
                let mut recorded: serde_json::Value = serde_json::from_slice(&tokio::fs::read(&record).await?)?;
                ensure!(recorded["request"] == fingerprint, "workspace request conflict");
                if recorded["prepared"] != true {
                    recorded["error"] = "workspace preparation did not complete".into();
                }
                return Ok(recorded);
            }
            let destination = registry.join(&id);
            let commit = git(
                &source,
                &[
                    "rev-parse",
                    "--verify",
                    "--end-of-options",
                    &format!("{base}^{{commit}}"),
                ],
            )
            .await?;
            let relative = source.strip_prefix(&repository).context("source outside repository")?;
            let mut result = serde_json::json!({"request":fingerprint,"cwd":destination.join(relative),"prepared":false,"id":id,"root":destination,"repository":common,"branch":format!("hennery/{id}"),"base_commit":commit});
            // Ownership is recorded before preparation, so failed preparation
            // leaves a discoverable workspace rather than an unowned directory.
            use tokio::io::AsyncWriteExt;
            let mut out = tokio::fs::OpenOptions::new()
                .create_new(true)
                .mode(0o600)
                .write(true)
                .open(&record)
                .await?;
            out.write_all(&serde_json::to_vec(&result)?).await?;
            out.sync_all().await?;
            let preparation: Result<()> = async {
                create(&source, &destination, &id, &base).await?;
                let git_dir = tokio::fs::canonicalize(PathBuf::from(
                    git(&destination, &["rev-parse", "--absolute-git-dir"]).await?,
                ))
                .await?;
                let nonce = uuid::Uuid::now_v7().to_string();
                let mut marker = tokio::fs::OpenOptions::new()
                    .create_new(true)
                    .mode(0o600)
                    .write(true)
                    .open(git_dir.join("hennery-owner"))
                    .await?;
                marker.write_all(nonce.as_bytes()).await?;
                marker.sync_all().await?;
                result["git_dir"] = serde_json::json!(git_dir);
                result["ownership_nonce"] = nonce.into();
                tokio::fs::write(&record, serde_json::to_vec(&result)?).await?;
                let mut total = 0u64;
                for file in files {
                    ensure!(
                        !file.as_os_str().is_empty()
                            && file
                                .components()
                                .all(|part| matches!(part, std::path::Component::Normal(_))),
                        "invalid preparation path"
                    );
                    let mut from = repository.clone();
                    for part in file.components() {
                        from.push(part.as_os_str());
                        ensure!(
                            !tokio::fs::symlink_metadata(&from).await?.file_type().is_symlink(),
                            "preparation symlinks are not supported"
                        );
                    }
                    let metadata = tokio::fs::metadata(&from).await?;
                    ensure!(metadata.is_file(), "preparation entry must be a file");
                    total += metadata.len();
                    ensure!(total <= 16 * 1024 * 1024, "preparation files exceed 16 MiB");
                    let to = destination.join(&file);
                    // Do not overwrite checked-in files or traverse checkout links.
                    let mut ancestor = destination.clone();
                    for part in file.parent().unwrap_or(Path::new("")).components() {
                        ancestor.push(part.as_os_str());
                        match tokio::fs::symlink_metadata(&ancestor).await {
                            Ok(meta) => ensure!(
                                meta.is_dir() && !meta.file_type().is_symlink(),
                                "invalid preparation destination"
                            ),
                            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                                tokio::fs::create_dir(&ancestor).await?
                            }
                            Err(err) => return Err(err.into()),
                        }
                    }
                    let mut out = tokio::fs::OpenOptions::new()
                        .create_new(true)
                        .mode(0o600)
                        .write(true)
                        .open(&to)
                        .await?;
                    out.write_all(&tokio::fs::read(from).await?).await?;
                }
                if let Some(command) = command {
                    ensure!(command.len() <= 8192, "preparation command is too long");
                    let mut child = Command::new("sh");
                    child
                        .arg("-c")
                        .arg(command)
                        .current_dir(&destination)
                        .stdin(std::process::Stdio::null())
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .kill_on_drop(true);
                    for key in crate::adapter::HOST_SECRET_VARS
                        .iter()
                        .chain(crate::adapter::HOST_LOG_VARS)
                        .chain(crate::adapter::NESTING_VARS)
                    {
                        child.env_remove(key);
                    }
                    child.process_group(0);
                    let mut child = child.spawn()?;
                    struct Group(i32);
                    impl Drop for Group {
                        fn drop(&mut self) {
                            unsafe {
                                libc::killpg(self.0, libc::SIGKILL);
                            }
                        }
                    }
                    let _group = Group(child.id().context("preparation process missing")? as i32);
                    let status = tokio::time::timeout(std::time::Duration::from_secs(90), child.wait())
                        .await
                        .context("preparation timed out")??;
                    ensure!(status.success(), "workspace preparation command failed");
                }
                Ok(())
            }
            .await;
            match preparation {
                Ok(()) => result["prepared"] = true.into(),
                Err(err) => result["error"] = err.to_string().into(),
            }
            let pending = record.with_extension("pending");
            tokio::fs::write(&pending, serde_json::to_vec(&result)?).await?;
            tokio::fs::rename(&pending, &record).await?;
            Ok(result)
        }
        Operation::Cleanup {
            root: ref expected_root,
            discard,
            ..
        } => {
            ensure!(
                !tokio::fs::symlink_metadata(&record).await?.file_type().is_symlink(),
                "invalid ownership record"
            );
            let owned: serde_json::Value = serde_json::from_slice(&tokio::fs::read(&record).await?)?;
            let root = PathBuf::from(owned["root"].as_str().context("invalid recorded workspace")?);
            ensure!(
                root == registry.join(id) && expected_root.as_ref().is_none_or(|expected| *expected == root),
                "workspace ownership mismatch"
            );
            if tokio::fs::try_exists(&root).await? {
                let metadata = tokio::fs::symlink_metadata(&root).await?;
                ensure!(
                    metadata.is_dir() && !metadata.file_type().is_symlink(),
                    "workspace root was replaced"
                );
                let actual_common = tokio::fs::canonicalize(PathBuf::from(
                    git(&root, &["rev-parse", "--path-format=absolute", "--git-common-dir"]).await?,
                ))
                .await?;
                ensure!(actual_common == common, "workspace repository was replaced");
                let git_dir =
                    tokio::fs::canonicalize(PathBuf::from(git(&root, &["rev-parse", "--absolute-git-dir"]).await?))
                        .await?;
                ensure!(
                    owned["git_dir"].as_str() == git_dir.to_str(),
                    "workspace identity changed"
                );
                let marker = git_dir.join("hennery-owner");
                ensure!(
                    !tokio::fs::symlink_metadata(&marker).await?.file_type().is_symlink(),
                    "workspace ownership marker was replaced"
                );
                ensure!(
                    owned["ownership_nonce"].as_str() == Some(tokio::fs::read_to_string(marker).await?.as_str()),
                    "workspace ownership changed"
                );
                // Ignored files also block cleanup; Git's default remove would
                // otherwise silently discard ignored environment files.
                ensure!(
                    discard
                        || git(&root, &["status", "--porcelain", "--untracked-files=all", "--ignored"])
                            .await?
                            .is_empty(),
                    "workspace has local files or changes"
                );
                let path = root.to_str().context("invalid root")?;
                if discard {
                    git(&source, &["worktree", "remove", "--force", path]).await?;
                } else {
                    git(&source, &["worktree", "remove", path]).await?;
                }
            }
            Ok(serde_json::json!({"removed":true}))
        }
    }
}
