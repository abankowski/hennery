# Release simplification — implementation plan outline

- **Date:** 2026-10-16; filename assigned by the parent.
- **Design:** [Simplified release model (operator decision 2026-10-16)](../specs/2026-10-15-distribution-release-design.md#simplified-release-model-operator-decision-2026-10-16).
- **Phase A base:** `87cc219c`; branch `plan/release-simplify`.
- **Review amendment base:** `10abd28f` (Homebrew #155 merged, parent confirmed).
- **Execution base:** not yet assigned; Phase B is parent-authorized once the
  parent confirms R4 (#143) has merged. Until then, documentation fixes only.
- **Goal:** one signed-tag build/attestation run, summary approval, then draft,
  immutable release and selected channels in one protected job; no AWS/upload App.

## Execution status

**Phase A only: design/plan outline, not implemented.** First review verdict:
**CHANGES**. Final status: **scoped re-review APPROVE at 0fddcc02 (2026-10-16)**.
Exact-run binding, bootstrap, task split and absence of new service/cost were
accepted. The parent accepted the early-publication/denial-of-service residual
risk on the maintainer's behalf; the operator will be informed. The parent
authorizes Phase B once it confirms R4 (#143) has merged. No implementation blocks,
RED/GREEN evidence, replay, live settings inspection or publication are claimed.
This is intentionally an outline in plan 3c's structure. After authorization,
build each task first, embed exact code/anchors from the post-merge base, then
perform one fresh replay before the first implementation review. Do not treat
the commands or anticipated results below as evidence that they have run.

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
and paid infrastructure. First alpha remains GitHub-only. Phase B waits for
the parent even if other branches happen to become visible locally.

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

Paths are current anchors, not future replay blocks. Homebrew is merged on the
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
   created by this builder. Before any channel switch is enabled, the maintainer
   verifies the first genuine tagged Hennery attestation and preserves it with
   its payload as the authentic Hennery positive fixture.
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
Load runs (4×3) apply only to timing/concurrency guards (registry retry/deadline
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

Generated with Claude AI — please review before distribution.
