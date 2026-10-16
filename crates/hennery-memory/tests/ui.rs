use axum::{
    Router,
    body::{Body, to_bytes},
    extract::ConnectInfo,
    http::{Request, StatusCode},
};
use hennery_kernel::{
    operator::{Operator, SetupOutcome},
    secret::unix_now,
};
use hennery_memory::{management::NewMemory, store::Store, ui};
use std::sync::Arc;
use tower::ServiceExt;
const ORIGIN: &str = "https://memory.example.test";
const PASSWORD: &str = "synthetic password only";
struct World {
    _dir: tempfile::TempDir,
    store: Arc<Store>,
    operator: Arc<Operator>,
    app: Router,
    ns: String,
    token: String,
    tool: String,
}
impl World {
    fn new(age: i64) -> Self {
        let d = tempfile::tempdir().unwrap();
        let store = Arc::new(Store::open(&d.path().join("memory.db")).unwrap());
        let operator = Arc::new(Operator::open(&d.path().join("memory-auth.db")).unwrap());
        let setup = operator.issue_setup_token(unix_now()).unwrap().unwrap();
        let SetupOutcome::Done { phc, .. } = operator.set_up(&setup, PASSWORD, ORIGIN, unix_now()).unwrap() else {
            panic!()
        };
        store.bind_manager(operator.owner_id(), "owner").unwrap();
        let c = store.create("owner", "garden").unwrap();
        let token = operator
            .open_session("fixture", &phc, unix_now() - age)
            .unwrap()
            .unwrap();
        let app = ui::router(store.clone(), operator.clone()).unwrap();
        Self {
            _dir: d,
            store,
            operator,
            app,
            ns: c.namespace,
            token,
            tool: c.tool,
        }
    }
    async fn request(
        &self,
        method: &str,
        path: &str,
        origin: Option<&str>,
        cookie: Option<String>,
        body: &str,
    ) -> axum::response::Response {
        let mut request = Request::builder()
            .method(method)
            .uri(path)
            .extension(ConnectInfo("127.0.0.1:12345".parse::<std::net::SocketAddr>().unwrap()));
        if let Some(origin) = origin {
            request = request.header("origin", origin);
        }
        if let Some(cookie) = cookie {
            request = request.header("cookie", cookie);
        }
        if method == "POST" {
            request = request.header("content-type", "application/x-www-form-urlencoded");
        }
        self.app
            .clone()
            .oneshot(request.body(Body::from(body.to_string())).unwrap())
            .await
            .unwrap()
    }
    fn cookie(&self) -> Option<String> {
        Some(format!("{}={}", ui::SESSION_COOKIE, self.token))
    }
}
async fn text(response: axum::response::Response) -> String {
    String::from_utf8(to_bytes(response.into_body(), 10 * 1024 * 1024).await.unwrap().to_vec()).unwrap()
}
#[tokio::test]
async fn screen_requires_separate_auth_origin_and_escapes_content() {
    let w = World::new(0);
    assert_eq!(
        w.request("GET", "/", None, None, "").await.status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        w.request("GET", "/", None, Some(format!("hennery_session={}", w.token)), "")
            .await
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        w.request("GET", "/", None, Some(format!("{}={}", ui::SESSION_COOKIE, w.tool)), "")
            .await
            .status(),
        StatusCode::UNAUTHORIZED
    );
    let page = w.request("GET", "/", None, w.cookie(), "").await;
    assert_eq!(page.status(), StatusCode::OK);
    assert_eq!(page.headers()["cache-control"], "no-store");
    assert_eq!(page.headers()["referrer-policy"], "same-origin");
    assert!(
        page.headers()["content-security-policy"]
            .to_str()
            .unwrap()
            .contains("frame-ancestors 'none'")
    );
    for origin in [None, Some("https://evil.example.test"), Some("null")] {
        assert_eq!(
            w.request(
                "POST",
                &format!("/n/{}/create", w.ns),
                origin,
                w.cookie(),
                "title=x&body=y"
            )
            .await
            .status(),
            StatusCode::FORBIDDEN
        );
    }
    let manager = w.store.manager(w.operator.owner_id()).unwrap();
    let entry = w
        .store
        .managed_create(
            &manager,
            &w.ns,
            NewMemory {
                title: "</textarea><script>alert(1)</script>".into(),
                body: "<img src=https://evil.example.test/leak onerror=alert(1)> [click](javascript:alert(1))".into(),
            },
        )
        .unwrap();
    let html = text(
        w.request("GET", &format!("/n/{}/e/{}", w.ns, entry.id), None, w.cookie(), "")
            .await,
    )
    .await;
    assert!(!html.contains("<script>alert"));
    assert!(!html.contains("<img src=https://evil"));
    assert!(!html.contains("href=\"javascript:"));
    assert!(html.contains("&lt;script&gt;"));
    assert!(html.contains("unverified"));
    let mut request = Request::builder()
        .uri("/")
        .header("cookie", w.cookie().unwrap())
        .header("sec-fetch-site", "cross-site")
        .body(Body::empty())
        .unwrap();
    request
        .extensions_mut()
        .insert(ConnectInfo("127.0.0.1:1234".parse::<std::net::SocketAddr>().unwrap()));
    assert_eq!(
        w.app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
}
#[tokio::test]
async fn login_step_up_and_logout_use_private_cookie_and_gates_precede_body() {
    let w = World::new(600);
    let export = format!("/n/{}/export", w.ns);
    let denied = w
        .request("POST", &export, Some(ORIGIN), w.cookie(), "broken form %")
        .await;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    let response = w
        .request("POST", "/login", Some(ORIGIN), None, "password=synthetic+password+only")
        .await;
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let cookie = response.headers()["set-cookie"].to_str().unwrap();
    assert!(
        cookie.starts_with(&format!("{}=", ui::SESSION_COOKIE))
            && cookie.contains("HttpOnly")
            && cookie.contains("SameSite=Strict")
            && cookie.contains("Secure")
    );
    assert!(!cookie.starts_with("hennery_session="));
    assert_eq!(
        w.request("POST", "/step-up", Some(ORIGIN), w.cookie(), "password=wrong")
            .await
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        w.request(
            "POST",
            "/step-up",
            Some(ORIGIN),
            w.cookie(),
            "password=synthetic+password+only"
        )
        .await
        .status(),
        StatusCode::SEE_OTHER
    );
    assert_eq!(
        w.request("POST", &export, Some(ORIGIN), w.cookie(), "").await.status(),
        StatusCode::OK
    );
    assert_eq!(
        w.request("POST", "/logout", Some(ORIGIN), w.cookie(), "")
            .await
            .status(),
        StatusCode::SEE_OTHER
    );
    assert_eq!(
        w.request("GET", "/", None, w.cookie(), "").await.status(),
        StatusCode::UNAUTHORIZED
    );
}
#[tokio::test]
async fn export_is_versioned_opaque_scoped_and_delivery_is_invalidated_by_delete() {
    let w = World::new(0);
    let manager = w.store.manager(w.operator.owner_id()).unwrap();
    let a = w
        .store
        .managed_create(
            &manager,
            &w.ns,
            NewMemory {
                title: "../../hostile".into(),
                body: "exportedmarker".into(),
            },
        )
        .unwrap();
    let other = w.store.create("other-owner", "other-hat").unwrap();
    let hidden = w.store.create("owner", "other-hat").unwrap();
    w.store
        .managed_create(
            &manager,
            &hidden.namespace,
            NewMemory {
                title: "hidden".into(),
                body: "foreignmarker".into(),
            },
        )
        .unwrap();
    assert_eq!(
        w.request(
            "POST",
            &format!("/n/{}/export", other.namespace),
            Some(ORIGIN),
            w.cookie(),
            ""
        )
        .await
        .status(),
        StatusCode::NOT_FOUND
    );
    let response = w
        .request("POST", &format!("/n/{}/export", w.ns), Some(ORIGIN), w.cookie(), "")
        .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["content-type"], "application/x-tar");
    let bytes = to_bytes(response.into_body(), 10 * 1024 * 1024).await.unwrap();
    let mut archive = tar::Archive::new(&bytes[..]);
    let mut names = Vec::new();
    for file in archive.entries().unwrap() {
        let mut file = file.unwrap();
        let name = file.path().unwrap().to_string_lossy().into_owned();
        let mut body = String::new();
        std::io::Read::read_to_string(&mut file, &mut body).unwrap();
        if name == "manifest.json" {
            let manifest: serde_json::Value = serde_json::from_str(&body).unwrap();
            assert_eq!(manifest["version"], 1);
            assert!(body.contains("unverified"));
        }
        assert!(!body.contains("foreignmarker") && !body.contains(&w.tool));
        names.push(name);
    }
    assert_eq!(
        names,
        vec!["manifest.json".to_string(), format!("memories/{}.md", a.id)]
    );
    let pending = w
        .request("POST", &format!("/n/{}/export", w.ns), Some(ORIGIN), w.cookie(), "")
        .await;
    w.store.managed_delete(&manager, &w.ns, &a.id, a.revision).unwrap();
    assert!(to_bytes(pending.into_body(), 10 * 1024 * 1024).await.is_err());
}

#[tokio::test]
async fn stale_edits_are_visible_conflicts_and_authority_fields_are_rejected() {
    let w = World::new(0);
    let manager = w.store.manager(w.operator.owner_id()).unwrap();
    let e = w
        .store
        .managed_create(
            &manager,
            &w.ns,
            NewMemory {
                title: "fixture".into(),
                body: "initial".into(),
            },
        )
        .unwrap();
    let path = format!("/n/{}/e/{}/edit", w.ns, e.id);
    let request = || "revision=1&title=fixture&body=edited";
    assert_eq!(
        w.request("POST", &path, Some(ORIGIN), w.cookie(), request())
            .await
            .status(),
        StatusCode::SEE_OTHER
    );
    let conflict = w.request("POST", &path, Some(ORIGIN), w.cookie(), request()).await;
    assert_eq!(conflict.status(), StatusCode::CONFLICT);
    assert!(text(conflict).await.contains("revision"));
    for extra in [
        "&owner=foreign",
        "&hat=foreign",
        "&author=owner",
        "&provenance=operator",
        "&revision=2",
        "&%72evision=2",
    ] {
        assert!(
            w.request(
                "POST",
                &path,
                Some(ORIGIN),
                w.cookie(),
                &format!("revision=2&title=fixture&body=changed{extra}")
            )
            .await
            .status()
            .is_client_error()
        );
    }
    assert_eq!(w.store.managed_entry(&manager, &w.ns, &e.id).unwrap().body, "edited");
    for cookie in [
        format!("hennery_session={}", w.token),
        format!("{}={}", ui::SESSION_COOKIE, w.token),
    ] {
        let expected = if cookie.starts_with("hennery_session=") {
            StatusCode::UNAUTHORIZED
        } else {
            StatusCode::OK
        };
        assert_eq!(
            w.request("GET", "/api/auth/sessions", None, Some(cookie), "")
                .await
                .status(),
            expected
        );
    }
}
