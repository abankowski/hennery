//! Single-flight refresh (gateway spec §4.4, §4.5).
//!
//! - **One lock per connection** (`Runtime::lock`). Under it the stored
//!   grant is read again: if its access token already differs from the one
//!   that failed, that one is used, and nothing is sent (G-13's other half).
//!   A counter shares failed attempts too; transient failures back off,
//!   and invalid_grant permanently retires the token under the sealed-blob CAS.
//! - **A started refresh runs to completion and persists**, whatever the
//!   caller does: it runs as a task of its own, which the caller awaits; a
//!   caller that goes away drops the wait, not the task. It is bounded by
//!   `Runtime::refresh_timeout` (20 s) at the vendor (G-11).
//! - **Refresh never sets `needs_auth`** (G-12, Task 10): a valid access
//!   token remains usable on failure. The forwarding path records actual
//!   authentication failure, on expiry or a refusal after a 401.
//! - **Outcomes are distinct** (`Refreshed`): a token to retry with; nothing
//!   to refresh; the vendor refused (retire the refresh token); the vendor could not be
//!   reached; the result could not be stored (502, no `needs_auth`: a click
//!   cannot fix a disk).
//! - **The write is a compare-and-swap** on the blob read
//!   (`GatewayStore::store_refreshed`), so an edit that deleted the grant
//!   meanwhile is never undone.
//! - **`resource`** is sent on refresh as the grant recorded it (G-10); a
//!   server answering `invalid_target` is asked once more without it, and
//!   that is recorded (`resource_param_accepted`).
//! - **A token comes with where it goes** (`Fresh`): the URL and the
//!   allowance read with it, in the same statement. The grant used may be
//!   another than the one that failed (stored meanwhile by a Connect after
//!   an origin edit), so a caller sends it only where it was granted for
//!   (plan 8f decision 13).

use crate::model::{GrantTokens, OauthCredential};
use crate::oauth::{self, Grant, TokenError};
use crate::runtime::Runtime;
use crate::scope::CredentialStamp;
use crate::store::RefreshedGrant;
use hennery_kernel::secret::unix_now;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::Instant;
use zeroize::Zeroizing;

/// How close to its expiry an access token is refreshed before use
/// (gateway spec §4.4: at most 5 minutes, and half its usable lifetime).
pub const PROACTIVE: i64 = 5 * 60;

pub const BACKOFF_INITIAL: Duration = Duration::from_secs(30);
/// Bound vendor pressure, while allowing recovery before the next
/// 15-minute background probe. Decision 20, confirmed 2026-10-13.
pub const BACKOFF_MAX: Duration = Duration::from_secs(5 * 60);

fn backoff_delay(failures: u32) -> Duration {
    BACKOFF_INITIAL
        .saturating_mul(1_u32.checked_shl(failures.saturating_sub(1)).unwrap_or(u32::MAX))
        .min(BACKOFF_MAX)
}

#[derive(Clone)]
struct Attempt {
    sealed: Vec<u8>,
    outcome: Refreshed,
    permanent: bool,
    failures: u32,
    retry_after: Option<Instant>,
}

#[derive(Default)]
struct AttemptState {
    counter: AtomicU64,
    last: Mutex<Option<Attempt>>,
}

#[derive(Default)]
pub(crate) struct Attempts {
    slots: Mutex<HashMap<String, Arc<AttemptState>>>,
}

impl Attempts {
    pub(crate) fn clear(&self, id: &str) {
        if let Some(state) = self
            .slots
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .remove(id)
        {
            // Also wipe a cache still referenced by a queued caller.
            state
                .last
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .take();
        }
    }

    fn slot(&self, id: &str) -> Arc<AttemptState> {
        self.slots
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .entry(id.to_string())
            .or_default()
            .clone()
    }
}

/// Every token error has one failure verdict; no vendor body becomes
/// stored state. Only invalid_grant retires the token; other errors back off.
#[derive(Debug, PartialEq, Eq)]
enum Failure {
    Refused,
    Unavailable,
}

fn classify(error: &TokenError) -> Failure {
    match error {
        TokenError::Refused {
            error: Some("invalid_grant"),
            status: 400,
        } => Failure::Refused,
        TokenError::Refused { .. } | TokenError::InvalidTarget => Failure::Unavailable,
        TokenError::Unavailable | TokenError::EgressRefused(_) | TokenError::Invalid => Failure::Unavailable,
    }
}

/// An access token with the upstream it was granted for, read together.
/// Its `Debug` shows no token.
#[derive(Clone, PartialEq, Eq)]
pub struct Fresh {
    pub access_token: Zeroizing<String>,
    pub url: String,
    pub internal_network: bool,
    pub(crate) stamp: CredentialStamp,
}

impl Fresh {
    fn of(credential: &OauthCredential, access_token: Zeroizing<String>) -> Self {
        Self {
            access_token,
            url: credential.url.clone(),
            internal_network: credential.internal_network,
            stamp: credential.stamp(),
        }
    }
}

/// What a refresh came to.
#[derive(Clone, PartialEq, Eq)]
pub enum Refreshed {
    /// An access token to use: a fresh one, or one another refresh (or a
    /// Connect) stored meanwhile, with where it goes.
    Retry(Fresh),
    /// Nothing to refresh: no grant, or one without a refresh token.
    NotRefreshable,
    /// The vendor refused the refresh; its token is retired. A still
    /// valid access token can be used without changing status.
    Refused(CredentialStamp),
    /// The vendor could not be reached, or did not answer in time.
    Unavailable,
    /// The vendor answered, but the result could not be stored.
    Unsaved,
}

impl std::fmt::Debug for Refreshed {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Retry(_) => "Retry(<redacted>)",
            Self::NotRefreshable => "NotRefreshable",
            Self::Refused(_) => "Refused",
            Self::Unavailable => "Unavailable",
            Self::Unsaved => "Unsaved",
        })
    }
}

/// Whether an access token expiring at `expires_at` is to be refreshed
/// before it is used, at `now`.
pub fn due(expires_at: Option<i64>, issued_at: i64, now: i64) -> bool {
    expires_at.is_some_and(|at| {
        let lifetime = at.saturating_sub(issued_at).max(0);
        let lead = PROACTIVE.min(lifetime / 2);
        at <= now.saturating_add(lead)
    })
}

/// Refresh `connection_id`'s grant, single-flight. `failed` is the access
/// token the upstream refused (a 401), or `None` for a refresh before use
/// (it is then done only if still due).
pub async fn refresh(runtime: Arc<Runtime>, connection_id: String, failed: Option<Zeroizing<String>>) -> Refreshed {
    let id = connection_id.clone();
    let state = runtime.attempts.slot(&id);
    // Read before queuing on the lock, including before spawning the
    // cancellation-independent task. Waiters consume the completed attempt.
    let noted = state.counter.load(Ordering::Acquire);
    let task = tokio::spawn(async move {
        locked(
            &runtime,
            &connection_id,
            failed.as_deref().map(String::as_str),
            &state,
            noted,
        )
        .await
    });
    match task.await {
        Ok(outcome) => outcome,
        Err(err) => {
            tracing::error!(connection_id = %id, error = %err, "gateway: a refresh failed");
            Refreshed::Unavailable
        }
    }
}

async fn locked(runtime: &Runtime, id: &str, failed: Option<&str>, state: &AttemptState, noted: u64) -> Refreshed {
    let _guard = runtime.lock(id).await;
    let now = unix_now();
    let current = match runtime.store.oauth_credential(id, &runtime.key) {
        Ok(Some(current)) => current,
        Ok(None) => {
            runtime.attempts.clear(id);
            return Refreshed::NotRefreshable;
        }
        Err(err) => {
            tracing::error!(connection_id = %id, error = %err, "gateway: a grant could not be read");
            return Refreshed::Unsaved;
        }
    };
    let previous = state
        .last
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clone()
        .filter(|attempt| attempt.sealed == current.sealed);
    if let Some(attempt) = &previous {
        if state.counter.load(Ordering::Acquire) != noted
            && !matches!((&attempt.outcome, failed), (Refreshed::Retry(fresh), Some(failed))
                if fresh.access_token.as_str() == failed)
        {
            return attempt.outcome.clone();
        }
        if attempt.permanent || attempt.retry_after.is_some_and(|at| Instant::now() < at) {
            return attempt.outcome.clone();
        }
    }
    if current.tokens.refresh_dead {
        return Refreshed::Refused(current.stamp());
    }
    match failed {
        Some(failed) if current.tokens.access_token.as_str() != failed => {
            return Refreshed::Retry(Fresh::of(&current, current.tokens.access_token.clone()));
        }
        None if !due(current.expires_at, current.issued_at, now) => {
            return Refreshed::Retry(Fresh::of(&current, current.tokens.access_token.clone()));
        }
        _ => {}
    }
    let Some(refresh_token) = current.tokens.refresh_token.clone() else {
        return Refreshed::NotRefreshable;
    };
    let (outcome, permanent) = perform(runtime, id, &current, refresh_token).await;
    let failures = if matches!(outcome, Refreshed::Unavailable | Refreshed::Unsaved) {
        previous
            .as_ref()
            .map_or(1, |attempt| attempt.failures.saturating_add(1))
    } else {
        0
    };
    // A successful CAS changes the blob. Cache only for the grant now
    // stored, never carry an old grant's backoff across a reconnect.
    let sealed = runtime
        .store
        .oauth_credential(id, &runtime.key)
        .ok()
        .flatten()
        .filter(|credential| match &outcome {
            Refreshed::Retry(fresh) => {
                credential.tokens.access_token == fresh.access_token
                    && credential.url == fresh.url
                    && credential.internal_network == fresh.internal_network
            }
            Refreshed::Refused(_) => credential.tokens.refresh_dead,
            _ => false,
        })
        .map_or_else(|| current.sealed.clone(), |credential| credential.sealed);
    *state.last.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some(Attempt {
        sealed,
        outcome: outcome.clone(),
        permanent,
        failures,
        retry_after: (failures > 0).then(|| Instant::now() + backoff_delay(failures)),
    });
    state.counter.fetch_add(1, Ordering::Release);
    outcome
}

fn reread(runtime: &Runtime, id: &str) -> Refreshed {
    match runtime.store.oauth_credential(id, &runtime.key) {
        Ok(Some(current)) => Refreshed::Retry(Fresh::of(&current, current.tokens.access_token.clone())),
        Ok(None) => Refreshed::NotRefreshable,
        Err(_) => Refreshed::Unsaved,
    }
}

async fn perform(
    runtime: &Runtime,
    id: &str,
    current: &OauthCredential,
    refresh_token: Zeroizing<String>,
) -> (Refreshed, bool) {
    let client = runtime.client(current.internal_network);
    let resource = if current.resource_param_accepted {
        current.resource.as_deref()
    } else {
        None
    };
    let grant = Grant::Refresh {
        refresh_token: &refresh_token,
        scopes: &current.scopes,
    };
    let sent = tokio::time::timeout(runtime.refresh_timeout, async {
        match oauth::token(&client, &current.client, &grant, resource).await {
            Err(TokenError::InvalidTarget) if resource.is_some() => {
                (oauth::token(&client, &current.client, &grant, None).await, false)
            }
            other => (other, current.resource_param_accepted),
        }
    })
    .await;
    let (issued, accepted) = match sent {
        Ok(sent) => sent,
        Err(_) => {
            tracing::warn!(connection_id = %id, "gateway: a refresh timed out");
            return (Refreshed::Unavailable, false);
        }
    };
    match issued {
        Ok(issued) => {
            let expires_at = oauth::expires_at(unix_now(), issued.expires_in);
            // A response without a refresh token keeps the old one (§4.4).
            let tokens = GrantTokens {
                access_token: issued.access_token,
                refresh_token: issued.refresh_token.or(Some(refresh_token)),
                refresh_dead: false,
            };
            let refreshed = RefreshedGrant {
                tokens: &tokens,
                expires_at,
                resource_param_accepted: accepted,
            };
            let outcome = match runtime
                .store
                .store_refreshed(id, current, &refreshed, &runtime.key, unix_now())
            {
                Ok(true) => {
                    tracing::info!(connection_id = %id, "gateway: a grant was refreshed");
                    reread(runtime, id)
                }
                // Changed meanwhile (an edit deleted it): use what is there.
                Ok(false) => reread(runtime, id),
                Err(err) => {
                    tracing::error!(connection_id = %id, error = %err, "gateway: a refreshed grant could not be stored");
                    Refreshed::Unsaved
                }
            };
            (outcome, false)
        }
        Err(err) => match classify(&err) {
            Failure::Refused => {
                tracing::warn!(connection_id = %id, why = %err.message(), "gateway: the vendor refused a refresh");
                let mut tokens = current.tokens.clone();
                tokens.refresh_token = None;
                tokens.refresh_dead = true;
                let retired = RefreshedGrant {
                    tokens: &tokens,
                    expires_at: current.expires_at,
                    resource_param_accepted: current.resource_param_accepted,
                };
                match runtime
                    .store
                    .store_refreshed_observed(id, current, &retired, &runtime.key, unix_now())
                {
                    Ok(Some(stamp)) => (Refreshed::Refused(stamp), true),
                    Ok(None) => (reread(runtime, id), false),
                    Err(err) => {
                        tracing::error!(connection_id = %id, error = %err, "gateway: the dead refresh token could not be stored");
                        // Still never resend this token in this runtime; a
                        // disk failure cannot be repaired by reconnecting.
                        (Refreshed::Unsaved, true)
                    }
                }
            }
            Failure::Unavailable => {
                tracing::warn!(connection_id = %id, why = %err.message(), "gateway: a refresh did not reach the vendor");
                (Refreshed::Unavailable, false)
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refusal_classifier_retires_only_invalid_grant() {
        for (status, error, expected) in [
            (302, None, Failure::Unavailable),
            (302, Some("invalid_grant"), Failure::Unavailable),
            (400, None, Failure::Unavailable),
            (400, Some("invalid_request"), Failure::Unavailable),
            (400, Some("temporarily_unavailable"), Failure::Unavailable),
            (401, None, Failure::Unavailable),
            (401, Some("invalid_grant"), Failure::Unavailable),
            (403, None, Failure::Unavailable),
            (403, Some("invalid_grant"), Failure::Unavailable),
            (404, None, Failure::Unavailable),
            (404, Some("invalid_grant"), Failure::Unavailable),
            (408, None, Failure::Unavailable),
            (400, Some("invalid_client"), Failure::Unavailable),
            (400, Some("unauthorized_client"), Failure::Unavailable),
            (400, Some("invalid_grant"), Failure::Refused),
        ] {
            assert_eq!(
                classify(&TokenError::Refused { error, status }),
                expected,
                "HTTP {status}: {error:?}"
            );
        }
        assert_eq!(classify(&TokenError::InvalidTarget), Failure::Unavailable);
    }

    #[test]
    fn unavailable_classifier_backs_off_every_transient_error() {
        for error in [
            TokenError::Unavailable,
            TokenError::Invalid,
            TokenError::EgressRefused("refused".into()),
        ] {
            assert_eq!(classify(&error), Failure::Unavailable);
        }
    }

    #[test]
    fn backoff_starts_at_thirty_seconds_and_saturates_at_five_minutes() {
        for (failure, seconds) in [
            (1, 30),
            (2, 60),
            (3, 120),
            (4, 240),
            (5, 300),
            (32, 300),
            (u32::MAX, 300),
        ] {
            assert_eq!(backoff_delay(failure), Duration::from_secs(seconds));
        }
    }
    #[test]
    fn committed_credential_changes_erase_cached_refresh_outcomes() {
        use crate::model::{AuthMethod, Change, CredKind, GrantTokens, NewConnection, TokenClient};
        use crate::notify::Silent;
        use crate::scope::ProxyStore;
        use crate::store::{ClientSource, GatewayStore, GrantToStore, RefreshedGrant};
        use hennery_kernel::egress::{Egress, Timeouts};
        use hennery_kernel::hosts::Hosts;
        for action in ["delete", "purge", "static", "connect", "refresh", "kind"] {
            let dir = tempfile::tempdir().unwrap();
            let db = dir.path().join("hennery.db");
            let hosts = Hosts::open(&db).unwrap();
            let store = Arc::new(GatewayStore::open(&db).unwrap());
            let key = Arc::new(crate::key::MasterKey::from_bytes([7; 32]));
            let runtime = Runtime::new(
                store.clone(),
                Arc::new(ProxyStore::open(&db).unwrap()),
                key.clone(),
                Egress::new(Timeouts {
                    connect: Duration::from_secs(2),
                    request: Duration::from_secs(10),
                })
                .unwrap(),
                Arc::new(Silent),
            );
            let hat = hosts.default_hat_for_new_hosts().unwrap();
            let kind = if action == "static" {
                CredKind::Static
            } else {
                CredKind::OauthDcr
            };
            let url = "https://mcp.vendor.example/mcp";
            let Change::Done(record) = store
                .create(
                    &NewConnection {
                        slug: "cached".into(),
                        label: "Cached".into(),
                        url: url.into(),
                        hat_id: hat.clone(),
                        cred_kind: kind,
                        static_header: None,
                        static_prefix: None,
                        tool_allowlist: None,
                        internal_network: false,
                    },
                    1,
                )
                .unwrap()
            else {
                panic!("connection not created")
            };
            let id = record.id;
            let client = TokenClient {
                client_id: "seeded".into(),
                secret: None,
                auth_method: AuthMethod::None,
                token_endpoint: "https://auth.vendor.example/token".into(),
            };
            let tokens = GrantTokens {
                access_token: Zeroizing::new("access".into()),
                refresh_token: Some(Zeroizing::new("refresh".into())),
                refresh_dead: false,
            };
            let grant = GrantToStore {
                connection_id: &id,
                url,
                cred_kind: kind,
                internal_network: false,
                source: ClientSource::Registered,
                client: &client,
                issuer: "https://auth.vendor.example",
                authorization_endpoint: "https://auth.vendor.example/authorize",
                redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                scopes: &[],
                resource: url,
                resource_param_accepted: true,
                registered_at: 1,
                tokens: &tokens,
                expires_at: None,
            };
            if action == "static" {
                store.set_static_credential(&id, "initial", &key, 1).unwrap();
            } else {
                assert!(matches!(
                    store.store_grant(&grant, &key, 1).unwrap(),
                    crate::store::GrantStored::Stored(_)
                ));
            }
            let state = runtime.attempts.slot(&id);
            *state.last.lock().unwrap() = Some(Attempt {
                sealed: vec![],
                outcome: Refreshed::Retry(Fresh {
                    access_token: Zeroizing::new("cached-plaintext-canary".into()),
                    stamp: CredentialStamp::new(kind, Some(vec![])),
                    url: url.into(),
                    internal_network: false,
                }),
                permanent: false,
                failures: 0,
                retry_after: None,
            });
            let other = runtime.attempts.slot("other-connection");
            match action {
                "delete" => {
                    assert!(store.delete(&id).unwrap());
                }
                "purge" => {
                    runtime.revocations.cut(store.purge_hat(&hat).unwrap());
                }
                "static" => {
                    // The UPDATE succeeds but its deferred FK fails at commit:
                    // a rollback must preserve the old cache and credential.
                    let raw = hennery_kernel::db::open(&db).unwrap();
                    raw.execute_batch("CREATE TABLE commit_guard (connection_id TEXT REFERENCES gw_connections(id) DEFERRABLE INITIALLY DEFERRED);
                        CREATE TRIGGER fail_commit AFTER UPDATE ON gw_credentials BEGIN INSERT INTO commit_guard VALUES ('missing-connection'); END;").unwrap();
                    assert!(store.set_static_credential(&id, "rejected", &key, 2).is_err());
                    assert!(Arc::ptr_eq(&runtime.attempts.slot(&id), &state));
                    assert!(state.last.lock().unwrap().is_some());
                    raw.execute_batch("DROP TRIGGER fail_commit; DROP TABLE commit_guard;")
                        .unwrap();
                    store.set_static_credential(&id, "replacement", &key, 2).unwrap();
                }
                "connect" => {
                    assert!(matches!(
                        store.store_grant(&grant, &key, 2).unwrap(),
                        crate::store::GrantStored::Stored(_)
                    ));
                }
                "refresh" => {
                    let read = store.oauth_credential(&id, &key).unwrap().unwrap();
                    assert!(
                        store
                            .store_refreshed(
                                &id,
                                &read,
                                &RefreshedGrant {
                                    tokens: &tokens,
                                    expires_at: None,
                                    resource_param_accepted: true
                                },
                                &key,
                                2
                            )
                            .unwrap()
                    );
                }
                "kind" => {
                    assert!(matches!(
                        store
                            .update(
                                &id,
                                &crate::model::ConnectionPatch {
                                    cred_kind: Some(CredKind::None),
                                    ..Default::default()
                                },
                                2
                            )
                            .unwrap(),
                        Change::Done(_)
                    ));
                }
                _ => unreachable!(),
            }
            assert!(
                !runtime.attempts.slots.lock().unwrap().contains_key(&id),
                "{action}: slot stays cached"
            );
            assert!(
                state.last.lock().unwrap().is_none(),
                "{action}: retained state still holds plaintext"
            );
            assert!(
                Arc::ptr_eq(&runtime.attempts.slot("other-connection"), &other),
                "unrelated slot remains"
            );
        }
    }
}
