//! D2 drains parent commands only. D3 will produce durable child notices and
//! operator attention, then reuse these same transfer/config/close gates.
use crate::{AppState, delegation_runtime::checked_cwd};
use std::time::Duration;
#[derive(Default)]
struct Cursors {
    prompts: String,
    answers: String,
}
pub fn after_startup(state: &AppState) {
    let state = state.clone();
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_millis(250));
        let mut cursors = Cursors::default();
        loop {
            tokio::select! {biased; ()=state.shutdown.cancelled()=>break,_=tick.tick()=>{}}
            if let Err(error) = drain_page(&state, &mut cursors).await {
                tracing::warn!(code=%crate::session_tools::error_code(&error),"delegation dispatch deferred");
            }
        }
    });
}
pub async fn drain(state: &AppState) -> anyhow::Result<()> {
    drain_page(state, &mut Cursors::default()).await
}
async fn drain_page(state: &AppState, cursors: &mut Cursors) -> anyhow::Result<()> {
    cursors.answers = state
        .store
        .dispatch_delegation_answers_after(&state.hub, &cursors.answers)?
        .unwrap_or_default();
    let targets = state.store.delegation_targets_after(&cursors.prompts)?;
    cursors.prompts = targets.last().cloned().unwrap_or_default();
    for target in targets {
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
                .await
                .unwrap_or_else(|_| crate::session_tools::unknown_catalog(session.agent.clone()));
            if session.lifecycle == "active" {
                let catalog = state.store.attached_delegation_catalog(&target, &catalog)?;
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
