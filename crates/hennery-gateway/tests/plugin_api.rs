mod support;

use axum::{body::Body, http::{Request, StatusCode}};
use hennery_kernel::{operator::{Operator,SetupOutcome}, secret::unix_now};
use serde_json::Value;
use std::sync::Arc;
use tower::ServiceExt;

fn owner(world: &support::World) -> (hennery_gateway::api::GatewayState, String, String) {
    let operator=Arc::new(Operator::open(&world.db).unwrap());
    let now=unix_now();
    let setup=operator.issue_setup_token(now).unwrap().unwrap();
    let SetupOutcome::Done{phc,..}=operator.set_up(&setup,"correct horse battery","https://hennery.example",now).unwrap() else {panic!("setup")};
    let fresh=operator.open_session("test",&phc,now).unwrap().unwrap();
    let stale=operator.open_session("test",&phc,now-3600).unwrap().unwrap();
    let mut state=world.gateway(); state.operator=operator;
    (state,fresh,stale)
}

#[tokio::test]
async fn unconfigured_owner_list_is_empty_and_does_not_create_control_file() {
    let world=support::World::new();
    let (state,fresh,_)=owner(&world);
    let response=hennery_gateway::api::router(state).oneshot(Request::builder().uri("/api/plugins/registrations")
        .header("origin","https://hennery.example").header("cookie",format!("hennery_session={fresh}")).body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(response.status(),StatusCode::OK);
    assert_eq!(response.headers()["cache-control"],"no-store");
    let body=axum::body::to_bytes(response.into_body(),16384).await.unwrap();
    assert_eq!(serde_json::from_slice::<Value>(&body).unwrap(),serde_json::json!([]));
    assert!(!world.dir.path().join("plugin-control.db").exists());
}

#[tokio::test]
async fn owner_registration_requires_fresh_step_up_before_parsing_or_discovery() {
    let world=support::World::new(); let (state,_,stale)=owner(&world);
    let response=hennery_gateway::api::router(state).oneshot(Request::builder().method("POST").uri("/api/plugins/registrations")
        .header("origin","https://hennery.example").header("cookie",format!("hennery_session={stale}"))
        .header("content-type","application/json").body(Body::from("{}" )).unwrap()).await.unwrap();
    assert_eq!(response.status(),StatusCode::FORBIDDEN);
    assert!(!world.dir.path().join("plugin-control.db").exists());
}
