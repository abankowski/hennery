# hennery — W1: WSS transport and diagnostics

- **Date:** 2026-10-26 (plan identifier); built and verified locally on 2026-10-14.
- **Base:** `8bb29904`, including design PRs #134 and #137. Branch `plan/wss-w1`.
- **Design:** [Remote hosts over WSS](../specs/2026-10-14-wss-design.md), W1 in §11. The umbrella remains authoritative.
- **Goal:** enroll against an authorized HTTPS origin, run and reconnect over verified WSS, retain host identity through a tunnel migration, and diagnose the same saved TLS policy.
- **Method:** build first; test commits observed RED, implementation commits observed GREEN; embed the actual patches below and extract them into a fresh worktree. The code in the patches wins over prose.

## Execution status

**Built locally; review amendments implemented; awaiting scoped parent-run re-review.** The parent brief confirms the design's approval on the maintainer's behalf and scoped re-confirmation of its three amendments. Draft PR #139 is parent-managed. This record does not claim that an implementer reviewed their own work, CI passed on Linux, or live acceptance with paid adapters ran.

The first six tasks each have a test commit and implementation commit. After autosquash, Task 2's RED snapshot also refers to the private metadata validator introduced by its following implementation commit; the amendment's runtime RED assertions and removal probes are recorded separately below. Subsequent integration commits fix failures exposed by the complete suite and strengthen assertions exposed by mutation probes. Tests for Tasks 4 and 6 initially failed to compile because the new deterministic/classifier API did not exist; the other RED commits failed runtime assertions. Those compilation failures are not counted as mutation evidence. Targeted tests ran at each task; the complete checks ran on the integrated implementation, rather than on every intermediate task snapshot. This process deviation is explicit for the reviewer.

The implementation was rebased conflict-free onto `8bb29904` before the amended replay. The maintainer-delegated Codex gpt-6-astra review of `fa81e548..bc0caeff` returned APPROVE AFTER AMENDMENTS: two Important directory-preparation findings and one Minor cold-execution fixture finding, with no Critical findings. All three amendments are folded into their owning task commits. Newly created directory entries and every ancestor link are synced before enrollment, including retrying an existing directory after a failed sync. Empty destinations must belong to the current user, forbid group/other writes, and open without following a destination symlink before staging keys. The committed-POST deadline fixture warms the binary first. No new migrations, wire frames, generated protocol changes, proxy attribution, public deployment recipes, or global CA changes are included.

Verification results and replay evidence are recorded below after the tasks. No fake-adapter result establishes the live acceptance gate in design §9.7.

## Scope

Six tasks:

1. A canonical collector endpoint, strict saved trust policy, native roots and one rustls configuration shared by HTTP and WebSocket transport.
2. Durable enrollment intent, confirmed receipt recovery, conservative handling of legacy fragments, and an attempt-bound archive action.
3. WSS enrollment, authenticated idempotency, explicit transport migration and CLI entry-point guards before any hello or automatic pairing.
4. Bounded reconnect jitter and structured, capped `Retry-After`, retaining existing commit-ack/healthy-interval reset conditions.
5. Doctor checks 7, 8, 14 and 16 using the shared transport, saved host trust and independent collector health trust.
6. Real TLS/process/storage/reconnect tests, differential security parsing, load, mutation probes, README/spec write-back and fresh replay.

W2's forwarding trust, client-address budgets, proxy recipes and public deployment acceptance remain out of scope. The README's tunnel instructions and shared-loopback-budget warning stay.

## Decisions

| Contract | Implementation |
|---|---|
| Approved uncertainty amendment | Fsync pending key and versioned `MayHaveCommitted` journal before one POST; persist no code. Ambiguous outcomes never generate another key or POST. |
| Approved loopback amendment | Only two validated plaintext loopback endpoints may alias. Secure endpoint changes, listener derivation and development overrides must pass exact canonical comparison or explicit secure migration. |
| Approved durability amendment | Before rename, retain old bytes. After rename and failed directory sync, return typed `DurabilityUncertain` with sanitized read-back; no rollback or ordinary restart-success message. |
| Default roots | Native anchors validated by rustls; explicit empty/failing load refuses without bundled fallback. Partial loads warn. Explicit CA mode uses only its copied CA bundle and ignores native overrides. |
| Private CA lifecycle | Regular no-follow input; 256 KiB/32 certificate maximum; CA constraints, validity and key usage checked. Saved PEM is collector-scoped and redacted from Debug/errors. |
| Collector authorization | Local explicit URL and trust authorize the origin. A hello proof authenticates the host; a remote hello acknowledgement cannot prove that two origins are one installation. |
| Recovery | Preserve prior identity/outbox until a confirmed receipt is installed. Archive copies artifacts durably before removal; an interrupted marker blocks and resumes. Archive history suppresses automatic pairing until explicit join. |
| Compatibility | Old missing `collector_tls` means system roots; old local plaintext configs still work. Gateway/runtime trust remains separately configured. |
| Integration fixes | Test git fixtures disable signing explicitly because they scrub inherited `GIT_*`; `up.lock` precedes pairing-state locking; invalid stdin may create only the required `host.lock`; no identity files are created before valid input. |

No new product decision was taken beyond the approved design and parent brief.

## Global Constraints

- Use `nix develop -c`, the locked graph and a target directory belonging to this worktree. No global installs or CA installation.
- No redirects, environment forward proxy, plaintext remote endpoint, missing nonce, or plaintext downgrade may carry a hello/enrollment.
- Uncertain/invalid recovery state is inspected before every ordinary load; doctor is read-only and sends no identity probe for it.
- Take `host.lock` before pairing-state reads/writes. Transport/recovery changes require the host service stopped. `up` passes its held lock to internal join.
- Preserve identity, workspace roots, CLI overrides and outbox during migration. Confirmed re-pair alone may orphan the prior outbox.
- No network body, code, private key or CA contents in diagnostics. Structural TLS errors drive classification, never substring matches.
- Session/outbox reconciliation, adapter ownership, revoked-only shutdown and release pin behavior remain the existing implementation's contracts.
- Fixtures use scratch HOME/XDG/data paths, generated CAs and loopback sockets. They never touch deployed data or the OS trust store.

## Review Focus

1. Key/journal/receipt/config rename and sync order, including installed and pending keys disagreeing; cleanup and archive interruption; earlier pairing and outbox survival.
2. Every URL parser and compatibility caller before hello; exact secure equality, loopback name resolution without DNS, and original name/IP SAN verification after socket resolution.
3. One compatible rustls type and explicit verifier for HTTP and WSS; empty/partial native roots; independent doctor collector trust; no proxy/redirect/retry escape.
4. Bounded enrollment bodies, exact definitive rejection, lost committed responses, process death and no second POST on all entry points.
5. Post-rename failure truthfulness and read-back, no silent rollback, no successful restart instruction until durable completion.
6. Reconnect random bounds, Retry-After cap, read deadline, actual offline answer reconciliation without adapter respawn or duplicate prompt.
7. Linux filesystem/process behavior in parent-owned CI and the still-open real Claude/Codex/MCP acceptance gate.

## File structure

| Area | Files |
|---|---|
| Host transport/state | `crates/hennery-host/src/{transport,enrollment,identity,pairing,connection,lib}.rs` |
| CLI/doctor | `crates/hennery/src/main.rs`, `crates/hennery/src/doctor/{mod,collector,service,tests}.rs` |
| TLS fixture | `crates/hennery-testkit/src/{lib,tls}.rs` |
| Integration tests | `crates/hennery-host/tests/transport.rs`, `crates/hennery-testkit/tests/{join,e2e,host_session}.rs`, `crates/hennery/tests/{wss,cli,agents,doctor}.rs` |
| Dependencies | Workspace/host/testkit/CLI Cargo manifests and `Cargo.lock` |
| User/spec docs | `README.md`, umbrella/kernel built notes, this plan and `docs/README.md` |

## Reading the steps

Each `diff` block is the exact zero-context patch of the named commit (`git show --unified=0`), including its tests and lockfile changes. This avoids embedding whitespace-only context lines while preserving every changed byte. Apply blocks in document order with `git apply --index --unidiff-zero`; do not copy replacement source from the implementation checkout. The marker records the expected Git tree after that patch. The replay runner rejects zero blocks, failed applies, or a tree mismatch after any commit. It then applies the documentation-index patch and copies this self-describing plan, stages those two metadata files and compares the entire tracked tree. Copying the plan itself avoids a self-referential hash; implementation bytes all come from extracted patches.

Re-run commands from the worktree root. Commands below are commands executed during development, not a claim that an intermediate snapshot had the final integrated test count. Scratch artifacts and detailed probe/load logs are retained under `.superpowers/sdd/wss-w1/`; scratch trees are retained for the parent to clean.

## Task 1 — Endpoint and TLS policy

**Step 1:** inspect the preceding base and apply the test patch; observe its recorded RED. **Step 2:** apply the implementation patch and verify the targeted behavior. **Step 3:** review the diff against the constraints before pushing. Independent review is requested from the parent after this built plan.

Run: `nix develop -c cargo test -p hennery-host --lib --locked transport::`. Expected after implementation: exit 0; the execution table records integrated counts.

### 35c6a08c test(transport): reject credential URLs and secure loopback aliases

<!-- replay-commit: 35c6a08ce2c4063d44429afde2fb891ee7f17f09 tree: f9ed04b6a2531847a0ad8166082709526c3ab523 -->

```diff
diff --git a/crates/hennery-host/src/pairing.rs b/crates/hennery-host/src/pairing.rs
index c64d3985..4547b052 100644
--- a/crates/hennery-host/src/pairing.rs
+++ b/crates/hennery-host/src/pairing.rs
@@ -291,0 +292,14 @@ mod tests {
+    #[test]
+    fn collector_policy_rejects_credentials_and_all_secure_loopback_aliases() {
+        for input in ["https://user:secret@localhost", "https://localhost:0", "https://localhost/?x=1", "https://localhost/#x"] {
+            let error = parse_public_url(input).unwrap_err().to_string();
+            assert!(!error.contains("secret"));
+        }
+        for a in ["wss://localhost/api/hosts/ws", "wss://127.0.0.1:443/api/hosts/ws"] {
+            for b in ["ws://localhost/api/hosts/ws", "ws://127.0.0.1:7117/api/hosts/ws", "wss://localhost:8443/api/hosts/ws"] {
+                assert!(!same_collector(a, b), "{a} -> {b}");
+            }
+        }
+        assert!(!same_collector("ws://localhost/wrong", "ws://127.0.0.1/api/hosts/ws"));
+    }
+
```

### 3130ac9b feat(transport): share validated collector endpoints and TLS roots

<!-- replay-commit: 3130ac9be5447f10845f0a9b94080aa87cd7fc3a tree: 2cd5736ec9828e636d0dd83e8f9639527d405431 -->

```diff
diff --git a/Cargo.lock b/Cargo.lock
index b7462e05..111061ee 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -198 +198 @@ dependencies = [
- "asn1-rs-derive",
+ "asn1-rs-derive 0.5.1",
@@ -207,0 +208,16 @@ dependencies = [
+[[package]]
+name = "asn1-rs"
+version = "0.7.2"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "b7f43a50ac4fdca5df8e885c21b835997f0a1cdee65494a6847694a98652d9d8"
+dependencies = [
+ "asn1-rs-derive 0.6.0",
+ "asn1-rs-impl",
+ "displaydoc",
+ "nom",
+ "num-traits",
+ "rusticata-macros",
+ "thiserror 2.0.21",
+ "time",
+]
+
@@ -219,0 +236,12 @@ dependencies = [
+[[package]]
+name = "asn1-rs-derive"
+version = "0.6.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "3109e49b1e4909e9db6515a30c633684d68cdeaa252f215214cb4fa1a5bfee2c"
+dependencies = [
+ "proc-macro2",
+ "quote",
+ "syn 2.0.119",
+ "synstructure 0.13.2",
+]
+
@@ -454,0 +483,9 @@ dependencies = [
+[[package]]
+name = "bit-vec"
+version = "0.9.1"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "b71798fca2c1fe1086445a7258a4bc81e6e49dcd24c8d0dd9a1e57395b603f51"
+dependencies = [
+ "serde",
+]
+
@@ -690,0 +728,10 @@ dependencies = [
+[[package]]
+name = "core-foundation"
+version = "0.10.1"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "b2a6cd9ae233e7f62ba4e9353e81a88df7fc8a5987b8d445b4d90c879bd156f6"
+dependencies = [
+ "core-foundation-sys",
+ "libc",
+]
+
@@ -901 +948,15 @@ dependencies = [
- "asn1-rs",
+ "asn1-rs 0.6.2",
+ "displaydoc",
+ "nom",
+ "num-bigint",
+ "num-traits",
+ "rusticata-macros",
+]
+
+[[package]]
+name = "der-parser"
+version = "10.0.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "07da5016415d5a3c4dd39b11ed26f915f52fc4e0dc197d87908bc916e51bc1a6"
+dependencies = [
+ "asn1-rs 0.7.2",
@@ -1500,0 +1562 @@ dependencies = [
+ "rcgen",
@@ -1502,0 +1565,3 @@ dependencies = [
+ "rustls",
+ "rustls-native-certs",
+ "rustls-pemfile",
@@ -1508,0 +1574 @@ dependencies = [
+ "tokio-rustls",
@@ -1515,0 +1582 @@ dependencies = [
+ "x509-parser 0.18.1",
@@ -2263 +2330,10 @@ dependencies = [
- "asn1-rs",
+ "asn1-rs 0.6.2",
+]
+
+[[package]]
+name = "oid-registry"
+version = "0.8.1"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "12f40cff3dde1b6087cc5d5f5d4d65712f34016a03ed60e9c08dcc392736b5b7"
+dependencies = [
+ "asn1-rs 0.7.2",
@@ -2308,0 +2385,6 @@ dependencies = [
+[[package]]
+name = "openssl-probe"
+version = "0.2.1"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "7c87def4c32ab89d880effc9e097653c8da5d6ef28e6b539d313baaacfbafcbe"
+
@@ -2400,0 +2483,10 @@ checksum = "35fb2e5f958ec131621fdd531e9fc186ed768cbe395337403ae56c17a74c68ec"
+[[package]]
+name = "pem"
+version = "4.0.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "d354a98a3d1251555de99e8fdd8afda05573c31b82f59063a7b0a29b5527f120"
+dependencies = [
+ "base64 0.23.1",
+ "serde_core",
+]
+
@@ -2715,0 +2808,14 @@ dependencies = [
+[[package]]
+name = "rcgen"
+version = "0.14.10"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "8774e05a7d0de114588e6a28fe7e71694b82614ed569d86d8b389dfbc98b8ad8"
+dependencies = [
+ "pem",
+ "ring",
+ "rustls-pki-types",
+ "time",
+ "x509-parser 0.18.1",
+ "yasna",
+]
+
@@ -2902,0 +3009,21 @@ dependencies = [
+[[package]]
+name = "rustls-native-certs"
+version = "0.8.3"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "612460d5f7bea540c490b2b6395d8e34a953e52b491accd6c86c8164c5932a63"
+dependencies = [
+ "openssl-probe",
+ "rustls-pki-types",
+ "schannel",
+ "security-framework",
+]
+
+[[package]]
+name = "rustls-pemfile"
+version = "2.2.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "dce314e5fee3f39953d46bb63bb8a46d40c2f8fb7cc5a3b6cab2bde9721d6e50"
+dependencies = [
+ "rustls-pki-types",
+]
+
@@ -2935,0 +3063,9 @@ checksum = "9774ba4a74de5f7b1c1451ed6cd5285a32eddb5cccb8cc655a4e50009e06477f"
+[[package]]
+name = "schannel"
+version = "0.1.29"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "91c1b7e4904c873ef0710c1f407dde2e6287de2bebc1bbbf7d430bb7cbffd939"
+dependencies = [
+ "windows-sys 0.61.2",
+]
+
@@ -2992,0 +3129,23 @@ dependencies = [
+[[package]]
+name = "security-framework"
+version = "3.7.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "b7f4bc775c73d9a02cde8bf7b2ec4c9d12743edf609006c7facc23998404cd1d"
+dependencies = [
+ "bitflags 2.13.2",
+ "core-foundation",
+ "core-foundation-sys",
+ "libc",
+ "security-framework-sys",
+]
+
+[[package]]
+name = "security-framework-sys"
+version = "2.17.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "6ce2691df843ecc5d231c0b14ece2acc3efb62c0a398c7e1d875f3983ce020e3"
+dependencies = [
+ "core-foundation-sys",
+ "libc",
+]
+
@@ -3539,0 +3699,3 @@ dependencies = [
+ "rustls",
+ "rustls-native-certs",
+ "rustls-pki-types",
@@ -3540,0 +3703 @@ dependencies = [
+ "tokio-rustls",
@@ -3745,0 +3909,2 @@ dependencies = [
+ "rustls",
+ "rustls-pki-types",
@@ -4060 +4225 @@ dependencies = [
- "der-parser",
+ "der-parser 9.0.0",
@@ -4076 +4241 @@ dependencies = [
- "x509-parser",
+ "x509-parser 0.16.0",
@@ -4275 +4440 @@ dependencies = [
- "asn1-rs",
+ "asn1-rs 0.6.2",
@@ -4277 +4442 @@ dependencies = [
- "der-parser",
+ "der-parser 9.0.0",
@@ -4280 +4445 @@ dependencies = [
- "oid-registry",
+ "oid-registry 0.7.1",
@@ -4285,0 +4451,28 @@ dependencies = [
+[[package]]
+name = "x509-parser"
+version = "0.18.1"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "d43b0f71ce057da06bc0851b23ee24f3f86190b07203dd8f567d0b706a185202"
+dependencies = [
+ "asn1-rs 0.7.2",
+ "data-encoding",
+ "der-parser 10.0.0",
+ "lazy_static",
+ "nom",
+ "oid-registry 0.8.1",
+ "ring",
+ "rusticata-macros",
+ "thiserror 2.0.21",
+ "time",
+]
+
+[[package]]
+name = "yasna"
+version = "0.6.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "b5f6765e852b9b4dc8e2a76843e4d64d1cea8e79bcde0b6901aea8e7c7f08282"
+dependencies = [
+ "bit-vec",
+ "time",
+]
+
diff --git a/Cargo.toml b/Cargo.toml
index a641a4c5..d6a52d32 100644
--- a/Cargo.toml
+++ b/Cargo.toml
@@ -57 +57,5 @@ tokio-stream = { version = "0.1", features = ["sync"] }
-tokio-tungstenite = "0.29"
+tokio-tungstenite = { version = "0.29", features = ["rustls-tls-native-roots"] }
+rustls = { version = "=0.23.45", default-features = false, features = ["ring", "std", "tls12"] }
+rustls-native-certs = "=0.8.3"
+rustls-pemfile = "=2.2.0"
+x509-parser = "=0.18.1"
diff --git a/crates/hennery-host/Cargo.toml b/crates/hennery-host/Cargo.toml
index 0e0ba981..8962473b 100644
--- a/crates/hennery-host/Cargo.toml
+++ b/crates/hennery-host/Cargo.toml
@@ -25,0 +26,4 @@ reqwest.workspace = true
+rustls.workspace = true
+rustls-native-certs.workspace = true
+rustls-pemfile.workspace = true
+x509-parser.workspace = true
@@ -41,0 +46,2 @@ uuid.workspace = true
+rcgen = "0.14"
+tokio-rustls = { version = "0.26", default-features = false, features = ["ring", "tls12"] }
diff --git a/crates/hennery-host/src/lib.rs b/crates/hennery-host/src/lib.rs
index 8bcefb20..bceb0022 100644
--- a/crates/hennery-host/src/lib.rs
+++ b/crates/hennery-host/src/lib.rs
@@ -18,0 +19 @@ pub mod session;
+pub mod transport;
diff --git a/crates/hennery-host/src/pairing.rs b/crates/hennery-host/src/pairing.rs
index 4547b052..b00a4c58 100644
--- a/crates/hennery-host/src/pairing.rs
+++ b/crates/hennery-host/src/pairing.rs
@@ -31,20 +31,3 @@ pub fn parse_public_url(public_url: &str) -> Result<Url> {
-    let url = Url::parse(public_url.trim()).with_context(|| format!("{public_url} is not a URL"))?;
-    let Some(host) = url.host_str() else {
-        bail!("{public_url} has no host");
-    };
-    let loopback = host.eq_ignore_ascii_case("localhost")
-        || host
-            .trim_start_matches('[')
-            .trim_end_matches(']')
-            .parse::<std::net::IpAddr>()
-            .is_ok_and(|ip| ip.is_loopback());
-    match url.scheme() {
-        "https" => {}
-        "http" if loopback => {}
-        "http" => bail!("{public_url}: plain http is only allowed to a loopback address; use https"),
-        other => bail!("{public_url}: unsupported scheme {other}"),
-    }
-    if url.path() != "/" || url.query().is_some() || url.fragment().is_some() {
-        bail!("{public_url}: give the collector's base URL, without a path");
-    }
-    Ok(url)
+    Ok(crate::transport::CollectorEndpoint::public(public_url)?
+        .origin()
+        .clone())
@@ -118,13 +101,7 @@ pub fn same_collector(a: &str, b: &str) -> bool {
-    let loopback = |u: &str| {
-        Url::parse(u)
-            .ok()
-            .and_then(|u| u.host_str().map(str::to_string))
-            .is_some_and(|h| {
-                h.eq_ignore_ascii_case("localhost")
-                    || h.trim_start_matches('[')
-                        .trim_end_matches(']')
-                        .parse::<std::net::IpAddr>()
-                        .is_ok_and(|ip| ip.is_loopback())
-            })
-    };
-    a == b || (loopback(a) && loopback(b))
+    match (
+        crate::transport::CollectorEndpoint::stored(a),
+        crate::transport::CollectorEndpoint::stored(b),
+    ) {
+        (Ok(a), Ok(b)) => a.compatible(&b),
+        _ => false,
+    }
@@ -294 +271,6 @@ mod tests {
-        for input in ["https://user:secret@localhost", "https://localhost:0", "https://localhost/?x=1", "https://localhost/#x"] {
+        for input in [
+            "https://user:secret@localhost",
+            "https://localhost:0",
+            "https://localhost/?x=1",
+            "https://localhost/#x",
+        ] {
@@ -299 +281,5 @@ mod tests {
-            for b in ["ws://localhost/api/hosts/ws", "ws://127.0.0.1:7117/api/hosts/ws", "wss://localhost:8443/api/hosts/ws"] {
+            for b in [
+                "ws://localhost/api/hosts/ws",
+                "ws://127.0.0.1:7117/api/hosts/ws",
+                "wss://localhost:8443/api/hosts/ws",
+            ] {
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
new file mode 100644
index 00000000..3c9fdc63
--- /dev/null
+++ b/crates/hennery-host/src/transport.rs
@@ -0,0 +1,471 @@
+//! The locally authorized collector's endpoint and TLS policy. All host
+//! traffic uses this connector, without redirects or environment proxies.
+use anyhow::{Result, bail};
+use serde::{Deserialize, Serialize};
+use std::{
+    net::{IpAddr, SocketAddr},
+    path::Path,
+    sync::Arc,
+    time::Duration,
+};
+use tokio_tungstenite::{
+    Connector, MaybeTlsStream, WebSocketStream,
+    tungstenite::{self, protocol::WebSocketConfig},
+};
+use url::Url;
+
+pub const TIMEOUT: Duration = Duration::from_secs(15);
+pub const MAX_CA_BYTES: usize = 256 * 1024;
+#[derive(Clone, PartialEq, Eq, Serialize, Default)]
+#[serde(tag = "mode", rename_all = "snake_case", deny_unknown_fields)]
+pub enum CollectorTrust {
+    #[default]
+    System,
+    CaBundle {
+        #[serde(rename = "ca_pem")]
+        pem: String,
+    },
+}
+impl<'de> Deserialize<'de> for CollectorTrust {
+    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> std::result::Result<Self, D::Error> {
+        #[derive(Deserialize)]
+        #[serde(deny_unknown_fields)]
+        struct Raw {
+            mode: String,
+            ca_pem: Option<String>,
+        }
+        let raw = Raw::deserialize(deserializer)?;
+        match (raw.mode.as_str(), raw.ca_pem) {
+            ("system", None) => Ok(Self::System),
+            ("ca_bundle", Some(pem)) => Ok(Self::CaBundle { pem }),
+            _ => Err(serde::de::Error::custom("invalid collector TLS mode or fields")),
+        }
+    }
+}
+impl std::fmt::Debug for CollectorTrust {
+    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+        f.write_str(match self {
+            Self::System => "System",
+            Self::CaBundle { .. } => "CaBundle([redacted])",
+        })
+    }
+}
+impl CollectorTrust {
+    pub fn import(path: &Path) -> Result<Self> {
+        use std::io::Read;
+        use std::os::unix::fs::OpenOptionsExt;
+        let mut file = std::fs::OpenOptions::new()
+            .read(true)
+            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
+            .open(path)?;
+        if !file.metadata()?.is_file() {
+            bail!("CA input must be a regular file");
+        }
+        let mut pem = String::new();
+        file.by_ref().take((MAX_CA_BYTES + 1) as u64).read_to_string(&mut pem)?;
+        ca_roots(&pem)?;
+        Ok(Self::CaBundle { pem })
+    }
+    pub fn source(&self) -> String {
+        match self {
+            Self::CaBundle { .. } => "collector-only CA bundle".into(),
+            Self::System => {
+                let overrides: Vec<_> = ["SSL_CERT_FILE", "SSL_CERT_DIR"]
+                    .into_iter()
+                    .filter(|n| std::env::var_os(n).is_some())
+                    .collect();
+                if overrides.is_empty() {
+                    "native system roots".into()
+                } else {
+                    format!("native roots ({})", overrides.join(", "))
+                }
+            }
+        }
+    }
+}
+fn ca_roots(pem: &str) -> Result<rustls::RootCertStore> {
+    if pem.len() > MAX_CA_BYTES {
+        bail!("CA bundle exceeds 256 KiB");
+    }
+    // Parse every byte: PEM readers otherwise silently ignore junk and key blocks.
+    let mut rest = pem.trim();
+    let mut roots = rustls::RootCertStore::empty();
+    let mut count = 0;
+    while !rest.is_empty() {
+        let Some(body) = rest.strip_prefix("-----BEGIN CERTIFICATE-----") else {
+            bail!("CA bundle contains a non-certificate block");
+        };
+        let Some(end) = body.find("-----END CERTIFICATE-----") else {
+            bail!("malformed CA bundle");
+        };
+        let block_len = "-----BEGIN CERTIFICATE-----".len() + end + "-----END CERTIFICATE-----".len();
+        let block = &rest[..block_len];
+        let cert = rustls_pemfile::certs(&mut block.as_bytes())
+            .next()
+            .transpose()?
+            .ok_or_else(|| anyhow::anyhow!("empty CA certificate"))?;
+        let (tail, parsed) = x509_parser::parse_x509_certificate(cert.as_ref())
+            .map_err(|_| anyhow::anyhow!("malformed CA certificate"))?;
+        if !tail.is_empty() || !parsed.basic_constraints().ok().flatten().is_some_and(|v| v.value.ca) {
+            bail!("bundle certificates must be valid CA certificates");
+        }
+        roots
+            .add(cert)
+            .map_err(|_| anyhow::anyhow!("invalid CA trust anchor"))?;
+        count += 1;
+        if count > 32 {
+            bail!("CA bundle exceeds 32 certificates");
+        }
+        rest = rest[block_len..].trim();
+    }
+    if count == 0 {
+        bail!("CA bundle is empty");
+    }
+    Ok(roots)
+}
+
+#[derive(Debug, Clone, PartialEq, Eq)]
+pub struct CollectorEndpoint {
+    origin: Url,
+    ws: Url,
+}
+impl CollectorEndpoint {
+    pub fn public(input: &str) -> Result<Self> {
+        Self::parse(input, false)
+    }
+    pub fn stored(input: &str) -> Result<Self> {
+        Self::parse(input, true)
+    }
+    fn parse(input: &str, stored: bool) -> Result<Self> {
+        let mut url = Url::parse(input.trim()).map_err(|_| anyhow::anyhow!("collector is not a URL"))?;
+        if !url.username().is_empty() || url.password().is_some() {
+            bail!("collector URL must not contain credentials");
+        }
+        if url.host().is_none() || url.port() == Some(0) {
+            bail!("collector URL requires a host and a nonzero port");
+        }
+        let secure = match (stored, url.scheme()) {
+            (false, "https") | (true, "wss") => true,
+            (false, "http") | (true, "ws") => false,
+            _ => bail!("unsupported scheme for collector URL"),
+        };
+        if !secure && !loopback(&url) {
+            bail!("plain http is only allowed to a loopback address; use https");
+        }
+        let path = if stored { "/api/hosts/ws" } else { "/" };
+        if url.path() != path || url.query().is_some() || url.fragment().is_some() {
+            bail!(
+                "give the collector's base URL without a path, query or fragment (stored URLs require /api/hosts/ws)"
+            );
+        }
+        url.set_scheme(if secure { "https" } else { "http" })
+            .map_err(|_| anyhow::anyhow!("invalid collector scheme"))?;
+        url.set_path("/");
+        let origin = url.clone();
+        url.set_scheme(if secure { "wss" } else { "ws" })
+            .map_err(|_| anyhow::anyhow!("invalid collector scheme"))?;
+        url.set_path("/api/hosts/ws");
+        Ok(Self { origin, ws: url })
+    }
+    pub fn origin(&self) -> &Url {
+        &self.origin
+    }
+    pub fn ws(&self) -> &str {
+        self.ws.as_str()
+    }
+    pub fn secure(&self) -> bool {
+        self.origin.scheme() == "https"
+    }
+    pub fn compatible(&self, other: &Self) -> bool {
+        self == other || (!self.secure() && !other.secure() && loopback(&self.origin) && loopback(&other.origin))
+    }
+    pub fn require_compatible(&self, other: &Self) -> Result<()> {
+        if !self.compatible(other) {
+            bail!(
+                "collector endpoint change refused before hello; park sessions, stop the host and use `hennery host transport set <https-origin>` with explicit trust"
+            );
+        }
+        Ok(())
+    }
+    pub async fn addresses(&self) -> Result<Vec<SocketAddr>> {
+        let port = self.origin.port_or_known_default().unwrap_or(443);
+        let addresses = match self.origin.host().expect("validated host") {
+            url::Host::Domain("localhost") => vec![
+                SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::LOCALHOST), port),
+                SocketAddr::new(IpAddr::V6(std::net::Ipv6Addr::LOCALHOST), port),
+            ],
+            url::Host::Ipv4(ip) => vec![SocketAddr::new(ip.into(), port)],
+            url::Host::Ipv6(ip) => vec![SocketAddr::new(ip.into(), port)],
+            url::Host::Domain(name) => tokio::time::timeout(TIMEOUT, tokio::net::lookup_host((name, port)))
+                .await
+                .map_err(|_| failure(Stage::Dns))?
+                .map_err(|_| failure(Stage::Dns))?
+                .collect(),
+        };
+        if addresses.is_empty() || (!self.secure() && addresses.iter().any(|a| !a.ip().is_loopback())) {
+            return Err(failure(Stage::Dns));
+        }
+        Ok(addresses)
+    }
+}
+fn loopback(url: &Url) -> bool {
+    match url.host() {
+        Some(url::Host::Domain("localhost")) => true,
+        Some(url::Host::Ipv4(ip)) => ip.is_loopback(),
+        Some(url::Host::Ipv6(ip)) => ip.is_loopback(),
+        _ => false,
+    }
+}
+#[derive(Debug, Clone, PartialEq, Eq)]
+pub enum Stage {
+    Dns,
+    Connect,
+    Tls,
+    Upgrade {
+        status: Option<u16>,
+        retry_after: Option<u64>,
+    },
+    MissingNonce,
+    HelloTimeout,
+}
+#[derive(Debug)]
+pub struct TransportFailure(pub Stage);
+impl std::fmt::Display for TransportFailure {
+    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+        write!(
+            f,
+            "collector transport failed at {:?}; repair this stage without changing the host identity or disabling TLS validation",
+            self.0
+        )
+    }
+}
+impl std::error::Error for TransportFailure {}
+pub fn failure(stage: Stage) -> anyhow::Error {
+    TransportFailure(stage).into()
+}
+pub fn classify(error: &(dyn std::error::Error + 'static)) -> Stage {
+    let mut source = Some(error);
+    while let Some(err) = source {
+        if let Some(e) = err.downcast_ref::<TransportFailure>() {
+            return e.0.clone();
+        }
+        if err.is::<rustls::Error>() {
+            return Stage::Tls;
+        }
+        if let Some(io) = err.downcast_ref::<std::io::Error>()
+            && let Some(inner) = io.get_ref()
+            && classify(inner) == Stage::Tls
+        {
+            return Stage::Tls;
+        }
+        source = err.source();
+    }
+    Stage::Connect
+}
+pub fn retry_after(value: &str) -> Option<u64> {
+    if value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()) {
+        return None;
+    }
+    value.parse::<u64>().ok().map(|s| s.min(300))
+}
+pub type Socket = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;
+#[derive(Clone)]
+pub struct CollectorTransport {
+    pub endpoint: CollectorEndpoint,
+    pub trust: CollectorTrust,
+    tls: Option<Arc<rustls::ClientConfig>>,
+    pub root_warnings: usize,
+}
+impl CollectorTransport {
+    pub fn new(endpoint: CollectorEndpoint, trust: CollectorTrust) -> Result<Self> {
+        let (roots, warnings) = if !endpoint.secure() {
+            if trust != CollectorTrust::System {
+                bail!("a private CA requires HTTPS/WSS");
+            }
+            return Ok(Self {
+                endpoint,
+                trust,
+                tls: None,
+                root_warnings: 0,
+            });
+        } else {
+            match &trust {
+                CollectorTrust::CaBundle { pem } => (ca_roots(pem)?, 0),
+                CollectorTrust::System => {
+                    let native = rustls_native_certs::load_native_certs();
+                    let mut roots = rustls::RootCertStore::empty();
+                    let mut warnings = native.errors.len();
+                    for cert in native.certs {
+                        if roots.add(cert).is_err() {
+                            warnings += 1;
+                        }
+                    }
+                    if roots.is_empty() {
+                        bail!("native trust roots unavailable or empty; install intended roots, no bundled fallback");
+                    }
+                    (roots, warnings)
+                }
+            }
+        };
+        let tls = rustls::ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
+            .with_protocol_versions(&[&rustls::version::TLS13, &rustls::version::TLS12])?
+            .with_root_certificates(roots)
+            .with_no_client_auth();
+        Ok(Self {
+            endpoint,
+            trust,
+            tls: Some(Arc::new(tls)),
+            root_warnings: warnings,
+        })
+    }
+    pub async fn http(&self) -> Result<reqwest::Client> {
+        let addresses = self.endpoint.addresses().await?;
+        let mut builder = reqwest::Client::builder()
+            .no_proxy()
+            .redirect(reqwest::redirect::Policy::none())
+            .retry(reqwest::retry::never())
+            .timeout(Duration::from_secs(30))
+            .connect_timeout(TIMEOUT)
+            .resolve_to_addrs(self.endpoint.origin.host_str().expect("host"), &addresses);
+        if let Some(tls) = &self.tls {
+            builder = builder.use_preconfigured_tls((**tls).clone());
+        }
+        builder
+            .build()
+            .map_err(|_| anyhow::anyhow!("collector HTTP client configuration failed"))
+    }
+    pub async fn websocket(&self, config: WebSocketConfig) -> Result<(Socket, Vec<u8>)> {
+        tokio::time::timeout(TIMEOUT, self.open(config))
+            .await
+            .map_err(|_| failure(Stage::Connect))?
+    }
+    async fn open(&self, config: WebSocketConfig) -> Result<(Socket, Vec<u8>)> {
+        let addresses = self.endpoint.addresses().await?;
+        let mut socket = None;
+        for address in addresses {
+            if let Ok(stream) = tokio::net::TcpStream::connect(address).await {
+                socket = Some(stream);
+                break;
+            }
+        }
+        let socket = socket.ok_or_else(|| failure(Stage::Connect))?;
+        let connector = self.tls.clone().map(Connector::Rustls).unwrap_or(Connector::Plain);
+        let (ws, response) =
+            tokio_tungstenite::client_async_tls_with_config(self.endpoint.ws(), socket, Some(config), Some(connector))
+                .await
+                .map_err(|err| match &err {
+                    tungstenite::Error::Http(response) => failure(Stage::Upgrade {
+                        status: Some(response.status().as_u16()),
+                        retry_after: response
+                            .headers()
+                            .get("retry-after")
+                            .and_then(|v| v.to_str().ok())
+                            .and_then(retry_after),
+                    }),
+                    tungstenite::Error::Tls(_) => failure(Stage::Tls),
+                    tungstenite::Error::Io(e) if classify(e) == Stage::Tls => failure(Stage::Tls),
+                    _ => failure(Stage::Upgrade {
+                        status: None,
+                        retry_after: None,
+                    }),
+                })?;
+        let mut values = response.headers().get_all(hennery_proto::HELLO_NONCE_HEADER).iter();
+        let nonce = values
+            .next()
+            .and_then(|v| v.to_str().ok())
+            .and_then(|s| hex::decode(s).ok())
+            .filter(|n| n.len() == 32);
+        if values.next().is_some() || nonce.is_none() {
+            return Err(failure(Stage::MissingNonce));
+        }
+        Ok((ws, nonce.expect("checked nonce")))
+    }
+    pub async fn preflight(&self) -> Result<()> {
+        let (mut ws, _) = self.websocket(WebSocketConfig::default()).await?;
+        let _ = tokio::time::timeout(Duration::from_secs(2), ws.close(None)).await;
+        Ok(())
+    }
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    #[test]
+    fn url_differential_vectors_agree_with_the_wire_url() {
+        for input in [
+            "https://LOCALHOST:443",
+            "HTTPS://localhost/",
+            " https://localhost/ ",
+            "http://2130706433:80",
+            "http://[::1]:80",
+            "http://127.1",
+        ] {
+            let parsed = CollectorEndpoint::public(input).unwrap();
+            assert_eq!(CollectorEndpoint::stored(parsed.ws()).unwrap(), parsed);
+            let downstream = Url::parse(parsed.ws()).unwrap();
+            assert!(parsed.secure() || loopback(&downstream));
+        }
+        for input in [
+            "https://user@localhost",
+            "https://%75ser@localhost",
+            "http://localhost.example",
+            "http://localhost.",
+            "https://localhost:0",
+            "https://localhost/%2f",
+            "https://localhost/../secret",
+            "https://localhost/?",
+            "https://localhost/#",
+            "http://127.0.0.1@remote.example",
+            "ws://localhost",
+        ] {
+            assert!(CollectorEndpoint::public(input).is_err(), "{input}");
+        }
+    }
+    #[tokio::test]
+    async fn localhost_is_resolved_directly_and_plaintext_loads_no_roots() {
+        let transport = CollectorTransport::new(
+            CollectorEndpoint::public("http://localhost:7117").unwrap(),
+            CollectorTrust::System,
+        )
+        .unwrap();
+        assert!(
+            transport
+                .endpoint
+                .addresses()
+                .await
+                .unwrap()
+                .iter()
+                .all(|a| a.ip().is_loopback())
+        );
+        assert!(transport.tls.is_none());
+        assert!(CollectorTransport::new(transport.endpoint, CollectorTrust::CaBundle { pem: String::new() }).is_err());
+    }
+    #[test]
+    fn trust_deserialization_and_debug_never_silently_fall_back() {
+        for text in [
+            "mode='unknown'",
+            "mode='system'\nca_pem='secret'",
+            "mode='ca_bundle'",
+            "mode='system'\nextra=1",
+        ] {
+            assert!(toml::from_str::<CollectorTrust>(text).is_err());
+        }
+        for pem in [
+            "",
+            "junk",
+            "-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----",
+            "-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----",
+        ] {
+            assert!(ca_roots(pem).is_err());
+        }
+        assert!(!format!("{:?}", CollectorTrust::CaBundle { pem: "secret".into() }).contains("secret"));
+    }
+    #[test]
+    fn retry_after_is_bounded_and_does_not_reflect_arbitrary_input() {
+        assert_eq!(retry_after("2"), Some(2));
+        assert_eq!(retry_after("999"), Some(300));
+        for value in ["", "-1", " 2", "99999999999999999999999999", "secret"] {
+            assert_eq!(retry_after(value), None);
+        }
+    }
+}
diff --git a/crates/hennery-host/tests/transport.rs b/crates/hennery-host/tests/transport.rs
new file mode 100644
index 00000000..6595c5b7
--- /dev/null
+++ b/crates/hennery-host/tests/transport.rs
@@ -0,0 +1,163 @@
+use futures::{SinkExt, StreamExt};
+use hennery_host::transport::{CollectorEndpoint, CollectorTransport, CollectorTrust, Stage, TransportFailure};
+use rcgen::{BasicConstraints, CertificateParams, IsCa, KeyPair};
+use std::{
+    sync::{
+        Arc,
+        atomic::{AtomicUsize, Ordering},
+    },
+    time::Duration,
+};
+use tokio_tungstenite::tungstenite::{Message, protocol::WebSocketConfig};
+
+struct Fixture {
+    url: String,
+    pem: String,
+    seen: Arc<AtomicUsize>,
+    task: tokio::task::JoinHandle<()>,
+}
+impl Drop for Fixture {
+    fn drop(&mut self) {
+        self.task.abort();
+    }
+}
+async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
+    let key = KeyPair::generate().unwrap();
+    let mut ca = CertificateParams::new(vec!["fixture-ca".into()]).unwrap();
+    ca.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
+    let ca = ca.self_signed(&key).unwrap();
+    let mut signer_params = CertificateParams::new(vec!["fixture-ca".into()]).unwrap();
+    signer_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
+    let signer = rcgen::Issuer::from_params(&signer_params, key);
+    let leaf_key = KeyPair::generate().unwrap();
+    let leaf = CertificateParams::new(names)
+        .unwrap()
+        .signed_by(&leaf_key, &signer)
+        .unwrap();
+    let tls = rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
+        .with_safe_default_protocol_versions()
+        .unwrap()
+        .with_no_client_auth()
+        .with_single_cert(
+            vec![leaf.der().clone()],
+            rustls::pki_types::PrivatePkcs8KeyDer::from(leaf_key.serialize_der()).into(),
+        )
+        .unwrap();
+    let acceptor = tokio_rustls::TlsAcceptor::from(Arc::new(tls));
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let url = format!("https://localhost:{}", listener.local_addr().unwrap().port());
+    let seen = Arc::new(AtomicUsize::new(0));
+    let capture = seen.clone();
+    let task = tokio::spawn(async move {
+        while let Ok((stream, _)) = listener.accept().await {
+            let acceptor = acceptor.clone();
+            let capture = capture.clone();
+            tokio::spawn(async move {
+                if let Ok(tls) = acceptor.accept(stream).await {
+                    let ws = tokio_tungstenite::accept_hdr_async(tls, NonceCallback { capture, nonce }).await;
+                    if let Ok(mut ws) = ws {
+                        while let Some(Ok(msg)) = ws.next().await {
+                            if msg.is_close() {
+                                break;
+                            }
+                            ws.send(Message::Text("{}".into())).await.ok();
+                        }
+                    }
+                }
+            });
+        }
+    });
+    Fixture {
+        url,
+        pem: ca.pem(),
+        seen,
+        task,
+    }
+}
+#[tokio::test]
+async fn private_ca_wss_and_https_share_the_same_verifier() {
+    let f = fixture(
+        vec!["localhost".into()],
+        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
+    )
+    .await;
+    let transport = CollectorTransport::new(
+        CollectorEndpoint::public(&f.url).unwrap(),
+        CollectorTrust::CaBundle { pem: f.pem.clone() },
+    )
+    .unwrap();
+    let (mut ws, nonce) = transport.websocket(WebSocketConfig::default()).await.unwrap();
+    assert_eq!(nonce, vec![0xaa; 32]);
+    ws.close(None).await.unwrap();
+    // The fixture speaks WS only: a normal HTTP request still reaches the
+    // same verified TLS listener, then fails at HTTP rather than TLS.
+    let error = transport
+        .http()
+        .await
+        .unwrap()
+        .get(format!("{}/healthz", f.url))
+        .timeout(Duration::from_secs(2))
+        .send()
+        .await
+        .unwrap_err();
+    assert_ne!(hennery_host::transport::classify(&error), Stage::Tls);
+    assert_eq!(f.seen.load(Ordering::SeqCst), 1);
+}
+#[tokio::test]
+async fn failed_name_verification_sends_no_websocket_or_http_request() {
+    let f = fixture(
+        vec!["wrong.example".into()],
+        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
+    )
+    .await;
+    let transport = CollectorTransport::new(
+        CollectorEndpoint::public(&f.url).unwrap(),
+        CollectorTrust::CaBundle { pem: f.pem.clone() },
+    )
+    .unwrap();
+    let err = transport.websocket(WebSocketConfig::default()).await.err().unwrap();
+    assert_eq!(err.downcast_ref::<TransportFailure>().unwrap().0, Stage::Tls);
+    let err = transport
+        .http()
+        .await
+        .unwrap()
+        .post(format!("{}/api/hosts/enroll", f.url))
+        .body("secret")
+        .send()
+        .await
+        .unwrap_err();
+    assert_eq!(hennery_host::transport::classify(&err), Stage::Tls);
+    assert_eq!(f.seen.load(Ordering::SeqCst), 0);
+}
+#[tokio::test]
+async fn invalid_nonce_is_refused_before_any_hello() {
+    let f = fixture(vec!["localhost".into()], "bad-nonce").await;
+    let transport = CollectorTransport::new(
+        CollectorEndpoint::public(&f.url).unwrap(),
+        CollectorTrust::CaBundle { pem: f.pem.clone() },
+    )
+    .unwrap();
+    let err = transport.websocket(WebSocketConfig::default()).await.err().unwrap();
+    assert_eq!(err.downcast_ref::<TransportFailure>().unwrap().0, Stage::MissingNonce);
+}
+
+struct NonceCallback {
+    capture: Arc<AtomicUsize>,
+    nonce: &'static str,
+}
+impl tokio_tungstenite::tungstenite::handshake::server::Callback for NonceCallback {
+    fn on_request(
+        self,
+        _: &tokio_tungstenite::tungstenite::handshake::server::Request,
+        mut response: tokio_tungstenite::tungstenite::handshake::server::Response,
+    ) -> Result<
+        tokio_tungstenite::tungstenite::handshake::server::Response,
+        tokio_tungstenite::tungstenite::handshake::server::ErrorResponse,
+    > {
+        self.capture.fetch_add(1, Ordering::SeqCst);
+        response
+            .headers_mut()
+            .insert(hennery_proto::HELLO_NONCE_HEADER, self.nonce.parse().unwrap());
+        Ok(response)
+    }
+}
```


## Task 2 — Durable enrollment state

**Step 1:** inspect the preceding base and apply the test patch; observe its recorded RED. **Step 2:** apply the implementation patch and verify the targeted behavior. **Step 3:** review the diff against the constraints before pushing. Independent review is requested from the parent after this built plan.

Run: `nix develop -c cargo test -p hennery-host --lib --locked enrollment::`. Expected after implementation: exit 0; the execution table records integrated counts.

### 522a5b72 test(pairing): block abandoned pending enrollment keys

<!-- replay-commit: 522a5b720ef9a30b63c50dc77b8e071823cfab16 tree: 24a985a72d54b4d678b8e6d8c40a3ae84bc197ee -->

```diff
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 8cf29128..267d503e 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -310,0 +311,11 @@ mod tests {
+    #[test]
+    fn a_lone_pending_key_blocks_every_pairing_load_without_overwriting_it() {
+        let dir = tempfile::tempdir().unwrap();
+        let pending = pending_path(dir.path(), KEY_FILE);
+        HostKey::from_seed([19; 32]).save(&pending).unwrap();
+        let before = std::fs::read(&pending).unwrap();
+        assert!(Paired::read(dir.path()).is_err());
+        assert!(Paired::load(dir.path()).is_err());
+        assert_eq!(std::fs::read(&pending).unwrap(), before);
+    }
+
@@ -359,0 +371,31 @@ cdf6b48fb39bfaa9b5a3cd01538280ec9e6d50c8831e9aae4d791f68112a6c04";
+    #[test]
+    fn every_data_directory_ancestor_is_durable_including_after_a_failed_creation() {
+        let root = tempfile::tempdir().unwrap();
+        let ancestor = root.path().join("new-parent");
+        let data = ancestor.join("host");
+        for boundary in [&ancestor, &data] {
+            storage_hooks::fail_once(boundary.clone(), "directory_sync");
+            let error = create_private_dir(&data).unwrap_err();
+            assert!(error.to_string().contains("injected storage failure"), "{error}");
+            assert!(!data.join("host.key.pending").exists());
+            // Existing ancestors from a failed attempt must be synced again.
+            storage_hooks::fail_once(boundary.clone(), "directory_sync");
+            assert!(create_private_dir(&data).is_err());
+        }
+        create_private_dir(&data).unwrap();
+    }
+
+    #[test]
+    fn data_directory_metadata_requires_the_current_owner() {
+        let dir = tempfile::tempdir().unwrap();
+        let metadata = std::fs::metadata(dir.path()).unwrap();
+        validate_data_directory(&metadata, metadata.uid()).unwrap();
+        assert!(validate_data_directory(&metadata, metadata.uid().wrapping_add(1)).is_err());
+        let alias = dir.path().join("alias");
+        std::os::unix::fs::symlink(dir.path(), &alias).unwrap();
+        assert!(
+            create_private_dir(&alias).is_err(),
+            "a symlink destination must be refused"
+        );
+    }
+
```

### 391e058a feat(pairing): persist enrollment uncertainty and recover confirmed receipts

<!-- replay-commit: 391e058a57427dd1b0d1135fa75f586b7cb85fb0 tree: 3ed3bedd7915704091dc837963d8414fb444f551 -->

```diff
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
new file mode 100644
index 00000000..7704b4be
--- /dev/null
+++ b/crates/hennery-host/src/enrollment.rs
@@ -0,0 +1,326 @@
+//! Conservative, durable enrollment intent. No pairing code is persisted.
+use crate::{
+    identity::{CONFIG_FILE, HostKey, KEY_FILE, fsync_parent, write_private},
+    transport::{CollectorEndpoint, CollectorTrust},
+};
+use anyhow::{Result, bail};
+use serde::{Deserialize, Serialize};
+use std::path::Path;
+
+pub const JOURNAL: &str = "enrollment.pending.toml";
+pub const RECOVERY: &str = "enrollment.recovery.toml";
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+pub struct EnrollmentAttempt {
+    pub version: u32,
+    pub attempt_id: String,
+    pub phase: Phase,
+    pub collector_origin: String,
+    pub trust: CollectorTrust,
+    pub public_key: String,
+    pub prior_host_id: Option<String>,
+}
+#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
+pub enum Phase {
+    MayHaveCommitted,
+}
+#[derive(Debug, Clone, PartialEq, Eq)]
+pub enum EnrollmentState {
+    Clear,
+    Uncertain(EnrollmentAttempt),
+    Confirmed(EnrollmentAttempt),
+}
+impl EnrollmentAttempt {
+    pub fn new(
+        endpoint: &CollectorEndpoint,
+        trust: CollectorTrust,
+        key: &HostKey,
+        prior_host_id: Option<String>,
+    ) -> Self {
+        Self {
+            version: 1,
+            attempt_id: uuid::Uuid::now_v7().to_string(),
+            phase: Phase::MayHaveCommitted,
+            collector_origin: endpoint.origin().to_string(),
+            trust,
+            public_key: key.public_key_hex(),
+            prior_host_id,
+        }
+    }
+    pub fn save(&self, dir: &Path) -> Result<()> {
+        if dir.join(JOURNAL).try_exists()? {
+            bail!("an enrollment attempt already exists; do not overwrite it");
+        }
+        write_private(&dir.join(JOURNAL), toml::to_string(self)?.as_bytes())
+    }
+    pub fn diagnostic(&self) -> String {
+        format!(
+            "uncertain enrollment attempt {} at {}; no new enrollment is permitted. Check the collector Hosts list, revoke any entry created by this attempt, then explicitly archive it with `hennery host enrollment archive {}`",
+            self.attempt_id, self.collector_origin, self.attempt_id
+        )
+    }
+}
+fn read_attempt(path: &Path) -> Result<EnrollmentAttempt> {
+    let text = crate::identity::read_regular(path, 512 * 1024)?;
+    let attempt: EnrollmentAttempt = toml::from_str(&text)
+        .map_err(|_| anyhow::anyhow!("malformed enrollment journal; preserve artifacts for explicit recovery"))?;
+    if attempt.version != 1
+        || uuid::Uuid::parse_str(&attempt.attempt_id).is_err()
+        || attempt.public_key.len() != 64
+        || !attempt
+            .public_key
+            .bytes()
+            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
+    {
+        bail!("invalid enrollment journal; preserve artifacts for explicit recovery");
+    }
+    let endpoint = CollectorEndpoint::public(&attempt.collector_origin)?;
+    if endpoint.origin().as_str() != attempt.collector_origin {
+        bail!("noncanonical enrollment destination");
+    }
+    if !endpoint.secure() && attempt.trust != CollectorTrust::System {
+        bail!("plaintext enrollment journal contains TLS trust");
+    }
+    Ok(attempt)
+}
+fn receipt_matches(path: &Path, attempt: &EnrollmentAttempt) -> Result<bool> {
+    let text = crate::identity::read_regular(path, 512 * 1024)?;
+    let table: toml::Table = toml::from_str(&text).map_err(|_| anyhow::anyhow!("invalid enrollment receipt"))?;
+    let Some(url) = table.get("collector").and_then(|v| v.as_str()) else {
+        return Ok(false);
+    };
+    let endpoint = CollectorEndpoint::stored(url)?;
+    let trust: CollectorTrust = table
+        .get("collector_tls")
+        .cloned()
+        .map(|v| v.try_into())
+        .transpose()
+        .map_err(|_| anyhow::anyhow!("invalid receipt TLS policy"))?
+        .unwrap_or_default();
+    Ok(
+        table.get("public_key").and_then(|v| v.as_str()) == Some(attempt.public_key.as_str())
+            && table
+                .get("host_id")
+                .and_then(|v| v.as_str())
+                .is_some_and(crate::pairing::is_valid_host_id)
+            && endpoint.origin().as_str() == attempt.collector_origin
+            && trust == attempt.trust,
+    )
+}
+pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
+    if dir.join(RECOVERY).try_exists()? {
+        bail!(
+            "interrupted enrollment archive recovery; repeat the explicit archive action for its attempt id; automatic enrollment is blocked"
+        );
+    }
+    let journal = dir.join(JOURNAL);
+    let pending = dir.join(format!("{KEY_FILE}.pending"));
+    let receipt = dir.join(format!("{CONFIG_FILE}.pending"));
+    if !journal.try_exists()? {
+        if pending.try_exists()? && !receipt.try_exists()? {
+            bail!("lone pending enrollment key; preserve it for explicit recovery, never generate or overwrite a key");
+        }
+        return Ok(EnrollmentState::Clear);
+    }
+    let attempt = read_attempt(&journal)?;
+    let key = if pending.try_exists()? {
+        pending
+    } else {
+        dir.join(KEY_FILE)
+    };
+    if !key.try_exists()? || HostKey::load(&key)?.public_key_hex() != attempt.public_key {
+        bail!("enrollment journal has no matching key; preserve artifacts for explicit recovery");
+    }
+    if receipt.try_exists()? {
+        if !receipt_matches(&receipt, &attempt)? {
+            bail!("enrollment journal and staged receipt disagree; preserve both");
+        }
+        return Ok(EnrollmentState::Confirmed(attempt));
+    }
+    if dir.join(CONFIG_FILE).try_exists()? && receipt_matches(&dir.join(CONFIG_FILE), &attempt)? {
+        return Ok(EnrollmentState::Confirmed(attempt));
+    }
+    Ok(EnrollmentState::Uncertain(attempt))
+}
+pub fn require_resolved(dir: &Path) -> Result<()> {
+    match inspect(dir)? {
+        EnrollmentState::Uncertain(attempt) => bail!("{}", attempt.diagnostic()),
+        _ => Ok(()),
+    }
+}
+pub(crate) fn clear_confirmed(dir: &Path) -> Result<()> {
+    match inspect(dir)? {
+        EnrollmentState::Confirmed(attempt) if receipt_matches(&dir.join(CONFIG_FILE), &attempt)? => {
+            std::fs::File::open(dir.join(KEY_FILE))?.sync_all()?;
+            std::fs::File::open(dir.join(CONFIG_FILE))?.sync_all()?;
+            fsync_parent(&dir.join(CONFIG_FILE))?;
+            std::fs::remove_file(dir.join(JOURNAL))?;
+            fsync_parent(&dir.join(JOURNAL))?;
+            Ok(())
+        }
+        EnrollmentState::Clear => Ok(()),
+        _ => bail!("enrollment is not durably installed; journal retained"),
+    }
+}
+/// Caller holds host.lock and has explicitly checked/revoked the possible
+/// remote enrollment. Local state never claims that remote revocation happened.
+pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
+    let marker = dir.join(RECOVERY);
+    let attempt = if marker.try_exists()? {
+        read_attempt(&marker)?
+    } else {
+        match inspect(dir)? {
+            EnrollmentState::Uncertain(attempt) => attempt,
+            _ => bail!("only an uncertain attempt may be archived; confirmed receipts must roll forward"),
+        }
+    };
+    if attempt.attempt_id != attempt_id {
+        bail!("archive attempt id does not match; nothing changed");
+    }
+    let archive = dir.join(format!("enrollment-archive-{attempt_id}"));
+    crate::identity::create_private_dir(&archive)?;
+    // Copies are durable before the active marker can be cleared. Repeating
+    // after any interrupted boundary uses these same immutable artifacts.
+    for name in [JOURNAL, "host.key.pending"] {
+        let from = dir.join(name);
+        let to = archive.join(name);
+        if from.try_exists()? {
+            let bytes = std::fs::read(&from)?;
+            if to.try_exists()? && std::fs::read(&to)? != bytes {
+                bail!("archive artifact mismatch; preserve both copies");
+            }
+            write_private(&to, &bytes)?;
+        } else if !to.try_exists()? {
+            bail!("missing archive artifact; automatic enrollment remains blocked");
+        }
+    }
+    fsync_parent(&archive)?;
+    if !marker.try_exists()? {
+        write_private(&marker, toml::to_string(&attempt)?.as_bytes())?;
+    }
+    for name in ["host.key.pending", JOURNAL] {
+        let from = dir.join(name);
+        if from.try_exists()? {
+            std::fs::remove_file(&from)?;
+            fsync_parent(&from)?;
+        }
+    }
+    std::fs::remove_file(&marker)?;
+    fsync_parent(&marker)
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    fn attempt(dir: &Path) -> EnrollmentAttempt {
+        let key = HostKey::from_seed([29; 32]);
+        key.save(&dir.join("host.key.pending")).unwrap();
+        let attempt = EnrollmentAttempt::new(
+            &CollectorEndpoint::public("https://c.example").unwrap(),
+            CollectorTrust::System,
+            &key,
+            None,
+        );
+        attempt.save(dir).unwrap();
+        attempt
+    }
+    #[test]
+    fn uncertainty_survives_restarts_and_contains_no_code() {
+        let dir = tempfile::tempdir().unwrap();
+        let a = attempt(dir.path());
+        let bytes = std::fs::read(dir.path().join("host.key.pending")).unwrap();
+        for _ in 0..3 {
+            assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Uncertain(a.clone()));
+            assert!(crate::identity::Paired::load(dir.path()).is_err());
+            assert!(crate::identity::Paired::read(dir.path()).is_err());
+        }
+        assert_eq!(std::fs::read(dir.path().join("host.key.pending")).unwrap(), bytes);
+        assert!(a.save(dir.path()).is_err());
+        assert!(
+            !std::fs::read_to_string(dir.path().join(JOURNAL))
+                .unwrap()
+                .contains("code")
+        );
+    }
+    #[test]
+    fn missing_mismatched_and_malformed_artifacts_block() {
+        for kind in ["missing", "mismatch", "malformed", "receipt"] {
+            let dir = tempfile::tempdir().unwrap();
+            attempt(dir.path());
+            match kind {
+                "missing" => std::fs::remove_file(dir.path().join("host.key.pending")).unwrap(),
+                "mismatch" => HostKey::from_seed([30; 32])
+                    .save(&dir.path().join("host.key.pending"))
+                    .unwrap(),
+                "malformed" => std::fs::write(dir.path().join(JOURNAL), "not toml secret").unwrap(),
+                _ => std::fs::write(
+                    dir.path().join("host.toml.pending"),
+                    "collector='wss://other.example/api/hosts/ws'\nhost_id='host-0123456789abcdef'\npublic_key='wrong'",
+                )
+                .unwrap(),
+            }
+            assert!(inspect(dir.path()).is_err(), "{kind}");
+            assert!(crate::identity::Paired::load(dir.path()).is_err(), "{kind}");
+        }
+    }
+    #[test]
+    fn confirmed_receipt_rolls_forward_and_clears_the_journal_without_post() {
+        let dir = tempfile::tempdir().unwrap();
+        let a = attempt(dir.path());
+        let key = HostKey::load(&dir.path().join("host.key.pending")).unwrap();
+        crate::identity::write_config_to(
+            &dir.path().join("host.toml.pending"),
+            "wss://c.example/api/hosts/ws",
+            "host-0123456789abcdef",
+            &key,
+        )
+        .unwrap();
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(a.clone()));
+        assert!(crate::identity::Paired::read(dir.path()).is_err());
+        let loaded = crate::identity::Paired::load(dir.path()).unwrap().unwrap();
+        assert_eq!(loaded.key.public_key_hex(), a.public_key);
+        assert!(!dir.path().join(JOURNAL).exists());
+        a.save(dir.path()).unwrap();
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(a));
+        crate::identity::Paired::load(dir.path()).unwrap();
+        assert!(!dir.path().join(JOURNAL).exists());
+    }
+    #[test]
+    fn explicit_archive_is_id_bound_and_preserves_the_artifacts() {
+        let dir = tempfile::tempdir().unwrap();
+        let a = attempt(dir.path());
+        let before = std::fs::read(dir.path().join("host.key.pending")).unwrap();
+        assert!(archive(dir.path(), "another-attempt").is_err());
+        assert!(dir.path().join(JOURNAL).exists());
+        archive(dir.path(), &a.attempt_id).unwrap();
+        let saved = dir.path().join(format!("enrollment-archive-{}", a.attempt_id));
+        assert_eq!(std::fs::read(saved.join("host.key.pending")).unwrap(), before);
+        assert!(saved.join(JOURNAL).exists());
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
+    }
+    #[test]
+    fn interrupted_archive_remains_blocking_and_resumes_explicitly() {
+        let dir = tempfile::tempdir().unwrap();
+        let a = attempt(dir.path());
+        crate::identity::storage_hooks::fail_once(dir.path().join(RECOVERY), "directory_sync");
+        assert!(archive(dir.path(), &a.attempt_id).is_err());
+        assert!(inspect(dir.path()).is_err());
+        assert!(crate::identity::Paired::load(dir.path()).is_err());
+        archive(dir.path(), &a.attempt_id).unwrap();
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
+    }
+    #[test]
+    fn atomic_write_reports_visibility_separately_from_crash_durability() {
+        let dir = tempfile::tempdir().unwrap();
+        let path = dir.path().join("settings");
+        write_private(&path, b"old").unwrap();
+        crate::identity::storage_hooks::fail_once(path.clone(), "before_rename");
+        assert!(write_private(&path, b"new").is_err());
+        assert_eq!(std::fs::read(&path).unwrap(), b"old");
+        crate::identity::storage_hooks::fail_once(path.clone(), "directory_sync");
+        let error = write_private(&path, b"new").unwrap_err();
+        assert!(error.downcast_ref::<crate::identity::DurabilityUncertain>().is_some());
+        assert_eq!(std::fs::read(&path).unwrap(), b"new");
+        write_private(&path, b"new").unwrap();
+    }
+}
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 267d503e..25926998 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -6,0 +7 @@
+use crate::transport::{CollectorEndpoint, CollectorTrust};
@@ -16,0 +18,46 @@ pub const CONFIG_FILE: &str = "host.toml";
+#[derive(Debug)]
+pub struct DurabilityUncertain {
+    pub path: PathBuf,
+}
+impl std::fmt::Display for DurabilityUncertain {
+    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+        write!(
+            f,
+            "DurabilityUncertain: {} changed visibly but directory fsync failed; inspect the saved endpoint and repeat the explicit save once storage is healthy; no rollback was attempted",
+            self.path.display()
+        )
+    }
+}
+impl std::error::Error for DurabilityUncertain {}
+
+#[cfg(any(test, feature = "test-hooks"))]
+pub mod storage_hooks {
+    use std::{
+        path::PathBuf,
+        sync::{Mutex, OnceLock},
+    };
+    static FAIL: OnceLock<Mutex<Vec<(PathBuf, &'static str)>>> = OnceLock::new();
+    pub fn fail_once(path: PathBuf, stage: &'static str) {
+        FAIL.get_or_init(Default::default).lock().unwrap().push((path, stage));
+    }
+    pub(super) fn check(path: &std::path::Path, stage: &'static str) -> anyhow::Result<()> {
+        let mut failures = FAIL.get_or_init(Default::default).lock().unwrap();
+        if let Some(index) = failures.iter().position(|(p, s)| p == path && *s == stage) {
+            failures.remove(index);
+            anyhow::bail!("injected storage failure at {stage}");
+        }
+        Ok(())
+    }
+}
+pub(crate) fn storage_boundary(path: &Path, stage: &'static str) -> Result<()> {
+    #[cfg(any(test, feature = "test-hooks"))]
+    storage_hooks::check(path, stage)?;
+    let _ = (path, stage);
+    Ok(())
+}
+pub(crate) fn durable_rename(from: &Path, to: &Path) -> Result<()> {
+    storage_boundary(to, "before_rename")?;
+    std::fs::rename(from, to)?;
+    fsync_parent(to).map_err(|_| DurabilityUncertain { path: to.to_path_buf() }.into())
+}
+
@@ -61 +108 @@ impl HostKey {
-        let text = std::fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
+        let text = read_regular(path, 256)?;
@@ -81,0 +129,2 @@ struct HostToml {
+    #[serde(default)]
+    collector_tls: CollectorTrust,
@@ -96,0 +146 @@ pub struct Paired {
+    pub trust: CollectorTrust,
@@ -106,0 +157 @@ impl Paired {
+        crate::enrollment::require_resolved(data_dir)?;
@@ -107,0 +159 @@ impl Paired {
+        crate::enrollment::clear_confirmed(data_dir)?;
@@ -114,0 +167,7 @@ impl Paired {
+        match crate::enrollment::inspect(data_dir)? {
+            crate::enrollment::EnrollmentState::Uncertain(attempt) => bail!("{}", attempt.diagnostic()),
+            crate::enrollment::EnrollmentState::Confirmed(_) => {
+                bail!("confirmed enrollment needs durable roll-forward; run `hennery host run` under host.lock")
+            }
+            crate::enrollment::EnrollmentState::Clear => {}
+        }
@@ -147,0 +207 @@ impl Paired {
+            trust: config.collector_tls,
@@ -160,0 +221,4 @@ impl Paired {
+            table.insert(
+                "collector_tls".into(),
+                toml::Value::try_from(&self.trust).expect("TLS policy serializes"),
+            );
@@ -172,2 +236,25 @@ fn read_config(path: &Path) -> Result<HostToml> {
-    let text = std::fs::read_to_string(path).with_context(|| format!("read {}", path.display()))?;
-    toml::from_str(&text).with_context(|| format!("parse {}", path.display()))
+    let text = read_regular(path, 512 * 1024)?;
+    let config: HostToml =
+        toml::from_str(&text).map_err(|_| anyhow::anyhow!("invalid host configuration or collector TLS policy"))?;
+    CollectorEndpoint::stored(&config.collector)?;
+    Ok(config)
+}
+
+pub(crate) fn read_regular(path: &Path, bound: usize) -> Result<String> {
+    use std::io::Read;
+    let mut file = std::fs::OpenOptions::new()
+        .read(true)
+        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
+        .open(path)?;
+    let meta = file.metadata()?;
+    if !meta.is_file() || meta.permissions().mode() & 0o022 != 0 {
+        bail!("transport configuration must be a regular file, not writable by group or others");
+    }
+    let mut text = String::new();
+    std::io::Read::by_ref(&mut file)
+        .take((bound + 1) as u64)
+        .read_to_string(&mut text)?;
+    if text.len() > bound {
+        bail!("transport configuration exceeds its size bound");
+    }
+    Ok(text)
@@ -244,3 +331 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-        std::fs::rename(&key_pending, &key_path)
-            .with_context(|| format!("rename {} to {}", key_pending.display(), key_path.display()))?;
-        fsync_parent(&key_path)?;
+        durable_rename(&key_pending, &key_path)?;
@@ -250,3 +335 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-    std::fs::rename(&config_pending, &config_path)
-        .with_context(|| format!("rename {} to {}", config_pending.display(), config_path.display()))?;
-    fsync_parent(&config_path)?;
+    durable_rename(&config_pending, &config_path)?;
@@ -258 +341,2 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-/// and the outbox. An existing directory is left as it is.
+/// and the outbox. Validate its owner/permissions and durably link every
+/// ancestor, including existing entries left by a failed earlier attempt.
@@ -264 +348,24 @@ pub fn create_private_dir(dir: &Path) -> Result<()> {
-        .with_context(|| format!("create {}", dir.display()))
+        .with_context(|| format!("create {}", dir.display()))?;
+    let directory = std::fs::OpenOptions::new()
+        .read(true)
+        .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_NONBLOCK)
+        .open(dir)
+        .with_context(|| format!("open data directory {}", dir.display()))?;
+    // SAFETY: geteuid has no arguments or memory preconditions.
+    validate_data_directory(&directory.metadata()?, unsafe { libc::geteuid() })?;
+    // A durable journal is insufficient if a newly created ancestor can
+    // disappear. Sync every link before enrollment, including pre-existing
+    // links left by an earlier failed attempt. Resolve relative paths so
+    // their parents are included too; root itself has no parent entry.
+    let absolute = std::env::current_dir()?.join(dir);
+    for entry in absolute.ancestors().filter(|entry| entry.parent().is_some()) {
+        fsync_parent(entry)?;
+    }
+    Ok(())
+}
+
+fn validate_data_directory(metadata: &std::fs::Metadata, owner: libc::uid_t) -> Result<()> {
+    if metadata.uid() != owner || metadata.permissions().mode() & 0o022 != 0 {
+        bail!("host data directory must be owned by the current user and not writable by group or others");
+    }
+    Ok(())
@@ -290,0 +398 @@ pub(crate) fn write_private(path: &Path, contents: &[u8]) -> Result<()> {
+    storage_boundary(path, "before_write")?;
@@ -291,0 +400 @@ pub(crate) fn write_private(path: &Path, contents: &[u8]) -> Result<()> {
+    storage_boundary(path, "before_file_sync")?;
@@ -293,2 +402 @@ pub(crate) fn write_private(path: &Path, contents: &[u8]) -> Result<()> {
-    std::fs::rename(&tmp, path).with_context(|| format!("rename {} to {}", tmp.display(), path.display()))?;
-    fsync_parent(path)
+    durable_rename(&tmp, path)
@@ -301,0 +410 @@ pub(crate) fn fsync_parent(path: &Path) -> Result<()> {
+    storage_boundary(path, "directory_sync")?;
@@ -337,0 +447 @@ cdf6b48fb39bfaa9b5a3cd01538280ec9e6d50c8831e9aae4d791f68112a6c04";
+            trust: Default::default(),
@@ -411,0 +522 @@ cdf6b48fb39bfaa9b5a3cd01538280ec9e6d50c8831e9aae4d791f68112a6c04";
+                trust: Default::default(),
@@ -457,0 +569 @@ cdf6b48fb39bfaa9b5a3cd01538280ec9e6d50c8831e9aae4d791f68112a6c04";
+            trust: Default::default(),
diff --git a/crates/hennery-host/src/lib.rs b/crates/hennery-host/src/lib.rs
index bceb0022..4d0eec92 100644
--- a/crates/hennery-host/src/lib.rs
+++ b/crates/hennery-host/src/lib.rs
@@ -6,0 +7 @@ pub mod connection;
+pub mod enrollment;
diff --git a/crates/hennery-host/src/pairing.rs b/crates/hennery-host/src/pairing.rs
index b00a4c58..56e96bb4 100644
--- a/crates/hennery-host/src/pairing.rs
+++ b/crates/hennery-host/src/pairing.rs
@@ -260 +260 @@ async fn enroll(base: &Url, code: &str, key: &HostKey, name: &str) -> Result<Str
-fn is_valid_host_id(id: &str) -> bool {
+pub(crate) fn is_valid_host_id(id: &str) -> bool {
diff --git a/crates/hennery/src/doctor/tests.rs b/crates/hennery/src/doctor/tests.rs
index b791b4e5..3f12537b 100644
--- a/crates/hennery/src/doctor/tests.rs
+++ b/crates/hennery/src/doctor/tests.rs
@@ -186,0 +187 @@ fn paired(dir: &Path) -> PathBuf {
+        trust: Default::default(),
@@ -2699,0 +2701 @@ fn check_10_reports_a_revoked_host_from_its_record() {
+            trust: Default::default(),
@@ -2745,0 +2748 @@ fn check_10_reports_a_revoke_without_the_service_manager() {
+        trust: Default::default(),
diff --git a/crates/hennery/src/revoked.rs b/crates/hennery/src/revoked.rs
index e8d26983..efc886ff 100644
--- a/crates/hennery/src/revoked.rs
+++ b/crates/hennery/src/revoked.rs
@@ -125,0 +126 @@ mod tests {
+            trust: Default::default(),
diff --git a/crates/hennery/src/service/tests.rs b/crates/hennery/src/service/tests.rs
index f35bc072..2a17f1af 100644
--- a/crates/hennery/src/service/tests.rs
+++ b/crates/hennery/src/service/tests.rs
@@ -94,0 +95 @@ fn paired(dir: &Path) -> PathBuf {
+        trust: Default::default(),
diff --git a/crates/hennery/tests/cli.rs b/crates/hennery/tests/cli.rs
index 3c91d666..98cb674b 100644
--- a/crates/hennery/tests/cli.rs
+++ b/crates/hennery/tests/cli.rs
@@ -3639,0 +3640 @@ fn paired_host(dir: &std::path::Path) {
+        trust: Default::default(),
diff --git a/crates/hennery/tests/doctor.rs b/crates/hennery/tests/doctor.rs
index 591a59ab..95cd488d 100644
--- a/crates/hennery/tests/doctor.rs
+++ b/crates/hennery/tests/doctor.rs
@@ -50,0 +51 @@ fn doctor_reports_on_a_host_directory_and_changes_nothing() {
+        trust: Default::default(),
@@ -115,0 +117 @@ fn an_interrupted_doctor_leaves_no_adapter_running() {
+        trust: Default::default(),
```


## Task 3 — Enrollment, migration and CLI

**Step 1:** inspect the preceding base and apply the test patch; observe its recorded RED. **Step 2:** apply the implementation patch and verify the targeted behavior. **Step 3:** review the diff against the constraints before pushing. Independent review is requested from the parent after this built plan.

Run: `nix develop -c cargo test -p hennery-testkit --test join --locked`. Expected after implementation: exit 0; the execution table records integrated counts.

### 290d278a test(pairing): retain ambiguous enrollment outcomes across restarts

<!-- replay-commit: 290d278a45e00d503beb04a0945353bdcf807fd5 tree: d4208a8fd982db9bf24130a6ad6b3d3f1361ab7a -->

```diff
diff --git a/crates/hennery-testkit/tests/join.rs b/crates/hennery-testkit/tests/join.rs
index b7847369..7724af2b 100644
--- a/crates/hennery-testkit/tests/join.rs
+++ b/crates/hennery-testkit/tests/join.rs
@@ -51,0 +52,85 @@ impl Collector {
+#[tokio::test]
+async fn unsafe_empty_destinations_are_rejected_before_any_key_or_enrollment_post() {
+    use axum::{
+        Router,
+        response::IntoResponse,
+        routing::{get, post},
+    };
+    use std::{
+        os::unix::fs::PermissionsExt,
+        sync::{
+            Arc,
+            atomic::{AtomicUsize, Ordering},
+        },
+    };
+    let posts = Arc::new(AtomicUsize::new(0));
+    let seen = posts.clone();
+    let router = Router::new()
+        .route(
+            "/api/hosts/ws",
+            get(|upgrade: axum::extract::ws::WebSocketUpgrade| async {
+                let mut response = upgrade
+                    .on_upgrade(|mut ws| async move {
+                        let _ = ws.recv().await;
+                    })
+                    .into_response();
+                response.headers_mut().insert(
+                    hennery_proto::HELLO_NONCE_HEADER,
+                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
+                        .parse()
+                        .unwrap(),
+                );
+                response
+            }),
+        )
+        .route(
+            "/api/hosts/enroll",
+            post(move || {
+                let seen = seen.clone();
+                async move {
+                    seen.fetch_add(1, Ordering::SeqCst);
+                    (axum::http::StatusCode::BAD_GATEWAY, "ambiguous")
+                }
+            }),
+        );
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let url = format!("http://{}", listener.local_addr().unwrap());
+    let server = tokio::spawn(async move {
+        axum::serve(listener, router).await.unwrap();
+    });
+    for mode in [0o720, 0o702, 0o777] {
+        let dir = tempfile::tempdir().unwrap();
+        std::fs::set_permissions(dir.path(), std::fs::Permissions::from_mode(mode)).unwrap();
+        let result = join(&url, "ABCD-EFGH", dir.path(), "fixture").await;
+        std::fs::set_permissions(dir.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
+        assert!(result.is_err(), "unsafe mode {mode:o}");
+        assert_eq!(posts.load(Ordering::SeqCst), 0, "unsafe mode {mode:o} spent a code");
+        for file in ["host.key.pending", "host.key", hennery_host::enrollment::JOURNAL] {
+            assert!(!dir.path().join(file).exists(), "unsafe mode {mode:o} staged {file}");
+        }
+    }
+    server.abort();
+}
+
+#[tokio::test]
+async fn data_directory_sync_failures_stop_before_any_enrollment_and_retry_safely() {
+    use hennery_host::identity::storage_hooks;
+    let collector = Collector::start().await;
+    for component in ["parent", "host"] {
+        let root = tempfile::tempdir().unwrap();
+        let parent = root.path().join("parent");
+        let host = parent.join("host");
+        let boundary = if component == "parent" { &parent } else { &host };
+        storage_hooks::fail_once(boundary.clone(), "directory_sync");
+        let code = collector.mint().await;
+        assert!(join(&collector.public_url(), &code, &host, "fixture").await.is_err());
+        assert!(collector.state.hosts.list().unwrap().is_empty());
+        assert!(!host.join("host.key.pending").exists());
+        assert!(!host.join(hennery_host::enrollment::JOURNAL).exists());
+        // Fail the existing directory's parent sync on a subsequent attempt too.
+        storage_hooks::fail_once(boundary.clone(), "directory_sync");
+        assert!(join(&collector.public_url(), &code, &host, "fixture").await.is_err());
+        assert!(collector.state.hosts.list().unwrap().is_empty());
+    }
+}
+
@@ -271,0 +357,25 @@ async fn joining_a_collector_that_does_not_know_the_key_is_refused() {
+
+#[tokio::test]
+async fn uncertain_enrollment_results_never_authorize_a_second_post_or_key() {
+    use axum::{Router, routing::{get, post}, response::IntoResponse};
+    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
+    for (status, body) in [(502, "bad gateway"), (504, "timeout"), (201, "{"), (201, "{\"host_id\":\"../bad\"}"), (409, "{\"error\":\"already_paired\",\"message\":\"unknown\"}")] {
+        let posts = Arc::new(AtomicUsize::new(0)); let capture = posts.clone();
+        let router = Router::new().route("/api/hosts/ws", get(|upgrade: axum::extract::ws::WebSocketUpgrade| async {
+            let mut response = upgrade.on_upgrade(|mut ws| async move { let _ = ws.recv().await; }).into_response();
+            response.headers_mut().insert(hennery_proto::HELLO_NONCE_HEADER, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".parse().unwrap()); response
+        })).route("/api/hosts/enroll", post(move || { let capture = capture.clone(); async move { capture.fetch_add(1, Ordering::SeqCst); (axum::http::StatusCode::from_u16(status).unwrap(), body) } }));
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap(); let url = format!("http://{}", listener.local_addr().unwrap());
+        let server = tokio::spawn(async move { axum::serve(listener, router).await.unwrap(); });
+        let dir = tempfile::tempdir().unwrap();
+        assert!(join(&url, "ABCD-EFGH", dir.path(), "fixture").await.is_err());
+        let pending = dir.path().join("host.key.pending"); let before = std::fs::read(&pending).unwrap();
+        assert!(dir.path().join(hennery_host::enrollment::JOURNAL).exists());
+        for _ in 0..2 {
+            assert!(join(&url, "FRESH-CODE", dir.path(), "fixture").await.is_err());
+            assert!(Paired::load(dir.path()).is_err());
+            assert_eq!(std::fs::read(&pending).unwrap(), before);
+        }
+        assert_eq!(posts.load(Ordering::SeqCst), 1, "{status} {body}"); server.abort();
+    }
+}
```

### 10fb12d5 feat(pairing): enroll over WSS and move transport without replacing identity

<!-- replay-commit: 10fb12d53d1f28960c92c1fbb26ddad80b274adb tree: 5f7b498f66e3c88e0de22d14702693c9e17240bc -->

```diff
diff --git a/Cargo.lock b/Cargo.lock
index 111061ee..32f58faf 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1701,0 +1702 @@ dependencies = [
+ "toml",
diff --git a/crates/hennery-host/src/connection.rs b/crates/hennery-host/src/connection.rs
index 3078b2ce..e3840b80 100644
--- a/crates/hennery-host/src/connection.rs
+++ b/crates/hennery-host/src/connection.rs
@@ -18,0 +19 @@ use futures::{SinkExt, StreamExt};
+use hennery_proto::PROTOCOL_VERSION;
@@ -23 +23,0 @@ use hennery_proto::frames::{
-use hennery_proto::{HELLO_NONCE_HEADER, PROTOCOL_VERSION};
@@ -41,0 +42 @@ pub struct HostConfig {
+    pub trust: crate::transport::CollectorTrust,
@@ -82,0 +84 @@ impl HostConfig {
+            trust: Default::default(),
@@ -159,0 +162,4 @@ pub async fn run_until(cfg: HostConfig, shutdown: impl Future<Output = ()>) -> R
+    let transport = crate::transport::CollectorTransport::new(
+        crate::transport::CollectorEndpoint::stored(&cfg.collector_url)?,
+        cfg.trust.clone(),
+    )?;
@@ -176 +182,10 @@ pub async fn run_until(cfg: HostConfig, shutdown: impl Future<Output = ()>) -> R
-            if let Err(err) = connect_once(&cfg, &uplink, &sessions, &probes, &homes, &mut replies, &mut backoff).await
+            if let Err(err) = connect_once(
+                (&cfg, &transport),
+                &uplink,
+                &sessions,
+                &probes,
+                &homes,
+                &mut replies,
+                &mut backoff,
+            )
+            .await
@@ -257,0 +273,11 @@ pub async fn probe(collector_url: &str, host_id: &str, key: &HostKey) -> Result<
+    let transport = crate::transport::CollectorTransport::new(
+        crate::transport::CollectorEndpoint::stored(collector_url)?,
+        Default::default(),
+    )?;
+    probe_transport(&transport, host_id, key).await
+}
+pub async fn probe_transport(
+    transport: &crate::transport::CollectorTransport,
+    host_id: &str,
+    key: &HostKey,
+) -> Result<Standing> {
@@ -261 +287 @@ pub async fn probe(collector_url: &str, host_id: &str, key: &HostKey) -> Result<
-        collector_url,
+        transport,
@@ -270 +296 @@ pub async fn probe(collector_url: &str, host_id: &str, key: &HostKey) -> Result<
-    let _ = sink.close().await;
+    let _ = tokio::time::timeout(Duration::from_secs(2), sink.close()).await;
@@ -302 +328 @@ async fn handshake(
-    collector_url: &str,
+    transport: &crate::transport::CollectorTransport,
@@ -313,2 +339 @@ async fn handshake(
-    let connect = tokio_tungstenite::connect_async_with_config(collector_url, Some(config), false);
-    let (ws, response) = tokio::time::timeout(connect_timeout, connect)
+    let (ws, nonce) = tokio::time::timeout(connect_timeout, transport.websocket(config))
@@ -320,7 +344,0 @@ async fn handshake(
-    let nonce = response
-        .headers()
-        .get(HELLO_NONCE_HEADER)
-        .and_then(|v| v.to_str().ok())
-        .and_then(|v| hex::decode(v).ok())
-        .filter(|n| n.len() == 32)
-        .context("the collector sent no hello nonce")?;
@@ -384 +402 @@ async fn connect_once(
-    cfg: &HostConfig,
+    configured: (&HostConfig, &crate::transport::CollectorTransport),
@@ -391,0 +410 @@ async fn connect_once(
+    let (cfg, transport) = configured;
@@ -393 +412 @@ async fn connect_once(
-        &cfg.collector_url,
+        transport,
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 25926998..9742a8e3 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -268,0 +269 @@ pub(crate) fn read_regular(path: &Path, bound: usize) -> Result<String> {
+#[cfg(test)]
@@ -291,4 +292,2 @@ pub(crate) fn read_table(path: &Path) -> Result<toml::Table> {
-    match std::fs::read_to_string(path) {
-        Ok(text) => toml::from_str(&text).with_context(|| format!("parse {}", path.display())),
-        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(toml::Table::new()),
-        Err(err) => Err(err).with_context(|| format!("read {}", path.display())),
+    if !path.try_exists()? {
+        return Ok(toml::Table::new());
@@ -295,0 +295,2 @@ pub(crate) fn read_table(path: &Path) -> Result<toml::Table> {
+    let text = read_regular(path, 512 * 1024)?;
+    toml::from_str(&text).map_err(|_| anyhow::anyhow!("invalid host configuration"))
@@ -333 +334,5 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-    crate::pairing::orphan_outbox(data_dir, "unpaired")?;
+    let prior = match crate::enrollment::inspect(data_dir)? {
+        crate::enrollment::EnrollmentState::Confirmed(attempt) => attempt.prior_host_id,
+        _ => None,
+    };
+    crate::pairing::orphan_outbox(data_dir, prior.as_deref().unwrap_or("unpaired"))?;
diff --git a/crates/hennery-host/src/pairing.rs b/crates/hennery-host/src/pairing.rs
index 56e96bb4..079ddeb8 100644
--- a/crates/hennery-host/src/pairing.rs
+++ b/crates/hennery-host/src/pairing.rs
@@ -4,4 +4,2 @@
-use crate::connection::{Standing, probe};
-use crate::identity::{
-    CONFIG_FILE, HostKey, KEY_FILE, Paired, create_private_dir, fsync_parent, pending_path, write_config_to,
-};
+use crate::connection::Standing;
+use crate::identity::{CONFIG_FILE, HostKey, KEY_FILE, Paired, create_private_dir, fsync_parent, pending_path};
@@ -13,4 +10,0 @@ use std::path::{Path, PathBuf};
-use std::time::Duration;
-
-/// How long one enrollment request may take.
-const ENROLL_TIMEOUT: Duration = Duration::from_secs(30);
@@ -116,18 +110,22 @@ pub fn same_collector(a: &str, b: &str) -> bool {
-pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) -> Result<Joined> {
-    let base = parse_public_url(public_url)?;
-    if base.scheme() == "https" {
-        // Enrolling would spend the code on a host that cannot connect.
-        bail!(
-            "{public_url}: hosts cannot connect over wss:// in this version yet; pair over a loopback http:// address, or wait for the wss:// support"
-        );
-    }
-    let collector_url = collector_ws_url(public_url)?;
-    if let Some(paired) = Paired::load(data_dir)? {
-        if !same_collector(&paired.collector_url, &collector_url) {
-            bail!(
-                "{} is paired with {} already; remove {} and {} to pair it with {public_url} instead",
-                data_dir.display(),
-                paired.collector_url,
-                data_dir.join(KEY_FILE).display(),
-                data_dir.join(CONFIG_FILE).display()
-            );
+/// A caller must hold host.lock while preparing and completing enrollment.
+pub enum PreparedJoin {
+    Already(Joined),
+    Ready {
+        transport: Box<crate::transport::CollectorTransport>,
+        prior_host_id: Option<String>,
+    },
+}
+/// Inspect durable state and probe an existing identity before requesting a code.
+pub async fn prepare_join(
+    public_url: &str,
+    trust: Option<crate::transport::CollectorTrust>,
+    data_dir: &Path,
+) -> Result<PreparedJoin> {
+    use crate::transport::{CollectorEndpoint, CollectorTransport};
+    let endpoint = CollectorEndpoint::public(public_url)?;
+    let paired = Paired::load(data_dir)?;
+    let effective_trust = trust.unwrap_or_else(|| paired.as_ref().map(|p| p.trust.clone()).unwrap_or_default());
+    if let Some(paired) = &paired {
+        CollectorEndpoint::stored(&paired.collector_url)?.require_compatible(&endpoint)?;
+        if effective_trust != paired.trust {
+            bail!("trust change requires `hennery host transport set`; no hello or enrollment sent");
@@ -135 +133,4 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-        match probe(&collector_url, &paired.host_id, &paired.key).await? {
+    }
+    let transport = CollectorTransport::new(endpoint, effective_trust)?;
+    if let Some(paired) = paired {
+        match crate::connection::probe_transport(&transport, &paired.host_id, &paired.key).await? {
@@ -137 +138 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-                return Ok(Joined::AlreadyPaired {
+                return Ok(PreparedJoin::Already(Joined::AlreadyPaired {
@@ -139 +140 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-                });
+                }));
@@ -141,2 +141,0 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-            // Only a revoke is certain: the collector checked the key and
-            // refused it for good.
@@ -144 +143,4 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-                orphan_outbox(data_dir, &paired.host_id)?;
+                return Ok(PreparedJoin::Ready {
+                    transport: Box::new(transport),
+                    prior_host_id: Some(paired.host_id),
+                });
@@ -146,3 +147,0 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-            // A collector that no longer knows the key may be one whose
-            // database was reset or restored; re-pairing on a guess could
-            // strand sessions that are only waiting for it to come back.
@@ -150,5 +149 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-                "the collector at {public_url} does not know host {} (its database may have been reset or restored). \
-                 If this host should be paired anew, remove {} and {} and run `hennery host join` again",
-                paired.host_id,
-                data_dir.join(KEY_FILE).display(),
-                data_dir.join(CONFIG_FILE).display()
+                "the collector does not know this host or key; check the collector and revoke/recover deliberately before re-pairing"
@@ -157,0 +153,64 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
+    Ok(PreparedJoin::Ready {
+        transport: Box::new(transport),
+        prior_host_id: None,
+    })
+}
+/// The CLI and up already hold host.lock; no second lock is taken.
+pub async fn join_locked(
+    public_url: &str,
+    code: &str,
+    data_dir: &Path,
+    name: &str,
+    trust: Option<crate::transport::CollectorTrust>,
+) -> Result<Joined> {
+    let prepared = prepare_join(public_url, trust, data_dir).await?;
+    complete_join(prepared, code, data_dir, name).await
+}
+/// Library entry point also serializes all pairing-state reads and writes.
+pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) -> Result<Joined> {
+    create_private_dir(data_dir)?;
+    let _guard = PairingLock::acquire(data_dir)?;
+    join_locked(public_url, code, data_dir, name, None).await
+}
+pub struct PairingLock(std::fs::File);
+impl PairingLock {
+    pub fn acquire(dir: &Path) -> Result<Self> {
+        use std::os::{fd::AsRawFd, unix::fs::OpenOptionsExt};
+        let file = std::fs::OpenOptions::new()
+            .read(true)
+            .write(true)
+            .create(true)
+            .truncate(false)
+            .mode(0o600)
+            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
+            .open(dir.join("host.lock"))?;
+        if !file.metadata()?.is_file() {
+            bail!("host.lock must be a regular file");
+        }
+        // SAFETY: flock operates on the file owned by this guard.
+        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } < 0 {
+            bail!(
+                "host.lock is held; park sessions and stop the host service before changing its pairing or transport"
+            );
+        }
+        Ok(Self(file))
+    }
+}
+impl Drop for PairingLock {
+    fn drop(&mut self) {
+        let _ = self.0.metadata();
+    }
+}
+pub async fn complete_join(prepared: PreparedJoin, code: &str, data_dir: &Path, name: &str) -> Result<Joined> {
+    use crate::enrollment::EnrollmentAttempt;
+    let PreparedJoin::Ready {
+        transport,
+        prior_host_id,
+    } = prepared
+    else {
+        let PreparedJoin::Already(joined) = prepared else {
+            unreachable!()
+        };
+        return Ok(joined);
+    };
+    crate::enrollment::require_resolved(data_dir)?;
@@ -158,0 +218,4 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
+    // Validate the existing destination before spending a code. This also
+    // refuses corruption instead of destroying operator configuration.
+    crate::identity::read_table(&data_dir.join(CONFIG_FILE))?;
+    transport.preflight().await?;
@@ -160,5 +222,0 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-    // Written before enrolling, so a directory that cannot hold the key
-    // never costs a code. Once enrolled, the same file is renamed into
-    // `host.key` (see `finish_pairing`) rather than the seed being written
-    // out a second time: exactly one copy of the private key ever touches
-    // disk.
@@ -165,0 +224,3 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
+    if pending.try_exists()? {
+        bail!("a pending key exists; no overwrite is permitted");
+    }
@@ -167 +228,4 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-    let host_id = match enroll(&base, code, &key, name).await {
+    let attempt = EnrollmentAttempt::new(&transport.endpoint, transport.trust.clone(), &key, prior_host_id);
+    attempt.save(data_dir)?;
+    let result = enroll(&transport, code, &key, name).await;
+    let host_id = match result {
@@ -170,2 +234,5 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-            let _ = std::fs::remove_file(&pending);
-            return Err(err);
+            if err.downcast_ref::<DefinitiveRejection>().is_some() {
+                clear_rejected(data_dir)?;
+                return Err(err);
+            }
+            return Err(err.context(attempt.diagnostic()));
@@ -174,6 +241,15 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-    // The code is spent from here on, and `host.key.pending` is the only
-    // copy of the key the collector enrolled: no failure below removes it.
-    // Once `host.toml.pending` is written, `Paired::load` rolls the pairing
-    // forward; before that, a leftover `host.key.pending` is ignored, and
-    // overwritten by the next `join`.
-    finish_pairing(data_dir, &pending, &collector_url, &host_id, &key)?;
+    let config_pending = pending_path(data_dir, CONFIG_FILE);
+    crate::identity::write_config_with(&config_pending, |table| {
+        table.insert("collector".into(), toml::Value::String(transport.endpoint.ws().into()));
+        table.insert("host_id".into(), toml::Value::String(host_id.clone()));
+        table.insert("public_key".into(), toml::Value::String(key.public_key_hex()));
+        table.insert(
+            "collector_tls".into(),
+            toml::Value::try_from(&transport.trust).expect("TLS policy serializes"),
+        );
+    })
+    .context("confirmed enrollment; receipt staging failed; retain journal and pending key")?;
+    Paired::load(data_dir).context("confirmed enrollment needs roll-forward; retain its receipt")?;
+    if let Err(err) = crate::connection::probe_transport(&transport, &host_id, &key).await {
+        bail!("paired as {host_id}; connection failed: {err}; identity retained for retry");
+    }
@@ -182,20 +258,6 @@ pub async fn join(public_url: &str, code: &str, data_dir: &Path, name: &str) ->
-
-/// Once enrollment has spent the code: stage `host.toml.pending`, move the
-/// pending key into `host.key`, set aside any outbox left by an earlier
-/// identity, and move `host.toml.pending` into `host.toml`. Once the staged
-/// `host.toml` is written the pairing is committed: a crash after it is
-/// rolled forward by `Paired::load`, so the new key never sits beside an
-/// older `host.toml`.
-fn finish_pairing(data_dir: &Path, pending: &Path, collector_url: &str, host_id: &str, key: &HostKey) -> Result<()> {
-    let config_pending = pending_path(data_dir, CONFIG_FILE);
-    write_config_to(&config_pending, collector_url, host_id, key)?;
-    let key_path = data_dir.join(KEY_FILE);
-    std::fs::rename(pending, &key_path)
-        .with_context(|| format!("rename {} to {}", pending.display(), key_path.display()))?;
-    fsync_parent(&key_path)?;
-    // Frames an earlier, unpaired host left behind are not this identity's.
-    orphan_outbox(data_dir, "unpaired")?;
-    let config_path = data_dir.join(CONFIG_FILE);
-    std::fs::rename(&config_pending, &config_path)
-        .with_context(|| format!("rename {} to {}", config_pending.display(), config_path.display()))?;
-    fsync_parent(&config_path)
+#[derive(Debug)]
+struct DefinitiveRejection;
+impl std::fmt::Display for DefinitiveRejection {
+    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
+        f.write_str("pairing rejected: invalid_code; no enrollment occurred")
+    }
@@ -203,16 +265,18 @@ fn finish_pairing(data_dir: &Path, pending: &Path, collector_url: &str, host_id:
-
-async fn enroll(base: &Url, code: &str, key: &HostKey, name: &str) -> Result<String> {
-    let url = base.join("/api/hosts/enroll").expect("an absolute path joins");
-    let response = reqwest::Client::builder()
-        .timeout(ENROLL_TIMEOUT)
-        .redirect(reqwest::redirect::Policy::none())
-        // The code and the public key are the only secrets this host has
-        // left to spend; `parse_public_url` already limited plain http to
-        // loopback, but reqwest still honours `HTTP_PROXY`/`ALL_PROXY` by
-        // default, which would hand both of them to whatever the
-        // environment names — defeating that check for anyone who can set
-        // it. No proxy, ever, for this request. `wss://` support must
-        // reintroduce proxy support deliberately, if at all.
-        .no_proxy()
-        .build()?
-        .post(url.clone())
+impl std::error::Error for DefinitiveRejection {}
+fn clear_rejected(dir: &Path) -> Result<()> {
+    std::fs::remove_file(dir.join("host.key.pending"))?;
+    fsync_parent(&dir.join(crate::enrollment::JOURNAL))?;
+    std::fs::remove_file(dir.join(crate::enrollment::JOURNAL))?;
+    fsync_parent(&dir.join(crate::enrollment::JOURNAL))
+}
+async fn enroll(
+    transport: &crate::transport::CollectorTransport,
+    code: &str,
+    key: &HostKey,
+    name: &str,
+) -> Result<String> {
+    let url = transport.endpoint.origin().join("/api/hosts/enroll")?;
+    let mut response = transport
+        .http()
+        .await?
+        .post(url)
@@ -228,9 +292,10 @@ async fn enroll(base: &Url, code: &str, key: &HostKey, name: &str) -> Result<Str
-        .with_context(|| format!("reach {url}"))?;
-    let status = response.status();
-    if status.as_u16() == 201 {
-        let host_id = response.json::<EnrollResponse>().await?.host_id;
-        if !is_valid_host_id(&host_id) {
-            // Trusted from here on: stored, shown, and (from Task 7) used as
-            // an outbox path fragment. A malformed id from the collector
-            // must never reach any of that.
-            bail!("the collector returned a malformed host id");
+        .map_err(|_| anyhow::anyhow!("enrollment reply unavailable; possible remote enrollment"))?;
+    let status = response.status().as_u16();
+    let mut bytes = Vec::new();
+    while let Some(chunk) = response
+        .chunk()
+        .await
+        .map_err(|_| anyhow::anyhow!("enrollment reply truncated"))?
+    {
+        if bytes.len() + chunk.len() > 8192 {
+            bail!("enrollment reply exceeds limit");
@@ -238 +303 @@ async fn enroll(base: &Url, code: &str, key: &HostKey, name: &str) -> Result<Str
-        return Ok(host_id);
+        bytes.extend_from_slice(&chunk);
@@ -240,15 +305,53 @@ async fn enroll(base: &Url, code: &str, key: &HostKey, name: &str) -> Result<Str
-    let retry_after = response
-        .headers()
-        .get(reqwest::header::RETRY_AFTER)
-        .and_then(|v| v.to_str().ok())
-        .map(str::to_string);
-    let message = match response.json::<ApiError>().await {
-        // Escaped: this text reaches a terminal (CLI stdout/stderr) verbatim,
-        // and it comes from whatever answered at `base` — not necessarily
-        // the collector we expect.
-        Ok(e) => e.message.escape_debug().to_string(),
-        Err(_) => format!("the collector answered {status}"),
-    };
-    match (status.as_u16(), retry_after) {
-        (429, Some(secs)) => bail!("{message} (retry in {secs} s)"),
-        _ => bail!("pairing failed: {message}"),
+    if status == 201 {
+        let reply: EnrollResponse =
+            serde_json::from_slice(&bytes).map_err(|_| anyhow::anyhow!("malformed enrollment success"))?;
+        if !is_valid_host_id(&reply.host_id) {
+            bail!("malformed returned host id");
+        }
+        return Ok(reply.host_id);
+    }
+    if status == 401 && serde_json::from_slice::<ApiError>(&bytes).is_ok_and(|reply| reply.code == "invalid_code") {
+        return Err(DefinitiveRejection.into());
+    }
+    bail!("enrollment answered HTTP {status}; result may have committed")
+}
+/// Move an identity to an explicitly authorized HTTPS origin without enrollment.
+/// Caller holds host.lock, and an omitted trust choice only retains same-origin trust.
+pub async fn set_transport(
+    data_dir: &Path,
+    public_url: &str,
+    trust: Option<crate::transport::CollectorTrust>,
+) -> Result<Standing> {
+    use crate::transport::{CollectorEndpoint, CollectorTransport};
+    let paired = Paired::load(data_dir)?.context("transport set requires an existing pairing")?;
+    let endpoint = CollectorEndpoint::public(public_url)?;
+    if !endpoint.secure() {
+        bail!("transport set requires HTTPS; plaintext downgrades are refused before hello");
+    }
+    let old = CollectorEndpoint::stored(&paired.collector_url)?;
+    if old.origin() != endpoint.origin() && trust.is_none() {
+        bail!("a different origin requires --ca-cert or --system-roots; no hello sent");
+    }
+    let transport = CollectorTransport::new(endpoint, trust.unwrap_or(paired.trust))?;
+    let standing = crate::connection::probe_transport(&transport, &paired.host_id, &paired.key).await?;
+    if !matches!(standing, Standing::Accepted | Standing::Connected) {
+        bail!("transport probe refused: {standing:?}; old configuration retained");
+    }
+    let save = crate::identity::write_config_with(&data_dir.join(CONFIG_FILE), |table| {
+        table.insert("collector".into(), toml::Value::String(transport.endpoint.ws().into()));
+        table.insert(
+            "collector_tls".into(),
+            toml::Value::try_from(&transport.trust).expect("TLS policy serializes"),
+        );
+    });
+    if let Err(err) = save {
+        if err.downcast_ref::<crate::identity::DurabilityUncertain>().is_some() {
+            let read_back = Paired::read(data_dir)
+                .ok()
+                .flatten()
+                .and_then(|p| CollectorEndpoint::stored(&p.collector_url).ok())
+                .map(|e| e.origin().to_string())
+                .unwrap_or_else(|| "unavailable; inspect host.toml".into());
+            return Err(err.context(format!("visible saved endpoint read-back: {read_back}")));
+        }
+        return Err(err);
@@ -255,0 +359 @@ async fn enroll(base: &Url, code: &str, key: &HostKey, name: &str) -> Result<Str
+    Ok(standing)
diff --git a/crates/hennery-host/tests/transport.rs b/crates/hennery-host/tests/transport.rs
index 6595c5b7..fc269060 100644
--- a/crates/hennery-host/tests/transport.rs
+++ b/crates/hennery-host/tests/transport.rs
@@ -63 +63 @@ async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
-                            ws.send(Message::Text("{}".into())).await.ok();
+                            ws.send(Message::Text("{\"type\":\"hello_ack\",\"protocol_version\":\"1.0\",\"collector_version\":\"fixture\",\"committed\":{}}".into())).await.ok();
@@ -163,0 +164,64 @@ impl tokio_tungstenite::tungstenite::handshake::server::Callback for NonceCallba
+
+#[tokio::test]
+#[cfg(feature = "test-hooks")]
+async fn transport_move_preserves_identity_outbox_and_configuration_and_reports_fsync() {
+    use hennery_host::{
+        identity::{DurabilityUncertain, HostKey, Paired, storage_hooks},
+        pairing::set_transport,
+    };
+    let fixture = fixture(
+        vec!["localhost".into()],
+        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
+    )
+    .await;
+    let dir = tempfile::tempdir().unwrap();
+    let paired = Paired {
+        collector_url: "ws://localhost:7117/api/hosts/ws".into(),
+        trust: CollectorTrust::System,
+        host_id: "host-0123456789abcdef".into(),
+        key: HostKey::from_seed([31; 32]),
+        workspace_roots: vec!["/srv/projects".into()],
+    };
+    paired.save(dir.path()).unwrap();
+    std::fs::write(dir.path().join("outbox.db"), b"preserved").unwrap();
+    let path = dir.path().join("host.toml");
+    let mut table: toml::Table = toml::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
+    table.insert(
+        "cli".into(),
+        toml::Value::Table(toml::Table::from_iter([(
+            "claude".into(),
+            toml::Value::String("/opt/fixture".into()),
+        )])),
+    );
+    std::fs::write(&path, toml::to_string(&table).unwrap()).unwrap();
+    let original = std::fs::read(&path).unwrap();
+    let key = std::fs::read(dir.path().join("host.key")).unwrap();
+    assert!(set_transport(dir.path(), &fixture.url, None).await.is_err());
+    assert_eq!(fixture.seen.load(Ordering::SeqCst), 0);
+    let trust = CollectorTrust::CaBundle {
+        pem: fixture.pem.clone(),
+    };
+    storage_hooks::fail_once(path.clone(), "before_rename");
+    assert!(
+        set_transport(dir.path(), &fixture.url, Some(trust.clone()))
+            .await
+            .is_err()
+    );
+    assert_eq!(std::fs::read(&path).unwrap(), original);
+    storage_hooks::fail_once(path.clone(), "directory_sync");
+    let error = set_transport(dir.path(), &fixture.url, Some(trust.clone()))
+        .await
+        .unwrap_err();
+    assert!(error.downcast_ref::<DurabilityUncertain>().is_some(), "{error:#}");
+    assert!(error.to_string().contains("read-back"));
+    assert_ne!(std::fs::read(&path).unwrap(), original);
+    set_transport(dir.path(), &fixture.url, None).await.unwrap();
+    let loaded = Paired::read(dir.path()).unwrap().unwrap();
+    assert_eq!(loaded.host_id, paired.host_id);
+    assert_eq!(loaded.trust, trust);
+    assert_eq!(loaded.workspace_roots, paired.workspace_roots);
+    assert_eq!(std::fs::read(dir.path().join("host.key")).unwrap(), key);
+    assert_eq!(std::fs::read(dir.path().join("outbox.db")).unwrap(), b"preserved");
+    let table: toml::Table = toml::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
+    assert_eq!(table["cli"]["claude"].as_str(), Some("/opt/fixture"));
+}
diff --git a/crates/hennery-testkit/Cargo.toml b/crates/hennery-testkit/Cargo.toml
index b1bcc0ce..43ac68cf 100644
--- a/crates/hennery-testkit/Cargo.toml
+++ b/crates/hennery-testkit/Cargo.toml
@@ -46,0 +47 @@ tokio-tungstenite.workspace = true
+toml.workspace = true
diff --git a/crates/hennery-testkit/tests/join.rs b/crates/hennery-testkit/tests/join.rs
index 7724af2b..899fc8ab 100644
--- a/crates/hennery-testkit/tests/join.rs
+++ b/crates/hennery-testkit/tests/join.rs
@@ -214,2 +214,6 @@ async fn a_wrong_code_fails_and_leaves_nothing_behind() {
-    assert!(err.to_string().contains("unknown, used or expired"), "{err}");
-    let left: Vec<_> = std::fs::read_dir(dir.path()).unwrap().collect();
+    assert!(err.to_string().contains("invalid_code"), "{err}");
+    let left: Vec<_> = std::fs::read_dir(dir.path())
+        .unwrap()
+        .map(Result::unwrap)
+        .filter(|e| e.file_name() != "host.lock")
+        .collect();
@@ -221 +225 @@ async fn a_wrong_code_fails_and_leaves_nothing_behind() {
-async fn joining_over_https_is_refused_before_a_code_is_spent() {
+async fn unreachable_https_is_refused_before_a_code_is_spent() {
@@ -226 +230 @@ async fn joining_over_https_is_refused_before_a_code_is_spent() {
-    assert!(err.to_string().contains("wss://"), "{err}");
+    assert!(err.to_string().contains("transport"), "{err}");
@@ -321,3 +325,9 @@ async fn joining_again_after_a_revoke_keeps_the_workspace_roots() {
-    let mut text = std::fs::read_to_string(&config).unwrap();
-    text.push_str("workspace_roots = [\"/srv/projects\", \"~/src\"]\n");
-    std::fs::write(&config, text).unwrap();
+    let mut table: toml::Table = toml::from_str(&std::fs::read_to_string(&config).unwrap()).unwrap();
+    table.insert(
+        "workspace_roots".into(),
+        toml::Value::Array(vec![
+            toml::Value::String("/srv/projects".into()),
+            toml::Value::String("~/src".into()),
+        ]),
+    );
+    std::fs::write(&config, toml::to_string(&table).unwrap()).unwrap();
@@ -350,2 +360,2 @@ async fn joining_a_collector_that_does_not_know_the_key_is_refused() {
-    assert!(err.contains("does not know host"), "{err}");
-    assert!(err.contains(&dir.path().join(KEY_FILE).display().to_string()), "{err}");
+    assert!(err.contains("does not know this host"), "{err}");
+    assert!(err.contains("deliberately"), "{err}");
@@ -360,10 +370,51 @@ async fn uncertain_enrollment_results_never_authorize_a_second_post_or_key() {
-    use axum::{Router, routing::{get, post}, response::IntoResponse};
-    use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
-    for (status, body) in [(502, "bad gateway"), (504, "timeout"), (201, "{"), (201, "{\"host_id\":\"../bad\"}"), (409, "{\"error\":\"already_paired\",\"message\":\"unknown\"}")] {
-        let posts = Arc::new(AtomicUsize::new(0)); let capture = posts.clone();
-        let router = Router::new().route("/api/hosts/ws", get(|upgrade: axum::extract::ws::WebSocketUpgrade| async {
-            let mut response = upgrade.on_upgrade(|mut ws| async move { let _ = ws.recv().await; }).into_response();
-            response.headers_mut().insert(hennery_proto::HELLO_NONCE_HEADER, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".parse().unwrap()); response
-        })).route("/api/hosts/enroll", post(move || { let capture = capture.clone(); async move { capture.fetch_add(1, Ordering::SeqCst); (axum::http::StatusCode::from_u16(status).unwrap(), body) } }));
-        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap(); let url = format!("http://{}", listener.local_addr().unwrap());
-        let server = tokio::spawn(async move { axum::serve(listener, router).await.unwrap(); });
+    use axum::{
+        Router,
+        response::IntoResponse,
+        routing::{get, post},
+    };
+    use std::sync::{
+        Arc,
+        atomic::{AtomicUsize, Ordering},
+    };
+    for (status, body) in [
+        (502, "bad gateway"),
+        (504, "timeout"),
+        (201, "{"),
+        (201, "{\"host_id\":\"../bad\"}"),
+        (409, "{\"error\":\"already_paired\",\"message\":\"unknown\"}"),
+    ] {
+        let posts = Arc::new(AtomicUsize::new(0));
+        let capture = posts.clone();
+        let router = Router::new()
+            .route(
+                "/api/hosts/ws",
+                get(|upgrade: axum::extract::ws::WebSocketUpgrade| async {
+                    let mut response = upgrade
+                        .on_upgrade(|mut ws| async move {
+                            let _ = ws.recv().await;
+                        })
+                        .into_response();
+                    response.headers_mut().insert(
+                        hennery_proto::HELLO_NONCE_HEADER,
+                        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
+                            .parse()
+                            .unwrap(),
+                    );
+                    response
+                }),
+            )
+            .route(
+                "/api/hosts/enroll",
+                post(move || {
+                    let capture = capture.clone();
+                    async move {
+                        capture.fetch_add(1, Ordering::SeqCst);
+                        (axum::http::StatusCode::from_u16(status).unwrap(), body)
+                    }
+                }),
+            );
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let url = format!("http://{}", listener.local_addr().unwrap());
+        let server = tokio::spawn(async move {
+            axum::serve(listener, router).await.unwrap();
+        });
@@ -372 +423,2 @@ async fn uncertain_enrollment_results_never_authorize_a_second_post_or_key() {
-        let pending = dir.path().join("host.key.pending"); let before = std::fs::read(&pending).unwrap();
+        let pending = dir.path().join("host.key.pending");
+        let before = std::fs::read(&pending).unwrap();
@@ -379 +431,2 @@ async fn uncertain_enrollment_results_never_authorize_a_second_post_or_key() {
-        assert_eq!(posts.load(Ordering::SeqCst), 1, "{status} {body}"); server.abort();
+        assert_eq!(posts.load(Ordering::SeqCst), 1, "{status} {body}");
+        server.abort();
diff --git a/crates/hennery/src/main.rs b/crates/hennery/src/main.rs
index 2c84188f..2e943bcb 100644
--- a/crates/hennery/src/main.rs
+++ b/crates/hennery/src/main.rs
@@ -63,0 +64,10 @@ enum HostCommand {
+    /// Change this host's collector endpoint without replacing its identity.
+    Transport {
+        #[command(subcommand)]
+        command: TransportCommand,
+    },
+    /// Explicit recovery of a possibly committed enrollment.
+    Enrollment {
+        #[command(subcommand)]
+        command: EnrollmentCommand,
+    },
@@ -74,0 +85,3 @@ struct JoinArgs {
+    /// Import collector-only private CA roots; copied into host.toml.
+    #[arg(long)]
+    ca_cert: Option<PathBuf>,
@@ -98,0 +112,25 @@ struct JoinArgs {
+#[derive(Subcommand)]
+enum TransportCommand {
+    Set(TransportSetArgs),
+}
+#[derive(Args)]
+struct TransportSetArgs {
+    url: String,
+    #[arg(long, env = "HENNERY_HOST_DATA_DIR")]
+    data_dir: Option<PathBuf>,
+    #[arg(long, conflicts_with = "system_roots")]
+    ca_cert: Option<PathBuf>,
+    #[arg(long)]
+    system_roots: bool,
+}
+#[derive(Subcommand)]
+enum EnrollmentCommand {
+    /// After checking Hosts and revoking any possible enrollment, durably
+    /// archive local artifacts. This action cannot confirm remote revocation.
+    Archive {
+        attempt_id: String,
+        #[arg(long, env = "HENNERY_HOST_DATA_DIR")]
+        data_dir: Option<PathBuf>,
+    },
+}
+
@@ -311 +349 @@ async fn main() -> std::process::ExitCode {
-    let result = match cli.command {
+    let result = async { match cli.command {
@@ -325,0 +364,39 @@ async fn main() -> std::process::ExitCode {
+        Command::Host {
+            command: HostCommand::Transport {
+                command: TransportCommand::Set(args),
+            },
+        } => {
+            let dir = data_dir::host_or_installed(args.data_dir, data_dir::HostUse::Join)?;
+            let _guard = hennery_host::pairing::PairingLock::acquire(&dir)?;
+            let trust = if let Some(path) = args.ca_cert {
+                Some(hennery_host::transport::CollectorTrust::import(&path)?)
+            } else if args.system_roots {
+                Some(hennery_host::transport::CollectorTrust::System)
+            } else {
+                None
+            };
+            let result = hennery_host::pairing::set_transport(&dir, &args.url, trust).await?;
+            if result == hennery_host::connection::Standing::Connected {
+                println!("another connection still uses this identity");
+            }
+            println!("transport saved; restart the host (this parks adapters) and resume sessions normally");
+            Ok(std::process::ExitCode::SUCCESS)
+        }
+        Command::Host {
+            command:
+                HostCommand::Enrollment {
+                    command:
+                        EnrollmentCommand::Archive {
+                            attempt_id,
+                            data_dir: given,
+                        },
+                },
+        } => {
+            let dir = data_dir::host_or_installed(given, data_dir::HostUse::Join)?;
+            let _guard = hennery_host::pairing::PairingLock::acquire(&dir)?;
+            hennery_host::enrollment::archive(&dir, &attempt_id)?;
+            println!(
+                "attempt archived locally; this does not confirm remote revocation. Check Hosts and revoke any entry before a fresh join"
+            );
+            Ok(std::process::ExitCode::SUCCESS)
+        }
@@ -333 +410 @@ async fn main() -> std::process::ExitCode {
-    };
+    } }.await;
@@ -686,0 +764,8 @@ async fn join_host(args: JoinArgs) -> Result<()> {
+    hennery_host::identity::create_private_dir(&data_dir)?;
+    let _guard = hennery_host::pairing::PairingLock::acquire(&data_dir)?;
+    let trust = args
+        .ca_cert
+        .as_deref()
+        .map(hennery_host::transport::CollectorTrust::import)
+        .transpose()?;
+    let prepared = hennery_host::pairing::prepare_join(&args.url, trust, &data_dir).await?;
@@ -692,3 +777,4 @@ async fn join_host(args: JoinArgs) -> Result<()> {
-    let code = match args.code {
-        Some(code) => code,
-        None => read_code_from_stdin()?,
+    let code = match (&prepared, args.code) {
+        (hennery_host::pairing::PreparedJoin::Already(_), _) => String::new(),
+        (_, Some(code)) => code,
+        (_, None) => read_code_from_stdin()?,
@@ -696 +782 @@ async fn join_host(args: JoinArgs) -> Result<()> {
-    let host_id = match hennery_host::pairing::join(&args.url, &code, &data_dir, &name).await? {
+    let host_id = match hennery_host::pairing::complete_join(prepared, &code, &data_dir, &name).await? {
@@ -798 +884 @@ async fn run_host(args: HostArgs) -> Result<std::process::ExitCode> {
-            hennery_host::pairing::join(url, &code, &data_dir, &name).await?;
+            hennery_host::pairing::join_locked(url, &code, &data_dir, &name, None).await?;
@@ -801,0 +888,7 @@ async fn run_host(args: HostArgs) -> Result<std::process::ExitCode> {
+    let collector_url = args
+        .collector_url
+        .clone()
+        .unwrap_or_else(|| paired.collector_url.clone());
+    let endpoint = hennery_host::transport::CollectorEndpoint::stored(&collector_url)?;
+    hennery_host::transport::CollectorEndpoint::stored(&paired.collector_url)?.require_compatible(&endpoint)?;
+    hennery_host::transport::CollectorTransport::new(endpoint, paired.trust.clone())?;
@@ -819 +911,0 @@ async fn run_host(args: HostArgs) -> Result<std::process::ExitCode> {
-    let collector_url = args.collector_url.unwrap_or(paired.collector_url);
@@ -827,0 +920 @@ async fn run_host(args: HostArgs) -> Result<std::process::ExitCode> {
+    cfg.trust = paired.trust;
@@ -982 +1075,5 @@ fn pairing_in(dir: &std::path::Path) -> Pairing {
-    if dir.join(format!("{CONFIG_FILE}.pending")).exists() {
+    if dir.join(format!("{CONFIG_FILE}.pending")).exists()
+        || dir.join(format!("{KEY_FILE}.pending")).exists()
+        || dir.join(hennery_host::enrollment::JOURNAL).exists()
+        || dir.join(hennery_host::enrollment::RECOVERY).exists()
+    {
@@ -1112,4 +1209,10 @@ async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
-    let Some(host_listener) = addresses
-        .iter()
-        .position(|address| hennery_host::pairing::collector_ws_url(&loopback_url(address)).is_ok())
-    else {
+    let Some(host_listener) = addresses.iter().position(|address| {
+        let candidate = loopback_url(address);
+        // Port 0 requests an ephemeral local listener. Validate the
+        // address here; the transport uses its nonzero bound port below.
+        let candidate = candidate
+            .strip_suffix(":0")
+            .map(|base| format!("{base}:1"))
+            .unwrap_or(candidate);
+        hennery_host::pairing::collector_ws_url(&candidate).is_ok()
+    }) else {
@@ -1125,0 +1229,21 @@ async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
+    // up's listener-derived override must not downgrade stored WSS, and
+    // uncertainty must stop before collector spawn/code minting.
+    if host_dir.is_dir() {
+        let _guard = hennery_host::pairing::PairingLock::acquire(&host_dir)?;
+        hennery_host::enrollment::require_resolved(&host_dir)?;
+        let config = if host_dir.join("host.toml.pending").exists() {
+            host_dir.join("host.toml.pending")
+        } else {
+            host_dir.join("host.toml")
+        };
+        if config.exists() {
+            let table: toml::Table =
+                toml::from_str(&std::fs::read_to_string(config)?).context("invalid host transport configuration")?;
+            let stored = table
+                .get("collector")
+                .and_then(|v| v.as_str())
+                .context("missing stored collector")?;
+            hennery_host::transport::CollectorEndpoint::stored(stored)?
+                .require_compatible(&hennery_host::transport::CollectorEndpoint::stored(&collector_ws_url)?)?;
+        }
+    }
diff --git a/crates/hennery/tests/cli.rs b/crates/hennery/tests/cli.rs
index 98cb674b..fb48328e 100644
--- a/crates/hennery/tests/cli.rs
+++ b/crates/hennery/tests/cli.rs
@@ -4299,0 +4300,58 @@ fn password_session(listen: &str, origin: &str) -> String {
+
+#[test]
+fn a_secure_loopback_pairing_rejects_join_run_and_up_plaintext_overrides() {
+    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
+    let root = tempfile::tempdir().unwrap();
+    let host = root.path().join("host");
+    hennery_host::identity::Paired {
+        collector_url: "wss://localhost/api/hosts/ws".into(),
+        trust: Default::default(),
+        host_id: "host-0123456789abcdef".into(),
+        key: hennery_host::identity::HostKey::from_seed([47; 32]),
+        workspace_roots: vec![],
+    }
+    .save(&host)
+    .unwrap();
+    let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
+    trap.set_nonblocking(true).unwrap();
+    let origin = format!("http://{}", trap.local_addr().unwrap());
+    let ws = hennery_host::pairing::collector_ws_url(&origin).unwrap();
+    for args in [
+        vec![
+            "host",
+            "join",
+            &origin,
+            "ABCD-EFGH",
+            "--no-runtime",
+            "--data-dir",
+            host.to_str().unwrap(),
+        ],
+        vec![
+            "host",
+            "run",
+            "--collector-url",
+            &ws,
+            "--data-dir",
+            host.to_str().unwrap(),
+        ],
+        vec![
+            "up",
+            "--listen",
+            "127.0.0.1:0",
+            "--data-dir",
+            root.path().to_str().unwrap(),
+        ],
+    ] {
+        let output = hennery().args(args).output().unwrap();
+        assert!(!output.status.success());
+        assert!(
+            String::from_utf8_lossy(&output.stderr).contains("before hello"),
+            "{}",
+            String::from_utf8_lossy(&output.stderr)
+        );
+    }
+    assert!(matches!(
+        trap.accept().unwrap_err().kind(),
+        std::io::ErrorKind::WouldBlock
+    ));
+}
```


## Task 4 — Reconnect timing

**Step 1:** inspect the preceding base and apply the test patch; observe its recorded RED. **Step 2:** apply the implementation patch and verify the targeted behavior. **Step 3:** review the diff against the constraints before pushing. Independent review is requested from the parent after this built plan.

Run: `nix develop -c cargo test -p hennery-testkit --test host_connection --locked`. Expected after implementation: exit 0; the execution table records integrated counts.

### 4d9cf8e5 test(connection): pin jitter and Retry-After boundaries

<!-- replay-commit: 4d9cf8e5385b7ec1fcfbc4c456708996b5e0f8a3 tree: 3eaccd938dc5c44c9b14ef25c41379c40e723b2b -->

```diff
diff --git a/crates/hennery-host/src/connection.rs b/crates/hennery-host/src/connection.rs
index e3840b80..38277c93 100644
--- a/crates/hennery-host/src/connection.rs
+++ b/crates/hennery-host/src/connection.rs
@@ -1064,0 +1065,14 @@ mod tests {
+
+#[cfg(test)]
+mod reconnect_tests {
+    use super::*;
+    #[test]
+    fn jitter_has_floor_half_ceiling_and_retry_after_bounds() {
+        let floor = Duration::from_millis(500);
+        assert_eq!(reconnect_delay(floor, floor, 0, None), floor);
+        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 0, None), Duration::from_secs(15));
+        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 15_000, None), Duration::from_secs(30));
+        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 0, Some(1)), Duration::from_secs(15));
+        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 0, Some(999)), Duration::from_secs(300));
+    }
+}
```

### 17c2f1f9 feat(connection): jitter reconnects and respect bounded Retry-After

<!-- replay-commit: 17c2f1f9f6b85322130a0c6582cb6476be0ccf31 tree: 8f570cc4df1b4854a3e5fc57b06c6f24a431f3a4 -->

```diff
diff --git a/crates/hennery-host/src/connection.rs b/crates/hennery-host/src/connection.rs
index 38277c93..74b6e652 100644
--- a/crates/hennery-host/src/connection.rs
+++ b/crates/hennery-host/src/connection.rs
@@ -181,0 +182 @@ pub async fn run_until(cfg: HostConfig, shutdown: impl Future<Output = ()>) -> R
+            let mut retry_after = None;
@@ -192,0 +194,7 @@ pub async fn run_until(cfg: HostConfig, shutdown: impl Future<Output = ()>) -> R
+                if let Some(crate::transport::TransportFailure(crate::transport::Stage::Upgrade {
+                    retry_after: retry,
+                    ..
+                })) = err.downcast_ref::<crate::transport::TransportFailure>()
+                {
+                    retry_after = *retry;
+                }
@@ -209 +217,2 @@ pub async fn run_until(cfg: HostConfig, shutdown: impl Future<Output = ()>) -> R
-            tokio::time::sleep(backoff).await;
+            let sample = jitter_sample(backoff, cfg.reconnect_min);
+            tokio::time::sleep(reconnect_delay(backoff, cfg.reconnect_min, sample, retry_after)).await;
@@ -236 +245,8 @@ impl std::fmt::Display for HelloRejected {
-        write!(f, "hello rejected: {}: {}", self.code, self.message)
+        let code = match self.code.as_str() {
+            "revoked" => "revoked",
+            "bad_proof" => "bad_proof",
+            "already_connected" => "already_connected",
+            "protocol_mismatch" => "protocol_mismatch",
+            _ => "unrecognized refusal",
+        };
+        write!(f, "hello rejected: {code}")
@@ -304 +320 @@ pub async fn probe_transport(
-        other => bail!("expected hello_ack, got {other:?}"),
+        _ => bail!("unexpected collector hello response"),
@@ -375 +391 @@ async fn handshake(
-        other => bail!("no hello_ack: {other:?}"),
+        _ => return Err(crate::transport::failure(crate::transport::Stage::HelloTimeout)),
@@ -431 +447 @@ async fn connect_once(
-        other => bail!("expected hello_ack, got {other:?}"),
+        _ => bail!("unexpected collector hello response"),
@@ -1073,4 +1089,43 @@ mod reconnect_tests {
-        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 0, None), Duration::from_secs(15));
-        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 15_000, None), Duration::from_secs(30));
-        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 0, Some(1)), Duration::from_secs(15));
-        assert_eq!(reconnect_delay(Duration::from_secs(30), floor, 0, Some(999)), Duration::from_secs(300));
+        assert_eq!(
+            reconnect_delay(Duration::from_secs(30), floor, 0, None),
+            Duration::from_secs(15)
+        );
+        assert_eq!(
+            reconnect_delay(Duration::from_secs(30), floor, 15_000, None),
+            Duration::from_secs(30)
+        );
+        assert_eq!(
+            reconnect_delay(Duration::from_secs(30), floor, 0, Some(1)),
+            Duration::from_secs(15)
+        );
+        assert_eq!(
+            reconnect_delay(Duration::from_secs(30), floor, 0, Some(999)),
+            Duration::from_secs(300)
+        );
+    }
+}
+
+/// Deterministic seam: production supplies a uniformly sampled offset.
+pub fn reconnect_delay(ceiling: Duration, floor: Duration, sample: u64, retry_after: Option<u64>) -> Duration {
+    let upper = ceiling.as_millis().min(u64::MAX as u128) as u64;
+    let lower = (upper / 2)
+        .max(floor.as_millis().min(u64::MAX as u128) as u64)
+        .min(upper);
+    let span = upper.saturating_sub(lower).saturating_add(1);
+    let jitter = Duration::from_millis(lower + sample % span);
+    jitter.max(Duration::from_secs(retry_after.unwrap_or(0).min(300)))
+}
+fn jitter_sample(ceiling: Duration, floor: Duration) -> u64 {
+    let upper = ceiling.as_millis().min(u64::MAX as u128) as u64;
+    let lower = (upper / 2)
+        .max(floor.as_millis().min(u64::MAX as u128) as u64)
+        .min(upper);
+    let span = upper.saturating_sub(lower).saturating_add(1);
+    let limit = u64::MAX - (u64::MAX % span);
+    loop {
+        let mut bytes = [0; 8];
+        getrandom::fill(&mut bytes).expect("OS randomness");
+        let sample = u64::from_le_bytes(bytes);
+        if sample < limit {
+            return sample;
+        }
```


## Task 5 — Doctor transport diagnostics

**Step 1:** inspect the preceding base and apply the test patch; observe its recorded RED. **Step 2:** apply the implementation patch and verify the targeted behavior. **Step 3:** review the diff against the constraints before pushing. Independent review is requested from the parent after this built plan.

Run: `nix develop -c cargo test -p hennery --bin hennery --locked doctor::`. Expected after implementation: exit 0; the execution table records integrated counts.

### 22ff22ec test(doctor): fail durable enrollment uncertainty without network probes

<!-- replay-commit: 22ff22ec0666fe22e04420e79bfd6a909a22bfc9 tree: 9429641fad6850106fb74802750d3a738b377ce3 -->

```diff
diff --git a/crates/hennery/src/doctor/tests.rs b/crates/hennery/src/doctor/tests.rs
index 3f12537b..89ad4929 100644
--- a/crates/hennery/src/doctor/tests.rs
+++ b/crates/hennery/src/doctor/tests.rs
@@ -2299,0 +2300,20 @@ fn the_collector_is_reached_step_by_step_and_its_hello_judged() {
+#[test]
+fn doctor_fails_an_uncertain_enrollment_and_changes_no_artifacts() {
+    let dir = tempfile::tempdir().unwrap();
+    let host = dir.path().join("host");
+    hennery_host::identity::create_private_dir(&host).unwrap();
+    let key = hennery_host::identity::HostKey::from_seed([57; 32]);
+    key.save(&host.join("host.key.pending")).unwrap();
+    let endpoint = hennery_host::transport::CollectorEndpoint::public("https://c.example").unwrap();
+    let attempt = hennery_host::enrollment::EnrollmentAttempt::new(&endpoint, Default::default(), &key, None);
+    attempt.save(&host).unwrap();
+    let before = snapshot(&host);
+    let fake = Fake::none();
+    let cx = machine(dir.path(), Platform::Linux, &fake);
+    let findings = checked(&cx, Dirs::by_contents(host.clone(), Found::Given), &nothing, &host);
+    let seven = line(&findings, 7);
+    assert_eq!(seven.status, Status::Fail, "{seven:?}");
+    assert!(seven.summary.contains(&attempt.attempt_id), "{seven:?}");
+    assert_eq!(snapshot(&host), before);
+}
+
```

### 0633c91a feat(doctor): diagnose WSS with saved trust and durable pairing state

<!-- replay-commit: 0633c91ae2be208f7923ea7ff40e2c850fd7fdbb tree: 179763c37e52cff4fb521f61422e51a2d353f7c0 -->

```diff
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 9742a8e3..572aaafd 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -241,0 +242,8 @@ fn read_config(path: &Path) -> Result<HostToml> {
+/// Inspect transport configuration without reading a private key.
+pub fn inspect_transport(data_dir: &Path) -> Result<()> {
+    let config = read_config(&data_dir.join(CONFIG_FILE))?;
+    if matches!(config.collector_tls, CollectorTrust::CaBundle { .. }) {
+        crate::transport::CollectorTransport::new(CollectorEndpoint::stored(&config.collector)?, config.collector_tls)?;
+    }
+    Ok(())
+}
diff --git a/crates/hennery/src/doctor/collector.rs b/crates/hennery/src/doctor/collector.rs
index 6a34c739..d0f49d72 100644
--- a/crates/hennery/src/doctor/collector.rs
+++ b/crates/hennery/src/doctor/collector.rs
@@ -14,0 +15 @@ use hennery_host::identity::Paired;
+use hennery_host::transport::{CollectorEndpoint, CollectorTransport, CollectorTrust};
@@ -16 +16,0 @@ use reqwest::Url;
-use std::net::ToSocketAddrs;
@@ -91,4 +91,12 @@ pub fn healthz(base: &Url) -> Health {
-    let Ok(url) = base.join("/healthz") else {
-        return Health::Failed(format!("{} cannot take a path", shown_url(base.as_str())));
-    };
-    let https = url.scheme() == "https";
+    healthz_with(base, CollectorTrust::System)
+}
+fn healthz_with(base: &Url, trust: CollectorTrust) -> Health {
+    let transport =
+        CollectorEndpoint::public(base.as_str()).and_then(|endpoint| CollectorTransport::new(endpoint, trust));
+    match transport {
+        Ok(transport) => healthz_transport(&transport),
+        Err(_) => Health::Failed("collector endpoint or trust configuration failed".into()),
+    }
+}
+fn healthz_transport(transport: &CollectorTransport) -> Health {
+    let transport = transport.clone();
@@ -96,11 +104,4 @@ pub fn healthz(base: &Url) -> Health {
-        let client = match reqwest::Client::builder()
-            .no_proxy()
-            .redirect(reqwest::redirect::Policy::none())
-            .timeout(STEP_TIMEOUT)
-            .build()
-        {
-            Ok(client) => client,
-            Err(err) => return Health::Failed(quoted(&err.to_string())),
-        };
-        match client.get(url).send().await {
-            Ok(response) => Health::Answered {
+        let operation = async {
+            let client = transport.http().await?;
+            let response = client.get(transport.endpoint.origin().join("/healthz")?).send().await?;
+            Ok::<_, anyhow::Error>(Health::Answered {
@@ -113,26 +114,8 @@ pub fn healthz(base: &Url) -> Health {
-            },
-            Err(err) => {
-                // Without the URL: a name with "tls" in it is not a TLS
-                // failure, and a URL's credentials are not printed.
-                let err = err.without_url();
-                // reqwest's own text names none of its causes: the chain is
-                // walked, and the innermost cause is the one shown.
-                let mut chain = err.to_string();
-                let mut why = chain.clone();
-                let mut cause = std::error::Error::source(&err);
-                while let Some(inner) = cause {
-                    why = inner.to_string();
-                    chain = format!("{chain}: {why}");
-                    cause = inner.source();
-                }
-                let lower = chain.to_ascii_lowercase();
-                // Over https, step 3 has just reached this address: a
-                // connect that fails, not out of time, is the handshake's,
-                // even when its words name neither TLS nor a certificate
-                // (plain http behind an https URL: "corrupt message").
-                let handshake = https && err.is_connect() && !err.is_timeout();
-                if handshake || lower.contains("certificate") || lower.contains("tls") {
-                    Health::Tls(quoted(&why))
-                } else {
-                    Health::Failed(quoted(&why))
-                }
+            })
+        };
+        match tokio::time::timeout(STEP_TIMEOUT, operation).await {
+            Ok(Ok(health)) => health,
+            Ok(Err(error))
+                if hennery_host::transport::classify(error.as_ref()) == hennery_host::transport::Stage::Tls =>
+            {
+                Health::Tls("certificate chain/name/validity or TLS protocol failed".into())
@@ -139,0 +123,2 @@ pub fn healthz(base: &Url) -> Health {
+            Ok(Err(_)) => Health::Failed("DNS/TCP/HTTP connection failed".into()),
+            Err(_) => Health::Failed("collector health deadline exceeded".into()),
@@ -195,0 +181,3 @@ fn collector_of(doctor: &Doctor, paired: &Paired) -> Result<(String, String), St
+        CollectorEndpoint::stored(&paired.collector_url)
+            .and_then(|stored| stored.require_compatible(&CollectorEndpoint::stored(&ws)?))
+            .map_err(|e| e.to_string())?;
@@ -216,0 +205,26 @@ pub fn collector(doctor: &Doctor) -> [Finding; 2] {
+    match hennery_host::enrollment::inspect(host) {
+        Ok(hennery_host::enrollment::EnrollmentState::Uncertain(attempt)) => {
+            verdict.fail(attempt.diagnostic(), "check Hosts, revoke the possible enrollment and explicitly archive this attempt; no identity probe was sent");
+            return [
+                Finding::Checked(verdict.check(7, "collector")),
+                Finding::NotRun {
+                    number: 8,
+                    why: NO_ANSWER,
+                },
+            ];
+        }
+        Err(err) => {
+            verdict.fail(
+                err.to_string(),
+                "preserve enrollment artifacts and complete explicit recovery; no identity probe was sent",
+            );
+            return [
+                Finding::Checked(verdict.check(7, "collector")),
+                Finding::NotRun {
+                    number: 8,
+                    why: NO_ANSWER,
+                },
+            ];
+        }
+        _ => {}
+    }
@@ -226 +240,5 @@ pub fn collector(doctor: &Doctor) -> [Finding; 2] {
-            verdict.warn(format!("{err}"), fix);
+            if host.join("host.toml.pending").exists() || host.join(hennery_host::enrollment::JOURNAL).exists() {
+                verdict.warn(format!("{err}"), fix);
+            } else {
+                verdict.fail(format!("{err}"), fix);
+            }
@@ -283 +301,22 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-    let port = url.port_or_known_default().unwrap_or(443);
+    let transport = match CollectorEndpoint::public(url.as_str())
+        .and_then(|endpoint| CollectorTransport::new(endpoint, paired.trust.clone()))
+    {
+        Ok(transport) => transport,
+        Err(_) => {
+            verdict.fail(
+                "collector trust configuration failed",
+                "install the intended CA or repair native roots; TLS validation is required",
+            );
+            return None;
+        }
+    };
+    verdict.ok(format!("trust: {}", paired.trust.source()));
+    if transport.root_warnings > 0 {
+        verdict.warn(
+            format!(
+                "native root loading had {} failures with usable roots",
+                transport.root_warnings
+            ),
+            "inspect native root sources",
+        );
+    }
@@ -285,3 +324,4 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-    let addresses = match resolve(name.trim_start_matches('[').trim_end_matches(']'), port) {
-        Some(addresses) if !addresses.is_empty() => addresses,
-        Some(_) => {
+    let endpoint = transport.endpoint.clone();
+    let addresses = match block_on(async move { endpoint.addresses().await }) {
+        Ok(addresses) if !addresses.is_empty() => addresses,
+        Ok(_) => {
@@ -294 +334 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-        None => {
+        Err(_) => {
@@ -309 +349 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-    let date = match healthz(&url) {
+    let date = match healthz_transport(&transport) {
@@ -331 +371,2 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-    hello(doctor, host, paired, &ws, verdict);
+    let _ = ws;
+    hello(doctor, host, paired, &transport, verdict);
@@ -335,16 +375,0 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-/// `name`'s addresses, looked up on a thread of its own: `None` when the
-/// lookup takes longer than `STEP_TIMEOUT` (the system's resolver has no
-/// bound of its own; the thread is left to end on its own).
-fn resolve(name: &str, port: u16) -> Option<Vec<std::net::SocketAddr>> {
-    let name = name.to_string();
-    let (tx, rx) = std::sync::mpsc::channel();
-    std::thread::spawn(move || {
-        let found = (name.as_str(), port)
-            .to_socket_addrs()
-            .map(|a| a.collect::<Vec<_>>())
-            .unwrap_or_default();
-        let _ = tx.send(found);
-    });
-    rx.recv_timeout(STEP_TIMEOUT).ok()
-}
-
@@ -367,3 +392,13 @@ fn connect(addresses: &[std::net::SocketAddr]) -> std::io::Result<()> {
-fn hello(doctor: &Doctor, host: &std::path::Path, paired: &Paired, ws: &str, verdict: &mut Verdict) {
-    if holder(doctor, &host.join(crate::lock::HOST_LOCK)) != Holder::Nobody {
-        verdict.ok("hello not sent: a host may be connected on this directory (see check 14)");
+fn hello(
+    doctor: &Doctor,
+    host: &std::path::Path,
+    paired: &Paired,
+    transport: &CollectorTransport,
+    verdict: &mut Verdict,
+) {
+    let check = transport.clone();
+    if let Err(error) = block_on(async move { check.preflight().await }) {
+        verdict.fail(
+            format!("WSS upgrade/nonce check failed: {error}"),
+            "forward the WebSocket upgrade and hennery-hello-nonce; remove ingress login redirects",
+        );
@@ -372,5 +407,2 @@ fn hello(doctor: &Doctor, host: &std::path::Path, paired: &Paired, ws: &str, ver
-    if ws.starts_with("wss://") {
-        verdict.warn(
-            "this binary's host cannot reach an https collector yet (no TLS for its WebSocket)",
-            "reach the collector over loopback or a tunnel until hosts speak wss",
-        );
+    if holder(doctor, &host.join(crate::lock::HOST_LOCK)) != Holder::Nobody {
+        verdict.ok("WSS upgrade/nonce checked; authentication not checked: hello not sent because a host may be connected on this directory (see check 14)");
@@ -379,5 +411,8 @@ fn hello(doctor: &Doctor, host: &std::path::Path, paired: &Paired, ws: &str, ver
-    let (ws, id, key) = (ws.to_string(), paired.host_id.clone(), paired.key.clone());
-    let standing =
-        block_on(
-            async move { tokio::time::timeout(HELLO_TIMEOUT, hennery_host::connection::probe(&ws, &id, &key)).await },
-        );
+    let (transport, id, key) = (transport.clone(), paired.host_id.clone(), paired.key.clone());
+    let standing = block_on(async move {
+        tokio::time::timeout(
+            HELLO_TIMEOUT,
+            hennery_host::connection::probe_transport(&transport, &id, &key),
+        )
+        .await
+    });
@@ -505 +540,5 @@ pub fn listeners(doctor: &Doctor) -> Finding {
-            Ok(url) => match healthz(&url) {
+            Ok(url) => match if doctor.collector_trust == CollectorTrust::System {
+                healthz(&url)
+            } else {
+                healthz_with(&url, doctor.collector_trust.clone())
+            } {
@@ -519,0 +559 @@ pub fn listeners(doctor: &Doctor) -> Finding {
+    verdict.ok("proxy-address attribution is unconfigured in W1; health success cannot prove header stripping or separate limiter budgets");
diff --git a/crates/hennery/src/doctor/mod.rs b/crates/hennery/src/doctor/mod.rs
index 2bedba3c..41cd3e79 100644
--- a/crates/hennery/src/doctor/mod.rs
+++ b/crates/hennery/src/doctor/mod.rs
@@ -43,0 +44,3 @@ pub struct DoctorArgs {
+    /// Collector-only external health trust; never overrides a host's saved policy.
+    #[arg(long)]
+    collector_ca_cert: Option<PathBuf>,
@@ -142,0 +146 @@ pub struct Doctor<'a> {
+    pub collector_trust: hennery_host::transport::CollectorTrust,
@@ -231,0 +236,6 @@ pub fn run(args: DoctorArgs) -> Result<ExitCode> {
+        collector_trust: args
+            .collector_ca_cert
+            .as_deref()
+            .map(hennery_host::transport::CollectorTrust::import)
+            .transpose()?
+            .unwrap_or_default(),
diff --git a/crates/hennery/src/doctor/service.rs b/crates/hennery/src/doctor/service.rs
index e0f2d3cd..ded36222 100644
--- a/crates/hennery/src/doctor/service.rs
+++ b/crates/hennery/src/doctor/service.rs
@@ -473,0 +474,13 @@ pub fn host_directory(doctor: &Doctor) -> Finding {
+    if host.join(hennery_host::identity::CONFIG_FILE).exists() || host.join(hennery_host::enrollment::JOURNAL).exists()
+    {
+        match hennery_host::identity::inspect_transport(host) {
+            Ok(()) => {}
+            Err(err) if host.join("host.toml.pending").exists() => {
+                verdict.warn(err.to_string(), "finish confirmed roll-forward with host run")
+            }
+            Err(err) => verdict.fail(
+                err.to_string(),
+                "repair transport configuration integrity or explicitly recover enrollment; preserve artifacts",
+            ),
+        }
+    }
diff --git a/crates/hennery/src/doctor/tests.rs b/crates/hennery/src/doctor/tests.rs
index 89ad4929..6974289c 100644
--- a/crates/hennery/src/doctor/tests.rs
+++ b/crates/hennery/src/doctor/tests.rs
@@ -144 +144,6 @@ fn checked(cx: &Context, dirs: Dirs, run: Runner, watched: &Path) -> Vec<Finding
-    let doctor = Doctor { cx, dirs, run };
+    let doctor = Doctor {
+        collector_trust: Default::default(),
+        cx,
+        dirs,
+        run,
+    };
@@ -687,0 +693 @@ fn the_loader_is_asked_first_and_getconf_never_on_nixos() {
+            collector_trust: Default::default(),
@@ -1220,0 +1227 @@ fn agent_env_of(cx: &Context, dirs: &Dirs) -> Vec<(String, String)> {
+        collector_trust: Default::default(),
@@ -2337,4 +2344 @@ fn each_step_to_the_collector_fails_on_its_own() {
-    assert!(
-        seven.summary.contains("only allowed to a loopback address"),
-        "{seven:?}"
-    );
+    assert!(seven.summary.contains("must not contain credentials"), "{seven:?}");
@@ -2355,4 +2359 @@ fn each_step_to_the_collector_fails_on_its_own() {
-    point_at(
-        &host,
-        &format!("ws://doctor:canary-7d-secret@{unavailable}/api/hosts/ws"),
-    );
+    point_at(&host, &format!("ws://{unavailable}/api/hosts/ws"));
@@ -2376 +2377 @@ fn each_step_to_the_collector_fails_on_its_own() {
-    point_at(&host, &format!("ws://tls:certificate@{closing}/api/hosts/ws"));
+    point_at(&host, &format!("ws://{closing}/api/hosts/ws"));
@@ -2384 +2385 @@ fn each_step_to_the_collector_fails_on_its_own() {
-    point_at(&host, &format!("wss://doctor:canary-7d-secret@{plain}/api/hosts/ws"));
+    point_at(&host, &format!("wss://{plain}/api/hosts/ws"));
@@ -2569,0 +2571 @@ fn the_collectors_secret_files_are_judged_as_the_collector_takes_them() {
+            collector_trust: Default::default(),
@@ -2701,0 +2704 @@ fn the_collectors_secret_files_are_judged_as_the_collector_takes_them() {
+        collector_trust: Default::default(),
@@ -2788,0 +2792,32 @@ fn check_10_reports_a_revoke_without_the_service_manager() {
+
+#[test]
+fn doctors_up_endpoint_derivation_refuses_a_secure_loopback_downgrade() {
+    let dir = tempfile::tempdir().unwrap();
+    let root = dir.path().join("up");
+    let host = paired(&root.join("host"));
+    point_at(&host, "wss://localhost/api/hosts/ws");
+    let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
+    trap.set_nonblocking(true).unwrap();
+    let collector = root.join("collector");
+    std::fs::create_dir_all(&collector).unwrap();
+    std::fs::write(
+        collector.join("config.toml"),
+        format!("listen=['{}']", trap.local_addr().unwrap()),
+    )
+    .unwrap();
+    let fake = Fake::none();
+    let cx = machine(dir.path(), Platform::Linux, &fake);
+    // Inspect only host check 7; listener health probes (check 16) do not
+    // authenticate an identity and are independently covered.
+    let doctor = Doctor {
+        cx: &cx,
+        dirs: Dirs::by_contents(root, Found::Given),
+        run: &nothing,
+        collector_trust: Default::default(),
+    };
+    let findings = collector::collector(&doctor);
+    let seven = line(&findings, 7);
+    assert_eq!(seven.status, Status::Fail);
+    assert!(seven.summary.contains("before hello"), "{seven:?}");
+    assert_eq!(trap.accept().unwrap_err().kind(), std::io::ErrorKind::WouldBlock);
+}
diff --git a/crates/hennery/tests/doctor.rs b/crates/hennery/tests/doctor.rs
index 95cd488d..d7da2d5c 100644
--- a/crates/hennery/tests/doctor.rs
+++ b/crates/hennery/tests/doctor.rs
@@ -94 +94 @@ fn doctor_reports_on_a_host_directory_and_changes_nothing() {
-        stdout.contains("fail  7 collector: nothing answers on 127.0.0.1:1"),
+        stdout.contains("fail  7 collector: trust: native system roots; nothing answers on 127.0.0.1:1"),
```


## Task 6 — Verification fixtures and integration repairs

**Step 1:** inspect the preceding base and apply the test patch; observe its recorded RED. **Step 2:** apply the implementation patch and verify the targeted behavior. **Step 3:** review the diff against the constraints before pushing. Independent review is requested from the parent after this built plan.

Run: `nix develop -c cargo test -p hennery --test wss --locked`. Expected after implementation: exit 0; the execution table records integrated counts.

### 2614ae05 test(transport): require structured certificate repair verdicts

<!-- replay-commit: 2614ae052395c8f266cafe114fcdb2d82724bc84 tree: 439ab447d6bdd8fb29dd3f5dd4bae2e9ef17e1b5 -->

```diff
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index 3c9fdc63..cb7d4784 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -471,0 +472,18 @@ mod tests {
+
+#[cfg(test)]
+mod diagnostic_tests {
+    use super::*;
+    #[test]
+    fn certificate_verdicts_are_structured_not_guessed_from_words() {
+        use rustls::CertificateError;
+        for (certificate, stage) in [
+            (CertificateError::UnknownIssuer, Stage::TlsUnknownIssuer),
+            (CertificateError::NotValidForName, Stage::TlsNameMismatch),
+            (CertificateError::Expired, Stage::TlsExpired),
+            (CertificateError::NotValidYet, Stage::TlsNotYetValid),
+        ] {
+            assert_eq!(classify(&rustls::Error::InvalidCertificate(certificate)), stage);
+        }
+        assert_eq!(classify(&std::io::Error::other("tls certificate words")), Stage::Connect);
+    }
+}
```

### 79edfb42 fix(transport): harden recovery and verify TLS failure boundaries

<!-- replay-commit: 79edfb42f6f6fc3a87b8a56c3578d61d6876bf4d tree: 1adda4894385ad2421433dff5535fde304b66475 -->

```diff
diff --git a/Cargo.lock b/Cargo.lock
index 32f58faf..d9cf1c62 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -1496,0 +1497 @@ dependencies = [
+ "futures",
@@ -1693,0 +1695 @@ dependencies = [
+ "rcgen",
@@ -1695,0 +1698 @@ dependencies = [
+ "rustls",
@@ -1700,0 +1704 @@ dependencies = [
+ "tokio-rustls",
diff --git a/README.md b/README.md
index 48e41e38..d8ea2051 100644
--- a/README.md
+++ b/README.md
@@ -36,2 +36,3 @@ Known limitations:
-- Hosts cannot connect over `wss://` yet; remote hosts reach the collector
-  through an SSH tunnel.
+- Hosts support verified `wss://`; the public proxy deployment and separate
+  client rate-limit budgets are still pending. Restrict public ingress until
+  those deployment checks are complete.
@@ -138,2 +139,8 @@ If the setup link has expired, `hennery admin setup-url` prints a fresh one.
-Hosts currently connect only over loopback HTTP. On the other machine,
-open an SSH tunnel to the collector with
+With a verified HTTPS front end, use the public `https://` origin printed by
+**Hosts → Add host**: the host enrolls over HTTPS and runs over WSS. System
+roots are the default. `host join --ca-cert <file>` imports a private CA for
+this collector only and saves it; browsers and adapters need their own trust
+configuration. Use `hennery doctor` to check TLS, health and the host upgrade.
+
+The SSH tunnel remains an optional deployment choice. On the other machine,
+open it with
@@ -146,2 +153 @@ For browser access over HTTPS, a reverse proxy on the collector's machine
-can serve `up` at an `https://` address. This does not enable secure
-WebSockets for hosts; they still use the tunnel. If `up` is already running,
+can serve `up` at an `https://` address, including its host WebSocket. If `up` is already running,
@@ -164 +170 @@ minutes, after asking for your password again if a fresh step-up is needed.
-Its printed command uses the public URL; adapt it to the tunnel's
+Its printed command uses the public URL; when choosing the tunnel, adapt it to the
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index 7704b4be..bdaa8f91 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -11,0 +12,14 @@ pub const RECOVERY: &str = "enrollment.recovery.toml";
+const ARCHIVE_FILES: [&str; 6] = [
+    JOURNAL,
+    "host.key.pending",
+    "host.toml.pending",
+    "host.key.pending.tmp",
+    "host.toml.pending.tmp",
+    "enrollment.pending.toml.tmp",
+];
+pub fn has_artifacts(dir: &Path) -> bool {
+    ARCHIVE_FILES
+        .into_iter()
+        .chain([RECOVERY])
+        .any(|name| dir.join(name).symlink_metadata().is_ok())
+}
@@ -119,0 +134,9 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
+        if ARCHIVE_FILES[3..]
+            .iter()
+            .any(|name| dir.join(name).symlink_metadata().is_ok())
+        {
+            bail!(
+                "pending enrollment fragments require explicit archive recovery with id {}; no automatic enrollment is allowed",
+                artifacts_id(dir)?
+            );
+        }
@@ -157,2 +180 @@ pub(crate) fn clear_confirmed(dir: &Path) -> Result<()> {
-            std::fs::remove_file(dir.join(JOURNAL))?;
-            fsync_parent(&dir.join(JOURNAL))?;
+            crate::identity::durable_remove(&dir.join(JOURNAL))?;
@@ -166,0 +189,33 @@ pub(crate) fn clear_confirmed(dir: &Path) -> Result<()> {
+#[derive(Serialize, Deserialize)]
+#[serde(deny_unknown_fields)]
+struct ArchiveIntent {
+    attempt_id: String,
+    files: Vec<String>,
+}
+/// An identifier bound to legacy or damaged artifacts, without exposing keys.
+pub fn artifacts_id(dir: &Path) -> Result<String> {
+    use sha2::{Digest, Sha256};
+    let mut hash = Sha256::new();
+    for name in ARCHIVE_FILES {
+        let path = dir.join(name);
+        if path.try_exists()? {
+            hash.update(name.as_bytes());
+            hash.update(crate::identity::read_regular(&path, 512 * 1024)?.as_bytes());
+        }
+    }
+    Ok(format!("artifacts-{}", hex::encode(hash.finalize())))
+}
+/// Recovery archives always require a subsequent explicit join. up and its
+/// automatic host join must not mint a code after any local archive action.
+pub fn require_automatic_join_allowed(dir: &Path) -> Result<()> {
+    if dir.try_exists()?
+        && std::fs::read_dir(dir)?
+            .filter_map(Result::ok)
+            .any(|entry| entry.file_name().to_string_lossy().starts_with("enrollment-archive-"))
+    {
+        bail!(
+            "enrollment was archived; automatic pairing is suppressed. Check remote Hosts and use explicit `hennery host join` when recovery is complete"
+        );
+    }
+    Ok(())
+}
@@ -169,2 +224,8 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    let attempt = if marker.try_exists()? {
-        read_attempt(&marker)?
+    let intent = if marker.try_exists()? {
+        let text = crate::identity::read_regular(&marker, 8192)?;
+        let intent: ArchiveIntent =
+            toml::from_str(&text).map_err(|_| anyhow::anyhow!("malformed archive recovery marker; preserve it"))?;
+        if intent.files.is_empty() || intent.files.iter().any(|name| !ARCHIVE_FILES.contains(&name.as_str())) {
+            bail!("invalid archive recovery marker");
+        }
+        intent
@@ -172,3 +233,23 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-        match inspect(dir)? {
-            EnrollmentState::Uncertain(attempt) => attempt,
-            _ => bail!("only an uncertain attempt may be archived; confirmed receipts must roll forward"),
+        if matches!(inspect(dir), Ok(EnrollmentState::Confirmed(_))) {
+            bail!("confirmed enrollment must roll forward, never be archived as uncertain");
+        }
+        let expected = if dir.join(JOURNAL).try_exists()? {
+            read_attempt(&dir.join(JOURNAL)).ok().map(|a| a.attempt_id)
+        } else {
+            None
+        }
+        .unwrap_or(artifacts_id(dir)?);
+        if expected != attempt_id {
+            bail!("archive attempt id does not match; for legacy or malformed artifacts use id {expected}");
+        }
+        let files: Vec<_> = ARCHIVE_FILES
+            .into_iter()
+            .filter(|name| dir.join(name).exists())
+            .map(str::to_string)
+            .collect();
+        if files.is_empty() {
+            bail!("no active enrollment artifacts to archive");
+        }
+        ArchiveIntent {
+            attempt_id: expected,
+            files,
@@ -177 +258 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    if attempt.attempt_id != attempt_id {
+    if intent.attempt_id != attempt_id {
@@ -179,0 +261,7 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
+    if uuid::Uuid::parse_str(attempt_id).is_err()
+        && (!attempt_id.starts_with("artifacts-")
+            || attempt_id.len() != 74
+            || !attempt_id[10..].bytes().all(|b| b.is_ascii_hexdigit()))
+    {
+        bail!("invalid archive attempt id");
+    }
@@ -182,3 +270 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    // Copies are durable before the active marker can be cleared. Repeating
-    // after any interrupted boundary uses these same immutable artifacts.
-    for name in [JOURNAL, "host.key.pending"] {
+    for name in &intent.files {
@@ -188 +274 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-            let bytes = std::fs::read(&from)?;
+            let bytes = crate::identity::read_regular(&from, 512 * 1024)?.into_bytes();
@@ -199 +285 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-        write_private(&marker, toml::to_string(&attempt)?.as_bytes())?;
+        write_private(&marker, toml::to_string(&intent)?.as_bytes())?;
@@ -201 +287 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    for name in ["host.key.pending", JOURNAL] {
+    for name in &intent.files {
@@ -209 +295,7 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    fsync_parent(&marker)
+    if let Err(error) = fsync_parent(&marker) {
+        // Retain the blocking marker when cleanup visibility changed but
+        // durability did not finish. Archived copies were already fsynced.
+        let _ = write_private(&marker, toml::to_string(&intent)?.as_bytes());
+        return Err(error.context("archive cleanup durability uncertain; repeat explicit archive recovery"));
+    }
+    Ok(())
@@ -326,0 +419,22 @@ mod tests {
+
+#[cfg(test)]
+mod recovery_tests {
+    use super::*;
+    #[test]
+    fn legacy_artifacts_archive_under_their_bound_id_and_never_auto_pair() {
+        let dir = tempfile::tempdir().unwrap();
+        HostKey::from_seed([81; 32])
+            .save(&dir.path().join("host.key.pending"))
+            .unwrap();
+        let before = std::fs::read(dir.path().join("host.key.pending")).unwrap();
+        let id = artifacts_id(dir.path()).unwrap();
+        assert!(archive(dir.path(), "artifacts-wrong").is_err());
+        archive(dir.path(), &id).unwrap();
+        assert_eq!(
+            std::fs::read(dir.path().join(format!("enrollment-archive-{id}/host.key.pending"))).unwrap(),
+            before
+        );
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
+        assert!(require_automatic_join_allowed(dir.path()).is_err());
+    }
+}
diff --git a/crates/hennery-host/src/git.rs b/crates/hennery-host/src/git.rs
index 6f1b5d37..2447cabd 100644
--- a/crates/hennery-host/src/git.rs
+++ b/crates/hennery-host/src/git.rs
@@ -297 +297,8 @@ mod tests {
-            .args(["-c", "user.name=test", "-c", "user.email=test@example.invalid"])
+            .args([
+                "-c",
+                "user.name=test",
+                "-c",
+                "user.email=test@example.invalid",
+                "-c",
+                "commit.gpgsign=false",
+            ])
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 572aaafd..e770da14 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -12 +12 @@ use std::io::Write;
-use std::os::unix::fs::{DirBuilderExt, OpenOptionsExt, PermissionsExt};
+use std::os::unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt, PermissionsExt};
@@ -62,0 +63,10 @@ pub(crate) fn durable_rename(from: &Path, to: &Path) -> Result<()> {
+pub(crate) fn durable_remove(path: &Path) -> Result<()> {
+    storage_boundary(path, "before_remove")?;
+    std::fs::remove_file(path)?;
+    fsync_parent(path).map_err(|_| {
+        DurabilityUncertain {
+            path: path.to_path_buf(),
+        }
+        .into()
+    })
+}
@@ -258 +268,8 @@ pub(crate) fn read_regular(path: &Path, bound: usize) -> Result<String> {
-    if !meta.is_file() || meta.permissions().mode() & 0o022 != 0 {
+    // SAFETY: geteuid has no arguments or memory preconditions.
+    let uid = unsafe { libc::geteuid() };
+    let parent = path.parent().context("transport configuration parent")?;
+    if !meta.is_file()
+        || meta.permissions().mode() & 0o022 != 0
+        || meta.uid() != uid
+        || std::fs::metadata(parent)?.permissions().mode() & 0o022 != 0
+    {
@@ -703,0 +721,42 @@ cdf6b48fb39bfaa9b5a3cd01538280ec9e6d50c8831e9aae4d791f68112a6c04";
+
+#[cfg(test)]
+mod transport_config_tests {
+    use super::*;
+    #[test]
+    fn saved_transport_refuses_writable_unknown_and_credential_bearing_configuration() {
+        let dir = tempfile::tempdir().unwrap();
+        let paired = Paired {
+            collector_url: "wss://localhost/api/hosts/ws".into(),
+            trust: CollectorTrust::System,
+            host_id: "host-0123456789abcdef".into(),
+            key: HostKey::from_seed([110; 32]),
+            workspace_roots: vec![],
+        };
+        paired.save(dir.path()).unwrap();
+        let path = dir.path().join(CONFIG_FILE);
+        let original = std::fs::read_to_string(&path).unwrap();
+        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o622)).unwrap();
+        assert!(Paired::read(dir.path()).is_err());
+        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
+        for extra in [
+            "mode='unknown'",
+            "mode='system'\nca_pem='private-canary'",
+            "mode='ca_bundle'",
+            "mode='system'\nextra='private-canary'",
+        ] {
+            let text = format!(
+                "collector='wss://localhost/api/hosts/ws'\nhost_id='host-0123456789abcdef'\n[collector_tls]\n{extra}"
+            );
+            std::fs::write(&path, text).unwrap();
+            let error = Paired::read(dir.path()).unwrap_err().to_string();
+            assert!(!error.contains("private-canary"));
+        }
+        std::fs::write(
+            &path,
+            original.replace("wss://localhost", "wss://user:private-canary@localhost"),
+        )
+        .unwrap();
+        let error = Paired::read(dir.path()).unwrap_err().to_string();
+        assert!(!error.contains("private-canary"));
+    }
+}
diff --git a/crates/hennery-host/src/pairing.rs b/crates/hennery-host/src/pairing.rs
index 079ddeb8..bb6d72f3 100644
--- a/crates/hennery-host/src/pairing.rs
+++ b/crates/hennery-host/src/pairing.rs
@@ -229,0 +230 @@ pub async fn complete_join(prepared: PreparedJoin, code: &str, data_dir: &Path,
+    crate::identity::storage_boundary(&data_dir.join(crate::enrollment::JOURNAL), "before_post")?;
@@ -253,2 +254,4 @@ pub async fn complete_join(prepared: PreparedJoin, code: &str, data_dir: &Path,
-    if let Err(err) = crate::connection::probe_transport(&transport, &host_id, &key).await {
-        bail!("paired as {host_id}; connection failed: {err}; identity retained for retry");
+    match crate::connection::probe_transport(&transport, &host_id, &key).await {
+        Ok(Standing::Accepted | Standing::Connected) => {}
+        Ok(other) => bail!("paired as {host_id}; connection failed: {other:?}; identity retained for retry"),
+        Err(err) => bail!("paired as {host_id}; connection failed: {err}; identity retained for retry"),
@@ -267,4 +270,2 @@ fn clear_rejected(dir: &Path) -> Result<()> {
-    std::fs::remove_file(dir.join("host.key.pending"))?;
-    fsync_parent(&dir.join(crate::enrollment::JOURNAL))?;
-    std::fs::remove_file(dir.join(crate::enrollment::JOURNAL))?;
-    fsync_parent(&dir.join(crate::enrollment::JOURNAL))
+    crate::identity::durable_remove(&dir.join("host.key.pending"))?;
+    crate::identity::durable_remove(&dir.join(crate::enrollment::JOURNAL))
@@ -501,0 +503,25 @@ mod tests {
+
+#[cfg(test)]
+mod alias_matrix {
+    use super::*;
+    #[test]
+    fn every_scheme_name_and_port_pair_obeys_plaintext_only_aliasing() {
+        let mut endpoints = Vec::new();
+        for scheme in ["ws", "wss"] {
+            for name in ["localhost", "127.0.0.1", "[::1]"] {
+                for port in [7117, 7118] {
+                    endpoints.push(format!("{scheme}://{name}:{port}/api/hosts/ws"));
+                }
+            }
+        }
+        for left in &endpoints {
+            for right in &endpoints {
+                assert_eq!(
+                    same_collector(left, right),
+                    left == right || (left.starts_with("ws://") && right.starts_with("ws://")),
+                    "{left} -> {right}"
+                );
+            }
+        }
+    }
+}
diff --git a/crates/hennery-host/src/runtime/agents.rs b/crates/hennery-host/src/runtime/agents.rs
index 8fdea186..a0c5a281 100644
--- a/crates/hennery-host/src/runtime/agents.rs
+++ b/crates/hennery-host/src/runtime/agents.rs
@@ -426 +426,7 @@ mod tests {
-        crate::identity::write_config_to(&dir.path().join(CONFIG_FILE), "ws://c/api/hosts/ws", "host-1", &key).unwrap();
+        crate::identity::write_config_to(
+            &dir.path().join(CONFIG_FILE),
+            "ws://localhost/api/hosts/ws",
+            "host-1",
+            &key,
+        )
+        .unwrap();
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index cb7d4784..494a9a48 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -109 +109,8 @@ fn ca_roots(pem: &str) -> Result<rustls::RootCertStore> {
-        if !tail.is_empty() || !parsed.basic_constraints().ok().flatten().is_some_and(|v| v.value.ca) {
+        if !tail.is_empty()
+            || !parsed.basic_constraints().ok().flatten().is_some_and(|v| v.value.ca)
+            || !parsed.validity().is_valid()
+            || parsed
+                .key_usage()
+                .map_err(|_| anyhow::anyhow!("invalid CA key usage"))?
+                .is_some_and(|usage| !usage.value.key_cert_sign())
+        {
@@ -139,0 +147,3 @@ impl CollectorEndpoint {
+        if input.contains('@') {
+            bail!("collector URL must not contain credentials");
+        }
@@ -223,0 +234,4 @@ pub enum Stage {
+    TlsUnknownIssuer,
+    TlsNameMismatch,
+    TlsExpired,
+    TlsNotYetValid,
@@ -232,0 +247,22 @@ pub struct TransportFailure(pub Stage);
+impl Stage {
+    pub fn is_tls(&self) -> bool {
+        matches!(
+            self,
+            Self::Tls | Self::TlsUnknownIssuer | Self::TlsNameMismatch | Self::TlsExpired | Self::TlsNotYetValid
+        )
+    }
+    pub fn remedy(&self) -> &'static str {
+        match self {
+            Self::TlsUnknownIssuer => "install the intended collector CA",
+            Self::TlsNameMismatch => "use the certificate's correct DNS name or IP SAN",
+            Self::TlsExpired => "renew the certificate and check the local clock",
+            Self::TlsNotYetValid => "check the local clock and certificate validity dates",
+            Self::Tls => "repair the TLS protocol or certificate chain",
+            Self::Dns => "repair collector DNS",
+            Self::Connect => "restore reachability",
+            Self::Upgrade { .. } => "forward WebSocket upgrades and remove ingress login redirects",
+            Self::MissingNonce => "preserve exactly one hennery-hello-nonce in the 101 response",
+            Self::HelloTimeout => "restore collector hello responses",
+        }
+    }
+}
@@ -235,5 +271 @@ impl std::fmt::Display for TransportFailure {
-        write!(
-            f,
-            "collector transport failed at {:?}; repair this stage without changing the host identity or disabling TLS validation",
-            self.0
-        )
+        write!(f, "collector transport failed at {:?}; {}", self.0, self.0.remedy())
@@ -252,2 +284,20 @@ pub fn classify(error: &(dyn std::error::Error + 'static)) -> Stage {
-        if err.is::<rustls::Error>() {
-            return Stage::Tls;
+        if let Some(tls) = err.downcast_ref::<tungstenite::error::TlsError>() {
+            return match tls {
+                tungstenite::error::TlsError::Rustls(inner) => classify(inner.as_ref()),
+                _ => Stage::Tls,
+            };
+        }
+        if let Some(tls) = err.downcast_ref::<rustls::Error>() {
+            return match tls {
+                rustls::Error::InvalidCertificate(rustls::CertificateError::UnknownIssuer) => Stage::TlsUnknownIssuer,
+                rustls::Error::InvalidCertificate(
+                    rustls::CertificateError::NotValidForName | rustls::CertificateError::NotValidForNameContext { .. },
+                ) => Stage::TlsNameMismatch,
+                rustls::Error::InvalidCertificate(
+                    rustls::CertificateError::Expired | rustls::CertificateError::ExpiredContext { .. },
+                ) => Stage::TlsExpired,
+                rustls::Error::InvalidCertificate(
+                    rustls::CertificateError::NotValidYet | rustls::CertificateError::NotValidYetContext { .. },
+                ) => Stage::TlsNotYetValid,
+                _ => Stage::Tls,
+            };
@@ -257 +307 @@ pub fn classify(error: &(dyn std::error::Error + 'static)) -> Stage {
-            && classify(inner) == Stage::Tls
+            && classify(inner).is_tls()
@@ -259 +309 @@ pub fn classify(error: &(dyn std::error::Error + 'static)) -> Stage {
-            return Stage::Tls;
+            return classify(inner);
@@ -280,0 +331,15 @@ impl CollectorTransport {
+        Self::with_loader(endpoint, trust, rustls_native_certs::load_native_certs)
+    }
+    #[cfg(feature = "test-hooks")]
+    pub fn with_native_roots(
+        endpoint: CollectorEndpoint,
+        trust: CollectorTrust,
+        loader: impl FnOnce() -> rustls_native_certs::CertificateResult,
+    ) -> Result<Self> {
+        Self::with_loader(endpoint, trust, loader)
+    }
+    fn with_loader(
+        endpoint: CollectorEndpoint,
+        trust: CollectorTrust,
+        loader: impl FnOnce() -> rustls_native_certs::CertificateResult,
+    ) -> Result<Self> {
@@ -295 +360 @@ impl CollectorTransport {
-                    let native = rustls_native_certs::load_native_certs();
+                    let native = loader();
@@ -365,2 +430,5 @@ impl CollectorTransport {
-                    tungstenite::Error::Tls(_) => failure(Stage::Tls),
-                    tungstenite::Error::Io(e) if classify(e) == Stage::Tls => failure(Stage::Tls),
+                    tungstenite::Error::Tls(e) => {
+                        let stage = classify(e);
+                        failure(if stage.is_tls() { stage } else { Stage::Tls })
+                    }
+                    tungstenite::Error::Io(e) if classify(e).is_tls() => failure(classify(e)),
@@ -487 +555,39 @@ mod diagnostic_tests {
-        assert_eq!(classify(&std::io::Error::other("tls certificate words")), Stage::Connect);
+        assert_eq!(
+            classify(&std::io::Error::other("tls certificate words")),
+            Stage::Connect
+        );
+    }
+}
+
+#[cfg(test)]
+mod ca_input_tests {
+    use super::*;
+    #[test]
+    fn ca_inputs_are_bounded_strict_regular_and_reject_leaf_and_private_key_material() {
+        let key = rcgen::KeyPair::generate().unwrap();
+        let leaf = rcgen::CertificateParams::new(vec!["localhost".into()])
+            .unwrap()
+            .self_signed(&key)
+            .unwrap();
+        assert!(ca_roots(&leaf.pem()).is_err());
+        assert!(ca_roots(&key.serialize_pem()).is_err());
+        let mut params = rcgen::CertificateParams::new(vec!["fixture".into()]).unwrap();
+        params.is_ca = rcgen::IsCa::Ca(rcgen::BasicConstraints::Unconstrained);
+        let pem = params.self_signed(&key).unwrap().pem();
+        assert!(ca_roots(&pem.repeat(32)).is_ok());
+        assert!(ca_roots(&pem.repeat(33)).is_err());
+        assert!(ca_roots(&" ".repeat(MAX_CA_BYTES + 1)).is_err());
+        assert!(ca_roots(&format!("{pem}junk")).is_err());
+        let dir = tempfile::tempdir().unwrap();
+        let input = dir.path().join("ca.pem");
+        std::fs::write(&input, &pem).unwrap();
+        assert!(CollectorTrust::import(&input).is_ok());
+        let link = dir.path().join("link.pem");
+        std::os::unix::fs::symlink(&input, &link).unwrap();
+        assert!(CollectorTrust::import(&link).is_err());
+        assert!(CollectorTrust::import(dir.path()).is_err());
+        let fifo = dir.path().join("fifo");
+        let cpath = std::ffi::CString::new(fifo.as_os_str().as_encoded_bytes()).unwrap();
+        // SAFETY: creates a FIFO at a fresh scratch path.
+        assert_eq!(unsafe { libc::mkfifo(cpath.as_ptr(), 0o600) }, 0);
+        assert!(CollectorTrust::import(&fifo).is_err());
diff --git a/crates/hennery-host/tests/transport.rs b/crates/hennery-host/tests/transport.rs
index fc269060..c2e9ef61 100644
--- a/crates/hennery-host/tests/transport.rs
+++ b/crates/hennery-host/tests/transport.rs
@@ -103 +103 @@ async fn private_ca_wss_and_https_share_the_same_verifier() {
-    assert_ne!(hennery_host::transport::classify(&error), Stage::Tls);
+    assert_ne!(hennery_host::transport::classify(&error), Stage::TlsNameMismatch);
@@ -119 +119,4 @@ async fn failed_name_verification_sends_no_websocket_or_http_request() {
-    assert_eq!(err.downcast_ref::<TransportFailure>().unwrap().0, Stage::Tls);
+    assert_eq!(
+        err.downcast_ref::<TransportFailure>().unwrap().0,
+        Stage::TlsNameMismatch
+    );
@@ -129 +132 @@ async fn failed_name_verification_sends_no_websocket_or_http_request() {
-    assert_eq!(hennery_host::transport::classify(&err), Stage::Tls);
+    assert_eq!(hennery_host::transport::classify(&err), Stage::TlsNameMismatch);
@@ -227,0 +231,62 @@ async fn transport_move_preserves_identity_outbox_and_configuration_and_reports_
+
+#[tokio::test]
+#[cfg(feature = "test-hooks")]
+async fn injected_system_roots_share_the_wss_and_http_policy_without_fallback() {
+    let fixture = fixture(
+        vec!["localhost".into()],
+        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
+    )
+    .await;
+    let endpoint = CollectorEndpoint::public(&fixture.url).unwrap();
+    assert!(CollectorTransport::with_native_roots(endpoint.clone(), CollectorTrust::System, Default::default).is_err());
+    let cert = rustls_pemfile::certs(&mut fixture.pem.as_bytes())
+        .next()
+        .unwrap()
+        .unwrap();
+    let transport = CollectorTransport::with_native_roots(endpoint.clone(), CollectorTrust::System, || {
+        let mut result = rustls_native_certs::CertificateResult::default();
+        result.certs = vec![cert, vec![1, 2, 3].into()];
+        result
+    })
+    .unwrap();
+    assert_eq!(transport.root_warnings, 1);
+    transport.preflight().await.unwrap();
+    let error = transport
+        .http()
+        .await
+        .unwrap()
+        .get(format!("{}/healthz", fixture.url))
+        .send()
+        .await
+        .unwrap_err();
+    assert!(!hennery_host::transport::classify(&error).is_tls());
+    let explicit = CollectorTransport::with_native_roots(
+        endpoint,
+        CollectorTrust::CaBundle {
+            pem: fixture.pem.clone(),
+        },
+        || panic!("explicit CA must ignore native roots and SSL overrides"),
+    )
+    .unwrap();
+    explicit.preflight().await.unwrap();
+    let plain = CollectorTransport::with_native_roots(
+        CollectorEndpoint::public("http://localhost:7117").unwrap(),
+        CollectorTrust::System,
+        || panic!("plaintext must not load roots"),
+    );
+    assert!(plain.is_ok());
+}
+
+#[test]
+fn actual_native_roots_load_without_bundled_fallback() {
+    let native = rustls_native_certs::load_native_certs();
+    let any_usable = native.certs.iter().any(|cert| {
+        let mut roots = rustls::RootCertStore::empty();
+        roots.add(cert.clone()).is_ok()
+    });
+    let loaded = CollectorTransport::new(
+        CollectorEndpoint::public("https://localhost").unwrap(),
+        CollectorTrust::System,
+    );
+    assert_eq!(loaded.is_ok(), any_usable);
+}
diff --git a/crates/hennery-testkit/Cargo.toml b/crates/hennery-testkit/Cargo.toml
index 43ac68cf..f7b3d92f 100644
--- a/crates/hennery-testkit/Cargo.toml
+++ b/crates/hennery-testkit/Cargo.toml
@@ -24,0 +25,3 @@ reqwest.workspace = true
+rcgen = "=0.14.10"
+rustls.workspace = true
+tokio-rustls = { version = "0.26", default-features = false, features = ["ring", "tls12"] }
diff --git a/crates/hennery-testkit/src/lib.rs b/crates/hennery-testkit/src/lib.rs
index ca5777fd..9a47726f 100644
--- a/crates/hennery-testkit/src/lib.rs
+++ b/crates/hennery-testkit/src/lib.rs
@@ -3,0 +4 @@ use serde::{Deserialize, Serialize};
+pub mod tls;
diff --git a/crates/hennery-testkit/src/tls.rs b/crates/hennery-testkit/src/tls.rs
new file mode 100644
index 00000000..e5c8c6b5
--- /dev/null
+++ b/crates/hennery-testkit/src/tls.rs
@@ -0,0 +1,152 @@
+//! Disposable TLS front end for transport tests. Never changes OS trust.
+use rcgen::{BasicConstraints, CertificateParams, IsCa, KeyPair};
+use std::{
+    net::SocketAddr,
+    sync::{
+        Arc, Mutex, RwLock,
+        atomic::{AtomicBool, AtomicUsize, Ordering},
+    },
+};
+
+pub struct TestCa {
+    params: CertificateParams,
+    key: KeyPair,
+    pub pem: String,
+}
+impl Default for TestCa {
+    fn default() -> Self {
+        Self::new()
+    }
+}
+impl TestCa {
+    pub fn new() -> Self {
+        let key = KeyPair::generate().unwrap();
+        let mut params = CertificateParams::new(vec!["fixture-ca".into()]).unwrap();
+        let name: String = key
+            .public_key_raw()
+            .iter()
+            .rev()
+            .take(12)
+            .map(|byte| format!("{byte:02x}"))
+            .collect();
+        params
+            .distinguished_name
+            .push(rcgen::DnType::CommonName, format!("fixture-ca-{name}"));
+        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
+        let pem = params.self_signed(&key).unwrap().pem();
+        Self { params, key, pem }
+    }
+    pub fn server(&self, names: Vec<String>, validity: &str) -> Arc<rustls::ServerConfig> {
+        let mut params = CertificateParams::new(names).unwrap();
+        match validity {
+            "expired" => {
+                params.not_before = rcgen::date_time_ymd(2000, 1, 1);
+                params.not_after = rcgen::date_time_ymd(2001, 1, 1);
+            }
+            "future" => {
+                params.not_before = rcgen::date_time_ymd(2098, 1, 1);
+                params.not_after = rcgen::date_time_ymd(2099, 1, 1);
+            }
+            _ => {}
+        }
+        let key = KeyPair::generate().unwrap();
+        let issuer = rcgen::Issuer::from_params(&self.params, &self.key);
+        let certs = if matches!(validity, "missing_intermediate" | "intermediate") {
+            let mut intermediate = CertificateParams::new(vec!["fixture-intermediate".into()]).unwrap();
+            intermediate
+                .distinguished_name
+                .push(rcgen::DnType::CommonName, "fixture-intermediate");
+            intermediate.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
+            let intermediate_key = KeyPair::generate().unwrap();
+            let certificate = intermediate.signed_by(&intermediate_key, &issuer).unwrap();
+            let issuer = rcgen::Issuer::from_params(&intermediate, &intermediate_key);
+            let leaf = params.signed_by(&key, &issuer).unwrap();
+            let mut certs = vec![leaf.der().clone()];
+            if validity == "intermediate" {
+                certs.push(certificate.der().clone());
+            }
+            certs
+        } else {
+            vec![params.signed_by(&key, &issuer).unwrap().der().clone()]
+        };
+        Arc::new(
+            rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
+                .with_safe_default_protocol_versions()
+                .unwrap()
+                .with_no_client_auth()
+                .with_single_cert(
+                    certs,
+                    rustls::pki_types::PrivatePkcs8KeyDer::from(key.serialize_der()).into(),
+                )
+                .unwrap(),
+        )
+    }
+}
+pub struct Proxy {
+    pub addr: SocketAddr,
+    pub verified: Arc<AtomicUsize>,
+    config: Arc<RwLock<Arc<rustls::ServerConfig>>>,
+    paused: Arc<AtomicBool>,
+    connections: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
+    task: tokio::task::JoinHandle<()>,
+}
+impl Proxy {
+    pub async fn start(backend: SocketAddr, config: Arc<rustls::ServerConfig>) -> Self {
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let addr = listener.local_addr().unwrap();
+        let config = Arc::new(RwLock::new(config));
+        let tls = config.clone();
+        let paused = Arc::new(AtomicBool::new(false));
+        let pause = paused.clone();
+        let connections = Arc::new(Mutex::new(Vec::new()));
+        let tasks = connections.clone();
+        let verified = Arc::new(AtomicUsize::new(0));
+        let capture = verified.clone();
+        let task = tokio::spawn(async move {
+            while let Ok((stream, _)) = listener.accept().await {
+                if pause.load(Ordering::SeqCst) {
+                    continue;
+                }
+                let acceptor = tokio_rustls::TlsAcceptor::from(tls.read().unwrap().clone());
+                let capture = capture.clone();
+                tasks.lock().unwrap().push(tokio::spawn(async move {
+                    if let Ok(mut client) = acceptor.accept(stream).await {
+                        capture.fetch_add(1, Ordering::SeqCst);
+                        if let Ok(mut backend) = tokio::net::TcpStream::connect(backend).await {
+                            let _ = tokio::io::copy_bidirectional(&mut client, &mut backend).await;
+                        }
+                    }
+                }));
+            }
+        });
+        Self {
+            addr,
+            verified,
+            config,
+            paused,
+            connections,
+            task,
+        }
+    }
+    pub fn origin(&self) -> String {
+        format!("https://localhost:{}", self.addr.port())
+    }
+    pub fn pause(&self) {
+        self.paused.store(true, Ordering::SeqCst);
+        for task in self.connections.lock().unwrap().drain(..) {
+            task.abort();
+        }
+    }
+    pub fn renew_and_resume(&self, config: Arc<rustls::ServerConfig>) {
+        *self.config.write().unwrap() = config;
+        self.paused.store(false, Ordering::SeqCst);
+    }
+}
+impl Drop for Proxy {
+    fn drop(&mut self) {
+        self.task.abort();
+        for task in self.connections.lock().unwrap().drain(..) {
+            task.abort();
+        }
+    }
+}
diff --git a/crates/hennery-testkit/tests/e2e.rs b/crates/hennery-testkit/tests/e2e.rs
index 632c85e5..0bbbb45d 100644
--- a/crates/hennery-testkit/tests/e2e.rs
+++ b/crates/hennery-testkit/tests/e2e.rs
@@ -1530,0 +1531,82 @@ async fn the_project_picker_lists_and_browses_a_real_hosts_projects() {
+
+#[tokio::test]
+async fn wss_outage_renewal_and_collector_restart_keep_one_adapter_and_deliver_one_answer() {
+    use hennery_testkit::tls::{Proxy, TestCa};
+    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery-fake-acp"));
+    let dir = tempfile::tempdir().unwrap();
+    let db = dir.path().join("hennery.db");
+    let collector = Collector::start(&db, None).await;
+    let addr = collector.addr;
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let pid_file = dir.path().join("adapter-child.pid");
+    let script = FakeScript {
+        grandchild_pid_file: Some(pid_file.to_string_lossy().into()),
+        chunks: (1..=6).map(|n| format!("{n}.")).collect(),
+        chunk_delay_ms: 250,
+        ..asking(vec![hennery_testkit::FakeAsk::Permission])
+    };
+    let mut fake = AgentCommand::parse(env!("CARGO_BIN_EXE_hennery-fake-acp")).unwrap();
+    fake.env
+        .push((SCRIPT_ENV.into(), serde_json::to_string(&script).unwrap()));
+    let mut cfg = host_config(addr, &dir.path().join("host"), fake);
+    cfg.collector_url = hennery_host::pairing::collector_ws_url(&proxy.origin()).unwrap();
+    cfg.trust = hennery_host::transport::CollectorTrust::CaBundle { pem: ca.pem.clone() };
+    let (stop, stopped) = tokio::sync::oneshot::channel();
+    let host = tokio::spawn(hennery_host::run_until(cfg, async {
+        let _ = stopped.await;
+    }));
+    let _reap = ReapGroup(pid_file.clone());
+    let c = client(&collector);
+    wait_host_connected(&c, &collector).await;
+    let session = start_session(&c, &collector).await;
+    prompt(&c, &collector, &session).await;
+    let pending = open_question(&c, &collector, &session).await;
+    let pid = wait_for("one adapter child", || async { pid_from(&pid_file) }).await;
+    proxy.pause();
+    wait_for("TLS host offline", || async {
+        (!collector.state.hub.connected_hosts().contains(&"host-1".to_string())).then_some(())
+    })
+    .await;
+    assert_eq!(
+        answer(&c, &collector, &session, &pending, json!({"option_id":"allow"}))
+            .await
+            .0,
+        202
+    );
+    assert_ne!(delivered(&collector, &pending), Some(true));
+    let bad_ca = TestCa::new();
+    proxy.renew_and_resume(bad_ca.server(vec!["localhost".into()], "valid"));
+    tokio::time::sleep(Duration::from_millis(700)).await;
+    assert_eq!(pid_from(&pid_file), Some(pid));
+    assert!(hennery_testkit::pid_alive(pid));
+    assert!(!collector.state.hub.connected_hosts().contains(&"host-1".to_string()));
+    proxy.pause();
+    proxy.renew_and_resume(ca.server(vec!["localhost".into()], "valid"));
+    wait_for("answer reaches adapter", || async {
+        (delivered(&collector, &pending) == Some(true)).then_some(())
+    })
+    .await;
+    proxy.pause();
+    collector.stop().await;
+    tokio::time::sleep(Duration::from_millis(800)).await; // real offline facts
+    let collector = Collector::start(&db, Some(addr)).await;
+    proxy.renew_and_resume(ca.server(vec!["localhost".into()], "valid"));
+    let evs = wait_for("TLS transcript after recovery", || async {
+        let evs = events(&c, &collector, &session).await;
+        (!turn_ends(&evs).is_empty()).then_some(evs)
+    })
+    .await;
+    assert_eq!(agent_text(&evs), "permission:selected:allow1.2.3.4.5.6.");
+    assert_eq!(turn_ends(&evs).len(), 1);
+    assert_eq!(of_kind(&evs, "answer_result").len(), 1);
+    assert_eq!(of_kind(&evs, "user_turn").len(), 1);
+    let seqs: Vec<_> = evs.iter().filter_map(|e| e.host_seq).collect();
+    assert_eq!(seqs.iter().collect::<std::collections::BTreeSet<_>>().len(), seqs.len());
+    assert_eq!(pid_from(&pid_file), Some(pid));
+    assert!(hennery_testkit::pid_alive(pid));
+    stop.send(()).unwrap();
+    host.await.unwrap().unwrap();
+    wait_dead(pid).await;
+    collector.stop().await;
+}
diff --git a/crates/hennery-testkit/tests/join.rs b/crates/hennery-testkit/tests/join.rs
index 899fc8ab..816b88c5 100644
--- a/crates/hennery-testkit/tests/join.rs
+++ b/crates/hennery-testkit/tests/join.rs
@@ -434,0 +435,66 @@ async fn uncertain_enrollment_results_never_authorize_a_second_post_or_key() {
+
+#[tokio::test]
+async fn enrollment_storage_boundaries_never_replay_and_confirmed_receipts_roll_forward() {
+    use hennery_host::{
+        enrollment::{self, EnrollmentState},
+        identity::storage_hooks,
+    };
+    for (file, stage, post) in [
+        ("host.key.pending", "before_write", false),
+        ("host.key.pending", "before_file_sync", false),
+        ("host.key.pending", "before_rename", false),
+        ("host.key.pending", "directory_sync", false),
+        (enrollment::JOURNAL, "before_post", false),
+        (enrollment::JOURNAL, "before_write", false),
+        (enrollment::JOURNAL, "before_file_sync", false),
+        (enrollment::JOURNAL, "before_rename", false),
+        (enrollment::JOURNAL, "directory_sync", false),
+        ("host.toml.pending", "before_write", true),
+        ("host.toml.pending", "before_file_sync", true),
+        ("host.toml.pending", "before_rename", true),
+        ("host.toml.pending", "directory_sync", true),
+        ("host.key", "before_rename", true),
+        ("host.key", "directory_sync", true),
+        ("host.toml", "before_rename", true),
+        ("host.toml", "directory_sync", true),
+        (enrollment::JOURNAL, "before_remove", true),
+    ] {
+        let collector = Collector::start().await;
+        let dir = tempfile::tempdir().unwrap();
+        let code = collector.mint().await;
+        storage_hooks::fail_once(dir.path().join(file), stage);
+        assert!(
+            join(&collector.public_url(), &code, dir.path(), "fixture")
+                .await
+                .is_err(),
+            "{file} {stage}"
+        );
+        assert_eq!(
+            collector.state.hosts.list().unwrap().len(),
+            usize::from(post),
+            "{file} {stage}"
+        );
+        let count = collector.state.hosts.list().unwrap().len();
+        match enrollment::inspect(dir.path()) {
+            Ok(EnrollmentState::Confirmed(_)) => {
+                Paired::load(dir.path()).unwrap();
+                assert!(Paired::read(dir.path()).unwrap().is_some());
+            }
+            Ok(EnrollmentState::Clear) => {
+                assert!(
+                    Paired::read(dir.path()).unwrap().is_some(),
+                    "a clear post-failure state must be an installed identity: {file} {stage}"
+                );
+            }
+            _ => {
+                assert!(Paired::load(dir.path()).is_err());
+                assert!(
+                    join(&collector.public_url(), "FRESH-CODE", dir.path(), "fixture")
+                        .await
+                        .is_err()
+                );
+            }
+        }
+        assert_eq!(collector.state.hosts.list().unwrap().len(), count);
+    }
+}
diff --git a/crates/hennery/Cargo.toml b/crates/hennery/Cargo.toml
index a6a55d08..b7f6ba12 100644
--- a/crates/hennery/Cargo.toml
+++ b/crates/hennery/Cargo.toml
@@ -37,0 +38 @@ tracing-subscriber.workspace = true
+futures.workspace = true
diff --git a/crates/hennery/src/doctor/collector.rs b/crates/hennery/src/doctor/collector.rs
index d0f49d72..22852773 100644
--- a/crates/hennery/src/doctor/collector.rs
+++ b/crates/hennery/src/doctor/collector.rs
@@ -118,5 +118,4 @@ fn healthz_transport(transport: &CollectorTransport) -> Health {
-            Ok(Err(error))
-                if hennery_host::transport::classify(error.as_ref()) == hennery_host::transport::Stage::Tls =>
-            {
-                Health::Tls("certificate chain/name/validity or TLS protocol failed".into())
-            }
+            Ok(Err(error)) if hennery_host::transport::classify(error.as_ref()).is_tls() => Health::Tls(format!(
+                "{}",
+                hennery_host::transport::failure(hennery_host::transport::classify(error.as_ref()))
+            )),
@@ -325 +324,5 @@ fn reach(doctor: &Doctor, host: &std::path::Path, paired: &Paired, verdict: &mut
-    let addresses = match block_on(async move { endpoint.addresses().await }) {
+    let addresses = match block_on(async move {
+        tokio::time::timeout(STEP_TIMEOUT, endpoint.addresses())
+            .await
+            .unwrap_or_else(|_| Err(hennery_host::transport::failure(hennery_host::transport::Stage::Dns)))
+    }) {
@@ -379,6 +382,11 @@ fn connect(addresses: &[std::net::SocketAddr]) -> std::io::Result<()> {
-    let mut first = None;
-    for address in addresses {
-        match std::net::TcpStream::connect_timeout(address, STEP_TIMEOUT) {
-            Ok(_) => return Ok(()),
-            Err(err) => {
-                first.get_or_insert(err);
+    let addresses = addresses.to_vec();
+    block_on(async move {
+        tokio::time::timeout(STEP_TIMEOUT, async move {
+            let mut first = None;
+            for address in addresses {
+                match tokio::net::TcpStream::connect(address).await {
+                    Ok(_) => return Ok(()),
+                    Err(err) => {
+                        first.get_or_insert(err);
+                    }
+                }
@@ -386,3 +394,5 @@ fn connect(addresses: &[std::net::SocketAddr]) -> std::io::Result<()> {
-        }
-    }
-    Err(first.unwrap_or_else(|| std::io::ErrorKind::NotFound.into()))
+            Err(first.unwrap_or_else(|| std::io::ErrorKind::NotFound.into()))
+        })
+        .await
+        .unwrap_or_else(|_| Err(std::io::ErrorKind::TimedOut.into()))
+    })
@@ -559 +569,7 @@ pub fn listeners(doctor: &Doctor) -> Finding {
-    verdict.ok("proxy-address attribution is unconfigured in W1; health success cannot prove header stripping or separate limiter budgets");
+    if file
+        .public_url(None)
+        .is_some_and(|url| Url::parse(&url).is_ok_and(|url| url.scheme() == "https"))
+    {
+        verdict.warn("proxy-address attribution is unconfigured in W1; health success cannot prove header stripping or separate limiter budgets", "restrict public ingress until the W2 deployment and attribution checks pass");
+        verdict.ok(format!("external collector trust: {}", doctor.collector_trust.source()));
+    }
diff --git a/crates/hennery/src/main.rs b/crates/hennery/src/main.rs
index 2e943bcb..a2363945 100644
--- a/crates/hennery/src/main.rs
+++ b/crates/hennery/src/main.rs
@@ -875,0 +876 @@ async fn run_host(args: HostArgs) -> Result<std::process::ExitCode> {
+            hennery_host::enrollment::require_automatic_join_allowed(&data_dir)?;
@@ -1075,5 +1076 @@ fn pairing_in(dir: &std::path::Path) -> Pairing {
-    if dir.join(format!("{CONFIG_FILE}.pending")).exists()
-        || dir.join(format!("{KEY_FILE}.pending")).exists()
-        || dir.join(hennery_host::enrollment::JOURNAL).exists()
-        || dir.join(hennery_host::enrollment::RECOVERY).exists()
-    {
+    if dir.join(format!("{CONFIG_FILE}.pending")).exists() || hennery_host::enrollment::has_artifacts(dir) {
@@ -1261 +1258,4 @@ async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
-        Pairing::None => Some(std::io::pipe()?),
+        Pairing::None => {
+            hennery_host::enrollment::require_automatic_join_allowed(&host_dir)?;
+            Some(std::io::pipe()?)
+        }
diff --git a/crates/hennery/src/service/tests.rs b/crates/hennery/src/service/tests.rs
index 2a17f1af..bf4a666c 100644
--- a/crates/hennery/src/service/tests.rs
+++ b/crates/hennery/src/service/tests.rs
@@ -94 +94 @@ fn paired(dir: &Path) -> PathBuf {
-        collector_url: "http://127.0.0.1:7117".into(),
+        collector_url: "ws://127.0.0.1:7117/api/hosts/ws".into(),
diff --git a/crates/hennery/tests/wss.rs b/crates/hennery/tests/wss.rs
new file mode 100644
index 00000000..feab8ec0
--- /dev/null
+++ b/crates/hennery/tests/wss.rs
@@ -0,0 +1,871 @@
+//! Real TLS and process-restart enrollment gates. Every child uses scratch data.
+use axum::{
+    Router,
+    response::IntoResponse,
+    routing::{get, post},
+};
+use hennery_host::{
+    identity::Paired,
+    transport::{CollectorEndpoint, CollectorTrust},
+};
+use hennery_kernel::{hosts::Hosts, operator::Operator};
+use hennery_sessions::{AppState, store::Store};
+use hennery_testkit::tls::{Proxy, TestCa};
+use std::{
+    path::Path,
+    process::{Command, Stdio},
+    sync::{
+        Arc,
+        atomic::{AtomicUsize, Ordering},
+    },
+    time::Duration,
+};
+
+fn command(root: &Path) -> Command {
+    let mut command = Command::new(env!("CARGO_BIN_EXE_hennery"));
+    command
+        .env("HOME", root.join("home"))
+        .env("XDG_DATA_HOME", root.join("xdg-data"))
+        .env("XDG_CONFIG_HOME", root.join("xdg-config"))
+        .env("XDG_STATE_HOME", root.join("xdg-state"))
+        .env("XDG_CACHE_HOME", root.join("xdg-cache"))
+        .env("HENNERY_NODE_MIRROR", "http://127.0.0.1:1/")
+        .env("HENNERY_NPM_REGISTRY", "http://127.0.0.1:1/")
+        .env_remove("HENNERY_DATA_DIR")
+        .env_remove("HENNERY_HOST_DATA_DIR")
+        .env_remove("HENNERY_SERVICE")
+        .env_remove("HENNERY_LOG_DIR")
+        .env_remove("SSL_CERT_FILE")
+        .env_remove("SSL_CERT_DIR")
+        .stdin(Stdio::null());
+    command
+}
+async fn output(mut command: Command) -> std::process::Output {
+    tokio::task::spawn_blocking(move || command.output().unwrap())
+        .await
+        .unwrap()
+}
+fn assert_failed(output: std::process::Output) -> String {
+    let text = format!(
+        "{}{}",
+        String::from_utf8_lossy(&output.stdout),
+        String::from_utf8_lossy(&output.stderr)
+    );
+    assert!(!output.status.success(), "{text}");
+    text
+}
+async fn collector(
+    root: &Path,
+) -> (
+    AppState,
+    std::net::SocketAddr,
+    tokio::task::JoinHandle<std::io::Result<()>>,
+) {
+    let db = root.join("collector.db");
+    let state = AppState::new(
+        Store::open(&db).unwrap(),
+        Hosts::open(&db).unwrap(),
+        Operator::open(&db).unwrap(),
+    );
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let addr = listener.local_addr().unwrap();
+    let task = tokio::spawn(hennery_sessions::serve(listener, state.clone()));
+    (state, addr, task)
+}
+async fn code(state: &AppState, addr: std::net::SocketAddr) -> String {
+    hennery_testkit::operator_client(&state.operator)
+        .post(format!("http://{addr}/api/hosts/pairing-codes"))
+        .send()
+        .await
+        .unwrap()
+        .json::<serde_json::Value>()
+        .await
+        .unwrap()["code"]
+        .as_str()
+        .unwrap()
+        .into()
+}
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn https_join_system_and_private_ca_run_and_doctor_use_one_saved_policy() {
+    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
+    let root = tempfile::tempdir().unwrap();
+    let (state, addr, server) = collector(root.path()).await;
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let ca_path = root.path().join("ca.pem");
+    std::fs::write(&ca_path, &ca.pem).unwrap();
+    for mode in ["system", "private"] {
+        let host = root.path().join(mode);
+        let pairing_code = code(&state, addr).await;
+        let mut join = command(root.path());
+        join.args([
+            "host",
+            "join",
+            &proxy.origin(),
+            &pairing_code,
+            "--no-runtime",
+            "--data-dir",
+        ])
+        .arg(&host);
+        if mode == "system" {
+            join.env("SSL_CERT_FILE", &ca_path);
+        } else {
+            join.arg("--ca-cert").arg(&ca_path);
+        }
+        let result = output(join).await;
+        assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
+        let paired = Paired::read(&host).unwrap().unwrap();
+        assert_eq!(
+            paired.collector_url,
+            CollectorEndpoint::public(&proxy.origin()).unwrap().ws()
+        );
+        assert_eq!(paired.trust == CollectorTrust::System, mode == "system");
+        let key = std::fs::read(host.join("host.key")).unwrap();
+        if mode == "private" {
+            // Move the same identity off a tunnel through the actual CLI.
+            let mut tunnel = paired.clone();
+            tunnel.collector_url = hennery_host::pairing::collector_ws_url(&format!("http://{addr}")).unwrap();
+            tunnel.trust = CollectorTrust::System;
+            tunnel.save(&host).unwrap();
+            drop(hennery_host::outbox::Outbox::open(&host.join("outbox.db")).unwrap());
+            let outbox = std::fs::read(host.join("outbox.db")).unwrap();
+            let mut change = command(root.path());
+            change
+                .args(["host", "transport", "set", &proxy.origin(), "--ca-cert"])
+                .arg(&ca_path)
+                .arg("--data-dir")
+                .arg(&host);
+            let result = output(change).await;
+            assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
+            assert!(String::from_utf8_lossy(&result.stdout).contains("restart the host"));
+            assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
+            assert_eq!(std::fs::read(host.join("outbox.db")).unwrap(), outbox);
+            assert_eq!(Paired::read(&host).unwrap().unwrap().host_id, paired.host_id);
+            // Service startup remains possible after the input CA is gone.
+            std::fs::remove_file(&ca_path).unwrap();
+        }
+        // Idempotent join with stdin closed consumes no code and needs no prompt.
+        let mut again = command(root.path());
+        again
+            .args(["host", "join", &proxy.origin(), "--no-runtime", "--data-dir"])
+            .arg(&host);
+        if mode == "system" {
+            again.env("SSL_CERT_FILE", &ca_path);
+        }
+        assert!(output(again).await.status.success());
+        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
+        let mut run = command(root.path());
+        run.args(["host", "run", "--agent", "fixture=/nonexistent/fixture", "--data-dir"])
+            .arg(&host)
+            .stdout(Stdio::null())
+            .stderr(Stdio::null());
+        if mode == "system" {
+            run.env("SSL_CERT_FILE", &ca_path);
+        }
+        let mut child = run.spawn().unwrap();
+        let deadline = tokio::time::Instant::now() + Duration::from_secs(20);
+        while !state.hub.connected_hosts().contains(&paired.host_id) {
+            assert!(tokio::time::Instant::now() < deadline);
+            tokio::time::sleep(Duration::from_millis(20)).await;
+        }
+        let mut doctor = command(root.path());
+        doctor.args(["doctor", "--data-dir"]).arg(&host);
+        if mode == "system" {
+            doctor.env("SSL_CERT_FILE", &ca_path);
+        }
+        let result = output(doctor).await;
+        let report = String::from_utf8_lossy(&result.stdout);
+        assert!(report.contains("authentication not checked"), "{report}");
+        assert!(!report.contains("fail  7 collector"), "{report}");
+        child.kill().unwrap();
+        child.wait().unwrap();
+        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), key);
+    }
+    state.shutdown.cancel();
+    server.await.unwrap().unwrap();
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn every_ambiguous_reply_blocks_join_run_up_and_doctor_after_restart() {
+    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
+    for (status, body) in [
+        (502, "gateway"),
+        (504, "timeout"),
+        (201, "{"),
+        (201, "{\"host_id\":\"bad\"}"),
+        (201, "__truncated"),
+        (201, "__reset"),
+        (201, "__oversized"),
+        (409, "{\"code\":\"already_paired\",\"message\":\"ambiguous\"}"),
+    ] {
+        let posts = Arc::new(AtomicUsize::new(0));
+        let capture = posts.clone();
+        let router = Router::new()
+            .route(
+                "/api/hosts/ws",
+                get(|upgrade: axum::extract::ws::WebSocketUpgrade| async {
+                    let mut response = upgrade
+                        .on_upgrade(|mut ws| async move {
+                            let _ = ws.recv().await;
+                        })
+                        .into_response();
+                    response.headers_mut().insert(
+                        "hennery-hello-nonce",
+                        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
+                            .parse()
+                            .unwrap(),
+                    );
+                    response
+                }),
+            )
+            .route(
+                "/api/hosts/enroll",
+                post(move || {
+                    let capture = capture.clone();
+                    async move {
+                        capture.fetch_add(1, Ordering::SeqCst);
+                        if body == "__oversized" {
+                            (
+                                axum::http::StatusCode::CREATED,
+                                format!("{{\"host_id\":\"host-0123456789abcdef\"}}{}", " ".repeat(8193)),
+                            )
+                                .into_response()
+                        } else if body == "__truncated" {
+                            axum::http::Response::builder()
+                                .status(201)
+                                .header("content-length", "200")
+                                .body(axum::body::Body::from("{"))
+                                .unwrap()
+                        } else if body == "__reset" {
+                            let failed = futures::stream::iter([Err::<Vec<u8>, _>(std::io::Error::new(
+                                std::io::ErrorKind::ConnectionReset,
+                                "fixture reset",
+                            ))]);
+                            axum::http::Response::builder()
+                                .status(201)
+                                .body(axum::body::Body::from_stream(failed))
+                                .unwrap()
+                        } else {
+                            (axum::http::StatusCode::from_u16(status).unwrap(), body).into_response()
+                        }
+                    }
+                }),
+            );
+        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let origin = format!("http://{}", listener.local_addr().unwrap());
+        let task = tokio::spawn(async move {
+            axum::serve(listener, router).await.unwrap();
+        });
+        let root = tempfile::tempdir().unwrap();
+        let host = root.path().join("host");
+        let mut join = command(root.path());
+        join.args(["host", "join", &origin, "ABCD-EFGH", "--no-runtime", "--data-dir"])
+            .arg(&host);
+        assert_failed(output(join).await);
+        let key = std::fs::read(host.join("host.key.pending")).unwrap();
+        let journal = std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap();
+        for args in [
+            vec![
+                "host",
+                "join",
+                &origin,
+                "FRESH-CODE",
+                "--no-runtime",
+                "--data-dir",
+                host.to_str().unwrap(),
+            ],
+            vec!["host", "run", "--data-dir", host.to_str().unwrap()],
+            vec![
+                "up",
+                "--listen",
+                "127.0.0.1:0",
+                "--data-dir",
+                root.path().to_str().unwrap(),
+            ],
+            vec!["doctor", "--data-dir", host.to_str().unwrap()],
+        ] {
+            let mut restart = command(root.path());
+            restart.args(args);
+            let text = assert_failed(output(restart).await);
+            assert!(text.contains("uncertain enrollment attempt"), "{text}");
+            assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), key);
+            assert_eq!(
+                std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap(),
+                journal
+            );
+            assert_eq!(posts.load(Ordering::SeqCst), 1);
+        }
+        task.abort();
+    }
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn verifier_failures_cross_neither_enrollment_nor_hello_and_preserve_the_code() {
+    for (names, validity, untrusted, reason) in [
+        (vec!["wrong.example".into()], "valid", false, "TlsNameMismatch"),
+        (vec!["localhost".into()], "expired", false, "TlsExpired"),
+        (vec!["localhost".into()], "future", false, "TlsNotYetValid"),
+        (vec!["localhost".into()], "valid", true, "TlsUnknownIssuer"),
+        (
+            vec!["localhost".into()],
+            "missing_intermediate",
+            false,
+            "TlsUnknownIssuer",
+        ),
+    ] {
+        let root = tempfile::tempdir().unwrap();
+        let (state, addr, server) = collector(root.path()).await;
+        let ca = TestCa::new();
+        let other = TestCa::new();
+        let proxy = Proxy::start(addr, ca.server(names, validity)).await;
+        let selected = if untrusted { &other.pem } else { &ca.pem };
+        let path = root.path().join("roots.pem");
+        std::fs::write(&path, selected).unwrap();
+        let code = code(&state, addr).await;
+        let host = root.path().join("host");
+        let mut join = command(root.path());
+        join.args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--ca-cert"])
+            .arg(&path)
+            .arg("--data-dir")
+            .arg(&host);
+        let text = assert_failed(output(join).await);
+        assert!(text.contains(reason), "{text}");
+        assert!(state.hosts.list().unwrap().is_empty());
+        assert!(!host.join("host.key.pending").exists());
+        // An identity probe hits the same failed verifier, not a hello.
+        Paired {
+            collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
+            trust: CollectorTrust::CaBundle { pem: selected.clone() },
+            host_id: "host-0123456789abcdef".into(),
+            key: hennery_host::identity::HostKey::from_seed([71; 32]),
+            workspace_roots: vec![],
+        }
+        .save(&host)
+        .unwrap();
+        let mut doctor = command(root.path());
+        doctor.args(["doctor", "--data-dir"]).arg(&host);
+        let report = assert_failed(output(doctor).await);
+        assert!(report.contains("TLS failed"), "{report}");
+        assert_eq!(proxy.verified.load(Ordering::SeqCst), 0);
+        let good = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+        let fresh = root.path().join("fresh");
+        std::fs::write(&path, &ca.pem).unwrap();
+        let mut join = command(root.path());
+        join.args(["host", "join", &good.origin(), &code, "--no-runtime", "--ca-cert"])
+            .arg(&path)
+            .arg("--data-dir")
+            .arg(&fresh);
+        let result = output(join).await;
+        assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
+        state.shutdown.cancel();
+        server.await.unwrap().unwrap();
+    }
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn collector_transport_ignores_all_proxy_environment_spellings() {
+    let root = tempfile::tempdir().unwrap();
+    let (state, addr, server) = collector(root.path()).await;
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let roots = root.path().join("ca.pem");
+    std::fs::write(&roots, &ca.pem).unwrap();
+    let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
+    trap.set_nonblocking(true).unwrap();
+    let trap_url = format!("http://{}", trap.local_addr().unwrap());
+    let host = root.path().join("host");
+    let pairing_code = code(&state, addr).await;
+    let configure = |mut cmd: Command| {
+        for name in [
+            "HTTP_PROXY",
+            "HTTPS_PROXY",
+            "ALL_PROXY",
+            "http_proxy",
+            "https_proxy",
+            "all_proxy",
+        ] {
+            cmd.env(name, &trap_url);
+        }
+        cmd.env("NO_PROXY", "").env("no_proxy", "");
+        cmd
+    };
+    let mut join = configure(command(root.path()));
+    join.args([
+        "host",
+        "join",
+        &proxy.origin(),
+        &pairing_code,
+        "--no-runtime",
+        "--ca-cert",
+    ])
+    .arg(&roots)
+    .arg("--data-dir")
+    .arg(&host);
+    let result = output(join).await;
+    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
+    let mut doctor = configure(command(root.path()));
+    doctor.args(["doctor", "--data-dir"]).arg(&host);
+    let report = output(doctor).await;
+    let report = String::from_utf8_lossy(&report.stdout);
+    assert!(report.contains("its hello is accepted"), "{report}");
+    assert_eq!(trap.accept().unwrap_err().kind(), std::io::ErrorKind::WouldBlock);
+    state.shutdown.cancel();
+    server.await.unwrap().unwrap();
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn a_committed_lost_reply_preserves_an_older_pairing_and_outbox() {
+    let root = tempfile::tempdir().unwrap();
+    let db = root.path().join("collector.db");
+    let state = AppState::new(
+        Store::open(&db).unwrap(),
+        Hosts::open(&db).unwrap(),
+        Operator::open(&db).unwrap(),
+    );
+    let posts = Arc::new(AtomicUsize::new(0));
+    let count = posts.clone();
+    let router = hennery_sessions::router(state.clone()).layer(axum::middleware::from_fn(
+        move |request: axum::extract::Request, next: axum::middleware::Next| {
+            let count = count.clone();
+            async move {
+                let enrollment = request.uri().path() == "/api/hosts/enroll";
+                let response = next.run(request).await;
+                if enrollment {
+                    count.fetch_add(1, Ordering::SeqCst);
+                    if response.status() == 201 {
+                        return (axum::http::StatusCode::CREATED, "{").into_response();
+                    }
+                }
+                response
+            }
+        },
+    ));
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let addr = listener.local_addr().unwrap();
+    let server = tokio::spawn(async move {
+        axum::serve(
+            listener,
+            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
+        )
+        .await
+        .unwrap();
+    });
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let prior = "host-0123456789abcdef";
+    let key = hennery_host::identity::HostKey::from_seed([89; 32]);
+    state
+        .hosts
+        .register(
+            prior,
+            &hennery_kernel::hosts::Enrollment {
+                public_key: key.public_key_hex(),
+                name: "fixture".into(),
+                host_version: "fixture".into(),
+                platform: "fixture".into(),
+            },
+            0,
+        )
+        .unwrap();
+    state.hosts.revoke(prior, hennery_kernel::secret::unix_now()).unwrap();
+    let host = root.path().join("host");
+    Paired {
+        collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
+        trust: CollectorTrust::CaBundle { pem: ca.pem.clone() },
+        host_id: prior.into(),
+        key,
+        workspace_roots: vec!["/srv/projects".into()],
+    }
+    .save(&host)
+    .unwrap();
+    std::fs::write(host.join("outbox.db"), b"older facts").unwrap();
+    let saved_key = std::fs::read(host.join("host.key")).unwrap();
+    let saved_config = std::fs::read(host.join("host.toml")).unwrap();
+    let code = code(&state, addr).await;
+    let mut join = command(root.path());
+    join.args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--data-dir"])
+        .arg(&host);
+    assert_failed(output(join).await);
+    assert_eq!(state.hosts.list().unwrap().len(), 2);
+    let pending = std::fs::read(host.join("host.key.pending")).unwrap();
+    for args in [
+        vec![
+            "host",
+            "join",
+            &proxy.origin(),
+            "FRESH-CODE",
+            "--no-runtime",
+            "--data-dir",
+            host.to_str().unwrap(),
+        ],
+        vec!["host", "run", "--data-dir", host.to_str().unwrap()],
+        vec![
+            "up",
+            "--listen",
+            "127.0.0.1:0",
+            "--data-dir",
+            root.path().to_str().unwrap(),
+        ],
+        vec!["doctor", "--data-dir", host.to_str().unwrap()],
+    ] {
+        let mut retry = command(root.path());
+        retry.args(args);
+        assert!(assert_failed(output(retry).await).contains("uncertain enrollment attempt"));
+        assert_eq!(std::fs::read(host.join("host.key")).unwrap(), saved_key);
+        assert_eq!(std::fs::read(host.join("host.toml")).unwrap(), saved_config);
+        assert_eq!(std::fs::read(host.join("outbox.db")).unwrap(), b"older facts");
+        assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), pending);
+        assert_eq!(posts.load(Ordering::SeqCst), 1);
+    }
+    server.abort();
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn process_death_after_a_committed_post_remains_uncertain_on_every_entry_point() {
+    committed_post_uncertainty(true).await;
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn timeout_after_a_committed_post_remains_uncertain_on_every_entry_point() {
+    committed_post_uncertainty(false).await;
+}
+
+async fn committed_post_uncertainty(kill: bool) {
+    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
+    let root = tempfile::tempdir().unwrap();
+    let db = root.path().join("collector.db");
+    let state = AppState::new(
+        Store::open(&db).unwrap(),
+        Hosts::open(&db).unwrap(),
+        Operator::open(&db).unwrap(),
+    );
+    let router = hennery_sessions::router(state.clone()).layer(axum::middleware::from_fn(
+        |request: axum::extract::Request, next: axum::middleware::Next| async move {
+            let enrollment = request.uri().path() == "/api/hosts/enroll";
+            let response = next.run(request).await;
+            if enrollment && response.status() == 201 {
+                std::future::pending::<axum::response::Response>().await
+            } else {
+                response
+            }
+        },
+    ));
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let addr = listener.local_addr().unwrap();
+    let server = tokio::spawn(async move {
+        axum::serve(
+            listener,
+            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
+        )
+        .await
+        .unwrap();
+    });
+    let code = code(&state, addr).await;
+    let origin = format!("http://{addr}");
+    let host = root.path().join("host");
+    let mut join = command(root.path());
+    join.args(["host", "join", &origin, &code, "--no-runtime", "--data-dir"])
+        .arg(&host)
+        .stdout(Stdio::null())
+        .stderr(Stdio::null());
+    let mut child = join.spawn().unwrap();
+    let deadline = tokio::time::Instant::now() + Duration::from_secs(20);
+    while state.hosts.list().unwrap().is_empty() {
+        assert!(tokio::time::Instant::now() < deadline);
+        tokio::time::sleep(Duration::from_millis(20)).await;
+    }
+    if kill {
+        child.kill().unwrap();
+        child.wait().unwrap();
+    } else {
+        assert!(
+            !tokio::task::spawn_blocking(move || child.wait().unwrap())
+                .await
+                .unwrap()
+                .success()
+        );
+    }
+    let key = std::fs::read(host.join("host.key.pending")).unwrap();
+    let journal = std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap();
+    for args in [
+        vec![
+            "host",
+            "join",
+            &origin,
+            "FRESH-CODE",
+            "--no-runtime",
+            "--data-dir",
+            host.to_str().unwrap(),
+        ],
+        vec!["host", "run", "--data-dir", host.to_str().unwrap()],
+        vec![
+            "up",
+            "--listen",
+            "127.0.0.1:0",
+            "--data-dir",
+            root.path().to_str().unwrap(),
+        ],
+        vec!["doctor", "--data-dir", host.to_str().unwrap()],
+    ] {
+        let mut retry = command(root.path());
+        retry.args(args);
+        assert!(assert_failed(output(retry).await).contains("uncertain enrollment attempt"));
+        assert_eq!(std::fs::read(host.join("host.key.pending")).unwrap(), key);
+        assert_eq!(
+            std::fs::read(host.join(hennery_host::enrollment::JOURNAL)).unwrap(),
+            journal
+        );
+        assert_eq!(state.hosts.list().unwrap().len(), 1);
+    }
+    server.abort();
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn health_success_never_hides_broken_upgrade_nonce_or_redirects() {
+    for kind in ["missing", "malformed", "duplicate", "redirect"] {
+        let root = tempfile::tempdir().unwrap();
+        let hellos = Arc::new(AtomicUsize::new(0));
+        let seen = hellos.clone();
+        let posts = Arc::new(AtomicUsize::new(0));
+        let enrolled = posts.clone();
+        let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
+        trap.set_nonblocking(true).unwrap();
+        let trap_url = format!("http://{}/", trap.local_addr().unwrap());
+        let router = Router::new()
+            .route("/healthz", get(|| async { "ok" }))
+            .route(
+                "/api/hosts/enroll",
+                post(move || {
+                    enrolled.fetch_add(1, Ordering::SeqCst);
+                    async { "unexpected" }
+                }),
+            )
+            .route(
+                "/api/hosts/ws",
+                get(move |upgrade: axum::extract::ws::WebSocketUpgrade| {
+                    let seen = seen.clone();
+                    let trap_url = trap_url.clone();
+                    async move {
+                        if kind == "redirect" {
+                            return axum::http::Response::builder()
+                                .status(302)
+                                .header("location", trap_url)
+                                .body(axum::body::Body::empty())
+                                .unwrap();
+                        }
+                        let mut response = upgrade
+                            .on_upgrade(move |mut ws| async move {
+                                if matches!(ws.recv().await, Some(Ok(axum::extract::ws::Message::Text(_)))) {
+                                    seen.fetch_add(1, Ordering::SeqCst);
+                                }
+                            })
+                            .into_response();
+                        if kind != "missing" {
+                            response.headers_mut().insert(
+                                "hennery-hello-nonce",
+                                (if kind == "malformed" {
+                                    "bad"
+                                } else {
+                                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
+                                })
+                                .parse()
+                                .unwrap(),
+                            );
+                        }
+                        if kind == "duplicate" {
+                            response.headers_mut().append(
+                                "hennery-hello-nonce",
+                                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
+                                    .parse()
+                                    .unwrap(),
+                            );
+                        }
+                        response
+                    }
+                }),
+            );
+        let backend = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+        let addr = backend.local_addr().unwrap();
+        let task = tokio::spawn(async move {
+            axum::serve(backend, router).await.unwrap();
+        });
+        let ca = TestCa::new();
+        let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+        let roots = root.path().join("ca.pem");
+        std::fs::write(&roots, &ca.pem).unwrap();
+        let host = root.path().join("host");
+        let mut join = command(root.path());
+        join.args([
+            "host",
+            "join",
+            &proxy.origin(),
+            "ABCD-EFGH",
+            "--no-runtime",
+            "--ca-cert",
+        ])
+        .arg(&roots)
+        .arg("--data-dir")
+        .arg(&host);
+        let text = assert_failed(output(join).await);
+        assert!(
+            text.contains(if kind == "redirect" { "Upgrade" } else { "MissingNonce" }),
+            "{text}"
+        );
+        assert_eq!(posts.load(Ordering::SeqCst), 0);
+        assert!(!host.join("host.key.pending").exists());
+        Paired {
+            collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
+            trust: CollectorTrust::CaBundle { pem: ca.pem },
+            host_id: "host-0123456789abcdef".into(),
+            key: hennery_host::identity::HostKey::from_seed([99; 32]),
+            workspace_roots: vec![],
+        }
+        .save(&host)
+        .unwrap();
+        let mut doctor = command(root.path());
+        doctor.args(["doctor", "--data-dir"]).arg(&host);
+        let report = assert_failed(output(doctor).await);
+        assert!(
+            report.contains("answers") && report.contains("WSS upgrade/nonce check failed"),
+            "{report}"
+        );
+        assert_eq!(hellos.load(Ordering::SeqCst), 0);
+        assert_eq!(posts.load(Ordering::SeqCst), 0);
+        assert_eq!(trap.accept().unwrap_err().kind(), std::io::ErrorKind::WouldBlock);
+        task.abort();
+    }
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn collector_only_ca_health_option_never_overrides_saved_host_trust() {
+    let root = tempfile::tempdir().unwrap();
+    let (state, addr, task) = collector(root.path()).await;
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let file = root.path().join("ca.pem");
+    std::fs::write(&file, &ca.pem).unwrap();
+    let host = root.path().join("host");
+    Paired {
+        collector_url: CollectorEndpoint::public(&proxy.origin()).unwrap().ws().into(),
+        trust: CollectorTrust::System,
+        host_id: "host-0123456789abcdef".into(),
+        key: hennery_host::identity::HostKey::from_seed([100; 32]),
+        workspace_roots: vec![],
+    }
+    .save(&host)
+    .unwrap();
+    let mut doctor = command(root.path());
+    doctor
+        .args(["doctor", "--collector-ca-cert"])
+        .arg(&file)
+        .arg("--data-dir")
+        .arg(&host);
+    let report = assert_failed(output(doctor).await);
+    assert!(
+        report.contains("fail  7 collector") && report.contains("TLS failed"),
+        "{report}"
+    );
+    let collector = root.path().join("public");
+    std::fs::create_dir_all(&collector).unwrap();
+    std::fs::write(
+        collector.join("config.toml"),
+        format!("listen=['{addr}']\npublic_url='{}'", proxy.origin()),
+    )
+    .unwrap();
+    let mut doctor = command(root.path());
+    doctor
+        .args(["doctor", "--collector-ca-cert"])
+        .arg(&file)
+        .arg("--data-dir")
+        .arg(&collector);
+    let result = output(doctor).await;
+    let report = String::from_utf8_lossy(&result.stdout);
+    assert!(
+        report.contains("answers /healthz") && report.contains("collector-only CA bundle"),
+        "{report}"
+    );
+    assert!(
+        report.contains("health success cannot prove header stripping"),
+        "{report}"
+    );
+    state.shutdown.cancel();
+    task.await.unwrap().unwrap();
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn https_ip_literals_require_the_matching_ip_san() {
+    let root = tempfile::tempdir().unwrap();
+    let (state, addr, task) = collector(root.path()).await;
+    let ca = TestCa::new();
+    let roots = root.path().join("ca.pem");
+    std::fs::write(&roots, &ca.pem).unwrap();
+    for (name, accepted) in [("127.0.0.1", true), ("localhost", false), ("127.0.0.2", false)] {
+        let proxy = Proxy::start(addr, ca.server(vec![name.into()], "valid")).await;
+        let origin = format!("https://{}", proxy.addr);
+        let code = code(&state, addr).await;
+        let host = root.path().join(name);
+        let mut join = command(root.path());
+        join.args(["host", "join", &origin, &code, "--no-runtime", "--ca-cert"])
+            .arg(&roots)
+            .arg("--data-dir")
+            .arg(&host);
+        let result = output(join).await;
+        if accepted {
+            assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
+        } else {
+            assert!(assert_failed(result).contains("TlsNameMismatch"));
+            assert_eq!(proxy.verified.load(Ordering::SeqCst), 0);
+        }
+    }
+    assert_eq!(state.hosts.list().unwrap().len(), 1);
+    state.shutdown.cancel();
+    task.await.unwrap().unwrap();
+}
+
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn partial_native_root_loading_warns_and_dns_words_do_not_classify_as_tls() {
+    let root = tempfile::tempdir().unwrap();
+    let (state, addr, task) = collector(root.path()).await;
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let roots = root.path().join("partial.pem");
+    std::fs::write(
+        &roots,
+        format!(
+            "{}\n-----BEGIN CERTIFICATE-----\nAQID\n-----END CERTIFICATE-----\n",
+            ca.pem
+        ),
+    )
+    .unwrap();
+    let host = root.path().join("host");
+    let code = code(&state, addr).await;
+    let mut join = command(root.path());
+    join.env("SSL_CERT_FILE", &roots)
+        .args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--data-dir"])
+        .arg(&host);
+    let result = output(join).await;
+    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
+    let mut doctor = command(root.path());
+    doctor
+        .env("SSL_CERT_FILE", &roots)
+        .args(["doctor", "--data-dir"])
+        .arg(&host);
+    let result = output(doctor).await;
+    let report = String::from_utf8_lossy(&result.stdout);
+    assert!(
+        report.contains("native root loading had 1 failures") && report.contains("its hello is accepted"),
+        "{report}"
+    );
+    let mut paired = Paired::read(&host).unwrap().unwrap();
+    paired.collector_url = "wss://tls-certificate.invalid/api/hosts/ws".into();
+    paired.save(&host).unwrap();
+    let mut doctor = command(root.path());
+    doctor.args(["doctor", "--data-dir"]).arg(&host);
+    let report = assert_failed(output(doctor).await);
+    assert!(
+        report.contains("did not resolve") && !report.contains("TLS failed"),
+        "{report}"
+    );
+    state.shutdown.cancel();
+    task.await.unwrap().unwrap();
+}
diff --git a/docs/specs/2026-09-25-hennery-architecture-design.md b/docs/specs/2026-09-25-hennery-architecture-design.md
index 2a40f1ba..8e584609 100644
--- a/docs/specs/2026-09-25-hennery-architecture-design.md
+++ b/docs/specs/2026-09-25-hennery-architecture-design.md
@@ -638,2 +638,6 @@ pairs again with `host join`, under a new key and id; its old outbox is kept
-aside (kernel §4.1). *Built so far:* `join` takes `http://` to loopback only,
-until the host WebSocket supports `wss://`.
+aside (kernel §4.1). *Built so far (W1):* HTTPS enrollment and WSS share native
+roots or a collector-only private CA. Transport changes preserve identity;
+uncertain enrollment is durably journaled and blocks automatic re-enrollment.
+Plaintext aliases apply only to two validated loopback endpoints. Public proxy
+attribution and deployment verification remain W2; see the
+[WSS design](2026-10-14-wss-design.md).
diff --git a/docs/specs/2026-09-26-kernel-design.md b/docs/specs/2026-09-26-kernel-design.md
index 15e69275..e6d81803 100644
--- a/docs/specs/2026-09-26-kernel-design.md
+++ b/docs/specs/2026-09-26-kernel-design.md
@@ -374,2 +374,5 @@ endpoints.
-  uses no proxy. *Built so far:* `join` refuses `https://` before it spends a
-  code, since the host WebSocket has no TLS yet.
+  uses no proxy or redirect. *Built so far (W1):* enrollment, WSS and doctor
+  share one native-root or collector-only private-CA TLS policy. An upgrade
+  and nonce preflight precedes enrollment; a durable journal written before
+  its one POST prevents automatic replay after an ambiguous outcome. See
+  [the WSS design](2026-10-14-wss-design.md) §§3–4 for recovery and migration.
@@ -381,4 +384,5 @@ endpoints.
-- `bad_proof` is ambiguous (a reset or restored collector): `join` refuses and
-  names `host.key` and `host.toml` to remove. A pairing with another collector
-  is refused the same way; any two loopback URLs (any port, `localhost`) are
-  the same collector.
+- `bad_proof` is ambiguous (a reset or restored collector): `join` refuses
+  pending an explicit operator recovery decision. Endpoint or trust changes
+  use `host transport set`, retaining the key, id and outbox. Only two
+  validated plaintext loopback URLs may alias different names or ports;
+  WSS requires exact equality or an explicit secure migration before hello.
@@ -389,2 +393,3 @@ The new key is written to `host.key.pending` before enrolling, so a directory
-that cannot hold it costs no code; half a pairing is an error naming the file
-to remove. Once enrollment answers, `host.toml.pending` is written before
+that cannot hold it costs no code. An unresolved journal or lone pending
+artifact blocks every host entry point and needs id-bound archive recovery
+after checking/revoking any possible remote enrollment. Once enrollment answers, `host.toml.pending` is written before
@@ -417,2 +422,4 @@ pairing gets no pipe: `up` never re-pairs a key the collector does not know.
-The host child is handed the collector's current loopback URL, which wins over
-the stored one, so a new port keeps working. The code and the host carry the
+The host child is handed the collector's current loopback URL, which aliases
+the stored one only when both are validated plaintext loopback endpoints.
+A stored WSS endpoint refuses this override before hello, without starting
+children or minting a pairing code. The code and the host carry the
```

### c37dd7fa fix(pairing): validate installed recovery state and preserve startup locking

<!-- replay-commit: c37dd7fa2e716ba0d1f037c3ac8dd6444727faa0 tree: 74956772cb415dcc728296774757f54f5be85a35 -->

```diff
diff --git a/crates/hennery-host/src/connection.rs b/crates/hennery-host/src/connection.rs
index 74b6e652..f6834891 100644
--- a/crates/hennery-host/src/connection.rs
+++ b/crates/hennery-host/src/connection.rs
@@ -459 +459 @@ async fn connect_once(
-    tracing::info!(collector = %cfg.collector_url, "connected to collector");
+    tracing::info!(collector = %transport.endpoint.origin(), "connected to collector");
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index bdaa8f91..2fd5b56e 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -1,0 +2 @@
+use crate::identity::exists;
@@ -65 +66 @@ impl EnrollmentAttempt {
-        if dir.join(JOURNAL).try_exists()? {
+        if exists(&dir.join(JOURNAL))? {
@@ -125 +126 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
-    if dir.join(RECOVERY).try_exists()? {
+    if exists(&dir.join(RECOVERY))? {
@@ -133 +134 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
-    if !journal.try_exists()? {
+    if !exists(&journal)? {
@@ -143 +144 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
-        if pending.try_exists()? && !receipt.try_exists()? {
+        if exists(&pending)? && !exists(&receipt)? {
@@ -145,0 +147,3 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
+        if exists(&receipt)? {
+            crate::identity::inspect_receipt(dir)?;
+        }
@@ -149,6 +153,2 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
-    let key = if pending.try_exists()? {
-        pending
-    } else {
-        dir.join(KEY_FILE)
-    };
-    if !key.try_exists()? || HostKey::load(&key)?.public_key_hex() != attempt.public_key {
+    let key = if exists(&pending)? { pending } else { dir.join(KEY_FILE) };
+    if !exists(&key)? || HostKey::load(&key)?.public_key_hex() != attempt.public_key {
@@ -157 +157 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
-    if receipt.try_exists()? {
+    if exists(&receipt)? {
@@ -163 +163,5 @@ pub fn inspect(dir: &Path) -> Result<EnrollmentState> {
-    if dir.join(CONFIG_FILE).try_exists()? && receipt_matches(&dir.join(CONFIG_FILE), &attempt)? {
+    if exists(&dir.join(CONFIG_FILE))? && receipt_matches(&dir.join(CONFIG_FILE), &attempt)? {
+        let installed = dir.join(KEY_FILE);
+        if !exists(&installed)? || HostKey::load(&installed)?.public_key_hex() != attempt.public_key {
+            bail!("installed enrollment receipt has no matching installed key; preserve all artifacts");
+        }
@@ -179,0 +184,4 @@ pub(crate) fn clear_confirmed(dir: &Path) -> Result<()> {
+            let pending = dir.join("host.key.pending");
+            if exists(&pending)? {
+                crate::identity::durable_remove(&pending)?;
+            }
@@ -201 +209 @@ pub fn artifacts_id(dir: &Path) -> Result<String> {
-        if path.try_exists()? {
+        if exists(&path)? {
@@ -211 +219 @@ pub fn require_automatic_join_allowed(dir: &Path) -> Result<()> {
-    if dir.try_exists()?
+    if exists(dir)?
@@ -224 +232 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    let intent = if marker.try_exists()? {
+    let intent = if exists(&marker)? {
@@ -236 +244 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-        let expected = if dir.join(JOURNAL).try_exists()? {
+        let expected = if exists(&dir.join(JOURNAL))? {
@@ -273 +281 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-        if from.try_exists()? {
+        if exists(&from)? {
@@ -275 +283 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-            if to.try_exists()? && std::fs::read(&to)? != bytes {
+            if exists(&to)? && std::fs::read(&to)? != bytes {
@@ -279 +287 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-        } else if !to.try_exists()? {
+        } else if !exists(&to)? {
@@ -284 +292 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-    if !marker.try_exists()? {
+    if !exists(&marker)? {
@@ -289 +297 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-        if from.try_exists()? {
+        if exists(&from)? {
@@ -440,0 +449,51 @@ mod recovery_tests {
+
+#[cfg(test)]
+mod fragment_tests {
+    use super::*;
+    #[test]
+    fn dangling_links_and_nonregular_pending_fragments_are_never_absent_state() {
+        for name in ARCHIVE_FILES {
+            let dir = tempfile::tempdir().unwrap();
+            std::os::unix::fs::symlink(dir.path().join("missing"), dir.path().join(name)).unwrap();
+            assert!(has_artifacts(dir.path()));
+            assert!(crate::identity::Paired::load(dir.path()).is_err(), "{name}");
+            assert!(crate::identity::Paired::read(dir.path()).is_err(), "{name}");
+        }
+    }
+}
+
+#[cfg(test)]
+mod installed_receipt_tests {
+    use super::*;
+    #[test]
+    fn an_installed_receipt_checks_the_installed_key_before_pruning_a_duplicate_pending_key() {
+        let dir = tempfile::tempdir().unwrap();
+        let key = HostKey::from_seed([120; 32]);
+        key.save(&dir.path().join("host.key.pending")).unwrap();
+        let attempt = EnrollmentAttempt::new(
+            &CollectorEndpoint::public("https://c.example").unwrap(),
+            CollectorTrust::System,
+            &key,
+            None,
+        );
+        attempt.save(dir.path()).unwrap();
+        HostKey::from_seed([121; 32]).save(&dir.path().join(KEY_FILE)).unwrap();
+        crate::identity::write_config_to(
+            &dir.path().join(CONFIG_FILE),
+            "wss://c.example/api/hosts/ws",
+            "host-0123456789abcdef",
+            &key,
+        )
+        .unwrap();
+        assert!(inspect(dir.path()).is_err());
+        assert!(crate::identity::Paired::load(dir.path()).is_err());
+        assert!(dir.path().join(JOURNAL).exists());
+        assert!(dir.path().join("host.key.pending").exists());
+        key.save(&dir.path().join(KEY_FILE)).unwrap();
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(attempt));
+        let loaded = crate::identity::Paired::load(dir.path()).unwrap().unwrap();
+        assert_eq!(loaded.key.public_key_hex(), key.public_key_hex());
+        assert!(!dir.path().join("host.key.pending").exists());
+        assert!(!dir.path().join(JOURNAL).exists());
+    }
+}
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index e770da14..0556c803 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -16,0 +17,8 @@ pub const CONFIG_FILE: &str = "host.toml";
+/// A dangling symlink is present recovery state, never an absent file.
+pub(crate) fn exists(path: &Path) -> Result<bool> {
+    match path.symlink_metadata() {
+        Ok(_) => Ok(true),
+        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
+        Err(error) => Err(error.into()),
+    }
+}
@@ -184 +192 @@ impl Paired {
-        if pending_path(data_dir, CONFIG_FILE).exists() {
+        if exists(&pending_path(data_dir, CONFIG_FILE))? {
@@ -192 +200 @@ impl Paired {
-        match (key_path.exists(), config_path.exists()) {
+        match (exists(&key_path)?, exists(&config_path)?) {
@@ -259,0 +268,32 @@ pub fn inspect_transport(data_dir: &Path) -> Result<()> {
+/// The complete stored endpoint for up's pre-spawn override check. No key
+/// is read and no configuration is repaired; private PEM never enters errors.
+pub fn stored_endpoint(data_dir: &Path) -> Result<Option<CollectorEndpoint>> {
+    let pending = pending_path(data_dir, CONFIG_FILE);
+    let path = if exists(&pending)? {
+        pending
+    } else {
+        data_dir.join(CONFIG_FILE)
+    };
+    if !exists(&path)? {
+        return Ok(None);
+    }
+    let config = read_config(&path)?;
+    let endpoint = CollectorEndpoint::stored(&config.collector)?;
+    if !endpoint.secure() && config.collector_tls != CollectorTrust::System {
+        bail!("a private CA requires HTTPS/WSS");
+    }
+    Ok(Some(endpoint))
+}
+pub(crate) fn inspect_receipt(data_dir: &Path) -> Result<()> {
+    let staged = read_config(&pending_path(data_dir, CONFIG_FILE))?;
+    let pending = pending_path(data_dir, KEY_FILE);
+    let key_path = if exists(&pending)? {
+        pending
+    } else {
+        data_dir.join(KEY_FILE)
+    };
+    if staged.public_key != Some(HostKey::load(&key_path)?.public_key_hex()) {
+        bail!("staged enrollment receipt has no matching key; preserve recovery artifacts");
+    }
+    Ok(())
+}
@@ -317 +357 @@ pub(crate) fn read_table(path: &Path) -> Result<toml::Table> {
-    if !path.try_exists()? {
+    if !exists(path)? {
@@ -339 +379 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-    if !config_pending.exists() {
+    if !exists(&config_pending)? {
@@ -345 +385 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-    let key_at = if key_pending.exists() { &key_pending } else { &key_path };
+    let key_at = if exists(&key_pending)? { &key_pending } else { &key_path };
@@ -348 +388 @@ fn finish_interrupted_pairing(data_dir: &Path) -> Result<()> {
-    let matches = key_at.exists() && staged.public_key == Some(HostKey::load(key_at)?.public_key_hex());
+    let matches = exists(key_at)? && staged.public_key == Some(HostKey::load(key_at)?.public_key_hex());
diff --git a/crates/hennery-host/src/pairing.rs b/crates/hennery-host/src/pairing.rs
index bb6d72f3..1a8fa66f 100644
--- a/crates/hennery-host/src/pairing.rs
+++ b/crates/hennery-host/src/pairing.rs
@@ -224 +224 @@ pub async fn complete_join(prepared: PreparedJoin, code: &str, data_dir: &Path,
-    if pending.try_exists()? {
+    if crate::identity::exists(&pending)? {
@@ -527,0 +528,22 @@ mod alias_matrix {
+
+#[cfg(test)]
+mod pairing_lock_tests {
+    use super::*;
+    #[test]
+    fn pairing_changes_hold_the_same_host_lock_as_run() {
+        let dir = tempfile::tempdir().unwrap();
+        let first = PairingLock::acquire(dir.path()).unwrap();
+        assert!(PairingLock::acquire(dir.path()).is_err());
+        drop(first);
+        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
+        loop {
+            match PairingLock::acquire(dir.path()) {
+                Ok(_) => break,
+                Err(error) => {
+                    assert!(std::time::Instant::now() < deadline, "{error}");
+                    std::thread::sleep(std::time::Duration::from_millis(10));
+                }
+            }
+        }
+    }
+}
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index 494a9a48..c8a29f84 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -386 +386 @@ impl CollectorTransport {
-    pub async fn http(&self) -> Result<reqwest::Client> {
+    pub(crate) async fn http(&self) -> Result<reqwest::Client> {
@@ -401,0 +402,10 @@ impl CollectorTransport {
+    /// A health request is fixed to this collector's authorized origin;
+    /// callers cannot reuse its private CA through a generic HTTP client.
+    pub async fn health(&self) -> Result<reqwest::Response> {
+        self.http()
+            .await?
+            .get(self.endpoint.origin().join("/healthz")?)
+            .send()
+            .await
+            .map_err(|error| failure(classify(&error)))
+    }
diff --git a/crates/hennery-host/tests/transport.rs b/crates/hennery-host/tests/transport.rs
index c2e9ef61..34e50b4e 100644
--- a/crates/hennery-host/tests/transport.rs
+++ b/crates/hennery-host/tests/transport.rs
@@ -4,6 +4,3 @@ use rcgen::{BasicConstraints, CertificateParams, IsCa, KeyPair};
-use std::{
-    sync::{
-        Arc,
-        atomic::{AtomicUsize, Ordering},
-    },
-    time::Duration,
+use std::sync::{
+    Arc,
+    atomic::{AtomicUsize, Ordering},
@@ -94,10 +91,2 @@ async fn private_ca_wss_and_https_share_the_same_verifier() {
-    let error = transport
-        .http()
-        .await
-        .unwrap()
-        .get(format!("{}/healthz", f.url))
-        .timeout(Duration::from_secs(2))
-        .send()
-        .await
-        .unwrap_err();
-    assert_ne!(hennery_host::transport::classify(&error), Stage::TlsNameMismatch);
+    let error = transport.health().await.unwrap_err();
+    assert!(!hennery_host::transport::classify(error.as_ref()).is_tls());
@@ -123,10 +112,2 @@ async fn failed_name_verification_sends_no_websocket_or_http_request() {
-    let err = transport
-        .http()
-        .await
-        .unwrap()
-        .post(format!("{}/api/hosts/enroll", f.url))
-        .body("secret")
-        .send()
-        .await
-        .unwrap_err();
-    assert_eq!(hennery_host::transport::classify(&err), Stage::TlsNameMismatch);
+    let err = transport.health().await.unwrap_err();
+    assert_eq!(hennery_host::transport::classify(err.as_ref()), Stage::TlsNameMismatch);
@@ -254,9 +235,2 @@ async fn injected_system_roots_share_the_wss_and_http_policy_without_fallback()
-    let error = transport
-        .http()
-        .await
-        .unwrap()
-        .get(format!("{}/healthz", fixture.url))
-        .send()
-        .await
-        .unwrap_err();
-    assert!(!hennery_host::transport::classify(&error).is_tls());
+    let error = transport.health().await.unwrap_err();
+    assert!(!hennery_host::transport::classify(error.as_ref()).is_tls());
diff --git a/crates/hennery-testkit/tests/host_session.rs b/crates/hennery-testkit/tests/host_session.rs
index d055f66f..bcd62aa6 100644
--- a/crates/hennery-testkit/tests/host_session.rs
+++ b/crates/hennery-testkit/tests/host_session.rs
@@ -3552 +3552,8 @@ fn setup_git(dir: &Path, args: &[&str]) -> String {
-        .args(["-c", "user.name=test", "-c", "user.email=test@example.invalid"])
+        .args([
+            "-c",
+            "user.name=test",
+            "-c",
+            "user.email=test@example.invalid",
+            "-c",
+            "commit.gpgsign=false",
+        ])
diff --git a/crates/hennery/src/doctor/collector.rs b/crates/hennery/src/doctor/collector.rs
index 22852773..9c6bc42d 100644
--- a/crates/hennery/src/doctor/collector.rs
+++ b/crates/hennery/src/doctor/collector.rs
@@ -43 +43 @@ fn quoted(text: &str) -> String {
-/// `parse_public_url` accepts in a URL (`https://user:secret@host`).
+/// are refused by the transport parser, including in legacy configuration.
@@ -105,2 +105 @@ fn healthz_transport(transport: &CollectorTransport) -> Health {
-            let client = transport.http().await?;
-            let response = client.get(transport.endpoint.origin().join("/healthz")?).send().await?;
+            let response = transport.health().await?;
@@ -234,5 +233,6 @@ pub fn collector(doctor: &Doctor) -> [Finding; 2] {
-            let fix = if host.join("host.toml.pending").exists() {
-                "run `hennery host run` once (it finishes the pairing), then doctor again"
-            } else {
-                "fix host.toml, or pair this host again (`hennery host join`)"
-            };
+            let fix =
+                if host.join("host.toml.pending").exists() || host.join(hennery_host::enrollment::JOURNAL).exists() {
+                    "run `hennery host run` once (it finishes the pairing), then doctor again"
+                } else {
+                    "fix host.toml, or pair this host again (`hennery host join`)"
+                };
diff --git a/crates/hennery/src/doctor/service.rs b/crates/hennery/src/doctor/service.rs
index ded36222..620369ba 100644
--- a/crates/hennery/src/doctor/service.rs
+++ b/crates/hennery/src/doctor/service.rs
@@ -474 +474,5 @@ pub fn host_directory(doctor: &Doctor) -> Finding {
-    if host.join(hennery_host::identity::CONFIG_FILE).exists() || host.join(hennery_host::enrollment::JOURNAL).exists()
+    if host
+        .join(hennery_host::identity::CONFIG_FILE)
+        .symlink_metadata()
+        .is_ok()
+        || hennery_host::enrollment::has_artifacts(host)
@@ -476 +480,11 @@ pub fn host_directory(doctor: &Doctor) -> Finding {
-        match hennery_host::identity::inspect_transport(host) {
+        let integrity = match hennery_host::enrollment::inspect(host) {
+            Ok(hennery_host::enrollment::EnrollmentState::Uncertain(attempt)) => {
+                Err(anyhow::anyhow!(attempt.diagnostic()))
+            }
+            Ok(hennery_host::enrollment::EnrollmentState::Confirmed(_)) => {
+                Err(anyhow::anyhow!("confirmed enrollment needs durable roll-forward"))
+            }
+            Ok(hennery_host::enrollment::EnrollmentState::Clear) => hennery_host::identity::inspect_transport(host),
+            Err(error) => Err(error),
+        };
+        match integrity {
@@ -478 +492,9 @@ pub fn host_directory(doctor: &Doctor) -> Finding {
-            Err(err) if host.join("host.toml.pending").exists() => {
+            Err(err)
+                if matches!(
+                    hennery_host::enrollment::inspect(host),
+                    Ok(hennery_host::enrollment::EnrollmentState::Confirmed(_))
+                ) || (matches!(
+                    hennery_host::enrollment::inspect(host),
+                    Ok(hennery_host::enrollment::EnrollmentState::Clear)
+                ) && host.join("host.toml.pending").exists()) =>
+            {
diff --git a/crates/hennery/src/main.rs b/crates/hennery/src/main.rs
index a2363945..5c456379 100644
--- a/crates/hennery/src/main.rs
+++ b/crates/hennery/src/main.rs
@@ -1225,0 +1226,6 @@ async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
+    // Before either child creates its own directory in it.
+    private_data_dir(&data_dir)?;
+    // Held until `up` returns, before either child starts: a second `up` on
+    // this data root would run a second collector on its database, also
+    // where the collector's admin socket cannot tell (its path too long).
+    let _lock = lock::acquire(&data_dir, lock::UP_LOCK, "hennery up")?;
@@ -1231,14 +1237,2 @@ async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
-        let config = if host_dir.join("host.toml.pending").exists() {
-            host_dir.join("host.toml.pending")
-        } else {
-            host_dir.join("host.toml")
-        };
-        if config.exists() {
-            let table: toml::Table =
-                toml::from_str(&std::fs::read_to_string(config)?).context("invalid host transport configuration")?;
-            let stored = table
-                .get("collector")
-                .and_then(|v| v.as_str())
-                .context("missing stored collector")?;
-            hennery_host::transport::CollectorEndpoint::stored(stored)?
-                .require_compatible(&hennery_host::transport::CollectorEndpoint::stored(&collector_ws_url)?)?;
+        if let Some(stored) = hennery_host::identity::stored_endpoint(&host_dir)? {
+            stored.require_compatible(&hennery_host::transport::CollectorEndpoint::stored(&collector_ws_url)?)?;
@@ -1247,6 +1240,0 @@ async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
-    // Before either child creates its own directory in it.
-    private_data_dir(&data_dir)?;
-    // Held until `up` returns, before either child starts: a second `up` on
-    // this data root would run a second collector on its database, also
-    // where the collector's admin socket cannot tell (its path too long).
-    let _lock = lock::acquire(&data_dir, lock::UP_LOCK, "hennery up")?;
diff --git a/crates/hennery/tests/cli.rs b/crates/hennery/tests/cli.rs
index fb48328e..43efcbae 100644
--- a/crates/hennery/tests/cli.rs
+++ b/crates/hennery/tests/cli.rs
@@ -2391 +2391,9 @@ fn join_refuses_an_overlong_line_on_standard_input_at_once() {
-    assert!(!host.exists(), "a pairing was stored");
+    let entries: Vec<_> = std::fs::read_dir(&host)
+        .unwrap()
+        .map(|entry| entry.unwrap().file_name())
+        .collect();
+    assert_eq!(
+        entries,
+        [std::ffi::OsString::from("host.lock")],
+        "identity or enrollment artifacts were stored before a valid code"
+    );
@@ -4303 +4311 @@ fn a_secure_loopback_pairing_rejects_join_run_and_up_plaintext_overrides() {
-    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
+    hennery_testkit::first_exec(&hennery().get_program().to_string_lossy());
@@ -4345 +4353,14 @@ fn a_secure_loopback_pairing_rejects_join_run_and_up_plaintext_overrides() {
-        let output = hennery().args(args).output().unwrap();
+        use std::os::unix::process::CommandExt;
+        let mut child = hennery()
+            .args(args)
+            .process_group(0)
+            .stdout(std::process::Stdio::piped())
+            .stderr(std::process::Stdio::piped())
+            .spawn()
+            .unwrap();
+        let status = wait_with_timeout(&mut child, Duration::from_secs(15));
+        if status.is_none() {
+            unsafe { libc::kill(-(child.id() as i32), libc::SIGKILL) };
+        }
+        let output = child.wait_with_output().unwrap();
+        assert!(status.is_some(), "downgrade refusal must happen before startup");
```

### 245b9f91 test(transport): assert every structured failure and recovery diagnostic

<!-- replay-commit: 245b9f917b5344d8cf70be22ed59dcba8561cd35 tree: b016a65513f8d0beb6d7bcf48dd20356f3ec806e -->

```diff
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 0556c803..82cd105b 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -295,2 +295,4 @@ pub(crate) fn inspect_receipt(data_dir: &Path) -> Result<()> {
-    if staged.public_key != Some(HostKey::load(&key_path)?.public_key_hex()) {
-        bail!("staged enrollment receipt has no matching key; preserve recovery artifacts");
+    let key = HostKey::load(&key_path)
+        .context("host.toml.pending has no matching key; preserve artifacts for explicit archive recovery")?;
+    if staged.public_key != Some(key.public_key_hex()) {
+        bail!("host.toml.pending has no matching key; preserve artifacts for explicit archive recovery");
@@ -634 +636,4 @@ cdf6b48fb39bfaa9b5a3cd01538280ec9e6d50c8831e9aae4d791f68112a6c04";
-        assert!(err.contains("host.toml.pending") && err.contains("remove"), "{err}");
+        assert!(
+            err.contains("host.toml.pending") && err.contains("preserve") && err.contains("archive"),
+            "{err}"
+        );
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index c8a29f84..88cb65c7 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -487,0 +488 @@ mod tests {
+            "https://@localhost",
@@ -568,0 +570,24 @@ mod diagnostic_tests {
+        assert_eq!(classify(&rustls::Error::General("fixture".into())), Stage::Tls);
+        let nested = std::io::Error::other(rustls::Error::InvalidCertificate(CertificateError::Expired));
+        assert_eq!(classify(&nested), Stage::TlsExpired);
+        let wrapped = tungstenite::error::TlsError::Rustls(
+            rustls::Error::InvalidCertificate(CertificateError::UnknownIssuer).into(),
+        );
+        assert_eq!(classify(&wrapped), Stage::TlsUnknownIssuer);
+        for stage in [
+            Stage::Dns,
+            Stage::Connect,
+            Stage::Tls,
+            Stage::TlsUnknownIssuer,
+            Stage::TlsNameMismatch,
+            Stage::TlsExpired,
+            Stage::TlsNotYetValid,
+            Stage::Upgrade {
+                status: Some(503),
+                retry_after: Some(3),
+            },
+            Stage::MissingNonce,
+            Stage::HelloTimeout,
+        ] {
+            assert_eq!(classify(failure(stage.clone()).as_ref()), stage);
+        }
diff --git a/crates/hennery/src/doctor/tests.rs b/crates/hennery/src/doctor/tests.rs
index 6974289c..3cf3dba2 100644
--- a/crates/hennery/src/doctor/tests.rs
+++ b/crates/hennery/src/doctor/tests.rs
@@ -2376,0 +2377,4 @@ fn each_step_to_the_collector_fails_on_its_own() {
+    assert!(matches!(
+        collector::healthz(&reqwest::Url::parse(&format!("http://{closing}")).unwrap()),
+        collector::Health::Failed(_)
+    ));
@@ -2384,0 +2389,11 @@ fn each_step_to_the_collector_fails_on_its_own() {
+    assert!(matches!(
+        collector::healthz(&reqwest::Url::parse(&format!("https://{plain}")).unwrap()),
+        collector::Health::Tls(_)
+    ));
+    assert_eq!(
+        collector::healthz(&reqwest::Url::parse(&format!("http://{plain}")).unwrap()),
+        collector::Health::Answered {
+            status: 200,
+            date: None
+        }
+    );
```

### f59028e7 test(transport): distinguish CA size and nonregular input refusals

<!-- replay-commit: f59028e718a602e5a4dc423dca240192d4f18026 tree: 9585cf925c2114f22bd7e77d5cd4c4143282de80 -->

```diff
diff --git a/README.md b/README.md
index d8ea2051..1397488b 100644
--- a/README.md
+++ b/README.md
@@ -144,0 +145,17 @@ configuration. Use `hennery doctor` to check TLS, health and the host upgrade.
+To move an existing tunnel pairing, park its sessions and stop the host
+service, then use `hennery host transport set <https-origin> --system-roots`
+(or `--ca-cert <file>`) with the existing host data directory. This verifies
+the existing identity and preserves its key, roots, CLI settings and outbox.
+Restarting the host parks adapters; resume sessions normally afterwards.
+For CA rotation, save an old-plus-new CA bundle, restart, renew the server,
+then save a bundle without the old CA and restart again. Leaf renewal under
+the same CA needs no host restart. A `DurabilityUncertain` save means the new
+settings are visible but may not survive a crash: inspect the saved endpoint
+and repeat the explicit save after storage is healthy.
+
+An uncertain enrollment blocks `join`, `run` and `up`. Follow doctor's attempt
+id: inspect the collector's Hosts list, revoke any entry created by that
+attempt, then use the explicit enrollment archive action before joining
+again. Archiving preserves the journal and key locally; it cannot confirm a
+remote revoke. Automatic pairing remains suppressed after an archive.
+
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index 88cb65c7..f78fdb68 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -614,0 +615 @@ mod ca_input_tests {
+        assert!(ca_roots(&format!("{pem}{}", " ".repeat(MAX_CA_BYTES))).is_err());
@@ -623 +624,6 @@ mod ca_input_tests {
-        assert!(CollectorTrust::import(dir.path()).is_err());
+        assert!(
+            CollectorTrust::import(dir.path())
+                .unwrap_err()
+                .to_string()
+                .contains("regular file")
+        );
@@ -628 +634,6 @@ mod ca_input_tests {
-        assert!(CollectorTrust::import(&fifo).is_err());
+        assert!(
+            CollectorTrust::import(&fifo)
+                .unwrap_err()
+                .to_string()
+                .contains("regular file")
+        );
```

### 46c5a215 test(transport): bind upgrade metadata and pre-spawn recovery refusals

<!-- replay-commit: 46c5a215e0cfa316f70192aa6c5f33b42431661b tree: 6a864d9daf94dece279c9d7662f74f6865d58a11 -->

```diff
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index 2fd5b56e..305654fb 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -333,0 +334 @@ mod tests {
+            assert!(require_resolved(dir.path()).is_err());
@@ -393 +394 @@ mod tests {
-        assert!(archive(dir.path(), "another-attempt").is_err());
+        assert!(archive(dir.path(), &uuid::Uuid::now_v7().to_string()).is_err());
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index f78fdb68..63a6ecb5 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -523,0 +524,7 @@ mod tests {
+        for text in [
+            "mode='system'",
+            " \"mode\" = \"system\" \n",
+            "\"mo\\u0064e\" = 'system'",
+        ] {
+            assert_eq!(toml::from_str::<CollectorTrust>(text).unwrap(), CollectorTrust::System);
+        }
@@ -528,0 +536,3 @@ mod tests {
+            "Mode='system'",
+            "mode='system'\nmode='ca_bundle'",
+            "mode='ca_bundle'\nca_pem='a'\nca_pem='b'",
@@ -549,0 +560,32 @@ mod tests {
+    #[tokio::test]
+    async fn upgrade_status_and_retry_after_are_structured() {
+        use tokio::io::{AsyncReadExt, AsyncWriteExt};
+        for (header, retry_after) in [("42", Some(42)), ("999", Some(300)), ("secret", None)] {
+            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+            let endpoint = CollectorEndpoint::public(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
+            let server = tokio::spawn(async move {
+                let (mut socket, _) = listener.accept().await.unwrap();
+                let mut bytes = [0; 4096];
+                socket.read(&mut bytes).await.unwrap();
+                socket
+                    .write_all(
+                        format!(
+                            "HTTP/1.1 503 Service Unavailable\r\nRetry-After: {header}\r\nContent-Length: 0\r\n\r\n"
+                        )
+                        .as_bytes(),
+                    )
+                    .await
+                    .unwrap();
+            });
+            let transport = CollectorTransport::new(endpoint, CollectorTrust::System).unwrap();
+            let error = transport.websocket(WebSocketConfig::default()).await.err().unwrap();
+            assert_eq!(
+                classify(error.as_ref()),
+                Stage::Upgrade {
+                    status: Some(503),
+                    retry_after
+                }
+            );
+            server.await.unwrap();
+        }
+    }
diff --git a/crates/hennery/tests/wss.rs b/crates/hennery/tests/wss.rs
index feab8ec0..5e82f01e 100644
--- a/crates/hennery/tests/wss.rs
+++ b/crates/hennery/tests/wss.rs
@@ -296,0 +297,4 @@ async fn every_ambiguous_reply_blocks_join_run_up_and_doctor_after_restart() {
+            assert!(
+                !root.path().join("collector").exists(),
+                "uncertainty must stop up before collector spawn/code mint"
+            );
@@ -618,0 +623,4 @@ async fn committed_post_uncertainty(kill: bool) {
+        assert!(
+            !root.path().join("collector").exists(),
+            "uncertainty must stop up before collector spawn/code mint"
+        );
@@ -625 +633 @@ async fn health_success_never_hides_broken_upgrade_nonce_or_redirects() {
-    for kind in ["missing", "malformed", "duplicate", "redirect"] {
+    for kind in ["missing", "malformed", "short", "long", "duplicate", "redirect"] {
@@ -667,0 +676,4 @@ async fn health_success_never_hides_broken_upgrade_nonce_or_redirects() {
+                                } else if kind == "short" {
+                                    "aa"
+                                } else if kind == "long" {
+                                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
```

### a3cfc014 test(pairing): cover migration refusal and interrupted archive cleanup

<!-- replay-commit: a3cfc014d171b047a40308f6b8f95628efb79f49 tree: 49f1da0d41eee3a468dfe91eadd7eb3c1c9bf36d -->

```diff
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index 305654fb..ac895637 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -409,0 +410,8 @@ mod tests {
+        // The existing marker skips its write on this pass: this failure is
+        // after active artifact removal and the marker's visible removal.
+        crate::identity::storage_hooks::fail_once(dir.path().join(RECOVERY), "directory_sync");
+        assert!(archive(dir.path(), &a.attempt_id).is_err());
+        assert!(dir.path().join(RECOVERY).exists());
+        assert!(!dir.path().join(JOURNAL).exists());
+        assert!(!dir.path().join("host.key.pending").exists());
+        assert!(inspect(dir.path()).is_err());
diff --git a/crates/hennery-host/src/transport.rs b/crates/hennery-host/src/transport.rs
index 63a6ecb5..63c0f5d6 100644
--- a/crates/hennery-host/src/transport.rs
+++ b/crates/hennery-host/src/transport.rs
@@ -568,2 +568,5 @@ mod tests {
-                let mut bytes = [0; 4096];
-                socket.read(&mut bytes).await.unwrap();
+                let mut bytes = Vec::new();
+                while !bytes.ends_with(b"\r\n\r\n") {
+                    assert!(bytes.len() < 4096, "bounded fixture request head");
+                    bytes.push(socket.read_u8().await.unwrap());
+                }
diff --git a/crates/hennery-host/tests/transport.rs b/crates/hennery-host/tests/transport.rs
index 34e50b4e..af7c74c2 100644
--- a/crates/hennery-host/tests/transport.rs
+++ b/crates/hennery-host/tests/transport.rs
@@ -13,0 +14 @@ struct Fixture {
+    verdict: Arc<AtomicUsize>,
@@ -47,0 +49,2 @@ async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
+    let verdict = Arc::new(AtomicUsize::new(0));
+    let reply = verdict.clone();
@@ -51,0 +55 @@ async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
+            let reply = reply.clone();
@@ -60 +64,5 @@ async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
-                            ws.send(Message::Text("{\"type\":\"hello_ack\",\"protocol_version\":\"1.0\",\"collector_version\":\"fixture\",\"committed\":{}}".into())).await.ok();
+                            let reply = match reply.load(Ordering::SeqCst) {
+                                0 => "{\"type\":\"hello_ack\",\"protocol_version\":\"1.0\",\"collector_version\":\"fixture\",\"committed\":{}}".to_string(),
+                                n => format!("{{\"type\":\"hello_error\",\"code\":\"{}\",\"message\":\"fixture\"}}", match n {1=>"already_connected",2=>"revoked",_=>"bad_proof"}),
+                            };
+                            ws.send(Message::Text(reply.into())).await.ok();
@@ -70,0 +79 @@ async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
+        verdict,
@@ -187,0 +197,19 @@ async fn transport_move_preserves_identity_outbox_and_configuration_and_reports_
+    for verdict in [2, 3] {
+        fixture.verdict.store(verdict, Ordering::SeqCst);
+        assert!(
+            set_transport(dir.path(), &fixture.url, Some(trust.clone()))
+                .await
+                .is_err()
+        );
+        assert_eq!(std::fs::read(&path).unwrap(), original);
+    }
+    fixture.verdict.store(1, Ordering::SeqCst);
+    assert_eq!(
+        set_transport(dir.path(), &fixture.url, Some(trust.clone()))
+            .await
+            .unwrap(),
+        hennery_host::connection::Standing::Connected
+    );
+    assert_eq!(std::fs::read(dir.path().join("host.key")).unwrap(), key);
+    std::fs::write(&path, &original).unwrap();
+    fixture.verdict.store(0, Ordering::SeqCst);
diff --git a/crates/hennery/tests/cli.rs b/crates/hennery/tests/cli.rs
index 43efcbae..13a6eed6 100644
--- a/crates/hennery/tests/cli.rs
+++ b/crates/hennery/tests/cli.rs
@@ -4367,0 +4368,4 @@ fn a_secure_loopback_pairing_rejects_join_run_and_up_plaintext_overrides() {
+        assert!(
+            !root.path().join("collector").exists(),
+            "up must refuse its derived downgrade before spawning a collector"
+        );
diff --git a/crates/hennery/tests/wss.rs b/crates/hennery/tests/wss.rs
index 5e82f01e..e5fa7ae8 100644
--- a/crates/hennery/tests/wss.rs
+++ b/crates/hennery/tests/wss.rs
@@ -750,0 +751,76 @@ async fn health_success_never_hides_broken_upgrade_nonce_or_redirects() {
+#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
+async fn confirmed_enrollment_with_a_failed_followup_reports_paired_and_keeps_the_identity() {
+    hennery_testkit::first_exec(env!("CARGO_BIN_EXE_hennery"));
+    let root = tempfile::tempdir().unwrap();
+    let db = root.path().join("collector.db");
+    let state = AppState::new(
+        Store::open(&db).unwrap(),
+        Hosts::open(&db).unwrap(),
+        Operator::open(&db).unwrap(),
+    );
+    let committed = Arc::new(AtomicUsize::new(0));
+    let gate = committed.clone();
+    let router = hennery_sessions::router(state.clone()).layer(axum::middleware::from_fn(
+        move |request: axum::extract::Request, next: axum::middleware::Next| {
+            let gate = gate.clone();
+            async move {
+                if request.uri().path() == "/api/hosts/ws" && gate.load(Ordering::SeqCst) > 0 {
+                    return axum::http::StatusCode::SERVICE_UNAVAILABLE.into_response();
+                }
+                let enrollment = request.uri().path() == "/api/hosts/enroll";
+                let response = next.run(request).await;
+                if enrollment && response.status() == 201 {
+                    gate.fetch_add(1, Ordering::SeqCst);
+                }
+                response
+            }
+        },
+    ));
+    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
+    let addr = listener.local_addr().unwrap();
+    let server = tokio::spawn(async move {
+        axum::serve(
+            listener,
+            router.into_make_service_with_connect_info::<std::net::SocketAddr>(),
+        )
+        .await
+        .unwrap();
+    });
+    let code = code(&state, addr).await;
+    let ca = TestCa::new();
+    let proxy = Proxy::start(addr, ca.server(vec!["localhost".into()], "valid")).await;
+    let roots = root.path().join("ca.pem");
+    std::fs::write(&roots, &ca.pem).unwrap();
+    let host = root.path().join("host");
+    let mut join = command(root.path());
+    join.args(["host", "join", &proxy.origin(), &code, "--no-runtime", "--ca-cert"])
+        .arg(&roots)
+        .arg("--data-dir")
+        .arg(&host);
+    let message = assert_failed(output(join).await);
+    assert!(
+        message.contains("paired as") && message.contains("connection failed") && message.contains("identity retained"),
+        "{message}"
+    );
+    let paired = Paired::read(&host).unwrap().unwrap();
+    assert_eq!(state.hosts.list().unwrap()[0].id, paired.host_id);
+    assert_eq!(paired.trust, CollectorTrust::CaBundle { pem: ca.pem });
+    assert!(!host.join(hennery_host::enrollment::JOURNAL).exists());
+    let before = std::fs::read(host.join("host.key")).unwrap();
+    let mut retry = command(root.path());
+    retry
+        .args([
+            "host",
+            "join",
+            &proxy.origin(),
+            "FRESH-CODE",
+            "--no-runtime",
+            "--data-dir",
+        ])
+        .arg(&host);
+    assert_failed(output(retry).await);
+    assert_eq!(std::fs::read(host.join("host.key")).unwrap(), before);
+    assert_eq!(committed.load(Ordering::SeqCst), 1);
+    server.abort();
+}
+
```

### decfc8f1 test(pairing): verify receipt bindings and every downgrade entry point

<!-- replay-commit: decfc8f12c7c3ac3b540c6db177ea50dfa45153e tree: 443289e1e14bebae1b35ae3fbd256fc6d94e65f0 -->

```diff
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index ac895637..e9234576 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -379,0 +380 @@ mod tests {
+        assert!(archive(dir.path(), &a.attempt_id).is_err());
@@ -402,0 +404,28 @@ mod tests {
+    fn a_receipt_must_match_each_binding_field_independently() {
+        for field in ["collector", "public_key", "host_id", "collector_tls"] {
+            let dir = tempfile::tempdir().unwrap();
+            let a = attempt(dir.path());
+            let key = HostKey::load(&dir.path().join("host.key.pending")).unwrap();
+            let path = dir.path().join("host.toml.pending");
+            crate::identity::write_config_to(&path, "wss://c.example/api/hosts/ws", "host-0123456789abcdef", &key)
+                .unwrap();
+            assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Confirmed(a));
+            let mut table: toml::Table = toml::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
+            let value = match field {
+                "collector" => toml::Value::String("wss://other.example/api/hosts/ws".into()),
+                "public_key" => toml::Value::String(HostKey::from_seed([31; 32]).public_key_hex()),
+                "host_id" => toml::Value::String("invalid".into()),
+                _ => toml::Value::try_from(CollectorTrust::CaBundle {
+                    pem: "different trust".into(),
+                })
+                .unwrap(),
+            };
+            table.insert(field.into(), value);
+            std::fs::write(&path, toml::to_string(&table).unwrap()).unwrap();
+            assert!(inspect(dir.path()).is_err(), "{field}");
+            assert!(crate::identity::Paired::load(dir.path()).is_err(), "{field}");
+            assert!(path.exists());
+            assert!(dir.path().join(JOURNAL).exists());
+        }
+    }
+    #[test]
diff --git a/crates/hennery/tests/cli.rs b/crates/hennery/tests/cli.rs
index 13a6eed6..5025691e 100644
--- a/crates/hennery/tests/cli.rs
+++ b/crates/hennery/tests/cli.rs
@@ -4344,0 +4345,9 @@ fn a_secure_loopback_pairing_rejects_join_run_and_up_plaintext_overrides() {
+        vec![
+            "host",
+            "transport",
+            "set",
+            &origin,
+            "--system-roots",
+            "--data-dir",
+            host.to_str().unwrap(),
+        ],
```

### 5b4582bd test(pairing): preserve malformed binary recovery artifacts

<!-- replay-commit: 5b4582bdca1bde86eb815ca798eb383decce3207 tree: de6ccee9d1347163b2d838608e29c522fb2f9fcc -->

```diff
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index e9234576..eaff0349 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -469,0 +470,18 @@ mod recovery_tests {
+    fn malformed_binary_journal_is_archived_byte_for_byte_without_reinterpreting_it() {
+        let dir = tempfile::tempdir().unwrap();
+        HostKey::from_seed([82; 32])
+            .save(&dir.path().join("host.key.pending"))
+            .unwrap();
+        let bytes = [0xff, 0x00, 0x01];
+        crate::identity::write_private(&dir.path().join(JOURNAL), &bytes).unwrap();
+        assert!(inspect(dir.path()).is_err());
+        let id = artifacts_id(dir.path()).unwrap();
+        archive(dir.path(), &id).unwrap();
+        assert_eq!(
+            std::fs::read(dir.path().join(format!("enrollment-archive-{id}/{JOURNAL}"))).unwrap(),
+            bytes
+        );
+        assert_eq!(inspect(dir.path()).unwrap(), EnrollmentState::Clear);
+        assert!(require_automatic_join_allowed(dir.path()).is_err());
+    }
+    #[test]
```

### 666c8ada fix(pairing): archive damaged enrollment files without decoding them

<!-- replay-commit: 666c8adaf318cf1b89c42075fc8a19cf63595a60 tree: 6d1293d8c56fc75357dd5c70f60d72336c985e4f -->

```diff
diff --git a/crates/hennery-host/src/enrollment.rs b/crates/hennery-host/src/enrollment.rs
index eaff0349..77fea79f 100644
--- a/crates/hennery-host/src/enrollment.rs
+++ b/crates/hennery-host/src/enrollment.rs
@@ -211 +211 @@ pub fn artifacts_id(dir: &Path) -> Result<String> {
-            hash.update(crate::identity::read_regular(&path, 512 * 1024)?.as_bytes());
+            hash.update(crate::identity::read_regular_bytes(&path, 512 * 1024)?);
@@ -282 +282 @@ pub fn archive(dir: &Path, attempt_id: &str) -> Result<()> {
-            let bytes = crate::identity::read_regular(&from, 512 * 1024)?.into_bytes();
+            let bytes = crate::identity::read_regular_bytes(&from, 512 * 1024)?;
diff --git a/crates/hennery-host/src/identity.rs b/crates/hennery-host/src/identity.rs
index 82cd105b..51aafcd3 100644
--- a/crates/hennery-host/src/identity.rs
+++ b/crates/hennery-host/src/identity.rs
@@ -303,0 +304,6 @@ pub(crate) fn read_regular(path: &Path, bound: usize) -> Result<String> {
+    String::from_utf8(read_regular_bytes(path, bound)?)
+        .map_err(|_| anyhow::anyhow!("transport configuration is not UTF-8; preserve recovery artifacts"))
+}
+/// Archive recovery copies damaged artifacts without interpreting their bytes;
+/// the same ownership, regular-file and size restrictions still apply.
+pub(crate) fn read_regular_bytes(path: &Path, bound: usize) -> Result<Vec<u8>> {
@@ -320 +326 @@ pub(crate) fn read_regular(path: &Path, bound: usize) -> Result<String> {
-    let mut text = String::new();
+    let mut text = Vec::new();
@@ -323 +329 @@ pub(crate) fn read_regular(path: &Path, bound: usize) -> Result<String> {
-        .read_to_string(&mut text)?;
+        .read_to_end(&mut text)?;
```

### eca1e95b test(transport): prevent hello parser diagnostics from echoing response bodies

<!-- replay-commit: eca1e95b114c2431a8dfff41af264196d6bfaed3 tree: 50c46f2536a58c4e7a3489141edaf111c3ddae20 -->

```diff
diff --git a/crates/hennery-host/tests/transport.rs b/crates/hennery-host/tests/transport.rs
index af7c74c2..9e3aa89f 100644
--- a/crates/hennery-host/tests/transport.rs
+++ b/crates/hennery-host/tests/transport.rs
@@ -65,0 +66 @@ async fn fixture(names: Vec<String>, nonce: &'static str) -> Fixture {
+                                4 => "{\"type\":\"sensitive-hello-body-canary\"}".to_string(),
@@ -136,0 +138,24 @@ async fn invalid_nonce_is_refused_before_any_hello() {
+#[tokio::test]
+async fn malformed_hello_diagnostics_never_reflect_response_bodies() {
+    let f = fixture(
+        vec!["localhost".into()],
+        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
+    )
+    .await;
+    f.verdict.store(4, Ordering::SeqCst);
+    let transport = CollectorTransport::new(
+        CollectorEndpoint::public(&f.url).unwrap(),
+        CollectorTrust::CaBundle { pem: f.pem.clone() },
+    )
+    .unwrap();
+    let error = hennery_host::connection::probe_transport(
+        &transport,
+        "host-0123456789abcdef",
+        &hennery_host::identity::HostKey::from_seed([126; 32]),
+    )
+    .await
+    .unwrap_err();
+    assert!(!format!("{error:#}").contains("sensitive-hello-body-canary"));
+    assert!(error.to_string().contains("invalid collector hello response"));
+}
+
```

### 6d470b74 fix(transport): redact malformed collector hello responses

<!-- replay-commit: 6d470b749519731af9c08fca17b32e336e1bbf4a tree: cb957b78c5eb47363226bbce0d44ba6e2ec3dee3 -->

```diff
diff --git a/crates/hennery-host/src/connection.rs b/crates/hennery-host/src/connection.rs
index f6834891..87742836 100644
--- a/crates/hennery-host/src/connection.rs
+++ b/crates/hennery-host/src/connection.rs
@@ -390 +390,2 @@ async fn handshake(
-        Ok(Some(Ok(Message::Text(text)))) => serde_json::from_str::<CollectorFrame>(&text)?,
+        Ok(Some(Ok(Message::Text(text)))) => serde_json::from_str::<CollectorFrame>(&text)
+            .map_err(|_| anyhow::anyhow!("invalid collector hello response"))?,
```

## Documentation index

The following patch is metadata applied after the implementation snapshots.

```diff
diff --git a/docs/README.md b/docs/README.md
index 1fa3de64..6c53ecf0 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -28 +28 @@ slice); everything else is design. The maintainer's decisions are recorded below
-   - [Remote hosts over WSS](specs/2026-10-14-wss-design.md) — proposed verified TLS, private-CA trust, tunnel migration, reconnect/doctor parity and reverse-proxy rate limits; two M plans, pending review.
+   - [Remote hosts over WSS](specs/2026-10-14-wss-design.md) — approved design per the fleet parent, including the three re-confirmed amendments; verified TLS/private-CA trust, tunnel migration and reconnect/doctor parity are W1; reverse-proxy attribution/public deployment remain W2.
@@ -112,0 +113,2 @@ slice); everything else is design. The maintainer's decisions are recorded below
+   - [WSS transport and diagnostics (W1)](plans/2026-10-26-wss-transport.md) — built and replayed on `8bb29904`; the maintainer-delegated review returned APPROVE AFTER AMENDMENTS, all three implemented and folded into their tasks. Draft PR #139 awaits scoped re-review, Linux/macOS CI and real-adapter/MCP acceptance; W2 remains deferred.
+
```

## Verification and execution record

The amended implementation passed all six Rust checks and the separate doctor tests in fresh replay 5 on `8bb29904`: 2,026 Rust tests across 133 suites, no failures or ignored tests. The extra upstream README test and four amendment tests account for the increase from 2,021. The prior web verification remains 93 files / 1,618 tests; no web source or dependency changed in these amendments, so it was not repeated.

| Command (inside `nix develop -c`) | Result |
|---|---|
| `cargo fmt --all --check` | exit 0 |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | exit 0 |
| `cargo clippy -p hennery --locked -- -D warnings` | exit 0; test hooks excluded from shipped binary |
| `cargo test --workspace --locked` | exit 0, 2,026 passed across 133 test/doc-test suites on final replay |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | exit 0 |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | exit 0 |
| `cargo test -p hennery --bin hennery --locked doctor::` | exit 0, 41 passed |
| `cargo test -p hennery-host --test transport --features test-hooks --locked` | exit 0, 7 passed |
| `cargo test -p hennery-testkit --test join --locked` | exit 0, 13 passed; 18 file-storage boundaries plus both directory-parent boundaries and their retries |
| `cargo test -p hennery-testkit --test host_connection --locked` | exit 0, 27 passed |
| `cargo test -p hennery --test wss --locked` | exit 0, 12 passed on final replay |
| `pnpm --dir web install --frozen-lockfile` | exit 0 |
| `pnpm --dir web typecheck` | exit 0 |
| `pnpm --dir web test` | exit 0, 93 files / 1,618 tests |
| `pnpm --dir web build` | exit 0 |
| `cargo tree -i rustls --locked` | exit 0, one rustls 0.23.45 shared by reqwest/tokio-tungstenite and the explicit connector |

**Final replay (2026-10-14):** all seven Rust check commands above exited 0, including the separate doctor run (41 passed). Extraction found 23 nonempty diff blocks, 33 changed files, and all 22 implementation commit trees matched exactly. The entire tracked tree, including the plan and documentation index, matched byte for byte. Implementation head: `6d470b74`; its immutable tree is recorded by its replay marker. Final execution-record prose is copied as metadata and the full tree comparison is repeated before push.

| Additional targeted command | Result |
|---|---|
| `cargo test -p hennery-host --lib --locked` | exit 0, 124 passed |
| `cargo test -p hennery --test cli --locked a_secure_loopback` | exit 0, 1 passed; join/run/up/transport set refused before hello and before collector spawn |
| `cargo test -p hennery-testkit --test e2e --locked wss_outage_renewal` | exit 0, 1 passed per copy in the final load |

### RED evidence and integration failures

The review amendments each have recorded pre-fix failures: ancestor-sync injection returned success (identity and enrollment boundary tests, exit 101); unsafe mode `0720` sent one POST instead of zero (exit 101); the owner-policy assertion accepted a mismatching UID before its guard (exit 101). The fixes passed identity 13 and enrollment 13 tests. Ancestor sync is retried for existing entries left by failure, before any key is staged. Both group and other write bits, ownership, no-follow destination opening, the validation call itself, and the actual parent sync are independently removed by probes. The shared private-directory helper enforces owner/permission checks for all its callers, including collector setup, while preserving readable but non-writable modes. The first-exec fixture policy was observed RED (exit 1), fixed, removed and observed RED again, then restored; the real committed-POST process tests passed 2/2. All amendments are folded into their owning task commits.

Tasks 1–3 and 5 each failed the introduced runtime assertion (0 passed, 1 failed). Task 4's deterministic jitter API and Task 6's structured certificate variants were absent at the test commit, producing compile-time RED. After implementation, targeted suites passed. Later complete runs found invalid legacy fixture URLs, inherited GPG signing in temporary git repositories, a startup-lock ordering regression and assumptions that no directory could exist before bounded stdin. These were corrected in code/fixtures: no type, lint or security rule was weakened. The stdin assertion now permits only the lock required before pairing-state inspection.

Probe survivors led to additional valid oversized CA input, specific nonregular-input diagnostics, valid short/long nonce input, direct uncertainty assertions, valid wrong attempt IDs, and zero collector-directory assertions before `up` starts. An HTTP redirect probe was retargeted from the WSS redirect fixture to the health HTTP fixture. The archive ID probe removes its two overlapping ID checks together; each alone still refuses through the other. Compile errors do not count as caught mutations.

### Load and probes

**Post-review rerun:** all 60 runs passed inside plain `nix develop -c`: four copies × three rounds of WSS (12), enrollment (13), reconnect (27), WSS outage/renewal (1), and identity (13), totaling 792 test executions. All 117 runtime/classifier mutations and 11 actual sync-call removals were caught (128 independent mutations). This reruns every previous functional/classifier anchor plus hello redaction and adds six directory guards and the real directory-parent sync removal. The six new runtime probes also passed independently before this complete rerun and are not double-counted. The separate required-first-exec source-policy removal failed, then passed after byte-for-byte restoration; it is not counted as a runtime or syscall mutation. No cold Gatekeeper scan is simulated.

**Earlier load history:** the enrollment `join`, process `wss`, reconnect `host_connection`, and WSS outage/renewal/collector-restart test binaries ran in four copies for each of three rounds. The original 48 runs all passed (600 test executions); the expanded WSS binary includes its additional confirmed-enrollment failure case, and all 48 expanded runs passed (612 test executions). The final replay binaries, including archive-byte recovery and hello-error redaction, then passed all 48 runs again inside plain `nix develop -c` (612 test executions). No load failure occurred.

**Before review, 121 independent mutation probes were caught:** 110 behavioral/classifier probes in the dedicated probe tree, ten actual sync-call probes, and the final hello-body redaction probe in the isolated implementation worktree (restored byte for byte afterwards). Every behavioral probe compiled and failed a test assertion; a compile failure is not counted. The retained `probe-summary.json` contains the exact replaced text, command, status and log name for each. The ten syscall probes retain nonzero baseline and mutated syscall counters. The first pass caught 75 of 82; all seven survivors were corrected or retargeted as described above, and their reruns failed. No unresolved survivor remains.

The inventory covers URL path/query/fragment/credentials/port/plaintext guards, the plaintext-only alias rule, private-CA input and verifier selection, HTTP proxy/redirect policy, nonce uniqueness and length, all structured TLS and forwarded stage verdicts, HTTP upgrade status/Retry-After and jitter, all standing/prepared/joined/enrollment/health verdicts, each receipt binding, pending key/journal/receipt installation and rejection cleanup, archive copies/markers/removal/recovery/automatic suppression, explicit migration endpoint/trust saves and standing refusal, pairing lock, all five downgrade call sites, `up` uncertainty before spawn, and damaged binary artifact preservation. Sync probes cover file/directory/rename/remove durability, confirmed key/config/directory durability and archive cleanup durability.

Real sync calls are independently observed by a scratch-only Darwin dynamic-library interposer on `F_FULLFSYNC`/`fsync`, rather than treating a failure-hook call as proof of the system call. Baselines assert a nonzero trace. Removing file, directory, rename/removal, confirmed-receipt and archive cleanup sync calls must change the syscall trace. This tracer is not shipped with the product. All fixtures use generated scratch identities and certificates.

### Fresh replay

The final amended replay starts in fresh `wss-w1-replay-5` at `8bb29904`, with its own initially empty Rust target. It extracts every `diff` fence in this document, rejects zero extraction, applies patches in order, and checks the expected Git tree after every implementation commit. Only this plan and its documentation-index patch are metadata; no implementation source is copied from the implementation checkout. The plan itself is copied for the self-describing document, then the entire staged tree is compared byte for byte. The first replay had 19 blocks / 33 files and matched all 18 implementation snapshots, but a subsequent recovery test exposed non-UTF-8 artifact handling; it is retained rather than called the final replay.

The damaged-artifact test was observed RED (0 passed, 1 failed), then fixed by factoring the bounded no-follow, ownership-checked reader into bytes plus a UTF-8 configuration wrapper. Identity/configuration parsing still refuses invalid UTF-8; explicit archive recovery preserves arbitrary damaged bytes. The host suite then passed all 122 tests and workspace clippy passed.

The second fresh replay matched all 20 snapshots. Its patch context contained whitespace-only lines inside diff fences; the final document uses zero-context diffs to satisfy whitespace hygiene without altering implementation bytes. The third fresh directory verified that zero-context extraction. The final canary test then exposed the initial hello parser reflecting an unknown frame tag in its serde error. It was observed RED (0 passed, 1 failed), sanitized without changing acceptance, and all seven TLS integration tests passed. The fourth directory verified the original reviewed implementation. After review, non-interactive fixup/autosquash folded directory tests into Task 2 and Task 3, directory implementation into Task 2, and first-exec warming into Task 6; signing was disabled for each rewriting operation. The fifth fresh directory extracted the amended 22-commit implementation after the conflict-free rebase onto `8bb29904`.

The amended extraction runner is `.superpowers/sdd/wss-w1/replay5.py`. After extraction, formatting, both clippy variants, full workspace tests, both generator checks and doctor tests ran in the replay directory via plain `nix develop -c`, with separate command logs. A documentation-only execution record refresh copies only the plan metadata and checks the full tree again.

### Availability and limits

Draft PR #139 is parent-managed. The maintainer-delegated Codex gpt-6-astra review of `fa81e548..bc0caeff` returned APPROVE AFTER AMENDMENTS with two Important findings and one Minor finding, no Critical findings. All three were implemented; scoped parent-run re-review and Linux/macOS CI remain required before merge. The local OS is macOS; actual native root loading was tested here, and Linux must be checked in CI. No credentials or disposable public deployment were provided for both pinned Claude and Codex adapters or mounted MCP live acceptance. The plan records that release gate as open instead of substituting fake adapters.

The public proxy's shared loopback rate-limit budget remains a limitation until W2. Healthy HTTPS/WSS does not prove proxy attribution or limiter isolation. Check 16 still reads configured `public_url`, not a post-setup database value, and says so.

Retained scratch trees: `wss-w1-probes-1`, `wss-w1-probes-2`, `wss-w1-replay-1`, `wss-w1-replay-2`, `wss-w1-replay-3`, `wss-w1-replay-4` and `wss-w1-replay-5`. They are not deleted. Their idle targets are cleaned once verification ends; the parent owns cleanup of the directories.

## After this plan

- Parent: scoped re-review of the amendments against `bc0caeff`, or the whole rewritten range `8bb29904..plan/wss-w1`. Focus on ancestor-link durability (including failed-creation retry), shared directory ownership/permissions and symlink refusal before key/POST, and the warmed process deadline. The retained range-diff maps the old and rewritten task commits.
- Parent: maintain draft PR #139 and inspect checks, `reviewDecision`, `mergeStateStatus` and all unresolved review threads, bots included. This child uses no GitHub route.
- Parent: Linux/macOS CI and the design's disposable real-adapter/MCP acceptance gate; record versions and unavailable credentials honestly.
- W2: proxy attribution, isolated client budgets, Caddy/nginx recipes, deployment/rollback exercises, public deployment and associated proxy/live acceptance. Retain the tunnel section until that work is accepted.
- Deferred by the design: certificate/SPKI pinning, outbound corporate proxies, automatic discovery of lost enrolled IDs, collector TLS termination and changing adapter/browser trust globally.

Generated with Claude AI — please review before distribution.
