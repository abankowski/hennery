//! Completed activity and reset inventory for scoped machine grants.
use crate::AppState;
use axum::{
    Router,
    extract::{Request, State},
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::get,
};
use hennery_gateway::plugin_api::{
    empty_machine_body, error, machine_failure, machine_query, machine_token, no_store, watched_json,
};

impl crate::store::Store {
    pub fn plugin_purge_preview(
        &self,
        hat: &str,
    ) -> anyhow::Result<Vec<hennery_proto::plugin_management::PluginRegistration>> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let result = self.plugins().registrations_for_hat_in(&tx, Some(hat))?;
        tx.commit()?;
        Ok(result)
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/plugins/activity", get(activity))
        .route("/api/plugins/inventory", get(inventory))
        .layer(middleware::map_response(no_store))
        .with_state(state)
}
async fn activity(State(state): State<AppState>, request: Request) -> Response {
    serve(state, request, false).await
}
async fn inventory(State(state): State<AppState>, request: Request) -> Response {
    serve(state, request, true).await
}
async fn serve(state: AppState, request: Request, inventory: bool) -> Response {
    let Some(token) = machine_token(request.headers()) else {
        return error(StatusCode::NOT_FOUND, "not_found");
    };
    let query = match machine_query(request.uri().query()) {
        Ok(q) => q,
        Err(e) => return e.into_response(),
    };
    let token = token.to_string();
    if !empty_machine_body(&request) {
        return error(StatusCode::BAD_REQUEST, "invalid_body");
    }
    let watch = match state.store.plugin_watch(&token) {
        Ok(w) => w,
        Err(e) => return machine_failure(e),
    };
    if inventory {
        let result = state.store.source_inventory(&token, query.0.as_deref(), query.1);
        if watch.token().is_cancelled() {
            return error(StatusCode::NOT_FOUND, "not_found");
        }
        match result {
            Ok(page) => watched_json(&page, watch),
            Err(e) => machine_failure(e),
        }
    } else {
        let result = state.store.activity_page(&token, query.0.as_deref(), query.1);
        if watch.token().is_cancelled() {
            return error(StatusCode::NOT_FOUND, "not_found");
        }
        match result {
            Ok(page) => watched_json(&page, watch),
            Err(e) => machine_failure(e),
        }
    }
}
