# R1 — release foundation implementation plan

- **Date:** 2026-10-15; filename assigned by the distribution brief.
- **Base:** `14a754b6d9649502fcc30aae2d1f6c1c7d9def04` (approved distribution design), on main `6f686151`.
- **Branch:** `plan/dist-r1`.
- **Design:** [distribution and releases](../specs/2026-10-15-distribution-release-design.md), approved/re-confirmed by the parent in the binding brief.
- **Process:** built first, tests observed RED, exact implementation embedded below, fresh replay and guard-removal probes. No self-review approval is claimed.

## Execution status

Built on the named worktree and pushed as `87f25199`, `15ae79dc`, `faa012aa`, `23319b8b`, `6ce8a889` and `cc94e36d`; stopped for the parent's independent security/whole-branch review. Publication, external environment/storage setup and tag creation were not performed. The configured safe tag policy freezes creation/update/deletion with no bypass; an authorized creation path needs the parent ruling below. These are implementation/review artifacts, not authorization to publish.

- Rust: fmt, both Clippy modes, full workspace tests and both generators passed. The workspace log records **2147 passed, 0 failed, 0 ignored** across 142 result lines. The CLI identity regression was seen RED (1 failed), then GREEN (1 passed).
- Some Nix/Cargo/tool setup used default user caches, including late gate checks; the full Rust/material checks and final replay use scratch HOME/CARGO_HOME/XDG paths. This isolation lapse is a process deviation. No real Hennery data/service directories were used. Parent follow-up: enforce scratch cache homes at fleet bootstrap.
- Initial Clippy attempts failed on copied registry `.cargo-ok` extraction markers; both retries passed without weakening code/checks. An exploratory identity-name filter ran 0 tests and is not evidence; the CLI regression above is the evidence.
- Release tests: **48 tests passed**, including independent negative subcases, workflow authority/order, archive contents/binary digests, approval identity/attempts, held storage, reconciliation, checksum cycles and signature verification refusal.
- Guard-removal probes: **49 removed barriers made tests fail** (26 core, 9 additional, 3 final, 1 all-workflow selection, 1 immutable-candidate receipt boundary, 9 credential-authority/channel-adapter barriers). The final-source rerun passed all six probe harnesses (49 killed barriers). This is offline refusal/configuration evidence, not live GitHub policy proof.
- Installer: cargo-dist 0.30.4's real generated script, hardened, with tiny shell executable fixtures: **14 acceptance groups passed**, including copy/chmod/link failure, unsupported OS/CPU, existing file/link/directory, staged visibility and a concurrent destination. The old hardener was RED on replacing an existing file. These fixtures do not qualify native binary compatibility.
- The real cargo-dist post-notice manifest/global/formula/installer round-trip also passed (exit 0): all three formula/archive digests and all 14 installer groups. Its first final-tree launch failed because the release-tools shell intentionally has no Cargo; rerunning through the default build shell plus one-off Python passed. The failed output is retained as replay-4 `target/distrib-failed-1`; it is never a candidate.
- `actionlint` passed the three release workflows plus native Nix CI. Locked UI install/build passed; no tracked web files changed. Native archive/service/live-agent acceptance remains the maintainer's and native CI's.
- `nix flake check -L` passed on native aarch64-darwin, including package, audit, fmt/Clippy and real UI/reference guards. Linux systems were explicitly omitted as incompatible locally; the matrix now includes native x86_64-linux and aarch64-linux.
- Real locked Cargo/pnpm material generation succeeded. Target-filtered dependency closure plus immutable upstream licence supplements has no missing licence-text findings. The SPDX includes separately named OpenSSL/SQLite; source/runtime/UI/manifest digests are generated. Licence/asset/corresponding-source clearance still needs the maintainer.
- **Replay:** fresh `dist-r1-replay-5` extracted **60 blocks** and matched **692 tracked files**, bytes and modes, with task-ordered tests and all 48 final tests passing. All 49 guard-removal probes were also rerun against final source and made tests fail. Earlier replay trees 1–4 are retained for the parent to clean up. The final plan preserves exact upstream licence whitespace through explicit base64 encoding; Rust source files are embedded in full. The final execution record was copied to the replay, and the full tracked tree compared again: 692 matching files and 60 blocks, exit 0.

The ledger and logs are in `.superpowers/sdd/release-foundation/` and `/tmp/dist-r1-*.log`. Scratch probes/materials are not publication candidates and must never be promoted. No GitHub API, PR, release, registry login, tag push or public attestation was performed by this session.

## Scope

Five tasks implement R1: (1) protected gate/approval/retention interface; (2) source, notices, SPDX, identity and freeze; (3) cargo-dist installer hardening; (4) pinned native candidate, signing/publication orchestration and immutable flake identity; (5) process docs, exact plan replay and execution record. R3 owns version/exact-crate metadata in parallel and R4 owns OCI packaging. Their final bytes enter this inventory before freeze. No publishing, Homebrew tap, new platform, native package repository, notarization, public cache or R6 module enablement is in scope.

## Decisions this plan makes where the spec is silent

These implementation choices await the parent's independent review; none substitutes for a maintainer publication decision.

1. **One canonical approval tuple.** Sorted compact ASCII JSON plus newline is hashed with SHA-256. It binds repository, source SHA/tag, every payload through inventory digest, exact channels/targets, candidate run/attempt and publishing run/attempt. An authenticated `release` environment review comment must equal `approve-release-v1:<tuple-hash>`. Actor/decision come only from platform review history. A run with a rejected environment review requires a fresh dispatch; ordering is not guessed.
2. **A gate runs in each protected job. Receipt paths are resolved and required to be outside the candidate, so preflight cannot itself introduce an unapproved candidate byte.** The canonical executable is `packaging/release-gate <github|crates|ghcr|homebrew>`; a composite action wraps the same script, with `preflight` before credentials and `boundary` immediately before signing/upload. A dependency job's boolean is insufficient. The uploader revalidates for every public write. The v1 outer caller is `.github/workflows/release-publish.yml`, manual from `main`; R3/R4 add protected final jobs there. Unreviewed reusable job indirection is refused by the static authority check. The checker scans every workflow filename for write authority, including a generated release.yml, rather than trusting a release-name prefix.
3. **No writer authority before current-attempt preflight.** A protected read-only `authorize` job runs the live gate, then outputs the approved inventory digest and current run attempt. Every writer directly depends on it and checks both outputs in its job condition before GitHub issues job-level credentials. Rerun-failed cannot reuse authorization from an earlier attempt. Conditional/ignored gates and ignored job failures are refused. The same rule covers protected secret-based registry jobs. The GitHub upload job has a read-only ordinary token; only after preflight does the narrowly scoped App action mint a short-lived write token. Signing obtains OIDC only in the attestation action after the two validations. A separate read-only policy reader may be needed to expose complete bypass settings; hidden settings refuse.
4. **Tag creation is an explicit unresolved design/platform issue.** GitHub's restrict-creations rule authorizes creators through a bypass list. The design says no bypass. The safe implementation denies all `v*` creation/update/deletion, with explicit negative configuration tests, until the parent chooses an enforceable authorized creation path (for example a creation-only App exception in a separate ruleset while update/deletion stay frozen) and writes back that amendment. R1 never silently toggles rules to create a tag.
5. **Object Lock rather than expiring Actions artifacts.** Candidate and audit storage uses versioned S3, COMPLIANCE retention and legal hold ON, conditional creation, exact-version reads, and restricted CI principals. Holds remain until every approved channel/public path completes. Actions' 90-day copy is convenience only. No code removes holds, deletes candidates or provisions paid resources. Storage setup is maintainer-only.
6. **Build from exact approved source.** Native fixed runner labels, pinned Rust 1.98.1, cargo-dist 0.30.4's fixed archive digests, action commit SHAs and locked Nix web tools; no restored Actions cache. Build the UI once, record SDK/tool versions, add notices before archive hashes, and independently verify combined checksums. Current Rust/frontend audits stop a candidate on findings.
7. **Material is broader than Cargo.lock.** SPDX covers the target-resolved Rust graph (build/dev conservatively), bundled OpenSSL/SQLite and frontend packages; source tarballs preserve the actual package sources. Exact-version omitted root licences are supplied verbatim from immutable upstream revisions/digests, with no moving fetch in candidate builds. Assets/fonts, redistribution and corresponding-source clearance remain a maintainer review. Runtime Node/agent downloads are separately inventoried and never redistributed.
8. **No installer overwrite.** Keep cargo-dist, fail closed on unchecked/malformed/unsupported digests and failed downloads, stage/copy/chmod inside the destination filesystem, then atomically create the final basename using an exclusive hard link to the directory operand. Existing files, symlinks and directories (including races) survive. An explicit removal or a new empty user directory is needed for an upgrade; no sudo, service start or runtime install.
9. **Immutable flake source identity.** The package retains the separately built UI and reference guards. A clean flake revision is compiled into `--version`, alongside the same UI tree and adapter-manifest hashes as release metadata. Dirty sources say unrecorded; native Linux arm64 joins CI. No public cache or unmerged module/adapters are claimed.
10. **Registry recovery is not a transaction.** Complete held local bytes are mandatory, every remote byte/digest is reconciled, an ambiguous response is a stop, matching bytes count as complete, only verified missing artifacts upload, and mismatches never overwrite. Existing valid Sigstore bundles may be reused on retry. A new attempt needs new approval; missing/expired candidates require new candidates/versions as immutability dictates.

## Global constraints

- Never publish, obtain tokens, log into registries, create/push release tags, call the repository's GitHub API/CLI, or modify external settings while executing this plan. The parent opens/reviews PRs and runs external qualification.
- Use the named worktree and plain `nix develop -c`; Python/release tools are the locked `.#release` shell. Never share a Cargo target directory. Scratch homes/configs/cache/store stay under `.superpowers/`; never use real operator data.
- Pinned actions, timeouts and least privilege. No credentials in PR jobs. Every signer/publisher uses `release`; storage-only candidate staging uses `release-staging`. Default switches stay unset.
- Keep the personal git identity, unsigned commit commands and SSH branch pushes; inspect staged diff/author addresses and forbidden client data before each push. No main pushes or GitHub account actions.
- Retain scratch/replay trees for parent cleanup; do not delete them. No writes to global/project memory; parent files lessons.

## Review focus

The parent must review the full base-to-head range, especially live REST field/permission assumptions (`can_admins_bypass`, bypass actors, review history/attempts), configured-user identity, protected main/caller restrictions, no-bypass tag enforcement and the unresolved creator path, token minting order, OIDC/attestation identity versus application source SHA, every mutation at boundaries, S3 IAM/Object Lock/retention/audit semantics, registry ambiguity, signature recovery, source/licence completeness and the exclusive installer publication operation. Run native Linux/macOS CI; do not infer live GitHub enforcement or registry correctness from offline fixtures. The maintainer-only steps are in `docs/release-process.md`.

## File structure

Exact final files follow. `r1:file` blocks replace a file byte-for-byte and set its explicit mode. Source/code is embedded verbatim; the one upstream licence with original trailing whitespace uses explicit base64 encoding, preserving its exact bytes without Markdown whitespace errors. Every block has a payload SHA-256 and byte length (preserving upstream licence files without a final newline); extraction count must be nonzero. The plan itself is the replay input; its final execution record is copied with the final docs-index record after the code replay.

- Task 1: `.github/actions/release-gate/action.yml`
- Task 1: `.github/release-branch-policy.json`
- Task 1: `.github/release-environment.example.json`
- Task 1: `.github/release-tag-ruleset.json`
- Task 1: `.gitignore`
- Task 1: `packaging/release-gate`
- Task 1: `packaging/release/.gitignore`
- Task 1: `packaging/release/README.md`
- Task 1: `packaging/release/gate.py`
- Task 1: `packaging/release/retention.py`
- Task 1: `packaging/release/test_adapter.py`
- Task 1: `packaging/release/test_gate.py`
- Task 1: `packaging/release/test_platform.py`
- Task 1: `packaging/release/test_retention.py`
- Task 2: `crates/hennery/src/build_identity.rs`
- Task 2: `crates/hennery/src/main.rs`
- Task 2: `crates/hennery/tests/cli.rs`
- Task 2: `packaging/release/licences/0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e.txt`
- Task 2: `packaging/release/licences/23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt`
- Task 2: `packaging/release/licences/2710a622a896bba67356913d4d0492cab5465f61b2ecce6d880aeb483834fb50.txt`
- Task 2: `packaging/release/licences/32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt`
- Task 2: `packaging/release/licences/5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b.txt`
- Task 2: `packaging/release/licences/6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a.txt`
- Task 2: `packaging/release/licences/8173d5c29b4f956d532781d2b86e4e30f83e6b7878dce18c919451d6ba707c90.txt`
- Task 2: `packaging/release/licences/README.md`
- Task 2: `packaging/release/licences/a5c61b93b6ee1d104af9920cf020ff3c7efe818e31fe562c72261847a728f513.txt`
- Task 2: `packaging/release/licences/a60eea817514531668d7e00765731449fe14d059d3249e0bc93b36de45f759f2.txt`
- Task 2: `packaging/release/licences/c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c.txt`
- Task 2: `packaging/release/licences/db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1.txt`
- Task 2: `packaging/release/licences/ed60d479b8fd1f64e9cbc3de449a16a53ac1b3d1b6aeb9bf9d190a8e93061b44.txt`
- Task 2: `packaging/release/licences/f250d08cee4549b22b3b4aaaf3a743473336fd280316df5d0340717e5127a221.txt`
- Task 2: `packaging/release/licences/manifest.json`
- Task 2: `packaging/release/supply.py`
- Task 2: `packaging/release/test_supply.py`
- Task 3: `packaging/check-archive.sh`
- Task 3: `packaging/harden-installer.py`
- Task 3: `packaging/release/make_installer_fixture.py`
- Task 3: `packaging/release/test_archives.py`
- Task 3: `packaging/release/test_hardener.py`
- Task 3: `packaging/test-installer.sh`
- Task 4: `.github/workflows/nix.yml`
- Task 4: `.github/workflows/release-candidate.yml`
- Task 4: `.github/workflows/release-publish.yml`
- Task 4: `.github/workflows/release-tests.yml`
- Task 4: `dist-workspace.toml`
- Task 4: `flake.nix`
- Task 4: `nix/package.nix`
- Task 4: `packaging/release/approval_summary.py`
- Task 4: `packaging/release/assemble.py`
- Task 4: `packaging/release/publish.py`
- Task 4: `packaging/release/refresh_manifest.py`
- Task 4: `packaging/release/test_publish.py`
- Task 4: `packaging/release/test_verify.py`
- Task 4: `packaging/release/test_workflows.py`
- Task 4: `packaging/release/verify.py`
- Task 4: `packaging/release/workflow_policy.py`
- Task 4: `rust-toolchain.toml`
- Task 5: `docs/README.md`
- Task 5: `docs/release-process.md`
- Task 5: `packaging/README.md`

## Task 1: Protected gate, authenticated approval and held recovery

### Step 1: RED / contract

Install the three test files first and run their commands: imports/guards must fail before gate.py/retention.py exist. The build observed RED at module import, then GREEN with the implementation.

### Step 2: Exact implementation

### File `.github/actions/release-gate/action.yml`

<!-- r1:file task=1 path=.github/actions/release-gate/action.yml sha256=a12ee80d4c4ac1eef8b321c8fb65f874d57a1ed84eb7341797717b6f4326d44a bytes=1197 mode=644 encoding=utf8 -->
````yaml
name: Release publication gate v1
description: Revalidate an authenticated approval and the exact candidate at a credential or publication boundary.
inputs:
  candidate:
    description: Complete retained candidate directory
    required: true
  inventory-sha256:
    description: Digest explicitly approved by manual dispatch
    required: true
  channel:
    description: Enabled channel (github, crates, ghcr, homebrew)
    required: true
  phase:
    description: preflight or boundary
    required: true
  receipt:
    description: New receipt pathname outside the candidate (never overwritten)
    required: true
runs:
  using: composite
  steps:
    - name: Live release gate
      shell: bash
      env:
        RELEASE_CANDIDATE: ${{ inputs.candidate }}
        RELEASE_INVENTORY: ${{ inputs.inventory-sha256 }}
        RELEASE_CHANNEL: ${{ inputs.channel }}
        RELEASE_PHASE: ${{ inputs.phase }}
        RELEASE_RECEIPT: ${{ inputs.receipt }}
      run: |
        nix develop .#release -c packaging/release-gate "$RELEASE_CHANNEL" --candidate "$RELEASE_CANDIDATE" \
          --inventory-sha256 "$RELEASE_INVENTORY" \
          --phase "$RELEASE_PHASE" --receipt "$RELEASE_RECEIPT"
````

### File `.github/release-branch-policy.json`

<!-- r1:file task=1 path=.github/release-branch-policy.json sha256=34679cb780db937dfd017b68c9f193375b833cc9b2b9e046d99d622b7f506c72 bytes=32 mode=644 encoding=utf8 -->
````json
{"name":"main","type":"branch"}
````

### File `.github/release-environment.example.json`

<!-- r1:file task=1 path=.github/release-environment.example.json sha256=4a8619139b49a0d5d9bec6b860ced1cc12e9fa49b70d71826f25d47cc8f15f12 bytes=202 mode=644 encoding=utf8 -->
````json
{
  "can_admins_bypass": false,
  "prevent_self_review": false,
  "reviewers": [{"type": "User", "id": 0}],
  "deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}
}
````

### File `.github/release-tag-ruleset.json`

<!-- r1:file task=1 path=.github/release-tag-ruleset.json sha256=5f45bcc202010837e92ca98f865d1952ab9f0dd4957b14d8f0a0d575f635c115 bytes=253 mode=644 encoding=utf8 -->
````json
{
  "name": "release-tags-frozen",
  "target": "tag",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {"ref_name": {"include": ["refs/tags/v*"], "exclude": []}},
  "rules": [{"type":"creation"},{"type":"update"},{"type":"deletion"}]
}
````

### File `.gitignore`

<!-- r1:file task=1 path=.gitignore sha256=163b4a550dcdcb42a6f8b1e332e1ee2fe39cef50085f0a612a59091db54ac2ad bytes=113 mode=644 encoding=utf8 -->
````text
/target
/result
.direnv/
node_modules/
/.claude/
/.superpowers/
/dist/

# Release validation tools.
__pycache__/
````

### File `packaging/release-gate`

<!-- r1:file task=1 path=packaging/release-gate sha256=2b250a531e66d039074896a2bdb5ae90756b84bddbc1939c0c99e1e3a422ee31 bytes=583 mode=755 encoding=utf8 -->
````text
#!/bin/sh
# R1 v1: one channel per validation, with live platform evidence and held audit.
set -eu
case "${1:-}" in
    github|crates|ghcr|homebrew) channel=$1; shift ;;
    *) echo 'usage: packaging/release-gate <github|crates|ghcr|homebrew> --candidate DIR --inventory-sha256 HEX --phase preflight|boundary --receipt FILE' >&2; exit 2 ;;
esac
for argument do
    case "$argument" in
        --channel|--channel=*) echo 'release refused: channel is the first positional argument' >&2; exit 2 ;;
    esac
done
exec python3 "$(dirname "$0")/release/gate.py" --channel "$channel" "$@"
````

### File `packaging/release/.gitignore`

<!-- r1:file task=1 path=packaging/release/.gitignore sha256=32dae3052f331ee34d628ef535709b301259a45df7c7522c4d35dcf49873f00b bytes=13 mode=644 encoding=utf8 -->
````text
__pycache__/
````

### File `packaging/release/README.md`

<!-- r1:file task=1 path=packaging/release/README.md sha256=5854933aa2250968e1a146e8c018e7f5cae03ab80dec9315f206f47ec8dbd5c2 bytes=9748 mode=644 encoding=utf8 -->
````markdown
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
````

### File `packaging/release/gate.py`

<!-- r1:file task=1 path=packaging/release/gate.py sha256=2e17f3ea348dea71872408d26196d17cfbe82e7cb76a84c64f338c4d5b9cb26e bytes=16101 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""R1 v1 gate. Read-only platform checks; no signing or publication credentials.

The Python API is deliberately usable offline. The CLI ALWAYS fetches live
platform evidence; it never accepts a snapshot supplied by a candidate.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

REPOSITORY = 'marcinwadon/hennery'
REQUIRED_WORKFLOWS = ('.github/workflows/ci.yml', '.github/workflows/build.yml', '.github/workflows/nix.yml', '.github/workflows/release-tests.yml')
CHANNELS = {'github', 'crates', 'ghcr', 'homebrew'}
TARGETS = {'aarch64-apple-darwin', 'aarch64-unknown-linux-musl', 'x86_64-unknown-linux-musl'}


class Refused(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise Refused(reason)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True) + '\n').encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def strict_json(raw):
    def pairs(items):
        result = {}
        seen = set()
        for key, value in items:
            require(key.casefold() not in seen, 'duplicate or case-ambiguous JSON key')
            seen.add(key.casefold())
            result[key] = value
        return result
    try:
        return json.loads(raw, object_pairs_hook=pairs)
    except (ValueError, UnicodeError) as error:
        raise Refused(f'invalid JSON: {error}') from error


def binding(inventory, inventory_sha256, run_id, run_attempt):
    return {key: inventory[key] for key in ('repository', 'source_sha', 'tag', 'channels', 'targets', 'candidate')} | {
        'inventory_sha256': inventory_sha256, 'publishing': {'run_id': int(run_id), 'run_attempt': int(run_attempt)}}


def challenge(context):
    return 'approve-release-v1:' + digest(canonical(context))


def frozen_tag_ruleset():
    # Safe default: no actor can mutate v* tags. Creation path pending parent ruling.
    return {'name': 'release-tags-frozen', 'target': 'tag', 'enforcement': 'active', 'bypass_actors': [],
            'conditions': {'ref_name': {'include': ['refs/tags/v*'], 'exclude': []}},
            'rules': [{'type': op} for op in ('creation', 'update', 'deletion')]}


def check_tag_rules(rulesets):
    protected = set()
    for rule in rulesets:
        if rule.get('target') != 'tag' or rule.get('enforcement') != 'active':
            continue
        refs = rule.get('conditions', {}).get('ref_name', {})
        if refs != {'include': ['refs/tags/v*'], 'exclude': []}:
            continue
        if rule.get('bypass_actors') != []:
            continue
        protected.update(r['type'] for r in rule.get('rules', []))
    require({'creation', 'update', 'deletion'} <= protected, 'release tag creation/update/deletion must have no bypass')


def verify_files(inventory, root):
    root = Path(root)
    require(inventory.get('schema') == 1, 'unsupported inventory schema')
    require(inventory.get('repository') == REPOSITORY, 'unexpected repository')
    require(re.fullmatch(r'[0-9a-f]{40}', inventory.get('source_sha', '')), 'invalid source SHA')
    require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', inventory.get('tag', '')), 'invalid release tag')
    for field, allowed in (('channels', CHANNELS), ('targets', TARGETS)):
        values = inventory.get(field)
        require(isinstance(values, list) and values and values == sorted(set(values)) and set(values) <= allowed, f'invalid {field}')
    candidate = inventory.get('candidate', {})
    require(set(candidate) == {'run_id', 'run_attempt'} and all(type(n) is int and n > 0 for n in candidate.values()), 'invalid candidate run binding')
    artifacts = inventory.get('artifacts', [])
    require(artifacts, 'empty candidate inventory')
    names = set()
    for artifact in artifacts:
        name = artifact.get('name', '')
        require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', name) and name != 'release-inventory.json', 'unsafe artifact name')
        require(name.casefold() not in names, 'duplicate artifact')
        names.add(name.casefold())
        path = root / name
        require(path.is_file() and not path.is_symlink(), f'missing/nonregular candidate artifact: {name}')
        require(type(artifact.get('size')) is int and path.stat().st_size == artifact['size'], f'candidate size changed: {name}')
        require(re.fullmatch(r'[0-9a-f]{64}', artifact.get('sha256', '')), 'invalid artifact digest')
        require(digest(path.read_bytes()) == artifact['sha256'], f'candidate digest changed: {name}')
    actual = {p.name.casefold() for p in root.iterdir() if p.name != 'release-inventory.json'}
    require(actual == names, 'candidate contains unapproved/missing files')


def path_of(run):
    return run.get('path', '').split('@', 1)[0]


def trusted_run(run, source_sha, path):
    require(run.get('head_sha') == source_sha, f'{path}: checks are not on exact source SHA')
    require(run.get('head_repository', {}).get('full_name') == REPOSITORY, f'{path}: untrusted check repository')
    require(path_of(run) == path and run.get('event') in ('push', 'workflow_dispatch'), f'{path}: untrusted check workflow/event')
    require(run.get('status') == 'completed' and run.get('conclusion') == 'success', f'{path}: missing, pending or unsuccessful checks')


def validate(inventory, expected_digest, root, context, snapshot):
    require(digest(canonical(inventory)) == expected_digest, 'inventory digest mismatch')
    verify_files(inventory, root)
    expected = binding(inventory, expected_digest, context['publishing']['run_id'], context['publishing']['run_attempt'])
    require(context == expected, 'approval tuple differs from inventory')
    env = snapshot.get('environment') or {}
    require(env.get('name') == 'release' and env.get('can_admins_bypass') is False, 'release environment missing or bypass not explicitly disabled')
    reviewers = {r['reviewer']['id'] for rule in env.get('protection_rules', []) if rule.get('type') == 'required_reviewers'
                 for r in rule.get('reviewers', []) if r.get('type') == 'User'}
    require(reviewers, 'release environment needs explicit authorized user reviewers')
    require(env.get('deployment_branch_policy') == {'protected_branches': False, 'custom_branch_policies': True}, 'release environment branch restrictions missing')
    require(snapshot.get('branch_policies') == [{'name': 'main', 'type': 'branch'}], 'release jobs must run from protected main only')
    check_tag_rules(snapshot.get('rulesets', []))
    tag = snapshot.get('tag') or {}
    require(tag.get('object', {}).get('type') == 'tag', 'release tag missing or not annotated')
    obj = snapshot.get('tag_object') or {}
    require(obj.get('tag') == inventory['tag'] and obj.get('object', {}).get('type') == 'commit' and obj.get('object', {}).get('sha') == inventory['source_sha'], 'release tag moved/deleted or wrong SHA')
    candidate = snapshot.get('candidate_run', {})
    require(candidate.get('id') == inventory['candidate']['run_id'] and candidate.get('run_attempt') == inventory['candidate']['run_attempt'], 'candidate run attempt changed')
    trusted_run(candidate, inventory['source_sha'], '.github/workflows/release-candidate.yml')
    publisher = snapshot.get('publisher_run', {})
    require(publisher.get('id') == context['publishing']['run_id'] and publisher.get('run_attempt') == context['publishing']['run_attempt'], 'publishing run attempt changed: renew approval')
    require(publisher.get('repository', {}).get('full_name') == REPOSITORY and publisher.get('event') == 'workflow_dispatch'
            and publisher.get('head_branch') == 'main' and path_of(publisher) == '.github/workflows/release-publish.yml', 'unexpected publisher workflow/ref/event')
    reviews = [r for r in snapshot.get('reviews', []) if any(e.get('id') == env.get('id') and e.get('name') == 'release' for e in r.get('environments', []))]
    require(reviews, 'environment approval absent')
    require(all(r.get('state') == 'approved' for r in reviews), 'environment review includes a rejection: start a fresh dispatch')
    reviews = [r for r in reviews if r.get('comment') == challenge(context)]
    require(reviews, 'approval does not bind this inventory and publishing attempt')
    require(all(r.get('state') == 'approved' for r in reviews), 'matching approval was rejected')
    review = reviews[-1]
    require(review.get('state') == 'approved' and review.get('user', {}).get('id') in reviewers, 'approval absent/rejected or unauthorized actor')
    require(review.get('comment') == challenge(context), 'approval does not bind this inventory and publishing attempt')
    for path in REQUIRED_WORKFLOWS:
        runs = [run for run in snapshot.get('checks', []) if path_of(run) == path]
        require(runs, f'{path}: required exact-SHA checks missing')
        trusted_run(max(runs, key=lambda r: r['id']), inventory['source_sha'], path)
    return {'schema': 1, 'binding': context, 'approver': review['user'], 'decision': 'approved', 'challenge': challenge(context)}


def reconcile(inventory, root, remote):
    """None is an ambiguous/unverifiable response; absent means verified 404 only."""
    verify_files(inventory, root)
    complete, missing = [], []
    for item in inventory['artifacts']:
        name = item['name']
        if name not in remote:
            missing.append(name)
        else:
            require(remote[name] is not None and digest(remote[name]) == item['sha256'], f'remote upload ambiguous or differs: {name}')
            complete.append(name)
    return {'complete': sorted(complete), 'missing': sorted(missing)}


class GitHub:
    """Only GET; fixed origin, bounded pagination, no credential-bearing redirects."""
    def __init__(self, token):
        self.token = token

    def get(self, suffix):
        require(suffix.startswith('/') and '..' not in suffix, 'invalid API path')
        request = urllib.request.Request('https://api.github.com/repos/' + REPOSITORY + suffix,
                                         headers={'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + self.token,
                                                  'X-GitHub-Api-Version': '2022-11-28'})
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                raise Refused('platform API redirected')
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
                return strict_json(response.read())
        except urllib.error.URLError as error:
            raise Refused(f'platform evidence unavailable: {error}') from error

    def pages(self, suffix, key=None):
        out = []
        for page in range(1, 101):
            data = self.get(suffix + ('&' if '?' in suffix else '?') + f'per_page=100&page={page}')
            batch = data[key] if key else data
            require(isinstance(batch, list), 'malformed platform page')
            out.extend(batch)
            if len(batch) < 100:
                return out
        raise Refused('platform pagination limit: incomplete evidence')

    def evidence(self, inventory, context):
        tag = self.get('/git/ref/tags/' + urllib.parse.quote(inventory['tag'], safe=''))
        obj = self.get('/git/tags/' + tag['object']['sha']) if tag.get('object', {}).get('type') == 'tag' else None
        rules = [self.get('/rulesets/' + str(r['id'])) for r in self.pages('/rulesets')]
        branch = self.pages('/environments/release/deployment-branch-policies', 'branch_policies')
        checks = self.pages('/actions/runs?head_sha=' + inventory['source_sha'], 'workflow_runs')
        # Workflow success alone can hide skipped acceptance jobs. All jobs in
        # each latest qualifying workflow must have succeeded, never skipped.
        for path in REQUIRED_WORKFLOWS:
            runs = [r for r in checks if path_of(r) == path]
            if runs:
                run = max(runs, key=lambda r: r['id'])
                jobs = self.pages(f"/actions/runs/{run['id']}/attempts/{run['run_attempt']}/jobs", 'jobs')
                require(jobs and all(j.get('status') == 'completed' and j.get('conclusion') == 'success' for j in jobs), f'{path}: missing/skipped/unsuccessful jobs')
        candidate_run = self.get(f"/actions/runs/{inventory['candidate']['run_id']}")
        candidate_jobs = self.pages(f"/actions/runs/{candidate_run['id']}/attempts/{candidate_run['run_attempt']}/jobs", 'jobs')
        require(candidate_jobs and all(j.get('status') == 'completed' and j.get('conclusion') == 'success' for j in candidate_jobs), 'candidate has skipped/missing/unsuccessful acceptance or retention jobs')
        return {'tag': tag, 'tag_object': obj, 'rulesets': rules,
                'environment': self.get('/environments/release'),
                'branch_policies': [{k: p[k] for k in ('name', 'type')} for p in branch],
                'candidate_run': candidate_run,
                'publisher_run': self.get(f"/actions/runs/{context['publishing']['run_id']}"),
                'reviews': self.get(f"/actions/runs/{context['publishing']['run_id']}/approvals"), 'checks': checks}


def receipt_outside_candidate(candidate, receipt):
    require(not Path(receipt).resolve().is_relative_to(Path(candidate).resolve()), 'gate receipt must be outside the immutable candidate')


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--inventory-sha256', required=True)
    parser.add_argument('--channel', required=True, choices=sorted(CHANNELS))
    parser.add_argument('--phase', required=True, choices=['preflight', 'boundary'])
    parser.add_argument('--receipt', required=True, type=Path)
    args = parser.parse_args()
    receipt_outside_candidate(args.candidate, args.receipt)
    raw = (args.candidate / 'release-inventory.json').read_bytes()
    inventory = strict_json(raw)
    require(raw == canonical(inventory), 'noncanonical inventory')
    require(os.environ.get('GITHUB_REPOSITORY') == REPOSITORY and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'gate must execute in trusted manual main workflow')
    event = strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())
    inputs = event.get('inputs', {})
    context = binding(inventory, args.inventory_sha256, int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
    for key in ('source_sha', 'tag', 'channels', 'targets', 'candidate'):
        supplied = strict_json(inputs[key]) if key in ('channels', 'targets', 'candidate') else inputs[key]
        require(supplied == inventory[key], f'dispatch {key} changed')
    require(inputs.get('inventory_sha256') == args.inventory_sha256, 'dispatch inventory changed')
    require(args.channel in inventory['channels'], 'channel not approved')
    import supply
    supply.require_contract(args.candidate, inventory['channels'], inventory['targets'], inventory['tag'])
    supply.verify_binary_inventory(inventory, args.candidate)
    snapshot = GitHub(os.environ['GH_TOKEN']).evidence(inventory, context)
    receipt = validate(inventory, args.inventory_sha256, args.candidate, context, snapshot)
    receipt['phase'] = args.phase
    receipt['channel'] = args.channel
    # Never replace an audit receipt. Store with candidate in the retained archive.
    with args.receipt.open('xb') as output:
        output.write(canonical(receipt))
    import retention
    retention.audit(args.receipt, os.environ['RELEASE_AUDIT_BUCKET'], context['publishing']['run_id'], context['publishing']['run_attempt'])
    print(challenge(context))


if __name__ == '__main__':
    try:
        main()
    except (Refused, KeyError, OSError, TypeError, ValueError) as error:
        raise SystemExit(f'release refused: {error}') from error
````

### File `packaging/release/retention.py`

<!-- r1:file task=1 path=packaging/release/retention.py sha256=2ecfe915487514666d6b69463be8bc4fb616c64c6ef5c5b6a14fc6bed8ac6d6a bytes=6454 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Retain/recover candidates in S3 Object Lock storage provisioned by maintainer.

Never releases a legal hold or deletes/overwrites an object. AWS authority is
limited to the staging bucket, independent of publication credentials.
"""
import argparse
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import re
import subprocess

import gate


def aws(*args):
    completed = subprocess.run(['aws', 's3api', *args, '--output', 'json'], check=True, capture_output=True)
    return gate.strict_json(completed.stdout)


def check_lock(info):
    gate.require(info.get('VersionId') not in (None, '', 'null'), 'candidate storage is not versioned')
    gate.require(info.get('ObjectLockMode') == 'COMPLIANCE', 'candidate storage must use compliance retention')
    gate.require(info.get('ObjectLockLegalHoldStatus') == 'ON', 'candidate legal hold missing')
    try:
        until = datetime.fromisoformat(info.get('ObjectLockRetainUntilDate', '').replace('Z', '+00:00'))
        gate.require(until > datetime.now(timezone.utc), 'candidate retention expired')
    except (ValueError, TypeError) as error:
        raise gate.Refused('candidate retention missing') from error


def verify(receipt):
    gate.require(receipt.get('schema') == 1 and re.fullmatch('[0-9a-f]{64}', receipt.get('inventory_sha256', '')), 'invalid retention receipt')
    gate.require(re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', receipt.get('bucket', '')), 'invalid retention bucket')
    names = []
    for item in receipt.get('objects', []):
        name = item['name']
        gate.require(re.fullmatch('[A-Za-z0-9][A-Za-z0-9._-]*', name), 'unsafe retained artifact')
        gate.require(item['key'] == f"candidates/{receipt['inventory_sha256']}/{name}", 'retained object outside candidate namespace')
        gate.require(item['version'] not in ('', 'null', None), 'retained version absent')
        info = aws('head-object', '--bucket', receipt['bucket'], '--key', item['key'], '--version-id', item['version'])
        check_lock(info)
        gate.require(info['VersionId'] == item['version'], 'retained version changed')
        names.append(name)
    gate.require(names and len(names) == len(set(names)) and 'release-inventory.json' in names, 'incomplete/duplicate retention receipt')


def stage(root, bucket, inventory_sha256):
    root = Path(root)
    raw = (root / 'release-inventory.json').read_bytes()
    gate.require(gate.digest(raw) == inventory_sha256, 'inventory changed before retention')
    receipt = {'schema': 1, 'bucket': bucket, 'inventory_sha256': inventory_sha256, 'objects': []}
    until = (datetime.now(timezone.utc) + timedelta(days=365)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for path in sorted(root.iterdir()):
        gate.require(path.is_file() and not path.is_symlink(), 'nonregular candidate cannot be retained')
        key = f'candidates/{inventory_sha256}/{path.name}'
        info = aws('put-object', '--bucket', bucket, '--key', key, '--body', str(path), '--if-none-match', '*',
                   '--object-lock-mode', 'COMPLIANCE', '--object-lock-retain-until-date', until,
                   '--object-lock-legal-hold-status', 'ON', '--checksum-algorithm', 'SHA256')
        receipt['objects'].append({'name': path.name, 'key': key, 'version': info['VersionId'], 'sha256': gate.digest(path.read_bytes())})
    verify(receipt)
    return receipt


def fetch(receipt, destination, inventory_sha256):
    gate.require(receipt.get('inventory_sha256') == inventory_sha256, 'retention receipt is for another inventory')
    verify(receipt)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    for item in receipt['objects']:
        path = destination / item['name']
        aws('get-object', '--bucket', receipt['bucket'], '--key', item['key'], '--version-id', item['version'], str(path))
        gate.require(path.is_file() and not path.is_symlink() and gate.digest(path.read_bytes()) == item['sha256'], 'retained bytes changed')
    raw = (destination / 'release-inventory.json').read_bytes()
    gate.require(gate.digest(raw) == inventory_sha256, 'retained inventory changed')
    gate.verify_files(gate.strict_json(raw), destination)


def audit(path, bucket, run_id, run_attempt):
    path = Path(path)
    info = aws('put-object', '--bucket', bucket, '--key', f'audit/{run_id}/{run_attempt}/{path.name}',
               '--body', str(path), '--if-none-match', '*', '--object-lock-mode', 'COMPLIANCE',
               '--object-lock-retain-until-date', (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
               '--object-lock-legal-hold-status', 'ON', '--checksum-algorithm', 'SHA256')
    gate.require(info.get('VersionId') not in (None, '', 'null'), 'audit storage not versioned')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['stage', 'fetch', 'verify'])
    parser.add_argument('--candidate', type=Path)
    parser.add_argument('--bucket')
    parser.add_argument('--inventory-sha256', required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    if args.operation == 'stage':
        receipt = stage(args.candidate, args.bucket, args.inventory_sha256)
        # The receipt itself also gets an immutable, versioned, held object.
        with args.receipt.open('xb') as output:
            output.write(gate.canonical(receipt))
        aws('put-object', '--bucket', args.bucket, '--key', f'candidates/{args.inventory_sha256}/retention-receipt.json',
            '--body', str(args.receipt), '--if-none-match', '*', '--object-lock-mode', 'COMPLIANCE',
            '--object-lock-retain-until-date', (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            '--object-lock-legal-hold-status', 'ON', '--checksum-algorithm', 'SHA256')
    else:
        receipt = gate.strict_json(args.receipt.read_bytes())
        gate.require(receipt['inventory_sha256'] == args.inventory_sha256, 'retention inventory mismatch')
        if args.operation == 'fetch':
            fetch(receipt, args.candidate, args.inventory_sha256)
        else:
            verify(receipt)


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, KeyError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'candidate retention refused: {error}') from error
````

### File `packaging/release/test_adapter.py`

<!-- r1:file task=1 path=packaging/release/test_adapter.py sha256=c586c640c8ed67f3d84e02d7d16175c9dd89f4be32f408cc49ca43ac73a0dd84 bytes=1730 mode=644 encoding=utf8 -->
````python
"""Exercise the executable channel adapter without network or credentials."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
ADAPTER = ROOT / 'packaging/release-gate'


class Adapter(unittest.TestCase):
    def call(self, *arguments):
        return subprocess.run([str(ADAPTER), *arguments], capture_output=True, text=True)

    def test_unknown_legacy_or_overridden_channel_refuses(self):
        complete = ['--candidate', '/missing-release-candidate', '--inventory-sha256', 'a' * 64,
                    '--phase', 'preflight', '--receipt', '/missing-release-receipt.json']
        for arguments in [[], ['crates-io'], ['materialize'], ['verify'], ['upload'],
                          ['ghcr', '--channel', 'github'], ['ghcr', '--channel=github'],
                          ['ghcr', '--chan=github']]:
            with self.subTest(arguments=arguments):
                self.assertEqual(self.call(*arguments, *complete).returncode, 2)

    def test_each_channel_requires_complete_retained_bytes_before_network(self):
        with tempfile.TemporaryDirectory() as candidate:
            for channel in ('github', 'crates', 'ghcr', 'homebrew'):
                with self.subTest(channel=channel):
                    result = self.call(channel, '--candidate', candidate, '--inventory-sha256', 'a' * 64,
                                       '--phase', 'preflight', '--receipt', candidate + '.receipt')
                    self.assertEqual(result.returncode, 1)
                    self.assertIn('release-inventory.json', result.stderr)
                    self.assertIn('release refused:', result.stderr)


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/test_gate.py`

<!-- r1:file task=1 path=packaging/release/test_gate.py sha256=d53ef7e6e5ad380d9714feb0307e10fcc44146c70ae536aa24df3cb9ee2a5a8f bytes=11262 mode=644 encoding=utf8 -->
````python
"""Offline acceptance. No test contacts GitHub or any registry."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import gate


class Gates(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'archive').write_bytes(b'approved bytes')
        self.inventory = {
            'schema': 1, 'repository': 'marcinwadon/hennery', 'tag': 'v0.1.0-alpha.1',
            'source_sha': 'a' * 40, 'channels': ['github'], 'targets': ['aarch64-apple-darwin'],
            'candidate': {'run_id': 10, 'run_attempt': 1},
            'artifacts': [{'name': 'archive', 'sha256': hashlib.sha256(b'approved bytes').hexdigest(), 'size': 14}],
        }
        self.digest = gate.digest(gate.canonical(self.inventory))
        self.context = gate.binding(self.inventory, self.digest, 20, 1)
        self.snapshot = {
            'environment': {'id': 7, 'name': 'release', 'can_admins_bypass': False,
                            'protection_rules': [{'type': 'required_reviewers', 'reviewers': [{'type': 'User', 'reviewer': {'id': 123}}]}],
                            'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True}},
            'branch_policies': [{'name': 'main', 'type': 'branch'}],
            'rulesets': [gate.frozen_tag_ruleset()],
            'tag': {'object': {'type': 'tag', 'sha': 'b' * 40}},
            'tag_object': {'tag': self.inventory['tag'], 'object': {'type': 'commit', 'sha': 'a' * 40, 'url': 'https://api.github.com/repos/marcinwadon/hennery/git/commits/' + 'a' * 40}},
            'candidate_run': {'id': 10, 'run_attempt': 1, 'head_sha': 'a' * 40, 'head_repository': {'full_name': 'marcinwadon/hennery'},
                              'event': 'push', 'path': '.github/workflows/release-candidate.yml', 'status': 'completed', 'conclusion': 'success'},
            'publisher_run': {'id': 20, 'run_attempt': 1, 'head_sha': 'c' * 40, 'head_branch': 'main', 'event': 'workflow_dispatch',
                              'path': '.github/workflows/release-publish.yml', 'repository': {'full_name': 'marcinwadon/hennery'}},
            'reviews': [{'state': 'approved', 'user': {'id': 123, 'login': 'maintainer'}, 'environments': [{'id': 7, 'name': 'release'}],
                         'comment': gate.challenge(self.context)}],
            'checks': [],
        }
        for path in gate.REQUIRED_WORKFLOWS:
            self.snapshot['checks'].append({'path': path, 'head_sha': 'a' * 40, 'event': 'push', 'head_repository': {'full_name': 'marcinwadon/hennery'},
                                            'status': 'completed', 'conclusion': 'success', 'id': len(self.snapshot['checks']) + 1})

    def validate(self):
        return gate.validate(self.inventory, self.digest, self.root, self.context, self.snapshot)

    def test_approved(self):
        self.assertEqual(self.validate()['approver']['id'], 123)

    def test_independent_refusals(self):
        # Every case changes exactly one otherwise passing input.
        cases = {
            'environment absent': lambda s: s.pop('environment'),
            'admin bypass': lambda s: s['environment'].update(can_admins_bypass=True),
            'reviewers absent': lambda s: s['environment'].update(protection_rules=[]),
            'broad deployment branches': lambda s: s['branch_policies'].append({'name': '*', 'type': 'branch'}),
            'unrestricted environment': lambda s: s['environment'].update(deployment_branch_policy=None),
            'no tag rules': lambda s: s.update(rulesets=[]),
            'tag bypass': lambda s: s['rulesets'][0].update(bypass_actors=[{'actor_type': 'RepositoryRole', 'actor_id': 5}]),
            'tag rule inactive': lambda s: s['rulesets'][0].update(enforcement='disabled'),
            'tag rule exclude': lambda s: s['rulesets'][0]['conditions']['ref_name'].update(exclude=['refs/tags/v*']),
            'tag deleted': lambda s: s.update(tag=None),
            'tag moved': lambda s: s['tag_object']['object'].update(sha='d' * 40),
            'lightweight tag': lambda s: s['tag']['object'].update(type='commit'),
            'approval absent': lambda s: s.update(reviews=[]),
            'unauthorized reviewer': lambda s: s['reviews'][0]['user'].update(id=999),
            'rejected decision': lambda s: s['reviews'][0].update(state='rejected'),
            'different environment': lambda s: s['reviews'][0].update(environments=[{'id': 8, 'name': 'release'}]),
            'unbound approval': lambda s: s['reviews'][0].update(comment='approved'),
            'candidate rerun': lambda s: s['candidate_run'].update(run_attempt=2),
            'candidate wrong SHA': lambda s: s['candidate_run'].update(head_sha='d' * 40),
            'candidate PR': lambda s: s['candidate_run'].update(event='pull_request'),
            'candidate wrong workflow': lambda s: s['candidate_run'].update(path='.github/workflows/build.yml'),
            'publisher rerun': lambda s: s['publisher_run'].update(run_attempt=2),
            'publisher branch': lambda s: s['publisher_run'].update(head_branch='feature'),
            'publisher event': lambda s: s['publisher_run'].update(event='push'),
            'checks missing': lambda s: s.update(checks=[]),
            'checks pending': lambda s: s['checks'][0].update(status='in_progress'),
            'checks failed': lambda s: s['checks'][0].update(conclusion='failure'),
            'checks cancelled': lambda s: s['checks'][0].update(conclusion='cancelled'),
            'checks skipped': lambda s: s['checks'][0].update(conclusion='skipped'),
            'checks other SHA': lambda s: s['checks'][0].update(head_sha='d' * 40),
            'checks wrong workflow': lambda s: s['checks'][0].update(path='.github/workflows/other.yml'),
            'checks PR merge ref': lambda s: s['checks'][0].update(event='pull_request'),
            'checks fork': lambda s: s['checks'][0].update(head_repository={'full_name': 'fork/hennery'}),
        }
        for name, mutate in cases.items():
            with self.subTest(name=name):
                original = self.snapshot
                self.snapshot = copy.deepcopy(original)
                mutate(self.snapshot)
                with self.assertRaises(gate.Refused):
                    self.validate()
                self.snapshot = original

    def test_each_tag_operation_refused_without_rule(self):
        for operation in ('creation', 'update', 'deletion'):
            with self.subTest(operation=operation):
                s = copy.deepcopy(self.snapshot)
                s['rulesets'][0]['rules'] = [r for r in s['rulesets'][0]['rules'] if r['type'] != operation]
                with self.assertRaises(gate.Refused):
                    gate.validate(self.inventory, self.digest, self.root, self.context, s)


    def test_review_order_does_not_reuse_prior_attempt(self):
        old = copy.deepcopy(self.snapshot['reviews'][0])
        old['comment'] = 'prior-attempt'
        for reviews in ([old, self.snapshot['reviews'][0]], [self.snapshot['reviews'][0], old]):
            self.snapshot['reviews'] = reviews
            self.validate()

    def test_withdrawal_is_not_hidden_by_an_unbound_review_comment(self):
        rejected = copy.deepcopy(self.snapshot['reviews'][0])
        rejected.update(state='rejected', comment='withdrawn')
        self.snapshot['reviews'].append(rejected)
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_binding_each_field(self):
        for field, value in [('inventory_sha256', 'f' * 64), ('source_sha', 'f' * 40), ('tag', 'v0.1.0'),
                             ('channels', ['crates']), ('targets', ['x86_64-unknown-linux-musl']),
                             ('candidate', {'run_id': 11, 'run_attempt': 1}),
                             ('publishing', {'run_id': 21, 'run_attempt': 1}),
                             ('publishing', {'run_id': 20, 'run_attempt': 2})]:
            with self.subTest(field=field, value=value):
                context = copy.deepcopy(self.context)
                context[field] = value
                with self.assertRaises(gate.Refused):
                    gate.validate(self.inventory, self.digest, self.root, context, self.snapshot)

    def test_byte_change_between_boundaries(self):
        self.validate()
        (self.root / 'archive').write_bytes(b'changed bytes!')
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_candidate_digest_cannot_be_rewritten_under_old_approval(self):
        data = b'rewritten bytes'
        (self.root / 'archive').write_bytes(data)
        self.inventory['artifacts'][0].update(sha256=gate.digest(data), size=len(data))
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_inventory_channel_and_target_changes_after_approval(self):
        for field, value in [('channels', ['crates']), ('targets', ['x86_64-unknown-linux-musl'])]:
            with self.subTest(field=field):
                inventory = copy.deepcopy(self.inventory)
                inventory[field] = value
                with self.assertRaises(gate.Refused):
                    gate.validate(inventory, self.digest, self.root, self.context, self.snapshot)

    def test_receipt_cannot_mutate_the_candidate_after_preflight(self):
        for path in [self.root / 'receipt.json', self.root, self.root / 'nested/receipt.json']:
            with self.subTest(path=path), self.assertRaises(gate.Refused):
                gate.receipt_outside_candidate(self.root, path)
        gate.receipt_outside_candidate(self.root, self.root.parent / 'outside-receipt.json')

    def test_missing_candidate(self):
        (self.root / 'archive').unlink()
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_extra_candidate(self):
        (self.root / 'unapproved').write_bytes(b'new')
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_symlink(self):
        (self.root / 'archive').unlink()
        (self.root / 'archive').symlink_to('/etc/passwd')
        with self.assertRaises(gate.Refused):
            self.validate()

    def test_strict_json(self):
        for raw in ('{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '\ufeff{}', '{"X":1,"x":2}'):
            with self.subTest(raw=raw), self.assertRaises(gate.Refused):
                gate.strict_json(raw)

    def test_reconciliation(self):
        remote = {'archive': (self.root / 'archive').read_bytes()}
        self.assertEqual(gate.reconcile(self.inventory, self.root, remote), {'complete': ['archive'], 'missing': []})
        self.assertEqual(gate.reconcile(self.inventory, self.root, {}), {'complete': [], 'missing': ['archive']})
        for bad in ({'archive': b'wrong'}, {'archive': None}):
            with self.assertRaises(gate.Refused):
                gate.reconcile(self.inventory, self.root, bad)
        (self.root / 'archive').unlink()
        with self.assertRaises(gate.Refused):
            gate.reconcile(self.inventory, self.root, remote)


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/test_platform.py`

<!-- r1:file task=1 path=packaging/release/test_platform.py sha256=13b94e0d6304bf2db0643fdd832e9772007d0d365550eb9014157ddf0b7385ea bytes=3482 mode=644 encoding=utf8 -->
````python
import copy
import unittest

import gate
import test_gate


class Platform(unittest.TestCase):
    def fixture(self):
        fixture = test_gate.Gates()
        fixture.setUp()
        self.addCleanup(fixture.tmp.cleanup)
        return fixture

    def test_skipped_jobs_cannot_hide_in_successful_workflow(self):
        fixture = self.fixture()
        class Fake(gate.GitHub):
            def get(self, path):
                if path.startswith('/git/ref/'):
                    return fixture.snapshot['tag']
                if path.startswith('/git/tags/'):
                    return fixture.snapshot['tag_object']
                if path.startswith('/rulesets/'):
                    return gate.frozen_tag_ruleset()
                if path == '/environments/release':
                    return fixture.snapshot['environment']
                if path == '/actions/runs/10':
                    return fixture.snapshot['candidate_run']
                if path == '/actions/runs/20':
                    return fixture.snapshot['publisher_run']
                if path == '/actions/runs/20/approvals':
                    return fixture.snapshot['reviews']
                raise AssertionError(path)

            def pages(self, path, key=None):
                if path == '/rulesets':
                    return [{'id': 99}]
                if path.endswith('/deployment-branch-policies'):
                    return fixture.snapshot['branch_policies']
                if path.startswith('/actions/runs?'):
                    return [dict(r, run_attempt=1) for r in fixture.snapshot['checks']]
                if path.endswith('/jobs'):
                    return self.jobs
                raise AssertionError(path)

        client = Fake('offline-fixture')
        client.jobs = [{'status': 'completed', 'conclusion': 'success'}]
        snapshot = client.evidence(fixture.inventory, fixture.context)
        gate.validate(fixture.inventory, fixture.digest, fixture.root, fixture.context, snapshot)
        for jobs in ([], [{'status': 'completed', 'conclusion': 'skipped'}], [{'status': 'queued', 'conclusion': None}],
                     [{'status': 'completed', 'conclusion': 'cancelled'}]):
            client.jobs = jobs
            with self.subTest(jobs=jobs), self.assertRaises(gate.Refused):
                client.evidence(fixture.inventory, fixture.context)

    def test_checked_in_settings_match_the_validated_policy(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[2]
        rules = gate.strict_json((root / '.github/release-tag-ruleset.json').read_bytes())
        self.assertEqual(rules, gate.frozen_tag_ruleset())
        gate.check_tag_rules([rules])
        environment = gate.strict_json((root / '.github/release-environment.example.json').read_bytes())
        self.assertIs(environment['can_admins_bypass'], False)
        self.assertEqual(environment['reviewers'], [{'type': 'User', 'id': 0}])
        self.assertEqual(gate.strict_json((root / '.github/release-branch-policy.json').read_bytes()), {'name': 'main', 'type': 'branch'})

    def test_environment_bypass_must_be_explicit_false(self):
        fixture = self.fixture()
        for value in (None, True, 'false'):
            fixture.snapshot['environment']['can_admins_bypass'] = value
            with self.subTest(value=value), self.assertRaises(gate.Refused):
                fixture.validate()


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/test_retention.py`

<!-- r1:file task=1 path=packaging/release/test_retention.py sha256=c745a0f23f3cce1bc00f41f6bbd0c6f3af7ca0ab27049400e0ef797b062509e2 bytes=2828 mode=644 encoding=utf8 -->
````python
import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import retention


class Retention(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'payload').write_bytes(b'final')
        self.inventory = {'artifacts': [{'name': 'payload', 'sha256': gate.digest(b'final'), 'size': 5}]}
        self.raw = gate.canonical(self.inventory)
        (self.root / 'release-inventory.json').write_bytes(self.raw)
        self.hash = gate.digest(self.raw)

    def test_requires_compliance_legal_hold_and_version(self):
        good = {'VersionId': 'immutable-v1', 'ObjectLockMode': 'COMPLIANCE', 'ObjectLockLegalHoldStatus': 'ON',
                'ObjectLockRetainUntilDate': '2099-01-01T00:00:00Z', 'ChecksumSHA256': 'ZmluYWw='}
        retention.check_lock(good)
        for field, value in [('VersionId', None), ('VersionId', 'null'), ('ObjectLockMode', 'GOVERNANCE'),
                             ('ObjectLockLegalHoldStatus', 'OFF'), ('ObjectLockRetainUntilDate', '2000-01-01T00:00:00Z')]:
            with self.subTest(field=field), self.assertRaises(gate.Refused):
                retention.check_lock(good | {field: value})

    def test_stage_uses_conditional_creation(self):
        calls = []
        def aws(*args):
            calls.append(args)
            return {'VersionId': 'v1'}
        with patch.object(retention, 'aws', aws), patch.object(retention, 'verify'):
            retention.stage(self.root, 'candidate-bucket', self.hash)
        self.assertEqual(len(calls), 2)
        for call in calls:
            self.assertIn('--if-none-match', call)
            self.assertIn('COMPLIANCE', call)
            self.assertIn('ON', call)

    def test_fetch_digest_and_exact_versions(self):
        receipt = {'schema': 1, 'bucket': 'candidate-bucket', 'inventory_sha256': self.hash,
                   'objects': [{'name': 'release-inventory.json', 'key': 'candidates/' + self.hash + '/release-inventory.json',
                                'version': 'v1', 'sha256': self.hash}]}
        dest = self.root / 'fetched'
        def aws(*args):
            self.assertIn('--version-id', args)
            if args[0] == 'get-object':
                Path(args[-1]).write_bytes(self.raw)
            return {'VersionId': 'v1', 'ObjectLockMode': 'COMPLIANCE', 'ObjectLockLegalHoldStatus': 'ON',
                    'ObjectLockRetainUntilDate': '2099-01-01T00:00:00Z'}
        with patch.object(retention, 'aws', aws), self.assertRaises(gate.Refused):
            # Incomplete receipt cannot recover a complete candidate.
            retention.fetch(receipt, dest, self.hash)


if __name__ == '__main__':
    unittest.main()
````

### Step 3: GREEN / verification

```sh
nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_gate.py
nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_retention.py
nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_platform.py
nix develop .#release -c python3 -m unittest discover -s packaging/release -p test_adapter.py
```

### Step 4: Commit / handoff

Inspect `git diff --check` and the staged stat, commit with `git -c commit.gpgsign=false commit`, verify `git log --format='%ae' origin/main..HEAD`, and push only `plan/dist-r1` over SSH. Report the review request to the parent; no self-approval and no GitHub actions.


## Task 2: SBOM, notices, source, diagnostic identity and final inventory

### Step 1: RED / contract

Install test_supply.py and the CLI regression patch first. The new supply module was absent (RED); the old binary lacked source/UI/manifest diagnostics (1 failed). Then add the implementation and require GREEN.

### Step 2: Exact implementation

### File `crates/hennery/src/build_identity.rs`

<!-- r1:file task=2 path=crates/hennery/src/build_identity.rs sha256=0829518ed915f30a31a5837ffe04d25d036befe60eec5c080abcfb3d3538816f bytes=1040 mode=644 encoding=utf8 -->
````rust
//! Diagnostic identity; release jobs set all three fields from frozen inputs.
use std::sync::OnceLock;

pub fn long_version() -> &'static str {
    static VERSION: OnceLock<String> = OnceLock::new();
    VERSION.get_or_init(|| {
        format!(
            "{}\nsource: {}\nUI SHA-256: {}\nadapter manifest SHA-256: {}",
            env!("CARGO_PKG_VERSION"),
            option_env!("HENNERY_BUILD_SOURCE_SHA").unwrap_or("unrecorded (development build)"),
            option_env!("HENNERY_BUILD_UI_SHA256").unwrap_or("unrecorded (development build)"),
            option_env!("HENNERY_BUILD_MANIFEST_SHA256").unwrap_or("unrecorded (development build)")
        )
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn diagnostics_include_every_identity_field() {
        let version = super::long_version();
        assert!(version.starts_with(env!("CARGO_PKG_VERSION")));
        for field in ["source: ", "UI SHA-256: ", "adapter manifest SHA-256: "] {
            assert!(version.contains(field), "missing {field}");
        }
    }
}
````

### File `crates/hennery/src/main.rs`

<!-- r1:file task=2 path=crates/hennery/src/main.rs sha256=4552c8dcdfce588d9dd97bfa941a93ca80e3dbaaba9f5b1132f87ba0d552adc5 bytes=76345 mode=644 encoding=utf8 -->
````rust
//! The `hennery` binary (distribution spec §1): collector, host (join and
//! run) and an all-in-one mode. Hosts authenticate with the key they paired
//! with; the operator with the session the setup link or a login opened.

mod admin;
mod build_identity;
mod config;
mod data_dir;
mod doctor;
mod healthcheck;
mod inherit;
mod lock;
mod log;
mod revoked;
mod runtime;
mod service;
mod supervisor;

use anyhow::{Context, Result, bail};
use clap::{Args, Parser, Subcommand};
use hennery_host::identity::Paired;
use hennery_host::pairing::Joined;
use hennery_host::session::IDLE_TIMEOUT;
use hennery_host::{AgentCommand, HostConfig};
use hennery_kernel::hosts::Hosts;
use hennery_kernel::operator::{Operator, PublicUrl, SetupLink};
use hennery_sessions::{AppState, store::Store};
use std::net::SocketAddr;
use std::os::fd::AsRawFd;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "hennery", version, long_version = build_identity::long_version(), about = "Self-hosted cockpit for ACP coding agents")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run the collector.
    Collector(CollectorCli),
    /// Host commands.
    Host {
        #[command(subcommand)]
        command: HostCommand,
    },
    /// Run a collector and a host together (two processes).
    Up(UpArgs),
    /// Recovery commands for a running collector, over its admin socket.
    Admin(admin::AdminArgs),
    /// Run hennery as a per-user service (launchd, systemd).
    Service(service::ServiceArgs),
    /// Diagnose this machine's hennery: each check ok, warn or fail, with a
    /// fix. Reads only.
    Doctor(doctor::DoctorArgs),
}

#[derive(Subcommand)]
enum HostCommand {
    /// Pair this machine with a collector (kernel spec §4.1).
    Join(JoinArgs),
    /// Run a host.
    Run(HostArgs),
    /// Change this host's collector endpoint without replacing its identity.
    Transport {
        #[command(subcommand)]
        command: TransportCommand,
    },
    /// Explicit recovery of a possibly committed enrollment.
    Enrollment {
        #[command(subcommand)]
        command: EnrollmentCommand,
    },
    /// The managed adapter set (distribution spec §3.2).
    Adapters {
        #[command(subcommand)]
        command: runtime::AdaptersCommand,
    },
}

#[derive(Args)]
struct JoinArgs {
    /// The collector's public URL, e.g. https://hennery.example.
    url: String,
    /// Import collector-only private CA roots; copied into host.toml.
    #[arg(long)]
    ca_cert: Option<PathBuf>,
    /// The pairing code shown by the collector (`XXXX-XXXX`). Leave it out
    /// to type it, or pipe it, on standard input instead: that keeps it out
    /// of the process list and the shell history.
    code: Option<String>,
    /// How the collector lists this host; defaults to the host name.
    #[arg(long)]
    name: Option<String>,
    /// The host's data directory. Else the one the installed host service
    /// runs, else the platform's (distribution spec §8).
    #[arg(long, env = "HENNERY_HOST_DATA_DIR")]
    data_dir: Option<PathBuf>,
    /// Run this agent with your own CLI instead of the bundled one
    /// (`claude=/path/to/claude`, `codex=/path/to/codex`). Recorded in
    /// `host.toml`; repeatable. Advanced: the agent loses the pin's guarantee.
    #[arg(long = "use-cli", value_parser = runtime::parse_use_cli)]
    use_cli: Vec<hennery_host::runtime::agents::UseCli>,
    /// Pair only: install no adapter runtime (a host that runs only
    /// `--agent` commands, e.g. Nix-provided adapters).
    #[arg(long, conflicts_with = "use_cli")]
    no_runtime: bool,
    #[command(flatten)]
    mirrors: runtime::MirrorArgs,
}

#[derive(Subcommand)]
enum TransportCommand {
    Set(TransportSetArgs),
}
#[derive(Args)]
struct TransportSetArgs {
    url: String,
    #[arg(long, env = "HENNERY_HOST_DATA_DIR")]
    data_dir: Option<PathBuf>,
    #[arg(long, conflicts_with = "system_roots")]
    ca_cert: Option<PathBuf>,
    #[arg(long)]
    system_roots: bool,
}
#[derive(Subcommand)]
enum EnrollmentCommand {
    /// After checking Hosts and revoking any possible enrollment, durably
    /// archive local artifacts. This action cannot confirm remote revocation.
    Archive {
        attempt_id: String,
        #[arg(long, env = "HENNERY_HOST_DATA_DIR")]
        data_dir: Option<PathBuf>,
    },
}

/// `collector` runs the collector; `collector healthcheck` checks one.
#[derive(Args)]
#[command(args_conflicts_with_subcommands = true, subcommand_negates_reqs = true)]
struct CollectorCli {
    #[command(subcommand)]
    command: Option<CollectorCommand>,
    #[command(flatten)]
    run: CollectorArgs,
}

#[derive(Subcommand)]
enum CollectorCommand {
    /// Exit 0 if the collector answers `/healthz`, else 1 (for containers).
    Healthcheck(HealthcheckArgs),
}

#[derive(Args)]
struct HealthcheckArgs {
    /// The collector's listen address, as for `collector`: the first one
    /// given is checked, a wildcard one over loopback. Else `listen` in
    /// `config.toml`, else 127.0.0.1:7117.
    #[arg(long = "listen", env = "HENNERY_LISTEN", value_delimiter = ',')]
    listen: Vec<String>,
    /// Where `config.toml` is read from, when no address is given.
    #[arg(long, env = "HENNERY_DATA_DIR")]
    data_dir: Option<PathBuf>,
}

#[derive(Args, Clone)]
struct CollectorArgs {
    /// An address to listen on, e.g. `127.0.0.1:7117`. Repeatable, or
    /// comma-separated in `HENNERY_LISTEN`; the collector serves the same
    /// routes on each (kernel spec §7). Else `listen` in `config.toml`, else
    /// 127.0.0.1:7117.
    #[arg(long = "listen", env = "HENNERY_LISTEN", value_delimiter = ',')]
    listen: Vec<String>,
    /// The collector's data directory; else the platform's (distribution
    /// spec §8).
    #[arg(long, env = "HENNERY_DATA_DIR")]
    data_dir: Option<PathBuf>,
    /// Where browsers reach the collector, for the setup link until setup
    /// stores its own (kernel spec §3.1). Else `public_url` in
    /// `config.toml`.
    #[arg(long, env = "HENNERY_PUBLIC_URL")]
    public_url: Option<String>,
    /// Presume a host's sessions parked once it has been offline this long.
    #[arg(long, default_value_t = hennery_sessions::offline::OFFLINE_THRESHOLD.as_secs())]
    host_offline_secs: u64,
    /// `hennery up` only: once listening, write one pairing code to this
    /// inherited descriptor (kernel spec §4.2).
    #[arg(long, hide = true, value_parser = clap::value_parser!(i32).range(3..))]
    pairing_code_fd: Option<i32>,
    /// `hennery up` only: serve on this inherited listening socket, which
    /// `up` bound, in place of binding `--listen`. Repeatable.
    #[arg(long = "listen-fd", hide = true, conflicts_with = "listen", value_parser = clap::value_parser!(i32).range(3..))]
    listen_fd: Vec<i32>,
    /// `hennery up` only: the reading end of a pipe only `up` writes to.
    /// At its end-of-file `up` is gone, and the collector stops.
    #[arg(long, hide = true, value_parser = clap::value_parser!(i32).range(3..))]
    parent_fd: Option<i32>,
}

#[derive(Args, Clone)]
struct HostArgs {
    /// Holds the pairing `hennery host join` stored (`host.key`, `host.toml`).
    /// Else the one the installed host service runs, else the platform's
    /// (distribution spec §8).
    #[arg(long, env = "HENNERY_HOST_DATA_DIR")]
    data_dir: Option<PathBuf>,
    /// Agent adapter, as `name=command args…`. Repeatable. With none,
    /// `claude` and `codex` come from the installed adapter set. An agent
    /// never inherits CLAUDE_CODE_EXECUTABLE, CODEX_PATH, CODEX_CONFIG,
    /// DISABLE_MCP_CONFIG_FILTERING or APP_SERVER_LOGS: a command that needs
    /// one sets it itself, e.g. `name=/usr/bin/env CODEX_PATH=… <cmd>`.
    #[arg(long = "agent", value_parser = parse_agent)]
    agents: Vec<(String, AgentCommand)>,
    /// Park sessions idle for this many seconds; 0 turns the reaper off.
    #[arg(long, default_value_t = IDLE_TIMEOUT.as_secs())]
    idle_timeout_secs: u64,
    /// `hennery up` only: join this collector first if the host is not
    /// paired, with the code read from `--join-code-fd`.
    #[arg(long, hide = true, requires = "join_code_fd")]
    join_url: Option<String>,
    #[arg(long, hide = true, requires = "join_url", value_parser = clap::value_parser!(i32).range(3..))]
    join_code_fd: Option<i32>,
    /// `hennery up` only: the collector's host WebSocket as it listens now,
    /// in place of the stored one (its port may have changed).
    #[arg(long, hide = true)]
    collector_url: Option<String>,
    /// `hennery up` only: as for `collector`; at its end-of-file the host
    /// stops, as on SIGTERM.
    #[arg(long, hide = true, value_parser = clap::value_parser!(i32).range(3..))]
    parent_fd: Option<i32>,
    /// A directory to find projects in and to allow browsing under (ACP
    /// core §7): absolute, or `~/…`. Repeatable; when given, replaces
    /// `workspace_roots` in `host.toml`.
    #[arg(long = "workspace-root")]
    workspace_roots: Vec<String>,
    /// With no `--agent`: where the pinned adapter set comes from, if it is
    /// installed at start.
    #[command(flatten)]
    mirrors: runtime::MirrorArgs,
}

#[derive(Args)]
struct UpArgs {
    /// An address to listen on, as for `collector`; repeatable, else
    /// `listen` in the collector's `config.toml` (`<data-dir>/collector`).
    /// The host child connects over the first one that loopback reaches.
    #[arg(long = "listen", env = "HENNERY_LISTEN", value_delimiter = ',')]
    listen: Vec<String>,
    /// As for `collector`, handed on to the collector child.
    #[arg(long, env = "HENNERY_PUBLIC_URL")]
    public_url: Option<String>,
    /// The data root, holding `collector/` and `host/`; else the platform's
    /// (distribution spec §8).
    #[arg(long, env = "HENNERY_DATA_DIR")]
    data_dir: Option<PathBuf>,
    /// Agent adapter for the host child, as for `host run --agent`. With
    /// none, `claude` and `codex` come from the host's installed adapter set
    /// (`<data-dir>/host`; the mirrors from `HENNERY_NPM_REGISTRY` and
    /// `HENNERY_NODE_MIRROR`). No agent inherits CLAUDE_CODE_EXECUTABLE,
    /// CODEX_PATH, CODEX_CONFIG, DISABLE_MCP_CONFIG_FILTERING or
    /// APP_SERVER_LOGS.
    #[arg(long = "agent", value_parser = parse_agent)]
    agents: Vec<(String, AgentCommand)>,
    /// Park sessions idle for this many seconds; 0 turns the reaper off.
    #[arg(long, default_value_t = IDLE_TIMEOUT.as_secs())]
    idle_timeout_secs: u64,
    /// As for `host run`, handed on to the host child: replaces
    /// `workspace_roots` in its `host.toml` (`<data-dir>/host`).
    #[arg(long = "workspace-root")]
    workspace_roots: Vec<String>,
}

fn parse_agent(s: &str) -> Result<(String, AgentCommand), String> {
    let (name, command) = s.split_once('=').ok_or("expected name=command")?;
    let command = AgentCommand::parse(command).ok_or("empty command")?;
    Ok((name.to_string(), command))
}

/// Where the collector listens when nothing says otherwise (kernel spec §7).
const DEFAULT_LISTEN: &str = "127.0.0.1:7117";

/// The most addresses one collector listens on: `up` hands each to its
/// collector child as a descriptor of its own.
pub(crate) const MAX_LISTENERS: usize = 8;

/// The addresses to listen on: those given, else `DEFAULT_LISTEN`. An empty
/// one, or more than `MAX_LISTENERS`, is refused.
fn listen_addresses(given: &[String]) -> Result<Vec<String>> {
    let addresses: Vec<String> = if given.is_empty() {
        vec![DEFAULT_LISTEN.to_string()]
    } else {
        given.iter().map(|a| a.trim().to_string()).collect()
    };
    if addresses.iter().any(String::is_empty) {
        bail!("an empty listen address: give each as host:port");
    }
    if addresses.len() > MAX_LISTENERS {
        bail!(
            "{} listen addresses; at most {MAX_LISTENERS} are supported",
            addresses.len()
        );
    }
    Ok(addresses)
}

/// Bind every address, in order (kernel spec §7): one that cannot be bound
/// fails the start, before anything else is done.
fn bind_all(addresses: &[String]) -> Result<Vec<std::net::TcpListener>> {
    addresses
        .iter()
        .map(|address| {
            let listener = std::net::TcpListener::bind(address).with_context(|| format!("bind {address}"))?;
            listener.set_nonblocking(true)?;
            Ok(listener)
        })
        .collect()
}

impl Command {
    /// The name of the log this command writes when run by a service
    /// (`log::init`): only the long-running ones have one.
    fn log_name(&self) -> Option<&'static str> {
        match self {
            Self::Up(_) => Some("up"),
            Self::Collector(CollectorCli { command: None, .. }) => Some("collector"),
            Self::Host {
                command: HostCommand::Run(_),
            } => Some("host"),
            _ => None,
        }
    }
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    let cli = Cli::parse();
    if let Err(why) = log::init(cli.command.log_name()) {
        eprintln!("Error: {why}");
        return std::process::ExitCode::FAILURE;
    }
    // Every arm returns a `Result<ExitCode>` (not just `Result<()>`), and
    // nothing on this path ever calls `std::process::exit`: that call tears
    // down the whole process immediately, without unwinding this `async fn`
    // or dropping the `#[tokio::main]` runtime — so any other task still
    // running on it (a session actor mid-launch of a slow adapter, say)
    // never gets to run its own `Drop` and never kills its adapter's process
    // group. Returning an `ExitCode` here instead lets the runtime finish
    // and drop normally first, exactly like a plain `Ok(())` return always
    // did; only then does the process actually exit with that code.
    let result = async { match cli.command {
        Command::Collector(CollectorCli {
            command: Some(CollectorCommand::Healthcheck(args)),
            ..
        }) => Ok(collector_healthcheck(args)),
        Command::Collector(CollectorCli {
            run: args,
            command: None,
        }) => run_collector(args).await.map(|()| std::process::ExitCode::SUCCESS),
        Command::Host {
            command: HostCommand::Join(args),
        } => join_host(args).await.map(|()| std::process::ExitCode::SUCCESS),
        Command::Host {
            command: HostCommand::Run(args),
        } => run_host(args).await,
        Command::Host {
            command: HostCommand::Transport {
                command: TransportCommand::Set(args),
            },
        } => {
            let dir = data_dir::host_or_installed(args.data_dir, data_dir::HostUse::Join)?;
            let _guard = hennery_host::pairing::PairingLock::acquire(&dir)?;
            let trust = if let Some(path) = args.ca_cert {
                Some(hennery_host::transport::CollectorTrust::import(&path)?)
            } else if args.system_roots {
                Some(hennery_host::transport::CollectorTrust::System)
            } else {
                None
            };
            let result = hennery_host::pairing::set_transport(&dir, &args.url, trust).await?;
            if result == hennery_host::connection::Standing::Connected {
                println!("another connection still uses this identity");
            }
            println!("transport saved; restart the host (this parks adapters) and resume sessions normally");
            Ok(std::process::ExitCode::SUCCESS)
        }
        Command::Host {
            command:
                HostCommand::Enrollment {
                    command:
                        EnrollmentCommand::Archive {
                            attempt_id,
                            data_dir: given,
                        },
                },
        } => {
            let dir = data_dir::host_or_installed(given, data_dir::HostUse::Join)?;
            let _guard = hennery_host::pairing::PairingLock::acquire(&dir)?;
            hennery_host::enrollment::archive(&dir, &attempt_id)?;
            println!(
                "attempt archived locally; this does not confirm remote revocation. Check Hosts and revoke any entry before a fresh join"
            );
            Ok(std::process::ExitCode::SUCCESS)
        }
        Command::Host {
            command: HostCommand::Adapters { command },
        } => runtime::run(command).await.map(|()| std::process::ExitCode::SUCCESS),
        Command::Up(args) => run_up(args).await,
        Command::Admin(args) => admin::run(args).await.map(|()| std::process::ExitCode::SUCCESS),
        Command::Service(args) => service::run(args),
        Command::Doctor(args) => doctor::run(args),
    } }.await;
    match result {
        Ok(code) => code,
        // `{err:?}`, not `{err:#}`: this replaces the default `Result<(),
        // E>` `Termination`, which prints via `Debug` — keep the same output
        // other tests (and operators) already read the exit-1 path by.
        Err(err) => {
            eprintln!("Error: {err:?}");
            std::process::ExitCode::FAILURE
        }
    }
}

/// `collector healthcheck`: 0 if healthy, else 1 and why, on standard
/// error (Docker keeps it in the container's health log).
fn collector_healthcheck(args: HealthcheckArgs) -> std::process::ExitCode {
    let checked = (|| {
        let file = match &args.data_dir {
            Some(dir) => config::FileConfig::load(dir)?,
            None => config::FileConfig::default(),
        };
        let addresses = listen_addresses(&file.listen(&args.listen)?)?;
        healthcheck::check(healthcheck::probe_address(&addresses[0])?, healthcheck::TIMEOUT)
    })();
    match checked {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("unhealthy: {err:#}");
            std::process::ExitCode::FAILURE
        }
    }
}

async fn run_collector(args: CollectorArgs) -> Result<()> {
    let data_dir = data_dir::or_default(args.data_dir.clone(), service::unit::Role::Collector)?;
    // First: a SIGINT or SIGTERM from here on shuts down cleanly, removing
    // the admin socket, instead of killing the collector by the default
    // action while it starts.
    let mut signals = Signals::new()?;
    // Before anything is created: the pipe `up` hands over, or a clear
    // refusal.
    if let Some(fd) = args.pairing_code_fd {
        inherit::check_pipe("--pairing-code-fd", fd)?;
    }
    let parent = args.parent_fd.map(inherit::watch_parent).transpose()?;
    warn_if_dev_token();
    let file = config::FileConfig::load(&data_dir)?;
    // Named by its source: an operator cannot otherwise tell whether a flag,
    // `HENNERY_PUBLIC_URL` or the file gave the bad value.
    let public_url_source = if args.public_url.is_some() {
        "--public-url or HENNERY_PUBLIC_URL".to_string()
    } else {
        data_dir.join(config::CONFIG_FILE).display().to_string()
    };
    let public_url = file
        .public_url(args.public_url.as_deref())
        .map(|url| {
            PublicUrl::parse(&url)
                .map_err(|why| anyhow::anyhow!("{why}"))
                .with_context(|| public_url_source.clone())
        })
        .transpose()?;
    // Before anything is created: a descriptor that is not a listening TCP
    // socket, or an address that is taken, must fail here, and clearly.
    let listeners = if args.listen_fd.is_empty() {
        bind_all(&listen_addresses(&file.listen(&args.listen)?)?)?
    } else {
        if args.listen_fd.len() > MAX_LISTENERS {
            bail!("more than {MAX_LISTENERS} --listen-fd");
        }
        // One socket adopted twice would be two owners of one descriptor.
        for (i, fd) in args.listen_fd.iter().enumerate() {
            if args.listen_fd[..i].contains(fd) {
                bail!("--listen-fd {fd} is given twice");
            }
        }
        args.listen_fd
            .iter()
            .map(|&fd| inherited_listener(fd))
            .collect::<Result<_>>()?
    };
    private_data_dir(&data_dir)?;
    // Before the database and the setup link: a second collector on this
    // data directory stops here, while the first still answers on it.
    let admin_socket = hennery_kernel::admin::bind(&data_dir)?;
    let db = data_dir.join("hennery.db");
    let store = Store::open(&db)?;
    let hosts = Hosts::open(&db)?;
    let operator = Operator::open(&db)?;
    let mut state = AppState::new(store, hosts, operator);
    // Before anything serves: every push subscription is bound to this key
    // (kernel spec §6).
    state.vapid = std::sync::Arc::new(hennery_kernel::push::VapidKey::load_or_create(&data_dir)?);
    // The collector's one outbound HTTP policy (kernel spec §7.1), built
    // once: Web Push takes it here, and the gateway shares this same one
    // (agreed with plan 8), never a second. Delivery starts before anything
    // serves, so a notice queued meanwhile reaches it, not the queue nobody
    // reads (plan 10b-ii).
    let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT)?;
    start_push(&mut state, &egress);
    // Before serving: the gateway's store, and the master key that opens
    // what it holds (plan 8a), from `HENNERY_MASTER_KEY`, a systemd
    // credential or `<data>/master.key`. A key that is missing while
    // credentials are stored, or that does not open them, stops the start
    // (plan 8a decision 8; `KeyUnavailable` tells that case apart).
    let keys = hennery_gateway::key::KeySource::from_env(&data_dir)?;
    let (gateway, proxy) = start_gateway(&db, &keys, &state, &egress, hennery_gateway::probe::EVERY).await?;
    state.offline_threshold = std::time::Duration::from_secs(args.host_offline_secs);
    hennery_sessions::offline::after_startup(&state);
    hennery_sessions::sweep::after_startup(&state);
    let listeners = listeners
        .into_iter()
        .map(tokio::net::TcpListener::from_std)
        .collect::<std::io::Result<Vec<_>>>()
        .context("serve the listening sockets")?;
    // One line per listener, in order: the first names the setup link's port.
    let mut addresses = Vec::new();
    for listener in &listeners {
        let address = listener.local_addr()?;
        tracing::info!(%address, "collector listening");
        addresses.push(address);
    }
    // Only once listening: the link names the first listener's port, unless
    // there is a `public_url` to name (kernel spec §3.1).
    let base_url = match &public_url {
        Some(url) => url.origin().to_string(),
        None => format!("http://localhost:{}", addresses[0].port()),
    };
    warn_if_public_url_differs(state.operator.public_url().as_ref(), public_url.as_ref());
    if let Some(link) = state
        .operator
        .announce_setup(&data_dir, &base_url, hennery_kernel::secret::unix_now())?
    {
        announce_setup(&link);
    }
    if let Some(fd) = args.pairing_code_fd {
        // Only once migrated and listening: the host enrolls right away.
        let code = state
            .hosts
            .mint_local_pairing_code(hennery_kernel::secret::unix_now())?;
        // The host child may have died already (e.g. it could not bind, or
        // was killed) — closing its end of the pipe before this write. That
        // is the host's problem, not the collector's: it must keep serving
        // every other route regardless. Logged without the code itself.
        if let Err(err) = inherit::write_code(fd, &code.code) {
            tracing::warn!(error = %err, "could not hand the pairing code to the host child");
        }
    }
    let shutdown = state.shutdown.clone();
    tokio::spawn(async move {
        tokio::select! {
            () = signals.recv() => {}
            () = inherit::parent_gone(parent) => {}
        }
        shutdown.cancel();
    });
    // Served on the router's own operator and registry (kernel spec §4.2).
    let admin = admin_socket.map(|socket| {
        let admin = hennery_kernel::admin::Admin {
            operator: state.operator.clone(),
            hosts: state.hosts.clone(),
            dir: data_dir.clone(),
            base_url,
        };
        tokio::spawn(hennery_kernel::admin::serve(
            socket,
            admin,
            state.shutdown.clone().cancelled_owned(),
        ))
    });
    let served = hennery_sessions::serve_all(
        listeners,
        hennery_sessions::router(state.clone())
            .merge(hennery_gateway::api::router(gateway))
            .merge(hennery_gateway::proxy::router(proxy)),
        state.shutdown.clone(),
    )
    .await;
    // Also when serving failed: the admin socket is removed once it stops.
    state.shutdown.cancel();
    if let Some(admin) = admin {
        let _ = admin.await;
    }
    served?;
    Ok(())
}

/// Adopt `--listen-fd`: `fd` must be an open, listening TCP socket. Anything
/// else is refused, not adopted: a closed descriptor would abort the process
/// on first use, a UDP or unconnected socket would hang it, and a Unix
/// socket would be served as if it were TCP. The socket is made
/// close-on-exec and non-blocking.
fn inherited_listener(fd: i32) -> Result<std::net::TcpListener> {
    let option = |name: libc::c_int| -> std::io::Result<libc::c_int> {
        let mut value: libc::c_int = 0;
        let mut len = std::mem::size_of::<libc::c_int>() as libc::socklen_t;
        // SAFETY: getsockopt(2) into a local int of the size it is told.
        let rc = unsafe { libc::getsockopt(fd, libc::SOL_SOCKET, name, (&raw mut value).cast(), &mut len) };
        if rc < 0 {
            Err(std::io::Error::last_os_error())
        } else {
            Ok(value)
        }
    };
    // SAFETY: fcntl(2) on a descriptor number; it only reads its flags.
    let flags = unsafe { libc::fcntl(fd, libc::F_GETFD) };
    if flags < 0 {
        bail!(
            "--listen-fd {fd} is not an open descriptor: {}",
            std::io::Error::last_os_error()
        );
    }
    let kind = option(libc::SO_TYPE).with_context(|| format!("--listen-fd {fd} is not a socket"))?;
    if kind != libc::SOCK_STREAM {
        bail!("--listen-fd {fd} is not a stream (TCP) socket");
    }
    let family = socket_family(fd).with_context(|| format!("--listen-fd {fd}: getsockname"))?;
    if family != libc::AF_INET && family != libc::AF_INET6 {
        bail!("--listen-fd {fd} is not a TCP socket (address family {family}, not IPv4 or IPv6)");
    }
    let listening = match option(libc::SO_ACCEPTCONN) {
        Ok(value) => value == 1,
        // macOS has no `SO_ACCEPTCONN` to read; its TCP state tells.
        Err(err) if err.raw_os_error() == Some(libc::ENOPROTOOPT) => {
            listens_by_tcp_state(fd).with_context(|| format!("--listen-fd {fd}: TCP_CONNECTION_INFO"))?
        }
        Err(err) => return Err(err).with_context(|| format!("--listen-fd {fd}: SO_ACCEPTCONN")),
    };
    if !listening {
        bail!("--listen-fd {fd} is not a listening socket");
    }
    // SAFETY: as above; the flags just read, plus close-on-exec.
    if unsafe { libc::fcntl(fd, libc::F_SETFD, flags | libc::FD_CLOEXEC) } < 0 {
        return Err(std::io::Error::last_os_error()).context("make --listen-fd close-on-exec");
    }
    // SAFETY: `fd` is an open listening socket, inherited for exactly this;
    // nothing else in this process owns it.
    let listener = unsafe { <std::net::TcpListener as std::os::fd::FromRawFd>::from_raw_fd(fd) };
    listener.set_nonblocking(true)?;
    Ok(listener)
}

/// The address family of socket `fd`, from getsockname(2).
fn socket_family(fd: i32) -> std::io::Result<libc::c_int> {
    // SAFETY: getsockname(2) into local storage of the size it is told;
    // all-zero bytes are a valid `sockaddr_storage`.
    unsafe {
        let mut addr: libc::sockaddr_storage = std::mem::zeroed();
        let mut len = std::mem::size_of::<libc::sockaddr_storage>() as libc::socklen_t;
        if libc::getsockname(fd, (&raw mut addr).cast(), &mut len) < 0 {
            return Err(std::io::Error::last_os_error());
        }
        Ok(libc::c_int::from(addr.ss_family))
    }
}

/// Whether TCP socket `fd` listens, from its TCP state (`TCPS_LISTEN`):
/// macOS's stand-in for `SO_ACCEPTCONN`. A socket bound and never listened
/// on is refused, as is one never bound and a connected one.
#[cfg(target_vendor = "apple")]
fn listens_by_tcp_state(fd: i32) -> std::io::Result<bool> {
    /// `TCPS_LISTEN` in `<netinet/tcp_fsm.h>`.
    const TCPS_LISTEN: u8 = 1;
    // SAFETY: all-zero bytes are a valid `tcp_connection_info` (integers).
    let mut info: libc::tcp_connection_info = unsafe { std::mem::zeroed() };
    let mut len = std::mem::size_of::<libc::tcp_connection_info>() as libc::socklen_t;
    // SAFETY: getsockopt(2) into a local struct of the size it is told.
    let rc = unsafe {
        libc::getsockopt(
            fd,
            libc::IPPROTO_TCP,
            libc::TCP_CONNECTION_INFO,
            (&raw mut info).cast(),
            &mut len,
        )
    };
    if rc < 0 {
        return Err(std::io::Error::last_os_error());
    }
    Ok(info.tcpi_state == TCPS_LISTEN)
}

/// Elsewhere `SO_ACCEPTCONN` answers, so this is never reached.
#[cfg(not(target_vendor = "apple"))]
fn listens_by_tcp_state(_fd: i32) -> std::io::Result<bool> {
    Err(std::io::Error::from_raw_os_error(libc::ENOPROTOOPT))
}

/// The development bearer's variable, from before 3b-i. Nothing reads it
/// now; it is still stripped from every child (`HOST_SECRET_VARS`).
const DEV_TOKEN_VAR: &str = "HENNERY_DEV_TOKEN";

/// Warn, once at start, that `HENNERY_DEV_TOKEN` does nothing any more: a
/// service definition that still sets it would otherwise look like it
/// protects something. Its value is never logged.
fn warn_if_dev_token() {
    if std::env::var_os(DEV_TOKEN_VAR).is_some() {
        tracing::warn!(
            "{DEV_TOKEN_VAR} is set but no longer used: since operator auth (3b-i), operators sign in through \
             the setup link and a password; remove it from the environment"
        );
    }
}

/// Once set up, the stored `public_url` is the one in effect (kernel spec
/// §2): a configured one that differs is named in a warning, not used.
fn warn_if_public_url_differs(stored: Option<&PublicUrl>, configured: Option<&PublicUrl>) {
    if let (Some(stored), Some(configured)) = (stored, configured)
        && stored != configured
    {
        tracing::warn!(
            stored = stored.origin(),
            configured = configured.origin(),
            "the configured public_url is not the one setup stored, which stays in effect; \
             run `hennery admin reset-public-url` to move it"
        );
    }
}

/// Tell the operator where the setup link is (kernel spec §3.1): the link
/// itself only to a terminal, so the token never lands in a log collector;
/// otherwise only the path of the file that holds it.
fn announce_setup(link: &SetupLink) {
    use std::io::IsTerminal;
    if std::io::stdout().is_terminal() {
        println!(
            "hennery is not set up yet. Open this link within the hour to set it up:\n  {}",
            link.url
        );
    } else {
        tracing::info!(
            file = %link.file.display(),
            "hennery is not set up yet; the one-time setup link (valid for an hour) is in this file"
        );
    }
}

/// Create `dir`, and any parent it lacks, 0700 whatever the umask: the
/// collector's database holds what only its user may read (decision 5). A
/// directory that already exists is the operator's and is left as it is,
/// but named in a warning if other users can reach into it.
fn private_data_dir(dir: &std::path::Path) -> Result<()> {
    hennery_host::identity::create_private_dir(dir)?;
    if !hennery_host::identity::is_private(dir)? {
        tracing::warn!(
            dir = %dir.display(),
            "the data directory is readable by other users; `chmod 700` it"
        );
    }
    Ok(())
}

async fn join_host(args: JoinArgs) -> Result<()> {
    let data_dir = data_dir::host_or_installed(args.data_dir.clone(), data_dir::HostUse::Join)?;
    hennery_host::identity::create_private_dir(&data_dir)?;
    let _guard = hennery_host::pairing::PairingLock::acquire(&data_dir)?;
    let trust = args
        .ca_cert
        .as_deref()
        .map(hennery_host::transport::CollectorTrust::import)
        .transpose()?;
    let prepared = hennery_host::pairing::prepare_join(&args.url, trust, &data_dir).await?;
    // Before the code is spent: a bad mirror stops the join here.
    if !args.no_runtime {
        args.mirrors.sources()?;
    }
    let name = args.name.unwrap_or_else(hennery_host::pairing::default_name);
    let code = match (&prepared, args.code) {
        (hennery_host::pairing::PreparedJoin::Already(_), _) => String::new(),
        (_, Some(code)) => code,
        (_, None) => read_code_from_stdin()?,
    };
    let host_id = match hennery_host::pairing::complete_join(prepared, &code, &data_dir, &name).await? {
        Joined::Paired { host_id } => {
            println!("paired as {host_id}");
            host_id
        }
        Joined::AlreadyPaired { host_id } => {
            println!("already paired as {host_id}");
            host_id
        }
    };
    if args.no_runtime {
        return Ok(());
    }
    // Then the runtime (distribution spec §3.2); the pairing stands either way.
    runtime::after_join(&data_dir, &host_id, &args.use_cli, &args.mirrors).await
}

/// The most bytes of standard input `host join` takes for one code: a code
/// is 9 characters, so this leaves room for whitespace and nothing else.
const MAX_CODE_LINE: usize = 256;

/// One line of standard input, prompted for on a terminal. Read only up to
/// `MAX_CODE_LINE` bytes: a longer line is refused once that many have come,
/// not waited on to its end, and never echoed.
fn read_code_from_stdin() -> Result<String> {
    use std::io::{BufRead, IsTerminal, Read, Write};
    if std::io::stdin().is_terminal() {
        eprint!("Pairing code: ");
        std::io::stderr().flush()?;
    }
    // One byte over the bound: `MAX_CODE_LINE` bytes and then the newline
    // is still a line within it.
    let mut line = Vec::new();
    std::io::stdin()
        .lock()
        .take(MAX_CODE_LINE as u64 + 1)
        .read_until(b'\n', &mut line)
        .context("read the pairing code from standard input")?;
    if line.len() > MAX_CODE_LINE && line.last() != Some(&b'\n') {
        bail!("the pairing code on standard input is longer than {MAX_CODE_LINE} bytes");
    }
    let Ok(line) = String::from_utf8(line) else {
        bail!("the pairing code on standard input is not UTF-8");
    };
    let code = line.trim().to_string();
    if code.is_empty() {
        bail!("no pairing code: give it after the URL, or on standard input");
    }
    Ok(code)
}

async fn run_host(args: HostArgs) -> Result<std::process::ExitCode> {
    let data_dir = data_dir::host_or_installed(args.data_dir.clone(), data_dir::HostUse::Run)?;
    // Before anything else, the paired branch's `close` included: the pipe
    // `up` hands over, or a clear refusal.
    if let Some(fd) = args.join_code_fd {
        inherit::check_pipe("--join-code-fd", fd)?;
    }
    let parent = args.parent_fd.map(inherit::watch_parent).transpose()?;
    let under_up = args.parent_fd.is_some();
    // Before the first spawn, the installer's included: the pipe whose
    // end-of-file kills every adapter's group when this host dies.
    hennery_host::adapter::prepare_death_pipe().context("the adapters' death pipe")?;
    warn_if_dev_token();
    let home = hennery_host::projects::home_dir();
    // The flags first, before anything is paired: a bad one must not spend
    // a pairing code (decision 6). The file's roots are checked below.
    if !args.workspace_roots.is_empty() {
        hennery_host::projects::workspace_roots(&args.workspace_roots, &[], home.as_deref())?;
    }
    // Held until this returns (distribution spec §8): a second host on this
    // data directory stops here, before anything reads its pairing.
    // `Paired::load` is not only a read: it rolls an interrupted pairing
    // forward (renames, and moves the outbox aside). A directory that is not
    // there yet is made, 0700, only by `up`'s first start, which pairs in it.
    if !data_dir.exists() && args.join_url.is_some() {
        hennery_host::identity::create_private_dir(&data_dir)?;
    }
    if !data_dir.is_dir() {
        bail!(
            "{} holds no pairing; run `hennery host join <url> <code>` first",
            data_dir.display()
        );
    }
    let _lock = lock::acquire(&data_dir, lock::HOST_LOCK, "hennery host run")?;
    let paired = match Paired::load(&data_dir)? {
        Some(paired) => {
            // Paired already (kernel spec §4.2): the code is not needed.
            if let Some(fd) = args.join_code_fd {
                inherit::close(fd);
            }
            paired
        }
        None => {
            hennery_host::enrollment::require_automatic_join_allowed(&data_dir)?;
            let (Some(url), Some(fd)) = (&args.join_url, args.join_code_fd) else {
                bail!(
                    "{} holds no pairing; run `hennery host join <url> <code>` first",
                    data_dir.display()
                );
            };
            let code = inherit::read_code(fd).await?;
            let name = hennery_host::pairing::default_name();
            hennery_host::pairing::join_locked(url, &code, &data_dir, &name, None).await?;
            Paired::load(&data_dir)?.context("the pairing just stored")?
        }
    };
    let collector_url = args
        .collector_url
        .clone()
        .unwrap_or_else(|| paired.collector_url.clone());
    let endpoint = hennery_host::transport::CollectorEndpoint::stored(&collector_url)?;
    hennery_host::transport::CollectorEndpoint::stored(&paired.collector_url)?.require_compatible(&endpoint)?;
    hennery_host::transport::CollectorTransport::new(endpoint, paired.trust.clone())?;
    // Checked before connecting: a bad root fails the start (decision 6).
    let workspace_roots =
        hennery_host::projects::workspace_roots(&args.workspace_roots, &paired.workspace_roots, home.as_deref())?;
    // No `--agent`: `claude` and `codex` from the installed set, the pinned
    // one installed first if it is not current (distribution spec §3.2).
    // The set stays held in use while the host runs.
    // A `--agent` command is a generic agent (ACP core §6): no profile.
    // With `--agent`, no app-server either: a Codex forget takes the
    // fallback.
    let (agents, profiles, codex_app_server, _set_in_use) = if args.agents.is_empty() {
        runtime::default_agents(&data_dir, &args.mirrors).await
    } else {
        (args.agents.into_iter().collect(), Default::default(), None, None)
    };
    // The pairing's collector, as `host join` takes it again: never a
    // `--collector-url` override (development only).
    let paired_collector = paired.collector_url.clone();
    // What a revoke records, beside the pairing it names.
    let record_dir = data_dir.clone();
    let revoke = revoked::Revoked {
        host_id: paired.host_id.clone(),
        collector_url: paired_collector,
        at: 0,
    };
    let mut cfg = HostConfig::new(collector_url, paired.host_id, paired.key, data_dir);
    cfg.trust = paired.trust;
    cfg.workspace_roots = workspace_roots;
    cfg.home = home;
    cfg.agents = agents;
    cfg.profiles = profiles;
    cfg.codex_app_server = codex_app_server;
    cfg.idle_timeout = std::time::Duration::from_secs(args.idle_timeout_secs);
    // On SIGINT/SIGTERM, and on a revoke, the host stops its connection and
    // waits (bounded) for every session actor to SIGTERM its adapter's group
    // and SIGKILL it after the grace. `run_until` returning — however it
    // returns — is what lets `main` return in turn, which is what lets the
    // `#[tokio::main]` runtime drop normally: only that drop reaps any
    // actor `run_until`'s own bound gave up waiting on (one still starting a
    // slow adapter, say), by dropping its still-running task and, with it,
    // the `Adapter` whose `Drop` kills the whole process group. A bare
    // `std::process::exit` here would skip all of that.
    // `up` gone (its pipe's end-of-file) stops the host as a signal does.
    let shutdown = async {
        tokio::select! {
            () = terminated() => {}
            () = inherit::parent_gone(parent) => {}
        }
    };
    match hennery_host::run_until(cfg, shutdown).await {
        // Its own exit code, so `hennery up` can tell a revoke apart; and a
        // record of it, still under `host.lock`, for `service status` and
        // doctor (launchd's host exits 0, so the code does not say it).
        Err(err) if hennery_host::connection::revoked(&err) => {
            eprintln!("Error: {err:#}");
            let revoke = revoked::Revoked {
                at: hennery_kernel::secret::unix_now(),
                ..revoke
            };
            if let Err(why) = revoked::record(&record_dir, &revoke) {
                eprintln!("warning: the revoke could not be recorded: {why:#}");
            }
            let code = revoked::exit_code(std::env::var("HENNERY_SERVICE").ok().as_deref(), under_up);
            if code == 0 {
                // SAFETY: getuid(2) cannot fail.
                let uid = unsafe { libc::getuid() };
                let start = format!("launchctl kickstart -k gui/{uid}/{}", service::unit::Role::Host.label());
                let (_, fix) = revoke.said(&start);
                eprintln!(
                    "this host stays down: launchd does not start it again after exit 0. To bring it back, {fix}"
                );
            }
            Ok(std::process::ExitCode::from(code))
        }
        Err(err) => Err(err),
        Ok(()) => Ok(std::process::ExitCode::SUCCESS),
    }
}

/// Resolves on SIGINT or SIGTERM.
async fn terminated() {
    let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).expect("SIGTERM handler");
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {}
        _ = term.recv() => {}
    }
}

/// SIGINT and SIGTERM for `up` and the collector, caught from the moment it
/// is made: unlike `terminated`, whose handlers exist only once it is first
/// polled.
struct Signals {
    interrupt: tokio::signal::unix::Signal,
    terminate: tokio::signal::unix::Signal,
}

impl Signals {
    fn new() -> Result<Self> {
        use tokio::signal::unix::{SignalKind, signal};
        Ok(Self {
            interrupt: signal(SignalKind::interrupt()).context("SIGINT handler")?,
            terminate: signal(SignalKind::terminate()).context("SIGTERM handler")?,
        })
    }

    /// Resolves on the next SIGINT or SIGTERM, also one sent before it was
    /// called.
    async fn recv(&mut self) {
        tokio::select! {
            _ = self.interrupt.recv() => {}
            _ = self.terminate.recv() => {}
        }
    }
}

/// The collector's URL as its own host child reaches it: over loopback,
/// also when it listens on every interface.
fn loopback_url(listen: &str) -> String {
    match listen.parse::<SocketAddr>() {
        Ok(addr) if addr.ip().is_unspecified() && addr.is_ipv6() => format!("http://[::1]:{}", addr.port()),
        Ok(addr) if addr.ip().is_unspecified() => format!("http://127.0.0.1:{}", addr.port()),
        _ => format!("http://{listen}"),
    }
}

/// `up`'s host child, but for the pairing descriptor (`UpChildren::host`
/// adds it).
fn host_command(
    exe: &std::path::Path,
    host_dir: &std::path::Path,
    collector_ws_url: &str,
    args: &UpArgs,
) -> tokio::process::Command {
    let mut host_cmd = tokio::process::Command::new(exe);
    host_cmd
        .args(["host", "run"])
        .arg("--data-dir")
        .arg(host_dir)
        .arg("--collector-url")
        .arg(collector_ws_url)
        .arg("--idle-timeout-secs")
        .arg(args.idle_timeout_secs.to_string())
        .kill_on_drop(true)
        .process_group(0);
    // `up` may still have the old development token in its environment (a
    // shell set up before it was removed); the host needs none, and its
    // agents must never see it. The adapter spawn strips the same list
    // again, for a host started by hand.
    for var in hennery_host::adapter::HOST_SECRET_VARS {
        host_cmd.env_remove(var);
    }
    for root in &args.workspace_roots {
        host_cmd.arg("--workspace-root").arg(root);
    }
    for (name, command) in &args.agents {
        let mut spec = format!("{name}={}", command.program);
        for a in &command.args {
            spec.push(' ');
            spec.push_str(a);
        }
        host_cmd.arg("--agent").arg(spec);
    }
    host_cmd
}

/// What a host data directory holds of a pairing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Pairing {
    None,
    /// `host.key` and `host.toml`.
    Whole,
    /// Staged by a join and not yet put in place (`host.toml.pending`).
    Interrupted,
}

/// What `dir` holds of a host's pairing, from the files alone. Not
/// `Paired::load`, which rolls an interrupted pairing forward (renames, the
/// outbox moved aside): only the host may do that, under `host.lock`
/// (decision 8 of plan 7c).
fn pairing_in(dir: &std::path::Path) -> Pairing {
    use hennery_host::identity::{CONFIG_FILE, KEY_FILE};
    if dir.join(format!("{CONFIG_FILE}.pending")).exists() || hennery_host::enrollment::has_artifacts(dir) {
        Pairing::Interrupted
    } else if dir.join(KEY_FILE).is_file() && dir.join(CONFIG_FILE).is_file() {
        Pairing::Whole
    } else {
        Pairing::None
    }
}

/// What `up` starts its children from, again after a crash.
struct UpChildren<'a> {
    exe: PathBuf,
    args: &'a UpArgs,
    /// `up`'s data root.
    data_dir: PathBuf,
    host_dir: PathBuf,
    collector_url: String,
    collector_ws_url: String,
    /// Bound once, by `up`, and kept for as long as it runs: a collector
    /// started again serves the same ports, which the host's URL names.
    /// While none runs, connections wait in the backlog.
    listeners: Vec<std::net::TcpListener>,
    /// Made before the first child and held until `up` ends: every child
    /// gets the reading end (`--parent-fd`), and only `up` holds the
    /// writing end, so however `up` dies, each child reads end-of-file and
    /// stops (plan 7c-iii).
    parent: (std::io::PipeReader, std::io::PipeWriter),
}

impl UpChildren<'_> {
    /// The collector child, handed the listening sockets and, on the first
    /// start of a host that is not paired, the pipe's writing end.
    fn collector(&self, pairing: Option<&std::io::PipeWriter>) -> tokio::process::Command {
        // Both children are kept out of the terminal's foreground process
        // group: a Ctrl-C there delivers SIGINT to every process in that
        // group at once, which would race each child's own signal handler
        // against the ordered shutdown. With their own group, only this
        // supervisor is signalled and it alone decides the order (host, then
        // collector).
        let mut cmd = tokio::process::Command::new(&self.exe);
        cmd.arg("collector");
        let mut fds = Vec::new();
        for (listener, to) in self.listeners.iter().zip(inherit::LISTENER_FD..) {
            cmd.arg("--listen-fd").arg(to.to_string());
            fds.push((listener.as_raw_fd(), to));
        }
        cmd.arg("--data-dir")
            .arg(self.data_dir.join("collector"))
            // `up` has warned about it already; the collector has no use for it.
            .env_remove(DEV_TOKEN_VAR)
            // `up` bound these addresses already; the child takes the sockets.
            .env_remove("HENNERY_LISTEN")
            .kill_on_drop(true)
            .process_group(0);
        if let Some(public_url) = &self.args.public_url {
            cmd.arg("--public-url").arg(public_url);
        }
        if let Some(writer) = pairing {
            fds.push((writer.as_raw_fd(), inherit::CHILD_FD));
            cmd.arg("--pairing-code-fd").arg(inherit::CHILD_FD.to_string());
        }
        fds.push((self.parent.0.as_raw_fd(), inherit::PARENT_FD));
        cmd.arg("--parent-fd").arg(inherit::PARENT_FD.to_string());
        inherit::pass_to_child(&mut cmd, &fds);
        cmd
    }

    /// The host child, handed the pipe's reading end on its first start if
    /// it is not paired.
    fn host(&self, pairing: Option<&std::io::PipeReader>) -> tokio::process::Command {
        let mut cmd = host_command(&self.exe, &self.host_dir, &self.collector_ws_url, self.args);
        let mut fds = vec![(self.parent.0.as_raw_fd(), inherit::PARENT_FD)];
        cmd.arg("--parent-fd").arg(inherit::PARENT_FD.to_string());
        if let Some(reader) = pairing {
            fds.push((reader.as_raw_fd(), inherit::CHILD_FD));
            cmd.arg("--join-url")
                .arg(&self.collector_url)
                .arg("--join-code-fd")
                .arg(inherit::CHILD_FD.to_string());
        }
        inherit::pass_to_child(&mut cmd, &fds);
        cmd
    }
}

impl supervisor::Children for UpChildren<'_> {
    type Child = tokio::process::Child;

    fn spawn(&mut self, which: supervisor::Which) -> Result<tokio::process::Child> {
        let mut cmd = match which {
            supervisor::Which::Collector => self.collector(None),
            supervisor::Which::Host => self.host(None),
        };
        Ok(cmd.spawn()?)
    }

    fn host_paired(&self) -> bool {
        pairing_in(&self.host_dir) == Pairing::Whole
    }

    fn revoked(&self) {
        tracing::warn!(
            "the all-in-one host was revoked; the collector keeps serving. To pair it again, stop `hennery up`, remove {} and {}, and start it again",
            self.host_dir.join(hennery_host::identity::KEY_FILE).display(),
            self.host_dir.join(hennery_host::identity::CONFIG_FILE).display()
        );
    }
}

/// Two child processes of this binary, exchanging the same frames as a
/// remote host (architecture spec §3.3), started again when they crash
/// (distribution spec §5.2; see `supervisor::supervise`). `up` exits 0 when
/// a signal stopped it, and 1 when it could not go on.
async fn run_up(args: UpArgs) -> Result<std::process::ExitCode> {
    let data_dir = data_dir::or_default(args.data_dir.clone(), service::unit::Role::Up)?;
    // First, before any child exists: from here on a SIGINT or SIGTERM is
    // caught and waits for `supervisor::supervise`, which stops both
    // children. Caught
    // only once the loop first ran, one sent just after the collector's
    // spawn killed `up` by the default action and left that collector
    // running with nobody to stop it.
    let mut signals = Signals::new()?;
    warn_if_dev_token();
    let exe = std::env::current_exe()?;
    let host_dir = data_dir.join("host");
    let file = config::FileConfig::load(&data_dir.join("collector"))?;
    let addresses = listen_addresses(&file.listen(&args.listen)?)?;
    // Validated before any child starts: with no address that loopback
    // reaches (or only schemes it cannot make sense of) `up` fails here,
    // not after the collector is already up and serving.
    let Some(host_listener) = addresses.iter().position(|address| {
        let candidate = loopback_url(address);
        // Port 0 requests an ephemeral local listener. Validate the
        // address here; the transport uses its nonzero bound port below.
        let candidate = candidate
            .strip_suffix(":0")
            .map(|base| format!("{base}:1"))
            .unwrap_or(candidate);
        hennery_host::pairing::collector_ws_url(&candidate).is_ok()
    }) else {
        let err = hennery_host::pairing::collector_ws_url(&loopback_url(&addresses[0]))
            .expect_err("no address passed the check");
        return Err(err.context("the all-in-one host reaches its collector over loopback"));
    };
    // Bound here and handed to the collector child, so the host's URL names
    // the port the collector serves on, also for `--listen` port 0. Before
    // the data root is touched: a busy port leaves nothing behind.
    let listeners = bind_all(&addresses)?;
    let collector_url = loopback_url(&listeners[host_listener].local_addr()?.to_string());
    let collector_ws_url = hennery_host::pairing::collector_ws_url(&collector_url)?;
    // Before either child creates its own directory in it.
    private_data_dir(&data_dir)?;
    // Held until `up` returns, before either child starts: a second `up` on
    // this data root would run a second collector on its database, also
    // where the collector's admin socket cannot tell (its path too long).
    let _lock = lock::acquire(&data_dir, lock::UP_LOCK, "hennery up")?;
    // up's listener-derived override must not downgrade stored WSS, and
    // uncertainty must stop before collector spawn/code minting.
    if host_dir.is_dir() {
        let _guard = hennery_host::pairing::PairingLock::acquire(&host_dir)?;
        hennery_host::enrollment::require_resolved(&host_dir)?;
        if let Some(stored) = hennery_host::identity::stored_endpoint(&host_dir)? {
            stored.require_compatible(&hennery_host::transport::CollectorEndpoint::stored(&collector_ws_url)?)?;
        }
    }
    // The host pairs itself on first start only; a pairing that was revoked
    // is not replaced (kernel spec §4.2). One left half-done needs no code:
    // the host child finishes it, under its lock.
    let pairing = match pairing_in(&host_dir) {
        Pairing::Whole | Pairing::Interrupted => None,
        Pairing::None => {
            hennery_host::enrollment::require_automatic_join_allowed(&host_dir)?;
            Some(std::io::pipe()?)
        }
    };
    let mut children = UpChildren {
        exe,
        args: &args,
        data_dir: data_dir.clone(),
        host_dir,
        collector_url,
        collector_ws_url,
        listeners,
        // Made here, before any child: on macOS `std::io::pipe` marks its
        // ends close-on-exec only after making them, so a spawn on another
        // thread meanwhile could inherit the writing end and keep it open.
        // Nothing else spawns while `up` starts, and it is never made again.
        parent: std::io::pipe()?,
    };
    // A low `ulimit -n` can make `pass_to_child`'s `F_DUPFD_CLOEXEC` at
    // `MOVE_FLOOR` fail with a bare "Invalid argument (os error 22)": named
    // here so that is not left a mystery.
    let collector = children
        .collector(pairing.as_ref().map(|(_, writer)| writer))
        .spawn()
        .context("pass the listening sockets to the collector")?;
    let host = children.host(pairing.as_ref().map(|(reader, _)| reader)).spawn()?;
    // Both children hold their ends now; with the supervisor's copies
    // closed, the host sees end-of-file if the collector dies first.
    drop(pairing);
    let report = |collector: &supervisor::ChildReport, host: &supervisor::ChildReport| {
        let state = supervisor::State {
            pid: std::process::id(),
            updated_at: hennery_kernel::secret::unix_now().try_into().unwrap_or(0),
            collector: collector.clone(),
            host: host.clone(),
        };
        if let Err(err) = supervisor::write_state(&data_dir, &state) {
            tracing::warn!(error = %format!("{err:#}"), "could not write {}", supervisor::STATE_FILE);
        }
    };
    let outcome = supervisor::supervise(
        &mut children,
        collector,
        host,
        &supervisor::POLICY,
        signals.recv(),
        report,
    )
    .await;
    match outcome {
        supervisor::Outcome::Stopped => Ok(std::process::ExitCode::SUCCESS),
        supervisor::Outcome::Failed(why) => {
            eprintln!("Error: {why}");
            Ok(std::process::ExitCode::FAILURE)
        }
    }
}

/// The gateway on `db` (plans 8a, 8d, 8f), with the proxy on the same
/// runtime, so a connection's refresh lock is one:
/// - its `Notifier` is Web Push (lane L9): a connection moving into or out
///   of `needs_auth` or `error` is a notice under its hat's push policy;
/// - its OAuth calls go through the collector's one `egress`, shared with
///   Web Push;
/// - a problem already there is announced once (gateway spec §7); from
///   here on, only transitions;
/// - the probe of OAuth connections runs every `every` until shutdown.
async fn start_gateway(
    db: &std::path::Path,
    keys: &hennery_gateway::key::KeySource,
    state: &AppState,
    egress: &hennery_kernel::egress::Egress,
    every: std::time::Duration,
) -> Result<(hennery_gateway::api::GatewayState, hennery_gateway::proxy::ProxyState)> {
    let gateway = hennery_gateway::open(
        db,
        keys,
        state.operator.clone(),
        egress.clone(),
        std::sync::Arc::new(state.push.clone()),
    )?;
    state
        .store
        .set_session_mcp(std::sync::Arc::new(hennery_gateway::session::GatewayMcp::new(&gateway)));
    gateway.runtime.recover_plugins().await?;
    gateway.runtime.ensure_plugin_worker();
    gateway.runtime.announce_startup()?;
    let proxy = hennery_gateway::proxy::ProxyState::for_sessions(
        gateway.runtime.clone(),
        hennery_gateway::proxy::Limits::default(),
    );
    tokio::spawn(hennery_gateway::probe::run(
        gateway.runtime.clone(),
        every,
        hennery_gateway::probe::TICK_TIMEOUT,
        state.shutdown.clone().cancelled_owned(),
    ));
    Ok((gateway, proxy))
}

/// Web Push delivery (plan 10b-ii): the state's notices go to a task that
/// sends them through `egress`, public addresses only.
fn start_push(state: &mut AppState, egress: &hennery_kernel::egress::Egress) {
    state.push =
        hennery_kernel::delivery::spawn(state.hosts.clone(), state.operator.clone(), state.vapid.clone(), egress);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Plan 8e: the collector gives its sessions the gateway (lane L1), or
    /// no session would ever get a server (plan 8c's release blocker, lane
    /// L15). The same function `run_collector` calls.
    #[tokio::test]
    async fn the_collector_gives_its_sessions_the_gateway() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let state = AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            Operator::open(&db).unwrap(),
        );
        assert!(!state.store.has_session_mcp());
        let keys = hennery_gateway::key::KeySource::from_vars(dir.path(), Some("07".repeat(32).into()), None).unwrap();
        let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap();
        let _routes = start_gateway(&db, &keys, &state, &egress, hennery_gateway::probe::EVERY)
            .await
            .unwrap();
        assert!(state.store.has_session_mcp());
    }

    /// Plan 8f (lane L9, gateway spec §7): the gateway's `Notifier` is the
    /// collector's Web Push, a problem present at startup is announced once
    /// through it, and the background probe runs.
    #[tokio::test]
    async fn the_gateway_announces_through_push_and_probes() {
        use hennery_gateway::model::{AuthMethod, CredKind, GrantTokens, NewConnection, Status, TokenClient};
        use hennery_gateway::store::{ClientSource, GrantToStore};
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let mut state = AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            Operator::open(&db).unwrap(),
        );
        let (push, mut notices) = hennery_kernel::push::Push::new();
        state.push = push;
        let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap();
        let keys = hennery_gateway::key::KeySource::from_vars(dir.path(), None, None).unwrap();
        // A first start makes the key; an OAuth connection in `error`, with
        // a grant whose upstream is a listener here.
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/mcp", listener.local_addr().unwrap());
        let (first, _) = start_gateway(&db, &keys, &state, &egress, std::time::Duration::from_secs(3600))
            .await
            .unwrap();
        let runtime = first.runtime.clone();
        let hennery_gateway::model::Change::Done(record) = runtime
            .store
            .create(
                &NewConnection {
                    slug: "linear".into(),
                    label: "Linear".into(),
                    url: url.clone(),
                    hat_id: state.hosts.default_hat_for_new_hosts().unwrap(),
                    cred_kind: CredKind::OauthDcr,
                    static_header: None,
                    static_prefix: None,
                    tool_allowlist: None,
                    internal_network: true,
                },
                1,
            )
            .unwrap()
        else {
            panic!("not created");
        };
        let client = TokenClient {
            client_id: "c".into(),
            secret: None,
            auth_method: AuthMethod::None,
            token_endpoint: format!("{url}/token"),
        };
        let tokens = GrantTokens::from_opened(br#"{"access_token":"a"}"#).unwrap();
        runtime
            .store
            .store_grant(
                &GrantToStore {
                    connection_id: &record.id,
                    url: &url,
                    cred_kind: CredKind::OauthDcr,
                    internal_network: true,
                    source: ClientSource::Registered,
                    client: &client,
                    issuer: &url,
                    authorization_endpoint: &url,
                    redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                    scopes: &[],
                    resource: &url,
                    resource_param_accepted: true,
                    registered_at: 1,
                    tokens: &tokens,
                    expires_at: None,
                },
                &runtime.key,
                1,
            )
            .unwrap();
        runtime
            .statuses
            .record_status(&record.id, &url, Status::Error, Some("down"), 1)
            .unwrap();
        while notices.try_recv().is_some() {}
        drop((first, runtime));
        // The start this test is about.
        let started = start_gateway(&db, &keys, &state, &egress, std::time::Duration::from_millis(20))
            .await
            .unwrap();
        // One runtime for the API and the proxy: one refresh lock per
        // connection (plan 8f decision 3).
        assert!(std::sync::Arc::ptr_eq(&started.0.runtime, &started.1.runtime));
        let notice = notices.try_recv().expect("the problem is announced at startup");
        assert_eq!(notice.tag, format!("mcp-{}", record.id));
        assert_eq!(notice.body, "is failing");
        assert_eq!(notice.url, "/mcp");
        assert!(notices.try_recv().is_none(), "once");
        // The probe reaches the upstream.
        let accepted = tokio::time::timeout(std::time::Duration::from_secs(10), listener.accept()).await;
        assert!(accepted.is_ok(), "the probe never ran");
        state.shutdown.cancel();
    }

    #[tokio::test]
    async fn a_configured_start_recovers_later_store_transitions_without_an_http_retry() {
        use hennery_gateway::{
            model::{Change, CredKind, NewConnection},
            plugin::RegistrationInput,
        };
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let state = AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            Operator::open(&db).unwrap(),
        );
        state
            .hosts
            .register(
                "plugin-host",
                &hennery_kernel::hosts::Enrollment {
                    public_key: hennery_host::identity::HostKey::from_seed([7; 32]).public_key_hex(),
                    name: "Test".into(),
                    host_version: "0.0.0".into(),
                    platform: "test".into(),
                },
                1,
            )
            .unwrap();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/mcp", listener.local_addr().unwrap());
        let (sent, mut seen) = tokio::sync::mpsc::unbounded_channel();
        let app = axum::Router::new().route(
            "/mcp",
            axum::routing::post(
                move |hennery_kernel::json::ApiJson(body): hennery_kernel::json::ApiJson<serde_json::Value>| {
                    let sent = sent.clone();
                    async move {
                        sent.send(body.clone()).unwrap();
                        axum::Json(serde_json::json!({"jsonrpc":"2.0","id":body["id"],"result":{
                    "request_id":body["id"],"status":"confirmed","remaining_kinds":[]}}))
                    }
                },
            ),
        );
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let keys = hennery_gateway::key::KeySource::from_vars(dir.path(), None, None).unwrap();
        let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap();
        // Configure durable state without invoking the HTTP registration route,
        // which would start its own optional worker.
        let first = hennery_gateway::open(
            &db,
            &keys,
            state.operator.clone(),
            egress.clone(),
            std::sync::Arc::new(hennery_gateway::notify::Silent),
        )
        .unwrap();
        let Change::Done(connection) = first
            .runtime
            .store
            .create(
                &NewConnection {
                    slug: "plugin".into(),
                    label: "Test plug-in".into(),
                    url,
                    hat_id: state.hosts.default_hat_for_new_hosts().unwrap(),
                    cred_kind: CredKind::Static,
                    static_header: None,
                    static_prefix: None,
                    tool_allowlist: Some(vec!["search".into()]),
                    internal_network: true,
                },
                1,
            )
            .unwrap()
        else {
            panic!("connection")
        };
        first
            .runtime
            .store
            .replace_mounts(&connection.id, &["plugin-host".into()])
            .unwrap();
        first
            .runtime
            .store
            .set_static_credential(&connection.id, "namespace", &first.runtime.key, 1)
            .unwrap();
        let fingerprint = first.runtime.store.plugin_fingerprint(&connection.id).unwrap();
        first
            .runtime
            .store
            .register_plugin(
                RegistrationInput {
                    connection_id: &connection.id,
                    lifecycle_credential: "separate-lifecycle",
                    activity: false,
                    startup: false,
                    capabilities: serde_json::from_value(
                        serde_json::json!({"version":1,"activity_v1":true,"forget_v1":true,"startup_context_v1":false}),
                    )
                    .unwrap(),
                },
                &first.runtime.key,
                &fingerprint,
                1,
            )
            .unwrap();
        drop(first);
        let started = start_gateway(&db, &keys, &state, &egress, std::time::Duration::from_secs(3600))
            .await
            .unwrap();
        let error = started
            .0
            .runtime
            .store
            .update(
                &connection.id,
                &hennery_gateway::model::ConnectionPatch {
                    label: Some("Changed".into()),
                    ..Default::default()
                },
                hennery_kernel::secret::unix_now(),
            )
            .unwrap_err();
        assert!(error.is::<hennery_gateway::plugin::PendingMutation>());
        let body = tokio::time::timeout(std::time::Duration::from_secs(3), seen.recv())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(body["method"], "hennery_plugin_forget");
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            loop {
                if !started.0.runtime.store.plugin_deletion_receipts().unwrap().is_empty() {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();
        state.shutdown.cancel();
        server.abort();
        let _ = server.await;
    }

    /// Plan 10b-ii: the collector's notices reach delivery, and delivery is
    /// public only. A subscription at a loopback address gets a notice
    /// refused, recorded on it; nothing is sent.
    #[tokio::test]
    async fn the_collectors_notices_go_to_a_public_only_delivery() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let mut state = AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            Operator::open(&db).unwrap(),
        );
        let now = hennery_kernel::secret::unix_now();
        let token = state.operator.issue_setup_token(now).unwrap().unwrap();
        state
            .operator
            .set_up(&token, "correct horse battery", "https://hennery.example", now)
            .unwrap();
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        rusqlite::Connection::open(&db)
            .unwrap()
            .execute(
                "INSERT INTO push_subscriptions(id, owner_id, endpoint, p256dh, auth, device_label, auth_session, created_at)
                 VALUES ('push-a', ?1, ?2,
                     'BLn9b-VR0ca83knDNZ32dCHGyjJp-1riX9ZTN40MqV8K_LpQmLqxC_DoHvqvFXO_nGdAB4W9dogZb_sM-uV4JbY',
                     '_ordMnz7uTCmrpBTeUV4Bw', 'test', 's', ?3)",
                rusqlite::params![
                    state.hosts.owner_id(),
                    format!("http://{}/push", listener.local_addr().unwrap()),
                    now
                ],
            )
            .unwrap();
        start_push(
            &mut state,
            &hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
        );
        state.push.notify(hennery_kernel::push::Notice {
            hat_id: state.hosts.default_hat_for_new_hosts().unwrap(),
            urgency: hennery_kernel::push::Urgency::Normal,
            title: "t".into(),
            generic_title: "g".into(),
            body: "finished".into(),
            detail: None,
            url: "/sessions/s1".into(),
            tag: "s1".into(),
        });
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
        let error = loop {
            if let Some(error) = state.hosts.subscriptions().unwrap()[0].last_error.clone() {
                break error;
            }
            assert!(
                tokio::time::Instant::now() < deadline,
                "the notice never reached delivery"
            );
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        };
        assert!(error.contains("public address"), "{error}");
        listener.set_nonblocking(true).unwrap();
        assert!(listener.accept().is_err(), "nothing connected");
    }

    /// Final review I1: `up` may itself have the old operator bearer in its
    /// environment (`HENNERY_DEV_TOKEN`, left in a shell from before 3b);
    /// its host child must not inherit it, so neither can any agent that
    /// host runs.
    #[test]
    fn ups_host_child_does_not_inherit_the_operator_token() {
        let args = UpArgs {
            listen: vec!["127.0.0.1:7117".into()],
            public_url: None,
            data_dir: Some("/nonexistent".into()),
            agents: Vec::new(),
            idle_timeout_secs: 0,
            workspace_roots: Vec::new(),
        };
        let cmd = host_command(
            std::path::Path::new("/bin/hennery"),
            std::path::Path::new("/nonexistent/host"),
            "ws://127.0.0.1:7117/api/hosts/ws",
            &args,
        );
        let removed = cmd
            .as_std()
            .get_envs()
            .any(|(key, value)| key == "HENNERY_DEV_TOKEN" && value.is_none());
        assert!(removed, "the host child inherits HENNERY_DEV_TOKEN");
    }

    /// Plan 8a decision 6: the master key may come from the environment
    /// (`HENNERY_MASTER_KEY`), which `up` passes to its collector; its host
    /// child, and so every agent, must not inherit it. The adapter spawn
    /// strips the same list (`HOST_SECRET_VARS`).
    #[test]
    fn ups_host_child_does_not_inherit_the_master_key() {
        assert!(hennery_host::adapter::HOST_SECRET_VARS.contains(&hennery_gateway::key::KEY_ENV));
        let args = UpArgs {
            listen: vec!["127.0.0.1:7117".into()],
            public_url: None,
            data_dir: Some("/nonexistent".into()),
            agents: Vec::new(),
            idle_timeout_secs: 0,
            workspace_roots: Vec::new(),
        };
        let cmd = host_command(
            std::path::Path::new("/bin/hennery"),
            std::path::Path::new("/nonexistent/host"),
            "ws://127.0.0.1:7117/api/hosts/ws",
            &args,
        );
        let removed = cmd
            .as_std()
            .get_envs()
            .any(|(key, value)| key == hennery_gateway::key::KEY_ENV && value.is_none());
        assert!(removed, "the host child inherits HENNERY_MASTER_KEY");
    }

    /// Decision 6: `up` hands its `--workspace-root` flags to its host
    /// child, in order.
    #[test]
    fn ups_host_child_gets_its_workspace_roots() {
        let args = UpArgs {
            listen: vec!["127.0.0.1:7117".into()],
            public_url: None,
            data_dir: Some("/nonexistent".into()),
            agents: Vec::new(),
            idle_timeout_secs: 0,
            workspace_roots: vec!["/srv/projects".into(), "~/src".into()],
        };
        let cmd = host_command(
            std::path::Path::new("/bin/hennery"),
            std::path::Path::new("/nonexistent/host"),
            "ws://127.0.0.1:7117/api/hosts/ws",
            &args,
        );
        let argv: Vec<String> = cmd
            .as_std()
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect();
        let roots: Vec<&str> = argv
            .windows(2)
            .filter(|w| w[0] == "--workspace-root")
            .map(|w| w[1].as_str())
            .collect();
        assert_eq!(roots, ["/srv/projects", "~/src"]);
    }

    /// Plan 7c, decision 8: `up` judges its host's pairing from the files,
    /// never by `Paired::load`, which would put a staged pairing in place
    /// without the host's lock. A staged one is neither whole nor touched.
    #[test]
    fn the_pairing_is_judged_from_the_files_alone() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(pairing_in(dir.path()), Pairing::None);
        std::fs::write(dir.path().join("host.key"), "k").unwrap();
        assert_eq!(pairing_in(dir.path()), Pairing::None);
        std::fs::write(dir.path().join("host.toml"), "t").unwrap();
        assert_eq!(pairing_in(dir.path()), Pairing::Whole);
        std::fs::write(dir.path().join("host.toml.pending"), "staged").unwrap();
        assert_eq!(pairing_in(dir.path()), Pairing::Interrupted);
        assert_eq!(
            std::fs::read_to_string(dir.path().join("host.toml.pending")).unwrap(),
            "staged"
        );
        assert_eq!(pairing_in(&dir.path().join("missing")), Pairing::None);
    }
}
````

### File `crates/hennery/tests/cli.rs`

<!-- r1:file task=2 path=crates/hennery/tests/cli.rs sha256=82160b1a6da18ff83ec2f25bf4bf840809e6b4869de30c05f158a43543cf40c3 bytes=188128 mode=644 encoding=utf8 -->
````rust
use std::io::{Read, Write};
use std::net::TcpStream;
use std::os::unix::process::CommandExt;
use std::process::Command;
use std::time::{Duration, Instant};

/// Where the managed runtime would fetch from, in every test: a loopback
/// port nothing listens on (plan 7b). No test reaches the npm registry or
/// nodejs.org, whatever it starts; `every_spawn_of_the_binary_is_offline`
/// keeps it so.
const OFFLINE: &str = "http://127.0.0.1:1/";

/// The variables that send a long-running `hennery` to a log file (plan
/// 7c-iii): a test run from a service-run host's agent, or a shell that set
/// them, must not log into a real log directory, nor away from the output
/// these tests read.
const LOG_VARS: [&str; 2] = ["HENNERY_SERVICE", "HENNERY_LOG_DIR"];

/// The binary, offline and without `LOG_VARS`.
fn hennery() -> Command {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_hennery"));
    offline(&mut cmd);
    cmd
}

/// Offline (plan 7b), and without `LOG_VARS` (plan 7c-iii).
fn offline(cmd: &mut Command) {
    cmd.env("HENNERY_NPM_REGISTRY", OFFLINE)
        .env("HENNERY_NODE_MIRROR", OFFLINE)
        // And never the gateway's key from whoever runs the tests (plan 8a):
        // a test that wants one sets it.
        .env_remove("HENNERY_MASTER_KEY")
        .env_remove("CREDENTIALS_DIRECTORY")
        // And never the real home: a command given no data directory takes
        // the platform's default under it (distribution spec §8). This one
        // cannot be created, so a test that forgets its directory fails at
        // once rather than writing into the account of whoever runs it. A
        // test that needs a home sets its own.
        .env("HOME", UNWRITABLE_HOME)
        .env("XDG_DATA_HOME", format!("{UNWRITABLE_HOME}/.local/share"))
        .env("XDG_CONFIG_HOME", format!("{UNWRITABLE_HOME}/.config"))
        .env("XDG_STATE_HOME", format!("{UNWRITABLE_HOME}/.local/state"))
        .env("XDG_CACHE_HOME", format!("{UNWRITABLE_HOME}/.cache"))
        .env_remove("HENNERY_DATA_DIR")
        .env_remove("HENNERY_HOST_DATA_DIR")
        // The agents' own homes, which the forget and purge paths prefer to
        // HOME: never the ones whoever runs the tests exported.
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("CODEX_HOME")
        .env_remove("CODEX_SQLITE_HOME");
    for var in LOG_VARS {
        cmd.env_remove(var);
    }
}

/// A home no test can write to: under a directory that does not exist,
/// below the root, which only root could create (a CI job run as root
/// could, and would write there, harmlessly: never into a real home).
const UNWRITABLE_HOME: &str = "/nonexistent-hennery-test/home";

#[test]
fn long_version_records_release_identity() {
    let output = hennery().arg("--version").output().unwrap();
    assert!(output.status.success());
    let version = String::from_utf8(output.stdout).unwrap();
    for field in ["source: ", "UI SHA-256: ", "adapter manifest SHA-256: "] {
        assert!(version.contains(field), "missing {field}: {version}");
    }
}

#[test]
fn help_lists_the_skeleton_commands() {
    let out = hennery().arg("--help").output().unwrap();
    let text = String::from_utf8_lossy(&out.stdout);
    for cmd in ["collector", "host", "up", "admin"] {
        assert!(text.contains(cmd), "missing {cmd} in help:\n{text}");
    }
}

#[test]
fn host_help_lists_join_and_run() {
    let out = hennery().args(["host", "--help"]).output().unwrap();
    let text = String::from_utf8_lossy(&out.stdout);
    for cmd in ["join", "run"] {
        assert!(text.contains(cmd), "missing {cmd} in help:\n{text}");
    }
}

/// The pairing code and the host's new public key are the only secrets
/// `host join` still has to spend. `parse_public_url` limits plain `http://`
/// to a loopback address, but a generic HTTP client still honours
/// `HTTP_PROXY`/`ALL_PROXY` by default — handing both to whatever address
/// the environment names, which would defeat that check for anyone able to
/// set it (a captured shell, a CI runner, a compromised dependency's
/// `postinstall`). `pairing::enroll` must call `.no_proxy()` unconditionally.
///
/// Proven end to end: the collector runs in-process (this crate already
/// depends on `hennery-sessions`/`hennery-kernel`), and `host join` runs as a
/// real *subprocess* with the proxy variables set on that child alone — the
/// env vars are per-process, so a subprocess is what lets this test run
/// alongside every other test in the binary without racing their env
/// (`std::env::set_var` on the test process itself would not be safe here).
/// The configured proxy is a port nothing listens on: if the client ever
/// tried to use it, the connection would be refused and the join would fail
/// instead of pairing.
#[test]
fn joining_over_http_ignores_a_configured_proxy() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let (addr, code, collector_dir) = rt.block_on(async {
        let dir = std::env::temp_dir().join(format!("hennery-cli-noproxy-collector-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let db = dir.join("hennery.db");
        let store = hennery_sessions::store::Store::open(&db).unwrap();
        let hosts = hennery_kernel::hosts::Hosts::open(&db).unwrap();
        let operator = hennery_kernel::operator::Operator::open(&db).unwrap();
        let state = hennery_sessions::AppState::new(store, hosts, operator);
        let code = state
            .hosts
            .mint_pairing_code(hennery_kernel::secret::unix_now())
            .unwrap()
            .code;
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(hennery_sessions::serve(listener, state));
        (addr, code, dir)
    });

    let host_dir = std::env::temp_dir().join(format!("hennery-cli-noproxy-host-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&host_dir);

    let out = hennery()
        .args([
            "host",
            "join",
            &format!("http://{addr}"),
            &code,
            "--name",
            "laptop",
            "--no-runtime",
        ])
        .arg("--data-dir")
        .arg(&host_dir)
        // A bogus proxy nobody listens on.
        .env("HTTP_PROXY", "http://127.0.0.1:1")
        .env("http_proxy", "http://127.0.0.1:1")
        .env("ALL_PROXY", "http://127.0.0.1:1")
        .env("all_proxy", "http://127.0.0.1:1")
        .output()
        .unwrap();

    let _ = std::fs::remove_dir_all(&collector_dir);
    let _ = std::fs::remove_dir_all(&host_dir);

    assert!(
        out.status.success(),
        "join failed with a proxy configured:\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(
        String::from_utf8_lossy(&out.stdout).contains("paired as"),
        "stdout: {}",
        String::from_utf8_lossy(&out.stdout)
    );
}

#[test]
fn a_malformed_agent_flag_is_rejected() {
    let out = hennery()
        .args(["host", "run", "--data-dir", "/tmp/x", "--agent", "noequals"])
        .output()
        .unwrap();
    assert!(!out.status.success());
    assert!(String::from_utf8_lossy(&out.stderr).contains("name=command"));
}

/// Plan 6c decision 6 (Task 2's review): a bad `--workspace-root` fails the
/// start before anything else, so an unpaired host spends no pairing code.
#[test]
fn a_bad_workspace_root_fails_before_pairing() {
    let dir = tempfile::tempdir().unwrap();
    let out = hennery()
        .args(["host", "run", "--data-dir"])
        .arg(dir.path())
        .args(["--workspace-root", "relative/dir"])
        .output()
        .unwrap();
    assert!(!out.status.success());
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(stderr.contains("not absolute"), "{stderr}");
    assert!(!stderr.contains("holds no pairing"), "{stderr}");
}

/// Plan 3b: the development bearer is gone. `--dev-token` is refused, not
/// ignored, so a service still configured with it fails loudly.
#[test]
fn the_development_token_flag_is_gone() {
    for command in ["collector", "up"] {
        let out = hennery()
            .args([command, "--dev-token", "dev-token-for-tests"])
            .args(["--data-dir", "/nonexistent/hennery-cli-dev-token"])
            .output()
            .unwrap();
        assert!(!out.status.success(), "{command} took --dev-token");
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(
            stderr.contains("unexpected argument '--dev-token'"),
            "{command}: {stderr}"
        );
    }
}

/// What `collector`, `up` and `host run` log once when `HENNERY_DEV_TOKEN`
/// is still set.
const DEV_TOKEN_WARNING: &str = "HENNERY_DEV_TOKEN is set but no longer used";

/// Plan 3b: an operator whose shell or service still sets the old bearer is
/// told once, at start, that it does nothing now, and its value is never
/// printed. Each command here stops early (no data directory can be made,
/// the listen address is refused, no pairing is stored), so none binds a
/// port: the warning comes before any of that.
#[test]
fn the_development_token_in_the_environment_is_warned_about_and_never_printed() {
    const TOKEN: &str = "old-dev-token-still-exported";
    let dir = std::env::temp_dir().join(format!("hennery-cli-devtokenwarn-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let _cleanup = RemoveDir(dir.clone());
    let host_dir = dir.join("host");
    std::fs::create_dir_all(&host_dir).unwrap();
    // A data directory under a regular file cannot be made by any user,
    // root included (ENOTDIR), so the collector stops before it binds.
    let not_a_dir = dir.join("file");
    std::fs::write(&not_a_dir, b"").unwrap();
    let runs: [(&str, Vec<std::ffi::OsString>); 3] = [
        (
            "collector",
            vec!["collector".into(), "--data-dir".into(), not_a_dir.join("data").into()],
        ),
        (
            "up",
            vec![
                "up".into(),
                "--listen".into(),
                "203.0.113.5:7117".into(),
                "--data-dir".into(),
                dir.join("up").into(),
            ],
        ),
        (
            "host run",
            vec!["host".into(), "run".into(), "--data-dir".into(), host_dir.into()],
        ),
    ];
    for (name, args) in runs {
        let out = hennery()
            .args(args)
            .env("HENNERY_DEV_TOKEN", TOKEN)
            .env("RUST_LOG", "info")
            .output()
            .unwrap();
        let text = format!(
            "{}{}",
            String::from_utf8_lossy(&out.stdout),
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(!out.status.success(), "{name} was meant to stop early: {text}");
        assert_eq!(text.matches(DEV_TOKEN_WARNING).count(), 1, "{name}: {text}");
        assert!(!text.contains(TOKEN), "{name} printed the token: {text}");
    }
}

/// Stops this test's `up` process tree and removes its scratch dir
/// unconditionally, including on an assertion panic mid-test — nothing below
/// is allowed to leave a process running just because a `assert!` fired
/// first.
struct KillTree {
    up: std::process::Child,
    dir: std::path::PathBuf,
    /// `up`'s children, recorded as soon as they're known (`&mut` field set
    /// right after `children_of` finds them). Once `up` exits — whether
    /// gracefully or via the `kill()` below — any child still alive is
    /// immediately reparented away from `up`'s pid, so a *fresh* `pgrep -P
    /// up_pid` at drop time can no longer find it. The recorded list is the
    /// only reliable way to reach it once `up` is gone; a fresh query is made
    /// only while `up` is stopped and still alive (drop's fallback).
    children: Vec<i32>,
    /// Where `up`'s standard output goes, with its standard error next to it
    /// (`.err`): printed when it dies while a test waits on it.
    log: Option<std::path::PathBuf>,
}

impl KillTree {
    /// `process`, whose standard output goes to `log` (and its standard
    /// error to `log`'s `.err`).
    fn new(process: std::process::Child, log: &std::path::Path) -> Self {
        Self {
            up: process,
            dir: std::path::PathBuf::new(),
            children: Vec::new(),
            log: Some(log.to_path_buf()),
        }
    }

    /// Fail at once, with its output, if the process has exited: a test
    /// waiting on a dead collector would otherwise time out and not say why.
    fn assert_running(&mut self, what: &str) {
        let Ok(Some(status)) = self.up.try_wait() else {
            return;
        };
        let read = |path: std::path::PathBuf| std::fs::read_to_string(&path).unwrap_or_else(|err| format!("({err})"));
        let (stdout, stderr) = match &self.log {
            Some(log) => (read(log.clone()), read(log.with_extension("err"))),
            None => ("(not captured)".into(), "(not captured)".into()),
        };
        panic!("waiting for {what}, the process exited ({status}):\nstdout:\n{stdout}\nstderr:\n{stderr}");
    }

    /// Poll `probe` until it holds, failing at once if the process exits
    /// first, and after 20 seconds.
    fn wait_until(&mut self, what: &str, mut probe: impl FnMut() -> bool) {
        let deadline = Instant::now() + Duration::from_secs(20);
        while !probe() {
            self.assert_running(what);
            assert!(Instant::now() < deadline, "timed out waiting for {what}");
            std::thread::sleep(Duration::from_millis(50));
        }
    }

    /// The address the collector (itself, or `up`'s child) listens on, from
    /// its "collector listening" log line: the tests start it on port 0, so
    /// no other process can take the port between choosing and binding it.
    fn listening(&mut self) -> String {
        self.listening_on(1).remove(0)
    }

    /// The addresses of the collector's first `n` "collector listening"
    /// lines, one per listener, in the order it was given them.
    fn listening_on(&mut self, n: usize) -> Vec<String> {
        let log = self.log.clone().expect("the process's output is captured");
        let mut addresses = Vec::new();
        self.wait_until("the collector listening", || {
            addresses = std::fs::read_to_string(&log)
                .map(|text| listening_addresses(&text))
                .unwrap_or_default();
            addresses.len() >= n
        });
        addresses.truncate(n);
        addresses
    }
}

/// The `address` of every complete "collector listening" line in `log`.
fn listening_addresses(log: &str) -> Vec<String> {
    // Complete lines only: a line still being written could end mid-port.
    let Some(end) = log.rfind('\n') else {
        return Vec::new();
    };
    log[..end]
        .lines()
        .map(strip_ansi)
        .filter_map(|line| {
            let fields = line.split_once("collector listening")?.1;
            let address = fields
                .split_whitespace()
                .find_map(|field| field.strip_prefix("address="))?;
            Some(address.to_string())
        })
        .collect()
}

/// `line` without its terminal colour codes (`ESC [ … m`), which the log
/// carries also when written to a file.
fn strip_ansi(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut chars = line.chars();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' {
            for c in chars.by_ref() {
                if c.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

impl Drop for KillTree {
    fn drop(&mut self) {
        // SIGTERM first, and wait: `up` (and a collector) catches it from
        // before it starts any child, so it stops its children itself, host
        // then collector, also one it spawns after this signal. Killing `up`
        // outright cannot: a test may end before `up` spawns its host, which
        // a `pgrep` made first would miss and `up`'s death would orphan.
        // Never signalled once reaped (a test may have stopped it already):
        // its pid may be another process's by now. The bound is past `up`'s
        // own (10 s for each child).
        if matches!(self.up.try_wait(), Ok(None)) {
            let up_pid = self.up.id() as i32;
            unsafe { libc::kill(up_pid, libc::SIGTERM) };
            if wait_with_timeout(&mut self.up, Duration::from_secs(30)).is_none() {
                // Stopped, `up` spawns no child after the `pgrep` below.
                unsafe { libc::kill(up_pid, libc::SIGSTOP) };
                self.children.extend(children_of(up_pid));
            }
        }
        for pid in std::mem::take(&mut self.children) {
            unsafe {
                // Each child leads its own process group (`UpChildren` sets
                // `process_group(0)`), so kill both the pid and that group.
                libc::kill(pid, libc::SIGKILL);
                libc::kill(-pid, libc::SIGKILL);
            }
        }
        // Only PIDs this test started: `up` is our direct child, so kill+wait
        // it to avoid leaving a zombie for the rest of the test binary's run.
        let _ = self.up.kill();
        let _ = self.up.wait();
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

/// A terminal's Ctrl-C delivers SIGINT to every process in the foreground
/// process group at once. `up` pulls its two children out of that group
/// (`process_group(0)` on both spawns) so only the supervisor is signalled
/// and can still forward an ordered shutdown (host, then collector) instead
/// of racing each child's own signal handler.
///
/// This spawns `up` as the leader of a brand-new process group (standing in
/// for a shell job) and sends SIGINT to that whole group, the same delivery
/// a terminal would do. It asserts `up` still exits cleanly and leaves no
/// child process behind. It does not assert the shutdown *order* directly
/// (host before collector): both children shut themselves down promptly on
/// SIGINT regardless of which fix is in place, so "no leftover processes" is
/// the observable signal here, not a strict ordering.
///
/// `guard` (a `KillTree`) is created immediately after spawn, before any
/// assertion that could panic, so a failure anywhere below still SIGKILLs the
/// whole tree and removes the scratch dir on the way out.
#[test]
fn sigint_to_ups_process_group_still_shuts_down_cleanly() {
    let dir = scratch_dir("pgtest");
    let log = dir.join("up.log");

    let mut command = hennery();
    command
        .args(["up", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(dir.join("data"))
        .stdout(std::fs::File::create(&log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap());
    // SAFETY: setpgid(0, 0) in the child, right after fork and before exec,
    // just makes it (and so `up`) the leader of a brand-new process group —
    // async-signal-safe and exactly what a shell does for a foreground job.
    unsafe {
        command.pre_exec(|| {
            if libc::setpgid(0, 0) != 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }
    let up = command.spawn().unwrap();
    let up_pgid = up.id() as i32;
    let guard_pid = up_pgid;
    let mut guard = KillTree::new(up, &log);
    guard.dir = dir;

    // Wait for the collector to be listening.
    let listen = guard.listening();
    guard.wait_until("the collector serving", || TcpStream::connect(&listen).is_ok());
    // Wait for the host child to spawn too (it's launched right after the
    // collector, independent of the collector's readiness). Poll instead of
    // a fixed sleep: fork/exec/setpgid latency under load (this test must
    // stay green with several copies of the binary running concurrently)
    // can exceed any fixed budget short enough to keep the common case fast.
    let mut children = Vec::new();
    guard.wait_until("up's collector and host children", || {
        children = children_of(guard_pid);
        children.len() >= 2
    });
    guard.children = children.clone();

    // Simulate a terminal delivering SIGINT to the whole foreground group.
    let rc = unsafe { libc::kill(-up_pgid, libc::SIGINT) };
    assert_eq!(rc, 0, "kill(-pgid, SIGINT) failed: {}", std::io::Error::last_os_error());

    let status = wait_with_timeout(&mut guard.up, Duration::from_secs(15)).expect("up did not exit after SIGINT");
    assert!(status.success(), "up exited with {status:?}");

    // Give any lingering child a moment to finish reaping before we check.
    std::thread::sleep(Duration::from_millis(300));
    for pid in children {
        assert!(!pid_alive(pid), "child pid {pid} is still alive after up exited");
    }
}

fn children_of(ppid: i32) -> Vec<i32> {
    let out = Command::new("pgrep").args(["-P", &ppid.to_string()]).output();
    match out {
        Ok(o) => String::from_utf8_lossy(&o.stdout)
            .lines()
            .filter_map(|l| l.trim().parse::<i32>().ok())
            .collect(),
        Err(_) => Vec::new(),
    }
}

fn pid_alive(pid: i32) -> bool {
    // kill(pid, 0) checks for existence/permission without sending a signal.
    unsafe { libc::kill(pid, 0) == 0 }
}

fn wait_with_timeout(child: &mut std::process::Child, timeout: Duration) -> Option<std::process::ExitStatus> {
    let deadline = Instant::now() + timeout;
    loop {
        if let Ok(Some(status)) = child.try_wait() {
            return Some(status);
        }
        if Instant::now() >= deadline {
            return None;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// The owner's password in these tests' collectors.
const PASSWORD: &str = "correct horse battery";

/// Set up the collector `process` runs (or `up` runs), whose data directory
/// is `collector_dir`, through its
/// `setup-url` (kernel spec §3.1), with `http://<listen>` as `public_url`,
/// and return the session token the setup signed the owner in with.
fn sign_in(process: &mut KillTree, listen: &str, collector_dir: &std::path::Path) -> String {
    let file = collector_dir.join("setup-url");
    process.wait_until("the setup link", || file.exists());
    let url = std::fs::read_to_string(&file).unwrap();
    // `…/setup#<token>`: the token is the fragment (3b decision 16).
    let token = url.trim_end().rsplit_once('#').unwrap().1;
    let origin = format!("http://{listen}");
    let body = serde_json::json!({ "token": token, "password": PASSWORD, "public_url": origin }).to_string();
    let mut stream = TcpStream::connect(listen).unwrap();
    stream.set_read_timeout(Some(Duration::from_secs(15))).unwrap();
    write!(
        stream,
        "POST /api/setup HTTP/1.1\r\nHost: {listen}\r\nOrigin: {origin}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
    .unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    assert!(response.starts_with("HTTP/1.1 201"), "{response}");
    response
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            let value = value.trim().strip_prefix("hennery_session=")?;
            name.eq_ignore_ascii_case("set-cookie")
                .then(|| value.split(';').next().unwrap().to_string())
        })
        .unwrap_or_else(|| panic!("no session cookie: {response}"))
}

/// `GET path` on the collector with the owner's `session`: the JSON body of
/// a 200, else `None`.
fn get_json(listen: &str, path: &str, session: &str) -> Option<serde_json::Value> {
    let mut stream = TcpStream::connect(listen).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(5))).ok()?;
    write!(
        stream,
        "GET {path} HTTP/1.1\r\nHost: {listen}\r\nCookie: hennery_session={session}\r\nConnection: close\r\n\r\n"
    )
    .ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let (head, body) = response.split_once("\r\n\r\n")?;
    if !head.starts_with("HTTP/1.1 200") {
        return None;
    }
    serde_json::from_str(body).ok()
}

/// A fresh scratch directory for the test `name`; the caller removes it.
fn scratch_dir(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("hennery-cli-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

/// Removes a scratch directory on drop, however the test ends.
struct RemoveDir(std::path::PathBuf);

impl Drop for RemoveDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// Prints these files to standard error when dropped during a panic: a
/// failing test's collector logs would otherwise go with its scratch dir,
/// leaving a CI failure nothing to read. Declare it after the `RemoveDir`
/// and before the process's guard, so it runs once the process is stopped
/// and before the dir is removed.
struct DumpOnPanic(Vec<std::path::PathBuf>);

impl Drop for DumpOnPanic {
    fn drop(&mut self) {
        if !std::thread::panicking() {
            return;
        }
        for path in &self.0 {
            let text = std::fs::read_to_string(path).unwrap_or_else(|err| format!("({err})"));
            eprintln!("--- {}:\n{text}", path.display());
        }
    }
}

/// Start `up` on `dir`, logging to `log`, wait until its host is connected,
/// and return the address it listens on, the connected host ids and the
/// owner's session: `session`, or else a new one from setting the collector
/// up. The returned guard stops
/// the whole tree (and leaves `dir`).
fn up_until_connected(
    dir: &std::path::Path,
    log: &std::path::Path,
    session: Option<&str>,
) -> (KillTree, String, Vec<String>, String) {
    let mut guard = up_logging_to(dir, log);
    let listen = guard.listening();
    let session = match session {
        Some(session) => session.to_string(),
        None => sign_in(&mut guard, &listen, &dir.join("collector")),
    };
    let mut ids = Vec::new();
    guard.wait_until("the all-in-one host connected", || {
        let Some(serde_json::Value::Array(hosts)) = get_json(&listen, "/api/hosts", &session) else {
            return false;
        };
        ids = hosts
            .iter()
            .filter_map(|h| h["host_id"].as_str().map(str::to_string))
            .collect();
        hosts.iter().any(|h| h["connected"] == true)
    });
    (guard, listen, ids, session)
}

/// `hennery up` pairs its own host on first start, through the pipe the
/// supervisor hands both children (kernel spec §4.2), and a restart reuses
/// that pairing instead of minting another, also on another port.
#[test]
fn up_pairs_its_own_host_once() {
    let dir = scratch_dir("pair");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let host_dir = data.join("host");

    let (mut first, first_listen, ids, session) = up_until_connected(&data, &dir.join("first.log"), None);
    assert_eq!(ids.len(), 1, "{ids:?}");
    assert!(ids[0].starts_with("host-"), "{ids:?}");
    let key = std::fs::read(host_dir.join("host.key")).unwrap();
    // SIGTERM, not a kill: `up` stops the host, then the collector.
    unsafe { libc::kill(first.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut first.up, Duration::from_secs(15)).is_some());
    // Held, so the restart cannot get the same port back by chance.
    let _held = std::net::TcpListener::bind(&first_listen);

    // Set up already: the session from the first run still holds.
    let (_second, second_listen, again, _) = up_until_connected(&data, &dir.join("second.log"), Some(&session));
    assert_ne!(second_listen, first_listen, "the restart was not on another port");
    assert_eq!(again, ids, "the restart paired a second host");
    assert_eq!(std::fs::read(host_dir.join("host.key")).unwrap(), key);
}

/// `POST path` with a JSON body, on the collector with the owner's
/// `session`, from its `public_url` (`http://<listen>`). The response is never read past a short timeout: a session start
/// that never finishes (the point of the slow-starting-adapter test below)
/// may hold the request open, and the pid files it writes are this test's
/// real readiness signal, not the HTTP response.
fn post_json(listen: &str, path: &str, session: &str, body: &str) {
    let Ok(mut stream) = TcpStream::connect(listen) else {
        return;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = write!(
        stream,
        "POST {path} HTTP/1.1\r\nHost: {listen}\r\nCookie: hennery_session={session}\r\nOrigin: http://{listen}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let mut discard = [0u8; 1];
    let _ = stream.read(&mut discard);
}

fn pid_from(path: &std::path::Path) -> Option<i32> {
    std::fs::read_to_string(path).ok()?.trim().parse().ok()
}

/// `DELETE path` on the collector with the owner's `session`, from its
/// `public_url`: the status.
fn delete(listen: &str, path: &str, session: &str) -> Option<u16> {
    let mut stream = TcpStream::connect(listen).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(15))).ok()?;
    write!(
        stream,
        "DELETE {path} HTTP/1.1\r\nHost: {listen}\r\nCookie: hennery_session={session}\r\nOrigin: http://{listen}\r\nConnection: close\r\n\r\n"
    )
    .ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    response.split(' ').nth(1)?.parse().ok()
}

/// Start `up` on port 0 with its log in `log`.
fn up_logging_to(dir: &std::path::Path, log: &std::path::Path) -> KillTree {
    up_logging_to_with(hennery(), dir, log, &[])
}

/// Like `up_logging_to`, from `command` (`hennery` itself, or a shell in
/// front of it), with `extra` arguments appended (e.g. `--agent`).
fn up_logging_to_with(mut command: Command, dir: &std::path::Path, log: &std::path::Path, extra: &[&str]) -> KillTree {
    let up = command
        .args(["up", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(dir)
        .args(extra)
        .stdout(std::fs::File::create(log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    KillTree::new(up, log)
}

/// Whether `text` contains a run shaped like a pairing code
/// (`[0-9A-Z]{4}-[0-9A-Z]{4}`, kernel spec §4.1) anywhere, not just next to a
/// particular label: a log line could quote the code under a different key,
/// or with no key at all, and either would still be a leak.
fn contains_a_pairing_code_shape(text: &str) -> bool {
    let is_code_char = |b: u8| b.is_ascii_uppercase() || b.is_ascii_digit();
    let bytes = text.as_bytes();
    (0..bytes.len().saturating_sub(8)).any(|i| {
        bytes[i..i + 4].iter().all(|&b| is_code_char(b))
            && bytes[i + 4] == b'-'
            && bytes[i + 5..i + 9].iter().all(|&b| is_code_char(b))
    })
}

/// Operator recovery: revoking the all-in-one host stops the host child
/// only. `up` keeps the collector serving, says how to pair the host
/// again, and does the same on every later start until that is done.
#[test]
fn a_revoked_all_in_one_host_leaves_the_collector_serving() {
    let dir = scratch_dir("revoke");
    let _cleanup = RemoveDir(dir.clone());
    let revoked_logged = |log: &std::path::Path| {
        std::fs::read_to_string(log).is_ok_and(|text| text.contains("the all-in-one host was revoked"))
    };

    let log = dir.join("first.log");
    let mut first = up_logging_to(&dir.join("data"), &log);
    let listen = first.listening();
    let session = sign_in(&mut first, &listen, &dir.join("data").join("collector"));
    let mut host_id = String::new();
    first.wait_until("the host connected", || {
        let Some(serde_json::Value::Array(hosts)) = get_json(&listen, "/api/hosts", &session) else {
            return false;
        };
        match hosts.first() {
            Some(h) if h["connected"] == true => {
                host_id = h["host_id"].as_str().unwrap().to_string();
                true
            }
            _ => false,
        }
    });
    assert_eq!(delete(&listen, &format!("/api/hosts/{host_id}"), &session), Some(200));
    first.wait_until("the revoke logged", || revoked_logged(&log));
    assert!(first.up.try_wait().unwrap().is_none(), "up exited with its host");
    let hosts = get_json(&listen, "/api/hosts", &session).expect("the collector still serves");
    assert!(hosts[0]["revoked_at"].is_string(), "{hosts}");
    let text = std::fs::read_to_string(&log).unwrap();
    assert!(text.contains("host.key") && text.contains("host.toml"), "{text}");
    unsafe { libc::kill(first.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut first.up, Duration::from_secs(15)).is_some());

    // Started again: the host is refused again, and the collector serves.
    let log = dir.join("second.log");
    let mut second = up_logging_to(&dir.join("data"), &log);
    let listen = second.listening();
    second.wait_until("the revoke logged again", || revoked_logged(&log));
    assert!(get_json(&listen, "/api/hosts", &session).is_some());
    assert!(second.up.try_wait().unwrap().is_none());
}

/// A revoked host run by its own service stays down (distribution spec
/// §5.2): run as launchd runs the host service (`HENNERY_SERVICE=launchd`,
/// not `up`'s child), it exits 0, which launchd's `KeepAlive` does not
/// restart; run otherwise, 78. Either way it records the revoke for
/// `service status` and doctor.
#[test]
fn a_revoked_host_records_it_and_exits_0_only_as_launchds_host_service() {
    let dir = scratch_dir("revokedsvc");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let log = dir.join("up.log");
    let mut up = up_logging_to(&data, &log);
    let listen = up.listening();
    let session = sign_in(&mut up, &listen, &data.join("collector"));
    let mut host_id = String::new();
    up.wait_until("the host connected", || {
        let Some(serde_json::Value::Array(hosts)) = get_json(&listen, "/api/hosts", &session) else {
            return false;
        };
        match hosts.first() {
            Some(h) if h["connected"] == true => {
                host_id = h["host_id"].as_str().unwrap().to_string();
                true
            }
            _ => false,
        }
    });
    assert_eq!(delete(&listen, &format!("/api/hosts/{host_id}"), &session), Some(200));
    up.wait_until("up's host stopped", || {
        std::fs::read_to_string(&log).is_ok_and(|text| text.contains("the all-in-one host was revoked"))
    });
    let host_dir = data.join("host");
    let run_host = |service: Option<&str>| {
        let mut cmd = hennery();
        cmd.args(["host", "run", "--data-dir"])
            .arg(&host_dir)
            .env("HENNERY_LOG_DIR", dir.join("logs"));
        if let Some(service) = service {
            cmd.env("HENNERY_SERVICE", service);
        }
        let mut child = cmd
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        let status = wait_with_timeout(&mut child, Duration::from_secs(30)).expect("the revoked host stopped");
        (
            status.code(),
            std::fs::read_to_string(host_dir.join("revoked")).unwrap_or_default(),
        )
    };
    let (code, record) = run_host(Some("launchd"));
    assert_eq!(code, Some(0));
    assert!(record.contains(&format!("host_id = \"{host_id}\"")), "{record}");
    std::fs::remove_file(host_dir.join("revoked")).unwrap();
    let (code, record) = run_host(None);
    assert_eq!(code, Some(78));
    assert!(record.contains(&host_id), "{record}");
    std::fs::remove_file(host_dir.join("revoked")).unwrap();
    let (code, record) = run_host(Some("systemd"));
    assert_eq!(code, Some(78));
    assert!(record.contains(&host_id), "{record}");
    unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut up.up, Duration::from_secs(15)).is_some());
}

/// Task 4 review (controller ruling): `up` must compute and validate its
/// host's collector URL (`collector_ws_url`) *before* spawning the collector
/// child, so a `--listen` address that `collector_ws_url` cannot make sense
/// of fails cleanly, with neither data directory ever touched.
///
/// This does *not* prove the ordering itself (that the validation runs
/// strictly before `collector_cmd.spawn()`): that is a fact about the source,
/// checked by reading `run_up`, not one a black-box process test can pin
/// reliably. A revert-probe against the old (validate-after-spawn) code
/// still passed this exact test, because the parent's own string-only
/// validation is so much faster than the freshly forked child's own
/// exec-and-parse that the parent's early return (and the `kill_on_drop`
/// that comes with it) almost always wins the race regardless of which
/// order the source uses. So this is real coverage of the *outcome* `up`
/// must have either way, not a regression guard for the ordering fix.
#[test]
fn a_non_loopback_listen_is_refused_and_touches_neither_data_dir() {
    let dir = std::env::temp_dir().join(format!("hennery-cli-badlisten-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let _cleanup = RemoveDir(dir.clone());

    // TEST-NET-3 (RFC 5737): never routable, and not loopback either, so
    // `collector_ws_url` refuses it (plain http off loopback) before `up`
    // spawns anything that could bind or listen on it.
    let out = hennery()
        .args(["up", "--listen", "203.0.113.5:7117"])
        .arg("--data-dir")
        .arg(&dir)
        .output()
        .unwrap();
    assert!(!out.status.success());
    assert!(
        String::from_utf8_lossy(&out.stderr).contains("loopback"),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    // Neither child ever touched its data directory.
    assert!(!dir.join("collector").exists(), "the collector was started anyway");
    assert!(!dir.join("host").exists(), "the host was started anyway");
}

/// Task 4 review (controller ruling): a failed pairing-code write (the host
/// child died, or otherwise never attached the other end of the pipe) is the
/// host's problem, not the collector's — it must be logged, without the code
/// itself, and the collector must keep serving every other route regardless.
///
/// Reproduced directly against `hennery collector --pairing-code-fd`,
/// without `up`: the read end of the pipe is dropped and never given to any
/// process, so the collector's write is a broken pipe every time, not just
/// on some unlucky timing.
#[test]
fn a_failed_pairing_code_write_is_logged_without_the_code_and_does_not_kill_the_collector() {
    let dir = scratch_dir("badpipe");
    let _cleanup = RemoveDir(dir.clone());
    let log = dir.join("collector.log");

    let mut cmd = hennery();
    cmd.args(["collector", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(dir.join("data"))
        .args(["--pairing-code-fd", "3"])
        .stdout(std::fs::File::create(&log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap());
    // The pipe is made in the forked child, not here: on macOS a pipe is
    // made close-on-exec only after it exists (`pipe`, then `fcntl`), so a
    // process another test spawns in between inherits its read end and
    // keeps it open, and the collector's write then succeeds.
    //
    // SAFETY: pipe, dup2 and close in the forked child, before exec;
    // async-signal-safe.
    unsafe {
        cmd.pre_exec(|| {
            let mut fds = [0; 2];
            if libc::pipe(fds.as_mut_ptr()) < 0 {
                return Err(std::io::Error::last_os_error());
            }
            let [reader, writer] = fds;
            // Nobody will ever read: every write is EPIPE. Placed onto the
            // reader's number, the writer closes it too.
            hennery_testkit::place_fd(writer, 3)?;
            for fd in [reader, writer] {
                if fd != 3 {
                    libc::close(fd);
                }
            }
            Ok(())
        });
    }
    // A `KillTree` guard, as `up_logging_to` uses for `up` itself: an
    // assertion below that panics must still not leak this process.
    let mut guard = KillTree::new(cmd.spawn().unwrap(), &log);

    let listen = guard.listening();
    let session = sign_in(&mut guard, &listen, &dir.join("data"));
    guard.wait_until("the collector serving", || {
        get_json(&listen, "/api/hosts", &session).is_some()
    });
    assert!(
        guard.up.try_wait().unwrap().is_none(),
        "the collector died on a failed pairing-code write"
    );
    // tracing's default writer is stdout, not stderr.
    let stdout = std::fs::read_to_string(&log).unwrap();
    assert!(stdout.contains("could not hand the pairing code"), "stdout: {stdout}");
    // The code minted for the write that failed is a secret; it must never
    // reach the log — checked against its actual shape (`XXXX-XXXX`, kernel
    // spec §4.1), anywhere in the log, not just a `code=`-labelled field a
    // future log line might not use.
    assert!(!contains_a_pairing_code_shape(&stdout), "stdout: {stdout}");

    unsafe { libc::kill(guard.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut guard.up, Duration::from_secs(15)).is_some());
}

/// Kills an adapter's whole process group on drop, from its pid file. Unlike
/// `KillTree` (which reaches only `up`'s own two children and their groups),
/// an adapter the host child spawns is in a process group of its own, led
/// by its guard — this is the only thing standing between a bug here and a
/// real leaked `sleep`.
struct KillAdapter(std::path::PathBuf);

impl Drop for KillAdapter {
    fn drop(&mut self) {
        if let Some(pid) = pid_from(&self.0) {
            unsafe {
                let pgid = libc::getpgid(pid);
                if pgid > 0 {
                    libc::kill(-pgid, libc::SIGKILL);
                }
                libc::kill(pid, libc::SIGKILL);
            }
        }
    }
}

/// Task 7 review, fix round 1: a revoked host must stop *every* adapter it
/// runs (ACP core §3.5), including one whose session actor is still stuck
/// "starting" — negotiating the adapter's own handshake (session.rs's
/// `drive`, the `tokio::select!` around `negotiate`) has no arm that reads a
/// shutdown or command-channel signal, so such an actor does not react to
/// `run_until`'s shutdown on its own. Cleanup for it depends entirely on
/// `shut_down`'s bound being exceeded (it logs "did not stop in time" and
/// gives up on that actor) and, from there, on the actor's *task* being
/// dropped when the `#[tokio::main]` runtime itself finally drops — which is
/// exactly what a `std::process::exit` inside that runtime would skip,
/// orphaning the adapter's process group for good. Driven through the real
/// `hennery` binary via `up`, not `hennery_host::run` in-process, because the
/// bug is specifically in `main`'s own exit path.
#[test]
fn a_revoked_hosts_still_starting_adapter_is_reaped_past_shut_downs_bound() {
    let dir = scratch_dir("slowstart");
    let _cleanup = RemoveDir(dir.clone());

    // A shell script, not `hennery-fake-acp` (a binary of another crate this
    // one has no dependency on): it records its own pid and a grandchild's,
    // then never answers `initialize` — the adapter that never finishes
    // starting.
    let adapter_pid_file = dir.join("adapter.pid");
    let grandchild_pid_file = dir.join("grandchild.pid");
    let script = dir.join("slow.sh");
    std::fs::write(
        &script,
        format!(
            "echo $$ > {}\nsleep 7117 &\necho $! > {}\nwait\n",
            adapter_pid_file.display(),
            grandchild_pid_file.display()
        ),
    )
    .unwrap();
    // A drop guard for the adapter's own group: declared before any
    // assertion below, so a panic mid-test still reaps it.
    let _kill_adapter = KillAdapter(adapter_pid_file.clone());

    let log = dir.join("up.log");
    let mut up = up_logging_to_with(
        hennery(),
        &dir.join("data"),
        &log,
        &["--agent", &format!("slow=/bin/sh {}", script.display())],
    );
    let listen = up.listening();
    let session = sign_in(&mut up, &listen, &dir.join("data").join("collector"));

    let mut host_id = String::new();
    up.wait_until("the host connected", || {
        let Some(serde_json::Value::Array(hosts)) = get_json(&listen, "/api/hosts", &session) else {
            return false;
        };
        match hosts.first() {
            Some(h) if h["connected"] == true => {
                host_id = h["host_id"].as_str().unwrap().to_string();
                true
            }
            _ => false,
        }
    });

    post_json(
        &listen,
        "/api/sessions",
        &session,
        &serde_json::json!({ "host_id": host_id, "agent": "slow", "cwd": dir }).to_string(),
    );
    let mut grandchild = None;
    up.wait_until("the slow adapter started", || {
        grandchild = pid_from(&grandchild_pid_file);
        grandchild.is_some()
    });
    let grandchild = grandchild.unwrap();
    assert!(pid_alive(grandchild), "the grandchild died before the revoke");

    assert_eq!(delete(&listen, &format!("/api/hosts/{host_id}"), &session), Some(200));
    // Generous: a reconnect (up to ~1s of backoff) plus `shut_down`'s ~6s
    // bound, with slack for four parallel copies of this binary.
    let deadline = Instant::now() + Duration::from_secs(40);
    while !std::fs::read_to_string(&log).is_ok_and(|text| text.contains("the all-in-one host was revoked")) {
        up.assert_running("the revoke logged");
        assert!(Instant::now() < deadline, "timed out waiting for the revoke logged");
        std::thread::sleep(Duration::from_millis(50));
    }
    let text = std::fs::read_to_string(&log).unwrap();
    // Proof this exercised the runtime-drop path, not the graceful one: the
    // actor genuinely never reacted to the shutdown on its own.
    assert!(
        text.contains("session actors did not stop in time"),
        "the bound was never exceeded, so this never reached the code path under test: {text}"
    );
    let deadline = Instant::now() + Duration::from_secs(15);
    while pid_alive(grandchild) {
        up.assert_running("the still-starting adapter reaped");
        assert!(
            Instant::now() < deadline,
            "the still-starting adapter's grandchild outlived the revoked host"
        );
        std::thread::sleep(Duration::from_millis(50));
    }

    unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut up.up, Duration::from_secs(15)).is_some());
}

/// Final review I1: an operator whose shell still exports the old bearer
/// (`HENNERY_DEV_TOKEN`, from before 3b removed it) must not hand it to the
/// host child, nor through it to any agent.
///
/// The agent is a shell script that dumps its environment, and which of the
/// descriptors 3 to 9 and 12 it holds (3 is the pairing pipe's number in the
/// host child, 4 the listening socket's in the collector child, 12 the
/// parent pipe's in both), then exits. 12 is looked for at `/dev/fd/12`
/// first thing, before the shell itself opens anything: a shell such as dash
/// takes no descriptor above 9 in a redirection.
///
/// `up` itself is started holding descriptor 7 open across `exec`, as a
/// service manager or a shell can leave one: the host's adapter spawn must
/// close it too. The control starts with no inherited descriptor above 2:
/// on macOS, std makes a pipe or socket close-on-exec only after creating
/// it, so under parallel tests one another thread of this binary is making
/// can leak into a spawn. A fresh data directory, so this run pairs through
/// that pipe.
#[test]
fn ups_agents_never_see_the_operator_token_or_the_pairing_pipe() {
    const TOKEN: &str = "operator-token-from-the-environment";
    let dir = scratch_dir("agentenv");
    let _cleanup = RemoveDir(dir.clone());

    // Written to temporary names and moved into place, so a reader never
    // sees half a file. The probe runs in a subshell: a failed redirection
    // on a special builtin (`:`) ends a POSIX shell such as dash (Debian's
    // and Ubuntu's `/bin/sh`), which would then never write its report.
    let script = dir.join("envdump.sh");
    let report = |name: &str| dir.join(name);
    std::fs::write(
        &script,
        format!(
            "if [ -e /dev/fd/12 ]; then twelve=12; fi\n\
             {{ for n in 3 4 5 6 7 8 9; do if ( eval \": <&$n\" ) 2>/dev/null; then echo $n; fi; done; \
             if [ -n \"$twelve\" ]; then echo 12; fi; }} > {fd}.tmp\n\
             env > {env}.tmp\nmv {fd}.tmp {fd}\nmv {env}.tmp {env}\n",
            fd = report("fds.txt").display(),
            env = report("env.txt").display(),
        ),
    )
    .unwrap();

    // Control: the probe does see descriptors 3 and 4 that are open, and
    // only those.
    let mut control = Command::new("/bin/sh");
    control.arg(&script);
    // SAFETY: fcntl, close and dup2 in the forked child, before exec;
    // async-signal-safe.
    unsafe {
        control.pre_exec(|| {
            close_leaked_descriptors();
            hennery_testkit::place_fd(1, 3)?;
            hennery_testkit::place_fd(1, 4)?;
            hennery_testkit::place_fd(1, 12)?;
            Ok(())
        });
    }
    assert!(control.status().unwrap().success());
    assert_eq!(std::fs::read_to_string(report("fds.txt")).unwrap(), "3\n4\n12\n");
    std::fs::remove_file(report("fds.txt")).unwrap();
    std::fs::remove_file(report("env.txt")).unwrap();

    let log = dir.join("up.log");
    let mut command = hennery();
    command
        .env("HENNERY_DEV_TOKEN", TOKEN)
        .env("HENNERY_AGENT_MAY_SEE", "yes")
        .env("RUST_LOG", "info");
    // SAFETY: as for the control above.
    unsafe {
        command.pre_exec(|| {
            close_leaked_descriptors();
            hennery_testkit::place_fd(2, 7)?;
            Ok(())
        });
    }
    let mut up = up_logging_to_with(
        command,
        &dir.join("data"),
        &log,
        &["--agent", &format!("envdump=/bin/sh {}", script.display())],
    );

    let listen = up.listening();
    let session = sign_in(&mut up, &listen, &dir.join("data").join("collector"));
    let mut host_id = String::new();
    up.wait_until("the host connected", || {
        let Some(serde_json::Value::Array(hosts)) = get_json(&listen, "/api/hosts", &session) else {
            return false;
        };
        match hosts.first() {
            Some(h) if h["connected"] == true => {
                host_id = h["host_id"].as_str().unwrap().to_string();
                true
            }
            _ => false,
        }
    });
    post_json(
        &listen,
        "/api/sessions",
        &session,
        &serde_json::json!({ "host_id": host_id, "agent": "envdump", "cwd": dir }).to_string(),
    );
    up.wait_until("the agent's report", || report("env.txt").exists());

    let env = std::fs::read_to_string(report("env.txt")).unwrap();
    // Positive controls: the agent got an environment, `up`'s included.
    assert!(env.contains("PATH="), "{env}");
    assert!(env.contains("HENNERY_AGENT_MAY_SEE=yes"), "{env}");
    assert!(
        !env.contains("HENNERY_DEV_TOKEN="),
        "the agent inherited the operator token"
    );
    assert!(!env.contains(TOKEN), "the agent inherited the operator token");
    assert_eq!(
        std::fs::read_to_string(report("fds.txt")).unwrap(),
        "",
        "the agent inherited descriptors"
    );

    unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut up.up, Duration::from_secs(15)).is_some());
    // `up` warns once; its collector child is not handed the variable, so
    // it does not warn again; and neither prints the value.
    let output = std::fs::read_to_string(&log).unwrap() + &std::fs::read_to_string(log.with_extension("err")).unwrap();
    assert_eq!(output.matches(DEV_TOKEN_WARNING).count(), 1, "{output}");
    assert!(!output.contains(TOKEN), "up printed the operator token: {output}");
}

/// In a forked child before `exec`: close every descriptor above 2 that is
/// not close-on-exec, which only a leak from another thread can be here
/// (std's own descriptors for the spawn are close-on-exec). Only fcntl and
/// close: async-signal-safe.
fn close_leaked_descriptors() {
    for fd in 3..1024 {
        // SAFETY: fcntl and close on a descriptor number in this process.
        unsafe {
            let flags = libc::fcntl(fd, libc::F_GETFD);
            if flags >= 0 && flags & libc::FD_CLOEXEC == 0 {
                libc::close(fd);
            }
        }
    }
}

/// `hennery` under `umask 022`, the usual default, which would leave a new
/// directory 0755 and a new file 0644. Set in a shell in front of it, never
/// in this process: the umask is process-wide.
fn under_umask_022() -> Command {
    let mut cmd = Command::new("/bin/sh");
    cmd.args(["-c", "umask 022; exec \"$0\" \"$@\"", env!("CARGO_BIN_EXE_hennery")]);
    offline(&mut cmd);
    cmd
}

fn mode_of(path: &std::path::Path) -> u32 {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path)
        .unwrap_or_else(|err| panic!("{}: {err}", path.display()))
        .permissions()
        .mode()
        & 0o777
}

/// Start `hennery collector` under `umask 022` on `data`, logging to `log`,
/// and wait until it serves: a new collector writes its setup link once it
/// listens. Returns the address it listens on.
fn collector_under_umask_022(data: &std::path::Path, log: &std::path::Path) -> (KillTree, String) {
    let collector = under_umask_022()
        .args(["collector", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(data)
        .stdout(std::fs::File::create(log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    let mut guard = KillTree::new(collector, log);
    let listen = guard.listening();
    guard.wait_until("the collector serving", || {
        data.join("setup-url").exists() && TcpStream::connect(&listen).is_ok()
    });
    (guard, listen)
}

/// Final review I2: pairing-code hashes (decision 5) and everything else in
/// `hennery.db` rely on nobody but the collector's user reading it. Its data
/// directory is created 0700 (every missing parent too) and the database,
/// its WAL files and the VAPID key (plan 10a) 0600, whatever the umask.
#[test]
fn the_collectors_data_is_private_to_its_user() {
    let dir = scratch_dir("private");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("root").join("collector");

    let (mut collector, _) = collector_under_umask_022(&data, &dir.join("collector.log"));
    // Checked while it serves: a clean shutdown checkpoints the WAL and
    // removes the `-wal` and `-shm`.
    assert_eq!(mode_of(&dir.join("root")), 0o700);
    assert_eq!(mode_of(&data), 0o700);
    // The gateway's master key too (plan 8a).
    for file in [
        "hennery.db",
        "hennery.db-wal",
        "hennery.db-shm",
        "admin.sock",
        "vapid.key",
        "master.key",
    ] {
        assert_eq!(mode_of(&data.join(file)), 0o600, "{file}");
    }
    unsafe { libc::kill(collector.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut collector.up, Duration::from_secs(15)).is_some());
    assert!(
        !data.join("admin.sock").exists(),
        "the admin socket outlived the collector"
    );
}

/// `method path` on the collector at `listen` with the owner's `session`,
/// from its `public_url`, with a JSON `body` if any: the status and the
/// body.
fn send_json(listen: &str, method: &str, path: &str, session: &str, body: Option<&str>) -> Option<(u16, String)> {
    let mut stream = TcpStream::connect(listen).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(15))).ok()?;
    let body = body.unwrap_or_default();
    write!(
        stream,
        "{method} {path} HTTP/1.1\r\nHost: {listen}\r\nCookie: hennery_session={session}\r\nOrigin: http://{listen}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
    .ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let (head, body) = response.split_once("\r\n\r\n")?;
    Some((head.split(' ').nth(1)?.parse().ok()?, body.to_string()))
}

/// Stop `collector` with SIGTERM, and wait for it.
fn stop(collector: &mut KillTree) {
    unsafe { libc::kill(collector.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut collector.up, Duration::from_secs(15)).is_some());
}

/// Plan 8a (gateway spec §6, kernel spec §10): the collector makes its
/// master key at its first start and keeps it, serves the gateway's
/// connections, and a credential stored under it opens after a restart.
/// With the key gone while a credential is stored, the start fails, and no
/// new key is made.
#[test]
fn the_collector_keeps_its_master_key_and_will_not_start_without_it() {
    let dir = scratch_dir("master-key");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (mut collector, listen) = collector_on(&data, &dir.join("first.log"));
    let session = sign_in(&mut collector, &listen, &data);
    let key = data.join("master.key");
    let made = std::fs::read(&key).unwrap();
    assert_eq!(made.len(), 32);
    assert_eq!(
        get_json(&listen, "/api/mcp/connections", &session),
        Some(serde_json::json!([]))
    );
    let hats = get_json(&listen, "/api/hats", &session).unwrap();
    let body = serde_json::json!({
        "slug": "linear",
        "label": "Linear",
        "url": "https://mcp.linear.example/mcp",
        "hat_id": hats[0]["id"],
        "cred_kind": "static",
    })
    .to_string();
    let (status, created) = send_json(&listen, "POST", "/api/mcp/connections", &session, Some(&body)).unwrap();
    assert_eq!(status, 201, "{created}");
    let id = serde_json::from_str::<serde_json::Value>(&created).unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();
    let credential = format!("/api/mcp/connections/{id}/credential");
    let (status, _) = send_json(&listen, "PUT", &credential, &session, Some(r#"{"token":"tok"}"#)).unwrap();
    assert_eq!(status, 204);
    let (status, _) = send_json(
        &listen,
        "PUT",
        "/api/mcp/connections/conn-0000000000000000/credential",
        &session,
        Some(r#"{"token":"tok"}"#),
    )
    .unwrap();
    assert_eq!(status, 404);
    stop(&mut collector);

    let (mut again, listen) = collector_on(&data, &dir.join("second.log"));
    assert_eq!(std::fs::read(&key).unwrap(), made, "the key was replaced");
    let listed = get_json(&listen, "/api/mcp/connections", &session).unwrap();
    assert_eq!(listed[0]["has_credential"], true, "{listed}");
    stop(&mut again);

    // Another key does not open the stored credential: refused.
    std::fs::write(&key, [9u8; 32]).unwrap();
    let stderr = refused_start(&data);
    assert!(stderr.contains("does not open the stored credential"), "{stderr}");
    // No key at all: refused, and none is made.
    std::fs::remove_file(&key).unwrap();
    let stderr = refused_start(&data);
    assert!(stderr.contains("master.key is missing"), "{stderr}");
    assert!(!key.exists(), "a new key was made");
}

/// Plan 8a decision 6 (the review's O4): a key from `HENNERY_MASTER_KEY`
/// is used and no `master.key` is made; started again without it once a
/// credential is stored, the collector refuses, and makes none either.
#[test]
fn a_master_key_from_the_environment_is_used_and_never_written_down() {
    let dir = scratch_dir("master-key-env");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let log = dir.join("collector.log");
    let child = hennery()
        .args(["collector", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(&data)
        .env("HENNERY_MASTER_KEY", "ab".repeat(32))
        .stdout(std::fs::File::create(&log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    let mut collector = KillTree::new(child, &log);
    let listen = collector.listening();
    let session = sign_in(&mut collector, &listen, &data);
    let hats = get_json(&listen, "/api/hats", &session).unwrap();
    let body = serde_json::json!({
        "slug": "linear",
        "label": "Linear",
        "url": "https://mcp.linear.example/mcp",
        "hat_id": hats[0]["id"],
        "cred_kind": "static",
    })
    .to_string();
    let (status, created) = send_json(&listen, "POST", "/api/mcp/connections", &session, Some(&body)).unwrap();
    assert_eq!(status, 201, "{created}");
    let id = serde_json::from_str::<serde_json::Value>(&created).unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();
    let credential = format!("/api/mcp/connections/{id}/credential");
    let (status, _) = send_json(&listen, "PUT", &credential, &session, Some(r#"{"token":"tok"}"#)).unwrap();
    assert_eq!(status, 204);
    stop(&mut collector);
    assert!(!data.join("master.key").exists(), "the key was written down");

    let stderr = refused_start(&data);
    assert!(stderr.contains("master.key is missing"), "{stderr}");
    assert!(!data.join("master.key").exists(), "a new key was made");
}

/// Plan 8d (lane L8, kernel spec §3.3): the collector serves the gateway's
/// proxy at `/mcp/<slug>`, outside the operator's routes. A request with a
/// foreign `Origin`, a cross-site `Sec-Fetch-Site`, no cookie and no JSON
/// type, before setup even, gets the proxy's own 404, not the browser
/// rules' 403 or 415, with `nosniff` and nothing compressed.
#[test]
fn the_collector_serves_the_mcp_proxy_outside_the_operator_s_routes() {
    let dir = scratch_dir("mcp-proxy");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let log = dir.join("collector.log");
    // Dropped after the collector is stopped and before the scratch dir
    // goes: a failure here prints what the collector said.
    let _dump = DumpOnPanic(vec![log.clone(), log.with_extension("err")]);
    let (mut collector, listen) = collector_on(&data, &log);
    let token = format!("hnry_session_{}", "0".repeat(64));
    for (method, body) in [
        ("POST", r#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#),
        ("GET", ""),
        ("DELETE", ""),
    ] {
        let mut stream = TcpStream::connect(&listen).unwrap();
        stream.set_read_timeout(Some(Duration::from_secs(15))).unwrap();
        write!(
            stream,
            "{method} /mcp/linear HTTP/1.1\r\nHost: {listen}\r\nOrigin: https://evil.example\r\nSec-Fetch-Site: cross-site\r\nAuthorization: Bearer {token}\r\nContent-Type: text/plain\r\nAccept-Encoding: gzip, br\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
        .unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        let (head, body) = response.split_once("\r\n\r\n").unwrap();
        let head = head.to_ascii_lowercase();
        assert!(head.starts_with("http/1.1 404"), "{method}: {response}");
        assert!(head.contains("x-content-type-options: nosniff"), "{method}: {head}");
        // A guard for later: no compression layer exists yet, and one added
        // around the merged router would compress this body (kernel spec §7).
        assert!(!head.contains("content-encoding"), "{method}: {head}");
        assert!(body.contains(r#""code":"not_found""#), "{method}: {body}");
    }
    stop(&mut collector);
}

/// Plan 8f (api-8e-8f B5, R7): the collector serves the OAuth callback
/// outside the operator's routes and the browser rules: the vendor's
/// redirect arrives cross-site without the session cookie, and gets the
/// callback's own page (an unknown `state` here), with the kernel's CSP,
/// `no-store` and `no-referrer`; its script is served too.
#[test]
fn the_collector_serves_the_oauth_callback_outside_the_operator_s_routes() {
    let dir = scratch_dir("mcp-callback");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (mut collector, listen) = collector_on(&data, &dir.join("collector.log"));
    for (path, status, kind) in [
        ("/api/mcp/oauth/callback?code=c&state=unknown", "400", "text/html"),
        ("/api/mcp/oauth/callback.js", "200", "text/javascript"),
    ] {
        let mut stream = TcpStream::connect(&listen).unwrap();
        stream.set_read_timeout(Some(Duration::from_secs(15))).unwrap();
        write!(
            stream,
            "GET {path} HTTP/1.1\r\nHost: {listen}\r\nOrigin: https://vendor.example\r\nSec-Fetch-Site: cross-site\r\nConnection: close\r\n\r\n"
        )
        .unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        let (head, body) = response.split_once("\r\n\r\n").unwrap();
        let head = head.to_ascii_lowercase();
        assert!(head.starts_with(&format!("http/1.1 {status}")), "{path}: {response}");
        assert!(head.contains(&format!("content-type: {kind}")), "{path}: {head}");
        assert!(head.contains("cache-control: no-store"), "{path}: {head}");
        assert!(head.contains("referrer-policy: no-referrer"), "{path}: {head}");
        if kind == "text/html" {
            assert!(head.contains("content-security-policy: script-src 'self'"), "{head}");
            assert!(body.contains("data-result=\"flow_unknown\""), "{body}");
        }
    }
    stop(&mut collector);
}

/// Start a collector on `data` that must fail to start: its standard error.
fn refused_start(data: &std::path::Path) -> String {
    let mut refused = hennery()
        .args(["collector", "--listen", "127.0.0.1:0", "--data-dir"])
        .arg(data)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    let Some(status) = wait_with_timeout(&mut refused, Duration::from_secs(30)) else {
        let _ = refused.kill();
        panic!("the collector started");
    };
    let mut stderr = String::new();
    refused.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
    assert!(!status.success(), "{stderr}");
    stderr
}

/// Review I1: `the_collectors_data_is_private_to_its_user` only sends its
/// SIGTERM once `setup-url` exists and the port accepts a connection — by
/// then the old code (the shutdown task spawned on a bare `terminated()`,
/// with no `Signals` created up front) was already well past the only
/// window a SIGTERM could hit it in, so that test's own revert-probe never
/// caught the regression `Signals::new()` fixes. This test sends SIGTERM the
/// instant `admin.sock` exists, which is created right after `bind`, before
/// the database is opened, migrated or a setup link is written — pinning the
/// window directly instead of relying on how long start-up happens to take.
#[test]
fn a_sigterm_during_the_start_leaves_no_admin_socket() {
    let dir = scratch_dir("sigterm-start");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let log = dir.join("collector.log");

    let collector = hennery()
        .args(["collector", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(&data)
        .stdout(std::fs::File::create(&log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    // Created before any assertion that could panic: a failure below must
    // still SIGKILL the collector and remove the scratch dir on the way out.
    let mut guard = KillTree::new(collector, &log);
    guard.dir = dir.clone();

    let socket = data.join("admin.sock");
    let deadline = Instant::now() + Duration::from_secs(20);
    while !socket.exists() {
        guard.assert_running("admin.sock to appear");
        assert!(Instant::now() < deadline, "timed out waiting for admin.sock");
        std::thread::sleep(Duration::from_micros(200));
    }

    unsafe { libc::kill(guard.up.id() as i32, libc::SIGTERM) };
    let status =
        wait_with_timeout(&mut guard.up, Duration::from_secs(15)).expect("the collector did not exit after SIGTERM");
    assert!(status.success(), "the collector exited with {status:?}");
    assert!(!socket.exists(), "the admin socket outlived the collector");
}

/// Final review I2, an install from before the fix: a database others can
/// read is made private when the collector opens it. A data directory others
/// can enter is the operator's to fix: it is named in a warning, and left
/// as it is.
#[test]
fn an_existing_readable_database_is_made_private_and_a_loose_directory_is_warned_about() {
    use std::os::unix::fs::PermissionsExt;
    let dir = scratch_dir("loose");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    std::fs::create_dir(&data).unwrap();
    std::fs::set_permissions(&data, std::fs::Permissions::from_mode(0o755)).unwrap();
    // An empty file is a new, empty SQLite database.
    std::fs::write(data.join("hennery.db"), b"").unwrap();
    std::fs::set_permissions(data.join("hennery.db"), std::fs::Permissions::from_mode(0o644)).unwrap();

    let log = dir.join("collector.log");
    let (mut collector, _) = collector_under_umask_022(&data, &log);
    assert_eq!(mode_of(&data.join("hennery.db")), 0o600);
    assert_eq!(mode_of(&data), 0o755, "the operator's directory was changed");
    let text = std::fs::read_to_string(&log).unwrap();
    assert!(
        text.contains("readable by other users") && text.contains(&data.display().to_string()),
        "{text}"
    );
    unsafe { libc::kill(collector.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut collector.up, Duration::from_secs(15)).is_some());
}

/// Final review I2: `up`'s data root, and both children's directories in
/// it, are private. This pins the outcome, not `up`'s own creation of the
/// root: each child also creates any missing parent 0700, so a revert-probe
/// of that line alone still passes; it fails without the collector's.
#[test]
fn ups_data_root_is_private_to_its_user() {
    let dir = scratch_dir("uproot");
    let _cleanup = RemoveDir(dir.clone());
    let root = dir.join("data");

    let log = dir.join("up.log");
    let mut up = up_logging_to_with(under_umask_022(), &root, &log, &[]);
    let listen = up.listening();
    let session = sign_in(&mut up, &listen, &root.join("collector"));
    up.wait_until("the host connected", || {
        get_json(&listen, "/api/hosts", &session).is_some_and(|hosts| {
            hosts
                .as_array()
                .is_some_and(|h| h.iter().any(|h| h["connected"] == true))
        })
    });
    for dir in [root.clone(), root.join("collector"), root.join("host")] {
        assert_eq!(mode_of(&dir), 0o700, "{}", dir.display());
    }
    assert_eq!(mode_of(&root.join("collector").join("hennery.db")), 0o600);
    unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut up.up, Duration::from_secs(15)).is_some());
}

/// Review of the fix wave: `up` names an existing data root that other
/// users can reach into, and leaves it as it is, like the collector does
/// for its own directory.
#[test]
fn up_warns_about_a_loose_existing_data_root() {
    use std::os::unix::fs::PermissionsExt;
    let dir = scratch_dir("looseroot");
    let _cleanup = RemoveDir(dir.clone());
    let root = dir.join("data");
    std::fs::create_dir(&root).unwrap();
    std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o755)).unwrap();

    let log = dir.join("up.log");
    let mut up = up_logging_to(&root, &log);
    up.wait_until("the warning about the data root", || {
        std::fs::read_to_string(&log).is_ok_and(|text| {
            text.lines()
                .any(|line| line.contains("readable by other users") && line.contains(&root.display().to_string()))
        })
    });
    assert_eq!(mode_of(&root), 0o755, "the operator's directory was changed");
    unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut up.up, Duration::from_secs(15)).is_some());
}

/// The processes (pid and command line) whose command line names `dir`: an
/// `up` on `dir` and its children, found also once they are orphaned.
fn processes_naming(dir: &std::path::Path) -> Vec<(i32, String)> {
    let out = Command::new("ps")
        .args(["-A", "-ww", "-o", "pid=,command="])
        .output()
        .unwrap();
    assert!(out.status.success(), "ps failed: {out:?}");
    let dir = dir.display().to_string();
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter(|line| line.contains(&dir))
        .filter_map(|line| {
            let (pid, command) = line.trim().split_once(' ')?;
            Some((pid.parse().ok()?, command.to_string()))
        })
        .collect()
}

/// SIGKILLs, on drop, every process whose command line names this
/// directory: only processes this test started name it.
struct KillNaming(std::path::PathBuf);

impl Drop for KillNaming {
    fn drop(&mut self) {
        for (pid, _) in processes_naming(&self.0) {
            unsafe { libc::kill(pid, libc::SIGKILL) };
        }
    }
}

/// `up` catches SIGTERM from before it starts a child: one that comes just
/// after the collector's spawn must still stop the collector, not kill `up`
/// by the default action and leave its collector running with nobody to
/// stop it.
///
/// Each attempt sends SIGTERM a little later (0 to 1 ms) after `up`'s
/// warning about its loose data root, which it logs just before it spawns.
/// Deterministic: `up` must exit 0, having caught the signal, on every
/// attempt; a `up` that installs its handlers only later dies of the
/// signal whenever it comes first. And no process naming the data root may
/// outlive `up`, by a `ps` scan first shown to see such a process.
#[test]
fn a_sigterm_as_up_starts_leaves_no_child_running() {
    use std::os::unix::fs::PermissionsExt;
    let dir = scratch_dir("earlyterm");
    let _cleanup = RemoveDir(dir.clone());
    // The scan below must not pass for want of seeing anything: it does see
    // a live process whose command line names a directory here. Checked
    // apart from `up`, as a `ps` between the warning and the signal would
    // take longer than the window.
    let probe_dir = dir.join("probe");
    let mut probe = Command::new("/bin/sh")
        // Not a lone command, which the shell would exec, losing its $0.
        .args(["-c", "sleep 30; exit 0"])
        .arg(&probe_dir)
        .process_group(0)
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(10);
    let mut seen = Vec::new();
    // Polled: until it has exec'd, the probe's command line is this binary's.
    while !seen.iter().any(|&(pid, _)| pid == probe.id() as i32) && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(20));
        seen = processes_naming(&probe_dir);
    }
    // The whole group: the shell's `sleep` too.
    unsafe { libc::kill(-(probe.id() as i32), libc::SIGKILL) };
    let _ = probe.wait();
    assert!(
        seen.iter().any(|&(pid, _)| pid == probe.id() as i32),
        "ps does not see the probe: {seen:?}"
    );
    for attempt in 0..5 {
        let root = dir.join(format!("data-{attempt}"));
        std::fs::create_dir(&root).unwrap();
        std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o755)).unwrap();
        let _orphans = KillNaming(root.clone());
        let log = dir.join(format!("up-{attempt}.log"));
        let mut up = up_logging_to(&root, &log);
        let deadline = Instant::now() + Duration::from_secs(20);
        while !std::fs::read_to_string(&log).is_ok_and(|text| text.contains("readable by other users")) {
            up.assert_running("the warning about the data root");
            assert!(Instant::now() < deadline, "timed out waiting for the warning");
            std::thread::sleep(Duration::from_micros(100));
        }
        let offset = Duration::from_micros(250 * attempt);
        let start = Instant::now();
        while start.elapsed() < offset {
            std::hint::spin_loop();
        }
        unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
        let status = wait_with_timeout(&mut up.up, Duration::from_secs(30)).expect("up did not exit");
        assert!(
            status.success(),
            "attempt {attempt}: up did not catch the SIGTERM: {status}"
        );
        // `up` waits for its children before it exits: none may be left.
        let deadline = Instant::now() + Duration::from_secs(2);
        let mut left = processes_naming(&root);
        while !left.is_empty() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(50));
            left = processes_naming(&root);
        }
        assert!(
            left.is_empty(),
            "attempt {attempt}: still running after up exited: {left:?}"
        );
    }
}

/// `--listen-fd` (`up`'s hand-over) adopts only a listening TCP socket: a
/// closed descriptor, a file, a UDP socket, a TCP socket that does not
/// listen (never bound, or bound and never listened on) and a listening
/// Unix socket are refused at once with a message naming it, before the
/// data directory is made, not adopted to abort, hang or serve later. Also
/// refused: a standard stream's number, `--listen` with it, and one
/// descriptor given twice.
#[test]
fn the_collector_refuses_a_listen_fd_that_is_not_a_listening_socket() {
    use std::os::fd::{AsRawFd, OwnedFd};
    let dir = scratch_dir("badlistenfd");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let file: OwnedFd = std::fs::File::open("/dev/null").unwrap().into();
    let udp: OwnedFd = std::net::UdpSocket::bind("127.0.0.1:0").unwrap().into();
    // Close-on-exec, so it leaks into no child another test spawns: at
    // once on Linux, right after socket(2) on macOS (no SOCK_CLOEXEC).
    // SAFETY: socket(2) and fcntl(2) on the new descriptor, owned at once.
    let stream_socket = || -> OwnedFd {
        #[cfg(target_os = "linux")]
        let fd = unsafe { libc::socket(libc::AF_INET, libc::SOCK_STREAM | libc::SOCK_CLOEXEC, 0) };
        #[cfg(not(target_os = "linux"))]
        let fd = unsafe { libc::socket(libc::AF_INET, libc::SOCK_STREAM, 0) };
        assert!(fd >= 0);
        assert_eq!(unsafe { libc::fcntl(fd, libc::F_SETFD, libc::FD_CLOEXEC) }, 0);
        unsafe { std::os::fd::FromRawFd::from_raw_fd(fd) }
    };
    let tcp = stream_socket();
    // Bound to a port (port 0: the system picks one), never listened on:
    // macOS used to take this one.
    // SAFETY: bind(2) on a local address.
    let bound: OwnedFd = unsafe {
        let socket = stream_socket();
        let fd = socket.as_raw_fd();
        let mut addr: libc::sockaddr_in = std::mem::zeroed();
        addr.sin_family = libc::AF_INET as libc::sa_family_t;
        addr.sin_addr.s_addr = u32::from(std::net::Ipv4Addr::LOCALHOST).to_be();
        let rc = libc::bind(
            fd,
            (&raw const addr).cast(),
            std::mem::size_of::<libc::sockaddr_in>() as libc::socklen_t,
        );
        assert_eq!(rc, 0, "{}", std::io::Error::last_os_error());
        socket
    };
    let unix: OwnedFd = std::os::unix::net::UnixListener::bind(dir.join("s")).unwrap().into();
    let listening: OwnedFd = std::net::TcpListener::bind("127.0.0.1:0").unwrap().into();
    let collector = |fd: Option<&OwnedFd>, args: &[&str]| {
        let mut cmd = hennery();
        cmd.arg("collector").args(args).arg("--data-dir").arg(&data);
        if fd.is_none() {
            // Another test's spawn can leak a descriptor into this child for
            // a moment (macOS makes a pipe or socket close-on-exec only after
            // it exists), and it may sit at 50: closed here, so what is
            // tested is a closed descriptor.
            // SAFETY: close(2) in the forked child, before exec; async-signal-safe.
            unsafe {
                cmd.pre_exec(|| {
                    libc::close(50);
                    Ok(())
                });
            }
        }
        if let Some(fd) = fd {
            let fd = fd.as_raw_fd();
            // SAFETY: dup2 in the forked child, before exec; async-signal-safe.
            unsafe {
                // Already 50, maybe: a busy test binary has that many open.
                cmd.pre_exec(move || hennery_testkit::place_fd(fd, 50));
            }
        }
        let mut child = cmd
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        let status = wait_with_timeout(&mut child, Duration::from_secs(15));
        let _ = child.kill();
        let _ = child.wait();
        let mut stderr = String::new();
        child.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
        (status, stderr)
    };
    for (what, fd, expected) in [
        ("a closed descriptor", None, "is not an open descriptor"),
        ("a file", Some(&file), "is not a socket"),
        ("a UDP socket", Some(&udp), "is not a stream (TCP) socket"),
        (
            "a TCP socket that does not listen",
            Some(&tcp),
            "is not a listening socket",
        ),
        (
            "a TCP socket bound and never listened on",
            Some(&bound),
            "is not a listening socket",
        ),
        ("a listening Unix socket", Some(&unix), "is not a TCP socket"),
    ] {
        // 50: well above what the collector's own runtime opens at start.
        let (status, stderr) = collector(fd, &["--listen-fd", "50"]);
        let status = status.unwrap_or_else(|| panic!("{what}: the collector hung"));
        assert!(!status.success(), "{what}: adopted");
        assert!(stderr.contains(expected), "{what}: {stderr}");
        assert!(!data.exists(), "{what}: the data directory was made");
    }
    for args in [
        &["--listen-fd", "2"][..],
        &["--listen-fd", "50", "--listen", "127.0.0.1:0"],
    ] {
        let (status, stderr) = collector(Some(&listening), args);
        assert!(!status.unwrap().success(), "{args:?} was taken: {stderr}");
    }
    // A descriptor given twice would be adopted as two listeners sharing one
    // socket: refused before anything is created (decision 14, A6). Without
    // the guard this stays green on Linux (the second `TcpListener::from_std`
    // still fails, but only after `private_data_dir` ran), so both the
    // message and "nothing was made" are pinned here, not just `!success()`.
    let (status, stderr) = collector(Some(&listening), &["--listen-fd", "50", "--listen-fd", "50"]);
    assert!(!status.unwrap().success(), "was taken: {stderr}");
    assert!(stderr.contains("--listen-fd 50 is given twice"), "{stderr}");
    assert!(!data.exists(), "the data directory was made");
}

/// 3a/3b's deferred check: the pairing pipe's ends `up` hands its children,
/// `collector --pairing-code-fd` and `host run --join-code-fd`, must be open
/// pipes, as `--listen-fd` must be a listening socket. A closed descriptor,
/// a file (`/dev/null`) and a socket are refused at once with a message
/// naming the flag and the descriptor, before the data directory is made;
/// so is a standard stream's number. A paired host checks it too, before it
/// closes the descriptor as not needed.
#[test]
fn the_code_descriptors_must_be_open_pipes() {
    use std::os::fd::{AsRawFd, OwnedFd};
    let dir = scratch_dir("badcodefd");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let file: OwnedFd = std::fs::File::open("/dev/null").unwrap().into();
    // The other end is held open: a read from this one would block.
    let (socket, _peer) = std::os::unix::net::UnixStream::pair().unwrap();
    let socket: OwnedFd = socket.into();
    // `--listen 127.0.0.1:0`: should a check let it through, this collector
    // must not take a port another one may be serving.
    let collector = |data: &std::path::Path, fd: &str| -> Command {
        let mut cmd = hennery();
        cmd.args(["collector", "--listen", "127.0.0.1:0", "--pairing-code-fd", fd])
            .arg("--data-dir")
            .arg(data);
        cmd
    };
    let host = |data: &std::path::Path, fd: &str| -> Command {
        let mut cmd = hennery();
        cmd.args(["host", "run", "--join-url", "http://127.0.0.1:1", "--join-code-fd", fd])
            .arg("--data-dir")
            .arg(data);
        cmd
    };
    let run = |mut cmd: Command, fd: Option<&OwnedFd>| {
        for var in [
            "HENNERY_LISTEN",
            "HENNERY_DATA_DIR",
            "HENNERY_HOST_DATA_DIR",
            "HENNERY_PUBLIC_URL",
        ] {
            cmd.env_remove(var);
        }
        let fd = fd.map(|fd| fd.as_raw_fd());
        // SAFETY: dup2 and close in the forked child, before exec;
        // async-signal-safe.
        unsafe {
            cmd.pre_exec(move || match fd {
                Some(fd) => hennery_testkit::place_fd(fd, 50),
                // Closed for certain: something another thread opened
                // without close-on-exec may sit at 50.
                None => {
                    libc::close(50);
                    Ok(())
                }
            });
        }
        let mut child = cmd
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        let status = wait_with_timeout(&mut child, Duration::from_secs(15));
        let _ = child.kill();
        let _ = child.wait();
        let mut stderr = String::new();
        child.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
        (status, stderr)
    };
    // Plan 7c-iii: the parent pipe's end, `--parent-fd`, alike.
    let collector_parent = |data: &std::path::Path, fd: &str| -> Command {
        let mut cmd = hennery();
        cmd.args(["collector", "--listen", "127.0.0.1:0", "--parent-fd", fd])
            .arg("--data-dir")
            .arg(data);
        cmd
    };
    let host_parent = |data: &std::path::Path, fd: &str| -> Command {
        let mut cmd = hennery();
        cmd.args(["host", "run", "--parent-fd", fd]).arg("--data-dir").arg(data);
        cmd
    };
    type Make<'a> = &'a dyn Fn(&std::path::Path, &str) -> Command;
    for (flag, make) in [
        ("--pairing-code-fd", &collector as Make),
        ("--join-code-fd", &host),
        ("--parent-fd", &collector_parent),
        ("--parent-fd", &host_parent),
    ] {
        for (what, fd, expected) in [
            ("a closed descriptor", None, "is not an open descriptor"),
            ("a file", Some(&file), "is not a pipe"),
            ("a socket", Some(&socket), "is not a pipe"),
        ] {
            // 50: well above what the child's own runtime opens at start.
            let (status, stderr) = run(make(&data, "50"), fd);
            let status = status.unwrap_or_else(|| panic!("{flag}, {what}: the child hung"));
            assert!(!status.success(), "{flag}, {what}: taken");
            assert!(
                stderr.contains(&format!("{flag} 50 {expected}")),
                "{flag}, {what}: {stderr}"
            );
            assert!(!data.exists(), "{flag}, {what}: the data directory was made");
        }
        // Standard error is a pipe here, so only the range refuses it: a
        // collector would write the code to it, a host would take it over.
        let (status, stderr) = run(make(&data, "2"), None);
        assert!(!status.unwrap().success(), "{flag} 2 was taken: {stderr}");
        assert!(
            stderr.contains(&format!("invalid value '2' for '{flag}")),
            "{flag} 2: {stderr}"
        );
        assert!(!data.exists(), "{flag} 2: the data directory was made");
    }

    // A paired host does not need the code, but still refuses a bad
    // descriptor rather than closing whatever is at that number.
    let (_rt, addr, code) = collector_with_a_pairing_code(&dir);
    let paired = dir.join("paired");
    let out = hennery()
        .args([
            "host",
            "join",
            &format!("http://{addr}"),
            &code,
            "--name",
            "laptop",
            "--no-runtime",
        ])
        .arg("--data-dir")
        .arg(&paired)
        .env_remove("HENNERY_HOST_DATA_DIR")
        .output()
        .unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    for (what, fd, expected) in [
        ("a closed descriptor", None, "is not an open descriptor"),
        ("a socket", Some(&socket), "is not a pipe"),
    ] {
        let (status, stderr) = run(host(&paired, "50"), fd);
        let status = status.unwrap_or_else(|| panic!("paired, {what}: the host ran"));
        assert!(!status.success(), "paired, {what}: taken");
        assert!(
            stderr.contains(&format!("--join-code-fd 50 {expected}")),
            "paired, {what}: {stderr}"
        );
    }
}

/// Plan 3a's deferred EOF fail-safe (kernel spec §4.2): the collector
/// child dies before it writes the pairing code, so the host's read of
/// `--join-code-fd` gets end-of-file. The host must fail, saying so, and
/// pair nothing: no pairing stored, no host enrolled, although a live code
/// and a collector to spend it on are there.
///
/// The shell makes the pipe and runs `:` as the collector, which exits
/// without writing: no end of it is ever open in this (multithreaded) test
/// process, so no spawn on another thread can inherit the writer and hold
/// the end-of-file back. Only the host's side is pinned here: that `up`
/// drops its own copies of both ends is what lets the end-of-file arrive.
#[test]
fn the_host_fails_and_pairs_nothing_when_the_collector_dies_before_the_code() {
    let dir = scratch_dir("codeeof");
    let _cleanup = RemoveDir(dir.clone());
    let (_rt, addr, _code) = collector_with_a_pairing_code(&dir);
    let host_dir = dir.join("host");
    // Offline and away from the real home, as `hennery()` is: this host
    // may reach the managed path.
    let mut cmd = Command::new("/bin/sh");
    offline(&mut cmd);
    let mut child = cmd
        .args([
            "-c",
            ": | exec \"$0\" \"$@\" 3<&0 </dev/null",
            env!("CARGO_BIN_EXE_hennery"),
        ])
        .args([
            "host",
            "run",
            "--join-url",
            &format!("http://{addr}"),
            "--join-code-fd",
            "3",
        ])
        .arg("--data-dir")
        .arg(&host_dir)
        .env_remove("HENNERY_HOST_DATA_DIR")
        .env_remove("HENNERY_DEV_TOKEN")
        .env_remove(LOG_VARS[0])
        .env_remove(LOG_VARS[1])
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        // Its own group: on a hang, the whole pipeline is killed below.
        .process_group(0)
        .spawn()
        .unwrap();
    let status = wait_with_timeout(&mut child, Duration::from_secs(30));
    if status.is_none() {
        unsafe { libc::kill(-(child.id() as i32), libc::SIGKILL) };
    }
    let _ = child.wait();
    let mut stderr = String::new();
    child.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
    let status = status.unwrap_or_else(|| panic!("the host hung on the closed pipe: {stderr}"));
    assert!(!status.success(), "the host ran without a code: {stderr}");
    assert!(
        stderr.contains("the collector exited without handing over a pairing code"),
        "{stderr}"
    );
    for file in ["host.key", "host.toml"] {
        assert!(!host_dir.join(file).exists(), "{file} was stored");
    }
    let hosts = hennery_kernel::hosts::Hosts::open(&dir.join("hennery.db")).unwrap();
    assert!(hosts.list().unwrap().is_empty(), "a host was enrolled");
}

/// Everything `pid`'s command line and environment hold, as text: from
/// `/proc` on Linux, and from `ps -E` elsewhere (macOS), which prints the
/// environment after the command line.
fn argv_and_environment(pid: i32) -> String {
    #[cfg(target_os = "linux")]
    {
        let read = |what: &str| {
            let bytes =
                std::fs::read(format!("/proc/{pid}/{what}")).unwrap_or_else(|err| panic!("{pid} {what}: {err}"));
            String::from_utf8_lossy(&bytes).replace('\0', " ")
        };
        format!("{}\n{}", read("cmdline"), read("environ"))
    }
    #[cfg(not(target_os = "linux"))]
    {
        let out = Command::new("ps")
            .args(["-E", "-ww", "-o", "command=", "-p", &pid.to_string()])
            .output()
            .unwrap();
        assert!(out.status.success(), "ps failed for {pid}: {out:?}");
        String::from_utf8_lossy(&out.stdout).into_owned()
    }
}

/// Plan 3a's deferred check (kernel spec §4.2): the pairing code travels
/// from `up`'s collector child to its host child over the pipe only, never
/// on either child's command line or in its environment, where any process
/// of the user's (and, for the command line, any user) could read it.
///
/// `up` runs with an environment of its own making, so nothing inherited
/// is shaped like a code. The probe is first shown to see a code's shape in
/// a process's arguments and in its environment, and then to see both
/// children's own flags and `up`'s marker variable. Read once the host has
/// paired, so the code has been handed over by then.
#[test]
fn the_pairing_code_never_reaches_ups_childrens_argv_or_environment() {
    let dir = scratch_dir("codeargv");
    let _cleanup = RemoveDir(dir.clone());

    // Control: the probe reads a process's arguments and its environment.
    // `hennery` itself, not a shell: macOS shows no platform binary's
    // environment (`/bin/sh`'s, say) to `ps -E`. `host join` with the code
    // left out waits on standard input, and gives up once that closes.
    let mut control = hennery()
        .args(["host", "join", "http://127.0.0.1:1", "--name", "ABCD-EFGH"])
        .arg("--data-dir")
        .arg(dir.join("control"))
        .env("HENNERY_PROBE_CONTROL", "WXYZ-2345")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .unwrap();
    // Right after `spawn` the child may not have finished `exec` yet, and
    // Linux shows it with an empty command line: read until it has.
    let deadline = Instant::now() + Duration::from_secs(10);
    let seen = loop {
        let seen = argv_and_environment(control.id() as i32);
        if seen.contains("ABCD-EFGH") || Instant::now() > deadline {
            break seen;
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    drop(control.stdin.take());
    assert!(wait_with_timeout(&mut control, Duration::from_secs(15)).is_some());
    let _ = control.kill();
    let _ = control.wait();
    assert!(seen.contains("ABCD-EFGH"), "the probe missed an argument: {seen}");
    assert!(
        seen.contains("HENNERY_PROBE_CONTROL=WXYZ-2345"),
        "the probe missed the environment: {seen}"
    );
    assert!(contains_a_pairing_code_shape(&seen));

    let data = dir.join("data");
    let log = dir.join("up.log");
    let mut command = hennery();
    command
        .env_clear()
        .env("HENNERY_NPM_REGISTRY", OFFLINE)
        .env("HENNERY_NODE_MIRROR", OFFLINE)
        .env("HOME", UNWRITABLE_HOME)
        .env("PATH", "/usr/bin:/bin")
        .env("HENNERY_PROBE_MARKER", "yes");
    let mut up = up_logging_to_with(command, &data, &log, &[]);
    let paired = data.join("host").join("host.toml");
    up.wait_until("the host paired", || paired.exists());
    let children = children_of(up.up.id() as i32);
    up.children.extend(&children);
    assert_eq!(children.len(), 2, "{children:?}");
    let seen: Vec<String> = children.iter().map(|&pid| argv_and_environment(pid)).collect();
    // The probe sees both children's own arguments and environment.
    for flag in ["--pairing-code-fd", "--join-code-fd"] {
        assert!(
            seen.iter().any(|text| text.contains(flag)),
            "no child has {flag}: {seen:?}"
        );
    }
    for text in &seen {
        assert!(text.contains("HENNERY_PROBE_MARKER=yes"), "{text}");
        assert!(
            !contains_a_pairing_code_shape(text),
            "a pairing code reached a child's argv or environment: {text}"
        );
    }

    unsafe { libc::kill(up.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut up.up, Duration::from_secs(15)).is_some());
}

/// Kernel spec §3.1: a collector that is not set up writes its one-time
/// setup link to `setup-url` (0600, under `umask 022` too) and, its output
/// not being a terminal, logs only that file's path: the token itself must
/// never reach a log collector.
#[test]
fn an_unset_collector_writes_its_setup_link_to_a_private_file_and_never_to_its_output() {
    let dir = scratch_dir("setup");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let log = dir.join("collector.log");

    let (mut collector, listen) = collector_under_umask_022(&data, &log);
    let file = data.join("setup-url");
    // The file is written before the line naming it is logged; that line
    // must be in the log before the collector is stopped.
    collector.wait_until("the setup link announced", || {
        std::fs::read_to_string(&log).is_ok_and(|text| text.contains(&file.display().to_string()))
    });
    assert_eq!(mode_of(&file), 0o600);
    let url = std::fs::read_to_string(&file).unwrap();
    let port = listen.rsplit(':').next().unwrap();
    let token = url
        .trim_end()
        .strip_prefix(&format!("http://localhost:{port}/setup#"))
        .unwrap_or_else(|| panic!("{url}"));
    assert_eq!(token.len(), 64, "{url}");
    unsafe { libc::kill(collector.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut collector.up, Duration::from_secs(15)).is_some());

    let stdout = std::fs::read_to_string(&log).unwrap();
    let stderr = std::fs::read_to_string(log.with_extension("err")).unwrap();
    assert!(
        !stdout.contains(token) && !stderr.contains(token),
        "the setup token was logged"
    );
    assert!(stdout.contains(&file.display().to_string()), "{stdout}");
}

/// A collector served in this process on `dir`'s database, with one pairing
/// code minted: the runtime serving it (keep it alive), its address and the
/// code.
fn collector_with_a_pairing_code(dir: &std::path::Path) -> (tokio::runtime::Runtime, std::net::SocketAddr, String) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let (addr, code) = rt.block_on(async {
        let db = dir.join("hennery.db");
        let state = hennery_sessions::AppState::new(
            hennery_sessions::store::Store::open(&db).unwrap(),
            hennery_kernel::hosts::Hosts::open(&db).unwrap(),
            hennery_kernel::operator::Operator::open(&db).unwrap(),
        );
        let code = state
            .hosts
            .mint_pairing_code(hennery_kernel::secret::unix_now())
            .unwrap()
            .code;
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(hennery_sessions::serve(listener, state));
        (addr, code)
    });
    (rt, addr, code)
}

/// `hennery host join` to the collector at `addr`, into `host`, with the
/// code left out (so read from standard input) and every stream piped.
fn join_from_stdin(addr: std::net::SocketAddr, host: &std::path::Path) -> std::process::Child {
    hennery()
        .args([
            "host",
            "join",
            &format!("http://{addr}"),
            "--name",
            "laptop",
            "--no-runtime",
        ])
        .arg("--data-dir")
        .arg(host)
        .env_remove("HENNERY_HOST_DATA_DIR")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .unwrap()
}

/// 3a's deferred M5: a pairing code on the command line is in the process
/// list and the shell history, so `host join` also takes it on standard
/// input when it is left out, and refuses an empty one.
#[test]
fn join_reads_the_code_from_standard_input_when_it_is_left_out() {
    let dir = scratch_dir("stdin-code");
    let _cleanup = RemoveDir(dir.clone());
    let (_rt, addr, code) = collector_with_a_pairing_code(&dir);
    let join = |stdin: &str| {
        let mut child = join_from_stdin(addr, &dir.join("host"));
        child.stdin.take().unwrap().write_all(stdin.as_bytes()).unwrap();
        child.wait_with_output().unwrap()
    };

    let empty = join("\n");
    assert!(!empty.status.success());
    assert!(String::from_utf8_lossy(&empty.stderr).contains("no pairing code"));

    let out = join(&format!("{code}\n"));
    assert!(
        out.status.success(),
        "stdout: {}\nstderr: {}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(String::from_utf8_lossy(&out.stdout).contains("paired as"));
}

/// 3a/3b's deferred bound on that read: a line of standard input longer than
/// any code is refused as soon as the bound is hit, without waiting for a
/// newline or the end, without echoing it and without pairing; the code it
/// began with still pairs afterwards.
#[test]
fn join_refuses_an_overlong_line_on_standard_input_at_once() {
    let dir = scratch_dir("stdin-overlong");
    let _cleanup = RemoveDir(dir.clone());
    let (_rt, addr, code) = collector_with_a_pairing_code(&dir);
    let host = dir.join("host");
    let mut child = join_from_stdin(addr, &host);
    let mut stdin = child.stdin.take().unwrap();
    // The real code, then 1 MiB with no newline, and standard input held
    // open: an unbounded read waits for more forever. The child stops
    // reading early, so the write may well fail (EPIPE); that is the point.
    let overlong = format!("{code}{}", "x".repeat(1 << 20));
    let writer = std::thread::spawn(move || {
        let _ = stdin.write_all(overlong.as_bytes());
        stdin
    });
    let status = wait_with_timeout(&mut child, Duration::from_secs(15));
    let _ = child.kill();
    let _ = child.wait();
    drop(writer.join().unwrap());
    let mut stderr = String::new();
    child.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
    let status = status.unwrap_or_else(|| panic!("join kept reading: {stderr}"));
    assert!(!status.success(), "{stderr}");
    assert!(
        stderr.contains("the pairing code on standard input is longer than 256 bytes"),
        "{stderr}"
    );
    assert!(
        !stderr.contains(&code) && !stderr.contains("xxxxxxxx"),
        "echoed: {stderr}"
    );
    let entries: Vec<_> = std::fs::read_dir(&host)
        .unwrap()
        .map(|entry| entry.unwrap().file_name())
        .collect();
    assert_eq!(
        entries,
        [std::ffi::OsString::from("host.lock")],
        "identity or enrollment artifacts were stored before a valid code"
    );

    let mut child = join_from_stdin(addr, &host);
    child
        .stdin
        .take()
        .unwrap()
        .write_all(format!("{code}\n").as_bytes())
        .unwrap();
    let out = child.wait_with_output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
}

/// `POST path` with no body on the collector at `listen`, with the owner's
/// `session` and `Origin: origin`: the status.
fn post_from(listen: &str, path: &str, session: &str, origin: &str) -> Option<u16> {
    let mut stream = TcpStream::connect(listen).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(15))).ok()?;
    write!(
        stream,
        "POST {path} HTTP/1.1\r\nHost: {listen}\r\nCookie: hennery_session={session}\r\nOrigin: {origin}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    )
    .ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    response.split(' ').nth(1)?.parse().ok()
}

/// `GET path` on the collector at `listen`, without a session: the status
/// and the body.
fn get_plain(listen: &str, path: &str) -> Option<(u16, String)> {
    let mut stream = TcpStream::connect(listen).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(15))).ok()?;
    write!(
        stream,
        "GET {path} HTTP/1.1\r\nHost: {listen}\r\nConnection: close\r\n\r\n"
    )
    .ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let (head, body) = response.split_once("\r\n\r\n")?;
    Some((head.split(' ').nth(1)?.parse().ok()?, body.to_string()))
}

/// Kernel spec §7: a collector given several addresses serves the same
/// routes and the same state on each, with the same browser rules, and
/// browser access stays bound to `public_url`: a state-changing request on
/// the second listener needs the first's origin, the one set up as
/// `public_url`, not the second's own.
#[test]
fn every_listen_address_serves_the_same_collector() {
    let dir = scratch_dir("listeners");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let log = dir.join("collector.log");
    let collector = hennery()
        .args(["collector", "--listen", "127.0.0.1:0", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(&data)
        .stdout(std::fs::File::create(&log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    let mut collector = KillTree::new(collector, &log);
    let addresses = collector.listening_on(2);
    assert_ne!(addresses[0], addresses[1]);
    let (first, second) = (&addresses[0], &addresses[1]);
    // `public_url` is `http://<first>`.
    let session = sign_in(&mut collector, first, &data);
    for address in &addresses {
        assert_eq!(get_plain(address, "/healthz"), Some((200, "ok".into())), "{address}");
        assert!(get_json(address, "/api/hosts", &session).is_some(), "{address}");
    }
    assert_eq!(
        post_from(second, "/api/auth/logout", &session, &format!("http://{second}")),
        Some(403),
        "the second listener's own origin was taken for public_url"
    );
    assert_eq!(
        post_from(second, "/api/auth/logout", &session, &format!("http://{first}")),
        Some(204)
    );
    // The logout on the second listener ended the session on the first.
    assert!(get_json(first, "/api/hosts", &session).is_none());
}

/// Kernel spec §7, §11: start fails when any one of several addresses is
/// taken, for `collector` and for `up`, before either touches its data
/// directory.
#[test]
fn a_taken_listen_address_fails_the_start_before_the_data_dir_is_touched() {
    let dir = scratch_dir("taken");
    let _cleanup = RemoveDir(dir.clone());
    let taken = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let taken = taken.local_addr().unwrap().to_string();
    for command in ["collector", "up"] {
        let data = dir.join(command);
        let out = hennery()
            .args([command, "--listen", "127.0.0.1:0", "--listen", &taken])
            .arg("--data-dir")
            .arg(&data)
            .output()
            .unwrap();
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(!out.status.success(), "{command} started: {stderr}");
        assert!(stderr.contains(&format!("bind {taken}")), "{command}: {stderr}");
        assert!(!data.exists(), "{command} made its data directory");
    }
}

/// `up` binds every address and hands each to its collector child (kernel
/// spec §7): its host connects over the first, and the second serves the
/// same collector. A `HENNERY_LISTEN` in `up`'s environment (which its
/// flags override) does not reach the child, which would otherwise refuse
/// it beside `--listen-fd`.
#[test]
fn up_hands_every_listen_address_to_its_collector() {
    let dir = scratch_dir("uplisteners");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let log = dir.join("up.log");
    let mut command = hennery();
    command.env("HENNERY_LISTEN", "127.0.0.1:0");
    let mut up = up_logging_to_with(command, &data, &log, &["--listen", "127.0.0.1:0"]);
    let addresses = up.listening_on(2);
    let session = sign_in(&mut up, &addresses[0], &data.join("collector"));
    up.wait_until("the host connected, seen on the second listener", || {
        matches!(
            get_json(&addresses[1], "/api/hosts", &session),
            Some(serde_json::Value::Array(hosts)) if hosts.iter().any(|h| h["connected"] == true)
        )
    });
}

/// Kernel spec §2: `config.toml` gives `listen` and `public_url` when
/// neither a flag nor the environment does; `HENNERY_LISTEN` and
/// `HENNERY_PUBLIC_URL` win over the file, and flags over both. Counted by
/// the collector's listeners (the file names three, the environment two, a
/// flag one) and by the setup link, which names `public_url`.
#[test]
fn config_toml_yields_to_the_environment_and_the_environment_to_flags() {
    let dir = scratch_dir("config");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    std::fs::create_dir_all(&data).unwrap();
    std::fs::write(
        data.join("config.toml"),
        "listen = [\"127.0.0.1:0\", \"127.0.0.1:0\", \"127.0.0.1:0\"]\npublic_url = \"https://file.example\"\n",
    )
    .unwrap();
    // Private whatever the umask: a file others can write is refused.
    std::fs::set_permissions(
        data.join("config.toml"),
        std::os::unix::fs::PermissionsExt::from_mode(0o644),
    )
    .unwrap();
    let run = |env: &[(&str, &str)], args: &[&str], name: &str| {
        let log = dir.join(format!("{name}.log"));
        let collector = hennery()
            .arg("collector")
            .args(args)
            .arg("--data-dir")
            .arg(&data)
            .envs(env.iter().copied())
            .stdout(std::fs::File::create(&log).unwrap())
            .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
            .spawn()
            .unwrap();
        let mut collector = KillTree::new(collector, &log);
        let file = data.join("setup-url");
        // Written after every listener's line is logged.
        collector.wait_until("the setup link", || file.exists());
        let link = std::fs::read_to_string(&file).unwrap();
        let listeners = listening_addresses(&std::fs::read_to_string(&log).unwrap()).len();
        unsafe { libc::kill(collector.up.id() as i32, libc::SIGTERM) };
        assert!(wait_with_timeout(&mut collector.up, Duration::from_secs(15)).is_some());
        let _ = std::fs::remove_file(&file);
        let origin = link.split("/setup#").next().unwrap().to_string();
        (listeners, origin)
    };
    assert_eq!(run(&[], &[], "file"), (3, "https://file.example".to_string()));
    let env = [
        ("HENNERY_LISTEN", "127.0.0.1:0,127.0.0.1:0"),
        ("HENNERY_PUBLIC_URL", "https://env.example"),
    ];
    assert_eq!(run(&env, &[], "env"), (2, "https://env.example".to_string()));
    assert_eq!(
        run(
            &env,
            &["--listen", "127.0.0.1:0", "--public-url", "https://flag.example"],
            "flag"
        ),
        (1, "https://flag.example".to_string())
    );
}

/// A `config.toml` that does not parse, names a key hennery does not know,
/// or that other users can write, stops the start with the file's name,
/// before anything is bound or created.
#[test]
fn a_bad_config_toml_stops_the_start() {
    let dir = scratch_dir("badconfig");
    let _cleanup = RemoveDir(dir.clone());
    for (name, text, mode, expected) in [
        ("typo", "listens = [\"127.0.0.1:0\"]\n", 0o644, "unknown field"),
        (
            "public_url",
            "public_url = \"http://hennery.example\"\n",
            0o644,
            "public_url must be https://",
        ),
        ("writable", "listen = [\"127.0.0.1:0\"]\n", 0o666, "chmod go-w"),
    ] {
        use std::os::unix::fs::PermissionsExt;
        let data = dir.join(name);
        std::fs::create_dir_all(&data).unwrap();
        std::fs::write(data.join("config.toml"), text).unwrap();
        std::fs::set_permissions(data.join("config.toml"), std::fs::Permissions::from_mode(mode)).unwrap();
        // On port 0, and bounded: a collector that ignored the file would
        // serve rather than stop, and never on the default port.
        let mut child = hennery()
            .args(["collector", "--listen", "127.0.0.1:0", "--data-dir"])
            .arg(&data)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        let status = wait_with_timeout(&mut child, Duration::from_secs(15));
        let _ = child.kill();
        let _ = child.wait();
        let mut stderr = String::new();
        child.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
        assert!(status.is_some_and(|s| !s.success()), "{name}: started: {stderr}");
        assert!(stderr.contains(expected), "{name}: {stderr}");
        assert!(stderr.contains("config.toml"), "{name}: {stderr}");
        assert!(!data.join("hennery.db").exists(), "{name}: the database was made");
    }
}

/// `up --public-url` reaches its collector child, whose setup link names it
/// (kernel spec §3.1).
#[test]
fn up_hands_its_public_url_to_its_collector() {
    let dir = scratch_dir("uppublicurl");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let mut up = up_logging_to_with(
        hennery(),
        &data,
        &dir.join("up.log"),
        &["--public-url", "https://up.example"],
    );
    let file = data.join("collector").join("setup-url");
    up.wait_until("the setup link", || file.exists());
    let link = std::fs::read_to_string(&file).unwrap();
    assert!(link.starts_with("https://up.example/setup#"), "{link}");
}

/// A collector on port 0 in `data`, logging to `log`, once it serves: the
/// guard, and the address it listens on.
fn collector_on(data: &std::path::Path, log: &std::path::Path) -> (KillTree, String) {
    let collector = hennery()
        .args(["collector", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(data)
        .stdout(std::fs::File::create(log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    let mut guard = KillTree::new(collector, log);
    let listen = guard.listening();
    guard.wait_until("the admin socket", || data.join("admin.sock").exists());
    (guard, listen)
}

/// `hennery admin --data-dir <data> <args…>` with no terminal: standard
/// input is empty.
fn admin(data: &std::path::Path, args: &[&str]) -> std::process::Output {
    hennery()
        .arg("admin")
        .arg("--data-dir")
        .arg(data)
        .args(args)
        .stdin(std::process::Stdio::null())
        .output()
        .unwrap()
}

/// Like `admin`, with a terminal (a pty) as standard input, into which
/// `typed` is typed ahead: the confirmations' path. A command still
/// waiting for input after 20 seconds (typed-ahead input lost, say) is
/// killed and fails the test.
fn admin_on_a_terminal(data: &std::path::Path, args: &[&str], typed: &str) -> std::process::Output {
    let (master, slave) = open_pty();
    let mut child = hennery()
        .arg("admin")
        .arg("--data-dir")
        .arg(data)
        .args(args)
        .stdin(std::process::Stdio::from(slave))
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    (&master).write_all(typed.as_bytes()).unwrap();
    let Some(status) = wait_with_timeout(&mut child, Duration::from_secs(20)) else {
        let _ = child.kill();
        let _ = child.wait();
        panic!("`hennery admin {args:?}` still waited for input");
    };
    drop(master);
    // Its output is a few lines: it fit the pipes while it ran.
    let (mut stdout, mut stderr) = (Vec::new(), Vec::new());
    child.stdout.take().unwrap().read_to_end(&mut stdout).unwrap();
    child.stderr.take().unwrap().read_to_end(&mut stderr).unwrap();
    std::process::Output { status, stdout, stderr }
}

/// Like `admin_on_a_terminal`, typing each `(prompt, typed)`'s `typed` only
/// once `prompt` is on the command's standard error, as a person would.
/// Also returns everything the terminal showed (its echo).
fn admin_conversation(data: &std::path::Path, args: &[&str], steps: &[(&str, &str)]) -> (std::process::Output, String) {
    use std::sync::{Arc, Mutex};
    let (master, slave) = open_pty();
    let mut child = hennery()
        .arg("admin")
        .arg("--data-dir")
        .arg(data)
        .args(args)
        .stdin(std::process::Stdio::from(slave))
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    // Read on throughout: what the terminal shows, and the prompts.
    let collect = |mut from: Box<dyn Read + Send>| {
        let text = Arc::new(Mutex::new(Vec::new()));
        let sink = text.clone();
        let thread = std::thread::spawn(move || {
            let mut buf = [0u8; 1024];
            while let Ok(n) = from.read(&mut buf) {
                if n == 0 {
                    break;
                }
                sink.lock().unwrap().extend_from_slice(&buf[..n]);
            }
        });
        (text, thread)
    };
    let (shown, shown_thread) = collect(Box::new(master.try_clone().unwrap()));
    let (stderr, stderr_thread) = collect(Box::new(child.stderr.take().unwrap()));
    for (prompt, typed) in steps {
        let deadline = Instant::now() + Duration::from_secs(20);
        while !String::from_utf8_lossy(&stderr.lock().unwrap()).contains(prompt) {
            if Instant::now() > deadline || matches!(child.try_wait(), Ok(Some(_))) {
                let _ = child.kill();
                let _ = child.wait();
                panic!("no {prompt:?}: {}", String::from_utf8_lossy(&stderr.lock().unwrap()));
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        (&master).write_all(typed.as_bytes()).unwrap();
    }
    let Some(status) = wait_with_timeout(&mut child, Duration::from_secs(20)) else {
        let _ = child.kill();
        let _ = child.wait();
        panic!("`hennery admin {args:?}` still waited for input");
    };
    drop(master);
    let mut stdout = Vec::new();
    child.stdout.take().unwrap().read_to_end(&mut stdout).unwrap();
    // Both end once the command has exited: the terminal with its last
    // holder, standard error with the command.
    stderr_thread.join().unwrap();
    shown_thread.join().unwrap();
    let stderr = stderr.lock().unwrap().clone();
    let shown = String::from_utf8_lossy(&shown.lock().unwrap()).into_owned();
    (std::process::Output { status, stdout, stderr }, shown)
}

/// A new pty: its master end, and its slave end for a child's standard
/// input.
fn open_pty() -> (std::fs::File, std::os::fd::OwnedFd) {
    use std::os::fd::{FromRawFd, OwnedFd};
    let (mut master, mut slave) = (-1, -1);
    // SAFETY: openpty(3) into two local ints, with no name and the default
    // settings. The `fcntl(F_SETFD)` calls below are separate syscalls, not
    // atomic with the open: a child spawned by another test thread in
    // between inherits both ends, and holds them open until it exits (the
    // unbounded `shown_thread.join()` above then waits that long too). The
    // fds are otherwise unused until returned, and owned.
    unsafe {
        let rc = libc::openpty(
            &mut master,
            &mut slave,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );
        assert_eq!(rc, 0, "{}", std::io::Error::last_os_error());
        for fd in [master, slave] {
            libc::fcntl(fd, libc::F_SETFD, libc::FD_CLOEXEC);
        }
        (std::fs::File::from_raw_fd(master), OwnedFd::from_raw_fd(slave))
    }
}

/// `POST /api/auth/login` with `password`, from `origin`: the status.
///
/// The request goes out in one write. A refused origin is answered before
/// the body is read, and the collector then closes: a body still unread, or
/// still on its way (`write!` sends each piece apart), resets the
/// connection, and the 403 already received is lost to the reset.
fn login(listen: &str, origin: &str, password: &str) -> Option<u16> {
    let body = serde_json::json!({ "password": password }).to_string();
    let mut stream = TcpStream::connect(listen).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(15))).ok()?;
    let request = format!(
        "POST /api/auth/login HTTP/1.1\r\nHost: {listen}\r\nOrigin: {origin}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(request.as_bytes()).ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    response.split(' ').nth(1)?.parse().ok()
}

/// Kernel spec §4.2: the commands that change state or hand out a
/// credential ask for confirmation on a terminal, and without one they
/// refuse and send nothing. Printing the setup link and listing hosts
/// need none; the setup link printed is the one in `setup-url`.
#[test]
fn admin_commands_that_change_state_need_a_terminal() {
    let dir = scratch_dir("adminnotty");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (mut collector, listen) = collector_on(&data, &dir.join("collector.log"));
    collector.wait_until("the setup link", || data.join("setup-url").exists());
    let out = admin(&data, &["setup-url"]);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert_eq!(
        String::from_utf8_lossy(&out.stdout),
        std::fs::read_to_string(data.join("setup-url")).unwrap()
    );
    let session = sign_in(&mut collector, &listen, &data);

    for args in [
        &["reset-password"][..],
        &["pairing-code"],
        &["reset-public-url", "https://moved.example"],
    ] {
        let out = admin(&data, args);
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(!out.status.success(), "{args:?} ran without a terminal");
        assert!(stderr.contains("on a terminal"), "{args:?}: {stderr}");
        assert!(!contains_a_pairing_code_shape(&String::from_utf8_lossy(&out.stdout)));
    }
    // Nothing reached the collector: the session and the origin still hold.
    assert!(get_json(&listen, "/api/hosts", &session).is_some());
    assert_eq!(
        post_from(&listen, "/api/auth/logout", &session, &format!("http://{listen}")),
        Some(204)
    );

    let out = admin(&data, &["hosts"]);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert_eq!(String::from_utf8_lossy(&out.stdout), "");
    let out = admin(&data, &["setup-url"]);
    assert!(!out.status.success());
    assert!(String::from_utf8_lossy(&out.stderr).contains("set up already"));
}

/// 3b decision 4's lock-out, recovered live: a collector set up at one
/// origin and then reached at another refuses every login from the new one.
/// `hennery admin reset-public-url`, confirmed on a terminal, moves it
/// without a restart: the new origin signs in, the old one no longer does,
/// and the sessions of the old are gone.
#[test]
fn a_moved_collector_is_recovered_over_the_admin_socket() {
    let dir = scratch_dir("adminmove");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (mut collector, listen) = collector_on(&data, &dir.join("collector.log"));
    // Set up at `http://127.0.0.1:<port>`, then reached as `localhost`.
    let session = sign_in(&mut collector, &listen, &data);
    let old = format!("http://{listen}");
    let new = format!("http://localhost:{}", listen.rsplit(':').next().unwrap());
    assert_eq!(login(&listen, &new, PASSWORD), Some(403), "not locked out");

    let refused = admin_on_a_terminal(&data, &["reset-public-url", &new], "no\n");
    assert!(!refused.status.success());
    assert!(String::from_utf8_lossy(&refused.stderr).contains("not confirmed"));
    // Kernel spec §3.2: it says passkeys stop working before it asks.
    assert!(
        String::from_utf8_lossy(&refused.stderr).contains("Passkeys stop working if the host name changes"),
        "{}",
        String::from_utf8_lossy(&refused.stderr)
    );
    assert_eq!(login(&listen, &new, PASSWORD), Some(403), "moved without a yes");

    let out = admin_on_a_terminal(&data, &["reset-public-url", &new], "yes\n");
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert!(
        String::from_utf8_lossy(&out.stdout).contains(&format!("public_url is now {new}")),
        "{}",
        String::from_utf8_lossy(&out.stdout)
    );
    assert!(
        String::from_utf8_lossy(&out.stdout).contains("0 passkey(s) removed"),
        "{}",
        String::from_utf8_lossy(&out.stdout)
    );
    assert_eq!(login(&listen, &new, PASSWORD), Some(204));
    assert_eq!(login(&listen, &old, PASSWORD), Some(403));
    assert!(
        get_json(&listen, "/api/hosts", &session).is_none(),
        "an old session survived"
    );
}

/// `hennery admin reset-password` reads the new password twice from the
/// terminal and, confirmed, replaces it and signs every session out. Two
/// different entries change nothing.
#[test]
fn a_password_reset_over_the_admin_socket_signs_everyone_out() {
    const NEW: &str = "a new long password";
    let dir = scratch_dir("adminpassword");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (mut collector, listen) = collector_on(&data, &dir.join("collector.log"));
    let session = sign_in(&mut collector, &listen, &data);
    let origin = format!("http://{listen}");

    let differ = admin_on_a_terminal(&data, &["reset-password"], &format!("{NEW}\nsomething else\n"));
    assert!(!differ.status.success());
    assert!(String::from_utf8_lossy(&differ.stderr).contains("differ"));
    // 3c review, A1: it says, before it asks for the password, that every
    // passkey goes.
    let stderr = String::from_utf8_lossy(&differ.stderr);
    let warned = stderr.find("This removes every passkey").expect("the passkey warning");
    assert!(warned < stderr.find("New password: ").unwrap(), "{stderr}");
    assert!(get_json(&listen, "/api/hosts", &session).is_some());

    // Typed only once each prompt is shown, as a person would: none of it
    // may be echoed.
    let line = format!("{NEW}\n");
    let (out, shown) = admin_conversation(
        &data,
        &["reset-password"],
        &[
            ("New password: ", &line),
            ("The same again: ", &line),
            ("Type yes", "yes\n"),
        ],
    );
    // Echo is back on at the confirmation, so the reader having seen
    // nothing at all here would let the assertion below pass vacuously:
    // prove it actually captured the terminal first.
    assert!(shown.contains("yes"), "{shown:?}");
    assert!(!shown.contains(NEW), "the terminal echoed the password: {shown:?}");
    let stdout = String::from_utf8_lossy(&out.stdout);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert!(
        stdout.contains("1 session(s) signed out, 0 passkey(s) removed"),
        "{stdout}"
    );
    assert!(!stdout.contains(NEW) && !String::from_utf8_lossy(&out.stderr).contains(NEW));
    assert!(
        get_json(&listen, "/api/hosts", &session).is_none(),
        "a session survived"
    );
    assert_eq!(login(&listen, &origin, PASSWORD), Some(401));
    assert_eq!(login(&listen, &origin, NEW), Some(204));
}

/// 3b-ii's deferred item: with no collector serving the data directory,
/// the commands that prompt fail before they ask for anything, so no
/// password is typed into a dead end.
#[test]
fn admin_commands_that_prompt_check_the_socket_first() {
    let dir = scratch_dir("adminnone");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    std::fs::create_dir_all(&data).unwrap();
    for args in [
        &["reset-password"][..],
        &["pairing-code"],
        &["reset-public-url", "https://moved.example"],
    ] {
        let out = admin_on_a_terminal(&data, args, "a new long password\na new long password\nyes\n");
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(!out.status.success(), "{args:?}: {stderr}");
        assert!(stderr.contains("is the collector running?"), "{args:?}: {stderr}");
        assert!(
            !stderr.contains("New password") && !stderr.contains("Type yes"),
            "{args:?} prompted first: {stderr}"
        );
    }
}

/// A collector whose admin socket takes the connection and never answers:
/// `hennery admin` gives up, saying the command's outcome is unknown,
/// rather than waiting for ever. The bound is shortened for the test.
#[test]
fn admin_gives_up_on_a_collector_that_never_answers() {
    let dir = scratch_dir("adminmute");
    let _cleanup = RemoveDir(dir.clone());
    let socket = dir.join("admin.sock");
    let listener = std::os::unix::net::UnixListener::bind(&socket).unwrap();
    let (done, wait) = std::sync::mpsc::channel::<()>();
    let mute = std::thread::spawn(move || {
        // Taken, held unanswered until the test is done, then closed.
        let held = listener.accept().map(|(stream, _)| stream);
        let _ = wait.recv();
        drop(held);
    });
    let mut child = hennery()
        .arg("admin")
        .arg("--data-dir")
        .arg(&dir)
        .arg("hosts")
        .env("HENNERY_ADMIN_TIMEOUT_MS", "500")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    let status = wait_with_timeout(&mut child, Duration::from_secs(15));
    if status.is_none() {
        let _ = child.kill();
        let _ = child.wait();
    }
    done.send(()).unwrap();
    // Unblocks `accept` if the client never connected, so the join cannot
    // hang the test.
    let _ = std::os::unix::net::UnixStream::connect(&socket);
    mute.join().unwrap();
    let status = status.expect("`hennery admin hosts` still waited for an answer");
    let mut stderr = Vec::new();
    child.stderr.take().unwrap().read_to_end(&mut stderr).unwrap();
    let stderr = String::from_utf8_lossy(&stderr);
    assert!(!status.success(), "{stderr}");
    assert!(stderr.contains("did not answer within 500ms"), "{stderr}");
    assert!(stderr.contains("outcome is unknown"), "{stderr}");
}

/// The longest path a Unix socket can be bound at, in bytes.
fn max_socket_path_bytes() -> usize {
    // SAFETY: all-zero bytes are a valid `sockaddr_un`.
    let addr: libc::sockaddr_un = unsafe { std::mem::zeroed() };
    addr.sun_path.len() - 1
}

/// 3b-ii's O7: when the data directory's `admin.sock` path is too long for
/// a Unix socket (the collector then runs without one), `hennery admin`
/// says so, naming the path and the limit, before it prompts. Also for
/// `hennery up`'s data directory whose own `admin.sock` would fit, but
/// whose collector's, one directory down, does not.
#[test]
fn admin_names_a_socket_path_too_long_for_a_unix_socket() {
    // Under /tmp, not the temporary directory: a long `TMPDIR` could leave
    // no room to pad the paths below to exactly one byte too long.
    let dir = std::path::Path::new("/tmp").join(format!("hennery-cli-adminlong-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let _cleanup = RemoveDir(dir.clone());
    let max = max_socket_path_bytes();
    let long = dir.join("d".repeat(max));
    std::fs::create_dir_all(&long).unwrap();
    // Padded so that `<ups>/collector/admin.sock` is one byte too long.
    let base = dir.join("u").as_os_str().len() + "/collector/admin.sock".len();
    let ups = dir.join(format!("u{}", "u".repeat(max + 1 - base)));
    std::fs::create_dir_all(ups.join("collector")).unwrap();
    assert!(ups.join("admin.sock").as_os_str().len() <= max);
    let too_long = format!("longer than a Unix socket path can be ({max} bytes at most)");
    for (data, socket) in [
        (&long, long.join("admin.sock")),
        (&ups, ups.join("collector").join("admin.sock")),
    ] {
        assert!(socket.as_os_str().len() > max);
        let out = admin(data, &["hosts"]);
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(!out.status.success(), "{stderr}");
        assert!(stderr.contains(&too_long), "{stderr}");
        assert!(stderr.contains(&socket.display().to_string()), "{stderr}");
        let out = admin_on_a_terminal(data, &["reset-password"], "a new long password\n");
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(!out.status.success(), "{stderr}");
        assert!(stderr.contains(&too_long), "{stderr}");
        assert!(!stderr.contains("New password"), "it prompted first: {stderr}");
    }
}

/// `hennery admin pairing-code`, confirmed on a terminal, prints a code
/// that `host join` pairs with; `hennery admin hosts` then lists the host,
/// also given `hennery up`'s data directory rather than the collector's.
#[test]
fn a_pairing_code_from_the_admin_socket_pairs_a_host() {
    let dir = scratch_dir("admincode");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (_collector, listen) = collector_on(&data, &dir.join("collector.log"));
    let out = admin_on_a_terminal(&data, &["pairing-code"], "yes\n");
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let code = String::from_utf8_lossy(&out.stdout).trim().to_string();
    assert!(contains_a_pairing_code_shape(&code), "{code}");
    let join = hennery()
        .args([
            "host",
            "join",
            &format!("http://{listen}"),
            &code,
            "--name",
            "laptop",
            "--no-runtime",
        ])
        .arg("--data-dir")
        .arg(dir.join("host"))
        .output()
        .unwrap();
    assert!(join.status.success(), "{}", String::from_utf8_lossy(&join.stderr));
    let out = admin(&dir, &["hosts"]);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let listed = String::from_utf8_lossy(&out.stdout);
    assert!(listed.contains("\tlaptop\t") && listed.contains("\tpaired"), "{listed}");
}

/// `hennery collector healthcheck` (distribution spec §1, §4.1), as the
/// image's `HEALTHCHECK` runs it: the address from `--listen` or
/// `HENNERY_LISTEN` (the image sets the variable), with `HENNERY_DATA_DIR`
/// set too. 0 while the collector serves, 1 once it is gone.
#[test]
fn the_healthcheck_passes_while_the_collector_serves_and_fails_once_it_stops() {
    let dir = scratch_dir("healthcheck");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let log = dir.join("collector.log");
    let collector = hennery()
        .args(["collector", "--listen", "127.0.0.1:0"])
        .arg("--data-dir")
        .arg(&data)
        .stdout(std::fs::File::create(&log).unwrap())
        .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    let mut collector = KillTree::new(collector, &log);
    let address = collector.listening();
    let healthcheck = |how: &dyn Fn(&mut Command)| {
        let mut command = hennery();
        command
            .args(["collector", "healthcheck"])
            .env_remove("HENNERY_LISTEN")
            .env_remove("HENNERY_DATA_DIR");
        how(&mut command);
        command.output().unwrap()
    };
    let by_flag = |command: &mut Command| {
        command.arg("--listen").arg(&address);
    };
    let by_environment = |command: &mut Command| {
        command.env("HENNERY_LISTEN", &address).env("HENNERY_DATA_DIR", &data);
    };
    for (how, set) in [
        ("--listen", &by_flag as &dyn Fn(&mut Command)),
        ("HENNERY_LISTEN", &by_environment),
    ] {
        let out = healthcheck(set);
        assert!(
            out.status.success(),
            "{how}: {:?} {}",
            out.status,
            String::from_utf8_lossy(&out.stderr)
        );
    }
    drop(collector);
    for (how, set) in [
        ("--listen", &by_flag as &dyn Fn(&mut Command)),
        ("HENNERY_LISTEN", &by_environment),
    ] {
        let out = healthcheck(set);
        assert_eq!(
            out.status.code(),
            Some(1),
            "{how}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(
            String::from_utf8_lossy(&out.stderr).contains("unhealthy"),
            "{how}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
    }
}

/// `collector` with no data directory takes the platform's (distribution
/// spec §8), here under a home that cannot be created, so it fails at once
/// naming it; `collector healthcheck` takes none of the collector's own
/// flags.
#[test]
fn the_collector_without_a_data_dir_takes_the_default_and_the_healthcheck_no_collector_flags() {
    let run = |args: &[&str]| hennery().args(args).env_remove("HENNERY_LISTEN").output().unwrap();
    let out = run(&["collector"]);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert_eq!(out.status.code(), Some(1), "{stderr}");
    assert!(stderr.contains("/nonexistent-hennery-test/home"), "{stderr}");
    let out = run(&["collector", "--data-dir", "/nonexistent", "healthcheck"]);
    assert_eq!(out.status.code(), Some(2), "{}", String::from_utf8_lossy(&out.stderr));
}

/// `host join` with no data directory, where the platform's default is
/// `hennery up`'s, refuses before reaching any collector, and names
/// `--data-dir`: up pairs its own host.
#[test]
fn host_join_with_no_data_dir_refuses_ups_default_directory() {
    let dir = scratch_dir("joinup");
    let _cleanup = RemoveDir(dir.clone());
    let home = dir.join("home");
    let data = if cfg!(target_os = "macos") {
        home.join("Library/Application Support/hennery")
    } else {
        dir.join("xdg-data/hennery")
    };
    std::fs::create_dir_all(data.join("host")).unwrap();
    std::fs::write(data.join("host").join(hennery_host::identity::CONFIG_FILE), "").unwrap();
    let out = hennery()
        .args(["host", "join", "http://127.0.0.1:1", "AAAA-AAAA"])
        .env("HOME", &home)
        .env("XDG_DATA_HOME", dir.join("xdg-data"))
        .env("XDG_CONFIG_HOME", dir.join("xdg-config"))
        .output()
        .unwrap();
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert_eq!(out.status.code(), Some(1), "{stderr}");
    assert!(
        stderr.contains("up pairs its own host") && stderr.contains("--data-dir"),
        "{stderr}"
    );
    assert!(!data.join("host.key").exists() && !data.join(hennery_host::identity::CONFIG_FILE).exists());
}

/// `host.lock` (distribution spec §8): while `up`'s host child runs on
/// `<data>/host`, a second `hennery host run` there refuses to start, names
/// the holder's pid, and touches nothing first: not even a pairing left
/// half-done (`host.key.pending`, `host.toml.pending`), which reading the
/// pairing would roll forward over the first host's. The first host keeps
/// the lock, and stays connected.
#[test]
fn a_second_host_on_one_data_directory_refuses_to_start() {
    let dir = scratch_dir("hostlock");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let (mut up, listen, ids, session) = up_until_connected(&data, &dir.join("up.log"), None);
    let lock = data.join("host").join("host.lock");
    let holder = std::fs::read_to_string(&lock).unwrap();
    let holder = holder.trim().to_string();
    assert!(holder.parse::<i32>().is_ok_and(pid_alive), "{holder:?}");
    // A pairing staged and not yet put in place, as a crash in the middle
    // of a join leaves one: whoever reads the pairing renames both files
    // into place. The second host must refuse before it reads it.
    let key = hennery_host::identity::HostKey::generate();
    let key_pending = data.join("host").join("host.key.pending");
    key.save(&key_pending).unwrap();
    let pending = data.join("host").join("host.toml.pending");
    let staged = format!(
        "collector = \"ws://127.0.0.1:9/api/hosts/ws\"\nhost_id = \"host-staged\"\npublic_key = \"{}\"\n",
        key.public_key_hex()
    );
    std::fs::write(&pending, &staged).unwrap();

    let mut second = hennery()
        .args(["host", "run"])
        .arg("--data-dir")
        .arg(data.join("host"))
        .stdout(std::process::Stdio::null())
        .stderr(std::fs::File::create(dir.join("second.err")).unwrap())
        .spawn()
        .unwrap();
    let status = wait_with_timeout(&mut second, Duration::from_secs(20));
    if status.is_none() {
        let _ = second.kill();
        let _ = second.wait();
    }
    let stderr = std::fs::read_to_string(dir.join("second.err")).unwrap();
    let status = status.unwrap_or_else(|| panic!("a second host kept running: {stderr}"));
    assert!(!status.success(), "{stderr}");
    assert!(
        stderr.contains("host.lock") && stderr.contains(&format!("pid {holder}")),
        "{stderr}"
    );
    assert_eq!(std::fs::read_to_string(&pending).unwrap(), staged);
    assert!(key_pending.exists(), "the staged key was put in place");
    std::fs::remove_file(&pending).unwrap();
    std::fs::remove_file(&key_pending).unwrap();
    up.assert_running("the first host");
    assert_eq!(std::fs::read_to_string(&lock).unwrap().trim(), holder);
    assert!(holder.parse::<i32>().is_ok_and(pid_alive), "{holder:?}");
    let hosts = get_json(&listen, "/api/hosts", &session).unwrap();
    assert_eq!(hosts[0]["host_id"], ids[0].as_str());
    assert_eq!(hosts[0]["connected"], true, "{hosts}");
}

/// `up.lock`: a second `hennery up` on one data root refuses to start,
/// before it starts any child, and the first keeps serving.
#[test]
fn a_second_up_on_one_data_root_refuses_to_start() {
    let dir = scratch_dir("uplock");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let (mut first, listen, _, session) = up_until_connected(&data, &dir.join("first.log"), None);
    let log = dir.join("second.log");
    let mut second = up_logging_to(&data, &log);
    let status = wait_with_timeout(&mut second.up, Duration::from_secs(20)).expect("the second up kept running");
    let stderr = std::fs::read_to_string(log.with_extension("err")).unwrap();
    assert!(!status.success(), "{stderr}");
    assert!(
        stderr.contains("up.lock") && stderr.contains(&format!("pid {}", first.up.id())),
        "{stderr}"
    );
    first.assert_running("the first up");
    assert!(get_json(&listen, "/api/hosts", &session).is_some());
}

/// `up`'s report of its children (`supervisor.json`), as JSON.
fn supervisor_state(data: &std::path::Path) -> Option<serde_json::Value> {
    serde_json::from_slice(&std::fs::read(data.join("supervisor.json")).ok()?).ok()
}

/// Distribution spec §5.2: a child killed outright, once past its start, is
/// started again: the host reconnects with its pairing, and the collector
/// serves on the same port, with the sessions it had.
#[test]
fn a_killed_child_is_started_again() {
    let dir = scratch_dir("restart");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let (mut up, listen, ids, session) = up_until_connected(&data, &dir.join("up.log"), None);
    let up_pid = up.up.id() as i32;
    // Past the startup grace (5 s), counted from now, when both children
    // run already: the kill counts as a crash, not as a failed start.
    std::thread::sleep(Duration::from_secs(6));
    let lock = data.join("host").join("host.lock");
    let host = pid_from(&lock).expect("the host's pid");
    // Both children, as `pgrep` sees them: polled, not read once.
    let mut collector = 0;
    up.wait_until("up's two children", || {
        let children = children_of(up_pid);
        collector = children.iter().copied().find(|&pid| pid != host).unwrap_or(0);
        children.len() == 2 && children.contains(&host) && collector != 0
    });
    up.children = vec![host, collector];

    unsafe { libc::kill(host, libc::SIGKILL) };
    let mut again = 0;
    up.wait_until("the host started again", || {
        again = pid_from(&lock).unwrap_or(host);
        again != host && pid_alive(again)
    });
    up.children.push(again);
    up.wait_until("the host reported running again", || {
        supervisor_state(&data).is_some_and(|s| s["host"]["restarts"] == 1 && s["host"]["state"] == "running")
    });
    up.wait_until("the host connected again", || {
        get_json(&listen, "/api/hosts", &session).is_some_and(|hosts| {
            hosts.as_array().is_some_and(|hosts| {
                hosts.len() == 1 && hosts[0]["host_id"] == ids[0].as_str() && hosts[0]["connected"] == true
            })
        })
    });

    unsafe { libc::kill(collector, libc::SIGKILL) };
    up.wait_until("the collector reported running again", || {
        supervisor_state(&data).is_some_and(|s| s["collector"]["restarts"] == 1 && s["collector"]["state"] == "running")
    });
    up.children.extend(children_of(up_pid));
    // The same port, and the session from before the crash.
    up.wait_until("the collector serving again", || {
        get_json(&listen, "/api/hosts", &session).is_some_and(|hosts| hosts[0]["connected"] == true)
    });
    let state = supervisor_state(&data).unwrap();
    assert_eq!(state["pid"], up_pid, "{state}");
    assert_eq!(state["host"]["last_exit"], "signal: 9 (SIGKILL)", "{state}");
}

/// `hennery service …` in a scratch home: HOME and the XDG directories in
/// `dir`, and PATH starting with stand-ins for `launchctl`, `systemctl` and
/// `loginctl` that only record that they ran. Every command these tests
/// run refuses before it would reach the service manager, and the
/// stand-ins prove it.
fn service(dir: &std::path::Path, args: &[&str]) -> std::process::Output {
    use std::os::unix::fs::PermissionsExt;
    let stubs = dir.join("stubs");
    std::fs::create_dir_all(&stubs).unwrap();
    for name in ["launchctl", "systemctl", "loginctl"] {
        let stub = stubs.join(name);
        std::fs::write(
            &stub,
            format!(
                "#!/bin/sh\necho {name} \"$@\" >> \"{}\"\nexit 1\n",
                dir.join("ran").display()
            ),
        )
        .unwrap();
        std::fs::set_permissions(&stub, std::fs::Permissions::from_mode(0o755)).unwrap();
    }
    hennery()
        .arg("service")
        .args(args)
        .env("HOME", dir.join("home"))
        .env("XDG_CONFIG_HOME", dir.join("config"))
        .env("XDG_DATA_HOME", dir.join("data"))
        .env("PATH", format!("{}:/usr/bin:/bin", stubs.display()))
        .output()
        .unwrap()
}

/// The service file of `role` in `service`'s scratch home.
fn service_file(dir: &std::path::Path, role: &str) -> std::path::PathBuf {
    if cfg!(target_os = "macos") {
        dir.join("home/Library/LaunchAgents")
            .join(format!("dev.hennery.{role}.plist"))
    } else {
        let unit = match role {
            "up" => "hennery.service".to_string(),
            other => format!("hennery-{other}.service"),
        };
        dir.join("config/systemd/user").join(unit)
    }
}

/// `--role host` on a data directory with no pairing, and a second role
/// beside an installed one, are refused before anything is written or run.
#[test]
fn service_install_refuses_an_unpaired_host_and_a_second_role() {
    let dir = scratch_dir("svcinstall");
    let _cleanup = RemoveDir(dir.clone());
    let empty = dir.join("empty");
    let empty = empty.to_str().unwrap();
    let out = service(&dir, &["install", "--role", "host", "--data-dir", empty]);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(!out.status.success());
    assert!(stderr.contains("holds no pairing"), "{stderr}");
    assert!(!service_file(&dir, "host").exists());

    let up = service_file(&dir, "up");
    std::fs::create_dir_all(up.parent().unwrap()).unwrap();
    std::fs::write(&up, "").unwrap();
    let out = service(&dir, &["install", "--role", "collector"]);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(!out.status.success());
    assert!(stderr.contains("uninstall --role up"), "{stderr}");
    assert!(!service_file(&dir, "collector").exists());
    assert!(
        !dir.join("ran").exists(),
        "{:?}",
        std::fs::read_to_string(dir.join("ran"))
    );
}

#[test]
fn service_help_lists_install_uninstall_and_status() {
    let out = hennery().args(["service", "--help"]).output().unwrap();
    let text = String::from_utf8_lossy(&out.stdout);
    for command in ["install", "uninstall", "status"] {
        assert!(text.contains(command), "{text}");
    }
}

/// Nothing installed: `status` says so and exits 1, `uninstall` has nothing
/// to do; neither asks the service manager.
#[test]
fn service_status_with_nothing_installed_fails_without_asking_the_manager() {
    let dir = scratch_dir("svcstatus");
    let _cleanup = RemoveDir(dir.clone());
    let out = service(&dir, &["status"]);
    assert_eq!(out.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&out.stdout).contains("no hennery service is installed"));
    let out = service(&dir, &["uninstall"]);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert!(
        !dir.join("ran").exists(),
        "{:?}",
        std::fs::read_to_string(dir.join("ran"))
    );
}

/// Plan 7b: no test of this binary may reach the npm registry or nodejs.org.
/// Every spawn of `hennery` goes through `hennery()` or `under_umask_022()`,
/// which point both mirrors at a loopback port nothing answers on.
#[test]
fn every_spawn_of_the_binary_is_offline() {
    // Spelt in pieces, so these lines are not counted themselves.
    let token = concat!("CARGO_BIN_", "EXE_hennery");
    let source = include_str!("cli.rs");
    let spawns: Vec<&str> = source
        .lines()
        .filter(|line| line.contains(token))
        .map(str::trim)
        .collect();
    assert_eq!(
        spawns,
        [
            format!("let mut cmd = Command::new(env!(\"{token}\"));"),
            format!("cmd.args([\"-c\", \"umask 022; exec \\\"$0\\\" \\\"$@\\\"\", env!(\"{token}\")]);"),
            format!("env!(\"{token}\"),"),
        ],
        "spawn the binary through hennery() or under_umask_022(), which keep it offline"
    );
    assert_eq!(source.matches(concat!("offline(&mut ", "cmd)")).count(), 3);
    // And `offline` keeps every spawn away from the real home, and from
    // the agents' own homes whoever runs the tests exported.
    assert!(source.contains(concat!(".env(\"HOME\", ", "UNWRITABLE_HOME)")));
    for var in ["XDG_DATA_HOME", "XDG_CONFIG_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME"] {
        assert!(
            source.contains(&format!(".env(\"{var}\", format!(\"{{UNWRITABLE_HOME}}")),
            "{var}"
        );
    }
    for var in [
        "HENNERY_DATA_DIR",
        "HENNERY_HOST_DATA_DIR",
        "CLAUDE_CONFIG_DIR",
        "CODEX_HOME",
        "CODEX_SQLITE_HOME",
    ] {
        assert!(source.contains(&format!(".env_remove(\"{var}\")")), "{var}");
    }
    // `offline` and the one test that clears the environment set both
    // mirrors (the Task 7 review: a cleared environment reached the real
    // registry).
    assert_eq!(
        source
            .matches(concat!(".env(\"HENNERY_NPM_REGISTRY\", ", "OFFLINE)"))
            .count(),
        2
    );
    assert_eq!(
        source
            .matches(concat!(".env(\"HENNERY_NODE_MIRROR\", ", "OFFLINE)"))
            .count(),
        2
    );
    // A cleared environment is offline again on the very next lines.
    let lines: Vec<&str> = source.lines().map(str::trim).collect();
    for (i, line) in lines.iter().enumerate() {
        if line.contains(concat!(".env_", "clear()")) {
            let next = lines[i + 1..(i + 4).min(lines.len())].join(" ");
            assert!(
                next.contains("HENNERY_NPM_REGISTRY")
                    && next.contains("HENNERY_NODE_MIRROR")
                    && next.matches("OFFLINE").count() == 2
                    && next.contains("UNWRITABLE_HOME"),
                "line {}: a cleared environment must set both mirrors and the unwritable home again",
                i + 1
            );
        }
    }
}

/// A loopback mirror serving `bodies` (path → bytes), else 404: as the
/// registry or nodejs.org would, but with whatever bytes a test wants.
fn mirror(bodies: std::collections::HashMap<String, Vec<u8>>) -> String {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { return };
            let mut head = Vec::new();
            let mut byte = [0u8; 1];
            while !head.ends_with(b"\r\n\r\n") && stream.read(&mut byte).unwrap_or(0) == 1 {
                head.push(byte[0]);
            }
            let head = String::from_utf8_lossy(&head);
            let path = head.split_whitespace().nth(1).unwrap_or("/");
            let _ = match bodies.get(path) {
                Some(body) => stream
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .and_then(|()| stream.write_all(body)),
                None => stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"),
            };
        }
    });
    base
}

/// A complete set, as an install leaves one, without downloading it: its
/// record, `.in-use`, each agent's `entry` and the runtime's `bin/node`
/// (a shell script). Returns the set's directory.
fn fabricate_set(
    host_dir: &std::path::Path,
    id: &str,
    runtime: &str,
    node: &str,
    adapters: &[(&str, &str)],
) -> std::path::PathBuf {
    use hennery_host::runtime::install::{RecordAdapter, SetRecord};
    use std::os::unix::fs::PermissionsExt;
    let set = host_dir.join("adapters/sets").join(id);
    let record = SetRecord {
        layout: hennery_host::runtime::install::LAYOUT,
        id: id.to_string(),
        manifest_hash: "0".repeat(64),
        platform: hennery_host::runtime::manifest::Platform::current()
            .unwrap()
            .key()
            .to_string(),
        runtime: runtime.to_string(),
        adapters: adapters
            .iter()
            .map(|(name, entry)| {
                let file = set.join(name).join(entry);
                std::fs::create_dir_all(file.parent().unwrap()).unwrap();
                std::fs::write(&file, "// entry\n").unwrap();
                (
                    name.to_string(),
                    RecordAdapter {
                        version: "9.9.9".into(),
                        entry: entry.to_string(),
                        cli_skipped: false,
                    },
                )
            })
            .collect(),
    };
    std::fs::write(set.join("hennery-set.json"), serde_json::to_string(&record).unwrap()).unwrap();
    std::fs::write(set.join(".in-use"), "").unwrap();
    let bin = host_dir.join("runtimes").join(runtime).join("bin");
    std::fs::create_dir_all(&bin).unwrap();
    std::fs::write(bin.join("node"), format!("#!/bin/sh\n{node}\n")).unwrap();
    std::fs::set_permissions(bin.join("node"), std::fs::Permissions::from_mode(0o755)).unwrap();
    set
}

/// Point `adapters/<link>` at set `id`, as an install does.
fn link_set(host_dir: &std::path::Path, link: &str, id: &str) {
    let path = host_dir.join("adapters").join(link);
    let _ = std::fs::remove_file(&path);
    std::os::unix::fs::symlink(std::path::Path::new("sets").join(id), path).unwrap();
}

/// A paired host's data directory, without a collector.
fn paired_host(dir: &std::path::Path) {
    hennery_host::identity::Paired {
        collector_url: "ws://127.0.0.1:1/api/hosts/ws".into(),
        trust: Default::default(),
        host_id: "host-cli".into(),
        key: hennery_host::identity::HostKey::generate(),
        workspace_roots: Vec::new(),
    }
    .save(dir)
    .unwrap();
}

/// `host join` pairs, then installs the runtime (distribution §3.2). An
/// install that fails (here: offline) exits non-zero but keeps the pairing,
/// and says how to retry.
#[test]
fn join_installs_the_runtime_and_keeps_the_pairing_when_that_fails() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let dir = scratch_dir("join-runtime");
    let _cleanup = RemoveDir(dir.clone());
    let (addr, code) = rt.block_on(async {
        let db = dir.join("hennery.db");
        let state = hennery_sessions::AppState::new(
            hennery_sessions::store::Store::open(&db).unwrap(),
            hennery_kernel::hosts::Hosts::open(&db).unwrap(),
            hennery_kernel::operator::Operator::open(&db).unwrap(),
        );
        let code = state
            .hosts
            .mint_pairing_code(hennery_kernel::secret::unix_now())
            .unwrap()
            .code;
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(hennery_sessions::serve(listener, state));
        (addr, code)
    });
    let host = dir.join("host");
    let out = hennery()
        .args(["host", "join", &format!("http://{addr}"), &code, "--name", "laptop"])
        .arg("--data-dir")
        .arg(&host)
        .output()
        .unwrap();
    let (stdout, stderr) = (
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr),
    );
    assert!(!out.status.success(), "stdout: {stdout}\nstderr: {stderr}");
    assert!(stdout.contains("paired as host-"), "{stdout}");
    assert!(
        stderr.contains("the adapter runtime was not installed") && stderr.contains("hennery host adapters update"),
        "{stderr}"
    );
    assert!(host.join("host.key").exists() && host.join("host.toml").exists());
    assert!(!host.join("adapters/current").exists());
}

/// A mirror answering other bytes than pinned: the update aborts naming
/// it, nothing is installed, and the current set stays current.
#[test]
fn an_update_refuses_bytes_that_do_not_match_and_keeps_the_current_set() {
    let dir = scratch_dir("update-mismatch");
    let _cleanup = RemoveDir(dir.clone());
    let host = dir.join("host");
    paired_host(&host);
    let old = "0123456789abcdef0123456789abcdef";
    fabricate_set(&host, old, "node-0-test", "exit 0", &[("claude", "e.js")]);
    link_set(&host, "current", old);
    // Node comes first; the mirror serves zeros of exactly its pinned size.
    let manifest = hennery_host::runtime::manifest::Manifest::embedded();
    let platform = hennery_host::runtime::manifest::Platform::current().unwrap();
    let node = &manifest.node.platforms[platform.key()];
    let path = node.url.strip_prefix("https://nodejs.org/dist/").unwrap();
    let base = mirror([(format!("/node/{path}"), vec![0u8; node.archive_size as usize])].into());
    let out = hennery()
        .args(["host", "adapters", "update", "--data-dir"])
        .arg(&host)
        .args([
            "--npm-registry",
            &format!("{base}/npm/"),
            "--node-mirror",
            &format!("{base}/node/"),
        ])
        .output()
        .unwrap();
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(!out.status.success());
    assert!(
        stderr.contains("does not match the digest") && stderr.contains(&base),
        "{stderr}"
    );
    assert_eq!(
        std::fs::read_link(host.join("adapters/current")).unwrap(),
        std::path::Path::new("sets").join(old)
    );
    assert!(!host.join("adapters/previous").exists());
    assert_eq!(std::fs::read_dir(host.join("adapters/downloads")).unwrap().count(), 0);
}

/// `--use-cli` records the operator's CLI in `host.toml`, keeping the
/// pairing, and says what that costs; `=bundled` removes it; a relative
/// path, an unknown agent or an unpaired host are refused.
#[test]
fn use_cli_is_recorded_in_host_toml_and_bundled_removes_it() {
    let dir = scratch_dir("use-cli");
    let _cleanup = RemoveDir(dir.clone());
    let host = dir.join("host");
    let update = |extra: &[&str]| {
        hennery()
            .args(["host", "adapters", "update", "--data-dir"])
            .arg(&host)
            .args(extra)
            .output()
            .unwrap()
    };
    let unpaired = update(&["--use-cli", "claude=/bin/sh"]);
    assert!(!unpaired.status.success());
    assert!(String::from_utf8_lossy(&unpaired.stderr).contains("pair this host first"));
    // Neither an unpaired directory nor `up`'s own gets a set (the 7b-ii
    // review): the adapter commands act on a host's directory only.
    for command in ["update", "rollback"] {
        let out = hennery()
            .args(["host", "adapters", command, "--data-dir"])
            .arg(&dir)
            .output()
            .unwrap();
        assert!(!out.status.success(), "{command}");
        assert!(
            String::from_utf8_lossy(&out.stderr).contains("holds no pairing"),
            "{command}"
        );
    }
    assert!(!dir.join("adapters").exists() && !host.join("adapters").exists());

    paired_host(&host);
    let up_root = hennery()
        .args(["host", "adapters", "update", "--data-dir"])
        .arg(&dir)
        .output()
        .unwrap();
    let stderr = String::from_utf8_lossy(&up_root.stderr);
    assert!(
        !up_root.status.success() && stderr.contains("`hennery up`'s data directory"),
        "{stderr}"
    );
    assert!(!dir.join("adapters").exists(), "nothing installed at up's root");
    // Recorded before the install, which fails here (offline).
    let out = update(&["--use-cli", "claude=/bin/sh"]);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(
        stderr.contains("loses the pin's guarantee") && stderr.contains("MCP fallback"),
        "{stderr}"
    );
    let toml = std::fs::read_to_string(host.join("host.toml")).unwrap();
    assert!(
        toml.contains("[cli]") && toml.contains("claude = \"/bin/sh\""),
        "{toml}"
    );
    assert!(toml.contains("host_id = \"host-cli\""), "{toml}");
    let out = update(&["--use-cli", "claude=bundled"]);
    assert!(String::from_utf8_lossy(&out.stderr).contains("back to its bundled CLI"));
    let toml = std::fs::read_to_string(host.join("host.toml")).unwrap();
    assert!(!toml.contains("[cli]"), "{toml}");

    for bad in ["claude=sh", "gemini=/bin/sh", "claude=/nonexistent/claude"] {
        let out = update(&["--use-cli", bad]);
        assert_eq!(
            out.status.code(),
            Some(2),
            "{bad}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
    }
    // A mirror must be https (or loopback http): an update refuses one.
    let out = update(&["--npm-registry", "http://npm.example/", "--use-cli", "codex=/bin/sh"]);
    assert!(!out.status.success());
    assert!(String::from_utf8_lossy(&out.stderr).contains("must be https://"));
    // Refused before anything is recorded (the Task 7 review).
    let toml = std::fs::read_to_string(host.join("host.toml")).unwrap();
    assert!(!toml.contains("codex"), "{toml}");
    // `join` refuses one before it spends the code, and pairs nothing.
    let refused = hennery()
        .args([
            "host",
            "join",
            "http://127.0.0.1:1",
            "AAAA-AAAA",
            "--npm-registry",
            "http://npm.example/",
        ])
        .arg("--data-dir")
        .arg(dir.join("bad-mirror"))
        .output()
        .unwrap();
    assert!(!refused.status.success());
    assert!(String::from_utf8_lossy(&refused.stderr).contains("must be https://"));
    assert!(!dir.join("bad-mirror").join("host.key").exists());
    let both = hennery()
        .args([
            "host",
            "join",
            "http://127.0.0.1:1",
            "AAAA-AAAA",
            "--no-runtime",
            "--use-cli",
            "claude=/bin/sh",
        ])
        .arg("--data-dir")
        .arg(dir.join("other"))
        .output()
        .unwrap();
    assert_eq!(both.status.code(), Some(2), "--no-runtime with --use-cli");
}

/// `rollback` makes the previous set current, keeps the other as previous,
/// and holds the host on it.
#[test]
fn rollback_swaps_to_the_previous_set_and_holds_the_host() {
    let dir = scratch_dir("rollback");
    let _cleanup = RemoveDir(dir.clone());
    let host = dir.join("host");
    paired_host(&host);
    let (new, old) = ("11111111111111111111111111111111", "22222222222222222222222222222222");
    fabricate_set(&host, new, "node-0-test", "exit 0", &[("claude", "e.js")]);
    fabricate_set(&host, old, "node-0-test", "exit 0", &[("claude", "e.js")]);
    link_set(&host, "current", new);
    link_set(&host, "previous", old);
    let out = hennery()
        .args(["host", "adapters", "rollback", "--data-dir"])
        .arg(&host)
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&out.stdout);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert!(stdout.contains(&format!("from adapter set {new} to {old}")), "{stdout}");
    let target = |link: &str| std::fs::read_link(host.join("adapters").join(link)).unwrap();
    assert_eq!(target("current"), std::path::Path::new("sets").join(old));
    assert_eq!(target("previous"), std::path::Path::new("sets").join(new));
    assert!(host.join("adapters/hold").exists());
}

/// `hennery up` with no `--agent` runs `claude` from the installed set:
/// the runtime's node, the entry by its absolute path inside the set (never
/// through `current`), and none of the override variables `up` inherited
/// (A1). The set is the one this binary pins, so nothing is downloaded.
#[test]
fn a_host_without_agent_flags_runs_the_installed_set() {
    let dir = scratch_dir("managed");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    let host = data.join("host");
    let report = dir.join("report.txt");
    let selection = hennery_host::runtime::install::Selection::pinned(&Default::default()).unwrap();
    let entries: Vec<(&str, &str)> = selection
        .adapters
        .iter()
        .map(|a| (a.name.as_str(), a.entry.as_str()))
        .collect();
    let set = fabricate_set(
        &host,
        &selection.set_id(),
        &selection.runtime_name(),
        &format!(
            "printf '%s\\n' \"$@\" > {r}.tmp; env >> {r}.tmp; mv {r}.tmp {r}",
            r = report.display()
        ),
        &entries,
    );
    link_set(&host, "current", &selection.set_id());
    // Both run once first, so that macOS's check of a new program (the
    // binary, and the `node` script just written) is not timed as the
    // collector's start or the session's. The script's report of that run
    // goes.
    assert!(hennery().arg("--version").status().unwrap().success());
    let node = host.join("runtimes").join(selection.runtime_name()).join("bin/node");
    hennery_testkit::first_exec(node.to_str().unwrap());
    std::fs::remove_file(&report).unwrap();

    let log = dir.join("up.log");
    let mut command = hennery();
    command
        .env("CLAUDE_CODE_EXECUTABLE", "/inherited/claude")
        .env("CODEX_PATH", "/inherited/codex")
        .env("RUST_LOG", "info");
    let mut up = up_logging_to_with(command, &data, &log, &[]);
    let listen = up.listening();
    let session = sign_in(&mut up, &listen, &data.join("collector"));
    let mut host_id = String::new();
    up.wait_until("the host connected", || {
        let Some(serde_json::Value::Array(hosts)) = get_json(&listen, "/api/hosts", &session) else {
            return false;
        };
        match hosts.first() {
            Some(h) if h["connected"] == true => {
                host_id = h["host_id"].as_str().unwrap().to_string();
                true
            }
            _ => false,
        }
    });
    post_json(
        &listen,
        "/api/sessions",
        &session,
        &serde_json::json!({ "host_id": host_id, "agent": "claude", "cwd": dir }).to_string(),
    );
    up.wait_until("the adapter's report", || report.exists());
    let text = std::fs::read_to_string(&report).unwrap();
    let claude_entry = selection
        .adapters
        .iter()
        .find(|a| a.name == "claude")
        .unwrap()
        .entry
        .clone();
    assert_eq!(
        text.lines().next().unwrap(),
        set.join("claude").join(claude_entry).to_string_lossy(),
        "{text}"
    );
    assert!(!text.contains("/adapters/current/"), "{text}");
    assert!(
        !text.contains("/inherited/"),
        "an inherited override reached the adapter: {text}"
    );
    let logged = std::fs::read_to_string(&log).unwrap() + &std::fs::read_to_string(log.with_extension("err")).unwrap();
    assert!(logged.contains("agents from the adapter set"), "{logged}");
}

/// `path`'s text, or nothing while it is not there.
fn text_of(path: &std::path::Path) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

/// Plan 7c-iii, decision 2, through the binary: a relative
/// `HENNERY_LOG_DIR` stops the start at once (exit 1, `Error:`); a log
/// directory that cannot be made falls back to standard error, says why
/// there, and writes nothing to standard output: the development token's
/// warning, a `warn`, lands on standard error. `host run` on a data
/// directory that is not there ends at once either way.
#[test]
fn a_bad_log_directory_refuses_or_falls_back_to_standard_error() {
    let dir = scratch_dir("badlogdir");
    let _cleanup = RemoveDir(dir.clone());
    let run = |log_dir: &std::path::Path| {
        hennery()
            .args(["host", "run", "--data-dir"])
            .arg(dir.join("no-such-host"))
            .env("HENNERY_LOG_DIR", log_dir)
            .env("HENNERY_DEV_TOKEN", "unused")
            .env_remove("RUST_LOG")
            .env_remove("HENNERY_HOST_DATA_DIR")
            .output()
            .unwrap()
    };
    let out = run(std::path::Path::new("relative/logs"));
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert_eq!(out.status.code(), Some(1), "{stderr}");
    assert!(
        stderr.contains("Error: HENNERY_LOG_DIR is not an absolute path"),
        "{stderr}"
    );
    assert!(!stderr.contains("holds no pairing"), "the start went on: {stderr}");

    // A file where the directory would be: it cannot be made.
    let blocked = dir.join("blocked");
    std::fs::write(&blocked, "").unwrap();
    let out = run(&blocked.join("logs"));
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(out.stdout.is_empty(), "{}", String::from_utf8_lossy(&out.stdout));
    assert!(
        stderr.contains("hennery: cannot write the log in")
            && stderr.contains("logging warnings and errors to standard error"),
        "{stderr}"
    );
    assert!(stderr.contains(DEV_TOKEN_WARNING), "{stderr}");
    assert!(stderr.contains("holds no pairing"), "the start stopped: {stderr}");
}

/// Whether `pid` runs: alive, and not a zombie its new parent has yet to
/// reap (`kill(pid, 0)` succeeds on one).
fn running(pid: i32) -> bool {
    pid_alive(pid)
        && Command::new("ps")
            .args(["-o", "stat=", "-p", &pid.to_string()])
            .output()
            .is_ok_and(|out| {
                let stat = String::from_utf8_lossy(&out.stdout);
                let stat = stat.trim();
                !stat.is_empty() && !stat.starts_with('Z')
            })
}

/// Poll `probe` until it holds, failing after 40 seconds: for when the
/// process that would explain a failure is gone.
fn poll_until(what: &str, mut probe: impl FnMut() -> bool) {
    let deadline = Instant::now() + Duration::from_secs(40);
    while !probe() {
        assert!(Instant::now() < deadline, "timed out waiting for {what}");
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// `up`'s two children once both run, polled: the host's pid from
/// `host.lock`, the collector's from `pgrep`. Both are recorded in `up`, so
/// they are killed should the test fail.
fn ups_children(up: &mut KillTree, lock: &std::path::Path) -> (i32, i32) {
    let up_pid = up.up.id() as i32;
    let (mut host, mut collector) = (0, 0);
    up.wait_until("up's two children", || {
        host = pid_from(lock).unwrap_or(0);
        let children = children_of(up_pid);
        collector = children.iter().copied().find(|&pid| pid != host).unwrap_or(0);
        children.len() == 2 && children.contains(&host) && collector != 0
    });
    up.children.extend([host, collector]);
    (host, collector)
}

/// Plan 7c-iii: run by a service (`HENNERY_SERVICE` set, as both units set
/// it), `up` and its two children each log to a file of their own in
/// distribution spec §8's directory, private. Standard output, which launchd
/// keeps as `<role>.log`, gets nothing; standard error one line from each
/// naming its file. HOME and XDG_STATE_HOME are scratch directories: no real
/// log directory is touched.
///
/// `up` is then killed outright on its first start, when its host holds the
/// pairing pipe as well as the parent pipe: each child says, in its own
/// file, that `up` is gone.
#[test]
fn a_service_run_logs_to_its_own_files_and_not_to_its_output() {
    use std::os::unix::fs::PermissionsExt;
    let dir = scratch_dir("svclog");
    let _cleanup = RemoveDir(dir.clone());
    let (home, state) = (dir.join("home"), dir.join("state"));
    let logs = if cfg!(target_os = "macos") {
        home.join("Library/Logs/hennery")
    } else {
        state.join("hennery/log")
    };
    let mut command = hennery();
    command
        .env(
            "HENNERY_SERVICE",
            if cfg!(target_os = "macos") {
                "launchd"
            } else {
                "systemd"
            },
        )
        .env("HOME", &home)
        .env("XDG_STATE_HOME", &state)
        .env("RUST_LOG", "info");
    let log = dir.join("up.log");
    let data = dir.join("data");
    let mut up = up_logging_to_with(command, &data, &log, &[]);
    let collector_log = logs.join("hennery-collector.log");
    let host_log = logs.join("hennery-host.log");
    up.wait_until("the collector's line in its own file", || {
        text_of(&collector_log).contains("collector listening")
    });
    up.wait_until("the host's line in its own file", || {
        text_of(&host_log).contains("connected to collector")
    });
    let (host, collector) = ups_children(&mut up, &data.join("host").join("host.lock"));

    unsafe { libc::kill(up.up.id() as i32, libc::SIGKILL) };
    let _ = up.up.wait();
    for file in [&collector_log, &host_log] {
        poll_until("each child saying up is gone", || {
            text_of(file).contains("hennery up is gone; stopping")
        });
    }
    // Gone, so nothing more can reach standard error after it is read.
    poll_until("both children gone", || !running(host) && !running(collector));
    assert!(
        !text_of(&host_log).contains("collector listening"),
        "one file per process"
    );
    assert!(
        !text_of(&collector_log).contains("connected to collector"),
        "one file per process"
    );
    let mode = |path: &std::path::Path| std::fs::metadata(path).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode(&logs), 0o700);
    let names = ["hennery-up.log", "hennery-collector.log", "hennery-host.log"];
    for name in names {
        assert_eq!(mode(&logs.join(name)), 0o600, "{name}");
    }
    // No colour codes in a file.
    assert!(!text_of(&collector_log).contains('\u{1b}'));
    let stdout = text_of(&log);
    assert!(stdout.is_empty(), "stdout:\n{stdout}");
    let stderr = text_of(&log.with_extension("err"));
    let mut lines: Vec<&str> = stderr.lines().collect();
    lines.sort_unstable();
    let mut expected: Vec<String> = names
        .iter()
        .map(|name| format!("hennery: logging to {}", logs.join(name).display()))
        .collect();
    expected.sort_unstable();
    assert_eq!(lines, expected, "stderr:\n{stderr}");
}

/// Whether `path` can be locked as `lock::acquire` locks it, now: nobody
/// holds it.
fn lockable(path: &std::path::Path) -> bool {
    use std::os::fd::AsRawFd;
    let Ok(file) = std::fs::OpenOptions::new().read(true).write(true).open(path) else {
        return false;
    };
    // SAFETY: flock(2) on a descriptor this function owns; closing it below
    // releases the lock.
    unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) == 0 }
}

/// Plan 7c-iii: `up` killed outright (launchd's SIGKILL after
/// `ExitTimeOut`, the OOM killer) leaves nothing running. Each child reads
/// end-of-file on the pipe whose writing end only `up` held and stops as on
/// SIGTERM: the host stops its adapter, and the port and `host.lock` are
/// free, so a relaunch on the same port and data directory serves again,
/// its host connected. The host is one `up` started again after a crash, so
/// a restart hands the pipe on too. Only a host is restarted here: a
/// restarted collector gets the pipe from the same `UpChildren` builder.
#[test]
fn ups_children_stop_when_up_is_killed() {
    let dir = scratch_dir("parentdeath");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("data");
    // An adapter that never answers, with a grandchild, as in
    // `a_revoked_hosts_still_starting_adapter_is_reaped_past_shut_downs_bound`.
    let adapter_pid_file = dir.join("adapter.pid");
    let grandchild_pid_file = dir.join("grandchild.pid");
    let script = dir.join("slow.sh");
    std::fs::write(
        &script,
        format!(
            "echo $$ > {}\nsleep 7117 &\necho $! > {}\nwait\n",
            adapter_pid_file.display(),
            grandchild_pid_file.display()
        ),
    )
    .unwrap();
    let _kill_adapter = KillAdapter(adapter_pid_file.clone());
    let log = dir.join("up.log");
    let mut up = up_logging_to_with(
        hennery(),
        &data,
        &log,
        &["--agent", &format!("slow=/bin/sh {}", script.display())],
    );
    let listen = up.listening();
    let session = sign_in(&mut up, &listen, &data.join("collector"));
    let connections = |log: &std::path::Path| text_of(log).matches("connected to collector").count();
    up.wait_until("the host connected", || connections(&log) >= 1);

    // Past the startup grace (5 s), then the host killed: `up` starts it
    // again, and that host must get the pipe as well.
    std::thread::sleep(Duration::from_secs(6));
    let lock = data.join("host").join("host.lock");
    let first = pid_from(&lock).expect("the host's pid");
    up.children.push(first);
    unsafe { libc::kill(first, libc::SIGKILL) };
    up.wait_until("the host started again", || {
        pid_from(&lock).is_some_and(|pid| pid != first && pid_alive(pid))
    });
    up.wait_until("the host connected again", || connections(&log) >= 2);
    let (host, collector) = ups_children(&mut up, &lock);
    let hosts = get_json(&listen, "/api/hosts", &session).unwrap();
    let host_id = hosts[0]["host_id"].as_str().unwrap().to_string();
    post_json(
        &listen,
        "/api/sessions",
        &session,
        &serde_json::json!({ "host_id": host_id, "agent": "slow", "cwd": dir }).to_string(),
    );
    let mut grandchild = None;
    up.wait_until("the adapter started", || {
        grandchild = pid_from(&grandchild_pid_file);
        grandchild.is_some()
    });
    let grandchild = grandchild.unwrap();

    unsafe { libc::kill(up.up.id() as i32, libc::SIGKILL) };
    let _ = up.up.wait();
    poll_until("both children saying up is gone", || {
        text_of(&log).matches("hennery up is gone; stopping").count() == 2
    });
    // The positive signals: the port and the lock taken back, and the
    // relaunch below. A pid alone could be a zombie not yet reaped.
    poll_until("the port free", || std::net::TcpListener::bind(&listen).is_ok());
    poll_until("host.lock free", || lockable(&lock));
    poll_until("the adapter stopped", || !running(grandchild));
    poll_until("both children gone", || !running(host) && !running(collector));

    // The same port: another test binding port 0 could take it meanwhile,
    // which would fail the relaunch; not seen in the load runs.
    let again_log = dir.join("again.log");
    let again = hennery()
        .args(["up", "--listen", &listen, "--data-dir"])
        .arg(&data)
        .stdout(std::fs::File::create(&again_log).unwrap())
        .stderr(std::fs::File::create(again_log.with_extension("err")).unwrap())
        .spawn()
        .unwrap();
    let mut again = KillTree::new(again, &again_log);
    again.wait_until("the relaunched host connected", || {
        get_json(&listen, "/api/hosts", &session)
            .is_some_and(|hosts| hosts[0]["host_id"] == host_id.as_str() && hosts[0]["connected"] == true)
    });
}

/// Plan 10a (the review's A4): the collector serves the VAPID key of its
/// `vapid.key`, not the in-memory one `AppState::new` starts with, and a
/// restart keeps it: every subscription is bound to it.
#[test]
fn the_collector_serves_the_vapid_key_of_its_file_across_restarts() {
    let dir = scratch_dir("vapid");
    let _cleanup = RemoveDir(dir.clone());
    let data = dir.join("collector");
    let (mut collector, listen) = collector_on(&data, &dir.join("collector.log"));
    let session = sign_in(&mut collector, &listen, &data);
    let served = get_json(&listen, "/api/push/vapid", &session).expect("the VAPID key");
    let file = hennery_kernel::push::VapidKey::load_or_create(&data).unwrap();
    assert_eq!(served["public_key"], file.public_key());
    unsafe { libc::kill(collector.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut collector.up, Duration::from_secs(15)).is_some());

    // Restarted on another port: signed in from the `public_url` setup
    // stored, the first port's origin.
    let origin = format!("http://{listen}");
    let (mut again, listen) = collector_on(&data, &dir.join("again.log"));
    let session = password_session(&listen, &origin);
    let served = get_json(&listen, "/api/push/vapid", &session).expect("the VAPID key");
    assert_eq!(served["public_key"], file.public_key());
    unsafe { libc::kill(again.up.id() as i32, libc::SIGTERM) };
    assert!(wait_with_timeout(&mut again.up, Duration::from_secs(15)).is_some());
}

/// `POST /api/auth/login` with the owner's password from `origin`: the
/// session token its cookie carries.
fn password_session(listen: &str, origin: &str) -> String {
    let body = serde_json::json!({ "password": PASSWORD }).to_string();
    let mut stream = TcpStream::connect(listen).unwrap();
    stream.set_read_timeout(Some(Duration::from_secs(15))).unwrap();
    let request = format!(
        "POST /api/auth/login HTTP/1.1\r\nHost: {listen}\r\nOrigin: {origin}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(request.as_bytes()).unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    response
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            let value = value.trim().strip_prefix("hennery_session=")?;
            name.eq_ignore_ascii_case("set-cookie")
                .then(|| value.split(';').next().unwrap().to_string())
        })
        .unwrap_or_else(|| panic!("no session cookie: {response}"))
}

#[test]
fn a_secure_loopback_pairing_rejects_join_run_and_up_plaintext_overrides() {
    hennery_testkit::first_exec(&hennery().get_program().to_string_lossy());
    let root = tempfile::tempdir().unwrap();
    let host = root.path().join("host");
    hennery_host::identity::Paired {
        collector_url: "wss://localhost/api/hosts/ws".into(),
        trust: Default::default(),
        host_id: "host-0123456789abcdef".into(),
        key: hennery_host::identity::HostKey::from_seed([47; 32]),
        workspace_roots: vec![],
    }
    .save(&host)
    .unwrap();
    let trap = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    trap.set_nonblocking(true).unwrap();
    let origin = format!("http://{}", trap.local_addr().unwrap());
    let ws = hennery_host::pairing::collector_ws_url(&origin).unwrap();
    for args in [
        vec![
            "host",
            "join",
            &origin,
            "ABCD-EFGH",
            "--no-runtime",
            "--data-dir",
            host.to_str().unwrap(),
        ],
        vec![
            "host",
            "run",
            "--collector-url",
            &ws,
            "--data-dir",
            host.to_str().unwrap(),
        ],
        vec![
            "host",
            "transport",
            "set",
            &origin,
            "--system-roots",
            "--data-dir",
            host.to_str().unwrap(),
        ],
        vec![
            "up",
            "--listen",
            "127.0.0.1:0",
            "--data-dir",
            root.path().to_str().unwrap(),
        ],
    ] {
        use std::os::unix::process::CommandExt;
        let mut child = hennery()
            .args(args)
            .process_group(0)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        let status = wait_with_timeout(&mut child, Duration::from_secs(15));
        if status.is_none() {
            unsafe { libc::kill(-(child.id() as i32), libc::SIGKILL) };
        }
        let output = child.wait_with_output().unwrap();
        assert!(status.is_some(), "downgrade refusal must happen before startup");
        assert!(!output.status.success());
        assert!(
            !root.path().join("collector").exists(),
            "up must refuse its derived downgrade before spawning a collector"
        );
        assert!(
            String::from_utf8_lossy(&output.stderr).contains("before hello"),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    assert!(matches!(
        trap.accept().unwrap_err().kind(),
        std::io::ErrorKind::WouldBlock
    ));
}
````

### File `packaging/release/licences/0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e.txt`

<!-- r1:file task=2 path=packaging/release/licences/0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e.txt sha256=0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e bytes=3011 mode=644 encoding=utf8 -->
````text
The ISC License

Copyright (c) Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

====

The following license is the one that governed sax, from which saxes
was forked. Isaac Schlueter is not *directly* involved with saxes so
don't go bugging him for saxes issues.

The ISC License

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

====

`String.fromCodePoint` by Mathias Bynens is no longer used, but it can
still be found in old commits. It was once used according to terms of
MIT License, as follows:

    Copyright Mathias Bynens <https://mathiasbynens.be/>

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### File `packaging/release/licences/23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt`

<!-- r1:file task=2 path=packaging/release/licences/23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt sha256=23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734 bytes=1302 mode=644 encoding=utf8 -->
````text
MIT License

Copyright (c) 2024-present VoidZero Inc. & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

end of terms and conditions

The licenses of externally maintained libraries from which parts of the Software is derived are listed [here](https://github.com/rolldown/rolldown/blob/main/THIRD-PARTY-LICENSE).
````

### File `packaging/release/licences/2710a622a896bba67356913d4d0492cab5465f61b2ecce6d880aeb483834fb50.txt`

<!-- r1:file task=2 path=packaging/release/licences/2710a622a896bba67356913d4d0492cab5465f61b2ecce6d880aeb483834fb50.txt sha256=2710a622a896bba67356913d4d0492cab5465f61b2ecce6d880aeb483834fb50 bytes=1053 mode=644 encoding=utf8 -->
````text
Copyright (c) Ferrous Systems

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
````

### File `packaging/release/licences/32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt`

<!-- r1:file task=2 path=packaging/release/licences/32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt sha256=32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85 bytes=16727 mode=644 encoding=base64 -->
````text
TW96aWxsYSBQdWJsaWMgTGljZW5zZSBWZXJzaW9uIDIuMAo9PT09PT09PT09PT09PT09PT09PT09
PT09PT09PT09PT09CgoxLiBEZWZpbml0aW9ucwotLS0tLS0tLS0tLS0tLQoKMS4xLiAiQ29udHJp
YnV0b3IiCiAgICBtZWFucyBlYWNoIGluZGl2aWR1YWwgb3IgbGVnYWwgZW50aXR5IHRoYXQgY3Jl
YXRlcywgY29udHJpYnV0ZXMgdG8KICAgIHRoZSBjcmVhdGlvbiBvZiwgb3Igb3ducyBDb3ZlcmVk
IFNvZnR3YXJlLgoKMS4yLiAiQ29udHJpYnV0b3IgVmVyc2lvbiIKICAgIG1lYW5zIHRoZSBjb21i
aW5hdGlvbiBvZiB0aGUgQ29udHJpYnV0aW9ucyBvZiBvdGhlcnMgKGlmIGFueSkgdXNlZAogICAg
YnkgYSBDb250cmlidXRvciBhbmQgdGhhdCBwYXJ0aWN1bGFyIENvbnRyaWJ1dG9yJ3MgQ29udHJp
YnV0aW9uLgoKMS4zLiAiQ29udHJpYnV0aW9uIgogICAgbWVhbnMgQ292ZXJlZCBTb2Z0d2FyZSBv
ZiBhIHBhcnRpY3VsYXIgQ29udHJpYnV0b3IuCgoxLjQuICJDb3ZlcmVkIFNvZnR3YXJlIgogICAg
bWVhbnMgU291cmNlIENvZGUgRm9ybSB0byB3aGljaCB0aGUgaW5pdGlhbCBDb250cmlidXRvciBo
YXMgYXR0YWNoZWQKICAgIHRoZSBub3RpY2UgaW4gRXhoaWJpdCBBLCB0aGUgRXhlY3V0YWJsZSBG
b3JtIG9mIHN1Y2ggU291cmNlIENvZGUKICAgIEZvcm0sIGFuZCBNb2RpZmljYXRpb25zIG9mIHN1
Y2ggU291cmNlIENvZGUgRm9ybSwgaW4gZWFjaCBjYXNlCiAgICBpbmNsdWRpbmcgcG9ydGlvbnMg
dGhlcmVvZi4KCjEuNS4gIkluY29tcGF0aWJsZSBXaXRoIFNlY29uZGFyeSBMaWNlbnNlcyIKICAg
IG1lYW5zCgogICAgKGEpIHRoYXQgdGhlIGluaXRpYWwgQ29udHJpYnV0b3IgaGFzIGF0dGFjaGVk
IHRoZSBub3RpY2UgZGVzY3JpYmVkCiAgICAgICAgaW4gRXhoaWJpdCBCIHRvIHRoZSBDb3ZlcmVk
IFNvZnR3YXJlOyBvcgoKICAgIChiKSB0aGF0IHRoZSBDb3ZlcmVkIFNvZnR3YXJlIHdhcyBtYWRl
IGF2YWlsYWJsZSB1bmRlciB0aGUgdGVybXMgb2YKICAgICAgICB2ZXJzaW9uIDEuMSBvciBlYXJs
aWVyIG9mIHRoZSBMaWNlbnNlLCBidXQgbm90IGFsc28gdW5kZXIgdGhlCiAgICAgICAgdGVybXMg
b2YgYSBTZWNvbmRhcnkgTGljZW5zZS4KCjEuNi4gIkV4ZWN1dGFibGUgRm9ybSIKICAgIG1lYW5z
IGFueSBmb3JtIG9mIHRoZSB3b3JrIG90aGVyIHRoYW4gU291cmNlIENvZGUgRm9ybS4KCjEuNy4g
IkxhcmdlciBXb3JrIgogICAgbWVhbnMgYSB3b3JrIHRoYXQgY29tYmluZXMgQ292ZXJlZCBTb2Z0
d2FyZSB3aXRoIG90aGVyIG1hdGVyaWFsLCBpbiAKICAgIGEgc2VwYXJhdGUgZmlsZSBvciBmaWxl
cywgdGhhdCBpcyBub3QgQ292ZXJlZCBTb2Z0d2FyZS4KCjEuOC4gIkxpY2Vuc2UiCiAgICBtZWFu
cyB0aGlzIGRvY3VtZW50LgoKMS45LiAiTGljZW5zYWJsZSIKICAgIG1lYW5zIGhhdmluZyB0aGUg
cmlnaHQgdG8gZ3JhbnQsIHRvIHRoZSBtYXhpbXVtIGV4dGVudCBwb3NzaWJsZSwKICAgIHdoZXRo
ZXIgYXQgdGhlIHRpbWUgb2YgdGhlIGluaXRpYWwgZ3JhbnQgb3Igc3Vic2VxdWVudGx5LCBhbnkg
YW5kCiAgICBhbGwgb2YgdGhlIHJpZ2h0cyBjb252ZXllZCBieSB0aGlzIExpY2Vuc2UuCgoxLjEw
LiAiTW9kaWZpY2F0aW9ucyIKICAgIG1lYW5zIGFueSBvZiB0aGUgZm9sbG93aW5nOgoKICAgIChh
KSBhbnkgZmlsZSBpbiBTb3VyY2UgQ29kZSBGb3JtIHRoYXQgcmVzdWx0cyBmcm9tIGFuIGFkZGl0
aW9uIHRvLAogICAgICAgIGRlbGV0aW9uIGZyb20sIG9yIG1vZGlmaWNhdGlvbiBvZiB0aGUgY29u
dGVudHMgb2YgQ292ZXJlZAogICAgICAgIFNvZnR3YXJlOyBvcgoKICAgIChiKSBhbnkgbmV3IGZp
bGUgaW4gU291cmNlIENvZGUgRm9ybSB0aGF0IGNvbnRhaW5zIGFueSBDb3ZlcmVkCiAgICAgICAg
U29mdHdhcmUuCgoxLjExLiAiUGF0ZW50IENsYWltcyIgb2YgYSBDb250cmlidXRvcgogICAgbWVh
bnMgYW55IHBhdGVudCBjbGFpbShzKSwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiwgbWV0
aG9kLAogICAgcHJvY2VzcywgYW5kIGFwcGFyYXR1cyBjbGFpbXMsIGluIGFueSBwYXRlbnQgTGlj
ZW5zYWJsZSBieSBzdWNoCiAgICBDb250cmlidXRvciB0aGF0IHdvdWxkIGJlIGluZnJpbmdlZCwg
YnV0IGZvciB0aGUgZ3JhbnQgb2YgdGhlCiAgICBMaWNlbnNlLCBieSB0aGUgbWFraW5nLCB1c2lu
Zywgc2VsbGluZywgb2ZmZXJpbmcgZm9yIHNhbGUsIGhhdmluZwogICAgbWFkZSwgaW1wb3J0LCBv
ciB0cmFuc2ZlciBvZiBlaXRoZXIgaXRzIENvbnRyaWJ1dGlvbnMgb3IgaXRzCiAgICBDb250cmli
dXRvciBWZXJzaW9uLgoKMS4xMi4gIlNlY29uZGFyeSBMaWNlbnNlIgogICAgbWVhbnMgZWl0aGVy
IHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSwgVmVyc2lvbiAyLjAsIHRoZSBHTlUKICAg
IExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlLCBWZXJzaW9uIDIuMSwgdGhlIEdOVSBBZmZl
cm8gR2VuZXJhbAogICAgUHVibGljIExpY2Vuc2UsIFZlcnNpb24gMy4wLCBvciBhbnkgbGF0ZXIg
dmVyc2lvbnMgb2YgdGhvc2UKICAgIGxpY2Vuc2VzLgoKMS4xMy4gIlNvdXJjZSBDb2RlIEZvcm0i
CiAgICBtZWFucyB0aGUgZm9ybSBvZiB0aGUgd29yayBwcmVmZXJyZWQgZm9yIG1ha2luZyBtb2Rp
ZmljYXRpb25zLgoKMS4xNC4gIllvdSIgKG9yICJZb3VyIikKICAgIG1lYW5zIGFuIGluZGl2aWR1
YWwgb3IgYSBsZWdhbCBlbnRpdHkgZXhlcmNpc2luZyByaWdodHMgdW5kZXIgdGhpcwogICAgTGlj
ZW5zZS4gRm9yIGxlZ2FsIGVudGl0aWVzLCAiWW91IiBpbmNsdWRlcyBhbnkgZW50aXR5IHRoYXQK
ICAgIGNvbnRyb2xzLCBpcyBjb250cm9sbGVkIGJ5LCBvciBpcyB1bmRlciBjb21tb24gY29udHJv
bCB3aXRoIFlvdS4gRm9yCiAgICBwdXJwb3NlcyBvZiB0aGlzIGRlZmluaXRpb24sICJjb250cm9s
IiBtZWFucyAoYSkgdGhlIHBvd2VyLCBkaXJlY3QKICAgIG9yIGluZGlyZWN0LCB0byBjYXVzZSB0
aGUgZGlyZWN0aW9uIG9yIG1hbmFnZW1lbnQgb2Ygc3VjaCBlbnRpdHksCiAgICB3aGV0aGVyIGJ5
IGNvbnRyYWN0IG9yIG90aGVyd2lzZSwgb3IgKGIpIG93bmVyc2hpcCBvZiBtb3JlIHRoYW4KICAg
IGZpZnR5IHBlcmNlbnQgKDUwJSkgb2YgdGhlIG91dHN0YW5kaW5nIHNoYXJlcyBvciBiZW5lZmlj
aWFsCiAgICBvd25lcnNoaXAgb2Ygc3VjaCBlbnRpdHkuCgoyLiBMaWNlbnNlIEdyYW50cyBhbmQg
Q29uZGl0aW9ucwotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQoKMi4xLiBHcmFudHMK
CkVhY2ggQ29udHJpYnV0b3IgaGVyZWJ5IGdyYW50cyBZb3UgYSB3b3JsZC13aWRlLCByb3lhbHR5
LWZyZWUsCm5vbi1leGNsdXNpdmUgbGljZW5zZToKCihhKSB1bmRlciBpbnRlbGxlY3R1YWwgcHJv
cGVydHkgcmlnaHRzIChvdGhlciB0aGFuIHBhdGVudCBvciB0cmFkZW1hcmspCiAgICBMaWNlbnNh
YmxlIGJ5IHN1Y2ggQ29udHJpYnV0b3IgdG8gdXNlLCByZXByb2R1Y2UsIG1ha2UgYXZhaWxhYmxl
LAogICAgbW9kaWZ5LCBkaXNwbGF5LCBwZXJmb3JtLCBkaXN0cmlidXRlLCBhbmQgb3RoZXJ3aXNl
IGV4cGxvaXQgaXRzCiAgICBDb250cmlidXRpb25zLCBlaXRoZXIgb24gYW4gdW5tb2RpZmllZCBi
YXNpcywgd2l0aCBNb2RpZmljYXRpb25zLCBvcgogICAgYXMgcGFydCBvZiBhIExhcmdlciBXb3Jr
OyBhbmQKCihiKSB1bmRlciBQYXRlbnQgQ2xhaW1zIG9mIHN1Y2ggQ29udHJpYnV0b3IgdG8gbWFr
ZSwgdXNlLCBzZWxsLCBvZmZlcgogICAgZm9yIHNhbGUsIGhhdmUgbWFkZSwgaW1wb3J0LCBhbmQg
b3RoZXJ3aXNlIHRyYW5zZmVyIGVpdGhlciBpdHMKICAgIENvbnRyaWJ1dGlvbnMgb3IgaXRzIENv
bnRyaWJ1dG9yIFZlcnNpb24uCgoyLjIuIEVmZmVjdGl2ZSBEYXRlCgpUaGUgbGljZW5zZXMgZ3Jh
bnRlZCBpbiBTZWN0aW9uIDIuMSB3aXRoIHJlc3BlY3QgdG8gYW55IENvbnRyaWJ1dGlvbgpiZWNv
bWUgZWZmZWN0aXZlIGZvciBlYWNoIENvbnRyaWJ1dGlvbiBvbiB0aGUgZGF0ZSB0aGUgQ29udHJp
YnV0b3IgZmlyc3QKZGlzdHJpYnV0ZXMgc3VjaCBDb250cmlidXRpb24uCgoyLjMuIExpbWl0YXRp
b25zIG9uIEdyYW50IFNjb3BlCgpUaGUgbGljZW5zZXMgZ3JhbnRlZCBpbiB0aGlzIFNlY3Rpb24g
MiBhcmUgdGhlIG9ubHkgcmlnaHRzIGdyYW50ZWQgdW5kZXIKdGhpcyBMaWNlbnNlLiBObyBhZGRp
dGlvbmFsIHJpZ2h0cyBvciBsaWNlbnNlcyB3aWxsIGJlIGltcGxpZWQgZnJvbSB0aGUKZGlzdHJp
YnV0aW9uIG9yIGxpY2Vuc2luZyBvZiBDb3ZlcmVkIFNvZnR3YXJlIHVuZGVyIHRoaXMgTGljZW5z
ZS4KTm90d2l0aHN0YW5kaW5nIFNlY3Rpb24gMi4xKGIpIGFib3ZlLCBubyBwYXRlbnQgbGljZW5z
ZSBpcyBncmFudGVkIGJ5IGEKQ29udHJpYnV0b3I6CgooYSkgZm9yIGFueSBjb2RlIHRoYXQgYSBD
b250cmlidXRvciBoYXMgcmVtb3ZlZCBmcm9tIENvdmVyZWQgU29mdHdhcmU7CiAgICBvcgoKKGIp
IGZvciBpbmZyaW5nZW1lbnRzIGNhdXNlZCBieTogKGkpIFlvdXIgYW5kIGFueSBvdGhlciB0aGly
ZCBwYXJ0eSdzCiAgICBtb2RpZmljYXRpb25zIG9mIENvdmVyZWQgU29mdHdhcmUsIG9yIChpaSkg
dGhlIGNvbWJpbmF0aW9uIG9mIGl0cwogICAgQ29udHJpYnV0aW9ucyB3aXRoIG90aGVyIHNvZnR3
YXJlIChleGNlcHQgYXMgcGFydCBvZiBpdHMgQ29udHJpYnV0b3IKICAgIFZlcnNpb24pOyBvcgoK
KGMpIHVuZGVyIFBhdGVudCBDbGFpbXMgaW5mcmluZ2VkIGJ5IENvdmVyZWQgU29mdHdhcmUgaW4g
dGhlIGFic2VuY2Ugb2YKICAgIGl0cyBDb250cmlidXRpb25zLgoKVGhpcyBMaWNlbnNlIGRvZXMg
bm90IGdyYW50IGFueSByaWdodHMgaW4gdGhlIHRyYWRlbWFya3MsIHNlcnZpY2UgbWFya3MsCm9y
IGxvZ29zIG9mIGFueSBDb250cmlidXRvciAoZXhjZXB0IGFzIG1heSBiZSBuZWNlc3NhcnkgdG8g
Y29tcGx5IHdpdGgKdGhlIG5vdGljZSByZXF1aXJlbWVudHMgaW4gU2VjdGlvbiAzLjQpLgoKMi40
LiBTdWJzZXF1ZW50IExpY2Vuc2VzCgpObyBDb250cmlidXRvciBtYWtlcyBhZGRpdGlvbmFsIGdy
YW50cyBhcyBhIHJlc3VsdCBvZiBZb3VyIGNob2ljZSB0bwpkaXN0cmlidXRlIHRoZSBDb3ZlcmVk
IFNvZnR3YXJlIHVuZGVyIGEgc3Vic2VxdWVudCB2ZXJzaW9uIG9mIHRoaXMKTGljZW5zZSAoc2Vl
IFNlY3Rpb24gMTAuMikgb3IgdW5kZXIgdGhlIHRlcm1zIG9mIGEgU2Vjb25kYXJ5IExpY2Vuc2Ug
KGlmCnBlcm1pdHRlZCB1bmRlciB0aGUgdGVybXMgb2YgU2VjdGlvbiAzLjMpLgoKMi41LiBSZXBy
ZXNlbnRhdGlvbgoKRWFjaCBDb250cmlidXRvciByZXByZXNlbnRzIHRoYXQgdGhlIENvbnRyaWJ1
dG9yIGJlbGlldmVzIGl0cwpDb250cmlidXRpb25zIGFyZSBpdHMgb3JpZ2luYWwgY3JlYXRpb24o
cykgb3IgaXQgaGFzIHN1ZmZpY2llbnQgcmlnaHRzCnRvIGdyYW50IHRoZSByaWdodHMgdG8gaXRz
IENvbnRyaWJ1dGlvbnMgY29udmV5ZWQgYnkgdGhpcyBMaWNlbnNlLgoKMi42LiBGYWlyIFVzZQoK
VGhpcyBMaWNlbnNlIGlzIG5vdCBpbnRlbmRlZCB0byBsaW1pdCBhbnkgcmlnaHRzIFlvdSBoYXZl
IHVuZGVyCmFwcGxpY2FibGUgY29weXJpZ2h0IGRvY3RyaW5lcyBvZiBmYWlyIHVzZSwgZmFpciBk
ZWFsaW5nLCBvciBvdGhlcgplcXVpdmFsZW50cy4KCjIuNy4gQ29uZGl0aW9ucwoKU2VjdGlvbnMg
My4xLCAzLjIsIDMuMywgYW5kIDMuNCBhcmUgY29uZGl0aW9ucyBvZiB0aGUgbGljZW5zZXMgZ3Jh
bnRlZAppbiBTZWN0aW9uIDIuMS4KCjMuIFJlc3BvbnNpYmlsaXRpZXMKLS0tLS0tLS0tLS0tLS0t
LS0tLQoKMy4xLiBEaXN0cmlidXRpb24gb2YgU291cmNlIEZvcm0KCkFsbCBkaXN0cmlidXRpb24g
b2YgQ292ZXJlZCBTb2Z0d2FyZSBpbiBTb3VyY2UgQ29kZSBGb3JtLCBpbmNsdWRpbmcgYW55Ck1v
ZGlmaWNhdGlvbnMgdGhhdCBZb3UgY3JlYXRlIG9yIHRvIHdoaWNoIFlvdSBjb250cmlidXRlLCBt
dXN0IGJlIHVuZGVyCnRoZSB0ZXJtcyBvZiB0aGlzIExpY2Vuc2UuIFlvdSBtdXN0IGluZm9ybSBy
ZWNpcGllbnRzIHRoYXQgdGhlIFNvdXJjZQpDb2RlIEZvcm0gb2YgdGhlIENvdmVyZWQgU29mdHdh
cmUgaXMgZ292ZXJuZWQgYnkgdGhlIHRlcm1zIG9mIHRoaXMKTGljZW5zZSwgYW5kIGhvdyB0aGV5
IGNhbiBvYnRhaW4gYSBjb3B5IG9mIHRoaXMgTGljZW5zZS4gWW91IG1heSBub3QKYXR0ZW1wdCB0
byBhbHRlciBvciByZXN0cmljdCB0aGUgcmVjaXBpZW50cycgcmlnaHRzIGluIHRoZSBTb3VyY2Ug
Q29kZQpGb3JtLgoKMy4yLiBEaXN0cmlidXRpb24gb2YgRXhlY3V0YWJsZSBGb3JtCgpJZiBZb3Ug
ZGlzdHJpYnV0ZSBDb3ZlcmVkIFNvZnR3YXJlIGluIEV4ZWN1dGFibGUgRm9ybSB0aGVuOgoKKGEp
IHN1Y2ggQ292ZXJlZCBTb2Z0d2FyZSBtdXN0IGFsc28gYmUgbWFkZSBhdmFpbGFibGUgaW4gU291
cmNlIENvZGUKICAgIEZvcm0sIGFzIGRlc2NyaWJlZCBpbiBTZWN0aW9uIDMuMSwgYW5kIFlvdSBt
dXN0IGluZm9ybSByZWNpcGllbnRzIG9mCiAgICB0aGUgRXhlY3V0YWJsZSBGb3JtIGhvdyB0aGV5
IGNhbiBvYnRhaW4gYSBjb3B5IG9mIHN1Y2ggU291cmNlIENvZGUKICAgIEZvcm0gYnkgcmVhc29u
YWJsZSBtZWFucyBpbiBhIHRpbWVseSBtYW5uZXIsIGF0IGEgY2hhcmdlIG5vIG1vcmUKICAgIHRo
YW4gdGhlIGNvc3Qgb2YgZGlzdHJpYnV0aW9uIHRvIHRoZSByZWNpcGllbnQ7IGFuZAoKKGIpIFlv
dSBtYXkgZGlzdHJpYnV0ZSBzdWNoIEV4ZWN1dGFibGUgRm9ybSB1bmRlciB0aGUgdGVybXMgb2Yg
dGhpcwogICAgTGljZW5zZSwgb3Igc3VibGljZW5zZSBpdCB1bmRlciBkaWZmZXJlbnQgdGVybXMs
IHByb3ZpZGVkIHRoYXQgdGhlCiAgICBsaWNlbnNlIGZvciB0aGUgRXhlY3V0YWJsZSBGb3JtIGRv
ZXMgbm90IGF0dGVtcHQgdG8gbGltaXQgb3IgYWx0ZXIKICAgIHRoZSByZWNpcGllbnRzJyByaWdo
dHMgaW4gdGhlIFNvdXJjZSBDb2RlIEZvcm0gdW5kZXIgdGhpcyBMaWNlbnNlLgoKMy4zLiBEaXN0
cmlidXRpb24gb2YgYSBMYXJnZXIgV29yawoKWW91IG1heSBjcmVhdGUgYW5kIGRpc3RyaWJ1dGUg
YSBMYXJnZXIgV29yayB1bmRlciB0ZXJtcyBvZiBZb3VyIGNob2ljZSwKcHJvdmlkZWQgdGhhdCBZ
b3UgYWxzbyBjb21wbHkgd2l0aCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoaXMgTGljZW5zZSBmb3IK
dGhlIENvdmVyZWQgU29mdHdhcmUuIElmIHRoZSBMYXJnZXIgV29yayBpcyBhIGNvbWJpbmF0aW9u
IG9mIENvdmVyZWQKU29mdHdhcmUgd2l0aCBhIHdvcmsgZ292ZXJuZWQgYnkgb25lIG9yIG1vcmUg
U2Vjb25kYXJ5IExpY2Vuc2VzLCBhbmQgdGhlCkNvdmVyZWQgU29mdHdhcmUgaXMgbm90IEluY29t
cGF0aWJsZSBXaXRoIFNlY29uZGFyeSBMaWNlbnNlcywgdGhpcwpMaWNlbnNlIHBlcm1pdHMgWW91
IHRvIGFkZGl0aW9uYWxseSBkaXN0cmlidXRlIHN1Y2ggQ292ZXJlZCBTb2Z0d2FyZQp1bmRlciB0
aGUgdGVybXMgb2Ygc3VjaCBTZWNvbmRhcnkgTGljZW5zZShzKSwgc28gdGhhdCB0aGUgcmVjaXBp
ZW50IG9mCnRoZSBMYXJnZXIgV29yayBtYXksIGF0IHRoZWlyIG9wdGlvbiwgZnVydGhlciBkaXN0
cmlidXRlIHRoZSBDb3ZlcmVkClNvZnR3YXJlIHVuZGVyIHRoZSB0ZXJtcyBvZiBlaXRoZXIgdGhp
cyBMaWNlbnNlIG9yIHN1Y2ggU2Vjb25kYXJ5CkxpY2Vuc2UocykuCgozLjQuIE5vdGljZXMKCllv
dSBtYXkgbm90IHJlbW92ZSBvciBhbHRlciB0aGUgc3Vic3RhbmNlIG9mIGFueSBsaWNlbnNlIG5v
dGljZXMKKGluY2x1ZGluZyBjb3B5cmlnaHQgbm90aWNlcywgcGF0ZW50IG5vdGljZXMsIGRpc2Ns
YWltZXJzIG9mIHdhcnJhbnR5LApvciBsaW1pdGF0aW9ucyBvZiBsaWFiaWxpdHkpIGNvbnRhaW5l
ZCB3aXRoaW4gdGhlIFNvdXJjZSBDb2RlIEZvcm0gb2YKdGhlIENvdmVyZWQgU29mdHdhcmUsIGV4
Y2VwdCB0aGF0IFlvdSBtYXkgYWx0ZXIgYW55IGxpY2Vuc2Ugbm90aWNlcyB0bwp0aGUgZXh0ZW50
IHJlcXVpcmVkIHRvIHJlbWVkeSBrbm93biBmYWN0dWFsIGluYWNjdXJhY2llcy4KCjMuNS4gQXBw
bGljYXRpb24gb2YgQWRkaXRpb25hbCBUZXJtcwoKWW91IG1heSBjaG9vc2UgdG8gb2ZmZXIsIGFu
ZCB0byBjaGFyZ2UgYSBmZWUgZm9yLCB3YXJyYW50eSwgc3VwcG9ydCwKaW5kZW1uaXR5IG9yIGxp
YWJpbGl0eSBvYmxpZ2F0aW9ucyB0byBvbmUgb3IgbW9yZSByZWNpcGllbnRzIG9mIENvdmVyZWQK
U29mdHdhcmUuIEhvd2V2ZXIsIFlvdSBtYXkgZG8gc28gb25seSBvbiBZb3VyIG93biBiZWhhbGYs
IGFuZCBub3Qgb24KYmVoYWxmIG9mIGFueSBDb250cmlidXRvci4gWW91IG11c3QgbWFrZSBpdCBh
YnNvbHV0ZWx5IGNsZWFyIHRoYXQgYW55CnN1Y2ggd2FycmFudHksIHN1cHBvcnQsIGluZGVtbml0
eSwgb3IgbGlhYmlsaXR5IG9ibGlnYXRpb24gaXMgb2ZmZXJlZCBieQpZb3UgYWxvbmUsIGFuZCBZ
b3UgaGVyZWJ5IGFncmVlIHRvIGluZGVtbmlmeSBldmVyeSBDb250cmlidXRvciBmb3IgYW55Cmxp
YWJpbGl0eSBpbmN1cnJlZCBieSBzdWNoIENvbnRyaWJ1dG9yIGFzIGEgcmVzdWx0IG9mIHdhcnJh
bnR5LCBzdXBwb3J0LAppbmRlbW5pdHkgb3IgbGlhYmlsaXR5IHRlcm1zIFlvdSBvZmZlci4gWW91
IG1heSBpbmNsdWRlIGFkZGl0aW9uYWwKZGlzY2xhaW1lcnMgb2Ygd2FycmFudHkgYW5kIGxpbWl0
YXRpb25zIG9mIGxpYWJpbGl0eSBzcGVjaWZpYyB0byBhbnkKanVyaXNkaWN0aW9uLgoKNC4gSW5h
YmlsaXR5IHRvIENvbXBseSBEdWUgdG8gU3RhdHV0ZSBvciBSZWd1bGF0aW9uCi0tLS0tLS0tLS0t
LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQoKSWYgaXQgaXMgaW1wb3Nz
aWJsZSBmb3IgWW91IHRvIGNvbXBseSB3aXRoIGFueSBvZiB0aGUgdGVybXMgb2YgdGhpcwpMaWNl
bnNlIHdpdGggcmVzcGVjdCB0byBzb21lIG9yIGFsbCBvZiB0aGUgQ292ZXJlZCBTb2Z0d2FyZSBk
dWUgdG8Kc3RhdHV0ZSwganVkaWNpYWwgb3JkZXIsIG9yIHJlZ3VsYXRpb24gdGhlbiBZb3UgbXVz
dDogKGEpIGNvbXBseSB3aXRoCnRoZSB0ZXJtcyBvZiB0aGlzIExpY2Vuc2UgdG8gdGhlIG1heGlt
dW0gZXh0ZW50IHBvc3NpYmxlOyBhbmQgKGIpCmRlc2NyaWJlIHRoZSBsaW1pdGF0aW9ucyBhbmQg
dGhlIGNvZGUgdGhleSBhZmZlY3QuIFN1Y2ggZGVzY3JpcHRpb24gbXVzdApiZSBwbGFjZWQgaW4g
YSB0ZXh0IGZpbGUgaW5jbHVkZWQgd2l0aCBhbGwgZGlzdHJpYnV0aW9ucyBvZiB0aGUgQ292ZXJl
ZApTb2Z0d2FyZSB1bmRlciB0aGlzIExpY2Vuc2UuIEV4Y2VwdCB0byB0aGUgZXh0ZW50IHByb2hp
Yml0ZWQgYnkgc3RhdHV0ZQpvciByZWd1bGF0aW9uLCBzdWNoIGRlc2NyaXB0aW9uIG11c3QgYmUg
c3VmZmljaWVudGx5IGRldGFpbGVkIGZvciBhCnJlY2lwaWVudCBvZiBvcmRpbmFyeSBza2lsbCB0
byBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgaXQuCgo1LiBUZXJtaW5hdGlvbgotLS0tLS0tLS0tLS0t
LQoKNS4xLiBUaGUgcmlnaHRzIGdyYW50ZWQgdW5kZXIgdGhpcyBMaWNlbnNlIHdpbGwgdGVybWlu
YXRlIGF1dG9tYXRpY2FsbHkKaWYgWW91IGZhaWwgdG8gY29tcGx5IHdpdGggYW55IG9mIGl0cyB0
ZXJtcy4gSG93ZXZlciwgaWYgWW91IGJlY29tZQpjb21wbGlhbnQsIHRoZW4gdGhlIHJpZ2h0cyBn
cmFudGVkIHVuZGVyIHRoaXMgTGljZW5zZSBmcm9tIGEgcGFydGljdWxhcgpDb250cmlidXRvciBh
cmUgcmVpbnN0YXRlZCAoYSkgcHJvdmlzaW9uYWxseSwgdW5sZXNzIGFuZCB1bnRpbCBzdWNoCkNv
bnRyaWJ1dG9yIGV4cGxpY2l0bHkgYW5kIGZpbmFsbHkgdGVybWluYXRlcyBZb3VyIGdyYW50cywg
YW5kIChiKSBvbiBhbgpvbmdvaW5nIGJhc2lzLCBpZiBzdWNoIENvbnRyaWJ1dG9yIGZhaWxzIHRv
IG5vdGlmeSBZb3Ugb2YgdGhlCm5vbi1jb21wbGlhbmNlIGJ5IHNvbWUgcmVhc29uYWJsZSBtZWFu
cyBwcmlvciB0byA2MCBkYXlzIGFmdGVyIFlvdSBoYXZlCmNvbWUgYmFjayBpbnRvIGNvbXBsaWFu
Y2UuIE1vcmVvdmVyLCBZb3VyIGdyYW50cyBmcm9tIGEgcGFydGljdWxhcgpDb250cmlidXRvciBh
cmUgcmVpbnN0YXRlZCBvbiBhbiBvbmdvaW5nIGJhc2lzIGlmIHN1Y2ggQ29udHJpYnV0b3IKbm90
aWZpZXMgWW91IG9mIHRoZSBub24tY29tcGxpYW5jZSBieSBzb21lIHJlYXNvbmFibGUgbWVhbnMs
IHRoaXMgaXMgdGhlCmZpcnN0IHRpbWUgWW91IGhhdmUgcmVjZWl2ZWQgbm90aWNlIG9mIG5vbi1j
b21wbGlhbmNlIHdpdGggdGhpcyBMaWNlbnNlCmZyb20gc3VjaCBDb250cmlidXRvciwgYW5kIFlv
dSBiZWNvbWUgY29tcGxpYW50IHByaW9yIHRvIDMwIGRheXMgYWZ0ZXIKWW91ciByZWNlaXB0IG9m
IHRoZSBub3RpY2UuCgo1LjIuIElmIFlvdSBpbml0aWF0ZSBsaXRpZ2F0aW9uIGFnYWluc3QgYW55
IGVudGl0eSBieSBhc3NlcnRpbmcgYSBwYXRlbnQKaW5mcmluZ2VtZW50IGNsYWltIChleGNsdWRp
bmcgZGVjbGFyYXRvcnkganVkZ21lbnQgYWN0aW9ucywKY291bnRlci1jbGFpbXMsIGFuZCBjcm9z
cy1jbGFpbXMpIGFsbGVnaW5nIHRoYXQgYSBDb250cmlidXRvciBWZXJzaW9uCmRpcmVjdGx5IG9y
IGluZGlyZWN0bHkgaW5mcmluZ2VzIGFueSBwYXRlbnQsIHRoZW4gdGhlIHJpZ2h0cyBncmFudGVk
IHRvCllvdSBieSBhbnkgYW5kIGFsbCBDb250cmlidXRvcnMgZm9yIHRoZSBDb3ZlcmVkIFNvZnR3
YXJlIHVuZGVyIFNlY3Rpb24KMi4xIG9mIHRoaXMgTGljZW5zZSBzaGFsbCB0ZXJtaW5hdGUuCgo1
LjMuIEluIHRoZSBldmVudCBvZiB0ZXJtaW5hdGlvbiB1bmRlciBTZWN0aW9ucyA1LjEgb3IgNS4y
IGFib3ZlLCBhbGwKZW5kIHVzZXIgbGljZW5zZSBhZ3JlZW1lbnRzIChleGNsdWRpbmcgZGlzdHJp
YnV0b3JzIGFuZCByZXNlbGxlcnMpIHdoaWNoCmhhdmUgYmVlbiB2YWxpZGx5IGdyYW50ZWQgYnkg
WW91IG9yIFlvdXIgZGlzdHJpYnV0b3JzIHVuZGVyIHRoaXMgTGljZW5zZQpwcmlvciB0byB0ZXJt
aW5hdGlvbiBzaGFsbCBzdXJ2aXZlIHRlcm1pbmF0aW9uLgoKKioqKioqKioqKioqKioqKioqKioq
KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqCiogICAg
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
ICAgICAgICAgKgoqICA2LiBEaXNjbGFpbWVyIG9mIFdhcnJhbnR5ICAgICAgICAgICAgICAgICAg
ICAgICAgICAgICAgICAgICAgICAgICAgICoKKiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAg
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqCiogICAgICAgICAgICAg
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
KgoqICBDb3ZlcmVkIFNvZnR3YXJlIGlzIHByb3ZpZGVkIHVuZGVyIHRoaXMgTGljZW5zZSBvbiBh
biAiYXMgaXMiICAgICAgICoKKiAgYmFzaXMsIHdpdGhvdXQgd2FycmFudHkgb2YgYW55IGtpbmQs
IGVpdGhlciBleHByZXNzZWQsIGltcGxpZWQsIG9yICAqCiogIHN0YXR1dG9yeSwgaW5jbHVkaW5n
LCB3aXRob3V0IGxpbWl0YXRpb24sIHdhcnJhbnRpZXMgdGhhdCB0aGUgICAgICAgKgoqICBDb3Zl
cmVkIFNvZnR3YXJlIGlzIGZyZWUgb2YgZGVmZWN0cywgbWVyY2hhbnRhYmxlLCBmaXQgZm9yIGEg
ICAgICAgICoKKiAgcGFydGljdWxhciBwdXJwb3NlIG9yIG5vbi1pbmZyaW5naW5nLiBUaGUgZW50
aXJlIHJpc2sgYXMgdG8gdGhlICAgICAqCiogIHF1YWxpdHkgYW5kIHBlcmZvcm1hbmNlIG9mIHRo
ZSBDb3ZlcmVkIFNvZnR3YXJlIGlzIHdpdGggWW91LiAgICAgICAgKgoqICBTaG91bGQgYW55IENv
dmVyZWQgU29mdHdhcmUgcHJvdmUgZGVmZWN0aXZlIGluIGFueSByZXNwZWN0LCBZb3UgICAgICoK
KiAgKG5vdCBhbnkgQ29udHJpYnV0b3IpIGFzc3VtZSB0aGUgY29zdCBvZiBhbnkgbmVjZXNzYXJ5
IHNlcnZpY2luZywgICAqCiogIHJlcGFpciwgb3IgY29ycmVjdGlvbi4gVGhpcyBkaXNjbGFpbWVy
IG9mIHdhcnJhbnR5IGNvbnN0aXR1dGVzIGFuICAgKgoqICBlc3NlbnRpYWwgcGFydCBvZiB0aGlz
IExpY2Vuc2UuIE5vIHVzZSBvZiBhbnkgQ292ZXJlZCBTb2Z0d2FyZSBpcyAgICoKKiAgYXV0aG9y
aXplZCB1bmRlciB0aGlzIExpY2Vuc2UgZXhjZXB0IHVuZGVyIHRoaXMgZGlzY2xhaW1lci4gICAg
ICAgICAqCiogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
ICAgICAgICAgICAgICAgICAgICAgKgoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioq
KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioKCioqKioqKioqKioqKioqKioq
KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKgoq
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
ICAgICAgICAgICAgICoKKiAgNy4gTGltaXRhdGlvbiBvZiBMaWFiaWxpdHkgICAgICAgICAgICAg
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqCiogIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t
LS0tICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKgoqICAgICAgICAg
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
ICAgICoKKiAgVW5kZXIgbm8gY2lyY3Vtc3RhbmNlcyBhbmQgdW5kZXIgbm8gbGVnYWwgdGhlb3J5
LCB3aGV0aGVyIHRvcnQgICAgICAqCiogIChpbmNsdWRpbmcgbmVnbGlnZW5jZSksIGNvbnRyYWN0
LCBvciBvdGhlcndpc2UsIHNoYWxsIGFueSAgICAgICAgICAgKgoqICBDb250cmlidXRvciwgb3Ig
YW55b25lIHdobyBkaXN0cmlidXRlcyBDb3ZlcmVkIFNvZnR3YXJlIGFzICAgICAgICAgICoKKiAg
cGVybWl0dGVkIGFib3ZlLCBiZSBsaWFibGUgdG8gWW91IGZvciBhbnkgZGlyZWN0LCBpbmRpcmVj
dCwgICAgICAgICAqCiogIHNwZWNpYWwsIGluY2lkZW50YWwsIG9yIGNvbnNlcXVlbnRpYWwgZGFt
YWdlcyBvZiBhbnkgY2hhcmFjdGVyICAgICAgKgoqICBpbmNsdWRpbmcsIHdpdGhvdXQgbGltaXRh
dGlvbiwgZGFtYWdlcyBmb3IgbG9zdCBwcm9maXRzLCBsb3NzIG9mICAgICoKKiAgZ29vZHdpbGws
IHdvcmsgc3RvcHBhZ2UsIGNvbXB1dGVyIGZhaWx1cmUgb3IgbWFsZnVuY3Rpb24sIG9yIGFueSAg
ICAqCiogIGFuZCBhbGwgb3RoZXIgY29tbWVyY2lhbCBkYW1hZ2VzIG9yIGxvc3NlcywgZXZlbiBp
ZiBzdWNoIHBhcnR5ICAgICAgKgoqICBzaGFsbCBoYXZlIGJlZW4gaW5mb3JtZWQgb2YgdGhlIHBv
c3NpYmlsaXR5IG9mIHN1Y2ggZGFtYWdlcy4gVGhpcyAgICoKKiAgbGltaXRhdGlvbiBvZiBsaWFi
aWxpdHkgc2hhbGwgbm90IGFwcGx5IHRvIGxpYWJpbGl0eSBmb3IgZGVhdGggb3IgICAqCiogIHBl
cnNvbmFsIGluanVyeSByZXN1bHRpbmcgZnJvbSBzdWNoIHBhcnR5J3MgbmVnbGlnZW5jZSB0byB0
aGUgICAgICAgKgoqICBleHRlbnQgYXBwbGljYWJsZSBsYXcgcHJvaGliaXRzIHN1Y2ggbGltaXRh
dGlvbi4gU29tZSAgICAgICAgICAgICAgICoKKiAganVyaXNkaWN0aW9ucyBkbyBub3QgYWxsb3cg
dGhlIGV4Y2x1c2lvbiBvciBsaW1pdGF0aW9uIG9mICAgICAgICAgICAqCiogIGluY2lkZW50YWwg
b3IgY29uc2VxdWVudGlhbCBkYW1hZ2VzLCBzbyB0aGlzIGV4Y2x1c2lvbiBhbmQgICAgICAgICAg
KgoqICBsaW1pdGF0aW9uIG1heSBub3QgYXBwbHkgdG8gWW91LiAgICAgICAgICAgICAgICAgICAg
ICAgICAgICAgICAgICAgICoKKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqCioqKioqKioqKioqKioqKioqKioqKioq
KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKgoKOC4gTGl0
aWdhdGlvbgotLS0tLS0tLS0tLS0tCgpBbnkgbGl0aWdhdGlvbiByZWxhdGluZyB0byB0aGlzIExp
Y2Vuc2UgbWF5IGJlIGJyb3VnaHQgb25seSBpbiB0aGUKY291cnRzIG9mIGEganVyaXNkaWN0aW9u
IHdoZXJlIHRoZSBkZWZlbmRhbnQgbWFpbnRhaW5zIGl0cyBwcmluY2lwYWwKcGxhY2Ugb2YgYnVz
aW5lc3MgYW5kIHN1Y2ggbGl0aWdhdGlvbiBzaGFsbCBiZSBnb3Zlcm5lZCBieSBsYXdzIG9mIHRo
YXQKanVyaXNkaWN0aW9uLCB3aXRob3V0IHJlZmVyZW5jZSB0byBpdHMgY29uZmxpY3Qtb2YtbGF3
IHByb3Zpc2lvbnMuCk5vdGhpbmcgaW4gdGhpcyBTZWN0aW9uIHNoYWxsIHByZXZlbnQgYSBwYXJ0
eSdzIGFiaWxpdHkgdG8gYnJpbmcKY3Jvc3MtY2xhaW1zIG9yIGNvdW50ZXItY2xhaW1zLgoKOS4g
TWlzY2VsbGFuZW91cwotLS0tLS0tLS0tLS0tLS0tCgpUaGlzIExpY2Vuc2UgcmVwcmVzZW50cyB0
aGUgY29tcGxldGUgYWdyZWVtZW50IGNvbmNlcm5pbmcgdGhlIHN1YmplY3QKbWF0dGVyIGhlcmVv
Zi4gSWYgYW55IHByb3Zpc2lvbiBvZiB0aGlzIExpY2Vuc2UgaXMgaGVsZCB0byBiZQp1bmVuZm9y
Y2VhYmxlLCBzdWNoIHByb3Zpc2lvbiBzaGFsbCBiZSByZWZvcm1lZCBvbmx5IHRvIHRoZSBleHRl
bnQKbmVjZXNzYXJ5IHRvIG1ha2UgaXQgZW5mb3JjZWFibGUuIEFueSBsYXcgb3IgcmVndWxhdGlv
biB3aGljaCBwcm92aWRlcwp0aGF0IHRoZSBsYW5ndWFnZSBvZiBhIGNvbnRyYWN0IHNoYWxsIGJl
IGNvbnN0cnVlZCBhZ2FpbnN0IHRoZSBkcmFmdGVyCnNoYWxsIG5vdCBiZSB1c2VkIHRvIGNvbnN0
cnVlIHRoaXMgTGljZW5zZSBhZ2FpbnN0IGEgQ29udHJpYnV0b3IuCgoxMC4gVmVyc2lvbnMgb2Yg
dGhlIExpY2Vuc2UKLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tCgoxMC4xLiBOZXcgVmVyc2lv
bnMKCk1vemlsbGEgRm91bmRhdGlvbiBpcyB0aGUgbGljZW5zZSBzdGV3YXJkLiBFeGNlcHQgYXMg
cHJvdmlkZWQgaW4gU2VjdGlvbgoxMC4zLCBubyBvbmUgb3RoZXIgdGhhbiB0aGUgbGljZW5zZSBz
dGV3YXJkIGhhcyB0aGUgcmlnaHQgdG8gbW9kaWZ5IG9yCnB1Ymxpc2ggbmV3IHZlcnNpb25zIG9m
IHRoaXMgTGljZW5zZS4gRWFjaCB2ZXJzaW9uIHdpbGwgYmUgZ2l2ZW4gYQpkaXN0aW5ndWlzaGlu
ZyB2ZXJzaW9uIG51bWJlci4KCjEwLjIuIEVmZmVjdCBvZiBOZXcgVmVyc2lvbnMKCllvdSBtYXkg
ZGlzdHJpYnV0ZSB0aGUgQ292ZXJlZCBTb2Z0d2FyZSB1bmRlciB0aGUgdGVybXMgb2YgdGhlIHZl
cnNpb24Kb2YgdGhlIExpY2Vuc2UgdW5kZXIgd2hpY2ggWW91IG9yaWdpbmFsbHkgcmVjZWl2ZWQg
dGhlIENvdmVyZWQgU29mdHdhcmUsCm9yIHVuZGVyIHRoZSB0ZXJtcyBvZiBhbnkgc3Vic2VxdWVu
dCB2ZXJzaW9uIHB1Ymxpc2hlZCBieSB0aGUgbGljZW5zZQpzdGV3YXJkLgoKMTAuMy4gTW9kaWZp
ZWQgVmVyc2lvbnMKCklmIHlvdSBjcmVhdGUgc29mdHdhcmUgbm90IGdvdmVybmVkIGJ5IHRoaXMg
TGljZW5zZSwgYW5kIHlvdSB3YW50IHRvCmNyZWF0ZSBhIG5ldyBsaWNlbnNlIGZvciBzdWNoIHNv
ZnR3YXJlLCB5b3UgbWF5IGNyZWF0ZSBhbmQgdXNlIGEKbW9kaWZpZWQgdmVyc2lvbiBvZiB0aGlz
IExpY2Vuc2UgaWYgeW91IHJlbmFtZSB0aGUgbGljZW5zZSBhbmQgcmVtb3ZlCmFueSByZWZlcmVu
Y2VzIHRvIHRoZSBuYW1lIG9mIHRoZSBsaWNlbnNlIHN0ZXdhcmQgKGV4Y2VwdCB0byBub3RlIHRo
YXQKc3VjaCBtb2RpZmllZCBsaWNlbnNlIGRpZmZlcnMgZnJvbSB0aGlzIExpY2Vuc2UpLgoKMTAu
NC4gRGlzdHJpYnV0aW5nIFNvdXJjZSBDb2RlIEZvcm0gdGhhdCBpcyBJbmNvbXBhdGlibGUgV2l0
aCBTZWNvbmRhcnkKTGljZW5zZXMKCklmIFlvdSBjaG9vc2UgdG8gZGlzdHJpYnV0ZSBTb3VyY2Ug
Q29kZSBGb3JtIHRoYXQgaXMgSW5jb21wYXRpYmxlIFdpdGgKU2Vjb25kYXJ5IExpY2Vuc2VzIHVu
ZGVyIHRoZSB0ZXJtcyBvZiB0aGlzIHZlcnNpb24gb2YgdGhlIExpY2Vuc2UsIHRoZQpub3RpY2Ug
ZGVzY3JpYmVkIGluIEV4aGliaXQgQiBvZiB0aGlzIExpY2Vuc2UgbXVzdCBiZSBhdHRhY2hlZC4K
CkV4aGliaXQgQSAtIFNvdXJjZSBDb2RlIEZvcm0gTGljZW5zZSBOb3RpY2UKLS0tLS0tLS0tLS0t
LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQoKICBUaGlzIFNvdXJjZSBDb2RlIEZvcm0g
aXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljCiAgTGljZW5zZSwg
di4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhp
cwogIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIu
MC8uCgpJZiBpdCBpcyBub3QgcG9zc2libGUgb3IgZGVzaXJhYmxlIHRvIHB1dCB0aGUgbm90aWNl
IGluIGEgcGFydGljdWxhcgpmaWxlLCB0aGVuIFlvdSBtYXkgaW5jbHVkZSB0aGUgbm90aWNlIGlu
IGEgbG9jYXRpb24gKHN1Y2ggYXMgYSBMSUNFTlNFCmZpbGUgaW4gYSByZWxldmFudCBkaXJlY3Rv
cnkpIHdoZXJlIGEgcmVjaXBpZW50IHdvdWxkIGJlIGxpa2VseSB0byBsb29rCmZvciBzdWNoIGEg
bm90aWNlLgoKWW91IG1heSBhZGQgYWRkaXRpb25hbCBhY2N1cmF0ZSBub3RpY2VzIG9mIGNvcHly
aWdodCBvd25lcnNoaXAuCgpFeGhpYml0IEIgLSAiSW5jb21wYXRpYmxlIFdpdGggU2Vjb25kYXJ5
IExpY2Vuc2VzIiBOb3RpY2UKLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t
LS0tLS0tLS0tLS0tLS0tLS0tCgogIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyAiSW5jb21wYXRp
YmxlIFdpdGggU2Vjb25kYXJ5IExpY2Vuc2VzIiwgYXMKICBkZWZpbmVkIGJ5IHRoZSBNb3ppbGxh
IFB1YmxpYyBMaWNlbnNlLCB2LiAyLjAuCgo=
````

### File `packaging/release/licences/5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b.txt`

<!-- r1:file task=2 path=packaging/release/licences/5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b.txt sha256=5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b bytes=1073 mode=644 encoding=utf8 -->
````text
MIT License

Copyright (c) 2022-2026 Leo Gaskin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

````

### File `packaging/release/licences/6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a.txt`

<!-- r1:file task=2 path=packaging/release/licences/6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a.txt sha256=6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a bytes=10783 mode=644 encoding=utf8 -->
````text

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   Copyright 2025 Zed Industries, Inc. and contributors

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
````

### File `packaging/release/licences/8173d5c29b4f956d532781d2b86e4e30f83e6b7878dce18c919451d6ba707c90.txt`

<!-- r1:file task=2 path=packaging/release/licences/8173d5c29b4f956d532781d2b86e4e30f83e6b7878dce18c919451d6ba707c90.txt sha256=8173d5c29b4f956d532781d2b86e4e30f83e6b7878dce18c919451d6ba707c90 bytes=10850 mode=644 encoding=utf8 -->
````text
                              Apache License
                        Version 2.0, January 2004
                     http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity. For the purposes of this definition,
   "control" means (i) the power, direct or indirect, to cause the
   direction or management of such entity, whether by contract or
   otherwise, or (ii) ownership of fifty percent (50%) or more of the
   outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form, including but
   not limited to compiled object code, generated documentation,
   and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or
   Object form, made available under the License, as indicated by a
   copyright notice that is included in or attached to the work
   (an example is provided in the Appendix below).

   "Derivative Works" shall mean any work, whether in Source or Object
   form, that is based on (or derived from) the Work and for which the
   editorial revisions, annotations, elaborations, or other modifications
   represent, as a whole, an original work of authorship. For the purposes
   of this License, Derivative Works shall not include works that remain
   separable from, or merely link (or bind by name) to the interfaces of,
   the Work and Derivative Works thereof.

   "Contribution" shall mean any work of authorship, including
   the original version of the Work and any modifications or additions
   to that Work or Derivative Works thereof, that is intentionally
   submitted to Licensor for inclusion in the Work by the copyright owner
   or by an individual or Legal Entity authorized to submit on behalf of
   the copyright owner. For the purposes of this definition, "submitted"
   means any form of electronic, verbal, or written communication sent
   to the Licensor or its representatives, including but not limited to
   communication on electronic mailing lists, source code control systems,
   and issue tracking systems that are managed by, or on behalf of, the
   Licensor for the purpose of discussing and improving the Work, but
   excluding communication that is conspicuously marked or otherwise
   designated in writing by the copyright owner as "Not a Contribution."

   "Contributor" shall mean Licensor and any individual or Legal Entity
   on behalf of whom a Contribution has been received by Licensor and
   subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of,
   publicly display, publicly perform, sublicense, and distribute the
   Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   (except as stated in this section) patent license to make, have made,
   use, offer to sell, sell, import, and otherwise transfer the Work,
   where such license applies only to those patent claims licensable
   by such Contributor that are necessarily infringed by their
   Contribution(s) alone or by combination of their Contribution(s)
   with the Work to which such Contribution(s) was submitted. If You
   institute patent litigation against any entity (including a
   cross-claim or counterclaim in a lawsuit) alleging that the Work
   or a Contribution incorporated within the Work constitutes direct
   or contributory patent infringement, then any patent licenses
   granted to You under this License for that Work shall terminate
   as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
   Work or Derivative Works thereof in any medium, with or without
   modifications, and in Source or Object form, provided that You
   meet the following conditions:

   (a) You must give any other recipients of the Work or
       Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices
       stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works
       that You distribute, all copyright, patent, trademark, and
       attribution notices from the Source form of the Work,
       excluding those notices that do not pertain to any part of
       the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its
       distribution, then any Derivative Works that You distribute must
       include a readable copy of the attribution notices contained
       within such NOTICE file, excluding those notices that do not
       pertain to any part of the Derivative Works, in at least one
       of the following places: within a NOTICE text file distributed
       as part of the Derivative Works; within the Source form or
       documentation, if provided along with the Derivative Works; or,
       within a display generated by the Derivative Works, if and
       wherever such third-party notices normally appear. The contents
       of the NOTICE file are for informational purposes only and
       do not modify the License. You may add Your own attribution
       notices within Derivative Works that You distribute, alongside
       or as an addendum to the NOTICE text from the Work, provided
       that such additional attribution notices cannot be construed
       as modifying the License.

   You may add Your own copyright statement to Your modifications and
   may provide additional or different license terms and conditions
   for use, reproduction, or distribution of Your modifications, or
   for any such Derivative Works as a whole, provided Your use,
   reproduction, and distribution of the Work otherwise complies with
   the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
   any Contribution intentionally submitted for inclusion in the Work
   by You to the Licensor shall be under the terms and conditions of
   this License, without any additional terms or conditions.
   Notwithstanding the above, nothing herein shall supersede or modify
   the terms of any separate license agreement you may have executed
   with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
   names, trademarks, service marks, or product names of the Licensor,
   except as required for reasonable and customary use in describing the
   origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
   agreed to in writing, Licensor provides the Work (and each
   Contributor provides its Contributions) on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
   implied, including, without limitation, any warranties or conditions
   of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
   PARTICULAR PURPOSE. You are solely responsible for determining the
   appropriateness of using or redistributing the Work and assume any
   risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
   whether in tort (including negligence), contract, or otherwise,
   unless required by applicable law (such as deliberate and grossly
   negligent acts) or agreed to in writing, shall any Contributor be
   liable to You for damages, including any direct, indirect, special,
   incidental, or consequential damages of any character arising as a
   result of this License or out of the use or inability to use the
   Work (including but not limited to damages for loss of goodwill,
   work stoppage, computer failure or malfunction, or any and all
   other commercial damages or losses), even if such Contributor
   has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
   the Work or Derivative Works thereof, You may choose to offer,
   and charge a fee for, acceptance of support, warranty, indemnity,
   or other liability obligations and/or rights consistent with this
   License. However, in accepting such obligations, You may act only
   on Your own behalf and on Your sole responsibility, not on behalf
   of any other Contributor, and only if You agree to indemnify,
   defend, and hold each Contributor harmless for any liability
   incurred by, or claims asserted against, such Contributor by reason
   of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS

APPENDIX: How to apply the Apache License to your work.

   To apply the Apache License to your work, attach the following
   boilerplate notice, with the fields enclosed by brackets "[]"
   replaced with your own identifying information. (Don't include
   the brackets!)  The text should be enclosed in the appropriate
   comment syntax for the file format. We also recommend that a
   file or class name and description of purpose be included on the
   same "printed page" as the copyright notice for easier
   identification within third-party archives.

Copyright [yyyy] [name of copyright owner]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
````

### File `packaging/release/licences/README.md`

<!-- r1:file task=2 path=packaging/release/licences/README.md sha256=18e709d5a52cfb98039ad8b4bbba2f45840b840a19917e424347c81cc95c8ecf bytes=1092 mode=644 encoding=utf8 -->
````markdown
# Supplemental upstream licence texts

Some locked packages declare a licence but omit the repository-root licence
file from their published tarball. `manifest.json` binds each such exact package
version to the verbatim text's SHA-256 and immutable upstream source commit.
The bytes are not a licence exception or an inference from another project.
The rolldown native packages use their own repository-root MIT licence carried
by the same-version rolldown wrapper, whose package integrity is locked in
`web/pnpm-lock.yaml` and whose source accompanies the release.

`supply.py` uses these texts only where the package has no licence file of its
own. A dependency bump requires reviewing its upstream source and updating the
mapping; no moving upstream URL is fetched by a candidate build. Unknown
licences and missing text remain findings that prevent freeze. File contents,
source relationships, frontend assets/fonts and copyleft corresponding source
still require the maintainer's redistribution review before publication.

Generated with Claude AI — please review before distribution.
````

### File `packaging/release/licences/a5c61b93b6ee1d104af9920cf020ff3c7efe818e31fe562c72261847a728f513.txt`

<!-- r1:file task=2 path=packaging/release/licences/a5c61b93b6ee1d104af9920cf020ff3c7efe818e31fe562c72261847a728f513.txt sha256=a5c61b93b6ee1d104af9920cf020ff3c7efe818e31fe562c72261847a728f513 bytes=1060 mode=644 encoding=utf8 -->
````text
Copyright (c) 2017 Pierre Chifflier

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
````

### File `packaging/release/licences/a60eea817514531668d7e00765731449fe14d059d3249e0bc93b36de45f759f2.txt`

<!-- r1:file task=2 path=packaging/release/licences/a60eea817514531668d7e00765731449fe14d059d3249e0bc93b36de45f759f2.txt sha256=a60eea817514531668d7e00765731449fe14d059d3249e0bc93b36de45f759f2 bytes=10847 mode=644 encoding=utf8 -->
````text
                              Apache License
                        Version 2.0, January 2004
                     http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity. For the purposes of this definition,
   "control" means (i) the power, direct or indirect, to cause the
   direction or management of such entity, whether by contract or
   otherwise, or (ii) ownership of fifty percent (50%) or more of the
   outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form, including but
   not limited to compiled object code, generated documentation,
   and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or
   Object form, made available under the License, as indicated by a
   copyright notice that is included in or attached to the work
   (an example is provided in the Appendix below).

   "Derivative Works" shall mean any work, whether in Source or Object
   form, that is based on (or derived from) the Work and for which the
   editorial revisions, annotations, elaborations, or other modifications
   represent, as a whole, an original work of authorship. For the purposes
   of this License, Derivative Works shall not include works that remain
   separable from, or merely link (or bind by name) to the interfaces of,
   the Work and Derivative Works thereof.

   "Contribution" shall mean any work of authorship, including
   the original version of the Work and any modifications or additions
   to that Work or Derivative Works thereof, that is intentionally
   submitted to Licensor for inclusion in the Work by the copyright owner
   or by an individual or Legal Entity authorized to submit on behalf of
   the copyright owner. For the purposes of this definition, "submitted"
   means any form of electronic, verbal, or written communication sent
   to the Licensor or its representatives, including but not limited to
   communication on electronic mailing lists, source code control systems,
   and issue tracking systems that are managed by, or on behalf of, the
   Licensor for the purpose of discussing and improving the Work, but
   excluding communication that is conspicuously marked or otherwise
   designated in writing by the copyright owner as "Not a Contribution."

   "Contributor" shall mean Licensor and any individual or Legal Entity
   on behalf of whom a Contribution has been received by Licensor and
   subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of,
   publicly display, publicly perform, sublicense, and distribute the
   Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   (except as stated in this section) patent license to make, have made,
   use, offer to sell, sell, import, and otherwise transfer the Work,
   where such license applies only to those patent claims licensable
   by such Contributor that are necessarily infringed by their
   Contribution(s) alone or by combination of their Contribution(s)
   with the Work to which such Contribution(s) was submitted. If You
   institute patent litigation against any entity (including a
   cross-claim or counterclaim in a lawsuit) alleging that the Work
   or a Contribution incorporated within the Work constitutes direct
   or contributory patent infringement, then any patent licenses
   granted to You under this License for that Work shall terminate
   as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
   Work or Derivative Works thereof in any medium, with or without
   modifications, and in Source or Object form, provided that You
   meet the following conditions:

   (a) You must give any other recipients of the Work or
       Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices
       stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works
       that You distribute, all copyright, patent, trademark, and
       attribution notices from the Source form of the Work,
       excluding those notices that do not pertain to any part of
       the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its
       distribution, then any Derivative Works that You distribute must
       include a readable copy of the attribution notices contained
       within such NOTICE file, excluding those notices that do not
       pertain to any part of the Derivative Works, in at least one
       of the following places: within a NOTICE text file distributed
       as part of the Derivative Works; within the Source form or
       documentation, if provided along with the Derivative Works; or,
       within a display generated by the Derivative Works, if and
       wherever such third-party notices normally appear. The contents
       of the NOTICE file are for informational purposes only and
       do not modify the License. You may add Your own attribution
       notices within Derivative Works that You distribute, alongside
       or as an addendum to the NOTICE text from the Work, provided
       that such additional attribution notices cannot be construed
       as modifying the License.

   You may add Your own copyright statement to Your modifications and
   may provide additional or different license terms and conditions
   for use, reproduction, or distribution of Your modifications, or
   for any such Derivative Works as a whole, provided Your use,
   reproduction, and distribution of the Work otherwise complies with
   the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
   any Contribution intentionally submitted for inclusion in the Work
   by You to the Licensor shall be under the terms and conditions of
   this License, without any additional terms or conditions.
   Notwithstanding the above, nothing herein shall supersede or modify
   the terms of any separate license agreement you may have executed
   with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
   names, trademarks, service marks, or product names of the Licensor,
   except as required for reasonable and customary use in describing the
   origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
   agreed to in writing, Licensor provides the Work (and each
   Contributor provides its Contributions) on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
   implied, including, without limitation, any warranties or conditions
   of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
   PARTICULAR PURPOSE. You are solely responsible for determining the
   appropriateness of using or redistributing the Work and assume any
   risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
   whether in tort (including negligence), contract, or otherwise,
   unless required by applicable law (such as deliberate and grossly
   negligent acts) or agreed to in writing, shall any Contributor be
   liable to You for damages, including any direct, indirect, special,
   incidental, or consequential damages of any character arising as a
   result of this License or out of the use or inability to use the
   Work (including but not limited to damages for loss of goodwill,
   work stoppage, computer failure or malfunction, or any and all
   other commercial damages or losses), even if such Contributor
   has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
   the Work or Derivative Works thereof, You may choose to offer,
   and charge a fee for, acceptance of support, warranty, indemnity,
   or other liability obligations and/or rights consistent with this
   License. However, in accepting such obligations, You may act only
   on Your own behalf and on Your sole responsibility, not on behalf
   of any other Contributor, and only if You agree to indemnify,
   defend, and hold each Contributor harmless for any liability
   incurred by, or claims asserted against, such Contributor by reason
   of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS

APPENDIX: How to apply the Apache License to your work.

   To apply the Apache License to your work, attach the following
   boilerplate notice, with the fields enclosed by brackets "[]"
   replaced with your own identifying information. (Don't include
   the brackets!)  The text should be enclosed in the appropriate
   comment syntax for the file format. We also recommend that a
   file or class name and description of purpose be included on the
   same "printed page" as the copyright notice for easier
   identification within third-party archives.

Copyright [yyyy] [name of copyright owner]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
````

### File `packaging/release/licences/c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c.txt`

<!-- r1:file task=2 path=packaging/release/licences/c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c.txt sha256=c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c bytes=11358 mode=644 encoding=utf8 -->
````text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

````

### File `packaging/release/licences/db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1.txt`

<!-- r1:file task=2 path=packaging/release/licences/db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1.txt sha256=db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1 bytes=1073 mode=644 encoding=utf8 -->
````text
MIT License

Copyright (c) 2020 Aleph Alpha GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### File `packaging/release/licences/ed60d479b8fd1f64e9cbc3de449a16a53ac1b3d1b6aeb9bf9d190a8e93061b44.txt`

<!-- r1:file task=2 path=packaging/release/licences/ed60d479b8fd1f64e9cbc3de449a16a53ac1b3d1b6aeb9bf9d190a8e93061b44.txt sha256=ed60d479b8fd1f64e9cbc3de449a16a53ac1b3d1b6aeb9bf9d190a8e93061b44 bytes=1065 mode=644 encoding=utf8 -->
````text
Copyright (c) 2021 Valuable Contributors

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
````

### File `packaging/release/licences/f250d08cee4549b22b3b4aaaf3a743473336fd280316df5d0340717e5127a221.txt`

<!-- r1:file task=2 path=packaging/release/licences/f250d08cee4549b22b3b4aaaf3a743473336fd280316df5d0340717e5127a221.txt sha256=f250d08cee4549b22b3b4aaaf3a743473336fd280316df5d0340717e5127a221 bytes=10782 mode=644 encoding=utf8 -->
````text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   Copyright 2025 Zed Industries, Inc. and contributors

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
````

### File `packaging/release/licences/manifest.json`

<!-- r1:file task=2 path=packaging/release/licences/manifest.json sha256=b76795b8c65300b1f74aa451022c3ed2e31f0f171fa675a76624dddecee0c163 bytes=8968 mode=644 encoding=utf8 -->
````json
{
  "cargo:agent-client-protocol-derive@2.2.0": [
    {
      "file": "6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a.txt",
      "sha256": "6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a",
      "source": "https://raw.githubusercontent.com/agentclientprotocol/rust-sdk/2a78849d3eb3dcb140dade3b8fc938cf1e2b9ce5/LICENSE"
    }
  ],
  "cargo:agent-client-protocol-schema@1.9.1": [
    {
      "file": "f250d08cee4549b22b3b4aaaf3a743473336fd280316df5d0340717e5127a221.txt",
      "sha256": "f250d08cee4549b22b3b4aaaf3a743473336fd280316df5d0340717e5127a221",
      "source": "https://raw.githubusercontent.com/agentclientprotocol/agent-client-protocol/7e87dc205a7325bd07d0249fd20bb7486ee6ba95/LICENSE"
    }
  ],
  "cargo:agent-client-protocol@2.2.0": [
    {
      "file": "6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a.txt",
      "sha256": "6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a",
      "source": "https://raw.githubusercontent.com/agentclientprotocol/rust-sdk/2a78849d3eb3dcb140dade3b8fc938cf1e2b9ce5/LICENSE"
    }
  ],
  "cargo:asn1-rs-impl@0.2.0": [
    {
      "file": "a5c61b93b6ee1d104af9920cf020ff3c7efe818e31fe562c72261847a728f513.txt",
      "sha256": "a5c61b93b6ee1d104af9920cf020ff3c7efe818e31fe562c72261847a728f513",
      "source": "https://raw.githubusercontent.com/rusticata/asn1-rs/a20e5f7319c896737ad0f2557037817b91ad854f/LICENSE-MIT"
    },
    {
      "file": "a60eea817514531668d7e00765731449fe14d059d3249e0bc93b36de45f759f2.txt",
      "sha256": "a60eea817514531668d7e00765731449fe14d059d3249e0bc93b36de45f759f2",
      "source": "https://raw.githubusercontent.com/rusticata/asn1-rs/a20e5f7319c896737ad0f2557037817b91ad854f/LICENSE-APACHE"
    }
  ],
  "cargo:base64urlsafedata@0.5.5": [
    {
      "file": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt",
      "sha256": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85",
      "source": "https://raw.githubusercontent.com/kanidm/webauthn-rs/d2c10d53ca5ef033d37ee6462e936e9eb72ad98c/LICENSE.md"
    }
  ],
  "cargo:defmt-parser@1.0.0": [
    {
      "file": "2710a622a896bba67356913d4d0492cab5465f61b2ecce6d880aeb483834fb50.txt",
      "sha256": "2710a622a896bba67356913d4d0492cab5465f61b2ecce6d880aeb483834fb50",
      "source": "https://raw.githubusercontent.com/knurling-rs/defmt/4a8cdb44891ed57b8ff5a023b6bec7137c48708f/LICENSE-MIT"
    },
    {
      "file": "8173d5c29b4f956d532781d2b86e4e30f83e6b7878dce18c919451d6ba707c90.txt",
      "sha256": "8173d5c29b4f956d532781d2b86e4e30f83e6b7878dce18c919451d6ba707c90",
      "source": "https://raw.githubusercontent.com/knurling-rs/defmt/4a8cdb44891ed57b8ff5a023b6bec7137c48708f/LICENSE-APACHE"
    }
  ],
  "cargo:ece-native@0.5.0": [
    {
      "file": "5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b.txt",
      "sha256": "5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b",
      "source": "https://raw.githubusercontent.com/leotaku/web-push-native/6b0a3f10377af3c9401a7c1a60b1e34d41155c5d/LICENSE-MIT"
    },
    {
      "file": "c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c.txt",
      "sha256": "c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c",
      "source": "https://raw.githubusercontent.com/leotaku/web-push-native/6b0a3f10377af3c9401a7c1a60b1e34d41155c5d/LICENSE-APACHE"
    }
  ],
  "cargo:ts-rs-macros@12.0.1": [
    {
      "file": "db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1.txt",
      "sha256": "db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1",
      "source": "https://raw.githubusercontent.com/Aleph-Alpha/ts-rs/7182ad8289596097235406b715fa04506443b4ad/LICENSE"
    }
  ],
  "cargo:ts-rs@12.0.1": [
    {
      "file": "db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1.txt",
      "sha256": "db7f7f8e7236a2d0b41b855b2501b7b913caebbcda6ce498637a304ad1706ce1",
      "source": "https://raw.githubusercontent.com/Aleph-Alpha/ts-rs/7182ad8289596097235406b715fa04506443b4ad/LICENSE"
    }
  ],
  "cargo:valuable@0.1.1": [
    {
      "file": "ed60d479b8fd1f64e9cbc3de449a16a53ac1b3d1b6aeb9bf9d190a8e93061b44.txt",
      "sha256": "ed60d479b8fd1f64e9cbc3de449a16a53ac1b3d1b6aeb9bf9d190a8e93061b44",
      "source": "https://raw.githubusercontent.com/tokio-rs/valuable/9efc29b6e58cef28f6566a47aa7e142a55fead77/LICENSE"
    }
  ],
  "cargo:web-push-native@0.5.0": [
    {
      "file": "5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b.txt",
      "sha256": "5ea65e0650efc73dc8b3612ff337f8c5dd94ffbd73e0e722a936957cf740098b",
      "source": "https://raw.githubusercontent.com/leotaku/web-push-native/6b0a3f10377af3c9401a7c1a60b1e34d41155c5d/LICENSE-MIT"
    },
    {
      "file": "c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c.txt",
      "sha256": "c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c",
      "source": "https://raw.githubusercontent.com/leotaku/web-push-native/6b0a3f10377af3c9401a7c1a60b1e34d41155c5d/LICENSE-APACHE"
    }
  ],
  "cargo:webauthn-attestation-ca@0.5.5": [
    {
      "file": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt",
      "sha256": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85",
      "source": "https://raw.githubusercontent.com/kanidm/webauthn-rs/d2c10d53ca5ef033d37ee6462e936e9eb72ad98c/LICENSE.md"
    }
  ],
  "cargo:webauthn-authenticator-rs@0.5.5": [
    {
      "file": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt",
      "sha256": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85",
      "source": "https://raw.githubusercontent.com/kanidm/webauthn-rs/d2c10d53ca5ef033d37ee6462e936e9eb72ad98c/LICENSE.md"
    }
  ],
  "cargo:webauthn-rs-core@0.5.5": [
    {
      "file": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt",
      "sha256": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85",
      "source": "https://raw.githubusercontent.com/kanidm/webauthn-rs/d2c10d53ca5ef033d37ee6462e936e9eb72ad98c/LICENSE.md"
    }
  ],
  "cargo:webauthn-rs-proto@0.5.5": [
    {
      "file": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt",
      "sha256": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85",
      "source": "https://raw.githubusercontent.com/kanidm/webauthn-rs/d2c10d53ca5ef033d37ee6462e936e9eb72ad98c/LICENSE.md"
    }
  ],
  "cargo:webauthn-rs@0.5.5": [
    {
      "file": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85.txt",
      "sha256": "32ee9dbf6196874fc9d406c54a888a6c4cbb9aa4a7f35b46befeaff43a78fe85",
      "source": "https://raw.githubusercontent.com/kanidm/webauthn-rs/d2c10d53ca5ef033d37ee6462e936e9eb72ad98c/LICENSE.md"
    }
  ],
  "npm:@rolldown/binding-darwin-arm64@1.2.12": [
    {
      "file": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt",
      "sha256": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734",
      "source": "npm:rolldown@1.2.12/LICENSE (same repository root licence; package integrity pinned by web/pnpm-lock.yaml)"
    }
  ],
  "npm:@rolldown/binding-linux-arm64-gnu@1.2.12": [
    {
      "file": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt",
      "sha256": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734",
      "source": "npm:rolldown@1.2.12/LICENSE (same repository root licence; package integrity pinned by web/pnpm-lock.yaml)"
    }
  ],
  "npm:@rolldown/binding-linux-arm64-musl@1.2.12": [
    {
      "file": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt",
      "sha256": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734",
      "source": "npm:rolldown@1.2.12/LICENSE (same repository root licence; package integrity pinned by web/pnpm-lock.yaml)"
    }
  ],
  "npm:@rolldown/binding-linux-x64-gnu@1.2.12": [
    {
      "file": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt",
      "sha256": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734",
      "source": "npm:rolldown@1.2.12/LICENSE (same repository root licence; package integrity pinned by web/pnpm-lock.yaml)"
    }
  ],
  "npm:@rolldown/binding-linux-x64-musl@1.2.12": [
    {
      "file": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734.txt",
      "sha256": "23ecfff35a5a2e80d92142f75228912c3b1abc4b5a8337a821ff4397e2f9f734",
      "source": "npm:rolldown@1.2.12/LICENSE (same repository root licence; package integrity pinned by web/pnpm-lock.yaml)"
    }
  ],
  "npm:saxes@6.0.0": [
    {
      "file": "0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e.txt",
      "sha256": "0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e",
      "source": "https://raw.githubusercontent.com/lddubeau/saxes/211fa0ebec9b628affc09219199639887174bfc3/LICENSE"
    }
  ]
}
````

### File `packaging/release/supply.py`

<!-- r1:file task=2 path=packaging/release/supply.py sha256=77c0b4b9ebd74fb8e40034c6f3666ee9038311b57a1f14e6af7d1d4fe92dbbf8 bytes=16489 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Generate notices, source material, SPDX and final inventories before signing.

Includes build/dev dependencies conservatively. Missing licence material is a
finding, never automatically treated as permission to redistribute. Downloaded
host runtimes are described separately and never included as payloads.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import tarfile
import uuid
import urllib.parse

import gate


def tree_digest(files):
    return gate.digest(gate.canonical([{'name': name, 'sha256': gate.digest(data)} for name, data in sorted(files.items())]))


def component(name, version, licence, root, ecosystem):
    notices = []
    for path in sorted(root.rglob('*')):
        if path.is_file() and not path.is_symlink() and not any(p in ('node_modules', '.git', 'target') for p in path.relative_to(root).parts[:-1]):
            if path.name.lower().startswith(('license', 'licence', 'copying', 'notice', 'copyright')) or any(part.lower() in ('licenses', 'licences') for part in path.relative_to(root).parts[:-1]):
                notices.append((str(path.relative_to(root)), path.read_text(errors='replace')))
    identifier = 'SPDXRef-' + gate.digest(f'{ecosystem}:{name}@{version}'.encode())[:24]
    return {'SPDXID': identifier, 'name': name, 'versionInfo': version, 'downloadLocation': 'NOASSERTION',
            'filesAnalyzed': False, 'licenseConcluded': 'NOASSERTION', 'licenseDeclared': ('MIT OR Apache-2.0' if licence == 'MIT/Apache-2.0' else licence) or 'NOASSERTION',
            'copyrightText': 'NOASSERTION', 'externalRefs': [{'referenceCategory': 'PACKAGE-MANAGER', 'referenceType': 'purl',
                                                            'referenceLocator': f'pkg:{ecosystem}/{urllib.parse.quote(name, safe="/")}@{urllib.parse.quote(version, safe="")}'}]}, notices



def frontend_sources(frontend):
    # pnpm 12 groups by licence and coalesces package versions/paths. Read
    # each package manifest so a coalesced entry never pairs the wrong version.
    for licence, group in frontend.items():
        for p in group:
            for raw_path in p['paths']:
                root = Path(raw_path)
                manifest = gate.strict_json((root / 'package.json').read_bytes())
                gate.require(manifest['name'] == p['name'] and manifest['version'] in p['versions'], 'frontend licence input differs from package bytes')
                yield p['name'], manifest['version'], licence, root, 'npm'



def rust_packages(cargo):
    if not cargo.get('resolve'):
        return cargo['packages']
    nodes = {node['id']: node for node in cargo['resolve']['nodes']}
    reachable, todo = set(), list(cargo['workspace_members'])
    while todo:
        node = todo.pop()
        if node not in reachable:
            reachable.add(node)
            todo.extend(nodes[node]['dependencies'])
    return [p for p in cargo['packages'] if p['id'] in reachable]


def supplemental(ecosystem, name, version):
    root = Path(__file__).resolve().parent / 'licences'
    path = root / 'manifest.json'
    if not path.is_file():
        return []
    manifest = gate.strict_json(path.read_bytes())
    texts = []
    for entry in manifest.get(f'{ecosystem}:{name}@{version}', []):
        text = (root / entry['file']).read_bytes()
        gate.require(gate.digest(text) == entry['sha256'], 'supplemental licence text changed')
        texts.append((entry['source'], text.decode()))
    return texts


def components(cargo, frontend):
    packages, notices, findings = [], [], []
    sources = []
    for p in rust_packages(cargo):
        if p.get('source') is not None:
            sources.append((p['name'], p['version'], p.get('license'), Path(p['manifest_path']).parent, 'cargo'))
    sources.extend(frontend_sources(frontend))
    seen = set()
    for name, version, licence, root, ecosystem in sorted(sources):
        if (ecosystem, name, version) in seen:
            continue
        seen.add((ecosystem, name, version))
        p, texts = component(name, version, licence, root, ecosystem)
        packages.append(p)
        if not texts:
            texts = supplemental(ecosystem, name, version)
        if not licence or licence in ('UNKNOWN', 'UNLICENSED', 'NOASSERTION') or not texts:
            findings.append(f'{ecosystem}:{name}@{version}: missing licence expression or text')
        notices.append(f'\n===== {ecosystem}:{name}@{version} ({licence}) =====\n')
        for path, text in texts:
            notices.append(f'\n--- {path} ---\n{text}\n')
    # Name the native libraries separately, rather than implying their Rust
    # wrapper's version is the bundled C library version.
    for native in rust_packages(cargo):
        root = Path(native['manifest_path']).parent
        if native['name'] == 'libsqlite3-sys':
            header = root / 'sqlite3/sqlite3.h'
            if header.is_file():
                version = re.search(r'#define SQLITE_VERSION\s+"([^"]+)"', header.read_text())
                gate.require(version is not None, 'bundled SQLite version missing')
                p, _ = component('SQLite', version.group(1), None, root / 'sqlite3', 'generic')
                p['sourceInfo'] = 'Bundled SQLite C source in libsqlite3-sys; public-domain declaration preserved in sqlite3.c and corresponding source.'
                packages.append(p)
                notices.append('\n===== Bundled SQLite public-domain declaration =====\n' + (root / 'sqlite3/sqlite3.c').read_text()[:1000])
        if native['name'] == 'openssl-src':
            version_file = root / 'openssl/VERSION.dat'
            if version_file.is_file():
                fields = dict(re.findall(r'^(MAJOR|MINOR|PATCH)=(\d+)$', version_file.read_text(), re.M))
                gate.require(set(fields) == {'MAJOR', 'MINOR', 'PATCH'}, 'bundled OpenSSL version missing')
                p, _ = component('OpenSSL', '.'.join(fields[k] for k in ('MAJOR', 'MINOR', 'PATCH')), 'Apache-2.0', root / 'openssl', 'generic')
                p['sourceInfo'] = 'Vendored OpenSSL source shipped by openssl-src; exact source preserved.'
                packages.append(p)
    return packages, ''.join(notices), findings


def spdx(packages, source_sha, target):
    return {'spdxVersion': 'SPDX-2.3', 'dataLicense': 'CC0-1.0', 'SPDXID': 'SPDXRef-DOCUMENT',
            'name': f'hennery-{target}', 'documentNamespace': f'https://github.com/{gate.REPOSITORY}/releases/spdx/{source_sha}/{target}/{uuid.uuid4()}',
            'creationInfo': {'created': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'creators': ['Tool: hennery-release-r1']},
            'packages': packages, 'relationships': [{'spdxElementId': 'SPDXRef-DOCUMENT', 'relationshipType': 'DESCRIBES',
                                                   'relatedSpdxElement': p['SPDXID']} for p in packages]}


def checksums(root):
    files = sorted(p for p in Path(root).iterdir() if p.name not in ('sha256.sum', 'release-inventory.json'))
    gate.require(all(p.is_file() and not p.is_symlink() for p in files), 'checksum inventory contains nonregular file')
    (Path(root) / 'sha256.sum').write_text(''.join(f'{gate.digest(p.read_bytes())}  {p.name}\n' for p in files))
    verify_checksums(root)


def verify_checksums(root):
    root = Path(root)
    listed = {}
    for line in (root / 'sha256.sum').read_text().splitlines():
        match = re.fullmatch(r'([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)', line)
        gate.require(match is not None, 'malformed combined checksum list')
        sha, name = match.groups()
        gate.require(name not in listed and name not in ('sha256.sum', 'release-inventory.json'), 'duplicate/cyclic checksum entry')
        listed[name] = sha
    actual = {p.name: gate.digest(p.read_bytes()) for p in root.iterdir() if p.name not in ('sha256.sum', 'release-inventory.json') and p.is_file() and not p.is_symlink()}
    gate.require(listed and listed == actual, 'combined checksum inventory incomplete or digest mismatch')


def dependency_sources(cargo, frontend, destination):
    # Include registry source, native vendored source (OpenSSL, SQLite), web
    # packages and licence texts. No managed Node or agent downloads.
    roots = [('cargo', p['name'], p['version'], Path(p['manifest_path']).parent) for p in rust_packages(cargo) if p.get('source')]
    roots += [(ecosystem, name, version, root) for name, version, _, root, ecosystem in frontend_sources(frontend)]
    seen = set()
    with tarfile.open(destination, 'w:xz', dereference=False, preset=1) as archive:
        for ecosystem, name, version, root in sorted(roots):
            prefix = f'{ecosystem}/{name.replace("/", "_")}@{version}'
            if prefix in seen:
                continue
            seen.add(prefix)
            for path in sorted(root.rglob('*')):
                relative = path.relative_to(root)
                if any(part in ('node_modules', '.git', 'target') for part in relative.parts):
                    continue
                gate.require(not path.is_symlink(), f'third-party source symlink needs review: {prefix}/{relative}')
                if path.is_file():
                    archive.add(path, arcname=f'{prefix}/{relative}', recursive=False)




def binary_inventory(root, targets):
    binaries = {}
    for target in targets:
        base = 'hennery-' + target
        archive = Path(root) / (base + '.tar.xz')
        with tarfile.open(archive, 'r:xz') as tar:
            members = tar.getmembers()
            expected = {base, base + '/hennery', base + '/LICENSE', base + '/README.md', base + '/THIRD-PARTY-NOTICES.txt'}
            gate.require(len(members) == len(expected) and {m.name.rstrip('/') for m in members} == expected,
                         'release archive content inventory differs')
            gate.require(all(m.isdir() if m.name.rstrip('/') == base else m.isfile() for m in members), 'release archive contains nonregular payload')
            data = tar.extractfile(base + '/hennery').read()
        sidecar = (Path(root) / (archive.name + '.sha256')).read_text().split()
        gate.require(sidecar == [gate.digest(archive.read_bytes()), archive.name], 'per-archive checksum sidecar differs')
        binaries[target] = {'sha256': gate.digest(data), 'size': len(data), 'archive': archive.name, 'member': base + '/hennery'}
    return binaries


def verify_binary_inventory(inventory, root):
    gate.require(inventory.get('binaries') == binary_inventory(root, inventory['targets']), 'approved binary inventory differs from archive bytes')


def required_payloads(channels, targets, tag):
    required = {'hennery-installer.sh', 'hennery.rb', 'hennery-source.tar.xz', 'dist-manifest.json',
                'THIRD-PARTY-NOTICES.txt', 'licence-findings.json', 'runtime-inventory.json', 'build-identity.json', 'release-notes.md'}
    for target in targets:
        base = 'hennery-' + target
        required.update({base + '.tar.xz', base + '.tar.xz.sha256', base + '.spdx.json',
                         target + '-third-party-source.tar.xz', target + '-builder.json', target + '-rust-advisories.json',
                         target + '-rust-advisory-revision.txt', target + '-web-advisories.json'})
    if 'crates' in channels:
        required.update(name + '-' + tag.removeprefix('v') + '.crate' for name in
                        ('hennery-proto', 'hennery-kernel', 'hennery-view', 'hennery-host', 'hennery-gateway', 'hennery-sessions', 'hennery'))
    if 'ghcr' in channels:
        required.update({'ghcr-index.json', 'ghcr-oci-layout.tar'})
    return required


def require_contract(root, channels, targets, tag):
    gate.require(set(channels) <= gate.CHANNELS and set(targets) <= gate.TARGETS, 'unqualified release channel/target')
    gate.require('-' not in tag or channels == ['github'], 'prerelease channels are GitHub only')
    gate.require(required_payloads(channels, targets, tag) <= {p.name for p in Path(root).iterdir()}, 'required release/channel payload missing')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['materials', 'freeze'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--target')
    parser.add_argument('--cargo-metadata', type=Path)
    parser.add_argument('--frontend-licences', type=Path)
    parser.add_argument('--channels', default='github')
    parser.add_argument('--targets', default=','.join(sorted(gate.TARGETS)))
    parser.add_argument('--tag')
    parser.add_argument('--run-id', type=int)
    parser.add_argument('--run-attempt', type=int)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.operation == 'materials':
        cargo = gate.strict_json(args.cargo_metadata.read_bytes())
        frontend = gate.strict_json(args.frontend_licences.read_bytes())
        packages, notices, findings = components(cargo, frontend)
        (args.output / 'THIRD-PARTY-NOTICES.txt').write_text(notices)
        (args.output / f'hennery-{args.target}.spdx.json').write_bytes(gate.canonical(spdx(packages, args.source_sha, args.target)))
        (args.output / 'licence-findings.json').write_bytes(gate.canonical({'findings': findings, 'scope': 'Rust and frontend including build/dev; assets and corresponding source still require maintainer review'}))
        dependency_sources(cargo, frontend, args.output / 'third-party-source.tar.xz')
        manifest = Path('adapters/manifest.json').read_bytes()
        (args.output / 'runtime-inventory.json').write_bytes(gate.canonical({'adapter_manifest_sha256': gate.digest(manifest),
                                                                          'redistributed': False, 'manifest': gate.strict_json(manifest)}))
        ui = {str(p.relative_to('web/dist')): p.read_bytes() for p in Path('web/dist').rglob('*') if p.is_file()}
        gate.require('index.html' in ui, 'release UI missing')
        identity = {'source_sha': args.source_sha, 'ui_sha256': tree_digest(ui), 'adapter_manifest_sha256': gate.digest(manifest),
                    'cargo_lock_sha256': gate.digest(Path('Cargo.lock').read_bytes()), 'web_lock_sha256': gate.digest(Path('web/pnpm-lock.yaml').read_bytes())}
        (args.output / 'build-identity.json').write_bytes(gate.canonical(identity))
    else:
        gate.require(not (args.output / 'release-inventory.json').exists(), 'candidate already frozen')
        findings = gate.strict_json((args.output / 'licence-findings.json').read_bytes())
        gate.require(not findings['findings'], 'unresolved licence findings: maintainer review/materials required')
        require_contract(args.output, sorted(args.channels.split(',')), sorted(args.targets.split(',')), args.tag)
        manifest_path = args.output / 'dist-manifest.json'
        manifest = gate.strict_json(manifest_path.read_bytes())
        # Acyclic extension: native dist entries remain available to binstall;
        # the extension covers added material without hashing itself/checksums.
        manifest['hennery_release_materials'] = [{'name': p.name, 'sha256': gate.digest(p.read_bytes()), 'size': p.stat().st_size}
            for p in sorted(args.output.iterdir()) if p.name not in ('dist-manifest.json', 'sha256.sum', 'release-inventory.json')]
        manifest_path.write_bytes(gate.canonical(manifest))
        checksums(args.output)
        inventory = {'schema': 1, 'repository': gate.REPOSITORY, 'source_sha': args.source_sha, 'tag': args.tag,
                     'channels': sorted(args.channels.split(',')), 'targets': sorted(args.targets.split(',')),
                     'candidate': {'run_id': args.run_id, 'run_attempt': args.run_attempt},
                     'artifacts': [{'name': p.name, 'sha256': gate.digest(p.read_bytes()), 'size': p.stat().st_size} for p in sorted(args.output.iterdir())]}
        gate.verify_files(inventory, args.output)
        inventory['binaries'] = binary_inventory(args.output, inventory['targets'])
        raw = gate.canonical(inventory)
        (args.output / 'release-inventory.json').write_bytes(raw)
        print(gate.digest(raw))


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, KeyError, OSError, ValueError) as error:
        raise SystemExit(f'release materials refused: {error}') from error
````

### File `packaging/release/test_supply.py`

<!-- r1:file task=2 path=packaging/release/test_supply.py sha256=e64305c0613b6adaa5976a53ad85ac527f2daead3b977f55073d3158f8c28d92 bytes=7216 mode=644 encoding=utf8 -->
````python
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import contextlib
import io
import tarfile

import gate
import supply


class Supply(unittest.TestCase):
    def test_components_include_frontend_and_bundled_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            rust = root / 'rust'
            rust.mkdir()
            (rust / 'LICENSE').write_text('Rust licence')
            (rust / 'Cargo.toml').write_text('[package]\nname="dependency"')
            openssl = rust / 'openssl'
            openssl.mkdir()
            (openssl / 'LICENSE.txt').write_text('OpenSSL Apache-2.0')
            web = root / 'frontend'
            web.mkdir()
            (web / 'LICENSE').write_text('Frontend licence')
            (web / 'package.json').write_text('{"name":"frontend","version":"1.2.3","license":"MIT"}')
            cargo = {'packages': [{'name': 'dependency', 'version': '1.0.0', 'license': 'MIT', 'source': 'registry+https://crates.io',
                                   'manifest_path': str(rust / 'Cargo.toml')}], 'workspace_members': []}
            frontend = {'MIT': [{'name': 'frontend', 'versions': ['1.2.3'], 'paths': [str(web)]}]}
            components, notices, findings = supply.components(cargo, frontend)
            self.assertEqual({c['name'] for c in components}, {'dependency', 'frontend'})
            self.assertIn('Frontend licence', notices)
            self.assertIn('OpenSSL Apache-2.0', notices)
            self.assertEqual(findings, [])
            sbom = supply.spdx(components, 'a' * 40, 'test-target')
            self.assertEqual(sbom['spdxVersion'], 'SPDX-2.3')
            self.assertEqual(len(sbom['packages']), 2)
            (web / 'LICENSE').unlink()
            self.assertTrue(supply.components(cargo, frontend)[2])

    def test_missing_each_channel_payload_refuses(self):
        for channels, tag in [(['github'], 'v0.1.0-alpha.1'), (['crates', 'github'], 'v0.1.0'), (['ghcr', 'github'], 'v0.1.0')]:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                targets = ['aarch64-apple-darwin']
                for name in supply.required_payloads(channels, targets, tag):
                    (root / name).write_bytes(b'fixture')
                supply.require_contract(root, channels, targets, tag)
                for path in root.iterdir():
                    path.unlink()
                    with self.subTest(channel=channels, missing=path.name), self.assertRaises(gate.Refused):
                        supply.require_contract(root, channels, targets, tag)
                    path.write_bytes(b'fixture')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in supply.required_payloads(['crates'], targets, 'v0.1.0-alpha.1'):
                (root / name).write_bytes(b'fixture')
            with self.assertRaises(gate.Refused):
                supply.require_contract(root, ['crates'], targets, 'v0.1.0-alpha.1')

    def test_freeze_checks_licences_and_freezes_complete_final_bytes_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            targets = ['aarch64-apple-darwin']
            for name in supply.required_payloads(['github'], targets, 'v0.1.0-alpha.1'):
                (root / name).write_bytes(b'fixture')
            base = 'hennery-' + targets[0]
            archive = root / (base + '.tar.xz')
            with tarfile.open(archive, 'w:xz') as tar:
                directory = tarfile.TarInfo(base + '/')
                directory.type = tarfile.DIRTYPE
                tar.addfile(directory)
                for name in ['hennery', 'LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.txt']:
                    entry = tarfile.TarInfo(base + '/' + name)
                    entry.size = 1
                    tar.addfile(entry, io.BytesIO(b'x'))
            (root / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
            (root / 'dist-manifest.json').write_text('{}')
            findings = root / 'licence-findings.json'
            findings.write_bytes(gate.canonical({'findings': ['unresolved']}))
            argv = ['supply.py', 'freeze', '--output', str(root), '--source-sha', 'a' * 40,
                    '--tag', 'v0.1.0-alpha.1', '--targets', targets[0], '--run-id', '10', '--run-attempt', '1']
            with patch('sys.argv', argv), self.assertRaisesRegex(gate.Refused, 'unresolved licence'):
                supply.main()
            findings.write_bytes(gate.canonical({'findings': []}))
            with patch('sys.argv', argv), contextlib.redirect_stdout(io.StringIO()):
                supply.main()
            inventory = gate.strict_json((root / 'release-inventory.json').read_bytes())
            gate.verify_files(inventory, root)
            supply.verify_checksums(root)
            supply.verify_binary_inventory(inventory, root)
            wrong = dict(inventory, binaries={})
            with self.assertRaises(gate.Refused):
                supply.verify_binary_inventory(wrong, root)
            self.assertIn('sha256.sum', [a['name'] for a in inventory['artifacts']])
            with patch('sys.argv', argv), self.assertRaisesRegex(gate.Refused, 'already frozen'):
                supply.main()

    def test_supplemental_licence_hash_cannot_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            directory = root / 'licences'
            directory.mkdir()
            (directory / 'text.txt').write_bytes(b'verbatim licence')
            entry = {'file': 'text.txt', 'sha256': gate.digest(b'verbatim licence'), 'source': 'immutable-upstream-revision'}
            (directory / 'manifest.json').write_bytes(gate.canonical({'cargo:dependency@1.0': [entry]}))
            with patch.object(supply, '__file__', str(root / 'supply.py')):
                self.assertEqual(supply.supplemental('cargo', 'dependency', '1.0')[0][1], 'verbatim licence')
                (directory / 'text.txt').write_bytes(b'changed licence')
                with self.assertRaises(gate.Refused):
                    supply.supplemental('cargo', 'dependency', '1.0')

    def test_source_and_runtime_digests(self):
        self.assertNotEqual(supply.tree_digest({'index.html': b'a'}), supply.tree_digest({'index.html': b'b'}))
        self.assertNotEqual(supply.tree_digest({'a': b'x'}), supply.tree_digest({'b': b'x'}))

    def test_checksum_inventory_is_complete_and_acyclic(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'payload').write_bytes(b'bytes')
            supply.checksums(root)
            self.assertEqual((root / 'sha256.sum').read_text(), gate.digest(b'bytes') + '  payload\n')
            supply.checksums(root)  # stable, never hashes itself
            self.assertNotIn('sha256.sum', (root / 'sha256.sum').read_text())
            (root / 'payload').write_bytes(b'changed')
            with self.assertRaises(gate.Refused):
                supply.verify_checksums(root)


if __name__ == '__main__':
    unittest.main()
````

### Step 3: GREEN / verification

```sh
nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_supply.py
nix develop -c cargo test -p hennery --test cli long_version_records_release_identity --locked
```

### Step 4: Commit / handoff

Inspect `git diff --check` and the staged stat, commit with `git -c commit.gpgsign=false commit`, verify `git log --format='%ae' origin/main..HEAD`, and push only `plan/dist-r1` over SSH. Report the review request to the parent; no self-approval and no GitHub actions.


## Task 3: Harden the actual cargo-dist installer

### Step 1: RED / contract

Extend test-installer.sh first. Generate cargo-dist globals with the pinned installer, build tiny archives using make_installer_fixture.py, and run the old hardener against them: the overwrite test must fail. Then harden and rerun all 14 groups; guard-removal probes must fail tests.

### Step 2: Exact implementation

### File `packaging/check-archive.sh`

<!-- r1:file task=3 path=packaging/check-archive.sh sha256=c2097a686ee855747da882e5af54286f46b124eabde044e846d75730820073fb bytes=851 mode=755 encoding=utf8 -->
````sh
#!/bin/sh
# A release archive holds the `hennery` binary, its licence and its README,
# and nothing else (distribution spec §3.3): never an adapter, nor the Claude
# CLI, which hennery does not redistribute.
#
# Usage: check-archive.sh <archive.tar.xz> <target>
set -eu

archive=$1
dir="hennery-$2"
listed=$(tar -tJf "$archive" | sort)
notices=
case "${3:-}" in
    --notices) notices="$dir/THIRD-PARTY-NOTICES.txt" ;;
    "") ;;
    *) echo "unknown archive policy: $3" >&2; exit 1 ;;
esac
expected=$(printf '%s\n' "$dir/" "$dir/LICENSE" "$dir/README.md" "$dir/hennery" ${notices:+"$notices"} | sort)
if [ "$listed" != "$expected" ]; then
    echo "FAIL: $archive holds:" >&2
    echo "$listed" >&2
    echo "and should hold exactly:" >&2
    echo "$expected" >&2
    exit 1
fi
echo "ok: $archive holds the binary, its licence and its README alone"
````

### File `packaging/harden-installer.py`

<!-- r1:file task=3 path=packaging/harden-installer.py sha256=b41b3debb91d61118feb33f0081c7450d61422a3f37929fb2bf52c0ba9d6c15a bytes=4752 mode=755 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Make cargo-dist's shell installer refuse to install what it cannot check.

The distribution spec (§2) asks the installer to refuse to continue when no
SHA-256 tool is available, rather than skipping the check. cargo-dist's
installer (0.30.4) skips it, with a message, in four places: no `sha256sum`,
no checksum for the archive, an archive with no checksum style, and a style
it does not know. Each is replaced by an error. Where `sha256sum` is missing,
`shasum -a 256` (macOS's, and Perl's) is tried before refusing. Every
replaced text must occur exactly once: a cargo-dist upgrade that changes the
installer fails this script, and so the build, instead of shipping an
installer that skips the check again.

Usage: harden-installer.py <path to hennery-installer.sh>  (edited in place)
"""

import sys

REFUSE_UNCHECKED = (
    'err "refusing to install an archive whose checksum cannot be checked; '
    'install sha256sum or shasum and run the installer again"'
)

REPLACEMENTS = [
    (
        '    case "$_checksum_style" in\n        sha256)',
        '    [ "$_checksum_style" = sha256 ] || ' + REFUSE_UNCHECKED + '\n'
        '    [ "${#_checksum_value}" = 64 ] || ' + REFUSE_UNCHECKED + '\n'
        '    case "$_checksum_value" in *[!0-9a-f]*) ' + REFUSE_UNCHECKED + ' ;; esac\n'
        '    case "$_checksum_style" in\n        sha256)',
    ),
    (
        '''        ensure mv "$_bin" "$_install_dir"
        # unzip seems to need this chmod
        ensure chmod +x "$_install_dir/$_bin_name"''',
        '''        # Refuse existing package-manager files, directories and dangling links.
        if [ -e "$_install_dir/$_bin_name" ] || [ -L "$_install_dir/$_bin_name" ]; then
            err "refusing to overwrite an existing installation; choose an empty user directory"
        fi
        local _stage
        _stage=$(mktemp -d "$_install_dir/.hennery-install.XXXXXX") || err "cannot stage installation"
        if ! cp "$_bin" "$_stage/$_bin_name" || ! chmod 0755 "$_stage/$_bin_name"; then
            rm -f "$_stage/$_bin_name"
            rmdir "$_stage"
            err "cannot prepare installation"
        fi
        # Target is the directory operand: link(2) atomically creates its
        # basename, refusing EEXIST, including a concurrently created link.
        if ! ln "$_stage/$_bin_name" "$_install_dir/"; then
            rm -f "$_stage/$_bin_name"
            rmdir "$_stage"
            err "refusing to overwrite an existing installation"
        fi
        rm -f "$_stage/$_bin_name"
        rmdir "$_stage"''',
    ),
    (
        # No `sha256sum`: `shasum`, else no SHA-256 tool at all.
        '''            if ! check_cmd sha256sum; then
                say "skipping sha256 checksum verification (it requires the 'sha256sum' command)"
                return 0
            fi
            _calculated_checksum="$(sha256sum -b "$_file" | awk '{printf $1}')"''',
        '''            if check_cmd sha256sum; then
                _calculated_checksum="$(sha256sum -b "$_file" | awk '{printf $1}')"
            elif check_cmd shasum; then
                _calculated_checksum="$(shasum -a 256 -b "$_file" | awk '{printf $1}')"
            else
                '''
        + REFUSE_UNCHECKED
        + '''
            fi''',
    ),
    (
        # A checksum style it does not know.
        '''        *)
            say "skipping unknown checksum style: $_checksum_style"
            return 0
            ;;''',
        '''        *)
            '''
        + REFUSE_UNCHECKED
        + '''
            ;;''',
    ),
    (
        # An empty checksum for the archive.
        '''    if [ -z "$_checksum_value" ]; then
        return 0
    fi''',
        '''    if [ -z "$_checksum_value" ]; then
        '''
        + REFUSE_UNCHECKED
        + '''
    fi''',
    ),
    (
        # An archive with no checksum at all.
        '''    else
        say "no checksums to verify"
    fi''',
        '''    else
        '''
        + REFUSE_UNCHECKED
        + '''
    fi''',
    ),
]


def harden(text: str) -> str:
    for old, new in REPLACEMENTS:
        count = text.count(old)
        if count != 1:
            raise SystemExit(
                f"harden-installer: expected one copy of this text, found {count}:\n{old}"
            )
        text = text.replace(old, new)
    return text


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        text = f.read()
    # Before the file is opened for writing: a failure leaves it as it was.
    hardened = harden(text)
    with open(path, "w", encoding="utf-8") as f:
        f.write(hardened)


if __name__ == "__main__":
    main()
````

### File `packaging/release/make_installer_fixture.py`

<!-- r1:file task=3 path=packaging/release/make_installer_fixture.py sha256=287513a295d833c6afd7abde7d1bd4768733086ffc3ccd1482727f751f4f0229 bytes=1692 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Use cargo-dist's real installer with tiny executable fixtures (no cross build).

This tests refusal and publication semantics, never native binary compatibility.
Native candidate installer jobs separately exercise the real release archives.
"""
import argparse
import io
from pathlib import Path
import tarfile

import gate


def make(pristine, output):
    output.mkdir(parents=True, exist_ok=False)
    text = pristine.read_text()
    for target in sorted(gate.TARGETS):
        name = 'hennery-' + target
        archive = output / (name + '.tar.xz')
        with tarfile.open(archive, 'w:xz') as tar:
            directory = tarfile.TarInfo(name + '/')
            directory.type = tarfile.DIRTYPE
            tar.addfile(directory)
            data = b'#!/bin/sh\necho "hennery installer-test fixture"\n'
            binary = tarfile.TarInfo(name + '/hennery')
            binary.mode, binary.size = 0o755, len(data)
            tar.addfile(binary, io.BytesIO(data))
        sha = gate.digest(archive.read_bytes())
        (output / (archive.name + '.sha256')).write_text(sha + '  ' + archive.name + '\n')
        anchor = '"' + archive.name + '")'
        gate.require(text.count(anchor) == 1, 'cargo-dist archive arm changed')
        text = text.replace(anchor, anchor + '\n            _checksum_style="sha256"\n            _checksum_value="' + sha + '"')
    (output / 'hennery-installer.sh').write_text(text)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pristine', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    make(args.pristine, args.output)
````

### File `packaging/release/test_archives.py`

<!-- r1:file task=3 path=packaging/release/test_archives.py sha256=76255fe9815669dc6dd81fbd0de9a2339d278233ddce2b9f7b71c486d33df9f9 bytes=3852 mode=644 encoding=utf8 -->
````python
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

import gate
import supply

ROOT = Path(__file__).resolve().parents[2]


class ArchivePolicy(unittest.TestCase):
    def test_release_requires_notices_and_refuses_extra_payload(self):
        for notices, extra, expected in [(True, False, 0), (False, False, 1), (True, True, 1)]:
            with self.subTest(notices=notices, extra=extra), tempfile.TemporaryDirectory() as tmp:
                archive = Path(tmp) / 'hennery-aarch64-apple-darwin.tar.xz'
                base = 'hennery-aarch64-apple-darwin'
                with tarfile.open(archive, 'w:xz') as tar:
                    directory = tarfile.TarInfo(base + '/')
                    directory.type = tarfile.DIRTYPE
                    tar.addfile(directory)
                    files = ['hennery', 'LICENSE', 'README.md']
                    if notices:
                        files.append('THIRD-PARTY-NOTICES.txt')
                    if extra:
                        files.append('unapproved-agent')
                    for name in files:
                        entry = tarfile.TarInfo(base + '/' + name)
                        entry.size = 1
                        tar.addfile(entry, io.BytesIO(b'x'))
                (Path(tmp) / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
                if expected:
                    with self.assertRaises(gate.Refused):
                        supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                else:
                    result = supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                    self.assertEqual(result['aarch64-apple-darwin']['sha256'], gate.digest(b'x'))
                    (Path(tmp) / (archive.name + '.sha256')).write_text('0' * 64 + '  ' + archive.name + '\n')
                    with self.assertRaises(gate.Refused):
                        supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])
                result = subprocess.run(['sh', str(ROOT / 'packaging/check-archive.sh'), str(archive), 'aarch64-apple-darwin', '--notices'],
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode, expected, result.stdout + result.stderr)


    def test_nonregular_and_duplicate_archive_members_refuse(self):
        for symlink, duplicate in [(True, False), (False, True)]:
            with self.subTest(symlink=symlink, duplicate=duplicate), tempfile.TemporaryDirectory() as tmp:
                base = 'hennery-aarch64-apple-darwin'
                archive = Path(tmp) / (base + '.tar.xz')
                with tarfile.open(archive, 'w:xz') as tar:
                    directory = tarfile.TarInfo(base + '/')
                    directory.type = tarfile.DIRTYPE
                    tar.addfile(directory)
                    names = ['LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.txt', 'hennery']
                    if duplicate:
                        names.append('LICENSE')
                    for name in names:
                        entry = tarfile.TarInfo(base + '/' + name)
                        if symlink and name == 'hennery':
                            entry.type, entry.linkname = tarfile.SYMTYPE, base + '/README.md'
                            tar.addfile(entry)
                        else:
                            entry.size = 1
                            tar.addfile(entry, io.BytesIO(b'x'))
                (Path(tmp) / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
                with self.assertRaises(gate.Refused):
                    supply.binary_inventory(Path(tmp), ['aarch64-apple-darwin'])


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/test_hardener.py`

<!-- r1:file task=3 path=packaging/release/test_hardener.py sha256=dfcc016fc8be1829d9209ed37e1195ccf0aacda3f9b6292eba690c2919902386 bytes=975 mode=644 encoding=utf8 -->
````python
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('hardener', Path(__file__).resolve().parents[1] / 'harden-installer.py')
hardener = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hardener)


class Hardener(unittest.TestCase):
    def test_all_anchors_are_required_once(self):
        pristine = '\n'.join(old for old, _ in hardener.REPLACEMENTS)
        result = hardener.harden(pristine)
        self.assertIn('ln "$_stage/$_bin_name" "$_install_dir/"', result)
        self.assertIn('[ "${#_checksum_value}" = 64 ]', result)
        for old, _ in hardener.REPLACEMENTS:
            with self.subTest(anchor=old[:60]):
                with self.assertRaises(SystemExit):
                    hardener.harden(pristine.replace(old, '', 1))
                with self.assertRaises(SystemExit):
                    hardener.harden(pristine + '\n' + old)


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/test-installer.sh`

<!-- r1:file task=3 path=packaging/test-installer.sh sha256=7a1004b69aa3f78133d5f70f2a11d14199709b96b3e0df96967229f590fe93bb bytes=10216 mode=755 encoding=utf8 -->
````sh
#!/bin/sh
# The hardened shell installer (distribution spec §2, §9), run against the
# archives of this build, served from a directory (`file://`):
#   - each archive of the build is offered, with its SHA-256 embedded;
#   - it installs a binary that runs, with `sha256sum` or with `shasum`;
#   - a checksum mismatch aborts, and installs nothing;
#   - no SHA-256 tool, an empty checksum, no checksum at all, or a checksum
#     style it does not know aborts, and installs nothing.
# HOME and XDG_CONFIG_HOME point into a scratch directory, so nothing outside
# it is written.
#
# Usage: test-installer.sh <directory holding hennery-installer.sh and every
# archive with its .sha256>
set -eu
# Either would install outside the scratch directory and make the "left a
# binary" checks vacuous.
unset HENNERY_INSTALL_DIR CARGO_DIST_FORCE_INSTALL_DIR

dist=$(cd "$1" && pwd)
installer="$dist/hennery-installer.sh"
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

# Every archive the installer offers has its checksum embedded, and it is the
# one cargo-dist wrote beside that archive.
arms=$(sed -n 's/^[[:space:]]*"\(hennery-.*\.tar\.xz\)")$/\1/p' "$installer")
[ -n "$arms" ] || fail "the installer offers no archive"
count=0
for archive in $arms; do
    sum="$dist/$archive.sha256"
    [ -f "$sum" ] || fail "the installer offers $archive, and this build has no $archive.sha256"
    want=$(cut -d ' ' -f 1 "$sum")
    case "$want" in
    *[!0-9a-f]* | "") fail "$sum holds no SHA-256" ;;
    esac
    [ "${#want}" = 64 ] || fail "$sum holds no SHA-256"
    # The installer's case for this archive, up to its `;;`.
    arm=$(awk -v name="\"$archive\")" '$1 == name { on = 1 } on { print } on && $1 == ";;" { exit }' "$installer")
    printf '%s\n' "$arm" | grep -qx '[[:space:]]*_checksum_style="sha256"' ||
        fail "the installer has no sha256 checksum for $archive"
    printf '%s\n' "$arm" | grep -qx "[[:space:]]*_checksum_value=\"$want\"" ||
        fail "the installer's checksum for $archive is not the archive's"
    count=$((count + 1))
done
built=0
for archive in "$dist"/*.tar.xz; do
    built=$((built + 1))
done
[ "$count" = "$built" ] || fail "the installer offers $count archives, this build made $built"
echo "ok: the installer embeds each of its $count archives' SHA-256"

# run_installer <download dir> <install dir> <log>: the installer's exit status.
run_installer() {
    mkdir -p "$scratch/home"
    status=0
    HOME="$scratch/home" XDG_CONFIG_HOME="$scratch/home/.config" \
        HENNERY_DOWNLOAD_URL="file://$1" HENNERY_UNMANAGED_INSTALL="$2" \
        sh "$1/hennery-installer.sh" >"$3" 2>&1 || status=$?
    return "$status"
}

# refused <name> <download dir> <message>: the installer, run on <download
# dir>, fails with <message> and leaves no binary.
refused() {
    if run_installer "$2" "$scratch/$1" "$scratch/$1.log"; then
        cat "$scratch/$1.log"
        fail "$1: installed"
    fi
    grep -q "$3" "$scratch/$1.log" || {
        cat "$scratch/$1.log"
        fail "$1: failed for another reason"
    }
    [ ! -e "$scratch/$1/hennery" ] || fail "$1: left a binary"
}

# tools <dir> <excluded>...: every command of /usr/bin and /bin but these.
tools() {
    dir=$1
    shift
    mkdir "$dir"
    for from in /usr/bin /bin; do
        for tool in "$from"/*; do
            name=$(basename "$tool")
            for excluded in "$@"; do
                [ "$name" = "$excluded" ] && continue 2
            done
            [ -e "$dir/$name" ] || ln -s "$tool" "$dir/$name"
        done
    done
}

# copy <name>: a download directory with the installer and the archives.
copy() {
    mkdir "$scratch/$1"
    cp "$installer" "$dist"/*.tar.xz "$scratch/$1/"
    echo "$scratch/$1"
}

UNCHECKED="refusing to install an archive whose checksum cannot be checked"

# A good install.
run_installer "$dist" "$scratch/good" "$scratch/good.log" || {
    cat "$scratch/good.log"
    fail "the installer failed on its own archives"
}
"$scratch/good/hennery" --version || fail "the installed binary does not run"
echo "ok: installs a binary that runs"

# With `shasum` and no `sha256sum`.
tools "$scratch/shasum-tools" sha256sum
# In a subshell: an assignment before a function call may outlive it.
(PATH="$scratch/shasum-tools" && run_installer "$dist" "$scratch/shasum" "$scratch/shasum.log") || {
    cat "$scratch/shasum.log"
    fail "the installer failed with shasum alone"
}
"$scratch/shasum/hennery" --version >/dev/null || fail "the binary installed with shasum does not run"
echo "ok: installs with shasum alone"

# A checksum mismatch: the same archives, one byte longer each.
tampered=$(copy tampered-download)
for archive in "$tampered"/*.tar.xz; do
    printf 'x' >>"$archive"
done
refused tampered "$tampered" "checksum mismatch"
echo "ok: a checksum mismatch aborts"

# No SHA-256 tool at all.
tools "$scratch/no-tools" sha256sum shasum
(PATH="$scratch/no-tools" && refused unchecked "$dist" "$UNCHECKED")
echo "ok: no SHA-256 tool aborts"

# An empty checksum.
empty=$(copy empty-download)
sed 's/^\([[:space:]]*_checksum_value=\)".*"$/\1""/' "$installer" >"$empty/hennery-installer.sh"
refused empty "$empty" "$UNCHECKED"
echo "ok: an empty checksum aborts"

# No checksum at all.
none=$(copy none-download)
grep -v '^[[:space:]]*_checksum_style=' "$installer" >"$none/hennery-installer.sh"
refused none "$none" "$UNCHECKED"
echo "ok: no checksum aborts"

# A checksum style the installer does not know.
unknown=$(copy unknown-download)
sed 's/^\([[:space:]]*_checksum_style=\)"sha256"$/\1"md5"/' "$installer" >"$unknown/hennery-installer.sh"
refused unknown "$unknown" "$UNCHECKED"
echo "ok: an unknown checksum style aborts"

# Existing installs are explicit operator choices. Never replace any of them.
mkdir -p "$scratch/existing" "$scratch/link" "$scratch/dangling" "$scratch/directory/hennery"
printf 'owned by another package manager\n' > "$scratch/existing/hennery"
cp "$scratch/existing/hennery" "$scratch/sentinel"
ln -s "$scratch/sentinel" "$scratch/link/hennery"
ln -s "$scratch/absent-target" "$scratch/dangling/hennery"
for kind in existing link dangling directory; do
    if run_installer "$dist" "$scratch/$kind" "$scratch/$kind.log"; then
        fail "$kind: replaced an existing installation"
    fi
    grep -q 'refusing to overwrite' "$scratch/$kind.log" || fail "$kind: wrong refusal"
done
cmp "$scratch/existing/hennery" "$scratch/sentinel" || fail 'existing install changed'
[ -L "$scratch/link/hennery" ] || fail 'package-manager symlink changed'
[ -L "$scratch/dangling/hennery" ] || fail 'dangling symlink changed'
[ -d "$scratch/directory/hennery" ] || fail 'directory changed'
echo 'ok: existing files, symlinks and directories survive'

# Missing download: no destination is published.
missing=$(copy missing-download)
for archive in "$missing"/*.tar.xz; do
    rm "$archive"
done
if run_installer "$missing" "$scratch/missing" "$scratch/missing.log"; then
    fail 'missing download installed'
fi
[ ! -e "$scratch/missing/hennery" ] || fail 'missing download left a binary'
echo 'ok: failed download leaves no binary'

# Known non-SHA256 algorithms and malformed values must not enter skip paths.
sha512=$(copy sha512-download)
sed 's/^\([[:space:]]*_checksum_style=\)"sha256"$/\1"sha512"/' "$installer" > "$sha512/hennery-installer.sh"
refused sha512 "$sha512" "$UNCHECKED"
malformed=$(copy malformed-download)
sed 's/^\([[:space:]]*_checksum_value=\)".*"$/\1"not-a-digest"/' "$installer" > "$malformed/hennery-installer.sh"
refused malformed "$malformed" "$UNCHECKED"
echo 'ok: non-SHA256 and malformed digest abort'

# Copy and chmod fail before the executable becomes visible. The installer
# uses a private sibling directory, then an exclusive hard link into install dir.
for command in cp chmod ln; do
    tool_dir="$scratch/failing-$command-tools"
    tools "$tool_dir" "$command"
    cat > "$tool_dir/$command" <<'TOOL'
#!/bin/sh
exit 1
TOOL
    chmod +x "$tool_dir/$command"
    (PATH="$tool_dir" && ! run_installer "$dist" "$scratch/failing-$command" "$scratch/failing-$command.log") ||
        fail "$command failure installed"
    [ ! -e "$scratch/failing-$command/hennery" ] || fail "$command failure published an executable"
done
echo 'ok: copy, chmod and publication failures leave no executable'

# Unsupported OS and CPU each refuse before installation.
real_uname=$(command -v uname)
for kind in os cpu; do
    tool_dir="$scratch/unsupported-$kind-tools"
    tools "$tool_dir" uname
    cat > "$tool_dir/uname" <<TOOL
#!/bin/sh
if [ '$kind' = os ]; then echo UnsupportedOS; exit 0; fi
if [ "\${1:-}" = -m ]; then echo unsupported-cpu; exit 0; fi
exec '$real_uname' "\$@"
TOOL
    chmod +x "$tool_dir/uname"
    (PATH="$tool_dir" && ! run_installer "$dist" "$scratch/unsupported-$kind" "$scratch/unsupported-$kind.log") ||
        fail "unsupported $kind installed"
    [ ! -e "$scratch/unsupported-$kind/hennery" ] || fail "unsupported $kind left a binary"
done
echo 'ok: unsupported OS and CPU abort'

# The copy runs while the final pathname is absent, and a destination raced
# into existence after the initial check is never replaced.
real_cp=$(command -v cp)
real_ln=$(command -v ln)
tools "$scratch/observe-copy-tools" cp
cat > "$scratch/observe-copy-tools/cp" <<TOOL
#!/bin/sh
[ ! -e "\$HENNERY_UNMANAGED_INSTALL/hennery" ] || exit 1
printf observed > '$scratch/copy-observed'
exec '$real_cp' "\$@"
TOOL
chmod +x "$scratch/observe-copy-tools/cp"
(PATH="$scratch/observe-copy-tools" && run_installer "$dist" "$scratch/observe-copy" "$scratch/observe-copy.log") || fail 'staged copy failed'
[ -f "$scratch/copy-observed" ] || fail 'the installer did not stage the copy'
tools "$scratch/raced-tools" ln
cat > "$scratch/raced-tools/ln" <<TOOL
#!/bin/sh
printf raced > "\$HENNERY_UNMANAGED_INSTALL/hennery"
exec '$real_ln' "\$@"
TOOL
chmod +x "$scratch/raced-tools/ln"
(PATH="$scratch/raced-tools" && ! run_installer "$dist" "$scratch/raced" "$scratch/raced.log") || fail 'concurrent destination was replaced'
[ "$(cat "$scratch/raced/hennery")" = raced ] || fail 'concurrent destination changed'
echo 'ok: staging is invisible and concurrent destinations survive'
````

### Step 3: GREEN / verification

```sh
nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_hardener.py
nix shell nixpkgs#python3 -c python3 -m unittest discover -s packaging/release -p test_archives.py
```

The installer fixture commands are exactly the `cargo-dist's actual installer with tiny shell executables` step in release-tests.yml (Task 4). It uses fresh output directories. Run those before committing installer changes. Actual native archives are tested in the candidate workflow, not fabricated by the fixtures.

### Step 4: Commit / handoff

Inspect `git diff --check` and the staged stat, commit with `git -c commit.gpgsign=false commit`, verify `git log --format='%ae' origin/main..HEAD`, and push only `plan/dist-r1` over SSH. Report the review request to the parent; no self-approval and no GitHub actions.


## Task 4: Pinned candidate, publication boundaries and immutable flake

### Step 1: RED / contract

Install workflow tests before workflow_policy.py/workflows. The build saw the missing module RED. Then require all offline tests and actionlint GREEN, without executing the publishing workflow.

### Step 2: Exact implementation

### File `.github/workflows/nix.yml`

<!-- r1:file task=4 path=.github/workflows/nix.yml sha256=928d49b2a1205e369130621fb89695f0b2a757ef4978092d0bc982b99a69859e bytes=2006 mode=644 encoding=utf8 -->
````yaml
# The Nix flake (distribution spec §4.3, §9; plan 7e-i): `nix flake check`
# builds the package and runs clippy, rustfmt and cargo-audit through crane,
# on Linux and on macOS, and the package's binary runs. Nothing is pushed to
# a binary cache: that would publish. The tests stay `ci.yml`'s.
#
# The Nix installer is pinned by commit. The job's own read-only token goes
# to Nix only to fetch the locked GitHub inputs without hitting the
# anonymous API rate limit that shared runners share.
name: nix

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  # A pull request's superseded run is cancelled. Outside pull requests
  # (pushes to main, manual runs) every commit is a group of its own: a
  # shared group would let a newer pending run replace an older one even
  # without cancel-in-progress, so no run there is ever cancelled.
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  flake:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.os }}
    # A cold build takes about 9 minutes; a hung one should not run for hours.
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Flake checks (package, clippy, rustfmt, cargo-audit)
        run: nix flake check -L
      - name: The package runs
        run: nix run . -- --version
      # The README's nix block (plan 4f), run as written.
      - name: The README's nix block
        run: |
          sh packaging/readme-blocks.sh README.md nix > "$RUNNER_TEMP/nix.sh"
          sh -eux "$RUNNER_TEMP/nix.sh"
````

### File `.github/workflows/release-candidate.yml`

<!-- r1:file task=4 path=.github/workflows/release-candidate.yml sha256=ecffb8ddfd69ef0963cd4cb14ef905b5f1f5540fd612054e858c33c042277b2e bytes=12238 mode=644 encoding=utf8 -->
````yaml
name: release-candidate
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      tag:
        description: Annotated approved release tag; candidate creation only
        required: true
        type: string
      channels:
        description: Comma-separated channels; first alpha is github only
        default: github
        required: true
        type: string
permissions:
  contents: read
concurrency:
  group: release-candidate-${{ github.event.inputs.tag || github.ref }}-${{ github.run_id }}
  cancel-in-progress: false
jobs:
  web-ui:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Build the UI once from the pinned lock
        run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: release-ui
          retention-days: 90
          if-no-files-found: error
          path: web/dist/
  archive:
    needs: web-ui
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-unknown-linux-musl
            runner: ubuntu-24.04
            image: amd64
          - target: aarch64-unknown-linux-musl
            runner: ubuntu-24.04-arm
            image: arm64
          - target: aarch64-apple-darwin
            runner: macos-15
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - name: Annotated tag, exact source and workspace version
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
        run: |
          test "$(git cat-file -t "$RELEASE_TAG")" = tag
          source_sha=$(git rev-parse "$RELEASE_TAG^{commit}")
          test "$source_sha" = "$(git rev-parse HEAD)"
          echo "RELEASE_SOURCE_SHA=$source_sha" >> "$GITHUB_ENV"
          python3 -c 'import os,tomllib; from pathlib import Path; v=tomllib.loads(Path("Cargo.toml").read_text())["workspace"]["package"]["version"]; assert os.environ["RELEASE_TAG"] == "v"+v'
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
          targets: ${{ matrix.target }}
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Native build tools
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: release-ui
          path: web/dist/
      - name: Pinned dist and source and licence inputs
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web licenses list --json > frontend-licences.json'
          cargo metadata --locked --all-features --filter-platform '${{ matrix.target }}' --format-version=1 > cargo-metadata.json
          nix develop .#release -c python3 packaging/release/supply.py materials --output release-materials \
            --source-sha "$RELEASE_SOURCE_SHA" --target '${{ matrix.target }}' \
            --cargo-metadata cargo-metadata.json --frontend-licences frontend-licences.json
      - name: Current advisory databases; findings stop candidate creation
        run: |
          nix develop .#release -c cargo-audit audit --file Cargo.lock --db "$RUNNER_TEMP/release-advisories" --json > release-materials/rust-advisories.json
          git -C "$RUNNER_TEMP/release-advisories" rev-parse HEAD > release-materials/rust-advisory-revision.txt
          nix develop .#web -c pnpm --dir web audit --json > release-materials/web-advisories.json
      - name: Build fresh final archive with notices
        env:
          HENNERY_WEB_REQUIRE: '1'
        run: |
          python3 - <<'PY' >> "$GITHUB_ENV"
          import json
          i=json.load(open('release-materials/build-identity.json'))
          for key, field in [('HENNERY_BUILD_SOURCE_SHA','source_sha'),('HENNERY_BUILD_UI_SHA256','ui_sha256'),('HENNERY_BUILD_MANIFEST_SHA256','adapter_manifest_sha256')]:
              print(key+'='+i[field])
          PY
      - name: Archive and content acceptance
        env:
          HENNERY_WEB_REQUIRE: '1'
        run: |
          dist build --artifacts=local --target='${{ matrix.target }}' --print=linkage --output-format=json > target-manifest.json
          archive='hennery-${{ matrix.target }}'
          mkdir -p unpacked
          tar -xJf "target/distrib/$archive.tar.xz" -C unpacked
          cp release-materials/THIRD-PARTY-NOTICES.txt "unpacked/$archive/"
          tar -cJf "target/distrib/$archive.tar.xz" -C unpacked "$archive"
          (cd target/distrib && shasum -a 256 "$archive.tar.xz" > "$archive.tar.xz.sha256")
          sh packaging/check-archive.sh "target/distrib/$archive.tar.xz" '${{ matrix.target }}' --notices
          binary="$PWD/unpacked/$archive/hennery"
          sh packaging/check-linkage.sh "$binary"
          sh packaging/check-web-ui.sh "$binary"
          "$binary" --version
          cp target-manifest.json 'target/distrib/${{ matrix.target }}-dist-manifest.json'
          python3 packaging/release/refresh_manifest.py 'target/distrib/${{ matrix.target }}-dist-manifest.json' "target/distrib/$archive.tar.xz"
          cp release-materials/* target/distrib/
          python3 - <<'PY' > target/distrib/builder.json
          import json,os,platform,subprocess
          print(json.dumps({'os':platform.platform(),'runner_image':os.environ.get('ImageVersion'),'rust':subprocess.check_output(['rustc','-vV'],text=True),'sdk':subprocess.getoutput('xcrun --show-sdk-version') if platform.system()=='Darwin' else subprocess.getoutput('ldd --version')}))
          PY
      - name: Alpine executable and collector image smoke
        if: runner.os == 'Linux'
        env:
          IMAGE_ARCH: ${{ matrix.image }}
          TARGET: ${{ matrix.target }}
        run: |
          binary="$PWD/unpacked/hennery-$TARGET/hennery"
          docker run --rm -v "$binary:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
          mkdir -p "dist/linux-$IMAGE_ARCH"
          cp "$binary" "dist/linux-$IMAGE_ARCH/hennery"
          docker build -t hennery-collector:candidate .
          sh packaging/smoke-image.sh hennery-collector:candidate
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: candidate-${{ matrix.target }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  assemble:
    needs: archive
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: candidate-*
          path: candidates
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Assemble global inputs; never silently merge conflicting materials
        env:
          RELEASE_TAG: ${{ github.event.inputs.tag || github.ref_name }}
          RELEASE_CHANNELS: ${{ github.event.inputs.channels || 'github' }}
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
          python3 packaging/release/assemble.py candidates target/distrib
          "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global --output-format=json > target/distrib/dist-manifest.json
          python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
          sh packaging/test-installer.sh target/distrib
          sh packaging/check-formula.sh target/distrib
          git show HEAD:CHANGELOG.md > target/distrib/release-notes.md
          git archive --format=tar --prefix=hennery-source/ HEAD | xz > target/distrib/hennery-source.tar.xz
          python3 packaging/release/supply.py freeze --output target/distrib \
            --source-sha "$(git rev-parse HEAD)" --tag "$RELEASE_TAG" --channels "$RELEASE_CHANNELS" \
            --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT" > inventory-sha256.txt
          cat inventory-sha256.txt >> "$GITHUB_STEP_SUMMARY"
          echo 'Candidate still needs Object Lock retention and channel acceptance before approval.' >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: target/distrib/
  installer:
    needs: assemble
    strategy:
      fail-fast: false
      matrix:
        runner: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Native installer positives and refusals
        run: sh packaging/test-installer.sh candidate
  retain:
    needs: [assemble, installer]
    if: vars.RELEASE_CANDIDATE_STORAGE_ENABLED == 'true'
    environment: release-staging
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: frozen-candidate-${{ github.run_id }}-${{ github.run_attempt }}
          path: candidate
      - name: Retain exact versions under compliance retention and legal hold
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_STAGE_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          inventory=$(sha256sum candidate/release-inventory.json | cut -d' ' -f1)
          nix develop .#release -c python3 packaging/release/retention.py stage \
            --candidate candidate --bucket "$RELEASE_BUCKET" --inventory-sha256 "$inventory" --receipt retention-receipt.json
          echo "Held candidate inventory: $inventory" >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: retention-receipt-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: retention-receipt.json
````

### File `.github/workflows/release-publish.yml`

<!-- r1:file task=4 path=.github/workflows/release-publish.yml sha256=d569470496091086487dd4c442d2c980aefae2892f06ae47d13e238f935f9005 bytes=12457 mode=644 encoding=utf8 -->
````yaml
name: release-publish
run-name: Release inventory ${{ inputs.inventory_sha256 }} from ${{ inputs.tag }}
on:
  workflow_dispatch:
    inputs:
      inventory_sha256:
        description: Frozen candidate inventory SHA-256
        required: true
        type: string
      source_sha:
        description: Exact qualified source commit
        required: true
        type: string
      tag:
        description: Protected annotated release tag
        required: true
        type: string
      channels:
        description: Approved sorted JSON channel array
        required: true
        type: string
      targets:
        description: Approved sorted JSON target array
        required: true
        type: string
      candidate:
        description: JSON candidate run_id and run_attempt
        required: true
        type: string
      retention_receipt_version:
        description: Exact S3 version of the held retention receipt
        required: true
        type: string
permissions:
  contents: read
  actions: read
concurrency:
  group: release-publish-${{ inputs.tag }}
  cancel-in-progress: false
jobs:
  approval-tuple:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - name: Display exact approval binding for this run attempt
        run: python3 packaging/release/approval_summary.py
  authorize:
    needs: approval-tuple
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
    outputs:
      run_attempt: ${{ steps.authorized.outputs.run_attempt }}
      inventory_sha256: ${{ steps.authorized.outputs.inventory_sha256 }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      # AWS read access is restricted to held candidate versions; it conveys
      # no registry/release authority. No write token is given to candidate code.
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ secrets.RELEASE_POLICY_READ_TOKEN || github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: authorize-preflight.json
      - name: Publish the validated credential-issuance binding
        id: authorized
        env:
          INVENTORY: ${{ inputs.inventory_sha256 }}
        run: |
          echo "run_attempt=$GITHUB_RUN_ATTEMPT" >> "$GITHUB_OUTPUT"
          echo "inventory_sha256=$INVENTORY" >> "$GITHUB_OUTPUT"
  sign:
    needs: authorize
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main' && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256
    environment:
      name: release
      url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      # AWS read access is restricted to held candidate versions; it conveys
      # no registry/release authority. No write token is given to candidate code.
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ secrets.RELEASE_POLICY_READ_TOKEN || github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: sign-preflight.json
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ secrets.RELEASE_POLICY_READ_TOKEN || github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: boundary
          receipt: sign-boundary.json
      - name: Attest final bytes, including signed inventory and SPDX files
        id: attest
        uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be # v2.4.0
        with:
          subject-path: candidate/*
      - name: Preserve downloadable Sigstore bundle and approval receipts
        run: |
          mkdir signatures
          cp '${{ steps.attest.outputs.bundle-path }}' signatures/release.sigstore.jsonl
          cp sign-preflight.json sign-boundary.json retention-receipt.json signatures/
          nix develop .#release -c python3 - <<'PY'
          import os,sys
          from pathlib import Path
          sys.path.insert(0,'packaging/release')
          import retention
          retention.audit(Path('signatures/release.sigstore.jsonl'), os.environ['RELEASE_AUDIT_BUCKET'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
          PY
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: signatures/
  github:
    needs: [sign, authorize]
    if: vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main' && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256 && vars.RELEASE_GITHUB_ENABLED == 'true'
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      RELEASE_AUDIT_BUCKET: ${{ vars.RELEASE_AUDIT_BUCKET }}
      AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_AUDIT_WRITE_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_AUDIT_WRITE_KEY }}
      AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
    permissions:
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Fetch exact held candidate
        env:
          RELEASE_BUCKET: ${{ vars.RELEASE_CANDIDATE_BUCKET }}
          INVENTORY: ${{ inputs.inventory_sha256 }}
          RECEIPT_VERSION: ${{ inputs.retention_receipt_version }}
          AWS_ACCESS_KEY_ID: ${{ secrets.RELEASE_CANDIDATE_READ_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RELEASE_CANDIDATE_READ_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.RELEASE_CANDIDATE_REGION }}
        run: |
          nix develop .#release -c aws s3api get-object --bucket "$RELEASE_BUCKET" --key "candidates/$INVENTORY/retention-receipt.json" --version-id "$RECEIPT_VERSION" retention-receipt.json
          nix develop .#release -c python3 packaging/release/retention.py fetch --candidate candidate --inventory-sha256 "$INVENTORY" --receipt retention-receipt.json
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: signatures-${{ github.run_id }}-${{ github.run_attempt }}
          path: signatures
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ secrets.RELEASE_POLICY_READ_TOKEN || github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: preflight
          receipt: publish-preflight.json
      - name: Reconcile every existing remote byte before any upload
        env:
          GH_TOKEN: ${{ secrets.RELEASE_POLICY_READ_TOKEN || github.token }}
        run: nix develop .#release -c python3 packaging/release/publish.py reconcile --candidate candidate --signatures signatures --output reconciliation.json
      - name: Obtain short-lived publication authority after preflight
        id: publication-token
        uses: actions/create-github-app-token@67018539274d69449ef7c02e8e71183d1719ab42 # v2.1.4
        with:
          app-id: ${{ vars.RELEASE_PUBLISH_APP_ID }}
          private-key: ${{ secrets.RELEASE_PUBLISH_APP_KEY }}
          owner: ${{ github.repository_owner }}
          repositories: hennery
          permission-contents: write
          permission-actions: read
          permission-administration: read
      - uses: ./.github/actions/release-gate
        env:
          GH_TOKEN: ${{ secrets.RELEASE_POLICY_READ_TOKEN || github.token }}
        with:
          candidate: candidate
          inventory-sha256: ${{ inputs.inventory_sha256 }}
          channel: github
          phase: boundary
          receipt: publish-boundary.json
      - name: Publish only verified missing bytes; verify upload responses by fetch/hash
        env:
          GH_TOKEN: ${{ steps.publication-token.outputs.token }}
          RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        run: nix develop .#release -c python3 packaging/release/publish.py upload --candidate candidate --signatures signatures --output public-path.json
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: always()
        with:
          name: publication-audit-${{ github.run_id }}-${{ github.run_attempt }}
          retention-days: 90
          if-no-files-found: error
          path: |
            publish-preflight.json
            publish-boundary.json
            reconciliation.json
            public-path.json
````

### File `.github/workflows/release-tests.yml`

<!-- r1:file task=4 path=.github/workflows/release-tests.yml sha256=5b5863ddecdeef7d209c16aa2fd4a474f2ed1d105f258ff5d8b41e9779195bb6 bytes=1629 mode=644 encoding=utf8 -->
````yaml
name: release-tests
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  refusal-tests:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, ubuntu-24.04-arm, macos-15]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Negative gates, recovery, supply chain and workflow graph
        run: nix develop .#release -c python3 -m unittest discover -s packaging/release -p 'test_*.py'
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: 1.98.1
      - name: cargo-dist's actual installer with tiny shell executables
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global
          python3 packaging/release/make_installer_fixture.py target/distrib/hennery-installer.sh "$RUNNER_TEMP/installer-fixture"
          python3 packaging/harden-installer.py "$RUNNER_TEMP/installer-fixture/hennery-installer.sh"
          sh packaging/test-installer.sh "$RUNNER_TEMP/installer-fixture"
      - name: Actionlint
        run: nix develop .#release -c actionlint .github/workflows/release-candidate.yml .github/workflows/release-publish.yml .github/workflows/release-tests.yml
````

### File `dist-workspace.toml`

<!-- r1:file task=4 path=dist-workspace.toml sha256=fca2e436b5f9def38014adca5f55e8ab8aa20008f6e124812f516175ac3f1377 bytes=1064 mode=644 encoding=utf8 -->
````toml
# cargo-dist (distribution spec §2). `build` is qualification only; R1's
# `release-candidate` rebuilds fresh, and `release-publish` is manual,
# protected and disabled by default. Nothing is authorized by a tag alone.
# Do not replace the explicit gates with `dist generate`'s automatic tag
# publisher. `allow-dirty = ["ci"]` permits these custom workflows instead
# of requiring the stock generated release.yml.
[workspace]
members = ["cargo:."]

[dist]
cargo-dist-version = "0.30.4"
ci = "github"
allow-dirty = ["ci"]
# Linux musl-static for both architectures, macOS arm64 (distribution §1).
targets = ["aarch64-apple-darwin", "aarch64-unknown-linux-musl", "x86_64-unknown-linux-musl"]
# OpenSSL built in, not linked from the system (distribution §1.1).
features = ["vendored-openssl"]
# Only the `hennery` package, so the feature applies to the crate that has it.
precise-builds = true
checksum = "sha256"
installers = ["shell", "homebrew"]
tap = "marcinwadon/homebrew-tap"
install-path = "~/.local/bin"
install-updater = false
github-attestations = true
````

### File `flake.nix`

<!-- r1:file task=4 path=flake.nix sha256=47fd30b55a7c756c1533ee35cfdddf760058e212c14a9a101befcee625e554d9 bytes=3291 mode=644 encoding=utf8 -->
````nix
{
  description = "hennery: self-hosted cockpit for ACP coding agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # The web UI's tools (plan 4b): Node, pnpm and Playwright's browsers,
    # pinned apart from the Rust side, so a bump of either never drags the
    # other along. `@playwright/test` in web/package.json must be exactly
    # this nixpkgs' `playwright-driver` version.
    nixpkgs-web.url = "github:NixOS/nixpkgs/e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa";
    flake-utils.url = "github:numtide/flake-utils";
    # The package and its checks (plan 7e-i, distribution spec §4.3).
    crane.url = "github:ipetkov/crane/v0.24.0";
    advisory-db = {
      url = "github:rustsec/advisory-db";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, nixpkgs-web, flake-utils, crane, advisory-db, ... }:
    # The v1 platforms (distribution spec §1): Intel Macs are not one.
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
        web = import nixpkgs-web { inherit system; };
        # The web UI (plan 7e-ii-b), built with nixpkgs-web's Node and pnpm.
        webUi = import ./nix/web.nix { pkgs = web; };
        hennery = import ./nix/package.nix {
          inherit pkgs crane advisory-db webUi;
          sourceRevision = self.rev or "unrecorded (dirty source)";
        };
        # Chromium alone (headless): what the browser checks run on.
        browsers = web.playwright-driver.browsers.override {
          withChromium = false;
          withChromiumHeadlessShell = true;
          withFirefox = false;
          withWebkit = false;
          withFfmpeg = false;
        };
        # The pnpm the web build is pinned to (`nix/web.nix`).
        webTools = [ web.nodejs_24 webUi.pnpm ];
      in {
        packages.default = hennery.package;
        packages.web = webUi;
        checks = hennery.checks;
        # Building the web UI only (CI's Rust and release jobs): no browsers.
        devShells.web = pkgs.mkShell { packages = webTools; };
        # Offline release-policy tests and Object Lock staging tools, pinned
        # by flake.lock. Publication credentials are never supplied here.
        devShells.release = pkgs.mkShell {
          packages = [
            (pkgs.python3.withPackages (ps: [ ps.pyyaml ]))
            pkgs.actionlint
            pkgs.cargo-audit
            pkgs.awscli2
            pkgs.gh
          ];
        };
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            cargo
            rustc
            clippy
            rustfmt
            rust-analyzer
            sqlite
            # `webauthn-rs` links OpenSSL (plan 3c).
            openssl
            pkg-config
            # The PATH-capture tests run each login shell (plan 7c).
            bashInteractive
            zsh
            fish
          ] ++ webTools;
          RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";
          # Playwright uses the flake's browsers, never a download of its own.
          PLAYWRIGHT_BROWSERS_PATH = "${browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
        };
      });
}
````

### File `nix/package.nix`

<!-- r1:file task=4 path=nix/package.nix sha256=2ab9c37a32197a25ab632e9c8333291dd6b3b423055844f5e7f00caa2353e52e bytes=4100 mode=644 encoding=utf8 -->
````nix
# The `hennery` package and its flake checks (plan 7e-i, distribution spec
# §4.3), built with crane on nixpkgs' own Rust toolchain: the one the dev
# shell has, so `nix flake check` and the dev shell's `cargo clippy` agree.
# OpenSSL is nixpkgs', not the release build's vendored copy: a Nix build
# links its dependencies from the store.
{ pkgs, crane, advisory-db, webUi, sourceRevision ? "unrecorded (development build)" }:
let
  inherit (pkgs) lib stdenv;
  craneLib = crane.mkLib pkgs;
  workspace = (builtins.fromTOML (builtins.readFile ../Cargo.toml)).workspace.package;
  # Only what cargo reads: the crates, the manifests and the lock, and the
  # files a crate compiles in with `include_str!`. The adapter manifest
  # (`adapters/manifest.json`, distribution spec §3.1) is named once it
  # exists, so the build does not depend on which plan lands first.
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      (craneLib.fileset.commonCargoSources ../.)
      (lib.fileset.maybeMissing ../adapters/manifest.json)
    ];
  };
  common = {
    inherit src;
    strictDeps = true;
    pname = "hennery";
    inherit (workspace) version;
    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [ pkgs.openssl ] ++ lib.optionals stdenv.hostPlatform.isDarwin [ pkgs.libiconv ];
  };
  # Every dependency of the workspace, built once and shared by the package
  # and the checks.
  cargoArtifacts = craneLib.buildDepsOnly common;
  package = craneLib.buildPackage (
    common
    // {
      inherit cargoArtifacts;
      cargoExtraArgs = "--locked -p hennery";
      # The web UI's build (`nix/web.nix`, plan 7e-ii-b), embedded by the
      # kernel's build script. Without it the build fails rather than embed
      # the placeholder page. The checks below build without it.
      HENNERY_WEB_DIST = "${webUi}";
      HENNERY_WEB_REQUIRE = "1";
      HENNERY_BUILD_SOURCE_SHA = sourceRevision;
      nativeBuildInputs = common.nativeBuildInputs ++ [ pkgs.python3 ];
      # The same tree digest as R1's candidate metadata, with no run-time
      # reference to Python or the UI derivation left in the executable.
      preBuild = ''
        export HENNERY_BUILD_UI_SHA256="$(${pkgs.python3}/bin/python3 - '${webUi}' <<'PY'
        import hashlib, json, pathlib, sys
        root = pathlib.Path(sys.argv[1])
        files = [{'name': str(p.relative_to(root)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                 for p in sorted(root.rglob('*')) if p.is_file()]
        raw = (json.dumps(files, sort_keys=True, separators=(',', ':'), ensure_ascii=True) + '\n').encode()
        print(hashlib.sha256(raw).hexdigest())
        PY
        )"
        export HENNERY_BUILD_MANIFEST_SHA256="$(sha256sum ${src}/adapters/manifest.json | cut -d' ' -f1)"
      '';
      # The UI is in the binary, so the package never needs it at run time.
      disallowedReferences = [ webUi ];
      # The tests run in CI's own jobs (`ci.yml`): they spawn processes and
      # bind loopback ports, which a build sandbox does not promise.
      doCheck = false;
      meta = {
        description = "Self-hosted cockpit for ACP coding agents";
        license = lib.licenses.agpl3Only;
        mainProgram = "hennery";
        # The v1 platforms (distribution spec §1).
        platforms = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
      };
    }
  );
in
{
  inherit package;
  checks = {
    inherit package;
    clippy = craneLib.cargoClippy (
      common
      // {
        inherit cargoArtifacts;
        cargoClippyExtraArgs = "--workspace --all-targets -- -D warnings";
      }
    );
    # The binary embeds the web UI, not the placeholder: the release
    # archives' own check (plan 4b), run on the Nix-built binary.
    web-ui = pkgs.runCommand "hennery-web-ui-check" { } ''
      sh ${../packaging/check-web-ui.sh} ${lib.getExe package}
      touch "$out"
    '';
    fmt = craneLib.cargoFmt { inherit (common) src pname version; };
    audit = craneLib.cargoAudit { inherit (common) src pname version; inherit advisory-db; };
  };
}
````

### File `packaging/release/approval_summary.py`

<!-- r1:file task=4 path=packaging/release/approval_summary.py sha256=7d7de418763bca8460ee6a148423f546a496ad437d636436dae9e029b4c1d193 bytes=877 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Print the immutable dispatch tuple before the environment reviewer decides."""
import json
import os
from pathlib import Path

import gate

inputs = gate.strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())['inputs']
context = {key: inputs[key] for key in ('source_sha', 'tag', 'inventory_sha256')}
context.update({key: gate.strict_json(inputs[key]) for key in ('channels', 'targets', 'candidate')})
context.update(repository=gate.REPOSITORY, publishing={'run_id': int(os.environ['GITHUB_RUN_ID']), 'run_attempt': int(os.environ['GITHUB_RUN_ATTEMPT'])})
with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
    output.write('Approve this tuple only after candidate and channel acceptance.\n\n```json\n' + json.dumps(context, sort_keys=True, indent=2) + '\n```\n\nEnvironment review comment:\n\n`' + gate.challenge(context) + '`\n')
````

### File `packaging/release/assemble.py`

<!-- r1:file task=4 path=packaging/release/assemble.py sha256=19d97da19ffd8ffa77e9c3f206c4a5152400a818c9b63da4bb49cd53148e2551 bytes=1962 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Merge native material without last-writer-wins artifact replacement."""
import argparse
from pathlib import Path
import shutil

import gate


def assemble(candidates, output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    notices, findings = [], []
    expected = {'candidate-' + t for t in gate.TARGETS}
    gate.require({p.name for p in Path(candidates).iterdir()} == expected, 'native candidate target set incomplete')
    for directory in sorted(Path(candidates).iterdir()):
        target = directory.name.removeprefix('candidate-')
        for path in sorted(directory.iterdir()):
            name = path.name
            gate.require(path.is_file() and not path.is_symlink(), 'nonregular native material')
            if name == 'THIRD-PARTY-NOTICES.txt':
                notices.append(f'\n===== {target} =====\n' + path.read_text())
                continue
            if name == 'licence-findings.json':
                findings.extend(gate.strict_json(path.read_bytes())['findings'])
                continue
            if name in ('builder.json', 'third-party-source.tar.xz', 'rust-advisories.json', 'rust-advisory-revision.txt', 'web-advisories.json'):
                name = target + '-' + name
            destination = output / name
            if destination.exists():
                gate.require(destination.read_bytes() == path.read_bytes(), f'conflicting candidate material: {name}')
            else:
                shutil.copyfile(path, destination)
    (output / 'THIRD-PARTY-NOTICES.txt').write_text(''.join(notices))
    (output / 'licence-findings.json').write_bytes(gate.canonical({'findings': sorted(set(findings))}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidates', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    assemble(args.candidates, args.output)
````

### File `packaging/release/publish.py`

<!-- r1:file task=4 path=packaging/release/publish.py sha256=007e236eae70ed28a0b3dd58e2b0591b7178371882a4f5d7d7ac495eb1aba4c9 bytes=9737 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""GitHub channel reconciliation/upload. Never overwrites or rebuilds payloads.

Only called by the protected manual workflow after live validation. This module
has no side effects on import; offline tests replace the transport entirely.
"""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

import gate


def require_enabled():
    gate.require(os.environ.get('RELEASE_PUBLICATION_ENABLED') == 'true', 'publication is disabled')


def api(path, method='GET', data=None, content_type='application/json', binary=False):
    gate.require(path.startswith('/repos/' + gate.REPOSITORY + '/') and '..' not in path, 'invalid publication API path')
    host = 'https://uploads.github.com' if method == 'POST' and '/assets?' in path else 'https://api.github.com'
    request = urllib.request.Request(host + path, method=method, data=data,
                                     headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Content-Type': content_type,
                                              'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json',
                                              'X-GitHub-Api-Version': '2022-11-28'})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
            body = response.read()
            return body if binary else gate.strict_json(body)
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == 'GET' and not binary:
            return None
        if error.code in (301, 302, 303, 307, 308) and method == 'GET' and binary:
            location = error.headers.get('Location', '')
            url = urllib.parse.urlsplit(location)
            gate.require(url.scheme == 'https' and url.hostname in ('release-assets.githubusercontent.com', 'objects.githubusercontent.com')
                         and url.username is None and url.port in (None, 443), 'untrusted asset redirect')
            # No Authorization header goes to the signed object-store URL.
            with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(location), timeout=60) as response:
                return response.read()
        raise gate.Refused(f'publication API failed with HTTP {error.code}; reconcile before retry') from error
    except urllib.error.URLError as error:
        raise gate.Refused('ambiguous publication response; reconcile before retry') from error


def asset_bytes(asset):
    url = urllib.parse.urlsplit(asset['url'])
    gate.require(url.scheme == 'https' and url.netloc == 'api.github.com', 'invalid asset API URL')
    return api(url.path, binary=True)


def plan(expected, assets):
    gate.require(len({a['name'] for a in assets}) == len(assets), 'duplicate remote assets')
    gate.require({a['name'] for a in assets} <= set(expected), 'unapproved remote release assets')
    complete = []
    for asset in assets:
        data = asset_bytes(asset)
        gate.require(data is not None and gate.digest(data) == expected[asset['name']], f'remote artifact mismatch/unverifiable: {asset["name"]}')
        complete.append(asset['name'])
    return {'complete': sorted(complete), 'missing': sorted(set(expected) - set(complete))}


def validate_live(candidate, phase):
    event = gate.strict_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes())['inputs']
    raw = (candidate / 'release-inventory.json').read_bytes()
    inventory = gate.strict_json(raw)
    gate.require(gate.digest(raw) == event['inventory_sha256'], 'candidate inventory changed at upload boundary')
    gate.require(os.environ.get('GITHUB_REPOSITORY') == gate.REPOSITORY and os.environ.get('GITHUB_REF') == 'refs/heads/main'
                 and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'untrusted publication context')
    context = gate.binding(inventory, event['inventory_sha256'], int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
    for key in ('source_sha', 'tag', 'channels', 'targets', 'candidate'):
        value = gate.strict_json(event[key]) if key in ('channels', 'targets', 'candidate') else event[key]
        gate.require(value == inventory[key], 'dispatch approval changed')
    gate.require('github' in inventory['channels'], 'GitHub channel not enabled')
    receipt = gate.validate(inventory, event['inventory_sha256'], candidate, context, gate.GitHub(os.environ['GH_TOKEN']).evidence(inventory, context))
    receipt['phase'] = phase
    audit = Path('audit')
    audit.mkdir(exist_ok=True)
    path = audit / f'{phase}.json'
    with path.open('xb') as output:
        output.write(gate.canonical(receipt))
    # An authenticated, append-only audit record exists before any public write.
    import retention
    retention.audit(path, os.environ['RELEASE_AUDIT_BUCKET'], context['publishing']['run_id'], context['publishing']['run_attempt'])
    return inventory


def release_assets(release):
    if release is None:
        return []
    assets = []
    for page in range(1, 101):
        result = api(f'/repos/{gate.REPOSITORY}/releases/{release["id"]}/assets?per_page=100&page={page}')
        gate.require(isinstance(result, list), 'release asset listing unavailable')
        assets.extend(result)
        if len(result) < 100:
            return assets
    raise gate.Refused('incomplete release asset pagination')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['reconcile', 'upload'])
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--signatures', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    inventory = gate.strict_json((args.candidate / 'release-inventory.json').read_bytes())
    gate.verify_files(inventory, args.candidate)
    # Signatures are verification sidecars, not inventory payloads (no cycles).
    bundle = args.signatures / 'release.sigstore.jsonl'
    gate.require(bundle.is_file() and not bundle.is_symlink(), 'downloadable attestation bundle missing')
    tag_path = '/repos/' + gate.REPOSITORY + '/releases/tags/' + urllib.parse.quote(inventory['tag'], safe='')
    release = api(tag_path)
    if release is not None:
        gate.require(release.get('tag_name') == inventory['tag'], 'remote release tag differs')
    assets = release_assets(release)
    import verify
    prior = [a for a in assets if a['name'] == 'release.sigstore.jsonl']
    if prior:
        gate.require(len(prior) == 1, 'duplicate remote attestation bundles')
        # A retry reuses a cryptographically verified existing bundle rather
        # than overwriting it with this attempt's different signing bytes.
        data = asset_bytes(prior[0])
        gate.require(data is not None, 'existing signature is unverifiable')
        recovered = args.signatures / 'recovered-release.sigstore.jsonl'
        with recovered.open('xb') as output:
            output.write(data)
        bundle = recovered
        verify.verify(args.candidate, bundle, inventory['source_sha'], inventory['tag'])
    else:
        verify.verify(args.candidate, bundle, inventory['source_sha'], inventory['tag'], os.environ['GITHUB_SHA'])
    files = {p.name: p for p in args.candidate.iterdir()}
    files['release.sigstore.jsonl'] = bundle
    expected = {name: gate.digest(path.read_bytes()) for name, path in files.items()}
    reconciliation = plan(expected, release_assets(release))
    if args.operation == 'upload':
        require_enabled()
        if release is None:
            validate_live(args.candidate, 'create-release')
            release = api('/repos/' + gate.REPOSITORY + '/releases', method='POST', data=gate.canonical({
                'tag_name': inventory['tag'], 'target_commitish': inventory['source_sha'], 'name': inventory['tag'],
                'draft': False, 'prerelease': '-' in inventory['tag'], 'make_latest': 'false',
                'body': (args.candidate / 'release-notes.md').read_text() + '\n\nSource: https://github.com/' + gate.REPOSITORY + '/tree/' + inventory['source_sha'] + '\nInventory SHA-256: ' + gate.digest((args.candidate / 'release-inventory.json').read_bytes()) + '\n\nGenerated with Claude AI — please review before distribution.'}))
        for index, name in enumerate(reconciliation['missing']):
            # Revalidate both the platform and all retained bytes for EACH write.
            validate_live(args.candidate, f'upload-{index}')
            data = files[name].read_bytes()
            gate.require(gate.digest(data) == expected[name], 'upload bytes changed after approval')
            api(f'/repos/{gate.REPOSITORY}/releases/{release["id"]}/assets?name=' + urllib.parse.quote(name, safe=''),
                method='POST', data=data, content_type='application/octet-stream')
            verified = plan(expected, release_assets(release))
            gate.require(name in verified['complete'], 'upload acknowledgement did not produce matching remote bytes')
        reconciliation = plan(expected, release_assets(release))
        gate.require(not reconciliation['missing'], 'release incomplete; moving aliases and announcements remain held')
    with args.output.open('xb') as output:
        output.write(gate.canonical(reconciliation))


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, OSError, KeyError, ValueError) as error:
        raise SystemExit(f'release publication refused: {error}') from error
````

### File `packaging/release/refresh_manifest.py`

<!-- r1:file task=4 path=packaging/release/refresh_manifest.py sha256=8cd7482297e19219ffd2e16f493631051c9dd2f9b7c5e7ef1846767e0c27954d bytes=760 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""After adding notices, update dist's build manifest before global generation."""
import hashlib
import json
from pathlib import Path
import sys


def refresh(manifest, archive):
    artifacts = manifest['artifacts']
    entry = artifacts[archive.name]
    # cargo-dist 0.30.4 consumes this digest for its installer and formula.
    entry['assets'].append({'name': 'THIRD-PARTY-NOTICES.txt', 'path': 'THIRD-PARTY-NOTICES.txt', 'kind': 'license'})
    entry.setdefault('checksums', {})['sha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
    return manifest


if __name__ == '__main__':
    path, archive = map(Path, sys.argv[1:])
    path.write_text(json.dumps(refresh(json.loads(path.read_text()), archive), indent=2) + '\n')
````

### File `packaging/release/test_publish.py`

<!-- r1:file task=4 path=packaging/release/test_publish.py sha256=805f4734f32743f1bdb55cdbdf75f1d179636e0ce6339115c6e45829249be554 bytes=1306 mode=644 encoding=utf8 -->
````python
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import publish


class Publication(unittest.TestCase):
    def test_remote_status_and_digest_reconciliation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'payload').write_bytes(b'approved')
            expected = {'payload': gate.digest(b'approved')}
            for existing, body, result in [([], None, ['payload']), ([{'name': 'payload', 'url': '/asset'}], b'approved', [])]:
                with patch.object(publish, 'asset_bytes', return_value=body):
                    self.assertEqual(publish.plan(expected, existing)['missing'], result)
            for body in (None, b'wrong'):
                with patch.object(publish, 'asset_bytes', return_value=body), self.assertRaises(gate.Refused):
                    publish.plan(expected, [{'name': 'payload', 'url': '/asset'}])
            with self.assertRaises(gate.Refused):
                publish.plan(expected, [{'name': 'extra', 'url': '/asset'}])

    def test_publication_switch_cannot_be_omitted(self):
        with patch.dict('os.environ', {}, clear=True), self.assertRaises(gate.Refused):
            publish.require_enabled()


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/test_verify.py`

<!-- r1:file task=4 path=packaging/release/test_verify.py sha256=699eeeac4bb492794390d53d313b255ad27bedf2e67529c896b4c85781ab2345 bytes=1349 mode=644 encoding=utf8 -->
````python
import hashlib
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import gate
import verify
import test_gate


class Verification(unittest.TestCase):
    def test_authentication_failure_stops_before_installer(self):
        with patch.object(verify.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'verifier')):
            with self.assertRaises(subprocess.CalledProcessError):
                verify.verify(Path('/unused'), Path('/unused-bundle'), 'a' * 40, 'v0.1.0')

    def test_source_and_tag_bound_inside_signed_inventory(self):
        fixture = test_gate.Gates()
        fixture.setUp()
        self.addCleanup(fixture.tmp.cleanup)
        (fixture.root / 'release-inventory.json').write_bytes(gate.canonical(fixture.inventory))
        with patch.object(verify.subprocess, 'run') as call:
            for source, tag in [('b' * 40, fixture.inventory['tag']), ('a' * 40, 'v0.1.0')]:
                with self.assertRaises(gate.Refused):
                    verify.verify(fixture.root, Path('bundle'), source, tag)
            args = call.call_args.args[0]
            self.assertIn('--signer-workflow', args)
            self.assertIn('--source-ref', args)
            self.assertIn('--deny-self-hosted-runners', args)


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/test_workflows.py`

<!-- r1:file task=4 path=packaging/release/test_workflows.py sha256=856213b554f2042fe26c169be5b86defae2e905cdb17b8eb30f01ed1ff4c85e3 bytes=7036 mode=644 encoding=utf8 -->
````python
"""Workflow structure is part of the gate; every privileged job is checked."""
import copy
from pathlib import Path
import re
import unittest
import tempfile
import shutil

import yaml

import workflow_policy

ROOT = Path(__file__).resolve().parents[2]


class Workflows(unittest.TestCase):
    def test_all_release_workflows(self):
        workflow_policy.check_repository(ROOT)

    def test_arbitrary_workflow_filename_cannot_hide_write_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(ROOT / '.github', root / '.github')
            data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
            data['on'] = data.pop(True) if True in data else data['on']
            data['jobs']['sign'].pop('environment')
            data['jobs']['sign']['steps'] = [s for s in data['jobs']['sign']['steps'] if s.get('uses') != './.github/actions/release-gate']
            (root / '.github/workflows/release.yml').write_text(yaml.safe_dump(data))
            with self.assertRaises(ValueError):
                workflow_policy.check_repository(root)

    def test_credentials_cannot_start_without_current_bound_authorization(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for kind in ('missing-authorize', 'missing-auth-gate', 'old-attempt-condition', 'ignored-authorize-dependency', 'or-bypass'):
            changed = copy.deepcopy(data)
            if kind == 'missing-authorize':
                changed['jobs'].pop('authorize')
            elif kind == 'missing-auth-gate':
                changed['jobs']['authorize']['steps'] = [s for s in changed['jobs']['authorize']['steps'] if s.get('uses') != './.github/actions/release-gate']
            elif kind == 'old-attempt-condition':
                changed['jobs']['sign']['if'] = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main'"
            elif kind == 'ignored-authorize-dependency':
                changed['jobs']['sign']['needs'] = 'approval-tuple'
            else:
                changed['jobs']['sign']['if'] += ' || true'
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_authorization_job_is_protected_and_has_no_publication_authority(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for field, value in [('environment', None), ('permissions', {'contents': 'write'}), ('permissions', {'id-token': 'write'})]:
            changed = copy.deepcopy(data)
            changed['jobs']['authorize'][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_gate_cannot_be_skipped_or_ignore_failure(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for name in ('authorize', 'sign', 'github'):
            for field, value in [('if', 'false'), ('continue-on-error', True)]:
                changed = copy.deepcopy(data)
                step = next(s for s in changed['jobs'][name]['steps'] if s.get('uses') == './.github/actions/release-gate')
                step[field] = value
                with self.subTest(job=name, field=field), self.assertRaises(ValueError):
                    workflow_policy.check(changed, 'release-publish.yml')

    def test_read_only_job_with_release_secrets_still_requires_authorization(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        data['jobs']['bootstrap-crates'] = {
            'runs-on': 'ubuntu-24.04', 'timeout-minutes': 10, 'environment': 'release',
            'permissions': {'contents': 'read'}, 'steps': [{'run': 'echo protected credential job'}],
        }
        with self.assertRaises(ValueError):
            workflow_policy.check(data, 'release-publish.yml')

    def test_authorization_job_cannot_ignore_failures(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        data['jobs']['authorize']['continue-on-error'] = True
        with self.assertRaises(ValueError):
            workflow_policy.check(data, 'release-publish.yml')

    def test_each_privileged_job_requires_environment(self):
        for workflow in (ROOT / '.github/workflows').glob('release-*.yml'):
            data = yaml.safe_load(workflow.read_text())
            for name, job in data['jobs'].items():
                if workflow_policy.privileged(job):
                    for value in (None, 'unguarded'):
                        with self.subTest(workflow=workflow.name, job=name, value=value):
                            mutated = copy.deepcopy(data)
                            mutated['jobs'][name]['environment'] = value
                            with self.assertRaises(ValueError):
                                workflow_policy.check(mutated, workflow.name)

    def test_remove_either_boundary_refuses(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for phase in ('preflight', 'boundary'):
            changed = copy.deepcopy(data)
            steps = changed['jobs']['github']['steps']
            changed['jobs']['github']['steps'] = [s for s in steps if s.get('with', {}).get('phase') != phase]
            with self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_credentials_and_writes_cannot_precede_their_gates(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-publish.yml').read_text())
        for job_name, match in [('sign', 'actions/attest'), ('github', 'actions/create-github-app-token')]:
            changed = copy.deepcopy(data)
            steps = changed['jobs'][job_name]['steps']
            step = next(s for s in steps if s.get('uses', '').startswith(match))
            steps.remove(step)
            steps.insert(0, step)
            with self.subTest(job=job_name), self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-publish.yml')

    def test_reusable_job_cannot_hide_its_environment(self):
        with self.assertRaises(ValueError):
            workflow_policy.check({'jobs': {'sign': {'uses': './.github/workflows/release-sign.yml'}}}, 'release-wrapper.yml')

    def test_unpinned_action_and_cache_refuse(self):
        data = yaml.safe_load((ROOT / '.github/workflows/release-candidate.yml').read_text())
        for action in ('actions/checkout@v4', 'Swatinem/rust-cache@' + 'a' * 40):
            changed = copy.deepcopy(data)
            changed['jobs']['archive']['steps'].append({'uses': action})
            with self.assertRaises(ValueError):
                workflow_policy.check(changed, 'release-candidate.yml')


if __name__ == '__main__':
    unittest.main()
````

### File `packaging/release/verify.py`

<!-- r1:file task=4 path=packaging/release/verify.py sha256=130970a410be1c4e4cda51a362ca06c280d89511ce9961e4829a0bab405c1d6a bytes=2003 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Verify downloaded final bytes before executing the cargo-dist installer."""
import argparse
from pathlib import Path
import subprocess

import gate
import supply


def verify(candidate, bundle, source_sha, tag, signer_sha=None):
    candidate, bundle = Path(candidate), Path(bundle)
    inventory_path = candidate / 'release-inventory.json'
    # Verify the inventory signature first: hashes beside bytes alone do not
    # authenticate an author. The signer is the protected publication workflow.
    command = ['gh', 'attestation', 'verify', str(inventory_path), '--bundle', str(bundle), '--repo', gate.REPOSITORY,
               '--signer-workflow', gate.REPOSITORY + '/.github/workflows/release-publish.yml',
               '--source-ref', 'refs/heads/main', '--deny-self-hosted-runners']
    if signer_sha:
        command += ['--signer-digest', signer_sha]
    subprocess.run(command, check=True)
    inventory = gate.strict_json(inventory_path.read_bytes())
    gate.require(inventory['source_sha'] == source_sha and inventory['tag'] == tag, 'attested release source/tag mismatch')
    gate.verify_files(inventory, candidate)
    supply.verify_checksums(candidate)
    supply.verify_binary_inventory(inventory, candidate)
    # Every final payload has provenance too, including SBOMs and installer.
    for artifact in inventory['artifacts']:
        per_file = list(command)
        per_file[3] = str(candidate / artifact['name'])
        subprocess.run(per_file, check=True)
    return inventory


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--signer-sha')
    args = parser.parse_args()
    verify(args.candidate, args.bundle, args.source_sha, args.tag, args.signer_sha)
````

### File `packaging/release/workflow_policy.py`

<!-- r1:file task=4 path=packaging/release/workflow_policy.py sha256=ce1be069a6c78a59634d8c193ac4593eab45876a5734d895f8e8979f77d3600e bytes=6806 mode=644 encoding=utf8 -->
````python
#!/usr/bin/env python3
"""Lint the release authority graph, including jobs inside reusable workflows."""
from pathlib import Path
import re
import sys

import yaml


CREDENTIAL_CONDITION = "vars.RELEASE_PUBLICATION_ENABLED == 'true' && github.ref == 'refs/heads/main' && needs.authorize.outputs.run_attempt == github.run_attempt && needs.authorize.outputs.inventory_sha256 == inputs.inventory_sha256"


def privileged(job):
    return any(job.get('permissions', {}).get(scope) == 'write' for scope in ('contents', 'packages', 'attestations', 'id-token')) or any(
        s.get('uses', '').startswith('actions/create-github-app-token@') or 'publish.py upload' in s.get('run', '')
        for s in job.get('steps', []))


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def writer(name, job):
    # Protected-environment secrets can be publication credentials even when
    # the ordinary job token is read-only (for example crates.io bootstrap).
    return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')


def check(data, name):
    jobs = data.get('jobs', {})
    writers = [j for key, j in jobs.items() if writer(key, dict(j, permissions=j.get('permissions', data.get('permissions', {}))))]
    if writers:
        authorization = jobs.get('authorize', {})
        effective = dict(authorization, permissions=authorization.get('permissions', data.get('permissions', {})))
        if not authorization or privileged(effective) or authorization.get('environment') != 'release':
            raise ValueError('a protected read-only authorization job must precede credential issuance')
        proof = [s.get('with', {}).get('phase') for s in authorization.get('steps', []) if s.get('uses') == './.github/actions/release-gate']
        if proof != ['preflight']:
            raise ValueError('credential authorization must run the live preflight gate')
    for key, job in jobs.items():
        if 'uses' in job:
            raise ValueError(f'{name}/{key}: reusable jobs need explicit authority review; put the gate inside the protected callee')
        if not job.get('timeout-minutes'):
            raise ValueError(f'{name}/{key}: timeout required')
        permissions = job.get('permissions', data.get('permissions', {}))
        effective = dict(job, permissions=permissions)
        if job.get('continue-on-error') not in (None, False):
            raise ValueError('release jobs cannot ignore failures')
        for step in job.get('steps', []):
            if step.get('uses') == './.github/actions/release-gate' and (step.get('if') is not None or step.get('continue-on-error') not in (None, False)):
                raise ValueError('release gates must run unconditionally and stop on failure')
        if writer(key, effective):
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if 'authorize' not in needs:
                raise ValueError('writer must depend on protected credential authorization')
            condition = ' '.join(job.get('if', '').split())
            allowed = {CREDENTIAL_CONDITION} | {CREDENTIAL_CONDITION + " && vars.RELEASE_" + channel + "_ENABLED == 'true'" for channel in ('GITHUB', 'CRATES', 'GHCR', 'HOMEBREW')}
            if condition not in allowed:
                raise ValueError('credential issuance must match the authorized inventory and current run attempt')
            env = job.get('environment')
            if (env.get('name') if isinstance(env, dict) else env) != 'release':
                raise ValueError(f'{name}/{key}: protected release environment required')
            steps = job.get('steps', [])
            phases = [s.get('with', {}).get('phase') for s in steps if s.get('uses') == './.github/actions/release-gate']
            if phases != ['preflight', 'boundary']:
                raise ValueError(f'{name}/{key}: live preflight and boundary gates required')
            gates = {s['with']['phase']: i for i, s in enumerate(steps) if s.get('uses') == './.github/actions/release-gate'}
            for i, step in enumerate(steps):
                uses, run = step.get('uses', ''), step.get('run', '')
                if uses.startswith('actions/create-github-app-token@') and not gates['preflight'] < i < gates['boundary']:
                    raise ValueError('publication credentials must be acquired after preflight and before revalidation')
                if (uses.startswith('actions/attest') or 'publish.py upload' in run) and not gates['boundary'] < i:
                    raise ValueError('signing/upload must follow boundary revalidation')
        for step in job.get('steps', []):
            uses = step.get('uses', '')
            if uses and not uses.startswith('./') and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError(f'{name}/{key}: action must be pinned by commit')
            if name == 'release-candidate.yml' and ('cache' in uses.lower() or 'cache:' in str(step.get('with', {}))):
                raise ValueError('candidate builds must restore no Actions cache')
    if name == 'release-publish.yml':
        # Safe defaults: dispatch only; per-channel opt-in is a separate switch.
        trigger = data.get('on', data.get(True, {}))
        if set(trigger) != {'workflow_dispatch'}:
            raise ValueError('publication must be manual only')
        for job in data['jobs'].values():
            if privileged(job) and "vars.RELEASE_PUBLICATION_ENABLED == 'true'" not in job.get('if', ''):
                raise ValueError('publication switch missing')


def check_repository(root):
    directory = Path(root) / '.github/workflows'
    paths = sorted(set(directory.glob('*.yml')) | set(directory.glob('*.yaml')))
    if not {'release-candidate.yml', 'release-publish.yml', 'release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('candidate, publish and negative-test workflows required')
    for path in paths:
        data = yaml.safe_load(path.read_text())
        authority = any(privileged(dict(job, permissions=job.get('permissions', data.get('permissions', {}))))
                        or environment_name(job) == 'release' or 'uses' in job for job in data.get('jobs', {}).values())
        # Read-only legacy qualification jobs retain their existing style.
        # Every writer/signer or reusable indirection is checked, whatever
        # the filename: a generated release.yml cannot bypass this policy.
        if path.name.startswith('release-') or authority:
            check(data, path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
````

### File `rust-toolchain.toml`

<!-- r1:file task=4 path=rust-toolchain.toml sha256=b03ef45d1b209308f08836c329e4678f726aa0cdb4af1b389467175d58663379 bytes=165 mode=644 encoding=utf8 -->
````toml
# Fresh upstream release builds use this exact toolchain; Nix uses flake.lock.
[toolchain]
channel = "1.98.1"
profile = "minimal"
components = ["clippy", "rustfmt"]
````

### Step 3: GREEN / verification

```sh
git add flake.nix .github packaging/release rust-toolchain.toml nix/package.nix
nix develop .#release -c python3 -m unittest discover -s packaging/release -p 'test_*.py'
nix develop .#release -c actionlint .github/workflows/release-candidate.yml .github/workflows/release-publish.yml .github/workflows/release-tests.yml .github/workflows/nix.yml
nix flake check -L
```

### Step 4: Commit / handoff

Inspect `git diff --check` and the staged stat, commit with `git -c commit.gpgsign=false commit`, verify `git log --format='%ae' origin/main..HEAD`, and push only `plan/dist-r1` over SSH. Report the review request to the parent; no self-approval and no GitHub actions.


## Task 5: Process docs, fresh replay and execution record

### Step 1: RED / contract

Read the completed verification logs, extract every code block into a fresh replay, apply in task order, run targeted offline suites, and compare tracked bytes with the constructed implementation. A zero-block replay or unequal tree fails. Record only observed exits/counts.

### Step 2: Exact implementation

### File `docs/README.md`

<!-- r1:file task=5 path=docs/README.md sha256=5ab87d0a20895bf11572c269e96c9912da4d1bb57bd6a96777c9ce70d20ded23 bytes=50759 mode=644 encoding=utf8 -->
````markdown
# hennery design documents

Status: the walking skeleton is implemented (Rust workspace, end-to-end host ↔ collector
slice); everything else is design. The maintainer's decisions are recorded below.

## Reading order

1. [Architecture (umbrella spec)](specs/2026-09-25-hennery-architecture-design.md)
   — product, topology, protocol principles, sessions, auth, hats, module
   boundaries, testing. Authoritative where subsystem specs disagree.
2. Subsystem specs:
   - [ACP core](specs/2026-09-26-acp-core-design.md) — host, adapters,
     host↔collector protocol, session state machine, storage, session API.
   - [Kernel](specs/2026-09-26-kernel-design.md) — storage, config, operator
     auth, pairing, hats, push, HTTP security.
   - [MCP gateway](specs/2026-09-26-mcp-gateway-design.md) — connections,
     OAuth, per-session tokens, streaming proxy, renderers.
   - [Delegation](specs/2026-10-14-delegation-design.md) — proposed opt-in parent/child sessions, shared session-bound MCP delivery for optional plug-ins, durable reports/questions, operator fallback and family UI; two operator questions remain.
   - [Optional memory plug-in](specs/2026-10-14-memory-design.md) — proposed generic opt-in activity/startup contract, separate reference service, scoped vault import and purge; scope amendment dated 2026-10-14.
   - [Client view](specs/2026-10-02-client-view-design.md) — the display fold
     on the collector (`hennery-view`), the view API every client uses, and the
     web UI reused from the predecessor frontend.
   - [Frontend](specs/2026-09-26-frontend-design.md) — views, data layer,
     transcript fold rules, cards, PWA.
   - [Phone, Web Push and PWA](specs/2026-10-14-phone-design.md) — proposed browser push/device controls, installed app shell, question deep links, mobile answers and iOS acceptance.
   - [Distribution](specs/2026-09-26-distribution-design.md) — binary,
     managed runtime and adapter manifest, release pipeline, services, doctor.
   - [Distribution and releases](specs/2026-10-15-distribution-release-design.md) — proposed publication contract, crates.io with packaged UI, platform qualification, channel rollout and maintainer-only setup; six operator questions remain.
   - [Remote hosts over WSS](specs/2026-10-14-wss-design.md) — approved design per the fleet parent, including the three re-confirmed amendments; verified TLS/private-CA trust, tunnel migration and reconnect/doctor parity are W1; reverse-proxy attribution/public deployment remain W2.
3. Evidence:
   - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
     and its [harness](../spikes/2026-09-25-mcp-per-session/).
4. Plans:
   - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
     implementation plan (9 tasks) — executed 2026-09-27; its "Execution status" section
     lists where the built code deviates from the task text.
   - [Teardown and reconciliation](plans/2026-09-27-teardown-and-reconciliation.md) —
     plan A of the resume work (9 tasks): adapter supervisor and exit watcher, park/close,
     idle reaper, conflict events and reconciliation after reconnect. Executed 2026-09-27 (see its
     "Execution status").
   - [Resume (B1)](plans/2026-09-28-resume.md) — plan B1 (10 tasks): `resume_session` with
     `session/load` and replay suppression, presumed park while a host is offline, conn_id-keyed
     waiters, one visibility rule for unapplied facts. Executed 2026-09-29 (see its "Execution status").
   - [Cancel and capabilities (B2a)](plans/2026-09-29-cancel-capabilities.md) — `cancel_turn`,
     `hello.capabilities` with the park gate, and B1's two carry-overs. Executed 2026-09-29 (see its "Execution status").
   - [Session config (B2b)](plans/2026-09-30-session-config.md) — model, axes and mode on start
     and resume, `set_config`, the session catalogue, and B2a's two folds. Executed 2026-09-30 (see its "Execution status").
   - [Permission and elicitation](plans/2026-10-01-permissions.md) — plan (2) (7 tasks): the
     pending set and answer queue, teardown hooks, answer endpoint. Executed 2026-10-01 (see its "Execution status").
   - [Host pairing (3a)](plans/2026-10-01-host-pairing.md) — the first part of plan (3) (7 tasks):
     pairing codes and enrollment, `hennery host join`, the Ed25519 `hello` proof, `up` pairing its
     own host, and host revoke. Operator auth (3b) and passkeys (3c) follow. Reviewed and amended
     2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [Operator auth (3b-i)](plans/2026-10-02-operator-auth.md) — the first part of plan 3b (7 tasks):
     the setup link, the owner's password and `public_url`, login and sessions behind the cookie, the
     `Origin` rules, step-up, and the development bearer removed. Listeners, `config.toml` and the admin
     socket (3b-ii), then `owner_id` everywhere (3b-iii), follow. Amended after the security review of
     2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Operator auth (3b-ii)](plans/2026-10-03-operator-auth-2.md) — the second part of plan 3b (7 tasks):
     several listeners and the health checks, `config.toml`, the admin socket with `hennery admin`
     (setup link, password and `public_url` resets, hosts, pairing codes), and agents no longer
     inheriting stray descriptors. `owner_id` everywhere (3b-iii) and passkeys (3c) follow. Amended after
     the security review of 2026-10-03; executed 2026-10-01 as PRs #14 and #15 (see its "Execution status").
   - [`owner_id` everywhere (3b-iii)](plans/2026-10-04-owner-id.md) — the third part of plan 3b (5 tasks): the owner from the first start, so `up`'s host paired before setup has one; `owner_id` on the older tables; every query of the operator, host registry and sessions store naming it, with a test that reads every statement. Amended after the security review of 2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [Passkeys (3c)](plans/2026-10-05-passkeys.md) — plan 3c (6 tasks): `webauthn-rs` with the relying party from `public_url`, the `passkeys` table, ceremonies in memory, registration from a stepped-up session, login and step-up by passkey with the counter checked, and `admin reset-public-url` removing the passkeys of a host name it leaves. `admin reset-password` removes every passkey. The API only; the frontend is plan 4's. Amended after the security review of 2026-10-01; executed 2026-10-01 (see its "Execution status").
   - [The web shell (4b)](plans/2026-10-16-web-shell.md) — part 4b of plan 4, the frontend (7 tasks): `web/` (React 19, strict TypeScript, Vite, Tailwind v4, Vitest) imported with the shell's look, icons and hooks; `GET /api/capabilities` (`{mode, features[]}`); a typed transport client (401 to sign-in with a same-origin `?next=`, one step-up and one retry, plain 409 messages, SSE over `fetch` with `Last-Event-ID`); the router, the rail and the mobile tab bar, setup with the token out of the address bar at once, passkey-first sign-in and step-up; the binary embedding the build by a build script (a placeholder without it, `HENNERY_WEB_REQUIRE=1` refusing that), served as the router's fallback but never for `/api` or `/mcp/…`, under the CSP, with no inline script; Playwright in Chromium against the binary; CI and the release archives checking the UI is embedded. The capabilities name `mcp_connections`, as plan 8a merged first. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [The session list and the read-only transcript (4c-i)](plans/2026-10-18-web-sessions.md) — part 4c-i of plan 4, the frontend (5 tasks), in `web/` only: a typed view client over 4a-ii's view API; the SSE helper's deferred fixes (a throwing handler never loses its event, one abort listener, `closed` at once, bodies cancelled); an item store per session (upsert by id and version, groups by opaque `turn_id`, older pages by `before_turn`, a resync that replaces the store and reopens, backed off when it repeats) and a list store fed by `session_upsert`, `session_removed` and `waiting_changed`, refetching on no event. The session list: day buckets across DST that move on with the clock, rows by lifecycle and activity, "Waiting on a question", the server's waiting count in the badge and the tab title (kept through a refused search), search on the server, Hide closed, the hat switch. The read-only session view: the header from the list or the detail, every item kind and all 18 markers, Markdown with raw HTML as text and no remote image, an error boundary per item, a tail window of 200 items measured in Chromium; a session's link (a push notification's) opens it beside the list. A guard on the tests' text locators. Amended after the security review of 2026-10-02, its re-confirmation of 2026-10-03, the task reviews and the whole-branch review; executed 2026-10-03 (see its "Execution status").
   - [The composer, cards, New Session and the session menu (4c-ii)](plans/2026-10-18-web-sessions.md) — part 4c-ii of plan 4, the frontend (Tasks 6–10 of the same plan), in `web/` only: a composer under each transcript (Ctrl/Cmd+Enter, images by paste, drop or pick with `[Image #N]` markers, a slash menu, the config bar taken back on a refusal, Cancel with the turn's real outcome, every prompt refusal in words, drafts per session and forgotten at sign-out, "Send again" refilling the draft); question cards (permissions by option kind, digits only from a focused card on a desktop and never stealing typing, forms with pairing, every delivery state, a verdict that never goes back, "Answer as a new message" as a draft); New Session (hosts, agents behind one function, the project picker, the hat preview, the first prompt as its own request); footers by lifecycle with every resume refusal in words and the header menu (park, close, delete behind a confirmation and step-up); "delivers when the host reconnects" following the host from what the view streams. Playwright starts a session on a host paired with the page's command, answers a permission, crashes the host and resumes, at two widths; CI builds the fake agent. Amended after its security review and re-confirmation of 2026-10-03, the task reviews, the whole-branch review and the review of its fixes; executed 2026-10-03 (see its "Execution status").
   - [The management screens: hosts and hats (4d-i)](plans/2026-10-18-web-manage.md) — part 4d-i of plan 4, the frontend (4 tasks), in `web/` only: every server string shown escaped and bidi-isolated (`visible()`, `<Text>`); a confirmation that runs its action and stays open under the step-up dialog; the page `inert` behind that dialog; a failed sign-out that says the browser is still signed in. Hosts: the list with each host's state, pairing with a one-time code minted on the click behind step-up and kept in the page's state only, with the exact `hennery host join` command and a countdown; rename, default hat and revoke, confirmed then stepped up. Hats: create, rename, recolour, the default for new hosts, each host's path rules saved as a set with a live tester that asks the host, and purge from the server's preview. Playwright pairs a real host with the command the page shows, at two widths, with every binary in a scratch environment. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status").
   - [The MCP connections screen (4e-i)](plans/2026-10-22-web-mcp.md) — part 4e-i of plan 4, the frontend (3 tasks), in `web/` only, over plan 8a's routes: `/mcp` (nothing under it, which the server reserves), shown only when `features` names `mcp_connections`; each connection with `hennery-<slug>`, its URL, hat, kind, whether a token is stored and its state in words (`needs_auth` "needs sign-in again", `error` "is failing", never a reconnect), the vendor's note escaped and cut at 300 characters; add (step-up; the hat starts at the default for new hosts), edit sending only the changed fields (a label edit needs no step-up; the token's loss confirmed first), delete (confirmed, then stepped up); the static token write-only, read once from an uncontrolled field kept from password managers and emptied before the request; the hosts ticked as a full set built from the connection's own mounts; a note that changes apply to new and resumed sessions, and how Codex, Claude on the operator's own CLI and any other agent command get them (without isolation, only both in the host's default hat; may change). Playwright creates one, sets its token and mounts it on a real paired host at two widths. Stdio servers, OAuth and the delivery indicator are 4e-ii's. Amended after the security review of 2026-10-03 and its re-confirmation. Executed 2026-10-03, with the whole-branch review fixes completed and rebased onto merged 8e (`d54c704c`) on 2026-10-12 (see its "Execution status").
   - [Web MCP delivery and local servers (4e-ii-a)](plans/2026-10-23-web-mcp-delivery.md) — six web-only tasks over merged 8e: last-start/resume mode/count, bounded metadata refresh, host/agent predictions, full-set local stdio configuration with write-only env values and step-up, isolation refusals, and security-review amendments. Executed 2026-10-13 on `7a8dab28`; opus review APPROVE AFTER AMENDMENTS and scoped re-confirmation CONFIRMED WITH NOTES (maintainer's behalf, 2026-10-13), all N1–N3 taken. Fresh v2 replay: 88 blocks / 33 files, twelve matching phase trees; 1465 Vitest / 84 files, prior full Playwright 58 passed / 11 skipped and changed spec 8/8; 171 historical/new caught probe records. Final-tip gate is logged in the ledger before push (see Execution status). OAuth Connect is 4e-ii-b after 8f.
   - [Web MCP OAuth (4e-ii-b)](plans/2026-10-24-web-mcp-oauth.md) — five web-only tasks over merged 8f (4684d1d9): DCR/pre-registered write-only clients, isolated fresh-click consent, last gateway reports/probes and shared attention, real collector/loopback vendor at 1280/390 px. Executed 2026-10-13; opus review APPROVE AFTER AMENDMENTS, scoped re-confirmation CONFIRMED WITH NOTES (maintainer's behalf, parent, 2026-10-13), I1/M1–M10 and N1–N3 taken. Fresh post-N1 replay: 81 blocks / 24 files, ten matching phase trees; 1618 Vitest / 93 files, full Playwright 86 passed / 11 existing skips including 28 OAuth cases; 250 historical + 7 N1 caught source-probe records. Final-tip gate is logged before push. Draft PR #133 is parent-managed; hint-only browser proof, flow identity, password-manager residual and service-worker push relay remain follow-ups. No push subscription UI before testers.
   - [`public_url` over the HTTP API (4d-B4)](plans/2026-10-18-public-url-api.md) — a backend part of plan 4d, the frontend (3 tasks): `PATCH /api/settings {public_url}` does what `hennery admin reset-public-url` does, through one operator function and in one transaction: the URL checked as setup checks it, the row and the cached origin replaced, every signed-in session ended (the caller's too) and so every stream and push subscription, the passkeys removed only when the host name changes, every ceremony ended, the contact beside it in the same transaction. A body naming `public_url` needs a fresh step-up, checked before anything is read and again as the write's first statement; a contact alone needs none. The answer reports what ended and clears the cookie as the old `public_url` set it; the move is logged at `warn` with both origins. Proven against the admin socket on a copy of one database. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status"). Q1 (refuse a loopback `http` `public_url`, a lockout from a remote browser) is open for the maintainer, with parity as the default.
   - [Hat logos, server side (4d-B2)](plans/2026-10-18-hat-logos.md) — part of plan 4d, the management screens' backend (4 tasks, and a fifth from the whole-branch review): a hat's logo is a PNG of at most 64 KiB, uploaded as base64 in JSON behind step-up, its size checked from its header before anything is decoded (1024 pixels a side), decoded and written afresh as `IHDR`, `IDAT` and `IEND` alone, at most 256 KiB; SVG, WebP and JPEG refused (the browser rasterises them first); `GET /api/hats/{id}/logo` serves it as `image/png` with `nosniff`, a sandbox policy, a fixed `Content-Disposition`, same-origin CORP and a strong `ETag` revalidated each time; `HatItem.logo` carries the `ETag`; a hat frozen for its purge takes no new logo but can lose its own, and the purge leaves no logo in the database or its WAL; the next kernel migration adds the columns. Kernel §5.1 and the frontend spec's hats bullet written back. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-03 (see its "Execution status").
   - [The README quickstart (4f)](plans/2026-10-22-quickstart.md) — part 4f of plan 4, the frontend (1 task) — executed 2026-10-03; finalized against main `82d41c0f` on 2026-10-13 after #133. Source/Nix build, up/setup, SSH-tunnel pairing, first session, static-token/OAuth/local stdio MCP and admin recovery match the merged code. All nine shell blocks have test/CI runners; OAuth and SSH are prose. The accuracy amendments and substitution/expiry guards are recorded in the single execution status; final OAuth accuracy review and PR #125 CI remain parent-owned.
   - [Build without Nix](plans/2026-10-25-build-without-nix.md) — extends plan 4f with latest stable Rust, Node 24, pinned pnpm 12.3.4 through npx and vendored OpenSSL. The new named block has a dedicated Ubuntu/macOS CI runner and a job-scoped guard; local execution, probes and replay are recorded in its Execution status. Independent review and non-Nix CI remain parent-owned.
   - [Kernel hats (5a)](plans/2026-10-06-hats.md) — the first part of plan 5, hats (3 tasks): `hats` and `hat_path_rules` with `owner_id` and composite foreign keys, a default hat on every host from the first start (setup names it), the pure resolver (segment match, longest prefix, default fallback), and the hats, path-rules and `PATCH /api/hosts/{id}` API behind step-up. No session carries a hat yet: `resolve_path` (5b), the session's hat on start and resume (5c) and re-assignment (5d) follow. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [`resolve_path` (5b)](plans/2026-10-07-resolve-path.md) — the second part of plan 5 (3 tasks): the host resolves a typed path (`~`, symlinks, a missing tail kept under its resolved ancestor, a `..` past it refused); `resolve_path`, a probe of its own capability on plan 6c's probe map; `POST /api/hats/resolve`; and rules saved only through their connected host. Amended after the security review of 2026-10-02 (it covered 5b–5d); executed 2026-10-02 and rebased onto 6c (see its "Execution status").
   - [Session hats (5c)](plans/2026-10-08-session-hats.md) — the third part of plan 5 (3 tasks): a start resolves its cwd on the host and stores the hat its rules give with the canonical cwd (no session for a host that is away); a resume refuses a moved cwd (`cwd_moved`) or another hat (`hat_mismatch`); a case near miss is `hat_ambiguous`; the host starts an adapter only in its canonical cwd; `hat_id` on the list item, the list's `?hat=` filter, and recents under the session's hat. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Re-assigning a session's hat (5d)](plans/2026-10-09-reassign-hat.md) — the last part of plan 5's sessions side (2 tasks): `PATCH /api/sessions/{id} {hat_id}` behind step-up moves a session with no running adapter to another of the owner's hats (a presumed-parked one is refused: close it first), writes `hat_reassigned{from, to}`, and the next resume must agree with the new hat. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Connections and credentials at rest (8a)](plans/2026-10-13-gateway-store.md) — the first part of plan 8, the MCP gateway (5 tasks): the `hennery-gateway` crate and its `gateway` migration component (`gw_connections`, `gw_credentials`, `gw_mounts`, every row the owner's); the master key (`<data>/master.key`, made once, private, checked on every load; or `HENNERY_MASTER_KEY`, or a systemd credential), kept from `up`'s host child and every agent; a missing or wrong key while credentials are stored stops the start and says what to restore; credentials sealed with XChaCha20-Poly1305, bound to their row, field and key version; `GET/POST /api/mcp/connections`, `PATCH/DELETE …/{id}`, `PUT …/{id}/mounts` and the write-only `PUT …/{id}/credential`, behind step-up where a token's reach changes, `no-store` on every answer; another origin or kind deletes the credential in the same transaction; an upstream URL logged only as its origin; `purge_hat` for the purge hook; the wire types documented into the TypeScript. No proxy yet (8d). Amended after the security review of 2026-10-02 and its two re-confirmations; executed 2026-10-02 (see its "Execution status"). Q1 (what a lost key takes down) and Q2 (a secret in a vendor's URL) are open for the maintainer, with defaults in place.
   - [The outbound HTTP policy (8b)](plans/2026-10-13-egress.md) — the second part of plan 8, the MCP gateway (2 tasks): `hennery_kernel::egress`, the one policy for every request hennery sends out (the gateway's proxy and OAuth, Web Push). One `reqwest` client per allowance (public only, or internal network); no redirects followed, no proxy from the environment; `https`, or `http` to loopback only (`localhost` answered by rule); a name with any non-public address refused, IP literals checked the same way (IPv6 public only in `2000::/3` outside its special ranges); a connect timeout and a deadline (the whole exchange, or a stream's head); errors without the URL; a per-key permit limiter. Nothing calls it yet. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status"). Decision 6 (plain `http` to a LAN address under the internal-network marking) was answered by the operator: allowed, in 8b-ii.
   - [The proxy and session tokens (8d)](plans/2026-10-14-gateway-proxy.md) — the fourth part of plan 8, the MCP gateway (4 tasks): session tokens (`hnry_session_…`, SHA-256 only) minted and revoked inside the caller's transaction for plan 8e, `ClientIdentity` and `MountPolicy` with their full-mode implementation, and the proxy `POST|GET|DELETE /mcp/<slug>` for static and `none` credentials, served outside the operator's routes: one 404 for everything out of scope, header allowlists both ways, the credential under its header, streaming event by event, a 401 never passed on (502 `upstream_auth`), the tool allowlist in JSON, batches and SSE, `initialize` without sampling, elicitation and roots, server requests for them refused, the egress policy chosen from the stored flag, per-connection limits, `nosniff`, `ApiError` answers. Amended after the security review of 2026-10-02, two re-confirmations and the execution's reviews; executed 2026-10-02 (see its "Execution status"). Q1 (server requests inside a JSON answer) was decided by the lane parent: event streams only, as §5.6. Open for the maintainer: whether a revoke ends a token's open streams (8e).
   - [Differential tests for the proxy's filters](plans/2026-10-15-gateway-differential.md) — a fix-forward to 8d, before 8e mints tokens (3 tasks). Each filter that reads parsed input is driven through the real proxy with a table of vectors: key case, duplicates, escapes, marks and whitespace, lenient forms, NUL, the envelope, large ids. What crossed the gateway is decoded again as serde_json, a first-wins decoder, Go's `encoding/json`, json-c and cJSON do, each measured. The tests found that a NUL-cut key or method (json-c, cJSON), a non-string `method`, a non-object batch element or `initialize` `params`, a JSON `tools/list` answer spelt otherwise, and an event not UTF-8 all passed a filter; each is now refused, 400 up and dropped or 502 down. Amended after the security review of 2026-10-02 and its re-confirmation. Open for the lane parent: §5.5's accepted gaps and 8d's Q1, against the brief's "under any interpretation".
   - [JSON answers read whole, every tools list filtered](plans/2026-10-15-gateway-json-answers.md) — a fix-forward after the differential tests, before 8e mints tokens (3 tasks). It reverses 8d's Q1 ruling: every JSON answer is read whole (8 MiB) and judged, and one holding a refused server request is 502 `upstream_invalid` (§5.6: in any answer). Under an allowlist every `result.tools` is filtered whatever its id, on `POST`s, `GET` streams and `Last-Event-ID` replays. An id of another type and an answer on another stream are accepted and pinned by tests. The differential harness moves to `tests/support/differential.rs` for 8e and 8f. Amended after the security review of 2026-10-02. Open for 8e: the upstream `Mcp-Session-Id` is not bound to a token.
   - [Plain `http` on an internal network (8b-ii)](plans/2026-10-13-internal-http.md) — the operator's decision of 2026-10-02 (1 task and the write-back): under the internal-network marking, plain `http` to internal addresses only (RFC 1918, loopback, unique-local IPv6 except AWS's metadata address `fd00:ec2::254`); a public address, link-local, CGNAT and everything neither public nor internal stay `https` only. A literal is checked by the URL check; a name goes through a third, internal-only client whose resolver refuses it if any address is not internal. Additive: 8b's API unchanged. Q1 (link-local, metadata), Q2 (CGNAT) and Q3 (a UI warning) are open for the maintainer, with the restrictive defaults. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Per-session MCP servers on the host (8c)](plans/2026-10-13-session-mcp-host.md) — the third part of plan 8, the MCP gateway (4 tasks): `start_session` and `resume_session` carry `mcp_servers` and `hat_id`, left out when empty; a host announces `mcp_servers` and `hello.mcp_isolation` (only the pinned `claude` is `claude_strict`); the hub sends servers only to a connection that can take them (`McpUndeliverable`), and a host refuses servers it cannot isolate unless the collector waives isolation (`mcp_isolation_unavailable`), before any spawn; Claude gets `strict-mcp-config` on every `session/new` and `session/load`, so the user's own MCP servers and claude.ai connectors no longer load in hennery's Claude sessions; no token in a frame's `Debug`, a log (the ACP crate's held at `error`, tungstenite's at `info`) or the host's own text. The collector sends no servers yet (8e). Release blocker: no release with 8c but without 8e. Amended after the security review of 2026-10-02 and its re-confirmation, and after its task reviews; executed 2026-10-02 (see its "Execution status").
   - [Sessions get their MCP servers (8e)](plans/2026-10-16-gateway-session-delivery.md) — the fifth part of plan 8, the MCP gateway (12 tasks): every start and resume decides what its session gets (`isolated`, `unisolated`, `fallback`, `unsupported`) and, inside its own transaction, mints a session token and hands the hat's connections mounted on the host plus its local stdio servers (`GET/PUT /api/mcp/stdio-servers`, env values sealed per row, step-up); every site that ends a session's right to MCP revokes its token in its transaction and, once that commits, ends what is open on it (`commit_then_cut`, a source audit); a host revoke cuts at once; an upstream's `Mcp-Session-Id` is bound to the token and connection by HMAC, `Last-Event-ID` goes up only beside one, a JSON answer has a 60 s deadline; a hat's purge runs the gateway's part first; a token an agent prints is stored, published and logged redacted; `HostItem.mcp_delivery` and `SessionDetail.mcp_delivery`; `mcp_isolation_unavailable` is 409 on every path. Amended after the security review of 2026-10-03 and its re-confirmation; executed 2026-10-03, rebased onto `a3146be6` and reverified 2026-10-12: 1736 Rust tests, 1303 web tests (73 files), 132 probe anchors matched once; the historical result is 131 BITE and [11] INERT (see its "Execution status"). Deferred: the proxy's early-reject drain. Open for the maintainer: whether a connection change cuts open streams, redacting echoed stdio values, and a default-hat change revoking nothing.
   - [OAuth MCP connections (8f)](plans/2026-10-15-gateway-oauth.md) — the sixth part of plan 8, the MCP gateway (10 tasks): discovery, DCR and pre-registered clients, PKCE consent, callback, sealed grants/secrets, refresh, probe and Web Push notices. Task 10 shares failed attempts, backs off unavailable/unsaved issuance, retires only HTTP 400 invalid_grant, preserves expired Unsaved as credential_unsaved, guards status with token-read stamps and clears Attempts after committed credential changes. Parent-authorized boxing keeps the stamp while clearing the enum-size Clippy errors. Base `94121391` retains 8e, 4e-i, 4e-ii-a and #130: 1948 Rust tests, 382 gateway tests, 1465 web tests (84 files), browser 58 passed / 11 skipped. Boxing races in four copies × two rounds: 24 runs / 1144 passes; before boxing, four copies × three rounds: 36 runs / 1716 passes. Fresh v5 replay: 397 blocks, 57 files, 20 snapshots and complete tree match. 384 anchors, 383 BITE plus accepted C23; all 26 final confirmation probes BITE, and PX16 freshly BITE after boxing. Task 10 scoped re-review CONFIRMED WITH NOTES; four parent rulings implemented, final follow-up review requested. Refresh-lock/probe-slot pruning and PQ1–5 remain open with defaults unchanged; see Execution status. Opener-null in 4e-ii remains required before consent-popup shipping.
   - [Image attachments (6a)](plans/2026-10-07-images.md) — plan 6a (6 tasks): the collector checks a prompt's content before anything is written, stores its images as content-addressed files (`attachments`, `event_attachments`) referenced from the turn and its `user_turn`, serves them at `GET /api/attachments/{sha256}`, and reports their size at `GET /api/settings/attachments`; the host announces `images`, reads 32 MiB frames, and refuses images to an agent that takes none. The API only. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Session list and search (6b)](plans/2026-10-07-session-list.md) — plan 6b (7 tasks, two PRs): the `title` and `commands` extracts (a load's replay included, an early title only filling an empty one), commands in the catalogue and `catalog_changed` as the catalogue stands, fixed-width stamps and recency moved only by listed events, `GET /api/sessions` (keyset pages, a search over title, cwd, branch and id across every lifecycle, `hat` refused until hats), a list item under 1 KiB whatever the agent reports, the detail built from it with the model and mode; then the `git_state` body and the host's git probe, off the actor and bounded to 3 s (6b-ii). Amended after two security reviews of 2026-10-02; executed 2026-10-02 as PRs #46 and #48 (see its "Execution status").
   - [Release build (7a)](plans/2026-10-07-release-build.md) — the first part of plan 7, distribution (4 tasks): OpenSSL built into release binaries (`vendored-openssl`), `hennery collector healthcheck`, cargo-dist's archives and installers built and checked in CI (`build.yml`; the installer hardened to refuse what it cannot check), and the collector image started and checked. Nothing publishes; packaging/README.md lists what publishing needs. 7b (managed runtime), 7c (services), 7d (doctor) and 7e (Nix) follow. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [`close_range` (7a-ii)](plans/2026-10-10-close-range.md) — one task: on Linux 5.11 and later, an adapter's spawn marks every inherited descriptor close-on-exec with one `close_range`, past the closing loop's 65536 cap, with the loop as the fallback; CI raises its hard descriptor limit so the test can hold one past the cap. Handed over by the debt lane. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Services, supervisor and host lock (7c)](plans/2026-10-09-services.md) — the third part of plan 7, distribution (4 tasks): `host.lock` and `up.lock`; `up` restarting a crashed child with a backoff (1 s to 60 s) and giving it up after ten crashes in five minutes, with `<data>/supervisor.json` for `status` and `doctor`; `hennery service install|uninstall|status` with the login shell's PATH, a launchd user agent or a systemd user unit, linger advised and WSL explained. Amended after the security review of 2026-10-01; executed 2026-10-02 as PR #42 and its stacked follow-up (see its "Execution status").
   - [Rotating logs and children that die with up (7c-iii)](plans/2026-10-11-logs-parent-death.md) — 7c's two gaps (2 tasks): run by a service, `up`, the collector and `host run` each write a rotating log of their own (`hennery-<process>.log`, 10 MiB × 5) in §8's directory or `HENNERY_LOG_DIR`, so launchd's `<role>.log` gets crash output only; and every child of `up` holds the read end of a pipe only `up` writes to, so a killed `up` leaves no child holding the port or `host.lock`. Amended after the security review and the plan review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Project picker (6c)](plans/2026-10-07-projects.md) — plan 6c (6 tasks): the probe map shared with hats' `resolve_path`, workspace roots in `host.toml` or `--workspace-root`, `list_projects` and `browse_directory` behind the browse fence, `GET /api/hosts/{id}/projects` and `…/browse` with the 60 s cache, and recents per hat, shown for the hat a path resolves to. Amended after the security review of 2026-10-01 and, for hats 5a, of 2026-10-02; executed 2026-10-02 as PRs #41 and B (see its "Execution status").
   - [`hennery doctor` (7d)](plans/2026-10-13-doctor.md) — plan 7d, distribution, in two PRs. 7d-i (3 tasks): `hennery doctor [--data-dir]` reads only, and says `ok`, `warn` or `fail` with a fix for checks 1 (the binary and the set present), 2 (glibc ≥ 2.28 by its loader's banner, kernel ≥ 4.18, NixOS without nix-ld), 5 (the service's PATH and its drift), 6 (nesting variables, root), 9 (disk, outbox, orphaned outboxes), 10 (the service, `up`'s children as `service status` judges them, restart needed by the running executable's identity), 11 (another `hennery` on PATH), 12 (the set against the pin, the hold), 14 (`host.lock`'s holder without taking it, the directory's and key's modes) and 17 (`--use-cli`); it exits 1 only on a failure. [7d-ii](plans/2026-10-14-doctor-ii.md) (3 tasks) adds checks 3 (each adapter answers `initialize` as the host would start it, its group killed after; on macOS a silence only warns), 4 (each CLI logged in, by its exit code alone), 7 (the collector step by step: URL rule, DNS, TCP, TLS, `/healthz`, then a `hello` only while no host holds `host.lock`), 8 (the clock against the collector's `Date`), 13 and 17's gap (the bundled CLIs against the terminal's and the overrides), and 16 (listeners and `public_url`); `probe_agents` and check 15 wait for their lanes. Amended after the security reviews of 2026-10-02; 7d-i and 7d-ii executed 2026-10-02 (see their "Execution status").
   - [Nix package (7e-i)](plans/2026-10-12-nix-package.md) — 2 tasks: `nix build` gives `hennery` (crane, on nixpkgs' own toolchain and OpenSSL), and `nix flake check` runs the package, clippy, rustfmt and cargo-audit against a pinned advisory database, on Linux and macOS in a new CI job on every PR. The adapter and frontend derivations and the NixOS modules are 7e-ii's. Amended after the security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [Nix web UI (7e-ii-b)](plans/2026-10-20-nix-web.md) — 3 tasks: the web UI as a derivation of its own (`nix/web.nix`: `fetchPnpmDeps` with `fetcherVersion = 4` on nixpkgs-web's `pnpm_12`; one dependency hash for every system, as the fetcher's `--force` takes every platform, so no `supportedArchitectures`; pnpm 12's `v11/links` dropped before the fetcher's fixup), embedded in the package through `HENNERY_WEB_DIST` with `HENNERY_WEB_REQUIRE=1`, a `web-ui` flake check on the binary, reference guards on both, and `packaging/update-web-hash.sh` for every change to `web/pnpm-lock.yaml`. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Managed runtime and pinned adapters (7b)](plans/2026-10-08-managed-runtime.md) — plan 7b (7 tasks, two PRs): the adapter manifest (`adapters/manifest.json`, compiled in) and its generator `hennery-pins`, the pin-bump job, the installer (resumable verified downloads, safe extraction, sets with `current`/`previous`, rollback hold, collection), `hennery host adapters update|rollback`, `join` installing the runtime, `host run`'s default agents from the installed set, and `--use-cli`. Pins proposed, operator to confirm. Amended after the security review of 2026-10-01 and the plan review of 2026-10-02; executed 2026-10-02 as PR #51 and its stacked follow-up (see its "Execution status").
   - [Web Push: the VAPID key, subscriptions and hat policies (10a)](plans/2026-10-14-push.md) — the first part of plan 10, Web Push (2 tasks): `<data>/vapid.key` (made once, never replaced; a damaged, symlinked, FIFO or readable one stops the start), the RFC 8292 token signed by hand with `p256` (ES256 as raw `r ‖ s`, checked against RFC 6979's and RFC 8292's vectors), push subscriptions that end with the signed-in session that made them (subscribing needs step-up; a push service's rotation needs none), endpoints checked as `https` on a public domain name and stored as parsed, per-hat push policies, the push contact in `GET/PATCH /api/settings`. Nothing is sent: delivery and the triggers are 10b's. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Web Push: the push triggers (10b-i)](plans/2026-10-15-push-triggers.md) — the second part of plan 10 (3 tasks): `pending_opened` carries the question's title from the host; the store reports the push edge a host fact crosses (a turn blocked on its first question, a turn ended `completed` or `failed`), read in the fact's own transaction with the session as it left it; one function decides what notifies; a per-tag coalescing queue that never blocks ingest; a resent backlog notifies only once reconciled and only what still holds; a question asked again after a withdrawal is quiet. A question outside a turn is an edge of its own; it notified nothing here, and 10b-iii makes it notify (the operator's decision). Nothing is sent: delivery is 10b-ii's. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Web Push: delivery (10b-ii)](plans/2026-10-17-push-delivery.md) — the third part of plan 10 (2 tasks): the collector sends its notices. Each goes to every subscription of the owner's under the hat's policy (muted, generic title, details), encrypted to the browser (RFC 8291, `web-push-native` with default features off), signed with 10a's VAPID token (reused until an hour before it expires), padded to 512-byte buckets, `TTL` 3600 and `Urgency` high or normal, never `Topic`. It goes through the shared egress client, public addresses only; one `Egress` is built in `main.rs` and the gateway shares it. A 429, 5xx, timeout or failed connection is retried (1 s, 4 s, `Retry-After` up to 10 s; 10 s a try, 30 s a subscription); 404/410 removes the subscription and expired ones are pruned, an outcome landing only on the endpoint pushed to. Amended after the security review of 2026-10-02, its re-confirmation and the whole-branch review; executed 2026-10-02 (see its "Execution status").
   - [Web Push: a question outside a turn notifies (10b-iii)](plans/2026-10-16-push-outside-turn.md) — one task, the operator's decision of 2026-10-02: a question opened while no turn runs notifies "needs your answer" like a blocked turn, under 10b-i's rules. Only the first open question notifies; one asked again after the agent withdrew one is quiet until the owner's next prompt, ordered by event id (sessions migration 11: `pending.opened_event_id`, `events_by_kind`); a resent question notifies after reconciliation if still open. A blocking question with no turn id gets the same bound. Amended after its review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Session delete (9a)](plans/2026-10-15-session-delete.md) — the first part of plan 9, delete and purge (3 tasks): `DELETE /api/sessions/{id}` behind step-up closes an attached session first, then deletes its events, turns, questions, answers, catalogue and project recent, and its images once no turn or event of any owner names them (`turn_attachments`); a scrubbed tombstone and one `session_deleted` event remain, triggers refuse any write for it, its host's frames are acked and discarded and its adapter is closed at the next handshake, or at once if the host reconnected during the delete; `secure_delete` on. The orphan sweep (9b) and the per-hat purge (9c) follow. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [The client view: the display fold (4a-i)](plans/2026-10-16-view-fold.md) — the first part of plan 4, the frontend (4 tasks): a pure crate, `hennery-view`, folds a session's stored events into the display items every client renders (client view spec §3): `user_turn`, `message`, `thinking`, `tool_call`, `plan`, `question`, `marker` and `unrecognised`, with ids stable for the session's life and the version of their last change. Groups cut at each prompt, every merge kept inside its group; tool calls merged without erasing, their output read from every shape, with the fabrication warning; questions parsed for their cards, with a monotonic verdict and `answerable` from the server's pending set; anything unknown kept as an `unrecognised` item, its JSON as text. Every agent string and count is capped, and a turn past its budget is elided behind one marker. `apply` and `take`. Golden tests over scrubbed recordings of `claude-agent-acp` 0.81.0 and `codex-acp` 1.13.0. Nothing serves the items yet: the view API is 4a-ii's. Amended after the security review of 2026-10-02, its re-confirmation and the plan review; executed 2026-10-02 (see its "Execution status").
   - [The client view: the view API (4a-ii)](plans/2026-10-17-view-api.md) — the second part of plan 4, the frontend (5 tasks): the collector serves 4a-i's display items to every client, folding the stored events as it is asked; nothing new is stored and no migration is added. `GET /api/view/sessions/{id}` answers a page of whole turns, the newest first, within a byte budget; `GET /api/stream/view/sessions/{id}` streams whole items as they change, resumable from `Last-Event-ID` or `?after=<epoch>:<revision>`, with `catalog_changed`, `session_removed` and `resync_required`; `GET /api/view/sessions` and `GET /api/stream/sessions` serve the session list as summaries, with `question_waits` and the count of sessions waiting (`waiting`, `waiting_changed`), the stream holding 250 ms after a ring and sending a summary only when it changed; `GET /api/view/sessions/{id}/turns/{turn_id}` gives the prompt of a turn not delivered, for "send again". Every route is behind `operator_only`; an unknown or foreign session is 404 before anything is read; each stream takes the hub as a doorbell and reads the store from its own cursor, through a queue bounded by count and bytes. 18 new owner-filtered statements, in the owner audit; one parser for the list's filters; `hennery-view`'s generator writes `web/src/generated/view.ts` and its schema, checked in CI. Amended after the security review of 2026-10-02, its re-confirmations and the plan review; executed 2026-10-03 (see its "Execution status").
   - [The orphan sweep (9b)](plans/2026-10-17-orphan-sweep.md) — the second part of plan 9, delete and purge (1 task): at the collector's start and then hourly, the owner's image rows that no turn or event references go, then the files in `attachments/` that no owner's row names and leftover `.tmp` files, each only past a one-hour grace; only regular files with a hash or a temporary name, never through a link, listed outside the store's lock and removed in batches under it, stopping at shutdown; an image saved again has its time refreshed. Covered by plan 9's security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The per-hat purge (9c)](plans/2026-10-18-hat-purge.md) — the third part of plan 9, delete and purge (2 tasks): `POST /api/hats/{id}/purge` behind step-up refuses a default hat and a hat with a session running on a reachable host, then freezes the hat (`purged_hats`, its rules deleted; nothing enters or leaves it), deletes each of its sessions as 9a does (unreachable ones closed collector-side, `unconfirmed`), and the hat row last, its recents and push policies with it; a re-POST resumes; `GET …/purge` previews; `forget_hat` after every handshake; the WAL checkpointed once. Amended after plan 9's security review of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The agent's transcript on its host, Claude (9d-i)](plans/2026-10-19-host-transcripts.md) — the fourth part of plan 9 (4 tasks, two PRs; operator delegated, parent decided 2026-10-02): the host records each session's agent home at start in a registry of its own; a delete or a purge writes a `host_forgets` record before the scrub and sends `forget_session` when the host is ready, after every handshake and after the session closes; for Claude the host runs the adapter's `session/delete`, then removes the transcript's family and the session's `file-history`, `session-env`, `tasks` and `debug` entries through directory descriptors, never through a link, and checks afterwards; what is left is reported (kinds and counts, never paths) and listed in Settings; transcripts started after a context clear inside the agent are not removed. Codex is 9d-ii. Amended after two security reviews of 2026-10-02; executed 2026-10-02 (see its "Execution status").
   - [The agent's transcript on its host, Codex (9d-ii)](plans/2026-10-20-codex-transcripts.md) — the last part of plan 9 (4 tasks; operator delegated, parent decided 2026-10-02): the host runs the bundled `codex app-server` against the session's recorded `CODEX_HOME` only, checks `initialize`'s `codexHome`, calls `thread/delete` and checks afterwards; when the app-server cannot be used (or timed out three times in a row) codex-acp archives and the host removes the rollouts through the descriptor walk, reporting that copies may remain in Codex's database; the call shape is pinned per Codex version in the manifest, checked by `hennery-pins` and re-read at every pin bump. Amended after the security review of 2026-10-02 and its re-confirmation; executed 2026-10-02 (see its "Execution status").
   - [Delete and purge: the design record (plan 9)](plans/2026-10-21-delete-and-purge-design-record.md) — why plan 9 was built as it was: the decisions and the security reviews' amendments for 9a–9c and 9d, the operator's delegated decisions (the parent, 2026-10-02), and the evidence on Claude's and Codex's own session storage (claude-agent-acp 0.81.0, codex-acp 1.13.0, Codex 0.155.1) to re-read at a pin bump.
   - [Generic plug-in contract (C1)](plans/2026-10-26-plugin-contract.md) — generic owner/hat registration, completed activity with typed provenance, exposure bindings and durable deletion lifecycle; built first and replayed on merged design main (40 blocks, exact tree match). The PR #140 flake investigation fixed writer-registry identity lifetime test-first and rebased onto W1 main `26cc3cca`; current verification and historical replay are distinguished in its execution record. Parent re-review and Linux/macOS CI remain pending.

   - [WSS transport and diagnostics (W1)](plans/2026-10-26-wss-transport.md) — built and replayed on `8bb29904`; the maintainer-delegated review returned APPROVE AFTER AMENDMENTS, all three implemented and folded into their tasks. Draft PR #139 awaits scoped re-review, Linux/macOS CI and real-adapter/MCP acceptance; W2 remains deferred.

   - [Release foundation (R1)](plans/2026-10-28-release-foundation.md) — built with digest/run-attempt approval, protected publication boundaries, retained-candidate recovery, SPDX/notices/source, the hardened installer and immutable flake identity. Built-first verification and replay are recorded in the plan; parent review, the authorized tag-creation ruling and native Linux CI remain pending. No publication is enabled.

## Maintainer decisions (2026-09-27)

Every open design decision is resolved; the specs carry the details.

| # | Question | Decision | Where |
|---|---|---|---|
| 1 | `master.key` in the OS keystore | No — a 0600 file in v1; a separate OS user or container is the real protection | kernel §10 |
| 2 | Per-hat "isolate agent user config" | Documentation only in v1 | umbrella §8.4, ACP core §15 |
| 3 | Codex sharing a composed `CODEX_HOME` | Stays on the mixed-host fallback until measured | umbrella §8.5, ACP core §6 |
| 4 | Headless macOS hosts | A logged-in user is required in v1 | distribution §6.2, §13 |
| 5 | "Use my own CLI" | Advanced install option (`--use-cli`), not the default | distribution §13 |
| 6a | Attachment size cap | None in v1; disk usage shown in Settings | ACP core §15 |
| 6b | VAPID contact | Not asked at setup; derived from `public_url`, optional in Settings | kernel §6 |
| 6c | Multiple listeners | Supported; browser access stays bound to `public_url` | kernel §7 |
| 6d | Static-token header | Header name plus optional value prefix | gateway §1 |
| 6e | Windowing threshold, vendor token behaviour, `GET` SSE | Measured once the code exists | frontend §15, gateway §13 |
| 7 | Plain `http` to a LAN MCP server (operator, 2026-10-02) | Only for a connection marked "internal network", and only to internal addresses; a public address stays `https` only | kernel §7.1, gateway §5.7 |

---

_Generated with Claude AI — please review before distribution._
````

### File `docs/release-process.md`

<!-- r1:file task=5 path=docs/release-process.md sha256=00685922b60af43c548b2909cf826e3b8df0131c879e9f2d507490630d87036d bytes=14827 mode=644 encoding=utf8 -->
````markdown
# Release process

R1 implements the release foundation. No version, channel or external service is
authorized to publish by merging it. There are no published releases yet. The
first approved version is `0.1.0-alpha.1`, GitHub only; `0.1.0` follows after the
normal channel acceptance gates. crates.io and GHCR are built in parallel and
need separate maintainer go-ahead. Homebrew, Intel macOS, GNU archives, native
packages, repositories, notarization and public caches retain their design gates.

## Maintainer setup before any release

1. Review R1 and the enabled channel implementations, then prepare a release PR
   with one workspace version, exact internal crate edges, matching web metadata
   and a tracked `CHANGELOG.md` (copied verbatim to the release notes). R3 owns the version/metadata edits while it runs in parallel.
   Record platform floors actually tested, runtime pins, security changes,
   migrations/config changes, backup/restart needs and known early-testing limits.
2. Create the protected `release` environment. Use
   `.github/release-environment.example.json` with the actual maintainer's numeric
   user ID replacing 0; explicitly set `can_admins_bypass: false`. This is a
   sole-maintainer project, so self-review is allowed, but only configured user
   reviewers can authorize. Apply the exact `main` branch policy from
   `.github/release-branch-policy.json`. Every signing/publishing job, including
   reusable callers and retries, must use this environment. A gate job elsewhere
   cannot lend approval to another job.
3. Review and apply release-tag rules. `.github/release-tag-ruleset.json` is the
   safe frozen state: `v*` creation, update and deletion are denied with no bypass,
   including administrators. **The authorized tag-creation path needs a parent
   ruling:** GitHub's restrict-creations rule permits creators through a bypass
   list. R1 does not silently introduce that exception. Keep publication disabled
   until the design and enforceable creation policy agree. Never move a published
   tag, disable a rule to get around it, or retag a version. Annotated tags only;
   if a personal signing key is chosen, verify its approved fingerprint as well.
4. Provision private versioned S3 candidate and audit buckets with Object Lock.
   Enforce COMPLIANCE retention (at least a year) **and legal hold ON**, deny
   deletion, versions without retention, hold removal by the CI principals and
   unconditional/overwriting writes. Keep holds until every enabled channel and
   public-path acceptance is complete. Source/release retention is a separate,
   longer-term obligation. No automatic cleanup releases holds.
5. Create `release-staging`, limited to approved `v*` tags, with storage-only
   credentials. Configure `RELEASE_CANDIDATE_BUCKET`, `RELEASE_CANDIDATE_REGION`,
   `RELEASE_CANDIDATE_STAGE_KEY_ID/KEY` and the separate
   `RELEASE_CANDIDATE_READ_KEY_ID/KEY`. The staging principal may conditionally
   create and inspect held candidate objects, never overwrite/delete; the reader
   may get exact versions and inspect their retention/legal holds. Enable
   `RELEASE_CANDIDATE_STORAGE_ENABLED` only after the bucket policy is reviewed.
6. Configure `RELEASE_AUDIT_BUCKET` and `RELEASE_AUDIT_WRITE_KEY_ID/KEY`, restricted
   to conditional held writes under `audit/<run>/<attempt>/`. Approval receipts
   are persisted there before signing or each public write. If ordinary Actions
   read access cannot see complete ruleset bypass settings, configure the separate
   `RELEASE_POLICY_READ_TOKEN` with read-only Actions/administration access. Missing
   or hidden policy fields refuse; never assume bypass is disabled.
7. For GitHub uploads, install a narrowly scoped release App on this repository.
   Set `RELEASE_PUBLISH_APP_ID/KEY` only in `release`, granting contents write and
   Actions/administration read. Its short-lived token is obtained **after** the
   in-job preflight; the job's ordinary token remains read-only. R3/R4 obtain their
   own credentials only after their preflight and revalidate before every write.
   Keep `RELEASE_PUBLICATION_ENABLED` and every channel switch unset until the
   maintainer separately authorizes that channel. No registry login, release,
   tag creation or storage provisioning is performed by this implementation.

GitHub references: [environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[tag rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
[workflow review history](https://docs.github.com/en/rest/actions/workflow-runs#get-the-review-history-for-a-workflow-run),
[artifact verification](https://cli.github.com/manual/gh_attestation_verify).

## Candidate and qualification

The maintainer approves the version, exact source SHA, enabled channels and
qualified targets before creating the protected annotated tag. A tag authorizes
candidate creation, not signing or publication. `release-candidate.yml` builds
fresh at that source, pins Rust 1.98.1, cargo-dist 0.30.4 and every action SHA,
uses the locked Nix Node/pnpm tools and restores no Actions cache. The UI is built
once. Native Linux x86_64/arm64 musl and macOS arm64 archives carry notices before
hashes are frozen. Each target records runner/SDK/toolchain identity and has an
SPDX 2.3 JSON SBOM, native dependencies (OpenSSL/SQLite), third-party source and
current Rust/frontend advisory reports. Missing licence text or audit findings
stop the candidate. Supplemental texts are pinned by exact upstream revision and
digest, never fetched from a moving branch during a build.

The source bundle preserves this checkout, both lockfiles, licences, test fixtures
and build instructions. Dependency source bundles contain the target's resolved
Rust build/dev graph and frontend package sources, including bundled native
source. The separate runtime inventory describes pinned Node/npm downloads and
binds the adapter-manifest digest; those payloads are not redistributed. Review
fonts/assets, notices, copyright and copyleft corresponding-source obligations
before approving publication. This report is material for that review, not a
legal clearance. A static OpenSSL/SQLite security fix needs a new application
release; updating the host's system libraries does not repair existing archives.

The global job regenerates cargo-dist's installer/formula after final archive
hashes are known. It independently verifies the checksum inventory, checks the
formula, and tests the hardened installer on all three native platforms. The
inventory binds every final payload, the source/tag, channel/target sets and the
candidate build run/attempt. `sha256.sum` covers payloads without hashing itself
or the inventory; the signed inventory covers the checksum file. Signature
sidecars are separate so there is no digest cycle. A complete native dist manifest
is augmented with an acyclic inventory of added release material. See the
[R3/R4 gate interface](../packaging/release/README.md) for contribution names.

Only this candidate workflow stages objects in the held store, after native
installer acceptance. Its immutable Actions artifacts last 90 days as a
convenience copy. They are not the durable authority. Retention receipts name
exact held object versions and the inventory digest. Failed/incomplete staging,
expired retention, missing bytes or a changed run attempt cannot be promoted.

Before publication, require completed successful exact-SHA runs from `ci.yml`,
`build.yml`, `nix.yml` (now native Linux arm64 too) and `release-tests.yml`. PR
merge refs and other SHAs do not qualify. Missing, pending, cancelled, failed,
skipped jobs or an unexpected workflow/event/repository refuse. Do the first
release's logged-in agent/platform acceptance on disposable homes: real UI,
doctor, install/restart/upgrade/uninstall, start/prompt/tool/permission/resume/MCP
and the pinned Codex delete contract. Record actual platform floors. Containers
and the local shell fixtures do not qualify native services or older OS versions.
Do not claim Intel, Alpine managed hosts or notarization from these checks.

## Publication approval and boundaries

Dispatch `release-publish.yml` from trusted `main` with the exact inventory
SHA-256, source SHA, tag, sorted JSON channels/targets, candidate run ID/attempt
and held retention-receipt version. The summary prints this tuple plus the
publishing run ID/attempt and its challenge. The environment reviewer must use
exactly `approve-release-v1:<tuple-hash>` as the review comment. Identity and
decision come from the platform's authenticated review history, never a name in
an artifact. Every rerun needs a new challenge/approval; rerun all jobs or make a
new dispatch so the summary reflects the current attempt. After any rejected review, make a
fresh dispatch; R1 conservatively refuses a run whose environment review history
contains a rejection, without guessing ordering or silently ignoring withdrawal.

The protected read-only `authorize` job first fetches held bytes and validates
this record with no publication/OIDC authority. Writer jobs may start only when
its inventory and attempt outputs match this dispatch and current attempt. This
precedes GitHub's job-level write-token/secret issuance; retrying only a writer
with a stale authorization skips it before credentials. Use rerun-all or a new
dispatch to authorize the new attempt. The in-job gates are still mandatory.

All channels use the executable `packaging/release-gate <channel>` and protected
environment `release`; its full inputs, outputs and R3/R4 migration are in the
[gate contract](../packaging/release/README.md). The root inventory digest binds
channel metadata as well as payloads. A channel-specific digest or approval ID
alone cannot authorize publication.

Each protected writer job fetches exact held versions, checks the actual bytes and
revalidates live tag, environment/rules, exact-SHA checks and approval. Only after
preflight does it obtain publication credentials. It repeats validation at the
signing/upload boundary; the uploader revalidates for **each** public write.
Approval receipts go to held append-only audit keys. The signer attests all final
payloads and the inventory and retains a downloadable Sigstore bundle. Its
provenance identifies the protected publishing workflow on `main`; the signed
inventory binds the separately qualified release source/tag. Do not mistake the
publisher workflow's source SHA for the released application's SHA.

The GitHub channel creates the release without advancing `latest`, uploads only
verified missing bytes, and fetches/hashes each result. R3 publishes its dependency
closure before the CLI, and R4 verifies both platforms before its OCI index. Keep
announcements and moving aliases held until the entire approved channel set and
public install path are healthy. Enabled channels are not a cross-registry
transaction. A job's success log alone does not establish remote publication.

## Recovery, verification and withdrawal

Never rebuild missing bytes under an old approval. Recover the exact held object
versions, verify legal holds, inventory completeness and all digests, then obtain
approval for the new publishing attempt. Reconcile **every** remote artifact,
including an upload whose response was lost. Fetch/hash remote bytes or use the
registry's authenticated content digest. Only a verified missing object may be
uploaded. A mismatch, expired/missing candidate or unverifiable remote response
stops recovery; use a new candidate and a new version where immutability demands
it. GitHub retries reuse an existing cryptographically verified Sigstore bundle
rather than overwrite it with a new attempt's different signature bytes.

The convenient installer checks embedded archive hashes but trusts the installer
script that was downloaded. The verified path first checks the inventory and
installer attestations against this repository's exact publishing workflow, then
checks the approved release source/tag and every payload digest before executing
the same cargo-dist installer. `packaging/release/verify.py` implements this path
with the pinned GitHub CLI and downloaded Sigstore bundle. It can additionally
pin the signer workflow SHA. A checksum downloaded beside a binary alone does
not authenticate its author. No public verification was run while building R1.

The installer uses a private sibling directory and an atomic exclusive hard link,
requires SHA-256, and refuses unsupported platforms, failed downloads, malformed
or missing hashes, mismatches and existing files/directories/symlinks. It installs
without sudo and starts no services or runtime downloads. For an upgrade, stop
services and explicitly remove the previously chosen user binary or select a
new empty directory; it never silently replaces another package manager's file.
Run doctor afterwards to find PATH conflicts and services needing restart.

For Nix, use an immutable release tag or its full commit in the flake reference
(`github:marcinwadon/hennery/v<version>#default` or
`github:marcinwadon/hennery/<full-source-sha>#default`) with `nix build`,
`nix run` or `nix profile install`. These are future templates until the first
authorized tag exists. The package embeds the real UI, records the source/UI/
manifest identity and retains the no-UI-store-reference guards. No public binary
cache is assumed. CI builds all three exported systems; NixOS managed hosts
still need nix-ld. NixOS/Home Manager modules and Nix adapters remain R6, not an
R1 claim.

Public-path acceptance belongs to the maintainer after authorized publication:
verify signatures in scratch homes, install each enabled channel, load the UI,
run doctor and a disposable session, and record OS/architecture/source/digests.
Only then update the main README's no-release statement and announce.

Before a rollback, stop services and preserve a complete stopped-service copy of
the data directory, databases, attachments, configuration and secret keys. Check
the release compatibility record; an older binary may not read a migrated DB.
Restore a matching backup or ship a forward fix when downgrade is unsafe.
Runtime adapter rollback/hold is separate from application/schema rollback.
Withdraw a bad release with remediation, retain source and working rollback
artifacts, remove moving aliases, and publish a new patch. Never replace assets,
checksums, tags or immutable crate/image versions. Yank crates only as documented
by that channel; it does not uninstall copies or rewrite lockfiles. Security
response also revokes affected credentials and records affected digests.

Generated with Claude AI — please review before distribution.
````

### File `packaging/README.md`

<!-- r1:file task=5 path=packaging/README.md sha256=799144c3037e4ad5dd57a145d8dde54f11ccd521ce2ee7e0f77ec9d8a1df26f1 bytes=7564 mode=644 encoding=utf8 -->
````markdown
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
- **Artifact attestations** (`github-attestations = true`): they need
  `id-token: write` and `attestations: write`, and they write to the public
  Sigstore log. The README's "verified install" (`gh attestation verify
  hennery-installer.sh --repo marcinwadon/hennery`) is documented with the
  first release.
- **The Homebrew tap** (`marcinwadon/homebrew-tap`): the repository and a
  token allowed to push to it.
- **The image on GHCR:** `packages: write`, one multi-arch manifest from
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
````

### Step 3: GREEN / verification

```sh
nix develop -c cargo fmt --all --check
nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
nix develop -c cargo clippy -p hennery --locked -- -D warnings
nix develop -c cargo test --workspace --locked
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
nix develop -c cargo run -p hennery-view --bin gen-view --locked -- --check
```

### Step 4: Commit / handoff

Inspect `git diff --check` and the staged stat, commit with `git -c commit.gpgsign=false commit`, verify `git log --format='%ae' origin/main..HEAD`, and push only `plan/dist-r1` over SSH. Report the review request to the parent; no self-approval and no GitHub actions.

## Replay and probe record / exact harnesses

Historical fresh construction replays extracted 57 blocks/690 tracked files (replay-1), 58/690 (replay-2), and 58/690 (replay-3). The fourth replay verified the final shared adapter and read-only credential authorizer (60 blocks/692 files). The final Markdown serialization uses fresh `dist-r1-replay-5`, with full Rust files and a byte-preserving encoded licence; all earlier trees remain. The harness executes targeted offline suites after each task, checks every block's SHA-256/byte length and explicit file mode, then compares all tracked bytes and modes including the plan. The six Rust checks and native Nix check ran on the constructed implementation; replay never shares or rebuilds its Cargo target directory.

Save this harness under `.superpowers/sdd/release-foundation/replay.py`; run through the locked release shell with `--source "$PWD" --destination <fresh-worktree>`. The house `new-worktree.sh` creates the clean tree at the exact base in the header. After recording counts, copy only the plan execution record to the replay and compare tracked bytes/modes again. The docs record is intentionally separate from code construction. Set scratch HOME/CARGO_HOME/XDG paths before all tool commands.

### replay.py

```python
"""Extract/hash/check R1 blocks into a FRESH exact-base worktree, task by task."""
import argparse
import base64
import hashlib
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys

parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True)
parser.add_argument('--destination',type=Path,required=True)
args=parser.parse_args()
source=args.source.resolve();destination=args.destination.resolve()
base='14a754b6d9649502fcc30aae2d1f6c1c7d9def04'
plan=Path('docs/plans/2026-10-28-release-foundation.md')
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=destination,text=True).strip()==base
assert not subprocess.check_output(['git','status','--porcelain'],cwd=destination,text=True).strip(), 'replay worktree must be fresh'
raw=(source/plan).read_bytes()
blocks=list(re.finditer(rb'<!-- r1:(file|patch) task=(\d+) path=(\S+) sha256=([0-9a-f]{64}) bytes=(\d+) mode=([0-7]+) encoding=(utf8|base64) -->\n````[^\n]*\n(.*?)````\n',raw,re.S))
assert blocks, 'zero extracted blocks is not a replay'
(destination/plan).write_bytes(raw)
paths=[];task=0
patterns={1:['test_gate.py','test_retention.py','test_platform.py','test_adapter.py'],2:['test_supply.py'],3:['test_hardener.py','test_archives.py'],4:['test_*.py'],5:[]}
def verify(number):
    for pattern in patterns[number]:
        result=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p',pattern],cwd=destination,capture_output=True,text=True)
        print(f'task {number} {pattern}: exit {result.returncode}\n'+result.stdout+result.stderr,flush=True)
        if result.returncode:raise SystemExit(result.returncode)
for block in blocks:
    kind,number,name,sha,size,mode,encoding,body=block.groups()
    number=int(number);name=name.decode();size=int(size)
    assert number>=task and 1<=number<=5
    if task and number!=task:verify(task)
    task=number
    relative=Path(name)
    assert not relative.is_absolute() and '..' not in relative.parts and '.git' not in relative.parts
    if encoding==b'base64':
        assert name.startswith('packaging/release/licences/'), name
        payload=base64.b64decode(body.replace(b'\n',b''),validate=True)
        assert len(payload)==size
    else:
        payload=body[:size]
        assert body[size:] in (b'',b'\n')
    assert hashlib.sha256(payload).hexdigest()==sha.decode(), name
    if kind==b'file':
        path=destination/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(payload);path.chmod(int(mode,8))
    else:
        subprocess.run(['git','apply','--whitespace=error','-'],input=payload,cwd=destination,check=True)
    paths.append(name)
verify(task)
assert len(paths)==len(set(paths))
expected=set(subprocess.check_output(['git','ls-files','-z'],cwd=source).decode().strip('\0').split('\0'))|{str(plan)}
actual=set(subprocess.check_output(['git','ls-tree','-r','--name-only','-z',base],cwd=destination).decode().strip('\0').split('\0'))|set(paths)|{str(plan)}
assert expected==actual, (expected-actual,actual-expected)
for name in sorted(expected):
    assert (source/name).read_bytes()==(destination/name).read_bytes(), 'tree bytes differ: '+name
    assert stat.S_IMODE((source/name).stat().st_mode)==stat.S_IMODE((destination/name).stat().st_mode), 'mode differs: '+name
print(f'extracted blocks={len(blocks)}; exact tracked tree match={len(expected)} files',flush=True)
```

These are the exact guard-removal harnesses. Each uses separate fresh copies, runs the tests and requires a nonzero result. They never change the implementation or call a registry/platform. Each original root is retained; for a repeat choose fresh roots (the final rerun inserts `final-verification/` into each root). Start with a passing unmodified suite. Logs remain alongside every probe. The 49 barriers comprise 26 core, 9 additional, 3 final, workflow selection, immutable receipt location, and 9 credential/channel barriers.

### probes.py

```python
"""Mutation probes in fresh directories; never edits the working implementation."""
import ast
from pathlib import Path
import shutil
import subprocess
import sys

root=Path.cwd()
base=root/'.superpowers/sdd/release-foundation/probes'
base.mkdir(exist_ok=True)
# Select each independent safety barrier by its stable refusal text. Removing
# diagnostics alone can still fail closed at a later barrier; those are not
# claimed as security-effect probes.
cases=[
 ('inventory-digest','gate.py','inventory digest mismatch'),
 ('candidate-bytes','gate.py','candidate digest changed:'),
 ('candidate-completeness','gate.py','candidate contains unapproved/missing files'),
 ('environment-no-bypass','gate.py','release environment missing or bypass'),
 ('environment-branch-policy','gate.py','release environment branch restrictions missing'),
 ('environment-exact-main','gate.py','release jobs must run from protected main only'),
 ('frozen-tag-operations','gate.py','release tag creation/update/deletion'),
 ('annotated-tag','gate.py','release tag missing or not annotated'),
 ('tag-exact-sha','gate.py','release tag moved/deleted'),
 ('exact-source-checks','gate.py','checks are not on exact source SHA'),
 ('trusted-check-repository','gate.py','untrusted check repository'),
 ('trusted-workflow-event','gate.py','untrusted check workflow/event'),
 ('successful-checks','gate.py','missing, pending or unsuccessful checks'),
 ('candidate-attempt','gate.py','candidate run attempt changed'),
 ('publishing-attempt','gate.py','publishing run attempt changed'),
 ('publishing-main-dispatch','gate.py','unexpected publisher workflow/ref/event'),
 ('authenticated-approver','gate.py','approval absent/rejected or unauthorized actor'),
 ('remote-reconciliation','gate.py','remote upload ambiguous or differs'),
 ('retention-version','retention.py','candidate storage is not versioned'),
 ('retention-compliance','retention.py','candidate storage must use compliance retention'),
 ('retention-hold','retention.py','candidate legal hold missing'),
 ('retention-expiry','retention.py','candidate retention expired'),
 ('publication-switch','publish.py','publication is disabled'),
 ('remote-byte-check','publish.py','remote artifact mismatch/unverifiable'),
 ('payload-contract','supply.py','required release/channel payload missing'),
 ('prerelease-channels','supply.py','prerelease channels are GitHub only'),
]
for index,(name,filename,message) in enumerate(cases):
 directory=base/f'{index+1:02}-{name}'
 directory.mkdir(exist_ok=False)
 shutil.copytree(root/'packaging',directory/'packaging',ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copytree(root/'.github',directory/'.github')
 path=directory/'packaging/release'/filename
 text=path.read_text();lines=text.splitlines(keepends=True)
 tree=ast.parse(text)
 matches=[node for node in ast.walk(tree) if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call)
          and ((isinstance(node.value.func,ast.Name) and node.value.func.id=='require') or
               (isinstance(node.value.func,ast.Attribute) and node.value.func.attr=='require'))
          and message in ast.get_source_segment(text,node)]
 if len(matches)!=1:raise SystemExit(f'{name}: expected exactly one guard, got {len(matches)}')
 node=matches[0]
 lines[node.lineno-1:node.end_lineno]=[' '*node.col_offset+'pass  # removed by mutation probe\n']
 path.write_text(''.join(lines))
 output=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p','test_*.py'],cwd=directory,capture_output=True,text=True)
 (directory/'result.log').write_text(output.stdout+output.stderr)
 if output.returncode==0:raise SystemExit(f'SURVIVED: {name}')
 print(f'killed: {name}',flush=True)
print(f'{len(cases)} independent guard probes killed',flush=True)
```

### extra-probes.py

```python
import ast
from pathlib import Path
import shutil,subprocess,sys
root=Path.cwd();base=root/'.superpowers/sdd/release-foundation/probes-extra';base.mkdir(exist_ok=False)

def run(name,file,mutate):
 d=base/name;d.mkdir()
 shutil.copytree(root/'packaging',d/'packaging',ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copytree(root/'.github',d/'.github')
 p=d/'packaging/release'/file;p.write_text(mutate(p.read_text()))
 r=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p','test_*.py'],cwd=d,capture_output=True,text=True)
 (d/'result.log').write_text(r.stdout+r.stderr)
 if r.returncode==0:raise SystemExit('SURVIVED: '+name)
 print('killed: '+name,flush=True)

def remove_require(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and message in ast.get_source_segment(text,n)]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  n=matches[0];lines=text.splitlines(keepends=True);lines[n.lineno-1:n.end_lineno]=[' '*n.col_offset+'pass\n'];return ''.join(lines)
 return mutate

def disable_if(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.If) and len(n.body)==1 and isinstance(n.body[0],ast.Raise) and message in ast.get_source_segment(text,n.body[0])]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  matches[0].test=ast.Constant(value=False);return ast.unparse(tree)+'\n'
 return mutate

run('bound-authenticated-review','gate.py',lambda s:s.replace("r.get('comment') == challenge(context)",'True').replace("review.get('comment') == challenge(context)",'True'))
run('licence-freeze','supply.py',remove_require('unresolved licence findings'))
run('archive-byte-map','supply.py',remove_require('approved binary inventory differs'))
run('archive-sidecar','supply.py',remove_require('per-archive checksum sidecar differs'))
run('archive-payload-set','supply.py',remove_require('release archive content inventory differs'))
run('protected-privileged-job','workflow_policy.py',disable_if('protected release environment required'))
run('both-in-job-gates','workflow_policy.py',disable_if('live preflight and boundary gates required'))
run('post-gate-credential-acquisition','workflow_policy.py',disable_if('publication credentials must be acquired after preflight'))
run('signing-upload-boundary','workflow_policy.py',disable_if('signing/upload must follow boundary revalidation'))
print('9 additional guard probes killed',flush=True)
```

### final-probes.py

```python
import ast
from pathlib import Path
import shutil,subprocess,sys
root=Path.cwd();base=root/'.superpowers/sdd/release-foundation/probes-final';base.mkdir(exist_ok=False)

def run(name,file,mutate):
 d=base/name;d.mkdir()
 shutil.copytree(root/'packaging',d/'packaging',ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copytree(root/'.github',d/'.github')
 p=d/'packaging/release'/file;p.write_text(mutate(p.read_text()))
 r=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p','test_*.py'],cwd=d,capture_output=True,text=True)
 (d/'result.log').write_text(r.stdout+r.stderr)
 if r.returncode==0:raise SystemExit('SURVIVED: '+name)
 print('killed: '+name,flush=True)

def remove_require(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and message in ast.get_source_segment(text,n)]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  n=matches[0];lines=text.splitlines(keepends=True);lines[n.lineno-1:n.end_lineno]=[' '*n.col_offset+'pass\n'];return ''.join(lines)
 return mutate

def disable_if(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.If) and len(n.body)==1 and isinstance(n.body[0],ast.Raise) and message in ast.get_source_segment(text,n.body[0])]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  matches[0].test=ast.Constant(value=False);return ast.unparse(tree)+'\n'
 return mutate

run('withdrawn-approval','gate.py',remove_require('environment review includes a rejection'))
run('immutable-licence-text','supply.py',remove_require('supplemental licence text changed'))
run('regular-archive-members','supply.py',remove_require('release archive contains nonregular payload'))
print('3 final guard probes killed',flush=True)
```

### workflow-name-probe.py

```python
import ast
from pathlib import Path
import shutil,subprocess,sys
root=Path.cwd();base=root/'.superpowers/sdd/release-foundation/probes-workflow-names';base.mkdir(exist_ok=False)

def run(name,file,mutate):
 d=base/name;d.mkdir()
 shutil.copytree(root/'packaging',d/'packaging',ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copytree(root/'.github',d/'.github')
 p=d/'packaging/release'/file;p.write_text(mutate(p.read_text()))
 r=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p','test_*.py'],cwd=d,capture_output=True,text=True)
 (d/'result.log').write_text(r.stdout+r.stderr)
 if r.returncode==0:raise SystemExit('SURVIVED: '+name)
 print('killed: '+name,flush=True)

def remove_require(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and message in ast.get_source_segment(text,n)]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  n=matches[0];lines=text.splitlines(keepends=True);lines[n.lineno-1:n.end_lineno]=[' '*n.col_offset+'pass\n'];return ''.join(lines)
 return mutate

def disable_if(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.If) and len(n.body)==1 and isinstance(n.body[0],ast.Raise) and message in ast.get_source_segment(text,n.body[0])]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  matches[0].test=ast.Constant(value=False);return ast.unparse(tree)+'\n'
 return mutate

run('all-workflow-write-authority','workflow_policy.py',lambda s:s.replace("if path.name.startswith('release-') or authority:","if path.name.startswith('release-'):"))
print('1 workflow-selection guard probe killed',flush=True)
```

### receipt-probe.py

```python
import ast
from pathlib import Path
import shutil,subprocess,sys
root=Path.cwd();base=root/'.superpowers/sdd/release-foundation/probes-receipt-boundary';base.mkdir(exist_ok=False)

def run(name,file,mutate):
 d=base/name;d.mkdir()
 shutil.copytree(root/'packaging',d/'packaging',ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copytree(root/'.github',d/'.github')
 p=d/'packaging/release'/file;p.write_text(mutate(p.read_text()))
 r=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p','test_*.py'],cwd=d,capture_output=True,text=True)
 (d/'result.log').write_text(r.stdout+r.stderr)
 if r.returncode==0:raise SystemExit('SURVIVED: '+name)
 print('killed: '+name,flush=True)

def remove_require(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and message in ast.get_source_segment(text,n)]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  n=matches[0];lines=text.splitlines(keepends=True);lines[n.lineno-1:n.end_lineno]=[' '*n.col_offset+'pass\n'];return ''.join(lines)
 return mutate

def disable_if(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.If) and len(n.body)==1 and isinstance(n.body[0],ast.Raise) and message in ast.get_source_segment(text,n.body[0])]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  matches[0].test=ast.Constant(value=False);return ast.unparse(tree)+'\n'
 return mutate

run('immutable-candidate-receipt-boundary','gate.py',remove_require('gate receipt must be outside the immutable candidate'))
print('1 receipt-boundary guard probe killed',flush=True)
```

### auth-probes.py

```python
import ast
from pathlib import Path
import shutil,subprocess,sys
root=Path.cwd();base=root/'.superpowers/sdd/release-foundation/probes-authorization';base.mkdir(exist_ok=False)

def run(name,file,mutate):
 d=base/name;d.mkdir()
 shutil.copytree(root/'packaging',d/'packaging',ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copytree(root/'.github',d/'.github')
 p=d/file;p.write_text(mutate(p.read_text()))
 r=subprocess.run([sys.executable,'-m','unittest','discover','-s','packaging/release','-p','test_*.py'],cwd=d,capture_output=True,text=True)
 (d/'result.log').write_text(r.stdout+r.stderr)
 if r.returncode==0:raise SystemExit('SURVIVED: '+name)
 print('killed: '+name,flush=True)

def disable_if(message):
 def mutate(text):
  tree=ast.parse(text)
  matches=[n for n in ast.walk(tree) if isinstance(n,ast.If) and len(n.body)==1 and isinstance(n.body[0],ast.Raise) and message in ast.get_source_segment(text,n.body[0])]
  if len(matches)!=1:raise ValueError((message,len(matches)))
  matches[0].test=ast.Constant(value=False);return ast.unparse(tree)+'\n'
 return mutate

for name,message in [
 ('protected-read-only-authorizer','a protected read-only authorization job'),
 ('authorizer-live-preflight','credential authorization must run'),
 ('direct-authorizer-dependency','writer must depend'),
 ('current-inventory-attempt','credential issuance must match'),
 ('job-failure-stops','release jobs cannot ignore'),
 ('unconditional-gate','release gates must run unconditionally')]:
 run(name,'packaging/release/workflow_policy.py',disable_if(message))
run('protected-secret-jobs','packaging/release/workflow_policy.py',lambda t:t.replace("return privileged(job) or (environment_name(job) == 'release' and name != 'authorize')","return privileged(job)"))
run('adapter-channel-override','packaging/release-gate',lambda t:t.replace('--channel|--channel=*)','--never-channel-match)'))
run('adapter-channel-abbreviation','packaging/release/gate.py',lambda t:t.replace('allow_abbrev=False','allow_abbrev=True'))
print('9 authorization/adapter barriers killed',flush=True)
```

The installer uses cargo-dist's real generated script with tiny shell executables. The CI recipe in release-tests.yml runs the pinned dist tool, generates globals, builds fixture archives, hardens, then runs all 14 installer acceptance groups. The old hardener failed on overwriting an existing install; the new one preserves existing/raced entries. Anchor changes refuse. Actual native binary acceptance remains the candidate workflow's responsibility.

The following additional nonpublishing round-trip exercises real `dist plan`, the post-notice manifest refresh, `dist build --artifacts=global`, the formula checker and all 14 installer groups. Run it only in a fresh disposable replay tree whose `target/distrib` does not exist, with `--dist` pointing at the pinned tool installed by packaging/install-dist.sh. Use the default build shell plus one-off Python (`nix develop -c nix shell nixpkgs#python3 -c ...`); the release-tools shell alone deliberately has no Cargo. It creates tiny archives for all three targets; it does not qualify native binaries or publish anything.

### dist-roundtrip.py

```python
"""Nonpublishing cargo-dist manifest/installer round-trip with tiny archives."""
from pathlib import Path
import argparse,io,json,subprocess,sys,tarfile
root=Path.cwd();sys.path.insert(0,str(root/'packaging/release'))
import gate,refresh_manifest
parser=argparse.ArgumentParser();parser.add_argument('--dist',type=Path,required=True)
binary=parser.parse_args().dist.resolve()
out=root/'target/distrib';out.mkdir(parents=True,exist_ok=False)
for target in sorted(gate.TARGETS):
 base='hennery-'+target;archive=out/(base+'.tar.xz')
 with tarfile.open(archive,'w:xz') as tar:
  entry=tarfile.TarInfo(base+'/');entry.type=tarfile.DIRTYPE;tar.addfile(entry)
  for name,data in [('hennery',b'#!/bin/sh\necho "hennery roundtrip fixture"\n'),('LICENSE',b'fixture licence\n'),('README.md',b'fixture README\n'),('THIRD-PARTY-NOTICES.txt',b'fixture notices\n')]:
   entry=tarfile.TarInfo(base+'/'+name);entry.mode=0o755 if name=='hennery' else 0o644;entry.size=len(data);tar.addfile(entry,io.BytesIO(data))
 (out/(archive.name+'.sha256')).write_text(gate.digest(archive.read_bytes())+'  '+archive.name+'\n')
 manifest=json.loads(subprocess.check_output([str(binary),'plan','--target',target,'--output-format=json'],text=True))
 manifest=refresh_manifest.refresh(manifest,archive)
 (out/(target+'-dist-manifest.json')).write_text(json.dumps(manifest)+'\n')
subprocess.run([str(binary),'build','--artifacts=global'],check=True)
subprocess.run([sys.executable,'packaging/harden-installer.py',str(out/'hennery-installer.sh')],check=True)
subprocess.run(['sh','packaging/check-formula.sh',str(out)],check=True)
subprocess.run(['sh','packaging/test-installer.sh',str(out)],check=True)
print('cargo-dist post-notice manifest / formula / installer round-trip passed; no publication',flush=True)
```

Clean Nix execution also produced `source: 23319b8ba69340aeda275edd649dcd9ff2419c7b`, UI digest `b66896142f5f1a591d376217be09df573bafb0299434f91e490da9259686ebc5` and adapter-manifest digest `4ddafe6541f44f31090aabb32b1d94bb16278e83a5b779941923e21f39ff041c`. Later gate/workflow/docs changes did not change Rust/UI/adapter-manifest bytes. This proves immutable revision identity locally; it does not create or qualify a public release tag.

## Gate interface for R3 and R4

The one adapter is `packaging/release-gate CHANNEL --candidate DIR --inventory-sha256 HEX --phase preflight|boundary --receipt NEWFILE`, in the locked release shell, with environment `release`. Channels are `github`, `crates`, `ghcr`, `homebrew`; no `r1-ghcr-gate` alias or `crates-io` spelling. The embedded `packaging/release/README.md` defines all inputs/outputs and the migration table after reading both parallel branches' real integration points (`publish-crates.yml`, `publish-crates.mjs`, `ghcr-publish.yml`, `ghcr-gate.sh`, `ghcr-publish.sh`).

The full held flat root directory and its global digest are mandatory. Materialization uses the exact S3 retention-receipt version and `retention.py fetch`, as in the common orchestrator; channel-only Actions artifacts are insufficient. Explicit channel/phase/receipt are invocation inputs; platform event and run variables supply inventory/source/tag, sorted channels/targets and candidate run/attempt, with publisher identity/attempt authenticated from GitHub. `GH_TOKEN` is the read-only evidence reader; `RELEASE_AUDIT_BUCKET` and storage-only AWS credentials permit held audit writes. Exit 0 means live validation and immutable audit succeeded; stdout is the tuple challenge, and the fresh receipt records binding/approver/decision/phase/channel. Any nonzero stops. Receipts have unique basenames outside the candidate; no cached approval output authorizes another boundary.

Only the protected manual `release-publish.yml` outer caller is accepted. Move R3/R4 final protected jobs into it, directly depend on protected read-only `authorize`, and use the exact current inventory/attempt condition plus `RELEASE_CRATES_ENABLED`/`RELEASE_GHCR_ENABLED`. Then run in-job preflight before acquiring credentials and boundary validation before each write/sign. Old `approval_record`/`APPROVAL_ID` inputs never establish authority. Reusable-job authority expansion requires a separate reviewed policy change.

R3 contributes all seven `<crate>-<version>.crate` files plus its channel inventory before freeze; its verifier still enforces channel inventory digest, source/version and dependency order. R4 contributes `ghcr-oci-layout.tar` plus `ghcr-index.json` and acceptance/SBOM material; extract working layouts outside the frozen root. `inventory.binaries[target]` gives exact executable digest/size/archive/member and is recomputed by the gate. R4 independently checks platform/index/binary digests at each boundary. Both reconcile remote bytes and retain candidates until all enabled channels/public acceptance complete. Changing any byte/channel/target needs a new inventory and approval. First alpha remains GitHub-only.

## After this plan

- Parent independent gate/security/whole-branch review, review findings addressed, and native Linux/macOS CI. No local fixture proves live platform settings or remote registries.
- Parent ruling/spec write-back for an authorized tag-creation path consistent with no-bypass intent. No tag can currently be created through the safe frozen policy.
- R3/R4 final payload and publication-job integration into the common orchestrator; the parent sequences merges. Version/exact-dependency/web/changelog release PR precedes the first candidate.
- Maintainer provisions/reviews protected environments, user IDs, fork approval, tag rules, restricted App/storage/policy principals, COMPLIANCE/legal holds and audit retention. None was provisioned here.
- Maintainer current advisory/licence/asset/corresponding-source and static OpenSSL support review; native real-agent/service/platform-floor qualification on disposable homes; per-channel go-ahead. Public-path install/doctor/UI/session acceptance only after authorized publication.
- Keep announcements/moving aliases held until the full approved set is healthy, keep corresponding source and rollback artifacts, and apply compatibility/backup rules before downgrade. Other distribution lanes retain their scope gates.
- Rebase onto design-merged main only when the parent instructs, preserving this exact-base replay as historical evidence and rerunning hotspot checks when required.

Generated with Claude AI — please review before distribution.
