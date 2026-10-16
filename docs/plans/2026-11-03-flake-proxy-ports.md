# Proxy fixture port lifetimes (flake 15)

**Base:** `6cb867c6`. **Branch:** `fix/flake-proxy-ports`.

## Execution status

Built test-first and verified in the dedicated `flake-15` worktree: all final
Rust gates, loaded repeats, copy probes and fresh replay passed. Independent
review and Linux CI remain parent-owned. No changes to PR #157 or its branch.

## Scope and root cause

CI run 38834118867, job 116759252938, failed
`caddy_outage_keeps_one_adapter_and_exactly_one_answer` when Caddy resumed:
its saved admin TCP port was already in use. The fixture selected both TLS
and admin ports by binding port zero, reading the chosen number and dropping
the listener. Stopping the proxy therefore released both numbers while the
fixture still expected to reuse them. Another fixture allocator or a kernel
port-zero allocation could consume either port during that gap.

A deterministic regression pauses Caddy, forces a second allocation to try
the old admin number, binds the number returned and resumes Caddy. On the
old allocator it fails at the same administration-endpoint bind error.
A child-process regression also demonstrates duplicate issuance of an
unbound number before the fix. Both are runtime RED failures, not compiler
failures. The identity of the original competing CI socket is unconfirmed.

The first leased allocator still used temporary bind/listen probes. Its
loaded run found two failures when binding a just-issued number. A new
deterministic regression forks a child inside the real probe and holds it
before exec/exit: the inherited listener keeps the number busy after the
probe returns (runtime RED). The final probe creates no candidate listener;
it checks for connection refusal on both loopbacks. The fork regression is
then GREEN. The exact descriptor behind the two spontaneous failures was
not traced, but the descriptor-inheritance defect is proved independently.

## Decisions and global constraints

- Keep the shipped TCP Caddy/nginx recipes and stable TLS/admin numbers.
  A Unix admin socket or a changed admin number alone would leave TLS
  reuse exposed. Socket passing would require proxy-specific launch and
  recipe changes. The existing fixture protocol needs neither.
- Retain per-port file-lock leases in a process-wide registry until process
  exit, including through pause/resume and fixture drop. Separate test
  processes coordinate through the same lease files. Never unlink a lease
  file: a replacement inode could bypass an existing lock.
- Use a private per-user directory under stable `/tmp`. `nix develop` gives
  different shells different `TMPDIR` values; a per-shell registry would
  not coordinate parallel jobs. The child regression changes `TMPDIR`.
- Exclude the configured Linux ephemeral range, and macOS normal/high
  ranges, including their endpoints. This keeps unrelated port-zero
  listeners and outbound clients away from the saved proxy numbers.
- Require connection refusal on both loopbacks before issuing a number;
  every other outcome excludes that candidate. Do not bind temporary
  listeners that another thread's fork could inherit. The bounded connect
  check does not retry or extend a proxy startup deadline.
- No proxy startup retries, new sleeps, longer deadlines, changed assertions
  in the original outage test, dependencies or production changes.

These advisory leases coordinate fixture allocators. An unrelated program
that explicitly binds a saved non-ephemeral number does not honor them.
The change addresses the demonstrated fixture/kernel allocation mechanism;
it does not claim ownership against arbitrary non-cooperating fixed binds.

## Review focus

Lease retention and cross-process locking; stable registry path despite
TMPDIR differences; kernel range discovery on Linux versus macOS; IPv4 and
IPv6 availability; unchanged client-visible TLS number through outages;
real Caddy admin reload and nginx restart behavior. All new logic is in
`hennery-testkit`; the shipped proxy recipes and product are unchanged.

## File structure

- `crates/hennery-testkit/src/reverse_proxy.rs`: leased allocation and the
  deterministic fixture/allocator regressions.
- `docs/README.md`: execution-record index.

## Task 1: reproduce, allocate leases, verify and replay

- [x] Admin-port and cross-process contention regressions: runtime RED
  (exit 101, one failed each), then GREEN with retained leases.
- [x] The first loaded candidate failed two of twelve workers. Its temporary
  bind probes were replaced only after the fork regression also went RED
  (exit 101, one failed). All failed-attempt logs remain in the ledger.
- [x] Final unit suite: 8 passed, exit 0. Targeted original proxy and outage
  suites passed before the fork-probe correction (7 and 2 respectively);
  final loaded/replay/workspace runs cover the corrected source.
- [x] Eight final copy probes: lease retention, flock, ephemeral exclusion,
  each loopback, stable registry root, original allocator, and forked-listener
  reintroduction. Each exits 101 on runtime assertions; the original allocator
  reproduces the same Caddy admin bind error. Restored suite: 8 passed,
  exit 0; source bytes match the tested worktree.
- [x] Final fmt, workspace/all-target clippy, production clippy and both
  generator checks: exit 0. No Nix files or web files changed.

- [x] Final `cargo test --workspace --locked`: exit 0, 2,452 passed and one
  unchanged ignored test. The earlier candidate's workspace run also exited
  0 (2,451 passed, one ignored); the failed load and added fork regression
  justified the final workspace rerun after the probe correction.
- [x] Final loaded repeats: four copies × three rounds, with four nice CPU
  competitors throughout. Twelve complete runs each of the unit (8), proxy
  (7) and original outage (2) selections: 36 suite runs / 204 test executions,
  zero failures, exit 0. Both proxies' long idle checks remain unchanged.
- [x] Fresh replay from the embedded patch: 8 unit, 7 proxy and 2 outage
  tests passed, exit 0. One extracted block / two patched files; all 836
  tracked files matched byte for byte, plus the copied execution record.

Full commands and output are retained in `.superpowers/sdd/flake-15/`.
The final gates are `cargo fmt --all --check`, both clippy commands from
AGENTS.md, both generator checks and the workspace test command above,
all through `nix develop`. No flake or browser checks were required because
their inputs did not change. The probe and replay copies remain for parent
cleanup; each received its own `/bin/cp -c -R` clone of `target/` before build.

### Exact patch for fresh replay

Extract this diff block, require two changed files, and apply to `6cb867c6`
in a fresh copy with its own APFS-cloned `target/`. Run:

- `cargo test -p hennery-testkit --lib --locked reverse_proxy::tests`
- `cargo test -p hennery-testkit --test reverse_proxy --locked`
- `cargo test -p hennery-testkit --test e2e --locked outage_keeps_one_adapter_and_exactly_one_answer`

Every command runs inside `nix develop`. Compare all tracked source/index
files byte for byte with the tested worktree. This execution record is
metadata copied separately after the implementation matches.

```diff
diff --git a/crates/hennery-testkit/src/reverse_proxy.rs b/crates/hennery-testkit/src/reverse_proxy.rs
index 1d09636c..87ca2071 100644
--- a/crates/hennery-testkit/src/reverse_proxy.rs
+++ b/crates/hennery-testkit/src/reverse_proxy.rs
@@ -1,6 +1,11 @@
 //! The shipped Caddy/nginx recipes, with fixture-only placeholder substitution.
 use crate::tls::TestCa;
+use std::fs::{File, OpenOptions};
+use std::ops::RangeInclusive;
+use std::os::fd::AsRawFd;
+use std::os::unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt};
 use std::os::unix::process::CommandExt;
+use std::sync::{Mutex, OnceLock};
 use std::{
     net::SocketAddr,
     path::{Path, PathBuf},
@@ -15,12 +20,133 @@ pub struct RecipeProxy {
     admin: u16,
     child: Child,
 }
-fn free_port() -> u16 {
-    std::net::TcpListener::bind("127.0.0.1:0")
-        .unwrap()
-        .local_addr()
-        .unwrap()
-        .port()
+fn lease_port() -> u16 {
+    lease_port_from(None)
+}
+
+// Retain leases until process exit, including while a proxy is stopped.
+// flock also excludes other test binaries/dev shells; a :0 bind elsewhere
+// cannot consume these ports because the ephemeral ranges are excluded.
+static PORT_LEASES: Mutex<Vec<File>> = Mutex::new(Vec::new());
+
+fn lease_port_from(preferred: Option<u16>) -> u16 {
+    static RANGES: OnceLock<Vec<RangeInclusive<u16>>> = OnceLock::new();
+    let ranges = RANGES.get_or_init(ephemeral_ranges);
+    // Do not use temp_dir(): nix develop gives each shell its own TMPDIR.
+    // SAFETY: geteuid has no preconditions.
+    let uid = unsafe { libc::geteuid() };
+    let root = PathBuf::from(format!("/tmp/hennery-testkit-proxy-ports-{uid}"));
+    match std::fs::DirBuilder::new().mode(0o700).create(&root) {
+        Ok(()) => {}
+        Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists => {}
+        Err(err) => panic!("create proxy port lease directory: {err}"),
+    }
+    let metadata = std::fs::symlink_metadata(&root).unwrap();
+    assert!(
+        metadata.is_dir() && metadata.uid() == uid && metadata.mode() & 0o077 == 0,
+        "proxy port lease directory must be private and owned by this user"
+    );
+    let mut leases = PORT_LEASES.lock().unwrap();
+    // The preferred candidate is a deterministic contention seam; normal
+    // callers scan the same non-privileged range on every supported OS.
+    for port in preferred.into_iter().chain(10000..=u16::MAX) {
+        if port < 10000 || ranges.iter().any(|range| range.contains(&port)) {
+            continue;
+        }
+        let lease = OpenOptions::new()
+            .read(true)
+            .write(true)
+            .create(true)
+            .truncate(false)
+            .mode(0o600)
+            .custom_flags(libc::O_NOFOLLOW)
+            .open(root.join(port.to_string()))
+            .unwrap();
+        // SAFETY: lease owns a live descriptor. Nonblocking locking is
+        // candidate selection, never a retry of a failed proxy startup.
+        if unsafe { libc::flock(lease.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
+            let err = std::io::Error::last_os_error();
+            assert_eq!(err.kind(), std::io::ErrorKind::WouldBlock, "proxy port lease: {err}");
+            continue;
+        }
+        if !loopbacks_available(port) {
+            continue;
+        }
+        leases.push(lease);
+        return port;
+    }
+    panic!("no proxy port available outside the ephemeral ranges: {ranges:?}");
+}
+
+fn loopbacks_available(port: u16) -> bool {
+    loopbacks_available_after_probe(port, || {})
+}
+
+fn loopbacks_available_after_probe(port: u16, after_probe: impl FnOnce()) -> bool {
+    // Never bind a temporary listener: a concurrent fork can inherit it
+    // until exec, keeping the port busy after this function returns.
+    // Refusal on both families means no existing TCP listener; every
+    // other outcome conservatively excludes this candidate.
+    let available = ["127.0.0.1", "::1"].into_iter().all(|ip| {
+        matches!(
+            std::net::TcpStream::connect_timeout(
+                &SocketAddr::new(ip.parse().unwrap(), port),
+                Duration::from_millis(100),
+            ),
+            Err(err) if err.kind() == std::io::ErrorKind::ConnectionRefused
+        )
+    });
+    after_probe();
+    available
+}
+
+fn ephemeral_ranges() -> Vec<RangeInclusive<u16>> {
+    #[cfg(target_os = "linux")]
+    {
+        vec![parse_ephemeral_range(
+            &std::fs::read_to_string("/proc/sys/net/ipv4/ip_local_port_range").unwrap(),
+        )]
+    }
+    #[cfg(target_os = "macos")]
+    {
+        fn port(name: &std::ffi::CStr) -> u16 {
+            let mut value: libc::c_int = 0;
+            let mut size = std::mem::size_of_val(&value);
+            // SAFETY: name is NUL-terminated and value/size are valid
+            // writable buffers of the stated sizes; no new value is set.
+            let result = unsafe {
+                libc::sysctlbyname(
+                    name.as_ptr(),
+                    (&raw mut value).cast(),
+                    &mut size,
+                    std::ptr::null_mut(),
+                    0,
+                )
+            };
+            assert_eq!(result, 0, "read {name:?}: {}", std::io::Error::last_os_error());
+            assert_eq!(size, std::mem::size_of_val(&value));
+            u16::try_from(value).unwrap()
+        }
+        [
+            (c"net.inet.ip.portrange.first", c"net.inet.ip.portrange.last"),
+            (c"net.inet.ip.portrange.hifirst", c"net.inet.ip.portrange.hilast"),
+        ]
+        .map(|(first, last)| {
+            let (first, last) = (port(first), port(last));
+            first.min(last)..=first.max(last)
+        })
+        .into()
+    }
+    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
+    panic!("proxy fixtures require a known OS ephemeral port range");
+}
+
+#[cfg(any(target_os = "linux", test))]
+fn parse_ephemeral_range(text: &str) -> RangeInclusive<u16> {
+    let ports: Vec<u16> = text.split_whitespace().map(|word| word.parse().unwrap()).collect();
+    assert_eq!(ports.len(), 2, "kernel ephemeral port range");
+    assert!(ports[0] <= ports[1], "kernel ephemeral port range order");
+    ports[0]..=ports[1]
 }
 impl RecipeProxy {
     fn write_certificates(root: &Path, ca: &TestCa) {
@@ -63,8 +189,8 @@ impl RecipeProxy {
             String::from_utf8_lossy(&version.stdout),
             String::from_utf8_lossy(&version.stderr)
         );
-        let port = free_port();
-        let admin = free_port();
+        let port = lease_port();
+        let admin = lease_port();
         Self::write_certificates(&root, ca);
         let recipe = Path::new(env!("CARGO_MANIFEST_DIR"))
             .join("../../packaging/proxy")
@@ -243,6 +369,136 @@ impl Drop for RecipeProxy {
 mod tests {
     use super::*;
     use std::os::unix::fs::MetadataExt;
+
+    #[tokio::test]
+    async fn paused_caddy_admin_port_is_not_reissued() {
+        paused_port_is_not_reissued("caddy", true).await;
+    }
+
+    #[tokio::test]
+    async fn paused_caddy_tls_port_is_not_reissued() {
+        paused_port_is_not_reissued("caddy", false).await;
+    }
+
+    #[tokio::test]
+    async fn paused_nginx_tls_port_is_not_reissued() {
+        paused_port_is_not_reissued("nginx", false).await;
+    }
+
+    #[test]
+    fn proxy_ports_exclude_ephemeral_range_boundaries() {
+        for range in ephemeral_ranges() {
+            for port in [*range.start(), *range.end()] {
+                assert!(!range.contains(&lease_port_from(Some(port))));
+            }
+        }
+        assert_eq!(parse_ephemeral_range("32768\t60999\n"), 32768..=60999);
+    }
+
+    #[test]
+    fn proxy_port_probe_checks_both_loopbacks() {
+        let port = lease_port();
+        assert!(loopbacks_available(port));
+        for ip in ["127.0.0.1", "::1"] {
+            let busy = std::net::TcpListener::bind((ip, port)).unwrap();
+            assert!(!loopbacks_available(port), "port occupied on {ip}");
+            drop(busy);
+        }
+    }
+
+    #[test]
+    fn a_fork_during_the_probe_cannot_keep_the_proxy_port_bound() {
+        let port = lease_port();
+        let mut child = None;
+        let available = loopbacks_available_after_probe(port, || {
+            let mut pipe = [-1; 2];
+            // SAFETY: pipe points to two writable descriptors. After fork,
+            // the child uses only async-signal-safe libc calls, then _exit.
+            unsafe {
+                assert_eq!(libc::pipe(pipe.as_mut_ptr()), 0);
+                let pid = libc::fork();
+                assert!(pid >= 0);
+                if pid == 0 {
+                    libc::close(pipe[1]);
+                    let mut byte = 0u8;
+                    libc::read(pipe[0], (&raw mut byte).cast(), 1);
+                    libc::_exit(0);
+                }
+                libc::close(pipe[0]);
+                child = Some((pid, pipe[1]));
+            }
+        });
+        // The child is held before exec/exit. CLOEXEC cannot close any
+        // inherited probe listener yet; the real proxy must still bind.
+        let bound = std::net::TcpListener::bind(("127.0.0.1", port));
+        let (pid, release) = child.expect("probe completed");
+        // SAFETY: only our pipe and child; release before any assertion so
+        // a regression cannot leave the child blocked or unreaped.
+        unsafe {
+            libc::write(release, b"x".as_ptr().cast(), 1);
+            libc::close(release);
+            assert_eq!(libc::waitpid(pid, std::ptr::null_mut(), 0), pid);
+        }
+        assert!(available);
+        assert!(bound.is_ok(), "a fork inherited the temporary port probe: {bound:?}");
+    }
+
+    #[test]
+    fn proxy_ports_are_leased_across_processes() {
+        const CANDIDATE: &str = "HENNERY_TEST_PROXY_PORT_CANDIDATE";
+        if let Ok(port) = std::env::var(CANDIDATE) {
+            let port = port.parse().unwrap();
+            assert_ne!(
+                lease_port_from(Some(port)),
+                port,
+                "another process owns this port lease"
+            );
+            return;
+        }
+        let port = lease_port();
+        let dir = tempfile::tempdir().unwrap();
+        let out = Command::new(std::env::current_exe().unwrap())
+            .args([
+                "--exact",
+                "reverse_proxy::tests::proxy_ports_are_leased_across_processes",
+            ])
+            .env(CANDIDATE, port.to_string())
+            .env("TMPDIR", dir.path())
+            .env("HOME", dir.path())
+            .env("XDG_CONFIG_HOME", dir.path())
+            .env("XDG_DATA_HOME", dir.path())
+            .env("XDG_CACHE_HOME", dir.path())
+            .env("XDG_STATE_HOME", dir.path())
+            .env_remove("HENNERY_DATA_DIR")
+            .env_remove("HENNERY_HOST_DATA_DIR")
+            .output()
+            .unwrap();
+        let stdout = String::from_utf8_lossy(&out.stdout);
+        assert!(
+            out.status.success() && stdout.contains("1 passed"),
+            "child lease check: {stdout}{}",
+            String::from_utf8_lossy(&out.stderr)
+        );
+    }
+
+    async fn paused_port_is_not_reissued(kind: &str, admin: bool) {
+        let dir = tempfile::tempdir().unwrap();
+        let ca = TestCa::new();
+        let backend = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
+        let mut proxy = RecipeProxy::start(kind, backend.local_addr().unwrap(), &ca, dir.path()).await;
+        let original_tls = proxy.port();
+        let contested = if admin { proxy.admin } else { proxy.port() };
+        proxy.pause();
+        // Force another fixture's allocator to try this paused proxy's
+        // port, then actually bind what it hands out before resuming.
+        let issued = lease_port_from(Some(contested));
+        let _competitor = std::net::TcpListener::bind(("127.0.0.1", issued)).unwrap();
+        proxy.resume(&ca).await;
+        assert_eq!(proxy.port(), original_tls, "the client-visible endpoint is stable");
+        assert_ne!(issued, contested, "paused proxy ports must remain leased");
+        assert!(!proxy.leaf(&ca).await.is_empty());
+    }
+
     #[test]
     fn certificate_updates_replace_files_instead_of_reusing_inodes() {
         let dir = tempfile::tempdir().unwrap();
diff --git a/docs/README.md b/docs/README.md
index 2e91d48b..9ac73fda 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -31,6 +31,7 @@ slice); everything else is design. The maintainer's decisions are recorded below
    - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
      and its [harness](../spikes/2026-09-25-mcp-per-session/).
 4. Plans:
+   - [Proxy fixture port lifetimes (flake 15)](plans/2026-11-03-flake-proxy-ports.md) — leases stable proxy ports across pauses and test processes outside the kernel ephemeral ranges; deterministic contention regressions, copy probes, load and replay evidence recorded. Parent review and Linux/macOS CI remain pending.
    - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
      implementation plan (9 tasks) — executed 2026-09-27; its "Execution status" section
      lists where the built code deviates from the task text.
```

## After this plan

The parent runs independent review, opens the PR and reconciles all CI and
review state. The Linux range-discovery branch requires Ubuntu CI; local
macOS execution covers the actual sysctl path and Caddy/nginx processes.
The parent cleans retained probe/replay copies after review. Lease files
under the private temporary registry may be reused after their process
exits; they must not be deleted while another test process holds them.

Generated with Claude AI — please review before distribution.
