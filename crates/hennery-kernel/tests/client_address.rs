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
