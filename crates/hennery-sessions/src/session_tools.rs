//! D2 handlers accept only the verified caller and one canonical typed request.
use crate::{
    AppState,
    delegation_runtime::{checked_cwd, config_offered, security_allowed},
    tool_args::{ToolCall, decode_tool},
};
use anyhow::{Result, ensure};
use hennery_gateway::identity::SessionIdentity;
use hennery_proto::{
    delegation_host::{CatalogFreshness, HostCatalog, SecurityClassification},
    delegation_status::{CapabilitiesResult, DelegationLimits},
    frames::Capability,
    rest::AnswerRequest,
};
use serde_json::Value;

pub(crate) fn unknown_catalog(agent: String) -> HostCatalog {
    HostCatalog {
        agent,
        adapter_revision: String::new(),
        config_options: vec![],
        defaults: Default::default(),
        security: SecurityClassification {
            known: false,
            axes: Default::default(),
        },
        freshness: CatalogFreshness::Unknown,
    }
}
pub async fn execute(
    state: &AppState,
    identity: &SessionIdentity,
    revision: i64,
    name: &str,
    args: Value,
) -> Result<Value> {
    let call = decode_tool(name, &args)?;
    let digest = call.request_digest();
    let caller = state
        .store
        .session_tool_context(identity, revision, true)?
        .ok_or_else(|| anyhow::anyhow!("session_starting"))?;
    if let Some(key) = call.operation_key().filter(|_| !matches!(call, ToolCall::Status(_)))
        && let Some(receipt) = state.store.delegation_retry(identity, revision, key, &digest)?
    {
        return Ok(serde_json::to_value(receipt)?);
    }
    match call {
        ToolCall::Capabilities(args) => {
            let cwd = checked_cwd(
                state,
                caller.host_id(),
                caller.hat_id(),
                args.cwd.as_deref().unwrap_or(caller.canonical_cwd()),
            )
            .await?;
            let runtimes = state.hub.runtime_ids(caller.host_id());
            if let Some(agent) = &args.agent {
                ensure!(runtimes.contains(agent), "runtime_unavailable");
            }
            let mut catalogs = Vec::new();
            for agent in runtimes
                .iter()
                .filter(|agent| args.agent.as_ref().is_none_or(|a| a == *agent))
            {
                catalogs.push(
                    state
                        .catalogs
                        .get(state, caller.host_id(), caller.hat_id(), &cwd, agent)
                        .await
                        .unwrap_or_else(|_| unknown_catalog(agent.clone())),
                );
            }
            Ok(serde_json::to_value(CapabilitiesResult {
                runtimes,
                catalogs,
                cwd,
                policy: state.store.execution_policy(caller.hat_id())?,
                limits: DelegationLimits {
                    children: 8,
                    starts_per_operator_epoch: 32,
                    queued_prompts: 32,
                    queued_bytes: 1024 * 1024,
                    message_bytes: 65536,
                },
            })?)
        }
        ToolCall::Spawn(mut args) => {
            ensure!(
                state.hub.has_capability(caller.host_id(), Capability::DelegationConfig),
                "session_tools_unavailable"
            );
            let agent = args.agent.as_deref().unwrap_or(caller.agent());
            ensure!(
                state.hub.runtime_ids(caller.host_id()).contains(&agent.to_string()),
                "runtime_unavailable"
            );
            let cwd = checked_cwd(state, caller.host_id(), caller.hat_id(), &args.cwd).await?;
            let catalog = state
                .catalogs
                .get(state, caller.host_id(), caller.hat_id(), &cwd, agent)
                .await
                .unwrap_or_else(|_| unknown_catalog(agent.to_string()));
            if args.config.model.is_none() && agent == caller.agent() {
                args.config.model = state
                    .store
                    .find_session(caller.session_id())?
                    .and_then(|s| s.config.model);
            }
            let fresh = catalog.freshness == CatalogFreshness::Fresh;
            if fresh {
                ensure!(config_offered(&catalog, &args.config), "configuration_unavailable");
            }
            let policy = state.store.execution_policy(caller.hat_id())?;
            let required = crate::delegation_runtime::launch_configuration(&catalog, &args.config, &policy);
            ensure!(
                (!fresh && required.mode.is_none() && required.axes.is_empty())
                    || security_allowed(&catalog, &policy, &required),
                "operator_required"
            );
            let mcp = crate::api::mcp_context(state, caller.host_id(), agent)?;
            Ok(serde_json::to_value(state.store.queue_spawn(
                identity,
                revision,
                &digest,
                &crate::delegation_queue::DelegatedLaunch {
                    key: &args.operation_key,
                    agent,
                    cwd: &cwd,
                    brief: &args.brief,
                    name: args.name.as_deref(),
                    config: &required,
                    mcp,
                },
            )?)?)
        }
        ToolCall::Send(args) => Ok(serde_json::to_value(state.store.queue_followup(
            identity,
            revision,
            &args.operation_key,
            &digest,
            &args.child_id,
            &args.text,
        )?)?),
        ToolCall::Answer(args) => {
            let answer = AnswerRequest::Elicitation {
                action: args.action,
                content: args.content,
            };
            Ok(serde_json::to_value(state.store.queue_ordinary_answer(
                identity,
                revision,
                &digest,
                &crate::delegation_control::DelegatedAnswer {
                    key: &args.operation_key,
                    child: &args.child_id,
                    pending: &args.pending_id,
                    answer: &answer,
                },
                &state.hub,
            )?)?)
        }
        ToolCall::Status(args) => Ok(serde_json::to_value(state.store.child_status(
            identity,
            revision,
            &args.child_id,
            args.operation_key.as_deref(),
        )?)?),
        ToolCall::List(args) => Ok(serde_json::to_value(state.store.child_list(
            identity,
            revision,
            args.cursor.as_deref(),
            args.limit.unwrap_or(25),
        )?)?),
        ToolCall::Close(args) => Ok(serde_json::to_value(state.store.queue_child_close(
            identity,
            revision,
            &args.operation_key,
            &digest,
            &args.child_id,
            &state.hub,
        )?)?),
    }
}
pub fn error_code(error: &anyhow::Error) -> &'static str {
    const CODES: &[&str] = &[
        "not_found",
        "operation_conflict",
        "operator_required",
        "queue_full",
        "child_limit",
        "start_budget",
        "generation_limit",
        "session_starting",
        "runtime_unavailable",
        "configuration_unavailable",
        "session_tools_unavailable",
        "catalog_unavailable",
        "catalog_stale",
        "catalog_busy",
        "host_offline",
        "invalid_cwd",
        "not_open",
        "already_answered",
        "invalid_arguments",
        "invalid_cursor",
    ];
    let message = error.to_string();
    CODES
        .iter()
        .copied()
        .find(|code| *code == message)
        .unwrap_or("invalid_arguments")
}
