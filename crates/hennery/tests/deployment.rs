//! W2 integration of W1's durable state machine through the shipped proxies.
use axum::{Router, middleware, response::IntoResponse, routing::get};
use hennery_host::{
    identity::{DurabilityUncertain, HostKey, Paired, storage_hooks},
    transport::{CollectorEndpoint, CollectorTrust},
};
use hennery_kernel::{
    hosts::{Enrollment, Hosts},
    operator::Operator,
    secret::unix_now,
};
use hennery_sessions::{AppState, store::Store};
use hennery_testkit::{reverse_proxy::RecipeProxy, tls::TestCa};
use std::{
    net::SocketAddr,
    path::Path,
    process::{Command, Stdio},
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
};
fn command(root: &Path) -> Command {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_hennery"));
    for (key, _) in std::env::vars_os() {
        if key.to_string_lossy().starts_with("HENNERY_") {
            cmd.env_remove(key);
        }
    }
    cmd.env("HOME", root.join("home"))
        .env("XDG_DATA_HOME", root.join("data"))
        .env("XDG_CONFIG_HOME", root.join("config"))
        .env("XDG_STATE_HOME", root.join("state"))
        .env("XDG_CACHE_HOME", root.join("cache"))
        .env_remove("SSL_CERT_FILE")
        .env_remove("SSL_CERT_DIR")
        .stdin(Stdio::null());
    cmd
}
async fn output(mut command: Command) -> std::process::Output {
    tokio::task::spawn_blocking(move || command.output().unwrap())
        .await
        .unwrap()
}
fn failed(out: std::process::Output) -> String {
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(!out.status.success(), "{text}");
    text
}
async fn server(router: Router) -> (SocketAddr, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>())
            .await
            .unwrap();
    });
    (addr, task)
}
fn state() -> AppState {
    let state = AppState::new(
        Store::open_in_memory().unwrap(),
        Hosts::open_in_memory().unwrap(),
        Operator::open_in_memory().unwrap(),
    );
    hennery_testkit::operator_client(&state.operator);
    state
}
fn enrollment(key: &HostKey) -> Enrollment {
    Enrollment {
        public_key: key.public_key_hex(),
        name: "fixture".into(),
        host_version: "0".into(),
        platform: "test".into(),
    }
}

async fn lost_committed_responses(kind: &str) {
    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
    for fault in ["reset", "502", "504", "truncated", "malformed"] {
        let root = tempfile::tempdir().unwrap();
        let state = state();
        let posts = Arc::new(AtomicUsize::new(0));
        let count = posts.clone();
        let router = hennery_sessions::router(state.clone())
            .route("/fixture/fault", get(move || async move { lost_response(fault) }))
            .layer(middleware::from_fn(
                move |request: axum::extract::Request, next: axum::middleware::Next| {
                    let count = count.clone();
                    async move {
                        let enroll = request.uri().path() == "/api/hosts/enroll";
                        if enroll {
                            count.fetch_add(1, Ordering::SeqCst);
                        }
                        let response = next.run(request).await;
                        if enroll && response.status() == 201 {
                            if fault == "reset" {
                                std::future::pending::<axum::response::Response>().await
                            } else {
                                lost_response(fault)
                            }
                        } else {
                            response
                        }
                    }
                },
            ));
        let (addr, task) = server(router).await;
        let ca = TestCa::new();
        let mut proxy = RecipeProxy::start(kind, addr, &ca, root.path()).await;
        let origin = proxy.origin();
        if fault != "reset" {
            // Observe the exact response class through the real proxy before using
            // the same fault builder after a committed enrollment. A reset must not
            // masquerade as the required truncated-success coverage.
            let witness = reqwest::Client::builder()
                .no_proxy()
                .timeout(std::time::Duration::from_secs(10))
                .tls_built_in_root_certs(false)
                .add_root_certificate(reqwest::Certificate::from_pem(ca.pem.as_bytes()).unwrap())
                .build()
                .unwrap()
                .get(format!("{origin}/fixture/fault"))
                .send()
                .await;

            let response = witness.unwrap();
            assert_eq!(
                response.status().as_u16(),
                if matches!(fault, "502" | "504") {
                    fault.parse().unwrap()
                } else {
                    201
                },
                "{kind}/{fault}"
            );
            match fault {
                "truncated" => assert!(response.bytes().await.is_err(), "success must be incomplete"),
                "malformed" => {
                    assert!(serde_json::from_slice::<serde_json::Value>(&response.bytes().await.unwrap()).is_err())
                }
                _ => {}
            }
        }

        assert_eq!(posts.load(Ordering::SeqCst), 0);

        let host = root.path().join("host");
        let key = HostKey::from_seed([19; 32]);
        let prior = state
            .hosts
            .enroll(
                &state.hosts.mint_pairing_code(unix_now()).unwrap().code,
                &enrollment(&key),
                unix_now(),
            )
            .unwrap();
        let hennery_kernel::hosts::EnrollOutcome::Enrolled { host_id } = prior else {
            panic!("prior enrollment")
        };
        state.hosts.revoke(&host_id, unix_now()).unwrap();
        Paired {
            collector_url: CollectorEndpoint::public(&origin).unwrap().ws().into(),
            trust: CollectorTrust::CaBundle { pem: ca.pem.clone() },
            host_id,
            key,
            workspace_roots: vec!["/srv/fixture".into()],
        }
        .save(&host)
        .unwrap();
        std::fs::write(host.join("outbox.db"), b"older facts").unwrap();
        let original_key = std::fs::read(host.join("host.key")).unwrap();
        let original_config = std::fs::read(host.join("host.toml")).unwrap();
        let code = state.hosts.mint_pairing_code(unix_now()).unwrap().code;
        let mut join = command(root.path());
        join.args(["host", "join", &origin, &code, "--no-runtime", "--data-dir"])
            .arg(&host);
        let text = if fault == "reset" {
            let pending = tokio::spawn(output(join));
            let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(20);
            while state.hosts.list().unwrap().len() != 2 {
                assert!(
                    tokio::time::Instant::now() < deadline,
                    "enrollment must commit before cutting the proxy"
                );
                tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            }
            // Cut the real proxy with the committed response still pending.
            assert!(!pending.is_finished(), "the committed response must still be pending");
            proxy.cut();
            let text = failed(pending.await.unwrap());
            proxy.resume(&ca).await;
            text
        } else {
            failed(output(join).await)
        };
        assert!(text.contains("uncertain"), "{kind}/{fault}: {text}");
        assert_eq!(
            state.hosts.list().unwrap().len(),
            2,
            "response must be lost after commit"
        );
        let pending = std::fs::read(host.join("host.key.pending")).unwrap();
        let journal = std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap();
        for args in [
            vec![
                "host",
                "join",
                &origin,
                "FRESH-CODE",
                "--no-runtime",
                "--data-dir",
                host.to_str().unwrap(),
            ],
            vec!["host", "run", "--data-dir", host.to_str().unwrap()],
            vec![
                "up",
                "--listen",
                "127.0.0.1:0",
                "--data-dir",
                root.path().to_str().unwrap(),
            ],
            vec!["doctor", "--data-dir", host.to_str().unwrap()],
        ] {
            let mut retry = command(root.path());
            retry.args(args);
            assert!(failed(output(retry).await).contains("uncertain enrollment attempt"));
            assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), pending);
            assert_eq!(
                std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap(),
                journal
            );
            assert_eq!(std::fs::read(host.join("host.key")).unwrap(), original_key);
            assert_eq!(std::fs::read(host.join("host.toml")).unwrap(), original_config);
            assert_eq!(std::fs::read(host.join("outbox.db")).unwrap(), b"older facts");
            assert_eq!(posts.load(Ordering::SeqCst), 1);
            assert_eq!(state.hosts.list().unwrap().len(), 2);
            assert!(!root.path().join("collector").exists());
        }
        task.abort();
    }
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn caddy_lost_committed_replies_survive_all_process_restarts() {
    lost_committed_responses("caddy").await;
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn nginx_lost_committed_replies_survive_all_process_restarts() {
    lost_committed_responses("nginx").await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn real_proxy_plaintext_redirect_and_overrides_send_zero_hello() {
    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
    for kind in ["caddy", "nginx"] {
        let root = tempfile::tempdir().unwrap();
        let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        trap.set_nonblocking(true).unwrap();
        let plain = format!("http://{}", trap.local_addr().unwrap());
        let location = format!("{plain}/api/hosts/ws");
        let router = Router::new().route(
            "/api/hosts/ws",
            get(move || {
                let location = location.clone();
                async move {
                    axum::http::Response::builder()
                        .status(302)
                        .header("location", location)
                        .body(axum::body::Body::empty())
                        .unwrap()
                }
            }),
        );
        let (addr, task) = server(router).await;
        let ca = TestCa::new();
        let proxy = RecipeProxy::start(kind, addr, &ca, root.path()).await;
        let trust = CollectorTrust::CaBundle { pem: ca.pem.clone() };
        let transport = hennery_host::transport::CollectorTransport::new(
            CollectorEndpoint::public(&proxy.origin()).unwrap(),
            trust.clone(),
        )
        .unwrap();
        assert!(transport.preflight().await.is_err());
        let host = root.path().join("host");
        Paired {
            collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
            trust,
            host_id: "host-0123456789abcdef".into(),
            key: HostKey::from_seed([1; 32]),
            workspace_roots: vec![],
        }
        .save(&host)
        .unwrap();
        let wsplain = plain.replacen("http:", "ws:", 1) + "/api/hosts/ws";
        for args in [
            vec![
                "host",
                "join",
                &plain,
                "ABCD-EFGH",
                "--no-runtime",
                "--data-dir",
                host.to_str().unwrap(),
            ],
            vec![
                "host",
                "run",
                "--collector-url",
                &wsplain,
                "--data-dir",
                host.to_str().unwrap(),
            ],
            vec![
                "host",
                "transport",
                "set",
                &plain,
                "--system-roots",
                "--data-dir",
                host.to_str().unwrap(),
            ],
        ] {
            let mut cmd = command(root.path());
            cmd.args(args);
            failed(output(cmd).await);
            assert!(trap.accept().is_err(), "a plaintext trap received a connection/hello");
        }
        task.abort();
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn deployment_recovery_reads_visible_settings_and_retries_after_post_rename_fsync_failure() {
    for kind in ["caddy", "nginx"] {
        let root = tempfile::tempdir().unwrap();
        let state = state();
        let (addr, task) = server(hennery_sessions::router(state.clone())).await;
        let ca = TestCa::new();
        let proxy = RecipeProxy::start(kind, addr, &ca, root.path()).await;
        let host = root.path().join("host");
        let key = HostKey::from_seed([22; 32]);
        let result = state
            .hosts
            .enroll(
                &state.hosts.mint_pairing_code(unix_now()).unwrap().code,
                &enrollment(&key),
                unix_now(),
            )
            .unwrap();
        let hennery_kernel::hosts::EnrollOutcome::Enrolled { host_id } = result else {
            panic!("enrolled")
        };
        Paired {
            collector_url: format!("ws://{addr}/api/hosts/ws"),
            trust: CollectorTrust::System,
            host_id: host_id.clone(),
            key,
            workspace_roots: vec!["/srv/fixture".into()],
        }
        .save(&host)
        .unwrap();
        std::fs::write(host.join("outbox.db"), b"facts").unwrap();
        let key = std::fs::read(host.join("host.key")).unwrap();
        let path = host.join("host.toml");
        let old = std::fs::read(&path).unwrap();
        storage_hooks::fail_once(path.clone(), "directory_sync");
        let error = hennery_host::pairing::set_transport(
            &host,
            &proxy.origin(),
            Some(CollectorTrust::CaBundle { pem: ca.pem.clone() }),
        )
        .await
        .unwrap_err();
        assert!(error.downcast_ref::<DurabilityUncertain>().is_some(), "{error:#}");
        assert_ne!(
            std::fs::read(&path).unwrap(),
            old,
            "rename is already visible; don't claim rollback"
        );
        let visible = Paired::read(&host).unwrap().unwrap();
        assert_eq!(
            visible.collector_url,
            CollectorEndpoint::public(&proxy.origin()).unwrap().ws()
        );
        // README recovery: inspect visible endpoint, repeat the explicit save.
        hennery_host::pairing::set_transport(&host, &proxy.origin(), None)
            .await
            .unwrap();
        let saved = Paired::read(&host).unwrap().unwrap();
        assert_eq!(saved.host_id, host_id);
        assert_eq!(saved.workspace_roots, ["/srv/fixture"]);
        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
        assert_eq!(std::fs::read(host.join("outbox.db")).unwrap(), b"facts");
        let transport = hennery_host::transport::CollectorTransport::new(
            CollectorEndpoint::stored(&saved.collector_url).unwrap(),
            saved.trust,
        )
        .unwrap();
        assert_eq!(
            hennery_host::connection::probe_transport(&transport, &saved.host_id, &saved.key)
                .await
                .unwrap(),
            hennery_host::connection::Standing::Accepted
        );
        task.abort();
    }
}

fn lost_response(fault: &str) -> axum::response::Response {
    match fault {
        "502" | "504" => (
            axum::http::StatusCode::from_u16(fault.parse().unwrap()).unwrap(),
            "upstream lost reply",
        )
            .into_response(),
        "malformed" => (axum::http::StatusCode::CREATED, "{broken").into_response(),
        "truncated" => axum::http::Response::builder()
            .status(201)
            .header("content-length", "200")
            .body(axum::body::Body::from_stream(futures::stream::unfold(
                0,
                |state| async move {
                    match state {
                        0 => Some((Ok::<_, std::io::Error>(vec![b'{']), 1)),
                        1 => {
                            // Yield long enough for the proxy to flush the success
                            // headers and first byte before the upstream fails.
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                            Some((
                                Err(std::io::Error::new(
                                    std::io::ErrorKind::UnexpectedEof,
                                    "fixture truncated",
                                )),
                                2,
                            ))
                        }
                        _ => None,
                    }
                },
            )))
            .unwrap(),
        _ => unreachable!(),
    }
}
