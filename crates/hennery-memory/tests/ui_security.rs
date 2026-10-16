//! Synthetic regressions for the first R2 security review.
use axum::{
    Router,
    body::{Body, Bytes, to_bytes},
    extract::ConnectInfo,
    http::{Request, StatusCode},
};
use hennery_kernel::{operator::Operator, secret::unix_now};
use hennery_memory::{consumer::FeedConfig, store::Store, ui};
use std::{
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tower::ServiceExt;
const ORIGIN: &str = "https://memory.example.test";
const PASSWORD: &str = "synthetic review password";
struct World {
    _dir: tempfile::TempDir,
    app: Router,
    token: String,
}
impl World {
    fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let store = Arc::new(Store::open(&dir.path().join("memory.db")).unwrap());
        ui::bootstrap(&store, dir.path(), "fixture-owner", ORIGIN, PASSWORD).unwrap();
        let operator = Arc::new(Operator::open(&dir.path().join("memory-auth.db")).unwrap());
        let phc = operator.verify_password(PASSWORD).unwrap().unwrap();
        let token = operator.open_session("fixture", &phc, unix_now()).unwrap().unwrap();
        Self {
            app: ui::router(store, operator).unwrap(),
            _dir: dir,
            token,
        }
    }
    fn request(&self, path: &str, body: Body) -> Request<Body> {
        Request::builder()
            .method("POST")
            .uri(path)
            .header("origin", ORIGIN)
            .header("content-type", "application/json")
            .extension(ConnectInfo("127.0.0.1:12345".parse::<std::net::SocketAddr>().unwrap()))
            .body(body)
            .unwrap()
    }
}
#[tokio::test]
async fn tls_login_issues_only_host_prefixed_cookie_and_rejects_old_cookie_name() {
    let w = World::new();
    for path in ["/login", "/api/auth/login"] {
        let mut request = w.request(
            path,
            Body::from(if path == "/login" {
                "password=synthetic+review+password".to_string()
            } else {
                format!(r#"{{"password":"{PASSWORD}"}}"#)
            }),
        );
        if path == "/login" {
            request
                .headers_mut()
                .insert("content-type", "application/x-www-form-urlencoded".parse().unwrap());
        }
        let response = w.app.clone().oneshot(request).await.unwrap();
        assert!(response.status().is_success() || response.status() == StatusCode::SEE_OTHER);
        let cookie = response.headers()["set-cookie"].to_str().unwrap();
        assert!(cookie.starts_with("__Host-hennery_memory_session="), "{cookie}");
        assert!(
            cookie.contains("; Secure")
                && cookie.contains("Path=/")
                && !cookie.to_ascii_lowercase().contains("domain=")
        );
    }
    let request = Request::builder()
        .uri("/")
        .header("cookie", format!("hennery_memory_session={}", w.token))
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        w.app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );
    let response = w
        .app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/logout")
                .header("origin", ORIGIN)
                .header("cookie", format!("{}={}", ui::SESSION_COOKIE, w.token))
                .header("content-type", "application/x-www-form-urlencoded")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let cleared = response.headers()["set-cookie"].to_str().unwrap();
    assert!(
        cleared.starts_with("__Host-hennery_memory_session=")
            && cleared.contains("; Secure")
            && cleared.contains("Path=/")
            && cleared.contains("Max-Age=0")
            && !cleared.contains("Domain=")
    );
}
#[test]
fn ui_bootstrap_requires_a_hostname() {
    for origin in ["https://127.0.0.1:7332", "http://127.0.0.1:7332", "https://[::1]:7332"] {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(&dir.path().join("memory.db")).unwrap();
        assert!(
            ui::bootstrap(&store, dir.path(), "fixture-owner", origin, PASSWORD).is_err(),
            "accepted {origin}"
        );
        assert!(!dir.path().join("memory-auth.db").exists());
    }
}
fn grant(origin: &str) -> FeedConfig {
    FeedConfig {
        collector_url: origin.into(),
        namespace_epoch: "a".repeat(64),
        activity_token: format!("hnry_activity_{}", "b".repeat(64)),
        activity: true,
        internal_network: false,
    }
}
#[test]
fn bootstrap_rejects_preexisting_same_hostname_grants_ignoring_ports_and_case() {
    for collector in [
        "https://memory.example.test:7443",
        "https://MEMORY.EXAMPLE.TEST:7444",
        "https://memory.example.test.:7445",
    ] {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(&dir.path().join("memory.db")).unwrap();
        let c = store.create("fixture-owner", "garden").unwrap();
        let key = hennery_memory::keys::load(dir.path(), false).unwrap();
        store.attach(&c.namespace, grant(collector), &key).unwrap();
        assert!(
            ui::bootstrap(&store, dir.path(), "fixture-owner", ORIGIN, PASSWORD).is_err(),
            "accepted {collector}"
        );
        assert!(!dir.path().join("memory-auth.db").exists());
    }
    // Same registrable domain is fine: host-only cookies stay on exact hosts.
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(&dir.path().join("memory.db")).unwrap();
    let c = store.create("fixture-owner", "garden").unwrap();
    let key = hennery_memory::keys::load(dir.path(), false).unwrap();
    store
        .attach(&c.namespace, grant("https://collector.example.test:7443"), &key)
        .unwrap();
    ui::bootstrap(&store, dir.path(), "fixture-owner", ORIGIN, PASSWORD).unwrap();
}
fn command(home: &std::path::Path) -> std::process::Command {
    let binary = env!("CARGO_BIN_EXE_hennery-memory");
    hennery_testkit::first_exec(binary);
    let mut command = std::process::Command::new(binary);
    command
        .arg("--data-dir")
        .arg(home)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join("config"))
        .env("XDG_DATA_HOME", home.join("data"))
        .env("XDG_STATE_HOME", home.join("state"))
        .env("XDG_CACHE_HOME", home.join("cache"));
    for name in [
        "HENNERY_DATA_DIR",
        "HENNERY_HOST_DATA_DIR",
        "HENNERY_MASTER_KEY",
        "CREDENTIALS_DIRECTORY",
        "CODEX_HOME",
        "CLAUDE_CONFIG_DIR",
    ] {
        command.env_remove(name);
    }
    command
}
#[test]
fn attaching_a_same_host_grant_to_an_existing_ui_is_refused_without_writes() {
    use std::io::Write;
    use std::os::unix::fs::PermissionsExt;
    for collector in ["https://memory.example.test:7443", "https://MEMORY.EXAMPLE.TEST.:7444"] {
        let dir = tempfile::tempdir().unwrap();
        std::fs::set_permissions(dir.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
        let store = Store::open(&dir.path().join("memory.db")).unwrap();
        let c = store.create("fixture-owner", "garden").unwrap();
        ui::bootstrap(&store, dir.path(), "fixture-owner", ORIGIN, PASSWORD).unwrap();
        drop(store);
        assert!(
            command(dir.path())
                .args(["status", "--namespace", &c.namespace])
                .output()
                .unwrap()
                .status
                .success()
        );
        let mut child = command(dir.path())
            .args(["attach", "--namespace", &c.namespace])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .unwrap();
        child
            .stdin
            .take()
            .unwrap()
            .write_all(&serde_json::to_vec(&grant(collector)).unwrap())
            .unwrap();
        assert!(!child.wait().unwrap().success(), "same-host attachment was accepted");
        assert!(
            Store::open(&dir.path().join("memory.db"))
                .unwrap()
                .feed_ids()
                .unwrap()
                .is_empty()
        );
    }
}
#[test]
fn startup_refuses_an_existing_conflicting_ui_configuration() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(&dir.path().join("memory.db")).unwrap();
    std::fs::set_permissions(dir.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
    let c = store.create("fixture-owner", "garden").unwrap();
    let key = hennery_memory::keys::load(dir.path(), false).unwrap();
    store
        .attach(&c.namespace, grant("https://collector.example.test:7443"), &key)
        .unwrap();
    ui::bootstrap(&store, dir.path(), "fixture-owner", ORIGIN, PASSWORD).unwrap();
    Operator::open(&dir.path().join("memory-auth.db"))
        .unwrap()
        .reset_public_url("https://COLLECTOR.EXAMPLE.TEST:7332")
        .unwrap();
    drop(store);
    assert!(
        command(dir.path())
            .args(["status", "--namespace", &c.namespace])
            .output()
            .unwrap()
            .status
            .success()
    );
    let mut child = command(dir.path())
        .args(["serve", "--listen", "127.0.0.1:0"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .unwrap();
    let deadline = std::time::Instant::now() + Duration::from_secs(5);
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            assert!(!status.success());
            break;
        }
        if std::time::Instant::now() >= deadline {
            child.kill().unwrap();
            child.wait().unwrap();
            panic!("conflicting UI started a server");
        }
        std::thread::sleep(Duration::from_millis(20));
    }
}
struct Dropped(Arc<AtomicUsize>);
impl Drop for Dropped {
    fn drop(&mut self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}
async fn stalls(w: &World) -> (Vec<tokio::task::JoinHandle<axum::response::Response>>, Arc<AtomicUsize>) {
    let dropped = Arc::new(AtomicUsize::new(0));
    let mut tasks = Vec::new();
    for _ in 0..4 {
        let polled = Arc::new(tokio::sync::Notify::new());
        let signal = polled.clone();
        let guard = Dropped(dropped.clone());
        let body = Body::from_stream(futures::stream::once(async move {
            let _guard = guard;
            signal.notify_one();
            std::future::pending::<Result<Bytes, std::io::Error>>().await
        }));
        let app = w.app.clone();
        let request = w.request("/api/auth/login", body);
        tasks.push(tokio::spawn(async move { app.oneshot(request).await.unwrap() }));
        tokio::time::timeout(Duration::from_secs(10), polled.notified())
            .await
            .unwrap();
    }
    (tasks, dropped)
}
#[tokio::test]
async fn stalled_auth_readers_do_not_use_management_admission_slots() {
    let w = World::new();
    let (tasks, dropped) = stalls(&w).await;
    let request = Request::builder()
        .uri("/")
        .header("cookie", format!("{}={}", ui::SESSION_COOKIE, w.token))
        .body(Body::empty())
        .unwrap();
    let response = w.app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    to_bytes(response.into_body(), 65536).await.unwrap();
    let overflow = w
        .app
        .clone()
        .oneshot(w.request("/api/auth/login", Body::empty()))
        .await
        .unwrap();
    assert_eq!(
        overflow.status(),
        StatusCode::SERVICE_UNAVAILABLE,
        "auth pool must remain bounded"
    );
    for task in tasks {
        task.abort();
        let _ = task.await;
    }
    assert_eq!(dropped.load(Ordering::SeqCst), 4, "cancellation must drop every body");
    assert_eq!(status, StatusCode::OK, "unauthenticated slow bodies blocked management");
    let response = w
        .app
        .clone()
        .oneshot(w.request("/api/auth/login", Body::from(r#"{"password":"wrong"}"#)))
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "cancelled auth slots were retained"
    );
}
#[tokio::test]
async fn stalled_auth_body_deadline_drops_streams_and_releases_admission() {
    let w = World::new();
    let (tasks, dropped) = stalls(&w).await;
    for task in tasks {
        let response = tokio::time::timeout(Duration::from_secs(8), task)
            .await
            .expect("auth body deadline missing")
            .unwrap();
        assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
        to_bytes(response.into_body(), 65536).await.unwrap();
    }
    assert_eq!(dropped.load(Ordering::SeqCst), 4);
    let response = w
        .app
        .clone()
        .oneshot(w.request("/api/auth/login", Body::from(r#"{"password":"wrong"}"#)))
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "expired auth slots were retained"
    );
}

#[tokio::test]
async fn api_size_cap_stops_consuming_before_the_rest_of_the_body() {
    use futures::StreamExt;
    let w = World::new();
    let rest = Arc::new(AtomicUsize::new(0));
    let polled = rest.clone();
    let body = Body::from_stream(
        futures::stream::once(async { Ok::<_, std::io::Error>(Bytes::from(vec![b'x'; 16 * 1024 + 1])) }).chain(
            futures::stream::once(async move {
                polled.fetch_add(1, Ordering::SeqCst);
                std::future::pending::<Result<Bytes, std::io::Error>>().await
            }),
        ),
    );
    let response = tokio::time::timeout(
        Duration::from_secs(8),
        w.app.clone().oneshot(w.request("/api/auth/login", body)),
    )
    .await
    .unwrap()
    .unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(rest.load(Ordering::SeqCst), 0, "read beyond the API body cap");
}
#[tokio::test]
async fn auth_api_get_bodies_have_the_same_deadline() {
    let w = World::new();
    let dropped = Arc::new(AtomicUsize::new(0));
    let guard = Dropped(dropped.clone());
    let body = Body::from_stream(futures::stream::once(async move {
        let _guard = guard;
        std::future::pending::<Result<Bytes, std::io::Error>>().await
    }));
    let mut request = w.request("/api/auth/passkeys", body);
    *request.method_mut() = axum::http::Method::GET;
    request
        .headers_mut()
        .insert("cookie", format!("{}={}", ui::SESSION_COOKIE, w.token).parse().unwrap());
    let response = tokio::time::timeout(Duration::from_secs(8), w.app.oneshot(request))
        .await
        .unwrap()
        .unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(dropped.load(Ordering::SeqCst), 1);
}
#[test]
fn preexisting_ip_ui_is_refused_by_router() {
    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(Store::open(&dir.path().join("memory.db")).unwrap());
    let operator = Arc::new(Operator::open(&dir.path().join("memory-auth.db")).unwrap());
    let token = operator.issue_setup_token(unix_now()).unwrap().unwrap();
    operator
        .set_up(&token, PASSWORD, "https://127.0.0.1:7332", unix_now())
        .unwrap();
    store.bind_manager(operator.owner_id(), "fixture-owner").unwrap();
    assert!(ui::router(store, operator).is_err());
}
#[tokio::test]
async fn loopback_http_cookie_uses_the_non_secure_name_and_clears_it() {
    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(Store::open(&dir.path().join("memory.db")).unwrap());
    let origin = "http://localhost:7332";
    ui::bootstrap(&store, dir.path(), "fixture-owner", origin, PASSWORD).unwrap();
    let operator = Arc::new(Operator::open(&dir.path().join("memory-auth.db")).unwrap());
    let app = ui::router(store, operator).unwrap();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/login")
                .header("origin", origin)
                .header("content-type", "application/x-www-form-urlencoded")
                .extension(ConnectInfo("127.0.0.1:12345".parse::<std::net::SocketAddr>().unwrap()))
                .body(Body::from("password=synthetic+review+password"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let cookie = response.headers()["set-cookie"].to_str().unwrap().to_string();
    assert!(cookie.starts_with("hennery_memory_session=") && !cookie.contains("Secure") && !cookie.contains("Domain="));
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/logout")
                .header("origin", origin)
                .header("cookie", cookie.split(';').next().unwrap())
                .header("content-type", "application/x-www-form-urlencoded")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    assert!(
        response.headers()["set-cookie"]
            .to_str()
            .unwrap()
            .starts_with("hennery_memory_session=")
    );
    assert!(response.headers()["set-cookie"].to_str().unwrap().contains("Max-Age=0"));
}
