# Changelog

## Unreleased

- Make per-hat Delegation strictly ON/OFF: enabling never probes hosts, and
  children can use every runtime configuration currently offered without
  re-enabling after sign-in or adapter updates. Remove execution grants.
- Report unauthenticated runtimes as “not signed in” with `auth_required`,
  and include host/runtime context in catalog errors.

## 0.2.0

- Redesigned web UI. Light and dark themes, the hat's colour as the accent, and
  self-hosted Inter and Roboto. A new shell with a hat rail and a phone tab
  bar. All sessions grouped by hat, host, project or time, with children under
  their parent. A "Needs you" queue with short previews, dismiss and one-click
  permission answers. A session view with message bubbles, a compact composer
  with a settings chip, and Family / Plan / Details panels. A ⌘K command palette
  and keyboard shortcuts (#202–#214).
- Per-hat session defaults (model, permission mode, effort): edited in a
  Defaults matrix, applied in New session. New session has path autocomplete
  (#208, #212).
- Delegation is one per-hat switch in Settings. Children start with any model
  and mode and cannot start their own children (#210, #212).
- Rename sessions. Untitled sessions get a provisional name from their first
  prompt (#213, #214).
- "Do not park": parents stay awake while their children work, and any session
  can be pinned (#205, #207).
- Reliability:
  - Event streams reconnect after silent connections, and SSE responses ask
    reverse proxies not to buffer (`X-Accel-Buffering: no`) (#211).
  - The requested model is applied after the mode and confirmed. A
    configuration that cannot be confirmed fails with a readable reason
    instead of waiting forever.
  - Catalog previews work without `workspace_roots`.
  - Closed sessions no longer appear as needing you (#213).
- Security: rustls-webpki 0.103.16 and webpki-roots 1.0.10
  (RUSTSEC-2026-0381, RUSTSEC-2026-0382) (#211).
- Database migrations 23–25 run on first start. An older binary cannot open the
  upgraded database.

## 0.1.4

- Managed adapters: Node 24.22.0, claude-agent-acp 0.93.0 and codex-acp 2.2.2
  with bundled Codex 0.160.1. New picker models: Codex gpt-6.1-sol, Claude
  Sonnet 5.5 and Haiku 5.5.
- GHCR images now tagged `:<version>` and `:latest` (#192).
- crates.io trusted publishing through OIDC, with no long-lived token.
- Faster CI and releases (#179–#183).
- Automatic upstream watch (pins-watch) and Dependabot (#184, #185).
- Dependency updates (#186, #187, #189).

## 0.1.3

- First complete release on all four channels: GitHub Releases, Homebrew,
  crates.io and GHCR, following the partial crates.io publication of 0.1.2.
- Verify the whole release once before the crates writer starts, rather than
  at every gate call (#179), so publishing can finish within its deadline.
- Faster qualification and CI through one cached locked install of the frozen
  crate tarballs, weekly unlocked/MSRV checks, parallel tests with nextest and
  fewer redundant Nix builds (#180, #181).

## 0.1.2

- Published on GitHub Releases and Homebrew. On crates.io, only
  `hennery-proto`, `hennery-kernel`, `hennery-view` and `hennery-host` 0.1.2
  were published. The tag's crates writer re-verified the whole release at
  every gate call and exhausted its deadline before publishing the rest.
- Check crate existence through the crates.io version API before uploading.
  Missing downloads return a CDN 403, which must not decide existence. Send an
  identifying User-Agent and wait for API/CDN propagation after upload before
  checking the remote digest and index.

## 0.1.1

- 0.1.0 was tagged but never published: the GHCR SBOM predicate check failed
  before any channel wrote a release. Verify official `actions/attest-sbom`
  output with its exact `https://spdx.dev/Document/v2.3` predicate in both the
  publisher and consumer CLI. The stable release includes the changes below.

## 0.1.0

First stable release, building on the published alpha.3.

- Stable distribution through all four channels: GitHub Releases, Homebrew,
  crates.io and GHCR. Seven crates publish in dependency order from frozen
  tarballs, with registry/index propagation checks before dependent uploads.
- Six GitHub release assets: three native archives (Linux musl x86_64/arm64
  and macOS arm64), the installer, `SHA256SUMS` and one combined SBOM. Licence
  notices inside each archive link exact MPL dependency sources; hennery source
  remains public at the signed tag and GitHub's automatic source downloads.
- Shared packaging builds the UI once and reuses accepted archives for installers,
  Homebrew and images. Linux-only PR checks avoid macOS queues; main retains
  macOS smoke and full macOS/ARM suites run weekly, alongside scheduled audits.
- Simpler release verification binds attested bytes to the maintainer-signed tag,
  exact tagged workflow and source digest. Official attestation actions and the
  standard GitHub publisher retain protected approval, immutable uploads and
  explicit recovery for partial releases, without producing-run/name policies.

## 0.1.0-alpha.3

- Assemble the exact native release material while validating cargo-dist staging
  directories and refusing unexpected files, symlinks and conflicting inputs.
- Rehearse the production release graph and artifact transport on pull requests
  and main, through archive assembly, freezing, native installers and local
  verification, without signed tags, attestation or publication authority.
- Alpha.2 failed assembly before publication and was never published.

## 0.1.0-alpha.2

- Update rustls to fix RUSTSEC-2026-0346, RUSTSEC-2026-0347,
  RUSTSEC-2026-0348 and RUSTSEC-2026-0349.
- Align release qualification with CI's Linux test isolation and file descriptor
  limits, and check fresh Rust and web advisories on pull requests and daily.
- Alpha.1 failed pre-publication qualification and was never published.

## 0.1.0-alpha.1

First alpha for early testers. Expect rough edges and back up your data.

- Self-hosted cockpit for Claude and Codex sessions, with transcripts, tools,
  questions and session controls in the browser.
- Hats group projects, hosts and MCP access; the MCP gateway supports local
  servers, remote connections and OAuth.
- HTTPS/WSS transport and reverse-proxy deployment, phone answers and push
  notifications, and delegation between agent sessions.
- Optional memory plug-in with scoped search, management and import.
- Session deletion and per-hat purge, with host transcript cleanup receipts.
- GitHub-only alpha: Linux musl (x86_64 and arm64) and macOS arm64 archives,
  a verified installer, corresponding source, licence notices and SBOMs.
  Homebrew, crates.io and GHCR are prepared for the stable release.

Generated with Claude AI — please review before distribution.
