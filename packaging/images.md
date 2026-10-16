# Collector images (R4)

No GHCR image has been published by this work. The intended package is
`ghcr.io/marcinwadon/hennery`, for `linux/amd64` and `linux/arm64`.
Publication remains disabled pending independent review, platform qualification
and maintainer approval for this channel. A merged workflow is not approval.

## What runs here

The image runs `hennery collector`, including its embedded web UI. It copies
the release's musl executable unchanged into digest-pinned distroless static,
with CA roots and user/group **65532:65532**. It contains neither a shell nor
Node, adapters, agent CLIs, credentials or repositories.

Pair separate hennery hosts running beside the repositories. Although the
executable also contains host subcommands, this is not a supported agent-host
image. The managed Node/agent runtime requires **glibc >= 2.28** and Linux
kernel >= 4.18 (and the pinned agents may require more). Distroless **static**
has no glibc loader; a static collector running here does not qualify managed
agents here or on Alpine. Installing glibc/Node/agents in a custom derivative
would require separate qualification and changes this image's contents and
supply-chain record.

## Deployment and storage

Use an independently trusted checkout of the [shared verifier](release/verify.py)
and the full release payload directory plus its separate Sigstore bundles. Supply
an independently selected exact tag, source commit, original run ID and attesting
attempt. The verifier freshly authenticates the annotated tag with the pinned
YubiKey fingerprint, checks `SHA256SUMS` and every payload's provenance, then
checks the index or platform digest against authenticated `ghcr-index.json`.
A verifier or key downloaded from an unverified release is not a trust root.
Follow the [trusted bootstrap and release process](../docs/release-process.md).

Verify the index, selected platform manifest and both image/base and binary SPDX
attestations. The exact certificate identity is
`https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/<exact-release-tag>`.
The verifier also constrains the GitHub OIDC issuer, source ref and source/signer
commit digests, and compares the certificate's flattened `runInvocationURI`
exactly with the original run/attesting attempt. It never combines mutually
exclusive `--cert-identity` and `--signer-workflow`. Local manifests must hash to
the authenticated descriptor digest; remote subjects use only immutable OCI
references. Keep bundles outside the payload directory to avoid checksum cycles.
BuildKit's embedded provenance is unsigned build metadata; exact tagged-workflow
Sigstore attestations authenticate the final subjects.

Set your deployment's image to `ghcr.io/marcinwadon/hennery@sha256:<verified-index>`;
the angle-bracket value is a placeholder, not an existing release digest.
Use a release's immutable version tag only when selecting the digest. A base
image security rebuild gets a new immutable revision/version and provenance;
never overwrite an existing version tag. R4 deliberately creates no `latest`
or minor aliases. Any future alias mechanism needs review and may advance only after all
selected channels and both architectures and their attestations are healthy.
Prereleases never advance moving aliases.

Publish the collector port on loopback, for example Docker's
`-p 127.0.0.1:8080:8080`, behind a TLS reverse proxy with the intended
`HENNERY_PUBLIC_URL`. Persist `/var/lib/hennery` on **local storage** (SQLite
locking rules exclude network filesystems). A newly created Docker named
volume inherits the image's UID/GID and mode **0700**. A bind mount retains its
host owner and permissions: prepare it for **65532:65532, 0700** before start.
Never mount an agent home into the collector. Protect backups as credentials.

Change the listening address/port with `HENNERY_LISTEN`, keeping the container
port mapping in sync. The image's healthcheck reads that environment variable;
changing only a command-line `--listen` would break the healthcheck.
Read setup using `docker exec <container> hennery admin setup-url`; avoid
allocating a TTY or obtaining setup credentials through logs. The admin socket
is local to the data volume. Pair hosts using the normal collector setup.

For an upgrade, record the running digest, stop the collector and make a
consistent backup of the **entire** local volume (database/WAL, configuration,
keys and attachments). Start the new verified digest on that volume, then
check health and load the UI before resuming use. Retain the previous digest
and its matching pre-upgrade backup. A schema upgrade is not necessarily
backward compatible: rollback means restoring that backup with its matching
old digest, with the associated loss of writes since the backup. Do not put
an older executable against an upgraded database without explicit support.

## Signed-source release contract

The single tag-triggered `.github/workflows/release.yml` builds each native image
beside its fresh Linux archive, with the target's unchanged musl executable,
reviewed notices and binary SPDX. It uses the Dockerfile's `release` target,
pinned BuildKit/scanner/bases, native amd64/arm64 runners and no restored cache.
It checks labels, executable bytes, legal files, SBOM/provenance and signing
inputs, then exercises the retained digest through a loopback registry. Smoke
checks health, private writable storage, actual UID and the embedded UI.

For selected `ghcr`, `ghcr-candidate.py` assembles before the global checksum
freeze and materializes afterward for unprivileged data acceptance. The historical
filename conveys no separate candidate stage or publication authority. It emits:

- `ghcr-oci-layout.tar`: the exact index/platform/BuildKit blobs;
- `ghcr-index.json`: index digest, both `platforms.amd64`/`platforms.arm64`
  manifest digests, source SHA and version.

`SHA256SUMS` binds both. Schema-2 `release-metadata.json` records the exact archive
executable hashes in `binaries[target]`; OCI executable bytes must match them.
Notices/SPDX cover Rust, vendored OpenSSL/SQLite and embedded frontend, with
corresponding source and licence/advisory clearance. Image scanner SBOMs also
cover the base filesystem; binary SPDX is attested separately because scanning
cannot discover all static/frontend code.

The channel registry reserves the literal job ID/display name `ghcr`. The job
checks the exact frozen source/tag/layout/binaries and round-trips the assembled
index through loopback. A selected missing/skipped/failed acceptance refuses
attestation. PR/main `build.yml` independently tests release-target output using
explicit CI notices/SPDX fixtures; those bytes are never promoted to a release.
Real Docker/native acceptance is separate from offline structural transport tests.

The dedicated `attest` job produces seven OCI bundles without registry credentials
or pushes: index provenance, and provenance/image SPDX/binary SPDX for each of
amd64 and arm64. Every subject belongs to the same original tagged run/attempt.
It also attests the global checksum file and every release payload, then writes
the complete asset/hash run summary for maintainer approval.

### Protected publication and recovery

One job in environment `release` verifies the original run's artifacts, creates
a draft, reads back and re-verifies uploaded bytes, and publishes an immutable
GitHub release. After that, folded channel steps require `ghcr` selection plus
`RELEASE_GHCR_ENABLED`, the global switch and GitHub switch. The common gate and
all seven local OCI attestations verify before dedicated registry authentication.
Only the GHCR step receives `GHCR_PUBLISH_TOKEN` and `GHCR_PUBLISH_USER`; there is
no ordinary-job-token fallback. Credentials stay in a temporary restricted config.

The publisher rechecks exact root/layout/bundles at each boundary, reconciles the
remote version/digest and copies only absent content with `--preserve-digests`.
A matching digest skips image upload. Only an authenticated structured absence
permits a new write; differing bytes and auth/network/ambiguous responses refuse.
Writes target immutable digests, so a version tag appearing during reconciliation
cannot be overwritten. Pinned ORAS attaches the seven preverified bundles by
digest, with fresh checks before each attachment, then all remote subjects verify.
No `latest`, minor aliases or announcement is written by this implementation.

After an ambiguous successful image write or any failed bundle attachment, keep
aliases withheld and obtain renewed approval for a publish-only retry. Reconcile
matching remote content and complete only missing work, reusing original artifacts
and attestations. The publishing attempt changes; the attesting attempt does not.
Never rerun all or rebuild old-version payloads. The recovery window is 30 days
and at most 50 reruns. Missing originals, conflicts or window exhaustion require
a new signed version and documentation of the incomplete old release.

## Maintainer-only setup

1. Approve `ghcr.io/marcinwadon/hennery`, link it to this repository, explicitly
   set intended public visibility and qualify anonymous digest pulls after the
   authorized first publication. Keep needed image/attestation digests for rollback;
   exclude them from automatic deletion. No external storage or cleanup service.
2. Set package Actions access to READ, with inherited write/admin disabled.
   Qualify the dedicated credential's minimum capability and the branch-push
   negative platform test only with explicit maintainer authorization. Store
   `GHCR_PUBLISH_TOKEN` and `GHCR_PUBLISH_USER` only in `release`.
3. The `release` environment, owner-only tag creation/update-delete rules and
   immutable GitHub releases are already configured. Confirm enforcement,
   YubiKey signing touch policy and independent fingerprint bootstrap. The owner
   signs source, not final bytes; runners remain trusted. Repository writers can
   publish genuine attested bytes early or freeze an incomplete immutable release.
   This accepted early-publication/denial-of-service risk rolls forward to a new
   signed version, as documented in the [design amendment](../docs/specs/2026-10-15-distribution-release-design.md#simplified-release-model-operator-decision-2026-10-16).
4. Before any channel switch is enabled, obtain the first genuine Hennery tagged
   attestation with explicit maintainer authorization, retain it as the authentic
   positive fixture, and verify with pinned `gh 2.101.0`, the trusted root and the
   complete Hennery identity/run policy. The bundled authentic upstream fixture
   proves cryptography/JSON shape and Hennery-policy rejection only; substituted
   Hennery responses are structural tests. Builders must not mint log entries.
5. Qualify native Linux/Docker and first-run/retry approval behavior. Review the
   run summary before the one `release` approval; no draft exists before approval.
   Retries require renewed current-attempt approval and original artifact IDs,
   with unchanged producing attempt. Keep every publication switch disabled until
   independent review and this platform acceptance are complete. First alpha is
   GitHub-only; GHCR needs a separately selected stable release.
6. After authorized publication, independently verify index/platform/SBOM/run
   identities, anonymous pulls and non-root health/UI/storage behavior, then record
   the immutable deployment digest before announcing complete channel success.

Generated with Claude AI — please review before distribution.
