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
    assert!(store.managed_purge(&manager, &c.namespace).is_err());
    assert!(store.managed_writes(&manager, &c.namespace, false).is_err());
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
    for name in ["memory.db", "memory.db-wal"] {
        if let Ok(bytes) = std::fs::read(dir.path().join(name)) {
            assert!(
                !bytes
                    .windows(b"deletedbeforemarker".len())
                    .any(|b| b == b"deletedbeforemarker"),
                "replaced body remains in {name}"
            );
        }
    }
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
    let listed = s.managed_list(&m, &a.namespace, "memory", "", 0).unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].id, e.id);
    assert_eq!(snapshot.entries.len(), 1);
    assert_eq!(snapshot.entries[0].id, e.id);
    let bytes = serde_json::to_string(&snapshot).unwrap();
    assert!(!bytes.contains("scope_b"));
    assert!(!bytes.contains("tool_hash"));
    assert!(!bytes.contains(&a.tool));
    assert!(serde_json::from_str::<NewMemory>(r#"{"title":"x","body":"y","provenance":[]}"#).is_err());
    assert!(serde_json::from_str::<Edit>(r#"{"title":"x","body":"y","revision":1,"author":"owner"}"#).is_err());
}

#[test]
fn every_curated_write_checks_namespace_capacity_and_invalidates_snapshot_delivery() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let c = s.create("owner", "garden").unwrap();
    s.bind_manager("auth", "owner").unwrap();
    let m = s.manager("auth").unwrap();
    let before = s.managed_snapshot(&m, &c.namespace).unwrap();
    let entry = s
        .managed_create(&m, &c.namespace, memory("capacity observation"))
        .unwrap();
    assert!(s.managed_deliverable(&m, &c.namespace, before.generation).is_err());
    let before = s.managed_snapshot(&m, &c.namespace).unwrap();
    let entry = s
        .managed_edit(
            &m,
            &c.namespace,
            &entry.id,
            Edit {
                revision: 1,
                title: entry.title.clone(),
                body: "capacity observation".into(),
            },
        )
        .unwrap();
    assert!(s.managed_deliverable(&m, &c.namespace, before.generation).is_err());
    let before = s.managed_snapshot(&m, &c.namespace).unwrap();
    let entry = s
        .managed_pin(&m, &c.namespace, &entry.id, entry.revision, true)
        .unwrap();
    assert!(s.managed_deliverable(&m, &c.namespace, before.generation).is_err());
    let raw = rusqlite::Connection::open(d.path().join("memory.db")).unwrap();
    raw.execute("UPDATE entries SET kind='note',data=json_set(data,'$.kind','note','$.pinned',json('false')) WHERE namespace=?1 AND id=?2",rusqlite::params![c.namespace,entry.id]).unwrap();
    let before = s.managed_snapshot(&m, &c.namespace).unwrap();
    let entry = s
        .managed_annotate(&m, &c.namespace, &entry.id, entry.revision, "retiredannotationmarker")
        .unwrap();
    assert!(s.managed_deliverable(&m, &c.namespace, before.generation).is_err());
    let entry = s
        .managed_annotate(&m, &c.namespace, &entry.id, entry.revision, "current annotation")
        .unwrap();
    for name in ["memory.db", "memory.db-wal"] {
        if let Ok(bytes) = std::fs::read(d.path().join(name)) {
            assert!(
                !bytes
                    .windows(b"retiredannotationmarker".len())
                    .any(|b| b == b"retiredannotationmarker")
            );
        }
    }
    let before = s.managed_snapshot(&m, &c.namespace).unwrap();
    s.managed_retain(
        &m,
        &c.namespace,
        &entry.id,
        entry.revision,
        "retained",
        "capacity observation",
    )
    .unwrap();
    assert!(s.managed_deliverable(&m, &c.namespace, before.generation).is_err());
    let template = serde_json::to_string(&entry).unwrap();
    raw.execute("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<9999) INSERT INTO entries(namespace,id,kind,title,body,data) SELECT ?1,printf('%064x',x),'memory','fixture','capacity observation',json_set(?2,'$.id',printf('%064x',x),'$.kind','memory','$.revision',1,'$.pinned',json('false')) FROM n",rusqlite::params![c.namespace,template]).unwrap();
    let id = format!("{:064x}", 1);
    assert!(s.managed_create(&m, &c.namespace, memory("beyond count cap")).is_err());
    assert!(
        s.managed_edit(
            &m,
            &c.namespace,
            &id,
            Edit {
                revision: 1,
                title: "fixture".into(),
                body: "edit".into()
            }
        )
        .is_err()
    );
    assert!(s.managed_pin(&m, &c.namespace, &id, 1, true).is_err());
    assert!(
        s.managed_annotate(&m, &c.namespace, &entry.id, entry.revision, "changed")
            .is_err()
    );
    assert!(
        s.managed_retain(
            &m,
            &c.namespace,
            &entry.id,
            entry.revision,
            "retained",
            "capacity observation"
        )
        .is_err()
    );
}
#[test]
fn owner_titles_are_redacted_and_terminal_namespaces_cannot_be_resurrected() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let c = s.create("owner", "garden").unwrap();
    s.bind_manager("auth", "owner").unwrap();
    let m = s.manager("auth").unwrap();
    let entry = s
        .managed_create(
            &m,
            &c.namespace,
            NewMemory {
                title: "hnry_lifecycle_DEADBEEF".into(),
                body: "reference".into(),
            },
        )
        .unwrap();
    assert!(!entry.title.contains("DEADBEEF"));
    s.managed_purge(&m, &c.namespace).unwrap();
    assert!(s.managed_create(&m, &c.namespace, memory("must not return")).is_err());
    assert!(s.managed_snapshot(&m, &c.namespace).is_err());
}

#[test]
fn deliberate_owner_content_has_real_server_side_limits() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let c = s.create("owner", "garden").unwrap();
    s.bind_manager("auth", "owner").unwrap();
    let m = s.manager("auth").unwrap();
    for input in [
        NewMemory {
            title: String::new(),
            body: "reference".into(),
        },
        NewMemory {
            title: "x".repeat(161),
            body: "reference".into(),
        },
        NewMemory {
            title: "reference".into(),
            body: "x".repeat(16385),
        },
    ] {
        assert!(s.managed_create(&m, &c.namespace, input).is_err());
    }
    assert!(s.managed_snapshot(&m, &c.namespace).unwrap().entries.is_empty());
}

#[test]
fn a_delayed_agent_remember_retry_cannot_resurrect_an_owner_deleted_memory() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let c = s.create("owner", "garden").unwrap();
    s.bind_manager("auth", "owner").unwrap();
    let m = s.manager("auth").unwrap();
    let request = || {
        serde_json::from_value::<hennery_memory::store::Remember>(
            serde_json::json!({"title":"agent reference","body":"deletedagentmarker","idempotency_key":"stable retry"}),
        )
        .unwrap()
    };
    let entry = s.remember(&c.tool, request()).unwrap();
    s.managed_delete(&m, &c.namespace, &entry.id, entry.revision).unwrap();
    assert!(s.remember(&c.tool, request()).is_err());
    assert!(
        s.search(&c.tool, &Query::search("deletedagentmarker"))
            .unwrap()
            .entries
            .is_empty()
    );
    for file in ["memory.db", "memory.db-wal"] {
        if let Ok(bytes) = std::fs::read(d.path().join(file)) {
            assert!(
                !bytes
                    .windows(b"deletedagentmarker".len())
                    .any(|b| b == b"deletedagentmarker")
            );
        }
    }
}

#[test]
fn deleted_agent_request_receipts_have_a_namespace_bound() {
    let d = tempfile::tempdir().unwrap();
    let s = Store::open(&d.path().join("memory.db")).unwrap();
    let c = s.create("owner", "garden").unwrap();
    let raw = rusqlite::Connection::open(d.path().join("memory.db")).unwrap();
    raw.execute("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<100000) INSERT INTO requests(namespace,key,digest,result) SELECT ?1,'fixture:'||x,'digest','{}' FROM n",[&c.namespace]).unwrap();
    let input = serde_json::from_value::<hennery_memory::store::Remember>(
        serde_json::json!({"title":"reference","body":"must not persist","idempotency_key":"new request"}),
    )
    .unwrap();
    assert!(s.remember(&c.tool, input).is_err());
    assert_eq!(
        raw.query_row("SELECT count(*) FROM entries WHERE namespace=?1", [&c.namespace], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
    s.owner_purge(&c.namespace).unwrap();
    assert_eq!(
        raw.query_row(
            "SELECT count(*) FROM requests WHERE namespace=?1",
            [&c.namespace],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        0
    );
}
