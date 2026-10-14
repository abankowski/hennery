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
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    let sessions = Store::open(&path).unwrap();
    let hosts = Hosts::open(&path).unwrap();
    let gateway = std::sync::Arc::new(GatewayStore::open(&path).unwrap());
    let hat = hosts.default_hat_for_new_hosts().unwrap();
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
                url: "https://example.invalid/mcp".into(),
                hat_id: hat.clone(),
                cred_kind: CredKind::Static,
                static_header: None,
                static_prefix: None,
                tool_allowlist: Some(vec!["search".into()]),
                internal_network: false,
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
