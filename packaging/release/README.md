# Signed-source release contract

The authorized publisher is `.github/workflows/release.yml`, triggered only by a
new annotated `v*` tag signed with the pinned maintainer key. The operator's
2026-10-16 simplification signs source; exact tagged-workflow attestations bind
bytes. Read [the maintainer runbook](../../docs/release-process.md) and the
[design amendment](../../docs/specs/2026-10-15-distribution-release-design.md#simplified-release-model-operator-decision-2026-10-16)
for trust assumptions, setup and accepted early-publication/denial-of-service
risk. No held storage, upload App, detached inventory signature or separate
candidate/qualification workflow remains.

## Assets and verification

The flat payload directory contains canonical `SHA256SUMS` and every listed
regular file, including `release-metadata.json`. Metadata binds repository,
source SHA, tag/object, selected channels/targets and original attesting
run/attempt. Channel manifests and frozen `.crate`/OCI inputs are payloads,
not independent authorization roots. No extra, missing, duplicate, case-ambiguous
or linked file is accepted. Bundles live in a separate signatures directory;
checksum/self/bundle cycles are forbidden.

`contract.py` checks checksums, exact tag signature and the attestation for the
checksum list and every payload. CLI identity is the exact
`https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/<tag>`,
with source ref/digest, signer digest, GitHub Actions issuer, expected predicate
and hosted-runner constraints. Use `--cert-identity`; do not add the mutually
exclusive `--signer-workflow`. Pinned `gh 2.101.0` emits
`verificationResult.signature.certificate.runInvocationURI`, which publication
compares exactly to the original producing run/attempt URI. A CLI pin/schema
change must fail the authentic offline contract test, never silently try an
alternate JSON path.

The authentic upstream fixture proves crypto and JSON shape, and must fail
production Hennery identity. Hennery-field substitutions are structural tests.
The latest operator decision (2026-10-16) enables all channels for the first
release without waiting for a positive fixture. Preserve and verify that first
genuine Hennery tagged-workflow attestation as follow-up evidence. Creating its
public-log entry is the maintainer's disclosure decision; tests do not mint an
attestation. There is no runtime fixture-existence gate. Stable-tag and reviewed
channel-selection constraints still apply.

Binary archives contain exactly one target directory and regular files
`hennery`, `CHANGELOG.md`, `LICENSE`, `README.md` and `THIRD-PARTY-NOTICES.txt`.
PR qualification archives omit the separately generated dependency notices.
Both archive checks enforce this closure; the installer and Homebrew proof
fixtures carry the same documentation. Homebrew installs the changelog in its
documentation directory. Crate tarballs have their own package-local inventories.

## Workflow and credentials

`release-rehearsal.yml` runs the actual native release graph on matching pull
requests and every main push, through assembly/freeze, native installer tests
and local verification. Generate it from `release.yml` with
`nix develop .#release -c python3 packaging/release/rehearsal.py generate`.
Workflow policy and refusal tests compare every generated job/step to its source,
including runners, dependencies and upload/download inputs. Rehearsal has only
contents read permission, no environment, secrets, OIDC, attest or publish job.
It uses the workspace version as a synthetic tag context without creating a tag;
its zero tag-object placeholder cannot pass production signature verification.
The production freeze and rehearsal share payload construction; rehearsal's
clearly marked local verification checks checksum closure, supply requirements
and binary inventories, without claiming signed source or provenance.

Native uploads retain per-target artifact directories. Pinned cargo-dist leaves
an expanded `hennery-$TARGET/` beside its archive. Assembly uses an explicit file
manifest and checks that staging tree against the archive before excluding it.
The same check runs before upload because the pinned upload action follows links.
Unknown files/directories, links and differing shared inputs refuse. Flattening
candidate downloads would lose the conflicting-input check and is forbidden.

Rehearsal cannot prove OIDC issuance, GitHub attestation registration, the genuine
Hennery certificate identity, protected-environment approvals, token permissions,
remote release uploads or immutable publication. Offline tests cover the exact
attestation subject set, payload/signatures transport layout, publication HTTP
routing and redirect credential handling, plus publication/retry reconciliation.
Retain and independently verify the first genuine Hennery attestation after the
maintainer-authorized run. Large-payload publisher duration remains a hosted-run
observation; native archive and installer success alone cannot establish it.

Build and native acceptance jobs have read-only contents and no credentials.
Only `attest` has OIDC/attestation write; it emits every asset/digest and original
run/artifact identity in the approval summary. The maintainer reviews the run
summary before approval. No draft exists yet.

One `publish` job references `release`, with contents write, Actions/attestations
read and OIDC write. Under one approval it verifies original run artifacts,
creates/uploads/reads back the draft, publishes immutable and then runs folded
Homebrew, crates and GHCR steps. Each channel independently verifies public bytes
and provenance before receiving its step-scoped credential and at write boundaries.
There are no downstream environment jobs requiring another approval.

`release_run.py` supplies `configure`, `freeze`, `check`, `summary`, `verify`,
`publish` and `channel` entry points. The workflow invokes them in the pinned
release shell. `run_policy.py` fetches read-only original run/jobs/artifact and
review evidence; publishers do not read private platform settings or receive an
administration credential. `settings_audit.py` separately records maintainer-local
setup acceptance, using `--payload`, `--observations` and a create-only
`--output`. Its report is not approval authority. The example observations must
be replaced by personally verified facts.

Channel selection is the reviewed `channels.json`, initially `["github"]`.
The explicit channel-to-owning-job registry retains literal names `crates`,
`ghcr` and `homebrew`, forbids collisions/dynamic names, and requires selected
acceptance to succeed. Unselected owners alone may skip; native/no-op jobs still
succeed. The policy checks the complete dependency graph, including descendants
of optional jobs, and rejects reusable jobs. Secrets never appear at job scope.

All `RELEASE_*_ENABLED` switches default off; the operator enables them. Secrets
remaining in `release` are `RELEASE_HOMEBREW_TOKEN`, `GHCR_PUBLISH_TOKEN` and,
only during explicit crates bootstrap, `RELEASE_CRATES_BOOTSTRAP_TOKEN`.
`GHCR_PUBLISH_USER` is a non-secret variable. GitHub uses the built-in job token,
not a stored token. GHCR Actions access for the ordinary token is READ;
`post_setup.py` requires an authorized negative push acceptance with a successful
known-digest read and an authoritative 403 write denial. Unit tests mock it;
implementation never attempts that live write.

Bootstrap uploads the seven frozen crates in dependency order with one temporary
publish-only token in `release`. Then configure every crate's trusted publisher
for `marcinwadon/hennery`, `release.yml`, environment `release`; revoke the token
at crates.io, confirm revocation, remove its secret and disable bootstrap on
success **or abandonment**. Normal OIDC has no bootstrap fallback. The runbook
describes scope, partial-graph reconciliation and maintainer cleanup explicitly.

## Retry and refusal

Only verified missing remote bytes may upload. Existing exact bytes are
idempotent; mismatches and ambiguous authentication/network state refuse.
GitHub requires a complete immutable release before channel writes. Homebrew
updates the frozen formula atomically with CAS/readback and rejects downgrade
or same-version changes. Crates and GHCR preserve frozen digest identity and
never replace differing registry content.

Within 30 days/50 reruns, rerun only `publish` with renewed approval; original
artifacts, artifact IDs and attesting attempt stay fixed. The publishing attempt
changes, and its review comment must be
`publish-run:<run-id>:attempt:<current-publishing-attempt>`. Never “rerun all”
to rebuild old release bytes. Maintainer platform acceptance must confirm first
approval and retry behavior. Missing originals, expired recovery or an incomplete
immutable old release require a new signed version, an explicit incomplete-old
release note and withheld moving aliases. Reconcile after an ambiguous GitHub
publish response or each partial channel outcome before proceeding.

Native cargo-binstall stays disabled without an authenticated bridge. Consumers
use independently trusted tools/public key and verified source before running
installer/verifier code or evaluating a flake. Preserve corresponding source,
licence notices, backups and the existing native/runtime/public-path acceptance.

Generated with Claude AI — please review before distribution.
