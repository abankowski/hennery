# CI and release right-sizing — proposal

**Proposal, assessed 2026-10-17 against `79a276c9` (alpha.3).** Recommend six ordinary
CI jobs, shared packaging, and one approved publisher. Keep signed tags, the
YubiKey (touch optional), GitHub attestations and four channels. No AWS or paid
services; this document authorizes no implementation or publication.
Approval would amend the [existing release contract](2026-10-15-distribution-release-design.md#simplified-release-model-operator-decision-2026-10-16).

**1. What runs today**

The [workflow directory](../../.github/workflows/) contains **11 workflows,
51 job definitions and 80 matrix-expanded slots across all events**: 60 PR slots
and 20 tag-release slots. They do not all run together. With the checked-in
`channels.json = ["github"]`, three optional jobs skip in both rehearsal and
scheduling. Typical counts are 25 for documentation, 28 for application source,
45 for `Cargo.lock`, 53 for packaging, and 54 when all path filters match.
The 60–90-minute PR duration and five-runner macOS limit are operator observations,
not independently measured here.

**Correction:** `ci` and `build/archive` already use Rust caches. Nix store caching
is absent; crates, Homebrew proof and rehearsal restore no build cache. Separate
keys/toolchains/targets and repeated clean builds leave substantial work. Crane
shares dependencies inside Nix, separately from ordinary Cargo builds.

Inventory below covers every job. **U** = Ubuntu x64 (`latest` or `24.04`),
**A** = `ubuntu-24.04-arm`, **M** = macOS arm64 (`latest` or `15`). Minutes are
engineering estimates **per matrix instance**, excluding queueing; they are
neither measurements nor YAML timeouts. P = PR, B = main push, D = dispatch.

| Workflow / job (instances; triggers) | Runner; rough minutes | Unique proof; overlapping work |
|---|---|---|
| `ci/web` (2; P/B) | U/M; 15–35 | Types, units, embedded-UI e2e, memory UI/browser; release qualification repeats these |
| `ci/readme` (2; P/B) | U/M; 10–25 | Actual clone/Nix-shell build recipe; repeats application build |
| `ci/readme-without-nix` (2; P/B) | U/M; 10–25 | Documented standalone toolchain build; overlaps archives/crates, but distinct setup |
| `ci/rust` (2; P/B) | U/M; 15–35 | Both clippy modes, fmt, workspace tests, generators; Linux network isolation; overlaps Nix and qualification |
| `nix/flake` (3; P/B/D) | U/A/M; 9–25 | Package, source-fileset, UI and README Nix recipe; repeats fmt/clippy/audit |
| `crates/packages` (2; P/B/call) | U/M; 45–110 | Seven actual tarballs, dry runs, offline builds, locked/unlocked installs, UI, MSRV, binstall refusals; repeats release crates |
| `build/image-contract` (1; P/B/D) | U; 2–8 | Python image guards, actionlint, shellcheck; qualification repeats tests/lint |
| `build/archive` (3; P/B/D) | U/A/M; 15–35 | Native musl/macOS archives, linkage/UI, Alpine; Linux OCI build/loopback smoke; overlaps release archives and Homebrew proof |
| `build/image-index` (1; P/B/D) | U; 3–8 | Merge both OCI architectures and registry round-trip; overlaps release assembly/GHCR |
| `build/installers` (1; P/B/D) | U; 2–8 | Generated shell installer, refusals, formula hashes; overlaps release assembly/installer |
| `build/installer-macos` (1; P/B/D) | M; 2–5 | Native checksum-tool/installer behavior; overlaps release installer |
| `pins/pins` (1; path-filtered P/B) | U; 5–20 | Node signature, adapter hashes/extraction/npm signatures; genuinely separate runtime supply chain |
| `release-homebrew/proof` (3; broad path-filtered P/D) | U/A/M; 20–45 | Rebuild release-like archive, install/upgrade/test/uninstall local tap; duplicates archive and native acceptance |
| `release-tests/refusal-tests` (3; P/B/D) | U/A/M; 3–12 | Python gates, signed bootstrap fixtures, actual dist installer with tiny binaries, actionlint; most logic platform-independent |
| `security-audit/rust`, `web` (2; P/B/daily) | U; 1–5 each | Fresh RustSec/npm advisories; repeats archive audits; unlike Nix's pinned DB, detects new advisories |
| `release-scheduling` (12 slots; path-filtered P/B/D) | U; <1 each plus startup | `tag-signature`, `web-ui`, `archive`, `crates`, `assemble`, `ghcr`, `installer`, `homebrew-native`, `homebrew`, `qualification`, `attest`, `assert-scheduling`: synthetic graph/skip semantics, no product acceptance; 9 run by default |

`release.yml` runs on `v*` tags; `release-rehearsal.yml` on packaging/Cargo/release
workflow PR changes and **every** main push. Shared jobs follow; rehearsal uses
unsigned context and local verification, without publication:

| Job in release / rehearsal (instances each) | Runner; minutes | Proof and overlap |
|---|---|---|
| `tag-signature` (1) | U; 1–3 | Signed tag/source/version/channels; rehearsal only synthesizes context |
| `web-ui` (1) | U; 2–5 | Locked UI artifact; qualification rebuilds it on three platforms |
| `archive` (3) | U/A/M; 20–45 | Final notices/source/SBOM/advisories, native archives and Linux images; overlaps `build/archive` |
| `crates` (1, selected only) | U; 45–110 | Same seven-package acceptance as `crates/packages` |
| `assemble` (1) | U; 3–10 | Actual transport layout, global installers/formula/source, OCI index, checksum closure; overlaps build installers/index |
| `ghcr` (1, selected only) | U; 3–10 | Frozen image/index acceptance through loopback; repeats earlier registry checks |
| `installer` (3) | U/A/M; 2–5 | Final payload native installation/refusals; overlaps build installers |
| `homebrew-native` (3) | U/A/M; 3–10 | Install/upgrade/uninstall frozen formula; successful no-op when unselected |
| `homebrew` (1, selected only) | U; <1 | Aggregates native success; no additional test |
| `qualification` (3) | U/A/M; 35–90 | Full Rust/web/browser/generator/Python/Nix rerun; largest duplication |
| `attest` / `verify` (1) | U; 3–15 / 1–5 | Production provenance versus unsigned checksum/supply checks; rehearsal cannot prove remote signing or publication |
| `publish` / absent (1 / 0) | U; 5–30 | One approval, repeated verification, GitHub/tap/crates/GHCR writes and readbacks |

At this revision that is **17 running tag jobs / 16 rehearsal jobs** with GitHub
only, or **20 / 19** with all channels selected on a stable version. Application
PRs already demand ten macOS jobs; release-related changes can demand fourteen.

**2. Risks worth paying for**

| Risk | Retain | Reduce / accepted limit |
|---|---|---|
| Artifact substitution | Signed tag bound to source/version; pinned actions/toolchains; digest-bound final artifacts; verified provenance; immutable published assets | More parsers and repeated API checks cannot establish honest compilation. Hosted runners, dependencies, GitHub/Sigstore and the maintainer remain trusted |
| Credential theft | Read-only PR jobs, no fork code with secrets, step-scoped environment secrets, crates OIDC, narrowly scoped tap/GHCR credentials | Avoid rebuilding or running candidate binaries in the privileged publisher. An environment does not constrain every workflow a repository writer could introduce |
| Accidental publication | Tag-only release entry, one `release` approval, explicit stable/prerelease behavior, per-tag serialization | Drop the parallel switch/registry/job-name authorization system. Approval is deliberate consent by the sole maintainer, not two-person control |
| Broken releases / partial delivery | Real packaged installation, actual artifact transfer, native smoke, public readback, clear recovery instructions | Reduce repeated source tests. Non-atomic delivery across four services remains; report partial success and never overwrite differing versioned bytes |

The tag failures expose missing integration coverage. Preserve alpha.3's staging
directory and Homebrew advisory-input regressions. The systemic question is:
**does the test execute the failing boundary with the real producer's output?**
Mock graphs cannot establish that. The existing [workflow policy](../../packaging/release/workflow_policy.py)
itself describes its protection as defence in depth.

**3. Target design**

Ordinary PRs and main use one `ci` workflow with **six jobs**:

| Job | Scope |
|---|---|
| `checks` (U) | Changed-path classification, actionlint/shellcheck, cheap packaging regressions; dependency audits on lockfile changes |
| `rust` (U) | fmt, both clippy modes, full isolated workspace tests, both generators; one target directory |
| `macos` (M) | Build plus native process/service/path/CLI smoke; full Rust suite when those platform-sensitive areas change |
| `web` (U) | Types, units, build, embedded-binary e2e and memory UI/browser; share compatible Rust dependency cache |
| `nix` (U) | Package build, source-fileset and embedded-UI checks; stop repeating fmt/clippy/audit |
| `result` (U) | Always runs; requires every selected job to succeed, accepts only deliberately unselected skips |

Trigger CI unconditionally; use job conditions and `result` to avoid pending
required checks. Documentation runs two jobs; README changes also exercise recipes.
Add `pins` on its existing paths, without agent-payload caching. Run daily audits;
weekly macOS/ARM full suites, Nix platform builds and standalone README recipes.
Platform/recipe changes also select affected checks, adding jobs or runtime below.

Use SHA-pinned [Rust caching](https://github.com/Swatinem/rust-cache) after selecting
the actual toolchain, keyed by OS/target/toolchain/profile/lockfile; save from
trusted main runs. Cache pnpm downloads, never secrets or installed agent payloads.
Add [Magic Nix Cache](https://github.com/DeterminateSystems/magic-nix-cache-action)
in GitHub-cache-only mode (`use-gha-cache: true`, `use-flakehub: false`); inspect
permissions at the pinned revision. No new account. Release restores **no project
build caches**; Nix upstream toolchain substitutes remain allowed.

Recommend a small explicit release wrapper using **cargo-dist for artifacts,
official attestation actions and `gh release` for hosting**. Cargo-dist already
[supports generated workflows, attestations and custom jobs](https://axodotdev.github.io/cargo-dist/book/reference/config.html);
its hosting/package-publishing phases need adaptation for one approval.

The all-channel graph has **11 runner jobs**: prepare (1), native archive/image
builds (3), crates (1), assemble (1), native installer/Homebrew acceptance (3),
attest (1), publish (1). Build the UI once in prepare; reuse the same musl binaries
in archives and images. Combine installer and Homebrew checks on each native runner.
Prepare authenticates tag/source/version, audits dependencies once, and requires
successful core CI for the **exact tagged commit on main**; PR merge-SHA results
are insufficient. Missing CI must complete first. Native packaging qualification
then runs in this graph; drop the three full-source `qualification` reruns.

Use one read-only reusable packaging workflow for the first nine jobs, called by
release and release-path/release-PR validation. PR mode has no secrets, attestation
or publication. This replaces generated rehearsal and `build`.
Packaging inputs include `packaging/**`, workflows, manifests/locks, build scripts,
Nix/toolchain files and installer/image inputs; ordinary Rust/UI edits use core CI.
Every release PR runs all channels' local acceptance regardless of publication
selection. Source changes after qualification invalidate that evidence.

Only the tag workflow attests final files and OCI digests. It records a digest
summary and immutable artifact IDs. One `release` environment job, after approval,
downloads those artifacts, verifies provenance/hashes, and publishes GitHub then
the other channels. No rebuilding or repackaging there. Retain the small frozen
crate uploader until a standard tool can publish exactly the qualified tarballs.
All credentials remain scoped to their write steps. Consumers verify repository,
tag/workflow identity and source digest using the [supported CLI verifier](https://cli.github.com/manual/gh_attestation_verify).

Retry only publication, with renewed approval and the original artifact IDs;
compare existing remote digests, upload missing bytes, stop on conflict/ambiguity.
If originals are unavailable, use a new signed version. Publish moving aliases
only after all selected channels succeed. Preserve immutable-release behavior;
do not assume `gh release create` alone enables it.

| Scenario | Current running jobs | Proposed | Estimated wall time after migration |
|---|---:|---:|---|
| Documentation | 25 | 2 | 1–3 min |
| Ordinary source PR | 28 | 6 | 15–25 min warm; 30–45 cold |
| Lockfile / packaging PR | 45 / 53 | 16 / 15 (includes nine packaging jobs; lockfile adds pins) | 35–60 min |
| Stable tag, all channels | 20 | 11 | 35–60 min, excluding approval and waiting for core CI |

These are estimates. Source PRs fall from ten macOS jobs to one; packaging adds
two. Consolidate into four workflows: `ci`, reusable packaging, `release`, scheduled
maintenance. Measure cold/warm duration and queue time over ten PRs.

**4. Explicit removals and retained guarantees**

| Component | Proposal and reason |
|---|---|
| Channel registry and name binding | Remove owning-job/API-display-name registry and dynamic selection. Stable publishes all four; alpha GitHub only. Plain YAML dependencies and steps express this without reserved names or successful no-op jobs |
| Rehearsal generator | Delete after shared packaging is proven. Reuse executable workflow/scripts instead of maintaining a Python workflow compiler; keep real transport/assembly regression coverage |
| DAG policy and scheduling workflow | Delete after removing optional-job ancestry. Required build/acceptance jobs always run; channel selection affects publishing steps. Keep native `needs`, failure propagation and the final CI result |
| `workflow_policy.py` | Replace exact command/order/name policing with actionlint and a small static test of tag trigger, permissions, one protected publisher and pinned actions. Stop reimplementing Actions semantics or prohibiting reusable workflows |
| Exact-run attestation binding | Keep same-run artifact IDs and provenance bound to tag/source/workflow/digest. Remove certificate JSON `runInvocationURI` parsing, API job-name reconstruction and magic retry-comment/attempt budgets. Accept another valid attestation of identical bytes from that signed source; no claim of unique producing attempt |
| Seven-crate acceptance | Keep all seven tarball inventories, version/features/UI/notices and dry-run/package checks on Linux. Reuse compilation within that candidate; remove the extra clean offline build per crate. Keep one real locked install with UI smoke; unlocked install/MSRV before release and on dependency/compiler changes. Replace the macOS seven-crate repetition with one packaged CLI install in native release acceptance |
| Per-platform Homebrew proof | Keep native install/upgrade/uninstall on all three supported targets for packaging changes/releases; consume already-built archives. Delete the separate three full builds |
| Deterministic GHCR referrers | Drop custom canonical seven-referrer layout/reconciliation. Use standard digest attestations and SBOM attachment; verify fetched subject identity. Duplicate valid referrers on retry are acceptable; differing image digests are not. Standard registry transport must preserve the accepted OCI digest |
| Other checks and consumer tooling | Keep archive/linkage/UI checks, checksum-required installer, source/notices/SBOM, daily advisories, pin integrity and consumer verification. Simplify shared verifier/bootstrap together; leave native binstall disabled until its verification contract is addressed |

This reduces pre-merge platform coverage and bespoke retry guarantees. Change
consumer verification/docs alongside metadata policy, or installs will break.

**5. Migration in small PRs**

1. **Cache and measure:** add CI-only Nix caching, align compatible Rust caches,
   cancel superseded PR runs consistently. Keep existing gates; measure savings.
2. **Change cadence:** six-job core CI, path-filter heavy packaging, consolidate
   daily audit/weekly coverage. Parent updates required checks only after the new
   always-running result is demonstrated; no silent required-check removal.
3. **Build once:** introduce shared read-only packaging; reuse archives for brew,
   installers and images; reduce crates rebuilds. Compare artifact inventories and
   exercise known staging/advisory failures, then remove duplicate workflows.
4. **Simplify trust plumbing:** approve the trade-offs above; replace registry,
   DAG/rehearsal/run-policy layers and update consumers/runbook. Retain negative
   tests for unsigned tags, wrong source/digest, missing UI and failed acceptance.
5. **Standard publisher:** official attestations/hosting/OCI transport, one protected
   publisher, frozen crates, explicit partial-release recovery. Retire old code
   only after an operator-authorized prerelease proves real OIDC, approval,
   artifacts and remote readback. Local fixtures cannot certify those services.

**Ship alpha.3 on the current pipeline first**, after its real hosted rehearsal
passes and the parent approves; retain the genuine attestation fixture. Keep any
repair narrow. **Simplify before v0.1.0**, then qualify all four channels at the
final stable SHA. Current alpha code permits only GitHub; alpha success cannot
prove tap/crates/GHCR. Do not delay simplification to force a first stable release
through all the current machinery. Never move a signed tag to pick up fixes.

**6. Operator decisions**

| Decision | Recommendation |
|---|---|
| Reduced routine platform coverage? | Approve Linux full CI/macOS smoke, weekly full platform coverage, targeted escalation and native release-package acceptance |
| Unique run/attempt versus signed-source provenance? | Accept the simpler digest/source policy; retain frozen artifact identity for retries |
| All channels for every alpha? | Keep alpha.3 GitHub-only; stable uses all four. This needs confirmation against the earlier all-channel-first-release direction |
| Release engine and rollout order? | Approve the explicit standard-tool wrapper, alpha.3 first, simplified stable next; no additional paid service |
| Sole-maintainer approval? | Allow self-approval in the [environment controls](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments); a second human is not available. Update the old mandatory-touch runbook to reflect the operator's decision |

Generated with Claude AI — please review before distribution.
