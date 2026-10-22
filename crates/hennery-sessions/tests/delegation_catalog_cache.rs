//! Catalog sharing at the real collector hub request/reply boundary.
use hennery_kernel::{
    hosts::{Enrollment, Hosts},
    operator::Operator,
};
use hennery_proto::{
    delegation_host::{CatalogFreshness, HostCatalog, SecurityClassification},
    frames::{AgentIsolation, Capabilities, Capability, CollectorFrame, HostFrame, McpIsolation, SessionConfig},
};
use hennery_sessions::{AppState, store::Store};
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};
use std::time::{Duration, SystemTime};
use tokio::sync::mpsc;

struct World {
    _dir: tempfile::TempDir,
    state: Arc<AppState>,
    hat: String,
    connection: u64,
    receiver: mpsc::UnboundedReceiver<CollectorFrame>,
}
impl World {
    fn new() -> Self {
        Self::with_capabilities(Capabilities(vec![
            Capability::CatalogProbe,
            Capability::CatalogProbeCancel,
        ]))
    }

    fn with_capabilities(capabilities: Capabilities) -> Self {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let hosts = Hosts::open(&db).unwrap();
        hosts
            .register(
                "host",
                &Enrollment {
                    public_key: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a".into(),
                    name: "fixture".into(),
                    host_version: "0".into(),
                    platform: "linux".into(),
                },
                1,
            )
            .unwrap();
        let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
        let state = Arc::new(AppState::new(
            Store::open(&db).unwrap(),
            hosts,
            Operator::open(&db).unwrap(),
        ));
        let (sender, receiver) = mpsc::unbounded_channel();
        let registration = state
            .hub
            .register(
                "host",
                sender,
                capabilities,
                AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
            )
            .unwrap();
        state.hub.mark_ready("host", registration.conn_id);
        Self {
            _dir: dir,
            state,
            hat,
            connection: registration.conn_id,
            receiver,
        }
    }
}
fn catalog() -> HostCatalog {
    HostCatalog {
        saved_at: None,
        agent: "claude".into(),
        adapter_revision: "pin".into(),
        config_options: vec![],
        defaults: SessionConfig::default(),
        security: SecurityClassification {
            known: true,
            axes: Default::default(),
        },
        freshness: CatalogFreshness::Fresh,
    }
}

#[tokio::test]
async fn independent_catalog_keys_progress_while_another_probe_is_waiting() {
    let mut world = World::new();
    let state = world.state.clone();
    let hat = world.hat.clone();
    let first = tokio::spawn(async move {
        state
            .catalogs
            .get_for_spawn(&state, "host", &hat, "/first", "claude")
            .await
    });
    let CollectorFrame::ProbeCatalog {
        request_id: first_id, ..
    } = world.receiver.recv().await.unwrap()
    else {
        panic!("first probe")
    };
    let state = world.state.clone();
    let hat = world.hat.clone();
    let second = tokio::spawn(async move {
        state
            .catalogs
            .get_for_spawn(&state, "host", &hat, "/second", "claude")
            .await
    });
    let frame = tokio::time::timeout(Duration::from_secs(5), world.receiver.recv())
        .await
        .expect("independent key must not wait for first probe")
        .unwrap();
    let CollectorFrame::ProbeCatalog { request_id, .. } = frame else {
        panic!("second probe")
    };
    world.state.hub.probe_reply(
        "host",
        world.connection,
        HostFrame::Catalog {
            request_id,
            catalog: catalog(),
        },
    );
    assert!(second.await.unwrap().is_ok());
    world.state.hub.probe_reply(
        "host",
        world.connection,
        HostFrame::Catalog {
            request_id: first_id,
            catalog: catalog(),
        },
    );
    assert!(first.await.unwrap().is_ok());
    assert!(
        world.receiver.try_recv().is_err(),
        "completed probes must not send cancellation"
    );
}

#[tokio::test]
async fn dropping_the_last_catalog_waiter_sends_cancel_on_its_connection() {
    let mut world = World::new();
    let state = world.state.clone();
    let hat = world.hat.clone();
    let request = tokio::spawn(async move {
        state
            .catalogs
            .get_for_spawn(&state, "host", &hat, "/project", "claude")
            .await
    });
    let CollectorFrame::ProbeCatalog { request_id, .. } = world.receiver.recv().await.unwrap() else {
        panic!("probe")
    };
    request.abort();
    assert!(request.await.unwrap_err().is_cancelled());
    assert_eq!(
        tokio::time::timeout(Duration::from_secs(5), world.receiver.recv())
            .await
            .unwrap()
            .unwrap(),
        CollectorFrame::CancelCatalogProbe { request_id },
    );
}

#[tokio::test]
async fn legacy_catalog_host_never_receives_an_unadvertised_cancel() {
    let mut world = World::with_capabilities(Capabilities(vec![Capability::CatalogProbe]));
    let state = world.state.clone();
    let hat = world.hat.clone();
    let request = tokio::spawn(async move {
        state
            .catalogs
            .get_for_spawn(&state, "host", &hat, "/project", "claude")
            .await
    });
    let CollectorFrame::ProbeCatalog { request_id, .. } = world.receiver.recv().await.unwrap() else {
        panic!("legacy host still supports discovery")
    };
    request.abort();
    assert!(request.await.unwrap_err().is_cancelled());
    assert!(world.receiver.try_recv().is_err(), "legacy host cannot cancel early");
    // A legacy host may finish at its own timeout; its late response is harmless.
    world.state.hub.probe_reply(
        "host",
        world.connection,
        HostFrame::Catalog {
            request_id,
            catalog: catalog(),
        },
    );
    assert!(world.receiver.try_recv().is_err());
}

#[tokio::test]
async fn dropping_one_shared_catalog_waiter_keeps_the_remaining_waiter_alive() {
    let mut world = World::new();
    let state = world.state.clone();
    let hat = world.hat.clone();
    let first = tokio::spawn(async move {
        state
            .catalogs
            .get_for_spawn(&state, "host", &hat, "/project", "claude")
            .await
    });
    let CollectorFrame::ProbeCatalog { request_id, .. } = world.receiver.recv().await.unwrap() else {
        panic!("probe")
    };
    let state = world.state.clone();
    let second = state
        .catalogs
        .get_for_spawn(&state, "host", &world.hat, "/project", "claude");
    tokio::pin!(second);
    // Poll the second real caller into the in-flight future before cancelling
    // the first. No timing sleep stands in for the second waiter joining.
    assert!(futures::poll!(second.as_mut()).is_pending());
    first.abort();
    assert!(first.await.unwrap_err().is_cancelled());
    assert!(
        world.receiver.try_recv().is_err(),
        "another caller still waits for this probe"
    );
    state.hub.probe_reply(
        "host",
        world.connection,
        HostFrame::Catalog {
            request_id,
            catalog: catalog(),
        },
    );
    assert_eq!(second.await.unwrap().freshness, CatalogFreshness::Fresh);
    assert!(world.receiver.try_recv().is_err(), "shared discovery must not restart");
}

#[test]
fn persistent_catalog_survives_restart_and_never_authorizes_delegation() {
    let world = World::new();
    let mut fresh = catalog();
    fresh.config_options =
        vec![serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}]})];
    fresh.defaults.model = Some("small".into());
    world
        .state
        .store
        .save_runtime_catalog("host", &world.hat, "/project", &fresh)
        .unwrap();
    let reopened = Store::open(&world._dir.path().join("hennery.db")).unwrap();
    let saved = reopened
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(saved.freshness, CatalogFreshness::Cached);
    assert!(saved.saved_at.is_some());
    assert_eq!(saved.config_options, fresh.config_options);
    assert!(hennery_sessions::delegation_runtime::config_offered(
        &fresh,
        &fresh.defaults
    ));
    assert!(!hennery_sessions::delegation_runtime::config_offered(
        &saved,
        &fresh.defaults
    ));
    let evidence = hennery_proto::delegation_host::ConfigEvidence {
        attach_generation: 1,
        config_revision: 1,
        completeness: hennery_proto::delegation_host::ConfigCompleteness::Complete,
        actual: fresh.defaults.clone(),
    };
    assert!(hennery_sessions::delegation_runtime::evidence_satisfies(
        &evidence,
        1,
        &fresh.defaults,
        &fresh
    ));
    assert!(!hennery_sessions::delegation_runtime::evidence_satisfies(
        &evidence,
        1,
        &fresh.defaults,
        &saved
    ));
    for (cwd, agent) in [("/another", "claude"), ("/project", "codex")] {
        assert_eq!(
            reopened
                .saved_runtime_catalog("host", &world.hat, cwd, agent)
                .unwrap()
                .freshness,
            CatalogFreshness::Unknown
        );
    }
    assert!(
        reopened
            .saved_runtime_catalog("host", "another-hat", "/project", "claude")
            .is_err()
    );
    let mut other_revision = fresh.clone();
    other_revision.adapter_revision = "new-pin".into();
    reopened
        .save_runtime_catalog("host", &world.hat, "/project", &other_revision)
        .unwrap();
    reopened
        .save_runtime_catalog("host", &world.hat, "/project", &fresh)
        .unwrap();
    assert_eq!(
        reopened
            .saved_runtime_catalog("host", &world.hat, "/project", "claude")
            .unwrap()
            .adapter_revision,
        "pin",
        "latest observation wins even when an older revision returns in the same second"
    );
    let conn = rusqlite::Connection::open(world._dir.path().join("hennery.db")).unwrap();
    let revisions: i64 = conn
        .query_row(
            "SELECT count(*) FROM runtime_catalog WHERE agent='claude' AND cwd='/project'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(revisions, 1, "obsolete adapter revisions must be pruned on insert");
}

#[test]
fn cached_catalog_never_satisfies_current_attach_evidence() {
    let mut snapshot = catalog();
    let evidence = hennery_proto::delegation_host::ConfigEvidence {
        attach_generation: 1,
        config_revision: 1,
        completeness: hennery_proto::delegation_host::ConfigCompleteness::Complete,
        actual: SessionConfig::default(),
    };
    assert!(hennery_sessions::delegation_runtime::evidence_satisfies(
        &evidence,
        1,
        &SessionConfig::default(),
        &snapshot
    ));
    snapshot.freshness = CatalogFreshness::Cached;
    assert!(!hennery_sessions::delegation_runtime::evidence_satisfies(
        &evidence,
        1,
        &SessionConfig::default(),
        &snapshot
    ));
}

#[tokio::test]
async fn concurrent_signed_out_spawns_share_one_failed_probe() {
    let world = World::new();
    let count = Arc::new(AtomicUsize::new(0));
    let host = {
        let state = world.state.clone();
        let connection = world.connection;
        let count = count.clone();
        let mut receiver = world.receiver;
        tokio::spawn(async move {
            while let Some(frame) = receiver.recv().await {
                let CollectorFrame::ProbeCatalog { request_id, .. } = frame else {
                    panic!("expected probe")
                };
                count.fetch_add(1, Ordering::SeqCst);
                assert!(
                    state
                        .hub
                        .probe_rejected(connection, &request_id, "auth_required", "Authentication required")
                );
            }
        })
    };
    let requests = (0..8).map(|_| {
        world
            .state
            .catalogs
            .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
    });
    for result in futures::future::join_all(requests).await {
        assert_eq!(result.unwrap_err().to_string(), "auth_required");
    }
    host.abort();
    assert_eq!(count.load(Ordering::SeqCst), 1, "one failure must serve all waiters");
}

#[tokio::test]
async fn concurrent_spawns_share_one_successful_probe() {
    let world = World::new();
    let count = Arc::new(AtomicUsize::new(0));
    let host = {
        let state = world.state.clone();
        let connection = world.connection;
        let count = count.clone();
        let mut receiver = world.receiver;
        tokio::spawn(async move {
            while let Some(frame) = receiver.recv().await {
                let CollectorFrame::ProbeCatalog { request_id, .. } = frame else {
                    panic!("expected probe")
                };
                count.fetch_add(1, Ordering::SeqCst);
                state.hub.probe_reply(
                    "host",
                    connection,
                    HostFrame::Catalog {
                        request_id,
                        catalog: catalog(),
                    },
                );
            }
        })
    };
    let requests = (0..8).map(|_| {
        world
            .state
            .catalogs
            .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
    });
    for result in futures::future::join_all(requests).await {
        assert_eq!(result.unwrap(), catalog());
    }
    host.abort();
    assert_eq!(count.load(Ordering::SeqCst), 1);
}

struct Host {
    count: Arc<AtomicUsize>,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for Host {
    fn drop(&mut self) {
        self.task.abort();
    }
}
fn serve(
    state: Arc<AppState>,
    connection: u64,
    mut receiver: mpsc::UnboundedReceiver<CollectorFrame>,
    answer: impl Fn(usize) -> Result<HostCatalog, &'static str> + Send + 'static,
) -> Host {
    let count = Arc::new(AtomicUsize::new(0));
    let calls = count.clone();
    let task = tokio::spawn(async move {
        while let Some(frame) = receiver.recv().await {
            let CollectorFrame::ProbeCatalog { request_id, .. } = frame else {
                panic!("expected probe")
            };
            match answer(calls.fetch_add(1, Ordering::SeqCst)) {
                Ok(catalog) => state
                    .hub
                    .probe_reply("host", connection, HostFrame::Catalog { request_id, catalog }),
                Err(code) => assert!(
                    state
                        .hub
                        .probe_rejected(connection, &request_id, code, "fixture refusal")
                ),
            }
        }
    });
    Host { count, task }
}

#[tokio::test(start_paused = true)]
async fn independent_tool_retries_probe_again_after_a_shared_auth_failure() {
    for spawn in [false, true] {
        let world = World::new();
        let host = serve(world.state.clone(), world.connection, world.receiver, |index| {
            if index == 0 {
                Err("auth_required")
            } else {
                Ok(catalog())
            }
        });
        let error = world
            .state
            .catalogs
            .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
            .await
            .unwrap_err();
        assert_eq!(error.to_string(), "auth_required");
        tokio::time::advance(Duration::from_millis(1)).await;
        let retried = if spawn {
            world
                .state
                .catalogs
                .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
                .await
        } else {
            world
                .state
                .catalogs
                .get(&world.state, "host", &world.hat, "/project", "claude")
                .await
        };
        assert_eq!(retried.unwrap(), catalog());
        assert_eq!(
            host.count.load(Ordering::SeqCst),
            2,
            "independent retries must observe live sign-in/catalog changes"
        );
    }
}

#[tokio::test]
async fn attach_reuses_only_a_catalog_captured_after_its_operation_was_accepted() {
    let world = World::new();
    let host = serve(world.state.clone(), world.connection, world.receiver, |_| Ok(catalog()));
    let admitted = SystemTime::now();
    world
        .state
        .catalogs
        .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
        .await
        .unwrap();
    world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
        .await
        .unwrap();
    assert_eq!(
        host.count.load(Ordering::SeqCst),
        1,
        "the operation's preflight must authorize its attach"
    );
    let later_operation = SystemTime::now();
    world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", later_operation)
        .await
        .unwrap();
    assert_eq!(
        host.count.load(Ordering::SeqCst),
        2,
        "an earlier operation's catalog is only a preview for this one"
    );
}

#[tokio::test(start_paused = true)]
async fn attach_reprobes_after_the_positive_catalog_ttl() {
    let world = World::new();
    let host = serve(world.state.clone(), world.connection, world.receiver, |_| Ok(catalog()));
    let admitted = SystemTime::now();
    world
        .state
        .catalogs
        .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
        .await
        .unwrap();
    tokio::time::advance(Duration::from_secs(31)).await;
    world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
        .await
        .unwrap();
    assert_eq!(host.count.load(Ordering::SeqCst), 2);
}

#[tokio::test]
async fn attach_cannot_authorize_from_an_unknown_catalog_even_after_admission() {
    let world = World::new();
    let host = serve(world.state.clone(), world.connection, world.receiver, |index| {
        let mut catalog = catalog();
        if index == 0 {
            catalog.freshness = CatalogFreshness::Unknown;
        }
        Ok(catalog)
    });
    let admitted = SystemTime::now();
    let preview = world
        .state
        .catalogs
        .get(&world.state, "host", &world.hat, "/project", "claude")
        .await
        .unwrap();
    assert_eq!(preview.freshness, CatalogFreshness::Unknown);
    let attached = world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
        .await
        .unwrap_err();
    assert_eq!(attached.to_string(), "catalog_unavailable");
    assert_eq!(host.count.load(Ordering::SeqCst), 1);
}

#[tokio::test(start_paused = true)]
async fn attach_retries_for_the_same_operation_share_a_negative_catalog_for_five_seconds() {
    let world = World::new();
    let host = serve(world.state.clone(), world.connection, world.receiver, |index| {
        if index == 0 {
            Err("auth_required")
        } else {
            Ok(catalog())
        }
    });
    let admitted = SystemTime::now();
    let result = world
        .state
        .catalogs
        .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
        .await;
    assert_eq!(result.unwrap_err().to_string(), "auth_required");
    tokio::time::advance(Duration::from_secs(4)).await;
    let result = world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
        .await;
    assert_eq!(result.unwrap_err().to_string(), "auth_required");
    assert_eq!(
        host.count.load(Ordering::SeqCst),
        1,
        "the same operation must retain its short failure backoff"
    );
    tokio::time::advance(Duration::from_secs(2)).await;
    assert_eq!(
        world
            .state
            .catalogs
            .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
            .await
            .unwrap(),
        catalog()
    );
    assert_eq!(host.count.load(Ordering::SeqCst), 2, "negative backoff must expire");
}

#[tokio::test]
async fn cached_success_and_failure_cannot_escape_a_revoked_scope() {
    for signed_in in [false, true] {
        let world = World::new();
        let host = serve(world.state.clone(), world.connection, world.receiver, move |_| {
            if signed_in { Ok(catalog()) } else { Err("auth_required") }
        });
        let admitted = SystemTime::now();
        let result = world
            .state
            .catalogs
            .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
            .await;
        assert_eq!(result.is_ok(), signed_in);
        world.state.hosts.revoke("host", 2).unwrap();
        let result = world
            .state
            .catalogs
            .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
            .await;
        assert_eq!(result.unwrap_err().to_string(), "not_found");
        assert_eq!(host.count.load(Ordering::SeqCst), 1);
    }
}

#[tokio::test]
async fn reconnect_never_reuses_a_previous_connections_success_or_failure() {
    for signed_in in [false, true] {
        let world = World::new();
        let old_host = serve(world.state.clone(), world.connection, world.receiver, move |_| {
            if signed_in { Ok(catalog()) } else { Err("auth_required") }
        });
        let admitted = SystemTime::now();
        let result = world
            .state
            .catalogs
            .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
            .await;
        assert_eq!(result.is_ok(), signed_in);
        world.state.hub.unregister("host", world.connection);
        let (sender, receiver) = mpsc::unbounded_channel();
        let registration = world
            .state
            .hub
            .register(
                "host",
                sender,
                Capabilities(vec![Capability::CatalogProbe]),
                AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
            )
            .unwrap();
        world.state.hub.mark_ready("host", registration.conn_id);
        let new_host = serve(world.state.clone(), registration.conn_id, receiver, |_| {
            let mut catalog = catalog();
            catalog.adapter_revision = "new-connection".into();
            Ok(catalog)
        });
        let attached = world
            .state
            .catalogs
            .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
            .await
            .unwrap();
        assert_eq!(attached.adapter_revision, "new-connection");
        assert_eq!(old_host.count.load(Ordering::SeqCst), 1);
        assert_eq!(new_host.count.load(Ordering::SeqCst), 1);
    }
}

#[tokio::test(start_paused = true)]
async fn unknown_catalog_is_a_short_lived_attach_failure_and_remains_an_agent_preview() {
    let world = World::new();
    let host = serve(world.state.clone(), world.connection, world.receiver, |index| {
        let mut catalog = catalog();
        if index == 0 {
            catalog.freshness = CatalogFreshness::Unknown;
        }
        Ok(catalog)
    });
    let admitted = SystemTime::now();
    let requests = (0..8).map(|_| {
        world
            .state
            .catalogs
            .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
    });
    for result in futures::future::join_all(requests).await {
        assert_eq!(result.unwrap_err().to_string(), "catalog_unavailable");
    }
    for _ in 0..3 {
        tokio::time::advance(Duration::from_secs(1)).await;
        let result = world
            .state
            .catalogs
            .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
            .await;
        assert_eq!(result.unwrap_err().to_string(), "catalog_unavailable");
    }
    assert_eq!(host.count.load(Ordering::SeqCst), 1);
    let preview = world
        .state
        .catalogs
        .get(&world.state, "host", &world.hat, "/project", "claude")
        .await
        .unwrap();
    assert_eq!(preview.freshness, CatalogFreshness::Unknown);
    tokio::time::advance(Duration::from_secs(3)).await;
    let result = world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
        .await
        .unwrap();
    assert_eq!(result.freshness, CatalogFreshness::Fresh);
    assert_eq!(host.count.load(Ordering::SeqCst), 2);
}

async fn earlier_failure_cannot_block_a_new_attach(signed_out: bool) {
    let world = World::new();
    let host = serve(world.state.clone(), world.connection, world.receiver, move |index| {
        if index == 0 && signed_out {
            return Err("auth_required");
        }
        let mut catalog = catalog();
        if index == 0 {
            catalog.freshness = CatalogFreshness::Unknown;
        }
        Ok(catalog)
    });
    let earlier = world
        .state
        .catalogs
        .get_for_spawn(&world.state, "host", &world.hat, "/project", "claude")
        .await;
    if signed_out {
        assert_eq!(earlier.unwrap_err().to_string(), "auth_required");
    } else {
        assert_eq!(earlier.unwrap().freshness, CatalogFreshness::Unknown);
    }
    // The runtime becomes usable before a later operation is admitted. That
    // operation must not inherit the earlier operation's cached refusal.
    let admitted = SystemTime::now();
    let attached = world
        .state
        .catalogs
        .get_for_attach(&world.state, "host", &world.hat, "/project", "claude", admitted)
        .await
        .unwrap();
    assert_eq!(attached.freshness, CatalogFreshness::Fresh);
    assert_eq!(host.count.load(Ordering::SeqCst), 2);
}

#[tokio::test]
async fn older_auth_failure_cannot_block_a_newly_admitted_attach_after_sign_in() {
    earlier_failure_cannot_block_a_new_attach(true).await;
}

#[tokio::test]
async fn older_unknown_catalog_cannot_block_a_newly_admitted_attach() {
    earlier_failure_cannot_block_a_new_attach(false).await;
}
fn review_started(options: Vec<serde_json::Value>, identity: bool) -> hennery_proto::frames::SessionBody {
    use hennery_proto::{
        delegation_host::CatalogIdentity,
        frames::{Indexed, SessionBody},
    };
    SessionBody::SessionStarted {
        request_id: "start".into(),
        agent_session_id: "agent-session".into(),
        agent_home: None,
        indexed: Indexed {
            config_options: Some(options),
            current_model: Some("small".into()),
            catalog_identity: identity.then(|| {
                Box::new(CatalogIdentity {
                    adapter_revision: "pin".into(),
                    agent_defaults: None,
                    security: SecurityClassification {
                        known: false,
                        axes: Default::default(),
                    },
                })
            }),
            ..Default::default()
        },
    }
}

#[test]
fn delegated_identity_never_supplies_agent_defaults_even_for_detached_edges() {
    for known in [false, true] {
        for detached in [false, true] {
            let world = World::new();
            let option = serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"},{"value":"large"}]});
            for id in ["parent", "child"] {
                world
                    .state
                    .store
                    .create_session(id, "host", "claude", "/project", &world.hat, None)
                    .unwrap();
            }
            world
                .state
                .store
                .ingest("parent", 1, &review_started(vec![option.clone()], true))
                .unwrap();
            let conn = rusqlite::Connection::open(world._dir.path().join("hennery.db")).unwrap();
            conn.execute("INSERT INTO session_families(owner_id,child_id,parent_id,root_id,hat_id,created_event_id,detached) VALUES(?1,'child','parent','parent',?2,0,?3)", rusqlite::params![world.state.store.owner_id(), world.hat, detached]).unwrap();
            let expected = if known {
                SessionConfig {
                    model: Some("small".into()),
                    mode: Some("default".into()),
                    ..Default::default()
                }
            } else {
                SessionConfig::default()
            };
            if known {
                world
                    .state
                    .store
                    .save_runtime_catalog(
                        "host",
                        &world.hat,
                        "/project",
                        &HostCatalog {
                            config_options: vec![option.clone()],
                            defaults: expected.clone(),
                            ..catalog()
                        },
                    )
                    .unwrap();
            }
            let mut forged = review_started(vec![option.clone()], true);
            let hennery_proto::frames::SessionBody::SessionStarted { indexed, .. } = &mut forged else {
                unreachable!()
            };
            indexed.catalog_identity.as_mut().unwrap().agent_defaults = Some(SessionConfig {
                model: Some("large".into()),
                mode: Some("bypassPermissions".into()),
                ..Default::default()
            });
            world.state.store.ingest("child", 1, &forged).unwrap();
            let saved = world
                .state
                .store
                .saved_runtime_catalog("host", &world.hat, "/project", "claude")
                .unwrap();
            assert_eq!(saved.defaults, expected, "known={known}, detached={detached}");
            assert_eq!(saved.config_options, vec![option]);
        }
    }
}

#[test]
fn deleting_baseline_source_clears_defaults_when_options_source_is_null() {
    let world = World::new();
    world
        .state
        .store
        .create_session("baseline", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    let mut started = review_started(
        vec![
            serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"},{"value":"large"}]}),
        ],
        true,
    );
    let hennery_proto::frames::SessionBody::SessionStarted { indexed, .. } = &mut started else {
        unreachable!()
    };
    indexed.catalog_identity.as_mut().unwrap().agent_defaults = Some(SessionConfig {
        model: Some("large".into()),
        ..Default::default()
    });
    world.state.store.ingest("baseline", 1, &started).unwrap();
    let conn = rusqlite::Connection::open(world._dir.path().join("hennery.db")).unwrap();
    conn.execute(
        "UPDATE runtime_catalog SET source_session_id=NULL WHERE owner_id=?1 AND defaults_source_session_id='baseline'",
        [world.state.store.owner_id()],
    )
    .unwrap();
    let before = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(before.defaults.model.as_deref(), Some("large"));
    world.state.store.close_now("baseline").unwrap();
    world.state.store.delete_session("baseline", None).unwrap();
    let after = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(after.config_options, before.config_options);
    assert!(
        after.defaults.is_empty(),
        "a NULL options source must not preserve a deleted baseline"
    );
}

#[test]
fn session_without_pre_switch_values_keeps_baseline_unknown_or_preserves_refresh() {
    let world = World::new();
    world
        .state
        .store
        .create_session("session", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    let option = serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"},{"value":"large"}]});
    world
        .state
        .store
        .ingest("session", 1, &review_started(vec![option.clone()], true))
        .unwrap();
    let unknown = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(
        unknown.defaults,
        SessionConfig::default(),
        "current session settings are not a baseline"
    );
    let baseline = HostCatalog {
        config_options: vec![option.clone()],
        defaults: SessionConfig {
            model: Some("large".into()),
            ..Default::default()
        },
        ..catalog()
    };
    world
        .state
        .store
        .save_runtime_catalog("host", &world.hat, "/project", &baseline)
        .unwrap();
    world
        .state
        .store
        .create_session("later-attach", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    world
        .state
        .store
        .ingest("later-attach", 1, &review_started(vec![option], true))
        .unwrap();
    let retained = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(
        retained.defaults, baseline.defaults,
        "resume/restart must preserve the known baseline"
    );
    let mut changed = review_started(retained.config_options, true);
    let hennery_proto::frames::SessionBody::SessionStarted { indexed, .. } = &mut changed else {
        unreachable!()
    };
    indexed.catalog_identity.as_mut().unwrap().adapter_revision = "new-pin".into();
    world
        .state
        .store
        .create_session("changed-revision", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    world.state.store.ingest("changed-revision", 1, &changed).unwrap();
    let changed = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert!(
        changed.defaults.is_empty(),
        "a changed revision cannot borrow the previous baseline"
    );
}

#[test]
fn deleting_baseline_source_preserves_another_sessions_options_but_forgets_its_defaults() {
    let world = World::new();
    let option = serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"},{"value":"large"}]});
    let mut started = review_started(vec![option.clone()], true);
    let hennery_proto::frames::SessionBody::SessionStarted { indexed, .. } = &mut started else {
        unreachable!()
    };
    indexed.catalog_identity = Some(Box::new(
        serde_json::from_value(serde_json::json!({
            "adapter_revision":"pin", "security":{"known":false,"axes":{}},
            "agent_defaults":{"model":"large"}
        }))
        .unwrap(),
    ));
    for id in ["baseline-source", "options-source"] {
        world
            .state
            .store
            .create_session(id, "host", "claude", "/project", &world.hat, None)
            .unwrap();
    }
    world.state.store.ingest("baseline-source", 1, &started).unwrap();
    world
        .state
        .store
        .ingest("options-source", 1, &review_started(vec![option], true))
        .unwrap();
    let before = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(before.defaults.model.as_deref(), Some("large"));
    world.state.store.close_now("baseline-source").unwrap();
    world.state.store.delete_session("baseline-source", None).unwrap();
    let after = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(after.freshness, CatalogFreshness::Cached);
    assert_eq!(after.config_options, before.config_options);
    assert!(after.defaults.is_empty(), "deleted source's baseline must be forgotten");
}

#[test]
fn review_preview_limits_must_not_reject_real_session_started() {
    for large_description in [false, true] {
        let world = World::new();
        let option =
            serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}]});
        let options = if large_description {
            let mut option = option;
            option["description"] = serde_json::json!("x".repeat(270_000));
            vec![option]
        } else {
            vec![option; 129]
        };
        for (id, identity) in [("legacy", false), ("new", true)] {
            world
                .state
                .store
                .create_session(id, "host", "claude", "/project", &world.hat, None)
                .unwrap();
            let result = world
                .state
                .store
                .ingest(id, 1, &review_started(options.clone(), identity));
            assert!(
                result.is_ok(),
                "real session ingest rejected (identity={identity}, large_description={large_description}): {result:?}"
            );
            assert_eq!(
                world.state.store.catalog(id).unwrap().unwrap().config_options.len(),
                options.len()
            );
            assert_eq!(
                world
                    .state
                    .store
                    .saved_runtime_catalog("host", &world.hat, "/project", "claude")
                    .unwrap()
                    .freshness,
                CatalogFreshness::Unknown
            );
        }
    }
}

#[test]
fn oversized_preview_bytes_must_not_reject_real_session_started() {
    let world = World::new();
    world
        .state
        .store
        .create_session("session", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    let option = serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}],"description":"x".repeat(270_000)});
    let result = world
        .state
        .store
        .ingest("session", 1, &review_started(vec![option], true));
    assert!(
        result.is_ok(),
        "preview size must not reject a durable session: {result:?}"
    );
    assert_eq!(
        world
            .state
            .store
            .saved_runtime_catalog("host", &world.hat, "/project", "claude")
            .unwrap()
            .freshness,
        CatalogFreshness::Unknown
    );
}

#[test]
fn oversized_preview_revision_must_not_reject_real_session_started() {
    let world = World::new();
    world
        .state
        .store
        .create_session("session", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    let mut started = review_started(
        vec![serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}]})],
        true,
    );
    if let hennery_proto::frames::SessionBody::SessionStarted { indexed, .. } = &mut started {
        indexed.catalog_identity.as_mut().unwrap().adapter_revision = "x".repeat(257);
    }
    let result = world.state.store.ingest("session", 1, &started);
    assert!(
        result.is_ok(),
        "preview revision must not reject a durable session: {result:?}"
    );
    assert_eq!(
        world
            .state
            .store
            .saved_runtime_catalog("host", &world.hat, "/project", "claude")
            .unwrap()
            .freshness,
        CatalogFreshness::Unknown
    );
}

#[test]
fn review_delete_must_remove_last_sessions_derived_catalog() {
    let world = World::new();
    world
        .state
        .store
        .create_session("session", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    world.state.store.ingest("session", 1, &review_started(vec![serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}],"description":"private-project-config"})], true)).unwrap();
    world.state.store.close_now("session").unwrap();
    world.state.store.delete_session("session", None).unwrap();
    let remaining = world
        .state
        .store
        .saved_runtime_catalog("host", &world.hat, "/project", "claude")
        .unwrap();
    assert_eq!(
        remaining.freshness,
        CatalogFreshness::Unknown,
        "deleted session catalog remains: {remaining:?}"
    );
}

#[test]
fn deleting_a_session_preserves_independent_refresh_and_other_scopes() {
    let world = World::new();
    let hosts = Hosts::open(&world._dir.path().join("hennery.db")).unwrap();
    hosts
        .register(
            "other-host",
            &Enrollment {
                public_key: "3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c".into(),
                name: "other".into(),
                host_version: "0".into(),
                platform: "linux".into(),
            },
            1,
        )
        .unwrap();
    let hennery_kernel::hats::HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else {
        panic!("hat")
    };
    let mut fresh = catalog();
    fresh.config_options =
        vec![serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}]})];
    for revision in ["old-pin", "new-pin"] {
        fresh.adapter_revision = revision.into();
        for (cwd, agent) in [("/project", "claude"), ("/other", "claude"), ("/project", "codex")] {
            fresh.agent = agent.into();
            world
                .state
                .store
                .save_runtime_catalog("host", &world.hat, cwd, &fresh)
                .unwrap();
        }
        fresh.agent = "claude".into();
        world
            .state
            .store
            .save_runtime_catalog("other-host", &world.hat, "/project", &fresh)
            .unwrap();
        hosts.update_host("host", None, Some(&other.id)).unwrap();
        world
            .state
            .store
            .save_runtime_catalog("host", &other.id, "/project", &fresh)
            .unwrap();
        hosts.update_host("host", None, Some(&world.hat)).unwrap();
    }
    world
        .state
        .store
        .create_session("session", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    world.state.store.close_now("session").unwrap();
    world.state.store.delete_session("session", None).unwrap();
    let db = rusqlite::Connection::open(world._dir.path().join("hennery.db")).unwrap();
    let rows: Vec<(String, String, String)> = db
        .prepare("SELECT cwd,agent,adapter_revision FROM runtime_catalog WHERE host_id='host' AND hat_id=?1 ORDER BY cwd,agent,adapter_revision")
        .unwrap()
        .query_map([&world.hat], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .unwrap()
        .collect::<rusqlite::Result<_>>()
        .unwrap();
    assert_eq!(
        rows,
        vec![
            ("/other".into(), "claude".into(), "new-pin".into()),
            ("/project".into(), "claude".into(), "new-pin".into()),
            ("/project".into(), "codex".into(), "new-pin".into()),
        ],
        "all independent Refresh rows remain, with only their latest revision"
    );
    assert_eq!(
        db.query_row("SELECT count(*) FROM runtime_catalog", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        5,
        "other host and hat snapshots must remain too"
    );
}

#[test]
fn deleting_a_reassigned_session_also_removes_its_original_preview() {
    let world = World::new();
    // A real session must replace the provenance of an existing Refresh row,
    // including when the revision stays the same.
    let mut refreshed = catalog();
    refreshed.config_options =
        vec![serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}]})];
    world
        .state
        .store
        .save_runtime_catalog("host", &world.hat, "/project", &refreshed)
        .unwrap();
    let hosts = Hosts::open(&world._dir.path().join("hennery.db")).unwrap();
    let hennery_kernel::hats::HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else {
        panic!("hat")
    };
    world
        .state
        .store
        .create_session("session", "host", "claude", "/project", &world.hat, None)
        .unwrap();
    world.state.store.ingest("session", 1, &review_started(vec![serde_json::json!({"id":"model","type":"select","currentValue":"small","options":[{"value":"small"}]})], true)).unwrap();
    world.state.store.close_now("session").unwrap();
    assert!(matches!(
        world.state.store.reassign_hat("session", &other.id).unwrap(),
        hennery_sessions::store::Reassign::Done(_)
    ));
    world.state.store.delete_session("session", None).unwrap();
    assert_eq!(
        world
            .state
            .store
            .saved_runtime_catalog("host", &world.hat, "/project", "claude")
            .unwrap()
            .freshness,
        CatalogFreshness::Unknown
    );
}
