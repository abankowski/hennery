//! D2 drains parent commands only. D3 will produce durable child notices and
//! operator attention, then reuse these same transfer/config/close gates.
use crate::{AppState, delegation_runtime::checked_cwd};
use std::time::Duration;
pub fn after_startup(state: &AppState) {
    let state = state.clone();
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_millis(250));
        loop {
            tokio::select! {biased; ()=state.shutdown.cancelled()=>break,_=tick.tick()=>{}}
            if let Err(error) = drain(&state).await {
                tracing::warn!(code=%crate::session_tools::error_code(&error),"delegation dispatch deferred");
            }
        }
    });
}
pub async fn drain(state: &AppState) -> anyhow::Result<()> {
    state.store.dispatch_delegation_answers(&state.hub)?;
    for target in state.store.delegation_targets()? {
        let Some(session) = state.store.find_session(&target)? else {
            continue;
        };
        if !state.hub.is_ready(&session.host_id)
            || !matches!(session.lifecycle.as_str(), "starting" | "active" | "parked")
        {
            continue;
        }
        let work = async {
            let cwd = checked_cwd(state, &session.host_id, &session.hat_id, &session.cwd).await?;
            anyhow::ensure!(cwd == session.cwd, "invalid_cwd");
            let catalog = state
                .catalogs
                .get(state, &session.host_id, &session.hat_id, &cwd, &session.agent)
                .await?;
            if session.lifecycle == "active" {
                state.store.dispatch_delegated(&target, &catalog, &state.hub)?;
            } else {
                let mcp = crate::api::mcp_context(state, &session.host_id, &session.agent)?;
                state.store.attach_delegated(&target, mcp, &catalog, &state.hub)?;
            }
            Ok::<_, anyhow::Error>(())
        };
        tokio::select! {biased; ()=state.shutdown.cancelled()=>return Ok(()),_ = work=>{}}
    }
    Ok(())
}
