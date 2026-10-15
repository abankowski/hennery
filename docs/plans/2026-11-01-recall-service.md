# Reference memory service (R1) Implementation Plan

**Goal:** implement R1 of the optional memory design: a separate, opt-in `hennery-memory` executable, SQLite/FTS store, four MCP tools and a deterministic C1 activity consumer. No model or core memory integration.

**Architecture:** credentials select an immutable owner/hat/epoch namespace before any query. A private service database owns canonical Markdown, typed source evidence, derived FTS, atomic feed cursors and deletion receipts. HTTP tools and lifecycle methods authenticate separately. Registered namespaces fail closed without a maximum 60-second authoritative lease. Unregistered namespaces remain standalone and have no collector deletion guarantee.

**Tech stack:** workspace Rust, SQLite FTS5, axum, tokio, shared first-party redaction and validated egress. Separate data/auth; no dependency from the main binary to this crate.

## Execution status

Build in progress on `plan/recall-r1`, base `a58479c7`. This document will embed the built diffs and record fresh replay and observed RED/GREEN commands before completion. Independent review and Linux/macOS CI belong to the parent. No self-approval or publication is claimed.

## Scope

Four tasks, naturally reviewable as R1a (tasks 1–2: standalone store/tools) and R1b (tasks 3–4: consumer/lifecycle and mounted proof). R2 owns management UI, imports/exports; R3 owns optional models. C2 is independent: this implementation advertises `startup_context_v1: false` and provides no context endpoint.

## Decisions

- Use the spec's name `hennery-memory`.
- No model; deterministic brief accepts model mode only to return an explicit deterministic fallback.
- Local bootstrap/administration is through explicit CLI operations on the service's private store. No HTTP management authority is exposed to tools; R2 supplies its separate authenticated UI.
- Namespace IDs refer to immutable owner/hat/epoch rows; every data row references that namespace. Attaching the first C1 grant requires an empty namespace. Re-registration requires a new empty namespace after erasure; old credentials never reactivate a purged epoch.
- Follow settled Q1: lease denial is not erasure, and offline external deletion stays unconfirmed. Confirm erasure only after authenticated idempotent forget and local checkpoint; exports/backups/flash remanence are outside that claim.

Parent, on the maintainer's behalf, 2026-10-15: fix inventory scalability in separately scoped C1b: up to500 byte-bounded ID-only pages,60s sliding idle expiry with a justified15–30minute absolute cap, unchanged registration budgets and owner/hat scoping. No discard-all reset or scale limitation. Rebase R1 onto C1b, pace backlog reads within C1 budgets, then complete R1.

## Global Constraints

No core behavioral changes, shared database, worker installation or automatic enabling. No C2 dependency. Never infer authority from tool arguments or prose. Typed provenance remains attached to role-labelled excerpts. Redact assembled logical text before truncation/persistence/indexing. SQL scopes before hydration/limits; FTS is lexical with literal bounded terms and scoped coverage/recency ordering, never corpus rank. Requests, source pages, responses and namespace storage are bounded. No bodies/queries/private paths or credentials are logged.

## Review Focus

Auth separation; immutable namespace and scope selection; duplicate/escaped authority keys; lease expiry/revoke/purge races and honest receipts; atomic cursor/projection replay; source deletion and suppression; literal FTS and foreign-corpus independence; response/network/storage bounds; safe private files and Nix SQL source inclusion. Independent review requested through the parent for each task and whole branch.

## File structure

- `crates/hennery-memory/{Cargo.toml,src,tests}`: independent library/binary, schema, store, tools, consumer, CLI and integration proof.
- `Cargo.lock`, `nix/package.nix`: workspace lock entry and explicitly embedded SQL in the Nix source closure.
- This plan and `docs/README.md`: reproducible implementation and execution record.

## Task 1: Scoped canonical store and FTS

Build tests first and observe RED; implement immutable credential-bound namespaces, hashed tools/lifecycle credentials, atomic remember/idempotency, shared redaction, literal FTS, deterministic ranking and bounded scoped cursor pages. Targeted command: `cargo test -p hennery-memory --test store --locked`.

## Task 2: Four HTTP MCP tools and explicit local bootstrap

Build HTTP tests first and observe RED; implement stateless JSON MCP initialize/list/call and four strictly typed tools. Separate lifecycle authority, reject browser Origin and alternate identity transports, bound body/response/time/concurrency, make local credentials once and keep private files. Targeted command: `cargo test -p hennery-memory --test http --locked`.

## Task 3: C1 consumer, leases, revoke and purge

Build feed/lifecycle tests first and observe RED; consume bounded typed pages with atomic projection/cursor updates and idempotent event handling, keep three turn pairs within 8 KiB, suppression/reset/deletion, stable reset inventory, no model. Persist credentials sealed with namespace-bound AAD. Validate and cap leases, fail closed on authoritative denial, retain stale data on network failures, fence late work and idempotently erase after authenticated forget. Targeted command: `cargo test -p hennery-memory --test consumer --locked`.

## Task 4: Mounted live proof, independent probes and fresh replay

Drive the four tools through real MCP HTTP against a running scratch hennery collector with the plug-in mounted. Verify source capture, a second isolated hat, credential rotation and online/offline purge with protocol/store evidence. Revert-probe each guard/side effect in copies only; timing tests run four copies concurrently for three rounds. Embed exact built diffs, extract nonzero blocks, replay on a fresh base copy and compare complete tracked trees. Run six Rust checks and `nix flake check -L`; web gate only if web changes. Record exact exit statuses and test counts.

## After this plan

Parent: independent security review, Linux/macOS CI and full PR status (checks, reviewDecision, mergeStateStatus, unresolved threads). R2 adds management UI, import/export and deliberate edits; R3 optional models; C2 startup delivery remains independent. Signed session attestation remains a separately reviewed generic extension. External deletion acknowledgements are service claims; offline copies remain explicitly unconfirmed.

Generated with Claude AI — please review before distribution.
