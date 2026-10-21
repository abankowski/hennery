//! Operator-only launcher catalog and delegation attention.
use crate::delegation_settings::LimitsChange;
use crate::{
    AppState,
    api::{error, internal},
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, Path, Query, State},
    handler::Handler,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use hennery_kernel::json::ApiJson;
use hennery_kernel::operator::Authenticated;
use hennery_proto::delegation_status::PatchDelegationLimits;
use serde::Deserialize;
pub fn router(state: AppState) -> Router {
    let routes = Router::new()
        .route(
            "/api/settings/delegation-limits",
            get(limits).patch(patch_limits.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
        )
        .route("/api/hosts/{id}/runtime-catalog", get(catalog))
        .route("/api/delegation/attention", get(attention))
        .route("/api/delegation/attention/{id}/rearm", post(rearm))
        .route("/api/delegation/attention/{id}/acknowledge", post(acknowledge))
        .layer(DefaultBodyLimit::max(32 * 1024));
    hennery_kernel::auth::operator_only(routes, state.operator.clone()).with_state(state)
}

async fn limits(State(state): State<AppState>) -> Response {
    match state.store.delegation_limits() {
        Ok(limits) => Json(limits).into_response(),
        Err(err) => internal(err),
    }
}

async fn patch_limits(
    State(state): State<AppState>,
    Extension(auth): Extension<Authenticated>,
    patch: Result<ApiJson<PatchDelegationLimits>, hennery_kernel::json::ApiJsonRejection>,
) -> Response {
    let patch = match patch {
        Ok(ApiJson(patch)) => patch,
        Err(err) => {
            let response = err.into_response();
            if matches!(
                response.status(),
                StatusCode::BAD_REQUEST | StatusCode::UNPROCESSABLE_ENTITY
            ) {
                return invalid_limits();
            }
            return response;
        }
    };
    match state.store.patch_delegation_limits(&patch, &auth) {
        Ok(LimitsChange::Done(limits)) => Json(limits).into_response(),
        Ok(LimitsChange::StepUpRequired) => hennery_kernel::auth::step_up_required(),
        Ok(LimitsChange::Invalid) => invalid_limits(),
        Err(err) => internal(err),
    }
}
fn invalid_limits() -> Response {
    error(
        StatusCode::BAD_REQUEST,
        "invalid_limits",
        "Each delegation limit must be a whole number from 1 to 64.",
    )
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AttentionQuery {
    hat_id: Option<String>,
    #[serde(default)]
    after: String,
}
async fn attention(State(state): State<AppState>, Query(query): Query<AttentionQuery>) -> Response {
    if query.after.len() > 128 || query.hat_id.as_ref().is_some_and(|hat| hat.len() > 128) {
        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
    }
    match state.store.operator_attention(query.hat_id.as_deref(), &query.after) {
        Ok(rows) => Json(rows).into_response(),
        Err(err) => internal(err),
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Rearm {
    operator_turn_id: String,
}
async fn rearm(State(state): State<AppState>, Path(id): Path<String>, ApiJson(request): ApiJson<Rearm>) -> Response {
    if id.len() > 128 || request.operator_turn_id.len() > 128 {
        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
    }
    match state
        .store
        .rearm_delegation_attention(&id, &request.operator_turn_id, hennery_kernel::secret::unix_now())
    {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => error(
            StatusCode::CONFLICT,
            "rearm_unavailable",
            "a new operator prompt and eligible routing are required",
        ),
        Err(err) => internal(err),
    }
}
async fn acknowledge(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    if id.len() > 128 {
        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
    }
    match state.store.acknowledge_delegation_attention(&id) {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => error(
            StatusCode::CONFLICT,
            "acknowledgement_unavailable",
            "only an outstanding status report can be acknowledged",
        ),
        Err(err) => internal(err),
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CatalogQuery {
    agent: String,
    cwd: String,
}
async fn catalog(
    State(state): State<AppState>,
    Path(host): Path<String>,
    Query(query): Query<CatalogQuery>,
) -> Response {
    if query.agent.is_empty() || query.agent.len() > 128 || query.cwd.len() > 4096 {
        return error(StatusCode::BAD_REQUEST, "invalid_arguments", "invalid arguments");
    }
    let resolved = match crate::resolve::resolve_on_host(&state, &host, &query.cwd).await {
        Ok(cwd) if cwd.exists && cwd.is_dir => cwd,
        _ => {
            return error(
                StatusCode::BAD_REQUEST,
                "cwd_unavailable",
                "the working directory is unavailable",
            );
        }
    };
    let hat = match state.hosts.session_hat(&host, &resolved.canonical) {
        Ok(Some(hennery_kernel::hats::SessionHat::Decided(r))) => r.hat_id,
        _ => return error(StatusCode::NOT_FOUND, "not_found", "not found"),
    };
    match state
        .catalogs
        .get_operator(&state, &host, &hat, &resolved.canonical, &query.agent)
        .await
    {
        Ok(catalog) => Json(catalog).into_response(),
        Err(error_) => {
            let code = crate::session_tools::error_code(&error_);
            let name = state.hosts.host(&host).ok().flatten().map(|h| h.name).unwrap_or(host);
            let reason = match code {
                "auth_required" => "not signed in",
                "host_offline" => "host offline",
                "adapter_failed" => "adapter failed to provide a catalog",
                "timeout" => "catalog probe timed out",
                "busy" => "catalog probe busy; retry shortly",
                "runtime_unavailable" => "runtime unavailable",
                "cwd_unavailable" => "working directory unavailable",
                "catalog_stale" => "host reconnected during the catalog probe; retry",
                _ => "fresh catalog unavailable",
            };
            error(
                StatusCode::CONFLICT,
                code,
                format!("{} on {name}: {reason}", query.agent),
            )
        }
    }
}
