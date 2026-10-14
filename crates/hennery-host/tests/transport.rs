use futures::{SinkExt, StreamExt};
use hennery_host::transport::{CollectorEndpoint, CollectorTransport, CollectorTrust, Stage, TransportFailure};
use rcgen::{BasicConstraints, CertificateParams, IsCa, KeyPair};
use std::{
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tokio_tungstenite::tungstenite::{Message, protocol::WebSocketConfig};

struct Fixture {
    url: String,
    pem: String,
    seen: Arc<AtomicUsize>,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for Fixture {
    fn drop(&mut self) {
        self.task.abort();
    }
}
async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
    let key = KeyPair::generate().unwrap();
    let mut ca = CertificateParams::new(vec!["fixture-ca".into()]).unwrap();
    ca.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    let ca = ca.self_signed(&key).unwrap();
    let mut signer_params = CertificateParams::new(vec!["fixture-ca".into()]).unwrap();
    signer_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    let signer = rcgen::Issuer::from_params(&signer_params, key);
    let leaf_key = KeyPair::generate().unwrap();
    let leaf = CertificateParams::new(names)
        .unwrap()
        .signed_by(&leaf_key, &signer)
        .unwrap();
    let tls = rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions()
        .unwrap()
        .with_no_client_auth()
        .with_single_cert(
            vec![leaf.der().clone()],
            rustls::pki_types::PrivatePkcs8KeyDer::from(leaf_key.serialize_der()).into(),
        )
        .unwrap();
    let acceptor = tokio_rustls::TlsAcceptor::from(Arc::new(tls));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("https://localhost:{}", listener.local_addr().unwrap().port());
    let seen = Arc::new(AtomicUsize::new(0));
    let capture = seen.clone();
    let task = tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let acceptor = acceptor.clone();
            let capture = capture.clone();
            tokio::spawn(async move {
                if let Ok(tls) = acceptor.accept(stream).await {
                    let ws = tokio_tungstenite::accept_hdr_async(tls, NonceCallback { capture, nonce }).await;
                    if let Ok(mut ws) = ws {
                        while let Some(Ok(msg)) = ws.next().await {
                            if msg.is_close() {
                                break;
                            }
                            ws.send(Message::Text("{}".into())).await.ok();
                        }
                    }
                }
            });
        }
    });
    Fixture {
        url,
        pem: ca.pem(),
        seen,
        task,
    }
}
#[tokio::test]
async fn private_ca_wss_and_https_share_the_same_verifier() {
    let f = fixture(
        vec!["localhost".into()],
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    )
    .await;
    let transport = CollectorTransport::new(
        CollectorEndpoint::public(&f.url).unwrap(),
        CollectorTrust::CaBundle { pem: f.pem.clone() },
    )
    .unwrap();
    let (mut ws, nonce) = transport.websocket(WebSocketConfig::default()).await.unwrap();
    assert_eq!(nonce, vec![0xaa; 32]);
    ws.close(None).await.unwrap();
    // The fixture speaks WS only: a normal HTTP request still reaches the
    // same verified TLS listener, then fails at HTTP rather than TLS.
    let error = transport
        .http()
        .await
        .unwrap()
        .get(format!("{}/healthz", f.url))
        .timeout(Duration::from_secs(2))
        .send()
        .await
        .unwrap_err();
    assert_ne!(hennery_host::transport::classify(&error), Stage::Tls);
    assert_eq!(f.seen.load(Ordering::SeqCst), 1);
}
#[tokio::test]
async fn failed_name_verification_sends_no_websocket_or_http_request() {
    let f = fixture(
        vec!["wrong.example".into()],
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    )
    .await;
    let transport = CollectorTransport::new(
        CollectorEndpoint::public(&f.url).unwrap(),
        CollectorTrust::CaBundle { pem: f.pem.clone() },
    )
    .unwrap();
    let err = transport.websocket(WebSocketConfig::default()).await.err().unwrap();
    assert_eq!(err.downcast_ref::<TransportFailure>().unwrap().0, Stage::Tls);
    let err = transport
        .http()
        .await
        .unwrap()
        .post(format!("{}/api/hosts/enroll", f.url))
        .body("secret")
        .send()
        .await
        .unwrap_err();
    assert_eq!(hennery_host::transport::classify(&err), Stage::Tls);
    assert_eq!(f.seen.load(Ordering::SeqCst), 0);
}
#[tokio::test]
async fn invalid_nonce_is_refused_before_any_hello() {
    let f = fixture(vec!["localhost".into()], "bad-nonce").await;
    let transport = CollectorTransport::new(
        CollectorEndpoint::public(&f.url).unwrap(),
        CollectorTrust::CaBundle { pem: f.pem.clone() },
    )
    .unwrap();
    let err = transport.websocket(WebSocketConfig::default()).await.err().unwrap();
    assert_eq!(err.downcast_ref::<TransportFailure>().unwrap().0, Stage::MissingNonce);
}

struct NonceCallback {
    capture: Arc<AtomicUsize>,
    nonce: &'static str,
}
impl tokio_tungstenite::tungstenite::handshake::server::Callback for NonceCallback {
    fn on_request(
        self,
        _: &tokio_tungstenite::tungstenite::handshake::server::Request,
        mut response: tokio_tungstenite::tungstenite::handshake::server::Response,
    ) -> Result<
        tokio_tungstenite::tungstenite::handshake::server::Response,
        tokio_tungstenite::tungstenite::handshake::server::ErrorResponse,
    > {
        self.capture.fetch_add(1, Ordering::SeqCst);
        response
            .headers_mut()
            .insert(hennery_proto::HELLO_NONCE_HEADER, self.nonce.parse().unwrap());
        Ok(response)
    }
}
