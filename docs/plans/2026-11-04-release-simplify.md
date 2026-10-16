# Release simplification — implementation plan

- **Date:** 2026-10-16; filename assigned by the parent.
- **Design:** [Simplified release model (operator decision 2026-10-16)](../specs/2026-10-15-distribution-release-design.md#simplified-release-model-operator-decision-2026-10-16).
- **Phase A base:** `87cc219c`; branch `plan/release-simplify`.
- **Review amendment base:** `10abd28f` (Homebrew #155 merged, parent confirmed).
- **Execution base:** `98861052` (R4 #143 merged; Homebrew #155 already merged).
  Parent authorized Phase B on 2026-10-16; docs branch rebased onto that base.
- **Goal:** one signed-tag build/attestation run, summary approval, then draft,
  immutable release and selected channels in one protected job; no AWS/upload App.

## Execution status

**Phase B is implemented and replayed; PR #163 re-review APPROVE at `13060037`.**
The subsequent CI fixture identity fix is recorded below. Phase A's
first review verdict was **CHANGES**; **scoped re-review APPROVE at 0fddcc02 (2026-10-16)**. The parent then confirmed R4/Homebrew merged and authorized build.
The implementation keeps the accepted early-publication/denial-of-service risk;
it introduces no service, App, account, token or paid storage. No switch was
enabled, no release/tag was created or published, and no registry login occurred.

PR #163 review returned **CHANGES** at `1307f4e3`. Both findings are amended:
verifier children use credential-free allow-lists and isolated configuration,
with authenticated transport/revalidation retained in the parent; GHCR uses
deterministic missing-only referrer recovery and verifies fetched registry bundles.
The amendment evidence below records 169 release plus 22 pinned-ORAS tests,
125 image and 89 Node tests, 70 copy probes and the broker's 4×3 load runs.
The builder changed no publication/channel switches. No new service or cost.

**Latest operator decision, 2026-10-16:** all channels are being enabled for the
first release without waiting for a positive fixture. The crates bootstrap token
is set in `release`, the tap exists, and the operator supplies Homebrew/GHCR
tokens. This supersedes earlier fixture-before-enablement obligations, including
historical records below. Capture the first authentic Hennery fixture afterwards.
There is no runtime fixture-existence gate. Current prerelease/GitHub-only and
signed-source selection guards remain unchanged; `channels.json` still selects
only `github`, so the parent must resolve the tag/selection for all channels.

Tasks 1–5 are complete. Release 147, image 122 and packaging Node 88 tests
passed; the genuine pinned-gh contract has four passing tests. Actual
cargo-dist 0.30.4 installer acceptance has 20 passing checks. Workflow policy,
DAG tests, actionlint and scoped shellcheck passed. All six Rust checks passed:
workspace tests report 2,540 passed, 5 ignored and zero failures. Native macOS
`nix flake check -L --max-jobs 1 --cores 4` passed. Initial capacity failures
were recovered after shared space returned, without changing a test or rule.
Docker's daemon socket is absent, so real loopback-registry acceptance remains
CI-owned; native Homebrew's documented platform/CLT gate also remains open.

The task-by-task ledger and retained probe paths are in the execution record
below. Exact final file blocks and deletions supersede the original anchor-only
outline. The fresh replay extracts those blocks onto the execution base; its
actual result is recorded below, without repeating the failed heavy builds.
Independent security/whole-branch review and Linux/macOS CI remain parent-owned.

**Parent ruling on the maintainer's behalf, 2026-10-16:** no `contents: write`
outside `release`. One approved `publish` job verifies this run's artifacts,
creates/uploads/read-back-verifies the draft, publishes immutable, then runs
selected channel publication steps. The maintainer inspects the asset/digest
run summary before approval; no draft exists then. Channel folding guarantees
one approval without assuming downstream jobs inherit it. No new account,
service, infrastructure or cost may be resolved as a technical review decision.

## Scope

Carry forward R1's exact tag-signature logic, pinned public fingerprint,
bootstrap trust, licence/source and native acceptance; R3's frozen tarballs and
registry digest reconciliation; R4's OCI layout/index/source/SBOM and credential
boundary; Homebrew's actual formula acceptance and create-only publication.
Replace their old inventory/held-storage interfaces together. Ordinary CI,
supported platforms, packaged UI, runtime downloads, data compatibility and
backup obligations retain their existing contracts.

Five sequential tasks:

1. Shared checksum/tag/attestation verification and channel identity contract.
2. Single tag workflow, in-run acceptance, draft and immutable publication.
3. Homebrew/crates/GHCR verification-before-credential integration and bootstrap.
4. Remove old storage/approval paths and migrate consumer/setup documentation.
5. Guard probes, one fresh replay, complete verification and execution record.

Out: real tag creation, release/registry publication, settings changes, real
credentials, new runners/services, Intel/GNU platforms, native binstall enabling
and paid infrastructure. First alpha remains GitHub-only. Parent authorization
covered implementation after the confirmed merges; every enablement remains
a maintainer-only action.

## Decisions

1. Operator, 2026-10-16: sign source with the YubiKey; final bytes are authenticated
   by exact tagged-workflow attestations and `SHA256SUMS`. No detached inventory
   signature or authenticated digest/run approval tuple remains.
2. Preserve the three native archive targets. Qualification and selected-channel
   acceptance belong to the same tag run; no promotion of PR/main artifacts.
3. Reviewed `packaging/release/channels.json` binds selection into signed source;
   retain channel ownership/name uniqueness and default-off enable switches.
4. Keep `.github/workflows/release.yml` as the sole publishing orchestrator and
   final verifier/trusted-publisher identity. Existing release refusal CI remains
   non-publishing CI. Dedicated attestation authority precedes publish approval.
5. One checksum list covers global/selected-channel payloads and metadata;
   authenticate checksum file and each payload with provenance. Channel manifests
   remain typed metadata, not independent authorization roots.
6. Missing bytes fail closed; published immutable GitHub assets supply channel
   payloads with the original run binding. Within 30 days/50 reruns use only
   publish-job retries under renewed approval: accepted attesting attempt and
   artifact IDs stay fixed while the publishing attempt changes. No “rerun all”,
   old-version rebuild, overwrite or new storage fallback. Beyond the window,
   document the incomplete old release and roll forward to a new signed version.
7. Bootstrap is an explicit temporary mode of the protected crates step, using
   R3's frozen-byte uploader; normal OIDC has no token fallback. Exact seven-crate
   order, per-crate trusted settings and revocation are in the design.
8. Parent, on the maintainer's behalf, 2026-10-16: all `contents: write` belongs
   to the single `release` job, including draft upload. Review an exhaustive run
   summary instead of a draft before approving. Build/test/attestation jobs have
   no environment or publishing credentials; permission ceiling is read-only
   contents plus OIDC/attestation write where needed.
9. Fold switched/selected channel publishers into `publish` after immutable
   publication. GitHub's documented job-level approvals do not promise inherited
   review for later jobs; this authorized option guarantees one approval per
   attempt. Accept the serial job/union-permissions trade-off. Keep channel
   acceptance job IDs/names in the registry and dedicated per-channel verifiers.
10. Verify certificate Run Invocation URI against this run and the trusted
    producing attempt/artifact IDs in addition to exact workflow/tag/source.
    Never accept an asset's own run claim as proof of which run produced it.
    **Parent ruling, 2026-10-16:** pinned `gh 2.101.0` emits the flattened
    `verificationResult.signature.certificate.runInvocationURI`. This observed
    output supersedes the reviewer's original `.certificate.extensions` path.
    Pin both CLI version and field in the real contract test; never fall back.
11. Accepted parent ruling, 2026-10-16: one approval in the authorized workflow
    is not a repository-wide publication guarantee. A writer/SSH push-key holder
    can run a branch workflow with `contents: write`, publish genuine previously
    attested bytes for an existing tag early, or freeze an incomplete immutable
    release and block that version. Consumers still reject untrusted bytes;
    early publication/denial of service remains accepted without an App/service.
    Withhold moving aliases, document the damage and use a new signed version.
12. Preserve policy rejection of reusable jobs (job-level `uses:`). Use exact
    `--cert-identity` with source/signer digest constraints, never combine it
    with mutually exclusive `--signer-workflow`. Real pinned-CLI offline
    integration tests must prove the parser/crypto contract; mocks remain for
    lifecycle failures. Bootstrap revocation applies on success and abandonment.

## Global Constraints

- Follow the named worktree's AGENTS and verification budget. No GitHub actions
  from this child other than SSH push of its own branch; parent owns PR/review.
- NEVER publish, push tags, obtain real tokens, log into registries or change
  external settings. Test with offline transports/disposable data and local
  registries only; no real private signing key or YubiKey invocation.
- All commands run from the worktree root through plain `nix develop -c`;
  release Python uses `nix develop .#release -c`. No global installs. Test homes,
  config and data are scratch. Each copy owns its own `target/`.
- Pinned action SHAs/toolchains/images, timeouts, explicit least permissions,
  cache-free release builds; no ignored selected acceptance failures.
- No weakening tests/types/rules to pass checks. Every gate gets a distinct
  refusal, observed RED and a guard-removal probe that fails an actual assertion.
- Batch probes in fresh scratch copies by guard family, clone `target/` with
  `cp -c -R`, never share `CARGO_TARGET_DIR` and never mutate the live tree for a
  probe. Keep copies for parent cleanup. Verify staged bytes equal tested bytes.

## Review Focus

Source authorization versus binary provenance; summary-before-approval and all
draft mutation inside one environment job; honest job-token timing; exact
workflow/tag/source/run identity in files, OCI and README;
complete acyclic checksums and immutable-state confirmation; skipped/failed
channel owner jobs and name spoofing; credential ordering at each boundary;
bootstrap scope/removal and no OIDC downgrade; remote ambiguity/digest refusal;
fixed attesting versus changing publishing attempts; real CLI JSON/flag contract;
accepted branch-writer early-publication/denial-of-service exposure;
removal of storage, upload App and obsolete approval requirements throughout
scripts, tests, examples and workflow policy. Review partial failure/rerun paths
as carefully as the happy path. Parent owns live setting verification and full
PR status (checks, reviewDecision, mergeStateStatus, unresolved bot/human threads).

## File structure

These were the Phase A base anchors; final replay blocks below describe the
implemented files and explicitly delete retired anchors. Homebrew is merged on the
amendment base; re-anchor R4 after its merge before implementing.

| Paths | Responsibility | Task |
|---|---|---|
| `packaging/release/tag_signature.py`, `maintainer.asc`, `test_tag_signature.py` | Preserve exact fingerprint/tag object/source behavior | 1 |
| `packaging/release/{gate,verify,supply,workflow_policy}.py`, their tests, `.github/actions/release-gate/action.yml`, `packaging/release-gate` | SHA256SUMS, provenance, name ownership and verification boundaries | 1–2 |
| `packaging/release/test_verify_cli.py`, `packaging/release/fixtures/attestation/` (new), pinned `gh` from `flake.lock` | Authentic bundle/payload/trusted-root offline contract, recorded origin/digests | 1 |
| `packaging/release/channels.json` (new), release metadata generation | Signed selection and frozen run/source metadata | 1 |
| `.github/workflows/release.yml` (new), `release-tests.yml`; remove `release-candidate.yml`, `release-publish.yml` | Single-run DAG, digest summary, one protected publisher and permission/refusal policy | 2 |
| `packaging/release/{assemble,publish}.py`, tests | Complete draft, read-back verification, immutable publish/recovery | 2 |
| `packaging/{publish-crates,crate-release,prepare-crates}.mjs`, associated tests; `packaging/release/{homebrew,homebrew_accept,homebrew_publish}.py` and tests; post-merge R4 publishers | Immutable asset input and verification before credential use | 3 |
| `packaging/release/{retention,approval,approval_summary}.py`, related obsolete tests; `settings_audit.py`, `post_setup.py`, `packaging/hennery-release` | Delete storage/signature protocol, retain applicable platform checks | 4 |
| `flake.nix`, `packaging/release/README.md`, `packaging/README.md`, `docs/release-process.md`, `README.md`, bootstrap/README guard tests, crate metadata | Remove AWS tools/interfaces and obsolete verifier/identity claims | 3–4 |
| This plan and `docs/README.md` | Exact blocks and execution/verification status | 5 |

## Task 1: shared verification contract

1. Add tests first for exact tag/key/commit and all existing signature failures;
   malformed/duplicate/unsafe checksum entries, missing/extra assets and changed
   bytes; wrong repository/workflow/branch/tag/source digest, missing or invalid
   bundle/predicate, wrong/missing certificate run/attempt or substituted artifact
   IDs; unknown/duplicate channel, name collision and wrong owner.
   Observe assertion failures against the old interface.
2. Implement a common verifier requiring tag proof plus attested checksum file
   and per-payload attestations. Preserve `tag_signature.py` cryptography while
   removing its obsolete inventory/storage coupling. Update build/freeze metadata
   and keep channel manifests digest-bound under the global list.
3. Add an offline integration test invoking the actual **pinned `gh` binary**,
   an authentic attestation bundle/original payload and trusted-root fixture,
   with isolated config and blocked network. Record fixture origin, hashes and
   CLI pin; do not mint a real tag/attestation or publish to create a fixture.
   Require real successful signature/digest verification and read the actual
   `verificationResult.signature.certificate.runInvocationURI` path.
   Compare it exactly to
   `https://github.com/marcinwadon/hennery/actions/runs/<id>/attempts/<attempt>`.
   Change expected run and expected accepted attesting attempt independently:
   both must refuse. Alter payload bytes: real CLI verification must fail.
   Exercise exact `--cert-identity` including workflow path, `--source-digest`,
   `--signer-digest`, `--bundle` and `--custom-trusted-root`; prohibit simultaneous
   `--signer-workflow`. Keep lifecycle mocks, but no mock stands in for this
   contract test. Fixture unavailability is a parent-owned prerequisite, not
   permission to weaken the test or create unauthorized public artifacts.
   **Authorized fixture scope:** authentic `sigstore/sigstore-js` proves crypto
   success and real JSON shape; production Hennery policy must reject its
   repo/workflow/ref. Substituted Hennery identity/run fields test structure
   only, explicitly labelled non-cryptographic. No real Hennery attestation is
   created by this builder. Under the latest operator decision, the maintainer
   verifies the first genuine tagged Hennery attestation and preserves it with
   its payload after the first release; it no longer gates channel enablement.
4. Run the release suite below, including the actual CLI contract; probe checksum,
   signature, identity and run-parser guards in one cloned copy. Commit tested
   task bytes and embed final source during Phase B. No speculative executable
   implementation blocks belong in Phase A.

## Task 2: one-run workflow and draft lifecycle

1. Add workflow graph/refusal tests before changing workflows: tag-only trigger,
   source/selected acceptance failure, wrong job identity, skipped required job,
   missing dependencies, switch off, branch signer, unpinned action, cache,
   excess permissions, any pre-environment `contents: write`, missing protected
   publisher, reusable jobs, absent/incomplete digest summary and premature
   credential/use. State that these police the authorized workflow, not arbitrary
   writer-controlled branch workflows.
2. Implement the design's exact job table: unprivileged build/test jobs, `attest`
   writing an exhaustive asset/SHA-256 summary, then ONE protected `publish`
   job. After approval it downloads/verifies this exact run's artifacts, creates
   and uploads the draft, reads back/verifies, publishes and requires immutability.
   Bind artifacts/certificates to this run, producing attempt and source, and
   pin artifact IDs from trusted dependencies. Job names/IDs for channel
   acceptance remain registry-owned, including aggregate jobs without matrices.
3. Test draft/read-back and publish via fake API: conflicting/missing/extra asset,
   changed tag or asset at boundary, failed/ambiguous upload or publish response,
   already immutable matching release, existing differing release and false
   immutable state. Require assertion that no publish/channel call happens on
   refusal. No clobber or implicit tag creation.
4. Implement publish-only retry validation: unchanged original artifact IDs,
   checksums/bundles, fixed accepted attesting attempt and run ID; renewed
   environment approval for the new publishing attempt. Refuse replaced/expired
   originals, “rerun all” recovery, a changed attesting attempt, no renewed
   approval, window expiry (30 days) and exhausted reruns (50). Do not compare
   original attestations to the new `GITHUB_RUN_ATTEMPT`.
5. Test ambiguous successful GitHub publication: lose the response after the
   fake server freezes the release, then retry with original inputs and fresh
   approval. Require full remote read-back verification before continuing;
   incomplete/mutable/conflicting/unverifiable state refuses. Verify the retry
   does not recreate/overwrite a matching immutable release.
6. Run actionlint and the suite; probe each transition/retry guard, commit tested
   bytes and update exact blocks.

## Task 3: channels and first claiming

1. Migrate the actual merged Homebrew/R4 interfaces and R3 to download immutable
   release assets. Verify checksums, attestations, tag and channel/source closure
   before secret exposure/OIDC/login, then revalidate at each upload boundary.
   Invoke their distinct publishers as selected/switched steps after immutable
   publication in the SAME `publish` job, with step-scoped secrets. This retains
   one approval and prevents any channel from bypassing failed publication.
2. Add one negative case per channel switch/selection/dependency and credential
   boundary; retain remote digest matching, create-only and lost-response tests.
   For GHCR bind OCI files to the expected pushed manifests/index and SBOM;
   verify through read-only/local inputs before dedicated registry authentication.
   Add separate failure/recovery cases after Homebrew success/ambiguous update,
   each crate upload and crates completion, GHCR blob/manifest/index and channel
   completion, and final selected-channel completion before announcement.
   Each retry must reconcile remote digests, skip matching completed work,
   upload only absent content and refuse conflicts/ambiguity. Assert no moving
   aliases or announcements on partial completion; window exhaustion documents
   the incomplete version and requires a new signed version.
3. Add bootstrap-mode tests: explicit off default, missing/expired/wrong-scoped
   token failure, no fallback from OIDC, missing per-crate trust, exact topo order,
   existing differing checksum, partial retry and revocation/cleanup on both
   success and abandonment (including failures without an authorized immediate
   retry); revoke/remove old bootstrap authority before a fresh retry token.
   Fake tokens only. Reuse frozen-byte HTTP framing; never repackage accepted tarballs.
4. Run targeted Node/Python publisher tests and available local registry/formula
   acceptance from the merged plans; probe every new guard, commit and embed.

## Task 4: retire obsolete paths and migrate bootstrap

1. Remove old candidate/qualification dispatch, S3/retention/audit credentials,
   `release-staging`, upload App, inventory signing and audit-tuple interfaces,
   AWS-only dependencies and obsolete tests. Keep current independent refusal
   coverage for every surviving boundary; rewrite it against the new contract.
2. Test the exact README verify-then-run block, including under an enclosing
   conditional suppressing errexit. Installed tools authenticate tag, then
   tagged provenance/checksums, before any installer/extracted code runs. Exercise
   hash-tool alternatives, missing tools, changed installer, wrong key/tag/source
   and valid branch attestation. Update installer, crate/binstall and OCI metadata
   without enabling native binstall or advertising unpublished assets.
3. Rewrite release-process/setup/packaging guidance to the new model. Historical
   plans remain evidence, with clear supersession notices rather than altered
   historical source blocks. No executable/current path may retain S3/App/signed
   inventory requirements. Run bootstrap/README tests and suite, probe, commit.

## Task 5: verification, replay and execution record

Expected commands at the final implementation head (record real counts/exits):

```sh
nix develop .#release -c python3 -m unittest discover -s packaging/release -p 'test_*.py'
nix develop .#release -c actionlint
nix develop -c node --test packaging/*.test.mjs
nix develop -c cargo test -p hennery --test readme --locked
nix develop -c cargo fmt --all --check
nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
nix develop -c cargo clippy -p hennery --locked -- -D warnings
nix develop -c cargo test --workspace --locked
nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
nix develop -c cargo run -p hennery-view --bin gen-view --locked -- --check
```

Reconcile command names with the final base before embedding. Also run the
existing pinned cargo-dist installer/formula round-trip, frozen crate/offline
registry acceptance, R4 native/local OCI checks and Nix checks affected by tool
removal. If web files change, run frozen install/typecheck/test/build and locally
run changed e2e. Use foreground sessions and logs for long commands, preserving
the real exit status. No outward publishing to satisfy acceptance.

Extract final code blocks (count must exceed zero) into one fresh replay copy
of the approved execution base, with APFS-cloned target; execute task checks
and compare all tracked bytes/modes to the tested implementation. Run the full
workspace suite once per plan at the end before first implementation review.
Load runs (4 × 3) apply only to timing/concurrency guards (registry retry/deadline
changes included if touched), otherwise explicitly skip. After review amendments,
run targeted RED/GREEN and new copy probes, both clippies/fmt/generators; no
second full replay or workspace run unless the verification budget requires it.

Update this execution record and `docs/README.md` with actual evidence, open
maintainer gates and reviewed SHA range. Check staged bytes against the tested
tree, inspect diff/rules/public-repo hygiene, verify personal author email, then
commit/push the owned branch and request independent review. No self-approval.

## After this plan

- Parent independent security/whole-branch review and full Linux/macOS PR status.
- Maintainer validates the live tag/environment/immutable controls, touch policy,
  channel credentials, per-crate trust and first-claim bootstrap/revocation.
- Maintainer platform acceptance covers both first-run and publish-only retry
  approval: first draft/write only after summary approval, channels in that job;
  renewed approval on retry, unchanged producing/attesting attempt and original
  artifact IDs, new publishing attempt and no build/attest rerun. Verify refusal
  when renewed approval is absent and when originals/window/rerun budget are
  unavailable. If GitHub reuses approval, publication stays disabled until a
  reviewed renewal gate exists. Observe real platform behavior, not only mocks.
- Every real tag, draft/public release, registry login/upload and live negative
  platform test requires maintainer authorization; no publication on merge.
- Native logged-in acceptance, current advisory/licence/source clearance and
  public install checks remain release obligations. No announcements/moving
  aliases before the whole selected set is healthy; no new platform promises.
- Parent cleans retained replay/probe copies and records durable lessons.

## Execution record (2026-10-16)

- Execution base `98861052`; rebased docs `801bb12a`, `745271b2`, `f2027abe`,
  `e218b2dd`. Scaffold `8444ea07`; shared verifier `f4ccc35f`; workflow `1e116723`;
  channels `fadc6cec`; platform `d5fcb5bc`; bootstrap `639aedcb`; payload
  `bbab71ce`; retirement/integration `ab998759`; final immutable-GET refusal follows in the
  last code fix `b77d415b`. SSH pushes only, personal author.
- Controlled RED/GREEN evidence: new contract/CLI shape/identity/run failures;
  draft/publication/original-run policy failures; bootstrap and channel boundaries;
  checksum proof and omitted target; real API signature autospec; four secret
  alias/discovery policy assertions. Real GPG tags are disposable local fixtures.
- Guard copies caught 110 removal mutations across task families (12 shared,
  10 publisher, 5 channels, 34 platform, 16 bootstrap, 28 payload, 5 final migration).
  A redundant early guard was tested at the actual write boundary. Test doubles
  were strengthened where a later refusal masked removal. Root migration copy
  cloned target with host `/bin/cp -c -R`; GNU cp's unsupported `-c` failed first.
- Logs: `/tmp/release-simple-release-final.log` (147, exit0),
  `/tmp/release-simple-image-final2.log` (122, exit0),
  `/tmp/release-simple-node-final.log` (88, exit0),
  `/tmp/release-simple-cli-final.log` (4, exit0),
  `/tmp/release-simple-linters-scoped.log` (exit0),
  `/tmp/release-simple-bootstrap-integrated.log` (4+3, exit0).
  The final replay reruns the migrated suites against extracted files.
- Rust log `/tmp/release-simple-rust-gates.log`: fmt and both clippies exit0;
  workspace test compiler/linker failed101 with `No space left on device`.
  `/tmp/release-simple-workspace-retry.log`: retry with incremental cache disabled
  also failed101 on capacity; even the exit-marker write failed. Both generator
  checks exit0 in `/tmp/release-simple-generators.log`. Nix check-L failed1 in
  `/tmp/release-simple-nix-check.log`. No tests/types/rules were relaxed. Reclaimed
  only this lane's disposable compiler cache and failed test executables; no
  other lane, scratch tree, operator data or Nix store was removed. Parent was
  asked to free shared capacity. Do not treat these failures as green gates.
- After shared capacity returned, workspace tests completed once with exit 0:
  **2,540 passed, 5 ignored, zero failed**, across 173 result groups, in
  `/tmp/release-simple-workspace-capacity-restored.log`. Compiler jobs were
  limited to four and incremental cache disabled; test contents were unchanged.
  Native Nix completed exit 0 in `/tmp/release-simple-nix-capacity-restored.log`
  (`--max-jobs 1 --cores 4`). Linux qualification remains CI-owned.
- Final public-state regression: RED actual assertion when the last GET reported
  draft/mutable despite a successful publish response; GREEN seven lifecycle
  methods, then a copy mutation removing that guard was killed by an assertion.
  The final shared suite/replay includes this fix; no heavy Rust/Nix repeat is
  needed for this Python-only guard.
- **One fresh replay**, `.superpowers/sdd/release-simplify/replay-1`, from
  `98861052`: extracted **76 exact file blocks**, applied **13 deletions**, cloned
  target using host APFS copy, and matched **all 925 tracked files and modes**.
  The first comparison caught the globally ignored tracked `.envrc`; explicit
  force-staging restored the original tracked set without changing bytes.
- Replay release 147 and image 122 passed (`/tmp/release-simple-replay-checks.log`).
  Its Node invocation initially used the release shell, which lacks Cargo: three
  packaging tests failed ENOENT. Resuming in the normal dev shell passed all 88
  (`/tmp/release-simple-replay-node.log`). No source change or second copy was
  used. Workflow policy, actionlint and scoped shellcheck passed in the replay.
- Reusing an already hardened installer correctly failed the single-match guard.
  Generated a pristine global installer with the existing pinned cargo-dist
  0.30.4 tool (exit 0, `/tmp/release-simple-dist-global.log`), then used the replay's
  fixture builder/hardener and passed **20 actual installer checks** (exit 0,
  `/tmp/release-simple-replay-native2.log`). It uses tiny executable fixtures;
  native production archive/registry acceptance still belongs to release CI.
- A mistaken doubled replay working-directory prefix failed before comparison;
  the corrected source-root comparison passed every byte/mode. The recipe itself
  is carried as input and updated with this execution record; application blocks
  remained unchanged throughout the fresh replay. No empty-extraction success.
- Broad shellcheck reported existing readme-blocks.awk-string SC2016; scoped
  changed/CI shell scripts and exact README shell block passed without disabling
  a rule. Docker info failed1 (daemon socket missing); no service started.
- Timing/concurrency implementation was not changed; existing registry polling
  bounds remain. The4 × 3 load runs were skipped under the verification budget.
- One payload mutation accidentally reached read-only gh attestation verification
  (exit1). No publication/login occurred. Downstream transports were then fully
  stubbed; probe harnesses isolate configuration, clear authentication variables
  and set dead proxies. Corrected 28 payload mutations failed by assertions.
- Retained copies: this worktree's `.superpowers/sdd/release-simplify/`
  `probes-contract-1`, `probes-publish-1`, `probes-channel-1`, `probes-migrate-1`;
  sibling worktrees `release-simple-platform`, `release-simple-bootstrap`,
  `release-simple-payload` and their `.superpowers/sdd/` probes; research directory
  `/private/tmp/release-simple-gh-fixture-probe-pojNub`. Parent owns cleanup.
- Required maintainer acceptance is unchanged: first authentic Hennery positive
  fixture before any switch; real first/retry approval semantics; native platform
  and registry acceptance; bootstrap token revocation on success or abandonment.


## Replay extraction harness

Run this inside the release dev shell from the implementation root, saving it
to an ignored scratch file. Choose a fresh copy name if one already exists; do
not delete an earlier copy. It never publishes, creates a release tag or uses
credentials. Its positive extraction count and full byte/mode comparison are
required before running the checks. Run Python in `.#release`, Node packaging
tests in the normal dev shell (they call Cargo), then policy/actionlint/shellcheck.
The native installer round-trip uses the real pinned cargo-dist global template
and the extracted fixture builder/hardener. Rust and Nix checks run once on the
matching implementation under the verification budget.

```python
from pathlib import Path
import base64,hashlib,io,json,os,re,subprocess,tarfile
root=Path.cwd();plan=Path('docs/plans/2026-11-04-release-simplify.md');base='98861052'
copy=root/'.superpowers/sdd/release-simplify/replay-1';copy.mkdir()
archive=subprocess.check_output(['git','archive',base])
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:tar.extractall(copy,filter='data')
recipe=plan.read_text();deleted=json.loads(re.search(r'<!-- replay-deletions -->\n```json\n(.*?)\n```',recipe,re.S)[1])
for path in deleted:
 p=copy/path;assert p.is_relative_to(copy);p.unlink()
count=0
for match in re.finditer(r'^<!-- replay-file: (.*?) -->\n``````[^\n]*\n(.*?)^``````\n',recipe,re.M|re.S):
 meta=json.loads(match[1]);p=copy/meta['path'];assert p.is_relative_to(copy)
 raw=match[2].encode() if meta['encoding']=='utf8' else base64.b64decode(match[2],validate=False)
 assert hashlib.sha256(raw).hexdigest()==meta['sha256'],meta['path']
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);p.chmod(int(meta['mode'][-3:],8));count+=1
assert count>0
(copy/plan).write_text(recipe)
subprocess.run(['git','init','-q',str(copy)],check=True)
subprocess.run(['git','-C',str(copy),'add','-A'],check=True)
tracked=subprocess.check_output(['git','ls-files'],text=True).splitlines()
subprocess.run(['git','-C',str(copy),'add','-f','--',*tracked],check=True)
subprocess.run(['/bin/cp','-c','-R',str(root/'target'),str(copy/'target')],check=True)
expected=set(subprocess.check_output(['git','ls-files'],text=True).splitlines())
actual=set(subprocess.check_output(['git','-C',str(copy),'ls-files'],text=True).splitlines())
assert expected==actual,(sorted(expected-actual),sorted(actual-expected))
for path in sorted(expected):
 a=root/path;b=copy/path
 assert a.read_bytes()==b.read_bytes(),path
 assert bool(a.stat().st_mode&0o111)==bool(b.stat().st_mode&0o111),path
print('Extracted',count,'files;',len(deleted),'deletions;',len(expected),'tracked files/modes match',flush=True)
```

### PR #163 review amendments (2026-10-16)

- Review base `1307f4e3`, verdict **CHANGES**. High: verifier subprocess authority.
  Medium: non-deterministic, unconditional referrer attachment and local-only
  final verification. Both are fixed test-first; scoped re-review is requested.
- Four real stand-in child-process tests first failed on inherited authority.
  Six now cover release, standalone/folded image, Git/GPG, denied verification
  and parent-transport boundaries. Children get only PATH/public TLS inputs plus
  generated private configuration; GitHub, Actions/OIDC, unknown future secrets,
  agent sockets and ambient helper/config paths are absent. The parent keeps
  authenticated GitHub API access. Signed-tag logic retains its exact object,
  source and fingerprint checks in a fresh bare repository with a fixed public URL.
  The initial RED assertion printed inherited environment values; that local
  diagnostic log was redacted and restricted to mode 0600. Assertions now report
  key names rather than ambient values.
- Crates revalidation now uses bounded sequenced private pipes to the Python
  parent. Node has only its selected registry token and private configuration,
  never GitHub/OIDC tokens or verifier subprocesses. Initial broker regressions,
  strict reply bytes, sanitized failures and post-callback deadline checks were
  observed RED before their fixes. Fifteen broker and four real-Node integration
  tests pass. The final 4×3 runs passed all 19 methods each time; cleanup kills
  and reaps the child before removing its private configuration.
- Referrers use pinned canonical OCI manifests and creation annotation
  `1970-01-01T00:00:00Z`. Real ORAS 1.3.4 tests prove complete retries write
  nothing, partial retries fill only missing referrers, and ambiguous responses
  reconcile under renewed approval. Advertised but unfetchable or differing
  manifest/blob bytes refuse. A genuinely undiscoverable missing deterministic
  manifest is repaired once and read back. Existing/read-back bundles must match
  frozen bytes and all expected digests; final cryptography uses fetched paths
  and local checksum-bound OCI subjects, with no registry auth in `gh` children.
  Two fetched-subject integration regressions were RED before wiring this path.
- `/tmp/release-simple-pr163-release-final.log`: full release suite then present,
  **169 passed**, exit 0, including the four authentic pinned-gh offline tests.
  `/tmp/release-simple-pr163-referrers-final.log`: **22 passed**, exit 0, at their
  final release-suite location. All **191** methods remain discoverable by CI.
  The first image run had 22 missing-ORAS tool errors: these publisher tests now
  belong to the release suite, whose existing shell pins ORAS. No test skipped
  and no tool pin, test expectation, permission or workflow gate weakened.
- `/tmp/release-simple-pr163-image-corrected.log`: **125 passed**, exit 0.
  `/tmp/release-simple-pr163-node-final.log`: **89 passed**, exit 0.
  `/tmp/release-simple-pr163-policy-lint.log`: workflow authority/DAG policy and
  `actionlint .github/workflows/*.yml`, exit 0. New source imports remain stdlib.
- `/tmp/release-simple-pr163-rust.log`: fmt, workspace/all-target clippy,
  hennery clippy and both generator checks all exit 0. No Rust or Nix source
  changed. Full workspace tests, Nix and the fresh replay were not repeated for
  this amendment, under the verification budget; their prior results stand.
- **70 assertion-killed copy probes**: 23 credential/config/read-back integration,
  23 referrer guards/side effects and 24 broker guards/cleanup. Every copy has
  its own host `/bin/cp -c -R` APFS clone of `target`. Root evidence:
  `/tmp/release-simple-pr163-probes.log`, retained root copy
  `.superpowers/sdd/release-simplify/probes-pr163-1`. Additional retained copies:
  sibling `release-simple-referrers/.superpowers/sdd/release-referrers/probes-1`
  and `release-simple-crates-isolation/.superpowers/sdd/release-simplify/crates-probes-1`.
  The parent owns cleanup; prior retained copies remain untouched.
- Only offline local fixtures, disposable OCI layouts and stand-in executables
  were used. Every real `gh` invocation had private configuration and dead
  proxies; no network `gh`, registry login or publication occurred. The local
  OCI transport tests never execute `gh`. The original first authentic Hennery
  fixture and maintainer platform/approval/registry acceptance remain required.
- Final **84** embedded blocks were refreshed and hash/mode checked against staged
  tested source; no second full replay. Personal author and rule review precede
  the exact leased SSH push. Review focus: child authority, pipe lifecycle,
  deterministic reconciliation, fetched-bundle verification and write boundaries.

### Ubuntu CI fixture identity follow-up (2026-10-16)

- Parent reports PR #163 re-review **APPROVE at `13060037`**, followed by four
  consumer-fixture setup errors on Ubuntu x86_64 and arm64. Reproduced locally
  with empty HOME, `GIT_CONFIG_GLOBAL=/dev/null` and no system config. macOS Git
  otherwise infers a tagger from Directory Services, so the regression also
  sets `user.useConfigOnly=true` in the caller. The old unsigned annotated-tag
  path failed with exit 128 and **“Please tell me who you are.”** Three new
  regressions were RED (two assertion failures, one missing-diagnostic error).
- All fixture Git commands now explicitly set disposable `user.name` and
  `user.email`, including unsigned annotated tags. The class environment is a
  public-tool allow-list with private HOME/XDG/GPG directories and disabled
  global/system Git configuration. Caller Git config injection cannot mask
  missing fixture configuration. The shared setup helper includes exit status,
  command and captured stderr on failure, without dumping its environment.
- `/tmp/release-simple-ci-fixture-release.log`: **194 release tests passed**,
  exit 0, under empty HOME, `/dev/null` global Git config and disabled identity
  auto-detection. `/tmp/release-simple-ci-fixture-targeted-final.log`: the three
  final regressions passed, exit 0. The final stderr assertion additionally
  requires actual GPG diagnostic text, since a canary in argv alone was too weak.
- `/tmp/release-simple-ci-fixture-probes-final.log`: **10/10 assertion-killed
  copy probes**, covering both identity fields, environment allow-list, private
  HOME/XDG, global/system config guards, exit checking and captured stderr.
  Retained copy `.superpowers/sdd/release-simplify/probes-ci-fixture-1` has its
  own host APFS clone of target. An initial stderr probe survived the argv-only
  assertion; strengthening the diagnostic regression killed it. No production
  guard or refusal expectation was weakened.
- `/tmp/release-simple-ci-fixture-rust.log`: fmt, both clippies and both
  generators exit 0. No Rust/Nix changes, full workspace repeat, full replay or
  timing load: this amendment changes deterministic test identity/configuration,
  not timing/concurrency behavior. Final blocks and staged tested bytes checked.
- Latest operator ruling: all channels for the first release, with no wait for
  a first Hennery positive fixture. Current docs record the supersession and
  token/tap setup supplied by the operator. Runtime publishers contain no
  fixture-existence gate. The existing stable-only non-GitHub constraint and
  signed channel selection remain unchanged (`channels.json` is `["github"]`);
  the parent must resolve the first tag/selection before an all-channel run.
  This builder changed no live switch, used no network `gh`, and published
  nothing. Authentic first-release fixture collection is follow-up evidence.

## Exact replay files

These are final bytes, grouped by path. Text blocks are verbatim. Binary or
non-newline files use base64 with an exact SHA-256. Apply the deletion manifest
first, then extract every file (count must exceed zero) and preserve modes.
The recipe itself is copied as the replay input; it is not recursively embedded.

<!-- replay-deletions -->
```json
[
  ".github/actions/release-gate/action.yml",
  ".github/workflows/release-candidate.yml",
  ".github/workflows/release-publish.yml",
  "packaging/ghcr-gate.sh",
  "packaging/ghcr-publish.sh",
  "packaging/hennery-release",
  "packaging/release-gate",
  "packaging/release/approval.py",
  "packaging/release/approval_summary.py",
  "packaging/release/retention.py",
  "packaging/release/test_adapter.py",
  "packaging/release/test_approval.py",
  "packaging/release/test_retention.py"
]
```

<!-- replay-file: {"path":".github/workflows/build.yml","mode":"100644","sha256":"c765cb7b0a4f545819ee8f2099d57ca81d3a6554bb0d36ddc81b288940e58b28","encoding":"utf8"} -->
``````yaml
# Release artifacts, built the way a release builds them (distribution spec
# §2, plan 7a), and checked: Linux musl-static for both architectures and
# macOS arm64, the shell installer, the Homebrew formula and the collector
# image.
#
# This workflow publishes nothing. It has no tag trigger, no release, no
# external registry push, no signing, and only `contents: read`. OCI SBOM and
# unsigned build metadata are tested using a temporary loopback registry.
# What it builds
# stays a workflow artifact, kept for a week. Publishing is the operator's
# to switch on (packaging/README.md).
#
# The archives hold the `hennery` binary, its licence and its README, nothing
# else, which `check-archive.sh` asserts. No job here downloads, builds or
# uploads an adapter: the Claude CLI is never redistributed (distribution spec
# §3.3).
#
# Third-party actions are pinned by commit, images by digest, cargo-dist by
# SHA-256 (`install-dist.sh`); GitHub's own actions by commit too. Workflow
# artifacts are never promoted to a release (packaging/README.md).
name: build

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
  image-contract:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - name: Image guards and workflow contracts (no credentials or external writes)
        run: |
          nix develop .#image -c python3 -m unittest discover -s packaging/tests -v
          nix develop .#image -c actionlint .github/workflows/*.yml
          nix develop .#image -c shellcheck packaging/image-build.sh packaging/image-ci.sh packaging/test-image-registry.sh packaging/smoke-image.sh

  # One archive per target, each on a native runner.
  archive:
    timeout-minutes: 60
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
            runner: macos-latest
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de # master @ 2026-09-12
        with:
          toolchain: stable
          targets: ${{ matrix.target }}
      - uses: Swatinem/rust-cache@6323deb102c322ba6fcbdcafc7e3dddab59af2b6 # v2.9.2
        with:
          key: ${{ matrix.target }}
      # `musl-gcc` builds the C parts (OpenSSL, SQLite, ring) for musl.
      - name: musl tools (Linux)
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y musl-tools
      - name: Install dist
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
      # The web UI (plan 4b), embedded in the binary: Node and pnpm from the
      # flake's `web` shell.
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - name: Build the web UI
        run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
      - name: Build the archive
        env:
          # Without the web UI the build fails, rather than embed the
          # placeholder.
          HENNERY_WEB_REQUIRE: "1"
        run: |
          dist build --artifacts=local --target=${{ matrix.target }} --print=linkage --output-format=json > dist-manifest.json
          cp dist-manifest.json "target/distrib/${{ matrix.target }}-dist-manifest.json"
      - name: Unpack the binary
        run: |
          mkdir -p unpacked
          tar -xJf "target/distrib/hennery-${{ matrix.target }}.tar.xz" -C unpacked
          echo "BINARY=$PWD/unpacked/hennery-${{ matrix.target }}/hennery" >> "$GITHUB_ENV"
      - name: Holds the binary, its licence and README only
        run: sh packaging/check-archive.sh "target/distrib/hennery-${{ matrix.target }}.tar.xz" ${{ matrix.target }}
      - name: Links nothing outside the system
        run: sh packaging/check-linkage.sh "$BINARY"
      # The image reuses the musl binaries, so this covers it too.
      - name: Embeds the web UI, not the placeholder
        run: sh packaging/check-web-ui.sh "$BINARY"
      - name: Runs
        run: |
          "$BINARY" --version
          "$BINARY" collector --help > /dev/null
      - name: Runs on Alpine (musl)
        if: runner.os == 'Linux'
        run: docker run --rm -v "$BINARY:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
      - name: Qualify the release OCI image with CI fixture legal inputs
        if: runner.os == 'Linux'
        run: |
          mkdir -p "dist/linux-${{ matrix.image }}"
          cp "$BINARY" "dist/linux-${{ matrix.image }}/hennery"
          sh packaging/image-ci.sh "${{ matrix.image }}" "$GITHUB_SHA"
      - name: Test a push to loopback, then smoke the retained digest
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y skopeo
          sh packaging/test-image-registry.sh "dist/image-${{ matrix.image }}/layout" "${{ matrix.image }}"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: runner.os == 'Linux'
        with:
          name: ci-image-${{ matrix.image }}
          path: dist/image-${{ matrix.image }}/
          retention-days: 7
          if-no-files-found: error
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: archive-${{ matrix.target }}
          retention-days: 7
          if-no-files-found: error
          path: |
            target/distrib/hennery-${{ matrix.target }}.tar.xz
            target/distrib/hennery-${{ matrix.target }}.tar.xz.sha256
            target/distrib/${{ matrix.target }}-dist-manifest.json

  # Exercise the exact R4 OCI merge/registry code on every PR and main run.
  # These release-target images contain CI fixture legal inputs, never approval.
  image-index:
    needs: archive
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: ci-image-*
          path: images/
      - name: Test both-platform index in loopback registry only
        run: |
          python3 packaging/image.py merge index-layout images/ci-image-amd64/layout images/ci-image-arm64/layout
          python3 - <<'PY'
          import json
          from pathlib import Path
          inventory = {}
          for path in Path('images').glob('ci-image-*/binary-sha256.json'):
              inventory.update(json.loads(path.read_text()))
          assert set(inventory) == {'amd64', 'arm64'}, 'both CI platforms required'
          Path('ci-binary-sha256.json').write_text(json.dumps(inventory))
          PY
          python3 packaging/image.py verify index-layout ci-binary-sha256.json "$GITHUB_SHA" 0.0.0
          python3 packaging/image-signing-inputs.py index-layout index index-signing-inputs
          sudo apt-get update
          sudo apt-get install -y skopeo
          sh packaging/test-image-registry.sh index-layout

  # What spans the archives: the installer (their checksums embedded), the
  # Homebrew formula, and `sha256.sum`.
  installers:
    needs: archive
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - name: Install dist
        run: |
          sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
          echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: archive-*
          path: target/distrib/
          merge-multiple: true
      - name: Build the installers
        run: dist build --artifacts=global
      # cargo-dist's installer skips the check without `sha256sum`; the spec
      # wants it to refuse (packaging/harden-installer.py).
      - name: Harden the installer
        run: python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
      - name: The installer installs, and refuses what it cannot check
        run: sh packaging/test-installer.sh target/distrib
      - name: The formula names every archive's SHA-256
        run: sh packaging/check-formula.sh target/distrib
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: installers
          retention-days: 7
          if-no-files-found: error
          path: |
            target/distrib/hennery-installer.sh
            target/distrib/hennery.rb
            target/distrib/sha256.sum

  # The same installer, on macOS: its own `sha256sum` and `shasum`, its own
  # archive.
  installer-macos:
    needs: installers
    runs-on: macos-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          pattern: archive-*
          path: target/distrib/
          merge-multiple: true
      - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: installers
          path: target/distrib/
      - name: The installer installs, and refuses what it cannot check
        run: sh packaging/test-installer.sh target/distrib
``````

<!-- replay-file: {"path":".github/workflows/release-scheduling.yml","mode":"100644","sha256":"c83324fb486a9f4bcf29ab7ff215a7fb8c7d106ba6a7aa06ed997fd8177a6fdd","encoding":"utf8"} -->
``````yaml
# Secret-free stand-ins; tests bind this DAG and every guard to release.yml.
name: release-scheduling
'on':
  pull_request:
    paths:
    - .github/workflows/**
    - packaging/**
  push:
    branches:
    - main
    paths:
    - .github/workflows/**
    - packaging/**
  workflow_dispatch:
    inputs:
      channels:
        type: choice
        options:
        - github
        - github,homebrew
        - github,ghcr
        - github,crates
        default: github
permissions: {}
jobs:
  tag-signature:
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - id: selection
      env:
        CHANNELS: ${{ inputs.channels || 'github' }}
      run: 'python3 - <<''PYCODE''

        import json,os

        with open(os.environ[''GITHUB_OUTPUT''],''a'') as out:out.write(''channels=''+json.dumps(sorted(os.environ[''CHANNELS''].split('','')))+''\n'')

        PYCODE'
    outputs:
      channels: ${{ steps.selection.outputs.channels }}
  web-ui:
    needs: tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  archive:
    needs:
    - web-ui
    - tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  crates:
    needs:
    - web-ui
    - tag-signature
    if: ${{ !cancelled() && needs.web-ui.result == 'success' && contains(fromJSON(needs.tag-signature.outputs.channels), 'crates') }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  assemble:
    needs:
    - archive
    - crates
    - tag-signature
    if: ${{ !cancelled() && needs.archive.result == 'success' && (needs.crates.result == 'success' || (needs.crates.result == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels),
      'crates'))) }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  ghcr:
    needs:
    - assemble
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' && contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  installer:
    needs:
    - assemble
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  homebrew-native:
    needs:
    - assemble
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  homebrew:
    needs:
    - assemble
    - homebrew-native
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' && contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew') && needs.homebrew-native.result
      == 'success' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  qualification:
    needs:
    - tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  attest:
    needs:
    - tag-signature
    - qualification
    - assemble
    - installer
    - homebrew-native
    - homebrew
    - crates
    - ghcr
    if: ${{ !cancelled() && needs.tag-signature.result == 'success' && needs.qualification.result == 'success' && needs.assemble.result == 'success' &&
      needs.installer.result == 'success' && needs.homebrew-native.result == 'success' && (needs.homebrew.result == 'success' || (needs.homebrew.result
      == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew'))) && (needs.crates.result == 'success' || (needs.crates.result
      == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels), 'crates'))) && (needs.ghcr.result == 'success' || (needs.ghcr.result ==
      'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr'))) }}
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - run: 'true'
  assert-scheduling:
    needs:
    - tag-signature
    - web-ui
    - archive
    - crates
    - assemble
    - ghcr
    - installer
    - homebrew-native
    - homebrew
    - qualification
    - attest
    if: always()
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
    - env:
        RESULTS: ${{ toJSON(needs) }}
        CHANNELS: ${{ inputs.channels || 'github' }}
      run: 'python3 - <<''PYCODE''

        import json,os

        selected=os.environ[''CHANNELS''].split('','')

        actual={k:v[''result''] for k,v in json.loads(os.environ[''RESULTS'']).items()}

        expected={k:(''skipped'' if k in (''crates'',''ghcr'',''homebrew'') and k not in selected else ''success'') for k in actual}

        assert actual==expected,(actual,expected)

        print(''Real skipped-ancestor scheduler reached every required descendant'')

        PYCODE'
``````

<!-- replay-file: {"path":".github/workflows/release-tests.yml","mode":"100644","sha256":"a8143f738ef39b3cd9384eccdc5f59a786d73ba3a0a3134b4368878e05e1c24a","encoding":"utf8"} -->
``````yaml
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
      - name: Execute the exact README bootstrap against signed offline releases
        run: |
          sh packaging/readme-blocks.sh README.md release-bootstrap > "$RUNNER_TEMP/release-bootstrap.sh"
          nix develop .#release -c python3 packaging/release/test_bootstrap.py --script "$RUNNER_TEMP/release-bootstrap.sh"
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
        run: nix develop .#release -c actionlint .github/workflows/release.yml .github/workflows/release-*.yml
``````

<!-- replay-file: {"path":".github/workflows/release.yml","mode":"100644","sha256":"7822d98566791c27a291f573692382c3d7a1f3ddfeb93c78f6b1a78499c472f9","encoding":"utf8"} -->
``````yaml
name: release
'on':
  push:
    tags:
    - v*
permissions:
  contents: read
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
jobs:
  tag-signature:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
    - id: configuration
      name: Verify signed tag and reviewed channel selection
      run: nix develop .#release -c python3 packaging/release/release_run.py configure >> "$GITHUB_OUTPUT"
    name: tag-signature
    permissions:
      contents: read
    outputs:
      channels: ${{ steps.configuration.outputs.channels }}
      channels_csv: ${{ steps.configuration.outputs.channels_csv }}
      tag_object: ${{ steps.configuration.outputs.tag_object }}
  web-ui:
    needs: tag-signature
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
      with:
        github_access_token: ${{ github.token }}
    - name: Build the UI once from the pinned lock
      run: nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
    - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      with:
        name: release-ui
        retention-days: 90
        if-no-files-found: error
        path: web/dist/
    name: web-ui
    permissions:
      contents: read
  archive:
    needs:
    - web-ui
    - tag-signature
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
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - name: Annotated tag, exact source and workspace version
      env:
        RELEASE_TAG: ${{ github.ref_name }}
      run: |
        test "$(git cat-file -t "$RELEASE_TAG")" = tag
        source_sha=$(git rev-parse "$RELEASE_TAG^{commit}")
        test "$source_sha" = "$(git rev-parse HEAD)"
        echo "RELEASE_SOURCE_SHA=$source_sha" >> "$GITHUB_ENV"
        python3 -c 'import os,tomllib; from pathlib import Path; v=tomllib.loads(Path("Cargo.toml").read_text())["workspace"]["package"]["version"]; assert os.environ["RELEASE_TAG"] == "v"+v'
    - uses: dtolnay/rust-toolchain@02cb101ec7c40f2c49e1d9714d64511d8e1b74de
      with:
        toolchain: 1.98.1
        targets: ${{ matrix.target }}
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
      with:
        github_access_token: ${{ github.token }}
    - name: Native build tools
      if: runner.os == 'Linux'
      run: sudo apt-get update && sudo apt-get install -y musl-tools
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
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
        TARGET: ${{ matrix.target }}
      run: |
        sh packaging/release/native-archive.sh
    - name: Alpine executable and retained release image acceptance
      if: runner.os == 'Linux'
      env:
        IMAGE_ARCH: ${{ matrix.image }}
        TARGET: ${{ matrix.target }}
        RELEASE_TAG: ${{ github.ref_name }}
      run: |
        binary="$PWD/unpacked/hennery-$TARGET/hennery"
        docker run --rm -v "$binary:/hennery:ro" alpine:3@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 /hennery --version
        mkdir -p "dist/linux-$IMAGE_ARCH"
        cp "$binary" "dist/linux-$IMAGE_ARCH/hennery"
        cp release-materials/THIRD-PARTY-NOTICES.txt "dist/linux-$IMAGE_ARCH/THIRD-PARTY-NOTICES"
        cp "release-materials/hennery-$TARGET.spdx.json" "dist/linux-$IMAGE_ARCH/binary.spdx.json"
        docker buildx create --use --name r4 --driver docker-container --driver-opt image=moby/buildkit:buildx-stable-1@sha256:cec9f139f45e93c5c69c60f8b07cfad9f43f4ef6b6a6cd917527fea5ff2e3dea
        sh packaging/image-build.sh "$IMAGE_ARCH" image-output "${RELEASE_TAG#v}" "$RELEASE_SOURCE_SHA" "$(git show -s --format=%ct HEAD)"
        python3 - <<'PY'
        import hashlib,json,os
        from pathlib import Path
        arch=os.environ['IMAGE_ARCH']
        Path('native-binaries.json').write_text(json.dumps({arch:hashlib.sha256(Path('dist/linux-'+arch+'/hennery').read_bytes()).hexdigest()}))
        PY
        python3 packaging/image.py verify image-output/layout native-binaries.json "$RELEASE_SOURCE_SHA" "${RELEASE_TAG#v}" > image-output/verified.json
        python3 packaging/image-signing-inputs.py image-output/layout "$IMAGE_ARCH" native-signing-inputs
        sudo apt-get update
        sudo apt-get install -y skopeo
        sh packaging/test-image-registry.sh image-output/layout "$IMAGE_ARCH"
    - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      if: runner.os == 'Linux'
      with:
        name: release-image-${{ matrix.image }}
        retention-days: 90
        if-no-files-found: error
        path: image-output/
    - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      with:
        name: candidate-${{ matrix.target }}
        retention-days: 90
        if-no-files-found: error
        path: target/distrib/
    name: archive
    permissions:
      contents: read
  crates:
    name: crates
    needs:
    - web-ui
    - tag-signature
    if: ${{ !cancelled() && needs.web-ui.result == 'success' && contains(fromJSON(needs.tag-signature.outputs.channels), 'crates')
      }}
    runs-on: ubuntu-24.04
    timeout-minutes: 120
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
      with:
        github_access_token: ${{ github.token }}
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      with:
        name: release-ui
        path: web/dist/
    - name: Isolate package acceptance homes and the MSRV toolchain
      run: |
        mkdir -p "$RUNNER_TEMP/r3-home"
        for name in HOME CARGO_HOME RUSTUP_HOME XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME npm_config_userconfig npm_config_cache; do
          case "$name" in
            HOME) value="$RUNNER_TEMP/r3-home" ;;
            *) value="$RUNNER_TEMP/r3-home/$name" ;;
          esac
          echo "$name=$value" >> "$GITHUB_ENV"
        done
    - name: Prepare and qualify all seven using the already built candidate UI
      run: |
        nix develop -c rustup toolchain install 1.88.0 --profile minimal
        nix develop -c node packaging/prepare-crates.mjs "$RUNNER_TEMP/crates-prepared" "$GITHUB_SHA" "$PWD/web/dist"
        nix develop -c sh packaging/ci-crates.sh "$RUNNER_TEMP/crates-prepared"
        mkdir crates-flat
        nix develop -c node packaging/prepare-crates.mjs --stage "$RUNNER_TEMP/crates-prepared" crates-flat
    - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      with:
        name: release-crates
        retention-days: 90
        if-no-files-found: error
        path: crates-flat/
    permissions:
      contents: read
  assemble:
    needs:
    - archive
    - crates
    - tag-signature
    if: ${{ !cancelled() && needs.archive.result == 'success' && (needs.crates.result == 'success' || (needs.crates.result
      == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels), 'crates'))) }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      with:
        pattern: candidate-*
        path: candidates
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      if: needs.crates.result == 'success'
      with:
        name: release-crates
        path: crates-flat
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      if: contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr')
      with:
        pattern: release-image-*
        path: images
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
      with:
        github_access_token: ${{ github.token }}
    - name: Assemble global inputs; never silently merge conflicting materials
      env:
        RELEASE_TAG: ${{ github.ref_name }}
        RELEASE_CHANNELS: ${{ needs.tag-signature.outputs.channels_csv }}
      run: |
        sh packaging/install-dist.sh "$RUNNER_TEMP/dist-bin"
        echo "$RUNNER_TEMP/dist-bin" >> "$GITHUB_PATH"
        python3 packaging/release/assemble.py candidates target/distrib
        if test -d crates-flat; then
          nix develop -c node packaging/prepare-crates.mjs --stage crates-flat target/distrib
        fi
        "$RUNNER_TEMP/dist-bin/dist" build --artifacts=global --output-format=json > target/distrib/dist-manifest.json
        python3 packaging/harden-installer.py target/distrib/hennery-installer.sh
        sh packaging/test-installer.sh target/distrib
        sh packaging/check-formula.sh target/distrib
        nix develop .#release -c python3 packaging/release/homebrew.py prepare target/distrib --tag "$RELEASE_TAG" --targets aarch64-apple-darwin,aarch64-unknown-linux-musl,x86_64-unknown-linux-musl
        git show HEAD:CHANGELOG.md > target/distrib/release-notes.md
        git archive --format=tar --prefix=hennery-source/ HEAD | xz > target/distrib/hennery-source.tar.xz
        case ",$RELEASE_CHANNELS," in
          *,ghcr,*)
            python3 packaging/ghcr-candidate.py assemble target/distrib image-assembly "$(git rev-parse HEAD)" "${RELEASE_TAG#v}" \
              images/release-image-amd64/layout images/release-image-arm64/layout
            sudo apt-get update
            sudo apt-get install -y skopeo
            sh packaging/test-image-registry.sh image-assembly/layout
            ;;
        esac
        nix develop .#release -c python3 packaging/release/release_run.py freeze target/distrib
    - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      with:
        name: release-payload-${{ github.run_id }}-1
        retention-days: 90
        if-no-files-found: error
        path: target/distrib/
    name: assemble
    permissions:
      contents: read
  ghcr:
    name: ghcr
    needs:
    - assemble
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' && contains(fromJSON(needs.tag-signature.outputs.channels),
      'ghcr') }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
      with:
        github_access_token: ${{ github.token }}
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      with:
        name: release-payload-${{ github.run_id }}-1
        path: candidate
    - name: Verify the frozen GHCR payload, then accept the retained index through loopback
      env:
        RELEASE_TAG: ${{ github.ref_name }}
      run: |
        nix develop .#image -c python3 packaging/ghcr-candidate.py accept candidate image-acceptance "$GITHUB_SHA" "${RELEASE_TAG#v}"
        nix develop .#image -c sh packaging/test-image-registry.sh image-acceptance/layout
    permissions:
      contents: read
  installer:
    needs:
    - assemble
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    strategy:
      fail-fast: false
      matrix:
        runner:
        - ubuntu-24.04
        - ubuntu-24.04-arm
        - macos-15
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 15
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        persist-credentials: false
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      with:
        name: release-payload-${{ github.run_id }}-1
        path: candidate
    - name: Native installer positives and refusals
      run: sh packaging/test-installer.sh candidate
    name: installer
    permissions:
      contents: read
  homebrew-native:
    needs:
    - assemble
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' }}
    strategy:
      fail-fast: false
      matrix:
        include:
        - runner: macos-15
        - runner: ubuntu-24.04
        - runner: ubuntu-24.04-arm
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 30
    steps:
    - name: Preserve successful native no-ops for unselected Homebrew
      run: echo 'Native acceptance executes only for a selected Homebrew channel'
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      if: contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew')
      with:
        ref: ${{ github.sha }}
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
      if: contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew')
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      if: contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew')
      with:
        name: release-payload-${{ github.run_id }}-1
        path: candidate
    - name: Real isolated tap install, smoke, upgrade and uninstall of frozen bytes
      if: contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew')
      run: nix develop .#release -c python3 packaging/release/homebrew_accept.py candidate "$RUNNER_TEMP/homebrew-proof"
    - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      if: contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew')
      with:
        name: homebrew-proof-${{ matrix.runner }}
        if-no-files-found: error
        path: ${{ runner.temp }}/homebrew-proof/result.json
    name: homebrew-native
    permissions:
      contents: read
  homebrew:
    name: homebrew
    needs:
    - assemble
    - homebrew-native
    - tag-signature
    if: ${{ !cancelled() && needs.assemble.result == 'success' && contains(fromJSON(needs.tag-signature.outputs.channels),
      'homebrew') && needs.homebrew-native.result == 'success' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
    - name: All advertised native Homebrew platforms passed
      run: echo 'Native local-tap acceptance passed on all three platforms'
    permissions:
      contents: read
  qualification:
    name: qualification
    needs:
    - tag-signature
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 120
    permissions:
      contents: read
    strategy:
      fail-fast: false
      matrix:
        runner:
        - ubuntu-24.04
        - ubuntu-24.04-arm
        - macos-15
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
    - name: All exact-source Rust, web, packaging and Nix gates
      env:
        CI: '1'
        HENNERY_WEB_REQUIRE: '1'
      run: |
        nix develop -c pnpm --dir web install --frozen-lockfile
        nix develop -c pnpm --dir web typecheck
        nix develop -c pnpm --dir web test
        nix develop -c pnpm --dir web build
        nix develop -c cargo fmt --all --check
        nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
        nix develop -c cargo clippy -p hennery --locked -- -D warnings
        nix develop -c cargo test --workspace --locked
        nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
        nix develop -c cargo run -p hennery-view --bin gen-view --locked -- --check
        nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked
        nix develop -c pnpm --dir web e2e
        nix develop .#release -c python3 -m unittest discover -s packaging/release -p 'test_*.py'
        nix develop .#image -c python3 -m unittest discover -s packaging/tests -p 'test_*.py'
        nix develop .#release -c actionlint
        nix flake check -L
  attest:
    name: attest
    needs:
    - tag-signature
    - qualification
    - assemble
    - installer
    - homebrew-native
    - homebrew
    - crates
    - ghcr
    if: ${{ !cancelled() && needs.tag-signature.result == 'success' && needs.qualification.result == 'success' && needs.assemble.result
      == 'success' && needs.installer.result == 'success' && needs.homebrew-native.result == 'success' && (needs.homebrew.result
      == 'success' || (needs.homebrew.result == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels), 'homebrew')))
      && (needs.crates.result == 'success' || (needs.crates.result == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels),
      'crates'))) && (needs.ghcr.result == 'success' || (needs.ghcr.result == 'skipped' && !contains(fromJSON(needs.tag-signature.outputs.channels),
      'ghcr'))) }}
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    permissions:
      contents: read
      id-token: write
      attestations: write
    outputs:
      artifact_id: ${{ steps.frozen.outputs.artifact-id }}
      attesting_attempt: '1'
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      with:
        name: release-payload-${{ github.run_id }}-1
        path: payload
    - name: Original payload checksum closure
      run: nix develop .#release -c python3 packaging/release/release_run.py check payload
    - id: provenance
      uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be
      with:
        subject-path: payload/*
    - name: Preserve complete global bundle
      env:
        BUNDLE: ${{ steps.provenance.outputs.bundle-path }}
      run: |-
        mkdir signatures
        cp "$BUNDLE" signatures/release.sigstore.jsonl
    - id: input-index
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      name: Retained OCI inputs index
      run: |-
        nix develop .#release -c python3 packaging/release/release_run.py image-inputs payload image-signing
        python3 packaging/image-signing-inputs.py image-signing/layout index signing-index >> "$GITHUB_OUTPUT"
    - id: index-provenance
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-index.outputs.digest }}
        push-to-registry: false
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.index-provenance.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-index-provenance.json
    - id: input-amd64
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      name: Retained OCI inputs amd64
      run: |-
        nix develop .#release -c python3 packaging/release/release_run.py image-inputs payload image-signing
        python3 packaging/image-signing-inputs.py image-signing/layout amd64 signing-amd64 >> "$GITHUB_OUTPUT"
    - id: amd64-provenance
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-amd64.outputs.digest }}
        push-to-registry: false
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.amd64-provenance.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-amd64-provenance.json
    - id: amd64-image-sbom
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-sbom@bd218ad0dbcb3e146bd073d1d9c6d78e08aa8a0b
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-amd64.outputs.digest }}
        push-to-registry: false
        sbom-path: signing-amd64/image.spdx.json
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.amd64-image-sbom.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-amd64-image-sbom.json
    - id: amd64-binary-sbom
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-sbom@bd218ad0dbcb3e146bd073d1d9c6d78e08aa8a0b
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-amd64.outputs.digest }}
        push-to-registry: false
        sbom-path: signing-amd64/binary.spdx.json
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.amd64-binary-sbom.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-amd64-binary-sbom.json
    - id: input-arm64
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      name: Retained OCI inputs arm64
      run: |-
        nix develop .#release -c python3 packaging/release/release_run.py image-inputs payload image-signing
        python3 packaging/image-signing-inputs.py image-signing/layout arm64 signing-arm64 >> "$GITHUB_OUTPUT"
    - id: arm64-provenance
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-arm64.outputs.digest }}
        push-to-registry: false
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.arm64-provenance.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-arm64-provenance.json
    - id: arm64-image-sbom
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-sbom@bd218ad0dbcb3e146bd073d1d9c6d78e08aa8a0b
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-arm64.outputs.digest }}
        push-to-registry: false
        sbom-path: signing-arm64/image.spdx.json
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.arm64-image-sbom.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-arm64-image-sbom.json
    - id: arm64-binary-sbom
      if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      uses: actions/attest-sbom@bd218ad0dbcb3e146bd073d1d9c6d78e08aa8a0b
      with:
        subject-name: ghcr.io/marcinwadon/hennery
        subject-digest: ${{ steps.input-arm64.outputs.digest }}
        push-to-registry: false
        sbom-path: signing-arm64/binary.spdx.json
    - if: ${{ contains(fromJSON(needs.tag-signature.outputs.channels), 'ghcr') }}
      env:
        BUNDLE: ${{ steps.arm64-binary-sbom.outputs.bundle-path }}
      run: cp "$BUNDLE" signatures/ghcr-arm64-binary-sbom.json
    - id: summary
      name: Exhaustive original asset digest summary
      run: nix develop .#release -c python3 packaging/release/release_run.py summary payload signatures >> "$GITHUB_STEP_SUMMARY"
    - id: frozen
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
      with:
        name: attested-release-${{ github.run_id }}-1
        retention-days: 90
        if-no-files-found: error
        path: |-
          payload/
          signatures/
  publish:
    name: publish
    needs:
    - attest
    if: ${{ !cancelled() && needs.attest.result == 'success' && vars.RELEASE_PUBLICATION_ENABLED == 'true' && vars.RELEASE_GITHUB_ENABLED
      == 'true' }}
    environment: release
    runs-on: ubuntu-24.04
    timeout-minutes: 120
    permissions:
      contents: write
      actions: read
      attestations: read
      id-token: write
    steps:
    - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
      with:
        ref: ${{ github.sha }}
        fetch-depth: 0
        persist-credentials: false
    - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24
    - uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093
      with:
        artifact-ids: ${{ needs.attest.outputs.artifact_id }}
        path: original
        github-token: ${{ github.token }}
    - id: verified
      name: Verify this original run and every byte before publication
      env: &id001
        GH_TOKEN: ${{ github.token }}
        RELEASE_ARTIFACT_ID: ${{ needs.attest.outputs.artifact_id }}
        RELEASE_ATTESTING_ATTEMPT: ${{ needs.attest.outputs.attesting_attempt }}
        RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        RELEASE_GITHUB_ENABLED: ${{ vars.RELEASE_GITHUB_ENABLED }}
        RELEASE_HOMEBREW_ENABLED: ${{ vars.RELEASE_HOMEBREW_ENABLED }}
        RELEASE_CRATES_ENABLED: ${{ vars.RELEASE_CRATES_ENABLED }}
        RELEASE_GHCR_ENABLED: ${{ vars.RELEASE_GHCR_ENABLED }}
      run: nix develop .#release -c python3 packaging/release/release_run.py verify original/payload original/signatures github
        --outputs "$GITHUB_OUTPUT"
    - id: github-publish
      name: Create draft, read-back verify, publish immutable
      env: *id001
      run: nix develop .#release -c python3 packaging/release/release_run.py publish original/payload original/signatures
    - id: homebrew-verify
      if: ${{ vars.RELEASE_HOMEBREW_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'homebrew') }}
      env: *id001
      run: nix develop .#release -c python3 packaging/release/release_run.py verify original/payload original/signatures homebrew
    - id: homebrew-publish
      if: ${{ vars.RELEASE_HOMEBREW_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'homebrew') }}
      env:
        GH_TOKEN: ${{ github.token }}
        RELEASE_ARTIFACT_ID: ${{ needs.attest.outputs.artifact_id }}
        RELEASE_ATTESTING_ATTEMPT: ${{ needs.attest.outputs.attesting_attempt }}
        RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        RELEASE_GITHUB_ENABLED: ${{ vars.RELEASE_GITHUB_ENABLED }}
        RELEASE_HOMEBREW_ENABLED: ${{ vars.RELEASE_HOMEBREW_ENABLED }}
        HOMEBREW_TAP_TOKEN: ${{ secrets.RELEASE_HOMEBREW_TOKEN }}
      run: nix develop .#release -c python3 packaging/release/release_run.py channel original/payload original/signatures
        homebrew
    - id: crates-verify
      if: ${{ vars.RELEASE_CRATES_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'crates') }}
      env: *id001
      run: nix develop .#release -c python3 packaging/release/release_run.py verify original/payload original/signatures crates
    - id: cratesio
      if: ${{ vars.RELEASE_CRATES_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'crates') && vars.RELEASE_CRATES_BOOTSTRAP_ENABLED
        != 'true' }}
      uses: rust-lang/crates-io-auth-action@9c067fc5d5c254b33978fed918cb50c032549d0e
    - id: crates-publish
      if: ${{ vars.RELEASE_CRATES_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'crates') }}
      env:
        GH_TOKEN: ${{ github.token }}
        RELEASE_ARTIFACT_ID: ${{ needs.attest.outputs.artifact_id }}
        RELEASE_ATTESTING_ATTEMPT: ${{ needs.attest.outputs.attesting_attempt }}
        RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        RELEASE_GITHUB_ENABLED: ${{ vars.RELEASE_GITHUB_ENABLED }}
        RELEASE_CRATES_ENABLED: ${{ vars.RELEASE_CRATES_ENABLED }}
        CARGO_REGISTRY_TOKEN: ${{ steps.cratesio.outputs.token }}
        RELEASE_CRATES_BOOTSTRAP_ENABLED: ${{ vars.RELEASE_CRATES_BOOTSTRAP_ENABLED }}
        RELEASE_CRATES_BOOTSTRAP_TOKEN: ${{ secrets.RELEASE_CRATES_BOOTSTRAP_TOKEN }}
      run: nix develop .#release -c python3 packaging/release/release_run.py channel original/payload original/signatures
        crates
    - id: ghcr-verify
      if: ${{ vars.RELEASE_GHCR_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'ghcr') }}
      env: *id001
      run: nix develop .#release -c python3 packaging/release/release_run.py verify original/payload original/signatures ghcr
    - id: ghcr-publish
      if: ${{ vars.RELEASE_GHCR_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'ghcr') }}
      env:
        GH_TOKEN: ${{ github.token }}
        RELEASE_ARTIFACT_ID: ${{ needs.attest.outputs.artifact_id }}
        RELEASE_ATTESTING_ATTEMPT: ${{ needs.attest.outputs.attesting_attempt }}
        RELEASE_PUBLICATION_ENABLED: ${{ vars.RELEASE_PUBLICATION_ENABLED }}
        RELEASE_GITHUB_ENABLED: ${{ vars.RELEASE_GITHUB_ENABLED }}
        RELEASE_GHCR_ENABLED: ${{ vars.RELEASE_GHCR_ENABLED }}
        GHCR_PUBLISH_TOKEN: ${{ secrets.GHCR_PUBLISH_TOKEN }}
        GHCR_PUBLISH_USER: ${{ vars.GHCR_PUBLISH_USER }}
      run: nix develop .#release -c python3 packaging/release/release_run.py channel original/payload original/signatures
        ghcr
    - name: Bootstrap token revocation obligation
      if: ${{ always() && vars.RELEASE_CRATES_BOOTSTRAP_ENABLED == 'true' }}
      run: echo 'Revoke and confirm revocation of the crates bootstrap token on success or abandonment; remove the secret and disable bootstrap before retries with trusted publishing.' >> "$GITHUB_STEP_SUMMARY"
    - name: Retain publication result
      if: always()
      run: echo "Publication attempt $GITHUB_RUN_ATTEMPT; original attesting attempt 1" >> "$GITHUB_STEP_SUMMARY"
``````

<!-- replay-file: {"path":"README.md","mode":"100644","sha256":"3e8faf35bb75c4f9da8e6f89c18aa31a9f76ad07df10181c56a1a3ff4969252b","encoding":"utf8"} -->
``````markdown
# hennery

hennery is a self-hosted cockpit for coding agents. It lets one developer drive
[Agent Client Protocol](https://agentclientprotocol.com) (ACP) sessions — Claude
Code, Codex, or any other ACP adapter — running on any of their machines, from a
single browser tab or a phone. It also includes an MCP gateway: connect a
server once, then choose its hat and the hosts whose sessions may use it.

hennery never proxies agent licences. You bring your own subscriptions and log in
to each agent CLI on your own machines; hennery only drives the sessions.

## Status

**Early testing.** hennery is ready for early testers who build it from
source. There are no published releases, installers or images yet, and stored
data may not survive an upgrade: expect things to change.

What works:

- **Sessions from the browser.** The collector serves its web UI from the
  binary. From it you start Claude Code and Codex sessions on a connected,
  paired machine, prompt them, answer their permission requests, and park
  and resume them.
- **Hats.** Path rules put each session in a hat by its project directory,
  for organising sessions and choosing their MCP servers.
- **MCP servers.** Connect a server with a static token or OAuth through the
  gateway, or configure local stdio servers for a host and hat, on the **MCP** screen.

Known limitations:

- One owner per collector. Setup requires a password; it also offers a
  passkey, which you can use to sign in afterwards.
- Web Push is built on the collector, but the web UI has no subscribe
  button yet.
- Codex sessions get hennery MCP servers only in the host's default hat, without per-hat isolation, and also load the user's own `~/.codex` MCP servers; other hats get none, until per-hat isolation lands.
- Hosts support verified `wss://`; exact trusted proxy peers provide separate
  client rate-limit budgets. Public adapter/MCP acceptance is pending. Restrict ingress until
  those deployment checks are complete.
- The designs are in [`docs/specs/`](docs/specs/) and the plans in
  [`docs/plans/`](docs/plans/); [`docs/README.md`](docs/README.md) lists
  them.

## Verify a release installer before running it

Releases are not published yet; this procedure is for when publication is enabled.
Until then, use the source quickstart below. You need trusted, already installed
`curl`, Git, GnuPG, `jq`, `gh`, and either `sha256sum` or `shasum`.

The release signing subkey's **full fingerprint** is
**`F26C7F594DFE84D131703AFC23E5A318AE8D2861`**. Confirm it through channels
independent of any release: this [README on main](https://github.com/marcinwadon/hennery/blob/main/README.md),
the [maintainer's account keys](https://github.com/marcinwadon.gpg), and
[keys.openpgp.org](https://keys.openpgp.org/vks/v1/by-fingerprint/F26C7F594DFE84D131703AFC23E5A318AE8D2861).
The block below fetches all three and requires the full fingerprint to match.
Stop if a source is unavailable or disagrees; never use a key or verifier
supplied alongside a release as the trust anchor. Review these commands from
main and compare the fingerprint independently before running them.

Set `release_tag` to the published version you intend to install. The block
downloads public data into a private temporary directory and verifies the annotated
tag with an isolated keyring. The maintainer signs source; Sigstore binds the
installer and checksum bytes to that exact tagged workflow and source commit.
The block authenticates `SHA256SUMS`, release metadata and the installer, checks
their common attesting run, and only then runs the installer. The installer repeats
these checks for its archive before extraction. Keep the printed directory for
inspection. Only the authenticated installer is executed.

<!-- check: release-bootstrap -->
```sh
(
set -eu
release_fingerprint=F26C7F594DFE84D131703AFC23E5A318AE8D2861
release_tag=v0.1.0-alpha.1
release_dir=$(mktemp -d "${TMPDIR:-/tmp}/hennery-release.XXXXXXXX") || exit 1
printf 'Release verification directory: %s\n' "$release_dir"
mkdir "$release_dir/keyring" || exit 1
chmod 0700 "$release_dir/keyring" || exit 1
printf 'no-autostart\nno-auto-key-retrieve\n' > "$release_dir/keyring/gpg.conf" || exit 1
release_fetch() {
    curl --proto '=https' --proto-redir '=https' --tlsv1.2 -fsSL "$1" -o "$2" || exit 1
}
release_gpg() {
    gpg --batch --no-options --homedir "$release_dir/keyring" --no-autostart --no-auto-key-retrieve "$@"
}
release_git() {
    env GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 GIT_NO_REPLACE_OBJECTS=1 \
        GNUPGHOME="$release_dir/keyring" git -c credential.helper= -c core.hooksPath=/dev/null "$@"
}
release_verify_tag() {
    case "$release_tag" in v*) ;; *) return 1 ;; esac
    printf '%s\n' "$release_tag" | LC_ALL=C grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || return 1
    release_git init --bare --template= "$release_dir/source.git" >/dev/null 2>&1 || return 1
    release_git --git-dir="$release_dir/source.git" fetch --no-tags --depth=1 \
        https://github.com/marcinwadon/hennery.git "refs/tags/$release_tag" >/dev/null 2>&1 || return 1
    release_object=$(release_git --git-dir="$release_dir/source.git" rev-parse FETCH_HEAD) || return 1
    printf '%s\n' "$release_object" | LC_ALL=C grep -Eq '^[0-9a-f]{40}$' || return 1
    release_git --git-dir="$release_dir/source.git" cat-file tag "$release_object" > "$release_dir/tag-object" || return 1
    release_git --git-dir="$release_dir/source.git" -c gpg.format=openpgp -c gpg.program=gpg \
        verify-tag --raw "$release_object" > "$release_dir/tag-output" 2> "$release_dir/tag-status" || return 1
    awk -v fp="$release_fingerprint" '
        $1 == "[GNUPG:]" && $2 == "VALIDSIG" { count++; if ($3 != fp) bad=1 }
        $1 == "[GNUPG:]" && $2 ~ /^(BADSIG|ERRSIG|EXPSIG|EXPKEYSIG|REVKEYSIG|KEYEXPIRED|SIGEXPIRED|KEYREVOKED|NO_PUBKEY|NODATA|FAILURE|ERROR)$/ { bad=1 }
        END { exit !(count == 1 && !bad) }
    ' "$release_dir/tag-status" || return 1
    release_source=$(awk -v tag="$release_tag" '
        /^$/ { done=1 }
        !done && $1 == "object" { objects++; sha=$2; if (NF != 2 || length(sha) != 40 || sha ~ /[^0-9a-f]/) bad=1 }
        !done && $1 == "type" { types++; if ($0 != "type commit") bad=1 }
        !done && $1 == "tag" { tags++; if ($0 != "tag " tag) bad=1 }
        END { if (objects != 1 || types != 1 || tags != 1 || bad) exit 1; print sha }
    ' "$release_dir/tag-object") || return 1
}
release_attest() {
    gh attestation verify "$1" --bundle "$release_bundle" --repo marcinwadon/hennery \
        --cert-identity "https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/$release_tag" \
        --source-ref "refs/tags/$release_tag" --source-digest "$release_source" --signer-digest "$release_source" \
        --cert-oidc-issuer https://token.actions.githubusercontent.com --predicate-type https://slsa.dev/provenance/v1 \
        --deny-self-hosted-runners --format json > "$2" || return 1
}
release_check_hash() {
    release_expected=$(awk -v name="$2" '$2 == name { count++; sha=$1 } END { if (count != 1) exit 1; print sha }' "$release_checksums") || return 1
    if command -v sha256sum >/dev/null 2>&1; then
        release_actual=$(sha256sum -b "$1") || return 1
    elif command -v shasum >/dev/null 2>&1; then
        release_actual=$(shasum -a 256 -b "$1") || return 1
    else
        return 1
    fi
    release_actual=$(printf '%s\n' "$release_actual" | awk '{ print $1 }') || return 1
    [ "$release_actual" = "$release_expected" ] || return 1
}
release_verify_payload() {
    [ -s "$release_checksums" ] && [ -s "$release_metadata" ] && [ -s "$release_bundle" ] || return 1
    release_attest "$release_checksums" "$release_dir/checksums.verified.json" || return 1
    release_last=$(tail -c 1 "$release_checksums") || return 1
    [ -z "$release_last" ] || return 1
    LC_ALL=C awk '
        { name=$2; lower=tolower(name) }
        length($1) != 64 || $1 ~ /[^0-9a-f]/ || name !~ /^[A-Za-z0-9][A-Za-z0-9._-]*$/ || $0 != $1 "  " name { bad=1 }
        lower == "sha256sums" || lower == "release.sigstore.jsonl" || seen[lower]++ || (NR > 1 && name <= previous) { bad=1 }
        { previous=name }
        END { exit !(NR > 0 && !bad) }
    ' "$release_checksums" || return 1
    release_check_hash "$release_metadata" release-metadata.json || return 1
    release_attest "$release_metadata" "$release_dir/metadata.verified.json" || return 1
    release_run=$(jq -er --arg tag "$release_tag" --arg sha "$release_source" --arg object "$release_object" '
        if .schema == 2 and .repository == "marcinwadon/hennery" and .tag == $tag and .source_sha == $sha and .tag_object == $object
            and (.attesting.run_id | type == "number" and . > 0 and floor == .)
            and (.attesting.run_attempt | type == "number" and . > 0 and floor == .)
        then "https://github.com/marcinwadon/hennery/actions/runs/\(.attesting.run_id)/attempts/\(.attesting.run_attempt)"
        else error("release metadata source/tag/run mismatch") end
    ' "$release_metadata") || return 1
    release_check_hash "$1" "$2" || return 1
    release_attest "$1" "$release_dir/payload.verified.json" || return 1
    for release_result in checksums metadata payload; do
        jq -e --arg run "$release_run" '
            type == "array" and length > 0 and all(.[]; .verificationResult.signature.certificate.runInvocationURI == $run)
        ' "$release_dir/$release_result.verified.json" >/dev/null || return 1
    done
}
release_fetch https://raw.githubusercontent.com/marcinwadon/hennery/refs/heads/main/README.md "$release_dir/main-readme"
grep -F -- "$release_fingerprint" "$release_dir/main-readme" >/dev/null || exit 1
release_fetch https://github.com/marcinwadon.gpg "$release_dir/github.asc"
release_fetch "https://keys.openpgp.org/vks/v1/by-fingerprint/$release_fingerprint" "$release_dir/keyserver.asc"
for release_source in github keyserver; do
    release_gpg --with-colons --with-subkey-fingerprint --show-keys "$release_dir/$release_source.asc" > "$release_dir/$release_source.fingerprints" || exit 1
    awk -F: -v fp="$release_fingerprint" '$1 == "fpr" && $10 == fp { found=1 } END { exit !found }' "$release_dir/$release_source.fingerprints" || exit 1
done
release_gpg --import "$release_dir/github.asc" "$release_dir/keyserver.asc" || exit 1
release_verify_tag || exit 1
release_url="https://github.com/marcinwadon/hennery/releases/download/$release_tag"
for release_file in SHA256SUMS release-metadata.json release.sigstore.jsonl hennery-installer.sh; do
    release_fetch "$release_url/$release_file" "$release_dir/$release_file"
done
release_checksums="$release_dir/SHA256SUMS"
release_metadata="$release_dir/release-metadata.json"
release_bundle="$release_dir/release.sigstore.jsonl"
release_verify_payload "$release_dir/hennery-installer.sh" hennery-installer.sh || exit 1
sh "$release_dir/hennery-installer.sh"
)
```

## Homebrew

The project tap is implemented with publication disabled until a stable release
passes native acceptance. The first alpha stays GitHub-only. See the
[Homebrew guide](docs/homebrew.md) for installation, upgrade, removal and the
service PATH/restart requirements. Package operations preserve user data and
never automatically manage services or agent logins.

## Quickstart

Build with [Nix](https://nixos.org/download/) with flakes enabled, or use
[Build without Nix](#build-without-nix) below. On every machine that runs
agents, you need the CLI for each agent you want to use
already logged in with your own subscription. The flake supports Apple
Silicon macOS, and x86_64 and aarch64 Linux.
The bundled CLIs are not added to your `PATH`. After `up` or `host join`
installs the runtime, run `hennery doctor` on each agent machine. Check 4,
**logged in**, reports whether each agent is logged in and prints a fix when
it is not; doctor does not log in for you.

### 1. Build

Get the source:

<!-- check: clone -->
```sh
git clone https://github.com/marcinwadon/hennery.git
cd hennery
```

Build the web UI, then the binary, which embeds it. The dev shell brings
Rust, Node and pnpm; with direnv, `direnv allow` once and leave out the
`nix develop -c` prefixes. `HENNERY_WEB_REQUIRE=1` makes the build fail if
the web UI was not built first, instead of embedding a placeholder page.

<!-- check: build -->
```sh
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web build
HENNERY_WEB_REQUIRE=1 nix develop -c cargo build --release --locked -p hennery
export PATH="$PWD/target/release:$PATH"
```

Or let Nix build the whole package:

<!-- check: nix -->
```sh
nix build
./result/bin/hennery --version
```

The binary is then `result/bin/hennery`; put that directory on your `PATH`
instead.

#### Build without Nix

Prerequisites (plus Git to get the source above):

- **Linux:** a C compiler, `make` and `perl` (including its core modules).
- **macOS:** Xcode Command Line Tools; macOS supplies `perl`.
- **Both:** Rust via [rustup](https://rustup.rs/) (latest stable, the
  toolchain CI uses), and Node 24 with its `npm`/`npx` on `PATH`.

From the source directory, build the web UI with the flake's pinned pnpm
12.3.4 through `npx`, without installing pnpm globally. OpenSSL is built
and linked into the binary; no system OpenSSL is needed.

<!-- check: build-without-nix -->
```sh
npx --yes pnpm@12.3.4 --dir web install --frozen-lockfile
npx --yes pnpm@12.3.4 --dir web build
HENNERY_WEB_REQUIRE=1 cargo build --release --locked -p hennery --features vendored-openssl
export PATH="$PWD/target/release:$PATH"
```

Continue with step 2 below. Starting hennery, setup, `doctor` and agent
logins are the same for both builds.

### 2. Start

<!-- check: up -->
```sh
hennery up
```

`hennery up` runs the collector and a host for this machine, and pairs the
two. It listens on `http://127.0.0.1:7117` and keeps its data in
`~/Library/Application Support/hennery` (macOS) or `$XDG_DATA_HOME/hennery`,
by default `~/.local/share/hennery` (Linux). The first start downloads Node
and the managed adapter set, including its bundled agent CLIs.

On its first start it writes a one-time setup link, valid for an hour, to
`collector/setup-url` in the data directory until setup, and prints the link
when running in a terminal. Open that link: by default it uses
`http://localhost:7117`, which is the browser origin to keep using. Choose
and confirm a password of at least 12 characters, check **Public URL** and
**Default hat**, then press **Set up**. You are signed in; add a passkey or
press **Skip** (or **Continue** if passkeys are unavailable). Back up
`collector/master.key` together with `collector/hennery.db`: the gateway's
credentials cannot be read without it.
If the setup link has expired, `hennery admin setup-url` prints a fresh one.

### 3. Pair another machine

With a verified HTTPS front end, use the public `https://` origin printed by
**Hosts → Add host**: the host enrolls over HTTPS and runs over WSS. System
roots are the default. `host join --ca-cert <file>` imports a private CA for
this collector only and saves it; browsers and adapters need their own trust
configuration. Use `hennery doctor` to check TLS, health and the host upgrade.

To move an existing tunnel pairing, park its sessions and stop the host
service, then use `hennery host transport set <https-origin> --system-roots`
(or `--ca-cert <file>`) with the existing host data directory. This verifies
the existing identity and preserves its key, roots, CLI settings and outbox.
Restarting the host parks adapters; resume sessions normally afterwards.
For CA rotation, save an old-plus-new CA bundle, restart, renew the server,
then save a bundle without the old CA and restart again. Leaf renewal under
the same CA needs no host restart. A `DurabilityUncertain` save means the new
settings are visible but may not survive a crash: inspect the saved endpoint
and repeat the explicit save after storage is healthy.

An uncertain enrollment blocks `join`, `run` and `up`. Follow doctor's attempt
id: inspect the collector's Hosts list, revoke any entry created by that
attempt, then use the explicit enrollment archive action before joining
again. Archiving preserves the journal and key locally; it cannot confirm a
remote revoke. Automatic pairing remains suppressed after an archive.

The SSH tunnel remains an optional deployment choice. On the other machine,
open it with
`ssh -N -L 7117:127.0.0.1:7117 <collector-machine>`; replace
`<collector-machine>` with your SSH destination. Keep this terminal open
while pairing and while `hennery host run` runs. If local port 7117 is
already in use, choose another local port in the tunnel and join command.

For browser access over HTTPS, a reverse proxy on the collector's machine
can serve `up` at an `https://` address, including its host WebSocket. If `up` is already running,
stop it with Ctrl-C and restart it with that address before setup:

<!-- check: up-public -->
```sh
hennery up --public-url https://hennery.example
```

Already set up at `localhost`? Then `--public-url` is ignored: move it
with `hennery admin reset-public-url` (see [Recovery](#recovery)), and from
then on open hennery at the new address, since the old one is refused.
For the collector's machine configuration, set `proxy_client_ip_peers` to
only the proxy's exact backend connection IP (for these loopback recipes,
`["127.0.0.1"]`) in `<collector-data>/config.toml`, then restart the
collector. It is an address budget policy, never login authority. A missing
header falls back to the TCP peer, so local `up` enrollment still works;
without this setting all clients behind the proxy share its limiter budget.
A typo, CIDR, hostname, port, duplicate, unspecified/multicast address, or
more than eight peers fails configuration. IPv4-mapped peers are normalized.

Use the [tested Caddy/nginx recipes](packaging/proxy/README.md). The final
same-machine proxy must overwrite every `Hennery-Client-IP` instance from
its actual connection peer; standard forwarding headers grant nothing.
Restrict backend access, preserve Origin and the upgrade nonce, and apply
edge connection/request caps. A trusted loopback peer also trusts local
processes to assert budget addresses. Healthy HTTPS alone cannot establish
header stripping or two separate client budgets; doctor says so.

The fixture deployment gate covers both recipes and W1 recovery through
them. Public acceptance with both pinned real adapters and mounted MCP is
still pending; keep ingress restricted to a trusted population until the
[public deployment gate](packaging/proxy/README.md#public-deployment-gate)
is recorded. Tailscale Serve needs its own attribution qualification; if
it cannot overwrite an authenticated client address, use a trusted VPN
population and retain the shared-budget limitation.

With that HTTPS origin configured, **Hosts → Add host** supplies the remote
pairing command. Here `hennery.example` is a public-join placeholder for your
collector's DNS name, `443` is a public-join placeholder for its HTTPS port,
and `ABCD-EFGH` is a public-join placeholder for the displayed code. Replace
only those values; retain `https://`. Omitting the code reads it from stdin.

<!-- check: join-public -->
```sh
hennery host join https://hennery.example:443 ABCD-EFGH
```

Run the host block below after pairing. It saves and reconnects through
`wss://<your-origin>/api/hosts/ws`, validating the same server name and roots.
The tunnel command below remains an optional fallback.

In the web UI, **Hosts → Add host** shows a pairing code, valid for ten
minutes, after asking for your password again if a fresh step-up is needed.
Its printed command uses the public URL; when choosing the tunnel, adapt it to the
`http://127.0.0.1` address as below. Build hennery on the other machine and
run the join command in another terminal (it also downloads the runtime).
In this block, `7117` is a placeholder for the tunnel's local port, and
`ABCD-EFGH` is a placeholder for the code shown by **Add host**. Replace
them with your port and code; leave the code out to type it instead and
keep it out of shell history. Keep the `http://127.0.0.1` scheme and host:

<!-- check: join -->
```sh
hennery host join http://127.0.0.1:7117 ABCD-EFGH
```

<!-- check: host-run -->
```sh
hennery host run
```

`host run` uses the saved WSS endpoint for HTTPS pairings. A tunnel pairing
uses `ws://127.0.0.1:<port>/api/hosts/ws`; keep that tunnel port available
on future runs. Transport failures never authorize a fresh pairing.

### 4. Start a session

**New session**: pick a connected host, an agent and a project directory, then
**Start session**, and type your first prompt.
Unless workspace roots are configured, the project list is empty: use
**Browse** under the host user's home, or pass `--workspace-root <directory>`
to `up` or `host run` to list repositories under that root. The flag is
repeatable.

### 5. Connect an MCP server

For a remote server with a static token, open **MCP → Add connection**.
Fill in **Name**, **Slug**, **Server URL** and **Hat**; choose **Token** under
**Authentication**, and set **Header** and **Prefix** as the server requires
(the prefix includes any trailing space). Press **Create**, then enter the
**Token** and press **Save token**. Under **Hosts whose sessions get it**,
tick the hosts to use it; each tick saves immediately. Where delivery is
supported, sessions in that hat on those hosts receive it as
`hennery-<slug>` at their next start or resume.
The status stays **Not used yet** until traffic goes through it.
Use an HTTPS server URL; **Internal network** permits plain HTTP only to
internal addresses (loopback included), for a server you run there.

For a local stdio server, use **MCP → Local MCP servers**. Choose **Host**
and **Hat**, then **Add local server**. Fill in **Server name** and
**Command** (on that host); use **Add argument** for each argument and
**Add environment variable** for secrets. Press **Review local servers**,
check the commands, then **Save local servers**. Saving replaces the whole
set for that host and hat, including removals, at the next start or resume.
Environment values cannot be read back from hennery.

Agents without per-hat isolation receive hennery MCP servers only in the
host's default hat. Check the delivery prediction beside the host or on
**New session** for the agent you chose; the session reports what it was
given at its last start or resume.
This default-hat restriction also applies to Claude with `--use-cli`.

These actions may ask you to confirm your password again.

#### OAuth

In **MCP → Add connection**, fill in the connection fields and choose
**OAuth: automatic registration** under **Authentication** if the vendor
supports dynamic registration, or **OAuth: pre-registered client** if you
register the client yourself. Press **Create**. OAuth addresses must use
HTTPS, or HTTP to this machine.

The vendor must allow hennery's redirect URI:
`<public_url>/api/mcp/oauth/callback`, using the collector's configured
browser origin as `public_url`. The exact URI is shown in the pre-registered
add/edit form and client settings beside **Register this redirect URI at the vendor:**
For a pre-registered client, enter **Client ID**, then choose
**Public client (no secret)** or **Set a new secret** under **Client secret action**.
Enter **Client secret** if you chose **Set a new secret**. Press **Save client**.
Saved secrets are write-only and cannot be read back from hennery.

Click **Connect** or **Reconnect** when offered to open the vendor consent
popup. If popups are blocked, use **Open vendor sign-in**. Return to hennery
after consent. If a fresh confirmation is required before authorization,
the popup closes and you confirm your password in the main window (or use
**Confirm with passkey** if offered). Then follow the card and click
**Connect** or **Reconnect** again if offered; authorization is not retried
automatically.

The card shows the gateway's last report, with **Status recorded** and
**Last checked**. **Probe now** requests a report;
it does not establish live health, and **Working** is a recorded status.
**May need sign-in** (`needs_auth`) calls for **Reconnect**; read the
gateway note, since an authorization-server outage can also cause this state.

## Recovery

Run these on the collector's machine while hennery runs, as the user that
runs it; each asks for confirmation on the terminal. For a collector not in
the default place, give `--data-dir <dir>` right after `admin`.

- **A forgotten password:** set a new one. It signs out every browser session and
  removes every passkey.

  <!-- check: reset-password -->
  ```sh
  hennery admin reset-password
  ```

- **The collector moved** (another address, or behind a proxy): every
  sign-in and change is refused with `origin_mismatch` until hennery knows
  the address the browser now uses. Give it that origin: `https://`, or
  `http://` to a loopback address, with no path. It signs out every browser
  session; passkeys stop working if the host name changes, and are then
  removed.

  <!-- check: reset-public-url -->
  ```sh
  hennery admin reset-public-url https://hennery.example
  ```

## Licence

hennery is licensed under the [GNU Affero General Public License v3.0](LICENSE).
``````

<!-- replay-file: {"path":"crates/hennery/Cargo.toml","mode":"100644","sha256":"cbceea39fd9eb34a010db2f86231a2aa52ff775dc8c975660c5066f3b7901298","encoding":"utf8"} -->
``````toml
[package]
name = "hennery"
version.workspace = true
edition.workspace = true
license.workspace = true
rust-version.workspace = true
publish = ["crates-io"]
readme = "README.md"
include = ["/src/**", "/Cargo.toml", "/Cargo.lock", "/README.md", "/LICENSE", "/build.rs"]
description = "Self-hosted cockpit for ACP coding agents"
repository.workspace = true
homepage.workspace = true

[features]
default = ["vendored-openssl"]
# Release builds (plan 7a): build OpenSSL, which `webauthn-rs-core` links,
# from source and link it statically, so the binary needs no system OpenSSL
# (distribution spec §1.1). Nix opts out for its system-library build.
vendored-openssl = ["dep:openssl", "openssl/vendored"]

[dependencies]
anyhow.workspace = true
axum.workspace = true
clap.workspace = true
libc = "0.2"
openssl = { workspace = true, optional = true }
# `doctor`'s requests to the collector (plan 7d-ii): the host's own client.
reqwest.workspace = true
hennery-gateway.workspace = true
hennery-host.workspace = true
hennery-kernel.workspace = true
hennery-sessions.workspace = true
serde.workspace = true
serde_json.workspace = true
tokio.workspace = true
toml.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true

[dev-dependencies]
hennery-host = { workspace = true, features = ["test-hooks"] }
futures.workspace = true
hennery-testkit = { path = "../hennery-testkit" }
# Writes a subscription `subscribe` would refuse (plan 10b-ii's wiring test).
rusqlite.workspace = true
tempfile.workspace = true
# The supervisor's tests run on a paused clock.
tokio = { workspace = true, features = ["test-util"] }

# cargo-dist ships the same CLI as the Cargo package.
[package.metadata.dist]
dist = true
# OpenSSL built in for release archives (distribution §1.1).
features = ["vendored-openssl"]

# Upstream archives only. GNU users receive the qualified musl archives.
[package.metadata.binstall]
pkg-url = "{ repo }/releases/download/v{ version }/hennery-{ target }.tar.xz"
bin-dir = "hennery-{ target }/{ bin }{ binary-ext }"
pkg-fmt = "txz"
disabled-strategies = ["crate-meta-data", "quick-install", "compile"]

# Native binstall cannot enforce this signed-source verifier policy. A bridge needs review.
[package.metadata.hennery-release]
verification = "external-signed-tag-sigstore"
maintainer-fingerprint = "F26C7F594DFE84D131703AFC23E5A318AE8D2861"
signer-identity = "https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0-alpha.1"

[package.metadata.binstall.overrides.x86_64-unknown-linux-gnu]
pkg-url = "{ repo }/releases/download/v{ version }/hennery-x86_64-unknown-linux-musl.tar.xz"
bin-dir = "hennery-x86_64-unknown-linux-musl/{ bin }"

[package.metadata.binstall.overrides.aarch64-unknown-linux-gnu]
pkg-url = "{ repo }/releases/download/v{ version }/hennery-aarch64-unknown-linux-musl.tar.xz"
bin-dir = "hennery-aarch64-unknown-linux-musl/{ bin }"
``````

<!-- replay-file: {"path":"docs/README.md","mode":"100644","sha256":"728f921c49c8dbe981278692e7aa8f8073a8394a6951cf685750a94cfa5b4846","encoding":"utf8"} -->
``````markdown
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
   - [OAuth denial popup closure (flake 18)](plans/2026-11-04-flake-oauth-denial.md) — requires the popup's close event while accepting its self-closing click's target-closure acknowledgment; retains denial, grant and mount assertions. Controlled regression, copy probes, load and web verification are recorded; independent review and CI remain parent-owned.
   - [Release simplification](plans/2026-11-04-release-simplify.md) — source-signed single tag workflow, exact-run provenance and one protected folded publisher; old candidate/storage/App protocols removed. Design scoped re-review APPROVE at `0fddcc02`; PR #163 security re-review APPROVE at `13060037` (2026-10-16). Ubuntu fixture identity follow-up: explicit disposable tagger, private HOME/Git config and captured stderr; release 194, targeted 3 and 10 copy probes passed. Prior image/Node, Rust/Nix, replay and security-probe evidence is in the plan. Latest operator decision enables all channels without a pre-existing Hennery positive fixture; current stable-tag and signed channel-selection constraints are reported. Full current PR status and platform acceptance remain parent-owned.
   - [List-stream and MCP timing (flakes 13–14)](plans/2026-11-02-flake-list-stream.md) — paused-clock deletion checks and an awaited OAuth popup cleanup assertion, with controlled regressions, guard probes, load and replay evidence. Independent review and Linux/macOS CI remain parent-owned.
   - [Proxy fixture port lifetimes (flake 15)](plans/2026-11-03-flake-proxy-ports.md) — leases stable proxy ports across pauses and test processes outside the kernel ephemeral ranges; deterministic contention regressions, copy probes, load and replay evidence recorded. Parent review and Linux/macOS CI remain pending.
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
   - [The PWA and device Settings (P1)](plans/2026-10-26-phone-pwa.md) — four tasks: manifest/icons, digest-verified static-only worker, natural updates, fenced push lifecycle and minimum device Settings/mobile sign-out. Five review fixes independently CONFIRMED; CI 15/15 at `88ac41e2`. Rebased onto D1 `37fc7488`: both generator checks and full web/browser gate exit 0 (1,784 web tests; PWA 5 passed; Chromium 86 passed / 11 existing skips). Fresh tree replay: 64 blocks/eight matching trees. Earlier full replay: 2,148 Rust tests and 144 BITE probes. Draft #142 remains parent-managed; new-head CI/status and deployment approval remain with the parent. P2 owns click/deep-link/mobile-answer/relay and live iOS/vendor acceptance.
   - [Phone answers, deep links and gateway relay (P2)](plans/2026-10-29-phone-answers.md) — coherent owner-filtered question snapshots shared by HTTP/SSE, fenced notification navigation, mobile answers through the durable queue and gateway relay. Review amendments independently CONFIRMED per parent. Rebased onto R1 191aa71b with unchanged P2 implementation bytes and both README entries preserved; all six Rust gates (2,223 tests), web (1,818 tests / 101 files) and PWA (8 passed, 1280/390 px) exit 0. Six embedded patches reproduce 33 files and the rebased source tree. PR #148 was green before rebase; new-head CI/full status and installed-iOS/vendor/pinned-adapter acceptance remain parent-owned.
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
   - [Managed runtime and pinned adapters (7b)](plans/2026-10-08-managed-runtime.md) — plan 7b (7 tasks, two PRs): the adapter manifest (`crates/hennery-host/manifest.json`, compiled in) and its generator `hennery-pins`, the pin-bump job, the installer (resumable verified downloads, safe extraction, sets with `current`/`previous`, rollback hold, collection), `hennery host adapters update|rollback`, `join` installing the runtime, `host run`'s default agents from the installed set, and `--use-cli`. Pins proposed, operator to confirm. Amended after the security review of 2026-10-01 and the plan review of 2026-10-02; executed 2026-10-02 as PR #51 and its stacked follow-up (see its "Execution status").
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
   - [Plug-in inventory paging (C1b)](plans/2026-11-01-plugin-inventory-paging.md) — independent 500-id/128-KiB inventory pages, renewable 60-second idle expiry and a fixed 20-minute snapshot lifetime; completed activity remains capped at 20 items. A real HTTP 10,000-source reset takes 20 pages within the unchanged shared budgets. Built first, replayed from merged C2 with all 790 tracked files matching, and all 23 removal probes detected after strengthening cursor/envelope coverage. All six Rust checks passed (2,383 tests), and native Nix passed. Independent review and Linux/macOS PR CI remain parent-owned.
   - [Reference memory service (memory R1)](plans/2026-11-01-recall-service.md) — opt-in `hennery-memory`, with separate storage/auth, scoped SQLite FTS and four bounded MCP tools; deterministic C1 notes without a model, renewed leases, deletion fences, suppression and honest purge receipts. Built on C1b; the execution record carries mounted live proof, copied guard probes, timing load and the single fresh replay. Independent review and Linux/macOS PR CI remain parent-owned. Review amendment: bounded cursor-committed deduplication and linear, chunked inventory reconciliation correct both Medium findings; targeted checks, Nix, timing load and copy probes passed. Parent re-review APPROVE at `b2ca6147`; memory source/tests unchanged after the D4/C1b rebase. All six Rust gates, targeted memory tests and Nix passed; current-head CI/full PR status remain parent-owned.
   - [Plug-in startup context (C2)](plans/2026-10-30-plugin-startup.md) — scoped opt-in context in a new session's first operator prompt, typed provenance and separate display, bounded failures and lifecycle fences. Security re-review approved at `b1f9b402`; rebased onto D2/P2 main `a58479c7` with both command/config/close fences preserved. Final six Rust checks passed (2,374 tests), web gate passed (1,823 tests), Nix flake check passed, fresh integration replay matched 790 files, four copy probes caught and 516 loaded test executions passed. Post-rebase delta review and Linux/macOS PR CI remain parent-owned.

   - [WSS transport and diagnostics (W1)](plans/2026-10-26-wss-transport.md) — merged as #139; verified HTTPS/WSS transport, private-CA trust, durable enrollment recovery, migration and diagnostics. Its record preserves the build/review history; public real-adapter/MCP acceptance is carried into W2.

   - [Proxy attribution and public deployment (W2)](plans/2026-10-27-wss-proxy.md) — built and replayed on `256691fe`: exact trusted peers across all limiter charges/clears, executed proxy/HTTPS README recipes and W1 recovery gates. PR #147 maintainer-delegated review returned APPROVE AFTER AMENDMENTS; its one request-cap coverage Minor is implemented, removal-probed and locally checked. Scoped re-confirmation, Linux/macOS CI and live public-adapter/MCP acceptance remain pending.
   - [Session-bound MCP and family identity (D1)](plans/2026-10-27-delegation-mcp.md) — collector-local opt-in MCP delivery, generation-bound grants, shared identity and immutable scoped family storage; built first, exact fresh replay and guard/load evidence recorded. Actual pinned Claude/Codex discovery passed. Maintainer-delegated review returned APPROVE; its one cycle-fixture Minor is corrected and independently probed. Linux/macOS CI remains parent-owned; tools, durable delivery and UI follow in D2–D4.
   - [Delegation tools, catalog and configuration (D2)](plans/2026-10-29-delegation-tools.md) — seven scoped tools, host catalogs and fenced owned-child commands; ordinary elicitation only, one generation. Amendments are CONFIRMED and the Nix SQL-source fix is approved. Rebased onto P2 at cdcd0cb8, preserving both implementations and all owner-audit cases. All six Rust checks (2,339 tests) and native Nix flake checks passed. Historical replay/load evidence remains in the plan; PR #149 and Linux CI remain parent-owned. D3–D4 follow.
   - [Durable delegation delivery (D3a)](plans/2026-10-31-delegation-delivery.md) — transactional notices and automatic parent question/answer/report delivery. Rebased onto merged C2 7fe43fbe, retaining startup context/fences and both provenance guards; a test-first ChildReport transcript fix and four cloned-copy probes passed. Draft PR #151 review amendments coalesce the actual host crash sequence, preserve strict C1 provenance after source deletion in both directions, and protect out-of-turn question projections. All six Rust gates (2,369 tests), native Nix checks, 12 amendment copy probes, 4×3 load and exact fresh amendment replay (five files; 781 tracked files compared) passed. Re-review and CI remain parent-owned; D3b attention/push and D4 family UI/live acceptance block ordinary release.
   - [Delegation attention and operator fallback (D3b)](plans/2026-11-01-delegation-attention.md) — durable deadlines, operator attention/rearm, reconciled push and delete/reassign fences. Four review findings fixed test-first: atomic fallback after cancelled parent answers, host-independent reconciliation, deletion-safe crash tombstones and schema-19 orphan-question backfill. Six Rust gates (2,443 tests), native Nix, eleven cloned-copy guard probes and the new timing test at 4×3 passed. No amendment replay under the verification budget. D3a/C2 implementation untouched; independent re-review/CI and D4 UI/live acceptance remain parent-owned, with preview gating enabled.
   - [Delegation families and live acceptance (D4)](plans/2026-11-02-delegation-families.md) — scoped family API and panel, factual attention counts, status acknowledgement, explicit takeover, typed parent/report authorship, durable SSE invalidation and phone card-open integration. Includes the real pinned Codex transport-metadata regression and an opt-in provider harness. Built first; the first review’s three P2 stream/version/scope findings are fixed test-first. The amendment passed all six Rust gates (2,466 tests), native Nix, the web gate (1,862 tests), cloned-copy probes and load checks; re-review remains pending. Verification and live acceptance are recorded in the plan. Ordinary release remains gated until the full live matrix passes; independent review and CI remain parent-owned.

   - [Release foundation (R1)](plans/2026-10-28-release-foundation.md) — hardware-backed inventory approval plus the executed verify-then-run README bootstrap, re-confirmed by the parent. The Linux CI tool-directory collision is repaired with duplicate-name/conflict regressions. Rebased onto W2 at `e36e66c8`; post-rebase checks, COPY probes and fresh replay evidence are recorded in the plan. PR #145 awaits review and CI; maintainer-only setup remains and publication is disabled.
   - [GHCR collector image (R4)](plans/2026-10-28-ghcr-image.md) — rebased onto Homebrew main `10abd28f`, preserving both registered channels and native proofs. GHCR and retention use explicit status guards; a secret-free Actions regression covers selected GHCR and retention after skipped GHCR/crates. R4, release and packaging suites plus DAG policy/lint passed; 13 COPY probes caught. No Rust changes or full reruns. Draft #143 Docker/scheduling CI and scoped re-review remain parent-owned. Nothing published.

   - [Homebrew tap (R2)](plans/2026-11-02-homebrew-tap.md) — frozen cargo-dist formula, secret-free native local-tap install/upgrade/uninstall CI on macOS arm64 and both Linux architectures, registered owning channel, protected signed-inventory publisher, and service/PATH guidance. Local macOS 27/CLT 26.6 refusal is retained without bypass; the parent owns native CI acceptance and independent review. Publication remains disabled.

   - [Crates.io and cargo-binstall (R3)](plans/2026-10-28-crates-io.md) — seven package-local production crates and signed R1 gates; rebased onto C2/D2 main 7fe43fbe. Fresh tarball acceptance found and fixed Cargo basename include collisions at 1dc57fe4, with real Cargo regression, test-harness refusal and production feature auditing. All seven dry runs/offline builds, locked/unlocked registry installs, UI/browser checks and Rust 1.88 pass on the new candidate. All six Rust checks pass (2376 passed, one unchanged pinned-adapter test ignored); release129, packaging82, actionlint and native full Nix checks pass. Four RED regressions, exact-tree fresh replay and ten COPY probes are recorded. Opt-in hook source is retained, disabled in production. Native binstall and both publication switches remain off; R4 now supplies the registered GHCR aggregate; see its rebase record. Scoped parent review, current PR #144 status and maintainer-only setup remain.

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
``````

<!-- replay-file: {"path":"docs/homebrew.md","mode":"100644","sha256":"1f93613b807b1cad59b100b3cec53b7b8d646ea7f571638004a0cecbfde764c6","encoding":"utf8"} -->
``````markdown
# Homebrew installs and services

The planned project tap is `marcinwadon/homebrew-tap`. Publication is disabled
until the maintainer enables a qualified stable release; the first alpha is
GitHub-only. The commands below become available after that enablement. The
binary formula covers Apple Silicon macOS and x86_64/aarch64 Linux, subject to
native CI acceptance. It does not qualify Intel macOS or managed Alpine hosts.

Install the versioned release archive and check the executable:

<!-- check: homebrew-install -->
```sh
brew install --formula marcinwadon/tap/hennery
hennery --version
brew --prefix hennery
```

The formula verifies archive SHA-256 and installs the same executable, embedded
UI, licence and third-party notices. The normal tap path trusts Homebrew, the
tap and GitHub release hosting; it does not independently perform the README's
signed-source tag, SHA256SUMS and exact tagged-workflow Sigstore verification. Installation starts no service,
installs no agents and changes no login. A host may download its separately
pinned runtime when the operator later joins or starts it.

Before installing a service, put Homebrew's stable binary directory on the
login shell's PATH and check which Hennery executable is selected. Use Hennery's
own service installer, choosing the existing role and data directory. There is
no separate Homebrew service definition: do not register it through Homebrew's
service manager. Hennery records the invoked executable path and captures the
login shell's PATH; use the stable Homebrew binary link rather than an absolute
versioned Cellar path. A graphical macOS login is required for the user agent.

Upgrade and run the formula's version, embedded-UI and notices checks:

<!-- check: homebrew-upgrade -->
```sh
brew upgrade --formula marcinwadon/tap/hennery
hennery --version
brew test marcinwadon/tap/hennery
```

An already-running process continues to use its old executable after upgrade.
Run Hennery's service installer again with the same role and data directory to
refresh PATH and restart it. This is especially necessary for a service that
names an old Cellar path. Check service status and doctor afterwards; upgrade
never silently restarts a service or changes its role. Preserve the data backup
and migration precautions in the README.

Before package removal, explicitly stop and uninstall any Hennery service with
Hennery's service uninstaller. Then remove every installed package keg:

<!-- check: homebrew-uninstall -->
```sh
brew uninstall --force marcinwadon/tap/hennery
```

This removes package files and links, preserving user data, managed runtime,
agent logins and operator service definitions. Removing the formula alone is
not a service uninstall or a data purge.

The native PR and candidate jobs execute these exact three command blocks in a
fresh pinned Homebrew prefix and local file-based tap, with scratch home/cache/
config. They first install the candidate with its actual formula/Cellar version,
then clear that installation and seed a separate old-version fixture labelled
0.0.0 using the same candidate payload. Upgrading it proves Homebrew's
transaction, not an older application's migration. Every installed executable
is compared byte-for-byte with the candidate archive, its exact first version
line and its candidate source commit. Both candidate kegs must match the tag.
Removal checks package leftovers and preserved data/service
sentinels. macOS 27 with CLT 26.6 refused the local proof; that check remains
intact. Native runner CI is the acceptance evidence.

Generated with Claude AI — please review before distribution.
``````

<!-- replay-file: {"path":"docs/release-process.md","mode":"100644","sha256":"b7a9f4bbd7d77de258a9e97af6b03baa4294fb9eaf67dd5941c0a4938e0da140","encoding":"utf8"} -->
``````markdown
# Release process

The operator's 2026-10-16 decision replaces the former candidate/storage and
inventory-signature process. Publication remains disabled until the maintainer
explicitly qualifies and enables it. The latest operator decision (2026-10-16)
enables all channels for the first release without waiting for a first-release
positive fixture. The crates bootstrap token is set in `release`, the Homebrew
tap exists, and the operator supplies the Homebrew/GHCR tokens. Building or
fixing this pipeline performs no publication or external settings change.

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

Switches default off; only the operator changes their platform values:
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

The latest operator decision supersedes the earlier pre-enablement fixture
requirement. The maintainer authorizes the first release's public-log disclosure.
After that release, preserve its original payload, genuine Hennery attestation
bundle and trusted-root fixture as the authentic positive Hennery verifier fixture. Verify
it with the pinned CLI and production policy as follow-up evidence, without
delaying channel enablement. The checked-in upstream `sigstore/sigstore-js`
fixture proves real cryptography/JSON shape and production Hennery rejection; substituted Hennery
fields prove structure only. They do not replace authentic Hennery evidence.

Current code still restricts prereleases to GitHub and defaults signed-source
`packaging/release/channels.json` to `["github"]`. The first all-channel run
requires the appropriate stable tag and reviewed channel selection. This CI
fixture fix changes neither those guards nor platform switches.

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

Authenticated GitHub transport stays in the publisher parent. Verifier children
receive only an explicit credential-free allow-list and fresh private Git/GPG,
GitHub CLI and Docker/ORAS configuration, including no GitHub or Actions/OIDC
tokens. The crates writer asks the parent to revalidate over private pipes; it
does not spawn a verifier with its upload token.

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
  referrer responses. Referrer manifests are canonical and use a fixed creation
  timestamp: discover and fetch existing manifests/blobs, refuse differing bytes
  and upload only missing ones. Complete retries write nothing; partial retries
  fill the missing set. Before success, cryptographically verify every bundle
  fetched back from the registry against the frozen OCI subject and original
  run. Checking the original local sidecars is insufficient. Do not move aliases
  until all selected channels/public paths pass.

Public install, Homebrew service/PATH, crate UI/source and image runtime
acceptance remain maintainer-owned after authorized publication. Stop services,
back up complete data/config/keys and check schema compatibility before rollback.
Restore a compatible backup or ship a forward fix rather than overwriting
immutable versions. Retain corresponding source and document remediation.

Generated with Claude AI — please review before distribution.
``````

<!-- replay-file: {"path":"docs/specs/2026-10-15-distribution-release-design.md","mode":"100644","sha256":"2b709fac4e7e266649a95e9b7bffd63bb4c62692f4c1091e5bce5f369ab2cd79","encoding":"utf8"} -->
``````markdown
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
is recorded in [release simplification](../plans/2026-11-04-release-simplify.md);
this design amendment authorizes no publication.

**Latest operator decision, 2026-10-16:** enable all channels for the first
release, without waiting for a first-release positive fixture. This supersedes
the earlier GitHub-only rollout and pre-enablement-fixture requirement below.
The crates bootstrap token is set in `release`, the Homebrew tap exists, and
the operator supplies Homebrew/GHCR tokens. Preserve the authentic first
Hennery fixture as follow-up evidence rather than an enablement gate. The
builder still does not change switches or publish. Current code still requires
a stable tag for non-GitHub channels and signed-source channel selection;
`channels.json` currently selects only `github`. Resolve that tag/selection
with the parent before the first all-channel run; no version gate is weakened.

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

Verifier subprocesses receive an explicit credential-free environment allow-list,
not the publisher's environment with known secrets removed. Exclude GitHub write
tokens, every Actions/OIDC token and ambient credential-helper/config paths;
use fresh private Git, GPG, GitHub CLI and Docker/ORAS configuration. Fetch the
tag from the fixed public repository into a fresh bare repository. Authenticated
GitHub API transport remains in the Python parent. The crates writer requests
revalidation through private pipes to that parent; its verification gate never
spawns a child carrying the writer's registry token.

GHCR Sigstore referrers use canonical OCI manifests with a fixed creation-time
annotation and content-addressed names. Discover and fetch existing referrers,
refuse conflicting bytes, and upload only missing deterministic manifests after
renewed verification. Complete retries perform no image/referrer writes; partial
retries fill only the missing set. Before channel success, fetch every expected
bundle from the registry, check its manifest/blob digests and frozen bytes, then
cryptographically verify those fetched bundles against the checksum-bound local
OCI subject manifests and exact original run. Local sidecars alone cannot prove
registry referrer availability. Registry auth belongs only to transport, never
to the cryptographic verifier subprocess.

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
- **First authentic Hennery positive:** following the latest operator decision,
  collect this from the first authorized release, without delaying channel
  enablement. The maintainer authorizes the public-log disclosure. Download and
  independently verify its genuine
  tagged-workflow identity, source/signer digests, original run/attempt and
  payload/checksums with pinned `gh`; preserve bundle, payload and origin as the
  authentic Hennery positive fixture. The earlier pre-enablement requirement
  is superseded; upstream fixtures and structural tests still do not constitute
  authentic Hennery cryptographic evidence.
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
``````

<!-- replay-file: {"path":"flake.nix","mode":"100644","sha256":"04096c80cdade105d521b0ec448a4f7fe0add3ae3f592848298d80ac52f32df1","encoding":"utf8"} -->
``````nix
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
        # Offline release-policy tests and verification tools, pinned
        # by flake.lock. Publication credentials are never supplied here.
        devShells.release = pkgs.mkShell {
          packages = [
            (pkgs.python3.withPackages (ps: [ ps.pyyaml ]))
            pkgs.actionlint
            pkgs.cargo-audit
            pkgs.skopeo
            pkgs.shellcheck
            pkgs.gh
            pkgs.git
            pkgs.gnupg
            pkgs.jq
            web.nodejs_24
            pkgs.oras
          ];
        };
        # R4's non-publishing OCI/registry contract tests. Uses the same pinned
        # nixpkgs as the Rust checks; Docker Engine itself is provided by CI.
        devShells.image = pkgs.mkShell {
          packages = with pkgs; [ (python3.withPackages (p: [ p.pyyaml ])) actionlint shellcheck skopeo ];
        };
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            cargo
            rustc
            clippy
            rustfmt
            rust-analyzer
            # R3: pinned binstall acceptance and an isolated MSRV toolchain.
            actionlint
            cargo-binstall
            rustup
            sqlite
            # `webauthn-rs` links OpenSSL (plan 3c).
            openssl
            pkg-config
            # The PATH-capture tests run each login shell (plan 7c).
            bashInteractive
            zsh
            fish
            # Execute the shipped same-machine TLS proxy recipes (W2).
            caddy
            nginx
          ] ++ webTools;
          RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";
          # Playwright uses the flake's browsers, never a download of its own.
          PLAYWRIGHT_BROWSERS_PATH = "${browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
        };
      });
}
``````

<!-- replay-file: {"path":"packaging/README.md","mode":"100644","sha256":"0df297c019dffaf9ba3dde49e6d75a161635c10dfcdb08e7411ceca36e695bc7","encoding":"utf8"} -->
``````markdown
# Release builds

What a hennery release would ship is built by the `build` workflow
(`.github/workflows/build.yml`) on every pull request and every push to
`main` (distribution spec §2, plan 7a). It is checked, then kept as workflow
artifacts for a week. **Nothing is published:** there are no releases yet.

The single signed-tag `release.yml` builds fresh archives/UI/source/materials,
runs acceptance, produces one `SHA256SUMS` and attests final bytes in that exact
run. The maintainer reviews its exhaustive asset/hash summary, then one job in
protected environment `release` creates/read-back-verifies a draft, publishes an
immutable GitHub release and runs selected channels behind their default-off
switches. The [release process](../docs/release-process.md) describes setup and
[shared verification contract](release/README.md). Ordinary `build` artifacts
remain qualification probes and are never promoted to releases.

| Artifact | Built by | Checked by |
|---|---|---|
| `hennery-x86_64-unknown-linux-musl.tar.xz`, `hennery-aarch64-unknown-linux-musl.tar.xz` | `dist build`, natively on each architecture, with `musl-gcc` | `check-archive.sh` (the binary, its licence and README, nothing else); `check-linkage.sh` (no shared library, no loader); runs on the runner and on Alpine |
| `hennery-aarch64-apple-darwin.tar.xz` | `dist build` on macOS arm64 | `check-archive.sh`; `check-linkage.sh` (system libraries only); runs |
| `hennery-installer.sh` | `dist build --artifacts=global`, then `harden-installer.py` | `test-installer.sh`, on Linux x86_64 and on macOS |
| `hennery.rb` (Homebrew formula) | `dist build --artifacts=global` | `check-formula.sh` |
| `SHA256SUMS` (release only) | final single-run assembly | canonical exact payload closure; tagged-workflow provenance for checksum file and every payload |
| CI collector images and a two-platform OCI index | native BuildKit of `Dockerfile --target release` on staged musl binaries with marked CI fixture notices/SPDX; preserves SBOM/provenance metadata | OCI payload verification, signing-input extraction, then retained-digest loopback round-trip and `smoke-image.sh` |

[R4's collector-image guide](images.md) describes the release target, labels,
reviewed notices and binary/image SBOMs, native OCI inputs, gated GHCR
publication, digest deployment, volume upgrades and maintainer-only setup.
The shared verifier and registered GHCR acceptance job are integrated; publication
remains disabled pending independent review and maintainer qualification.
PR/main images are never promoted to releases.

Every archive builds with the `vendored-openssl` feature
(`dist-workspace.toml`). OpenSSL, which `webauthn-rs-core` links, is then
compiled in from source. Without it, the macOS binary would load Homebrew's
`libssl` and fail on a Mac without it, and a static musl build would not
link at all (distribution §1.1). Cargo builds now enable vendored OpenSSL by default (R3); Nix opts out with
`--no-default-features` and uses its system-library inputs.

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

## Crates.io and cargo-binstall (R3)

The seven production crates opt into crates.io at one exact version. Publish
in this order: hennery-proto, hennery-kernel, hennery-view, hennery-host,
hennery-gateway, hennery-sessions, hennery. The workspace default, testkit and
pin generator remain private. Library compatibility is pre-1.0 application
support, not a separately stable SDK. Protocol/view generators are build tools,
not advertised install products.

The `crates` CI workflow prepares from a fresh git-archive snapshot outside the
checkout. `packaging/prepare-crates.mjs` builds the locked web UI, copies only
its distributable output into the kernel, gathers licence texts for production
dependencies and configured build tools (including emitted helpers and CSS), and
writes its source/UI inventories.
The canonical host manifest is `crates/hennery-host/manifest.json`; pin generation,
CI and Nix read that same file. No agent or managed Node payload is packaged.
Each final tarball is inspected for actual AGPL text, normalized registry
metadata and its exact production dependency versions, and the 10 MB size cap.
The kernel also carries FRONTEND-NOTICES.txt and SOURCE.json, and its README
links to the immutable corresponding-source archive and SHA-256. The complete
source archive includes Rust/web sources, lockfiles, build scripts, repository
tests and fixtures. Individual crates intentionally omit the workspace's tests.

`packaging/check-crates.mjs` creates a temporary loopback sparse registry
containing these seven exact candidates and prefetched upstream dependencies.
The overlay only exists in a scratch CARGO_HOME; it is never a real publishing
registry or user configuration. Cargo package verification and publish dry runs
run on extracted tarballs, then builds/installations run with Cargo offline and
OS network access denied to subprocesses. The OS restriction includes build
scripts and is tested with a reachable loopback positive control. Cargo's
publish dry run itself needs registry HTTP, so it is separate from that phase.
Both locked and unlocked registry installs run from an empty directory. Their
collectors run in disposable homes with Node/pnpm absent from PATH, serve all
HTML-referenced assets and render the app in the pinned Chromium. A separate
Rust 1.88 toolchain builds the extracted CLI's complete dependency graph.
Source installs need Rust, a C compiler, make and Perl (macOS: Xcode Command
Line Tools); default vendored OpenSSL removes the system OpenSSL prerequisite.

Native cargo-binstall is disabled. Pinned 1.24.0 refusal tests offer real loopback
archives, but all seven attempts must refuse without fetching or installing an
archive. All native strategies (`crate-meta-data`, `quick-install`, `compile`)
are disabled in the final CLI metadata. Native binstall cannot enforce the
required signed-source and exact-run Sigstore policy. The `hennery-release` metadata namespace
records the maintainer fingerprint and concrete version's exact tagged workflow
identity for an external verifier. A native bridge needs separate review;
archive URL mappings remain dormant data for that future integration.

Before running any release-contained installer or verifier, follow the
[verify-then-run bootstrap](../README.md#verify-a-release-installer-before-running-it).
Installed GnuPG authenticates the exact annotated tag from the pinned signing
fingerprint. Installed `gh` authenticates `SHA256SUMS` and the installer against
`release.yml@refs/tags/<exact-tag>`, with source/signer digest and original
run/attempt binding. Verify hashes before executing downloaded code. A trusted
checkout's [common verifier](release/verify.py) applies the same policy to all
payloads and checks archive executable metadata. There is no inventory signature.
Bare Cargo installation waits for stable publication and public-path qualification;
the first alpha remains GitHub-only.

### Crates integration and maintainer bootstrap

The crate step is folded into the single `release` environment job, after
immutable GitHub publication. Selection in signed `packaging/release/channels.json`,
`RELEASE_PUBLICATION_ENABLED`, `RELEASE_GITHUB_ENABLED` and `RELEASE_CRATES_ENABLED`
must all permit it. These switches remain disabled. All seven frozen `.crate`
files, `crates-inventory.json` and `hennery-source-<sha>.tar.gz` are release payloads
bound by `SHA256SUMS`, source/tag and original-run attestations. The publisher
never invokes Cargo to rebuild/repackage accepted tarballs.

The shared gate verifies run/approval/artifact evidence, signed tag, checksums,
attestations and complete immutable public release bytes before any channel
credential. Node repeats frozen-byte checks at every upload/index boundary and
fetches the corresponding-source URL without credentials, requiring its expected
SHA-256. Preserve source availability for the applicable AGPL period. Missing
originals cause refusal. A matching registry digest is reused; differing, yanked,
auth-failed or ambiguous remote state stops, with no aliases or announcement.
After each crate, the index must resolve the exact version/checksum before any
consumer uploads. Partial or ambiguously successful publication is recovered by
a newly approved publish-only retry of the same run/artifacts/attestations, within
30 days and 50 reruns. Reconcile completed work, never rebuild. Otherwise document
the incomplete version, withhold aliases and roll forward to a new signed version.

Maintainer steps (never performed by builders):

1. Confirm release controls and YubiKey touch policy, source/licence/advisory,
   all platform/MSRV gates and the public immutable source URL. Before **any**
   channel switch is enabled, obtain an explicitly authorized genuine Hennery
   tagged attestation as the authentic positive fixture and verify the full policy
   with pinned `gh 2.101.0`. Upstream authentic crypto and substituted structural
   tests do not replace this pre-enablement platform obligation.
2. Create a short-lived crates.io token narrowly scoped to first-publishing the
   exact seven crate names in the topological order above. Put it only in the
   `release` secret `RELEASE_CRATES_BOOTSTRAP_TOKEN`. Set temporary
   `RELEASE_CRATES_BOOTSTRAP_ENABLED=true` only for the approved stable release,
   together with explicit channel selection and enablement. Approval authorizes
   the same frozen-byte uploader and verification policy, with no OIDC fallback.
   Missing, expired or insufficiently scoped tokens fail; never add standing
   all-crate authority. Do not grant repository administration to the job.
3. First-claim the seven names through that protected job using accepted tarballs.
   On partial failure reconcile registry digests before retry; do not obtain a new
   token or rebuild bytes while the previous bootstrap authority remains live.
   On abandonment or success immediately revoke the bootstrap token at crates.io,
   confirm revocation, remove the environment secret and disable bootstrap mode.
   This is an operator action; a printed cleanup instruction is not revocation.
4. Once each crate exists, configure its own trusted publisher: repository
   `marcinwadon/hennery`, workflow filename **`release.yml`**, environment **`release`**.
   Inspect all seven settings; trusting only the final CLI is insufficient. Revoke
   bootstrap authority even if configuring trusted publishing is abandoned.
5. Normal runs leave bootstrap mode off and have no bootstrap secret. After the
   gate/public-source preflight, the pinned official auth action exchanges OIDC
   for a short-lived token; its post step revokes it. Missing per-crate trust or
   OIDC refusal stops without falling back to the bootstrap token. Test actual
   first-run and renewed retry approval with explicit maintainer authorization.
6. Independently verify public installs and the embedded UI from clean scratch
   homes before advertising channel success. Keep early-testing migration/data
   guarantees unchanged.

Cargo's [registry API](https://doc.rust-lang.org/cargo/reference/registry-web-api.html#publish),
[source replacement](https://doc.rust-lang.org/cargo/reference/source-replacement.html),
[binstall metadata](https://github.com/cargo-bins/cargo-binstall/blob/main/SUPPORT.md)
and [trusted publishing bootstrap](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07/)
are the implementation contracts to recheck on changes.

## Publishing is the operator's

- `release` environment, owner-only `v*` tag rulesets (updates/deletes blocked),
  and immutable releases are configured. Maintainer signing requires a YubiKey
  touch. Merging a workflow does not authorize publication; every switch remains
  disabled pending independent review and platform acceptance.
- The maintainer signs source, while exact tagged-workflow attestations bind
  bytes. Runners/toolchains/GitHub/Sigstore remain trusted. One approval in this
  authorized workflow does not mean all publication needs approval: a repository
  writer can publish genuine attested bytes early or freeze an incomplete release.
  Integrity checks reject untrusted bytes; availability damage needs a new signed
  version. See the accepted [threat model](../docs/specs/2026-10-15-distribution-release-design.md#simplified-release-model-operator-decision-2026-10-16).
- `contents: write` exists only in the single `release` job. Build/test jobs have
  no environment or publication secrets. The separate `attest` job has OIDC and
  attestation write authority and does not upload to registries. No AWS, upload
  App, held-storage stage or maintainer byte-inventory signature remains.
- The latest operator decision (2026-10-16) enables all channels for the first
  release without waiting for a positive fixture. Retain and verify the first
  genuine Hennery attestation afterwards. Builders never create transparency-log
  entries. Existing stable-tag and reviewed channel-selection constraints remain.
- Homebrew uses `RELEASE_HOMEBREW_TOKEN`; GHCR uses `GHCR_PUBLISH_TOKEN` plus
  `GHCR_PUBLISH_USER`, all only in `release`, after verification. Configure tap
  permissions, GHCR namespace/linkage/visibility/retention and package Actions
  READ access explicitly. The [image guide](images.md) covers storage and upgrades.
- Final release archives/images include reviewed notices, SPDX and corresponding
  source; native CI fixtures do not constitute licence permission or production
  clearance. Review vendored OpenSSL/SQLite, Rust and frontend assets/fonts.
  Third-party agent binaries and managed Node are never redistributed here.
- Dependency/action/base-image updates and approval of fork workflows remain
  maintainer responsibilities. Generated cargo-dist workflows must not replace
  the explicit orchestrator or bypass archive/linkage/installer/formula checks,
  hardening-before-attestation, pinned actions/toolchain and cache-free builds.

## Homebrew (R2)

The generated formula is hardened with version, embedded-UI and notice checks
before final checksum assembly. The secret-free native proof and tag-run
acceptance exercise a scratch file-based tap; the folded protected publisher
checks the exact frozen formula after GitHub's immutable release bytes match. The channel
and global publication switches remain disabled. See the [operator guide](../docs/homebrew.md)
and [maintainer setup](../docs/release-process.md#homebrew-channel-setup-r2).

Generated with Claude AI — please review before distribution.
``````

<!-- replay-file: {"path":"packaging/binstall-policy.test.mjs","mode":"100644","sha256":"ef2ef9f9773672d61a04a0fd0f227570881f18a21526a8e9383ea9b22c6cd939","encoding":"utf8"} -->
``````js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('final CLI metadata disables every native strategy and pins external signed-source verification',()=>{
 const cli=JSON.parse(execFileSync('cargo',['metadata','--locked','--no-deps','--format-version=1'],{encoding:'utf8'})).packages.find(p=>p.name==='hennery');
 assert.deepEqual(cli.metadata.binstall['disabled-strategies'].toSorted(),['compile','crate-meta-data','quick-install']);
 assert.deepEqual(cli.metadata['hennery-release'],{
  verification:'external-signed-tag-sigstore',
  'maintainer-fingerprint':'F26C7F594DFE84D131703AFC23E5A318AE8D2861',
  'signer-identity':`https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v${cli.version}`
 });
});
``````

<!-- replay-file: {"path":"packaging/ghcr-candidate.py","mode":"100644","sha256":"54f98b9d8298bfa69614b3f897d2622bae3c16545c0143e487681975872f23e2","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Assemble and materialize exact OCI bytes bound by release SHA256SUMS."""
import argparse
import io
import json
from pathlib import Path
import re
import sys
import tarfile

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / 'release'))
import contract
import gate
import supply
import image

TARGETS = {'amd64': 'x86_64-unknown-linux-musl', 'arm64': 'aarch64-unknown-linux-musl'}


def descriptor(layout, binaries, revision, version):
    verified = image.verify(layout, binaries, revision, version)
    index = gate.strict_json((layout / 'index.json').read_bytes())
    gate.require(len(index['manifests']) == 1, 'expected one OCI index')
    return {'schema': 1, 'digest': index['manifests'][0]['digest'], 'source_sha': revision,
            'version': version, 'platforms': {a: p['digest'] for a, p in verified['platforms'].items()}}


def assemble(candidate, work, natives, revision, version):
    candidate, work = Path(candidate), Path(work)
    gate.require(not work.exists(), 'image assembly output already exists')
    work.mkdir(parents=True, exist_ok=True)
    binaries = supply.binary_inventory(candidate, sorted(TARGETS.values()))
    image.merge(work / 'layout', [Path(p) for p in natives])
    index = descriptor(work / 'layout', {a: binaries[t]['sha256'] for a, t in TARGETS.items()}, revision, version)
    with (candidate / 'ghcr-oci-layout.tar').open('xb') as output, tarfile.open(fileobj=output, mode='w') as archive:
        for path in sorted((work / 'layout').rglob('*')):
            if path.is_file():
                data = path.read_bytes()
                member = tarfile.TarInfo(path.relative_to(work / 'layout').as_posix())
                member.size = len(data); member.mode = 0o644
                archive.addfile(member, io.BytesIO(data))
    with (candidate / 'ghcr-index.json').open('xb') as output:
        output.write(gate.canonical(index))
    return index


def tar_files(raw):
    files = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as archive:
        for member in archive:
            name = member.name
            gate.require(re.fullmatch(r'oci-layout|index\.json|blobs/sha256/[0-9a-f]{64}', name), 'unsafe OCI archive path')
            gate.require(member.isfile(), 'nonregular OCI archive member')
            gate.require(name not in files, 'duplicate OCI archive member')
            files[name] = archive.extractfile(member).read()
    return files


def retained_file(candidate, inventory, name):
    entry = next(a for a in inventory['artifacts'] if a['name'] == name)
    raw = (candidate / name).read_bytes()
    gate.require(len(raw) == entry['size'] and gate.digest(raw) == entry['sha256'], 'release OCI payload changed during verification')
    return raw


def materialize_layout(layout, files):
    if not layout.exists():
        layout.mkdir(parents=True)
        for name, raw in files.items():
            path = layout / name; path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('xb') as output:
                output.write(raw)
    paths = list(layout.rglob('*'))
    gate.require(not layout.is_symlink() and all(not p.is_symlink() and (p.is_file() or p.is_dir()) for p in paths), 'nonregular working OCI')
    actual = {p.relative_to(layout).as_posix(): p.read_bytes() for p in paths if p.is_file()}
    gate.require(actual == files, 'working OCI differs from release layout')


def metadata(path, raw):
    if path.exists() or path.is_symlink():
        gate.require(path.is_file() and not path.is_symlink() and path.read_bytes() == raw, 'working image metadata changed')
    else:
        with path.open('xb') as output:
            output.write(raw)


def inspect_release(candidate, work, inventory):
    # Unprivileged data acceptance confers no publishing authority. Credentialed
    # callers authenticate the signed tag and exact-run attestations separately.
    gate.require(not work.resolve().is_relative_to(candidate.resolve()), 'OCI working directory must be outside immutable release')
    current = contract.load(candidate)
    gate.require(current == inventory, "release OCI metadata changed")
    gate.require('ghcr' in inventory['channels'] and set(TARGETS.values()) <= set(inventory['targets']), 'release needs GHCR and both Linux targets')
    supply.verify_binary_inventory(inventory, candidate)
    files = tar_files(retained_file(candidate, inventory, 'ghcr-oci-layout.tar'))
    index = gate.strict_json(retained_file(candidate, inventory, 'ghcr-index.json'))
    if work.exists():
        gate.require(work.is_dir() and not work.is_symlink(), 'nonregular image working directory')
    else:
        work.mkdir(parents=True)
    materialize_layout(work / 'layout', files)
    binaries = {a: inventory['binaries'][t]['sha256'] for a, t in TARGETS.items()}
    actual = descriptor(work / 'layout', binaries, inventory['source_sha'], inventory['tag'].removeprefix('v'))
    gate.require(index == actual, 'release image descriptor differs from actual OCI')
    metadata(work / 'verified.json', gate.canonical(actual))
    metadata(work / 'binary-sha256.json', gate.canonical(binaries))
    metadata(work / 'index-digest.txt', (actual['digest'] + '\n').encode())
    return actual


def inspect_release(candidate, work, inventory):
    # Data qualification is shared by the unprivileged aggregate and the
    # publishing verifier. Only qualify() authenticates publication authority.
    gate.require(not work.resolve().is_relative_to(candidate.resolve()), 'OCI working directory must be outside immutable candidate')
    import contract
    current = contract.load(candidate)
    gate.require(current == inventory, "release OCI metadata changed")
    gate.require('ghcr' in inventory['channels'] and set(TARGETS.values()) <= set(inventory['targets']), 'release needs GHCR and both Linux targets')
    supply.verify_binary_inventory(inventory, candidate)
    files = tar_files(retained_file(candidate, inventory, 'ghcr-oci-layout.tar'))
    index = gate.strict_json(retained_file(candidate, inventory, 'ghcr-index.json'))
    if work.exists():
        gate.require(work.is_dir() and not work.is_symlink(), 'nonregular image working directory')
    else:
        work.mkdir(parents=True)
    materialize_layout(work / 'layout', files)
    binaries = {a: inventory['binaries'][t]['sha256'] for a, t in TARGETS.items()}
    actual = descriptor(work / 'layout', binaries, inventory['source_sha'], inventory['tag'].removeprefix('v'))
    gate.require(index == actual, 'release image descriptor differs from actual OCI')
    metadata(work / 'verified.json', gate.canonical(actual))
    metadata(work / 'binary-sha256.json', gate.canonical(binaries))
    metadata(work / 'index-digest.txt', (actual['digest'] + '\n').encode())
    return actual


def accept(candidate, work, revision, version):
    candidate, work = Path(candidate), Path(work)
    inventory = contract.load(candidate)
    gate.require(inventory['source_sha'] == revision and inventory['tag'] == 'v' + version,
                 'release source/tag mismatch')
    return inspect_release(candidate, work, inventory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    build = sub.add_parser('assemble')
    build.add_argument('candidate', type=Path); build.add_argument('work', type=Path)
    build.add_argument('revision'); build.add_argument('version')
    build.add_argument('natives', type=Path, nargs=2)
    acceptance = sub.add_parser('accept')
    acceptance.add_argument('candidate', type=Path); acceptance.add_argument('work', type=Path)
    acceptance.add_argument('revision'); acceptance.add_argument('version')
    args = parser.parse_args()
    if args.command == 'assemble':
        result = assemble(args.candidate, args.work, args.natives, args.revision, args.version)
    else:
        result = accept(args.candidate, args.work, args.revision, args.version)
    print(gate.canonical(result).decode(), end='')


if __name__ == '__main__':
    main()
``````

<!-- replay-file: {"path":"packaging/ghcr-remote.py","mode":"100644","sha256":"c2fb5b74c89f0f8c1a75fc69ac3353c345e1b3578566a6054589b77682bfd8e1","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Reconcile GHCR bytes: 0 matching, 1 verified absent, 2 ambiguous/refused.

Never classify Skopeo stderr: it discards HTTP status for registry errors.
Credentials/token stay in memory, requests use fixed HTTPS origins, and neither
redirects nor ambient proxy configuration may forward authorization elsewhere.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def reconcile(version, expected, authfile, opener=None):
    if not re.fullmatch(r'(?:[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?|sha256:[0-9a-f]{64})', version):
        raise ValueError('invalid image version')
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', expected):
        raise ValueError('invalid image digest')
    auth = json.loads(Path(authfile).read_bytes())['auths']['ghcr.io']['auth']
    if b':' not in base64.b64decode(auth, validate=True):
        raise ValueError('missing registry credentials')
    opener = opener or urllib.request.build_opener(
        urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(
        'https://ghcr.io/token?service=ghcr.io&scope=repository%3Amarcinwadon%2Fhennery%3Apull',
        headers={'Authorization': 'Basic ' + auth})
    with opener.open(request, timeout=30) as response:
        if response.status != 200:
            raise ValueError('registry authorization failed')
        token = json.load(response)['token']
    if not isinstance(token, str) or not token or '\r' in token or '\n' in token:
        raise ValueError('invalid registry authorization')
    request = urllib.request.Request(
        'https://ghcr.io/v2/marcinwadon/hennery/manifests/' + version,
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': ', '.join(['application/vnd.oci.image.index.v1+json',
                     'application/vnd.docker.distribution.manifest.list.v2+json',
                     'application/vnd.oci.image.manifest.v1+json',
                     'application/vnd.docker.distribution.manifest.v2+json'])})
    try:
        with opener.open(request, timeout=30) as response:
            if response.status != 200:
                raise ValueError('unexpected registry status')
            actual = 'sha256:' + hashlib.sha256(response.read()).hexdigest()
        if actual != expected:
            raise ValueError('published image digest mismatch; new signed version required')
        return 0
    except urllib.error.HTTPError as error:
        # Only an authenticated 404 with an explicit registry classification is
        # absent. Identical MANIFEST_UNKNOWN bodies on 401/403 fail closed.
        if error.code == 404:
            errors = json.load(error).get('errors')
            if (isinstance(errors, list) and errors and
                    all(item.get('code') in ('MANIFEST_UNKNOWN', 'NAME_UNKNOWN') for item in errors)):
                return 1
        raise ValueError('remote image cannot be reconciled; refusing recovery') from None


def main():
    try:
        return reconcile(*sys.argv[1:])
    except ValueError as error:
        # Only our fixed messages are useful. JSON/base64 errors can contain
        # registry data, so the CLI emits a generic refusal for those too.
        if str(error).startswith('published image digest mismatch'):
            print(str(error), file=sys.stderr)
        else:
            print('remote image cannot be reconciled; refusing recovery', file=sys.stderr)
        return 2
    except Exception:
        print('remote image cannot be reconciled; refusing recovery', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
``````

<!-- replay-file: {"path":"packaging/ghcr-verify.py","mode":"100644","sha256":"7109337c292741ea2d37f3546e8de9c35838aef83e23e39348f8c289f7008e2a","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Read-only verification of release and seven exact OCI provenance/SPDX subjects."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).parent/'release'))
import contract
import gate
import verify

PROVENANCE=verify.PROVENANCE
SPDX=verify.SPDX


def subjects(work,bundles):
    index=gate.strict_json(contract.regular(work/'verified.json'))
    for subject,digest in [('index',index['digest']),*index['platforms'].items()]:
        for kind in (['provenance'] if subject=='index' else ['provenance','image-sbom','binary-sbom']):
            yield subject,kind,digest,PROVENANCE if kind=='provenance' else SPDX,bundles/f'ghcr-{subject}-{kind}.json'


def check(root,work,signatures,source_sha,tag,run_id,attesting_attempt,remote=False):
    value=verify.verify(root,signatures/contract.BUNDLE,source_sha,tag,run_id,attesting_attempt)
    gate.require(gate.strict_json(contract.regular(work/'verified.json'))==verify.image_descriptor(root,value),
                 'working image must match the release descriptor')
    for _,_,digest,predicate,bundle in subjects(work,signatures):
        gate.require(bundle.is_file() and not bundle.is_symlink(),'missing/nonregular OCI verification bundle')
        manifest=None if remote else work/'layout/blobs/sha256'/digest.removeprefix('sha256:')
        verify.verify_image_subject('ghcr.io/marcinwadon/hennery@'+digest,value,bundle,predicate,manifest)
    gate.require(contract.load(root)==value,'release bytes changed during OCI verification')
    return value


def main():
    parser=argparse.ArgumentParser(description=__doc__,allow_abbrev=False)
    parser.add_argument('--release-directory',required=True,type=Path)
    parser.add_argument('--work',required=True,type=Path,help='materialized layout already checked by ghcr-candidate accept')
    parser.add_argument('--signatures',required=True,type=Path)
    parser.add_argument('--source-sha',required=True)
    parser.add_argument('--tag',required=True)
    parser.add_argument('--run-id',required=True,type=int)
    parser.add_argument('--attesting-attempt',required=True,type=int)
    parser.add_argument('--remote',action='store_true')
    args=parser.parse_args()
    check(args.release_directory,args.work,args.signatures,args.source_sha,args.tag,args.run_id,args.attesting_attempt,args.remote)


if __name__=='__main__':main()
``````

<!-- replay-file: {"path":"packaging/harden-installer.py","mode":"100755","sha256":"1f367a0c09847f7b9c8aa77d2a99399f66d7dff9661c2a8e8d6f57b2ec390eba","encoding":"utf8"} -->
``````python
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
from pathlib import Path

MAINTAINER_KEY = (Path(__file__).parent / 'release/maintainer.asc').read_text()
CONSUMER_FUNCTIONS = r'''release_git() {
    env GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 GIT_NO_REPLACE_OBJECTS=1 \
        GNUPGHOME="$release_dir/keyring" git -c credential.helper= -c core.hooksPath=/dev/null "$@"
}
release_verify_tag() {
    case "$release_tag" in v*) ;; *) return 1 ;; esac
    printf '%s\n' "$release_tag" | LC_ALL=C grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || return 1
    release_git init --bare --template= "$release_dir/source.git" >/dev/null 2>&1 || return 1
    release_git --git-dir="$release_dir/source.git" fetch --no-tags --depth=1 \
        https://github.com/marcinwadon/hennery.git "refs/tags/$release_tag" >/dev/null 2>&1 || return 1
    release_object=$(release_git --git-dir="$release_dir/source.git" rev-parse FETCH_HEAD) || return 1
    printf '%s\n' "$release_object" | LC_ALL=C grep -Eq '^[0-9a-f]{40}$' || return 1
    release_git --git-dir="$release_dir/source.git" cat-file tag "$release_object" > "$release_dir/tag-object" || return 1
    release_git --git-dir="$release_dir/source.git" -c gpg.format=openpgp -c gpg.program=gpg \
        verify-tag --raw "$release_object" > "$release_dir/tag-output" 2> "$release_dir/tag-status" || return 1
    awk -v fp="$release_fingerprint" '
        $1 == "[GNUPG:]" && $2 == "VALIDSIG" { count++; if ($3 != fp) bad=1 }
        $1 == "[GNUPG:]" && $2 ~ /^(BADSIG|ERRSIG|EXPSIG|EXPKEYSIG|REVKEYSIG|KEYEXPIRED|SIGEXPIRED|KEYREVOKED|NO_PUBKEY|NODATA|FAILURE|ERROR)$/ { bad=1 }
        END { exit !(count == 1 && !bad) }
    ' "$release_dir/tag-status" || return 1
    release_source=$(awk -v tag="$release_tag" '
        /^$/ { done=1 }
        !done && $1 == "object" { objects++; sha=$2; if (NF != 2 || length(sha) != 40 || sha ~ /[^0-9a-f]/) bad=1 }
        !done && $1 == "type" { types++; if ($0 != "type commit") bad=1 }
        !done && $1 == "tag" { tags++; if ($0 != "tag " tag) bad=1 }
        END { if (objects != 1 || types != 1 || tags != 1 || bad) exit 1; print sha }
    ' "$release_dir/tag-object") || return 1
}
release_attest() {
    gh attestation verify "$1" --bundle "$release_bundle" --repo marcinwadon/hennery \
        --cert-identity "https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/$release_tag" \
        --source-ref "refs/tags/$release_tag" --source-digest "$release_source" --signer-digest "$release_source" \
        --cert-oidc-issuer https://token.actions.githubusercontent.com --predicate-type https://slsa.dev/provenance/v1 \
        --deny-self-hosted-runners --format json > "$2" || return 1
}
release_check_hash() {
    release_expected=$(awk -v name="$2" '$2 == name { count++; sha=$1 } END { if (count != 1) exit 1; print sha }' "$release_checksums") || return 1
    if command -v sha256sum >/dev/null 2>&1; then
        release_actual=$(sha256sum -b "$1") || return 1
    elif command -v shasum >/dev/null 2>&1; then
        release_actual=$(shasum -a 256 -b "$1") || return 1
    else
        return 1
    fi
    release_actual=$(printf '%s\n' "$release_actual" | awk '{ print $1 }') || return 1
    [ "$release_actual" = "$release_expected" ] || return 1
}
release_verify_payload() {
    [ -s "$release_checksums" ] && [ -s "$release_metadata" ] && [ -s "$release_bundle" ] || return 1
    release_attest "$release_checksums" "$release_dir/checksums.verified.json" || return 1
    release_last=$(tail -c 1 "$release_checksums") || return 1
    [ -z "$release_last" ] || return 1
    LC_ALL=C awk '
        { name=$2; lower=tolower(name) }
        length($1) != 64 || $1 ~ /[^0-9a-f]/ || name !~ /^[A-Za-z0-9][A-Za-z0-9._-]*$/ || $0 != $1 "  " name { bad=1 }
        lower == "sha256sums" || lower == "release.sigstore.jsonl" || seen[lower]++ || (NR > 1 && name <= previous) { bad=1 }
        { previous=name }
        END { exit !(NR > 0 && !bad) }
    ' "$release_checksums" || return 1
    release_check_hash "$release_metadata" release-metadata.json || return 1
    release_attest "$release_metadata" "$release_dir/metadata.verified.json" || return 1
    release_run=$(jq -er --arg tag "$release_tag" --arg sha "$release_source" --arg object "$release_object" '
        if .schema == 2 and .repository == "marcinwadon/hennery" and .tag == $tag and .source_sha == $sha and .tag_object == $object
            and (.attesting.run_id | type == "number" and . > 0 and floor == .)
            and (.attesting.run_attempt | type == "number" and . > 0 and floor == .)
        then "https://github.com/marcinwadon/hennery/actions/runs/\(.attesting.run_id)/attempts/\(.attesting.run_attempt)"
        else error("release metadata source/tag/run mismatch") end
    ' "$release_metadata") || return 1
    release_check_hash "$1" "$2" || return 1
    release_attest "$1" "$release_dir/payload.verified.json" || return 1
    for release_result in checksums metadata payload; do
        jq -e --arg run "$release_run" '
            type == "array" and length > 0 and all(.[]; .verificationResult.signature.certificate.runInvocationURI == $run)
        ' "$release_dir/$release_result.verified.json" >/dev/null || return 1
    done
}
'''

MAINTAINER_VERIFICATION = r'''    # Verify signed source, the attested digest list and this archive before extraction.
    check_cmd git || err "git is required for signed release tag verification"
    check_cmd gpg || err "gpg is required for signed release tag verification"
    check_cmd jq || err "jq is required for release provenance verification"
    check_cmd gh || err "GitHub CLI is required for release signature verification"
    release_dir=$(mktemp -d "${TMPDIR:-/tmp}/hennery-verify.XXXXXXXX") || err "cannot isolate release verification"
    release_tag="v$APP_VERSION"
    release_fingerprint=F26C7F594DFE84D131703AFC23E5A318AE8D2861
    mkdir -m 0700 "$release_dir/keyring" || err "cannot isolate release verification"
    printf 'no-autostart\nno-auto-key-retrieve\n' > "$release_dir/keyring/gpg.conf" || err "cannot isolate GPG options"
    cat > "$release_dir/keyring/key.asc" <<'HENNERY_MAINTAINER_KEY'
''' + MAINTAINER_KEY + r'''HENNERY_MAINTAINER_KEY
    gpg --batch --no-options --homedir "$release_dir/keyring" --no-autostart --no-auto-key-retrieve \
        --import "$release_dir/keyring/key.asc" >/dev/null 2>&1 || err "cannot import pinned maintainer public key"
    release_checksums="${HENNERY_RELEASE_CHECKSUMS:-$release_dir/SHA256SUMS}"
    release_metadata="${HENNERY_RELEASE_METADATA:-$release_dir/release-metadata.json}"
    release_bundle="${HENNERY_ATTESTATION_BUNDLE:-$release_dir/release.sigstore.jsonl}"
    if [ -z "${HENNERY_RELEASE_CHECKSUMS:-}" ]; then
        downloader "$ARTIFACT_DOWNLOAD_URL/SHA256SUMS" "$release_checksums" || err "cannot download release checksums"
    fi
    if [ -z "${HENNERY_RELEASE_METADATA:-}" ]; then
        downloader "$ARTIFACT_DOWNLOAD_URL/release-metadata.json" "$release_metadata" || err "cannot download release metadata"
    fi
    if [ -z "${HENNERY_ATTESTATION_BUNDLE:-}" ]; then
        downloader "$ARTIFACT_DOWNLOAD_URL/release.sigstore.jsonl" "$release_bundle" || err "cannot download release attestation bundle"
    fi
    release_verify_tag || err "refusing an archive without a valid pinned signed release tag"
    release_verify_payload "$_file" "$_artifact_name" || err "refusing an archive without valid release-tag provenance and SHA256SUMS"

'''

REFUSE_UNCHECKED = (
    'err "refusing to install an archive whose checksum cannot be checked; '
    'install sha256sum or shasum and run the installer again"'
)

REPLACEMENTS = [
    (
        '    # ...and then the updater, if it exists',
        CONSUMER_FUNCTIONS + MAINTAINER_VERIFICATION + '    # ...and then the updater, if it exists',
    ),
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
``````

<!-- replay-file: {"path":"packaging/image-build.sh","mode":"100644","sha256":"93ae115bacf3b9b9913a2aaee94554f4d8708cb0824cbaf0e4274d3aafd7ad2e","encoding":"utf8"} -->
``````sh
#!/bin/sh
# Native runner only. R1 stages approved bytes and includes this OCI output in
# its checksum-bound metadata BEFORE approval. No registry credential or push.
# Usage: image-build.sh amd64|arm64 output-directory version revision epoch
set -eu
arch=$1
output=$2
version=$3
revision=$4
epoch=$5
case "$arch" in amd64|arm64) ;; *) echo 'unsupported image architecture' >&2; exit 1 ;; esac
case "$(uname -m):$arch" in x86_64:amd64|aarch64:arm64|arm64:arm64) ;; *) echo 'native Linux runner required' >&2; exit 1 ;; esac
[ "$(uname -s)" = Linux ] || { echo 'native Linux runner required' >&2; exit 1; }
[ ! -e "$output" ] || { echo 'output already exists' >&2; exit 1; }
for file in hennery THIRD-PARTY-NOTICES binary.spdx.json; do
    [ -s "dist/linux-$arch/$file" ] || { echo "missing R1 input: $file" >&2; exit 1; }
done
mkdir -p "$output"
# Pinned scanner/base and no restored build cache. OCI export preserves
# BuildKit's SBOM/provenance descriptors, unlike a classic docker save.
# The local export name supplies BuildKit's per-platform self subjects.
docker buildx build --no-cache --platform "linux/$arch" --target release \
    --tag "localhost/hennery-collector:$revision-$arch" \
    --build-arg "VERSION=$version" --build-arg "REVISION=$revision" \
    --build-arg "SOURCE_DATE_EPOCH=$epoch" \
    --provenance=mode=max \
    --attest type=sbom,generator=docker.io/docker/buildkit-syft-scanner:stable-1@sha256:ae4f3b554449e7e25548e7d8ccc029d17357348e30c6e3df01b92bc93654d6a9 \
    --output "type=oci,dest=$output/image.tar,compression=gzip,force-compression=true" .
mkdir "$output/layout"
tar -xf "$output/image.tar" -C "$output/layout"
rm "$output/image.tar"
``````

<!-- replay-file: {"path":"packaging/images.md","mode":"100644","sha256":"0d45305973ab062953843683a1a19ca7e393b60b95500a66bafc622a1d70ddcb","encoding":"utf8"} -->
``````markdown
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
``````

<!-- replay-file: {"path":"packaging/publish-crates.mjs","mode":"100644","sha256":"08d65a34615e7bb3a7ec64fbc9927e1c938f9d80fac6255e3a708555650a598f","encoding":"utf8"} -->
``````js
// Exact-byte uploader inside R1's protected, manually approved tagged orchestrator.
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { sha256, readJSON, requireThat, verifyCandidate, validateSource, publishBody } from './crate-release.mjs';
import { indexPath } from './crate-registry.mjs';
export async function preflight({dir,digest,gate,fetcher=fetch}) {
  const inventoryFile=join(dir,'crates-inventory.json');
  function validate() {
    requireThat(sha256(fs.readFileSync(inventoryFile))===digest,'inventory changed after approval');
    const inventory=readJSON(inventoryFile);verifyCandidate(dir,inventory);return inventory;
  }
  const inventory=validate();
  const authorize=async(phase='boundary')=>{validate();await gate({channel:'crates',dir,digest,source_sha:inventory.source.sha,version:inventory.version,phase});validate();};
  await authorize('preflight');
  await validateSource(inventory.source,fetcher);
  await authorize('preflight');
  return {inventory,authorize};
}
export async function publishFrozen({dir,digest,gate,credentials,fetcher=fetch,pause=delay}) {
  const {inventory,authorize}=await preflight({dir,digest,gate,fetcher});
  const token=await credentials();requireThat(typeof token==='string' && token.length>0,'publication credential missing');
  const completed=[];
  for(const c of inventory.crates) {
    await authorize();
    const download=`https://crates.io/api/v1/crates/${c.name}/${inventory.version}/download`;
    let remote=await fetcher(download,{signal:AbortSignal.timeout(120000)});
    if(remote.status===404) {
      // Revalidate at the actual credentialed boundary. No repackaging or UI rebuild occurs.
      await authorize();
      const bytes=fs.readFileSync(join(dir,c.file));
      requireThat(sha256(bytes)===c.sha256,'package changed at upload boundary');
      let response;
      try {
        response=await fetcher('https://crates.io/api/v1/crates/new',{method:'PUT',headers:{Authorization:token,'Content-Type':'application/octet-stream','User-Agent':'hennery-release-r3'},body:publishBody(c.upload,bytes),signal:AbortSignal.timeout(120000)});
      } catch {throw new Error(`ambiguous upload for ${c.name}: stop; a newly approved attempt must reconcile remote bytes`);}
      requireThat(response.ok,`upload refused/ambiguous for ${c.name}: HTTP ${response.status}; stop and reconcile in a newly approved attempt`);
      // Fetch final remote bytes after upload. A successful response alone proves nothing.
      remote=await fetcher(download,{signal:AbortSignal.timeout(120000)});
    }
    requireThat(remote.ok,`remote package unavailable/unverifiable: ${c.name}`);
    requireThat(sha256(Buffer.from(await remote.arrayBuffer()))===c.sha256,`remote digest differs: ${c.name}; new signed version required`);
    let resolvable=false;
    for(let attempt=0;attempt<48;attempt++) {
      await authorize();
      const index=await fetcher(`https://index.crates.io/${indexPath(c.name)}`,{cache:'no-store',signal:AbortSignal.timeout(30000)});
      requireThat(index.ok || index.status===404,'registry index unavailable');
      if(index.ok) {
        const entry=(await index.text()).trim().split('\n').map(line=>JSON.parse(line)).find(e=>e.vers===inventory.version);
        if(entry){requireThat(!entry.yanked && entry.cksum===c.sha256,'registry index digest differs/yanked');resolvable=true;break;}
      }
      await pause(10000);
    }
    requireThat(resolvable,`registry did not resolve ${c.name}; stop before consumers`);
    completed.push(c.name);
  }
  return completed;
}
export function releaseCratesDigest(dir) {
 const raw=fs.readFileSync(join(dir,'SHA256SUMS'),'utf8'),entries=new Map(),folded=new Set();
 requireThat(raw.endsWith('\n'),'checksum newline missing');
 for(const line of raw.slice(0,-1).split('\n')){
  const match=/^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(line);
  requireThat(match && !folded.has(match[2].toLowerCase()) && !['sha256sums','release.sigstore.jsonl'].includes(match[2].toLowerCase()),'invalid/duplicate checksum entry');
  entries.set(match[2],match[1]);folded.add(match[2].toLowerCase());
 }
 requireThat([...entries.keys()].join('\n')===[...entries.keys()].sort().join('\n'),'checksum list unsorted');
 const names=fs.readdirSync(dir).filter(n=>n!=='SHA256SUMS').sort();
 requireThat(names.join('\n')===[...entries.keys()].join('\n'),'global checksum closure differs');
 for(const name of names){const path=join(dir,name);requireThat(fs.lstatSync(path).isFile() && !fs.lstatSync(path).isSymbolicLink() && sha256(fs.readFileSync(path))===entries.get(name),'global payload differs: '+name);}
 const root=readJSON(join(dir,'release-metadata.json')),inventory=readJSON(join(dir,'crates-inventory.json'));
 requireThat(root.schema===2 && root.repository==='marcinwadon/hennery' && root.channels?.includes('crates') && root.channels.includes('github') && root.source_sha===inventory.source.sha && root.tag===`v${inventory.version}`,'release crate source/tag/channel differs');
 requireThat(inventory.source.url===`https://github.com/marcinwadon/hennery/releases/download/${root.tag}/hennery-source-${root.source_sha}.tar.gz`,'release source URL differs');
 verifyCandidate(dir,inventory);
 return entries.get('crates-inventory.json');
}
let gateSequence=0;
export function gateBroker() {
 const request=process.env.CRATES_GATE_REQUEST_FD,reply=process.env.CRATES_GATE_REPLY_FD;
 requireThat(/^[1-9][0-9]*$/.test(request||'') && /^[1-9][0-9]*$/.test(reply||'') && request!==reply,'private release gate broker missing');
 const write=Number(request),read=Number(reply);
 requireThat(Number.isSafeInteger(write) && Number.isSafeInteger(read) && write>=3 && read>=3
   && fs.fstatSync(write).isFIFO() && fs.fstatSync(read).isFIFO(),'invalid private release gate pipes');
 const sequence=++gateSequence,message=Buffer.from(`gate-v1:${sequence}\n`);
 requireThat(fs.writeSync(write,message)===message.length,'incomplete release gate request');
 const byte=Buffer.alloc(1);let response='';
 while(response.length<128){
  requireThat(fs.readSync(read,byte)===1,'release gate broker EOF/refusal');
  response+=byte.toString('latin1');if(response.endsWith('\n'))break;
 }
 const match=/^ok-v1:([1-9][0-9]*):([0-9a-f]{64})\n$/.exec(response);
 requireThat(match && match[1]===String(sequence),'release gate broker reply mismatch');
 return match[2];
}
export function releaseGate({dir}) {
 const before=releaseCratesDigest(dir),approved=gateBroker();
 requireThat(approved===before && releaseCratesDigest(dir)===approved,'release crate manifest changed at parent gate');
 return approved;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href) {
 requireThat(process.env.GITHUB_ACTIONS==='true','real publisher only runs in the protected tagged workflow');
 const verifyOnly=process.argv[2]==='--verify',dir=resolve(process.argv[verifyOnly?3:2]),signatures=resolve(process.argv[verifyOnly?4:3]);
 const digest=releaseCratesDigest(dir),gate=async()=>{requireThat(releaseGate({dir,signatures})===digest,'release crate manifest changed');};
 if(verifyOnly)await preflight({dir,digest,gate});
 else await publishFrozen({dir,digest,gate,credentials:async()=>process.env.CARGO_REGISTRY_TOKEN});
}
``````

<!-- replay-file: {"path":"packaging/publish-crates.test.mjs","mode":"100644","sha256":"885ea337c8bd254c39e62a9d3220f1a92a3584b5cc1c218d15eb40f223d9dafe","encoding":"utf8"} -->
``````js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {publishFrozen,releaseGate} from './publish-crates.mjs';
import {ORDER,sha256} from './crate-release.mjs';
function fixture(){
  const dir=fs.mkdtempSync(join(tmpdir(),'r3-publish-'));
  const source={sha:'a'.repeat(40),sha256:sha256(Buffer.from('source')),url:`https://github.com/marcinwadon/hennery/releases/download/v0.1.0-alpha.1/hennery-source-${'a'.repeat(40)}.tar.gz`};
  fs.writeFileSync(join(dir,`hennery-source-${source.sha}.tar.gz`),'source');
  const crates=ORDER.map(name=>{const bytes=Buffer.from(name),file=`${name}-0.1.0-alpha.1.crate`;fs.writeFileSync(join(dir,file),bytes);return {name,file,sha256:sha256(bytes),size:bytes.length,upload:{name,vers:'0.1.0-alpha.1'}};});
  fs.writeFileSync(join(dir,'crates-inventory.json'),JSON.stringify({schema:1,version:'0.1.0-alpha.1',source,crates}));
  return {dir,crates,source,digest:sha256(fs.readFileSync(join(dir,'crates-inventory.json')))};
}
function network(f,{existing=false,mismatch=false,ambiguous=false,indexBad=false,unavailable=false,sourceBad=false}={}){
  const uploads=[],published=new Set(existing?ORDER:[]);
  const fetcher=async(url,options={})=>{
    if(url===f.source.url)return new Response(sourceBad?'bad':'source');
    if(url.endsWith('/new')){
      const body=options.body,n=body.readUInt32LE(0),meta=JSON.parse(body.subarray(4,n+4));
      assert.equal(options.headers.Authorization,'ephemeral');
      assert.deepEqual(body.subarray(n+8),Buffer.from(meta.name));
      uploads.push(meta.name);published.add(meta.name);
      if(ambiguous)throw new Error('lost response');
      return new Response('{}');
    }
    if(url.startsWith('https://index.crates.io/')){
      const name=url.split('/').at(-1),c=f.crates.find(c=>c.name===name);
      return new Response(JSON.stringify({vers:'0.1.0-alpha.1',cksum:indexBad?'b'.repeat(64):c.sha256}));
    }
    const name=url.split('/').at(-3);
    if(unavailable)return new Response(name,{status:503});
    if(!published.has(name))return new Response('missing',{status:404});
    return new Response(mismatch?'wrong':name);
  };
  return {uploads,fetcher};
}
test('new publication uploads exact bytes in order after gates, and confirms remote bytes/index',async()=>{
  const f=fixture(),n=network(f);let gates=0,credentials=0;
  assert.deepEqual(await publishFrozen({...f,...n,gate:async()=>{gates++},credentials:async()=>{credentials++;assert.ok(gates>=2);return 'ephemeral';}}),ORDER);
  assert.deepEqual(n.uploads,ORDER);assert.equal(credentials,1);assert.ok(gates>=ORDER.length*3+2);
});
test('matching remote bytes reconcile without reupload',async()=>{const f=fixture(),n=network(f,{existing:true});await publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>'ephemeral'});assert.equal(n.uploads.length,0);});
for(const [name,flags]of Object.entries({mismatch:{existing:true,mismatch:true},ambiguous:{ambiguous:true},index:{indexBad:true},remote:{unavailable:true},source:{sourceBad:true}}))test(`refuses ${name} and never uploads consumers`,async()=>{const f=fixture(),n=network(f,flags);await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>'ephemeral'}));assert.ok(n.uploads.length<=1);});
test('approval failure refuses before obtaining credentials',async()=>{const f=fixture(),n=network(f);let acquired=false;await assert.rejects(publishFrozen({...f,...n,gate:async()=>{throw Error('refused');},credentials:async()=>{acquired=true;}}));assert.equal(acquired,false);});
for(const changed of ['inventory','crate','missing'])test(`refuses ${changed} after approval`,async()=>{const f=fixture(),n=network(f);let count=0;await assert.rejects(publishFrozen({...f,...n,credentials:async()=>'ephemeral',gate:async()=>{if(++count===3){const p=join(f.dir,changed==='inventory'?'crates-inventory.json':f.crates[0].file);if(changed==='missing')fs.rmSync(p);else fs.appendFileSync(p,'bad');}}}));assert.equal(n.uploads.length,0);});
test('missing release payload refuses before any broker authority',()=>{
 const cwd=process.cwd(),root=fs.mkdtempSync(join(tmpdir(),'r3-no-gate-'));
 try{process.chdir(root);assert.throws(()=>releaseGate({dir:root,signatures:root}));}finally{process.chdir(cwd);}
});
test('approval invalidated during source verification refuses credentials',async()=>{
 const f=fixture(),n=network(f);let invalid=false,acquired=false;
 await assert.rejects(publishFrozen({...f,fetcher:async(...args)=>{const r=await n.fetcher(...args);if(args[0]===f.source.url)invalid=true;return r;},gate:async()=>{if(invalid)throw Error('approval changed');},credentials:async()=>{acquired=true;return 'ephemeral';}}));
 assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('approval invalidated during registry reconciliation refuses the upload boundary',async()=>{
 const f=fixture(),n=network(f);let invalid=false;
 await assert.rejects(publishFrozen({...f,fetcher:async(...args)=>{const r=await n.fetcher(...args);if(args[0].endsWith('/download'))invalid=true;return r;},gate:async()=>{if(invalid)throw Error('approval changed');},credentials:async()=>'ephemeral'}));
 assert.equal(n.uploads.length,0);
});
import {createServer} from 'node:http';
test('loopback receiver gets frozen upload bytes through real fetch HTTP framing',async()=>{
 const f=fixture(),n=network(f);let received=0;
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://loopback').searchParams.get('upstream');const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const response=await n.fetcher(url,{body:Buffer.concat(chunks),headers:{Authorization:req.headers.authorization},method:req.method});
   if(req.method==='PUT')received++;
   res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500).end(String(error));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const origin=`http://127.0.0.1:${server.address().port}`;
  await publishFrozen({...f,gate:async()=>{},credentials:async()=>'ephemeral',fetcher:(url,options)=>fetch(origin+'/?upstream='+encodeURIComponent(url),options)});
  assert.equal(received,7);assert.deepEqual(n.uploads,ORDER);
 }finally{await new Promise(r=>server.close(r));}
});
test('changed retained source bytes stop before credentials',async()=>{const f=fixture(),n=network(f);fs.appendFileSync(join(f.dir,`hennery-source-${f.source.sha}.tar.gz`),'changed');let acquired=false;await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);});
test('valid JSON inventory tampering stops before obtaining credentials',async()=>{
 const f=fixture(),n=network(f),path=join(f.dir,'crates-inventory.json');const i=JSON.parse(fs.readFileSync(path));i.audit_note='tampered';fs.writeFileSync(path,JSON.stringify(i));let acquired=false;
 await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('same-size retained crate tampering stops before credentials',async()=>{
 const f=fixture(),n=network(f);fs.writeFileSync(join(f.dir,f.crates[0].file),'x'.repeat(f.crates[0].size));let acquired=false;
 await assert.rejects(publishFrozen({...f,...n,gate:async()=>{},credentials:async()=>{acquired=true;return 'ephemeral';}}));assert.equal(acquired,false);assert.equal(n.uploads.length,0);
});
test('OIDC acquisition follows shared verifier and explicit bootstrap mode',()=>{
 const yaml=fs.readFileSync('.github/workflows/release.yml','utf8');
 const preflight=yaml.indexOf('id: crates-verify'),auth=yaml.indexOf('uses: rust-lang/crates-io-auth-action@');
 assert.ok(preflight>=0 && auth>preflight);
 assert.match(yaml,/CARGO_REGISTRY_TOKEN: \$\{\{ steps\.cratesio\.outputs\.token \}\}/);
 assert.match(yaml,/RELEASE_CRATES_BOOTSTRAP_ENABLED/);
 assert.ok(yaml.indexOf('id: crates-publish')>auth);
});
test('single workflow freezes qualified crates after the same source/UI build',()=>{
 const yaml=fs.readFileSync('.github/workflows/release.yml','utf8');
 assert.match(yaml,/prepare-crates\.mjs/);assert.match(yaml,/ci-crates\.sh/);
 assert.ok(yaml.indexOf('prepare-crates.mjs --stage')<yaml.indexOf('release_run.py freeze'));
});
import { preflight } from './publish-crates.mjs';
test('precredential preflight validates source and approval without any upload',async()=>{
 const f=fixture(),n=network(f);let gates=0;
 const result=await preflight({...f,...n,gate:async()=>{gates++;}});
 assert.equal(result.inventory.version,'0.1.0-alpha.1');assert.equal(gates,2);assert.equal(n.uploads.length,0);
});

test('parent broker is mandatory with no subprocess or ambient-credential fallback',async()=>{
 const {gateBroker}=await import('./publish-crates.mjs');
 const names=['CRATES_GATE_REQUEST_FD','CRATES_GATE_REPLY_FD'];
 const original=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 try{
  for(const name of names)delete process.env[name];
  assert.throws(()=>gateBroker(),/private release gate broker missing/);
  for(const [request,reply] of [['0','1'],['3','3'],['3junk','4'],['9007199254740993','4']]){
   process.env.CRATES_GATE_REQUEST_FD=request;process.env.CRATES_GATE_REPLY_FD=reply;
   assert.throws(()=>gateBroker(),/private release gate/);
  }
 }finally{
  for(const name of names){if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}
 }
});
``````

<!-- replay-file: {"path":"packaging/release-crates.test.mjs","mode":"100644","sha256":"745af687994844304e4e8f3600c9a1a534e677d7053c29a31bd8ef737169c529","encoding":"utf8"} -->
``````js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {releaseCratesDigest} from './publish-crates.mjs';
import {ORDER,sha256} from './crate-release.mjs';
function fixture(){
 const dir=fs.mkdtempSync(join(tmpdir(),'release-crates-'));
 const source={sha:'a'.repeat(40),sha256:sha256(Buffer.from('source')),url:`https://github.com/marcinwadon/hennery/releases/download/v0.1.0/hennery-source-${'a'.repeat(40)}.tar.gz`};
 fs.writeFileSync(join(dir,`hennery-source-${source.sha}.tar.gz`),'source');
 const crates=ORDER.map(name=>{const bytes=Buffer.from(name),file=`${name}-0.1.0.crate`;fs.writeFileSync(join(dir,file),bytes);return {name,file,sha256:sha256(bytes),size:bytes.length,upload:{name,vers:'0.1.0'}};});
 fs.writeFileSync(join(dir,'crates-inventory.json'),JSON.stringify({schema:1,version:'0.1.0',source,crates}));
 fs.writeFileSync(join(dir,'release-metadata.json'),JSON.stringify({schema:2,repository:'marcinwadon/hennery',source_sha:source.sha,tag:'v0.1.0',channels:['crates','github']}));
 const sums=()=>fs.readdirSync(dir).filter(n=>n!=='SHA256SUMS').sort().map(n=>sha256(fs.readFileSync(join(dir,n)))+'  '+n+'\n').join('');
 fs.writeFileSync(join(dir,'SHA256SUMS'),sums());return {dir,crates,sums};
}
test('global checksums bind the frozen crate manifest and every tarball',()=>{
 const f=fixture();assert.equal(releaseCratesDigest(f.dir),sha256(fs.readFileSync(join(f.dir,'crates-inventory.json'))));
});
for(const mutation of ['crate','source','extra','missing','duplicate','case-collision','metadata'])test(`release binding refuses ${mutation}`,()=>{
 const f=fixture(),sum=join(f.dir,'SHA256SUMS');
 if(mutation==='crate')fs.appendFileSync(join(f.dir,f.crates[0].file),'x');
 if(mutation==='source')fs.appendFileSync(join(f.dir,`hennery-source-${'a'.repeat(40)}.tar.gz`),'x');
 if(mutation==='extra')fs.writeFileSync(join(f.dir,'extra'),'x');
 if(mutation==='missing')fs.unlinkSync(join(f.dir,f.crates[0].file));
 if(mutation==='duplicate')fs.appendFileSync(sum,fs.readFileSync(sum,'utf8').split('\n')[0]+'\n');
 if(mutation==='case-collision')fs.appendFileSync(sum,fs.readFileSync(sum,'utf8').split('\n')[0].toUpperCase()+'\n');
 if(mutation==='metadata'){const p=join(f.dir,'release-metadata.json'),m=JSON.parse(fs.readFileSync(p));m.source_sha='b'.repeat(40);fs.writeFileSync(p,JSON.stringify(m));fs.writeFileSync(sum,f.sums());}
 assert.throws(()=>releaseCratesDigest(f.dir));
});
``````

<!-- replay-file: {"path":"packaging/release/README.md","mode":"100644","sha256":"3eb050cfe34b14ce4fd616f12ba8b1fba537ad64a50ce721e756654774802eb0","encoding":"utf8"} -->
``````markdown
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

## Workflow and credentials

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
``````

<!-- replay-file: {"path":"packaging/release/channel_publish.py","mode":"100644","sha256":"df4a80c0f171836b45bad79151c50c523169a2ca1142df816d143fa832a0d162","encoding":"utf8"} -->
``````python
"""Folded channel delivery; credentials are read only after the shared verifier."""
import base64
import importlib.util
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

import contract
import crates_delivery
import gate
import homebrew
import homebrew_publish as tap
import registry_bundles
import verifier_process

ROOT=Path(__file__).resolve().parents[2]
SECRETS=('HOMEBREW_TAP_TOKEN','GHCR_PUBLISH_TOKEN','CARGO_REGISTRY_TOKEN','RELEASE_CRATES_BOOTSTRAP_TOKEN')


def shared_verify(root,signatures,channel):
    import release_run
    # Authenticated API transport stays in this parent; verifier children use
    # verifier_process's credential-free allow-list without mutating os.environ.
    return release_run.verify(root,signatures,channel)

def crates_token(environment):
    bootstrap=environment.get('RELEASE_CRATES_BOOTSTRAP_TOKEN')
    oidc=environment.get('CARGO_REGISTRY_TOKEN')
    if environment.get('RELEASE_CRATES_BOOTSTRAP_ENABLED')=='true':
        gate.require(bootstrap and not oidc,'bootstrap needs only its explicit temporary token; OIDC cannot fall back')
        return bootstrap
    gate.require(oidc and not bootstrap,'trusted publishing token absent or stale bootstrap secret still present')
    return oidc


def homebrew_upload(root,signatures,value):
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+',value['tag']),'Homebrew publication requires stable version')
    frozen=homebrew.check(root,value['tag'],value['targets'])
    previous=tap.tap_api('GET')
    payload={'message':'chore(formula): release hennery '+value['tag'],'branch':'main',
             'content':base64.b64encode(frozen).decode(),
             'committer':{'name':'Marcin Wadoń','email':'marcin.wadon@gmail.com'}}
    if previous is not None:
        raw=tap.remote_bytes(previous)
        if raw==frozen:return {'state':'already-present','sha':previous['sha']}
        gate.require(tap.version(raw)<tap.version(frozen),'tap same-version conflict or downgrade refused')
        payload['sha']=previous['sha']
    current=shared_verify(root,signatures,'homebrew')
    gate.require(current==value and homebrew.check(root,current['tag'],current['targets'])==frozen,'formula changed at write boundary')
    result=tap.tap_api('PUT',payload)
    gate.require(isinstance(result,dict) and result.get('content',{}).get('sha')==tap.blob_sha(frozen)
                 and re.fullmatch('[0-9a-f]{40}',result.get('commit',{}).get('sha','')),'tap write unconfirmed; reconcile on retry')
    gate.require(tap.remote_bytes(tap.tap_api('GET'))==frozen,'tap read-back differs; reconcile on retry')
    return {'state':'published','commit':result['commit']['sha']}


def image_helper():
    spec=importlib.util.spec_from_file_location('release_oci',ROOT/'packaging/ghcr-candidate.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    return helper


def image_subjects(work,signatures):
    index=gate.strict_json(contract.regular(work/'verified.json'))
    for subject,digest in [('index',index['digest']),*index['platforms'].items()]:
        for kind in (['provenance'] if subject=='index' else ['provenance','image-sbom','binary-sbom']):
            yield subject,kind,digest,('https://slsa.dev/provenance/v1' if kind=='provenance' else 'https://spdx.dev/Document'),signatures/f'ghcr-{subject}-{kind}.json'


def check_images(root,signatures,value,work,subjects=None):
    image_helper().inspect_release(root,work,value)
    expected=gate.strict_json(contract.regular(root/'ghcr-index.json'))
    gate.require(gate.strict_json(contract.regular(work/'verified.json'))==expected,'working OCI descriptor differs')
    frozen=list(image_subjects(work,signatures))
    subjects=frozen if subjects is None else list(subjects)
    gate.require([item[:4] for item in subjects]==[item[:4] for item in frozen],
                 'registry read-back subjects differ from frozen set')
    for _,_,digest,predicate,bundle in subjects:
        contract.regular(bundle)
        manifest=work/'layout/blobs/sha256'/digest.removeprefix('sha256:')
        gate.require('sha256:'+gate.digest(contract.regular(manifest))==digest,'local OCI manifest differs')
        command=contract.attestation_command(manifest,value['tag'],value['source_sha'],bundle)
        command[command.index('--predicate-type')+1]=predicate
        result=verifier_process.run(command,check=True,capture_output=True,text=True)
        rows=gate.strict_json(result.stdout);contract.require_identity(rows,value['tag'],value['source_sha'])
        contract.require_run(rows,value['attesting']['run_id'],value['attesting']['run_attempt'])
    return expected


def verify_images(root,signatures,value):
    with tempfile.TemporaryDirectory(prefix='release-oci-check-') as tmp:
        work=Path(tmp)/'image';image_helper().inspect_release(root,work,value)
        return check_images(root,signatures,value,work)


def ghcr_upload(root,signatures,value):
    with tempfile.TemporaryDirectory(prefix='release-ghcr-') as tmp,verifier_process.environment() as transport:
        work=Path(tmp)/'image';index=image_helper().inspect_release(root,work,value)
        check_images(root,signatures,value,work)
        # No credential is read or registry contacted before all local subjects
        # and their exact-tag/original-run provenance have verified.
        token=os.environ.get('GHCR_PUBLISH_TOKEN');user=os.environ.get('GHCR_PUBLISH_USER','')
        gate.require(token and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]*',user),'dedicated GHCR credential/user missing')
        auth=Path(tmp)/'config.json'
        subprocess.run(['skopeo','login','--authfile',str(auth),'--username',user,'--password-stdin','ghcr.io'],
                       input=token,text=True,check=True,capture_output=True,env=transport)
        auth.chmod(0o600)
        # Registry transport gets only its dedicated auth, never GitHub/OIDC
        # authority or operator configuration. Crypto uses a separate fresh env.
        registry_env=dict(transport,REGISTRY_AUTH_FILE=str(auth),DOCKER_CONFIG=tmp)
        remote=registry_helper()
        version=value['tag'].removeprefix('v');digest=index['digest']
        exists=remote.reconcile(version,digest,auth)==0
        if not exists:exists=remote.reconcile(digest,digest,auth)==0
        if not exists:
            shared_verify(root,signatures,'ghcr');check_images(root,signatures,value,work)
            # Reconcile again after a potentially slow cryptographic boundary.
            if remote.reconcile(version,digest,auth)!=0 and remote.reconcile(digest,digest,auth)!=0:
                subprocess.run(['skopeo','copy','--all','--preserve-digests','--authfile',str(auth),
                                'oci:'+str(work/'layout'),'docker://ghcr.io/marcinwadon/hennery@'+digest],check=True,env=registry_env)
            gate.require(remote.reconcile(digest,digest,auth)==0,'GHCR upload ambiguous; stop and reconcile')
        def before_referrer_write():
            shared_verify(root,signatures,'ghcr');check_images(root,signatures,value,work)
        fetched=registry_bundles.reconcile(list(image_subjects(work,signatures)),Path(tmp)/'fetched',
                                          before_referrer_write,environment=registry_env,auth=auth)
        check_images(root,signatures,value,work,subjects=fetched)
        return {'state':'published','digest':digest}


def registry_helper():
    spec=importlib.util.spec_from_file_location('ghcr_remote',ROOT/'packaging/ghcr-remote.py')
    remote=importlib.util.module_from_spec(spec);spec.loader.exec_module(remote)
    return remote


def publish(root, signatures, channel):
    bootstrap=channel=='crates' and os.environ.get('RELEASE_CRATES_BOOTSTRAP_ENABLED')=='true'
    try:
        value=shared_verify(root,signatures,channel)
        if channel=='homebrew':return homebrew_upload(root,signatures,value)
        if channel=='ghcr':return ghcr_upload(root,signatures,value)
        gate.require(channel=='crates','unknown folded publisher')
        token=crates_token(os.environ)
        def authorize_crates():
            shared_verify(root,signatures,'crates')
            return gate.digest(contract.regular(Path(root)/'crates-inventory.json'))
        with verifier_process.environment() as env:
            return crates_delivery.run(root,signatures,token,authorize_crates,environment=env)
    finally:
        if bootstrap:
            print('BOOTSTRAP: revoke the bootstrap token and confirm revocation on success or abandonment; remove its release secret and disable bootstrap before any later run.')
``````

<!-- replay-file: {"path":"packaging/release/channels.json","mode":"100644","sha256":"fda47c7e896d4208c30ab1ab22fa6c41f6071655bf628d0fb22a3fee091cce46","encoding":"utf8"} -->
``````json
["github"]
``````

<!-- replay-file: {"path":"packaging/release/contract.py","mode":"100644","sha256":"a815dbd77b7f8c92b651344e65199ed02699086f5bdba2a2776a9330aa0bd1c3","encoding":"utf8"} -->
``````python
"""Signed-source, checksums and exact-run provenance for final release bytes."""
import re
from pathlib import Path
import subprocess

import gate
import workflow_policy
import verifier_process

CHECKSUMS = 'SHA256SUMS'
METADATA = 'release-metadata.json'
BUNDLE = 'release.sigstore.jsonl'
WORKFLOW = '.github/workflows/release.yml'
TAG = r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?'
SHA = r'[0-9a-f]{40}'


def parse_checksums(raw):
    gate.require(isinstance(raw, bytes) and raw.endswith(b'\n'), 'checksum list must end with newline')
    try:
        lines = raw.decode('ascii').splitlines()
    except UnicodeError as error:
        raise gate.Refused('checksum list must be ASCII') from error
    entries, folded = {}, set()
    for line in lines:
        match = re.fullmatch(r'([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)', line)
        gate.require(match is not None, 'malformed checksum entry')
        digest, name = match.groups()
        gate.require(name.casefold() not in (CHECKSUMS.casefold(), BUNDLE.casefold()) and name.casefold() not in folded,
                     'duplicate, ambiguous or cyclic checksum entry')
        entries[name] = digest
        folded.add(name.casefold())
    gate.require(entries and list(entries) == sorted(entries), 'checksum list must be nonempty and sorted')
    gate.require(raw == ''.join(f'{sha}  {name}\n' for name, sha in entries.items()).encode('ascii'),
                 'checksum list must use canonical lines')
    return entries


def selected_channels(raw, workflow):
    channels = gate.strict_json(raw)
    gate.require(isinstance(channels, list) and channels and all(isinstance(c, str) for c in channels), 'invalid channel selection')
    gate.require(channels == sorted(set(channels)) and set(channels) <= gate.CHANNELS and 'github' in channels,
                 'channel selection must be unique, known, sorted and include github')
    available = workflow_policy.channel_jobs(workflow)
    gate.require(set(channels) - {'github'} <= set(available), 'selected channel has no owning acceptance job')
    return channels


def attestation_command(subject, tag, source_sha, bundle, trusted_root=None):
    gate.require(isinstance(tag, str) and re.fullmatch(TAG, tag) and isinstance(source_sha, str)
                 and re.fullmatch(SHA, source_sha), 'invalid attestation tag/source binding')
    command = ['gh', 'attestation', 'verify', str(subject), '--repo', gate.REPOSITORY,
               '--cert-identity', f'https://github.com/{gate.REPOSITORY}/{WORKFLOW}@refs/tags/{tag}',
               '--source-ref', 'refs/tags/' + tag, '--source-digest', source_sha, '--signer-digest', source_sha,
               '--cert-oidc-issuer', 'https://token.actions.githubusercontent.com',
               '--predicate-type', 'https://slsa.dev/provenance/v1', '--deny-self-hosted-runners', '--format', 'json']
    if bundle is not None:
        command += ['--bundle', str(bundle)]
    if trusted_root is not None:
        command += ['--custom-trusted-root', str(trusted_root)]
    return command


def require_run(results, run_id, attesting_attempt):
    gate.require(type(run_id) is int and run_id > 0 and type(attesting_attempt) is int and attesting_attempt > 0,
                 'invalid attesting run/attempt')
    expected = f'https://github.com/{gate.REPOSITORY}/actions/runs/{run_id}/attempts/{attesting_attempt}'
    gate.require(isinstance(results, list) and results, 'no verified attestation results')
    for result in results:
        try:
            actual = result['verificationResult']['signature']['certificate']['runInvocationURI']
        except (KeyError, TypeError) as error:
            raise gate.Refused('verified certificate run invocation missing') from error
        gate.require(actual == expected, 'verified certificate belongs to another run/attesting attempt')
    return expected


def require_identity(results, tag, source_sha):
    # These fields come from the verified certificate, never the predicate.
    # The real pinned-CLI test must fail if upstream changes its JSON layout.
    expected = {'sourceRepositoryURI': 'https://github.com/' + gate.REPOSITORY,
                'buildSignerURI': f'https://github.com/{gate.REPOSITORY}/{WORKFLOW}@refs/tags/{tag}',
                'sourceRepositoryRef': 'refs/tags/' + tag, 'sourceRepositoryDigest': source_sha,
                'buildSignerDigest': source_sha, 'runnerEnvironment': 'github-hosted',
                'issuer': 'https://token.actions.githubusercontent.com'}
    gate.require(isinstance(results, list) and results, 'no verified identity results')
    for result in results:
        try:
            certificate = result['verificationResult']['signature']['certificate']
            gate.require(all(certificate.get(key) == value for key, value in expected.items()), 'verified certificate identity differs')
        except (KeyError, TypeError, AttributeError) as error:
            raise gate.Refused('verified certificate identity missing') from error


def regular(path):
    path = Path(path)
    gate.require(path.is_file() and not path.is_symlink(), 'missing/nonregular release file: ' + path.name)
    return path.read_bytes()


def verify_files(root):
    root = Path(root)
    gate.require(root.is_dir() and not root.is_symlink(), 'nonregular release directory')
    entries = parse_checksums(regular(root / CHECKSUMS))
    actual = {}
    for path in root.iterdir():
        data = regular(path)
        if path.name != CHECKSUMS:
            actual[path.name] = gate.digest(data)
    gate.require(actual == entries, 'release checksum closure incomplete or bytes changed')
    return entries


def validate_metadata(value):
    gate.require(isinstance(value, dict) and value.get('schema') == 2 and value.get('repository') == gate.REPOSITORY,
                 'invalid release metadata repository/schema')
    required = {'schema', 'repository', 'source_sha', 'tag', 'tag_object', 'channels', 'targets', 'attesting'}
    gate.require(required <= set(value) <= required | {'binaries'}, 'unexpected release metadata fields')
    gate.require(isinstance(value.get('tag'), str) and re.fullmatch(TAG, value['tag']), 'invalid release metadata tag')
    for field in ('source_sha', 'tag_object'):
        gate.require(isinstance(value.get(field), str) and re.fullmatch(SHA, value[field]), 'invalid release metadata ' + field)
    for field, allowed in [('channels', gate.CHANNELS), ('targets', gate.TARGETS)]:
        items = value.get(field)
        gate.require(isinstance(items, list) and items and all(isinstance(x, str) for x in items)
                     and items == sorted(set(items)) and set(items) <= allowed, 'invalid release metadata ' + field)
    gate.require('github' in value['channels'] and ('-' not in value['tag'] or value['channels'] == ['github']),
                 'prerelease channels must remain GitHub only')
    run = value.get('attesting')
    gate.require(isinstance(run, dict) and set(run) == {'run_id', 'run_attempt'}
                 and all(type(n) is int and n > 0 for n in run.values()), 'invalid attesting run metadata')
    return value


def freeze(root, metadata):
    root = Path(root)
    gate.require(not any((root / name).exists() or (root / name).is_symlink() for name in (METADATA, CHECKSUMS, BUNDLE)),
                 'release already frozen or cyclic sidecar present')
    validate_metadata(metadata)
    (root / METADATA).write_bytes(gate.canonical(metadata))
    entries = [(p.name, gate.digest(regular(p))) for p in sorted(root.iterdir())]
    raw = ''.join(f'{digest}  {name}\n' for name, digest in entries).encode('ascii')
    parse_checksums(raw)
    (root / CHECKSUMS).write_bytes(raw)
    verify_files(root)
    return gate.digest(raw)


def load(root):
    root = Path(root)
    entries = verify_files(root)
    value = validate_metadata(gate.strict_json(regular(root / METADATA)))
    # Derived view for channel validators. SHA256SUMS remains the only global
    # digest list on disk; metadata contains no duplicated payload inventory.
    return value | {'artifacts': [{'name': name, 'sha256': digest, 'size': len(regular(root / name))}
                                  for name, digest in entries.items()]}


def verify(root, tag, source_sha, bundle, run_id=None, attesting_attempt=None, trusted_root=None):
    import tag_signature
    root = Path(root)
    value = load(root)
    gate.require(value['tag'] == tag and value['source_sha'] == source_sha, 'release tag/source binding differs')
    run = value['attesting']
    if run_id is None:
        run_id = run['run_id']
    if attesting_attempt is None:
        attesting_attempt = run['run_attempt']
    gate.require(run == {'run_id': run_id, 'run_attempt': attesting_attempt}, 'release attesting run differs')
    tag_signature.verify(tag, source_sha, value['tag_object'])
    subjects = [CHECKSUMS] + [item['name'] for item in value['artifacts']]
    for subject in subjects:
        command = attestation_command(root / subject, tag, source_sha, bundle, trusted_root)
        result = verifier_process.run(command, check=True, capture_output=True, text=True)
        results = gate.strict_json(result.stdout)
        require_identity(results, tag, source_sha)
        require_run(results, run_id, attesting_attempt)
    gate.require(load(root) == value, 'release bytes changed during verification')
    return value
``````

<!-- replay-file: {"path":"packaging/release/crates_delivery.py","mode":"100644","sha256":"5aa4e9b2ab5437367c9d0b1b44b684f41760d10b0396f442c390116e08385452","encoding":"utf8"} -->
``````python
"""Private gate broker: GitHub authorization stays in the credentialed parent."""
import os
from pathlib import Path
import re
import select
import subprocess
import tempfile
import time

import gate

ROOT=Path(__file__).resolve().parents[2]
MAX_LINE=128
MAX_REQUESTS=10000


def run(root, signatures, token, gatecallback, *, environment, command=None, timeout=1800):
    """Run the frozen uploader with only its chosen registry credential.

    The callback executes in this process and returns the freshly verified
    crates-inventory digest. Neither GitHub credentials nor verifier subprocesses
    cross the private request/reply pipes. No child-selected path is trusted.
    """
    gate.require(isinstance(token,str) and bool(token),'crates publishing credential absent')
    gate.require(timeout>0,'invalid crates delivery deadline')
    process=None;descriptors=[];temporary=None
    try:
        temporary=tempfile.TemporaryDirectory(prefix='release-crates-writer-')
        home=Path(temporary.name)
        # Even a caller-supplied map is filtered. Ambient process state,
        # shell hooks, proxy credentials and installed configuration are out.
        allowed=('PATH','SSL_CERT_FILE','SSL_CERT_DIR','NIX_SSL_CERT_FILE')
        child={key:environment[key] for key in allowed if key in environment}
        child['PATH']=child.get('PATH',os.defpath)
        child.update(HOME=str(home),CARGO_HOME=str(home/'cargo'),XDG_CONFIG_HOME=str(home/'config'),
                     XDG_CACHE_HOME=str(home/'cache'),XDG_DATA_HOME=str(home/'data'),
                     GITHUB_ACTIONS='true',CARGO_REGISTRY_TOKEN=token)
        request_read,request_write=os.pipe();descriptors.extend((request_read,request_write))
        reply_read,reply_write=os.pipe();descriptors.extend((reply_read,reply_write))
        child.update(CRATES_GATE_REQUEST_FD=str(request_write),CRATES_GATE_REPLY_FD=str(reply_read))
        args=command if command is not None else ['node',str(ROOT/'packaging/publish-crates.mjs'),str(root),str(signatures)]
        process=subprocess.Popen(args,env=child,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL,pass_fds=(request_write,reply_read))
        for descriptor in (request_write,reply_read):os.close(descriptor);descriptors.remove(descriptor)
        deadline=time.monotonic()+timeout;pending=b'';sequence=0;eof=False
        while not eof:
            remaining=deadline-time.monotonic()
            gate.require(remaining>0,'crates writer deadline exceeded')
            ready,_,_=select.select([request_read],[],[],min(remaining,1))
            if not ready:continue
            chunk=os.read(request_read,MAX_LINE+1)
            if not chunk:
                eof=True;break
            pending+=chunk
            gate.require(len(pending)<=MAX_LINE,'oversized crates gate request')
            while b'\n' in pending:
                line,pending=pending.split(b'\n',1)
                sequence+=1
                gate.require(sequence<=MAX_REQUESTS and line==f'gate-v1:{sequence}'.encode(),
                             'invalid crates gate protocol or sequence')
                try:current=gatecallback()
                except Exception:raise gate.Refused('parent crates authorization refused') from None
                gate.require(isinstance(current,str) and re.fullmatch('[0-9a-f]{64}',current),
                             'parent crates gate returned invalid digest')
                gate.require(deadline-time.monotonic()>0,'parent crates authorization exceeded writer deadline')
                response=f'ok-v1:{sequence}:{current}\n'.encode()
                gate.require(os.write(reply_write,response)==len(response),'incomplete crates gate response')
        gate.require(not pending and sequence>0,'crates writer ended without a complete gate request')
        try:result=process.wait(timeout=max(0.001,deadline-time.monotonic()))
        except subprocess.TimeoutExpired:raise gate.Refused('crates writer deadline exceeded') from None
        gate.require(result==0,'crates writer failed; reconcile frozen bytes before retry')
        return {'state':'published'}
    except gate.Refused:
        raise
    except Exception:
        # Callback and child exceptions may include credentials. The parent
        # records only this fixed refusal; no child stderr or exception text.
        raise gate.Refused('crates gate broker refused; reconcile before retry') from None
    finally:
        for descriptor in descriptors:
            try:os.close(descriptor)
            except OSError:pass
        if process is not None:
            if process.poll() is None:process.kill()
            process.wait()
        if temporary is not None:temporary.cleanup()
``````

<!-- replay-file: {"path":"packaging/release/example-observations.json","mode":"100644","sha256":"d3bd6bef186e1945523ad7e05c4bcc03adcc1a4fdcfb10f8ca7f3c40b2af4a00","encoding":"utf8"} -->
``````json
{
  "maintainer_touch": {
    "confirmed": false,
    "fingerprint": "F26C7F594DFE84D131703AFC23E5A318AE8D2861",
    "policy": "on"
  },
  "homebrew": {
    "repository": "marcinwadon/homebrew-tap",
    "branch": "main",
    "environment": "release",
    "credential": "RELEASE_HOMEBREW_TOKEN",
    "kind": "fine-grained-pat",
    "repositories": [
      "marcinwadon/homebrew-tap"
    ],
    "permissions": {
      "contents": "write"
    },
    "scope_confirmed": false
  },
  "ghcr": {
    "repository": "marcinwadon/hennery",
    "actions_access": "read",
    "dedicated_credential": "GHCR_PUBLISH_TOKEN",
    "negative_push": {
      "credential": "GITHUB_TOKEN",
      "read_status": null,
      "push_status": null
    }
  },
  "crates": [
    {
      "crate": "hennery-proto",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    },
    {
      "crate": "hennery-kernel",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    },
    {
      "crate": "hennery-view",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    },
    {
      "crate": "hennery-host",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    },
    {
      "crate": "hennery-gateway",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    },
    {
      "crate": "hennery-sessions",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    },
    {
      "crate": "hennery",
      "repository": "marcinwadon/hennery",
      "workflow": "release.yml",
      "environment": "release"
    }
  ],
  "crates_bootstrap": {
    "publish_only": true,
    "crate_names": [
      "hennery",
      "hennery-gateway",
      "hennery-host",
      "hennery-kernel",
      "hennery-proto",
      "hennery-sessions",
      "hennery-view"
    ],
    "scope_confirmed": false,
    "revocation_required": true
  }
}
``````

<!-- replay-file: {"path":"packaging/release/fixtures/attestation/LICENSE.cli","mode":"100644","sha256":"6da4adc42392c8485e40b4251c7e332fc3352df1947c9ffade71dd60b14a7a4f","encoding":"utf8"} -->
``````text
MIT License

Copyright (c) 2019 GitHub Inc.

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
``````

<!-- replay-file: {"path":"packaging/release/fixtures/attestation/README.md","mode":"100644","sha256":"7ce35b43099776644fae7a97045aa2c0212545561ec5ebd200254a177988dafe","encoding":"utf8"} -->
``````markdown
# Authentic upstream attestation fixture

Exact upstream files from `cli/cli` commit
`b62671151b7c98852b7023dd672f5092d1c9dab0`, directory
`pkg/cmd/attestation/test/data`, fetched read-only. The test pins each SHA-256.
The payload is sigstore-js 2.1.0; its genuine certificate identifies
`sigstore/sigstore-js`, `release.yml@refs/heads/main`, source/signer commit
`26d16513386ffaa790b1c32f927544f1322e4194`, run `6014488666`, attempt `1`.
The public-good trusted root is the matching upstream fixture. Its use is
confined to the offline test; production verification uses its normal root.

Pinned `gh 2.101.0` must verify the original payload and reject changed bytes.
Its flattened certificate JSON must remain stable; a CLI bump requires explicit
requalification. Production Hennery policy must reject this upstream identity.
Tests substituting Hennery fields are structural tests, never crypto evidence.
No real Hennery attestation was created. Under the latest operator decision
(2026-10-16), all channels may be enabled for the first release without waiting
for this fixture. Preserve and verify that release's genuine Hennery tagged
attestation, payload and provenance as follow-up evidence.

Generated with Claude AI — please review before distribution.
``````

<!-- replay-file: {"path":"packaging/release/fixtures/attestation/sigstore-js-2.1.0-bundle.json","mode":"100644","sha256":"cfadddd579b9fb45947530cd0e860986ec610a28f7fa6de3ef31cc051f07f761","encoding":"utf8"} -->
``````json
{
	"mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json",
	"verificationMaterial": {
		"certificate": {
			"rawBytes": "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"
		},
		"tlogEntries": [
			{
				"logIndex": "33351527",
				"logId": {
					"keyId": "wNI9atQGlz+VWfO6LRygH4QUfY/8W4RFwiT5i5WRgB0="
				},
				"kindVersion": {
					"kind": "intoto",
					"version": "0.0.2"
				},
				"integratedTime": "1693323623",
				"inclusionPromise": {
					"signedEntryTimestamp": "MEYCIQDhWvNSLvnq5ZS3qTIgC7K2uQFeA0g8FEEjNo1UQxeubAIhALDrD1uIiUkk3tQNp/4gKT/9j8zEyyxi9Ti+qaD8q2vI"
				},
				"inclusionProof": {
					"logIndex": "29188096",
					"rootHash": "fbEijQTFeiQCldZqez/u/WcrNPk4nxXI5ihofHYjFUA=",
					"treeSize": "29188099",
					"hashes": [
						"z7VKeAC2d2x18Vtxt7n40GS3gtc1xfRwjjxxzpy/Trw=",
						"/Kd8ZuCLZ7MukSwpjaSgxKFl5X2vdHWk6/qpNrkiUJo=",
						"vvkKs7IShUI15nVb9c5olPgBnL9r4uP7+d5KzV0hSjs=",
						"Fg4p0WJZw8Lghrpxkx1SXgzfroTeIIrEgEbfgr9IdXY=",
						"bH8NahqE+hQ58Qxhg0V5fYusFQ1xsaQ/rK6slWVRT5k=",
						"HplNgZ3/afEHq52zcfL2s1AKisOYDdMCWK1jOu1tGyw=",
						"uOPuC2YDmwZe989ZN3Lgh5CKMXh9HETrSNgf0jV0WkM=",
						"eVsvWKnEZ1+Xo3Ba15DfEiIhhmlrEaIeb+VfYmx8KhY=",
						"uLuBRins5nkqq2rqd17R27pQTUF+xetttC6MsmlUzd0=",
						"jRUq4D8O+FI47Wbw96s7yHCu4qzWUxpIVfxQEeprDmc=",
						"rXEsmEJN4PEoTU8US4qVtdIsGB1MCiRlGOepoiC99kM="
					],
					"checkpoint": {
						"envelope": "rekor.sigstore.dev - 2605736670972794746\n29188099\nfbEijQTFeiQCldZqez/u/WcrNPk4nxXI5ihofHYjFUA=\nTimestamp: 1693323623528968756\n\n— rekor.sigstore.dev wNI9ajBEAiAK0YTbxRlhOZeeP+844Y+W7iz+hsFIF8x2NYsmuaxifAIgYUFSurlKwN7j5jCwpqSVrkbouQoYIYlyWU9Om16svmI=\n"
					}
				},
				"canonicalizedBody": "eyJhcGlWZXJzaW9uIjoiMC4wLjIiLCJraW5kIjoiaW50b3RvIiwic3BlYyI6eyJjb250ZW50Ijp7ImVudmVsb3BlIjp7InBheWxvYWRUeXBlIjoiYXBwbGljYXRpb24vdm5kLmluLXRvdG8ranNvbiIsInNpZ25hdHVyZXMiOlt7InB1YmxpY0tleSI6IkxTMHRMUzFDUlVkSlRpQkRSVkpVU1VaSlEwRlVSUzB0TFMwdENrMUpTVWQwUkVORFFtcDFaMEYzU1VKQlowbFZRMHBNYVhCVGREQTVTMHhHWXpCS1dXWjFSSEpUWVc0dkwweHpkME5uV1VsTGIxcEplbW93UlVGM1RYY0tUbnBGVmsxQ1RVZEJNVlZGUTJoTlRXTXliRzVqTTFKMlkyMVZkVnBIVmpKTlVqUjNTRUZaUkZaUlVVUkZlRlo2WVZka2VtUkhPWGxhVXpGd1ltNVNiQXBqYlRGc1drZHNhR1JIVlhkSWFHTk9UV3BOZDA5RVNUVk5WRlV3VFVSSmVsZG9ZMDVOYWsxM1QwUkpOVTFVVlRGTlJFbDZWMnBCUVUxR2EzZEZkMWxJQ2t0dldrbDZhakJEUVZGWlNVdHZXa2w2YWpCRVFWRmpSRkZuUVVWUVptMDJURkJZVVdWS1ZFTTRPVlZQY1dsT1YyMXVXbGxIYlZnMFZETnBURnBIYVRBS1JWWTBZbVpQYjAwNE5raDZZVGswV0hGNWRYZDRRVzlYY0VOUVpXTkdRMFZpUVdVNGJESmtaeTlsY2pOUE9VeEZSbkZQUTBKV2IzZG5aMVpYVFVFMFJ3cEJNVlZrUkhkRlFpOTNVVVZCZDBsSVowUkJWRUpuVGxaSVUxVkZSRVJCUzBKblozSkNaMFZHUWxGalJFRjZRV1JDWjA1V1NGRTBSVVpuVVZWbGNYQkRDbGhJY2pOd1kxVmhURE5GUmt0U0swdHpiWFZMVVhGdmQwaDNXVVJXVWpCcVFrSm5kMFp2UVZVek9WQndlakZaYTBWYVlqVnhUbXB3UzBaWGFYaHBORmtLV2tRNGQxbDNXVVJXVWpCU1FWRklMMEpHYTNkV05GcFdZVWhTTUdOSVRUWk1lVGx1WVZoU2IyUlhTWFZaTWpsMFRETk9jRm96VGpCaU0wcHNURE5PY0FwYU0wNHdZak5LYkV4WGNIcE1lVFZ1WVZoU2IyUlhTWFprTWpsNVlUSmFjMkl6WkhwTU0wcHNZa2RXYUdNeVZYVmxWekZ6VVVoS2JGcHVUWFpoUjFab0NscElUWFppVjBad1ltcEJOVUpuYjNKQ1owVkZRVmxQTDAxQlJVSkNRM1J2WkVoU2QyTjZiM1pNTTFKMllUSldkVXh0Um1wa1IyeDJZbTVOZFZveWJEQUtZVWhXYVdSWVRteGpiVTUyWW01U2JHSnVVWFZaTWpsMFRVSkpSME5wYzBkQlVWRkNaemM0ZDBGUlNVVkNTRUl4WXpKbmQwNW5XVXRMZDFsQ1FrRkhSQXAyZWtGQ1FYZFJiMDFxV210TlZGa3hUVlJOZWs5RVdtMWFiVVpvVG5wcmQxbHFSbXBOZWtwdFQxUkpNMDVVVVRCYWFrVjZUV3BLYkU1RVJUVk9SRUZXQ2tKbmIzSkNaMFZGUVZsUEwwMUJSVVZDUVdSVFdsZDRiRmxZVG14TlEwbEhRMmx6UjBGUlVVSm5OemgzUVZGVlJVWklUbkJhTTA0d1lqTktiRXd6VG5BS1dqTk9NR0l6U214TVYzQjZUVUl3UjBOcGMwZEJVVkZDWnpjNGQwRlJXVVZFTTBwc1dtNU5kbUZIVm1oYVNFMTJZbGRHY0dKcVFUZENaMjl5UW1kRlJRcEJXVTh2VFVGRlNVSkRNRTFMTW1nd1pFaENlazlwT0haa1J6bHlXbGMwZFZsWFRqQmhWemwxWTNrMWJtRllVbTlrVjBveFl6SldlVmt5T1hWa1IxWjFDbVJETldwaU1qQjNXbEZaUzB0M1dVSkNRVWRFZG5wQlFrTlJVbGhFUmxadlpFaFNkMk42YjNaTU1tUndaRWRvTVZscE5XcGlNakIyWXpKc2JtTXpVbllLWTIxVmRtTXliRzVqTTFKMlkyMVZkR0Z1VFhaTWJXUndaRWRvTVZscE9UTmlNMHB5V20xNGRtUXpUWFpqYlZaeldsZEdlbHBUTlRWaVYzaEJZMjFXYlFwamVUbHZXbGRHYTJONU9YUlpWMngxVFVSblIwTnBjMGRCVVZGQ1p6YzRkMEZSYjBWTFozZHZUV3BhYTAxVVdURk5WRTE2VDBSYWJWcHRSbWhPZW10M0NsbHFSbXBOZWtwdFQxUkpNMDVVVVRCYWFrVjZUV3BLYkU1RVJUVk9SRUZrUW1kdmNrSm5SVVZCV1U4dlRVRkZURUpCT0UxRVYyUndaRWRvTVZscE1XOEtZak5PTUZwWFVYZE9kMWxMUzNkWlFrSkJSMFIyZWtGQ1JFRlJjRVJEWkc5a1NGSjNZM3B2ZGt3eVpIQmtSMmd4V1drMWFtSXlNSFpqTW14dVl6TlNkZ3BqYlZWMll6SnNibU16VW5aamJWVjBZVzVOZDA5QldVdExkMWxDUWtGSFJIWjZRVUpFVVZGeFJFTm5lVTV0VVhoT2FsVjRUWHBOTkU1dFdtMVpWMFV6Q2s5VVFtbE5WMDE2VFcxWk5VMXFZekZPUkZKdFRWUk5lVTF0VlRCTlZHc3dUVUk0UjBOcGMwZEJVVkZDWnpjNGQwRlJORVZGVVhkUVkyMVdiV041T1c4S1dsZEdhMk41T1hSWlYyeDFUVUpyUjBOcGMwZEJVVkZDWnpjNGQwRlJPRVZEZDNkS1RrUnJNVTVVWXpCT1ZGVXhUVU56UjBOcGMwZEJVVkZDWnpjNGR3cEJVa0ZGU0ZGM1ltRklVakJqU0UwMlRIazVibUZZVW05a1YwbDFXVEk1ZEV3elRuQmFNMDR3WWpOS2JFMUNaMGREYVhOSFFWRlJRbWMzT0hkQlVrVkZDa05uZDBsT2VrVjNUMVJaZWs1VVRYZGFVVmxMUzNkWlFrSkJSMFIyZWtGQ1JXZFNXRVJHVm05a1NGSjNZM3B2ZGt3eVpIQmtSMmd4V1drMWFtSXlNSFlLWXpKc2JtTXpVblpqYlZWMll6SnNibU16VW5aamJWVjBZVzVOZGt4dFpIQmtSMmd4V1drNU0ySXpTbkphYlhoMlpETk5kbU50Vm5OYVYwWjZXbE0xTlFwaVYzaEJZMjFXYldONU9XOWFWMFpyWTNrNWRGbFhiSFZOUkdkSFEybHpSMEZSVVVKbk56aDNRVkpOUlV0bmQyOU5hbHByVFZSWk1VMVVUWHBQUkZwdENscHRSbWhPZW10M1dXcEdhazE2U20xUFZFa3pUbFJSTUZwcVJYcE5ha3BzVGtSRk5VNUVRVlZDWjI5eVFtZEZSVUZaVHk5TlFVVlZRa0ZaVFVKSVFqRUtZekpuZDFkbldVdExkMWxDUWtGSFJIWjZRVUpHVVZKTlJFVndiMlJJVW5kamVtOTJUREprY0dSSGFERlphVFZxWWpJd2RtTXliRzVqTTFKMlkyMVZkZ3BqTW14dVl6TlNkbU50VlhSaGJrMTJXVmRPTUdGWE9YVmplVGw1WkZjMWVreDZXWGROVkZFd1QwUm5NazVxV1haWldGSXdXbGN4ZDJSSVRYWk5WRUZYQ2tKbmIzSkNaMFZGUVZsUEwwMUJSVmRDUVdkTlFtNUNNVmx0ZUhCWmVrTkNhV2RaUzB0M1dVSkNRVWhYWlZGSlJVRm5VamhDU0c5QlpVRkNNa0ZPTURrS1RVZHlSM2g0UlhsWmVHdGxTRXBzYms1M1MybFRiRFkwTTJwNWRDODBaVXRqYjBGMlMyVTJUMEZCUVVKcGEwaDZLM1ozUVVGQlVVUkJSV04zVWxGSlp3cGFSVzg0WXpCbFExcElSV2cwZFhwNlNucEdlamxVSzBWbVUxUk9WSFJDTWtaSlNERTRkbGh3YTA5elEwbFJSRVV4VFZSMGFUbFNiMFJ1VWs4elUwVlVDakZhYTJGa05rWnZWSGd2YXpaNmRGRmpkMGxFVUcxdVVuaFVRVXRDWjJkeGFHdHFUMUJSVVVSQmQwNXVRVVJDYTBGcVFrSXdObVp0VGxoNE5sUnZZVU1LYkVabk1tdFBlRzVtVEVkbmNuWnZVak5HTlVkcVJIUjJSRUpDT0cwNVUxZFJUbnBNTWpFeGFsbHRVeTluSzFsaVlubFZRMDFESzJGa05tcEpTeXRsWmdwbE5GaFBTV3hvVEdOWGVHVmFZa0owVFdwTFUzSlFlRzF0TkdwU00wSkdVVkZQUWxJck9ISXlOME5wYjNsb2VHOVRjWFpNZFhjOVBRb3RMUzB0TFVWT1JDQkRSVkpVU1VaSlEwRlVSUzB0TFMwdCIsInNpZyI6IlRVVlJRMGxEWVhSb2JsUkljMlJtV25GSWNUTnBXRXhxVFdVd1ZGVTViRXhaYmxJeGVtazNNM0JSZFZobU5VdElRV2xDTWpOS2FDdG5VMll4VVVWRGJrRlRSMlZ3TW1VeVRVZHVVRmhwYjFWTVZqUjJRMGxUU2tKdWEwcGFaejA5In1dfSwiaGFzaCI6eyJhbGdvcml0aG0iOiJzaGEyNTYiLCJ2YWx1ZSI6IjFiZDg4ZTA1NGY2OGE3ZDE3MzkzNjcyYjAzZmExOGZkNjRmMGRjZDVmY2M1NDAzNWMxOWZlNjQwMWNmMmNmNWUifSwicGF5bG9hZEhhc2giOnsiYWxnb3JpdGhtIjoic2hhMjU2IiwidmFsdWUiOiI4Y2ViNGFiODEyNzczMTQ3M2E5ZWM4MTE0MGNiNjg0OWNmOGU5NzBjZGEzMmJhZWYwOTlkZjQ4YmEzMjY0NDQyIn19fX0="
			}
		]
	},
	"dsseEnvelope": {
		"payload": "eyJfdHlwZSI6Imh0dHBzOi8vaW4tdG90by5pby9TdGF0ZW1lbnQvdjEiLCJzdWJqZWN0IjpbeyJuYW1lIjoicGtnOm5wbS9zaWdzdG9yZUAyLjEuMCIsImRpZ2VzdCI6eyJzaGE1MTIiOiI5MGYyMjNmOTkyZTRjODhkZDA2OGNkMmE1ZmM1N2Y5ZDJiMzA3OTgzNDNkZDZlMzhmMjljMjQwZTA0YmEwOTBlZjgzMWY4NDQ5MDg0N2M0ZTgyYjkyMzJjNzhlOGEyNTg0NjNiMWU1NWMwZjc0NjlmNzMwMjY1MDA4ZmE2NjMzZiJ9fV0sInByZWRpY2F0ZVR5cGUiOiJodHRwczovL3Nsc2EuZGV2L3Byb3ZlbmFuY2UvdjEiLCJwcmVkaWNhdGUiOnsiYnVpbGREZWZpbml0aW9uIjp7ImJ1aWxkVHlwZSI6Imh0dHBzOi8vc2xzYS1mcmFtZXdvcmsuZ2l0aHViLmlvL2dpdGh1Yi1hY3Rpb25zLWJ1aWxkdHlwZXMvd29ya2Zsb3cvdjEiLCJleHRlcm5hbFBhcmFtZXRlcnMiOnsid29ya2Zsb3ciOnsicmVmIjoicmVmcy9oZWFkcy9tYWluIiwicmVwb3NpdG9yeSI6Imh0dHBzOi8vZ2l0aHViLmNvbS9zaWdzdG9yZS9zaWdzdG9yZS1qcyIsInBhdGgiOiIuZ2l0aHViL3dvcmtmbG93cy9yZWxlYXNlLnltbCJ9fSwiaW50ZXJuYWxQYXJhbWV0ZXJzIjp7ImdpdGh1YiI6eyJldmVudF9uYW1lIjoicHVzaCIsInJlcG9zaXRvcnlfaWQiOiI0OTU1NzQ1NTUiLCJyZXBvc2l0b3J5X293bmVyX2lkIjoiNzEwOTYzNTMifX0sInJlc29sdmVkRGVwZW5kZW5jaWVzIjpbeyJ1cmkiOiJnaXQraHR0cHM6Ly9naXRodWIuY29tL3NpZ3N0b3JlL3NpZ3N0b3JlLWpzQHJlZnMvaGVhZHMvbWFpbiIsImRpZ2VzdCI6eyJnaXRDb21taXQiOiIyNmQxNjUxMzM4NmZmYWE3OTBiMWMzMmY5Mjc1NDRmMTMyMmU0MTk0In19XX0sInJ1bkRldGFpbHMiOnsiYnVpbGRlciI6eyJpZCI6Imh0dHBzOi8vZ2l0aHViLmNvbS9hY3Rpb25zL3J1bm5lci9naXRodWItaG9zdGVkIn0sIm1ldGFkYXRhIjp7Imludm9jYXRpb25JZCI6Imh0dHBzOi8vZ2l0aHViLmNvbS9zaWdzdG9yZS9zaWdzdG9yZS1qcy9hY3Rpb25zL3J1bnMvNjAxNDQ4ODY2Ni9hdHRlbXB0cy8xIn19fX0=",
		"payloadType": "application/vnd.in-toto+json",
		"signatures": [
			{
				"sig": "MEQCICathnTHsdfZqHq3iXLjMe0TU9lLYnR1zi73pQuXf5KHAiB23Jh+gSf1QECnASGep2e2MGnPXioULV4vCISJBnkJZg=="
			}
		]
	}
}
``````

<!-- replay-file: {"path":"packaging/release/fixtures/attestation/sigstore-js-2.1.0.tgz","mode":"100644","sha256":"f0c641fce0310cb43208f4272dc1423153630e44ba8cdc0b5ce8466f724e0eed","encoding":"base64"} -->
``````text
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
``````

<!-- replay-file: {"path":"packaging/release/fixtures/attestation/trusted_root.json","mode":"100644","sha256":"455b3fe53e2678889f093d66ebbfda5f12ebb9d682b146c3535fa04e97689787","encoding":"utf8"} -->
``````json
{"mediaType":"application/vnd.dev.sigstore.trustedroot+json;version=0.1","tlogs":[{"baseUrl":"https://rekor.sigstore.dev","hashAlgorithm":"SHA2_256","publicKey":{"rawBytes":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2G2Y+2tabdTV5BcGiBIx0a9fAFwrkBbmLSGtks4L3qX6yYY0zufBnhC8Ur/iy55GhWP/9A/bY2LhC30M9+RYtw==","keyDetails":"PKIX_ECDSA_P256_SHA_256","validFor":{"start":"2021-01-12T11:53:27.000Z"}},"logId":{"keyId":"wNI9atQGlz+VWfO6LRygH4QUfY/8W4RFwiT5i5WRgB0="}}],"certificateAuthorities":[{"subject":{"organization":"sigstore.dev","commonName":"sigstore"},"uri":"https://fulcio.sigstore.dev","certChain":{"certificates":[{"rawBytes":"MIIB+DCCAX6gAwIBAgITNVkDZoCiofPDsy7dfm6geLbuhzAKBggqhkjOPQQDAzAqMRUwEwYDVQQKEwxzaWdzdG9yZS5kZXYxETAPBgNVBAMTCHNpZ3N0b3JlMB4XDTIxMDMwNzAzMjAyOVoXDTMxMDIyMzAzMjAyOVowKjEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MREwDwYDVQQDEwhzaWdzdG9yZTB2MBAGByqGSM49AgEGBSuBBAAiA2IABLSyA7Ii5k+pNO8ZEWY0ylemWDowOkNa3kL+GZE5Z5GWehL9/A9bRNA3RbrsZ5i0JcastaRL7Sp5fp/jD5dxqc/UdTVnlvS16an+2Yfswe/QuLolRUCrcOE2+2iA5+tzd6NmMGQwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFMjFHQBBmiQpMlEk6w2uSu1KBtPsMB8GA1UdIwQYMBaAFMjFHQBBmiQpMlEk6w2uSu1KBtPsMAoGCCqGSM49BAMDA2gAMGUCMH8liWJfMui6vXXBhjDgY4MwslmN/TJxVe/83WrFomwmNf056y1X48F9c4m3a3ozXAIxAKjRay5/aj/jsKKGIkmQatjI8uupHr/+CxFvaJWmpYqNkLDGRU+9orzh5hI2RrcuaQ=="}]},"validFor":{"start":"2021-03-07T03:20:29.000Z","end":"2022-12-31T23:59:59.999Z"}},{"subject":{"organization":"sigstore.dev","commonName":"sigstore"},"uri":"https://fulcio.sigstore.dev","certChain":{"certificates":[{"rawBytes":"MIICGjCCAaGgAwIBAgIUALnViVfnU0brJasmRkHrn/UnfaQwCgYIKoZIzj0EAwMwKjEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MREwDwYDVQQDEwhzaWdzdG9yZTAeFw0yMjA0MTMyMDA2MTVaFw0zMTEwMDUxMzU2NThaMDcxFTATBgNVBAoTDHNpZ3N0b3JlLmRldjEeMBwGA1UEAxMVc2lnc3RvcmUtaW50ZXJtZWRpYXRlMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE8RVS/ysH+NOvuDZyPIZtilgUF9NlarYpAd9HP1vBBH1U5CV77LSS7s0ZiH4nE7Hv7ptS6LvvR/STk798LVgMzLlJ4HeIfF3tHSaexLcYpSASr1kS0N/RgBJz/9jWCiXno3sweTAOBgNVHQ8BAf8EBAMCAQYwEwYDVR0lBAwwCgYIKwYBBQUHAwMwEgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHQ4EFgQU39Ppz1YkEZb5qNjpKFWixi4YZD8wHwYDVR0jBBgwFoAUWMAeX5FFpWapesyQoZMi0CrFxfowCgYIKoZIzj0EAwMDZwAwZAIwPCsQK4DYiZYDPIaDi5HFKnfxXx6ASSVmERfsynYBiX2X6SJRnZU84/9DZdnFvvxmAjBOt6QpBlc4J/0DxvkTCqpclvziL6BCCPnjdlIB3Pu3BxsPmygUY7Ii2zbdCdliiow="},{"rawBytes":"MIIB9zCCAXygAwIBAgIUALZNAPFdxHPwjeDloDwyYChAO/4wCgYIKoZIzj0EAwMwKjEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MREwDwYDVQQDEwhzaWdzdG9yZTAeFw0yMTEwMDcxMzU2NTlaFw0zMTEwMDUxMzU2NThaMCoxFTATBgNVBAoTDHNpZ3N0b3JlLmRldjERMA8GA1UEAxMIc2lnc3RvcmUwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAAT7XeFT4rb3PQGwS4IajtLk3/OlnpgangaBclYpsYBr5i+4ynB07ceb3LP0OIOZdxexX69c5iVuyJRQ+Hz05yi+UF3uBWAlHpiS5sh0+H2GHE7SXrk1EC5m1Tr19L9gg92jYzBhMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBRYwB5fkUWlZql6zJChkyLQKsXF+jAfBgNVHSMEGDAWgBRYwB5fkUWlZql6zJChkyLQKsXF+jAKBggqhkjOPQQDAwNpADBmAjEAj1nHeXZp+13NWBNa+EDsDP8G1WWg1tCMWP/WHPqpaVo0jhsweNFZgSs0eE7wYI4qAjEA2WB9ot98sIkoF3vZYdd3/VtWB5b9TNMea7Ix/stJ5TfcLLeABLE4BNJOsQ4vnBHJ"}]},"validFor":{"start":"2022-04-13T20:06:15.000Z"}}],"ctlogs":[{"baseUrl":"https://ctfe.sigstore.dev/test","hashAlgorithm":"SHA2_256","publicKey":{"rawBytes":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEbfwR+RJudXscgRBRpKX1XFDy3PyudDxz/SfnRi1fT8ekpfBd2O1uoz7jr3Z8nKzxA69EUQ+eFCFI3zeubPWU7w==","keyDetails":"PKIX_ECDSA_P256_SHA_256","validFor":{"start":"2021-03-14T00:00:00.000Z","end":"2022-10-31T23:59:59.999Z"}},"logId":{"keyId":"CGCS8ChS/2hF0dFrJ4ScRWcYrBY9wzjSbea8IgY2b3I="}},{"baseUrl":"https://ctfe.sigstore.dev/2022","hashAlgorithm":"SHA2_256","publicKey":{"rawBytes":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiPSlFi0CmFTfEjCUqF9HuCEcYXNKAaYalIJmBZ8yyezPjTqhxrKBpMnaocVtLJBI1eM3uXnQzQGAJdJ4gs9Fyw==","keyDetails":"PKIX_ECDSA_P256_SHA_256","validFor":{"start":"2022-10-20T00:00:00.000Z"}},"logId":{"keyId":"3T0wasbHETJjGR4cmWc3AqJKXrjePK3/h4pygC8p7o4="}}]}
``````

<!-- replay-file: {"path":"packaging/release/gate.py","mode":"100644","sha256":"0c553af5b450d720b12a4b98bc67702931f27e1b7b31e3bab54a72b5e2e93328","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Release primitives and read-only fixed-origin platform transport."""
import hashlib
import json
import urllib.error
import urllib.request

import workflow_policy

REPOSITORY = 'marcinwadon/hennery'
CHANNELS = {'github', 'crates', 'ghcr', 'homebrew'}
CHANNEL_JOB_IDS = workflow_policy.CHANNEL_JOB_IDS
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


class GitHub:
    """Only GET; fixed origin, bounded pagination, no credential-bearing redirects."""
    def __init__(self, token):
        self.token = token

    def get(self, suffix):
        require(suffix.startswith('/') and '..' not in suffix, 'invalid API path')
        request = urllib.request.Request('https://api.github.com/repos/' + REPOSITORY + ('' if suffix == '/' else suffix),
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
``````

<!-- replay-file: {"path":"packaging/release/homebrew-proof.sh","mode":"100644","sha256":"b741e773303c825f07a8ab7e526c7fa9fd18e7e7ad72ee4a58c6020a9e8d0914","encoding":"utf8"} -->
``````sh
#!/bin/sh
# PR-only native candidate, using the same archive finalizer as release.yml.
# CI supplies the same pinned Rust toolchain/targets as release.yml.
# Local callers run inside the default Nix shell with one-off Python.
set -eu
TARGET=$1
scratch=$2
export TARGET
case "$TARGET" in
    aarch64-apple-darwin|aarch64-unknown-linux-musl|x86_64-unknown-linux-musl) ;;
    *) echo 'unqualified Homebrew proof target' >&2; exit 1 ;;
esac
sh packaging/install-dist.sh "$scratch/dist-bin"
PATH="$scratch/dist-bin:$PATH"
export PATH
nix develop .#web -c sh -c 'pnpm --dir web install --frozen-lockfile && pnpm --dir web build'
cargo metadata --locked --all-features --filter-platform "$TARGET" --format-version=1 > "$scratch/cargo-metadata.json"
nix develop .#web -c pnpm --dir web licenses list --json > "$scratch/frontend-licences.json"
source_sha=$(git rev-parse HEAD)
tag=$(python3 -c 'import tomllib; print("v"+tomllib.load(open("Cargo.toml","rb"))["workspace"]["package"]["version"])')
python3 packaging/release/supply.py materials --output release-materials --source-sha "$source_sha" --target "$TARGET" \
    --cargo-metadata "$scratch/cargo-metadata.json" --frontend-licences "$scratch/frontend-licences.json"
python3 -c 'import json,sys; sys.path.insert(0,"packaging/release"); import gate; gate.require(not json.load(open("release-materials/licence-findings.json"))["findings"], "unresolved proof licence findings")'
sh packaging/release/native-archive.sh
dist build --artifacts=global --target="$TARGET" --output-format=json > "$scratch/proof-dist-manifest.json"
python3 packaging/release/homebrew.py prepare target/distrib --tag "$tag" --targets "$TARGET"
python3 packaging/release/homebrew.py freeze-proof target/distrib "$scratch/homebrew-candidate" \
    --tag "$tag" --targets "$TARGET" --source-sha "$source_sha"
``````

<!-- replay-file: {"path":"packaging/release/homebrew.py","mode":"100644","sha256":"50f1c6c1f08e5fff01074015812cd8e10ee56d6bf660c1bb0c9fc2b0b1ed6335","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Add acceptance tests to cargo-dist's formula before freezing; validate final bytes."""
import argparse
from pathlib import Path
import re
import shutil

import gate

TEST_BLOCK = '''  test do
    assert_match version.to_s, shell_output("#{bin}/hennery --version")
    refute_match "hennery-web-ui-not-embedded", File.binread(bin/"hennery")
    assert_path_exists pkgshare/"THIRD-PARTY-NOTICES.txt"
  end
'''


def check(root, tag, targets, require_test=True):
    root = Path(root)
    gate.require(targets and len(set(targets)) == len(targets) and set(targets) <= gate.TARGETS,
                 'unqualified Homebrew targets')
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', tag), 'invalid Homebrew tag')
    path = root / 'hennery.rb'
    gate.require(path.is_file() and not path.is_symlink(), 'nonregular Homebrew formula')
    raw = path.read_bytes()
    try:
        formula = raw.decode('utf-8')
    except UnicodeError as error:
        raise gate.Refused('formula must be UTF-8') from error
    gate.require(formula.startswith('class Hennery < Formula\n') and formula.endswith('\nend\n'), 'unexpected formula structure')
    versions = re.findall(r'^\s*version (.+)$', formula, re.M)
    gate.require(versions == ['"' + tag[1:] + '"'], 'formula version differs from candidate')
    gate.require(not re.search(r'\b(service|post_install)\b', formula), 'formula must not manage services or run post-install hooks')
    pairs = re.findall(r'^\s*url "([^"\n]+)"\n\s*sha256 "([0-9a-f]{64})"$', formula, re.M)
    gate.require(len(pairs) == len(targets) == len(re.findall(r'^\s*url\b', formula, re.M))
                 == len(re.findall(r'^\s*sha256\b', formula, re.M)), 'formula URL/checksum set incomplete or extra')
    expected = {}
    for target in targets:
        name = 'hennery-' + target + '.tar.xz'
        archive = root / name
        gate.require(archive.is_file() and not archive.is_symlink(), 'nonregular Homebrew archive')
        expected[f'https://github.com/{gate.REPOSITORY}/releases/download/{tag}/{name}'] = gate.digest(archive.read_bytes())
    gate.require(len(dict(pairs)) == len(pairs) and dict(pairs) == expected, 'formula URL or digest differs from candidate archives')
    if require_test:
        gate.require(formula.count(TEST_BLOCK) == 1, 'formula must carry the version, UI and notices test')
    return raw


def prepare(root, tag, targets):
    check(root, tag, targets, require_test=False)
    path = Path(root) / 'hennery.rb'
    formula = path.read_text()
    if TEST_BLOCK not in formula:
        path.write_text(formula[:-4] + TEST_BLOCK + 'end\n')
    check(root, tag, targets)


def freeze_proof(source, destination, tag, targets, source_sha):
    """Unsigned native PR fixture; it cannot authorize any publication."""
    gate.require(re.fullmatch('[0-9a-f]{40}', source_sha), 'invalid proof source SHA')
    check(source, tag, targets)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    for name in ['hennery.rb', *['hennery-' + t + '.tar.xz' for t in targets]]:
        shutil.copyfile(Path(source) / name, destination / name)
    import contract
    # This unsigned PR proof has no authority. The placeholder object and run
    # cannot satisfy the authenticated publishing context.
    contract.freeze(destination, {'schema': 2, 'repository': gate.REPOSITORY, 'source_sha': source_sha,
                    'tag': tag, 'tag_object': '0' * 40, 'channels': ['github'], 'targets': sorted(targets),
                    'attesting': {'run_id': 1, 'run_attempt': 1}})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['prepare', 'check', 'freeze-proof'])
    parser.add_argument('candidate', type=Path)
    parser.add_argument('destination', nargs='?', type=Path)
    parser.add_argument('--source-sha')
    parser.add_argument('--tag', required=True)
    parser.add_argument('--targets', required=True)
    args = parser.parse_args()
    try:
        if args.operation == 'freeze-proof':
            if args.destination is None or args.source_sha is None:
                parser.error('freeze-proof needs a fresh destination and --source-sha')
            freeze_proof(args.candidate, args.destination, args.tag, args.targets.split(','), args.source_sha)
        else:
            (prepare if args.operation == 'prepare' else check)(args.candidate, args.tag, args.targets.split(','))
    except (gate.Refused, OSError) as error:
        raise SystemExit(f'Homebrew refused: {error}') from error
``````

<!-- replay-file: {"path":"packaging/release/homebrew_accept.py","mode":"100644","sha256":"6ed9f8ce9c2872b8e05013cbdae17b3d3836f6901ff39145e172297d3b769e54","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Real local-tap install/upgrade/remove in a fresh, pinned Homebrew prefix.

Only the URL origins are rewritten to local files, after original formula and
candidate digests are checked. Install and verify the actual candidate first.
Then seed a separate old formula using the same candidate binary with version
0.0.0: this proves Homebrew's upgrade transaction, not N-1 data migration.
No services, agents or registry credentials are used.
"""
import argparse
import json
import os
from pathlib import Path
import platform
import subprocess

import gate
import contract
import homebrew

BREW_COMMIT = '00001bedf8eac442bdabd327148be0b97998b27b'  # Homebrew 4.6.18
ROOT = Path(__file__).resolve().parents[2]


def recipes():
    result = {}
    for operation in ('install', 'upgrade', 'uninstall'):
        result[operation] = subprocess.check_output(
            ['sh', str(ROOT / 'packaging/readme-blocks.sh'), str(ROOT / 'docs/homebrew.md'), 'homebrew-' + operation], text=True)
    return result


def smoke(binary, expected, tag, source_sha, env, work):
    gate.require(Path(binary).read_bytes() == expected, 'Homebrew changed executable bytes')
    result = subprocess.run([str(binary), '--version'], env=env, cwd=work, check=True, capture_output=True, text=True)
    lines = result.stdout.splitlines()
    gate.require(lines[:1] == ['hennery ' + tag.removeprefix('v')], 'installed Homebrew executable has wrong version')
    gate.require([line for line in lines if line.startswith('source:')] == ['source: ' + source_sha],
                 'installed Homebrew executable has wrong or ambiguous source')
    print(result.stdout, end='')


def check_keg(binary, prefix, version):
    expected = Path(prefix).resolve() / 'Cellar/hennery' / version / 'bin/hennery'
    gate.require(expected.is_file() and not expected.is_symlink() and Path(binary).resolve() == expected,
                 'Homebrew link does not select the expected versioned keg')


def check_removed(prefix):
    installed = Path(prefix) / 'bin/hennery'
    gate.require(not installed.exists() and not installed.is_symlink() and not (Path(prefix) / 'Cellar/hennery').exists(),
                 'uninstall left package files')


def commit_formula(tap, formula, env, work, message):
    path = Path(tap) / 'Formula/hennery.rb'
    path.write_text(formula)
    for args in (['add', 'Formula/hennery.rb'],
                 ['-c', 'user.name=Marcin Wadoń', '-c', 'user.email=marcin.wadon@gmail.com',
                  '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', message, '--', 'Formula/hennery.rb']):
        subprocess.run(['git', '-C', str(tap), *args], env=env, cwd=work, check=True)


def run(candidate, work, brew_source=None):
    candidate, work = Path(candidate).resolve(), Path(work).resolve()
    raw = (candidate / contract.CHECKSUMS).read_bytes()
    inventory = contract.load(candidate)
    original = homebrew.check(candidate, inventory['tag'], inventory['targets']).decode()
    native = {('Darwin', 'arm64'): 'aarch64-apple-darwin', ('Linux', 'x86_64'): 'x86_64-unknown-linux-musl',
              ('Linux', 'aarch64'): 'aarch64-unknown-linux-musl'}.get((platform.system(), platform.machine()))
    gate.require(native in inventory['targets'], 'candidate has no qualified native Homebrew archive')
    work.mkdir(parents=True, exist_ok=False)
    prefix = work / 'prefix'
    env = {k: v for k, v in os.environ.items() if k in ('PATH', 'SSL_CERT_FILE', 'NIX_SSL_CERT_FILE', 'TMPDIR', 'TERM')}
    # Exclude the operator's package manager from every subprocess search path.
    env['PATH'] = ':'.join(p for p in env.get('PATH', '').split(':') if p.startswith('/nix/')) + ':/usr/bin:/bin:/usr/sbin:/sbin'
    for key, directory in {'HOME': 'home', 'XDG_CONFIG_HOME': 'config', 'XDG_DATA_HOME': 'data',
                           'XDG_CACHE_HOME': 'cache', 'HOMEBREW_CACHE': 'brew-cache', 'HOMEBREW_LOGS': 'logs',
                           'HOMEBREW_TEMP': 'tmp'}.items():
        env[key] = str(work / directory); Path(env[key]).mkdir()
    env.update(HOMEBREW_NO_AUTO_UPDATE='1', HOMEBREW_NO_ANALYTICS='1', HOMEBREW_NO_INSTALL_FROM_API='1',
               HOMEBREW_NO_INSTALL_CLEANUP='1', HOMEBREW_NO_ENV_HINTS='1', HOMEBREW_NO_GITHUB_API='1',
               HOMEBREW_NO_BOOTSNAP='1', HOMEBREW_NO_COLOR='1', HOMEBREW_NO_EMOJI='1', CI='1')
    def command(*args, capture=False):
        return subprocess.run(args, env=env, cwd=work, check=True, text=True,
                              stdout=subprocess.PIPE if capture else None).stdout
    source = str(Path(brew_source).resolve()) if brew_source else 'https://github.com/Homebrew/brew.git'
    args = ['git', 'clone', '--no-hardlinks']
    if not brew_source:
        args += ['--depth', '1', '--branch', '4.6.18']
    command(*args, source, str(prefix))
    gate.require(command('git', '-C', str(prefix), 'rev-parse', 'HEAD', capture=True).strip() == BREW_COMMIT,
                 'Homebrew source revision differs from pin')
    brew = str(prefix / 'bin/brew')
    gate.require(Path(command(brew, '--prefix', capture=True).strip()).resolve() == prefix, 'Homebrew escaped scratch prefix')
    gate.require(Path(command(brew, '--repository', capture=True).strip()).resolve() == prefix, 'Homebrew escaped scratch repository')
    env['PATH'] = str(prefix / 'bin') + ':' + env['PATH']
    tap = prefix / 'Library/Taps/marcinwadon/homebrew-tap'
    (tap / 'Formula').mkdir(parents=True)
    command('git', '-C', str(tap), 'init', '-q', '--initial-branch=main')
    command('git', '-C', str(tap), 'remote', 'add', 'origin', str(tap))
    local = original
    for target in inventory['targets']:
        name = 'hennery-' + target + '.tar.xz'
        local = local.replace(f'https://github.com/{gate.REPOSITORY}/releases/download/{inventory["tag"]}/{name}', (candidate / name).as_uri())
    old = local.replace(f'version "{inventory["tag"][1:]}"', 'version "0.0.0"')
    commit_formula(tap, local, env, work, 'test(formula): install frozen candidate')
    sentinels = [work / 'data/hennery/preserve', work / 'home/Library/LaunchAgents/hennery-preserve.plist']
    for path in sentinels:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(b'operator-owned sentinel\n')
    # Extract and compare without executing or unpacking arbitrary extra files.
    import tarfile
    with tarfile.open(candidate / ('hennery-' + native + '.tar.xz')) as archive:
        entries = [m for m in archive.getmembers() if m.isfile() and m.name.endswith('/hennery')]
        gate.require(len(entries) == 1, 'candidate executable ambiguous')
        expected = archive.extractfile(entries[0]).read()
    scripts = recipes()
    print('Install frozen candidate with its exact candidate formula version', flush=True)
    command('sh', '-eu', '-c', scripts['install'])
    installed = prefix / 'bin/hennery'
    check_keg(installed, prefix, inventory['tag'][1:])
    smoke(installed, expected, inventory['tag'], inventory['source_sha'], env, work)
    # Clear the candidate install before seeding the explicitly lower fixture.
    command('sh', '-eu', '-c', scripts['uninstall'])
    check_removed(prefix)
    print('Seed labelled 0.0.0 upgrade fixture using the same candidate payload', flush=True)
    commit_formula(tap, old, env, work, 'test(formula): install old-version upgrade fixture')
    command('sh', '-eu', '-c', scripts['install'])
    check_keg(installed, prefix, '0.0.0')
    smoke(installed, expected, inventory['tag'], inventory['source_sha'], env, work)
    commit_formula(tap, local, env, work, 'test(formula): upgrade to frozen candidate')
    command('sh', '-eu', '-c', scripts['upgrade'])
    check_keg(installed, prefix, inventory['tag'][1:])
    smoke(installed, expected, inventory['tag'], inventory['source_sha'], env, work)
    command('sh', '-eu', '-c', scripts['uninstall'])
    check_removed(prefix)
    gate.require(all(p.read_bytes() == b'operator-owned sentinel\n' for p in sentinels), 'package operation changed user data/service definitions')
    gate.require((candidate / contract.CHECKSUMS).read_bytes() == raw and contract.load(candidate) == inventory,
                 'acceptance changed frozen release')
    homebrew.check(candidate, inventory['tag'], inventory['targets'])
    report = {'brew_commit': BREW_COMMIT, 'native': native, 'checksums_sha256': gate.digest(raw),
              'install': inventory['tag'][1:], 'old_fixture': '0.0.0', 'upgrade': inventory['tag'][1:],
              'source_sha': inventory['source_sha'], 'test': 'version/source/UI/notices',
              'uninstall': True, 'binary_unchanged': True, 'data_and_service_preserved': True}
    (work / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('work', type=Path)
    parser.add_argument('--brew-source', type=Path)
    args = parser.parse_args()
    run(args.candidate, args.work, args.brew_source)
``````

<!-- replay-file: {"path":"packaging/release/homebrew_publish.py","mode":"100644","sha256":"a0824f51e62798a9ac6adebfdc05cd5123c5b494afe411fa4edf95c78a933783","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Protected tap Contents API writer; imports and verification never publish.

No git push, formula regeneration, redirect, overwrite of the same release,
downgrade or automatic retry. Only the maintainer may enable this entry point.
"""
import base64
import hashlib
import os
import re
import urllib.error
import urllib.request

import gate

TAP_PATH = '/repos/marcinwadon/homebrew-tap/contents/Formula/hennery.rb'


def blob_sha(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw, usedforsecurity=False).hexdigest()


def tap_api(method='GET', data=None):
    gate.require(method in ('GET', 'PUT'), 'unsupported tap operation')
    headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    if method == 'PUT':
        token = os.environ.get('HOMEBREW_TAP_TOKEN')
        gate.require(token, 'protected tap credential absent')
        headers['Authorization'] = 'Bearer ' + token
        headers['Content-Type'] = 'application/json'
    # Public reads do not need the tap credential. Only this one fixed path
    # can receive it; the main-repository GH_TOKEN remains read-only.
    url = 'https://api.github.com' + TAP_PATH + ('?ref=main' if method == 'GET' else '')
    request = urllib.request.Request(url, method=method, data=gate.canonical(data) if data is not None else None, headers=headers)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
            return gate.strict_json(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == 'GET':
            return None
        raise gate.Refused(f'tap HTTP {error.code}; reconcile manually before retry') from error
    except urllib.error.URLError as error:
        raise gate.Refused('ambiguous tap response; reconcile manually before retry') from error


def remote_bytes(remote):
    gate.require(isinstance(remote, dict) and remote.get('type') == 'file' and remote.get('path') == 'Formula/hennery.rb'
                 and remote.get('encoding') == 'base64', 'unexpected tap formula object')
    try:
        raw = base64.b64decode(''.join(remote['content'].splitlines()), validate=True)
    except (KeyError, TypeError, ValueError) as error:
        raise gate.Refused('invalid tap formula encoding') from error
    gate.require(remote.get('sha') == blob_sha(raw), 'tap formula blob digest differs')
    return raw


def version(raw):
    versions = re.findall(rb'^\s*version "([0-9]+)\.([0-9]+)\.([0-9]+)"$', raw, re.M)
    gate.require(len(versions) == 1, 'tap formula must have one stable version')
    return tuple(int(n) for n in versions[0])
``````

<!-- replay-file: {"path":"packaging/release/installer_fixtures.py","mode":"100644","sha256":"bbd9618704acb73d43fb82eba84d04676599e1b7c33f514b0e12bbfe2242bd96","encoding":"utf8"} -->
``````python
"""Offline consumer fixtures: genuine disposable OpenPGP tags, mocked provenance."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import sys
import tempfile

FINGERPRINT = 'F26C7F594DFE84D131703AFC23E5A318AE8D2861'
ROOT = Path(__file__).resolve().parents[2]


def checked_fixture(command, **kwargs):
    """Keep setup failures diagnosable without dumping the environment."""
    try:
        return subprocess.run(command, check=True, capture_output=True, text=True, **kwargs)
    except subprocess.CalledProcessError as error:
        raise AssertionError('fixture command failed (exit ' + str(error.returncode) + '): '
                             + shlex.join(command) + '\n' + (error.stderr or '(no stderr)')) from None


class ConsumerFixtures:
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='release-consumer-')
        cls.root = Path(cls.temp.name)
        cls.keyring = cls.root / 'signing'; cls.keyring.mkdir(mode=0o700)
        cls.environment = {key: os.environ[key] for key in
                           ('PATH', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NIX_SSL_CERT_FILE') if key in os.environ}
        for key, directory in [('HOME', 'home'), ('XDG_CONFIG_HOME', 'config'),
                               ('XDG_CACHE_HOME', 'cache'), ('XDG_DATA_HOME', 'data')]:
            path = cls.root / directory; path.mkdir(mode=0o700)
            cls.environment[key] = str(path)
        cls.environment.update(GNUPGHOME=str(cls.keyring), TMPDIR=str(cls.root),
                               GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL='/dev/null',
                               GIT_CONFIG_SYSTEM='/dev/null', LC_ALL='C.UTF-8')
        cls.keys, cls.primary = [], []
        for name in ('approved', 'another'):
            cls.gpg('--quick-generate-key', 'Disposable consumer ' + name, 'ed25519', 'cert', '1d')
            listing = cls.gpg('--with-colons', '--list-keys', 'Disposable consumer ' + name).stdout
            primary = next(line.split(':')[9] for line in listing.splitlines() if line.startswith('fpr:'))
            cls.primary.append(primary)
            cls.gpg('--quick-add-key', primary, 'ed25519', 'sign', '1d')
            listing = cls.gpg('--with-colons', '--with-subkey-fingerprint', '--list-keys', primary).stdout
            cls.keys.append([line.split(':')[9] for line in listing.splitlines() if line.startswith('fpr:')][-1])
        cls.public = cls.gpg('--armor', '--export', cls.primary[0]).stdout
        cls.other_public = cls.gpg('--armor', '--export', cls.primary[1]).stdout

    @classmethod
    def tearDownClass(cls):
        checked_fixture(['gpgconf', '--kill', 'gpg-agent'], env=cls.environment)
        cls.temp.cleanup()

    @classmethod
    def gpg(cls, *arguments):
        return checked_fixture(['gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase', '', *arguments], env=cls.environment)

    def fixture(self, case, script, *, hash_tool='sha256sum', conditional=False, installer=False):
        root = Path(tempfile.mkdtemp(prefix='case-', dir=self.root))
        release = root / 'release'; release.mkdir()
        source = root / 'source'
        def git(*args, **kwargs):
            return checked_fixture(['git', '-c', 'user.name=Disposable fixture',
                                    '-c', 'user.email=fixture@example.invalid', *args],
                                   env=self.environment, **kwargs)
        git('init', '--template=', str(source))
        git('-C', str(source), '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'fixture')
        sha = git('-C', str(source), 'rev-parse', 'HEAD').stdout.strip()
        tag = 'v0.1.0-alpha.1'
        if case == 'lightweight-tag':
            git('-C', str(source), '-c', 'tag.gpgsign=false', 'tag', tag)
        elif case == 'unsigned-tag':
            git('-C', str(source), '-c', 'tag.gpgsign=false', 'tag', '-a', tag, '-m', 'unsigned')
        else:
            actual_tag = 'v9.9.9' if case == 'wrong-release-tag' else tag
            key = self.keys[1 if case == 'wrong-key-signature' else 0]
            git('-C', str(source), '-c', 'gpg.program=gpg', 'tag', '-s', '-u', key+'!', actual_tag, '-m', 'signed fixture')
            if actual_tag != tag:
                git('-C', str(source), 'update-ref', 'refs/tags/'+tag, git('-C', str(source), 'rev-parse', actual_tag).stdout.strip())
        object_sha = git('-C', str(source), 'rev-parse', tag).stdout.strip()
        if case == 'malformed-signature':
            raw = git('-C', str(source), 'cat-file', 'tag', object_sha).stdout.replace('signed fixture', 'changed fixture')
            result = git('-C', str(source), 'hash-object', '-t', 'tag', '-w', '--stdin', input=raw)
            object_sha = result.stdout.strip()
            git('-C', str(source), 'update-ref', 'refs/tags/'+tag, object_sha)
        metadata = {'schema': 2, 'repository': 'marcinwadon/hennery', 'tag': tag, 'source_sha': sha, 'tag_object': object_sha, 'attesting': {'run_id': 10, 'run_attempt': 1}}
        if case == 'wrong-metadata-source': metadata['source_sha'] = '0'*40
        if case == 'wrong-metadata-tag': metadata['tag'] = 'v9.9.9'
        if case == 'wrong-metadata-object': metadata['tag_object'] = '0'*40
        if case == 'wrong-metadata-repository': metadata['repository'] = 'another/repository'
        if case == 'wrong-metadata-schema': metadata['schema'] = 1
        if case == 'invalid-run': metadata['attesting']['run_id'] = 0
        payload_name = 'hennery-test.tar.xz' if installer else 'hennery-installer.sh'
        payload = b'archive fixture' if installer else b'#!/bin/sh\nprintf executed > "$INSTALL_MARKER"\n'
        (release / payload_name).write_bytes(payload)
        (release / 'release-metadata.json').write_text(json.dumps(metadata))
        checksums = ''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(release.iterdir()))
        if case == 'duplicate-checksum': checksums += checksums.splitlines()[0]+'\n'
        if case == 'malformed-checksum': checksums = checksums.replace('  ', ' ', 1)
        if case == 'missing-payload-checksum': checksums = ''.join(line+'\n' for line in checksums.splitlines() if not line.endswith(payload_name))
        if case == 'wrong-payload-checksum': checksums = checksums.replace(hashlib.sha256(payload).hexdigest(), '0'*64)
        if case == 'unsafe-checksum': checksums += '0'*64+'  ../escape\n'
        if case == 'cyclic-checksum': checksums += '0'*64+'  SHA256SUMS\n'
        if case == 'no-final-newline': checksums = checksums.rstrip('\n')
        (release / 'SHA256SUMS').write_text(checksums)
        (release / 'release.sigstore.jsonl').write_text('offline provenance fixture\n')
        attested = root/'attested'; shutil.copytree(release, attested)
        if case == 'tampered-installer': (release/payload_name).write_bytes(payload+b'tampered')
        if case == 'tampered-checksums': (release/'SHA256SUMS').write_text(checksums+' ')
        if case == 'tampered-metadata': (release/'release-metadata.json').write_text('{}')
        if case == 'missing-bundle': (release/'release.sigstore.jsonl').unlink()
        if case == 'missing-checksums': (release/'SHA256SUMS').unlink()
        if case == 'missing-metadata': (release/'release-metadata.json').unlink()
        (release/'github.asc').write_text(self.other_public if case == 'wrong-github-key' else self.public+self.other_public)
        (release/'keyserver.asc').write_text(self.other_public if case == 'wrong-keyserver-key' else self.public)
        (release/'main-readme').write_text('Fingerprint: '+('0'*40 if case == 'wrong-main-pin' else self.keys[0])+'\n')
        tools = root/'tools'; tools.mkdir()
        real_git = shutil.which('git')
        (tools/'git').write_text('#!'+sys.executable+'\n'+f'''import os,sys,subprocess
args=sys.argv[1:]
url='https://github.com/marcinwadon/hennery.git'
if 'fetch' in args:
    assert args[-2:]==[url,'refs/tags/v0.1.0-alpha.1']
    args[args.index(url)]=os.environ['FIXTURE_SOURCE']
if 'verify-tag' in args and os.environ['FIXTURE_CASE'] in ('expired-status','revoked-status','duplicate-status','empty-status','failed-valid-status'):
    result=subprocess.run([{real_git!r},*args],capture_output=True)
    assert result.returncode==0
    case=os.environ['FIXTURE_CASE']
    status=result.stderr
    if case=='expired-status': status+=b'[GNUPG:] KEYEXPIRED 123\\n'
    if case=='revoked-status': status+=b'[GNUPG:] REVKEYSIG bad\\n'
    if case=='duplicate-status': status+=status
    if case=='empty-status': status=b''
    sys.stderr.buffer.write(status)
    sys.exit(1 if case=='failed-valid-status' else 0)
os.execv({real_git!r},[{real_git!r},*args])
''')
        (tools/'curl').write_text('#!'+sys.executable+'\n'+'''import os,sys
from pathlib import Path
args=sys.argv[1:]
assert args[args.index('--proto')+1]=='=https'
assert args[args.index('--proto-redir')+1]=='=https'
url=next(arg for arg in args if arg.startswith('https://'))
base='https://github.com/marcinwadon/hennery/releases/download/v0.1.0-alpha.1/'
names={'https://raw.githubusercontent.com/marcinwadon/hennery/refs/heads/main/README.md':'main-readme',
       'https://github.com/marcinwadon.gpg':'github.asc',
       'https://keys.openpgp.org/vks/v1/by-fingerprint/'+os.environ['FIXTURE_FINGERPRINT']:'keyserver.asc'}
names.update({base+name:name for name in ['SHA256SUMS','release-metadata.json','release.sigstore.jsonl','hennery-installer.sh']})
if url not in names: sys.exit(99)
path=Path(os.environ['FIXTURE_RELEASE'])/names[url]
if not path.is_file(): sys.exit(22)
Path(args[args.index('-o')+1]).write_bytes(path.read_bytes())
''')
        (tools/'gh').write_text('#!'+sys.executable+'\n'+'''import json,os,sys
from pathlib import Path
a=sys.argv[1:]; assert a[:2]==['attestation','verify']
assert '--signer-workflow' not in a
for flag,expected in {'--repo':'marcinwadon/hennery','--source-ref':'refs/tags/v0.1.0-alpha.1','--source-digest':os.environ['FIXTURE_SHA'],'--signer-digest':os.environ['FIXTURE_SHA'],'--cert-identity':'https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0-alpha.1','--format':'json','--cert-oidc-issuer':'https://token.actions.githubusercontent.com','--predicate-type':'https://slsa.dev/provenance/v1'}.items():
    assert a.count(flag)==1 and a[a.index(flag)+1]==expected
assert '--deny-self-hosted-runners' in a
subject=Path(a[2]); bundle=Path(a[a.index('--bundle')+1]); assert bundle.read_text()=='offline provenance fixture\\n'
assert subject.read_bytes()==(Path(os.environ['FIXTURE_ATTESTED'])/subject.name).read_bytes()
case=os.environ['FIXTURE_CASE']
if case=='branch-signer': sys.exit(1)
run='https://github.com/marcinwadon/hennery/actions/runs/10/attempts/1'
if case=='wrong-run': run=run.replace('/10/','/11/')
if case=='invalid-run': run=run.replace('/10/','/0/')
if case=='wrong-attempt': run=run[:-1]+'2'
if case=='wrong-run-repository': run=run.replace('marcinwadon/hennery','other/repo')
certificate={'runInvocationURI':run}
if case=='missing-run': certificate={}
if case=='predicate-only-run': certificate={}
if case=='nested-run': certificate={'extensions':certificate}
result=[{'verificationResult':{'signature':{'certificate':certificate},'statement':{'predicate':{'runInvocationURI':run}}}}]
if case=='empty-results': result=[]
if case=='extra-unbound-result': result.append({'verificationResult':{'signature':{'certificate':{}}}})
print(json.dumps(result))
if case=='failed-attestation-status': sys.exit(1)
''')
        for tool in tools.iterdir(): tool.chmod(0o755)
        for name in ('gpg','cat','tail','env','awk','grep','jq','mktemp','mkdir','chmod','sh',hash_tool):
            executable=shutil.which(name); self.assertIsNotNone(executable,name)
            (tools/name).symlink_to(executable)
        missing = {'missing-gh':'gh','missing-git':'git','missing-gpg':'gpg','missing-jq':'jq','missing-hash':hash_tool}
        if case in missing: (tools/missing[case]).unlink()
        if case == 'failed-hash-status':
            executable=shutil.which(hash_tool)
            (tools/hash_tool).unlink()
            (tools/hash_tool).write_text('#!'+sys.executable+'\n'+f'import subprocess,sys\nsubprocess.run([{executable!r},*sys.argv[1:]],check=True)\nsys.exit(1)\n')
            (tools/hash_tool).chmod(0o755)
        pin='release_fingerprint='+FINGERPRINT
        self.assertEqual(script.count(pin),1)
        script=script.replace(pin,'release_fingerprint='+self.keys[0])
        if installer:
            import importlib.util
            spec=importlib.util.spec_from_file_location('hardener_fixture',ROOT/'packaging/harden-installer.py')
            hardener=importlib.util.module_from_spec(spec);spec.loader.exec_module(hardener)
            script=script.replace(hardener.MAINTAINER_KEY,self.public)
        if conditional: script='if '+script+'then exit 0; else exit 1; fi\n'
        path=root/'check.sh';path.write_text(script)
        home=root/'home';home.mkdir()
        marker=root/'executed'
        env=dict(self.environment, PATH=str(tools),HOME=str(home),GNUPGHOME=str(home/'unused'),TMPDIR=str(self.root),INSTALL_MARKER=str(marker),FIXTURE_RELEASE=str(release),FIXTURE_FINGERPRINT=self.keys[0],FIXTURE_SOURCE=str(source),FIXTURE_SHA=sha,FIXTURE_ATTESTED=str(attested),FIXTURE_CASE=case,TEST_ROOT=str(root),HENNERY_RELEASE_CHECKSUMS=str(release/'SHA256SUMS'),HENNERY_RELEASE_METADATA=str(release/'release-metadata.json'),HENNERY_ATTESTATION_BUNDLE=str(release/'release.sigstore.jsonl'))
        (root/'install-work').mkdir()
        result=subprocess.run([str(tools/'sh'),str(path)],env=env,cwd=root,capture_output=True,text=True)
        return result,marker


REFUSALS = ('unsigned-tag','lightweight-tag','malformed-signature','wrong-key-signature','wrong-release-tag',
            'tampered-installer','tampered-checksums','tampered-metadata','missing-bundle','missing-checksums','missing-metadata',
            'wrong-metadata-source','wrong-metadata-tag','wrong-metadata-object','wrong-metadata-repository','wrong-metadata-schema',
            'invalid-run','duplicate-checksum','malformed-checksum','missing-payload-checksum','wrong-payload-checksum',
            'unsafe-checksum','cyclic-checksum','branch-signer','wrong-run','wrong-attempt','wrong-run-repository',
            'missing-run','predicate-only-run','nested-run','empty-results','extra-unbound-result',
            'expired-status','revoked-status','duplicate-status','empty-status','failed-valid-status',
            'failed-attestation-status','failed-hash-status','missing-gh','missing-git','missing-gpg','missing-jq','missing-hash','no-final-newline')
``````

<!-- replay-file: {"path":"packaging/release/post_setup.py","mode":"100644","sha256":"4ecda674bc4566c91d6b11b66dff9d92f15158e4251d78c4ea30d2833860f2e6","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Maintainer-only post-setup negative push acceptance; NEVER run by unit tests.

Run in an explicitly authorized disposable branch job with packages:write,
GITHUB_TOKEN, no environment and no dedicated publishing credential. If setup
is wrong this can create a canary index: stop and repair access before release.
"""
import argparse
import base64
import os
import re
import urllib.error
import urllib.request

import gate


def assert_ghcr_denied(transport, expected_digest):
    status, data = transport('read')
    gate.require(status == 200 and gate.digest(data) == expected_digest, 'negative push check needs working verified read access')
    status, _ = transport('push')
    gate.require(status == 403, 'GITHUB_TOKEN push was not authoritatively refused; stop publication and repair package access')
    return {'read_status': 200, 'push_status': 403, 'credential': 'GITHUB_TOKEN'}


def require_no_release_credentials(environment):
    gate.require(not any(environment.get(name) for name in
                 ('GHCR_PUBLISH_TOKEN', 'RELEASE_HOMEBREW_TOKEN', 'RELEASE_CRATES_BOOTSTRAP_TOKEN', 'CARGO_REGISTRY_TOKEN')),
                 'negative acceptance must never receive dedicated release credentials')


def request(url, headers, method='GET', data=None):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url, headers=headers, method=method, data=data), timeout=30) as response:
            return response.status, response.read(1024*1024)
    except urllib.error.HTTPError as error:
        return error.code, error.read(1024*1024)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-digest', required=True, help='SHA256 of a known existing package manifest/index, without prefix')
    args = parser.parse_args()
    gate.require(re.fullmatch('[0-9a-f]{64}', args.expected_digest), 'invalid known image digest')
    gate.require(os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('GITHUB_REPOSITORY') == gate.REPOSITORY and os.environ.get('GITHUB_REF', '').startswith('refs/heads/'), 'acceptance must use a branch Actions job')
    require_no_release_credentials(os.environ)
    basic = base64.b64encode((os.environ['GITHUB_ACTOR']+':'+os.environ['GITHUB_TOKEN']).encode()).decode()
    token_url = 'https://ghcr.io/token?service=ghcr.io&scope=repository:marcinwadon/hennery:'
    status, data = request(token_url+'pull', {'Authorization':'Basic '+basic})
    gate.require(status == 200, 'read authentication failed; not a valid negative push test')
    read_token = gate.strict_json(data)['token']
    def transport(operation):
        if operation == 'read':
            return request('https://ghcr.io/v2/marcinwadon/hennery/manifests/sha256:'+args.expected_digest, {'Authorization':'Bearer '+read_token,'Accept':'application/vnd.oci.image.index.v1+json,application/vnd.oci.image.manifest.v1+json'})
        status, data = request(token_url+'pull,push', {'Authorization':'Basic '+basic})
        if status != 200:
            return status, data
        push_token = gate.strict_json(data)['token']
        canary = 'release-negative-' + str(int(os.environ['GITHUB_RUN_ID'])) + '-' + str(int(os.environ['GITHUB_RUN_ATTEMPT']))
        return request('https://ghcr.io/v2/marcinwadon/hennery/manifests/'+canary, {'Authorization':'Bearer '+push_token,'Content-Type':'application/vnd.oci.image.index.v1+json'}, 'PUT', gate.canonical({'schemaVersion':2,'mediaType':'application/vnd.oci.image.index.v1+json','manifests':[]}))
    print(gate.canonical(assert_ghcr_denied(transport,args.expected_digest)).decode())


if __name__ == '__main__':
    main()
``````

<!-- replay-file: {"path":"packaging/release/publication.py","mode":"100644","sha256":"8372b51b79bea58a76c8c694911681a42337169c80df6c6f0dbbd9b64a99920b","encoding":"utf8"} -->
``````python
"""Draft creation through immutable publication; transport is separately doubled."""
from pathlib import Path
import urllib.parse

import contract
import gate
import publish as transport


def release(root, signatures, authorize):
    root, signatures = Path(root), Path(signatures)
    metadata = authorize()
    files = {p.name: p for p in root.iterdir()}
    sidecars = {p.name: p for p in signatures.iterdir()}
    expected_sidecars = {contract.BUNDLE}
    if 'ghcr' in metadata['channels']:
        expected_sidecars |= {'ghcr-index-provenance.json'}
        expected_sidecars |= {f'ghcr-{arch}-{kind}.json' for arch in ('amd64', 'arm64')
                             for kind in ('provenance', 'image-sbom', 'binary-sbom')}
    gate.require(set(sidecars) == expected_sidecars, 'unexpected/missing attestation sidecars')
    files.update(sidecars)
    expected = {name: gate.digest(contract.regular(path)) for name, path in files.items()}
    tag_path = f'/repos/{gate.REPOSITORY}/releases/tags/' + urllib.parse.quote(metadata['tag'], safe='')
    remote = transport.api(tag_path)

    def reconcile(release):
        if release is None:
            return {'complete': [], 'missing': sorted(expected)}
        gate.require(release.get('tag_name') == metadata['tag'], 'remote release tag differs')
        gate.require(release.get('draft') is True or (release.get('draft') is False and release.get('immutable') is True),
                     'published release must be immutable')
        return transport.plan(expected, transport.release_assets(release))

    state = reconcile(remote)
    gate.require(remote is None or remote.get('draft') is True or not state['missing'],
                 'immutable release is incomplete; use a new signed version')

    def boundary():
        gate.require(authorize() == metadata, 'release authorization changed at write boundary')
        gate.require({name: gate.digest(contract.regular(path)) for name, path in files.items()} == expected,
                     'release or bundle bytes changed at write boundary')

    if remote is None:
        boundary()
        remote = transport.api(f'/repos/{gate.REPOSITORY}/releases', method='POST', data=gate.canonical({
            'tag_name': metadata['tag'], 'target_commitish': metadata['source_sha'], 'name': metadata['tag'],
            'draft': True, 'prerelease': '-' in metadata['tag'], 'make_latest': 'false',
            'body': 'Source: https://github.com/' + gate.REPOSITORY + '/tree/' + metadata['source_sha']
                    + '\nSHA256SUMS: ' + expected[contract.CHECKSUMS]}))
        gate.require(isinstance(remote, dict) and remote.get('draft') is True and type(remote.get('id')) is int,
                     'draft creation was not acknowledged; stop and reconcile')
    for name in state['missing']:
        boundary()
        transport.api(f'/repos/{gate.REPOSITORY}/releases/{remote["id"]}/assets?name=' + urllib.parse.quote(name, safe=''),
                      method='POST', data=contract.regular(files[name]), content_type='application/octet-stream')
        gate.require(name in reconcile(remote)['complete'], 'uploaded bytes failed read-back verification')
    gate.require(not reconcile(remote)['missing'], 'release asset set incomplete')
    # A second full cryptographic verification authenticates the read-back bytes:
    # plan() requires byte equality, and authorize() rechecks those exact inputs.
    boundary()
    if remote.get('draft') is True:
        remote = transport.api(f'/repos/{gate.REPOSITORY}/releases/{remote["id"]}', method='PATCH',
                               data=gate.canonical({'draft': False, 'make_latest': 'false'}))
    gate.require(isinstance(remote, dict) and remote.get('draft') is False and remote.get('immutable') is True,
                 'publication did not establish immutability')
    published = transport.api(tag_path)
    gate.require(isinstance(published, dict) and published.get('draft') is False and published.get('immutable') is True,
                 'final public read-back did not confirm immutability')
    gate.require(not reconcile(published)['missing'], 'public immutable release is incomplete')
    return {'state': 'immutable', 'tag': metadata['tag'], 'checksums_sha256': expected[contract.CHECKSUMS]}
``````

<!-- replay-file: {"path":"packaging/release/publish.py","mode":"100644","sha256":"01148863edafd3a1edd4158530c9eff76a08b610e0c87ec8fa5c9cc9bf73f3ae","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""GitHub channel reconciliation/upload. Never overwrites or rebuilds payloads.

Only called by the protected manual workflow after live validation. This module
has no side effects on import; offline tests replace the transport entirely.
"""
import os
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
``````

<!-- replay-file: {"path":"packaging/release/registry_bundles.py","mode":"100644","sha256":"6d40fcb91d8add5161552e39042e8e3bebd78d22b784b8faa4116afe362ab787","encoding":"utf8"} -->
``````python
"""Reconcile deterministic Sigstore OCI referrers, then return fetched bundle bytes.

No keyless verification occurs here. The caller verifies returned bundle paths
against its local frozen OCI manifests before considering publication complete.
"""
from pathlib import Path
import re
import subprocess
import tempfile

import contract
import gate

BUNDLE = 'application/vnd.dev.sigstore.bundle.v0.3+json'
MANIFEST = 'application/vnd.oci.image.manifest.v1+json'
INDEX = 'application/vnd.oci.image.index.v1+json'
EMPTY = 'application/vnd.oci.empty.v1+json'
CREATED = '1970-01-01T00:00:00Z'
PROVENANCE = 'https://slsa.dev/provenance/v1'
SPDX = 'https://spdx.dev/Document'
REPOSITORY = 'ghcr.io/marcinwadon/hennery'
DIGEST = r'sha256:[0-9a-f]{64}'
MAX_BYTES = 16*1024*1024
# Use only the caller's private tool configuration and explicitly provided
# transport settings. Never inherit job tokens or OIDC authority into ORAS.
ENVIRONMENT = {'PATH','HOME','TMPDIR','TMP','TEMP','SYSTEMROOT','LANG','LC_ALL',
               'SSL_CERT_FILE','SSL_CERT_DIR','NIX_SSL_CERT_FILE','XDG_CONFIG_HOME',
               'DOCKER_CONFIG','GH_CONFIG_DIR','GNUPGHOME','GIT_CONFIG_GLOBAL',
               'GIT_CONFIG_SYSTEM','GIT_TERMINAL_PROMPT','HTTP_PROXY','HTTPS_PROXY',
               'ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'}


def descriptor(raw, media):
    return {'mediaType':media,'digest':'sha256:'+gate.digest(raw),'size':len(raw)}


def json_bytes(raw):
    try:
        # Decode explicitly: json.loads(bytes) accepts a BOM whereas the string
        # decoder rejects it. No encoding-dependent verdict is permitted.
        return gate.strict_json(raw.decode('utf-8'))
    except UnicodeError as error:
        raise gate.Refused('invalid OCI JSON encoding') from error


def valid_descriptor(expected):
    gate.require(isinstance(expected,dict) and isinstance(expected.get('digest'),str)
                 and re.fullmatch(DIGEST,expected['digest']) and type(expected.get('size')) is int
                 and 0 < expected['size'] <= MAX_BYTES,'invalid OCI referrer descriptor')


def checked(raw, expected):
    valid_descriptor(expected)
    gate.require(len(raw)==expected['size'] and 'sha256:'+gate.digest(raw)==expected['digest'],
                 'fetched OCI manifest/blob digest or size differs')
    return raw


def inputs(subjects):
    subjects=list(subjects)
    expected={('index','provenance')} | {(arch,kind) for arch in ('amd64','arm64')
               for kind in ('provenance','image-sbom','binary-sbom')}
    gate.require(len(subjects)==7 and all(isinstance(item,(list,tuple)) and len(item)==5
                 and all(isinstance(part,str) for part in item[:4]) for item in subjects),
                 'exactly seven frozen OCI bundle subjects required')
    gate.require({(item[0],item[1]) for item in subjects}==expected,'duplicate or unknown OCI bundle selection')
    digests={}
    rows=[]
    for subject,kind,digest,predicate,path in subjects:
        gate.require(isinstance(digest,str) and re.fullmatch(DIGEST,digest)
                     and predicate==(PROVENANCE if kind=='provenance' else SPDX),'invalid OCI bundle digest/predicate')
        gate.require(subject not in digests or digests[subject]==digest,'platform bundle subjects disagree')
        digests[subject]=digest
        path=Path(path)
        gate.require(path.name==f'ghcr-{subject}-{kind}.json','unexpected frozen OCI bundle filename')
        raw=contract.regular(path)
        gate.require(0 < len(raw) <= MAX_BYTES,'frozen OCI bundle size outside permitted limit')
        rows.append((subject,kind,digest,predicate,path,raw))
    gate.require(len(set(digests.values()))==3,'index/platform digests must be distinct')
    return rows


def frozen(rows):
    gate.require(all(contract.regular(row[4])==row[5] for row in rows),'frozen OCI bundle changed during reconciliation')


def pinned_manifest(subject, predicate, path, raw):
    config=descriptor(b'{}',EMPTY) | {'data':'e30='}
    layer=descriptor(raw,BUNDLE) | {'annotations':{'org.opencontainers.image.title':path.name}}
    return gate.canonical({'schemaVersion':2,'mediaType':MANIFEST,'artifactType':BUNDLE,
                           'config':config,'layers':[layer],'subject':subject,
                           'annotations':{'org.opencontainers.image.created':CREATED,
                                          'dev.sigstore.bundle.predicateType':predicate,
                                          'dev.sigstore.bundle.content':'dsse-envelope'}})


def reconcile(subjects, output_directory, before_write, *, environment, auth=None, layout=None):
    """Verify existing seven referrers, copy only missing, return fetched tuples.

    before_write is required and authorizes each content-addressed ORAS copy.
    ORAS transfers only absent graph objects. An ambiguous copy never implies
    success; a renewed invocation must rediscover and verify the stored bytes.
    layout selects disposable offline transport; production origin is fixed.
    """
    rows=inputs(subjects)
    gate.require(callable(before_write),'OCI bundle writer requires a live verification callback')
    env={key:value for key,value in environment.items() if key in ENVIRONMENT}
    gate.require(env.get('HOME') and env.get('DOCKER_CONFIG'),'private OCI tool environment required')
    if layout is None:
        gate.require(auth is not None,'dedicated registry auth file required')
        auth=Path(auth);contract.regular(auth);auth=auth.resolve()
        target=REPOSITORY;options=['--registry-config',str(auth)]
        copy_options=['--to-registry-config',str(auth)]
    else:
        gate.require(auth is None,'offline OCI layout must not receive registry credentials')
        layout=Path(layout)
        gate.require(layout.is_dir() and not layout.is_symlink(),'nonregular OCI layout')
        target=str(layout.resolve());options=['--oci-layout'];copy_options=['--to-oci-layout']

    def run(arguments):
        try:
            return subprocess.run(['oras',*arguments],check=True,capture_output=True,env=env).stdout
        except subprocess.CalledProcessError as error:
            # Never log credentials/config contents or attempt alternate auth.
            raise gate.Refused('OCI referrer transport failed; reconcile under renewed approval') from error

    def fetch(kind,digest):
        return run([kind,'fetch',*options,*(['--output','-'] if kind=='blob' else []),target+'@'+digest])

    # Pin subject descriptors to actual bytes at each independently expected
    # digest, not untrusted discover annotations or mutable version tags.
    subject_bytes={};subject_descriptors={}
    for row in rows:
        digest=row[2]
        if digest in subject_bytes:continue
        raw=fetch('manifest',digest)
        value=json_bytes(raw)
        gate.require(isinstance(value,dict) and value.get('schemaVersion')==2 and value.get('mediaType') in (MANIFEST,INDEX),
                     'unexpected OCI subject manifest type')
        actual=descriptor(raw,value['mediaType'])
        gate.require(actual['digest']==digest,'fetched OCI subject digest differs')
        subject_bytes[digest]=raw;subject_descriptors[digest]=actual

    records={}
    for row in rows:
        manifest=pinned_manifest(subject_descriptors[row[2]],row[3],row[4],row[5])
        ref=descriptor(manifest,MANIFEST)
        records[ref['digest']]={'row':row,'manifest':manifest,'descriptor':ref}

    def scan(digest):
        result=json_bytes(run(['discover',*options,'--artifact-type',BUNDLE,'--depth','1','--format','json',target+'@'+digest]))
        gate.require(isinstance(result,dict) and isinstance(result.get('referrers'),list),'invalid OCI referrer discovery')
        present={}
        for desc in result['referrers']:
            gate.require(isinstance(desc,dict) and desc.get('artifactType')==BUNDLE
                         and desc.get('mediaType')==MANIFEST,'unexpected OCI referrer type')
            valid_descriptor(desc)
            raw=checked(fetch('manifest',desc['digest']),desc)
            # Strict decoding rejects duplicate/escaped/case-ambiguous keys even
            # when a downstream JSON parser might interpret them differently.
            value=json_bytes(raw)
            record=records.get(desc['digest'])
            gate.require(record is not None and raw==record['manifest']
                         and value.get('subject')==subject_descriptors[digest],
                         'existing OCI referrer differs from its frozen manifest')
            gate.require(desc['digest'] not in present,'duplicate OCI referrer digest')
            config=value['config'];checked(fetch('blob',config['digest']),config)
            layer=value['layers'][0];bundle=checked(fetch('blob',layer['digest']),layer)
            gate.require(bundle==record['row'][5],'fetched OCI bundle differs from frozen bytes')
            present[desc['digest']]=bundle
        return present

    present={}
    for digest in subject_bytes:present.update(scan(digest))
    with tempfile.TemporaryDirectory(prefix='release-referrer-layout-') as temporary:
        stage=Path(temporary);blobs=stage/'blobs/sha256';blobs.mkdir(parents=True)
        (stage/'oci-layout').write_bytes(gate.canonical({'imageLayoutVersion':'1.0.0'}))
        (stage/'index.json').write_bytes(gate.canonical({'schemaVersion':2,'manifests':[
            record['descriptor'] | {'artifactType':BUNDLE} for record in records.values()]}))
        def store(raw):
            (blobs/gate.digest(raw)).write_bytes(raw)
        store(b'{}')
        for raw in subject_bytes.values():store(raw)
        for record in records.values():store(record['manifest']);store(record['row'][5])
        for digest,record in records.items():
            if digest in present:continue
            before_write()
            frozen(rows)
            # A gate may outlast another successful attachment. Reconcile again
            # after approval to avoid duplicating matching completed work.
            present.update(scan(record['row'][2]))
            if digest in present:continue
            run(['copy','--from-oci-layout',*copy_options,'--concurrency','1',
                 str(stage)+'@'+digest,target+'@'+digest])
            present.update(scan(record['row'][2]))
            gate.require(digest in present,'new OCI referrer missing from read-back discovery')

    fetched={}
    for digest in subject_bytes:fetched.update(scan(digest))
    gate.require(set(fetched)==set(records),'OCI referrer set incomplete after reconciliation')
    frozen(rows)
    output=Path(output_directory)
    gate.require(not output.is_symlink() and (not output.exists() or output.is_dir()),'nonregular fetched bundle output')
    output.mkdir(parents=True,exist_ok=True)
    paths={}
    for digest,record in records.items():
        path=output/record['row'][4].name
        if path.exists() or path.is_symlink():
            gate.require(contract.regular(path)==fetched[digest],'fetched bundle output changed')
        else:
            with path.open('xb') as destination:destination.write(fetched[digest])
        paths[record['row'][4].name]=path
    return [tuple(row[:4])+(paths[row[4].name],) for row in rows]
``````

<!-- replay-file: {"path":"packaging/release/release_run.py","mode":"100644","sha256":"43c63033b595374932b27d00ff28a08ef05ac311960d63382bf832d00c8d1bf0","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Single tagged-run orchestration. No operation publishes without live gates."""
import argparse
from datetime import datetime, timezone
import importlib.util
import os
from pathlib import Path
import subprocess
import sys

import contract
import gate
import publication
import publish
import run_policy
import supply
import tag_signature
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def configuration():
    gate.require(os.environ.get('GITHUB_REPOSITORY')==gate.REPOSITORY and os.environ.get('GITHUB_EVENT_NAME')=='push'
                 and os.environ.get('GITHUB_REF')=='refs/tags/'+os.environ.get('GITHUB_REF_NAME','')
                 and os.environ.get('GITHUB_RUN_ATTEMPT')=='1', 'build/attest may run only on the original signed-tag attempt')
    tag=os.environ['GITHUB_REF_NAME'];source=os.environ['GITHUB_SHA']
    proof=tag_signature.verify(tag,source)
    import tomllib
    version=tomllib.loads((ROOT/'Cargo.toml').read_text())['workspace']['package']['version']
    gate.require(tag=='v'+version,'tag/workspace version differs')
    workflow=workflow_policy.load_workflow((ROOT/contract.WORKFLOW).read_bytes())
    workflow_policy.check(workflow,'release.yml')
    channels=contract.selected_channels((ROOT/'packaging/release/channels.json').read_bytes(),workflow)
    return {'channels':channels,'tag_object':proof['object_sha']}


def freeze(root):
    value=configuration()
    gate.require(not gate.strict_json((root/'licence-findings.json').read_bytes())['findings'],'unresolved licence findings')
    tag=os.environ['GITHUB_REF_NAME'];source=os.environ['GITHUB_SHA']
    supply.require_contract(root,value['channels'],sorted(gate.TARGETS),tag)
    # cargo-dist's legacy global checksum output is replaced, not authorized
    # alongside SHA256SUMS as a second global digest authority.
    legacy=root/'sha256.sum'
    if legacy.exists():
        contract.regular(legacy);legacy.unlink()
    metadata={'schema':2,'repository':gate.REPOSITORY,'source_sha':source,'tag':tag,
              'tag_object':value['tag_object'],'channels':value['channels'],'targets':sorted(gate.TARGETS),
              'attesting':{'run_id':int(os.environ['GITHUB_RUN_ID']),'run_attempt':1},
              'binaries':supply.binary_inventory(root,sorted(gate.TARGETS))}
    print(contract.freeze(root,metadata))


def image_inputs(root,work):
    # Unprivileged local-data inspection. Credentialed qualification calls the
    # shared verifier first; this entry point never conveys publish authority.
    spec=importlib.util.spec_from_file_location('release_image',ROOT/'packaging/ghcr-candidate.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    value=contract.load(root)
    return module.inspect_release(root,work,value)


def check_original(root):
    value=contract.load(root)
    gate.require(os.environ.get('GITHUB_RUN_ATTEMPT')=='1'
                 and value['attesting']=={'run_id':int(os.environ['GITHUB_RUN_ID']),'run_attempt':1},
                 'attestation may only use original run inputs; publish-only retry must not re-attest')
    supply.require_contract(root,value['channels'],value['targets'],value['tag'])
    supply.verify_binary_inventory(value,root)
    return value


def require_public(root,signatures,metadata):
    remote=publish.api(f'/repos/{gate.REPOSITORY}/releases/tags/{metadata["tag"]}')
    gate.require(isinstance(remote,dict) and remote.get('tag_name')==metadata['tag'] and remote.get('draft') is False
                 and remote.get('immutable') is True,'channel requires public immutable GitHub release')
    expected={p.name:gate.digest(contract.regular(p)) for directory in (root,signatures) for p in directory.iterdir()}
    gate.require(not publish.plan(expected,publish.release_assets(remote))['missing'],'immutable public release is incomplete')


def verify(root,signatures,channel='github',public=False):
    value=contract.load(root)
    api=gate.GitHub(os.environ['GH_TOKEN'])
    run_policy.validate(value,run_policy.evidence(api,value,os.environ),os.environ,datetime.now(timezone.utc))
    gate.require(channel in value['channels'],'channel is not selected')
    if channel!='github':
        gate.require(os.environ.get('RELEASE_'+channel.upper()+'_ENABLED')=='true','channel publication is disabled')
    # Validate ownership against the checked-out, signature-verified source,
    # not a name supplied by the run artifact.
    workflow=workflow_policy.load_workflow((ROOT/contract.WORKFLOW).read_bytes())
    workflow_policy.check(workflow,'release.yml')
    gate.require(contract.selected_channels((ROOT/'packaging/release/channels.json').read_bytes(),workflow)==value['channels'],
                 'artifact channel selection differs from signed source')
    contract.verify(root,value['tag'],os.environ['GITHUB_SHA'],signatures/contract.BUNDLE,
                    int(os.environ['GITHUB_RUN_ID']),int(os.environ['RELEASE_ATTESTING_ATTEMPT']))
    supply.require_contract(root,value['channels'],value['targets'],value['tag'])
    supply.verify_binary_inventory(value,root)
    if 'ghcr' in value['channels']:
        import channel_publish
        channel_publish.verify_images(root,signatures,value)
    if public or channel!='github':require_public(root,signatures,value)
    return value


def summary(root,signatures):
    value=contract.load(root)
    gate.require(value['attesting']=={'run_id':int(os.environ['GITHUB_RUN_ID']),'run_attempt':1}
                 and os.environ['GITHUB_RUN_ATTEMPT']=='1','attesting attempt changed; never rerun all for recovery')
    print('# Release approval inputs\n')
    print('Source: `'+value['source_sha']+'`; tag: `'+value['tag']+'`; original run: `'+str(value['attesting']['run_id'])+'`, attesting attempt: `1`.\n')
    print('Channels: `'+','.join(value['channels'])+'`; targets: `'+','.join(value['targets'])+'`.\n')
    print('| Asset | SHA-256 |\n|---|---|')
    for directory in (root,signatures):
        for path in sorted(directory.iterdir()):print('| `'+path.name+'` | `'+gate.digest(contract.regular(path))+'` |')
    print('\nNo draft exists before approval. A publish-only retry reuses these bytes and the original attesting attempt.')
    print('For a retry, approve with comment `publish-run:'+str(value['attesting']['run_id'])+':attempt:<current publishing attempt>`. Never rerun all.')


def main():
    parser=argparse.ArgumentParser(description=__doc__,allow_abbrev=False)
    parser.add_argument('operation',choices=['configure','freeze','check','summary','image-inputs','verify','publish','channel'])
    parser.add_argument('root',nargs='?',type=Path)
    parser.add_argument('other',nargs='?',type=Path)
    parser.add_argument('channel',nargs='?',choices=sorted(gate.CHANNELS))
    parser.add_argument('--outputs',type=Path)
    args=parser.parse_args()
    if args.operation=='configure':
        value=configuration();print('channels='+gate.canonical(value['channels']).decode().strip());print('channels_csv='+','.join(value['channels']));print('tag_object='+value['tag_object'])
    elif args.operation=='freeze':freeze(args.root)
    elif args.operation=='check':check_original(args.root)
    elif args.operation=='summary':summary(args.root,args.other)
    elif args.operation=='image-inputs':image_inputs(args.root,args.other)
    elif args.operation=='verify':
        value=verify(args.root,args.other,args.channel)
        if args.outputs:
            with args.outputs.open('a') as output:output.write('channels='+gate.canonical(value['channels']).decode())
    elif args.operation=='publish':
        result=publication.release(args.root,args.other,lambda:verify(args.root,args.other))
        print(gate.canonical(result).decode(),end='')
    else:
        import channel_publish
        channel_publish.publish(args.root,args.other,args.channel)


if __name__=='__main__':
    try:main()
    except (gate.Refused,KeyError,ValueError,OSError,subprocess.CalledProcessError) as error:
        raise SystemExit('release refused: '+str(error)) from error
``````

<!-- replay-file: {"path":"packaging/release/run_policy.py","mode":"100644","sha256":"188199ce85d59ba077d4e6f51b943578fc4581a6d61e8dd98eeb0e72c4d1106f","encoding":"utf8"} -->
``````python
"""Read-only run evidence for original attestation and renewed publish approval."""
from datetime import datetime, timezone, timedelta

import contract
import gate


def integer(value):
    gate.require(isinstance(value, str) and value.isascii() and value.isdigit() and int(value) > 0, 'invalid workflow integer')
    return int(value)

def validate(metadata, evidence, environment, now):
    contract.validate_metadata({k:v for k,v in metadata.items() if k!='artifacts'})
    gate.require(metadata['targets']==sorted(gate.TARGETS), 'publication requires every qualified target')
    expected={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/tags/'+metadata['tag'],
              'GITHUB_SHA':metadata['source_sha'],'GITHUB_EVENT_NAME':'push',
              'GITHUB_WORKFLOW_REF':f'{gate.REPOSITORY}/{contract.WORKFLOW}@refs/tags/{metadata["tag"]}',
              'RELEASE_PUBLICATION_ENABLED':'true','RELEASE_GITHUB_ENABLED':'true'}
    gate.require(all(environment.get(k)==v for k,v in expected.items()), 'untrusted or disabled publication context')
    run_id=integer(environment.get('GITHUB_RUN_ID'))
    publishing=integer(environment.get('GITHUB_RUN_ATTEMPT'))
    original=integer(environment.get('RELEASE_ATTESTING_ATTEMPT'))
    artifact_id=integer(environment.get('RELEASE_ARTIFACT_ID'))
    gate.require(metadata['attesting']=={'run_id':run_id,'run_attempt':original} and original==1
                 and original<=publishing<=51, 'original attesting attempt changed or rerun budget exhausted')
    run=evidence['original']
    gate.require(run.get('id')==run_id and run.get('run_attempt')==original and run.get('head_sha')==metadata['source_sha']
                 and run.get('head_branch')==metadata['tag'] and run.get('event')=='push'
                 and run.get('path')==contract.WORKFLOW and run.get('repository',{}).get('full_name')==gate.REPOSITORY,
                 'original attesting run differs')
    created=datetime.fromisoformat(run['created_at'].replace('Z','+00:00'))
    gate.require(timedelta(0)<=now-created<timedelta(days=30),'publish-only recovery window expired; use a new signed version')
    artifact=evidence['artifact']
    gate.require(artifact.get('id')==artifact_id and artifact.get('name')==f'attested-release-{run_id}-{original}'
                 and artifact.get('expired') is False and artifact.get('workflow_run',{}).get('id')==run_id
                 and artifact.get('workflow_run',{}).get('head_sha')==metadata['source_sha'], 'original attested artifact unavailable or changed')
    jobs=evidence['jobs']
    required={'tag-signature','qualification','web-ui','archive','assemble','installer','attest','homebrew-native'}
    gate.require(required<={j.get('name') for j in jobs}, 'required acceptance job missing')
    for name in required:
        count=3 if name in ('qualification','archive','installer','homebrew-native') else 1
        gate.require(sum(j.get('name')==name for j in jobs)==count, 'acceptance matrix missing or duplicated: '+name)
    owners=set(gate.CHANNEL_JOB_IDS)
    for channel in owners:
        matches=[j for j in jobs if j.get('name')==channel]
        gate.require(len(matches)==1, 'channel acceptance owner missing/duplicated')
    for job in jobs:
        if job.get('name')=='publish':continue
        optional=job.get('name') in owners and job['name'] not in metadata['channels']
        gate.require(job.get('status')=='completed' and (job.get('conclusion')=='success'
                     or (optional and job.get('conclusion')=='skipped')), 'acceptance job failed, pending or skipped')
    owner=evidence['owner']
    gate.require(owner.get('login')=='marcinwadon' and type(owner.get('id')) is int, 'unexpected repository owner')
    reviews=[r for r in evidence['reviews'] if any(e.get('name')=='release' for e in r.get('environments',[]))]
    gate.require(reviews and reviews[-1].get('state')=='approved' and reviews[-1].get('user',{}).get('id')==owner['id'],
                 'maintainer release approval absent or rejected')
    if publishing>original:
        gate.require(reviews[-1].get('comment')==f'publish-run:{run_id}:attempt:{publishing}', 'retry needs renewed current-attempt approval comment')
    return metadata


def evidence(api, metadata, environment):
    run=metadata['attesting'];run_id=run['run_id'];attempt=run['run_attempt']
    return {'original':api.get(f'/actions/runs/{run_id}/attempts/{attempt}'),
            'jobs':api.pages(f'/actions/runs/{run_id}/attempts/{attempt}/jobs','jobs'),
            'artifact':api.get('/actions/artifacts/'+str(integer(environment.get('RELEASE_ARTIFACT_ID')))),
            'owner':api.get('/')['owner'],'reviews':api.get(f'/actions/runs/{run_id}/approvals')}
``````

<!-- replay-file: {"path":"packaging/release/settings_audit.py","mode":"100644","sha256":"b3500b58d3892739b2f2c0f759f4694b795ef198835fd5c5d961cc264c127a0a","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Maintainer-local platform acceptance; never a publisher authorization token.

Inspect platform settings and explicitly confirmed registry observations. The
single tagged workflow uses its environment approval and original-run evidence,
not an inventory signature, retained audit or digest-bearing review comment.
"""
import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess

import gate

CRATES = ('hennery-proto', 'hennery-view', 'hennery-gateway', 'hennery-sessions', 'hennery-host', 'hennery-kernel', 'hennery')


def tag_rulesets(owner_id):
    common = {'target': 'tag', 'enforcement': 'active', 'conditions': {'ref_name': {'include': ['refs/tags/v*'], 'exclude': []}}}
    return [common | {'name': 'release-tag-creation', 'bypass_actors': [{'actor_type': 'User', 'actor_id': owner_id, 'bypass_mode': 'always'}], 'rules': [{'type': 'creation'}]},
            common | {'name': 'release-tags-immutable', 'bypass_actors': [], 'rules': [{'type': 'update'}, {'type': 'deletion'}]}]


def check_tag_rules(rulesets, owner_id):
    creation, immutable = False, False
    for rule in rulesets:
        if rule.get('target') != 'tag' or rule.get('enforcement') != 'active':
            continue
        refs = rule.get('conditions', {}).get('ref_name', {})
        if refs != {'include': ['refs/tags/v*'], 'exclude': []}:
            continue
        operations = {r['type'] for r in rule.get('rules', [])}
        creation |= operations == {'creation'} and rule.get('bypass_actors') == [{'actor_type': 'User', 'actor_id': owner_id, 'bypass_mode': 'always'}]
        immutable |= {'update', 'deletion'} <= operations and rule.get('bypass_actors') == []
    gate.require(creation and immutable, 'release tags require owner-only creation and immutable update/deletion with no bypass')


def validate_settings(settings, channels):
    gate.require(channels == sorted(set(channels)) and 'github' in channels and set(channels) <= set(gate.CHANNELS), 'invalid selected channel set')
    owner = settings['owner']
    gate.require(owner.get('login') == gate.REPOSITORY.split('/')[0] and owner.get('type') == 'User' and type(owner.get('id')) is int and owner['id'] > 0, 'settings audit requires the personal repository owner')
    import tag_signature
    touch = settings.get('maintainer_touch', {})
    gate.require(touch.get('confirmed') is True and touch.get('fingerprint') == tag_signature.FINGERPRINT and touch.get('policy') in ('on', 'cached-fixed'), 'maintainer hardware touch confirmation missing; remote verification is impossible')
    env = settings['environment']
    gate.require(env.get('name') == 'release' and env.get('can_admins_bypass') is False, 'release environment missing or bypass not explicitly disabled')
    reviewers = [r for rule in env.get('protection_rules', []) if rule.get('type') == 'required_reviewers' for r in rule.get('reviewers', [])]
    gate.require(len(reviewers) == 1 and reviewers[0].get('type') == 'User' and reviewers[0].get('reviewer', {}).get('id') == owner['id'], 'release reviewer must be exactly the maintainer')
    gate.require(env.get('deployment_branch_policy') == {'protected_branches': False, 'custom_branch_policies': True}, 'release environment deployment restrictions missing')
    gate.require(settings.get('deployment_policies') == [{'name': 'v*', 'type': 'tag'}], 'release deployment must permit protected v* tags only')
    check_tag_rules(settings.get('rulesets', []), owner['id'])
    gate.require(settings.get('repository_secrets') == [], 'repository secrets must be empty; publishing credentials belong only in release')
    gate.require(settings.get('immutable_releases') is True, 'immutable GitHub releases must be enabled')
    secrets = settings.get('release_secrets', [])
    allowed = {'RELEASE_HOMEBREW_TOKEN', 'GHCR_PUBLISH_TOKEN', 'RELEASE_CRATES_BOOTSTRAP_TOKEN'}
    gate.require(isinstance(secrets, list) and len(secrets) == len(set(secrets)) and set(secrets) <= allowed,
                 'only channel credentials belong in release; no stored GitHub write token, upload App or storage credentials')
    variables = settings.get('release_vars', {})
    switches = ('RELEASE_PUBLICATION_ENABLED', 'RELEASE_GITHUB_ENABLED', 'RELEASE_HOMEBREW_ENABLED',
                'RELEASE_CRATES_ENABLED', 'RELEASE_GHCR_ENABLED', 'RELEASE_CRATES_BOOTSTRAP_ENABLED')
    gate.require(set(variables) <= set(switches) | {'GHCR_PUBLISH_USER'}, 'obsolete or unknown release environment variable')
    gate.require(all(variables.get(name, 'false') in ('true', 'false') for name in switches), 'release switches must be explicit true/false strings')
    if 'homebrew' in channels:
        tap = settings.get('homebrew', {})
        gate.require('RELEASE_HOMEBREW_TOKEN' in secrets, 'Homebrew credential must exist only in release')
        gate.require(tap.get('repository') == 'marcinwadon/homebrew-tap' and tap.get('branch') == 'main'
                     and tap.get('environment') == 'release' and tap.get('credential') == 'RELEASE_HOMEBREW_TOKEN',
                     'Homebrew audit must name the protected tap credential and destination')
        gate.require(tap.get('kind') in ('fine-grained-pat', 'app-installation')
                     and tap.get('repositories') == ['marcinwadon/homebrew-tap']
                     and tap.get('permissions') == {'contents': 'write'} and tap.get('scope_confirmed') is True,
                     'maintainer must confirm tap-only contents scope; no broad token')
    if 'ghcr' in channels:
        ghcr = settings.get('ghcr', {})
        gate.require(ghcr.get('repository') == gate.REPOSITORY and ghcr.get('actions_access') == 'read', 'GHCR Actions access must be READ')
        gate.require(ghcr.get('dedicated_credential') == 'GHCR_PUBLISH_TOKEN' and 'GHCR_PUBLISH_TOKEN' in secrets, 'GHCR requires its dedicated release environment credential')
        gate.require(isinstance(variables.get('GHCR_PUBLISH_USER'), str) and bool(variables['GHCR_PUBLISH_USER'].strip()), 'GHCR publishing user must be configured')
        denial = ghcr.get('negative_push', {})
        gate.require(denial.get('credential') == 'GITHUB_TOKEN' and denial.get('read_status') == 200 and denial.get('push_status') == 403, 'post-setup GITHUB_TOKEN push denial must be observed with working read access')
    if 'crates' in channels:
        if variables.get('RELEASE_CRATES_BOOTSTRAP_ENABLED') == 'true':
            bootstrap = settings.get('crates_bootstrap', {})
            gate.require('RELEASE_CRATES_BOOTSTRAP_TOKEN' in secrets and bootstrap.get('publish_only') is True
                         and bootstrap.get('crate_names') == sorted(CRATES) and bootstrap.get('scope_confirmed') is True
                         and bootstrap.get('revocation_required') is True,
                         'explicit bootstrap requires temporary seven-crate publish-only scope and revocation on success or abandonment')
        else:
            gate.require('RELEASE_CRATES_BOOTSTRAP_TOKEN' not in secrets, 'remove/revoke abandoned or completed bootstrap token before trusted publishing')
            configs = settings.get('crates', [])
            gate.require(len(configs) == len(CRATES) and {c.get('crate') for c in configs} == set(CRATES), 'trusted publisher configuration missing for production crate closure')
            gate.require(all(c.get('repository') == gate.REPOSITORY and c.get('workflow') == 'release.yml' and c.get('environment') == 'release' for c in configs), 'crates.io trusted publishing must require exact workflow and release environment')


def report(settings, channels, now=None):
    """Local checklist evidence only: neither consumed nor ratified by publishing."""
    validate_settings(settings, channels)
    return {'schema': 2, 'purpose': 'maintainer-local-platform-acceptance',
            'repository': gate.REPOSITORY, 'channels': channels,
            'checked_at': (now or datetime.now(timezone.utc)).isoformat(), 'settings': settings}


def gh(path):
    # Deliberately local-only. Use the maintainer's own gh login, never a CI
    # administration token or a branch-supplied evidence collector.
    gate.require(os.environ.get('GITHUB_ACTIONS') != 'true', 'settings audit must run locally by the maintainer')
    return gate.strict_json(subprocess.run(['gh', 'api', '--hostname', 'github.com', path], check=True, capture_output=True).stdout)


def pages(path, key=None):
    values = []
    for page in range(1, 101):
        result = gh(path + ('&' if '?' in path else '?') + f'per_page=100&page={page}')
        batch = result[key] if key else result
        gate.require(isinstance(batch, list), 'incomplete settings audit page')
        values.extend(batch)
        if len(batch) < 100:
            return values
    raise gate.Refused('incomplete settings audit pagination')


def collect(observations):
    user = gh('/user')
    repo = gh('/repos/' + gate.REPOSITORY)
    owner = {k: repo['owner'][k] for k in ('login', 'id', 'type')}
    gate.require(user['id'] == owner['id'] and user['login'] == owner['login'], 'local gh account must be the personal repository owner')
    prefix = '/repos/' + gate.REPOSITORY
    environment = gh(prefix + '/environments/release')
    rulesets = [gh(prefix + '/rulesets/' + str(r['id'])) for r in pages(prefix + '/rulesets')]
    return {'owner': owner, 'environment': environment,
            'deployment_policies': [{k: p[k] for k in ('name', 'type')} for p in pages(prefix + '/environments/release/deployment-branch-policies', 'branch_policies')],
            'rulesets': rulesets, 'repository_secrets': [s['name'] for s in pages(prefix + '/actions/secrets', 'secrets')],
            'release_secrets': [s['name'] for s in pages(prefix + '/environments/release/secrets', 'secrets')],
            'immutable_releases': gh(prefix + '/immutable-releases')['enabled'],
            'maintainer_touch': observations.get('maintainer_touch'),
            'release_vars': {v['name']: v['value'] for v in pages(prefix + '/environments/release/variables', 'variables')},
            'ghcr': observations.get('ghcr'), 'crates': observations.get('crates'),
            'crates_bootstrap': observations.get('crates_bootstrap'), 'homebrew': observations.get('homebrew')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--payload', required=True, type=Path)
    parser.add_argument('--observations', required=True, type=Path, help='maintainer inspection: GHCR access, crates.io trusted publishers, Homebrew tap-only credential scope')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    import contract
    import tag_signature
    metadata = contract.load(args.payload)
    signed_tag = tag_signature.verify(metadata['tag'], metadata['source_sha'], object_sha=metadata['tag_object'])
    value = report(collect(gate.strict_json(args.observations.read_bytes())), metadata['channels']) | {'signed_tag': signed_tag}
    print(gate.canonical(value).decode())
    gate.require(input('Confirm the displayed API settings AND personally checked registry observations by typing ' + gate.REPOSITORY + ': ') == gate.REPOSITORY, 'maintainer settings confirmation absent')
    with args.output.open('xb') as output:
        output.write(gate.canonical(value))
    print('Local acceptance recorded; this file is not publication authority.')


if __name__ == '__main__':
    main()
``````

<!-- replay-file: {"path":"packaging/release/supply.py","mode":"100644","sha256":"4f8679f6fa8f898c5b0ea5fddfad876efeee49a316e4ebcd354c68f18e02fdf8","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Generate notices, source material, SPDX and final release materials before attestation.

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
import contract
from adapter_manifest import read_manifest


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
    root = Path(root)
    entries = [(p.name, gate.digest(contract.regular(p))) for p in sorted(root.iterdir()) if p.name != contract.CHECKSUMS]
    raw = ''.join(f'{sha}  {name}\n' for name, sha in entries).encode('ascii')
    contract.parse_checksums(raw)
    (root / contract.CHECKSUMS).write_bytes(raw)
    verify_checksums(root)


def verify_checksums(root):
    return contract.verify_files(root)


def freeze(root, metadata):
    # Data generation only; the tag workflow supplies signature-verified source
    # metadata. Public consumers must still verify tag and every attestation.
    root = Path(root)
    gate.require(not any((root / name).exists() or (root / name).is_symlink() for name in (contract.METADATA, contract.CHECKSUMS)), 'release already frozen')
    gate.require(not gate.strict_json(contract.regular(root / 'licence-findings.json'))['findings'], 'unresolved licence findings: maintainer review/materials required')
    contract.validate_metadata(metadata)
    require_contract(root, metadata['channels'], metadata['targets'], metadata['tag'])
    metadata = metadata | {'binaries': binary_inventory(root, metadata['targets'])}
    return contract.freeze(root, metadata)


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
    gate.require(inventory.get('binaries') == binary_inventory(root, inventory['targets']), 'release binary metadata differs from archive bytes')


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
    if 'homebrew' in channels:
        import homebrew
        homebrew.check(root, tag, targets)
    if 'crates' in channels:
        import tomllib
        import verify
        base = 'hennery-' + tag.removeprefix('v')
        with tarfile.open(Path(root) / (base + '.crate'), 'r:gz') as archive:
            entries = [m for m in archive.getmembers() if m.name == base + '/Cargo.toml']
            gate.require(len(entries) == 1 and entries[0].isfile() and entries[0].size <= 1024*1024, 'crate metadata must be one bounded regular file')
            with archive.extractfile(entries[0]) as metadata:
                package = tomllib.loads(metadata.read().decode())['package']
        verify.require_binstall_metadata(package.get('metadata', {}), tag)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['materials'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--target')
    parser.add_argument('--cargo-metadata', type=Path)
    parser.add_argument('--frontend-licences', type=Path)
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
        manifest = read_manifest()
        (args.output / 'runtime-inventory.json').write_bytes(gate.canonical({'adapter_manifest_sha256': gate.digest(manifest),
                                                                          'redistributed': False, 'manifest': gate.strict_json(manifest)}))
        ui = {str(p.relative_to('web/dist')): p.read_bytes() for p in Path('web/dist').rglob('*') if p.is_file()}
        gate.require('index.html' in ui, 'release UI missing')
        identity = {'source_sha': args.source_sha, 'ui_sha256': tree_digest(ui), 'adapter_manifest_sha256': gate.digest(manifest),
                    'cargo_lock_sha256': gate.digest(Path('Cargo.lock').read_bytes()), 'web_lock_sha256': gate.digest(Path('web/pnpm-lock.yaml').read_bytes())}
        (args.output / 'build-identity.json').write_bytes(gate.canonical(identity))


if __name__ == '__main__':
    try:
        main()
    except (gate.Refused, KeyError, OSError, ValueError) as error:
        raise SystemExit(f'release materials refused: {error}') from error
``````

<!-- replay-file: {"path":"packaging/release/tag_signature.py","mode":"100644","sha256":"dab795b10fa0f092d7779d3fe2b6d7e3294316c74b3649b4d54cb710b8332f44","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Verify the fetched annotated tag with the history-pinned maintainer key."""
import argparse
from pathlib import Path
import re
import subprocess

import gate
import verifier_process

# Issuer fingerprint in signed commit 3b7b5f2d2af8821f4617afb08ba1dc766c5b9f14.
# The committed public key also verifies that historical commit. This is not
# GitHub's shared web-flow signing key B5690EEEBB952194.
FINGERPRINT = 'F26C7F594DFE84D131703AFC23E5A318AE8D2861'


def check_status(returncode, status):
    records = [line.split()[1:] for line in status.splitlines() if line.startswith('[GNUPG:] ')]
    valid = [r for r in records if r[0] == 'VALIDSIG']
    gate.require(returncode == 0 and len(valid) == 1 and valid[0][1] == FINGERPRINT and not any(r[0] in {'BADSIG', 'ERRSIG', 'REVKEYSIG', 'EXPKEYSIG', 'EXPSIG', 'KEYEXPIRED', 'SIGEXPIRED'} for r in records), 'release tag signature is missing, invalid, expired or not from the pinned maintainer key')


def verify(tag, source_sha, object_sha=None):
    gate.require(re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?', tag) and re.fullmatch('[0-9a-f]{40}', source_sha), 'invalid signed-tag binding')
    with verifier_process.environment() as environment:
        # Exclude checkout-local credential helpers, includes and remotes too.
        repository = Path(environment['HOME']) / 'source.git'
        options = dict(env=environment, capture_output=True, text=True)
        subprocess.run(['git', 'init', '--bare', '--template=', str(repository)], check=True, **options)
        git = ['git', '--git-dir=' + str(repository)]
        subprocess.run(git + ['fetch', '--no-tags', 'https://github.com/' + gate.REPOSITORY + '.git', 'refs/tags/' + tag], check=True, **options)
        fetched = subprocess.run(git + ['rev-parse', 'FETCH_HEAD'], check=True, **options).stdout.strip()
        gate.require(re.fullmatch('[0-9a-f]{40}', fetched) and (object_sha is None or fetched == object_sha), 'fetched release tag object changed')
        raw = subprocess.run(git + ['cat-file', 'tag', fetched], check=True, **options).stdout
        header = dict(line.split(' ', 1) for line in raw.split('\n\n', 1)[0].splitlines())
        gate.require(header.get('object') == source_sha and header.get('type') == 'commit' and header.get('tag') == tag, 'signed tag must directly identify the exact candidate commit')
        subprocess.run(['gpg', '--batch', '--no-autostart', '--import', str(Path(__file__).with_name('maintainer.asc'))], check=True, **options)
        result = subprocess.run(git + ['-c', 'gpg.format=openpgp', '-c', 'gpg.program=gpg', 'verify-tag', '--raw', fetched], **options)
        check_status(result.returncode, result.stderr)
    return {'object_sha': fetched, 'commit_sha': source_sha, 'tag': tag, 'fingerprint': FINGERPRINT}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--source-sha', required=True)
    args = parser.parse_args()
    print(gate.canonical(verify(args.tag, args.source_sha)).decode())
``````

<!-- replay-file: {"path":"packaging/release/test_bootstrap.py","mode":"100644","sha256":"097033a9afaf5e6a5f036fba0eb5db00b2a03268a77b0c20b93cf1ff10895362","encoding":"utf8"} -->
``````python
"""Execute the exact README bootstrap with real disposable signed-tag fixtures."""
import os
from pathlib import Path
import subprocess
import sys
import unittest

from installer_fixtures import ConsumerFixtures, FINGERPRINT, ROOT, REFUSALS

SCRIPT=None


def documented_script():
    environment=dict(os.environ);environment.pop('README_BLOCKS_AWK',None)
    result=subprocess.run(['sh',str(ROOT/'packaging/readme-blocks.sh'),str(ROOT/'README.md'),'release-bootstrap'],env=environment,capture_output=True,text=True)
    if result.returncode: raise AssertionError('guarded bootstrap missing: '+result.stderr)
    if SCRIPT is not None: assert SCRIPT.read_text()==result.stdout,'workflow must execute the exact README block'
    return result.stdout


class Bootstrap(ConsumerFixtures,unittest.TestCase):
    def test_signed_source_bootstrap_contract(self):
        script=documented_script()
        self.assertEqual(script.count('release_fingerprint='+FINGERPRINT),1)
        for old in ('release-inventory','--signer-workflow','verify.py','maintainer.asc'):
            self.assertNotIn(old,script)
        for required in ('SHA256SUMS','verify-tag','release.yml@refs/tags/','--source-digest','--signer-digest'):
            self.assertIn(required,script)

    def test_positive_with_each_documented_sha256_tool(self):
        for tool in ('sha256sum','shasum'):
            with self.subTest(tool=tool):
                result,marker=self.fixture('valid',documented_script(),hash_tool=tool)
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                self.assertEqual(marker.read_text(),'executed')

    def test_every_refusal_never_executes_installer(self):
        for case in REFUSALS+('wrong-github-key','wrong-keyserver-key','wrong-main-pin'):
            with self.subTest(case=case):
                result,marker=self.fixture(case,documented_script())
                self.assertNotEqual(result.returncode,0,'accepted '+case)
                self.assertFalse(marker.exists(),'executed installer for '+case)

    def test_refusals_do_not_depend_on_shell_errexit(self):
        for tool in ('sha256sum','shasum'):
            for case in ('unsigned-tag','tampered-checksums','tampered-installer','wrong-run','wrong-attempt','duplicate-checksum'):
                with self.subTest(case=case,tool=tool):
                    result,marker=self.fixture(case,documented_script(),hash_tool=tool,conditional=True)
                    self.assertNotEqual(result.returncode,0,'conditional accepted '+case)
                    self.assertFalse(marker.exists())


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--script',type=Path)
    SCRIPT=parser.parse_args().script
    unittest.main(argv=[sys.argv[0]])
``````

<!-- replay-file: {"path":"packaging/release/test_channel_publish.py","mode":"100644","sha256":"a8fcf47a11cc8edb747775c0946f15daa827a7608497b6e01a2ff8a20f9b200c","encoding":"utf8"} -->
``````python
import base64
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import channel_publish
import contract
import gate
import homebrew_publish as tap
import release_run
import test_homebrew


class ChannelDelivery(unittest.TestCase):
    def test_crates_bootstrap_is_explicit_and_never_oidc_fallback(self):
        self.assertEqual(channel_publish.crates_token({'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','RELEASE_CRATES_BOOTSTRAP_TOKEN':'bootstrap'}),'bootstrap')
        self.assertEqual(channel_publish.crates_token({'CARGO_REGISTRY_TOKEN':'ephemeral'}),'ephemeral')
        for env in [{},{'RELEASE_CRATES_BOOTSTRAP_TOKEN':'bootstrap'},
                    {'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','CARGO_REGISTRY_TOKEN':'ephemeral'},
                    {'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','CARGO_REGISTRY_TOKEN':'ephemeral','RELEASE_CRATES_BOOTSTRAP_TOKEN':'bootstrap'}]:
            with self.subTest(env=env),self.assertRaises(gate.Refused):channel_publish.crates_token(env)

    def test_failed_shared_verifier_never_touches_any_channel_transport(self):
        with patch.object(release_run,'verify',side_effect=gate.Refused('denied')),patch('subprocess.run',side_effect=AssertionError('transport used')):
            for channel in ['homebrew','crates','ghcr']:
                with self.subTest(channel=channel),self.assertRaises(gate.Refused):channel_publish.publish(Path('unused'),Path('unused'),channel)

    def test_homebrew_publishes_exact_bytes_and_reconciles_without_overwrite(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        root=fixture.root;formula=(root/'hennery.rb').read_bytes()
        metadata={'tag':fixture.tag,'channels':['github','homebrew'],'targets':fixture.targets,'source_sha':'a'*40}
        calls=[];remote=None
        def verify(*args,**kwargs):calls.append('verify');return metadata
        def api(method='GET',data=None):
            nonlocal remote
            calls.append(method)
            if method=='GET':return remote
            self.assertEqual(calls[-2],'verify')
            self.assertEqual(base64.b64decode(data['content']),formula)
            remote={'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':data['content'],'sha':tap.blob_sha(formula)}
            return {'content':{'sha':tap.blob_sha(formula)},'commit':{'sha':'c'*40}}
        with patch.object(release_run,'verify',side_effect=verify),patch.object(tap,'tap_api',side_effect=api):
            result=channel_publish.publish(root,Path('signatures'),'homebrew')
            self.assertEqual(result['state'],'published')
            self.assertEqual(channel_publish.publish(root,Path('signatures'),'homebrew')['state'],'already-present')
        self.assertEqual(calls.count('PUT'),1)

    def test_homebrew_conflicting_same_version_refuses(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        formula=(fixture.root/'hennery.rb').read_bytes()+b'# changed\n'
        remote={'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':base64.b64encode(formula).decode(),'sha':tap.blob_sha(formula)}
        meta={'tag':fixture.tag,'channels':['github','homebrew'],'targets':fixture.targets,'source_sha':'a'*40}
        def only_read(method='GET',data=None):
            self.assertEqual(method,'GET','same-version conflict must never write')
            return remote
        with patch.object(release_run,'verify',return_value=meta),patch.object(tap,'tap_api',side_effect=only_read) as api,self.assertRaises(gate.Refused):
            channel_publish.publish(fixture.root,Path('signatures'),'homebrew')
        self.assertEqual([c.args for c in api.call_args_list],[('GET',)])

    def test_bootstrap_reports_revocation_on_success_and_abandonment(self):
        for failure in [False,True]:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);messages=[]
                env={'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true','RELEASE_CRATES_BOOTSTRAP_TOKEN':'offline-bootstrap'}
                with patch.dict(os.environ,env),patch.object(release_run,'verify',return_value={'tag':'v0.1.0'}),patch('builtins.print',side_effect=lambda text:messages.append(text)),patch.object(channel_publish.crates_delivery,'run',side_effect=RuntimeError('upload failed') if failure else None):
                    if failure:
                        with self.assertRaises(RuntimeError):channel_publish.publish(root,root,'crates')
                    else:channel_publish.publish(root,root,'crates')
                self.assertTrue(any('revoke' in str(message).lower() and 'bootstrap' in str(message).lower() for message in messages))

    def test_parent_verifier_retains_transport_authority_without_global_mutation(self):
        # Actual child exclusion is exercised by test_verifier_process's
        # executable stand-ins. This callback is the authenticated API parent.
        def verify(*args):
            self.assertTrue(all(os.environ.get(name)=='offline-secret' for name in channel_publish.SECRETS))
            raise gate.Refused('fixture denial before any token use')
        with patch.dict(os.environ,{key:'offline-secret' for key in channel_publish.SECRETS}),patch.object(release_run,'verify',side_effect=verify):
            with self.assertRaises(gate.Refused):channel_publish.publish(Path('unused'),Path('unused'),'ghcr')
            self.assertEqual(os.environ['GHCR_PUBLISH_TOKEN'],'offline-secret')

    def test_abandoned_bootstrap_verification_still_requires_revocation(self):
        with patch.dict(os.environ,{'RELEASE_CRATES_BOOTSTRAP_ENABLED':'true'}),patch.object(release_run,'verify',side_effect=gate.Refused('denied')),patch('builtins.print') as notice:
            with self.assertRaises(gate.Refused):channel_publish.publish(Path('unused'),Path('unused'),'crates')
            self.assertTrue(any('revoke' in str(call) for call in notice.call_args_list))

    def test_ghcr_frozen_digest_retry_and_late_failure(self):
        # Transport lifecycle only: authentic OCI/crypto contracts have their
        # own fixtures. No network or registry credentials are used here.
        for mode in ['new','present','conflict','attach-failure','verify-failure']:
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);events=[];uploaded=mode=='present';digest='sha256:'+'a'*64
                def inspect(*args):events.append('inspect');return {'digest':digest}
                def checks(*args,**kwargs):
                    events.append('fetched-verify' if kwargs.get('subjects') else 'verify')
                    if mode=='verify-failure':raise gate.Refused('wrong signature')
                def reconcile(*args):
                    events.append('reconcile')
                    if mode=='conflict':raise gate.Refused('different bytes')
                    return 0 if uploaded else 1
                def run(command,**kwargs):
                    nonlocal uploaded
                    events.append(command[:2])
                    if command[:2]==['skopeo','login']:
                        self.assertIn('verify',events[:-1]);self.assertEqual(kwargs['input'],'offline-secret')
                        Path(command[command.index('--authfile')+1]).write_text('{}')
                    if command[:2]==['skopeo','copy']:
                        self.assertIn('--preserve-digests',command);self.assertTrue(command[-1].endswith('@'+digest));uploaded=True
                def bundles(subjects,output,before_write,**kwargs):
                    if mode!='present':
                        for _ in subjects:
                            before_write();events.append('referrer-write')
                            if mode=='attach-failure':raise RuntimeError('ambiguous referrer copy')
                    return [(*item[:4],output/item[4].name) for item in subjects]
                fixture=SimpleNamespace(inspect_release=inspect)
                with patch.dict(os.environ,{'GHCR_PUBLISH_TOKEN':'offline-secret','GHCR_PUBLISH_USER':'fixture'}),patch.object(channel_publish,'shared_verify',return_value={'tag':'v0.1.0'}),patch.object(channel_publish,'image_helper',return_value=fixture),patch.object(channel_publish,'registry_helper',return_value=SimpleNamespace(reconcile=reconcile)),patch.object(channel_publish,'check_images',side_effect=checks),patch.object(channel_publish,'image_subjects',return_value=[('index','provenance',digest,'slsa',root/'bundle')]),patch.object(channel_publish.registry_bundles,'reconcile',side_effect=bundles),patch('subprocess.run',side_effect=run):
                    if mode in ('conflict','attach-failure','verify-failure'):
                        with self.assertRaises((gate.Refused,RuntimeError)):channel_publish.ghcr_upload(root,root,{'tag':'v0.1.0'})
                    else:self.assertEqual(channel_publish.ghcr_upload(root,root,{'tag':'v0.1.0'})['digest'],digest)
                if mode in ('present','conflict','verify-failure'):self.assertNotIn(['skopeo','copy'],events)
                if mode=='verify-failure':self.assertNotIn(['skopeo','login'],events)
                if mode in ('new','present'):self.assertEqual(events[-1],'fetched-verify')
                if mode=='present':self.assertNotIn('referrer-write',events)

    def test_homebrew_cas_and_all_remote_conflicts(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        formula=(fixture.root/'hennery.rb').read_bytes();value={'tag':fixture.tag,'targets':fixture.targets}
        def remote(raw):return {'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':base64.b64encode(raw).decode(),'sha':tap.blob_sha(raw)}
        for previous in [remote(formula+b'changed'),remote(formula.replace(b'0.1.0',b'9.0.0')),remote(b'invalid formula'),dict(remote(formula),sha='0'*40),dict(remote(formula),encoding='raw'),dict(remote(formula),type='symlink'),dict(remote(formula),path='other.rb'),dict(remote(formula),content='invalid base64')]:
            def read_only(method='GET',data=None):self.assertEqual(method,'GET');return previous
            with self.subTest(previous=previous),patch.object(release_run,'verify',return_value=value),patch.object(tap,'tap_api',side_effect=read_only),self.assertRaises(gate.Refused):
                channel_publish.publish(fixture.root,Path('signatures'),'homebrew')
        old=remote(formula.replace(b'0.1.0',b'0.0.1'));writes=[]
        def api(method='GET',data=None):
            if method=='GET':return remote(formula) if writes else old
            self.assertEqual(data['sha'],old['sha']);writes.append(data)
            return {'content':{'sha':tap.blob_sha(formula)},'commit':{'sha':'c'*40}}
        with patch.object(release_run,'verify',return_value=value),patch.object(tap,'tap_api',side_effect=api):
            self.assertEqual(channel_publish.publish(fixture.root,Path('signatures'),'homebrew')['state'],'published')
        self.assertEqual(len(writes),1)

    def test_homebrew_late_failure_or_changed_formula_never_overwrites(self):
        fixture=test_homebrew.Formula();fixture.setUp();self.addCleanup(fixture.tmp.cleanup);fixture.prepare()
        formula=(fixture.root/'hennery.rb').read_bytes();value={'tag':fixture.tag,'targets':fixture.targets}
        for fault in ('withdrawn','changed','ambiguous','unconfirmed','readback'):
            (fixture.root/'hennery.rb').write_bytes(formula);events=[]
            def verify(*args):
                events.append('verify')
                if events.count('verify')==2:
                    if fault=='withdrawn':raise gate.Refused('withdrawn')
                    if fault=='changed':(fixture.root/'hennery.rb').write_bytes(b'changed formula')
                return value
            def api(method='GET',data=None):
                events.append(method)
                if method=='GET':
                    if 'PUT' not in events:return None
                    return {'type':'file','path':'Formula/hennery.rb','encoding':'base64','content':base64.b64encode(formula+b'changed').decode(),'sha':tap.blob_sha(formula+b'changed')}
                if fault=='ambiguous':raise gate.Refused('lost response')
                return {'content':{'sha':tap.blob_sha(formula) if fault!='unconfirmed' else '0'*40},'commit':{'sha':'c'*40}}
            with self.subTest(fault=fault),patch.object(release_run,'verify',side_effect=verify),patch.object(tap,'tap_api',side_effect=api),self.assertRaises(gate.Refused):
                channel_publish.publish(fixture.root,Path('signatures'),'homebrew')
            self.assertEqual(events.count('PUT'),0 if fault in ('withdrawn','changed') else 1)
``````

<!-- replay-file: {"path":"packaging/release/test_consumer_fixtures.py","mode":"100644","sha256":"2c269f6c23ac9493d95d1f3a57cf1ed6676887fd569e0b37613a316a619200b3","encoding":"utf8"} -->
``````python
"""Real local tags must not depend on an operator's Git identity/configuration."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from installer_fixtures import ConsumerFixtures, FINGERPRINT


class FixtureIsolation(ConsumerFixtures, unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outer = tempfile.TemporaryDirectory(prefix='consumer-empty-home-')
        cls.addClassCleanup(cls.outer.cleanup)
        empty = {'PATH': os.environ['PATH'], 'HOME': cls.outer.name,
                 'XDG_CONFIG_HOME': str(Path(cls.outer.name) / 'xdg'),
                 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_NOSYSTEM': '1',
                 # macOS Git can infer a tagger from Directory Services even
                 # with no configuration; disable that fallback for the RED.
                 'GIT_CONFIG_COUNT': '1', 'GIT_CONFIG_KEY_0': 'user.useConfigOnly',
                 'GIT_CONFIG_VALUE_0': 'true'}
        with patch.dict(os.environ, empty, clear=True):
            super().setUpClass()

    def test_signed_and_unsigned_fixture_tags_have_an_explicit_tagger(self):
        # This script tests fixture construction only. The real bootstrap suite
        # independently requires that an unsigned tag is refused.
        script = 'release_fingerprint=' + FINGERPRINT + '\nexit 0\n'
        for case in ('unsigned-tag', 'valid'):
            with self.subTest(case=case):
                try:
                    _, marker = self.fixture(case, script)
                except subprocess.CalledProcessError as error:
                    self.fail('fixture construction failed: ' + error.stderr)
                raw = subprocess.check_output(['git', '-C', str(marker.parent / 'source'),
                                               'cat-file', 'tag', 'v0.1.0-alpha.1'],
                                              env=self.environment, text=True)
                self.assertTrue('tagger Disposable fixture <fixture@example.invalid> ' in raw,
                                'fixture used an ambient or inferred tagger')

    def test_fixture_configuration_is_private_even_with_an_empty_caller_home(self):
        self.assertIn('HOME', self.environment)
        self.assertIn('XDG_CONFIG_HOME', self.environment)
        self.assertNotEqual(self.environment['HOME'], self.outer.name)
        self.assertTrue(Path(self.environment['HOME']).is_relative_to(self.root))
        self.assertTrue(Path(self.environment['XDG_CONFIG_HOME']).is_relative_to(self.root))
        self.assertEqual(self.environment.get('GIT_CONFIG_GLOBAL'), '/dev/null')
        self.assertEqual(self.environment.get('GIT_CONFIG_SYSTEM'), '/dev/null')
        self.assertEqual(self.environment.get('GIT_CONFIG_NOSYSTEM'), '1')
        for key in ('GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0'):
            self.assertNotIn(key, self.environment)

    def test_fixture_subprocess_failure_includes_stderr(self):
        with self.assertRaises(AssertionError) as failure:
            self.gpg('--hennery-fixture-stderr-canary')
        self.assertIn('hennery-fixture-stderr-canary', str(failure.exception))
        self.assertIn('invalid option', str(failure.exception))
        self.assertIn('exit ', str(failure.exception))
``````

<!-- replay-file: {"path":"packaging/release/test_contract.py","mode":"100644","sha256":"751553a263a0f9691e2adcc8ab288dfaaaab1db3180503f893ab87050fb8a474","encoding":"utf8"} -->
``````python
"""Release contract refusals; no production transport or private signing key."""
import copy
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import contract
import gate


class Contract(unittest.TestCase):
    def fixture(self, root):
        (root / 'installer.sh').write_bytes(b'exit 0\n')
        metadata = {'schema': 2, 'repository': gate.REPOSITORY, 'source_sha': 'a' * 40,
                    'tag': 'v0.1.0', 'tag_object': 'b' * 40, 'channels': ['github'],
                    'targets': sorted(gate.TARGETS), 'attesting': {'run_id': 42, 'run_attempt': 1}}
        contract.freeze(root, metadata)
        return metadata

    def test_freeze_binds_complete_payload_and_refuses_nonregular_or_changed_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            metadata = self.fixture(root)
            self.assertEqual(contract.load(root)['attesting'], metadata['attesting'])
            entries = contract.verify_files(root)
            self.assertEqual(set(entries), {'installer.sh', 'release-metadata.json'})
            with self.assertRaises(gate.Refused): contract.freeze(root, metadata)
            (root / 'installer.sh').write_bytes(b'evil')
            with self.assertRaises(gate.Refused): contract.verify_files(root)
        for kind in ['extra', 'missing', 'symlink', 'directory']:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); self.fixture(root)
                if kind == 'extra': (root / 'unlisted').write_bytes(b'x')
                if kind == 'missing': (root / 'installer.sh').unlink()
                if kind == 'symlink': (root / 'link').symlink_to('installer.sh')
                if kind == 'directory': (root / 'dir').mkdir()
                with self.assertRaises(gate.Refused): contract.verify_files(root)

    def test_verification_uses_tag_then_every_subject_with_same_run_and_rechecks_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); self.fixture(root)
            uri = 'https://github.com/marcinwadon/hennery/actions/runs/42/attempts/1'
            certificate = {'runInvocationURI': uri, 'sourceRepositoryURI': 'https://github.com/'+gate.REPOSITORY, 'buildSignerURI': 'https://github.com/'+gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0', 'sourceRepositoryRef': 'refs/tags/v0.1.0', 'sourceRepositoryDigest': 'a'*40, 'buildSignerDigest': 'a'*40, 'runnerEnvironment': 'github-hosted', 'issuer': 'https://token.actions.githubusercontent.com'}
            output = gate.canonical([{'verificationResult': {'signature': {'certificate': certificate}}}]).decode()
            events = []
            def crypto(command, **kwargs):
                events.append(Path(command[3]).name)
                return subprocess.CompletedProcess(command, 0, output, '')
            with patch('tag_signature.verify', side_effect=lambda *a: events.append('tag')), patch.object(contract.subprocess, 'run', side_effect=crypto):
                result = contract.verify(root, 'v0.1.0', 'a' * 40, Path(tmp) / 'bundle', 42, 1)
                self.assertEqual(result['source_sha'], 'a' * 40)
                self.assertEqual(events, ['tag', 'SHA256SUMS', 'installer.sh', 'release-metadata.json'])
                for tag, source, run, attempt in [('v0.2.0','a'*40,42,1),('v0.1.0','c'*40,42,1),('v0.1.0','a'*40,43,1),('v0.1.0','a'*40,42,2)]:
                    with self.subTest(tag=tag,source=source,run=run,attempt=attempt), self.assertRaises(gate.Refused):
                        contract.verify(root, tag, source, 'bundle', run, attempt)
            def mutate(command, **kwargs):
                (root / 'installer.sh').write_bytes(b'changed while verifying')
                return subprocess.CompletedProcess(command, 0, output, '')
            with patch('tag_signature.verify'), patch.object(contract.subprocess,'run',side_effect=mutate), self.assertRaises(gate.Refused):
                contract.verify(root, 'v0.1.0', 'a'*40, 'bundle',42,1)

    def test_a_listed_symlink_to_identical_bytes_is_still_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'release';root.mkdir();self.fixture(root)
            source=Path(tmp)/'outside';source.write_bytes((root/'installer.sh').read_bytes())
            (root/'installer.sh').unlink();(root/'installer.sh').symlink_to(source)
            with self.assertRaises(gate.Refused):contract.verify_files(root)

    def test_canonical_unique_safe_checksum_entries(self):
        raw = ('a' * 64 + '  archive.tar.xz\n').encode()
        self.assertEqual(contract.parse_checksums(raw), {'archive.tar.xz': 'a' * 64})
        for bad in [b'', raw + raw, raw + raw.replace(b'archive', b'ARCHIVE'),
                    raw.replace(b'archive', b'ARCHIVE') + raw,
                    raw.replace(b'archive.tar.xz', b'../archive'), raw.replace(b'  ', b' '),
                    raw.replace(b'archive.tar.xz', b'SHA256SUMS'),
                    raw.replace(b'archive.tar.xz', b'release.sigstore.jsonl'),
                    raw.replace(b'archive.tar.xz', b'sha256sums'),
                    raw.replace(b'\n', b'\r\n'), raw.replace(b'\n', b'\v\n'),
                    raw.rstrip(b'\n'), raw.replace(b'a', b'G', 1)]:
            with self.subTest(raw=bad), self.assertRaises(gate.Refused):
                contract.parse_checksums(bad)

    def test_metadata_refuses_every_malformed_binding_and_ambiguous_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); metadata = self.fixture(root)
        for field, value in [('schema', 1), ('repository', 'other/repository'), ('tag', 'main'),
                             ('source_sha', 'main'), ('tag_object', 'x'*40), ('channels', ['homebrew']),
                             ('channels', ['github','github']), ('targets', []), ('targets', ['unknown']),
                             ('attesting', {'run_id': True, 'run_attempt': 1}),
                             ('attesting', {'run_id': 42, 'run_attempt': 0}),
                             ('attesting', {'run_id': 42, 'run_attempt': 1, 'extra': 2}),
                             ('artifacts', [])]:
            value_map = copy.deepcopy(metadata);value_map[field] = value
            with self.subTest(field=field,value=value), self.assertRaises(gate.Refused):
                contract.validate_metadata(value_map)
        for raw in [b'{"run_id":42,"RUN_ID":43}',b'{"run_id":42,"run_\\u0069d":43}']:
            with self.subTest(raw=raw),self.assertRaises(gate.Refused):gate.strict_json(raw)

    def test_channel_selection_owns_job_ids_and_names(self):
        jobs = {'crates': {'name': 'crates'}, 'ghcr': {'name': 'ghcr'},
                'homebrew': {'name': 'homebrew'}}
        self.assertEqual(contract.selected_channels(b'["github","homebrew"]\n', {'jobs': jobs}), ['github', 'homebrew'])
        for raw in [b'[]', b'["homebrew"]', b'["github","unknown"]',
                    b'["github","github"]', b'["Github"]']:
            with self.subTest(raw=raw), self.assertRaises(gate.Refused):
                contract.selected_channels(raw, {'jobs': jobs})
        for mutation in ['owner', 'collision', 'missing', 'matrix', 'dynamic']:
            bad = copy.deepcopy(jobs)
            if mutation == 'owner': bad['spoof'] = bad.pop('homebrew')
            if mutation == 'collision': bad['spoof'] = {'name': 'homebrew'}
            if mutation == 'missing': del bad['homebrew']
            if mutation == 'matrix': bad['homebrew']['strategy'] = {'matrix': {'os': ['x']}}
            if mutation == 'dynamic': bad['homebrew']['name'] = '${{ inputs.name }}'
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                contract.selected_channels(b'["github","homebrew"]', {'jobs': bad})

    def test_command_uses_exact_identity_and_both_digest_constraints(self):
        command = contract.attestation_command('payload', 'v0.1.0', 'a' * 40, 'bundle', 'root')
        self.assertNotIn('--signer-workflow', command)
        for flag, value in [('--cert-identity', 'https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0'),
                            ('--source-ref', 'refs/tags/v0.1.0'), ('--source-digest', 'a' * 40),
                            ('--signer-digest', 'a' * 40), ('--bundle', 'bundle'),
                            ('--custom-trusted-root', 'root'), ('--format', 'json')]:
            self.assertIn(flag, command)
            self.assertEqual(command[command.index(flag) + 1], value)
        self.assertIn('--deny-self-hosted-runners', command)
        for tag, sha in [('main', 'a' * 40), ('v0.1.0', 'main'), ('v0.1.0;false', 'a' * 40)]:
            with self.subTest(tag=tag), self.assertRaises(gate.Refused):
                contract.attestation_command('payload', tag, sha, 'bundle')

    def test_real_certificate_path_and_exact_original_attempt(self):
        uri = 'https://github.com/marcinwadon/hennery/actions/runs/42/attempts/1'
        result = [{'verificationResult': {'signature': {'certificate': {'runInvocationURI': uri}}}}]
        self.assertEqual(contract.require_run(result, 42, 1), uri)
        for wrong in [[], [{}], [{'verificationResult': {'statement': {'predicate': {'runInvocationURI': uri}}}}],
                      [{'verificationResult': {'signature': {'certificate': {'extensions': {'runInvocationURI': uri}}}}}],
                      str(result), result + [{}]]:
            with self.subTest(result=wrong), self.assertRaises(gate.Refused):
                contract.require_run(wrong, 42, 1)
        for run, attempt in [(43, 1), (42, 2), (True, 1), (42, 0)]:
            with self.subTest(run=run, attempt=attempt), self.assertRaises(gate.Refused):
                contract.require_run(result, run, attempt)


if __name__ == '__main__':
    unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_crates_delivery.py","mode":"100644","sha256":"37080a267dedf839e124f2d522305026cb28a5ade6b7d4f43bf5393455fd7021","encoding":"utf8"} -->
``````python
"""Real spawned writer/broker isolation, with no registry or GitHub transport."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest import mock

import gate

FILE=Path(__file__).with_name('crates_delivery.py')
if FILE.is_file():
    import crates_delivery
else:
    crates_delivery=None


class CratesDelivery(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(crates_delivery,'private parent-owned crates gate broker missing')
        temporary=tempfile.TemporaryDirectory(prefix='crates-delivery-test-');self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name);self.signature=self.root/'signatures';self.signature.mkdir()
        self.env={'PATH':os.environ['PATH'],'GH_TOKEN':'must-not-leak','GITHUB_TOKEN':'must-not-leak',
                  'ACTIONS_ID_TOKEN_REQUEST_URL':'must-not-leak','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'must-not-leak',
                  'GH_CONFIG_DIR':'/operator/config','HOME':'/operator/home','CARGO_HOME':'/operator/cargo',
                  'NODE_OPTIONS':'--require=/operator/code','SSL_CERT_FILE':'/allowed/cert'}

    def command(self,code):
        return [sys.executable,'-c',code]

    def execute(self,code,callback=lambda:'a'*64,**kwargs):
        return crates_delivery.run(self.root,self.signature,'chosen-crates-token',callback,
                                   environment=self.env,command=self.command(code),**kwargs)

    def test_real_child_receives_only_registry_token_private_paths_and_broker_fds(self):
        observed=self.root/'observed.json';seen=[]
        code=f'''import json,os
from pathlib import Path
request=int(os.environ['CRATES_GATE_REQUEST_FD']);reply=int(os.environ['CRATES_GATE_REPLY_FD'])
os.write(request,b'gate-v1:1\\n')
response=os.fdopen(reply,'rb').readline()
assert response==b'ok-v1:1:'+b'a'*64+b'\\n',response
Path({str(observed)!r}).write_text(json.dumps(dict(os.environ)))
'''
        def callback():seen.append(os.environ.get('GH_TOKEN'));return 'a'*64
        with mock.patch.dict(os.environ,{'GH_TOKEN':'parent-only'},clear=False):self.execute(code,callback)
        self.assertEqual(seen,['parent-only'])
        env=json.loads(observed.read_text());self.assertEqual(env['CARGO_REGISTRY_TOKEN'],'chosen-crates-token')
        self.assertEqual(env['SSL_CERT_FILE'],'/allowed/cert')
        self.assertFalse(set(env)&{'GH_TOKEN','GITHUB_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL','ACTIONS_ID_TOKEN_REQUEST_TOKEN','GH_CONFIG_DIR','NODE_OPTIONS'})
        self.assertNotEqual(env['HOME'],self.env['HOME']);self.assertNotEqual(env['CARGO_HOME'],self.env['CARGO_HOME'])
        self.assertFalse(Path(env['HOME']).exists(),'private child state must be removed after reap')

    def test_parent_denial_stops_child_and_returns_no_token_or_exception_detail(self):
        marker=self.root/'continued'
        code=f'''import os
from pathlib import Path
os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n')
data=os.read(int(os.environ['CRATES_GATE_REPLY_FD']),128)
if data.startswith(b'ok-'):Path({str(marker)!r}).touch()
'''
        def denied():raise RuntimeError('parent-only-GitHub-token')
        with self.assertRaises(gate.Refused) as failure:self.execute(code,denied)
        self.assertNotIn('parent-only-GitHub-token',str(failure.exception));self.assertFalse(marker.exists())

    def test_bad_sequence_duplicate_extra_and_oversized_requests_refuse(self):
        for request in (b'gate-v1:2\n',b'gate-v1:1 extra\n',b'GATE-v1:1\n',b'gate-v1:1\nextra\n',b'x'*129+b'\n',b'gate-v1:1\n'+b'x'*129+b'\n'):
            calls=[]
            code=f"import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),{request!r});os.read(int(os.environ['CRATES_GATE_REPLY_FD']),256)"
            with self.subTest(request=request[:25]),self.assertRaises(gate.Refused):self.execute(code,lambda:calls.append(1) or 'a'*64)
            if request!=b'gate-v1:1\nextra\n':self.assertEqual(calls,[])

    def test_missing_gate_requests_partial_eof_child_failure_and_bad_digest_refuse(self):
        for code in ('pass',"import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:')",'raise SystemExit(3)'):
            with self.subTest(code=code),self.assertRaises(gate.Refused):self.execute(code)
        for digest in ('short','A'*64,None):
            code="import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n');os.read(int(os.environ['CRATES_GATE_REPLY_FD']),256)"
            with self.subTest(digest=digest),self.assertRaises(gate.Refused):self.execute(code,lambda:digest)

    def test_timeout_kills_and_reaps_writer(self):
        pid=self.root/'pid'
        code=f"import os,time;from pathlib import Path;Path({str(pid)!r}).write_text(str(os.getpid()));time.sleep(60)"
        with self.assertRaises(gate.Refused):self.execute(code,timeout=0.5)
        if pid.exists():
            with self.assertRaises(ProcessLookupError):os.kill(int(pid.read_text()),0)

    def test_multiple_requests_require_fresh_parent_checks(self):
        calls=[]
        code='''import os
request=int(os.environ['CRATES_GATE_REQUEST_FD']);reply=os.fdopen(int(os.environ['CRATES_GATE_REPLY_FD']),'rb')
for i in range(1,4):
 os.write(request,f'gate-v1:{i}\\n'.encode())
 assert reply.readline()==f'ok-v1:{i}:'.encode()+b'a'*64+b'\\n'
'''
        self.execute(code,lambda:calls.append(1) or 'a'*64)
        self.assertEqual(calls,[1,1,1])

    def test_refusal_details_from_parent_are_not_exposed(self):
        code="import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n');os.read(int(os.environ['CRATES_GATE_REPLY_FD']),128)"
        def denied():raise gate.Refused('sensitive-parent-context')
        with self.assertRaises(gate.Refused) as failure:self.execute(code,denied)
        self.assertNotIn('sensitive-parent-context',str(failure.exception))

    def test_actual_node_broker_strict_reply_shape_sequence_and_eof(self):
        import subprocess
        publisher=Path(__file__).resolve().parents[2]/'packaging/publish-crates.mjs'
        program=f"import {{gateBroker}} from {str(publisher)!r};if(gateBroker()!=='{'a'*64}')process.exitCode=3;"
        responses=[b'ok-v1:1:'+b'a'*64+b'\n',b'ok-v1:2:'+b'a'*64+b'\n',b'ok-v1:1:'+b'A'*64+b'\n',
                   b'ok-v1:1:'+b'a'*64,b'wrong\n',b'x'*129+b'\n',b'',
                   b'\xefk-v1:1:'+b'a'*64+b'\n']
        for index,response in enumerate(responses):
            request_read,request_write=os.pipe();reply_read,reply_write=os.pipe()
            try:
                environment={'PATH':os.environ['PATH'],'HOME':str(self.root),'CRATES_GATE_REQUEST_FD':str(request_write),'CRATES_GATE_REPLY_FD':str(reply_read)}
                process=subprocess.Popen(['node','--input-type=module','-e',program],env=environment,stdin=subprocess.DEVNULL,
                                         stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,pass_fds=(request_write,reply_read))
                os.close(request_write);request_write=None;os.close(reply_read);reply_read=None
                os.write(reply_write,response);os.close(reply_write);reply_write=None
                self.assertEqual(os.read(request_read,128),b'gate-v1:1\n')
                result=process.wait(timeout=10)
                with self.subTest(response=response[:25]):
                    if index==0:self.assertEqual(result,0)
                    else:self.assertNotEqual(result,0)
            finally:
                for descriptor in (request_read,request_write,reply_read,reply_write):
                    if descriptor is not None:os.close(descriptor)
                if process.poll() is None:process.kill()
                process.wait()

    def test_delivery_parameters_refuse_before_spawn(self):
        for token,timeout in (('',1),(None,1),('token',0),('token',-1)):
            with self.subTest(token=token,timeout=timeout),mock.patch.object(crates_delivery.subprocess,'Popen') as spawn:
                with self.assertRaises(gate.Refused):crates_delivery.run(self.root,self.signature,token,lambda:'a'*64,environment=self.env,timeout=timeout)
                spawn.assert_not_called()

    def test_fd_cleanup_on_success_denial_and_child_error(self):
        original=os.pipe
        for mode in ('success','denial','child-error','closed-reply'):
            descriptors=[]
            def pipes():
                result=original();descriptors.extend(result);return result
            code="import os;os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n');os.read(int(os.environ['CRATES_GATE_REPLY_FD']),128)"
            if mode=='child-error':code+=';raise SystemExit(7)'
            if mode=='closed-reply':code="import os;os.close(int(os.environ['CRATES_GATE_REPLY_FD']));os.write(int(os.environ['CRATES_GATE_REQUEST_FD']),b'gate-v1:1\\n')"
            def callback():
                if mode=='denial':raise gate.Refused('denied')
                return 'a'*64
            with mock.patch.object(crates_delivery.os,'pipe',side_effect=pipes):
                if mode=='success':self.execute(code,callback)
                else:
                    with self.assertRaises(gate.Refused):self.execute(code,callback)
            for descriptor in descriptors:
                with self.subTest(mode=mode,descriptor=descriptor),self.assertRaises(OSError):os.fstat(descriptor)

    def test_request_budget_refuses_before_another_parent_authorization(self):
        calls=[]
        code='''import os
request=int(os.environ['CRATES_GATE_REQUEST_FD']);reply=os.fdopen(int(os.environ['CRATES_GATE_REPLY_FD']),'rb')
for i in range(1,3):
 os.write(request,f'gate-v1:{i}\\n'.encode())
 reply.readline()
'''
        with mock.patch.object(crates_delivery,'MAX_REQUESTS',1),self.assertRaises(gate.Refused):
            self.execute(code,lambda:calls.append(1) or 'a'*64)
        self.assertEqual(calls,[1])

    def test_cleanup_kills_and_reaps_before_removing_private_configuration(self):
        events=[];temporary=None
        realtemporary=tempfile.TemporaryDirectory
        class Child:
            def poll(self):return None
            def kill(self):events.append('kill')
            def wait(self,*args,**kwargs):events.append('wait');return 1
        def directory(*args,**kwargs):
            nonlocal temporary
            temporary=realtemporary(*args,**kwargs)
            original=temporary.cleanup
            def cleanup():events.append('cleanup');original()
            temporary.cleanup=cleanup
            return temporary
        with mock.patch.object(crates_delivery.tempfile,'TemporaryDirectory',side_effect=directory),mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.os,'read',return_value=b''):
            with self.assertRaises(gate.Refused):self.execute('pass')
        self.assertEqual(events,['kill','wait','cleanup'])
        self.assertFalse(Path(temporary.name).exists())

    def test_partial_reply_write_is_a_refusal(self):
        class Child:
            def poll(self):return 0
            def wait(self,*args,**kwargs):return 0
        with mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.select,'select',return_value=([1],[],[])),mock.patch.object(crates_delivery.os,'read',side_effect=[b'gate-v1:1\n',b'']),mock.patch.object(crates_delivery.os,'write',return_value=0):
            with self.assertRaises(gate.Refused):self.execute('pass')

    def test_expired_deadline_does_not_invoke_parent_authorization(self):
        class Child:
            def poll(self):return 0
            def wait(self,*args,**kwargs):return 0
        callback=mock.Mock(return_value='a'*64)
        with mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.time,'monotonic',side_effect=[0,2,2,2]),mock.patch.object(crates_delivery.select,'select',return_value=([1],[],[])),mock.patch.object(crates_delivery.os,'read',side_effect=[b'gate-v1:1\n',b'']),mock.patch.object(crates_delivery.os,'write',return_value=80):
            with self.assertRaises(gate.Refused):self.execute('pass',callback,timeout=1)
            callback.assert_not_called()

    def test_expired_parent_check_never_sends_an_authorization_reply(self):
        class Child:
            def poll(self):return 0
            def wait(self,*args,**kwargs):return 0
        clock=[0]
        def callback():clock[0]=2;return 'a'*64
        with mock.patch.object(crates_delivery.subprocess,'Popen',return_value=Child()),mock.patch.object(crates_delivery.time,'monotonic',side_effect=lambda:clock[0]),mock.patch.object(crates_delivery.select,'select',return_value=([1],[],[])),mock.patch.object(crates_delivery.os,'read',side_effect=[b'gate-v1:1\n',b'']),mock.patch.object(crates_delivery.os,'write',return_value=80) as write:
            with self.assertRaises(gate.Refused):self.execute('pass',callback,timeout=1)
            write.assert_not_called()
``````

<!-- replay-file: {"path":"packaging/release/test_crates_integration.py","mode":"100644","sha256":"1ee07f2c3d9556f70d0be9edd9ad8cb944c6060e45ab683dde2bd46a8ac2a477","encoding":"utf8"} -->
``````python
"""Node frozen uploader and parent-only real policy; all public transports mocked.

Provenance substitutions below are structural tests. No gh executable or real
registry is contacted; the real Node broker and Python parent process do run.
"""
from contextlib import ExitStack
from datetime import datetime,timezone,timedelta
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import contract
import crates_delivery
import gate
import release_run
import run_policy
import supply
import tag_signature


class CratesIntegration(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory(prefix='release-crates-integration-');self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name);self.repo=Path(__file__).resolve().parents[2]

    def fixture(self,kind='valid'):
        root=Path(tempfile.mkdtemp(prefix='case-',dir=self.root));payload=root/'payload';payload.mkdir()
        version='0.1.0';source={'sha':'a'*40,'sha256':gate.digest(b'source'),
            'url':'https://github.com/marcinwadon/hennery/releases/download/v0.1.0/hennery-source-'+'a'*40+'.tar.gz'}
        (payload/('hennery-source-'+source['sha']+'.tar.gz')).write_bytes(b'source')
        crates=[]
        for name in ('hennery-proto','hennery-kernel','hennery-view','hennery-host','hennery-gateway','hennery-sessions','hennery'):
            filename=name+'-'+version+'.crate';data=name.encode();(payload/filename).write_bytes(data)
            crates.append({'name':name,'file':filename,'size':len(data),'sha256':gate.digest(data),'upload':{'name':name,'vers':version}})
        (payload/'crates-inventory.json').write_bytes(gate.canonical({'schema':1,'version':version,'source':source,'crates':crates}))
        metadata={'schema':2,'repository':gate.REPOSITORY,'source_sha':source['sha'],'tag':'v'+version,'tag_object':'b'*40,
                  'channels':['crates','github'],'targets':sorted(gate.TARGETS),'attesting':{'run_id':42,'run_attempt':1}}
        contract.freeze(payload,metadata)
        signatures=root/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_text('{}')
        (root/'.github/workflows').mkdir(parents=True)
        shutil.copyfile(self.repo/contract.WORKFLOW,root/contract.WORKFLOW)
        (root/'packaging/release').mkdir(parents=True)
        (root/'packaging/release/channels.json').write_bytes(gate.canonical(metadata['channels']))
        if kind=='changed-crate':(payload/crates[0]['file']).write_bytes(b'altered')
        environment=dict(os.environ,GITHUB_ACTIONS='true',GITHUB_REPOSITORY=gate.REPOSITORY,GITHUB_REF='refs/tags/v0.1.0',GITHUB_SHA='a'*40,
            GITHUB_WORKFLOW_REF=gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',GITHUB_EVENT_NAME='push',GITHUB_RUN_ID='42',GITHUB_RUN_ATTEMPT='2',
            RELEASE_ARTIFACT_ID='77',RELEASE_ATTESTING_ATTEMPT='1',GH_TOKEN='offline-parent-only',RELEASE_PUBLICATION_ENABLED='true',RELEASE_GITHUB_ENABLED='true',RELEASE_CRATES_ENABLED='true',
            ACTIONS_ID_TOKEN_REQUEST_TOKEN='offline-parent-only',ACTIONS_ID_TOKEN_REQUEST_URL='offline-parent-only')
        return root,payload,signatures,environment

    def run_publish(self,kind,repetitions=1):
        root,payload,signatures,environment=self.fixture(kind)
        publisher=Path(os.environ.get('R3_FIXTURE_PUBLISHER',str(self.repo/'packaging/publish-crates.mjs')))
        resultfile=root/'node-result.json'
        program=f'''import fs from 'node:fs';
import {{publishFrozen,releaseGate,releaseCratesDigest}} from {str(publisher)!r};
const dir={str(payload)!r},signatures={str(signatures)!r};let credentials=0,uploads=0,error='',completed=[];
for(const key of ['GH_TOKEN','GITHUB_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL','GH_CONFIG_DIR','NODE_OPTIONS'])if(key in process.env)throw Error('authority leaked into Node');
try{{const digest=releaseCratesDigest(dir);for(let i=0;i<{repetitions};i++)completed=await publishFrozen({{dir,digest,gate:async()=>{{if(releaseGate({{dir,signatures}})!==digest)throw Error('changed channel digest');}},credentials:async()=>{{credentials++;fs.writeFileSync({str(root/'credential-read')!r},String(credentials));return process.env.CARGO_REGISTRY_TOKEN;}},fetcher:async(url,options={{}})=>{{if(options.method==='PUT'){{uploads++;throw Error('unexpected upload');}}if(url.endsWith('/download'))return new Response(url.split('/').at(-3));if(url.startsWith('https://index.crates.io/')){{const name=url.split('/').at(-1);return new Response(JSON.stringify({{vers:'0.1.0',cksum:(await import('node:crypto')).createHash('sha256').update(name).digest('hex')}}));}}return new Response('source');}}}});}}catch(e){{error=String(e);}}
fs.writeFileSync({str(resultfile)!r},JSON.stringify({{credentials,uploads,error,completed}}));
if(error)process.exitCode=1;'''
        calls=[]
        def tag(*args,**kwargs):
            gate.require(kind!='bad-tag','fixture signed tag refused');return {}
        def evidence(api,metadata,env):
            self.assertEqual(os.environ.get('GH_TOKEN'),'offline-parent-only')
            jobs=[{'name':name,'status':'completed','conclusion':'success'} for name in ('tag-signature','qualification','web-ui','archive','assemble','installer','attest','homebrew-native','crates')]
            jobs += [dict(j) for j in list(jobs) if j['name'] in ('qualification','archive','installer','homebrew-native') for _ in range(2)]
            jobs += [{'name':name,'status':'completed','conclusion':'skipped'} for name in ('ghcr','homebrew')]
            return {'original':{'id':42,'run_attempt':1,'head_sha':'a'*40,'head_branch':'v0.1.0','event':'push','path':contract.WORKFLOW,'repository':{'full_name':gate.REPOSITORY},'created_at':(datetime.now(timezone.utc)-timedelta(hours=1)).isoformat()},
                'jobs':jobs,'artifact':{'id':77,'name':'attested-release-42-1','expired':False,'workflow_run':{'id':42,'head_sha':'a'*40}},
                'owner':{'login':'marcinwadon','id':9},'reviews':[{'state':'rejected' if kind=='approval-rejected' else 'approved','comment':'publish-run:42:attempt:2','user':{'id':9},'environments':[{'name':'release'}]}]}
        def crypto(command,**kwargs):
            self.assertEqual(command[:3],['gh','attestation','verify'])
            if kind=='crypto-refused':raise subprocess.CalledProcessError(1,command)
            certificate={'sourceRepositoryURI':'https://github.com/'+gate.REPOSITORY,'buildSignerURI':'https://github.com/'+gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0','sourceRepositoryRef':'refs/tags/v0.1.0','sourceRepositoryDigest':'a'*40,'buildSignerDigest':'a'*40,'runnerEnvironment':'github-hosted','issuer':'https://token.actions.githubusercontent.com','runInvocationURI':'https://github.com/'+gate.REPOSITORY+'/actions/runs/42/attempts/1'}
            if kind=='wrong-run':certificate['runInvocationURI']=certificate['runInvocationURI'].replace('/42/','/43/')
            if kind=='wrong-attempt':certificate['runInvocationURI']=certificate['runInvocationURI'].replace('attempts/1','attempts/2')
            if kind=='branch':certificate['buildSignerURI']=certificate['buildSignerURI'].replace('refs/tags/v0.1.0','refs/heads/main')
            return subprocess.CompletedProcess(command,0,gate.canonical([{'verificationResult':{'signature':{'certificate':certificate}}}]).decode(),'')
        def authorize():
            calls.append('verify')
            gate.require(kind!='missing-gate','fixture gate unavailable')
            gate.require(not (kind=='late-denial' and len(calls)>=4),'fixture authorization changed after credentials')
            release_run.verify(payload,signatures,'crates')
            digest=gate.digest(contract.regular(payload/'crates-inventory.json'))
            if kind in ('changed-after-gate','metadata-after-gate') and len(calls)==3:
                with (payload/('crates-inventory.json' if kind=='changed-after-gate' else 'release-metadata.json')).open('ab') as output:output.write(b' ')
            return 'f'*64 if kind=='wrong-broker-digest' and len(calls)>1 else digest
        parenterror=''
        with ExitStack() as stack:
            stack.enter_context(patch.dict(os.environ,environment,clear=True))
            stack.enter_context(patch.object(release_run,'ROOT',root))
            stack.enter_context(patch.object(tag_signature,'verify',side_effect=tag))
            stack.enter_context(patch.object(supply,'require_contract',return_value=None))
            stack.enter_context(patch.object(supply,'verify_binary_inventory',return_value=None))
            stack.enter_context(patch.object(release_run,'require_public',side_effect=lambda *a:(root/'public-checked').touch()))
            stack.enter_context(patch.object(run_policy,'evidence',side_effect=evidence))
            stack.enter_context(patch.object(contract.subprocess,'run',side_effect=crypto))
            try:
                authorize()  # root channel entry point verifies before choosing a token/spawning.
                crates_delivery.run(payload,signatures,'offline-chosen-crates-token',authorize,environment=environment,
                                    command=[os.environ.get('R3_FIXTURE_NODE','node'),'--input-type=module','-e',program])
            except Exception as failure:parenterror=type(failure).__name__
        result=json.loads(resultfile.read_text()) if resultfile.exists() else {'credentials':int((root/'credential-read').read_text()) if (root/'credential-read').exists() else 0,'uploads':0,'error':parenterror,'completed':[]}
        if parenterror:result['error']=result['error'] or parenterror
        return result,root,calls

    def test_authenticated_global_bytes_reach_credentials_through_real_adapter(self):
        result,root,calls=self.run_publish('valid')
        self.assertEqual((result['credentials'],result['uploads'],result['error']),(1,0,''))
        self.assertEqual(len(result['completed']),7);self.assertTrue((root/'public-checked').is_file())
        self.assertEqual(len(calls),17)

    def test_repeat_recovery_reuses_bytes_and_reverifies_each_boundary(self):
        result,root,calls=self.run_publish('valid',2)
        self.assertEqual((result['credentials'],result['uploads'],result['error']),(2,0,''))
        self.assertEqual(len(calls),33)

    def test_each_authority_failure_prevents_credentials_and_uploads(self):
        for kind in ('missing-gate','bad-tag','crypto-refused','branch','wrong-run','wrong-attempt','approval-rejected','changed-crate','changed-after-gate','metadata-after-gate','wrong-broker-digest'):
            result,_,_=self.run_publish(kind)
            with self.subTest(kind=kind):
                self.assertEqual((result['credentials'],result['uploads']),(0,0));self.assertTrue(result['error'])

    def test_parent_revocation_after_credentials_stops_the_next_boundary(self):
        result,_,calls=self.run_publish('late-denial')
        self.assertEqual((result['credentials'],result['uploads']),(1,0))
        self.assertTrue(result['error']);self.assertEqual(len(calls),4)


if __name__=='__main__':unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_gate.py","mode":"100644","sha256":"bbb7ffb70be00853a4f7ed8a8762a7324cd57236218d57fa86f41f916432a40f","encoding":"utf8"} -->
``````python
import unittest
import gate


class Primitives(unittest.TestCase):
    def test_strict_json(self):
        for raw in ('{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '\ufeff{}', '{"X":1,"x":2}'):
            with self.subTest(raw=raw), self.assertRaises(gate.Refused):
                gate.strict_json(raw)
``````

<!-- replay-file: {"path":"packaging/release/test_hardener.py","mode":"100644","sha256":"af4a587cc0bbbcb524add0c4526b84e54875e1b01ec9e0af6e4280aa4619cf48","encoding":"utf8"} -->
``````python
import importlib.util
from pathlib import Path
import unittest

from installer_fixtures import ConsumerFixtures, ROOT, REFUSALS
from test_bootstrap import documented_script

spec=importlib.util.spec_from_file_location('hardener',ROOT/'packaging/harden-installer.py')
hardener=importlib.util.module_from_spec(spec);spec.loader.exec_module(hardener)


class Hardener(ConsumerFixtures,unittest.TestCase):
    def script(self):
        return '''#!/bin/sh
set -eu
check_cmd() { command -v "$1" >/dev/null; }
err() { echo "$*" >&2; exit 1; }
run() {
_dir="$TEST_ROOT/install-work"
_file="$FIXTURE_RELEASE/hennery-test.tar.xz"
_artifact_name=hennery-test.tar.xz
APP_VERSION=0.1.0-alpha.1
'''+hardener.REPLACEMENTS[0][1]+'\nprintf executed > "$INSTALL_MARKER"\n}\nif run; then exit 0; else exit 1; fi\n'

    def test_same_verifier_is_embedded_in_readme_and_installer(self):
        self.assertIn(hardener.CONSUMER_FUNCTIONS,documented_script())
        result=hardener.harden('\n'.join(old for old,_ in hardener.REPLACEMENTS))
        for removed in ('release-inventory','--signer-workflow','release-publish.yml'):
            self.assertNotIn(removed,result)
        for required in ('verify-tag','SHA256SUMS','--source-digest','--signer-digest','certificate.runInvocationURI'):
            self.assertIn(required,result)

    def test_signed_source_and_exact_run_verification_precedes_extraction(self):
        for case in ('valid',)+REFUSALS:
            with self.subTest(case=case):
                result,marker=self.fixture(case,self.script(),installer=True)
                if case=='valid':
                    self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                    self.assertEqual(marker.read_text(),'executed')
                else:
                    self.assertNotEqual(result.returncode,0,'accepted '+case)
                    self.assertFalse(marker.exists(),'authenticated '+case)

    def test_all_anchors_are_required_once(self):
        pristine='\n'.join(old for old,_ in hardener.REPLACEMENTS)
        result=hardener.harden(pristine)
        self.assertIn('ln "$_stage/$_bin_name" "$_install_dir/"',result)
        self.assertIn('[ "${#_checksum_value}" = 64 ]',result)
        for old,_ in hardener.REPLACEMENTS:
            with self.subTest(anchor=old[:60]):
                with self.assertRaises(SystemExit):hardener.harden(pristine.replace(old,'',1))
                with self.assertRaises(SystemExit):hardener.harden(pristine+'\n'+old)


if __name__=='__main__':unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_homebrew.py","mode":"100644","sha256":"0138188c052607f3cb9621e9a2cbaa040d2bc238318f8291224db1f7df71d458","encoding":"utf8"} -->
``````python
"""Frozen formula validation; never invokes Homebrew or a publication transport."""
from pathlib import Path
import tempfile
import unittest

import gate
import homebrew


class Formula(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.tag = 'v0.1.0'
        self.targets = sorted(gate.TARGETS)
        lines = ['class Hennery < Formula', '  version "0.1.0"']
        for target in self.targets:
            name = 'hennery-' + target + '.tar.xz'
            data = target.encode()
            (self.root / name).write_bytes(data)
            lines += [f'  url "https://github.com/{gate.REPOSITORY}/releases/download/{self.tag}/{name}"',
                      f'  sha256 "{gate.digest(data)}"']
        lines += ['  def install', '    bin.install "hennery"', '  end', 'end', '']
        self.original = '\n'.join(lines)
        self.path = self.root / 'hennery.rb'
        self.path.write_text(self.original)

    def prepare(self):
        homebrew.prepare(self.root, self.tag, self.targets)
        return self.path.read_text()

    def test_prepare_preserves_dist_formula_and_adds_executed_version_ui_test(self):
        result = self.prepare()
        self.assertEqual(result, self.original[:-4] + homebrew.TEST_BLOCK + 'end\n')
        self.assertIn('test do', result)
        self.assertIn('shell_output', result)
        self.assertIn('hennery-web-ui-not-embedded', result)
        homebrew.check(self.root, self.tag, self.targets)

    def test_prepare_is_idempotent(self):
        self.assertEqual(self.prepare(), self.prepare())

    def test_wrong_url_hash_version_or_hooks_refuse(self):
        valid = self.prepare()
        for bad in (valid.replace('github.com/', 'example.invalid/'),
                    valid.replace(gate.digest(self.targets[0].encode()), '0' * 64),
                    valid.replace('version "0.1.0"', 'version "9.0.0"'),
                    valid + '\nservice do\nend\n', valid + '\ndef post_install\nend\n',
                    valid.replace(homebrew.TEST_BLOCK, ''), valid + '\n  url "https://example.invalid/extra"\n',
                    valid.replace('sha256 "', 'sha256 "#{', 1)):
            self.path.write_text(bad)
            with self.subTest(bad=bad), self.assertRaises(gate.Refused):
                homebrew.check(self.root, self.tag, self.targets)

    def test_missing_or_changed_archive_refuses(self):
        self.prepare()
        path = self.root / ('hennery-' + self.targets[0] + '.tar.xz')
        path.write_bytes(b'changed')
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)
        path.unlink()
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)

    def test_nonregular_formula_and_archive_refuse(self):
        self.prepare()
        archive = self.root / ('hennery-' + self.targets[0] + '.tar.xz')
        data = archive.read_bytes(); archive.unlink()
        target = self.root / 'outside'; target.write_bytes(data); archive.symlink_to(target)
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)
        archive.unlink(); archive.write_bytes(data)
        data = self.path.read_bytes(); self.path.unlink(); target.write_bytes(data); self.path.symlink_to(target)
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)

    def test_platform_selection_must_be_nonempty_unique_and_qualified(self):
        self.prepare()
        # A self-consistent formula/archive for an unqualified platform must
        # fail the platform guard, independently of URL/hash validation.
        unsupported = 'x86_64-apple-darwin'
        previous = self.targets[0]
        path = self.root / ('hennery-' + previous + '.tar.xz')
        path.rename(self.root / ('hennery-' + unsupported + '.tar.xz'))
        self.path.write_text(self.path.read_text().replace(previous, unsupported))
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, [unsupported, *self.targets[1:]])
        for targets in ([], ['x86_64-apple-darwin'], [self.targets[0], self.targets[0]]):
            with self.subTest(targets=targets), self.assertRaises(gate.Refused):
                homebrew.check(self.root, self.tag, targets)


    def test_unsigned_native_proof_freezes_exact_files_and_refuses_reuse(self):
        self.prepare()
        destination = self.root / 'proof'
        homebrew.freeze_proof(self.root, destination, self.tag, self.targets, 'a' * 40)
        import contract
        self.assertTrue((destination / 'SHA256SUMS').is_file())
        inventory = contract.load(destination)
        self.assertEqual(inventory['channels'], ['github'])
        self.assertEqual(inventory['source_sha'], 'a' * 40)
        self.assertEqual((destination / 'hennery.rb').read_bytes(), self.path.read_bytes())
        self.assertEqual(len(inventory['artifacts']), len(self.targets) + 2)
        with self.assertRaises(FileExistsError):
            homebrew.freeze_proof(self.root, destination, self.tag, self.targets, 'a' * 40)
        archive = destination / ('hennery-' + self.targets[0] + '.tar.xz')
        archive.write_bytes(b'changed')
        with self.assertRaises(gate.Refused):
            contract.load(destination)


    def test_selected_channel_contract_checks_actual_formula_not_only_payload_names(self):
        import supply
        self.prepare()
        channels = ['github', 'homebrew']
        for name in supply.required_payloads(channels, self.targets, self.tag):
            path = self.root / name
            if not path.exists():
                path.write_bytes(b'fixture payload')
        supply.require_contract(self.root, channels, self.targets, self.tag)
        self.path.write_text(self.path.read_text().replace(homebrew.TEST_BLOCK, ''))
        with self.assertRaises(gate.Refused):
            supply.require_contract(self.root, channels, self.targets, self.tag)


    def test_formula_line_endings_are_never_normalized_after_freezing(self):
        self.prepare()
        self.path.write_bytes(self.path.read_bytes().replace(b'\n', b'\r\n'))
        with self.assertRaises(gate.Refused):
            homebrew.check(self.root, self.tag, self.targets)


if __name__ == '__main__':
    unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_homebrew_publish.py","mode":"100644","sha256":"70f572246de4d478d7cb129b928bfe27bc8538d0d29099aa48e07fecf3454b6c","encoding":"utf8"} -->
``````python
"""Offline transport only: no token, signature, registry or tap access."""
import base64
import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import gate
import test_homebrew
import homebrew_publish as publisher


class Transport(unittest.TestCase):
    def test_fixed_tap_path_credential_confinement_and_no_redirect(self):
        calls=[]
        class Response:
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self): return b'{}'
        class Opener:
            def open(self,request,timeout): calls.append(request);return Response()
        def opener(handler):
            self.assertIsNone(handler.redirect_request(None,None,302,None,None,'https://example.invalid'))
            return Opener()
        with patch.object(publisher.urllib.request,'build_opener',side_effect=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
            publisher.tap_api('GET');publisher.tap_api('PUT',{'content':'eA==','branch':'main'})
        self.assertEqual(calls[0].full_url,'https://api.github.com'+publisher.TAP_PATH+'?ref=main')
        self.assertNotIn('Authorization',calls[0].headers)
        self.assertEqual(calls[1].full_url,'https://api.github.com'+publisher.TAP_PATH)
        self.assertEqual(calls[1].headers['Authorization'],'Bearer offline-fixture')
        self.assertEqual(calls[1].data,gate.canonical({'content':'eA==','branch':'main'}))

    def test_only_authoritative_get_404_is_absence(self):
        import urllib.error
        for method in ('GET','PUT'):
            for code in (301,302,403,404,409,500):
                opener=unittest.mock.Mock()
                import io
                error=urllib.error.HTTPError('https://example.invalid',code,'fixture',{},io.BytesIO())
                self.addCleanup(error.close)
                opener.open.side_effect=error
                with patch.object(publisher.urllib.request,'build_opener',return_value=opener),patch.dict(os.environ,{'HOMEBREW_TAP_TOKEN':'offline-fixture'}):
                    if method=='GET' and code==404:self.assertIsNone(publisher.tap_api(method))
                    else:
                        with self.subTest(method=method,code=code),self.assertRaises(gate.Refused):publisher.tap_api(method)
                self.assertEqual(opener.open.call_count,1)
``````

<!-- replay-file: {"path":"packaging/release/test_homebrew_workflows.py","mode":"100644","sha256":"e37321839f6e1b0d1ace4bdf2f3deb4a3d338c64ff305c58a0bb1753bbd56a38","encoding":"utf8"} -->
``````python
import copy
from pathlib import Path
import unittest
import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


def workflow(name): return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_text())


class HomebrewWorkflows(unittest.TestCase):
    def test_channel_has_an_owning_aggregate_job_and_native_acceptance(self):
        data=workflow('release.yml')
        self.assertEqual(workflow_policy.CHANNEL_JOB_IDS['homebrew'],'homebrew')
        job=data['jobs']['homebrew']
        self.assertEqual(job['name'],'homebrew')
        self.assertIn('homebrew-native',job['needs'])
        native=data['jobs']['homebrew-native']
        self.assertEqual(native['if'], "${{ !cancelled() && needs.assemble.result == 'success' }}")
        self.assertEqual({x['runner'] for x in native['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew_accept.py',str(native))
        self.assertIn('homebrew.py prepare',str(data['jobs']['assemble']))
        self.assertIn('native-archive.sh',str(data['jobs']['archive']))

    def test_pr_proof_is_secret_free_pinned_and_covers_every_advertised_platform(self):
        data=workflow('release-homebrew.yml')
        trigger=data.get('on',data.get(True))
        self.assertIn('pull_request',trigger)
        self.assertIn('packaging/**',trigger['pull_request']['paths'])
        self.assertEqual(data['permissions'],{'contents':'read'})
        self.assertNotIn('secrets.',str(data))
        job=data['jobs']['proof']
        self.assertEqual({x['runner'] for x in job['strategy']['matrix']['include']},
                         {'ubuntu-24.04','ubuntu-24.04-arm','macos-15'})
        self.assertIn('homebrew-proof.sh',str(job))
        workflow_policy.check(data,'release-homebrew.yml')

    def test_writer_exposes_tap_credential_only_after_immutable_release_and_verifier(self):
        data=workflow('release.yml');job=data['jobs']['publish'];steps=job['steps']
        self.assertEqual(job['environment'],'release')
        credential=[i for i,s in enumerate(steps) if 'secrets.RELEASE_HOMEBREW_TOKEN' in str(s)]
        self.assertEqual(len(credential),1)
        ids=[s.get('id') for s in steps]
        self.assertLess(ids.index('github-publish'),ids.index('homebrew-verify'))
        self.assertLess(ids.index('homebrew-verify'),credential[0])
        self.assertIn("vars.RELEASE_HOMEBREW_ENABLED == 'true'",steps[credential[0]]['if'])
        self.assertNotIn('RELEASE_HOMEBREW_TOKEN',str(job.get('env',{})))
        workflow_policy.check(data,'release.yml')

    def test_policy_refuses_each_missing_or_ignored_tap_boundary(self):
        for kind in ('early','job-env','missing-verifier','missing-switch','ignored-upload','skip-verifier'):
            data=workflow('release.yml');job=data['jobs']['publish'];steps=job['steps']
            verify=next(s for s in steps if s.get('id')=='homebrew-verify')
            upload=next(s for s in steps if s.get('id')=='homebrew-publish')
            if kind=='early':steps.remove(upload);steps.insert(0,upload)
            if kind=='job-env':job['env']={'TOKEN':'${{ secrets.RELEASE_HOMEBREW_TOKEN }}'}
            if kind=='missing-verifier':steps.remove(verify)
            if kind=='missing-switch':upload['if']='true'
            if kind=='ignored-upload':upload['continue-on-error']=True
            if kind=='skip-verifier':verify['if']='false'
            with self.subTest(kind=kind),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')

    def test_workflow_level_credential_aliases_refuse(self):
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}", "${{ secrets.release_homebrew_token }}",
                           "${{ secrets['RELEASE_HOMEBREW_TOKEN'] }}", '${{ secrets["release_homebrew_token"] }}'):
            data=workflow('release.yml');data['env']={'TOKEN':expression}
            with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')

    def test_unrelated_read_only_job_cannot_hide_publication_secret(self):
        import tempfile,shutil,yaml
        for expression in ("${{ secrets.RELEASE_HOMEBREW_TOKEN }}","${{ secrets['release_homebrew_token'] }}"):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                (root/'.github/workflows/other.yml').write_text(yaml.safe_dump({'on':'push','permissions':{'contents':'read'},'jobs':{'ordinary':{'runs-on':'ubuntu-24.04','steps':[{'env':{'TOKEN':expression},'run':'true'}]}}}))
                with self.subTest(expression=expression),self.assertRaises(ValueError):workflow_policy.check_repository(root)
``````

<!-- replay-file: {"path":"packaging/release/test_installer_tools.py","mode":"100644","sha256":"8eea0a40823e5cc81daa2a25bb87b47c6a5f61c8f85dd155a5c149dc8e08cd03","encoding":"utf8"} -->
``````python
"""Exercise restricted installer tool directories, including merged /usr bins."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class InstallerTools(unittest.TestCase):
    def fixture(self, root, *, conflicting=False, missing_gh=False):
        source = (ROOT / 'packaging/test-installer.sh').read_text()
        functions = source[source.index('# tools <dir>'):source.index('# copy <name>')]
        self.assertEqual(functions.count('for from in /usr/bin /bin; do'), 1)
        functions = functions.replace('for from in /usr/bin /bin; do',
                                      'for from in "$scratch/first" "$scratch/second"; do')
        for name in ('first', 'second', 'verifier-tools'):
            (root / name).mkdir()
        for name in ('system-gpg', 'other-gpg', 'system-jq'):
            (root / name).write_text(name + '\n')
        for directory in ('first', 'second'):
            target = 'other-gpg' if conflicting and directory == 'second' else 'system-gpg'
            (root / directory / 'gpg').symlink_to(root / target)
            (root / directory / 'jq').symlink_to(root / 'system-jq')
            (root / directory / 'gh').symlink_to(root / 'system-gpg')
        for name in ('gpg', 'jq', 'git'):
            (root / 'verifier-tools' / name).write_text('offline ' + name + '\n')
        if missing_gh:
            start = source.index('tools "$scratch/no-gh-tools"')
            setup = source[start:source.index('(INSTALLER_SYSTEM_PATH="$scratch/no-gh-tools"', start)]
        else:
            setup = 'tools "$scratch/no-gh-tools" gh\n'
        script = 'set -eu\nfail() { printf "%s\\n" "$*" >&2; exit 1; }\n'
        script += 'scratch=$1\n' + functions + setup + 'printf ready > "$scratch/ready"\n'
        return subprocess.run(['sh', '-c', script, 'installer-tools', str(root)],
                              capture_output=True, text=True)

    def test_missing_gh_setup_reserves_the_offline_signer_when_system_gpg_exists(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = self.fixture(root, missing_gh=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'ready').exists())
            for name in ('gpg', 'jq', 'git'):
                self.assertTrue((root / 'no-gh-tools' / name).samefile(root / 'verifier-tools' / name))
            self.assertFalse((root / 'no-gh-tools' / 'gh').exists())

    def test_duplicate_tool_names_resolving_to_the_same_binary_are_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = self.fixture(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'ready').exists())
            self.assertTrue((root / 'no-gh-tools' / 'gpg').is_symlink())
            self.assertTrue((root / 'no-gh-tools' / 'gpg').samefile(root / 'system-gpg'))

    def test_duplicate_tool_names_with_different_binaries_refuse_without_replacement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = self.fixture(root, conflicting=True)
            self.assertNotEqual(result.returncode, 0, 'conflicting binary was silently accepted')
            self.assertFalse((root / 'ready').exists())
            self.assertTrue((root / 'no-gh-tools' / 'gpg').samefile(root / 'system-gpg'))


if __name__ == '__main__':
    unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_optional_scheduling.py","mode":"100644","sha256":"196ccb34d75763d0971ec169ff922c8903c1c0cb2187c2d595ecc4862d20c619","encoding":"utf8"} -->
``````python
"""Bind the secret-free real Actions scheduler regression to the release DAG."""
import copy
from pathlib import Path
import shlex
import unittest
import workflow_policy
ROOT=Path(__file__).resolve().parents[2]
def workflow(name):return workflow_policy.load_workflow((ROOT/'.github/workflows'/name).read_bytes())
class OptionalScheduling(unittest.TestCase):
    def test_ci_actionlint_covers_every_release_workflow(self):
        command=next(s['run'] for s in workflow('release-tests.yml')['jobs']['refusal-tests']['steps'] if s.get('name')=='Actionlint')
        words=shlex.split(command);checked={p for pattern in words[words.index('actionlint')+1:] for p in ROOT.glob(pattern)}
        self.assertLessEqual(set((ROOT/'.github/workflows').glob('release*.yml')),checked)
    def test_scheduler_uses_exact_production_graph_and_conditions(self):
        real=workflow('release.yml')['jobs'];probe=workflow('release-scheduling.yml')['jobs']
        for key,job in real.items():
            if key=='publish':continue
            self.assertEqual(probe[key].get('needs',[]),job.get('needs',[]),key)
            self.assertEqual(probe[key].get('if'),job.get('if'),key)
        self.assertNotIn('secrets.',str(probe));self.assertNotIn('environment',str(probe))
        workflow_policy.optional_job_status({'jobs':probe},'probe')
    def test_all_transitive_optional_descendants_need_real_status_functions(self):
        original=workflow('release.yml')
        for name in ('assemble','installer','homebrew-native','homebrew','ghcr','attest','publish'):
            for condition in (None,"needs.assemble.result == 'success'","contains('success()', 'success')"):
                data=copy.deepcopy(original)
                if condition is None:data['jobs'][name].pop('if',None)
                else:data['jobs'][name]['if']=condition
                with self.subTest(name=name,condition=condition),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')
``````

<!-- replay-file: {"path":"packaging/release/test_platform.py","mode":"100644","sha256":"8c37c600def60d65debdedcf31022539e2ee4b5d0b2c7bcd7414decdf4c65ad4","encoding":"utf8"} -->
``````python
"""Offline platform acceptance; registry and live-evidence checks use real policy."""
import copy
from pathlib import Path
import unittest
from unittest.mock import patch

import gate
import post_setup
import run_policy
import settings_audit
import workflow_policy
import test_run_policy
from test_settings import settings


class Platform(unittest.TestCase):
    def setUp(self):
        self.fixture = test_run_policy.RunPolicy()
        self.fixture.setUp()

    def validate(self, jobs):
        evidence = copy.deepcopy(self.fixture.evidence)
        evidence['jobs'] = jobs
        return run_policy.validate(self.fixture.metadata, evidence, self.fixture.env, self.fixture.now)

    def test_original_evidence_is_read_only_and_keeps_original_attempt(self):
        calls=[]
        fixture=self.fixture
        class API:
            def get(self, path):
                calls.append(('get',path))
                return {'/actions/runs/42/attempts/1':fixture.evidence['original'],
                        '/actions/artifacts/77':fixture.evidence['artifact'],
                        '/':{'owner':fixture.evidence['owner']},
                        '/actions/runs/42/approvals':fixture.evidence['reviews']}[path]
            def pages(self, path, key):
                calls.append(('pages',path,key))
                self_path='/actions/runs/42/attempts/1/jobs'
                if path!=self_path or key!='jobs': raise AssertionError(path)
                return fixture.evidence['jobs']
        evidence=run_policy.evidence(API(),fixture.metadata,fixture.env)
        self.assertEqual(evidence,fixture.evidence)
        self.assertEqual(len(calls),5)
        self.assertFalse(any('/rulesets' in str(call) or '/environments/' in str(call) for call in calls))

    def test_checked_in_platform_examples_match_policy(self):
        root=Path(__file__).resolve().parents[2]
        rules=gate.strict_json((root/'.github/release-tag-ruleset.json').read_bytes())
        creation=gate.strict_json((root/'.github/release-tag-creation.json').read_bytes())
        self.assertEqual([creation,rules],settings_audit.tag_rulesets(0))
        settings_audit.check_tag_rules([creation,rules],0)
        environment=gate.strict_json((root/'.github/release-environment.example.json').read_bytes())
        self.assertIs(environment['can_admins_bypass'],False)
        self.assertEqual(environment['reviewers'],[{'type':'User','id':0}])
        self.assertEqual(gate.strict_json((root/'.github/release-branch-policy.json').read_bytes()),{'name':'v*','type':'tag'})

    def test_only_unselected_registered_owner_may_skip(self):
        self.validate(self.fixture.evidence['jobs'])
        for channel in workflow_policy.CHANNEL_JOB_IDS:
            self.fixture.metadata['channels']=sorted(['github',channel])
            changed=copy.deepcopy(self.fixture.evidence['jobs'])
            for job in changed:
                if job['name']==channel: job['conclusion']='success'
            self.validate(changed)
            for conclusion,status in [('skipped','completed'),('failure','completed'),('cancelled','completed'),(None,'queued')]:
                broken=copy.deepcopy(changed)
                for job in broken:
                    if job['name']==channel:job.update(conclusion=conclusion,status=status)
                with self.subTest(channel=channel,conclusion=conclusion),self.assertRaises(gate.Refused):self.validate(broken)
            self.fixture.metadata['channels']=['github']
            for mutation in ('absent','duplicate','failure','pending'):
                broken=copy.deepcopy(changed)
                if mutation=='absent':broken=[j for j in broken if j['name']!=channel]
                if mutation=='duplicate':broken += [next(j for j in broken if j['name']==channel)]
                for job in broken:
                    if job['name']==channel and mutation=='failure':job['conclusion']='failure'
                    if job['name']==channel and mutation=='pending':job['status']='queued'
                with self.subTest(channel=channel,mutation=mutation),self.assertRaises(gate.Refused):self.validate(broken)

    def test_skipped_native_and_ordinary_jobs_cannot_hide_in_successful_run(self):
        for name in ('archive','homebrew-native','qualification','installer','attest','licence-review'):
            jobs=copy.deepcopy(self.fixture.evidence['jobs'])
            if name=='licence-review':jobs.append({'name':name,'status':'completed','conclusion':'skipped'})
            else:next(j for j in jobs if j['name']==name)['conclusion']='skipped'
            with self.subTest(name=name),self.assertRaises(gate.Refused):self.validate(jobs)

    def test_reserved_names_require_literal_unique_owning_nonmatrix_job(self):
        for channel,owner in workflow_policy.CHANNEL_JOB_IDS.items():
            valid={'jobs':{owner:{'name':channel},'archive':{}}}
            self.assertEqual(workflow_policy.channel_jobs(valid),{channel:owner})
            for mutation in ('spoof','collision','dynamic','matrix','renamed'):
                workflow=copy.deepcopy(valid)
                if mutation=='spoof':workflow['jobs']={'ordinary':{'name':channel}}
                if mutation=='collision':workflow['jobs']['ordinary']={'name':channel}
                if mutation=='dynamic':workflow['jobs']['ordinary']={'name':"${{ '"+channel+"' }}"}
                if mutation=='matrix':workflow['jobs'][owner]['strategy']={'matrix':{'os':['linux']}}
                if mutation=='renamed':workflow['jobs'][owner]['name']='ordinary'
                with self.subTest(channel=channel,mutation=mutation),self.assertRaises(ValueError):workflow_policy.channel_jobs(workflow)
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            self.assertEqual(workflow_policy.channel_jobs({'jobs':{'container-acceptance':{'name':'ghcr'}}}),{'ghcr':'container-acceptance'})

    def test_workflow_parser_rejects_missing_mapping_and_duplicate_keys(self):
        for raw in ('[]','jobs: {archive: {}, archive: {}}','jobs: {archive: {}, "\\u0061rchive": {}}',
                    '\ufeffjobs: {archive: {}, archive: {}}'):
            with self.subTest(raw=raw),self.assertRaises(ValueError):workflow_policy.load_workflow(raw)
        for raw in ('{}','jobs: []','jobs: {}'):
            with self.subTest(raw=raw),self.assertRaises(ValueError):workflow_policy.channel_jobs(workflow_policy.load_workflow(raw))

    def test_environment_bypass_must_be_explicit_false(self):
        for value in (None,True,'false'):
            data=settings();data['environment']['can_admins_bypass']=value
            with self.subTest(value=value),self.assertRaises(gate.Refused):settings_audit.validate_settings(data,['github'])

    def test_negative_ghcr_acceptance_never_receives_any_release_credential(self):
        post_setup.require_no_release_credentials({'GITHUB_TOKEN':'ordinary-token'})
        for name in ('GHCR_PUBLISH_TOKEN','RELEASE_HOMEBREW_TOKEN','RELEASE_CRATES_BOOTSTRAP_TOKEN','CARGO_REGISTRY_TOKEN'):
            with self.subTest(name=name),self.assertRaises(gate.Refused):post_setup.require_no_release_credentials({name:'secret'})

    def test_negative_acceptance_cli_context_and_read_authentication_refuse_before_push(self):
        import contextlib,io,os,sys
        known=b'known';digest=gate.digest(known)
        environment={'GITHUB_ACTIONS':'true','GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/heads/acceptance',
                     'GITHUB_ACTOR':'marcinwadon','GITHUB_TOKEN':'offline-placeholder','GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'1'}
        calls=[]
        def request(url,headers,method='GET',data=None):
            calls.append((url,method))
            if 'scope=repository:' in url:return 200,gate.canonical({'token':'offline-placeholder'})
            if method=='GET':return 200,known
            return 403,b'denied'
        argv=['post_setup.py','--expected-digest',digest]
        with patch.object(sys,'argv',argv),patch.dict(os.environ,environment,clear=True),patch.object(post_setup,'request',side_effect=request),contextlib.redirect_stdout(io.StringIO()):
            post_setup.main()
        self.assertEqual(calls[-1][1],'PUT')
        for changes in ({'GITHUB_ACTIONS':'false'},{'GITHUB_REPOSITORY':'wrong/repo'},
                        {'GITHUB_REF':'refs/tags/v0.1.0'},{'GHCR_PUBLISH_TOKEN':'placeholder'}):
            with patch.object(sys,'argv',argv),patch.dict(os.environ,environment|changes,clear=True),patch.object(post_setup,'request',side_effect=request) as remote:
                with self.subTest(changes=changes),self.assertRaises(gate.Refused):post_setup.main()
                remote.assert_not_called()
        with patch.object(sys,'argv',['post_setup.py','--expected-digest','bad']),patch.dict(os.environ,environment,clear=True),patch.object(post_setup,'request',side_effect=request) as remote:
            with self.assertRaises(gate.Refused):post_setup.main()
            remote.assert_not_called()
        with patch.object(sys,'argv',argv),patch.dict(os.environ,environment,clear=True),patch.object(post_setup,'request',return_value=(401,gate.canonical({'token':'offline-placeholder'}))) as remote:
            with self.assertRaises(gate.Refused):post_setup.main()
            self.assertEqual(remote.call_count,1)
``````

<!-- replay-file: {"path":"packaging/release/test_publication.py","mode":"100644","sha256":"001f0cd5f915594b9d9fdfcb5fe50026ca0446f13ff95c4f0e6f2804575f97e1","encoding":"utf8"} -->
``````python
"""Draft, immutable publication and retry lifecycle with a fake HTTP boundary."""
import copy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import contract
import gate
import publication


class Publication(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'payload';self.root.mkdir()
        self.signatures=Path(self.tmp.name)/'signatures';self.signatures.mkdir()
        (self.root/'installer.sh').write_bytes(b'exit 0\n')
        contract.freeze(self.root,{'schema':2,'repository':gate.REPOSITORY,'source_sha':'a'*40,'tag':'v0.1.0',
            'tag_object':'b'*40,'channels':['github'],'targets':sorted(gate.TARGETS),'attesting':{'run_id':42,'run_attempt':1}})
        (self.signatures/contract.BUNDLE).write_bytes(b'authentic bundle doubled here')
        self.remote=None;self.assets={};self.events=[];self.fault=None

    def authorize(self):
        self.events.append('verify')
        if self.fault=='gate' or (self.fault=='later-gate' and self.events.count('verify')>1):raise gate.Refused('gate refused')
        return contract.load(self.root)

    def api(self,path,method='GET',data=None,**kwargs):
        import urllib.parse
        if method=='GET':
            if '/assets?' in path:return [{'name':name,'url':'https://api.github.com/repos/'+gate.REPOSITORY+'/releases/assets/'+name} for name in self.assets]
            if '/releases/assets/' in path:return self.assets[path.rsplit('/',1)[1]]
            if self.fault=='late-state' and self.remote and self.remote['immutable']:
                return dict(self.remote,draft=True,immutable=False)
            return copy.deepcopy(self.remote)
        self.events.append(method)
        self.assertEqual(self.events[-2],'verify','each write requires fresh verification')
        if method=='POST' and '/assets?' not in path:
            self.remote={'id':7,'tag_name':'v0.1.0','draft':True,'immutable':False}
            return copy.deepcopy(self.remote)
        if method=='POST':
            name=urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)['name'][0]
            self.assets[name]=data if self.fault!='readback' else data+b'wrong'
            return {'id':len(self.assets)}
        if method=='PATCH':
            self.remote.update(draft=False,immutable=self.fault!='mutable')
            if self.fault=='ambiguous':raise gate.Refused('response lost after successful publication')
            return copy.deepcopy(self.remote)
        self.fail('unexpected HTTP method')

    def run_publish(self):
        with patch.object(publication.transport,'api',side_effect=self.api),patch.object(publication.transport,'asset_bytes',side_effect=lambda a:self.assets[a['name']]):
            return publication.release(self.root,self.signatures,self.authorize)

    def test_verified_draft_upload_readback_and_immutable_publication(self):
        result=self.run_publish()
        self.assertTrue(self.remote and self.remote['immutable'])
        self.assertEqual(result['state'],'immutable')
        self.assertEqual(set(self.assets),{p.name for p in self.root.iterdir()}|{contract.BUNDLE})

    def test_failed_gate_never_creates_or_uploads(self):
        self.fault='gate'
        with self.assertRaises(gate.Refused):self.run_publish()
        self.assertEqual(self.events,['verify'])

    def test_remote_conflict_or_extra_asset_prevents_any_write(self):
        for name,data in [('installer.sh',b'wrong'),('unapproved',b'x')]:
            self.remote={'id':7,'tag_name':'v0.1.0','draft':True,'immutable':False};self.assets={name:data};self.events=[]
            with self.subTest(name=name),self.assertRaises(gate.Refused):self.run_publish()
            self.assertFalse(any(e in ('POST','PATCH') for e in self.events))

    def test_changed_authority_after_preflight_refuses_the_first_mutation(self):
        self.fault='later-gate'
        with self.assertRaises(gate.Refused):self.run_publish()
        self.assertFalse(any(e in ('POST','PATCH') for e in self.events))

    def test_upload_readback_or_immutability_failure_refuses(self):
        for fault in ['readback','mutable','late-state']:
            self.remote=None;self.assets={};self.events=[];self.fault=fault
            with self.subTest(fault=fault),self.assertRaises(gate.Refused):self.run_publish()

    def test_ambiguous_success_is_reconciled_without_republishing_on_retry(self):
        self.fault='ambiguous'
        with self.assertRaises(gate.Refused):self.run_publish()
        self.assertTrue(self.remote['immutable'])
        self.fault=None;self.events=[]
        self.assertEqual(self.run_publish()['state'],'immutable')
        self.assertFalse(any(e in ('POST','PATCH') for e in self.events))

    def test_incomplete_immutable_release_requires_new_version(self):
        self.remote={'id':7,'tag_name':'v0.1.0','draft':False,'immutable':True}
        with self.assertRaises(gate.Refused):self.run_publish()
        self.assertFalse(any(e in ('POST','PATCH') for e in self.events))
``````

<!-- replay-file: {"path":"packaging/release/test_publish.py","mode":"100644","sha256":"f7683a291b7af97c95a5ec1a25ac33d4bf86336d7304ccff87d3ab8e7a40c1e7","encoding":"utf8"} -->
``````python
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
``````

<!-- replay-file: {"path":"packaging/release/test_python_dependencies.py","mode":"100644","sha256":"7ccfccc0d7802eb71db3ea2e2c7fd7b07685a42e8cddf33b578f3b954e3e2b49","encoding":"utf8"} -->
``````python
"""Every runner exercises the stdlib helpers without optional site packages."""
from pathlib import Path
import subprocess
import sys
import textwrap
import unittest


class PythonDependencies(unittest.TestCase):
    def bare(self, program):
        root=Path(__file__).resolve().parent
        prelude=f'''import sys, importlib.util
sys.path.insert(0,{str(root)!r})
assert importlib.util.find_spec('yaml') is None, 'fixture must have no PyYAML'
'''
        return subprocess.run([sys.executable,'-I','-S','-c',prelude+textwrap.dedent(program)],capture_output=True,text=True)

    def test_all_release_helpers_import_without_pyyaml(self):
        result=self.bare('''
            import importlib
            from pathlib import Path
            root=Path(sys.path[0])
            modules=sorted(p.stem for p in root.glob('*.py') if not p.name.startswith('test_') and p.stem!='approval_summary')
            assert len(modules)>=14
            for name in modules: importlib.import_module(name)
            assert 'yaml' not in sys.modules
            print('stdlib helper imports:',','.join(modules))
        ''')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_installer_fixture_builds_without_pyyaml(self):
        result=self.bare('''
            import gate,make_installer_fixture,tempfile
            from pathlib import Path
            with tempfile.TemporaryDirectory() as temporary:
                root=Path(temporary);pristine=root/'installer.sh';output=root/'fixture'
                pristine.write_text('\\n'.join('"hennery-'+target+'.tar.xz")' for target in sorted(gate.TARGETS)))
                make_installer_fixture.make(pristine,output)
                assert (output/'hennery-installer.sh').is_file()
                assert len(list(output.glob('*.tar.xz')))==2*len(gate.TARGETS)+1
        ''')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_missing_parser_refuses_runtime_binding_instead_of_skipping_it(self):
        result=self.bare("""
            import workflow_policy
            try: workflow_policy.load_workflow(b'jobs: {crates: {name: crates}}')
            except ValueError as error: assert 'workflow parser unavailable' in str(error),str(error)
            else: raise AssertionError('missing parser authorized workflow')
        """)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_workflow_policy_cannot_pass_without_parser(self):
        result=self.bare('''
            from pathlib import Path
            import workflow_policy
            try: workflow_policy.check_repository(Path(sys.path[0]).parents[1])
            except ValueError as error: assert 'workflow parser unavailable' in str(error),str(error)
            else: raise AssertionError('CI workflow policy must refuse without its parser')
        ''')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
``````

<!-- replay-file: {"path":"packaging/release/test_registry_bundles.py","mode":"100644","sha256":"c3f261c52d322a7c9602d2291e745d171d564c74180ec33f45dc31ee99bec3f6","encoding":"utf8"} -->
``````python
"""Real pinned ORAS and disposable OCI layouts; no registry, gh or credentials."""
import copy
from contextlib import contextmanager
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1] / 'release'))
import gate
import registry_bundles as bundles

MEDIA = 'application/vnd.oci.image.manifest.v1+json'
INDEX = 'application/vnd.oci.image.index.v1+json'
KIND = 'application/vnd.dev.sigstore.bundle.v0.3+json'
PROVENANCE = 'https://slsa.dev/provenance/v1'
SPDX = 'https://spdx.dev/Document'


def descriptor(raw, media=MEDIA):
    return {'mediaType': media, 'digest': 'sha256:' + gate.digest(raw), 'size': len(raw)}


class RegistryBundles(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='release-referrers-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.layout = self.root / 'registry'; (self.layout / 'blobs/sha256').mkdir(parents=True)
        self.environment = {key: value for key, value in os.environ.items() if key in
                            ('PATH', 'NIX_SSL_CERT_FILE', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'SYSTEMROOT')}
        for key in ('HOME','XDG_CONFIG_HOME','DOCKER_CONFIG','GH_CONFIG_DIR','GNUPGHOME'):
            path = self.root / key.lower(); path.mkdir(); self.environment[key] = str(path)
        for key in ('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'):
            self.environment[key] = 'http://127.0.0.1:9'
        self.environment.update(NO_PROXY='', no_proxy='')
        self.real_run = subprocess.run
        version = self.real_run(['oras','version'], env=self.environment, check=True, capture_output=True, text=True).stdout
        self.assertIn('Version:        1.3.4\n', version, 'ORAS pin changed; requalify the deterministic manifest contract')
        config = self.blob(b'{}', 'application/vnd.oci.empty.v1+json')
        platforms = [self.blob(gate.canonical({'schemaVersion':2,'mediaType':MEDIA,'config':config,'layers':[],
                                            'annotations':{'test.arch':arch}})) for arch in ('amd64','arm64')]
        index = self.blob(gate.canonical({'schemaVersion':2,'mediaType':INDEX,'manifests':platforms}), INDEX)
        (self.layout / 'oci-layout').write_text('{"imageLayoutVersion":"1.0.0"}')
        (self.layout / 'index.json').write_bytes(gate.canonical({'schemaVersion':2,'manifests':[index,*platforms]}))
        self.subjects = []
        for name, subject in [('index',index),('amd64',platforms[0]),('arm64',platforms[1])]:
            for kind in (['provenance'] if name == 'index' else ['provenance','image-sbom','binary-sbom']):
                path = self.root / f'ghcr-{name}-{kind}.json'
                path.write_bytes(gate.canonical({'offlineBundle':name + '-' + kind}))
                self.subjects.append((name,kind,subject['digest'],PROVENANCE if kind == 'provenance' else SPDX,path))
        self.calls = []; self.gates = 0
        # A removed --oci-layout guard must never escape to a network operation.
        # All actual subprocesses are ORAS with fully isolated environment.
        def local_only(command, **kwargs):
            self.assertEqual(command[0], 'oras', 'no other subprocess is authorized')
            if command[1] in ('copy','cp'):
                self.assertIn('--from-oci-layout', command); self.assertIn('--to-oci-layout', command)
            elif command[1] != 'version':
                self.assertIn('--oci-layout', command)
            actual = kwargs['env']
            self.assertEqual(actual['HOME'], self.environment['HOME'])
            self.assertFalse(any('TOKEN' in key or key.startswith(('ACTIONS_','RUNNER_')) for key in actual))
            self.calls.append(list(command))
            return self.real_run(command, **kwargs)
        transport = patch.object(bundles.subprocess, 'run', side_effect=local_only)
        transport.start(); self.addCleanup(transport.stop)

    @contextmanager
    def refusal(self, pattern=None):
        try:
            yield
        except Exception as error:
            self.assertIsInstance(error,gate.Refused,'refusal must retain its fail-closed classification')
            if pattern:self.assertRegex(str(error),pattern)
        else:
            self.fail('expected OCI refusal')

    def blob(self, raw, media=MEDIA):
        desc = descriptor(raw, media)
        path=self.layout / 'blobs/sha256' / desc['digest'][7:]
        if path.exists(): self.assertEqual(path.read_bytes(),raw)
        else: path.write_bytes(raw)
        return desc

    def gate(self):
        self.gates += 1

    def reconcile(self, **kwargs):
        return bundles.reconcile(self.subjects,self.root/'fetched',self.gate,
                                 environment=self.environment,layout=self.layout,**kwargs)

    def copies(self):
        return [c for c in self.calls if c[1] in ('copy','cp')]

    def referrers(self):
        index = gate.strict_json((self.layout/'index.json').read_bytes())
        return [d for d in index['manifests'] if gate.strict_json(
            (self.layout/'blobs/sha256'/d['digest'][7:]).read_bytes()).get('artifactType') == KIND]

    def test_success_fetches_every_frozen_bundle_and_pins_the_manifest_bytes(self):
        fetched = self.reconcile()
        self.assertEqual(len(fetched),7)
        self.assertEqual(len(self.copies()),7);self.assertEqual(self.gates,7)
        self.assertEqual(len(self.referrers()),7)
        for expected,actual in zip(self.subjects,fetched):
            self.assertEqual(actual[:4],expected[:4]);self.assertNotEqual(actual[4],expected[4])
            self.assertTrue(actual[4].is_file())
            self.assertEqual(actual[4].read_bytes(),expected[4].read_bytes())
        for ref in self.referrers():
            raw=(self.layout/'blobs/sha256'/ref['digest'][7:]).read_bytes();value=gate.strict_json(raw)
            self.assertEqual(descriptor(raw),{k:ref[k] for k in ('mediaType','digest','size')})
            self.assertEqual(value['annotations']['org.opencontainers.image.created'],'1970-01-01T00:00:00Z')
            self.assertEqual(value['artifactType'],KIND)
            self.assertEqual(len(value['layers']),1)

    def test_complete_retry_has_no_write_command_or_write_approval(self):
        self.assertEqual(len(self.reconcile()),7)
        before=(self.layout/'index.json').read_bytes();self.calls=[];self.gates=0
        fetched=self.reconcile()
        self.assertEqual(len(fetched),7);self.assertEqual(self.copies(),[]);self.assertEqual(self.gates,0)
        self.assertEqual((self.layout/'index.json').read_bytes(),before)
        self.assertTrue(all(item[4].read_bytes()==original[4].read_bytes() for item,original in zip(fetched,self.subjects)))

    def test_partial_recovery_writes_only_the_four_missing_referrers(self):
        def stop():
            self.gates+=1
            if self.gates==4:raise gate.Refused('test stopped before fourth write')
        with self.refusal('fourth'):
            bundles.reconcile(self.subjects,self.root/'partial',stop,environment=self.environment,layout=self.layout)
        self.assertEqual(len(self.copies()),3)
        existing={p.name:(p.read_bytes(),p.stat().st_mtime_ns) for p in (self.layout/'blobs/sha256').iterdir()}
        self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7);self.assertEqual(len(self.copies()),4);self.assertEqual(self.gates,4)
        self.assertEqual(len(self.referrers()),7)
        for name,state in existing.items():
            path=self.layout/'blobs/sha256'/name
            self.assertEqual((path.read_bytes(),path.stat().st_mtime_ns),state,'existing blob was rewritten')

    def test_lost_success_response_is_reconciled_without_reupload(self):
        original=bundles.subprocess.run;completed=0
        def ambiguous(command,**kwargs):
            nonlocal completed
            result=original(command,**kwargs)
            if command[1] in ('copy','cp'):
                completed+=1
                if completed==3:raise subprocess.CalledProcessError(97,command,stderr=b'offline lost response')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=ambiguous),self.refusal():self.reconcile()
        self.assertEqual(len(self.referrers()),3)
        self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7);self.assertEqual(len(self.copies()),4)

    def test_every_frozen_input_is_regular_and_present_before_any_write(self):
        path=self.subjects[-1][4];raw=path.read_bytes();outside=self.root/'outside';outside.write_bytes(raw)
        for kind in ('missing','symlink','directory'):
            path.unlink(missing_ok=True)
            if kind=='symlink':path.symlink_to(outside)
            if kind=='directory':path.mkdir()
            with self.subTest(kind=kind),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])
            if path.is_dir():path.rmdir()
        path.write_bytes(raw)

    def test_empty_bundle_is_refused_before_any_write(self):
        self.subjects[-1][4].write_bytes(b'')
        with self.refusal():self.reconcile()
        self.assertEqual(self.copies(),[])

    def test_changed_frozen_bundle_at_write_boundary_refuses(self):
        path=self.subjects[0][4]
        def changed():
            self.gates+=1;path.write_bytes(path.read_bytes()+b' ')
        with self.refusal():
            bundles.reconcile(self.subjects,self.root/'fetched',changed,environment=self.environment,layout=self.layout)
        self.assertEqual(self.copies(),[])

    def test_existing_manifest_and_bundle_are_fetched_by_digest_and_checked(self):
        self.assertEqual(len(self.reconcile()),7)
        ref=self.referrers()[0];manifest=self.layout/'blobs/sha256'/ref['digest'][7:]
        raw=manifest.read_bytes();value=gate.strict_json(raw)
        layer=self.layout/'blobs/sha256'/value['layers'][0]['digest'][7:];bundle=layer.read_bytes()
        for kind in ('changed-blob','missing-blob','changed-manifest'):
            self.calls=[]
            # ORAS intentionally marks content-addressed blobs read-only. The
            # adversarial fixture owns these files and explicitly corrupts them.
            layer.chmod(0o600);manifest.chmod(0o600)
            if kind=='changed-blob':layer.write_bytes(bundle+b' ')
            if kind=='missing-blob':layer.unlink()
            if kind=='changed-manifest':manifest.write_bytes(raw+b' ')
            if kind=='missing-manifest':manifest.unlink()
            with self.subTest(kind=kind),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])
            layer.write_bytes(bundle);manifest.write_bytes(raw)

    def test_undiscoverable_missing_manifest_is_repaired_once_then_retry_is_read_only(self):
        self.assertEqual(len(self.reconcile()),7)
        ref=self.referrers()[0];path=self.layout/'blobs/sha256'/ref['digest'][7:]
        path.unlink();self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7)
        self.assertEqual((len(self.copies()),self.gates),(1,1))
        self.calls=[];self.gates=0
        self.assertEqual(len(self.reconcile()),7)
        self.assertEqual((len(self.copies()),self.gates),(0,0))

    def test_advertised_but_unfetchable_manifest_refuses_without_writes(self):
        self.assertEqual(len(self.reconcile()),7)
        missing=self.referrers()[0]['digest'];transport=bundles.subprocess.run
        def absent(command,**kwargs):
            if command[1:3]==['manifest','fetch'] and command[-1].endswith('@'+missing):
                raise subprocess.CalledProcessError(1,command,stderr=b'offline advertised manifest missing')
            return transport(command,**kwargs)
        self.calls=[]
        with patch.object(bundles.subprocess,'run',side_effect=absent),self.refusal('transport failed'):self.reconcile()
        self.assertEqual(self.copies(),[])

    def test_gate_refusal_and_changed_fetched_output_never_become_success(self):
        def refuse():raise gate.Refused('approval withdrawn')
        with self.refusal('approval withdrawn'):
            bundles.reconcile(self.subjects,self.root/'fetched',refuse,environment=self.environment,layout=self.layout)
        self.assertEqual(self.copies(),[])
        fetched=self.reconcile();fetched[0][4].write_bytes(b'changed output');self.calls=[]
        with self.refusal('output changed'):self.reconcile()
        self.assertEqual(self.copies(),[])

    def test_caller_tokens_never_reach_the_actual_oras_subprocess(self):
        self.environment.update(GH_TOKEN='must-not-reach-oras',GITHUB_TOKEN='must-not-reach-oras',
            GHCR_PUBLISH_TOKEN='must-not-reach-oras',ACTIONS_ID_TOKEN_REQUEST_TOKEN='must-not-reach-oras')
        self.assertEqual(len(self.reconcile()),7)

    def test_production_transport_pins_origin_and_auth_while_test_routes_only_to_layout(self):
        auth=self.root/'registry-auth.json';auth.write_text('{}')
        local_transport=bundles.subprocess.run;commands=[]
        def offline_remote(command,**kwargs):
            commands.append(list(command));actual=list(command)
            option='--to-registry-config' if command[1] in ('copy','cp') else '--registry-config'
            position=actual.index(option)
            self.assertEqual(actual[position+1],str(auth.resolve()))
            actual[position:position+2]=['--to-oci-layout' if option.startswith('--to-') else '--oci-layout']
            for index,argument in enumerate(actual):
                if argument.startswith('ghcr.io/'):
                    self.assertTrue(argument.startswith('ghcr.io/marcinwadon/hennery@sha256:'))
                    actual[index]=str(self.layout.resolve())+'@'+argument.split('@',1)[1]
            # This is the only actual subprocess path: the existing local-only
            # transport refuses any remaining remote command before execution.
            return local_transport(actual,**kwargs)
        with patch.object(bundles.subprocess,'run',side_effect=offline_remote):
            fetched=bundles.reconcile(self.subjects,self.root/'fetched',self.gate,
                                      environment=self.environment,auth=auth)
        self.assertEqual(len(fetched),7)
        self.assertTrue(all(any(a.startswith('ghcr.io/marcinwadon/hennery@sha256:') for a in c) for c in commands))

    def test_malformed_discovery_and_untrusted_descriptors_refuse_before_writes(self):
        self.assertEqual(len(self.reconcile()),7)
        transport=bundles.subprocess.run
        for kind in ('missing-list','duplicate-key','escaped-key','bom','bad-digest','bad-size','wrong-type','duplicate-referrer'):
            def altered(command,**kwargs):
                result=transport(command,**kwargs)
                if command[1]=='discover':
                    value=gate.strict_json(result.stdout)
                    if kind=='missing-list':raw=b'{}'
                    elif kind=='duplicate-key':raw=b'{"referrers":[],"REFERRERS":[]}'
                    elif kind=='escaped-key':raw=b'{"referrers":[],"refe\\u0072rers":[]}'
                    elif kind=='bom':raw=b'\xef\xbb\xbf'+result.stdout
                    else:
                        desc=value['referrers'][0]
                        if kind=='bad-digest':desc['digest']='sha512:'+'a'*64
                        if kind=='bad-size':desc['size']=-1
                        if kind=='wrong-type':desc['mediaType']=INDEX
                        if kind=='duplicate-referrer':value['referrers'].append(dict(desc))
                        raw=gate.canonical(value)
                    return subprocess.CompletedProcess(command,0,raw,b'')
                return result
            self.calls=[]
            with self.subTest(kind=kind),patch.object(bundles.subprocess,'run',side_effect=altered),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])

    def test_fetched_subject_manifest_and_blob_bytes_are_checked_independently_of_oras(self):
        self.assertEqual(len(self.reconcile()),7);transport=bundles.subprocess.run
        for kind in ('subject','referrer','bundle','config'):
            ref=self.referrers()[0];manifest=gate.strict_json((self.layout/'blobs/sha256'/ref['digest'][7:]).read_bytes())
            digest={'subject':self.subjects[0][2],'referrer':ref['digest'],
                    'bundle':manifest['layers'][0]['digest'],'config':manifest['config']['digest']}[kind]
            def altered(command,**kwargs):
                result=transport(command,**kwargs)
                if command[1] in ('manifest','blob') and command[-1].endswith('@'+digest):
                    return subprocess.CompletedProcess(command,0,result.stdout+b' ',b'')
                return result
            self.calls=[]
            with self.subTest(kind=kind),patch.object(bundles.subprocess,'run',side_effect=altered),self.refusal('digest or size differs|subject digest differs'):self.reconcile()
            self.assertEqual(self.copies(),[])

    def test_new_write_requires_visible_referrer_readback(self):
        transport=bundles.subprocess.run;discoveries=0
        def invisible(command,**kwargs):
            nonlocal discoveries
            result=transport(command,**kwargs)
            if command[1]=='discover':
                discoveries+=1
                if discoveries==5:return subprocess.CompletedProcess(command,0,b'{"referrers":[]}',b'')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=invisible),self.refusal('missing from read-back'):
            self.reconcile()
        self.assertEqual(len(self.copies()),1)

    def test_final_discovery_must_still_cover_the_complete_bundle_set(self):
        transport=bundles.subprocess.run;discoveries=0
        def incomplete(command,**kwargs):
            nonlocal discoveries
            result=transport(command,**kwargs)
            if command[1]=='discover':
                discoveries+=1
                if discoveries>=18:return subprocess.CompletedProcess(command,0,b'{"referrers":[]}',b'')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=incomplete),self.refusal('set incomplete'):
            self.reconcile()
        self.assertEqual(len(self.copies()),7)

    def test_frozen_inputs_cannot_change_during_final_readback(self):
        transport=bundles.subprocess.run;discoveries=0
        def changed(command,**kwargs):
            nonlocal discoveries
            result=transport(command,**kwargs)
            if command[1]=='discover':
                discoveries+=1
                if discoveries==18:
                    path=self.subjects[0][4];path.write_bytes(path.read_bytes()+b' ')
            return result
        with patch.object(bundles.subprocess,'run',side_effect=changed),self.refusal('changed during reconciliation'):
            self.reconcile()
        self.assertEqual(len(self.copies()),7)

    def test_wrong_or_duplicate_subject_selection_refuses_before_transport(self):
        for mutation in ('missing','duplicate','extra-duplicate','predicate','digest','name','kind','filename','different-platform','same-digests'):
            subjects=list(self.subjects)
            if mutation=='missing':subjects.pop()
            if mutation=='duplicate':subjects[-1]=subjects[0]
            if mutation=='extra-duplicate':subjects.append(subjects[0])
            if mutation=='filename':
                path=self.root/'unbound.json';path.write_bytes(subjects[1][4].read_bytes())
                subjects[1]=(*subjects[1][:4],path)
            if mutation=='different-platform':subjects[2]=(*subjects[2][:2],subjects[4][2],*subjects[2][3:])
            if mutation=='same-digests':subjects=[(*row[:2],subjects[0][2],*row[3:]) for row in subjects]
            if mutation=='predicate':subjects[1]=(*subjects[1][:3],SPDX,subjects[1][4])
            if mutation=='digest':subjects[1]=(*subjects[1][:2],'sha512:'+'a'*64,*subjects[1][3:])
            if mutation=='name':subjects[0]=('other',*subjects[0][1:])
            if mutation=='kind':subjects[0]=(subjects[0][0],'other',*subjects[0][2:])
            self.calls=[]
            with self.subTest(mutation=mutation),self.refusal():
                bundles.reconcile(subjects,self.root/'fetched',self.gate,environment=self.environment,layout=self.layout)
            self.assertEqual(self.calls,[])

    def test_descriptor_validator_refuses_malformed_or_unbounded_inputs(self):
        good={'mediaType':MEDIA,'digest':'sha256:'+'a'*64,'size':1}
        bundles.valid_descriptor(good)
        for value in (None,{},good|{'digest':None},good|{'digest':'sha512:'+'a'*64},
                      good|{'size':True},good|{'size':0},good|{'size':16*1024*1024+1}):
            with self.subTest(value=value),self.refusal():bundles.valid_descriptor(value)

    def test_referrers_completed_during_approval_are_not_copied_again(self):
        transport=bundles.subprocess.run;other=False;completed=False;our_writes=[]
        def record(command,**kwargs):
            if command[1] in ('copy','cp') and not other:our_writes.append(command)
            return transport(command,**kwargs)
        def another_writer():
            nonlocal other,completed
            if not completed:
                completed=True;other=True
                try:bundles.reconcile(self.subjects,self.root/'other-fetched',lambda:None,environment=self.environment,layout=self.layout)
                finally:other=False
        with patch.object(bundles.subprocess,'run',side_effect=record):
            fetched=bundles.reconcile(self.subjects,self.root/'fetched',another_writer,environment=self.environment,layout=self.layout)
        self.assertEqual(len(fetched),7);self.assertEqual(our_writes,[])
        self.assertEqual(len(self.copies()),7)

    def test_referrer_metadata_cannot_silently_select_different_bundle_bytes(self):
        self.assertEqual(len(self.reconcile()),7)
        # An extra Sigstore referrer with a valid content-addressed blob is still
        # a conflict if its frozen manifest/predicate/subject differs.
        ref=self.referrers()[0];raw=(self.layout/'blobs/sha256'/ref['digest'][7:]).read_bytes()
        original=gate.strict_json((self.layout/'index.json').read_bytes())
        for field in ('created','predicate','subject','layer'):
            changed=gate.strict_json(raw)
            if field=='created':changed['annotations']['org.opencontainers.image.created']='2026-10-16T00:00:00Z'
            if field=='predicate':changed['annotations']['dev.sigstore.bundle.predicateType']=PROVENANCE if changed['annotations']['dev.sigstore.bundle.predicateType']==SPDX else SPDX
            if field=='subject':changed['subject']['size']+=1
            if field=='layer':changed['layers'][0]=self.blob(b'other',KIND)
            self.assertNotEqual(gate.canonical(changed),raw)
            extra=self.blob(gate.canonical(changed));extra['artifactType']=KIND
            index=copy.deepcopy(original);index['manifests'].append(extra)
            (self.layout/'index.json').write_bytes(gate.canonical(index));self.calls=[]
            with self.subTest(field=field),self.refusal():self.reconcile()
            self.assertEqual(self.copies(),[])
            (self.layout/'index.json').write_bytes(gate.canonical(original))


if __name__=='__main__':unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_release_run.py","mode":"100644","sha256":"f3ecde5a36cb36c6d70619b15f9bca5e5c4f32972974843d1402569007b547cb","encoding":"utf8"} -->
``````python
import contextlib
import io
import os
from pathlib import Path
import tempfile
import tomllib
import unittest
from unittest.mock import patch

import contract
import gate
import release_run
import test_contract


class Orchestrator(unittest.TestCase):
    def test_configuration_binds_original_signed_tag_and_checked_source(self):
        version=tomllib.loads((release_run.ROOT/'Cargo.toml').read_text())['workspace']['package']['version']
        env={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_EVENT_NAME':'push','GITHUB_REF':'refs/tags/v'+version,
             'GITHUB_REF_NAME':'v'+version,'GITHUB_SHA':'a'*40,'GITHUB_RUN_ATTEMPT':'1'}
        with patch.dict(os.environ,env,clear=True),patch.object(release_run.tag_signature,'verify',return_value={'object_sha':'b'*40}):
            self.assertEqual(release_run.configuration()['channels'],['github'])
            for field,value in [('GITHUB_RUN_ATTEMPT','2'),('GITHUB_REF','refs/heads/main'),('GITHUB_REPOSITORY','other/repo'),('GITHUB_EVENT_NAME','workflow_dispatch'),('GITHUB_REF_NAME','v9.9.9')]:
                with self.subTest(field=field),patch.dict(os.environ,{field:value}),self.assertRaises(gate.Refused):release_run.configuration()

    def test_summary_lists_every_asset_and_original_attempt_without_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();test_contract.Contract().fixture(root)
            signatures=Path(tmp)/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_bytes(b'bundle')
            output=io.StringIO()
            with patch.dict(os.environ,{'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'1'}),contextlib.redirect_stdout(output):
                release_run.summary(root,signatures)
            for directory in (root,signatures):
                for p in directory.iterdir():self.assertIn(p.name,output.getvalue());self.assertIn(gate.digest(p.read_bytes()),output.getvalue())
            self.assertIn('No draft exists',output.getvalue())
            with patch.dict(os.environ,{'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'2'}),self.assertRaises(gate.Refused):release_run.summary(root,signatures)

    def test_attestation_check_refuses_rerun_before_signing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);test_contract.Contract().fixture(root)
            with patch.dict(os.environ,{'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'2'}),self.assertRaises(gate.Refused):
                release_run.check_original(root)

    def test_every_optional_channel_needs_selection_and_its_explicit_switch(self):
        for channel in ('homebrew','crates','ghcr'):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);test_contract.Contract().fixture(root)
                value=contract.load(root)
                with patch.dict(os.environ,{'GH_TOKEN':'offline'}),patch.object(release_run.run_policy,'evidence',return_value={}),patch.object(release_run.run_policy,'validate'),patch.object(release_run.contract,'load',return_value=value),self.assertRaises(gate.Refused):
                    release_run.verify(root,root,channel)
                value['channels']=sorted(['github',channel])
                for flag in ('','false'):
                    with self.subTest(channel=channel,flag=flag),patch.dict(os.environ,{'GH_TOKEN':'offline','RELEASE_'+channel.upper()+'_ENABLED':flag}),patch.object(release_run.run_policy,'evidence',return_value={}),patch.object(release_run.run_policy,'validate'),patch.object(release_run.contract,'load',return_value=value),self.assertRaises(gate.Refused):
                        release_run.verify(root,root,channel)

    def test_channels_require_all_public_immutable_bytes_including_sidecars(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();test_contract.Contract().fixture(root)
            signatures=Path(tmp)/'signatures';signatures.mkdir();(signatures/contract.BUNDLE).write_bytes(b'bundle')
            value=contract.load(root);remote={'id':42,'tag_name':value['tag'],'draft':False,'immutable':True}
            files={p.name:p.read_bytes() for folder in (root,signatures) for p in folder.iterdir()}
            assets=[{'name':name} for name in files]
            with patch.object(release_run.publish,'release_assets',return_value=assets),patch.object(release_run.publish,'asset_bytes',side_effect=lambda a:files[a['name']]):
                with patch.object(release_run.publish,'api',return_value=remote):release_run.require_public(root,signatures,value)
                for change in ({'draft':True},{'immutable':False},{'tag_name':'v9.0.0'}):
                    with self.subTest(change=change),patch.object(release_run.publish,'api',return_value=remote|change),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
                with patch.object(release_run.publish,'api',return_value=remote):
                    with patch.object(release_run.publish,'asset_bytes',return_value=b'wrong'),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
                    with patch.object(release_run.publish,'release_assets',return_value=assets[:-1]),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
                    with patch.object(release_run.publish,'release_assets',return_value=assets+assets[:1]),self.assertRaises(gate.Refused):release_run.require_public(root,signatures,value)
``````

<!-- replay-file: {"path":"packaging/release/test_run_policy.py","mode":"100644","sha256":"1bb24f51c9b5b68f0f9b4371823d748f12344023a758e7547be92fa6c34b841b","encoding":"utf8"} -->
``````python
import copy
from datetime import datetime, timezone
import unittest

import contract
import gate
import run_policy


class RunPolicy(unittest.TestCase):
    def setUp(self):
        self.metadata={'schema':2,'repository':gate.REPOSITORY,'tag':'v0.1.0','source_sha':'a'*40,'tag_object':'b'*40,
                       'channels':['github'],'targets':sorted(gate.TARGETS),'attesting':{'run_id':42,'run_attempt':1}}
        self.env={'GITHUB_REPOSITORY':gate.REPOSITORY,'GITHUB_REF':'refs/tags/v0.1.0','GITHUB_SHA':'a'*40,
                  'GITHUB_EVENT_NAME':'push','GITHUB_WORKFLOW_REF':gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',
                  'GITHUB_RUN_ID':'42','GITHUB_RUN_ATTEMPT':'2','RELEASE_ARTIFACT_ID':'77',
                  'RELEASE_ATTESTING_ATTEMPT':'1','RELEASE_PUBLICATION_ENABLED':'true','RELEASE_GITHUB_ENABLED':'true'}
        run={'id':42,'run_attempt':1,'head_sha':'a'*40,'head_branch':'v0.1.0','event':'push','path':contract.WORKFLOW,
             'repository':{'full_name':gate.REPOSITORY},'created_at':'2026-10-01T00:00:00Z'}
        jobs=[{'name':name,'status':'completed','conclusion':'success'} for name in
              ('tag-signature','qualification','web-ui','archive','assemble','installer','attest','homebrew-native')]
        jobs += [dict(j) for j in list(jobs) if j['name'] in ('qualification','archive','installer','homebrew-native') for _ in range(2)]
        jobs += [{'name':name,'status':'completed','conclusion':'skipped'} for name in ('crates','ghcr','homebrew')]
        self.evidence={'original':run,'jobs':jobs,'artifact':{'id':77,'name':'attested-release-42-1','expired':False,
             'workflow_run':{'id':42,'head_sha':'a'*40}}, 'owner':{'login':'marcinwadon','id':9},
             'reviews':[{'state':'approved','comment':'publish-run:42:attempt:2','user':{'id':9},'environments':[{'name':'release'}]}]}
        self.now=datetime(2026,10,16,tzinfo=timezone.utc)

    def test_publish_retry_keeps_original_attesting_attempt(self):
        self.assertEqual(run_policy.validate(self.metadata,self.evidence,self.env,self.now),self.metadata)

    def test_wrong_context_artifact_run_review_and_window_each_refuse(self):
        for field,value in [('GITHUB_REPOSITORY','other/repo'),('GITHUB_REF','refs/heads/main'),('GITHUB_SHA','c'*40),
            ('GITHUB_EVENT_NAME','workflow_dispatch'),('GITHUB_WORKFLOW_REF',self.env['GITHUB_WORKFLOW_REF'].replace('release.yml','other.yml')),
            ('GITHUB_RUN_ID','43'),('GITHUB_RUN_ATTEMPT','52'),('RELEASE_ATTESTING_ATTEMPT','2'),
            ('RELEASE_ARTIFACT_ID','78'),('RELEASE_PUBLICATION_ENABLED','false'),('RELEASE_GITHUB_ENABLED','false')]:
            env=dict(self.env);env[field]=value
            with self.subTest(field=field),self.assertRaises(gate.Refused):run_policy.validate(self.metadata,self.evidence,env,self.now)
        for mutation in ['expired','wrong-artifact-run','wrong-attempt','wrong-source','wrong-workflow','old-window',
                         'missing-review','old-review','other-reviewer','rejected','missing-job','failed-job','skipped-job']:
            data=copy.deepcopy(self.evidence)
            if mutation=='expired':data['artifact']['expired']=True
            if mutation=='wrong-artifact-run':data['artifact']['workflow_run']['id']=43
            if mutation=='wrong-attempt':data['original']['run_attempt']=2
            if mutation=='wrong-source':data['original']['head_sha']='c'*40
            if mutation=='wrong-workflow':data['original']['path']='.github/workflows/other.yml'
            if mutation=='old-window':data['original']['created_at']='2026-09-01T00:00:00Z'
            if mutation=='missing-review':data['reviews']=[]
            if mutation=='old-review':data['reviews'][0]['comment']='publish-run:42:attempt:1'
            if mutation=='other-reviewer':data['reviews'][0]['user']['id']=8
            if mutation=='rejected':data['reviews'][0]['state']='rejected'
            if mutation=='missing-job':data['jobs']=[j for j in data['jobs'] if j['name']!='installer']
            if mutation=='failed-job':data['jobs'][0]['conclusion']='failure'
            if mutation=='skipped-job':data['jobs'][0]['conclusion']='skipped'
            with self.subTest(mutation=mutation),self.assertRaises(gate.Refused):run_policy.validate(self.metadata,data,self.env,self.now)

    def test_selected_acceptance_cannot_be_missing_or_skipped(self):
        meta=copy.deepcopy(self.metadata);meta['targets']=meta['targets'][:1]
        with self.assertRaises(gate.Refused):run_policy.validate(meta,self.evidence,self.env,self.now)
        for channel in ['crates','ghcr','homebrew']:
            meta=copy.deepcopy(self.metadata);meta['channels']=sorted(['github',channel])
            with self.subTest(channel=channel),self.assertRaises(gate.Refused):run_policy.validate(meta,self.evidence,self.env,self.now)

    def test_initial_attempt_requires_owner_approval_without_retry_comment(self):
        self.env['GITHUB_RUN_ATTEMPT']='1';self.evidence['reviews'][0]['comment']=''
        self.assertEqual(run_policy.validate(self.metadata,self.evidence,self.env,self.now),self.metadata)
``````

<!-- replay-file: {"path":"packaging/release/test_settings.py","mode":"100644","sha256":"2a5fdb65b7e101c9511e5fad1fe61b93e9e06cdfcd1f33d952f4f85922f6ad89","encoding":"utf8"} -->
``````python
import copy
from datetime import datetime, timezone
import unittest

import gate
import settings_audit


def settings():
    return {
        'owner': {'login': 'marcinwadon', 'id': 123, 'type': 'User'},
        'environment': {'id': 7, 'name': 'release', 'can_admins_bypass': False,
                        'protection_rules': [{'type': 'required_reviewers', 'reviewers': [{'type': 'User', 'reviewer': {'id': 123}}]}],
                        'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True}},
        'deployment_policies': [{'name': 'v*', 'type': 'tag'}],
        'rulesets': settings_audit.tag_rulesets(123),
        'repository_secrets': [], 'release_secrets': ['GHCR_PUBLISH_TOKEN'],
        'immutable_releases': True,
        'maintainer_touch': {'confirmed': True, 'fingerprint': 'F26C7F594DFE84D131703AFC23E5A318AE8D2861', 'policy': 'on'},
        'release_vars': {'GHCR_PUBLISH_USER': 'marcinwadon'},
        'ghcr': {'repository': gate.REPOSITORY, 'actions_access': 'read', 'dedicated_credential': 'GHCR_PUBLISH_TOKEN',
                 'negative_push': {'read_status': 200, 'push_status': 403, 'credential': 'GITHUB_TOKEN'}},
        'crates': [{'crate': name, 'repository': gate.REPOSITORY, 'workflow': 'release.yml', 'environment': 'release'} for name in settings_audit.CRATES],
    }


class Settings(unittest.TestCase):
    def test_platform_settings_and_each_independent_refusal(self):
        valid = settings(); settings_audit.validate_settings(valid, ['crates', 'ghcr', 'github'])
        mutations = [
            lambda s: s['owner'].update(login='untrusted'),
            lambda s: s.update(deployment_policies=[{'name': 'main', 'type': 'branch'}]),
            lambda s: s['environment'].update(can_admins_bypass=True),
            lambda s: s['environment'].update(name='other'),
            lambda s: s['environment'].update(deployment_branch_policy=None),
            lambda s: s.update(release_secrets=[]),
            lambda s: s['release_vars'].update(GHCR_PUBLISH_USER=''),
            lambda s: s['ghcr'].update(dedicated_credential='GITHUB_TOKEN'),
            lambda s: s['crates'].pop(),
            lambda s: s['environment']['protection_rules'][0]['reviewers'][0]['reviewer'].update(id=999),
            lambda s: s['environment']['protection_rules'][0]['reviewers'][0].update(type='Team'),
            lambda s: s['rulesets'][0].update(bypass_actors=[{'actor_type': 'RepositoryRole', 'actor_id': 4, 'bypass_mode': 'always'}]),
            lambda s: s['rulesets'][1].update(bypass_actors=[{'actor_type': 'User', 'actor_id': 123, 'bypass_mode': 'always'}]),
            lambda s: s['rulesets'][1].update(rules=[{'type': 'update'}]),
            lambda s: s['rulesets'][0].update(enforcement='disabled'),
            lambda s: s['rulesets'][1].update(enforcement='disabled'),
            lambda s: s['rulesets'][1].update(target='branch'),
            lambda s: s['rulesets'][0]['conditions']['ref_name'].update(exclude=['refs/tags/v*']),
            lambda s: s.update(repository_secrets=['PUBLISH_TOKEN']),
            lambda s: s.update(immutable_releases=False),
            lambda s: s['ghcr'].update(actions_access='write'),
            lambda s: s['ghcr']['negative_push'].update(push_status=201),
            lambda s: s['ghcr']['negative_push'].update(read_status=401),
            lambda s: s['ghcr']['negative_push'].update(credential='dedicated-publisher'),
            lambda s: s['crates'][0].update(environment=None),
            lambda s: s['crates'][0].update(workflow='branch.yml'),
        ]
        for mutate in mutations:
            bad = copy.deepcopy(valid); mutate(bad)
            with self.subTest(settings=bad), self.assertRaises(gate.Refused):
                settings_audit.validate_settings(bad, ['crates', 'ghcr', 'github'])

    def test_local_acceptance_report_has_no_candidate_or_approval_authority(self):
        now = datetime(2026, 10, 16, tzinfo=timezone.utc)
        value = settings_audit.report(settings(), ['github'], now)
        self.assertEqual(value['schema'], 2)
        self.assertEqual(value['purpose'], 'maintainer-local-platform-acceptance')
        self.assertEqual(value['channels'], ['github'])
        self.assertEqual(value['checked_at'], now.isoformat())
        for obsolete in ('candidate', 'inventory_sha256', 'settings_audit_sha256'):
            self.assertNotIn(obsolete, value)

    def test_runtime_policy_reader_never_requests_private_settings(self):
        import inspect
        import run_policy
        code = inspect.getsource(run_policy.evidence)
        for forbidden in ['/rulesets', '/environments/release', 'settings_audit']:
            self.assertNotIn(forbidden, code)

    def test_github_needs_no_uploaded_app_or_stored_write_token(self):
        valid = settings(); valid['release_secrets'] = []
        settings_audit.validate_settings(valid, ['github'])
        for obsolete in ('RELEASE_PUBLISH_APP_KEY', 'RELEASE_PUBLISH_APP_ID', 'GITHUB_TOKEN',
                         'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'):
            bad = copy.deepcopy(valid); bad['release_secrets'] = [obsolete]
            with self.subTest(secret=obsolete), self.assertRaises(gate.Refused):
                settings_audit.validate_settings(bad, ['github'])

    def test_crates_bootstrap_is_explicit_scoped_temporary_and_never_fallback(self):
        valid = settings(); valid['release_secrets'].append('RELEASE_CRATES_BOOTSTRAP_TOKEN')
        valid['release_vars']['RELEASE_CRATES_BOOTSTRAP_ENABLED'] = 'true'
        valid['crates'] = []
        valid['crates_bootstrap'] = {'publish_only': True, 'crate_names': sorted(settings_audit.CRATES),
                                    'scope_confirmed': True, 'revocation_required': True}
        settings_audit.validate_settings(valid, ['crates', 'github'])
        mutations = [lambda s: s['release_secrets'].remove('RELEASE_CRATES_BOOTSTRAP_TOKEN'),
                     lambda s: s.pop('crates_bootstrap'),
                     lambda s: s['crates_bootstrap'].update(publish_only=False),
                     lambda s: s['crates_bootstrap']['crate_names'].pop(),
                     lambda s: s['crates_bootstrap'].update(revocation_required=False),
                     lambda s: s['crates_bootstrap'].update(scope_confirmed=False)]
        for mutate in mutations:
            bad = copy.deepcopy(valid); mutate(bad)
            with self.subTest(settings=bad), self.assertRaises(gate.Refused):
                settings_audit.validate_settings(bad, ['crates', 'github'])
        valid['release_vars']['RELEASE_CRATES_BOOTSTRAP_ENABLED'] = 'false'
        with self.assertRaises(gate.Refused): settings_audit.validate_settings(valid, ['crates', 'github'])
        trusted = settings(); trusted['release_secrets'].append('RELEASE_CRATES_BOOTSTRAP_TOKEN')
        with self.assertRaises(gate.Refused): settings_audit.validate_settings(trusted, ['crates', 'github'])

    def test_local_acceptance_checks_signed_tag_before_owner_settings_auth(self):
        import contextlib, io, sys, tempfile
        from pathlib import Path
        from unittest.mock import patch
        import contract
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload'; root.mkdir(); (root/'example').write_bytes(b'bytes')
            metadata={'schema':2,'repository':gate.REPOSITORY,'source_sha':'a'*40,'tag':'v0.1.0',
                      'tag_object':'b'*40,'channels':['github'],'targets':sorted(gate.TARGETS),
                      'attesting':{'run_id':42,'run_attempt':1}}
            contract.freeze(root, metadata)
            observations=Path(tmp)/'observations.json';observations.write_text('{}')
            argv=['settings_audit.py','--payload',str(root),'--observations',str(observations),'--output',str(Path(tmp)/'acceptance.json')]
            with patch.object(sys,'argv',argv),patch('tag_signature.verify',side_effect=gate.Refused('local signed tag refused')),patch.object(settings_audit,'collect',return_value=settings()) as collect,patch('builtins.input',return_value=gate.REPOSITORY),contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(gate.Refused,'local signed tag refused'): settings_audit.main()
                collect.assert_not_called()

    def test_switch_types_and_removed_storage_or_app_vars_refuse(self):
        for change in ({'RELEASE_GITHUB_ENABLED':True}, {'RELEASE_CRATES_ENABLED':'TRUE'},
                       {'RELEASE_PUBLISH_APP_ID':'old'}, {'RELEASE_CANDIDATE_BUCKET':'old'},
                       {'RELEASE_AUDIT_BUCKET':'old'}, {'AWS_REGION':'old'}):
            data=settings();data['release_vars'].update(change)
            with self.subTest(change=change),self.assertRaises(gate.Refused):
                settings_audit.validate_settings(data,['github'])

    def test_touch_is_a_personal_confirmation_of_the_pinned_key(self):
        for change in ({'confirmed':False},{'fingerprint':'A'*40},{'policy':'off'}):
            data=settings();data['maintainer_touch'].update(change)
            with self.subTest(change=change),self.assertRaises(gate.Refused):
                settings_audit.validate_settings(data,['github'])
        data=settings();data['maintainer_touch']['policy']='cached-fixed'
        settings_audit.validate_settings(data,['github'])

    def test_settings_access_is_local_only_and_wrong_account_refuses(self):
        from unittest.mock import patch
        with patch.dict('os.environ',{'GITHUB_ACTIONS':'true'}),patch.object(settings_audit.subprocess,'run',return_value=__import__('types').SimpleNamespace(stdout=b'{}')) as run:
            with self.assertRaises(gate.Refused):settings_audit.gh('/user')
            run.assert_not_called()
        owner=settings()['owner']
        calls=[]
        def fake(path):
            calls.append(path)
            return {'login':'other','id':999} if path=='/user' else {'owner':owner}
        with patch.object(settings_audit,'gh',side_effect=fake):
            with self.assertRaises(gate.Refused):settings_audit.collect({})
        self.assertEqual(calls,['/user','/repos/'+gate.REPOSITORY])

    def test_pages_refuse_malformed_or_unbounded_results(self):
        from unittest.mock import patch
        with patch.object(settings_audit,'gh',return_value={'variables':{}}):
            with self.assertRaises(gate.Refused):settings_audit.pages('/example','variables')
        with patch.object(settings_audit,'gh',return_value=[{}]*100) as gh:
            with self.assertRaises(gate.Refused):settings_audit.pages('/example')
            self.assertEqual(gh.call_count,100)
        with patch.object(settings_audit,'gh',side_effect=[[{}]*100,[{'name':'last'}]]):
            self.assertEqual(len(settings_audit.pages('/example')),101)

    def test_invalid_selection_refuses(self):
        for channels in ([],['homebrew'],['unknown','github'],['github','github'],['homebrew','github']):
            with self.subTest(channels=channels),self.assertRaises(gate.Refused):
                settings_audit.validate_settings(settings(),channels)

    def test_main_confirmation_and_create_only_report(self):
        import contextlib, io, sys, tempfile
        from pathlib import Path
        from unittest.mock import patch
        import contract
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();(root/'example').write_bytes(b'bytes')
            metadata={'schema':2,'repository':gate.REPOSITORY,'source_sha':'a'*40,'tag':'v0.1.0',
                      'tag_object':'b'*40,'channels':['github'],'targets':sorted(gate.TARGETS),
                      'attesting':{'run_id':42,'run_attempt':1}}
            contract.freeze(root,metadata)
            observations=Path(tmp)/'observations.json';observations.write_text('{}')
            output=Path(tmp)/'acceptance.json'
            argv=['settings_audit.py','--payload',str(root),'--observations',str(observations),'--output',str(output)]
            with patch.object(sys,'argv',argv),patch('tag_signature.verify',autospec=True,return_value={'verified':True}),patch.object(settings_audit,'collect',return_value=settings()),contextlib.redirect_stdout(io.StringIO()):
                with patch('builtins.input',return_value='no'),self.assertRaises(gate.Refused):settings_audit.main()
                self.assertFalse(output.exists())
                with patch('builtins.input',return_value=gate.REPOSITORY):settings_audit.main()
                raw=output.read_bytes();self.assertEqual(gate.strict_json(raw)['purpose'],'maintainer-local-platform-acceptance')
                with patch('builtins.input',return_value=gate.REPOSITORY),self.assertRaises(FileExistsError):settings_audit.main()
                self.assertEqual(output.read_bytes(),raw)

    def test_observation_template_does_not_claim_unperformed_acceptance(self):
        from pathlib import Path
        data=gate.strict_json((Path(__file__).with_name('example-observations.json')).read_bytes())
        self.assertIs(data['maintainer_touch']['confirmed'],False)
        self.assertIs(data['homebrew']['scope_confirmed'],False)
        self.assertIsNone(data['ghcr']['negative_push']['read_status'])
        self.assertIsNone(data['ghcr']['negative_push']['push_status'])
        self.assertIs(data['crates_bootstrap']['scope_confirmed'],False)
        self.assertEqual({c['crate'] for c in data['crates']},set(settings_audit.CRATES))
        self.assertTrue(all(c['workflow']=='release.yml' and c['environment']=='release' for c in data['crates']))
``````

<!-- replay-file: {"path":"packaging/release/test_single_workflow.py","mode":"100644","sha256":"1bdeb1c582fa757d5e3ea4e948dbb7f960e7af667d94e66d31eca22ee7366b0a","encoding":"utf8"} -->
``````python
"""Negative authority/DAG tests for the single tagged orchestrator."""
import copy
from pathlib import Path
import unittest

import workflow_policy

ROOT=Path(__file__).resolve().parents[2]


class SingleWorkflow(unittest.TestCase):
    def data(self):
        path=ROOT/'.github/workflows/release.yml'
        self.assertTrue(path.is_file(),'single tag workflow must exist')
        return workflow_policy.load_workflow(path.read_bytes())

    def test_real_workflow_has_only_one_protected_writer(self):
        data=self.data()
        try:workflow_policy.check(data,'release.yml')
        except ValueError as error:self.fail(str(error))
        writers=[name for name,job in data['jobs'].items() if job.get('permissions',{}).get('contents')=='write']
        self.assertEqual(writers,['publish'])
        self.assertEqual(data['jobs']['publish']['environment'],'release')

    def test_every_authority_guard_refuses_its_removal(self):
        original=self.data()
        for mutation in ['branch','dispatch','outside-write','missing-env','no-attest','no-gate','no-summary','unpin',
                         'ignored','reusable','cache','credential-first','job-secret','channel-switch','wrong-owner',
                         'missing-status','optional-descendant','dag-cycle','missing-dependency','unqualified-attest','missing-attest-check','oidc-bypass']:
            data=copy.deepcopy(original);jobs=data['jobs'];publisher=jobs['publish']
            if mutation=='branch':data['on']={'push':{'branches':['main']}};data.pop(True,None)
            if mutation=='dispatch':data['on']={'workflow_dispatch':{}};data.pop(True,None)
            if mutation=='outside-write':jobs['archive']['permissions']={'contents':'write'}
            if mutation=='missing-env':publisher.pop('environment')
            if mutation=='no-attest':publisher['needs']=[]
            if mutation=='no-gate':publisher['steps']=[s for s in publisher['steps'] if s.get('id')!='verified']
            if mutation=='no-summary':jobs['attest']['steps']=[s for s in jobs['attest']['steps'] if s.get('id')!='summary']
            if mutation=='unpin':jobs['archive']['steps'][0]['uses']='actions/checkout@v4'
            if mutation=='ignored':jobs['archive']['continue-on-error']=True
            if mutation=='reusable':jobs['archive']['uses']='./.github/workflows/other.yml'
            if mutation=='cache':jobs['archive']['steps'].append({'uses':'actions/cache@'+'a'*40})
            if mutation=='credential-first':publisher['steps'].insert(0,{'env':{'TOKEN':'${{ secrets.GHCR_PUBLISH_TOKEN }}'},'run':'true'})
            if mutation=='job-secret':publisher['env']={'TOKEN':'${{ secrets.GHCR_PUBLISH_TOKEN }}'}
            if mutation=='channel-switch':next(s for s in publisher['steps'] if s.get('id')=='homebrew-publish')['if']='true'
            if mutation=='wrong-owner':jobs['homebrew']['name']='other'
            if mutation=='missing-status':jobs['installer'].pop('if')
            if mutation=='optional-descendant':jobs['later']={'needs':'installer','timeout-minutes':1,'steps':[{'run':'true'}]}
            if mutation=='dag-cycle':jobs['assemble']['needs'].append('homebrew')
            if mutation=='missing-dependency':jobs['attest']['needs'].remove('qualification')
            if mutation=='unqualified-attest':jobs['attest']['if']=jobs['attest']['if'].replace("needs.qualification.result == 'success'",'true')
            if mutation=='missing-attest-check':jobs['attest']['steps']=[s for s in jobs['attest']['steps'] if 'release_run.py check ' not in s.get('run','')]
            if mutation=='oidc-bypass':next(s for s in publisher['steps'] if s.get('id')=='cratesio')['if']='true'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):workflow_policy.check(data,'release.yml')
``````

<!-- replay-file: {"path":"packaging/release/test_supply.py","mode":"100644","sha256":"73204c8b1a88badd1b6432f0afb2fc6abf5ae76cdf38ded4ea36b4d251d7c9ff","encoding":"utf8"} -->
``````python
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import contextlib
import io
import tarfile

import gate
import supply
import contract


class Supply(unittest.TestCase):
    def test_materials_manifest_location_is_independent_of_merge_order(self):
        manifest = b'{"schema":1,"node":{"version":"24.21.0"}}\n'
        locations = ['adapters/manifest.json', 'crates/hennery-host/manifest.json']
        for present in [locations[:1], locations[1:], locations]:
            with self.subTest(present=present), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                for location in present:
                    path = root / location
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(manifest)
                self.materials(root)
                runtime = gate.strict_json((root / 'out/runtime-inventory.json').read_bytes())
                identity = gate.strict_json((root / 'out/build-identity.json').read_bytes())
                self.assertEqual(runtime['manifest'], gate.strict_json(manifest))
                self.assertEqual(runtime['adapter_manifest_sha256'], gate.digest(manifest))
                self.assertEqual(identity['adapter_manifest_sha256'], gate.digest(manifest))

    def test_materials_refuses_disagreeing_adapter_manifest_locations(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for location, raw in [('adapters/manifest.json', b'{"schema":1}\n'),
                                  ('crates/hennery-host/manifest.json', b'{"schema":2}\n')]:
                path = root / location
                path.parent.mkdir(parents=True)
                path.write_bytes(raw)
            with self.assertRaisesRegex(ValueError, 'adapter manifest locations disagree'):
                self.materials(root)

    def test_materials_refuses_missing_adapter_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, 'adapter manifest missing'):
                self.materials(Path(tmp))

    @staticmethod
    def materials(root):
        (root / 'metadata.json').write_text('{"packages":[],"workspace_members":[]}')
        (root / 'frontend.json').write_text('{}')
        (root / 'Cargo.lock').write_text('cargo lock fixture')
        (root / 'web/dist').mkdir(parents=True)
        (root / 'web/dist/index.html').write_text('UI fixture')
        (root / 'web/pnpm-lock.yaml').write_text('web lock fixture')
        argv = ['supply.py', 'materials', '--output', 'out', '--source-sha', 'a' * 40,
                '--target', 'aarch64-apple-darwin', '--cargo-metadata', 'metadata.json',
                '--frontend-licences', 'frontend.json']
        with contextlib.chdir(root), patch('sys.argv', argv):
            supply.main()

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
                if 'crates' in channels:
                    self.write_cli_crate(root, tag)
                supply.require_contract(root, channels, targets, tag)
                for path in root.iterdir():
                    original = path.read_bytes()
                    path.unlink()
                    with self.subTest(channel=channels, missing=path.name), self.assertRaises(gate.Refused):
                        supply.require_contract(root, channels, targets, tag)
                    path.write_bytes(original)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in supply.required_payloads(['crates'], targets, 'v0.1.0-alpha.1'):
                (root / name).write_bytes(b'fixture')
            with self.assertRaises(gate.Refused):
                supply.require_contract(root, ['crates'], targets, 'v0.1.0-alpha.1')

    @staticmethod
    def write_cli_crate(root, tag, identity_ref=None):
        base='hennery-'+tag.removeprefix('v')
        identity_ref=identity_ref or 'refs/tags/'+tag
        text='[package]\nname="hennery"\nversion="'+tag.removeprefix('v')+'"\n[package.metadata.binstall]\ndisabled-strategies=["crate-meta-data","quick-install","compile"]\n[package.metadata.hennery-release]\nverification="external-signed-tag-sigstore"\nmaintainer-fingerprint="F26C7F594DFE84D131703AFC23E5A318AE8D2861"\nsigner-identity="https://github.com/marcinwadon/hennery/.github/workflows/release.yml@'+identity_ref+'"\n'
        with tarfile.open(root/(base+'.crate'),'w:gz') as archive:
            data=text.encode();entry=tarfile.TarInfo(base+'/Cargo.toml');entry.size=len(data);archive.addfile(entry,io.BytesIO(data))

    def test_crates_contract_rejects_branch_identity_in_frozen_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);channels=['crates','github'];targets=['aarch64-apple-darwin'];tag='v0.1.0'
            for name in supply.required_payloads(channels,targets,tag):(root/name).write_bytes(b'fixture')
            self.write_cli_crate(root,tag,'refs/heads/main')
            with self.assertRaisesRegex(gate.Refused,'exact release-tag identity'):
                supply.require_contract(root,channels,targets,tag)

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
            metadata = {'schema': 2, 'repository': gate.REPOSITORY, 'source_sha': 'a' * 40,
                        'tag': 'v0.1.0-alpha.1', 'tag_object': 'b' * 40, 'channels': ['github'],
                        'targets': targets, 'attesting': {'run_id': 10, 'run_attempt': 1}}
            with self.assertRaisesRegex(gate.Refused, 'unresolved licence'):
                supply.freeze(root, metadata)
            findings.write_bytes(gate.canonical({'findings': []}))
            supply.freeze(root, metadata)
            inventory = contract.load(root)
            supply.verify_checksums(root)
            supply.verify_binary_inventory(inventory, root)
            wrong = dict(inventory, binaries={})
            with self.assertRaises(gate.Refused):
                supply.verify_binary_inventory(wrong, root)
            self.assertIn('release-metadata.json', [a['name'] for a in inventory['artifacts']])
            self.assertNotIn('artifacts', gate.strict_json((root / contract.METADATA).read_bytes()))
            with patch.object(contract, 'freeze') as generation, self.assertRaisesRegex(gate.Refused, 'already frozen'):
                supply.freeze(root, metadata)
            generation.assert_not_called()

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
            self.assertEqual((root / 'SHA256SUMS').read_text(), gate.digest(b'bytes') + '  payload\n')
            supply.checksums(root)  # stable, never hashes itself
            self.assertNotIn('SHA256SUMS', (root / 'SHA256SUMS').read_text())
            (root / 'payload').write_bytes(b'changed')
            with self.assertRaises(gate.Refused):
                supply.verify_checksums(root)



    def test_crate_metadata_is_bounded_regular_and_unambiguous(self):
        for kind in ('duplicate','symlink','oversize'):
            with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);channels=['crates','github'];targets=['aarch64-apple-darwin'];tag='v0.1.0';base='hennery-0.1.0'
                for name in supply.required_payloads(channels,targets,tag):(root/name).write_bytes(b'fixture')
                self.write_cli_crate(root,tag)
                with tarfile.open(root/(base+'.crate'),'r:gz') as archive:data=archive.extractfile(base+'/Cargo.toml').read()
                if kind=='oversize':data+=b'\n#'+b'x'*(1024*1024)
                with tarfile.open(root/(base+'.crate'),'w:gz') as archive:
                    entry=tarfile.TarInfo(base+'/Cargo.toml')
                    if kind=='symlink':
                        entry.type=tarfile.SYMTYPE;entry.linkname='Cargo.toml.orig';archive.addfile(entry)
                        entry=tarfile.TarInfo(base+'/Cargo.toml.orig')
                    entry.size=len(data);archive.addfile(entry,io.BytesIO(data))
                    if kind=='duplicate':archive.addfile(entry,io.BytesIO(data))
                with tarfile.open(root/(base+'.crate'),'r:gz') as archive:
                    self.assertEqual(archive.extractfile(base+'/Cargo.toml').read(),data)
                with self.assertRaisesRegex(gate.Refused,'bounded regular file'):
                    supply.require_contract(root,channels,targets,tag)


if __name__ == '__main__':
    unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_tag_signature.py","mode":"100644","sha256":"82082416b1125de58d5126cb43828488c1fe3f247ce10393c48761e4f4690bd0","encoding":"utf8"} -->
``````python
import subprocess
import unittest
from unittest.mock import patch

import gate
import tag_signature


class TagSignature(unittest.TestCase):
    def test_only_pinned_nonexpired_valid_signature_is_accepted(self):
        good = '[GNUPG:] VALIDSIG ' + tag_signature.FINGERPRINT + ' 2026-10-15 123 0 4 0 1 10 00\n'
        tag_signature.check_status(0, good)
        for code, status in [(1, good), (0, good.replace(tag_signature.FINGERPRINT, 'a' * 40)), (0, ''), (0, good + '[GNUPG:] EXPKEYSIG old\n'), (0, good + '[GNUPG:] REVKEYSIG old\n')]:
            with self.subTest(code=code, status=status), self.assertRaises(gate.Refused):
                tag_signature.check_status(code, status)

    def test_live_fetched_tag_object_signature_and_exact_commit_are_bound(self):
        def backend(args, **kwargs):
            if 'init' in args:
                self.assertIn('--bare', args)
                self.assertIn('--template=', args)
                out = ''
            elif 'fetch' in args:
                self.assertIn('https://github.com/' + gate.REPOSITORY + '.git', args)
                out = ''
            elif 'rev-parse' in args:
                out = 'b' * 40 + '\n'
            elif 'cat-file' in args:
                out = 'object ' + 'a' * 40 + '\ntype commit\ntag v0.1.0\ntagger Maintainer\n\nmessage\n'
            elif 'verify-tag' in args:
                return subprocess.CompletedProcess(args, 0, '', '[GNUPG:] VALIDSIG ' + tag_signature.FINGERPRINT + ' 2026 1 0\n')
            else:
                self.assertIn('--no-autostart', args)
                out = ''
            return subprocess.CompletedProcess(args, 0, out, '')
        with patch.object(tag_signature.subprocess, 'run', side_effect=backend):
            proof = tag_signature.verify('v0.1.0', 'a' * 40, 'b' * 40)
            self.assertEqual(proof['fingerprint'], tag_signature.FINGERPRINT)
            for tag, commit, obj in [('v0.1.0', 'c' * 40, 'b' * 40), ('v9.0.0', 'a' * 40, 'b' * 40), ('v0.1.0', 'a' * 40, 'c' * 40)]:
                with self.subTest(tag=tag, commit=commit, obj=obj), self.assertRaises(gate.Refused):
                    tag_signature.verify(tag, commit, obj)
``````

<!-- replay-file: {"path":"packaging/release/test_verifier_process.py","mode":"100644","sha256":"354b32fa2696daecc1eac32739e9d2b1e560079365cdc5941db85b6a9fde2ffe","encoding":"utf8"} -->
``````python
"""Real stand-in executables prove the verifier process authority boundary."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import channel_publish
import contract
import gate
import tag_signature
import test_contract
import verify


class VerifierChildren(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='verifier-child-test-');self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.tools=self.root/'tools';self.tools.mkdir();self.log=self.root/'children.jsonl'
        self.certificate={'runInvocationURI':'https://github.com/'+gate.REPOSITORY+'/actions/runs/42/attempts/1',
            'sourceRepositoryURI':'https://github.com/'+gate.REPOSITORY,
            'buildSignerURI':'https://github.com/'+gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',
            'sourceRepositoryRef':'refs/tags/v0.1.0','sourceRepositoryDigest':'a'*40,'buildSignerDigest':'a'*40,
            'runnerEnvironment':'github-hosted','issuer':'https://token.actions.githubusercontent.com'}
        self.rows=[{'verificationResult':{'signature':{'certificate':self.certificate}}}]
        self.dirty=self.root/'operator-config';self.dirty.mkdir()
        (self.dirty/'hosts.yml').write_text('credential-canary')
        for filename in ['config.json','config','credentials','.git-credentials','.gitconfig']:(self.dirty/filename).write_text('credential-canary')
        self.bad={'GH_TOKEN':'write-canary','GITHUB_TOKEN':'write-canary','GH_ENTERPRISE_TOKEN':'write-canary',
            'GITHUB_ENTERPRISE_TOKEN':'write-canary','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'oidc-canary',
            'ACTIONS_ID_TOKEN_REQUEST_URL':'https://example.invalid/oidc','ACTIONS_RUNTIME_TOKEN':'runtime-canary',
            'SSH_AUTH_SOCK':'agent-canary','GPG_AGENT_INFO':'agent-canary','GIT_ASKPASS':'helper-canary',
            'SSH_ASKPASS':'helper-canary','GIT_CONFIG_PARAMETERS':'credential.helper=canary',
            'GIT_CONFIG_COUNT':'1','GIT_CONFIG_KEY_0':'http.extraheader','GIT_CONFIG_VALUE_0':'canary',
            'DOCKER_AUTH_CONFIG':'credential-canary','UNKNOWN_FUTURE_SECRET':'canary',
            **{k:'credential-canary' for k in channel_publish.SECRETS},
            **{k:str(self.dirty) for k in ['HOME','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME','GH_CONFIG_DIR',
                'GNUPGHOME','DOCKER_CONFIG','REGISTRY_AUTH_FILE','ORAS_CONFIG','ORAS_CONFIG_HOME','GIT_CONFIG_GLOBAL','GIT_CONFIG_SYSTEM']},
            'PATH':str(self.tools)+os.pathsep+os.environ['PATH']}
        script='#!'+sys.executable+'\n'+f'''import json,os,sys
from pathlib import Path
name=Path(sys.argv[0]).name
with open({str(self.log)!r},'a') as out:out.write(json.dumps({{'tool':name,'args':sys.argv[1:],'env':dict(os.environ)}})+'\\n')
if name=='gh': print({json.dumps(self.rows)!r})
elif 'rev-parse' in sys.argv: print({'b'*40!r})
elif 'cat-file' in sys.argv: print({'object '+'a'*40+chr(10)+'type commit'+chr(10)+'tag v0.1.0'+chr(10)+'tagger Test'+chr(10)+chr(10)+'message'+chr(10)!r})
elif 'verify-tag' in sys.argv: print({'[GNUPG:] VALIDSIG '+tag_signature.FINGERPRINT+' 2026 1 0'+chr(10)!r},file=sys.stderr)
'''
        for name in ['gh','git','gpg']:
            path=self.tools/name;path.write_text(script);path.chmod(0o755)

    def children(self):return [json.loads(line) for line in self.log.read_text().splitlines()]

    def assert_clean(self):
        rows=self.children();self.assertTrue(rows)
        allowed_inputs={'PATH','SSL_CERT_FILE','NIX_SSL_CERT_FILE','SSL_CERT_DIR'}
        # Nix's Python launcher injects these two noncredential runtime values
        # after exec; they are not inherited by the subprocess environment.
        runtime={'PYTHONNOUSERSITE','__CF_USER_TEXT_ENCODING'}
        safe_config={'HOME','TMPDIR','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME','XDG_STATE_HOME',
                     'GH_CONFIG_DIR','GNUPGHOME','DOCKER_CONFIG','REGISTRY_AUTH_FILE','ORAS_CONFIG','ORAS_CONFIG_HOME',
                     'GIT_CONFIG_GLOBAL','GIT_CONFIG_SYSTEM','GIT_CONFIG_NOSYSTEM','GIT_TERMINAL_PROMPT','GIT_NO_REPLACE_OBJECTS',
                     'LC_ALL'}
        for row in rows:
            env=row['env']
            self.assertLessEqual(set(env),allowed_inputs|safe_config|runtime,set(env))
            if 'PYTHONNOUSERSITE' in env:self.assertEqual(env['PYTHONNOUSERSITE'],'true')
            if '__CF_USER_TEXT_ENCODING' in env:self.assertRegex(env['__CF_USER_TEXT_ENCODING'],r'^0x[0-9A-Fa-f]+:0x0:0x0$')
            for key,value in self.bad.items():
                if key=='PATH':continue
                self.assertNotEqual(env.get(key),value,(row['tool'],key))
            self.assertTrue(all(not key.startswith('ACTIONS_') for key in env))
            self.assertNotIn('UNKNOWN_FUTURE_SECRET',env)
            self.assertNotEqual(env['HOME'],str(self.dirty))
            self.assertNotEqual(env['GH_CONFIG_DIR'],str(self.dirty))
            self.assertNotEqual(env['DOCKER_CONFIG'],str(self.dirty))
        for key,value in self.bad.items():self.assertEqual(os.environ.get(key),value,'parent environment mutated')

    def test_release_crypto_children_receive_only_explicit_credential_free_environment(self):
        payload=self.root/'payload';payload.mkdir();test_contract.Contract().fixture(payload)
        with patch.dict(os.environ,self.bad),patch.object(tag_signature,'verify'):
            contract.verify(payload,'v0.1.0','a'*40,self.root/'bundle',42,1)
            self.assertEqual(len(self.children()),3);self.assert_clean()

    def test_standalone_image_consumer_child_is_also_credential_free(self):
        manifest=self.root/'manifest';manifest.write_bytes(b'OCI manifest')
        value={'tag':'v0.1.0','source_sha':'a'*40,'attesting':{'run_id':42,'run_attempt':1}}
        with patch.dict(os.environ,self.bad):
            verify.verify_image_subject('ghcr.io/'+gate.REPOSITORY+'@sha256:'+gate.digest(manifest.read_bytes()),value,
                                       self.root/'bundle',manifest=manifest)
            self.assert_clean()

    def test_git_and_gpg_children_have_no_job_tokens_or_operator_configuration(self):
        with patch.dict(os.environ,self.bad):
            proof=tag_signature.verify('v0.1.0','a'*40,'b'*40)
            self.assertEqual(proof['fingerprint'],tag_signature.FINGERPRINT);self.assert_clean()
            self.assertFalse(any('origin' in row['args'] for row in self.children()),'tag fetch must use the fixed public repository')
            git=[row['args'] for row in self.children() if row['tool']=='git']
            self.assertEqual(sum('init' in args for args in git),1)
            for args in git:
                if 'init' in args:
                    self.assertIn('--bare',args);self.assertIn('--template=',args)
                else:self.assertTrue(any(arg.startswith('--git-dir=/tmp/hennery-verify-') for arg in args))

    def test_parent_api_keeps_token_while_its_real_verifier_child_has_none(self):
        payload=self.root/'payload';payload.mkdir();test_contract.Contract().fixture(payload)
        def parent(*args):
            self.assertEqual(os.environ['GH_TOKEN'],'write-canary')
            contract.verify(payload,'v0.1.0','a'*40,self.root/'bundle',42,1)
        with patch.dict(os.environ,self.bad),patch.object(tag_signature,'verify'),patch('release_run.verify',side_effect=parent):
            channel_publish.shared_verify(payload,self.root,'github');self.assert_clean()

    def test_folded_image_verifier_children_are_credential_free(self):
        work=self.root/'work';blobs=work/'layout/blobs/sha256';blobs.mkdir(parents=True)
        raw=b'OCI manifest';digest=gate.digest(raw);(blobs/digest).write_bytes(raw)
        expected={'digest':'sha256:'+digest,'platforms':{}}
        (self.root/'ghcr-index.json').write_bytes(gate.canonical(expected))
        (work/'verified.json').write_bytes(gate.canonical(expected))
        (self.root/'ghcr-index-provenance.json').write_text('local bundle')
        value={'tag':'v0.1.0','source_sha':'a'*40,'attesting':{'run_id':42,'run_attempt':1}}
        with patch.dict(os.environ,self.bad),patch.object(channel_publish,'image_helper',return_value=SimpleNamespace(inspect_release=lambda *a:expected)):
            channel_publish.check_images(self.root,self.root,value,work);self.assert_clean()

    def test_denied_verification_already_excludes_write_authority(self):
        payload=self.root/'payload';payload.mkdir();test_contract.Contract().fixture(payload)
        with patch.dict(os.environ,self.bad),patch.object(tag_signature,'verify'),patch.object(contract,'require_run',side_effect=gate.Refused('wrong run')):
            with self.assertRaises(gate.Refused):contract.verify(payload,'v0.1.0','a'*40,self.root/'bundle',42,1)
            self.assertEqual(len(self.children()),1);self.assert_clean()
``````

<!-- replay-file: {"path":"packaging/release/test_verify.py","mode":"100644","sha256":"768a6af6f9a7ffa24fe249619e24182d2f44a25bac60a0e2b447f3d109d0d5b0","encoding":"utf8"} -->
``````python
"""Consumer lifecycle and structural identity tests; real crypto is in test_verify_cli."""
import copy
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import contract
import gate
import tag_signature
import verify


class Verification(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(); self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / 'installer.sh').write_bytes(b'fixture installer')
        self.metadata = {'schema': 2, 'repository': gate.REPOSITORY, 'source_sha': 'a' * 40,
                         'tag': 'v0.1.0', 'tag_object': 'b' * 40, 'channels': ['github'],
                         'targets': sorted(gate.TARGETS), 'attesting': {'run_id': 42, 'run_attempt': 1}}
        contract.freeze(self.root, self.metadata)
        self.certificate = {'runInvocationURI': 'https://github.com/' + gate.REPOSITORY + '/actions/runs/42/attempts/1',
                            'sourceRepositoryURI': 'https://github.com/' + gate.REPOSITORY,
                            'buildSignerURI': 'https://github.com/' + gate.REPOSITORY + '/' + contract.WORKFLOW + '@refs/tags/v0.1.0',
                            'sourceRepositoryRef': 'refs/tags/v0.1.0', 'sourceRepositoryDigest': 'a' * 40,
                            'buildSignerDigest': 'a' * 40, 'runnerEnvironment': 'github-hosted',
                            'issuer': 'https://token.actions.githubusercontent.com'}
        self.calls = []

    def crypto(self, command, **kwargs):
        self.calls.append(command)
        return subprocess.CompletedProcess(command, 0, gate.canonical([{
            'verificationResult': {'signature': {'certificate': self.certificate}}}]).decode(), '')

    def run_verify(self, **kwargs):
        return verify.verify(self.root, Path('bundle'), 'a' * 40, 'v0.1.0', **kwargs)

    def test_signed_tag_precedes_checksum_and_all_payload_verification(self):
        with patch('tag_signature.verify') as tag, patch.object(verify.subprocess, 'run', side_effect=self.crypto), patch.object(verify.supply, 'verify_binary_inventory') as binaries:
            actual = self.run_verify(run_id=42, attesting_attempt=1)
        tag.assert_called_once_with('v0.1.0', 'a' * 40, 'b' * 40)
        binaries.assert_called_once_with(actual, self.root)
        self.assertEqual([Path(c[3]).name for c in self.calls], ['SHA256SUMS', 'installer.sh', 'release-metadata.json'])
        for command in self.calls:
            self.assertNotIn('--signer-workflow', command)
            self.assertEqual(command[command.index('--cert-identity') + 1], self.certificate['buildSignerURI'])
            self.assertEqual(command[command.index('--source-digest') + 1], 'a' * 40)
            self.assertEqual(command[command.index('--signer-digest') + 1], 'a' * 40)

    def test_tag_or_crypto_authentication_failure_stops_before_installer(self):
        with patch('tag_signature.verify', side_effect=gate.Refused('invalid tag')), patch.object(verify.subprocess, 'run') as crypto:
            with self.assertRaisesRegex(gate.Refused, 'invalid tag'): self.run_verify()
            crypto.assert_not_called()
        with patch('tag_signature.verify'), patch.object(verify.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'gh')):
            with self.assertRaises(subprocess.CalledProcessError): self.run_verify()

    def test_source_tag_and_original_run_bindings_cannot_change(self):
        for source, tag, run, attempt in [('c' * 40, 'v0.1.0',42,1), ('a' * 40,'v0.2.0',42,1), ('a' * 40,'v0.1.0',43,1), ('a' * 40,'v0.1.0',42,2)]:
            with self.subTest(source=source, tag=tag, run=run, attempt=attempt), patch.object(verify.subprocess, 'run') as crypto, self.assertRaises(gate.Refused):
                verify.verify(self.root, Path('bundle'), source, tag, run_id=run, attesting_attempt=attempt)
            crypto.assert_not_called()

    def test_structural_branch_other_tag_workflow_or_run_certificate_refuses(self):
        original = dict(self.certificate)
        for field, value in [('buildSignerURI', original['buildSignerURI'].replace('@refs/tags/v0.1.0', '@refs/heads/main')),
                             ('buildSignerURI', original['buildSignerURI'].replace('release.yml', 'other.yml')),
                             ('sourceRepositoryRef', 'refs/tags/v9.9.9'), ('buildSignerDigest', 'b' * 40),
                             ('runInvocationURI', original['runInvocationURI'].replace('/42/', '/43/')),
                             ('runInvocationURI', original['runInvocationURI'].replace('/1', '/2'))]:
            self.certificate = original | {field: value}
            with self.subTest(field=field, value=value), patch('tag_signature.verify'), patch.object(verify.subprocess, 'run', side_effect=self.crypto), self.assertRaises(gate.Refused): self.run_verify()

    def test_byte_change_during_binary_check_refuses(self):
        def mutate(value, root):
            (root / 'installer.sh').write_bytes(b'changed after attestation')
        with patch('tag_signature.verify'), patch.object(verify.subprocess, 'run', side_effect=self.crypto), patch.object(verify.supply, 'verify_binary_inventory', side_effect=mutate), self.assertRaises(gate.Refused): self.run_verify()

    def test_cli_parser_requires_release_source_tag_and_original_attempt_options(self):
        args = verify.arguments(['--release-directory', str(self.root), '--bundle', 'bundle', '--source-sha', 'a' * 40,
                                 '--tag', 'v0.1.0', '--run-id', '42', '--attesting-attempt', '1'])
        self.assertEqual((args.run_id, args.attesting_attempt), (42, 1))


class BinstallMetadata(unittest.TestCase):
    def test_metadata_cannot_advertise_an_unverified_or_branch_signed_path(self):
        good = {'binstall': {'disabled-strategies': ['crate-meta-data','quick-install','compile']},
                'hennery-release': {'verification': 'external-signed-tag-sigstore',
                 'maintainer-fingerprint': tag_signature.FINGERPRINT,
                 'signer-identity': 'https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0'}}
        verify.require_binstall_metadata(good, 'v0.1.0')
        for kind in ('native','branch','wrong-tag','wrong-maintainer','no-verifier'):
            bad = copy.deepcopy(good)
            if kind == 'native': bad['binstall']['disabled-strategies'].remove('crate-meta-data')
            elif kind == 'branch': bad['hennery-release']['signer-identity'] = bad['hennery-release']['signer-identity'].replace('@refs/tags/v0.1.0','@refs/heads/main')
            elif kind == 'wrong-tag': bad['hennery-release']['signer-identity'] += '-other'
            elif kind == 'wrong-maintainer': bad['hennery-release']['maintainer-fingerprint'] = '0' * 40
            else: bad['hennery-release']['verification'] = 'checksum-only'
            with self.subTest(kind=kind), self.assertRaises(gate.Refused): verify.require_binstall_metadata(bad,'v0.1.0')


if __name__ == '__main__': unittest.main()
``````

<!-- replay-file: {"path":"packaging/release/test_verify_cli.py","mode":"100644","sha256":"8715e35bc0697b6811c2ee95352de7336c03900a1fd4c4553704fccf1fc68f24","encoding":"utf8"} -->
``````python
"""Actual pinned-gh crypto contract; substituted certificates test structure only."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import contract
import gate
import verifier_process

FIXTURES = Path(__file__).with_name('fixtures') / 'attestation'
SOURCE = '26d16513386ffaa790b1c32f927544f1322e4194'
UPSTREAM = 'https://github.com/sigstore/sigstore-js'
URI = UPSTREAM + '/actions/runs/6014488666/attempts/1'
HASHES = {'sigstore-js-2.1.0.tgz': 'f0c641fce0310cb43208f4272dc1423153630e44ba8cdc0b5ce8466f724e0eed',
          'sigstore-js-2.1.0-bundle.json': 'cfadddd579b9fb45947530cd0e860986ec610a28f7fa6de3ef31cc051f07f761',
          'trusted_root.json': '455b3fe53e2678889f093d66ebbfda5f12ebb9d682b146c3535fa04e97689787'}


class PinnedCLI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='release-cli-')
        cls.addClassCleanup(cls.tmp.cleanup)
        isolated = verifier_process.environment()
        cls.env = isolated.__enter__()
        cls.addClassCleanup(isolated.__exit__, None, None, None)
        cls.env.update(HTTPS_PROXY='http://127.0.0.1:9', HTTP_PROXY='http://127.0.0.1:9',
                       ALL_PROXY='http://127.0.0.1:9', NO_PROXY='')
        for name, digest in HASHES.items():
            if hashlib.sha256((FIXTURES / name).read_bytes()).hexdigest() != digest:
                raise AssertionError('authentic fixture bytes changed: ' + name)
        version = subprocess.check_output(['gh', '--version'], env=cls.env, text=True)
        if not version.startswith('gh version 2.101.0 '):
            raise AssertionError('CLI contract requires pinned gh 2.101.0; requalify before updating this pin: ' + version)
        cls.command = ['gh', 'attestation', 'verify', str(FIXTURES / 'sigstore-js-2.1.0.tgz'),
                       '--repo', 'sigstore/sigstore-js', '--digest-alg', 'sha512',
                       '--bundle', str(FIXTURES / 'sigstore-js-2.1.0-bundle.json'),
                       '--custom-trusted-root', str(FIXTURES / 'trusted_root.json'),
                       '--cert-identity', UPSTREAM + '/.github/workflows/release.yml@refs/heads/main',
                       '--source-ref', 'refs/heads/main', '--source-digest', SOURCE, '--signer-digest', SOURCE,
                       '--cert-oidc-issuer', 'https://token.actions.githubusercontent.com',
                       '--deny-self-hosted-runners', '--format', 'json']
        result = subprocess.run(cls.command, env=cls.env, capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise AssertionError('authentic offline crypto verification failed: ' + result.stderr)
        cls.verified = json.loads(result.stdout)

    def test_authentic_crypto_success_and_exact_flattened_certificate_shape(self):
        certificate = self.verified[0]['verificationResult']['signature']['certificate']
        self.assertNotIn('extensions', certificate, 'pinned CLI schema changed; do not add a fallback')
        self.assertEqual(certificate['runInvocationURI'], URI)
        for wrong in [URI.replace('/6014488666/', '/6014488667/'), URI.replace('/attempts/1', '/attempts/2')]:
            self.assertNotEqual(certificate['runInvocationURI'], wrong)

    def test_altered_payload_fails_real_cryptographic_verification(self):
        altered = Path(self.tmp.name) / 'altered.tgz'
        altered.write_bytes((FIXTURES / 'sigstore-js-2.1.0.tgz').read_bytes() + b'changed')
        command = list(self.command); command[3] = str(altered)
        result = subprocess.run(command, env=self.env, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)

    def test_production_hennery_cli_policy_rejects_authentic_upstream_identity(self):
        command = contract.attestation_command(FIXTURES / 'sigstore-js-2.1.0.tgz', 'v0.1.0', SOURCE,
                                               FIXTURES / 'sigstore-js-2.1.0-bundle.json', FIXTURES / 'trusted_root.json')
        command += ['--digest-alg', 'sha512']
        result = subprocess.run(command, env=self.env, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)

    def test_structural_hennery_identity_and_run_policy_using_real_json_shape(self):
        # Substitution is structural policy coverage, NOT a Hennery crypto proof.
        rows = copy.deepcopy(self.verified)
        cert = rows[0]['verificationResult']['signature']['certificate']
        cert.update(sourceRepositoryURI='https://github.com/marcinwadon/hennery',
                    buildSignerURI='https://github.com/marcinwadon/hennery/.github/workflows/release.yml@refs/tags/v0.1.0',
                    sourceRepositoryRef='refs/tags/v0.1.0',
                    runInvocationURI='https://github.com/marcinwadon/hennery/actions/runs/42/attempts/1')
        contract.require_identity(rows, 'v0.1.0', SOURCE)
        try:
            contract.require_run(rows, 42, 1)
        except gate.Refused as error:
            self.fail('real pinned CLI certificate shape was refused: ' + str(error))
        for key, value in [('sourceRepositoryURI', UPSTREAM), ('buildSignerURI', cert['buildSignerURI'].replace('release.yml','other.yml')),
                           ('sourceRepositoryRef','refs/heads/main'), ('buildSignerURI',cert['buildSignerURI'].replace('refs/tags/v0.1.0','refs/heads/main')),
                           ('sourceRepositoryDigest','b'*40), ('buildSignerDigest','b'*40)]:
            bad=copy.deepcopy(rows);bad[0]['verificationResult']['signature']['certificate'][key]=value
            with self.subTest(key=key), self.assertRaises(gate.Refused):contract.require_identity(bad,'v0.1.0',SOURCE)
        for run, attempt in [(43,1),(42,2)]:
            with self.subTest(run=run,attempt=attempt),self.assertRaises(gate.Refused):contract.require_run(rows,run,attempt)
        nested=copy.deepcopy(rows);certificate=nested[0]['verificationResult']['signature']['certificate']
        certificate['extensions']={'runInvocationURI':certificate.pop('runInvocationURI')}
        with self.assertRaises(gate.Refused):contract.require_run(nested,42,1)
``````

<!-- replay-file: {"path":"packaging/release/test_workflows.py","mode":"100644","sha256":"77041e6ac96e69bc9287140e9e10fd77d02fbfc79a8e392d58b19bb6afae613e","encoding":"utf8"} -->
``````python
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
    def candidate(self):
        return yaml.safe_load((ROOT / '.github/workflows/release.yml').read_text())

    def test_reserved_channel_names_belong_only_to_their_job_ids(self):
        for channel in ('crates','ghcr','homebrew'):
            data=self.candidate()
            data['jobs'].pop(channel,None)
            data['jobs']['licence-review']={'name':channel,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(channel=channel), self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs(data)

    def test_candidate_job_names_cannot_be_dynamic_or_collide(self):
        for display in ('archive',"${{ 'ghcr' }}",'${{ matrix.name }}',None,42):
            data=self.candidate()
            data['jobs']['licence-review']={'name':display,'timeout-minutes':5,'steps':[{'run':'exit 1'}]}
            with self.subTest(display=display), self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs(data)

    def test_candidate_job_identity_requires_a_valid_jobs_mapping(self):
        for jobs in (None,{},[],{'ordinary':None},{'ordinary.name':{}},{True:{}}):
            with self.subTest(jobs=jobs),self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs({'jobs':jobs})

    def test_channel_owner_has_literal_own_name_and_no_matrix(self):
        for channel in ('crates','ghcr','homebrew'):
            for changed in ({},{'name':channel}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                workflow_policy.channel_jobs(data)
            for changed in ({'name':'archive'},{'name':'ordinary-display'},{'name':"${{ '"+channel+"' }}"},{'strategy':{'matrix':{'os':['ubuntu-24.04']}}}):
                data=self.candidate()
                data['jobs'][channel]={'timeout-minutes':5,'steps':[{'run':'true'}],**changed}
                with self.subTest(channel=channel,changed=changed), self.assertRaisesRegex(ValueError,'release job identity'):
                    workflow_policy.channel_jobs(data)

    def test_channel_registry_explicitly_maps_a_channel_to_its_owning_job_id(self):
        from unittest.mock import patch
        data=self.candidate()
        data['jobs'].pop('ghcr', None)
        data['jobs']['container-acceptance']={'name':'ghcr','timeout-minutes':5,'steps':[{'run':'true'}]}
        with patch.dict(workflow_policy.CHANNEL_JOB_IDS,{'ghcr':'container-acceptance'}):
            workflow_policy.channel_jobs(data)
            data['jobs']['unrelated']=data['jobs'].pop('container-acceptance')
            with self.assertRaisesRegex(ValueError,'release job identity'):
                workflow_policy.channel_jobs(data)

    def test_candidate_yaml_decoding_cannot_hide_reserved_name_or_duplicate(self):
        base=(ROOT/'.github/workflows/release.yml').read_text()
        variants=[
            '\ufeff'+base+'\n  licence-review:\n    name: "\\u0067hcr"\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
            base+'\n  licence-review:\n    name: ghcr\n    name: ordinary\n    timeout-minutes: 5\n    steps: [{run: "exit 1"}]\n',
        ]
        for raw in variants:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                (root/'.github/workflows/release.yml').write_text(raw)
                with self.subTest(raw=raw[-150:]),self.assertRaises(ValueError):
                    workflow_policy.check_repository(root)

    def test_all_release_workflows(self):
        workflow_policy.check_repository(ROOT)

    def test_arbitrary_filename_cannot_hide_publication_authority(self):
        for mutation in ('write','secret','environment','reusable'):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);shutil.copytree(ROOT/'.github',root/'.github')
                job={'runs-on':'ubuntu-24.04','steps':[{'run':'true'}]}
                if mutation=='write':job['permissions']={'contents':'write'}
                if mutation=='secret':job['environment']='release';job['steps'][0]['env']={'TOKEN':'${{ secrets.RELEASE_HOMEBREW_TOKEN }}'}
                if mutation=='environment':job['environment']='release'
                if mutation=='reusable':job={'uses':'./.github/workflows/other.yml'}
                (root/'.github/workflows/other.yml').write_text(yaml.safe_dump({'on':'push','jobs':{'other':job}}))
                with self.subTest(mutation=mutation),self.assertRaises(ValueError):workflow_policy.check_repository(root)
``````

<!-- replay-file: {"path":"packaging/release/verifier_process.py","mode":"100644","sha256":"5fb2099acd397ac88fa6d68d024e12a4c5fca530cb283d8441242b473e050a96","encoding":"utf8"} -->
``````python
"""Credential-free process boundary for unprivileged release verification."""
from contextlib import contextmanager
import os
from pathlib import Path
import subprocess
import tempfile


@contextmanager
def environment():
    # Unknown future credentials must also be excluded. Certificate paths
    # contain public trust data only; no ambient helper/config paths survive.
    inherited = ('PATH', 'SSL_CERT_FILE', 'NIX_SSL_CERT_FILE', 'SSL_CERT_DIR')
    env = {key: os.environ[key] for key in inherited if key in os.environ}
    with tempfile.TemporaryDirectory(prefix='hennery-verify-', dir='/tmp') as temporary:
        home = Path(temporary)
        dirs = {'HOME': home, 'TMPDIR': home / 'tmp',
                'XDG_CONFIG_HOME': home / 'config', 'XDG_CACHE_HOME': home / 'cache',
                'XDG_DATA_HOME': home / 'data', 'XDG_STATE_HOME': home / 'state',
                'GH_CONFIG_DIR': home / 'gh', 'GNUPGHOME': home / 'gpg',
                'DOCKER_CONFIG': home / 'docker', 'ORAS_CONFIG_HOME': home / 'oras'}
        for key, path in dirs.items():
            path.mkdir(mode=0o700, exist_ok=True)
            env[key] = str(path)
        (dirs['GNUPGHOME'] / 'gpg.conf').write_text('no-autostart\nno-auto-key-retrieve\n')
        auth = dirs['DOCKER_CONFIG'] / 'config.json'
        auth.write_text('{"auths":{}}\n')
        env.update(REGISTRY_AUTH_FILE=str(auth), ORAS_CONFIG=str(auth),
                   GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null',
                   GIT_CONFIG_NOSYSTEM='1', GIT_TERMINAL_PROMPT='0',
                   GIT_NO_REPLACE_OBJECTS='1', LC_ALL='C.UTF-8')
        yield env


def run(command, **kwargs):
    """Run a verifier without inheriting parent transport authority."""
    if 'env' in kwargs:
        raise TypeError('verifier environment cannot be overridden')
    with environment() as env:
        return subprocess.run(command, env=env, **kwargs)
``````

<!-- replay-file: {"path":"packaging/release/verify.py","mode":"100644","sha256":"deb25e2be9e6745c74d5b89ff11c81b8d7a49a582577dbff013fe836b3bc4544","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Authenticate release bytes and OCI subjects with signed source and provenance."""
import argparse
from pathlib import Path
import re
import subprocess

import contract
import verifier_process
import gate
import supply
import tag_signature

PROVENANCE = 'https://slsa.dev/provenance/v1'
SPDX = 'https://spdx.dev/Document'


def attestation_command(subject, tag, source_sha, bundle=None, trusted_root=None):
    return contract.attestation_command(subject, tag, source_sha, bundle, trusted_root)


def verify(root, bundle, source_sha, tag, run_id=None, attesting_attempt=None, trusted_root=None):
    root = Path(root)
    value = contract.verify(root, tag, source_sha, bundle, run_id, attesting_attempt, trusted_root)
    supply.verify_binary_inventory(value, root)
    gate.require(contract.load(root) == value, 'release bytes changed during binary verification')
    return value


def image_descriptor(root, value):
    index = gate.strict_json(contract.regular(Path(root) / 'ghcr-index.json'))
    gate.require('ghcr' in value['channels'] and index.get('schema') == 1
                 and index.get('source_sha') == value['source_sha']
                 and index.get('version') == value['tag'].removeprefix('v')
                 and isinstance(index.get('platforms'), dict) and set(index['platforms']) == {'amd64','arm64'},
                 'invalid release image descriptor')
    digests = [index.get('digest'), *index['platforms'].values()]
    gate.require(all(isinstance(d, str) and re.fullmatch(r'sha256:[0-9a-f]{64}', d) for d in digests)
                 and len(set(digests)) == 3, 'invalid release image digest set')
    return index


def verify_image_subject(image, value, bundle=None, predicate_type=PROVENANCE, manifest=None, trusted_root=None):
    gate.require(re.fullmatch(r'ghcr\.io/marcinwadon/hennery@sha256:[0-9a-f]{64}', image), 'verification requires an immutable image digest')
    gate.require(predicate_type in (PROVENANCE, SPDX), 'unexpected attestation predicate')
    subject = 'oci://' + image
    if manifest is not None:
        manifest = Path(manifest)
        gate.require(bundle is not None and 'sha256:' + gate.digest(contract.regular(manifest)) == image.split('@',1)[1],
                     'local manifest must match the release image digest and have a bundle')
        subject = manifest
    command = attestation_command(subject, value['tag'], value['source_sha'], bundle, trusted_root)
    command[command.index('--predicate-type') + 1] = predicate_type
    if bundle is None: command += ['--bundle-from-oci']
    result = verifier_process.run(command, check=True, capture_output=True, text=True)
    verified = gate.strict_json(result.stdout)
    contract.require_identity(verified, value['tag'], value['source_sha'])
    contract.require_run(verified, value['attesting']['run_id'], value['attesting']['run_attempt'])


def verify_image(image, tag, bundle=None, predicate_type=PROVENANCE, release_directory=None,
                 release_bundle=None, manifest=None, source_sha=None, run_id=None,
                 attesting_attempt=None, trusted_root=None):
    gate.require(re.fullmatch(r'ghcr\.io/marcinwadon/hennery@sha256:[0-9a-f]{64}', image), 'verification requires an immutable image digest')
    gate.require(release_directory is not None and release_bundle is not None and source_sha is not None,
                 'image requires checksum-authenticated release and source binding')
    root = Path(release_directory)
    value = contract.load(root)
    index = image_descriptor(root, value)
    gate.require(image.split('@',1)[1] in [index['digest'], *index['platforms'].values()], 'image digest is not in release descriptor')
    verified = verify(root, release_bundle, source_sha, tag, run_id, attesting_attempt, trusted_root)
    gate.require(verified == value, 'release changed before image verification')
    verify_image_subject(image, value, bundle, predicate_type, manifest, trusted_root)
    gate.require(contract.load(root) == value, 'release bytes changed during image verification')
    return value


def require_binstall_metadata(metadata, tag):
    # Native binstall has no exact workflow/source/run verifier. These mappings
    # are dormant until a separately reviewed bridge implements this contract.
    disabled = metadata.get('binstall', {}).get('disabled-strategies')
    gate.require(isinstance(disabled, list) and sorted(disabled) == ['compile','crate-meta-data','quick-install'],
                 'native binstall strategies must remain disabled without an identity-verifying bridge')
    policy = metadata.get('hennery-release', {})
    command = attestation_command('unused', tag, '0' * 40)
    gate.require(policy.get('verification') == 'external-signed-tag-sigstore'
                 and policy.get('maintainer-fingerprint') == tag_signature.FINGERPRINT
                 and policy.get('signer-identity') == command[command.index('--cert-identity') + 1],
                 'binstall external verification metadata must pin the exact release-tag identity')


def arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--release-directory', type=Path, required=True)
    parser.add_argument('--bundle', type=Path, required=True, help='release SHA256SUMS and payload provenance bundle')
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--run-id', required=True, type=int)
    parser.add_argument('--attesting-attempt', required=True, type=int)
    parser.add_argument('--trusted-root', type=Path)
    parser.add_argument('--image')
    parser.add_argument('--image-bundle', type=Path)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--predicate-type', choices=[PROVENANCE, SPDX], default=PROVENANCE)
    return parser.parse_args(argv)


def main():
    args = arguments()
    if args.image:
        verify_image(args.image, args.tag, args.image_bundle, args.predicate_type, args.release_directory,
                     args.bundle, args.manifest, args.source_sha, args.run_id, args.attesting_attempt, args.trusted_root)
    else:
        verify(args.release_directory, args.bundle, args.source_sha, args.tag, args.run_id, args.attesting_attempt, args.trusted_root)


if __name__ == '__main__':
    try: main()
    except (gate.Refused, KeyError, OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit('release verification refused: ' + str(error)) from error
``````

<!-- replay-file: {"path":"packaging/release/workflow_policy.py","mode":"100644","sha256":"ea7fc5c71d2913a872054f861a5dd6b176413eb166e77b3a7c3c6c4d4320f221","encoding":"utf8"} -->
``````python
#!/usr/bin/env python3
"""Defense-in-depth lint only; platform environment/registry policy is the boundary."""
from pathlib import Path
import re
import sys



# Channel -> owning YAML job ID. The literal API display name is the channel.
# R4's name is reserved now; selection refuses until its owning job exists.
CHANNEL_JOB_IDS = {'crates': 'crates', 'ghcr': 'ghcr', 'homebrew': 'homebrew'}


def has_secrets(value):
    return re.search(r'\bsecrets\s*(?:\.|\[)', str(value), re.I) is not None


def load_workflow(raw):
    # Most release helpers use only the stdlib parts of gate/workflow_policy.
    # The signed-workflow binding always needs the pinned parser and refuses
    # explicitly when it is unavailable; there is no permissive fallback.
    try:
        import yaml
    except ImportError as error:
        raise ValueError('workflow parser unavailable; run inside nix develop .#release') from error

    class UniqueSafeLoader(yaml.SafeLoader):
        def construct_mapping(self, node, deep=False):
            self.flatten_mapping(node)
            seen = set()
            for key_node, _ in node.value:
                key = self.construct_object(key_node, deep=deep)
                if key in seen:
                    raise ValueError('duplicate workflow YAML key')
                seen.add(key)
            return super().construct_mapping(node, deep=deep)

    try:
        data = yaml.load(raw, Loader=UniqueSafeLoader)
    except yaml.YAMLError as error:
        raise ValueError('invalid workflow YAML') from error
    if not isinstance(data, dict):
        raise ValueError('workflow mapping required')
    return data


def channel_jobs(data):
    """Bind job API names to owning IDs in the exact tagged workflow."""
    jobs = data.get('jobs')
    if not isinstance(jobs, dict) or not jobs:
        raise ValueError('release job identity: jobs mapping required')
    seen = set()
    for job_id, job in jobs.items():
        if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]*', job_id) or not isinstance(job, dict):
            raise ValueError('release job identity: invalid job ID or definition')
        display = job.get('name', job_id)
        if not isinstance(display, str) or not display or '${{' in display:
            raise ValueError('release job identity: names must be literal strings')
        if display in seen:
            raise ValueError('release job identity: display name collision')
        seen.add(display)
        if display in CHANNEL_JOB_IDS and CHANNEL_JOB_IDS[display] != job_id:
            raise ValueError('release job identity: reserved name belongs to another job ID')
        for channel, owner in CHANNEL_JOB_IDS.items():
            if job_id == owner and (display != channel or 'strategy' in job):
                raise ValueError('release job identity: channel owner requires its literal name and no matrix')
    return {channel: owner for channel, owner in CHANNEL_JOB_IDS.items() if owner in jobs}


def optional_job_status(data, name):
    """Actions propagates skips through ancestors unless an explicit status is used.

    Qualification DAGs may join an optional channel, then continue through
    several unconditional jobs. Check every descendant, not only direct needs.
    This lint does not prove the guard's result semantics; production guards
    are also bound to the secret-free Actions scheduling regression.
    """
    jobs = data.get('jobs', {})
    optional = {key for key, job in jobs.items() if 'if' in job}
    descendants = set()
    frontier = set(optional)
    while frontier:
        following = set()
        for key, job in jobs.items():
            needs = job.get('needs', [])
            needs = [needs] if isinstance(needs, str) else needs
            if key not in descendants and frontier.intersection(needs):
                following.add(key)
        descendants.update(following)
        frontier = following
    for key in sorted(descendants):
        # A status-looking string literal is not an Actions status function.
        condition = re.sub(r"'(?:[^']|'')*'|\"(?:[^\"\\]|\\.)*\"", '', str(jobs[key].get('if', '')))
        if not re.search(r'(?<![\w.])(?:always|cancelled|failure|success)\s*\(', condition):
            raise ValueError(f'{name}/{key}: optional job ancestor requires an explicit status condition')


def environment_name(job):
    environment = job.get('environment')
    return environment.get('name') if isinstance(environment, dict) else environment


def check_simplified(data):
    """Police the authorized workflow, not arbitrary repository writers."""
    def require(value, message):
        if not value:
            raise ValueError(message)
    trigger = data.get('on', data.get(True))
    require(trigger == {'push': {'tags': ['v*']}}, 'release must be tag-push only')
    require(data.get('permissions') == {'contents': 'read'}, 'release default must be read-only')
    require(not has_secrets(data.get('env', {})), 'workflow secrets forbidden')
    jobs = data.get('jobs', {})
    required = {'tag-signature','web-ui','qualification','archive','crates','assemble','ghcr',
                'installer','homebrew-native','homebrew','attest','publish'}
    require(required <= set(jobs), 'single release graph incomplete')
    channel_jobs(data)
    # Explicit status conditions are essential after optional channel ancestors.
    optional_job_status(data, 'release.yml')
    visiting, visited = set(), set()
    def walk(name):
        require(name in jobs, 'DAG dependency missing')
        require(name not in visiting, 'DAG cycle')
        if name in visited:
            return
        visiting.add(name)
        needs=jobs[name].get('needs',[])
        for parent in ([needs] if isinstance(needs,str) else needs):walk(parent)
        visiting.remove(name);visited.add(name)
    for key in jobs:walk(key)
    budgets={'attest':{'contents':'read','id-token':'write','attestations':'write'},
             'publish':{'contents':'write','actions':'read','attestations':'read','id-token':'write'}}
    for key,job in jobs.items():
        require('uses' not in job, 'reusable jobs forbidden')
        require(type(job.get('timeout-minutes')) is int and job['timeout-minutes']>0, 'timeout required')
        require(job.get('continue-on-error') in (None,False), 'jobs must fail closed')
        require(job.get('permissions',data['permissions'])==budgets.get(key,{'contents':'read'}), 'excess job permissions')
        require(environment_name(job)==('release' if key=='publish' else None), 'only publisher enters protected release')
        require(not has_secrets(job.get('env',{})), 'job secrets forbidden')
        for step in job.get('steps',[]):
            uses=step.get('uses','')
            require(not uses or uses.startswith('./') or re.fullmatch(r'[^@]+@[0-9a-f]{40}',uses), 'action must be pinned')
            require('cache' not in uses.casefold(), 'release cache restore forbidden')
            require(step.get('continue-on-error') in (None,False), 'steps must fail closed')
            if uses.startswith('actions/checkout@'):
                require(step.get('with',{}).get('ref')=='${{ github.sha }}' and step['with'].get('persist-credentials') is False,
                        'checkout must use exact source without persisted authority')
            if has_secrets(step):require(key=='publish', 'publication secret outside release')
    attest=jobs['attest']
    require(set(attest.get('needs',[])) >= required-{'publish','attest','archive','web-ui'}, 'attestation must await complete acceptance')
    selection=lambda c:"contains(fromJSON(needs.tag-signature.outputs.channels), '"+c+"')"
    condition="!cancelled() && "+' && '.join("needs."+key+".result == 'success'" for key in ['tag-signature','qualification','assemble','installer','homebrew-native'])
    for channel in ['homebrew','crates','ghcr']:
        condition+=" && (needs."+channel+".result == 'success' || (needs."+channel+".result == 'skipped' && !"+selection(channel)+'))'
    require(attest.get('if')=='${{ '+condition+' }}', 'attestation cannot bypass selected or required acceptance')
    checks=[i for i,s in enumerate(attest['steps']) if 'release_run.py check payload' in s.get('run','')]
    signers=[i for i,s in enumerate(attest['steps']) if s.get('uses','').startswith('actions/attest')]
    require(len(checks)==1 and signers and checks[0]<min(signers) and attest['steps'][checks[0]].get('if') is None,
            'original-attempt byte check must precede attestation')
    summaries=[s for s in attest['steps'] if s.get('id')=='summary']
    require(len(summaries)==1 and summaries[0].get('if') is None and 'release_run.py summary ' in summaries[0].get('run',''), 'asset digest summary required')
    publisher=jobs['publish']
    require(publisher.get('needs')==['attest'], 'publisher must depend on attestation')
    require(publisher.get('if')=="${{ !cancelled() && needs.attest.result == 'success' && vars.RELEASE_PUBLICATION_ENABLED == 'true' && vars.RELEASE_GITHUB_ENABLED == 'true' }}",
            'publisher switches and successful attestation required')
    steps=publisher['steps'];positions={s.get('id'):i for i,s in enumerate(steps) if s.get('id')}
    require('verified' in positions and 'github-publish' in positions and positions['verified']<positions['github-publish'], 'verification must precede publication')
    for key,command in [('verified','verify original/payload original/signatures github'),('github-publish','publish original/payload original/signatures')]:
        step=steps[positions[key]]
        require(step.get('if') is None and 'release_run.py '+command in step.get('run','') and '||' not in step['run'], 'integrity gate must be unconditional and fatal')
    for channel in CHANNEL_JOB_IDS:
        condition="${{ vars.RELEASE_"+channel.upper()+"_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), '"+channel+"') }}"
        require(channel+'-verify' in positions and channel+'-publish' in positions, 'folded channel gate required')
        before,write=positions[channel+'-verify'],positions[channel+'-publish']
        require(positions['github-publish']<before<write, 'channel must follow immutable publication and verification')
        for index in (before,write):require(steps[index].get('if')==condition, 'channel needs switch and selection')
        require('release_run.py verify ' in steps[before].get('run','') and 'release_run.py channel ' in steps[write].get('run',''), 'channel verifier/writer command required')
    for index,step in enumerate(steps):
        if has_secrets(step):
            require(index in {positions[c+'-publish'] for c in CHANNEL_JOB_IDS}, 'credentials must follow channel verification')
        if step.get('uses','').startswith('rust-lang/crates-io-auth-action@'):
            require(positions['crates-verify']<index<positions['crates-publish'], 'OIDC exchange must follow verification')
            require(step.get('if')=="${{ vars.RELEASE_CRATES_ENABLED == 'true' && contains(fromJSON(steps.verified.outputs.channels), 'crates') && vars.RELEASE_CRATES_BOOTSTRAP_ENABLED != 'true' }}",
                    'OIDC exchange requires selection/switch and must not bootstrap')


def check(data, name):
    if name == 'release.yml':
        return check_simplified(data)
    if has_secrets(data):
        raise ValueError('release credentials outside authorized release workflow')
    if data.get('permissions', {}).get('contents') == 'write':
        raise ValueError('contents write outside authorized release workflow')
    for job in data.get('jobs', {}).values():
        if 'uses' in job or environment_name(job) == 'release' or any(v == 'write' for v in job.get('permissions', {}).values()):
            raise ValueError('release authority outside authorized workflow')
        for step in job.get('steps', []):
            uses=step.get('uses','')
            if uses and not re.fullmatch(r'[^@]+@[0-9a-f]{40}', uses):
                raise ValueError('action must be pinned')
    if name == 'release-scheduling.yml':optional_job_status(data, name)


def check_repository(root):
    paths=sorted((Path(root)/'.github/workflows').glob('*.y*ml'))
    if not {'release.yml','release-tests.yml'} <= {p.name for p in paths}:
        raise ValueError('tagged release and refusal-test workflows required')
    for path in paths:
        data=load_workflow(path.read_bytes())
        # Lint all workflows for unexpected write/environment/reusable authority.
        # Other CI may use its explicitly reviewed secret-free OIDC cache signer.
        if path.name.startswith('release') or has_secrets(data) or 'write' in data.get('permissions',{}).values() or any(environment_name(j)=='release' or 'write' in j.get('permissions',{}).values() or 'uses' in j for j in data.get('jobs',{}).values()):
            check(data,path.name)


if __name__ == '__main__':
    check_repository(Path(__file__).resolve().parents[2])
    print('release workflow authority graph checked')
``````

<!-- replay-file: {"path":"packaging/test-installer.sh","mode":"100755","sha256":"55184d7a872933764dfb3b8ea19caaafdf24d24f329f9ecf5d0b28fc3bea0ec7","encoding":"utf8"} -->
``````sh
#!/bin/sh
# The hardened shell installer (distribution spec §2, §9), run against the
# archives of this build, served from a directory (`file://`):
#   - each executable archive is offered, with its SHA-256 embedded;
#     application and third-party source bundles are separate release assets;
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

# Offline acceptance has no real release tag or attestation. These doubles
# enforce the exact public verifier invocation; consumer tests use real GPG tags.
fixture_version=$(sed -n 's/^APP_VERSION="\([^"]*\)"$/\1/p' "$installer")
mkdir "$scratch/verifier-tools"
printf 'offline verification fixture\n' > "$scratch/bundle.jsonl"
cat > "$scratch/verifier-tools/gh" <<TOOL
#!/bin/sh
set -eu
[ "\$1" = attestation ] && [ "\$2" = verify ] || exit 1
shift 3
identity=0
source=0
source_digest=0
signer_digest=0
while [ "\$#" -gt 0 ]; do
    case "\$1" in
        --cert-identity)
            [ "\$2" = "https://github.com/marcinwadon/hennery/.github/workflows/release.yml@\${HENNERY_TEST_SIGNER_REF:-refs/tags/v$fixture_version}" ] || exit 1
            identity=1; shift 2 ;;
        --source-ref)
            [ "\$2" = 'refs/tags/v$fixture_version' ] || exit 1
            source=1; shift 2 ;;
        --source-digest)
            [ "\$2" = 1111111111111111111111111111111111111111 ] || exit 1
            source_digest=1; shift 2 ;;
        --signer-digest)
            [ "\$2" = 1111111111111111111111111111111111111111 ] || exit 1
            signer_digest=1; shift 2 ;;
        --signer-workflow) exit 1 ;;
        *) shift ;;
    esac
done
[ "\$identity\$source\$source_digest\$signer_digest" = 1111 ] || exit 1
printf verified > '$scratch/signature-verified'
printf '%s\n' '{"verificationResult":{"signature":{"certificate":{"runInvocationURI":"https://github.com/marcinwadon/hennery/actions/runs/10/attempts/'"\${HENNERY_TEST_ATTESTING_ATTEMPT:-1}"'"}}}}' | sed 's/^/[/;s/\$/]/'
TOOL
chmod +x "$scratch/verifier-tools/gh"
cat > "$scratch/verifier-tools/gpg" <<'TOOL'
#!/bin/sh
for argument in "$@"; do [ "$argument" != --import ] || exit 0; done
exit 1
TOOL
cat > "$scratch/verifier-tools/git" <<TOOL
#!/bin/sh
set -eu
for argument in "\$@"; do
    case "\$argument" in
        init) exit 0 ;;
        fetch) exit 0 ;;
        rev-parse) echo 2222222222222222222222222222222222222222; exit 0 ;;
        cat-file)
            printf 'object 1111111111111111111111111111111111111111\ntype commit\ntag v$fixture_version\ntagger Disposable fixture\n\nOffline fixture\n'; exit 0 ;;
        verify-tag)
            case "\${HENNERY_TEST_TAG_SIGNATURE:-valid}" in
                unsigned|malformed) exit 1 ;;
                wrong-key) echo '[GNUPG:] VALIDSIG 0000000000000000000000000000000000000000' >&2; exit 0 ;;
            esac
            echo '[GNUPG:] VALIDSIG F26C7F594DFE84D131703AFC23E5A318AE8D2861' >&2; exit 0 ;;
    esac
done
exit 1
TOOL
chmod +x "$scratch/verifier-tools/gpg" "$scratch/verifier-tools/git"

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
    [ -f "$dist/$archive" ] || fail "the installer offers $archive, and this build has no $archive"
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
    [ -f "$archive" ] || continue
    case "${archive##*/}" in
        hennery-*-unknown-linux-musl.tar.xz | hennery-*-apple-darwin.tar.xz) ;;
        *) continue ;;
    esac
    printf '%s\n' "$arms" | grep -Fxq "${archive##*/}" ||
        fail "the installer does not offer ${archive##*/}"
    built=$((built + 1))
done
[ "$count" = "$built" ] || fail "the installer offers $count archives, this build made $built"
echo "ok: the installer embeds each of its $count archives' SHA-256"

# SHA256SUMS is independent of the installer's embedded checksum.
command -v jq >/dev/null || fail 'jq is required for provenance fixtures'
ln -s "$(command -v jq)" "$scratch/verifier-tools/jq"
jq -n --arg tag "v$fixture_version" '{schema:2,repository:"marcinwadon/hennery",tag:$tag,source_sha:"1111111111111111111111111111111111111111",tag_object:"2222222222222222222222222222222222222222",attesting:{run_id:10,run_attempt:1}}' > "$scratch/release-metadata.json"
: > "$scratch/SHA256SUMS"
for archive in $arms; do
    want=$(cut -d ' ' -f 1 "$dist/$archive.sha256")
    printf '%s  %s\n' "$want" "$archive" >> "$scratch/SHA256SUMS"
done
metadata_sha=$(shasum -a 256 "$scratch/release-metadata.json" | awk '{print $1}')
printf '%s  release-metadata.json\n' "$metadata_sha" >> "$scratch/SHA256SUMS"
LC_ALL=C sort -k2 "$scratch/SHA256SUMS" > "$scratch/ordered-sums"
mv "$scratch/ordered-sums" "$scratch/SHA256SUMS"

# run_installer <download dir> <install dir> <log>: the installer's exit status.
run_installer() {
    mkdir -p "$scratch/home"
    status=0
    PATH="${VERIFIER_TOOLS:-$scratch/verifier-tools}:${INSTALLER_SYSTEM_PATH:-$PATH}" \
        HOME="$scratch/home" XDG_CONFIG_HOME="$scratch/home/.config" \
        HENNERY_ATTESTATION_BUNDLE="$scratch/bundle.jsonl" \
        HENNERY_RELEASE_CHECKSUMS="${TEST_CHECKSUMS:-$scratch/SHA256SUMS}" \
        HENNERY_RELEASE_METADATA="${TEST_METADATA:-$scratch/release-metadata.json}" \
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
link_tool() {
    _link_source=$1
    _link_destination=$2
    if [ -e "$_link_destination" ] || [ -L "$_link_destination" ]; then
        [ -L "$_link_destination" ] && [ "$_link_destination" -ef "$_link_source" ] ||
            fail "conflicting tool link: $_link_destination"
    else
        ln -s "$_link_source" "$_link_destination" || fail "cannot link tool: $_link_destination"
    fi
}

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
            link_tool "$tool" "$dir/$name"
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
[ -f "$scratch/signature-verified" ] || fail 'installer never authenticated release provenance'
echo "ok: installs a binary that runs"

# With `shasum` and no `sha256sum`.
tools "$scratch/shasum-tools" sha256sum
# In a subshell: an assignment before a function call may outlive it.
(INSTALLER_SYSTEM_PATH="$scratch/shasum-tools" run_installer "$dist" "$scratch/shasum" "$scratch/shasum.log") || {
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
(INSTALLER_SYSTEM_PATH="$scratch/no-tools" refused unchecked "$dist" "$UNCHECKED")
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
    (! INSTALLER_SYSTEM_PATH="$tool_dir" run_installer "$dist" "$scratch/failing-$command" "$scratch/failing-$command.log") ||
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
    (! INSTALLER_SYSTEM_PATH="$tool_dir" run_installer "$dist" "$scratch/unsupported-$kind" "$scratch/unsupported-$kind.log") ||
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
(INSTALLER_SYSTEM_PATH="$scratch/observe-copy-tools" run_installer "$dist" "$scratch/observe-copy" "$scratch/observe-copy.log") || fail 'staged copy failed'
[ -f "$scratch/copy-observed" ] || fail 'the installer did not stage the copy'
tools "$scratch/raced-tools" ln
cat > "$scratch/raced-tools/ln" <<TOOL
#!/bin/sh
printf raced > "\$HENNERY_UNMANAGED_INSTALL/hennery"
exec '$real_ln' "\$@"
TOOL
chmod +x "$scratch/raced-tools/ln"
(! INSTALLER_SYSTEM_PATH="$scratch/raced-tools" run_installer "$dist" "$scratch/raced" "$scratch/raced.log") || fail 'concurrent destination was replaced'
[ "$(cat "$scratch/raced/hennery")" = raced ] || fail 'concurrent destination changed'
echo 'ok: staging is invisible and concurrent destinations survive'

# Signed source, attested checksums and matching invocation are mandatory.
for kind in unsigned malformed wrong-key; do
    (export HENNERY_TEST_TAG_SIGNATURE="$kind"; refused "tag-$kind" "$dist" 'valid pinned signed release tag')
done
echo 'ok: unsigned tag, malformed signature and another signing key abort'
(TEST_CHECKSUMS="$scratch/missing-sums"; export TEST_CHECKSUMS; refused missing-sums "$dist" 'release-tag provenance')
echo 'ok: missing SHA256SUMS aborts'
sed 's/[0-9a-f]/0/g' "$scratch/SHA256SUMS" > "$scratch/wrong-sums"
(TEST_CHECKSUMS="$scratch/wrong-sums"; export TEST_CHECKSUMS; refused other-digest "$dist" 'release-tag provenance')
echo 'ok: SHA256SUMS must authorize the exact archive bytes'
(export HENNERY_TEST_ATTESTING_ATTEMPT=2; refused wrong-attempt "$dist" 'release-tag provenance')
echo 'ok: provenance from another attempt aborts'

(export HENNERY_TEST_SIGNER_REF=refs/heads/main; refused branch-signer "$dist" 'refusing an archive without valid release-tag provenance')
echo 'ok: branch signer identity cannot authorize installation'
tools "$scratch/no-gh-tools" gh gpg jq git
link_tool "$scratch/verifier-tools/gpg" "$scratch/no-gh-tools/gpg"
link_tool "$scratch/verifier-tools/jq" "$scratch/no-gh-tools/jq"
link_tool "$scratch/verifier-tools/git" "$scratch/no-gh-tools/git"
(INSTALLER_SYSTEM_PATH="$scratch/no-gh-tools" VERIFIER_TOOLS="$scratch/no-gh-tools" refused missing-verifier "$dist" 'GitHub CLI is required')
echo 'ok: missing signature verifier refuses installation'
``````

<!-- replay-file: {"path":"packaging/tests/test_ghcr.py","mode":"100644","sha256":"792bc2e4c0e0367fc12cae9cf0537f3d2f63ca893f53bd0f53f9c625cfac5104","encoding":"utf8"} -->
``````python
"""Folded GHCR lifecycle with deterministic transports and no registry access.

Real OCI closure lives in test_release_images; actual HTTP status classification
lives in test_ghcr_remote; authentic crypto lives in test_verify_cli.
"""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parents[1]/'release'))
import channel_publish as publisher
import gate


class GHCR(unittest.TestCase):
    def execute(self, mode='new', boundary=0):
        self.events=[];self.copies=0;self.attaches=0;present=mode in ('present','partial');reconciles=0;checks=0
        digest='sha256:'+'a'*64
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);value={'tag':'v0.1.0'}
            def verify(*args,**kwargs):
                nonlocal checks
                checks+=1;self.events.append('verify')
                if checks==boundary:raise gate.Refused('verification withdrawn')
                if kwargs.get('subjects'):
                    self.assertTrue(all(item[4].parent.name=='fetched' for item in kwargs['subjects']))
                if kwargs.get('subjects') and mode=='remote-failure':raise gate.Refused('fetched signature refused')
            def shared(*args):
                self.events.append('shared')
                if mode=='approval-withdrawn' and self.copies==0 and self.events.count('shared')>1:raise gate.Refused('review withdrawn')
                if mode=='referrer-withdrawn' and self.copies>0:raise gate.Refused('review withdrawn before referrer')
                return value
            def reconcile(*args):
                nonlocal reconciles
                reconciles+=1;self.events.append('reconcile')
                if mode in ('conflict','unauthorized','timeout'):raise gate.Refused('remote refused')
                if mode=='late-conflict' and reconciles>=3:raise gate.Refused('new conflicting version')
                return 0 if present else 1
            def run(command,**kwargs):
                nonlocal present
                operation=command[0]+' '+command[1];self.events.append(operation)
                if operation=='skopeo login':
                    self.assertIn('verify',self.events[:-1]);self.assertEqual(kwargs['input'],'offline-credential')
                    self.assertNotIn('offline-credential',str(command))
                    Path(command[command.index('--authfile')+1]).write_text('{}')
                if operation=='skopeo copy':
                    self.copies+=1;self.assertIn('--preserve-digests',command);self.assertIn('--all',command)
                    self.assertEqual(command[-1],'docker://ghcr.io/marcinwadon/hennery@'+digest)
                    self.assertNotIn(':latest',' '.join(command));self.assertNotIn(':0.1.0',' '.join(command));present=True
                    if mode=='copy-failure':raise subprocess.CalledProcessError(1,command)
            def bundles(subjects,output,before_write,**kwargs):
                self.assertNotIn('GH_TOKEN',kwargs['environment'])
                self.assertNotIn('ACTIONS_ID_TOKEN_REQUEST_TOKEN',kwargs['environment'])
                missing=[] if mode=='present' else subjects[1:] if mode=='partial' else subjects
                for _ in missing:
                    before_write();self.attaches+=1
                    if mode=='attach-failure':raise subprocess.CalledProcessError(1,['oras','copy'])
                return [(*item[:4],output/item[4].name) for item in subjects]
            subjects=[('index','provenance',digest,'slsa',root/'index.json')]+[(arch,kind,digest,'slsa' if kind=='provenance' else 'spdx',root/(arch+kind+'.json')) for arch in ('amd64','arm64') for kind in ('provenance','image-sbom','binary-sbom')]
            with patch.dict(os.environ,{'GHCR_PUBLISH_TOKEN':'offline-credential','GHCR_PUBLISH_USER':'fixture','GH_TOKEN':'write-canary','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'oidc-canary'}),patch.object(publisher,'shared_verify',side_effect=shared),patch.object(publisher,'image_helper',return_value=SimpleNamespace(inspect_release=lambda *a:{'digest':digest})),patch.object(publisher,'registry_helper',return_value=SimpleNamespace(reconcile=reconcile)),patch.object(publisher,'check_images',side_effect=verify),patch.object(publisher,'image_subjects',return_value=subjects),patch.object(publisher.registry_bundles,'reconcile',side_effect=bundles),patch.object(publisher.subprocess,'run',side_effect=run):
                return publisher.publish(root,root,'ghcr')

    def test_absent_uploads_only_digest_and_all_seven_bundles(self):
        self.execute();self.assertEqual(self.copies,1);self.assertEqual(self.attaches,7)
    def test_matching_retry_uses_existing_content(self):
        self.execute('present');self.assertEqual(self.copies,0);self.assertEqual(self.attaches,0)
    def test_conflict_auth_timeout_and_late_version_never_overwrite(self):
        for mode in ('conflict','unauthorized','timeout','late-conflict'):
            with self.subTest(mode=mode),self.assertRaises(gate.Refused):self.execute(mode)
            self.assertEqual(self.copies,0);self.assertEqual(self.attaches,0)
    def test_each_verification_boundary_refuses_its_following_write(self):
        # Initial local, upload local, each missing referrer, fetched final.
        for count in range(1,11):
            with self.subTest(count=count),self.assertRaises(gate.Refused):self.execute(boundary=count)
            if count==1:self.assertNotIn('skopeo login',self.events)
            if count<=2:self.assertEqual(self.copies,0)
            if 3<=count<=9:self.assertEqual(self.attaches,count-3)
    def test_approval_withdrawal_refuses_before_blob_upload(self):
        with self.assertRaises(gate.Refused):self.execute('approval-withdrawn')
        self.assertEqual(self.copies,0)
    def test_approval_withdrawal_refuses_before_referrer_upload(self):
        with self.assertRaises(gate.Refused):self.execute('referrer-withdrawn')
        self.assertEqual(self.copies,1);self.assertEqual(self.attaches,0)
    def test_ambiguous_upload_stops_then_new_approved_retry_reconciles(self):
        with self.assertRaises(subprocess.CalledProcessError):self.execute('copy-failure')
        self.assertEqual(self.copies,1);self.assertEqual(self.attaches,0)
        self.execute('present');self.assertEqual(self.copies,0)
    def test_partial_bundle_upload_stops_then_matching_retry_finishes(self):
        with self.assertRaises(subprocess.CalledProcessError):self.execute('attach-failure')
        self.assertEqual(self.attaches,1)
        self.execute('partial');self.assertEqual(self.copies,0);self.assertEqual(self.attaches,6)
        self.execute('present');self.assertEqual(self.copies,0);self.assertEqual(self.attaches,0)
    def test_remote_verification_failure_is_not_channel_success(self):
        with self.assertRaises(gate.Refused):self.execute('remote-failure')
        self.assertEqual(self.attaches,7)
``````

<!-- replay-file: {"path":"packaging/tests/test_ghcr_candidate.py","mode":"100644","sha256":"be3005c54c6396257567b02f006417c328c950ed7e21a79f12fb3fc0290969be","encoding":"utf8"} -->
``````python
"""Real OCI/archive fixtures; cryptographic transports are explicit structural doubles."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import unittest
from unittest.mock import patch

from test_image import CandidateFixtures, image

PACKAGING = Path(__file__).parents[1]
sys.path.insert(0, str(PACKAGING / 'release'))
import contract
import gate
import supply
import verify as release_verify

TARGETS = {'amd64': 'x86_64-unknown-linux-musl', 'arm64': 'aarch64-unknown-linux-musl'}


def load_helper(test):
    path = PACKAGING / 'ghcr-candidate.py'
    test.assertTrue(path.is_file(), 'release must materialize the checksum-bound OCI layout')
    spec = importlib.util.spec_from_file_location('ghcr_candidate', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ReleaseFixture(CandidateFixtures):
    def setUp(self):
        super().setUp()
        self.version = '0.1.0'
        self.candidate = self.root / 'candidate'
        self.candidate.mkdir()
        self.work = self.root / 'image-candidate'
        self.natives = []
        base = self.root
        for arch, target in TARGETS.items():
            self.root = base / arch
            (self.root / 'blobs/sha256').mkdir(parents=True)
            self.fixture(arch=arch, labels={'org.opencontainers.image.version': self.version})
            self.natives.append(self.root)
            archive = self.candidate / ('hennery-' + target + '.tar.xz')
            prefix = 'hennery-' + target
            with tarfile.open(archive, 'w:xz') as output:
                directory = tarfile.TarInfo(prefix); directory.type = tarfile.DIRTYPE
                output.addfile(directory)
                for name, data in [('hennery', self.binary), ('LICENSE', b'licence'),
                                   ('README.md', b'readme'), ('THIRD-PARTY-NOTICES.txt', b'notices')]:
                    member = tarfile.TarInfo(prefix + '/' + name); member.size = len(data)
                    output.addfile(member, io.BytesIO(data))
            archive.with_suffix(archive.suffix + '.sha256').write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
        self.root = base


        self.real_run = subprocess.run
        def safe_transport(command, **kwargs):
            if command[:2] == [sys.executable, str(PACKAGING / 'ghcr-candidate.py')]:
                return self.real_run(command, **kwargs)  # local pure-data CLI only
            if command[:3] == ['gh', 'attestation', 'verify']:
                return self.crypto(command, **kwargs)  # structural, never external
            raise AssertionError('unstubbed external transport: ' + repr(command))
        transport = patch.object(subprocess, 'run', side_effect=safe_transport)
        transport.start(); self.addCleanup(transport.stop)
        tag = patch('tag_signature.verify', return_value={})
        tag.start(); self.addCleanup(tag.stop)

    def freeze(self, changes=None):
        for name in (contract.METADATA, contract.CHECKSUMS):
            (self.candidate / name).unlink(missing_ok=True)
        value = {'schema': 2, 'repository': gate.REPOSITORY, 'source_sha': self.revision,
                 'tag': 'v' + self.version, 'tag_object': 'b' * 40, 'channels': ['ghcr','github'],
                 'targets': sorted(TARGETS.values()), 'attesting': {'run_id':10,'run_attempt':1},
                 'binaries': supply.binary_inventory(self.candidate, sorted(TARGETS.values()))}
        contract.freeze(self.candidate, value | (changes or {}))
        self.inventory = contract.load(self.candidate)

    def crypto(self, command, **kwargs):
        # Structural fields use the real gh 2.101.0 flattened certificate shape;
        # authentic pinned-CLI cryptography is tested in test_verify_cli.py.
        certificate = {'sourceRepositoryURI':'https://github.com/' + gate.REPOSITORY,
                       'buildSignerURI':'https://github.com/' + gate.REPOSITORY + '/' + contract.WORKFLOW + '@refs/tags/v0.1.0',
                       'sourceRepositoryRef':'refs/tags/v0.1.0', 'sourceRepositoryDigest':self.revision,
                       'buildSignerDigest':self.revision, 'runnerEnvironment':'github-hosted',
                       'issuer':'https://token.actions.githubusercontent.com',
                       'runInvocationURI':'https://github.com/' + gate.REPOSITORY + '/actions/runs/10/attempts/1'}
        return subprocess.CompletedProcess(command, 0, gate.canonical([{
            'verificationResult':{'signature':{'certificate':certificate}}}]).decode(), '')

    def assembled(self):
        helper = load_helper(self)
        helper.assemble(self.candidate, self.root / 'assembled', self.natives, self.revision, self.version)
        self.freeze()
        return helper


class Candidate(ReleaseFixture, unittest.TestCase):
    def test_acceptance_binds_exact_source_tag_without_publication_authority(self):
        helper = self.assembled()
        for revision, version in [('b' * 40, self.version), (self.revision, '0.2.0')]:
            with self.subTest(revision=revision, version=version), self.assertRaisesRegex(gate.Refused, 'release source/tag'):
                helper.accept(self.candidate, self.work, revision, version)
        accepted = helper.accept(self.candidate, self.work, self.revision, self.version)
        self.assertEqual(accepted, json.loads((self.candidate / 'ghcr-index.json').read_bytes()))
        result = subprocess.run([sys.executable, str(PACKAGING / 'ghcr-candidate.py'), 'accept',
            str(self.candidate), str(self.root / 'cli-acceptance'), self.revision, self.version], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), accepted)

    def test_native_output_binds_index_platforms_and_binary_identity(self):
        helper = self.assembled()
        verified = helper.inspect_release(self.candidate, self.work, self.inventory)
        self.assertEqual(verified, json.loads((self.candidate / 'ghcr-index.json').read_bytes()))
        self.assertEqual(set(verified['platforms']), {'amd64','arm64'})
        for arch in TARGETS:
            self.assertEqual(verified['platforms'][arch], image.verify(self.work / 'layout',
                {a:self.inventory['binaries'][t]['sha256'] for a,t in TARGETS.items()},
                self.revision,self.version)['platforms'][arch]['digest'])

    def test_binary_archive_validation_is_required_at_materialization(self):
        helper=self.assembled()
        with patch.object(supply,'verify_binary_inventory',wraps=supply.verify_binary_inventory) as check:
            helper.inspect_release(self.candidate,self.work,self.inventory)
            check.assert_called_once_with(self.inventory,self.candidate)

    def test_missing_changed_or_extra_release_bytes_refuse(self):
        helper = self.assembled()
        path = self.candidate / 'ghcr-index.json'; raw = path.read_bytes()
        for kind in ('changed','missing','extra'):
            if kind == 'changed': path.write_bytes(raw + b' ')
            if kind == 'missing': path.unlink()
            if kind == 'extra': (self.candidate / 'unlisted').write_bytes(b'bytes')
            with self.subTest(kind=kind), self.assertRaises(gate.Refused):
                helper.inspect_release(self.candidate,self.work,self.inventory)
            path.write_bytes(raw); (self.candidate / 'unlisted').unlink(missing_ok=True)

    def test_stale_metadata_and_missing_ghcr_or_linux_target_refuse(self):
        helper = self.assembled()
        stale = copy.deepcopy(self.inventory); stale['attesting']['run_id'] = 11
        with self.assertRaisesRegex(gate.Refused,'metadata changed'):
            helper.inspect_release(self.candidate,self.work,stale)
        for changes in ({'channels':['github']},{'targets':[TARGETS['amd64']]}):
            self.freeze(changes)
            with self.subTest(changes=changes), self.assertRaisesRegex(gate.Refused,'GHCR and both Linux'):
                helper.inspect_release(self.candidate,self.work,self.inventory)

    def test_binary_identity_and_source_bound_descriptor_must_match_oci(self):
        helper = self.assembled()
        path = self.candidate / 'ghcr-index.json'; original = path.read_bytes()
        for field,value in [('source_sha','c'*40),('version','0.2.0'),('platforms',{'amd64':'sha256:'+'f'*64,'arm64':'sha256:'+'e'*64})]:
            changed=json.loads(original);changed[field]=value;path.write_bytes(gate.canonical(changed));self.freeze()
            with self.subTest(field=field),self.assertRaisesRegex(gate.Refused,'descriptor'):
                helper.inspect_release(self.candidate,self.work,self.inventory)
            path.write_bytes(original)
        self.freeze({'binaries':{}})
        with self.assertRaisesRegex(gate.Refused,'binary'):
            helper.inspect_release(self.candidate,self.work,self.inventory)

    def test_working_directory_is_outside_release_and_never_replaced(self):
        helper = self.assembled()
        with self.assertRaisesRegex(gate.Refused,'outside'):
            helper.inspect_release(self.candidate,self.candidate / 'work',self.inventory)
        helper.inspect_release(self.candidate,self.work,self.inventory)
        path=self.work / 'layout/oci-layout';path.write_text('{}')
        with self.assertRaisesRegex(gate.Refused,'working OCI'):
            helper.inspect_release(self.candidate,self.work,self.inventory)
        self.assertEqual(path.read_text(),'{}')

    def test_working_symlinks_and_metadata_tampering_refuse(self):
        helper=self.assembled();helper.inspect_release(self.candidate,self.work,self.inventory)
        alias=self.root / 'alias';alias.symlink_to(self.work,target_is_directory=True)
        with self.assertRaisesRegex(gate.Refused,'nonregular image working directory'):
            helper.inspect_release(self.candidate,alias,self.inventory)
        path=self.work / 'layout/oci-layout';path.unlink();path.symlink_to(self.natives[0] / 'oci-layout')
        with self.assertRaisesRegex(gate.Refused,'nonregular working OCI'):
            helper.inspect_release(self.candidate,self.work,self.inventory)
        path.unlink();path.write_bytes((self.natives[0] / 'oci-layout').read_bytes())
        (self.work / 'index-digest.txt').write_text('sha256:'+'f'*64)
        with self.assertRaisesRegex(gate.Refused,'metadata changed'):
            helper.inspect_release(self.candidate,self.work,self.inventory)

    def test_payload_changed_after_checksum_verification_refuses(self):
        helper=self.assembled();original=contract.load
        def changed(root):
            result=original(root)
            path=root / 'ghcr-index.json';path.write_bytes(path.read_bytes()+b' ')
            return result
        with patch.object(contract,'load',side_effect=changed),self.assertRaisesRegex(gate.Refused,'during verification'):
            helper.inspect_release(self.candidate,self.work,self.inventory)

    def test_existing_assembly_output_refuses_without_overwriting(self):
        helper = load_helper(self); work = self.root / 'existing'; work.mkdir()
        with self.assertRaisesRegex(gate.Refused, 'already exists'):
            helper.assemble(self.candidate, work, self.natives, self.revision, self.version)
        self.assertFalse((self.candidate / 'ghcr-index.json').exists())


    def test_descriptor_needs_one_retained_root_index(self):
        helper = load_helper(self); layout = self.root / 'flat'
        digest = image.merge(layout, self.natives)
        joined = json.loads((layout / 'blobs/sha256' / digest[7:]).read_bytes())
        (layout / 'index.json').write_text(json.dumps({'schemaVersion': 2, 'manifests': joined['manifests']}))
        with self.assertRaisesRegex(gate.Refused, 'one OCI index'):
            helper.descriptor(layout, dict.fromkeys(TARGETS, self.expected), self.revision, self.version)


    def archive(self, entries):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode='w') as archive:
            for name, kind, data in entries:
                member = tarfile.TarInfo(name); member.type = kind
                if kind == tarfile.REGTYPE:
                    member.size = len(data); archive.addfile(member, io.BytesIO(data))
                else:
                    member.linkname = data; archive.addfile(member)
        return output.getvalue()


    def test_ambiguous_oci_archive_paths_refuse(self):
        helper = load_helper(self)
        for name in ['../escape', './index.json', '/index.json', 'blobs//sha256/' + 'a' * 64, 'blobs/sha256/../escape']:
            with self.subTest(name=name), self.assertRaisesRegex(gate.Refused, 'archive path'):
                helper.tar_files(self.archive([(name, tarfile.REGTYPE, b'{}')]))


    def test_oci_archive_links_refuse_before_extraction(self):
        helper = load_helper(self)
        for kind in [tarfile.LNKTYPE, tarfile.SYMTYPE]:
            raw = self.archive([('index.json', tarfile.REGTYPE, b'{}'),
                ('blobs/sha256/' + 'a' * 64, kind, 'index.json')])
            with self.subTest(kind=kind), self.assertRaisesRegex(gate.Refused, 'nonregular'):
                helper.tar_files(raw)


    def test_duplicate_oci_archive_members_refuse(self):
        helper = load_helper(self)
        raw = self.archive([('index.json', tarfile.REGTYPE, b'{}'), ('index.json', tarfile.REGTYPE, b'{}')])
        with self.assertRaisesRegex(gate.Refused, 'duplicate'):
            helper.tar_files(raw)



class Consumer(ReleaseFixture, unittest.TestCase):
    def setUp(self):
        super().setUp();self.assembled()
        self.index=gate.strict_json((self.candidate / 'ghcr-index.json').read_bytes())

    def call(self,digest,**kwargs):
        return release_verify.verify_image('ghcr.io/marcinwadon/hennery@'+digest,'v0.1.0',
            release_directory=self.candidate,release_bundle=self.root/'bundle',source_sha=self.revision,
            run_id=10,attesting_attempt=1,**kwargs)

    def test_tag_authentication_precedes_sigstore(self):
        with patch('tag_signature.verify',side_effect=gate.Refused('bad tag')),patch.object(release_verify.subprocess,'run') as external:
            with self.assertRaisesRegex(gate.Refused,'bad tag'):self.call(self.index['digest'])
            external.assert_not_called()

    def test_unlisted_or_mutable_image_refuses_before_sigstore(self):
        with patch('tag_signature.verify'),patch.object(release_verify.subprocess,'run',side_effect=self.crypto) as external:
            with self.assertRaisesRegex(gate.Refused,'image digest'):self.call('sha256:'+'f'*64)
            with self.assertRaisesRegex(gate.Refused,'immutable image'):
                release_verify.verify_image('ghcr.io/marcinwadon/hennery:latest','v0.1.0')
            external.assert_not_called()

    def test_descriptor_identity_platform_set_and_distinct_digest_are_required(self):
        path=self.candidate / 'ghcr-index.json'
        for field,value in [('schema',2),('source_sha','b'*40),('version','0.2.0'),
                            ('platforms',['amd64','arm64']),('platforms',{'amd64':self.index['platforms']['amd64']}),
                            ('platforms',{'amd64':self.index['digest'],'arm64':self.index['platforms']['arm64']}),
                            ('digest','sha512:'+'a'*64),('digest',None)]:
            changed=copy.deepcopy(self.index);changed[field]=value;path.write_bytes(gate.canonical(changed));self.freeze()
            with self.subTest(field=field,value=value),patch.object(release_verify.subprocess,'run') as external,self.assertRaises(gate.Refused):self.call(self.index['digest'])
            external.assert_not_called()

    def test_every_authenticated_platform_and_index_has_exact_tag_source_and_run(self):
        for digest in [self.index['digest'],*self.index['platforms'].values()]:
            calls=[]
            def crypto(command,**kwargs):
                calls.append(command);return self.crypto(command,**kwargs)
            with self.subTest(digest=digest),patch('tag_signature.verify'),patch.object(release_verify.subprocess,'run',side_effect=crypto):self.call(digest)
            self.assertEqual(calls[-1][3],'oci://ghcr.io/marcinwadon/hennery@'+digest)
            self.assertIn('--bundle-from-oci',calls[-1]);self.assertNotIn('--signer-workflow',calls[-1])
            self.assertEqual(calls[-1][calls[-1].index('--cert-identity')+1],
                'https://github.com/'+gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0')

    def test_source_metadata_cannot_change_between_root_and_image_authentication(self):
        changed=copy.deepcopy(self.inventory);changed['attesting']['run_attempt']=2
        with patch.object(release_verify,'verify',return_value=changed),patch.object(release_verify,'verify_image_subject'),self.assertRaisesRegex(gate.Refused,'changed before'):
            self.call(self.index['digest'])

    def test_bytes_cannot_change_after_last_image_verification(self):
        calls=[]
        def changed(command,**kwargs):
            calls.append(command);result=self.crypto(command,**kwargs)
            if str(command[3]).startswith('oci://'):
                path=self.candidate/'ghcr-index.json';path.write_bytes(path.read_bytes()+b' ')
            return result
        with patch('tag_signature.verify'),patch.object(release_verify.subprocess,'run',side_effect=changed),self.assertRaises(gate.Refused):self.call(self.index['digest'])

    def test_local_manifest_must_match_authenticated_digest_and_have_bundle(self):
        helper=load_helper(self);helper.inspect_release(self.candidate,self.work,self.inventory)
        manifest=self.work/'layout/blobs/sha256'/self.index['digest'][7:]
        for bundle,data in [(None,manifest.read_bytes()),(self.root/'bundle',b'{}')]:
            manifest.write_bytes(data)
            with self.subTest(bundle=bundle),patch('tag_signature.verify'),patch.object(release_verify.subprocess,'run',side_effect=self.crypto),self.assertRaisesRegex(gate.Refused,'local manifest'):
                self.call(self.index['digest'],bundle=bundle,manifest=manifest)


if __name__ == '__main__': unittest.main()
``````

<!-- replay-file: {"path":"packaging/tests/test_ghcr_verify.py","mode":"100644","sha256":"8e4442c9b2751dd052226abf8e409a73ad20b3adddfdc29120c4067e15d22bf0","encoding":"utf8"} -->
``````python
"""Read-only OCI verifier; structural crypto doubles and real payload/layout bytes."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
from test_ghcr_candidate import ReleaseFixture, contract, gate, release_verify, PACKAGING

spec=importlib.util.spec_from_file_location('ghcr_verify',PACKAGING/'ghcr-verify.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)


class Bundles(ReleaseFixture,unittest.TestCase):
    def setUp(self):
        super().setUp();producer=self.assembled()
        self.index=producer.inspect_release(self.candidate,self.work,self.inventory)
        self.signatures=self.root/'signatures';self.signatures.mkdir()
        (self.signatures/contract.BUNDLE).write_text('{}')
        for *_,bundle in helper.subjects(self.work,self.signatures):bundle.write_text('{}')
        self.calls=[]

    def transport(self,command,**kwargs):
        self.calls.append(command);return self.crypto(command,**kwargs)

    def check(self,**kwargs):
        return helper.check(self.candidate,self.work,self.signatures,self.revision,'v0.1.0',10,1,**kwargs)

    def test_authenticates_all_release_payloads_and_seven_exact_local_oci_subjects(self):
        with patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=self.transport):self.check()
        self.assertEqual(len(self.calls),len(self.inventory['artifacts'])+1+7)
        self.assertTrue(all(c[:3]==['gh','attestation','verify'] and '--signer-workflow' not in c for c in self.calls))
        self.assertEqual({'sha256:'+Path(c[3]).name for c in self.calls[-7:]},{self.index['digest'],*self.index['platforms'].values()})
        self.assertTrue(all('--bundle' in c and not str(c[3]).startswith('oci://') for c in self.calls))
        self.assertEqual(sum(c[c.index('--predicate-type')+1]==helper.SPDX for c in self.calls[-7:]),4)

    def test_any_crypto_refusal_is_final_and_verifier_never_writes_to_registry(self):
        for failing_call in (1,len(self.inventory['artifacts'])+2,len(self.inventory['artifacts'])+8):
            self.calls=[]
            def fail(command,**kwargs):
                if len(self.calls)+1==failing_call:raise subprocess.CalledProcessError(97,command)
                return self.transport(command,**kwargs)
            with self.subTest(call=failing_call),patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=fail),self.assertRaises(subprocess.CalledProcessError):self.check()
            self.assertTrue(all(c[0]=='gh' for c in self.calls))

    def test_exact_remote_subjects_are_read_only_too(self):
        with patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=self.transport):self.check(remote=True)
        self.assertTrue(all(str(c[3]).startswith('oci://ghcr.io/marcinwadon/hennery@sha256:') for c in self.calls[-7:]))
        self.assertTrue(all(c[0]=='gh' for c in self.calls))

    def test_missing_oci_bundle_refuses_and_final_subset_is_not_silently_skipped(self):
        next(helper.subjects(self.work,self.signatures))[-1].unlink()
        with patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=self.transport),self.assertRaisesRegex(gate.Refused,'verification bundle'):self.check()
        self.assertEqual(len(self.calls),len(self.inventory['artifacts'])+1)

    def test_local_manifest_must_hash_to_the_exact_release_digest(self):
        manifest=self.work/'layout/blobs/sha256'/self.index['digest'][7:];original=manifest.read_bytes()
        for data in (b'{}',original+b' '):
            manifest.write_bytes(data);self.calls=[]
            with self.subTest(data=data[:8]),patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=self.transport),self.assertRaisesRegex(gate.Refused,'local manifest'):self.check()
            self.assertFalse(any(c[3]==str(manifest) for c in self.calls))

    def test_working_metadata_cannot_omit_platform_verification(self):
        path=self.work/'verified.json';changed=json.loads(path.read_bytes());changed['platforms']={};path.write_text(json.dumps(changed))
        with patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=self.transport),self.assertRaisesRegex(gate.Refused,'release descriptor'):self.check()

    def test_branch_source_run_attempt_or_changed_bytes_refuse(self):
        for source,tag,run,attempt in [('b'*40,'v0.1.0',10,1),(self.revision,'v9.9.9',10,1),(self.revision,'v0.1.0',11,1),(self.revision,'v0.1.0',10,2)]:
            with self.subTest(tag=tag,run=run,attempt=attempt),patch.object(helper.verify.subprocess,'run') as crypto,self.assertRaises(gate.Refused):helper.check(self.candidate,self.work,self.signatures,source,tag,run,attempt)
            crypto.assert_not_called()
        def changed(command,**kwargs):
            result=self.transport(command,**kwargs)
            if len(self.calls)==len(self.inventory['artifacts'])+1+7:
                path=self.candidate/'ghcr-index.json';path.write_bytes(path.read_bytes()+b' ')
            return result
        with patch('tag_signature.verify'),patch.object(helper.verify.subprocess,'run',side_effect=changed),self.assertRaises(gate.Refused):self.check()


if __name__=='__main__':unittest.main()
``````

<!-- replay-file: {"path":"packaging/tests/test_image_workflows.py","mode":"100644","sha256":"2a553bb6883116fbe9afe67a786090a2a0eb54ce13664627931ce49cb8f5fed6","encoding":"utf8"} -->
``````python
"""GHCR authority lives in the single tagged workflow and protected publisher."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).parents[1]/'release'))
import workflow_policy
ROOT=Path(__file__).parents[2]
class Workflow(unittest.TestCase):
    def setUp(self):self.workflow=workflow_policy.load_workflow((ROOT/'.github/workflows/release.yml').read_bytes())
    def test_bundles_are_local_before_registry_credentials(self):
        signing=self.workflow['jobs']['attest'];writer=self.workflow['jobs']['publish']
        self.assertEqual(writer['needs'],['attest']);self.assertNotIn('environment',signing)
        actions=[s for s in signing['steps'] if s.get('uses','').startswith('actions/attest')]
        self.assertEqual(len(actions),8)
        self.assertTrue(all(s['with'].get('push-to-registry',False) is False for s in actions))
        self.assertFalse(any('GHCR_PUBLISH_TOKEN' in str(s) for s in signing['steps']))
        ids=[s.get('id') for s in writer['steps']]
        self.assertLess(ids.index('ghcr-verify'),ids.index('ghcr-publish'))
        workflow_policy.check(self.workflow,'release.yml')
    def test_each_ghcr_switch_selection_and_boundary_cannot_be_removed(self):
        for mutation in ('switch','selection','gate','environment','oidc-write'):
            changed=copy.deepcopy(self.workflow);writer=changed['jobs']['publish']
            step=next(s for s in writer['steps'] if s.get('id')=='ghcr-publish')
            if mutation=='switch':step['if']=step['if'].replace("vars.RELEASE_GHCR_ENABLED == 'true'",'true')
            if mutation=='selection':step['if']=step['if'].replace("contains(fromJSON(steps.verified.outputs.channels), 'ghcr')",'true')
            if mutation=='gate':writer['steps']=[s for s in writer['steps'] if s.get('id')!='ghcr-verify']
            if mutation=='environment':writer.pop('environment')
            if mutation=='oidc-write':changed['jobs']['attest']['permissions']['contents']='write'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):workflow_policy.check(changed,'release.yml')
``````

<!-- replay-file: {"path":"packaging/tests/test_release_images.py","mode":"100644","sha256":"2b7348fc3c052c8b4c5258cc1df51846c08109ec8c1d87eea1524ee32372a9eb","encoding":"utf8"} -->
``````python
"""New release contract binds real R4 OCI fixtures; crypto is covered separately."""
from pathlib import Path
import sys
import unittest
import subprocess
from unittest.mock import patch

from test_ghcr_candidate import ReleaseFixture,load_helper,TARGETS
sys.path.insert(0,str(Path(__file__).parents[1]/'release'))
import contract
import gate
import supply
import channel_publish


class ReleaseImages(ReleaseFixture,unittest.TestCase):
    def setUp(self):
        super().setUp();self.helper=load_helper(self)
        self.helper.assemble(self.candidate,self.root/'assembled',self.natives,self.revision,self.version)
        value={'schema':2,'repository':gate.REPOSITORY,'source_sha':self.revision,'tag':'v'+self.version,'tag_object':'b'*40,
               'channels':['ghcr','github'],'targets':sorted(TARGETS.values()),'attesting':{'run_id':42,'run_attempt':1},
               'binaries':supply.binary_inventory(self.candidate,sorted(TARGETS.values()))}
        contract.freeze(self.candidate,value)

    def test_materializes_exact_checksum_bound_oci_without_inventory_signature(self):
        self.assertTrue(hasattr(self.helper,'inspect_release'))
        value=self.helper.inspect_release(self.candidate,self.work,contract.load(self.candidate))
        self.assertEqual(value,gate.strict_json((self.candidate/'ghcr-index.json').read_bytes()))
        self.assertFalse((self.work/'release-inventory.json.asc').exists())

    def test_tampered_oci_or_working_layout_refuses(self):
        self.assertTrue(hasattr(self.helper,'inspect_release'))
        self.helper.inspect_release(self.candidate,self.work,contract.load(self.candidate))
        path=self.work/'layout/oci-layout';path.write_text('{}')
        with self.assertRaises(gate.Refused):self.helper.inspect_release(self.candidate,self.work,contract.load(self.candidate))
        path=self.candidate/'ghcr-oci-layout.tar';path.write_bytes(path.read_bytes()+b'x')
        with self.assertRaises(gate.Refused):contract.load(self.candidate)

    def test_seven_exact_local_oci_predicates_verify_before_registry_credentials(self):
        value=contract.load(self.candidate);signatures=self.root/'signatures';signatures.mkdir()
        self.helper.inspect_release(self.candidate,self.work,value)
        for *_,bundle in channel_publish.image_subjects(self.work,signatures):bundle.write_text('{}')
        cert={'sourceRepositoryURI':'https://github.com/'+gate.REPOSITORY,
              'buildSignerURI':'https://github.com/'+gate.REPOSITORY+'/'+contract.WORKFLOW+'@refs/tags/v0.1.0',
              'sourceRepositoryRef':'refs/tags/v0.1.0','sourceRepositoryDigest':self.revision,'buildSignerDigest':self.revision,
              'runnerEnvironment':'github-hosted','issuer':'https://token.actions.githubusercontent.com',
              'runInvocationURI':'https://github.com/'+gate.REPOSITORY+'/actions/runs/42/attempts/1'}
        # Structural response only; authentic crypto is tested with pinned gh.
        calls=[]
        def crypto(command,**kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(command,0,gate.canonical([{'verificationResult':{'signature':{'certificate':cert}}}]).decode(),'')
        with patch.object(channel_publish.subprocess,'run',side_effect=crypto):
            channel_publish.check_images(self.candidate,signatures,value,self.work)
        self.assertEqual(len(calls),7)
        self.assertTrue(all(c[0]=='gh' and not str(c[3]).startswith('oci://') and '--signer-workflow' not in c for c in calls))
        self.assertEqual(sum(c[c.index('--predicate-type')+1]=='https://spdx.dev/Document' for c in calls),4)
        next(channel_publish.image_subjects(self.work,signatures))[-1].unlink()
        with patch.object(channel_publish.subprocess,'run',side_effect=crypto),self.assertRaises(gate.Refused):
            channel_publish.check_images(self.candidate,signatures,value,self.work)

    def test_layer_change_between_verification_and_write_refuses(self):
        value=contract.load(self.candidate)
        self.helper.inspect_release(self.candidate,self.work,value)
        signatures=self.root/'signatures';signatures.mkdir()
        for *_,bundle in channel_publish.image_subjects(self.work,signatures):bundle.write_text('{}')
        layer=next(p for p in (self.work/'layout/blobs/sha256').iterdir() if p.read_bytes().startswith(b'\x1f\x8b'))
        layer.write_bytes(b'changed layer')
        with patch.object(channel_publish.subprocess,'run',side_effect=AssertionError('crypto or registry reached')),self.assertRaises((gate.Refused,ValueError)):
            channel_publish.check_images(self.candidate,signatures,value,self.work)

    def test_registry_readback_uses_fetched_bundles_and_refuses_failed_crypto(self):
        value=contract.load(self.candidate);signatures=self.root/'signatures';signatures.mkdir()
        fetched=self.root/'fetched';fetched.mkdir()
        self.helper.inspect_release(self.candidate,self.work,value)
        subjects=[]
        for label,kind,digest,predicate,bundle in channel_publish.image_subjects(self.work,signatures):
            bundle.write_text('original local bundle')
            remote=fetched/bundle.name;remote.write_text('retrieved registry bundle')
            subjects.append((label,kind,digest,predicate,remote))
        commands=[]
        def crypto(command,**kwargs):
            commands.append(command)
            self.assertEqual(Path(command[command.index('--bundle')+1]).parent,fetched)
            self.assertFalse(str(command[3]).startswith('oci://'))
            raise subprocess.CalledProcessError(1,command,stderr='fetched signature refused')
        with patch.object(channel_publish.subprocess,'run',side_effect=crypto),self.assertRaises(subprocess.CalledProcessError):
            channel_publish.check_images(self.candidate,signatures,value,self.work,subjects=subjects)
        self.assertEqual(len(commands),1)

    def test_registry_readback_cannot_substitute_the_expected_subject_set(self):
        value=contract.load(self.candidate);signatures=self.root/'signatures';signatures.mkdir()
        self.helper.inspect_release(self.candidate,self.work,value)
        subjects=list(channel_publish.image_subjects(self.work,signatures))
        for *_,bundle in subjects:bundle.write_text('{}')
        for bad in (subjects[:-1],subjects[::-1],[('other',*subjects[0][1:]),*subjects[1:]]):
            with self.subTest(bad=bad),patch.object(channel_publish.subprocess,'run',side_effect=AssertionError('crypto reached')),self.assertRaises(gate.Refused):
                channel_publish.check_images(self.candidate,signatures,value,self.work,subjects=bad)
``````

Generated with Claude AI — please review before distribution.
