//! Explicit standalone service: no default data path and no core installer.
use clap::{Parser, Subcommand};
use hennery_memory::{http, store::Store};
use std::{
    os::unix::fs::{DirBuilderExt, PermissionsExt},
    path::PathBuf,
    sync::Arc,
};
#[derive(Parser)]
#[command(
    name = "hennery-memory",
    version,
    about = "Optional memory MCP service; no model required"
)]
struct Args {
    #[arg(long)]
    data_dir: PathBuf,
    #[command(subcommand)]
    command: Command,
}
#[derive(Subcommand)]
enum Command {
    /// Mint one isolated namespace's tool and lifecycle credentials, shown once.
    Create {
        #[arg(long)]
        owner: String,
        #[arg(long)]
        hat: String,
    },
    /// Run stateless HTTP MCP. Put TLS/authenticated routing in front for remote use.
    Serve {
        #[arg(long, default_value = "127.0.0.1:7332")]
        listen: std::net::SocketAddr,
    },
}
#[tokio::main]
async fn main() {
    if run().await.is_err() {
        eprintln!("memory operation failed; check private directory, configuration and namespace state");
        std::process::exit(1);
    }
}
async fn run() -> anyhow::Result<()> {
    let args = Args::parse();
    if !args.data_dir.exists() {
        std::fs::DirBuilder::new()
            .recursive(true)
            .mode(0o700)
            .create(&args.data_dir)?;
    }
    let meta = args.data_dir.symlink_metadata()?;
    anyhow::ensure!(
        meta.is_dir() && !meta.file_type().is_symlink() && meta.permissions().mode() & 0o077 == 0,
        "private real directory required"
    );
    let store = Arc::new(Store::open(&args.data_dir.join("memory.db"))?);
    match args.command {
        Command::Create { owner, hat } => {
            let c = store.create(&owner, &hat)?;
            println!(
                "{}",
                serde_json::json!({"namespace":c.namespace,"tool_credential":c.tool,"lifecycle_credential":c.lifecycle,"mode":"standalone; no collector lease or automatic deletion guarantee"})
            );
        }
        Command::Serve { listen } => {
            let listener = tokio::net::TcpListener::bind(listen).await?;
            println!("memory listening on {}", listener.local_addr()?);
            axum::serve(listener, http::router(store))
                .with_graceful_shutdown(async {
                    let _ = tokio::signal::ctrl_c().await;
                })
                .await?;
        }
    }
    Ok(())
}
