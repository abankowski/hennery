use base64::{Engine, engine::general_purpose::STANDARD};
use hennery_proto::frames::{AgentIsolation, Capabilities, CollectorFrame, SessionBody};
use hennery_sessions::{
    content,
    hub::Hub,
    prompt_receipts::{PromptAdmission, PromptReceipt, PromptRequestKey},
    store::Store,
};
use serde_json::json;
use std::sync::{Arc, Barrier};

fn active(store: &Store) {
    store.create_session("s", "h", "fake", "/project", "hat", None).unwrap();
    store
        .ingest("s", 1, &SessionBody::session_started("start", "agent"))
        .unwrap();
}

fn checked(text: &str) -> content::Checked {
    content::check(vec![json!({"type":"text","text":text})]).unwrap()
}

#[test]
fn concurrent_queue_retries_allocate_one_item_and_receipt() {
    let store = Arc::new(Store::open_in_memory().unwrap());
    active(&store);
    let barrier = Barrier::new(3);
    let receipts = std::thread::scope(|threads| {
        let attempts: Vec<_> = (0..2)
            .map(|_| {
                threads.spawn(|| {
                    let prompt = checked("one submit");
                    let key = PromptRequestKey::new("concurrent", &prompt).unwrap();
                    barrier.wait();
                    store
                        .enqueue_operator_prompt_with_key("s", &prompt, Some(&key))
                        .unwrap()
                })
            })
            .collect();
        barrier.wait();
        attempts
            .into_iter()
            .map(|attempt| attempt.join().unwrap())
            .collect::<Vec<_>>()
    });
    assert_eq!(receipts[0], receipts[1]);
    assert_eq!(store.operator_prompt_queue("s").unwrap().len(), 1);
}

#[test]
fn concurrent_immediate_and_queue_admission_share_one_association() {
    let store = Arc::new(Store::open_in_memory().unwrap());
    active(&store);
    let prompt = checked("one submit");
    let key = PromptRequestKey::new("immediate-or-queued", &prompt).unwrap();
    let barrier = Barrier::new(3);
    let (opened, queued) = std::thread::scope(|threads| {
        let first = threads.spawn(|| {
            barrier.wait();
            match store
                .open_prompt_with_startup_and_key("s", "t", &prompt, &mut None, Some(&key))
                .unwrap()
            {
                PromptAdmission::Opened => PromptReceipt::Turn { turn_id: "t".into() },
                PromptAdmission::Existing(receipt) => receipt,
                PromptAdmission::MustQueue => panic!("no unrelated prompt was accepted"),
            }
        });
        let retry = threads.spawn(|| {
            barrier.wait();
            store
                .enqueue_operator_prompt_with_key("s", &prompt, Some(&key))
                .unwrap()
        });
        barrier.wait();
        (first.join().unwrap(), retry.join().unwrap())
    });
    assert_eq!(opened, queued);
    match opened {
        PromptReceipt::Turn { .. } => {
            assert_eq!(store.turn_state("t").unwrap().as_deref(), Some("sent"));
            assert!(store.operator_prompt_queue("s").unwrap().is_empty());
        }
        PromptReceipt::Queued { .. } => {
            assert!(store.turn_state("t").unwrap().is_none());
            assert_eq!(store.operator_prompt_queue("s").unwrap().len(), 1);
        }
    }
}

#[test]
fn a_retry_accepted_while_startup_is_pending_prevents_a_second_immediate_turn() {
    let store = Store::open_in_memory().unwrap();
    active(&store);
    let prompt = checked("same submit");
    let key = PromptRequestKey::new("startup-race", &prompt).unwrap();
    let _pending_startup = store.reserve_prompt("s").unwrap();
    assert!(store.reserve_prompt("s").is_none());
    let accepted = store
        .enqueue_operator_prompt_with_key("s", &prompt, Some(&key))
        .unwrap();
    let original = store
        .open_prompt_with_startup_and_key("s", "original", &prompt, &mut None, Some(&key))
        .unwrap();
    assert_eq!(original, PromptAdmission::Existing(accepted));
    assert!(store.turn_state("original").unwrap().is_none());
    assert_eq!(store.operator_prompt_queue("s").unwrap().len(), 1);
}

#[test]
fn a_delivered_queue_item_keeps_its_original_request_receipt() {
    let store = Store::open_in_memory().unwrap();
    active(&store);
    let prompt = checked("deliver once");
    let key = PromptRequestKey::new("delivered", &prompt).unwrap();
    let accepted = store
        .enqueue_operator_prompt_with_key("s", &prompt, Some(&key))
        .unwrap();
    let hub = Hub::new();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    let connection = hub
        .register("h", tx, Capabilities(vec![]), AgentIsolation::default())
        .unwrap();
    hub.mark_ready("h", connection.conn_id);
    assert!(store.dispatch_operator_prompt("s", &hub, &mut None, None).unwrap());
    let CollectorFrame::Prompt {
        request_id, turn_id, ..
    } = rx.try_recv().unwrap()
    else {
        panic!("expected prompt")
    };
    store
        .ingest("s", 2, &SessionBody::TurnStarted { request_id, turn_id })
        .unwrap();
    assert!(store.operator_prompt_queue("s").unwrap().is_empty());
    assert_eq!(store.prompt_receipt("s", &key).unwrap(), Some(accepted.clone()));
    assert_eq!(
        store
            .enqueue_operator_prompt_with_key("s", &prompt, Some(&key))
            .unwrap(),
        accepted
    );
    assert!(store.operator_prompt_queue("s").unwrap().is_empty());
    assert!(rx.try_recv().is_err());
}

#[test]
fn changing_an_image_under_the_same_key_is_a_conflict() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(&dir.path().join("hennery.db")).unwrap();
    active(&store);
    let image = |suffix: &[u8]| {
        let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
        png.extend_from_slice(suffix);
        content::check(vec![
            json!({"type":"image","mimeType":"image/png","data":STANDARD.encode(png)}),
        ])
        .unwrap()
    };
    let first = image(b"one");
    let key = PromptRequestKey::new("image", &first).unwrap();
    store.enqueue_operator_prompt_with_key("s", &first, Some(&key)).unwrap();
    let changed = image(b"two");
    let changed_key = PromptRequestKey::new("image", &changed).unwrap();
    let err = store
        .enqueue_operator_prompt_with_key("s", &changed, Some(&changed_key))
        .unwrap_err();
    assert_eq!(err.to_string(), "request_key_conflict");
    assert_eq!(store.operator_prompt_queue("s").unwrap().len(), 1);
}

#[test]
fn late_abandon_does_not_drop_an_accepted_turn_or_its_request_key() {
    let store = Store::open_in_memory().unwrap();
    active(&store);
    let prompt = checked("already accepted");
    let key = PromptRequestKey::new("accepted", &prompt).unwrap();
    assert_eq!(
        store
            .open_prompt_with_startup_and_key("s", "t", &prompt, &mut None, Some(&key))
            .unwrap(),
        PromptAdmission::Opened
    );
    store
        .ingest(
            "s",
            2,
            &SessionBody::TurnStarted {
                request_id: "r".into(),
                turn_id: "t".into(),
            },
        )
        .unwrap();
    store.abandon_turn("s", "t").unwrap();
    assert_eq!(store.turn_state("t").unwrap().as_deref(), Some("started"));
    assert_eq!(
        store.prompt_receipt("s", &key).unwrap(),
        Some(PromptReceipt::Turn { turn_id: "t".into() })
    );
}
