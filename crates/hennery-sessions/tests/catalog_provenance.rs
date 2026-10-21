use hennery_kernel::hosts::{Enrollment, Hosts};
use hennery_proto::{
    delegation_host::{CatalogFreshness, CatalogIdentity, SecurityClassification},
    frames::{Indexed, SessionBody},
};
use hennery_sessions::store::Store;
use serde_json::{Value, json};

struct World {
    dir: tempfile::TempDir,
    store: Store,
    hosts: Hosts,
    hat: String,
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
        Self {
            store: Store::open(&db).unwrap(),
            dir,
            hosts,
            hat,
        }
    }
    fn start(&self, id: &str, hat: &str, cwd: &str, revision: &str, options: Vec<Value>) {
        assert!(self.store.create_session(id, "host", "claude", cwd, hat, None).unwrap());
        self.store.ingest(id, 1, &started(revision, options)).unwrap();
    }
    fn rows(&self) -> Vec<String> {
        let db = rusqlite::Connection::open(self.dir.path().join("hennery.db")).unwrap();
        db.prepare("SELECT json_array(owner_id,host_id,hat_id,cwd,agent,adapter_revision,catalog,saved_at,observation,source_session_id) FROM runtime_catalog ORDER BY owner_id,host_id,hat_id,cwd,agent,adapter_revision")
            .unwrap().query_map([], |row| row.get(0)).unwrap()
            .collect::<rusqlite::Result<Vec<_>>>().unwrap()
    }
}
fn options(label: &str) -> Vec<Value> {
    vec![
        json!({"id":"model", "type":"select", "currentValue":"small", "options":[{"value":"small"}], "description":label}),
    ]
}
fn started(revision: &str, options: Vec<Value>) -> SessionBody {
    SessionBody::SessionStarted {
        request_id: "start".into(),
        agent_session_id: "agent-session".into(),
        agent_home: None,
        indexed: Indexed {
            config_options: Some(options),
            current_model: Some("small".into()),
            catalog_identity: Some(Box::new(CatalogIdentity {
                adapter_revision: revision.into(),
                agent_defaults: None,
                security: SecurityClassification {
                    known: false,
                    axes: Default::default(),
                },
            })),
            ..Default::default()
        },
    }
}

#[test]
fn rereview_preview_skip_commits_session_and_keeps_previous_rows_byte_identical() {
    for bound in ["count", "bytes", "revision"] {
        let world = World::new();
        world.start("old", &world.hat, "/project", "older-pin", options("older-preview"));
        world.start("current", &world.hat, "/project", "pin", options("current-preview"));
        let before = world.rows();
        assert_eq!(before.len(), 1, "only the newest revision is retained");
        let mut opts = options("incoming");
        let revision = if bound == "revision" {
            "x".repeat(257)
        } else {
            "pin".into()
        };
        if bound == "count" {
            opts = (0..129).map(|i| json!({"id":format!("setting-{i}"),"type":"select","currentValue":"small","options":[{"value":"small"}]})).collect();
        } else if bound == "bytes" {
            opts[0]["description"] = json!("x".repeat(270_000));
        }
        world.start("oversized", &world.hat, "/project", &revision, opts.clone());
        assert_eq!(world.store.committed_seq("oversized").unwrap(), 1, "{bound}");
        let session = world.store.find_session("oversized").unwrap().unwrap();
        assert_eq!(session.lifecycle, "active", "{bound}");
        assert_eq!(session.config.model.as_deref(), Some("small"), "{bound}");
        assert_eq!(
            world.store.catalog("oversized").unwrap().unwrap().config_options,
            opts,
            "{bound}"
        );
        assert_eq!(world.rows(), before, "{bound}: preview partially changed");
        assert!(
            world
                .store
                .ingest("oversized", 1, &started(&revision, opts))
                .unwrap()
                .is_empty(),
            "idempotent host replay"
        );
        world.store.ingest("oversized", 2, &SessionBody::SessionClosed).unwrap();
        assert_eq!(
            world.store.committed_seq("oversized").unwrap(),
            2,
            "{bound}: later host facts accepted"
        );
        assert_eq!(world.rows(), before, "{bound}: later facts change skipped preview");
    }
}

#[test]
fn rereview_deleting_old_session_preserves_newer_other_session_preview() {
    for same_revision in [true, false] {
        let world = World::new();
        world.start("old", &world.hat, "/project", "old-pin", options("old-only"));
        world.start(
            "kept",
            &world.hat,
            "/project",
            if same_revision { "old-pin" } else { "new-pin" },
            options("kept-only"),
        );
        let before = world
            .store
            .saved_runtime_catalog("host", &world.hat, "/project", "claude")
            .unwrap();
        assert_eq!(before.config_options[0]["description"], "kept-only");
        assert!(
            world.rows().iter().any(|row| row.ends_with(",\"kept\"]")),
            "newer preview has kept-session provenance"
        );
        world.store.close_now("old").unwrap();
        world.store.delete_session("old", None).unwrap();
        assert_eq!(world.store.find_session("kept").unwrap().unwrap().lifecycle, "active");
        assert_eq!(
            world.store.catalog("kept").unwrap().unwrap().config_options[0]["description"],
            "kept-only"
        );
        let after = world
            .store
            .saved_runtime_catalog("host", &world.hat, "/project", "claude")
            .unwrap();
        assert_eq!(
            after.freshness,
            CatalogFreshness::Cached,
            "same_revision={same_revision}; deleting old removed newer preview sourced by kept session: {after:?}"
        );
        assert_eq!(after.config_options, before.config_options);
    }
}

#[test]
fn rereview_deleting_reassigned_session_preserves_destination_hats_other_preview() {
    let world = World::new();
    world.start("old", &world.hat, "/project", "pin", options("old-only"));
    let hennery_kernel::hats::HatChange::Done(other) = world.hosts.create_hat("Other", None, 1).unwrap() else {
        panic!("hat")
    };
    world.hosts.update_host("host", None, Some(&other.id)).unwrap();
    world.start("kept", &other.id, "/project", "pin", options("kept-other-hat"));
    assert_eq!(world.rows().len(), 2);
    world.store.close_now("old").unwrap();
    assert!(matches!(
        world.store.reassign_hat("old", &other.id).unwrap(),
        hennery_sessions::store::Reassign::Done(_)
    ));
    world.store.delete_session("old", None).unwrap();
    assert_eq!(world.store.find_session("kept").unwrap().unwrap().lifecycle, "active");
    let after = world
        .store
        .saved_runtime_catalog("host", &other.id, "/project", "claude")
        .unwrap();
    assert_eq!(
        after.freshness,
        CatalogFreshness::Cached,
        "old never supplied a preview under the destination hat: {after:?}"
    );
    assert_eq!(after.config_options[0]["description"], "kept-other-hat");
    assert_eq!(world.rows().len(), 1, "old source must still be removed");
}

#[test]
fn rereview_deleting_session_preserves_other_cwd_preview() {
    let world = World::new();
    world.start("old", &world.hat, "/project", "pin", options("old-only"));
    world.start("kept", &world.hat, "/other-project", "pin", options("kept-only"));
    world.store.close_now("old").unwrap();
    world.store.delete_session("old", None).unwrap();
    assert_eq!(world.rows().len(), 1);
    let after = world
        .store
        .saved_runtime_catalog("host", &world.hat, "/other-project", "claude")
        .unwrap();
    assert_eq!(after.freshness, CatalogFreshness::Cached);
    assert_eq!(after.config_options[0]["description"], "kept-only");
}
