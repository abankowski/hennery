//! The shipped Caddy/nginx recipes, with fixture-only placeholder substitution.
use crate::tls::TestCa;
use std::os::unix::process::CommandExt;
use std::{
    net::SocketAddr,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    time::Duration,
};

pub struct RecipeProxy {
    kind: String,
    root: PathBuf,
    port: u16,
    admin: u16,
    child: Child,
}
fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}
impl RecipeProxy {
    fn write_certificates(root: &Path, ca: &TestCa) {
        let (cert, key) = ca.server_pem();
        for (name, pem) in [("cert.pem", cert), ("key.pem", key)] {
            // nginx can inherit the old SSL object when inode+mtime match.
            // Rename a complete new file, including within one timestamp tick.
            let staged = root.join(format!("{name}.next"));
            std::fs::write(&staged, pem).unwrap();
            std::fs::rename(staged, root.join(name)).unwrap();
        }
    }
    fn command(kind: &str, root: &Path) -> Command {
        let mut command = Command::new(kind);
        if kind == "nginx" {
            command.arg("-e").arg(root.join("nginx-error.log"));
        }
        command
            .env("HOME", root.join("home"))
            .env("XDG_CONFIG_HOME", root.join("config"))
            .env("XDG_DATA_HOME", root.join("data"))
            .env("XDG_CACHE_HOME", root.join("cache"))
            .env("XDG_STATE_HOME", root.join("state"))
            .env_remove("SSL_CERT_FILE")
            .env_remove("SSL_CERT_DIR")
            .stdin(Stdio::null());
        command
    }
    pub async fn start(kind: &str, backend: SocketAddr, ca: &TestCa, root: &Path) -> Self {
        assert!(matches!(kind, "caddy" | "nginx"));
        let root = root.join(kind);
        std::fs::create_dir_all(root.join("home")).unwrap();
        let version = Self::command(kind, &root)
            .arg(if kind == "caddy" { "version" } else { "-v" })
            .output()
            .expect("proxy binary required: run in nix develop");
        assert!(version.status.success());
        eprintln!(
            "proxy version: {}{}",
            String::from_utf8_lossy(&version.stdout),
            String::from_utf8_lossy(&version.stderr)
        );
        let port = free_port();
        let admin = free_port();
        Self::write_certificates(&root, ca);
        let recipe = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packaging/proxy")
            .join(if kind == "caddy" { "Caddyfile" } else { "nginx.conf" });
        let mut config = std::fs::read_to_string(recipe).unwrap();
        for (placeholder, value) in [
            ("@TLS_PORT@", port.to_string()),
            ("@ADMIN_PORT@", admin.to_string()),
            ("@BACKEND_PORT@", backend.port().to_string()),
            ("@ROOT@", root.display().to_string()),
            ("@CERT@", root.join("cert.pem").display().to_string()),
            ("@KEY@", root.join("key.pem").display().to_string()),
            ("@BIND_V4@", "127.0.0.1".into()),
            ("@BIND_V6@", "::1".into()),
        ] {
            config = config.replace(placeholder, &value);
        }
        assert!(!config.contains('@'), "unsubstituted recipe placeholder");
        let file = root.join(if kind == "caddy" { "Caddyfile" } else { "nginx.conf" });
        std::fs::write(&file, config).unwrap();
        let mut validate = Self::command(kind, &root);
        if kind == "caddy" {
            validate.args(["validate", "--config"]).arg(&file);
        } else {
            validate.arg("-t").arg("-p").arg(&root).arg("-c").arg(&file);
        }
        let out = validate.output().unwrap();
        assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
        let child = Self::spawn(kind, &root);
        let mut proxy = Self {
            kind: kind.into(),
            root,
            port,
            admin,
            child,
        };
        let deadline = tokio::time::Instant::now() + Duration::from_secs(60);
        loop {
            assert!(
                proxy.child.try_wait().unwrap().is_none(),
                "proxy exited: {}",
                proxy.logs()
            );
            if tokio::net::TcpStream::connect(("127.0.0.1", port)).await.is_ok() {
                break;
            }
            assert!(tokio::time::Instant::now() < deadline, "proxy start: {}", proxy.logs());
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        proxy
    }
    fn spawn(kind: &str, root: &Path) -> Child {
        let file = root.join(if kind == "caddy" { "Caddyfile" } else { "nginx.conf" });
        let mut command = Self::command(kind, root);
        if kind == "caddy" {
            command.args(["run", "--config"]).arg(&file);
        } else {
            command
                .arg("-p")
                .arg(root)
                .arg("-c")
                .arg(&file)
                .args(["-g", "daemon off;"]);
        }
        let log = std::fs::File::create(root.join("process.log")).unwrap();
        command.stdout(log.try_clone().unwrap()).stderr(log);
        command.process_group(0).spawn().unwrap()
    }
    pub fn pause(&mut self) {
        if self.child.try_wait().ok().flatten().is_some() {
            return;
        }
        // SAFETY: this fixture created and owns the entire process group.
        unsafe { libc::kill(-(self.child.id() as i32), libc::SIGTERM) };
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        while self.child.try_wait().unwrap().is_none() && std::time::Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        if self.child.try_wait().unwrap().is_none() {
            // SAFETY: only this fixture's still-running, unreaped group.
            unsafe { libc::kill(-(self.child.id() as i32), libc::SIGKILL) };
        }
        let _ = self.child.wait();
    }
    pub async fn resume(&mut self, ca: &TestCa) {
        assert!(self.child.try_wait().unwrap().is_some(), "pause before resume");
        Self::write_certificates(&self.root, ca);
        self.child = Self::spawn(&self.kind, &self.root);
        let deadline = tokio::time::Instant::now() + Duration::from_secs(60);
        loop {
            assert!(
                self.child.try_wait().unwrap().is_none(),
                "proxy exited: {}",
                self.logs()
            );
            if tokio::net::TcpStream::connect(("127.0.0.1", self.port)).await.is_ok() {
                break;
            }
            assert!(tokio::time::Instant::now() < deadline);
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    }
    /// Abrupt transport loss, with no graceful wait that could become a timeout.
    pub fn cut(&mut self) {
        assert!(self.child.try_wait().unwrap().is_none());
        // SAFETY: this fixture created and owns the unreaped process group.
        assert_eq!(unsafe { libc::kill(-(self.child.id() as i32), libc::SIGKILL) }, 0);
        self.child.wait().unwrap();
    }
    pub fn port(&self) -> u16 {
        self.port
    }
    pub fn origin(&self) -> String {
        format!("https://localhost:{}", self.port)
    }
    pub fn logs(&self) -> String {
        ["process.log", "nginx-error.log"]
            .into_iter()
            .map(|file| std::fs::read_to_string(self.root.join(file)).unwrap_or_default())
            .collect()
    }
    pub async fn renew_and_reload(&mut self, ca: &TestCa) {
        let old = self.leaf(ca).await;
        Self::write_certificates(&self.root, ca);
        if self.kind == "caddy" {
            let out = Self::command("caddy", &self.root)
                .args(["reload", "--force", "--address"])
                .arg(format!("127.0.0.1:{}", self.admin))
                .arg("--config")
                .arg(self.root.join("Caddyfile"))
                .output()
                .unwrap();
            assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
        } else {
            // SAFETY: only the master process started and owned by this fixture.
            assert_eq!(unsafe { libc::kill(self.child.id() as i32, libc::SIGHUP) }, 0);
        }
        let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
        while self.leaf(ca).await == old {
            assert!(
                tokio::time::Instant::now() < deadline,
                "reload did not install the renewed leaf: {}",
                self.logs()
            );
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    }

    async fn leaf(&self, ca: &TestCa) -> Vec<u8> {
        use rustls::pki_types::pem::PemObject;
        let mut roots = rustls::RootCertStore::empty();
        roots
            .add(rustls::pki_types::CertificateDer::from_pem_slice(ca.pem.as_bytes()).unwrap())
            .unwrap();
        let config =
            rustls::ClientConfig::builder_with_provider(std::sync::Arc::new(rustls::crypto::ring::default_provider()))
                .with_safe_default_protocol_versions()
                .unwrap()
                .with_root_certificates(roots)
                .with_no_client_auth();
        let tcp = tokio::net::TcpStream::connect(("127.0.0.1", self.port)).await.unwrap();
        let tls = tokio_rustls::TlsConnector::from(std::sync::Arc::new(config))
            .connect("localhost".try_into().unwrap(), tcp)
            .await
            .unwrap();
        tls.get_ref().1.peer_certificates().unwrap()[0].as_ref().to_vec()
    }
}
impl Drop for RecipeProxy {
    fn drop(&mut self) {
        self.pause();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::MetadataExt;
    #[test]
    fn certificate_updates_replace_files_instead_of_reusing_inodes() {
        let dir = tempfile::tempdir().unwrap();
        let ca = TestCa::new();
        RecipeProxy::write_certificates(dir.path(), &ca);
        let before: Vec<_> = ["cert.pem", "key.pem"]
            .map(|name| std::fs::metadata(dir.path().join(name)).unwrap().ino())
            .into();
        RecipeProxy::write_certificates(dir.path(), &ca);
        for (name, inode) in ["cert.pem", "key.pem"].into_iter().zip(before) {
            assert_ne!(
                std::fs::metadata(dir.path().join(name)).unwrap().ino(),
                inode,
                "nginx may inherit an unchanged inode+mtime across reloads"
            );
        }
    }
}
