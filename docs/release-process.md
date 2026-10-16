# Release process

The operator's 2026-10-16 decision replaces the former candidate/storage and
inventory-signature process. Publication remains disabled until the maintainer
explicitly qualifies and enables it. The first version is `0.1.0-alpha.1`, GitHub
only; stable `0.1.0` and additional channels require separate go-ahead. Building
this pipeline performs no publication or external settings change.

## Trust and maintainer setup

The maintainer reviews the source and `.github/workflows/release.yml`, then
creates a YubiKey-signed annotated `v<version>` tag. The signing fingerprint is
`F26C7F594DFE84D131703AFC23E5A318AE8D2861`. Require a physical touch for signing;
prefer the YubiKey signing-slot touch policy `on`. The optional `cached-fixed`
policy permits a short reuse window and has different custody implications.
Confirm that an accessible software copy cannot defeat this expectation. A
remote test cannot prove touch configuration. `tag_signature.py` verifies the
freshly fetched annotated object, its direct commit target and the pinned key
in an isolated public-only keyring.

The source signature authorizes source. GitHub/Sigstore provenance binds the
built bytes to the exact tagged workflow, source SHA and original run/attempt.
Runners, compiler/dependencies, GitHub/OIDC/Sigstore and installed verifier tools
remain trusted. This process does not claim reproducible builds or a later
hardware signature over bytes.

The `release` environment, tag rulesets and immutable-release setting are
already configured, according to the parent. The maintainer verifies their
actual settings before enabling publication:

- `release` requires exactly the maintainer's User review, permits only `v*` tag
  deployments and explicitly disables administrator bypass. Self-review is
  permitted for the sole maintainer. No publishing credentials are repository
  secrets. The examples in `.github/release-environment.example.json` and
  `.github/release-branch-policy.json` describe this boundary.
- The creation ruleset permits only the owner's User ID to create `v*`; the
  separate update/deletion ruleset has no bypass actors. Replace placeholder
  owner ID 0 in the checked-in examples. Never move/delete tags or reuse versions.
- Immutable releases are enabled. The approved publisher creates a draft,
  uploads and reads back the complete asset set, publishes and requires GitHub's
  immutable state. An incomplete frozen release requires a new signed version.
- The built-in job `GITHUB_TOKEN` supplies `contents: write` only in the one
  environment-protected `publish` job. There is no stored upload credential,
  upload App, staging environment, held storage or settings-audit approval tuple.

**Accepted limitation:** one approval is guaranteed in the authorized workflow,
not for every possible repository publication. A repository writer, including
someone using the maintainer's SSH push key, can run a branch workflow requesting
`contents: write`. It can publish genuine already-attested bytes early for an
existing tag, or freeze an incomplete immutable release and block that version.
Consumers reject bytes without the signed source/tag and exact tagged-workflow
provenance. This is accepted early-publication/denial-of-service exposure, not an
artifact-tampering guarantee failure. No additional service or App is authorized.
Document the affected release, withhold moving aliases and roll forward with a
new signed version.

## Switches, credentials and acceptance

All switches default off and remain disabled during implementation:
`RELEASE_PUBLICATION_ENABLED`, `RELEASE_GITHUB_ENABLED`,
`RELEASE_HOMEBREW_ENABLED`, `RELEASE_CRATES_ENABLED`, `RELEASE_GHCR_ENABLED`
and the temporary `RELEASE_CRATES_BOOTSTRAP_ENABLED`.
The reviewed `packaging/release/channels.json` initially selects only `github`.
A channel needs both signed-source selection and its switch; additional channels
also need successful immutable GitHub publication. Prereleases are GitHub-only.

Long-lived channel credentials exist only as `release` environment secrets and
are passed only to their final channel step, after verification. Homebrew uses
`RELEASE_HOMEBREW_TOKEN`, limited to contents write in the public
`marcinwadon/homebrew-tap` repository's `main` branch, with no workflows/admin
permission or main-repository write authority. The maintainer confirms the scope
of a fine-grained PAT or already supplied tap-only App installation token; this
pipeline never mints/refreshes an App token. `GHCR_PUBLISH_TOKEN` is a dedicated
GHCR credential, with `GHCR_PUBLISH_USER` as a non-secret environment variable.
Confirm the registry-supported credential kind and least required package scope.
The ordinary `GITHUB_TOKEN` must have package Actions access READ, without
inherited write/admin access.

After setup, the maintainer separately authorizes GHCR's disposable branch-job
negative acceptance, using only its ordinary `GITHUB_TOKEN` with requested
`packages: write`. `post_setup.py` first requires an authenticated 200 read of a
known digest, then an authoritative 403 from the attempted canary write.
Authentication/network errors or a failed read do not prove denial. If this
creates a canary, stop and repair access before enabling GHCR. The test itself
can write if setup is wrong; it was not run during implementation.

`settings_audit.py` is a maintainer-local inspection helper, never called by a
publisher. It checks the signed tag before using the maintainer's own settings
access and records API settings plus explicitly confirmed registry/touch
observations. Its `--payload`, `--observations` and create-only `--output` inputs
produce a local acceptance record. This report is neither publication authority
nor an approval digest. Start from
`packaging/release/example-observations.json`; replace observations with verified
facts, never merely copy them. No CI administration credential is needed.

Before **any** switch is enabled, the maintainer must obtain the first genuine
Hennery attestation from the authorized tagged build, make its public-log
creation/disclosure decision, and preserve its original payload, bundle and
trusted-root fixture as the authentic positive Hennery verifier fixture. Verify
it with the pinned CLI and production policy before enabling GitHub or another
channel. The checked-in upstream `sigstore/sigstore-js` fixture proves real
cryptography/JSON shape and production Hennery rejection; substituted Hennery
fields prove structure only. They do not replace this acceptance obligation.

Maintainer platform acceptance also records first-run and publish-only retry
approval behavior: exactly one `release` approval per publishing attempt, no
channel re-prompts because channel steps are folded into that same job, and a
renewed retry approval with comment `publish-run:<run-id>:attempt:<current-attempt>`.
The original attesting attempt and artifact IDs remain unchanged. Confirm those
observed review-history semantics before enabling publication; no live approval
experiment was performed during implementation.

## crates.io bootstrap, then trusted publishing

Normal operation exchanges OIDC only after verification. Every one of the seven
production crates must trust repository `marcinwadon/hennery`, workflow filename
`release.yml` and environment `release`; repository/workflow alone is insufficient.
A failed exchange never falls back to a stored token.

For the first claim of unregistered crate names, the maintainer:

1. Confirms ownership/availability of all seven names and corresponding source,
   reviews the frozen packages and authorizes this channel explicitly. Creates
   one short-lived crates.io API token scoped to publishing new crates/versions
   for this exact seven-crate closure, without owner/admin/yank privileges.
   Stores it only as `RELEASE_CRATES_BOOTSTRAP_TOKEN` in `release` and records
   the expiry/revocation owner locally. No token is committed or printed.
2. Reviews selection of `crates` in the signed source and separately enables the
   global/GitHub/crates switches and temporary bootstrap switch only after the
   relevant acceptance above. Approves the same protected `publish` job. The
   explicit bootstrap mode uses the existing frozen-byte API uploader; it never
   invokes `cargo publish` or rebuilds packages.
3. The uploader re-verifies immutable GitHub bytes and exact provenance before
   credentials and each write, then publishes in dependency order:
   `hennery-proto`, `hennery-kernel`, `hennery-view`, `hennery-host`,
   `hennery-gateway`, `hennery-sessions`, `hennery`.
   Existing identical crate versions are idempotent; mismatching bytes,
   ambiguous state or missing source refuse. Registry visibility is checked
   before dependent crates proceed.
4. Once names exist, configures trusted publishing for **each** crate with that
   exact repository, `release.yml` and `release` environment. Confirms all seven
   settings and the ordinary branch/environment-less OIDC refusal. A partial
   configuration cannot qualify normal publication.
5. Revokes the bootstrap token at crates.io, confirms revocation, removes the
   environment secret and disables `RELEASE_CRATES_BOOTSTRAP_ENABLED` on both
   success **and abandonment**, including partial or cancelled bootstrap. This
   is maintainer cleanup, not a claim that the workflow can revoke a long-lived
   token. Then qualifies normal OIDC publication; no stale secret fallback.

If bootstrap stops after some crates, keep the dependency order and reconcile
already-existing identical versions under renewed approval within the retry
window. If abandoning, revoke immediately. Restart later with a new explicitly
scoped bootstrap token and, when required, a new signed version. Never replace a
published crate or treat a registry error as absence.

## One tagged run, one protected publisher

The tag-only `release.yml` verifies the tag, builds the native archives,
installer, source, notices/SBOMs and selected channel payloads, and runs Rust,
web, packaging, image, Homebrew and installer acceptance. PR/main CI remains
ordinary CI. Registered channel jobs retain their literal owned names;
selected jobs must succeed, and only unselected owning aggregates may skip.
No reusable jobs, restored release caches or unpinned actions are accepted.

Build/acceptance jobs have read-only contents and no publishing secrets. The
separate `attest` job alone adds OIDC/attestation write. It attests `SHA256SUMS`
and every payload, then writes a run summary showing every asset/hash, bundle
hash, tag/source, channels/targets and original run/attempt/artifact identity.
The maintainer approves that summary. There is no draft before approval; this
is the deliberate trade-off for keeping all authorized draft mutation protected.

The single `publish` job enters `release`, downloads the immutable artifact ID
from the original producing attempt, verifies the checksum closure, tag and
attestations, creates/uploads the draft, reads back/re-verifies uploaded bytes,
publishes and requires immutable state. It then serially runs selected/enabled
Homebrew, crates and GHCR steps. Each re-verifies the immutable public bytes and
provenance before its credential/login/OIDC exchange and at write boundaries.
The job has contents write, Actions/attestations read and OIDC write; other
permissions are absent. Job permissions exist at job start; scripts do not mint
the built-in token only after verification.

Consumers independently verify the signed tag, the attested canonical
`SHA256SUMS` and each consumed payload. The exact certificate identity is
`https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/<exact-tag>`.
Use exact `--cert-identity`, source ref and source/signer digest constraints,
GitHub's OIDC issuer and hosted-runner requirement. Do not combine the mutually
exclusive `--cert-identity` and `--signer-workflow` options. Publishers additionally
compare pinned `gh 2.101.0`'s real JSON field
`verificationResult.signature.certificate.runInvocationURI` exactly with
`https://github.com/marcinwadon/hennery/actions/runs/<id>/attempts/<original-attempt>`.
No `.extensions` fallback or asset-supplied run claim is accepted. The pinned
binary/field contract fails loudly on change.

Use independently trusted installed verification tools/key and reviewed source;
never execute a downloaded installer/verifier to authenticate itself. Native
cargo-binstall remains disabled without a reviewed bridge enforcing this policy.
Authenticate source before evaluating a release flake, and use its verified full
commit SHA. Preserve corresponding source, licence notices and rollback backups.

## Failure and recovery

Within 30 days of the initial run and at most 50 reruns, retry **only `publish`**
with renewed environment approval and the exact retry comment above. Keep the
original artifacts, checksum list, bundles, artifact IDs and attesting attempt
fixed while the publishing attempt changes. Never use “rerun all” to recover
publication or rebuild under the old version. Missing/deleted/expired original
inputs refuse. After the window, document the incomplete old release, withhold
moving aliases and roll forward to a new signed version.

The producer and attester are fixed to attempt 1. If that attempt never produced
a complete accepted artifact/bundle set, there is no publish-only recovery input:
diagnose without publishing and use a new signed version. A later publishing
attempt never becomes a new producing or attesting attempt.

- Before immutable GitHub publication, reconcile the draft's exact asset set.
  Upload only verified missing assets; extra/different bytes refuse. If the
  publish response is lost or ambiguous, first inspect/re-verify the public
  immutable release. A matching complete immutable release is an idempotent
  success on retry; an incomplete/conflicting frozen release needs a new version.
- After Homebrew, read back the exact frozen formula and confirm its atomic CAS
  update. Identical content is a no-op. Same-version differences, downgrade,
  parse failure, concurrent update or ambiguity stop; reconcile before retry.
- After each crate, reconcile registry/index/download digests before continuing.
  A partial graph resumes only with identical bytes; wrong digests/ambiguous
  authentication stop. Apply bootstrap revocation on abandonment even if some
  names/versions already exist. Published crates cannot be replaced.
- After GHCR, verify the index/platform digests and required provenance/SBOM
  referrers. Login follows local verification. Push content by digest with
  preserved digests, refuse conflicts and reconcile after ambiguous upload or
  referrer responses. Reuse verified existing content on retry. Do not move aliases
  until all selected channels/public paths pass.

Public install, Homebrew service/PATH, crate UI/source and image runtime
acceptance remain maintainer-owned after authorized publication. Stop services,
back up complete data/config/keys and check schema compatibility before rollback.
Restore a compatible backup or ship a forward fix rather than overwriting
immutable versions. Retain corresponding source and document remediation.

Generated with Claude AI — please review before distribution.
