# Queued prompt steering implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task by task.

**Goal:** Explicitly inject a selected queued operator message into an active agent turn.
**Architecture:** Preserve the ordinary FIFO and turn lifecycle. Add a durable steering operation with correlated host acknowledgement, ACP capability discovery and host-owned idle fallback.
**Tech Stack:** Rust, SQLite, ACP, React, TypeScript.
**Spec:** docs/superpowers/specs/2026-11-17-queued-prompt-steering-design.md

## Global Constraints

- Use Conventional Commits.
- No adapter version bump, automatic steering, cancellation, or delegated prompt changes.
- Remove queued content only after `injected`; unknown delivery must never automatically retry.
- Use `_session/steering` with `_meta.steering.idleBehavior = "promptRequired"`.
- Preserve image content, ownership checks, permission cards, and current turn completion.

## Review Focus

- Concurrent ordinary dispatch and steering cannot consume the same message.
- Disconnect after dispatch cannot result in duplicate delivery.
- Unsupported or older hosts/adapters preserve queued content.
- End-of-turn races return input to ordinary queue ownership.
- Late acknowledgements remain correlated to the original operation and session.

### Task 1: Durable backend and host steering

**Files:** Modify protocol frames/rest and generated schemas, sessions queue/API/store/ws/hub, host connection/session actor; create focused steering modules and integration tests as appropriate to existing patterns.
**Interfaces:** Consumes existing queued prompt ids and attachments. Produces POST `/api/sessions/{id}/queue/{queue_id}/steer` and a browser-visible steering capability for attached sessions, plus durable queue delivery/error updates. Exact DTO fields follow existing session catalogue conventions and must be recorded in the task report for Task 2.

- [ ] Read spec and trace ordinary queue dispatch, host requests, capability publication, acknowledgement ingestion, reconnect reconciliation.
- [ ] Write failing tests for successful injection during an active turn, idle fallback, unsupported adapter, concurrency, unknown delivery, and late acknowledgement.
- [ ] Run focused tests and record expected failures before production changes.
- [ ] Implement minimal correlated durable operation and host extension request without blocking the session actor. Preserve ordinary turn guard and pending permission handling.
- [ ] Run focused tests, protocol generation, formatting, and relevant crate suites. Record any environment limitations accurately.
- [ ] Self-review and commit with Conventional Commits.

### Task 2: Queue UI and final integration

**Files:** web/src/components/PromptQueue.tsx, its tests, web/src/api/turns.ts, session-view wiring and generated types as required.
**Interfaces:** Consumes Task 1 endpoint and capability field documented in report. Adds explicit selected-message action.

- [ ] Add failing UI tests for visible supported action, unsupported/idle hiding, busy/edit disabled state, correct encoded request and error refresh.
- [ ] Run focused test and record RED.
- [ ] Implement action and minimal session capability wiring; preserve queue editing and copying.
- [ ] Run focused and full frontend tests, typecheck, and relevant backend integration checks.
- [ ] Review whole change against spec and fix material findings; record remaining limitations.
- [ ] Commit with Conventional Commits and report verified result.
