use axum::http::{HeaderMap, HeaderValue};
use hennery_kernel::client_address::{ClientAddress, ProxyPolicy, Source};
use std::net::IpAddr;

fn ip(s: &str) -> IpAddr {
    s.parse().unwrap()
}
fn headers(values: &[&str]) -> HeaderMap {
    let mut h = HeaderMap::new();
    for value in values {
        h.append("hennery-client-ip", HeaderValue::from_str(value).unwrap());
    }
    h
}
fn policy() -> ProxyPolicy {
    ProxyPolicy::new(vec![ip("127.0.0.1")]).unwrap()
}

#[test]
fn exact_peer_and_missing_header_have_distinct_sources() {
    let p = policy();
    assert_eq!(
        p.resolve(ip("127.0.0.1"), &headers(&["192.0.2.1"])).unwrap(),
        ClientAddress {
            peer: ip("127.0.0.1"),
            effective: ip("192.0.2.1"),
            source: Source::Proxy,
        }
    );
    assert_eq!(
        p.resolve(ip("127.0.0.1"), &headers(&[])).unwrap().source,
        Source::MissingHeader
    );
    for peer in ["127.0.0.2", "::1", "192.0.2.9"] {
        let a = p.resolve(ip(peer), &headers(&["bad", "192.0.2.1"])).unwrap();
        assert_eq!(a.effective, ip(peer));
        assert_eq!(a.source, Source::Peer);
    }
    assert_eq!(
        ProxyPolicy::default()
            .resolve(ip("127.0.0.1"), &headers(&["bad"]))
            .unwrap()
            .source,
        Source::Peer
    );
}

#[test]
fn a_trusted_header_is_one_bare_unicast_literal() {
    for value in [
        "",
        "192.0.2.1,192.0.2.2",
        "192.0.2.1:80",
        "[2001:db8::1]",
        "[2001:db8::1]:80",
        "fe80::1%lo0",
        "localhost",
        " 192.0.2.1",
        "192.0.2.1 ",
        "\t192.0.2.1",
        "0.0.0.0",
        "::",
        "224.0.0.1",
        "ff02::1",
    ] {
        assert!(
            policy().resolve(ip("127.0.0.1"), &headers(&[value])).is_err(),
            "{value:?}"
        );
    }
    assert!(
        policy()
            .resolve(ip("127.0.0.1"), &headers(&["192.0.2.1", "192.0.2.1"]))
            .is_err()
    );
    let mut h = headers(&["192.0.2.1"]);
    h.append("Hennery-Client-IP", HeaderValue::from_static("192.0.2.2"));
    assert!(policy().resolve(ip("127.0.0.1"), &h).is_err());
    let mut h = HeaderMap::new();
    h.insert("hennery-client-ip", HeaderValue::from_bytes(&[0xff]).unwrap());
    assert!(policy().resolve(ip("127.0.0.1"), &h).is_err());
}

#[test]
fn mapped_ipv4_is_canonical_for_peers_and_clients() {
    let a = policy()
        .resolve(ip("::ffff:127.0.0.1"), &headers(&["::ffff:192.0.2.1"]))
        .unwrap();
    assert_eq!(a.peer, ip("127.0.0.1"));
    assert_eq!(a.effective, ip("192.0.2.1"));
    for value in ["::ffff:0.0.0.0", "::ffff:224.0.0.1"] {
        assert!(policy().resolve(ip("127.0.0.1"), &headers(&[value])).is_err());
    }
    assert_eq!(
        policy()
            .resolve(ip("127.0.0.1"), &headers(&["2001:db8::1"]))
            .unwrap()
            .effective,
        ip("2001:db8::1")
    );
}

#[test]
fn forwarding_decoders_cannot_compete_with_the_fixed_header() {
    // The same field set viewed as separate fields or merged lists, with
    // case-insensitive names and whitespace, must have the same verdict.
    let vectors = [
        "for=192.0.2.1",
        "For = 192.0.2.2",
        "for=192.0.2.1, for=192.0.2.2",
        "for=\"[2001:db8::1]:443\";proto=https",
        "192.0.2.1",
        " 192.0.2.1 , 192.0.2.2 ",
        "[2001:db8::1]",
        "192.0.2.1:443",
    ];
    for name in [
        "Forwarded",
        "FORWARDED",
        "X-Forwarded-For",
        "x-forwarded-for",
        "X-Real-IP",
        "X-Forwarded-Proto",
        "X-Forwarded-Host",
        "Remote-User",
    ] {
        for value in vectors {
            for fixed in [vec![], vec!["192.0.2.3"], vec!["bad"], vec!["192.0.2.3", "192.0.2.4"]] {
                let baseline = headers(&fixed);
                for duplicate in [false, true] {
                    let mut h = baseline.clone();
                    h.append(
                        axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap(),
                        HeaderValue::from_str(value).unwrap(),
                    );
                    if duplicate {
                        h.append(
                            axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap(),
                            HeaderValue::from_static("for=192.0.2.9"),
                        );
                    }
                    for peer in ["127.0.0.1", "127.0.0.2"] {
                        assert_eq!(
                            policy().resolve(ip(peer), &h),
                            policy().resolve(ip(peer), &baseline),
                            "{name} {value} duplicate={duplicate}"
                        );
                    }
                }
            }
        }
    }
}

#[test]
fn proxy_configuration_is_bounded_exact_and_canonical() {
    assert!(ProxyPolicy::new(vec![ip("127.0.0.1"); 9]).is_err());
    assert!(ProxyPolicy::new(vec![ip("127.0.0.1"), ip("::ffff:127.0.0.1")]).is_err());
    for peer in ["0.0.0.0", "::", "224.0.0.1", "ff02::1"] {
        assert!(ProxyPolicy::new(vec![ip(peer)]).is_err());
    }
    assert!(ProxyPolicy::new((1..=8).map(|n| ip(&format!("192.0.2.{n}"))).collect()).is_ok());
}

#[tokio::test]
async fn extractor_reuses_the_resolved_address_and_requires_connection_metadata() {
    use axum::extract::{ConnectInfo, FromRequestParts};
    use std::net::SocketAddr;
    let (mut parts, _) = axum::http::Request::new(()).into_parts();
    let response = ClientAddress::from_request_parts(&mut parts, &()).await.unwrap_err();
    assert_eq!(response.status(), axum::http::StatusCode::INTERNAL_SERVER_ERROR);
    parts
        .extensions
        .insert(ConnectInfo("127.0.0.1:1234".parse::<SocketAddr>().unwrap()));
    parts.extensions.insert(policy());
    parts.headers = headers(&["192.0.2.1"]);
    let expected = ClientAddress::from_request_parts(&mut parts, &()).await.unwrap();
    assert_eq!(expected.effective, ip("192.0.2.1"));
    parts.extensions.insert(expected);
    // Later middleware cannot force a second interpretation of the header.
    parts.headers = headers(&["bad"]);
    assert_eq!(
        ClientAddress::from_request_parts(&mut parts, &()).await.unwrap(),
        expected
    );
}

#[tokio::test]
async fn address_middleware_refuses_a_router_without_connection_metadata() {
    use tower::ServiceExt;
    let router = axum::Router::new()
        .route("/", axum::routing::get(|| async { "unexpected" }))
        .layer(axum::middleware::from_fn(
            hennery_kernel::client_address::resolve_request,
        ));
    let response = router
        .oneshot(
            axum::http::Request::builder()
                .uri("/")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), axum::http::StatusCode::INTERNAL_SERVER_ERROR);
}

#[tokio::test]
async fn outer_resolution_is_inserted_once_before_inner_middleware() {
    use tower::ServiceExt;
    let inner = axum::middleware::from_fn(
        |mut request: axum::extract::Request, next: axum::middleware::Next| async move {
            request
                .headers_mut()
                .insert("hennery-client-ip", HeaderValue::from_static("bad"));
            next.run(request).await
        },
    );
    let router = axum::Router::new()
        .route(
            "/",
            axum::routing::get(|address: ClientAddress| async move { address.effective.to_string() }),
        )
        .route_layer(inner)
        .layer(axum::middleware::from_fn(
            hennery_kernel::client_address::resolve_request,
        ))
        .layer(axum::Extension(policy()));
    let mut request = axum::http::Request::builder()
        .uri("/")
        .header("hennery-client-ip", "192.0.2.1")
        .body(axum::body::Body::empty())
        .unwrap();
    request.extensions_mut().insert(axum::extract::ConnectInfo(
        "127.0.0.1:1234".parse::<std::net::SocketAddr>().unwrap(),
    ));
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(response.status(), axum::http::StatusCode::OK);
    assert_eq!(
        axum::body::to_bytes(response.into_body(), 128).await.unwrap(),
        "192.0.2.1"
    );
}
