# Collector images (R4)

No GHCR image has been published by this work. The intended package is
`ghcr.io/marcinwadon/hennery`, for `linux/amd64` and `linux/arm64`.
R1 is merged at `191aa71b`. Publication remains disabled pending independent
review, platform qualification and maintainer approval for this channel. A merged workflow is not approval.

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

Use an independently trusted checkout of R1's [shared verifier](release/verify.py),
with the complete frozen candidate directory, the external
`release-inventory.json.asc` and exact release tag. It requires the pinned
maintainer's hardware-backed signature over the global inventory before checking
Sigstore. The inventory hashes `ghcr-index.json`, which lists the exact index
and both platform digests. An exact-tag Sigstore certificate alone is insufficient.
The verifier rejects missing/wrong inventory signatures and unlisted subjects.
Follow the [trusted bootstrap and release process](../docs/release-process.md);
a verifier or public key downloaded from an unverified release is not a trust root.

Verify the index **and** selected platform manifest and its image/base and binary
SPDX attestations. The exact certificate identity is
`https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<exact-release-tag>`,
with GitHub's OIDC issuer and matching source ref. R1's verifier supports the
SLSA provenance and SPDX predicates and requires `--inventory-directory` and
`--approval-signature` for every OCI subject. Keep the `.asc` and Sigstore
bundles outside the immutable candidate directory. BuildKit's embedded provenance
is unsigned build metadata; the protected signing jobs add authenticated provenance.
Preserve the public approval and verification bundles with the release record.

Set your deployment's image to `ghcr.io/marcinwadon/hennery@sha256:<verified-index>`;
the angle-bracket value is a placeholder, not an existing release digest.
Use a release's immutable version tag only when selecting the digest. A base
image security rebuild gets a new immutable revision/version and provenance;
never overwrite an existing version tag. R4 deliberately creates no `latest`
or minor aliases. R1 may advance those only for stable releases, after all
enabled channels and both architectures and their attestations are healthy.
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

## Candidate and approval contract

R1's actual `release-candidate.yml` builds each native image beside its fresh
Linux archive. It supplies that target's musl executable, reviewed notices and
binary SPDX from R1's release materials. The builder uses the `release` target,
pinned BuildKit/scanner/bases, native amd64/arm64 runners and no restored cache.
It names local exports so BuildKit supplies manifest-bound attestation subjects.
It verifies executable bytes, labels, legal files and SBOM/provenance, extracts
signing inputs, then tests the retained digest through a loopback registry.
Smoke covers health, private writable storage, actual process UID and embedded UI.

When `ghcr` is in the candidate channel set, R1 assembles and round-trips the
index before freezing the complete flat root. `ghcr-candidate.py` produces:

- `ghcr-oci-layout.tar`, containing the exact platform/index/BuildKit attestation
  blobs; no reconstruction is permitted after approval;
- `ghcr-index.json`, a schema-1 descriptor containing the index `digest`,
  `platforms.amd64` and `platforms.arm64` manifest digests, source SHA and version.

The global inventory hashes both files and records exact executable hashes in
`binaries[target]`. The image payload must match those approved archive binaries.
Notices/SPDX cover Rust, vendored OpenSSL/SQLite and embedded frontend; R1's
corresponding-source/licence/advisory review remains mandatory. Image scanner
SBOMs additionally cover the base filesystem. Binary SPDX is embedded and signed
separately because filesystem scanning cannot discover all static/frontend code.

PR/main `build.yml` also qualifies real release-target OCI output using explicitly
marked CI notices/SPDX fixtures, signing-input extraction and loopback acceptance.
Those fixture images are never promoted to release candidates. Real Docker
acceptance is CI proof; transport/process doubles are offline contract tests.

### Publication boundary

The only orchestrator is R1's manual, exact signed-tag `release-publish.yml`.
There is no alternate reusable R4 publisher or provisional approval-ID adapter.
The shared interface is `packaging/release-gate ghcr`, in **`release`**, with
the complete held candidate, approved global inventory SHA-256, explicit
`preflight`/`boundary` phase and a new receipt outside the candidate. R1 checks
live environment review, signed inventory/tag, settings audit, exact-SHA checks,
retention and candidate/publishing run attempts. Its audit is maintainer-local;
publishers receive no administration credential. See the [R1 contract](release/README.md).

`ghcr` and `ghcr-attest` depend directly on protected read-only `authorize` and
match its inventory, current attempt and selected `ghcr` channel. The gate
checks that dispatch selection against the signed inventory. A GitHub-only
dispatch skips both jobs even when GHCR is globally enabled. Every upload and
provenance/SPDX signing operation gets fresh
boundary validation. Receipt names include the matrix subject, avoiding held
storage collisions. `ghcr-gate.sh` calls the real gate, then reuses R1's pinned-key
inventory verifier and checks both OCI platform/index digests and executable
identity. OCI is materialized outside the held root; changed working bytes or
metadata refuse. The publisher accepts only that verified layout path.

The `ghcr-attest` matrix generates bundles with registry publication disabled,
using R1's exact candidate Sigstore bundle before signing. It verifies each new
bundle against the actual local manifest bytes and the exact maintainer-approved
digest before retaining it. `ghcr` waits for that entire matrix, downloads R1's
candidate signature artifact and all seven OCI bundles, and verifies every
candidate payload and OCI subject before registry credentials. The publisher
repeats this verification after its final live gate and before upload.

Only `ghcr` authenticates with **`GHCR_PUBLISH_TOKEN`**, a secret
held only in `release`, and `GHCR_PUBLISH_USER`, its environment variable.
The ordinary job token requests `packages: read`; the package's Actions access
must independently be **READ**, with inherited write/admin access disabled.
GitHub's attestation API uses the ordinary token with protected OIDC/attestation
permissions; the generator has no registry credential. After image upload,
the pinned ORAS tool attaches the already verified bundles as
[Sigstore OCI referrers](https://github.com/sigstore/cosign/blob/main/specs/BUNDLE_SPEC.md),
with fresh gate and full verification before each attachment. Credential
kind/capability must be qualified by the maintainer; no App/fine-grained registry
support is assumed. No fallback to `GITHUB_TOKEN` is present.

After upload, each remote platform/index and all seven provenance/SPDX bundles
are checked again with R1's shared hardware-inventory-plus-Sigstore verifier. Bundles and
gate receipts are held under that publishing attempt. The final read-only
completion check refuses skipped/failed jobs, stale inventory/attempts and an
invalid digest. Rerunning failed jobs requires renewed whole-attempt approval.
Both `RELEASE_PUBLICATION_ENABLED` and `RELEASE_GHCR_ENABLED` remain disabled
until maintainer setup and review. First alpha releases are GitHub only; GHCR
requires a separately approved stable channel set.

Recovery reads and hashes the remote version and exact digest. Equal bytes may
skip upload; only authenticated HTTP 404 plus structured absence permits copying
retained bytes. Reconciliation repeats after the final gate. Auth/network/
ambiguous errors or a differing version stop. Uploads address only the immutable
digest: this publisher neither creates nor replaces version tags, so a version
appearing after the final check cannot be overwritten. Use the approved digest
from the inventory, not a version-tag assumption. Lost responses require
reconciliation on a newly approved attempt. No mutable aliases,
rebuild, changed approval signature or replacement release bytes are permitted.

## Maintainer-only setup and release steps

1. Approve the exact **namespace/package** `ghcr.io/marcinwadon/hennery` and
   its creation under the personal account, and link it to this repository.
   The source OCI label is present; verify the actual package linkage.
2. Set and verify **visibility** explicitly. Confirm anonymous pull of the
   intended public package only after the approved initial publication;
   initial GHCR package visibility must not be assumed to be public.
3. Choose **retention**: keep version/index/platform/attestation digests and
   verification bundles needed for rollback, exclude them from automatic
   deletion, and retain candidates durably until all approved channels finish.
   Decide the base-image security rebuild/purge policy. No cleanup job is added.
4. Set package **Manage Actions access to READ**, disabling inherited write/admin.
   Qualify R1's explicitly authorized negative branch push and dedicated
   credential capability before enablement; offline tests do not prove platform
   enforcement. Store `GHCR_PUBLISH_TOKEN` only in `release` and configure
   `GHCR_PUBLISH_USER` there. Signing needs protected `id-token: write` and
   `attestations: write`, while the ordinary package token remains READ.
5. Complete R1's protected **release** environment, immutable signed-tag rules,
   hardware-touch signing setup, independently confirmed public-key bootstrap,
   settings audit and held-storage policy. Approve the exact canonical global
   inventory with the YubiKey and provide the public detached signature through
   the dispatch. Exercise actual missing/rejected/stale approvals, wrong/missing
   signatures, inventory/source/tag/target changes and package permission refusals.
6. Independently review this integration and native Linux acceptance, then
   explicitly qualify `RELEASE_PUBLICATION_ENABLED` and `RELEASE_GHCR_ENABLED`
   for an approved stable channel set. Merging/enabling/tagging is not publication
   consent. Renew audit/attempt approval for retries and never replace held bytes.
7. After authorized upload and keyless attestations, independently pull by
   index digest, verify each platform and SBOM/provenance identity, check the
   non-root health/UI/volume behavior, record the index digest in release notes,
   and only then consider stable aliases/announcements through R1.

Generated with Claude AI — please review before distribution.
