use hennery_memory::{
    management::{Edit, NewMemory},
    store::{Query, Store},
};
fn memory(body: &str) -> NewMemory {
    NewMemory {
        title: "Curated reference".into(),
        body: body.into(),
    }
}
#[test]
fn owner_scope_revision_redaction_pin_and_erasure() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("memory.db");
    let store = Store::open(&path).unwrap();
    let a = store.create("owner-a", "garden").unwrap();
    let b = store.create("owner-a", "workshop").unwrap();
    let c = store.create("owner-b", "garden").unwrap();
    store.bind_manager("principal", "owner-a").unwrap();
    let manager = store.manager("principal").unwrap();
    assert!(store.manager("owner-a").is_err());
    assert!(store.bind_manager("principal", "owner-b").is_err());
    assert_eq!(store.managed_namespaces(&manager).unwrap().len(), 2);
    assert!(store.managed_create(&manager, &c.namespace, memory("foreign")).is_err());
    let secret = format!("hnry_plugin_{}", "a".repeat(64));
    let entry = store
        .managed_create(&manager, &a.namespace, memory(&format!("deletedbeforemarker {secret}")))
        .unwrap();
    assert!(!entry.body.contains(&secret));
    assert_eq!(entry.author, "owner");
    assert!(store.managed_entry(&manager, &b.namespace, &entry.id).is_err());
    let edit = || Edit {
        revision: entry.revision,
        title: entry.title.clone(),
        body: "deletedaftermarker".into(),
    };
    let updated = store.managed_edit(&manager, &a.namespace, &entry.id, edit()).unwrap();
    assert!(store.managed_edit(&manager, &a.namespace, &entry.id, edit()).is_err());
    assert_eq!(updated.revision, 2);
    assert!(
        store
            .search(&a.tool, &Query::search("deletedbeforemarker"))
            .unwrap()
            .entries
            .is_empty()
    );
    assert_eq!(
        store
            .search(&a.tool, &Query::search("deletedaftermarker"))
            .unwrap()
            .entries
            .len(),
        1
    );
    let pinned = store
        .managed_pin(&manager, &a.namespace, &entry.id, updated.revision, true)
        .unwrap();
    assert!(pinned.pinned);
    for n in 0..4 {
        let e = store
            .managed_create(&manager, &a.namespace, memory(&format!("pinned {n}")))
            .unwrap();
        store
            .managed_pin(&manager, &a.namespace, &e.id, e.revision, true)
            .unwrap();
    }
    let sixth = store.managed_create(&manager, &a.namespace, memory("sixth")).unwrap();
    assert!(store.managed_pin(&manager, &a.namespace, &sixth.id, 1, true).is_err());
    let survivor = store
        .managed_create(&manager, &b.namespace, memory("other_hat_survives"))
        .unwrap();
    assert!(store.managed_delete(&manager, &a.namespace, &entry.id, 1).is_err());
    store
        .managed_delete(&manager, &a.namespace, &entry.id, pinned.revision)
        .unwrap();
    assert!(store.managed_entry(&manager, &a.namespace, &entry.id).is_err());
    assert!(
        store
            .search(&a.tool, &Query::search("deletedaftermarker"))
            .unwrap()
            .entries
            .is_empty()
    );
    assert_eq!(
        store.managed_entry(&manager, &b.namespace, &survivor.id).unwrap().body,
        "other_hat_survives"
    );
    for name in ["memory.db", "memory.db-wal"] {
        if let Ok(bytes) = std::fs::read(dir.path().join(name)) {
            for marker in ["deletedbeforemarker", "deletedaftermarker"] {
                assert!(
                    !bytes.windows(marker.len()).any(|b| b == marker.as_bytes()),
                    "{name}: {marker}"
                );
            }
        }
    }
}
#[test]
fn export_snapshot_is_scoped_and_provenance_is_immutable() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let a = s.create("owner", "a").unwrap();
    let b = s.create("owner", "b").unwrap();
    s.bind_manager("auth", "owner").unwrap();
    let m = s.manager("auth").unwrap();
    let e = s.managed_create(&m, &a.namespace, memory("scope_a")).unwrap();
    s.managed_create(&m, &b.namespace, memory("scope_b")).unwrap();
    let snapshot = s.managed_snapshot(&m, &a.namespace).unwrap();
    assert_eq!(snapshot.entries.len(), 1);
    assert_eq!(snapshot.entries[0].id, e.id);
    let bytes = serde_json::to_string(&snapshot).unwrap();
    assert!(!bytes.contains("scope_b"));
    assert!(!bytes.contains("tool_hash"));
    assert!(!bytes.contains(&a.tool));
    assert!(serde_json::from_str::<NewMemory>(r#"{"title":"x","body":"y","provenance":[]}"#).is_err());
    assert!(serde_json::from_str::<Edit>(r#"{"title":"x","body":"y","revision":1,"author":"owner"}"#).is_err());
}
