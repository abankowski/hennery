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
                Capabilities(vec![Capability::CatalogProbe]),
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
