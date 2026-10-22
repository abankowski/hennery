# New like this Implementation Plan

**Goal:** Create and open a standalone empty session from the source session's last reported host, agent, canonical cwd, model, mode and every configuration axis. The action is available in the header and session-list ellipsis menus, including a row context click. The empty composer receives focus. No first prompt is sent.

**Base:** 7630ebc393a16656d0b3cb6a579321da122aa7f6. **Branch:** feat/new-like-this. One implementation task.

**Architecture:** A bodyless operator-only POST /api/sessions/{id}/new-like-this reads the existing owner-filtered SessionRow once, preserving its configuration snapshot. It reuses normal session start with an expected source hat, normal path resolution/MCP delivery and initial configuration tracking. NewLikeThisResponse returns the exact requested snapshot for existing client read-back. A shared React hook drives both menus, preserves known ids after failed/uncertain starts and fences navigation by view and sign-in lifetime. The list disclosure uses a portal to escape clipped project groups.

## Execution status

Built first in an isolated worktree. API and UI regressions were observed failing before implementation (four API tests; seven UI tests). A later host-refusal regression was RED before preserving the allocated session id. Targeted checks and real mobile/desktop browser checks pass. Replay, guard probes and final gates are recorded below. Independent review approved the implementation after the navigation amendment. PR #245 carries CI and merge; no deployed service was changed.

<!-- FINAL_EVIDENCE -->
- Independent whole-branch review by `review_new_like_this` found one Medium navigation defect: leaving and returning to the same URL revived a pending redirect. A per-operation sticky flag now observes the existing app/history navigation subscription and is cleaned up in finally. Four regressions (POST/read-back waits × app/history navigation) were RED, then green; removing the guard reproduced all four assertion failures in a separate copy. Scoped re-review approved the exact hook/test delta over `b0b772b4`, with no further actionable findings.
- After that amendment, typecheck, full web suite (**2,674 tests in 158 files**), build, embedded binary build and **2 real-browser cases** exited 0. The 17-test asynchronous UI set passed **4×3 load**, 204 executions and 12 suite invocations, all exit 0. Rust bytes are unchanged from the six successful replay gates; no redundant full workspace replay was run for this UI amendment. Total removal guards exercised: **13**.
- Implementation committed as `6e640cccfcef27e0145afae451ea3427d6885fa9` and pushed over SSH on `feat/new-like-this`. The parent review request covers `7630ebc3..6e640cccfcef27e0145afae451ea3427d6885fa9`; the follow-up documentation commit records this execution evidence only.
- All six Rust gates exited 0 in fresh replay 2: fmt, workspace/all-target clippy, production clippy, workspace tests, protocol generator and view generator. The workspace run passed **2,960 tests**, with **9 existing live/pinned tests ignored**, across 186 test-result summaries. It ran once; no full workspace run was spent on replay 1, which stopped at a needless borrow in the new test fixture.
- Web typecheck, full suite (**2,670 tests in 158 files**) and build exited 0 after the viewport amendment. The final menu error reset then passed typecheck, **91 targeted tests**, build and the real-browser acceptance again. Replay 2's earlier full web suite had 2,669 tests before the new viewport regression.
- Real browser acceptance passed **2 cases**, each exercising both menus: 390px/light and 1280px/dark. The collector/host/fake-adapter boundaries were real; resulting config matched the changed source despite conflicting hat defaults; closed-source creation worked; no prompt was submitted; the composer was empty and focused. Screenshots were visually inspected.
- **12 removal probes** in a separate cloned copy failed assertions. Covered source config/availability, the hat check, failed-start id, returned snapshot, single admission, view and sign-in lifetime, read-back, requested-value notice, focus request and viewport target typing. No probe failure was credited for a compile error.
- **4×3 load** passed for the asynchronous API/UI regression sets: 84 API and 144 UI test executions, 24 suite invocations, all exit 0. The later viewport case is synchronous and received its own RED/green/removal probe.
- The final patch reconstructs the staged tree from the base using a separate Git index, with **20 extracted implementation files** and the plan copied as its input document. All **1,169 tracked files** are compared with the replay. Final Rust source bytes match the complete Rust gate run; the small UI amendment is replayed and checked separately as described above.
- The viewport amendment was observed RED (Window is not a Node), fixed with a Node check and removal-probed. The source/header error is cleared when this new action starts, matching other menu actions.
- Scratch trees retained for parent cleanup: new-like-this-replay-1, new-like-this-replay-2 and new-like-this-probes-1. Logs and screenshots are under .superpowers/sdd/new-like-this/ in the implementation/replay/probe trees.
- Not run locally: unrelated Playwright suites, credentialed pinned/provider checks (the nine normal workspace skips), native Nix packaging or deployment. No adapter/runtime or package/dependency input changed. The parent is driving PR #245 through CI and merge using the personal GitHub account; child-only GitHub restrictions do not apply to that role.
<!-- END_FINAL_EVIDENCE -->

## Scope

One task: API response/action, shared UI action, header/list entry points, configuration confirmation, composer focus, regressions and spec updates. No migration, dependency, default-policy, adapter, delegation or release change.

## Decisions

1. Copy last reported settings rather than original launch requests or hat defaults. This includes deliberate false values and all axes, not only model/effort. The single source row is read before asynchronous host work.
2. Any source lifecycle with a reported agent session and nonempty configuration can be copied; missing, foreign and deleted sources are 404. Unknown settings are refused with configuration_unavailable instead of guessing agent defaults.
3. Resolve cwd normally and require the resolved hat to equal the source hat before allocation. MCP servers/tokens are computed for the new session from current rules; they are never copied.
4. Create a fresh ordinary session even when the source is a delegated child. History, title, family, queue and idle pin remain source-owned. No prompt is manufactured or submitted.
5. Check every copied value against actual post-start read-back. A mismatch opens the created session with a settings-review notice that never claims a draft prompt exists. Unsupported values are never silently replaced.
6. Reuse the allocated id after a host refusal or uncertain delivery. There is no automatic retry of session creation. Regular start responses keep their established shape/statuses.
7. Opening a known created session focuses its empty composer once and removes the focus flag. Leaving the initiating view or signing out prevents a late response from navigating over newer work.

## Global constraints

Use the flake dev shell; keep targets separate and APFS-clone them into replay/probe trees. Do not edit another lane or real data. GitHub actions use the parent's verified personal account. One full workspace test run and one fresh replay per plan; targeted timing/load checks for the asynchronous admission/navigation and HTTP start paths only. Parent owns independent review and merge. New docs carry the repository-required footer.

## Review focus

- Owner-filtered source lookup and same-hat check before allocation.
- Exact reported configuration including mode/security options and false axes, with no defaults merge.
- A fresh family/history/MCP identity and no first prompt.
- Known failed-start ids, no automatic double creation and visible unconfirmed settings.
- Authentication/navigation lifetime, keyboard disclosure, mobile touch target and unclipped popup.

## File structure

- crates/hennery-proto/src/codegen.rs
- crates/hennery-proto/src/rest.rs
- crates/hennery-sessions/src/api.rs
- crates/hennery-testkit/tests/resolve.rs
- docs/README.md
- docs/specs/2026-09-26-acp-core-design.md
- docs/specs/2026-09-26-frontend-design.md
- schema/hennery-protocol.schema.json
- web/e2e/new-like-this.spec.ts
- web/src/components/NewLikeThis.test.tsx
- web/src/components/SessionMenu.tsx
- web/src/components/SessionRow.test.tsx
- web/src/components/SessionRow.tsx
- web/src/components/SessionRowMenu.tsx
- web/src/generated/protocol.ts
- web/src/hooks/useNewLikeThis.ts
- web/src/lib/start.ts
- web/src/screens/Session.menu.test.tsx
- web/src/screens/Session.tsx
- web/src/styles/shell.css

## Task 1: create and open a new session like the selected session

- [x] Write regressions and observe API/UI RED on the base; observe RED for the host-refusal id regression.
- [x] Build the API/UI implementation and run targeted checks plus real browser acceptance.
- [x] Extract and apply the exact patch below onto the base in a fresh worktree; copy this plan as the replay input document. Verify the extractor found 20 files and compare all tracked bytes, including generated artifacts.
- [x] Run targeted removal probes in a separate cloned copy. Every mutation is restored only inside that disposable copy.
- [x] Run the web gates and all six Rust gates on the replay. Record actual exit statuses and test totals.
- [x] Commit and push the tested bytes; independent whole-branch review and scoped re-confirmation approved the final implementation.
- [ ] Parent: finish PR #245 CI and merge. Deployment/release is separate.

**Verification commands** (inside nix develop, from the replay root):

```sh
pnpm --dir web typecheck
pnpm --dir web test
pnpm --dir web build
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo clippy -p hennery --locked -- -D warnings
cargo test --workspace --locked
cargo run -p hennery-proto --bin gen --locked -- --check
cargo run -p hennery-view --bin gen-view --locked -- --check
```

**Browser acceptance**, already run against the real scratch collector, host and fake adapter after building the embedded UI:

```sh
cargo build -p hennery -p hennery-testkit --bins --locked
CI=1 pnpm --dir web exec playwright test e2e/new-like-this.spec.ts --project=chromium
```

Two viewport/theme cases exercise both entry points, a source changed after start, conflicting hat defaults, a closed source, exact resulting configuration, fresh title/family, no prompt, empty-composer focus and viewport geometry. Synthetic data only.

## Exact implementation patch

Apply the following unified diff with git apply. Its code wins over task prose. This plan itself is the replay input and is copied separately; all remaining tracked changes are contained in the patch.

```diff
diff --git a/crates/hennery-proto/src/codegen.rs b/crates/hennery-proto/src/codegen.rs
index 4bb60446..25ab710c 100644
--- a/crates/hennery-proto/src/codegen.rs
+++ b/crates/hennery-proto/src/codegen.rs
@@ -86,6 +86,7 @@ pub fn render_schema() -> String {
         frames::CollectorFrame,
         rest::StartSessionRequest,
         rest::StartSessionResponse,
+        rest::NewLikeThisResponse,
         rest::PromptRequest,
         rest::PromptResponse,
         rest::QueuedPromptResponse,
@@ -327,6 +328,7 @@ pub fn render_ts() -> String {
         frames::CollectorFrame,
         rest::StartSessionRequest,
         rest::StartSessionResponse,
+        rest::NewLikeThisResponse,
         rest::PromptRequest,
         rest::PromptResponse,
         rest::QueuedPromptResponse,
diff --git a/crates/hennery-proto/src/rest.rs b/crates/hennery-proto/src/rest.rs
index f26bb3e4..0761bba1 100644
--- a/crates/hennery-proto/src/rest.rs
+++ b/crates/hennery-proto/src/rest.rs
@@ -38,6 +38,15 @@ pub struct StartSessionResponse {
     pub session_id: String,
 }

+/// `POST /api/sessions/{id}/new-like-this`: a fresh session and the exact
+/// source snapshot requested at its start, for the client's read-back check.
+#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
+pub struct NewLikeThisResponse {
+    pub session_id: String,
+    pub hat_id: String,
+    pub config: SessionConfig,
+}
+
 #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
 #[serde(deny_unknown_fields)]
 pub struct PromptRequest {
diff --git a/crates/hennery-sessions/src/api.rs b/crates/hennery-sessions/src/api.rs
index 093d6a1b..c58b4c74 100644
--- a/crates/hennery-sessions/src/api.rs
+++ b/crates/hennery-sessions/src/api.rs
@@ -24,8 +24,8 @@ use hennery_kernel::secret::unix_now;
 use hennery_proto::frames::{Capability, CollectorFrame, Indexed, SessionBody};
 use hennery_proto::rest::{
     AGENT_MAX_JSON_BYTES, AnswerRequest, AnswerResponse, ApiError, CancelResponse, ConfigRequest, DeleteResult,
-    EventDto, HostRemovalItem, LifecycleResponse, OpenTurn, PendingItem, PromptRequest, PromptResponse, SessionDetail,
-    StartSessionRequest, StartSessionResponse, UpdateSessionRequest, json_width,
+    EventDto, HostRemovalItem, LifecycleResponse, NewLikeThisResponse, OpenTurn, PendingItem, PromptRequest,
+    PromptResponse, SessionDetail, StartSessionRequest, StartSessionResponse, UpdateSessionRequest, json_width,
 };
 use serde::Deserialize;
 use std::convert::Infallible;
@@ -86,6 +86,7 @@ pub fn router(state: AppState) -> Router {
                 .delete(delete_session.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
         )
         .route("/api/sessions/{id}/resume", post(resume))
+        .route("/api/sessions/{id}/new-like-this", post(new_like_this))
         // The one route that reads more than axum's default 2 MB (plan 6a).
         .route(
             "/api/sessions/{id}/prompt",
@@ -177,8 +178,16 @@ pub(crate) fn internal(err: anyhow::Error) -> Response {
 }

 fn request_failed(err: RequestError) -> Response {
+    request_failed_for_session(err, None)
+}
+
+fn request_failed_for_session(err: RequestError, session_id: Option<String>) -> Response {
+    let refuse = |status, code: &str, message: &str| match &session_id {
+        Some(id) => error_with_session(status, code, message, id.clone()),
+        None => error(status, code, message),
+    };
     match err {
-        RequestError::NotConnected => error(StatusCode::CONFLICT, "host_offline", "the host is not connected"),
+        RequestError::NotConnected => refuse(StatusCode::CONFLICT, "host_offline", "the host is not connected"),
         RequestError::Rejected { code, message } => {
             let status = match code.as_str() {
                 "not_attached" | "turn_in_progress" | "not_running" | "unknown_option" | "images_unsupported" => {
@@ -194,20 +203,20 @@ fn request_failed(err: RequestError) -> Response {
             };
             // The host's words, which can quote what the agent printed
             // (plan 8e decision 11).
-            error(status, &code, crate::redact::shown(&message))
+            refuse(status, &code, &crate::redact::shown(&message))
         }
-        RequestError::DeliveryUnknown => error(
+        RequestError::DeliveryUnknown => refuse(
             StatusCode::SERVICE_UNAVAILABLE,
             "delivery_unknown",
             "host disconnected; delivery unknown",
         ),
         // Probes only (`Hub::probe`), which the probe routes answer
         // themselves (`projects::probe_failed`): unreachable here.
-        RequestError::Unsupported => error(StatusCode::CONFLICT, "unsupported", "the host does not support this"),
-        RequestError::Busy => error(StatusCode::SERVICE_UNAVAILABLE, "busy", "the host is busy; try again"),
+        RequestError::Unsupported => refuse(StatusCode::CONFLICT, "unsupported", "the host does not support this"),
+        RequestError::Busy => refuse(StatusCode::SERVICE_UNAVAILABLE, "busy", "the host is busy; try again"),
         // The hub refused to send a start or resume its servers; the
         // route has failed the session it left `starting` (plan 8e).
-        RequestError::McpUndeliverable => error(
+        RequestError::McpUndeliverable => refuse(
             StatusCode::CONFLICT,
             "mcp_isolation_unavailable",
             "the host cannot keep this agent's session to its MCP servers",
@@ -306,6 +315,38 @@ const NEVER_CONNECTED: &str = "the host has not connected since it was paired; o
      connected";

 async fn start_session(State(state): State<AppState>, ApiJson(req): ApiJson<StartSessionRequest>) -> Response {
+    start_in_hat(state, req, None).await
+}
+
+/// Copy only the last reported launch settings. Normal creation gives this
+/// session its own history, family identity, MCP delivery, title and idle hold.
+async fn new_like_this(State(state): State<AppState>, Path(id): Path<String>) -> Response {
+    let source = match state.store.find_session(&id) {
+        Ok(Some(source)) => source,
+        Ok(None) => return error(StatusCode::NOT_FOUND, "not_found", "no such session"),
+        Err(err) => return internal(err),
+    };
+    if source.agent_session_id.is_none() || source.config == Default::default() {
+        return error(
+            StatusCode::CONFLICT,
+            "configuration_unavailable",
+            "the source session has no reported configuration to copy; start a session with reviewed settings instead",
+        );
+    }
+    start_in_hat(
+        state,
+        StartSessionRequest {
+            host_id: source.host_id,
+            agent: source.agent,
+            cwd: source.cwd,
+            config: source.config,
+        },
+        Some(source.hat_id),
+    )
+    .await
+}
+
+async fn start_in_hat(state: AppState, req: StartSessionRequest, expected_hat: Option<String>) -> Response {
     // What a list item shows must be bounded (plan 6b, the review's A1): a
     // paired host's id, and an agent's name within its cap. Refused before
     // any session exists.
@@ -349,6 +390,13 @@ async fn start_session(State(state): State<AppState>, ApiJson(req): ApiJson<Star
         }
         Err(why) => return why.into_response(),
     };
+    if expected_hat.as_ref().is_some_and(|expected| *expected != hat.hat_id) {
+        return error(
+            StatusCode::CONFLICT,
+            "hat_mismatch",
+            "the project now belongs to a different hat; review its path rules before starting a session like this one",
+        );
+    }
     let mcp_context = match mcp_context(&state, &req.host_id, &req.agent) {
         Ok(context) => context,
         Err(err) => return internal(err),
@@ -372,6 +420,7 @@ async fn start_session(State(state): State<AppState>, ApiJson(req): ApiJson<Star
     if let Err(err) = state.store.expect_initial_configuration(&session_id, &req.config) {
         return internal(err);
     }
+    let copied_config = expected_hat.as_ref().map(|_| req.config.clone());
     let frame = CollectorFrame::StartSession {
         request_id: request_id.clone(),
         session_id: session_id.clone(),
@@ -392,7 +441,18 @@ async fn start_session(State(state): State<AppState>, ApiJson(req): ApiJson<Star
         .request_with_undo(&req.host_id, &request_id, frame, START_TIMEOUT, undo)
         .await
     {
-        Ok(_) => (StatusCode::ACCEPTED, Json(StartSessionResponse { session_id })).into_response(),
+        Ok(_) => match copied_config {
+            Some(config) => (
+                StatusCode::ACCEPTED,
+                Json(NewLikeThisResponse {
+                    session_id,
+                    hat_id: hat.hat_id,
+                    config,
+                }),
+            )
+                .into_response(),
+            None => (StatusCode::ACCEPTED, Json(StartSessionResponse { session_id })).into_response(),
+        },
         // The session was created and may still start; without its id here,
         // the caller would have no way to look it up (ACP core §3.4).
         Err(RequestError::DeliveryUnknown) => error_with_session(
@@ -403,11 +463,18 @@ async fn start_session(State(state): State<AppState>, ApiJson(req): ApiJson<Star
         ),
         // Never sent.
         Err(err @ (RequestError::NotConnected | RequestError::McpUndeliverable)) => {
-            start_not_sent(&state, &session_id, err)
+            if expected_hat.is_some() {
+                if let Err(e) = state.store.mark_failed(&session_id, not_sent_reason(&err)) {
+                    return internal(e);
+                }
+                request_failed_for_session(err, Some(session_id))
+            } else {
+                start_not_sent(&state, &session_id, err)
+            }
         }
         // The socket task has already failed the session with the host's
         // code (`Undo::Start`).
-        Err(err) => request_failed(err),
+        Err(err) => request_failed_for_session(err, expected_hat.map(|_| session_id)),
     }
 }

diff --git a/crates/hennery-testkit/tests/resolve.rs b/crates/hennery-testkit/tests/resolve.rs
index d6a4c32a..539fecf5 100644
--- a/crates/hennery-testkit/tests/resolve.rs
+++ b/crates/hennery-testkit/tests/resolve.rs
@@ -69,6 +69,350 @@ impl Collector {

 type Ws = tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

+fn like_source(collector: &Collector, hat: &str) {
+    like_source_with_family(collector, hat, false);
+}
+
+fn like_source_with_family(collector: &Collector, hat: &str, family: bool) {
+    use hennery_proto::frames::{Indexed, SessionBody};
+    assert!(
+        collector
+            .state
+            .store
+            .create_session("like-source", HOST, "fake", "/work/project", hat, None)
+            .unwrap()
+    );
+    if family {
+        assert!(
+            collector
+                .state
+                .store
+                .create_session("like-parent", HOST, "fake", "/work/project", hat, None)
+                .unwrap()
+        );
+        collector
+            .state
+            .store
+            .ingest(
+                "like-parent",
+                1,
+                &SessionBody::session_started("parent-start", "agent-parent"),
+            )
+            .unwrap();
+        {
+            let conn = rusqlite::Connection::open(collector._dir.path().join("hennery.db")).unwrap();
+            conn.execute("INSERT INTO session_families(owner_id,child_id,parent_id,root_id,hat_id,created_event_id) VALUES (?1,'like-source','like-parent','like-parent',?2,1)", rusqlite::params![collector.state.store.owner_id(), hat]).unwrap();
+        }
+    }
+    collector
+        .state
+        .store
+        .ingest(
+            "like-source",
+            1,
+            &SessionBody::session_started("original", "agent-source"),
+        )
+        .unwrap();
+    let options = json!([
+        {"id":"model","category":"model","type":"select","currentValue":"chosen-model","options":[{"value":"chosen-model","name":"Chosen"}]},
+        {"id":"mode","category":"mode","type":"select","currentValue":"plan","options":[{"value":"plan","name":"Plan"}]},
+        {"id":"effort","category":"thought_level","type":"select","currentValue":"high","options":[{"value":"high","name":"High"}]},
+        {"id":"fast","type":"boolean","currentValue":false}
+    ]);
+    collector
+        .state
+        .store
+        .ingest(
+            "like-source",
+            2,
+            &SessionBody::ConfigApplied {
+                request_id: "changed-after-start".into(),
+                indexed: Indexed {
+                    config_options: Some(options.as_array().unwrap().clone()),
+                    current_model: Some("chosen-model".into()),
+                    current_mode: Some("plan".into()),
+                    current_axes: Some(
+                        [
+                            ("effort".into(), hennery_proto::frames::ConfigValue::Id("high".into())),
+                            ("fast".into(), hennery_proto::frames::ConfigValue::Bool(false)),
+                        ]
+                        .into_iter()
+                        .collect(),
+                    ),
+                    ..Default::default()
+                },
+            },
+        )
+        .unwrap();
+    collector.state.store.set_idle_pin("like-source", true).unwrap();
+}
+
+#[tokio::test]
+async fn new_like_this_copies_reported_configuration_into_a_fresh_empty_session() {
+    use hennery_proto::frames::SessionBody;
+    let collector = Collector::start().await;
+    let hat = collector.hat("Project");
+    rule(&collector, "/work", &hat, true);
+    like_source_with_family(&collector, &hat, true);
+    assert!(
+        collector
+            .state
+            .store
+            .family_summary("like-source")
+            .unwrap()
+            .unwrap()
+            .family
+            .unwrap()
+            .parent
+            .is_some()
+    );
+    let mut host = ScriptedHost::connect(&collector).await;
+    let source = collector.state.store.find_session("like-source").unwrap().unwrap();
+    let call = send(
+        &collector,
+        "POST",
+        "/api/sessions/like-source/new-like-this",
+        json!({"model":"ignored","cwd":"/elsewhere"}),
+    );
+    assert_eq!(host.answer("/work/project", true).await, "/work/project");
+    let CollectorFrame::StartSession {
+        request_id,
+        session_id,
+        agent,
+        cwd,
+        config,
+        hat_id,
+        committed_seq,
+        ..
+    } = host.next().await
+    else {
+        panic!("expected a fresh start");
+    };
+    assert_ne!(session_id, "like-source");
+    assert_eq!(
+        (agent.as_str(), cwd.as_str(), hat_id.as_str(), committed_seq),
+        ("fake", "/work/project", hat.as_str(), 0)
+    );
+    assert_eq!(config, source.config);
+    assert_eq!(
+        config.axes.get("fast"),
+        Some(&hennery_proto::frames::ConfigValue::Bool(false))
+    );
+    let mut body = SessionBody::session_started(request_id, "agent-new");
+    if let SessionBody::SessionStarted { indexed, .. } = &mut body {
+        indexed.config_options = collector
+            .state
+            .store
+            .catalog("like-source")
+            .unwrap()
+            .unwrap()
+            .config_options
+            .into();
+        indexed.current_model = source.config.model.clone();
+        indexed.current_mode = source.config.mode.clone();
+        indexed.current_axes = Some(source.config.axes.clone());
+    }
+    host.emit(&session_id, body).await;
+    let (status, body) = call.await.unwrap();
+    assert_eq!(status, 202, "{body}");
+    assert_eq!(body["session_id"], session_id);
+    assert_eq!(body["hat_id"], hat);
+    assert_eq!(body["config"], serde_json::to_value(&source.config).unwrap());
+    let row = collector.state.store.find_session(&session_id).unwrap().unwrap();
+    assert_eq!(row.config, source.config);
+    assert_eq!(row.open_turn_id, None);
+    assert_eq!(row.title, None);
+    assert!(
+        collector
+            .state
+            .store
+            .family_summary(&session_id)
+            .unwrap()
+            .unwrap()
+            .family
+            .is_none()
+    );
+    assert!(!collector.state.store.idle_hold(&session_id).unwrap().unwrap().pinned);
+    assert!(
+        collector
+            .state
+            .store
+            .operator_prompt_queue(&session_id)
+            .unwrap()
+            .is_empty()
+    );
+    let conn = rusqlite::Connection::open(collector._dir.path().join("hennery.db")).unwrap();
+    let turns: i64 = conn
+        .query_row("SELECT count(*) FROM turns WHERE session_id = ?1", [&session_id], |r| {
+            r.get(0)
+        })
+        .unwrap();
+    assert_eq!(turns, 0, "creating a session must not manufacture a first prompt");
+    assert_eq!(
+        collector.state.store.find_session("like-source").unwrap().unwrap(),
+        source
+    );
+}
+
+#[tokio::test]
+async fn new_like_this_refuses_a_changed_hat_before_creating_any_session() {
+    let collector = Collector::start().await;
+    let original = collector.hat("Original");
+    let replacement = collector.hat("Replacement");
+    like_source(&collector, &original);
+    rule(&collector, "/work", &replacement, true);
+    let mut host = ScriptedHost::connect(&collector).await;
+    let call = send(
+        &collector,
+        "POST",
+        "/api/sessions/like-source/new-like-this",
+        Value::Null,
+    );
+    host.answer("/work/project", true).await;
+    let (status, body) = call.await.unwrap();
+    assert_eq!((status, body["code"].as_str()), (409, Some("hat_mismatch")), "{body}");
+    assert_eq!(session_count(&collector), 1);
+}
+
+#[tokio::test]
+async fn new_like_this_refuses_missing_foreign_deleted_and_unconfigured_sources() {
+    let collector = Collector::start().await;
+    let hat = collector.hat("Project");
+    for (id, state) in [
+        ("unconfigured", "starting"),
+        ("foreign", "active"),
+        ("deleted", "deleted"),
+    ] {
+        assert!(
+            collector
+                .state
+                .store
+                .create_session(id, HOST, "fake", "/work/project", &hat, None)
+                .unwrap()
+        );
+        let conn = rusqlite::Connection::open(collector._dir.path().join("hennery.db")).unwrap();
+        conn.execute("UPDATE sessions SET lifecycle=?2 WHERE id=?1", [id, state])
+            .unwrap();
+        if id == "foreign" {
+            conn.execute("UPDATE sessions SET owner_id='other-owner' WHERE id=?1", [id])
+                .unwrap();
+        }
+    }
+    for (id, expected_status, expected_code) in [
+        ("missing", 404, "not_found"),
+        ("foreign", 404, "not_found"),
+        ("deleted", 404, "not_found"),
+        ("unconfigured", 409, "configuration_unavailable"),
+    ] {
+        let (status, body) = send(
+            &collector,
+            "POST",
+            &format!("/api/sessions/{id}/new-like-this"),
+            Value::Null,
+        )
+        .await
+        .unwrap();
+        assert_eq!(
+            (status, body["code"].as_str()),
+            (expected_status, Some(expected_code)),
+            "{id}: {body}"
+        );
+    }
+    assert_eq!(session_count(&collector), 3);
+}
+
+#[tokio::test]
+async fn new_like_this_requires_the_operator() {
+    let collector = Collector::start().await;
+    let _operator = hennery_testkit::operator_client(&collector.state.operator);
+    let response = reqwest::Client::new()
+        .post(collector.url("/api/sessions/missing/new-like-this"))
+        .header("Origin", collector.state.operator.public_url().unwrap().origin())
+        .send()
+        .await
+        .unwrap();
+    assert_eq!(response.status(), reqwest::StatusCode::UNAUTHORIZED);
+    assert_eq!(session_count(&collector), 0);
+}
+
+#[tokio::test]
+async fn new_like_this_returns_the_created_id_when_the_host_refuses_copied_settings() {
+    let collector = Collector::start().await;
+    let hat = collector.hat("Project");
+    rule(&collector, "/work", &hat, true);
+    like_source(&collector, &hat);
+    let mut host = ScriptedHost::connect(&collector).await;
+    let call = send(
+        &collector,
+        "POST",
+        "/api/sessions/like-source/new-like-this",
+        Value::Null,
+    );
+    host.answer("/work/project", true).await;
+    let CollectorFrame::StartSession {
+        request_id, session_id, ..
+    } = host.next().await
+    else {
+        panic!("expected start");
+    };
+    host.send(&HostFrame::Error {
+        request_id,
+        code: "config_failed".into(),
+        message: "copied model is no longer offered".into(),
+    })
+    .await;
+    let (status, body) = call.await.unwrap();
+    assert_eq!(status, 502, "{body}");
+    assert_eq!(body["code"], "config_failed");
+    assert_eq!(body["session_id"], session_id);
+    assert_eq!(
+        collector
+            .state
+            .store
+            .find_session(&session_id)
+            .unwrap()
+            .unwrap()
+            .lifecycle,
+        "failed"
+    );
+    assert_eq!(session_count(&collector), 2);
+}
+
+#[tokio::test]
+async fn new_like_this_refuses_an_offline_host_without_allocating() {
+    let collector = Collector::start().await;
+    let hat = collector.hat("Project");
+    like_source(&collector, &hat);
+    let (status, body) = send(
+        &collector,
+        "POST",
+        "/api/sessions/like-source/new-like-this",
+        Value::Null,
+    )
+    .await
+    .unwrap();
+    assert_eq!((status, body["code"].as_str()), (409, Some("host_offline")), "{body}");
+    assert_eq!(session_count(&collector), 1);
+}
+
+#[tokio::test]
+async fn new_like_this_refuses_a_missing_workdir_without_allocating() {
+    let collector = Collector::start().await;
+    let hat = collector.hat("Project");
+    like_source(&collector, &hat);
+    let mut host = ScriptedHost::connect(&collector).await;
+    let call = send(
+        &collector,
+        "POST",
+        "/api/sessions/like-source/new-like-this",
+        Value::Null,
+    );
+    host.answer("/work/project", false).await;
+    let (status, body) = call.await.unwrap();
+    assert_eq!((status, body["code"].as_str()), (400, Some("invalid_cwd")), "{body}");
+    assert_eq!(session_count(&collector), 1);
+}
+
 /// The test playing the host.
 struct ScriptedHost {
     ws: Ws,
diff --git a/docs/README.md b/docs/README.md
index 1f43aa41..6f2124f4 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -32,6 +32,7 @@ slice); everything else is design. The maintainer's decisions are recorded below
    - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
      and its [harness](../spikes/2026-09-25-mcp-per-session/).
 4. Plans:
+   - [New like this](plans/2026-10-22-new-like-this.md) — create a standalone empty session from the source's last reported launch settings, from header and list menus; server-side hat validation, configuration read-back and focus on its empty composer. Implemented and verified locally; independent review and platform CI remain parent-owned.
    - [Local OAuth callback](plans/2026-10-22-local-oauth-callback.md) — opt-in per-flow localhost provider redirect, a loopback CLI browser relay to the fixed collector, exact DCR/exchange matching and explicit command-before-Connect UI. API/CLI guards, real HTTPS domain-cookie browser tests, removal probes and timing load are recorded in the plan; independent review and Linux/macOS CI remain parent-owned. No deployment or live configuration change.
    - [Needs you result inbox](plans/2026-10-22-needs-you-inbox.md) — approved operator follow-up for v0.3.1, held until v0.3.0 is live: durable result review, explicit/read-on-visible acknowledgement, captured-result prompt acknowledgement, and delegated-child completion suppression. Implementation and local verification are recorded in the plan; independent review and merge remain parent-owned. No release or version bump.
    - [Idle parking holds](plans/2026-10-20-park-hold.md) — keeps a parent attached while a direct child remains attached or a family notice awaits delivery; adds a persisted operator pin API and capability-gated host restoration. Real Codex probes reproduced background-job loss and parent parking/automatic resume; Claude scratch authentication was unavailable. Local gates, 49 removal probes, 96 loaded passes and a fresh 969-file replay are recorded. Review requested amendments to offline/reconnect lock order and deleted pin cleanup; these have RED-first regressions, 3 copied probes and 96 loaded passes. Scoped re-review and Linux/macOS CI remain parent-owned; the UI toggle belongs to redesign R3.
diff --git a/docs/specs/2026-09-26-acp-core-design.md b/docs/specs/2026-09-26-acp-core-design.md
index 71eed422..dc462435 100644
--- a/docs/specs/2026-09-26-acp-core-design.md
+++ b/docs/specs/2026-09-26-acp-core-design.md
@@ -1818,6 +1818,7 @@ All endpoints require an operator session (kernel spec §3). Types come from
 | `GET /api/sessions?cursor&limit&q&hat&lifecycle` | Paginated list, newest `last_event_at` first. `q` searches title, cwd, branch, id across all sessions regardless of filters except hat. Each item carries `hat_id` (`''`: a session from before hats that got none). `hat=<id>` lists that hat's sessions (an unknown hat lists none); an empty `hat=` is 400 `invalid` (plan 5c). |
 | `POST /api/sessions` | Start: `{host_id, agent, cwd, model?, mode?, axes?, first_prompt?{content[]}}` → 202 `{session_id, turn_id?}` once `session_started` is ingested; 400 `unknown_host`; 400 `invalid_cwd`; 409 `hat_ambiguous`; 409 `host_offline` (no session is created, plan 5c); 409 `mcp_isolation_unavailable`, whether the hub or the host refused the session's MCP servers (the session becomes `failed` with it; plan 8e); 502 with the host's code (`start_failed`, `unknown_agent`, …); 503 `delivery_unknown` **with `session_id`** (the session exists and may still start; the caller has no other way to learn its id). |
 | `GET /api/sessions/{id}` | Session detail `SessionDetail`: the list item (lifecycle, activity, failure reason, `presumed_parked`), the open turn `{turn_id, state: sent \| started}`, `mcp_delivery?` (what its latest start or resume was given, plan 8e: `McpSessionDelivery {mode: isolated \| unisolated \| fallback \| unsupported, servers, at}`, a mode and a count, never a token; absent for a session not started or resumed since), and `pending[]`: the open questions as `PendingItem {pending_id, session_id, kind, state, reason?, turn_id?, option_ids?, payload, answered, delivered?}`, oldest first (`answered`: an answer is queued; `delivered`: its verdict, absent until one comes). |
+| `POST /api/sessions/{id}/new-like-this` | No request body. Copy the owned, nondeleted source's last reported host, agent, cwd, model, mode and axes into a standalone empty session through the normal start path; hat defaults are not merged. Require the resolved cwd's hat to match the source before allocation. 202 `NewLikeThisResponse {session_id, hat_id, config}` returns the exact copied config snapshot for client read-back. 404 for unknown, foreign or deleted sources; 409 `configuration_unavailable` before host contact if no agent session/config was reported; 409 `hat_mismatch` before allocation if path rules now choose another hat. Other normal start refusals apply; any host refusal or uncertain delivery after allocation includes `session_id` so the client opens that session without repeating creation. No history, title, family, prompt, queue, pin or MCP token is copied; MCP delivery is resolved anew. |
 | `GET /api/sessions/{id}/events?before=<event_id>&limit` | Timeline page ending before an event; without `before`, the tail. The frontend opens at the tail. |
 | `GET /api/sessions/{id}/events?after=<event_id>&limit` | Timeline page after an event (applied rows only, §8). |
 | `GET /api/sessions/{id}/catalog` | `SessionCatalog {session_id, config_options[], model?, mode?, axes{}}`; commands, plan and usage join it with the plans that produce them. |
diff --git a/docs/specs/2026-09-26-frontend-design.md b/docs/specs/2026-09-26-frontend-design.md
index 4a07177f..c7b77511 100644
--- a/docs/specs/2026-09-26-frontend-design.md
+++ b/docs/specs/2026-09-26-frontend-design.md
@@ -312,6 +312,16 @@ needed and sends "You asked: …. My answer: …" as a new turn, labelled as suc
 - Failed: the reason and, for `agent_has_no_record`, "Start a new session in
   this project"; for `agent_not_logged_in`, the host's login instructions.
 - "Delete session" in the header menu (confirmation plus step-up).
+- "New like this" in the header and each session row's ellipsis menu
+  creates a standalone empty session with the source's last reported host,
+  agent, cwd, model, mode and axes, including settings changed after launch.
+  A row's context click opens the same disclosure; ordinary clicks remain
+  session links. Hat defaults do not replace copied settings. The action
+  checks the created session's actual configuration, opens it and focuses
+  its empty composer. An unconfirmed setting is explained without claiming
+  that a prompt was saved. A known failed or uncertain start opens that
+  session without retrying. A changed hat or unavailable source configuration
+  is refused visibly. History, title, family, queue and idle pin are fresh.

 ---

diff --git a/schema/hennery-protocol.schema.json b/schema/hennery-protocol.schema.json
index bcd9c933..55cc7d1c 100644
--- a/schema/hennery-protocol.schema.json
+++ b/schema/hennery-protocol.schema.json
@@ -3607,6 +3607,26 @@
       ],
       "type": "object"
     },
+    "NewLikeThisResponse": {
+      "description": "`POST /api/sessions/{id}/new-like-this`: a fresh session and the exact\nsource snapshot requested at its start, for the client's read-back check.",
+      "properties": {
+        "config": {
+          "$ref": "#/$defs/SessionConfig"
+        },
+        "hat_id": {
+          "type": "string"
+        },
+        "session_id": {
+          "type": "string"
+        }
+      },
+      "required": [
+        "session_id",
+        "hat_id",
+        "config"
+      ],
+      "type": "object"
+    },
     "OpenTurn": {
       "description": "A session's open turn, for the detail view.",
       "properties": {
diff --git a/web/e2e/new-like-this.spec.ts b/web/e2e/new-like-this.spec.ts
new file mode 100644
index 00000000..4d1539bc
--- /dev/null
+++ b/web/e2e/new-like-this.spec.ts
@@ -0,0 +1,103 @@
+import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
+import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { startCollector, type Collector } from './collector'
+import { defaultHostDir, fakeAgent, testHost, type TestHost } from './host'
+
+const select = (id: string, value: string, choices: string[]) => ({ id, name: id, category: id === 'effort' ? 'thought_level' : id, type: 'select', currentValue: value, options: choices.map(value => ({ value, name: value })) })
+const options = [select('model', 'opus', ['opus', 'sonnet']), select('mode', 'default', ['default', 'bypass']), select('effort', 'low', ['low', 'high']), { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false }]
+
+async function setup(page: Page, collector: Collector) {
+  await page.goto(collector.setupLink)
+  await page.getByLabel(/^Password at least/).fill('correct horse battery staple')
+  await page.getByLabel('Password again', { exact: true }).fill('correct horse battery staple')
+  await page.getByRole('button', { name: 'Set up', exact: true }).click()
+  await page.getByRole('button', { name: 'Skip', exact: true }).click()
+  await expect(page).toHaveURL(`${collector.origin}/sessions`)
+}
+async function pair(request: APIRequestContext, collector: Collector, host: TestHost) {
+  const code = await (await request.post('/api/hosts/pairing-codes', { headers: { origin: collector.origin } })).json()
+  expect(await host.join(`hennery host join ${collector.origin} ${code.code}`, ['--name', 'Clone host', '--no-runtime'])).toBe(0)
+  const path = join(defaultHostDir(host.dir), 'host.toml')
+  writeFileSync(path, `workspace_roots = [${JSON.stringify(realpathSync(host.dir))}]\n${readFileSync(path, 'utf8')}`)
+  host.run()
+  let id = ''
+  await expect(async () => {
+    const hosts = await (await request.get('/api/hosts')).json()
+    const host = hosts.find((h: { name: string; connected: boolean }) => h.name === 'Clone host' && h.connected)
+    expect(host).toBeTruthy(); id = host.host_id
+  }).toPass({ timeout: 30_000 })
+  return id
+}
+
+for (const [width, appearance] of [[390, 'light'], [1280, 'dark']] as const) {
+  test(`New like this copies current settings from header and list at ${width}px ${appearance}`, async ({ browser }) => {
+    test.setTimeout(120_000)
+    const collector = await startCollector()
+    const host = testHost(fakeAgent('claude', { config_options: options, chunks: ['Ready.'] }))
+    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce', colorScheme: appearance })
+    const page = await context.newPage()
+    const prompts: string[] = [], clones: string[] = []
+    page.on('request', request => {
+      if (request.method() !== 'POST') return
+      if (/\/prompt$/.test(request.url())) prompts.push(request.url())
+      if (/\/new-like-this$/.test(request.url())) clones.push(request.url())
+    })
+    try {
+      await setup(page, collector)
+      const hostId = await pair(context.request, collector, host)
+      const cwd = join(realpathSync(host.dir), 'synthetic-project'); mkdirSync(cwd)
+      const headers = { origin: collector.origin }
+      const started = await context.request.post('/api/sessions', { headers, data: { host_id: hostId, agent: 'claude', cwd } })
+      expect(started.ok()).toBe(true)
+      const source = (await started.json()).session_id
+      // Change the live session after starting; these values must beat defaults.
+      for (const [config_id, value] of [['model', 'sonnet'], ['mode', 'bypass'], ['effort', 'high'], ['fast', true], ['fast', false]] as const) {
+        expect((await context.request.post(`/api/sessions/${source}/config`, { headers, data: { config_id, value } })).ok()).toBe(true)
+      }
+      expect((await context.request.patch(`/api/sessions/${source}`, { headers, data: { title: 'Source session' } })).ok()).toBe(true)
+      const sourceDetail = await (await context.request.get(`/api/sessions/${source}`)).json()
+      const saved = await (await context.request.get(`/api/hats/${sourceDetail.hat_id}/session-defaults?agent=claude`)).json()
+      expect((await context.request.put(`/api/hats/${sourceDetail.hat_id}/session-defaults?agent=claude`, { headers, data: { revision: saved.revision, config: { model: 'opus', mode: 'default', axes: { effort: 'low' } } } })).ok()).toBe(true)
+
+      for (const entry of ['header', 'list'] as const) {
+        if (entry === 'header') {
+          await page.goto(`/sessions/${source}`)
+          await page.getByRole('button', { name: 'Session actions', exact: true }).click()
+        } else {
+          expect((await context.request.post(`/api/sessions/${source}/close`, { headers })).ok()).toBe(true)
+          await page.evaluate(() => localStorage.setItem('hennery.hideClosed', 'false'))
+          await page.goto('/sessions')
+          const row = page.locator('.sess-item').filter({ has: page.locator(`a[href="/sessions/${source}"]`) })
+          await row.getByRole('button', { name: 'Session actions', exact: true }).click()
+        }
+        const action = page.getByRole('button', { name: 'New like this', exact: true })
+        await expect(action).toBeVisible()
+        await expect(action).toBeInViewport({ ratio: 1 })
+        const artifact = join(process.cwd(), '../.superpowers/sdd/new-like-this/screenshots'); mkdirSync(artifact, { recursive: true })
+        await page.screenshot({ path: join(artifact, `${entry}-menu-${width}-${appearance}.png`), animations: 'disabled' })
+        const response = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/new-like-this'))
+        await action.click()
+        const created = await response
+        expect(created.ok(), await created.text()).toBe(true)
+        const id = (await created.json()).session_id
+        await expect(page).toHaveURL(`${collector.origin}/sessions/${id}`, { timeout: 45_000 })
+        expect(id).not.toBe(source)
+        const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
+        await expect(prompt).toBeFocused(); await expect(prompt).toHaveValue('')
+        const detail = await (await context.request.get(`/api/sessions/${id}`)).json()
+        expect(detail).toMatchObject({ host_id: hostId, agent: 'claude', cwd, hat_id: sourceDetail.hat_id, lifecycle: 'active', model: 'sonnet', mode: 'bypass' })
+        expect(detail.title).not.toBe('Source session')
+        expect(detail.family?.parent).toBeFalsy()
+        const catalog = await (await context.request.get(`/api/sessions/${id}/catalog`)).json()
+        expect(catalog).toMatchObject({ model: 'sonnet', mode: 'bypass', axes: { effort: 'high', fast: false } })
+        const view = await (await context.request.get(`/api/view/sessions/${id}`)).json()
+        expect(view.items.filter((item: { kind: string }) => item.kind === 'user_turn')).toHaveLength(0)
+        expect(prompts).toHaveLength(0)
+        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
+        await page.screenshot({ path: join(artifact, `${entry}-session-${width}-${appearance}.png`), animations: 'disabled' })
+      }
+      expect(clones).toHaveLength(2)
+    } finally { await context.close(); await host.stop(); await collector.stop() }
+  })
+}
diff --git a/web/src/components/NewLikeThis.test.tsx b/web/src/components/NewLikeThis.test.tsx
new file mode 100644
index 00000000..7aa9d43f
--- /dev/null
+++ b/web/src/components/NewLikeThis.test.tsx
@@ -0,0 +1,194 @@
+import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
+import { beforeEach, describe, expect, it, vi } from 'vitest'
+import { json, routed } from '../test-stream'
+import { navigate } from '../router'
+import SessionMenu from './SessionMenu'
+import SessionRow from './SessionRow'
+import { catalogOf } from '../screens/test-session'
+import SessionView from '../screens/Session'
+import { FAST, sessionServer } from '../screens/test-session'
+import { forgetAllDrafts } from '../lib/drafts'
+import { readStartNotice, startNoticeText } from '../lib/start'
+import { useNewLikeThis } from '../hooks/useNewLikeThis'
+import type { SessionSummary } from '../generated/view'
+
+const config = { model: 'b', mode: 'plan', axes: { effort: 'high', fast: false } }
+const source: SessionSummary = { session_id: 'source/a', host_id: 'host', agent: 'claude', cwd: '/work', hat_id: 'hat', lifecycle: 'closed', presumed_parked: false, created_at: '', last_event_at: '', question_waits: false, operator_attention: 0, parent_handled_questions: 0 }
+const options = [
+  ...catalogOf('new').config_options.map(option => ({ ...option as object, currentValue: 'b' })),
+  ...[['mode', 'plan'], ['effort', 'high']].map(([id, value]) => ({ id, category: id === 'mode' ? 'mode' : 'thought_level', type: 'select', name: id, currentValue: value, options: [{ value, name: value }] })),
+  { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
+]
+function server(post: () => Response | Promise<Response> = () => json({ session_id: 'new/a', hat_id: 'hat', config }, 202), actual = config) {
+  return routed(call => {
+    if (call.method === 'POST') return post()
+    if (call.path.endsWith('/idle-hold')) return json({ pinned: false, held: false, family_active: false, notices_pending: false })
+    if (call.path.endsWith('/catalog')) return json({ session_id: 'new/a', config_options: options, commands: [], ...actual })
+    if (call.path.startsWith('/api/view/')) return json({ items: [], older: false, epoch: 'e', revision: 0 })
+    return json({ session_id: 'new/a', hat_id: 'hat', lifecycle: 'active' })
+  })
+}
+beforeEach(() => { sessionStorage.clear(); navigate('/sessions') })
+
+describe('New like this', () => {
+  it('starts from the header menu with one action and opens the new session without a prompt', async () => {
+    const s = server()
+    render(<SessionMenu id="source/a" lifecycle="active" canPark={false} onDeleted={vi.fn()} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+    expect(location.search).toBe('?focus=prompt')
+    expect(s.calls.filter(c => c.method === 'POST')).toEqual([expect.objectContaining({ path: '/api/sessions/source%2Fa/new-like-this' })])
+    expect(s.fetch.mock.calls.find(c => c[1]?.method === 'POST')?.[1]?.body).toBeUndefined()
+  })
+  it('opens the same action from a list ellipsis and a context click without opening the source', async () => {
+    const s = server()
+    const r = render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    const trigger = screen.getByRole('button', { name: 'Session actions' })
+    expect(screen.getByRole('link')).not.toContainElement(trigger)
+    fireEvent.click(trigger)
+    expect(screen.getByRole('button', { name: 'New like this' })).toHaveFocus()
+    fireEvent.keyDown(screen.getByRole('button', { name: 'New like this' }), { key: 'Escape' })
+    expect(trigger).toHaveFocus()
+    fireEvent.contextMenu(r.container.querySelector('.sess-item')!)
+    expect(location.pathname).toBe('/sessions')
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+  })
+  it('prevents double creation while start is pending', async () => {
+    let finish!: (response: Response) => void
+    const s = server(() => new Promise(resolve => { finish = resolve }))
+    render(<SessionMenu id="source/a" lifecycle="active" canPark={false} onDeleted={vi.fn()} />, { wrapper: s.wrapper })
+    const trigger = screen.getByRole('button', { name: 'Session actions' })
+    fireEvent.click(trigger)
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    fireEvent.click(trigger)
+    expect(screen.getByRole('button', { name: 'New like this' })).toBeDisabled()
+    expect(s.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+    await act(async () => finish(json({ session_id: 'new/a', hat_id: 'hat', config }, 202)))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+  })
+  it('dismisses the list menu when the viewport resizes', () => {
+    const s = server()
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    const trigger = screen.getByRole('button', { name: 'Session actions' })
+    fireEvent.click(trigger)
+    expect(screen.getByRole('button', { name: 'New like this' })).toBeVisible()
+    fireEvent(window, new Event('resize'))
+    expect(screen.queryByRole('button', { name: 'New like this' })).not.toBeInTheDocument()
+    expect(trigger).toHaveAttribute('aria-expanded', 'false')
+  })
+  it('shows a hat mismatch without navigation or another start', async () => {
+    const s = server(() => json({ code: 'hat_mismatch', message: 'Changed' }, 409))
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    expect(await screen.findByRole('alert')).toHaveTextContent('different hat')
+    expect(location.pathname).toBe('/sessions')
+    expect(s.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+  })
+  it('opens the known session on uncertain delivery without retrying', async () => {
+    const s = server(() => json({ code: 'delivery_unknown', message: 'Disconnected', session_id: 'new/a' }, 503))
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+    expect(new URLSearchParams(location.search).get('notice')).toBe('start_unknown')
+    expect(s.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+  })
+  it('keeps a clamped setting visible as a settings notice without claiming a saved prompt', async () => {
+    const s = server(undefined, { ...config, model: 'a' })
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+    expect(new URLSearchParams(location.search).get('notice')).toBe('settings_unconfirmed')
+    expect(startNoticeText(readStartNotice(location.search, 'new/a')!)).toContain('Model: B')
+    expect(s.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+  })
+  it('does not navigate after leaving the source while start is pending', async () => {
+    let finish!: (response: Response) => void
+    const s = server(() => new Promise(resolve => { finish = resolve }))
+    const r = render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    r.unmount(); navigate('/hosts')
+    await act(async () => finish(json({ session_id: 'new/a', hat_id: 'hat', config }, 202)))
+    expect(location.pathname).toBe('/hosts')
+  })
+  it('admits only one start before React renders the pending state', async () => {
+    let finish!: (response: Response) => void
+    const s = server(() => new Promise(resolve => { finish = resolve }))
+    const hook = renderHook(() => useNewLikeThis('source/a'), { wrapper: s.wrapper })
+    act(() => { void hook.result.current.start(); void hook.result.current.start() })
+    expect(s.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+    await act(async () => finish(json({ session_id: 'new/a', hat_id: 'hat', config }, 202)))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+  })
+  it('keeps a newer navigation when the initiating view remains mounted', async () => {
+    let finish!: (response: Response) => void
+    const s = server(() => new Promise(resolve => { finish = resolve }))
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    navigate('/hosts')
+    await act(async () => finish(json({ session_id: 'new/a', hat_id: 'hat', config }, 202)))
+    expect(location.pathname).toBe('/hosts')
+  })
+  it.each([
+    ['start', 'app'], ['confirmation', 'app'], ['start', 'history'], ['confirmation', 'history'],
+  ])('does not revive a pending %s after leaving and returning through %s navigation', async (phase, navigation) => {
+    let finish!: (response: Response) => void
+    const delayed = new Promise<Response>(resolve => { finish = resolve })
+    const created = () => json({ session_id: 'new/a', hat_id: 'hat', config }, 202)
+    const catalog = () => json({ session_id: 'new/a', config_options: options, commands: [], ...config })
+    const s = routed(call => {
+      if (call.method === 'POST') return phase === 'start' ? delayed : created()
+      if (call.path.endsWith('/catalog')) return phase === 'confirmation' ? delayed : catalog()
+      if (call.path.startsWith('/api/view/')) return json({ items: [], older: false, epoch: 'e', revision: 0 })
+      return json({ session_id: 'new/a', hat_id: 'hat', lifecycle: 'active' })
+    })
+    const hook = renderHook(() => useNewLikeThis('source/a'), { wrapper: s.wrapper })
+    act(() => { void hook.result.current.start() })
+    await waitFor(() => expect(s.calls.some(call => phase === 'start' ? call.method === 'POST' : call.path.endsWith('/catalog'))).toBe(true))
+    act(() => {
+      for (const to of ['/sessions?search=1', '/sessions']) {
+        if (navigation === 'app') navigate(to)
+        else { history.replaceState(null, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }
+      }
+    })
+    await act(async () => finish(phase === 'start' ? created() : catalog()))
+    await waitFor(() => expect(hook.result.current.busy).toBe(false))
+    expect(location.pathname + location.search).toBe('/sessions')
+    if (phase === 'start') expect(s.calls.filter(call => call.method === 'GET')).toHaveLength(0)
+  })
+  it('does not navigate or confirm a session after signing out while start is pending', async () => {
+    let finish!: (response: Response) => void
+    const s = server(() => new Promise(resolve => { finish = resolve }))
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    forgetAllDrafts()
+    await act(async () => finish(json({ session_id: 'new/a', hat_id: 'hat', config }, 202)))
+    expect(location.pathname).toBe('/sessions')
+    expect(s.calls.filter(c => c.method === 'GET')).toHaveLength(0)
+  })
+  it('opens a known failed start without retrying or claiming that a first prompt was kept', async () => {
+    const s = server(() => json({ code: 'config_failed', message: 'Model removed', session_id: 'new/a' }, 502))
+    render(<SessionRow session={source} now={0} selected={false} />, { wrapper: s.wrapper })
+    fireEvent.click(screen.getByRole('button', { name: 'Session actions' }))
+    fireEvent.click(screen.getByRole('button', { name: 'New like this' }))
+    await waitFor(() => expect(location.pathname).toBe('/sessions/new%2Fa'))
+    expect(startNoticeText(readStartNotice(location.search, 'new/a')!)).not.toMatch(/draft|waits as/)
+    expect(s.calls.filter(c => c.method === 'POST')).toHaveLength(1)
+  })
+  it('focuses the empty composer after opening the created session and cleans the focus flag', async () => {
+    navigate('/sessions/new?focus=prompt')
+    const s = sessionServer()
+    render(<SessionView id="new" timing={FAST} />, { wrapper: s.wrapper })
+    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus())
+    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('')
+    expect(location.search).toBe('')
+    expect(s.changes()).toHaveLength(0)
+  })
+})
diff --git a/web/src/components/SessionMenu.tsx b/web/src/components/SessionMenu.tsx
index 767048d4..38353310 100644
--- a/web/src/components/SessionMenu.tsx
+++ b/web/src/components/SessionMenu.tsx
@@ -27,6 +27,7 @@ import { sessionPath } from './SessionRow'
 import { Icon } from './ui'
 import ConfirmDialog from './ConfirmDialog'
 import { closeRefusal, deleteRefusal, parkRefusal } from './sessionWords'
+import { useNewLikeThis } from '../hooks/useNewLikeThis'

 interface Props {
   onRename?: () => void
@@ -55,7 +56,9 @@ export default function SessionMenu({ id, lifecycle, family, queuedCount = 0, ca
   const menuId = useId()
   const [open, setOpen] = useState(false)
   const [confirming, setConfirming] = useState(false)
-  const [busy, setBusy] = useState(false)
+  const [actionBusy, setBusy] = useState(false)
+  const like = useNewLikeThis(id)
+  const busy = actionBusy || like.busy
   const [error, setError] = useState<string | null>(null)
   const [hold, setHold] = useState<IdleHoldState | null>(null)
   const [pinBusy, setPinBusy] = useState(false)
@@ -164,6 +167,7 @@ export default function SessionMenu({ id, lifecycle, family, queuedCount = 0, ca
       {open && (
         <div className="session-menu-list" id={menuId}>
           {onRename && <button type="button" onClick={() => { setOpen(false); onRename() }}>Rename</button>}
+          <button type="button" disabled={busy || lifecycle === undefined || hostConnected === false} title={hostConnected === false ? 'The host is offline' : undefined} onClick={() => { dismiss(); setError(null); void like.start() }}>New like this</button>
           <button type="button" role="switch" aria-label="Do not park" aria-checked={hold?.pinned ?? false} disabled={busy || pinBusy || hold === null} onClick={() => void togglePin()}><span>Do not park</span><span className="idle-hold-state" aria-hidden="true">{hold ? hold.pinned ? '✓ On' : 'Off' : '…'}</span></button>
           {holdNote && <p className="idle-hold-note" role="status">{holdNote}</p>}
           {showPark && (
@@ -191,9 +195,10 @@ export default function SessionMenu({ id, lifecycle, family, queuedCount = 0, ca
           </button>
         </div>
       )}
-      {error && (
+      {like.busy && <span className="session-like-pending" role="status">Starting session…</span>}
+      {(error || like.error) && (
         <p className="form-error session-menu-error" role="alert">
-          <bdi>{error}</bdi>
+          <bdi>{error || like.error}</bdi>
         </p>
       )}
       {/* The page behind this dialog is not made inert (as on Hosts and Hats;
diff --git a/web/src/components/SessionRow.test.tsx b/web/src/components/SessionRow.test.tsx
index d1b00d3c..ac592d75 100644
--- a/web/src/components/SessionRow.test.tsx
+++ b/web/src/components/SessionRow.test.tsx
@@ -1,8 +1,11 @@
-import { render, screen, within } from '@testing-library/react'
+import { render as renderView, screen, within } from '@testing-library/react'
 import userEvent from '@testing-library/user-event'
 import { describe, expect, it } from 'vitest'
 import type { SessionSummary } from '../generated/view'
 import SessionRow, { rowText } from './SessionRow'
+import { json, routed } from '../test-stream'
+const rowServer = routed(() => json({ code: 'not_found', message: 'no' }, 404))
+const render = (ui: React.ReactNode) => renderView(ui, { wrapper: rowServer.wrapper })

 /** The list's clock, 15 minutes after the fixture's last event. */
 const NOW = Date.parse('2026-10-02T10:15:00.000Z')
@@ -111,7 +114,7 @@ describe('SessionRow', () => {

   it('shows no reason control on a session that did not fail', () => {
     render(<SessionRow now={NOW} session={summary({ failure_reason: 'left over' })} selected={false} />)
-    expect(screen.queryByRole('button')).not.toBeInTheDocument()
+    expect(screen.queryByRole('button', { name: 'Why it failed' })).not.toBeInTheDocument()
     expect(screen.getByRole('img', { name: 'Idle' })).toHaveAttribute('title', 'Idle')
   })
 })
diff --git a/web/src/components/SessionRow.tsx b/web/src/components/SessionRow.tsx
index 3ca27b89..a08a988c 100644
--- a/web/src/components/SessionRow.tsx
+++ b/web/src/components/SessionRow.tsx
@@ -14,6 +14,7 @@ import { basename, relTime } from '../lib/time'
 import { Link } from '../router'
 import { Icon } from './ui'
 import { useSessionName } from './SessionNames'
+import SessionRowMenu from './SessionRowMenu'

 export function sessionPath(id: string): string {
   return `/sessions/${encodeURIComponent(id)}`
@@ -43,6 +44,7 @@ interface Props {

 function SessionRow({ session, selected, hostName, now, table, indent, childrenCount = 0, childrenStatus, expanded = false, onToggleChildren }: Props) {
   const [why, setWhy] = useState(false)
+  const [menuOpen, setMenuOpen] = useState(false)
   const status = statusOf(session)
   const name = useSessionName(session)
   const title = name.text, place = session.git_branch || basename(session.cwd)
@@ -50,7 +52,7 @@ function SessionRow({ session, selected, hostName, now, table, indent, childrenC
   const reason = status.tone === 'fail' ? session.failure_reason : undefined
   const markerTitle = reason ? `${status.label}: ${reason}` : status.label
   const content = (
-    <div className={'sess-item' + (indent ? ' sess-child' : '')}>
+    <div className={'sess-item' + (indent ? ' sess-child' : '')} onContextMenu={event => { event.preventDefault(); setMenuOpen(true) }}>
       <Link
         to={sessionPath(session.session_id)}
         data-session-link
@@ -83,6 +85,7 @@ function SessionRow({ session, selected, hostName, now, table, indent, childrenC
           {status.resume && <span className="sess-resume">Resume</span>}
         </div>
       </Link>
+      <SessionRowMenu key={session.session_id} id={session.session_id} open={menuOpen} setOpen={setMenuOpen} />
       {childrenCount > 0 && <button type="button" className="sess-children" aria-expanded={expanded} aria-label={`↳ ${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}`} aria-description={childrenStatus || undefined} title={childrenStatus || 'Open the family to review child sessions'} onClick={() => onToggleChildren?.(session.session_id)}><span>↳ {childrenCount} {childrenCount === 1 ? 'child' : 'children'}</span>{childrenStatus && <span className="sess-children-status">{childrenStatus}</span>}</button>}
       {reason && (
         <>
diff --git a/web/src/components/SessionRowMenu.tsx b/web/src/components/SessionRowMenu.tsx
new file mode 100644
index 00000000..7311187a
--- /dev/null
+++ b/web/src/components/SessionRowMenu.tsx
@@ -0,0 +1,36 @@
+import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
+import { createPortal } from 'react-dom'
+import { useNewLikeThis } from '../hooks/useNewLikeThis'
+import { Icon } from './ui'
+
+/** Portal the disclosure outside clipped project groups and scroll containers. */
+export default function SessionRowMenu({ id, open, setOpen }: { id: string; open: boolean; setOpen: (open: boolean) => void }) {
+  const like = useNewLikeThis(id)
+  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
+  const menuId = useId()
+  const [place, setPlace] = useState({ top: 0, left: 0 })
+  const dismiss = () => { setOpen(false); trigger.current?.focus() }
+  useLayoutEffect(() => {
+    if (!open || !trigger.current || !menu.current) return
+    const anchor = trigger.current.getBoundingClientRect(), box = menu.current.getBoundingClientRect()
+    setPlace({ left: Math.max(8, Math.min(anchor.right - box.width, innerWidth - box.width - 8)), top: Math.max(8, anchor.bottom + box.height + 6 < innerHeight ? anchor.bottom + 6 : anchor.top - box.height - 6) })
+    menu.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
+  }, [open])
+  useEffect(() => {
+    if (!open) return
+    const outside = (event: MouseEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false) }
+    const move = (event: Event) => { if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) setOpen(false) }
+    document.addEventListener('mousedown', outside)
+    document.addEventListener('scroll', move, true)
+    window.addEventListener('resize', move)
+    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('scroll', move, true); window.removeEventListener('resize', move) }
+  }, [open, setOpen])
+  return <div className="session-row-actions">
+    <button ref={trigger} type="button" className="session-menu-btn" aria-label="Session actions" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-busy={like.busy} onClick={() => setOpen(!open)}><Icon name="ellipsis-horizontal" size={18} /></button>
+    {open && createPortal(<div ref={menu} id={menuId} className="session-menu-list session-row-menu" style={place} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss() } }}>
+      <button type="button" disabled={like.busy} onClick={() => { dismiss(); void like.start() }}>New like this</button>
+    </div>, document.body)}
+    {like.busy && <span className="session-like-pending" role="status">Starting session…</span>}
+    {like.error && <p className="form-error session-row-error" role="alert"><bdi>{like.error}</bdi></p>}
+  </div>
+}
diff --git a/web/src/generated/protocol.ts b/web/src/generated/protocol.ts
index 324f9c1b..32d4aad4 100644
--- a/web/src/generated/protocol.ts
+++ b/web/src/generated/protocol.ts
@@ -675,6 +675,12 @@ export type StartSessionRequest = { host_id: string, agent: string, cwd: string,

 export type StartSessionResponse = { session_id: string, };

+/**
+ * `POST /api/sessions/{id}/new-like-this`: a fresh session and the exact
+ * source snapshot requested at its start, for the client's read-back check.
+ */
+export type NewLikeThisResponse = { session_id: string, hat_id: string, config: SessionConfig, };
+
 export type PromptRequest = { content: unknown[],
 /**
  * Reuse for retries of the same submit, including a lost response.
diff --git a/web/src/hooks/useNewLikeThis.ts b/web/src/hooks/useNewLikeThis.ts
new file mode 100644
index 00000000..501e0ad5
--- /dev/null
+++ b/web/src/hooks/useNewLikeThis.ts
@@ -0,0 +1,66 @@
+import { useEffect, useRef, useState } from 'react'
+import { ApiFailure } from '../api/errors'
+import { useClient } from '../app-client'
+import type { NewLikeThisResponse } from '../generated/protocol'
+import { confirmStart, rememberConfigurationReview, sessionHref, startRefusal } from '../lib/start'
+import { navigate } from '../router'
+import { subscribeNavigation } from '../router-events'
+
+// Like launcher drafts, sign-out clears this operation's browser lifetime.
+const LOGIN = 'hennery.draft.__new_like_this_login__'
+
+export function useNewLikeThis(id: string) {
+  const client = useClient()
+  const live = useRef(false), pending = useRef(false)
+  const [busy, setBusy] = useState(false)
+  const [error, setError] = useState<string | null>(null)
+  useEffect(() => { live.current = true; return () => { live.current = false } }, [id])
+
+  async function start() {
+    if (pending.current) return
+    pending.current = true
+    setBusy(true); setError(null)
+    let token: string | null = null
+    try {
+      token = sessionStorage.getItem(LOGIN) ?? crypto.randomUUID()
+      sessionStorage.setItem(LOGIN, token)
+    } catch { token = null /* The mounted view still has its navigation lifetime. */ }
+    const path = location.pathname + location.search
+    let navigated = false
+    const unsubscribe = subscribeNavigation(() => { navigated = true })
+    const current = () => {
+      if (!live.current || navigated || path !== location.pathname + location.search) return false
+      if (token === null) return true
+      try { return sessionStorage.getItem(LOGIN) === token } catch { return false }
+    }
+    const open = (href: string) => navigate(`${href}${href.includes('?') ? '&' : '?'}focus=prompt`)
+    try {
+      const created = await client.request<NewLikeThisResponse>('POST', `/api/sessions/${encodeURIComponent(id)}/new-like-this`)
+      if (!current()) return
+      let actual: import('../generated/protocol').SessionCatalog | null = null
+      const confirmed = await confirmStart(client, created.session_id, created.hat_id, created.config, 30_000, true, catalog => { actual = catalog })
+      if (!current()) return
+      if (confirmed !== 'confirmed') {
+        rememberConfigurationReview(created.session_id, null, created.config, actual)
+        open(sessionHref(created.session_id, { kind: 'settings_unconfirmed' }))
+      } else open(sessionHref(created.session_id))
+    } catch (err) {
+      if (!current()) return
+      if (err instanceof ApiFailure && err.sessionId) {
+        open(sessionHref(err.sessionId, err.code === 'delivery_unknown' ? { kind: 'start_unknown', kept: false } : { kind: 'settings_unconfirmed' }))
+      } else {
+        const words: Record<string, string> = {
+          hat_mismatch: 'This project now belongs to a different hat. Review its path rules before creating a session like this one.',
+          configuration_unavailable: 'This session has no reported settings to copy. Start a new session and choose its settings.',
+          not_found: 'This session is no longer available. Refresh the list.',
+        }
+        setError(err instanceof ApiFailure && Object.hasOwn(words, err.code) ? words[err.code] : startRefusal(err))
+      }
+    } finally {
+      unsubscribe()
+      pending.current = false
+      if (live.current) setBusy(false)
+    }
+  }
+  return { start, busy, error }
+}
diff --git a/web/src/lib/start.ts b/web/src/lib/start.ts
index 6273d56d..bcef963c 100644
--- a/web/src/lib/start.ts
+++ b/web/src/lib/start.ts
@@ -37,7 +37,7 @@ export function startRefusal(err: unknown): string {
  *    prompt was typed, and waits as the session's draft;
  *  - `prompt_failed`: the session started, but the first prompt was
  *    refused (its code travels as `code`). */
-export type StartNotice = { kind: 'start_unknown'; kept: boolean } | { kind: 'prompt_failed'; code: string; message: string }
+export type StartNotice = { kind: 'start_unknown'; kept: boolean } | { kind: 'prompt_failed'; code: string; message: string } | { kind: 'settings_unconfirmed'; message: string }

 /** `/sessions/<id>`, with the notice as a query flag.
  *
@@ -50,7 +50,7 @@ export type StartNotice = { kind: 'start_unknown'; kept: boolean } | { kind: 'pr
  *  words it. */
 export function sessionHref(
   id: string,
-  notice?: { kind: 'start_unknown'; kept: boolean } | { kind: 'prompt_failed'; code: string },
+  notice?: { kind: 'start_unknown'; kept: boolean } | { kind: 'prompt_failed'; code: string } | { kind: 'settings_unconfirmed' },
 ): string {
   const path = `/sessions/${encodeURIComponent(id)}`
   if (!notice) return path
@@ -82,6 +82,7 @@ export function readStartNotice(search: string, sessionId = currentSessionId()):
   const kind = query.get('notice')
   if (kind === 'start_unknown') return { kind, kept: false }
   if (kind === 'start_unknown_draft') return { kind: 'start_unknown', kept: true }
+  if (kind === 'settings_unconfirmed') return { kind, message: configurationReview(sessionId) ?? PROMPT_REFUSED.config_unconfirmed }
   if (kind === 'prompt_failed') {
     // A link is anyone's to write: only a code's shape is shown, never
     // free text, and only the table's own keys pick a wording.
@@ -118,6 +119,7 @@ export function rememberConfigurationReview(id: string, catalog: import('../gene

 /** A notice in words, for the session view. */
 export function startNoticeText(notice: StartNotice): string {
+  if (notice.kind === 'settings_unconfirmed') return notice.message
   if (notice.kind === 'start_unknown') {
     const started = 'The host went away while this session was starting: it may still start, and shows here when the host reconnects.'
     return notice.kept ? `${started} A first prompt was not sent: it waits as this session’s draft.` : started
diff --git a/web/src/screens/Session.menu.test.tsx b/web/src/screens/Session.menu.test.tsx
index 1f060a13..0f4085a3 100644
--- a/web/src/screens/Session.menu.test.tsx
+++ b/web/src/screens/Session.menu.test.tsx
@@ -57,7 +57,7 @@ describe('SessionView: the header menu', () => {
     expect(trigger()).toHaveAttribute('aria-expanded', 'false')
     expect(document.querySelector('.session-menu-list')).toBeNull()
     openMenu()
-    expect(entries()).toEqual(['Rename', 'Do not park', 'Park', 'Close', 'Delete session'])
+    expect(entries()).toEqual(['Rename', 'New like this', 'Do not park', 'Park', 'Close', 'Delete session'])
     // Opened from a click or a key, focus goes to its first entry.
     expect(screen.getByRole('button', { name: 'Rename' })).toHaveFocus()
   })
@@ -65,13 +65,13 @@ describe('SessionView: the header menu', () => {
   it('offers no Park when the host does not announce it', async () => {
     await show({}, { hosts: () => json([{ host_id: 'h1', name: 'build-box', capabilities: ['images'] }]) })
     openMenu()
-    expect(entries()).toEqual(['Rename', 'Do not park', 'Close', 'Delete session'])
+    expect(entries()).toEqual(['Rename', 'New like this', 'Do not park', 'Close', 'Delete session'])
   })

   it('offers no Park while the host’s capabilities are unknown', async () => {
     await show({}, { hosts: () => json([{ host_id: 'h1', name: 'build-box' }]) })
     openMenu()
-    expect(entries()).toEqual(['Rename', 'Do not park', 'Close', 'Delete session'])
+    expect(entries()).toEqual(['Rename', 'New like this', 'Do not park', 'Close', 'Delete session'])
   })

   it.each([
@@ -82,7 +82,7 @@ describe('SessionView: the header menu', () => {
   ])('a %s session offers no Park; a closed one no Close', async (lifecycle, offered) => {
     await show({ lifecycle })
     openMenu()
-    expect(entries()).toEqual(['Rename', 'Do not park', ...offered])
+    expect(entries()).toEqual(['Rename', 'New like this', 'Do not park', ...offered])
   })

   it('Park parks the session, and the menu closes with focus back on its button', async () => {
diff --git a/web/src/screens/Session.tsx b/web/src/screens/Session.tsx
index c67591d1..5b784170 100644
--- a/web/src/screens/Session.tsx
+++ b/web/src/screens/Session.tsx
@@ -188,7 +188,9 @@ function useStartNotice(id: string): string | null {
   useEffect(() => {
     if (fromLink === null) return
     setHeld({ id, text: fromLink })
-    navigate(pathname, { replace: true })
+    const query = new URLSearchParams(location.search)
+    query.delete('notice'); query.delete('code')
+    navigate(pathname + (query.size ? `?${query}` : ''), { replace: true })
   }, [fromLink, id, pathname])
   return fromLink ?? (held && held.id === id ? held.text : null)
 }
@@ -336,6 +338,15 @@ function SelectedSession({ id, summary, awaitSummary = false, tail = TAIL, timin
   // The composer's handle: the item seams reach the draft through it, and
   // stay the same functions for as long as the view is shown.
   const composer = useRef<ComposerHandle>(null)
+  const focusNew = useRef(new URLSearchParams(search).get('focus') === 'prompt')
+  useEffect(() => {
+    if (!focusNew.current || s.loading || s.removed || !info || !composer.current) return
+    focusNew.current = false
+    composer.current.focus()
+    const query = new URLSearchParams(location.search)
+    query.delete('focus')
+    navigate(location.pathname + (query.size ? `?${query}` : ''), { replace: true })
+  }, [s.loading, s.removed, info])
   const focusComposer = useCallback(() => {
     setSelectedQuestion(null)
     setTimeout(() => composer.current?.focus(), 0)
diff --git a/web/src/styles/shell.css b/web/src/styles/shell.css
index e8fab204..ab1838ea 100644
--- a/web/src/styles/shell.css
+++ b/web/src/styles/shell.css
@@ -86,6 +86,17 @@
 .session-table .sess-time,.session-table .sess-agent,.session-table .sess-machine,.session-table .sess-flag { display:none; }
 .sess-resume { font-size:10px; color:var(--hn-accent-fg); }
 .sess-item { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:6px; }
+.session-row-actions { position:relative; align-self:start; padding-top:6px; }
+.session-menu-list.session-row-menu { position:fixed; width:210px; right:auto; z-index:80; }
+.session-row-error { max-width:240px; overflow-wrap:anywhere; font-size:12px; }
+.session-like-pending { display:block; font-size:11px; color:var(--hn-fg-3); }
+.sess-children,.sess-why,.sess-reason { grid-column:1 / -1; }
+@media (max-width:767px) {
+  .session-row-actions { padding-top:0; }
+  .session-row-actions .session-menu-btn { width:44px; height:44px; }
+  .session-table .sess-item .sess-time { position:static; flex:none; }
+  .session-table .sess-row1 { padding-right:0; }
+}
 .sess-children { max-width:160px; display:flex; align-items:center; gap:5px; border:1px solid var(--hn-line); border-radius:4px; padding:3px 5px; background:var(--hn-sunken); color:var(--hn-fg-3); font:400 10px var(--font-body); white-space:nowrap; }
 .sess-children > span:first-child { flex:none; }.sess-children-status { overflow:hidden; text-overflow:ellipsis; }
 .sess-children[aria-expanded=true] { background:var(--hn-accent-wash); color:var(--hn-accent-fg); }
```

## After this plan

PR #245 runs the repository's selected CI jobs before merge. Independent review is approved after the navigation amendment. The feature requires no migration or new configuration. Deployment/release is separate. Scratch replay/probe directories are retained for parent cleanup. No lesson or project state is written into global assistant memory.

Generated with Claude AI — please review before distribution.
