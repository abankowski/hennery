//! Disposable TLS front end for transport tests. Never changes OS trust.
use rcgen::{BasicConstraints, CertificateParams, IsCa, KeyPair};
use std::{
    net::SocketAddr,
    sync::{
        Arc, Mutex, RwLock,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
};

pub struct TestCa {
    params: CertificateParams,
    key: KeyPair,
    pub pem: String,
}
impl Default for TestCa {
    fn default() -> Self {
        Self::new()
    }
}
impl TestCa {
    pub fn new() -> Self {
        let key = KeyPair::generate().unwrap();
        let mut params = CertificateParams::new(vec!["fixture-ca".into()]).unwrap();
        let name: String = key
            .public_key_raw()
            .iter()
            .rev()
            .take(12)
            .map(|byte| format!("{byte:02x}"))
            .collect();
        params
            .distinguished_name
            .push(rcgen::DnType::CommonName, format!("fixture-ca-{name}"));
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        let pem = params.self_signed(&key).unwrap().pem();
        Self { params, key, pem }
    }
    pub fn server(&self, names: Vec<String>, validity: &str) -> Arc<rustls::ServerConfig> {
        let mut params = CertificateParams::new(names).unwrap();
        match validity {
            "expired" => {
                params.not_before = rcgen::date_time_ymd(2000, 1, 1);
                params.not_after = rcgen::date_time_ymd(2001, 1, 1);
            }
            "future" => {
                params.not_before = rcgen::date_time_ymd(2098, 1, 1);
                params.not_after = rcgen::date_time_ymd(2099, 1, 1);
            }
            _ => {}
        }
        let key = KeyPair::generate().unwrap();
        let issuer = rcgen::Issuer::from_params(&self.params, &self.key);
        let certs = if matches!(validity, "missing_intermediate" | "intermediate") {
            let mut intermediate = CertificateParams::new(vec!["fixture-intermediate".into()]).unwrap();
            intermediate
                .distinguished_name
                .push(rcgen::DnType::CommonName, "fixture-intermediate");
            intermediate.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
            let intermediate_key = KeyPair::generate().unwrap();
            let certificate = intermediate.signed_by(&intermediate_key, &issuer).unwrap();
            let issuer = rcgen::Issuer::from_params(&intermediate, &intermediate_key);
            let leaf = params.signed_by(&key, &issuer).unwrap();
            let mut certs = vec![leaf.der().clone()];
            if validity == "intermediate" {
                certs.push(certificate.der().clone());
            }
            certs
        } else {
            vec![params.signed_by(&key, &issuer).unwrap().der().clone()]
        };
        Arc::new(
            rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
                .with_safe_default_protocol_versions()
                .unwrap()
                .with_no_client_auth()
                .with_single_cert(
                    certs,
                    rustls::pki_types::PrivatePkcs8KeyDer::from(key.serialize_der()).into(),
                )
                .unwrap(),
        )
    }
}
pub struct Proxy {
    pub addr: SocketAddr,
    pub verified: Arc<AtomicUsize>,
    config: Arc<RwLock<Arc<rustls::ServerConfig>>>,
    paused: Arc<AtomicBool>,
    connections: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
    task: tokio::task::JoinHandle<()>,
}
impl Proxy {
    pub async fn start(backend: SocketAddr, config: Arc<rustls::ServerConfig>) -> Self {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let config = Arc::new(RwLock::new(config));
        let tls = config.clone();
        let paused = Arc::new(AtomicBool::new(false));
        let pause = paused.clone();
        let connections = Arc::new(Mutex::new(Vec::new()));
        let tasks = connections.clone();
        let verified = Arc::new(AtomicUsize::new(0));
        let capture = verified.clone();
        let task = tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                if pause.load(Ordering::SeqCst) {
                    continue;
                }
                let acceptor = tokio_rustls::TlsAcceptor::from(tls.read().unwrap().clone());
                let capture = capture.clone();
                tasks.lock().unwrap().push(tokio::spawn(async move {
                    if let Ok(mut client) = acceptor.accept(stream).await {
                        capture.fetch_add(1, Ordering::SeqCst);
                        if let Ok(mut backend) = tokio::net::TcpStream::connect(backend).await {
                            let _ = tokio::io::copy_bidirectional(&mut client, &mut backend).await;
                        }
                    }
                }));
            }
        });
        Self {
            addr,
            verified,
            config,
            paused,
            connections,
            task,
        }
    }
    pub fn origin(&self) -> String {
        format!("https://localhost:{}", self.addr.port())
    }
    pub fn pause(&self) {
        self.paused.store(true, Ordering::SeqCst);
        for task in self.connections.lock().unwrap().drain(..) {
            task.abort();
        }
    }
    pub fn renew_and_resume(&self, config: Arc<rustls::ServerConfig>) {
        *self.config.write().unwrap() = config;
        self.paused.store(false, Ordering::SeqCst);
    }
}
impl Drop for Proxy {
    fn drop(&mut self) {
        self.task.abort();
        for task in self.connections.lock().unwrap().drain(..) {
            task.abort();
        }
    }
}
