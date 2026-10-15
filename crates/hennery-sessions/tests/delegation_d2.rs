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
    revocations: hennery_gateway::revocation::Revocations,
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
        hosts
            .record_hello(
                "host",
                "0",
                &hennery_proto::frames::Capabilities(vec![hennery_proto::frames::Capability::McpServers]),
                unix_now(),
            )
            .unwrap();
        hosts
            .record_mcp_isolation(
                "host",
                &hennery_proto::frames::AgentIsolation(
                    [("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect(),
                ),
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
        let revocations = runtime.revocations.clone();
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
            revocations,
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

use hennery_proto::{
    delegation::{OperationReceipt, OperationState},
    delegation_host::{CatalogFreshness, ConfigCompleteness, ConfigEvidence, HostCatalog, SecurityClassification},
    frames::{
        AgentIsolation, Capabilities, Capability, CollectorFrame, ConfigValue, ElicitationAction, Indexed, ParkReason,
        PendingExtract, PendingKind, PendingReason, PendingResolution, SessionConfig, TurnOutcome,
    },
    plugin::InputOrigin,
    rest::AnswerRequest,
};
use hennery_sessions::{hub::Hub, store::AnswerSubmission};
use rusqlite::params;
use serde_json::json;
use std::{collections::BTreeMap, sync::Barrier};

fn raw(w: &World) -> hennery_kernel::db::OwnedConnection {
    hennery_kernel::db::open(&w.db).unwrap()
}
fn child(w: &World, parent: &SessionIdentity, id: &str, hat: &str) -> SessionIdentity {
    let identity = w.start(id, hat, McpIsolation::ClaudeStrict).unwrap();
    let mut conn = raw(w);
    let tx = conn.transaction().unwrap();
    assert!(w.store.bind_family_in(&tx, parent, 1, id, 0).unwrap());
    tx.commit().unwrap();
    w.active(id);
    identity
}
fn pair() -> (World, SessionIdentity) {
    let w = World::new();
    let parent = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.active("parent");
    child(&w, &parent, "child", &w.hat);
    (w, parent)
}
fn connected() -> (Arc<Hub>, tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) {
    let h = Arc::new(Hub::new());
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let reg = h
        .register(
            "host",
            tx,
            Capabilities(vec![
                Capability::McpServers,
                Capability::DelegationConfig,
                Capability::CatalogProbe,
            ]),
            AgentIsolation([("claude".into(), McpIsolation::ClaudeStrict)].into_iter().collect()),
        )
        .unwrap();
    h.mark_ready("host", reg.conn_id);
    (h, rx)
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
fn config(model: &str) -> SessionConfig {
    SessionConfig {
        model: Some(model.into()),
        ..Default::default()
    }
}
fn seed(w: &World, id: &str, required: &SessionConfig, generation: u64) {
    raw(w).execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config) VALUES (?1,?2,?3,?4)",params![w.store.owner_id(),id,i64::try_from(generation).unwrap(),serde_json::to_string(required).unwrap()]).unwrap();
}
fn proof(
    w: &World,
    id: &str,
    seq: u64,
    generation: u64,
    revision: u64,
    completeness: ConfigCompleteness,
    actual: SessionConfig,
) {
    w.store
        .ingest(
            id,
            seq,
            &SessionBody::AcpUpdate {
                indexed: Indexed {
                    config_evidence: Some(Box::new(ConfigEvidence {
                        attach_generation: generation,
                        config_revision: revision,
                        completeness,
                        actual,
                    })),
                    ..Default::default()
                },
                payload: json!({}),
            },
        )
        .unwrap();
}
fn ready(w: &World) {
    seed(w, "child", &config("wanted"), 5);
    proof(w, "child", 2, 5, 10, ConfigCompleteness::Complete, config("wanted"));
}
fn queue(w: &World, p: &SessionIdentity, key: &str) -> OperationReceipt {
    w.store.queue_followup(p, 1, key, key, "child", key).unwrap()
}
fn receipt(w: &World, p: &SessionIdentity, key: &str) -> OperationReceipt {
    w.store.delegation_receipt(p, 1, key).unwrap().unwrap()
}
fn take_prompt(rx: &mut tokio::sync::mpsc::UnboundedReceiver<CollectorFrame>) -> (String, String) {
    match rx.try_recv().unwrap() {
        CollectorFrame::DelegatedPrompt {
            request_id, turn_id, ..
        } => (request_id, turn_id),
        other => panic!("{other:?}"),
    }
}
fn ended(w: &World, id: &str, seq: u64, turn: &str) {
    w.store
        .ingest(
            id,
            seq,
            &SessionBody::TurnEnded {
                turn_id: turn.into(),
                outcome: TurnOutcome::Completed,
                stop_reason: None,
                error: None,
            },
        )
        .unwrap();
}
fn pending(w: &World, id: &str, seq: u64, pending: &str, kind: PendingKind) -> hennery_sessions::store::Ingested {
    w.store.ingest_fact(id,seq,&SessionBody::PendingOpened{pending_id:pending.into(),indexed:Indexed{pending:Some(Box::new(PendingExtract{id:pending.into(),kind,option_ids:Some(vec!["allow".into()]),title:Some("question".into())})),..Default::default()},payload:json!({"message":"question","requestedSchema":{"type":"object","properties":{"ok":{"type":"boolean"}}}})}).unwrap()
}
fn answer() -> AnswerRequest {
    AnswerRequest::Elicitation {
        action: ElicitationAction::Accept,
        content: Some(json!({"ok":true})),
    }
}

#[test]
fn close_intent_at_either_endpoint_cancels_before_prompt_handoff() {
    for endpoint in ["parent", "child"] {
        let (w, p) = pair();
        ready(&w);
        let q = queue(&w, &p, "followup");
        let (h, mut rx) = connected();
        w.store.record_close_request(endpoint).unwrap();
        assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
        assert!(rx.try_recv().is_err());
        assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (0, 0));
        let(state,payload):(String,String)=raw(&w).query_row("SELECT o.state,q.payload FROM session_operations o JOIN session_dispatch_queue q USING(owner_id,operation_id) WHERE o.operation_id=?1",[q.operation_id],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();
        assert_eq!(state, "cancelled");
        assert!(payload.is_empty());
    }
}
#[test]
fn automatic_resume_accepts_only_genuinely_parked_and_ready_host() {
    for (lifecycle, presumed, close, host_ready, expected) in [
        ("parked", false, false, true, true),
        ("parked", true, false, true, false),
        ("closed", false, false, true, false),
        ("failed", false, false, true, false),
        ("active", false, false, true, false),
        ("parked", false, true, true, false),
        ("parked", false, false, false, false),
    ] {
        let (w, p) = pair();
        ready(&w);
        queue(&w, &p, "followup");
        let (h, mut rx) = connected();
        raw(&w)
            .execute(
                "UPDATE sessions SET lifecycle=?1,presumed_parked=?2,close_requested=?3 WHERE id='child'",
                params![lifecycle, presumed, close],
            )
            .unwrap();
        if !host_ready {
            h.unregister("host", h.routable_conn("host").unwrap());
        }
        let old_hash: String = raw(&w)
            .query_row(
                "SELECT token_hash FROM gw_session_tokens WHERE session_id='child'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let old_watch = w.revocations.watch(&old_hash);
        assert!(!old_watch.token().is_cancelled());
        assert_eq!(
            w.store
                .attach_delegated("child", McpContext::NONE, &catalog(), &h)
                .unwrap(),
            expected,
            "{lifecycle} {presumed} {close} {host_ready}"
        );
        assert_eq!(old_watch.token().is_cancelled(), expected);
        if expected {
            assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "starting");
            assert!(matches!(rx.try_recv().unwrap(), CollectorFrame::DelegatedAttach { .. }));
        } else {
            assert!(rx.try_recv().is_err());
            assert_eq!(w.store.find_session("child").unwrap().unwrap().close_requested, close);
        }
    }
}
#[test]
fn automatic_resume_invalidates_stored_proof_until_new_complete_generation() {
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "followup");
    let (h, mut rx) = connected();
    w.store
        .ingest(
            "child",
            3,
            &SessionBody::SessionParked {
                reason: ParkReason::Idle,
            },
        )
        .unwrap();
    assert!(
        w.store
            .attach_delegated("child", McpContext::NONE, &catalog(), &h)
            .unwrap()
    );
    let generation = match rx.try_recv().unwrap() {
        CollectorFrame::DelegatedAttach { attach_generation, .. } => attach_generation,
        other => panic!("{other:?}"),
    };
    assert_eq!(generation, 6);
    let old: Option<String> = raw(&w)
        .query_row(
            "SELECT evidence FROM session_attach_evidence WHERE session_id='child'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(old.is_none());
    w.store
        .ingest("child", 4, &SessionBody::session_started("resume", "agent-child"))
        .unwrap();
    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    for (seq, generation, complete) in [
        (5, 5, ConfigCompleteness::Complete),
        (6, 6, ConfigCompleteness::Partial),
        (7, 6, ConfigCompleteness::Unknown),
    ] {
        proof(&w, "child", seq, generation, seq, complete, config("wanted"));
        assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
        assert!(rx.try_recv().is_err());
    }
    proof(&w, "child", 8, 6, 8, ConfigCompleteness::Complete, config("wanted"));
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    take_prompt(&mut rx);
}
#[test]
fn required_model_mode_and_axes_hold_mismatch_then_current_repair_releases() {
    for field in ["model", "mode", "effort"] {
        let (w, p) = pair();
        let required = SessionConfig {
            model: Some("wanted".into()),
            mode: Some("plan".into()),
            axes: BTreeMap::from([("effort".into(), ConfigValue::Id("high".into()))]),
        };
        seed(&w, "child", &required, 5);
        let mut wrong = required.clone();
        match field {
            "model" => wrong.model = Some("other".into()),
            "mode" => wrong.mode = Some("default".into()),
            _ => {
                wrong.axes.insert("effort".into(), ConfigValue::Id("low".into()));
            }
        }
        proof(&w, "child", 2, 5, 10, ConfigCompleteness::Complete, wrong.clone());
        queue(&w, &p, "followup");
        let (h, mut rx) = connected();
        assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap(), "{field}");
        assert_eq!(receipt(&w, &p, "followup").state, OperationState::WaitingConfig);
        let status = w.store.child_status(&p, 1, "child", None).unwrap();
        assert_eq!(status.requested, required);
        assert_eq!(status.actual, Some(wrong));
        proof(&w, "child", 3, 5, 11, ConfigCompleteness::Complete, required);
        assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
        take_prompt(&mut rx);
    }
}
#[test]
fn stale_config_evidence_cannot_overwrite_current_proof_and_config_changes_clear_it() {
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "followup");
    let (h, mut rx) = connected();
    proof(&w, "child", 3, 5, 9, ConfigCompleteness::Complete, config("wrong"));
    proof(&w, "child", 4, 4, 11, ConfigCompleteness::Complete, config("wrong"));
    assert_eq!(
        w.store.child_status(&p, 1, "child", None).unwrap().actual,
        Some(config("wanted"))
    );
    raw(&w)
        .execute("UPDATE sessions SET model='changed' WHERE id='child'", [])
        .unwrap();
    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    assert!(rx.try_recv().is_err());
    proof(&w, "child", 5, 5, 11, ConfigCompleteness::Complete, config("wanted"));
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    take_prompt(&mut rx);
}
#[test]
fn execution_policy_is_rechecked_and_current_revision_is_bound_to_dispatch() {
    let (w, p) = pair();
    let mut required = config("wanted");
    required.mode = Some("default".into());
    seed(&w, "child", &required, 5);
    proof(&w, "child", 2, 5, 10, ConfigCompleteness::Complete, required);
    let q = queue(&w, &p, "followup");
    let (h, mut rx) = connected();
    let mut c = catalog();
    c.security
        .axes
        .insert("mode".into(), vec![ConfigValue::Id("default".into())]);
    let policy = BTreeMap::from([(
        "claude".into(),
        BTreeMap::from([("mode".into(), vec![ConfigValue::Id("plan".into())])]),
    )]);
    assert_eq!(w.store.set_execution_policy(&w.hat, &policy).unwrap().revision, 1);
    assert!(!w.store.dispatch_delegated("child", &c, &h).unwrap());
    assert!(rx.try_recv().is_err());
    assert_eq!(
        w.store
            .set_execution_policy(&w.hat, &Default::default())
            .unwrap()
            .revision,
        2
    );
    assert!(w.store.dispatch_delegated("child", &c, &h).unwrap());
    take_prompt(&mut rx);
    let validated: (i64, i64, i64) = raw(&w)
        .query_row(
            "SELECT validated_attach,validated_config,validated_policy FROM session_operations WHERE operation_id=?1",
            [q.operation_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(validated, (5, 10, 2));
}

#[test]
fn collector_restart_preserves_receipts_and_operation_key_namespace_across_tools() {
    let (w, p) = pair();
    let first = w
        .store
        .queue_spawn(
            &p,
            1,
            "spawn-digest",
            &hennery_sessions::delegation_queue::DelegatedLaunch {
                key: "shared",
                agent: "claude",
                cwd: "/project",
                brief: "brief",
                name: None,
                config: &config("wanted"),
                mcp: McpContext::NONE,
            },
        )
        .unwrap();
    let child = first.child_id.clone().unwrap();
    let reopened = Store::open(&w.db).unwrap();
    assert_eq!(
        reopened.delegation_retry(&p, 1, "shared", "spawn-digest").unwrap(),
        Some(first.clone())
    );
    assert_eq!(reopened.delegation_receipt(&p, 1, "shared").unwrap(), Some(first));
    assert!(
        reopened
            .queue_followup(&p, 1, "shared", "send-digest", &child, "other")
            .unwrap_err()
            .to_string()
            .contains("operation_conflict")
    );
    assert!(
        reopened
            .queue_ordinary_answer(
                &p,
                1,
                "answer-digest",
                &hennery_sessions::delegation_control::DelegatedAnswer {
                    key: "shared",
                    child: &child,
                    pending: "missing",
                    answer: &answer()
                }
            )
            .unwrap_err()
            .to_string()
            .contains("operation_conflict")
    );
    let (h, mut rx) = connected();
    assert!(
        reopened
            .queue_child_close(&p, 1, "shared", "close-digest", &child, &h)
            .unwrap_err()
            .to_string()
            .contains("operation_conflict")
    );
    assert!(rx.try_recv().is_err());
    assert!(!reopened.find_session(&child).unwrap().unwrap().close_requested);
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT COUNT(*) FROM session_operations WHERE caller_id='parent'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        1
    );
}
#[test]
fn four_workers_reserve_one_turn_and_drain_fifo_after_factual_completion() {
    let (w, p) = pair();
    ready(&w);
    for i in 0..4 {
        queue(&w, &p, &format!("fifo-{i}"));
    }
    let (h, mut rx) = connected();
    let barrier = Arc::new(Barrier::new(4));
    let results = std::thread::scope(|scope| {
        let jobs: Vec<_> = (0..4)
            .map(|_| {
                let db = w.db.clone();
                let h = h.clone();
                let barrier = barrier.clone();
                scope.spawn(move || {
                    let s = Store::open(&db).unwrap();
                    barrier.wait();
                    s.dispatch_delegated("child", &catalog(), &h).unwrap()
                })
            })
            .collect();
        jobs.into_iter().map(|j| j.join().unwrap()).collect::<Vec<_>>()
    });
    assert_eq!(results.iter().filter(|sent| **sent).count(), 1);
    let (request, turn) = match rx.try_recv().unwrap() {
        CollectorFrame::DelegatedPrompt {
            request_id,
            turn_id,
            content,
            ..
        } => {
            assert!(content[0]["text"].as_str().unwrap().ends_with("fifo-0"));
            (request_id, turn_id)
        }
        other => panic!("{other:?}"),
    };
    assert!(rx.try_recv().is_err());
    assert_eq!(receipt(&w, &p, "fifo-0").state, OperationState::AwaitingReconciliation);
    w.store
        .ingest(
            "child",
            3,
            &SessionBody::TurnStarted {
                request_id: request,
                turn_id: turn.clone(),
            },
        )
        .unwrap();
    ended(&w, "child", 4, &turn);
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    match rx.try_recv().unwrap() {
        CollectorFrame::DelegatedPrompt { content, .. } => {
            assert!(content[0]["text"].as_str().unwrap().ends_with("fifo-1"))
        }
        other => panic!("{other:?}"),
    }
}
#[test]
fn queue_count_cap_is_atomic_for_four_workers() {
    let (w, p) = pair();
    let barrier = Arc::new(Barrier::new(4));
    let accepted = std::thread::scope(|scope| {
        let jobs: Vec<_> = (0..4)
            .map(|worker| {
                let db = w.db.clone();
                let p = p.clone();
                let barrier = barrier.clone();
                scope.spawn(move || {
                    let s = Store::open(&db).unwrap();
                    barrier.wait();
                    let mut accepted = 0;
                    for n in 0..20 {
                        let key = format!("worker-{worker}-{n}");
                        match s.queue_followup(&p, 1, &key, &key, "child", "é") {
                            Ok(_) => accepted += 1,
                            Err(e) => assert_eq!(e.to_string(), "queue_full"),
                        }
                    }
                    accepted
                })
            })
            .collect();
        jobs.into_iter().map(|j| j.join().unwrap()).sum::<usize>()
    });
    assert_eq!(accepted, 32);
    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (32, 64));
}
#[test]
fn queue_byte_limit_counts_utf8_bytes_and_oversized_message_is_rejected() {
    let (w, p) = pair();
    let text = "é".repeat(32768);
    for i in 0..16 {
        let key = format!("bytes-{i}");
        w.store.queue_followup(&p, 1, &key, &key, "child", &text).unwrap();
    }
    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (16, 1024 * 1024));
    assert_eq!(
        w.store
            .queue_followup(&p, 1, "overflow", "overflow", "child", "x")
            .unwrap_err()
            .to_string(),
        "queue_full"
    );
    assert_eq!(
        w.store
            .queue_followup(&p, 1, "oversized", "oversized", "child", &"x".repeat(65537))
            .unwrap_err()
            .to_string(),
        "invalid_arguments"
    );
}
#[test]
fn concurrent_identical_keys_create_one_durable_operation() {
    let (w, p) = pair();
    let barrier = Arc::new(Barrier::new(4));
    let receipts = std::thread::scope(|scope| {
        let jobs: Vec<_> = (0..4)
            .map(|_| {
                let db = w.db.clone();
                let p = p.clone();
                let barrier = barrier.clone();
                scope.spawn(move || {
                    let s = Store::open(&db).unwrap();
                    barrier.wait();
                    s.queue_followup(&p, 1, "same", "digest", "child", "same").unwrap()
                })
            })
            .collect();
        jobs.into_iter().map(|j| j.join().unwrap()).collect::<Vec<_>>()
    });
    assert!(receipts.iter().all(|r| r == &receipts[0]));
    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (1, 4));
}
fn spawn(w: &World, p: &SessionIdentity, key: &str) -> anyhow::Result<OperationReceipt> {
    w.store.queue_spawn(
        p,
        1,
        key,
        &hennery_sessions::delegation_queue::DelegatedLaunch {
            key,
            agent: "claude",
            cwd: "/project",
            brief: "brief",
            name: None,
            config: &SessionConfig::default(),
            mcp: McpContext::NONE,
        },
    )
}
fn user_turn_with_origin(w: &World, id: &str, seq: u64, turn: &str, origin: InputOrigin) {
    assert!(
        w.store
            .open_turn(id, turn, &[json!({"type":"text","text":"message"})])
            .unwrap()
    );
    raw(w)
        .execute(
            "UPDATE turns SET input_origin=?1 WHERE turn_id=?2",
            params![serde_json::to_string(&origin).unwrap(), turn],
        )
        .unwrap();
    w.store
        .ingest(
            id,
            seq,
            &SessionBody::TurnStarted {
                request_id: format!("request-{turn}"),
                turn_id: turn.into(),
            },
        )
        .unwrap();
    ended(w, id, seq + 1, turn);
}
#[test]
fn live_child_cap_and_one_generation_are_independent_of_runtime_choice() {
    let (w, p) = pair();
    for i in 0..7 {
        spawn(&w, &p, &format!("spawn-{i}")).unwrap();
    }
    assert_eq!(spawn(&w, &p, "ninth").unwrap_err().to_string(), "child_limit");
    let child_identity = w.start("nested-parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    let mut conn = raw(&w);
    let tx = conn.transaction().unwrap();
    assert!(w.store.bind_family_in(&tx, &p, 1, "nested-parent", 0).unwrap());
    tx.commit().unwrap();
    w.active("nested-parent");
    assert_eq!(
        spawn(&w, &child_identity, "grandchild").unwrap_err().to_string(),
        "generation_limit"
    );
}
#[test]
fn replacement_children_cannot_reset_starts_budget_or_parent_report_cannot_reset_epoch() {
    let (w, p) = pair();
    for i in 0..32 {
        let q = spawn(&w, &p, &format!("spawn-{i}")).unwrap();
        raw(&w)
            .execute(
                "UPDATE sessions SET lifecycle='closed' WHERE id=?1",
                [q.child_id.unwrap()],
            )
            .unwrap();
    }
    assert_eq!(spawn(&w, &p, "33rd").unwrap_err().to_string(), "start_budget");
    user_turn_with_origin(
        &w,
        "parent",
        2,
        "parent-data",
        InputOrigin::Parent {
            session_id: "foreign-parent".into(),
            operation_id: "report".into(),
        },
    );
    assert_eq!(spawn(&w, &p, "after-parent").unwrap_err().to_string(), "start_budget");
    user_turn_with_origin(
        &w,
        "parent",
        4,
        "child-data",
        InputOrigin::ChildReport {
            child_id: "child".into(),
            source_event_id: "source".into(),
            delivery_id: "delivery".into(),
        },
    );
    assert_eq!(spawn(&w, &p, "after-report").unwrap_err().to_string(), "start_budget");
    user_turn_with_origin(&w, "parent", 6, "operator", InputOrigin::Operator {});
    assert!(spawn(&w, &p, "new-operator-epoch").is_ok());
    let epochs: Vec<i64> = {
        let c = raw(&w);
        let mut s=c.prepare("SELECT DISTINCT epoch FROM session_operations WHERE caller_id='parent' AND tool='session_spawn' ORDER BY epoch").unwrap();
        s.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect()
    };
    assert_eq!(epochs.len(), 2);
    assert_eq!(epochs[0], 0);
    assert!(epochs[1] > 0);
}
#[test]
fn owned_child_checks_reject_owner_hat_sibling_ancestor_and_scope_changed_cursor() {
    let (w, p) = pair();
    let child_identity = w.start("sibling", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    let mut c = raw(&w);
    let tx = c.transaction().unwrap();
    assert!(w.store.bind_family_in(&tx, &p, 1, "sibling", 0).unwrap());
    tx.commit().unwrap();
    w.active("sibling");
    let unrelated = w.start("unrelated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.active("unrelated");
    let foreign = w.start("foreign-hat", &w.other, McpIsolation::ClaudeStrict).unwrap();
    w.active("foreign-hat");
    queue(&w, &p, "owned-key");
    assert!(
        w.store
            .delegation_receipt(&unrelated, 1, "owned-key")
            .unwrap()
            .is_none()
    );
    assert_eq!(
        w.store
            .child_status(&p, 1, "child", Some("owned-key"))
            .unwrap()
            .operations
            .len(),
        1
    );
    assert!(
        w.store
            .child_status(&p, 1, "sibling", Some("owned-key"))
            .unwrap()
            .operations
            .is_empty()
    );
    for target in ["parent", "unrelated", "foreign-hat", "missing"] {
        assert!(w.store.child_status(&p, 1, target, None).is_err(), "{target}");
        assert!(
            w.store
                .queue_followup(&p, 1, &format!("deny-{target}"), target, target, "hidden")
                .is_err()
        );
    }
    for target in ["parent", "child"] {
        assert!(w.store.child_status(&child_identity, 1, target, None).is_err());
    }
    assert!(w.store.child_status(&unrelated, 1, "child", None).is_err());
    assert!(w.store.child_status(&foreign, 1, "child", None).is_err());
    let mut owner = p.clone();
    owner.owner_id = "other-owner".into();
    assert!(w.store.child_status(&owner, 1, "child", None).is_err());
    let first = w.store.child_list(&p, 1, None, 1).unwrap();
    assert_eq!(first.children.len(), 1);
    let cursor = first.next_cursor.unwrap();
    let second = w.store.child_list(&p, 1, Some(&cursor), 1).unwrap();
    assert_eq!(second.children.len(), 1);
    assert_ne!(first.children[0].child_id, second.children[0].child_id);
    assert!(second.next_cursor.is_none());
    assert!(
        w.store
            .child_list(&unrelated, 1, Some(&cursor), 1)
            .unwrap_err()
            .to_string()
            .contains("invalid_cursor")
    );
    let (scope, last) = cursor.split_once('.').unwrap();
    for cursor in [
        format!("foreign.{last}"),
        format!("{scope}.{}", "x".repeat(129)),
        "malformed".into(),
    ] {
        assert_eq!(
            w.store.child_list(&p, 1, Some(&cursor), 1).unwrap_err().to_string(),
            "invalid_cursor"
        );
    }
    assert!(w.store.child_list(&p, 1, None, 0).is_err());
    assert!(w.store.child_list(&p, 1, None, 101).is_err());
}
#[test]
fn ordinary_answers_share_one_slot_under_four_worker_race() {
    let (w, p) = pair();
    pending(&w, "child", 2, "question", PendingKind::Elicitation);
    let barrier = Arc::new(Barrier::new(4));
    let accepted = std::thread::scope(|scope| {
        let jobs: Vec<_> = (0..4)
            .map(|i| {
                let db = w.db.clone();
                let p = p.clone();
                let barrier = barrier.clone();
                scope.spawn(move || {
                    let s = Store::open(&db).unwrap();
                    barrier.wait();
                    if i % 2 == 0 {
                        match s.queue_ordinary_answer(
                            &p,
                            1,
                            "digest",
                            &hennery_sessions::delegation_control::DelegatedAnswer {
                                key: &format!("parent-{i}"),
                                child: "child",
                                pending: "question",
                                answer: &answer(),
                            },
                        ) {
                            Ok(_) => 1,
                            Err(e) => {
                                assert_eq!(e.to_string(), "already_answered");
                                0
                            }
                        }
                    } else {
                        match s.submit_answer("child", "question", &answer()).unwrap() {
                            AnswerSubmission::Queued(_) => 1,
                            AnswerSubmission::AlreadyAnswered => 0,
                            other => panic!("{other:?}"),
                        }
                    }
                })
            })
            .collect();
        jobs.into_iter().map(|j| j.join().unwrap()).sum::<u32>()
    });
    assert_eq!(accepted, 1);
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT COUNT(*) FROM answer_queue WHERE pending_id='question'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        1
    );
}
#[test]
fn parent_close_frees_unhanded_answer_without_stealing_operator_slot() {
    let (w, p) = pair();
    pending(&w, "child", 2, "question", PendingKind::Elicitation);
    w.store
        .queue_ordinary_answer(
            &p,
            1,
            "digest",
            &hennery_sessions::delegation_control::DelegatedAnswer {
                key: "answer",
                child: "child",
                pending: "question",
                answer: &answer(),
            },
        )
        .unwrap();
    assert!(w.store.answers_to_send("host").unwrap().is_empty());
    assert!(matches!(
        w.store.submit_answer("child", "question", &answer()).unwrap(),
        AnswerSubmission::AlreadyAnswered
    ));
    w.store.record_close_request("parent").unwrap();
    assert!(matches!(
        w.store.submit_answer("child", "question", &answer()).unwrap(),
        AnswerSubmission::Queued(_)
    ));
    assert_eq!(w.store.answers_to_send("host").unwrap().len(), 1);
}
#[test]
fn permissions_are_operator_only_and_status_contains_no_answer_capable_schema() {
    let (w, p) = pair();
    pending(&w, "child", 2, "permission", PendingKind::Permission);
    assert_eq!(
        w.store
            .queue_ordinary_answer(
                &p,
                1,
                "digest",
                &hennery_sessions::delegation_control::DelegatedAnswer {
                    key: "permission",
                    child: "child",
                    pending: "permission",
                    answer: &answer()
                }
            )
            .unwrap_err()
            .to_string(),
        "operator_required"
    );
    let status = w.store.child_status(&p, 1, "child", None).unwrap();
    assert!(status.questions[0].operator_required);
    assert!(status.questions[0].question.is_none());
    assert!(matches!(
        w.store
            .submit_answer(
                "child",
                "permission",
                &AnswerRequest::Permission {
                    option_id: "allow".into()
                }
            )
            .unwrap(),
        AnswerSubmission::Queued(_)
    ));
}
#[test]
fn accepted_answer_is_not_delivered_until_factual_host_verdict_and_survives_source_close_after_handoff() {
    let (w, p) = pair();
    pending(&w, "child", 2, "question", PendingKind::Elicitation);
    w.store
        .queue_ordinary_answer(
            &p,
            1,
            "digest",
            &hennery_sessions::delegation_control::DelegatedAnswer {
                key: "answer",
                child: "child",
                pending: "question",
                answer: &answer(),
            },
        )
        .unwrap();
    let (h, mut rx) = connected();
    w.store.dispatch_delegation_answers(&h).unwrap();
    let request = match rx.try_recv().unwrap() {
        CollectorFrame::AnswerElicitation { request_id, .. } => request_id,
        other => panic!("{other:?}"),
    };
    assert_eq!(receipt(&w, &p, "answer").state, OperationState::AwaitingReconciliation);
    w.store.record_close_request("parent").unwrap();
    assert!(matches!(
        w.store.submit_answer("child", "question", &answer()).unwrap(),
        AnswerSubmission::AlreadyAnswered
    ));
    w.store
        .ingest(
            "child",
            3,
            &SessionBody::AnswerResult {
                pending_id: "question".into(),
                request_id: request,
                delivered: true,
            },
        )
        .unwrap();
    let state: String = raw(&w)
        .query_row(
            "SELECT state FROM session_operations WHERE caller_id='parent' AND operation_key='answer'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(state, "delivered");
    assert!(matches!(
        w.store.submit_answer("child", "question", &answer()).unwrap(),
        AnswerSubmission::AlreadyAnswered
    ));
}
#[test]
fn delivery_and_completion_follow_facts_not_handoff_and_late_rejection_is_ignored() {
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "followup");
    let (h, mut rx) = connected();
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    let (request, turn) = take_prompt(&mut rx);
    assert_eq!(
        receipt(&w, &p, "followup").state,
        OperationState::AwaitingReconciliation
    );
    assert!(!w.store.reject_delegation("foreign-host", &request).unwrap());
    w.store
        .ingest(
            "child",
            3,
            &SessionBody::TurnStarted {
                request_id: request.clone(),
                turn_id: turn.clone(),
            },
        )
        .unwrap();
    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Delivered);
    ended(&w, "child", 4, &turn);
    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Completed);
    assert!(!w.store.reject_delegation("host", &request).unwrap());
}
#[test]
fn proven_rejection_is_not_delivered_but_late_factual_start_can_reconcile() {
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "followup");
    let (h, mut rx) = connected();
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    let (request, turn) = take_prompt(&mut rx);
    assert!(w.store.reject_delegation("host", &request).unwrap());
    assert_eq!(receipt(&w, &p, "followup").state, OperationState::NotDelivered);
    assert!(w.store.find_session("child").unwrap().unwrap().open_turn_id.is_none());
    w.store
        .ingest(
            "child",
            3,
            &SessionBody::TurnStarted {
                request_id: request,
                turn_id: turn.clone(),
            },
        )
        .unwrap();
    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Delivered);
    ended(&w, "child", 4, &turn);
    assert_eq!(receipt(&w, &p, "followup").state, OperationState::Completed);
}
#[test]
fn typed_parent_provenance_does_not_reset_operator_push_epoch() {
    let (w, p) = pair();
    ready(&w);
    assert!(
        pending(&w, "child", 3, "first", PendingKind::Elicitation)
            .edge
            .is_some()
    );
    w.store
        .ingest(
            "child",
            4,
            &SessionBody::PendingResolved {
                pending_id: "first".into(),
                resolution: PendingResolution::Cancelled,
                reason: Some(PendingReason::AgentWithdrew),
            },
        )
        .unwrap();
    queue(&w, &p, "followup");
    let (h, mut rx) = connected();
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    let (request, turn) = take_prompt(&mut rx);
    w.store
        .ingest(
            "child",
            5,
            &SessionBody::TurnStarted {
                request_id: request,
                turn_id: turn.clone(),
            },
        )
        .unwrap();
    ended(&w, "child", 6, &turn);
    let events = w.store.events("child", 0, 100).unwrap();
    let event = events.iter().find(|e| e.kind == "user_turn").unwrap();
    assert_eq!(event.body["origin"]["kind"], "parent");
    assert_eq!(event.body["origin"]["session_id"], "parent");
    assert!(event.body["origin"]["operation_id"].is_string());
    assert!(
        pending(&w, "child", 7, "second", PendingKind::Elicitation)
            .edge
            .is_none()
    );
    w.store
        .ingest(
            "child",
            8,
            &SessionBody::PendingResolved {
                pending_id: "second".into(),
                resolution: PendingResolution::Cancelled,
                reason: Some(PendingReason::AgentWithdrew),
            },
        )
        .unwrap();
    queue(&w, &p, "followup-running");
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    let (request, turn) = take_prompt(&mut rx);
    w.store
        .ingest(
            "child",
            9,
            &SessionBody::TurnStarted {
                request_id: request,
                turn_id: turn,
            },
        )
        .unwrap();
    assert!(
        pending(&w, "child", 10, "third", PendingKind::Elicitation)
            .edge
            .is_none()
    );
    assert_eq!(
        w.store.find_session("child").unwrap().unwrap().activity.as_deref(),
        Some("blocked")
    );
}

fn persisted_state_case(stored: &str, code: Option<&str>, expected: OperationState) {
    let (w, p) = pair();
    let q = queue(&w, &p, "state");
    raw(&w)
        .execute(
            "UPDATE session_operations SET state=?1,code=?2 WHERE operation_id=?3",
            params![stored, code, q.operation_id],
        )
        .unwrap();
    assert_eq!(receipt(&w, &p, "state").state, expected);
}
macro_rules! receipt_case {
    ($name:ident,$stored:literal,$code:expr,$expected:expr) => {
        #[test]
        fn $name() {
            persisted_state_case($stored, $code, $expected);
        }
    };
}
receipt_case!(receipt_accepted, "accepted", None, OperationState::Accepted);
receipt_case!(
    receipt_waiting_config,
    "waiting_config",
    None,
    OperationState::WaitingConfig
);
receipt_case!(receipt_queued, "queued", None, OperationState::Queued);
receipt_case!(
    receipt_awaiting_reconciliation,
    "awaiting_reconciliation",
    None,
    OperationState::AwaitingReconciliation
);
receipt_case!(receipt_delivered, "delivered", None, OperationState::Delivered);
receipt_case!(receipt_completed, "completed", None, OperationState::Completed);
receipt_case!(
    receipt_not_delivered,
    "not_delivered",
    None,
    OperationState::NotDelivered
);
receipt_case!(receipt_cancelled, "cancelled", None, OperationState::Cancelled);
receipt_case!(
    receipt_failed_preserves_code,
    "failed",
    Some("adapter_failed"),
    OperationState::Failed {
        code: "adapter_failed".into()
    }
);
receipt_case!(
    receipt_failed_default_code,
    "failed",
    None,
    OperationState::Failed { code: "failed".into() }
);
receipt_case!(
    receipt_unknown_state_is_failure,
    "future_state",
    Some("future_failure"),
    OperationState::Failed {
        code: "future_failure".into()
    }
);
receipt_case!(
    receipt_failure_detail_is_redacted,
    "failed",
    Some("private provider failure text"),
    OperationState::Failed { code: "failed".into() }
);
#[test]
fn receipt_failure_code_is_bounded() {
    persisted_state_case(
        "failed",
        Some(&"x".repeat(129)),
        OperationState::Failed { code: "failed".into() },
    );
    persisted_state_case(
        "failed",
        Some(&"x".repeat(128)),
        OperationState::Failed { code: "x".repeat(128) },
    );
}
macro_rules! error_case {
    ($name:ident,$code:literal) => {
        #[test]
        fn $name() {
            assert_eq!(
                hennery_sessions::session_tools::error_code(&anyhow::anyhow!($code)),
                $code
            );
            assert_eq!(
                hennery_sessions::session_tools::error_code(&anyhow::anyhow!(concat!($code, " untrusted detail"))),
                "invalid_arguments"
            );
        }
    };
}
error_case!(error_not_found, "not_found");
error_case!(error_operation_conflict, "operation_conflict");
error_case!(error_operator_required, "operator_required");
error_case!(error_queue_full, "queue_full");
error_case!(error_child_limit, "child_limit");
error_case!(error_start_budget, "start_budget");
error_case!(error_generation_limit, "generation_limit");
error_case!(error_session_starting, "session_starting");
error_case!(error_runtime_unavailable, "runtime_unavailable");
error_case!(error_configuration_unavailable, "configuration_unavailable");
error_case!(error_session_tools_unavailable, "session_tools_unavailable");
error_case!(error_catalog_unavailable, "catalog_unavailable");
error_case!(error_catalog_stale, "catalog_stale");
error_case!(error_catalog_busy, "catalog_busy");
error_case!(error_host_offline, "host_offline");
error_case!(error_invalid_cwd, "invalid_cwd");
error_case!(error_not_open, "not_open");
error_case!(error_already_answered, "already_answered");
error_case!(error_invalid_arguments, "invalid_arguments");
error_case!(error_invalid_cursor, "invalid_cursor");
#[test]
fn error_unknown_details_are_opaque_fallback() {
    assert_eq!(
        hennery_sessions::session_tools::error_code(&anyhow::anyhow!("database/internal/arbitrary")),
        "invalid_arguments"
    );
}

#[test]
fn actual_foreign_owner_rows_receipts_and_queue_targets_remain_invisible() {
    let (w, p) = pair();
    let c = raw(&w);
    c.execute_batch("INSERT INTO owners(id,created_at,set_up_at) VALUES ('owner-other',9223372036854775807,9223372036854775807);
    INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('hat-other','owner-other','Other','#64748b',1);
    INSERT INTO hosts(id,owner_id,name,public_key,platform,host_version,default_hat_id,created_at) VALUES ('host-other','owner-other','Fixture','other-key','linux','0','hat-other',1);
    INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('parent-other','owner-other','host-other','hat-other','claude','/foreign','active','idle','0','0');
    INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('child-other','owner-other','host-other','hat-other','claude','/foreign','starting','idle','0','0');
    INSERT INTO session_families(owner_id,parent_id,child_id,root_id,hat_id,created_event_id) VALUES ('owner-other','parent-other','child-other','parent-other','hat-other',0);
    UPDATE sessions SET lifecycle='active' WHERE id='child-other';
    INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES ('owner-other','parent-other','guessed','foreign-operation','digest','session_send','child-other','queued','foreign-request');
    INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES ('owner-other','foreign-operation','parent-other','child-other',1,'private fixture','{}');").unwrap();
    assert_eq!(w.store.child_list(&p, 1, None, 100).unwrap().children.len(), 1);
    assert!(w.store.child_status(&p, 1, "child-other", None).is_err());
    assert!(w.store.delegation_receipt(&p, 1, "guessed").unwrap().is_none());
    assert!(w.store.delegation_targets().unwrap().is_empty());
    assert_eq!(w.store.delegation_queue_depth("child-other").unwrap(), (0, 0));
    assert!(!w.store.reject_delegation("host-other", "foreign-request").unwrap());
    assert_eq!(
        c.query_row(
            "SELECT COUNT(*) FROM session_dispatch_queue WHERE owner_id='owner-other'",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        1
    );
    assert_eq!(queue(&w, &p, "own").state, OperationState::Queued);
}
#[test]
fn historical_child_status_does_not_authorize_new_close_after_operator_reopens() {
    let (w, p) = pair();
    raw(&w)
        .execute("UPDATE sessions SET lifecycle='closed' WHERE id='child'", [])
        .unwrap();
    raw(&w)
        .execute(
            "UPDATE sessions SET lifecycle='active',activity='idle' WHERE id='child'",
            [],
        )
        .unwrap();
    assert!(w.store.child_status(&p, 1, "child", None).is_ok());
    let (h, mut rx) = connected();
    assert_eq!(
        w.store
            .queue_child_close(&p, 1, "new-close", "digest", "child", &h)
            .unwrap_err()
            .to_string(),
        "not_found"
    );
    assert!(rx.try_recv().is_err());
    assert!(!w.store.find_session("child").unwrap().unwrap().close_requested);
}
#[test]
fn child_identity_cannot_spawn_grandchildren_after_parent_deletion_removes_edge() {
    let w = World::new();
    let p = w.start("parent", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.active("parent");
    let identity = child(&w, &p, "child", &w.hat);
    raw(&w)
        .execute("UPDATE sessions SET lifecycle='deleted' WHERE id='parent'", [])
        .unwrap();
    assert_eq!(
        raw(&w)
            .query_row("SELECT COUNT(*) FROM session_families", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        0
    );
    assert_eq!(
        spawn(&w, &identity, "nested-after-delete").unwrap_err().to_string(),
        "generation_limit"
    );
}

#[test]
fn disabling_and_reenabling_grant_cancels_queue_without_reviving_old_token() {
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "followup");
    pending(&w, "child", 3, "grant-question", PendingKind::Elicitation);
    w.store
        .queue_ordinary_answer(
            &p,
            1,
            "digest",
            &hennery_sessions::delegation_control::DelegatedAnswer {
                key: "grant-answer",
                child: "child",
                pending: "grant-question",
                answer: &answer(),
            },
        )
        .unwrap();
    let (h, mut rx) = connected();
    w.gateway.set_session_tools(&w.hat, false).unwrap();
    w.gateway.set_session_tools(&w.hat, true).unwrap();
    assert_eq!(w.store.delegation_queue_depth("child").unwrap(), (0, 0));
    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    assert!(rx.try_recv().is_err());
    assert!(w.store.session_tool_context(&p, 1, true).unwrap().is_none());
    let states: Vec<String> = {
        let c = raw(&w);
        let mut stmt = c
            .prepare("SELECT state FROM session_operations WHERE caller_id='parent'")
            .unwrap();
        stmt.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect()
    };
    assert!(states.iter().all(|state| state == "cancelled"));
    let payload: String = raw(&w)
        .query_row(
            "SELECT payload FROM session_dispatch_queue WHERE source_id='parent'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(payload.is_empty());
    assert!(matches!(
        w.store.submit_answer("child", "grant-question", &answer()).unwrap(),
        AnswerSubmission::Queued(_)
    ));
    assert_eq!(
        w.store
            .queue_followup(&p, 1, "later", "later", "child", "later")
            .unwrap_err()
            .to_string(),
        "not_found"
    );
}

#[test]
fn current_path_rule_blocks_cross_hat_allocation_and_queued_dispatch() {
    use hennery_kernel::hats::{NewRule, RulesChange};
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "followup");
    let hosts = Hosts::open(&w.db).unwrap();
    assert!(matches!(
        hosts
            .replace_path_rules(
                "host",
                &[NewRule {
                    prefix: "/other".into(),
                    hat_id: w.other.clone(),
                    verified: true
                }]
            )
            .unwrap(),
        RulesChange::Done(_)
    ));
    assert_eq!(
        w.store
            .queue_spawn(
                &p,
                1,
                "digest",
                &hennery_sessions::delegation_queue::DelegatedLaunch {
                    key: "foreign-cwd",
                    agent: "claude",
                    cwd: "/other",
                    brief: "brief",
                    name: None,
                    config: &SessionConfig::default(),
                    mcp: McpContext::NONE
                }
            )
            .unwrap_err()
            .to_string(),
        "not_found"
    );
    assert!(matches!(
        hosts
            .replace_path_rules(
                "host",
                &[NewRule {
                    prefix: "/project".into(),
                    hat_id: w.other.clone(),
                    verified: true
                }]
            )
            .unwrap(),
        RulesChange::Done(_)
    ));
    let (h, mut rx) = connected();
    assert!(!w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    assert!(rx.try_recv().is_err());
}

#[test]
fn evidence_validator_requires_each_independent_proof_field() {
    use hennery_proto::delegation_status::ExecutionPolicy;
    use hennery_sessions::delegation_runtime::evidence_satisfies;
    let required = SessionConfig {
        model: Some("wanted".into()),
        mode: Some("default".into()),
        axes: BTreeMap::from([("effort".into(), ConfigValue::Id("high".into()))]),
    };
    let mut c = catalog();
    c.security.axes.insert(
        "mode".into(),
        vec![ConfigValue::Id("default".into()), ConfigValue::Id("plan".into())],
    );
    let policy = ExecutionPolicy {
        revision: 2,
        allowed: Default::default(),
    };
    let good = ConfigEvidence {
        attach_generation: 7,
        config_revision: 2,
        completeness: ConfigCompleteness::Complete,
        actual: required.clone(),
    };
    assert!(evidence_satisfies(&good, 7, &required, &c, &policy));
    for field in ["generation", "revision", "partial", "unknown", "model", "mode", "axis"] {
        let mut bad = good.clone();
        match field {
            "generation" => bad.attach_generation = 6,
            "revision" => bad.config_revision = 0,
            "partial" => bad.completeness = ConfigCompleteness::Partial,
            "unknown" => bad.completeness = ConfigCompleteness::Unknown,
            "model" => bad.actual.model = Some("other".into()),
            "mode" => bad.actual.mode = Some("plan".into()),
            _ => {
                bad.actual.axes.insert("effort".into(), ConfigValue::Id("low".into()));
            }
        }
        assert!(!evidence_satisfies(&bad, 7, &required, &c, &policy), "{field}");
    }
    let mut unknown = c.clone();
    unknown.security.known = false;
    unknown
        .security
        .axes
        .insert("effort".into(), vec![ConfigValue::Id("high".into())]);
    assert!(!evidence_satisfies(&good, 7, &required, &unknown, &policy));
    let mut forbidden = c.clone();
    forbidden
        .security
        .axes
        .insert("mode".into(), vec![ConfigValue::Id("plan".into())]);
    assert!(!evidence_satisfies(&good, 7, &required, &forbidden, &policy));
}

#[test]
fn endpoint_and_family_transition_each_cancel_and_scrub_undispatched_transfer() {
    for transition in ["endpoint", "family"] {
        let (w, p) = pair();
        ready(&w);
        queue(&w, &p, "followup");
        if transition == "endpoint" {
            // Isolate endpoint cleanup from the independently tested family hook.
            raw(&w).execute_batch("DROP TRIGGER delegation_family_end;").unwrap();
            w.store.record_close_request("child").unwrap();
            let proof: Option<String> = raw(&w)
                .query_row(
                    "SELECT evidence FROM session_attach_evidence WHERE session_id='child'",
                    [],
                    |r| r.get(0),
                )
                .unwrap();
            assert!(proof.is_none());
        } else {
            raw(&w)
                .execute(
                    "UPDATE session_families SET detached=1,reason='reassigned' WHERE child_id='child'",
                    [],
                )
                .unwrap();
        }
        let (operation,queue,payload):(String,String,String)=raw(&w).query_row("SELECT o.state,q.state,q.payload FROM session_operations o JOIN session_dispatch_queue q USING(owner_id,operation_id) WHERE o.operation_key='followup'",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap();
        assert_eq!(operation, "cancelled", "{transition}");
        assert_eq!(queue, "cancelled", "{transition}");
        assert!(payload.is_empty(), "{transition}");
    }
}

#[test]
fn parent_close_receipt_waits_for_confirmed_child_close_and_retry_sends_nothing() {
    let (w, p) = pair();
    let (h, mut rx) = connected();
    let accepted = w
        .store
        .queue_child_close(&p, 1, "close", "digest", "child", &h)
        .unwrap();
    assert_eq!(accepted.state, OperationState::AwaitingReconciliation);
    assert!(matches!(rx.try_recv().unwrap(),CollectorFrame::CloseSession{session_id,..} if session_id=="child"));
    assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "active");
    assert!(w.store.find_session("child").unwrap().unwrap().close_requested);
    w.store.ingest("child", 2, &SessionBody::SessionClosed).unwrap();
    let completed = receipt(&w, &p, "close");
    assert_eq!(completed.state, OperationState::Completed);
    assert_eq!(
        w.store
            .queue_child_close(&p, 1, "close", "digest", "child", &h)
            .unwrap(),
        completed
    );
    assert!(rx.try_recv().is_err());
    assert_eq!(w.store.find_session("parent").unwrap().unwrap().lifecycle, "active");
}

#[test]
fn deleted_endpoint_scrubs_handed_payload_and_required_config_and_removes_evidence() {
    let (w, p) = pair();
    ready(&w);
    queue(&w, &p, "delete");
    let (h, mut rx) = connected();
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    take_prompt(&mut rx);
    let before: (String, String) = raw(&w)
        .query_row("SELECT payload,required_config FROM session_dispatch_queue", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .unwrap();
    assert!(!before.0.is_empty());
    assert!(before.1.contains("wanted"));
    // Exercise the deletion hook independently of prior close/settlement hooks.
    raw(&w)
        .execute("UPDATE sessions SET lifecycle='deleted' WHERE id='child'", [])
        .unwrap();
    let remaining: i64 = raw(&w)
        .query_row("SELECT COUNT(*) FROM session_dispatch_queue", [], |r| r.get(0))
        .unwrap();
    assert_eq!(remaining, 0);
    let evidence_count: i64 = raw(&w)
        .query_row(
            "SELECT COUNT(*) FROM session_attach_evidence WHERE session_id='child'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(evidence_count, 0);
}

fn delete_endpoint(w: &World, id: &str) {
    use hennery_sessions::store::{Deletion, Unattached};
    let current = w.store.find_session(id).unwrap().unwrap();
    assert!(matches!(
        w.store
            .delete_session(
                id,
                Some(&Unattached {
                    lifecycle: current.lifecycle,
                    presumed_parked: current.presumed_parked,
                })
            )
            .unwrap(),
        Deletion::Done { .. }
    ));
}

fn stored_operation(w: &World, operation: &str) -> serde_json::Value {
    let row: String = raw(w).query_row(
        "SELECT json_object('owner_id',owner_id,'caller_id',caller_id,'operation_key',operation_key,
        'operation_id',operation_id,'digest',digest,'tool',tool,'child_id',child_id,'state',state,'code',code,
        'turn_id',turn_id,'pending_id',pending_id,'request_id',request_id,'accepted_revision',accepted_revision,
        'epoch',epoch,'validated_attach',validated_attach,'validated_config',validated_config,'validated_policy',validated_policy)
        FROM session_operations WHERE operation_id=?1",
        [operation], |r| r.get(0)
    ).unwrap();
    serde_json::from_str(&row).unwrap()
}

#[test]
fn deleted_target_keeps_only_opaque_gone_dedup_and_spawn_retry_never_allocates() {
    for prior in ["queued", "delivered", "completed"] {
        let (w, p) = pair();
        let accepted = w
            .store
            .queue_spawn(
                &p,
                1,
                "digest-private",
                &hennery_sessions::delegation_queue::DelegatedLaunch {
                    key: "old-spawn",
                    agent: "claude",
                    cwd: "/project/private",
                    brief: "private brief",
                    name: Some("private title"),
                    config: &config("private-model"),
                    mcp: McpContext::NONE,
                },
            )
            .unwrap();
        let target = accepted.child_id.as_deref().unwrap();
        w.active(target);
        proof(
            &w,
            target,
            2,
            1,
            9,
            ConfigCompleteness::Complete,
            config("private-model"),
        );
        raw(&w)
            .execute(
                "UPDATE session_operations SET state=?1,turn_id='private-turn',pending_id='private-question',
            request_id='private-request',accepted_revision=7,epoch=11,validated_attach=13,validated_config=17,
            validated_policy=19 WHERE operation_id=?2",
                params![prior, accepted.operation_id],
            )
            .unwrap();
        let before: (i64, i64) = raw(&w)
            .query_row(
                "SELECT (SELECT COUNT(*) FROM sessions),
            (SELECT COUNT(*) FROM session_operations)",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        delete_endpoint(&w, target);
        assert_eq!(
            stored_operation(&w, &accepted.operation_id),
            json!({
                "owner_id":w.store.owner_id(),"caller_id":"parent","operation_key":"old-spawn",
                "operation_id":accepted.operation_id,"digest":"digest-private","tool":"","child_id":null,
                "state":"failed","code":"gone","turn_id":null,"pending_id":null,"request_id":null,
                "accepted_revision":0,"epoch":0,"validated_attach":null,"validated_config":null,"validated_policy":null
            }),
            "{prior}"
        );
        let gone = receipt(&w, &p, "old-spawn");
        assert_eq!(gone.operation_id, accepted.operation_id);
        assert_eq!(gone.child_id, None);
        assert_eq!(gone.turn_id, None);
        assert_eq!(gone.pending_id, None);
        assert_eq!(gone.state, OperationState::Failed { code: "gone".into() });
        let retry = w
            .store
            .queue_spawn(
                &p,
                1,
                "digest-private",
                &hennery_sessions::delegation_queue::DelegatedLaunch {
                    key: "old-spawn",
                    agent: "claude",
                    cwd: "/project/private",
                    brief: "private brief",
                    name: Some("private title"),
                    config: &config("private-model"),
                    mcp: McpContext::NONE,
                },
            )
            .unwrap();
        assert_eq!(retry, gone);
        assert_eq!(
            w.store.delegation_retry(&p, 1, "old-spawn", "digest-private").unwrap(),
            Some(gone)
        );
        assert_eq!(
            w.store
                .delegation_retry(&p, 1, "old-spawn", "different")
                .unwrap_err()
                .to_string(),
            "operation_conflict"
        );
        let after: (i64, i64) = raw(&w)
            .query_row(
                "SELECT (SELECT COUNT(*) FROM sessions),
            (SELECT COUNT(*) FROM session_operations)",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(after, before);
        let remaining: (i64, i64, i64) = raw(&w)
            .query_row(
                "SELECT
            (SELECT COUNT(*) FROM session_dispatch_queue WHERE source_id=?1 OR target_id=?1),
            (SELECT COUNT(*) FROM session_attach_evidence WHERE session_id=?1),
            (SELECT COUNT(*) FROM session_families WHERE parent_id=?1 OR child_id=?1)",
                [target],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(remaining, (0, 0, 0));
        assert_eq!(w.store.find_session("parent").unwrap().unwrap().lifecycle, "active");
        delete_endpoint(&w, "parent");
        assert_eq!(
            raw(&w)
                .query_row(
                    "SELECT COUNT(*) FROM session_operations WHERE operation_id=?1",
                    [&accepted.operation_id],
                    |r| r.get::<_, i64>(0)
                )
                .unwrap(),
            0
        );
    }
}

#[test]
fn deleting_caller_removes_receipts_and_queues_while_child_work_survives() {
    let (w, p) = pair();
    ready(&w);
    let delivered = queue(&w, &p, "delivered");
    let (h, mut rx) = connected();
    assert!(w.store.dispatch_delegated("child", &catalog(), &h).unwrap());
    let (_, turn) = take_prompt(&mut rx);
    queue(&w, &p, "queued");
    let unrelated = w.start("unrelated", &w.hat, McpIsolation::ClaudeStrict).unwrap();
    w.active("unrelated");
    child(&w, &unrelated, "unrelated-child", &w.hat);
    let kept = w
        .store
        .queue_followup(&unrelated, 1, "kept", "digest", "unrelated-child", "kept private")
        .unwrap();
    let kept_row = stored_operation(&w, &kept.operation_id);
    delete_endpoint(&w, "parent");
    let child = w.store.find_session("child").unwrap().unwrap();
    assert_eq!(child.lifecycle, "active");
    assert_eq!(child.open_turn_id, Some(turn));
    assert!(!child.close_requested);
    let remaining: (i64, i64, i64) = raw(&w)
        .query_row(
            "SELECT
        (SELECT COUNT(*) FROM session_operations WHERE caller_id='parent'),
        (SELECT COUNT(*) FROM session_dispatch_queue WHERE source_id='parent' OR target_id='parent'),
        (SELECT COUNT(*) FROM session_families WHERE parent_id='parent')",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(remaining, (0, 0, 0));
    assert_eq!(stored_operation(&w, &kept.operation_id), kept_row);
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT payload FROM session_dispatch_queue WHERE operation_id=?1",
                [&kept.operation_id],
                |r| r.get::<_, String>(0)
            )
            .unwrap(),
        "kept private"
    );
    assert!(w.store.delegation_receipt(&p, 1, "delivered").is_err());
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT COUNT(*) FROM session_operations WHERE operation_id=?1",
                [delivered.operation_id],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        0
    );
}

#[test]
fn only_gone_disposition_allows_retry_without_owned_child_reference() {
    let (w, p) = pair();
    let accepted = queue(&w, &p, "opaque");
    raw(&w)
        .execute(
            "UPDATE session_operations SET child_id=NULL WHERE operation_id=?1",
            [&accepted.operation_id],
        )
        .unwrap();
    for (state, code) in [("queued", "gone"), ("failed", "other")] {
        raw(&w)
            .execute(
                "UPDATE session_operations SET state=?1,code=?2 WHERE operation_id=?3",
                params![state, code, accepted.operation_id],
            )
            .unwrap();
        assert_eq!(
            w.store
                .delegation_retry(&p, 1, "opaque", "opaque")
                .unwrap_err()
                .to_string(),
            "not_found"
        );
    }
    raw(&w)
        .execute(
            "UPDATE session_operations SET state='failed',code='gone' WHERE operation_id=?1",
            [&accepted.operation_id],
        )
        .unwrap();
    let gone = w.store.delegation_retry(&p, 1, "opaque", "opaque").unwrap().unwrap();
    assert_eq!(gone.child_id, None);
    assert_eq!(gone.state, OperationState::Failed { code: "gone".into() });
}

#[test]
fn deleted_replacement_children_do_not_reset_starts_budget_and_caller_delete_removes_it() {
    let (w, p) = pair();
    for i in 0..32 {
        let accepted = spawn(&w, &p, &format!("deleted-spawn-{i}")).unwrap();
        delete_endpoint(&w, accepted.child_id.as_deref().unwrap());
    }
    assert_eq!(
        spawn(&w, &p, "33rd-after-delete").unwrap_err().to_string(),
        "start_budget"
    );
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT starts FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent' AND epoch=0",
                [w.store.owner_id()],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        32
    );
    user_turn_with_origin(&w, "parent", 2, "operator", InputOrigin::Operator {});
    assert!(spawn(&w, &p, "new-operator-epoch").is_ok());
    let epochs: Vec<(i64, i64)> = {
        let c = raw(&w);
        let mut s=c.prepare("SELECT epoch,starts FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent' ORDER BY epoch").unwrap();
        s.query_map([w.store.owner_id()], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .map(Result::unwrap)
            .collect()
    };
    assert_eq!(epochs.len(), 2);
    assert_eq!(epochs[0], (0, 32));
    assert!(epochs[1].0 > 0);
    assert_eq!(epochs[1].1, 1);
    w.store.record_close_request("parent").unwrap();
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT COUNT(*) FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent'",
                [w.store.owner_id()],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        2
    );
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT COUNT(*) FROM session_operations WHERE owner_id=?1 AND caller_id='parent'",
                [w.store.owner_id()],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        33
    );
    delete_endpoint(&w, "parent");
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT COUNT(*) FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent'",
                [w.store.owner_id()],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        0
    );
}

#[test]
fn starts_budget_last_slot_is_atomic_for_four_workers_after_target_deletion() {
    let (w, p) = pair();
    for i in 0..31 {
        let accepted = spawn(&w, &p, &format!("prefill-{i}")).unwrap();
        delete_endpoint(&w, accepted.child_id.as_deref().unwrap());
    }
    let barrier = Arc::new(Barrier::new(4));
    let accepted = std::thread::scope(|scope| {
        let jobs: Vec<_> = (0..4)
            .map(|i| {
                let db = w.db.clone();
                let identity = p.clone();
                let barrier = barrier.clone();
                scope.spawn(move || {
                    let store = Store::open(&db).unwrap();
                    barrier.wait();
                    match store.queue_spawn(
                        &identity,
                        1,
                        "digest",
                        &hennery_sessions::delegation_queue::DelegatedLaunch {
                            key: &format!("racing-{i}"),
                            agent: "claude",
                            cwd: "/project",
                            brief: "brief",
                            name: None,
                            config: &SessionConfig::default(),
                            mcp: McpContext::NONE,
                        },
                    ) {
                        Ok(_) => 1,
                        Err(error) => {
                            assert_eq!(error.to_string(), "start_budget");
                            0
                        }
                    }
                })
            })
            .collect();
        jobs.into_iter().map(|job| job.join().unwrap()).sum::<i32>()
    });
    assert_eq!(accepted, 1);
    assert_eq!(
        raw(&w)
            .query_row(
                "SELECT starts FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent' AND epoch=0",
                [w.store.owner_id()],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
        32
    );
}

#[test]
fn endpoint_deletion_preserves_unrelated_owner_commands_proof_and_budget() {
    for endpoint in ["parent", "child"] {
        let (w, p) = pair();
        ready(&w);
        queue(&w, &p, "own");
        spawn(&w, &p, "budget").unwrap();
        let c = raw(&w);
        c.execute_batch("INSERT INTO owners(id,created_at,set_up_at) VALUES ('owner-other',9223372036854775807,9223372036854775807);
        INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('hat-other','owner-other','Other','#64748b',1);
        INSERT INTO hosts(id,owner_id,name,public_key,platform,host_version,default_hat_id,created_at) VALUES ('host-other','owner-other','Fixture','other-key','linux','0','hat-other',1);
        INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('parent-other','owner-other','host-other','hat-other','claude','/foreign','active','idle','0','0');
        INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('child-other','owner-other','host-other','hat-other','claude','/foreign','starting','idle','0','0');
        INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES ('owner-other','parent-other','foreign-key','foreign-operation','digest','session_send','child-other','queued','foreign-request');
        INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES ('owner-other','foreign-operation','parent-other','child-other',7,'foreign private brief','{\"model\":\"foreign-model\"}');
        INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,config_revision,evidence,requested_config,request_id) VALUES ('owner-other','child-other',7,9,'{\"private\":\"proof\"}','{\"model\":\"foreign-model\"}','foreign-attach');
        INSERT INTO delegation_start_budgets(owner_id,caller_id,epoch,starts) VALUES ('owner-other','parent-other',0,23);").unwrap();
        let before = stored_operation(&w, "foreign-operation");
        delete_endpoint(&w, endpoint);
        assert_eq!(stored_operation(&w, "foreign-operation"), before);
        let preserved: (String, String, i64, String, String, i64, i64) = c
            .query_row(
                "SELECT q.payload,q.required_config,q.accepted_revision,
            e.evidence,e.requested_config,e.attach_generation,b.starts FROM session_dispatch_queue q
            JOIN session_attach_evidence e ON e.owner_id=q.owner_id AND e.session_id=q.target_id
            JOIN delegation_start_budgets b ON b.owner_id=q.owner_id AND b.caller_id=q.source_id
            WHERE q.owner_id='owner-other'",
                [],
                |r| {
                    Ok((
                        r.get(0)?,
                        r.get(1)?,
                        r.get(2)?,
                        r.get(3)?,
                        r.get(4)?,
                        r.get(5)?,
                        r.get(6)?,
                    ))
                },
            )
            .unwrap();
        assert_eq!(
            preserved,
            (
                "foreign private brief".into(),
                "{\"model\":\"foreign-model\"}".into(),
                7,
                "{\"private\":\"proof\"}".into(),
                "{\"model\":\"foreign-model\"}".into(),
                7,
                23
            )
        );
        assert_eq!(
            c.query_row(
                "SELECT COUNT(*) FROM delegation_start_budgets WHERE owner_id=?1 AND caller_id='parent'",
                [w.store.owner_id()],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
            i64::from(endpoint == "child")
        );
    }
}

#[test]
fn delegated_unattached_close_requires_unchanged_intent_lifecycle_and_presence() {
    use hennery_sessions::store::Unattached;
    for (guard, mutation) in [
        ("intent", "UPDATE sessions SET close_requested=0 WHERE id='child'"),
        ("lifecycle", "UPDATE sessions SET lifecycle='starting' WHERE id='child'"),
        ("presence", "UPDATE sessions SET presumed_parked=1 WHERE id='child'"),
    ] {
        let (w, _) = pair();
        w.store.record_close_request("child").unwrap();
        raw(&w).execute(mutation, []).unwrap();
        let before = w.store.find_session("child").unwrap().unwrap();
        let events_before: i64 = raw(&w)
            .query_row("SELECT COUNT(*) FROM events WHERE session_id='child'", [], |r| r.get(0))
            .unwrap();
        assert!(
            w.store
                .close_delegated_unattached(
                    "child",
                    &Unattached {
                        lifecycle: "active".into(),
                        presumed_parked: false
                    },
                )
                .unwrap()
                .is_empty(),
            "{guard}"
        );
        let after = w.store.find_session("child").unwrap().unwrap();
        assert_eq!(after.lifecycle, before.lifecycle, "{guard}");
        assert_eq!(after.close_requested, before.close_requested, "{guard}");
        assert_eq!(after.presumed_parked, before.presumed_parked, "{guard}");
        let events_after: i64 = raw(&w)
            .query_row("SELECT COUNT(*) FROM events WHERE session_id='child'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(events_after, events_before, "{guard}");
    }
    let (w, _) = pair();
    w.store.record_close_request("child").unwrap();
    w.store
        .close_delegated_unattached(
            "child",
            &Unattached {
                lifecycle: "active".into(),
                presumed_parked: false,
            },
        )
        .unwrap();
    assert_eq!(w.store.find_session("child").unwrap().unwrap().lifecycle, "closed");
}

#[test]
fn operator_resume_clears_delegated_close_intent_before_late_unattached_verdict() {
    use hennery_sessions::store::{ResumeRequest, Unattached};
    let (w, _) = pair();
    w.store
        .ingest(
            "child",
            2,
            &SessionBody::SessionParked {
                reason: ParkReason::Idle,
            },
        )
        .unwrap();
    w.store.record_close_request("child").unwrap();
    let judged = Unattached {
        lifecycle: "parked".into(),
        presumed_parked: false,
    };
    assert!(matches!(
        w.store.request_resume("child", &w.hat).unwrap(),
        ResumeRequest::Starting { .. }
    ));
    assert!(w.store.close_delegated_unattached("child", &judged).unwrap().is_empty());
    let resumed = w.store.find_session("child").unwrap().unwrap();
    assert_eq!(resumed.lifecycle, "starting");
    assert!(!resumed.close_requested);
}

#[test]
fn target_pages_bound_progress_and_wrap_without_foreign_or_settled_rows() {
    let (w, _) = pair();
    let mut c = raw(&w);
    let tx = c.transaction().unwrap();
    for i in 0..133 {
        let id = if i < 131 {
            format!("target-{i:03}")
        } else {
            format!("hidden-{i}")
        };
        let state = if i == 131 {
            "cancelled"
        } else if i == 132 {
            "settled"
        } else if i % 2 == 0 {
            "queued"
        } else {
            "waiting_config"
        };
        tx.execute("INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES (?1,?2,'host',?3,'claude','/project','active','idle','0','0')",params![id,w.store.owner_id(),w.hat]).unwrap();
        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES (?1,'parent',?2,?2,'digest','session_send',?2,'queued',?2)",params![w.store.owner_id(),id]).unwrap();
        tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config,state) VALUES (?1,?2,'parent',?2,1,'fixture','{}',?3)",params![w.store.owner_id(),id,state]).unwrap();
    }
    tx.execute_batch("INSERT INTO owners(id,created_at,set_up_at) VALUES ('owner-other',9223372036854775807,9223372036854775807);
    INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('hat-other','owner-other','Other','#64748b',1);
    INSERT INTO hosts(id,owner_id,name,public_key,platform,host_version,default_hat_id,created_at) VALUES ('host-other','owner-other','Fixture','other-key','linux','0','hat-other',1);
    INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,activity,created_at,last_event_at) VALUES ('foreign-first','owner-other','host-other','hat-other','claude','/foreign','active','idle','0','0');
    INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,request_id) VALUES ('owner-other','foreign-first','foreign','foreign-operation','digest','session_send','foreign-first','queued','foreign-request');
    INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES ('owner-other','foreign-operation','foreign-first','foreign-first',1,'fixture','{}');").unwrap();
    tx.commit().unwrap();
    let first = w.store.delegation_targets_after("").unwrap();
    assert_eq!(first, (0..128).map(|i| format!("target-{i:03}")).collect::<Vec<_>>());
    let second = w.store.delegation_targets_after(first.last().unwrap()).unwrap();
    assert_eq!(second, ["target-128", "target-129", "target-130"]);
    assert!(
        w.store
            .delegation_targets_after(second.last().unwrap())
            .unwrap()
            .is_empty()
    );
    assert_eq!(w.store.delegation_targets_after("").unwrap(), first);
}
