//! The locally authorized collector's endpoint and TLS policy. All host
//! traffic uses this connector, without redirects or environment proxies.
use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};
use std::{
    net::{IpAddr, SocketAddr},
    path::Path,
    sync::Arc,
    time::Duration,
};
use tokio_tungstenite::{
    Connector, MaybeTlsStream, WebSocketStream,
    tungstenite::{self, protocol::WebSocketConfig},
};
use url::Url;

pub const TIMEOUT: Duration = Duration::from_secs(15);
pub const MAX_CA_BYTES: usize = 256 * 1024;
#[derive(Clone, PartialEq, Eq, Serialize, Default)]
#[serde(tag = "mode", rename_all = "snake_case", deny_unknown_fields)]
pub enum CollectorTrust {
    #[default]
    System,
    CaBundle {
        #[serde(rename = "ca_pem")]
        pem: String,
    },
}
impl<'de> Deserialize<'de> for CollectorTrust {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> std::result::Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Raw {
            mode: String,
            ca_pem: Option<String>,
        }
        let raw = Raw::deserialize(deserializer)?;
        match (raw.mode.as_str(), raw.ca_pem) {
            ("system", None) => Ok(Self::System),
            ("ca_bundle", Some(pem)) => Ok(Self::CaBundle { pem }),
            _ => Err(serde::de::Error::custom("invalid collector TLS mode or fields")),
        }
    }
}
impl std::fmt::Debug for CollectorTrust {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::System => "System",
            Self::CaBundle { .. } => "CaBundle([redacted])",
        })
    }
}
impl CollectorTrust {
    pub fn import(path: &Path) -> Result<Self> {
        use std::io::Read;
        use std::os::unix::fs::OpenOptionsExt;
        let mut file = std::fs::OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(path)?;
        if !file.metadata()?.is_file() {
            bail!("CA input must be a regular file");
        }
        let mut pem = String::new();
        file.by_ref().take((MAX_CA_BYTES + 1) as u64).read_to_string(&mut pem)?;
        ca_roots(&pem)?;
        Ok(Self::CaBundle { pem })
    }
    pub fn source(&self) -> String {
        match self {
            Self::CaBundle { .. } => "collector-only CA bundle".into(),
            Self::System => {
                let overrides: Vec<_> = ["SSL_CERT_FILE", "SSL_CERT_DIR"]
                    .into_iter()
                    .filter(|n| std::env::var_os(n).is_some())
                    .collect();
                if overrides.is_empty() {
                    "native system roots".into()
                } else {
                    format!("native roots ({})", overrides.join(", "))
                }
            }
        }
    }
}
fn ca_roots(pem: &str) -> Result<rustls::RootCertStore> {
    if pem.len() > MAX_CA_BYTES {
        bail!("CA bundle exceeds 256 KiB");
    }
    // Parse every byte: PEM readers otherwise silently ignore junk and key blocks.
    let mut rest = pem.trim();
    let mut roots = rustls::RootCertStore::empty();
    let mut count = 0;
    while !rest.is_empty() {
        let Some(body) = rest.strip_prefix("-----BEGIN CERTIFICATE-----") else {
            bail!("CA bundle contains a non-certificate block");
        };
        let Some(end) = body.find("-----END CERTIFICATE-----") else {
            bail!("malformed CA bundle");
        };
        let block_len = "-----BEGIN CERTIFICATE-----".len() + end + "-----END CERTIFICATE-----".len();
        let block = &rest[..block_len];
        let cert = rustls_pemfile::certs(&mut block.as_bytes())
            .next()
            .transpose()?
            .ok_or_else(|| anyhow::anyhow!("empty CA certificate"))?;
        let (tail, parsed) = x509_parser::parse_x509_certificate(cert.as_ref())
            .map_err(|_| anyhow::anyhow!("malformed CA certificate"))?;
        if !tail.is_empty() || !parsed.basic_constraints().ok().flatten().is_some_and(|v| v.value.ca) {
            bail!("bundle certificates must be valid CA certificates");
        }
        roots
            .add(cert)
            .map_err(|_| anyhow::anyhow!("invalid CA trust anchor"))?;
        count += 1;
        if count > 32 {
            bail!("CA bundle exceeds 32 certificates");
        }
        rest = rest[block_len..].trim();
    }
    if count == 0 {
        bail!("CA bundle is empty");
    }
    Ok(roots)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CollectorEndpoint {
    origin: Url,
    ws: Url,
}
impl CollectorEndpoint {
    pub fn public(input: &str) -> Result<Self> {
        Self::parse(input, false)
    }
    pub fn stored(input: &str) -> Result<Self> {
        Self::parse(input, true)
    }
    fn parse(input: &str, stored: bool) -> Result<Self> {
        let mut url = Url::parse(input.trim()).map_err(|_| anyhow::anyhow!("collector is not a URL"))?;
        if !url.username().is_empty() || url.password().is_some() {
            bail!("collector URL must not contain credentials");
        }
        if url.host().is_none() || url.port() == Some(0) {
            bail!("collector URL requires a host and a nonzero port");
        }
        let secure = match (stored, url.scheme()) {
            (false, "https") | (true, "wss") => true,
            (false, "http") | (true, "ws") => false,
            _ => bail!("unsupported scheme for collector URL"),
        };
        if !secure && !loopback(&url) {
            bail!("plain http is only allowed to a loopback address; use https");
        }
        let path = if stored { "/api/hosts/ws" } else { "/" };
        if url.path() != path || url.query().is_some() || url.fragment().is_some() {
            bail!(
                "give the collector's base URL without a path, query or fragment (stored URLs require /api/hosts/ws)"
            );
        }
        url.set_scheme(if secure { "https" } else { "http" })
            .map_err(|_| anyhow::anyhow!("invalid collector scheme"))?;
        url.set_path("/");
        let origin = url.clone();
        url.set_scheme(if secure { "wss" } else { "ws" })
            .map_err(|_| anyhow::anyhow!("invalid collector scheme"))?;
        url.set_path("/api/hosts/ws");
        Ok(Self { origin, ws: url })
    }
    pub fn origin(&self) -> &Url {
        &self.origin
    }
    pub fn ws(&self) -> &str {
        self.ws.as_str()
    }
    pub fn secure(&self) -> bool {
        self.origin.scheme() == "https"
    }
    pub fn compatible(&self, other: &Self) -> bool {
        self == other || (!self.secure() && !other.secure() && loopback(&self.origin) && loopback(&other.origin))
    }
    pub fn require_compatible(&self, other: &Self) -> Result<()> {
        if !self.compatible(other) {
            bail!(
                "collector endpoint change refused before hello; park sessions, stop the host and use `hennery host transport set <https-origin>` with explicit trust"
            );
        }
        Ok(())
    }
    pub async fn addresses(&self) -> Result<Vec<SocketAddr>> {
        let port = self.origin.port_or_known_default().unwrap_or(443);
        let addresses = match self.origin.host().expect("validated host") {
            url::Host::Domain("localhost") => vec![
                SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::LOCALHOST), port),
                SocketAddr::new(IpAddr::V6(std::net::Ipv6Addr::LOCALHOST), port),
            ],
            url::Host::Ipv4(ip) => vec![SocketAddr::new(ip.into(), port)],
            url::Host::Ipv6(ip) => vec![SocketAddr::new(ip.into(), port)],
            url::Host::Domain(name) => tokio::time::timeout(TIMEOUT, tokio::net::lookup_host((name, port)))
                .await
                .map_err(|_| failure(Stage::Dns))?
                .map_err(|_| failure(Stage::Dns))?
                .collect(),
        };
        if addresses.is_empty() || (!self.secure() && addresses.iter().any(|a| !a.ip().is_loopback())) {
            return Err(failure(Stage::Dns));
        }
        Ok(addresses)
    }
}
fn loopback(url: &Url) -> bool {
    match url.host() {
        Some(url::Host::Domain("localhost")) => true,
        Some(url::Host::Ipv4(ip)) => ip.is_loopback(),
        Some(url::Host::Ipv6(ip)) => ip.is_loopback(),
        _ => false,
    }
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Stage {
    Dns,
    Connect,
    Tls,
    Upgrade {
        status: Option<u16>,
        retry_after: Option<u64>,
    },
    MissingNonce,
    HelloTimeout,
}
#[derive(Debug)]
pub struct TransportFailure(pub Stage);
impl std::fmt::Display for TransportFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "collector transport failed at {:?}; repair this stage without changing the host identity or disabling TLS validation",
            self.0
        )
    }
}
impl std::error::Error for TransportFailure {}
pub fn failure(stage: Stage) -> anyhow::Error {
    TransportFailure(stage).into()
}
pub fn classify(error: &(dyn std::error::Error + 'static)) -> Stage {
    let mut source = Some(error);
    while let Some(err) = source {
        if let Some(e) = err.downcast_ref::<TransportFailure>() {
            return e.0.clone();
        }
        if err.is::<rustls::Error>() {
            return Stage::Tls;
        }
        if let Some(io) = err.downcast_ref::<std::io::Error>()
            && let Some(inner) = io.get_ref()
            && classify(inner) == Stage::Tls
        {
            return Stage::Tls;
        }
        source = err.source();
    }
    Stage::Connect
}
pub fn retry_after(value: &str) -> Option<u64> {
    if value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    value.parse::<u64>().ok().map(|s| s.min(300))
}
pub type Socket = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;
#[derive(Clone)]
pub struct CollectorTransport {
    pub endpoint: CollectorEndpoint,
    pub trust: CollectorTrust,
    tls: Option<Arc<rustls::ClientConfig>>,
    pub root_warnings: usize,
}
impl CollectorTransport {
    pub fn new(endpoint: CollectorEndpoint, trust: CollectorTrust) -> Result<Self> {
        let (roots, warnings) = if !endpoint.secure() {
            if trust != CollectorTrust::System {
                bail!("a private CA requires HTTPS/WSS");
            }
            return Ok(Self {
                endpoint,
                trust,
                tls: None,
                root_warnings: 0,
            });
        } else {
            match &trust {
                CollectorTrust::CaBundle { pem } => (ca_roots(pem)?, 0),
                CollectorTrust::System => {
                    let native = rustls_native_certs::load_native_certs();
                    let mut roots = rustls::RootCertStore::empty();
                    let mut warnings = native.errors.len();
                    for cert in native.certs {
                        if roots.add(cert).is_err() {
                            warnings += 1;
                        }
                    }
                    if roots.is_empty() {
                        bail!("native trust roots unavailable or empty; install intended roots, no bundled fallback");
                    }
                    (roots, warnings)
                }
            }
        };
        let tls = rustls::ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
            .with_protocol_versions(&[&rustls::version::TLS13, &rustls::version::TLS12])?
            .with_root_certificates(roots)
            .with_no_client_auth();
        Ok(Self {
            endpoint,
            trust,
            tls: Some(Arc::new(tls)),
            root_warnings: warnings,
        })
    }
    pub async fn http(&self) -> Result<reqwest::Client> {
        let addresses = self.endpoint.addresses().await?;
        let mut builder = reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .retry(reqwest::retry::never())
            .timeout(Duration::from_secs(30))
            .connect_timeout(TIMEOUT)
            .resolve_to_addrs(self.endpoint.origin.host_str().expect("host"), &addresses);
        if let Some(tls) = &self.tls {
            builder = builder.use_preconfigured_tls((**tls).clone());
        }
        builder
            .build()
            .map_err(|_| anyhow::anyhow!("collector HTTP client configuration failed"))
    }
    pub async fn websocket(&self, config: WebSocketConfig) -> Result<(Socket, Vec<u8>)> {
        tokio::time::timeout(TIMEOUT, self.open(config))
            .await
            .map_err(|_| failure(Stage::Connect))?
    }
    async fn open(&self, config: WebSocketConfig) -> Result<(Socket, Vec<u8>)> {
        let addresses = self.endpoint.addresses().await?;
        let mut socket = None;
        for address in addresses {
            if let Ok(stream) = tokio::net::TcpStream::connect(address).await {
                socket = Some(stream);
                break;
            }
        }
        let socket = socket.ok_or_else(|| failure(Stage::Connect))?;
        let connector = self.tls.clone().map(Connector::Rustls).unwrap_or(Connector::Plain);
        let (ws, response) =
            tokio_tungstenite::client_async_tls_with_config(self.endpoint.ws(), socket, Some(config), Some(connector))
                .await
                .map_err(|err| match &err {
                    tungstenite::Error::Http(response) => failure(Stage::Upgrade {
                        status: Some(response.status().as_u16()),
                        retry_after: response
                            .headers()
                            .get("retry-after")
                            .and_then(|v| v.to_str().ok())
                            .and_then(retry_after),
                    }),
                    tungstenite::Error::Tls(_) => failure(Stage::Tls),
                    tungstenite::Error::Io(e) if classify(e) == Stage::Tls => failure(Stage::Tls),
                    _ => failure(Stage::Upgrade {
                        status: None,
                        retry_after: None,
                    }),
                })?;
        let mut values = response.headers().get_all(hennery_proto::HELLO_NONCE_HEADER).iter();
        let nonce = values
            .next()
            .and_then(|v| v.to_str().ok())
            .and_then(|s| hex::decode(s).ok())
            .filter(|n| n.len() == 32);
        if values.next().is_some() || nonce.is_none() {
            return Err(failure(Stage::MissingNonce));
        }
        Ok((ws, nonce.expect("checked nonce")))
    }
    pub async fn preflight(&self) -> Result<()> {
        let (mut ws, _) = self.websocket(WebSocketConfig::default()).await?;
        let _ = tokio::time::timeout(Duration::from_secs(2), ws.close(None)).await;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn url_differential_vectors_agree_with_the_wire_url() {
        for input in [
            "https://LOCALHOST:443",
            "HTTPS://localhost/",
            " https://localhost/ ",
            "http://2130706433:80",
            "http://[::1]:80",
            "http://127.1",
        ] {
            let parsed = CollectorEndpoint::public(input).unwrap();
            assert_eq!(CollectorEndpoint::stored(parsed.ws()).unwrap(), parsed);
            let downstream = Url::parse(parsed.ws()).unwrap();
            assert!(parsed.secure() || loopback(&downstream));
        }
        for input in [
            "https://user@localhost",
            "https://%75ser@localhost",
            "http://localhost.example",
            "http://localhost.",
            "https://localhost:0",
            "https://localhost/%2f",
            "https://localhost/../secret",
            "https://localhost/?",
            "https://localhost/#",
            "http://127.0.0.1@remote.example",
            "ws://localhost",
        ] {
            assert!(CollectorEndpoint::public(input).is_err(), "{input}");
        }
    }
    #[tokio::test]
    async fn localhost_is_resolved_directly_and_plaintext_loads_no_roots() {
        let transport = CollectorTransport::new(
            CollectorEndpoint::public("http://localhost:7117").unwrap(),
            CollectorTrust::System,
        )
        .unwrap();
        assert!(
            transport
                .endpoint
                .addresses()
                .await
                .unwrap()
                .iter()
                .all(|a| a.ip().is_loopback())
        );
        assert!(transport.tls.is_none());
        assert!(CollectorTransport::new(transport.endpoint, CollectorTrust::CaBundle { pem: String::new() }).is_err());
    }
    #[test]
    fn trust_deserialization_and_debug_never_silently_fall_back() {
        for text in [
            "mode='unknown'",
            "mode='system'\nca_pem='secret'",
            "mode='ca_bundle'",
            "mode='system'\nextra=1",
        ] {
            assert!(toml::from_str::<CollectorTrust>(text).is_err());
        }
        for pem in [
            "",
            "junk",
            "-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----",
            "-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----",
        ] {
            assert!(ca_roots(pem).is_err());
        }
        assert!(!format!("{:?}", CollectorTrust::CaBundle { pem: "secret".into() }).contains("secret"));
    }
    #[test]
    fn retry_after_is_bounded_and_does_not_reflect_arbitrary_input() {
        assert_eq!(retry_after("2"), Some(2));
        assert_eq!(retry_after("999"), Some(300));
        for value in ["", "-1", " 2", "99999999999999999999999999", "secret"] {
            assert_eq!(retry_after(value), None);
        }
    }
}
