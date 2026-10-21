use base64::{Engine, engine::general_purpose::STANDARD};
use hennery_kernel::hosts::{Enrollment, Hosts};
use hennery_proto::{
    delegation_host::{CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog, SecurityClassification},
    frames::{
        AgentIsolation, Capabilities, Capability, CollectorFrame, Indexed, ParkReason, PendingExtract, PendingKind,
        PendingResolution, SessionBody, SessionConfig, TurnOutcome,
    },
};
use hennery_sessions::{
    content,
    hub::Hub,
    store::{McpContext, Store},
};
use rusqlite::{Connection, params};
use serde_json::json;
use std::{cell::Cell, sync::Arc};

struct World {
    dir: tempfile::TempDir,
    store: Arc<Store>,
    seq: Cell<u64>,
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
                    host_version: "fixture".into(),
                    platform: "fixture".into(),
                },
                0,
            )
            .unwrap();
        let hat = hosts.host("host").unwrap().unwrap().default_hat_id;
        let store = Arc::new(Store::open(&db).unwrap());
        store
            .create_session("session", "host", "fake", "/project", &hat, None)
            .unwrap();
        let world = Self {
            dir,
            store,
            seq: Cell::new(0),
        };
        world.emit(SessionBody::session_started("start", "agent-session"));
        world
    }
    fn conn(&self) -> Connection {
        Connection::open(self.dir.path().join("hennery.db")).unwrap()
    }
    fn emit(&self, body: SessionBody) {
        self.seq.set(self.seq.get() + 1);
        self.store.ingest("session", self.seq.get(), &body).unwrap();
    }
    fn queue(&self, text: &str) -> String {
        self.store.enqueue_operator_prompt("session", &checked(text)).unwrap()
    }
    fn start(&self, request: &str, turn: &str) {
        self.emit(SessionBody::TurnStarted {
            request_id: request.into(),
            turn_id: turn.into(),
        });
    }
    fn end(&self, turn: &str, outcome: TurnOutcome) {
        self.emit(SessionBody::TurnEnded {
            turn_id: turn.into(),
            outcome,
            stop_reason: None,
            error: None,
        });
    }
    fn dispatch(&self, hub: &Hub) -> bool {
        self.store
            .dispatch_operator_prompt("session", hub, &mut None, None)
            .unwrap()
    }
}
fn checked(text: &str) -> content::Checked {
    content::check(vec![json!({"type":"text","text":text})]).unwrap()
}
fn host(caps: Vec<Capability>) -> (Arc<Hub>, tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) {
    let hub = Arc::new(Hub::new());
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let reg = hub
        .register("host", tx, Capabilities(caps), AgentIsolation::default())
        .unwrap();
    hub.mark_ready("host", reg.conn_id);
    (hub, rx)
}
fn prompt(rx: &mut tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) -> (String, String, Vec<serde_json::Value>) {
    let CollectorFrame::Prompt {
        request_id,
        turn_id,
        content,
        ..
    } = rx.try_recv().unwrap()
    else {
        panic!("expected prompt")
    };
    (request_id, turn_id, content)
}

#[test]
fn queue_waits_for_turn_end_and_delivers_fifo_as_operator() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    assert!(w.store.open_prompt("session", "running", &checked("first")).unwrap());
    w.start("first", "running");
    let head = w.queue("second");
    let tail = w.queue("third");
    assert!(!w.dispatch(&hub));
    assert!(rx.try_recv().is_err());
    w.end("running", TurnOutcome::Completed);
    assert!(w.dispatch(&hub));
    let (request, turn, content) = prompt(&mut rx);
    assert_eq!(request, head);
    assert_eq!(content[0]["text"], "second");
    assert!(!w.dispatch(&hub));
    w.start(&request, &turn);
    let events = w.store.events("session", 0, 100).unwrap();
    let user = events.iter().rev().find(|e| e.kind == "user_turn").unwrap();
    assert_eq!(user.body["origin"]["kind"], "operator");
    w.end(&turn, TurnOutcome::Completed);
    assert!(w.dispatch(&hub));
    assert_eq!(prompt(&mut rx).0, tail);
}

#[test]
fn pending_permission_never_consumes_queue_even_without_an_open_turn() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    w.emit(SessionBody::PendingOpened {
        pending_id: "permission".into(),
        indexed: Indexed {
            pending: Some(Box::new(PendingExtract {
                id: "permission".into(),
                kind: PendingKind::Permission,
                option_ids: Some(vec!["allow".into()]),
                title: None,
            })),
            ..Default::default()
        },
        payload: json!({"options":[{"optionId":"allow","kind":"allow_once","name":"Allow"}]}),
    });
    let id = w.queue("later");
    assert!(!w.dispatch(&hub));
    assert!(rx.try_recv().is_err());
    assert_eq!(w.store.operator_prompt_queue("session").unwrap()[0].id, id);
    w.emit(SessionBody::PendingResolved {
        pending_id: "permission".into(),
        resolution: PendingResolution::Delivered,
        reason: None,
    });
    assert!(w.dispatch(&hub));
    assert_eq!(prompt(&mut rx).0, id);
}

#[test]
fn edit_and_remove_preserve_fifo_and_do_not_touch_the_open_turn() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    let first = w.queue("one");
    let removed = w.queue("remove");
    let third = w.queue("three");
    w.store.edit_operator_prompt("session", &first, "edited").unwrap();
    assert!(w.store.remove_operator_prompt("session", &removed).unwrap());
    assert!(w.dispatch(&hub));
    assert_eq!(prompt(&mut rx).2[0]["text"], "edited");
    assert!(w.store.edit_operator_prompt("session", &first, "too late").is_err());
    assert!(!w.store.remove_operator_prompt("session", &first).unwrap());
    assert_eq!(w.store.operator_prompt_queue("session").unwrap()[1].id, third);
}

#[test]
fn cancelled_turn_keeps_and_delivers_the_next_message() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    w.store.open_prompt("session", "running", &checked("first")).unwrap();
    w.start("first", "running");
    let queued = w.queue("next");
    w.end("running", TurnOutcome::Cancelled);
    assert!(w.dispatch(&hub));
    assert_eq!(prompt(&mut rx).0, queued);
}

#[test]
fn failed_and_closed_sessions_keep_unsent_text_and_readable_reasons() {
    for close in [false, true] {
        let w = World::new();
        w.queue("keep these words");
        if close {
            w.store.close_now("session").unwrap();
        } else {
            w.store.mark_failed("session", "agent_not_logged_in").unwrap();
        }
        let queue = w.store.operator_prompt_queue("session").unwrap();
        assert_eq!(queue.len(), 1);
        assert_eq!(queue[0].state, "failed");
        assert!(
            queue[0]
                .reason
                .as_deref()
                .unwrap()
                .contains(if close { "closed" } else { "signed out" })
        );
        assert_eq!(
            serde_json::to_value(&queue[0].content).unwrap()[0]["text"],
            "keep these words"
        );
        assert!(w.store.enqueue_operator_prompt("session", &checked("refuse")).is_err());
    }
}

#[test]
fn queue_survives_restart_and_inflight_association_is_not_replayed() {
    let w = World::new();
    let id = w.queue("restart me");
    let (hub, mut rx) = host(vec![]);
    let reopened = Store::open(&w.dir.path().join("hennery.db")).unwrap();
    assert_eq!(reopened.operator_prompt_queue("session").unwrap()[0].id, id);
    assert!(
        reopened
            .dispatch_operator_prompt("session", &hub, &mut None, None)
            .unwrap()
    );
    let (request, turn, _) = prompt(&mut rx);
    let restarted = Store::open(&w.dir.path().join("hennery.db")).unwrap();
    assert!(
        !restarted
            .dispatch_operator_prompt("session", &hub, &mut None, None)
            .unwrap()
    );
    assert!(rx.try_recv().is_err());
    w.start(&request, &turn);
    assert!(restarted.operator_prompt_queue("session").unwrap().is_empty());
}

#[test]
fn queue_changes_are_durable_events_seen_by_every_window() {
    let w = World::new();
    let (hub, _rx) = host(vec![]);
    let mut first = hub.subscribe();
    let mut second = hub.subscribe();
    let id = w.queue("one");
    w.store.flush_prompt_queue_changes(&hub).unwrap();
    assert_eq!(first.try_recv().unwrap().kind, "queue_changed");
    assert_eq!(second.try_recv().unwrap().kind, "queue_changed");
    w.store.edit_operator_prompt("session", &id, "two").unwrap();
    w.store.flush_prompt_queue_changes(&hub).unwrap();
    assert_eq!(first.try_recv().unwrap().kind, "queue_changed");
    assert_eq!(second.try_recv().unwrap().kind, "queue_changed");
    w.store.remove_operator_prompt("session", &id).unwrap();
    w.store.flush_prompt_queue_changes(&hub).unwrap();
    assert_eq!(first.try_recv().unwrap().kind, "queue_changed");
    assert_eq!(second.try_recv().unwrap().kind, "queue_changed");
}

#[test]
fn queue_bounds_include_images_edits_failed_items_and_the_shared_parent_fifo() {
    let w = World::new();
    for _ in 0..32 {
        w.queue("small");
    }
    assert_eq!(
        w.store
            .enqueue_operator_prompt("session", &checked("overflow"))
            .unwrap_err()
            .to_string(),
        "queue_full"
    );
    w.store.mark_failed("session", "agent_not_logged_in").unwrap();
    let w = World::new();
    let id = w.queue("small");
    assert_eq!(
        w.store
            .edit_operator_prompt("session", &id, &"x".repeat(1024 * 1024))
            .unwrap_err()
            .to_string(),
        "queue_full"
    );
    let mut image = b"\x89PNG\r\n\x1a\n".to_vec();
    image.resize(1024 * 1024, 0);
    let image = content::check(vec![
        json!({"type":"image","mimeType":"image/png","data":STANDARD.encode(image)}),
    ])
    .unwrap();
    assert_eq!(
        w.store
            .enqueue_operator_prompt("session", &image)
            .unwrap_err()
            .to_string(),
        "queue_full"
    );
}

#[test]
fn queued_images_survive_sweep_edit_and_delivery_and_are_cleaned_on_removal() {
    let w = World::new();
    let (hub, mut rx) = host(vec![Capability::Images]);
    let bytes = b"\x89PNG\r\n\x1a\nqueued";
    let image = content::check(vec![
        json!({"type":"text","text":"image"}),
        json!({"type":"image","mimeType":"image/png","data":STANDARD.encode(bytes)}),
    ])
    .unwrap();
    let sha = image.images[0].sha256.clone();
    let id = w.store.enqueue_operator_prompt("session", &image).unwrap();
    w.store
        .sweep_attachments(
            std::time::SystemTime::now() + std::time::Duration::from_secs(7200),
            &tokio_util::sync::CancellationToken::new(),
        )
        .unwrap();
    assert!(w.store.attachment(&sha).unwrap().is_some());
    w.store.edit_operator_prompt("session", &id, "edited").unwrap();
    assert!(w.dispatch(&hub));
    let (request, turn, sent) = prompt(&mut rx);
    assert_eq!(sent[1]["data"], STANDARD.encode(bytes));
    w.start(&request, &turn);
    w.end(&turn, TurnOutcome::Completed);
    assert!(w.store.attachment(&sha).unwrap().is_some());
    let other = content::check(vec![
        json!({"type":"image","mimeType":"image/png","data":STANDARD.encode(b"\x89PNG\r\n\x1a\nother")}),
    ])
    .unwrap();
    let sha = other.images[0].sha256.clone();
    let id = w.store.enqueue_operator_prompt("session", &other).unwrap();
    assert!(w.store.remove_operator_prompt("session", &id).unwrap());
    assert!(w.store.attachment(&sha).unwrap().is_none());
}

#[test]
fn runtime_rejection_stops_the_queue_and_keeps_all_messages() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    let id = w.queue("first");
    w.queue("second");
    assert!(w.dispatch(&hub));
    let (request, _turn, _) = prompt(&mut rx);
    assert!(
        !w.store
            .reject_operator_prompt("foreign", &request, "auth_required")
            .unwrap()
    );
    assert!(
        w.store
            .reject_operator_prompt("host", &request, "auth_required")
            .unwrap()
    );
    let queue = w.store.operator_prompt_queue("session").unwrap();
    assert_eq!(queue[0].id, id);
    assert_eq!(queue.len(), 2);
    assert!(
        queue
            .iter()
            .all(|q| q.state == "failed" && q.reason.as_deref().unwrap().contains("signed out"))
    );
    assert!(!w.dispatch(&hub));
}

#[test]
fn operator_prompts_cannot_overtake_a_shared_parent_fifo_head() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    let owner = w.store.owner_id();
    let conn = w.conn();
    conn.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state) VALUES (?1,'session','parent-head','parent-head','','session_send','session','queued')",[owner]).unwrap();
    conn.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES (?1,'parent-head','session','session',1,'parent first','{}')",[owner]).unwrap();
    w.queue("operator second");
    assert!(!w.dispatch(&hub));
    assert!(!w.store.open_prompt("session", "overtake", &checked("direct")).unwrap());
    assert!(rx.try_recv().is_err());
}

#[test]
fn grant_revision_changes_do_not_cancel_operator_input() {
    let w = World::new();
    w.queue("operator");
    let conn = w.conn();
    let owner = w.store.owner_id();
    let hat = w.store.find_session("session").unwrap().unwrap().hat_id;
    conn.execute(
        "INSERT INTO hat_session_tools(owner_id,hat_id,delegation_enabled,revision) VALUES (?1,?2,1,1)",
        params![owner, hat],
    )
    .unwrap();
    conn.execute(
        "UPDATE hat_session_tools SET revision=2 WHERE owner_id=?1 AND hat_id=?2",
        params![owner, hat],
    )
    .unwrap();
    assert_eq!(w.store.operator_prompt_queue("session").unwrap()[0].state, "queued");
}

#[test]
fn two_workers_dispatch_each_queue_head_exactly_once() {
    let w = World::new();
    let (hub, mut rx) = host(vec![]);
    let id = w.queue("only once");
    let mut threads = Vec::new();
    for _ in 0..8 {
        let store = w.store.clone();
        let hub = hub.clone();
        threads.push(std::thread::spawn(move || {
            store
                .dispatch_operator_prompt("session", &hub, &mut None, None)
                .unwrap()
        }));
    }
    assert_eq!(
        threads
            .into_iter()
            .map(|t| t.join().unwrap())
            .filter(|sent| *sent)
            .count(),
        1
    );
    let (request, turn, _) = prompt(&mut rx);
    assert_eq!(request, id);
    assert!(rx.try_recv().is_err());
    w.start(&request, &turn);
    w.end(&turn, TurnOutcome::Completed);
    assert!(w.store.operator_prompt_queue("session").unwrap().is_empty());
    assert!(!w.dispatch(&hub));
}

#[test]
fn parked_operator_queue_uses_the_existing_attach_generation_and_confirmed_configuration() {
    let w = World::new();
    let (hub, mut rx) = host(vec![Capability::DelegationConfig]);
    w.emit(SessionBody::SessionParked {
        reason: ParkReason::Idle,
    });
    let id = w.queue("resume then deliver");
    let catalog = HostCatalog {
        agent: "fake".into(),
        adapter_revision: "fixture".into(),
        freshness: CatalogFreshness::Fresh,
        config_options: vec![],
        defaults: SessionConfig::default(),
        security: SecurityClassification {
            known: true,
            axes: Default::default(),
        },
    };
    assert!(
        w.store
            .attach_delegated("session", McpContext::NONE, &catalog, &hub)
            .unwrap()
    );
    let CollectorFrame::DelegatedAttach {
        attach_generation,
        agent_session_id,
        ..
    } = rx.try_recv().unwrap()
    else {
        panic!("attach")
    };
    assert_eq!(agent_session_id.as_deref(), Some("agent-session"));
    assert!(!w.dispatch(&hub));
    let mut started = SessionBody::session_started("resumed", "agent-session");
    if let SessionBody::SessionStarted { indexed, .. } = &mut started {
        indexed.config_evidence = Some(Box::new(ConfigEvidence {
            attach_generation,
            config_revision: 1,
            completeness: ConfigCompleteness::Complete,
            actual: SessionConfig::default(),
        }));
    }
    w.emit(started);
    assert!(!w.dispatch(&hub));
    assert!(
        w.store
            .dispatch_operator_prompt("session", &hub, &mut None, Some(&catalog))
            .unwrap()
    );
    assert_eq!(prompt(&mut rx).0, id);
}

#[tokio::test]
async fn competing_workers_drain_after_turn_end_without_adapter_queueing_or_catalog_capabilities() {
    for agent in ["claude", "codex"] {
        let w = World::new();
        w.conn()
            .execute(
                "UPDATE sessions SET agent=?2 WHERE owner_id=?1 AND id='session'",
                params![w.store.owner_id(), agent],
            )
            .unwrap();
        w.store.open_prompt("session", "running", &checked("first")).unwrap();
        w.start("first", "running");
        let id = w.queue("next");
        let db = w.dir.path().join("hennery.db");
        let state = hennery_sessions::AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            hennery_kernel::operator::Operator::open(&db).unwrap(),
        );
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let reg = state
            .hub
            .register("host", tx, Capabilities::default(), AgentIsolation::default())
            .unwrap();
        state.hub.mark_ready("host", reg.conn_id);
        hennery_sessions::delegation_worker::drain(&state).await.unwrap();
        assert!(rx.try_recv().is_err());
        w.end("running", TurnOutcome::Completed);
        let (one, two) = tokio::join!(
            hennery_sessions::delegation_worker::drain(&state),
            hennery_sessions::delegation_worker::drain(&state)
        );
        one.unwrap();
        two.unwrap();
        let (request, turn, _) = prompt(&mut rx);
        assert_eq!(request, id);
        assert!(rx.try_recv().is_err());
        w.start(&request, &turn);
        w.end(&turn, TurnOutcome::Completed);
        assert!(state.store.operator_prompt_queue("session").unwrap().is_empty());
        state.shutdown.cancel();
    }
}

#[test]
fn a_failed_turn_stops_pending_operator_prompts_and_dismissal_cleans_their_images() {
    let w = World::new();
    w.store.open_prompt("session", "running", &checked("first")).unwrap();
    w.start("first", "running");
    let image = content::check(vec![
        json!({"type":"image","mimeType":"image/png","data":STANDARD.encode(b"\x89PNG\r\n\x1a\nfailed")}),
    ])
    .unwrap();
    let sha = image.images[0].sha256.clone();
    let id = w.store.enqueue_operator_prompt("session", &image).unwrap();
    w.end("running", TurnOutcome::Failed);
    let queue = w.store.operator_prompt_queue("session").unwrap();
    assert_eq!(queue[0].state, "failed");
    assert!(queue[0].reason.as_deref().unwrap().contains("previous turn failed"));
    assert!(w.store.remove_operator_prompt("session", &id).unwrap());
    assert!(w.store.attachment(&sha).unwrap().is_none());
}

#[tokio::test]
async fn parked_resume_refusals_keep_every_message_and_offline_hosts_leave_them_queued() {
    for missing_record in [true, false] {
        let w = World::new();
        w.emit(SessionBody::SessionParked {
            reason: ParkReason::Idle,
        });
        if missing_record {
            w.conn()
                .execute(
                    "UPDATE sessions SET agent_session_id=NULL WHERE owner_id=?1 AND id='session'",
                    [w.store.owner_id()],
                )
                .unwrap();
        }
        w.queue("keep the first message");
        w.queue("keep the second message");
        let db = w.dir.path().join("hennery.db");
        let state = hennery_sessions::AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            hennery_kernel::operator::Operator::open(&db).unwrap(),
        );
        hennery_sessions::delegation_worker::drain(&state).await.unwrap();
        assert!(
            state
                .store
                .operator_prompt_queue("session")
                .unwrap()
                .iter()
                .all(|q| q.state == "queued")
        );
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let capabilities = if missing_record {
            vec![Capability::DelegationConfig]
        } else {
            vec![]
        };
        let reg = state
            .hub
            .register("host", tx, Capabilities(capabilities), AgentIsolation::default())
            .unwrap();
        state.hub.mark_ready("host", reg.conn_id);
        hennery_sessions::delegation_worker::drain(&state).await.unwrap();
        let queue = state.store.operator_prompt_queue("session").unwrap();
        assert_eq!(queue.len(), 2);
        for (item, expected) in queue.iter().zip(["keep the first message", "keep the second message"]) {
            assert_eq!(item.state, "failed");
            assert_eq!(item.content, checked(expected).stored);
            assert!(item.reason.as_deref().unwrap().contains(if missing_record {
                "no longer has this session"
            } else {
                "session settings"
            }));
        }
        assert!(rx.try_recv().is_err());
        state.shutdown.cancel();
    }
}

#[test]
fn session_delete_scrubs_queued_text_and_removes_queue_only_images() {
    let w = World::new();
    let image = content::check(vec![
        json!({"type":"text","text":"erase queued text"}),
        json!({"type":"image","mimeType":"image/png","data":STANDARD.encode(b"\x89PNG\r\n\x1a\ndelete")}),
    ])
    .unwrap();
    let sha = image.images[0].sha256.clone();
    w.store.enqueue_operator_prompt("session", &image).unwrap();
    w.store.close_now("session").unwrap();
    let result = w.store.delete_session("session", None).unwrap();
    assert!(matches!(result, hennery_sessions::store::Deletion::Done { .. }));
    assert!(w.store.operator_prompt_queue("session").unwrap().is_empty());
    assert!(w.store.attachment(&sha).unwrap().is_none());
    let conn = w.conn();
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM session_operations WHERE owner_id=?1 AND caller_id='session'",
            [w.store.owner_id()],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 0);
}
