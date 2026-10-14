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

Each protected job fetches exact held versions, checks the actual bytes and
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
