// Browser fixture: execute the real session-notification producer and privacy fold.
use hennery_kernel::{
    delivery::{padded, payload_for},
    push::PushPolicy,
};
use hennery_sessions::{
    notify::notice_for,
    store::{EdgeSession, PushEdge},
};
fn main() {
    let mut args = std::env::args().skip(1);
    let id = args.next().expect("session id");
    let pending_id = args.next().expect("pending id");
    assert!(args.next().is_none());
    let notice = notice_for(
        &PushEdge::Blocked {
            pending_id,
            title: None,
        },
        &EdgeSession {
            id,
            hat_id: "fixture-hat".into(),
            title: Some("Fixture session".into()),
            cwd: "/fixture".into(),
        },
    )
    .expect("question notice");
    let payload = payload_for(&notice, PushPolicy::default()).expect("unmuted fixture");
    println!(
        "{}",
        String::from_utf8(padded(&payload).expect("push JSON")).expect("UTF-8 push JSON")
    );
}
