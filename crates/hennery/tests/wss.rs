//! Real TLS and process-restart enrollment gates. Every child uses scratch data.
use axum::{
    Router,
    response::IntoResponse,
    routing::{get, post},
};
use hennery_host::{
    identity::Paired,
    transport::{CollectorEndpoint, CollectorTrust},
};
use hennery_kernel::{hosts::Hosts, operator::Operator};
use hennery_sessions::{AppState, store::Store};
use hennery_testkit::tls::{Proxy, TestCa};
use std::{
    path::Path,
    process::{Command, Stdio},
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};

fn command(root: &Path) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_hennery"));
    command
        .env("HOME", root.join("home"))
        .env("XDG_DATA_HOME", root.join("xdg-data"))
        .env("XDG_CONFIG_HOME", root.join("xdg-config"))
        .env("XDG_STATE_HOME", root.join("xdg-state"))
        .env("XDG_CACHE_HOME", root.join("xdg-cache"))
        .env("HENNERY_NODE_MIRROR", "http://127.0.0.1:1/")
        .env("HENNERY_NPM_REGISTRY", "http://127.0.0.1:1/")
        .env_remove("HENNERY_DATA_DIR")
        .env_remove("HENNERY_HOST_DATA_DIR")
        .env_remove("HENNERY_SERVICE")
        .env_remove("HENNERY_LOG_DIR")
        .env_remove("SSL_CERT_FILE")
        .env_remove("SSL_CERT_DIR")
        .stdin(Stdio::null());
    command
}
async fn output(mut command: Command) -> std::process::Output {
    tokio::task::spawn_blocking(move || command.output().unwrap())
        .await
        .unwrap()
}
fn assert_failed(output: std::process::Output) -> String {
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(!output.status.success(), "{text}");
    text
}
async fn collector(
    root: &Path,
) -> (
    AppState,
    std::net::SocketAddr,
    tokio::task::JoinHandle<std::io::Result<()>>,
) {
    let db = root.join("collector.db");
    let state = AppState::new(
        Store::open(&db).unwrap(),
        Hosts::open(&db).unwrap(),
        Operator::open(&db).unwrap(),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let task = tokio::spawn(hennery_sessions::serve(listener, state.clone()));
    (state, addr, task)
}
async fn code(state: &AppState, addr: std::net::SocketAddr) -> String {
    hennery_testkit::operator_client(&state.operator)
        .post(format!("http://{addr}/api/hosts/pairing-codes"))
        .send()
        .await
        .unwrap()
        .json::<serde_json::Value>()
        .await
        .unwrap()["code"]
        .as_str()
        .unwrap()
        .into()
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn https_join_system_and_private_ca_run_and_doctor_use_one_saved_policy() {
    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
    let root = tempfile::tempdir().unwrap();
    let (state, addr, server) = collector(root.path()).await;
    let ca = TestCa::new();
    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
    let ca_path = root.path().join("ca.pem");
    std::fs::write(&ca_path, &ca.pem).unwrap();
    for mode in ["system", "private"] {
        let host = root.path().join(mode);
        let pairing_code = code(&state, addr).await;
        let mut join = command(root.path());
        join.args([
            "host",
            "join",
            &proxy.origin(),
            &pairing_code,
            "--no-runtime",
            "--data-dir",
        ])
        .arg(&host);
        if mode == "system" {
            join.env("SSL_CERT_FILE", &ca_path);
        } else {
            join.arg("--ca-cert").arg(&ca_path);
        }
        let result = output(join).await;
        assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
        let paired = Paired::read(&host).unwrap().unwrap();
        assert_eq!(
            paired.collector_url,
            CollectorEndpoint::public(&proxy.origin()).unwrap().ws()
        );
        assert_eq!(paired.trust == CollectorTrust::System, mode == "system");
        let key = std::fs::read(host.join("host.key")).unwrap();
        if mode == "private" {
            // Move the same identity off a tunnel through the actual CLI.
            let mut tunnel = paired.clone();
            tunnel.collector_url = hennery_host::pairing::collector_ws_url(&format!("http://{addr}")).unwrap();
            tunnel.trust = CollectorTrust::System;
            tunnel.save(&host).unwrap();
            drop(hennery_host::outbox::Outbox::open(&host.join("outbox.db")).unwrap());
            let outbox = std::fs::read(host.join("outbox.db")).unwrap();
            let mut change = command(root.path());
            change
                .args(["host", "transport", "set", &proxy.origin(), "--ca-cert"])
                .arg(&ca_path)
                .arg("--data-dir")
                .arg(&host);
            let result = output(change).await;
            assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
            assert!(String::from_utf8_lossy(&result.stdout).contains("restart the host"));
            assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
            assert_eq!(std::fs::read(host.join("outbox.db")).unwrap(), outbox);
            assert_eq!(Paired::read(&host).unwrap().unwrap().host_id, paired.host_id);
            // Service startup remains possible after the input CA is gone.
            std::fs::remove_file(&ca_path).unwrap();
        }
        // Idempotent join with stdin closed consumes no code and needs no prompt.
        let mut again = command(root.path());
        again
            .args(["host", "join", &proxy.origin(), "--no-runtime", "--data-dir"])
            .arg(&host);
        if mode == "system" {
            again.env("SSL_CERT_FILE", &ca_path);
        }
        assert!(output(again).await.status.success());
        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
        let mut run = command(root.path());
        run.args(["host", "run", "--agent", "fixture=/nonexistent/fixture", "--data-dir"])
            .arg(&host)
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        if mode == "system" {
            run.env("SSL_CERT_FILE", &ca_path);
        }
        let mut child = run.spawn().unwrap();
        let deadline = tokio::time::Instant::now() + Duration::from_secs(20);
        while !state.hub.connected_hosts().contains(&paired.host_id) {
            assert!(tokio::time::Instant::now() < deadline);
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        let mut doctor = command(root.path());
        doctor.args(["doctor", "--data-dir"]).arg(&host);
        if mode == "system" {
            doctor.env("SSL_CERT_FILE", &ca_path);
        }
        let result = output(doctor).await;
        let report = String::from_utf8_lossy(&result.stdout);
        assert!(report.contains("authentication not checked"), "{report}");
        assert!(!report.contains("fail  7 collector"), "{report}");
        child.kill().unwrap();
        child.wait().unwrap();
        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
    }
    state.shutdown.cancel();
    server.await.unwrap().unwrap();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn every_ambiguous_reply_blocks_join_run_up_and_doctor_after_restart() {
    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
    for (status, body) in [
        (502, "gateway"),
        (504, "timeout"),
        (201, "{"),
        (201, "{\"host_id\":\"bad\"}"),
        (201, "__truncated"),
        (201, "__reset"),
        (201, "__oversized"),
        (409, "{\"code\":\"already_paired\",\"message\":\"ambiguous\"}"),
    ] {
        let posts = Arc::new(AtomicUsize::new(0));
        let capture = posts.clone();
        let router = Router::new()
            .route(
                "/api/hosts/ws",
                get(|upgrade: axum::extract::ws::WebSocketUpgrade| async {
                    let mut response = upgrade
                        .on_upgrade(|mut ws| async move {
                            let _ = ws.recv().await;
                        })
                        .into_response();
                    response.headers_mut().insert(
                        "hennery-hello-nonce",
                        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                            .parse()
                            .unwrap(),
                    );
                    response
                }),
            )
            .route(
                "/api/hosts/enroll",
                post(move || {
                    let capture = capture.clone();
                    async move {
                        capture.fetch_add(1, Ordering::SeqCst);
                        if body == "__oversized" {
                            (
                                axum::http::StatusCode::CREATED,
                                format!("{{\"host_id\":\"host-0123456789abcdef\"}}{}", " ".repeat(8193)),
                            )
                                .into_response()
                        } else if body == "__truncated" {
                            axum::http::Response::builder()
                                .status(201)
                                .header("content-length", "200")
                                .body(axum::body::Body::from("{"))
                                .unwrap()
                        } else if body == "__reset" {
                            let failed = futures::stream::iter([Err::<Vec<u8>, _>(std::io::Error::new(
                                std::io::ErrorKind::ConnectionReset,
                                "fixture reset",
                            ))]);
                            axum::http::Response::builder()
                                .status(201)
                                .body(axum::body::Body::from_stream(failed))
                                .unwrap()
                        } else {
                            (axum::http::StatusCode::from_u16(status).unwrap(), body).into_response()
                        }
                    }
                }),
            );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        let task = tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap();
        });
        let root = tempfile::tempdir().unwrap();
        let host = root.path().join("host");
        let mut join = command(root.path());
        join.args(["host", "join", &origin, "ABCD-EFGH", "--no-runtime", "--data-dir"])
            .arg(&host);
        assert_failed(output(join).await);
        let key = std::fs::read(host.join("host.key.pending")).unwrap();
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
            let mut restart = command(root.path());
            restart.args(args);
            let text = assert_failed(output(restart).await);
            assert!(text.contains("uncertain enrollment attempt"), "{text}");
            assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), key);
            assert_eq!(
                std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap(),
                journal
            );
            assert_eq!(posts.load(Ordering::SeqCst), 1);
            assert!(
                !root.path().join("collector").exists(),
                "uncertainty must stop up before collector spawn/code mint"
            );
        }
        task.abort();
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn verifier_failures_cross_neither_enrollment_nor_hello_and_preserve_the_code() {
    for (names, validity, untrusted, reason) in [
        (vec!["wrong.example".into()], "valid", false, "TlsNameMismatch"),
        (vec!["localhost".into()], "expired", false, "TlsExpired"),
        (vec!["localhost".into()], "future", false, "TlsNotYetValid"),
        (vec!["localhost".into()], "valid", true, "TlsUnknownIssuer"),
        (
            vec!["localhost".into()],
            "missing_intermediate",
            false,
            "TlsUnknownIssuer",
        ),
    ] {
        let root = tempfile::tempdir().unwrap();
        let (state, addr, server) = collector(root.path()).await;
        let ca = TestCa::new();
        let other = TestCa::new();
        let proxy = Proxy::start(addr, ca.server(names, validity)).await;
        let selected = if untrusted { &other.pem } else { &ca.pem };
        let path = root.path().join("roots.pem");
        std::fs::write(&path, selected).unwrap();
        let code = code(&state, addr).await;
        let host = root.path().join("host");
        let mut join = command(root.path());
        join.args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--ca-cert"])
            .arg(&path)
            .arg("--data-dir")
            .arg(&host);
        let text = assert_failed(output(join).await);
        assert!(text.contains(reason), "{text}");
        assert!(state.hosts.list().unwrap().is_empty());
        assert!(!host.join("host.key.pending").exists());
        // An identity probe hits the same failed verifier, not a hello.
        Paired {
            collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
            trust: CollectorTrust::CaBundle { pem: selected.clone() },
            host_id: "host-0123456789abcdef".into(),
            key: hennery_host::identity::HostKey::from_seed([71; 32]),
            workspace_roots: vec![],
        }
        .save(&host)
        .unwrap();
        let mut doctor = command(root.path());
        doctor.args(["doctor", "--data-dir"]).arg(&host);
        let report = assert_failed(output(doctor).await);
        assert!(report.contains("TLS failed"), "{report}");
        assert_eq!(proxy.verified.load(Ordering::SeqCst), 0);
        let good = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
        let fresh = root.path().join("fresh");
        std::fs::write(&path, &ca.pem).unwrap();
        let mut join = command(root.path());
        join.args(["host", "join", &good.origin(), &code, "--no-runtime", "--ca-cert"])
            .arg(&path)
            .arg("--data-dir")
            .arg(&fresh);
        let result = output(join).await;
        assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
        state.shutdown.cancel();
        server.await.unwrap().unwrap();
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn collector_transport_ignores_all_proxy_environment_spellings() {
    let root = tempfile::tempdir().unwrap();
    let (state, addr, server) = collector(root.path()).await;
    let ca = TestCa::new();
    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
    let roots = root.path().join("ca.pem");
    std::fs::write(&roots, &ca.pem).unwrap();
    let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    trap.set_nonblocking(true).unwrap();
    let trap_url = format!("http://{}", trap.local_addr().unwrap());
    let host = root.path().join("host");
    let pairing_code = code(&state, addr).await;
    let configure = |mut cmd: Command| {
        for name in [
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "ALL_PROXY",
            "http_proxy",
            "https_proxy",
            "all_proxy",
        ] {
            cmd.env(name, &trap_url);
        }
        cmd.env("NO_PROXY", "").env("no_proxy", "");
        cmd
    };
    let mut join = configure(command(root.path()));
    join.args([
        "host",
        "join",
        &proxy.origin(),
        &pairing_code,
        "--no-runtime",
        "--ca-cert",
    ])
    .arg(&roots)
    .arg("--data-dir")
    .arg(&host);
    let result = output(join).await;
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
    let mut doctor = configure(command(root.path()));
    doctor.args(["doctor", "--data-dir"]).arg(&host);
    let report = output(doctor).await;
    let report = String::from_utf8_lossy(&report.stdout);
    assert!(report.contains("its hello is accepted"), "{report}");
    assert_eq!(trap.accept().unwrap_err().kind(), std::io::ErrorKind::WouldBlock);
    state.shutdown.cancel();
    server.await.unwrap().unwrap();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn a_committed_lost_reply_preserves_an_older_pairing_and_outbox() {
    let root = tempfile::tempdir().unwrap();
    let db = root.path().join("collector.db");
    let state = AppState::new(
        Store::open(&db).unwrap(),
        Hosts::open(&db).unwrap(),
        Operator::open(&db).unwrap(),
    );
    let posts = Arc::new(AtomicUsize::new(0));
    let count = posts.clone();
    let router = hennery_sessions::router(state.clone()).layer(axum::middleware::from_fn(
        move |request: axum::extract::Request, next: axum::middleware::Next| {
            let count = count.clone();
            async move {
                let enrollment = request.uri().path() == "/api/hosts/enroll";
                let response = next.run(request).await;
                if enrollment {
                    count.fetch_add(1, Ordering::SeqCst);
                    if response.status() == 201 {
                        return (axum::http::StatusCode::CREATED, "{").into_response();
                    }
                }
                response
            }
        },
    ));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        axum::serve(
            listener,
            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
        )
        .await
        .unwrap();
    });
    let ca = TestCa::new();
    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
    let prior = "host-0123456789abcdef";
    let key = hennery_host::identity::HostKey::from_seed([89; 32]);
    state
        .hosts
        .register(
            prior,
            &hennery_kernel::hosts::Enrollment {
                public_key: key.public_key_hex(),
                name: "fixture".into(),
                host_version: "fixture".into(),
                platform: "fixture".into(),
            },
            0,
        )
        .unwrap();
    state.hosts.revoke(prior, hennery_kernel::secret::unix_now()).unwrap();
    let host = root.path().join("host");
    Paired {
        collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
        trust: CollectorTrust::CaBundle { pem: ca.pem.clone() },
        host_id: prior.into(),
        key,
        workspace_roots: vec!["/srv/projects".into()],
    }
    .save(&host)
    .unwrap();
    std::fs::write(host.join("outbox.db"), b"older facts").unwrap();
    let saved_key = std::fs::read(host.join("host.key")).unwrap();
    let saved_config = std::fs::read(host.join("host.toml")).unwrap();
    let code = code(&state, addr).await;
    let mut join = command(root.path());
    join.args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--data-dir"])
        .arg(&host);
    assert_failed(output(join).await);
    assert_eq!(state.hosts.list().unwrap().len(), 2);
    let pending = std::fs::read(host.join("host.key.pending")).unwrap();
    for args in [
        vec![
            "host",
            "join",
            &proxy.origin(),
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
        assert!(assert_failed(output(retry).await).contains("uncertain enrollment attempt"));
        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), saved_key);
        assert_eq!(std::fs::read(host.join("host.toml")).unwrap(), saved_config);
        assert_eq!(std::fs::read(host.join("outbox.db")).unwrap(), b"older facts");
        assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), pending);
        assert_eq!(posts.load(Ordering::SeqCst), 1);
    }
    server.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn process_death_after_a_committed_post_remains_uncertain_on_every_entry_point() {
    committed_post_uncertainty(true).await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn timeout_after_a_committed_post_remains_uncertain_on_every_entry_point() {
    committed_post_uncertainty(false).await;
}

async fn committed_post_uncertainty(kill: bool) {
    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
    let root = tempfile::tempdir().unwrap();
    let db = root.path().join("collector.db");
    let state = AppState::new(
        Store::open(&db).unwrap(),
        Hosts::open(&db).unwrap(),
        Operator::open(&db).unwrap(),
    );
    let router = hennery_sessions::router(state.clone()).layer(axum::middleware::from_fn(
        |request: axum::extract::Request, next: axum::middleware::Next| async move {
            let enrollment = request.uri().path() == "/api/hosts/enroll";
            let response = next.run(request).await;
            if enrollment && response.status() == 201 {
                std::future::pending::<axum::response::Response>().await
            } else {
                response
            }
        },
    ));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        axum::serve(
            listener,
            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
        )
        .await
        .unwrap();
    });
    let code = code(&state, addr).await;
    let origin = format!("http://{addr}");
    let host = root.path().join("host");
    let mut join = command(root.path());
    join.args(["host", "join", &origin, &code, "--no-runtime", "--data-dir"])
        .arg(&host)
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let mut child = join.spawn().unwrap();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(20);
    while state.hosts.list().unwrap().is_empty() {
        assert!(tokio::time::Instant::now() < deadline);
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
    if kill {
        child.kill().unwrap();
        child.wait().unwrap();
    } else {
        assert!(
            !tokio::task::spawn_blocking(move || child.wait().unwrap())
                .await
                .unwrap()
                .success()
        );
    }
    let key = std::fs::read(host.join("host.key.pending")).unwrap();
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
        assert!(assert_failed(output(retry).await).contains("uncertain enrollment attempt"));
        assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), key);
        assert_eq!(
            std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap(),
            journal
        );
        assert_eq!(state.hosts.list().unwrap().len(), 1);
        assert!(
            !root.path().join("collector").exists(),
            "uncertainty must stop up before collector spawn/code mint"
        );
    }
    server.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn health_success_never_hides_broken_upgrade_nonce_or_redirects() {
    for kind in ["missing", "malformed", "short", "long", "duplicate", "redirect"] {
        let root = tempfile::tempdir().unwrap();
        let hellos = Arc::new(AtomicUsize::new(0));
        let seen = hellos.clone();
        let posts = Arc::new(AtomicUsize::new(0));
        let enrolled = posts.clone();
        let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        trap.set_nonblocking(true).unwrap();
        let trap_url = format!("http://{}/", trap.local_addr().unwrap());
        let router = Router::new()
            .route("/healthz", get(|| async { "ok" }))
            .route(
                "/api/hosts/enroll",
                post(move || {
                    enrolled.fetch_add(1, Ordering::SeqCst);
                    async { "unexpected" }
                }),
            )
            .route(
                "/api/hosts/ws",
                get(move |upgrade: axum::extract::ws::WebSocketUpgrade| {
                    let seen = seen.clone();
                    let trap_url = trap_url.clone();
                    async move {
                        if kind == "redirect" {
                            return axum::http::Response::builder()
                                .status(302)
                                .header("location", trap_url)
                                .body(axum::body::Body::empty())
                                .unwrap();
                        }
                        let mut response = upgrade
                            .on_upgrade(move |mut ws| async move {
                                if matches!(ws.recv().await, Some(Ok(axum::extract::ws::Message::Text(_)))) {
                                    seen.fetch_add(1, Ordering::SeqCst);
                                }
                            })
                            .into_response();
                        if kind != "missing" {
                            response.headers_mut().insert(
                                "hennery-hello-nonce",
                                (if kind == "malformed" {
                                    "bad"
                                } else if kind == "short" {
                                    "aa"
                                } else if kind == "long" {
                                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                                } else {
                                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                                })
                                .parse()
                                .unwrap(),
                            );
                        }
                        if kind == "duplicate" {
                            response.headers_mut().append(
                                "hennery-hello-nonce",
                                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
                                    .parse()
                                    .unwrap(),
                            );
                        }
                        response
                    }
                }),
            );
        let backend = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = backend.local_addr().unwrap();
        let task = tokio::spawn(async move {
            axum::serve(backend, router).await.unwrap();
        });
        let ca = TestCa::new();
        let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
        let roots = root.path().join("ca.pem");
        std::fs::write(&roots, &ca.pem).unwrap();
        let host = root.path().join("host");
        let mut join = command(root.path());
        join.args([
            "host",
            "join",
            &proxy.origin(),
            "ABCD-EFGH",
            "--no-runtime",
            "--ca-cert",
        ])
        .arg(&roots)
        .arg("--data-dir")
        .arg(&host);
        let text = assert_failed(output(join).await);
        assert!(
            text.contains(if kind == "redirect" { "Upgrade" } else { "MissingNonce" }),
            "{text}"
        );
        assert_eq!(posts.load(Ordering::SeqCst), 0);
        assert!(!host.join("host.key.pending").exists());
        Paired {
            collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
            trust: CollectorTrust::CaBundle { pem: ca.pem },
            host_id: "host-0123456789abcdef".into(),
            key: hennery_host::identity::HostKey::from_seed([99; 32]),
            workspace_roots: vec![],
        }
        .save(&host)
        .unwrap();
        let mut doctor = command(root.path());
        doctor.args(["doctor", "--data-dir"]).arg(&host);
        let report = assert_failed(output(doctor).await);
        assert!(
            report.contains("answers") && report.contains("WSS upgrade/nonce check failed"),
            "{report}"
        );
        assert_eq!(hellos.load(Ordering::SeqCst), 0);
        assert_eq!(posts.load(Ordering::SeqCst), 0);
        assert_eq!(trap.accept().unwrap_err().kind(), std::io::ErrorKind::WouldBlock);
        task.abort();
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn confirmed_enrollment_with_a_failed_followup_reports_paired_and_keeps_the_identity() {
    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
    let root = tempfile::tempdir().unwrap();
    let db = root.path().join("collector.db");
    let state = AppState::new(
        Store::open(&db).unwrap(),
        Hosts::open(&db).unwrap(),
        Operator::open(&db).unwrap(),
    );
    let committed = Arc::new(AtomicUsize::new(0));
    let gate = committed.clone();
    let router = hennery_sessions::router(state.clone()).layer(axum::middleware::from_fn(
        move |request: axum::extract::Request, next: axum::middleware::Next| {
            let gate = gate.clone();
            async move {
                if request.uri().path() == "/api/hosts/ws" && gate.load(Ordering::SeqCst) > 0 {
                    return axum::http::StatusCode::SERVICE_UNAVAILABLE.into_response();
                }
                let enrollment = request.uri().path() == "/api/hosts/enroll";
                let response = next.run(request).await;
                if enrollment && response.status() == 201 {
                    gate.fetch_add(1, Ordering::SeqCst);
                }
                response
            }
        },
    ));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        axum::serve(
            listener,
            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
        )
        .await
        .unwrap();
    });
    let code = code(&state, addr).await;
    let ca = TestCa::new();
    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
    let roots = root.path().join("ca.pem");
    std::fs::write(&roots, &ca.pem).unwrap();
    let host = root.path().join("host");
    let mut join = command(root.path());
    join.args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--ca-cert"])
        .arg(&roots)
        .arg("--data-dir")
        .arg(&host);
    let message = assert_failed(output(join).await);
    assert!(
        message.contains("paired as") && message.contains("connection failed") && message.contains("identity retained"),
        "{message}"
    );
    let paired = Paired::read(&host).unwrap().unwrap();
    assert_eq!(state.hosts.list().unwrap()[0].id, paired.host_id);
    assert_eq!(paired.trust, CollectorTrust::CaBundle { pem: ca.pem });
    assert!(!host.join(hennery_host::enrollment::JOURNAL).exists());
    let before = std::fs::read(host.join("host.key")).unwrap();
    let mut retry = command(root.path());
    retry
        .args([
            "host",
            "join",
            &proxy.origin(),
            "FRESH-CODE",
            "--no-runtime",
            "--data-dir",
        ])
        .arg(&host);
    assert_failed(output(retry).await);
    assert_eq!(std::fs::read(host.join("host.key")).unwrap(), before);
    assert_eq!(committed.load(Ordering::SeqCst), 1);
    server.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn collector_only_ca_health_option_never_overrides_saved_host_trust() {
    let root = tempfile::tempdir().unwrap();
    let (state, addr, task) = collector(root.path()).await;
    let ca = TestCa::new();
    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
    let file = root.path().join("ca.pem");
    std::fs::write(&file, &ca.pem).unwrap();
    let host = root.path().join("host");
    Paired {
        collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
        trust: CollectorTrust::System,
        host_id: "host-0123456789abcdef".into(),
        key: hennery_host::identity::HostKey::from_seed([100; 32]),
        workspace_roots: vec![],
    }
    .save(&host)
    .unwrap();
    let mut doctor = command(root.path());
    doctor
        .args(["doctor", "--collector-ca-cert"])
        .arg(&file)
        .arg("--data-dir")
        .arg(&host);
    let report = assert_failed(output(doctor).await);
    assert!(
        report.contains("fail  7 collector") && report.contains("TLS failed"),
        "{report}"
    );
    let collector = root.path().join("public");
    std::fs::create_dir_all(&collector).unwrap();
    std::fs::write(
        collector.join("config.toml"),
        format!("listen=['{addr}']\npublic_url='{}'", proxy.origin()),
    )
    .unwrap();
    let mut doctor = command(root.path());
    doctor
        .args(["doctor", "--collector-ca-cert"])
        .arg(&file)
        .arg("--data-dir")
        .arg(&collector);
    let result = output(doctor).await;
    let report = String::from_utf8_lossy(&result.stdout);
    assert!(
        report.contains("answers /healthz") && report.contains("collector-only CA bundle"),
        "{report}"
    );
    assert!(
        report.contains("health success cannot prove header stripping"),
        "{report}"
    );
    state.shutdown.cancel();
    task.await.unwrap().unwrap();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn https_ip_literals_require_the_matching_ip_san() {
    let root = tempfile::tempdir().unwrap();
    let (state, addr, task) = collector(root.path()).await;
    let ca = TestCa::new();
    let roots = root.path().join("ca.pem");
    std::fs::write(&roots, &ca.pem).unwrap();
    for (name, accepted) in [("127.0.0.1", true), ("localhost", false), ("127.0.0.2", false)] {
        let proxy = Proxy::start(addr, ca.server(vec![name.into()], "valid")).await;
        let origin = format!("https://{}", proxy.addr);
        let code = code(&state, addr).await;
        let host = root.path().join(name);
        let mut join = command(root.path());
        join.args(["host", "join", &origin, &code, "--no-runtime", "--ca-cert"])
            .arg(&roots)
            .arg("--data-dir")
            .arg(&host);
        let result = output(join).await;
        if accepted {
            assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
        } else {
            assert!(assert_failed(result).contains("TlsNameMismatch"));
            assert_eq!(proxy.verified.load(Ordering::SeqCst), 0);
        }
    }
    assert_eq!(state.hosts.list().unwrap().len(), 1);
    state.shutdown.cancel();
    task.await.unwrap().unwrap();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn partial_native_root_loading_warns_and_dns_words_do_not_classify_as_tls() {
    let root = tempfile::tempdir().unwrap();
    let (state, addr, task) = collector(root.path()).await;
    let ca = TestCa::new();
    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
    let roots = root.path().join("partial.pem");
    std::fs::write(
        &roots,
        format!(
            "{}\n-----BEGIN CERTIFICATE-----\nAQID\n-----END CERTIFICATE-----\n",
            ca.pem
        ),
    )
    .unwrap();
    let host = root.path().join("host");
    let code = code(&state, addr).await;
    let mut join = command(root.path());
    join.env("SSL_CERT_FILE", &roots)
        .args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--data-dir"])
        .arg(&host);
    let result = output(join).await;
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
    let mut doctor = command(root.path());
    doctor
        .env("SSL_CERT_FILE", &roots)
        .args(["doctor", "--data-dir"])
        .arg(&host);
    let result = output(doctor).await;
    let report = String::from_utf8_lossy(&result.stdout);
    assert!(
        report.contains("native root loading had 1 failures") && report.contains("its hello is accepted"),
        "{report}"
    );
    let mut paired = Paired::read(&host).unwrap().unwrap();
    paired.collector_url = "wss://tls-certificate.invalid/api/hosts/ws".into();
    paired.save(&host).unwrap();
    let mut doctor = command(root.path());
    doctor.args(["doctor", "--data-dir"]).arg(&host);
    let report = assert_failed(output(doctor).await);
    assert!(
        report.contains("did not resolve") && !report.contains("TLS failed"),
        "{report}"
    );
    state.shutdown.cancel();
    task.await.unwrap().unwrap();
}
