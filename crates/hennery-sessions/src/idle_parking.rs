//! Owner-wide automatic parking override. Snapshot and publication share the
//! store's owner gate so reconnect and concurrent saves cannot send stale state.
use crate::{AppState, hub::Hub, store::Store};
use anyhow::Result;
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::get,
};
use hennery_kernel::json::ApiJson;
use hennery_proto::{frames::CollectorFrame, rest::IdleParkingSettings};
use rusqlite::{OptionalExtension, params};

impl Store {
    pub fn idle_parking(&self) -> Result<IdleParkingSettings> {
        self.idle_parking_in(&self.conn())
    }

    fn idle_parking_in(&self, conn: &rusqlite::Connection) -> Result<IdleParkingSettings> {
        let value: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE owner_id = ?1 AND key = 'idle_timeout_secs'",
                [self.owner_id()],
                |r| r.get(0),
            )
            .optional()?;
        Ok(IdleParkingSettings {
            idle_timeout_secs: value.map(|s| s.parse()).transpose()?,
        })
    }

    pub fn set_idle_parking(&self, settings: IdleParkingSettings, hub: &Hub) -> Result<()> {
        let conn = self.conn();
        if let Some(seconds) = settings.idle_timeout_secs {
            conn.execute(
                "INSERT INTO settings(owner_id,key,value) VALUES (?1,'idle_timeout_secs',?2)
                 ON CONFLICT(owner_id,key) DO UPDATE SET value=excluded.value WHERE settings.owner_id = ?1",
                params![self.owner_id(), seconds.to_string()],
            )?;
        } else {
            conn.execute(
                "DELETE FROM settings WHERE owner_id = ?1 AND key = 'idle_timeout_secs'",
                [self.owner_id()],
            )?;
        }
        for host in hub.connected_hosts() {
            hub.notify(
                &host,
                CollectorFrame::SetIdleTimeout {
                    seconds: settings.idle_timeout_secs,
                },
            );
        }
        Ok(())
    }

    pub fn resend_idle_parking(&self, host: &str, hub: &Hub) -> Result<()> {
        let conn = self.conn();
        let settings = self.idle_parking_in(&conn)?;
        hub.notify(
            host,
            CollectorFrame::SetIdleTimeout {
                seconds: settings.idle_timeout_secs,
            },
        );
        Ok(())
    }
}

pub fn router(state: AppState) -> Router {
    // Same authorization as session pins: reversible operator preference.
    hennery_kernel::auth::operator_only(
        Router::new().route("/api/settings/idle-parking", get(read).put(write)),
        state.operator.clone(),
    )
    .layer(middleware::map_response(|mut response: Response| async move {
        response
            .headers_mut()
            .insert(axum::http::header::CACHE_CONTROL, "private, no-store".parse().unwrap());
        response
    }))
    .with_state(state)
}

async fn read(State(state): State<AppState>) -> Response {
    match state.store.idle_parking() {
        Ok(value) => Json(value).into_response(),
        Err(err) => internal(err),
    }
}

async fn write(State(state): State<AppState>, ApiJson(value): ApiJson<IdleParkingSettings>) -> Response {
    match state.store.set_idle_parking(value.clone(), &state.hub) {
        Ok(()) => Json(value).into_response(),
        Err(err) => internal(err),
    }
}

fn internal(err: anyhow::Error) -> Response {
    tracing::error!(%err, "idle parking settings failed");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(hennery_proto::rest::ApiError {
            code: "internal".into(),
            message: "idle parking settings unavailable".into(),
            session_id: None,
        }),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use hennery_proto::frames::{AgentIsolation, Capabilities, Capability};

    #[test]
    fn idle_parking_persists_and_restores_host_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.db");
        let hub = Hub::new();
        for value in [Some(90), Some(0), None] {
            let store = Store::open(&path).unwrap();
            store
                .set_idle_parking(
                    IdleParkingSettings {
                        idle_timeout_secs: value,
                    },
                    &hub,
                )
                .unwrap();
            drop(store);
            assert_eq!(
                Store::open(&path).unwrap().idle_parking().unwrap().idle_timeout_secs,
                value
            );
        }
    }

    #[test]
    fn idle_parking_is_scoped_to_the_owner() {
        let store = Store::open_in_memory().unwrap();
        {
            let conn = store.conn();
            conn.execute("INSERT INTO owners(id,created_at) VALUES ('other',0)", [])
                .unwrap();
            conn.execute(
                "INSERT INTO settings(owner_id,key,value) VALUES ('other','idle_timeout_secs','17')",
                [],
            )
            .unwrap();
        }
        assert_eq!(store.idle_parking().unwrap(), IdleParkingSettings::default());
        for value in [Some(0), None] {
            store
                .set_idle_parking(
                    IdleParkingSettings {
                        idle_timeout_secs: value,
                    },
                    &Hub::new(),
                )
                .unwrap();
            let other: String = store
                .conn()
                .query_row(
                    "SELECT value FROM settings WHERE owner_id = 'other' AND key='idle_timeout_secs'",
                    [],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(other, "17");
        }
    }

    #[test]
    fn idle_parking_publication_is_capability_gated_and_replayed_on_reconnect() {
        let store = Store::open_in_memory().unwrap();
        let hub = Hub::new();
        let mut receivers = Vec::new();
        for (host, capable, ready) in [("new", true, true), ("old", false, true), ("reconnecting", true, false)] {
            let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
            let registration = hub
                .register(
                    host,
                    tx,
                    Capabilities(if capable { vec![Capability::IdleTimeout] } else { vec![] }),
                    AgentIsolation::default(),
                )
                .unwrap();
            if ready {
                hub.mark_ready(host, registration.conn_id);
            }
            receivers.push((host, registration.conn_id, rx));
        }
        for value in [Some(90), Some(0), None] {
            store
                .set_idle_parking(
                    IdleParkingSettings {
                        idle_timeout_secs: value,
                    },
                    &hub,
                )
                .unwrap();
            assert!(
                matches!(receivers[0].2.try_recv().unwrap(), CollectorFrame::SetIdleTimeout { seconds } if seconds == value)
            );
            assert!(receivers[1].2.try_recv().is_err());
            assert!(receivers[2].2.try_recv().is_err());
            store.resend_idle_parking("new", &hub).unwrap();
            assert!(
                matches!(receivers[0].2.try_recv().unwrap(), CollectorFrame::SetIdleTimeout { seconds } if seconds == value)
            );
        }
        let (host, id, rx) = &mut receivers[2];
        hub.mark_ready(host, *id);
        store.resend_idle_parking(host, &hub).unwrap();
        assert!(matches!(
            rx.try_recv().unwrap(),
            CollectorFrame::SetIdleTimeout { seconds: None }
        ));
    }
}
