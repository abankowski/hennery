# Release process

R1 implements a disabled release foundation. Merging it authorizes neither a
channel nor publication. First release is `0.1.0-alpha.1`, GitHub only; stable
`0.1.0` and further channels require their own maintainer go-ahead. R3 owns crate
packaging/version metadata and R4 image packaging. No publication or external
settings change was performed while building this foundation.

## Boundary and maintainer-only setup

**Parent ruling on the maintainer's behalf, 2026-10-15:** enforce the boundary on
the platform, not in branch-editable workflow code. A repository writer, including
an agent pushing with the maintainer's key, can run arbitrary code and request
ordinary `GITHUB_TOKEN` write permissions or OIDC. Static lint and job conditions
cannot stop issuance. Such a branch must neither obtain dedicated publishing
credentials nor produce a signature accepted by consumers. All signing identities
must be the exact release workflow at a protected release tag; branch identities
are rejected. The **maintainer decision, 2026-10-15**, adds the root of trust:
the exact immutable inventory must carry a detached OpenPGP signature made with
the maintainer's hardware-backed signing subkey. Someone without access to that
physical signing authority cannot authorize different release bytes, including
an agent with the maintainer's SSH push key that creates an unsigned tag and
changes its workflow to mint an exact-tag attestation. Sigstore alone is insufficient.
Consumers use a reviewed, independently trusted verifier and pinned public key.
Repository disruption/denial of service is outside that guarantee. Signed-tag
checks remain defense in depth; the inventory signature is release authority.

Before enabling any switch, the maintainer must configure and audit:

0. **Physical approval:** configure the signing slot on the YubiKey locally:
   `ykman openpgp keys set-touch sig on`. This requests touch for each signature.
   `cached-fixed` is an alternative with a 15-second reuse window after touch
   and cannot be disabled without deleting the private key; another process
   could sign within that window. Prefer `on` for release approval and remove
   the key after use. Confirm that no accessible software copy of the signing
   subkey defeats the hardware boundary. The audit records an explicit personal
   confirmation, not a remotely verified hardware property:
   `"maintainer_touch":{"confirmed":true,"fingerprint":"F26C7F594DFE84D131703AFC23E5A318AE8D2861","policy":"on"}`.
   See [Yubico's touch policies](https://docs.yubico.com/software/yubikey/tools/ykman/OpenPGP_Commands.html).

1. **Environment `release`:** required reviewer is exactly the maintainer's User
   ID; administrator bypass explicitly disabled. Deployments allow only `v*`
   tags, with no branch policy. Use `.github/release-environment.example.json`
   and `.github/release-branch-policy.json` (the latter describes a tag policy).
   Sole-maintainer self-review is allowed. Every long-lived publishing credential
   is an environment secret here, never a repository secret. The initial audit
   requires repository secrets empty, preventing opaque publishing credentials
   under unexpected names. Storage-only credentials use their restricted staging
   or audit environments; they cannot publish.
2. **Two active tag rulesets:** `.github/release-tag-creation.json` restricts
   creation of `v*`, with only the repository owner's **User** ID as an always
   bypass actor. Replace placeholder 0 with the actual owner ID; this personal
   repository has no Maintain role. `.github/release-tag-ruleset.json` separately
   restricts update/deletion with **no** bypass actors. The owner's creation
   exception cannot bypass the second ruleset. `GITHUB_TOKEN` is not a creation
   bypass actor. Never disable a rule, move a tag or reuse a version.
3. **Signed annotated tags:** use the pinned signing subkey fingerprint
   `F26C7F594DFE84D131703AFC23E5A318AE8D2861`, found with `git log --show-signature`
   in commit `3b7b5f2d2af8821f4617afb08ba1dc766c5b9f14`. The checked-in public key
   verifies that historical commit; only its personal UID was exported. It is
   distinct from GitHub's shared web-signing key. `tag_signature.py` freshly
   fetches the tag, verifies its actual signature with an isolated keyring, and
   requires its annotated object to directly point at the exact candidate commit.
   Candidate storage credentials wait for this check, and every publication gate
   repeats it. GitHub's signed-commit rule does not verify tag signatures.
4. **Immutable GitHub releases:** enable the repository setting before the first
   release. The publisher creates a draft, adds/verifies every asset and then
   publishes it, requiring the returned immutable state. After publication,
   asset changes must be refused by GitHub. Never try to repair an immutable
   release by replacing assets; use a new version. Tag rules also block ordinary
   workflows from manufacturing new `v*` tags.
5. **GitHub upload App:** narrowly scoped contents write and Actions read, installed
   only on this repository. `RELEASE_PUBLISH_APP_KEY` exists only in `release`;
   `RELEASE_PUBLISH_APP_ID` is its environment variable. No administration access
   is granted to publishers. Mint its short-lived token after preflight.
6. **crates.io trusted publishing:** every production crate must require owner/repo
   `marcinwadon/hennery`, exact workflow filename `release-publish.yml` and
   environment **`release`**. A workflow match without the environment is
   insufficient. A branch job cannot enter `release`; its environment-less OIDC
   token must be refused by crates.io. Bootstrap claiming and token handling remain
   R3's separate reviewed process, confined to the same environment. Do not enable
   this channel until every crate's actual settings and source delivery qualify.
7. **GHCR:** configure this repository's package **Manage Actions access** to
   **READ**, disabling inherited write/admin access. An arbitrary branch job's
   `packages: write` must still be unable to push. R4 uses a dedicated publishing
   credential under `GHCR_PUBLISH_TOKEN`, only in `release`; it must not use
   `github.token` to authenticate writes or signing pushes. Qualify the permitted
   dedicated credential with the maintainer before enabling GHCR. Current GitHub
   documentation describes PAT (classic) authentication, not App/fine-grained
   registry authentication; the parent's credential-kind ruling is required
   rather than assuming unsupported authentication works.
8. **Held storage:** private versioned S3 candidate/audit buckets, Object Lock
   COMPLIANCE for at least a year plus legal hold ON; no CI delete, overwrite or
   hold removal. `release-staging` allows only approved `v*` tags and holds only
   storage credentials. Configure candidate bucket/region, separate conditional
   stage and exact-version read principals, and an audit principal restricted to
   held append-only `audit/<run>/<attempt>/` writes. Enable storage only after
   IAM/retention review. Keep holds until all channels and public acceptance
   complete; source/rollback retention is a longer obligation.
9. **Negative platform acceptance:** after setup, explicitly authorize a disposable
   branch Actions job with `packages: write`, its ordinary `GITHUB_TOKEN`, **no
   environment** and no dedicated credential. Run `post_setup.py` against a known
   existing package digest. It proves read access then attempts the registry push
   authorization/write boundary and requires 403. Unexpected success or ambiguous
   errors stop qualification; a misconfigured package may receive a canary index,
   so inspect it and repair access. Record the actual result for the local audit.
   The offline tests use transport doubles; no live negative push ran here.
   Separately verify a branch OIDC token cannot satisfy crates.io's required
   environment and branch attestations fail the exact-tag consumer policy.

Official references: [environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[ruleset bypass visibility](https://docs.github.com/en/rest/repos/rules),
[immutable release lifecycle](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases),
[GHCR authentication and access](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[crates.io trusted publisher identity](https://github.com/rust-lang/rfcs/blob/master/text/3691-trusted-publishing-cratesio.md).

## Candidate and qualification

Prepare a reviewed release PR with one workspace version, exact internal crate
edges, matching web metadata and a tracked `CHANGELOG.md`. Record tested platform
floors, runtime pins, security/migration/config changes, backups/restarts and early
tester limits. Build from the approved signed tag and exact commit. Candidate
creation is not publication approval.

`release-candidate.yml` verifies the pinned tag signature before storage
credentials, builds fresh with fixed native runners and pinned Rust/cargo-dist/
actions/locked web tools, and restores no Actions caches. Build the UI once.
Linux x86_64/arm64 musl and macOS arm64 archives carry notices before final hashes.
Each target records runner/SDK/toolchain identity, SPDX 2.3 Rust/native/frontend
components, corresponding third-party source, and current Rust/frontend audit
reports. Missing licence text/findings stop freeze. Supplemental licences retain
exact upstream bytes; fonts/assets/redistribution/AGPL corresponding-source and
static OpenSSL support still need maintainer clearance. Runtime Node/agent
payloads are inventoried separately and not redistributed.

The common manifest resolver accepts either the original adapter path or R3's
host-crate path, hashes the original bytes, and rejects conflicting dual copies.
Source archives preserve checkout/lockfiles/licences/build instructions. Mixed
candidates contain executable and source tarballs; installer acceptance counts
only executable archives and still requires each intended archive to be offered.
It verifies hashes, provenance invocation, refusal paths and atomic installation
on every native target. Fixture signatures are mocked before candidate signing;
that is not public signature qualification.

Freeze one complete channel/target set and every final payload. The inventory
includes exact executable hashes, source/tag and candidate run/attempt; checksum
and signature sidecars avoid cycles. No rebuild or byte addition under an old
inventory. Held receipts identify exact object versions. Expiring Actions copies
are convenience only. Require completed successful exact-source push/manual runs
of `ci.yml`, `build.yml`, `nix.yml` and `release-tests.yml`; missing, skipped,
pending, failed, cancelled, fork/PR-merge or wrong-SHA evidence refuses.

Before the first release, qualify real logged-in agent/UI/doctor/session/MCP,
service install/restart/upgrade/uninstall and platform floors using disposable
homes. Containers/shell fixtures do not qualify native services, Intel macOS,
older OS versions, managed Alpine hosts or notarization. GNU/native package
repositories, Apple notarization, public caches and R6 modules retain their gates.

## Settings audit and publication approval

Inspect the final digest set, source, channels and targets through trusted local
tools. Enter the reviewed `nix develop .#release` shell. At approval time, sign
the **exact held canonical inventory bytes** locally:

```sh
packaging/hennery-release sign-approval --inventory candidate/release-inventory.json \
  --signature release-inventory.json.asc --confirm-hardware-touch
```

This invokes `gpg --detach-sign` with the full pinned signing fingerprint, using
the local hardware/PIN/touch interaction. It refuses CI and existing output;
never run signing in Actions or give CI a private key. The CLI cannot prove touch
configuration; the explicit confirmation is the maintainer's assertion. The
signature is a public sidecar, outside the frozen candidate, avoiding a digest
cycle. Supply its complete armored bytes as dispatch input `maintainer_signature`.
Gates require it before issuing publication credentials and at every boundary;
publishers verify and upload it as `release-inventory.json.asc`, and retain it
with approval evidence. A new inventory requires a new physical approval.

Run the reviewed `settings_audit.py` locally with the maintainer's own `gh`
authentication, after the candidate run completes. It independently verifies the pinned tag signature before using owner settings
authentication, then checks the actual owner, environment, both rulesets including bypass actors, secret locations and immutable
release setting. Publishers cannot read private bypass lists and never receive an
administration token. Where no settings API exists, the maintainer personally
checks GHCR package Actions access/negative-push result and crates.io publisher
records, supplies the observations JSON and explicitly confirms the displayed
result. It is an authenticated maintainer inspection ratified by the review,
not an artifact-supplied authorization or automatic UI verification.

Retain the canonical report and its SHA-256. Its candidate/source/tag/channels/
targets/global inventory/run attempt must match, it must postdate candidate
completion and be at most 24 hours old. Dispatch `release-publish.yml` at that
**same signed tag**, supplying the complete event inputs documented in the
[gate contract](../packaging/release/README.md), including the report and digest.
The run summary prints the approval tuple and publishing run/attempt. Approve
only with the exact `approve-release-v1:<tuple-hash>` review comment. The tuple
includes the audit digest; changing the audit or retry attempt needs new approval.
Any rejection requires a fresh dispatch. A stale audit requires a new local audit
and newly approved dispatch, even for unchanged held bytes.

Protected read-only `authorize` fetches held bytes and validates before writer
jobs, whose local conditions match the current digest/attempt. Every writer still
uses `release`, fetches exact held versions, runs in-job preflight, obtains only
its dedicated authority, then revalidates at each sign/upload/final-publication
boundary. Runtime evidence is limited to ordinary readable runs/jobs/reviews/tag
objects plus cryptographic signed-tag verification. Hold every gate receipt before
writing; storage failure stops. Channel reconciliation must verify actual remote
bytes/digests and upload only authoritatively missing artifacts. Only after all
enabled channels and public-path acceptance succeed may moving aliases or
announcements advance.

## Consumer verification and recovery

The authenticated bootstrap is the executed
[README shell block](../README.md#verify-a-release-installer-before-running-it),
named `release-bootstrap` under the README guardrails. It uses trusted installed
GnuPG, curl, jq and a SHA-256 tool, not a verifier downloaded from a release.
First compare full signing fingerprint
`F26C7F594DFE84D131703AFC23E5A318AE8D2861` through the README on main,
`https://github.com/marcinwadon.gpg`, and
`https://keys.openpgp.org/vks/v1/by-fingerprint/F26C7F594DFE84D131703AFC23E5A318AE8D2861`.
These are independent of release assets. The block fetches each, compares the
full public signing-subkey fingerprint with installed GnuPG/awk and imports keys
only into a fresh isolated keyring. Stop if a channel is absent or disagrees;
the maintainer must publish/confirm these keys before enabling releases. The
[keyserver API](https://keys.openpgp.org/about/api/) supports lookup by the full
primary or subkey fingerprint.

Next download `release-inventory.json`, `release-inventory.json.asc` and the
installer as data. Require successful `gpg --verify` and a pinned `VALIDSIG`,
extract the unique installer's SHA-256 from the authenticated inventory and check
it with `sha256sum -c` or `shasum -a 256 -c`. Only then execute the installer.
It continues to authenticate archives itself. A malicious release cannot replace
this bootstrap's verifier/key; use the inline commands reviewed on main and
independently confirm the pin before execution. Release-contained verification
code is usable only after its own bytes have been authenticated this way.

Every consumer first requires the valid detached maintainer signature over the
exact inventory, pinned to signing subkey
`F26C7F594DFE84D131703AFC23E5A318AE8D2861` (primary key
`1CE2B7354FC6ED5D9DE12DF664C16DED80CCEABA`). Missing, malformed, wrong-key and
different-inventory signatures refuse even when Sigstore passes. The helper
commands below are not the initial bootstrap: first authenticate the inventory
with installed GnuPG as in the README. Fetch its exact `source_sha` into a clean
checkout without executing repository code; compare `git rev-parse HEAD` with
that authenticated SHA and require `git status --porcelain` to be empty before
running a helper. A tag name or a verifier obtained from a release is insufficient.
Then use that authenticated source checkout for additional provenance checking:

```sh
packaging/hennery-release verify-approval --inventory candidate/release-inventory.json \
  --signature release-inventory.json.asc
python3 packaging/release/verify.py --candidate candidate --tag v0.1.0 \
  --source-sha "$SOURCE_SHA" --bundle release.sigstore.jsonl \
  --approval-signature release-inventory.json.asc
```

Both verifications are mandatory. Every accepted Sigstore signature must have certificate identity
`https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/<exact-release-tag>`,
GitHub OIDC issuer and matching source ref. `verify.py` checks the inventory's
hardware approval first, then attestation, source/tag, every payload/checksum/binary digest and each
payload attestation. It also supports immutable OCI digests and relevant SLSA/
SPDX predicates; R4 applies the same policy to platforms and final index. A
branch's valid cryptographic signature is rejected. Do not trust an unsigned
checksum or execute a downloaded installer before authenticating it through a
trusted copy of this verifier. The verifier itself must come from reviewed,
trusted source, not arbitrary branch code or an unverified artifact.

The hardened installer requires GnuPG, jq and the real GitHub CLI. It verifies the
inventory against its embedded pinned public key, binds the archive's SHA-256
and release tag to that signed inventory, and requires the exact Sigstore tag
identity before extraction/execution. A caller may supply durable local sidecars;
they are still fully
verified. No missing verifier/hash/signature fallback is accepted. It stages in a
private sibling directory and atomically creates the destination without
replacing files, links, directories or races. It uses no sudo and starts no
services/runtime downloads. Upgrade by stopping services and explicitly removing
the previous chosen user binary or choosing an empty directory, then run doctor.

Native cargo-binstall documents minisign-only support. It cannot enforce this
Sigstore workflow identity through invented metadata. Freeze and live gates read the final CLI crate metadata, disable all native
binstall strategies and require the exact tag identity for the external verifier.
Keep native acceptance disabled pending the parent's capability ruling and a reviewed
R3 bridge; do not claim it is an authenticated install path. The common external
verifier enforces both the hardware approval and exact tag identity. See [upstream signing support](https://github.com/cargo-bins/cargo-binstall/blob/main/SIGNING.md).

OCI verification additionally requires the complete frozen inventory directory
and detached signature: pass `--image ghcr.io/marcinwadon/hennery@sha256:...`,
`--inventory-directory candidate`, `--approval-signature release-inventory.json.asc`
and `--tag` to `verify.py`. The hashed `ghcr-index.json` must contain a `digest`
matching the requested immutable image. R4 must normalize that index descriptor
and apply this policy before accepting an OCI subject; an attestation alone or a
mutable image tag is insufficient.

Retries recover held exact versions, recheck holds/digests and renew audit/attempt
approval. Reconcile every remote artifact, including lost upload responses. Reuse
an existing cryptographically verified bundle safely across reconcile then upload;
never replace a differing local/remote bundle. Only verified absence permits an
upload; ambiguous auth/network responses or mismatches stop. Published GitHub
assets are immutable; incomplete/conflicting releases require a new version.
Retain and reuse the identical approved `.asc` on retries; regenerating a
different signature cannot replace an already published immutable sidecar.

Before evaluating a release flake, use the independently trusted verifier to
authenticate the inventory and its source commit. Check the fetched source is
that exact full commit SHA and verify the annotated tag as defense in depth;
invoke Nix with the authenticated full SHA. A tag name or an unverified flake
cannot authenticate its own code. This also applies to replacement verifier
code downloaded from a tag. Nix builds the real UI and
retains reference guards and source/UI/adapter identity. Native Linux arm64 is in
CI; no public cache or unqualified platform is implied. Public-path acceptance
belongs to the maintainer after authorized publication. Before rollback, stop
services, back up the complete data/config/keys, and check schema compatibility;
restore a matching backup or ship a forward fix if downgrade is unsafe. Withdraw
bad versions with remediation and retained corresponding source; never rewrite
assets/tags/crate/image versions. Revoke affected credentials where appropriate.

Generated with Claude AI — please review before distribution.
