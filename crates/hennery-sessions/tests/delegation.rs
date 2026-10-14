use hennery_gateway::api::GatewayState;
use hennery_gateway::identity::SessionIdentity;
use hennery_gateway::key::MasterKey;
use hennery_gateway::scope::ProxyStore;
use hennery_gateway::session::GatewayMcp;
use hennery_gateway::store::GatewayStore;
use hennery_kernel::hats::HatChange;
use hennery_kernel::hosts::{Enrollment, Hosts};
use hennery_kernel::operator::{Operator, SetupOutcome};
use hennery_kernel::secret::unix_now;
use hennery_proto::frames::{McpIsolation, McpServer, SessionBody};
use hennery_sessions::store::{McpContext, Store};
use std::sync::Arc;
struct World {
    _dir: tempfile::TempDir,
    db: std::path::PathBuf,
    store: Store,
    gateway: Arc<GatewayStore>,
    hat: String,
    other: String,
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
                    name: "test".into(),
                    host_version: "0".into(),
                    platform: "linux".into(),
                },
                1,
            )
            .unwrap();
        let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
        let HatChange::Done(other) = hosts.create_hat("Other", None, 1).unwrap() else {
            panic!()
        };
        let operator = Arc::new(Operator::open(&db).unwrap());
        let setup = operator.issue_setup_token(unix_now()).unwrap().unwrap();
        assert!(matches!(
            operator
                .set_up(&setup, "correct horse battery", "https://hennery.example", unix_now())
                .unwrap(),
            SetupOutcome::Done { .. }
        ));
        let gateway = Arc::new(GatewayStore::open(&db).unwrap());
        let runtime = Arc::new(hennery_gateway::runtime::Runtime::new(
            gateway.clone(),
            Arc::new(ProxyStore::open(&db).unwrap()),
            Arc::new(MasterKey::from_bytes([7; 32])),
            hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
            Arc::new(hennery_gateway::notify::Silent),
        ));
        let state = GatewayState { runtime, operator };
        let store = Store::open(&db).unwrap();
        store.set_session_mcp(Arc::new(GatewayMcp::for_collector(&state)));
        gateway.set_session_tools(&hat, true).unwrap();
        gateway.set_session_tools(&other.id, true).unwrap();
        Self {
            _dir: dir,
            db,
            store,
            gateway,
            hat,
            other: other.id,
        }
    }
    fn start(&self, id: &str, hat: &str, isolation: McpIsolation) -> Option<SessionIdentity> {
        let given = self
            .store
            .create_session_with_mcp(
                id,
                "host",
                "claude",
                "/project",
                hat,
                None,
                McpContext {
                    capable: true,
                    isolation,
                    rules_name_other_hats: false,
                },
            )
            .unwrap()
            .unwrap();
        given.servers.iter().find_map(|s| match s {
            McpServer::Http { name, headers, .. } if name == "hennery" => self
                .gateway
                .authenticate_session(headers[0].value.strip_prefix("Bearer ").unwrap())
                .unwrap(),
            _ => None,
        })
    }
    fn active(&self, id: &str) {
        self.store
            .ingest(id, 1, &SessionBody::session_started("request", format!("agent-{id}")))
            .unwrap();
    }
}
#[test]
fn verified_context_checks_generation_session_owner_hat_cwd_and_live_isolation() {
    let w = World::new();
    let identity = w.start("parent", &w.hat, McpIsolation::None).unwrap();
    let ctx = w.store.session_tool_context(&identity, 1, false).unwrap().unwrap();
    assert_eq!(ctx.session_id(), "parent");
    assert_eq!(ctx.canonical_cwd(), "/project");
    assert!(w.store.session_tool_context(&identity, 1, true).unwrap().is_none());
    w.active("parent");
    assert!(w.store.session_tool_context(&identity, 1, true).unwrap().is_some());
    let mut forged = identity.clone();
    forged.owner_id = "foreign".into();
    assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
    forged = identity.clone();
    forged.principal.hat_id = w.other.clone();
    assert!(w.store.session_tool_context(&forged, 1, false).unwrap().is_none());
    let raw = hennery_kernel::db::open(&w.db).unwrap();
    raw.execute("UPDATE hosts SET default_hat_id = ?1 WHERE id = 'host'", [&w.other])
        .unwrap();
    assert!(w.store.session_tool_context(&identity, 1, false).unwrap().is_none());
    assert!(w.start("fallback", &w.hat, McpIsolation::None).is_none());
    let isolated = w.start("isolated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    assert!(w.store.session_tool_context(&isolated, 1, false).unwrap().is_some());
    raw.execute(
        "UPDATE sessions SET cwd = '/project/../escape' WHERE id = 'isolated'",
        [],
    )
    .unwrap();
    assert!(w.store.session_tool_context(&isolated, 1, false).unwrap().is_none());
}
#[test]
fn family_storage_is_immutable_direct_scoped_and_terminally_detached() {
    let w = World::new();
    let identity = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.active("parent");
    w.start("child", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.start("sibling", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.start("foreign-hat", &w.other, McpIsolation::ClaudeStrict).unwrap();
    let mut conn = hennery_kernel::db::open(&w.db).unwrap();
    let tx = conn.transaction().unwrap();
    assert!(w.store.bind_family_in(&tx, &identity, 1, "child", 0).unwrap());
    assert!(!w.store.bind_family_in(&tx, &identity, 1, "child", 0).unwrap());
    assert!(!w.store.bind_family_in(&tx, &identity, 1, "parent", 0).unwrap());
    assert!(!w.store.bind_family_in(&tx, &identity, 1, "foreign-hat", 0).unwrap());
    tx.commit().unwrap();
    assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_some());
    for id in ["sibling", "parent", "foreign-hat", "absent"] {
        assert!(w.store.direct_child(&identity, 1, id).unwrap().is_none());
    }
    conn.execute("UPDATE sessions SET close_requested = 1 WHERE id = 'parent'", [])
        .unwrap();
    assert!(w.store.direct_child(&identity, 1, "child").unwrap().is_none());
    conn.execute(
        "UPDATE sessions SET close_requested = 0, lifecycle = 'active' WHERE id = 'parent'",
        [],
    )
    .unwrap();
    assert!(
        w.store.direct_child(&identity, 1, "child").unwrap().is_none(),
        "resume cannot revive a detached edge"
    );
    conn.execute("UPDATE sessions SET lifecycle = 'deleted' WHERE id = 'parent'", [])
        .unwrap();
    let count: i64 = conn
        .query_row("SELECT count(*) FROM session_families", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 0);
    let state: String = conn
        .query_row("SELECT lifecycle FROM sessions WHERE id = 'child'", [], |r| r.get(0))
        .unwrap();
    assert_ne!(state, "deleted");
}
