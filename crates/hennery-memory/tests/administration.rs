use hennery_memory::{
    consumer::FeedConfig,
    keys,
    store::{Query, Remember, Store},
};
use serde_json::json;
use std::os::unix::fs::PermissionsExt;
#[test]
fn private_key_never_reuses_collector_files_and_missing_sealing_key_fails_closed() {
    let d = tempfile::tempdir().unwrap();
    let root = d.path();
    std::fs::write(root.join("master.key"), [6u8; 32]).unwrap();
    std::fs::set_permissions(root.join("master.key"), std::fs::Permissions::from_mode(0o600)).unwrap();
    std::fs::write(root.join("hennery.db"), b"untouched collector fixture").unwrap();
    let s = Store::open(&root.join("memory.db")).unwrap();
    let c = s.create("owner", "hat").unwrap();
    let key = keys::load(root, false).unwrap();
    let token = format!("hnry_activity_{}", "a".repeat(64));
    s.attach(
        &c.namespace,
        FeedConfig {
            collector_url: "http://127.0.0.1:7331/".into(),
            namespace_epoch: "b".repeat(64),
            activity_token: token.clone(),
            activity: false,
            internal_network: true,
        },
        &key,
    )
    .unwrap();
    assert_eq!(std::fs::read(root.join("master.key")).unwrap(), [6u8; 32]);
    assert_eq!(
        std::fs::read(root.join("hennery.db")).unwrap(),
        b"untouched collector fixture"
    );
    let private = root.join("memory-key/master.key");
    assert_ne!(std::fs::read(&private).unwrap(), [6u8; 32]);
    assert_eq!(private.metadata().unwrap().permissions().mode() & 0o077, 0);
    for file in ["memory.db", "memory.db-wal"] {
        if let Ok(bytes) = std::fs::read(root.join(file)) {
            assert!(!bytes.windows(token.len()).any(|b| b == token.as_bytes()));
        }
    }
    std::fs::rename(&private, root.join("saved-memory-key")).unwrap();
    assert!(keys::load(root, true).is_err());
    assert!(s.recent(&c.tool, &Query::default()).is_err());
}
#[test]
fn owner_can_disable_deliberate_writes_while_reads_and_owner_erasure_remain_available() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let c = s.create("owner", "hat").unwrap();
    let input = || {
        serde_json::from_value::<Remember>(
            json!({"title":"reference","body":"retained reference","idempotency_key":"k"}),
        )
        .unwrap()
    };
    s.remember(&c.tool, input()).unwrap();
    s.set_writes(&c.namespace, false).unwrap();
    assert!(s.remember(&c.tool, input()).is_err());
    assert_eq!(s.search(&c.tool, &Query::search("retained")).unwrap().entries.len(), 1);
    assert_eq!(s.status(&c.namespace).unwrap()["writes"], false);
    s.owner_purge(&c.namespace).unwrap();
    assert!(s.search(&c.tool, &Query::search("retained")).is_err());
}
