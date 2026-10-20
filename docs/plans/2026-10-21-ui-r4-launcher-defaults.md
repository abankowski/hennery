# UI R4 — launcher and per-hat session defaults

- **Date:** 2026-10-21
- **Branch:** `plan/ui-r4`, targeting `redesign`.
- **Base:** `fbe7d974` (reviewed R1/R2 foundation).
- **Contract:** [UI redesign](../specs/2026-10-20-ui-redesign-design.md) §§5.4, 6, 8–10, O1 and D7–D10.

## Execution status (2026-10-20)

Built first. The first compiling backend was pushed as `a824fa6c` so the
parent could start draft-PR Linux CI during implementation. Final gate,
removal-probe, replay and screenshot evidence is recorded below after it is
observed. Independent review and current PR status belong to the parent;
this document does not claim independent approval.

### R3 integration — latest local verification

The parent requested a merge of R3's `81ef9236` into the reviewed R4
branch. `git fetch origin` followed by
`git -c commit.gpgsign=false merge origin/redesign` produced merge
`8acc94f6`, with parents `c8933a15` and `81ef9236`. No rebase was performed.

There were no textual conflicts or manual source resolutions. Git
auto-merged `web/e2e/sessions.spec.ts` and `web/e2e/mcp-delivery.spec.ts`.
Inspection and the diff against the R3 parent confirm that both files
retain R3's Details-panel/report open/close and composer navigation, plus
exactly R4's checked-radio assertions and deliberate agent-defaults opt-out
for catalog-less fixtures. Delivery, privacy, isolation and prompt
assertions remain intact. The remerge audit contains no resolution delta.

All commands ran through `nix develop -c` on the merged source:

| Command | Observed result |
|---|---|
| `pnpm --dir web typecheck` | exit 0 |
| `pnpm --dir web test` | exit 0; 2,232 passed across 131 files (2,205 → 2,232 after R3 integration) |
| `CI=1 pnpm --dir web e2e` | exit 0; 115 passed, 11 expected skips, 0 failed, 126 total, 4.7 minutes |

The full browser suite ran exactly once for this integration. Its
preparation built the merged production UI and real embedded PWA binaries.
The passing run includes both formerly blocked integration suites, all four
owned R4 cases and R3's redesigned session cases. Logs and the merge audit
are in `.superpowers/sdd/ui-r4/merge-redesign/`. No implementation edit was
needed after the merge. Parent-owned CI, approval and complete PR status
remain separate from these observed local results.

The embedded implementation blocks and replay record below are pinned to
the pre-integration `c8933a15` tree. R3's implementation arrives through its
own merged plan; the integrated E2E files retain both lanes' changes and
must not be replaced with the earlier frozen blocks.

### Build and review evidence before R3 integration

Implementation and review amendments are built and pushed through
`a74f2b47`; compatibility commit `5482f3bc` is separate. Local amendment
checks pass; full integration acceptance awaits current CI and scoped
re-review. The first two task commits are `a824fa6c` and `5050f8f8`.
The parent's independent review of `fbe7d974..17db979c` for PR #208 was
APPROVE AFTER AMENDMENTS: the security core passed, with three P2 findings
addressed below. No final PR approval or Linux CI result is claimed here.

| Gate (all toolchain commands inside `nix develop -c`) | Observed result |
|---|---|
| `pnpm --dir web install --frozen-lockfile` | exit 0; dependency lockfile unchanged |
| `pnpm --dir web typecheck` | exit 0 |
| `pnpm --dir web test` | exit 0; 125 files, 2,205 tests after review amendments |
| `pnpm --dir web build` | exit 0, including build-script tests and emitted-CSS origin checks |
| `cargo build -p hennery -p hennery-testkit --bins --locked` | exit 0 |
| `UI_R4_SCREENSHOTS=1 CI=1 pnpm --dir web exec playwright test new-session.spec.ts sessions.spec.ts mcp-delivery.spec.ts` | exit 0; 33 passed, 1 desktop-only case skipped (34 total), 1.2 minutes; includes all 4 owned R4 cases after the layout fix |
| `CI=1 pnpm --dir web e2e` (single authorized compatibility rerun, before the layout fix) | exit 1; 88 passed, 4 failed, 10 skipped, 20 serial dependents did not run; 122 total, 8.4 minutes |
| `cargo fmt --all --check` | exit 0 |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | exit 0 |
| `cargo clippy -p hennery --locked -- -D warnings` | exit 0 |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | exit 0 |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | exit 0 |
| `cargo test --workspace --locked` | exit 0; 2,696 passed, 0 failed, 8 ignored across 179 result groups |
| Revision-race load | exit 0 in all 4 concurrent executions × 3 rounds (12 runs) |

Counts versus the base: Rust adds 7 tests (2,689 → 2,696); web adds 50
(2,155 → 2,205); browser adds 4 (118 → 122). Base totals are derived from
the unchanged suites and added cases, not a separately executed full base
run. Pre-review targeted web verification and the replay delta passed 79
tests; the amendment's two targeted screen suites pass 54 tests. Targeted
backend verification passes 4 storage plus 3 HTTP,
1 capabilities and 3 owner-audit tests. The full Rust run was serialized
against web builds; no repeat full workspace run was required by final
web-only amendments. Timing-independent UI tests use controlled promises
and fake clocks; they do not add a separate timing-load campaign.

The initial full browser run preceded the final web-only refinements and
failed on old Host/Agent button selectors at both widths in R3's
`web/e2e/sessions.spec.ts` and R5's `web/e2e/mcp-delivery.spec.ts`. It had
88 passed, 4 failed, 10 skipped and 20 serial dependents not run.

**Parent-authorized ownership exception (2026-10-20, spec §10):** applied
the exact prepared compatibility patch to those two files, replacing
pressed-button selection assertions with checked-native-radio assertions
and explicitly choosing “Use agent defaults for this start” for their
catalog-less fake adapters. All delivery, prompt, privacy, CSP and isolation
assertions are preserved. No `force` click or assertion relaxation is used.
The parent resolves conflicts with R3's concurrent amendments at integration;
this branch does not rebase onto `plan/ui-r3`.

Exactly one subsequent full E2E run was authorized and executed under
shared R3/R5/R6 load. The revised native-radio selectors work. The run
exposed a different R4 layout failure: the native opt-out checkbox is
present, enabled and stable, but `.modal-foot` intercepts its pointer
events repeatedly. Both MCP delivery and session-start widths reach that
checkbox. The observed browser trace is retained; this is not declared a
timing flake.
The single-run allowance is exhausted, so no second full run is made.
The subsequent amendment moves scrolling to a normal div around the
disabled/inert fieldset and keeps the checkbox glyph compact within its
44px label. Targeted real-browser checks of all three affected files pass
33 cases with one pre-existing desktop-only skip; the previously blocked
delivery/privacy/isolation and first-prompt assertions execute unchanged.
The owned four-case matrix also exercises and captures the unavailable
settings opt-out. A second full run was not made. Full-suite green remains
an explicit CI obligation, rather than being inferred from the subset.

### Independent review amendments

The three reviewed P2 findings were reproduced in the actual screen suites
before production fixes: eight parameterized launcher cases failed across
pending Start, configuration read-back, ambiguous delivery and prompt
failure; the manual-agent regression failed by reading Claude instead of
the typed custom agent. RED: 9 failed, 45 passed, exit 1. After the fixes,
the same suites pass all 54 tests, exit 0.

1. A marker in the existing `hennery.draft.` namespace binds pending work
   to its login lifetime. Existing confirmed-logout cleanup removes it;
   every late completion checks that lifetime before retaining text or
   continuing. Ordinary Close can still retain its session's prompt.
   No shared draft/logout helper or another lane's auth flow changed.
2. Each launcher stamps its draft with a distinct owner. Cleanup removes
   only that owner's record. An earlier closed launch can retain its own
   session draft while a newer real launcher keeps its unsent text. Late
   ambiguous/failure completions also cannot navigate the newer launcher.
3. Defaults distinguishes explicit Other-agent editing from initial runtime
   selection. A custom or temporarily empty input survives; the regression
   also loads and resets a removed agent's saved record without a catalog.

The full browser run supplied a separate RED reproduction of inaccessible
unknown-catalog controls. The scrolling-body correction passes both
previously failing widths in both affected suites. A preparatory known-
catalog route test alone did not reproduce that geometry; it is not claimed
as RED evidence. The actual full-run pointer-interception traces are kept.

### Removal probes and replay

Before review, forty-five distinct guard removals were caught by actual
failing tests or the owner audit in one separate APFS-cloned probe copy. The original pass
caught 22/24; two tests were strengthened to observe settled stale replies
and successful view reads, then both missed guards were caught. Subsequent
guards cover strict records/configs, query errors, unavailable save
contexts, closing during Start/read-back, private requested-setting review,
catalog completeness/freshness, opt-out scope, context re-entry, editor
revision pinning, keyboard modifiers and wire-role collisions. Failure
logs were checked for the intended semantic assertion, not compile errors.
Each mutation was restored; no probe mutation entered the execution tree.
The review amendment used a fresh separate APFS-cloned copy,
`../redesign-r4-probe-2`: baseline 54/54 passed, then all four new removals
were caught (login lifetime, draft owner, closed navigation, manual agent).
Each failure was checked for the intended behavioral assertion, and all six
amendment files matched the restored baseline before staging. There are 49
distinct caught probes overall. Staged source bytes matched that tested
baseline; no full fresh replay was repeated for this amendment.

One fresh replay began at `fbe7d974` in an independent copy with its own
APFS-cloned target, node_modules and dist. It extracted 29 files, executed
tasks 1–3 with exits 0/0/0, regenerated protocol output, and passed 4 storage,
7 HTTP/capability/audit and 68 targeted web tests plus fmt/generators.
All 1,049 tracked implementation files matched. Final amendments were
applied from refreshed plan blocks to that same successful replay copy,
per the verification budget: 30 blocks checked, 13 final changed files
applied, typecheck and 79 targeted web tests exit 0, and all 1,049 tracked
implementation files still match with zero mismatches. No second full
fresh replay or shared target directory was used. The review/ownership
amendment was then materialized from 33 refreshed blocks into that same
copy: 8 changed paths applied, all 1,050 tracked implementation files match
with zero mismatches. All 35 implementation/generated paths in the fresh
probe copy also match the final source, with no live mutations.

Evidence stays in `.superpowers/sdd/ui-r4/`: `rust-status.txt`, individual
Rust logs, `probes/*results.txt`, `review-probes/`, `review-red.log`,
`review-final-web.log`, `full-e2e-authorized.log`, the retained full-run
failure traces, `replay/`, `screenshots.md` and the 36 PNGs.
Scratch copies `../redesign-r4-probe-1`, `../redesign-r4-probe-2` and
`../redesign-r4-replay-1` remain
for parent cleanup, as required by the worktree instructions.

### Visual acceptance and handoff

Screenshots cover `defaults-context`, `defaults`, `defaults-confirm`,
`launcher`, `launcher-config`, `launcher-unavailable`, `launcher-starting`, `launcher-recents` and
`launcher-review`, each at 390×844/1280×900 and light/dark. Captures assert
no page overflow and wait for self-hosted fonts; representative images
were inspected. The private manifest maps all 36 files to Desktop Defaults,
Desktop `newOpen`, Mobile frame 5 and the Design System controls.

Intentional prototype differences: explicit host/project preview for
heterogeneous catalogs; real configured agents plus an Other disclosure;
a read-only desktop saved-value matrix with deliberate per-hat editor;
native radios/selects/checkboxes, visible inheritance/security warnings,
actual recent timestamps, pending focus containment and a retained-draft
review notice. No device bezel, copied project data or prototype HTML is
shipped. Installed iOS and final pinned-adapter release acceptance remain
parent-owned. The shared docs index is deliberately unchanged.

Parent scoped re-review request: inspect `17db979c..a74f2b47`, especially
logout invalidation across all late outcomes, draft cleanup ownership,
closed navigation, Other-agent persistence/offline resets and the scrolling
body/footer. The previous security-core review passed. Parent
must report checks, reviewDecision, mergeStateStatus and every unresolved
review thread, including bots. No self-approval is recorded.

## Scope

1. Sparse kernel preferences, strict generated wire types, operator HTTP
   facade, migration and owner audit.
2. Catalog-aware inheritance, responsive Defaults editor and launcher,
   read-back confirmation before a separate first prompt.
3. Real embedded-browser acceptance, removal probes and one fresh replay.
4. Record execution; the parent owns the serial docs index update.

Out: delegation grants, delegated spawn/resume semantics, running-session
configuration UI, other lanes' screens and shared CSS, new diagnostics,
external accounts/dependencies, deployment and GitHub actions.

Ownership exception authorized by the parent under spec §10: update only
the launcher integration controls in R3's `web/e2e/sessions.spec.ts` and
R5's `web/e2e/mcp-delivery.spec.ts`. Preserve selection assertions as checked
native radios and explicitly choose agent defaults for catalog-less fakes.
The parent resolves conflicts with R3's concurrent changes at integration;
this lane does not rebase onto `plan/ui-r3`.

## Decisions

- Store only owner × hat × configured agent preferences in kernel migration
  14. Keep an empty reset row with its revision to avoid absent-row ABA.
- Accept opaque well-formed strings/booleans without probing a host during
  a database transaction. The operator editor uses a fresh explicit host
  context for replacements; resets work offline.
- Require route-level step-up before body extraction and recheck the live
  session, expiry, owner, hat freeze and revision under an IMMEDIATE write
  transaction. No preference write changes delegation authority.
- Use the host's existing hello-derived `mcp_delivery` keys as its reported
  configured runtime inventory. Preserve explicit Other-agent entry without
  inventing agent availability, sign-in or version facts.
- Keep the desktop matrix a read-only preview of saved records; its Edit
  controls choose the explicit per-hat editor below. Mobile shows the same
  editor one hat at a time. Save and reset are deliberate operations, with
  a review confirmation, normal step-up and no automatic conflict merge.
- Carry sparse provenance through the resolver. On a model change prune
  only inherited nonsecurity probe axes, retaining profile and execution-
  policy axis identities, mode, and deliberate stored/explicit values.
- Confirm the newly created session's actual hat, lifecycle, nonempty
  catalog, exact requested values and actual option current values; inspect
  the bounded typed view for a reported configuration failure. Bound the
  wait to 30 seconds. A failure retains the prompt in that session's draft;
  a later update never releases it automatically.
- A missing/stale/unknown context requires an explicit per-start opt-out
  before sending no unverified overrides. Launcher drafts use the existing
  `hennery.draft.` namespace, so sign-out cleanup covers them.
- The opt-out still confirms the active session and its actual hat. A
  configuration failure keeps requested display labels with the private
  per-session draft, never in the URL. Closing during Start never releases
  the first prompt; pending controls are inert and modal focus stays inside.
- Each canonical context re-entry is a new read, including A → B → A.
  Editors pin the revision they began editing; a later record cannot
  silently advance an outstanding edit's compare-and-swap revision.
- Only string selects may occupy the wire's model/mode slots. Reserved
  axis ids cannot overwrite those roles. Unsupported shapes are omitted
  with a visible notice; core and security defaults require read-back.
- Recent project choices display their actual last-use time. Host and
  agent choices retain native radio semantics and keyboard behavior.
- Pending completion belongs to the login lifetime and originating draft.
  Logout removes the launcher's marker through existing draft cleanup;
  ordinary Close can retain its session draft without clearing a newer
  launcher's state. Late completions never navigate a closed launcher.
- Other-agent editing is deliberate, including an empty intermediate
  value. Initial selection may choose a reported runtime; typing is never
  replaced by the first listed runtime. Offline saved-record resets remain
  available for an unreported agent.
- The scrolling modal body is a normal div around the disabled/inert
  fieldset. This keeps unavailable-settings controls above the footer.

These choices implement the already confirmed redesign contract. The
parent performs independent security/design review; no self-approval is
recorded here.

## Global Constraints

Read the worktree AGENTS and fleet rules. Run toolchain commands through
`nix develop -c`; never share target directories. Clone target with APFS
before any scratch build. Run removal probes only in a scratch copy. Keep
prototype data, local screenshots and ledgers out of version control.
Preserve shared parser exports, Client step-up/retry, the one list SSE,
server hat resolution, typed view items, safe routing and secret cleanup.
Do not rebuild `web/dist` while Rust tests/doctests are running: generated
`include_bytes!` entries require that complete asset snapshot to stay put.

## Review Focus

Ownership/freeze/revision/auth checks at the write boundary; resets and
false values; generated DTO strictness/body bounds; unknown profiles and
security-axis identity; heterogeneous catalogs and opaque ids; explicit
unsupported values; actual read-back and first-prompt ordering; transient
or missing evidence; stale response fences; drafts and modal focus; native
radio/tab semantics and both appearances at both widths.

## File structure

Kernel `session_defaults.rs` owns storage; sessions
`session_defaults_api.rs` owns HTTP; proto owns the new generated records.
The existing capabilities response test is updated with the new feature,
keeping exact equality. `api/defaults.ts` is the browser facade,
`lib/defaults.ts` is pure resolution and `lib/start.ts` is launch read-back.
`CatalogContext`, `LaunchConfig` and `DefaultsEditor` share catalog controls;
Defaults and NewSession import only R4's `styles/launch.css`.
The browser suite is `web/e2e/new-session.spec.ts`.

## Reading the steps

Every `File:` block below replaces that complete repository-relative file.
Apply tasks in order to the base above. Blocks contain the built bytes,
including tests, rather than pseudocode. Regenerate protocol/schema outputs
in Task 1; do not hand-edit generated files. The replay extractor must find
more than zero files and compare every tracked implementation byte.

## Task 1: Kernel storage, protocol and stepped-up HTTP


### File: `crates/hennery-proto/src/session_defaults.rs`

```rust
//! Sparse operator launcher preferences, independent of delegation grants.
use crate::frames::{ConfigValue, SessionConfig};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct HatSessionDefaults {
    pub hat_id: String,
    pub agent: String,
    #[ts(type = "number")]
    pub revision: i64,
    #[serde(deserialize_with = "strict_config")]
    pub config: SessionConfig,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema, TS)]
#[serde(deny_unknown_fields)]
pub struct PutHatSessionDefaults {
    #[ts(type = "number")]
    pub revision: i64,
    #[serde(deserialize_with = "strict_config")]
    pub config: SessionConfig,
}

fn strict_config<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<SessionConfig, D::Error> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Strict {
        #[serde(default)]
        model: Option<String>,
        #[serde(default)]
        mode: Option<String>,
        #[serde(default)]
        axes: BTreeMap<String, ConfigValue>,
    }
    let value = Strict::deserialize(deserializer)?;
    Ok(SessionConfig {
        model: value.model,
        mode: value.mode,
        axes: value.axes,
    })
}
```

### File: `crates/hennery-proto/src/lib.rs`

```rust
//! hennery's own wire types: host<->collector frames and REST payloads.
//!
//! This crate is the single source of truth (architecture spec §5.4). JSON
//! Schema and TypeScript are generated from these types by the `gen` binary;
//! ACP payloads travel inside them as raw JSON and are never modelled here.

pub mod delegation_host;
pub mod delegation_status;
pub mod form_schema;
pub mod frames;
pub mod paths;
pub mod plugin;
pub mod rest;

/// Version of the host<->collector protocol, `MAJOR.MINOR`. Sent only in
/// `hello` / `hello_ack`; minor versions are additive (architecture spec §5.3).
pub const PROTOCOL_VERSION: &str = "1.0";

/// The major part of a `MAJOR.MINOR` version string, if well formed.
pub fn protocol_major(version: &str) -> Option<u32> {
    let (major, minor) = version.split_once('.')?;
    minor.parse::<u32>().ok()?;
    major.parse().ok()
}

/// Name of the WebSocket upgrade response header that carries the
/// collector's nonce for `hello.proof` (ACP core §3.5): 32 random bytes,
/// lowercase hex.
pub const HELLO_NONCE_HEADER: &str = "hennery-hello-nonce";

/// The bytes a host signs for `hello.proof` (ACP core §3.5): the
/// collector's nonce, the host id and the protocol version, behind a
/// domain-separation label and each prefixed with its length (u32, big
/// endian), so no two different triples produce the same message.
pub fn hello_proof_message(nonce: &[u8], host_id: &str, protocol_version: &str) -> Vec<u8> {
    const LABEL: &[u8] = b"hennery hello proof v1";
    let mut out = Vec::with_capacity(LABEL.len() + 12 + nonce.len() + host_id.len() + protocol_version.len());
    out.extend_from_slice(LABEL);
    for part in [nonce, host_id.as_bytes(), protocol_version.as_bytes()] {
        out.extend_from_slice(&(part.len() as u32).to_be_bytes());
        out.extend_from_slice(part);
    }
    out
}
pub mod codegen;
pub mod delegation;
pub mod plugin_management;

pub mod session_defaults;
```

### File: `crates/hennery-proto/src/codegen.rs`

```rust
//! Renders the generated artefacts. The `gen` binary writes them to disk or,
//! with `--check`, fails if the checked-in copies differ.

use crate::plugin_management;
use crate::{delegation, frames, plugin, rest};
use schemars::generate::SchemaSettings;
use ts_rs::{Config, TS};

/// Repository-relative path of the generated JSON Schema.
pub const SCHEMA_PATH: &str = "schema/hennery-protocol.schema.json";
/// Repository-relative path of the generated TypeScript module.
pub const TS_PATH: &str = "web/src/generated/protocol.ts";

const HEADER: &str = "// Generated by `cargo run -p hennery-proto --bin gen`. Do not edit.\n";

/// One JSON Schema document with every type under one flat, top-level
/// `$defs`.
///
/// Each root type is added via [`SchemaGenerator::subschema_for`] on a
/// single shared generator, which records `T` itself (unless inlined) plus
/// everything `T` transitively depends on in the generator's own flat
/// `definitions` map (schemars 1.2 `src/generate.rs`). We then drain that
/// map with `take_definitions` instead of using `root_schema_for`, which
/// would embed a *fresh copy* of the accumulated definitions under each
/// root's own nested `$defs` — producing dangling `#/$defs/...` refs at the
/// document root, since only the root types themselves would be registered
/// there.
pub fn render_schema() -> String {
    let mut generator = SchemaSettings::draft2020_12().into_generator();
    macro_rules! add {
        ($($t:ty),* $(,)?) => {$(
            generator.subschema_for::<$t>();
        )*};
    }
    add!(
        crate::session_defaults::HatSessionDefaults,
        crate::session_defaults::PutHatSessionDefaults,
        rest::SetIdlePinRequest,
        rest::IdleHoldState,
        plugin_management::RegisterPluginRequest,
        plugin_management::PluginRecoveryConfirmation,
        plugin_management::PluginGrantResponse,
        plugin_management::PluginRegistration,
        plugin_management::RotatePluginRequest,
        plugin_management::RotatePluginResponse,
        plugin_management::PluginLease,
        plugin_management::PluginDeletionReceipt,
        plugin::PluginActivityPage,
        plugin::PluginSourceInventoryPage,
        plugin::PluginContext,
        plugin::StartupContext,
        plugin::StartupStatus,
        plugin::StartupRecord,
        delegation::HatSessionTools,
        delegation::SetSessionTools,
        delegation::SessionFamily,
        delegation::CapabilitiesArgs,
        delegation::SpawnArgs,
        delegation::SendArgs,
        delegation::AnswerArgs,
        delegation::StatusArgs,
        delegation::ListArgs,
        delegation::CloseArgs,
        delegation::OperationReceipt,
        delegation::OperationState,
        crate::delegation_status::ExecutionPolicy,
        crate::delegation_status::SetExecutionPolicy,
        crate::delegation_status::DelegationLimits,
        crate::delegation_status::CapabilitiesResult,
        crate::delegation_status::ChildQuestion,
        crate::delegation_status::ChildSummary,
        crate::delegation_status::ChildList,
        crate::delegation_status::ChildStatus,
        crate::delegation_host::PromptFence,
        crate::delegation_host::ConfigCompleteness,
        crate::delegation_host::ConfigEvidence,
        crate::delegation_host::CatalogFreshness,
        crate::delegation_host::SecurityClassification,
        crate::delegation_host::HostCatalog,
        plugin::PluginCapabilities,
        plugin::ForgetReceipt,
        frames::HostFrame,
        frames::CollectorFrame,
        rest::StartSessionRequest,
        rest::StartSessionResponse,
        rest::PromptRequest,
        rest::PromptResponse,
        rest::StoredBlock,
        rest::AttachmentUsage,
        rest::EventDto,
        rest::ApiError,
        rest::LifecycleResponse,
        rest::SessionItem,
        rest::SessionPage,
        rest::SessionDetail,
        rest::CancelResponse,
        rest::ConfigRequest,
        rest::SessionCatalog,
        rest::PendingItem,
        rest::AnswerRequest,
        rest::AnswerResponse,
        rest::PairingCodeResponse,
        rest::EnrollRequest,
        rest::EnrollResponse,
        rest::HostItem,
        rest::RecentProject,
        rest::HostProjects,
        rest::DirectoryListing,
        rest::SetupRequest,
        rest::SetupResponse,
        rest::LoginRequest,
        rest::StepUpRequest,
        rest::AuthSessionItem,
        rest::PasskeyRegisterRequest,
        rest::PasskeyCeremony,
        rest::PasskeyFinishRequest,
        rest::PasskeyItem,
        rest::UpdateHostRequest,
        rest::HatItem,
        rest::PurgePreview,
        rest::PurgeResult,
        rest::CreateHatRequest,
        rest::UpdateHatRequest,
        rest::SetHatLogoRequest,
        rest::PathRuleItem,
        rest::PathRuleInput,
        rest::PathRulesRequest,
        rest::HatResolveRequest,
        rest::HatResolution,
        rest::UpdateSessionRequest,
        rest::VapidKeyResponse,
        rest::PushKeys,
        rest::PushSubscribeRequest,
        rest::PushRotateRequest,
        rest::PushUnsubscribeRequest,
        rest::PushSubscriptionItem,
        rest::PushPolicyRequest,
        rest::PushPolicyItem,
        rest::SettingsResponse,
        rest::SettingsUpdateRequest,
        rest::SettingsUpdateResponse,
        rest::PublicUrlChanged,
        rest::PushPayload,
        rest::McpCredKind,
        rest::McpConnectionStatus,
        rest::McpConnectionItem,
        rest::CreateMcpConnectionRequest,
        rest::UpdateMcpConnectionRequest,
        rest::McpMountsRequest,
        rest::McpCredentialRequest,
        rest::DeleteResult,
        rest::HostRemovalItem,
        rest::DeploymentMode,
        rest::CapabilitiesResponse,
        rest::McpAgentDelivery,
        rest::McpSessionDeliveryMode,
        rest::McpSessionDelivery,
        rest::McpStdioEnvItem,
        rest::McpStdioServerItem,
        rest::McpStdioServerSet,
        rest::McpStdioEnvInput,
        rest::McpStdioServerInput,
        rest::McpStdioServersRequest,
        rest::McpOauthState,
        rest::McpOauthPendingClient,
        rest::McpOauthError,
        rest::McpOauthRedirect,
        rest::McpOauthClientRequest,
        rest::McpAuthorizeRequest,
        rest::McpAuthorizeResponse,
    );
    // `serde_json::Map` is a `BTreeMap` (always iterates sorted) by default,
    // or an `IndexMap` (iterates in insertion order) when serde_json's
    // `preserve_order` feature is enabled anywhere in the build — and Cargo
    // unifies features across a shared dependency for the whole
    // compilation, so `-p hennery-proto` alone (preserve_order never
    // enabled) and a workspace build (`agent-client-protocol-schema` enables
    // it) render byte-different documents for the same types: every object
    // literal here (this `json!`, and every nested object schemars built
    // while generating `defs`) is affected, not just the top-level `$defs`.
    // `sort_keys` recursively canonicalizes every object in the whole
    // document, at every depth, so the rendered output is identical either
    // way.
    let defs: std::collections::BTreeMap<String, serde_json::Value> =
        generator.take_definitions(true).into_iter().collect();
    let doc = serde_json::json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "hennery protocol",
        "$defs": defs,
    });
    let mut out = serde_json::to_string_pretty(&sort_keys(doc)).expect("schema serializes");
    out.push('\n');
    out
}

/// Rebuild every object in `value`, at every depth, inserting its keys in
/// sorted order. Insertion order is what a `serde_json::Map` actually
/// iterates in when it is backed by an `IndexMap` (the `preserve_order`
/// feature); a plain `BTreeMap`-backed `Map` already iterates sorted, so
/// this is a no-op change in output for that build either way.
/// `hennery-view`'s generator sorts its schema with it too.
pub fn sort_keys(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            // A `BTreeMap` always iterates in sorted key order regardless of
            // which `Map` implementation built it.
            let sorted: std::collections::BTreeMap<String, serde_json::Value> =
                map.into_iter().map(|(key, v)| (key, sort_keys(v))).collect();
            serde_json::Value::Object(sorted.into_iter().collect())
        }
        serde_json::Value::Array(items) => serde_json::Value::Array(items.into_iter().map(sort_keys).collect()),
        other => other,
    }
}

/// One TypeScript module exporting every hennery wire type, each with its
/// own doc comment above it, as ts-rs's own export writes it (plan 8a: the
/// frontend reads a route's answers and error codes there). `decl` carries
/// only the fields' docs.
pub fn render_ts() -> String {
    let cfg = Config::default();
    let mut out = String::from(HEADER);
    macro_rules! add {
        ($($t:ty),* $(,)?) => {$(
            out.push('\n');
            out.push_str(&<$t as TS>::docs().unwrap_or_default());
            out.push_str("export ");
            out.push_str(&<$t as TS>::decl(&cfg));
            out.push('\n');
        )*};
    }
    add!(
        crate::session_defaults::HatSessionDefaults,
        crate::session_defaults::PutHatSessionDefaults,
        rest::SetIdlePinRequest,
        rest::IdleHoldState,
        plugin_management::RegisterPluginRequest,
        plugin_management::PluginRecoveryConfirmation,
        plugin_management::PluginGrantResponse,
        plugin_management::PluginRegistration,
        plugin_management::RotationAction,
        plugin_management::RotatePluginRequest,
        plugin_management::RotatePluginResponse,
        plugin_management::PluginLease,
        plugin_management::PluginDeletionReceipt,
        plugin::InputOrigin,
        plugin::SourceRef,
        plugin::Provenance,
        plugin::StartupContext,
        plugin::StartupStatus,
        plugin::StartupRecord,
        plugin::ContextEntry,
        plugin::PluginContext,
        delegation::HatSessionTools,
        delegation::SetSessionTools,
        delegation::SessionFamily,
        crate::delegation_status::ExecutionPolicy,
        crate::delegation_status::SetExecutionPolicy,
        crate::delegation_status::DelegationLimits,
        crate::delegation_status::CapabilitiesResult,
        crate::delegation_status::ChildQuestion,
        crate::delegation_status::ChildSummary,
        crate::delegation_status::ChildList,
        crate::delegation_status::ChildStatus,
        crate::delegation_host::PromptFence,
        crate::delegation_host::ConfigCompleteness,
        crate::delegation_host::ConfigEvidence,
        crate::delegation_host::CatalogFreshness,
        crate::delegation_host::SecurityClassification,
        crate::delegation_host::HostCatalog,
        delegation::CapabilitiesArgs,
        delegation::SpawnArgs,
        delegation::SendArgs,
        delegation::AnswerArgs,
        delegation::StatusArgs,
        delegation::ListArgs,
        delegation::CloseArgs,
        delegation::OperationReceipt,
        delegation::OperationState,
        plugin::TextRole,
        plugin::Excerpt,
        plugin::PluginActivityItem,
        plugin::ActivityBody,
        plugin::PluginActivityPage,
        plugin::PluginSourceInventoryPage,
        plugin::PluginCapabilities,
        plugin::ForgetStatus,
        plugin::ForgetReceipt,
        frames::ConfigValue,
        frames::SessionConfig,
        frames::Capability,
        frames::Capabilities,
        frames::NameValue,
        frames::McpServer,
        frames::McpDelivery,
        frames::McpIsolation,
        frames::AgentIsolation,
        frames::AttachedSession,
        frames::TurnOutcome,
        frames::ParkReason,
        frames::PendingKind,
        frames::PendingResolution,
        frames::PendingReason,
        frames::ElicitationAction,
        frames::PendingExtract,
        frames::Indexed,
        frames::SessionBody,
        frames::Project,
        frames::DirEntry,
        frames::AgentHome,
        frames::ForgetKind,
        frames::ForgetReason,
        frames::ForgetWhat,
        frames::ForgetRemaining,
        frames::ForgetOutcome,
        frames::HostFrame,
        frames::CollectorFrame,
        rest::StartSessionRequest,
        rest::StartSessionResponse,
        rest::PromptRequest,
        rest::PromptResponse,
        rest::StoredBlock,
        rest::AttachmentUsage,
        rest::EventDto,
        rest::ApiError,
        rest::LifecycleResponse,
        rest::OpenTurn,
        rest::SessionItem,
        rest::SessionPage,
        rest::SessionDetail,
        rest::CancelResponse,
        rest::ConfigRequest,
        rest::SessionCatalog,
        rest::PendingState,
        rest::PendingItem,
        rest::AnswerRequest,
        rest::AnswerResponse,
        rest::PairingCodeResponse,
        rest::EnrollRequest,
        rest::EnrollResponse,
        rest::HostItem,
        rest::RecentProject,
        rest::HostProjects,
        rest::DirectoryListing,
        rest::SetupRequest,
        rest::SetupResponse,
        rest::LoginRequest,
        rest::StepUpRequest,
        rest::AuthSessionItem,
        rest::PasskeyRegisterRequest,
        rest::PasskeyCeremony,
        rest::PasskeyFinishRequest,
        rest::PasskeyItem,
        rest::UpdateHostRequest,
        rest::HatItem,
        rest::PurgePreview,
        rest::PurgeResult,
        rest::CreateHatRequest,
        rest::UpdateHatRequest,
        rest::SetHatLogoRequest,
        rest::PathRuleItem,
        rest::PathRuleInput,
        rest::PathRulesRequest,
        rest::HatResolveRequest,
        rest::HatResolution,
        rest::UpdateSessionRequest,
        rest::VapidKeyResponse,
        rest::PushKeys,
        rest::PushSubscribeRequest,
        rest::PushRotateRequest,
        rest::PushUnsubscribeRequest,
        rest::PushSubscriptionItem,
        rest::PushPolicyRequest,
        rest::PushPolicyItem,
        rest::SettingsResponse,
        rest::SettingsUpdateRequest,
        rest::SettingsUpdateResponse,
        rest::PublicUrlChanged,
        rest::PushPayload,
        rest::McpCredKind,
        rest::McpConnectionStatus,
        rest::McpConnectionItem,
        rest::CreateMcpConnectionRequest,
        rest::UpdateMcpConnectionRequest,
        rest::McpMountsRequest,
        rest::McpCredentialRequest,
        rest::RemovalState,
        rest::RemovalPending,
        rest::RemovalItem,
        rest::TranscriptRemoval,
        rest::DeleteResult,
        rest::HostRemovalState,
        rest::HostRemovalItem,
        rest::HostTranscripts,
        rest::DeploymentMode,
        rest::CapabilitiesResponse,
        rest::McpAgentDelivery,
        rest::McpSessionDeliveryMode,
        rest::McpSessionDelivery,
        rest::McpStdioEnvItem,
        rest::McpStdioServerItem,
        rest::McpStdioServerSet,
        rest::McpStdioEnvInput,
        rest::McpStdioServerInput,
        rest::McpStdioServersRequest,
        rest::McpOauthState,
        rest::McpOauthPendingClient,
        rest::McpOauthError,
        rest::McpOauthRedirect,
        rest::McpOauthClientRequest,
        rest::McpAuthorizeRequest,
        rest::McpAuthorizeResponse,
    );
    let mut clean = out.lines().map(str::trim_end).collect::<Vec<_>>().join("\n");
    clean.push('\n');
    clean
}
```

### File: `crates/hennery-kernel/src/session_defaults.rs`

```rust
//! Owner/hat/agent launcher preferences. All writes recheck authorization,
//! freeze and compare-and-swap revision under the same IMMEDIATE transaction.
use crate::{
    hosts::Hosts,
    operator::{Authenticated, STEP_UP_SECS},
    secret::unix_now,
};
use anyhow::Result;
use hennery_proto::{
    frames::ConfigValue,
    session_defaults::{HatSessionDefaults, PutHatSessionDefaults},
};
use rusqlite::{OptionalExtension, TransactionBehavior, params};

/// JavaScript can represent every revision exactly; reserve one for increment.
pub const MAX_REVISION: i64 = 9_007_199_254_740_990;

#[derive(Debug, PartialEq)]
pub enum DefaultsChange {
    Done(HatSessionDefaults),
    NotFound,
    Purging,
    Changed,
    StepUpRequired,
    Invalid,
}

pub fn valid_id(value: &str, max: usize) -> bool {
    !value.is_empty() && value.len() <= max && !value.chars().any(char::is_control)
}

pub fn valid_defaults(agent: &str, request: &PutHatSessionDefaults) -> bool {
    valid_id(agent, 128)
        && (0..=MAX_REVISION).contains(&request.revision)
        && request.config.model.as_ref().is_none_or(|v| valid_id(v, 256))
        && request.config.mode.as_ref().is_none_or(|v| valid_id(v, 256))
        && request.config.axes.len() <= 64
        && request.config.axes.iter().all(|(id, value)| {
            valid_id(id, 256)
                && id != "model"
                && id != "mode"
                && match value {
                    ConfigValue::Bool(_) => true,
                    ConfigValue::Id(v) => valid_id(v, 256),
                }
        })
}

impl Hosts {
    pub fn session_defaults(&self, hat: &str, agent: &str) -> Result<Option<HatSessionDefaults>> {
        let conn = self.conn();
        let row: Option<(Option<String>, Option<i64>)> = conn
            .query_row(
                "SELECT d.config_json, d.revision FROM hats h
             LEFT JOIN hat_session_defaults d ON d.hat_id = h.id AND d.owner_id = h.owner_id AND d.agent = ?3
             WHERE h.id = ?1 AND h.owner_id = ?2",
                params![hat, self.owner_id(), agent],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;
        row.map(|(json, revision)| {
            Ok(HatSessionDefaults {
                hat_id: hat.into(),
                agent: agent.into(),
                revision: revision.unwrap_or(0),
                config: match json {
                    Some(json) => serde_json::from_str(&json)?,
                    None => Default::default(),
                },
            })
        })
        .transpose()
    }

    pub fn put_session_defaults(
        &self,
        hat: &str,
        agent: &str,
        request: &PutHatSessionDefaults,
        auth: &Authenticated,
    ) -> Result<DefaultsChange> {
        if !valid_defaults(agent, request) {
            return Ok(DefaultsChange::Invalid);
        }
        let mut conn = self.conn();
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let now = unix_now();
        let authorized = auth.owner_id == self.owner_id()
            && tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE id_hash = ?1 AND owner_id = ?2
             AND expires_at > ?3 AND last_step_up_at > ?4)",
                params![auth.session_id, self.owner_id(), now, now - STEP_UP_SECS],
                |r| r.get::<_, bool>(0),
            )?;
        if !authorized {
            return Ok(DefaultsChange::StepUpRequired);
        }
        let hat_state: Option<bool> = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM purged_hats p WHERE p.hat_id = h.id AND p.owner_id = ?2)
             FROM hats h WHERE h.id = ?1 AND h.owner_id = ?2",
                params![hat, self.owner_id()],
                |r| r.get(0),
            )
            .optional()?;
        match hat_state {
            None => return Ok(DefaultsChange::NotFound),
            Some(true) => return Ok(DefaultsChange::Purging),
            Some(false) => {}
        }
        let revision: i64 = tx
            .query_row(
                "SELECT revision FROM hat_session_defaults WHERE hat_id = ?1 AND owner_id = ?2 AND agent = ?3",
                params![hat, self.owner_id(), agent],
                |r| r.get(0),
            )
            .optional()?
            .unwrap_or(0);
        if revision != request.revision {
            return Ok(DefaultsChange::Changed);
        }
        let stored = HatSessionDefaults {
            hat_id: hat.into(),
            agent: agent.into(),
            revision: revision + 1,
            config: request.config.clone(),
        };
        tx.execute(
            "INSERT INTO hat_session_defaults(owner_id, hat_id, agent, config_json, revision) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(owner_id, hat_id, agent) DO UPDATE SET config_json = excluded.config_json, revision = excluded.revision
             WHERE hat_session_defaults.owner_id = ?1",
            params![self.owner_id(), hat, agent, serde_json::to_string(&request.config)?, stored.revision],
        )?;
        tx.commit()?;
        Ok(DefaultsChange::Done(stored))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{db, schema};
    use hennery_proto::frames::SessionConfig;
    use rusqlite::Connection;
    use std::sync::{Arc, Barrier};

    struct Fixture {
        _dir: tempfile::TempDir,
        path: std::path::PathBuf,
        hosts: Hosts,
        hat: String,
        auth: Authenticated,
    }
    impl Fixture {
        fn new() -> Self {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join("hennery.db");
            // Upgrade the previous kernel version, then open and reopen it.
            let mut conn = Connection::open(&path).unwrap();
            conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
            db::migrate_component(
                &mut conn,
                schema::COMPONENT,
                &schema::MIGRATIONS[..schema::MIGRATIONS.len() - 1],
            )
            .unwrap();
            drop(conn);
            let hosts = Hosts::open(&path).unwrap();
            let hat = hosts.hats().unwrap()[0].id.clone();
            let now = unix_now();
            hosts.conn().execute("INSERT INTO auth_sessions(id_hash, owner_id, user_agent, created_at, last_seen_at, last_step_up_at, expires_at) VALUES ('auth', ?1, 'test', ?2, ?2, ?2, ?3)", params![hosts.owner_id(), now, now+3600]).unwrap();
            let auth = Authenticated {
                session_id: "auth".into(),
                owner_id: hosts.owner_id().into(),
                last_step_up_at: Some(now),
                expires_at: now + 3600,
                slid: false,
            };
            Self {
                _dir: dir,
                path,
                hosts,
                hat,
                auth,
            }
        }
        fn put(&self, revision: i64, config: SessionConfig) -> DefaultsChange {
            self.hosts
                .put_session_defaults(
                    &self.hat,
                    "custom",
                    &PutHatSessionDefaults { revision, config },
                    &self.auth,
                )
                .unwrap()
        }
    }
    fn config() -> SessionConfig {
        SessionConfig {
            model: Some("model-a".into()),
            mode: Some("full".into()),
            axes: [("fast".into(), ConfigValue::Bool(false))].into(),
        }
    }

    #[test]
    fn upgrade_reopen_false_sparse_reset_and_revision_aba() {
        let f = Fixture::new();
        assert_eq!(f.hosts.session_defaults(&f.hat, "custom").unwrap().unwrap().revision, 0);
        assert!(matches!(f.put(0, config()), DefaultsChange::Done(v) if v.config == config() && v.revision == 1));
        let reopened = Hosts::open(&f.path).unwrap();
        assert_eq!(
            reopened.session_defaults(&f.hat, "custom").unwrap().unwrap().config,
            config()
        );
        assert!(
            matches!(f.put(1, SessionConfig::default()), DefaultsChange::Done(v) if v.revision == 2 && v.config.is_empty())
        );
        assert_eq!(f.put(0, config()), DefaultsChange::Changed);
        assert_eq!(f.hosts.session_defaults(&f.hat, "other").unwrap().unwrap().revision, 0);
    }
    #[test]
    fn ownership_freeze_cascade_and_authorization_at_write_boundary() {
        let f = Fixture::new();
        f.hosts.conn().execute_batch("INSERT INTO owners(id,created_at) VALUES ('foreign', 0); INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('foreign-hat','foreign','Other','#64748b',0);").unwrap();
        let req = PutHatSessionDefaults {
            revision: 0,
            config: config(),
        };
        assert!(f.hosts.session_defaults("foreign-hat", "custom").unwrap().is_none());
        assert_eq!(
            f.hosts
                .put_session_defaults("foreign-hat", "custom", &req, &f.auth)
                .unwrap(),
            DefaultsChange::NotFound
        );
        assert_eq!(
            f.hosts
                .put_session_defaults("missing", "custom", &req, &f.auth)
                .unwrap(),
            DefaultsChange::NotFound
        );
        f.hosts
            .conn()
            .execute(
                "INSERT INTO purged_hats(hat_id,owner_id,purged_at) VALUES (?1,?2,0)",
                params![f.hat, f.hosts.owner_id()],
            )
            .unwrap();
        assert_eq!(f.put(0, config()), DefaultsChange::Purging);
        f.hosts
            .conn()
            .execute("DELETE FROM purged_hats WHERE hat_id = ?1", [&f.hat])
            .unwrap();
        f.hosts
            .conn()
            .execute(
                "UPDATE auth_sessions SET last_step_up_at = ?1",
                [unix_now() - STEP_UP_SECS],
            )
            .unwrap();
        assert_eq!(f.put(0, config()), DefaultsChange::StepUpRequired);
        f.hosts
            .conn()
            .execute(
                "UPDATE auth_sessions SET last_step_up_at = ?1, expires_at = ?1",
                [unix_now()],
            )
            .unwrap();
        assert_eq!(f.put(0, config()), DefaultsChange::StepUpRequired);
        f.hosts
            .conn()
            .execute("UPDATE auth_sessions SET expires_at = ?1", [unix_now() + 3600])
            .unwrap();
        assert!(matches!(f.put(0, config()), DefaultsChange::Done(_)));
        f.hosts
            .conn()
            .execute_batch("DELETE FROM settings; DELETE FROM hats;")
            .unwrap();
        let count: i64 = f
            .hosts
            .conn()
            .query_row("SELECT count(*) FROM hat_session_defaults", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
        assert!(f.hosts.session_defaults(&f.hat, "custom").unwrap().is_none());
    }
    #[test]
    fn only_one_revision_racer_replaces_the_record() {
        let f = Fixture::new();
        let barrier = Arc::new(Barrier::new(2));
        std::thread::scope(|scope| {
            let handles: Vec<_> = (0..2)
                .map(|_| {
                    let barrier = barrier.clone();
                    let f = &f;
                    scope.spawn(move || {
                        let hosts = Hosts::open(&f.path).unwrap();
                        barrier.wait();
                        hosts
                            .put_session_defaults(
                                &f.hat,
                                "custom",
                                &PutHatSessionDefaults {
                                    revision: 0,
                                    config: config(),
                                },
                                &f.auth,
                            )
                            .unwrap()
                    })
                })
                .collect();
            let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
            assert_eq!(
                results.iter().filter(|r| matches!(r, DefaultsChange::Done(_))).count(),
                1
            );
            assert_eq!(
                results.iter().filter(|r| matches!(r, DefaultsChange::Changed)).count(),
                1
            );
        });
    }
    #[test]
    fn validation_bounds_and_strict_wire_shape() {
        let mut request = PutHatSessionDefaults {
            revision: 0,
            config: config(),
        };
        assert!(valid_defaults("custom", &request));
        for agent in ["".into(), "a".repeat(129), "a\n".into()] {
            assert!(!valid_defaults(&agent, &request));
        }
        for revision in [-1, MAX_REVISION + 1] {
            request.revision = revision;
            assert!(!valid_defaults("custom", &request));
        }
        request.revision = 0;
        for model in ["".into(), "m".repeat(257), "bad\0".into()] {
            request.config.model = Some(model);
            assert!(!valid_defaults("custom", &request));
        }
        request.config = config();
        for mode in ["".into(), "m".repeat(257), "bad\n".into()] {
            let mut bad = request.clone();
            bad.config.mode = Some(mode);
            assert!(!valid_defaults("custom", &bad));
        }
        for id in ["".into(), "a".repeat(257), "bad\n".into(), "model".into()] {
            let mut bad = request.clone();
            bad.config.axes.insert(id, ConfigValue::Bool(false));
            assert!(!valid_defaults("custom", &bad));
        }
        for value in ["".into(), "v".repeat(257), "bad\n".into()] {
            let mut bad = request.clone();
            bad.config.axes.insert("custom".into(), ConfigValue::Id(value));
            assert!(!valid_defaults("custom", &bad));
        }
        let f = Fixture::new();
        assert_eq!(f.put(-1, config()), DefaultsChange::Invalid);
        request.config.axes.insert("mode".into(), ConfigValue::Bool(false));
        assert!(!valid_defaults("custom", &request));
        request.config.axes = (0..65).map(|i| (format!("a{i}"), ConfigValue::Bool(false))).collect();
        assert!(!valid_defaults("custom", &request));
        for json in [
            r#"{"revision":0,"config":{"other":true}}"#,
            r#"{"revision":0,"config":{},"other":true}"#,
            r#"{"revision":0,"config":{"axes":{"x":1}}}"#,
            r#"{"revision":0.5,"config":{}}"#,
        ] {
            assert!(serde_json::from_str::<PutHatSessionDefaults>(json).is_err());
        }
        assert!(
            serde_json::from_str::<PutHatSessionDefaults>(r#"{"revision":0,"config":{"model":null,"mode":null}}"#)
                .unwrap()
                .config
                .is_empty()
        );
    }
}
```

### File: `crates/hennery-kernel/src/schema.rs`

```rust
//! The kernel's tables in `hennery.db` (kernel spec §1.1), migrated as one
//! component beside the sessions store (`db::migrate_component`). Every
//! part of the kernel that opens the database runs the same list, so
//! whichever opens it first creates them all.

/// The kernel's component name in `schema_versions`.
pub(crate) const COMPONENT: &str = "kernel";

pub(crate) const MIGRATIONS: &[&str] = &[
    "
    CREATE TABLE hosts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        public_key TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL,
        host_version TEXT NOT NULL,
        capabilities TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER,
        revoked_at INTEGER);
    CREATE TABLE pairing_codes (
        code_hash TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER);
    ",
    // Operator auth (kernel spec §3). The new tables carry `owner_id` from
    // the start; the older ones get it with the backfill (plan 3b-iii).
    "
    CREATE TABLE owners (
        id TEXT PRIMARY KEY,
        contact TEXT,
        created_at INTEGER NOT NULL);
    CREATE TABLE password_credentials (
        owner_id TEXT PRIMARY KEY REFERENCES owners(id),
        phc TEXT NOT NULL,
        updated_at INTEGER NOT NULL);
    CREATE TABLE auth_sessions (
        id_hash TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        user_agent TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        last_step_up_at INTEGER,
        expires_at INTEGER NOT NULL);
    CREATE TABLE settings (
        owner_id TEXT NOT NULL REFERENCES owners(id),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (owner_id, key));
    ",
    // `owner_id` everywhere (plan 3b-iii decision 1): the owner exists from
    // the first start, before setup, so what is written then (`up`'s
    // pairing code and host) has an owner to carry. `set_up_at` marks the
    // setup that completes it; an owner already here was made by setup.
    "
    ALTER TABLE owners ADD COLUMN set_up_at INTEGER;
    UPDATE owners SET set_up_at = created_at;
    INSERT INTO owners(id, created_at)
        SELECT 'owner-' || lower(hex(randomblob(8))), unixepoch()
        WHERE NOT EXISTS (SELECT 1 FROM owners);
    ",
    // `owner_id` on the tables from before operator auth, filled with the
    // database's owner (plan 3b-iii decision 4). Rebuilt: SQLite cannot add
    // a column that is both NOT NULL and a foreign key, and nothing
    // references either table.
    "
    CREATE TABLE hosts_owned (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        name TEXT NOT NULL,
        public_key TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL,
        host_version TEXT NOT NULL,
        capabilities TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER,
        revoked_at INTEGER);
    INSERT INTO hosts_owned(id, owner_id, name, public_key, platform, host_version, capabilities,
                            created_at, last_seen_at, revoked_at)
        SELECT id, (SELECT id FROM owners ORDER BY created_at, id LIMIT 1), name, public_key, platform,
               host_version, capabilities, created_at, last_seen_at, revoked_at
        FROM hosts;
    DROP TABLE hosts;
    ALTER TABLE hosts_owned RENAME TO hosts;
    CREATE TABLE pairing_codes_owned (
        code_hash TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER);
    INSERT INTO pairing_codes_owned(code_hash, owner_id, created_at, expires_at, used_at)
        SELECT code_hash, (SELECT id FROM owners ORDER BY created_at, id LIMIT 1), created_at, expires_at,
               used_at
        FROM pairing_codes;
    DROP TABLE pairing_codes;
    ALTER TABLE pairing_codes_owned RENAME TO pairing_codes;
    ",
    // Passkeys (kernel spec §1.1, §3.2; plan 3c decision 3). `credential`
    // is `webauthn-rs`'s `Passkey` as JSON. `credential_id` (hex) is
    // unique across owners: one credential, one account. `sign_count` is
    // the authenticator's counter as last accepted, kept beside the JSON
    // so a login can compare and set it in one statement (decision 6).
    "
    CREATE TABLE passkeys (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        credential_id TEXT NOT NULL UNIQUE,
        credential TEXT NOT NULL,
        sign_count INTEGER NOT NULL,
        label TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER);
    ",
    // Hats (kernel spec §5.1; plan 5a decisions 1 to 3). Every owner gets
    // its default hat here, before setup, as it got its owner row: `up`
    // pairs its host before setup, and no host is ever without a default
    // hat. The `default_hat_id` setting names the hat new hosts get.
    // `hosts` is rebuilt (as in migration 4) to gain `default_hat_id`, NOT
    // NULL, filled with its owner's default hat. A host's default hat and a
    // rule's host and hat are the same owner's, by composite foreign keys
    // (the review's A3). Rules are made last: they reference the rebuilt
    // `hosts`.
    //
    // From now on, `hats` and `hosts` have children (`hosts` references
    // `hats`; `hat_path_rules` references both), so neither can be rebuilt
    // by the usual create/copy/drop/rename once child rows exist:
    // `migrate_component` runs each step in an IMMEDIATE transaction with
    // `foreign_keys=ON` (`db::configure`), and `PRAGMA foreign_keys` cannot
    // change inside a transaction. New columns go in with `ADD COLUMN`; a
    // rebuild needs a runner mode that turns foreign keys off before BEGIN
    // and runs `PRAGMA foreign_key_check` before COMMIT.
    "
    CREATE TABLE hats (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        name TEXT NOT NULL,
        colour TEXT NOT NULL CHECK (colour GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
        created_at INTEGER NOT NULL,
        UNIQUE (id, owner_id));
    INSERT INTO hats(id, owner_id, name, colour, created_at)
        SELECT 'hat-' || lower(hex(randomblob(8))), id, 'Personal', '#64748b', unixepoch() FROM owners;
    INSERT INTO settings(owner_id, key, value)
        SELECT owner_id, 'default_hat_id', id FROM hats;
    CREATE TABLE hosts_hatted (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        name TEXT NOT NULL,
        public_key TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL,
        host_version TEXT NOT NULL,
        capabilities TEXT NOT NULL DEFAULT '[]',
        default_hat_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER,
        revoked_at INTEGER,
        UNIQUE (id, owner_id),
        FOREIGN KEY (default_hat_id, owner_id) REFERENCES hats(id, owner_id));
    INSERT INTO hosts_hatted(id, owner_id, name, public_key, platform, host_version, capabilities,
                             default_hat_id, created_at, last_seen_at, revoked_at)
        SELECT h.id, h.owner_id, h.name, h.public_key, h.platform, h.host_version, h.capabilities,
               (SELECT s.value FROM settings s WHERE s.owner_id = h.owner_id AND s.key = 'default_hat_id'),
               h.created_at, h.last_seen_at, h.revoked_at
        FROM hosts h;
    DROP TABLE hosts;
    ALTER TABLE hosts_hatted RENAME TO hosts;
    CREATE TABLE hat_path_rules (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        host_id TEXT NOT NULL,
        prefix TEXT NOT NULL,
        hat_id TEXT NOT NULL,
        verified INTEGER NOT NULL CHECK (verified IN (0, 1)),
        UNIQUE (host_id, prefix),
        FOREIGN KEY (host_id, owner_id) REFERENCES hosts(id, owner_id),
        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id));
    ",
    // The project picker (kernel spec §1.1; plan 6c decision 7): the
    // workspace roots a host's reconciled connection reported, as JSON.
    "
    ALTER TABLE hosts ADD COLUMN workspace_roots TEXT NOT NULL DEFAULT '[]';
    ",
    // Project recents (kernel spec §1.1, §5.3; plan 6c decision 11), per
    // (host, hat): a session's cwd, under the hat it resolved to. The host
    // and the hat are the owner's, by composite foreign keys, as rules';
    // recents are derived, so they go with their host or hat (the review's
    // optional cascade, taken).
    "
    CREATE TABLE project_recents (
        owner_id TEXT NOT NULL REFERENCES owners(id),
        host_id TEXT NOT NULL,
        hat_id TEXT NOT NULL,
        path TEXT NOT NULL,
        last_used_at INTEGER NOT NULL,
        PRIMARY KEY (host_id, hat_id, path),
        FOREIGN KEY (host_id, owner_id) REFERENCES hosts(id, owner_id) ON DELETE CASCADE,
        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE);
    ",
    // Web Push (kernel spec §1.1, §6; plan 10a decisions 3 to 6). A
    // subscription is one browser's: `endpoint` is unique across owners, as
    // a passkey's credential is, and `p256dh`/`auth` are its keys as the
    // browser sent them (base64url). `auth_session` is the signed-in
    // session that subscribed it: ending that session ends the
    // subscription (decision 4). `expires_at` is the browser's
    // `expirationTime`, in seconds, when it gave one. A hat with no policy
    // row has the default (decision 6); a row goes with its hat.
    "
    CREATE TABLE push_subscriptions (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        device_label TEXT NOT NULL,
        auth_session TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        last_success_at INTEGER,
        last_error TEXT);
    CREATE INDEX push_subscriptions_by_session ON push_subscriptions(owner_id, auth_session);
    CREATE TABLE hat_push_policies (
        hat_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        muted INTEGER NOT NULL CHECK (muted IN (0, 1)),
        details INTEGER NOT NULL CHECK (details IN (0, 1)),
        generic_title INTEGER NOT NULL CHECK (generic_title IN (0, 1)),
        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE);
    ",
    // A hat's purge (kernel spec §5.5; plan 9c decisions 10 and 12, A7):
    // the hats a purge began on. A row freezes its hat until the purge
    // deletes the hat's row, and stays for good after it, an id and a
    // time, so `forget_hat` reaches a host away for any time. No foreign
    // key to `hats`: the hat's row goes, this one stays.
    "
    CREATE TABLE purged_hats (
        hat_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES owners(id),
        purged_at INTEGER NOT NULL);
    ",
    // Hat logos (kernel spec §5.1; plan 4d-B2): a PNG the kernel wrote
    // afresh (`logo::reencode`), with its kind and its `ETag`, all three or
    // none. Added, never rebuilt: `hats` has children (migration 6's note).
    // The check that spans the three sits on the last, once all exist.
    "
    ALTER TABLE hats ADD COLUMN logo_mime TEXT CHECK (logo_mime IS NULL OR logo_mime = 'image/png');
    ALTER TABLE hats ADD COLUMN logo_bytes BLOB CHECK (logo_bytes IS NULL OR typeof(logo_bytes) = 'blob');
    ALTER TABLE hats ADD COLUMN logo_etag TEXT
        CHECK ((logo_mime IS NULL) = (logo_bytes IS NULL) AND (logo_bytes IS NULL) = (logo_etag IS NULL));
    ",
    // Plan 8e decision E7 (8c's decision 2 deferred it here): per agent,
    // how the host isolates its MCP servers, from its latest accepted
    // `hello`, so the host list shows it while the host is away. `NULL`:
    // no such `hello` recorded yet.
    "
    ALTER TABLE hosts ADD COLUMN mcp_isolation TEXT;
    ",
    // D1: delegation is disabled unless explicitly enabled by the owner.
    "
    CREATE TABLE hat_session_tools (
        owner_id TEXT NOT NULL,
        hat_id TEXT NOT NULL,
        delegation_enabled INTEGER NOT NULL CHECK (delegation_enabled IN (0, 1)),
        revision INTEGER NOT NULL CHECK (revision > 0),
        PRIMARY KEY (owner_id, hat_id),
        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE);
    ",
    // UI R4: sparse preferences survive resets with a monotonic revision.
    "
    CREATE TABLE hat_session_defaults (
        owner_id TEXT NOT NULL,
        hat_id TEXT NOT NULL,
        agent TEXT NOT NULL,
        config_json TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        PRIMARY KEY (owner_id, hat_id, agent),
        FOREIGN KEY (hat_id, owner_id) REFERENCES hats(id, owner_id) ON DELETE CASCADE);
    ",
];

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hosts::Hosts;
    use crate::operator::Operator;
    use crate::secret::sha256_hex;
    use rusqlite::{Connection, OptionalExtension};

    const NOW: i64 = 1_800_000_000;
    const PASSWORD: &str = "correct horse battery";
    /// RFC 8032's first test key: a valid Ed25519 public key.
    const HOST_KEY: &str = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";

    fn kernel_version(conn: &Connection) -> i64 {
        conn.query_row(
            "SELECT version FROM schema_versions WHERE component = ?1",
            [COMPONENT],
            |r| r.get(0),
        )
        .unwrap()
    }

    fn has_table(conn: &Connection, table: &str) -> bool {
        conn.query_row(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |_| Ok(()),
        )
        .optional()
        .unwrap()
        .is_some()
    }

    /// Plan 3c's deferred minor: a database at kernel version 4 (before
    /// passkeys), set up, signed in, with a host and a pairing code, keeps
    /// every row through migration 5, and its owner can keep passkeys.
    #[test]
    fn a_v4_database_upgrades_to_passkeys_keeping_its_rows() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let token = "a".repeat(64);
        let owner: String = {
            let mut conn = Connection::open(&db).unwrap();
            crate::db::migrate_component(&mut conn, COMPONENT, &MIGRATIONS[..4]).unwrap();
            assert_eq!(kernel_version(&conn), 4);
            assert!(!has_table(&conn, "passkeys"));
            let owner: String = conn.query_row("SELECT id FROM owners", [], |r| r.get(0)).unwrap();
            let phc = password_auth::generate_hash(PASSWORD);
            let code = sha256_hex(b"AAAAAAAA");
            conn.execute_batch(&format!(
                "
                UPDATE owners SET set_up_at = {NOW};
                INSERT INTO password_credentials VALUES ('{owner}', '{phc}', {NOW});
                INSERT INTO settings VALUES ('{owner}', 'public_url', 'https://hennery.example');
                INSERT INTO auth_sessions(id_hash, owner_id, user_agent, created_at, last_seen_at, expires_at)
                    VALUES ('{}', '{owner}', 'test', {NOW}, {NOW}, {});
                INSERT INTO hosts(id, owner_id, name, public_key, platform, host_version, created_at)
                    VALUES ('host-old', '{owner}', 'laptop', '{HOST_KEY}', 'macos-aarch64', '0.0.0', {NOW});
                INSERT INTO pairing_codes VALUES ('{code}', '{owner}', {NOW}, {}, NULL);
                ",
                sha256_hex(token.as_bytes()),
                NOW + 3600,
                NOW + 3600,
            ))
            .unwrap();
            owner
        };

        let operator = Operator::open(&db).unwrap();
        assert_eq!(operator.owner_id(), owner);
        assert!(operator.verify_password(PASSWORD).unwrap().is_some());
        assert!(operator.authenticate(&token, NOW).unwrap().is_some());
        let hosts = Hosts::open(&db).unwrap();
        let listed: Vec<String> = hosts.list().unwrap().into_iter().map(|h| h.id).collect();
        assert_eq!(listed, ["host-old"]);

        let conn = Connection::open(&db).unwrap();
        assert_eq!(kernel_version(&conn), MIGRATIONS.len() as i64);
        let codes: Vec<String> = conn
            .prepare("SELECT owner_id FROM pairing_codes")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .map(Result::unwrap)
            .collect();
        assert_eq!(codes, [owner.as_str()]);
        let public_url: String = conn
            .query_row(
                "SELECT value FROM settings WHERE owner_id = ?1 AND key = 'public_url'",
                [&owner],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(public_url, "https://hennery.example");

        conn.execute(
            "INSERT INTO passkeys(id, owner_id, credential_id, credential, sign_count, label, created_at)
             VALUES ('passkey-0000000000000001', ?1, 'c0ffee', '{}', 0, 'laptop', ?2)",
            rusqlite::params![owner, NOW],
        )
        .unwrap();
        let passkeys: Vec<(String, String)> = operator
            .passkeys()
            .unwrap()
            .into_iter()
            .map(|p| (p.id, p.label))
            .collect();
        assert_eq!(
            passkeys,
            [("passkey-0000000000000001".to_string(), "laptop".to_string())]
        );
    }

    /// Plan 4d-B2: a database as it was just before hat logos keeps its
    /// hats, each with no logo, and its hats can then hold one. The logo
    /// migration is found by what it does, not by its number, so a lane
    /// that takes the number first changes nothing here.
    #[test]
    fn a_database_from_before_hat_logos_gains_them_keeping_its_hats() {
        let logos = MIGRATIONS
            .iter()
            .position(|m| m.contains("ADD COLUMN logo_mime"))
            .expect("the hat logo migration");
        let mut conn = Connection::open_in_memory().unwrap();
        crate::db::migrate_component(&mut conn, COMPONENT, &MIGRATIONS[..logos]).unwrap();
        assert_eq!(kernel_version(&conn), logos as i64);
        conn.execute(
            "INSERT INTO hats(id, owner_id, name, colour, created_at) SELECT 'hat-old', id, 'Old', '#123456', 7 FROM owners",
            [],
        )
        .unwrap();
        crate::db::migrate_component(&mut conn, COMPONENT, MIGRATIONS).unwrap();
        assert_eq!(kernel_version(&conn), MIGRATIONS.len() as i64);
        let old: (String, String, i64) = conn
            .query_row(
                "SELECT name, colour, created_at FROM hats WHERE id = 'hat-old'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(old, ("Old".into(), "#123456".into(), 7));
        let logo: (Option<String>, Option<Vec<u8>>, Option<String>) = conn
            .query_row(
                "SELECT logo_mime, logo_bytes, logo_etag FROM hats WHERE id = 'hat-old'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(logo, (None, None, None));
        conn.execute(
            "UPDATE hats SET logo_mime = 'image/png', logo_bytes = x'89504e47', logo_etag = 'e' WHERE id = 'hat-old'",
            [],
        )
        .unwrap();
    }

    /// Plan 4d-B2: a logo is a PNG, and its kind, bytes and `ETag` are there
    /// together or not at all, by the schema itself.
    #[test]
    fn the_schema_keeps_a_logo_whole_and_a_png() {
        let mut conn = Connection::open_in_memory().unwrap();
        crate::db::migrate_component(&mut conn, COMPONENT, MIGRATIONS).unwrap();
        let hat: String = conn.query_row("SELECT id FROM hats", [], |r| r.get(0)).unwrap();
        let refused = [
            "logo_mime = 'image/svg+xml', logo_bytes = x'3c737667', logo_etag = 'e'",
            "logo_mime = 'image/webp', logo_bytes = x'52494646', logo_etag = 'e'",
            "logo_mime = 'image/png', logo_bytes = '<svg/>', logo_etag = 'e'",
            "logo_mime = 'image/png', logo_bytes = x'89504e47', logo_etag = NULL",
            "logo_mime = 'image/png', logo_bytes = NULL, logo_etag = 'e'",
            "logo_mime = NULL, logo_bytes = x'89504e47', logo_etag = 'e'",
            "logo_mime = NULL, logo_bytes = NULL, logo_etag = 'e'",
        ];
        for set in refused {
            let sql = format!("UPDATE hats SET {set} WHERE id = ?1");
            assert!(conn.execute(&sql, [&hat]).is_err(), "{set}");
        }
        for set in [
            "logo_mime = 'image/png', logo_bytes = x'89504e47', logo_etag = 'e'",
            "logo_mime = NULL, logo_bytes = NULL, logo_etag = NULL",
        ] {
            let sql = format!("UPDATE hats SET {set} WHERE id = ?1");
            assert_eq!(conn.execute(&sql, [&hat]).unwrap(), 1, "{set}");
        }
    }

    /// Plan 6c: the roots a host reported survive every later migration.
    /// It passes trivially until a later migration rebuilds `hosts`; then
    /// it fails unless that rebuild carries the column across.
    #[test]
    fn workspace_roots_survive_every_later_migration() {
        let added = MIGRATIONS
            .iter()
            .position(|m| m.contains("ADD COLUMN workspace_roots"))
            .unwrap();
        let mut conn = Connection::open_in_memory().unwrap();
        crate::db::migrate_component(&mut conn, COMPONENT, &MIGRATIONS[..=added]).unwrap();
        conn.execute(
            "INSERT INTO hosts(id, owner_id, name, public_key, platform, host_version, default_hat_id, created_at,
                               workspace_roots)
             SELECT 'host-1', s.owner_id, 'n', 'k', 'p', 'v', s.value, 0, '[\"/srv/projects\"]'
             FROM settings s WHERE s.key = 'default_hat_id'",
            [],
        )
        .unwrap();
        crate::db::migrate_component(&mut conn, COMPONENT, MIGRATIONS).unwrap();
        let roots: String = conn
            .query_row("SELECT workspace_roots FROM hosts WHERE id = 'host-1'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(roots, "[\"/srv/projects\"]");
    }
}
```

### File: `crates/hennery-kernel/src/lib.rs`

```rust
//! Shared collector foundations (kernel spec): storage, request auth, and
//! the operator and their setup, host identity and pairing, and the admin
//! socket.

pub mod admin;
pub mod auth;
pub mod auth_api;
pub mod capabilities;
pub mod client_address;
pub mod coordination;
pub mod csp;
pub mod db;
pub mod delivery;
pub mod egress;
pub mod hats;
pub mod health;
pub mod hosts;
pub mod json;
pub mod lifecycle;
pub mod logo;
pub mod operator;
pub mod origin;
pub mod passkeys;
pub mod plugin_context;
pub mod push;
pub mod ratelimit;
pub mod recents;
pub mod redact;
mod schema;
pub mod secret;
pub mod web;

pub mod session_defaults;
```

### File: `crates/hennery-kernel/src/capabilities.rs`

```rust
//! `GET /api/capabilities` (kernel spec §8; plan 4b): which mode this
//! collector runs in, and which features it has switched on. The web UI
//! shows the views of its mode (frontend spec §2) and hides a screen whose
//! feature is off.
//!
//! Behind the session cookie: the shell asks for it first, so a 401 here is
//! what sends a signed-out browser to the login screen. The login and setup
//! screens never ask, so they render in either mode.

use crate::operator::Operator;
use axum::routing::get;
use axum::{Json, Router};
use hennery_proto::rest::{CapabilitiesResponse, DeploymentMode};
use std::sync::Arc;

/// The one place the mode is decided. Always the whole cockpit until the
/// standalone gateway (plan 8g) adds its switch here.
pub fn mode() -> DeploymentMode {
    DeploymentMode::Full
}

/// The one place features are switched on: each gateway part adds its name
/// when its API lands (`mcp_connections`, `mcp_stdio`, `mcp_oauth`,
/// `mcp_clients`). Plan 8a's connections API (`/api/mcp/connections`) is
/// served, alongside stdio servers and plan 8f's OAuth (`…/authorize`, the callback, the
/// pre-registered client, the probe).
pub fn features() -> Vec<String> {
    vec![
        "mcp_connections".to_owned(),
        "mcp_stdio".to_owned(),
        "mcp_oauth".to_owned(),
        "web_push".to_owned(),
        "session_defaults".to_owned(),
    ]
}

/// What `GET /api/capabilities` answers.
pub fn current() -> CapabilitiesResponse {
    CapabilitiesResponse {
        mode: mode(),
        features: features(),
    }
}

/// The route, behind the browser rules and the session cookie.
pub fn router(operator: Arc<Operator>) -> Router {
    crate::auth::operator_only(
        Router::new().route("/api/capabilities", get(|| async { Json(current()) })),
        operator,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_collector_is_the_whole_cockpit_with_the_gateways_connections() {
        assert_eq!(
            serde_json::to_value(current()).unwrap(),
            serde_json::json!({"mode": "full", "features": ["mcp_connections", "mcp_stdio", "mcp_oauth", "web_push", "session_defaults"]})
        );
    }

    /// The other mode, as the web UI reads it (`lib/views.ts`).
    #[test]
    fn the_gateway_mode_is_named_gateway() {
        assert_eq!(
            serde_json::to_value(DeploymentMode::Gateway).unwrap(),
            serde_json::json!("gateway")
        );
    }
}
```

### File: `crates/hennery-sessions/src/session_defaults_api.rs`

```rust
//! Operator facade for the kernel's launcher preferences.
use crate::{
    AppState,
    api::{error, internal},
};
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, Path, Query, State},
    handler::Handler,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::get,
};
use hennery_kernel::{
    json::ApiJson,
    operator::Authenticated,
    session_defaults::{DefaultsChange, valid_id},
};
use hennery_proto::session_defaults::PutHatSessionDefaults;
use serde::Deserialize;

pub fn router(state: AppState) -> Router {
    let routes = Router::new()
        .route(
            "/api/hats/{id}/session-defaults",
            get(read).put(write.layer(middleware::from_fn(hennery_kernel::auth::require_step_up))),
        )
        .layer(DefaultBodyLimit::max(16 * 1024));
    hennery_kernel::auth::operator_only(routes, state.operator.clone())
        .layer(middleware::map_response(|mut response: Response| async move {
            response.headers_mut().insert(
                axum::http::header::CACHE_CONTROL,
                axum::http::HeaderValue::from_static("private, no-store"),
            );
            response
        }))
        .with_state(state)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AgentQuery {
    agent: String,
}
async fn read(
    State(state): State<AppState>,
    Path(hat): Path<String>,
    query: Result<Query<AgentQuery>, axum::extract::rejection::QueryRejection>,
) -> Response {
    let Ok(Query(query)) = query else {
        return invalid();
    };
    if !valid_id(&query.agent, 128) {
        return invalid();
    }
    match state.hosts.session_defaults(&hat, &query.agent) {
        Ok(Some(value)) => Json(value).into_response(),
        Ok(None) => error(StatusCode::NOT_FOUND, "not_found", "not found"),
        Err(err) => internal(err),
    }
}
async fn write(
    State(state): State<AppState>,
    Path(hat): Path<String>,
    query: Result<Query<AgentQuery>, axum::extract::rejection::QueryRejection>,
    Extension(auth): Extension<Authenticated>,
    ApiJson(request): ApiJson<PutHatSessionDefaults>,
) -> Response {
    let Ok(Query(query)) = query else {
        return invalid();
    };
    match state.hosts.put_session_defaults(&hat, &query.agent, &request, &auth) {
        Ok(DefaultsChange::Done(value)) => Json(value).into_response(),
        Ok(DefaultsChange::NotFound) => error(StatusCode::NOT_FOUND, "not_found", "not found"),
        Ok(DefaultsChange::Purging) => error(StatusCode::CONFLICT, "hat_purging", "this hat is being purged"),
        Ok(DefaultsChange::Changed) => error(
            StatusCode::CONFLICT,
            "defaults_changed",
            "defaults changed; reload and review your edits",
        ),
        Ok(DefaultsChange::StepUpRequired) => hennery_kernel::auth::step_up_required(),
        Ok(DefaultsChange::Invalid) => invalid(),
        Err(err) => internal(err),
    }
}
fn invalid() -> Response {
    error(StatusCode::BAD_REQUEST, "invalid_defaults", "invalid session defaults")
}
```

### File: `crates/hennery-sessions/src/lib.rs`

```rust
//! Collector-side session module (ACP core spec §4, §8, §9).

pub mod api;
pub mod attachments;
pub mod builtin;
pub mod content;
pub mod delegation;
pub mod delegation_api;
pub mod delegation_attention;
pub mod delegation_control;
pub mod delegation_delivery;
pub mod delegation_delivery_dispatch;
pub mod delegation_dispatch;
mod delegation_form;
pub mod delegation_queue;
pub mod delegation_runtime;
pub mod delegation_worker;
pub mod family;
pub mod forget;
pub mod hats;
pub mod hosts;
pub mod hub;
pub mod idle_hold;
pub mod notify;
pub mod offline;
pub mod plugin;
pub mod plugin_api;
pub mod projects;
pub mod push;
mod redact;
mod resolve;
mod session_defaults_api;
pub mod session_tools;
mod shared_files;
pub mod startup;
pub mod store;
pub mod sweep;
pub mod tool_args;
pub mod view;
pub mod ws;

use axum::Router;
use hennery_kernel::hosts::Hosts;
use hennery_kernel::operator::Operator;
use hennery_kernel::push::{Push, VapidKey};
use hennery_kernel::ratelimit::{Limiter, Policy};
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio_util::sync::CancellationToken;

#[derive(Clone)]
pub struct AppState {
    #[cfg(feature = "test-hooks")]
    pub startup_dispatch: Arc<startup::DispatchHold>,
    pub store: Arc<store::Store>,
    /// The kernel's host registry (kernel spec §4).
    pub hosts: Arc<Hosts>,
    /// The owner, their sessions and setup (kernel spec §3).
    pub operator: Arc<Operator>,
    /// Wrong pairing codes per client address (kernel spec §4.1).
    pub enroll_limiter: Arc<Limiter>,
    pub hub: Arc<hub::Hub>,
    /// Cancelled on shutdown; long-lived handlers (host sockets, SSE) end
    /// when it fires so graceful shutdown completes.
    pub shutdown: CancellationToken,
    /// A host gone this long has its sessions presumed parked (ACP core §5.3).
    pub offline_threshold: Duration,
    /// Enumerations of each host's projects (ACP core §7).
    pub projects: Arc<projects::ProjectsCache>,
    /// How long a probe waits for its reply (ACP core §3.4).
    pub probe_timeout: Duration,
    /// The VAPID key pair (kernel spec §6). `new` makes one in memory; the
    /// collector replaces it with `<data>/vapid.key` before it serves.
    pub vapid: Arc<VapidKey>,
    /// Where push triggers send their notices (ACP core §10). `new` gives
    /// a queue nobody reads; the collector replaces it with one delivery
    /// drains.
    pub push: Push,
    /// How often the attachments are swept after the sweep at startup
    /// (plan 9b decision 9).
    pub sweep_interval: Duration,
    /// The host removals with an attempt in flight (plan 9d B7).
    pub forgets: Arc<forget::InFlight>,
    pub catalogs: Arc<delegation_runtime::Catalogs>,
    /// One notification reconciliation identity per collector, shared by workers.
    pub(crate) delegation_run: Arc<str>,
}

impl AppState {
    pub fn new(store: store::Store, hosts: Hosts, operator: Operator) -> Self {
        let hub = Arc::new(hub::Hub::new());
        store.set_idle_hub(&hub);
        Self {
            #[cfg(feature = "test-hooks")]
            startup_dispatch: Arc::default(),
            store: Arc::new(store),
            hosts: Arc::new(hosts),
            operator: Arc::new(operator),
            enroll_limiter: Arc::new(Limiter::new(Policy::ENROLL)),
            hub,
            shutdown: CancellationToken::new(),
            offline_threshold: offline::OFFLINE_THRESHOLD,
            projects: Arc::new(projects::ProjectsCache::new(projects::CACHE_TTL)),
            probe_timeout: projects::PROBE_TIMEOUT,
            vapid: Arc::new(VapidKey::generate()),
            push: Push::detached(),
            sweep_interval: sweep::INTERVAL,
            forgets: Arc::new(forget::InFlight::default()),
            catalogs: Arc::default(),
            delegation_run: uuid::Uuid::now_v7().to_string().into(),
        }
    }
}

/// The session module's part of a host revoke (kernel spec §4.3, §5.5).
/// The revoke endpoint calls it once the host's connection is gone.
impl hennery_kernel::lifecycle::LifecycleHooks for AppState {
    fn on_host_revoked(&self, host_id: &str) -> anyhow::Result<()> {
        for event in self.store.revoke_host(host_id)? {
            self.hub.publish(event);
        }
        Ok(())
    }

    /// A hat's purge past its freeze, as the purge route runs it: the
    /// gateway's part first (lane L6, A15; plan 8e: its tokens, stdio
    /// servers and connections, with their open streams cut), then the
    /// session module's (plan 9c decision 10d, `hats::purge_sessions`),
    /// and the one checkpoint the deletes owe. Each is idempotent: a purge
    /// that stopped runs both again.
    fn on_hat_purged<'a>(&'a self, hat_id: &'a str) -> hennery_kernel::lifecycle::Purge<'a> {
        Box::pin(async move {
            self.store.owe_checkpoint();
            let purged = self
                .store
                .purge_gateway_hat(hat_id)
                .await
                .and_then(|()| hats::purge_sessions(self, hat_id).map(drop));
            self.store.checkpoint();
            purged
        })
    }
}

/// Serve until `state.shutdown` is cancelled.
pub async fn serve(listener: tokio::net::TcpListener, state: AppState) -> std::io::Result<()> {
    serve_on(vec![listener], state).await
}

/// Serve `router(state)` on every listener until `state.shutdown` is
/// cancelled (kernel spec §7).
pub async fn serve_on(listeners: Vec<tokio::net::TcpListener>, state: AppState) -> std::io::Result<()> {
    offline::after_startup(&state);
    sweep::after_startup(&state);
    serve_all(listeners, router(state.clone()), state.shutdown.clone()).await
}

/// Serve `app` on every listener, the same router and the same state on
/// each (kernel spec §7), each with its peer's address: enrollment and
/// login rate-limit on it. Until `shutdown` is cancelled; a listener that
/// fails cancels it for the others too.
pub async fn serve_all(
    listeners: Vec<tokio::net::TcpListener>,
    app: Router,
    shutdown: CancellationToken,
) -> std::io::Result<()> {
    let mut serving = tokio::task::JoinSet::new();
    for listener in listeners {
        let app = app.clone().into_make_service_with_connect_info::<SocketAddr>();
        let shutdown = shutdown.clone();
        serving.spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(shutdown.cancelled_owned())
                .await
        });
    }
    let mut result = Ok(());
    while let Some(done) = serving.join_next().await {
        if let Err(err) = done.map_err(std::io::Error::other).and_then(|served| served) {
            shutdown.cancel();
            if result.is_ok() {
                result = Err(err);
            }
        }
    }
    result
}

/// Every session, host and operator route, the health checks, the host
/// WebSocket and, for every other path, the web UI. Serve it with
/// `into_make_service_with_connect_info::<SocketAddr>()`: enrollment reads
/// the client's address.
pub fn router(state: AppState) -> Router {
    api::router(state.clone())
        .merge(delegation_api::router(state.clone()))
        .merge(builtin::policy_router(state.clone()))
        .merge(hosts::router(state.clone()))
        .merge(hats::router(state.clone()))
        .merge(session_defaults_api::router(state.clone()))
        .merge(projects::router(state.clone()))
        .merge(push::router(state.clone()))
        .merge(view::router(state.clone()))
        .merge(plugin_api::router(state.clone()))
        .merge(hennery_kernel::auth_api::router(state.operator.clone()))
        .merge(hennery_kernel::capabilities::router(state.operator.clone()))
        .merge(hennery_kernel::health::router(state.operator.clone()))
        .merge(ws::router(state))
        // Outside every route's layers: the app holds no data (`web.rs`).
        .fallback(hennery_kernel::web::serve)
        // Last, so it covers every route above and the fallback (kernel
        // spec §7.2).
        .layer(axum::middleware::map_response(hennery_kernel::csp::on_html))
}
```

### File: `crates/hennery-testkit/tests/session_defaults.rs`

```rust
//! Real HTTP boundary for sparse defaults; independent of runtime availability.
use hennery_kernel::{hosts::Hosts, operator::Operator, secret::unix_now};
use hennery_sessions::{AppState, store::Store};
use hennery_testkit::{PUBLIC_URL, owner_phc};
use serde_json::{Value, json};

struct Fixture {
    _dir: tempfile::TempDir,
    state: AppState,
    url: String,
    token: String,
    hat: String,
}
impl Fixture {
    async fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("hennery.db");
        let state = AppState::new(
            Store::open(&db).unwrap(),
            Hosts::open(&db).unwrap(),
            Operator::open(&db).unwrap(),
        );
        hennery_testkit::operator_client(&state.operator);
        let token = state
            .operator
            .open_session("test", &owner_phc(&state.operator), unix_now())
            .unwrap()
            .unwrap();
        let hat = state.hosts.hats().unwrap()[0].id.clone();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(hennery_sessions::serve(listener, state.clone()));
        Self {
            _dir: dir,
            state,
            url,
            token,
            hat,
        }
    }
    fn request(&self, method: &str, hat: &str, agent: &str) -> reqwest::RequestBuilder {
        reqwest::Client::new()
            .request(
                method.parse().unwrap(),
                format!("{}/api/hats/{hat}/session-defaults?agent={agent}", self.url),
            )
            .header("origin", PUBLIC_URL)
            .header("cookie", format!("hennery_session={}", self.token))
    }
}
#[tokio::test]
async fn persist_reset_conflict_and_never_mutate_delegation_policy() {
    let f = Fixture::new().await;
    let policy = f.state.store.execution_policy(&f.hat).unwrap();
    let response = f.request("GET", &f.hat, "custom").send().await.unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(response.headers()["cache-control"], "private, no-store");
    assert_eq!(response.json::<Value>().await.unwrap()["revision"], 0);
    let config = json!({"model":"a","mode":"full","axes":{"fast":false}});
    let response = f
        .request("PUT", &f.hat, "custom")
        .json(&json!({"revision":0,"config":config}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let stored: Value = response.json().await.unwrap();
    assert_eq!(stored["config"], config);
    assert_eq!(stored["revision"], 1);
    let response = f
        .request("PUT", &f.hat, "custom")
        .json(&json!({"revision":0,"config":{}}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 409);
    assert_eq!(response.json::<Value>().await.unwrap()["code"], "defaults_changed");
    let response = f
        .request("PUT", &f.hat, "custom")
        .json(&json!({"revision":1,"config":{}}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(response.json::<Value>().await.unwrap()["revision"], 2);
    let stored: Value = f
        .request("GET", &f.hat, "custom")
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(stored["config"], json!({}));
    assert_eq!(f.state.store.execution_policy(&f.hat).unwrap(), policy);
    let conn = rusqlite::Connection::open(f._dir.path().join("hennery.db")).unwrap();
    let enabled: i64 = conn
        .query_row(
            "SELECT count(*) FROM hat_session_tools WHERE delegation_enabled = 1",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(enabled, 0);
}
#[tokio::test]
async fn every_put_including_reset_needs_fresh_step_up_and_origin() {
    let mut f = Fixture::new().await;
    let stale = f
        .state
        .operator
        .open_session("stale", &owner_phc(&f.state.operator), unix_now() - 301)
        .unwrap()
        .unwrap();
    let fresh = f.token.clone();
    f.token = stale;
    for config in [json!({}), json!({"mode":"full"})] {
        let response = f
            .request("PUT", &f.hat, "custom")
            .json(&json!({"revision":0,"config":config}))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), 403);
        assert_eq!(response.json::<Value>().await.unwrap()["code"], "step_up_required");
    }
    let response = f
        .request("PUT", &f.hat, "custom")
        .header("content-type", "application/json")
        .body("invalid json")
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 403, "route step-up must precede body extraction");
    f.token = fresh;
    let response = reqwest::Client::new()
        .put(format!("{}/api/hats/{}/session-defaults?agent=custom", f.url, f.hat))
        .header("cookie", format!("hennery_session={}", f.token))
        .header("origin", "https://foreign.example")
        .json(&json!({"revision":0,"config":{}}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 403);
    let response = reqwest::Client::new()
        .get(format!("{}/api/hats/{}/session-defaults?agent=custom", f.url, f.hat))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 401);
    let response = reqwest::Client::new()
        .put(format!("{}/api/hats/{}/session-defaults?agent=custom", f.url, f.hat))
        .header("cookie", format!("hennery_session={}", f.token))
        .json(&json!({"revision":0,"config":{}}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 403);
    let conn = rusqlite::Connection::open(f._dir.path().join("hennery.db")).unwrap();
    conn.execute_batch("INSERT INTO owners(id,created_at) VALUES ('foreign-owner',0); INSERT INTO hats(id,owner_id,name,colour,created_at) VALUES ('foreign-hat','foreign-owner','Other','#64748b',0);").unwrap();
    for method in ["GET", "PUT"] {
        let mut request = f.request(method, "foreign-hat", "custom");
        if method == "PUT" {
            request = request.json(&json!({"revision":0,"config":{}}));
        }
        assert_eq!(request.send().await.unwrap().status(), 404);
    }
    for method in ["GET", "PUT"] {
        let mut request = f.request(method, "missing", "custom");
        if method == "PUT" {
            request = request.json(&json!({"revision":0,"config":{}}));
        }
        assert_eq!(request.send().await.unwrap().status(), 404);
    }
}
#[tokio::test]
async fn bounds_strict_fields_and_frozen_hats() {
    let f = Fixture::new().await;
    for config in [
        json!({"unexpected":"x"}),
        json!({"model":""}),
        json!({"axes":{"mode":"x"}}),
        json!({"axes":{"a":3}}),
    ] {
        let response = f
            .request("PUT", &f.hat, "custom")
            .json(&json!({"revision":0,"config":config}))
            .send()
            .await
            .unwrap();
        assert!([400, 422].contains(&response.status().as_u16()));
    }
    let response = f
        .request("PUT", &f.hat, "custom")
        .header("content-type", "application/json")
        .body(" ".repeat(16385))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 413);
    for query in ["", "?agent=custom&extra=1", "?agent=custom&agent=other"] {
        let response = reqwest::Client::new()
            .get(format!("{}/api/hats/{}/session-defaults{query}", f.url, f.hat))
            .header("cookie", format!("hennery_session={}", f.token))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), 400);
        assert_eq!(response.json::<Value>().await.unwrap()["code"], "invalid_defaults");
    }
    let response = f.request("GET", &f.hat, "").send().await.unwrap();
    assert_eq!(response.status(), 400);
    let hat = match f.state.hosts.create_hat("Temporary", None, unix_now()).unwrap() {
        hennery_kernel::hats::HatChange::Done(hat) => hat.id,
        other => panic!("{other:?}"),
    };
    f.state.hosts.begin_purge(&hat, unix_now()).unwrap();
    let response = f
        .request("PUT", &hat, "custom")
        .json(&json!({"revision":0,"config":{}}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 409);
    assert_eq!(response.json::<Value>().await.unwrap()["code"], "hat_purging");
}
```

### File: `crates/hennery-testkit/tests/capabilities.rs`

```rust
//! `GET /api/capabilities` over HTTP (kernel spec §8; plan 4b). Its cookie
//! and browser rules are pinned by `auth.rs`'s route table.

use hennery_kernel::hosts::Hosts;
use hennery_kernel::operator::Operator;
use hennery_proto::rest::{CapabilitiesResponse, DeploymentMode};
use hennery_sessions::AppState;
use hennery_sessions::store::Store;

/// The signed-in owner learns the mode and the features switched on, and
/// nothing else: today the whole cockpit, with the gateway's connections.
#[tokio::test]
async fn the_owner_learns_the_mode_and_the_features() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let state = AppState::new(
        Store::open_in_memory().unwrap(),
        Hosts::open_in_memory().unwrap(),
        Operator::open_in_memory().unwrap(),
    );
    let client = hennery_testkit::operator_client(&state.operator);
    tokio::spawn(hennery_sessions::serve(listener, state));
    let resp = client
        .get(format!("http://{addr}/api/capabilities"))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(
        body,
        serde_json::json!({"mode": "full", "features": ["mcp_connections", "mcp_stdio", "mcp_oauth", "web_push", "session_defaults"]})
    );
    let typed: CapabilitiesResponse = serde_json::from_value(body).unwrap();
    assert_eq!(typed.mode, DeploymentMode::Full);
    for path in [
        "/api/push/vapid",
        "/api/push/subscriptions",
        "/api/push/policies",
        "/api/settings",
    ] {
        let response = client.get(format!("http://{addr}{path}")).send().await.unwrap();
        assert_eq!(response.status(), 200, "advertised web_push: {path}");
    }
}
```

### File: `crates/hennery-testkit/tests/owner_filter.rs`

```rust
//! Every query filters by the owner (kernel spec §1, umbrella §7.4; plan
//! 3b-iii decision 6, 3b-ii's A10). Each SQL statement in the stores'
//! sources is prepared against a migrated `hennery.db` under an
//! authorizer, which records every table the statement touches:
//! - a table it reads, changes or deletes from must have its owner column
//!   read too (`owner_id`; `id` for `owners`), whether in a `WHERE`, a
//!   join or a subquery;
//! - one owner column at least must be compared with a parameter, not only
//!   with another owner column (all but a plain `INSERT … VALUES`);
//! - an `INSERT` must name `owner_id` among its columns.
//!
//! Reads SQLite makes on its own are not the statement's: a foreign key's
//! check of its parent (a table the statement does not name), and an
//! upsert's look-up of its conflict target (the table it inserts into, when
//! it changes nothing there and does not select from it).
//!
//! A statement is any string literal that begins with `SELECT`, `INSERT`,
//! `REPLACE`, `UPDATE`, `DELETE` or `WITH`, in any case (ED4), and every
//! rule reads its text in any case too.
//!
//! A statement that does not prepare, a `{CONST}` that does not resolve,
//! or a source with fewer statements than it has fails the test too, so a
//! broken extractor cannot pass by finding nothing. And every file of the
//! workspace's `src` that holds SQL is in `SOURCES` or, with its reason, in
//! `EXEMPT`.

use hennery_gateway::store::GatewayStore;
use hennery_kernel::hosts::Hosts;
use hennery_kernel::operator::Operator;
use hennery_sessions::store::Store;
use rusqlite::hooks::{AuthAction, AuthContext, Authorization};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::sync::{Arc, Mutex};

/// The audited sources, and the fewest statements each holds.
const SOURCES: &[(&str, &str, usize)] = &[
    (
        "hennery-kernel/src/session_defaults.rs",
        include_str!("../../hennery-kernel/src/session_defaults.rs"),
        5,
    ),
    (
        "hennery-sessions/src/idle_hold.rs",
        include_str!("../../hennery-sessions/src/idle_hold.rs"),
        5,
    ),
    (
        "hennery-sessions/src/family.rs",
        include_str!("../../hennery-sessions/src/family.rs"),
        15,
    ),
    (
        "hennery-sessions/src/delegation_attention.rs",
        include_str!("../../hennery-sessions/src/delegation_attention.rs"),
        15,
    ),
    (
        "hennery-sessions/src/delegation_delivery_dispatch.rs",
        include_str!("../../hennery-sessions/src/delegation_delivery_dispatch.rs"),
        34,
    ),
    (
        "hennery-sessions/src/delegation_delivery.rs",
        include_str!("../../hennery-sessions/src/delegation_delivery.rs"),
        11,
    ),
    (
        "hennery-sessions/src/delegation_control.rs",
        include_str!("../../hennery-sessions/src/delegation_control.rs"),
        1,
    ),
    (
        "hennery-sessions/src/delegation_dispatch.rs",
        include_str!("../../hennery-sessions/src/delegation_dispatch.rs"),
        1,
    ),
    (
        "hennery-sessions/src/delegation_runtime.rs",
        include_str!("../../hennery-sessions/src/delegation_runtime.rs"),
        1,
    ),
    (
        "hennery-sessions/src/delegation_queue.rs",
        include_str!("../../hennery-sessions/src/delegation_queue.rs"),
        15,
    ),
    (
        "hennery-gateway/src/plugin/context.rs",
        include_str!("../../hennery-gateway/src/plugin/context.rs"),
        4,
    ),
    (
        "hennery-sessions/src/startup.rs",
        include_str!("../../hennery-sessions/src/startup.rs"),
        4,
    ),
    (
        "hennery-sessions/src/delegation.rs",
        include_str!("../../hennery-sessions/src/delegation.rs"),
        6,
    ),
    (
        "hennery-gateway/src/identity.rs",
        include_str!("../../hennery-gateway/src/identity.rs"),
        3,
    ),
    (
        "hennery-gateway/src/plugin/recovery.rs",
        include_str!("../../hennery-gateway/src/plugin/recovery.rs"),
        15,
    ),
    (
        "hennery-gateway/src/plugin/management.rs",
        include_str!("../../hennery-gateway/src/plugin/management.rs"),
        9,
    ),
    (
        "hennery-sessions/src/plugin.rs",
        include_str!("../../hennery-sessions/src/plugin.rs"),
        5,
    ),
    (
        "hennery-gateway/src/plugin/feed.rs",
        include_str!("../../hennery-gateway/src/plugin/feed.rs"),
        10,
    ),
    (
        "hennery-gateway/src/plugin.rs",
        include_str!("../../hennery-gateway/src/plugin.rs"),
        42,
    ),
    (
        "hennery-kernel/src/operator.rs",
        include_str!("../../hennery-kernel/src/operator.rs"),
        29,
    ),
    (
        "hennery-kernel/src/passkeys.rs",
        include_str!("../../hennery-kernel/src/passkeys.rs"),
        9,
    ),
    (
        "hennery-kernel/src/hats.rs",
        include_str!("../../hennery-kernel/src/hats.rs"),
        20,
    ),
    // Plan 4d-B2: hat logos.
    (
        "hennery-kernel/src/logo.rs",
        include_str!("../../hennery-kernel/src/logo.rs"),
        3,
    ),
    (
        "hennery-kernel/src/hosts.rs",
        include_str!("../../hennery-kernel/src/hosts.rs"),
        17,
    ),
    (
        "hennery-kernel/src/push.rs",
        include_str!("../../hennery-kernel/src/push.rs"),
        20,
    ),
    (
        "hennery-kernel/src/recents.rs",
        include_str!("../../hennery-kernel/src/recents.rs"),
        3,
    ),
    (
        "hennery-sessions/src/store.rs",
        include_str!("../../hennery-sessions/src/store.rs"),
        156,
    ),
    (
        "hennery-gateway/src/store.rs",
        include_str!("../../hennery-gateway/src/store.rs"),
        GATEWAY_STATEMENTS,
    ),
    // Plan 8d: session tokens, and the proxy's reads and writes.
    (
        "hennery-gateway/src/tokens.rs",
        include_str!("../../hennery-gateway/src/tokens.rs"),
        8,
    ),
    (
        "hennery-gateway/src/scope.rs",
        include_str!("../../hennery-gateway/src/scope.rs"),
        // Plan 8f: status writes, the probe's reads and credential identity guards.
        14,
    ),
    // Plan 8e: what a session gets, and the stdio servers.
    (
        "hennery-gateway/src/session.rs",
        include_str!("../../hennery-gateway/src/session.rs"),
        2,
    ),
    (
        "hennery-gateway/src/stdio.rs",
        include_str!("../../hennery-gateway/src/stdio.rs"),
        7,
    ),
];

/// The gateway store's statements, including stdio and OAuth clients.
const GATEWAY_STATEMENTS: usize = 53;

/// Files under `crates/*/src` with SQL that the audit does not read, and
/// why (3b-iii review, A3). Any other such file fails
/// `every_file_with_sql_is_audited_or_exempt`.
const EXEMPT: &[(&str, &str)] = &[
    (
        "hennery-memory/src/management.rs",
        "separate optional memory database; owner binding, namespace admission and every management statement are prepared and checked by hennery-memory/tests/sql_scope.rs",
    ),
    (
        "hennery-memory/src/import.rs",
        "separate optional memory database; import ledger and owner/epoch signing lookups are prepared and namespace/owner-scoped by hennery-memory/tests/sql_scope.rs",
    ),
    (
        "hennery-memory/src/consumer.rs",
        "separate optional memory database; actual consumer SQL is prepared and namespace-scoped by hennery-memory/tests/sql_scope.rs, including bounded local worker inventories",
    ),
    (
        "hennery-memory/src/store.rs",
        "separate optional memory database, never hennery.db; every statement is prepared and namespace-scoped by hennery-memory/tests/sql_scope.rs",
    ),
    (
        "hennery-kernel/src/db.rs",
        "`kernel_owner`'s query finds the owner; the rest is the migrations' bookkeeping and their unit tests",
    ),
    (
        "hennery-sessions/src/shared_files.rs",
        "attachment files are shared by hash across owners: whether any owner's row still names one, before its file \
         is removed (plan 9a A6); an existence read, no data, no write",
    ),
    (
        "hennery-host/src/outbox.rs",
        "the host's own database, on the host's machine, not `hennery.db`",
    ),
    (
        "hennery-host/src/agent_home.rs",
        "the host's own registry of agent homes (plan 9d B1), on the host's machine, not `hennery.db`",
    ),
];

/// Every string literal in `source`, in order, skipping comments and char
/// literals. Enough of Rust's lexer for these files: plain and raw
/// strings, the common escapes and line continuations.
fn string_literals(source: &str) -> Vec<String> {
    let s: Vec<char> = source.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < s.len() {
        let rest = &s[i..];
        if rest.starts_with(&['/', '/']) {
            while i < s.len() && s[i] != '\n' {
                i += 1;
            }
        } else if rest.starts_with(&['/', '*']) {
            i += 2;
            while i + 1 < s.len() && !(s[i] == '*' && s[i + 1] == '/') {
                i += 1;
            }
            i += 2;
        } else if s[i] == 'r'
            && matches!(s.get(i + 1), Some('"' | '#'))
            && (i == 0 || !(s[i - 1].is_alphanumeric() || s[i - 1] == '_'))
        {
            let mut hashes = 0;
            i += 1;
            while s[i] == '#' {
                hashes += 1;
                i += 1;
            }
            i += 1;
            let mut lit = String::new();
            loop {
                if s[i] == '"' && s[i + 1..].iter().take(hashes).filter(|c| **c == '#').count() == hashes {
                    i += 1 + hashes;
                    break;
                }
                lit.push(s[i]);
                i += 1;
            }
            out.push(lit);
        } else if s[i] == '"' {
            i += 1;
            let mut lit = String::new();
            while s[i] != '"' {
                if s[i] == '\\' {
                    i += 1;
                    match s[i] {
                        'n' => lit.push('\n'),
                        't' => lit.push('\t'),
                        '\n' => {
                            while s[i + 1].is_whitespace() {
                                i += 1;
                            }
                        }
                        c => lit.push(c),
                    }
                } else {
                    lit.push(s[i]);
                }
                i += 1;
            }
            i += 1;
            out.push(lit);
        } else if s[i] == '\'' {
            // A char literal ('x', '\n', '"'), or a lifetime ('a).
            if s.get(i + 1) == Some(&'\\') {
                i += 2;
                while s[i] != '\'' {
                    i += 1;
                }
                i += 1;
            } else if s.get(i + 2) == Some(&'\'') {
                i += 3;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    out
}

/// `const NAME: &str = "…";` in `source`, by name, the literal on the
/// declaration's line or, wrapped by rustfmt, on the next.
fn str_consts(source: &str) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    for (at, _) in source.match_indices("const ") {
        let decl = &source[at + "const ".len()..];
        let Some((name, rest)) = decl.split_once(": &str =") else {
            continue;
        };
        let rest = rest.trim_start();
        if !name.chars().all(|c| c.is_ascii_uppercase() || c == '_') || !rest.starts_with('"') {
            continue;
        }
        let value = string_literals(rest).into_iter().next().expect("the const's literal");
        out.insert(name.to_string(), value);
    }
    out
}

/// Whether a string literal is SQL: it begins with a statement's verb,
/// `REPLACE` among them (ED4). In uppercase the verb alone is enough, so a
/// fragment such as `"SELECT "`, the start of a query put together piece by
/// piece, is found (and fails to prepare, or makes A3 flag its file). In
/// any other case, another word must follow: a lone lowercase `"update"` or
/// `"select"` is a JSON key or value, not a statement.
fn is_sql(lit: &str) -> bool {
    const VERBS: &[&str] = &["SELECT", "INSERT", "UPDATE", "DELETE", "WITH", "REPLACE"];
    let mut words = lit.split_whitespace();
    let first = words.next().unwrap_or_default();
    VERBS.contains(&first) || (VERBS.iter().any(|verb| first.eq_ignore_ascii_case(verb)) && words.next().is_some())
}

/// Whether `word` is one of `sql`'s words (runs of letters, digits and
/// `_`), in any case: `from_seq` holds no `from`.
fn has_word(sql: &str, word: &str) -> bool {
    sql.split(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))
        .any(|w| w.eq_ignore_ascii_case(word))
}

/// What follows the first whole word `word` of `sql`, if it has one.
fn after_word<'a>(sql: &'a str, word: &str) -> Option<&'a str> {
    let ident = |c: char| c.is_ascii_alphanumeric() || c == '_';
    let mut start = None;
    for (at, c) in sql.char_indices().chain([(sql.len(), ' ')]) {
        match (ident(c), start) {
            (true, None) => start = Some(at),
            (false, Some(from)) => {
                if sql[from..at].eq_ignore_ascii_case(word) {
                    return Some(&sql[at..]);
                }
                start = None;
            }
            _ => {}
        }
    }
    None
}

/// `source` without its unit tests (`#[cfg(test)] mod tests`, at the end
/// of the file): their fixtures write raw rows on purpose, and are no
/// store's queries. Everything from the exact text `\n#[cfg(test)]\nmod
/// tests {` on is left out. Clippy's default `items_after_test_module`
/// lint, which CI runs with `-D warnings`, is what keeps production code
/// out of that region: an item after the test module fails the build (ED2;
/// do not allow the lint in an audited file).
fn without_tests(source: &str) -> &str {
    source.split("\n#[cfg(test)]\nmod tests {").next().unwrap_or(source)
}

/// The SQL statements in `source`, `{CONST}`s resolved; its unit tests
/// left out.
fn statements(source: &str) -> Vec<String> {
    let source = without_tests(source);
    let consts = str_consts(source);
    let mut out = Vec::new();
    for lit in string_literals(source) {
        if !is_sql(&lit) {
            continue;
        }
        let mut sql = lit.clone();
        for (name, value) in &consts {
            sql = sql.replace(&format!("{{{name}}}"), value);
        }
        assert!(!sql.contains('{'), "an unresolved constant in {lit:?}");
        out.push(sql);
    }
    out
}

/// What preparing `sql` touches: per table, the actions and the columns
/// read; and the columns it returns.
#[derive(Debug, Default)]
struct Touched {
    read: BTreeMap<String, BTreeSet<String>>,
    changed: BTreeSet<String>,
    inserted: BTreeSet<String>,
    returned: Vec<String>,
}

/// The audit's connection to the migrated `db`, with SQLite's legacy
/// double-quoted string literals turned off (3b-iii final re-review, N1).
/// With them on, a `"…"` that names nothing falls back to a string, and
/// its text, which the textual rules keep as a quoted name, could declare
/// an alias of `owners` (`" from owners h "`). Off, `"…"` is always a
/// name, and anything else fails to prepare, so it fails the audit.
fn audit_connection(db: &Path) -> rusqlite::Connection {
    use rusqlite::config::DbConfig;
    let conn = rusqlite::Connection::open(db).unwrap();
    // Audit against the union of the real schemas. Production keeps control
    // tables in its optional file; no statement may escape owner auditing.
    for migration in hennery_gateway::plugin::MIGRATIONS {
        conn.execute_batch(migration).unwrap();
    }
    for migration in hennery_gateway::plugin::feed::INVENTORY_MIGRATIONS {
        conn.execute_batch(migration).unwrap();
    }
    for migration in hennery_gateway::plugin::management::MANAGEMENT_MIGRATIONS {
        conn.execute_batch(migration).unwrap();
    }
    conn.set_db_config(DbConfig::SQLITE_DBCONFIG_DQS_DML, false).unwrap();
    conn.set_db_config(DbConfig::SQLITE_DBCONFIG_DQS_DDL, false).unwrap();
    conn
}

fn touched(conn: &rusqlite::Connection, sql: &str) -> Touched {
    let log: Arc<Mutex<Touched>> = Arc::default();
    let sink = log.clone();
    conn.authorizer(Some(move |ctx: AuthContext<'_>| {
        let mut t = sink.lock().unwrap();
        match ctx.action {
            AuthAction::Read {
                table_name,
                column_name,
            } => {
                t.read
                    .entry(table_name.to_string())
                    .or_default()
                    .insert(column_name.to_string());
            }
            AuthAction::Update { table_name, .. } | AuthAction::Delete { table_name } => {
                t.changed.insert(table_name.to_string());
            }
            AuthAction::Insert { table_name } => {
                t.inserted.insert(table_name.to_string());
            }
            _ => {}
        }
        Authorization::Allow
    }))
    .unwrap();
    let prepared = conn
        .prepare(sql)
        .map(|stmt| stmt.column_names().into_iter().map(String::from).collect());
    conn.authorizer(None::<fn(AuthContext<'_>) -> Authorization>).unwrap();
    let returned = prepared.unwrap_or_else(|err| panic!("{err}: {sql}"));
    let mut touched = Arc::try_unwrap(log).unwrap().into_inner().unwrap();
    touched.returned = returned;
    touched
}

/// The column that names a table's owner.
fn owner_column(table: &str) -> &'static str {
    if table == "owners" { "id" } else { "owner_id" }
}

/// Whether `sql` reads `table` itself: `FROM table` or `JOIN table`. An
/// `INSERT … SELECT` from its own target is then the statement's read, not
/// an upsert's look-up of its conflict target (3b-iii review, A2). In any
/// case (ED4): the authorizer names `table` as the schema does.
fn selects_from(sql: &str, table: &str) -> bool {
    let tokens: Vec<&str> = sql.split_whitespace().collect();
    tokens.windows(2).any(|w| {
        (w[0].eq_ignore_ascii_case("FROM") || w[0].eq_ignore_ascii_case("JOIN"))
            && w[1].trim_end_matches([')', ',']).eq_ignore_ascii_case(table)
    })
}

/// Whether `sql` names `table`, as a whole word, in any case (ED4): the
/// authorizer names it as the schema does, so `FROM EVENTS` names `events`.
fn names(sql: &str, table: &str) -> bool {
    let sql = sql.to_ascii_lowercase();
    let table = table.to_ascii_lowercase();
    let word = |c: Option<char>| c.is_some_and(|c| c.is_ascii_alphanumeric() || c == '_');
    sql.match_indices(&table)
        .any(|(at, _)| !word(sql[..at].chars().next_back()) && !word(sql[at + table.len()..].chars().next()))
}

/// The select list of every `SELECT` in `sql`, in order: what follows
/// that word, up to the next whole word `FROM` (or the end). A subquery's
/// list is its own: an outer list ends at the subquery's `FROM` at the
/// latest, before any `WHERE` of it (3b-iii final review, I2).
fn select_lists(sql: &str) -> Vec<&str> {
    let mut lists = Vec::new();
    let mut rest = sql;
    while let Some(list) = after_word(rest, "select") {
        lists.push(after_word(list, "from").map_or(list, |tail| &list[..list.len() - tail.len()]));
        rest = list;
    }
    lists
}

/// Whether `sql` orders, groups or partitions by `owner_id`: the column, as
/// a whole word, in the list after `ORDER BY`, `GROUP BY` or `PARTITION BY`,
/// up to the next word that ends that list. Read there, the column filters
/// nothing (3b-iii final review, I2).
fn orders_by_owner(sql: &str) -> bool {
    const ENDS_THE_LIST: &str =
        "limit offset having window order union except intersect where from select and or on join returning values set";
    let words: Vec<String> = sql
        .split(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))
        .filter(|w| !w.is_empty())
        .map(str::to_ascii_lowercase)
        .collect();
    words.windows(2).enumerate().any(|(at, w)| {
        matches!(w[0].as_str(), "order" | "group" | "partition")
            && w[1] == "by"
            && words[at + 2..]
                .iter()
                .take_while(|word| !ENDS_THE_LIST.split(' ').any(|end| end == *word))
                .any(|word| word == "owner_id")
    })
}

/// Whether `sql` is an `INSERT`: it begins with `INSERT` or `REPLACE`, in
/// any case (ED4).
fn is_insert(sql: &str) -> bool {
    let first = sql.split_whitespace().next().unwrap_or_default();
    first.eq_ignore_ascii_case("INSERT") || first.eq_ignore_ascii_case("REPLACE")
}

/// Whether an `INSERT INTO table(…)` in `sql` names `owner_id`, in any
/// case; `REPLACE INTO` and `INSERT OR REPLACE INTO` too (ED4).
fn inserts_owner(sql: &str, table: &str) -> bool {
    let sql = sql.to_ascii_lowercase();
    let Some((_, after)) = sql.split_once(&format!(" into {}(", table.to_ascii_lowercase())) else {
        return false;
    };
    let columns = after.split(')').next().unwrap_or_default();
    columns.split(',').any(|c| c.trim() == "owner_id")
}

/// `sql` as the textual rules read it: its own comments removed (`-- … `
/// to end of line, `/* … */`), since a commented-out comparison is not a
/// real one (3b-iii review, M2); and each string literal (`'…'`, `''` its
/// escape) emptied to `''`, since its text is a value, not the statement's
/// own words. A comment's opening inside a literal opens nothing, and a
/// literal's `from owners h` declares no table and no alias (3b-iii final
/// review, I1). A quoted name (`"…"`, `` `…` ``, `[…]`) is a name: it is
/// kept as it is, and a comment's opening inside it opens nothing either.
fn without_sql_comments(sql: &str) -> String {
    let s: Vec<char> = sql.chars().collect();
    let mut out = String::with_capacity(s.len());
    let mut i = 0;
    while i < s.len() {
        if matches!(s[i], '\'' | '"' | '`' | '[') {
            let quote = s[i];
            let close = if quote == '[' { ']' } else { quote };
            let start = i;
            i += 1;
            // To the closing quote; a doubled one (`''`, `""`) is its escape.
            while i < s.len() {
                if s[i] == close && !(close != ']' && s.get(i + 1) == Some(&close)) {
                    break;
                }
                i += if s[i] == close { 2 } else { 1 };
            }
            i += 1;
            if quote == '\'' {
                out.push_str("''");
            } else {
                out.extend(&s[start..i.min(s.len())]);
            }
        } else if s[i] == '-' && s.get(i + 1) == Some(&'-') {
            while i < s.len() && s[i] != '\n' {
                i += 1;
            }
        } else if s[i] == '/' && s.get(i + 1) == Some(&'*') {
            i += 2;
            while i + 1 < s.len() && !(s[i] == '*' && s[i + 1] == '/') {
                i += 1;
            }
            i += 2;
        } else {
            out.push(s[i]);
            i += 1;
        }
    }
    out
}

/// Whether `sql` compares an owner column with a parameter: `owner_id = ?N`
/// or `?N = owner_id`, qualified (`p.owner_id`) or not, or `id = ?N` when
/// `id` names `owners` — the statement's only table (`FROM owners`,
/// `UPDATE owners`, with no other `FROM`/`JOIN`/`UPDATE`/`INSERT INTO`), or
/// qualified with `owners` itself or an alias declared right after it
/// (`owners o`, `owners AS o`). `owners` appearing anywhere in the
/// statement is not enough on its own (3b-iii review, I1; ED3): before
/// this, a join or a subquery could tie some other table's unrelated `id`
/// to a parameter and pass, as long as the statement named `owners`
/// somewhere, even in an unconnected subquery. A join that compares two
/// owner columns to each other, not to a parameter, still does not count
/// (A1). A comma right after `owners` (`FROM owners, hosts`) is the next
/// item of an old-style join, not an alias: the comma is kept as its own
/// token so the next word is never mistaken for one (3b-iii review re-review
/// N1; ED6). Keywords and names are read in any case (ED4): a `from hosts`
/// missed for its case would leave `owners`, named only in a subquery, as
/// the statement's only table, and `hosts`' own `id` would count.
fn compares_owner_with_a_parameter(sql: &str) -> bool {
    let sql = without_sql_comments(sql).to_ascii_lowercase();
    let tokens: Vec<&str> = sql
        .split(|c: char| c.is_whitespace() || matches!(c, '(' | ')'))
        .filter(|t| !t.is_empty())
        .flat_map(|word| {
            let mut parts = Vec::new();
            for (at, part) in word.split(',').enumerate() {
                if at > 0 {
                    parts.push(",");
                }
                if !part.is_empty() {
                    parts.push(part);
                }
            }
            parts
        })
        .collect();
    // The tables this statement names, after `FROM`, `JOIN`, `UPDATE` or
    // `INTO` (which ends `INSERT INTO`, `REPLACE INTO` and `INSERT OR
    // REPLACE INTO` alike), and any alias declared right after `owners`
    // there. Textual, like the rest of this check: it does not track a
    // subquery's own scope, only the word that follows a source keyword.
    let mut tables: BTreeSet<&str> = BTreeSet::new();
    let mut owners_aliases: BTreeSet<&str> = BTreeSet::new();
    const NOT_AN_ALIAS: &[&str] = &[
        "where", "on", "set", "values", "join", "order", "group", "limit", "as", "select", ",",
    ];
    for i in 0..tokens.len() {
        let names_a_table = matches!(tokens[i], "from" | "join" | "update" | "into");
        if !names_a_table {
            continue;
        }
        let Some(&table) = tokens.get(i + 1) else { continue };
        tables.insert(table);
        if table != "owners" {
            continue;
        }
        owners_aliases.insert(table);
        let next = tokens.get(i + 2).copied();
        let alias = if next == Some("as") {
            tokens.get(i + 3).copied()
        } else {
            next
        };
        if let Some(alias) = alias
            && !NOT_AN_ALIAS.contains(&alias)
        {
            owners_aliases.insert(alias);
        }
    }
    let only_owners = tables.len() == 1 && tables.contains("owners");
    let column = |t: &str| {
        let (qualifier, name) = match t.rsplit_once('.') {
            Some((q, n)) => (Some(q), n),
            None => (None, t),
        };
        if name == "owner_id" {
            return true;
        }
        if name != "id" {
            return false;
        }
        match qualifier {
            Some(q) => owners_aliases.contains(q),
            None => only_owners,
        }
    };
    let parameter = |t: &str| t.len() > 1 && t.starts_with('?') && t[1..].chars().all(|c| c.is_ascii_digit());
    tokens
        .windows(3)
        .any(|w| w[1] == "=" && ((column(w[0]) && parameter(w[2])) || (parameter(w[0]) && column(w[2]))))
}

/// Why `sql` does not filter by the owner, if it does not. A read of the
/// owner column counts as filtering by it, so `owner_id` is never read for
/// its value or its order: not returned, not in any select list, the
/// outer one or a subquery's (so not copied by an `INSERT … SELECT`
/// either: the owner comes from a parameter there), and not ordered,
/// grouped or partitioned by; and one owner column at least is compared
/// with a parameter. Rule 1 is per table and A1 per statement, so without
/// those, a second table whose owner column is only read to order it, or
/// returned by a subquery, passed beside another table's comparison
/// (3b-iii final review, I2). What this cannot see (3b-iii review, A4): a
/// filter that is wrong rather than missing (`OR`, `owner_id = owner_id`,
/// `owner_id <> ''`); `owners`' own `id` read for its value or its order
/// (`EXISTS (SELECT id FROM owners)`), since only `owner_id` is matched
/// there; `owner_id` later in an ordering expression than its first
/// keyword (`ORDER BY 1 AND owner_id`), since the ordering list ends at
/// `AND`, `OR` and the like. The second-owner tests are the other half.
fn problems(conn: &rusqlite::Connection, sql: &str) -> Vec<String> {
    let t = touched(conn, sql);
    let mut out = Vec::new();
    let tables: BTreeSet<&String> = t
        .read
        .keys()
        .chain(&t.changed)
        .filter(|table| names(sql, table))
        .filter(|table| !t.inserted.contains(*table) || t.changed.contains(*table) || selects_from(sql, table))
        .collect();
    for table in &tables {
        let read = t.read.get(*table).cloned().unwrap_or_default();
        if !read.contains(owner_column(table)) {
            out.push(format!("{table} is touched without reading {}", owner_column(table)));
        }
    }
    for table in &t.inserted {
        if !inserts_owner(sql, table) {
            out.push(format!("an INSERT INTO {table} names no owner_id"));
        }
    }
    if t.returned.iter().any(|c| c == "owner_id") {
        out.push("it returns owner_id: compare the column, do not read it back".into());
    }
    // The textual rules read the statement without its comments and the
    // text of its string literals (I1).
    let code = without_sql_comments(sql);
    // `SELECT` and `FROM` as whole words, in any case: a column such as
    // `from_seq` must not cut a select list short. An `INSERT`'s first list
    // is what it inserts.
    for (at, list) in select_lists(&code).into_iter().enumerate() {
        if !has_word(list, "owner_id") {
            continue;
        }
        if at == 0 && is_insert(&code) {
            out.push("its INSERT … SELECT copies owner_id: take it from a parameter".into());
        } else {
            out.push("a select list reads owner_id: compare the column, do not read it back".into());
        }
    }
    if orders_by_owner(&code) {
        out.push("it orders or groups by owner_id: compare the column instead".into());
    }
    let values_only = is_insert(&code) && !has_word(&code, "select");
    if !tables.is_empty() && !values_only && !compares_owner_with_a_parameter(sql) {
        out.push("no owner column is compared with a parameter".into());
    }
    out
}

#[test]
fn every_query_of_the_stores_filters_by_the_owner() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("hennery.db");
    Operator::open(&db).unwrap();
    Hosts::open(&db).unwrap();
    Store::open(&db).unwrap();
    GatewayStore::open(&db).unwrap();
    let conn = audit_connection(&db);
    let mut found = Vec::new();
    for (path, source, at_least) in SOURCES {
        let sql = statements(source);
        if sql.len() < *at_least {
            found.push(format!("{path}: {} statements, not {at_least}", sql.len()));
        }
        for statement in sql {
            for problem in problems(&conn, &statement) {
                found.push(format!("{path}: {problem}:\n    {statement}"));
            }
        }
    }
    assert!(found.is_empty(), "{}", found.join("\n"));
}

/// Every `*.rs` under `dir`, as paths relative to `root` with `/` between
/// their parts.
fn rust_files(root: &Path, dir: &Path, out: &mut Vec<String>) {
    let mut entries: Vec<_> = std::fs::read_dir(dir).unwrap().map(|e| e.unwrap().path()).collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            rust_files(root, &path, out);
        } else if path.extension().is_some_and(|e| e == "rs") {
            let parts: Vec<String> = path
                .strip_prefix(root)
                .unwrap()
                .components()
                .map(|c| c.as_os_str().to_string_lossy().into_owned())
                .collect();
            out.push(parts.join("/"));
        }
    }
}

/// 3b-iii review, A3: a file with SQL cannot escape the audit by not being
/// listed. Every `*.rs` under `crates/*/src` that holds a statement is in
/// `SOURCES` or `EXEMPT`, and every `EXEMPT` file still exists.
#[test]
fn every_file_with_sql_is_audited_or_exempt() {
    let crates = Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap();
    let listed: BTreeSet<&str> = SOURCES
        .iter()
        .map(|(path, ..)| *path)
        .chain(EXEMPT.iter().map(|(path, _)| *path))
        .collect();
    let mut files = Vec::new();
    let mut members: Vec<_> = std::fs::read_dir(crates).unwrap().map(|e| e.unwrap().path()).collect();
    members.sort();
    for member in members {
        let src = member.join("src");
        if src.is_dir() {
            rust_files(crates, &src, &mut files);
        }
    }
    assert!(files.len() > 20, "found only {files:?}");
    let mut found = Vec::new();
    for path in &files {
        let source = std::fs::read_to_string(crates.join(path)).unwrap();
        let holds_sql = string_literals(without_tests(&source)).iter().any(|lit| is_sql(lit));
        if holds_sql && !listed.contains(path.as_str()) {
            found.push(format!(
                "{path} holds SQL: add it to SOURCES, or to EXEMPT with a reason"
            ));
        }
    }
    for (path, _) in EXEMPT {
        if !crates.join(path).is_file() {
            found.push(format!("{path} is in EXEMPT but no longer exists"));
        }
    }
    assert!(found.is_empty(), "{}", found.join("\n"));
}

/// The audit itself: a statement without the owner is caught, whichever
/// way it touches a table, and one with it passes.
#[test]
fn the_audit_catches_a_query_without_the_owner() {
    let dir = tempfile::tempdir().unwrap();
    let db = dir.path().join("hennery.db");
    Store::open(&db).unwrap();
    let conn = audit_connection(&db);
    for bad in [
        "SELECT phc FROM password_credentials LIMIT 1",
        "SELECT count(*) FROM auth_sessions",
        "DELETE FROM auth_sessions WHERE expires_at <= ?1",
        "UPDATE auth_sessions SET last_step_up_at = ?2 WHERE id_hash = ?1",
        "SELECT 1 FROM owners WHERE id = ?1 AND EXISTS (SELECT 1 FROM auth_sessions WHERE id_hash = ?2)",
        "INSERT INTO settings(key, value) VALUES (?1, ?2)",
        "SELECT set_up_at FROM owners LIMIT 1",
        "SELECT owner_id FROM auth_sessions WHERE id_hash = ?1",
        "INSERT INTO session_catalog(session_id, config_options, updated_at, owner_id) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(session_id) DO UPDATE SET config_options = excluded.config_options",
        "INSERT INTO events(session_id, kind, body, ts, owner_id)
         SELECT ?1, ?2, ?3, ?4, ?5 WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ?1)",
        "SELECT q.answer FROM answer_queue q JOIN sessions s ON s.id = q.session_id AND s.owner_id = q.owner_id
         WHERE s.host_id = ?1",
        "INSERT INTO events(session_id, kind, body, ts, owner_id)
         SELECT session_id, kind, body, ts, ?1 FROM events WHERE event_id = ?2",
        "INSERT INTO auth_sessions(id_hash, owner_id, user_agent, created_at, last_seen_at, expires_at)
         SELECT ?1, owner_id, 'x', 0, 0, 0 FROM password_credentials WHERE phc = ?2",
        "SELECT s.user_agent FROM auth_sessions s JOIN password_credentials c ON c.owner_id = s.owner_id
         WHERE s.id_hash = ?1",
        // 3b-iii review I1 / ED3: `owners` appearing anywhere in the
        // statement used to make any `id`, however unrelated, count as the
        // owner comparison. Here `p` is a derived table drawing from
        // `owners.id`, not an alias of `owners` itself, and the only real
        // comparison (`ps.owner_id = p.id`) does not involve a parameter.
        "SELECT ps.phc FROM password_credentials ps, (SELECT id FROM owners WHERE set_up_at IS NOT NULL) p
         WHERE ps.owner_id = p.id AND p.id = ?1",
        // 3b-iii review M2: a comment cannot stand in for a real
        // comparison. `owner_id` is read (so rule 1 passes), but the only
        // `= ?N` naming it is commented out.
        "SELECT phc FROM password_credentials WHERE owner_id IS NOT NULL -- owner_id = ?1",
        // 3b-iii Task 4, ED3: the same gap as above, now that `hosts` also
        // has an `owner_id`. `owners` is named, but only in an unconnected
        // subquery; the real filter, `hosts.id = ?1`, is not an owner
        // comparison at all.
        "SELECT name FROM hosts WHERE id = ?1 AND owner_id IN (SELECT id FROM owners)",
        // 3b-iii Task 4, ED3 re-review N1 / ED6: a comma join. The alias
        // scan must not take `hosts`, the next table name after the comma,
        // for an alias of `owners`: `hosts.id = ?1` is not an owner
        // comparison, even though `hosts.owner_id = owners.id` (two owner
        // columns compared to each other, not to a parameter, A1) is
        // right next to it.
        "SELECT name FROM owners, hosts WHERE hosts.owner_id = owners.id AND hosts.id = ?1",
        // 3b-iii final review I1: ED3's hosts case again, with a comment's
        // opening inside a string literal. Stripped as a comment, `--`
        // took `FROM hosts` with it, and `/*` everything up to a real
        // `*/`: `owners`, from the subquery, was then the only table left.
        "SELECT name, '--' FROM hosts
         WHERE id = ?1 AND owner_id IN (SELECT id FROM owners)",
        "SELECT name, '/*' FROM hosts /**/ WHERE id = ?1 AND owner_id IN (SELECT id FROM owners)",
        // The same class: a literal's text read as the statement's own.
        // Here it declared `h` an alias of `owners`, so `hosts`' own
        // `h.id = ?1` counted as the owner comparison.
        "SELECT name, ' from owners h ' FROM hosts h WHERE h.id = ?1 AND owner_id IN (SELECT id FROM owners)",
        // 3b-iii final review I2: a second table's owner column read only
        // to order or group it, or returned by a subquery's select list,
        // while another table carries the comparison with a parameter.
        // `auth_sessions`, `sessions` and `turns` are filtered by nothing.
        "SELECT phc FROM password_credentials
         WHERE owner_id = ?1 AND EXISTS (SELECT 1 FROM auth_sessions WHERE id_hash = ?2 ORDER BY owner_id)",
        "SELECT phc FROM password_credentials
         WHERE owner_id = ?1 AND EXISTS (SELECT 1 FROM auth_sessions WHERE id_hash = ?2 GROUP BY owner_id)",
        "SELECT q.answer FROM answer_queue q JOIN sessions s ON s.id = q.session_id
         WHERE q.owner_id = ?1 ORDER BY s.owner_id",
        "SELECT body FROM events WHERE owner_id = ?1
         AND session_id IN (SELECT id FROM sessions WHERE owner_id IN (SELECT owner_id FROM turns WHERE turn_id = ?2))",
        // Every select list is read now, the outer one too: the owner
        // column under an alias, or as an expression, beside another
        // comparison (A4's two select-list cases until then).
        "SELECT phc, owner_id AS o FROM password_credentials WHERE owner_id = ?1",
        "SELECT q.answer, s.owner_id = ?2 FROM answer_queue q JOIN sessions s ON s.id = q.session_id
         WHERE q.owner_id = ?1",
        // ED4 (3b-iii Task 3 review M3): SQL is case-insensitive, and so is
        // every rule that reads the statement's text. The authorizer names
        // tables as the schema does (`events`), whatever case the statement
        // wrote them in.
        "SELECT body FROM EVENTS WHERE event_id = ?1",
        // ED3's hosts case with its outer keywords in lowercase: the A1
        // rule must not miss `from hosts`, take `owners` (named only in the
        // subquery) for the statement's only table, and so count `hosts`'
        // own `id = ?1` as the owner comparison.
        "select name from hosts where id = ?1 and owner_id in (SELECT id FROM owners)",
        "insert into events(session_id, kind, body, ts, owner_id)
         select session_id, kind, body, ts, ?1 from events where event_id = ?2",
        "insert into events(session_id, kind, body, ts, owner_id)
         select session_id, kind, body, ts, owner_id from events where event_id = ?1 and owner_id = ?2",
        "INSERT INTO events(session_id, kind, body, ts, owner_id)
         select ?1, ?2, ?3, ?4, ?5 where exists (select 1 from sessions where id = ?1 and owner_id = owner_id)",
        // M1 (Task 5 review): `SELECT` and `FROM` are whole words. A select
        // list with `from_seq` in it still copies `owner_id`.
        "INSERT INTO events(session_id, kind, body, ts, owner_id)
         SELECT session_id AS from_seq, kind, body, ts, owner_id FROM events WHERE event_id = ?1 AND owner_id = ?2",
        // ED4: `REPLACE` inserts.
        "REPLACE INTO session_catalog(session_id, config_options, updated_at) VALUES (?1, ?2, ?3)",
        "INSERT OR REPLACE INTO session_catalog(session_id, config_options, updated_at) VALUES (?1, ?2, ?3)",
    ] {
        assert!(!problems(&conn, bad).is_empty(), "passed: {bad}");
    }
    for good in [
        "SELECT phc FROM password_credentials WHERE owner_id = ?1",
        "DELETE FROM auth_sessions WHERE expires_at <= ?1 AND owner_id = ?2",
        "INSERT INTO settings(owner_id, key, value) VALUES (?1, ?2, ?3)
         ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value",
        "SELECT set_up_at FROM owners WHERE id = ?1",
        "UPDATE owners SET set_up_at = ?2 WHERE id = ?1 AND set_up_at IS NULL",
        "SELECT phc FROM password_credentials WHERE ?1 = owner_id",
        "SELECT s.user_agent FROM auth_sessions s JOIN password_credentials c ON c.owner_id = s.owner_id
         WHERE s.id_hash = ?1 AND s.owner_id = ?2",
        "INSERT INTO turns(turn_id, session_id, content, created_at, owner_id) VALUES (?1, ?2, ?3, ?4, ?5)",
        "INSERT INTO events(session_id, host_seq, kind, body, ts, owner_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(session_id, host_seq) DO NOTHING",
        "INSERT INTO session_catalog(session_id, config_options, updated_at, owner_id) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(session_id) DO UPDATE SET config_options = excluded.config_options
             WHERE session_catalog.owner_id = excluded.owner_id",
        "INSERT INTO auth_sessions(id_hash, owner_id, user_agent, created_at, last_seen_at, expires_at)
         SELECT ?1, ?2, 'x', 0, 0, 0 FROM password_credentials WHERE owner_id = ?2 AND phc = ?3",
        "SELECT 1",
        "select body from events where event_id = ?1 and owner_id = ?2",
        "select set_up_at from Owners o where O.ID = ?1",
        "REPLACE INTO session_catalog(session_id, config_options, updated_at, owner_id) VALUES (?1, ?2, ?3, ?4)",
        "INSERT OR REPLACE INTO session_catalog(session_id, config_options, updated_at, owner_id)
         VALUES (?1, ?2, ?3, ?4)",
    ] {
        assert_eq!(problems(&conn, good), Vec::<String>::new(), "{good}");
    }
    // ED4: a statement is found whatever the case of its verb, `REPLACE`
    // among them; a literal that is only the word is not one (`"update"`,
    // `"select"`: JSON keys and values in the host's and testkit's code).
    for sql in [
        "select 1",
        "Insert INTO t(a) VALUES (1)",
        "update t SET a = 1",
        "delete FROM t",
        "with x AS (SELECT 1) SELECT * FROM x",
        "REPLACE INTO t(a) VALUES (1)",
        "replace into t(a) values (1)",
        "SELECT ",
        "DELETE",
    ] {
        assert!(is_sql(sql), "not SQL: {sql}");
    }
    for not_sql in ["update", "select", "selected rows", "Without it", "replaced by"] {
        assert!(!is_sql(not_sql), "SQL: {not_sql}");
    }
    let literals = string_literals("// \"no\"\nlet a = 'x'; let b = '\"'; f::<'a>(\"one\", r#\"two \"q\"\"#);");
    assert_eq!(literals, ["one", "two \"q\""]);
    // I1: a string literal's text is emptied, `''` and all; a quoted name
    // is kept; a comment's opening opens nothing inside either.
    assert_eq!(
        without_sql_comments("SELECT 'it''s -- x', \"a--b\", [c/*d] -- e\nFROM t /* f */"),
        "SELECT '', \"a--b\", [c/*d] \nFROM t "
    );
    // N1 (final re-review): the double-quoted twin of the literal-alias case
    // does not prepare on the audit's connection, so it fails the audit
    // (`touched` panics); with SQLite's default it was a string, and passed.
    // A double-quoted name still prepares.
    let double_quoted = "SELECT name, \" from owners h \" FROM hosts h
         WHERE h.id = ?1 AND owner_id IN (SELECT id FROM owners)";
    assert!(conn.prepare(double_quoted).is_err(), "prepared: {double_quoted}");
    assert!(conn.prepare("SELECT \"name\" FROM \"hosts\"").is_ok());
}
```

### Verification commands

```sh
nix develop -c cargo run -p hennery-proto --bin gen --locked
nix develop -c cargo test -p hennery-kernel --lib session_defaults --locked
nix develop -c cargo test -p hennery-testkit --test session_defaults --test capabilities --test owner_filter --locked
```

Expected: 4 storage, 3 HTTP, 1 capabilities and 3 audit tests pass. Removal
probes cover revision, freeze, live step-up/expiry, every new owner-read
access, persistence, validation, body bounds, cache privacy and route-level
step-up before extraction. Protocol generation adds the two new DTOs.

## Task 2: Catalog resolution, Defaults and launcher


### File: `web/src/api/defaults.ts`

```typescript
import type { Client } from './client'
import type { HatSessionDefaults, PutHatSessionDefaults } from '../generated/protocol'
const path = (hat: string, agent: string) => `/api/hats/${encodeURIComponent(hat)}/session-defaults?${new URLSearchParams({ agent })}`
export function sessionDefaults(client: Client, hat: string, agent: string, signal?: AbortSignal): Promise<HatSessionDefaults> {
  return client.request('GET', path(hat, agent), undefined, { signal })
}
export function putSessionDefaults(client: Client, hat: string, agent: string, value: PutHatSessionDefaults): Promise<HatSessionDefaults> {
  return client.request('PUT', path(hat, agent), value)
}
```

### File: `web/src/lib/catalog.ts`

```typescript
// A session's catalogue, read defensively (ACP core §7, §9). The collector
// stores the adapter's ACP objects as they came (`SessionConfigOption`,
// `AvailableCommand`) and never reads them, so here they are `unknown`: an
// entry that does not have the shape is skipped, never a crash.
//
// The shapes read (agent-client-protocol, as serialized):
// - a select: `{id, name, description?, category?, type: "select",
//   currentValue: string, options}`, where `options` is a flat list of
//   `{value, name, description?}` or a list of groups `{group, name, options}`;
// - a boolean: `{id, name, description?, category?, type: "boolean",
//   currentValue: boolean}`;
// - a command: `{name, description?, input?: {hint}}`.
import type { SessionCatalog } from '../generated/protocol'

export interface Choice {
  value: string
  name: string
  description?: string
  /** The name of the group it is listed under, if the adapter grouped them. */
  group?: string
}

interface OptionBase {
  id: string
  name: string
  description?: string
  category?: string
}

export type ConfigOption =
  | (OptionBase & { kind: 'select'; current: string; choices: Choice[] })
  | (OptionBase & { kind: 'boolean'; current: boolean })

export interface Command {
  name: string
  description?: string
  /** What the command takes after its name, as the adapter hints it. */
  hint?: string
}

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function choice(value: unknown, group?: string): Choice | null {
  if (!isObj(value) || typeof value.value !== 'string') return null
  return {
    value: value.value,
    name: str(value.name) || value.value,
    description: str(value.description),
    ...(group === undefined ? {} : { group }),
  }
}

function choices(list: unknown): Choice[] {
  if (!Array.isArray(list)) return []
  const out: Choice[] = []
  for (const entry of list) {
    if (isObj(entry) && Array.isArray(entry.options)) {
      const group = str(entry.name) || str(entry.group) || ''
      for (const inner of entry.options) {
        const c = choice(inner, group)
        if (c) out.push(c)
      }
    } else {
      const c = choice(entry)
      if (c) out.push(c)
    }
  }
  return out
}

/** One config option, or null when it is not one this build can show. */
export function parseOption(value: unknown): ConfigOption | null {
  if (!isObj(value) || typeof value.id !== 'string' || value.id === '') return null
  const base: OptionBase = {
    id: value.id,
    name: str(value.name) || value.id,
    description: str(value.description),
    category: str(value.category),
  }
  if (value.type === 'boolean' && typeof value.currentValue === 'boolean') {
    return { ...base, kind: 'boolean', current: value.currentValue }
  }
  if (value.type === 'select' && typeof value.currentValue === 'string') {
    const list = choices(value.options)
    // A select with nothing to pick is noise; adapters do report empty ones.
    if (list.length === 0) return null
    return { ...base, kind: 'select', current: value.currentValue, choices: list }
  }
  return null
}

/** The option that plays `category`'s part, as the host decides it: the
 *  first of that category, else one with the conventional id that no other
 *  category claims (no category, or a custom `_`-prefixed one). */
function axis(options: ConfigOption[], category: string): ConfigOption | undefined {
  const uncategorized = (o: ConfigOption) => o.category === undefined || o.category.startsWith('_')
  return options.find((o) => o.category === category) ?? options.find((o) => uncategorized(o) && o.id === category)
}

/** The switchers to show: the model, the mode, then every other option by
 *  id. The order is stable whatever order the adapter reports them in. */
export function configOptions(catalog: SessionCatalog | null | undefined): ConfigOption[] {
  const raw = Array.isArray(catalog?.config_options) ? catalog.config_options : []
  const seen = new Set<string>()
  const options: ConfigOption[] = []
  for (const entry of raw) {
    const option = parseOption(entry)
    if (option && !seen.has(option.id)) {
      seen.add(option.id)
      options.push(option)
    }
  }
  const model = axis(options, 'model')
  const mode = axis(options, 'mode')
  const rest = options
    .filter((o) => o !== model && o !== mode)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return [...(model ? [model] : []), ...(mode && mode !== model ? [mode] : []), ...rest]
}

/** The slash commands, each name once, in the adapter's order. */
export function commands(catalog: SessionCatalog | null | undefined): Command[] {
  const raw = Array.isArray(catalog?.commands) ? catalog.commands : []
  const seen = new Set<string>()
  const out: Command[] = []
  for (const entry of raw) {
    if (!isObj(entry) || typeof entry.name !== 'string' || entry.name === '' || seen.has(entry.name)) continue
    seen.add(entry.name)
    out.push({
      name: entry.name,
      description: str(entry.description),
      hint: isObj(entry.input) ? str(entry.input.hint) : undefined,
    })
  }
  return out
}

/** The commands a `/query` lists: names that start with it first, then
 *  names that contain it, each in the adapter's order. */
export function matchCommands(list: Command[], query: string): Command[] {
  const q = query.toLowerCase()
  const starts = list.filter((c) => c.name.toLowerCase().startsWith(q))
  const contains = list.filter((c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q))
  return [...starts, ...contains]
}

/** Stable wire destinations, following the same category/id rules as the host. */
export function catalogFields(options: ConfigOption[]): { key: string; option: ConfigOption }[] {
  const model = axis(options, 'model'), mode = axis(options, 'mode')
  return options.flatMap(option => {
    const role = option === model ? 'model' : option === mode ? 'mode' : 'axis'
    if (role !== 'axis' && option.kind !== 'select') return []
    if (role === 'axis' && (option.id === 'model' || option.id === 'mode')) return []
    return [{ key: role === 'axis' ? option.id : role, option }]
  })
}
```

### File: `web/src/lib/defaults.ts`

```typescript
import type { ConfigValue, ExecutionPolicy, HostCatalog, SessionConfig } from '../generated/protocol'
import { catalogFields, configOptions, type ConfigOption } from './catalog'

export type Picks = Record<string, ConfigValue | null>
export type Source = 'Agent default' | 'Hat override' | 'Your choice'
export interface ResolvedDefaults {
  config: SessionConfig
  sources: Record<string, Source>
  notices: string[]
  blocked: boolean
  warnings: string[]
}
export function fieldsOf(catalog: HostCatalog | null) {
  return catalogFields(configOptions(catalog ? { session_id: '', commands: [], config_options: catalog.config_options } : null))
}
export function flatConfig(config: SessionConfig): Record<string, ConfigValue> {
  return { ...(config.axes ?? {}), ...(config.model == null ? {} : { model: config.model }), ...(config.mode == null ? {} : { mode: config.mode }) }
}
export function sparseConfig(flat: Record<string, ConfigValue>): SessionConfig {
  const { model, mode, ...axes } = flat
  return { ...(typeof model === 'string' ? { model } : {}), ...(typeof mode === 'string' ? { mode } : {}), ...(Object.keys(axes).length ? { axes } : {}) }
}
export function supports(option: ConfigOption, value: ConfigValue): boolean {
  return option.kind === 'boolean' ? typeof value === 'boolean' : typeof value === 'string' && option.choices.some(choice => choice.value === value)
}
export function usableCatalog(catalog: HostCatalog | null): catalog is HostCatalog {
  if (catalog === null || catalog.freshness !== 'fresh' || catalog.adapter_revision === '') return false
  const fields = fieldsOf(catalog), defaults = flatConfig(catalog.defaults)
  const required = new Set([...Object.keys(catalog.security.axes), ...['model', 'mode'].filter(key => Object.hasOwn(defaults, key))])
  return fields.length > 0 && [...required].every(key => {
    const option = fields.find(field => field.key === key)?.option
    return Object.hasOwn(defaults, key) && option !== undefined && supports(option, defaults[key]) && option.current === defaults[key]
  })
}
export function securityWarnings(catalog: HostCatalog, config: SessionConfig): string[] {
  if (!catalog.security.known) return ['This agent’s permission baseline is unknown. Review its access before saving or starting.']
  const flat = flatConfig(config)
  return Object.entries(catalog.security.axes).filter(([key, allowed]) => Object.hasOwn(flat, key) && !allowed.includes(flat[key])).map(([key]) =>
    `${fieldsOf(catalog).find(f => f.key === key)?.option.name ?? key} is outside the agent’s permission baseline. The agent may act with fewer prompts.`)
}
/** Only inherited, nonsecurity probe axes are pruned on a model change. */
export function resolveDefaults(catalog: HostCatalog, stored: SessionConfig, picks: Picks = {}, policy?: ExecutionPolicy): ResolvedDefaults {
  const fields = fieldsOf(catalog), offered = new Map(fields.map(field => [field.key, field.option]))
  const baseline = flatConfig(catalog.defaults), saved = flatConfig(stored)
  const flat: Record<string, ConfigValue> = Object.create(null), sources: Record<string, Source> = Object.create(null), notices: string[] = []
  let blocked = false
  const security = new Set(['mode', ...Object.keys(catalog.security.axes), ...Object.keys(policy?.allowed[catalog.agent] ?? {})])
  for (const [key, value] of Object.entries(baseline)) {
    const option = offered.get(key)
    if (option && supports(option, value)) { flat[key] = value; sources[key] = 'Agent default' }
    else {
      notices.push(`The agent default for ${key} cannot be represented by this catalog. Review this setting before starting.`)
      if (security.has(key)) blocked = true
    }
  }
  // Model is resolved first, independently of catalog ordering.
  const keys = [...new Set(['model', ...Object.keys(saved), ...Object.keys(picks)])]
  const overlay = (key: string) => {
    const explicit = Object.hasOwn(picks, key), value = explicit ? picks[key] : saved[key]
    if (value === undefined || value === null) return
    const option = offered.get(key)
    if (!option || !supports(option, value)) {
      notices.push(`${explicit ? 'Chosen' : 'Saved'} ${option?.name ?? key} “${String(value)}” is unavailable on this host; ${explicit ? 'choose another value before starting.' : `using ${String(flat[key] ?? 'the agent default')}.`}`)
      if (explicit) blocked = true
      return
    }
    flat[key] = value
    sources[key] = explicit ? 'Your choice' : 'Hat override'
  }
  overlay('model')
  if (flat.model !== baseline.model) {
    for (const key of Object.keys(catalog.defaults.axes ?? {})) {
      if (!security.has(key)) { delete flat[key]; delete sources[key] }
    }
  }
  for (const key of keys) if (key !== 'model') overlay(key)
  const config = sparseConfig(flat)
  return { config, sources, notices, blocked, warnings: securityWarnings(catalog, config) }
}
/** Use adapter display labels in the UI; exact ids remain in requests. */
export function valueLabel(catalog: HostCatalog | null, key: string, value: ConfigValue | undefined): string {
  if (value === undefined) return 'Agent default'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  const option = fieldsOf(catalog).find(field => field.key === key)?.option
  return option?.kind === 'select' ? option.choices.find(choice => choice.value === value)?.name ?? value : value
}
```

### File: `web/src/lib/start.ts`

```typescript
// Starting a session (frontend spec §7, ACP core §9 `POST /api/sessions`):
// what a refused start says, and how the New Session screen hands the
// session view a notice about a start or a first prompt that did not
// fully go through; and the `/new?host=…&cwd=…` link that opens New Session
// on a project (a failed session's "Start a new session in this project").
import { fieldsOf, flatConfig, supports, valueLabel } from "./defaults"
import { catalogFields, configOptions } from "./catalog"
import { ApiFailure, messageOf } from '../api/errors'

/** A refused `POST /api/sessions`, in words. Nothing was started, except
 *  for a 503 `delivery_unknown` with a `session_id`, which the caller
 *  handles before this. */
export function startRefusal(err: unknown): string {
  if (!(err instanceof ApiFailure)) return messageOf(err)
  switch (err.code) {
    case 'hat_ambiguous':
      return `${err.message} (${err.serverMessage})`
    case 'host_offline':
      // The server's words: on a host that never connected they say that
      // its first start installs its agents first.
      return err.serverMessage
    case 'invalid_cwd':
      // The server's words name the path: `"<path>" is not a directory on that host`.
      return err.serverMessage
    case 'unknown_host':
      return 'That host is no longer paired. Pick another host.'
    case 'delivery_unknown':
      return 'The host went away while the session was starting; its outcome is not known.'
  }
  if (err.status === 502) return `The host refused to start the session (${err.code}): ${err.serverMessage}`
  return err.message
}

/** Why the session view opens with a notice:
 *  - `start_unknown`: the start's delivery is unknown (503 with
 *    `session_id`); the session exists and may still start; `kept`: a first
 *    prompt was typed, and waits as the session's draft;
 *  - `prompt_failed`: the session started, but the first prompt was
 *    refused (its code travels as `code`). */
export type StartNotice = { kind: 'start_unknown'; kept: boolean } | { kind: 'prompt_failed'; code: string; message: string }

/** `/sessions/<id>`, with the notice as a query flag.
 *
 *  The flag is a query string, not history state, so it needs nothing
 *  from the router: `?notice=start_unknown` (`start_unknown_draft` when a
 *  first prompt was kept), or `?notice=prompt_failed&code=<code>`. The session view reads it with
 *  `readStartNotice(search)` and then drops it with
 *  `navigate(pathname, {replace: true})`, so a reload does not show it
 *  again. Only a code travels, never a server's message: the reader
 *  words it. */
export function sessionHref(
  id: string,
  notice?: { kind: 'start_unknown'; kept: boolean } | { kind: 'prompt_failed'; code: string },
): string {
  const path = `/sessions/${encodeURIComponent(id)}`
  if (!notice) return path
  const query = new URLSearchParams({ notice: notice.kind === 'start_unknown' && notice.kept ? 'start_unknown_draft' : notice.kind })
  if (notice.kind === 'prompt_failed') query.set('code', notice.code)
  return `${path}?${query.toString()}`
}

/** What a refused first prompt says, by its code. */
const PROMPT_REFUSED: Record<string, string> = {
  start_unconfirmed: "The session could not be confirmed as running. Review it before sending the first prompt.",
  config_unconfirmed: "The requested session settings could not be confirmed. Review the settings before sending the first prompt.",
  hat_changed: "The session started in a different hat. Review it before sending the first prompt.",
  host_offline: 'The host went offline before the first prompt reached it; send it again once it is back.',
  not_attached: 'The session was no longer running when the first prompt arrived; resume it and send it again.',
  turn_in_progress: 'A turn was already running; send the first prompt again once it ends.',
  delivery_unknown: 'Delivery of the first prompt is unknown: the outcome shows when the host reconnects.',
  content_too_large: 'The first prompt was too large to send.',
  body_too_large: 'The first prompt was too large to send.',
  empty_prompt: 'The first prompt was empty.',
}

/** What an error code looks like. */
const CODE = /^[a-z0-9_]{1,64}$/

/** The notice `search` (a `?…` query) carries, if any. */
export function readStartNotice(search: string, sessionId = currentSessionId()): StartNotice | null {
  const query = new URLSearchParams(search)
  const kind = query.get('notice')
  if (kind === 'start_unknown') return { kind, kept: false }
  if (kind === 'start_unknown_draft') return { kind: 'start_unknown', kept: true }
  if (kind === 'prompt_failed') {
    // A link is anyone's to write: only a code's shape is shown, never
    // free text, and only the table's own keys pick a wording.
    const given = query.get('code') ?? ''
    const code = CODE.test(given) ? given : 'unknown'
    const message = (code === 'config_unconfirmed' ? configurationReview(sessionId) : undefined)
      ?? (Object.hasOwn(PROMPT_REFUSED, code) ? PROMPT_REFUSED[code] : `The first prompt was not sent (${code}).`)
    return { kind, code, message }
  }
  return null
}

// Keep requested settings visible on the canonical session without putting
// adapter labels or values into its URL. Sign-out clears the draft namespace.
const REVIEW_PREFIX = 'hennery.draft.__launch_review__.'
function currentSessionId(): string {
  try { return decodeURIComponent(/^\/sessions\/([^/]+)$/.exec(location.pathname)?.[1] ?? '') } catch { return '' }
}
function configurationReview(id: string): string | undefined {
  try {
    const message = sessionStorage.getItem(REVIEW_PREFIX + id)
    return message && message.length <= 2048 ? message : undefined
  } catch { return undefined }
}
export function rememberConfigurationReview(id: string, catalog: import('../generated/protocol').HostCatalog | null, requested: import('../generated/protocol').SessionConfig): void {
  const fields = new Map(fieldsOf(catalog).map(field => [field.key, field.option.name]))
  const parts = Object.entries(flatConfig(requested)).map(([key, value]) => `${fields.get(key) ?? key}: ${valueLabel(catalog, key, value)}`)
  if (!parts.length) return
  const message = `The requested session settings could not be confirmed. Requested: ${parts.join(' · ')}. Review the settings before sending the first prompt.`
  try { sessionStorage.setItem(REVIEW_PREFIX + id, message.slice(0, 2048)) } catch { /* The generic review notice remains. */ }
}

/** A notice in words, for the session view. */
export function startNoticeText(notice: StartNotice): string {
  if (notice.kind === 'start_unknown') {
    const started = 'The host went away while this session was starting: it may still start, and shows here when the host reconnects.'
    return notice.kept ? `${started} A first prompt was not sent: it waits as this session’s draft.` : started
  }
  return `${notice.message} It waits as this session’s draft.`
}

/** `/new?host=<host>&cwd=<cwd>`: New Session with the host and the project
 *  filled in. Both are encoded; `readNewSessionPrefill` reads them back. */
export function newSessionHref(host: string, cwd: string): string {
  return `/new?${new URLSearchParams({ host, cwd }).toString()}`
}

/** The host and the project a `/new` link names (`newSessionHref`). */
export function readNewSessionPrefill(search: string): { host?: string; cwd?: string } {
  const query = new URLSearchParams(search)
  return { host: query.get('host') ?? undefined, cwd: query.get('cwd') ?? undefined }
}

/** Read-back of a newly created session, bounded independently of API latency.
 * Missing evidence is never confirmation, even for an empty request. */
export async function confirmStart(
  client: import('../api/client').Client,
  id: string,
  hat: string,
  requested: import('../generated/protocol').SessionConfig,
  timeoutMs = 30_000,
  verifyConfig = true,
): Promise<'confirmed' | 'hat_changed' | 'config_unconfirmed'> {
  const deadline = Date.now() + timeoutMs
  const path = `/api/sessions/${encodeURIComponent(id)}`
  const expected = flatConfig(requested)
  do {
    const left = deadline - Date.now()
    if (left <= 0) break
    try {
      const detail = await client.request<import('../generated/protocol').SessionDetail>('GET', path, undefined, { timeoutMs: left })
      if (detail.hat_id !== hat) return 'hat_changed'
      if (detail.failure_reason || ['failed', 'closed', 'parked'].includes(detail.lifecycle)) return 'config_unconfirmed'
      if (detail.lifecycle === 'active') {
        if (!verifyConfig) return 'confirmed'
        const catalog = await client.request<import('../generated/protocol').SessionCatalog>('GET', `${path}/catalog`, undefined, { timeoutMs: Math.max(1, deadline - Date.now()) })
        if (catalog.config_options.length > 0) {
          const actual = flatConfig(catalog)
          const offered = new Map(catalogFields(configOptions(catalog)).map(field => [field.key, field.option]))
          if (!Object.entries(expected).every(([key, value]) => { const option = offered.get(key); return Object.hasOwn(actual, key) && actual[key] === value && option !== undefined && supports(option, value) && option.current === value })) return 'config_unconfirmed'
          const page = await client.request<import('../generated/view').ItemPage>('GET', `/api/view/sessions/${encodeURIComponent(id)}?limit=1`, undefined, { timeoutMs: Math.max(1, deadline - Date.now()) })
          if (page.items.some(item => item.kind === 'marker' && item.marker === 'host_note' && item.reason === 'config_failed')) return 'config_unconfirmed'
          return 'confirmed'
        }
      }
    } catch { return 'config_unconfirmed' }
    await new Promise(resolve => setTimeout(resolve, Math.min(200, Math.max(0, deadline - Date.now()))))
  } while (Date.now() < deadline)
  return 'config_unconfirmed'
}
```

### File: `web/src/components/CatalogContext.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useClient } from '../app-client'
import { executionPolicy, runtimeCatalog } from '../api/delegation'
import { sessionDefaults } from '../api/defaults'
import { messageOf } from '../api/errors'
import type { ExecutionPolicy, HatSessionDefaults, HostCatalog, HostItem } from '../generated/protocol'
import { usableCatalog } from '../lib/defaults'

export interface LaunchContext {
  key: string
  state: 'loading' | 'ready' | 'unavailable'
  catalog: HostCatalog | null
  defaults: HatSessionDefaults | null
  policy?: ExecutionPolicy
  error?: string
}
/** Each response belongs to the whole canonical context, never the last probe. */
export function useLaunchContext(host: string, agent: string, cwd: string, hat: string, generation = 0): LaunchContext {
  const client = useClient(), key = JSON.stringify([host, agent, cwd, hat, generation])
  // A → B → A is a new read, even when B never finished loading.
  const request = useMemo(() => ({}), [key])
  const [result, setResult] = useState<(LaunchContext & { request: object }) | null>(null)
  useEffect(() => {
    if (!host || !agent || !cwd || !hat) return
    const abort = new AbortController()
    let live = true
    Promise.all([runtimeCatalog(client, host, agent, cwd, abort.signal), sessionDefaults(client, hat, agent, abort.signal), executionPolicy(client, hat)]).then(
      ([catalog, defaults, policy]) => { if (live) setResult({ key, request, state: usableCatalog(catalog) ? 'ready' : 'unavailable', catalog, defaults, policy, ...(!usableCatalog(catalog) ? { error: 'This host did not provide a fresh, complete settings preview. Retry or deliberately use agent defaults for this start.' } : {}) }) },
      err => { if (live) setResult({ key, request, state: 'unavailable', catalog: null, defaults: null, error: messageOf(err) }) },
    )
    return () => { live = false; abort.abort() }
  }, [client, host, agent, cwd, hat, key, request])
  return result?.request === request ? result : { key, state: 'loading', catalog: null, defaults: null }
}
export default function CatalogContext({ hosts, host, cwd, onHost, onCwd, onPreview, busy }: {
  hosts: HostItem[]; host: string; cwd: string; onHost: (value: string) => void; onCwd: (value: string) => void; onPreview: () => void; busy: boolean
}) {
  return <section className="catalog-context" aria-label="Settings preview context"><div><h2>Preview on a host</h2><p className="hint">Agent defaults are read-only. A hat’s saved choices can differ on another host.</p></div>
    <label>Host<select value={host} onChange={e => onHost(e.target.value)}><option value="">Choose a host</option>{hosts.map(h => <option key={h.host_id} value={h.host_id} disabled={!h.connected}>{h.name}{!h.connected ? ' · offline' : ''}</option>)}</select></label>
    <label>Project path<input value={cwd} onChange={e => onCwd(e.target.value)} placeholder="Absolute project path" /></label>
    <button className="btn btn-secondary" type="button" disabled={busy || !host || !cwd.trim()} onClick={onPreview}>{busy ? 'Loading preview…' : 'Preview settings'}</button>
  </section>
}
```

### File: `web/src/components/DefaultsEditor.tsx`

```tsx
import { useState } from 'react'
import { useClient } from '../app-client'
import { putSessionDefaults } from '../api/defaults'
import { ApiFailure } from '../api/errors'
import type { HatItem, HatSessionDefaults, HostCatalog, ExecutionPolicy } from '../generated/protocol'
import { fieldsOf, flatConfig, resolveDefaults, securityWarnings, sparseConfig, usableCatalog, supports, valueLabel } from '../lib/defaults'
import { useAccentStyle } from '../lib/theme'
import ConfirmDialog from './ConfirmDialog'
import { ConfigControl } from './LaunchConfig'

export default function DefaultsEditor({ hat, record, catalog, policy, onSaved, onReload }: {
  hat: HatItem; record: HatSessionDefaults; catalog: HostCatalog | null; policy?: ExecutionPolicy; onSaved: (record: HatSessionDefaults) => void; onReload: () => void
}) {
  const client = useClient(), [base, setBase] = useState(record), [edits, setEdits] = useState(record.config), [confirm, setConfirm] = useState(false)
  const [conflict, setConflict] = useState(false), [saved, setSaved] = useState(false)
  const accent = useAccentStyle(hat.colour), flat = flatConfig(edits)
  const fields = fieldsOf(catalog), known = new Map(fields.map(f => [f.key, f.option]))
  const keys = [...new Set([...fields.map(f => f.key), ...Object.keys(flat)])]
  const preview = catalog ? resolveDefaults(catalog, edits, {}, policy) : null
  const effective = flatConfig(preview?.config ?? {})
  const dirty = JSON.stringify(edits) !== JSON.stringify(base.config)
  const replacements = Object.keys(flat).filter(key => flatConfig(base.config)[key] !== flat[key])
  const invalidReplacement = replacements.some(key => !usableCatalog(catalog) || !known.has(key) || !supports(known.get(key)!, flat[key]))
  const warnings = catalog ? [...new Set([...securityWarnings(catalog, edits), ...securityWarnings(catalog, preview?.config ?? {})])] : ['Permission settings are not verified without a fresh host settings preview.']
  return <section className="defaults-editor hn-accent-scope" style={accent} aria-label={`Defaults for ${hat.name}`}><h2><bdi>{hat.name}</bdi></h2><p className="hint">{record.agent} · Saved preferences. Reset removes only this hat’s override.</p>
    <div className="config-fields">{keys.map(key => {
      const option = known.get(key), overridden = Object.hasOwn(flat, key)
      return <div className="config-field" key={key}>{option ? <ConfigControl option={option} value={overridden ? flat[key] : effective[key]} inherited={!overridden} disabled={!usableCatalog(catalog) || hat.purging} onChange={value => { setEdits(sparseConfig({ ...flat, [key]: value })); setSaved(false) }} /> : <p><bdi>{key}: {String(flat[key])}</bdi> · Stored value unavailable in this preview</p>}
        <span className={'config-source ' + (overridden ? 'override' : 'inherits')}>{overridden ? 'Hat override' : 'Inherits agent default'}</span>
        {overridden && <button type="button" className="btn btn-ghost" disabled={hat.purging} onClick={() => { const next = { ...flat }; delete next[key]; setEdits(sparseConfig(next)); setSaved(false) }}>Reset {option?.name ?? key} to inherited</button>}
        <p className="hint">Preview: <bdi>{valueLabel(catalog, key, effective[key])}</bdi> · {preview?.sources[key] ?? 'Agent default'}</p>
      </div>
    })}</div>
    {keys.length === 0 && <p>Everything inherits. Choose a fresh settings preview to add overrides.</p>}
    {preview?.notices.map(notice => <p role="status" key={notice}><bdi>{notice}</bdi></p>)}
    {warnings.map(warning => <p className="config-warning" key={warning}><bdi>{warning}</bdi></p>)}
    {invalidReplacement && <p role="alert">A chosen value is unavailable in this preview. Choose a fresh supported value or reset it before saving.</p>}
    {hat.purging && <p role="alert">This hat is being purged. Defaults cannot be changed.</p>}
    {conflict && <p role="alert">These defaults changed elsewhere. Your edits are retained. <button className="btn btn-secondary" type="button" onClick={onReload}>Reload and review</button></p>}
    {saved && <p role="status">Defaults saved.</p>}
    <div className="defaults-actions"><button className="btn btn-ghost" type="button" disabled={!dirty} onClick={() => { setEdits(base.config); setConflict(false) }}>Cancel changes</button><button className="btn btn-ghost" type="button" disabled={hat.purging || Object.keys(flat).length === 0} onClick={() => setEdits({})}>Reset all to inherited</button><button className="btn btn-primary" type="button" disabled={!dirty || hat.purging || conflict || invalidReplacement} onClick={() => setConfirm(true)}>Save defaults</button></div>
    {confirm && <ConfirmDialog title={`Save defaults for ${hat.name}`} confirm="Confirm save" action={async () => {
      try { const updated = await putSessionDefaults(client, hat.id, base.agent, { revision: base.revision, config: edits }); setBase(updated); setEdits(updated.config); onSaved(updated); setSaved(true) }
      catch (err) { if (err instanceof ApiFailure && err.code === 'defaults_changed') { setConflict(true); setConfirm(false) } throw err }
    }} onClose={() => setConfirm(false)}><p>Save these launcher preferences for <bdi>{hat.name}</bdi> / <bdi>{base.agent}</bdi>?</p><ul>{[...new Set([...Object.keys(flatConfig(base.config)), ...Object.keys(flat)])].filter(key => flatConfig(base.config)[key] !== flat[key]).map(key => <li key={key}><bdi>{known.get(key)?.name ?? key}: {String(flatConfig(base.config)[key] ?? 'Inherits')} → {String(flat[key] ?? 'Inherits')}</bdi></li>)}</ul>{warnings.map(warning => <p key={warning}>{warning}</p>)}<p>This affects later operator launches. Delegation grants and existing sessions keep their own settings.</p></ConfirmDialog>}
  </section>
}
```

### File: `web/src/components/LaunchConfig.tsx`

```tsx
import { useId } from 'react'
import type { ConfigValue, SessionConfig } from '../generated/protocol'
import type { ConfigOption } from '../lib/catalog'
import { fieldsOf, flatConfig, resolveDefaults, type Picks, valueLabel } from '../lib/defaults'
import type { LaunchContext } from './CatalogContext'

export function ConfigControl({ option, value, inherited, disabled, onChange }: { option: ConfigOption; value: ConfigValue | undefined; inherited: boolean; disabled?: boolean; onChange: (value: ConfigValue) => void }) {
  const id = useId()
  if (option.kind === 'boolean') return <label className="config-boolean" htmlFor={id}><input id={id} type="checkbox" checked={value === true} disabled={disabled} onChange={e => onChange(e.target.checked)} />{option.name}{inherited ? ' · inherited' : ''}</label>
  const known = typeof value === 'string' && option.choices.some(c => c.value === value)
  return <div className="config-select"><label htmlFor={id}>{option.name}</label><select id={id} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
    {!known && <option value={typeof value === 'string' ? value : ''}>{value === undefined ? 'Agent default' : `${String(value)} · unavailable`}</option>}
    {option.choices.map(choice => <option key={choice.value} value={choice.value}>{choice.name}</option>)}
  </select></div>
}
export default function LaunchConfig({ context, picks, onPicks, optOut, onOptOut, retry, expanded, onExpanded }: {
  context: LaunchContext; picks: Picks; onPicks: (picks: Picks) => void; optOut: boolean; onOptOut: (value: boolean) => void; retry: () => void; expanded: boolean; onExpanded: (value: boolean) => void
}) {
  const result = context.catalog ? resolveDefaults(context.catalog, context.defaults?.config ?? {}, picks, context.policy) : null
  const effective = flatConfig(result?.config ?? {})
  const requested = Object.keys(picks).filter(key => picks[key] !== null)
  const summary = fieldsOf(context.catalog).filter(({ key }) => Object.hasOwn(effective, key)).map(({ key, option }) => `${option.name}: ${valueLabel(context.catalog, key, effective[key])}`).join(' · ')
  return <section className="launch-config" aria-label="Session settings"><div className="launch-section-head"><h2>Session settings</h2><button className="btn btn-ghost" type="button" aria-expanded={expanded} onClick={() => onExpanded(!expanded)}>{expanded ? 'Hide settings' : 'Change'}</button></div>
    <p className="hint">Agent default → Hat override → Your choice</p>
    {context.state === 'loading' ? <p role="status">Loading session settings…</p> : context.state !== 'ready' ? <><p role="alert">Settings are unavailable. {context.error}</p><button type="button" className="btn btn-secondary" onClick={retry}>Retry settings</button><label className="opt-out"><input type="checkbox" checked={optOut} onChange={e => onOptOut(e.target.checked)} />Use agent defaults for this start</label><p className="hint">No saved or chosen settings will be sent. The agent’s configuration will not be verified.</p></> : <>
      <p className="config-summary"><bdi>{summary || 'Agent defaults'}</bdi></p>
      {fieldsOf(context.catalog).length < (context.catalog?.config_options.length ?? 0) && <p className="hint">Some reported settings cannot be represented here. Review them in the agent.</p>}
      {expanded && <div className="config-fields">{fieldsOf(context.catalog).map(({ key, option }) => <div className="config-field" key={key}><ConfigControl option={option} value={effective[key]} inherited={!requested.includes(key)} onChange={value => onPicks({ ...picks, [key]: value })} /><span className="config-source">{result?.sources[key] ?? 'Agent default'}</span><button type="button" className="btn btn-ghost" onClick={() => onPicks({ ...picks, [key]: null })}>Use agent default for {option.name}</button></div>)}</div>}
      {result?.notices.map(notice => <p role={result.blocked ? 'alert' : 'status'} key={notice}><bdi>{notice}</bdi></p>)}
      {result?.warnings.map(warning => <p className="config-warning" key={warning}><bdi>{warning}</bdi></p>)}
    </>}
  </section>
}
export function requestFor(context: LaunchContext, picks: Picks, optOut: boolean): SessionConfig | null {
  if (context.state !== 'ready' || !context.catalog) return optOut && context.state === 'unavailable' ? {} : null
  const result = resolveDefaults(context.catalog, context.defaults?.config ?? {}, picks, context.policy)
  return result.blocked ? null : result.config
}
```

### File: `web/src/components/ProjectPicker.tsx`

```tsx
// The New Session project field (frontend spec §7): type to search the
// host's recent projects and repositories, type a path (`/…` or `~…`) to
// use it as it is, or browse the host's directories.
//
// One host per mount: the screen remounts it (`key={hostId}`) when the host
// changes, which resets the query, the list and the browser at once.
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { DirectoryListing } from '../generated/protocol'
import { childPath, filterProjects, isLiteralPath, type ProjectEntry } from '../lib/projects'
import { basename, relTime } from '../lib/time'
import { Icon } from '../lib/ui'
import { Icon as Glyph } from './ui'

interface Props {
  hostId: string
  /** Recents then repositories, already merged and labelled. */
  entries: ProjectEntry[]
  /** Where browsing starts: the host user's home, else a workspace root. */
  browseRoot?: string
  /** The text the field opens with (a prefilled path). */
  initialText?: string
  /** The chosen directory, or `''` while the text is only a search. */
  onChange: (path: string) => void
  /** The field's accessible name comes from this element. */
  labelledBy: string
}

type Browse =
  | { state: 'closed' }
  | { state: 'loading'; path: string }
  | { state: 'shown'; listing: DirectoryListing }
  | { state: 'failed'; path: string; error: string }

export default function ProjectPicker({ hostId, entries, browseRoot, initialText = '', onChange, labelledBy }: Props) {
  const client = useClient()
  // From React, never the host's id: an id reference holds no spaces.
  const listId = useId()
  const [query, setQuery] = useState(initialText)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [browse, setBrowse] = useState<Browse>({ state: 'closed' })

  const matches = useMemo(() => (isLiteralPath(query) ? [] : filterProjects(entries, query)), [entries, query])

  // Only a directory being loaded is fetched: a failed one stays failed
  // until another (or the same one, again) is asked for.
  const browsePath = browse.state === 'loading' ? browse.path : null
  useEffect(() => {
    if (browsePath === null) return
    let live = true
    client
      .request<DirectoryListing>(
        'GET',
        `/api/hosts/${encodeURIComponent(hostId)}/browse?path=${encodeURIComponent(browsePath)}`,
      )
      .then(
        (listing) => live && setBrowse({ state: 'shown', listing }),
        (err) => live && setBrowse({ state: 'failed', path: browsePath, error: messageOf(err) }),
      )
    return () => {
      live = false
    }
  }, [client, hostId, browsePath])

  function pick(path: string, label: string) {
    setQuery(label)
    setOpen(false)
    setActive(-1)
    setBrowse({ state: 'closed' })
    onChange(path)
  }

  function onInput(next: string) {
    setQuery(next)
    setActive(-1)
    setOpen(!isLiteralPath(next))
    // A path needs no picking; a search is no choice until one is picked.
    onChange(isLiteralPath(next) ? next : '')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (matches.length === 0) return
      setOpen(true)
      setActive((cur) => {
        const next = cur + (e.key === 'ArrowDown' ? 1 : -1)
        if (next < 0) return matches.length - 1
        if (next >= matches.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter' && open && active >= 0 && active < matches.length) {
      e.preventDefault()
      pick(matches[active].path, matches[active].name)
    }
  }

  const browsing = browse.state !== 'closed'
  const showList = open && !browsing && matches.length > 0
  const optionId = (i: number) => `${listId}-o${i}`
  // The option arrow keys moved to, told to a screen reader while it shows.
  const activeId = showList && active >= 0 && active < matches.length ? optionId(active) : undefined
  const go = (path: string) => setBrowse({ state: 'loading', path })

  return (
    <div className="picker">
      <div className="picker-row">
        <div className="picker-anchor">
          <div className="path-input">
            <span className="ic">
              <Icon.Folder size={15} />
            </span>
            <input
              value={query}
              onChange={(e) => onInput(e.target.value)}
              onFocus={() => setOpen(!isLiteralPath(query))}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              placeholder="A project's name, or a path: /srv/… or ~/…"
              role="combobox"
              aria-labelledby={labelledBy}
              aria-expanded={showList}
              aria-controls={showList ? listId : undefined}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
            />
          </div>
          {showList && (
            <ul className="picker-list" id={listId} role="listbox">
              {matches.map((m, i) => (
                <li
                  key={m.path}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  title={m.path}
                  className={'picker-item' + (i === active ? ' active' : '')}
                  // On mousedown: a click would blur the input, closing the list first.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(m.path, m.name)
                  }}
                >
                  <bdi>{m.name}</bdi>
                  {m.lastUsed !== undefined && <span className="picker-time hint"><Glyph name="clock" size={14} /><time dateTime={m.lastUsed} title={m.lastUsed}>recent · {relTime(m.lastUsed) || 'time unavailable'}</time></span>}
                </li>
              ))}
            </ul>
          )}
          {browsing && (
            <div className="picker-list" role="group" aria-label="Browse directories">
              {browse.state === 'loading' && (
                <div className="picker-path">
                  <bdi>{browse.path}</bdi> Loading…
                </div>
              )}
              {browse.state === 'failed' && (
                <>
                  <div className="picker-path">
                    <bdi>{browse.path}</bdi>
                  </div>
                  <div className="picker-item form-error" role="alert">
                    <bdi>{browse.error}</bdi>
                  </div>
                </>
              )}
              {browse.state === 'shown' && (
                <>
                  <div className="picker-path">
                    <bdi>{browse.listing.path}</bdi>
                  </div>
                  {browse.listing.parent !== undefined && (
                    <button type="button" className="picker-item" onClick={() => go(browse.listing.parent!)}>
                      .. (up)
                    </button>
                  )}
                  {browse.listing.entries.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      className={'picker-item' + (d.git ? ' git' : '')}
                      // Every row descends, a repository too: a worktree can
                      // live inside one. Choosing is "Use this directory".
                      onClick={() => go(childPath(browse.listing.path, d.name))}
                    >
                      <bdi>{d.name}</bdi>
                    </button>
                  ))}
                  {browse.listing.truncated && <div className="picker-path">Not every directory is listed.</div>}
                  <button
                    type="button"
                    className="picker-item"
                    onClick={() => pick(browse.listing.path, basename(browse.listing.path))}
                  >
                    Use this directory
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={browseRoot === undefined}
          title={browseRoot === undefined ? 'This host reported no directory to browse from' : undefined}
          aria-pressed={browsing}
          onClick={() => {
            if (browsing) {
              setBrowse({ state: 'closed' })
              return
            }
            setOpen(false)
            if (browseRoot !== undefined) go(isLiteralPath(query) && query.startsWith('/') ? query : browseRoot)
          }}
        >
          Browse
        </button>
      </div>
    </div>
  )
}
```

### File: `web/src/screens/Defaults.tsx`

```tsx
import '../styles/launch.css'
import { useEffect, useId, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { sessionDefaults } from '../api/defaults'
import { messageOf } from '../api/errors'
import CatalogContext, { useLaunchContext } from '../components/CatalogContext'
import DefaultsEditor from '../components/DefaultsEditor'
import type { HatItem, HatResolution, HatSessionDefaults, HostItem } from '../generated/protocol'
import { fieldsOf, flatConfig, resolveDefaults, valueLabel } from '../lib/defaults'
import { agentLabel } from '../lib/agent'
import { Link, useLocation } from '../router'
import { useRegisterContext } from '../app-actions'

export default function Defaults() {
  const client = useClient(), { search } = useLocation(), [query] = useState(() => new URLSearchParams(search))
  const [hosts, setHosts] = useState<HostItem[]>([]), [hats, setHats] = useState<HatItem[]>([])
  const [host, setHost] = useState(query.get('host') ?? ''), [cwd, setCwd] = useState(query.get('cwd') ?? ''), [agent, setAgent] = useState(query.get('agent') ?? '')
  const [manualAgent, setManualAgent] = useState(false)
  const [selectedHat, setSelectedHat] = useState(query.get('hat') ?? ''), [error, setError] = useState('')
  const [preview, setPreview] = useState<{ host: string; cwd: string; hat: string } | null>(null), [probing, setProbing] = useState(false)
  const [records, setRecords] = useState<Record<string, HatSessionDefaults>>({}), [loading, setLoading] = useState(false), [refresh, setRefresh] = useState(0)
  const generation = useRef(0), tabBase = useId(), recordsKey = JSON.stringify([agent, refresh])
  const [loadedKey, setLoadedKey] = useState('')
  const context = useLaunchContext(preview?.host ?? '', agent, preview?.cwd ?? '', preview?.hat ?? '')
  const catalog = context.state === 'ready' ? context.catalog : null
  useRegisterContext({ hostId: host, cwd: preview?.cwd, hatId: selectedHat })
  useEffect(() => {
    let live = true
    Promise.all([client.request<HostItem[]>('GET', '/api/hosts'), client.request<HatItem[]>('GET', '/api/hats')]).then(([allHosts, allHats]) => {
      if (!live) return
      setHosts(allHosts.filter(h => h.revoked_at == null)); setHats(allHats)
      setSelectedHat(current => current || allHats[0]?.id || '')
    }, err => live && setError(messageOf(err)))
    return () => { live = false }
  }, [client])
  const ids = [...new Set([...Object.keys(hosts.find(h => h.host_id === host)?.mcp_delivery ?? {}), ...(query.get('agent') ? [query.get('agent')!] : [])])]
  const agents = ids.length ? ids : agent ? [agent] : []
  useEffect(() => { if (!manualAgent && !agent && agents.length) setAgent(agents[0]) }, [agents.join('\0'), agent, manualAgent])
  useEffect(() => {
    if (!agent || !hats.length) return
    let live = true, index = 0
    const abort = new AbortController(), next: Record<string, HatSessionDefaults> = {}
    setLoading(true)
    const worker = async () => { while (index < hats.length) { const hat = hats[index++]; next[hat.id] = await sessionDefaults(client, hat.id, agent, abort.signal) } }
    Promise.all([worker(), worker()]).then(() => { if (live) { setRecords(next); setLoadedKey(recordsKey); setLoading(false); setError('') } }, err => { if (live) { setLoading(false); setError(messageOf(err)) } })
    return () => { live = false; abort.abort() }
  }, [client, hats, agent, recordsKey])
  async function loadPreview() {
    const current = ++generation.current
    setProbing(true); setError(''); setPreview(null)
    try {
      const resolved = await client.request<HatResolution>('POST', '/api/hats/resolve', { host_id: host, path: cwd.trim() })
      if (current !== generation.current) return
      if (!resolved.exists || !resolved.is_dir) throw new Error('Choose an existing project directory on this host.')
      setPreview({ host, cwd: resolved.canonical, hat: resolved.hat_id })
    } catch (err) { if (current === generation.current) setError(messageOf(err)) }
    finally { if (current === generation.current) setProbing(false) }
  }
  const currentRecords = loadedKey === recordsKey ? records : {}
  const hat = hats.find(h => h.id === selectedHat), record = currentRecords[selectedHat]
  const fields = fieldsOf(catalog)
  return <div className="defaults-screen"><header><div><h1>Defaults</h1><p>Agent default → Hat override → Your choice</p></div>{query.get('return') === 'new' && <Link to="/new?restore=1">Back to new session</Link>}</header>
    {!preview && <CatalogContext hosts={hosts} host={host} cwd={cwd} onHost={value => { generation.current++; setHost(value); setManualAgent(false); setAgent(''); setPreview(null); setCwd(''); setProbing(false) }} onCwd={value => { generation.current++; setCwd(value); setPreview(null); setProbing(false) }} onPreview={() => void loadPreview()} busy={probing} />}
    <div className="agent-tabs" role="tablist" aria-label="Agent defaults">{agents.map((id, index) => <button role="tab" type="button" key={id} id={`${tabBase}-${index}`} aria-selected={agent === id} aria-controls={`${tabBase}-panel`} tabIndex={agent === id ? 0 : -1} onClick={() => setAgent(id)} onKeyDown={event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? agents.length - 1 : event.key === 'ArrowRight' ? (index + 1) % agents.length : event.key === 'ArrowLeft' ? (index + agents.length - 1) % agents.length : -1
      if (next >= 0) { event.preventDefault(); setAgent(agents[next]); document.getElementById(`${tabBase}-${next}`)?.focus() }
    }}>{agentLabel(id)}</button>)}</div>
    <details className="runtime-id"><summary>Other agent</summary><label>Configured agent name<input value={agent} onChange={event => { setManualAgent(true); setAgent(event.target.value) }} placeholder="Agent name on the host" /></label></details>
    {preview && <p role="status">Preview: <bdi>{hosts.find(h => h.host_id === preview.host)?.name}</bdi> · <bdi>{preview.cwd}</bdi> · Resolves to <bdi>{hats.find(h => h.id === preview.hat)?.name}</bdi> · {context.catalog?.freshness === 'fresh' ? 'Up to date' : context.catalog?.freshness === 'stale' ? 'Out of date' : 'Not verified'} <button className="btn btn-ghost" type="button" onClick={() => setPreview(null)}>Change preview</button></p>}
    {preview && context.state === 'unavailable' && <p role="alert">The settings preview is unavailable. <bdi>{context.error}</bdi> Existing overrides can still be inspected and reset. <button className="btn btn-secondary" type="button" onClick={() => void loadPreview()}>Retry preview</button></p>}
    {error && <p role="alert"><bdi>{error}</bdi><button className="btn btn-secondary" type="button" onClick={() => setRefresh(value => value + 1)}>Retry defaults</button></p>}
    <section id={`${tabBase}-panel`} role="tabpanel" aria-labelledby={agents.includes(agent) ? `${tabBase}-${agents.indexOf(agent)}` : undefined}>
      {loading && <p role="status">Loading saved defaults…</p>}
      {catalog && <table className="defaults-matrix"><caption>Saved values on this host. Edits below apply after Save.</caption><thead><tr><th scope="col">Setting</th><th scope="col">Agent default</th>{hats.map(h => <th scope="col" key={h.id}><button className="btn btn-ghost" type="button" onClick={() => setSelectedHat(h.id)}>Edit {h.name}</button></th>)}</tr></thead><tbody>{fields.map(({ key, option }) => <tr key={key}><th scope="row">{option.name}</th><td><bdi>{valueLabel(catalog, key, flatConfig(catalog.defaults)[key])}</bdi></td>{hats.map(h => { const stored = currentRecords[h.id]; const result = stored ? resolveDefaults(catalog, stored.config, {}, context.policy) : null; return <td key={h.id}><bdi>{result ? valueLabel(catalog, key, flatConfig(result.config)[key]) : 'Loading…'}</bdi><span className="config-source">{result?.sources[key] ?? 'Agent default'}</span>{stored && Object.hasOwn(flatConfig(stored.config), key) && result?.sources[key] !== 'Hat override' && <span>Stored override unavailable</span>}</td> })}</tr>)}</tbody></table>}
      <label className="hat-editor-picker">Hat<select value={selectedHat} onChange={event => setSelectedHat(event.target.value)}>{hats.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      {hat && record && <DefaultsEditor key={`${hat.id}:${agent}:${refresh}`} hat={hat} record={record} catalog={catalog} policy={context.policy} onSaved={updated => setRecords(old => ({ ...old, [updated.hat_id]: updated }))} onReload={() => setRefresh(value => value + 1)} />}
    </section>
  </div>
}
```

### File: `web/src/screens/NewSession.tsx`

```tsx
import '../styles/launch.css'
import LaunchConfig, { requestFor } from '../components/LaunchConfig'
import { useLaunchContext } from '../components/CatalogContext'
import { useAccentStyle } from '../lib/theme'
import { useRegisterContext } from '../app-actions'
import { confirmStart, rememberConfigurationReview } from '../lib/start'
import type { Picks } from '../lib/defaults'
import McpPrediction from '../components/McpPrediction'
import { predictionHat } from '../lib/mcpDelivery'
// New session (frontend spec §7): a host, an agent, a project, the hat the
// project resolves to, an optional first prompt, then Start.
//
// - Hosts: connected ones first; offline ones listed but disabled; revoked
//   ones never offered.
// - Changing the host resets the agent, the path and the browser (in the
//   click handler, never in an effect, so a prefilled path survives the
//   prefilled host being chosen on load).
// - `/new?host=<id>&cwd=<path>` prefills both ("Start a new session in this
//   project"). A prefilled host that cannot be used is not replaced by
//   another in silence: a notice says why.
// - Start: `POST /api/sessions`, then the first prompt as its own
//   `POST …/prompt` (the server takes no first prompt with a start yet),
//   then `/sessions/<id>`. A first prompt that does not go through, or a
//   start whose delivery is unknown, still goes to the session, with a
//   notice (lib/start.ts) and the prompt kept as that session's draft.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiFailure, messageOf } from '../api/errors'
import { useClient } from '../app-client'
import ProjectPicker from '../components/ProjectPicker'
import type {
  HatItem,
  HatResolution,
  HostItem,
  HostProjects,
  StartSessionRequest,
  StartSessionResponse,
} from '../generated/protocol'
import { agentLabel } from '../lib/agent'
import { agentOptions, agentsFor, type HostAgentChoices } from '../lib/agents'
import { saveDraft } from '../lib/drafts'
import { isLiteralPath, projectEntries } from '../lib/projects'
import { readNewSessionPrefill, sessionHref, startRefusal } from '../lib/start'
import { Icon } from '../lib/ui'
import { Link, navigate, useLocation } from '../router'

/** How long the path must stay unchanged before its hat is resolved. */
export const RESOLVE_DEBOUNCE_MS = 300

/** The other agent choice: a name typed by hand. */
const OTHER = '\u0000other'

/** Hosts to offer: never a revoked one; connected first, each group in the
 *  server's order. */
export function offeredHosts(hosts: HostItem[]): HostItem[] {
  const live = hosts.filter((h) => h.revoked_at == null)
  return [...live.filter((h) => h.connected), ...live.filter((h) => !h.connected)]
}

type Resolved =
  | { state: 'idle' }
  | { state: 'pending' }
  | { state: 'ok'; resolution: HatResolution; hostId: string; path: string }
  | { state: 'failed'; error: string }

export default function NewSession() {
  const client = useClient()
  const { search } = useLocation()
  // Read once: the form owns its fields after that.
  const [draft] = useState(() => { const saved = readLauncherDraft(), requested = readNewSessionPrefill(search); return requested.host && (requested.host !== saved?.host || requested.cwd !== saved?.cwd) ? null : saved })
  const [prefill] = useState(() => { const requested = readNewSessionPrefill(search); return requested.host ? requested : { host: draft?.host, cwd: draft?.cwd } })
  const ids = { host: useId(), agent: useId(), project: useId(), prompt: useId() }

  const [hosts, setHosts] = useState<HostItem[] | null>(null)
  const [hostsError, setHostsError] = useState<string | null>(null)
  const [hostId, setHostId] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const [choices, setChoices] = useState<HostAgentChoices | null>(null)
  const [agent, setAgent] = useState(draft?.agent ?? '')
  const [otherName, setOtherName] = useState(draft?.otherName ?? '')

  const [projects, setProjects] = useState<HostProjects | null>(null)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  /** The canonical path whose hat the recents are asked for, once it
   *  differs from the one they came for. */
  const [recentsFor, setRecentsFor] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [initialText, setInitialText] = useState('')

  const [hats, setHats] = useState<HatItem[]>([])
  const [resolved, setResolved] = useState<Resolved>({ state: 'idle' })

  const [prompt, setPrompt] = useState(draft?.prompt ?? '')
  const [picks, setPicks] = useState<Picks>(draft?.picks ?? {})
  const [optOut, setOptOut] = useState(false)
  const [generation, setGeneration] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false), liveRef = useRef(true)
  const [draftOwner] = useState(() => crypto.randomUUID())
  const [sameLogin] = useState(() => launcherLogin(() => liveRef.current))
  useEffect(() => { liveRef.current = true; return () => { liveRef.current = false } }, [])
  const [error, setError] = useState<string | null>(null)

  // The hosts, once, and the prefilled (or first connected) host.
  useEffect(() => {
    let live = true
    client.request<HostItem[]>('GET', '/api/hosts').then(
      (all) => {
        if (!live) return
        const offered = offeredHosts(all)
        setHosts(offered)
        if (prefill.host !== undefined) {
          const wanted = offered.find((h) => h.host_id === prefill.host)
          if (wanted?.connected) {
            setHostId(wanted.host_id)
            if (prefill.cwd) {
              // Only a path is taken as one: other text is a search, no
              // path until a project is picked (as typed).
              if (isLiteralPath(prefill.cwd)) setCwd(prefill.cwd)
              setInitialText(prefill.cwd)
            }
            return
          }
          setNotice(
            wanted
              ? `${wanted.name} is offline, so the session cannot start there: pick another host.`
              : 'The host this link names is not paired any more: pick another host.',
          )
          return
        }
        const first = offered.find((h) => h.connected)
        if (first) setHostId(first.host_id)
      },
      (err) => live && setHostsError(messageOf(err)),
    )
    return () => {
      live = false
    }
  }, [client, prefill])

  // The hats, for names.
  useEffect(() => {
    let live = true
    client.request<HatItem[]>('GET', '/api/hats').then(
      (all) => live && setHats(all),
      () => {
        // Without names the preview shows the hat's id.
      },
    )
    return () => {
      live = false
    }
  }, [client])
  const hatName = (id: string) => hats.find((h) => h.id === id)?.name ?? id

  // The host's agents, the first usable one picked. A host change resets
  // the agent first (`chooseHost`), so no pick of another host is kept.
  useEffect(() => {
    if (!hostId) return
    let live = true
    setChoices(null)
    agentsFor(client, hostId).then(
      (got) => {
        if (!live) return
        const ids = Object.keys(hosts?.find(h => h.host_id === hostId)?.mcp_delivery ?? {})
        const actual = { ...got, agents: ids.map(id => got.agents.find(a => a.agent === id) ?? { agent: id, available: true, auth: 'unknown' as const, cli: 'given' as const }) }
        setChoices(actual)
        const usable = agentOptions(actual.agents).filter((o) => o.disabled === undefined)
        setAgent(current => usable.some(o => o.agent === current) || (current === OTHER && got.other) ? current : (usable[0]?.agent ?? (got.other ? OTHER : '')))
      },
      (err) => live && setError(messageOf(err)),
    )
    return () => {
      live = false
    }
  }, [client, hostId, hosts])

  // The host's projects: the recents of the hat the chosen path resolves to
  // (the host's default hat until one is resolved), and its repositories.
  useEffect(() => {
    if (!hostId) return
    let live = true
    setProjectsError(null)
    const path = `/api/hosts/${encodeURIComponent(hostId)}/projects`
    client
      .request<HostProjects>('GET', recentsFor === null ? path : `${path}?path=${encodeURIComponent(recentsFor)}`)
      .then(
        (got) => live && setProjects(got),
        (err) => live && setProjectsError(messageOf(err)),
      )
    return () => {
      live = false
    }
  }, [client, hostId, recentsFor])

  // The hat the path resolves to, once the path has rested a moment. An
  // answer for a path or host no longer chosen is dropped.
  useEffect(() => {
    if (!hostId || cwd.trim() === '') {
      setResolved({ state: 'idle' })
      return
    }
    let live = true
    const abort = new AbortController()
    setResolved({ state: 'pending' })
    const timer = setTimeout(() => {
      client
        .request<HatResolution>('POST', '/api/hats/resolve', { host_id: hostId, path: cwd.trim() }, { signal: abort.signal })
        .then(
          (resolution) => live && setResolved({ state: 'ok', resolution, hostId, path: cwd }),
          (err) => live && setResolved({ state: 'failed', error: startRefusal(err) }),
        )
    }, RESOLVE_DEBOUNCE_MS)
    return () => {
      live = false
      clearTimeout(timer)
      abort.abort()
    }
  }, [client, hostId, cwd])

  // Recents for the resolved hat, when the list holds another hat's.
  useEffect(() => {
    if (resolved.state !== 'ok' || !projects) return
    if (resolved.resolution.hat_id !== projects.recents_hat_id) setRecentsFor(resolved.resolution.canonical)
  }, [resolved, projects])

  const entries = useMemo(() => (projects ? projectEntries(projects) : []), [projects])
  const host = hosts?.find((h) => h.host_id === hostId)
  const browseRoot = projects?.home ?? host?.workspace_roots[0]

  function chooseHost(id: string) {
    if (id === hostId) return
    setHostId(id)
    // A path, an agent and a listing of one host mean nothing on another.
    setAgent('')
    setOtherName('')
    setCwd('')
    setInitialText('')
    setProjects(null)
    setRecentsFor(null)
    setNotice('Host changed. Choose the agent and project again; their previous choices were reset.')
    setPicks({})
    setOptOut(false)
    setError(null)
  }

  const agentName = agent === OTHER ? otherName.trim() : agent
  const current = resolved.state === 'ok' && resolved.hostId === hostId && resolved.path === cwd ? resolved.resolution : null
  const context = useLaunchContext(hostId, agentName, current?.canonical ?? '', current?.hat_id ?? '', generation)
  const config = requestFor(context, picks, optOut)
  const accent = useAccentStyle(hats.find(h => h.id === current?.hat_id)?.colour)
  useRegisterContext({ hostId, cwd: current?.canonical, hatId: current?.hat_id })
  useEffect(() => {
    if (!hostId || !sameLogin()) return
    try { sessionStorage.setItem(LAUNCH_DRAFT, JSON.stringify({ owner: draftOwner, host: hostId, cwd, prompt, agent, otherName, picks })) } catch { /* Current form remains usable. */ }
  }, [hostId, cwd, prompt, agent, otherName, picks, draftOwner, sameLogin])
  useEffect(() => { setOptOut(false) }, [context.key])
  function chooseAgent(next: string) { if (next !== agent) { setAgent(next); setPicks({}); setNotice('Agent changed. Session setting choices were reset.') } }
  const canStart = !busy && host?.connected === true && agentName !== '' && current?.exists === true && current.is_dir && config !== null
  function retainClosedStart(sessionId: string) {
    if (!sameLogin()) return
    keepDraft(sessionId, prompt)
    clearLauncherDraft(draftOwner)
  }
  function openSession(href: string) { if (sameLogin() && liveRef.current) navigate(href) }

  async function start(e: FormEvent) {
    e.preventDefault()
    if (!canStart || busyRef.current || !sameLogin()) return
    busyRef.current = true
    setBusy(true)
    e.currentTarget.closest<HTMLElement>('[role="dialog"]')?.focus()
    setError(null)
    const request: StartSessionRequest = { host_id: hostId, agent: agentName, cwd: current!.canonical, ...config }
    let sessionId: string
    try {
      sessionId = (await client.request<StartSessionResponse>('POST', '/api/sessions', request)).session_id
    } catch (err) {
      if (!sameLogin()) return
      if (err instanceof ApiFailure && err.code === 'delivery_unknown' && err.sessionId) {
        clearLauncherDraft(draftOwner)
        openSession(sessionHref(err.sessionId, { kind: 'start_unknown', kept: keepDraft(err.sessionId, prompt) }))
        return
      }
      if (!liveRef.current) return
      busyRef.current = false
      setBusy(false)
      setError(startRefusal(err))
      return
    }
    if (!sameLogin()) return
    if (!liveRef.current) { retainClosedStart(sessionId); return }
    // A start acknowledgement alone cannot authorize the first prompt.
    {
      // The opt-out skips configuration evidence, never the actual-hat check.
      const confirmation = await confirmStart(client, sessionId, current!.hat_id, config!, 30_000, !optOut)
      if (!sameLogin()) return
      if (!liveRef.current) { retainClosedStart(sessionId); return }
      if (confirmation !== 'confirmed') {
        const code = optOut && confirmation === 'config_unconfirmed' ? 'start_unconfirmed' : confirmation
        keepDraft(sessionId, prompt)
        if (code === 'config_unconfirmed') rememberConfigurationReview(sessionId, context.catalog, config!)
        clearLauncherDraft(draftOwner)
        openSession(sessionHref(sessionId, { kind: 'prompt_failed', code }))
        return
      }
    }
    clearLauncherDraft(draftOwner)
    // Images are not part of the first prompt yet: the composer's image
    // rules (Task 6) take them once it is shared with this form.
    if (prompt.trim() !== '') {
      try {
        await client.request('POST', `/api/sessions/${encodeURIComponent(sessionId)}/prompt`, {
          content: [{ type: 'text', text: prompt }],
        })
      } catch (err) {
        if (!sameLogin()) return
        keepDraft(sessionId, prompt)
        const code = err instanceof ApiFailure ? err.code : 'unknown'
        openSession(sessionHref(sessionId, { kind: 'prompt_failed', code }))
        return
      }
    }
    openSession(sessionHref(sessionId))
  }

  const options = choices ? agentOptions(choices.agents) : []

  return (
    <form className="new-session hn-accent-scope" style={accent} onSubmit={start} aria-busy={busy} aria-labelledby="new-session-title" onKeyDown={e => { if (!e.defaultPrevented && !e.repeat && !e.altKey && !e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); if (canStart) e.currentTarget.requestSubmit() } }}>
      <div className="modal-head">
        <div className="modal-eyebrow">Start a session</div>
        <h1 className="modal-title" id="new-session-title">
          New session
        </h1>
      </div>
      <div className="modal-body"><fieldset className="launch-fields" aria-label="Session details" disabled={busy} inert={busy}>
        {notice !== null && (
          <p className="hint" role="status">
            <bdi>{notice}</bdi>
          </p>
        )}

        {hostId !== '' && (
            <div className="field first-prompt">
              <label className="field-label" htmlFor={ids.prompt}>
                <Icon.Sparkle size={16} /> First prompt <span className="hint">optional</span>
              </label>
              <div className="prompt-box">
                <textarea
                  disabled={busy}
                  id={ids.prompt}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`What should ${agentName && agent !== OTHER ? agentLabel(agentName) : 'the agent'} work on?`}
                />
              </div>
            </div>
        )}
        <fieldset className="field launch-choice" disabled={busy}>
          <legend className="field-label" id={ids.host}>
            <Icon.Terminal size={16} /> Host <span className="hint">where the agent runs</span>
          </legend>
          {hostsError !== null ? (
            <p className="form-error" role="alert">
              <bdi>{hostsError}</bdi>
            </p>
          ) : hosts === null ? (
            <p className="hint">Loading…</p>
          ) : hosts.length === 0 ? (
            <p className="hint">
              No host is paired yet. <Link to="/hosts">Pair one</Link>.
            </p>
          ) : (
            <div className="seg">
              {hosts.map((h) => (
                <label
                  key={h.host_id}
                  className={'seg-item' + (hostId === h.host_id ? ' sel' : '')}
                  title={h.connected ? undefined : 'Offline'}
                >
                  <input type="radio" name={ids.host} value={h.host_id} checked={hostId === h.host_id} disabled={!h.connected} onChange={() => chooseHost(h.host_id)} />
                  <span className={'seg-led ' + (h.connected ? 'led-run' : 'led-idle')} />
                  <span>
                    <span className="seg-name">
                      <bdi>{h.name}</bdi>
                    </span>
                    {!h.connected && <span className="seg-host"> offline</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {hostId !== '' && (
          <>
            <fieldset className="field launch-choice" disabled={busy}>
              <legend className="field-label" id={ids.agent}>
                <Icon.Cpu size={16} /> Agent
              </legend>
              {choices === null ? (
                <p className="hint">Loading…</p>
              ) : (
                <div className="seg">
                  {options.map((o) => (
                    <label
                      key={o.agent}
                      className={'seg-item' + (agent === o.agent ? ' sel' : '')}
                      title={o.disabled}
                    >
                      <input type="radio" name={ids.agent} value={o.agent} checked={agent === o.agent} disabled={o.disabled !== undefined} onChange={() => chooseAgent(o.agent)} />
                      <span className="seg-name">
                        <bdi>{o.label}</bdi>
                      </span>
                      {o.disabled !== undefined && (
                        <span className="seg-host">
                          <bdi>{o.disabled}</bdi>
                        </span>
                      )}
                    </label>
                  ))}
                  {choices.other && (
                    <label
                      className={'seg-item' + (agent === OTHER ? ' sel' : '')}
                    >
                      <input type="radio" name={ids.agent} value={OTHER} checked={agent === OTHER} onChange={() => chooseAgent(OTHER)} />
                      <span className="seg-name">Other…</span>
                    </label>
                  )}
                </div>
              )}
              {agent === OTHER && (
                <div className="path-input">
                  <input
                    aria-label="Agent name"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    placeholder="The agent's name on the host"
                    spellCheck={false}
                  />
                </div>
              )}
            </fieldset>

            <div className="field">
              <div className="field-label" id={ids.project}>
                <Icon.Folder size={16} /> Project <span className="hint">type a name, or a path</span>
              </div>
              <ProjectPicker
                key={hostId}
                hostId={hostId}
                entries={entries}
                browseRoot={browseRoot}
                initialText={initialText}
                onChange={setCwd}
                labelledBy={ids.project}
              />
              {projects !== null && projects.recents.length > 0 && (
                <div className="picker-path">
                  Recent projects of the hat <bdi>{hatName(projects.recents_hat_id)}</bdi>
                </div>
              )}
              {projects?.partial && <div className="picker-path">The host listed only some of its repositories.</div>}
              {projectsError !== null && (
                <div className="picker-path" role="alert">
                  Projects could not be listed: <bdi>{projectsError}</bdi> You can still type a path.
                </div>
              )}
              <HatPreview resolved={resolved} hatName={hatName} />
              <McpPrediction host={host} agent={agentName} hatId={predictionHat(
                resolved.state === 'ok' ? { hostId: resolved.hostId, path: resolved.path, hat: resolved.resolution.hat_id } : undefined,
                hostId, cwd,
              )} />
            </div>

            {current && <><LaunchConfig context={context} picks={picks} onPicks={setPicks} optOut={optOut} onOptOut={setOptOut} retry={() => setGeneration(g => g + 1)} expanded={expanded} onExpanded={setExpanded} />
              <Link aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={event => { if (busy) event.preventDefault() }} to={`/defaults?${new URLSearchParams({ host: hostId, cwd: current.canonical, agent: agentName, hat: current.hat_id, return: 'new' })}`}>Edit defaults</Link></>}

          </>
        )}
      </fieldset></div>
      <div className="modal-foot">
        {error !== null && (
          <p className="form-error" role="alert">
            <bdi>{error}</bdi>
          </p>
        )}
        <div className="spacer" />
        <button type="submit" className="btn btn-primary" disabled={!canStart}>
          <Icon.Bolt size={16} /> {busy ? 'Starting…' : 'Start session'}
        </button>
      </div>
    </form>
  )
}

/** Where the session will land: its hat, before it starts. */
function HatPreview({ resolved, hatName }: { resolved: Resolved; hatName: (id: string) => string }) {
  if (resolved.state === 'idle') return null
  if (resolved.state === 'pending') {
    return (
      <p className="picker-path" role="status">
        Finding the hat…
      </p>
    )
  }
  if (resolved.state === 'failed') {
    return (
      <p className="form-error" role="alert">
        <bdi>{resolved.error}</bdi>
      </p>
    )
  }
  const { resolution } = resolved
  return (
    <p className="picker-path" role="status">
      Starts in the hat <b><bdi>{hatName(resolution.hat_id)}</bdi></b> at <bdi>{resolution.canonical}</bdi>
      {!resolution.exists ? ': this directory does not exist yet' : !resolution.is_dir ? ': this is not a directory' : ''}
    </p>
  )
}

/** A prompt that was not sent becomes the session's draft: the composer
 *  opens with it (lib/drafts.ts, the composer's own store). Whether there
 *  was one to keep; storage refused, the notice still says it was not sent. */
function keepDraft(sessionId: string, prompt: string): boolean {
  if (prompt.trim() === '') return false
  saveDraft(sessionId, prompt)
  return true
}

const LAUNCH_DRAFT = 'hennery.draft.__launcher__'
const LAUNCH_LOGIN = 'hennery.draft.__launcher_login__'
/** Existing logout cleanup removes this marker along with every draft.
 * Reopening a launcher shares it; signing in again creates a new lifetime.
 * No shared auth/logout helper or other screen needs a new callback. */
function launcherLogin(live: () => boolean): () => boolean {
  try {
    const token = sessionStorage.getItem(LAUNCH_LOGIN) ?? crypto.randomUUID()
    sessionStorage.setItem(LAUNCH_LOGIN, token)
    return () => { try { return sessionStorage.getItem(LAUNCH_LOGIN) === token } catch { return false } }
  } catch {
    // Storage cannot retain text either. Keep the mounted form usable,
    // while a closed launcher or auth-page navigation cannot finish it.
    return () => live() && location.pathname !== '/login' && location.pathname !== '/setup'
  }
}
interface LauncherDraft { host: string; cwd: string; agent: string; otherName: string; prompt: string; picks: Picks }
function readLauncherDraft(): LauncherDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(LAUNCH_DRAFT) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const v = value as Record<string, unknown>
    if (!['host', 'cwd', 'agent', 'otherName', 'prompt'].every(key => typeof v[key] === 'string')) return null
    if (!v.picks || typeof v.picks !== 'object' || Array.isArray(v.picks) || !Object.values(v.picks).every(p => p === null || typeof p === 'boolean' || typeof p === 'string')) return null
    return v as unknown as LauncherDraft
  } catch { return null }
}
function clearLauncherDraft(owner: string) {
  try {
    const current = JSON.parse(sessionStorage.getItem(LAUNCH_DRAFT) ?? 'null') as { owner?: unknown } | null
    if (current?.owner === owner) sessionStorage.removeItem(LAUNCH_DRAFT)
  } catch { /* Current session draft still remains. */ }
}
```

### File: `web/src/styles/launch.css`

```css
.field-label .hint { font-weight:500; font-size:12px; color:var(--fg-muted); }
.seg { display:flex; gap:8px; flex-wrap:wrap; }
.seg-item { display:flex; align-items:center; gap:9px; padding:11px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); transition:all .12s; }
.seg-item:hover { border-color:var(--border-strong); }
.seg-item.sel { border-color:var(--accent); background:var(--accent-wash); }
/* New Session form: hosts, the project picker, agents and the first prompt */
.seg-led { width:8px; height:8px; border-radius:50%; }
.seg-name { font-weight:600; font-size:14px; text-align:left; }
.seg-host { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); }
.path-input { position:relative; }
.path-input input { width:100%; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); padding:11px 13px 11px 36px; font-family:var(--font-mono); font-size:13px; color:var(--fg-1); background:var(--surface-2); outline:none; transition:border-color .15s,box-shadow .15s; }
.path-input input:focus { border-color:var(--accent); background:var(--surface); box-shadow:0 0 0 3px var(--accent-wash); }
.path-input .ic { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--fg-quiet); }
.picker-row { display:flex; align-items:flex-start; gap:8px; }
.picker-row .picker-anchor { flex:1; min-width:0; }
.picker-anchor { position:relative; }
.picker-list { position:absolute; z-index:20; left:0; right:0; top:calc(100% + 4px); margin:0; padding:4px; list-style:none; max-height:220px; overflow-y:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:0 8px 24px rgba(0,0,0,.18); }
.picker-item { display:block; width:100%; text-align:left; border:none; background:none; font-family:var(--font-mono); font-size:12.5px; color:var(--fg-2); padding:7px 10px; border-radius:var(--r-sm); cursor:pointer; }
.picker-item:hover, .picker-item.active { background:var(--surface-3); color:var(--accent); }
.picker-item.git { color:var(--accent); font-weight:600; }
.picker-path { font-family:var(--font-mono); font-size:11px; color:var(--fg-muted); margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.model-grid { display:flex; flex-direction:column; gap:9px; }
.model { display:flex; align-items:center; gap:13px; padding:13px 15px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--surface); text-align:left; width:100%; transition:all .12s; }
.model:hover { border-color:var(--border-strong); }
.model.sel { border-color:var(--accent); background:var(--accent-wash); }
.model-ic { width:34px; height:34px; border-radius:9px; flex:none; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:500; font-size:13px; color:var(--on-accent); }
.model-main { flex:1; min-width:0; }
.model-name { font-weight:700; font-size:14.5px; }
.model-name .id { font-family:var(--font-mono); font-weight:500; font-size:11px; color:var(--fg-muted); margin-left:7px; }
.model-desc { font-size:12.5px; color:var(--fg-muted); margin-top:1px; }
.model-tag { font-size:11px; font-weight:700; color:var(--fg-2); background:var(--surface-3); border-radius:var(--r-full); padding:3px 9px; flex:none; }
.model-radio { width:18px; height:18px; border-radius:50%; border:2px solid var(--border-strong); flex:none; }
.model.sel .model-radio { border-color:var(--accent); background:var(--accent); box-shadow:inset 0 0 0 3px var(--surface); }
.prompt-box textarea { width:100%; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); padding:13px 15px; font-size:14.5px; line-height:1.55; resize:vertical; min-height:96px; outline:none; color:var(--fg-1); background:var(--surface-2); font-family:var(--font-body); transition:border-color .15s,box-shadow .15s; }
.prompt-box textarea:focus { border-color:var(--accent); background:var(--surface); box-shadow:0 0 0 3px var(--accent-wash); }


@media (max-width:767px) { .seg-item { flex:1 1 calc(50% - 4px); } }
@media (max-width:400px) { .seg-item { flex:1 1 100%; } }
.launcher-frame { width:min(620px,100%); }
.launcher-frame .new-session { min-height:0; display:flex; flex-direction:column; }
.launcher-frame .modal-body { min-height:0; }
@media (max-width:767px) { .launcher-frame .modal-x { width:44px; height:44px; }.launcher-frame input,.launcher-frame textarea { font-size:16px; }.launcher-frame .modal-head { padding-right:64px; } }
@media (max-width:767px) { .launcher-frame { padding-bottom:env(safe-area-inset-bottom); } }

/* UI R4: route-backed launcher and per-hat preferences. */
.launcher-frame { width:min(720px,calc(100vw - 48px)); max-height:calc(100dvh - 64px); border-radius:var(--radius-xl); }
.launcher-frame .modal-head { padding:20px 56px 12px 24px; }
.launcher-frame .modal-body { padding:8px 24px 24px; overflow-y:auto; }
.launcher-frame .launch-fields { display:flex; flex-direction:column; gap:20px; }
.launcher-frame .launch-fields > .field { margin:0; }
.launcher-frame .first-prompt { order:-1; }
.launcher-frame .modal-eyebrow { display:none; }
.launcher-frame .modal-foot { border-top:1px solid var(--hn-line); padding:16px 24px; }
.launcher-frame .seg-item { min-height:36px; border-width:1px; padding:8px 12px; }
.launcher-frame .seg-name { font-size:13px; }
.launcher-frame .prompt-box textarea { min-height:100px; font-size:14px; }
.launcher-frame .picker-path { white-space:normal; overflow-wrap:anywhere; }
.launch-section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.launch-config h2,.catalog-context h2,.defaults-editor h2 { font-size:14px; font-weight:600; margin:0; }
.launch-config { border-top:1px solid var(--hn-line); padding-top:16px; }
.config-summary { font-size:13px; overflow-wrap:anywhere; }
.config-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr)); gap:12px; margin:12px 0; }
.config-field { min-width:0; padding:12px; border:1px solid var(--hn-control); border-radius:var(--radius-md); background:var(--hn-panel); }
.config-select { display:flex; flex-direction:column; gap:8px; font:500 12px var(--font-display); }
.config-select select,.catalog-context select,.hat-editor-picker select,.defaults-screen input { width:100%; min-height:32px; padding:6px 10px; border:1px solid var(--hn-control-strong); border-radius:var(--radius-sm); color:var(--hn-fg-1); background:var(--hn-surface); }
.config-boolean { display:flex; align-items:center; gap:8px; min-height:32px; font:500 13px var(--font-display); }
.config-source { display:block; margin-top:8px; font-size:11px; color:var(--hn-fg-2); }
.config-source.override { color:var(--hn-accent-fg); }
.config-source.inherits { border-bottom:1px dashed var(--hn-control-strong); width:fit-content; }
.config-field > .btn { font-size:11px; white-space:normal; text-align:left; margin-top:8px; }
.config-warning { border-left:3px solid var(--st-warn-fg); padding:8px 12px; color:var(--st-warn-fg); background:var(--st-warn-bg); font-size:13px; }
.opt-out { display:flex; gap:10px; align-items:center; margin:12px 0; min-height:44px; }
.defaults-screen { width:100%; max-width:1200px; padding:24px; overflow-wrap:anywhere; }
.defaults-screen > header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.defaults-screen h1 { font-size:20px; margin:0; }
.defaults-screen p { font-size:13px; }
.catalog-context { margin:24px 0; padding:16px; border:1px solid var(--hn-line); border-radius:var(--radius-md); background:var(--hn-panel); display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:end; }
.catalog-context > div { grid-column:1/-1; }
.catalog-context label,.hat-editor-picker { display:flex; flex-direction:column; gap:8px; font-size:12px; }
.agent-tabs { display:flex; gap:8px; border-bottom:1px solid var(--hn-line); padding-bottom:8px; }
.agent-tabs button { border:0; padding:8px 16px; border-radius:var(--radius-sm); color:var(--hn-fg-2); background:transparent; }
.agent-tabs button[aria-selected="true"] { background:var(--hn-accent-wash); color:var(--hn-accent-fg); }
.defaults-matrix { width:100%; border-collapse:collapse; margin:24px 0; font-size:13px; table-layout:fixed; }
.defaults-matrix caption { text-align:left; font-size:12px; color:var(--hn-fg-2); padding-bottom:12px; }
.defaults-matrix th,.defaults-matrix td { border:1px solid var(--hn-line); padding:12px; text-align:left; overflow-wrap:anywhere; }
.defaults-matrix th { background:var(--hn-panel); font-weight:500; }
.hat-editor-picker { max-width:280px; margin:24px 0 16px; }
.defaults-editor { border:1px solid var(--hn-line); border-radius:var(--radius-lg); background:var(--hn-panel); padding:20px; }
.defaults-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; margin-top:20px; }
@media(max-width:767px) {
  .launcher-frame { width:100%; max-height:calc(100dvh - 24px); border-radius:20px 20px 0 0; margin-top:auto; }
  .launcher-frame .modal-head { padding:20px 64px 12px 16px; }
  .launcher-frame .modal-body { padding:8px 16px 20px; }
  .launcher-frame .launch-fields { gap:16px; }
  .launcher-frame .modal-foot { padding:12px 16px calc(12px + env(safe-area-inset-bottom)); }
  .launcher-frame .modal-foot .btn-primary { width:100%; min-height:48px; }
  .launcher-frame .seg-item,.config-field .btn,.agent-tabs button { min-height:44px; }
  .launcher-frame input,.launcher-frame textarea,.config-select select,.defaults-screen input,.defaults-screen select { font-size:16px; min-height:44px; }
  .defaults-screen { padding:16px; }
  .defaults-screen > header { flex-direction:column; }
  .catalog-context { grid-template-columns:1fr; }
  .defaults-matrix { display:none; }
  .defaults-editor { padding:16px; }
  .defaults-actions { flex-direction:column; }
  .defaults-actions > button { min-height:44px; }
}
.launch-choice { border:0; padding:0; min-width:0; }
.launch-choice legend { margin-bottom:10px; }
.launch-choice .seg-item { cursor:pointer; }
.launch-choice .seg-item:has(input:disabled) { opacity:.55; cursor:default; }
.launch-choice input[type="radio"] { accent-color:var(--hn-accent); flex:none; }
.launcher-frame .first-prompt { order:0; }
@media(max-width:767px) {
  .launcher-frame input[type="radio"] { min-height:0; width:16px; height:16px; margin:0; }
  .launcher-frame .seg-item { flex:1 1 calc(50% - 4px); min-width:0; overflow-wrap:anywhere; }
  .launcher-frame .prompt-box textarea { min-height:80px; }
  .launcher-frame .modal-foot { flex-wrap:wrap; }
  .launcher-frame .modal-foot .spacer { display:none; }
  .launcher-frame .modal-foot .btn-primary { flex:1 0 100%; }
}
.runtime-id { margin:12px 0; font-size:12px; }
.runtime-id summary { cursor:pointer; min-height:32px; padding:8px 0; }
.runtime-id label { display:block; }
@media(max-width:767px) { .runtime-id summary { min-height:44px; } }
.defaults-screen .config-boolean input,.launcher-frame .config-boolean input,.launcher-frame .opt-out input { width:16px; height:16px; min-height:0; margin:0; flex:none; accent-color:var(--hn-accent); }
@media(max-width:767px) {
  .defaults-screen button,.config-boolean,.launch-section-head button { min-height:44px; }
  .launcher-frame .launch-fields > a,.defaults-screen > header a { display:inline-flex; align-items:center; min-height:44px; }
}
.launch-fields { border:0; margin:0; padding:0; min-width:0; }
.picker-item { display:flex; align-items:center; gap:8px; }
.picker-time { margin-left:auto; display:inline-flex; align-items:center; gap:4px; flex:none; font-family:var(--font-body); font-size:11px; }
@media(max-width:767px) { .picker-item { min-height:44px; } }
.picker-item bdi { min-width:0; overflow-wrap:anywhere; }
```

### File: `web/src/test-launch-catalog.ts`

```typescript
import type { HostCatalog } from './generated/protocol'
export const select = (id: string, values: string[], category?: string) => ({ id, name: id, category, type: 'select', currentValue: values[0], options: values.map(value => ({ value, name: value })) })
export const catalog: HostCatalog = {
  agent: 'claude', adapter_revision: 'pin-1', freshness: 'fresh',
  config_options: [select('model', ['opus', 'sonnet']), select('mode', ['default', 'bypass']), select('effort', ['low', 'high']), { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false }, { id: 'sandbox', name: 'Sandbox', type: 'boolean', currentValue: true }],
  defaults: { model: 'opus', mode: 'default', axes: { fast: false, effort: 'low', sandbox: true } },
  security: { known: true, axes: { mode: ['default'] } },
}
```

### File: `web/src/lib/defaults.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { resolveDefaults, securityWarnings } from './defaults'

import { catalog, select } from '../test-launch-catalog'
describe('catalog-aware defaults', () => {
  it('prunes only inherited nonsecurity axes for Opus to Sonnet, preserving policy identities and deliberate effort', () => {
    const result = resolveDefaults(catalog, { model: 'sonnet', axes: { effort: 'high' } }, {}, { revision: 1, allowed: { claude: { sandbox: [true] } } })
    expect(result.config).toEqual({ model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } })
    expect(result.sources.model).toBe('Hat override')
    expect(result.sources.effort).toBe('Hat override')
    expect(result.sources.sandbox).toBe('Agent default')
  })
  it.each(['stored', 'explicit'])('preserves deliberate false as %s even on a different model', source => {
    const result = resolveDefaults(catalog, source === 'stored' ? { model: 'sonnet', axes: { fast: false } } : { model: 'sonnet' }, source === 'explicit' ? { fast: false } : {})
    expect(result.config.axes?.fast).toBe(false)
    expect(result.sources.fast).toBe(source === 'stored' ? 'Hat override' : 'Your choice')
  })
  it('omits unavailable stored values visibly without changing the stored record', () => {
    const saved = { model: 'removed', axes: { effort: 'medium' } }
    const result = resolveDefaults(catalog, saved)
    expect(result.config.model).toBe('opus')
    expect(result.config.axes?.effort).toBe('low')
    expect(result.notices).toHaveLength(2)
    expect(result.blocked).toBe(false)
    expect(saved.model).toBe('removed')
  })
  it('blocks invalid explicit choices instead of silently converting them to inheritance', () => {
    const result = resolveDefaults(catalog, {}, { model: 'removed', effort: 'medium' })
    expect(result.blocked).toBe(true)
    expect(result.notices).toHaveLength(2)
  })
  it('resets an individual choice to agent inheritance without reintroducing the hat override', () => {
    const result = resolveDefaults(catalog, { model: 'sonnet', mode: 'bypass' }, { model: null, mode: null })
    expect(result.config.model).toBe('opus')
    expect(result.config.mode).toBe('default')
    expect(result.sources.model).toBe('Agent default')
  })
  it('uses category identity, never friendly labels, for model/mode and profile security warnings', () => {
    const other = { ...catalog, config_options: [select('custom-model', ['opus', 'sonnet'], 'model'), select('permission', ['default', 'bypass'], 'mode')] }
    const result = resolveDefaults(other, { model: 'sonnet', mode: 'bypass' })
    expect(result.config).toEqual({ model: 'sonnet', mode: 'bypass' })
    expect(result.warnings).toHaveLength(1)
    expect(securityWarnings({ ...catalog, security: { known: false, axes: {} } }, {})).toHaveLength(1)
    expect(securityWarnings(catalog, { mode: 'default' })).toEqual([])
  })
  it('preserves baseline security axes even without an execution-policy grant', () => {
    const result = resolveDefaults({ ...catalog, security: { known: true, axes: { mode: ['default'], sandbox: [true] } } }, {}, { model: 'sonnet' })
    expect(result.config.axes).toEqual({ sandbox: true })
    expect(result.sources.model).toBe('Your choice')
  })
})
it('does not send unsupported baseline shapes and blocks unrepresentable security requirements', () => {
  const result = resolveDefaults({ ...catalog, config_options: [], security: { known: true, axes: { mode: ['default'] } } }, {})
  expect(result.config).toEqual({})
  expect(result.blocked).toBe(true)
  expect(result.notices.length).toBeGreaterThan(0)
})
it('preserves boolean false for opaque axis ids, including JavaScript object names', () => {
  const special = { ...catalog, config_options: [...catalog.config_options, { id: '__proto__', name: 'Custom', type: 'boolean', currentValue: true }] }
  const result = resolveDefaults(special, { axes: JSON.parse('{"__proto__":false}') })
  expect(Object.hasOwn(result.config.axes!, '__proto__')).toBe(true)
  expect(result.config.axes!['__proto__']).toBe(false)
})
it('requires read-back of profile security defaults even when the catalog has other usable settings', async () => {
  const { usableCatalog } = await import('./defaults')
  expect(usableCatalog(catalog)).toBe(true)
  expect(usableCatalog({ ...catalog, defaults: { model: 'opus' } })).toBe(false)
  expect(usableCatalog({ ...catalog, defaults: { ...catalog.defaults, axes: { sandbox: false } }, security: { known: true, axes: { sandbox: [false] } } })).toBe(false)
  const off = { ...catalog, config_options: [{ id: 'sandbox', name: 'Sandbox', type: 'boolean', currentValue: false }], defaults: { axes: { sandbox: false } }, security: { known: true, axes: { sandbox: [false] } } }
  expect(usableCatalog(off)).toBe(true)
})
it.each(['stale', 'unknown'] as const)('refuses a %s pre-start catalog instead of promising its choices', async freshness => {
  const { usableCatalog } = await import('./defaults')
  expect(usableCatalog({ ...catalog, freshness })).toBe(false)
})
it('requires an adapter revision and a nonempty supported settings list', async () => {
  const { usableCatalog } = await import('./defaults')
  expect(usableCatalog({ ...catalog, adapter_revision: '' })).toBe(false)
  expect(usableCatalog({ ...catalog, config_options: [], defaults: {}, security: { known: false, axes: {} } })).toBe(false)
})
it('excludes incompatible model shapes and axis ids that collide with a wire role', async () => {
  const { fieldsOf, usableCatalog } = await import('./defaults')
  const malformed = { ...catalog, config_options: [
    { id: 'model', name: 'Model', category: 'model', type: 'boolean', currentValue: false },
    select('permission', ['default', 'bypass'], 'mode'),
    select('mode', ['low', 'high'], 'thought_level'),
  ] }
  expect(fieldsOf(malformed).map(field => [field.key, field.option.id])).toEqual([['mode', 'permission']])
  expect(usableCatalog(malformed)).toBe(false)
  expect(resolveDefaults(malformed, {}, { mode: 'bypass' }).config).toEqual({ mode: 'bypass' })
})
```

### File: `web/src/lib/start-confirm.test.ts`

```typescript
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { json, stubServer } from '../test-server'
import { confirmStart } from './start'
const options = [
  { id: 'model', type: 'select', currentValue: 'sonnet', options: [{ value: 'sonnet' }] },
  { id: 'mode', type: 'select', currentValue: 'default', options: [{ value: 'default' }] },
  { id: 'effort', type: 'select', currentValue: 'high', options: [{ value: 'high' }] },
  { id: 'sandbox', type: 'boolean', currentValue: true },
]
function fixture(detail = { hat_id: 'hat-a', lifecycle: 'active' }, actual: object = { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } }, empty = false) {
  const server = stubServer({
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [] }),
    'GET /api/sessions/s-1': json(200, detail),
    'GET /api/sessions/s-1/catalog': json(200, { session_id: 's-1', config_options: empty ? [] : options, commands: [], ...actual }),
  })
  return { ...server, client: new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() }) }
}
afterEach(() => vi.useRealTimers())
it('confirms every requested model/mode/security/other value against actual read-back', async () => {
  const f = fixture()
  expect(await confirmStart(f.client, 's-1', 'hat-a', { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } })).toBe('confirmed')
})
it.each([
  { model: 'opus', mode: 'default', axes: { effort: 'high', sandbox: true } },
  { model: 'sonnet', mode: 'bypass', axes: { effort: 'high', sandbox: true } },
  { model: 'sonnet', mode: 'default', axes: { sandbox: true } },
  { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: false } },
])('refuses clamped or partial configuration %#', async actual => {
  const f = fixture(undefined, actual)
  expect(await confirmStart(f.client, 's-1', 'hat-a', { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } })).toBe('config_unconfirmed')
})
it('rejects actual-hat mismatch before checking config', async () => {
  const f = fixture({ hat_id: 'hat-b', lifecycle: 'active' })
  expect(await confirmStart(f.client, 's-1', 'hat-a', {})).toBe('hat_changed')
  expect(f.sent).toHaveLength(1)
})
it('does not treat a failed session as confirmation', async () => {
  const f = fixture({ hat_id: 'hat-a', lifecycle: 'failed' })
  expect(await confirmStart(f.client, 's-1', 'hat-a', {})).toBe('config_unconfirmed')
})
it('bounds waiting for missing evidence to 30 seconds, with no automatic release later', async () => {
  vi.useFakeTimers()
  const f = fixture(undefined, {}, true)
  const pending = confirmStart(f.client, 's-1', 'hat-a', {})
  await vi.advanceTimersByTimeAsync(30_000)
  expect(await pending).toBe('config_unconfirmed')
  expect(f.sent.every(sent => sent.method === 'GET')).toBe(true)
})
it('refuses a recorded configuration failure even if a later catalog happens to match', async () => {
  const server = stubServer({
    'GET /api/sessions/s-1': json(200, { hat_id: 'hat-a', lifecycle: 'active' }),
    'GET /api/sessions/s-1/catalog': json(200, { config_options: options, commands: [], model: 'sonnet' }),
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [{ kind: 'marker', marker: 'host_note', reason: 'config_failed' }] }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  expect(await confirmStart(client, 's-1', 'hat-a', { model: 'sonnet' })).toBe('config_unconfirmed')
})
it('rejects a stale flattened value when the actual option is no longer present', async () => {
  const server = stubServer({
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [] }),
    'GET /api/sessions/s-1': json(200, { hat_id: 'hat-a', lifecycle: 'active' }),
    'GET /api/sessions/s-1/catalog': json(200, { config_options: options, commands: [], model: 'sonnet', axes: { fast: false } }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  expect(await confirmStart(client, 's-1', 'hat-a', { model: 'sonnet', axes: { fast: false } })).toBe('config_unconfirmed')
})
it('shows the requested unsupported setting on its own session without putting values in the URL', async () => {
  const { rememberConfigurationReview, readStartNotice, sessionHref, startNoticeText } = await import('./start')
  const { catalog } = await import('../test-launch-catalog')
  rememberConfigurationReview('review-a', catalog, { model: 'sonnet', axes: { fast: false } })
  const url = sessionHref('review-a', { kind: 'prompt_failed', code: 'config_unconfirmed' })
  expect(url).not.toContain('sonnet')
  const notice = readStartNotice('?notice=prompt_failed&code=config_unconfirmed', 'review-a')!
  expect(startNoticeText(notice)).toContain('Fast: Off')
  expect(startNoticeText(readStartNotice('?notice=prompt_failed&code=config_unconfirmed', 'review-b')!)).not.toContain('Fast: Off')
})
it('checks the actual hat even for a deliberate unverified agent-default start', async () => {
  const f = fixture({ hat_id: 'hat-b', lifecycle: 'active' })
  expect(await confirmStart(f.client, 's-1', 'hat-a', {}, 30_000, false)).toBe('hat_changed')
  const sameHat = fixture()
  expect(await confirmStart(sameHat.client, 's-1', 'hat-a', {}, 30_000, false)).toBe('confirmed')
  expect(sameHat.sent.map(sent => sent.path)).toEqual(['/api/sessions/s-1'])
})
```

### File: `web/src/components/CatalogContext.test.tsx`

```tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import { catalog } from '../test-launch-catalog'
import { useLaunchContext } from './CatalogContext'
function Harness({ host, generation = 0 }: { host: string; generation?: number }) {
  const context = useLaunchContext(host, 'claude', '/project', 'hat-a', generation)
  return <output>{context.state}:{context.catalog?.adapter_revision}</output>
}
it('fences late catalog responses by whole host context and retry generation', async () => {
  let finish!: (response: Response) => void
  const late = new Promise<Response>(resolve => { finish = resolve })
  const server = stubServer({
    'GET /api/hosts/old/runtime-catalog?agent=claude&cwd=%2Fproject': () => late,
    'GET /api/hosts/new/runtime-catalog?agent=claude&cwd=%2Fproject': [json(200, { ...catalog, adapter_revision: 'pin-new' }), json(200, { ...catalog, adapter_revision: 'pin-newer' })],
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
    'GET /api/hats/hat-a/delegation-policy': json(200, { revision: 0, allowed: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  const view = (host: string, generation = 0) => <ClientContext.Provider value={client}><Harness host={host} generation={generation} /></ClientContext.Provider>
  const { rerender } = render(view('old'))
  await waitFor(() => expect(server.sent).toHaveLength(3))
  rerender(view('new'))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-new'))
  await act(async () => { finish(json(200, { ...catalog, adapter_revision: 'pin-old' })); await late })
  expect(screen.getByRole('status')).toHaveTextContent('ready:pin-new')
  rerender(view('new', 1))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:pin-newer'))
})
it('does not reuse an earlier ready result when a context is left and re-entered', async () => {
  let finishA!: (response: Response) => void, finishB!: (response: Response) => void
  const lateA = new Promise<Response>(resolve => { finishA = resolve }), lateB = new Promise<Response>(resolve => { finishB = resolve })
  const server = stubServer({
    'GET /api/hosts/a/runtime-catalog?agent=claude&cwd=%2Fproject': [json(200, { ...catalog, adapter_revision: 'a-old' }), () => lateA],
    'GET /api/hosts/b/runtime-catalog?agent=claude&cwd=%2Fproject': () => lateB,
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 0, config: {} }),
    'GET /api/hats/hat-a/delegation-policy': json(200, { revision: 0, allowed: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  const view = (host: string) => <ClientContext.Provider value={client}><Harness host={host} /></ClientContext.Provider>
  const { rerender } = render(view('a'))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:a-old'))
  rerender(view('b'))
  rerender(view('a'))
  expect(screen.getByRole('status')).toHaveTextContent('loading:')
  await act(async () => { finishA(json(200, { ...catalog, adapter_revision: 'a-new' })); await lateA })
  expect(screen.getByRole('status')).toHaveTextContent('ready:a-new')
  await act(async () => { finishB(json(200, { ...catalog, adapter_revision: 'b-late' })); await lateB })
  expect(screen.getByRole('status')).toHaveTextContent('ready:a-new')
})
```

### File: `web/src/components/DefaultsEditor.test.tsx`

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import { catalog } from '../test-launch-catalog'
import type { HatSessionDefaults, HostCatalog } from '../generated/protocol'
import DefaultsEditor from './DefaultsEditor'
const hat = { id: 'hat-a', name: 'Research', colour: '#64748b', created_at: '', default_for_new_hosts: false, purging: false }
function mount(config: HatSessionDefaults['config'], preview: HostCatalog | null = catalog, status = 200) {
  const server = stubServer({ 'PUT /api/hats/hat-a/session-defaults?agent=claude': json(status, status === 200 ? { hat_id: 'hat-a', agent: 'claude', revision: 2, config: {} } : { code: 'defaults_changed', message: 'Reload required' }) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/defaults', search: '' }), stepUp: vi.fn() })
  const saved = vi.fn(), reload = vi.fn()
  render(<ClientContext.Provider value={client}><DefaultsEditor hat={hat} record={{ hat_id: hat.id, agent: 'claude', revision: 1, config }} catalog={preview} onSaved={saved} onReload={reload} /></ClientContext.Provider>)
  return { ...server, saved, reload }
}
it('resets offline, confirms the affected hat/agent, and sends the saved revision', async () => {
  const f = mount({ model: 'unavailable' }, null)
  fireEvent.click(screen.getByRole('button', { name: 'Reset model to inherited' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save defaults' }))
  expect(screen.getByRole('dialog', { name: 'Save defaults for Research' })).toHaveTextContent('Research / claude')
  fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }))
  await waitFor(() => expect(f.saved).toHaveBeenCalled())
  expect(f.sent[0].body).toEqual({ revision: 1, config: {} })
})
it('keeps edits on a revision conflict and requires deliberate reload', async () => {
  const f = mount({ mode: 'bypass' }, catalog, 409)
  fireEvent.click(screen.getByRole('button', { name: 'Reset mode to inherited' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save defaults' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Your edits are retained'))
  expect(screen.getByRole('button', { name: 'Save defaults' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Reload and review' }))
  expect(f.reload).toHaveBeenCalledOnce()
})
it('preserves false as an explicit override and shows reduced-prompting warning', () => {
  mount({ mode: 'bypass', axes: { fast: false } })
  expect(screen.getByRole('checkbox', { name: 'Fast' })).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Reset Fast to inherited' })).toBeEnabled()
  expect(screen.getByText('mode is outside the agent’s permission baseline. The agent may act with fewer prompts.', { exact: true })).toBeVisible()
})
it('holds a new replacement when its catalog context is no longer usable', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), here: () => ({ pathname: '/defaults', search: '' }), stepUp: vi.fn() })
  const record = { hat_id: hat.id, agent: 'claude', revision: 0, config: {} }
  const view = (preview: HostCatalog | null) => <ClientContext.Provider value={client}><DefaultsEditor hat={hat} record={record} catalog={preview} onSaved={vi.fn()} onReload={vi.fn()} /></ClientContext.Provider>
  const { rerender } = render(view(catalog))
  fireEvent.change(screen.getByRole('combobox', { name: 'model' }), { target: { value: 'sonnet' } })
  expect(screen.getByRole('button', { name: 'Save defaults' })).toBeEnabled()
  rerender(view(null))
  expect(screen.getByRole('button', { name: 'Save defaults' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('A chosen value is unavailable in this preview.')
})
it('pins the edited revision when a later record arrives instead of silently rebasing the write', async () => {
  const server = stubServer({ 'PUT /api/hats/hat-a/session-defaults?agent=claude': json(409, { code: 'defaults_changed', message: 'Defaults changed' }) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/defaults', search: '' }), stepUp: vi.fn() })
  const view = (revision: number) => <ClientContext.Provider value={client}><DefaultsEditor hat={hat} record={{ hat_id: hat.id, agent: 'claude', revision, config: {} }} catalog={catalog} onSaved={vi.fn()} onReload={vi.fn()} /></ClientContext.Provider>
  const { rerender } = render(view(1))
  fireEvent.change(screen.getByRole('combobox', { name: 'mode' }), { target: { value: 'bypass' } })
  rerender(view(2))
  fireEvent.click(screen.getByRole('button', { name: 'Save defaults' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }))
  await waitFor(() => expect(server.sent).toHaveLength(1))
  expect(server.sent[0].body).toEqual({ revision: 1, config: { mode: 'bypass' } })
})
```

### File: `web/src/screens/NewSession.test.tsx`

```tsx
// The New Session screen (frontend spec §7): hosts, agents, the project
// picker, the hat preview, Start then the first prompt, every refusal of a
// start, and the session it opens as an explicit selection.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { DESKTOP } from '../components/Shell'
import type { HatItem, HostItem, HostProjects } from '../generated/protocol'
import type { SessionSummary } from '../generated/view'
import type { HostAgentChoices } from '../lib/agents'
import { newSessionHref, readStartNotice } from '../lib/start'
import { navigate } from '../router'
import { json, stubServer, type Answer } from '../test-server'
import { liveStream } from '../test-stream'
import { completeLogout } from '../pwa/logout'
import NewSession, { RESOLVE_DEBOUNCE_MS } from './NewSession'

// The agents a test wants `agentsFor` to answer, or `null` for its own.
const agents = vi.hoisted(() => ({ current: null as HostAgentChoices | null }))
vi.mock('../lib/agents', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/agents')>()
  return {
    ...real,
    agentsFor: (client: Client, hostId: string) =>
      agents.current ? Promise.resolve(agents.current) : real.agentsFor(client, hostId),
  }
})

function host(id: string, name: string, patch: Partial<HostItem> = {}): HostItem {
  return {
    host_id: id,
    name,
    platform: 'linux',
    host_version: '0.1.0',
    capabilities: ['projects', 'resolve_path'],
    default_hat_id: 'hat-a',
    workspace_roots: ['/srv/work'],
    connected: true,
    mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' },
    created_at: '2026-10-01T00:00:00Z',
    ...patch,
  }
}

// Server order: an offline host between two connected ones, and a revoked one.
const HOSTS = [
  host('h1', 'laptop'),
  host('h2', 'server', { connected: false }),
  host('h3', 'retired', { revoked_at: '2026-10-01T12:00:00Z' }),
  host('h4', 'desk'),
]

function hat(id: string, name: string): HatItem {
  return { id, name, colour: '#112233', created_at: '2026-10-01T00:00:00Z', default_for_new_hosts: false, purging: false }
}
const HATS = [hat('hat-a', 'Work'), hat('hat-b', 'Home')]

const PROJECTS: HostProjects = {
  recents_hat_id: 'hat-a',
  // Recents come first, so a recent prefix match (cat-tools) is held before
  // the exact one (cat): only the ranking puts `cat` first.
  recents: [
    { path: '/srv/work/data-cat', last_used_at: '2026-10-01T10:00:00Z' },
    { path: '/srv/work/cat-tools', last_used_at: '2026-09-30T10:00:00Z' },
  ],
  items: [
    { path: '/srv/work/concat' },
    { path: '/srv/work/chart' },
    { path: '/srv/work/catalog' },
    { path: '/srv/work/cat' },
    { path: '/srv/work/one/app' },
    { path: '/srv/work/two/app' },
  ],
  partial: false,
  home: '/srv/work',
}

const RESOLVED = { canonical: '/srv/work/cat', exists: true, is_dir: true, hat_id: 'hat-a' }

function base(): Record<string, Answer | Answer[]> {
  const config_options = [{ id: 'model', name: 'Model', type: 'select', currentValue: 'a', options: [{ value: 'a', name: 'A' }] }]
  const catalog = { agent: 'claude', adapter_revision: 'test', freshness: 'fresh', config_options, defaults: {}, security: { known: true, axes: {} } }
  const settings: Record<string, Answer> = {}
  for (const hostId of ['h1', 'h4']) for (const agent of ['claude', 'codex', 'my-agent']) settings[`GET /api/hosts/${hostId}/runtime-catalog?agent=${agent}&cwd=%2Fsrv%2Fwork%2Fcat`] = json(200, { ...catalog, agent })
  for (const agent of ['claude', 'codex', 'my-agent']) for (const hatId of ['hat-a','hat-b']) settings[`GET /api/hats/${hatId}/session-defaults?agent=${agent}`] = json(200, { hat_id: hatId, agent, revision: 0, config: {} })
  return {
    ...settings,
    'GET /api/hats/hat-a/delegation-policy': json(200, { revision: 0, allowed: {} }),
    'GET /api/hats/hat-b/delegation-policy': json(200, { revision: 0, allowed: {} }),
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [] }),
    'GET /api/sessions/s-1': json(200, { session_id: 's-1', hat_id: 'hat-a', lifecycle: 'active' }),
    'GET /api/sessions/s-1/catalog': json(200, { session_id: 's-1', config_options, commands: [] }),
    'GET /api/hosts': json(200, HOSTS),
    'GET /api/hats': json(200, HATS),
    'GET /api/hosts/h1/projects': json(200, PROJECTS),
    'GET /api/hosts/h4/projects': json(200, { ...PROJECTS, recents: [], items: [] }),
    'POST /api/hats/resolve': json(200, RESOLVED),
    'POST /api/sessions': json(202, { session_id: 's-1' }),
    'POST /api/sessions/s-1/prompt': json(202, { turn_id: 't-1' }),
  }
}

function mount(routes: Record<string, Answer | Answer[]> = {}, path = '/new') {
  history.replaceState(null, '', path)
  const server = stubServer({ ...base(), ...routes })
  const client = new Client({
    fetch: server.fetch,
    navigate: (to) => navigate(to),
    here: () => ({ pathname: location.pathname, search: location.search }),
    stepUp: async () => {},
  })
  const view = render(
    <ClientContext.Provider value={client}>
      <NewSession />
    </ClientContext.Provider>,
  )
  return { ...server, client, unmount: view.unmount }
}

it('predicts delivery for the resolved hat and chosen agent', async () => {
  mount({ 'GET /api/hosts': json(200, [host('h1', 'laptop', {
    capabilities: ['projects', 'resolve_path', 'mcp_servers'],
    mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' },
  })]) })
  const field = await screen.findByRole('combobox', { name: /^Project/ })
  await userEvent.type(field, '/srv/work/cat')
  await waitFor(() => expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent("This agent was given only this hat's MCP servers."))
  await userEvent.click(screen.getByRole('radio', { name: 'Codex' }))
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('not isolated per hat')
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('~/.codex')
})

const hostButton = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) })
const projectField = () => screen.findByRole('combobox', { name: /^Project/ })
const startButton = () => screen.getByRole('button', { name: /Start session/ })
const posts = (sent: { method: string; path: string }[]) => sent.filter((s) => s.method === 'POST').map((s) => s.path)

/** Host laptop, Claude, `path` typed as a path, `prompt` typed. */
async function fill(path = '/srv/work/cat', prompt = '') {
  const user = userEvent.setup()
  await screen.findByRole('radio', { name: 'Claude' })
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Claude' })).toBeChecked())
  await user.type(await projectField(), path)
  if (prompt) await user.type(screen.getByLabelText(/^First prompt/), prompt)
  return user
}

beforeEach(() => {
  agents.current = null
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  history.replaceState(null, '', '/')
})

describe('hosts', () => {
  it('lists connected hosts first and offline ones disabled, never a revoked one', async () => {
    mount()
    await screen.findByRole('radio', { name: /^laptop/ })
    const group = screen.getByRole('group', { name: /Host/ })
    const names = within(group)
      .getAllByRole('radio')
      .map((b) => b.closest('label')?.querySelector('.seg-name')?.textContent)
    expect(names).toEqual(['laptop', 'desk', 'server'])
    expect(hostButton('server')).toBeDisabled()
    expect(hostButton('server').closest('label')).toHaveTextContent('offline')
    expect(hostButton('laptop')).toBeEnabled()
    expect(screen.queryByRole('button', { name: /retired/ })).toBeNull()
  })

  it('picks the first connected host', async () => {
    mount({ 'GET /api/hosts': json(200, [host('h2', 'server', { connected: false }), host('h4', 'desk')]) })
    await waitFor(() => expect(hostButton('desk')).toBeChecked())
  })

  it('prefills a link’s text that is not a path as a search: no path until a project is picked', async () => {
    const server = mount({}, '/new?host=h1&cwd=cat')
    await waitFor(() => expect(hostButton('laptop')).toBeChecked())
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Claude' })).toBeChecked())
    expect(await projectField()).toHaveValue('cat')
    expect(startButton()).toBeDisabled()
    await new Promise((r) => setTimeout(r, RESOLVE_DEBOUNCE_MS + 50))
    expect(server.sent.some((s) => s.path === '/api/hats/resolve')).toBe(false)
  })

  it('prefills the host and the path from a link', async () => {
    mount({}, '/new?host=h4&cwd=%2Fsrv%2Fwork%2Fapp')
    await waitFor(() => expect(hostButton('desk')).toBeChecked())
    expect(await projectField()).toHaveValue('/srv/work/app')
  })

  it('prefills from the link a failed session offers, whatever its path holds', async () => {
    mount({}, newSessionHref('h4', '/srv/work/a b&c=d#e?f+g%h'))
    await waitFor(() => expect(hostButton('desk')).toBeChecked())
    expect(await projectField()).toHaveValue('/srv/work/a b&c=d#e?f+g%h')
  })

  it('says why a prefilled offline host is not chosen, and chooses none', async () => {
    mount({}, '/new?host=h2&cwd=%2Fsrv%2Fwork%2Fapp')
    expect(await screen.findByText(/server is offline, so the session cannot start there/)).toBeInTheDocument()
    expect(hostButton('laptop')).not.toBeChecked()
    expect(screen.queryByRole('combobox', { name: /^Project/ })).toBeNull()
  })
})

describe('agents', () => {
  it('offers the fallback agents and Other, and starts one named by hand', async () => {
    const server = mount()
    const user = await fill()
    expect(screen.getByRole('radio', { name: 'Codex' })).toBeEnabled()
    await user.click(screen.getByRole('radio', { name: 'Other…' }))
    await user.type(screen.getByRole('textbox', { name: 'Agent name' }), 'my-agent')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toEqual({
      host_id: 'h1',
      agent: 'my-agent',
      cwd: '/srv/work/cat',
    })
    // The fallback asks the server nothing.
    expect(server.sent.some((s) => s.path.endsWith('/agents'))).toBe(false)
  })

  it('disables an agent not signed in with its note, and lists no unavailable one', async () => {
    agents.current = {
      agents: [
        { agent: 'claude', available: true, auth: 'unknown', cli: 'bundled' },
        { agent: 'codex', available: true, auth: 'missing', cli: 'bundled', note: 'Run the login on the host.' },
        { agent: 'gemini', available: false, auth: 'ok', cli: 'given' },
      ],
      other: false,
    }
    mount()
    const codex = await screen.findByRole('radio', { name: /^Codex/ })
    expect(codex).toBeDisabled()
    expect(codex.closest('label')).toHaveTextContent('Run the login on the host.')
    expect(screen.getByRole('radio', { name: 'Claude' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /gemini/i })).toBeNull()
    expect(screen.queryByRole('radio', { name: 'Other…' })).toBeNull()
  })
})

describe('project picker', () => {
  it('ranks exact, prefix, substring, subsequence, recents first within a rank', async () => {
    mount()
    await screen.findByText(/Recent projects of the hat/)
    const user = userEvent.setup()
    await user.type(await projectField(), 'cat')
    const options = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((o) => o.querySelector('bdi')?.textContent)
    expect(options).toEqual(['cat', 'cat-tools', 'catalog', 'data-cat', 'concat', 'chart'])
  })

  it('labels colliding names as parent and name', async () => {
    mount()
    await screen.findByText(/Recent projects of the hat/)
    const user = userEvent.setup()
    await user.type(await projectField(), 'app')
    const options = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toEqual(['one/app', 'two/app'])
  })

  it('names the hat the recents belong to and marks them', async () => {
    mount()
    expect(await screen.findByText(/Recent projects of the hat/)).toHaveTextContent('Recent projects of the hat Work')
    const user = userEvent.setup()
    await user.click(await projectField())
    expect(screen.getByRole('option', { name: /data-cat/ })).toHaveTextContent('recent')
  })

  it('asks for the recents of the hat the chosen path resolves to', async () => {
    const notes = { canonical: '/srv/notes', exists: true, is_dir: true, hat_id: 'hat-b' }
    const server = mount({
      'POST /api/hats/resolve': json(200, notes),
      'GET /api/hosts/h1/projects?path=%2Fsrv%2Fnotes': json(200, {
        ...PROJECTS,
        recents_hat_id: 'hat-b',
        recents: [{ path: '/srv/notes', last_used_at: '2026-10-01T10:00:00Z' }],
      }),
    })
    await fill('~/notes')
    await waitFor(() => expect(screen.getByText(/Recent projects of the hat/)).toHaveTextContent('of the hat Home'), {
      timeout: 3000,
    })
    expect(server.sent.map((s) => s.path)).toContain('/api/hosts/h1/projects?path=%2Fsrv%2Fnotes')
  })

  it('says the host listed only some of its repositories', async () => {
    mount({ 'GET /api/hosts/h1/projects': json(200, { ...PROJECTS, partial: true }) })
    expect(await screen.findByText('The host listed only some of its repositories.', { exact: true })).toBeInTheDocument()
  })

  it('says the projects could not be listed, and a path can still be typed', async () => {
    const server = mount({ 'GET /api/hosts/h1/projects': json(409, { code: 'host_offline', message: 'the host is not connected' }) })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/^Projects could not be listed: .+ You can still type a path\.$/)
    const user = await fill('/srv/work/cat')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '/srv/work/cat' })
  })

  it('tells a screen reader which option the arrow keys reach, and names the list only while it shows', async () => {
    mount()
    await screen.findByText(/Recent projects of the hat/)
    const field = await projectField()
    expect(field).not.toHaveAttribute('aria-controls')
    const user = userEvent.setup()
    await user.type(field, 'cat')
    const list = screen.getByRole('listbox')
    expect(field).toHaveAttribute('aria-controls', list.id)
    expect(field).not.toHaveAttribute('aria-activedescendant')
    const options = within(list).getAllByRole('option')
    await user.keyboard('{ArrowDown}')
    expect(document.getElementById(field.getAttribute('aria-activedescendant')!)).toBe(options[0])
    await user.keyboard('{ArrowDown}')
    expect(document.getElementById(field.getAttribute('aria-activedescendant')!)).toBe(options[1])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(field).not.toHaveAttribute('aria-activedescendant')
    expect(field).not.toHaveAttribute('aria-controls')
  })

  it('says why a directory could not be browsed', async () => {
    mount({ 'GET /api/hosts/h1/browse?path=%2Fsrv%2Fwork': json(409, { code: 'host_offline', message: 'the host is not connected' }) })
    await screen.findByText(/Recent projects of the hat/)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    const panel = await screen.findByRole('group', { name: 'Browse directories' })
    expect(await within(panel).findByRole('alert')).toHaveTextContent(/\S/)
    expect(within(panel).getByText('/srv/work', { exact: true })).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Use this directory' })).toBeNull()
  })

  it('says when not every directory is listed', async () => {
    mount({
      'GET /api/hosts/h1/browse?path=%2Fsrv%2Fwork': json(200, { path: '/srv/work', entries: [{ name: 'atlas' }], truncated: true }),
    })
    await screen.findByText(/Recent projects of the hat/)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    const panel = await screen.findByRole('group', { name: 'Browse directories' })
    expect(await within(panel).findByText('Not every directory is listed.', { exact: true })).toBeInTheDocument()
  })

  it('takes text starting with a slash or a tilde as a path, not a search', async () => {
    const server = mount()
    const user = await fill('~/work/cat')
    expect(screen.queryByRole('listbox')).toBeNull()
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '/srv/work/cat' })
  })

  it('a search is no path until a project is picked', async () => {
    mount()
    await screen.findByText(/Recent projects of the hat/)
    const user = userEvent.setup()
    await user.type(await projectField(), 'catal')
    expect(startButton()).toBeDisabled()
    await user.click(screen.getByRole('option', { name: /catalog/ }))
    expect(await projectField()).toHaveValue('catalog')
    await waitFor(() => expect(startButton()).toBeEnabled())
  })

  it('browses the host directories and uses the one chosen', async () => {
    const server = mount({
      'POST /api/hats/resolve': json(200, { ...RESOLVED, canonical: '/srv/work/atlas' }),
      'GET /api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fsrv%2Fwork%2Fatlas': base()['GET /api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fsrv%2Fwork%2Fcat'],
      'GET /api/hosts/h1/browse?path=%2Fsrv%2Fwork': json(200, {
        path: '/srv/work',
        parent: '/srv',
        entries: [{ name: 'atlas', git: true }],
        truncated: false,
      }),
      'GET /api/hosts/h1/browse?path=%2Fsrv%2Fwork%2Fatlas': json(200, {
        path: '/srv/work/atlas',
        parent: '/srv/work',
        entries: [],
        truncated: false,
      }),
    })
    await screen.findByText(/Recent projects of the hat/)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    const panel = await screen.findByRole('group', { name: 'Browse directories' })
    await user.click(await within(panel).findByRole('button', { name: 'atlas' }))
    await within(panel).findByText('/srv/work/atlas')
    await user.click(within(panel).getByRole('button', { name: 'Use this directory' }))
    expect(screen.queryByRole('group', { name: 'Browse directories' })).toBeNull()
    expect(await projectField()).toHaveValue('atlas')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '/srv/work/atlas' })
  })
})

describe('hat preview', () => {
  it('resolves the hat only once the path has rested', async () => {
    const server = mount()
    const field = await projectField()
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Claude' })).toBeChecked())
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const resolves = () => server.sent.filter((s) => s.path === '/api/hats/resolve')
    for (const text of ['/s', '/srv/wo', '/srv/work/cat']) {
      fireEvent.change(field, { target: { value: text } })
      await act(async () => {
        vi.advanceTimersByTime(RESOLVE_DEBOUNCE_MS - 100)
      })
    }
    expect(resolves()).toHaveLength(0)
    await act(async () => {
      vi.advanceTimersByTime(99)
    })
    expect(resolves()).toHaveLength(0)
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(resolves().map((s) => s.body)).toEqual([{ host_id: 'h1', path: '/srv/work/cat' }])
    vi.useRealTimers()
    expect(await screen.findByText(/^Starts in the hat/)).toHaveTextContent('Starts in the hat Work at /srv/work/cat')
  })

  it('says when the path is not a directory', async () => {
    mount({ 'POST /api/hats/resolve': json(200, { ...RESOLVED, canonical: '/srv/work/cat.txt', exists: true, is_dir: false }) })
    await fill('/srv/work/cat.txt')
    expect(await screen.findByText(/^Starts in the hat/, undefined, { timeout: 3000 })).toHaveTextContent(
      /^Starts in the hat Work at \/srv\/work\/cat\.txt: this is not a directory$/,
    )
  })

  it('shows a refused resolve as an alert under the preview', async () => {
    mount({ 'POST /api/hats/resolve': json(400, { code: 'invalid_cwd', message: '"/srv/work/x" is not a directory on that host' }) })
    await fill('/srv/work/x')
    const alert = await screen.findByText('"/srv/work/x" is not a directory on that host', { exact: true }, { timeout: 3000 })
    expect(alert.closest('[role="alert"]')).not.toBeNull()
  })

  it('says when the directory does not exist yet', async () => {
    mount({ 'POST /api/hats/resolve': json(200, { ...RESOLVED, canonical: '/srv/work/new', exists: false, is_dir: false }) })
    await fill('/srv/work/new')
    expect(await screen.findByText(/^Starts in the hat/, undefined, { timeout: 3000 })).toHaveTextContent(
      'this directory does not exist yet',
    )
  })
})

describe('start', () => {
  it('starts the session, then sends the first prompt, then opens the session', async () => {
    const server = mount()
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(location.search).toBe('')
    expect(posts(server.sent).filter((p) => p !== '/api/hats/resolve')).toEqual([
      '/api/sessions',
      '/api/sessions/s-1/prompt',
    ])
    expect(server.sent.find((s) => s.path === '/api/sessions/s-1/prompt')?.body).toEqual({
      content: [{ type: 'text', text: 'Fix the tests' }],
    })
  })

  it('sends no prompt when the first prompt is empty', async () => {
    const server = mount()
    const user = await fill('/srv/work/cat', '   ')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(posts(server.sent)).not.toContain('/api/sessions/s-1/prompt')
  })

  it.each([
    ['hat_ambiguous', 409, 'the rule for "/srv/Work" matches only in another case', /more than one hat.*the rule for/],
    ['host_offline', 409, 'the host has not connected since it was paired', /^the host has not connected since it was paired$/],
    ['invalid_cwd', 400, '"/srv/work/cat" is not a directory on that host', /^"\/srv\/work\/cat" is not a directory on that host$/],
    ['unknown_host', 400, 'no host is paired with that id', /^That host is no longer paired/],
    ['start_failed', 502, 'the adapter exited', /^The host refused to start the session \(start_failed\): the adapter exited$/],
  ])('says why a start was refused: %s', async (code, status, message, shown) => {
    const server = mount({ 'POST /api/sessions': json(status, { code, message }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    const alert = await screen.findByText(shown)
    expect(alert.closest('[role="alert"]')).not.toBeNull()
    expect(location.pathname).toBe('/new')
    expect(posts(server.sent)).not.toContain('/api/sessions/s-1/prompt')
    // The form stays, ready for another try.
    expect(startButton()).toBeEnabled()
    expect(screen.getByLabelText(/^First prompt/)).toHaveValue('Fix the tests')
  })

  it('a start whose delivery is unknown opens its session with a notice and keeps the prompt', async () => {
    const server = mount({
      'POST /api/sessions': json(503, {
        code: 'delivery_unknown',
        message: 'host disconnected; delivery unknown',
        session_id: 's-9',
      }),
    })
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-9'))
    expect(location.search).toBe('?notice=start_unknown_draft')
    expect(sessionStorage.getItem('hennery.draft.s-9')).toBe('Fix the tests')
    expect(posts(server.sent).some((p) => p.endsWith('/prompt'))).toBe(false)
  })

  it('a start whose delivery is unknown, with no first prompt, says nothing of a draft', async () => {
    mount({ 'POST /api/sessions': json(503, { code: 'delivery_unknown', message: 'gone', session_id: 's-9' }) })
    const user = await fill('/srv/work/cat')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-9'))
    expect(location.search).toBe('?notice=start_unknown')
    expect(sessionStorage.getItem('hennery.draft.s-9')).toBeNull()
  })

  it('a delivery unknown that names no session stays on the form', async () => {
    mount({ 'POST /api/sessions': json(503, { code: 'delivery_unknown', message: 'gone' }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    expect(await screen.findByText(/its outcome is not known/)).toBeInTheDocument()
    expect(location.pathname).toBe('/new')
  })

  it('a refused first prompt opens the session with a notice and keeps the prompt as its draft', async () => {
    mount({ 'POST /api/sessions/s-1/prompt': json(409, { code: 'host_offline', message: 'the host is not connected' }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(location.search).toBe('?notice=prompt_failed&code=host_offline')
    expect(sessionStorage.getItem('hennery.draft.s-1')).toBe('Fix the tests')
  })
})

describe('changing the host', () => {
  it('resets the agent, the path and the browser', async () => {
    mount({
      'GET /api/hosts/h1/browse?path=%2Fsrv%2Fwork%2Fcat': json(200, {
        path: '/srv/work/cat',
        entries: [],
        truncated: false,
      }),
    })
    const user = await fill('/srv/work/cat')
    await user.click(screen.getByRole('radio', { name: 'Codex' }))
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    await screen.findByRole('group', { name: 'Browse directories' })
    await screen.findByText(/^Starts in the hat/, undefined, { timeout: 3000 })

    await user.click(hostButton('desk'))
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Claude' })).toBeChecked())
    expect(screen.getByRole('radio', { name: 'Codex' })).not.toBeChecked()
    expect(await projectField()).toHaveValue('')
    expect(screen.queryByRole('group', { name: 'Browse directories' })).toBeNull()
    expect(screen.queryByText(/^Starts in the hat/)).toBeNull()
    expect(startButton()).toBeDisabled()
  })
})

describe('in the app', () => {
  function summary(id: string, hat_id: string): SessionSummary {
    return {
      session_id: id,
      host_id: 'h1',
      agent: 'claude',
      cwd: `/srv/work/${id}`,
      hat_id,
      lifecycle: 'active',
      activity: 'idle',
      presumed_parked: false,
      created_at: '2026-10-01T00:00:00.000Z',
      last_event_at: '2026-10-02T10:00:00.000Z',
      question_waits: false,
        operator_attention: 0,
        parent_handled_questions: 0,
    }
  }

  it('opens the started session as an explicit selection, even outside the hat', async () => {
    window.matchMedia = ((query: string) => ({
      matches: query === DESKTOP,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    localStorage.setItem('hennery.hat', 'hat-a')
    history.replaceState(null, '', '/new')
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://h')
      const method = init?.method ?? 'GET'
      switch (`${method} ${url.pathname}`) {
        case 'GET /api/capabilities':
          return json(200, { mode: 'full', features: [] })
        case 'GET /api/hats':
          return json(200, HATS)
        case 'GET /api/hosts':
          return json(200, HOSTS)
        case 'GET /api/hosts/h1/projects':
          return json(200, PROJECTS)
        case 'GET /api/hosts/h1/runtime-catalog':
          return base()['GET /api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fsrv%2Fwork%2Fcat'] as Response
        case 'GET /api/hats/hat-b/session-defaults':
          return json(200, { hat_id: 'hat-b', agent: 'claude', revision: 0, config: {} })
        case 'GET /api/hats/hat-b/delegation-policy':
          return json(200, { revision: 0, allowed: {} })
        case 'POST /api/hats/resolve':
          return json(200, { ...RESOLVED, hat_id: 'hat-b' })
        case 'POST /api/sessions':
          return json(202, { session_id: 's-new' })
        case 'GET /api/view/sessions':
          return json(200, {
            sessions: [summary('old', 'hat-a'), summary('s-new', 'hat-b')],
            epoch: 'e1',
            revision: 1,
          })
        case 'GET /api/stream/sessions':
          return liveStream().response
        default:
          return json(404, { code: 'not_found', message: url.pathname })
      }
    })
    render(<App fetchImpl={fetch as unknown as typeof globalThis.fetch} />)
    expect(await screen.findByRole('heading', { name: 'New session' })).toBeInTheDocument()
    const user = await fill('/srv/work/cat')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-new'))
    // The list stream opened, and its known rows did not replace the explicit route.
    await waitFor(() => expect(fetch.mock.calls.filter(([input]) => new URL(String(input), 'http://h').pathname === '/api/stream/sessions')).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 50))
    expect(location.pathname).toBe('/sessions/s-new')
    // @ts-expect-error jsdom has none; each test sets its own
    delete window.matchMedia
  })
})

describe('reviewed configuration', () => {
  const options = [
    { id: 'model', name: 'Model', type: 'select', currentValue: 'opus', options: [{ value: 'opus', name: 'Opus' }, { value: 'sonnet', name: 'Sonnet' }] },
    { id: 'mode', name: 'Permission', type: 'select', currentValue: 'default', options: [{ value: 'default', name: 'Default' }, { value: 'bypass', name: 'Bypass' }] },
    { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
  ]
  const runtime = '/api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fsrv%2Fwork%2Fcat'
  const catalog = { agent: 'claude', adapter_revision: 'pin-1', freshness: 'fresh', config_options: options, defaults: { model: 'opus', mode: 'default', axes: { fast: false } }, security: { known: true, axes: { mode: ['default'] } } }
  it('applies a saved Sonnet model, prunes inherited fast and confirms actual settings before the first prompt', async () => {
    const server = mount({
      [`GET ${runtime}`]: json(200, catalog),
      'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 1, config: { model: 'sonnet' } }),
      'GET /api/sessions/s-1/catalog': json(200, { session_id: 's-1', config_options: options.slice(0, 2).map(option => ({ ...option, currentValue: option.id === 'model' ? 'sonnet' : 'default' })), commands: [], model: 'sonnet', mode: 'default' }),
    })
    const user = await fill('/srv/work/cat', 'Keep this prompt')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find(s => s.path === '/api/sessions')?.body).toEqual({ host_id: 'h1', agent: 'claude', cwd: '/srv/work/cat', model: 'sonnet', mode: 'default' })
    const read = server.sent.findIndex(s => s.path === '/api/sessions/s-1/catalog')
    const prompt = server.sent.findIndex(s => s.path === '/api/sessions/s-1/prompt')
    expect(prompt).toBeGreaterThan(read)
  })
  it('retains unsupported deliberate fast=false and holds the prompt when read-back omits it', async () => {
    const server = mount({
      [`GET ${runtime}`]: json(200, catalog),
      'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: 'hat-a', agent: 'claude', revision: 1, config: { model: 'sonnet', axes: { fast: false } } }),
      'GET /api/sessions/s-1/catalog': json(200, { session_id: 's-1', config_options: options.slice(0, 2).map(option => ({ ...option, currentValue: option.id === 'model' ? 'sonnet' : 'default' })), commands: [], model: 'sonnet', mode: 'default' }),
    })
    const user = await fill('/srv/work/cat', 'Keep this prompt')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find(s => s.path === '/api/sessions')?.body).toMatchObject({ axes: { fast: false } })
    expect(posts(server.sent)).not.toContain('/api/sessions/s-1/prompt')
    expect(location.search).toContain('config_unconfirmed')
    expect(sessionStorage.getItem('hennery.draft.s-1')).toBe('Keep this prompt')
    expect(readStartNotice(location.search, 's-1')).toMatchObject({ message: expect.stringContaining('Fast: Off') })
  })
  it('requires explicit opt-out when no catalog is available, then sends no unverified config', async () => {
    const server = mount({ [`GET ${runtime}`]: json(409, { code: 'catalog_unavailable', message: 'Offline catalog' }) })
    const user = await fill('/srv/work/cat', 'Start deliberately')
    const optOut = await screen.findByRole('checkbox', { name: 'Use agent defaults for this start' })
    expect(startButton()).toBeDisabled()
    await user.click(optOut)
    expect(startButton()).toBeEnabled()
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find(s => s.path === '/api/sessions')?.body).toEqual({ host_id: 'h1', agent: 'claude', cwd: '/srv/work/cat' })
    expect(posts(server.sent)).toContain('/api/sessions/s-1/prompt')
    expect(server.sent.some(sent => sent.path === '/api/sessions/s-1/catalog')).toBe(false)
  })
})

it('keeps the first prompt as a session draft when the launcher closes during Start', async () => {
  let finish!: (response: Response) => void
  const start = new Promise<Response>(resolve => { finish = resolve })
  const server = mount({ 'POST /api/sessions': () => start })
  const user = await fill('/srv/work/cat', 'Keep after closing')
  await waitFor(() => expect(startButton()).toBeEnabled())
  await user.click(startButton())
  await waitFor(() => expect(posts(server.sent)).toContain('/api/sessions'))
  server.unmount()
  await act(async () => { finish(json(202, { session_id: 's-1' })); await start })
  expect(posts(server.sent)).not.toContain('/api/sessions/s-1/prompt')
  expect(server.sent.some(sent => sent.path === '/api/sessions/s-1')).toBe(false)
  expect(sessionStorage.getItem('hennery.draft.s-1')).toBe('Keep after closing')
})
it('does not release a held first prompt after closing during configuration read-back', async () => {
  let finish!: (response: Response) => void
  const catalogRead = new Promise<Response>(resolve => { finish = resolve })
  const server = mount({ 'GET /api/sessions/s-1/catalog': () => catalogRead })
  const user = await fill('/srv/work/cat', 'Keep during review')
  await waitFor(() => expect(startButton()).toBeEnabled())
  await user.click(startButton())
  await waitFor(() => expect(server.sent.some(sent => sent.path === '/api/sessions/s-1/catalog')).toBe(true))
  server.unmount()
  await act(async () => { finish(json(200, { session_id: 's-1', commands: [], config_options: [{ id: 'model', type: 'select', currentValue: 'a', options: [{ value: 'a' }] }] })); await catalogRead })
  expect(posts(server.sent)).not.toContain('/api/sessions/s-1/prompt')
  expect(sessionStorage.getItem('hennery.draft.s-1')).toBe('Keep during review')
})
it('retains the prompt on a hat mismatch even after explicitly opting out of catalog verification', async () => {
  const server = mount({
    'GET /api/hosts/h1/runtime-catalog?agent=claude&cwd=%2Fsrv%2Fwork%2Fcat': json(409, { code: 'catalog_unavailable', message: 'No settings preview' }),
    'GET /api/sessions/s-1': json(200, { session_id: 's-1', hat_id: 'hat-b', lifecycle: 'active' }),
  })
  const user = await fill('/srv/work/cat', 'Check the hat first')
  await user.click(await screen.findByRole('checkbox', { name: 'Use agent defaults for this start' }))
  await user.click(startButton())
  await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
  expect(posts(server.sent)).not.toContain('/api/sessions/s-1/prompt')
  expect(location.search).toContain('hat_changed')
  expect(sessionStorage.getItem('hennery.draft.s-1')).toBe('Check the hat first')
})
it('starts only on a deliberate local Mod+Enter, ignoring repeat, IME and extra modifiers', async () => {
  const server = mount()
  await fill('/srv/work/cat', 'Keyboard launch')
  await waitFor(() => expect(startButton()).toBeEnabled())
  const prompt = screen.getByRole('textbox', { name: 'First prompt optional' })
  for (const ignored of [{ altKey: true }, { shiftKey: true }, { repeat: true }, { isComposing: true }]) {
    fireEvent.keyDown(prompt, { key: 'Enter', ctrlKey: true, ...ignored })
  }
  const prevented = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true })
  prevented.preventDefault()
  fireEvent(prompt, prevented)
  expect(posts(server.sent)).not.toContain('/api/sessions')
  fireEvent.keyDown(prompt, { key: 'Enter', ctrlKey: true })
  await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
  expect(posts(server.sent).filter(path => path === '/api/sessions')).toHaveLength(1)
})

describe('pending launch persistence ownership', () => {
  type Phase = 'start' | 'confirmation' | 'ambiguous' | 'prompt-failure'
  async function pendingLaunch(phase: Phase) {
    let finish!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { finish = resolve })
    const path = phase === 'confirmation' ? 'GET /api/sessions/s-1' : phase === 'prompt-failure' ? 'POST /api/sessions/s-1/prompt' : 'POST /api/sessions'
    const view = mount({ [path]: () => pending })
    const user = await fill('/srv/work/cat', 'Synthetic private prompt')
    await waitFor(() => expect(startButton()).toBeEnabled())
    await user.click(startButton())
    await waitFor(() => expect(view.sent.some(sent => `${sent.method} ${sent.path}` === path)).toBe(true))
    const answer = phase === 'confirmation' ? json(200, { session_id: 's-1', hat_id: 'hat-a', lifecycle: 'active' })
      : phase === 'ambiguous' ? json(502, { code: 'delivery_unknown', session_id: 's-1' })
      : phase === 'prompt-failure' ? json(409, { code: 'host_offline' }) : json(202, { session_id: 's-1' })
    return { ...view, settle: async () => { finish(answer); await pending } }
  }
  it.each(['start', 'confirmation', 'ambiguous', 'prompt-failure'] as const)('never restores text or navigates after logout during %s', async phase => {
    const view = await pendingLaunch(phase)
    await act(async () => { await completeLogout(view.client, false) })
    view.unmount()
    expect(sessionStorage.getItem('hennery.draft.__launcher__')).toBeNull()
    await act(view.settle)
    expect(Object.keys(sessionStorage).filter(key => key.startsWith('hennery.draft.'))).toEqual([])
    expect(location.pathname).toBe('/login')
    if (phase !== 'prompt-failure') expect(posts(view.sent)).not.toContain('/api/sessions/s-1/prompt')
  })
  it.each(['start', 'confirmation', 'ambiguous', 'prompt-failure'] as const)('retains a newer real launcher after the closed %s completes', async phase => {
    const view = await pendingLaunch(phase)
    view.unmount()
    mount()
    fireEvent.change(await screen.findByRole('textbox', { name: 'First prompt optional' }), { target: { value: 'A newer unsent prompt' } })
    await waitFor(() => expect(sessionStorage.getItem('hennery.draft.__launcher__')).toContain('A newer unsent prompt'))
    const newer = sessionStorage.getItem('hennery.draft.__launcher__')
    await act(view.settle)
    expect(sessionStorage.getItem('hennery.draft.__launcher__')).toBe(newer)
    expect(sessionStorage.getItem('hennery.draft.s-1')).toBe('Synthetic private prompt')
    expect(location.pathname).toBe('/new')
  })
})
```

### File: `web/src/screens/Defaults.test.tsx`

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
import Defaults from './Defaults'

it('retains Other agent typing and loads and resets unavailable saved defaults without a catalog', async () => {
  history.replaceState(null, '', '/defaults?host=h1')
  const hat = { id: 'hat-a', name: 'Personal', colour: '#64748b', created_at: '', default_for_new_hosts: false, purging: false }
  const server = stubServer({
    'GET /api/hosts': json(200, [{ host_id: 'h1', name: 'Synthetic host', mcp_delivery: { claude: 'isolated' }, connected: true }]),
    'GET /api/hats': json(200, [hat]),
    'GET /api/hats/hat-a/session-defaults?agent=claude': json(200, { hat_id: hat.id, agent: 'claude', revision: 0, config: {} }),
    'GET /api/hats/hat-a/session-defaults?agent=custom-agent': json(200, { hat_id: hat.id, agent: 'custom-agent', revision: 7, config: { axes: { retired: false } } }),
    'PUT /api/hats/hat-a/session-defaults?agent=custom-agent': json(200, { hat_id: hat.id, agent: 'custom-agent', revision: 8, config: {} }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: location.pathname, search: location.search }), stepUp: vi.fn() })
  render(<ClientContext.Provider value={client}><Defaults /></ClientContext.Provider>)
  await screen.findByRole('tab', { name: 'Claude' })
  fireEvent.click(screen.getByText('Other agent', { exact: true }))
  const field = screen.getByRole('textbox', { name: 'Configured agent name' })
  fireEvent.change(field, { target: { value: 'custom-agent' } })
  await waitFor(() => expect(field).toHaveValue('custom-agent'))
  await screen.findByRole('button', { name: 'Reset retired to inherited' })
  fireEvent.click(screen.getByRole('button', { name: 'Reset all to inherited' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save defaults' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }))
  await waitFor(() => expect(server.sent.find(sent => sent.method === 'PUT')?.body).toEqual({ revision: 7, config: {} }))
  fireEvent.change(field, { target: { value: '' } })
  expect(field).toHaveValue('')
})
```

### Verification commands

```sh
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web typecheck
nix develop -c pnpm --dir web test
nix develop -c pnpm --dir web build
```

Expected: all web suites and the emitted-CSS origin checks pass. Removal
probes cover model pruning, security preservation, explicit invalid picks,
false values, unknown profile warnings, actual fields/options, actual hat,
missing read-back, reported failure and stale response fences.

## Task 3: Embedded browser acceptance


### File: `web/e2e/new-session.spec.ts`

```typescript
// UI R4: real host settings previews, persistent defaults and the first-prompt gate.
import { expect, test, type Page, type APIRequestContext } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startCollector, type Collector } from './collector'
import { defaultHostDir, fakeAgent, testHost, type TestHost } from './host'

const PASSWORD = 'correct horse battery staple'
const select = (id: string, current: string, values: string[]) => ({ id, category: id === 'effort' ? 'thought_level' : id, name: id === 'mode' ? 'Permission' : id[0].toUpperCase() + id.slice(1), type: 'select', currentValue: current, options: values.map(value => ({ value, name: value })) })
const options = [select('model', 'opus', ['opus', 'sonnet']), select('mode', 'default', ['default', 'bypass']), select('effort', 'low', ['low', 'high']), { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false }]
const artifact = join(process.cwd(), '../.superpowers/sdd/ui-r4/screenshots')
async function setup(page: Page, collector: Collector) {
  await page.goto(collector.setupLink)
  await page.getByLabel(/^Password at least/).fill(PASSWORD)
  await page.getByLabel('Password again', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Set up', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page).toHaveURL(`${collector.origin}/sessions`)
}
async function pair(request: APIRequestContext, collector: Collector, host: TestHost, name: string) {
  const code = await (await request.post(`${collector.origin}/api/hosts/pairing-codes`, { headers: { origin: collector.origin } })).json()
  expect(await host.join(`hennery host join ${collector.origin} ${code.code}`, ['--name', name, '--no-runtime'])).toBe(0)
  const configPath = join(defaultHostDir(host.dir), 'host.toml')
  const config = readFileSync(configPath, 'utf8')
  writeFileSync(configPath, `workspace_roots = [${JSON.stringify(realpathSync(host.dir))}]\n${config}`)
  host.run()
  let id = ''
  await expect(async () => {
    const hosts = await (await request.get(`${collector.origin}/api/hosts`)).json()
    const found = hosts.find((h: { name: string; connected: boolean }) => h.name === name && h.connected)
    expect(found).toBeTruthy()
    id = found.host_id
  }).toPass({ timeout: 30_000 })
  return id
}
async function capture(page: Page, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (process.env.UI_R4_SCREENSHOTS !== '1') return
  mkdirSync(artifact, { recursive: true })
  await page.evaluate(async () => { await document.fonts.ready })
  await page.screenshot({ path: join(artifact, `${name}.png`), fullPage: true, animations: 'disabled' })
}
for (const width of [390, 1280]) for (const appearance of ['light', 'dark'] as const) {
  test(`defaults and reviewed Sonnet launch at ${width}px ${appearance}`, async ({ browser }) => {
    test.setTimeout(120_000)
    const collector = await startCollector(), scratch = mkdtempSync(join(tmpdir(), 'hennery-r4-log-'))
    const log = join(scratch, 'config.log')
    const host = testHost(fakeAgent('claude', { config_options: options, model_switch_drops_option: 'fast', config_log: log, chunks: ['Ready to work.'] }))
    const second = testHost(fakeAgent('claude', { config_options: [select('model', 'other', ['other']), select('mode', 'default', ['default']), select('effort', 'low', ['low'])], chunks: ['Other host.'] }))
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce', colorScheme: appearance })
    const page = await context.newPage()
    const starts: object[] = [], prompts: string[] = [], wire: string[] = []
    let releaseStart = () => {}
    page.on('request', request => { wire.push(`${request.method()} ${new URL(request.url()).pathname}${new URL(request.url()).search}`); if (request.method() === 'POST' && request.url().endsWith('/api/sessions')) starts.push(request.postDataJSON()); if (/\/prompt$/.test(request.url()) && request.method() === 'POST') prompts.push(request.url()) })
    try {
      await setup(page, collector)
      const hostId = await pair(context.request, collector, host, 'Catalog host')
      const secondId = await pair(context.request, collector, second, 'Other catalog host')
      const project = join(realpathSync(host.dir), 'synthetic-project'), secondProject = join(realpathSync(second.dir), 'synthetic-project')
      mkdirSync(project); mkdirSync(secondProject)
      const hats = await (await context.request.get('/api/hats')).json(), hat = hats[0]
      const probe = await context.request.get(`/api/hosts/${hostId}/runtime-catalog?${new URLSearchParams({ agent: 'claude', cwd: project })}`)
      expect(await probe.json()).toMatchObject({ freshness: 'fresh' })
      const policyProbe = await context.request.get(`/api/hats/${hat.id}/delegation-policy`)
      expect(policyProbe.ok()).toBe(true)
      const defaultsProbe = await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)
      expect(defaultsProbe.ok()).toBe(true)
      await page.goto(`/defaults?${new URLSearchParams({ host: hostId, cwd: project, agent: 'claude', hat: hat.id })}`)
      await expect(page.getByRole('combobox', { name: 'Host', exact: true })).toHaveValue(hostId)
      await capture(page, `defaults-context-${width}-${appearance}`)
      await page.getByRole('button', { name: 'Preview settings', exact: true }).click()
      const editor = page.getByRole('region', { name: `Defaults for ${hat.name}`, exact: true })
      await expect(editor.getByLabel('Model', { exact: true })).toBeEnabled()
      await editor.getByLabel('Model', { exact: true }).selectOption('sonnet')
      await editor.getByLabel('Effort', { exact: true }).selectOption('high')
      if (width < 768) await editor.scrollIntoViewIfNeeded()
      await capture(page, `defaults-${width}-${appearance}`)
      await editor.getByRole('button', { name: 'Save defaults', exact: true }).click()
      await capture(page, `defaults-confirm-${width}-${appearance}`)
      await page.getByRole('button', { name: 'Confirm save', exact: true }).click()
      await expect(editor.getByRole('status')).toHaveText('Defaults saved.')
      await page.reload()
      await expect(editor.getByRole('button', { name: 'Reset model to inherited', exact: true })).toBeVisible()
      await page.goto(`/new?${new URLSearchParams({ host: secondId, cwd: secondProject })}`)
      await expect(page.getByRole('status').filter({ hasText: /^Saved Model/ })).toHaveText('Saved Model “sonnet” is unavailable on this host; using other.')
      await expect(page.getByRole('status').filter({ hasText: /^Saved Effort/ })).toHaveText('Saved Effort “high” is unavailable on this host; using low.')
      const unavailableCatalog = /\/api\/hosts\/[^/]+\/runtime-catalog\?/
      await page.route(unavailableCatalog, route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'catalog_unavailable', message: 'The settings preview is unavailable.' }) }))
      await page.goto(`/new?${new URLSearchParams({ host: hostId, cwd: project })}`)
      const form = page.getByRole('form', { name: 'New session', exact: true })
      const optOut = form.getByRole('checkbox', { name: 'Use agent defaults for this start', exact: true })
      await optOut.check({ timeout: 3_000 })
      await expect(optOut).toBeChecked()
      await capture(page, `launcher-unavailable-${width}-${appearance}`)
      await page.unroute(unavailableCatalog)
      await page.reload()
      await form.getByRole('textbox', { name: /^First prompt/ }).fill('Prepare synthetic notes.')
      await expect(form.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled()
      await capture(page, `launcher-${width}-${appearance}`)
      await form.getByRole('button', { name: 'Change', exact: true }).click()
      await capture(page, `launcher-config-${width}-${appearance}`)
      await form.getByRole('link', { name: 'Edit defaults', exact: true }).click()
      await page.getByRole('link', { name: 'Back to new session', exact: true }).click()
      await expect(form.getByRole('textbox', { name: /^First prompt/ })).toHaveValue('Prepare synthetic notes.')
      await expect(form.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled()
      const heldStart = new Promise<void>(resolve => { releaseStart = resolve })
      await page.route('**/api/sessions', async route => { if (route.request().method() === 'POST') await heldStart; await route.continue() })
      await form.getByRole('button', { name: 'Start session', exact: true }).click()
      const close = page.getByRole('button', { name: 'Close new session', exact: true })
      await expect(page.getByRole('dialog', { name: 'New session', exact: true })).toBeFocused()
      await expect(form.locator('.launch-fields')).toHaveAttribute('inert', '')
      await page.keyboard.press('Tab'); await expect(close).toBeFocused()
      await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused()
      await capture(page, `launcher-starting-${width}-${appearance}`)
      releaseStart()
      await expect(page).toHaveURL(/\/sessions\/[^/?]+$/, { timeout: 45_000 })
      await expect(page.locator('.bubble.user')).toHaveText('Prepare synthetic notes.')
      expect(starts.at(-1)).toEqual({ host_id: hostId, agent: 'claude', cwd: project, model: 'sonnet', mode: 'default', axes: { effort: 'high' } })
      expect(prompts).toHaveLength(1)
      const firstPrompt = wire.findIndex(path => path.startsWith('POST ') && path.endsWith('/prompt'))
      expect(wire.slice(0, firstPrompt).some(path => /^GET \/api\/sessions\/[^/]+\/catalog$/.test(path))).toBe(true)
      expect(wire.slice(0, firstPrompt).some(path => /^GET \/api\/view\/sessions\/[^?]+\?limit=1$/.test(path))).toBe(true)
      expect(readFileSync(log, 'utf8')).toBe('model=sonnet\neffort=high\n')
      expect(readFileSync(log, 'utf8')).not.toContain('fast=')
      // A deliberate false override is retained. Sonnet removes the axis,
      // so the real adapter refusal must hold the first prompt as a draft.
      const saved = await (await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)).json()
      expect((await context.request.put(`/api/hats/${hat.id}/session-defaults?agent=claude`, { headers: { origin: collector.origin }, data: { revision: saved.revision, config: { model: 'sonnet', axes: { fast: false } } } })).ok()).toBe(true)
      await page.goto(`/new?${new URLSearchParams({ host: hostId, cwd: project })}`)
      const projectField = form.getByRole('combobox', { name: /^Project/ })
      await projectField.fill('synthetic-project')
      const recent = form.getByRole('listbox').getByRole('option', { name: /^synthetic-project\b/ })
      await expect(recent.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/)
      await recent.scrollIntoViewIfNeeded()
      await capture(page, `launcher-recents-${width}-${appearance}`)
      await recent.click()
      await form.getByRole('textbox', { name: /^First prompt/ }).fill('Retain this draft.')
      await expect(form.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled()
      await form.getByRole('button', { name: 'Start session', exact: true }).click()
      await expect(page).toHaveURL(/\/sessions\/[^/?]+$/, { timeout: 45_000 })
      expect(starts.at(-1)).toMatchObject({ model: 'sonnet', axes: { fast: false } })
      expect(prompts).toHaveLength(1)
      await expect(page.getByText('The requested session settings could not be confirmed. Requested: Fast: Off · Model: sonnet · Permission: default. Review the settings before sending the first prompt. It waits as this session’s draft.', { exact: true })).toBeVisible()
      await capture(page, `launcher-review-${width}-${appearance}`)
      await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('Retain this draft.')
      const sessionId = new URL(page.url()).pathname.split('/').at(-1)!
      expect(await page.evaluate(id => sessionStorage.getItem(`hennery.draft.${id}`), sessionId)).toBe('Retain this draft.')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      // Reset remains explicit and persistent.
      const current = await (await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)).json()
      expect((await context.request.put(`/api/hats/${hat.id}/session-defaults?agent=claude`, { headers: { origin: collector.origin }, data: { revision: current.revision, config: {} } })).ok()).toBe(true)
      expect((await (await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)).json()).config).toEqual({})
    } finally { releaseStart(); await context.close(); await host.stop(); await second.stop(); await collector.stop() }
  })
}
```

### File: `web/e2e/sessions.spec.ts`

```typescript
// A session in a real browser, against the real binary (plan 4c, frontend
// spec §12): set up and sign in, pair a host whose agent is the scripted
// `hennery-fake-acp`, start a session from New Session, answer the
// permission it asks for, read its streamed Markdown, then crash the host
// and see the session parked when it comes back, then resume it from its
// footer and answer its second prompt's question. At 1280 px and at 390 px,
// each width with a collector and a host of its own, and not one
// Content-Security-Policy violation.
//
// The fake asks before it streams (its `asks` come first in every prompt),
// and echoes the answer it got as the start of its message: the transcript
// shows that the option chosen on the card is the one the agent received.
import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startCollector, type Collector } from './collector'
import { FAKE_ACP, fakeAgent, testHost, type TestHost } from './host'
import { scratchEnv } from './spawn'

const PASSWORD = 'correct horse battery staple'
const PROMPT = 'Write the notes, please.'

// Every prompt: one permission ask, then a short Markdown message after the
// echo of its answer (`permission:selected:<option>`, no newline of its own).
const SCRIPT = {
  asks: ['permission'],
  chunks: ['\n\nTwo steps:\n\n', '- first step\n', '- second step\n'],
  chunk_delay_ms: 20,
}

for (const width of [1280, 390]) {
  test.describe(`at ${width} px`, () => {
    test.describe.configure({ mode: 'serial' })

    const narrow = width < 768
    let collector: Collector
    let host: TestHost
    let page: Page
    let project: string
    const violations: string[] = []
    // A log directory in the runner's own environment, as a developer's
    // shell may have: no process started here may write to it.
    let sentinel: string
    let runnerLogDir: string | undefined

    test.beforeAll(async ({ browser }) => {
      if (!existsSync(FAKE_ACP)) {
        throw new Error(`no ${FAKE_ACP}: cargo build -p hennery -p hennery-testkit --bins`)
      }
      sentinel = mkdtempSync(join(tmpdir(), 'hennery-e2e-sentinel-'))
      runnerLogDir = process.env.HENNERY_LOG_DIR
      process.env.HENNERY_LOG_DIR = sentinel
      expect(scratchEnv(sentinel).HENNERY_LOG_DIR).toBeUndefined()
      collector = await startCollector()
      host = testHost(fakeAgent('claude', SCRIPT))
      project = join(realpathSync(host.dir), 'notes')
      mkdirSync(project)
      const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: 844 } })
      page = await context.newPage()
      // Every CSP violation the page sees, whatever its source.
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          const seen = ((window as unknown as { __csp?: string[] }).__csp ??= [])
          seen.push(`${e.violatedDirective} ${e.blockedURI}`)
        })
      })
      page.on('console', (m) => {
        if (m.text().includes('Content Security Policy')) violations.push(m.text())
      })
    })

    test.afterAll(async () => {
      try {
        await page?.context().close()
      } finally {
        try {
          await host?.stop()
        } finally {
          try {
            await collector?.stop()
          } finally {
            if (runnerLogDir === undefined) delete process.env.HENNERY_LOG_DIR
            else process.env.HENNERY_LOG_DIR = runnerLogDir
            if (sentinel) rmSync(sentinel, { recursive: true, force: true })
          }
        }
      }
    })

    test('the setup link sets hennery up, and the password signs in', async () => {
      await page.goto(collector.setupLink)
      await expect(page).toHaveURL(`${collector.origin}/setup`)
      await page.getByLabel(/^Password at least/).fill(PASSWORD)
      await page.getByLabel('Password again', { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: 'Set up', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'hennery is set up', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Skip', exact: true }).click()
      await expect(page).toHaveURL(`${collector.origin}/sessions`)
      // Signed out: the rail's button on a desktop; a phone shows none, so
      // the browser drops its session there.
      if (narrow) await page.context().clearCookies()
      else await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      await page.goto('/sessions')
      await expect(page).toHaveURL(`${collector.origin}/login?next=%2Fsessions`)
      await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page).toHaveURL(`${collector.origin}/sessions`)
    })

    test('a host pairs with the command the page shows, and comes online', async () => {
      await page.goto('/hosts')
      await page.getByRole('button', { name: 'Add host', exact: true }).click()
      const command = (await page.getByLabel('Pairing command', { exact: true }).textContent())!
      expect(command).toMatch(new RegExp(`^hennery host join ${collector.origin} [0-9A-Z]{4}-[0-9A-Z]{4}$`))
      expect(await host.join(command, ['--name', 'e2e host', '--no-runtime'])).toBe(0)
      await expect(page.getByText('Paired: e2e host', { exact: true })).toBeVisible({ timeout: 15_000 })
      host.run()
      await expect(async () => {
        await page.reload()
        await expect(
          page.getByRole('listitem', { name: 'e2e host', exact: true }).getByText('Online', { exact: true }),
        ).toBeVisible({ timeout: 1000 })
      }).toPass({ timeout: 20_000 })
    })

    test('New Session starts a session with its first prompt, and opens it', async () => {
      // The rail's link on a desktop, the tab bar's on a phone.
      if (narrow) {
        await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'New', exact: true }).click()
      } else {
        await page.getByRole('link', { name: 'New session', exact: true }).click()
      }
      // The form's own controls: the session list beside it has a search.
      const form = page.getByRole('form', { name: 'New session', exact: true })
      await expect(form).toBeVisible()
      await expect(form.getByRole('radio', { name: 'e2e host', exact: true })).toBeChecked()
      await expect(form.getByRole('radio', { name: 'Claude', exact: true })).toBeChecked()
      await form.getByRole('combobox').fill(project)
      // The whole line: the directory as resolved is the project itself,
      // and it exists (nothing follows it).
      const at = project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      await expect(form.getByRole('status').filter({ hasText: /^Starts in the hat / })).toHaveText(new RegExp(`^Starts in the hat .+ at ${at}$`))
      await form.getByRole('textbox', { name: /^First prompt/ }).fill(PROMPT)
      // This delivery/session fixture reports no settings catalog.
      await form.getByRole('checkbox', { name: 'Use agent defaults for this start', exact: true }).check()
      await form.getByRole('button', { name: 'Start session', exact: true }).click()
      // The start waits for the host to start the agent: on a loaded runner,
      // more than the default wait, and on macOS a fresh binary's first exec
      // waits for its online check (20 s and more has been seen).
      await expect(page).toHaveURL(new RegExp(`^${collector.origin}/sessions/[^/?#]+$`), { timeout: 45_000 })
      await expect(page.locator('.bubble.user')).toHaveText(PROMPT)
    })

    test('the agent’s permission question is answered from its card', async () => {
      const card = page.getByRole('region', { name: 'Question from Claude', exact: true })
      await expect(card.getByText('Write notes.txt', { exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('.session-head .badge')).toHaveText('Waiting on you')
      await card.getByRole('button', { name: 'Allow', exact: true }).click()
      await expect(card.getByText('Answered', { exact: true })).toBeVisible()
      await expect(card.getByRole('button')).toHaveCount(0)
    })

    test('the agent’s message streams in as Markdown, its list markers shown', async () => {
      // The echo of the answer opens the message: `allow` reached the agent.
      const message = page.locator('.bubble', { has: page.getByText('permission:selected:allow', { exact: true }) })
      await expect(message.getByRole('listitem')).toHaveText(['first step', 'second step'])
      await expect(page.locator('.session-head .badge')).toHaveText('Idle')
      // Tailwind's preflight strips list markers: the transcript's own rule
      // must bring them back (client view spec §5.3; jsdom cannot see it).
      const list = message.getByRole('list')
      expect(await list.evaluate((el) => getComputedStyle(el).listStyleType)).toBe('disc')
      const item = message.getByRole('listitem').first()
      // An item draws its marker only as a list item, of its own (inherited) type.
      expect(await item.evaluate((el) => getComputedStyle(el).display)).toBe('list-item')
      expect(await item.evaluate((el) => getComputedStyle(el).listStyleType)).toBe('disc')
    })

    test('the composer’s Send, and a phone’s way back, are on screen', async () => {
      const send = page.getByRole('button', { name: 'Send', exact: true })
      await expect(send).toBeVisible()
      await expect(send).toBeInViewport()
      // Nothing covers it (a tab bar, a sheet): the point at its centre is it.
      const onTop = await send.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return hit !== null && el.contains(hit)
      })
      expect(onTop).toBe(true)
      const back = page.getByRole('link', { name: 'Back to sessions', exact: true })
      if (narrow) {
        await expect(back).toBeVisible()
        await expect(back).toBeInViewport()
        expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
        await expect(page.locator('.tabbar')).toBeHidden()
      } else {
        // Not shown, so out of the accessibility tree: found by its class.
        await expect(back).toHaveCount(0)
        const hidden = page.locator('.session-head .back-btn')
        expect(await hidden.evaluate((el) => getComputedStyle(el).display)).toBe('none')
      }
    })

    test('a host that crashed and came back leaves the session parked', async () => {
      // Idle first, so no turn is cut short by the crash.
      await expect(page.locator('.session-head .badge')).toHaveText('Idle')
      await host.crash()
      host.run()
      // The restarted host holds no session: the collector parks it.
      const marker = page.locator('.marker-host_restarted .divider > span')
      await expect(marker).toHaveText(/^The host restarted( · .+)?$/, { timeout: 20_000 })
      await expect(page.locator('.session-head .badge')).toHaveText('Parked')
    })

    test('the footer’s Resume runs the session again, and it answers a second prompt', async () => {
      const resume = page.getByRole('button', { name: 'Resume', exact: true })
      await expect(resume).toBeVisible()
      if (narrow) expect((await resume.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await resume.click()
      await expect(page.locator('.session-head .badge')).toHaveText('Idle', { timeout: 20_000 })
      await expect(resume).toHaveCount(0)
      // The fake asks on every prompt: a second card, answered like the first.
      await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('And the second part.')
      await page.getByRole('button', { name: 'Send', exact: true }).click()
      const cards = page.getByRole('region', { name: 'Question from Claude', exact: true })
      await expect(cards).toHaveCount(2, { timeout: 15_000 })
      const second = cards.nth(1)
      await second.getByRole('button', { name: 'Reject', exact: true }).click()
      await expect(second.getByText('Answered', { exact: true })).toBeVisible()
      // The reply opens with what the agent got this time.
      const reply = page.locator('.bubble', { has: page.getByText('permission:selected:reject', { exact: true }) })
      await expect(reply.getByRole('listitem')).toHaveText(['first step', 'second step'])
      await expect(page.locator('.session-head .badge')).toHaveText('Idle')
    })

    test('the session menu’s controls are big enough to tap on a phone', async () => {
      test.skip(!narrow, 'the 44 px touch targets are a phone’s')
      const trigger = page.getByRole('button', { name: 'Session actions', exact: true })
      expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      // An active session: Close, Delete, and Park if its host can park.
      const list = page.locator('.session-menu-list')
      const names = await list.getByRole('button').allTextContents()
      expect(names.filter((n) => n !== 'Park')).toEqual(['Close', 'Delete session'])
      for (const name of names) {
        const box = await list.getByRole('button', { name, exact: true }).boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
      await page.keyboard.press('Escape')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    test('broke no Content-Security-Policy rule', async () => {
      expect(violations).toEqual([])
      const seen = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])
      expect(seen).toEqual([])
    })

    test('wrote nothing where the runner’s own environment pointed', async () => {
      expect(readdirSync(sentinel)).toEqual([])
    })
  })
}
```

### File: `web/e2e/mcp-delivery.spec.ts`

```typescript
// Real dispatch receipts, not MCP tool execution: the Codex-named fake
// records session/new and session/load under its own scratch directory.
import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startCollector, type Collector } from './collector'
import { fakeAgent, testHost, type TestHost } from './host'
import { scratchEnv } from './spawn'

const PASSWORD = 'correct horse battery staple'
const ENV_VALUE = 'e2e-environment-value-0123456789'
async function stepUp(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Your password', { exact: true }).fill(PASSWORD)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toBeHidden()
}

for (const width of [1280, 390]) test.describe(`MCP delivery at ${width} px`, () => {
  test.describe.configure({ mode: 'serial' })
  let collector: Collector, host: TestHost, page: Page
  let project: string, receipt: string, sessionUrl: string, hostId: string, hatId: string, sentinel: string
  let runnerLog: string | undefined
  const violations: string[] = []
  const records = () => existsSync(receipt) ? readFileSync(receipt, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
  const local = () => page.getByRole('region', { name: 'Local MCP servers', exact: true })
  const report = () => page.getByRole('region', { name: 'MCP delivery', exact: true })
  test.beforeAll(async ({ browser }) => {
    sentinel = mkdtempSync(join(tmpdir(), 'hennery-e2e-sentinel-'))
    runnerLog = process.env.HENNERY_LOG_DIR; process.env.HENNERY_LOG_DIR = sentinel
    expect(scratchEnv(sentinel).HENNERY_LOG_DIR).toBeUndefined()
    collector = await startCollector()
    // The log is scratch too, and never printed: it can contain env values.
    const agentScratch = mkdtempSync(join(tmpdir(), 'hennery-e2e-receipts-'))
    receipt = join(agentScratch, 'session.jsonl')
    host = testHost(fakeAgent('codex', { chunks: ['Done.'], session_log: receipt }))
    project = join(realpathSync(host.dir), 'notes'); mkdirSync(project)
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: 844 } })
    page = await context.newPage()
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => {
      const seen = ((window as unknown as { __csp?: string[] }).__csp ??= [])
      seen.push(`${e.violatedDirective} ${e.blockedURI}`)
    }))
    page.on('console', m => { if (m.text().includes('Content Security Policy')) violations.push(m.text()) })
    const setup = await page.request.post('/api/setup', { headers: { Origin: collector.origin }, data: { token: new URL(collector.setupLink).hash.slice(1), password: PASSWORD, public_url: collector.origin } })
    expect(setup.status()).toBe(201)
  })
  test.afterAll(async () => {
    try { await page?.context().close() } finally {
      try { await host?.stop() } finally {
        try { await collector?.stop() } finally {
          if (runnerLog === undefined) delete process.env.HENNERY_LOG_DIR; else process.env.HENNERY_LOG_DIR = runnerLog
          if (receipt) rmSync(join(receipt, '..'), { recursive: true, force: true })
          if (sentinel) rmSync(sentinel, { recursive: true, force: true })
        }
      }
    }
  })
  test('pairs a real host running a Codex-named fake', async () => {
    await page.goto('/hosts'); await page.getByRole('button', { name: 'Add host', exact: true }).click()
    const command = (await page.getByLabel('Pairing command', { exact: true }).textContent())!
    expect(await host.join(command, ['--name', 'e2e host', '--no-runtime'])).toBe(0)
    await expect(page.getByText('Paired: e2e host', { exact: true })).toBeVisible({ timeout: 15_000 })
    host.run()
    await expect(async () => {
      const response = await page.request.get('/api/hosts'); expect(response.status()).toBe(200)
      const hosts = await response.json(); expect(hosts[0].connected).toBe(true)
      hostId = hosts[0].host_id; hatId = hosts[0].default_hat_id
    }).toPass({ timeout: 20_000 })
  })
  test('saves a full local set through step-up, reads no values back and starts with its actual delivery', async () => {
    await page.goto('/mcp'); await expect(local()).toBeVisible()
    // The existing connection form creates and mounts the HTTP entry.
    await page.getByRole('button', { name: 'Add connection', exact: true }).click()
    const connection = page.getByRole('region', { name: 'Add a connection', exact: true })
    await connection.getByRole('textbox', { name: 'Name', exact: true }).fill('Docs')
    await connection.getByRole('textbox', { name: 'Slug', exact: true }).fill('docs')
    await connection.getByRole('textbox', { name: 'Server URL', exact: true }).fill('https://mcp.example.com/mcp')
    await connection.getByRole('combobox', { name: 'Authentication', exact: true }).selectOption('none')
    await connection.getByRole('button', { name: 'Create', exact: true }).click()
    const tick = page.getByRole('listitem', { name: 'Docs', exact: true }).getByRole('checkbox', { name: 'e2e host', exact: true })
    await tick.click(); await expect(tick).toBeChecked()
    await local().getByRole('button', { name: 'Add local server', exact: true }).click()
    await local().getByRole('textbox', { name: 'Server name', exact: true }).fill('local')
    await local().getByRole('textbox', { name: 'Command', exact: true }).fill('tool')
    await local().getByRole('button', { name: 'Add environment variable', exact: true }).click()
    await local().getByRole('textbox', { name: 'Environment name', exact: true }).fill('TOKEN')
    await local().getByRole('textbox', { name: 'Value for TOKEN', exact: true }).fill(ENV_VALUE)
    await local().getByRole('button', { name: 'Review local servers', exact: true }).click()
    await page.getByRole('dialog', { name: 'Save these local MCP servers?', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(local().getByRole('textbox', { name: 'Value for TOKEN', exact: true })).toHaveValue('')
    await local().getByRole('textbox', { name: 'Value for TOKEN', exact: true }).fill(ENV_VALUE)
    let refused = 0
    await page.route('**/api/mcp/stdio-servers?*', async route => {
      if (route.request().method() === 'PUT' && refused === 0) { refused++; await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'step_up_required' }) }) }
      else await route.continue()
    })
    await local().getByRole('button', { name: 'Review local servers', exact: true }).click()
    await page.getByRole('dialog', { name: 'Save these local MCP servers?', exact: true }).getByRole('button', { name: 'Save local servers', exact: true }).click()
    await expect(local().getByRole('textbox', { name: 'Value for TOKEN', exact: true })).toHaveValue('')
    await stepUp(page)
    await expect(local().getByRole('checkbox', { name: 'Keep stored value for TOKEN', exact: true })).toBeChecked()
    expect(refused).toBe(1); await page.unroute('**/api/mcp/stdio-servers?*')
    const listed = await page.request.get(`/api/mcp/stdio-servers?host_id=${hostId}&hat_id=${hatId}`)
    expect(listed.status()).toBe(200)
    const body = await listed.text(); expect(body.includes(ENV_VALUE)).toBe(false)
    expect(JSON.parse(body).servers[0].env).toEqual([{ name: 'TOKEN', has_value: true }])
    expect(await page.locator('textarea').evaluateAll((fields, value) => fields.some(field => field instanceof HTMLTextAreaElement && field.value.includes(value)), ENV_VALUE)).toBe(false); expect(page.url().includes(ENV_VALUE)).toBe(false)
    expect(await page.evaluate(value => document.body.innerText.includes(value), ENV_VALUE)).toBe(false)
    expect(await page.evaluate(value => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(value), ENV_VALUE)).toBe(false)
    if (width === 390) expect((await local().getByRole('button', { name: 'Review local servers', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.goto('/new')
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('radio', { name: 'Codex', exact: true }).check()
    await form.getByRole('combobox').fill(project)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('not isolated per hat')
    await form.getByRole('textbox', { name: 'First prompt optional', exact: true }).fill('Show delivery.')
    // This delivery/session fixture reports no settings catalog.
    await form.getByRole('checkbox', { name: 'Use agent defaults for this start', exact: true }).check()
    await form.getByRole('button', { name: 'Start session', exact: true }).click()
    await expect(page).toHaveURL(/\/sessions\/[^/?#]+$/, { timeout: 45_000 }); sessionUrl = page.url()
    await expect(report()).toContainText('At the last start/resume:')
    await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
    await expect(report()).toContainText('Codex also loads your own ~/.codex MCP servers.')
    expect(records()[0].method).toBe('session/new')
    expect(records()[0].params.mcpServers.map((s: { name: string }) => s.name).sort()).toEqual(['hennery-docs', 'hennery-local'])
    expect(JSON.stringify(records()[0].params.mcpServers).includes(ENV_VALUE)).toBe(true)
    await page.reload(); await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
  })
  test('keeps the last-start snapshot until resume, and delivers none for a different hat', async () => {
    await page.goto('/mcp'); await local().getByRole('button', { name: 'Add local server', exact: true }).click()
    await local().getByRole('textbox', { name: 'Server name', exact: true }).nth(1).fill('second')
    await local().getByRole('textbox', { name: 'Command', exact: true }).nth(1).fill('runner')
    await local().getByRole('button', { name: 'Review local servers', exact: true }).click()
    await page.getByRole('dialog', { name: 'Save these local MCP servers?', exact: true }).getByRole('button', { name: 'Save local servers', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto(sessionUrl); await expect(report().getByText('2 MCP servers.', { exact: true })).toBeVisible()
    await expect(page.locator('.session-head .badge')).toHaveText('Idle')
    await host.crash(); host.run()
    await expect(page.locator('.session-head .badge')).toHaveText('Parked', { timeout: 20_000 })
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(report()).toContainText('3 MCP servers.', { timeout: 20_000 })
    expect(records().at(-1).method).toBe('session/load'); expect(records().at(-1).params.mcpServers.length).toBe(3)
    const made = await page.request.post('/api/hats', { headers: { Origin: collector.origin }, data: { name: 'Other hat' } }); expect(made.status()).toBe(201)
    const other = await made.json()
    const path = join(project, 'other'); mkdirSync(path)
    const rules = await page.request.put(`/api/hosts/${hostId}/path-rules`, { headers: { Origin: collector.origin }, data: { rules: [{ prefix: path, hat_id: other.id }] } }); expect(rules.status()).toBe(200)
    await page.goto('/new')
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('radio', { name: 'Codex', exact: true }).check(); await form.getByRole('combobox').fill(path)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('this hat is not the host’s default')
    // This delivery/session fixture reports no settings catalog.
    await form.getByRole('checkbox', { name: 'Use agent defaults for this start', exact: true }).check()
    await form.getByRole('button', { name: 'Start session', exact: true }).click()
    await expect(report()).toContainText('this hat is not the host’s default', { timeout: 45_000 })
    await expect(report()).toContainText('0 MCP servers.')
    expect(records().at(-1).params.mcpServers).toEqual([])
  })
  test('obeys CSP and leaves the runner’s log directory untouched', async () => {
    expect(violations).toEqual([])
    expect(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])).toEqual([])
    expect(readdirSync(sentinel)).toEqual([])
  })
})
```

### Verification commands

```sh
nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked
nix develop -c bash -c 'UI_R4_SCREENSHOTS=1 CI=1 pnpm --dir web exec playwright test new-session.spec.ts'
nix develop -c bash -c 'CI=1 pnpm --dir web e2e'
```

The R4 suite uses two real fake-adapter hosts with different catalogs. It
saves/reloads/resets preferences, reviews the actual start request and
request ordering, proves the Opus→Sonnet inherited-fast case, and retains
an explicit unsupported fast=false first prompt as a draft. It captures
Defaults context/editor/save confirmation and launcher/config at 390×844
and 1280×900 in light/dark. The parent owns installed-iOS and final pinned-
adapter release acceptance.

Run the full Rust gates once successfully, serially with respect to web
builds: fmt, both clippy commands, both generator checks and
`cargo test --workspace --locked`. Only the new revision race requires
4 concurrent copies × 3 rounds; UI fake-clock tests do not add a timing
load campaign. Extract this plan onto a fresh base copy with its own cloned
target, regenerate protocol outputs, compare all implementation files,
then run the targeted backend/web and generator gates there. Do not share
CARGO_TARGET_DIR or mutate the execution worktree for probes.

## Task 4: Record execution and request parent review

Write command exit statuses/counts, observed RED/removal-probe results,
replay extraction/count/tree comparison, screenshot manifest and deliberate
deviations into the execution record. Never claim unobserved green. Push
only this feature branch with the personal gmail author; do not open a PR
or edit the shared docs index. Ask the parent to review the final SHA range,
run current Linux/macOS CI and check all unresolved review threads.

## After this plan

R5 may consume `api/defaults.ts` (`sessionDefaults`, `putSessionDefaults`)
and generated `HatSessionDefaults` for saved summaries after integration.
R3 keeps its read-only `lib/catalog.ts` exports and uses its existing
session config endpoint; it never writes these preferences. R6 gets the
launcher's host/canonical cwd/resolved hat through the existing context
registry and navigates through the established launcher action. Defaults
remain an explicit operator-launch preference, never an implicit server
merge or a delegation authorization.

Generated with Claude AI — please review before distribution.
