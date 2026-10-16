use hennery_memory::{http, store::Store};
use serde_json::{Value, json};
use std::sync::Arc;
struct World {
    _dir: tempfile::TempDir,
    store: Arc<Store>,
    tool: String,
    admin: String,
    url: String,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for World {
    fn drop(&mut self) {
        self.task.abort();
    }
}
impl World {
    async fn new() -> Self {
        let d = tempfile::tempdir().unwrap();
        let store = Arc::new(Store::open(&d.path().join("memory.db")).unwrap());
        let c = store.create("owner", "hat").unwrap();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/mcp", listener.local_addr().unwrap());
        let app = http::router(store.clone());
        let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        Self {
            _dir: d,
            store,
            tool: c.tool,
            admin: c.lifecycle,
            url,
            task,
        }
    }
    async fn raw(&self, token: &str, raw: &str) -> reqwest::Response {
        reqwest::Client::new()
            .post(&self.url)
            .bearer_auth(token)
            .header("content-type", "application/json")
            .body(raw.to_string())
            .send()
            .await
            .unwrap()
    }
    async fn call(&self, name: &str, args: Value) -> Value {
        self.raw(
            &self.tool,
            &json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":name,"arguments":args}}).to_string(),
        )
        .await
        .json()
        .await
        .unwrap()
    }
}
#[tokio::test]
async fn real_http_mcp_exposes_exactly_four_tools_and_separates_lifecycle_authority() {
    let w = World::new().await;
    let init=w.raw(&w.tool,r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}"#).await;
    assert_eq!(init.status(), 200);
    assert_eq!(init.headers()["cache-control"], "no-store");
    assert_eq!(
        init.json::<Value>().await.unwrap()["result"]["serverInfo"]["name"],
        "hennery-memory"
    );
    let list = w
        .raw(&w.tool, r#"{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}"#)
        .await
        .json::<Value>()
        .await
        .unwrap();
    let names = list["result"]["tools"]
        .as_array()
        .unwrap()
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        names,
        vec!["memory_recent", "memory_search", "memory_brief", "memory_remember"]
    );
    let caps = r#"{"jsonrpc":"2.0","id":"caps","method":"hennery_plugin_capabilities","params":{}}"#;
    assert_eq!(w.raw(&w.tool, caps).await.status(), 404);
    assert_eq!(
        w.raw(&w.admin, r#"{"jsonrpc":"2.0","id":1,"method":"tools/list"}"#)
            .await
            .status(),
        404
    );
    assert_eq!(w.raw(&w.admin, caps).await.status(), 200);
}
#[tokio::test]
async fn tools_retain_unverified_author_and_return_dated_deterministic_brief() {
    let w = World::new().await;
    let remember = w
        .call(
            "memory_remember",
            json!({"title":"Café","body":"retain alpha hnry_lifecycle_DEADBEEF","idempotency_key":"key"}),
        )
        .await;
    assert!(remember.get("error").is_none(), "{remember}");
    let remembered: Value = serde_json::from_str(remember["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
    assert_eq!(remembered["revision"], 1);
    assert_eq!(remembered["redacted"], true);
    let search = w.call("memory_search", json!({"query":"cafe"})).await;
    let hit: Value = serde_json::from_str(search["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
    assert_eq!(hit["entries"][0]["author"], "agent");
    assert_eq!(hit["entries"][0]["provenance"], json!([{"kind":"unverified"}]));
    assert!(!search.to_string().contains("DEADBEEF"));
    let brief = w.call("memory_brief", json!({"subject":"alpha","mode":"model"})).await;
    let brief: Value = serde_json::from_str(brief["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
    assert_eq!(brief["mode_used"], "deterministic");
    assert!(!brief["fallback_reason"].is_null());
    let text = brief["text"].as_str().unwrap();
    assert!(text.contains("alpha") && text.contains(remembered["id"].as_str().unwrap()) && text.contains('T'));
    let recent = w.call("memory_recent", json!({})).await;
    let recent: Value = serde_json::from_str(recent["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
    assert_eq!(recent["entries"], json!([]));
}
#[tokio::test]
async fn authority_keys_duplicates_notifications_and_browser_requests_cannot_write() {
    let w = World::new().await;
    for args in [
        r#"{"title":"t","body":"x","idempotency_key":"k","owner":"other"}"#,
        r#"{"title":"t","body":"x","idempotency_key":"k","hat":"other"}"#,
        r#"{"title":"t","body":"x","idempotency_key":"k","\u006fwner":"other"}"#,
        r#"{"title":"t","body":"x","idempotency_key":"k","Owner":"other"}"#,
        r#"{"title":"t","body":"x","body":"y","idempotency_key":"k"}"#,
    ] {
        let body = format!(
            r#"{{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{{"name":"memory_remember","arguments":{args}}}}}"#
        );
        let response = w.raw(&w.tool, &body).await;
        assert!(response.json::<Value>().await.unwrap().get("error").is_some());
    }
    for body in [
        r#"{"jsonrpc":"2.0","method":"tools/call","params":{"name":"memory_remember","arguments":{"title":"t","body":"x","idempotency_key":"k"}}}"#,
        r#"{"jsonrpc":"2.0","id":1,"method":"ping","method":"tools/call"}"#,
    ] {
        assert!(
            w.raw(&w.tool, body)
                .await
                .json::<Value>()
                .await
                .unwrap()
                .get("error")
                .is_some()
        );
    }
    let body = r#"{"jsonrpc":"2.0","id":1,"method":"tools/list"}"#;
    assert_eq!(
        reqwest::Client::new()
            .post(&w.url)
            .bearer_auth(&w.tool)
            .header("content-type", "application/json")
            .header("origin", "null")
            .body(body)
            .send()
            .await
            .unwrap()
            .status(),
        404
    );
    assert_eq!(w.raw("unknown", body).await.status(), 404);
    let response = w.raw(&w.tool, &"x".repeat(131073)).await;
    assert_eq!(response.status(), 400);
    assert!(!response.text().await.unwrap().contains("xxxx"));
    assert!(
        w.store
            .search(&w.tool, &hennery_memory::store::Query::search("x"))
            .unwrap()
            .entries
            .is_empty()
    );
}

#[tokio::test]
async fn initialize_rejects_authority_fields_and_empty_params_allow_json_whitespace() {
    let w = World::new().await;
    let invalid = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1"},"owner":"foreign"}}"#;
    assert!(
        w.raw(&w.tool, invalid)
            .await
            .json::<Value>()
            .await
            .unwrap()
            .get("error")
            .is_some()
    );
    let whitespace = r#"{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{ }}"#;
    assert!(
        w.raw(&w.tool, whitespace)
            .await
            .json::<Value>()
            .await
            .unwrap()
            .get("result")
            .is_some()
    );
}
#[tokio::test]
async fn unknown_bearer_is_rejected_before_waiting_for_a_body() {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let w = World::new().await;
    let url = reqwest::Url::parse(&w.url).unwrap();
    let mut socket = tokio::net::TcpStream::connect((url.host_str().unwrap(), url.port().unwrap()))
        .await
        .unwrap();
    socket.write_all(b"POST /mcp HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer unknown\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n").await.unwrap();
    let mut buf = [0u8; 1024];
    let n = tokio::time::timeout(std::time::Duration::from_secs(1), socket.read(&mut buf))
        .await
        .expect("unknown credentials must not occupy a body slot")
        .unwrap();
    assert!(std::str::from_utf8(&buf[..n]).unwrap().starts_with("HTTP/1.1 404"));
}
#[tokio::test]
async fn full_decoded_body_limit_is_supported_even_when_json_escaping_expands_it() {
    let w = World::new().await;
    let value = w
        .call(
            "memory_remember",
            json!({"title":"alpha escaped","body":"\0".repeat(16384),"idempotency_key":"escaped"}),
        )
        .await;
    assert!(value.get("result").is_some(), "valid decoded memory refused: {value}");
    let value = w.call("memory_search", json!({"query":"alpha"})).await;
    let bytes = serde_json::to_vec(&value).unwrap();
    assert!(bytes.len() <= 16384);
    let page: Value = serde_json::from_str(value["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
    assert_eq!(page["entries"].as_array().unwrap().len(), 1);
}

async fn stalled(w: &World) -> tokio::net::TcpStream {
    use tokio::io::AsyncWriteExt;
    let url = reqwest::Url::parse(&w.url).unwrap();
    let mut socket = tokio::net::TcpStream::connect((url.host_str().unwrap(), url.port().unwrap()))
        .await
        .unwrap();
    socket.write_all(format!("POST /mcp HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n",w.tool).as_bytes()).await.unwrap();
    socket
}
#[tokio::test]
async fn one_namespaces_stalled_bodies_cannot_take_other_namespaces_or_lifecycle_slots() {
    let w = World::new().await;
    let mut sockets = Vec::new();
    for _ in 0..4 {
        sockets.push(stalled(&w).await);
    }
    let body = r#"{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}"#;
    tokio::time::timeout(std::time::Duration::from_secs(3), async {
        loop {
            let response = w.raw(&w.tool, body).await;
            if response.status() == 503 {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        }
    })
    .await
    .expect("four stalled requests must occupy just this namespace's slots");
    let other = w.store.create("owner", "other").unwrap();
    assert_eq!(w.raw(&other.tool, body).await.status(), 200);
    let caps = r#"{"jsonrpc":"2.0","id":1,"method":"hennery_plugin_capabilities","params":{}}"#;
    assert_eq!(w.raw(&w.admin, caps).await.status(), 200);
    drop(sockets);
}
#[tokio::test]
async fn stalled_authenticated_body_has_a_deadline_and_does_not_hold_the_store() {
    use tokio::io::AsyncReadExt;
    let w = World::new().await;
    let mut socket = stalled(&w).await;
    assert!(w.store.create("owner", "another").is_ok());
    let mut buffer = [0u8; 1024];
    let n = tokio::time::timeout(std::time::Duration::from_secs(8), socket.read(&mut buffer))
        .await
        .expect("request deadline")
        .unwrap();
    assert!(std::str::from_utf8(&buffer[..n]).unwrap().starts_with("HTTP/1.1 400"));
}
#[tokio::test]
async fn positional_arrays_never_become_rpc_objects_or_tool_arguments() {
    let w = World::new().await;
    for raw in [
        r#"["2.0",1,"tools/list",{}]"#,
        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":["memory_remember",{"title":"t","body":"x","idempotency_key":"k"}]}"#,
        r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_remember","arguments":["t","x",null,[],"k"]}}"#,
        r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":["test","1",null]}}"#,
    ] {
        let value = w.raw(&w.tool, raw).await.json::<Value>().await.unwrap();
        assert!(value.get("error").is_some(), "positional input accepted: {raw}");
    }
}
#[tokio::test]
async fn standard_client_metadata_and_protocol_error_codes_are_supported() {
    let w = World::new().await;
    let response=w.raw(&w.tool,&json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"client","title":"Client","description":"SDK metadata","version":"1","websiteUrl":"https://example.com","icons":[{"src":"https://example.com/icon.png","mimeType":"image/png","sizes":["16x16"],"theme":"dark"}]}}}).to_string()).await.json::<Value>().await.unwrap();
    assert!(response.get("result").is_some(), "{response}");
    for (body, code) in [
        ("{", -32700),
        (r#"{"jsonrpc":"2.0","id":1,"method":"unsupported"}"#, -32601),
    ] {
        let value = w.raw(&w.tool, body).await.json::<Value>().await.unwrap();
        assert_eq!(value["error"]["code"], code);
    }
    let notification = w
        .raw(&w.tool, r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#)
        .await;
    assert_eq!(notification.status(), 202);
    assert!(notification.bytes().await.unwrap().is_empty());
}
#[tokio::test]
async fn protocol_headers_are_single_supported_values_and_initialize_negotiates() {
    let w = World::new().await;
    let body = r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_remember","arguments":{"title":"version fixture","body":"no mutation","idempotency_key":"version"}}}"#;
    for headers in [vec!["future"], vec!["2025-06-18", "2025-06-18"]] {
        let mut request = reqwest::Client::new()
            .post(&w.url)
            .bearer_auth(&w.tool)
            .header("content-type", "application/json")
            .body(body);
        for version in headers {
            request = request.header("mcp-protocol-version", version);
        }
        assert_eq!(request.send().await.unwrap().status(), 400);
    }
    assert!(
        w.store
            .search(&w.tool, &hennery_memory::store::Query::search("mutation"))
            .unwrap()
            .entries
            .is_empty()
    );
    let value=w.raw(&w.tool,r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"future","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}"#).await.json::<Value>().await.unwrap();
    assert_eq!(value["result"]["protocolVersion"], "2025-11-25");
}
#[tokio::test]
async fn c1_versioned_capability_probe_is_supported_but_unknown_versions_are_refused() {
    let w = World::new().await;
    let good = w
        .raw(
            &w.admin,
            r#"{"jsonrpc":"2.0","id":1,"method":"hennery_plugin_capabilities","params":{"version":1}}"#,
        )
        .await
        .json::<Value>()
        .await
        .unwrap();
    assert_eq!(good["result"]["activity_v1"], true);
    assert_eq!(good["result"]["forget_v1"], true);
    for params in [
        r#"{"version":2}"#,
        r#"{"version":1,"owner":"other"}"#,
        r#"{"version":1,"version":1}"#,
    ] {
        let raw = format!(r#"{{"jsonrpc":"2.0","id":1,"method":"hennery_plugin_capabilities","params":{params}}}"#);
        assert!(
            w.raw(&w.admin, &raw)
                .await
                .json::<Value>()
                .await
                .unwrap()
                .get("error")
                .is_some()
        );
    }
}
#[tokio::test]
async fn only_one_bearer_without_browser_or_query_transports_selects_a_namespace() {
    let w = World::new().await;
    let body = r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_remember","arguments":{"title":"transport fixture","body":"transport-marker","idempotency_key":"transport"}}}"#;
    let client = reqwest::Client::new();
    for kind in ["duplicate", "cookie", "query", "query-only"] {
        let url = if kind.starts_with("query") {
            format!("{}?namespace=foreign", w.url)
        } else {
            w.url.clone()
        };
        let mut request = client.post(url).header("content-type", "application/json").body(body);
        if kind != "query-only" {
            request = request.bearer_auth(&w.tool);
        }
        if kind == "duplicate" {
            request = request.header("authorization", format!("Bearer {}", w.tool));
        }
        if kind == "cookie" {
            request = request.header("cookie", "session=fixture");
        }
        assert_eq!(request.send().await.unwrap().status(), 404, "{kind}");
    }
    assert!(
        w.store
            .search(&w.tool, &hennery_memory::store::Query::search("transport-marker"))
            .unwrap()
            .entries
            .is_empty()
    );
}
