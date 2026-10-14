# Build without Nix Implementation Plan

> **For agentic workers:** follow the fleet's task-by-task execution and verification rules. The parent owns independent review and GitHub actions.

**Goal:** an early tester can build hennery without Nix from the README, and CI executes the exact new shell block on Ubuntu and macOS.

**Architecture:** add one named README block and one CI matrix job. Keep the existing extractor; make its Rust runner guard identify the workflow job as well as the file.

**Tech Stack:** stable Rust via rustup, Node 24, pnpm 12.3.4 via `npx`, vendored OpenSSL, POSIX shell/awk. No dependency, lockfile, flake or package-manager configuration changes.

**Spec:** extends [the README quickstart, plan 4f](2026-10-22-quickstart.md). Parent rulings of 2026-10-14 fix the build contract, prerequisites, tool versions, CI coverage and local verification. Implementation anchors are from `fa81e548`; the original lane base was `0fe663b8`.

## Execution status (2026-10-14)

Implemented on `docs/readme-build-without-nix`, cleanly rebased onto `fa81e548`. Local verification is complete: required vendored release build, UI check, fmt, both Clippy runs, README tests (25), script/guard tests (23), workspace tests (1,973 across 131 result groups, zero failures/ignored) and both generators all exited 0. Six revert-probes each reached their intended failing test (exit 101). The new CI job passed actionlint with ShellCheck enabled. Fresh replay-2 extracted one operation and three files; implementation bytes and the complete 615-file tree matched after metadata copy. Independent review and Ubuntu/macOS non-Nix CI remain parent-owned; neither the non-Nix route nor minimum-Rust compatibility is claimed from the local Nix checks.

## Scope

One implementation task: README, CI runner and tests; then this plan and its index record. Runtime, installation, releases and the existing Nix route stay outside this change.

## Decisions this plan makes where the spec is silent

1. **Rust:** README and CI use latest stable. `Cargo.toml` declares 1.88; locked metadata declares no higher dependency minimum, but minimum-version compatibility has not been compiled. Do not promise it. Local Nix verification uses 1.98.1.
2. **OpenSSL:** always use `vendored-openssl` in this route. [openssl 0.10.81's vendored build documentation](https://docs.rs/openssl/0.10.81/openssl/#vendored) and the locked `openssl-src` implementation require a C compiler, make and Perl/core modules. Xcode Command Line Tools and macOS's Perl cover the macOS prerequisites.
3. **pnpm:** flake evaluation reports 12.3.4 (Node 24.20.0). Use `npx --yes pnpm@12.3.4`; no global install or `packageManager` field. CI is the proof for the actual non-Nix `npx` invocation.
4. **Coverage:** a block assigned to another job does not count. Restrict workflow searches to named jobs, excluding comments. A dedicated test checks the two OSes, toolchain, timeout, extraction, execution and UI check in the same shell, and refuses Nix setup.

## Global Constraints

- Existing Nix build blocks stay byte-for-byte unchanged.
- The new block builds the UI first, requires it with `HENNERY_WEB_REQUIRE=1`, builds a locked release with vendored OpenSSL, and puts `target/release` on PATH.
- The new CI job installs no Nix or global pnpm; actions use existing pinned SHAs and a 60-minute timeout.
- Local tools run through plain `nix develop`, in a scratch tool home and the worktree's own target directory. No GitHub account actions by the child.

## Review Focus

- Ubuntu and macOS CI must execute the extracted block and confirm the embedded UI. Local Nix success cannot prove that route.
- Check `npx` works with pnpm 12.3.4 on both OSes and stable Rust builds the locked graph.
- Check the job-scoped guard still covers existing README runners; no weakened test, type or rule.

## File structure

| File | Change |
|---|---|
| `README.md` | Optional non-Nix route, prerequisites and one tagged block |
| `.github/workflows/ci.yml` | `readme-without-nix` matrix job |
| `crates/hennery/tests/readme.rs` | Ten blocks, named jobs, dedicated non-Nix runner guard |
| `docs/README.md` | Index this execution record |

### Task 1: Document and execute the alternative build

- [x] Build the change first. Apply this exact diff to `fa81e548` when replaying:

````diff
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 2a8340ca..ebb58f26 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -90,6 +90,43 @@ jobs:
           echo 'sh packaging/check-web-ui.sh "$(command -v hennery)"' >> "$RUNNER_TEMP/build.sh"
           sh -eux "$RUNNER_TEMP/build.sh"

+  # The alternative README build: no Nix, no global pnpm install and no
+  # system OpenSSL. Run the documented block on both supported OSes.
+  readme-without-nix:
+    strategy:
+      fail-fast: false
+      matrix:
+        os: [ubuntu-latest, macos-latest]
+    runs-on: ${{ matrix.os }}
+    timeout-minutes: 60
+    steps:
+      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
+        with:
+          persist-credentials: false
+      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
+        with:
+          toolchain: stable
+      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
+        with:
+          node-version: 24
+      - uses: Swatinem/rust-cache@6323deb102c322ba6fcbdcafc7e3dddab59af2b6 # v2.9.2
+        with:
+          key: readme-without-nix
+      - name: Vendored OpenSSL build tools (ubuntu)
+        if: runner.os == 'Linux'
+        run: sudo apt-get update && sudo apt-get install -y build-essential perl
+      - name: Vendored OpenSSL build tools (macOS)
+        if: runner.os == 'macOS'
+        run: xcode-select -p && cc --version && make --version && perl -v
+      # Run the UI check in the same shell as the block's PATH export.
+      - name: The README's build without Nix block
+        run: |
+          sh packaging/readme-blocks.sh README.md build-without-nix > "$RUNNER_TEMP/build-without-nix.sh"
+          cat >> "$RUNNER_TEMP/build-without-nix.sh" <<'CHECK'
+          sh packaging/check-web-ui.sh "$(command -v hennery)"
+          CHECK
+          sh -eux "$RUNNER_TEMP/build-without-nix.sh"
+
   rust:
     strategy:
       fail-fast: false
diff --git a/README.md b/README.md
index 6afcb32c..48e41e38 100644
--- a/README.md
+++ b/README.md
@@ -41,8 +41,9 @@ Known limitations:

 ## Quickstart

-You need [Nix](https://nixos.org/download/) with flakes enabled, and on
-every machine that runs agents, the CLI for each agent you want to use
+Build with [Nix](https://nixos.org/download/) with flakes enabled, or use
+[Build without Nix](#build-without-nix) below. On every machine that runs
+agents, you need the CLI for each agent you want to use
 already logged in with your own subscription. The flake supports Apple
 Silicon macOS, and x86_64 and aarch64 Linux.
 The bundled CLIs are not added to your `PATH`. After `up` or `host join`
@@ -84,6 +85,30 @@ nix build
 The binary is then `result/bin/hennery`; put that directory on your `PATH`
 instead.

+#### Build without Nix
+
+Prerequisites (plus Git to get the source above):
+
+- **Linux:** a C compiler, `make` and `perl` (including its core modules).
+- **macOS:** Xcode Command Line Tools; macOS supplies `perl`.
+- **Both:** Rust via [rustup](https://rustup.rs/) (latest stable, the
+  toolchain CI uses), and Node 24 with its `npm`/`npx` on `PATH`.
+
+From the source directory, build the web UI with the flake's pinned pnpm
+12.3.4 through `npx`, without installing pnpm globally. OpenSSL is built
+and linked into the binary; no system OpenSSL is needed.
+
+<!-- check: build-without-nix -->
+```sh
+npx --yes pnpm@12.3.4 --dir web install --frozen-lockfile
+npx --yes pnpm@12.3.4 --dir web build
+HENNERY_WEB_REQUIRE=1 cargo build --release --locked -p hennery --features vendored-openssl
+export PATH="$PWD/target/release:$PATH"
+```
+
+Continue with step 2 below. Starting hennery, setup, `doctor` and agent
+logins are the same for both builds.
+
 ### 2. Start

 <!-- check: up -->
diff --git a/crates/hennery/tests/readme.rs b/crates/hennery/tests/readme.rs
index bf1409b3..f4255782 100644
--- a/crates/hennery/tests/readme.rs
+++ b/crates/hennery/tests/readme.rs
@@ -36,10 +36,11 @@ const EXAMPLE_CODE: &str = "ABCD-EFGH";
 const EXAMPLE_PORT: u16 = 7117;

 /// Every block name in the README, in order, with what runs it.
-const BLOCKS: [(&str, Runner); 9] = [
-    ("clone", Runner::Workflow("ci.yml")),
-    ("build", Runner::Workflow("ci.yml")),
-    ("nix", Runner::Workflow("nix.yml")),
+const BLOCKS: [(&str, Runner); 10] = [
+    ("clone", Runner::Workflow("ci.yml", "readme")),
+    ("build", Runner::Workflow("ci.yml", "readme")),
+    ("nix", Runner::Workflow("nix.yml", "flake")),
+    ("build-without-nix", Runner::Workflow("ci.yml", "readme-without-nix")),
     ("up", Runner::Here),
     ("up-public", Runner::Here),
     ("join", Runner::Here),
@@ -52,8 +53,8 @@ const BLOCKS: [(&str, Runner); 9] = [
 enum Runner {
     /// A test in this file.
     Here,
-    /// This workflow, through `readme-blocks.sh README.md <name>`.
-    Workflow(&'static str),
+    /// This workflow's job, through `readme-blocks.sh README.md <name>`.
+    Workflow(&'static str, &'static str),
 }

 fn repo() -> PathBuf {
@@ -343,6 +344,25 @@ fn a_failing_awk_exits_3() {
     );
 }

+/// The repository's workflow jobs use two-space indentation. Limit a
+/// runner check to its named job, ignoring comments and other jobs.
+fn workflow_job(workflow: &str, job: &str) -> String {
+    let header = format!("\n  {job}:\n");
+    let (_, body) = workflow
+        .split_once(&header)
+        .unwrap_or_else(|| panic!("no workflow job {job}"));
+    body.lines()
+        .take_while(|line| {
+            !line.starts_with("  ")
+                || line.starts_with("   ")
+                || line.trim().is_empty()
+                || line.trim_start().starts_with('#')
+        })
+        .filter(|line| !line.trim_start().starts_with('#'))
+        .collect::<Vec<_>>()
+        .join("\n")
+}
+
 /// Every block of the README has a runner: these tests, or a workflow
 /// that runs the script on it.
 #[test]
@@ -361,16 +381,45 @@ fn every_readme_block_is_run() {
                 "no test here runs the block {name}"
             );
         }
-        if let Runner::Workflow(file) = runner {
+        if let Runner::Workflow(file, job) = runner {
             let workflow = std::fs::read_to_string(repo().join(".github/workflows").join(file)).unwrap();
+            let workflow = workflow_job(&workflow, job);
             assert!(
                 workflow.contains(&format!("readme-blocks.sh README.md {name} ")),
-                "{file} does not run the block {name}"
+                "{file}'s {job} job does not run the block {name}"
             );
         }
     }
 }

+#[test]
+fn the_non_nix_build_runs_on_both_platforms_without_nix() {
+    let workflow = std::fs::read_to_string(repo().join(".github/workflows/ci.yml")).unwrap();
+    let job = workflow_job(&workflow, "readme-without-nix");
+    assert!(job.contains("os: [ubuntu-latest, macos-latest]"), "{job}");
+    assert!(job.contains("runs-on: ${{ matrix.os }}"), "{job}");
+    assert!(job.contains("timeout-minutes: 60"), "{job}");
+    assert!(job.contains("toolchain: stable"), "{job}");
+    assert!(job.contains("node-version: 24"), "{job}");
+    assert!(
+        !job.contains("install-nix-action") && !job.contains("nix develop"),
+        "{job}"
+    );
+    // Extraction alone must not count as running the block. Its PATH
+    // export and the UI check must execute in the same shell on each OS.
+    assert!(
+        job.contains("readme-blocks.sh README.md build-without-nix > \"$RUNNER_TEMP/build-without-nix.sh\""),
+        "{job}"
+    );
+    assert!(
+        job.contains(
+            "cat >> \"$RUNNER_TEMP/build-without-nix.sh\" <<'CHECK'\n          sh packaging/check-web-ui.sh \"$(command -v hennery)\"\n          CHECK"
+        ),
+        "{job}"
+    );
+    assert!(job.contains("sh -eux \"$RUNNER_TEMP/build-without-nix.sh\""), "{job}");
+}
+
 // ---------------------------------------------------------------------
 // The blocks run here.

````

- [x] Run local verification in the flake shell with scratch tool configuration:

```bash
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web build
HENNERY_WEB_REQUIRE=1 nix develop -c cargo build --release --locked -p hennery --features vendored-openssl
nix develop -c sh packaging/check-web-ui.sh "$PWD/target/release/hennery"
nix develop -c cargo fmt --all --check
nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
nix develop -c cargo clippy -p hennery --locked -- -D warnings
nix develop -c cargo test -p hennery --test readme --locked
nix develop -c cargo test -p hennery --test readme --locked -- --skip up_and_the_recovery_commands_work_as_the_readme_says --skip pairing_another_machine_works_as_the_readme_says
nix develop -c cargo test --workspace --locked
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
nix develop -c cargo run -p hennery-view --bin gen-view --locked -- --check
```

All commands above exited 0: README suite 25 passed; script/guard suite 23 passed (two process tests excluded). The required release build and embedded-UI check passed. The new CI job alone passed actionlint with ShellCheck enabled. Full-file optional lint sees the existing `readme` job's SC2016 on its literal echo; that job is unchanged.

- [x] Revert-probe the runner guard, restore exact file bytes, then rerun the passing suites. Six probes each exited 101 in their intended test:

| Probe | Mutation | Failing test |
|---|---|---|
| P1 | Remove the new block's runner registration | `every_readme_block_is_run` |
| P2 | Move extraction to the existing Nix job | `every_readme_block_is_run` |
| P3 | Remove execution of the extracted script | Dedicated non-Nix guard |
| P4 | Remove the UI check | Dedicated non-Nix guard |
| P5 | Remove macOS from the matrix | Dedicated non-Nix guard |
| P6 | Add Nix setup to the job | Dedicated non-Nix guard |

- [x] Fresh replay-2 from `fa81e548` after the clean docs-only rebase: one extracted operation, three extracted files, implementation bytes identical; all 615 tracked files match after the separate plan/index metadata copy. The extractor lists ten blocks. Replay-1 and replay-2 remain in the ignored lane ledger for parent cleanup; neither has a build target.
- [x] Complete workspace tests and both generator checks: exit 0, 1,973 tests; both generator checks exit 0. Results are recorded in Execution status.

### Task 2: Record and hand over

- [x] Add this plan and its `docs/README.md` line.
- [x] Rebase onto `fa81e548`, check the personal author and diff hygiene. Hand over `docs/readme-build-without-nix` to the parent via the SSH origin.
- [ ] Parent: independent whole-branch review, open the PR, and verify checks, reviewDecision, mergeStateStatus and unresolved review threads before merge.

## After this plan

- The new CI checks are `readme-without-nix (ubuntu-latest)` and `readme-without-nix (macos-latest)`. Both must pass before the non-Nix route is considered proven.
- Keep the README's pnpm version aligned with flake evaluation at future toolchain bumps. Do not add a packageManager field as a shortcut without proving the Nix build is unchanged.
- Future Rust minimum-version claims need a build on that toolchain. This plan states the stable toolchain CI actually installs.

Generated with Claude AI — please review before distribution.
