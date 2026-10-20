//! Operator facade for the kernel's launcher preferences.
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
    routing::get,
};
use hennery_kernel::{
    json::ApiJson,
    operator::Authenticated,
    session_defaults::{DefaultsChange, valid_id},
};
use hennery_proto::session_defaults::PutHatSessionDefaults;
use serde::Deserialize;

pub fn router(state: AppState) -> Router {
    let routes = Router::new()
        .route(
            "/api/hats/{id}/session-defaults",
            get(read).put(write.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
        )
        .layer(DefaultBodyLimit::max(16 * 1024));
    hennery_kernel::auth::operator_only(routes, state.operator.clone())
        .layer(middleware::map_response(|mut response: Response| async move {
            response.headers_mut().insert(
                axum::http::header::CACHE_CONTROL,
                axum::http::HeaderValue::from_static("private, no-store"),
            );
            response
        }))
        .with_state(state)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AgentQuery {
    agent: String,
}
async fn read(
    State(state): State<AppState>,
    Path(hat): Path<String>,
    query: Result<Query<AgentQuery>, axum::extract::rejection::QueryRejection>,
) -> Response {
    let Ok(Query(query)) = query else {
        return invalid();
    };
    if !valid_id(&query.agent, 128) {
        return invalid();
    }
    match state.hosts.session_defaults(&hat, &query.agent) {
        Ok(Some(value)) => Json(value).into_response(),
        Ok(None) => error(StatusCode::NOT_FOUND, "not_found", "not found"),
        Err(err) => internal(err),
    }
}
async fn write(
    State(state): State<AppState>,
    Path(hat): Path<String>,
    query: Result<Query<AgentQuery>, axum::extract::rejection::QueryRejection>,
    Extension(auth): Extension<Authenticated>,
    ApiJson(request): ApiJson<PutHatSessionDefaults>,
) -> Response {
    let Ok(Query(query)) = query else {
        return invalid();
    };
    match state.hosts.put_session_defaults(&hat, &query.agent, &request, &auth) {
        Ok(DefaultsChange::Done(value)) => Json(value).into_response(),
        Ok(DefaultsChange::NotFound) => error(StatusCode::NOT_FOUND, "not_found", "not found"),
        Ok(DefaultsChange::Purging) => error(StatusCode::CONFLICT, "hat_purging", "this hat is being purged"),
        Ok(DefaultsChange::Changed) => error(
            StatusCode::CONFLICT,
            "defaults_changed",
            "defaults changed; reload and review your edits",
        ),
        Ok(DefaultsChange::StepUpRequired) => hennery_kernel::auth::step_up_required(),
        Ok(DefaultsChange::Invalid) => invalid(),
        Err(err) => internal(err),
    }
}
fn invalid() -> Response {
    error(StatusCode::BAD_REQUEST, "invalid_defaults", "invalid session defaults")
}
