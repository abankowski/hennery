# Changelog

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
