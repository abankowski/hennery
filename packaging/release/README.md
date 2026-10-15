# R1 gate contract

The public adapter is `packaging/release-gate <channel>`; every writer/signing job
uses the protected environment `release`. Publication stays disabled until the
maintainer completes the platform setup and approves each channel. The static
workflow checker is defense in depth. A repository writer can rewrite a workflow
and request an ordinary write `GITHUB_TOKEN` or OIDC token; lint cannot prevent
GitHub issuing those tokens.

Release authority is the hardware-backed maintainer signature over the exact
frozen inventory, required by every consumer and publisher alongside Sigstore.
An owner SSH key can create an unsigned tag and run altered workflow code;
an exact-tag certificate alone cannot authorize release bytes. Platform defenses
still require maintainer review and deployment
restricted to protected `v*` tags; publishing credentials only in `release`;
crates.io trusted publishing bound to `release` and `release-publish.yml`; GHCR
Actions access READ with a separate protected credential; immutable GitHub
releases; owner-only tag creation and no bypass for tag updates/deletion. Every
consumer rejects signatures from branch workflows. A writer can disrupt builds
or ordinary repository content; that must not yield an accepted release identity.

## Inputs and outputs

Run in the locked release shell:

```sh
nix develop .#release -c packaging/release-gate github --candidate candidate \
  --inventory-sha256 "$INVENTORY" --phase preflight --receipt preflight-1.json
```

Channels are `github`, `crates`, `ghcr`, `homebrew`. Phase is `preflight` before
credentials and `boundary` immediately before each signing/upload/publication
operation. A fresh receipt basename outside the candidate is mandatory each
time, including repeated crate/image operations. Exit 0 means live validation
and a held audit write succeeded; stdout is the exact approval challenge. The
local receipt includes the binding, authenticated approver, phase and channel.
Every nonzero exit stops the job. A previous receipt is never cached authority.

The complete retained flat root and its global inventory digest are required;
channel-only Actions artifacts are insufficient. Materialize once per job with
the exact-version retention fetch in `release-publish.yml`. Extract working OCI
layouts and create receipts outside that immutable directory.

The outer workflow is manual `release-publish.yml`, dispatched at the **same
signed release tag**, never a branch. Platform `GITHUB_REF` must be
`refs/tags/<tag>` and `GITHUB_SHA` the exact qualified source commit. The event's
inputs are `inventory_sha256`, `source_sha`, `tag`, sorted JSON `channels` and
`targets`, JSON `candidate` containing integer `run_id`/`run_attempt`, the held
`retention_receipt_version`, canonical `settings_audit` JSON and its SHA-256
`settings_audit_sha256`, plus the armored public detached `maintainer_signature`
over the exact inventory bytes. Publishing IDs come from the platform. Do not fabricate
or replace platform variables. `GH_TOKEN` needs ordinary contents/Actions read;
publishers never inspect private ruleset bypass settings or hold administration
credentials. `RELEASE_AUDIT_BUCKET` and a storage-only AWS principal permit
conditional held audit writes.

The approval tuple includes all these candidate bindings, the settings audit
digest and publishing run/attempt. The maintainer's authenticated environment
review comment must equal `approve-release-v1:<canonical-tuple-sha256>`. The audit
must postdate candidate completion, be at most 24 hours old, identify this exact
inventory/run/attempt/channel/target set, and match the approved digest. It is a
maintainer-local settings inspection ratified by that review, not an artifact's
claim to be an authorized actor. Every rejection requires a fresh dispatch.

`settings_audit.py` runs locally with the maintainer's own authenticated `gh`
account and explicitly confirmed UI observations where no settings API exists.
It inspects the protected environment, both tag rulesets, repository/environment
secret names and immutable-release setting. It checks GHCR Actions READ plus the
post-setup negative push result, and each crate's exact workflow/environment.
It records the maintainer's explicit hardware-touch policy/fingerprint confirmation;
remote code cannot verify physical touch configuration.
Publishers verify the ratified report, current exact-SHA checks, current review
history and a freshly fetched tag's actual pinned-key signature at every gate.

## Channel integration

R3 and R4 integration points were read from `origin/plan/dist-r3` and
`origin/plan/dist-r4`. Both move their final jobs into the common manual tagged
orchestrator, use `release`, direct `needs: authorize`, the exact current
inventory/attempt condition in `workflow_policy.CREDENTIAL_CONDITION`, and
`RELEASE_CRATES_ENABLED`/`RELEASE_GHCR_ENABLED`. Keep in-job preflight and boundary
calls as well as the protected read-only authorization job. These local ordering
checks supplement the platform boundary; a branch-editable boolean is not it.

| Consumer | Adapter and retained payload contract |
| --- | --- |
| R3 | Replace `materialize`/`verify --channel crates-io` with exact held fetch and `packaging/release-gate crates`. Use the global digest, complete root, explicit phase and unique receipt. Freeze all seven `<crate>-<version>.crate` files and `crates-inventory.json`; independently recheck its channel digest, version, corresponding source and dependency order. Trusted publishing must require **both** `release` and `release-publish.yml`. |
| R4 | Replace `packaging/r1-ghcr-gate upload/sign` with `packaging/release-gate ghcr`, `preflight` before dedicated credentials and `boundary` before each upload/sign. Freeze `ghcr-oci-layout.tar`, `ghcr-index.json` and SBOM/acceptance material. Extract outside the root; recheck both platform/index digests and executable hashes from signed `inventory.binaries[target]`. Ordinary `GITHUB_TOKEN` is READ only at the package; registry authentication uses a separate `release` environment secret. |

There is no alternate `r1-ghcr-gate`, approval-ID protocol or branch signer.
Dispatch input `maintainer_signature` carries the detached armored OpenPGP signature over the exact frozen `release-inventory.json`. Every channel gate verifies it before credentials and at each write boundary. Publishers retain and upload `release-inventory.json.asc` as a sidecar outside the frozen candidate. The pinned hardware-backed maintainer signature is authority; tag checks and Sigstore remain additional defenses. Every file/OCI verifier requires both. `ghcr-index.json` must contain a `digest` matching the requested immutable image subject; its bytes are covered by the global signed inventory.

All file, installer and image verification pins the certificate identity to
`https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<exact-version-tag>`
with the GitHub OIDC issuer and exact source ref. `verify.py` supplies the shared
file/OCI verifier. R4 must use it for each platform/index provenance and relevant
SPDX predicate. The hardened installer applies the same identity before archive
extraction. Checksums alone do not authenticate an author.

Native cargo-binstall currently supports minisign rather than this Sigstore
identity. It must not be advertised as an authenticated path or enabled without
a reviewed bridge. Freeze and every gate inspect the final CLI `.crate` metadata:
R3 must disable all native binstall strategies and retain the exact identity for
the external verified path. The required metadata for each concrete version is:

```toml
[package.metadata.binstall]
disabled-strategies = ["crate-meta-data", "quick-install", "compile"]

[package.metadata.hennery-release]
verification = "external-openpgp-sigstore"
maintainer-fingerprint = "F26C7F594DFE84D131703AFC23E5A318AE8D2861"
signer-identity = "https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/v0.1.0"
```

Use that crate's actual version tag. The `hennery-release` namespace describes
the common external verifier; native binstall does not consume it. The parent's
capability ruling and R3's metadata integration remain prerequisites to a
supported native bridge. No unsupported
Sigstore metadata key is presented as native binstall enforcement.

Only fully verified missing remote artifacts may upload. An authoritative
absence differs from failed authentication/network or mismatched bytes; ambiguous
results stop. GitHub uploads all assets to a draft, verifies them, then publishes
and requires immutability. Published assets are never changed. A retry reuses a
verified existing bundle and held bytes with a fresh approval; missing/expired
candidates or conflicting remote bytes need a new candidate/version. Hold
candidate and audit objects until every approved channel/public path completes.
Actions artifacts are convenience copies, never the retention authority.

Candidate acceptance uses the signed inventory's selected channels. The stable
GitHub job names `crates` and `ghcr` are registered in
`gate.CANDIDATE_CHANNEL_JOBS`: each selected channel requires exactly one
completed, successful job. Only an unselected registered job may be absent or
completed with conclusion `skipped`; failures, pending jobs, duplicate registered
names and skipped ordinary jobs refuse. Required CI/build/Nix/release-test
workflows retain the strict rule that every job succeeds.

R4 integration hook: name the aggregate candidate acceptance job `ghcr` exactly,
run it whenever `ghcr` is selected, and make all platform acceptance work its
dependencies. A matrix should feed that aggregate job. The gate already rejects
selected GHCR if this job is missing, skipped or failed; an unselected GHCR job
can be skipped without blocking a GitHub-only release. Keep the full candidate
assembly and held inventory bound to the same selected channel set.

Crates gate receipts have a fresh UUID in their basename for every invocation,
including repeated preflights and publication retries. R1 audit retention keys
by basename within the publishing run/attempt and keeps conditional creation,
versioning, compliance retention and legal hold intact.

Generated with Claude AI — please review before distribution.
