use hennery_proto::frames::{AgentIsolation, Capabilities, CollectorFrame, SessionBody};
use hennery_sessions::{content, hub::Hub, store::Store};
use serde_json::json;

#[test]
fn closing_or_failing_with_an_unacknowledged_head_retains_it_as_failed() {
    for close in [false, true] {
        let store = Store::open_in_memory().unwrap();
        store.create_session("s", "h", "fake", "/project", "hat", None).unwrap();
        store
            .ingest("s", 1, &SessionBody::session_started("start", "agent"))
            .unwrap();
        let checked = content::check(vec![json!({"type":"text","text":"retain uncertain head"})]).unwrap();
        let head = store.enqueue_operator_prompt("s", &checked).unwrap();
        let tail = store.enqueue_operator_prompt("s", &checked).unwrap();
        let hub = Hub::new();
        let (tx, mut frames) = tokio::sync::mpsc::unbounded_channel();
        let host = hub
            .register("h", tx, Capabilities::default(), AgentIsolation::default())
            .unwrap();
        hub.mark_ready("h", host.conn_id);
        assert!(store.dispatch_operator_prompt("s", &hub, &mut None, None).unwrap());
        assert!(frames.try_recv().is_ok());
        if close {
            store.close_now("s").unwrap();
        } else {
            store.mark_failed("s", "agent_not_logged_in").unwrap();
        }
        let queue = store.operator_prompt_queue("s").unwrap();
        assert_eq!(
            queue.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(),
            [head.as_str(), tail.as_str()]
        );
        for item in queue {
            assert_eq!(item.state, "failed");
            assert_eq!(item.content, checked.stored);
            assert!(
                item.reason
                    .as_deref()
                    .unwrap()
                    .contains(if close { "closed" } else { "signed out" })
            );
        }
        assert!(!store.dispatch_operator_prompt("s", &hub, &mut None, None).unwrap());
        assert!(frames.try_recv().is_err());
    }
}

#[test]
fn a_real_delivery_after_close_or_failure_repairs_the_failed_queue_item() {
    for close in [false, true] {
        let store = Store::open_in_memory().unwrap();
        store.create_session("s", "h", "fake", "/project", "hat", None).unwrap();
        store
            .ingest("s", 1, &SessionBody::session_started("start", "agent"))
            .unwrap();
        let checked = content::check(vec![json!({"type":"text","text":"actually delivered"})]).unwrap();
        let head = store.enqueue_operator_prompt("s", &checked).unwrap();
        let tail = store.enqueue_operator_prompt("s", &checked).unwrap();
        let hub = Hub::new();
        let (tx, mut frames) = tokio::sync::mpsc::unbounded_channel();
        let connection = hub
            .register("h", tx, Capabilities::default(), AgentIsolation::default())
            .unwrap();
        hub.mark_ready("h", connection.conn_id);
        assert!(store.dispatch_operator_prompt("s", &hub, &mut None, None).unwrap());
        let CollectorFrame::Prompt {
            request_id, turn_id, ..
        } = frames.try_recv().unwrap()
        else {
            panic!("prompt")
        };
        if close {
            store.close_now("s").unwrap();
        } else {
            store.mark_failed("s", "agent_not_logged_in").unwrap();
        }
        assert_eq!(store.operator_prompt_queue("s").unwrap()[0].id, head);
        let terminal = store.find_session("s").unwrap().unwrap();
        let delivered = SessionBody::TurnStarted {
            request_id,
            turn_id: turn_id.clone(),
        };
        store.ingest("s", 2, &delivered).unwrap();
        store.ingest("s", 3, &delivered).unwrap();
        assert_eq!(store.turn_state(&turn_id).unwrap().as_deref(), Some("started"));
        let queue = store.operator_prompt_queue("s").unwrap();
        assert_eq!(queue.len(), 1);
        assert_eq!(queue[0].id, tail);
        assert_eq!(queue[0].state, "failed");
        assert_eq!(
            store.find_session("s").unwrap().unwrap().lifecycle,
            if close { "closed" } else { "failed" }
        );
        let after = store.find_session("s").unwrap().unwrap();
        assert_eq!(after.open_turn_id, terminal.open_turn_id);
        assert_eq!(after.activity, terminal.activity);
        assert!(!store.dispatch_operator_prompt("s", &hub, &mut None, None).unwrap());
        let events = store.events("s", 0, 100).unwrap();
        assert_eq!(events.iter().filter(|e| e.kind == "user_turn").count(), 1);
    }
}
