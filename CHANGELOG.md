# Changelog

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
