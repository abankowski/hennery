//! Operator-only execution policy and the launcher's shared host catalog.
use crate::{
    AppState,
    api::{error, internal},
};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, Query, State},
    handler::Handler,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use hennery_kernel::json::ApiJson;
use hennery_proto::delegation_status::SetExecutionPolicy;
use serde::Deserialize;
use serde_json::Value;
pub fn router(state: AppState) -> Router {
    let routes = Router::new()
        .route(
            "/api/hats/{id}/delegation-policy",
            get(policy).patch(set_policy.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
        )
        .route("/api/hosts/{id}/runtime-catalog", get(catalog))
        .route("/api/delegation/attention", get(attention))
        .route("/api/delegation/attention/{id}/rearm", post(rearm))
        .layer(DefaultBodyLimit::max(32 * 1024));
    hennery_kernel::auth::operator_only(routes, state.operator.clone()).with_state(state)
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
async fn policy(State(state): State<AppState>, Path(hat): Path<String>) -> Response {
    if !matches!(state.hosts.hat(&hat), Ok(Some(_))) {
        return error(StatusCode::NOT_FOUND, "not_found", "not found");
    }
    match state.store.execution_policy(&hat) {
        Ok(policy) => Json(policy).into_response(),
        Err(err) => internal(err),
    }
}
async fn set_policy(
    State(state): State<AppState>,
    Path(hat): Path<String>,
    ApiJson(value): ApiJson<Value>,
) -> Response {
    if !value.is_object() {
        return error(StatusCode::BAD_REQUEST, "invalid_policy", "invalid policy");
    }
    let Ok(request) = serde_json::from_value::<SetExecutionPolicy>(value) else {
        return error(StatusCode::BAD_REQUEST, "invalid_policy", "invalid policy");
    };
    if !matches!(state.hosts.hat(&hat), Ok(Some(_))) {
        return error(StatusCode::NOT_FOUND, "not_found", "not found");
    }
    match state.store.set_execution_policy(&hat, &request.allowed) {
        Ok(policy) => Json(policy).into_response(),
        Err(_) => error(StatusCode::BAD_REQUEST, "invalid_policy", "invalid policy"),
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
        _ => return error(StatusCode::BAD_REQUEST, "invalid_cwd", "invalid cwd"),
    };
    let hat = match state.hosts.session_hat(&host, &resolved.canonical) {
        Ok(Some(hennery_kernel::hats::SessionHat::Decided(r))) => r.hat_id,
        _ => return error(StatusCode::NOT_FOUND, "not_found", "not found"),
    };
    match state
        .catalogs
        .get(&state, &host, &hat, &resolved.canonical, &query.agent)
        .await
    {
        Ok(catalog) => Json(catalog).into_response(),
        Err(error_) => error(
            StatusCode::CONFLICT,
            crate::session_tools::error_code(&error_),
            "catalog unavailable",
        ),
    }
}
