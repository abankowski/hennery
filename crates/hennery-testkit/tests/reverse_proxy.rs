//! Both shipped proxy recipes execute against disposable certificates and data.
use axum::{
    Extension, Router, middleware,
    response::IntoResponse,
    routing::{get, post},
};
use futures::{SinkExt, StreamExt};
use hennery_kernel::{
    client_address::{ProxyPolicy, resolve_request},
    hosts::Hosts,
    operator::Operator,
    secret::unix_now,
};
use hennery_sessions::{AppState, store::Store};
use hennery_testkit::{OWNER_PASSWORD, PUBLIC_URL, reverse_proxy::RecipeProxy, tls::TestCa};
use serde_json::json;
use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::Duration,
};

async fn backend(router: Router) -> (SocketAddr, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>())
            .await
            .unwrap();
    });
    (addr, task)
}
fn client(ca: &TestCa) -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .tls_built_in_root_certs(false)
        .add_root_certificate(reqwest::Certificate::from_pem(ca.pem.as_bytes()).unwrap())
        .build()
        .unwrap()
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn recipes_overwrite_all_spoofs_and_preserve_host_origin_and_nonce() {
    for kind in ["caddy", "nginx"] {
        let root = tempfile::tempdir().unwrap();
        let captured = Arc::new(Mutex::new(Vec::new()));
        let seen = captured.clone();
        let router = Router::new().route(
            "/capture",
            post(move |headers: axum::http::HeaderMap| {
                seen.lock().unwrap().push(headers.clone());
                async move { "ok" }
            }),
        );
        let (addr, task) = backend(router).await;
        let ca = TestCa::new();
        let proxy = RecipeProxy::start(kind, addr, &ca, root.path()).await;
        let resp = client(&ca)
            .post(format!("https://127.0.0.1:{}/capture", proxy.port()))
            .header("host", format!("localhost:{}", proxy.port()))
            .header("origin", PUBLIC_URL)
            .header("hennery-client-ip", "192.0.2.1")
            .header("hennery-client-ip", "192.0.2.2")
            .header("forwarded", "for=192.0.2.1;proto=http")
            .header("x-forwarded-for", "192.0.2.3")
            .send()
            .await
            .unwrap();
        assert_eq!(resp.status(), 200, "{}", proxy.logs());
        let headers = captured.lock().unwrap().pop().unwrap();
        assert_eq!(headers.get_all("hennery-client-ip").iter().count(), 1);
        assert_eq!(headers["hennery-client-ip"], "127.0.0.1");
        assert_eq!(headers["origin"], PUBLIC_URL);
        assert_eq!(headers["host"], format!("localhost:{}", proxy.port()));
        task.abort();
    }
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn real_proxy_two_client_budgets_and_backend_origin_rules() {
    for kind in ["caddy", "nginx"] {
        let root = tempfile::tempdir().unwrap();
        let state = AppState::new(
            Store::open_in_memory().unwrap(),
            Hosts::open_in_memory().unwrap(),
            Operator::open_in_memory().unwrap(),
        );
        hennery_testkit::operator_client(&state.operator);
        let router = hennery_sessions::router(state.clone())
            .layer(middleware::from_fn(resolve_request))
            .layer(Extension(ProxyPolicy::new(vec!["127.0.0.1".parse().unwrap()]).unwrap()));
        let (addr, task) = backend(router).await;
        let ca = TestCa::new();
        let proxy = RecipeProxy::start(kind, addr, &ca, root.path()).await;
        let http = client(&ca);
        let a = format!("https://127.0.0.1:{}", proxy.port());
        let b = format!("https://[::1]:{}", proxy.port());
        for path in ["/api/auth/login", "/api/hosts/enroll"] {
            let body = if path.ends_with("login") {
                json!({"password":"wrong"})
            } else {
                json!({"code":"wrong","public_key":hennery_host::identity::HostKey::from_seed([1;32]).public_key_hex(),"name":"fixture","host_version":"0","platform":"test"})
            };
            for _ in 0..5 {
                assert_eq!(
                    http.post(format!("{a}{path}"))
                        .header("origin", PUBLIC_URL)
                        .json(&body)
                        .send()
                        .await
                        .unwrap()
                        .status(),
                    401
                );
            }
            assert_eq!(
                http.post(format!("{a}{path}"))
                    .header("origin", PUBLIC_URL)
                    .json(&body)
                    .send()
                    .await
                    .unwrap()
                    .status(),
                429
            );
            for _ in 0..4 {
                assert_eq!(
                    http.post(format!("{b}{path}"))
                        .header("origin", PUBLIC_URL)
                        .json(&body)
                        .send()
                        .await
                        .unwrap()
                        .status(),
                    401
                );
            }
            let good = if path.ends_with("login") {
                json!({"password":OWNER_PASSWORD})
            } else {
                json!({"code":state.hosts.mint_pairing_code(unix_now()).unwrap().code,"public_key":hennery_host::identity::HostKey::from_seed([2;32]).public_key_hex(),"name":"fixture","host_version":"0","platform":"test"})
            };
            let resp = http
                .post(format!("{b}{path}"))
                .header("origin", PUBLIC_URL)
                .json(&good)
                .send()
                .await
                .unwrap();
            assert_eq!(resp.status().as_u16(), if path.ends_with("login") { 204 } else { 201 });
            for _ in 0..5 {
                assert_eq!(
                    http.post(format!("{b}{path}"))
                        .header("origin", PUBLIC_URL)
                        .json(&body)
                        .send()
                        .await
                        .unwrap()
                        .status(),
                    401
                );
            }
            assert_eq!(
                http.post(format!("{a}{path}"))
                    .header("origin", PUBLIC_URL)
                    .json(&good)
                    .send()
                    .await
                    .unwrap()
                    .status(),
                429
            );
        }
        assert_eq!(
            http.post(format!("{a}/api/auth/login"))
                .header("origin", "https://wrong.example")
                .header("x-forwarded-host", "hennery.example")
                .json(&json!({"password":OWNER_PASSWORD}))
                .send()
                .await
                .unwrap()
                .status(),
            403
        );
        // Direct backend access cannot gain a browser exemption from proxy fields.
        assert_eq!(
            reqwest::Client::builder()
                .no_proxy()
                .build()
                .unwrap()
                .post(format!("http://{addr}/api/auth/login"))
                .header("hennery-client-ip", "192.0.2.9")
                .header("remote-user", "owner")
                .json(&json!({"password":OWNER_PASSWORD}))
                .send()
                .await
                .unwrap()
                .status(),
            403
        );
        task.abort();
    }
}

async fn streaming_and_reload(kind: &str) {
    let root = tempfile::tempdir().unwrap();
    let router = Router::new()
        .route(
            "/api/hosts/ws",
            get(|upgrade: axum::extract::ws::WebSocketUpgrade| async move {
                let mut response = upgrade
                    .max_message_size(32 * 1024 * 1024)
                    .max_frame_size(32 * 1024 * 1024)
                    .on_upgrade(|mut ws| async move {
                        while let Some(Ok(message)) = ws.recv().await {
                            let message = match message {
                                axum::extract::ws::Message::Ping(data) => axum::extract::ws::Message::Pong(data),
                                other => other,
                            };
                            if ws.send(message).await.is_err() {
                                break;
                            }
                        }
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
        .route("/api/stream/fixture", get(stream))
        .route("/mcp/fixture", post(stream));
    let (addr, task) = backend(router).await;
    let ca = TestCa::new();
    let mut proxy = RecipeProxy::start(kind, addr, &ca, root.path()).await;
    for path in ["/api/stream/fixture", "/mcp/fixture"] {
        let req = client(&ca).request(
            if path.starts_with("/mcp") {
                reqwest::Method::POST
            } else {
                reqwest::Method::GET
            },
            format!("{}{path}", proxy.origin()),
        );
        let mut response = req.send().await.unwrap();
        assert_eq!(response.status(), 200);
        assert_eq!(
            tokio::time::timeout(Duration::from_secs(2), response.chunk())
                .await
                .unwrap()
                .unwrap()
                .unwrap(),
            "data: first\n\n"
        );
        assert_eq!(response.chunk().await.unwrap().unwrap(), "data: second\n\n");
    }
    let trust = hennery_host::transport::CollectorTrust::CaBundle { pem: ca.pem.clone() };
    let endpoint = hennery_host::transport::CollectorEndpoint::public(&proxy.origin()).unwrap();
    let transport = hennery_host::transport::CollectorTransport::new(endpoint, trust).unwrap();
    let (mut ws, response) = transport
        .websocket(
            tokio_tungstenite::tungstenite::protocol::WebSocketConfig::default().max_frame_size(Some(32 * 1024 * 1024)),
        )
        .await
        .unwrap();
    assert_eq!(response, vec![0xaa; 32]);
    let large = vec![42u8; 32 * 1024 * 1024];
    ws.send(tokio_tungstenite::tungstenite::Message::Binary(large.clone().into()))
        .await
        .unwrap();
    assert_eq!(
        tokio::time::timeout(Duration::from_secs(30), ws.next())
            .await
            .unwrap()
            .unwrap()
            .unwrap()
            .into_data(),
        large
    );
    // Run beyond both recipes' 120s idle timeout, with ping/pong traffic.
    for _ in 0..9 {
        tokio::time::sleep(Duration::from_secs(15)).await;
        ws.send(tokio_tungstenite::tungstenite::Message::Ping(vec![7].into()))
            .await
            .unwrap();
        assert!(matches!(
            tokio::time::timeout(Duration::from_secs(10), ws.next())
                .await
                .unwrap()
                .unwrap()
                .unwrap(),
            tokio_tungstenite::tungstenite::Message::Pong(_)
        ));
    }
    proxy.renew_and_reload(&ca).await;
    let _ = ws.close(None).await;
    let (mut reconnected, _) = transport
        .websocket(
            tokio_tungstenite::tungstenite::protocol::WebSocketConfig::default().max_frame_size(Some(32 * 1024 * 1024)),
        )
        .await
        .unwrap();
    reconnected
        .send(tokio_tungstenite::tungstenite::Message::Text("after reload".into()))
        .await
        .unwrap();
    assert_eq!(
        reconnected.next().await.unwrap().unwrap().into_text().unwrap(),
        "after reload"
    );
    task.abort();
}
async fn stream() -> axum::response::Response {
    let chunks = futures::stream::unfold(0, |n| async move {
        match n {
            0 => Some((Ok::<_, std::io::Error>("data: first\n\n"), 1)),
            1 => {
                tokio::time::sleep(Duration::from_secs(3)).await;
                Some((Ok("data: second\n\n"), 2))
            }
            _ => None,
        }
    });
    axum::http::Response::builder()
        .header("content-type", "text/event-stream")
        .body(axum::body::Body::from_stream(chunks))
        .unwrap()
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn caddy_nonce_large_frames_idle_streams_renewal_and_reload() {
    streaming_and_reload("caddy").await;
}
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn nginx_nonce_large_frames_idle_streams_renewal_and_reload() {
    streaming_and_reload("nginx").await;
}
