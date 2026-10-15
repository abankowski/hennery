//! Opt-in D4 provider acceptance. Normal tests never use credentials or infer.
//!
//! Supply HENNERY_D4_PINNED_ADAPTER_ROOT (the existing node_modules),
//! HENNERY_D4_CLAUDE_AUTH and HENNERY_D4_CODEX_AUTH (explicit source files),
//! HENNERY_D4_PARENT and HENNERY_D4_CHILD (claude/codex). Source credentials
//! are copied with mode 0600 into disposable homes; source homes are never
//! handed to an adapter. Run each pair with --ignored --exact --nocapture.
//! A passing smoke check is not a passing parent/child matrix or release gate.

use anyhow::{Context, Result, bail, ensure};
use hennery_gateway::{api::GatewayState, key::KeySource, session::GatewayMcp};
use hennery_host::{AgentCommand, HostConfig, identity::HostKey, profile::Profile};
use hennery_kernel::{
    egress::{Egress, Timeouts},
    hosts::{Enrollment, Hosts},
    operator::Operator,
};
use hennery_proto::{delegation_host::HostCatalog, frames::SessionConfig};
use hennery_sessions::{AppState, store::Store};
use rusqlite::OptionalExtension;
use serde_json::{Value, json};
use std::{
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Duration,
};

const HOST: &str = "live-acceptance";
const BOUND: Duration = Duration::from_secs(240);
const TOOLS: &[&str] = &[
    "session_capabilities",
    "session_spawn",
    "session_send",
    "session_answer",
    "session_status",
    "session_list",
    "session_close",
];

fn runtime(variable: &str) -> Result<String> {
    let value = std::env::var(variable).with_context(|| format!("supply {variable}"))?;
    ensure!(matches!(value.as_str(), "claude" | "codex"), "invalid runtime");
    Ok(value)
}

fn stage_auth(source_variable: &str, destination: &Path) -> Result<()> {
    let source = PathBuf::from(std::env::var(source_variable).with_context(|| format!("supply {source_variable}"))?);
    ensure!(source.is_file(), "{source_variable} must name a credential file");
    let bytes = std::fs::read(&source).context("read explicitly supplied credential file")?;
    let value: Value = serde_json::from_slice(&bytes).context("credential file must contain JSON")?;
    ensure!(value.is_object(), "credential file must contain a JSON object");
    ensure!(
        !bytes
            .windows(b"sk-hennery-discovery-fixture".len())
            .any(|part| part == b"sk-hennery-discovery-fixture"),
        "discovery fixture is not provider authentication"
    );
    let mut output = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(destination)?;
    std::io::Write::write_all(&mut output, &bytes)?;
    Ok(())
}

fn command(root: &Path, runtime: &str) -> Result<(AgentCommand, Profile)> {
    let home = root.join(format!("{runtime}-home"));
    for leaf in [
        "",
        "config",
        "data",
        "cache",
        "state",
        "claude",
        "codex",
        "codex-sqlite",
    ] {
        std::fs::create_dir_all(home.join(leaf))?;
    }
    std::fs::set_permissions(&home, std::fs::Permissions::from_mode(0o700))?;
    let adapters =
        PathBuf::from(std::env::var("HENNERY_D4_PINNED_ADAPTER_ROOT").context("supply pinned node_modules")?);
    let node = std::env::split_paths(&std::env::var_os("PATH").context("PATH missing")?)
        .map(|directory| directory.join("node"))
        .find(|file| file.is_file())
        .context("node missing from dev shell")?;
    hennery_testkit::first_exec(node.to_str().context("node path encoding")?);
    let mut env = vec![
        ("HOME".into(), home.display().to_string()),
        ("XDG_CONFIG_HOME".into(), home.join("config").display().to_string()),
        ("XDG_DATA_HOME".into(), home.join("data").display().to_string()),
        ("XDG_CACHE_HOME".into(), home.join("cache").display().to_string()),
        ("XDG_STATE_HOME".into(), home.join("state").display().to_string()),
        ("CLAUDE_CONFIG_DIR".into(), home.join("claude").display().to_string()),
        ("CODEX_HOME".into(), home.join("codex").display().to_string()),
        (
            "CODEX_SQLITE_HOME".into(),
            home.join("codex-sqlite").display().to_string(),
        ),
    ];
    // Prevent accidental provider/config inheritance. Only the explicitly staged
    // auth file supplies identity; neither discovery fixture keys nor runner
    // routing overrides can make this look like a live vendor acceptance.
    for variable in [
        "SSL_CERT_FILE",
        "SSL_CERT_DIR",
        "HENNERY_DATA_DIR",
        "HENNERY_HOST_DATA_DIR",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_AUTH_TOKEN",
        "CLAUDE_CODE_OAUTH_TOKEN",
        "OPENAI_API_KEY",
        "CODEX_API_KEY",
        "ANTHROPIC_BASE_URL",
        "OPENAI_BASE_URL",
        "CLAUDE_CODE_USE_BEDROCK",
        "CLAUDE_CODE_USE_VERTEX",
    ] {
        env.push((variable.into(), String::new()));
    }
    let (package, version, profile) = if runtime == "claude" {
        stage_auth("HENNERY_D4_CLAUDE_AUTH", &home.join("claude/.credentials.json"))?;
        std::fs::write(home.join("claude.json"), br#"{"hasCompletedOnboarding":true}"#)?;
        ("claude-agent-acp", "0.81.0", Profile::Claude)
    } else {
        stage_auth("HENNERY_D4_CODEX_AUTH", &home.join("codex/auth.json"))?;
        let arch = if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
            "darwin-arm64/node_modules/@openai/codex/vendor/aarch64-apple-darwin"
        } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
            "linux-x64/node_modules/@openai/codex/vendor/x86_64-unknown-linux-musl"
        } else {
            bail!("supply the supported pinned native Codex platform")
        };
        let binary = adapters.join(format!(".pnpm/@openai+codex@0.155.1-{arch}/bin/codex"));
        ensure!(binary.is_file(), "pinned native Codex 0.155.1 is missing");
        hennery_testkit::first_exec(binary.to_str().context("Codex path encoding")?);
        env.push(("CODEX_PATH".into(), binary.display().to_string()));
        ("codex-acp", "1.13.0", Profile::Codex)
    };
    let entry = adapters.join(format!("@agentclientprotocol/{package}"));
    let metadata: Value = serde_json::from_slice(&std::fs::read(entry.join("package.json"))?)?;
    ensure!(
        metadata["version"] == version,
        "adapter version differs from accepted pin"
    );
    Ok((
        AgentCommand {
            program: node.display().to_string(),
            args: vec![entry.join("dist/index.js").display().to_string()],
            env,
        },
        profile,
    ))
}

struct Harness {
    dir: tempfile::TempDir,
    state: AppState,
    client: reqwest::Client,
    url: String,
    parent: String,
    trace: Arc<Mutex<Vec<Value>>>,
    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
    host: tokio::task::JoinHandle<anyhow::Result<()>>,
    server: tokio::task::JoinHandle<()>,
}
impl Drop for Harness {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        self.state.shutdown.cancel();
        self.server.abort();
    }
}
impl Harness {
    async fn new(parent_runtime: &str, child_runtime: Option<&str>) -> Result<Self> {
        let dir = tempfile::tempdir()?;
        let root = dir.path().canonicalize()?;
        let db = root.join("hennery.db");
        let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).await?;
        let url = format!("http://{}", listener.local_addr()?);
        let key = HostKey::from_seed([23; 32]);
        let hosts = Hosts::open(&db)?;
        hosts.register(
            HOST,
            &Enrollment {
                public_key: key.public_key_hex(),
                name: "acceptance".into(),
                host_version: "acceptance".into(),
                platform: "acceptance".into(),
            },
            0,
        )?;
        let hat = hosts.host(HOST)?.context("registered host")?.default_hat_id;
        let state = AppState::new(Store::open(&db)?, hosts, Operator::open(&db)?);
        let now = hennery_kernel::secret::unix_now();
        let setup = state.operator.issue_setup_token(now)?.context("setup token")?;
        state
            .operator
            .set_up(&setup, hennery_testkit::OWNER_PASSWORD, &url, now)?;
        let phc = state
            .operator
            .verify_password(hennery_testkit::OWNER_PASSWORD)?
            .context("password")?;
        let session = state
            .operator
            .open_session("live-acceptance", &phc, now)?
            .context("operator session")?;
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(reqwest::header::ORIGIN, url.parse()?);
        headers.insert(reqwest::header::COOKIE, format!("hennery_session={session}").parse()?);
        let client = reqwest::Client::builder().no_proxy().default_headers(headers).build()?;
        let keys = KeySource::from_vars(&root, Some("23".repeat(32).into()), None)?;
        let gateway: GatewayState = hennery_gateway::open(
            &db,
            &keys,
            state.operator.clone(),
            Egress::new(Timeouts::DEFAULT)?,
            Arc::new(hennery_gateway::notify::Silent),
        )?;
        state
            .store
            .set_session_mcp(Arc::new(GatewayMcp::for_collector(&gateway)));
        gateway.runtime.store.set_session_tools(&hat, true)?;
        let trace: Arc<Mutex<Vec<Value>>> = Arc::default();
        let observed = trace.clone();
        let auth = gateway.runtime.store.clone();
        let builtin = hennery_sessions::builtin::router(state.clone(), gateway).layer(axum::middleware::from_fn(
            move |request: axum::extract::Request, next: axum::middleware::Next| {
                let observed = observed.clone(); let auth = auth.clone();
                async move {
                    let caller = request.headers().get("authorization").and_then(|h| h.to_str().ok()).and_then(|h| h.strip_prefix("Bearer ")).and_then(|t| auth.authenticate_session(t).ok().flatten()).map(|i| {
                        let hennery_gateway::scope::PrincipalKind::Session { session_id, .. } = i.principal.kind; session_id
                    });
                    let (parts, body) = request.into_parts();
                    let bytes = axum::body::to_bytes(body, hennery_gateway::proxy::MAX_REQUEST_BODY).await.unwrap();
                    let input: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                    let response = next.run(axum::extract::Request::from_parts(parts, axum::body::Body::from(bytes))).await;
                    let (parts, body) = response.into_parts();
                    let bytes = axum::body::to_bytes(body, 1024 * 1024).await.unwrap();
                    let output: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                    // Never persist bearer, arguments, free text, errors or cookies.
                    let method = input["method"].as_str().filter(|s| matches!(*s, "initialize" | "tools/list" | "tools/call"));
                    let tool = input["params"]["name"].as_str().filter(|s| TOOLS.contains(s));
                    let names = output["result"]["tools"].as_array().map(|tools| tools.iter().filter_map(|t| t["name"].as_str().filter(|s| TOOLS.contains(s))).collect::<Vec<_>>());
                    observed.lock().unwrap().push(json!({"caller":caller,"method":method,"tool":tool,"status":parts.status.as_u16(),"is_error":output["result"]["isError"].as_bool(),"rpc_error":output["error"]["code"].as_i64(),"tools":names,"fields":input.as_object().map(|object| object.keys().collect::<Vec<_>>()),"param_fields":input["params"].as_object().map(|object| object.keys().collect::<Vec<_>>()),"meta_fields":input["params"]["_meta"].as_object().map(|object| object.keys().collect::<Vec<_>>())}));
                    axum::response::Response::from_parts(parts, axum::body::Body::from(bytes))
                }
            }
        ));
        let router = hennery_sessions::router(state.clone()).merge(builtin);
        let server = tokio::spawn(async move {
            axum::serve(
                listener,
                router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
            )
            .await
            .unwrap();
        });
        let mut config = HostConfig::new(
            format!("{}/api/hosts/ws", url.replacen("http:", "ws:", 1)),
            HOST,
            key,
            root.join("host-data"),
        );
        config.workspace_roots = vec![root.clone()];
        config.git = None;
        for runtime in ["claude", "codex"]
            .into_iter()
            .filter(|runtime| *runtime == parent_runtime || Some(*runtime) == child_runtime)
        {
            let (command, profile) = command(&root, runtime)?;
            config.agents.insert(runtime.into(), command);
            config.profiles.insert(runtime.into(), profile);
        }
        let (shutdown, signal) = tokio::sync::oneshot::channel();
        let host = tokio::spawn(hennery_host::run_until(config, async {
            let _ = signal.await;
        }));
        let mut h = Self {
            dir,
            state,
            client,
            url,
            parent: String::new(),
            trace,
            shutdown: Some(shutdown),
            host,
            server,
        };
        h.wait("host ready", || h.state.hub.is_ready(HOST).then_some(()))
            .await?;
        hennery_sessions::delegation_worker::after_startup(&h.state);
        let catalog = h.catalog(parent_runtime).await?;
        println!(
            "{}",
            json!({"phase":"catalog","runtime":parent_runtime,"config_options":catalog.config_options,"defaults":catalog.defaults,"security":catalog.security})
        );
        let response = h.client.post(format!("{}/api/sessions", h.url)).json(&json!({"host_id":HOST,"agent":parent_runtime,"cwd":root,"mode":if parent_runtime == "codex" {"read-only"} else {"default"}})).send().await?;
        ensure!(
            response.status() == reqwest::StatusCode::ACCEPTED,
            "parent start HTTP {}",
            response.status()
        );
        h.parent = response.json::<Value>().await?["session_id"]
            .as_str()
            .context("parent session id")?
            .into();
        h.wait("parent attach", || {
            h.state
                .store
                .find_session(&h.parent)
                .ok()
                .flatten()
                .filter(|s| s.lifecycle == "active")
                .map(|_| ())
        })
        .await?;
        Ok(h)
    }
    async fn wait<T>(&self, phase: &str, mut predicate: impl FnMut() -> Option<T>) -> Result<T> {
        let result = tokio::time::timeout(BOUND, async {
            loop {
                if let Some(value) = predicate() {
                    println!("{}", json!({"phase":phase,"passed":true}));
                    return Ok(value);
                }
                if self
                    .trace
                    .lock()
                    .unwrap()
                    .iter()
                    .any(|row| row["method"] == "tools/call" && row["rpc_error"].is_number())
                {
                    self.diagnostics(phase)?;
                    bail!("actual adapter tools/call was refused at protocol parsing");
                }
                self.approve_parent_tools().await?;
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
        })
        .await;
        match result {
            Ok(value) => value,
            Err(_) => {
                self.diagnostics(phase)?;
                bail!(
                    "{phase} exceeded {} seconds; scrubbed diagnostics printed",
                    BOUND.as_secs()
                )
            }
        }
    }
    async fn approve_parent_tools(&self) -> Result<()> {
        if self.parent.is_empty() {
            return Ok(());
        }
        for question in self.state.store.open_pending(&self.parent)? {
            if question.answered || question.kind != hennery_proto::frames::PendingKind::Permission {
                continue;
            }
            let updates: Vec<_> = self
                .state
                .store
                .events(&self.parent, 0, 1000)?
                .into_iter()
                .filter_map(|event| event.body.pointer("/payload/update").cloned())
                .collect();
            let allowed = builtin_permission(&question.payload, &updates);
            ensure!(
                allowed,
                "unexpected parent permission; harness authorizes only named built-in MCP tools"
            );
            let option = question.payload["options"]
                .as_array()
                .and_then(|options| options.iter().find(|option| option["kind"] == "allow_once"))
                .and_then(|option| option["optionId"].as_str())
                .context("parent MCP permission lacks allow_once")?;
            let response = self
                .client
                .post(format!(
                    "{}/api/sessions/{}/pending/{}/answer",
                    self.url, self.parent, question.pending_id
                ))
                .json(&json!({"option_id":option}))
                .send()
                .await?;
            ensure!(
                response.status() == reqwest::StatusCode::ACCEPTED,
                "parent MCP permission answer HTTP {}",
                response.status()
            );
        }
        Ok(())
    }
    fn diagnostics(&self, phase: &str) -> Result<()> {
        let events = if self.parent.is_empty() {
            vec![]
        } else {
            self.state.store.events(&self.parent, 0, 1000)?
        };
        let messages: Vec<_> = events
            .iter()
            .filter(|e| e.kind == "turn_ended" || e.kind == "start_failed")
            .filter_map(|e| {
                e.body
                    .get("error")
                    .or_else(|| e.body.get("message"))
                    .and_then(Value::as_str)
            })
            .map(scrub_error)
            .collect::<Result<_>>()?;
        let text = messages.join(" ").to_lowercase();
        let known = [
            "authentication_error",
            "invalid_api_key",
            "unauthorized",
            "rate_limit",
            "insufficient_quota",
            "token_expired",
            "certificate",
            "connection refused",
        ];
        let errors: Vec<_> = known.into_iter().filter(|error| text.contains(error)).collect();
        let kinds: Vec<_> = events.iter().map(|e| e.kind.as_str()).collect();
        println!(
            "{}",
            json!({"phase":phase,"error_classes":errors,"errors":messages,"event_kinds":kinds,"mcp":*self.trace.lock().unwrap()})
        );
        Ok(())
    }
    async fn catalog(&self, agent: &str) -> Result<HostCatalog> {
        let response = self
            .client
            .get(format!("{}/api/hosts/{HOST}/runtime-catalog", self.url))
            .query(&[
                ("agent", agent),
                ("cwd", self.dir.path().to_str().context("cwd encoding")?),
            ])
            .send()
            .await?;
        ensure!(response.status().is_success(), "catalog HTTP {}", response.status());
        Ok(response.json().await?)
    }
    async fn prompt(&self, id: &str, text: &str) -> Result<String> {
        let response = self
            .client
            .post(format!("{}/api/sessions/{id}/prompt", self.url))
            .json(&json!({"content":[{"type":"text","text":text}]}))
            .send()
            .await?;
        ensure!(
            response.status() == reqwest::StatusCode::ACCEPTED,
            "prompt HTTP {}",
            response.status()
        );
        Ok(response.json::<Value>().await?["turn_id"]
            .as_str()
            .context("turn id")?
            .into())
    }
    fn child(&self) -> Option<String> {
        hennery_kernel::db::open(&self.dir.path().join("hennery.db"))
            .ok()?
            .query_row(
                "SELECT child_id FROM session_families WHERE owner_id=?1 AND parent_id=?2 AND detached=0 LIMIT 1",
                rusqlite::params![self.state.store.owner_id(), self.parent],
                |r| r.get(0),
            )
            .optional()
            .ok()
            .flatten()
    }
    async fn finish(mut self) -> Result<()> {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        tokio::time::timeout(Duration::from_secs(30), &mut self.host).await???;
        self.state.shutdown.cancel();
        Ok(())
    }
}

fn scrub_error(message: &str) -> Result<String> {
    fn strings(value: &Value, output: &mut Vec<String>) {
        match value {
            Value::String(text) if text.len() >= 8 => output.push(text.clone()),
            Value::Array(values) => {
                for value in values {
                    strings(value, output);
                }
            }
            Value::Object(values) => {
                for value in values.values() {
                    strings(value, output);
                }
            }
            _ => {}
        }
    }
    let mut secrets = vec![];
    for variable in ["HENNERY_D4_CLAUDE_AUTH", "HENNERY_D4_CODEX_AUTH"] {
        if let Ok(path) = std::env::var(variable) {
            let value: Value = serde_json::from_slice(&std::fs::read(path)?)?;
            strings(&value, &mut secrets);
        }
    }
    secrets.sort_by_key(|text| std::cmp::Reverse(text.len()));
    let mut clean = message.to_owned();
    for secret in secrets {
        clean = clean.replace(&secret, "[credential]");
    }
    Ok(clean.chars().take(2000).collect())
}

fn builtin_permission(payload: &Value, updates: &[Value]) -> bool {
    let claude = payload
        .pointer("/toolCall/_meta/claudeCode/toolName")
        .and_then(Value::as_str)
        .is_some_and(|name| TOOLS.iter().any(|tool| name == format!("mcp__hennery__{tool}")));
    let codex = payload.pointer("/_meta/is_mcp_tool_approval") == Some(&Value::Bool(true))
        && payload
            .pointer("/toolCall/toolCallId")
            .and_then(Value::as_str)
            .is_some_and(|id| {
                updates.iter().any(|update| {
                    update["toolCallId"] == id
                        && update["_meta"]["is_mcp_tool_call"] == true
                        && update["rawInput"]["server"] == "hennery"
                        && update["rawInput"]["tool"]
                            .as_str()
                            .is_some_and(|tool| TOOLS.contains(&tool))
                })
            });
    claude || codex
}

#[test]
fn parent_operator_approval_is_limited_to_correlated_builtin_tools() {
    let call = json!({"toolCallId":"call","_meta":{"is_mcp_tool_call":true},"rawInput":{"server":"hennery","tool":"session_spawn"}});
    let permission = json!({"toolCall":{"toolCallId":"call"},"_meta":{"is_mcp_tool_approval":true}});
    assert!(builtin_permission(&permission, std::slice::from_ref(&call)));
    assert!(builtin_permission(
        &json!({"toolCall":{"_meta":{"claudeCode":{"toolName":"mcp__hennery__session_spawn"}}}}),
        &[]
    ));
    for denied in [
        json!({"toolCall":{"toolCallId":"other"},"_meta":{"is_mcp_tool_approval":true}}),
        json!({"toolCall":{"toolCallId":"call"}}),
        json!({"toolCall":{"title":"mcp__hennery__session_spawn","_meta":{"claudeCode":{"toolName":"Bash"}}}}),
    ] {
        assert!(!builtin_permission(&denied, std::slice::from_ref(&call)));
    }
    for denied in [
        json!({"toolCallId":"call","_meta":{"is_mcp_tool_call":true},"rawInput":{"server":"foreign","tool":"session_spawn"}}),
        json!({"toolCallId":"call","_meta":{"is_mcp_tool_call":true},"rawInput":{"server":"hennery","tool":"unknown"}}),
        json!({"toolCallId":"call","rawInput":{"server":"hennery","tool":"session_spawn"}}),
    ] {
        assert!(!builtin_permission(&permission, &[denied]));
    }
}

#[tokio::test]
#[ignore = "requires explicit pinned adapters and provider credentials; performs inference"]
async fn pinned_runtime_provider_authentication() -> Result<()> {
    let runtime = runtime("HENNERY_D4_PARENT")?;
    let h = Harness::new(&runtime, None).await?;
    let result = async {
        let turn = h
            .prompt(
                &h.parent,
                "Reply with exactly HENNERY_PROVIDER_OK. Do not call any tools.",
            )
            .await?;
        let outcome = h
            .wait("provider authentication", || {
                h.state.store.ended_turn_outcome(&turn).ok().flatten()
            })
            .await?;
        if outcome != hennery_proto::frames::TurnOutcome::Completed {
            h.diagnostics("provider failed")?;
            bail!("provider turn outcome {outcome:?}");
        }
        let events = h.state.store.events(&h.parent, 0, 1000)?;
        ensure!(
            serde_json::to_string(&events)?.contains("HENNERY_PROVIDER_OK"),
            "provider did not return the acceptance marker"
        );
        println!(
            "{}",
            json!({"runtime":runtime,"provider_authentication":true,"outcome":outcome})
        );
        Ok(())
    }
    .await;
    let cleanup = h.finish().await;
    result.and(cleanup)
}

fn requested(catalog: &HostCatalog) -> SessionConfig {
    let mut config = catalog.defaults.clone();
    if let Some(model) = catalog
        .config_options
        .iter()
        .find(|option| option["category"] == "model")
        .and_then(|option| option["options"].as_array())
        .and_then(|options| {
            options
                .iter()
                .filter_map(|option| option["value"].as_str())
                .find(|model| matches!(*model, "sonnet" | "gpt-6-luna"))
        })
    {
        config.model = Some(model.into());
    }
    // Independent selection comes exclusively from this child's actual catalog.
    // Exercise a non-default effort when it is offered; never invent an axis.
    for option in &catalog.config_options {
        let Some(id) = option["id"].as_str() else { continue };
        if (id.contains("effort") || id.contains("reasoning"))
            && let Some(value) = option["options"].as_array().and_then(|options| {
                options
                    .iter()
                    .find_map(|o| o["value"].as_str().filter(|v| matches!(*v, "low" | "medium")))
            })
        {
            config
                .axes
                .insert(id.into(), hennery_proto::frames::ConfigValue::Id(value.into()));
        }
    }
    if catalog.agent == "codex" {
        config.mode = Some("read-only".into());
        config.axes.insert(
            "collaboration_mode".into(),
            hennery_proto::frames::ConfigValue::Id("plan".into()),
        );
    }
    config
}

#[tokio::test]
#[ignore = "requires explicit pinned parent/child adapters and provider credentials; performs inference"]
async fn pinned_parent_child_provider_matrix() -> Result<()> {
    let parent = runtime("HENNERY_D4_PARENT")?;
    let child_runtime = runtime("HENNERY_D4_CHILD")?;
    let h = Harness::new(&parent, Some(&child_runtime)).await?;
    let result = async {
        let catalog = h.catalog(&child_runtime).await?;
        let config = requested(&catalog);
        ensure!(hennery_sessions::delegation_runtime::config_offered(&catalog, &config), "chosen child configuration absent from actual catalog");
        let brief = if child_runtime == "claude" {
            "Acceptance task: immediately use AskUserQuestion to ask one required single-choice question with options blue and green, named acceptance_color. Do not ask in plain text. After the answer, reply exactly CHILD_ACCEPTANCE_OK followed by the color. Do not read or write any files or run commands."
        } else {
            "Acceptance task: use request_user_input to ask one required single-choice question named acceptance_color with options blue and green. Do not ask in plain text. After the answer, reply exactly CHILD_ACCEPTANCE_OK followed by the color. Do not read or write any files or run commands."
        };
        let arguments = json!({"operation_key":"d4-live-spawn","cwd":h.dir.path().canonicalize()?,"agent":child_runtime,"brief":brief,"config":config,"name":"acceptance child"});
        let prompt = format!("Use your hennery MCP tools for this acceptance. First call session_capabilities with agent={child_runtime}. Then call session_spawn EXACTLY ONCE with this JSON: {arguments}. Do not use another subagent facility. If a child ordinary question arrives, answer it with session_answer: action accept and content matching its schema, selecting blue. For an ordinary question the acceptance color is blue. Do not answer permission requests, run shell commands, or read/write files. After spawning, end your turn with SPAWN_ACCEPTED; the durable system will deliver the child's question. Do not poll or close the child.");
        h.prompt(&h.parent, &prompt).await?;
        let child = h.wait("real parent spawn", || h.child()).await?;
        let evidence = h.wait("child configuration readback", || {
            let conn = hennery_kernel::db::open(&h.dir.path().join("hennery.db")).ok()?;
            conn.query_row("SELECT evidence FROM session_attach_evidence WHERE owner_id=?1 AND session_id=?2 AND evidence IS NOT NULL", rusqlite::params![h.state.store.owner_id(),child], |r| r.get::<_,String>(0)).optional().ok().flatten()
        }).await?;
        let evidence: hennery_proto::delegation_host::ConfigEvidence = serde_json::from_str(&evidence)?;
        ensure!(evidence.completeness == hennery_proto::delegation_host::ConfigCompleteness::Complete, "child configuration not completely read back");
        ensure!(config.model.as_ref().is_none_or(|v| evidence.actual.model.as_ref() == Some(v)), "child model readback differs");
        ensure!(config.axes.iter().all(|(k,v)| evidence.actual.axes.get(k) == Some(v)), "child effort readback differs");
        let pending = h.wait("genuine child elicitation", || h.state.store.open_pending(&child).ok()?.into_iter().find(|p| p.kind == hennery_proto::frames::PendingKind::Elicitation)).await?;
        h.wait("real parent answer delivered", || h.state.store.pending_item(&pending.pending_id).ok().flatten().filter(|p| p.delivered == Some(true))).await?;
        h.wait("child provider continuation", || {
            let events = h.state.store.events(&child, 0, 1000).ok()?;
            serde_json::to_string(&events).ok()?.contains("CHILD_ACCEPTANCE_OK").then_some(())
        }).await?;
        let events = h.state.store.events(&child, 0, 1000)?;
        let brief = events.iter().find(|event| event.kind == "user_turn").context("child brief event")?;
        ensure!(events.iter().any(|event| event.event_id < brief.event_id && event.body.pointer("/indexed/config_evidence/completeness") == Some(&json!("complete"))), "actual complete configuration readback did not precede the brief");
        let conn = hennery_kernel::db::open(&h.dir.path().join("hennery.db"))?;
        let origin: String = conn.query_row("SELECT input_origin FROM answer_queue WHERE owner_id=?1 AND pending_id=?2 AND delivered=1", rusqlite::params![h.state.store.owner_id(),pending.pending_id], |row| row.get(0))?;
        ensure!(matches!(serde_json::from_str::<hennery_proto::plugin::InputOrigin>(&origin)?, hennery_proto::plugin::InputOrigin::Parent {session_id,..} if session_id == h.parent), "delivered schema answer did not originate from the actual parent");
        let trace = h.trace.lock().unwrap().clone();
        for id in [&h.parent, &child] {
            ensure!(trace.iter().any(|r| r["caller"] == *id && r["method"] == "tools/list" && r["tools"].as_array().is_some_and(|t| t.len() == 7)), "actual participant did not discover all seven tools");
        }
        for tool in ["session_capabilities", "session_spawn", "session_answer"] {
            ensure!(trace.iter().any(|r| r["caller"] == h.parent && r["tool"] == tool && r["is_error"] == false), "real parent did not successfully call {tool}");
        }
        println!("{}", json!({"parent_runtime":parent,"child_runtime":child_runtime,"spawn":true,"real_elicitation":true,"parent_answer_delivered":true,"child_continued":true,"requested_config":config,"actual_config":evidence,"mcp":trace,"extended_lifecycle_acceptance":false,"phone_vendor_acceptance":false}));
        Ok(())
    }.await;
    let cleanup = h.finish().await;
    result.and(cleanup)
}
