# R1 gate interface v1

Publication is disabled. Implementation and merge do not authorize a channel.
The parent must review the gate and configure the maintainer-only settings in
`docs/release-process.md` before enabling any publication workflow.

R3 and R4 contribute their **final** payloads before `supply.py freeze`. The
inventory binds one complete channel/target set and every byte; adding a crate,
image descriptor, SBOM or target means a new inventory and approval. OCI image
payloads use OCI layout blobs plus a descriptor containing the registry digest;
R4 must verify both remote platform manifests and index by content digest.
The first alpha enables GitHub only. Later channels require their own approval.

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

The executable CLI is `python3 packaging/release/gate.py --candidate DIR
--inventory-sha256 HEX --channel CHANNEL --phase preflight --receipt FILE`.
`phase` is `preflight` or `boundary`; channel is `github`, `crates`, `ghcr` or
`homebrew`. Exit 0 means this validation passed. Any missing/malformed evidence,
network failure or refusal exits nonzero and must stop the job. The CLI never
accepts offline evidence. Unit tests call the pure validator with fixtures.

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
