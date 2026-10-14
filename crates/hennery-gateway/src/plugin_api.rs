//! Generic owner management and machine authentication. No request body,
//! query, upstream error or private credential is logged by these routes.
use crate::{
    api::GatewayState,
    model::CredKind,
    plugin::{self, RegistrationInput},
};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, Request, State},
    handler::Handler,
    http::{HeaderMap, StatusCode, header},
    middleware,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
};
use hennery_kernel::{
    auth::{operator_only, require_step_up},
    json::ApiJson,
    secret::{random_bytes, unix_now},
};
use hennery_proto::plugin_management::*;

pub fn router(state: GatewayState) -> Router {
    let owner = Router::new()
        .route(
            "/api/plugins/registrations",
            get(list).post(register.layer(middleware::from_fn(require_step_up))),
        )
        .route("/api/plugins/receipts", get(receipts))
        .route(
            "/api/plugins/registrations/{id}",
            delete(revoke.layer(middleware::from_fn(require_step_up))),
        )
        .route(
            "/api/plugins/registrations/{id}/rotate",
            post(rotate.layer(middleware::from_fn(require_step_up))),
        )
        .layer(DefaultBodyLimit::max(16 * 1024))
        .layer(middleware::from_fn(owner_input));
    operator_only(owner, state.operator.clone())
        .with_state(state.clone())
        .merge(Router::new().route("/api/plugins/lease", post(lease)).with_state(state))
        .layer(middleware::map_response(no_store))
}
async fn owner_input(request: Request, next: middleware::Next) -> Response {
    if request.uri().query().is_some() {
        return error(StatusCode::BAD_REQUEST, "invalid_query");
    }
    if matches!(
        *request.method(),
        axum::http::Method::GET | axum::http::Method::HEAD | axum::http::Method::DELETE
    ) && !empty_machine_body(&request)
    {
        return error(StatusCode::BAD_REQUEST, "invalid_body");
    }
    next.run(request).await
}
pub async fn no_store(mut response: Response) -> Response {
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, "no-store".parse().expect("header"));
    response
}
pub fn error(status: StatusCode, code: &str) -> Response {
    (
        status,
        Json(hennery_proto::rest::ApiError {
            code: code.into(),
            message: match code {
                "reset_required" => "reset the source inventory before continuing",
                "busy" => "plug-in request budget exceeded",
                _ => "plug-in request refused",
            }
            .into(),
            session_id: None,
        }),
    )
        .into_response()
}
/// Machine routes never use browser cookies or accept an Origin, including
/// empty/null values. Exactly one canonical activity bearer is required.
pub fn machine_token(headers: &HeaderMap) -> Option<&str> {
    if headers.contains_key(header::ORIGIN) {
        return None;
    }
    let mut values = headers.get_all(header::AUTHORIZATION).iter();
    let value = values.next()?.to_str().ok()?;
    if values.next().is_some() {
        return None;
    }
    let token = value.strip_prefix("Bearer ")?;
    plugin::is_activity_token(token).then_some(token)
}
/// These routes have no body schema. Refuse unknown-length/chunked bodies
/// before polling them, so a caller cannot hold a task with a silent stream.
pub fn empty_machine_body(request: &Request) -> bool {
    use axum::body::HttpBody;
    !request.headers().contains_key(header::TRANSFER_ENCODING) && request.body().size_hint().exact() == Some(0)
}
/// URL decoding happens before uniqueness/type checks; encoded aliases do not
/// bypass the same policy. Scope/token authority is never taken from queries.
#[derive(Debug)]
pub struct InvalidQuery;
impl IntoResponse for InvalidQuery {
    fn into_response(self) -> Response {
        error(StatusCode::BAD_REQUEST, "invalid_query")
    }
}
pub fn machine_query(query: Option<&str>) -> Result<(Option<String>, usize), InvalidQuery> {
    let query = query.unwrap_or("");
    if query.len() > 4096 {
        return Err(InvalidQuery);
    }
    let mut cursor = None;
    let mut limit = None;
    for (key, value) in url::form_urlencoded::parse(query.as_bytes()) {
        match key.as_ref() {
            "after" if cursor.is_none() && !value.is_empty() && value.len() <= 2048 => {
                cursor = Some(value.into_owned())
            }
            "limit" if limit.is_none() => {
                let parsed = value.parse::<usize>().ok().filter(|n| (1..=20).contains(n));
                let Some(parsed) = parsed else {
                    return Err(InvalidQuery);
                };
                limit = Some(parsed);
            }
            _ => return Err(InvalidQuery),
        }
    }
    Ok((cursor, limit.unwrap_or(20)))
}
pub fn machine_failure(err: anyhow::Error) -> Response {
    // Errors are fixed policy labels; never return upstream/SQL/serde text.
    match err.to_string().as_str() {
        "reset_required" => error(StatusCode::CONFLICT, "reset_required"),
        "plug-in budget exceeded" => error(StatusCode::TOO_MANY_REQUESTS, "busy"),
        _ => error(StatusCode::NOT_FOUND, "not_found"),
    }
}
async fn list(State(state): State<GatewayState>) -> Response {
    match state.runtime.store.plugin_registrations() {
        Ok(items) => Json(items).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "unavailable"),
    }
}
async fn receipts(State(state): State<GatewayState>) -> Response {
    match state.runtime.store.plugin_deletion_receipts() {
        Ok(rows) => Json(rows).into_response(),
        Err(_) => error(StatusCode::SERVICE_UNAVAILABLE, "unavailable"),
    }
}
async fn register(State(state): State<GatewayState>, ApiJson(request): ApiJson<RegisterPluginRequest>) -> Response {
    let lifecycle_credential = zeroize::Zeroizing::new(request.lifecycle_credential);
    if !request.namespace_isolated
        || request.connection_id.len() > 128
        || lifecycle_credential.is_empty()
        || lifecycle_credential.len() > 8192
        || !lifecycle_credential.bytes().all(|b| (0x21..=0x7e).contains(&b))
    {
        return error(StatusCode::BAD_REQUEST, "invalid_registration");
    }
    // Snapshot endpoint and fingerprint together, under the same owner gate.
    let snapshot = state.runtime.store.plugin_discovery(&request.connection_id);
    let record = match snapshot {
        Ok(Some(s)) => s,
        Ok(None) => return error(StatusCode::NOT_FOUND, "not_found"),
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "unavailable"),
    };
    if record.cred_kind == CredKind::None
        || !record.has_credential
        || record.tool_allowlist.as_ref().is_none_or(|tools| {
            tools
                .iter()
                .any(|t| t.to_ascii_lowercase().starts_with("hennery_plugin_"))
        })
    {
        return error(StatusCode::BAD_REQUEST, "invalid_registration");
    }
    let distinct = match record.cred_kind {
        CredKind::Static => state
            .runtime
            .store
            .static_credential(&record.id, &state.runtime.key)
            .map(|c| c.is_some_and(|c| c.token.as_str() != lifecycle_credential.as_str())),
        _ => state
            .runtime
            .store
            .oauth_credential(&record.id, &state.runtime.key)
            .map(|c| {
                c.is_some_and(|c| {
                    c.tokens.access_token.as_str() != lifecycle_credential.as_str()
                        && c.tokens
                            .refresh_token
                            .as_ref()
                            .is_none_or(|s| s.as_str() != lifecycle_credential.as_str())
                })
            }),
    };
    if !matches!(distinct, Ok(true)) {
        return error(StatusCode::BAD_REQUEST, "invalid_registration");
    }
    let request_id = hex::encode(random_bytes::<32>());
    let capabilities = plugin::rpc::<hennery_proto::plugin::PluginCapabilities>(
        &state.runtime,
        plugin::RpcCall {
            endpoint: &record.url,
            internal: record.internal_network,
            credential: &lifecycle_credential,
            request_id: &request_id,
            method: "hennery_plugin_capabilities",
            params: serde_json::json!({"version":1}),
        },
        std::time::Duration::from_secs(5),
    )
    .await;
    let Ok(capabilities) = capabilities else {
        return error(StatusCode::BAD_GATEWAY, "unsupported_plugin");
    };
    let result = state.runtime.store.register_plugin_with_recovery(
        RegistrationInput {
            connection_id: &record.id,
            lifecycle_credential: &lifecycle_credential,
            activity: request.activity,
            startup: request.startup,
            capabilities,
        },
        &state.runtime.key,
        &record.fingerprint,
        unix_now(),
        request.recovery.as_ref(),
    );
    match result {
        Ok(grant) => {
            state.runtime.ensure_plugin_worker();
            Json(PluginGrantResponse {
                connection_id: record.id,
                namespace_epoch: grant.epoch,
                token: grant.token,
            })
            .into_response()
        }
        Err(_) => error(StatusCode::CONFLICT, "registration_conflict"),
    }
}
async fn revoke(State(state): State<GatewayState>, Path(id): Path<String>) -> Response {
    match state
        .runtime
        .plugin_mutation(&id, || state.runtime.store.revoke_plugin(&id, unix_now()))
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(_) => error(StatusCode::CONFLICT, "registration_conflict"),
    }
}
async fn rotate(
    State(state): State<GatewayState>,
    Path(id): Path<String>,
    ApiJson(request): ApiJson<RotatePluginRequest>,
) -> Response {
    let finish = match (&request.action, request.handover_id.as_deref()) {
        (RotationAction::Prepare, None) => None,
        (RotationAction::Finish, Some(id))
            if id.len() == 64 && id.bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()) =>
        {
            Some(id)
        }
        _ => return error(StatusCode::BAD_REQUEST, "invalid_rotation"),
    };
    match state.runtime.store.rotate_plugin(&id, finish) {
        Ok(result) => Json(result).into_response(),
        Err(_) => error(StatusCode::CONFLICT, "registration_conflict"),
    }
}
async fn lease(State(state): State<GatewayState>, request: axum::extract::Request) -> Response {
    let Some(token) = machine_token(request.headers()) else {
        return error(StatusCode::NOT_FOUND, "not_found");
    };
    if request.uri().query().is_some() {
        return error(StatusCode::BAD_REQUEST, "invalid_query");
    }
    let token = token.to_string();
    // No caller-controlled lease body or alternate credential transport.
    if !empty_machine_body(&request) {
        return error(StatusCode::BAD_REQUEST, "invalid_body");
    }
    let watch = match state.runtime.store.watch_plugin(&token) {
        Ok(w) => w,
        Err(e) => return machine_failure(e),
    };
    let result = state.runtime.store.plugin_lease(&token);
    if watch.token().is_cancelled() {
        return error(StatusCode::NOT_FOUND, "not_found");
    }
    match result {
        Ok(lease) => watched_json(&lease, watch),
        Err(e) => machine_failure(e),
    }
}
/// Keep the admission watch until body delivery and suppress a body revoked
/// after handler completion. JSON is serialized only after the scope check.
pub fn watched_json(value: &impl serde::Serialize, watch: crate::revocation::Watch) -> Response {
    let bytes = match serde_json::to_vec(value) {
        Ok(b) => b,
        Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, "unavailable"),
    };
    let cancelled = watch.token();
    let body = futures::stream::once(async move {
        let _watch = watch;
        if cancelled.is_cancelled() {
            Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "plug-in access revoked",
            ))
        } else {
            Ok::<_, std::io::Error>(axum::body::Bytes::from(bytes))
        }
    });
    let mut response = Response::new(axum::body::Body::from_stream(body));
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, "application/json".parse().expect("header"));
    response
}
