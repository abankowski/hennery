use hennery_gateway::plugin::{Control, RegistrationInput};
use hennery_gateway::key::MasterKey;
use hennery_gateway::model::{Change, CredKind, NewConnection};
use hennery_gateway::store::GatewayStore;
use hennery_host::identity::HostKey;
use hennery_kernel::hosts::{Hosts, Enrollment};
use hennery_sessions::store::Store;
use hennery_proto::plugin::PluginCapabilities;

#[test]
fn registration_is_optional_scoped_and_binds_an_already_running_session() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("hennery.db");
    let sessions = Store::open(&path).unwrap();
    let hosts = Hosts::open(&path).unwrap();
    let gateway = GatewayStore::open(&path).unwrap();
    let hat = hosts.default_hat_for_new_hosts().unwrap();
    let key = HostKey::from_seed([7;32]);
    hosts.register("host", &Enrollment { public_key: key.public_key_hex(), name: "Test".into(), host_version:"0.0.0".into(), platform:"test".into()}, 1).unwrap();
    let Change::Done(connection) = gateway.create(&NewConnection {
        slug:"test-plugin".into(), label:"Test plug-in".into(), url:"https://example.invalid/mcp".into(), hat_id:hat.clone(), cred_kind:CredKind::Static,
        static_header:None, static_prefix:None, tool_allowlist:Some(vec!["search".into()]), internal_network:false,
    }, 1).unwrap() else {panic!("connection")};
    gateway.replace_mounts(&connection.id, &["host".into()]).unwrap();
    gateway.set_static_credential(&connection.id, "namespace", &MasterKey::from_bytes([3;32]), 1).unwrap();
    sessions.create_session("running", "host", "fake", "/scratch", &hat, None).unwrap();
    assert!(!dir.path().join("plugin-control.db").exists());
    let control = gateway.plugins();
    let mut core = hennery_kernel::db::open(&path).unwrap();
    let tx = core.transaction().unwrap();
    let grant = control.register_in(&tx, RegistrationInput {
        connection_id:&connection.id, lifecycle_credential:"hnry_lifecycle_deadbeefdeadbeef", activity:true, startup:false,
        capabilities:PluginCapabilities {version:1, activity_v1:true, forget_v1:true, startup_context_v1:false},
    }, &MasterKey::from_bytes([3;32]), 2).unwrap();
    tx.commit().unwrap();
    assert!(dir.path().join("plugin-control.db").exists());
    let tx = core.transaction().unwrap();
    assert!(control.bound_in(&tx, "running").unwrap());
    assert!(control.authenticate_in(&tx, &grant.token, 3).unwrap().is_some());
    assert!(control.authenticate_in(&tx, "hnry_activity_deadbeef", 3).unwrap().is_none());
    tx.commit().unwrap();
}
