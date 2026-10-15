//! Address-only reverse proxy attribution. Never an authentication identity.
use axum::extract::{ConnectInfo, FromRequestParts, Request};
use axum::http::{HeaderMap, StatusCode, request::Parts};
use axum::middleware::Next;
use axum::response::Response;
use std::net::{IpAddr, SocketAddr};

pub const HEADER: &str = "hennery-client-ip";

#[derive(Clone, Debug, Default)]
pub struct ProxyPolicy {
    peers: Vec<IpAddr>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Source {
    Peer,
    MissingHeader,
    Proxy,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ClientAddress {
    pub peer: IpAddr,
    pub effective: IpAddr,
    pub source: Source,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvalidClientAddress;

fn canonical(ip: IpAddr) -> IpAddr {
    ip.to_canonical()
}
fn valid(ip: IpAddr) -> bool {
    !ip.is_unspecified() && !ip.is_multicast()
}

impl ProxyPolicy {
    pub fn new(peers: Vec<IpAddr>) -> anyhow::Result<Self> {
        anyhow::ensure!(
            peers.len() <= 8,
            "proxy_client_ip_peers allows at most eight exact IP addresses"
        );
        let mut normalized = Vec::new();
        for ip in peers {
            let ip = canonical(ip);
            anyhow::ensure!(valid(ip), "proxy_client_ip_peers requires unicast addresses");
            anyhow::ensure!(
                !normalized.contains(&ip),
                "proxy_client_ip_peers contains a duplicate address"
            );
            normalized.push(ip);
        }
        Ok(Self { peers: normalized })
    }

    pub fn is_configured(&self) -> bool {
        !self.peers.is_empty()
    }

    pub fn resolve(&self, peer: IpAddr, headers: &HeaderMap) -> Result<ClientAddress, InvalidClientAddress> {
        let peer = canonical(peer);
        let mut address = ClientAddress {
            peer,
            effective: peer,
            source: Source::Peer,
        };
        if !self.peers.contains(&peer) {
            return Ok(address);
        }
        let mut values = headers.get_all(HEADER).iter();
        let Some(value) = values.next() else {
            address.source = Source::MissingHeader;
            return Ok(address);
        };
        if values.next().is_some() {
            return Err(InvalidClientAddress);
        }
        let ip = canonical(
            value
                .to_str()
                .map_err(|_| InvalidClientAddress)?
                .parse::<IpAddr>()
                .map_err(|_| InvalidClientAddress)?,
        );
        if !valid(ip) {
            return Err(InvalidClientAddress);
        }
        address.effective = ip;
        address.source = Source::Proxy;
        Ok(address)
    }
}

fn refused() -> Response {
    crate::auth_api::error(
        StatusCode::BAD_REQUEST,
        "invalid_client_address",
        "invalid client address header",
    )
}

// A single outer layer resolves before auth/body parsing. Existing standalone
// routers retain the unconfigured policy through the extractor's fallback.
pub async fn resolve_request(mut request: Request, next: Next) -> Response {
    let Some(ConnectInfo(peer)) = request.extensions().get::<ConnectInfo<SocketAddr>>().copied() else {
        return crate::auth_api::error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal",
            "missing connection address",
        );
    };
    let policy = request.extensions().get::<ProxyPolicy>().cloned().unwrap_or_default();
    match policy.resolve(peer.ip(), request.headers()) {
        Ok(address) => {
            request.extensions_mut().insert(address);
            next.run(request).await
        }
        Err(_) => refused(),
    }
}

impl<S: Send + Sync> FromRequestParts<S> for ClientAddress {
    type Rejection = Response;
    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        if let Some(address) = parts.extensions.get::<Self>() {
            return Ok(*address);
        }
        let ConnectInfo(peer) = parts
            .extensions
            .get::<ConnectInfo<SocketAddr>>()
            .copied()
            .ok_or_else(|| {
                crate::auth_api::error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal",
                    "missing connection address",
                )
            })?;
        parts
            .extensions
            .get::<ProxyPolicy>()
            .cloned()
            .unwrap_or_default()
            .resolve(peer.ip(), &parts.headers)
            .map_err(|_| refused())
    }
}
