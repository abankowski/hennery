# Reference memory management, export and scoped import (R2) Implementation Plan

**Goal:** personal continuity through the optional reference plug-in's separate
management screen, curated memories, portable export and explicit vault import.
Every user supplies their own owner/hat mappings; no model or core changes.

**Architecture:** reuse the kernel's authentication implementation in a separate
plug-in auth database, with a distinct browser cookie and configured origin.
Authenticated principal bindings select a plug-in owner; every operation then
selects exactly one immutable namespace. Canonical SQLite entries and FTS remain
transactional. Imports parse a bounded snapshot, never a live predecessor DB.

**Spec:** [Memory design](../specs/2026-10-14-memory-design.md), §§4.3, 6, 8–10;
[R1 and its After this plan](2026-11-01-recall-service.md).

**Tech stack:** existing Rust/axum/SQLite, shared kernel auth and redaction;
server-rendered HTML compiled with the service, no core frontend dependency.

## Execution status

Building on `a60452397d3ef3bf71484f91795efd44c6661dd8` in `plan/recall-r2`.
Ledger: `.superpowers/sdd/recall-r2/`. Independent reviews and GitHub actions
belong to the parent. No publication. Exact built patches and verification
records will be embedded before the single fresh replay.

## Scope

R2a: task 1 owner-scoped curated CRUD; task 2 authenticated management screen,
notes/retention and export. R2b: task 3 scoped vault preview/apply. Task 4 closes
verification, guard probes and replay. R3 models and all core changes stay out.

## Decisions

- Separate service screen; no core navigation or SSO changes. Explicit local
  auth bootstrap binds one plug-in owner to the independent operator identity.
- Server-rendered HTML escapes all content and shows Markdown as literal text;
  no raw HTML, remote images or fetch-on-render. Password and existing auth
  primitives are reused without sharing the collector's database or cookie.
- Native note bodies are observations: annotate/suppress or explicitly retain
  selected text; expected revisions prevent overwriting concurrent edits.
- Export is a consistent, versioned namespace snapshot, streamed as opaque
  Markdown filenames plus manifest. No credentials or retained server archive.
- Import accepts only a documented constrained predecessor grammar and synthetic
  fixtures derived from §6.1. No real vault, rules, credentials or service read.
- Explicit scope/per-file mapping has no fallback. Unscoped/shared/disagreeing
  files require a per-file decision; mixed documents stay excluded. Redact before
  storage; legacy provenance is inert and cannot become native source authority.
- Per-hat apply is atomic and digest-bound to preview; retry is idempotent and
  changed content conflicts. Deletion retains only opaque deduplication evidence
  needed to prevent resurrection, and purge removes that evidence too.

## Operating the separate screen and importer

Create namespaces with R1's explicit `create` command. `ui-init --owner ID
--public-url ORIGIN` reads the operator password from bounded stdin and makes
`memory-auth.db`, separate from both the collector and `memory.db`. Use a
distinct public origin. `serve` adds the screen only after that bootstrap;
otherwise the service remains MCP-only. The browser uses
`hennery_memory_session`, with the existing password/passkey implementation,
independent sessions and no SSO. Sensitive forms require step-up within five
minutes. The passkey helper has its own Node syntax/unit gate in CI and Nix;
Rust compiles the screen/assets and CI runs its separate browser acceptance.

The local importer accepts a regular, single-link, uncompressed tar snapshot,
never a live vault directory/database or its history/hooks. Archive members have
normalized relative UTF-8 names under `notes/`, `memories/` or `sources/`.
Directories have no payload; links, devices, GNU/PAX extensions, traversal,
absolute/drive paths, empty segments and depth above eight are refused. `.git`
and `.memory` components are skipped. Pointer-only `MEMORY.md` is skipped;
substantive source documents with that name remain eligible. Limits are 2 MiB
per file, 10,000 files, 100 MiB expanded content, 20,000 archive members and
110 MiB raw tar. Oversized/non-UTF-8 files appear in the preview and must be
fixed or explicitly excluded. Nothing is extracted or changed in the snapshot.

Frontmatter is deliberately constrained: `---` delimiter lines (with a newline
after the closing delimiter), ASCII identifier keys up to 64 bytes, plain/JSON
double-quoted/YAML single-quoted scalars up to 8 KiB, two-space `metadata` and
`times` scalar maps, and scalar flow/block sequences of up to 64 items. Block
sequences use two spaces at root or four in a nested map; commas inside quoted
flow elements are unsupported. At most 128 fields/64 KiB frontmatter. Duplicate
case-folded keys, the duplicate `source_session`/`originSessionId` alias, tabs,
BOM, tags/anchors/aliases/merges, block scalars, inline comments and further
nested structures are reported as unparseable. Unknown scalar keys retain
their spelling and values inertly. Known keys are normalized; dates and legacy
event IDs/checksums stay source evidence. A legacy session reference is qualified
by the source-vault hash and never becomes a native `SourceRef` or feed cursor.
Source documents retain the whole original text after redaction. Notes retain
their summary/sections and inert metadata, are labelled import/legacy and do
not regenerate. Large metadata is visibly omitted only from bounded tool
results; management/export keep the canonical metadata.

Mappings are JSON objects with `scopes`, `files` and `mixed`. Each scope/file
target is `{"action":"namespace","namespace":"ID","project_key":null}`
or `{"action":"exclude"}`. A project key is explicit or absent, never guessed
from cwd. Scope names have no privilege or shared-read union. Unscoped/shared
files and directory/frontmatter disagreements need a per-file decision.
`mixed` lists documents known to contain multiple contexts; exclude them until
the owner supplies an edited copy for one hat. Duplicate/escaped-duplicate map
keys and unknown authority fields are refused.

While stopped, `import-preview --owner ID --snapshot FILE --vault LABEL
--mapping FILE` emits a redacted signed proposal with counts, exclusions,
conflicts, redactions and a content/mapping digest. It writes no entries or
staging rows. Review that proposal, then use `import-apply --owner ID --preview
FILE --digest DIGEST`, or upload/paste it into the authenticated screen and
confirm apply there. The screen also previews bounded JSON bundles with
`version: 1`, `vault` and `files: [{path, body}]`; HTTP forms are capped at
128 MiB and accept content bytes, never a server filesystem path. Preview
signatures bind the entire proposal, owner, namespace epoch and one-hour
expiry using private namespace keys. A changed proposal requires a new preview.

Apply commits each hat atomically and reports committed versus untouched hats.
Content changes conflict; a retry never overwrites owner edits or resurrects a
deleted import. Only hashed vault/path/content evidence remains in that import's
ledger until namespace purge. Signed previews carry portable content: expiry
invalidates approval, not external copies. They have the same external-copy
limitation as exports/backups. Arbitrary provider secrets in plaintext or
encoded/obfuscated secrets are outside the shared shape-based redactor's claim.

To combine import with C1 capture, attach the grant to the empty namespace
first, as R1 requires. Local preview can run offline; registered apply needs the
live service/UI and a fresh authoritative lease. Offline CLI apply is for
standalone namespaces. Check representative recent/search results in each
isolated hat before cutover. Existing ACP sessions, rules/hooks and new feed
grants are separate explicit operations; no real-data cutover was performed.

## Global Constraints

Opt-in only. No hennery core behavior, DB, UI, model or publishing changes.
No HTTP filesystem paths. Reject traversal/links/non-regular files and size/depth
bombs. Authenticate before reading request bodies. Exact Origin and browser-site
checks; step-up for import/export/deletion/policy. No body/path/secret logs.
All SQL namespace filters precede hydration/count/limits. Imported authorship and
legacy IDs never claim a native session, feed cursor or operator approval.

## Review Focus

Distinct UI auth/cookies; CSRF, XSS and safe rendering; owner+hat export;
expected revision and provenance preservation; honest body/FTS deletion;
manifest approval binding, source filesystem/archive attacks and resource caps;
idempotency and failure isolation. Parent independent task and branch reviews.

## File structure

- `crates/hennery-memory/src/`: management/auth/UI/export/import and migrations.
- `crates/hennery-memory/tests/`: synthetic CRUD/auth/import/export/security tests.
- `nix/package.nix`: all embedded SQL/assets in the source filter.
- This plan and `docs/README.md`: executable patches and execution record.

## Task 1: Owner-scoped management store (R2a)

Add tests first, observe RED, then add principal binding, scoped listing/CRUD,
revision conflicts, pin cap, note annotations/retention/suppression and export
snapshot. Prove redaction, immutable provenance, FTS/body deletion and other-hat
survival. Run targeted management and SQL audit tests.

## Task 2: Separate authenticated screen and export (R2a)

Observe auth/export/UI tests RED, then implement explicit local bootstrap,
distinct cookies, Origin/step-up gates, scoped navigation and streaming export.
Verify escaped hostile Markdown, provenance and mobile layout. Run its Rust
route/render tests and browser acceptance. Commit and push after own diff audit.

## Task 3: Scoped vault preview/apply (R2b)

Observe synthetic importer tests RED, then implement bounded snapshot parsing,
constrained frontmatter, explicit mappings and preview digest approval. Preserve
whole documents and inert legacy metadata; isolate each hat transaction. Exercise
all malformed/path/link/bounds/mapping/retry/conflict cases and redaction.

## Task 4: Probes, gates and one fresh replay

Run each new security guard removal in an independent APFS-cloned copy, batched
by guard family. Never mutate the execution worktree for probes. Embed exact
built task patches, extract a positive block/file count and apply them to a fresh
base copy. APFS-clone target first, compare every tracked implementation byte,
then run targeted replay checks. Run the six Rust gates once for the plan and
`nix flake check -L`; no web gate unless web files change. Load runs only for
new timing/concurrency tests. Record outputs, statuses and test counts. Check
staged bytes match the tested tree and review diff before every SSH push.

## After this plan

Parent independent security/task/whole-branch reviews, Linux/macOS CI and full PR
status (checks, reviewDecision, mergeStateStatus, unresolved bot/human threads).
R3 optional models remain separate. No real-data cutover or publishing performed.

Generated with Claude AI — please review before distribution.
