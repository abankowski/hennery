# Release builds

What a hennery release would ship is built by the `build` workflow
(`.github/workflows/build.yml`) on every pull request and every push to
`main` (distribution spec §2, plan 7a). It is checked, then kept as workflow
artifacts for a week. **Nothing is published:** there are no releases yet.

R1 adds separate, disabled-by-default candidate and publication workflows.
They rebuild at the approved tag, add notices/SBOM/source, retain exact candidate
versions, and bind protected-environment approval to inventory/run attempts.
The [release process](../docs/release-process.md) lists maintainer setup and the
[shared gate interface](release/README.md) is the R3/R4 integration contract.
The original `build` workflow remains a qualification probe; its artifacts are
never promoted to a release.

| Artifact | Built by | Checked by |
|---|---|---|
| `hennery-x86_64-unknown-linux-musl.tar.xz`, `hennery-aarch64-unknown-linux-musl.tar.xz` | `dist build`, natively on each architecture, with `musl-gcc` | `check-archive.sh` (the binary, its licence and README, nothing else); `check-linkage.sh` (no shared library, no loader); runs on the runner and on Alpine |
| `hennery-aarch64-apple-darwin.tar.xz` | `dist build` on macOS arm64 | `check-archive.sh`; `check-linkage.sh` (system libraries only); runs |
| `hennery-installer.sh` | `dist build --artifacts=global`, then `harden-installer.py` | `test-installer.sh`, on Linux x86_64 and on macOS |
| `hennery.rb` (Homebrew formula) | `dist build --artifacts=global` | `check-formula.sh` |
| `sha256.sum` | `dist build --artifacts=global` | — |
| the collector image, one architecture per Linux runner | `docker build` of `Dockerfile` on the staged musl binary | `smoke-image.sh` |

Every archive builds with the `vendored-openssl` feature
(`dist-workspace.toml`). OpenSSL, which `webauthn-rs-core` links, is then
compiled in from source. Without it, the macOS binary would load Homebrew's
`libssl` and fail on a Mac without it, and a static musl build would not
link at all (distribution §1.1). Development and `ci.yml` use the system
OpenSSL.

Third-party actions are pinned by commit, every image by its multi-arch
digest, and cargo-dist by the SHA-256 in `install-dist.sh`.

## OpenSSL

The release binaries carry their own OpenSSL: 3.6.3, from `openssl-src`
300.6.1+3.6.3 in `Cargo.lock`. Updating the system's OpenSSL does not
reach them. An OpenSSL fix reaches users only when `openssl-src` is bumped
in `Cargo.lock` and a new release is made. `webauthn-rs` passes what a
browser sends (attestation and assertion data) through it, so OpenSSL's
advisories are this project's to follow.

OpenSSL 3.6 is not a long-term-support line. Check its end of support
against openssl.org's release strategy before the first release, and move
to a supported line if it ends first.

## Locally

The dev shell's toolchain links Nix's `libiconv` on macOS, so a local
release build is for trying out, not for handing on; `check-linkage.sh` says
so. Linux archives and the image are built in CI only.

```sh
nix develop -c cargo build --profile dist -p hennery --features vendored-openssl
sh packaging/check-linkage.sh target/dist/hennery
```

## Pin bumps

A bump of `adapters/pins.toml` is `hennery-pins lock`, then `generate`,
then the pin-bump job (`.github/workflows/pins.yml`). These checks are
live, with logged-in agents, and the operator's to run before it merges:

- the live e2e gate (umbrella spec §14) on every platform;
- **Codex's `thread/delete` still removes everything** (plan 9d
  decision 14). After a turn in a scratch `CODEX_HOME`, delete the session
  from hennery and check that nothing of the thread is left: its rollout
  files in `sessions/` and `archived_sessions/`, its rows in
  `thread_history_1.sqlite` (`thread_items`, `thread_turns`,
  `thread_realtime_items`), its rows in the state DB (`state_5.sqlite`),
  and its entries in `session_index.jsonl`. hennery itself only checks the
  rollout files: the rest is `thread/delete`'s contract. If the bundled
  Codex version changed, read `thread/delete`'s call shape from its source
  first and update `[codex_app_server]` in `pins.toml`.
- **What the host reads from Codex is still what it says** (the 9d-ii
  review). Re-read, in the bumped version's source and against a live run
  in a scratch `CODEX_HOME`:
  - the refusal texts `classify_delete` matches (`forked history still
    references it`, `thread is not persisted`, `live internal threads`,
    `no rollout found for thread id`, `thread not found:`, and the
    `Invalid request: unknown variant` / `missing field` / `invalid type`
    prefixes);
  - the `codexHome` field of `initialize`'s answer, canonical;
  - `--version`'s `codex-cli X.Y.Z` line.

## Publishing is the operator's

These need the operator's decision, credentials, or both. None is set up:

- **GitHub Releases.** `dist generate` writes a `release.yml` that builds the
  same archives and creates a release on every version tag. It is not
  committed (`allow-dirty = ["ci"]` in `dist-workspace.toml`). Any generated
  replacement for R1's explicit gated workflows must:
  - keep this workflow's checks: `check-archive.sh`, `check-linkage.sh`,
    `test-installer.sh`, `check-formula.sh`;
  - run `harden-installer.py` before the installer is uploaded, and before
    it is attested;
  - pin every action by commit;
  - restore no Actions cache (no `rust-cache`), since anything a `main`
    workflow runs can write one;
  - build with a pinned toolchain (`rust-toolchain.toml`).

  The `build` workflow's artifacts are never promoted to a release: a pull
  request's are built from code nobody has reviewed yet.
- **Artifact attestations** (`github-attestations = true`): protected release-tag
  jobs need OIDC/attestation authority and write to the public Sigstore log.
  Neither repository-only nor exact-tag Sigstore verification authorizes a
  release by itself. The common verifier first requires the detached
  `release-inventory.json.asc` from the pinned hardware-backed maintainer key
  over the exact inventory digest set. Its trusted public key comes from the
  reviewed verifier, not a downloaded replacement. The common
  [verifier](release/verify.py) pins the exact certificate identity to
  `marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<release-tag>`
  and rejects branch signers. The [guarded README bootstrap](../README.md#verify-a-release-installer-before-running-it)
  authenticates the inventory using a full fingerprint checked through main,
  the maintainer's account keys and keys.openpgp.org, then checks the installer
  SHA-256 before executing it. No release-supplied verifier or key is its trust anchor;
  its archive verifier requires both the maintainer-approved digest and this identity. Native binstall signature
  support needs a reviewed bridge; no unverified strategy is an accepted path.
- **The Homebrew tap** (`marcinwadon/homebrew-tap`): the repository and a
  token allowed to push to it.
- **The image on GHCR:** a dedicated credential held only in `release`, with
  this repository's package Actions access READ, one multi-arch manifest from
  the per-architecture images, and its provenance attestation. Its docs
  should say: publish the port on loopback behind a TLS proxy
  (`-p 127.0.0.1:8080:8080`); read the setup link with
  `docker exec … hennery admin setup-url`, not from `docker logs` (with
  `docker run -t` the link itself is logged); a bind mount keeps the host's
  owner, so it must belong to 65532; change the port with `HENNERY_LISTEN`,
  not `--listen` on the command, because the `HEALTHCHECK` reads
  `HENNERY_LISTEN`.
- **Third-party licence notices:** the archives carry only hennery's
  `LICENSE` in the original `build` probe, and its image none. R1's candidates
  generate target-specific notices, SPDX and corresponding-source bundles;
  their immutable supplemental licence texts need maintainer review. Before
  the first release, review the
  notices for the Rust crates and the vendored OpenSSL (Apache-2.0), e.g.
  with `cargo-about`; ship them in each archive and in the image; and
  update `check-archive.sh`'s exact list and the `.dockerignore`.
- **Dependency updates** (Dependabot, or another bot): for `openssl-src`
  above all, the pinned actions and the image digests. It opens pull
  requests on its own schedule, so it is the operator's to switch on.
- **Fork pull requests:** require approval before their workflows run.

---

_Generated with Claude AI — please review before distribution._
