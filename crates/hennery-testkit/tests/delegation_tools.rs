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
        let builtin = hennery_sessions::builtin::router(state.clone(), gateway).layer(axum::middleware::from_fn(
            move |request: axum::extract::Request, next: axum::middleware::Next| {
                let observed = observed.clone();
                async move {
                    let (parts, body) = request.into_parts();
                    let bytes = axum::body::to_bytes(body, hennery_gateway::proxy::MAX_REQUEST_BODY).await.unwrap();
                    let message: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                    let response = next.run(axum::extract::Request::from_parts(parts, axum::body::Body::from(bytes))).await;
                    if matches!(message["method"].as_str(), Some("initialize" | "tools/list")) {
                        let (parts, body) = response.into_parts();
                        let bytes = axum::body::to_bytes(body, 1024*1024).await.unwrap();
                        let answer: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                        observed.lock().unwrap().push(json!({"method":message["method"],"status":parts.status.as_u16(),"tool_count":answer["result"]["tools"].as_array().map(Vec::len)}));
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
    let page = h.ok("session_list", json!({"limit":1})).await;
    assert_eq!(page["children"].as_array().unwrap().len(), 1);
    let cursor = page["next_cursor"].as_str().unwrap();
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
    let trace = eventually("pinned MCP seven-tool discovery", async || {
        let trace = h.discovery.lock().unwrap().clone();
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
        json!({"runtime":runtime,"child_attached":true,"brief_dispatched":false,"catalog_freshness":caps["catalogs"][0]["freshness"],"mcp":trace})
    );
    h.finish().await;
}
