use hennery_gateway::key::MasterKey;
use hennery_gateway::model::{Change, CredKind, NewConnection};
use hennery_gateway::plugin::{Control, RegistrationInput};
use hennery_gateway::store::GatewayStore;
use hennery_host::identity::HostKey;
use hennery_kernel::hosts::{Enrollment, Hosts};
use hennery_proto::plugin::PluginCapabilities;
use hennery_sessions::store::Store;

struct World {
    _dir: tempfile::TempDir,
    path: std::path::PathBuf,
    sessions: Store,
    hosts: Hosts,
    gateway: std::sync::Arc<GatewayStore>,
    hat: String,
    id: String,
    token: String,
}
fn registered_world() -> World {
    registered_at("https://example.invalid/mcp", false)
}
fn registered_at(endpoint: &str, internal_network: bool) -> World {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    let sessions = Store::open(&path).unwrap();
    let hosts = Hosts::open(&path).unwrap();
    let gateway = std::sync::Arc::new(GatewayStore::open(&path).unwrap());
    let hennery_kernel::hats::HatChange::Done(hat) = hosts.create_hat("Plugin", None, 1).unwrap() else {
        panic!("hat")
    };
    let hat = hat.id;
    let key = HostKey::from_seed([7; 32]);
    hosts
        .register(
            "host",
            &Enrollment {
                public_key: key.public_key_hex(),
                name: "Test".into(),
                host_version: "0.0.0".into(),
                platform: "test".into(),
            },
            1,
        )
        .unwrap();
    let Change::Done(connection) = gateway
        .create(
            &NewConnection {
                slug: "test-plugin".into(),
                label: "Test plug-in".into(),
                url: endpoint.into(),
                hat_id: hat.clone(),
                cred_kind: CredKind::Static,
                static_header: None,
                static_prefix: None,
                tool_allowlist: Some(vec!["search".into()]),
                internal_network,
            },
            1,
        )
        .unwrap()
    else {
        panic!("connection")
    };
    gateway.replace_mounts(&connection.id, &["host".into()]).unwrap();
    gateway
        .set_static_credential(&connection.id, "namespace", &MasterKey::from_bytes([3; 32]), 1)
        .unwrap();
    sessions
        .create_session("running", "host", "fake", "/scratch", &hat, None)
        .unwrap();
    assert!(!dir.path().join("plugin-control.db").exists());
    let control: std::sync::Arc<Control> = gateway.plugins();
    let mut core = hennery_kernel::db::open(&path).unwrap();
    let tx = core.transaction().unwrap();
    let grant = control
        .register_in(
            &tx,
            RegistrationInput {
                connection_id: &connection.id,
                lifecycle_credential: "hnry_lifecycle_deadbeefdeadbeef",
                activity: true,
                startup: false,
                capabilities: PluginCapabilities {
                    version: 1,
                    activity_v1: true,
                    forget_v1: true,
                    startup_context_v1: false,
                },
            },
            &MasterKey::from_bytes([3; 32]),
            2,
        )
        .unwrap();
    tx.commit().unwrap();
    assert!(dir.path().join("plugin-control.db").exists());
    let tx = core.transaction().unwrap();
    assert!(control.bound_in(&tx, "running").unwrap());
    assert!(control.authenticate_in(&tx, &grant.token, 3).unwrap().is_some());
    assert!(
        control
            .authenticate_in(&tx, "hnry_activity_deadbeef", 3)
            .unwrap()
            .is_none()
    );
    tx.commit().unwrap();
    World {
        _dir: dir,
        path,
        sessions,
        hosts,
        gateway,
        hat,
        id: connection.id,
        token: grant.token,
    }
}
#[test]
fn registration_is_optional_scoped_and_binds_an_already_running_session() {
    let _world = registered_world();
}

impl World {
    fn core<T>(&self, read: impl FnOnce(&rusqlite::Transaction<'_>) -> T) -> T {
        let mut conn = hennery_kernel::db::open(&self.path).unwrap();
        let coordination = conn.coordination();
        let _gate = coordination.gate.lock();
        let tx = conn.transaction().unwrap();
        let result = read(&tx);
        tx.commit().unwrap();
        result
    }
    fn runtime(&self) -> std::sync::Arc<hennery_gateway::runtime::Runtime> {
        std::sync::Arc::new(hennery_gateway::runtime::Runtime::new(
            self.gateway.clone(),
            std::sync::Arc::new(hennery_gateway::scope::ProxyStore::open(&self.path).unwrap()),
            std::sync::Arc::new(MasterKey::from_bytes([3; 32])),
            hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
            std::sync::Arc::new(hennery_kernel::push::Push::detached()),
        ))
    }
}
#[test]
fn exposed_sessions_refuse_reassignment_even_through_a_store_without_runtime() {
    let w = registered_world();
    let hennery_kernel::hats::HatChange::Done(other) = w.hosts.create_hat("Other", None, 4).unwrap() else {
        panic!("hat")
    };
    w.sessions
        .ingest(
            "running",
            1,
            &hennery_proto::frames::SessionBody::session_started("request", "agent"),
        )
        .unwrap();
    w.sessions
        .ingest(
            "running",
            2,
            &hennery_proto::frames::SessionBody::SessionParked {
                reason: hennery_proto::frames::ParkReason::Idle,
            },
        )
        .unwrap();
    assert_eq!(
        w.sessions.reassign_hat("running", &other.id).unwrap(),
        hennery_sessions::store::Reassign::PluginExposure
    );
    let isolated = Store::open(&w.path).unwrap();
    assert_eq!(
        isolated.reassign_hat("running", &other.id).unwrap(),
        hennery_sessions::store::Reassign::PluginExposure
    );
}
#[tokio::test]
async fn connection_edit_cuts_before_forget_and_retains_a_terminal_routing_fence() {
    let w = registered_world();
    let control = w.gateway.plugins();
    let watch = w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat).unwrap());
    let patch = hennery_gateway::model::ConnectionPatch {
        url: Some("https://example.invalid/replacement".into()),
        ..Default::default()
    };
    let err = w.gateway.update(&w.id, &patch, 5).unwrap_err();
    assert!(err.is::<hennery_gateway::plugin::PendingMutation>());
    assert!(watch.token().is_cancelled());
    assert_eq!(
        w.gateway.connection(&w.id).unwrap().unwrap().url,
        "https://example.invalid/mcp"
    );
    assert!(w.core(|tx| control.authenticate_in(tx, &w.token, 6).unwrap()).is_none());
    w.runtime().settle_plugin(&w.id).await.unwrap();
    assert!(matches!(w.gateway.update(&w.id, &patch, 7).unwrap(), Change::Done(_)));
    assert!(w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat)).is_err());
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    let (state, endpoint, secret): (String, Option<String>, Option<Vec<u8>>) = raw
        .query_row("SELECT state,endpoint,lifecycle FROM plugin_registrations", [], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        })
        .unwrap();
    assert_eq!(state, "complete");
    assert!(endpoint.is_none() && secret.is_none());
    assert_eq!(
        raw.query_row("SELECT result FROM plugin_receipts", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "unconfirmed"
    );
}
#[test]
fn unmount_terminates_access_and_never_removes_an_exposure_binding() {
    let w = registered_world();
    let control = w.gateway.plugins();
    let watch = w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat).unwrap());
    assert!(
        w.gateway
            .replace_mounts(&w.id, &[])
            .unwrap_err()
            .is::<hennery_gateway::plugin::PendingMutation>()
    );
    assert!(watch.token().is_cancelled());
    w.core(|tx| {
        assert!(control.authenticate_in(tx, &w.token, 5).unwrap().is_none());
        assert!(control.bound_in(tx, "running").unwrap());
        assert!(control.admit_in(tx, &w.id, "running", &w.hat).is_err());
    });
}
#[test]
fn cursors_are_opaque_and_bound_to_the_registration_epoch() {
    let w = registered_world();
    let control = w.gateway.plugins();
    w.core(|tx| {
        let mut grant = control.authenticate_in(tx, &w.token, 5).unwrap().unwrap();
        let cursor = control.encode_cursor(&grant, grant.start_event).unwrap();
        assert_eq!(control.decode_cursor(&grant, &cursor).unwrap(), grant.start_event);
        grant.epoch.push('f');
        assert!(control.decode_cursor(&grant, &cursor).is_err());
        assert!(control.decode_cursor(&grant, "0").is_err());
    });
}

struct Upstream {
    url: String,
    seen: tokio::sync::mpsc::UnboundedReceiver<(axum::http::HeaderMap, serde_json::Value)>,
    release: std::sync::Arc<tokio::sync::Semaphore>,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for Upstream {
    fn drop(&mut self) {
        self.task.abort();
    }
}
impl Upstream {
    async fn start() -> Self {
        Self::start_mode(None).await
    }
    async fn start_mode(mode: Option<&'static str>) -> Self {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/old", listener.local_addr().unwrap());
        let (sent, seen) = tokio::sync::mpsc::unbounded_channel();
        let release = std::sync::Arc::new(tokio::sync::Semaphore::new(0));
        let gate = release.clone();
        let app = axum::Router::new().route(
            "/old",
            axum::routing::post(
                move |headers: axum::http::HeaderMap, axum::Json(body): axum::Json<serde_json::Value>| {
                    let sent = sent.clone();
                    let gate = gate.clone();
                    async move {
                        sent.send((headers, body.clone())).unwrap();
                        if body["method"] == "ping" {
                            use futures::StreamExt;
                            let first = if mode == Some("sse") {
                                "data: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\n\n"
                            } else {
                                "{"
                            };
                            let stream = futures::stream::once(async move {
                                Ok::<_, std::io::Error>(axum::body::Bytes::from_static(first.as_bytes()))
                            })
                            .chain(futures::stream::pending());
                            return axum::response::Response::builder()
                                .header(
                                    "content-type",
                                    if mode == Some("sse") {
                                        "text/event-stream"
                                    } else {
                                        "application/json"
                                    },
                                )
                                .body(axum::body::Body::from_stream(stream))
                                .unwrap();
                        }
                        gate.acquire().await.unwrap().forget();
                        let mut answer = serde_json::json!({"jsonrpc":"2.0", "id":body["id"],
                            "result":{"request_id":body["id"], "status":"confirmed", "remaining_kinds":[]}});
                        match mode {
                            Some("unconfirmed") => answer["result"]["status"] = serde_json::json!("unconfirmed"),
                            Some("wrong-request-id") => answer["result"]["request_id"] = serde_json::json!("other"),
                            Some("wrong-rpc-id") => answer["id"] = serde_json::json!("other"),
                            Some("wrong-rpc-version") => answer["jsonrpc"] = serde_json::json!("1.0"),
                            Some("remaining") => answer["result"]["remaining_kinds"] = serde_json::json!(["events"]),
                            Some("unknown-field") => answer["unexpected"] = serde_json::json!(true),
                            _ => {}
                        }
                        let mut payload = serde_json::to_string(&answer).unwrap();
                        if mode == Some("duplicate-id") {
                            payload.insert_str(1, "\"id\":\"forged\",");
                        }
                        if mode == Some("invalid-json") {
                            payload = "{".into();
                        }
                        if mode == Some("oversize") {
                            payload.push_str(&" ".repeat(16 * 1024));
                        }
                        axum::response::Response::builder()
                            .status(if mode == Some("http-error") { 500 } else { 200 })
                            .header(
                                "content-type",
                                if mode == Some("wrong-content-type") {
                                    "text/plain"
                                } else {
                                    "application/json"
                                },
                            )
                            .body(axum::body::Body::from(payload))
                            .unwrap()
                    }
                },
            ),
        );
        let task = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        Self {
            url,
            seen,
            release,
            task,
        }
    }
    async fn entered(&mut self) -> (axum::http::HeaderMap, serde_json::Value) {
        tokio::time::timeout(std::time::Duration::from_secs(5), self.seen.recv())
            .await
            .unwrap()
            .unwrap()
    }
}

#[tokio::test]
async fn purge_and_unmount_cut_real_json_and_sse_before_remote_forget_returns() {
    use futures::StreamExt;
    for operation in ["purge", "unmount"] {
        for mode in ["json", "sse"] {
            let mut upstream = Upstream::start_mode(Some(mode)).await;
            let w = registered_at(&upstream.url, true);
            let runtime = w.runtime();
            let token = w.core(|tx| {
                hennery_gateway::tokens::mint_in(tx, w.sessions.owner_id(), "running", "host", &w.hat, 5).unwrap()
            });
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let url = format!("http://{}/mcp/test-plugin", listener.local_addr().unwrap());
            let app = hennery_gateway::proxy::router(hennery_gateway::proxy::ProxyState::for_sessions(
                runtime.clone(),
                Default::default(),
            ));
            let server = tokio::spawn(async move {
                axum::serve(listener, app).await.unwrap();
            });
            let bearer = token.expose().to_string();
            let mut request = tokio::spawn(async move {
                reqwest::Client::new()
                    .post(url)
                    .bearer_auth(bearer)
                    .header("accept", "application/json, text/event-stream")
                    .json(&serde_json::json!({"jsonrpc":"2.0","id":1,"method":"ping"}))
                    .send()
                    .await
            });
            let (headers, body) = upstream.entered().await;
            assert_eq!(body["method"], "ping");
            assert_eq!(headers["authorization"], "Bearer namespace");
            let mut stream = if mode == "sse" {
                let response = (&mut request).await.unwrap().unwrap();
                assert_eq!(response.status(), reqwest::StatusCode::OK);
                let mut stream = response.bytes_stream();
                assert!(stream.next().await.unwrap().unwrap().starts_with(b"data:"));
                Some(stream)
            } else {
                None
            };
            let hat = w.hat.clone();
            let id = w.id.clone();
            let store = w.gateway.clone();
            let mutation = tokio::spawn(async move {
                if operation == "purge" {
                    runtime.purge_plugins(&hat).await
                } else {
                    runtime
                        .plugin_mutation(&id, || store.replace_mounts(&id, &[]).map(|_| ()))
                        .await
                }
            });
            upstream.entered().await;
            assert!(!mutation.is_finished());
            if let Some(stream) = stream.as_mut() {
                let end = tokio::time::timeout(std::time::Duration::from_secs(2), stream.next())
                    .await
                    .unwrap();
                assert!(end.is_none() || end.unwrap().is_err());
            } else {
                let response = tokio::time::timeout(std::time::Duration::from_secs(2), request)
                    .await
                    .unwrap()
                    .unwrap();
                match response {
                    Ok(response) => assert_eq!(response.status(), reqwest::StatusCode::NOT_FOUND),
                    Err(error) => assert!(error.is_request() || error.is_body()),
                }
            }
            upstream.release.add_permits(1);
            mutation.await.unwrap().unwrap();
            server.abort();
            let _ = server.await;
        }
    }
}

#[tokio::test]
async fn edit_delete_and_unmount_pin_old_destination_and_cut_before_wait() {
    for operation in ["edit", "delete", "unmount"] {
        let mut upstream = Upstream::start().await;
        let w = registered_at(&upstream.url, true);
        let control = w.gateway.plugins();
        let watch = w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat).unwrap());
        let runtime = w.runtime();
        let gateway = w.gateway.clone();
        let id = w.id.clone();
        let replacement = upstream.url.replace("/old", "/new");
        let patch = hennery_gateway::model::ConnectionPatch {
            url: Some(replacement.clone()),
            ..Default::default()
        };
        let task = tokio::spawn(async move {
            runtime
                .plugin_mutation(&id, || {
                    let now = hennery_kernel::secret::unix_now();
                    match operation {
                        "edit" => gateway.update(&id, &patch, now).map(|_| ()),
                        "delete" => gateway.delete(&id).map(|_| ()),
                        "unmount" => gateway.replace_mounts(&id, &[]).map(|_| ()),
                        _ => unreachable!(),
                    }
                })
                .await
        });
        let (headers, body) = upstream.entered().await;
        assert_eq!(headers["authorization"], "Bearer hnry_lifecycle_deadbeefdeadbeef");
        assert_eq!(body["method"], "hennery_plugin_forget");
        assert!(watch.token().is_cancelled(), "{operation}: cut before upstream barrier");
        assert!(w.core(|tx| control.authenticate_in(tx, &w.token, 6).unwrap()).is_none());
        assert!(w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat)).is_err());
        assert_eq!(w.gateway.connection(&w.id).unwrap().unwrap().url, upstream.url);
        assert!(!task.is_finished());
        upstream.release.add_permits(1);
        task.await.unwrap().unwrap();
        let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
        assert_eq!(
            raw.query_row("SELECT result FROM plugin_receipts", [], |r| r.get::<_, String>(0))
                .unwrap(),
            "confirmed"
        );
        assert_eq!(raw.query_row("SELECT count(*) FROM plugin_registrations WHERE lifecycle IS NOT NULL OR endpoint IS NOT NULL OR token_hash IS NOT NULL", [], |r|r.get::<_, i64>(0)).unwrap(), 0);
        assert!(w.core(|tx| control.bound_in(tx, "running").unwrap()));
        if operation == "delete" {
            assert!(w.gateway.connection(&w.id).unwrap().is_none());
            assert_eq!(
                raw.query_row("SELECT count(*) FROM plugin_registrations", [], |r| r.get::<_, i64>(0))
                    .unwrap(),
                0
            );
        } else if operation == "edit" {
            assert_eq!(w.gateway.connection(&w.id).unwrap().unwrap().url, replacement);
            assert!(w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat)).is_err());
        }
    }
}

#[tokio::test]
async fn purge_cuts_all_hat_tokens_before_stalled_forget_and_after_persistence_failure() {
    for fail in [false, true] {
        let mut upstream = Upstream::start().await;
        let w = registered_at(&upstream.url, true);
        let control = w.gateway.plugins();
        let watch = w.core(|tx| control.admit_in(tx, &w.id, "running", &w.hat).unwrap());
        w.core(|tx| {
            hennery_gateway::tokens::mint_in(tx, w.sessions.owner_id(), "running", "host", &w.hat, 5).unwrap();
        });
        if fail {
            let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
            raw.execute_batch("CREATE TRIGGER refuse_terminal BEFORE UPDATE ON plugin_registrations BEGIN SELECT RAISE(ABORT, 'fault'); END;").unwrap();
        }
        let runtime = w.runtime();
        let hat = w.hat.clone();
        let mut task = tokio::spawn(async move { runtime.purge_plugins(&hat).await });
        if fail {
            assert!((&mut task).await.unwrap().is_err());
            assert!(upstream.seen.try_recv().is_err());
        } else {
            upstream.entered().await;
            assert!(!task.is_finished());
        }
        assert!(watch.token().is_cancelled());
        assert_eq!(
            w.core(|tx| tx
                .query_row(
                    "SELECT count(*) FROM gw_session_tokens WHERE revoked_at IS NULL",
                    [],
                    |r| r.get::<_, i64>(0)
                )
                .unwrap()),
            0
        );
        if !fail {
            upstream.release.add_permits(1);
            task.await.unwrap().unwrap();
            w.runtime().revocations.cut(w.gateway.purge_hat(&w.hat).unwrap());
            let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
            assert_eq!(
                raw.query_row("SELECT count(*) FROM plugin_registrations", [], |r| r.get::<_, i64>(0))
                    .unwrap(),
                0
            );
        }
    }
}

#[tokio::test]
async fn both_purge_entry_points_cut_before_wait_even_if_obligation_write_fails() {
    use hennery_kernel::lifecycle::LifecycleHooks;
    for hook in [false, true] {
        for fault in [false, true] {
            let mut upstream = Upstream::start().await;
            let w = registered_at(&upstream.url, true);
            let runtime = w.runtime();
            let watch = w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).unwrap());
            w.core(|tx| {
                hennery_gateway::tokens::mint_in(tx, w.sessions.owner_id(), "running", "host", &w.hat, 1).unwrap();
            });
            if fault {
                rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap()
                    .execute_batch("CREATE TRIGGER refuse_terminal BEFORE UPDATE ON plugin_registrations BEGIN SELECT RAISE(ABORT,'fault'); END;").unwrap();
            }
            let World {
                _dir: dir,
                path,
                sessions,
                hosts,
                gateway: _,
                hat,
                id: _,
                token: _,
            } = w;
            let state = hennery_sessions::AppState::new(
                sessions,
                hosts,
                hennery_kernel::operator::Operator::open(&path).unwrap(),
            );
            state
                .store
                .set_session_mcp(std::sync::Arc::new(hennery_gateway::session::GatewayMcp::new(
                    &hennery_gateway::api::GatewayState {
                        runtime,
                        operator: state.operator.clone(),
                    },
                )));
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let url = format!("http://{}/api/hats/{hat}/purge", listener.local_addr().unwrap());
            let server = tokio::spawn(hennery_sessions::serve(listener, state.clone()));
            let task_state = state.clone();
            let client = hennery_testkit::operator_client(&state.operator);
            let task = tokio::spawn(async move {
                if hook {
                    assert!(matches!(
                        task_state.hosts.begin_purge(&hat, 1).unwrap(),
                        hennery_kernel::hats::PurgeStart::Frozen { .. }
                    ));
                    task_state.on_hat_purged(&hat).await.is_ok()
                } else {
                    client.post(url).send().await.unwrap().status().is_success()
                }
            });
            if fault {
                assert!(!task.await.unwrap());
                assert!(upstream.seen.try_recv().is_err());
            } else {
                upstream.entered().await;
                assert!(watch.token().is_cancelled());
                let core = rusqlite::Connection::open(&path).unwrap();
                assert_eq!(
                    core.query_row(
                        "SELECT count(*) FROM gw_session_tokens WHERE revoked_at IS NULL",
                        [],
                        |r| r.get::<_, i64>(0)
                    )
                    .unwrap(),
                    0
                );
                upstream.release.add_permits(1);
                assert!(task.await.unwrap());
            }
            assert!(watch.token().is_cancelled());
            let core = rusqlite::Connection::open(&path).unwrap();
            assert_eq!(
                core.query_row(
                    "SELECT count(*) FROM gw_session_tokens WHERE revoked_at IS NULL",
                    [],
                    |r| r.get::<_, i64>(0)
                )
                .unwrap(),
                0
            );
            if !fault {
                let control = rusqlite::Connection::open(path.parent().unwrap().join("plugin-control.db")).unwrap();
                for table in ["plugin_registrations", "plugin_bindings", "plugin_generations"] {
                    assert_eq!(
                        control
                            .query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get::<_, i64>(0))
                            .unwrap(),
                        0,
                        "completed purge must clear per-hat optional state: {table}"
                    );
                }
                assert_eq!(
                    control
                        .query_row("SELECT count(*) FROM plugin_receipts", [], |r| r.get::<_, i64>(0))
                        .unwrap(),
                    1,
                    "completed purge retains its minimal receipt"
                );
            }
            state.shutdown.cancel();
            server.await.unwrap().unwrap();
            drop(dir);
        }
    }
}

#[test]
fn session_deletion_releases_binding_only_after_durable_tombstone() {
    let w = registered_world();
    assert!(
        w.core(|tx| w.gateway.plugins().remove_binding_in(tx, "running"))
            .is_err()
    );
    w.sessions.close_now("running").unwrap();
    assert!(matches!(
        w.sessions.delete_session("running", None).unwrap(),
        hennery_sessions::store::Deletion::Done { .. }
    ));
    assert!(!w.core(|tx| w.gateway.plugins().bound_in(tx, "running").unwrap()));
}

#[test]
fn deleting_a_bound_session_cannot_heal_an_older_control_backup_missing_later_exposure() {
    let w = registered_world();
    let backup = w.path.parent().unwrap().join("earlier-control.db");
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    raw.execute("VACUUM INTO ?1", [backup.to_str().unwrap()]).unwrap();
    drop(raw);
    w.sessions
        .create_session("later", "host", "fake", "/scratch", &w.hat, None)
        .unwrap();
    w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "later", &w.hat).unwrap());
    w.sessions.close_now("later").unwrap();
    w.sessions.close_now("running").unwrap();
    let hennery_kernel::hats::HatChange::Done(other) = w.hosts.create_hat("Other", None, 4).unwrap() else {
        panic!("hat")
    };
    let World {
        _dir,
        path,
        sessions,
        hosts,
        gateway,
        hat,
        id,
        token,
    } = w;
    drop((sessions, hosts, gateway));
    let control = path.parent().unwrap().join("plugin-control.db");
    std::fs::rename(&control, path.parent().unwrap().join("retained-newer-control.db")).unwrap();
    std::fs::rename(backup, &control).unwrap();
    let w = World {
        sessions: Store::open(&path).unwrap(),
        hosts: Hosts::open(&path).unwrap(),
        gateway: std::sync::Arc::new(GatewayStore::open(&path).unwrap()),
        _dir,
        path,
        hat,
        id,
        token,
    };
    assert!(w.core(|tx| w.gateway.plugins().bound_in(tx, "later")).is_err());
    // The core tombstone may commit even when conservative optional cleanup refuses.
    let _ = w.sessions.delete_session("running", None);
    assert!(
        w.sessions.reassign_hat("later", &other.id).is_err(),
        "deleting the surviving old binding must not make lost exposure movable"
    );
    assert!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &w.token, 6))
            .is_err()
    );
    let raw = rusqlite::Connection::open(control).unwrap();
    assert_eq!(
        raw.query_row(
            "SELECT count(*) FROM plugin_bindings WHERE session_id = 'running'",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        1
    );
    assert!(
        w.core(|tx| tx
            .query_row("SELECT lifecycle FROM sessions WHERE id = 'running'", [], |r| r
                .get::<_, String>(0))
            .unwrap())
            == "deleted"
    );
}

#[tokio::test]
async fn policy_resolution_registration_race_never_forwards_an_obsolete_allowlist() {
    use hennery_gateway::scope::{MountPolicy, Principal, ScopedConnection};
    use std::sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    };
    type ChangePolicy = Box<dyn FnOnce() + Send>;
    struct RegisterAfterRead {
        inner: Arc<dyn MountPolicy>,
        change: Mutex<Option<ChangePolicy>>,
    }
    impl MountPolicy for RegisterAfterRead {
        fn connection(&self, principal: &Principal, slug: &str) -> anyhow::Result<Option<ScopedConnection>> {
            let old = self.inner.connection(principal, slug)?;
            if let Some(change) = self.change.lock().unwrap().take() {
                assert!(old.as_ref().unwrap().tool_allowlist.is_none());
                change();
            }
            Ok(old)
        }
    }
    let mut upstream = Upstream::start_mode(Some("finite")).await;
    upstream.release.add_permits(2);
    let w = registered_at(&upstream.url, true);
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    raw.execute("DELETE FROM plugin_registrations", []).unwrap();
    w.core(|tx| {
        tx.execute("DELETE FROM settings WHERE key LIKE 'plugin_epoch:%'", [])
            .unwrap();
    });
    assert!(matches!(
        w.gateway
            .update(
                &w.id,
                &hennery_gateway::model::ConnectionPatch {
                    tool_allowlist: Some(None),
                    ..Default::default()
                },
                4
            )
            .unwrap(),
        Change::Done(_)
    ));
    let token =
        w.core(|tx| hennery_gateway::tokens::mint_in(tx, w.sessions.owner_id(), "running", "host", &w.hat, 5).unwrap());
    let called = Arc::new(AtomicBool::new(false));
    let mut proxy = hennery_gateway::proxy::ProxyState::for_sessions(w.runtime(), Default::default());
    let gateway = w.gateway.clone();
    let id = w.id.clone();
    let path = w.path.clone();
    let observed = called.clone();
    proxy.mounts = Arc::new(RegisterAfterRead {
        inner: proxy.mounts.clone(),
        change: Mutex::new(Some(Box::new(move || {
            assert!(matches!(
                gateway
                    .update(
                        &id,
                        &hennery_gateway::model::ConnectionPatch {
                            tool_allowlist: Some(Some(vec!["search".into()])),
                            ..Default::default()
                        },
                        6
                    )
                    .unwrap(),
                Change::Done(_)
            ));
            let mut core = hennery_kernel::db::open(&path).unwrap();
            let tx = core.transaction().unwrap();
            gateway
                .plugins()
                .register_in(
                    &tx,
                    RegistrationInput {
                        connection_id: &id,
                        lifecycle_credential: "hnry_lifecycle_deadbeefdeadbeef",
                        activity: true,
                        startup: false,
                        capabilities: PluginCapabilities {
                            version: 1,
                            activity_v1: true,
                            forget_v1: true,
                            startup_context_v1: false,
                        },
                    },
                    &MasterKey::from_bytes([3; 32]),
                    6,
                )
                .unwrap();
            tx.commit().unwrap();
            observed.store(true, Ordering::SeqCst);
        }))),
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/mcp/test-plugin", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, hennery_gateway::proxy::router(proxy))
            .await
            .unwrap();
    });
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap();
    let response = client.post(&url).bearer_auth(token.expose())
        .header("accept", "application/json, text/event-stream")
        .json(&serde_json::json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"blocked","arguments":{}}}))
        .send().await.unwrap();
    assert!(
        called.load(Ordering::SeqCst),
        "registration committed after old policy resolution"
    );
    assert_eq!(
        response.status(),
        reqwest::StatusCode::NOT_FOUND,
        "stale permissive policy must be rejected before dispatch"
    );
    assert!(
        upstream.seen.try_recv().is_err(),
        "blocked tool must never reach upstream"
    );
    let response = client.post(url).bearer_auth(token.expose())
        .header("accept", "application/json, text/event-stream")
        .json(&serde_json::json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search","arguments":{}}}))
        .send().await.unwrap();
    assert_eq!(response.status(), reqwest::StatusCode::OK);
    response.bytes().await.unwrap();
    assert_eq!(upstream.entered().await.1["params"]["name"], "search");
    server.abort();
    let _ = server.await;
}

#[test]
fn admission_and_reassignment_serialize_across_distinct_store_handles() {
    let w = registered_world();
    let hennery_kernel::hats::HatChange::Done(other) = w.hosts.create_hat("Other", None, 4).unwrap() else {
        panic!("hat")
    };
    for n in 0..12 {
        let session = format!("race-{n}");
        w.sessions
            .create_session(&session, "host", "fake", "/scratch", &w.hat, None)
            .unwrap();
        w.sessions
            .ingest(
                &session,
                1,
                &hennery_proto::frames::SessionBody::session_started("request", "agent"),
            )
            .unwrap();
        w.sessions
            .ingest(
                &session,
                2,
                &hennery_proto::frames::SessionBody::SessionParked {
                    reason: hennery_proto::frames::ParkReason::Idle,
                },
            )
            .unwrap();
        let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
        let moved = std::thread::scope(|threads| {
            let barrier2 = barrier.clone();
            let path = &w.path;
            let sid = &session;
            let hat = &other.id;
            let reassign = threads.spawn(move || {
                let store = Store::open(path).unwrap();
                barrier2.wait();
                store.reassign_hat(sid, hat).unwrap()
            });
            barrier.wait();
            let admitted = w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, &session, &w.hat).is_ok());
            (admitted, reassign.join().unwrap())
        });
        match moved {
            (true, hennery_sessions::store::Reassign::PluginExposure) => {}
            (false, hennery_sessions::store::Reassign::Done(_)) => {}
            result => panic!("incoherent admission/reassignment: {result:?}"),
        }
    }
}

fn mutate(w: &World, operation: &str) -> anyhow::Result<()> {
    match operation {
        "edit" => w
            .gateway
            .update(
                &w.id,
                &hennery_gateway::model::ConnectionPatch {
                    url: Some("https://replacement.invalid/new-path".into()),
                    ..Default::default()
                },
                hennery_kernel::secret::unix_now(),
            )
            .map(|_| ()),
        "delete" => w.gateway.delete(&w.id).map(|_| ()),
        "unmount" => w.gateway.replace_mounts(&w.id, &[]).map(|_| ()),
        _ => unreachable!(),
    }
}

/// Re-exec only this test, with a scratch DB. No collector default data path
/// or operator home is ever consulted.
#[tokio::test]
async fn plugin_recovery_child_entry() {
    let Some(path) = std::env::var_os("HENNERY_PLUGIN_RECOVERY_DB") else {
        return;
    };
    let path = std::path::PathBuf::from(path);
    let gateway = std::sync::Arc::new(GatewayStore::open(&path).unwrap());
    let runtime = hennery_gateway::runtime::Runtime::new(
        gateway,
        std::sync::Arc::new(hennery_gateway::scope::ProxyStore::open(&path).unwrap()),
        std::sync::Arc::new(MasterKey::from_bytes([3; 32])),
        hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
        std::sync::Arc::new(hennery_kernel::push::Push::detached()),
    );
    runtime.recover_plugins().await.unwrap();
}

#[tokio::test]
async fn restart_reconciles_every_mutation_crash_point_without_retargeting_secrets() {
    for operation in ["edit", "delete", "unmount"] {
        for point in 0..6 {
            let mut upstream = Upstream::start().await;
            let w = registered_at(&upstream.url, true);
            let mut request_id = None;
            if point > 0 {
                assert!(
                    mutate(&w, operation)
                        .unwrap_err()
                        .is::<hennery_gateway::plugin::PendingMutation>()
                );
                if point >= 2 {
                    let runtime = w.runtime();
                    let id = w.id.clone();
                    let wait = tokio::spawn(async move { runtime.settle_plugin(&id).await });
                    let (_, body) = upstream.entered().await;
                    request_id = Some(body["id"].clone());
                    if point == 2 {
                        wait.abort();
                        assert!(wait.await.unwrap_err().is_cancelled());
                    } else {
                        upstream.release.add_permits(1);
                        wait.await.unwrap().unwrap();
                    }
                }
                if point >= 4 {
                    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
                    if point == 4 {
                        raw.execute_batch("CREATE TRIGGER before_completion BEFORE UPDATE ON plugin_registrations WHEN NEW.state = 'complete' BEGIN SELECT RAISE(ABORT,'crash point'); END;").unwrap();
                        // Core commit succeeded; completion marker did not.
                        if operation == "delete" {
                            // Deletion resolves its fence with DELETE instead.
                            raw.execute_batch("CREATE TRIGGER before_completion_delete BEFORE DELETE ON plugin_registrations BEGIN SELECT RAISE(ABORT,'crash point'); END;").unwrap();
                        }
                        assert!(mutate(&w, operation).is_err());
                        raw.execute_batch("DROP TRIGGER before_completion;").unwrap();
                        if operation == "delete" {
                            raw.execute_batch("DROP TRIGGER before_completion_delete;").unwrap();
                        }
                    } else {
                        mutate(&w, operation).unwrap();
                    }
                }
            }
            let World {
                _dir: dir,
                path,
                sessions,
                hosts,
                gateway,
                hat,
                id,
                token,
            } = w;
            drop(sessions);
            drop(hosts);
            drop(gateway);
            let child = std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact", "plugin_recovery_child_entry", "--nocapture"])
                .env("HENNERY_PLUGIN_RECOVERY_DB", &path)
                .env("HOME", dir.path())
                .env("XDG_DATA_HOME", dir.path())
                .env("XDG_CONFIG_HOME", dir.path())
                .env_remove("HENNERY_DATA_DIR")
                .env_remove("HENNERY_HOST_DATA_DIR")
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .unwrap();
            let finished = tokio::task::spawn_blocking(move || child.wait_with_output().unwrap());
            if point == 1 || point == 2 {
                let (headers, body) = upstream.entered().await;
                assert_eq!(headers["authorization"], "Bearer hnry_lifecycle_deadbeefdeadbeef");
                if let Some(request_id) = request_id {
                    assert_eq!(body["id"], request_id);
                }
                // The first cancelled server request may still consume a permit.
                upstream.release.add_permits(2);
            }
            let output = tokio::time::timeout(std::time::Duration::from_secs(15), finished)
                .await
                .unwrap()
                .unwrap();
            assert!(
                output.status.success(),
                "{operation}/{point}: {} {}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
            let gateway = GatewayStore::open(&path).unwrap();
            let mut core = hennery_kernel::db::open(&path).unwrap();
            let tx = core.transaction().unwrap();
            let authenticated = gateway.plugins().authenticate_in(&tx, &token, 1).unwrap().is_some();
            assert_eq!(authenticated, point == 0, "{operation}/{point}");
            assert!(gateway.plugins().bound_in(&tx, "running").unwrap());
            tx.commit().unwrap();
            let raw = rusqlite::Connection::open(dir.path().join("plugin-control.db")).unwrap();
            if point > 0 {
                assert_eq!(raw.query_row("SELECT count(*) FROM plugin_registrations WHERE lifecycle IS NOT NULL OR endpoint IS NOT NULL OR token_hash IS NOT NULL", [], |r|r.get::<_,i64>(0)).unwrap(), 0, "{operation}/{point}");
            }
            assert!(
                upstream.seen.try_recv().is_err(),
                "no request to a replacement after recovery"
            );
            drop(hat);
            drop(id);
        }
    }
}

fn issue_again(w: &World) -> hennery_gateway::plugin::IssuedGrant {
    w.core(|tx| {
        w.gateway
            .plugins()
            .register_in(
                tx,
                RegistrationInput {
                    connection_id: &w.id,
                    lifecycle_credential: "hnry_lifecycle_deadbeefdeadbeef",
                    activity: true,
                    startup: false,
                    capabilities: PluginCapabilities {
                        version: 1,
                        activity_v1: true,
                        forget_v1: true,
                        startup_context_v1: false,
                    },
                },
                &MasterKey::from_bytes([3; 32]),
                5,
            )
            .unwrap()
    })
}

#[test]
fn registration_cuts_preexisting_ordinary_traffic_before_activating() {
    let w = registered_world();
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    raw.execute("DELETE FROM plugin_registrations", []).unwrap();
    w.core(|tx| {
        tx.execute("DELETE FROM settings WHERE key LIKE 'plugin_epoch:%'", [])
            .unwrap();
    });
    let watch = w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).unwrap());
    assert!(!watch.token().is_cancelled());
    let issued = issue_again(&w);
    assert!(
        watch.token().is_cancelled(),
        "registration must cut ordinary in-flight traffic"
    );
    assert!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &issued.token, 6).unwrap())
            .is_some()
    );
}

#[test]
fn explicit_restore_recovery_preserves_exposure_and_never_revives_the_old_epoch() {
    use hennery_proto::plugin_management::PluginRecoveryConfirmation;
    for side in ["core", "control", "missing"] {
        let w = registered_world();
        w.sessions
            .create_session("unexposed", "host", "fake", "/scratch", &w.hat, None)
            .unwrap();
        w.sessions.close_now("unexposed").unwrap();
        assert!(!w.core(|tx| w.gateway.plugins().bound_in(tx, "unexposed").unwrap()));
        let World {
            _dir: dir,
            path,
            sessions,
            hosts,
            gateway,
            hat,
            id,
            token,
        } = w;
        drop(sessions);
        drop(hosts);
        drop(gateway);
        if side == "missing" {
            std::fs::rename(
                dir.path().join("plugin-control.db"),
                dir.path().join("old-plugin-control.db"),
            )
            .unwrap();
        } else if side == "control" {
            rusqlite::Connection::open(dir.path().join("plugin-control.db"))
                .unwrap()
                .execute("UPDATE plugin_generations SET generation = 'restore-mismatch'", [])
                .unwrap();
        } else {
            rusqlite::Connection::open(&path)
                .unwrap()
                .execute(
                    "UPDATE settings SET value = 'restore-mismatch' WHERE key LIKE 'plugin_generation:%'",
                    [],
                )
                .unwrap();
        }
        let w = World {
            sessions: Store::open(&path).unwrap(),
            hosts: Hosts::open(&path).unwrap(),
            gateway: std::sync::Arc::new(GatewayStore::open(&path).unwrap()),
            _dir: dir,
            path,
            hat,
            id,
            token,
        };
        let old = w.core(|tx| w.gateway.plugins().authenticate_in(tx, &w.token, 6));
        assert!(
            !matches!(old, Ok(Some(_))),
            "{side}: oldgrant must deny before recovery"
        );
        let consent = PluginRecoveryConfirmation {
            new_empty_namespace: true,
            unresolved_external_copy_acknowledged: true,
        };
        for (fresh, ack) in [(false, true), (true, false)] {
            let refused = PluginRecoveryConfirmation {
                new_empty_namespace: fresh,
                unresolved_external_copy_acknowledged: ack,
            };
            assert!(
                w.core(|tx| w.gateway.plugins().repair_registration_in(tx, &w.id, &refused, 6))
                    .is_err()
            );
        }
        w.core(|tx| w.gateway.plugins().repair_registration_in(tx, &w.id, &consent, 6))
            .unwrap();
        let new = issue_again(&w);
        assert_ne!(new.token, w.token);
        w.core(|tx| {
            assert!(w.gateway.plugins().bound_in(tx, "running").unwrap());
            assert!(
                w.gateway.plugins().bound_in(tx, "unexposed").unwrap(),
                "closed sessions are conservatively bound too"
            );
            assert!(w.gateway.plugins().authenticate_in(tx, &w.token, 7).unwrap().is_none());
            assert!(
                w.gateway
                    .plugins()
                    .authenticate_in(tx, &new.token, 7)
                    .unwrap()
                    .is_some()
            );
        });
        assert!(
            w.gateway
                .plugin_deletion_receipts()
                .unwrap()
                .iter()
                .any(|r| r.status == hennery_proto::plugin::ForgetStatus::Unconfirmed)
        );
    }
}

#[test]
fn repairing_one_registration_keeps_sibling_epochs_fenced_until_individual_renewal() {
    use hennery_proto::plugin_management::PluginRecoveryConfirmation;
    let w = registered_world();
    let issue = |id: &str| {
        w.core(|tx| {
            w.gateway.plugins().register_in(
                tx,
                RegistrationInput {
                    connection_id: id,
                    lifecycle_credential: "hnry_lifecycle_deadbeefdeadbeef",
                    activity: true,
                    startup: false,
                    capabilities: PluginCapabilities {
                        version: 1,
                        activity_v1: true,
                        forget_v1: true,
                        startup_context_v1: false,
                    },
                },
                &MasterKey::from_bytes([3; 32]),
                5,
            )
        })
    };
    let create = |hat: &str, slug: &str| {
        let Change::Done(connection) = w
            .gateway
            .create(
                &NewConnection {
                    slug: slug.into(),
                    label: "Sibling".into(),
                    url: "https://example.invalid/mcp".into(),
                    hat_id: hat.into(),
                    cred_kind: CredKind::Static,
                    static_header: None,
                    static_prefix: None,
                    tool_allowlist: Some(vec!["search".into()]),
                    internal_network: false,
                },
                4,
            )
            .unwrap()
        else {
            panic!("connection")
        };
        w.gateway.replace_mounts(&connection.id, &["host".into()]).unwrap();
        w.gateway
            .set_static_credential(&connection.id, "separate-namespace", &MasterKey::from_bytes([3; 32]), 4)
            .unwrap();
        let grant = issue(&connection.id).unwrap();
        (connection.id, grant)
    };
    let (sibling, old_sibling) = create(&w.hat, "sibling-plugin");
    let rotated = w.gateway.rotate_plugin(&sibling, None).unwrap().token.unwrap();
    let watch = w.core(|tx| w.gateway.plugins().admit_in(tx, &sibling, "running", &w.hat).unwrap());
    let hennery_kernel::hats::HatChange::Done(other) = w.hosts.create_hat("Other", None, 4).unwrap() else {
        panic!("hat")
    };
    let (_, untouched) = create(&other.id, "other-plugin");
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    raw.execute(
        "UPDATE plugin_generations SET generation = 'older-control-generation' WHERE hat_id = ?1",
        [&w.hat],
    )
    .unwrap();
    assert!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &old_sibling.token, 6))
            .is_err()
    );
    let consent = PluginRecoveryConfirmation {
        new_empty_namespace: true,
        unresolved_external_copy_acknowledged: true,
    };
    // Recovery's optional commit followed by a core rollback must stay closed.
    let mut core = hennery_kernel::db::open(&w.path).unwrap();
    let tx = core.transaction().unwrap();
    w.gateway
        .plugins()
        .repair_registration_in(&tx, &w.id, &consent, 6)
        .unwrap();
    tx.rollback().unwrap();
    assert!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &old_sibling.token, 6))
            .is_err()
    );
    w.core(|tx| w.gateway.plugins().repair_registration_in(tx, &w.id, &consent, 6))
        .unwrap();
    assert!(
        !matches!(
            w.core(|tx| w.gateway.plugins().authenticate_in(tx, &old_sibling.token, 6)),
            Ok(Some(_))
        ),
        "repairing A must not revive B's old epoch"
    );
    assert!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &rotated, 6))
            .unwrap()
            .is_none()
    );
    assert!(
        watch.token().is_cancelled(),
        "repair must cut sibling work before replacing the hat generation"
    );
    assert!(
        w.core(|tx| w.gateway.plugins().admit_in(tx, &sibling, "running", &w.hat))
            .is_err()
    );
    assert!(w.gateway.rotate_plugin(&sibling, None).is_err());
    assert!(issue(&sibling).is_err(), "sibling requires its own explicit renewal");
    let renewed_a = issue_again(&w);
    w.core(|tx| w.gateway.plugins().repair_registration_in(tx, &sibling, &consent, 7))
        .unwrap();
    let renewed_b = issue(&sibling).unwrap();
    assert_ne!(renewed_b.epoch, old_sibling.epoch);
    w.core(|tx| {
        assert!(
            w.gateway
                .plugins()
                .authenticate_in(tx, &old_sibling.token, 8)
                .unwrap()
                .is_none()
        );
        assert!(w.gateway.plugins().authenticate_in(tx, &rotated, 8).unwrap().is_none());
        assert!(
            w.gateway
                .plugins()
                .authenticate_in(tx, &renewed_a.token, 8)
                .unwrap()
                .is_some(),
            "renewing B must not re-fence already-renewed A"
        );
        assert!(
            w.gateway
                .plugins()
                .authenticate_in(tx, &renewed_b.token, 8)
                .unwrap()
                .is_some()
        );
        assert!(
            w.gateway
                .plugins()
                .authenticate_in(tx, &untouched.token, 8)
                .unwrap()
                .is_some(),
            "another hat remains independent"
        );
    });
}

#[test]
fn restore_recovery_refuses_a_surviving_cross_hat_binding_and_control_only_commit_stays_closed() {
    use hennery_proto::plugin_management::PluginRecoveryConfirmation;
    let w = registered_world();
    let consent = PluginRecoveryConfirmation {
        new_empty_namespace: true,
        unresolved_external_copy_acknowledged: true,
    };
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    raw.execute("UPDATE plugin_bindings SET hat_id = 'other-hat'", [])
        .unwrap();
    assert!(
        w.core(|tx| w.gateway.plugins().repair_registration_in(tx, &w.id, &consent, 6))
            .is_err()
    );
    raw.execute("UPDATE plugin_bindings SET hat_id = ?1", [&w.hat]).unwrap();
    let mut core = hennery_kernel::db::open(&w.path).unwrap();
    let coordination = core.coordination();
    let _gate = coordination.gate.lock();
    let tx = core.transaction().unwrap();
    w.gateway
        .plugins()
        .repair_registration_in(&tx, &w.id, &consent, 6)
        .unwrap();
    // The conservative control binding/generation committed. Core did not.
    tx.rollback().unwrap();
    drop(core);
    assert!(w.core(|tx| w.gateway.plugins().bound_in(tx, "running")).is_err());
    assert!(!matches!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &w.token, 7)),
        Ok(Some(_))
    ));
}

#[test]
fn first_registered_admission_binds_a_new_session_before_returning() {
    let w = registered_world();
    w.sessions
        .create_session("late", "host", "fake", "/scratch", &w.hat, None)
        .unwrap();
    w.core(|tx| {
        assert!(!w.gateway.plugins().bound_in(tx, "late").unwrap());
        let watch = w.gateway.plugins().admit_in(tx, &w.id, "late", &w.hat).unwrap();
        assert!(!watch.token().is_cancelled());
        assert!(
            w.gateway.plugins().bound_in(tx, "late").unwrap(),
            "admission must bind before any work escapes"
        );
    });
}

#[test]
fn added_mount_binds_running_sessions_and_updates_the_active_fingerprint() {
    let w = registered_world();
    let key = HostKey::from_seed([8; 32]);
    w.hosts
        .register(
            "second",
            &Enrollment {
                public_key: key.public_key_hex(),
                name: "Second".into(),
                host_version: "0.0.0".into(),
                platform: "test".into(),
            },
            1,
        )
        .unwrap();
    w.sessions
        .create_session("second-session", "second", "fake", "/scratch", &w.hat, None)
        .unwrap();
    assert!(!w.core(|tx| w.gateway.plugins().bound_in(tx, "second-session").unwrap()));
    w.gateway
        .replace_mounts(&w.id, &["host".into(), "second".into()])
        .unwrap();
    w.core(|tx| {
        assert!(w.gateway.plugins().bound_in(tx, "second-session").unwrap());
        assert!(
            w.gateway.plugins().authenticate_in(tx, &w.token, 6).unwrap().is_some(),
            "mount additions preserve the active grant after binding"
        );
    });
}

#[test]
fn restore_generation_mismatch_denies_authentication_admission_and_reassignment() {
    for control_side in [true, false] {
        let w = registered_world();
        if control_side {
            rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db"))
                .unwrap()
                .execute("UPDATE plugin_generations SET generation = 'older-backup'", [])
                .unwrap();
        } else {
            w.core(|tx| {
                tx.execute(
                    "UPDATE settings SET value = 'older-backup' WHERE key LIKE 'plugin_generation:%'",
                    [],
                )
                .unwrap();
            });
        }
        w.core(|tx| {
            assert!(
                w.gateway.plugins().authenticate_in(tx, &w.token, 6).is_err(),
                "generation mismatch must deny authentication"
            );
            assert!(
                w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).is_err(),
                "generation mismatch must deny new exposure"
            );
            assert!(
                w.gateway.plugins().bound_in(tx, "running").is_err(),
                "generation mismatch must deny reassignment lookup"
            );
        });
    }
}

#[test]
fn raw_purge_cannot_bypass_immutable_lifecycle_obligation() {
    let w = registered_world();
    let err = w.gateway.purge_hat(&w.hat).unwrap_err();
    assert!(err.is::<hennery_gateway::plugin::PendingMutation>());
    assert!(w.gateway.connection(&w.id).unwrap().is_some());
    assert!(
        w.core(|tx| w.gateway.plugins().authenticate_in(tx, &w.token, 6).unwrap())
            .is_some()
    );
}

#[tokio::test]
async fn no_runtime_purge_fails_closed_after_revoking_tokens_and_cutting_work() {
    let w = registered_world();
    let watch = w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).unwrap());
    w.core(|tx| {
        hennery_gateway::tokens::mint_in(tx, w.sessions.owner_id(), "running", "host", &w.hat, 5).unwrap();
    });
    assert!(w.sessions.purge_gateway_hat(&w.hat).await.is_err());
    assert!(watch.token().is_cancelled(), "runtime-less purge must cut plug-in work");
    assert_eq!(
        w.core(|tx| tx
            .query_row(
                "SELECT count(*) FROM gw_session_tokens WHERE revoked_at IS NULL",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap()),
        0,
        "runtime-less purge must revoke tokens before returning"
    );
    assert!(w.gateway.connection(&w.id).unwrap().is_some());
}

#[tokio::test]
async fn pending_snapshot_load_cuts_work_even_when_terminal_write_preceded_watch() {
    let mut upstream = Upstream::start().await;
    let w = registered_at(&upstream.url, true);
    let watch = w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).unwrap());
    rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap().execute("UPDATE plugin_registrations SET state = 'terminal', token_hash = NULL, request_id = 'pending-request', deadline = ?1",[hennery_kernel::secret::unix_now()+5]).unwrap();
    let runtime = w.runtime();
    let id = w.id.clone();
    let task = tokio::spawn(async move { runtime.settle_plugin(&id).await });
    upstream.entered().await;
    assert!(
        watch.token().is_cancelled(),
        "loading a pending obligation must cut in-flight work before remote wait"
    );
    upstream.release.add_permits(1);
    task.await.unwrap().unwrap();
}

#[tokio::test]
async fn recovery_cuts_disposed_namespace_work_without_a_remote_wait() {
    let w = registered_world();
    let watch = w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).unwrap());
    rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db"))
        .unwrap()
        .execute(
            "UPDATE plugin_registrations SET state = 'disposed', token_hash = NULL, endpoint = NULL, lifecycle = NULL",
            [],
        )
        .unwrap();
    w.runtime().recover_plugins().await.unwrap();
    assert!(
        watch.token().is_cancelled(),
        "reconciliation must cut disposed namespaces without pending RPC"
    );
}

#[test]
fn missing_registration_row_never_falls_back_to_ordinary_proxy_or_core_mutation() {
    let w = registered_world();
    rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db"))
        .unwrap()
        .execute("DELETE FROM plugin_registrations", [])
        .unwrap();
    assert!(
        w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat))
            .is_err()
    );
    assert!(mutate(&w, "edit").is_err());
    assert!(w.gateway.connection(&w.id).unwrap().is_some());
}

#[test]
fn start_and_resume_delivery_bind_new_sessions_and_refuse_terminal_namespaces() {
    use hennery_gateway::session::{GatewayMcp, SessionMcp, SessionRef};
    use hennery_proto::rest::McpSessionDeliveryMode;
    let w = registered_world();
    let operator = std::sync::Arc::new(hennery_kernel::operator::Operator::open(&w.path).unwrap());
    let setup = operator.issue_setup_token(1).unwrap().unwrap();
    assert!(matches!(
        operator
            .set_up(&setup, "correct horse battery", "https://hennery.example", 1)
            .unwrap(),
        hennery_kernel::operator::SetupOutcome::Done { .. }
    ));
    let mcp = GatewayMcp::new(&hennery_gateway::api::GatewayState {
        runtime: w.runtime(),
        operator,
    });
    for session in ["start-late", "resume-late"] {
        w.sessions
            .create_session(session, "host", "fake", "/scratch", &w.hat, None)
            .unwrap();
        w.core(|tx| {
            assert!(!w.gateway.plugins().bound_in(tx, session).unwrap());
            let result = mcp
                .servers_in(
                    tx,
                    SessionRef {
                        session_id: session,
                        host_id: "host",
                        hat_id: &w.hat,
                    },
                    McpSessionDeliveryMode::Isolated,
                )
                .unwrap();
            assert_eq!(result.servers.len(), 1);
            assert!(
                w.gateway.plugins().bound_in(tx, session).unwrap(),
                "start/resume must bind before MCP delivery"
            );
        });
    }
    assert!(mutate(&w, "edit").is_err());
    w.core(|tx| {
        assert!(
            mcp.servers_in(
                tx,
                SessionRef {
                    session_id: "running",
                    host_id: "host",
                    hat_id: &w.hat
                },
                McpSessionDeliveryMode::Isolated
            )
            .is_err(),
            "terminal namespace must deny start/resume delivery"
        )
    });
}

#[test]
fn stale_or_frozen_scopes_and_terminal_states_deny_activity_and_proxy_admission() {
    for fault in [
        "frozen-hat",
        "revoked-host",
        "wrong-epoch",
        "changed-connection",
        "pending",
        "terminal",
        "disposed",
        "complete",
    ] {
        let w = registered_world();
        match fault {
            "frozen-hat" => {
                assert!(matches!(
                    w.hosts.begin_purge(&w.hat, 5).unwrap(),
                    hennery_kernel::hats::PurgeStart::Frozen { .. }
                ));
            }
            "revoked-host" => {
                w.core(|tx| {
                    tx.execute("UPDATE hosts SET revoked_at = 5 WHERE id = 'host'", [])
                        .unwrap();
                });
            }
            "wrong-epoch" => {
                w.core(|tx| {
                    tx.execute(
                        "UPDATE settings SET value = 'older-epoch' WHERE key LIKE 'plugin_epoch:%'",
                        [],
                    )
                    .unwrap();
                });
            }
            "changed-connection" => {
                w.core(|tx| {
                    tx.execute("UPDATE gw_connections SET url = 'https://replacement.invalid/new'", [])
                        .unwrap();
                });
            }
            state => {
                rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db"))
                    .unwrap()
                    .execute("UPDATE plugin_registrations SET state = ?1", [state])
                    .unwrap();
            }
        }
        w.core(|tx| {
            assert!(
                w.gateway.plugins().authenticate_in(tx, &w.token, 6).unwrap().is_none(),
                "{fault}: activity denied"
            );
            assert!(
                w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat).is_err(),
                "{fault}: proxy admission denied"
            );
        });
    }
}

#[test]
fn admission_rejects_a_session_moved_or_deleted_after_token_resolution() {
    for deleted in [false, true] {
        let w = registered_world();
        if deleted {
            w.core(|tx| {
                tx.execute("UPDATE sessions SET lifecycle = 'deleted' WHERE id = 'running'", [])
                    .unwrap();
            });
        } else {
            w.core(|tx| {
                tx.execute("UPDATE sessions SET hat_id = 'changed-hat' WHERE id = 'running'", [])
                    .unwrap();
            });
        }
        assert!(
            w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat))
                .is_err()
        );
    }
}

#[tokio::test]
async fn expired_forget_deadline_is_not_reset_and_records_unconfirmed_without_network() {
    let mut upstream = Upstream::start().await;
    let w = registered_at(&upstream.url, true);
    assert!(mutate(&w, "edit").is_err());
    rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db"))
        .unwrap()
        .execute("UPDATE plugin_registrations SET deadline = 0", [])
        .unwrap();
    w.runtime().settle_plugin(&w.id).await.unwrap();
    assert!(
        upstream.seen.try_recv().is_err(),
        "expired total deadline cannot acquire a fresh network wait"
    );
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    assert_eq!(
        raw.query_row("SELECT result FROM plugin_receipts", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "unconfirmed"
    );
    assert_eq!(
        raw.query_row("SELECT deadline FROM plugin_registrations", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[tokio::test]
async fn lifecycle_receipt_classifier_accepts_only_matching_empty_confirmed_receipts() {
    for mode in [
        "confirmed",
        "unconfirmed",
        "wrong-request-id",
        "wrong-rpc-id",
        "wrong-rpc-version",
        "remaining",
        "unknown-field",
        "duplicate-id",
        "invalid-json",
        "wrong-content-type",
        "oversize",
        "http-error",
    ] {
        let mut upstream = Upstream::start_mode(Some(mode)).await;
        let w = registered_at(&upstream.url, true);
        assert!(mutate(&w, "edit").is_err());
        let runtime = w.runtime();
        let id = w.id.clone();
        let task = tokio::spawn(async move { runtime.settle_plugin(&id).await });
        upstream.entered().await;
        upstream.release.add_permits(1);
        task.await.unwrap().unwrap();
        let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
        assert_eq!(
            raw.query_row("SELECT result FROM plugin_receipts", [], |r| r.get::<_, String>(0))
                .unwrap(),
            if mode == "confirmed" {
                "confirmed"
            } else {
                "unconfirmed"
            },
            "{mode}"
        );
    }
}

#[test]
fn terminal_transition_revokes_hash_and_retains_bounded_immutable_snapshot_before_core_edit() {
    let w = registered_world();
    let now = hennery_kernel::secret::unix_now();
    assert!(mutate(&w, "edit").is_err());
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    let (state, hash, deadline, endpoint, secret): (String, Option<String>, i64, String, Vec<u8>) = raw
        .query_row(
            "SELECT state,token_hash,deadline,endpoint,lifecycle FROM plugin_registrations",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .unwrap();
    assert_eq!(state, "terminal");
    assert!(hash.is_none(), "terminal transition physically erases the bearer hash");
    assert!((now + 5..=hennery_kernel::secret::unix_now() + 5).contains(&deadline));
    assert_eq!(endpoint, "https://example.invalid/mcp");
    assert!(!secret.is_empty());
    assert_eq!(w.gateway.connection(&w.id).unwrap().unwrap().url, endpoint);
}

#[test]
fn binding_removal_updates_both_restore_generations_after_core_tombstone() {
    let w = registered_world();
    let key = format!("plugin_generation:{}", w.hat);
    let before = w.core(|tx| {
        tx.query_row("SELECT value FROM settings WHERE key = ?1", [&key], |r| {
            r.get::<_, String>(0)
        })
        .unwrap()
    });
    w.sessions.close_now("running").unwrap();
    w.sessions.delete_session("running", None).unwrap();
    let after = w.core(|tx| {
        tx.query_row("SELECT value FROM settings WHERE key = ?1", [&key], |r| {
            r.get::<_, String>(0)
        })
        .unwrap()
    });
    let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
    let control = raw
        .query_row("SELECT generation FROM plugin_generations", [], |r| {
            r.get::<_, String>(0)
        })
        .unwrap();
    assert_ne!(before, after, "releasing an exposure advances the restore generation");
    assert_eq!(after, control);
}

#[test]
fn conflicting_existing_exposure_cannot_bind_a_session_to_a_second_hat() {
    let w = registered_world();
    rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db"))
        .unwrap()
        .execute("UPDATE plugin_bindings SET hat_id = 'other-hat'", [])
        .unwrap();
    assert!(
        w.core(|tx| w.gateway.plugins().admit_in(tx, &w.id, "running", &w.hat))
            .is_err(),
        "conflicting exposure binding cannot be silently reused"
    );
}

#[tokio::test]
async fn purge_cuts_session_token_watches_and_ordinary_unregistered_connection_work() {
    for fault in [false, true] {
        let mut upstream = Upstream::start().await;
        let w = registered_at(&upstream.url, true);
        let Change::Done(ordinary) = w
            .gateway
            .create(
                &NewConnection {
                    slug: "ordinary".into(),
                    label: "Ordinary".into(),
                    url: "https://ordinary.invalid/mcp".into(),
                    hat_id: w.hat.clone(),
                    cred_kind: CredKind::None,
                    static_header: None,
                    static_prefix: None,
                    tool_allowlist: None,
                    internal_network: false,
                },
                1,
            )
            .unwrap()
        else {
            panic!("connection")
        };
        w.gateway.replace_mounts(&ordinary.id, &["host".into()]).unwrap();
        let ordinary_watch = w.core(|tx| {
            w.gateway
                .plugins()
                .admit_in(tx, &ordinary.id, "running", &w.hat)
                .unwrap()
        });
        let runtime = w.runtime();
        w.core(|tx| {
            hennery_gateway::tokens::mint_in(tx, w.sessions.owner_id(), "running", "host", &w.hat, 5).unwrap();
        });
        let hash = w.core(|tx| {
            tx.query_row(
                "SELECT token_hash FROM gw_session_tokens WHERE revoked_at IS NULL",
                [],
                |r| r.get::<_, String>(0),
            )
            .unwrap()
        });
        let token_watch = runtime.revocations.watch(&hash);
        if fault {
            rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap().execute_batch("CREATE TRIGGER refuse_terminal BEFORE UPDATE ON plugin_registrations BEGIN SELECT RAISE(ABORT,'fault'); END;").unwrap();
        }
        let hat = w.hat.clone();
        let mut task = tokio::spawn(async move { runtime.purge_plugins(&hat).await });
        if !fault {
            upstream.entered().await;
            assert!(!task.is_finished());
        } else {
            assert!((&mut task).await.unwrap().is_err());
        }
        assert!(
            ordinary_watch.token().is_cancelled(),
            "ordinary connection traffic must cut before any registered forget wait or failure"
        );
        assert!(
            token_watch.token().is_cancelled(),
            "durably revoked session token work must cut before remote wait or failure"
        );
        if !fault {
            upstream.release.add_permits(1);
            assert!(task.await.unwrap().is_ok());
        }
    }
}

#[tokio::test]
async fn missing_optional_database_with_core_anchors_denies_all_lifecycle_fallbacks() {
    let World {
        _dir: dir,
        path,
        sessions,
        hosts,
        gateway,
        hat,
        id,
        token,
    } = registered_world();
    drop(sessions);
    drop(hosts);
    drop(gateway);
    std::fs::rename(
        dir.path().join("plugin-control.db"),
        dir.path().join("retired-control.db"),
    )
    .unwrap();
    let gateway = std::sync::Arc::new(GatewayStore::open(&path).unwrap());
    let mut core = hennery_kernel::db::open(&path).unwrap();
    let tx = core.transaction().unwrap();
    assert!(gateway.plugins().authenticate_in(&tx, &token, 6).unwrap().is_none());
    assert!(gateway.plugins().admit_in(&tx, &id, "running", &hat).is_err());
    assert!(gateway.plugins().bound_in(&tx, "running").is_err());
    tx.commit().unwrap();
    assert!(
        gateway.purge_hat(&hat).is_err(),
        "raw purge cannot erase the core anchor without its lifecycle snapshot"
    );
    assert!(
        gateway
            .update(
                &id,
                &hennery_gateway::model::ConnectionPatch {
                    url: Some("https://replacement.invalid/new".into()),
                    ..Default::default()
                },
                6
            )
            .is_err()
    );
    let runtime = hennery_gateway::runtime::Runtime::new(
        gateway,
        std::sync::Arc::new(hennery_gateway::scope::ProxyStore::open(&path).unwrap()),
        std::sync::Arc::new(MasterKey::from_bytes([3; 32])),
        hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
        std::sync::Arc::new(hennery_kernel::push::Push::detached()),
    );
    assert!(
        runtime.recover_plugins().await.is_err(),
        "startup cannot recover by silently treating a restored core as unconfigured"
    );
    assert!(
        !dir.path().join("plugin-control.db").exists(),
        "denial must not fabricate an empty replacement database"
    );
}

#[test]
fn activity_token_classifier_requires_the_exact_prefix_length_and_lower_hex_alphabet() {
    let hex = "0a".repeat(32);
    assert!(hennery_gateway::plugin::is_activity_token(&format!(
        "hnry_activity_{hex}"
    )));
    for invalid in [
        format!("hnry_session_{hex}"),
        format!("HNRY_ACTIVITY_{hex}"),
        format!("hnry_activity_{}", hex.to_uppercase()),
        format!("hnry_activity_{}", &hex[..63]),
        format!("hnry_activity_{hex}0"),
        format!("hnry_activity_{}g", &hex[..63]),
        format!("hnry_activity_{}é", &hex[..62]),
        format!("hnry_activity_{hex}\n"),
    ] {
        assert!(
            !hennery_gateway::plugin::is_activity_token(&invalid),
            "invalid activity bearer shape accepted"
        );
    }
}

#[test]
fn cursor_identity_includes_hat_connection_epoch_and_registration_high_water_mark() {
    let w = registered_world();
    w.core(|tx| {
        let control = w.gateway.plugins();
        let grant = control.authenticate_in(tx, &w.token, 6).unwrap().unwrap();
        let cursor = control.encode_cursor(&grant, grant.start_event).unwrap();
        let old = control.encode_cursor(&grant, grant.start_event - 1).unwrap();
        assert!(
            control.decode_cursor(&grant, &old).is_err(),
            "cursor must not read before registration high water mark"
        );
        for field in ["hat", "connection", "epoch"] {
            let mut changed = control.authenticate_in(tx, &w.token, 6).unwrap().unwrap();
            match field {
                "hat" => changed.hat_id.push('x'),
                "connection" => changed.connection_id.push('x'),
                _ => changed.epoch.push('x'),
            }
            assert!(
                control.decode_cursor(&changed, &cursor).is_err(),
                "cursor identity includes {field}"
            );
        }
    });
}

#[tokio::test]
async fn completed_transition_minimizes_metadata_and_deleted_connection_erases_epoch_anchor() {
    for operation in ["edit", "delete"] {
        let mut upstream = Upstream::start().await;
        let w = registered_at(&upstream.url, true);
        assert!(mutate(&w, operation).is_err());
        upstream.release.add_permits(1);
        w.runtime().settle_plugin(&w.id).await.unwrap();
        upstream.entered().await;
        mutate(&w, operation).unwrap();
        let raw = rusqlite::Connection::open(w.path.parent().unwrap().join("plugin-control.db")).unwrap();
        if operation == "delete" {
            assert_eq!(
                w.core(|tx| tx
                    .query_row(
                        "SELECT count(*) FROM settings WHERE key = ?1",
                        [format!("plugin_epoch:{}", w.id)],
                        |r| r.get::<_, i64>(0)
                    )
                    .unwrap()),
                0,
                "completed deletion removes core epoch anchor"
            );
        } else {
            assert_eq!(raw.query_row("SELECT count(*) FROM plugin_registrations WHERE state = 'complete' AND epoch = '' AND start_event = 0 AND fingerprint = '' AND internal_network = 0 AND intent IS NULL AND result_fingerprint IS NULL AND deadline IS NULL AND endpoint IS NULL AND lifecycle IS NULL AND token_hash IS NULL AND activity = 0 AND startup = 0 AND cursor_key = ''",[],|r|r.get::<_,i64>(0)).unwrap(),1,"completed routing fence retains no namespace snapshot metadata");
        }
    }
}
