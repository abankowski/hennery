use anyhow::{Result, bail};
use clap::Args;
use hennery_gateway::local_callback::LocalCallback;
use std::time::Duration;

#[derive(Args)]
pub struct CallbackArgs {
    /// Fixed collector origin. No destination is read from callback parameters.
    #[arg(long)]
    collector: String,
    /// Exact redirect URI selected in the web UI and permitted by the vendor.
    #[arg(long, default_value = "http://localhost:8976/callback")]
    redirect_uri: String,
    /// Stop listening after this many seconds. Restart before another Connect.
    #[arg(long, default_value_t = 900, value_parser = clap::value_parser!(u64).range(1..=86400))]
    timeout_secs: u64,
}

pub async fn run(args: CallbackArgs) -> Result<()> {
    let local = LocalCallback::parse(&args.redirect_uri)?;
    let app = local.router(&args.collector)?;
    let listeners = local.bind().await?;
    let mut servers = tokio::task::JoinSet::new();
    for listener in listeners {
        let app = app.clone();
        servers.spawn(async move { axum::serve(listener, app).await });
    }
    eprintln!("Local OAuth callback ready at {}", args.redirect_uri);
    eprintln!("Now click Connect in Hennery in this browser. Keep this terminal open. Ctrl+C stops the receiver.");
    // Dropping JoinSet aborts every listener on timeout, signal or error.
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_secs(args.timeout_secs)) => {
            bail!("local callback receiver timed out; restart it and click Connect again")
        }
        result = tokio::signal::ctrl_c() => { result?; Ok(()) }
        result = servers.join_next() => {
            if let Some(result) = result { result??; }
            bail!("local callback listener stopped; restart it before connecting")
        }
    }
}
