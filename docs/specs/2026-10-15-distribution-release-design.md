# hennery — distribution and release design

- **Date:** 2026-10-15.
- **Status:** proposed; no publication authorized. Operator questions below have
  recommended defaults, not assumed approval.
- **Review:** Codex gpt-6-astra, on the maintainer's behalf, reviewed
  `6f686151..1efb4f70`: APPROVE AFTER AMENDMENTS, no Critical findings. The
  approval-binding, crate licence/source and recovery amendments are recorded
  below; scoped re-confirmation remains with the parent.
- **Inventory base:** `6f68615183de3e1badc12a3d650eca27b8901261`.
- **Refines:** [distribution](2026-09-26-distribution-design.md) and
  [architecture §12](2026-09-25-hennery-architecture-design.md#12-distribution).

This is a companion spec, rather than a rewrite of the distribution spec:
runtime installation, services and doctor already have implemented contracts.
This document supplies the missing publication contract and proposes additional
channels and platforms. The umbrella remains authoritative. Intel macOS and GNU
release archives require explicit scope approval and a spec write-back before
they become supported. Historical plans are evidence, not current release status.

The first useful outcome is a verified download with the real web UI, usable
without a Rust or JavaScript toolchain. Release that before taking on every
package ecosystem. Nothing here creates an account, reserves a name, publishes
an artifact, creates a tag, or enables an external automation.

## Simplified release model (operator decision 2026-10-16)

This section supersedes the candidate/qualification split, held candidate and
audit storage, maintainer-signed inventory, approval-tuple protocol and upload
App requirements in §§4.1, 6–8 and the R1/R3 hand-offs. Those passages describe
the former model. The operator rejected AWS: no new storage service, account,
App or recurring cost is authorized. Platform, licence/source, advisory,
acceptance, channel and rollback obligations otherwise remain. Implementation
is pending [release simplification](../plans/2026-11-04-release-simplify.md);
this design amendment authorizes no publication.

### Authorization and threat model

The maintainer signs **source**, by creating an annotated `v<version>` tag with
the YubiKey signing subkey `F26C7F594DFE84D131703AFC23E5A318AE8D2861`.
Retain `tag_signature.py`: freshly fetch the tag object, require a direct commit
target, exact tag/version/source binding and valid non-expired signature from
that exact fingerprint in an isolated public-only keyring. The owner-only
creation ruleset and no-bypass update/delete ruleset for `v*` are already live.
An SSH push credential alone cannot produce an accepted signed release tag.

GitHub/Sigstore attestations bind final **bytes** to the tagged workflow and
source commit. They do not prove that those bytes were independently approved
with the YubiKey, faithfully compiled, reproducible or harmless. The former
model also trusted runners to build and check its inventory; this model
explicitly drops the later hardware signature over the digest set. A compromised
runner can substitute bytes and attest them, and the environment reviewer may
not detect that. Signed source can itself contain malicious code/workflows;
review the release commit and workflow before signing. Dependencies, compiler,
hosted runners, GitHub/OIDC/Sigstore, verifier/tool supply chains, maintainer
account/recovery and signing-key custody remain trust dependencies. Pinned SHAs,
fresh cache-free builds, acceptance and narrow credentials reduce exposure;
they do not eliminate these risks.

**Accepted residual risk — parent ruling on the maintainer's behalf,
2026-10-16; operator to be informed:** this guarantees one approval **in the
authorized workflow**, not that all publication requires approval. Anyone with
repository write, including someone using the maintainer's SSH push key, can
run a branch workflow requesting `contents: write` without referencing `release`.
It can publish genuine, already-attested artifacts for an existing `v*` tag
before approval, or create/freeze an incomplete immutable release that blocks
that version. Consumers still reject bytes lacking provenance from the tagged
workflow at that exact tag: this preserves artifact integrity, but permits early
publication or denial of service. Environment protection is not a repository-wide
token permission boundary. This risk is accepted without a new service or App.
Document an incomplete/blocked release, withhold moving aliases and roll forward
to a new maintainer-signed version; never overwrite assets or move the old tag.

Draft assets remain mutable until publication; verify them again at the write
boundary. The protected `release` environment approval authorizes publication
of that run, rather than a separately signed inventory. Before approval the
maintainer reviews the run summary listing every asset and SHA-256, checksum
file/bundle hashes, tag, source, channels, targets and producing run/attempt.
There is no preapproval draft to inspect: the single approved job creates it.
This trades draft inspection for an artifact/digest summary and one approval,
while keeping authorized workflow mutation inside `release`. Immutability protects
published assets, not availability or the integrity of other registries.
Registry publication is not atomic across channels. There is no held backup of
an unpublished run: missing/expired bytes cause refusal, never reconstruction
under an old approval. No remote test can prove a physical YubiKey touch policy.

### One run and its assets

One `.github/workflows/release.yml`, triggered only by `push.tags: ['v*']`,
performs the entire authorized release. Its merge, branch push, `workflow_run`
and separate qualification/dispatch paths cannot publish. Concurrency is per
tag, without cancellation.
Every checkout uses the verified commit, disables persisted credentials and
every action uses a pinned SHA; every job has a timeout. No restored build
caches. Keep the workflow policy's rejection of reusable jobs; the authorized
release uses no job-level `uses:` calls. Qualification runs at the tag SHA inside
this run, including all existing Rust/web/generator,
archive/installer/source/licence/advisory and
selected-channel acceptance gates. Existing PR/main CI remains ordinary CI.

Channel selection is a reviewed list in the signed source at
`packaging/release/channels.json` (initially `["github"]`), validated through the
existing channel registry. Preserve literal channel/job name ownership and
collision refusal; unknown names, duplicate selection, missing owning job or
failed/skipped selected acceptance refuse. First alpha remains GitHub-only.
Selection and the corresponding enable switch must both permit a channel;
other channels additionally require successful immutable GitHub publication.

`SHA256SUMS` is the single global payload digest list: canonical SHA-256 entries
with unique safe basenames for exactly all payload assets. Include platform
archives, hardened installer, source archive(s), notices/SBOMs, formula, release
metadata and selected-channel frozen `.crate`/OCI inputs. Retain necessary
channel manifests, bound as payloads, without a second approval inventory.
Release metadata records tag, tag object, commit, version, channels, targets and
build run/attempt. Exclude `SHA256SUMS` itself and Sigstore bundles to avoid
cycles; attest the checksum file separately and every payload. Bundle sidecars
must verify, and any extra release asset outside these explicit classes refuses.
Stage OCI layouts/index descriptors as digest-bound files before pushing;
retained R4 acceptance must establish the connection to final registry digests.

The intended job graph and complete permission budget are below. Unlisted token
scopes are `none`; workflow default is `contents: read`. Build/acceptance jobs
receive no publication secrets. Only `publish` adds `actions: read` to verify
run/job/artifact identity. No publisher gets administration access or an AWS
credential.

The pre-environment permission ceiling is `contents: read`, `id-token: write`
and `attestations: write`; only the dedicated `attest` job needs the latter two.
No build/test job gets `contents: write`, an environment or publication secrets.
`attest` produces the complete run summary before `publish` awaits approval.

| Job ID | Needs / role | Environment | Job token permissions beyond read-only contents | Secrets |
|---|---|---|---|---|
| `tag-signature` | Fresh signed tag, version/source and channel validation | none | none | none |
| `qualification` | `tag-signature`; exact-SHA Rust/web/generator/Nix/source gates | none | none | none |
| `web-ui` | `tag-signature`; locked UI build | none | none | none |
| `archive` (native matrix) | `web-ui`; Linux x86_64/arm64 musl and macOS arm64 | none | none | none |
| `crates` | `web-ui`; selected frozen seven-crate packaging/acceptance | none | none | none |
| `ghcr` | `archive`; selected native OCI/index/SBOM acceptance | none | none | none |
| `homebrew` | `assemble`; selected native formula acceptance | none | none | none |
| `assemble` | `archive`, selected `crates`/`ghcr`; global assets and checksums | none | none | none |
| `installer` (native matrix) | `assemble`; install/refusal checks on all three platforms | none | none | none |
| `attest` | All required qualification/acceptance; attest final bytes/checksums, publish run summary and artifact/bundle IDs | none | `id-token: write`, `attestations: write` | none |
| `publish` | `attest`; download this run's artifacts, verify, create/upload/read-back draft, reverify, publish immutable, then selected channel steps | `release` | `contents: write`, `actions: read`, `attestations: read`, `id-token: write` for crates OIDC | built-in `GITHUB_TOKEN`; step-scoped channel secrets below |

**Parent ruling on the maintainer's behalf, 2026-10-16:** no `contents: write`
outside `release`. There is no separate draft writer. An unprotected draft
writer could race the approved publisher for an existing `v*` tag. `publish`
gets one environment approval and performs its mutation afterwards. Following
immutable publication it runs switched/selected `homebrew`, `crates` and `ghcr`
publication steps in that same job, each calling its own verifier and publisher.
The acceptance jobs and their channel registry/name binding remain separate.
Channel publication steps require successful immutable publication, reverify
its bytes and attestations, then receive respectively `RELEASE_HOMEBREW_TOKEN`,
temporary crates bootstrap secret or exchanged OIDC token, and `GHCR_PUBLISH_TOKEN`.
Never put these secrets at workflow/job scope.

[GitHub documents required reviews per environment-referencing job](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments),
without promising inherited approval for downstream jobs. Folding channels into
`publish` guarantees one approval per publishing attempt and avoids extra clicks;
no live approval experiment was performed. The cost is a longer serial job with
the union of required permissions, and channel retries re-enter that job and
renew approval. Do not use an unprotected downstream writer as an approval proxy.

Attestation authority intentionally precedes publication approval and is limited
to the exact tagged workflow. Ordinary job permissions/OIDC exist at job start;
they cannot be truthfully described as minted only after a script preflight.
Keep attestations in a dedicated job. In the `publish` job, never pass its write
token into build/acceptance code; verification precedes every mutating API call.
Channel secrets are step-scoped only after verification; OIDC exchange and
registry login also follow verification. Recheck files at each upload boundary.

### Verification, publication and recovery

Consumers, channel publishers and the README verify-then-run bootstrap must:

1. Use independently trusted installed Git, GnuPG, `gh` and SHA-256 tools, and a
   reviewed verifier/pinned public key. Never execute a release-supplied verifier
   or installer to authenticate itself. Fetch/verify the annotated tag with the
   pinned fingerprint before trusting executable code from its commit.
2. Authenticate `SHA256SUMS` and each consumed payload with `gh attestation
   verify` and exact `--cert-identity` value
   `https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/<exact-tag>`.
   This pins the workflow path as well as the tag. Do **not** also pass
   `--signer-workflow`: upstream makes those options mutually exclusive.
   Also require `--source-ref refs/tags/<exact-tag>`, `--source-digest <verified-commit>`,
   `--signer-digest <verified-commit>`, the GitHub Actions OIDC issuer, expected
   provenance predicate and `--deny-self-hosted-runners`. `@refs/tags/v*` describes
   the allowed identity family; instantiate the exact validated tag, never pass
   a wildcard as an exact CLI identity or accept a branch signer. Downloadable
   bundles permit verification without trusting an API lookup alone. These
   identity/source constraints follow the [GitHub CLI verifier interface](https://cli.github.com/manual/gh_attestation_verify).
3. Publication additionally checks `gh attestation verify --format=json`'s
   verified `verificationResult.signature.certificate.runInvocationURI`
   against the exact string
   `https://github.com/marcinwadon/hennery/actions/runs/<id>/attempts/<attempt>`,
   with this workflow's run ID and fixed accepted attesting attempt. Do not use
   the current publishing attempt, an asset-supplied run ID or self-asserted
   provenance predicate. The [Fulcio certificate extension](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md#13614157264121--run-invocation-uri)
   binds GitHub's run ID/attempt into the certificate. Require matching exact
   artifact IDs/producing attempt from the trusted run dependency and refuse
   absent/mismatched certificate data; tag/workflow/source alone are insufficient.
4. Check the unique checksum entry for each consumed file before execution,
   extraction or credential use. Publication verifies the entire draft asset
   set against the attested list and expected selected-channel/target closure.
   Re-fetch/reverify the tag, source/run binding and remote draft bytes directly
   before publishing; require immutable state afterwards and verify public
   assets again before permitting any channel publication step.

**Phase B verifier contract test:** execute the pinned `gh` binary offline with
an authentic attestation bundle, original payload and reviewed trusted-root
fixture (`--bundle`, `--custom-trusted-root`, isolated config and no network).
Prove real CLI success and extraction of the exact certificate JSON path above,
then refuse a wrong expected run ID, wrong expected attesting attempt and altered
payload. Use exact `--cert-identity` plus source/signer digest constraints, never
the mutually exclusive flag pair. Record fixture origin/digests and the CLI pin;
do not substitute mocked JSON for this contract. Keep transport-mocked tests for
publication lifecycle failures. Acquiring a fixture never authorizes this child
to mint a real tag, attestation or publication.

**Superseding parent ruling, 2026-10-16:** the real output of pinned `gh 2.101.0`
is authoritative. Its certificate fields are flattened; the reviewer's original
`.certificate.extensions.runInvocationURI` path is superseded by
`.certificate.runInvocationURI`. Pin both binary version and exact JSON field
in the offline contract test; a changed schema fails loudly, with no fallback.
The authentic upstream `sigstore/sigstore-js` bundle proves cryptographic
success/JSON shape and must fail production Hennery repo/workflow/ref policy.
Tests substituting Hennery-specific fields into that real shape are structural
tests, not cryptographic proof. Creating a real attestation writes to the public
transparency log and remains the maintainer's disclosure decision.

Keep `RELEASE_PUBLICATION_ENABLED`, `RELEASE_GITHUB_ENABLED`,
`RELEASE_HOMEBREW_ENABLED`, `RELEASE_CRATES_ENABLED` and `RELEASE_GHCR_ENABLED`
as explicit string-`true` switches, default off. Selection does not enable them.
`GHCR_PUBLISH_USER` is a non-secret environment variable. The optional temporary
`RELEASE_CRATES_BOOTSTRAP_ENABLED` switch defaults off; it never falls back from
a failed trusted-publisher exchange. No other storage/App/approval vars remain.

**Publish-only recovery:** within [GitHub's rerun window](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
(30 days from the initial run, at most 50 reruns including subset reruns), rerun
only `publish`, under renewed `release` approval. Reuse the original artifacts,
`SHA256SUMS`, bundles and fixed accepted attesting attempt/artifact IDs. The
publishing attempt changes; the attesting attempt does not. Never use “rerun all”
or rerun builds/attestation as publication recovery. Keep artifact retention at
least through that window and refuse missing/deleted/expired original inputs.
Before approving a retry, review the original digest summary and the platform's
current publishing attempt. Once admitted, the publisher records both attempts
and unchanged digests; it verifies the original attestation against its original
attempt, not the new `GITHUB_RUN_ATTEMPT`. Renewal of approval is required even
for identical bytes.
GitHub's review-history API lacks an attempt field. For a retry, the maintainer's
new approval comment must therefore be exactly `publish-run:<id>:attempt:<n>`
for the current publishing attempt; the read-only gate checks the owner and
comment against live review history. This is an attempt-renewal marker, not an
inventory signature or digest-approval tuple. Missing/stale comments refuse.

Reconcile actual remote bytes/digests, count identical content as done, upload
only authoritatively absent content and stop on ambiguity/mismatch. A successful
immutable public release can supply verified channel payload bytes, but not a
replacement for the original run/attestation binding. Keep create-only tap/version
and GHCR digest refusal and crates download/index checksum matching. Never move
a tag, rebuild accepted bytes or add assets to a published immutable release.

| Failure boundary | Publish-only recovery under renewed approval |
|---|---|
| GitHub publish succeeded but its response was lost | Query release state, require immutable and re-download/hash/attest the complete asset set. Matching success permits channel reconciliation; absent, incomplete, mutable, mismatched or still ambiguous state stops. Never blindly publish/create again |
| After Homebrew publication, including an ambiguous successful tap update | Reconcile the exact formula/version against verified release inputs; identical content is done. Refuse differing content, preserve any completed GitHub/tap publication and continue only missing authorized channel work |
| After any crates.io upload or after the whole crates channel | Re-download/hash every existing crate and check its index checksum in dependency order. Resume only missing frozen tarballs; ambiguity, a different digest or unavailable original input stops. Revoke bootstrap authority on abandonment |
| After any GHCR blob/manifest/index publication or whole GHCR channel | Reconcile every remote digest and platform/index closure against the original verified OCI inputs. Accept matching content, push only absent content and refuse changed/unverifiable bytes; no overwrite of a conflicting tag |
| After all channels but before final verification/announcement | Reverify the whole selected set and public install acceptance before reporting completion or changing moving aliases |

After 30 days or exhaustion of 50 reruns, or loss of original inputs, abandon
recovery for that version. Document the incomplete old release and channel state,
revoke any bootstrap token, keep moving aliases/announcements withheld and roll
forward with a new maintainer-signed version. Do not rebuild the old version via
another workflow/dispatch or silently accept an incomplete immutable release.

### Remaining maintainer setup

- **Done, per operator:** `release` requires maintainer approval, permits only
  `v*` tags and disables admin bypass; the two live tag rulesets restrict
  creation to the owner and block update/delete; immutable releases are enabled.
  Retain configuration checks and negative gate coverage, without claiming this
  child inspected live settings.
- **Maintainer platform acceptance:** before enablement, observe the first
  `publish` attempt waiting for approval with the complete digest summary and
  no draft/write yet; reject/cancel must perform no authorized mutation. Verify
  all folded channels stay behind that approval. Exercise a publish-only retry:
  renewed approval, unchanged artifact IDs/attesting attempt and a new publishing
  attempt, with no build/sign job rerun. Check the certificate run comparison and
  refusal of missing originals/window exhaustion. If GitHub reuses approval on
  retry, keep publication disabled until a reviewed enforceable renewal gate is
  in place. Live settings/approval evidence belongs to the maintainer, not mocks.
- **First authentic Hennery positive:** with every channel switch still off,
  the maintainer authorizes the first signed-tag build/attestation and its public
  transparency-log disclosure. Download and independently verify its genuine
  tagged-workflow identity, source/signer digests, original run/attempt and
  payload/checksums with pinned `gh`; preserve bundle, payload and origin as the
  authentic Hennery positive fixture. This must succeed before enabling any
  channel switch, including GitHub publication. Never substitute the upstream
  fixture or structural tests for this pre-enablement acceptance.
- **Signing:** maintain the pinned public key and independently corroborated
  fingerprint; enable per-signature YubiKey touch (`on`), protect key/PIN and
  recovery material and ensure no accessible software copy bypasses hardware.
  The maintainer alone creates/signs/pushes release tags. No inventory signing.
- **Homebrew:** keep the existing approved tap; put `RELEASE_HOMEBREW_TOKEN`,
  scoped to that tap's contents only, in `release`. No upload App is needed.
- **GHCR:** put the qualified dedicated `GHCR_PUBLISH_TOKEN` in `release` and
  `GHCR_PUBLISH_USER` beside it as a variable. Keep package Actions access READ;
  ordinary `GITHUB_TOKEN` must not gain registry write through inherited access.
  Namespace/linkage/visibility and R4's live negative write acceptance remain
  maintainer-owned. Publishers use no `packages: write` job token.
- **crates.io bootstrap:** maintain verified account/email and recheck all seven
  names before first claiming. On the first release selecting `crates`, the
  maintainer creates an expiring publish-only token restricted to the seven
  exact names (including first-create rights), stores it temporarily as
  `RELEASE_CRATES_BOOTSTRAP_TOKEN` only in `release`, and explicitly enables
  `RELEASE_CRATES_BOOTSTRAP_ENABLED` alongside the normal selection/switches.
  After immutable GitHub publication the approved `publish` job's crates step
  verifies tag, checksums, attestations and public corresponding source **before**
  exposing the token. Its existing frozen-byte API uploader sends the accepted `.crate`
  bytes, never reruns `cargo publish` to repackage: proto, kernel, view, host,
  gateway, sessions, then hennery, waiting for each exact index checksum before
  dependants. Existing versions require download/hash equality; collisions,
  ambiguity and unavailable source stop it. The upload framing is the documented
  [Cargo registry API](https://doc.rust-lang.org/cargo/reference/registry-web-api.html#publish).
  After all seven exist, configure **each** crate's trusted publisher with owner
  `marcinwadon`, repository `hennery`, workflow `release.yml`, environment
  `release`. Revoke the bootstrap token, confirm revocation, remove its secret
  and turn the bootstrap switch off. On abandonment or failure without an
  immediate authorized retry, revoke/confirm revocation and remove the temporary
  secret/switch too; use a fresh scoped token for any later retry. Later jobs
  exchange OIDC only after the same verification, use the temporary token and
  revoke it in cleanup. Missing
  trust configuration fails; no bootstrap fallback. A partial bootstrap retries
  only identical immutable inputs with renewed approval and a fresh scoped token.
  This explicitly authorized first claiming supplies the initial token that
  [crates.io requires before configuring trusted publishing](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07/).

Remove `retention.py` and its tests, S3 bucket/region/storage/audit keys,
`release-staging`, `RELEASE_CANDIDATE_STORAGE_ENABLED`, all
`RELEASE_PUBLISH_APP_*`, detached inventory signatures and their CLI/setup/audit
protocol, and the separate candidate/qualification workflow. Keep no dormant
storage fallback. All platform/settings/live publication actions above remain
maintainer-only; negative offline tests do not establish live enforcement.

## 1. Inventory: what actually exists

| Area | Evidence on the inventory base | Missing before publication |
|---|---|---|
| Release build, [7a](../plans/2026-10-07-release-build.md) | [build.yml](../../.github/workflows/build.yml) builds native Linux x86_64/aarch64 musl archives and macOS arm64; checks contents, linkage, UI marker, binary execution, Alpine execution and collector image health | Only PR/main/manual builds, `contents: read`, seven-day workflow artifacts. No tag workflow or release. Release builds must use a pinned Rust toolchain, no restored Actions cache, and commit-pinned actions; the current build uses `stable`, a Rust cache and some action major tags |
| Installers | [dist-workspace.toml](../../dist-workspace.toml) pins cargo-dist 0.30.4, SHA-256, shell/Homebrew, `~/.local/bin`, no updater, attestations configured. Global artifacts include hardened shell installer, formula and checksum list | Configuration does not publish or attest anything. Installer tests run on Linux x86_64/macOS arm64, not Linux arm64. Formula tests inspect hashes, not a real Homebrew install. Combined checksum list is not independently checked |
| Runtime, [7b](../plans/2026-10-08-managed-runtime.md) | Compiled-in [adapter manifest](../../crates/hennery-host/manifest.json), verified Node/npm downloads, safe extraction, staged sets, rollback hold, CLI overrides. `join` and a host start can install the runtime | [pins.yml](../../.github/workflows/pins.yml) verifies upstream signatures, digests and package selection, but does not run logged-in live agent acceptance. Three managed platforms only |
| Services, [7c](../plans/2026-10-09-services.md) | User systemd/launchd installation, captured PATH, supervisor, locks; [7c-iii](../plans/2026-10-11-logs-parent-death.md) adds rotating logs and parent-death handling | Release acceptance must exercise real install, restart, upgrade and uninstall. A package install must not start a host or replace operator service choices |
| Doctor, [7d](../plans/2026-10-13-doctor.md), [7d-ii](../plans/2026-10-14-doctor-ii.md) | Local checks, platform restrictions, adapter initialization/login probes, collector connectivity, version drift and restart diagnostics; current code also has secret-file checks | Not evidence that a new platform works. Package acceptance needs doctor on the installed artifact; defer unrelated historical doctor follow-ups |
| Nix, [7e-i](../plans/2026-10-12-nix-package.md), [7e-ii-b](../plans/2026-10-20-nix-web.md) | [flake.nix](../../flake.nix) exports default binary and web packages on x86_64-linux, aarch64-linux and aarch64-darwin. Crane uses nixpkgs Rust/OpenSSL; the UI is built offline from pinned pnpm dependencies and embedded | [nix.yml](../../.github/workflows/nix.yml) checks Linux x86_64 and macOS arm64 only; Linux arm64 is neither built nor evaluated there. No public binary cache, adapters or module exports on main; no nixpkgs submission |
| Nix modules, 7e-ii-a | Read `docs/plans/2026-10-20-nix-modules.md` at local `plan/nix-modules`, SHA `683422841ce7acb12711a16a409bff436438f7a1`: five-task plan with prior build/replay/review evidence | Paused, never merged, and explicitly “Not executed yet.” Its earlier scratch CI is not evidence on current main; do not advertise its options as available |
| Container | [Dockerfile](../../Dockerfile) copies the same musl binary into digest-pinned distroless static, with CA roots, UID/GID 65532, private data directory and healthcheck | Per-architecture images are built/smoked, not pushed or joined into a public multi-arch manifest. No shipped third-party notices yet |
| Source build | [README](../../README.md) requires UI build first and `HENNERY_WEB_REQUIRE=1`. PR #138 is merged (`4598b1c1`): [Build without Nix](../plans/2026-10-25-build-without-nix.md) uses stable Rust, Node 24, pnpm 12.3.4 through npx and vendored OpenSSL; CI runs that block on Ubuntu/macOS | This is a checkout build, not a crates.io install. Declared Rust minimum 1.88 is not a proven minimum build. Intel Mac support is not established by the generic prerequisites |
| Crates | [workspace](../../Cargo.toml): nine crates, version `0.0.0`, all inherit `publish = false`; six internal workspace dependency entries are path-only. `hennery` alone is opted into cargo-dist | Publication metadata, registry versions, package-local assets, registry installation checks and ownership setup |
| Embedded files | At the inventory base, [kernel build.rs](../../crates/hennery-kernel/build.rs) embeds `web/dist` or absolute `HENNERY_WEB_DIST`, without invoking pnpm; missing default UI becomes a placeholder unless required. [host manifest.rs](../../crates/hennery-host/src/runtime/manifest.rs) then includes `../../../../adapters/manifest.json` (R3 moves it to package-local `../../manifest.json`) | At that base, both inputs sit outside their crate package roots. A `.crate` cannot rely on the checkout layout. R3 implements the package-local contract in §4.2 |

[packaging/README.md](../../packaging/README.md) already lists publishing blockers:
notices, OpenSSL maintenance, hardened/attested installer, release workflow,
tap credentials, GHCR permissions, dependency monitoring and fork workflow
approval. Preserve those obligations. In particular, review support/advisories
for the locked vendored OpenSSL before shipping; a system OpenSSL update does
not repair the static release binaries.

### Name availability

On 2026-10-15, an unauthenticated, read-only GET of the
[crates.io API for hennery](https://crates.io/api/v1/crates/hennery) returned
HTTP 404 with ``crate `hennery` does not exist``. The same check returned 404 for
`hennery-proto`, `hennery-kernel`, `hennery-view`, `hennery-gateway`,
`hennery-host` and `hennery-sessions`. These names were unclaimed at the check;
this neither reserves them nor proves availability at publication time. Recheck
all seven immediately before the maintainer's first real publication. Do not
publish placeholders to reserve them.

## 2. Decisions and operator questions

“Settled by spec” is binding existing scope. “Designer's recommendation” is a
proposed implementation direction for independent review. An “OPERATOR QUESTION”
requires the maintainer's answer before the affected public commitment.

| ID | Classification | Decision or question | Basis / recommended default |
|---|---|---|---|
| S1 | Settled by spec | One executable, embedded UI, no self-update; Linux musl archives, macOS arm64; WSL2 rather than native Windows | Architecture §12; distribution §§1–2 |
| S2 | Settled by spec | GitHub Releases, hardened checksum installer, Homebrew project tap, collector-only GHCR image, Nix flake | Distribution §§2, 4. Homebrew core is not the initial channel |
| S3 | Settled by spec | GitHub keyless artifact attestations; no maintainer-held general artifact signing key | Distribution §2. Attest archives, checksum list, installer and image; extend coverage to new artifacts below |
| S4 | Settled by spec | Managed Node/adapters by default; no redistribution of the Claude CLI; Linux hosts need glibc ≥2.28; logged-in macOS user | Distribution §§1.1, 3, 13; maintainer decisions in the docs index |
| S5 | Settled by spec / brief | Publishing remains disabled until explicit maintainer go-ahead | Applies separately to Releases, crates.io, tap, GHCR, AUR, package repositories and caches; merging implementation is not consent to publish |
| D1 | Designer's recommendation | Publish the seven-crate production dependency closure in lockstep; keep pins/testkit private | Avoid merging modules merely for packaging; exact internal version requirements prevent mixed release internals |
| D2 | Designer's recommendation | Package prebuilt UI in kernel and manifest in host; no build-time asset fetching | Ordinary Cargo install works without Node/pnpm; distro builds may supply freshly built UI |
| D3 | Designer's recommendation | Carry source revision, UI digest and adapter-manifest digest in release metadata and diagnostic build identity | Resolves 7d's build-id follow-up; preserve existing platform-specific process identity checks |
| D4 | Designer's recommendation | Start native Linux packages as wrappers of the verified musl executable; separately design distro-native source builds | Small incremental reach; no implicit glibc dependency for collector-only use, no install-time runtime downloads |
| D5 | Designer's recommendation | Resume 7e-ii-a against current main rather than rewrite it | Preserve its four recorded maintainer answers and revalidate its assumptions (§4.5) |
| Q1 | OPERATOR QUESTION | Which channels should the first public release enable? | GitHub Releases plus the already-available flake at the release tag first; enable Homebrew, crates.io and GHCR in that order as their own acceptance gates pass. Defer native packages and AUR |
| Q2 | OPERATOR QUESTION | Should the first public version be a prerelease or 0.1.0? | First a GitHub-only `0.1.0-alpha.1` rehearsal; then `0.1.0` for normal package-manager discovery, explicitly labelled early testing with no 1.0 stability promise. Bare `cargo install hennery` is a goal of the non-prerelease publication; prereleases require an explicit version |
| Q3 | OPERATOR QUESTION | Should Intel macOS become a supported host platform in the next distribution wave? | Yes, after R5's native binary, managed-runtime, live-agent and service gates pass; do not block the three-platform first release or advertise Intel support before that |
| Q4 | OPERATOR QUESTION | Should upstream publish separate GNU Linux archives in addition to musl? | Defer until a tester or packager needs them; retain musl as the universal upstream Linux download. If approved, R9 adds both architectures with an explicit glibc baseline |
| Q5 | OPERATOR QUESTION | Should the first release require Apple Developer ID signing and notarization? | Defer the account/certificate work unless real Gatekeeper acceptance blocks testers. Ship keyless attestations and accurately describe the absence of Developer ID/notarization; never instruct users to disable Gatekeeper |
| Q6 | OPERATOR QUESTION | Should hennery operate APT and RPM repositories during early testing? | No initially: publish downloadable `.deb`/`.rpm` assets after R7. Add signed repository metadata and a key lifecycle only if enough testers need automatic package-manager updates |

These questions are recorded for the parent rather than blocking this design
deliverable. Defaults are not approval to widen the umbrella's platform scope.

## 3. Platform contract

Separate **executable compatibility** from **managed host compatibility**. A
static executable can start on Alpine while its downloaded Node/agent cannot.

| Target / environment | Present state | Proposed support and acceptance |
|---|---|---|
| `aarch64-apple-darwin` | Native archive and managed `darwin-arm64`; Nix package | First wave. Record/test minimum macOS version and deployment target, UI, logged-in agent access, launchd and first-exec behavior |
| `x86_64-apple-darwin` | No archive, no flake system, no managed `darwin-x64` enum/manifest entry | R5, conditional on Q3. Add native runner, Node/adapter pins and generator validation, pin-job matrix, doctor, services, formula and Nix system together. Native live ACP acceptance; cross-compilation or Rosetta alone is insufficient |
| `x86_64-unknown-linux-musl`, `aarch64-unknown-linux-musl` | Both native archives and image smoke builds exist | First wave. Static linkage and no loader; collector on glibc and musl. Hosts on glibc ≥2.28 and kernel ≥4.18, subject to the pinned agents' actual requirements; no managed Alpine host promise |
| `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu` | Source builds use local libc; no upstream release archives | Optional R9, Q4. Build against an approved oldest baseline, proposed glibc 2.28, measure ELF symbol requirements and run on that baseline plus current distros. If toolchain/dependencies need newer glibc, disclose and obtain a support-floor decision; a recent Ubuntu build cannot establish the old floor |
| NixOS / Nix | Three exported systems; two systems exercised in Nix CI | First wave advertises tested flake systems honestly; add native Linux arm64 Nix CI. Managed host needs nix-ld. Declarative Nix adapters/modules become available only after R6 |

Linux release smoke coverage should include supported Debian and Ubuntu LTS,
Fedora and an enterprise-compatible glibc baseline, plus Alpine for the
collector. Pin exact image versions/digests in the implementation plan; call a
distribution supported only after its install/start/UI/upgrade tests run. The
glibc floor alone does not certify every distro. Native systemd/launchd tests
need VM or host runners; ordinary container smoke tests do not prove services.

For GNU archives, propose vendored OpenSSL as for other upstream downloads,
while libc remains dynamic. Distro-native source packages may instead use
system OpenSSL and carry distro-specific dependency metadata. Never rename a
musl archive to a GNU target to satisfy a downloader. Intel macOS runner
availability and ongoing cost are qualification inputs, not assumptions.

## 4. Channel design and maintenance cost

### 4.1 GitHub Releases and installer

Keep cargo-dist 0.30.4 initially; regenerate and inspect its workflow rather
than assuming its defaults meet 7a's requirements. A release build starts from
the approved tag's exact commit in a fresh job, never from PR/main workflow
artifacts. Pin Rust, cargo-dist's digest, every action commit, Node/pnpm and
builder images where used; record runner OS/SDK versions. Pinning improves
repeatability but does not itself prove byte-reproducible binaries.

For each target ship an archive, per-file SHA-256, SPDX JSON SBOM and provenance
attestation. Global assets are the hardened installer, formula, independently
verified `sha256.sum`, complete `dist-manifest.json`, release inventory and a
source archive. Archives contain the executable, README, licence and generated
third-party notices. Extend the current exact-content check intentionally.
Define the checksum inventory without cycles: list the payload artifacts,
not `sha256.sum` itself or its signature sidecars; attest the checksum file
separately. The verifier checks both inventory completeness and each digest.
Include Rust dependencies, vendored OpenSSL/SQLite and bundled frontend
dependencies in SBOM/notices; a Cargo.lock-only report omits the web UI. Image
SBOMs also cover the base image. Describe downloaded runtime dependencies in a
separate inventory tied to the adapter-manifest digest, without packaging them.

Generate notices and corresponding source material before freezing hashes.
Preserve the release source, Cargo/web lockfiles and build instructions, plus
third-party source/notice material required by the chosen licence obligations.
Review frontend assets/fonts as well as code. A link to a moving branch is not
the release's source record. The maintainer reviews unresolved licence findings
before publication; this design does not infer a redistribution licence for
third-party agent binaries.

The signer is the approved release workflow's GitHub OIDC identity, not a
maintainer's laptop key. Attest the **final bytes**, including the hardened
installer, checksum list, manifests, SBOMs, source bundle and later native
packages. Downloadable Sigstore bundles accompany assets for durable verification.
Verification must check digest, expected repository/workflow identity and release
commit/tag; a SHA-256 downloaded beside an archive alone authenticates no author.
GitHub documents file, container and SBOM attestations in its
[attestation guide](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

The convenient install path checks archive hashes and fails without a SHA-256
tool, as today. The verified path downloads and verifies the installer before
executing it, then checks the archive; document both trust levels. Fail closed
on unsupported OS/architecture, missing digest, wrong digest and failed download;
install atomically into the selected user directory without sudo. Test Linux
arm64 too. Never start services, install adapters, or silently overwrite another
package manager's installation. Explain PATH conflicts through doctor.

**Value / cost:** highest reach with the least user setup, building on existing
work. Medium-to-large initial release/security work; recurring platform CI,
dependency/advisory triage and one acceptance run per release. No parallel
home-grown installer implementation.

### 4.2 crates.io and cargo-binstall

Publish this production graph in topological order (same version throughout):

| Crate | Internal production dependencies | Publication role |
|---|---|---|
| `hennery-proto` | None | Shared protocol/types |
| `hennery-kernel` | proto | Kernel plus packaged UI |
| `hennery-view` | proto | Display fold |
| `hennery-host` | proto | Host plus packaged adapter manifest |
| `hennery-gateway` | kernel, proto | Gateway |
| `hennery-sessions` | gateway, kernel, proto, view | Sessions |
| `hennery` | gateway, host, kernel, sessions | User-facing executable; publish last |

`hennery-pins` and `hennery-testkit` stay explicitly `publish = false`, and
generator binaries in proto/view should not become advertised installable
products. Keep the workspace default private and opt in only this closure.
Each publishable crate needs description, repository, licence and a useful
package README; each internal production edge needs `path` plus an exact
registry version. Versionless testkit dev-dependencies can remain local: Cargo
omits them from published manifests. Repository-level tests still run against
the full source, and release source includes their fixtures; do not claim that
the normalized individual crates retain the entire workspace test harness.
[Cargo's dependency rules](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html#multiple-locations)
describe registry fallbacks and dev-dependency normalization.

**UI packaging contract:** prepare release packages from an isolated copy of
the approved source. Build the web UI once from the pinned web lockfile, copy
only distributable output into a package-local directory such as
`hennery-kernel/web-dist/`, and include it explicitly in the kernel tarball.
Include `index.html`, referenced chunks, CSS, icons and other required assets;
exclude node_modules, credentials, build caches and source maps. Record a file
inventory/digest and its source revision. Include a package marker declaring
that this is a release carrying the UI; missing or invalid UI must fail a
published-package build even without `HENNERY_WEB_REQUIRE`.

**Crate licence/source acceptance gate (R3):** inspect the extracted contents of
every final `.crate` for the actual licence text, not just the SPDX value in
Cargo metadata. The kernel tarball must also contain the frontend third-party
notices for the compiled assets it carries, including required dependency and
asset licence texts. Its packaged README/source notice must give an immutable,
release-specific corresponding-source link covering the web sources, lockfiles
and build scripts used to produce those assets, alongside the Rust source.
Record the source archive's digest in the candidate inventory; verify the link
is accessible without charge before publishing the kernel crate and retain the
source for the required availability period. A moving branch link, minified
bundle or source maps alone does not meet this design's AGPL source-delivery
gate ([LICENSE §6](../../LICENSE)). R3 acceptance must fail when a tarball lacks
licence text, the kernel lacks frontend notices, or the source link is missing,
mutable, unavailable or points to incomplete/mismatched source. A repository
licence file outside the tarball cannot substitute for this inspection.

Build-script precedence: explicit absolute `HENNERY_WEB_DIST` (validated), then
the release package's marked UI, then checkout `web/dist`. Only an unmarked
development checkout may fall back to the existing placeholder. A release
marker with missing UI must never fall back to a neighboring checkout. Neither
the build script nor Cargo install fetches or rebuilds the UI. Nix and distro
builders can use the explicit override for UI they built from source.

Move the canonical adapter manifest into the host crate's package root, or
generate an exact package-local copy during release preparation. Prefer moving
the canonical file with all generator, pin-job and Nix consumers updated, so
there is still one authority. Test byte/digest equality against the pin source;
`include_str!` must not traverse outside the package. UI placement in `hennery`
alone cannot fix the kernel's independent build, and a Cargo `include` glob
cannot make arbitrary parent directories part of the package.

Default Cargo install should work with a supported Rust/C build toolchain and
no Node, pnpm or preinstalled OpenSSL. Recommend making `vendored-openssl` a
default CLI feature, retaining `--no-default-features` for Nix and distro
system-library builds and updating their feature/check contracts together.
Document C compiler, make and Perl prerequisites; macOS uses Xcode Command Line
Tools. Test both bare `cargo install hennery` and the recommended reproducible
form `cargo install hennery --locked`. Recheck unlocked dependency resolution
on each release. Prove Rust 1.88 on the packaged graph or raise `rust-version`
to a tested minimum; do not repeat the unproven minimum as support policy.

Before any real publication, inspect each `cargo package --list` and normalized
manifest, enforce the registry size limit (currently documented as 10 MB), and
build extracted packages with no checkout paths available. Use a temporary
local registry containing the candidate seven packages to test the dependency
graph before their first versions exist on crates.io. Run package verification
and install with registry dependencies prefetched and network disabled for the
build phase; run the resulting collector and browser tests with Node/pnpm
absent. Fetch `/` and its referenced assets, and assert no placeholder. A normal
checkout build or `cargo install --path` against that checkout is insufficient.
The [Cargo publishing guide](https://doc.rust-lang.org/cargo/reference/publishing.html)
describes package inspection and verification.

The exact prepared package digests are release inputs. Publication tooling must
verify the bytes Cargo uploads match the approved package inventory; it must
not quietly rebuild the UI between checking and publishing. Allow dirty files
only in the isolated generated release staging tree, with an explicit inventory.
Wait for each published dependency to become resolvable before publishing its
consumers. Partial failure is recoverable by continuing only missing versions
whose prepared digests still match, after comparing already-published registry
bytes with the approved digests (§6). Missing candidate bytes or mismatching
remote bytes require a new candidate and approval, not a blind upload retry.

Add `package.metadata.binstall` to the CLI package with a versioned release URL,
`pkg-fmt = txz`, and the archive's actual `hennery-<target>/hennery` binary path.
For example, metadata describes `releases/download/v<version>/hennery-<target>.tar.xz`;
do not point to `latest`. Verify GNU-host selection of the musl artifact on both
Linux architectures, or provide explicit per-target overrides to those actual
musl URLs. A missing GNU artifact must not be advertised. Pin the binstall
version for acceptance tests. Its defaults can use third-party quickinstall
and source fallback; document an upstream-only recipe and do not claim it
verifies GitHub attestations automatically. Metadata/signature support must be
tested independently of the verified installer path.
[Binstall documentation](https://docs.rs/crate/cargo-binstall/latest/source/README.md)
describes these discovery and fallback behaviors.

**Value / cost:** familiar Rust install and discoverability; binstall makes it
fast. High initial cost because seven crates, embedded inputs, feature defaults
and first-publication ordering change. Recurring lockstep releases and crate
ownership/security work. Internal libraries are published to support the app,
not promised as a separately stable SDK; document their pre-1.0 compatibility.

### 4.3 Homebrew

Use the existing `marcinwadon/homebrew-tap` configuration after the maintainer
creates/approves the tap. Publish a generated formula only after its referenced
release artifacts are public and verified. It installs the same archive bytes
and checks hashes; add notices and a test of version plus embedded UI. Test
actual install, upgrade and uninstall on each advertised Homebrew platform in
an isolated environment. Do not add a second service implementation through
`brew services`; initially document `hennery service install` and explicit
restart/reinstall when a Cellar path changes.

The tap is settled scope. Core would be a separate source-build formula and
upstream review; it is not a promotion of the generated binary formula. Core
requires stable releases under its
[acceptance policy](https://docs.brew.sh/Acceptable-Formulae), and cargo-dist's
[Homebrew documentation](https://axodotdev.github.io/cargo-dist/book/installers/homebrew.html)
describes the binary tap approach. Keep prereleases out of the normal formula.

**Value / cost:** high for Mac testers, low initial work after Releases; one
formula and isolated install matrix per release, plus tap credential upkeep.
Core adds upstream policy/review and bottle maintenance; defer until usage and
release stability justify it.

### 4.4 Linux packages and AUR

Start with release-attached `.deb` and `.rpm` files for both architectures,
not a package for every distribution. Use pinned `cargo-deb` in no-build mode
and `cargo-generate-rpm` over the already verified musl executable, preserving
its bytes (no second stripping pass). Include licence/notices and package docs.
Record Debian architecture names `amd64`/`arm64` and RPM names
`x86_64`/`aarch64`; verify declared architecture against the ELF file.
Their [deb](https://docs.rs/crate/cargo-deb/latest) and
[rpm](https://docs.rs/crate/cargo-generate-rpm/latest) documentation supports
this separation of compilation and packaging. The cargo-dist
[installer list](https://axodotdev.github.io/cargo-dist/book/installers/index.html)
does not establish native deb/rpm support; do not assume the pinned 0.30.4
handles either without proving it.

Install the executable under the package manager's binary directory and docs
under its documentation directory. No post-install registry access, agent login,
data migration, host pairing, service start, linger enablement or root-owned
per-user data. Uninstall removes package files, preserving data and operator
service definitions; document stopping/removing services explicitly. Upgrade
reports a pending restart. Test install/upgrade/remove, file ownership, no
unexpected network calls and restart behavior on Debian/Ubuntu and Fedora/
enterprise-compatible systems. RPM signature policy varies: test the target
system's local-package path rather than recommending a signature bypass.

Initially use release attestations and digest verification before local package
installation. APT/DNF repository integration is Q6's later commitment: signed
APT Release/InRelease metadata, RPM package/repository signing as required,
key distribution/rotation/revocation, metadata hosting and retention. GitHub
attestations do not automatically satisfy APT or RPM native trust policies.
If a target refuses an unattached native signature, gate that package channel
on the corresponding signing setup rather than weakening its verification.

For Arch, begin with an explicitly maintained `hennery-bin` AUR recipe using
versioned upstream archives, fixed digests, architecture restrictions and
`provides/conflicts` for `hennery`. Generate/review `.SRCINFO`; test in a clean
Arch environment and sign/verify sources through the supported package workflow.
A later `hennery` source recipe builds Rust and web from the exact source tag.
Do not label AUR as an official Arch repository or presume Arch ARM has the
same support coverage. Defer the source recipe until someone will maintain its
web dependency/offline build plumbing; never fetch runtime agents in PKGBUILD.

**Value / cost:** medium value for users wanting tracked files/removal; medium
initial deb/rpm cost, recurring distro/version matrix and security rebuilds.
AUR binary recipe is small but needs a responsive owner. Official Debian,
Fedora or other distro inclusion is a different, high-maintenance effort:
source builds, bundled-dependency policy, licensing review, offline tests and
downstream patch support. No acceptance promise is made here.

### 4.5 Nix and the paused modules

First document/install the existing flake at an immutable release tag/revision.
Build its package on all three exported systems, preserving the separate UI
derivation, reference guards, web hash update procedure and system OpenSSL.
No public cache is necessary for correctness; source builds cost testers time.
An optional binary-only cache needs separate maintainer approval, a signing key
and an allowlist of outputs/closures. Never use whole-store upload hooks where
unfree adapter downloads or their fixed-output derivations may enter the store.

Resume 7e-ii-a's five tasks on current main, retaining its recorded decisions:
Claude remains in the default agents with explicit unfree acceptance; the host
unit has no `NoNewPrivileges`; CI may build/check the CLI but never cache or
publish it; revoked hosts stop restarting with exit 78. Its intended model is
NixOS system units (dedicated hardened collector user, host as the project
owner), Linux Home Manager user units, and `adapters.source = nix | managed`
with Nix default. Pairing remains an operator step as the host user. These
system units are the Nix-specific extension recorded by that plan, not a new
default for generic native packages.

Re-review merge drift in flake outputs and doctor; run native Linux arm64 checks
in addition to the old x86_64 VM tests. Preserve safe extraction, no stripping
of bundled CLIs, Node-major checks, real adapter initialization and explicit
Claude licence handling. Revisit its recorded limits: doctor does not fully
inspect system unit state/PATH/drop-ins; Codex voice helper remains unpatched;
macOS adapter checks require unsandboxed execution. Do not silently mark these
resolved. Home Manager's real module integration needs acceptance beyond the
old stand-in option tests.

A later nixpkgs submission should start with the free hennery binary and built
web UI, using nixpkgs conventions rather than requiring this repository's flake
at evaluation time. Assign a nixpkgs maintainer, add package tests and review
licence/source requirements. Offer NixOS modules separately after their service
contract settles. Do not put the Claude CLI in a public closure/cache.

**Value / cost:** existing flake is immediately useful to Nix testers; modules
have high value to NixOS deployments. Low incremental work for tagged package
docs, substantial work for modules/adapters and native CI. Ongoing nixpkgs,
pnpm-fetcher, Node and adapter drift; nixpkgs review adds an external cadence.

### 4.6 GHCR collector image

Publish `ghcr.io/marcinwadon/hennery` only after namespace/visibility approval.
Use the approved musl binaries unchanged, add source/revision/licence OCI
labels and notices, and produce linux/amd64 and linux/arm64 images plus one
OCI index. Verify binary digests against the release inventory, smoke-test
each architecture, and attest both platform manifests and the final index;
attach per-image SBOMs. Record the index digest in release notes.

Use immutable version tags and digest references for reproducible deployment;
moving `latest` and minor-version tags advance only after both architectures
pass, never for prereleases. Keep old digests available for rollback. Document
the non-root volume owner, local storage, TLS proxy/loopback publication,
`HENNERY_LISTEN`, and reading setup through `hennery admin setup-url` rather
than logs. Image users must still pair separate hosts next to their projects.
No Node, adapters or real user data enters the image.

**Value / cost:** high for a remote collector, little benefit for installing an
agent host. Medium initial work over the existing image; recurring base-image
security rebuilds, two-platform tests and storage. A base-image-only rebuild
gets a new immutable image revision and provenance, never replaces an existing
version digest silently.

## 5. Managed runtime and downstream packaging

Installation of hennery and first use of a host are distinct network events.
Release archives, Cargo, Homebrew and native packages carry the application,
UI and manifest only. A collector needs no Node. A default host fetches pinned
Node and npm tarballs into its user's data directory on join/start; roughly
700 MB per adapter set and about 1.5 GB for two sets plus Node are the existing
spec's estimates, to remeasure for each pin. Agent subscriptions/logins are
the user's; installing a package does not authenticate them.

For distro packagers this means offline package installation does not imply
offline host operation, and the host's runtime dependencies are not serviced
by the OS package manager. Document download sources, digests, disk use, update/
rollback controls and the separate runtime inventory. A host with a prepared
matching set can avoid those initial downloads; do not advertise general
air-gapped support without end-to-end proof, including service startup.

The existing escape hatch is `join --no-runtime` plus explicit `--agent`
commands supplied by the operator/package integration. `--use-cli` replaces
only an agent CLI and still needs its adapter/Node; it is not an offline switch.
A distro that forbids runtime downloads should supply approved external
adapters and arrange this mode, or package collector use only. There is no
existing generic “distro/offline” build profile to claim. Nix's planned adapter
derivations are a concrete integration, still subject to the unfree restriction.

Audit the actual service propagation of registry/Node mirror configuration:
7b recorded a gap where interactive mirror settings did not survive into the
service. Close/test that gap before claiming mirror-only deployments. Do not
silently substitute distro Node for the managed default. Different adapter
commands affect isolation guarantees and must retain the existing visible
fallback reporting. All artifacts and package hooks must be checked for absent
adapter payloads, not just absent `node_modules` names.

## 6. Release process and recovery

1. **Prepare a release PR.** One workspace SemVer version; update CLI/library
   versions, internal exact edges, web release metadata and changelog together.
   Patch for compatible fixes, minor for pre-1.0 breaking behavior. Changelog
   states platform floors, runtime pins, security changes, schema/config changes,
   restart/backup needs, migration direction and known limitations. Never imply
   that package availability changes the README's early-testing data guarantees.
2. **Qualify the exact commit.** Require fmt, both Clippy modes, workspace tests,
   both generator checks, web typecheck/unit/build/Playwright, non-Nix README
   builds, Nix checks on claimed systems, all archive/linkage/UI/installer/formula
   checks and image smoke tests. Require a current advisory/licence review, not
   just the flake's pinned RustSec snapshot. Preserve security failures rather
   than weakening gates. For the first release and every pin/platform change,
   run signature/file checks and logged-in agent acceptance on every claimed
   host platform, including
   start/prompt/tool/permission/resume/MCP and the pinned Codex delete contract.
   The checks must have succeeded for the **exact source SHA** being released,
   from the expected trusted workflows: missing, pending, failed or cancelled
   checks refuse publication. A green PR merge ref or another commit does not
   qualify the tag. Current `ci.yml` runs on PRs and main, not release tags;
   the release orchestrator must verify the exact SHA's completed checks or
   explicitly run the required qualification workflow at that SHA and wait.
3. **Authorize candidate creation.** Maintainer approves version, source SHA,
   channel list and target list, then creates/protects the annotated `v<version>`
   tag. Recommend signing it with the maintainer's personal release identity;
   verify the chosen signing fingerprint if used. Tag signatures and workflow
   artifact signatures serve different purposes. Restrict creation, updating
   and deletion of release tags to the authorized release path; disable bypass
   of those restrictions. Never move a published tag. Publishers re-resolve the
   tag and refuse a deleted tag or one no longer naming the approved SHA.
4. **Build and stage.** A tag identifies a candidate; it is not permission to
   publish. Fresh jobs at that SHA rebuild all release inputs, without restored
   Actions caches. Separate unprivileged build jobs from publishing credentials.
   Assemble notices, SBOMs, source and digest inventory, run channel acceptance,
   and retain the exact candidate outputs until every approved channel completes.
   The seven-day retention in `build.yml` is not sufficient as this policy:
   release staging needs durable, immutable storage and retention that covers
   delayed approvals/retries. Staging is within the authorized release workflow,
   never promotion of PR/main build artifacts.
5. **Approve publication.** Every publishing **and signing** job must reference
   the protected release environment, including reusable workflow jobs and
   retries. Disable administrator bypass explicitly; do not rely on its default.
   An environment gates jobs but does not bind approval to artifact digests.
   Add an authenticated approval record containing the immutable inventory
   SHA-256, source SHA/tag, enabled channels/targets, candidate build run ID and
   attempt, and publishing run ID and attempt. The inventory covers every
   payload digest. Display that tuple to the maintainer for approval; retain
   the approver identity and decision with it in an append-only audit record.
   A protected manual publish dispatch with explicit inventory/run inputs,
   correlated with that run's environment approval, is the recommended binding
   mechanism. Authenticate the approver from trusted workflow/platform records,
   never from an actor name supplied by a build artifact.
   Each publisher and signer must revalidate the record, inventory hash, actual
   bytes, channel/target set, run attempt, tag/SHA and exact-SHA check results
   before receiving credentials and again before signing/uploading. Changed
   bytes, channels or targets invalidate approval; a new publishing run attempt
   also requires renewed approval, even when reusing identical candidate bytes.
   Only after these gates obtain OIDC/write credentials and create public
   attestations or publish.
   Use minimal job permissions: `contents: write` for releases, `id-token: write`
   and `attestations: write` for provenance, `packages: write` for GHCR; no
   secrets or write authority in untrusted PR execution. Fork runs require
   approval. No automatic publish merely because a version changed.
6. **Publish in dependency order.** Release archives/verification assets first;
   crates dependencies then CLI once registry-ready; tap/AUR metadata only once
   URLs exist; GHCR index only after all image checks. Channel failure is recorded
   explicitly: this is not a transaction across registries. Before a retry,
   reconcile every already-published artifact against the approved digest,
   including uploads whose response was lost or timed out. Use registry content
   digests or fetch/hash the remote bytes; an existing filename/version or a
   successful earlier log line is insufficient. Matching remote bytes count as
   completed; upload only missing artifacts from the retained candidate after
   renewed run-attempt approval. Missing candidate bytes, mismatching remote
   bytes, or an unverifiable remote upload stop recovery. Require a new candidate
   and approval; use a new version where immutable published versions prevent
   correction. Never rebuild missing bytes under an old approval, overwrite
   remote content or infer success from an ambiguous upload. Hold announcements
   and moving aliases until the enabled channel set is healthy.
7. **Verify the public path.** In scratch homes, download and verify signatures,
   install through each enabled channel, load the real UI and run doctor and
   a disposable session. Record OS/architecture, source SHA, digests and results.
   Only now update installation docs from “no published releases” and announce
   the release. Pin examples to an actual existing release; test README commands.

**Negative release acceptance (R1, extended by each channel):** demonstrate a
refusal for each gate, using non-publishing fixtures or an isolated test setup:

- A publishing/signing job omits the protected environment; environment or tag
  rule bypass is enabled; or an unauthorized actor tries to create, update or
  delete a release tag. Check configuration as well as attempted execution.
- The approved tag disappears or points elsewhere; the required checks are
  missing, pending, failed, cancelled, from an unexpected workflow or green
  only on another SHA. None may acquire publication credentials.
- Approval is absent, from an unauthorized actor, or names another inventory
  digest, candidate run/attempt or publishing run/attempt. A rerun must not reuse
  the earlier run attempt's approval.
- A candidate byte, channel or target changes after approval, including between
  initial validation and the signing/upload boundary. Require renewed approval.
- A candidate expires or loses an artifact; a remote upload returns ambiguously;
  or already-published bytes differ from the inventory. Recovery must stop
  unless the remote bytes can be verified as identical and the complete local
  candidate remains available under a newly approved publishing attempt.

Each refusal gets its own test/probe; one generic “approval failed” test does not
prove these independent gates. Publication remains disabled if the chosen
platform/settings cannot enforce them. Candidate retention is separate from
long-term release and corresponding-source retention.

For crates.io, prefer trusted publishing for subsequent releases. Its documented
bootstrap requires a first manual publication, then configuration of the trusted
repository/workflow/environment; confirm the current settings when implementing.
Use a short-lived narrowly scoped bootstrap token and revoke it afterwards,
rather than a standing all-crates CI secret.
[Rust's trusted publishing announcement](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07/)
describes the bootstrap and OIDC model.

**Rollback is not binary replacement alone.** Stop affected services and record
their binary/config/runtime versions. Preserve a backup of the complete data
directory, including databases, attachments and secret keys; use a verified
backup facility if implemented, otherwise a documented stopped-service copy.
Do not assume an old binary reads a migrated database. Downgrade only when the
release compatibility record says it is safe; otherwise restore the matching
backup or ship a forward fix. Adapter rollback/hold is separate and does not
roll back collector schema or application code.

For a bad release, mark it withdrawn with remediation, remove it from moving
aliases, revert tap/AUR pointers when data compatibility permits, and publish a
new patch version. On crates.io, yanking discourages new resolution but does
not remove installed copies or invalidate existing lockfiles. Keep a coherent
set of working internal crate versions. Never reuse a version, silently replace
checksums/assets, or retag an old SHA. Images roll back by retained digest only
when data compatibility permits. Security incidents additionally revoke affected
tokens/keys and identify the affected artifact digests.

## 7. Plan split, in value order

These are design-sized implementation briefs, **not executable plans**. Each
must follow the repository's built-first, review, replay and probe process when
assigned. Sizes are relative: S = 1–2 tasks, M = 3–4, L = 5 or more, including
acceptance work; shared infrastructure and external review can increase them.

| Order / proposed plan | Size | Deliverable / exit gate | Dependencies and value |
|---|---|---|---|
| R1 — publishable release foundation | L, 5 tasks, likely 2 PRs | Version/build identity; notices/SBOM/source; pinned cache-free candidate workflow; enforceable approval binding and negative gate tests; retained-candidate recovery/digest reconciliation; tested installer and tagged flake, adding Linux arm64 acceptance. First authorized release installed from a clean machine | Reuses 7a/7b/7c/7d/7e. Highest value; Q1/Q2 determine first publication. No new platform promise |
| R2 — Homebrew tap | S, 2 tasks | Actual formula install/upgrade/remove, then gated tap publication and service-path guidance | R1 and maintainer tap setup; low-cost Mac adoption |
| R3 — crates.io and binstall | L, 5 tasks, likely 2 PRs | Seven-crate metadata/versions; package-local UI/manifest; every tarball's licence text, kernel frontend notices and immutable corresponding-source link verified; feature/MSRV checks; temporary-registry install; controlled publish/binstall acceptance | R1; useful familiar channel but larger engineering cost. Bare Cargo install only promised after non-prerelease publication |
| R4 — GHCR | M, 3 tasks | Notices/labels/SBOM; native images and index; gated push, digest verification and volume/upgrade docs | R1; remote collectors without a build toolchain |
| R5 — Intel macOS qualification | M–L, 4–5 tasks | Native archive + runtime manifest/generator/pin checks + doctor/services + flake/formula + live acceptance; declared OS floor | R1, Q3, and Q5 disposition. Add to all enabled channels only after qualification |
| R6 — resume 7e-ii-a | L, existing 5 tasks plus re-anchoring | Nix adapters, doctor system-unit interpretation, NixOS/Home Manager modules and VM/native checks, current spec write-back | Existing paused plan, current 7e-ii-b and R1; substantial NixOS user value. No new licence/cache permission implied |
| R7 — downloadable deb/rpm | M, 4 tasks | Metadata wrappers, architecture/dependency checks, distro install/upgrade/remove matrix, attested release assets | R1; optionally R3's source packaging. Q6 defaults to no hosted repositories |
| R8 — AUR binary recipe | S, 1–2 tasks | Clean Arch install/update/removal and reviewed PKGBUILD/.SRCINFO, explicit maintainer ownership | R1 plus stable release; optional tester reach, no official Arch claim |
| R9 — GNU archives, if requested | M, 3–4 tasks | Oldest-baseline builders, linkage/symbol/runtime checks on both architectures, downloader mapping/docs | R1 and Q4 approval; lower initial value since musl already covers glibc machines |
| R10 — upstream ecosystem submissions / hosted repos | Separate plans, M–L each | nixpkgs binary first; later Homebrew core or distro source recipes; APT/RPM repository signing/hosting if authorized | Stable releases, real users and named ongoing owners. No single omnibus packaging PR; no promised external acceptance |

Q5's optional Apple signing/notarization is a separate M-sized 3-task adjunct:
credential/key handling, signing/notarization before final archive hashing, and
quarantined-download acceptance on both Mac architectures. It may move ahead
of R1 if actual tester acceptance requires it. GitHub keyless signatures are
not Apple Developer ID signatures or a Gatekeeper notarization ticket.

The smallest useful rollout stops after R1; R2–R4 can then ship independently
as they pass. R5–R10 are not hidden prerequisites for giving early testers a
working download. Existing source-build instructions remain supported.

## 8. Maintainer-only setup and approvals

| Account / surface | One-time step or secret | Ongoing owner action |
|---|---|---|
| Release identity and repository | Choose first version/channel scope; protect main and restrict release-tag creation/update/deletion; disable tag-rule and environment administrator bypass; require the protected environment on every publishing/signing job; configure allowed refs/reviewer and exact-SHA checks; choose tag-signing identity/fingerprint. Enable fork-workflow approval and durable candidate retention | Approve the authenticated inventory-digest/run-attempt record and channel set; renew approval after changes or a new publishing attempt. Verify gate configuration and negative tests; keep publishing disabled if the required controls cannot be enforced |
| GitHub artifact signing | Approve public transparency-log disclosure; enable narrowly scoped workflow OIDC/attestation permissions | Review pinned signing actions and verification identity. No long-lived Sigstore private key is needed |
| crates.io | Personal account and verified email; recheck seven names; approve first real publication of all seven crates; bootstrap token with only needed publish rights; configure trusted publisher per crate, workflow and environment afterwards; revoke bootstrap token | Ownership/recovery contacts, release approval and emergency yanks. No name reservation or upload by this design lane |
| Homebrew tap | Create/approve `marcinwadon/homebrew-tap`; scoped GitHub App token or fine-grained token limited to tap contents, stored only in protected publishing environment | Rotate credential and maintain/review formula updates; verify generated workflow supports the chosen credential method |
| GHCR | Approve namespace/package creation, repository linkage, public visibility and retention; enable job-scoped `packages: write` | Release/purge policy and base-image rebuild approval; no personal broad registry token by default |
| Dependency security | Enable Dependabot alerts or approved equivalent; approve update automation if wanted; establish an OpenSSL/runtime advisory owner | Triage live advisories, refresh pinned RustSec inputs, approve dependency/pin changes; never rely solely on old pinned audit data |
| Agent acceptance | Confirm pinned versions and supply isolated, logged-in test accounts/machines on claimed host platforms; approve usage costs | Run/attest live gates and Codex deletion-contract checks. Never expose agent credentials to PR builds or publish their homes |
| Intel Mac runners / Apple, conditional | Approve runner access/cost. For Q5: Apple Developer membership, Developer ID certificate/private-key storage and notarization credentials, with recovery/rotation | OS/SDK floor and certificate lifecycle; platform expansion acceptance |
| Native package repositories, conditional | Q6 approval; hosting/domain/storage choice; APT signing key and RPM signing credentials with public-key distribution, expiry/rotation/revocation and recovery procedure | Publish signed metadata, retain versions, monitor availability; no repo keys needed for the initial design-only work |
| AUR / upstream submissions, conditional | AUR account and scoped SSH key, confirm package names and ownership; nominate nixpkgs/Homebrew/distro maintainers and authorize submissions | Respond to downstream breakage/reviews and releases; publication remains maintainer-controlled |
| Nix cache, optional | Explicit binary-cache approval, service account/token and cache-signing trust setup; allowlist free binary/UI closure only | Audit uploads, retention and key rotation; no Claude CLI, downloaded tarball or unrestricted whole-store cache |
| Licence/source review | Approve generated notices, corresponding source delivery and any unresolved third-party licence findings; inspect licence texts in all seven tarballs, frontend notices in kernel and its immutable source link | Repeat for changed dependency sets; keep corresponding source available independently of candidate/workflow artifact expiry |

Parent review should concentrate on publication trust boundaries, crate tarball
completeness, platform claims versus actual runtime support, licence/source
coverage, the paused modules' preserved decisions, and recovery after a partial
multi-channel release. The review recorded above does not validate an
implementation; these amendments need scoped re-confirmation, and implementation
acceptance remains future work.

Generated with Claude AI — please review before distribution.
