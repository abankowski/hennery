//! Seven D2 MCP handlers over real HTTP/WebSocket sockets and fake ACP
//! processes. No model provider calls; every adapter home and data dir is scratch.
use hennery_gateway::{api::GatewayState, key::KeySource, session::GatewayMcp};
use hennery_host::{AgentCommand, HostConfig, identity::HostKey, profile::Profile};
use hennery_kernel::{
    egress::{Egress, Timeouts},
    hosts::{Enrollment, Hosts},
    operator::Operator,
};
use hennery_sessions::{AppState, store::Store};
use hennery_testkit::{FakeAsk, FakeScript, SCRIPT_ENV, sample_config_options};
use serde_json::{Value, json};
use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Duration,
};

const HOST: &str = "delegation-host";
const BOUND: Duration = Duration::from_secs(30);

struct LiveSse {
    response: reqwest::Response,
    buffered: Vec<u8>,
}
impl LiveSse {
    async fn open(h: &Harness, path: &str, after: Option<i64>) -> Self {
        let mut request = h.client.get(format!("{}{path}", h.url));
        if let Some(after) = after {
            request = request.header("last-event-id", after.to_string());
        }
        let response = request.send().await.unwrap();
        assert_eq!(response.status(), reqwest::StatusCode::OK);
        Self {
            response,
            buffered: Vec::new(),
        }
    }
    async fn next(&mut self) -> (String, Value) {
        tokio::time::timeout(BOUND, async {
            loop {
                while let Some(end) = self.buffered.windows(2).position(|bytes| bytes == b"\n\n") {
                    let block: Vec<_> = self.buffered.drain(..end + 2).collect();
                    let block = std::str::from_utf8(&block).unwrap();
                    let name = block
                        .lines()
                        .find_map(|line| line.strip_prefix("event:"))
                        .map(str::trim);
                    let data = block.lines().find_map(|line| line.strip_prefix("data:")).map(str::trim);
                    if let (Some(name), Some(data)) = (name, data) {
                        return (name.to_owned(), serde_json::from_str(data).unwrap());
                    }
                }
                self.buffered
                    .extend_from_slice(&self.response.chunk().await.unwrap().expect("live SSE ended"));
            }
        })
        .await
        .expect("live SSE message before deadline")
    }
    async fn matching(&mut self, name: &str, predicate: impl Fn(&Value) -> bool) -> Value {
        tokio::time::timeout(BOUND, async {
            loop {
                let (kind, data) = self.next().await;
                if kind == name && predicate(&data) {
                    return data;
                }
            }
        })
        .await
        .expect("matching live SSE message before deadline")
    }
}
struct Harness {
    _dir: tempfile::TempDir,
    state: AppState,
    client: reqwest::Client,
    raw: reqwest::Client,
    url: String,
    parent: String,
    token: String,
    cwd: PathBuf,
    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
    host_task: tokio::task::JoinHandle<anyhow::Result<()>>,
    server_task: tokio::task::JoinHandle<()>,
    discovery: Arc<Mutex<Vec<Value>>>,
}
impl Drop for Harness {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        self.state.shutdown.cancel();
        self.server_task.abort();
    }
}
fn script() -> FakeScript {
    FakeScript {
        config_options: sample_config_options(),
        chunks: vec!["child-result".into()],
        ..Default::default()
    }
}
fn fake(root: &Path, runtime: &str, mut script: FakeScript) -> AgentCommand {
    let home = root.join(format!("{runtime}-home"));
    std::fs::create_dir_all(&home).unwrap();
    script.session_log = Some(root.join(format!("{runtime}-sessions.jsonl")).display().to_string());
    AgentCommand {
        program: env!("CARGO_BIN_EXE_hennery-fake-acp").into(),
        args: vec![],
        env: vec![
            (SCRIPT_ENV.into(), serde_json::to_string(&script).unwrap()),
            ("HOME".into(), home.display().to_string()),
            ("XDG_CONFIG_HOME".into(), home.join("config").display().to_string()),
            ("XDG_DATA_HOME".into(), home.join("data").display().to_string()),
            ("XDG_CACHE_HOME".into(), home.join("cache").display().to_string()),
            ("SSL_CERT_FILE".into(), String::new()),
            ("SSL_CERT_DIR".into(), String::new()),
            ("HENNERY_DATA_DIR".into(), String::new()),
            ("HENNERY_HOST_DATA_DIR".into(), String::new()),
        ],
    }
}
async fn eventually<T>(what: &str, mut probe: impl AsyncFnMut() -> Option<T>) -> T {
    tokio::time::timeout(BOUND, async {
        loop {
            if let Some(result) = probe().await {
                return result;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .unwrap_or_else(|_| panic!("timed out: {what}"))
}
impl Harness {
    async fn new(worker: FakeScript) -> Self {
        Self::with_worker(worker, None, true).await
    }
    async fn with_worker(worker: FakeScript, mut pinned: Option<(AgentCommand, Profile)>, dispatch: bool) -> Self {
        hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery-fake-acp"));
        let dir = tempfile::tempdir().unwrap();
        let cwd = dir.path().canonicalize().unwrap();
        let db = cwd.join("hennery.db");
        let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
            .await
            .unwrap();
        let addr = listener.local_addr().unwrap();
        let key = HostKey::from_seed([9; 32]);
        let hosts = Hosts::open(&db).unwrap();
        hosts
            .register(
                HOST,
                &Enrollment {
                    public_key: key.public_key_hex(),
                    name: "fixture".into(),
                    host_version: "fixture".into(),
                    platform: "fixture".into(),
                },
                0,
            )
            .unwrap();
        let hat = hosts.host(HOST).unwrap().unwrap().default_hat_id;
        let state = AppState::new(Store::open(&db).unwrap(), hosts, Operator::open(&db).unwrap());
        let url = format!("http://{addr}");
        let now = hennery_kernel::secret::unix_now();
        let setup = state.operator.issue_setup_token(now).unwrap().unwrap();
        state
            .operator
            .set_up(&setup, hennery_testkit::OWNER_PASSWORD, &url, now)
            .unwrap();
        let phc = state
            .operator
            .verify_password(hennery_testkit::OWNER_PASSWORD)
            .unwrap()
            .unwrap();
        let session = state.operator.open_session("integration", &phc, now).unwrap().unwrap();
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(reqwest::header::ORIGIN, url.parse().unwrap());
        headers.insert(
            reqwest::header::COOKIE,
            format!("hennery_session={session}").parse().unwrap(),
        );
        let client = reqwest::Client::builder()
            .no_proxy()
            .default_headers(headers)
            .build()
            .unwrap();
        let keys = KeySource::from_vars(&cwd, Some("09".repeat(32).into()), None).unwrap();
        let gateway: GatewayState = hennery_gateway::open(
            &db,
            &keys,
            state.operator.clone(),
            Egress::new(Timeouts::DEFAULT).unwrap(),
            Arc::new(hennery_gateway::notify::Silent),
        )
        .unwrap();
        state
            .store
            .set_session_mcp(Arc::new(GatewayMcp::for_collector(&gateway)));
        gateway.runtime.store.set_session_tools(&hat, true).unwrap();
        let discovery: Arc<Mutex<Vec<Value>>> = Arc::default();
        let observed = discovery.clone();
        let trace_auth = gateway.runtime.store.clone();
        let builtin = hennery_sessions::builtin::router(state.clone(), gateway).layer(axum::middleware::from_fn(
            move |request: axum::extract::Request, next: axum::middleware::Next| {
                let observed = observed.clone();
                let trace_auth = trace_auth.clone();
                async move {
                    let caller_session = request.headers().get("authorization")
                        .and_then(|value| value.to_str().ok())
                        .and_then(|value| value.strip_prefix("Bearer "))
                        .and_then(|token| trace_auth.authenticate_session(token).unwrap())
                        .map(|identity| {
                            let hennery_gateway::scope::PrincipalKind::Session { session_id, .. } = identity.principal.kind;
                            session_id
                        });
                    let (parts, body) = request.into_parts();
                    let bytes = axum::body::to_bytes(body, hennery_gateway::proxy::MAX_REQUEST_BODY).await.unwrap();
                    let message: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                    let response = next.run(axum::extract::Request::from_parts(parts, axum::body::Body::from(bytes))).await;
                    if matches!(message["method"].as_str(), Some("initialize" | "tools/list")) {
                        let (parts, body) = response.into_parts();
                        let bytes = axum::body::to_bytes(body, 1024*1024).await.unwrap();
                        let answer: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                        observed.lock().unwrap().push(json!({"caller_session":caller_session,"method":message["method"],"status":parts.status.as_u16(),"tool_count":answer["result"]["tools"].as_array().map(Vec::len)}));
                        axum::response::Response::from_parts(parts, axum::body::Body::from(bytes))
                    } else { response }
                }
            }
        ));
        let router = hennery_sessions::router(state.clone()).merge(builtin);
        let server_task = tokio::spawn(async move {
            axum::serve(
                listener,
                router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
            )
            .await
            .unwrap();
        });
        if dispatch {
            hennery_sessions::delegation_worker::after_startup(&state);
        }
        let mut cfg = HostConfig::new(format!("ws://{addr}/api/hosts/ws"), HOST, key, cwd.join("host-data"));
        cfg.workspace_roots = vec![cwd.clone()];
        cfg.git = None;
        for (runtime, s) in [("claude", script()), ("worker", worker)] {
            let (command, profile) = if runtime == "worker" {
                pinned
                    .take()
                    .unwrap_or_else(|| (fake(&cwd, runtime, s), Profile::Claude))
            } else {
                (fake(&cwd, runtime, s), Profile::Claude)
            };
            cfg.agents.insert(runtime.into(), command);
            cfg.profiles.insert(runtime.into(), profile);
        }
        let (shutdown, signal) = tokio::sync::oneshot::channel();
        let host_task = tokio::spawn(hennery_host::run_until(cfg, async {
            let _ = signal.await;
        }));
        eventually("ready host", async || state.hub.is_ready(HOST).then_some(())).await;
        let response = client
            .post(format!("{url}/api/sessions"))
            .json(&json!({"host_id":HOST,"agent":"claude","cwd":cwd}))
            .send()
            .await
            .unwrap();
        let status = response.status();
        let body: Value = response.json().await.unwrap();
        assert_eq!(status, reqwest::StatusCode::ACCEPTED, "{body}");
        let parent = body["session_id"].as_str().unwrap().to_owned();
        eventually("active parent", async || {
            state
                .store
                .find_session(&parent)
                .unwrap()
                .filter(|s| s.lifecycle == "active")
                .map(|_| ())
        })
        .await;
        let log = std::fs::read_to_string(cwd.join("claude-sessions.jsonl")).unwrap();
        let servers: Value =
            serde_json::from_str::<Value>(log.lines().last().unwrap()).unwrap()["params"]["mcpServers"].clone();
        let token = servers[0]["headers"][0]["value"]
            .as_str()
            .unwrap()
            .strip_prefix("Bearer ")
            .unwrap()
            .to_owned();
        Self {
            _dir: dir,
            state,
            client,
            raw: reqwest::Client::builder().no_proxy().build().unwrap(),
            url,
            parent,
            token,
            cwd,
            shutdown: Some(shutdown),
            host_task,
            server_task,
            discovery,
        }
    }
    async fn rpc(&self, method: &str, params: Value) -> Value {
        let response = self
            .raw
            .post(format!("{}/mcp/builtin/hennery", self.url))
            .bearer_auth(&self.token)
            .header("accept", "application/json")
            .json(&json!({"jsonrpc":"2.0","id":1,"method":method,"params":params}))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), reqwest::StatusCode::OK);
        response.json::<Value>().await.unwrap()["result"].clone()
    }
    async fn call(&self, name: &str, args: Value) -> Value {
        self.rpc("tools/call", json!({"name":name,"arguments":args})).await
    }
    async fn ok(&self, name: &str, args: Value) -> Value {
        let r = self.call(name, args).await;
        assert_eq!(r["isError"], false, "{name}: {r}");
        r["structuredContent"].clone()
    }
    async fn spawn(&self, key: &str, config: Value) -> Value {
        self.ok(
            "session_spawn",
            json!({"operation_key":key,"cwd":self.cwd,"agent":"worker","brief":"child brief","config":config}),
        )
        .await
    }
    async fn status(&self, child: &str) -> Value {
        self.ok("session_status", json!({"child_id":child})).await
    }
    async fn done(&self, child: &str, key: &str) {
        eventually("completed operation", async || {
            let s = self
                .ok("session_status", json!({"child_id":child,"operation_key":key}))
                .await;
            s["operations"]
                .as_array()
                .unwrap()
                .iter()
                .any(|r| r["state"]["state"] == "completed" && r["child_id"] == child)
                .then_some(())
        })
        .await;
    }
    async fn post(&self, path: &str, body: Value) -> (reqwest::StatusCode, Value) {
        let r = self
            .client
            .post(format!("{}{path}", self.url))
            .json(&body)
            .send()
            .await
            .unwrap();
        let status = r.status();
        (status, r.json().await.unwrap_or(Value::Null))
    }
    async fn finish(mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            shutdown.send(()).unwrap();
        }
        tokio::time::timeout(BOUND, &mut self.host_task)
            .await
            .unwrap()
            .unwrap()
            .unwrap();
        self.state.shutdown.cancel();
    }
}

#[tokio::test]
async fn execution_policy_routes_require_operator_origin_and_step_up_and_preserve_strict_shape() {
    use reqwest::StatusCode;
    let h = Harness::with_worker(script(), None, false).await;
    let hat = h.state.store.find_session(&h.parent).unwrap().unwrap().hat_id;
    let endpoint = format!("{}/api/hats/{hat}/delegation-policy", h.url);
    let allowed = json!({"worker":{"mode":["default","plan"]}});
    let request = json!({"allowed":allowed});
    // Both reads and writes are covered by this route's own operator wrapper.
    assert_eq!(
        h.raw.get(&endpoint).send().await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        h.raw
            .patch(&endpoint)
            .header("origin", &h.url)
            .json(&request)
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        h.raw
            .get(format!("{}/api/hosts/{HOST}/runtime-catalog", h.url))
            .query(&[("agent", "worker"), ("cwd", h.cwd.to_str().unwrap())])
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    let phc = h
        .state
        .operator
        .verify_password(hennery_testkit::OWNER_PASSWORD)
        .unwrap()
        .unwrap();
    let now = hennery_kernel::secret::unix_now();
    let stale = h
        .state
        .operator
        .open_session("policy-stale", &phc, now - 600)
        .unwrap()
        .unwrap();
    let fresh = h
        .state
        .operator
        .open_session("policy-fresh", &phc, now)
        .unwrap()
        .unwrap();
    for (session, origin, code) in [
        (&stale, Some(h.url.as_str()), "step_up_required"),
        (&fresh, None, "origin_mismatch"),
        (&fresh, Some("https://foreign.example"), "origin_mismatch"),
    ] {
        let mut r = h
            .raw
            .patch(&endpoint)
            .header("cookie", format!("hennery_session={session}"))
            .json(&request);
        if let Some(origin) = origin {
            r = r.header("origin", origin);
        }
        let response = r.send().await.unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN, "{code}");
        assert_eq!(response.json::<Value>().await.unwrap()["code"], code);
    }
    let bad_origin = h
        .raw
        .get(&endpoint)
        .header("cookie", format!("hennery_session={fresh}"))
        .header("origin", "https://foreign.example")
        .send()
        .await
        .unwrap();
    assert_eq!(bad_origin.status(), StatusCode::FORBIDDEN);
    // Same-origin GET needs neither a recent step-up nor an Origin header.
    let initial = h
        .raw
        .get(&endpoint)
        .header("cookie", format!("hennery_session={stale}"))
        .send()
        .await
        .unwrap();
    assert_eq!(initial.status(), StatusCode::OK);
    assert_eq!(
        initial.json::<Value>().await.unwrap(),
        json!({"revision":0,"allowed":{}})
    );
    for body in [
        r#"{"allowed":{},"owner_id":"foreign"}"#,
        r#"{"allowed":{},"revision":999}"#,
        r#"{"allowed":[]}"#,
        "[]",
        "null",
        "{broken",
    ] {
        let response = h
            .client
            .patch(&endpoint)
            .header("content-type", "application/json")
            .body(body)
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{body}");
    }
    for revision in 1..=2 {
        let changed = h.client.patch(&endpoint).json(&request).send().await.unwrap();
        assert_eq!(changed.status(), StatusCode::OK);
        let expected = json!({"revision":revision,"allowed":allowed});
        assert_eq!(changed.json::<Value>().await.unwrap(), expected);
        let read = h.client.get(&endpoint).send().await.unwrap();
        assert_eq!(read.status(), StatusCode::OK);
        assert_eq!(read.json::<Value>().await.unwrap(), expected);
    }
    let absent = format!("{}/api/hats/absent-hat/delegation-policy", h.url);
    assert_eq!(
        h.client.get(&absent).send().await.unwrap().status(),
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        h.client.patch(&absent).json(&request).send().await.unwrap().status(),
        StatusCode::NOT_FOUND
    );
    h.finish().await;
}

#[tokio::test]
async fn seven_handlers_share_launcher_catalog_and_choose_runtime_and_model_without_substitute() {
    let h = Harness::new(script()).await;
    let tools = h.rpc("tools/list", json!({})).await;
    assert_eq!(tools["tools"].as_array().unwrap().len(), 7);
    let caps = h.ok("session_capabilities", json!({"agent":"worker"})).await;
    assert_eq!(caps["runtimes"], json!(["claude", "worker"]));
    assert_eq!(caps["catalogs"][0]["defaults"]["model"], "small");
    let catalog = h
        .client
        .get(format!("{}/api/hosts/{HOST}/runtime-catalog", h.url))
        .query(&[("agent", "worker"), ("cwd", h.cwd.to_str().unwrap())])
        .send()
        .await
        .unwrap();
    assert_eq!(catalog.status(), reqwest::StatusCode::OK);
    assert_eq!(catalog.json::<Value>().await.unwrap(), caps["catalogs"][0]);
    let receipt = h.spawn("spawn-large", json!({"model":"large"})).await;
    let child = receipt["child_id"].as_str().unwrap();
    h.done(child, "spawn-large").await;
    let s = h.status(child).await;
    assert_eq!(s["requested"]["model"], "large");
    assert_eq!(s["actual"]["model"], "large");
    assert_eq!(h.state.store.find_session(child).unwrap().unwrap().agent, "worker");
    let again = h.spawn("spawn-large", json!({"model":"large"})).await;
    assert_eq!(again["child_id"], child);
    let conflict = h
        .call("session_close", json!({"operation_key":"spawn-large","child_id":child}))
        .await;
    assert_eq!(conflict["structuredContent"]["code"], "operation_conflict");
    for (agent, model, code) in [
        ("absent", "small", "runtime_unavailable"),
        ("worker", "absent", "configuration_unavailable"),
    ] {
        let r=h.call("session_spawn",json!({"operation_key":format!("invalid-{agent}-{model}"),"cwd":h.cwd,"agent":agent,"brief":"never substitute","config":{"model":model}})).await;
        assert_eq!(r["structuredContent"]["code"], code);
    }
    let list = h.ok("session_list", json!({})).await;
    assert_eq!(list["children"].as_array().unwrap().len(), 1);
    h.finish().await;
}

#[tokio::test]
async fn durable_question_answer_and_report_complete_the_automatic_parent_child_loop() {
    let mut worker = script();
    worker.asks = vec![FakeAsk::Elicitation];
    let h = Harness::new(worker).await;
    let receipt = h.spawn("delivery-loop", json!({"model":"large"})).await;
    let child = receipt["child_id"].as_str().unwrap();
    let question = eventually(
        "ordinary child question automatically delivered to parent",
        async || {
            h.state.store.events(&h.parent, 0, 100).unwrap().into_iter().find(|e| {
                e.kind == "user_turn"
                    && e.body["origin"]["kind"] == "child_report"
                    && e.body["content"][0]["text"]
                        .as_str()
                        .is_some_and(|s| s.contains("\"kind\":\"question\""))
            })
        },
    )
    .await;
    assert_eq!(question.body["origin"]["child_id"], child);
    let pending = h.state.store.open_pending(child).unwrap().pop().unwrap();
    h.ok("session_answer",json!({"operation_key":"loop-answer","child_id":child,"pending_id":pending.pending_id,"action":"accept","content":{"name":"parent"}})).await;
    h.done(child, "delivery-loop").await;
    let report = eventually("child completion automatically delivered to parent", async || {
        h.state.store.events(&h.parent, 0, 100).unwrap().into_iter().find(|e| {
            e.kind == "user_turn"
                && e.body["origin"]["kind"] == "child_report"
                && e.body["content"][0]["text"]
                    .as_str()
                    .is_some_and(|s| s.contains("\"kind\":\"turn_ended\""))
        })
    })
    .await;
    assert!(
        report.body["content"][0]["text"]
            .as_str()
            .unwrap()
            .contains("child-result")
    );
    assert_ne!(
        question.body["origin"]["delivery_id"],
        report.body["origin"]["delivery_id"]
    );
    assert_eq!(
        h.state
            .store
            .pending_item(&pending.pending_id)
            .unwrap()
            .unwrap()
            .delivered,
        Some(true)
    );
    h.finish().await;
}

#[tokio::test]
async fn child_completion_resumes_a_genuinely_parked_parent_and_delivers_its_report() {
    let mut worker = script();
    worker.asks = vec![FakeAsk::Elicitation];
    let h = Harness::new(worker).await;
    let receipt = h.spawn("resume-report", json!({"model":"large"})).await;
    let child = receipt["child_id"].as_str().unwrap();
    let pending = eventually("child asks", async || h.state.store.open_pending(child).unwrap().pop()).await;
    eventually("parent handled its question notice", async || {
        let s = h.state.store.find_session(&h.parent).unwrap().unwrap();
        let received = h
            .state
            .store
            .events(&h.parent, 0, 100)
            .unwrap()
            .iter()
            .any(|e| e.kind == "user_turn" && e.body["origin"]["kind"] == "child_report");
        (received && s.open_turn_id.is_none()).then_some(())
    })
    .await;
    let (status, body) = h.post(&format!("/api/sessions/{}/park", h.parent), json!({})).await;
    assert!(status.is_success(), "{body}");
    eventually("parent genuinely parked", async || {
        h.state
            .store
            .find_session(&h.parent)
            .unwrap()
            .filter(|s| s.lifecycle == "parked" && !s.presumed_parked)
    })
    .await;
    let (status, body) = h
        .post(
            &format!("/api/sessions/{child}/pending/{}/answer", pending.pending_id),
            json!({"action":"accept","content":{"name":"operator"}}),
        )
        .await;
    assert_eq!(status, reqwest::StatusCode::ACCEPTED, "{body}");
    eventually("completion resumes parent and delivers report", async || {
        h.state.store.events(&h.parent, 0, 100).unwrap().into_iter().find(|e| {
            e.kind == "user_turn"
                && e.body["origin"]["kind"] == "child_report"
                && e.body["content"][0]["text"]
                    .as_str()
                    .is_some_and(|s| s.contains("\"kind\":\"turn_ended\""))
        })
    })
    .await;
    let log = std::fs::read_to_string(h.cwd.join("claude-sessions.jsonl")).unwrap();
    assert!(
        log.lines()
            .any(|line| serde_json::from_str::<Value>(line).unwrap()["method"] == "session/load")
    );
    h.finish().await;
}

#[tokio::test]
async fn initial_brief_waits_for_new_child_configuration_readback() {
    let mut s = script();
    s.sticky_options = vec!["model".into()];
    let h = Harness::new(s).await;
    let receipt = h.spawn("held", json!({"model":"large"})).await;
    let child = receipt["child_id"].as_str().unwrap();
    eventually("waiting config after readback", async || {
        let s = h.status(child).await;
        (s["operations"][0]["state"]["state"] == "waiting_config" && s["actual"]["model"] == "small").then_some(())
    })
    .await;
    // Exercise the real release path after evidence exists. Sampling the
    // initial waiting state alone would race the periodic worker's next pass.
    hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
    let state = h.status(child).await;
    assert_eq!(state["requested"]["model"], "large");
    assert_eq!(state["actual"]["model"], "small");
    assert!(state["last_outcome"].is_null());
    assert!(state["last_report"].is_null());
    assert!(
        h.state
            .store
            .find_session(child)
            .unwrap()
            .unwrap()
            .open_turn_id
            .is_none()
    );
    h.finish().await;
}

#[tokio::test]
async fn direct_children_only_and_close_does_not_cascade_or_reopen() {
    let h = Harness::new(script()).await;
    let a = h.spawn("a", json!({})).await;
    let a = a["child_id"].as_str().unwrap();
    h.done(a, "a").await;
    let b = h.spawn("b", json!({})).await;
    let b = b["child_id"].as_str().unwrap();
    h.done(b, "b").await;
    let (http, independent) = h
        .post("/api/sessions", json!({"host_id":HOST,"agent":"claude","cwd":h.cwd}))
        .await;
    assert_eq!(http, reqwest::StatusCode::ACCEPTED);
    let independent = independent["session_id"].as_str().unwrap();
    eventually("independent parent active", async || {
        h.state
            .store
            .find_session(independent)
            .unwrap()
            .filter(|s| s.lifecycle == "active")
            .map(|_| ())
    })
    .await;
    let independent_log = std::fs::read_to_string(h.cwd.join("claude-sessions.jsonl")).unwrap();
    let independent_session: Value = serde_json::from_str(independent_log.lines().last().unwrap()).unwrap();
    let independent_token = independent_session["params"]["mcpServers"][0]["headers"][0]["value"]
        .as_str()
        .unwrap()
        .strip_prefix("Bearer ")
        .unwrap();
    let separate=h.raw.post(format!("{}/mcp/builtin/hennery",h.url)).bearer_auth(independent_token).header("accept","application/json")
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_spawn","arguments":{"operation_key":"other-family","cwd":h.cwd,"agent":"worker","brief":"independent family","config":{}}}})).send().await.unwrap().json::<Value>().await.unwrap();
    assert_eq!(separate["result"]["isError"], false, "{separate}");
    let separate = separate["result"]["structuredContent"]["child_id"].as_str().unwrap();
    let hidden_child = h.call("session_status", json!({"child_id":separate})).await;
    assert_eq!(hidden_child["structuredContent"]["code"], "not_found");
    let hidden = h.call("session_status", json!({"child_id":independent})).await;
    assert_eq!(hidden["structuredContent"]["code"], "not_found");
    let log = std::fs::read_to_string(h.cwd.join("worker-sessions.jsonl")).unwrap();
    let child_token = log
        .lines()
        .rev()
        .find_map(|line| {
            let line: Value = serde_json::from_str(line).unwrap();
            line["params"]["mcpServers"][0]["headers"][0]["value"]
                .as_str()
                .and_then(|v| v.strip_prefix("Bearer "))
                .map(str::to_owned)
        })
        .unwrap();
    let nested=h.raw.post(format!("{}/mcp/builtin/hennery",h.url)).bearer_auth(child_token).header("accept","application/json")
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_spawn","arguments":{"operation_key":"grandchild","cwd":h.cwd,"brief":"never nest","config":{}}}})).send().await.unwrap().json::<Value>().await.unwrap();
    assert_eq!(nested["result"]["structuredContent"]["code"], "generation_limit");
    let unrelated = h.call("session_status", json!({"child_id":h.parent})).await;
    assert_eq!(unrelated["structuredContent"]["code"], "not_found");
    let close = h
        .ok("session_close", json!({"operation_key":"close-a","child_id":a}))
        .await;
    assert_eq!(close["child_id"], a);
    eventually("closed direct child", async || {
        h.state
            .store
            .find_session(a)
            .unwrap()
            .filter(|s| s.lifecycle == "closed")
            .map(|_| ())
    })
    .await;
    assert_eq!(h.state.store.find_session(b).unwrap().unwrap().lifecycle, "active");
    assert_eq!(
        h.state.store.find_session(&h.parent).unwrap().unwrap().lifecycle,
        "active"
    );
    let send = h
        .call(
            "session_send",
            json!({"operation_key":"no-reopen","child_id":a,"text":"do not reopen"}),
        )
        .await;
    assert_eq!(send["isError"], true);
    let full = h.ok("session_list", json!({"limit":100})).await;
    let ids: std::collections::BTreeSet<_> = full["children"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["child_id"].as_str().unwrap())
        .collect();
    assert_eq!(ids, [a, b].into_iter().collect());
    let page = h.ok("session_list", json!({"limit":1})).await;
    assert_eq!(page["children"].as_array().unwrap().len(), 1);
    let cursor = page["next_cursor"].as_str().unwrap();
    let foreign_cursor=h.raw.post(format!("{}/mcp/builtin/hennery",h.url)).bearer_auth(independent_token).header("accept","application/json")
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"session_list","arguments":{"cursor":cursor,"limit":1}}})).send().await.unwrap().json::<Value>().await.unwrap();
    assert_eq!(foreign_cursor["result"]["structuredContent"]["code"], "invalid_cursor");
    let rest = h.ok("session_list", json!({"cursor":cursor,"limit":1})).await;
    assert_eq!(rest["children"].as_array().unwrap().len(), 1);
    h.finish().await;
}

#[tokio::test]
async fn busy_send_is_durable_and_parked_followup_resumes_with_fresh_readback() {
    let mut s = script();
    s.asks = vec![FakeAsk::Elicitation];
    let h = Harness::new(s).await;
    let receipt = h.spawn("busy-start", json!({})).await;
    let child = receipt["child_id"].as_str().unwrap();
    let pending = eventually("child elicitation", async || {
        h.state
            .store
            .open_pending(child)
            .unwrap()
            .into_iter()
            .find(|p| !p.answered)
    })
    .await;
    let first_turn = h
        .state
        .store
        .find_session(child)
        .unwrap()
        .unwrap()
        .open_turn_id
        .unwrap();
    let follow = h
        .ok(
            "session_send",
            json!({"operation_key":"busy-follow","child_id":child,"text":"follow up"}),
        )
        .await;
    assert_eq!(follow["state"]["state"], "queued");
    assert_eq!(
        h.state
            .store
            .find_session(child)
            .unwrap()
            .unwrap()
            .open_turn_id
            .as_deref(),
        Some(first_turn.as_str())
    );
    let queued = h.status(child).await;
    assert_eq!(queued["summary"]["queued"], 1);
    h.ok("session_answer",json!({"operation_key":"release-first","child_id":child,"pending_id":pending.pending_id,"action":"accept","content":{"name":"first"}})).await;
    eventually("follow-up has its own turn", async || {
        h.state
            .store
            .find_session(child)
            .unwrap()
            .unwrap()
            .open_turn_id
            .filter(|turn| turn != &first_turn)
    })
    .await;
    h.finish().await;

    let h = Harness::new(script()).await;
    let receipt = h.spawn("park-start", json!({"model":"large"})).await;
    let child = receipt["child_id"].as_str().unwrap();
    h.done(child, "park-start").await;
    let (status, body) = h.post(&format!("/api/sessions/{child}/park"), json!({})).await;
    assert!(status.is_success(), "{body}");
    eventually("genuinely parked child", async || {
        h.state
            .store
            .find_session(child)
            .unwrap()
            .filter(|s| s.lifecycle == "parked" && !s.presumed_parked)
            .map(|_| ())
    })
    .await;
    h.ok(
        "session_send",
        json!({"operation_key":"resume-follow","child_id":child,"text":"continue after parking"}),
    )
    .await;
    h.done(child, "resume-follow").await;
    assert_eq!(h.status(child).await["actual"]["model"], "large");
    let log = std::fs::read_to_string(h.cwd.join("worker-sessions.jsonl")).unwrap();
    assert!(
        log.lines()
            .any(|line| serde_json::from_str::<Value>(line).unwrap()["method"] == "session/load")
    );
    h.finish().await;
}

#[tokio::test]
async fn permission_questions_remain_operator_only_and_elicitation_has_one_answer_winner() {
    use hennery_proto::frames::PendingKind;
    let mut s = script();
    s.asks = vec![FakeAsk::Permission, FakeAsk::Elicitation];
    s.asks_at_once = true;
    let h = Harness::new(s).await;
    let receipt = h.spawn("questions", json!({})).await;
    let child = receipt["child_id"].as_str().unwrap();
    let pending = eventually("both canonical pending requests", async || {
        let p = h.state.store.open_pending(child).unwrap();
        (p.len() == 2).then_some(p)
    })
    .await;
    let permission = pending.iter().find(|p| p.kind == PendingKind::Permission).unwrap();
    let elicitation = pending.iter().find(|p| p.kind == PendingKind::Elicitation).unwrap();
    let status = h.status(child).await;
    let permission_card = status["questions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|q| q["pending_id"] == permission.pending_id)
        .unwrap();
    assert_eq!(permission_card["operator_required"], true);
    assert!(permission_card["question"].is_null());
    let refused=h.call("session_answer",json!({"operation_key":"not-permission","child_id":child,"pending_id":permission.pending_id,"action":"accept","content":{}})).await;
    assert_eq!(refused["structuredContent"]["code"], "operator_required");
    assert!(
        !h.state
            .store
            .pending_item(&permission.pending_id)
            .unwrap()
            .unwrap()
            .answered
    );
    let elicitation_path = format!("/api/sessions/{child}/pending/{}/answer", elicitation.pending_id);
    let (parent,operator)=tokio::join!(
        h.call("session_answer",json!({"operation_key":"parent-answer","child_id":child,"pending_id":elicitation.pending_id,"action":"accept","content":{"name":"parent"}})),
        h.post(&elicitation_path,json!({"action":"accept","content":{"name":"operator"}}))
    );
    let parent_won = parent["isError"] == false;
    let operator_won = operator.0 == reqwest::StatusCode::ACCEPTED;
    assert_ne!(parent_won, operator_won, "parent:{parent}, operator:{operator:?}");
    assert!(
        h.state
            .store
            .pending_item(&elicitation.pending_id)
            .unwrap()
            .unwrap()
            .answered
    );
    let (status, body) = h
        .post(
            &format!("/api/sessions/{child}/pending/{}/answer", permission.pending_id),
            json!({"option_id":"allow"}),
        )
        .await;
    assert_eq!(status, reqwest::StatusCode::ACCEPTED, "{body}");
    eventually("both answers delivered", async || {
        let permission = h.state.store.pending_item(&permission.pending_id).unwrap().unwrap();
        let elicitation = h.state.store.pending_item(&elicitation.pending_id).unwrap().unwrap();
        (permission.delivered == Some(true) && elicitation.delivered == Some(true)).then_some(())
    })
    .await;
    h.done(child, "questions").await;
    h.finish().await;
}

#[tokio::test]
async fn delegated_parked_close_is_attributed_and_reaches_existing_dashboard_stream() {
    let h = Harness::with_worker(script(), None, false).await;
    let receipt = h.spawn("park-close", json!({})).await;
    let child = receipt["child_id"].as_str().unwrap();
    eventually("completed child before parking", async || {
        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
        (h.status(child).await["last_outcome"] == "completed").then_some(())
    })
    .await;
    let (status, body) = h.post(&format!("/api/sessions/{child}/park"), json!({})).await;
    assert!(status.is_success(), "{body}");
    eventually("idle genuinely parked child", async || {
        let session = h.state.store.find_session(child).unwrap().unwrap();
        (session.lifecycle == "parked" && !session.presumed_parked && session.open_turn_id.is_none()).then_some(())
    })
    .await;
    let page: Value = h
        .client
        .get(format!("{}/api/view/sessions", h.url))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let mut dashboard = LiveSse::open(
        &h,
        &format!(
            "/api/stream/sessions?after={}:{}",
            page["epoch"].as_str().unwrap(),
            page["revision"].as_i64().unwrap()
        ),
        None,
    )
    .await;
    assert_eq!(dashboard.next().await.0, "waiting_changed");
    let before = h.state.store.max_event_id().unwrap();
    let arguments = json!({"operation_key":"close-parked","child_id":child});
    let closed = h.ok("session_close", arguments.clone()).await;
    let events = h.state.store.events(child, before, 100).unwrap();
    let close: Vec<_> = events.iter().filter(|event| event.kind == "operator_closed").collect();
    assert_eq!(close.len(), 1, "one durable close marker for an idle parked child");
    assert_eq!(
        close[0].body["origin"],
        json!({"kind":"parent","session_id":h.parent,"operation_id":closed["operation_id"]})
    );
    let summary = dashboard
        .matching("session_upsert", |summary| {
            summary["session_id"] == child && summary["lifecycle"] == "closed"
        })
        .await;
    assert_eq!(summary["question_waits"], false);
    h.ok("session_close", arguments).await;
    assert_eq!(h.state.store.events(child, before, 100).unwrap().len(), events.len());
    h.finish().await;
}

#[tokio::test]
async fn queued_parent_answer_reaches_existing_session_stream_before_dispatch() {
    let mut worker = script();
    worker.asks = vec![FakeAsk::Elicitation];
    let h = Harness::with_worker(worker, None, false).await;
    let receipt = h.spawn("answer-stream", json!({})).await;
    let child = receipt["child_id"].as_str().unwrap();
    let pending = eventually("ordinary child question", async || {
        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
        h.state.store.open_pending(child).unwrap().into_iter().next()
    })
    .await;
    let last = h.state.store.events(child, 0, 100).unwrap().last().unwrap().event_id;
    let mut stream = LiveSse::open(&h, &format!("/api/stream/sessions/{child}"), Some(last - 1)).await;
    stream.matching("event", |event| event["event_id"] == last).await;
    let mut published = h.state.hub.subscribe();
    let arguments = json!({"operation_key":"answer-live","child_id":child,"pending_id":pending.pending_id,"action":"accept","content":{"name":"parent"}});
    let accepted = h.ok("session_answer", arguments.clone()).await;
    let event = stream
        .matching("event", |event| event["kind"] == "answer_submitted")
        .await;
    assert_eq!(
        event["body"]["origin"],
        json!({"kind":"parent","session_id":h.parent,"operation_id":accepted["operation_id"]})
    );
    let changed = stream
        .matching("pending_changed", |item| item["pending_id"] == pending.pending_id)
        .await;
    assert_eq!(changed["answered"], true);
    assert!(changed["delivered"].is_null(), "publication precedes host handoff");
    let committed = h.state.store.events(child, last, 100).unwrap();
    assert_eq!(committed.len(), 1);
    let child_events: Vec<_> = std::iter::from_fn(|| published.try_recv().ok())
        .filter(|event| event.session_id == child)
        .collect();
    assert_eq!(
        child_events, committed,
        "the child publishes exactly its committed answer; parent reports have their own stream"
    );
    h.ok("session_answer", arguments).await;
    assert!(
        !std::iter::from_fn(|| published.try_recv().ok()).any(|event| event.session_id == child),
        "retry must not republish the child's answer"
    );
    h.finish().await;
}

/// Local acceptance only: adapters are supplied explicitly, never installed by
/// the test. The dispatch worker is disabled and drained exactly once to attach
/// the accepted child; its saved brief is never submitted to the adapter.
#[tokio::test]
#[ignore = "requires explicitly supplied pinned adapter; starts no provider turn"]
async fn pinned_adapter_discovers_seven_tools_and_attaches_one_child_without_inference() {
    let adapters = PathBuf::from(std::env::var("HENNERY_D2_PINNED_ADAPTER_ROOT").expect("pinned adapter root"));
    let runtime = std::env::var("HENNERY_D2_RUNTIME").unwrap_or_else(|_| "claude".into());
    assert!(matches!(runtime.as_str(), "claude" | "codex"));
    let node = std::env::var("HENNERY_D2_NODE").unwrap_or_else(|_| {
        std::env::split_paths(&std::env::var_os("PATH").unwrap())
            .map(|dir| dir.join("node"))
            .find(|file| file.is_file())
            .expect("node in dev shell")
            .display()
            .to_string()
    });
    hennery_testkit::first_exec(&node);
    let home = tempfile::tempdir().unwrap();
    for leaf in ["config", "data", "cache", "claude", "codex", "codex-sqlite"] {
        std::fs::create_dir(home.path().join(leaf)).unwrap();
    }
    let entry = if runtime == "codex" {
        "@agentclientprotocol/codex-acp/dist/index.js"
    } else {
        "@agentclientprotocol/claude-agent-acp/dist/index.js"
    };
    let command = AgentCommand {
        program: node,
        args: vec![adapters.join(entry).display().to_string()],
        env: vec![
            ("HOME".into(), home.path().display().to_string()),
            (
                "XDG_CONFIG_HOME".into(),
                home.path().join("config").display().to_string(),
            ),
            ("XDG_DATA_HOME".into(), home.path().join("data").display().to_string()),
            ("XDG_CACHE_HOME".into(), home.path().join("cache").display().to_string()),
            (
                "CLAUDE_CONFIG_DIR".into(),
                home.path().join("claude").display().to_string(),
            ),
            ("CODEX_HOME".into(), home.path().join("codex").display().to_string()),
            (
                "CODEX_SQLITE_HOME".into(),
                home.path().join("codex-sqlite").display().to_string(),
            ),
            ("SSL_CERT_FILE".into(), String::new()),
            ("SSL_CERT_DIR".into(), String::new()),
            ("CLAUDECODE".into(), String::new()),
        ],
    };
    let mut command = command;
    let profile = if runtime == "codex" {
        std::fs::write(
            home.path().join("codex/auth.json"),
            serde_json::to_vec(&json!({"OPENAI_API_KEY":"sk-hennery-discovery-fixture"})).unwrap(),
        )
        .unwrap();
        let binary = adapters.join(
            ".pnpm/@openai+codex@0.155.1-darwin-arm64/node_modules/@openai/codex/vendor/aarch64-apple-darwin/bin/codex",
        );
        hennery_testkit::first_exec(binary.to_str().unwrap());
        command.env.push(("CODEX_PATH".into(), binary.display().to_string()));
        command
            .env
            .push(("OPENAI_API_KEY".into(), "sk-hennery-discovery-fixture".into()));
        Profile::Codex
    } else {
        Profile::Claude
    };
    let h = Harness::with_worker(script(), Some((command, profile)), false).await;
    let caps = h.ok("session_capabilities", json!({"agent":"worker"})).await;
    assert_eq!(caps["catalogs"][0]["freshness"], "fresh");
    assert_eq!(caps["catalogs"][0]["agent"], "worker");
    assert_eq!(caps["catalogs"][0]["security"]["known"], true);
    let config = if runtime == "codex" {
        json!({"mode":"read-only"})
    } else {
        json!({})
    };
    let receipt = h.spawn("pinned-startup", config).await;
    let child = receipt["child_id"].as_str().unwrap();
    // This pass sends only DelegatedAttach. With no periodic worker running,
    // no pass can dispatch the brief after SessionStarted/config evidence.
    hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
    eventually("pinned child active after startup only", async || {
        h.state
            .store
            .find_session(child)
            .unwrap()
            .filter(|s| s.lifecycle == "active")
            .map(|_| ())
    })
    .await;
    let delivery = h.state.store.mcp_delivery(child).unwrap().unwrap();
    assert_eq!(delivery.servers, 1);
    assert_eq!(
        delivery.mode,
        if runtime == "codex" {
            hennery_proto::rest::McpSessionDeliveryMode::Unisolated
        } else {
            hennery_proto::rest::McpSessionDeliveryMode::Isolated
        }
    );
    assert_eq!(
        h.state.hub.mcp_isolation(HOST, "worker").unwrap().1,
        profile.mcp_isolation()
    );
    let trace = eventually("pinned MCP seven-tool discovery", async || {
        let trace: Vec<_> = h
            .discovery
            .lock()
            .unwrap()
            .iter()
            .filter(|t| t["caller_session"] == child)
            .cloned()
            .collect();
        trace
            .iter()
            .any(|t| t["method"] == "tools/list" && t["status"] == 200 && t["tool_count"] == 7)
            .then_some(trace)
    })
    .await;
    assert!(trace.iter().any(|t| t["method"] == "initialize" && t["status"] == 200));
    assert!(
        h.state
            .store
            .find_session(child)
            .unwrap()
            .unwrap()
            .open_turn_id
            .is_none()
    );
    let status = h.status(child).await;
    assert!(status["last_outcome"].is_null());
    assert!(status["last_report"].is_null());
    println!(
        "{}",
        json!({"runtime":runtime,"child_id":child,"child_attached":true,"brief_dispatched":false,"catalog_agent":caps["catalogs"][0]["agent"],"profile_security_known":caps["catalogs"][0]["security"]["known"],"catalog_freshness":caps["catalogs"][0]["freshness"],"mcp_delivery":delivery,"mcp_isolation":profile.mcp_isolation(),"mcp":trace})
    );
    h.finish().await;
}

// Probe adapters receive no MCP entries; attached children receive the built-in
// entry. This wrapper removes only the disposable probe's catalog response,
// leaving the real fake ACP process and attached-child readback unchanged.
const COLD_CATALOG_ADAPTER: &str = r#"
const {spawn}=require('node:child_process');
const readline=require('node:readline');
const child=spawn(process.argv[2],[],{env:process.env,stdio:['pipe','pipe','inherit']});
const probes=new Set();
readline.createInterface({input:process.stdin}).on('line',line=>{
 const request=JSON.parse(line);
 if(request.method==='session/new' && request.params.mcpServers.length===0)probes.add(JSON.stringify(request.id));
 child.stdin.write(line+'\n');
}).on('close',()=>child.stdin.end());
readline.createInterface({input:child.stdout}).on('line',line=>{
 const response=JSON.parse(line);
 if(probes.has(JSON.stringify(response.id)) && response.result)response.result.configOptions=[];
 process.stdout.write(JSON.stringify(response)+'\n');
});
child.on('exit',code=>process.exit(code??1));
"#;

#[tokio::test]
async fn unavailable_prestart_catalog_validates_explicit_model_against_new_child_before_brief() {
    for clamped in [false, true] {
        let root = tempfile::tempdir().unwrap();
        let wrapper = root.path().join("cold-catalog.cjs");
        std::fs::write(&wrapper, COLD_CATALOG_ADAPTER).unwrap();
        let node = std::env::split_paths(&std::env::var_os("PATH").unwrap())
            .map(|p| p.join("node"))
            .find(|p| p.is_file())
            .unwrap();
        hennery_testkit::first_exec(node.to_str().unwrap());
        let mut s = script();
        if clamped {
            s.sticky_options = vec!["model".into()];
        }
        let mut command = fake(root.path(), "cold", s);
        command.args = vec![wrapper.display().to_string(), command.program];
        command.program = node.display().to_string();
        let h = Harness::with_worker(script(), Some((command, Profile::Claude)), true).await;
        let caps = h.ok("session_capabilities", json!({"agent":"worker"})).await;
        assert_eq!(caps["catalogs"][0]["freshness"], "unknown");
        assert!(caps["catalogs"][0]["defaults"].get("model").is_none());
        let receipt = h.spawn("cold-explicit", json!({"model":"large"})).await;
        let child = receipt["child_id"].as_str().unwrap();
        if clamped {
            eventually("cold catalog mismatch held", async || {
                let s = h.status(child).await;
                (s["actual"]["model"] == "small" && s["operations"][0]["state"]["state"] == "waiting_config")
                    .then_some(())
            })
            .await;
            hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
            assert!(
                h.state
                    .store
                    .find_session(child)
                    .unwrap()
                    .unwrap()
                    .open_turn_id
                    .is_none()
            );
            assert!(h.status(child).await["last_outcome"].is_null());
        } else {
            h.done(child, "cold-explicit").await;
            assert_eq!(h.status(child).await["actual"]["model"], "large");
        }
        h.finish().await;
    }
}

#[tokio::test]
async fn background_worker_advances_past_offline_page_and_wraps_to_repaired_earlier_target() {
    use hennery_proto::frames::McpIsolation;
    use hennery_sessions::store::McpContext;
    use rusqlite::params;
    let h = Harness::with_worker(script(), None, false).await;
    let later = h.spawn("later-page", json!({})).await;
    let later = later["child_id"].as_str().unwrap();
    // Attach once before adding global pressure. Its brief stays queued,
    // so one later page visit can complete it without first needing a wrap.
    hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
    eventually("later child ready for one dispatch", async || {
        let s = h.status(later).await;
        (s["actual"]["model"] == "small").then_some(())
    })
    .await;
    let db = h.cwd.join("hennery.db");
    let parent = h.state.store.find_session(&h.parent).unwrap().unwrap();
    let gateway = hennery_gateway::store::GatewayStore::open(&db).unwrap();
    let identity = gateway.authenticate_session(&h.token).unwrap().unwrap();
    let revision = identity.delivered_delegation_revision().unwrap();
    let earlier = "000-earlier-child";
    let earlier_cwd = h.cwd.join("repairable-workspace");
    std::fs::create_dir(&earlier_cwd).unwrap();
    h.state
        .store
        .create_delegated_session(
            &identity,
            revision,
            earlier,
            "worker",
            earlier_cwd.to_str().unwrap(),
            McpContext {
                capable: true,
                isolation: McpIsolation::ClaudeStrict,
                rules_name_other_hats: false,
            },
            0,
        )
        .unwrap()
        .unwrap();
    // A directory can disappear after acceptance and before host admission.
    // Recreating this same path later makes the held target eligible again.
    std::fs::remove_dir(&earlier_cwd).unwrap();
    h.state
        .hosts
        .register(
            "offline-backlog",
            &Enrollment {
                public_key: HostKey::from_seed([11; 32]).public_key_hex(),
                name: "offline fixture".into(),
                host_version: "fixture".into(),
                platform: "fixture".into(),
            },
            0,
        )
        .unwrap();
    let mut conn = hennery_kernel::db::open(&db).unwrap();
    {
        let tx = conn.transaction().unwrap();
        let owner = h.state.store.owner_id();
        let required = r#"{"model":"small","mode":"default"}"#;
        tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,accepted_revision) VALUES (?1,?2,'earlier','earlier-operation','fixture','session_spawn',?3,'queued',?4)",params![owner,h.parent,earlier,revision]).unwrap();
        tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES (?1,'earlier-operation',?2,?3,?4,'earlier brief',?5)",params![owner,h.parent,earlier,revision,required]).unwrap();
        tx.execute("INSERT INTO session_attach_evidence(owner_id,session_id,attach_generation,requested_config) VALUES (?1,?2,1,?3)",params![owner,earlier,required]).unwrap();
        // Global pressure is fixture data, bypassing per-parent admission caps;
        // offline rows are skipped before family/launch validation. The two
        // live targets retain real family grants, host actors and ACP traffic.
        for i in 0..129 {
            let id = format!("000-offline-{i:04}");
            let operation = format!("backlog-{i:04}");
            tx.execute("INSERT INTO sessions(id,owner_id,host_id,hat_id,agent,cwd,lifecycle,created_at,last_event_at) VALUES (?1,?2,'offline-backlog',?3,'worker',?4,'starting','fixture','fixture')",params![id,owner,parent.hat_id,h.cwd.to_str().unwrap()]).unwrap();
            tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,state,accepted_revision) VALUES (?1,?2,?3,?3,'fixture','session_send',?4,'queued',?5)",params![owner,h.parent,operation,id,revision]).unwrap();
            tx.execute("INSERT INTO session_dispatch_queue(owner_id,operation_id,source_id,target_id,accepted_revision,payload,required_config) VALUES (?1,?2,?3,?4,?5,'offline brief',?6)",params![owner,operation,h.parent,id,revision,required]).unwrap();
        }
        tx.commit().unwrap();
    }
    let first_page = h.state.store.delegation_targets_after("").unwrap();
    assert_eq!(first_page.len(), 128);
    assert_eq!(first_page[0], earlier);
    assert!(!first_page.iter().any(|id| id == later));
    hennery_sessions::delegation_worker::after_startup(&h.state);
    eventually("later ready child beyond the offline first page", async || {
        let s = h.status(later).await;
        s["operations"]
            .as_array()
            .unwrap()
            .iter()
            .any(|o| o["state"]["state"] == "completed")
            .then_some(())
    })
    .await;
    assert_eq!(
        h.state.store.find_session(earlier).unwrap().unwrap().lifecycle,
        "starting"
    );
    std::fs::create_dir(&earlier_cwd).unwrap();
    eventually("earlier repaired child after cursor wrap", async || {
        let s = h.status(earlier).await;
        s["operations"]
            .as_array()
            .unwrap()
            .iter()
            .any(|o| o["state"]["state"] == "completed")
            .then_some(())
    })
    .await;
    assert_eq!(h.status(earlier).await["last_outcome"], "completed");
    h.finish().await;
}

#[tokio::test]
async fn background_answer_worker_advances_past_held_page_and_wraps_to_repaired_earlier_answer() {
    use rusqlite::params;
    let mut worker = script();
    worker.asks = vec![FakeAsk::Elicitation];
    let h = Harness::with_worker(worker, None, false).await;
    let earlier = h.spawn("answer-earlier", json!({})).await;
    let earlier = earlier["child_id"].as_str().unwrap();
    let later = h.spawn("answer-later", json!({})).await;
    let later = later["child_id"].as_str().unwrap();
    let (earlier_pending, later_pending) = eventually("both children asking", async || {
        hennery_sessions::delegation_worker::drain(&h.state).await.unwrap();
        let earlier = h
            .state
            .store
            .open_pending(earlier)
            .unwrap()
            .into_iter()
            .find(|p| !p.answered)?;
        let later = h
            .state
            .store
            .open_pending(later)
            .unwrap()
            .into_iter()
            .find(|p| !p.answered)?;
        Some((earlier, later))
    })
    .await;
    h.ok("session_answer", json!({"operation_key":"earlier-answer","child_id":earlier,"pending_id":earlier_pending.pending_id,"action":"accept","content":{"name":"answer"}})).await;
    let mut conn = hennery_kernel::db::open(&h.cwd.join("hennery.db")).unwrap();
    let revision: i64;
    {
        let tx = conn.transaction().unwrap();
        let owner = h.state.store.owner_id();
        revision = tx.query_row("SELECT accepted_revision FROM session_operations WHERE owner_id=?1 AND caller_id=?2 AND operation_key='earlier-answer'",params![owner,h.parent],|r|r.get(0)).unwrap();
        // These accepted rows are held by a changed delegation grant. Fixture
        // pressure bypasses admission limits; both live answers still use real
        // parent grants, pending records, host actors and ACP traffic.
        tx.execute("UPDATE session_operations SET operation_id='000-earlier-answer',accepted_revision=?3 WHERE owner_id=?1 AND caller_id=?2 AND operation_key='earlier-answer'",params![owner,h.parent,revision-1]).unwrap();
        for i in 0..127 {
            let pending = format!("held-answer-question-{i:04}");
            let operation = format!("100-held-answer-{i:04}");
            tx.execute("INSERT INTO pending(pending_id,session_id,turn_id,kind,option_ids,payload,state,opened_at,owner_id) SELECT ?1,session_id,turn_id,kind,option_ids,payload,'open',opened_at,owner_id FROM pending WHERE owner_id=?2 AND pending_id=?3",params![pending,owner,earlier_pending.pending_id]).unwrap();
            tx.execute("INSERT INTO answer_queue(owner_id,pending_id,session_id,request_id,answer,submitted_at,delegation_handoff) SELECT owner_id,?1,session_id,?2,answer,submitted_at,0 FROM answer_queue WHERE owner_id=?3 AND pending_id=?4",params![pending,operation,owner,earlier_pending.pending_id]).unwrap();
            tx.execute("INSERT INTO session_operations(owner_id,caller_id,operation_key,operation_id,digest,tool,child_id,pending_id,request_id,state,accepted_revision) VALUES (?1,?2,?3,?3,'fixture','session_answer',?4,?5,?3,'queued',?6)",params![owner,h.parent,operation,earlier,pending,revision-1]).unwrap();
        }
        tx.commit().unwrap();
    }
    h.ok("session_answer", json!({"operation_key":"later-answer","child_id":later,"pending_id":later_pending.pending_id,"action":"accept","content":{"name":"answer"}})).await;
    conn.execute("UPDATE session_operations SET operation_id='999-later-answer' WHERE owner_id=?1 AND caller_id=?2 AND operation_key='later-answer'",params![h.state.store.owner_id(),h.parent]).unwrap();
    assert_eq!(conn.query_row("SELECT COUNT(*) FROM session_operations WHERE owner_id=?1 AND tool='session_answer' AND state='queued' AND operation_id < '999-later-answer'",[h.state.store.owner_id()],|r|r.get::<_,i64>(0)).unwrap(),128);
    hennery_sessions::delegation_worker::after_startup(&h.state);
    eventually("eligible answer beyond 128 held answers", async || {
        (h.state
            .store
            .pending_item(&later_pending.pending_id)
            .unwrap()
            .unwrap()
            .delivered
            == Some(true))
        .then_some(())
    })
    .await;
    assert_eq!(
        h.state
            .store
            .pending_item(&earlier_pending.pending_id)
            .unwrap()
            .unwrap()
            .delivered,
        None
    );
    conn.execute("UPDATE session_operations SET accepted_revision=?3 WHERE owner_id=?1 AND caller_id=?2 AND operation_key='earlier-answer'",params![h.state.store.owner_id(),h.parent,revision]).unwrap();
    eventually("repaired earlier answer after cursor wrap", async || {
        (h.state
            .store
            .pending_item(&earlier_pending.pending_id)
            .unwrap()
            .unwrap()
            .delivered
            == Some(true))
        .then_some(())
    })
    .await;
    h.finish().await;
}
