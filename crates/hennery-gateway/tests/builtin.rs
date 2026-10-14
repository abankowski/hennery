mod support;

use hennery_gateway::session::{GatewayMcp, SessionMcp, SessionRef};
use hennery_gateway::tokens;
use hennery_kernel::operator::{Operator, SetupOutcome};
use hennery_kernel::secret::unix_now;
use hennery_proto::frames::McpServer;
use hennery_proto::rest::McpSessionDeliveryMode;
use support::World;

fn world() -> World {
    let w = World::new();
    w.host("host", 1);
    let op = Operator::open(&w.db).unwrap();
    let setup = op.issue_setup_token(unix_now()).unwrap().unwrap();
    assert!(matches!(
        op.set_up(&setup, "correct horse battery", "https://hennery.example", unix_now())
            .unwrap(),
        SetupOutcome::Done { .. }
    ));
    w
}
fn deliver(w: &World, full: bool, mode: McpSessionDeliveryMode) -> Vec<McpServer> {
    let mcp = if full {
        GatewayMcp::for_collector(&w.gateway())
    } else {
        GatewayMcp::new(&w.gateway())
    };
    let mut conn = w.raw();
    let tx = conn.transaction().unwrap();
    let given = mcp
        .servers_in(
            &tx,
            SessionRef {
                session_id: "s",
                host_id: "host",
                hat_id: &w.hat(),
            },
            mode,
        )
        .unwrap();
    tx.commit().unwrap();
    mcp.cut(given.cut);
    given.servers
}
fn bearer(servers: &[McpServer]) -> String {
    let McpServer::Http { headers, .. } = &servers[0] else {
        panic!()
    };
    headers[0].value.strip_prefix("Bearer ").unwrap().into()
}
#[test]
fn opt_in_delivers_builtin_without_mounts_only_in_collector_mode() {
    let w = world();
    assert!(deliver(&w, true, McpSessionDeliveryMode::Isolated).is_empty());
    let setting = w.store.set_session_tools(&w.hat(), true).unwrap().unwrap();
    assert_eq!(setting.revision, 1);
    assert!(deliver(&w, false, McpSessionDeliveryMode::Isolated).is_empty());
    for mode in [McpSessionDeliveryMode::Fallback, McpSessionDeliveryMode::Unsupported] {
        assert!(deliver(&w, true, mode).is_empty());
    }
    let servers = deliver(&w, true, McpSessionDeliveryMode::Isolated);
    let McpServer::Http { name, url, .. } = &servers[0] else {
        panic!()
    };
    assert_eq!(name, "hennery");
    assert_eq!(url, "https://hennery.example/mcp/builtin/hennery");
    assert!(w.store.authenticate_session(&bearer(&servers)).unwrap().is_some());
}
#[test]
fn delivered_revision_never_upgrades_external_tokens_or_revives_old_grants() {
    let w = world();
    let connection = w.connection(
        "builtin",
        "http://127.0.0.1:9/mcp",
        hennery_gateway::model::CredKind::None,
    );
    w.mount(&connection, &["host"]);
    let external = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
    let identity = w.store.authenticate_session(&external).unwrap().unwrap();
    assert!(identity.delivered_delegation_revision().is_none());
    w.store.set_session_tools(&w.hat(), true).unwrap();
    assert!(w.store.delegation_granted(&identity).unwrap().is_none());
    let servers = deliver(&w, true, McpSessionDeliveryMode::Isolated);
    let token = bearer(&servers);
    assert_eq!(servers.len(), 2);
    let McpServer::Http { headers, .. } = &servers[1] else {
        panic!()
    };
    assert_eq!(headers[0].value, format!("Bearer {token}"));
    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
    let grant = w.store.delegation_granted(&identity).unwrap().unwrap();
    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
    let token_watch = w.revocations.watch(identity.generation().as_str());
    w.store.set_session_tools(&w.hat(), false).unwrap();
    assert!(watch.token().is_cancelled());
    assert!(!token_watch.token().is_cancelled());
    assert!(w.proxy_store_resolve(&token).is_some());
    w.store.set_session_tools(&w.hat(), true).unwrap();
    assert!(w.store.delegation_granted(&identity).unwrap().is_none());
    assert!(!w.store.recheck_delegation(&identity, grant).unwrap());
    let fresh = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
    assert!(
        w.store
            .delegation_granted(&w.store.authenticate_session(&fresh).unwrap().unwrap())
            .unwrap()
            .is_some()
    );
    assert!(w.store.authenticate_session(&token).unwrap().is_none());
}
#[test]
fn transaction_rollback_keeps_grants_and_token_generations_and_watches() {
    let w = world();
    w.store.set_session_tools(&w.hat(), true).unwrap();
    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
    let mut conn = w.raw();
    let tx = conn.transaction().unwrap();
    let fresh =
        tokens::mint_delegation_in(&tx, w.store.owner_id(), "s", "host", &w.hat(), Some(99), unix_now()).unwrap();
    drop(tx);
    assert!(w.store.authenticate_session(fresh.expose()).unwrap().is_none());
    assert!(w.store.authenticate_session(&token).unwrap().is_some());
    let tx = conn.transaction().unwrap();
    tx.execute(
        "UPDATE hat_session_tools SET delegation_enabled = 0, revision = revision + 1 WHERE owner_id = ?1",
        [w.store.owner_id()],
    )
    .unwrap();
    drop(tx);
    assert!(!watch.token().is_cancelled());
    assert!(w.store.delegation_granted(&identity).unwrap().is_some());
}

#[test]
fn independent_store_policy_edits_cut_the_same_grant_without_keeping_writer_ownership() {
    let w = world();
    w.store.set_session_tools(&w.hat(), true).unwrap();
    let token = bearer(&deliver(&w, true, McpSessionDeliveryMode::Isolated));
    let identity = w.store.authenticate_session(&token).unwrap().unwrap();
    let watch = w.store.watch_delegation(&identity).unwrap().unwrap();
    let other = hennery_gateway::store::GatewayStore::open(&w.db).unwrap();
    other.set_session_tools(&w.hat(), false).unwrap();
    assert!(watch.token().is_cancelled());
}
#[test]
fn foreign_owner_session_and_grant_are_not_visible() {
    let w = world();
    let mut conn = w.raw();
    conn.execute_batch("INSERT INTO owners(id, created_at) VALUES ('foreign', 9223372036854775807);
        INSERT INTO hats(id, owner_id, name, colour, created_at) VALUES ('foreign-hat','foreign','Other','#000000',0);
        INSERT INTO hosts(id, owner_id, name, public_key, platform, host_version, default_hat_id, created_at)
            VALUES ('foreign-host','foreign','other','other-key','linux','0','foreign-hat',0);
        INSERT INTO hat_session_tools(owner_id,hat_id,delegation_enabled,revision) VALUES ('foreign','foreign-hat',1,1);").unwrap();
    let tx = conn.transaction().unwrap();
    let token = tokens::mint_delegation_in(
        &tx,
        "foreign",
        "foreign-session",
        "foreign-host",
        "foreign-hat",
        Some(1),
        unix_now(),
    )
    .unwrap();
    tx.commit().unwrap();
    assert!(w.store.authenticate_session(token.expose()).unwrap().is_none());
    assert!(w.store.session_tools("foreign-hat").unwrap().is_none());
    assert!(w.store.set_session_tools("foreign-hat", false).unwrap().is_none());
    assert!(w.store.set_session_tools("absent", true).unwrap().is_none());
}
