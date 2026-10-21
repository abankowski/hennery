use super::*;
use hennery_kernel::{hosts::Hosts, operator::Operator};
use hennery_proto::frames::{AgentIsolation, Capabilities};
use serde_json::{Value, json};

fn fixture() -> (tempfile::TempDir, AppState) {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("hennery.db");
    let state = AppState::new(
        Store::open(&db).unwrap(),
        Hosts::open(&db).unwrap(),
        Operator::open(&db).unwrap(),
    );
    state
        .store
        .create_session("s", "h", "fake", "/project", "hat", None)
        .unwrap();
    state
        .store
        .ingest("s", 1, &SessionBody::session_started("start", "agent"))
        .unwrap();
    (dir, state)
}

async fn answer(response: Response) -> (StatusCode, Value) {
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

async fn send(state: &AppState, key: &str, text: &str) -> (StatusCode, Value) {
    let request = serde_json::from_value(json!({
        "request_key": key,
        "content": [{"type":"text", "text":text}]
    }))
    .unwrap();
    answer(prompt(State(state.clone()), Path("s".into()), ApiJson(request)).await).await
}

fn busy(state: &AppState) {
    assert!(
        state
            .store
            .open_prompt(
                "s",
                "busy",
                &content::check(vec![json!({"type":"text","text":"first"})]).unwrap()
            )
            .unwrap()
    );
}

#[tokio::test]
async fn a_request_key_reuses_a_queue_receipt_and_rejects_changed_content() {
    let (_dir, state) = fixture();
    busy(&state);
    let (status, receipt) = send(&state, "queue-key", "send once").await;
    assert_eq!(status, StatusCode::ACCEPTED);
    let (again, retried) = send(&state, "queue-key", "send once").await;
    assert_eq!((again, retried), (status, receipt));
    assert_eq!(state.store.operator_prompt_queue("s").unwrap().len(), 1);
    let (changed, body) = send(&state, "queue-key", "changed").await;
    assert_eq!(changed, StatusCode::CONFLICT);
    assert_eq!(body["code"], "request_key_conflict");
}

#[tokio::test]
async fn a_request_key_reuses_an_immediate_turn_without_sending_again() {
    let (_dir, state) = fixture();
    let (tx, mut frames) = tokio::sync::mpsc::unbounded_channel();
    let registration = state
        .hub
        .register("h", tx, Capabilities(vec![]), AgentIsolation::default())
        .unwrap();
    state.hub.mark_ready("h", registration.conn_id);
    let initial_state = state.clone();
    let initial = tokio::spawn(async move { send(&initial_state, "immediate-key", "once").await });
    let CollectorFrame::Prompt {
        request_id, turn_id, ..
    } = tokio::time::timeout(Duration::from_secs(5), frames.recv())
        .await
        .unwrap()
        .unwrap()
    else {
        panic!("expected prompt")
    };
    assert_eq!(
        send(&state, "immediate-key", "once").await,
        (StatusCode::ACCEPTED, json!({"turn_id":turn_id}))
    );
    let started = SessionBody::TurnStarted {
        request_id: request_id.clone(),
        turn_id: turn_id.clone(),
    };
    state.store.ingest("s", 2, &started).unwrap();
    state.hub.resolve(&request_id, started);
    let (status, receipt) = initial.await.unwrap();
    assert_eq!(status, StatusCode::ACCEPTED);
    assert_eq!(receipt, json!({"turn_id":turn_id}));
    assert_eq!(send(&state, "immediate-key", "once").await, (status, receipt));
    assert!(frames.try_recv().is_err());
    assert!(state.store.operator_prompt_queue("s").unwrap().is_empty());
}

#[tokio::test]
async fn a_queued_request_receipt_survives_edit_remove_restart_and_close() {
    let (dir, mut state) = fixture();
    busy(&state);
    let accepted = send(&state, "durable-key", "original").await;
    assert_eq!(accepted.0, StatusCode::ACCEPTED);
    let queue_id = accepted.1["queue_id"].as_str().unwrap();
    state.store.edit_operator_prompt("s", queue_id, "edited").unwrap();
    assert_eq!(send(&state, "durable-key", "original").await, accepted);
    assert!(state.store.remove_operator_prompt("s", queue_id).unwrap());
    state.store = Arc::new(Store::open(&dir.path().join("hennery.db")).unwrap());
    assert_eq!(send(&state, "durable-key", "original").await, accepted);
    assert!(state.store.operator_prompt_queue("s").unwrap().is_empty());
    state.store.close_now("s").unwrap();
    assert_eq!(send(&state, "durable-key", "original").await, accepted);
    assert_eq!(send(&state, "new-key", "original").await.0, StatusCode::CONFLICT);
}

#[tokio::test]
async fn deleting_a_session_scrubs_its_request_keys_and_refuses_retry() {
    let (_dir, state) = fixture();
    busy(&state);
    assert_eq!(send(&state, "delete-key", "erase").await.0, StatusCode::ACCEPTED);
    state.store.close_now("s").unwrap();
    state.store.delete_session("s", None).unwrap();
    assert_eq!(send(&state, "delete-key", "erase").await.0, StatusCode::NOT_FOUND);
    let checked = content::check(vec![json!({"type":"text","text":"erase"})]).unwrap();
    let key = PromptRequestKey::new("delete-key", &checked).unwrap();
    assert!(state.store.prompt_receipt("s", &key).unwrap().is_none());
}

#[tokio::test]
async fn an_immediate_prompt_proven_unsent_to_an_offline_host_can_retry_its_key() {
    let (_dir, state) = fixture();
    let (status, body) = send(&state, "offline-key", "keep draft").await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(body["code"], "host_offline");
    let checked = content::check(vec![json!({"type":"text","text":"keep draft"})]).unwrap();
    let key = PromptRequestKey::new("offline-key", &checked).unwrap();
    assert!(
        state.store.prompt_receipt("s", &key).unwrap().is_none(),
        "a refused, provably unsent attempt has no accepted receipt"
    );
    busy(&state);
    assert_eq!(send(&state, "offline-key", "keep draft").await.0, StatusCode::ACCEPTED);
    assert_eq!(state.store.operator_prompt_queue("s").unwrap().len(), 1);
}

#[tokio::test]
async fn request_keys_reject_empty_unbounded_and_nonprintable_input() {
    let (_dir, state) = fixture();
    busy(&state);
    for key in [
        String::new(),
        "x".repeat(129),
        "a\nb".into(),
        "é".into(),
        "\u{7f}".into(),
    ] {
        let (status, body) = send(&state, &key, "valid").await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
        assert_eq!(body["code"], "invalid_request_key");
    }
    assert!(state.store.operator_prompt_queue("s").unwrap().is_empty());
    assert_eq!(send(&state, &"k".repeat(128), "valid").await.0, StatusCode::ACCEPTED);
}

#[tokio::test]
async fn editing_after_commit_succeeds_when_publication_is_temporarily_unavailable() {
    let (_dir, state) = fixture();
    let checked = content::check(vec![json!({"type":"text","text":"before"})]).unwrap();
    let id = state.store.enqueue_operator_prompt("s", &checked).unwrap();
    state.store.flush_prompt_queue_changes(&state.hub).unwrap();
    state.store.conn().execute_batch("CREATE TRIGGER refuse_edit_notification BEFORE INSERT ON events WHEN NEW.kind='queue_changed' BEGIN SELECT RAISE(ABORT,'notification unavailable'); END;").unwrap();
    let (status, body) = answer(
        edit_queued_prompt(
            State(state.clone()),
            Path(("s".into(), id)),
            ApiJson(hennery_proto::rest::EditQueuedPrompt { text: "after".into() }),
        )
        .await,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body[0]["content"][0]["text"], "after");
    state
        .store
        .conn()
        .execute_batch("DROP TRIGGER refuse_edit_notification;")
        .unwrap();
    let mut changes = state.hub.subscribe();
    state.store.flush_prompt_queue_changes(&state.hub).unwrap();
    assert_eq!(changes.try_recv().unwrap().kind, "queue_changed");
}

#[tokio::test]
async fn removal_after_commit_succeeds_when_publication_is_temporarily_unavailable() {
    let (_dir, state) = fixture();
    let checked = content::check(vec![json!({"type":"text","text":"remove"})]).unwrap();
    let id = state.store.enqueue_operator_prompt("s", &checked).unwrap();
    state.store.flush_prompt_queue_changes(&state.hub).unwrap();
    state.store.conn().execute_batch("CREATE TRIGGER refuse_remove_notification BEFORE INSERT ON events WHEN NEW.kind='queue_changed' BEGIN SELECT RAISE(ABORT,'notification unavailable'); END;").unwrap();
    let (status, body) = answer(remove_queued_prompt(State(state.clone()), Path(("s".into(), id))).await).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, json!([]));
    state
        .store
        .conn()
        .execute_batch("DROP TRIGGER refuse_remove_notification;")
        .unwrap();
    let mut changes = state.hub.subscribe();
    state.store.flush_prompt_queue_changes(&state.hub).unwrap();
    assert_eq!(changes.try_recv().unwrap().kind, "queue_changed");
}
