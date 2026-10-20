use hennery_kernel::{hosts::Hosts, operator::Operator, secret::unix_now};
use hennery_proto::frames::{Indexed, SessionBody};
use hennery_sessions::{AppState, store::Store};
use hennery_testkit::{PUBLIC_URL, owner_phc};
use serde_json::{Value, json};

#[tokio::test]
async fn rename_is_operator_only_and_null_restores_agent_title_without_step_up() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("hennery.db");
    let state = AppState::new(
        Store::open(&db).unwrap(),
        Hosts::open(&db).unwrap(),
        Operator::open(&db).unwrap(),
    );
    hennery_testkit::operator_client(&state.operator);
    let token = state
        .operator
        .open_session("test", &owner_phc(&state.operator), unix_now())
        .unwrap()
        .unwrap();
    state.store.create_session("s", "h", "fake", "/tmp", "", None).unwrap();
    state
        .store
        .ingest("s", 1, &SessionBody::session_started("r", "a"))
        .unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/api/sessions/s", listener.local_addr().unwrap());
    let server = tokio::spawn(hennery_sessions::serve(listener, state.clone()));
    let client = reqwest::Client::new();
    assert_eq!(
        client
            .patch(&url)
            .header("origin", PUBLIC_URL)
            .json(&json!({"title":"No"}))
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
    let patch = |body: Value| {
        client
            .patch(&url)
            .header("origin", PUBLIC_URL)
            .header("cookie", format!("hennery_session={token}"))
            .json(&body)
    };
    let response = patch(json!({"title":"Chosen"})).send().await.unwrap();
    assert_eq!(response.status(), 200);
    let detail: Value = response.json().await.unwrap();
    assert_eq!(detail["title"], "Chosen");
    assert_eq!(detail["title_source"], "operator");
    state
        .store
        .ingest(
            "s",
            2,
            &SessionBody::AcpUpdate {
                indexed: Indexed {
                    title: Some("Agent title".into()),
                    ..Default::default()
                },
                payload: json!({}),
            },
        )
        .unwrap();
    assert_eq!(
        patch(json!({})).send().await.unwrap().json::<Value>().await.unwrap()["title"],
        "Chosen"
    );
    let detail = patch(json!({"title":null}))
        .send()
        .await
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();
    assert_eq!(detail["title"], "Agent title");
    assert_eq!(detail["title_source"], "agent");
    assert_eq!(patch(json!({"title":"  "})).send().await.unwrap().status(), 400);
    server.abort();
}
