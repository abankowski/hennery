//! Owner-scoped, monotonic observation of agent activity. Receipts never
//! answer a question or change session ordering.
use crate::{hub::Hub, store::Store};
use anyhow::Result;
use hennery_proto::{frames::SessionBody, rest::EventDto};
use hennery_view::api::UnseenActivity;
use rusqlite::{Connection, OptionalExtension, params};

pub(crate) fn record(conn: &Connection, owner: &str, session: &str, event: i64, body: &SessionBody) -> Result<()> {
    let meaningful = match body {
        SessionBody::AcpUpdate { payload, .. } => matches!(
            payload
                .pointer("/update/sessionUpdate")
                .and_then(serde_json::Value::as_str),
            Some("agent_message_chunk" | "agent_thought_chunk" | "tool_call" | "tool_call_update" | "plan")
        ),
        SessionBody::PendingOpened { .. } | SessionBody::TurnEnded { .. } | SessionBody::StartFailed { .. } => true,
        _ => false,
    };
    let empty_chunk = matches!(body, SessionBody::AcpUpdate { payload, .. }
        if payload.pointer("/update/content/text").and_then(serde_json::Value::as_str) == Some(""));
    if meaningful && !empty_chunk {
        conn.execute(
            "UPDATE sessions SET unseen_event_id = ?3 WHERE owner_id = ?1 AND id = ?2
             AND lifecycle<>'deleted' AND EXISTS(SELECT 1 FROM events e WHERE e.owner_id = ?1
                AND e.session_id = ?2 AND e.event_id = ?3 AND e.applied=1)",
            params![owner, session, event],
        )?;
    }
    Ok(())
}

pub(crate) fn unseen(conn: &Connection, owner: &str, session: &str) -> Result<Option<UnseenActivity>> {
    Ok(conn
        .query_row(
            "SELECT unseen_event_id FROM sessions s WHERE owner_id = ?1 AND id = ?2
         AND unseen_event_id>seen_event_id AND lifecycle<>'deleted'
         AND NOT EXISTS(SELECT 1 FROM purged_hats h WHERE h.owner_id = ?1 AND h.hat_id=s.hat_id)",
            params![owner, session],
            |r| Ok(UnseenActivity { event_id: r.get(0)? }),
        )
        .optional()?)
}

pub(crate) fn acknowledge_in(conn: &Connection, owner: &str, session: &str, event: i64) -> Result<usize> {
    Ok(conn.execute(
        "UPDATE sessions SET seen_event_id = min(unseen_event_id, ?3)
         WHERE owner_id = ?1 AND id = ?2 AND seen_event_id<min(unseen_event_id, ?3)",
        params![owner, session, event],
    )?)
}

pub(crate) fn receipt_in(conn: &Connection, owner: &str, session: &str, kind: &str, event: i64) -> Result<EventDto> {
    let ts = crate::store::stamp_ago(std::time::Duration::ZERO);
    let body = serde_json::json!({"event_id": event});
    conn.execute(
        "INSERT INTO events(owner_id,session_id,kind,body,ts) VALUES (?1,?2,?3,?4,?5)",
        params![owner, session, kind, body.to_string(), ts],
    )?;
    Ok(EventDto {
        event_id: conn.last_insert_rowid(),
        session_id: session.into(),
        host_seq: None,
        kind: kind.into(),
        body,
        ts,
    })
}

impl Store {
    /// A captured transcript cursor only. A late acknowledgement cannot consume
    /// later activity. Unknown, deleted, foreign and frozen sessions are hidden.
    pub fn mark_session_seen(&self, session: &str, event: i64, hub: &Hub) -> Result<Option<bool>> {
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let visible: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id = ?1 AND s.id = ?2
             AND s.lifecycle<>'deleted' AND NOT EXISTS(SELECT 1 FROM purged_hats h
                WHERE h.owner_id = ?1 AND h.hat_id=s.hat_id))",
            params![self.owner_id(), session],
            |r| r.get(0),
        )?;
        if !visible {
            return Ok(None);
        }
        let valid: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM events WHERE owner_id = ?1 AND session_id = ?2
             AND event_id = ?3 AND applied=1)",
            params![self.owner_id(), session, event],
            |r| r.get(0),
        )?;
        if !valid {
            return Ok(Some(false));
        }
        let changed = acknowledge_in(&tx, self.owner_id(), session, event)?;
        let review_changed = tx.execute(
            "UPDATE session_reviews SET read_event_id=event_id WHERE owner_id = ?1
             AND session_id = ?2 AND event_id<=?3 AND read_event_id<event_id",
            params![self.owner_id(), session, event],
        )?;
        let receipt = if changed > 0 || review_changed > 0 {
            Some(receipt_in(&tx, self.owner_id(), session, "session_seen", event)?)
        } else {
            None
        };
        tx.commit()?;
        drop(conn);
        if let Some(receipt) = receipt {
            hub.publish(receipt);
        }
        Ok(Some(true))
    }
}
