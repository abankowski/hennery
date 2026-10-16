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
