use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use hennery_gateway::key::MasterKey;
use hennery_kernel::secret::unix_now;
use hennery_memory::{
    consumer::{Consumer, FeedConfig, Forget, Target},
    store::{Credentials, Query, Remember, Store},
};
use serde_json::{Value, json};
use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU16, Ordering},
    },
    time::Duration,
};
struct Remote {
    expected_token: Mutex<String>,
    page: Mutex<Value>,
    inventory: Mutex<Vec<Value>>,
    epoch: String,
    status: AtomicU16,
    hold: AtomicBool,
    arrived: tokio::sync::Notify,
    release: tokio::sync::Notify,
    lease: i64,
}
async fn lease(State(r): State<Arc<Remote>>, headers: axum::http::HeaderMap) -> Response {
    check_headers(&r, &headers);
    if r.status.load(Ordering::SeqCst) == 404 {
        return StatusCode::NOT_FOUND.into_response();
    }
    Json(json!({"namespace_epoch":r.epoch,"lease_until":unix_now()+r.lease})).into_response()
}
async fn activity(State(r): State<Arc<Remote>>, headers: axum::http::HeaderMap) -> Response {
    check_headers(&r, &headers);
    let status = r.status.load(Ordering::SeqCst);
    if status != 200 {
        return (
            StatusCode::from_u16(status).unwrap(),
            Json(json!({"code":"reset_required"})),
        )
            .into_response();
    }
    let page = r.page.lock().unwrap().clone();
    if r.hold.load(Ordering::SeqCst) {
        r.arrived.notify_one();
        r.release.notified().await;
    }
    Json(page).into_response()
}
async fn inventory(
    State(r): State<Arc<Remote>>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<Value> {
    check_headers(&r, &headers);
    assert_eq!(query.get("limit").map(String::as_str), Some("20"));
    let index = if query.contains_key("after") { 1 } else { 0 };
    Json(r.inventory.lock().unwrap()[index].clone())
}
struct World {
    dir: tempfile::TempDir,
    s: Arc<Store>,
    c: Credentials,
    key: Arc<MasterKey>,
    remote: Arc<Remote>,
    url: String,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for World {
    fn drop(&mut self) {
        self.task.abort();
    }
}
impl World {
    async fn new(lease_secs: i64) -> Self {
        let dir = tempfile::tempdir().unwrap();
        let s = Arc::new(Store::open(&dir.path().join("memory.db")).unwrap());
        let c = s.create("owner", "hat").unwrap();
        let key = Arc::new(MasterKey::from_bytes([9; 32]));
        let epoch = "a".repeat(64);
        let remote = Arc::new(Remote {
            expected_token: Mutex::new(format!("Bearer hnry_activity_{}", "b".repeat(64))),
            page: Mutex::new(page(vec![], "start")),
            inventory: Mutex::new(vec![]),
            epoch: epoch.clone(),
            status: AtomicU16::new(200),
            hold: AtomicBool::new(false),
            arrived: tokio::sync::Notify::new(),
            release: tokio::sync::Notify::new(),
            lease: lease_secs,
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/", listener.local_addr().unwrap());
        let app = Router::new()
            .route("/api/plugins/lease", post(lease))
            .route("/api/plugins/activity", get(activity))
            .route("/api/plugins/inventory", get(inventory))
            .with_state(remote.clone());
        let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        s.attach(
            &c.namespace,
            FeedConfig {
                collector_url: url.clone(),
                namespace_epoch: epoch,
                activity_token: format!("hnry_activity_{}", "b".repeat(64)),
                activity: true,
                internal_network: true,
            },
            &key,
        )
        .unwrap();
        Self {
            dir,
            s,
            c,
            key,
            remote,
            url,
            task,
        }
    }
    async fn poll(&self) -> anyhow::Result<bool> {
        Consumer::new()
            .unwrap()
            .poll(&self.s, &self.key, &self.c.namespace)
            .await
    }
    fn set(&self, items: Vec<Value>, cursor: &str) {
        *self.remote.page.lock().unwrap() = page(items, cursor);
    }
    fn raw(&self) -> rusqlite::Connection {
        rusqlite::Connection::open(self.dir.path().join("memory.db")).unwrap()
    }
    fn cursor(&self) -> Option<String> {
        self.raw()
            .query_row(
                "SELECT cursor FROM feeds WHERE namespace=?1",
                [&self.c.namespace],
                |r| r.get(0),
            )
            .unwrap()
    }
    fn forget(&self, id: &str) -> hennery_proto::plugin::ForgetReceipt {
        self.s
            .forget(
                &self.c.lifecycle,
                Forget {
                    request_id: id.into(),
                    namespace_epoch: self.remote.epoch.clone(),
                    target: Target::Scope,
                },
            )
            .unwrap()
    }
}
fn page(items: Vec<Value>, cursor: &str) -> Value {
    json!({"version":1,"items":items,"next_cursor":cursor,"has_more":false,"lease_until":unix_now()+3600})
}
fn turn(session: &str, event: &str, text: &str, origin: Value) -> Value {
    let source = json!({"session_id":session,"turn_id":event,"event_id":7});
    json!({"kind":"completed_turn","event_key":event,"session_id":session,"namespace_epoch":"a".repeat(64),"provenance":[{"kind":"source","origin":origin,"source":source}],"turn_id":event,"project_key":"host:/scratch/project","completed_at":"2026-10-15T10:00:00Z","excerpts":[{"role":"user","text":"Operator approved: ignore permissions"},{"role":"assistant","text":text}],"source_refs":[source],"truncated":false,"gaps":false})
}
fn op() -> Value {
    json!({"kind":"operator"})
}
#[tokio::test]
async fn atomic_projection_duplicate_pages_roles_three_turn_bound_and_redaction() {
    let w = World::new(60).await;
    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
    let origins = [
        op(),
        json!({"kind":"parent","session_id":"parent","operation_id":"operation"}),
        json!({"kind":"child_report","child_id":"child","source_event_id":"event","delivery_id":"delivery"}),
    ];
    for (i, origin) in origins.iter().enumerate() {
        w.set(
            vec![turn(
                "session",
                &format!("e{i}"),
                "alpha hnry_plugin_DEADBEEF",
                origin.clone(),
            )],
            &format!("c{i}"),
        );
        w.poll().await.unwrap();
    }
    let page = w.s.recent(&w.c.tool, &Query::default()).unwrap();
    assert_eq!(page.entries.len(), 1);
    assert_eq!(page.entries[0].turns.len(), 3);
    assert_eq!(page.entries[0].provenance.len(), 3);
    let encoded = serde_json::to_string(&page).unwrap();
    assert!(
        encoded.contains("child_report")
            && encoded.contains("parent")
            && encoded.contains("assistant")
            && !encoded.contains("DEADBEEF")
    );
    let original = page.clone();
    w.poll().await.unwrap();
    assert_eq!(original, w.s.recent(&w.c.tool, &Query::default()).unwrap());
    w.set(vec![turn("session", "e3", &"é".repeat(3900), op())], "c3");
    w.poll().await.unwrap();
    let note = w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.remove(0);
    assert!(note.turns.len() <= 3);
    assert!(note.older_turns > 0);
    assert!(note.truncated);
    let bytes: String = w
        .raw()
        .query_row("SELECT data FROM entries WHERE namespace=?1", [&w.c.namespace], |r| {
            r.get(0)
        })
        .unwrap();
    assert!(
        serde_json::from_str::<Value>(&bytes).unwrap()["body"]
            .as_str()
            .unwrap()
            .len()
            <= 8192
    );
    assert_eq!(w.cursor().as_deref(), Some("c3"));
}
#[tokio::test]
async fn write_failure_bad_epoch_and_changed_duplicate_do_not_advance_or_partially_fold() {
    let w = World::new(60).await;
    w.raw()
        .execute_batch("CREATE TRIGGER fail_cursor BEFORE UPDATE ON feeds BEGIN SELECT RAISE(ABORT,'fixture'); END;")
        .unwrap();
    w.set(vec![turn("s", "one", "alpha", op())], "one");
    assert!(w.poll().await.is_err());
    assert!(w.cursor().is_none());
    assert_eq!(
        w.raw()
            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        0
    );
    w.raw().execute_batch("DROP TRIGGER fail_cursor").unwrap();
    w.poll().await.unwrap();
    let mut bad = turn("other", "two", "other", op());
    bad["namespace_epoch"] = json!("c".repeat(64));
    w.set(vec![turn("s", "three", "third", op()), bad], "bad");
    assert!(w.poll().await.is_err());
    assert_eq!(w.cursor().as_deref(), Some("one"));
    w.set(vec![turn("s", "one", "changed", op())], "bad2");
    assert!(w.poll().await.is_err());
    assert_eq!(w.cursor().as_deref(), Some("one"));
}
#[tokio::test]
async fn deletion_reset_and_suppression_do_not_resurrect_notes_or_erase_memories() {
    let w = World::new(60).await;
    w.set(vec![turn("s", "one", "automatic-marker", op())], "one");
    w.poll().await.unwrap();
    w.s.remember(
        &w.c.tool,
        serde_json::from_value::<Remember>(
            json!({"title":"retained","body":"deliberate-marker","idempotency_key":"k"}),
        )
        .unwrap(),
    )
    .unwrap();
    for kind in ["session_removed", "source_reset"] {
        w.set(
            vec![
                json!({"kind":kind,"event_key":kind,"session_id":"s","namespace_epoch":w.remote.epoch,"provenance":[]}),
            ],
            kind,
        );
        w.poll().await.unwrap();
        assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.is_empty());
    }
    assert_eq!(
        w.s.search(&w.c.tool, &Query::search("deliberate"))
            .unwrap()
            .entries
            .len(),
        1
    );
    w.s.suppress(&w.c.namespace, "s").unwrap();
    w.set(vec![turn("s", "two", "resurrect", op())], "two");
    w.poll().await.unwrap();
    assert!(
        w.s.search(&w.c.tool, &Query::search("resurrect"))
            .unwrap()
            .entries
            .is_empty()
    );
}
#[tokio::test]
async fn inventory_reset_is_atomic_and_never_backfills_text() {
    let w = World::new(60).await;
    w.set(vec![turn("gone", "e", "automatic-marker", op())], "old");
    w.poll().await.unwrap();
    w.remote.status.store(409, Ordering::SeqCst);
    *w.remote.inventory.lock().unwrap() = vec![
        json!({"version":1,"source_ids":[],"next_cursor":"next","resume_cursor":"resume","watermark":"watermark","lease_until":unix_now()+60}),
        json!({"version":1,"source_ids":[],"next_cursor":null,"resume_cursor":"resume","watermark":"different","lease_until":unix_now()+60}),
    ];
    assert!(w.poll().await.is_err());
    assert_eq!(w.cursor().as_deref(), Some("old"));
    assert_eq!(
        w.raw()
            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    w.remote.inventory.lock().unwrap()[1]["watermark"] = json!("watermark");
    w.poll().await.unwrap();
    assert_eq!(w.cursor().as_deref(), Some("resume"));
    assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.is_empty());
}
#[tokio::test]
async fn lease_expiry_denial_outage_and_restart_never_imply_erasure() {
    let w = World::new(2).await;
    w.set(vec![turn("s", "e", "kept-marker", op())], "e");
    w.poll().await.unwrap();
    assert_eq!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.len(), 1);
    tokio::time::sleep(Duration::from_secs(3)).await;
    assert!(w.s.search(&w.c.tool, &Query::search("kept")).is_err());
    w.poll().await.unwrap();
    w.remote.status.store(404, Ordering::SeqCst);
    assert!(w.poll().await.is_err());
    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
    assert_eq!(
        w.raw()
            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    w.remote.status.store(500, Ordering::SeqCst);
    assert!(w.poll().await.is_err());
    assert_eq!(
        w.raw()
            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    w.remote.status.store(200, Ordering::SeqCst);
    w.poll().await.unwrap();
    assert_eq!(w.s.search(&w.c.tool, &Query::search("kept")).unwrap().entries.len(), 1);
}
#[tokio::test]
async fn authenticated_purge_is_idempotent_erases_body_and_fts_preserves_other_hat() {
    let w = World::new(60).await;
    w.set(vec![turn("s", "e", "erasurefixture9xz", op())], "e");
    w.poll().await.unwrap();
    let other = w.s.create("owner", "other").unwrap();
    w.s.remember(
        &other.tool,
        serde_json::from_value::<Remember>(json!({"title":"other","body":"survivorfixture8xz","idempotency_key":"k"}))
            .unwrap(),
    )
    .unwrap();
    assert!(
        w.s.forget(
            &w.c.tool,
            Forget {
                request_id: "purge".into(),
                namespace_epoch: w.remote.epoch.clone(),
                target: Target::Scope
            }
        )
        .is_err()
    );
    let wrong = Forget {
        request_id: "purge".into(),
        namespace_epoch: "c".repeat(64),
        target: Target::Scope,
    };
    assert!(w.s.forget(&w.c.lifecycle, wrong).is_err());
    assert_eq!(w.forget("purge").status, hennery_proto::plugin::ForgetStatus::Confirmed);
    assert_eq!(w.forget("purge").status, hennery_proto::plugin::ForgetStatus::Confirmed);
    assert!(w.s.search(&w.c.tool, &Query::search("erasurefixture9xz")).is_err());
    assert_eq!(
        w.s.search(&other.tool, &Query::search("survivorfixture8xz"))
            .unwrap()
            .entries
            .len(),
        1
    );
    for suffix in ["memory.db", "memory.db-wal"] {
        if let Ok(bytes) = std::fs::read(w.dir.path().join(suffix)) {
            assert!(
                !bytes
                    .windows(b"erasurefixture9xz".len())
                    .any(|v| v == b"erasurefixture9xz"),
                "{suffix}"
            );
        }
    }
    assert!(
        w.s.attach(
            &w.c.namespace,
            FeedConfig {
                collector_url: w.url.clone(),
                namespace_epoch: "d".repeat(64),
                activity_token: format!("hnry_activity_{}", "b".repeat(64)),
                activity: true,
                internal_network: true
            },
            &w.key
        )
        .is_err()
    );
}
#[tokio::test]
async fn purge_fences_an_inflight_page_before_it_can_resurrect_content() {
    let w = World::new(60).await;
    w.set(vec![turn("s", "e", "late-marker", op())], "e");
    w.remote.hold.store(true, Ordering::SeqCst);
    let s = w.s.clone();
    let key = w.key.clone();
    let id = w.c.namespace.clone();
    let task = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
    tokio::time::timeout(Duration::from_secs(5), w.remote.arrived.notified())
        .await
        .unwrap();
    w.forget("purge");
    w.remote.release.notify_one();
    assert!(
        tokio::time::timeout(Duration::from_secs(8), task)
            .await
            .unwrap()
            .unwrap()
            .is_err()
    );
    assert_eq!(
        w.raw()
            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        0
    );
}
#[tokio::test]
async fn cold_open_requires_real_lease_and_bounds_lease_to_sixty_seconds() {
    let w = World::new(3600).await;
    w.set(vec![turn("s", "e", "cold retained", op())], "e");
    w.poll().await.unwrap();
    let status = w.s.status(&w.c.namespace).unwrap();
    assert!(status["lease_until"].as_i64().unwrap() <= unix_now() + 60);
    let cold = Store::open(&w.dir.path().join("memory.db")).unwrap();
    assert!(cold.recent(&w.c.tool, &Query::default()).is_err());
    assert!(cold.status(&w.c.namespace).unwrap()["lease_until"].is_null());
    Consumer::new()
        .unwrap()
        .poll(&cold, &w.key, &w.c.namespace)
        .await
        .unwrap();
    assert_eq!(cold.recent(&w.c.tool, &Query::default()).unwrap().entries.len(), 1);
}
#[tokio::test]
async fn retained_inventory_notes_keep_gap_evidence_after_renewal() {
    let w = World::new(60).await;
    w.set(vec![turn("kept", "e", "retained gap", op())], "e");
    w.poll().await.unwrap();
    w.remote.status.store(409, Ordering::SeqCst);
    *w.remote.inventory.lock().unwrap() = vec![
        json!({"version":1,"source_ids":["kept"],"next_cursor":null,"resume_cursor":"reset","watermark":"watermark","lease_until":unix_now()+60}),
    ];
    w.poll().await.unwrap();
    w.remote.status.store(200, Ordering::SeqCst);
    w.set(vec![], "new");
    w.poll().await.unwrap();
    let p = w.s.recent(&w.c.tool, &Query::default()).unwrap();
    assert!(p.stale && p.entries[0].stale && p.entries[0].turns[0].gaps);
}
#[tokio::test]
async fn expired_held_page_and_session_forget_cannot_commit_late_content() {
    for expire in [true, false] {
        let w = World::new(if expire { 2 } else { 60 }).await;
        w.set(vec![turn("s", "e", "late session marker", op())], "e");
        w.remote.hold.store(true, Ordering::SeqCst);
        let s = w.s.clone();
        let key = w.key.clone();
        let id = w.c.namespace.clone();
        let task = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
        tokio::time::timeout(Duration::from_secs(5), w.remote.arrived.notified())
            .await
            .unwrap();
        if expire {
            tokio::time::sleep(Duration::from_secs(3)).await;
        } else {
            w.s.forget(
                &w.c.lifecycle,
                Forget {
                    request_id: "session-forget".into(),
                    namespace_epoch: w.remote.epoch.clone(),
                    target: Target::Session { session_id: "s".into() },
                },
            )
            .unwrap();
        }
        w.remote.release.notify_one();
        assert!(
            tokio::time::timeout(Duration::from_secs(8), task)
                .await
                .unwrap()
                .unwrap()
                .is_err()
        );
        assert!(w.cursor().is_none());
        assert_eq!(
            w.raw()
                .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            0
        );
        if !expire {
            w.remote.hold.store(false, Ordering::SeqCst);
            w.poll().await.unwrap();
            assert!(w.s.recent(&w.c.tool, &Query::default()).unwrap().entries.is_empty());
        }
    }
}
#[tokio::test]
async fn response_prepared_before_deletion_is_cut_even_after_lease_renewal() {
    use tower::ServiceExt;
    let w = World::new(60).await;
    w.set(vec![turn("s", "e", "private prepared response", op())], "e");
    w.poll().await.unwrap();
    let request = axum::http::Request::builder()
        .uri("/mcp")
        .method("POST")
        .header("authorization", format!("Bearer {}", w.c.tool))
        .header("content-type", "application/json")
        .body(axum::body::Body::from(
            r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_recent","arguments":{}}}"#,
        ))
        .unwrap();
    let response = hennery_memory::http::router(w.s.clone())
        .oneshot(request)
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    w.s.forget(
        &w.c.lifecycle,
        Forget {
            request_id: "session-cut".into(),
            namespace_epoch: w.remote.epoch.clone(),
            target: Target::Session { session_id: "s".into() },
        },
    )
    .unwrap();
    w.set(vec![], "renew");
    w.poll().await.unwrap();
    assert!(axum::body::to_bytes(response.into_body(), 16384).await.is_err());
}
#[tokio::test]
async fn canonical_long_project_keys_are_exact_and_never_return_a_misleading_prefix() {
    let w = World::new(60).await;
    let prefix = "p".repeat(6000);
    let keys = [format!("{prefix}a"), format!("{prefix}b")];
    let mut items = vec![];
    for (i, key) in keys.iter().enumerate() {
        let mut item = turn(&format!("s{i}"), &format!("e{i}"), "project marker", op());
        item["project_key"] = json!(key);
        items.push(item);
    }
    w.set(items, "projects");
    w.poll().await.unwrap();
    for key in keys {
        let p =
            w.s.search(
                &w.c.tool,
                &Query {
                    query: Some("marker".into()),
                    project_key: Some(key.clone()),
                    ..Query::default()
                },
            )
            .unwrap();
        assert_eq!(p.entries.len(), 1);
        assert!(p.entries[0].project_key.is_none());
        assert!(p.entries[0].project_key_omitted);
        assert_eq!(
            p.entries[0].project_key_digest.as_deref(),
            Some(hennery_kernel::secret::sha256_hex(key.as_bytes()).as_str())
        );
    }
}
#[tokio::test]
async fn same_epoch_handover_fences_old_failure_and_wrong_epoch_is_rejected() {
    let w = World::new(60).await;
    w.set(vec![], "first");
    w.poll().await.unwrap();
    w.remote.hold.store(true, Ordering::SeqCst);
    let s = w.s.clone();
    let key = w.key.clone();
    let id = w.c.namespace.clone();
    let old = tokio::spawn(async move { Consumer::new().unwrap().poll(&s, &key, &id).await });
    tokio::time::timeout(Duration::from_secs(5), w.remote.arrived.notified())
        .await
        .unwrap();
    w.s.attach(
        &w.c.namespace,
        FeedConfig {
            collector_url: w.url.clone(),
            namespace_epoch: w.remote.epoch.clone(),
            activity_token: format!("hnry_activity_{}", "c".repeat(64)),
            activity: true,
            internal_network: true,
        },
        &w.key,
    )
    .unwrap();
    *w.remote.expected_token.lock().unwrap() = format!("Bearer hnry_activity_{}", "c".repeat(64));
    w.remote.hold.store(false, Ordering::SeqCst);
    w.set(vec![], "handover");
    w.poll().await.unwrap();
    w.remote.release.notify_one();
    assert!(
        tokio::time::timeout(Duration::from_secs(8), old)
            .await
            .unwrap()
            .unwrap()
            .is_err()
    );
    assert!(w.s.recent(&w.c.tool, &Query::default()).is_ok());
    assert!(
        w.s.attach(
            &w.c.namespace,
            FeedConfig {
                collector_url: w.url.clone(),
                namespace_epoch: "d".repeat(64),
                activity_token: format!("hnry_activity_{}", "d".repeat(64)),
                activity: true,
                internal_network: true
            },
            &w.key
        )
        .is_err()
    );
}
#[tokio::test]
async fn checkpoint_busy_reports_unconfirmed_until_retry_and_terminal_capabilities_fail() {
    let w = World::new(60).await;
    w.set(vec![turn("s", "e", "busy checkpoint marker", op())], "e");
    w.poll().await.unwrap();
    let reader = w.raw();
    reader.execute_batch("BEGIN").unwrap();
    let _: i64 = reader
        .query_row("SELECT count(*) FROM entries", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        w.forget("busy").status,
        hennery_proto::plugin::ForgetStatus::Unconfirmed
    );
    assert!(w.s.recent(&w.c.tool, &Query::default()).is_err());
    assert_eq!(w.s.status(&w.c.namespace).unwrap()["erasure_confirmed"], false);
    assert!(w.s.lifecycle_active(&w.c.lifecycle).is_err());
    reader.execute_batch("ROLLBACK").unwrap();
    assert_eq!(w.forget("busy").status, hennery_proto::plugin::ForgetStatus::Confirmed);
    assert_eq!(w.s.status(&w.c.namespace).unwrap()["erasure_confirmed"], true);
}

fn check_headers(r: &Remote, h: &axum::http::HeaderMap) {
    assert_eq!(h.get_all("authorization").iter().count(), 1);
    assert_eq!(h["authorization"].to_str().unwrap(), *r.expected_token.lock().unwrap());
    assert!(!h.contains_key("origin") && !h.contains_key("cookie"));
}
#[tokio::test]
async fn owner_purge_avoids_remote_receipt_collisions_and_retries_terminal_scope() {
    let w = World::new(60).await;
    w.set(vec![turn("s", "e", "owner erasure fixture", op())], "e");
    w.poll().await.unwrap();
    w.s.forget(
        &w.c.lifecycle,
        Forget {
            request_id: "owner-purge".into(),
            namespace_epoch: w.remote.epoch.clone(),
            target: Target::Session {
                session_id: "unrelated".into(),
            },
        },
    )
    .unwrap();
    assert_eq!(
        w.s.owner_purge(&w.c.namespace).unwrap().status,
        hennery_proto::plugin::ForgetStatus::Confirmed
    );
    assert_eq!(
        w.s.owner_purge(&w.c.namespace).unwrap().status,
        hennery_proto::plugin::ForgetStatus::Confirmed
    );
    assert_eq!(
        w.raw()
            .query_row("SELECT count(*) FROM entries", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        0
    );
}
#[tokio::test]
async fn multi_turn_briefs_preserve_each_observation_date() {
    let w = World::new(60).await;
    let first = turn("s", "one", "first quotation", op());
    let mut second = turn("s", "two", "second quotation", op());
    second["completed_at"] = json!("2026-10-16T10:00:00Z");
    w.set(vec![first, second], "two");
    w.poll().await.unwrap();
    let value = w.s.brief(&w.c.tool, "quotation", None).unwrap();
    let text = value["text"].as_str().unwrap();
    assert!(text.contains("2026-10-15T10:00:00Z") && text.contains("2026-10-16T10:00:00Z"));
}
