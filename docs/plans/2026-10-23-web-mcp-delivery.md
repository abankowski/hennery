# Web MCP delivery and local servers (plan 4e-ii-a) Implementation Plan (v2)

> **For agentic workers:** execute task by task using the fleet’s subagent-driven-development process, or its manual equivalent where those skills are unavailable. The opus security review on the maintainer’s behalf (2026-10-13) was APPROVE AFTER AMENDMENTS. Task 6 takes every amendment and N1–N3; scoped re-confirmation was CONFIRMED WITH NOTES (opus, 2026-10-13). The fleet parent authorized the execution record after those notes and fresh replay.

**Goal:** expose merged 8e’s last-start/resume delivery decision, host/agent predictions, per-host/hat local stdio sets and isolation refusals. Web only; no dependency, schema, gateway or agent change.

**Architecture:** typed wrappers over the existing operator API; pure delivery/retention classifiers; one bounded detail reader shared by the session header and delivery display; New Session and mount-grid predictions; a keyed stdio editor using existing confirmation and transport step-up. Secrets remain in uncontrolled fields until confirmed, then only in the transient request needed for the existing retry.

**Tech Stack:** existing React 19, strict TypeScript, Vitest, Playwright Chromium and the flake dev shell. No new packages.

**Spec:** [Frontend design](../specs/2026-09-26-frontend-design.md) §§4, 7, 8, 10, 12; [MCP gateway](../specs/2026-09-26-mcp-gateway-design.md) §§3.4, 9 and delivery, plus its ACP core/kernel references; [8e](2026-10-16-gateway-session-delivery.md) “After this plan”; [4e-i](2026-10-22-web-mcp.md) “After this plan”; the merged session conventions in [4c](2026-10-18-web-sessions.md). Merged code on the base wins over the lane hand-off.

**Base:** `7a8dab285470dae2453334a9a210565735ca0062` (#128 merged). Every task was built as tests then feature commits, tested before embedding. All blocks below are verbatim from those commits; replacement anchors include exact baseline context and are checked unique in sequence.

## Execution status (planning build, 2026-10-13)

**Construction v2 complete; scoped re-confirmation and execution approval pending.** This is the code-first planning branch, not a claim of reviewed execution. The original five local test/feat pairs were built, each test step observed red, then pushed by SSH once per finished task. No PR opened, no GitHub account used, no alternate transport/key used. The PIN-cache warning did not refuse the observed pushes.

Vitest: **1368 → 1453**, **75 → 83 files**. Full per-task counts: 1406, 1419, 1426, 1444, 1453. Playwright: baseline discovery 61 tests; final discovery 69, **58 passed / 11 existing-condition skips**, with the new spec **8/8 passed** at 1280 and 390 px. The baseline browser suite was listed, not rerun as a baseline pass claim. Frozen install, typecheck, build, binary/fake build and both generated-code checks exit 0. No Rust source changed; workspace Rust tests/clippy are outside this web-only plan.

**Red evidence:** Task 1: 3 failed files, 4 assertion failures plus missing modules. Task 2: new modules missing; session integration 2 failed/3 passed. Task 3: 3 failed files, 3 failed/81 passed plus missing prediction module. Task 4: missing editor, 1 failed file/no tests. Task 5: Playwright 2 failed/2 passed/4 not run at the missing section (both widths), unit 1 failed/46 passed; the added visible error-escaping assertion separately failed (1 failed/41 skipped).

**Deviations and fixes:** share the opening metadata read with the header, remove the former summary-disappearance reread to preserve the approved freshness rule, and update legacy zero-read assertions to one bounded opening read. Standalone editor in Task 4, screen wiring in Task 5, gives the browser test a real missing-screen red. Probe survivors exposed overlapping guards and one vacuous negative-warning locator; stronger cases now observe each separately, including disposal writes, immediate namespace replacement, same-frame Escape, supplied-value→empty clearing and literal warning absence. Wait for the ready editor before asserting its section, since its loading placeholder is replaced. The new metadata error uses visible Text escaping. No requirement, type or assertion was weakened.

**Probes:** 143/143 unique mutations caught by actual failing assertions on the restored final code; no compile-only or empty-suite failure counted. Every deliveryWords outcome, every prediction outcome (unknown included), lifecycle and resolved-hat decisions, keep/set semantics, refusal words, namespace/queue/read/write guards, confirmation, clears, API bodies and disposal/release boundaries have recorded probes below. Initial survivors are not counted as proof; their strengthened cases were rerun and caught. Scratch logs are in the branch ledger.

**Replay v1 completed (historical):** 69 code blocks extracted into 32 files from this plan’s own Create/Replace text, onto a fresh scratch archive of the base. All ten test/feature phase trees matched their recorded SHAs byte for byte. Replay tests-only/feature counts were respectively: Task 1, 4 failed plus missing modules / 38 passed; Task 2, 8 failed and 49 passed plus missing modules / 69 passed; Task 3, 3 failed and 81 passed plus a missing module / 89 passed; Task 4, missing editor (no tests) / 18 passed; Task 5, 2 failed and 133 passed / 135 passed. Each feature phase also passed typecheck and its full Vitest suite (1406, 1419, 1426, 1444, 1453). Task 5’s tests-only browser build and binary/fake build passed; its browser check failed at the missing local-server section at both widths, with 2 failed, 2 passed and 4 not run. The targeted paths were read from the corrected plan itself. Apply the README record and copy this exact plan as the final documentation artifact; the resulting tracked tree is checked equal to the branch tip byte for byte, docs included. The plan cannot embed its own bytes recursively; only that final self-copy is outside a code block. The ledger and parent report hold the final tree hash, which cannot be embedded here without changing that hash.

## Security review answers (v2, 2026-10-13)

**Reviewer:** opus, security review on the maintainer's behalf, supplied by the fleet parent on 2026-10-13. **Verdict:** APPROVE AFTER AMENDMENTS on construction range `7a8dab28..3437cbc8`. All amendments are Task 6. **Scoped re-confirmation:** opus, maintainer's behalf, 2026-10-13, **CONFIRMED WITH NOTES** on `d53e9079..9b815a8b`: all amendments correct, 25 probes well targeted, review table accurate, no regression. The parent authorized taking N1–N3 into Task 6, fresh replay, and the execution record; no further confirmation was requested.

| Finding | Task 6 answer and evidence |
|---|---|
| Important 1: env correction services | Disable spellcheck, autocorrect and autocapitalize on env values; attribute assertions and one probe each. |
| Important 2: erasure implied empty | Value changes update presence only. Type then erase leaves explicit-empty unticked and Review refuses; separate probes for presence and empty. |
| Important 3: env recipients | Name the host, agent and server process, alongside the write-only readback boundary; both statements asserted/probed. |
| Missing env textarea defaulted empty (N1) | Clear every other registered value before refusing PUT or step-up if one ref is unavailable, for typed and explicit-empty values; child-ref tests and separate refusal/clear probes. |
| Stdio slug wording | “A connection already uses this name.” No nonexistent slug field; assertion/probe. |
| Codex note followed agent rather than mode | Shared mode classifier; unisolated definite, unknown Codex conditional, others absent. Positive and absence assertions, mode/agent/wiring probes. |
| No warning without host delivery report | Scoped conditional warning on /mcp, including zero connections; reported hosts omit it. Both guards probed. |
| Review did not show command/argv | Display every server's command and each argument through visible(), preserve empty argv visibly. Bidi, zero-width and newline assertions/probes before any write/step-up. |
| Isolated live-tense wording | “This agent was given only this hat's MCP servers.” Snapshot assertion/probe. |
| Isolation refusal suggested retry | Remove “Try again.” Unit start/resume and refusal assertions, probe. |
| Vacuous browser value assertion | Inspect textarea DOM values, retaining the write-only response, URL and storage checks; local Playwright run at both widths. |
| Future session mode (N2) | Normalize unrecognized recorded modes to unknown before the caveat; future-mode Codex/Claude tests and a normalization probe. |
| Rendered secret absence (N3) | Keep textarea DOM-value absence and add body.innerText absence. Injecting rendered text independently trips the new assertion at both widths. |
| Count substring could match 12 | Exact text locators for “2 MCP servers.” at start, reload and saved-change snapshot; local Playwright run at both widths. |

Task 6 adds 12 tests: **1465 Vitest / 84 files**; full browser suite **58 passed / 11 skipped**. Install, typecheck, build, binary/fake build and both generator checks exit 0. The initial red was 21 failed / 142 passed; after aligning two legacy start/resume expectations, replay's tests-only phase is expected to fail on those too. **27/27 source guards caught**, plus the rendered-secret browser assertion fault injection, with actual failed assertions and source restoration (**28 Task 6 / 171 historical/new probe records**). The original 143 records remain historical proof for Tasks 1–5; Task 6 probes cover their amended boundaries.

**Replay v2 after N1–N3:** fresh replay pending; embedded Task 6 changed, so the prior replay-3 is historical. Require 88 blocks / 33 files, all twelve complete phase trees matching the reordered branch with first-commit docs. Comments retain construction SHAs; ordinal mapping identifies the current task commits. At initialization apply the embedded planning README block and copy this plan, then apply all twelve phases. The execution record changes prose only after replay; preserve every fenced payload and copy only those final documentation artifacts for final-tree equality.


## Scope

Six tasks, with the files in the table below. Include the session mode/count, New Session and mount-grid predictions, full-set local stdio configuration, write-only env handling, and start/resume/failed-session isolation refusals. Exclude OAuth Connect (4e-ii-b after 8f), 8g/8h screens, 4d/4f, and 8e’s open Q2/PQ1/PQ2/OQ3. Answering a question card keeps focus where the maintainer decided.

## Decisions this plan makes where the spec is silent

The fleet parent approved the outline and the following rulings on 2026-10-13, including mount-grid scope and bounded lifecycle refresh. The ledger records this approval under “Plan construction — approved 2026-10-13”. The security review on the maintainer’s behalf is recorded below; scoped re-confirmation was CONFIRMED WITH NOTES, and its three authorized notes are included in Task 6.

1. **Freshness:** read SessionDetail on open (including navigation after this tab’s own successful start), after this tab’s successful resume, after item-stream resync, and when the list summary transitions from non-running to running (`starting` or `active`). The transition catches a resume elsewhere; ordinary events and focus do not read detail. One pending request per client/session, with coalesced invalidations and latest-result guards, avoids per-event refetch because delivery has no SSE delta.
2. **Snapshot wording:** “At the last start/resume: …” describes the stored decision, never current health/connectivity or proof of a host ACK. Missing session/host/agent reports are unknown; never infer isolation. Host predictions explicitly refer to the latest report, and do not invent a count. An accepted capability-negative host report can predict unsupported.
3. **Codex until 8h (v2):** mode controls the own-config note: unisolated shows it; unknown on a Codex agent says “may”; isolated, fallback and unsupported omit it. A host with no delivery report gets a conditional Codex own-config warning on `/mcp`, even with no connections. No token-revocation or env-echo protection promise.
4. **Retention:** retain only the original server name/command/env key in the same host/hat; rename or command changes require re-entry, args-only edits do not. An explicit empty string is a real value. A supplied field cleared after cancellation/refusal must be re-entered or explicitly made empty before another submission. Omitting an env row deletes it; omitting its value keeps it.
5. **Place/refusals:** 404 says “This host or hat no longer exists.” Do not guess which. Offline stdio saves are allowed; an offline start remains “The host is offline.” Revoked host sets remain readable without Save. The API limits and validator messages are authoritative; every refusal is rendered as escaped text.
6. **Contract reconciliation:** delivery is persisted before host acknowledgement and can outlive a token; no usability inference. Stdio names may repeat across sets but conflict with every owner connection slug. A missing agent report stays unknown for prediction; a future reported agent value is treated conservatively as default-hat-only. Initially offline start is host_offline before creation; a later dispatch race is different. No gateway-maintainer question is reopened.

## Global Constraints

- Work only in the named lane. Plain `nix develop -c`, never `path:`; separate default Cargo target per tree. No global installs, alternate signing key/transport, personal-home writes or GitHub actions.
- Existing Client controls same-origin credentials, 401 navigation, one shared step-up and one retry. Stdio GET is not a stepped-up route; PUT is. Confirm full-set replacement before reading/sending values. Never silently retry a cleared field as empty.
- No secrets in React state, URL, browser storage, readable server replies or rendered retained text. This concerns stored write-only values, not what an agent may echo. No raw HTML or CSP relaxation. Commands/argv are readable; keep their bytes, and put secrets in env.
- Namespace selection and operation guard refs see two presses in one frame. Existing focus behavior on answered cards remains unchanged. Exact Playwright role/text locators; Testing Library strings are exact by default.
- New docs end with the repository’s generated-document notice. Review diff/author before each SSH push. Parent handles security/whole-branch reviews and PR lifecycle.

## Review Focus

- Env write-only boundary: uncontrolled fields, presence flags only in state, original-identity retention, explicit empty, cancellation/refusal re-entry, clearing before request, single transient retry body, resource/disposal cleanup.
- Step-up/full-set safety: confirmation before request; server-driven one retry; selector/draft locking; same-frame operation sharing; offline/revoked/not_found distinctions; owner-wide slug conflict words.
- Freshness and stale results: only approved invalidations, no focus/per-event refetch, cross-component read bound, session/client/host/hat changes, resync and resume wiring, header summary conventions.
- CSP and scratch-only writes: real binary/fake at both widths; fake receipts can contain test env values, remain scratch, are not printed and are removed. Sentinel directory stays empty.
- Wording: snapshot vs live health/ACK, unknown report behavior, explicit Codex own `~/.codex`, no revocation/env-echo overpromise, no deferred screen or gateway decision.

## File structure

| File | Purpose |
|---|---|
| `web/e2e/mcp-delivery.spec.ts` | Test/proof |
| `web/src/api/errors.ts` | Implementation |
| `web/src/api/mcp-stdio.test.ts` | Test/proof |
| `web/src/api/mcp.ts` | Implementation |
| `web/src/api/view.ts` | Implementation |
| `web/src/components/McpDelivery.test.tsx` | Test/proof |
| `web/src/components/McpDelivery.tsx` | Implementation |
| `web/src/components/McpPrediction.test.tsx` | Test/proof |
| `web/src/components/McpPrediction.tsx` | Implementation |
| `web/src/components/Mounts.tsx` | Implementation |
| `web/src/components/SessionLink.test.tsx` | Test/proof |
| `web/src/components/Shell.tsx` | Implementation |
| `web/src/components/StdioServerForm.test.tsx` | Test/proof |
| `web/src/components/StdioServerForm.tsx` | Implementation |
| `web/src/components/StdioServers.test.tsx` | Test/proof |
| `web/src/components/StdioServers.missing.test.tsx` | Test/proof |
| `web/src/components/StdioServers.tsx` | Implementation |
| `web/src/components/items/Marker.tsx` | Implementation |
| `web/src/hooks/useMcpDelivery.test.tsx` | Test/proof |
| `web/src/hooks/useMcpDelivery.ts` | Implementation |
| `web/src/index.css` | Implementation |
| `web/src/lib/mcpDelivery.test.ts` | Test/proof |
| `web/src/lib/mcpDelivery.ts` | Implementation |
| `web/src/lib/stdio.test.ts` | Test/proof |
| `web/src/lib/stdio.ts` | Implementation |
| `web/src/manage.css` | Implementation |
| `web/src/screens/Mcp.test.tsx` | Test/proof |
| `web/src/screens/Mcp.tsx` | Implementation |
| `web/src/screens/NewSession.test.tsx` | Test/proof |
| `web/src/screens/NewSession.tsx` | Implementation |
| `web/src/screens/Session.host.test.tsx` | Test/proof |
| `web/src/screens/Session.test.tsx` | Test/proof |
| `web/src/screens/Session.tsx` | Implementation |

## Reading the steps

Create writes the entire fenced file including its trailing newline. Replace matches the Before block exactly once and writes After verbatim, including its trailing newline. Do not run shell commands from a code fence implicitly: the Run steps name them. Tests-only phases must fail; feature phases must pass. The replay parser rejects zero extracted files and ambiguous anchors. Metadata comments identify phase boundaries and expected commit trees.

Run commands from the lane root in the flake shell with scratch HOME/XDG state. For long commands keep the foreground exec session and poll it; logs record real exit status. Do not start a build or green verification while a mutation probe is modifying its source.

### Task 1: Typed routes, delivery classifiers and plain refusals

Encode host/hat ids independently. Keep all argv bytes and distinguish absent env values from explicit empty strings. Give each delivery/prediction verdict its own positive case. A missing report stays unknown; an accepted capability-negative report is unsupported. Unknown future agent values are conservative default-hat-only. Word isolation refusal on start, resume and a failed-session marker.

<!-- PHASE 1 TEST e1a385ce7ec99dc9cd75ebee6c6a9b1fff0391e1 -->

**Files:** `web/src/api/mcp-stdio.test.ts`, `web/src/lib/mcpDelivery.test.ts`, `web/src/lib/stdio.test.ts`.

- [ ] Step 1: Add the failing tests.

**Create:** `web/src/api/mcp-stdio.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import { replaceStdioServers, stdioServers } from './mcp'
import { startRefusal } from '../lib/start'
import { resumeRefusal, failureWords } from '../components/sessionWords'
import { ApiFailure } from './errors'

describe('stdio routes', () => {
  it('encodes both ids and sends the whole set without losing empty values', async () => {
    const t = routed(() => json({ host_id: 'h&x', hat_id: 'a/b', servers: [] }))
    await stdioServers(t.client, 'h&x', 'a/b')
    const servers = [{ name: 'files', command: 'server', args: [''], env: [{ name: 'EMPTY', value: '' }] }]
    await replaceStdioServers(t.client, 'h&x', 'a/b', { servers })
    expect(t.calls.map((call) => call.method + ' ' + call.path)).toEqual([
      'GET /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
      'PUT /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
    ])
    expect(JSON.parse(String(t.fetch.mock.calls[1][1]?.body))).toEqual({ servers })
  })
})

describe('start and resume isolation refusal', () => {
  const code = 'mcp_isolation_unavailable'
  const message = 'The host could not isolate this agent’s MCP servers. Try again.'
  it('explains a refused start', () => expect(startRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains a refused resume', () => expect(resumeRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains the failed session', () => expect(failureWords(code)).toBe('the host could not isolate this agent’s MCP servers'))
})
```

**Create:** `web/src/lib/mcpDelivery.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import { deliveryWords, predictDelivery, predictionWords, runningLifecycle } from './mcpDelivery'

describe('deliveryWords', () => {
  it.each([
    ['isolated', 'Hennery keeps this agent to the MCP servers of this hat.'],
    ['unisolated', 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'],
    ['fallback', 'No hennery MCP servers: this hat is not the host’s default for this agent.'],
    ['unsupported', 'No hennery MCP servers: the host does not support their delivery.'],
    [undefined, 'MCP delivery is unknown.'],
    ['future', 'MCP delivery is unknown.'],
    ['constructor', 'MCP delivery is unknown.'],
  ])('words %s', (mode, words) => expect(deliveryWords(mode)).toBe(words))
})

describe('predictDelivery', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' } })
  it('predicts isolated', () => expect(predictDelivery(h, 'claude', 'hat-b')).toBe('isolated'))
  it('predicts unisolated in the default hat', () => expect(predictDelivery(h, 'codex', 'hat-a')).toBe('unisolated'))
  it('predicts fallback in another hat', () => expect(predictDelivery(h, 'codex', 'hat-b')).toBe('fallback'))
  it('predicts unsupported from an accepted capability-negative hello', () =>
    expect(predictDelivery(host(), 'codex', 'hat-a')).toBe('unsupported'))
  it('keeps missing host reports unknown', () => {
    expect(predictDelivery(undefined, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(host({ last_seen_at: undefined }), 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery({ ...h, mcp_delivery: undefined }, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'other', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'constructor', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'codex', undefined)).toBe('unknown')
  })
  it('reads newer values conservatively', () => {
    const newer = { ...h, mcp_delivery: JSON.parse('{"codex":"future"}') }
    expect(predictDelivery(newer, 'codex', 'hat-a')).toBe('unisolated')
    expect(predictDelivery(newer, 'codex', 'hat-b')).toBe('fallback')
  })
})

describe('predictionWords', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported', 'unknown'] as const)('words %s without a live-health promise', (mode) =>
    expect(predictionWords(mode)).toBe('Prediction from the host’s last report: ' + deliveryWords(mode)))
})

describe('runningLifecycle', () => {
  it.each(['starting', 'active'])('recognises %s', (state) => expect(runningLifecycle(state)).toBe(true))
  it.each(['parked', 'failed', 'closed', undefined, 'future'])('does not treat %s as running', (state) =>
    expect(runningLifecycle(state)).toBe(false))
})
```

**Create:** `web/src/lib/stdio.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { ApiFailure } from '../api/errors'
import { canKeepEnv, stdioRefusal, stdioRequest } from './stdio'
import type { McpStdioServerItem } from '../generated/protocol'

const before: McpStdioServerItem = {
  name: 'files', command: 'server', args: [''], env: [{ name: 'TOKEN', has_value: true }],
  created_at: '2026-10-13T00:00:00Z', updated_at: '2026-10-13T00:00:00Z',
}

describe('env retention', () => {
  it('keeps only unchanged name, command and a stored env key', () => {
    expect(canKeepEnv(before, 'files', 'server', 'TOKEN')).toBe(true)
    expect(canKeepEnv(before, 'renamed', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'changed', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'server', 'MISSING')).toBe(false)
    expect(canKeepEnv({ ...before, env: [{ name: 'TOKEN', has_value: false }] }, 'files', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(undefined, 'files', 'server', 'TOKEN')).toBe(false)
  })
})

describe('full-set request', () => {
  it('keeps omissions distinct from empty and multiline values and preserves argv', () => {
    const draft = [{
      id: 1, name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
      env: [{ id: 2, name: 'KEPT', keep: true }, { id: 3, name: 'EMPTY', keep: false }, { id: 4, name: 'LINES', keep: false }],
    }]
    const reads: number[] = []
    expect(stdioRequest(draft, (_server, env) => { reads.push(env); return env === 4 ? 'a\nb' : '' })).toEqual({
      servers: [{ name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
        env: [{ name: 'KEPT' }, { name: 'EMPTY', value: '' }, { name: 'LINES', value: 'a\nb' }] }],
    })
    expect(reads).toEqual([3, 4])
    expect(stdioRequest([], () => 'unused')).toEqual({ servers: [] })
  })
})

describe('stdio refusals', () => {
  it('does not guess which place disappeared', () =>
    expect(stdioRefusal(new ApiFailure(404, { code: 'not_found', message: 'raw' }))).toBe('This host or hat no longer exists.'))
  it('keeps invalid field text', () =>
    expect(stdioRefusal(new ApiFailure(400, { code: 'invalid', message: 'server 1: command is empty' }))).toBe('server 1: command is empty'))
  it.each([
    ['env_value_missing', 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.'],
    ['too_many_stdio_servers', 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.'],
    ['host_revoked', 'This host is revoked: its local MCP servers can be read, not changed.'],
    ['slug_taken', 'This slug is taken: pick another.'],
    ['mcp_isolation_unavailable', 'The host could not isolate this agent’s MCP servers. Try again.'],
  ])('words %s', (code, message) => expect(stdioRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
})
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/api/mcp-stdio.test.ts src/lib/mcpDelivery.test.ts src/lib/stdio.test.ts`.

**Expected:** exit 1, assertions fail or required new modules are missing.

<!-- PHASE 1 FEAT 48ee809b72135802ff387f4755eb1c1a07bbe593 -->

**Files:** `web/src/api/errors.ts`, `web/src/api/mcp.ts`, `web/src/components/items/Marker.tsx`, `web/src/lib/mcpDelivery.ts`, `web/src/lib/stdio.ts`.

- [ ] Step 3: Implement the task.

**Replace:** `web/src/api/errors.ts` (this exact block once).

Before:

```typescript
  too_many_subscriptions: 'Remove a device before adding another: 32 at most.',
  endpoint_taken: 'This browser receives notifications for another account.',
  slug_taken: 'This slug is taken: pick another.',
  too_many_connections: 'There are 256 connections already: delete one first.',
  unsupported_cred_kind: 'This collector cannot sign in to a server this way yet.',
  wrong_cred_kind: 'Only a connection that authenticates with a token takes one.',
}

export class ApiFailure extends Error {
  readonly status: number
  readonly code: string
  /** The server's own message, shown as text when the code is unknown. */
```

After:

```typescript
  too_many_subscriptions: 'Remove a device before adding another: 32 at most.',
  endpoint_taken: 'This browser receives notifications for another account.',
  slug_taken: 'This slug is taken: pick another.',
  too_many_connections: 'There are 256 connections already: delete one first.',
  unsupported_cred_kind: 'This collector cannot sign in to a server this way yet.',
  wrong_cred_kind: 'Only a connection that authenticates with a token takes one.',
  env_value_missing: 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.',
  too_many_stdio_servers: 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.',
  host_revoked: 'This host is revoked.',
  mcp_isolation_unavailable: 'The host could not isolate this agent’s MCP servers. Try again.',
}

export class ApiFailure extends Error {
  readonly status: number
  readonly code: string
  /** The server's own message, shown as text when the code is unknown. */
```

**Replace:** `web/src/api/mcp.ts` (this exact block once).

Before:

```typescript
// Which of them need a fresh step-up is the server's to say: the client
// opens the dialog on 403 `step_up_required` and retries once.
import type {
  CreateMcpConnectionRequest,
  McpConnectionItem,
  UpdateMcpConnectionRequest,
} from '../generated/protocol'
import type { Client } from './client'

const id = (value: string) => encodeURIComponent(value)

export function connections(client: Client): Promise<McpConnectionItem[]> {
```

After:

```typescript
// Which of them need a fresh step-up is the server's to say: the client
// opens the dialog on 403 `step_up_required` and retries once.
import type {
  CreateMcpConnectionRequest,
  McpConnectionItem,
  UpdateMcpConnectionRequest,
  McpStdioServerSet,
  McpStdioServersRequest,
} from '../generated/protocol'
import type { Client } from './client'

const id = (value: string) => encodeURIComponent(value)

export function connections(client: Client): Promise<McpConnectionItem[]> {
```

**Replace:** `web/src/api/mcp.ts` (this exact block once).

Before:

```typescript
}

/** A static token, write-only: 204, nothing comes back. Step-up. */
export function setToken(client: Client, connectionId: string, token: string): Promise<void> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/credential`, { token })
}
```

After:

```typescript
}

/** A static token, write-only: 204, nothing comes back. Step-up. */
export function setToken(client: Client, connectionId: string, token: string): Promise<void> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/credential`, { token })
}

const stdioPath = (host: string, hat: string) => '/api/mcp/stdio-servers?' + new URLSearchParams({ host_id: host, hat_id: hat })

export function stdioServers(client: Client, host: string, hat: string): Promise<McpStdioServerSet> {
  return client.request('GET', stdioPath(host, hat))
}

/** Step-up; the entire set replaces the stored one. */
export function replaceStdioServers(client: Client, host: string, hat: string, body: McpStdioServersRequest): Promise<McpStdioServerSet> {
  return client.request('PUT', stdioPath(host, hat), body)
}
```

**Replace:** `web/src/components/items/Marker.tsx` (this exact block once).

Before:

```tsx
  },
  start_failed: {
    agent_has_no_record: 'the agent has no record of this session',
    agent_not_logged_in: 'the agent is not logged in on the host',
    load_unsupported: 'the agent cannot open an earlier session',
    start_failed: 'the agent could not start',
    start_not_delivered: 'the start never reached the host',
    host_offline: 'the host went offline before it started',
    host_revoked: 'the host was revoked',
    unknown_agent: 'the host does not know this agent',
  },
  host_note: {
```

After:

```tsx
  },
  start_failed: {
    agent_has_no_record: 'the agent has no record of this session',
    agent_not_logged_in: 'the agent is not logged in on the host',
    load_unsupported: 'the agent cannot open an earlier session',
    start_failed: 'the agent could not start',
    mcp_isolation_unavailable: 'the host could not isolate this agent’s MCP servers',
    start_not_delivered: 'the start never reached the host',
    host_offline: 'the host went offline before it started',
    host_revoked: 'the host was revoked',
    unknown_agent: 'the host does not know this agent',
  },
  host_note: {
```

**Create:** `web/src/lib/mcpDelivery.ts`

```typescript
// Delivery is a last-start/resume decision, never a live health check.
import type { HostItem } from '../generated/protocol'

export type DeliveryMode = 'unknown' | 'isolated' | 'unisolated' | 'fallback' | 'unsupported'

export function deliveryWords(mode: unknown): string {
  switch (mode) {
    case 'isolated':
      return 'Hennery keeps this agent to the MCP servers of this hat.'
    case 'unisolated':
      return 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'
    case 'fallback':
      return 'No hennery MCP servers: this hat is not the host’s default for this agent.'
    case 'unsupported':
      return 'No hennery MCP servers: the host does not support their delivery.'
    default:
      return 'MCP delivery is unknown.'
  }
}

/** Unknown/missing reports never imply isolation. An accepted capability-
 *  negative hello is distinct from a host that has never reported. */
export function predictDelivery(host: HostItem | undefined, agent: string, hat: string | undefined): DeliveryMode {
  if (!host || !agent || !hat) return 'unknown'
  if (!host.capabilities.includes('mcp_servers')) {
    if (host.last_seen_at === undefined) return 'unknown'
    return 'unsupported'
  }
  const map = host.mcp_delivery
  if (!map || !Object.hasOwn(map, agent)) return 'unknown'
  if (map[agent] === 'isolated') return 'isolated'
  // An unknown future agent-delivery value is read as default_hat_only.
  if (hat === host.default_hat_id) return 'unisolated'
  return 'fallback'
}

export function predictionWords(mode: DeliveryMode): string {
  return 'Prediction from the host’s last report: ' + deliveryWords(mode)
}

export const CODEX_MCP_NOTE =
  'This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.'

/** Only a non-running → running transition invalidates delivery metadata. */
export function runningLifecycle(lifecycle: string | undefined): boolean {
  return lifecycle === 'starting' || lifecycle === 'active'
}
```

**Create:** `web/src/lib/stdio.ts`

```typescript
import { ApiFailure, messageOf } from '../api/errors'
import type { McpStdioServerItem, McpStdioServersRequest } from '../generated/protocol'

export interface StdioEnvDraft { id: number; name: string; keep: boolean }
export interface StdioDraft { id: number; name: string; command: string; args: string[]; env: StdioEnvDraft[] }

/** Keep is scoped to the server's original identity and command. */
export function canKeepEnv(before: McpStdioServerItem | undefined, name: string, command: string, env: string): boolean {
  return before !== undefined && before.name === name && before.command === command &&
    before.env.some((entry) => entry.name === env && entry.has_value)
}

/** Values are read once from uncontrolled DOM fields, not React state.
 *  The caller clears them before retaining this request for step-up/retry. */
export function stdioRequest(drafts: StdioDraft[], read: (server: number, env: number) => string): McpStdioServersRequest {
  return {
    servers: drafts.map((server) => ({
      name: server.name, command: server.command, args: server.args,
      env: server.env.map((entry) => entry.keep ? { name: entry.name } : { name: entry.name, value: read(server.id, entry.id) }),
    })),
  }
}

export function stdioRefusal(err: unknown): string {
  if (err instanceof ApiFailure && err.code === 'not_found') return 'This host or hat no longer exists.'
  if (err instanceof ApiFailure && err.code === 'host_revoked') return 'This host is revoked: its local MCP servers can be read, not changed.'
  return messageOf(err)
}
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web test src/api/mcp-stdio.test.ts src/lib/mcpDelivery.test.ts src/lib/stdio.test.ts`.

**Expected:** exit 0, all selected tests pass. Then run typecheck and the full Vitest suite; 1406 tests pass.

- [ ] Step 5: Run the corresponding probes below, restore every file byte for byte, review the diff against the rules, commit `feat(web): add MCP delivery classifiers and local server routes` with signing off, check the gmail author and push once. If SSH is refused, record it and continue locally, with no alternate key or transport.


### Task 2: Last-start session delivery and bounded refresh

Read detail on open and the approved invalidations. Share pending reads per client/session and coalesce queued invalidations with latest-result guards. The header uses this same detail; summary-fed headers stay authoritative while present. Search/filter summary disappearance alone is not another read. Show mode/count as a last-start/resume decision; never invent a missing count. Codex’s own-config caveat remains plain for every recorded mode.

<!-- PHASE 2 TEST cb2b29ef48539e1139dced8bbb0986be8d658c39 -->

**Files:** `web/src/components/McpDelivery.test.tsx`, `web/src/components/SessionLink.test.tsx`, `web/src/hooks/useMcpDelivery.test.tsx`, `web/src/screens/Session.host.test.tsx`, `web/src/screens/Session.test.tsx`.

- [ ] Step 1: Add the failing tests.

**Create:** `web/src/components/McpDelivery.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import McpDelivery from './McpDelivery'
import type { McpSessionDelivery } from '../generated/protocol'
import { deliveryWords, CODEX_MCP_NOTE } from '../lib/mcpDelivery'

describe('last-start/resume delivery', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported'] as const)('shows %s as a decision, with count', (mode) => {
    const delivery: McpSessionDelivery = { mode, servers: mode === 'isolated' ? 0 : 2, at: '2026-10-13T00:00:00Z' }
    render(<McpDelivery agent="codex" delivery={delivery} />)
    const region = screen.getByRole('region', { name: 'MCP delivery' })
    expect(region).toHaveTextContent('At the last start/resume: ' + deliveryWords(mode))
    expect(region).toHaveTextContent(String(delivery.servers) + ' MCP servers.')
    expect(region).toHaveTextContent(CODEX_MCP_NOTE)
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
  })
  it('does not apply the Codex-specific note to another agent', () => {
    render(<McpDelivery agent="claude" />)
    expect(screen.queryByText(CODEX_MCP_NOTE)).toBeNull()
  })
})
```

**Replace:** `web/src/components/SessionLink.test.tsx` (this exact block once).

Before:

```tsx
  at('/')
  // @ts-expect-error jsdom has none; each test sets its own
  delete window.matchMedia
})

describe('the session’s header, from the list (F-4)', () => {
  it('follows the list stream’s upserts, and fetches no detail when the list holds the session', async () => {
    at('/sessions/a')
    const s = server()
    render(<App fetchImpl={s.fetch} />)
    await titled('Task a')
    await within(main()).findByText('a says hello')
    await waitFor(() => expect(s.listStreams).toHaveLength(1))
    act(() =>
      s.listStreams[0].event('session_upsert', summary('a', { title: 'Task a, renamed', activity: 'running', last_event_at: '2026-10-02T11:30:00.000Z' }), 'e1:2'),
    )
    await titled('Task a, renamed')
    expect(within(main()).getByText('Running')).toBeInTheDocument()
    // The view opened before the list's first page came: it waited for it.
    expect(s.of('/api/sessions/a')).toHaveLength(0)
  })

  it('a session the view finds removed leaves the list at once', async () => {
    at('/sessions/a')
    const s = server()
    render(<App fetchImpl={s.fetch} />)
```

After:

```tsx
  at('/')
  // @ts-expect-error jsdom has none; each test sets its own
  delete window.matchMedia
})

describe('the session’s header, from the list (F-4)', () => {
  it('follows summary upserts without refetching the delivery detail', async () => {
    at('/sessions/a')
    const s = server()
    render(<App fetchImpl={s.fetch} />)
    await titled('Task a')
    await within(main()).findByText('a says hello')
    await waitFor(() => expect(s.listStreams).toHaveLength(1))
    act(() =>
      s.listStreams[0].event('session_upsert', summary('a', { title: 'Task a, renamed', activity: 'running', last_event_at: '2026-10-02T11:30:00.000Z' }), 'e1:2'),
    )
    await titled('Task a, renamed')
    expect(within(main()).getByText('Running')).toBeInTheDocument()
    // One detail read supplies MCP metadata; header-only upserts add no reads.
    expect(s.of('/api/sessions/a')).toHaveLength(1)
  })

  it('a session the view finds removed leaves the list at once', async () => {
    at('/sessions/a')
    const s = server()
    render(<App fetchImpl={s.fetch} />)
```

**Replace:** `web/src/components/SessionLink.test.tsx` (this exact block once).

Before:

```tsx
    act(() => s.itemStreams[0].event('session_removed', { session_id: 'a' }))
    expect(await within(main()).findByRole('heading', { name: 'This session was deleted' })).toBeInTheDocument()
    await waitFor(() => expect(within(list).queryByText('Task a', { exact: true })).toBeNull())
    expect(within(list).getByText('Task a-old', { exact: true })).toBeInTheDocument()
  })

  it('fetches the detail only for a session the list does not hold', async () => {
    at('/sessions/elsewhere')
    const s = server()
    render(<App fetchImpl={s.fetch} />)
    await titled('Detail elsewhere')
    expect(within(main()).getByText('elsewhere says hello')).toBeInTheDocument()
    expect(s.of('/api/sessions/elsewhere')).toHaveLength(1)
```

After:

```tsx
    act(() => s.itemStreams[0].event('session_removed', { session_id: 'a' }))
    expect(await within(main()).findByRole('heading', { name: 'This session was deleted' })).toBeInTheDocument()
    await waitFor(() => expect(within(list).queryByText('Task a', { exact: true })).toBeNull())
    expect(within(list).getByText('Task a-old', { exact: true })).toBeInTheDocument()
  })

  it('uses the same detail for the header when the list does not hold the session', async () => {
    at('/sessions/elsewhere')
    const s = server()
    render(<App fetchImpl={s.fetch} />)
    await titled('Detail elsewhere')
    expect(within(main()).getByText('elsewhere says hello')).toBeInTheDocument()
    expect(s.of('/api/sessions/elsewhere')).toHaveLength(1)
```

**Replace:** `web/src/components/SessionLink.test.tsx` (this exact block once).

Before:

```tsx
    render(<App fetchImpl={s.fetch} />)
    await titled('Task a')
    const views = await rail()
    await userEvent.type(within(views).getByRole('searchbox', { name: 'Search sessions' }), 'zzz')
    await waitFor(() => expect(s.of(LIST).some((u) => u.searchParams.get('q') === 'zzz')).toBe(true), { timeout: 3000 })
    expect(title()).toHaveTextContent('Task a')
    expect(s.of('/api/sessions/a')).toHaveLength(0)
  })

  it('fetches the detail when the list cannot be read', async () => {
    at('/sessions/a')
    const s = server({ list: () => json({ code: 'internal', message: 'down' }, 500) })
    render(<App fetchImpl={s.fetch} />)
```

After:

```tsx
    render(<App fetchImpl={s.fetch} />)
    await titled('Task a')
    const views = await rail()
    await userEvent.type(within(views).getByRole('searchbox', { name: 'Search sessions' }), 'zzz')
    await waitFor(() => expect(s.of(LIST).some((u) => u.searchParams.get('q') === 'zzz')).toBe(true), { timeout: 3000 })
    expect(title()).toHaveTextContent('Task a')
    expect(s.of('/api/sessions/a')).toHaveLength(1)
  })

  it('fetches the detail when the list cannot be read', async () => {
    at('/sessions/a')
    const s = server({ list: () => json({ code: 'internal', message: 'down' }, 500) })
    render(<App fetchImpl={s.fetch} />)
```

**Create:** `web/src/hooks/useMcpDelivery.test.tsx`

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMcpDelivery } from './useMcpDelivery'
import { json, routed } from '../test-stream'
import { sessionDetail } from '../api/view'

const report = (count = 1) => json({ session_id: 's1', agent: 'codex',
  mcp_delivery: { mode: 'unisolated', servers: count, at: '2026-10-13T00:00:00Z' } })

describe('bounded session delivery reads', () => {
  it('reads on open, never on focus or same-lifecycle renders, and refreshes the specified transitions', async () => {
    const t = routed(() => report())
    const { result, rerender } = renderHook(({ lifecycle, resync }) => useMcpDelivery('s1', lifecycle, resync),
      { wrapper: t.wrapper, initialProps: { lifecycle: 'parked', resync: 0 } })
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(1))
    expect(t.calls).toHaveLength(1)
    act(() => window.dispatchEvent(new Event('focus')))
    rerender({ lifecycle: 'parked', resync: 0 })
    expect(t.calls).toHaveLength(1)
    rerender({ lifecycle: 'starting', resync: 0 })
    await waitFor(() => expect(t.calls).toHaveLength(2))
    rerender({ lifecycle: 'active', resync: 0 })
    expect(t.calls).toHaveLength(2)
    rerender({ lifecycle: 'active', resync: 1 })
    await waitFor(() => expect(t.calls).toHaveLength(3))
    act(() => result.current.refresh())
    await waitFor(() => expect(t.calls).toHaveLength(4))
  })

  it('coalesces overlapping invalidations and discards the older answer', async () => {
    const releases: Array<(response: Response) => void> = []
    const t = routed(() => new Promise<Response>((done) => releases.push(done)))
    const { result } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper: t.wrapper })
    expect(t.calls).toHaveLength(1)
    act(() => { result.current.refresh(); result.current.refresh(); result.current.refresh() })
    expect(t.calls).toHaveLength(1)
    await act(async () => releases[0](report(1)))
    await waitFor(() => expect(t.calls).toHaveLength(2))
    expect(result.current.detail).toBeNull()
    await act(async () => releases[1](report(3)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(3))
    expect(t.calls).toHaveLength(2)
  })

  it('never shows the previous session and does not continue an unmounted queue', async () => {
    const releases: Array<(response: Response) => void> = []
    const t = routed(() => new Promise<Response>((done) => releases.push(done)))
    const { result, rerender, unmount } = renderHook(({ id }) => useMcpDelivery(id, 'active', 0),
      { wrapper: t.wrapper, initialProps: { id: 's1' } })
    rerender({ id: 's2' })
    expect(result.current.detail).toBeNull()
    await act(async () => releases[1](report(20)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(20))
    await act(async () => releases[0](report(10)))
    expect(result.current.detail?.mcp_delivery?.servers).toBe(20)
    act(() => result.current.refresh())
    act(() => result.current.refresh())
    unmount()
    await act(async () => releases[2](report(30)))
    expect(t.calls).toHaveLength(3)
  })

  it('shows a read refusal and discards a stale refusal after a refresh', async () => {
    const t = routed(() => json({ code: 'gone', message: 'Not available' }, 500))
    const { result } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper: t.wrapper })
    await waitFor(() => expect(result.current.error).toBe('Not available'))
    expect(result.current.detail).toBeNull()
  })

  it('does not publish a superseded error', async () => {
    const releases: Array<(response: Response) => void> = []
    const t = routed(() => new Promise<Response>((done) => releases.push(done)))
    const { result } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper: t.wrapper })
    act(() => result.current.refresh())
    await act(async () => releases[0](json({ code: 'failed', message: 'old error' }, 500)))
    expect(result.current.error).toBeNull()
    await act(async () => releases[1](report(4)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(4))
  })

  it('shares an in-flight detail read with the existing header and across a remount', async () => {
    let release: (r: Response) => void = () => {}
    const t = routed(() => new Promise<Response>((done) => { release = done }))
    const first = sessionDetail(t.client, 's1')
    const { result } = renderHook(() => useMcpDelivery('s1', undefined, 0), { wrapper: t.wrapper })
    expect(t.calls).toHaveLength(1)
    await act(async () => release(report(2)))
    await first
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(2))
    const next = sessionDetail(t.client, 's1')
    expect(t.calls).toHaveLength(2)
    await act(async () => release(report(3)))
    await next
  })
})
```

**Replace:** `web/src/screens/Session.host.test.tsx` (this exact block once).

Before:

```tsx
    const s = server(false, [hostMarker('host_back', '2026-10-02T09:30:00.000Z'), message('m1', 't1'), sent])
    render(<SessionView id="s1" timing={FAST} />, { wrapper: s.wrapper })
    await settled(s)
    expect(await screen.findByText(NOTE, { exact: true }, WAIT)).toBeInTheDocument()
  })

  it('the summary’s presumed_parked, as a session_upsert changes it, turns the note on and off, with no request', async () => {
    const s = server(true)
    const summary = (presumed_parked: boolean): SessionSummary =>
      ({
        session_id: 's1',
        host_id: 'h1',
        agent: 'claude',
```

After:

```tsx
    const s = server(false, [hostMarker('host_back', '2026-10-02T09:30:00.000Z'), message('m1', 't1'), sent])
    render(<SessionView id="s1" timing={FAST} />, { wrapper: s.wrapper })
    await settled(s)
    expect(await screen.findByText(NOTE, { exact: true }, WAIT)).toBeInTheDocument()
  })

  it('the summary’s presumed_parked, as a session_upsert changes it, turns the note on and off, refreshing metadata only on the running transition', async () => {
    const s = server(true)
    const summary = (presumed_parked: boolean): SessionSummary =>
      ({
        session_id: 's1',
        host_id: 'h1',
        agent: 'claude',
```

**Replace:** `web/src/screens/Session.host.test.tsx` (this exact block once).

Before:

```tsx

    r.rerender(<SessionView id="s1" summary={summary(true)} timing={FAST} />)
    expect(await screen.findByText(NOTE, { exact: true }, WAIT)).toBeInTheDocument()

    r.rerender(<SessionView id="s1" summary={summary(false)} timing={FAST} />)
    await waitFor(() => expect(screen.queryByText(NOTE, { exact: true })).toBeNull(), WAIT)
    expect(s.calls.length).toBe(calls)
  })
})
```

After:

```tsx

    r.rerender(<SessionView id="s1" summary={summary(true)} timing={FAST} />)
    expect(await screen.findByText(NOTE, { exact: true }, WAIT)).toBeInTheDocument()

    r.rerender(<SessionView id="s1" summary={summary(false)} timing={FAST} />)
    await waitFor(() => expect(screen.queryByText(NOTE, { exact: true })).toBeNull(), WAIT)
    expect(s.calls.length).toBe(calls + 1)
  })
})
```

**Replace:** `web/src/screens/Session.test.tsx` (this exact block once).

Before:

```tsx
/** A server for one session. `pages` are served in turn (the last repeats);
 *  `older` by `before_turn`. */
function server(opts: {
  pages: (() => Answer)[]
  older?: Record<string, () => Answer>
  detail?: () => Answer
  hats?: () => Answer
}) {
  const streams: LiveStream[] = []
  const pages = [...opts.pages]
  const t = routed((call: Call) => {
    const url = new URL(call.path, 'http://h')
```

After:

```tsx
/** A server for one session. `pages` are served in turn (the last repeats);
 *  `older` by `before_turn`. */
function server(opts: {
  pages: (() => Answer)[]
  older?: Record<string, () => Answer>
  detail?: () => Answer
  resume?: () => Answer
  hats?: () => Answer
}) {
  const streams: LiveStream[] = []
  const pages = [...opts.pages]
  const t = routed((call: Call) => {
    const url = new URL(call.path, 'http://h')
```

**Replace:** `web/src/screens/Session.test.tsx` (this exact block once).

Before:

```tsx
    if (url.pathname === STREAM) {
      const live = liveStream()
      streams.push(live)
      return live.response
    }
    if (url.pathname === DETAIL) return opts.detail?.() ?? json(detail('claude'))
    if (url.pathname === `${DETAIL}/catalog`) return json({ session_id: ID, config_options: [], commands: [] })
    if (url.pathname === '/api/hosts') return json([{ host_id: 'h1', name: 'build-box' }])
    if (url.pathname === '/api/hats') return opts.hats?.() ?? json({ code: 'not_found', message: 'no' }, 404)
    return json({ code: 'not_found', message: 'no' }, 404)
  })
  const of = (path: string) => t.calls.filter((c) => new URL(c.path, 'http://h').pathname === path)
```

After:

```tsx
    if (url.pathname === STREAM) {
      const live = liveStream()
      streams.push(live)
      return live.response
    }
    if (url.pathname === DETAIL) return opts.detail?.() ?? json(detail('claude'))
    if (url.pathname === DETAIL + '/resume') return opts.resume?.() ?? json({ session_id: ID, lifecycle: 'active' }, 202)
    if (url.pathname === `${DETAIL}/catalog`) return json({ session_id: ID, config_options: [], commands: [] })
    if (url.pathname === '/api/hosts') return json([{ host_id: 'h1', name: 'build-box' }])
    if (url.pathname === '/api/hats') return opts.hats?.() ?? json({ code: 'not_found', message: 'no' }, 404)
    return json({ code: 'not_found', message: 'no' }, 404)
  })
  const of = (path: string) => t.calls.filter((c) => new URL(c.path, 'http://h').pathname === path)
```

**Replace:** `web/src/screens/Session.test.tsx` (this exact block once).

Before:

```tsx
    act(() => s.streams[0].event('resync_required', {}))
    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument()
    await act(async () => release(json(page(rows(3, 't6')))))
    expect(await screen.findByText('Resynced')).toBeInTheDocument()
    expect(screen.queryByText('Reconnecting…')).toBeNull()
    expect(screen.getByText('t6-2')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Resynced')).toBeNull(), { timeout: 5000 })
  })

  it('says a deleted session was deleted, and opens no stream', async () => {
    const s = server({ pages: [() => json({ code: 'not_found', message: 'gone' }, 404)] })
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
```

After:

```tsx
    act(() => s.streams[0].event('resync_required', {}))
    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument()
    await act(async () => release(json(page(rows(3, 't6')))))
    expect(await screen.findByText('Resynced')).toBeInTheDocument()
    expect(screen.queryByText('Reconnecting…')).toBeNull()
    expect(screen.getByText('t6-2')).toBeInTheDocument()
    await waitFor(() => expect(s.of(DETAIL)).toHaveLength(2))
    await waitFor(() => expect(screen.queryByText('Resynced')).toBeNull(), { timeout: 5000 })
  })

  it('says a deleted session was deleted, and opens no stream', async () => {
    const s = server({ pages: [() => json({ code: 'not_found', message: 'gone' }, 404)] })
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
```

**Replace:** `web/src/screens/Session.test.tsx` (this exact block once).

Before:

```tsx
    const { container } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(Array.from(container.querySelectorAll('.msg-who')).map((e) => e.textContent)).toEqual(['You', label]))
    // The avatars carry a letter of the label, never anyone's initials.
    expect(Array.from(container.querySelectorAll('.avatar')).map((e) => e.textContent)).toEqual(['Y', label[0].toUpperCase()])
  })

  it('reads the header from the session’s detail when no summary is given', async () => {
    const s = server({
      pages: [() => json(page(rows(1, 't5')))],
      detail: () => json(detail('codex', { title: 'Fix the build', git_branch: 'main', model: 'gpt-x', mode: 'auto', activity: 'running' })),
    })
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
```

After:

```tsx
    const { container } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(Array.from(container.querySelectorAll('.msg-who')).map((e) => e.textContent)).toEqual(['You', label]))
    // The avatars carry a letter of the label, never anyone's initials.
    expect(Array.from(container.querySelectorAll('.avatar')).map((e) => e.textContent)).toEqual(['Y', label[0].toUpperCase()])
  })

  it('refreshes delivery after this tab successfully resumes', async () => {
    let count = 1
    const s = server({
      pages: [() => json(page(rows(1, 't5')))],
      detail: () => json(detail('codex', { lifecycle: 'parked', mcp_delivery: {
        mode: 'unisolated', servers: count, at: '2026-10-13T00:00:00Z',
      } })),
      resume: () => { count = 2; return json({ session_id: ID, lifecycle: 'active' }, 202) },
    })
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('1 MCP servers.'))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('2 MCP servers.'))
    expect(s.of(DETAIL)).toHaveLength(2)
  })

  it('reads the header from the session’s detail when no summary is given', async () => {
    const s = server({
      pages: [() => json(page(rows(1, 't5')))],
      detail: () => json(detail('codex', { title: 'Fix the build', git_branch: 'main', model: 'gpt-x', mode: 'auto', activity: 'running' })),
    })
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
```

**Replace:** `web/src/screens/Session.test.tsx` (this exact block once).

Before:

```tsx
  it('reads an idle detail with no pending request as “Idle”', async () => {
    const s = server({ pages: [() => json(page(rows(1, 't5')))], detail: () => json(detail('claude', { activity: 'idle' })) })
    const { container } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(container.querySelector('header .badge')?.textContent).toBe('Idle'))
  })

  it('reads the header from the summary it is given, without fetching the detail', async () => {
    const summary = { ...detail('claude'), pending: undefined, title: undefined, question_waits: true } as unknown as SessionSummary
    const s = server({ pages: [() => json(page(rows(1, 't5')))] })
    render(<SessionView id={ID} summary={summary} timing={FAST} />, { wrapper: s.wrapper })
    // No title: the project directory's name.
    expect(await screen.findByRole('heading', { name: 'project' })).toBeInTheDocument()
    expect(screen.getByText('Waiting on a question')).toBeInTheDocument()
    await screen.findByText('t5-0')
    expect(s.of(DETAIL)).toHaveLength(0)
  })

  it('follows the summary it is given as it changes', async () => {
    const base = { ...detail('claude'), pending: undefined, title: 'A task' } as unknown as SessionSummary
    const s = server({ pages: [() => json(page(rows(1, 't5')))] })
    const { rerender } = render(<SessionView id={ID} summary={base} timing={FAST} />, { wrapper: s.wrapper })
    const head = (await screen.findByRole('heading', { name: 'A task' })).closest('header') as HTMLElement
    expect(within(head).getByText('Idle')).toBeInTheDocument()
    rerender(<SessionView id={ID} summary={{ ...base, activity: 'running', title: 'A renamed task' }} timing={FAST} />)
    expect(within(head).getByText('Running')).toBeInTheDocument()
    expect(within(head).getByRole('heading', { name: 'A renamed task' })).toBeInTheDocument()
    expect(s.of(DETAIL)).toHaveLength(0)
  })

  it('takes the summary over a detail fetched before it came', async () => {
    const s = server({ pages: [() => json(page(rows(1, 't5')))], detail: () => json(detail('codex', { title: 'From the detail' })) })
    const { rerender } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await screen.findByRole('heading', { name: 'From the detail' })
    const summary = { ...detail('codex'), pending: undefined, title: 'From the list' } as unknown as SessionSummary
    rerender(<SessionView id={ID} summary={summary} timing={FAST} />)
    expect(await screen.findByRole('heading', { name: 'From the list' })).toBeInTheDocument()
  })

  it('keeps a summary that went over the detail fetched before it, until the detail comes again', async () => {
    let release: (() => void) | undefined
    let calls = 0
    const s = server({
      pages: [() => json(page(rows(1, 't5')))],
      detail: () => {
        calls++
        if (calls === 1) return json(detail('codex', { title: 'From the detail' }))
        // The refetch, once the summary went: held until released.
        return new Promise<Response>((resolve) => {
          release = () => resolve(json(detail('codex', { title: 'From the detail, again' })))
        })
      },
    })
    const { rerender } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await screen.findByRole('heading', { name: 'From the detail' })
    const summary = { ...detail('codex'), pending: undefined, title: 'From the list' } as unknown as SessionSummary
    rerender(<SessionView id={ID} summary={summary} timing={FAST} />)
    await screen.findByRole('heading', { name: 'From the list' })
    // The summary goes (a new search's results) while the refetch is held.
    rerender(<SessionView id={ID} timing={FAST} />)
    await waitFor(() => expect(s.of(DETAIL)).toHaveLength(2))
    expect(screen.getByRole('heading', { name: 'From the list' })).toBeInTheDocument()
    act(() => release!())
    expect(await screen.findByRole('heading', { name: 'From the detail, again' })).toBeInTheDocument()
  })

  it.each([
    [{ lifecycle: 'starting' }, 'Starting', 'wait'],
    [{ activity: 'blocked' }, 'Waiting on a question', 'attn'],
    [{ lifecycle: 'parked' }, 'Parked', 'idle'],
```

After:

```tsx
  it('reads an idle detail with no pending request as “Idle”', async () => {
    const s = server({ pages: [() => json(page(rows(1, 't5')))], detail: () => json(detail('claude', { activity: 'idle' })) })
    const { container } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(container.querySelector('header .badge')?.textContent).toBe('Idle'))
  })

  it('keeps the summary-fed header while reading detail for MCP delivery', async () => {
    const summary = { ...detail('claude'), pending: undefined, title: undefined, question_waits: true } as unknown as SessionSummary
    const s = server({ pages: [() => json(page(rows(1, 't5')))] })
    render(<SessionView id={ID} summary={summary} timing={FAST} />, { wrapper: s.wrapper })
    // No title: the project directory's name.
    expect(await screen.findByRole('heading', { name: 'project' })).toBeInTheDocument()
    expect(screen.getByText('Waiting on a question')).toBeInTheDocument()
    await screen.findByText('t5-0')
    expect(s.of(DETAIL)).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
  })

  it('follows the summary it is given as it changes', async () => {
    const base = { ...detail('claude'), pending: undefined, title: 'A task' } as unknown as SessionSummary
    const s = server({ pages: [() => json(page(rows(1, 't5')))] })
    const { rerender } = render(<SessionView id={ID} summary={base} timing={FAST} />, { wrapper: s.wrapper })
    const head = (await screen.findByRole('heading', { name: 'A task' })).closest('header') as HTMLElement
    expect(within(head).getByText('Idle')).toBeInTheDocument()
    rerender(<SessionView id={ID} summary={{ ...base, activity: 'running', title: 'A renamed task' }} timing={FAST} />)
    expect(within(head).getByText('Running')).toBeInTheDocument()
    expect(within(head).getByRole('heading', { name: 'A renamed task' })).toBeInTheDocument()
    expect(s.of(DETAIL)).toHaveLength(1)
  })

  it('takes the summary over a detail fetched before it came', async () => {
    const s = server({ pages: [() => json(page(rows(1, 't5')))], detail: () => json(detail('codex', { title: 'From the detail' })) })
    const { rerender } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await screen.findByRole('heading', { name: 'From the detail' })
    const summary = { ...detail('codex'), pending: undefined, title: 'From the list' } as unknown as SessionSummary
    rerender(<SessionView id={ID} summary={summary} timing={FAST} />)
    expect(await screen.findByRole('heading', { name: 'From the list' })).toBeInTheDocument()
  })

  it('keeps the newest cached summary when a search drops it, without another detail read', async () => {
    const s = server({ pages: [() => json(page(rows(1, 't5')))], detail: () => json(detail('codex', { title: 'From the detail' })) })
    const { rerender } = render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await screen.findByRole('heading', { name: 'From the detail' })
    const summary = { ...detail('codex'), pending: undefined, title: 'From the list' } as unknown as SessionSummary
    rerender(<SessionView id={ID} summary={summary} timing={FAST} />)
    await screen.findByRole('heading', { name: 'From the list' })
    rerender(<SessionView id={ID} timing={FAST} />)
    expect(screen.getByRole('heading', { name: 'From the list' })).toBeInTheDocument()
    expect(s.of(DETAIL)).toHaveLength(1)
  })

  it.each([
    [{ lifecycle: 'starting' }, 'Starting', 'wait'],
    [{ activity: 'blocked' }, 'Waiting on a question', 'attn'],
    [{ lifecycle: 'parked' }, 'Parked', 'idle'],
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/hooks/useMcpDelivery.test.tsx src/components/McpDelivery.test.tsx src/screens/Session.test.tsx src/components/SessionLink.test.tsx src/screens/Session.host.test.tsx`.

**Expected:** exit 1, assertions fail or required new modules are missing.

<!-- PHASE 2 FEAT 8cca50d1d61deaa37e9d636aced316ed9e3c6a3a -->

**Files:** `web/src/api/view.ts`, `web/src/components/McpDelivery.tsx`, `web/src/hooks/useMcpDelivery.ts`, `web/src/index.css`, `web/src/screens/Session.tsx`.

- [ ] Step 3: Implement the task.

**Replace:** `web/src/api/view.ts` (this exact block once).

Before:

```typescript
/** `GET /api/sessions/{id}/catalog`: the config options and slash commands. */
export function catalog(client: Client, id: string): Promise<SessionCatalog> {
  return client.request<SessionCatalog>('GET', `/api/sessions/${enc(id)}/catalog`)
}

/** `GET /api/sessions/{id}`: the session, its open turn and pending requests. */
export function sessionDetail(client: Client, id: string): Promise<SessionDetail> {
  return client.request<SessionDetail>('GET', `/api/sessions/${enc(id)}`)
}

/** The item stream of one session. It resumes from `Last-Event-ID`. */
export function itemStreamPath(id: string): string {
  return `/api/stream/view/sessions/${enc(id)}`
}
```

After:

```typescript
/** `GET /api/sessions/{id}/catalog`: the config options and slash commands. */
export function catalog(client: Client, id: string): Promise<SessionCatalog> {
  return client.request<SessionCatalog>('GET', `/api/sessions/${enc(id)}/catalog`)
}

/** `GET /api/sessions/{id}`: the session, its open turn and pending requests. */
const detailReads = new WeakMap<Client, Map<string, Promise<SessionDetail>>>()

export function sessionDetail(client: Client, id: string): Promise<SessionDetail> {
  let reads = detailReads.get(client)
  if (!reads) { reads = new Map(); detailReads.set(client, reads) }
  const held = reads.get(id)
  if (held) return held
  const pending = client.request<SessionDetail>('GET', `/api/sessions/${enc(id)}`).finally(() => reads.delete(id))
  reads.set(id, pending)
  return pending
}

/** The item stream of one session. It resumes from `Last-Event-ID`. */
export function itemStreamPath(id: string): string {
  return `/api/stream/view/sessions/${enc(id)}`
}
```

**Create:** `web/src/components/McpDelivery.tsx`

```tsx
import type { McpSessionDelivery } from '../generated/protocol'
import { CODEX_MCP_NOTE, deliveryWords } from '../lib/mcpDelivery'

export default function McpDelivery({ agent, delivery }: { agent?: string; delivery?: McpSessionDelivery }) {
  return (
    <section className="mcp-delivery" aria-label="MCP delivery">
      <p>At the last start/resume: {deliveryWords(delivery?.mode)}</p>
      {delivery && <p>{delivery.servers} MCP servers.</p>}
      {agent === 'codex' && <p>{CODEX_MCP_NOTE}</p>}
    </section>
  )
}
```

**Create:** `web/src/hooks/useMcpDelivery.ts`

```typescript
// Delivery metadata has no SSE delta. Only explicit lifecycle/resync
// boundaries trigger a read; streamed messages and focus never do.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { sessionDetail } from '../api/view'
import { messageOf } from '../api/errors'
import type { SessionDetail } from '../generated/protocol'
import { runningLifecycle } from '../lib/mcpDelivery'

interface ReadState { id: string; detail: SessionDetail | null; error: string | null }

export function useMcpDelivery(id: string, lifecycle: string | undefined, resync: number) {
  const client = useClient()
  const [state, setState] = useState<ReadState>({ id, detail: null, error: null })
  const request = useRef<(() => void) | null>(null)
  const previous = useRef<{ id: string; lifecycle: string | undefined; resync: number } | null>(null)
  const refresh = useCallback(() => request.current?.(), [])

  useEffect(() => {
    let live = true
    let wanted = 0
    let busy = false
    setState({ id, detail: null, error: null })
    const run = async () => {
      if (busy) return
      busy = true
      while (live) {
        const generation = wanted
        try {
          const detail = await sessionDetail(client, id)
          if (live && generation === wanted) setState({ id, detail, error: null })
        } catch (err) {
          if (live && generation === wanted) setState({ id, detail: null, error: messageOf(err) })
        }
        if (generation === wanted) break
      }
      busy = false
    }
    request.current = () => { wanted++; void run() }
    request.current()
    return () => { live = false; request.current = null }
  }, [client, id])

  useEffect(() => {
    const before = previous.current
    previous.current = { id, lifecycle, resync }
    if (!before || before.id !== id) return
    const resumed = before.lifecycle !== undefined && !runningLifecycle(before.lifecycle) && runningLifecycle(lifecycle)
    if (resync !== before.resync || resumed) refresh()
  }, [id, lifecycle, resync, refresh])

  return {
    detail: state.id === id ? state.detail : null,
    error: state.id === id ? state.error : null,
    refresh,
  }
}
```

**Replace:** `web/src/index.css` (this exact block once).

Before:

```css
  /* The session's header is the bar: a way back, and its title shown. */
  .back-btn { display:flex; align-items:center; justify-content:center; width:44px; height:44px; flex:none; border-radius:11px; border:1px solid var(--border); background:var(--surface); color:var(--fg-1); }
  .session-head .conv-name { display:block; font-size:16px; }
  .q-opts { flex-direction:column; }
  .q-opts .btn, .ask-actions .btn, .elic-opt { min-height:44px; }
}
```

After:

```css
  /* The session's header is the bar: a way back, and its title shown. */
  .back-btn { display:flex; align-items:center; justify-content:center; width:44px; height:44px; flex:none; border-radius:11px; border:1px solid var(--border); background:var(--surface); color:var(--fg-1); }
  .session-head .conv-name { display:block; font-size:16px; }
  .q-opts { flex-direction:column; }
  .q-opts .btn, .ask-actions .btn, .elic-opt { min-height:44px; }
}

/* Last-start/resume MCP metadata, separate from the streamed transcript. */
.mcp-delivery { margin:8px 20px; padding:12px; border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; }
.mcp-delivery p { margin:0 0 4px; overflow-wrap:anywhere; }
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
//   so, nothing more is fetched, its draft and images are dropped, and it
//   leaves the session list (`onRemoved`). Deleted from here, it also says
//   what the delete left of the agent's transcript on the host.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { hatList, hostList, namesOf } from '../api/names'
import { resume } from '../api/turns'
import { sessionDetail } from '../api/view'
import { useClient } from '../app-client'
import { Composer, type ComposerHandle } from '../components/Composer'
import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
import SessionFooter from '../components/SessionFooter'
import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
import SessionMenu from '../components/SessionMenu'
import { deleteNotes } from '../components/sessionWords'
import Transcript from '../components/Transcript'
import type { ItemEnv } from '../components/items/types'
import type { Capabilities, DeleteResult } from '../generated/protocol'
import type { SessionSummary } from '../generated/view'
import type { Item } from '../generated/view'
import { useAnnouncement } from '../hooks/useAnnouncement'
import { isAnswerable } from '../lib/delivery'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { agentLabel } from '../lib/agent'
```

After:

```tsx
//   so, nothing more is fetched, its draft and images are dropped, and it
//   leaves the session list (`onRemoved`). Deleted from here, it also says
//   what the delete left of the agent's transcript on the host.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { hatList, hostList, namesOf } from '../api/names'
import { resume } from '../api/turns'
import { useClient } from '../app-client'
import { Composer, type ComposerHandle } from '../components/Composer'
import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
import SessionFooter from '../components/SessionFooter'
import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
import McpDelivery from '../components/McpDelivery'
import { useMcpDelivery } from '../hooks/useMcpDelivery'
import SessionMenu from '../components/SessionMenu'
import { deleteNotes } from '../components/sessionWords'
import Transcript from '../components/Transcript'
import type { ItemEnv } from '../components/items/types'
import type { Capabilities, DeleteResult, SessionDetail } from '../generated/protocol'
import type { SessionSummary } from '../generated/view'
import type { Item } from '../generated/view'
import { useAnnouncement } from '../hooks/useAnnouncement'
import { isAnswerable } from '../lib/delivery'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { agentLabel } from '../lib/agent'
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
    const item = items[i]
    if (item.kind === 'plan') return item
  }
  return undefined
}

/** The session's detail, once, unless the caller has its summary (or is
 *  about to). A summary seen once stays shown when the list starts over
 *  (a new search, a filter) until the detail or the summary comes back.
 *  With no summary given, the newer of the detail and the last summary
 *  seen is shown: a detail fetched before a summary came never wins over
 *  it once that summary goes. */
function useHeaderInfo(id: string, summary: SessionSummary | undefined, awaitSummary: boolean): HeaderInfo | undefined {
  const client = useClient()
  // When each source came, in one order.
  const clock = useRef(0)
  const [detail, setDetail] = useState<{ info: HeaderInfo; at: number } | undefined>(undefined)
  const last = useRef<{ info: SessionSummary; at: number } | undefined>(undefined)
  if (summary && last.current?.info !== summary) last.current = { info: summary, at: ++clock.current }
  const needed = summary === undefined && !awaitSummary
  useEffect(() => {
    if (!needed) return
    let live = true
    sessionDetail(client, id).then(
      // The detail has no `question_waits`: its open pending requests say
      // it, as the summary's does ("whether or not an answer is queued"),
      // so a question outside a turn reads "Waiting on a question" here
      // too (decision 8: one status rule for the row and the header).
      (d) =>
        live &&
        setDetail({ info: { ...d, question_waits: Array.isArray(d.pending) && d.pending.length > 0 }, at: ++clock.current }),
      // The item store says when the session is gone; the header stays bare.
      () => {},
    )
    return () => {
      live = false
    }
  }, [client, id, needed])
  if (summary) return summary
  const held = last.current
  if (detail && (!held || detail.at > held.at)) return detail.info
  return held?.info ?? detail?.info
}

/** A list fetched once, when `wanted`; on failure, none (`undefined`). */
function useList(fetch: 'hosts' | 'hats', wanted: boolean): unknown {
  const client = useClient()
  const [list, setList] = useState<unknown>(undefined)
```

After:

```tsx
    const item = items[i]
    if (item.kind === 'plan') return item
  }
  return undefined
}

/** The summary owns the header while present. Delivery's detail read is
 *  shared with the header; a search dropping a summary is not a new read.
 *  Once both sources have been seen, their arrival order decides which
 *  cached one remains when the summary is absent. */
function useHeaderInfo(id: string, summary: SessionSummary | undefined, awaitSummary: boolean, detail: SessionDetail | null): HeaderInfo | undefined {
  const held = useRef<{ id: string; clock: number; summary?: { info: SessionSummary; at: number }; detail?: { source: SessionDetail; info: HeaderInfo; at: number } }>({ id, clock: 0 })
  if (held.current.id !== id) held.current = { id, clock: 0 }
  const current = held.current
  if (detail && current.detail?.source !== detail) {
    current.detail = { source: detail, info: { ...detail, question_waits: Array.isArray(detail.pending) && detail.pending.length > 0 }, at: ++current.clock }
  }
  if (summary && current.summary?.info !== summary) current.summary = { info: summary, at: ++current.clock }
  if (summary) return summary
  if (awaitSummary) return current.summary?.info
  if (current.detail && (!current.summary || current.detail.at > current.summary.at)) return current.detail.info
  return current.summary?.info ?? current.detail?.info
}

/** A list fetched once, when `wanted`; on failure, none (`undefined`). */
function useList(fetch: 'hosts' | 'hats', wanted: boolean): unknown {
  const client = useClient()
  const [list, setList] = useState<unknown>(undefined)
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
  return { visible, held: start, reveal }
}

export default function SessionView({ id, summary, awaitSummary = false, tail = TAIL, timing, onRemoved }: Props) {
  const client = useClient()
  const s = useSessionItems(id, timing)
  const info = useHeaderInfo(id, summary, awaitSummary)
  const win = useTailWindow(s.items, s.loads, tail)
  const narrow = useMediaQuery('(max-width: 767px)')
  const hostItems = useList('hosts', true)
  const hosts = useMemo(() => namesOf(hostItems, 'host_id'), [hostItems])
  const wantsHats = useMemo(() => s.items.some((i) => i.kind === 'marker' && i.marker === 'hat_reassigned'), [s.items])
  const hatItems = useList('hats', wantsHats)
```

After:

```tsx
  return { visible, held: start, reveal }
}

export default function SessionView({ id, summary, awaitSummary = false, tail = TAIL, timing, onRemoved }: Props) {
  const client = useClient()
  const s = useSessionItems(id, timing)
  const mcp = useMcpDelivery(id, summary?.lifecycle, Math.max(0, s.loads - 1))
  const info = useHeaderInfo(id, summary, awaitSummary, mcp.detail)
  const win = useTailWindow(s.items, s.loads, tail)
  const narrow = useMediaQuery('(max-width: 767px)')
  const hostItems = useList('hosts', true)
  const hosts = useMemo(() => namesOf(hostItems, 'host_id'), [hostItems])
  const wantsHats = useMemo(() => s.items.some((i) => i.kind === 'marker' && i.marker === 'hat_reassigned'), [s.items])
  const hatItems = useList('hats', wantsHats)
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
    (question: string) => composer.current?.prefill(answerAsMessage(question), ANSWER_LABEL),
    [],
  )
  const composerEmpty = useCallback(() => composer.current?.isEmpty() ?? true, [])
  // The view's one resume: the footer's Resume and the composer's "Resume
  // and send" both go through it.
  const onResume = useCallback(() => resume(client, id), [client, id])

  // A delete made here: what it left on the host, shown with the deleted
  // state. The answer may come after the stream's `session_removed`.
  const [deleted, setDeleted] = useState<{ id: string; result?: DeleteResult } | null>(null)
  const { markRemoved } = s
  const onDeleted = useCallback(
```

After:

```tsx
    (question: string) => composer.current?.prefill(answerAsMessage(question), ANSWER_LABEL),
    [],
  )
  const composerEmpty = useCallback(() => composer.current?.isEmpty() ?? true, [])
  // The view's one resume: the footer's Resume and the composer's "Resume
  // and send" both go through it.
  const onResume = useCallback(async () => {
    const answer = await resume(client, id)
    mcp.refresh()
    return answer
  }, [client, id, mcp.refresh])

  // A delete made here: what it left on the host, shown with the deleted
  // state. The answer may come after the stream's `session_removed`.
  const [deleted, setDeleted] = useState<{ id: string; result?: DeleteResult } | null>(null)
  const { markRemoved } = s
  const onDeleted = useCallback(
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
            canPark={capabilities?.includes('park') ?? false}
            onDeleted={onDeleted}
            focusAfterDelete={() => back.current}
          />
        }
      />
      <div className="stream-state" role="status">
        {s.stream === 'reconnecting' ? 'Reconnecting…' : s.resynced ? 'Resynced' : ''}
      </div>
      {/* One region for the view: a question that opened without taking the
          focus is said here, politely, never one from the first page. */}
      <p className="sr-only" role="status" aria-live="polite">
```

After:

```tsx
            canPark={capabilities?.includes('park') ?? false}
            onDeleted={onDeleted}
            focusAfterDelete={() => back.current}
          />
        }
      />
      <McpDelivery agent={info?.agent ?? mcp.detail?.agent} delivery={mcp.detail?.mcp_delivery} />
      {mcp.error && <p className="form-error"><bdi>{mcp.error}</bdi></p>}
      <div className="stream-state" role="status">
        {s.stream === 'reconnecting' ? 'Reconnecting…' : s.resynced ? 'Resynced' : ''}
      </div>
      {/* One region for the view: a question that opened without taking the
          focus is said here, politely, never one from the first page. */}
      <p className="sr-only" role="status" aria-live="polite">
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web test src/hooks/useMcpDelivery.test.tsx src/components/McpDelivery.test.tsx src/screens/Session.test.tsx src/components/SessionLink.test.tsx src/screens/Session.host.test.tsx`.

**Expected:** exit 0, all selected tests pass. Then run typecheck and the full Vitest suite; 1419 tests pass.

- [ ] Step 5: Run the corresponding probes below, restore every file byte for byte, review the diff against the rules, commit `feat(web): show last-start delivery with bounded lifecycle refresh` with signing off, check the gmail author and push once. If SSH is refused, record it and continue locally, with no alternate key or transport.


### Task 3: Host/agent predictions on New Session and the mount grid

Use a resolution only while its captured host/path still match the draft. Predictions name the latest host report and the resolved hat, never a live-health promise or an invented count. Mount-grid notes sit outside checkbox labels, preserving their accessible names. Keep the new/resumed-sessions notice; replace the blanket own-CLI note.

<!-- PHASE 3 TEST 6657c28ca013aad352dd42b838feb49243c49aa6 -->

**Files:** `web/src/components/McpPrediction.test.tsx`, `web/src/screens/Mcp.test.tsx`, `web/src/screens/NewSession.test.tsx`.

- [ ] Step 1: Add the failing tests.

**Create:** `web/src/components/McpPrediction.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import McpPrediction from './McpPrediction'
import { predictionHat } from '../lib/mcpDelivery'

describe('delivery prediction', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { codex: 'default_hat_only', claude: 'isolated' } })
  it('shows default-hat Codex as not isolated, including its own configuration', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-a" />)
    const note = screen.getByRole('region', { name: 'MCP prediction' })
    expect(note).toHaveTextContent('Prediction from the host’s last report: The MCP servers are not isolated per hat')
    expect(note).toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('shows fallback in another hat', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-b" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('this hat is not the host’s default')
  })
  it('keeps a missing report unknown', () => {
    render(<McpPrediction host={{ ...h, mcp_delivery: undefined }} agent="codex" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('MCP delivery is unknown.')
  })
  it('does not show a Codex note for Claude', () => {
    render(<McpPrediction host={h} agent="claude" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent')
    expect(screen.queryByText('Codex also loads your own ~/.codex MCP servers.')).toBeNull()
  })
  it('uses only a resolution for the current host and path', () => {
    const resolved = { hostId: 'h1', path: '/project', hat: 'hat-a' }
    expect(predictionHat(resolved, 'h1', '/project')).toBe('hat-a')
    expect(predictionHat(resolved, 'h2', '/project')).toBeUndefined()
    expect(predictionHat(resolved, 'h1', '/different')).toBeUndefined()
    expect(predictionHat(undefined, 'h1', '/project')).toBeUndefined()
  })
})
```

**Replace:** `web/src/screens/Mcp.test.tsx` (this exact block once).

Before:

```tsx
    expect(within(docs).getByText('Not set yet', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('someone', { exact: true })).toBeInTheDocument()
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeChecked()
    expect(within(docs).queryByRole('checkbox', { name: 'old box' })).toBeNull()
  })

  it('says sessions get changes when they start or resume, and how Codex gets them', async () => {
    open({})
    const note = await screen.findByRole('region', { name: 'How sessions get these' })
    expect(note).toHaveTextContent('Changes apply to new and resumed sessions.')
    expect(note).toHaveTextContent(
      'Codex, Claude run with your own CLI, and any other agent command (this may change): a session gets a connection only when both are in its host’s default hat, and it also loads your own MCP servers (such as ~/.codex), so it is not isolated. Sessions in other hats on that host get none.',
    )
  })

  it('words each state, and never asks to reconnect a failing one', async () => {
    open({
      'GET /api/mcp/connections': json(200, [
        connection({ id: 'conn-1', label: 'A', status: 'ok' }),
```

After:

```tsx
    expect(within(docs).getByText('Not set yet', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('someone', { exact: true })).toBeInTheDocument()
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeChecked()
    expect(within(docs).queryByRole('checkbox', { name: 'old box' })).toBeNull()
  })

  it('keeps the start/resume notice and replaces the blanket note with host predictions', async () => {
    open({})
    const note = await screen.findByRole('region', { name: 'How sessions get these' })
    expect(note).toHaveTextContent('Changes apply to new and resumed sessions.')
    expect(note).not.toHaveTextContent('Codex, Claude run with your own CLI')
    expect(await screen.findByText('MCP delivery is unknown for this host’s agents.')).toBeInTheDocument()
  })

  it('annotates the mount grid per reported agent, without changing checkbox names', async () => {
    open({ 'GET /api/hosts': json(200, [host({ capabilities: ['mcp_servers'], mcp_delivery: {
      claude: 'isolated', codex: 'default_hat_only',
    } })]) })
    const docs = await card('Docs')
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeInTheDocument()
    const predictions = within(docs).getAllByRole('region', { name: 'MCP prediction' })
    expect(predictions).toHaveLength(2)
    expect(predictions[0]).toHaveTextContent('Hennery keeps this agent')
    expect(predictions[1]).toHaveTextContent('not isolated per hat')
  })

  it('words each state, and never asks to reconnect a failing one', async () => {
    open({
      'GET /api/mcp/connections': json(200, [
        connection({ id: 'conn-1', label: 'A', status: 'ok' }),
```

**Replace:** `web/src/screens/NewSession.test.tsx` (this exact block once).

Before:

```tsx
      <NewSession />
    </ClientContext.Provider>,
  )
  return server
}

const hostButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const projectField = () => screen.findByRole('combobox', { name: /^Project/ })
const startButton = () => screen.getByRole('button', { name: /Start session/ })
const posts = (sent: { method: string; path: string }[]) => sent.filter((s) => s.method === 'POST').map((s) => s.path)

/** Host laptop, Claude, `path` typed as a path, `prompt` typed. */
```

After:

```tsx
      <NewSession />
    </ClientContext.Provider>,
  )
  return server
}

it('predicts delivery for the resolved hat and chosen agent', async () => {
  mount({ 'GET /api/hosts': json(200, [host('h1', 'laptop', {
    capabilities: ['projects', 'resolve_path', 'mcp_servers'],
    mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' },
  })]) })
  const field = await screen.findByRole('combobox', { name: /^Project/ })
  await userEvent.type(field, '/srv/work/cat')
  await waitFor(() => expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent'))
  await userEvent.click(screen.getByRole('button', { name: 'Codex' }))
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('not isolated per hat')
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('~/.codex')
})

const hostButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const projectField = () => screen.findByRole('combobox', { name: /^Project/ })
const startButton = () => screen.getByRole('button', { name: /Start session/ })
const posts = (sent: { method: string; path: string }[]) => sent.filter((s) => s.method === 'POST').map((s) => s.path)

/** Host laptop, Claude, `path` typed as a path, `prompt` typed. */
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/components/McpPrediction.test.tsx src/screens/NewSession.test.tsx src/screens/Mcp.test.tsx`.

**Expected:** exit 1, assertions fail or required new modules are missing.

<!-- PHASE 3 FEAT 7f97f0e16f4ee2e46bab75cc2abb8493b4d55120 -->

**Files:** `web/src/components/McpPrediction.tsx`, `web/src/components/Mounts.tsx`, `web/src/lib/mcpDelivery.ts`, `web/src/manage.css`, `web/src/screens/Mcp.tsx`, `web/src/screens/NewSession.tsx`.

- [ ] Step 3: Implement the task.

**Create:** `web/src/components/McpPrediction.tsx`

```tsx
import type { HostItem } from '../generated/protocol'
import { predictDelivery, predictionWords } from '../lib/mcpDelivery'
import { agentLabel } from '../lib/agent'
import { Text } from '../lib/text'

export default function McpPrediction({ host, agent, hatId }: { host?: HostItem; agent: string; hatId?: string }) {
  const mode = predictDelivery(host, agent, hatId)
  return (
    <section className="mcp-prediction" aria-label="MCP prediction">
      <p><Text>{agentLabel(agent)}</Text>: {predictionWords(mode)}</p>
      {agent === 'codex' && <p>Codex MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.</p>}
    </section>
  )
}
```

**Replace:** `web/src/components/Mounts.tsx` (this exact block once).

Before:

```tsx
import { messageOf } from '../api/errors'
import { replaceMounts } from '../api/mcp'
import { useClient } from '../app-client'
import type { HostItem, McpConnectionItem } from '../generated/protocol'
import { mountsWith } from '../lib/mcp'
import { Text } from '../lib/text'

interface Props {
  connection: McpConnectionItem
  /** `null` while they load or when they could not be read. */
  hosts: HostItem[] | null
  onChanged: (connection: McpConnectionItem) => void
```

After:

```tsx
import { messageOf } from '../api/errors'
import { replaceMounts } from '../api/mcp'
import { useClient } from '../app-client'
import type { HostItem, McpConnectionItem } from '../generated/protocol'
import { mountsWith } from '../lib/mcp'
import { Text } from '../lib/text'
import McpPrediction from './McpPrediction'

interface Props {
  connection: McpConnectionItem
  /** `null` while they load or when they could not be read. */
  hosts: HostItem[] | null
  onChanged: (connection: McpConnectionItem) => void
```

**Replace:** `web/src/components/Mounts.tsx` (this exact block once).

Before:

```tsx

  return (
    <fieldset className="mounts" disabled={hosts === null} aria-busy={busy}>
      <legend>Hosts whose sessions get it</legend>
      {hosts !== null && live.length === 0 && <p className="hint">No host is paired yet.</p>}
      {live.map((host) => (
        <label key={host.host_id} className="check">
          <input
            type="checkbox"
            checked={connection.mounts.includes(host.host_id)}
            onChange={(e) => toggle(host.host_id, e.target.checked)}
          />
          <Text>{host.name}</Text>
        </label>
      ))}
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
```

After:

```tsx

  return (
    <fieldset className="mounts" disabled={hosts === null} aria-busy={busy}>
      <legend>Hosts whose sessions get it</legend>
      {hosts !== null && live.length === 0 && <p className="hint">No host is paired yet.</p>}
      {live.map((host) => (
        <div key={host.host_id}>
        <label className="check">
          <input
            type="checkbox"
            checked={connection.mounts.includes(host.host_id)}
            onChange={(e) => toggle(host.host_id, e.target.checked)}
          />
          <Text>{host.name}</Text>
        </label>
        {Object.keys(host.mcp_delivery ?? {}).length === 0
          ? <p className="hint">MCP delivery is unknown for this host’s agents.</p>
          : Object.keys(host.mcp_delivery ?? {}).map((agent) => (
            <McpPrediction key={agent} host={host} agent={agent} hatId={connection.hat_id} />
          ))}
        </div>
      ))}
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
```

**Replace:** `web/src/lib/mcpDelivery.ts` (this exact block once).

Before:

```typescript
  'This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.'

/** Only a non-running → running transition invalidates delivery metadata. */
export function runningLifecycle(lifecycle: string | undefined): boolean {
  return lifecycle === 'starting' || lifecycle === 'active'
}
```

After:

```typescript
  'This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.'

/** Only a non-running → running transition invalidates delivery metadata. */
export function runningLifecycle(lifecycle: string | undefined): boolean {
  return lifecycle === 'starting' || lifecycle === 'active'
}

/** A resolution of another input must never name this draft's hat. */
export function predictionHat(resolved: { hostId: string; path: string; hat: string } | undefined, hostId: string, path: string): string | undefined {
  if (resolved?.hostId === hostId && resolved.path === path) return resolved.hat
  return undefined
}
```

**Replace:** `web/src/manage.css` (this exact block once).

Before:

```css
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

@media (max-width:767px) {
  .check { min-height:44px; }
}
```

After:

```css
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

@media (max-width:767px) {
  .check { min-height:44px; }
}
.mcp-prediction { font-size:13px; color:var(--fg-muted); margin:4px 0 10px; }
```

**Replace:** `web/src/screens/Mcp.tsx` (this exact block once).

Before:

```tsx
      </header>
      <section className="card notice" aria-label="How sessions get these">
        <p>
          A connection reaches the agent sessions in its hat on the hosts ticked below, as an MCP server named{' '}
          <code>hennery-&lt;slug&gt;</code>. Changes apply to new and resumed sessions.
        </p>
        <p>
          Codex, Claude run with your own CLI, and any other agent command (this may change): a session gets a
          connection only when both are in its host’s default hat, and it also loads your own MCP servers (such as <code>~/.codex</code>), so it is not
          isolated. Sessions in other hats on that host get none.
        </p>
      </section>
      {[list.error, hats.error, hosts.error].map(
        (shown, i) =>
          shown && (
            <p key={i} className="form-error" role="alert">
              <Text>{shown}</Text>
```

After:

```tsx
      </header>
      <section className="card notice" aria-label="How sessions get these">
        <p>
          A connection reaches the agent sessions in its hat on the hosts ticked below, as an MCP server named{' '}
          <code>hennery-&lt;slug&gt;</code>. Changes apply to new and resumed sessions.
        </p>
      </section>
      {[list.error, hats.error, hosts.error].map(
        (shown, i) =>
          shown && (
            <p key={i} className="form-error" role="alert">
              <Text>{shown}</Text>
```

**Replace:** `web/src/screens/NewSession.tsx` (this exact block once).

Before:

```tsx
// New session (frontend spec §7): a host, an agent, a project, the hat the
// project resolves to, an optional first prompt, then Start.
//
// - Hosts: connected ones first; offline ones listed but disabled; revoked
//   ones never offered.
// - Changing the host resets the agent, the path and the browser (in the
```

After:

```tsx
import McpPrediction from '../components/McpPrediction'
import { predictionHat } from '../lib/mcpDelivery'
// New session (frontend spec §7): a host, an agent, a project, the hat the
// project resolves to, an optional first prompt, then Start.
//
// - Hosts: connected ones first; offline ones listed but disabled; revoked
//   ones never offered.
// - Changing the host resets the agent, the path and the browser (in the
```

**Replace:** `web/src/screens/NewSession.tsx` (this exact block once).

Before:

```tsx
  return [...live.filter((h) => h.connected), ...live.filter((h) => !h.connected)]
}

type Resolved =
  | { state: 'idle' }
  | { state: 'pending' }
  | { state: 'ok'; resolution: HatResolution }
  | { state: 'failed'; error: string }

export default function NewSession() {
  const client = useClient()
  const { search } = useLocation()
  // Read once: the form owns its fields after that.
```

After:

```tsx
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
```

**Replace:** `web/src/screens/NewSession.tsx` (this exact block once).

Before:

```tsx
    const abort = new AbortController()
    setResolved({ state: 'pending' })
    const timer = setTimeout(() => {
      client
        .request<HatResolution>('POST', '/api/hats/resolve', { host_id: hostId, path: cwd.trim() }, { signal: abort.signal })
        .then(
          (resolution) => live && setResolved({ state: 'ok', resolution }),
          (err) => live && setResolved({ state: 'failed', error: startRefusal(err) }),
        )
    }, RESOLVE_DEBOUNCE_MS)
    return () => {
      live = false
      clearTimeout(timer)
```

After:

```tsx
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
```

**Replace:** `web/src/screens/NewSession.tsx` (this exact block once).

Before:

```tsx
              {projectsError !== null && (
                <div className="picker-path" role="alert">
                  Projects could not be listed: <bdi>{projectsError}</bdi> You can still type a path.
                </div>
              )}
              <HatPreview resolved={resolved} hatName={hatName} />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={ids.prompt}>
                <Icon.Sparkle size={16} /> First prompt <span className="hint">optional</span>
              </label>
```

After:

```tsx
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

            <div className="field">
              <label className="field-label" htmlFor={ids.prompt}>
                <Icon.Sparkle size={16} /> First prompt <span className="hint">optional</span>
              </label>
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web test src/components/McpPrediction.test.tsx src/screens/NewSession.test.tsx src/screens/Mcp.test.tsx`.

**Expected:** exit 0, all selected tests pass. Then run typecheck and the full Vitest suite; 1426 tests pass.

- [ ] Step 5: Run the corresponding probes below, restore every file byte for byte, review the diff against the rules, commit `feat(web): predict MCP delivery by host agent and resolved hat` with signing off, check the gmail author and push once. If SSH is refused, record it and continue locally, with no alternate key or transport.


### Task 4: Write-only full-set stdio editor

Build the editor standalone here; mount it in Task 5 so the real missing-screen browser test first runs red. One host/hat owns the full set; changing either destroys that editor and its fields. Store only names, commands, argv, retention flags and value-presence booleans in React. Read newly supplied values from uncontrolled fields only after confirmation, clear before I/O, reuse only the transient client request for one step-up retry. Cancellation/refusal clears fields and requires re-entry rather than silently resending empty. Keep is scoped to the original server identity/command/env key; args-only edits may keep. Explicit empty is a real string. Read revoked hosts without Save; allow offline saving. Freeze selectors/controls during confirmation/save; same-frame confirmation presses share one operation.

<!-- PHASE 4 TEST 542d16c2419eec160239bba69a8345e2aeca99e0 -->

**Files:** `web/src/components/StdioServers.test.tsx`.

- [ ] Step 1: Add the failing tests.

**Create:** `web/src/components/StdioServers.test.tsx`

```tsx
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { StepUpCancelled } from '../api/errors'
import { ClientContext } from '../app-client'
import { hat, host } from '../test-fixtures'
import { json, stubServer, type Answer } from '../test-server'
import type { McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import StdioServers from './StdioServers'

const PATH = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
const stored: McpStdioServerItem = { name: 'local', command: 'tool', args: [' spaced ', '', 'line\ntwo'], env: [{ name: 'TOKEN', has_value: true }], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' }
const set = (servers = [stored]): McpStdioServerSet => ({ host_id: 'host-1', hat_id: 'hat-a', servers })
function open(routes: Record<string, Answer | Answer[]> = {}, options: { offline?: boolean; revoked?: boolean; enabled?: boolean; stepUp?: () => Promise<void> } = {}) {
  const server = stubServer({ [`GET ${PATH}`]: json(200, set()), [`PUT ${PATH}`]: json(200, set()), ...routes })
  const stepUp = vi.fn(options.stepUp ?? (async () => {}))
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const ui = render(<ClientContext.Provider value={client}><StdioServers enabled={options.enabled ?? true} hosts={[host({ connected: !options.offline, revoked_at: options.revoked ? '2026-10-02T00:00:00Z' : undefined }), host({ host_id: 'host-2', name: 'second' })]} hats={[hat({ id: 'hat-a', name: 'Personal' }), hat(), hat({ id: 'gone', name: 'Purged', purging: true })]} /></ClientContext.Provider>)
  return { ...server, ...ui, stepUp }
}
const saves = (s: ReturnType<typeof open>) => s.sent.filter(x => x.method === 'PUT')
const field = (name: string) => screen.getByRole('textbox', { name })
async function ready() { return screen.findByRole('textbox', { name: 'Server name' }) }
async function confirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  const dialog = await screen.findByRole('dialog', { name: 'Save these local MCP servers?' })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save local servers' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}
async function replaceValue(value: string) {
  await userEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
  if (value === '') await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
  else fireEvent.change(field('Value for TOKEN'), { target: { value } })
}

describe('local MCP full-set editor', () => {
  it('reads names and has_value only; keeps values and every argument byte when unchanged', async () => {
    const s = open(); await ready()
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Purged' })).toBeNull()
    await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN' }] }] })
  })
  it('keeps a stored value across an args-only change', async () => {
    const s = open(); await ready()
    fireEvent.change(field('Argument 1'), { target: { value: ' changed ' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ args: [' changed ', '', 'line\ntwo'], env: [{ name: 'TOKEN' }] }] })
  })
  it.each(['Server name', 'Command'])('requires re-entry after changing %s', async name => {
    const s = open(); await ready()
    fireEvent.change(field(name), { target: { value: name === 'Command' ? 'other' : 'renamed' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(screen.queryByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value or explicitly choose empty')
    expect(saves(s)).toHaveLength(0)
    fireEvent.change(field('Value for TOKEN'), { target: { value: 'replacement\nvalue' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'replacement\nvalue' }] }] })
  })
  it('sends an explicitly empty value as a string, never as keep', async () => {
    const s = open(); await ready(); await replaceValue(''); await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
  })
  it('changing one environment row does not clear another supplied value', async () => {
    const s = open(); await ready(); await replaceValue('first')
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    const names = screen.getAllByRole('textbox', { name: 'Environment name' })
    fireEvent.change(names[1], { target: { value: 'OTHER' } })
    fireEvent.change(field('Value for OTHER'), { target: { value: 'second' } })
    expect(field('Value for TOKEN')).toHaveValue('first')
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'first' }, { name: 'OTHER', value: 'second' }] }] })
  })
  it('clears values on cancellation, and requires re-entry before another confirmation', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(saves(s)).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('clears DOM values before I/O; retries exactly the same body once after step-up', async () => {
    let cleared = false
    const s = open({ [`PUT ${PATH}`]: [() => { cleared = (field('Value for TOKEN') as HTMLTextAreaElement).value === ''; return json(403, { code: 'step_up_required' }) }, json(200, set())] })
    await ready(); await replaceValue('do-not-echo'); await confirm()
    expect(cleared).toBe(true)
    expect(s.stepUp).toHaveBeenCalledTimes(1)
    expect(saves(s)).toHaveLength(2)
    expect(saves(s)[0].body).toEqual(saves(s)[1].body)
    expect(JSON.stringify(saves(s)[0].body)).toContain('do-not-echo')
    expect(document.body.innerHTML).not.toContain('do-not-echo')
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
  })
  it('clears values when step-up is cancelled, without retrying or implicitly setting empty', async () => {
    const s = open({ [`PUT ${PATH}`]: json(403, { code: 'step_up_required' }) }, { stepUp: async () => { throw new StepUpCancelled() } })
    await ready(); await replaceValue('secret'); await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(saves(s)).toHaveLength(1)
  })
  it('shows refusal in words, clears supplied values and keeps the unsaved draft', async () => {
    const s = open({ [`PUT ${PATH}`]: json(409, { code: 'slug_taken' }) })
    await ready(); await replaceValue('secret'); await confirm()
    expect(screen.getByRole('alert')).toHaveTextContent('This slug is taken')
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(field('Server name')).toHaveValue('local')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull(); expect(saves(s)).toHaveLength(1)
  })
  it('locks the place through confirmation and a slow save; two same-frame presses send once', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    const selector = screen.getByRole('combobox', { name: 'Host' })
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(selector, { target: { value: 'host-2' } })
    expect(selector).toHaveValue('host-1')
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' })
    act(() => { button.click(); button.click() })
    await waitFor(() => expect(saves(s)).toHaveLength(1))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => finish(json(200, set())))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(selector).toHaveAttribute('aria-disabled', 'false')
  })
  it('ignores an old-place read, and discards values when selecting a new hat', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    const s = open({ [`GET ${PATH}`]: [() => new Promise(resolve => { finish = resolve }), json(200, set())], [`GET ${other}`]: json(200, { ...set([]), hat_id: 'hat-b' }) })
    await waitFor(() => expect(s.sent).toHaveLength(1))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    await screen.findByRole('button', { name: 'Add local server' })
    await act(async () => finish(json(200, set())))
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.change(field('Environment name'), { target: { value: 'NEW' } })
    fireEvent.change(field('Value for NEW'), { target: { value: 'temporary' } })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-a')
    await ready()
    expect(document.body.innerHTML).not.toContain('temporary')
  })
  it('permits offline saves but revoked hosts are read-only; missing places have one ambiguous message', async () => {
    const s = open({}, { offline: true }); await ready(); await confirm(); expect(saves(s)).toHaveLength(1); s.unmount()
    const r = open({}, { revoked: true }); await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Host' }), 'host-1'); await ready()
    expect(field('Command')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Review local servers' })).toBeNull(); r.unmount()
    open({ [`GET ${PATH}`]: json(404, { code: 'not_found' }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('This host or hat no longer exists.')
  })
  it('does not read local servers when their feature is absent', () => {
    const s = open({}, { enabled: false }); expect(s.sent).toHaveLength(0); expect(screen.queryByRole('region')).toBeNull()
  })
  it('submits locally rather than navigating with a browser form', async () => {
    open(); await ready()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    act(() => screen.getByRole('form', { name: 'Local server set' }).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('adds and removes servers, arguments and environment rows in the full set', async () => {
    const s = open(); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.change(field('Argument 3'), { target: { value: 'last' } })
    await userEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    const names = screen.getAllByRole('textbox', { name: 'Server name' })
    const commands = screen.getAllByRole('textbox', { name: 'Command' })
    fireEvent.change(names[1], { target: { value: 'second' } }); fireEvent.change(commands[1], { target: { value: 'runner' } })
    await confirm()
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: ['', 'line\ntwo', 'last'], env: [] }, { name: 'second', command: 'runner', args: [], env: [] }] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await confirm(); expect(saves(s)[1].body).toEqual({ servers: [] })
  })
  it('does not retain another original server’s values after renaming', async () => {
    open({ [`GET ${PATH}`]: json(200, set([stored, { ...stored, name: 'other' }])) }); await ready().catch(() => {})
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Server name' })).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Server name' })[0], { target: { value: 'other' } })
    expect(screen.getAllByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
  })
  it('freezes draft controls while confirmation is open, including keep and empty toggles', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    fireEvent.change(field('Server name'), { target: { value: 'changed' } })
    fireEvent.change(field('Command'), { target: { value: 'changed' } })
    fireEvent.change(field('Argument 1'), { target: { value: 'changed' } })
    fireEvent.change(field('Environment name'), { target: { value: 'changed' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN', value: 'secret' }] }] })
  })
})
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/components/StdioServers.test.tsx`.

**Expected:** exit 1, assertions fail or required new modules are missing.

<!-- PHASE 4 FEAT b3dabf8de8843d198fffbef71d029be1110d5f1d -->

**Files:** `web/src/components/StdioServerForm.tsx`, `web/src/components/StdioServers.tsx`, `web/src/lib/stdio.ts`, `web/src/manage.css`.

- [ ] Step 3: Implement the task.

**Create:** `web/src/components/StdioServerForm.tsx`

```tsx
import type { McpStdioServerItem } from '../generated/protocol'
import { canKeepEnv, type StdioDraft } from '../lib/stdio'
import { Text } from '../lib/text'

interface Props {
  draft: StdioDraft
  original?: McpStdioServerItem
  locked: boolean
  allocate: () => number
  change: (next: StdioDraft) => void
  remove: () => void
  input: (id: number, node: HTMLTextAreaElement | null) => void
  clear: (env?: number) => void
}

export default function StdioServerForm({ draft: d, original, locked, allocate, change, remove, input, clear }: Props) {
  const identity = (name: string, command: string) => {
    clear()
    change({ ...d, name, command, env: d.env.map(e => ({ ...e, keep: e.keep && canKeepEnv(original, name, command, e.name), entered: false, empty: false })) })
  }
  const envChange = (id: number, patch: Partial<StdioDraft['env'][number]>) => change({ ...d, env: d.env.map(e => e.id === id ? { ...e, ...patch } : e) })
  return <fieldset className="stdio-server">
    <legend><Text>{d.name || 'New local server'}</Text></legend>
    <label>Server name<input value={d.name} readOnly={locked} onChange={e => { if (!locked) identity(e.target.value, d.command) }} /></label>
    <label>Command<input value={d.command} readOnly={locked} onChange={e => { if (!locked) identity(d.name, e.target.value) }} /></label>
    <p>Commands and arguments can be read back. Put secrets in environment values. A rename or command change requires re-entering values.</p>
    {d.args.map((arg, i) => <div className="stdio-row" key={i}>
      <label>Argument {i + 1}<textarea value={arg} readOnly={locked} onChange={e => { if (!locked) change({ ...d, args: d.args.map((a, at) => at === i ? e.target.value : a) }) }} /></label>
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: d.args.filter((_, at) => at !== i) }) }}>Remove argument {i + 1}</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: [...d.args, ''] }) }}>Add argument</button>
    {d.env.map(e => <div className="stdio-env" key={e.id}>
      <label>Environment name<input value={e.name} readOnly={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { name: event.target.value, keep: false, entered: false, empty: false }) } }} /></label>
      {canKeepEnv(original, d.name, d.command, e.name) && <label className="checkbox"><input type="checkbox" checked={e.keep} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { keep: event.target.checked, entered: false, empty: false }) } }} />Keep stored value for <Text>{e.name}</Text></label>}
      {e.keep ? <p>Stored value will be kept.</p> : <>
        <label>Value for <Text>{e.name}</Text><textarea ref={node => input(e.id, node)} readOnly={locked || e.empty} autoComplete="off" data-1p-ignore data-lpignore="true" onChange={event => { if (!locked) envChange(e.id, { entered: true, empty: event.target.value === '' }) }} /></label>
        <label className="checkbox"><input type="checkbox" checked={e.empty ?? false} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { entered: event.target.checked, empty: event.target.checked }) } }} />Use empty value for <Text>{e.name}</Text></label>
      </>}
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: d.env.filter(entry => entry.id !== e.id) }) }}>Remove environment variable</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: [...d.env, { id: allocate(), name: '', keep: false }] }) }}>Add environment variable</button>
    <button type="button" className="btn btn-danger" aria-disabled={locked} onClick={() => { if (!locked) remove() }}>Remove local server</button>
  </fieldset>
}
```

**Create:** `web/src/components/StdioServers.tsx`

```tsx
// A full set belongs to one (host, hat). Values stay in uncontrolled fields
// until confirmed, are cleared before I/O, and are never read back.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { stdioServers, replaceStdioServers } from '../api/mcp'
import { useClient } from '../app-client'
import type { HatItem, HostItem, McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import { stdioRefusal, stdioRequest, type StdioDraft } from '../lib/stdio'
import { Text, visible } from '../lib/text'
import ConfirmDialog from './ConfirmDialog'
import StdioServerForm from './StdioServerForm'

interface Props { enabled: boolean; hosts: HostItem[] | null; hats: HatItem[] | null }
export default function StdioServers({ enabled, hosts, hats }: Props) {
  if (!enabled) return null
  if (!hosts || !hats) return <section aria-label="Local MCP servers"><p>Loading local server places…</p></section>
  return <Places hosts={hosts} hats={hats.filter(h => !h.purging)} />
}

function Places({ hosts, hats }: { hosts: HostItem[]; hats: HatItem[] }) {
  const [hostId, setHost] = useState((hosts.find(h => !h.revoked_at) ?? hosts[0])?.host_id ?? '')
  const chosen = hosts.find(h => h.host_id === hostId)
  const [hatId, setHat] = useState((hats.find(h => h.id === chosen?.default_hat_id) ?? hats[0])?.id ?? '')
  const host = hosts.find(h => h.host_id === hostId)
  const hat = hats.find(h => h.id === hatId)
  const blocked = useRef(false)
  const [busy, setBusy] = useState(false)
  const lock = (value: boolean) => { blocked.current = value; setBusy(value) }
  return <section aria-label="Local MCP servers" className="stdio-servers">
    <h2>Local MCP servers</h2>
    <p>The agent runs these commands on this host for this hat. Saving replaces the whole set, including removals, at the next start or resume. Offline hosts can be configured too.</p>
    <p>Changing the host or hat discards unsaved edits and newly entered values.</p>
    <label>Host<select value={hostId} aria-disabled={busy} onChange={event => {
      if (blocked.current) return
      const next = hosts.find(h => h.host_id === event.target.value)
      setHost(event.target.value)
      setHat((hats.find(h => h.id === next?.default_hat_id) ?? hats[0])?.id ?? '')
    }}><option value="">Choose a host</option>{hosts.map(h => <option key={h.host_id} value={h.host_id}>{visible(h.name)}</option>)}</select></label>
    <label>Hat<select value={hatId} aria-disabled={busy} onChange={event => { if (!blocked.current) setHat(event.target.value) }}><option value="">Choose a hat</option>{hats.map(h => <option key={h.id} value={h.id}>{visible(h.name)}</option>)}</select></label>
    {host && hat ? <SetEditor key={JSON.stringify([hostId, hatId])} host={host} hat={hat} lock={lock} /> : <p>Choose a host and hat.</p>}
  </section>
}

function SetEditor({ host, hat, lock }: { host: HostItem; hat: HatItem; lock: (busy: boolean) => void }) {
  const client = useClient()
  const [drafts, setDrafts] = useState<StdioDraft[] | null>(null)
  const originals = useRef(new Map<number, McpStdioServerItem>())
  const fields = useRef(new Map<string, HTMLTextAreaElement>())
  const counter = useRef(0)
  const allocate = () => ++counter.current
  const live = useRef(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const pending = useRef(false)
  const operation = useRef<Promise<void> | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const placeLock = useRef(lock); placeLock.current = lock
  const clear = () => { for (const field of fields.current.values()) field.value = '' }
  const discardValues = () => {
    clear()
    setDrafts(before => before?.map(d => ({ ...d, env: d.env.map(e => ({ ...e, entered: false, empty: false })) })) ?? null)
  }
  const apply = (answer: McpStdioServerSet) => {
    originals.current.clear()
    setDrafts(answer.servers.map(server => {
      const id = allocate()
      originals.current.set(id, server)
      return { id, name: server.name, command: server.command, args: server.args, env: server.env.map(e => ({ id: allocate(), name: e.name, keep: e.has_value })) }
    }))
  }
  useEffect(() => {
    live.current = true
    let reading = true
    void stdioServers(client, host.host_id, hat.id).then(answer => { if (reading) apply(answer) }, err => { if (reading) setError(stdioRefusal(err)) })
    return () => { reading = false; live.current = false; clear(); placeLock.current(false) }
    // The keyed editor fixes the namespace for its entire lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, host.host_id, hat.id])

  const review = (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || host.revoked_at || !drafts) return
    if (drafts.some(d => d.env.some(e => !e.keep && !e.entered))) { setError('Enter a value or explicitly choose empty for every environment variable.'); return }
    pending.current = true
    placeLock.current(true)
    setError(null)
    setConfirming(true)
  }
  const save = (): Promise<void> => {
    if (operation.current) return operation.current
    const body = stdioRequest(drafts ?? [], (server, env) => fields.current.get(`${server}:${env}`)?.value ?? '')
    discardValues()
    const work = replaceStdioServers(client, host.host_id, hat.id, body).then(answer => { if (live.current) apply(answer) }, err => { if (live.current) setError(stdioRefusal(err)) }).finally(() => { operation.current = null })
    operation.current = work
    return work
  }
  const close = () => {
    if (operation.current) return
    discardValues()
    pending.current = false
    placeLock.current(false)
    setConfirming(false)
  }
  return <>
    {host.revoked_at && <p>This host is revoked: its local MCP servers can be read, not changed.</p>}
    {error && <p role="alert" className="form-error"><Text>{error}</Text></p>}
    {drafts === null ? !error && <p>Reading local servers…</p> : <form aria-label="Local server set" method="post" onSubmit={review}>
      {drafts.map(d => <StdioServerForm key={d.id} draft={d} original={originals.current.get(d.id)} locked={confirming || !!host.revoked_at} allocate={allocate}
        change={next => setDrafts(before => before?.map(entry => entry.id === d.id ? next : entry) ?? null)}
        remove={() => setDrafts(before => before?.filter(entry => entry.id !== d.id) ?? null)}
        input={(env, node) => { const key = `${d.id}:${env}`; if (node) fields.current.set(key, node); else fields.current.delete(key) }}
        clear={env => { for (const [key, node] of fields.current) if (env === undefined ? key.startsWith(`${d.id}:`) : key === `${d.id}:${env}`) node.value = '' }} />)}
      {!host.revoked_at && <div className="stdio-actions">
        <button type="button" className="btn btn-ghost" aria-disabled={confirming} onClick={() => { if (!pending.current) setDrafts(before => [...(before ?? []), { id: allocate(), name: '', command: '', args: [], env: [] }]) }}>Add local server</button>
        <button ref={opener} type="submit" className="btn btn-primary" aria-disabled={confirming}>Review local servers</button>
      </div>}
    </form>}
    {confirming && <ConfirmDialog title="Save these local MCP servers?" confirm="Save local servers" action={save} onClose={close} returnFocus={() => opener.current}>
      <p>Replace every local server for <Text>{host.name}</Text> and <Text>{hat.name}</Text>, including removals. Newly entered environment values will be sent once confirmed, and then cleared from the form. Cancelling also clears them.</p>
      <p>This applies at the next start or resume.</p>
    </ConfirmDialog>}
  </>
}
```

**Replace:** `web/src/lib/stdio.ts` (this exact block once).

Before:

```typescript
import { ApiFailure, messageOf } from '../api/errors'
import type { McpStdioServerItem, McpStdioServersRequest } from '../generated/protocol'

export interface StdioEnvDraft { id: number; name: string; keep: boolean }
export interface StdioDraft { id: number; name: string; command: string; args: string[]; env: StdioEnvDraft[] }

/** Keep is scoped to the server's original identity and command. */
export function canKeepEnv(before: McpStdioServerItem | undefined, name: string, command: string, env: string): boolean {
  return before !== undefined && before.name === name && before.command === command &&
    before.env.some((entry) => entry.name === env && entry.has_value)
```

After:

```typescript
import { ApiFailure, messageOf } from '../api/errors'
import type { McpStdioServerItem, McpStdioServersRequest } from '../generated/protocol'

// Only whether a value was supplied is state; the value lives in the DOM.
export interface StdioEnvDraft { id: number; name: string; keep: boolean; entered?: boolean; empty?: boolean }
export interface StdioDraft { id: number; name: string; command: string; args: string[]; env: StdioEnvDraft[] }

/** Keep is scoped to the server's original identity and command. */
export function canKeepEnv(before: McpStdioServerItem | undefined, name: string, command: string, env: string): boolean {
  return before !== undefined && before.name === name && before.command === command &&
    before.env.some((entry) => entry.name === env && entry.has_value)
```

**Replace:** `web/src/manage.css` (this exact block once).

Before:

```css
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

@media (max-width:767px) {
  .check { min-height:44px; }
}
.mcp-prediction { font-size:13px; color:var(--fg-muted); margin:4px 0 10px; }
```

After:

```css
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

@media (max-width:767px) {
  .check { min-height:44px; }
}
.mcp-prediction { font-size:13px; color:var(--fg-muted); margin:4px 0 10px; }
.stdio-servers { margin-top: 2rem; }
.stdio-servers label { display: grid; gap: .35rem; margin: .75rem 0; }
.stdio-servers select, .stdio-servers input, .stdio-servers textarea { max-width: 100%; min-height: 44px; }
.stdio-servers button { min-height: 44px; }
.stdio-server { margin: 1rem 0; min-width: 0; }
.stdio-env, .stdio-row { padding: .5rem 0; }
.stdio-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.stdio-servers [aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web test src/components/StdioServers.test.tsx`.

**Expected:** exit 0, all selected tests pass. Then run typecheck and the full Vitest suite; 1444 tests pass.

- [ ] Step 5: Run the corresponding probes below, restore every file byte for byte, review the diff against the rules, commit `feat(web): edit local MCP sets with write-only environment values` with signing off, check the gmail author and push once. If SSH is refused, record it and continue locally, with no alternate key or transport.


### Task 5: Browser receipts, feature wiring and regression evidence

Wire mcp_stdio independently through Shell and Mcp, with no stdio reads when absent. Extend earlier task tests for each formerly masked guard, record/field resource release and literal Codex warning absence. A new delivery-read error escaping test first failed; render that error through Text. Give checkbox labels 44 px targets. At 1280 and 390 px, the real binary pairs a Codex-named fake, mounts an HTTP connection, saves stdio via step-up and starts with two receipt entries; a saved addition leaves the old count until resume delivers three. A different hat predicts and records fallback with no entries. Receipts are scratch-only and not printed; they prove configuration delivery, not upstream tool execution. Check write-only reads, cancellation/re-entry, URL/storage absence, CSP and the runner-env sentinel.

<!-- PHASE 5 TEST e78b406136068a4c12c187e7518d496c97619b65 -->

**Files:** `web/e2e/mcp-delivery.spec.ts`, `web/src/api/mcp-stdio.test.ts`, `web/src/components/McpDelivery.test.tsx`, `web/src/components/McpPrediction.test.tsx`, `web/src/components/StdioServerForm.test.tsx`, `web/src/components/StdioServers.test.tsx`, `web/src/hooks/useMcpDelivery.test.tsx`, `web/src/screens/Mcp.test.tsx`, `web/src/screens/Session.test.tsx`.

- [ ] Step 1: Add the failing tests.

**Create:** `web/e2e/mcp-delivery.spec.ts`

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
    expect((await page.content()).includes(ENV_VALUE)).toBe(false); expect(page.url().includes(ENV_VALUE)).toBe(false)
    expect(await page.evaluate(value => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(value), ENV_VALUE)).toBe(false)
    if (width === 390) expect((await local().getByRole('button', { name: 'Review local servers', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.goto('/new')
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click()
    await form.getByRole('combobox').fill(project)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('not isolated per hat')
    await form.getByRole('textbox', { name: 'First prompt optional', exact: true }).fill('Show delivery.')
    await form.getByRole('button', { name: 'Start session', exact: true }).click()
    await expect(page).toHaveURL(/\/sessions\/[^/?#]+$/, { timeout: 45_000 }); sessionUrl = page.url()
    await expect(report()).toContainText('At the last start/resume:')
    await expect(report()).toContainText('2 MCP servers.')
    await expect(report()).toContainText('Codex also loads your own ~/.codex MCP servers.')
    expect(records()[0].method).toBe('session/new')
    expect(records()[0].params.mcpServers.map((s: { name: string }) => s.name).sort()).toEqual(['hennery-docs', 'hennery-local'])
    expect(JSON.stringify(records()[0].params.mcpServers).includes(ENV_VALUE)).toBe(true)
    await page.reload(); await expect(report()).toContainText('2 MCP servers.')
  })
  test('keeps the last-start snapshot until resume, and delivers none for a different hat', async () => {
    await page.goto('/mcp'); await local().getByRole('button', { name: 'Add local server', exact: true }).click()
    await local().getByRole('textbox', { name: 'Server name', exact: true }).nth(1).fill('second')
    await local().getByRole('textbox', { name: 'Command', exact: true }).nth(1).fill('runner')
    await local().getByRole('button', { name: 'Review local servers', exact: true }).click()
    await page.getByRole('dialog', { name: 'Save these local MCP servers?', exact: true }).getByRole('button', { name: 'Save local servers', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto(sessionUrl); await expect(report()).toContainText('2 MCP servers.')
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
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click(); await form.getByRole('combobox').fill(path)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('this hat is not the host’s default')
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

**Replace:** `web/src/api/mcp-stdio.test.ts` (this exact block once).

Before:

```typescript
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import { replaceStdioServers, stdioServers } from './mcp'
import { startRefusal } from '../lib/start'
import { resumeRefusal, failureWords } from '../components/sessionWords'
import { ApiFailure } from './errors'

describe('stdio routes', () => {
  it('encodes both ids and sends the whole set without losing empty values', async () => {
    const t = routed(() => json({ host_id: 'h&x', hat_id: 'a/b', servers: [] }))
    await stdioServers(t.client, 'h&x', 'a/b')
    const servers = [{ name: 'files', command: 'server', args: [''], env: [{ name: 'EMPTY', value: '' }] }]
```

After:

```typescript
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import { replaceStdioServers, stdioServers } from './mcp'
import { startRefusal } from '../lib/start'
import { resumeRefusal, failureWords } from '../components/sessionWords'
import { ApiFailure, messageOf } from './errors'

describe('stdio routes', () => {
  it('encodes both ids and sends the whole set without losing empty values', async () => {
    const t = routed(() => json({ host_id: 'h&x', hat_id: 'a/b', servers: [] }))
    await stdioServers(t.client, 'h&x', 'a/b')
    const servers = [{ name: 'files', command: 'server', args: [''], env: [{ name: 'EMPTY', value: '' }] }]
```

**Replace:** `web/src/api/mcp-stdio.test.ts` (this exact block once).

Before:

```typescript
describe('start and resume isolation refusal', () => {
  const code = 'mcp_isolation_unavailable'
  const message = 'The host could not isolate this agent’s MCP servers. Try again.'
  it('explains a refused start', () => expect(startRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains a refused resume', () => expect(resumeRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains the failed session', () => expect(failureWords(code)).toBe('the host could not isolate this agent’s MCP servers'))
})
```

After:

```typescript
describe('start and resume isolation refusal', () => {
  const code = 'mcp_isolation_unavailable'
  const message = 'The host could not isolate this agent’s MCP servers. Try again.'
  it('explains a refused start', () => expect(startRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains a refused resume', () => expect(resumeRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains the failed session', () => expect(failureWords(code)).toBe('the host could not isolate this agent’s MCP servers'))
  it('keeps a generic revoked-host refusal generic', () => expect(messageOf(new ApiFailure(409, { code: 'host_revoked', message: 'raw' }))).toBe('This host is revoked.'))
})
```

**Replace:** `web/src/components/McpDelivery.test.tsx` (this exact block once).

Before:

```tsx
    const delivery: McpSessionDelivery = { mode, servers: mode === 'isolated' ? 0 : 2, at: '2026-10-13T00:00:00Z' }
    render(<McpDelivery agent="codex" delivery={delivery} />)
    const region = screen.getByRole('region', { name: 'MCP delivery' })
    expect(region).toHaveTextContent('At the last start/resume: ' + deliveryWords(mode))
    expect(region).toHaveTextContent(String(delivery.servers) + ' MCP servers.')
    expect(region).toHaveTextContent(CODEX_MCP_NOTE)
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
  })
```

After:

```tsx
    const delivery: McpSessionDelivery = { mode, servers: mode === 'isolated' ? 0 : 2, at: '2026-10-13T00:00:00Z' }
    render(<McpDelivery agent="codex" delivery={delivery} />)
    const region = screen.getByRole('region', { name: 'MCP delivery' })
    expect(region).toHaveTextContent('At the last start/resume: ' + deliveryWords(mode))
    expect(region).toHaveTextContent(String(delivery.servers) + ' MCP servers.')
    expect(region).toHaveTextContent(CODEX_MCP_NOTE)
    expect(region).toHaveTextContent('This session’s MCP servers are not isolated per hat.')
    expect(region).toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
  })
```

**Replace:** `web/src/components/McpPrediction.test.tsx` (this exact block once).

Before:

```tsx
    render(<McpPrediction host={{ ...h, mcp_delivery: undefined }} agent="codex" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('MCP delivery is unknown.')
  })
  it('does not show a Codex note for Claude', () => {
    render(<McpPrediction host={h} agent="claude" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent')
    expect(screen.queryByText('Codex also loads your own ~/.codex MCP servers.')).toBeNull()
  })
  it('uses only a resolution for the current host and path', () => {
    const resolved = { hostId: 'h1', path: '/project', hat: 'hat-a' }
    expect(predictionHat(resolved, 'h1', '/project')).toBe('hat-a')
    expect(predictionHat(resolved, 'h2', '/project')).toBeUndefined()
    expect(predictionHat(resolved, 'h1', '/different')).toBeUndefined()
```

After:

```tsx
    render(<McpPrediction host={{ ...h, mcp_delivery: undefined }} agent="codex" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('MCP delivery is unknown.')
  })
  it('does not show a Codex note for Claude', () => {
    render(<McpPrediction host={h} agent="claude" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent')
    expect(screen.getByRole('region', { name: 'MCP prediction' })).not.toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('uses only a resolution for the current host and path', () => {
    const resolved = { hostId: 'h1', path: '/project', hat: 'hat-a' }
    expect(predictionHat(resolved, 'h1', '/project')).toBe('hat-a')
    expect(predictionHat(resolved, 'h2', '/project')).toBeUndefined()
    expect(predictionHat(resolved, 'h1', '/different')).toBeUndefined()
```

**Create:** `web/src/components/StdioServerForm.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import StdioServerForm from './StdioServerForm'

it('a locked value field sends no draft update, even for a queued change event', () => {
  const change = vi.fn()
  render(<StdioServerForm draft={{ id: 1, name: 'local', command: 'tool', args: [], env: [{ id: 2, name: 'TOKEN', keep: false }] }} locked allocate={() => 3} change={change} remove={vi.fn()} input={vi.fn()} clear={vi.fn()} />)
  const field = screen.getByRole('textbox', { name: 'Value for TOKEN' })
  expect(field).toHaveAttribute('readonly')
  fireEvent.change(field, { target: { value: 'late input event' } })
  expect(change).not.toHaveBeenCalled()
})
```

**Replace:** `web/src/components/StdioServers.test.tsx` (this exact block once).

Before:

```tsx
    const s = open(); await ready()
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Purged' })).toBeNull()
    await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN' }] }] })
  })
  it('keeps a stored value across an args-only change', async () => {
    const s = open(); await ready()
    fireEvent.change(field('Argument 1'), { target: { value: ' changed ' } })
    await confirm()
```

After:

```tsx
    const s = open(); await ready()
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Purged' })).toBeNull()
    await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(saves(s)[0].path).toBe(PATH)
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN' }] }] })
  })
  it('keeps a stored value across an args-only change', async () => {
    const s = open(); await ready()
    fireEvent.change(field('Argument 1'), { target: { value: ' changed ' } })
    await confirm()
```

**Replace:** `web/src/components/StdioServers.test.tsx` (this exact block once).

Before:

```tsx
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    const selector = screen.getByRole('combobox', { name: 'Host' })
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(selector, { target: { value: 'host-2' } })
    expect(selector).toHaveValue('host-1')
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' })
    act(() => { button.click(); button.click() })
    await waitFor(() => expect(saves(s)).toHaveLength(1))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => finish(json(200, set())))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(selector).toHaveAttribute('aria-disabled', 'false')
```

After:

```tsx
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    const selector = screen.getByRole('combobox', { name: 'Host' })
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(selector, { target: { value: 'host-2' } })
    expect(selector).toHaveValue('host-1')
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' })
    act(() => { button.click(); button.click(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) })
    await waitFor(() => expect(saves(s)).toHaveLength(1))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => finish(json(200, set())))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(selector).toHaveAttribute('aria-disabled', 'false')
```

**Replace:** `web/src/components/StdioServers.test.tsx` (this exact block once).

Before:

```tsx
    await confirm()
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: ['', 'line\ntwo', 'last'], env: [] }, { name: 'second', command: 'runner', args: [], env: [] }] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await confirm(); expect(saves(s)[1].body).toEqual({ servers: [] })
  })
  it('does not retain another original server’s values after renaming', async () => {
    open({ [`GET ${PATH}`]: json(200, set([stored, { ...stored, name: 'other' }])) }); await ready().catch(() => {})
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Server name' })).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Server name' })[0], { target: { value: 'other' } })
    expect(screen.getAllByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
  })
  it('freezes draft controls while confirmation is open, including keep and empty toggles', async () => {
```

After:

```tsx
    await confirm()
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: ['', 'line\ntwo', 'last'], env: [] }, { name: 'second', command: 'runner', args: [], env: [] }] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await confirm(); expect(saves(s)[1].body).toEqual({ servers: [] })
  })
  it('does not retain another original server’s values after renaming', async () => {
    open({ [`GET ${PATH}`]: json(200, set([stored, { ...stored, name: 'other' }])) })
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Server name' })).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Server name' })[0], { target: { value: 'other' } })
    expect(screen.getAllByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
  })
  it('freezes draft controls while confirmation is open, including keep and empty toggles', async () => {
```

**Replace:** `web/src/components/StdioServers.test.tsx` (this exact block once).

Before:

```tsx
    fireEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN', value: 'secret' }] }] })
  })
})
```

After:

```tsx
    fireEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN', value: 'secret' }] }] })
  })
  it('clears a supplied value when empty is selected, and resets all supplied values on identity change', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    await confirm(); expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
    await replaceValue('another')
    fireEvent.change(field('Command'), { target: { value: 'other' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
  })
  it('does not copy records into a disposed editor after a slow write or read', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) }); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    s.unmount()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-write' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-write')).toBe(false)
      const read = open({ [`GET ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
      await waitFor(() => expect(read.sent).toHaveLength(1)); read.unmount()
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-read' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-read')).toBe(false)
    } finally { spy.mockRestore() }
  })
  it('drops the old form immediately while another place’s read is pending', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    open({ [`GET ${other}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await replaceValue('only-this-place')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    await act(async () => finish(json(200, { ...set([]), hat_id: 'hat-b' })))
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
  })
  it('releases old server records and detached value fields across repeated full-set saves', async () => {
    open(); await ready()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      for (let i = 0; i < 3; i++) { await replaceValue(`value-${i}`); await confirm() }
      for (let i = 0; i < spy.mock.calls.length; i++) {
        const [key, value] = spy.mock.calls[i]
        if ((typeof key === 'string' && value instanceof HTMLTextAreaElement) || (typeof key === 'number' && value?.command === 'tool' && value?.name === 'local')) {
          expect((spy.mock.contexts[i] as Map<unknown, unknown>).size).toBeLessThanOrEqual(1)
        }
      }
    } finally { spy.mockRestore() }
  })
})
```

**Replace:** `web/src/hooks/useMcpDelivery.test.tsx` (this exact block once).

Before:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMcpDelivery } from './useMcpDelivery'
import { json, routed } from '../test-stream'
import { sessionDetail } from '../api/view'

const report = (count = 1) => json({ session_id: 's1', agent: 'codex',
  mcp_delivery: { mode: 'unisolated', servers: count, at: '2026-10-13T00:00:00Z' } })

describe('bounded session delivery reads', () => {
  it('reads on open, never on focus or same-lifecycle renders, and refreshes the specified transitions', async () => {
```

After:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMcpDelivery } from './useMcpDelivery'
import { json, routed } from '../test-stream'
import { sessionDetail } from '../api/view'
import { ClientContext } from '../app-client'
import type { ReactNode } from 'react'

const report = (count = 1) => json({ session_id: 's1', agent: 'codex',
  mcp_delivery: { mode: 'unisolated', servers: count, at: '2026-10-13T00:00:00Z' } })

describe('bounded session delivery reads', () => {
  it('reads on open, never on focus or same-lifecycle renders, and refreshes the specified transitions', async () => {
```

**Replace:** `web/src/hooks/useMcpDelivery.test.tsx` (this exact block once).

Before:

```tsx
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(2))
    const next = sessionDetail(t.client, 's1')
    expect(t.calls).toHaveLength(2)
    await act(async () => release(report(3)))
    await next
  })
})
```

After:

```tsx
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(2))
    const next = sessionDetail(t.client, 's1')
    expect(t.calls).toHaveLength(2)
    await act(async () => release(report(3)))
    await next
  })
  it('clears the previous detail while a new client for the same session is loading', async () => {
    const first = routed(() => report(1))
    let finish!: (r: Response) => void
    const second = routed(() => new Promise<Response>(resolve => { finish = resolve }))
    let client = first.client
    const wrapper = ({ children }: { children: ReactNode }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
    const { result, rerender } = renderHook(() => useMcpDelivery('s1', 'active', 0), { wrapper })
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(1))
    client = second.client; rerender()
    expect(result.current.detail).toBeNull()
    await act(async () => finish(report(2)))
    await waitFor(() => expect(result.current.detail?.mcp_delivery?.servers).toBe(2))
  })
})
```

**Replace:** `web/src/screens/Mcp.test.tsx` (this exact block once).

Before:

```tsx
const sent = (server: ReturnType<typeof stubServer>, method: string, path: string) =>
  server.sent.filter((s) => s.method === method && s.path === path)

const card = (name: string) => screen.findByRole('listitem', { name })

describe('the MCP screen behind its feature', () => {
  it('is not shown, and nothing is read, when the collector does not serve connections', async () => {
    const server = open({}, FULL)
    expect(await screen.findByText('The MCP gateway is not part of this deployment.')).toBeInTheDocument()
    expect(sent(server, 'GET', PATH)).toHaveLength(0)
  })

  it('is shown with the feature, ignoring names it does not know', async () => {
    open({}, { mode: 'full', features: ['from_the_future', 'mcp_connections'] })
    expect(await screen.findByRole('heading', { name: 'MCP', level: 1 })).toBeInTheDocument()
    expect(await card('Docs')).toBeInTheDocument()
  })
})

describe('the connection list', () => {
  it('shows what agents see, the server, the hat, the token’s state and the hosts', async () => {
    open({
```

After:

```tsx
const sent = (server: ReturnType<typeof stubServer>, method: string, path: string) =>
  server.sent.filter((s) => s.method === method && s.path === path)

const card = (name: string) => screen.findByRole('listitem', { name })

describe('the MCP screen behind its feature', () => {
  it('serves local sets only with their separate stdio feature', async () => {
    const path = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
    const server = open({ [`GET ${path}`]: json(200, { host_id: 'host-1', hat_id: 'hat-a', servers: [] }) }, { mode: 'full', features: ['mcp_connections', 'mcp_stdio'] })
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Local MCP servers' })).toBeInTheDocument()
    expect(sent(server, 'GET', path)).toHaveLength(1)
  })
  it('is not shown, and nothing is read, when the collector does not serve connections', async () => {
    const server = open({}, FULL)
    expect(await screen.findByText('The MCP gateway is not part of this deployment.')).toBeInTheDocument()
    expect(sent(server, 'GET', PATH)).toHaveLength(0)
  })

  it('is shown with the feature, ignoring names it does not know', async () => {
    open({}, { mode: 'full', features: ['from_the_future', 'mcp_connections'] })
    expect(await screen.findByRole('heading', { name: 'MCP', level: 1 })).toBeInTheDocument()
    expect(await card('Docs')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Local MCP servers' })).toBeNull()
  })
})

describe('the connection list', () => {
  it('shows what agents see, the server, the hat, the token’s state and the hosts', async () => {
    open({
```

**Replace:** `web/src/screens/Session.test.tsx` (this exact block once).

Before:

```tsx
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('1 MCP servers.'))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('2 MCP servers.'))
    expect(s.of(DETAIL)).toHaveLength(2)
  })

  it('reads the header from the session’s detail when no summary is given', async () => {
    const s = server({
      pages: [() => json(page(rows(1, 't5')))],
      detail: () => json(detail('codex', { title: 'Fix the build', git_branch: 'main', model: 'gpt-x', mode: 'auto', activity: 'running' })),
    })
```

After:

```tsx
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('1 MCP servers.'))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('2 MCP servers.'))
    expect(s.of(DETAIL)).toHaveLength(2)
  })
  it('shows a delivery-read error as escaped and visibly isolated text', async () => {
    const s = server({ pages: [() => json(page([]))], detail: () => json({ code: 'failed', message: '<i>cannot\u202Eread' }, 500) })
    render(<SessionView id={ID} timing={FAST} />, { wrapper: s.wrapper })
    const error = await screen.findByText('<i>cannot<U+202E>read')
    expect(error.tagName).toBe('BDI'); expect(error.querySelector('i')).toBeNull()
  })

  it('reads the header from the session’s detail when no summary is given', async () => {
    const s = server({
      pages: [() => json(page(rows(1, 't5')))],
      detail: () => json(detail('codex', { title: 'Fix the build', git_branch: 'main', model: 'gpt-x', mode: 'auto', activity: 'running' })),
    })
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/components/StdioServers.test.tsx src/components/StdioServerForm.test.tsx src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx src/hooks/useMcpDelivery.test.tsx src/api/mcp-stdio.test.ts src/screens/Mcp.test.tsx src/screens/Session.test.tsx`.

**Expected:** exit 1, assertions fail or required new modules are missing.

Run `nix develop -c pnpm --dir web build`, `nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked`, then `nix develop -c bash -c 'CI=1 pnpm --dir web e2e mcp-delivery.spec.ts'` before wiring the feature. Expected missing-local-section failure at both widths; pairing passes.

<!-- PHASE 5 FEAT d759b72ae01173b2682cf61b164035d930ef49ed -->

**Files:** `web/src/components/Shell.tsx`, `web/src/manage.css`, `web/src/screens/Mcp.tsx`, `web/src/screens/Session.tsx`.

- [ ] Step 3: Implement the task.

**Replace:** `web/src/components/Shell.tsx` (this exact block once).

Before:

```tsx
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
```

After:

```tsx
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp stdio={caps.features.includes('mcp_stdio')} />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
```

**Replace:** `web/src/manage.css` (this exact block once).

Before:

```css
@media (max-width:767px) {
  .check { min-height:44px; }
}
.mcp-prediction { font-size:13px; color:var(--fg-muted); margin:4px 0 10px; }
.stdio-servers { margin-top: 2rem; }
.stdio-servers label { display: grid; gap: .35rem; margin: .75rem 0; }
.stdio-servers select, .stdio-servers input, .stdio-servers textarea { max-width: 100%; min-height: 44px; }
.stdio-servers button { min-height: 44px; }
.stdio-server { margin: 1rem 0; min-width: 0; }
.stdio-env, .stdio-row { padding: .5rem 0; }
.stdio-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.stdio-servers [aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
```

After:

```css
@media (max-width:767px) {
  .check { min-height:44px; }
}
.mcp-prediction { font-size:13px; color:var(--fg-muted); margin:4px 0 10px; }
.stdio-servers { margin-top: 2rem; }
.stdio-servers label { display: grid; gap: .35rem; margin: .75rem 0; }
.stdio-servers .checkbox { display: flex; align-items: center; min-height: 44px; }
.stdio-servers .checkbox input { width: 18px; min-height: 18px; flex: none; }
.stdio-servers select, .stdio-servers input, .stdio-servers textarea { max-width: 100%; min-height: 44px; }
.stdio-servers button { min-height: 44px; }
.stdio-server { margin: 1rem 0; min-width: 0; }
.stdio-env, .stdio-row { padding: .5rem 0; }
.stdio-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.stdio-servers [aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
```

**Replace:** `web/src/screens/Mcp.tsx` (this exact block once).

Before:

```tsx
import { connections as listConnections, createConnection, deleteConnection, updateConnection } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import type { HatItem, HostItem, McpConnectionItem, UpdateMcpConnectionRequest } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import {
  NEW_FORM,
  capped,
  changeOf,
```

After:

```tsx
import { connections as listConnections, createConnection, deleteConnection, updateConnection } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import type { HatItem, HostItem, McpConnectionItem, UpdateMcpConnectionRequest } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import {
  NEW_FORM,
  capped,
  changeOf,
```

**Replace:** `web/src/screens/Mcp.tsx` (this exact block once).

Before:

```tsx
 *  first one not being purged. */
function firstHat(hats: HatItem[]): string {
  const open = hats.filter((h) => !h.purging)
  return (open.find((h) => h.default_for_new_hosts) ?? open[0])?.id ?? ''
}

export default function Mcp() {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const [adding, setAdding] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
```

After:

```tsx
 *  first one not being purged. */
function firstHat(hats: HatItem[]): string {
  const open = hats.filter((h) => !h.purging)
  return (open.find((h) => h.default_for_new_hosts) ?? open[0])?.id ?? ''
}

export default function Mcp({ stdio = false }: { stdio?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const [adding, setAdding] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
```

**Replace:** `web/src/screens/Mcp.tsx` (this exact block once).

Before:

```tsx
      <section className="card notice" aria-label="How sessions get these">
        <p>
          A connection reaches the agent sessions in its hat on the hosts ticked below, as an MCP server named{' '}
          <code>hennery-&lt;slug&gt;</code>. Changes apply to new and resumed sessions.
        </p>
      </section>
      {[list.error, hats.error, hosts.error].map(
        (shown, i) =>
          shown && (
            <p key={i} className="form-error" role="alert">
              <Text>{shown}</Text>
            </p>
```

After:

```tsx
      <section className="card notice" aria-label="How sessions get these">
        <p>
          A connection reaches the agent sessions in its hat on the hosts ticked below, as an MCP server named{' '}
          <code>hennery-&lt;slug&gt;</code>. Changes apply to new and resumed sessions.
        </p>
      </section>
      <StdioServers enabled={stdio} hosts={hosts.data} hats={hats.data} />
      {[list.error, hats.error, hosts.error].map(
        (shown, i) =>
          shown && (
            <p key={i} className="form-error" role="alert">
              <Text>{shown}</Text>
            </p>
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
import { useClient } from '../app-client'
import { Composer, type ComposerHandle } from '../components/Composer'
import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
import SessionFooter from '../components/SessionFooter'
import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
import McpDelivery from '../components/McpDelivery'
import { useMcpDelivery } from '../hooks/useMcpDelivery'
import SessionMenu from '../components/SessionMenu'
import { deleteNotes } from '../components/sessionWords'
import Transcript from '../components/Transcript'
import type { ItemEnv } from '../components/items/types'
import type { Capabilities, DeleteResult, SessionDetail } from '../generated/protocol'
```

After:

```tsx
import { useClient } from '../app-client'
import { Composer, type ComposerHandle } from '../components/Composer'
import { ANSWER_LABEL, answerAsMessage } from '../components/composerWords'
import SessionFooter from '../components/SessionFooter'
import SessionHeader, { type HeaderInfo } from '../components/SessionHeader'
import McpDelivery from '../components/McpDelivery'
import { Text } from '../lib/text'
import { useMcpDelivery } from '../hooks/useMcpDelivery'
import SessionMenu from '../components/SessionMenu'
import { deleteNotes } from '../components/sessionWords'
import Transcript from '../components/Transcript'
import type { ItemEnv } from '../components/items/types'
import type { Capabilities, DeleteResult, SessionDetail } from '../generated/protocol'
```

**Replace:** `web/src/screens/Session.tsx` (this exact block once).

Before:

```tsx
            onDeleted={onDeleted}
            focusAfterDelete={() => back.current}
          />
        }
      />
      <McpDelivery agent={info?.agent ?? mcp.detail?.agent} delivery={mcp.detail?.mcp_delivery} />
      {mcp.error && <p className="form-error"><bdi>{mcp.error}</bdi></p>}
      <div className="stream-state" role="status">
        {s.stream === 'reconnecting' ? 'Reconnecting…' : s.resynced ? 'Resynced' : ''}
      </div>
      {/* One region for the view: a question that opened without taking the
          focus is said here, politely, never one from the first page. */}
      <p className="sr-only" role="status" aria-live="polite">
```

After:

```tsx
            onDeleted={onDeleted}
            focusAfterDelete={() => back.current}
          />
        }
      />
      <McpDelivery agent={info?.agent ?? mcp.detail?.agent} delivery={mcp.detail?.mcp_delivery} />
      {mcp.error && <p className="form-error"><Text>{mcp.error}</Text></p>}
      <div className="stream-state" role="status">
        {s.stream === 'reconnecting' ? 'Reconnecting…' : s.resynced ? 'Resynced' : ''}
      </div>
      {/* One region for the view: a question that opened without taking the
          focus is said here, politely, never one from the first page. */}
      <p className="sr-only" role="status" aria-live="polite">
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web test src/components/StdioServers.test.tsx src/components/StdioServerForm.test.tsx src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx src/hooks/useMcpDelivery.test.tsx src/api/mcp-stdio.test.ts src/screens/Mcp.test.tsx src/screens/Session.test.tsx`.

**Expected:** exit 0, all selected tests pass. Then run typecheck and the full Vitest suite; 1453 tests pass.

- [ ] Step 5: Run the corresponding probes below, restore every file byte for byte, review the diff against the rules, commit `feat(web): mount local MCP configuration with guarded delivery wording` with signing off, check the gmail author and push once. If SSH is refused, record it and continue locally, with no alternate key or transport.


### Task 6: Security-review amendments and re-confirmation notes

Take all Important and minor findings from the opus review of 2026-10-13 and N1–N3 from its scoped re-confirmation, CONFIRMED WITH NOTES. Env correction attributes and recipients are visible contract; erasure never implies explicit empty; a missing ref clears every other supplied value before failing closed. Normalize future recorded modes to unknown before the Codex caveat. Mode drives own-config notes, including the conditional missing-host warning. Before step-up show every command and argv visibly escaped. Browser tests inspect actual DOM values, rendered body text and count text exactly.

<!-- PHASE 6 TEST 399c247cf11c593b1ccab261e1ca3b698e1c8600 -->

- [ ] Step 1: Add the tests (including revised legacy wording expectations), and run the changed browser spec locally before committing it.

**Replace:** `web/e2e/mcp-delivery.spec.ts` (this exact complete file once).

Before:

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
    expect((await page.content()).includes(ENV_VALUE)).toBe(false); expect(page.url().includes(ENV_VALUE)).toBe(false)
    expect(await page.evaluate(value => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(value), ENV_VALUE)).toBe(false)
    if (width === 390) expect((await local().getByRole('button', { name: 'Review local servers', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.goto('/new')
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click()
    await form.getByRole('combobox').fill(project)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('not isolated per hat')
    await form.getByRole('textbox', { name: 'First prompt optional', exact: true }).fill('Show delivery.')
    await form.getByRole('button', { name: 'Start session', exact: true }).click()
    await expect(page).toHaveURL(/\/sessions\/[^/?#]+$/, { timeout: 45_000 }); sessionUrl = page.url()
    await expect(report()).toContainText('At the last start/resume:')
    await expect(report()).toContainText('2 MCP servers.')
    await expect(report()).toContainText('Codex also loads your own ~/.codex MCP servers.')
    expect(records()[0].method).toBe('session/new')
    expect(records()[0].params.mcpServers.map((s: { name: string }) => s.name).sort()).toEqual(['hennery-docs', 'hennery-local'])
    expect(JSON.stringify(records()[0].params.mcpServers).includes(ENV_VALUE)).toBe(true)
    await page.reload(); await expect(report()).toContainText('2 MCP servers.')
  })
  test('keeps the last-start snapshot until resume, and delivers none for a different hat', async () => {
    await page.goto('/mcp'); await local().getByRole('button', { name: 'Add local server', exact: true }).click()
    await local().getByRole('textbox', { name: 'Server name', exact: true }).nth(1).fill('second')
    await local().getByRole('textbox', { name: 'Command', exact: true }).nth(1).fill('runner')
    await local().getByRole('button', { name: 'Review local servers', exact: true }).click()
    await page.getByRole('dialog', { name: 'Save these local MCP servers?', exact: true }).getByRole('button', { name: 'Save local servers', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto(sessionUrl); await expect(report()).toContainText('2 MCP servers.')
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
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click(); await form.getByRole('combobox').fill(path)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('this hat is not the host’s default')
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

After:

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
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click()
    await form.getByRole('combobox').fill(project)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('not isolated per hat')
    await form.getByRole('textbox', { name: 'First prompt optional', exact: true }).fill('Show delivery.')
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
    const form = page.getByRole('form', { name: 'New session', exact: true }); await form.getByRole('button', { name: 'Codex', exact: true }).click(); await form.getByRole('combobox').fill(path)
    await expect(form.getByRole('region', { name: 'MCP prediction', exact: true })).toContainText('this hat is not the host’s default')
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

**Replace:** `web/src/api/mcp-stdio.test.ts` (this exact complete file once).

Before:

```typescript
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import { replaceStdioServers, stdioServers } from './mcp'
import { startRefusal } from '../lib/start'
import { resumeRefusal, failureWords } from '../components/sessionWords'
import { ApiFailure, messageOf } from './errors'

describe('stdio routes', () => {
  it('encodes both ids and sends the whole set without losing empty values', async () => {
    const t = routed(() => json({ host_id: 'h&x', hat_id: 'a/b', servers: [] }))
    await stdioServers(t.client, 'h&x', 'a/b')
    const servers = [{ name: 'files', command: 'server', args: [''], env: [{ name: 'EMPTY', value: '' }] }]
    await replaceStdioServers(t.client, 'h&x', 'a/b', { servers })
    expect(t.calls.map((call) => call.method + ' ' + call.path)).toEqual([
      'GET /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
      'PUT /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
    ])
    expect(JSON.parse(String(t.fetch.mock.calls[1][1]?.body))).toEqual({ servers })
  })
})

describe('start and resume isolation refusal', () => {
  const code = 'mcp_isolation_unavailable'
  const message = 'The host could not isolate this agent’s MCP servers. Try again.'
  it('explains a refused start', () => expect(startRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains a refused resume', () => expect(resumeRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains the failed session', () => expect(failureWords(code)).toBe('the host could not isolate this agent’s MCP servers'))
  it('keeps a generic revoked-host refusal generic', () => expect(messageOf(new ApiFailure(409, { code: 'host_revoked', message: 'raw' }))).toBe('This host is revoked.'))
})
```

After:

```typescript
import { describe, expect, it } from 'vitest'
import { json, routed } from '../test-stream'
import { replaceStdioServers, stdioServers } from './mcp'
import { startRefusal } from '../lib/start'
import { resumeRefusal, failureWords } from '../components/sessionWords'
import { ApiFailure, messageOf } from './errors'

describe('stdio routes', () => {
  it('encodes both ids and sends the whole set without losing empty values', async () => {
    const t = routed(() => json({ host_id: 'h&x', hat_id: 'a/b', servers: [] }))
    await stdioServers(t.client, 'h&x', 'a/b')
    const servers = [{ name: 'files', command: 'server', args: [''], env: [{ name: 'EMPTY', value: '' }] }]
    await replaceStdioServers(t.client, 'h&x', 'a/b', { servers })
    expect(t.calls.map((call) => call.method + ' ' + call.path)).toEqual([
      'GET /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
      'PUT /api/mcp/stdio-servers?host_id=h%26x&hat_id=a%2Fb',
    ])
    expect(JSON.parse(String(t.fetch.mock.calls[1][1]?.body))).toEqual({ servers })
  })
})

describe('start and resume isolation refusal', () => {
  const code = 'mcp_isolation_unavailable'
  const message = 'The host could not isolate this agent’s MCP servers.'
  it('explains a refused start', () => expect(startRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains a refused resume', () => expect(resumeRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
  it('explains the failed session', () => expect(failureWords(code)).toBe('the host could not isolate this agent’s MCP servers'))
  it('keeps a generic revoked-host refusal generic', () => expect(messageOf(new ApiFailure(409, { code: 'host_revoked', message: 'raw' }))).toBe('This host is revoked.'))
})
```

**Replace:** `web/src/components/McpDelivery.test.tsx` (this exact complete file once).

Before:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import McpDelivery from './McpDelivery'
import type { McpSessionDelivery } from '../generated/protocol'
import { deliveryWords, CODEX_MCP_NOTE } from '../lib/mcpDelivery'

describe('last-start/resume delivery', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported'] as const)('shows %s as a decision, with count', (mode) => {
    const delivery: McpSessionDelivery = { mode, servers: mode === 'isolated' ? 0 : 2, at: '2026-10-13T00:00:00Z' }
    render(<McpDelivery agent="codex" delivery={delivery} />)
    const region = screen.getByRole('region', { name: 'MCP delivery' })
    expect(region).toHaveTextContent('At the last start/resume: ' + deliveryWords(mode))
    expect(region).toHaveTextContent(String(delivery.servers) + ' MCP servers.')
    expect(region).toHaveTextContent(CODEX_MCP_NOTE)
    expect(region).toHaveTextContent('This session’s MCP servers are not isolated per hat.')
    expect(region).toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
  })
  it('does not apply the Codex-specific note to another agent', () => {
    render(<McpDelivery agent="claude" />)
    expect(screen.queryByText(CODEX_MCP_NOTE)).toBeNull()
  })
})
```

After:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import McpDelivery from './McpDelivery'
import type { McpSessionDelivery } from '../generated/protocol'
import { deliveryWords, CODEX_MCP_NOTE } from '../lib/mcpDelivery'

describe('last-start/resume delivery', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported'] as const)('shows %s as a decision, with count', (mode) => {
    const delivery: McpSessionDelivery = { mode, servers: mode === 'isolated' ? 0 : 2, at: '2026-10-13T00:00:00Z' }
    render(<McpDelivery agent="codex" delivery={delivery} />)
    const region = screen.getByRole('region', { name: 'MCP delivery' })
    expect(region).toHaveTextContent('At the last start/resume: ' + deliveryWords(mode))
    expect(region).toHaveTextContent(String(delivery.servers) + ' MCP servers.')
    if (mode === 'unisolated') expect(region).toHaveTextContent(CODEX_MCP_NOTE)
    else expect(region).not.toHaveTextContent('~/.codex')
  })
  it('keeps missing delivery unknown, without inventing a count', () => {
    render(<McpDelivery agent="codex" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.queryByText('0 MCP servers.')).toBeNull()
    expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('Codex may also load your own ~/.codex MCP servers.')
  })
  it('does not apply the Codex-specific note to another agent', () => {
    render(<McpDelivery agent="claude" />)
    expect(screen.getByRole('region', { name: 'MCP delivery' })).not.toHaveTextContent('~/.codex')
  })
})

it('warns for an unisolated recorded mode even if the agent name is absent', () => {
  render(<McpDelivery delivery={{ mode: 'unisolated', servers: 1, at: '2026-10-13T00:00:00Z' }} />)
  expect(screen.getByRole('region', { name: 'MCP delivery' })).toHaveTextContent('The agent also loads your own MCP configuration.')
})

it.each(['codex', 'claude'])('treats a future recorded mode as unknown for %s', agent => {
  const delivery: McpSessionDelivery = JSON.parse('{"mode":"future_mode","servers":2,"at":"2026-10-13T00:00:00Z"}')
  render(<McpDelivery agent={agent} delivery={delivery} />)
  const region = screen.getByRole('region', { name: 'MCP delivery' })
  expect(region).toHaveTextContent('MCP delivery is unknown.')
  expect(screen.getByText('2 MCP servers.', { exact: true })).toBeInTheDocument()
  if (agent === 'codex') expect(region).toHaveTextContent('Codex may also load your own ~/.codex MCP servers.')
  else expect(region).not.toHaveTextContent('~/.codex')
})
```

**Replace:** `web/src/components/McpPrediction.test.tsx` (this exact complete file once).

Before:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import McpPrediction from './McpPrediction'
import { predictionHat } from '../lib/mcpDelivery'

describe('delivery prediction', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { codex: 'default_hat_only', claude: 'isolated' } })
  it('shows default-hat Codex as not isolated, including its own configuration', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-a" />)
    const note = screen.getByRole('region', { name: 'MCP prediction' })
    expect(note).toHaveTextContent('Prediction from the host’s last report: The MCP servers are not isolated per hat')
    expect(note).toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('shows fallback in another hat', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-b" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('this hat is not the host’s default')
  })
  it('keeps a missing report unknown', () => {
    render(<McpPrediction host={{ ...h, mcp_delivery: undefined }} agent="codex" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('MCP delivery is unknown.')
  })
  it('does not show a Codex note for Claude', () => {
    render(<McpPrediction host={h} agent="claude" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent')
    expect(screen.getByRole('region', { name: 'MCP prediction' })).not.toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('uses only a resolution for the current host and path', () => {
    const resolved = { hostId: 'h1', path: '/project', hat: 'hat-a' }
    expect(predictionHat(resolved, 'h1', '/project')).toBe('hat-a')
    expect(predictionHat(resolved, 'h2', '/project')).toBeUndefined()
    expect(predictionHat(resolved, 'h1', '/different')).toBeUndefined()
    expect(predictionHat(undefined, 'h1', '/project')).toBeUndefined()
  })
})
```

After:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import McpPrediction from './McpPrediction'
import { predictionHat } from '../lib/mcpDelivery'

describe('delivery prediction', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { codex: 'default_hat_only', claude: 'isolated' } })
  it('shows default-hat Codex as not isolated, including its own configuration', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-a" />)
    const note = screen.getByRole('region', { name: 'MCP prediction' })
    expect(note).toHaveTextContent('Prediction from the host’s last report: The MCP servers are not isolated per hat')
    expect(note).toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('shows fallback in another hat', () => {
    render(<McpPrediction host={h} agent="codex" hatId="hat-b" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('this hat is not the host’s default')
    expect(screen.getByRole('region', { name: 'MCP prediction' })).not.toHaveTextContent('~/.codex')
  })
  it('keeps a missing report unknown', () => {
    render(<McpPrediction host={{ ...h, mcp_delivery: undefined }} agent="codex" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('MCP delivery is unknown.')
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Codex may also load your own ~/.codex MCP servers.')
  })
  it('does not show a Codex note for Claude', () => {
    render(<McpPrediction host={h} agent="claude" hatId="hat-a" />)
    expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent("This agent was given only this hat's MCP servers.")
    expect(screen.getByRole('region', { name: 'MCP prediction' })).not.toHaveTextContent('Codex also loads your own ~/.codex MCP servers.')
  })
  it('uses only a resolution for the current host and path', () => {
    const resolved = { hostId: 'h1', path: '/project', hat: 'hat-a' }
    expect(predictionHat(resolved, 'h1', '/project')).toBe('hat-a')
    expect(predictionHat(resolved, 'h2', '/project')).toBeUndefined()
    expect(predictionHat(resolved, 'h1', '/different')).toBeUndefined()
    expect(predictionHat(undefined, 'h1', '/project')).toBeUndefined()
  })
})

it.each([
  ['isolated', host({ capabilities: ['mcp_servers'], mcp_delivery: { codex: 'isolated' } })],
  ['unsupported', host()],
])('omits the own-config warning for %s Codex', (_mode, h) => {
  render(<McpPrediction host={h} agent="codex" hatId="hat-a" />)
  expect(screen.getByRole('region', { name: 'MCP prediction' })).not.toHaveTextContent('~/.codex')
})
```

**Replace:** `web/src/components/StdioServerForm.test.tsx` (this exact complete file once).

Before:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import StdioServerForm from './StdioServerForm'

it('a locked value field sends no draft update, even for a queued change event', () => {
  const change = vi.fn()
  render(<StdioServerForm draft={{ id: 1, name: 'local', command: 'tool', args: [], env: [{ id: 2, name: 'TOKEN', keep: false }] }} locked allocate={() => 3} change={change} remove={vi.fn()} input={vi.fn()} clear={vi.fn()} />)
  const field = screen.getByRole('textbox', { name: 'Value for TOKEN' })
  expect(field).toHaveAttribute('readonly')
  fireEvent.change(field, { target: { value: 'late input event' } })
  expect(change).not.toHaveBeenCalled()
})
```

After:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import StdioServerForm from './StdioServerForm'

it('a locked value field sends no draft update, even for a queued change event', () => {
  const change = vi.fn()
  render(<StdioServerForm draft={{ id: 1, name: 'local', command: 'tool', args: [], env: [{ id: 2, name: 'TOKEN', keep: false }] }} locked allocate={() => 3} change={change} remove={vi.fn()} input={vi.fn()} clear={vi.fn()} />)
  const field = screen.getByRole('textbox', { name: 'Value for TOKEN' })
  expect(field).toHaveAttribute('readonly')
  fireEvent.change(field, { target: { value: 'late input event' } })
  expect(change).not.toHaveBeenCalled()
})

it('keeps env values out of spelling and text correction services and names their recipients', () => {
  render(<StdioServerForm draft={{ id: 1, name: 'local', command: 'tool', args: [], env: [{ id: 2, name: 'TOKEN', keep: false }] }} locked={false} allocate={() => 3} change={vi.fn()} remove={vi.fn()} input={vi.fn()} clear={vi.fn()} />)
  const field = screen.getByRole('textbox', { name: 'Value for TOKEN' })
  expect(field).toHaveAttribute('spellcheck', 'false')
  expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off')
  expect(screen.getByText(/Environment values cannot be read back from hennery\./)).toHaveTextContent('The host, the agent and the server process receive them.')
})
```

**Create:** `web/src/components/StdioServers.missing.test.tsx`

```tsx
import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { hat, host } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import StdioServers from './StdioServers'
import StdioServerForm from './StdioServerForm'

// A child whose textarea ref is unavailable must never become an empty value.
vi.mock('./StdioServerForm', async importOriginal => {
  const { default: Form } = await importOriginal<typeof import('./StdioServerForm')>()
  return { default: (props: ComponentProps<typeof StdioServerForm>) => <Form {...props} input={(id, node) => { if (props.draft.env.find(e => e.id === id)?.name !== 'TOKEN') props.input(id, node) }} /> }
})
it.each([false, true])('refuses a missing value field, explicit empty=%s', async empty => {
  const path = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
  const answer = { host_id: 'host-1', hat_id: 'hat-a', servers: [] }
  const server = stubServer({ [`GET ${path}`]: json(200, answer), [`PUT ${path}`]: json(200, answer) })
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  render(<ClientContext.Provider value={client}><StdioServers enabled hosts={[host()]} hats={[hat({ id: 'hat-a' })]} /></ClientContext.Provider>)
  await userEvent.click(await screen.findByRole('button', { name: 'Add local server' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Server name' }), { target: { value: 'local' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Command' }), { target: { value: 'tool' } })
  await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Environment name' }), { target: { value: 'TOKEN' } })
  if (empty) await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
  else fireEvent.change(screen.getByRole('textbox', { name: 'Value for TOKEN' }), { target: { value: 'secret' } })
  await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
  fireEvent.change(screen.getAllByRole('textbox', { name: 'Environment name' })[1], { target: { value: 'OTHER' } })
  const other = screen.getByRole('textbox', { name: 'Value for OTHER' })
  fireEvent.change(other, { target: { value: 'another typed secret' } })
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The environment value field is unavailable. Cancel and re-enter the values.'))
  expect(server.sent.filter(s => s.method === 'PUT')).toHaveLength(0)
  expect(stepUp).not.toHaveBeenCalled()
  expect(other).toHaveValue('')
  expect(screen.getByRole('checkbox', { name: 'Use empty value for OTHER' })).not.toBeChecked()
})
```

**Replace:** `web/src/components/StdioServers.test.tsx` (this exact complete file once).

Before:

```tsx
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { StepUpCancelled } from '../api/errors'
import { ClientContext } from '../app-client'
import { hat, host } from '../test-fixtures'
import { json, stubServer, type Answer } from '../test-server'
import type { McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import StdioServers from './StdioServers'

const PATH = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
const stored: McpStdioServerItem = { name: 'local', command: 'tool', args: [' spaced ', '', 'line\ntwo'], env: [{ name: 'TOKEN', has_value: true }], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' }
const set = (servers = [stored]): McpStdioServerSet => ({ host_id: 'host-1', hat_id: 'hat-a', servers })
function open(routes: Record<string, Answer | Answer[]> = {}, options: { offline?: boolean; revoked?: boolean; enabled?: boolean; stepUp?: () => Promise<void> } = {}) {
  const server = stubServer({ [`GET ${PATH}`]: json(200, set()), [`PUT ${PATH}`]: json(200, set()), ...routes })
  const stepUp = vi.fn(options.stepUp ?? (async () => {}))
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const ui = render(<ClientContext.Provider value={client}><StdioServers enabled={options.enabled ?? true} hosts={[host({ connected: !options.offline, revoked_at: options.revoked ? '2026-10-02T00:00:00Z' : undefined }), host({ host_id: 'host-2', name: 'second' })]} hats={[hat({ id: 'hat-a', name: 'Personal' }), hat(), hat({ id: 'gone', name: 'Purged', purging: true })]} /></ClientContext.Provider>)
  return { ...server, ...ui, stepUp }
}
const saves = (s: ReturnType<typeof open>) => s.sent.filter(x => x.method === 'PUT')
const field = (name: string) => screen.getByRole('textbox', { name })
async function ready() { return screen.findByRole('textbox', { name: 'Server name' }) }
async function confirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  const dialog = await screen.findByRole('dialog', { name: 'Save these local MCP servers?' })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save local servers' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}
async function replaceValue(value: string) {
  await userEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
  if (value === '') await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
  else fireEvent.change(field('Value for TOKEN'), { target: { value } })
}

describe('local MCP full-set editor', () => {
  it('reads names and has_value only; keeps values and every argument byte when unchanged', async () => {
    const s = open(); await ready()
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Purged' })).toBeNull()
    await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(saves(s)[0].path).toBe(PATH)
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN' }] }] })
  })
  it('keeps a stored value across an args-only change', async () => {
    const s = open(); await ready()
    fireEvent.change(field('Argument 1'), { target: { value: ' changed ' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ args: [' changed ', '', 'line\ntwo'], env: [{ name: 'TOKEN' }] }] })
  })
  it.each(['Server name', 'Command'])('requires re-entry after changing %s', async name => {
    const s = open(); await ready()
    fireEvent.change(field(name), { target: { value: name === 'Command' ? 'other' : 'renamed' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(screen.queryByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value or explicitly choose empty')
    expect(saves(s)).toHaveLength(0)
    fireEvent.change(field('Value for TOKEN'), { target: { value: 'replacement\nvalue' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'replacement\nvalue' }] }] })
  })
  it('sends an explicitly empty value as a string, never as keep', async () => {
    const s = open(); await ready(); await replaceValue(''); await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
  })
  it('changing one environment row does not clear another supplied value', async () => {
    const s = open(); await ready(); await replaceValue('first')
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    const names = screen.getAllByRole('textbox', { name: 'Environment name' })
    fireEvent.change(names[1], { target: { value: 'OTHER' } })
    fireEvent.change(field('Value for OTHER'), { target: { value: 'second' } })
    expect(field('Value for TOKEN')).toHaveValue('first')
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'first' }, { name: 'OTHER', value: 'second' }] }] })
  })
  it('clears values on cancellation, and requires re-entry before another confirmation', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(saves(s)).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('clears DOM values before I/O; retries exactly the same body once after step-up', async () => {
    let cleared = false
    const s = open({ [`PUT ${PATH}`]: [() => { cleared = (field('Value for TOKEN') as HTMLTextAreaElement).value === ''; return json(403, { code: 'step_up_required' }) }, json(200, set())] })
    await ready(); await replaceValue('do-not-echo'); await confirm()
    expect(cleared).toBe(true)
    expect(s.stepUp).toHaveBeenCalledTimes(1)
    expect(saves(s)).toHaveLength(2)
    expect(saves(s)[0].body).toEqual(saves(s)[1].body)
    expect(JSON.stringify(saves(s)[0].body)).toContain('do-not-echo')
    expect(document.body.innerHTML).not.toContain('do-not-echo')
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
  })
  it('clears values when step-up is cancelled, without retrying or implicitly setting empty', async () => {
    const s = open({ [`PUT ${PATH}`]: json(403, { code: 'step_up_required' }) }, { stepUp: async () => { throw new StepUpCancelled() } })
    await ready(); await replaceValue('secret'); await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(saves(s)).toHaveLength(1)
  })
  it('shows refusal in words, clears supplied values and keeps the unsaved draft', async () => {
    const s = open({ [`PUT ${PATH}`]: json(409, { code: 'slug_taken' }) })
    await ready(); await replaceValue('secret'); await confirm()
    expect(screen.getByRole('alert')).toHaveTextContent('This slug is taken')
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(field('Server name')).toHaveValue('local')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull(); expect(saves(s)).toHaveLength(1)
  })
  it('locks the place through confirmation and a slow save; two same-frame presses send once', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    const selector = screen.getByRole('combobox', { name: 'Host' })
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(selector, { target: { value: 'host-2' } })
    expect(selector).toHaveValue('host-1')
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' })
    act(() => { button.click(); button.click(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) })
    await waitFor(() => expect(saves(s)).toHaveLength(1))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => finish(json(200, set())))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(selector).toHaveAttribute('aria-disabled', 'false')
  })
  it('ignores an old-place read, and discards values when selecting a new hat', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    const s = open({ [`GET ${PATH}`]: [() => new Promise(resolve => { finish = resolve }), json(200, set())], [`GET ${other}`]: json(200, { ...set([]), hat_id: 'hat-b' }) })
    await waitFor(() => expect(s.sent).toHaveLength(1))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    await screen.findByRole('button', { name: 'Add local server' })
    await act(async () => finish(json(200, set())))
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.change(field('Environment name'), { target: { value: 'NEW' } })
    fireEvent.change(field('Value for NEW'), { target: { value: 'temporary' } })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-a')
    await ready()
    expect(document.body.innerHTML).not.toContain('temporary')
  })
  it('permits offline saves but revoked hosts are read-only; missing places have one ambiguous message', async () => {
    const s = open({}, { offline: true }); await ready(); await confirm(); expect(saves(s)).toHaveLength(1); s.unmount()
    const r = open({}, { revoked: true }); await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Host' }), 'host-1'); await ready()
    expect(field('Command')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Review local servers' })).toBeNull(); r.unmount()
    open({ [`GET ${PATH}`]: json(404, { code: 'not_found' }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('This host or hat no longer exists.')
  })
  it('does not read local servers when their feature is absent', () => {
    const s = open({}, { enabled: false }); expect(s.sent).toHaveLength(0); expect(screen.queryByRole('region')).toBeNull()
  })
  it('submits locally rather than navigating with a browser form', async () => {
    open(); await ready()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    act(() => screen.getByRole('form', { name: 'Local server set' }).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('adds and removes servers, arguments and environment rows in the full set', async () => {
    const s = open(); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.change(field('Argument 3'), { target: { value: 'last' } })
    await userEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    const names = screen.getAllByRole('textbox', { name: 'Server name' })
    const commands = screen.getAllByRole('textbox', { name: 'Command' })
    fireEvent.change(names[1], { target: { value: 'second' } }); fireEvent.change(commands[1], { target: { value: 'runner' } })
    await confirm()
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: ['', 'line\ntwo', 'last'], env: [] }, { name: 'second', command: 'runner', args: [], env: [] }] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await confirm(); expect(saves(s)[1].body).toEqual({ servers: [] })
  })
  it('does not retain another original server’s values after renaming', async () => {
    open({ [`GET ${PATH}`]: json(200, set([stored, { ...stored, name: 'other' }])) })
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Server name' })).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Server name' })[0], { target: { value: 'other' } })
    expect(screen.getAllByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
  })
  it('freezes draft controls while confirmation is open, including keep and empty toggles', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    fireEvent.change(field('Server name'), { target: { value: 'changed' } })
    fireEvent.change(field('Command'), { target: { value: 'changed' } })
    fireEvent.change(field('Argument 1'), { target: { value: 'changed' } })
    fireEvent.change(field('Environment name'), { target: { value: 'changed' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN', value: 'secret' }] }] })
  })
  it('clears a supplied value when empty is selected, and resets all supplied values on identity change', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    await confirm(); expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
    await replaceValue('another')
    fireEvent.change(field('Command'), { target: { value: 'other' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
  })
  it('does not copy records into a disposed editor after a slow write or read', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) }); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    s.unmount()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-write' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-write')).toBe(false)
      const read = open({ [`GET ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
      await waitFor(() => expect(read.sent).toHaveLength(1)); read.unmount()
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-read' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-read')).toBe(false)
    } finally { spy.mockRestore() }
  })
  it('drops the old form immediately while another place’s read is pending', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    open({ [`GET ${other}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await replaceValue('only-this-place')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    await act(async () => finish(json(200, { ...set([]), hat_id: 'hat-b' })))
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
  })
  it('releases old server records and detached value fields across repeated full-set saves', async () => {
    open(); await ready()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      for (let i = 0; i < 3; i++) { await replaceValue(`value-${i}`); await confirm() }
      for (let i = 0; i < spy.mock.calls.length; i++) {
        const [key, value] = spy.mock.calls[i]
        if ((typeof key === 'string' && value instanceof HTMLTextAreaElement) || (typeof key === 'number' && value?.command === 'tool' && value?.name === 'local')) {
          expect((spy.mock.contexts[i] as Map<unknown, unknown>).size).toBeLessThanOrEqual(1)
        }
      }
    } finally { spy.mockRestore() }
  })
})
```

After:

```tsx
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { StepUpCancelled } from '../api/errors'
import { ClientContext } from '../app-client'
import { hat, host } from '../test-fixtures'
import { json, stubServer, type Answer } from '../test-server'
import type { McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import StdioServers from './StdioServers'

const PATH = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
const stored: McpStdioServerItem = { name: 'local', command: 'tool', args: [' spaced ', '', 'line\ntwo'], env: [{ name: 'TOKEN', has_value: true }], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' }
const set = (servers = [stored]): McpStdioServerSet => ({ host_id: 'host-1', hat_id: 'hat-a', servers })
function open(routes: Record<string, Answer | Answer[]> = {}, options: { offline?: boolean; revoked?: boolean; enabled?: boolean; stepUp?: () => Promise<void> } = {}) {
  const server = stubServer({ [`GET ${PATH}`]: json(200, set()), [`PUT ${PATH}`]: json(200, set()), ...routes })
  const stepUp = vi.fn(options.stepUp ?? (async () => {}))
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const ui = render(<ClientContext.Provider value={client}><StdioServers enabled={options.enabled ?? true} hosts={[host({ connected: !options.offline, revoked_at: options.revoked ? '2026-10-02T00:00:00Z' : undefined }), host({ host_id: 'host-2', name: 'second' })]} hats={[hat({ id: 'hat-a', name: 'Personal' }), hat(), hat({ id: 'gone', name: 'Purged', purging: true })]} /></ClientContext.Provider>)
  return { ...server, ...ui, stepUp }
}
const saves = (s: ReturnType<typeof open>) => s.sent.filter(x => x.method === 'PUT')
const field = (name: string) => screen.getByRole('textbox', { name })
async function ready() { return screen.findByRole('textbox', { name: 'Server name' }) }
async function confirm() {
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  const dialog = await screen.findByRole('dialog', { name: 'Save these local MCP servers?' })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save local servers' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}
async function replaceValue(value: string) {
  await userEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
  if (value === '') await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
  else fireEvent.change(field('Value for TOKEN'), { target: { value } })
}

describe('local MCP full-set editor', () => {
  it('reads names and has_value only; keeps values and every argument byte when unchanged', async () => {
    const s = open(); await ready()
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Purged' })).toBeNull()
    await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(saves(s)[0].path).toBe(PATH)
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN' }] }] })
  })
  it('keeps a stored value across an args-only change', async () => {
    const s = open(); await ready()
    fireEvent.change(field('Argument 1'), { target: { value: ' changed ' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ args: [' changed ', '', 'line\ntwo'], env: [{ name: 'TOKEN' }] }] })
  })
  it.each(['Server name', 'Command'])('requires re-entry after changing %s', async name => {
    const s = open(); await ready()
    fireEvent.change(field(name), { target: { value: name === 'Command' ? 'other' : 'renamed' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(screen.queryByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value or explicitly choose empty')
    expect(saves(s)).toHaveLength(0)
    fireEvent.change(field('Value for TOKEN'), { target: { value: 'replacement\nvalue' } })
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'replacement\nvalue' }] }] })
  })
  it('sends an explicitly empty value as a string, never as keep', async () => {
    const s = open(); await ready(); await replaceValue(''); await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
  })
  it('changing one environment row does not clear another supplied value', async () => {
    const s = open(); await ready(); await replaceValue('first')
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    const names = screen.getAllByRole('textbox', { name: 'Environment name' })
    fireEvent.change(names[1], { target: { value: 'OTHER' } })
    fireEvent.change(field('Value for OTHER'), { target: { value: 'second' } })
    expect(field('Value for TOKEN')).toHaveValue('first')
    await confirm()
    expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: 'first' }, { name: 'OTHER', value: 'second' }] }] })
  })
  it('clears values on cancellation, and requires re-entry before another confirmation', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(saves(s)).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('clears DOM values before I/O; retries exactly the same body once after step-up', async () => {
    let cleared = false
    const s = open({ [`PUT ${PATH}`]: [() => { cleared = (field('Value for TOKEN') as HTMLTextAreaElement).value === ''; return json(403, { code: 'step_up_required' }) }, json(200, set())] })
    await ready(); await replaceValue('do-not-echo'); await confirm()
    expect(cleared).toBe(true)
    expect(s.stepUp).toHaveBeenCalledTimes(1)
    expect(saves(s)).toHaveLength(2)
    expect(saves(s)[0].body).toEqual(saves(s)[1].body)
    expect(JSON.stringify(saves(s)[0].body)).toContain('do-not-echo')
    expect(document.body.innerHTML).not.toContain('do-not-echo')
    expect(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toBeChecked()
  })
  it('clears values when step-up is cancelled, without retrying or implicitly setting empty', async () => {
    const s = open({ [`PUT ${PATH}`]: json(403, { code: 'step_up_required' }) }, { stepUp: async () => { throw new StepUpCancelled() } })
    await ready(); await replaceValue('secret'); await confirm()
    expect(saves(s)).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(saves(s)).toHaveLength(1)
  })
  it('shows refusal in words, clears supplied values and keeps the unsaved draft', async () => {
    const s = open({ [`PUT ${PATH}`]: json(409, { code: 'slug_taken' }) })
    await ready(); await replaceValue('secret'); await confirm()
    expect(screen.getByRole('alert')).toHaveTextContent('A connection already uses this name.')
    expect(field('Value for TOKEN')).toHaveValue('')
    expect(field('Server name')).toHaveValue('local')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull(); expect(saves(s)).toHaveLength(1)
  })
  it('locks the place through confirmation and a slow save; two same-frame presses send once', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    const selector = screen.getByRole('combobox', { name: 'Host' })
    expect(selector).toHaveAttribute('aria-disabled', 'true')
    fireEvent.change(selector, { target: { value: 'host-2' } })
    expect(selector).toHaveValue('host-1')
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' })
    act(() => { button.click(); button.click(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) })
    await waitFor(() => expect(saves(s)).toHaveLength(1))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => finish(json(200, set())))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(selector).toHaveAttribute('aria-disabled', 'false')
  })
  it('ignores an old-place read, and discards values when selecting a new hat', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    const s = open({ [`GET ${PATH}`]: [() => new Promise(resolve => { finish = resolve }), json(200, set())], [`GET ${other}`]: json(200, { ...set([]), hat_id: 'hat-b' }) })
    await waitFor(() => expect(s.sent).toHaveLength(1))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    await screen.findByRole('button', { name: 'Add local server' })
    await act(async () => finish(json(200, set())))
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.change(field('Environment name'), { target: { value: 'NEW' } })
    fireEvent.change(field('Value for NEW'), { target: { value: 'temporary' } })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-a')
    await ready()
    expect(document.body.innerHTML).not.toContain('temporary')
  })
  it('permits offline saves but revoked hosts are read-only; missing places have one ambiguous message', async () => {
    const s = open({}, { offline: true }); await ready(); await confirm(); expect(saves(s)).toHaveLength(1); s.unmount()
    const r = open({}, { revoked: true }); await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Host' }), 'host-1'); await ready()
    expect(field('Command')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Review local servers' })).toBeNull(); r.unmount()
    open({ [`GET ${PATH}`]: json(404, { code: 'not_found' }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('This host or hat no longer exists.')
  })
  it('does not read local servers when their feature is absent', () => {
    const s = open({}, { enabled: false }); expect(s.sent).toHaveLength(0); expect(screen.queryByRole('region')).toBeNull()
  })
  it('submits locally rather than navigating with a browser form', async () => {
    open(); await ready()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    act(() => screen.getByRole('form', { name: 'Local server set' }).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('adds and removes servers, arguments and environment rows in the full set', async () => {
    const s = open(); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.change(field('Argument 3'), { target: { value: 'last' } })
    await userEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    const names = screen.getAllByRole('textbox', { name: 'Server name' })
    const commands = screen.getAllByRole('textbox', { name: 'Command' })
    fireEvent.change(names[1], { target: { value: 'second' } }); fireEvent.change(commands[1], { target: { value: 'runner' } })
    await confirm()
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: ['', 'line\ntwo', 'last'], env: [] }, { name: 'second', command: 'runner', args: [], env: [] }] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await confirm(); expect(saves(s)[1].body).toEqual({ servers: [] })
  })
  it('does not retain another original server’s values after renaming', async () => {
    open({ [`GET ${PATH}`]: json(200, set([stored, { ...stored, name: 'other' }])) })
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Server name' })).toHaveLength(2))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Server name' })[0], { target: { value: 'other' } })
    expect(screen.getAllByRole('checkbox', { name: 'Keep stored value for TOKEN' })).toHaveLength(1)
    expect(field('Value for TOKEN')).toHaveValue('')
  })
  it('freezes draft controls while confirmation is open, including keep and empty toggles', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    fireEvent.change(field('Server name'), { target: { value: 'changed' } })
    fireEvent.change(field('Command'), { target: { value: 'changed' } })
    fireEvent.change(field('Argument 1'), { target: { value: 'changed' } })
    fireEvent.change(field('Environment name'), { target: { value: 'changed' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep stored value for TOKEN' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove environment variable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add local server' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove local server' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saves(s)[0].body).toEqual({ servers: [{ name: 'local', command: 'tool', args: stored.args, env: [{ name: 'TOKEN', value: 'secret' }] }] })
  })
  it('clears a supplied value when empty is selected, and resets all supplied values on identity change', async () => {
    const s = open(); await ready(); await replaceValue('secret')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' }))
    expect(field('Value for TOKEN')).toHaveValue('')
    await confirm(); expect(saves(s)[0].body).toMatchObject({ servers: [{ env: [{ name: 'TOKEN', value: '' }] }] })
    await replaceValue('another')
    fireEvent.change(field('Command'), { target: { value: 'other' } })
    expect(field('Value for TOKEN')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a value')
  })
  it('does not copy records into a disposed editor after a slow write or read', async () => {
    let finish!: (r: Response) => void
    const s = open({ [`PUT ${PATH}`]: () => new Promise(resolve => { finish = resolve }) }); await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save local servers' }))
    s.unmount()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-write' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-write')).toBe(false)
      const read = open({ [`GET ${PATH}`]: () => new Promise(resolve => { finish = resolve }) })
      await waitFor(() => expect(read.sent).toHaveLength(1)); read.unmount()
      await act(async () => finish(json(200, set([{ ...stored, name: 'disposed-read' }]))))
      expect(spy.mock.calls.some(([, value]) => value?.name === 'disposed-read')).toBe(false)
    } finally { spy.mockRestore() }
  })
  it('drops the old form immediately while another place’s read is pending', async () => {
    let finish!: (r: Response) => void
    const other = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-b'
    open({ [`GET ${other}`]: () => new Promise(resolve => { finish = resolve }) })
    await ready(); await replaceValue('only-this-place')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hat' }), 'hat-b')
    expect(screen.queryByRole('textbox', { name: 'Server name' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Value for TOKEN' })).toBeNull()
    await act(async () => finish(json(200, { ...set([]), hat_id: 'hat-b' })))
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
  })
  it('releases old server records and detached value fields across repeated full-set saves', async () => {
    open(); await ready()
    const spy = vi.spyOn(Map.prototype, 'set')
    try {
      for (let i = 0; i < 3; i++) { await replaceValue(`value-${i}`); await confirm() }
      for (let i = 0; i < spy.mock.calls.length; i++) {
        const [key, value] = spy.mock.calls[i]
        if ((typeof key === 'string' && value instanceof HTMLTextAreaElement) || (typeof key === 'number' && value?.command === 'tool' && value?.name === 'local')) {
          expect((spy.mock.contexts[i] as Map<unknown, unknown>).size).toBeLessThanOrEqual(1)
        }
      }
    } finally { spy.mockRestore() }
  })
})

it('erasing a supplied value refuses Review without selecting explicit empty', async () => {
  const s = open(); await ready(); await replaceValue('typed secret')
  await userEvent.clear(field('Value for TOKEN'))
  expect(screen.getByRole('checkbox', { name: 'Use empty value for TOKEN' })).not.toBeChecked()
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a value or explicitly choose empty')
  expect(saves(s)).toHaveLength(0)
})
it('shows each command and argument visibly escaped before any write or step-up', async () => {
  const s = open({ [`GET ${PATH}`]: json(200, set([{ ...stored, command: 'run\u202eexe', args: ['a\u200bb', '', 'line\ntwo'] }])) }); await ready()
  await userEvent.click(screen.getByRole('button', { name: 'Review local servers' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('run<U+202E>exe', { exact: true })).toBeInTheDocument()
  expect(within(dialog).getByText('a<U+200B>b', { exact: true })).toBeInTheDocument()
  expect(within(dialog).getByText('""', { exact: true })).toBeInTheDocument()
  expect(within(dialog).getByText('line<U+000A>two', { exact: true })).toBeInTheDocument()
  expect(dialog.textContent).not.toContain('\u202e')
  expect(dialog.textContent).not.toContain('\u200b')
  expect(saves(s)).toHaveLength(0); expect(s.stepUp).not.toHaveBeenCalled()
})
```

**Replace:** `web/src/lib/mcpDelivery.test.ts` (this exact complete file once).

Before:

```typescript
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import { deliveryWords, predictDelivery, predictionWords, runningLifecycle } from './mcpDelivery'

describe('deliveryWords', () => {
  it.each([
    ['isolated', 'Hennery keeps this agent to the MCP servers of this hat.'],
    ['unisolated', 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'],
    ['fallback', 'No hennery MCP servers: this hat is not the host’s default for this agent.'],
    ['unsupported', 'No hennery MCP servers: the host does not support their delivery.'],
    [undefined, 'MCP delivery is unknown.'],
    ['future', 'MCP delivery is unknown.'],
    ['constructor', 'MCP delivery is unknown.'],
  ])('words %s', (mode, words) => expect(deliveryWords(mode)).toBe(words))
})

describe('predictDelivery', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' } })
  it('predicts isolated', () => expect(predictDelivery(h, 'claude', 'hat-b')).toBe('isolated'))
  it('predicts unisolated in the default hat', () => expect(predictDelivery(h, 'codex', 'hat-a')).toBe('unisolated'))
  it('predicts fallback in another hat', () => expect(predictDelivery(h, 'codex', 'hat-b')).toBe('fallback'))
  it('predicts unsupported from an accepted capability-negative hello', () =>
    expect(predictDelivery(host(), 'codex', 'hat-a')).toBe('unsupported'))
  it('keeps missing host reports unknown', () => {
    expect(predictDelivery(undefined, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(host({ last_seen_at: undefined }), 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery({ ...h, mcp_delivery: undefined }, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'other', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'constructor', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'codex', undefined)).toBe('unknown')
  })
  it('reads newer values conservatively', () => {
    const newer = { ...h, mcp_delivery: JSON.parse('{"codex":"future"}') }
    expect(predictDelivery(newer, 'codex', 'hat-a')).toBe('unisolated')
    expect(predictDelivery(newer, 'codex', 'hat-b')).toBe('fallback')
  })
})

describe('predictionWords', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported', 'unknown'] as const)('words %s without a live-health promise', (mode) =>
    expect(predictionWords(mode)).toBe('Prediction from the host’s last report: ' + deliveryWords(mode)))
})

describe('runningLifecycle', () => {
  it.each(['starting', 'active'])('recognises %s', (state) => expect(runningLifecycle(state)).toBe(true))
  it.each(['parked', 'failed', 'closed', undefined, 'future'])('does not treat %s as running', (state) =>
    expect(runningLifecycle(state)).toBe(false))
})
```

After:

```typescript
import { describe, expect, it } from 'vitest'
import { host } from '../test-fixtures'
import { deliveryWords, predictDelivery, predictionWords, runningLifecycle } from './mcpDelivery'

describe('deliveryWords', () => {
  it.each([
    ['isolated', "This agent was given only this hat's MCP servers."],
    ['unisolated', 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'],
    ['fallback', 'No hennery MCP servers: this hat is not the host’s default for this agent.'],
    ['unsupported', 'No hennery MCP servers: the host does not support their delivery.'],
    [undefined, 'MCP delivery is unknown.'],
    ['future', 'MCP delivery is unknown.'],
    ['constructor', 'MCP delivery is unknown.'],
  ])('words %s', (mode, words) => expect(deliveryWords(mode)).toBe(words))
})

describe('predictDelivery', () => {
  const h = host({ capabilities: ['mcp_servers'], mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' } })
  it('predicts isolated', () => expect(predictDelivery(h, 'claude', 'hat-b')).toBe('isolated'))
  it('predicts unisolated in the default hat', () => expect(predictDelivery(h, 'codex', 'hat-a')).toBe('unisolated'))
  it('predicts fallback in another hat', () => expect(predictDelivery(h, 'codex', 'hat-b')).toBe('fallback'))
  it('predicts unsupported from an accepted capability-negative hello', () =>
    expect(predictDelivery(host(), 'codex', 'hat-a')).toBe('unsupported'))
  it('keeps missing host reports unknown', () => {
    expect(predictDelivery(undefined, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(host({ last_seen_at: undefined }), 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery({ ...h, mcp_delivery: undefined }, 'codex', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'other', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'constructor', 'hat-a')).toBe('unknown')
    expect(predictDelivery(h, 'codex', undefined)).toBe('unknown')
  })
  it('reads newer values conservatively', () => {
    const newer = { ...h, mcp_delivery: JSON.parse('{"codex":"future"}') }
    expect(predictDelivery(newer, 'codex', 'hat-a')).toBe('unisolated')
    expect(predictDelivery(newer, 'codex', 'hat-b')).toBe('fallback')
  })
})

describe('predictionWords', () => {
  it.each(['isolated', 'unisolated', 'fallback', 'unsupported', 'unknown'] as const)('words %s without a live-health promise', (mode) =>
    expect(predictionWords(mode)).toBe('Prediction from the host’s last report: ' + deliveryWords(mode)))
})

describe('runningLifecycle', () => {
  it.each(['starting', 'active'])('recognises %s', (state) => expect(runningLifecycle(state)).toBe(true))
  it.each(['parked', 'failed', 'closed', undefined, 'future'])('does not treat %s as running', (state) =>
    expect(runningLifecycle(state)).toBe(false))
})
```

**Replace:** `web/src/lib/stdio.test.ts` (this exact complete file once).

Before:

```typescript
import { describe, expect, it } from 'vitest'
import { ApiFailure } from '../api/errors'
import { canKeepEnv, stdioRefusal, stdioRequest } from './stdio'
import type { McpStdioServerItem } from '../generated/protocol'

const before: McpStdioServerItem = {
  name: 'files', command: 'server', args: [''], env: [{ name: 'TOKEN', has_value: true }],
  created_at: '2026-10-13T00:00:00Z', updated_at: '2026-10-13T00:00:00Z',
}

describe('env retention', () => {
  it('keeps only unchanged name, command and a stored env key', () => {
    expect(canKeepEnv(before, 'files', 'server', 'TOKEN')).toBe(true)
    expect(canKeepEnv(before, 'renamed', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'changed', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'server', 'MISSING')).toBe(false)
    expect(canKeepEnv({ ...before, env: [{ name: 'TOKEN', has_value: false }] }, 'files', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(undefined, 'files', 'server', 'TOKEN')).toBe(false)
  })
})

describe('full-set request', () => {
  it('keeps omissions distinct from empty and multiline values and preserves argv', () => {
    const draft = [{
      id: 1, name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
      env: [{ id: 2, name: 'KEPT', keep: true }, { id: 3, name: 'EMPTY', keep: false }, { id: 4, name: 'LINES', keep: false }],
    }]
    const reads: number[] = []
    expect(stdioRequest(draft, (_server, env) => { reads.push(env); return env === 4 ? 'a\nb' : '' })).toEqual({
      servers: [{ name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
        env: [{ name: 'KEPT' }, { name: 'EMPTY', value: '' }, { name: 'LINES', value: 'a\nb' }] }],
    })
    expect(reads).toEqual([3, 4])
    expect(stdioRequest([], () => 'unused')).toEqual({ servers: [] })
  })
})

describe('stdio refusals', () => {
  it('does not guess which place disappeared', () =>
    expect(stdioRefusal(new ApiFailure(404, { code: 'not_found', message: 'raw' }))).toBe('This host or hat no longer exists.'))
  it('keeps invalid field text', () =>
    expect(stdioRefusal(new ApiFailure(400, { code: 'invalid', message: 'server 1: command is empty' }))).toBe('server 1: command is empty'))
  it.each([
    ['env_value_missing', 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.'],
    ['too_many_stdio_servers', 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.'],
    ['host_revoked', 'This host is revoked: its local MCP servers can be read, not changed.'],
    ['slug_taken', 'This slug is taken: pick another.'],
    ['mcp_isolation_unavailable', 'The host could not isolate this agent’s MCP servers. Try again.'],
  ])('words %s', (code, message) => expect(stdioRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
})
```

After:

```typescript
import { describe, expect, it } from 'vitest'
import { ApiFailure } from '../api/errors'
import { canKeepEnv, stdioRefusal, stdioRequest } from './stdio'
import type { McpStdioServerItem } from '../generated/protocol'

const before: McpStdioServerItem = {
  name: 'files', command: 'server', args: [''], env: [{ name: 'TOKEN', has_value: true }],
  created_at: '2026-10-13T00:00:00Z', updated_at: '2026-10-13T00:00:00Z',
}

describe('env retention', () => {
  it('keeps only unchanged name, command and a stored env key', () => {
    expect(canKeepEnv(before, 'files', 'server', 'TOKEN')).toBe(true)
    expect(canKeepEnv(before, 'renamed', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'changed', 'TOKEN')).toBe(false)
    expect(canKeepEnv(before, 'files', 'server', 'MISSING')).toBe(false)
    expect(canKeepEnv({ ...before, env: [{ name: 'TOKEN', has_value: false }] }, 'files', 'server', 'TOKEN')).toBe(false)
    expect(canKeepEnv(undefined, 'files', 'server', 'TOKEN')).toBe(false)
  })
})

describe('full-set request', () => {
  it('keeps omissions distinct from empty and multiline values and preserves argv', () => {
    const draft = [{
      id: 1, name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
      env: [{ id: 2, name: 'KEPT', keep: true }, { id: 3, name: 'EMPTY', keep: false }, { id: 4, name: 'LINES', keep: false }],
    }]
    const reads: number[] = []
    expect(stdioRequest(draft, (_server, env) => { reads.push(env); return env === 4 ? 'a\nb' : '' })).toEqual({
      servers: [{ name: 'files', command: 'server', args: ['', 'a b', 'two\nlines'],
        env: [{ name: 'KEPT' }, { name: 'EMPTY', value: '' }, { name: 'LINES', value: 'a\nb' }] }],
    })
    expect(reads).toEqual([3, 4])
    expect(stdioRequest([], () => 'unused')).toEqual({ servers: [] })
  })
})

describe('stdio refusals', () => {
  it('does not guess which place disappeared', () =>
    expect(stdioRefusal(new ApiFailure(404, { code: 'not_found', message: 'raw' }))).toBe('This host or hat no longer exists.'))
  it('keeps invalid field text', () =>
    expect(stdioRefusal(new ApiFailure(400, { code: 'invalid', message: 'server 1: command is empty' }))).toBe('server 1: command is empty'))
  it.each([
    ['env_value_missing', 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.'],
    ['too_many_stdio_servers', 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.'],
    ['host_revoked', 'This host is revoked: its local MCP servers can be read, not changed.'],
    ['slug_taken', 'A connection already uses this name.'],
    ['mcp_isolation_unavailable', 'The host could not isolate this agent’s MCP servers.'],
  ])('words %s', (code, message) => expect(stdioRefusal(new ApiFailure(409, { code, message: 'raw' }))).toBe(message))
})
```

**Replace:** `web/src/screens/Mcp.test.tsx` (this exact complete file once).

Before:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { connection, hat, host } from '../test-fixtures'
import { FULL, json, stubServer, type Answer } from '../test-server'
import { loadManageCss, shortTargets } from '../test-targets'

const STEP_UP = json(403, { code: 'step_up_required', message: 'm' })
const STEPPED_UP = new Response(null, { status: 204 })
const NO_CONTENT = () => new Response(null, { status: 204 })
const WITH_MCP = { mode: 'full', features: ['mcp_connections'] }
const HATS = [
  hat({ id: 'hat-a', name: 'Personal' }),
  hat({ id: 'hat-b', name: 'Work', default_for_new_hosts: true }),
  hat({ id: 'hat-c', name: 'Old', purging: true }),
]
const PATH = '/api/mcp/connections'
const ITEM = `${PATH}/conn-0000000000000001`

afterEach(() => history.replaceState(null, '', '/'))

function open(routes: Record<string, Answer | Answer[]>, capabilities: unknown = WITH_MCP) {
  history.replaceState(null, '', '/mcp')
  const server = stubServer({
    'GET /api/capabilities': json(200, capabilities),
    'GET /api/hats': json(200, HATS),
    'GET /api/hosts': json(200, [host()]),
    'GET /api/mcp/connections': json(200, [connection()]),
    'POST /api/auth/step-up/password': STEPPED_UP,
    ...routes,
  })
  render(<App fetchImpl={server.fetch} />)
  return server
}

async function stepUp() {
  const dialog = await screen.findByRole('dialog', { name: 'This needs a fresh confirmation' })
  await userEvent.type(within(dialog).getByLabelText('Your password'), 'correct horse battery')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
}

const sent = (server: ReturnType<typeof stubServer>, method: string, path: string) =>
  server.sent.filter((s) => s.method === method && s.path === path)

const card = (name: string) => screen.findByRole('listitem', { name })

describe('the MCP screen behind its feature', () => {
  it('serves local sets only with their separate stdio feature', async () => {
    const path = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
    const server = open({ [`GET ${path}`]: json(200, { host_id: 'host-1', hat_id: 'hat-a', servers: [] }) }, { mode: 'full', features: ['mcp_connections', 'mcp_stdio'] })
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Local MCP servers' })).toBeInTheDocument()
    expect(sent(server, 'GET', path)).toHaveLength(1)
  })
  it('is not shown, and nothing is read, when the collector does not serve connections', async () => {
    const server = open({}, FULL)
    expect(await screen.findByText('The MCP gateway is not part of this deployment.')).toBeInTheDocument()
    expect(sent(server, 'GET', PATH)).toHaveLength(0)
  })

  it('is shown with the feature, ignoring names it does not know', async () => {
    open({}, { mode: 'full', features: ['from_the_future', 'mcp_connections'] })
    expect(await screen.findByRole('heading', { name: 'MCP', level: 1 })).toBeInTheDocument()
    expect(await card('Docs')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Local MCP servers' })).toBeNull()
  })
})

describe('the connection list', () => {
  it('shows what agents see, the server, the hat, the token’s state and the hosts', async () => {
    open({
      'GET /api/hosts': json(200, [
        host(),
        host({ host_id: 'host-2', name: 'old box', revoked_at: '2026-10-02T11:00:00Z' }),
      ]),
      'GET /api/mcp/connections': json(200, [connection({ mounts: ['host-1'] })]),
    })
    const docs = await card('Docs')
    expect(within(docs).getByText('hennery-docs', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('https://mcp.example.com/mcp', { exact: true })).toBeInTheDocument()
    // On the card and beside the token field.
    await waitFor(() => expect(within(docs).getAllByText('Personal', { exact: true })).toHaveLength(2))
    expect(within(docs).getByText('Not used yet', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('Not set yet', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('someone', { exact: true })).toBeInTheDocument()
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeChecked()
    expect(within(docs).queryByRole('checkbox', { name: 'old box' })).toBeNull()
  })

  it('keeps the start/resume notice and replaces the blanket note with host predictions', async () => {
    open({})
    const note = await screen.findByRole('region', { name: 'How sessions get these' })
    expect(note).toHaveTextContent('Changes apply to new and resumed sessions.')
    expect(note).not.toHaveTextContent('Codex, Claude run with your own CLI')
    expect(await screen.findByText('MCP delivery is unknown for this host’s agents.')).toBeInTheDocument()
  })

  it('annotates the mount grid per reported agent, without changing checkbox names', async () => {
    open({ 'GET /api/hosts': json(200, [host({ capabilities: ['mcp_servers'], mcp_delivery: {
      claude: 'isolated', codex: 'default_hat_only',
    } })]) })
    const docs = await card('Docs')
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeInTheDocument()
    const predictions = within(docs).getAllByRole('region', { name: 'MCP prediction' })
    expect(predictions).toHaveLength(2)
    expect(predictions[0]).toHaveTextContent('Hennery keeps this agent')
    expect(predictions[1]).toHaveTextContent('not isolated per hat')
  })

  it('words each state, and never asks to reconnect a failing one', async () => {
    open({
      'GET /api/mcp/connections': json(200, [
        connection({ id: 'conn-1', label: 'A', status: 'ok' }),
        connection({ id: 'conn-2', label: 'B', status: 'needs_auth', status_note: 'token revoked' }),
        connection({ id: 'conn-3', label: 'C', status: 'error', status_note: 'upstream 503' }),
        connection({ id: 'conn-4', label: 'D', status: 'from_the_future' as never }),
      ]),
    })
    expect(within(await card('A')).getByText('Working', { exact: true })).toBeInTheDocument()
    const b = await card('B')
    expect(within(b).getByText('Needs sign-in again', { exact: true })).toBeInTheDocument()
    expect(within(b).getByText('The server refused the token: set a new one below.')).toBeInTheDocument()
    const c = await card('C')
    expect(within(c).getByText('Is failing', { exact: true })).toBeInTheDocument()
    expect(within(c).getByText('upstream 503', { exact: true })).toBeInTheDocument()
    expect(c).not.toHaveTextContent(/connect again|reconnect|sign in again|set a new one/i)
    expect(within(await card('D')).getByText('Unknown state', { exact: true })).toBeInTheDocument()
  })

  it('renders a label and a vendor’s note as escaped, isolated text, the note cut at 300 characters', async () => {
    const long = '<b>x</b>' + 'y'.repeat(400)
    open({ 'GET /api/mcp/connections': json(200, [connection({ label: 'Do\u202Ecs<i>', status: 'error', status_note: long })]) })
    const title = await screen.findByRole('heading', { name: 'Do<U+202E>cs<i>' })
    expect(title.querySelector('bdi')).not.toBeNull()
    expect(title.querySelector('i')).toBeNull()
    const docs = screen.getByRole('listitem', { name: 'Do<U+202E>cs<i>' })
    const note = within(docs).getByText([...long].slice(0, 300).join('') + '…', { exact: true })
    expect(note.tagName).toBe('BDI')
    expect(docs.querySelector('b')).toBeNull()
  })

  it('tells a connection without authentication that the server wants one, without asking to reconnect', async () => {
    open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'none', status: 'needs_auth' })]) })
    const docs = await card('Docs')
    expect(
      within(docs).getByText('The server asks for credentials: edit the connection to send a token.', { exact: true }),
    ).toBeInTheDocument()
  })

  it('cuts the account a vendor reports at 300 characters, as text', async () => {
    const long = '<i>a</i>' + 'z'.repeat(400)
    open({ 'GET /api/mcp/connections': json(200, [connection({ account_label: long })]) })
    const docs = await card('Docs')
    const account = within(docs).getByText([...long].slice(0, 300).join('') + '…', { exact: true })
    expect(account.tagName).toBe('BDI')
    expect(docs.querySelector('i')).toBeNull()
  })

  it('renders the URL, the hat and the host names as escaped text', async () => {
    open({
      'GET /api/hats': json(200, [hat({ id: 'hat-a', name: 'Pers\u202Eonal' })]),
      'GET /api/hosts': json(200, [host({ name: 'lap\u202Etop' })]),
      'GET /api/mcp/connections': json(200, [connection({ url: 'https://x.example/\u202Emcp' })]),
    })
    const docs = await card('Docs')
    expect(within(docs).getByText('https://x.example/<U+202E>mcp', { exact: true }).tagName).toBe('BDI')
    const hats = await within(docs).findAllByText('Pers<U+202E>onal', { exact: true })
    expect(hats.map((h) => h.tagName)).toEqual(['BDI', 'BDI'])
    expect(await within(docs).findByRole('checkbox', { name: 'lap<U+202E>top' })).toBeInTheDocument()
  })

  it('offers no token for a connection without authentication', async () => {
    open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'none' })]) })
    const docs = await card('Docs')
    expect(within(docs).queryByRole('button', { name: 'Save token' })).toBeNull()
    expect(within(docs).getByText('None', { exact: true })).toBeInTheDocument()
  })

  it('says so when there is no connection', async () => {
    open({ 'GET /api/mcp/connections': json(200, []) })
    expect(await screen.findByText('No connection yet.')).toBeInTheDocument()
  })

  it('has every button, picker and tick box at least 44 px tall under 768 px', async () => {
    const unload = loadManageCss()
    try {
      open({})
      const docs = await card('Docs')
      await within(docs).findByRole('checkbox', { name: 'laptop' })
      const page = document.querySelector('.manage')!
      expect(shortTargets(page)).toEqual([])
      expect([...page.querySelectorAll('label.check')].filter((l) => !tallLabel(l))).toEqual([])
      await userEvent.click(screen.getByRole('button', { name: 'Add connection' }))
      await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
      expect(shortTargets(page)).toEqual([])
      expect([...page.querySelectorAll('label.check')].filter((l) => !tallLabel(l))).toEqual([])
    } finally {
      unload()
    }
  })
})

/** Whether a narrow-screen rule makes a tick box's label 44 px tall. */
function tallLabel(label: Element): boolean {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSMediaRule) || !/max-width:\s*767px/.test(rule.media.mediaText)) continue
      for (const inner of rule.cssRules) {
        if (inner instanceof CSSStyleRule && label.matches(inner.selectorText) && parseFloat(inner.style.minHeight) >= 44)
          return true
      }
    }
  }
  return false
}

describe('adding a connection', () => {
  it('starts in the default hat for new hosts, offers no hat being purged, steps up and sends one body twice', async () => {
    const created = connection({ id: 'conn-2', slug: 'tracker', label: 'Tracker', hat_id: 'hat-b' })
    const server = open({ 'POST /api/mcp/connections': [STEP_UP, json(201, created)] })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    const picker = within(form).getByRole('combobox', { name: 'Hat' })
    expect(picker).toHaveValue('hat-b')
    expect(within(picker).queryByRole('option', { name: 'Old' })).toBeNull()
    await userEvent.type(within(form).getByRole('textbox', { name: 'Name' }), 'Tracker')
    await userEvent.type(within(form).getByRole('textbox', { name: 'Slug' }), 'tracker')
    expect(within(form).getByText('hennery-tracker', { exact: true })).toBeInTheDocument()
    await userEvent.type(within(form).getByRole('textbox', { name: 'Server URL' }), 'https://tracker.example/mcp')
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }))
    await stepUp()
    const tracker = await card('Tracker')
    await waitFor(() => expect(within(tracker).getByRole('heading', { name: 'Tracker' })).toHaveFocus())
    const posts = sent(server, 'POST', PATH)
    expect(posts).toHaveLength(2)
    expect(posts[1].body).toEqual(posts[0].body)
    expect(posts[0].body).toEqual({
      slug: 'tracker',
      label: 'Tracker',
      url: 'https://tracker.example/mcp',
      hat_id: 'hat-b',
      cred_kind: 'static',
      static_header: 'Authorization',
      static_prefix: 'Bearer ',
      tool_allowlist: null,
      internal_network: false,
    })
    expect(screen.queryByRole('region', { name: 'Add a connection' })).toBeNull()
  })

  it('warns before saving no tool at all, and with the internal network', async () => {
    open({})
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Every tool' }))
    expect(within(form).getByText('No tool is allowed: agents see this server with none.')).toBeInTheDocument()
    await userEvent.type(within(form).getByRole('textbox', { name: 'Allowed tools' }), 'search')
    expect(within(form).queryByText('No tool is allowed: agents see this server with none.')).toBeNull()
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Internal network' }))
    expect(
      within(form).getByText(
        'The gateway may then reach addresses on your own network for this connection, and plain http to them. Turn it on only for a server you run there.',
        { exact: true },
      ),
    ).toBeInTheDocument()
  })

  it('sends one request however often “Create” is pressed while it runs', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({ 'POST /api/mcp/connections': () => new Promise<Response>((done) => (answer = done)) })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    const create = within(form).getByRole('button', { name: 'Create' })
    await userEvent.click(create)
    await waitFor(() => expect(create).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(create)
    expect(sent(server, 'POST', PATH)).toHaveLength(1)
    // Cancel waits too: the request already sent will land.
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('region', { name: 'Add a connection' })).toBeInTheDocument()
    answer(json(201, connection({ id: 'conn-2', label: 'New' })))
    expect(await card('New')).toBeInTheDocument()
  })

  it('opens with focus on the name', async () => {
    open({})
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('returns focus to “Add connection” when the form is cancelled', async () => {
    open({})
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('region', { name: 'Add a connection' })).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add connection' })).toHaveFocus())
  })

  it('shows a refusal, and keeps the form', async () => {
    open({ 'POST /api/mcp/connections': json(409, { code: 'slug_taken', message: 'x' }) })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('This slug is taken: pick another.')
  })

  it('shows the server’s own words for a field it refused, as text', async () => {
    open({ 'POST /api/mcp/connections': json(400, { code: 'invalid', message: 'url: <b>not https</b>' }) })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }))
    const alert = await within(form).findByRole('alert')
    expect(alert).toHaveTextContent('url: <b>not https</b>')
    expect(alert.querySelector('b')).toBeNull()
  })
})

describe('editing a connection', () => {
  it('sends only the label, with no step-up, and returns focus to Edit', async () => {
    const server = open({ [`PATCH ${ITEM}`]: json(200, connection({ label: 'Docs 2' })) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const name = within(docs).getByRole('textbox', { name: 'Name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Docs 2')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const renamed = await card('Docs 2')
    await waitFor(() => expect(within(renamed).getByRole('button', { name: 'Edit' })).toHaveFocus())
    expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ label: 'Docs 2' }])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens with focus on the name', async () => {
    open({})
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    expect(within(docs).getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('compares with the connection as the form opened, not an answer folded in since', async () => {
    const server = open({
      // Another tab moved the URL; the mount's answer brings that copy in.
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: ['host-1'], url: 'https://moved.example/mcp' })),
      [`PATCH ${ITEM}`]: json(200, connection({ label: 'Docs 2', url: 'https://moved.example/mcp' })),
    })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const laptop = await within(docs).findByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).toBeChecked())
    const name = within(docs).getByRole('textbox', { name: 'Name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Docs 2')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    await card('Docs 2')
    expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ label: 'Docs 2' }])
  })

  it('sends one request however often “Save” is pressed while it runs', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({ [`PATCH ${ITEM}`]: () => new Promise<Response>((done) => (answer = done)) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.type(within(docs).getByRole('textbox', { name: 'Name' }), '!')
    const save = within(docs).getByRole('button', { name: 'Save' })
    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(save)
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(1)
    answer(json(200, connection({ label: 'Docs!' })))
    expect(await card('Docs!')).toBeInTheDocument()
  })

  it.each(['success', 'failure'] as const)('ignores another card’s Edit during a slow save (%s)', async (outcome) => {
    const removeCss = loadManageCss()
    try {
      let answer: (response: Response) => void = () => {}
      const server = open({
        'GET /api/mcp/connections': json(200, [
          connection(),
          connection({ id: 'conn-2', label: 'Other', slug: 'other' }),
        ]),
        [`PATCH ${ITEM}`]: () => new Promise<Response>((done) => (answer = done)),
      })
      const docs = await card('Docs')
      const other = await card('Other')
      const otherEdit = within(other).getByRole('button', { name: 'Edit' })
      expect(otherEdit).toHaveAttribute('aria-disabled', 'false')
      await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
      await userEvent.type(within(docs).getByRole('textbox', { name: 'Name' }), '!')
      await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(sent(server, 'PATCH', ITEM)).toHaveLength(1))
      expect(otherEdit).toHaveAttribute('aria-disabled', 'true')
      expect(otherEdit).toHaveStyle({ opacity: '0.45', cursor: 'not-allowed' })
      expect(otherEdit).not.toBeDisabled()
      await userEvent.click(otherEdit)
      expect(otherEdit).toHaveFocus()
      expect(within(other).queryByRole('textbox', { name: 'Name' })).toBeNull()
      expect(within(docs).getByRole('textbox', { name: 'Name' })).toHaveValue('Docs!')

      answer(outcome === 'success'
        ? json(200, connection({ label: 'Docs!' }))
        : json(400, { code: 'invalid', message: 'Docs save refused' }))
      if (outcome === 'success') {
        await waitFor(() => expect(within(docs).getByRole('button', { name: 'Edit' })).toHaveFocus())
      } else {
        expect(await within(docs).findByRole('alert')).toHaveTextContent('Docs save refused')
      }
      expect(within(other).queryByRole('alert')).toBeNull()
      expect(otherEdit).toHaveAttribute('aria-disabled', 'false')
      expect(getComputedStyle(otherEdit).cursor).not.toBe('not-allowed')
      await userEvent.click(otherEdit)
      expect(within(other).getByRole('textbox', { name: 'Name' })).toHaveValue('Other')
      expect(within(other).getByRole('textbox', { name: 'Name' })).toHaveFocus()
      expect(within(other).queryByRole('alert')).toBeNull()
      await userEvent.click(within(other).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(within(other).getByRole('button', { name: 'Edit' })).toHaveFocus())
      expect(sent(server, 'PATCH', ITEM).map((request) => request.body)).toEqual([{ label: 'Docs!' }])
    } finally {
      removeCss()
    }
  })

  it('sends nothing when nothing changed', async () => {
    const server = open({})
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(within(docs).getByRole('button', { name: 'Edit' })).toHaveFocus())
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(0)
  })

  it('says the token goes before another origin is saved, then steps up and sends one body twice', async () => {
    const server = open({
      'GET /api/mcp/connections': json(200, [connection({ has_credential: true })]),
      [`PATCH ${ITEM}`]: [STEP_UP, json(200, connection({ url: 'https://other.example/mcp' }))],
    })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const url = within(docs).getByRole('textbox', { name: 'Server URL' })
    await userEvent.clear(url)
    await userEvent.type(url, 'https://other.example/mcp')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(0)
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save and delete the token' }))
    await stepUp()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const patches = sent(server, 'PATCH', ITEM)
    expect(patches.map((s) => s.body)).toEqual([{ url: 'https://other.example/mcp' }, { url: 'https://other.example/mcp' }])
    expect(within(await card('Docs')).getByText('https://other.example/mcp', { exact: true })).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('listitem', { name: 'Docs' })).getByRole('button', { name: 'Edit' })).toHaveFocus())
  })

  it('sends nothing, and keeps the form, when the token’s loss is not confirmed', async () => {
    const server = open({ 'GET /api/mcp/connections': json(200, [connection({ has_credential: true })]) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(docs).getByRole('combobox', { name: 'Authentication' }), 'none')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(0)
    expect(within(docs).getByRole('combobox', { name: 'Authentication' })).toHaveValue('none')
  })

  it('says the token goes before another kind is saved', async () => {
    const server = open({
      'GET /api/mcp/connections': json(200, [connection({ has_credential: true })]),
      [`PATCH ${ITEM}`]: json(200, connection({ cred_kind: 'none' })),
    })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(docs).getByRole('combobox', { name: 'Authentication' }), 'none')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save and delete the token' }))
    await waitFor(() => expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ cred_kind: 'none' }]))
  })

  it('asks nothing first when no token is stored to lose', async () => {
    const server = open({ [`PATCH ${ITEM}`]: json(200, connection({ cred_kind: 'none' })) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(docs).getByRole('combobox', { name: 'Authentication' }), 'none')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ cred_kind: 'none' }]))
    expect(screen.queryByRole('dialog', { name: 'Delete the stored token?' })).toBeNull()
  })

  it('keeps the form and shows a refusal', async () => {
    open({ [`PATCH ${ITEM}`]: json(400, { code: 'unsupported_cred_kind', message: 'x' }) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.type(within(docs).getByRole('textbox', { name: 'Name' }), '!')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    expect(await within(docs).findByRole('alert')).toHaveTextContent('This collector cannot sign in to a server this way yet.')
    expect(within(docs).getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('deleting a connection', () => {
  it('is confirmed, then steps up, sends it twice, and the card goes', async () => {
    const server = open({ [`DELETE ${ITEM}`]: [STEP_UP, NO_CONTENT] })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this connection?' })
    expect(confirm).toHaveTextContent('hennery-docs')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await stepUp()
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Docs' })).toBeNull())
    expect(sent(server, 'DELETE', ITEM)).toHaveLength(2)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'MCP', level: 1 })).toHaveFocus())
  })
})

describe('the token', () => {
  it('steps up, sends one body twice, empties the field at once, and takes the 204 as stored', async () => {
    const server = open({ [`PUT ${ITEM}/credential`]: [STEP_UP, NO_CONTENT] })
    const docs = await card('Docs')
    const field = within(docs).getByLabelText('Token') as HTMLInputElement
    expect(field.type).toBe('password')
    await userEvent.type(field, 'sk-secret-1')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    expect(field.value).toBe('')
    await stepUp()
    expect(await within(docs).findByRole('status')).toHaveTextContent('Token saved. It is never shown again.')
    await waitFor(() => expect(within(docs).getByText('Set', { exact: true })).toBeInTheDocument())
    const puts = sent(server, 'PUT', `${ITEM}/credential`)
    expect(puts.map((s) => s.body)).toEqual([{ token: 'sk-secret-1' }, { token: 'sk-secret-1' }])
    expect(sent(server, 'GET', PATH)).toHaveLength(1)
    expect(document.body.innerHTML).not.toContain('sk-secret-1')
    expect(location.href).not.toContain('sk-secret-1')
  })

  it('is not sent again when the step-up is cancelled, and is not kept', async () => {
    const server = open({ [`PUT ${ITEM}/credential`]: STEP_UP })
    const docs = await card('Docs')
    const field = within(docs).getByLabelText('Token') as HTMLInputElement
    await userEvent.type(field, 'sk-secret-2')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    const dialog = await screen.findByRole('dialog', { name: 'This needs a fresh confirmation' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(await within(docs).findByRole('alert')).toHaveTextContent('Not confirmed.')
    expect(sent(server, 'PUT', `${ITEM}/credential`)).toHaveLength(1)
    expect(field.value).toBe('')
    expect(document.body.innerHTML).not.toContain('sk-secret-2')
  })

  it('keeps a mount saved while the token was being stored', async () => {
    let answer: (r: Response) => void = () => {}
    open({
      [`PUT ${ITEM}/credential`]: () => new Promise<Response>((done) => (answer = done)),
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: ['host-1'] })),
    })
    const docs = await card('Docs')
    await userEvent.type(within(docs).getByLabelText('Token'), 'sk-secret-3')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    const laptop = within(docs).getByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).toBeChecked())
    answer(NO_CONTENT())
    await waitFor(() => expect(within(docs).getByText('Set', { exact: true })).toBeInTheDocument())
    expect(laptop).toBeChecked()
  })

  it('asks password managers to leave the field alone, and never submits it natively', async () => {
    open({})
    const docs = await card('Docs')
    const field = within(docs).getByLabelText('Token')
    expect(field).toHaveAttribute('type', 'password')
    expect(field).toHaveAttribute('autocomplete', 'off')
    expect(field).toHaveAttribute('data-1p-ignore')
    expect(field).toHaveAttribute('data-lpignore', 'true')
    expect(field).toHaveAttribute('data-bwignore')
    expect(field).toHaveAttribute('data-form-type', 'other')
    expect(field.closest('form')).toHaveAttribute('method', 'post')
  })

  it('says where the token goes, and for which hat', async () => {
    open({})
    const docs = await card('Docs')
    await waitFor(() =>
      expect(within(docs).getByText((_, el) => el?.textContent === 'Sent only to https://mcp.example.com, for sessions in Personal.' && el.tagName === 'P')).toBeInTheDocument(),
    )
  })

  it('stops saying it was saved once a change deletes it', async () => {
    const server = open({
      [`PUT ${ITEM}/credential`]: NO_CONTENT,
      [`PATCH ${ITEM}`]: json(200, connection({ has_credential: false, static_header: 'Authorization' })),
    })
    const docs = await card('Docs')
    await userEvent.type(within(docs).getByLabelText('Token'), 'sk-secret-5')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    expect(await within(docs).findByRole('status')).toHaveTextContent('Token saved. It is never shown again.')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const url = within(docs).getByRole('textbox', { name: 'Server URL' })
    await userEvent.clear(url)
    await userEvent.type(url, 'https://other.example/mcp')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save and delete the token' }))
    await waitFor(() => expect(within(docs).getByText('Not set yet', { exact: true })).toBeInTheDocument())
    expect(within(docs).queryByRole('status')).toBeNull()
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(1)
  })

  it('ignores a second send while the first runs', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({ [`PUT ${ITEM}/credential`]: () => new Promise<Response>((done) => (answer = done)) })
    const docs = await card('Docs')
    await userEvent.type(within(docs).getByLabelText('Token'), 'sk-secret-4')
    const save = within(docs).getByRole('button', { name: 'Save token' })
    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(save)
    expect(within(docs).queryByRole('alert')).toBeNull()
    expect(sent(server, 'PUT', `${ITEM}/credential`)).toHaveLength(1)
    answer(NO_CONTENT())
    expect(await within(docs).findByRole('status')).toHaveTextContent('Token saved. It is never shown again.')
  })

  it('sends nothing for an empty field', async () => {
    const server = open({})
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    expect(await within(docs).findByRole('alert')).toHaveTextContent('Type the token first.')
    expect(sent(server, 'PUT', `${ITEM}/credential`)).toHaveLength(0)
  })
})

describe('the mounts', () => {
  it('sends the whole set with no step-up, keeping a host this list does not show', async () => {
    const server = open({
      'GET /api/hosts': json(200, [host(), host({ host_id: 'host-2', name: 'build box' })]),
      'GET /api/mcp/connections': json(200, [connection({ mounts: ['host-9'] })]),
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: ['host-1', 'host-9'] })),
    })
    const docs = await card('Docs')
    const laptop = await within(docs).findByRole('checkbox', { name: 'laptop' })
    expect(laptop).not.toBeChecked()
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).toBeChecked())
    expect(sent(server, 'PUT', `${ITEM}/mounts`).map((s) => s.body)).toEqual([{ host_ids: ['host-1', 'host-9'] }])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(docs).getByRole('checkbox', { name: 'build box' })).not.toBeChecked()
  })

  it('ignores a tick while a set is being saved', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({
      'GET /api/hosts': json(200, [host(), host({ host_id: 'host-2', name: 'build box' })]),
      [`PUT ${ITEM}/mounts`]: () => new Promise<Response>((done) => (answer = done)),
    })
    const docs = await card('Docs')
    await userEvent.click(await within(docs).findByRole('checkbox', { name: 'laptop' }))
    await waitFor(() => expect(within(docs).getByRole('group', { name: 'Hosts whose sessions get it' })).toHaveAttribute('aria-busy', 'true'))
    await userEvent.click(within(docs).getByRole('checkbox', { name: 'build box' }))
    expect(sent(server, 'PUT', `${ITEM}/mounts`).map((s) => s.body)).toEqual([{ host_ids: ['host-1'] }])
    answer(json(200, connection({ mounts: ['host-1'] })))
    await waitFor(() => expect(within(docs).getByRole('checkbox', { name: 'laptop' })).toBeChecked())
    expect(within(docs).getByRole('checkbox', { name: 'build box' })).not.toBeChecked()
  })

  it('unticks a host', async () => {
    const server = open({
      'GET /api/mcp/connections': json(200, [connection({ mounts: ['host-1'] })]),
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: [] })),
    })
    const laptop = await within(await card('Docs')).findByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).not.toBeChecked())
    expect(sent(server, 'PUT', `${ITEM}/mounts`).map((s) => s.body)).toEqual([{ host_ids: [] }])
  })

  it('shows a refusal and keeps the set as it was', async () => {
    open({ [`PUT ${ITEM}/mounts`]: json(400, { code: 'invalid', message: 'host-1 is revoked' }) })
    const docs = await card('Docs')
    const laptop = await within(docs).findByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    expect(await within(docs).findByRole('alert')).toHaveTextContent('host-1 is revoked')
    expect(laptop).not.toBeChecked()
  })

  it('cannot be changed while the hosts cannot be read', async () => {
    open({ 'GET /api/hosts': json(500, { code: 'internal', message: 'the hosts are away' }) })
    const docs = await card('Docs')
    expect(await screen.findByRole('alert')).toHaveTextContent('the hosts are away')
    expect(within(docs).getByRole('group', { name: 'Hosts whose sessions get it' })).toBeDisabled()
  })
})
```

After:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { connection, hat, host } from '../test-fixtures'
import { FULL, json, stubServer, type Answer } from '../test-server'
import { loadManageCss, shortTargets } from '../test-targets'

const STEP_UP = json(403, { code: 'step_up_required', message: 'm' })
const STEPPED_UP = new Response(null, { status: 204 })
const NO_CONTENT = () => new Response(null, { status: 204 })
const WITH_MCP = { mode: 'full', features: ['mcp_connections'] }
const HATS = [
  hat({ id: 'hat-a', name: 'Personal' }),
  hat({ id: 'hat-b', name: 'Work', default_for_new_hosts: true }),
  hat({ id: 'hat-c', name: 'Old', purging: true }),
]
const PATH = '/api/mcp/connections'
const ITEM = `${PATH}/conn-0000000000000001`

afterEach(() => history.replaceState(null, '', '/'))

function open(routes: Record<string, Answer | Answer[]>, capabilities: unknown = WITH_MCP) {
  history.replaceState(null, '', '/mcp')
  const server = stubServer({
    'GET /api/capabilities': json(200, capabilities),
    'GET /api/hats': json(200, HATS),
    'GET /api/hosts': json(200, [host()]),
    'GET /api/mcp/connections': json(200, [connection()]),
    'POST /api/auth/step-up/password': STEPPED_UP,
    ...routes,
  })
  render(<App fetchImpl={server.fetch} />)
  return server
}

async function stepUp() {
  const dialog = await screen.findByRole('dialog', { name: 'This needs a fresh confirmation' })
  await userEvent.type(within(dialog).getByLabelText('Your password'), 'correct horse battery')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
}

const sent = (server: ReturnType<typeof stubServer>, method: string, path: string) =>
  server.sent.filter((s) => s.method === method && s.path === path)

const card = (name: string) => screen.findByRole('listitem', { name })

describe('the MCP screen behind its feature', () => {
  it('serves local sets only with their separate stdio feature', async () => {
    const path = '/api/mcp/stdio-servers?host_id=host-1&hat_id=hat-a'
    const server = open({ [`GET ${path}`]: json(200, { host_id: 'host-1', hat_id: 'hat-a', servers: [] }) }, { mode: 'full', features: ['mcp_connections', 'mcp_stdio'] })
    expect(await screen.findByRole('button', { name: 'Add local server' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Local MCP servers' })).toBeInTheDocument()
    expect(sent(server, 'GET', path)).toHaveLength(1)
  })
  it('is not shown, and nothing is read, when the collector does not serve connections', async () => {
    const server = open({}, FULL)
    expect(await screen.findByText('The MCP gateway is not part of this deployment.')).toBeInTheDocument()
    expect(sent(server, 'GET', PATH)).toHaveLength(0)
  })

  it('is shown with the feature, ignoring names it does not know', async () => {
    open({}, { mode: 'full', features: ['from_the_future', 'mcp_connections'] })
    expect(await screen.findByRole('heading', { name: 'MCP', level: 1 })).toBeInTheDocument()
    expect(await card('Docs')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Local MCP servers' })).toBeNull()
  })
})

describe('the connection list', () => {
  it('shows what agents see, the server, the hat, the token’s state and the hosts', async () => {
    open({
      'GET /api/hosts': json(200, [
        host(),
        host({ host_id: 'host-2', name: 'old box', revoked_at: '2026-10-02T11:00:00Z' }),
      ]),
      'GET /api/mcp/connections': json(200, [connection({ mounts: ['host-1'] })]),
    })
    const docs = await card('Docs')
    expect(within(docs).getByText('hennery-docs', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('https://mcp.example.com/mcp', { exact: true })).toBeInTheDocument()
    // On the card and beside the token field.
    await waitFor(() => expect(within(docs).getAllByText('Personal', { exact: true })).toHaveLength(2))
    expect(within(docs).getByText('Not used yet', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('Not set yet', { exact: true })).toBeInTheDocument()
    expect(within(docs).getByText('someone', { exact: true })).toBeInTheDocument()
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeChecked()
    expect(within(docs).queryByRole('checkbox', { name: 'old box' })).toBeNull()
  })

  it('keeps the start/resume notice and replaces the blanket note with host predictions', async () => {
    open({})
    const note = await screen.findByRole('region', { name: 'How sessions get these' })
    expect(note).toHaveTextContent('Changes apply to new and resumed sessions.')
    expect(note).not.toHaveTextContent('Codex, Claude run with your own CLI')
    expect(await screen.findByText('MCP delivery is unknown for this host’s agents.')).toBeInTheDocument()
  })

  it('annotates the mount grid per reported agent, without changing checkbox names', async () => {
    open({ 'GET /api/hosts': json(200, [host({ capabilities: ['mcp_servers'], mcp_delivery: {
      claude: 'isolated', codex: 'default_hat_only',
    } })]) })
    const docs = await card('Docs')
    expect(await within(docs).findByRole('checkbox', { name: 'laptop' })).toBeInTheDocument()
    const predictions = within(docs).getAllByRole('region', { name: 'MCP prediction' })
    expect(predictions).toHaveLength(2)
    expect(predictions[0]).toHaveTextContent("This agent was given only this hat's MCP servers.")
    expect(predictions[1]).toHaveTextContent('not isolated per hat')
  })

  it('words each state, and never asks to reconnect a failing one', async () => {
    open({
      'GET /api/mcp/connections': json(200, [
        connection({ id: 'conn-1', label: 'A', status: 'ok' }),
        connection({ id: 'conn-2', label: 'B', status: 'needs_auth', status_note: 'token revoked' }),
        connection({ id: 'conn-3', label: 'C', status: 'error', status_note: 'upstream 503' }),
        connection({ id: 'conn-4', label: 'D', status: 'from_the_future' as never }),
      ]),
    })
    expect(within(await card('A')).getByText('Working', { exact: true })).toBeInTheDocument()
    const b = await card('B')
    expect(within(b).getByText('Needs sign-in again', { exact: true })).toBeInTheDocument()
    expect(within(b).getByText('The server refused the token: set a new one below.')).toBeInTheDocument()
    const c = await card('C')
    expect(within(c).getByText('Is failing', { exact: true })).toBeInTheDocument()
    expect(within(c).getByText('upstream 503', { exact: true })).toBeInTheDocument()
    expect(c).not.toHaveTextContent(/connect again|reconnect|sign in again|set a new one/i)
    expect(within(await card('D')).getByText('Unknown state', { exact: true })).toBeInTheDocument()
  })

  it('renders a label and a vendor’s note as escaped, isolated text, the note cut at 300 characters', async () => {
    const long = '<b>x</b>' + 'y'.repeat(400)
    open({ 'GET /api/mcp/connections': json(200, [connection({ label: 'Do\u202Ecs<i>', status: 'error', status_note: long })]) })
    const title = await screen.findByRole('heading', { name: 'Do<U+202E>cs<i>' })
    expect(title.querySelector('bdi')).not.toBeNull()
    expect(title.querySelector('i')).toBeNull()
    const docs = screen.getByRole('listitem', { name: 'Do<U+202E>cs<i>' })
    const note = within(docs).getByText([...long].slice(0, 300).join('') + '…', { exact: true })
    expect(note.tagName).toBe('BDI')
    expect(docs.querySelector('b')).toBeNull()
  })

  it('tells a connection without authentication that the server wants one, without asking to reconnect', async () => {
    open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'none', status: 'needs_auth' })]) })
    const docs = await card('Docs')
    expect(
      within(docs).getByText('The server asks for credentials: edit the connection to send a token.', { exact: true }),
    ).toBeInTheDocument()
  })

  it('cuts the account a vendor reports at 300 characters, as text', async () => {
    const long = '<i>a</i>' + 'z'.repeat(400)
    open({ 'GET /api/mcp/connections': json(200, [connection({ account_label: long })]) })
    const docs = await card('Docs')
    const account = within(docs).getByText([...long].slice(0, 300).join('') + '…', { exact: true })
    expect(account.tagName).toBe('BDI')
    expect(docs.querySelector('i')).toBeNull()
  })

  it('renders the URL, the hat and the host names as escaped text', async () => {
    open({
      'GET /api/hats': json(200, [hat({ id: 'hat-a', name: 'Pers\u202Eonal' })]),
      'GET /api/hosts': json(200, [host({ name: 'lap\u202Etop' })]),
      'GET /api/mcp/connections': json(200, [connection({ url: 'https://x.example/\u202Emcp' })]),
    })
    const docs = await card('Docs')
    expect(within(docs).getByText('https://x.example/<U+202E>mcp', { exact: true }).tagName).toBe('BDI')
    const hats = await within(docs).findAllByText('Pers<U+202E>onal', { exact: true })
    expect(hats.map((h) => h.tagName)).toEqual(['BDI', 'BDI'])
    expect(await within(docs).findByRole('checkbox', { name: 'lap<U+202E>top' })).toBeInTheDocument()
  })

  it('offers no token for a connection without authentication', async () => {
    open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'none' })]) })
    const docs = await card('Docs')
    expect(within(docs).queryByRole('button', { name: 'Save token' })).toBeNull()
    expect(within(docs).getByText('None', { exact: true })).toBeInTheDocument()
  })

  it('says so when there is no connection', async () => {
    open({ 'GET /api/mcp/connections': json(200, []) })
    expect(await screen.findByText('No connection yet.')).toBeInTheDocument()
  })

  it('has every button, picker and tick box at least 44 px tall under 768 px', async () => {
    const unload = loadManageCss()
    try {
      open({})
      const docs = await card('Docs')
      await within(docs).findByRole('checkbox', { name: 'laptop' })
      const page = document.querySelector('.manage')!
      expect(shortTargets(page)).toEqual([])
      expect([...page.querySelectorAll('label.check')].filter((l) => !tallLabel(l))).toEqual([])
      await userEvent.click(screen.getByRole('button', { name: 'Add connection' }))
      await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
      expect(shortTargets(page)).toEqual([])
      expect([...page.querySelectorAll('label.check')].filter((l) => !tallLabel(l))).toEqual([])
    } finally {
      unload()
    }
  })
})

/** Whether a narrow-screen rule makes a tick box's label 44 px tall. */
function tallLabel(label: Element): boolean {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSMediaRule) || !/max-width:\s*767px/.test(rule.media.mediaText)) continue
      for (const inner of rule.cssRules) {
        if (inner instanceof CSSStyleRule && label.matches(inner.selectorText) && parseFloat(inner.style.minHeight) >= 44)
          return true
      }
    }
  }
  return false
}

describe('adding a connection', () => {
  it('starts in the default hat for new hosts, offers no hat being purged, steps up and sends one body twice', async () => {
    const created = connection({ id: 'conn-2', slug: 'tracker', label: 'Tracker', hat_id: 'hat-b' })
    const server = open({ 'POST /api/mcp/connections': [STEP_UP, json(201, created)] })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    const picker = within(form).getByRole('combobox', { name: 'Hat' })
    expect(picker).toHaveValue('hat-b')
    expect(within(picker).queryByRole('option', { name: 'Old' })).toBeNull()
    await userEvent.type(within(form).getByRole('textbox', { name: 'Name' }), 'Tracker')
    await userEvent.type(within(form).getByRole('textbox', { name: 'Slug' }), 'tracker')
    expect(within(form).getByText('hennery-tracker', { exact: true })).toBeInTheDocument()
    await userEvent.type(within(form).getByRole('textbox', { name: 'Server URL' }), 'https://tracker.example/mcp')
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }))
    await stepUp()
    const tracker = await card('Tracker')
    await waitFor(() => expect(within(tracker).getByRole('heading', { name: 'Tracker' })).toHaveFocus())
    const posts = sent(server, 'POST', PATH)
    expect(posts).toHaveLength(2)
    expect(posts[1].body).toEqual(posts[0].body)
    expect(posts[0].body).toEqual({
      slug: 'tracker',
      label: 'Tracker',
      url: 'https://tracker.example/mcp',
      hat_id: 'hat-b',
      cred_kind: 'static',
      static_header: 'Authorization',
      static_prefix: 'Bearer ',
      tool_allowlist: null,
      internal_network: false,
    })
    expect(screen.queryByRole('region', { name: 'Add a connection' })).toBeNull()
  })

  it('warns before saving no tool at all, and with the internal network', async () => {
    open({})
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Every tool' }))
    expect(within(form).getByText('No tool is allowed: agents see this server with none.')).toBeInTheDocument()
    await userEvent.type(within(form).getByRole('textbox', { name: 'Allowed tools' }), 'search')
    expect(within(form).queryByText('No tool is allowed: agents see this server with none.')).toBeNull()
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Internal network' }))
    expect(
      within(form).getByText(
        'The gateway may then reach addresses on your own network for this connection, and plain http to them. Turn it on only for a server you run there.',
        { exact: true },
      ),
    ).toBeInTheDocument()
  })

  it('sends one request however often “Create” is pressed while it runs', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({ 'POST /api/mcp/connections': () => new Promise<Response>((done) => (answer = done)) })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    const create = within(form).getByRole('button', { name: 'Create' })
    await userEvent.click(create)
    await waitFor(() => expect(create).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(create)
    expect(sent(server, 'POST', PATH)).toHaveLength(1)
    // Cancel waits too: the request already sent will land.
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('region', { name: 'Add a connection' })).toBeInTheDocument()
    answer(json(201, connection({ id: 'conn-2', label: 'New' })))
    expect(await card('New')).toBeInTheDocument()
  })

  it('opens with focus on the name', async () => {
    open({})
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('returns focus to “Add connection” when the form is cancelled', async () => {
    open({})
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('region', { name: 'Add a connection' })).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add connection' })).toHaveFocus())
  })

  it('shows a refusal, and keeps the form', async () => {
    open({ 'POST /api/mcp/connections': json(409, { code: 'slug_taken', message: 'x' }) })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('This slug is taken: pick another.')
  })

  it('shows the server’s own words for a field it refused, as text', async () => {
    open({ 'POST /api/mcp/connections': json(400, { code: 'invalid', message: 'url: <b>not https</b>' }) })
    await userEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    const form = screen.getByRole('region', { name: 'Add a connection' })
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }))
    const alert = await within(form).findByRole('alert')
    expect(alert).toHaveTextContent('url: <b>not https</b>')
    expect(alert.querySelector('b')).toBeNull()
  })
})

describe('editing a connection', () => {
  it('sends only the label, with no step-up, and returns focus to Edit', async () => {
    const server = open({ [`PATCH ${ITEM}`]: json(200, connection({ label: 'Docs 2' })) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const name = within(docs).getByRole('textbox', { name: 'Name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Docs 2')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const renamed = await card('Docs 2')
    await waitFor(() => expect(within(renamed).getByRole('button', { name: 'Edit' })).toHaveFocus())
    expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ label: 'Docs 2' }])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens with focus on the name', async () => {
    open({})
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    expect(within(docs).getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('compares with the connection as the form opened, not an answer folded in since', async () => {
    const server = open({
      // Another tab moved the URL; the mount's answer brings that copy in.
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: ['host-1'], url: 'https://moved.example/mcp' })),
      [`PATCH ${ITEM}`]: json(200, connection({ label: 'Docs 2', url: 'https://moved.example/mcp' })),
    })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const laptop = await within(docs).findByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).toBeChecked())
    const name = within(docs).getByRole('textbox', { name: 'Name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Docs 2')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    await card('Docs 2')
    expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ label: 'Docs 2' }])
  })

  it('sends one request however often “Save” is pressed while it runs', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({ [`PATCH ${ITEM}`]: () => new Promise<Response>((done) => (answer = done)) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.type(within(docs).getByRole('textbox', { name: 'Name' }), '!')
    const save = within(docs).getByRole('button', { name: 'Save' })
    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(save)
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(1)
    answer(json(200, connection({ label: 'Docs!' })))
    expect(await card('Docs!')).toBeInTheDocument()
  })

  it.each(['success', 'failure'] as const)('ignores another card’s Edit during a slow save (%s)', async (outcome) => {
    const removeCss = loadManageCss()
    try {
      let answer: (response: Response) => void = () => {}
      const server = open({
        'GET /api/mcp/connections': json(200, [
          connection(),
          connection({ id: 'conn-2', label: 'Other', slug: 'other' }),
        ]),
        [`PATCH ${ITEM}`]: () => new Promise<Response>((done) => (answer = done)),
      })
      const docs = await card('Docs')
      const other = await card('Other')
      const otherEdit = within(other).getByRole('button', { name: 'Edit' })
      expect(otherEdit).toHaveAttribute('aria-disabled', 'false')
      await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
      await userEvent.type(within(docs).getByRole('textbox', { name: 'Name' }), '!')
      await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(sent(server, 'PATCH', ITEM)).toHaveLength(1))
      expect(otherEdit).toHaveAttribute('aria-disabled', 'true')
      expect(otherEdit).toHaveStyle({ opacity: '0.45', cursor: 'not-allowed' })
      expect(otherEdit).not.toBeDisabled()
      await userEvent.click(otherEdit)
      expect(otherEdit).toHaveFocus()
      expect(within(other).queryByRole('textbox', { name: 'Name' })).toBeNull()
      expect(within(docs).getByRole('textbox', { name: 'Name' })).toHaveValue('Docs!')

      answer(outcome === 'success'
        ? json(200, connection({ label: 'Docs!' }))
        : json(400, { code: 'invalid', message: 'Docs save refused' }))
      if (outcome === 'success') {
        await waitFor(() => expect(within(docs).getByRole('button', { name: 'Edit' })).toHaveFocus())
      } else {
        expect(await within(docs).findByRole('alert')).toHaveTextContent('Docs save refused')
      }
      expect(within(other).queryByRole('alert')).toBeNull()
      expect(otherEdit).toHaveAttribute('aria-disabled', 'false')
      expect(getComputedStyle(otherEdit).cursor).not.toBe('not-allowed')
      await userEvent.click(otherEdit)
      expect(within(other).getByRole('textbox', { name: 'Name' })).toHaveValue('Other')
      expect(within(other).getByRole('textbox', { name: 'Name' })).toHaveFocus()
      expect(within(other).queryByRole('alert')).toBeNull()
      await userEvent.click(within(other).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(within(other).getByRole('button', { name: 'Edit' })).toHaveFocus())
      expect(sent(server, 'PATCH', ITEM).map((request) => request.body)).toEqual([{ label: 'Docs!' }])
    } finally {
      removeCss()
    }
  })

  it('sends nothing when nothing changed', async () => {
    const server = open({})
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(within(docs).getByRole('button', { name: 'Edit' })).toHaveFocus())
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(0)
  })

  it('says the token goes before another origin is saved, then steps up and sends one body twice', async () => {
    const server = open({
      'GET /api/mcp/connections': json(200, [connection({ has_credential: true })]),
      [`PATCH ${ITEM}`]: [STEP_UP, json(200, connection({ url: 'https://other.example/mcp' }))],
    })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const url = within(docs).getByRole('textbox', { name: 'Server URL' })
    await userEvent.clear(url)
    await userEvent.type(url, 'https://other.example/mcp')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(0)
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save and delete the token' }))
    await stepUp()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const patches = sent(server, 'PATCH', ITEM)
    expect(patches.map((s) => s.body)).toEqual([{ url: 'https://other.example/mcp' }, { url: 'https://other.example/mcp' }])
    expect(within(await card('Docs')).getByText('https://other.example/mcp', { exact: true })).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('listitem', { name: 'Docs' })).getByRole('button', { name: 'Edit' })).toHaveFocus())
  })

  it('sends nothing, and keeps the form, when the token’s loss is not confirmed', async () => {
    const server = open({ 'GET /api/mcp/connections': json(200, [connection({ has_credential: true })]) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(docs).getByRole('combobox', { name: 'Authentication' }), 'none')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(0)
    expect(within(docs).getByRole('combobox', { name: 'Authentication' })).toHaveValue('none')
  })

  it('says the token goes before another kind is saved', async () => {
    const server = open({
      'GET /api/mcp/connections': json(200, [connection({ has_credential: true })]),
      [`PATCH ${ITEM}`]: json(200, connection({ cred_kind: 'none' })),
    })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(docs).getByRole('combobox', { name: 'Authentication' }), 'none')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save and delete the token' }))
    await waitFor(() => expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ cred_kind: 'none' }]))
  })

  it('asks nothing first when no token is stored to lose', async () => {
    const server = open({ [`PATCH ${ITEM}`]: json(200, connection({ cred_kind: 'none' })) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.selectOptions(within(docs).getByRole('combobox', { name: 'Authentication' }), 'none')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(sent(server, 'PATCH', ITEM).map((s) => s.body)).toEqual([{ cred_kind: 'none' }]))
    expect(screen.queryByRole('dialog', { name: 'Delete the stored token?' })).toBeNull()
  })

  it('keeps the form and shows a refusal', async () => {
    open({ [`PATCH ${ITEM}`]: json(400, { code: 'unsupported_cred_kind', message: 'x' }) })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    await userEvent.type(within(docs).getByRole('textbox', { name: 'Name' }), '!')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    expect(await within(docs).findByRole('alert')).toHaveTextContent('This collector cannot sign in to a server this way yet.')
    expect(within(docs).getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('deleting a connection', () => {
  it('is confirmed, then steps up, sends it twice, and the card goes', async () => {
    const server = open({ [`DELETE ${ITEM}`]: [STEP_UP, NO_CONTENT] })
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this connection?' })
    expect(confirm).toHaveTextContent('hennery-docs')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await stepUp()
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Docs' })).toBeNull())
    expect(sent(server, 'DELETE', ITEM)).toHaveLength(2)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'MCP', level: 1 })).toHaveFocus())
  })
})

describe('the token', () => {
  it('steps up, sends one body twice, empties the field at once, and takes the 204 as stored', async () => {
    const server = open({ [`PUT ${ITEM}/credential`]: [STEP_UP, NO_CONTENT] })
    const docs = await card('Docs')
    const field = within(docs).getByLabelText('Token') as HTMLInputElement
    expect(field.type).toBe('password')
    await userEvent.type(field, 'sk-secret-1')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    expect(field.value).toBe('')
    await stepUp()
    expect(await within(docs).findByRole('status')).toHaveTextContent('Token saved. It is never shown again.')
    await waitFor(() => expect(within(docs).getByText('Set', { exact: true })).toBeInTheDocument())
    const puts = sent(server, 'PUT', `${ITEM}/credential`)
    expect(puts.map((s) => s.body)).toEqual([{ token: 'sk-secret-1' }, { token: 'sk-secret-1' }])
    expect(sent(server, 'GET', PATH)).toHaveLength(1)
    expect(document.body.innerHTML).not.toContain('sk-secret-1')
    expect(location.href).not.toContain('sk-secret-1')
  })

  it('is not sent again when the step-up is cancelled, and is not kept', async () => {
    const server = open({ [`PUT ${ITEM}/credential`]: STEP_UP })
    const docs = await card('Docs')
    const field = within(docs).getByLabelText('Token') as HTMLInputElement
    await userEvent.type(field, 'sk-secret-2')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    const dialog = await screen.findByRole('dialog', { name: 'This needs a fresh confirmation' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(await within(docs).findByRole('alert')).toHaveTextContent('Not confirmed.')
    expect(sent(server, 'PUT', `${ITEM}/credential`)).toHaveLength(1)
    expect(field.value).toBe('')
    expect(document.body.innerHTML).not.toContain('sk-secret-2')
  })

  it('keeps a mount saved while the token was being stored', async () => {
    let answer: (r: Response) => void = () => {}
    open({
      [`PUT ${ITEM}/credential`]: () => new Promise<Response>((done) => (answer = done)),
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: ['host-1'] })),
    })
    const docs = await card('Docs')
    await userEvent.type(within(docs).getByLabelText('Token'), 'sk-secret-3')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    const laptop = within(docs).getByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).toBeChecked())
    answer(NO_CONTENT())
    await waitFor(() => expect(within(docs).getByText('Set', { exact: true })).toBeInTheDocument())
    expect(laptop).toBeChecked()
  })

  it('asks password managers to leave the field alone, and never submits it natively', async () => {
    open({})
    const docs = await card('Docs')
    const field = within(docs).getByLabelText('Token')
    expect(field).toHaveAttribute('type', 'password')
    expect(field).toHaveAttribute('autocomplete', 'off')
    expect(field).toHaveAttribute('data-1p-ignore')
    expect(field).toHaveAttribute('data-lpignore', 'true')
    expect(field).toHaveAttribute('data-bwignore')
    expect(field).toHaveAttribute('data-form-type', 'other')
    expect(field.closest('form')).toHaveAttribute('method', 'post')
  })

  it('says where the token goes, and for which hat', async () => {
    open({})
    const docs = await card('Docs')
    await waitFor(() =>
      expect(within(docs).getByText((_, el) => el?.textContent === 'Sent only to https://mcp.example.com, for sessions in Personal.' && el.tagName === 'P')).toBeInTheDocument(),
    )
  })

  it('stops saying it was saved once a change deletes it', async () => {
    const server = open({
      [`PUT ${ITEM}/credential`]: NO_CONTENT,
      [`PATCH ${ITEM}`]: json(200, connection({ has_credential: false, static_header: 'Authorization' })),
    })
    const docs = await card('Docs')
    await userEvent.type(within(docs).getByLabelText('Token'), 'sk-secret-5')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    expect(await within(docs).findByRole('status')).toHaveTextContent('Token saved. It is never shown again.')
    await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
    const url = within(docs).getByRole('textbox', { name: 'Server URL' })
    await userEvent.clear(url)
    await userEvent.type(url, 'https://other.example/mcp')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save and delete the token' }))
    await waitFor(() => expect(within(docs).getByText('Not set yet', { exact: true })).toBeInTheDocument())
    expect(within(docs).queryByRole('status')).toBeNull()
    expect(sent(server, 'PATCH', ITEM)).toHaveLength(1)
  })

  it('ignores a second send while the first runs', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({ [`PUT ${ITEM}/credential`]: () => new Promise<Response>((done) => (answer = done)) })
    const docs = await card('Docs')
    await userEvent.type(within(docs).getByLabelText('Token'), 'sk-secret-4')
    const save = within(docs).getByRole('button', { name: 'Save token' })
    await userEvent.click(save)
    await waitFor(() => expect(save).toHaveAttribute('aria-disabled', 'true'))
    await userEvent.click(save)
    expect(within(docs).queryByRole('alert')).toBeNull()
    expect(sent(server, 'PUT', `${ITEM}/credential`)).toHaveLength(1)
    answer(NO_CONTENT())
    expect(await within(docs).findByRole('status')).toHaveTextContent('Token saved. It is never shown again.')
  })

  it('sends nothing for an empty field', async () => {
    const server = open({})
    const docs = await card('Docs')
    await userEvent.click(within(docs).getByRole('button', { name: 'Save token' }))
    expect(await within(docs).findByRole('alert')).toHaveTextContent('Type the token first.')
    expect(sent(server, 'PUT', `${ITEM}/credential`)).toHaveLength(0)
  })
})

describe('the mounts', () => {
  it('sends the whole set with no step-up, keeping a host this list does not show', async () => {
    const server = open({
      'GET /api/hosts': json(200, [host(), host({ host_id: 'host-2', name: 'build box' })]),
      'GET /api/mcp/connections': json(200, [connection({ mounts: ['host-9'] })]),
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: ['host-1', 'host-9'] })),
    })
    const docs = await card('Docs')
    const laptop = await within(docs).findByRole('checkbox', { name: 'laptop' })
    expect(laptop).not.toBeChecked()
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).toBeChecked())
    expect(sent(server, 'PUT', `${ITEM}/mounts`).map((s) => s.body)).toEqual([{ host_ids: ['host-1', 'host-9'] }])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(docs).getByRole('checkbox', { name: 'build box' })).not.toBeChecked()
  })

  it('ignores a tick while a set is being saved', async () => {
    let answer: (r: Response) => void = () => {}
    const server = open({
      'GET /api/hosts': json(200, [host(), host({ host_id: 'host-2', name: 'build box' })]),
      [`PUT ${ITEM}/mounts`]: () => new Promise<Response>((done) => (answer = done)),
    })
    const docs = await card('Docs')
    await userEvent.click(await within(docs).findByRole('checkbox', { name: 'laptop' }))
    await waitFor(() => expect(within(docs).getByRole('group', { name: 'Hosts whose sessions get it' })).toHaveAttribute('aria-busy', 'true'))
    await userEvent.click(within(docs).getByRole('checkbox', { name: 'build box' }))
    expect(sent(server, 'PUT', `${ITEM}/mounts`).map((s) => s.body)).toEqual([{ host_ids: ['host-1'] }])
    answer(json(200, connection({ mounts: ['host-1'] })))
    await waitFor(() => expect(within(docs).getByRole('checkbox', { name: 'laptop' })).toBeChecked())
    expect(within(docs).getByRole('checkbox', { name: 'build box' })).not.toBeChecked()
  })

  it('unticks a host', async () => {
    const server = open({
      'GET /api/mcp/connections': json(200, [connection({ mounts: ['host-1'] })]),
      [`PUT ${ITEM}/mounts`]: json(200, connection({ mounts: [] })),
    })
    const laptop = await within(await card('Docs')).findByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    await waitFor(() => expect(laptop).not.toBeChecked())
    expect(sent(server, 'PUT', `${ITEM}/mounts`).map((s) => s.body)).toEqual([{ host_ids: [] }])
  })

  it('shows a refusal and keeps the set as it was', async () => {
    open({ [`PUT ${ITEM}/mounts`]: json(400, { code: 'invalid', message: 'host-1 is revoked' }) })
    const docs = await card('Docs')
    const laptop = await within(docs).findByRole('checkbox', { name: 'laptop' })
    await userEvent.click(laptop)
    expect(await within(docs).findByRole('alert')).toHaveTextContent('host-1 is revoked')
    expect(laptop).not.toBeChecked()
  })

  it('cannot be changed while the hosts cannot be read', async () => {
    open({ 'GET /api/hosts': json(500, { code: 'internal', message: 'the hosts are away' }) })
    const docs = await card('Docs')
    expect(await screen.findByRole('alert')).toHaveTextContent('the hosts are away')
    expect(within(docs).getByRole('group', { name: 'Hosts whose sessions get it' })).toBeDisabled()
  })
})

it('warns about possible Codex own config when a host has no delivery report, including without connections', async () => {
  open({ 'GET /api/mcp/connections': json(200, []), 'GET /api/hosts': json(200, [host({ mcp_delivery: undefined })]) })
  expect(await screen.findByText('Codex may also load your own ~/.codex MCP servers.', { exact: true })).toBeInTheDocument()
})
it('does not add the missing-report warning for hosts with reported delivery', async () => {
  open({ 'GET /api/mcp/connections': json(200, []), 'GET /api/hosts': json(200, [host({ mcp_delivery: { codex: 'default_hat_only' } })]) })
  await screen.findByText('No connection yet.', { exact: true })
  expect(screen.queryByText('Codex may also load your own ~/.codex MCP servers.', { exact: true })).toBeNull()
})
```

**Replace:** `web/src/screens/NewSession.test.tsx` (this exact complete file once).

Before:

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
import { newSessionHref } from '../lib/start'
import { navigate } from '../router'
import { json, stubServer, type Answer } from '../test-server'
import { liveStream } from '../test-stream'
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
  return {
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
  render(
    <ClientContext.Provider value={client}>
      <NewSession />
    </ClientContext.Provider>,
  )
  return server
}

it('predicts delivery for the resolved hat and chosen agent', async () => {
  mount({ 'GET /api/hosts': json(200, [host('h1', 'laptop', {
    capabilities: ['projects', 'resolve_path', 'mcp_servers'],
    mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' },
  })]) })
  const field = await screen.findByRole('combobox', { name: /^Project/ })
  await userEvent.type(field, '/srv/work/cat')
  await waitFor(() => expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('Hennery keeps this agent'))
  await userEvent.click(screen.getByRole('button', { name: 'Codex' }))
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('not isolated per hat')
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('~/.codex')
})

const hostButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const projectField = () => screen.findByRole('combobox', { name: /^Project/ })
const startButton = () => screen.getByRole('button', { name: /Start session/ })
const posts = (sent: { method: string; path: string }[]) => sent.filter((s) => s.method === 'POST').map((s) => s.path)

/** Host laptop, Claude, `path` typed as a path, `prompt` typed. */
async function fill(path = '/srv/work/cat', prompt = '') {
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'Claude' })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
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
    await screen.findByRole('button', { name: /^laptop/ })
    const group = screen.getByRole('group', { name: /Host/ })
    const names = within(group)
      .getAllByRole('button')
      .map((b) => b.querySelector('.seg-name')?.textContent)
    expect(names).toEqual(['laptop', 'desk', 'server'])
    expect(hostButton('server')).toBeDisabled()
    expect(hostButton('server')).toHaveTextContent('offline')
    expect(hostButton('laptop')).toBeEnabled()
    expect(screen.queryByRole('button', { name: /retired/ })).toBeNull()
  })

  it('picks the first connected host', async () => {
    mount({ 'GET /api/hosts': json(200, [host('h2', 'server', { connected: false }), host('h4', 'desk')]) })
    await waitFor(() => expect(hostButton('desk')).toHaveAttribute('aria-pressed', 'true'))
  })

  it('prefills a link’s text that is not a path as a search: no path until a project is picked', async () => {
    const server = mount({}, '/new?host=h1&cwd=cat')
    await waitFor(() => expect(hostButton('laptop')).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
    expect(await projectField()).toHaveValue('cat')
    expect(startButton()).toBeDisabled()
    await new Promise((r) => setTimeout(r, RESOLVE_DEBOUNCE_MS + 50))
    expect(server.sent.some((s) => s.path === '/api/hats/resolve')).toBe(false)
  })

  it('prefills the host and the path from a link', async () => {
    mount({}, '/new?host=h4&cwd=%2Fsrv%2Fwork%2Fapp')
    await waitFor(() => expect(hostButton('desk')).toHaveAttribute('aria-pressed', 'true'))
    expect(await projectField()).toHaveValue('/srv/work/app')
  })

  it('prefills from the link a failed session offers, whatever its path holds', async () => {
    mount({}, newSessionHref('h4', '/srv/work/a b&c=d#e?f+g%h'))
    await waitFor(() => expect(hostButton('desk')).toHaveAttribute('aria-pressed', 'true'))
    expect(await projectField()).toHaveValue('/srv/work/a b&c=d#e?f+g%h')
  })

  it('says why a prefilled offline host is not chosen, and chooses none', async () => {
    mount({}, '/new?host=h2&cwd=%2Fsrv%2Fwork%2Fapp')
    expect(await screen.findByText(/server is offline, so the session cannot start there/)).toBeInTheDocument()
    expect(hostButton('laptop')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('combobox', { name: /^Project/ })).toBeNull()
  })
})

describe('agents', () => {
  it('offers the fallback agents and Other, and starts one named by hand', async () => {
    const server = mount()
    const user = await fill()
    expect(screen.getByRole('button', { name: 'Codex' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Other…' }))
    await user.type(screen.getByRole('textbox', { name: 'Agent name' }), 'my-agent')
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
    const codex = await screen.findByRole('button', { name: /^Codex/ })
    expect(codex).toBeDisabled()
    expect(codex).toHaveTextContent('Run the login on the host.')
    expect(screen.getByRole('button', { name: 'Claude' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /gemini/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Other…' })).toBeNull()
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '~/work/cat' })
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '/srv/work/atlas' })
  })
})

describe('hat preview', () => {
  it('resolves the hat only once the path has rested', async () => {
    const server = mount()
    const field = await projectField()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-9'))
    expect(location.search).toBe('?notice=start_unknown_draft')
    expect(sessionStorage.getItem('hennery.draft.s-9')).toBe('Fix the tests')
    expect(posts(server.sent).some((p) => p.endsWith('/prompt'))).toBe(false)
  })

  it('a start whose delivery is unknown, with no first prompt, says nothing of a draft', async () => {
    mount({ 'POST /api/sessions': json(503, { code: 'delivery_unknown', message: 'gone', session_id: 's-9' }) })
    const user = await fill('/srv/work/cat')
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-9'))
    expect(location.search).toBe('?notice=start_unknown')
    expect(sessionStorage.getItem('hennery.draft.s-9')).toBeNull()
  })

  it('a delivery unknown that names no session stays on the form', async () => {
    mount({ 'POST /api/sessions': json(503, { code: 'delivery_unknown', message: 'gone' }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await user.click(startButton())
    expect(await screen.findByText(/its outcome is not known/)).toBeInTheDocument()
    expect(location.pathname).toBe('/new')
  })

  it('a refused first prompt opens the session with a notice and keeps the prompt as its draft', async () => {
    mount({ 'POST /api/sessions/s-1/prompt': json(409, { code: 'host_offline', message: 'the host is not connected' }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
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
    await user.click(screen.getByRole('button', { name: 'Codex' }))
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    await screen.findByRole('group', { name: 'Browse directories' })
    await screen.findByText(/^Starts in the hat/, undefined, { timeout: 3000 })

    await user.click(hostButton('desk'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Codex' })).toHaveAttribute('aria-pressed', 'false')
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-new'))
    // The list has loaded, and its newest visible row did not take over.
    await screen.findByText('old')
    await new Promise((r) => setTimeout(r, 50))
    expect(location.pathname).toBe('/sessions/s-new')
    // @ts-expect-error jsdom has none; each test sets its own
    delete window.matchMedia
  })
})
```

After:

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
import { newSessionHref } from '../lib/start'
import { navigate } from '../router'
import { json, stubServer, type Answer } from '../test-server'
import { liveStream } from '../test-stream'
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
  return {
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
  render(
    <ClientContext.Provider value={client}>
      <NewSession />
    </ClientContext.Provider>,
  )
  return server
}

it('predicts delivery for the resolved hat and chosen agent', async () => {
  mount({ 'GET /api/hosts': json(200, [host('h1', 'laptop', {
    capabilities: ['projects', 'resolve_path', 'mcp_servers'],
    mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' },
  })]) })
  const field = await screen.findByRole('combobox', { name: /^Project/ })
  await userEvent.type(field, '/srv/work/cat')
  await waitFor(() => expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent("This agent was given only this hat's MCP servers."))
  await userEvent.click(screen.getByRole('button', { name: 'Codex' }))
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('not isolated per hat')
  expect(screen.getByRole('region', { name: 'MCP prediction' })).toHaveTextContent('~/.codex')
})

const hostButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const projectField = () => screen.findByRole('combobox', { name: /^Project/ })
const startButton = () => screen.getByRole('button', { name: /Start session/ })
const posts = (sent: { method: string; path: string }[]) => sent.filter((s) => s.method === 'POST').map((s) => s.path)

/** Host laptop, Claude, `path` typed as a path, `prompt` typed. */
async function fill(path = '/srv/work/cat', prompt = '') {
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'Claude' })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
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
    await screen.findByRole('button', { name: /^laptop/ })
    const group = screen.getByRole('group', { name: /Host/ })
    const names = within(group)
      .getAllByRole('button')
      .map((b) => b.querySelector('.seg-name')?.textContent)
    expect(names).toEqual(['laptop', 'desk', 'server'])
    expect(hostButton('server')).toBeDisabled()
    expect(hostButton('server')).toHaveTextContent('offline')
    expect(hostButton('laptop')).toBeEnabled()
    expect(screen.queryByRole('button', { name: /retired/ })).toBeNull()
  })

  it('picks the first connected host', async () => {
    mount({ 'GET /api/hosts': json(200, [host('h2', 'server', { connected: false }), host('h4', 'desk')]) })
    await waitFor(() => expect(hostButton('desk')).toHaveAttribute('aria-pressed', 'true'))
  })

  it('prefills a link’s text that is not a path as a search: no path until a project is picked', async () => {
    const server = mount({}, '/new?host=h1&cwd=cat')
    await waitFor(() => expect(hostButton('laptop')).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
    expect(await projectField()).toHaveValue('cat')
    expect(startButton()).toBeDisabled()
    await new Promise((r) => setTimeout(r, RESOLVE_DEBOUNCE_MS + 50))
    expect(server.sent.some((s) => s.path === '/api/hats/resolve')).toBe(false)
  })

  it('prefills the host and the path from a link', async () => {
    mount({}, '/new?host=h4&cwd=%2Fsrv%2Fwork%2Fapp')
    await waitFor(() => expect(hostButton('desk')).toHaveAttribute('aria-pressed', 'true'))
    expect(await projectField()).toHaveValue('/srv/work/app')
  })

  it('prefills from the link a failed session offers, whatever its path holds', async () => {
    mount({}, newSessionHref('h4', '/srv/work/a b&c=d#e?f+g%h'))
    await waitFor(() => expect(hostButton('desk')).toHaveAttribute('aria-pressed', 'true'))
    expect(await projectField()).toHaveValue('/srv/work/a b&c=d#e?f+g%h')
  })

  it('says why a prefilled offline host is not chosen, and chooses none', async () => {
    mount({}, '/new?host=h2&cwd=%2Fsrv%2Fwork%2Fapp')
    expect(await screen.findByText(/server is offline, so the session cannot start there/)).toBeInTheDocument()
    expect(hostButton('laptop')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('combobox', { name: /^Project/ })).toBeNull()
  })
})

describe('agents', () => {
  it('offers the fallback agents and Other, and starts one named by hand', async () => {
    const server = mount()
    const user = await fill()
    expect(screen.getByRole('button', { name: 'Codex' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Other…' }))
    await user.type(screen.getByRole('textbox', { name: 'Agent name' }), 'my-agent')
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
    const codex = await screen.findByRole('button', { name: /^Codex/ })
    expect(codex).toBeDisabled()
    expect(codex).toHaveTextContent('Run the login on the host.')
    expect(screen.getByRole('button', { name: 'Claude' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /gemini/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Other…' })).toBeNull()
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '~/work/cat' })
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-1'))
    expect(server.sent.find((s) => s.path === '/api/sessions')?.body).toMatchObject({ cwd: '/srv/work/atlas' })
  })
})

describe('hat preview', () => {
  it('resolves the hat only once the path has rested', async () => {
    const server = mount()
    const field = await projectField()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-9'))
    expect(location.search).toBe('?notice=start_unknown_draft')
    expect(sessionStorage.getItem('hennery.draft.s-9')).toBe('Fix the tests')
    expect(posts(server.sent).some((p) => p.endsWith('/prompt'))).toBe(false)
  })

  it('a start whose delivery is unknown, with no first prompt, says nothing of a draft', async () => {
    mount({ 'POST /api/sessions': json(503, { code: 'delivery_unknown', message: 'gone', session_id: 's-9' }) })
    const user = await fill('/srv/work/cat')
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-9'))
    expect(location.search).toBe('?notice=start_unknown')
    expect(sessionStorage.getItem('hennery.draft.s-9')).toBeNull()
  })

  it('a delivery unknown that names no session stays on the form', async () => {
    mount({ 'POST /api/sessions': json(503, { code: 'delivery_unknown', message: 'gone' }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
    await user.click(startButton())
    expect(await screen.findByText(/its outcome is not known/)).toBeInTheDocument()
    expect(location.pathname).toBe('/new')
  })

  it('a refused first prompt opens the session with a notice and keeps the prompt as its draft', async () => {
    mount({ 'POST /api/sessions/s-1/prompt': json(409, { code: 'host_offline', message: 'the host is not connected' }) })
    const user = await fill('/srv/work/cat', 'Fix the tests')
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
    await user.click(screen.getByRole('button', { name: 'Codex' }))
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    await screen.findByRole('group', { name: 'Browse directories' })
    await screen.findByText(/^Starts in the hat/, undefined, { timeout: 3000 })

    await user.click(hostButton('desk'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Codex' })).toHaveAttribute('aria-pressed', 'false')
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
    await user.click(startButton())
    await waitFor(() => expect(location.pathname).toBe('/sessions/s-new'))
    // The list has loaded, and its newest visible row did not take over.
    await screen.findByText('old')
    await new Promise((r) => setTimeout(r, 50))
    expect(location.pathname).toBe('/sessions/s-new')
    // @ts-expect-error jsdom has none; each test sets its own
    delete window.matchMedia
  })
})
```


- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/api/mcp-stdio.test.ts src/components/StdioServers.test.tsx src/components/StdioServers.missing.test.tsx src/components/StdioServerForm.test.tsx src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx src/lib/mcpDelivery.test.ts src/lib/stdio.test.ts src/screens/Mcp.test.tsx src/screens/NewSession.test.tsx`.

**Expected:** exit 1 against pre-amendment behavior. Commit `test(web): cover MCP delivery security review amendments` after observing red. The original amendment run had 21 failures; v2 replay before N1–N3 had 24 failures. The notes alone reproduced 3 failed / 8 passed before fixes (both missing-field cases and future Codex mode). Browser assertions strengthen already working behavior; the changed spec passed 8/8 before its test fixup. Its rendered-secret fault injection independently failed at both widths.

<!-- PHASE 6 FEAT ebc346878d5f59eef6c0e84991f9f45faf17c6bc -->

- [ ] Step 3: Apply the fixes.

**Replace:** `web/src/api/errors.ts` (this exact complete file once).

Before:

```typescript
// What a refused request becomes (client view spec §6): one error type that
// carries the server's code, and a plain message per known code.
import type { ApiError } from '../generated/protocol'

/** A plain message for each code the UI explains itself. Any other code
 *  shows the server's own message, as text. */
const MESSAGES: Record<string, string> = {
  hat_ambiguous: 'This path matches more than one hat: pick the path exactly as its rule names it.',
  cwd_moved: 'The session’s directory has moved since it last ran.',
  hat_mismatch: 'This directory now belongs to another hat than the session’s.',
  presumed_parked: 'Its host has been away and may still run it: close the session first.',
  images_unsupported: 'This agent takes no images.',
  host_offline: 'The host is offline.',
  host_installing: 'The host is still installing its agents.',
  already_set_up: 'hennery is set up already: sign in instead.',
  invalid_setup_token:
    'This setup link is used or expired. Run `hennery admin setup-url` on the collector for a new one.',
  origin_mismatch: 'The public URL must be the address this page is open at.',
  setup_required: 'hennery is not set up yet. Run `hennery admin setup-url` on the collector for the setup link.',
  invalid_password: 'Wrong password.',
  rate_limited: 'Too many attempts. Wait, then try again.',
  no_passkeys: 'No passkey is registered.',
  passkeys_unavailable: 'Passkeys need a public URL with a host name, not an IP address.',
  passkey_refused: 'The passkey was not accepted.',
  invalid_ceremony: 'The passkey prompt expired. Try again.',
  already_registered: 'This authenticator holds a passkey for hennery already.',
  step_up_required: 'Confirm it is you, then try again.',
  unauthenticated: 'Sign in first.',
  too_many_codes: 'Sixteen pairing codes are live already: wait for one to expire.',
  name_taken: 'Another hat has this name.',
  hat_purging: 'This hat is being purged.',
  hat_is_default:
    'This hat is the default for new hosts, or a host’s default hat: make another hat that default first.',
  resolve_unsupported: 'This host cannot resolve paths yet: update hennery on it.',
  no_answer: 'The host did not answer in time. Try again.',
  busy: 'The host is busy. Try again.',
  too_many_subscriptions: 'Remove a device before adding another: 32 at most.',
  endpoint_taken: 'This browser receives notifications for another account.',
  slug_taken: 'This slug is taken: pick another.',
  too_many_connections: 'There are 256 connections already: delete one first.',
  unsupported_cred_kind: 'This collector cannot sign in to a server this way yet.',
  wrong_cred_kind: 'Only a connection that authenticates with a token takes one.',
  env_value_missing: 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.',
  too_many_stdio_servers: 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.',
  host_revoked: 'This host is revoked.',
  mcp_isolation_unavailable: 'The host could not isolate this agent’s MCP servers. Try again.',
}

export class ApiFailure extends Error {
  readonly status: number
  readonly code: string
  /** The server's own message, shown as text when the code is unknown. */
  readonly serverMessage: string
  /** `Retry-After`, in seconds, on a 429. */
  readonly retryAfter?: number
  /** The session the refused request still left reachable (ACP core §9: a
   *  start's 503 `delivery_unknown` carries it). */
  readonly sessionId?: string

  constructor(status: number, body: Partial<ApiError> | undefined, retryAfter?: number) {
    const code = body?.code ?? `http_${status}`
    const serverMessage = body?.message ?? `The request failed (${status}).`
    // Own keys only: a code like `constructor` is the server's, not Object's.
    super(Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : serverMessage)
    this.name = 'ApiFailure'
    this.status = status
    this.code = code
    this.serverMessage = serverMessage
    this.retryAfter = retryAfter
    this.sessionId = body?.session_id
  }
}

/** A 401: the browser was sent to the login screen. */
export class Unauthenticated extends Error {
  constructor() {
    super('Sign in first.')
    this.name = 'Unauthenticated'
  }
}

/** The step-up dialog was dismissed: the refused request is not sent again. */
export class StepUpCancelled extends Error {
  constructor() {
    super('Not confirmed.')
    this.name = 'StepUpCancelled'
  }
}

/** The message to show for any error a request can end in. */
export function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

/** `Retry-After` as whole seconds: absent or not a number of seconds, 60. */
export function retryAfterSeconds(value: string | null): number {
  if (value !== null && /^\d+$/.test(value.trim())) return Number(value.trim())
  return 60
}
```

After:

```typescript
// What a refused request becomes (client view spec §6): one error type that
// carries the server's code, and a plain message per known code.
import type { ApiError } from '../generated/protocol'

/** A plain message for each code the UI explains itself. Any other code
 *  shows the server's own message, as text. */
const MESSAGES: Record<string, string> = {
  hat_ambiguous: 'This path matches more than one hat: pick the path exactly as its rule names it.',
  cwd_moved: 'The session’s directory has moved since it last ran.',
  hat_mismatch: 'This directory now belongs to another hat than the session’s.',
  presumed_parked: 'Its host has been away and may still run it: close the session first.',
  images_unsupported: 'This agent takes no images.',
  host_offline: 'The host is offline.',
  host_installing: 'The host is still installing its agents.',
  already_set_up: 'hennery is set up already: sign in instead.',
  invalid_setup_token:
    'This setup link is used or expired. Run `hennery admin setup-url` on the collector for a new one.',
  origin_mismatch: 'The public URL must be the address this page is open at.',
  setup_required: 'hennery is not set up yet. Run `hennery admin setup-url` on the collector for the setup link.',
  invalid_password: 'Wrong password.',
  rate_limited: 'Too many attempts. Wait, then try again.',
  no_passkeys: 'No passkey is registered.',
  passkeys_unavailable: 'Passkeys need a public URL with a host name, not an IP address.',
  passkey_refused: 'The passkey was not accepted.',
  invalid_ceremony: 'The passkey prompt expired. Try again.',
  already_registered: 'This authenticator holds a passkey for hennery already.',
  step_up_required: 'Confirm it is you, then try again.',
  unauthenticated: 'Sign in first.',
  too_many_codes: 'Sixteen pairing codes are live already: wait for one to expire.',
  name_taken: 'Another hat has this name.',
  hat_purging: 'This hat is being purged.',
  hat_is_default:
    'This hat is the default for new hosts, or a host’s default hat: make another hat that default first.',
  resolve_unsupported: 'This host cannot resolve paths yet: update hennery on it.',
  no_answer: 'The host did not answer in time. Try again.',
  busy: 'The host is busy. Try again.',
  too_many_subscriptions: 'Remove a device before adding another: 32 at most.',
  endpoint_taken: 'This browser receives notifications for another account.',
  slug_taken: 'This slug is taken: pick another.',
  too_many_connections: 'There are 256 connections already: delete one first.',
  unsupported_cred_kind: 'This collector cannot sign in to a server this way yet.',
  wrong_cred_kind: 'Only a connection that authenticates with a token takes one.',
  env_value_missing: 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.',
  too_many_stdio_servers: 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.',
  host_revoked: 'This host is revoked.',
  mcp_isolation_unavailable: 'The host could not isolate this agent’s MCP servers.',
}

export class ApiFailure extends Error {
  readonly status: number
  readonly code: string
  /** The server's own message, shown as text when the code is unknown. */
  readonly serverMessage: string
  /** `Retry-After`, in seconds, on a 429. */
  readonly retryAfter?: number
  /** The session the refused request still left reachable (ACP core §9: a
   *  start's 503 `delivery_unknown` carries it). */
  readonly sessionId?: string

  constructor(status: number, body: Partial<ApiError> | undefined, retryAfter?: number) {
    const code = body?.code ?? `http_${status}`
    const serverMessage = body?.message ?? `The request failed (${status}).`
    // Own keys only: a code like `constructor` is the server's, not Object's.
    super(Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : serverMessage)
    this.name = 'ApiFailure'
    this.status = status
    this.code = code
    this.serverMessage = serverMessage
    this.retryAfter = retryAfter
    this.sessionId = body?.session_id
  }
}

/** A 401: the browser was sent to the login screen. */
export class Unauthenticated extends Error {
  constructor() {
    super('Sign in first.')
    this.name = 'Unauthenticated'
  }
}

/** The step-up dialog was dismissed: the refused request is not sent again. */
export class StepUpCancelled extends Error {
  constructor() {
    super('Not confirmed.')
    this.name = 'StepUpCancelled'
  }
}

/** The message to show for any error a request can end in. */
export function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

/** `Retry-After` as whole seconds: absent or not a number of seconds, 60. */
export function retryAfterSeconds(value: string | null): number {
  if (value !== null && /^\d+$/.test(value.trim())) return Number(value.trim())
  return 60
}
```

**Replace:** `web/src/components/McpDelivery.tsx` (this exact complete file once).

Before:

```tsx
import type { McpSessionDelivery } from '../generated/protocol'
import { CODEX_MCP_NOTE, deliveryWords } from '../lib/mcpDelivery'

export default function McpDelivery({ agent, delivery }: { agent?: string; delivery?: McpSessionDelivery }) {
  return (
    <section className="mcp-delivery" aria-label="MCP delivery">
      <p>At the last start/resume: {deliveryWords(delivery?.mode)}</p>
      {delivery && <p>{delivery.servers} MCP servers.</p>}
      {agent === 'codex' && <p>{CODEX_MCP_NOTE}</p>}
    </section>
  )
}
```

After:

```tsx
import type { McpSessionDelivery } from '../generated/protocol'
import { ownConfigNote, deliveryWords } from '../lib/mcpDelivery'

export default function McpDelivery({ agent, delivery }: { agent?: string; delivery?: McpSessionDelivery }) {
  const mode = delivery?.mode
  const note = ownConfigNote(
    mode === 'isolated' || mode === 'unisolated' || mode === 'fallback' || mode === 'unsupported' ? mode : 'unknown', agent)
  return (
    <section className="mcp-delivery" aria-label="MCP delivery">
      <p>At the last start/resume: {deliveryWords(delivery?.mode)}</p>
      {delivery && <p>{delivery.servers} MCP servers.</p>}
      {note && <p>{note}</p>}
    </section>
  )
}
```

**Replace:** `web/src/components/McpPrediction.tsx` (this exact complete file once).

Before:

```tsx
import type { HostItem } from '../generated/protocol'
import { predictDelivery, predictionWords } from '../lib/mcpDelivery'
import { agentLabel } from '../lib/agent'
import { Text } from '../lib/text'

export default function McpPrediction({ host, agent, hatId }: { host?: HostItem; agent: string; hatId?: string }) {
  const mode = predictDelivery(host, agent, hatId)
  return (
    <section className="mcp-prediction" aria-label="MCP prediction">
      <p><Text>{agentLabel(agent)}</Text>: {predictionWords(mode)}</p>
      {agent === 'codex' && <p>Codex MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.</p>}
    </section>
  )
}
```

After:

```tsx
import type { HostItem } from '../generated/protocol'
import { ownConfigNote, predictDelivery, predictionWords } from '../lib/mcpDelivery'
import { agentLabel } from '../lib/agent'
import { Text } from '../lib/text'

export default function McpPrediction({ host, agent, hatId }: { host?: HostItem; agent: string; hatId?: string }) {
  const mode = predictDelivery(host, agent, hatId)
  const note = ownConfigNote(mode, agent)
  return (
    <section className="mcp-prediction" aria-label="MCP prediction">
      <p><Text>{agentLabel(agent)}</Text>: {predictionWords(mode)}</p>
      {note && <p>{note}</p>}
    </section>
  )
}
```

**Replace:** `web/src/components/StdioServerForm.tsx` (this exact complete file once).

Before:

```tsx
import type { McpStdioServerItem } from '../generated/protocol'
import { canKeepEnv, type StdioDraft } from '../lib/stdio'
import { Text } from '../lib/text'

interface Props {
  draft: StdioDraft
  original?: McpStdioServerItem
  locked: boolean
  allocate: () => number
  change: (next: StdioDraft) => void
  remove: () => void
  input: (id: number, node: HTMLTextAreaElement | null) => void
  clear: (env?: number) => void
}

export default function StdioServerForm({ draft: d, original, locked, allocate, change, remove, input, clear }: Props) {
  const identity = (name: string, command: string) => {
    clear()
    change({ ...d, name, command, env: d.env.map(e => ({ ...e, keep: e.keep && canKeepEnv(original, name, command, e.name), entered: false, empty: false })) })
  }
  const envChange = (id: number, patch: Partial<StdioDraft['env'][number]>) => change({ ...d, env: d.env.map(e => e.id === id ? { ...e, ...patch } : e) })
  return <fieldset className="stdio-server">
    <legend><Text>{d.name || 'New local server'}</Text></legend>
    <label>Server name<input value={d.name} readOnly={locked} onChange={e => { if (!locked) identity(e.target.value, d.command) }} /></label>
    <label>Command<input value={d.command} readOnly={locked} onChange={e => { if (!locked) identity(d.name, e.target.value) }} /></label>
    <p>Commands and arguments can be read back. Put secrets in environment values. A rename or command change requires re-entering values.</p>
    {d.args.map((arg, i) => <div className="stdio-row" key={i}>
      <label>Argument {i + 1}<textarea value={arg} readOnly={locked} onChange={e => { if (!locked) change({ ...d, args: d.args.map((a, at) => at === i ? e.target.value : a) }) }} /></label>
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: d.args.filter((_, at) => at !== i) }) }}>Remove argument {i + 1}</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: [...d.args, ''] }) }}>Add argument</button>
    {d.env.map(e => <div className="stdio-env" key={e.id}>
      <label>Environment name<input value={e.name} readOnly={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { name: event.target.value, keep: false, entered: false, empty: false }) } }} /></label>
      {canKeepEnv(original, d.name, d.command, e.name) && <label className="checkbox"><input type="checkbox" checked={e.keep} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { keep: event.target.checked, entered: false, empty: false }) } }} />Keep stored value for <Text>{e.name}</Text></label>}
      {e.keep ? <p>Stored value will be kept.</p> : <>
        <label>Value for <Text>{e.name}</Text><textarea ref={node => input(e.id, node)} readOnly={locked || e.empty} autoComplete="off" data-1p-ignore data-lpignore="true" onChange={event => { if (!locked) envChange(e.id, { entered: true, empty: event.target.value === '' }) }} /></label>
        <label className="checkbox"><input type="checkbox" checked={e.empty ?? false} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { entered: event.target.checked, empty: event.target.checked }) } }} />Use empty value for <Text>{e.name}</Text></label>
      </>}
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: d.env.filter(entry => entry.id !== e.id) }) }}>Remove environment variable</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: [...d.env, { id: allocate(), name: '', keep: false }] }) }}>Add environment variable</button>
    <button type="button" className="btn btn-danger" aria-disabled={locked} onClick={() => { if (!locked) remove() }}>Remove local server</button>
  </fieldset>
}
```

After:

```tsx
import type { McpStdioServerItem } from '../generated/protocol'
import { canKeepEnv, type StdioDraft } from '../lib/stdio'
import { Text } from '../lib/text'

interface Props {
  draft: StdioDraft
  original?: McpStdioServerItem
  locked: boolean
  allocate: () => number
  change: (next: StdioDraft) => void
  remove: () => void
  input: (id: number, node: HTMLTextAreaElement | null) => void
  clear: (env?: number) => void
}

export default function StdioServerForm({ draft: d, original, locked, allocate, change, remove, input, clear }: Props) {
  const identity = (name: string, command: string) => {
    clear()
    change({ ...d, name, command, env: d.env.map(e => ({ ...e, keep: e.keep && canKeepEnv(original, name, command, e.name), entered: false, empty: false })) })
  }
  const envChange = (id: number, patch: Partial<StdioDraft['env'][number]>) => change({ ...d, env: d.env.map(e => e.id === id ? { ...e, ...patch } : e) })
  return <fieldset className="stdio-server">
    <legend><Text>{d.name || 'New local server'}</Text></legend>
    <label>Server name<input value={d.name} readOnly={locked} onChange={e => { if (!locked) identity(e.target.value, d.command) }} /></label>
    <label>Command<input value={d.command} readOnly={locked} onChange={e => { if (!locked) identity(d.name, e.target.value) }} /></label>
    <p>Commands and arguments can be read back. Put secrets in environment values. Environment values cannot be read back from hennery. The host, the agent and the server process receive them. A rename or command change requires re-entering values.</p>
    {d.args.map((arg, i) => <div className="stdio-row" key={i}>
      <label>Argument {i + 1}<textarea value={arg} readOnly={locked} onChange={e => { if (!locked) change({ ...d, args: d.args.map((a, at) => at === i ? e.target.value : a) }) }} /></label>
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: d.args.filter((_, at) => at !== i) }) }}>Remove argument {i + 1}</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, args: [...d.args, ''] }) }}>Add argument</button>
    {d.env.map(e => <div className="stdio-env" key={e.id}>
      <label>Environment name<input value={e.name} readOnly={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { name: event.target.value, keep: false, entered: false, empty: false }) } }} /></label>
      {canKeepEnv(original, d.name, d.command, e.name) && <label className="checkbox"><input type="checkbox" checked={e.keep} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { keep: event.target.checked, entered: false, empty: false }) } }} />Keep stored value for <Text>{e.name}</Text></label>}
      {e.keep ? <p>Stored value will be kept.</p> : <>
        <label>Value for <Text>{e.name}</Text><textarea ref={node => input(e.id, node)} readOnly={locked || e.empty} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="off" data-1p-ignore data-lpignore="true" onChange={event => { if (!locked) envChange(e.id, { entered: event.target.value !== '' }) }} /></label>
        <label className="checkbox"><input type="checkbox" checked={e.empty ?? false} aria-disabled={locked} onChange={event => { if (!locked) { clear(e.id); envChange(e.id, { entered: event.target.checked, empty: event.target.checked }) } }} />Use empty value for <Text>{e.name}</Text></label>
      </>}
      <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: d.env.filter(entry => entry.id !== e.id) }) }}>Remove environment variable</button>
    </div>)}
    <button type="button" className="btn btn-ghost" aria-disabled={locked} onClick={() => { if (!locked) change({ ...d, env: [...d.env, { id: allocate(), name: '', keep: false }] }) }}>Add environment variable</button>
    <button type="button" className="btn btn-danger" aria-disabled={locked} onClick={() => { if (!locked) remove() }}>Remove local server</button>
  </fieldset>
}
```

**Replace:** `web/src/components/StdioServers.tsx` (this exact complete file once).

Before:

```tsx
// A full set belongs to one (host, hat). Values stay in uncontrolled fields
// until confirmed, are cleared before I/O, and are never read back.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { stdioServers, replaceStdioServers } from '../api/mcp'
import { useClient } from '../app-client'
import type { HatItem, HostItem, McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import { stdioRefusal, stdioRequest, type StdioDraft } from '../lib/stdio'
import { Text, visible } from '../lib/text'
import ConfirmDialog from './ConfirmDialog'
import StdioServerForm from './StdioServerForm'

interface Props { enabled: boolean; hosts: HostItem[] | null; hats: HatItem[] | null }
export default function StdioServers({ enabled, hosts, hats }: Props) {
  if (!enabled) return null
  if (!hosts || !hats) return <section aria-label="Local MCP servers"><p>Loading local server places…</p></section>
  return <Places hosts={hosts} hats={hats.filter(h => !h.purging)} />
}

function Places({ hosts, hats }: { hosts: HostItem[]; hats: HatItem[] }) {
  const [hostId, setHost] = useState((hosts.find(h => !h.revoked_at) ?? hosts[0])?.host_id ?? '')
  const chosen = hosts.find(h => h.host_id === hostId)
  const [hatId, setHat] = useState((hats.find(h => h.id === chosen?.default_hat_id) ?? hats[0])?.id ?? '')
  const host = hosts.find(h => h.host_id === hostId)
  const hat = hats.find(h => h.id === hatId)
  const blocked = useRef(false)
  const [busy, setBusy] = useState(false)
  const lock = (value: boolean) => { blocked.current = value; setBusy(value) }
  return <section aria-label="Local MCP servers" className="stdio-servers">
    <h2>Local MCP servers</h2>
    <p>The agent runs these commands on this host for this hat. Saving replaces the whole set, including removals, at the next start or resume. Offline hosts can be configured too.</p>
    <p>Changing the host or hat discards unsaved edits and newly entered values.</p>
    <label>Host<select value={hostId} aria-disabled={busy} onChange={event => {
      if (blocked.current) return
      const next = hosts.find(h => h.host_id === event.target.value)
      setHost(event.target.value)
      setHat((hats.find(h => h.id === next?.default_hat_id) ?? hats[0])?.id ?? '')
    }}><option value="">Choose a host</option>{hosts.map(h => <option key={h.host_id} value={h.host_id}>{visible(h.name)}</option>)}</select></label>
    <label>Hat<select value={hatId} aria-disabled={busy} onChange={event => { if (!blocked.current) setHat(event.target.value) }}><option value="">Choose a hat</option>{hats.map(h => <option key={h.id} value={h.id}>{visible(h.name)}</option>)}</select></label>
    {host && hat ? <SetEditor key={JSON.stringify([hostId, hatId])} host={host} hat={hat} lock={lock} /> : <p>Choose a host and hat.</p>}
  </section>
}

function SetEditor({ host, hat, lock }: { host: HostItem; hat: HatItem; lock: (busy: boolean) => void }) {
  const client = useClient()
  const [drafts, setDrafts] = useState<StdioDraft[] | null>(null)
  const originals = useRef(new Map<number, McpStdioServerItem>())
  const fields = useRef(new Map<string, HTMLTextAreaElement>())
  const counter = useRef(0)
  const allocate = () => ++counter.current
  const live = useRef(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const pending = useRef(false)
  const operation = useRef<Promise<void> | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const placeLock = useRef(lock); placeLock.current = lock
  const clear = () => { for (const field of fields.current.values()) field.value = '' }
  const discardValues = () => {
    clear()
    setDrafts(before => before?.map(d => ({ ...d, env: d.env.map(e => ({ ...e, entered: false, empty: false })) })) ?? null)
  }
  const apply = (answer: McpStdioServerSet) => {
    originals.current.clear()
    setDrafts(answer.servers.map(server => {
      const id = allocate()
      originals.current.set(id, server)
      return { id, name: server.name, command: server.command, args: server.args, env: server.env.map(e => ({ id: allocate(), name: e.name, keep: e.has_value })) }
    }))
  }
  useEffect(() => {
    live.current = true
    let reading = true
    void stdioServers(client, host.host_id, hat.id).then(answer => { if (reading) apply(answer) }, err => { if (reading) setError(stdioRefusal(err)) })
    return () => { reading = false; live.current = false; clear(); placeLock.current(false) }
    // The keyed editor fixes the namespace for its entire lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, host.host_id, hat.id])

  const review = (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || host.revoked_at || !drafts) return
    if (drafts.some(d => d.env.some(e => !e.keep && !e.entered))) { setError('Enter a value or explicitly choose empty for every environment variable.'); return }
    pending.current = true
    placeLock.current(true)
    setError(null)
    setConfirming(true)
  }
  const save = (): Promise<void> => {
    if (operation.current) return operation.current
    const body = stdioRequest(drafts ?? [], (server, env) => fields.current.get(`${server}:${env}`)?.value ?? '')
    discardValues()
    const work = replaceStdioServers(client, host.host_id, hat.id, body).then(answer => { if (live.current) apply(answer) }, err => { if (live.current) setError(stdioRefusal(err)) }).finally(() => { operation.current = null })
    operation.current = work
    return work
  }
  const close = () => {
    if (operation.current) return
    discardValues()
    pending.current = false
    placeLock.current(false)
    setConfirming(false)
  }
  return <>
    {host.revoked_at && <p>This host is revoked: its local MCP servers can be read, not changed.</p>}
    {error && <p role="alert" className="form-error"><Text>{error}</Text></p>}
    {drafts === null ? !error && <p>Reading local servers…</p> : <form aria-label="Local server set" method="post" onSubmit={review}>
      {drafts.map(d => <StdioServerForm key={d.id} draft={d} original={originals.current.get(d.id)} locked={confirming || !!host.revoked_at} allocate={allocate}
        change={next => setDrafts(before => before?.map(entry => entry.id === d.id ? next : entry) ?? null)}
        remove={() => setDrafts(before => before?.filter(entry => entry.id !== d.id) ?? null)}
        input={(env, node) => { const key = `${d.id}:${env}`; if (node) fields.current.set(key, node); else fields.current.delete(key) }}
        clear={env => { for (const [key, node] of fields.current) if (env === undefined ? key.startsWith(`${d.id}:`) : key === `${d.id}:${env}`) node.value = '' }} />)}
      {!host.revoked_at && <div className="stdio-actions">
        <button type="button" className="btn btn-ghost" aria-disabled={confirming} onClick={() => { if (!pending.current) setDrafts(before => [...(before ?? []), { id: allocate(), name: '', command: '', args: [], env: [] }]) }}>Add local server</button>
        <button ref={opener} type="submit" className="btn btn-primary" aria-disabled={confirming}>Review local servers</button>
      </div>}
    </form>}
    {confirming && <ConfirmDialog title="Save these local MCP servers?" confirm="Save local servers" action={save} onClose={close} returnFocus={() => opener.current}>
      <p>Replace every local server for <Text>{host.name}</Text> and <Text>{hat.name}</Text>, including removals. Newly entered environment values will be sent once confirmed, and then cleared from the form. Cancelling also clears them.</p>
      <p>This applies at the next start or resume.</p>
    </ConfirmDialog>}
  </>
}
```

After:

```tsx
// A full set belongs to one (host, hat). Values stay in uncontrolled fields
// until confirmed, are cleared before I/O, and are never read back.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { stdioServers, replaceStdioServers } from '../api/mcp'
import { useClient } from '../app-client'
import type { HatItem, HostItem, McpStdioServerItem, McpStdioServerSet } from '../generated/protocol'
import { stdioRefusal, stdioRequest, type StdioDraft } from '../lib/stdio'
import { Text, visible } from '../lib/text'
import ConfirmDialog from './ConfirmDialog'
import StdioServerForm from './StdioServerForm'

interface Props { enabled: boolean; hosts: HostItem[] | null; hats: HatItem[] | null }
export default function StdioServers({ enabled, hosts, hats }: Props) {
  if (!enabled) return null
  if (!hosts || !hats) return <section aria-label="Local MCP servers"><p>Loading local server places…</p></section>
  return <Places hosts={hosts} hats={hats.filter(h => !h.purging)} />
}

function Places({ hosts, hats }: { hosts: HostItem[]; hats: HatItem[] }) {
  const [hostId, setHost] = useState((hosts.find(h => !h.revoked_at) ?? hosts[0])?.host_id ?? '')
  const chosen = hosts.find(h => h.host_id === hostId)
  const [hatId, setHat] = useState((hats.find(h => h.id === chosen?.default_hat_id) ?? hats[0])?.id ?? '')
  const host = hosts.find(h => h.host_id === hostId)
  const hat = hats.find(h => h.id === hatId)
  const blocked = useRef(false)
  const [busy, setBusy] = useState(false)
  const lock = (value: boolean) => { blocked.current = value; setBusy(value) }
  return <section aria-label="Local MCP servers" className="stdio-servers">
    <h2>Local MCP servers</h2>
    <p>The agent runs these commands on this host for this hat. Saving replaces the whole set, including removals, at the next start or resume. Offline hosts can be configured too.</p>
    <p>Changing the host or hat discards unsaved edits and newly entered values.</p>
    <label>Host<select value={hostId} aria-disabled={busy} onChange={event => {
      if (blocked.current) return
      const next = hosts.find(h => h.host_id === event.target.value)
      setHost(event.target.value)
      setHat((hats.find(h => h.id === next?.default_hat_id) ?? hats[0])?.id ?? '')
    }}><option value="">Choose a host</option>{hosts.map(h => <option key={h.host_id} value={h.host_id}>{visible(h.name)}</option>)}</select></label>
    <label>Hat<select value={hatId} aria-disabled={busy} onChange={event => { if (!blocked.current) setHat(event.target.value) }}><option value="">Choose a hat</option>{hats.map(h => <option key={h.id} value={h.id}>{visible(h.name)}</option>)}</select></label>
    {host && hat ? <SetEditor key={JSON.stringify([hostId, hatId])} host={host} hat={hat} lock={lock} /> : <p>Choose a host and hat.</p>}
  </section>
}

function SetEditor({ host, hat, lock }: { host: HostItem; hat: HatItem; lock: (busy: boolean) => void }) {
  const client = useClient()
  const [drafts, setDrafts] = useState<StdioDraft[] | null>(null)
  const originals = useRef(new Map<number, McpStdioServerItem>())
  const fields = useRef(new Map<string, HTMLTextAreaElement>())
  const counter = useRef(0)
  const allocate = () => ++counter.current
  const live = useRef(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const pending = useRef(false)
  const operation = useRef<Promise<void> | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const placeLock = useRef(lock); placeLock.current = lock
  const clear = () => { for (const field of fields.current.values()) field.value = '' }
  const discardValues = () => {
    clear()
    setDrafts(before => before?.map(d => ({ ...d, env: d.env.map(e => ({ ...e, entered: false, empty: false })) })) ?? null)
  }
  const apply = (answer: McpStdioServerSet) => {
    originals.current.clear()
    setDrafts(answer.servers.map(server => {
      const id = allocate()
      originals.current.set(id, server)
      return { id, name: server.name, command: server.command, args: server.args, env: server.env.map(e => ({ id: allocate(), name: e.name, keep: e.has_value })) }
    }))
  }
  useEffect(() => {
    live.current = true
    let reading = true
    void stdioServers(client, host.host_id, hat.id).then(answer => { if (reading) apply(answer) }, err => { if (reading) setError(stdioRefusal(err)) })
    return () => { reading = false; live.current = false; clear(); placeLock.current(false) }
    // The keyed editor fixes the namespace for its entire lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, host.host_id, hat.id])

  const review = (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || host.revoked_at || !drafts) return
    if (drafts.some(d => d.env.some(e => !e.keep && !e.entered))) { setError('Enter a value or explicitly choose empty for every environment variable.'); return }
    pending.current = true
    placeLock.current(true)
    setError(null)
    setConfirming(true)
  }
  const save = async (): Promise<void> => {
    if (operation.current) return operation.current
    const body = stdioRequest(drafts ?? [], (server, env) => {
      const field = fields.current.get(`${server}:${env}`)
      if (!field) {
        discardValues()
        throw new Error('The environment value field is unavailable. Cancel and re-enter the values.')
      }
      return field.value
    })
    discardValues()
    const work = replaceStdioServers(client, host.host_id, hat.id, body).then(answer => { if (live.current) apply(answer) }, err => { if (live.current) setError(stdioRefusal(err)) }).finally(() => { operation.current = null })
    operation.current = work
    return work
  }
  const close = () => {
    if (operation.current) return
    discardValues()
    pending.current = false
    placeLock.current(false)
    setConfirming(false)
  }
  return <>
    {host.revoked_at && <p>This host is revoked: its local MCP servers can be read, not changed.</p>}
    {error && <p role="alert" className="form-error"><Text>{error}</Text></p>}
    {drafts === null ? !error && <p>Reading local servers…</p> : <form aria-label="Local server set" method="post" onSubmit={review}>
      {drafts.map(d => <StdioServerForm key={d.id} draft={d} original={originals.current.get(d.id)} locked={confirming || !!host.revoked_at} allocate={allocate}
        change={next => setDrafts(before => before?.map(entry => entry.id === d.id ? next : entry) ?? null)}
        remove={() => setDrafts(before => before?.filter(entry => entry.id !== d.id) ?? null)}
        input={(env, node) => { const key = `${d.id}:${env}`; if (node) fields.current.set(key, node); else fields.current.delete(key) }}
        clear={env => { for (const [key, node] of fields.current) if (env === undefined ? key.startsWith(`${d.id}:`) : key === `${d.id}:${env}`) node.value = '' }} />)}
      {!host.revoked_at && <div className="stdio-actions">
        <button type="button" className="btn btn-ghost" aria-disabled={confirming} onClick={() => { if (!pending.current) setDrafts(before => [...(before ?? []), { id: allocate(), name: '', command: '', args: [], env: [] }]) }}>Add local server</button>
        <button ref={opener} type="submit" className="btn btn-primary" aria-disabled={confirming}>Review local servers</button>
      </div>}
    </form>}
    {confirming && <ConfirmDialog title="Save these local MCP servers?" confirm="Save local servers" action={save} onClose={close} returnFocus={() => opener.current}>
      <p>Replace every local server for <Text>{host.name}</Text> and <Text>{hat.name}</Text>, including removals. Newly entered environment values will be sent once confirmed, and then cleared from the form. Cancelling also clears them.</p>
      <ul aria-label="Commands to run">
        {drafts?.map(d => <li key={d.id}>
          <Text>{d.name}</Text>
          <dl>
            <dt>Command</dt><dd><code><bdi>{visible(d.command)}</bdi></code></dd>
            {d.args.map((arg, i) => <div key={i}><dt>Argument {i + 1}</dt><dd><code><bdi>{visible(arg) || '""'}</bdi></code></dd></div>)}
          </dl>
        </li>)}
      </ul>
      <p>This applies at the next start or resume.</p>
    </ConfirmDialog>}
  </>
}
```

**Replace:** `web/src/lib/mcpDelivery.ts` (this exact complete file once).

Before:

```typescript
// Delivery is a last-start/resume decision, never a live health check.
import type { HostItem } from '../generated/protocol'

export type DeliveryMode = 'unknown' | 'isolated' | 'unisolated' | 'fallback' | 'unsupported'

export function deliveryWords(mode: unknown): string {
  switch (mode) {
    case 'isolated':
      return 'Hennery keeps this agent to the MCP servers of this hat.'
    case 'unisolated':
      return 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'
    case 'fallback':
      return 'No hennery MCP servers: this hat is not the host’s default for this agent.'
    case 'unsupported':
      return 'No hennery MCP servers: the host does not support their delivery.'
    default:
      return 'MCP delivery is unknown.'
  }
}

/** Unknown/missing reports never imply isolation. An accepted capability-
 *  negative hello is distinct from a host that has never reported. */
export function predictDelivery(host: HostItem | undefined, agent: string, hat: string | undefined): DeliveryMode {
  if (!host || !agent || !hat) return 'unknown'
  if (!host.capabilities.includes('mcp_servers')) {
    if (host.last_seen_at === undefined) return 'unknown'
    return 'unsupported'
  }
  const map = host.mcp_delivery
  if (!map || !Object.hasOwn(map, agent)) return 'unknown'
  if (map[agent] === 'isolated') return 'isolated'
  // An unknown future agent-delivery value is read as default_hat_only.
  if (hat === host.default_hat_id) return 'unisolated'
  return 'fallback'
}

export function predictionWords(mode: DeliveryMode): string {
  return 'Prediction from the host’s last report: ' + deliveryWords(mode)
}

export const CODEX_MCP_NOTE =
  'This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.'

/** Only a non-running → running transition invalidates delivery metadata. */
export function runningLifecycle(lifecycle: string | undefined): boolean {
  return lifecycle === 'starting' || lifecycle === 'active'
}

/** A resolution of another input must never name this draft's hat. */
export function predictionHat(resolved: { hostId: string; path: string; hat: string } | undefined, hostId: string, path: string): string | undefined {
  if (resolved?.hostId === hostId && resolved.path === path) return resolved.hat
  return undefined
}
```

After:

```typescript
// Delivery is a last-start/resume decision, never a live health check.
import type { HostItem } from '../generated/protocol'

export type DeliveryMode = 'unknown' | 'isolated' | 'unisolated' | 'fallback' | 'unsupported'

export function deliveryWords(mode: unknown): string {
  switch (mode) {
    case 'isolated':
      return "This agent was given only this hat's MCP servers."
    case 'unisolated':
      return 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'
    case 'fallback':
      return 'No hennery MCP servers: this hat is not the host’s default for this agent.'
    case 'unsupported':
      return 'No hennery MCP servers: the host does not support their delivery.'
    default:
      return 'MCP delivery is unknown.'
  }
}

/** Unknown/missing reports never imply isolation. An accepted capability-
 *  negative hello is distinct from a host that has never reported. */
export function predictDelivery(host: HostItem | undefined, agent: string, hat: string | undefined): DeliveryMode {
  if (!host || !agent || !hat) return 'unknown'
  if (!host.capabilities.includes('mcp_servers')) {
    if (host.last_seen_at === undefined) return 'unknown'
    return 'unsupported'
  }
  const map = host.mcp_delivery
  if (!map || !Object.hasOwn(map, agent)) return 'unknown'
  if (map[agent] === 'isolated') return 'isolated'
  // An unknown future agent-delivery value is read as default_hat_only.
  if (hat === host.default_hat_id) return 'unisolated'
  return 'fallback'
}

export function predictionWords(mode: DeliveryMode): string {
  return 'Prediction from the host’s last report: ' + deliveryWords(mode)
}

export const CODEX_MCP_NOTE =
  'This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.'

/** The caveat follows the recorded/predicted mode; unknown is conditional. */
export function ownConfigNote(mode: DeliveryMode, agent?: string): string | undefined {
  if (mode === 'unisolated') return agent === 'codex' ? CODEX_MCP_NOTE : 'The agent also loads your own MCP configuration.'
  if (mode === 'unknown' && agent === 'codex') return 'Codex may also load your own ~/.codex MCP servers.'
  return undefined
}

/** Only a non-running → running transition invalidates delivery metadata. */
export function runningLifecycle(lifecycle: string | undefined): boolean {
  return lifecycle === 'starting' || lifecycle === 'active'
}

/** A resolution of another input must never name this draft's hat. */
export function predictionHat(resolved: { hostId: string; path: string; hat: string } | undefined, hostId: string, path: string): string | undefined {
  if (resolved?.hostId === hostId && resolved.path === path) return resolved.hat
  return undefined
}
```

**Replace:** `web/src/lib/stdio.ts` (this exact complete file once).

Before:

```typescript
import { ApiFailure, messageOf } from '../api/errors'
import type { McpStdioServerItem, McpStdioServersRequest } from '../generated/protocol'

// Only whether a value was supplied is state; the value lives in the DOM.
export interface StdioEnvDraft { id: number; name: string; keep: boolean; entered?: boolean; empty?: boolean }
export interface StdioDraft { id: number; name: string; command: string; args: string[]; env: StdioEnvDraft[] }

/** Keep is scoped to the server's original identity and command. */
export function canKeepEnv(before: McpStdioServerItem | undefined, name: string, command: string, env: string): boolean {
  return before !== undefined && before.name === name && before.command === command &&
    before.env.some((entry) => entry.name === env && entry.has_value)
}

/** Values are read once from uncontrolled DOM fields, not React state.
 *  The caller clears them before retaining this request for step-up/retry. */
export function stdioRequest(drafts: StdioDraft[], read: (server: number, env: number) => string): McpStdioServersRequest {
  return {
    servers: drafts.map((server) => ({
      name: server.name, command: server.command, args: server.args,
      env: server.env.map((entry) => entry.keep ? { name: entry.name } : { name: entry.name, value: read(server.id, entry.id) }),
    })),
  }
}

export function stdioRefusal(err: unknown): string {
  if (err instanceof ApiFailure && err.code === 'not_found') return 'This host or hat no longer exists.'
  if (err instanceof ApiFailure && err.code === 'host_revoked') return 'This host is revoked: its local MCP servers can be read, not changed.'
  return messageOf(err)
}
```

After:

```typescript
import { ApiFailure, messageOf } from '../api/errors'
import type { McpStdioServerItem, McpStdioServersRequest } from '../generated/protocol'

// Only whether a value was supplied is state; the value lives in the DOM.
export interface StdioEnvDraft { id: number; name: string; keep: boolean; entered?: boolean; empty?: boolean }
export interface StdioDraft { id: number; name: string; command: string; args: string[]; env: StdioEnvDraft[] }

/** Keep is scoped to the server's original identity and command. */
export function canKeepEnv(before: McpStdioServerItem | undefined, name: string, command: string, env: string): boolean {
  return before !== undefined && before.name === name && before.command === command &&
    before.env.some((entry) => entry.name === env && entry.has_value)
}

/** Values are read once from uncontrolled DOM fields, not React state.
 *  The caller clears them before retaining this request for step-up/retry. */
export function stdioRequest(drafts: StdioDraft[], read: (server: number, env: number) => string): McpStdioServersRequest {
  return {
    servers: drafts.map((server) => ({
      name: server.name, command: server.command, args: server.args,
      env: server.env.map((entry) => entry.keep ? { name: entry.name } : { name: entry.name, value: read(server.id, entry.id) }),
    })),
  }
}

export function stdioRefusal(err: unknown): string {
  if (err instanceof ApiFailure && err.code === 'not_found') return 'This host or hat no longer exists.'
  if (err instanceof ApiFailure && err.code === 'host_revoked') return 'This host is revoked: its local MCP servers can be read, not changed.'
  if (err instanceof ApiFailure && err.code === 'slug_taken') return 'A connection already uses this name.'
  return messageOf(err)
}
```

**Replace:** `web/src/screens/Mcp.tsx` (this exact complete file once).

Before:

```tsx
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import type { HatItem, HostItem, McpConnectionItem, UpdateMcpConnectionRequest } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import {
  NEW_FORM,
  capped,
  changeOf,
  createRequest,
  dropsToken,
  formOf,
  kindLabel,
  serverName,
  statusLabel,
  type ConnectionForm as Form,
} from '../lib/mcp'
import { Text } from '../lib/text'
import '../manage.css'

type Pending =
  | { kind: 'delete'; connection: McpConnectionItem }
  | { kind: 'drop_token'; connection: McpConnectionItem; change: UpdateMcpConnectionRequest }

const titleId = (id: string) => `mcp-${id}`

/** The hat a new connection starts in: the default for new hosts, else the
 *  first one not being purged. */
function firstHat(hats: HatItem[]): string {
  const open = hats.filter((h) => !h.purging)
  return (open.find((h) => h.default_for_new_hosts) ?? open[0])?.id ?? ''
}

export default function Mcp({ stdio = false }: { stdio?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const [adding, setAdding] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  // The connection being edited, as it was when its form opened: the form
  // starts from it, and a change is what the form changed of it, so an
  // answer folded in meanwhile (a mount) cannot make a stale field look
  // changed.
  const [editing, setEditing] = useState<McpConnectionItem | null>(null)
  // Refs, not state: two presses in one frame both see the first.
  const creating = useRef(false)
  const updating = useRef(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  // The element to focus once the list has re-rendered, by id.
  const [focus, setFocus] = useState<string | null>(null)

  useEffect(() => {
    if (focus === null) return
    document.getElementById(focus)?.focus()
    setFocus(null)
  }, [focus, list.data, editing, adding])

  // As functions of the list held, so two answers landing together both
  // stay.
  const replace = (item: McpConnectionItem) =>
    list.set((prev) => (prev ?? []).map((c) => (c.id === item.id ? item : c)))

  const create = async (form: Form, slug: string, hatId: string) => {
    if (creating.current) return
    creating.current = true
    setAddBusy(true)
    setAddError(null)
    try {
      const item = await createConnection(client, createRequest(form, slug, hatId))
      list.set((prev) => [...(prev ?? []), item])
      setAdding(false)
      setFocus(titleId(item.id))
    } catch (err) {
      setAddError(messageOf(err))
    } finally {
      creating.current = false
      setAddBusy(false)
    }
  }

  const update = async (connection: McpConnectionItem, change: UpdateMcpConnectionRequest) => {
    if (updating.current) return
    updating.current = true
    setEditBusy(true)
    setEditError(null)
    try {
      replace(await updateConnection(client, connection.id, change))
      setEditing(null)
      setFocus(`${titleId(connection.id)}-edit`)
    } catch (err) {
      setEditError(messageOf(err))
    } finally {
      updating.current = false
      setEditBusy(false)
    }
  }

  const save = (connection: McpConnectionItem, base: McpConnectionItem, form: Form) => {
    const change = changeOf(base, form)
    if (Object.keys(change).length === 0) {
      setEditing(null)
      setFocus(`${titleId(connection.id)}-edit`)
      return
    }
    // The server deletes the token with another kind or origin: say so
    // first, when there is one to lose.
    if (connection.has_credential && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
    else void update(connection, change)
  }

  // The 204 is the server saying the token is stored (gateway spec §9): only
  // `has_credential` changes, and nothing else is read back, so a mount
  // saved meanwhile is never undone by an older copy of the list.
  const tokenSaved = (id: string) =>
    list.set((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, has_credential: true } : c)))

  const hatName = (id: string) => hats.data?.find((h) => h.id === id)?.name

  return (
    <div className="manage">
      <header className="manage-head">
        <h1 id="mcp-heading" tabIndex={-1}>
          MCP
        </h1>
        <button
          type="button"
          id="mcp-add"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setAddError(null)
            setAdding(true)
          }}
          disabled={adding || hats.data === null}
        >
          Add connection
        </button>
      </header>
      <section className="card notice" aria-label="How sessions get these">
        <p>
          A connection reaches the agent sessions in its hat on the hosts ticked below, as an MCP server named{' '}
          <code>hennery-&lt;slug&gt;</code>. Changes apply to new and resumed sessions.
        </p>
      </section>
      <StdioServers enabled={stdio} hosts={hosts.data} hats={hats.data} />
      {[list.error, hats.error, hosts.error].map(
        (shown, i) =>
          shown && (
            <p key={i} className="form-error" role="alert">
              <Text>{shown}</Text>
            </p>
          ),
      )}
      {adding && hats.data && (
        <section className="card" aria-label="Add a connection">
          <h2 className="card-title">Add a connection</h2>
          <ConnectionForm
            initial={NEW_FORM}
            create={{ hats: hats.data.filter((h) => !h.purging), hatId: firstHat(hats.data) }}
            submit="Create"
            busy={addBusy}
            error={addError}
            onSubmit={create}
            onCancel={() => {
              setAdding(false)
              setFocus('mcp-add')
            }}
          />
        </section>
      )}
      {list.data && list.data.length === 0 && !adding && <p className="empty">No connection yet.</p>}
      <ul className="cards" aria-label="Connections">
        {(list.data ?? []).map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            hatName={hatName(connection.hat_id)}
            hosts={hosts.data}
            editing={editing?.id === connection.id ? editing : null}
            editBusy={editing?.id === connection.id && editBusy}
            locked={editing?.id !== connection.id && editBusy}
            editError={editing?.id === connection.id ? editError : null}
            onEdit={() => {
              // A pending save still owns this form, its error and its focus.
              if (updating.current) return
              setEditError(null)
              setEditing(connection)
            }}
            onSave={(form, base) => save(connection, base, form)}
            onCancelEdit={() => {
              setEditing(null)
              setFocus(`${titleId(connection.id)}-edit`)
            }}
            onDelete={() => setPending({ kind: 'delete', connection })}
            onChanged={replace}
            onTokenSaved={() => tokenSaved(connection.id)}
          />
        ))}
      </ul>
      {pending?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this connection?"
          confirm="Delete"
          danger
          action={async () => {
            await deleteConnection(client, pending.connection.id)
            list.set((prev) => (prev ?? []).filter((c) => c.id !== pending.connection.id))
          }}
          onClose={() => setPending(null)}
          returnFocus={() => document.getElementById('mcp-heading')}
        >
          <p>
            <Text>{pending.connection.label}</Text> goes, with its token and its mounts. Sessions using{' '}
            <code>
              <Text>{serverName(pending.connection.slug)}</Text>
            </code>{' '}
            are refused from now on. A new connection needs its token set again.
          </p>
        </ConfirmDialog>
      )}
      {pending?.kind === 'drop_token' && (
        <ConfirmDialog
          title="Delete the stored token?"
          confirm="Save and delete the token"
          danger
          action={async () => {
            replace(await updateConnection(client, pending.connection.id, pending.change))
            setEditing(null)
          }}
          onClose={() => setPending(null)}
          returnFocus={() => document.getElementById(`${titleId(pending.connection.id)}-edit`)}
        >
          <p>
            Another server address or another kind of sign-in deletes the token stored for{' '}
            <Text>{pending.connection.label}</Text>. Set one again afterwards.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}

interface CardProps {
  connection: McpConnectionItem
  hatName?: string
  hosts: HostItem[] | null
  /** The connection as its form opened, while it is edited. */
  editing: McpConnectionItem | null
  editBusy: boolean
  locked: boolean
  editError: string | null
  onEdit: () => void
  onSave: (form: Form, base: McpConnectionItem) => void
  onCancelEdit: () => void
  onDelete: () => void
  onChanged: (connection: McpConnectionItem) => void
  onTokenSaved: () => void
}

function ConnectionCard(props: CardProps) {
  const { connection: c, hatName, hosts, editing } = props
  const id = titleId(c.id)
  const tools =
    c.tool_allowlist === null ? 'Every tool' : c.tool_allowlist.length === 0 ? 'None' : c.tool_allowlist.join(', ')
  return (
    <li className="card connection" aria-labelledby={id}>
      <div className="card-head">
        <h2 className="card-title" id={id} tabIndex={-1}>
          <Text>{c.label}</Text>
        </h2>
        <span className={`state mcp-${c.status}`}>{statusLabel(c.status)}</span>
      </div>
      {c.status_note && (
        <p className="hint">
          <Text>{capped(c.status_note)}</Text>
        </p>
      )}
      {c.status === 'needs_auth' && c.cred_kind === 'static' && (
        <p className="hint">The server refused the token: set a new one below.</p>
      )}
      {c.status === 'needs_auth' && c.cred_kind === 'none' && (
        <p className="hint">The server asks for credentials: edit the connection to send a token.</p>
      )}
      <dl className="facts">
        <dt>Agents see</dt>
        <dd>
          <Text className="mono">{serverName(c.slug)}</Text>
        </dd>
        <dt>Server URL</dt>
        <dd>
          <Text className="mono">{c.url}</Text>
        </dd>
        <dt>Hat</dt>
        <dd>{hatName !== undefined ? <Text>{hatName}</Text> : <Text className="mono">{c.hat_id}</Text>}</dd>
        <dt>Authentication</dt>
        <dd>
          {c.cred_kind === 'static' ? (
            <>
              Token in <Text className="mono">{c.static_header}</Text>
              {c.static_prefix !== '' && (
                <>
                  {' '}
                  after <Text className="mono">{JSON.stringify(c.static_prefix)}</Text>
                </>
              )}
            </>
          ) : (
            kindLabel(c.cred_kind)
          )}
        </dd>
        {c.cred_kind === 'static' && (
          <>
            <dt>Token</dt>
            <dd>{c.has_credential ? 'Set' : 'Not set yet'}</dd>
          </>
        )}
        {c.account_label && (
          <>
            <dt>Signed in as</dt>
            <dd>
              <Text>{capped(c.account_label)}</Text>
            </dd>
          </>
        )}
        <dt>Tools</dt>
        <dd>
          <Text>{tools}</Text>
        </dd>
        {c.internal_network && (
          <>
            <dt>Network</dt>
            <dd>Internal network allowed</dd>
          </>
        )}
      </dl>
      {editing ? (
        <ConnectionForm
          initial={formOf(editing)}
          submit="Save"
          busy={props.editBusy}
          error={props.editError}
          onSubmit={(form) => props.onSave(form, editing)}
          onCancel={props.onCancelEdit}
        />
      ) : (
        <div className="card-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            id={`${id}-edit`}
            onClick={props.onEdit}
            aria-disabled={props.locked}
          >
            Edit
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-danger btn-sm" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      )}
      {c.cred_kind === 'static' && <TokenForm connection={c} hatName={hatName} onSaved={props.onTokenSaved} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```

After:

```tsx
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import type { HatItem, HostItem, McpConnectionItem, UpdateMcpConnectionRequest } from '../generated/protocol'
import { useResource } from '../hooks/useResource'
import {
  NEW_FORM,
  capped,
  changeOf,
  createRequest,
  dropsToken,
  formOf,
  kindLabel,
  serverName,
  statusLabel,
  type ConnectionForm as Form,
} from '../lib/mcp'
import { Text } from '../lib/text'
import '../manage.css'

type Pending =
  | { kind: 'delete'; connection: McpConnectionItem }
  | { kind: 'drop_token'; connection: McpConnectionItem; change: UpdateMcpConnectionRequest }

const titleId = (id: string) => `mcp-${id}`

/** The hat a new connection starts in: the default for new hosts, else the
 *  first one not being purged. */
function firstHat(hats: HatItem[]): string {
  const open = hats.filter((h) => !h.purging)
  return (open.find((h) => h.default_for_new_hosts) ?? open[0])?.id ?? ''
}

export default function Mcp({ stdio = false }: { stdio?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const [adding, setAdding] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  // The connection being edited, as it was when its form opened: the form
  // starts from it, and a change is what the form changed of it, so an
  // answer folded in meanwhile (a mount) cannot make a stale field look
  // changed.
  const [editing, setEditing] = useState<McpConnectionItem | null>(null)
  // Refs, not state: two presses in one frame both see the first.
  const creating = useRef(false)
  const updating = useRef(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  // The element to focus once the list has re-rendered, by id.
  const [focus, setFocus] = useState<string | null>(null)

  useEffect(() => {
    if (focus === null) return
    document.getElementById(focus)?.focus()
    setFocus(null)
  }, [focus, list.data, editing, adding])

  // As functions of the list held, so two answers landing together both
  // stay.
  const replace = (item: McpConnectionItem) =>
    list.set((prev) => (prev ?? []).map((c) => (c.id === item.id ? item : c)))

  const create = async (form: Form, slug: string, hatId: string) => {
    if (creating.current) return
    creating.current = true
    setAddBusy(true)
    setAddError(null)
    try {
      const item = await createConnection(client, createRequest(form, slug, hatId))
      list.set((prev) => [...(prev ?? []), item])
      setAdding(false)
      setFocus(titleId(item.id))
    } catch (err) {
      setAddError(messageOf(err))
    } finally {
      creating.current = false
      setAddBusy(false)
    }
  }

  const update = async (connection: McpConnectionItem, change: UpdateMcpConnectionRequest) => {
    if (updating.current) return
    updating.current = true
    setEditBusy(true)
    setEditError(null)
    try {
      replace(await updateConnection(client, connection.id, change))
      setEditing(null)
      setFocus(`${titleId(connection.id)}-edit`)
    } catch (err) {
      setEditError(messageOf(err))
    } finally {
      updating.current = false
      setEditBusy(false)
    }
  }

  const save = (connection: McpConnectionItem, base: McpConnectionItem, form: Form) => {
    const change = changeOf(base, form)
    if (Object.keys(change).length === 0) {
      setEditing(null)
      setFocus(`${titleId(connection.id)}-edit`)
      return
    }
    // The server deletes the token with another kind or origin: say so
    // first, when there is one to lose.
    if (connection.has_credential && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
    else void update(connection, change)
  }

  // The 204 is the server saying the token is stored (gateway spec §9): only
  // `has_credential` changes, and nothing else is read back, so a mount
  // saved meanwhile is never undone by an older copy of the list.
  const tokenSaved = (id: string) =>
    list.set((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, has_credential: true } : c)))

  const hatName = (id: string) => hats.data?.find((h) => h.id === id)?.name

  return (
    <div className="manage">
      <header className="manage-head">
        <h1 id="mcp-heading" tabIndex={-1}>
          MCP
        </h1>
        <button
          type="button"
          id="mcp-add"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setAddError(null)
            setAdding(true)
          }}
          disabled={adding || hats.data === null}
        >
          Add connection
        </button>
      </header>
      <section className="card notice" aria-label="How sessions get these">
        <p>
          A connection reaches the agent sessions in its hat on the hosts ticked below, as an MCP server named{' '}
          <code>hennery-&lt;slug&gt;</code>. Changes apply to new and resumed sessions.
        </p>
        {hosts.data?.some(h => !h.mcp_delivery) && <p>Codex may also load your own ~/.codex MCP servers.</p>}
      </section>
      <StdioServers enabled={stdio} hosts={hosts.data} hats={hats.data} />
      {[list.error, hats.error, hosts.error].map(
        (shown, i) =>
          shown && (
            <p key={i} className="form-error" role="alert">
              <Text>{shown}</Text>
            </p>
          ),
      )}
      {adding && hats.data && (
        <section className="card" aria-label="Add a connection">
          <h2 className="card-title">Add a connection</h2>
          <ConnectionForm
            initial={NEW_FORM}
            create={{ hats: hats.data.filter((h) => !h.purging), hatId: firstHat(hats.data) }}
            submit="Create"
            busy={addBusy}
            error={addError}
            onSubmit={create}
            onCancel={() => {
              setAdding(false)
              setFocus('mcp-add')
            }}
          />
        </section>
      )}
      {list.data && list.data.length === 0 && !adding && <p className="empty">No connection yet.</p>}
      <ul className="cards" aria-label="Connections">
        {(list.data ?? []).map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            hatName={hatName(connection.hat_id)}
            hosts={hosts.data}
            editing={editing?.id === connection.id ? editing : null}
            editBusy={editing?.id === connection.id && editBusy}
            locked={editing?.id !== connection.id && editBusy}
            editError={editing?.id === connection.id ? editError : null}
            onEdit={() => {
              // A pending save still owns this form, its error and its focus.
              if (updating.current) return
              setEditError(null)
              setEditing(connection)
            }}
            onSave={(form, base) => save(connection, base, form)}
            onCancelEdit={() => {
              setEditing(null)
              setFocus(`${titleId(connection.id)}-edit`)
            }}
            onDelete={() => setPending({ kind: 'delete', connection })}
            onChanged={replace}
            onTokenSaved={() => tokenSaved(connection.id)}
          />
        ))}
      </ul>
      {pending?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this connection?"
          confirm="Delete"
          danger
          action={async () => {
            await deleteConnection(client, pending.connection.id)
            list.set((prev) => (prev ?? []).filter((c) => c.id !== pending.connection.id))
          }}
          onClose={() => setPending(null)}
          returnFocus={() => document.getElementById('mcp-heading')}
        >
          <p>
            <Text>{pending.connection.label}</Text> goes, with its token and its mounts. Sessions using{' '}
            <code>
              <Text>{serverName(pending.connection.slug)}</Text>
            </code>{' '}
            are refused from now on. A new connection needs its token set again.
          </p>
        </ConfirmDialog>
      )}
      {pending?.kind === 'drop_token' && (
        <ConfirmDialog
          title="Delete the stored token?"
          confirm="Save and delete the token"
          danger
          action={async () => {
            replace(await updateConnection(client, pending.connection.id, pending.change))
            setEditing(null)
          }}
          onClose={() => setPending(null)}
          returnFocus={() => document.getElementById(`${titleId(pending.connection.id)}-edit`)}
        >
          <p>
            Another server address or another kind of sign-in deletes the token stored for{' '}
            <Text>{pending.connection.label}</Text>. Set one again afterwards.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}

interface CardProps {
  connection: McpConnectionItem
  hatName?: string
  hosts: HostItem[] | null
  /** The connection as its form opened, while it is edited. */
  editing: McpConnectionItem | null
  editBusy: boolean
  locked: boolean
  editError: string | null
  onEdit: () => void
  onSave: (form: Form, base: McpConnectionItem) => void
  onCancelEdit: () => void
  onDelete: () => void
  onChanged: (connection: McpConnectionItem) => void
  onTokenSaved: () => void
}

function ConnectionCard(props: CardProps) {
  const { connection: c, hatName, hosts, editing } = props
  const id = titleId(c.id)
  const tools =
    c.tool_allowlist === null ? 'Every tool' : c.tool_allowlist.length === 0 ? 'None' : c.tool_allowlist.join(', ')
  return (
    <li className="card connection" aria-labelledby={id}>
      <div className="card-head">
        <h2 className="card-title" id={id} tabIndex={-1}>
          <Text>{c.label}</Text>
        </h2>
        <span className={`state mcp-${c.status}`}>{statusLabel(c.status)}</span>
      </div>
      {c.status_note && (
        <p className="hint">
          <Text>{capped(c.status_note)}</Text>
        </p>
      )}
      {c.status === 'needs_auth' && c.cred_kind === 'static' && (
        <p className="hint">The server refused the token: set a new one below.</p>
      )}
      {c.status === 'needs_auth' && c.cred_kind === 'none' && (
        <p className="hint">The server asks for credentials: edit the connection to send a token.</p>
      )}
      <dl className="facts">
        <dt>Agents see</dt>
        <dd>
          <Text className="mono">{serverName(c.slug)}</Text>
        </dd>
        <dt>Server URL</dt>
        <dd>
          <Text className="mono">{c.url}</Text>
        </dd>
        <dt>Hat</dt>
        <dd>{hatName !== undefined ? <Text>{hatName}</Text> : <Text className="mono">{c.hat_id}</Text>}</dd>
        <dt>Authentication</dt>
        <dd>
          {c.cred_kind === 'static' ? (
            <>
              Token in <Text className="mono">{c.static_header}</Text>
              {c.static_prefix !== '' && (
                <>
                  {' '}
                  after <Text className="mono">{JSON.stringify(c.static_prefix)}</Text>
                </>
              )}
            </>
          ) : (
            kindLabel(c.cred_kind)
          )}
        </dd>
        {c.cred_kind === 'static' && (
          <>
            <dt>Token</dt>
            <dd>{c.has_credential ? 'Set' : 'Not set yet'}</dd>
          </>
        )}
        {c.account_label && (
          <>
            <dt>Signed in as</dt>
            <dd>
              <Text>{capped(c.account_label)}</Text>
            </dd>
          </>
        )}
        <dt>Tools</dt>
        <dd>
          <Text>{tools}</Text>
        </dd>
        {c.internal_network && (
          <>
            <dt>Network</dt>
            <dd>Internal network allowed</dd>
          </>
        )}
      </dl>
      {editing ? (
        <ConnectionForm
          initial={formOf(editing)}
          submit="Save"
          busy={props.editBusy}
          error={props.editError}
          onSubmit={(form) => props.onSave(form, editing)}
          onCancel={props.onCancelEdit}
        />
      ) : (
        <div className="card-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            id={`${id}-edit`}
            onClick={props.onEdit}
            aria-disabled={props.locked}
          >
            Edit
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-danger btn-sm" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      )}
      {c.cred_kind === 'static' && <TokenForm connection={c} hatName={hatName} onSaved={props.onTokenSaved} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```


- [ ] Step 4: Run `nix develop -c pnpm --dir web test src/api/mcp-stdio.test.ts src/components/StdioServers.test.tsx src/components/StdioServers.missing.test.tsx src/components/StdioServerForm.test.tsx src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx src/lib/mcpDelivery.test.ts src/lib/stdio.test.ts src/screens/Mcp.test.tsx src/screens/NewSession.test.tsx`.

**Expected:** exit 0, 170 targeted tests. Full Vitest has 1465 tests. After the fresh replay and execution-record commit, run the full final-tip gate once: frozen install, typecheck, Vitest, build, binary/fake build, both generator checks and full `CI=1 pnpm --dir web e2e` (58 passed / 11 skipped).

- [ ] Step 5: Run the 27 Task 6 source probes and rendered-secret fault injection below, restore every source byte, review the diff and fixup into `fix(web): apply MCP delivery security review amendments`. Fixup amended v2 into the first plan commit, replay twelve phases in a fresh directory, then write the authorized execution record. Check Gmail authors and push with the parent's lease on `9b815a8b`.

## Final verification and record

- [ ] From the restored final code run frozen install, typecheck, full Vitest, build, `cargo build -p hennery -p hennery-testkit --bins --locked`, both codegen `--check` commands and the full `CI=1 pnpm --dir web e2e`, all through plain `nix develop -c`. Expect 1453 Vitest and 58 Playwright passed / 11 suite-condition skips; the new spec passes 8/8. No Rust logic change asks for workspace Rust tests.
- [ ] Replay the code blocks onto the base, require a positive extraction count and equal trees at all twelve phase boundaries, then validate the exact final docs/tree.
- [ ] Record the observed results here and in docs/README, commit `docs(plan): plan 4e-ii-a, MCP delivery and local servers in the web UI` first after the base, preserve the twelve task commits after it, verify the final tree, check author/rules, push with the explicit branch lease, scoped re-confirmation is CONFIRMED WITH NOTES and N1–N3 are included. After fresh replay, update Execution status and the README line in a separate `docs(plan): record the execution of plan 4e-ii-a` commit.

**Replace:** `docs/README.md` (this one complete line exactly once).

Before:

```markdown
   - [The MCP connections screen (4e-i)](plans/2026-10-22-web-mcp.md) — part 4e-i of plan 4, the frontend (3 tasks), in `web/` only, over plan 8a's routes: `/mcp` (nothing under it, which the server reserves), shown only when `features` names `mcp_connections`; each connection with `hennery-<slug>`, its URL, hat, kind, whether a token is stored and its state in words (`needs_auth` "needs sign-in again", `error` "is failing", never a reconnect), the vendor's note escaped and cut at 300 characters; add (step-up; the hat starts at the default for new hosts), edit sending only the changed fields (a label edit needs no step-up; the token's loss confirmed first), delete (confirmed, then stepped up); the static token write-only, read once from an uncontrolled field kept from password managers and emptied before the request; the hosts ticked as a full set built from the connection's own mounts; a note that changes apply to new and resumed sessions, and how Codex, Claude on the operator's own CLI and any other agent command get them (without isolation, only both in the host's default hat; may change). Playwright creates one, sets its token and mounts it on a real paired host at two widths. Stdio servers, OAuth and the delivery indicator are 4e-ii's. Amended after the security review of 2026-10-03 and its re-confirmation. Executed 2026-10-03, with the whole-branch review fixes completed and rebased onto merged 8e (`d54c704c`) on 2026-10-12 (see its "Execution status").
```

After:

```markdown
   - [The MCP connections screen (4e-i)](plans/2026-10-22-web-mcp.md) — part 4e-i of plan 4, the frontend (3 tasks), in `web/` only, over plan 8a's routes: `/mcp` (nothing under it, which the server reserves), shown only when `features` names `mcp_connections`; each connection with `hennery-<slug>`, its URL, hat, kind, whether a token is stored and its state in words (`needs_auth` "needs sign-in again", `error` "is failing", never a reconnect), the vendor's note escaped and cut at 300 characters; add (step-up; the hat starts at the default for new hosts), edit sending only the changed fields (a label edit needs no step-up; the token's loss confirmed first), delete (confirmed, then stepped up); the static token write-only, read once from an uncontrolled field kept from password managers and emptied before the request; the hosts ticked as a full set built from the connection's own mounts; a note that changes apply to new and resumed sessions, and how Codex, Claude on the operator's own CLI and any other agent command get them (without isolation, only both in the host's default hat; may change). Playwright creates one, sets its token and mounts it on a real paired host at two widths. Stdio servers, OAuth and the delivery indicator are 4e-ii's. Amended after the security review of 2026-10-03 and its re-confirmation. Executed 2026-10-03, with the whole-branch review fixes completed and rebased onto merged 8e (`d54c704c`) on 2026-10-12 (see its "Execution status").
   - [Web MCP delivery and local servers (4e-ii-a)](plans/2026-10-23-web-mcp-delivery.md) — five web-only tasks over merged 8e: last-start/resume mode/count, bounded metadata refresh, host/agent predictions on New Session and mount grids, full-set local stdio configuration with write-only env values and step-up, and isolation refusals. Code-first planning build constructed and verified on `7a8dab28`; 1453 Vitest, 58 Playwright passed / 11 existing-condition skips, 143 caught probes. Verbatim replay checked; security review and execution approval pending. OAuth Connect is 4e-ii-b after 8f.
```

## Revert-probes

Each record below names one actual mutation and the targeted positive assertion that failed. Match `from` exactly once, substitute `to`, run `pnpm --dir web test` with `tests` and optional `-t name`, require a nonzero exit and a nonempty failed-test count, then restore original bytes in finally. Run one mutation at a time, outside any build/verification. Code/test/schema weakening is forbidden. The positive tests are already embedded above.

<!-- PROBE MANIFEST -->
```json
[
  {
    "label": "words-isolated",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "    case 'isolated':",
    "to": "    case 'isolated': return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "words isolated",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-isolated",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return 'isolated'",
    "to": "return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "predicts isolated",
    "exit": 1,
    "caught": true
  },
  {
    "label": "words-unisolated",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "    case 'unisolated':",
    "to": "    case 'unisolated': return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "words unisolated",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-unisolated",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return 'unisolated'",
    "to": "return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "predicts unisolated",
    "exit": 1,
    "caught": true
  },
  {
    "label": "words-fallback",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "    case 'fallback':",
    "to": "    case 'fallback': return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "words fallback",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-fallback",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return 'fallback'",
    "to": "return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "predicts fallback",
    "exit": 1,
    "caught": true
  },
  {
    "label": "words-unsupported",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "    case 'unsupported':",
    "to": "    case 'unsupported': return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "words unsupported",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-unsupported",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return 'unsupported'",
    "to": "return 'unknown'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "predicts unsupported",
    "exit": 1,
    "caught": true
  },
  {
    "label": "words-unknown",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return 'MCP delivery is unknown.'",
    "to": "return 'isolated'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "words undefined",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-unknown-context",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "if (!host || !agent || !hat) return 'unknown'",
    "to": "if (!host || !agent || !hat) return 'isolated'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "missing host",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-unknown-before-hello",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "if (host.last_seen_at === undefined) return 'unknown'",
    "to": "if (host.last_seen_at === undefined) return 'unsupported'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "missing host",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-unknown-report",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "if (!map || !Object.hasOwn(map, agent)) return 'unknown'",
    "to": "if (!map || !Object.hasOwn(map, agent)) return 'isolated'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "missing host",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-own-keys",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "!Object.hasOwn(map, agent)",
    "to": "!map[agent]",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "missing host",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-snapshot-prefix",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "'Prediction from the host’s last report: '",
    "to": "'Currently: '",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "predictionWords",
    "exit": 1,
    "caught": true
  },
  {
    "label": "lifecycle-starting",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "lifecycle === 'starting' || lifecycle === 'active'",
    "to": "lifecycle === 'active'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "recognises starting",
    "exit": 1,
    "caught": true
  },
  {
    "label": "lifecycle-active",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "lifecycle === 'starting' || lifecycle === 'active'",
    "to": "lifecycle === 'starting'",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "recognises active",
    "exit": 1,
    "caught": true
  },
  {
    "label": "lifecycle-false",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return lifecycle === 'starting' || lifecycle === 'active'",
    "to": "return true",
    "tests": [
      "src/lib/mcpDelivery.test.ts"
    ],
    "name": "does not treat",
    "exit": 1,
    "caught": true
  },
  {
    "label": "resolved-hat-positive",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return resolved.hat",
    "to": "return undefined",
    "tests": [
      "src/components/McpPrediction.test.tsx"
    ],
    "name": "current host",
    "exit": 1,
    "caught": true
  },
  {
    "label": "resolved-hat-negative",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "return undefined",
    "to": "return 'hat-a'",
    "tests": [
      "src/components/McpPrediction.test.tsx"
    ],
    "name": "current host",
    "exit": 1,
    "caught": true
  },
  {
    "label": "retention-positive",
    "file": "web/src/lib/stdio.ts",
    "from": "return before !== undefined &&",
    "to": "return false &&",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps only",
    "exit": 1,
    "caught": true
  },
  {
    "label": "retention-negative",
    "file": "web/src/lib/stdio.ts",
    "from": "before.name === name &&",
    "to": "true &&",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps only",
    "exit": 1,
    "caught": true
  },
  {
    "label": "retention-command",
    "file": "web/src/lib/stdio.ts",
    "from": "before.command === command &&",
    "to": "true &&",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps only",
    "exit": 1,
    "caught": true
  },
  {
    "label": "retention-env-name",
    "file": "web/src/lib/stdio.ts",
    "from": "entry.name === env && entry.has_value",
    "to": "entry.has_value",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps only",
    "exit": 1,
    "caught": true
  },
  {
    "label": "retention-has-value",
    "file": "web/src/lib/stdio.ts",
    "from": "entry.name === env && entry.has_value",
    "to": "entry.name === env",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps only",
    "exit": 1,
    "caught": true
  },
  {
    "label": "serialize-kept-omission",
    "file": "web/src/lib/stdio.ts",
    "from": "{ name: entry.name } :",
    "to": "{ name: entry.name, value: read(server.id, entry.id) } :",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps omissions",
    "exit": 1,
    "caught": true
  },
  {
    "label": "serialize-explicit-empty",
    "file": "web/src/lib/stdio.ts",
    "from": "value: read(server.id, entry.id)",
    "to": "value: undefined",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps omissions",
    "exit": 1,
    "caught": true
  },
  {
    "label": "serialize-full-set",
    "file": "web/src/lib/stdio.ts",
    "from": "servers: drafts.map",
    "to": "servers: [].map",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "keeps omissions",
    "exit": 1,
    "caught": true
  },
  {
    "label": "refusal-not-found",
    "file": "web/src/lib/stdio.ts",
    "from": "return 'This host or hat no longer exists.'",
    "to": "return 'Host missing.'",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "disappeared",
    "exit": 1,
    "caught": true
  },
  {
    "label": "refusal-host-revoked",
    "file": "web/src/lib/stdio.ts",
    "from": "return 'This host is revoked: its local MCP servers can be read, not changed.'",
    "to": "return 'Revoked.'",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "words host_revoked",
    "exit": 1,
    "caught": true
  },
  {
    "label": "refusal-other",
    "file": "web/src/lib/stdio.ts",
    "from": "return messageOf(err)",
    "to": "return 'Unknown error'",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "name": "invalid field",
    "exit": 1,
    "caught": true
  },
  {
    "label": "error-env_value_missing",
    "file": "web/src/api/errors.ts",
    "from": "  env_value_missing: 'Re-enter the environment values: the server was renamed, its command changed, or no value is stored.',",
    "to": "",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "exit": 1,
    "caught": true
  },
  {
    "label": "error-too_many_stdio_servers",
    "file": "web/src/api/errors.ts",
    "from": "  too_many_stdio_servers: 'Too many local MCP servers: at most 32 per host and hat, and 1024 in total.',",
    "to": "",
    "tests": [
      "src/lib/stdio.test.ts"
    ],
    "exit": 1,
    "caught": true
  },
  {
    "label": "error-host_revoked",
    "file": "web/src/api/errors.ts",
    "from": "  host_revoked: 'This host is revoked.',",
    "to": "",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "exit": 1,
    "caught": true
  },
  {
    "label": "error-mcp_isolation_unavailable",
    "file": "web/src/api/errors.ts",
    "from": "  mcp_isolation_unavailable: 'The host could not isolate this agent’s MCP servers. Try again.',",
    "to": "",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "exit": 1,
    "caught": true
  },
  {
    "label": "failure-marker",
    "file": "web/src/components/items/Marker.tsx",
    "from": "mcp_isolation_unavailable: 'the host could not isolate this agent’s MCP servers',",
    "to": "",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "name": "failed session",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-get",
    "file": "web/src/api/mcp.ts",
    "from": "return client.request('GET', stdioPath(host, hat))",
    "to": "return client.request('POST', stdioPath(host, hat))",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "name": "encodes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-put",
    "file": "web/src/api/mcp.ts",
    "from": "return client.request('PUT', stdioPath(host, hat), body)",
    "to": "return client.request('POST', stdioPath(host, hat), body)",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "name": "encodes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-put-body",
    "file": "web/src/api/mcp.ts",
    "from": "return client.request('PUT', stdioPath(host, hat), body)",
    "to": "return client.request('PUT', stdioPath(host, hat))",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "name": "encodes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-query-host",
    "file": "web/src/api/mcp.ts",
    "from": "host_id: host, hat_id: hat",
    "to": "host_id: 'wrong', hat_id: hat",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "name": "encodes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-query-hat",
    "file": "web/src/api/mcp.ts",
    "from": "host_id: host, hat_id: hat",
    "to": "host_id: host, hat_id: 'wrong'",
    "tests": [
      "src/api/mcp-stdio.test.ts"
    ],
    "name": "encodes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "detail-pool-client",
    "file": "web/src/api/view.ts",
    "from": "detailReads.set(client, reads)",
    "to": "void 0",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "shares an in-flight",
    "exit": 1,
    "caught": true
  },
  {
    "label": "detail-pool-id",
    "file": "web/src/api/view.ts",
    "from": "reads.set(id, pending)",
    "to": "void 0",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "shares an in-flight",
    "exit": 1,
    "caught": true
  },
  {
    "label": "detail-pool-held",
    "file": "web/src/api/view.ts",
    "from": "if (held) return held",
    "to": "if (false) return held",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "shares an in-flight",
    "exit": 1,
    "caught": true
  },
  {
    "label": "detail-pool-release",
    "file": "web/src/api/view.ts",
    "from": "finally(() => reads.delete(id))",
    "to": "finally(() => {})",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "shares an in-flight",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-queue-guard",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "if (busy) return",
    "to": "if (false) return",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "coalesces",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-queue-set",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "busy = true",
    "to": "busy = false",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "coalesces",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-queue-release",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "busy = false\n    }",
    "to": "busy = true\n    }",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "reads on open",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-generation",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "wanted++; void run()",
    "to": "void run()",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "coalesces",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-initial-read",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "    request.current()\n",
    "to": "",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "reads on open",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-success-write",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "setState({ id, detail, error: null })",
    "to": "void 0",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "reads on open",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-stale-success",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "if (live && generation === wanted) setState({ id, detail, error: null })",
    "to": "if (live) setState({ id, detail, error: null })",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "coalesces",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-stale-session",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "if (live && generation === wanted) setState({ id, detail, error: null })",
    "to": "if (generation === wanted) setState({ id, detail, error: null })",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "previous session",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-error-write",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "setState({ id, detail: null, error: messageOf(err) })",
    "to": "void 0",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "read refusal",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-stale-error",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "if (live && generation === wanted) setState({ id, detail: null, error: messageOf(err) })",
    "to": "if (live) setState({ id, detail: null, error: messageOf(err) })",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "superseded error",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-unmount",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "live = false; request.current = null",
    "to": "request.current = null",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "unmounted queue",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-lifecycle-bookkeeping",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "previous.current = { id, lifecycle, resync }",
    "to": "void 0",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "reads on open",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-resync-trigger",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "resync !== before.resync || resumed",
    "to": "resumed",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "reads on open",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-external-resume-trigger",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "resync !== before.resync || resumed",
    "to": "resync !== before.resync",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "reads on open",
    "exit": 1,
    "caught": true
  },
  {
    "label": "session-resume-refresh",
    "file": "web/src/screens/Session.tsx",
    "from": "    mcp.refresh()\n",
    "to": "",
    "tests": [
      "src/screens/Session.test.tsx"
    ],
    "name": "resume",
    "exit": 1,
    "caught": true
  },
  {
    "label": "session-resync-wiring",
    "file": "web/src/screens/Session.tsx",
    "from": "Math.max(0, s.loads - 1)",
    "to": "0",
    "tests": [
      "src/screens/Session.test.tsx"
    ],
    "name": "resync",
    "exit": 1,
    "caught": true
  },
  {
    "label": "session-mode-wiring",
    "file": "web/src/screens/Session.tsx",
    "from": "delivery={mcp.detail?.mcp_delivery}",
    "to": "delivery={undefined}",
    "tests": [
      "src/screens/Session.test.tsx"
    ],
    "name": "resume",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-resolution-context",
    "file": "web/src/screens/NewSession.tsx",
    "from": "resolution, hostId, path: cwd",
    "to": "resolution, hostId, path: \"wrong\"",
    "tests": [
      "src/screens/NewSession.test.tsx"
    ],
    "name": "delivery",
    "exit": 1,
    "caught": true
  },
  {
    "label": "new-session-prediction-wiring",
    "file": "web/src/screens/NewSession.tsx",
    "from": "host={host} agent={agentName}",
    "to": "host={undefined} agent={agentName}",
    "tests": [
      "src/screens/NewSession.test.tsx"
    ],
    "name": "delivery",
    "exit": 1,
    "caught": true
  },
  {
    "label": "mount-predictions",
    "file": "web/src/components/Mounts.tsx",
    "from": "host={host} agent={agent}",
    "to": "host={undefined} agent={agent}",
    "tests": [
      "src/screens/Mcp.test.tsx"
    ],
    "name": "annotates",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-shell-feature",
    "file": "web/src/components/Shell.tsx",
    "from": "stdio={caps.features.includes('mcp_stdio')}",
    "to": "stdio={false}",
    "tests": [
      "src/screens/Mcp.test.tsx"
    ],
    "name": "local sets",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-mcp-wiring",
    "file": "web/src/screens/Mcp.tsx",
    "from": "enabled={stdio}",
    "to": "enabled={false}",
    "tests": [
      "src/screens/Mcp.test.tsx"
    ],
    "name": "local sets",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-feature-absent",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (!enabled) return null",
    "to": "if (false) return null",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "feature is absent",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-read",
    "file": "web/src/components/StdioServers.tsx",
    "from": "stdioServers(client, host.host_id, hat.id)",
    "to": "stdioServers(client, 'wrong', hat.id)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-read-current",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (reading) apply(answer)",
    "to": "if (false) apply(answer)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-read-stale",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (reading) apply(answer)",
    "to": "apply(answer)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "disposed editor",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-read-error",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (reading) setError(stdioRefusal(err))",
    "to": "if (false) setError(stdioRefusal(err))",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "permits offline",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-namespace-key",
    "file": "web/src/components/StdioServers.tsx",
    "from": "key={JSON.stringify([hostId, hatId])}",
    "to": "key={'shared'}",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "old form immediately",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-host-select-lock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (blocked.current) return",
    "to": "if (false) return",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "locks the place",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-hat-select",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (!blocked.current) setHat(event.target.value)",
    "to": "if (false) setHat(event.target.value)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "old-place read",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-review-lock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "pending.current = true",
    "to": "pending.current = false",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-place-lock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "placeLock.current(true)",
    "to": "placeLock.current(false)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "locks the place",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-place-ref-lock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "blocked.current = value;",
    "to": "",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "locks the place",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-place-state-lock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "setBusy(value)",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "locks the place",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-confirm",
    "file": "web/src/components/StdioServers.tsx",
    "from": "setConfirming(true)",
    "to": "setConfirming(false)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-confirm-close",
    "file": "web/src/components/StdioServers.tsx",
    "from": "setConfirming(false)",
    "to": "setConfirming(true)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "cancellation",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-unlock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "pending.current = false\n    placeLock",
    "to": "pending.current = true\n    placeLock",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "adds and removes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-close-place-unlock",
    "file": "web/src/components/StdioServers.tsx",
    "from": "placeLock.current(false)\n    setConfirming",
    "to": "placeLock.current(true)\n    setConfirming",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "locks the place",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-uncertain-value-validation",
    "file": "web/src/components/StdioServers.tsx",
    "from": "drafts.some(d => d.env.some(e => !e.keep && !e.entered))",
    "to": "false",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "requires re-entry",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-value-clearing",
    "file": "web/src/components/StdioServers.tsx",
    "from": "field.value = ''",
    "to": "field.value = field.value",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears DOM values",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-clear-before-io",
    "file": "web/src/components/StdioServers.tsx",
    "from": "    discardValues()\n    const work",
    "to": "    const work",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears DOM values",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-clear-on-cancel",
    "file": "web/src/components/StdioServers.tsx",
    "from": "    discardValues()\n    pending.current",
    "to": "    pending.current",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "cancellation",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-reentry-after-clear",
    "file": "web/src/components/StdioServers.tsx",
    "from": "entered: false, empty: false",
    "to": "entered: e.entered, empty: e.empty",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "cancellation",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-original-identity",
    "file": "web/src/components/StdioServers.tsx",
    "from": "originals.current.set(id, server)",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-write-namespace",
    "file": "web/src/components/StdioServers.tsx",
    "from": "replaceStdioServers(client, host.host_id, hat.id, body)",
    "to": "replaceStdioServers(client, 'wrong', hat.id, body)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-write-body",
    "file": "web/src/components/StdioServers.tsx",
    "from": "replaceStdioServers(client, host.host_id, hat.id, body)",
    "to": "replaceStdioServers(client, host.host_id, hat.id, { servers: [] })",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-read-value",
    "file": "web/src/components/StdioServers.tsx",
    "from": "fields.current.get(`${server}:${env}`)?.value",
    "to": "''",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears DOM values",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-write-result",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (live.current) apply(answer)",
    "to": "if (false) apply(answer)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears DOM values",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-write-error",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (live.current) setError(stdioRefusal(err))",
    "to": "if (false) setError(stdioRefusal(err))",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "shows refusal",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-single-flight",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (operation.current) return operation.current",
    "to": "if (false) return operation.current",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "same-frame",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-cancel-during-io",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (operation.current) return\n",
    "to": "if (false) return\n",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "same-frame",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-promise-release",
    "file": "web/src/components/StdioServers.tsx",
    "from": "operation.current = null",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-default-prevented",
    "file": "web/src/components/StdioServers.tsx",
    "from": "event.preventDefault()",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "rather than navigating",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-revoked-no-save",
    "file": "web/src/components/StdioServers.tsx",
    "from": "!host.revoked_at && <div",
    "to": "true && <div",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "permits offline",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-revoked-fields",
    "file": "web/src/components/StdioServers.tsx",
    "from": "confirming || !!host.revoked_at",
    "to": "confirming",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "permits offline",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-set-remove",
    "file": "web/src/components/StdioServers.tsx",
    "from": "before?.filter(entry => entry.id !== d.id)",
    "to": "before",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "adds and removes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-set-add",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (!pending.current) setDrafts(before => [...(before ?? []), { id: allocate(), name:",
    "to": "if (false) setDrafts(before => [...(before ?? []), { id: allocate(), name:",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "adds and removes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-purging-hat-filter",
    "file": "web/src/components/StdioServers.tsx",
    "from": "hats.filter(h => !h.purging)",
    "to": "hats",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "reads names",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-edit-original-keep",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "keep: e.keep && canKeepEnv(original, name, command, e.name)",
    "to": "keep: e.keep",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "requires re-entry",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-identity-update",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "change({ ...d, name, command, env:",
    "to": "change({ ...d, name: d.name, command: d.command, env:",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "requires re-entry",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-env-keep-toggle",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "keep: event.target.checked, entered: false",
    "to": "keep: true, entered: false",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "explicitly empty",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-env-value-entered",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "entered: true, empty: event.target.value",
    "to": "entered: false, empty: event.target.value",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears DOM values",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-env-empty-entered",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "entered: event.target.checked, empty: event.target.checked",
    "to": "entered: false, empty: event.target.checked",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "explicitly empty",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-env-empty-clear",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "clear(e.id); envChange(e.id, { entered:",
    "to": "envChange(e.id, { entered:",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears a supplied value",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-arg-edit",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "at === i ? e.target.value : a",
    "to": "a",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "args-only",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-arg-remove",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "d.args.filter((_, at) => at !== i)",
    "to": "d.args",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "adds and removes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-arg-add",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "args: [...d.args, '']",
    "to": "args: d.args",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "adds and removes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-env-add",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "env: [...d.env, { id: allocate(), name: '', keep: false }]",
    "to": "env: d.env",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "changing one",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-env-remove",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "d.env.filter(entry => entry.id !== e.id)",
    "to": "d.env",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "adds and removes",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-113",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) identity(e.target.value, d.command)",
    "to": "if (true) identity(e.target.value, d.command)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-114",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) identity(d.name, e.target.value)",
    "to": "if (true) identity(d.name, e.target.value)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-115",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) change({ ...d, args: d.args.map",
    "to": "if (true) change({ ...d, args: d.args.map",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-116",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) { clear(e.id); envChange(e.id, { name:",
    "to": "if (true) { clear(e.id); envChange(e.id, { name:",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-117",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) { clear(e.id); envChange(e.id, { keep:",
    "to": "if (true) { clear(e.id); envChange(e.id, { keep:",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-118",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) envChange(e.id, { entered: true",
    "to": "if (true) envChange(e.id, { entered: true",
    "tests": [
      "src/components/StdioServerForm.test.tsx"
    ],
    "name": "locked value field",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-119",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) { clear(e.id); envChange(e.id, { entered:",
    "to": "if (true) { clear(e.id); envChange(e.id, { entered:",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-120",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) change({ ...d, args: d.args.filter",
    "to": "if (true) change({ ...d, args: d.args.filter",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-121",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) change({ ...d, args: [...d.args",
    "to": "if (true) change({ ...d, args: [...d.args",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-122",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) change({ ...d, env: d.env.filter",
    "to": "if (true) change({ ...d, env: d.env.filter",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-123",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) change({ ...d, env: [...d.env",
    "to": "if (true) change({ ...d, env: [...d.env",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-locked-124",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "if (!locked) remove()",
    "to": "if (true) remove()",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "freezes draft",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-reset-detail",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "    setState({ id, detail: null, error: null })",
    "to": "",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "new client",
    "exit": 1,
    "caught": true
  },
  {
    "label": "hook-continue-latest",
    "file": "web/src/hooks/useMcpDelivery.ts",
    "from": "if (generation === wanted) break",
    "to": "if (true) break",
    "tests": [
      "src/hooks/useMcpDelivery.test.tsx"
    ],
    "name": "coalesces",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-write-stale",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (live.current) apply(answer)",
    "to": "apply(answer)",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "disposed editor",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-read-unmount",
    "file": "web/src/components/StdioServers.tsx",
    "from": "reading = false; live.current = false",
    "to": "live.current = false",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "disposed editor",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-write-unmount",
    "file": "web/src/components/StdioServers.tsx",
    "from": "reading = false; live.current = false",
    "to": "reading = false",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "disposed editor",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-clear-server-identity",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "    clear()\n",
    "to": "",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears a supplied value",
    "exit": 1,
    "caught": true
  },
  {
    "label": "session-codex-warning",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.",
    "to": "This session is isolated.",
    "tests": [
      "src/components/McpDelivery.test.tsx"
    ],
    "name": "decision, with count",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-release-originals",
    "file": "web/src/components/StdioServers.tsx",
    "from": "originals.current.clear()",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "releases old",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-release-fields",
    "file": "web/src/components/StdioServers.tsx",
    "from": "fields.current.delete(key)",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "releases old",
    "exit": 1,
    "caught": true
  },
  {
    "label": "stdio-field-register",
    "file": "web/src/components/StdioServers.tsx",
    "from": "fields.current.set(key, node)",
    "to": "void 0",
    "tests": [
      "src/components/StdioServers.test.tsx"
    ],
    "name": "clears DOM values",
    "exit": 1,
    "caught": true
  },
  {
    "label": "session-read-error-render",
    "file": "web/src/screens/Session.tsx",
    "from": "{mcp.error && <p",
    "to": "{false && <p",
    "tests": [
      "src/screens/Session.test.tsx"
    ],
    "name": "delivery-read error",
    "exit": 1,
    "caught": true
  },
  {
    "label": "session-read-error-escaping",
    "file": "web/src/screens/Session.tsx",
    "from": "<Text>{mcp.error}</Text>",
    "to": "<bdi>{mcp.error}</bdi>",
    "tests": [
      "src/screens/Session.test.tsx"
    ],
    "name": "delivery-read error",
    "exit": 1,
    "caught": true
  },
  {
    "label": "delivery-context",
    "file": "web/src/components/McpDelivery.tsx",
    "from": "At the last start/resume:",
    "to": "Currently:",
    "tests": [
      "src/components/McpDelivery.test.tsx"
    ],
    "name": "decision, with count",
    "exit": 1,
    "caught": true
  },
  {
    "label": "delivery-count",
    "file": "web/src/components/McpDelivery.tsx",
    "from": "{delivery.servers} MCP servers.",
    "to": "0 MCP servers.",
    "tests": [
      "src/components/McpDelivery.test.tsx"
    ],
    "name": "decision, with count",
    "exit": 1,
    "caught": true
  },
  {
    "label": "delivery-codex-positive",
    "file": "web/src/components/McpDelivery.tsx",
    "from": "agent === 'codex'",
    "to": "false",
    "tests": [
      "src/components/McpDelivery.test.tsx"
    ],
    "name": "decision, with count",
    "exit": 1,
    "caught": true
  },
  {
    "label": "delivery-codex-negative",
    "file": "web/src/components/McpDelivery.tsx",
    "from": "agent === 'codex'",
    "to": "true",
    "tests": [
      "src/components/McpDelivery.test.tsx"
    ],
    "name": "another agent",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-codex-positive",
    "file": "web/src/components/McpPrediction.tsx",
    "from": "agent === 'codex'",
    "to": "false",
    "tests": [
      "src/components/McpPrediction.test.tsx"
    ],
    "name": "default-hat Codex",
    "exit": 1,
    "caught": true
  },
  {
    "label": "prediction-codex-negative",
    "file": "web/src/components/McpPrediction.tsx",
    "from": "agent === 'codex'",
    "to": "true",
    "tests": [
      "src/components/McpPrediction.test.tsx"
    ],
    "name": "another agent|for Claude",
    "exit": 1,
    "caught": true
  }
]
```

### Task 6 revert-probes (v2, including N1–N3)

27 source guards and one rendered-secret browser assertion fault injection. Every record was caught by actual failed assertions and restored byte for byte.

```json
[
  {
    "label": "env-spellCheck",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "spellCheck={false} ",
    "to": "",
    "test": "src/components/StdioServerForm.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "env-autoCorrect",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "autoCorrect=\"off\" ",
    "to": "",
    "test": "src/components/StdioServerForm.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "env-autoCapitalize",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "autoCapitalize=\"off\" ",
    "to": "",
    "test": "src/components/StdioServerForm.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "env-erasure-presence",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "entered: event.target.value !== ''",
    "to": "entered: true",
    "test": "src/components/StdioServers.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "env-erasure-empty",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "{ entered: event.target.value !== '' }",
    "to": "{ entered: event.target.value !== '', empty: event.target.value === '' }",
    "test": "src/components/StdioServers.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "env-recipients",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "The host, the agent and the server process receive them.",
    "to": "",
    "test": "src/components/StdioServerForm.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "env-readback-words",
    "file": "web/src/components/StdioServerForm.tsx",
    "from": "Environment values cannot be read back from hennery.",
    "to": "",
    "test": "src/components/StdioServerForm.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "missing-field-refusal",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (!field) {\n        discardValues()\n        throw new Error('The environment value field is unavailable. Cancel and re-enter the values.')\n      }",
    "to": "if (!field) return ''",
    "test": "src/components/StdioServers.missing.test.tsx",
    "exit": 1,
    "failed": 2,
    "caught": true
  },
  {
    "label": "review-command-visible",
    "file": "web/src/components/StdioServers.tsx",
    "from": "visible(d.command)",
    "to": "d.command",
    "test": "src/components/StdioServers.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "review-arg-visible",
    "file": "web/src/components/StdioServers.tsx",
    "from": "visible(arg)",
    "to": "arg",
    "test": "src/components/StdioServers.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "review-empty-arg",
    "file": "web/src/components/StdioServers.tsx",
    "from": "visible(arg) || '\"\"'",
    "to": "visible(arg)",
    "test": "src/components/StdioServers.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "stdio-name-conflict",
    "file": "web/src/lib/stdio.ts",
    "from": "if (err instanceof ApiFailure && err.code === 'slug_taken') return 'A connection already uses this name.'",
    "to": "",
    "test": "src/lib/stdio.test.ts",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "snapshot-words",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "This agent was given only this hat's MCP servers.",
    "to": "Hennery keeps this agent to the MCP servers of this hat.",
    "test": "src/lib/mcpDelivery.test.ts",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "note-unisolated",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "if (mode === 'unisolated')",
    "to": "if (false)",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 3,
    "caught": true
  },
  {
    "label": "note-mode-gate",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "if (mode === 'unisolated')",
    "to": "if (mode !== 'unknown')",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 6,
    "caught": true
  },
  {
    "label": "note-agent-specific",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "agent === 'codex' ? CODEX_MCP_NOTE : 'The agent also loads your own MCP configuration.'",
    "to": "CODEX_MCP_NOTE",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "note-unknown",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "if (mode === 'unknown' && agent === 'codex')",
    "to": "if (false)",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 3,
    "caught": true
  },
  {
    "label": "note-unknown-agent",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "mode === 'unknown' && agent === 'codex'",
    "to": "mode === 'unknown'",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 2,
    "caught": true
  },
  {
    "label": "note-unknown-may",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "Codex may also load your own ~/.codex MCP servers.",
    "to": "Codex also loads your own ~/.codex MCP servers.",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 3,
    "caught": true
  },
  {
    "label": "note-default-absence",
    "file": "web/src/lib/mcpDelivery.ts",
    "from": "  return undefined\n}\n\n/** Only a non-running",
    "to": "  return CODEX_MCP_NOTE\n}\n\n/** Only a non-running",
    "test": "src/components/McpDelivery.test.tsx src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 9,
    "caught": true
  },
  {
    "label": "note-wiring-McpDelivery",
    "file": "web/src/components/McpDelivery.tsx",
    "from": "{note && <p>{note}</p>}",
    "to": "",
    "test": "src/components/McpDelivery.test.tsx",
    "exit": 1,
    "failed": 4,
    "caught": true
  },
  {
    "label": "note-wiring-McpPrediction",
    "file": "web/src/components/McpPrediction.tsx",
    "from": "{note && <p>{note}</p>}",
    "to": "",
    "test": "src/components/McpPrediction.test.tsx",
    "exit": 1,
    "failed": 2,
    "caught": true
  },
  {
    "label": "missing-host-warning",
    "file": "web/src/screens/Mcp.tsx",
    "from": "{hosts.data?.some(h => !h.mcp_delivery) && <p>Codex may also load your own ~/.codex MCP servers.</p>}",
    "to": "",
    "test": "src/screens/Mcp.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "missing-host-warning-scope",
    "file": "web/src/screens/Mcp.tsx",
    "from": "hosts.data?.some(h => !h.mcp_delivery)",
    "to": "hosts.data",
    "test": "src/screens/Mcp.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "isolation-no-retry",
    "file": "web/src/api/errors.ts",
    "from": "The host could not isolate this agent’s MCP servers.",
    "to": "The host could not isolate this agent’s MCP servers. Try again.",
    "test": "src/lib/stdio.test.ts",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "missing-field-clears-other-values",
    "file": "web/src/components/StdioServers.tsx",
    "from": "if (!field) {\n        discardValues()",
    "to": "if (!field) {",
    "test": "src/components/StdioServers.missing.test.tsx",
    "exit": 1,
    "failed": 2,
    "caught": true
  },
  {
    "label": "future-mode-normalized",
    "file": "web/src/components/McpDelivery.tsx",
    "from": "mode === 'isolated' || mode === 'unisolated' || mode === 'fallback' || mode === 'unsupported' ? mode : 'unknown'",
    "to": "delivery?.mode ?? 'unknown'",
    "test": "src/components/McpDelivery.test.tsx",
    "exit": 1,
    "failed": 1,
    "caught": true
  },
  {
    "label": "rendered-secret-check",
    "file": "web/e2e/mcp-delivery.spec.ts",
    "from": "    expect(await page.evaluate(value => document.body.innerText.includes(value), ENV_VALUE)).toBe(false)",
    "to": "    await page.evaluate(value => { const node = document.createElement('div'); node.textContent = value; document.body.append(node) }, ENV_VALUE)\n    expect(await page.evaluate(value => document.body.innerText.includes(value), ENV_VALUE)).toBe(false)",
    "tests": [
      "e2e/mcp-delivery.spec.ts"
    ],
    "exit": 1,
    "failed": 2,
    "caught": true,
    "browser": true
  }
]
```

## After this plan

- Opus scoped re-confirmation (maintainer's behalf, 2026-10-13) is CONFIRMED WITH NOTES; N1–N3 are taken, embedded and probed. The parent handles PR #131, CI, any further whole-branch review, and merge.
- OAuth Connect remains 4e-ii-b after 8f. Codex stays unisolated until 8h; 8g and 8h get no screens here.
- Delivery’s timestamp is a decision, not an ACK/health signal. No backend/SSE change is smuggled in to make it fresher. Keep the no-per-event rule when later features consume the detail.
- 8e’s Q2/PQ1/PQ2/OQ3 and env-echo/default-hat/token-cut questions remain outside this plan, with no UI promise resolving them.

Generated with Claude AI — please review before distribution.
