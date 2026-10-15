# R1 gate interface v1

Publication is disabled. Implementation and merge do not authorize a channel.
The parent must review the gate and configure the maintainer-only settings in
`docs/release-process.md` before enabling any publication workflow.

R3 and R4 contribute their **final** payloads before `supply.py freeze`. The
inventory binds one complete channel/target set and every byte; adding a crate,
image descriptor, SBOM or target means a new inventory and approval. OCI image
payloads use OCI layout blobs plus a descriptor containing the registry digest;
R4 must verify both remote platform manifests and index by content digest.
The flat contribution names are `ghcr-oci-layout.tar` (packed OCI layout) and
`ghcr-index.json`; crate contributions are `<crate>-<version>.crate` for all
seven production crates. The signed inventory's `binaries[target]` gives the
executable's SHA-256, size, archive name and member path; R4 verifies its image
binary against that digest. The gate recomputes it from the archive. Missing
enabled-channel payloads refuse freeze and
the live CLI gate.
The first alpha enables GitHub only. Later channels require their own approval.

The outer publishing workflow in v1 is `.github/workflows/release-publish.yml`,
manual dispatch from `main`. R3/R4 add their final protected jobs there and call
this script/composite interface; a separate arbitrary publisher workflow is
refused. Reusable job wrappers must not obscure the callee's authority; the
current static policy refuses unreviewed reusable job indirection.

Before any writer job starts, protected read-only `authorize` validates the
held candidate and authenticated review, then publishes trusted outputs
`run_attempt` and `inventory_sha256`. Every writer (including a read-only job
using protected publication secrets) must directly `needs: authorize` and use
`workflow_policy.CREDENTIAL_CONDITION`, optionally followed by the exact channel
switch. A rerun cannot reuse an earlier attempt's successful authorization.
This controls job-level token/secret issuance, including GHCR; it never replaces
the writer's own two gates. No conditional or failure-ignoring gate is accepted.

Inside each publishing or signing job:

1. Use `environment: release`, run from trusted `main`, and download the exact
   retained candidate. No build step or package install may mutate its bytes.
2. Read the manual dispatch inputs: `inventory_sha256` (64 lowercase hex),
   `source_sha` (40 lowercase hex), `tag`, `channels` (sorted JSON array),
   `targets` (sorted JSON array), `candidate` (JSON object with integer `run_id`
   and `run_attempt`). The publishing IDs come from the platform, never input.
3. Run the local composite action `.github/actions/release-gate` with
   `candidate`, `inventory-sha256`, `channel`, `phase: preflight` and a fresh
   `receipt` pathname outside the candidate directory. Supply a read-only
   platform token as `GH_TOKEN`. It performs live GETs, not artifact evidence.
   The release shell supplies the pinned tools. `RELEASE_AUDIT_BUCKET` and a
   storage-only AWS principal must permit conditional held audit writes; an
   audit failure stops before signing/uploading.
4. Only after success obtain channel credentials/OIDC. Run the same action with
   `phase: boundary` immediately before each signing/upload operation, using a
   new receipt path. The action must run **in this job**; a `needs:` dependency
   or a reusable workflow's boolean output cannot authorize another job.
5. Reconcile existing remote bytes using channel-specific authenticated digest
   reads or download/hash. Only an authoritative 404 means missing. An ambiguous
   response or a mismatch stops the run; never overwrite. Upload only missing
   payloads, then fetch/hash them. Retry from held bytes with renewed approval.
6. Retain both gate receipts and channel reconciliation records under immutable
   run/attempt keys in the audit store. Keep candidate legal holds until every
   enabled channel and public-path acceptance has completed. No automatic code
   releases holds or deletes old candidates.

The one public adapter is `packaging/release-gate CHANNEL --candidate DIR
--inventory-sha256 HEX --phase preflight --receipt FILE`, run inside
`nix develop .#release -c`. The composite delegates to this same executable.
`phase` is `preflight` or `boundary`; channel is `github`, `crates`, `ghcr` or
`homebrew`. Exit 0 means the live validation **and immutable audit write** passed;
stdout is the approval challenge. The new local receipt records the canonical
binding, authenticated approver, decision, phase and channel. Every invocation
needs a unique receipt basename, including repeated per-crate/image boundaries.
Missing/malformed evidence, network/audit failure or refusal exits nonzero and
must stop the job. There is no success/approval token to cache. The adapter never
accepts offline evidence. Unit tests call the pure validator with fixtures.

Inputs supplied by the job are the full retained candidate path, root inventory
digest, channel, phase and receipt path. Platform variables
`GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_EVENT_NAME`, `GITHUB_EVENT_PATH`,
`GITHUB_RUN_ID` and `GITHUB_RUN_ATTEMPT` must retain their platform values. The
event file supplies the exact manual dispatch fields above. `GH_TOKEN` can only
read live policy/check/review records; `RELEASE_AUDIT_BUCKET` and the storage-only
AWS principal permit held receipt writes. Artifact/env approval IDs, source
claims and publisher IDs are never authority. Missing protected settings fail
closed; a policy reader may need additional read-only administration access.

Materialize once per job using the exact-version retention fetch in
`release-publish.yml`: read `candidates/<root-digest>/retention-receipt.json`
at the explicitly dispatched S3 version, then run `retention.py fetch`. The
adapter validates the complete, unchanged flat root directory each time;
channel-only Actions artifacts and an extracted OCI working tree are not that
directory. Keep extraction/work products and receipts outside it.

### Migration of the parallel R3/R4 integration points

These branches were inspected with `git show origin/plan/dist-r3` and
`git show origin/plan/dist-r4` before fixing this interface. They stay disabled
until the parent reviews their final integration into the common orchestrator.

| Consumer | Required adaptation |
| --- | --- |
| R3 `publish-crates.yml` and `publish-crates.mjs` | Replace `materialize`/`verify --channel crates-io` calls with the held fetch above and `packaging/release-gate crates` using the full retained root, root digest, explicit phase and fresh receipt. Carry `crates-inventory.json` inside the global frozen inventory; the R3 verifier checks its own approved channel digest and crate/source/version contracts on every boundary. The root digest is never the crates-only digest. |
| R4 `ghcr-gate.sh` and `ghcr-publish.yml` | Replace `packaging/r1-ghcr-gate upload\|sign` with `packaging/release-gate ghcr`: `preflight` before credentials and `boundary` before every upload/sign. `upload` and `sign` are operations, not adapter phases. Materialize the full held root; extract the inventory-bound OCI tar outside it and independently verify the platform/index/binary digests before each operation. |

There is no `packaging/r1-ghcr-gate` alias or alternate approval-ID protocol.
Map the old `R1_*`/`INVENTORY_SHA256` bindings to the trusted common dispatch;
the gate authenticates it rather than trusting these duplicate environment
claims. R3/R4 final jobs use environment `release`, direct `needs: authorize`,
the exact current inventory/attempt condition above and channel switches
`RELEASE_CRATES_ENABLED`/`RELEASE_GHCR_ENABLED`. Existing separate reusable
publish wrappers are integration sketches: move the final jobs into the common
manual orchestrator, with the same gates inside every protected writer/signing
job. The channel's own remote reconciliation and image/crate checks remain
mandatory. Any proposed reusable-job expansion needs explicit authority-graph
review before the policy accepts it.

The maintainer approves the canonical binding tuple printed in the run summary.
The environment review comment must be exactly `approve-release-v1:<hash>`, where
`hash` is SHA-256 of the canonical tuple (sorted compact ASCII JSON plus newline).
The tuple contains repository, source SHA/tag, inventory digest, sorted channels
and targets, candidate run/attempt and publishing run/attempt. Reviewer identity
and decision come from GitHub's review history. Previous-attempt comments fail.
A rejection supersedes an approval. Do not remove the comment requirement.

The environment has explicit user reviewers and administrator bypass disabled;
deployment policies permit only `main`. Every `v*` tag is protected against
creation, updates and deletion with no bypass. GitHub's restricted creation
mechanism needs a parent ruling before it can be enabled for a dedicated path;
the implementation defaults to frozen tags and refuses incomplete policy.
Only completed successful `push`/manual runs for the exact SHA from `ci.yml`,
`build.yml`, `nix.yml` and `release-tests.yml` qualify. Skipped jobs refuse.

Candidate retention uses S3 Object Lock COMPLIANCE plus legal hold ON, exact
object versions and conditional creation. Actions artifacts are a convenience
copy, never the durable authority. `retention.py stage` writes held objects;
`fetch` verifies lock metadata, versions, complete inventory and every digest.
Provision the bucket and separate read/staging credentials before dispatch.
No production storage is provisioned by this repository's tests.

Generated with Claude AI — please review before distribution.
