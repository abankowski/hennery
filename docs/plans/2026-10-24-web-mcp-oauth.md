# Web MCP OAuth (plan 4e-ii-b) Implementation Plan

> **For agentic workers:** execute the five tasks in order using the fleet's subagent-driven-development process, or its manual equivalent. Opus security review on the maintainer's behalf was APPROVE AFTER AMENDMENTS; scoped re-confirmation was CONFIRMED WITH NOTES (parent, 2026-10-13). I1/M1–M10, rulings 1–12 and N1–N3 are taken. The parent authorized this execution record; CI/PR lifecycle remains the parent's.

**Goal:** expose merged 8f's OAuth MCP connections: DCR or a pre-registered public/confidential client, isolated consent, reported status, probe and attention count. Preserve 4e-i's connections/mounts and 4e-ii-a's delivery/local servers.

**Architecture:** existing typed Client and server DTOs; pure UI classifiers; an uncontrolled write-only client editor; a bounded consent lifecycle with BroadcastChannel/focus/closed hints; one shared connection reader for the card and badge. The gateway owns callback routing, script and CSP. No new package, Rust production change or service worker.

**Tech Stack:** React 19, strict TypeScript, Vitest and Playwright Chromium from the repository flake. The browser vendor is a dependency-free Node loopback fixture.

**Spec:** [Frontend](../specs/2026-09-26-frontend-design.md) §8; [Gateway](../specs/2026-09-26-mcp-gateway-design.md) §§4, 4.5, 7, 9; [8f](2026-10-15-gateway-oauth.md) Decisions and After this plan; [4e-i](2026-10-22-web-mcp.md) and [4e-ii-a](2026-10-23-web-mcp-delivery.md). The frontend lane copies `gateway-api-8e-8f.copy.md` and `gateway-api-4e.md` were reconciled against merged code; the code is the API contract.

**Base:** `4684d1d9` (#132 merged). Final 8f refresh follow-ups and boxed `CredentialStamp` changed Rust internals and refresh/stale-status semantics, with no protocol DTO or generated-web contract diff from the temporary `3e5c20f1` base. The ten web task commits were rebased with the 8f construction commits dropped. This plan is the first commit after the merged base.

## Execution status (2026-10-13)

**Executed; scoped re-confirmation is CONFIRMED WITH NOTES, and N1–N3 are taken.** The fleet parent approved the five-task outline and rulings 1–12 on 2026-10-13, authorized code-first construction on 8f, then supplied the early review amendments, merged-base rebase and final notes. Each task was tests then feature, observed assertion red before implementation. N1 is folded into Task 3 with noninteractive fixup/autosquash and signing disabled. The exact-code plan remains first after base `4684d1d9`; this execution record is a separate final documentation commit. The parent manages draft PR #133 and CI; the child made no GitHub action.

| Phase | Commits before this record |
|---|---|
| Plan first | `3ae5c3d0` |
| Task 1 | `c8e9f1b8`, `839efa26` |
| Task 2 | `e2894057`, `66025c47` |
| Task 3 | `09cdc34d`, `343e0faa` |
| Task 4 | `f4a9ceaa`, `c9a2bfbc` |
| Task 5 | `9fa9716e`, `72b348cd` |


**Review chain:** opus, on the maintainer's behalf, early range `3e5c20f1..dcd914bc`, **APPROVE AFTER AMENDMENTS** (parent, 2026-10-13). I1/M1–M10 are taken; M9's races are accepted fail-safe. Opus scoped re-confirmation for `4684d1d9..140b8049`, **CONFIRMED WITH NOTES** (parent, 2026-10-13), confirms every amendment and rulings 1–12 after rebase, with no UI assumption broken by 8f's final refresh/stamp changes. Parent authorized taking N1, recording N2/N3, fresh replay and this execution record. No further approval was inferred or requested.

**Rulings retained:** verified opener-null before navigation with the firm retained-handle click; protected fallback; origin-checked BroadcastChannel hints followed by server reads; main-window step-up followed by a fresh authorization click; consent pauses periodic reads only; neutral Working and unconfirmed copy without flow identity; last gateway report and hedged needs_auth; exact resource acceptance with no sent-parameter claim or vendor-word parser; https or http to this machine; unchanged PQ1–5 defaults; selected pending/active secret semantics; native write-only secret fields and manager residual; no service worker/push subscription before testers; backend-only callback routing/script/CSP; loopback-only, scratch-only, silent Node vendor.

**Scoped notes:** N1 names only a rendered Connect/Reconnect/Accept and connect action, or says only Confirmed when refetch leaves none. Red first: **2 failed / 6 passed**, then **8 passed** and typecheck exit 0. Seven selection/copy mutations each fail on assertions and restore bytes. N2 retains route-unmount close/disposal as fail-safe, without a server flow-cancel or automatic reopen. N3 records that browser success can arrive through focus/closed-handle reads; hint delivery is proved by unit tests plus 8f's matching envelope, with an isolated browser proof deferred under After this plan.

**Verification:** pre-notes merged-base complete gate exited 0: frozen install, both actual generators with no generated diff, typecheck, **1616 Vitest / 93 files**, build, required embedded binary/testkit build, **28 OAuth browser tests** and **86 full-browser passes / 11 existing skips**. N1 adds two tests. Fresh replay's five feature typechecks/full unit suites exit 0: **1542 / 1551 / 1591 / 1613 / 1618**, final **1618 / 93 files**. The required final-tip frozen install/typecheck/Vitest/build/binary-fake/full Playwright gate is run and its actual exits/counts logged before SSH push; no green claim comes from a pending command. Rust production source, dependencies, lock/Nix and generated DTOs remain unchanged, so workspace Rust tests/clippy are outside the authorized web-only brief.

**Probes:** the historical complete source matrix has **250 distinct assertion-failing mutations**, byte restoration verified, including every classifier outcome and side-effect boundary. The **7 N1 probes** cover old selection, Connect/Reconnect/Accept/none, acceptance-only fallback and conditional instruction copy: **257 historical/current records**. Invalid compile/timeout/nonunique-anchor evidence was rejected. M10's storage-origin/authorize and entered-secret challenges failed at both widths with the new browser assertions and passed with the former vacuous assertions; those raw receipts remain in the lane ledger. No type, test or rule was weakened.

**Fresh replay after N1:** fresh `frontend-4e3-replay-3` from `4684d1d9`, **81 code blocks / 24 files**, all **ten entire phase trees equal**, plan-first artifact tree equal and final tracked tree equal. Tests-only phases exit 1 with **32 / 5 / 9 / 2 / 1** assertion failures; Task 5 browser red repeats at **1280 and 390 px: 2 failed**, exit 1. Feature builds and each tree's own required binary/fake builds exit 0; both generator --check commands exit 0. Full replay Playwright: **86 passed / 11 skipped**, exit 0, including all 28 OAuth cases. No implementation was copied from git to make replay match. This record changes prose/README only, preserving every fenced payload. Copying just these final documentation artifacts to the replay is checked against the final tip's entire tree after the commit; no extra replay is needed for prose-only edits.

**Retained scratch:** `frontend-4e3-replay-1` (ordering failure rejected), successful pre-notes `frontend-4e3-replay-2`, fresh post-N1 `frontend-4e3-replay-3`, all under the named worktrees directory; lane ledger/probe logs and backup branches `scratch/frontend-4e-ii-b-before-review-autosquash`, `before-evidence-autosquash`, `before-plan-order`, `before-badge-order`, `before-N1-autosquash` (same prefix). No scratch was deleted and no Cargo target was shared. The first replay's badge-link ordering issue was fixed by moving the existing capability into Task 4, preserving final code and strengthening its assertion. Runtime cleanup is checked before push; parent owns scratch cleanup, CI/checks, reviewDecision, mergeStateStatus and unresolved review threads (bots included).

## Scope

Five tasks: typed routes/classifiers; OAuth choices/client settings; isolated Connect; last gateway report/probes/attention; real collector and loopback vendor browser proof at 1280 and 390 px. No account lookup, scope chooser, compatibility bypass, backend refresh change, duplicate callback, push subscription or service worker. No stronger promise of live health or completed consent than the server contract supplies.

## Decisions

Each ruling is **parent, 2026-10-13**.

1. **Popup isolation:** open blank synchronously on the click without the `noopener` feature, retaining the handle (firm B3). Set `w.opener = null` at once and verify it before navigating. Failure closes the handle and uses a fallback with `rel="noopener noreferrer"`. Read nothing from the main window's `window.opener`. BroadcastChannel is same-origin, but validate its exact origin and envelope; messages are hints, followed by a server read. Never fabricate success.
2. **Authorize step-up:** close blank, end the consent pause, confirm in the main window, then require a fresh Connect/Reconnect/Accept and connect click. Authorize disables transport auto-retry. Client configuration retains the existing shared step-up and one retry.
3. **Polling:** suspend periodic list reads during consent; retain event invalidation. The shared reader polls visible MCP at 60 seconds and other visible routes at five minutes, never hidden routes. Multiple waits pause until the last ends.
4. **Correlation/timestamps:** reports have no flow identity and second-resolution stamps can coincide. Equal/unreadable stamps or unchanged data remain pending; terminal hints/expiry without a changed report are unconfirmed. Missing items are unconfirmed. A new OAuth error is shown independently. Client time never authenticates the callback or proves a flow completed.
5. **Status/M4/probes:** cards and badges show the gateway's last report. `needs_auth` says sign-in may be needed; outage after expiry can produce it, so neither chip nor aria-label asserts definite revocation. A 200 probe can preserve a cooldown report; say the probe answered, not that it proves health or changed the report.
6. **Resource/consent subtypes:** offer acceptance only for `resource_mismatch`, using the exact advertised resource on the item. Refetch a stale 409 before the next click. `resource_foreign` has no acceptance action. Never claim `accepted_resource` was sent. Choose guidance from an own error code, never vendor wording; render vendor text as escaped, capped text.
7. **URL copy:** “https (or http to this machine)”, matching Decision 1 as built. The UI destination guard uses URL parsing, rejects userinfo and public HTTP, and accepts HTTPS or parsed loopback HTTP; it does not replace gateway metadata/egress validation.
8. **PQ1–5:** retain the defaults listed below exactly; no frontend resolution of a maintainer product question.
9. **Pending secrets:** prefer pending client settings, otherwise active. Keep only the same stored client ID; changed IDs require public/null or a replacement secret. A pending client uses “the vendor token endpoint it is pinned to at the next Connect”. Active grant stays until successful consent; never show stored secret values.
10. **Service worker:** outside this plan and outside 4f. No push subscribe UI ships before testers. Keep only the shared reader's invalidation seam; put the service-worker relay under After this plan.
11. **Callback ownership:** 8f owns the route, script and separate CSP. It sits outside operator-session routes, authenticates state/flow cookie, strips query data and answers no-store/no-referrer/nosniff. React implements no callback route, script or alternate callback authentication.
12. **E2E vendor:** dependency-free Node fixture, interactive consent and optional COOP, loopback only. Existing runtime helpers point HOME/XDG/data at scratch; the vendor writes no files and prints no secrets. Browser checks use a real embedded collector and paired test host, never a real vendor or user data.

### Early review amendments

All findings/rulings are **parent, 2026-10-13**, from the opus review on the maintainer's behalf.

| Finding | Decision and implementation |
|---|---|
| I1: a newer ok stamp is not consent identity | A successful agent use or probe can recover the old grant during consent. Ending the wait may stay, but say “The gateway now reports this connection as Working.” Never claim sign-in completed. Flow identity is a backend follow-up. |
| M1: name the real button | Confirmation names Connect, Reconnect or Accept and connect; retain acceptance intent through step-up. Browser expectation matches Reconnect. |
| M2: probe reply can be cached | “Probe answered. The card shows the gateway's report.” No live-health inference. |
| M3: hedge chip and badge | “May need sign-in” and “may need sign-in ... from the last gateway report”, matching the report paragraph. |
| M4: manager may offer to save | Match TokenForm's native password/post form and opt-outs; add secret-input `autocomplete="new-password"`. No custom text-security hack. Residual under After this plan. |
| M5: client clock skew | Local timeout is server `expires_at` minus response Date, clamped to one second–15 minutes; absent/unreadable server time uses 15 minutes. Never refuse based on browser time; server enforces expiry. Response metadata stays separate from wire JSON. |
| M6: closed blank | Check `popup.closed` before navigation; discard that handle and offer the isolated link immediately. |
| M7: delete scope | Confirmation names OAuth grant, client settings and mounts. Origin/kind changes also name grant/client loss, even when only client settings exist. |
| M8: pending endpoint | Say the pending client uses the vendor token endpoint pinned at the next Connect, not an already-established pin. |
| M9: races | Accepted as fail-safe. Late responses and replaced identities are guarded; this does not provide flow correlation or remove same-second ambiguity. Store/list invalidation coalesces reads and prevents an old in-flight list from overwriting a mutation. |
| M10: privacy assertion scope | Storage checks use actual vendor origin or `/authorize`; inspect input/textarea values during step-up and the secret input after save. Injected violations fail at both widths; reverted old assertions pass with those same violations. |

### Scoped re-confirmation notes (parent, 2026-10-13)

Opus, on the maintainer's behalf, returned **CONFIRMED WITH NOTES** for `4684d1d9..140b8049`, supplied by the parent on 2026-10-13. I1, M1–M10 and rulings 1–12 hold after the rebase; 8f's final refresh/stamp changes break no UI assumption. Draft PR #133 and running CI were reported by the parent, not queried by this child.

- **N1, taken in Task 3:** after main-window confirmation, a refetch can clear resource_mismatch while the item reports error and only Probe now remains. Name a Connect/Reconnect/Accept and connect button only when actually rendered. If no such button exists, say only “Confirmed.” Two regression assertions were observed red before the fix, then eight component tests and typecheck passed. Seven selection/copy mutations failed on assertions and restored exact bytes; no auto-retry or lifecycle behavior changed.
- **N2, retained:** leaving /mcp mid-consent runs unmount cleanup, closes the retained popup and disposes/aborts its local wait. This is accepted as fail-safe; it does not introduce a server flow-cancel operation or an automatic reopen.
- **N3, test-strength note:** browser success can also arrive through focus/closed-handle refetch, so current e2e success alone does not prove hint delivery. The hint path is proved by unit tests and 8f's matching callback envelope. A browser proof that isolates hint delivery is a follow-up under After this plan.

### Inherited open maintainer questions

**PQ1:** strict endpoint same-origin when authorization-response `iss` support is not advertised; no compatibility bypass or relaxed mix-up protection. **PQ2:** `resource_param_accepted` remains internal grant data, absent from the item; no UI flag or claim about a sent parameter. **PQ3:** request all advertised protected-resource scopes; no scope chooser. **PQ4:** cleaned vendor description remains escaped text, with its phishing residual; no trusted links/instructions or vendor-word parsing. **PQ5:** no early dead-refresh warning while valid access still works: unchanged status and no push. `account_label` is not learned in v1. These are defaults, not new answers.

## Global Constraints

- Plain `nix develop -c` in the named lane; no `path:` flakes, global installs, shared Cargo target, real-home writes, GitHub actions or scratch deletion. Signing disabled for every history operation. Personal author checked before SSH push; parent handles reviews and PR lifecycle.
- Existing namespace, ownership, 401 navigation and server step-up checks remain authoritative. No frontend authorization decision, token parsing, credential readback or backend compatibility exception. Do not auto-retry authorize after confirmation.
- No secret in React state, URLs, browser storage or retained rendered text. A replacement secret exists only in its uncontrolled DOM input and transient request needed by the existing configuration step-up retry. Clear before I/O/refusal; no stored secret readback. Native password fields cannot guarantee manager suppression.
- Hints trigger reads; only server reports drive Working/errors. Opener null is verified before navigation. COOP/closed handles do not prove consent ended. Dispose channels, timers, listeners and abortable work; stale replies cannot overwrite a replacement attempt.
- No raw HTML, CSP relaxation, callback duplication, popup-message handler or main-window opener access. Existing text isolation/capping and URL parsing remain intact. Exact Playwright text/role/label locators; Testing Library role/string matches are exact by default.
- Build tests before feature, observe assertion red, then green. Each classifier outcome and side-effect line gets a valid assertion-failing probe and byte-for-byte restoration. Reject compile-only/empty-suite/timeouts as evidence. Replay extracts >0 files and compares every entire tracked phase tree, including first-commit docs.

## Contract reconciliation

These are the ambiguous hand-off/spec points, reconciled against 8f as built and the parent's rulings; none is left as an implicit new product decision.

| Point | Reconciliation |
|---|---|
| Literal noopener versus firm B3 retained handle | Initial open omits the feature but immediately nulls and verifies the handle's opener; protected fallback has noopener/noreferrer. This is the expressly approved sequence. |
| General Client retry versus authorize | Configuration/probe use normal transport rules; authorize disables retry, closes blank and requires a fresh click after confirmation. |
| Ordinary list cadence versus pending consent | Pause periodic reads only; focus/visibility and terminal channel/closed/expiry hints still refetch. |
| Broadcast connected and newer ok versus flow completion | No flow identity is supplied. A newer ok stamp can be upstream recovery; use neutral Working, and preserve unconfirmed for missing/equal/unchanged reports. |
| Sign-in status versus live health | Connect, ordinary use and probes can stamp status. OAuth errors are independent; needs_auth includes expiry during outage, and probe 200 can be cached. Render only the last report. |
| Item timestamps versus a local wait clock | Second-resolution stamps compare server reports, not consent identity. A separate response Date supplies duration metadata without changing the DTO; absent Date is a bounded local wait, never a clock-based refusal. |
| Resource acceptance versus request audience | 409 stale acceptance refetches exact displayed comparison; foreign resources cannot be accepted. Internal resource_param_accepted is absent from the item; accepted_resource does not prove which parameter was sent. |
| Active/pending client and endpoint pin | Keep the selected pending slot, otherwise active, only for unchanged client ID. Saving a pending client is not a pin already established: it is pinned at the next Connect; the old grant stays meanwhile. |
| Callback as a frontend page | 8f's independent router/script/CSP owns it. Cross-site callback arrival need not carry the Strict operator cookie; React does not copy the callback or use opener data. |
| Vendor compatibility/scopes/description/early warning | PQ1–5 defaults stand; no vendor-word parser, account lookup or hidden refresh-health inference. |
| Push badge hand-off versus a service worker | Parent removes SW from this plan and 4f, and prohibits subscription UI before testers. Keep only connection invalidation now; relay is a follow-up. |
| Existing 8f fake server versus browser fixture | 8f's fake authorization server is Rust integration-test support, not an exported testkit/browser runner, and lacks the approved interactive consent/COOP controls. Use the dependency-free Node loopback fixture; no production route or new dependency. |

## Review Focus

- Popup isolation, retained-handle sequencing, fallback attributes, COOP, wrong-origin/envelope/id hints, current-attempt guards, server-only status and neutral I1 wording.
- Shared step-up versus fresh-click authorize, pending/active client intent, clear-before-I/O, changed-ID rejection, password-manager residual and secret absence at the confirmation boundary.
- Last-report state and independent OAuth error, exact resource acceptance/refusals, issuer/client re-save, cached probe reports, pause/event invalidation and stale read/disposal behavior.
- Real collector callback security headers/cookie/PKCE at both widths, loopback/scratch vendor and host, denied reconnect/mount preservation, no secret logs or real data; full web gate after 8f rebase.

## Reading the steps

Create writes the entire fenced file, including its trailing newline. Replace matches the complete Before file exactly once and writes After verbatim, preserving its trailing newline. The full preimage is the anchor taken from the actual base or preceding phase. Phase comments identify the immutable construction snapshot used for equality; they are evidence anchors, not commands to copy implementation from git. Run steps name commands explicitly; code fences are data.

The plan and README are first-commit artifacts and remain constant during replay. Exclude the superseded construction-only decision record from implementation phases. The harness rejects zero extracted blocks, missing preimages and unmatched phase trees. Replay uses a fresh named scratch worktree from `4684d1d9`, never the shared checkout. Tests-only phases must exit 1 on assertions; features must typecheck and pass their complete web unit gate. Task 5 additionally proves its vendor/browser red before green. Logs and probes live in `.superpowers/sdd/4e-ii-b/`; never delete scratch.

## File structure

| File | Purpose |
|---|---|
| `web/e2e/mcp-oauth.spec.ts` | Tests/proof |
| `web/e2e/oauth-vendor.ts` | Implementation |
| `web/src/api/client.ts` | Implementation |
| `web/src/api/mcp-oauth.test.ts` | Tests/proof |
| `web/src/api/mcp.ts` | Implementation |
| `web/src/components/ConnectionForm.tsx` | Implementation |
| `web/src/components/McpScope.test.tsx` | Tests/proof |
| `web/src/components/McpScope.tsx` | Implementation |
| `web/src/components/McpStatus.test.tsx` | Tests/proof |
| `web/src/components/McpStatus.tsx` | Implementation |
| `web/src/components/OauthClientForm.test.tsx` | Tests/proof |
| `web/src/components/OauthClientForm.tsx` | Implementation |
| `web/src/components/OauthConnect.test.tsx` | Tests/proof |
| `web/src/components/OauthConnect.tsx` | Implementation |
| `web/src/components/Shell.oauth.test.tsx` | Tests/proof |
| `web/src/components/Shell.tsx` | Implementation |
| `web/src/hooks/useMcpOauth.test.tsx` | Tests/proof |
| `web/src/hooks/useMcpOauth.ts` | Implementation |
| `web/src/lib/mcpOauth.test.ts` | Tests/proof |
| `web/src/lib/mcpOauth.ts` | Implementation |
| `web/src/manage.css` | Implementation |
| `web/src/screens/Mcp.test.tsx` | Tests/proof |
| `web/src/screens/Mcp.tsx` | Implementation |
| `web/src/test/oauthVendor.test.ts` | Tests/proof |

### Task 1: Typed OAuth routes and guarded UI verdicts

Add typed redirect/client/authorize/probe wrappers. Keep cookie/namespace behavior in Client, expose confirmation without request replay, and carry collector Date as response metadata. Classify every consent destination, hint, server report verdict, secret intent, action and code-only refusal; preserve an unknown guidance outcome.

<!-- PHASE 1 TEST 23743eef8af6f973101dee6d56aeae499b2e7f8c -->

**Files:** `web/src/api/client.ts`, `web/src/api/mcp-oauth.test.ts`, `web/src/lib/mcpOauth.test.ts`, `web/src/lib/mcpOauth.ts`.

- [ ] Step 1: Add the failing tests and the explicitly incomplete compileable harness placeholders.

**Replace:** `web/src/api/client.ts`

Before:

```typescript
// The typed transport (client view spec §6, frontend spec §3): every API
// call goes through `request`, which answers the three refusals the same
// way everywhere.
//
// - 401 `unauthenticated`: to the login screen, which returns here.
// - 403 `step_up_required`: the step-up dialog, then the request once more.
//   Safe to send again: every step-up check runs before its handler does
//   anything (`require_step_up` is a route or handler layer; the handlers
//   that check for themselves check before they read or write), so the
//   refused attempt changed nothing. Never a third time, never another
//   dialog.
// - Anything else not 2xx: an `ApiFailure` with the server's code.
//
// `mode` is left at fetch's default, `cors`: with it a same-origin `POST`
// carries `Origin`, which the server requires, under the page's
// `Referrer-Policy: no-referrer`.
import { ApiFailure, Unauthenticated, retryAfterSeconds } from './errors'
import { loginHref } from './next'

export interface ClientDeps {
  fetch: typeof fetch
  /** Navigate inside the app (`history.pushState`), never to another origin. */
  navigate: (to: string) => void
  /** The current path and query, without the fragment. */
  here: () => { pathname: string; search: string }
  /** Open the step-up dialog: resolves once stepped up, rejects with
   *  `StepUpCancelled` when dismissed. */
  stepUp: () => Promise<void>
}

export interface RequestOptions {
  /** `false` on the step-up routes themselves: a 403 there is an error. */
  stepUp?: boolean
  signal?: AbortSignal
}

/** Screens whose own 401s are answers, not a reason to go and sign in. */
const SIGN_IN_PAGES = ['/login', '/setup']

export class Client {
  private readonly deps: ClientDeps
  private steppingUp: Promise<void> | null = null

  constructor(deps: ClientDeps) {
    this.deps = deps
  }

  /** `method path` with a JSON body, answered as JSON (`undefined` for an
   *  empty answer). */
  async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    let response = await this.send(method, path, body, options.signal)
    if (options.stepUp !== false && (await isStepUpRequired(response))) {
      await this.stepUpOnce()
      response = await this.send(method, path, body, options.signal)
    }
    return this.answer<T>(response)
  }

  /** A `GET` whose answer the caller reads itself (the SSE helper): the 401
   *  rule applies; any other status is the caller's. */
  async open(path: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
    const response = await this.deps.fetch(path, { method: 'GET', headers, credentials: 'same-origin', signal })
    if (response.status === 401) await this.unauthenticated(response)
    return response
  }

  private send(method: string, path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const init: RequestInit = { method, headers, credentials: 'same-origin', signal }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    return this.deps.fetch(path, init)
  }

  /** One dialog for every request refused while it is open. */
  private stepUpOnce(): Promise<void> {
    if (!this.steppingUp) {
      this.steppingUp = this.deps.stepUp().finally(() => {
        this.steppingUp = null
      })
    }
    return this.steppingUp
  }

  private async answer<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204 || response.status === 205) return undefined as T
      const type = response.headers.get('content-type') ?? ''
      return (type.includes('application/json') ? await response.json() : await response.text()) as T
    }
    if (response.status === 401) await this.unauthenticated(response)
    const retryAfter = response.status === 429 ? retryAfterSeconds(response.headers.get('retry-after')) : undefined
    throw new ApiFailure(response.status, await errorBody(response), retryAfter)
  }

  /** A 401 `unauthenticated` sends the browser to sign in, and back here
   *  afterwards; on the sign-in screens it is only an error. */
  private async unauthenticated(response: Response): Promise<void> {
    const body = await errorBody(response.clone())
    const { pathname, search } = this.deps.here()
    if (body?.code !== 'unauthenticated' || SIGN_IN_PAGES.includes(pathname)) return
    this.deps.navigate(loginHref(pathname + search))
    throw new Unauthenticated()
  }
}

async function errorBody(
  response: Response,
): Promise<{ code?: string; message?: string; session_id?: string } | undefined> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { code, message, session_id } = body as Record<string, unknown>
      return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined,
        // A start whose delivery is unknown names the session it created.
        session_id: typeof session_id === 'string' ? session_id : undefined,
      }
    }
  } catch {
    // Not JSON: the status speaks for itself.
  }
  return undefined
}

async function isStepUpRequired(response: Response): Promise<boolean> {
  if (response.status !== 403) return false
  return (await errorBody(response.clone()))?.code === 'step_up_required'
}
```

After:

```typescript
// The typed transport (client view spec §6, frontend spec §3): every API
// call goes through `request`, which answers the three refusals the same
// way everywhere.
//
// - 401 `unauthenticated`: to the login screen, which returns here.
// - 403 `step_up_required`: the step-up dialog, then the request once more.
//   Safe to send again: every step-up check runs before its handler does
//   anything (`require_step_up` is a route or handler layer; the handlers
//   that check for themselves check before they read or write), so the
//   refused attempt changed nothing. Never a third time, never another
//   dialog.
// - Anything else not 2xx: an `ApiFailure` with the server's code.
//
// `mode` is left at fetch's default, `cors`: with it a same-origin `POST`
// carries `Origin`, which the server requires, under the page's
// `Referrer-Policy: no-referrer`.
import { ApiFailure, Unauthenticated, retryAfterSeconds } from './errors'
import { loginHref } from './next'

export interface ClientDeps {
  fetch: typeof fetch
  /** Navigate inside the app (`history.pushState`), never to another origin. */
  navigate: (to: string) => void
  /** The current path and query, without the fragment. */
  here: () => { pathname: string; search: string }
  /** Open the step-up dialog: resolves once stepped up, rejects with
   *  `StepUpCancelled` when dismissed. */
  stepUp: () => Promise<void>
}

export interface RequestOptions {
  /** `false` on the step-up routes themselves: a 403 there is an error. */
  stepUp?: boolean
  signal?: AbortSignal
}

/** Screens whose own 401s are answers, not a reason to go and sign in. */
const SIGN_IN_PAGES = ['/login', '/setup']

export class Client {
  private readonly deps: ClientDeps
  private steppingUp: Promise<void> | null = null

  constructor(deps: ClientDeps) {
    this.deps = deps
  }

  /** A fresh confirmation without resending a request (OAuth needs a new click). */
  async confirm(): Promise<void> {
    throw new Error('not implemented')
  }

  /** `method path` with a JSON body, answered as JSON (`undefined` for an
   *  empty answer). */
  async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    let response = await this.send(method, path, body, options.signal)
    if (options.stepUp !== false && (await isStepUpRequired(response))) {
      await this.stepUpOnce()
      response = await this.send(method, path, body, options.signal)
    }
    return this.answer<T>(response)
  }

  /** A `GET` whose answer the caller reads itself (the SSE helper): the 401
   *  rule applies; any other status is the caller's. */
  async open(path: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
    const response = await this.deps.fetch(path, { method: 'GET', headers, credentials: 'same-origin', signal })
    if (response.status === 401) await this.unauthenticated(response)
    return response
  }

  private send(method: string, path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const init: RequestInit = { method, headers, credentials: 'same-origin', signal }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    return this.deps.fetch(path, init)
  }

  /** One dialog for every request refused while it is open. */
  private stepUpOnce(): Promise<void> {
    if (!this.steppingUp) {
      this.steppingUp = this.deps.stepUp().finally(() => {
        this.steppingUp = null
      })
    }
    return this.steppingUp
  }

  private async answer<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204 || response.status === 205) return undefined as T
      const type = response.headers.get('content-type') ?? ''
      return (type.includes('application/json') ? await response.json() : await response.text()) as T
    }
    if (response.status === 401) await this.unauthenticated(response)
    const retryAfter = response.status === 429 ? retryAfterSeconds(response.headers.get('retry-after')) : undefined
    throw new ApiFailure(response.status, await errorBody(response), retryAfter)
  }

  /** A 401 `unauthenticated` sends the browser to sign in, and back here
   *  afterwards; on the sign-in screens it is only an error. */
  private async unauthenticated(response: Response): Promise<void> {
    const body = await errorBody(response.clone())
    const { pathname, search } = this.deps.here()
    if (body?.code !== 'unauthenticated' || SIGN_IN_PAGES.includes(pathname)) return
    this.deps.navigate(loginHref(pathname + search))
    throw new Unauthenticated()
  }
}

async function errorBody(
  response: Response,
): Promise<{ code?: string; message?: string; session_id?: string } | undefined> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { code, message, session_id } = body as Record<string, unknown>
      return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined,
        // A start whose delivery is unknown names the session it created.
        session_id: typeof session_id === 'string' ? session_id : undefined,
      }
    }
  } catch {
    // Not JSON: the status speaks for itself.
  }
  return undefined
}

async function isStepUpRequired(response: Response): Promise<boolean> {
  if (response.status !== 403) return false
  return (await errorBody(response.clone()))?.code === 'step_up_required'
}
```

**Create:** `web/src/api/mcp-oauth.test.ts`

```typescript
import { expect, it, vi } from 'vitest'
import { Client } from './client'
import * as mcp from './mcp'
import { json, stubServer } from '../test-server'
import { connection } from '../test-fixtures'

it('OAuth wrappers and explicit confirmation are available', () => {
  for (const name of ['oauthRedirect', 'setOauthClient', 'authorize', 'probe']) expect((mcp as unknown as Record<string, unknown>)[name]).toBeTypeOf('function')
})
it('confirms without sending a request and coalesces with normal step-up', async () => {
  let release!: () => void
  const stepUp = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, {})] })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const first = client.confirm()
  const second = client.confirm()
  const normal = client.request('POST', '/x', {})
  await vi.waitFor(() => expect(stepUp).toHaveBeenCalledTimes(1))
  release(); await Promise.all([first, second, normal])
  expect(server.sent).toHaveLength(2)
})
it('uses typed paths, bodies, cookie and required empty objects, without auto-retrying authorize', async () => {
  const server = stubServer({
    'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' }),
    'PUT /api/mcp/connections/a%2Fb/oauth-client': json(200, connection()),
    'POST /api/mcp/connections/a%2Fb/authorize': json(403, { code: 'step_up_required' }),
    'POST /api/mcp/connections/a%2Fb/probe': json(200, connection()),
  })
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const api = mcp as unknown as {
    oauthRedirect: (c: Client) => Promise<unknown>; setOauthClient: (c: Client, id: string, body: object) => Promise<unknown>
    authorize: (c: Client, id: string, body?: object) => Promise<unknown>; probe: (c: Client, id: string) => Promise<unknown>
  }
  await api.oauthRedirect(client); await api.setOauthClient(client, 'a/b', { client_id: 'id', client_secret: null })
  await expect(api.authorize(client, 'a/b')).rejects.toMatchObject({ code: 'step_up_required' })
  await api.probe(client, 'a/b')
  expect(stepUp).not.toHaveBeenCalled()
  expect(server.sent.map(s => s.body)).toEqual([undefined, { client_id: 'id', client_secret: null }, {}, {}])
})
```

**Create:** `web/src/lib/mcpOauth.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { connection } from '../test-fixtures'
import { clientRequest, completion, consentUrl, oauthAction, oauthGuidance, oauthHint } from './mcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
describe('consent destinations', () => {
  it.each(['https://vendor.example/consent?state=x', 'http://localhost:123/a', 'http://localhost.:123/a', 'http://127.1.2.3:123/a', 'http://[::1]:123/a'])('takes %s', url => expect(consentUrl(url)).toBe(new URL(url).href))
  it.each(['http://vendor.example/a', 'http://localhost.evil/a', 'http://evil.localhost/a', 'http://192.168.1.2/a', 'javascript:alert(1)', '//vendor.example/a', 'bad', 'https://user:secret@vendor.example/a', 'http://[::2]/a'])('refuses %s', url => expect(consentUrl(url)).toBeNull())
})
describe('callback hints', () => {
  const data = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  const event = (over: object = {}, origin = 'https://hennery.example') => new MessageEvent('message', { origin, data: { ...data, ...over } })
  it('takes only the matching return-origin hint', () => expect(oauthHint(event(), 'https://hennery.example', item.id)).toBe(true))
  it.each([{ type: 'other' }, { connection_id: 'other' }, { connection_id: '' }, { outcome: 'other' }, { result: 3 }])('refuses malformed or unrelated %j', over => expect(oauthHint(event(over), 'https://hennery.example', item.id)).toBe(false))
  it('refuses another origin and port', () => expect(oauthHint(event({}, 'https://hennery.example:444'), 'https://hennery.example', item.id)).toBe(false))
  it('refuses non-object data', () => expect(oauthHint(new MessageEvent('message', { origin: 'https://hennery.example', data: null }), 'https://hennery.example', item.id)).toBe(false))
})
describe('server-observed completion', () => {
  it('is connected only on a newer ok stamp', () => expect(completion(item, { ...item, status_at: '2026-10-03T10:00:01Z' })).toBe('connected'))
  it('is failed on a new server error', () => expect(completion(item, { ...item, oauth_error: { code: 'consent_denied', message: 'denied', at: item.status_at } })).toBe('failed'))
  it('is removed when the item went', () => expect(completion(item, undefined)).toBe('removed'))
  it.each([item, { ...item, status: 'error' as const, status_at: '2026-10-03T10:00:01Z' }, { ...item, status_at: 'invalid' }])('leaves identical, failing or unparseable reports pending', after => expect(completion(item, after)).toBe('pending'))
  it('does not mistake an identical old error for a new one', () => { const before = { ...item, oauth_error: { code: 'x', message: 'x', at: item.status_at } }; expect(completion(before, before)).toBe('pending') })
})
describe('client secret intent', () => {
  it('keeps only the same stored id', () => expect(clientRequest('id', 'id', 'keep', '')).toEqual({ client_id: 'id' }))
  it('explicitly selects public', () => expect(clientRequest(undefined, 'id', 'public', '')).toEqual({ client_id: 'id', client_secret: null }))
  it('sets a new secret', () => expect(clientRequest('old', 'new', 'replace', 'secret')).toEqual({ client_id: 'new', client_secret: 'secret' }))
  it.each([['old', 'new', 'keep', ''], [undefined, 'new', 'keep', ''], ['id', '', 'public', ''], ['id', 'id', 'replace', '']] as const)('refuses incomplete intent %j', (stored, id, mode, secret) => expect(clientRequest(stored, id, mode, secret)).toBeNull())
})
describe('OAuth action', () => {
  it.each([
    [connection(), 'none'], [connection({ cred_kind: 'oauth_client' }), 'client'],
    [connection({ cred_kind: 'oauth_dcr' }), 'connect'], [item, 'reconnect'],
    [{ ...item, status: 'needs_auth' }, 'reconnect'], [{ ...item, status: 'error' }, 'probe'],
  ] as const)('uses the reported kind/state', (c, action) => expect(oauthAction(c)).toBe(action))
})
describe('refusal guidance', () => {
  it.each(['issuer_changed', 'resource_mismatch', 'resource_foreign', 'no_oauth_client', 'no_registration_endpoint', 'too_many_flows', 'pkce_unsupported', 'insecure_metadata', 'egress_refused', 'upstream_unreachable', 'wrong_cred_kind', 'no_credential'])('explains %s', code => expect(oauthGuidance(code)).not.toBe(''))
  it('does not classify vendor wording or unknown codes', () => expect(oauthGuidance('vendor says invalid_target')).toBe(''))
})
```

**Create:** `web/src/lib/mcpOauth.ts`

```typescript
import type { McpConnectionItem, McpOauthClientRequest } from '../generated/protocol'

export function consentUrl(_input: string): string | null { return null }
export function oauthHint(_event: MessageEvent, _origin: string, _id: string): boolean { return false }
export function completion(_before: McpConnectionItem, _after: McpConnectionItem | undefined): 'connected' | 'failed' | 'pending' | 'removed' { return 'pending' }
export function clientRequest(_stored: string | undefined, _id: string, _mode: 'keep' | 'public' | 'replace', _secret: string): McpOauthClientRequest | null { return null }
export function oauthAction(_item: McpConnectionItem): 'connect' | 'reconnect' | 'client' | 'probe' | 'none' { return 'none' }
export function oauthGuidance(_code: string): string { return '' }
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/api/mcp-oauth.test.ts src/lib/mcpOauth.test.ts`; expect exit 1 from failing assertions, not a missing import or compile error. Keep its actual counts in the ledger.

<!-- END PHASE 1 TEST -->

<!-- PHASE 1 FEATURE 131643ffaae3c1678be5b93cd8d955420fa2747e -->

**Files:** `web/src/api/client.ts`, `web/src/api/mcp-oauth.test.ts`, `web/src/api/mcp.ts`, `web/src/lib/mcpOauth.test.ts`, `web/src/lib/mcpOauth.ts`.

- [ ] Step 3: Apply the exact feature files.

**Replace:** `web/src/api/client.ts`

Before:

```typescript
// The typed transport (client view spec §6, frontend spec §3): every API
// call goes through `request`, which answers the three refusals the same
// way everywhere.
//
// - 401 `unauthenticated`: to the login screen, which returns here.
// - 403 `step_up_required`: the step-up dialog, then the request once more.
//   Safe to send again: every step-up check runs before its handler does
//   anything (`require_step_up` is a route or handler layer; the handlers
//   that check for themselves check before they read or write), so the
//   refused attempt changed nothing. Never a third time, never another
//   dialog.
// - Anything else not 2xx: an `ApiFailure` with the server's code.
//
// `mode` is left at fetch's default, `cors`: with it a same-origin `POST`
// carries `Origin`, which the server requires, under the page's
// `Referrer-Policy: no-referrer`.
import { ApiFailure, Unauthenticated, retryAfterSeconds } from './errors'
import { loginHref } from './next'

export interface ClientDeps {
  fetch: typeof fetch
  /** Navigate inside the app (`history.pushState`), never to another origin. */
  navigate: (to: string) => void
  /** The current path and query, without the fragment. */
  here: () => { pathname: string; search: string }
  /** Open the step-up dialog: resolves once stepped up, rejects with
   *  `StepUpCancelled` when dismissed. */
  stepUp: () => Promise<void>
}

export interface RequestOptions {
  /** `false` on the step-up routes themselves: a 403 there is an error. */
  stepUp?: boolean
  signal?: AbortSignal
}

/** Screens whose own 401s are answers, not a reason to go and sign in. */
const SIGN_IN_PAGES = ['/login', '/setup']

export class Client {
  private readonly deps: ClientDeps
  private steppingUp: Promise<void> | null = null

  constructor(deps: ClientDeps) {
    this.deps = deps
  }

  /** A fresh confirmation without resending a request (OAuth needs a new click). */
  async confirm(): Promise<void> {
    throw new Error('not implemented')
  }

  /** `method path` with a JSON body, answered as JSON (`undefined` for an
   *  empty answer). */
  async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    let response = await this.send(method, path, body, options.signal)
    if (options.stepUp !== false && (await isStepUpRequired(response))) {
      await this.stepUpOnce()
      response = await this.send(method, path, body, options.signal)
    }
    return this.answer<T>(response)
  }

  /** A `GET` whose answer the caller reads itself (the SSE helper): the 401
   *  rule applies; any other status is the caller's. */
  async open(path: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
    const response = await this.deps.fetch(path, { method: 'GET', headers, credentials: 'same-origin', signal })
    if (response.status === 401) await this.unauthenticated(response)
    return response
  }

  private send(method: string, path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const init: RequestInit = { method, headers, credentials: 'same-origin', signal }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    return this.deps.fetch(path, init)
  }

  /** One dialog for every request refused while it is open. */
  private stepUpOnce(): Promise<void> {
    if (!this.steppingUp) {
      this.steppingUp = this.deps.stepUp().finally(() => {
        this.steppingUp = null
      })
    }
    return this.steppingUp
  }

  private async answer<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204 || response.status === 205) return undefined as T
      const type = response.headers.get('content-type') ?? ''
      return (type.includes('application/json') ? await response.json() : await response.text()) as T
    }
    if (response.status === 401) await this.unauthenticated(response)
    const retryAfter = response.status === 429 ? retryAfterSeconds(response.headers.get('retry-after')) : undefined
    throw new ApiFailure(response.status, await errorBody(response), retryAfter)
  }

  /** A 401 `unauthenticated` sends the browser to sign in, and back here
   *  afterwards; on the sign-in screens it is only an error. */
  private async unauthenticated(response: Response): Promise<void> {
    const body = await errorBody(response.clone())
    const { pathname, search } = this.deps.here()
    if (body?.code !== 'unauthenticated' || SIGN_IN_PAGES.includes(pathname)) return
    this.deps.navigate(loginHref(pathname + search))
    throw new Unauthenticated()
  }
}

async function errorBody(
  response: Response,
): Promise<{ code?: string; message?: string; session_id?: string } | undefined> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { code, message, session_id } = body as Record<string, unknown>
      return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined,
        // A start whose delivery is unknown names the session it created.
        session_id: typeof session_id === 'string' ? session_id : undefined,
      }
    }
  } catch {
    // Not JSON: the status speaks for itself.
  }
  return undefined
}

async function isStepUpRequired(response: Response): Promise<boolean> {
  if (response.status !== 403) return false
  return (await errorBody(response.clone()))?.code === 'step_up_required'
}
```

After:

```typescript
// The typed transport (client view spec §6, frontend spec §3): every API
// call goes through `request`, which answers the three refusals the same
// way everywhere.
//
// - 401 `unauthenticated`: to the login screen, which returns here.
// - 403 `step_up_required`: the step-up dialog, then the request once more.
//   Safe to send again: every step-up check runs before its handler does
//   anything (`require_step_up` is a route or handler layer; the handlers
//   that check for themselves check before they read or write), so the
//   refused attempt changed nothing. Never a third time, never another
//   dialog.
// - Anything else not 2xx: an `ApiFailure` with the server's code.
//
// `mode` is left at fetch's default, `cors`: with it a same-origin `POST`
// carries `Origin`, which the server requires, under the page's
// `Referrer-Policy: no-referrer`.
import { ApiFailure, Unauthenticated, retryAfterSeconds } from './errors'
import { loginHref } from './next'

export interface ClientDeps {
  fetch: typeof fetch
  /** Navigate inside the app (`history.pushState`), never to another origin. */
  navigate: (to: string) => void
  /** The current path and query, without the fragment. */
  here: () => { pathname: string; search: string }
  /** Open the step-up dialog: resolves once stepped up, rejects with
   *  `StepUpCancelled` when dismissed. */
  stepUp: () => Promise<void>
}

export interface RequestOptions {
  /** `false` on the step-up routes themselves: a 403 there is an error. */
  stepUp?: boolean
  signal?: AbortSignal
  /** Same-origin response metadata, separate from the JSON wire body. */
  onResponse?: (response: Response) => void
}

/** Screens whose own 401s are answers, not a reason to go and sign in. */
const SIGN_IN_PAGES = ['/login', '/setup']

export class Client {
  private readonly deps: ClientDeps
  private steppingUp: Promise<void> | null = null

  constructor(deps: ClientDeps) {
    this.deps = deps
  }

  /** A fresh confirmation without resending a request (OAuth needs a new click). */
  async confirm(): Promise<void> {
    await this.stepUpOnce()
  }

  /** `method path` with a JSON body, answered as JSON (`undefined` for an
   *  empty answer). */
  async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    let response = await this.send(method, path, body, options.signal)
    if (options.stepUp !== false && (await isStepUpRequired(response))) {
      await this.stepUpOnce()
      response = await this.send(method, path, body, options.signal)
    }
    options.onResponse?.(response)
    return this.answer<T>(response)
  }

  /** A `GET` whose answer the caller reads itself (the SSE helper): the 401
   *  rule applies; any other status is the caller's. */
  async open(path: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
    const response = await this.deps.fetch(path, { method: 'GET', headers, credentials: 'same-origin', signal })
    if (response.status === 401) await this.unauthenticated(response)
    return response
  }

  private send(method: string, path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const init: RequestInit = { method, headers, credentials: 'same-origin', signal }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    return this.deps.fetch(path, init)
  }

  /** One dialog for every request refused while it is open. */
  private stepUpOnce(): Promise<void> {
    if (!this.steppingUp) {
      this.steppingUp = this.deps.stepUp().finally(() => {
        this.steppingUp = null
      })
    }
    return this.steppingUp
  }

  private async answer<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204 || response.status === 205) return undefined as T
      const type = response.headers.get('content-type') ?? ''
      return (type.includes('application/json') ? await response.json() : await response.text()) as T
    }
    if (response.status === 401) await this.unauthenticated(response)
    const retryAfter = response.status === 429 ? retryAfterSeconds(response.headers.get('retry-after')) : undefined
    throw new ApiFailure(response.status, await errorBody(response), retryAfter)
  }

  /** A 401 `unauthenticated` sends the browser to sign in, and back here
   *  afterwards; on the sign-in screens it is only an error. */
  private async unauthenticated(response: Response): Promise<void> {
    const body = await errorBody(response.clone())
    const { pathname, search } = this.deps.here()
    if (body?.code !== 'unauthenticated' || SIGN_IN_PAGES.includes(pathname)) return
    this.deps.navigate(loginHref(pathname + search))
    throw new Unauthenticated()
  }
}

async function errorBody(
  response: Response,
): Promise<{ code?: string; message?: string; session_id?: string } | undefined> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { code, message, session_id } = body as Record<string, unknown>
      return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined,
        // A start whose delivery is unknown names the session it created.
        session_id: typeof session_id === 'string' ? session_id : undefined,
      }
    }
  } catch {
    // Not JSON: the status speaks for itself.
  }
  return undefined
}

async function isStepUpRequired(response: Response): Promise<boolean> {
  if (response.status !== 403) return false
  return (await errorBody(response.clone()))?.code === 'step_up_required'
}
```

**Replace:** `web/src/api/mcp-oauth.test.ts`

Before:

```typescript
import { expect, it, vi } from 'vitest'
import { Client } from './client'
import * as mcp from './mcp'
import { json, stubServer } from '../test-server'
import { connection } from '../test-fixtures'

it('OAuth wrappers and explicit confirmation are available', () => {
  for (const name of ['oauthRedirect', 'setOauthClient', 'authorize', 'probe']) expect((mcp as unknown as Record<string, unknown>)[name]).toBeTypeOf('function')
})
it('confirms without sending a request and coalesces with normal step-up', async () => {
  let release!: () => void
  const stepUp = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, {})] })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const first = client.confirm()
  const second = client.confirm()
  const normal = client.request('POST', '/x', {})
  await vi.waitFor(() => expect(stepUp).toHaveBeenCalledTimes(1))
  release(); await Promise.all([first, second, normal])
  expect(server.sent).toHaveLength(2)
})
it('uses typed paths, bodies, cookie and required empty objects, without auto-retrying authorize', async () => {
  const server = stubServer({
    'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' }),
    'PUT /api/mcp/connections/a%2Fb/oauth-client': json(200, connection()),
    'POST /api/mcp/connections/a%2Fb/authorize': json(403, { code: 'step_up_required' }),
    'POST /api/mcp/connections/a%2Fb/probe': json(200, connection()),
  })
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const api = mcp as unknown as {
    oauthRedirect: (c: Client) => Promise<unknown>; setOauthClient: (c: Client, id: string, body: object) => Promise<unknown>
    authorize: (c: Client, id: string, body?: object) => Promise<unknown>; probe: (c: Client, id: string) => Promise<unknown>
  }
  await api.oauthRedirect(client); await api.setOauthClient(client, 'a/b', { client_id: 'id', client_secret: null })
  await expect(api.authorize(client, 'a/b')).rejects.toMatchObject({ code: 'step_up_required' })
  await api.probe(client, 'a/b')
  expect(stepUp).not.toHaveBeenCalled()
  expect(server.sent.map(s => s.body)).toEqual([undefined, { client_id: 'id', client_secret: null }, {}, {}])
})
```

After:

```typescript
import { expect, it, vi } from 'vitest'
import { Client } from './client'
import * as mcp from './mcp'
import { json, stubServer } from '../test-server'
import { connection } from '../test-fixtures'

it('OAuth wrappers and explicit confirmation are available', () => {
  for (const name of ['oauthRedirect', 'setOauthClient', 'authorize', 'probe']) expect((mcp as unknown as Record<string, unknown>)[name]).toBeTypeOf('function')
})
it('carries the collector Date header as separate authorize metadata', async () => {
  const server = stubServer({ 'POST /api/mcp/connections/id/authorize': json(200, { consent_url: 'https://vendor.example/authorize', expires_at: '2026-10-13T10:15:00Z' }, { Date: 'Tue, 13 Oct 2026 10:00:00 GMT' }) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  await expect(mcp.authorize(client, 'id')).resolves.toMatchObject({ serverTime: Date.parse('2026-10-13T10:00:00Z') })
})
it('confirms without sending a request and coalesces with normal step-up', async () => {
  let release!: () => void
  const stepUp = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, {})] })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const normal = client.request('POST', '/x', {})
  await vi.waitFor(() => expect(stepUp).toHaveBeenCalledTimes(1))
  const first = client.confirm()
  const second = client.confirm()
  release(); await Promise.all([first, second, normal])
  expect(stepUp).toHaveBeenCalledTimes(1)
  expect(server.sent).toHaveLength(2)
})
it('uses typed paths, bodies, cookie and required empty objects, without auto-retrying authorize', async () => {
  const server = stubServer({
    'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' }),
    'PUT /api/mcp/connections/a%2Fb/oauth-client': json(200, connection()),
    'POST /api/mcp/connections/a%2Fb/authorize': json(403, { code: 'step_up_required' }),
    'POST /api/mcp/connections/a%2Fb/probe': json(200, connection()),
  })
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }), stepUp })
  const api = mcp as unknown as {
    oauthRedirect: (c: Client) => Promise<unknown>; setOauthClient: (c: Client, id: string, body: object) => Promise<unknown>
    authorize: (c: Client, id: string, body?: object) => Promise<unknown>; probe: (c: Client, id: string) => Promise<unknown>
  }
  await expect(api.oauthRedirect(client)).resolves.toEqual({ redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' })
  await expect(api.setOauthClient(client, 'a/b', { client_id: 'id', client_secret: null })).resolves.toEqual(connection())
  await expect(api.authorize(client, 'a/b')).rejects.toMatchObject({ code: 'step_up_required' })
  await expect(api.probe(client, 'a/b')).resolves.toEqual(connection())
  expect(stepUp).not.toHaveBeenCalled()
  expect(server.sent.map(s => s.body)).toEqual([undefined, { client_id: 'id', client_secret: null }, {}, {}])
})

it.each([undefined, 'bad'])('ignores unusable server Date %s and forwards the attempt signal', async date => {
  const fetch = vi.fn(async () => json(200, { consent_url: 'https://vendor.example/authorize', expires_at: 'bad' }, date ? { Date: date } : {}))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const signal = new AbortController().signal
  expect((await mcp.authorize(client, 'id', {}, signal)).serverTime).toBeUndefined()
  expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBe(signal)
})
it('metadata observes only the final response after normal step-up', async () => {
  const server = stubServer({ 'POST /x': [json(403, { code: 'step_up_required' }), json(200, { answer: true })] })
  const metadata = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  await client.request('POST', '/x', {}, { onResponse: metadata })
  expect(metadata).toHaveBeenCalledTimes(1); expect(metadata.mock.calls[0][0].status).toBe(200)
})
it('a rejected confirmation can be requested again without sending anything', async () => {
  const fetch = vi.fn(); const stepUp = vi.fn().mockRejectedValueOnce(new Error('cancelled')).mockResolvedValueOnce(undefined)
  const client = new Client({ fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  await expect(client.confirm()).rejects.toThrow('cancelled'); await client.confirm()
  expect(stepUp).toHaveBeenCalledTimes(2); expect(fetch).not.toHaveBeenCalled()
})
```

**Replace:** `web/src/api/mcp.ts`

Before:

```typescript
// The MCP gateway's connection routes (gateway spec §9, plan 8a), typed.
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
  return client.request('GET', '/api/mcp/connections')
}

/** Step-up. */
export function createConnection(client: Client, connection: CreateMcpConnectionRequest): Promise<McpConnectionItem> {
  return client.request('POST', '/api/mcp/connections', connection)
}

/** Step-up when the change names `url`, `cred_kind`, `internal_network`,
 *  `static_header` or `static_prefix`, even with the stored value: send
 *  only what changed. */
export function updateConnection(
  client: Client,
  connectionId: string,
  change: UpdateMcpConnectionRequest,
): Promise<McpConnectionItem> {
  return client.request('PATCH', `/api/mcp/connections/${id(connectionId)}`, change)
}

/** Step-up. Its mounts and token go with it. */
export function deleteConnection(client: Client, connectionId: string): Promise<void> {
  return client.request('DELETE', `/api/mcp/connections/${id(connectionId)}`)
}

/** The whole set of hosts, replacing the one before. */
export function replaceMounts(client: Client, connectionId: string, hostIds: string[]): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/mounts`, { host_ids: hostIds })
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

After:

```typescript
// The MCP gateway's connection routes (gateway spec §9, plan 8a), typed.
// Which of them need a fresh step-up is the server's to say: the client
// opens the dialog on 403 `step_up_required` and retries once.
import type {
  CreateMcpConnectionRequest,
  McpConnectionItem,
  UpdateMcpConnectionRequest,
  McpStdioServerSet,
  McpStdioServersRequest,
  McpOauthRedirect,
  McpOauthClientRequest,
  McpAuthorizeRequest,
  McpAuthorizeResponse,
} from '../generated/protocol'
import type { Client } from './client'

const id = (value: string) => encodeURIComponent(value)

export function connections(client: Client): Promise<McpConnectionItem[]> {
  return client.request('GET', '/api/mcp/connections')
}

/** Step-up. */
export function createConnection(client: Client, connection: CreateMcpConnectionRequest): Promise<McpConnectionItem> {
  return client.request('POST', '/api/mcp/connections', connection)
}

/** Step-up when the change names `url`, `cred_kind`, `internal_network`,
 *  `static_header` or `static_prefix`, even with the stored value: send
 *  only what changed. */
export function updateConnection(
  client: Client,
  connectionId: string,
  change: UpdateMcpConnectionRequest,
): Promise<McpConnectionItem> {
  return client.request('PATCH', `/api/mcp/connections/${id(connectionId)}`, change)
}

/** Step-up. Its mounts and token go with it. */
export function deleteConnection(client: Client, connectionId: string): Promise<void> {
  return client.request('DELETE', `/api/mcp/connections/${id(connectionId)}`)
}

/** The whole set of hosts, replacing the one before. */
export function replaceMounts(client: Client, connectionId: string, hostIds: string[]): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/mounts`, { host_ids: hostIds })
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

export function oauthRedirect(client: Client): Promise<McpOauthRedirect> {
  return client.request('GET', '/api/mcp/oauth/redirect-uri')
}

export function setOauthClient(client: Client, connectionId: string, body: McpOauthClientRequest): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/oauth-client`, body)
}

/** Authorize needs another click after confirmation, never an automatic retry. */
export async function authorize(client: Client, connectionId: string, body: McpAuthorizeRequest = {}, signal?: AbortSignal): Promise<McpAuthorizeResponse & { serverTime?: number }> {
  let serverTime: number | undefined
  const result = await client.request<McpAuthorizeResponse>('POST', `/api/mcp/connections/${id(connectionId)}/authorize`, body, {
    stepUp: false, signal, onResponse: response => {
      const date = Date.parse(response.headers.get('date') ?? '')
      if (Number.isFinite(date)) serverTime = date
    },
  })
  return { ...result, serverTime }
}

export function probe(client: Client, connectionId: string): Promise<McpConnectionItem> {
  return client.request('POST', `/api/mcp/connections/${id(connectionId)}/probe`, {})
}
```

**Replace:** `web/src/lib/mcpOauth.test.ts`

Before:

```typescript
import { describe, expect, it } from 'vitest'
import { connection } from '../test-fixtures'
import { clientRequest, completion, consentUrl, oauthAction, oauthGuidance, oauthHint } from './mcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
describe('consent destinations', () => {
  it.each(['https://vendor.example/consent?state=x', 'http://localhost:123/a', 'http://localhost.:123/a', 'http://127.1.2.3:123/a', 'http://[::1]:123/a'])('takes %s', url => expect(consentUrl(url)).toBe(new URL(url).href))
  it.each(['http://vendor.example/a', 'http://localhost.evil/a', 'http://evil.localhost/a', 'http://192.168.1.2/a', 'javascript:alert(1)', '//vendor.example/a', 'bad', 'https://user:secret@vendor.example/a', 'http://[::2]/a'])('refuses %s', url => expect(consentUrl(url)).toBeNull())
})
describe('callback hints', () => {
  const data = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  const event = (over: object = {}, origin = 'https://hennery.example') => new MessageEvent('message', { origin, data: { ...data, ...over } })
  it('takes only the matching return-origin hint', () => expect(oauthHint(event(), 'https://hennery.example', item.id)).toBe(true))
  it.each([{ type: 'other' }, { connection_id: 'other' }, { connection_id: '' }, { outcome: 'other' }, { result: 3 }])('refuses malformed or unrelated %j', over => expect(oauthHint(event(over), 'https://hennery.example', item.id)).toBe(false))
  it('refuses another origin and port', () => expect(oauthHint(event({}, 'https://hennery.example:444'), 'https://hennery.example', item.id)).toBe(false))
  it('refuses non-object data', () => expect(oauthHint(new MessageEvent('message', { origin: 'https://hennery.example', data: null }), 'https://hennery.example', item.id)).toBe(false))
})
describe('server-observed completion', () => {
  it('is connected only on a newer ok stamp', () => expect(completion(item, { ...item, status_at: '2026-10-03T10:00:01Z' })).toBe('connected'))
  it('is failed on a new server error', () => expect(completion(item, { ...item, oauth_error: { code: 'consent_denied', message: 'denied', at: item.status_at } })).toBe('failed'))
  it('is removed when the item went', () => expect(completion(item, undefined)).toBe('removed'))
  it.each([item, { ...item, status: 'error' as const, status_at: '2026-10-03T10:00:01Z' }, { ...item, status_at: 'invalid' }])('leaves identical, failing or unparseable reports pending', after => expect(completion(item, after)).toBe('pending'))
  it('does not mistake an identical old error for a new one', () => { const before = { ...item, oauth_error: { code: 'x', message: 'x', at: item.status_at } }; expect(completion(before, before)).toBe('pending') })
})
describe('client secret intent', () => {
  it('keeps only the same stored id', () => expect(clientRequest('id', 'id', 'keep', '')).toEqual({ client_id: 'id' }))
  it('explicitly selects public', () => expect(clientRequest(undefined, 'id', 'public', '')).toEqual({ client_id: 'id', client_secret: null }))
  it('sets a new secret', () => expect(clientRequest('old', 'new', 'replace', 'secret')).toEqual({ client_id: 'new', client_secret: 'secret' }))
  it.each([['old', 'new', 'keep', ''], [undefined, 'new', 'keep', ''], ['id', '', 'public', ''], ['id', 'id', 'replace', '']] as const)('refuses incomplete intent %j', (stored, id, mode, secret) => expect(clientRequest(stored, id, mode, secret)).toBeNull())
})
describe('OAuth action', () => {
  it.each([
    [connection(), 'none'], [connection({ cred_kind: 'oauth_client' }), 'client'],
    [connection({ cred_kind: 'oauth_dcr' }), 'connect'], [item, 'reconnect'],
    [{ ...item, status: 'needs_auth' }, 'reconnect'], [{ ...item, status: 'error' }, 'probe'],
  ] as const)('uses the reported kind/state', (c, action) => expect(oauthAction(c)).toBe(action))
})
describe('refusal guidance', () => {
  it.each(['issuer_changed', 'resource_mismatch', 'resource_foreign', 'no_oauth_client', 'no_registration_endpoint', 'too_many_flows', 'pkce_unsupported', 'insecure_metadata', 'egress_refused', 'upstream_unreachable', 'wrong_cred_kind', 'no_credential'])('explains %s', code => expect(oauthGuidance(code)).not.toBe(''))
  it('does not classify vendor wording or unknown codes', () => expect(oauthGuidance('vendor says invalid_target')).toBe(''))
})
```

After:

```typescript
import { describe, expect, it } from 'vitest'
import { connection } from '../test-fixtures'
import { clientRequest, completion, consentTimeout, consentUrl, oauthAction, oauthGuidance, oauthHint } from './mcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
describe('consent destinations', () => {
  it.each(['https://vendor.example/consent?state=x', 'http://localhost:123/a', 'http://localhost.:123/a', 'http://127.1.2.3:123/a', 'http://[::1]:123/a'])('takes %s', url => expect(consentUrl(url)).toBe(new URL(url).href))
  it.each(['http://vendor.example/a', 'http://localhost.evil/a', 'http://evil.localhost/a', 'http://192.168.1.2/a', 'javascript:alert(1)', '//vendor.example/a', 'bad', 'https://user:secret@vendor.example/a', 'http://[::2]/a'])('refuses %s', url => expect(consentUrl(url)).toBeNull())
})
describe('callback hints', () => {
  const data = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  const event = (over: object = {}, origin = 'https://hennery.example') => new MessageEvent('message', { origin, data: { ...data, ...over } })
  it('takes only the matching return-origin hint', () => expect(oauthHint(event(), 'https://hennery.example', item.id)).toBe(true))
  it.each([{ type: 'other' }, { connection_id: 'other' }, { connection_id: '' }, { outcome: 'other' }, { result: 3 }])('refuses malformed or unrelated %j', over => expect(oauthHint(event(over), 'https://hennery.example', item.id)).toBe(false))
  it('refuses another origin and port', () => expect(oauthHint(event({}, 'https://hennery.example:444'), 'https://hennery.example', item.id)).toBe(false))
  it('refuses non-object data', () => expect(oauthHint(new MessageEvent('message', { origin: 'https://hennery.example', data: null }), 'https://hennery.example', item.id)).toBe(false))
})
describe('server-observed completion', () => {
  it('reports working on a newer ok stamp, without claiming consent', () => expect(completion(item, { ...item, status_at: '2026-10-03T10:00:01Z' })).toBe('working'))
  it('can observe recovered upstream use while consent is still pending', () => expect(completion({ ...item, status: 'needs_auth' }, { ...item, status_at: '2026-10-03T10:00:01Z' })).toBe('working'))
  it('is failed on a new server error', () => expect(completion(item, { ...item, oauth_error: { code: 'consent_denied', message: 'denied', at: item.status_at } })).toBe('failed'))
  it('is removed when the item went', () => expect(completion(item, undefined)).toBe('removed'))
  it.each([item, { ...item, status: 'error' as const, status_at: '2026-10-03T10:00:01Z' }, { ...item, status_at: 'invalid' }])('leaves identical, failing or unparseable reports pending', after => expect(completion(item, after)).toBe('pending'))
  it('does not mistake an identical old error for a new one', () => { const before = { ...item, oauth_error: { code: 'x', message: 'x', at: item.status_at } }; expect(completion(before, before)).toBe('pending') })
})
describe('local consent timeout', () => {
  it('uses server duration without the client clock', () => expect(consentTimeout('2026-10-13T10:02:00Z', Date.parse('2026-10-13T10:00:00Z'))).toBe(120000))
  it('uses the bounded flow lifetime when server time is absent', () => expect(consentTimeout('2000-01-01T00:00:00Z')).toBe(900000))
  it('caps excessive server durations', () => expect(consentTimeout('2027-10-13T10:00:00Z', Date.parse('2026-10-13T10:00:00Z'))).toBe(900000))
  it('never refuses an already elapsed server duration', () => expect(consentTimeout('2026-10-13T09:00:00Z', Date.parse('2026-10-13T10:00:00Z'))).toBe(1000))
  it('uses the bounded lifetime for unreadable stamps', () => expect(consentTimeout('bad', Number.NaN)).toBe(900000))
})
describe('client secret intent', () => {
  it('keeps only the same stored id', () => expect(clientRequest('id', 'id', 'keep', '')).toEqual({ client_id: 'id' }))
  it('explicitly selects public', () => expect(clientRequest(undefined, 'id', 'public', '')).toEqual({ client_id: 'id', client_secret: null }))
  it('sets a new secret', () => expect(clientRequest('old', 'new', 'replace', 'secret')).toEqual({ client_id: 'new', client_secret: 'secret' }))
  it.each([['old', 'new', 'keep', ''], [undefined, 'new', 'keep', ''], ['id', '', 'public', ''], ['id', 'id', 'replace', '']] as const)('refuses incomplete intent %j', (stored, id, mode, secret) => expect(clientRequest(stored, id, mode, secret)).toBeNull())
})
describe('OAuth action', () => {
  it.each([
    [connection(), 'none'], [connection({ cred_kind: 'oauth_client' }), 'client'],
    [connection({ cred_kind: 'oauth_dcr' }), 'connect'], [item, 'reconnect'],
    [{ ...item, status: 'needs_auth' }, 'reconnect'], [{ ...item, status: 'error' }, 'probe'],
  ] as const)('uses the reported kind/state', (c, action) => expect(oauthAction(c)).toBe(action))
})
describe('refusal guidance', () => {
  it.each(['issuer_changed', 'resource_mismatch', 'resource_foreign', 'no_oauth_client', 'no_registration_endpoint', 'too_many_flows', 'pkce_unsupported', 'insecure_metadata', 'egress_refused', 'upstream_unreachable', 'wrong_cred_kind', 'no_credential'])('explains %s', code => expect(oauthGuidance(code)).not.toBe(''))
  it('does not classify vendor wording or unknown codes', () => expect(oauthGuidance('vendor says invalid_target')).toBe(''))
})

it.each(['constructor', '__proto__', 'toString'])('does not inherit guidance for %s', code => expect(oauthGuidance(code)).toBe(''))
it.each(['http://127.1/a', 'http://2130706433/a', 'http://%6cocalhost/a', 'HTTP://LOCALHOST:80/a'])('uses URL-decoded destination %s', url => expect(consentUrl(url)).toBe(new URL(url).href))
it('takes failed hints and the bounded result, rejecting oversized and primitive envelopes', () => {
  const origin = 'https://hennery.example'
  const data = { type: 'done', connection_id: item.id, outcome: 'failed', result: 'x'.repeat(128) }
  const hint = (value: unknown) => oauthHint(new MessageEvent('message', { origin, data: value }), origin, item.id)
  expect(hint(data)).toBe(true); expect(hint({ ...data, result: 'x'.repeat(129) })).toBe(false)
  expect(hint('done')).toBe(false); expect(hint(1)).toBe(false)
})
```

**Replace:** `web/src/lib/mcpOauth.ts`

Before:

```typescript
import type { McpConnectionItem, McpOauthClientRequest } from '../generated/protocol'

export function consentUrl(_input: string): string | null { return null }
export function oauthHint(_event: MessageEvent, _origin: string, _id: string): boolean { return false }
export function completion(_before: McpConnectionItem, _after: McpConnectionItem | undefined): 'connected' | 'failed' | 'pending' | 'removed' { return 'pending' }
export function clientRequest(_stored: string | undefined, _id: string, _mode: 'keep' | 'public' | 'replace', _secret: string): McpOauthClientRequest | null { return null }
export function oauthAction(_item: McpConnectionItem): 'connect' | 'reconnect' | 'client' | 'probe' | 'none' { return 'none' }
export function oauthGuidance(_code: string): string { return '' }
```

After:

```typescript
import type { McpConnectionItem, McpOauthClientRequest } from '../generated/protocol'
/** A local wait bound, not authorization validity. No client clock enters
 *  the duration; without a collector Date header use its 15-minute TTL.
 *  Even an elapsed/unreadable stamp permits navigation: the server expires flows. */
export function consentTimeout(expiresAt: string, serverTime?: number): number {
  const duration = Date.parse(expiresAt) - (serverTime ?? Number.NaN)
  return Number.isFinite(duration) ? Math.max(1000, Math.min(900000, duration)) : 900000
}

/** Mirrors the kernel's OAuth scheme rule, with no userinfo. URL parses
 *  escaped/numeric hosts before the loopback check; suffixes are not trusted. */
export function consentUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    const loopback = host === 'localhost' || host === '[::1]' || /^127\.\d+\.\d+\.\d+$/.test(host)
    return url.protocol === 'https:' || (url.protocol === 'http:' && loopback) ? url.href : null
  } catch { return null }
}

/** A channel is same-origin, but still check the envelope; its outcome is
 *  never a status update. Nothing is received through window.opener. */
export function oauthHint(event: MessageEvent, origin: string, id: string): boolean {
  if (event.origin !== origin || !event.data || typeof event.data !== 'object') return false
  const d = event.data as Record<string, unknown>
  return d.type === 'done' && d.connection_id === id &&
    (d.outcome === 'connected' || d.outcome === 'failed') && typeof d.result === 'string' && d.result.length <= 128
}

/** An observed report change cannot identify the flow that caused it. */
export function completion(before: McpConnectionItem, after: McpConnectionItem | undefined): 'working' | 'failed' | 'pending' | 'removed' {
  if (!after) return 'removed'
  if (after.oauth_error && JSON.stringify(after.oauth_error) !== JSON.stringify(before.oauth_error)) return 'failed'
  if (after.status === 'ok' && Date.parse(after.status_at) > Date.parse(before.status_at)) return 'working'
  return 'pending'
}

export function clientRequest(stored: string | undefined, id: string, mode: 'keep' | 'public' | 'replace', secret: string): McpOauthClientRequest | null {
  if (!id || (mode === 'keep' && id !== stored) || (mode === 'replace' && !secret)) return null
  return { client_id: id, ...(mode === 'public' ? { client_secret: null } : mode === 'replace' ? { client_secret: secret } : {}) }
}

export function oauthAction(item: McpConnectionItem): 'connect' | 'reconnect' | 'client' | 'probe' | 'none' {
  if (item.cred_kind !== 'oauth_dcr' && item.cred_kind !== 'oauth_client') return 'none'
  if (item.status === 'error') return 'probe'
  if (item.cred_kind === 'oauth_client' && !item.oauth?.client_id) return 'client'
  return item.has_credential ? 'reconnect' : 'connect'
}

/** Code only: vendor text never selects a recovery action. */
export function oauthGuidance(code: string): string {
  const words: Record<string, string> = {
    issuer_changed: 'The authorization server changed. Review and save the vendor client again before connecting.',
    resource_mismatch: 'Compare the server URL with the advertised resource before accepting it.',
    resource_foreign: 'The advertised resource cannot be accepted. Check the server URL.',
    no_oauth_client: 'Save the client registered at the vendor first.',
    no_registration_endpoint: 'This vendor does not offer automatic registration. Edit the connection to use a pre-registered client.',
    too_many_flows: 'Sixteen sign-ins are in progress. Wait for one to finish or expire.',
    pkce_unsupported: 'This vendor does not advertise the required PKCE S256 protection.',
    insecure_metadata: 'OAuth addresses must use https (or http to this machine).',
    egress_refused: 'The address was refused by the gateway network policy. Review the connection and its network setting.',
    upstream_unreachable: 'The authorization server could not be reached. Try again when it is available.',
    wrong_cred_kind: 'This operation does not match the connection’s authentication method.',
    no_credential: 'Save a token or connect before probing this connection.',
  }
  return Object.hasOwn(words, code) ? words[code] : ''
}
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web typecheck` and `nix develop -c pnpm --dir web test`; both must exit 0. Review the task diff against the named lane rules, check the author, commit with signing disabled and push the own branch after green. Parent performs the task review.

<!-- END PHASE 1 FEATURE -->

### Task 2: OAuth kinds and write-only vendor clients

Gate DCR and pre-registered OAuth choices on mcp_oauth. Prefer pending settings; keep only the same client ID, explicitly null public clients and clear replacement secrets before I/O. Reuse native TokenForm password/manager handling with new-password autocomplete. Origin/kind/delete confirmation names the grant and settings, even without a grant.

<!-- PHASE 2 TEST 2e653fda4084c8c9af9bf32c26fa202de84559df -->

**Files:** `web/src/components/OauthClientForm.test.tsx`, `web/src/components/OauthClientForm.tsx`.

- [ ] Step 1: Add the failing tests and the explicitly incomplete compileable harness placeholders.

**Create:** `web/src/components/OauthClientForm.test.tsx`

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'

const item = connection({ cred_kind: 'oauth_client', oauth: { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback', client_id: 'active', has_client_secret: true, pending_client: { client_id: 'pending', has_client_secret: true } } })
function setup() {
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, item) })
  const onChanged = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={onChanged} /></ClientContext.Provider>)
  return { ...server, onChanged }
}
it('starts from pending settings and explains the grant stays until consent', () => {
  setup(); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
})
it('keeps the secret of the selected slot, never the active id', async () => {
  const s = setup(); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending' })
})
it('does not let a changed id inherit a secret', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new secret or a public client for a new client ID.')
  expect(s.sent).toHaveLength(0)
})
it('explicit public client sends null', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending', client_secret: null })
})
it('clears secret before I/O, opts out of managers and correction, and ignores a duplicate send', async () => {
  let finish!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret')
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'off')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
})
```

**Create:** `web/src/components/OauthClientForm.tsx`

```typescript
import type { McpConnectionItem } from '../generated/protocol'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm(_props: OauthClientProps) { return null }
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/components/OauthClientForm.test.tsx src/screens/Mcp.test.tsx`; expect exit 1 from failing assertions, not a missing import or compile error. Keep its actual counts in the ledger.

<!-- END PHASE 2 TEST -->

<!-- PHASE 2 FEATURE e39de1c0e42d3acda4d77b1ef815febe54cab773 -->

**Files:** `web/src/components/ConnectionForm.tsx`, `web/src/components/OauthClientForm.test.tsx`, `web/src/components/OauthClientForm.tsx`, `web/src/components/Shell.tsx`, `web/src/manage.css`, `web/src/screens/Mcp.test.tsx`, `web/src/screens/Mcp.tsx`.

- [ ] Step 3: Apply the exact feature files.

**Replace:** `web/src/components/ConnectionForm.tsx`

Before:

```typescript
// The form a connection is created or edited in (frontend spec §8, gateway
// spec §2). The slug and the hat are asked for only on create: neither can
// change afterwards. The token is not part of it: it is set on its own,
// write-only (TokenForm).
import { useId, useState, type FormEvent } from 'react'
import type { HatItem } from '../generated/protocol'
import { kindLabel, serverName, toolList, type ConnectionForm as Form } from '../lib/mcp'
import { Text, visible } from '../lib/text'

interface Props {
  initial: Form
  /** On create: the hats to pick from, and the one picked first. */
  create?: { hats: HatItem[]; hatId: string }
  submit: string
  busy: boolean
  error: string | null
  onSubmit: (form: Form, slug: string, hatId: string) => void
  onCancel: () => void
}

export default function ConnectionForm({ initial, create, submit, busy, error, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState(initial)
  const [slug, setSlug] = useState('')
  const [hatId, setHatId] = useState(create?.hatId ?? '')
  const ids = useId()
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const noTools = !form.everyTool && toolList(form.tools).length === 0

  // While a request runs the buttons say so but stay focusable: a disabled
  // button that has focus drops it to the page's body (and the step-up
  // dialog returns focus to it). The screen ignores a second send, and
  // Cancel waits for the answer: a request already sent still lands.
  const send = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(form, slug, hatId)
  }

  return (
    <form className="connection-form" onSubmit={send}>
      <label className="field">
        <span className="field-label">Name</span>
        {/* The form opens with focus here: what opened it is disabled or
            gone. */}
        <input
          className="text-input"
          value={form.label}
          maxLength={64}
          autoFocus
          onChange={(e) => set('label', e.target.value)}
        />
      </label>
      {create && (
        <>
          <label className="field">
            <span className="field-label">Slug</span>
            <input
              className="text-input mono"
              value={slug}
              maxLength={48}
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={`${ids}-slug`}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <p className="hint" id={`${ids}-slug`}>
            Agents see it as <code>{visible(serverName(slug.trim() || '<slug>'))}</code>. Lower-case letters, digits and
            hyphens; it cannot change later.
          </p>
        </>
      )}
      <label className="field">
        <span className="field-label">Server URL</span>
        <input
          className="text-input mono"
          value={form.url}
          inputMode="url"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="https://mcp.example.com/mcp"
          onChange={(e) => set('url', e.target.value)}
        />
      </label>
      {create && (
        <>
          <label className="select-field">
            <span className="field-label">Hat</span>
            <select value={hatId} aria-describedby={`${ids}-hat`} onChange={(e) => setHatId(e.target.value)}>
              {create.hats.map((h) => (
                <option key={h.id} value={h.id}>
                  {visible(h.name)}
                </option>
              ))}
            </select>
          </label>
          <p className="hint" id={`${ids}-hat`}>
            Only sessions in this hat get it, and it stays in this hat.
          </p>
        </>
      )}
      <label className="select-field">
        <span className="field-label">Authentication</span>
        <select value={form.credKind} onChange={(e) => set('credKind', e.target.value as Form['credKind'])}>
          <option value="none">None</option>
          <option value="static">Token</option>
          {form.credKind !== 'none' && form.credKind !== 'static' && (
            <option value={form.credKind} disabled>
              {kindLabel(form.credKind)}
            </option>
          )}
        </select>
      </label>
      {form.credKind === 'static' && (
        <>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Header</span>
              <input
                className="text-input mono"
                value={form.header}
                maxLength={64}
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => set('header', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Prefix</span>
              <input
                className="text-input mono"
                value={form.prefix}
                maxLength={32}
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => set('prefix', e.target.value)}
              />
            </label>
          </div>
          <p className="hint">
            The token is sent as <code>{visible(form.header.trim() || 'Header')}: {visible(form.prefix)}&lt;token&gt;</code>.
            The prefix may be empty; mind its trailing space. You set the token after saving.
          </p>
        </>
      )}
      <label className="check">
        <input type="checkbox" checked={form.everyTool} onChange={(e) => set('everyTool', e.target.checked)} />
        <span>Every tool</span>
      </label>
      {!form.everyTool && (
        <>
          <label className="field">
            <span className="field-label">Allowed tools</span>
            <textarea
              className="text-input mono"
              rows={3}
              value={form.tools}
              spellCheck={false}
              onChange={(e) => set('tools', e.target.value)}
            />
          </label>
          <p className="hint">One tool name per line, or separated by commas.</p>
          {noTools && <p className="hint warn">No tool is allowed: agents see this server with none.</p>}
        </>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={form.internalNetwork}
          onChange={(e) => set('internalNetwork', e.target.checked)}
        />
        <span>Internal network</span>
      </label>
      {form.internalNetwork && (
        <p className="hint warn">
          The gateway may then reach addresses on your own network for this connection, and plain http to them.
          Turn it on only for a server you run there.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      <div className="card-actions">
        <button type="submit" className="btn btn-primary btn-sm" aria-disabled={busy}>
          {submit}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => busy || onCancel()} aria-disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  )
}
```

After:

```typescript
// The form a connection is created or edited in (frontend spec §8, gateway
// spec §2). The slug and the hat are asked for only on create: neither can
// change afterwards. The token is not part of it: it is set on its own,
// write-only (TokenForm).
import { useId, useState, type FormEvent } from 'react'
import type { HatItem } from '../generated/protocol'
import { kindLabel, serverName, toolList, type ConnectionForm as Form } from '../lib/mcp'
import { Text, visible } from '../lib/text'

interface Props {
  oauth?: boolean
  redirectUri?: string
  initial: Form
  /** On create: the hats to pick from, and the one picked first. */
  create?: { hats: HatItem[]; hatId: string }
  submit: string
  busy: boolean
  error: string | null
  onSubmit: (form: Form, slug: string, hatId: string) => void
  onCancel: () => void
}

export default function ConnectionForm({ initial, create, submit, busy, error, onSubmit, onCancel, oauth = false, redirectUri }: Props) {
  const [form, setForm] = useState(initial)
  const [slug, setSlug] = useState('')
  const [hatId, setHatId] = useState(create?.hatId ?? '')
  const ids = useId()
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const noTools = !form.everyTool && toolList(form.tools).length === 0

  // While a request runs the buttons say so but stay focusable: a disabled
  // button that has focus drops it to the page's body (and the step-up
  // dialog returns focus to it). The screen ignores a second send, and
  // Cancel waits for the answer: a request already sent still lands.
  const send = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(form, slug, hatId)
  }

  return (
    <form className="connection-form" onSubmit={send}>
      <label className="field">
        <span className="field-label">Name</span>
        {/* The form opens with focus here: what opened it is disabled or
            gone. */}
        <input
          className="text-input"
          value={form.label}
          maxLength={64}
          autoFocus
          onChange={(e) => set('label', e.target.value)}
        />
      </label>
      {create && (
        <>
          <label className="field">
            <span className="field-label">Slug</span>
            <input
              className="text-input mono"
              value={slug}
              maxLength={48}
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={`${ids}-slug`}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <p className="hint" id={`${ids}-slug`}>
            Agents see it as <code>{visible(serverName(slug.trim() || '<slug>'))}</code>. Lower-case letters, digits and
            hyphens; it cannot change later.
          </p>
        </>
      )}
      <label className="field">
        <span className="field-label">Server URL</span>
        <input
          className="text-input mono"
          value={form.url}
          inputMode="url"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="https://mcp.example.com/mcp"
          onChange={(e) => set('url', e.target.value)}
        />
      </label>
      {create && (
        <>
          <label className="select-field">
            <span className="field-label">Hat</span>
            <select value={hatId} aria-describedby={`${ids}-hat`} onChange={(e) => setHatId(e.target.value)}>
              {create.hats.map((h) => (
                <option key={h.id} value={h.id}>
                  {visible(h.name)}
                </option>
              ))}
            </select>
          </label>
          <p className="hint" id={`${ids}-hat`}>
            Only sessions in this hat get it, and it stays in this hat.
          </p>
        </>
      )}
      <label className="select-field">
        <span className="field-label">Authentication</span>
        <select value={form.credKind} onChange={(e) => set('credKind', e.target.value as Form['credKind'])}>
          <option value="none">None</option>
          <option value="static">Token</option>
          {oauth && <><option value="oauth_dcr">OAuth: automatic registration</option><option value="oauth_client">OAuth: pre-registered client</option></>}
          {!oauth && form.credKind !== 'none' && form.credKind !== 'static' && (
            <option value={form.credKind} disabled>
              {kindLabel(form.credKind)}
            </option>
          )}
        </select>
      </label>
      {oauth && (form.credKind === 'oauth_client' || form.credKind === 'oauth_dcr') && <p className="hint">OAuth addresses use https (or http to this machine). You connect after saving.
        {form.credKind === 'oauth_client' && <> Register this redirect URI at the vendor: <Text className="mono">{redirectUri ?? 'Loading…'}</Text>. Enter its client settings after saving.</>}
      </p>}
      {form.credKind === 'static' && (
        <>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Header</span>
              <input
                className="text-input mono"
                value={form.header}
                maxLength={64}
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => set('header', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Prefix</span>
              <input
                className="text-input mono"
                value={form.prefix}
                maxLength={32}
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => set('prefix', e.target.value)}
              />
            </label>
          </div>
          <p className="hint">
            The token is sent as <code>{visible(form.header.trim() || 'Header')}: {visible(form.prefix)}&lt;token&gt;</code>.
            The prefix may be empty; mind its trailing space. You set the token after saving.
          </p>
        </>
      )}
      <label className="check">
        <input type="checkbox" checked={form.everyTool} onChange={(e) => set('everyTool', e.target.checked)} />
        <span>Every tool</span>
      </label>
      {!form.everyTool && (
        <>
          <label className="field">
            <span className="field-label">Allowed tools</span>
            <textarea
              className="text-input mono"
              rows={3}
              value={form.tools}
              spellCheck={false}
              onChange={(e) => set('tools', e.target.value)}
            />
          </label>
          <p className="hint">One tool name per line, or separated by commas.</p>
          {noTools && <p className="hint warn">No tool is allowed: agents see this server with none.</p>}
        </>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={form.internalNetwork}
          onChange={(e) => set('internalNetwork', e.target.checked)}
        />
        <span>Internal network</span>
      </label>
      {form.internalNetwork && (
        <p className="hint warn">
          The gateway may then reach addresses on your own network for this connection, and plain http to them.
          Turn it on only for a server you run there.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      <div className="card-actions">
        <button type="submit" className="btn btn-primary btn-sm" aria-disabled={busy}>
          {submit}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => busy || onCancel()} aria-disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  )
}
```

**Replace:** `web/src/components/OauthClientForm.test.tsx`

Before:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'

const item = connection({ cred_kind: 'oauth_client', oauth: { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback', client_id: 'active', has_client_secret: true, pending_client: { client_id: 'pending', has_client_secret: true } } })
function setup() {
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, item) })
  const onChanged = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={onChanged} /></ClientContext.Provider>)
  return { ...server, onChanged }
}
it('starts from pending settings and explains the grant stays until consent', () => {
  setup(); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
})
it('keeps the secret of the selected slot, never the active id', async () => {
  const s = setup(); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending' })
})
it('does not let a changed id inherit a secret', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new secret or a public client for a new client ID.')
  expect(s.sent).toHaveLength(0)
})
it('explicit public client sends null', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending', client_secret: null })
})
it('clears secret before I/O, opts out of managers and correction, and ignores a duplicate send', async () => {
  let finish!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret')
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'off')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
})
```

After:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'

const item = connection({ cred_kind: 'oauth_client', oauth: { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback', client_id: 'active', has_client_secret: true, pending_client: { client_id: 'pending', has_client_secret: true } } })
function setup() {
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, item) })
  const onChanged = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={onChanged} /></ClientContext.Provider>)
  return { ...server, onChanged }
}
it('starts from pending settings and explains the grant stays until consent', () => {
  setup(); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
  expect(document.body.textContent).toContain('The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect.')
})
it('keeps the secret of the selected slot, never the active id', async () => {
  const s = setup(); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending' })
})
it('does not let a changed id inherit a secret', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new secret or a public client for a new client ID.')
  expect(s.sent).toHaveLength(0)
})
it('explicit public client sends null', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending', client_secret: null })
})
it('clears secret before I/O, opts out of managers and correction, and ignores a duplicate send', async () => {
  let finish!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret')
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'new-password')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  expect(field).toHaveAttribute('data-lpignore', 'true'); expect(field).toHaveAttribute('data-bwignore', '')
  expect(field).toHaveAttribute('data-form-type', 'other'); expect(field).toHaveAttribute('name', 'vendor-client-secret')
  expect(field.closest('form')).toHaveAttribute('method', 'post'); expect(field.closest('form')).toHaveAttribute('autocomplete', 'off')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ client_id: 'pending', client_secret: 'secret-canary' })
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'false')
  fireEvent.change(field, { target: { value: 'replacement' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => finish(json(200, item))); expect(screen.getByRole('status')).toHaveTextContent('Client saved.')
  fireEvent.change(field, { target: { value: 'next' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(screen.queryByRole('status')).toBeNull(); await act(async () => finish(json(200, item)))
})
it('clears saved feedback when the destination changes', async () => {
  const server = stubServer({ ['PUT /api/mcp/connections/' + item.id + '/oauth-client']: json(200, item) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item)); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await screen.findByRole('status'); s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(screen.queryByRole('status')).toBeNull()
})
it('clears a retained field and resets draft intent on URL, kind or stored-client change', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item))
  fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'draft' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret'); fireEvent.change(field, { target: { value: 'discarded' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } }); expect(field).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const retained = screen.getByLabelText('Client secret'); fireEvent.change(retained, { target: { value: 'discarded-again' } })
  s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(retained).toHaveValue(''); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByLabelText('Client secret action')).toHaveValue('keep')
  s.rerender(view({ ...item, oauth: { ...item.oauth!, pending_client: { client_id: 'new', has_client_secret: false } } }))
  expect(screen.getByLabelText('Client ID')).toHaveValue('new')
})
it('shares a pending public-client write even though its request needs no entered secret', async () => {
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(ok => { resolve = ok }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  const save = screen.getByRole('button', { name: 'Save client' })
  fireEvent.click(save); fireEvent.click(save); expect(fetch).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => resolve(json(200, item))); expect(save).toHaveAttribute('aria-disabled', 'false')
})
```

**Replace:** `web/src/components/OauthClientForm.tsx`

Before:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm(_props: OauthClientProps) { return null }
```

After:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useClient } from '../app-client'
import { setOauthClient } from '../api/mcp'
import { messageOf } from '../api/errors'
import { clientRequest } from '../lib/mcpOauth'
import { Text } from '../lib/text'
import { originOf } from '../lib/mcp'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm({ connection: c, onChanged }: OauthClientProps) {
  const client = useClient()
  const slot = c.oauth?.pending_client ?? c.oauth
  const stored = slot?.client_id
  const [id, setId] = useState(stored ?? '')
  const [mode, setMode] = useState<'keep' | 'public' | 'replace'>(stored ? 'keep' : 'public')
  const field = useRef<HTMLInputElement>(null)
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setId(stored ?? ''); setMode(stored ? 'keep' : 'public'); setSaved(false)
    if (field.current) field.current.value = ''
  }, [stored, c.url, c.cred_kind])
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (running.current) return
    const secret = field.current?.value ?? ''
    if (field.current) field.current.value = ''
    setSaved(false)
    const body = clientRequest(stored, id, mode, secret)
    if (!body) { setError('Choose a new secret or a public client for a new client ID. Enter a client ID and any replacement secret.'); return }
    running.current = true; setBusy(true); setError(null)
    try { onChanged(await setOauthClient(client, c.id, body)); setSaved(true) }
    catch (err) { setError(messageOf(err)) }
    finally { running.current = false; setBusy(false) }
  }
  return <section aria-label="Pre-registered OAuth client" className="oauth-client">
    <p>Register this redirect URI at the vendor: <Text className="mono">{c.oauth?.redirect_uri ?? ''}</Text></p>
    {c.oauth?.client_id && <p>Active client: <Text className="mono">{c.oauth.client_id}</Text>. Active secret: {c.oauth.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Pending client: <Text className="mono">{c.oauth.pending_client.client_id}</Text>. Pending secret: {c.oauth.pending_client.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.</p>}
    <p>Client secret: {slot?.has_client_secret ? 'Stored; never shown again.' : 'None stored.'}</p>
    <form method="post" autoComplete="off" onSubmit={send}>
      <label className="field"><span className="field-label">Client ID</span><input className="text-input mono" value={id} maxLength={512} autoComplete="off" spellCheck={false} onChange={e => setId(e.target.value)} /></label>
      <label className="select-field"><span className="field-label">Client secret action</span><select value={mode} onChange={e => { if (field.current) field.current.value = ''; setMode(e.target.value as typeof mode) }}>
        {stored && <option value="keep">Keep stored settings for this client ID</option>}
        <option value="public">Public client (no secret)</option><option value="replace">Set a new secret</option>
      </select></label>
      {mode === 'replace' && <label className="field"><span className="field-label">Client secret</span><input ref={field} type="password" className="text-input mono" name="vendor-client-secret" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="" data-lpignore="true" data-bwignore="" data-form-type="other" /></label>}
      <p className="hint">Client settings for <Text>{c.label}</Text> at <Text>{originOf(c.url) ?? c.url}</Text>, hat <Text>{c.hat_id}</Text>. The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect. No route shows it again.</p>
      <button type="submit" className="btn btn-primary btn-sm" aria-disabled={busy}>Save client</button>
      {saved && <p role="status">Client saved. Connect to authorize it.</p>}
      {error && <p className="form-error" role="alert"><Text>{error}</Text></p>}
    </form>
  </section>
}
```

**Replace:** `web/src/components/Shell.tsx`

Before:

```typescript
// The signed-in app's frame (frontend spec §2): one component tree for every
// width (F-3). From 768 px a rail with the views beside the content; under
// it a top bar and a bottom tab bar. Which views exist comes from
// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
import { useEffect, useState } from 'react'
import { capabilities } from '../api/auth'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { CapabilitiesResponse } from '../generated/protocol'
import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
import { Icon } from '../lib/ui'
import { Link, type Route } from '../router'
import Hats from '../screens/Hats'
import Hosts from '../screens/Hosts'
import NewSession from '../screens/NewSession'
import Mcp from '../screens/Mcp'
import Placeholder from '../screens/Placeholder'
import SignOut from './SignOut'
import SessionView from '../screens/Session'
import { useMediaQuery } from '../hooks/useMediaQuery'
import SessionList from './SessionList'
import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'

/** The rail's width and up (frontend spec §2). */
export const DESKTOP = '(min-width: 768px)'

const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
  sessions: Icon.List,
  new: Icon.Plus,
  hosts: Icon.Cpu,
  mcp: Icon.Wrench,
  hats: Icon.Sparkle,
  settings: Icon.Shield,
}

/** `/sessions/:id`: the session, its header fed by the list store's summary
 *  (kept current by the list stream) when the list holds it. A session the
 *  view finds gone leaves the list. While the
 *  list's first page is on its way the header waits for it; only a session
 *  the list does not hold fetches its detail. The address is the selection
 *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
function SessionRoute({ id }: { id: string }) {
  const list = useSessionScope()?.list
  return (
    <SessionView
      id={id}
      summary={list?.all.get(id)}
      awaitSummary={!!list && list.loading && !list.error}
      onRemoved={list?.remove}
    />
  )
}

export default function Shell({ route }: { route: Route }) {
  const client = useClient()
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const desktop = useMediaQuery(DESKTOP)

  useEffect(() => {
    let live = true
    setError(null)
    capabilities(client).then(
      (c) => live && setCaps(c),
      (err) => {
        // A 401 has already sent the browser to sign in.
        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
      },
    )
    return () => {
      live = false
    }
  }, [client, attempt])

  if (!caps) {
    return (
      <main className="auth">
        <div className="auth-card" role="status">
          {error ? (
            <>
              <p className="form-error">
                <bdi>{error}</bdi>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </main>
    )
  }

  const views = viewsOf(caps.mode)
  const current = viewOf(route.name)
  const shown = current !== null && views.includes(current)
  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'

  const frame = (
    <div className="app">
      <aside className="rail" aria-label="Views">
        <div className="rail-head">
          <span className="brand-name">hennery</span>
          <WaitingBadge />
        </div>
        {views.includes('new') && (
          <Link to={PATH.new} className="new-btn">
            <Icon.Plus size={17} /> New session
          </Link>
        )}
        <nav className="rail-nav">
          {views
            .filter((v) => v !== 'new')
            .map((v) => {
              const Glyph = ICON[v]
              return (
                <Link
                  key={v}
                  to={PATH[v]}
                  className={'nav-item' + (v === current ? ' on' : '')}
                  aria-current={v === current ? 'page' : undefined}
                >
                  <Glyph size={17} /> {LABEL[v]}
                </Link>
              )
            })}
        </nav>
        <div className="rail-scroll">{desktop && <SessionList />}</div>
        <div className="rail-foot">
          <SignOut />
        </div>
      </aside>
      <div className="shell">
        <header className="mtopbar">
          <div className="mtb-mid">
            <div className="mtb-eyebrow">hennery</div>
            <div className="mtb-title">{title}</div>
          </div>
          <WaitingBadge />
        </header>
        <main className="main">
          {route.name === 'not_found' ? (
            <Placeholder title="Not found" text="No page lives at this address." />
          ) : !shown ? (
            <Placeholder title={title} text="This view is not part of this deployment." />
          ) : route.name === 'hosts' ? (
            <Hosts />
          ) : route.name === 'hats' ? (
            <Hats />
          ) : route.name === 'sessions' && !desktop ? (
            <SessionList screen />
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
            // A desktop at /sessions with no row to open: an empty hat, a
            // search with no match, or before the first page has come.
            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
          ) : (
            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
          )}
        </main>
        <nav className="tabbar" aria-label="Tabs">
          {tabsOf(caps.mode).map((v) => {
            const Glyph = ICON[v]
            return (
              <Link
                key={v}
                to={PATH[v]}
                className={'tab' + (v === current ? ' on' : '')}
                aria-current={v === current ? 'page' : undefined}
              >
                <Glyph size={20} />
                <span>{v === 'new' ? 'New' : LABEL[v]}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
  return views.includes('sessions') ? (
    <SessionScope route={route} desktop={desktop}>
      {frame}
    </SessionScope>
  ) : (
    frame
  )
}
```

After:

```typescript
// The signed-in app's frame (frontend spec §2): one component tree for every
// width (F-3). From 768 px a rail with the views beside the content; under
// it a top bar and a bottom tab bar. Which views exist comes from
// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
import { useEffect, useState } from 'react'
import { capabilities } from '../api/auth'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { CapabilitiesResponse } from '../generated/protocol'
import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
import { Icon } from '../lib/ui'
import { Link, type Route } from '../router'
import Hats from '../screens/Hats'
import Hosts from '../screens/Hosts'
import NewSession from '../screens/NewSession'
import Mcp from '../screens/Mcp'
import Placeholder from '../screens/Placeholder'
import SignOut from './SignOut'
import SessionView from '../screens/Session'
import { useMediaQuery } from '../hooks/useMediaQuery'
import SessionList from './SessionList'
import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'

/** The rail's width and up (frontend spec §2). */
export const DESKTOP = '(min-width: 768px)'

const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
  sessions: Icon.List,
  new: Icon.Plus,
  hosts: Icon.Cpu,
  mcp: Icon.Wrench,
  hats: Icon.Sparkle,
  settings: Icon.Shield,
}

/** `/sessions/:id`: the session, its header fed by the list store's summary
 *  (kept current by the list stream) when the list holds it. A session the
 *  view finds gone leaves the list. While the
 *  list's first page is on its way the header waits for it; only a session
 *  the list does not hold fetches its detail. The address is the selection
 *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
function SessionRoute({ id }: { id: string }) {
  const list = useSessionScope()?.list
  return (
    <SessionView
      id={id}
      summary={list?.all.get(id)}
      awaitSummary={!!list && list.loading && !list.error}
      onRemoved={list?.remove}
    />
  )
}

export default function Shell({ route }: { route: Route }) {
  const client = useClient()
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const desktop = useMediaQuery(DESKTOP)

  useEffect(() => {
    let live = true
    setError(null)
    capabilities(client).then(
      (c) => live && setCaps(c),
      (err) => {
        // A 401 has already sent the browser to sign in.
        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
      },
    )
    return () => {
      live = false
    }
  }, [client, attempt])

  if (!caps) {
    return (
      <main className="auth">
        <div className="auth-card" role="status">
          {error ? (
            <>
              <p className="form-error">
                <bdi>{error}</bdi>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </main>
    )
  }

  const views = viewsOf(caps.mode)
  const current = viewOf(route.name)
  const shown = current !== null && views.includes(current)
  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'

  const frame = (
    <div className="app">
      <aside className="rail" aria-label="Views">
        <div className="rail-head">
          <span className="brand-name">hennery</span>
          <WaitingBadge />
        </div>
        {views.includes('new') && (
          <Link to={PATH.new} className="new-btn">
            <Icon.Plus size={17} /> New session
          </Link>
        )}
        <nav className="rail-nav">
          {views
            .filter((v) => v !== 'new')
            .map((v) => {
              const Glyph = ICON[v]
              return (
                <Link
                  key={v}
                  to={PATH[v]}
                  className={'nav-item' + (v === current ? ' on' : '')}
                  aria-current={v === current ? 'page' : undefined}
                >
                  <Glyph size={17} /> {LABEL[v]}
                </Link>
              )
            })}
        </nav>
        <div className="rail-scroll">{desktop && <SessionList />}</div>
        <div className="rail-foot">
          <SignOut />
        </div>
      </aside>
      <div className="shell">
        <header className="mtopbar">
          <div className="mtb-mid">
            <div className="mtb-eyebrow">hennery</div>
            <div className="mtb-title">{title}</div>
          </div>
          <WaitingBadge />
        </header>
        <main className="main">
          {route.name === 'not_found' ? (
            <Placeholder title="Not found" text="No page lives at this address." />
          ) : !shown ? (
            <Placeholder title={title} text="This view is not part of this deployment." />
          ) : route.name === 'hosts' ? (
            <Hosts />
          ) : route.name === 'hats' ? (
            <Hats />
          ) : route.name === 'sessions' && !desktop ? (
            <SessionList screen />
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
            // A desktop at /sessions with no row to open: an empty hat, a
            // search with no match, or before the first page has come.
            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
          ) : (
            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
          )}
        </main>
        <nav className="tabbar" aria-label="Tabs">
          {tabsOf(caps.mode).map((v) => {
            const Glyph = ICON[v]
            return (
              <Link
                key={v}
                to={PATH[v]}
                className={'tab' + (v === current ? ' on' : '')}
                aria-current={v === current ? 'page' : undefined}
              >
                <Glyph size={20} />
                <span>{v === 'new' ? 'New' : LABEL[v]}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
  return views.includes('sessions') ? (
    <SessionScope route={route} desktop={desktop}>
      {frame}
    </SessionScope>
  ) : (
    frame
  )
}
```

**Replace:** `web/src/manage.css`

Before:

```css
/* The management screens (plan 4d): Hosts, Hats and Settings. Their own
   file, so the shell's index.css stays the shell's. Mobile-first: one
   column, every target at least 44 px under 768 px. */

.manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
.manage-head { display:flex; align-items:center; gap:12px; }
.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
.cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
.card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.card-title { font-family:var(--font-display); font-weight:700; font-size:16px; margin:0; min-width:0; overflow-wrap:anywhere; flex:1; }
.card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; }
.card-actions .spacer { flex:1; }
.card p { margin:0 0 10px; overflow-wrap:anywhere; }
.notice { border-color:var(--accent); }

.facts { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:4px 14px; margin:0; font-size:14px; }
.facts dt { color:var(--fg-muted); }
.facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }

.state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
.state-online { background:rgba(47,158,68,.13); color:#247A33; }
.state-offline { background:var(--surface-3); color:var(--fg-muted); }
.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
.host-revoked .card-title { color:var(--fg-muted); }
.tag { background:var(--accent-wash); color:var(--accent); }
.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }

.swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
.colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }

.inline-form { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:8px; }
.inline-form .field { margin:0; flex:1; min-width:180px; }
.select-field { display:inline-flex; flex-direction:column; gap:4px; }
.select-field .field-label { margin:0; font-size:12px; }
.select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }

.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
.pairing-code code { font-family:var(--font-mono); font-weight:700; }
.hint { color:var(--fg-muted); font-size:13px; }
.empty { color:var(--fg-muted); }
.sign-out-error { margin-top:8px; font-size:13px; }

.rules { margin-top:12px; }
.rule-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rule { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.rule .field { margin:0; }
.rule-prefix { flex:1; min-width:200px; }
.tester { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
.tester .field { margin:0 0 6px; }
.purge-list { margin:0 0 12px; padding-left:20px; overflow-wrap:anywhere; }

@media (max-width:767px) {
  .manage { padding:16px 14px calc(24px + env(safe-area-inset-bottom)); }
  .manage-head h1 { font-size:22px; }
  .manage-head .btn, .card-actions .btn, .inline-form .btn, .rule .btn { min-height:44px; }
  .select-field select, .colour-input { min-height:44px; }
}

/* MCP (plan 4e): the connection form, the token and the mounts. */
.connection .card-actions .btn[aria-disabled="true"] { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
.connection-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.connection-form .field, .connection-form .hint { margin:0; }
.field-row { display:flex; gap:10px; flex-wrap:wrap; }
.field-row .field { flex:1; min-width:160px; }
.check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
.check input { width:18px; height:18px; margin:0; flex:none; }
.hint.warn { color:#B26A00; }
.token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
.mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
.mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
.mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

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

After:

```css
/* The management screens (plan 4d): Hosts, Hats and Settings. Their own
   file, so the shell's index.css stays the shell's. Mobile-first: one
   column, every target at least 44 px under 768 px. */

.manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
.manage-head { display:flex; align-items:center; gap:12px; }
.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
.cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
.card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.card-title { font-family:var(--font-display); font-weight:700; font-size:16px; margin:0; min-width:0; overflow-wrap:anywhere; flex:1; }
.card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; }
.card-actions .spacer { flex:1; }
.card p { margin:0 0 10px; overflow-wrap:anywhere; }
.notice { border-color:var(--accent); }

.facts { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:4px 14px; margin:0; font-size:14px; }
.facts dt { color:var(--fg-muted); }
.facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }

.state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
.state-online { background:rgba(47,158,68,.13); color:#247A33; }
.state-offline { background:var(--surface-3); color:var(--fg-muted); }
.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
.host-revoked .card-title { color:var(--fg-muted); }
.tag { background:var(--accent-wash); color:var(--accent); }
.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }

.swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
.colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }

.inline-form { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:8px; }
.inline-form .field { margin:0; flex:1; min-width:180px; }
.select-field { display:inline-flex; flex-direction:column; gap:4px; }
.select-field .field-label { margin:0; font-size:12px; }
.select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }

.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
.pairing-code code { font-family:var(--font-mono); font-weight:700; }
.hint { color:var(--fg-muted); font-size:13px; }
.empty { color:var(--fg-muted); }
.sign-out-error { margin-top:8px; font-size:13px; }

.rules { margin-top:12px; }
.rule-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rule { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.rule .field { margin:0; }
.rule-prefix { flex:1; min-width:200px; }
.tester { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
.tester .field { margin:0 0 6px; }
.purge-list { margin:0 0 12px; padding-left:20px; overflow-wrap:anywhere; }

@media (max-width:767px) {
  .manage { padding:16px 14px calc(24px + env(safe-area-inset-bottom)); }
  .manage-head h1 { font-size:22px; }
  .manage-head .btn, .card-actions .btn, .inline-form .btn, .rule .btn { min-height:44px; }
  .select-field select, .colour-input { min-height:44px; }
}

/* MCP (plan 4e): the connection form, the token and the mounts. */
.connection .card-actions .btn[aria-disabled="true"] { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
.connection-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.connection-form .field, .connection-form .hint { margin:0; }
.field-row { display:flex; gap:10px; flex-wrap:wrap; }
.field-row .field { flex:1; min-width:160px; }
.check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
.check input { width:18px; height:18px; margin:0; flex:none; }
.hint.warn { color:#B26A00; }
.token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
.mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
.mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
.mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

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

.oauth-client { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); }
.oauth-client p { overflow-wrap:anywhere; }
.oauth-client form { display:grid; gap:12px; }
.oauth-client select { min-height:44px; max-width:100%; }
```

**Replace:** `web/src/screens/Mcp.test.tsx`

Before:

```typescript
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

After:

```typescript
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

it('names the OAuth grant and client settings in deletion', async () => {
  open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: 'https://hennery.example/callback', has_client_secret: false } })]), 'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/callback' }) }, { mode: 'full', features: ['mcp_connections', 'mcp_oauth'] })
  const c = await card('Docs')
  await userEvent.click(within(c).getByRole('button', { name: 'Delete' }))
  const dialog = await screen.findByRole('dialog', { name: 'Delete this connection?' })
  expect(dialog.textContent).toContain('OAuth grant'); expect(dialog.textContent).toContain('client settings')
})

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

**Replace:** `web/src/screens/Mcp.tsx`

Before:

```typescript
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

After:

```typescript
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection, oauthRedirect } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import OauthClientForm from '../components/OauthClientForm'
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

export default function Mcp({ stdio = false, oauth = false }: { stdio?: boolean; oauth?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const redirect = useResource(() => oauth ? oauthRedirect(client) : Promise.resolve(null), [oauth])
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
    if ((connection.has_credential || connection.oauth?.client_id) && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
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
      {[list.error, hats.error, hosts.error, redirect.error].map(
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
            oauth={oauth} redirectUri={redirect.data?.redirect_uri}
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
            oauth={oauth}
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
            <Text>{pending.connection.label}</Text> goes, with {pending.connection.oauth ? 'its OAuth grant, client settings and mounts' : 'its token and its mounts'}. Sessions using{' '}
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
          {pending.connection.oauth && <p>This also deletes the OAuth grant and vendor client settings. Connect and enter client settings again afterwards.</p>}
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
  oauth: boolean
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
          oauth={props.oauth} redirectUri={c.oauth?.redirect_uri}
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
      {props.oauth && c.cred_kind === 'oauth_client' && <OauthClientForm connection={c} onChanged={props.onChanged} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web typecheck` and `nix develop -c pnpm --dir web test`; both must exit 0. Review the task diff against the named lane rules, check the author, commit with signing disabled and push the own branch after green. Parent performs the task review.

<!-- END PHASE 2 FEATURE -->

### Task 3: Isolated Connect and consent lifecycle

Open blank within the click, null and verify its opener before navigation, or show an isolated fallback. Channel hints validate origin/envelope/id then refetch. Confirm authorize in the main window with a fresh click; no retry. Handle COOP, focus/visibility, closed-before-answer, bounded server-relative expiry, cancellation and late replies with neutral Working or unconfirmed copy.

<!-- PHASE 3 TEST 1800cf51913d0a41eed3c01d63b3c979c9686ad4 -->

**Files:** `web/src/hooks/useMcpOauth.test.tsx`, `web/src/hooks/useMcpOauth.ts`.

- [ ] Step 1: Add the failing tests and the explicitly incomplete compileable harness placeholders.

**Create:** `web/src/hooks/useMcpOauth.test.tsx`

```typescript
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import { useMcpOauth } from './useMcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
const response = { consent_url: 'https://vendor.example/consent', expires_at: new Date(Date.now() + 900000).toISOString() }
let receive: ((e: MessageEvent) => void) | null
const closeChannel = vi.fn()
beforeEach(() => {
  receive = null
  vi.stubGlobal('BroadcastChannel', class { onmessage: ((e: MessageEvent) => void) | null = null; constructor() { queueMicrotask(() => { receive = e => this.onmessage?.(e) }) } close = closeChannel })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
function setup(answer: Response = json(200, response), popup: object | null = { opener: 'old', closed: false, location: '', close: vi.fn() }) {
  const opened = vi.spyOn(window, 'open').mockReturnValue(popup as Window | null)
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  const refresh = vi.fn(async () => [item])
  const waiting = vi.fn()
  const hook = renderHook(() => useMcpOauth(item, refresh, waiting), { wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  const start = () => act(() => hook.result.current.connect())
  const finish = () => act(async () => resolve(answer))
  return { ...hook, opened, fetch, stepUp, refresh, waiting, popup, start, finish }
}
it('opens blank on the click, nulls opener before awaiting, navigates only after authorize and guards duplicate clicks', async () => {
  const s = setup(); s.start()
  expect(s.opened).toHaveBeenCalledWith('', '_blank'); expect(s.popup).toMatchObject({ opener: null, location: '' })
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(1)
  await s.finish(); expect(s.popup).toMatchObject({ location: response.consent_url }); expect(s.result.current.state.phase).toBe('waiting')
  s.unmount(); expect(closeChannel).toHaveBeenCalled()
})
it('closes an unverifiable opener and offers the isolated fallback', async () => {
  const close = vi.fn(); const popup = { get opener() { return 'bad' }, set opener(_v: unknown) {}, close, location: '' }
  const s = setup(json(200, response), popup); s.start(); expect(close).toHaveBeenCalled(); await s.finish()
  expect(popup.location).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('offers fallback for a blocked popup', async () => { const s = setup(json(200, response), null); s.start(); await s.finish(); expect(s.result.current.state.link).toBe(response.consent_url) })
it('closes before main-window confirmation and requires a new click, without authorize retry', async () => {
  const s = setup(json(403, { code: 'step_up_required' })); s.start(); await s.finish()
  expect(s.popup).toMatchObject({ close: expect.any(Function) }); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
  expect(s.stepUp).toHaveBeenCalledTimes(1); expect(s.fetch).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('confirm')
})
it('refuses unsafe consent URL and closes blank', async () => {
  const s = setup(json(200, { ...response, consent_url: 'javascript:alert(1)' })); s.start(); await s.finish()
  expect(s.result.current.state.phase).toBe('failed'); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
})
it('wrong-origin and wrong-connection hints do nothing; valid hints refetch but cannot fabricate success', async () => {
  const s = setup(); s.start(); await s.finish()
  const hint = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  await act(async () => receive?.(new MessageEvent('message', { origin: 'https://vendor.example', data: hint })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: { ...hint, connection_id: 'other' } })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: hint })))
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('unconfirmed')
})
it('observes server completion from focus and uses closed only once as a hint (COOP)', async () => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish()
  ;(s.popup as { closed: boolean }).closed = true
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('waiting')
  s.refresh.mockResolvedValue([{ ...item, status_at: '2026-10-03T10:00:01Z' }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state.phase).toBe('connected')
})
it('expires unconfirmed and ignores a late authorize answer after cancellation', async () => {
  const s = setup(); s.start(); s.result.current.cancel(); await s.finish()
  expect(s.result.current.state.phase).toBe('idle'); expect(s.popup).toMatchObject({ location: '' })
  s.unmount()
  vi.useFakeTimers(); const expired = setup(json(200, { ...response, expires_at: new Date(Date.now() + 1000).toISOString() }))
  expired.start(); await expired.finish(); await act(async () => { await vi.advanceTimersByTimeAsync(1001) })
  expect(expired.result.current.state.phase).toBe('unconfirmed'); expect(expired.result.current.state.link).toBeUndefined()
})
it('records refusal, closes blank, refetches resource mismatch and sends exact acceptance on the next click', async () => {
  const s = setup(json(409, { code: 'resource_mismatch', message: 'compare' })); s.start(); await s.finish()
  await waitFor(() => expect(s.refresh).toHaveBeenCalled())
  expect(s.result.current.state.code).toBe('resource_mismatch')
  act(() => s.result.current.connect('https://vendor.example/other'))
  expect(JSON.parse((s.fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ accept_resource: 'https://vendor.example/other' })
})
```

**Create:** `web/src/hooks/useMcpOauth.ts`

```typescript
import type { McpConnectionItem } from '../generated/protocol'
export interface OauthState { phase: 'idle' | 'authorizing' | 'waiting' | 'confirm' | 'connected' | 'failed' | 'unconfirmed'; link?: string; error?: string; code?: string }
export function useMcpOauth(_item: McpConnectionItem, _refresh: () => Promise<McpConnectionItem[]>, _waiting?: (id: string, active: boolean) => void) {
  return { state: { phase: 'idle' } as OauthState, connect: (_resource?: string) => {}, cancel: () => {} }
}
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/hooks/useMcpOauth.test.tsx`; expect exit 1 from failing assertions, not a missing import or compile error. Keep its actual counts in the ledger.

<!-- END PHASE 3 TEST -->

<!-- PHASE 3 FEATURE 16734ddea0c3d95d25836bcbcce3319e1c5ea209 -->

**Files:** `web/src/components/OauthConnect.test.tsx`, `web/src/components/OauthConnect.tsx`, `web/src/hooks/useMcpOauth.test.tsx`, `web/src/hooks/useMcpOauth.ts`, `web/src/screens/Mcp.tsx`.

- [ ] Step 3: Apply the exact feature files.

**Create:** `web/src/components/OauthConnect.test.tsx`

```typescript
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { connection } from '../test-fixtures'
import OauthConnect from './OauthConnect'
import type { OauthState } from '../hooks/useMcpOauth'

const control = vi.hoisted(() => ({ state: { phase: 'idle' } as OauthState, connect: vi.fn(), cancel: vi.fn() }))
vi.mock('../hooks/useMcpOauth', () => ({ useMcpOauth: () => control }))
afterEach(() => { cleanup(); control.state = { phase: 'idle' }; vi.clearAllMocks() })
it('a recovered gateway report does not assert sign-in completion', () => {
  control.state.phase = 'working'
  render(<OauthConnect connection={connection({ cred_kind: 'oauth_dcr', status: 'needs_auth', has_credential: true })} refresh={vi.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent('The gateway now reports this connection as Working.')
  expect(document.body.textContent).not.toContain('sign-in completed')
})
it('binds Connect, exact resource acceptance and stop waiting; the isolated link keeps its protections', () => {
  control.state = { phase: 'waiting', link: 'https://vendor.example/authorize', code: 'resource_mismatch' }
  const c = connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: '', has_client_secret: false, resource_mismatch: 'https://mcp.example.com/other' } })
  render(<OauthConnect connection={c} refresh={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Connect' })); expect(control.connect).toHaveBeenCalledWith()
  fireEvent.click(screen.getByRole('button', { name: 'Accept and connect' })); expect(control.connect).toHaveBeenLastCalledWith('https://mcp.example.com/other')
  fireEvent.click(screen.getByRole('button', { name: 'Stop waiting' })); expect(control.cancel).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link', { name: 'Open vendor sign-in' })).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.getByRole('link', { name: 'Open vendor sign-in' })).toHaveAttribute('target', '_blank')
})
it('renders unconfirmed and capped errors as text, and own refusal overrides the previous report', () => {
  control.state = { phase: 'unconfirmed', error: '<script>bad</script>' + 'x'.repeat(400), code: 'no_registration_endpoint' }
  const c = connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: '', has_client_secret: false, resource_mismatch: 'https://mcp.example.com/old' }, oauth_error: { code: 'resource_mismatch', message: 'old', at: '' } })
  render(<OauthConnect connection={c} refresh={vi.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent('Sign-in completion could not be confirmed. The card shows the gateway’s last report.')
  expect(screen.getByRole('alert').textContent).toHaveLength(301); expect(document.querySelector('script')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Accept and connect' })).toBeNull()
  expect(screen.getByText('This vendor does not offer automatic registration. Edit the connection to use a pre-registered client.', { exact: true })).toBeVisible()
})
it.each([false, true])('confirmation names the actual connect button with grant=%s', has_credential => {
  control.state.phase = 'confirm'
  render(<OauthConnect connection={connection({ cred_kind: 'oauth_dcr', has_credential })} refresh={vi.fn()} />)
  const name = has_credential ? 'Reconnect' : 'Connect'
  expect(screen.getByRole('button', { name })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent(`Confirmed. Click ${name} again to open sign-in.`)
})
it('confirmation names Accept and connect after resource acceptance', () => {
  control.state = { phase: 'confirm', retry: 'accept' }
  const c = connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: 'https://hennery.example/callback', has_client_secret: false, resource_mismatch: 'https://mcp.example.com/other' }, oauth_error: { code: 'resource_mismatch', message: 'compare', at: '2026-10-13T10:00:00Z' } })
  render(<OauthConnect connection={c} refresh={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Accept and connect' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Confirmed. Click Accept and connect again to open sign-in.')
})
it('drops the retry instruction when a refetch clears acceptance while the gateway reports error', () => {
  control.state = { phase: 'confirm', retry: 'accept' }
  const c = connection({ cred_kind: 'oauth_dcr', status: 'error', has_credential: true, oauth: { redirect_uri: '', has_client_secret: false, resource_mismatch: 'https://mcp.example.com/other' }, oauth_error: { code: 'resource_mismatch', message: 'compare', at: '' } })
  const s = render(<OauthConnect connection={c} refresh={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Accept and connect' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Confirmed. Click Accept and connect again to open sign-in.')
  s.rerender(<OauthConnect connection={{ ...c, oauth: { redirect_uri: '', has_client_secret: false }, oauth_error: undefined }} refresh={vi.fn()} />)
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Confirmed.')
})
it('names the only rendered acceptance button when there is no ordinary Connect action', () => {
  control.state = { phase: 'confirm' }
  const c = connection({ cred_kind: 'oauth_dcr', status: 'error', oauth: { redirect_uri: '', has_client_secret: false, resource_mismatch: 'https://mcp.example.com/other' }, oauth_error: { code: 'resource_mismatch', message: 'compare', at: '' } })
  render(<OauthConnect connection={c} refresh={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Accept and connect' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('Confirmed. Click Accept and connect again to open sign-in.')
})
```

**Create:** `web/src/components/OauthConnect.tsx`

```typescript
import type { McpConnectionItem } from '../generated/protocol'
import { useMcpOauth } from '../hooks/useMcpOauth'
import { oauthAction, oauthGuidance } from '../lib/mcpOauth'
import { capped } from '../lib/mcp'
import { Text } from '../lib/text'

export default function OauthConnect({ connection: c, refresh, waiting }: {
  connection: McpConnectionItem; refresh: () => Promise<McpConnectionItem[]>; waiting?: (id: string, active: boolean) => void
}) {
  const { state, connect, cancel } = useMcpOauth(c, refresh, waiting)
  const action = oauthAction(c)
  const busy = state.phase === 'waiting' || state.phase === 'authorizing'
  const code = state.code ?? c.oauth_error?.code
  const mismatch = code === 'resource_mismatch' ? c.oauth?.resource_mismatch : undefined
  const retryButton = state.retry === 'accept' && mismatch ? 'Accept and connect' : action === 'reconnect' ? 'Reconnect' : action === 'connect' ? 'Connect' : mismatch ? 'Accept and connect' : null
  return <section className="oauth-connect" aria-label="OAuth sign-in">
    {(action === 'connect' || action === 'reconnect') && <button className="btn btn-primary btn-sm" type="button" aria-disabled={busy} onClick={() => connect()}>{action === 'connect' ? 'Connect' : 'Reconnect'}</button>}
    {action === 'client' && <p>Save the vendor client settings before connecting.</p>}
    {mismatch && <div className="notice">
      <p>Server URL: <Text className="mono">{c.url}</Text></p>
      <p>Advertised resource: <Text className="mono">{mismatch}</Text></p>
      <p>Accept only if this resource is the one you intend to authorize. Acceptance does not say which resource parameter was sent.</p>
      <button className="btn btn-primary btn-sm" type="button" aria-disabled={busy} onClick={() => connect(mismatch)}>Accept and connect</button>
    </div>}
    {busy && <p role="status">{state.phase === 'authorizing' ? 'Preparing sign-in…' : 'Waiting for sign-in. Return here after consent.'}</p>}
    {state.link && <p><a href={state.link} target="_blank" rel="noopener noreferrer">Open vendor sign-in</a></p>}
    {busy && <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Stop waiting</button>}
    {state.phase === 'confirm' && <p role="status">Confirmed.{retryButton && <> Click {retryButton} again to open sign-in.</>}</p>}
    {state.phase === 'working' && <p role="status">The gateway now reports this connection as Working.</p>}
    {state.phase === 'unconfirmed' && <p role="status">Sign-in completion could not be confirmed. The card shows the gateway’s last report.</p>}
    {state.error && <p className="form-error" role="alert"><Text>{capped(state.error)}</Text></p>}
    {code && oauthGuidance(code) && <p className="hint"><Text>{oauthGuidance(code)}</Text></p>}
  </section>
}
```

**Replace:** `web/src/hooks/useMcpOauth.test.tsx`

Before:

```typescript
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import { useMcpOauth } from './useMcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
const response = { consent_url: 'https://vendor.example/consent', expires_at: new Date(Date.now() + 900000).toISOString() }
let receive: ((e: MessageEvent) => void) | null
const closeChannel = vi.fn()
beforeEach(() => {
  receive = null
  vi.stubGlobal('BroadcastChannel', class { onmessage: ((e: MessageEvent) => void) | null = null; constructor() { queueMicrotask(() => { receive = e => this.onmessage?.(e) }) } close = closeChannel })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
function setup(answer: Response = json(200, response), popup: object | null = { opener: 'old', closed: false, location: '', close: vi.fn() }) {
  const opened = vi.spyOn(window, 'open').mockReturnValue(popup as Window | null)
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  const refresh = vi.fn(async () => [item])
  const waiting = vi.fn()
  const hook = renderHook(() => useMcpOauth(item, refresh, waiting), { wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  const start = () => act(() => hook.result.current.connect())
  const finish = () => act(async () => resolve(answer))
  return { ...hook, opened, fetch, stepUp, refresh, waiting, popup, start, finish }
}
it('opens blank on the click, nulls opener before awaiting, navigates only after authorize and guards duplicate clicks', async () => {
  const s = setup(); s.start()
  expect(s.opened).toHaveBeenCalledWith('', '_blank'); expect(s.popup).toMatchObject({ opener: null, location: '' })
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(1)
  await s.finish(); expect(s.popup).toMatchObject({ location: response.consent_url }); expect(s.result.current.state.phase).toBe('waiting')
  s.unmount(); expect(closeChannel).toHaveBeenCalled()
})
it('closes an unverifiable opener and offers the isolated fallback', async () => {
  const close = vi.fn(); const popup = { get opener() { return 'bad' }, set opener(_v: unknown) {}, close, location: '' }
  const s = setup(json(200, response), popup); s.start(); expect(close).toHaveBeenCalled(); await s.finish()
  expect(popup.location).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('offers fallback for a blocked popup', async () => { const s = setup(json(200, response), null); s.start(); await s.finish(); expect(s.result.current.state.link).toBe(response.consent_url) })
it('closes before main-window confirmation and requires a new click, without authorize retry', async () => {
  const s = setup(json(403, { code: 'step_up_required' })); s.start(); await s.finish()
  expect(s.popup).toMatchObject({ close: expect.any(Function) }); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
  expect(s.stepUp).toHaveBeenCalledTimes(1); expect(s.fetch).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('confirm')
})
it('refuses unsafe consent URL and closes blank', async () => {
  const s = setup(json(200, { ...response, consent_url: 'javascript:alert(1)' })); s.start(); await s.finish()
  expect(s.result.current.state.phase).toBe('failed'); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
})
it('wrong-origin and wrong-connection hints do nothing; valid hints refetch but cannot fabricate success', async () => {
  const s = setup(); s.start(); await s.finish()
  const hint = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  await act(async () => receive?.(new MessageEvent('message', { origin: 'https://vendor.example', data: hint })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: { ...hint, connection_id: 'other' } })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: hint })))
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('unconfirmed')
})
it('observes server completion from focus and uses closed only once as a hint (COOP)', async () => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish()
  ;(s.popup as { closed: boolean }).closed = true
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('waiting')
  s.refresh.mockResolvedValue([{ ...item, status_at: '2026-10-03T10:00:01Z' }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state.phase).toBe('connected')
})
it('expires unconfirmed and ignores a late authorize answer after cancellation', async () => {
  const s = setup(); s.start(); s.result.current.cancel(); await s.finish()
  expect(s.result.current.state.phase).toBe('idle'); expect(s.popup).toMatchObject({ location: '' })
  s.unmount()
  vi.useFakeTimers(); const expired = setup(json(200, { ...response, expires_at: new Date(Date.now() + 1000).toISOString() }))
  expired.start(); await expired.finish(); await act(async () => { await vi.advanceTimersByTimeAsync(1001) })
  expect(expired.result.current.state.phase).toBe('unconfirmed'); expect(expired.result.current.state.link).toBeUndefined()
})
it('records refusal, closes blank, refetches resource mismatch and sends exact acceptance on the next click', async () => {
  const s = setup(json(409, { code: 'resource_mismatch', message: 'compare' })); s.start(); await s.finish()
  await waitFor(() => expect(s.refresh).toHaveBeenCalled())
  expect(s.result.current.state.code).toBe('resource_mismatch')
  act(() => s.result.current.connect('https://vendor.example/other'))
  expect(JSON.parse((s.fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ accept_resource: 'https://vendor.example/other' })
})
```

After:

```typescript
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import { useMcpOauth } from './useMcpOauth'

const item = connection({ cred_kind: 'oauth_dcr', status: 'ok', has_credential: true })
const response = { consent_url: 'https://vendor.example/consent', expires_at: new Date(Date.now() + 900000).toISOString() }
let receive: ((e: MessageEvent) => void) | null
let channelName: string | undefined
const closeChannel = vi.fn()
beforeEach(() => {
  receive = null
  channelName = undefined
  vi.stubGlobal('BroadcastChannel', class { onmessage: ((e: MessageEvent) => void) | null = null; constructor(name: string) { channelName = name; queueMicrotask(() => { receive = e => this.onmessage?.(e) }) } close = closeChannel })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
function setup(answer: Response = json(200, response), popup: object | null = { opener: 'old', closed: false, location: { href: '' }, close: vi.fn() }) {
  const opened = vi.spyOn(window, 'open').mockReturnValue(popup as Window | null)
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  const stepUp = vi.fn(async () => {})
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  const refresh = vi.fn(async () => [item])
  const waiting = vi.fn()
  const hook = renderHook(() => useMcpOauth(item, refresh, waiting), { wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  const start = () => act(() => hook.result.current.connect())
  const finish = () => act(async () => resolve(answer.clone()))
  return { ...hook, opened, fetch, stepUp, refresh, waiting, popup, start, finish }
}
it('opens blank on the click, nulls opener before awaiting, navigates only after authorize and guards duplicate clicks', async () => {
  const s = setup(); s.start()
  expect(channelName).toBe('hennery-mcp-oauth')
  expect(s.opened).toHaveBeenCalledWith('', '_blank'); expect(s.popup).toMatchObject({ opener: null, location: { href: '' } })
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(1)
  await s.finish(); expect(s.popup).toMatchObject({ location: { href: response.consent_url } }); expect(s.result.current.state.phase).toBe('waiting')
  s.unmount(); expect(closeChannel).toHaveBeenCalled()
})
it('closes an unverifiable opener and offers the isolated fallback', async () => {
  const close = vi.fn(); const popup = { get opener() { return 'bad' }, set opener(_v: unknown) {}, close, location: { href: '' } }
  const s = setup(json(200, response), popup); s.start(); expect(close).toHaveBeenCalled(); await s.finish()
  expect(popup.location.href).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('offers fallback for a blocked popup', async () => { const s = setup(json(200, response), null); s.start(); await s.finish(); expect(s.result.current.state.link).toBe(response.consent_url) })
it('closes before main-window confirmation and requires a new click, without authorize retry', async () => {
  const s = setup(json(403, { code: 'step_up_required' })); s.start(); await s.finish()
  expect(s.popup).toMatchObject({ close: expect.any(Function) }); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
  expect(s.stepUp).toHaveBeenCalledTimes(1); expect(s.fetch).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('confirm')
})
it('refuses unsafe consent URL and closes blank', async () => {
  const s = setup(json(200, { ...response, consent_url: 'javascript:alert(1)' })); s.start(); await s.finish()
  expect(s.result.current.state.phase).toBe('failed'); expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
})
it('wrong-origin and wrong-connection hints do nothing; valid hints refetch but cannot fabricate success', async () => {
  const s = setup(); s.start(); await s.finish()
  const hint = { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' }
  await act(async () => receive?.(new MessageEvent('message', { origin: 'https://vendor.example', data: hint })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: { ...hint, connection_id: 'other' } })))
  expect(s.refresh).not.toHaveBeenCalled()
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: hint })))
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('unconfirmed')
})
it('observes server completion from focus and uses closed only once as a hint (COOP)', async () => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish()
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) }); expect(s.refresh).not.toHaveBeenCalled()
  ;(s.popup as { closed: boolean }).closed = true
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(s.refresh).toHaveBeenCalledTimes(1); expect(s.result.current.state.phase).toBe('waiting')
  s.refresh.mockResolvedValue([{ ...item, status_at: '2026-10-03T10:00:01Z' }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state.phase).toBe('working')
})
it('ignores a late focus error and a late step-up refusal after cancellation', async () => {
  let reject!: (reason: Error) => void
  const s = setup(); s.start(); await s.finish(); s.refresh.mockImplementation(() => new Promise((_yes, no) => { reject = no }))
  act(() => window.dispatchEvent(new Event('focus'))); act(() => s.result.current.cancel())
  await act(async () => reject(new Error('late read'))); expect(s.result.current.state).toEqual({ phase: 'idle' })
  s.unmount()
  const refused = setup(json(403, { code: 'step_up_required' })); refused.start(); act(() => refused.result.current.cancel()); await refused.finish()
  expect(refused.stepUp).not.toHaveBeenCalled(); expect(refused.result.current.state.phase).toBe('idle')
})
it('expires unconfirmed and ignores a late authorize answer after cancellation', async () => {
  const s = setup(); s.start(); act(() => s.result.current.cancel()); await s.finish()
  expect(s.result.current.state.phase).toBe('idle'); expect(s.popup).toMatchObject({ location: { href: '' } })
  s.unmount()
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-13T10:00:00Z'))
  const expired = setup(json(200, { ...response, expires_at: new Date(Date.now() + 1000).toISOString() }, { Date: new Date().toUTCString() }))
  expired.start(); await expired.finish(); await act(async () => { await vi.advanceTimersByTimeAsync(1001) })
  expect(expired.result.current.state.phase).toBe('unconfirmed'); expect(expired.result.current.state.link).toBeUndefined()
})
it('uses fallback when blank was closed before authorize answered', async () => {
  vi.useFakeTimers()
  const p = { opener: null, closed: false, location: { href: '' }, close: vi.fn() }
  const s = setup(json(200, response), p); s.start(); p.closed = true; await s.finish()
  expect(p.location.href).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) }); expect(s.refresh).not.toHaveBeenCalled()
})
it('retains the acceptance button intent through main-window confirmation', async () => {
  const s = setup(json(403, { code: 'step_up_required' }))
  act(() => s.result.current.connect('https://vendor.example/resource')); await s.finish()
  expect(s.result.current.state).toMatchObject({ phase: 'confirm', retry: 'accept' })
})
it.each(['2000-01-01T00:00:00Z', '2099-01-01T00:00:00Z'])('does not refuse Connect because of client time versus %s', async expires_at => {
  const s = setup(json(200, { ...response, expires_at })); s.start(); await s.finish()
  expect(s.result.current.state.phase).toBe('waiting'); expect(s.popup).toMatchObject({ location: { href: response.consent_url } })
})
it('records refusal, closes blank, refetches resource mismatch and sends exact acceptance on the next click', async () => {
  const s = setup(json(409, { code: 'resource_mismatch', message: 'compare' })); s.start(); await s.finish()
  await waitFor(() => expect(s.refresh).toHaveBeenCalled())
  expect(s.result.current.state.code).toBe('resource_mismatch')
  act(() => s.result.current.connect('https://vendor.example/other'))
  expect(JSON.parse((s.fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual({ accept_resource: 'https://vendor.example/other' })
})

it('pauses immediately, resumes before confirmation, and aborts/cancels without accepting a late rejection', async () => {
  const s = setup(); s.start()
  expect(s.result.current.state.phase).toBe('authorizing'); expect(s.waiting).toHaveBeenLastCalledWith(item.id, true)
  const signal = (s.fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!
  act(() => s.result.current.cancel()); expect(signal.aborted).toBe(true)
  expect((s.popup as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled()
  expect(s.waiting).toHaveBeenLastCalledWith(item.id, false)
  await s.finish(); expect(s.result.current.state.phase).toBe('idle')
  s.start(); expect(s.fetch).toHaveBeenCalledTimes(2)
  s.unmount(); expect(signal.aborted).toBe(true)
})
it('disposes the channel, timers and both listeners, allowing another attempt', async () => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish()
  expect(vi.getTimerCount()).toBe(2)
  const removeWindow = vi.spyOn(window, 'removeEventListener'), removeDocument = vi.spyOn(document, 'removeEventListener')
  act(() => s.result.current.cancel())
  expect(vi.getTimerCount()).toBe(0); expect(closeChannel).toHaveBeenCalled()
  expect(removeWindow).toHaveBeenCalledWith('focus', expect.any(Function))
  expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')) })
  expect(s.refresh).not.toHaveBeenCalled()
  s.start(); await s.finish(); expect(s.result.current.state.phase).toBe('waiting')
})
it.each(['failed', 'removed'])('observes the server %s verdict without inventing success', async verdict => {
  const s = setup(); s.start(); await s.finish()
  s.refresh.mockResolvedValue(verdict === 'removed' ? [] : [{ ...item, oauth_error: { code: 'consent_denied', message: 'vendor refused', at: item.status_at } }])
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(s.result.current.state).toMatchObject(verdict === 'removed' ? { phase: 'unconfirmed', error: 'The connection was removed.' } : { phase: 'failed', error: 'vendor refused', code: 'consent_denied' })
})
it('coalesces observation reads, ignores late answers after cancel, then reads again', async () => {
  let release!: (rows: typeof item[]) => void
  const s = setup(); s.start(); await s.finish()
  s.refresh.mockImplementation(() => new Promise(resolve => { release = resolve }))
  act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')) })
  expect(s.refresh).toHaveBeenCalledTimes(1)
  await act(async () => release([item])); expect(s.result.current.state.phase).toBe('waiting')
  act(() => window.dispatchEvent(new Event('focus'))); expect(s.refresh).toHaveBeenCalledTimes(2)
  act(() => s.result.current.cancel()); await act(async () => release([{ ...item, status_at: '2026-10-03T10:00:01Z' }]))
  expect(s.result.current.state.phase).toBe('idle')
})
it.each(['focus', 'hint', 'expiry'])('handles an unreadable report from %s with appropriate uncertainty', async trigger => {
  vi.useFakeTimers(); const s = setup(); s.start(); await s.finish(); s.refresh.mockRejectedValue(new Error('offline'))
  await act(async () => {
    if (trigger === 'focus') window.dispatchEvent(new Event('focus'))
    else if (trigger === 'hint') receive?.(new MessageEvent('message', { origin: location.origin, data: { type: 'done', connection_id: item.id, outcome: 'failed', result: 'denied' } }))
    else await vi.advanceTimersByTimeAsync(900001)
  })
  expect(s.result.current.state).toMatchObject({ phase: trigger === 'focus' ? 'waiting' : 'unconfirmed', error: 'offline' })
})
it('refetches on visible only and works when BroadcastChannel is unavailable', async () => {
  vi.stubGlobal('BroadcastChannel', class { constructor() { throw new Error('disabled') } })
  const s = setup(); s.start(); await s.finish()
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(s.refresh).not.toHaveBeenCalled()
  visible.mockReturnValue('visible')
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(s.refresh).toHaveBeenCalledTimes(1)
})
it('ignores hints before authorize is ready', async () => {
  const s = setup(); s.start(); await act(async () => {})
  await act(async () => receive?.(new MessageEvent('message', { origin: location.origin, data: { type: 'done', connection_id: item.id, outcome: 'connected', result: 'connected' } })))
  expect(s.refresh).not.toHaveBeenCalled(); expect(s.result.current.state.phase).toBe('authorizing')
  await s.finish()
})
it('uses an isolated link if navigation throws and closes the unsafe handle', async () => {
  const close = vi.fn(); const p = { opener: null, closed: false, location: { set href(_value: string) { throw new Error('severed') } }, close }
  const s = setup(json(200, response), p); s.start(); await s.finish()
  expect(close).toHaveBeenCalled(); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('uses a fallback if opening or nulling the opener throws', async () => {
  const close = vi.fn(); const p = { set opener(_value: unknown) { throw new Error('blocked') }, close, location: { href: '' } }
  const s = setup(json(200, response), p); s.start(); await s.finish()
  expect(close).toHaveBeenCalled(); expect(p.location.href).toBe(''); expect(s.result.current.state.link).toBe(response.consent_url)
})
it('keeps confirmation cancellation as a failure and ends the consent pause first', async () => {
  const s = setup(json(403, { code: 'step_up_required' })); s.stepUp.mockImplementation(async () => {
    expect(s.waiting).toHaveBeenLastCalledWith(item.id, false); throw new Error('cancelled')
  })
  s.start(); await s.finish(); expect(s.result.current.state).toMatchObject({ phase: 'failed', error: 'cancelled' })
})
it('uses the current reader and waiting callback, resets on changed identity and ignores old responses', async () => {
  const fetch = vi.fn(async () => json(200, response))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const popup = { opener: null, closed: false, location: { href: '' }, close: vi.fn() }; vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
  const first = vi.fn(async () => [item]), second = vi.fn(async () => [{ ...item, status_at: '2026-10-03T10:00:01Z' }]), wait1 = vi.fn(), wait2 = vi.fn()
  const s = renderHook(({ c, read, report }) => useMcpOauth(c, read, report), { initialProps: { c: item, read: first, report: wait1 }, wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  await act(async () => s.result.current.connect())
  s.rerender({ c: item, read: second, report: wait2 })
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledTimes(1); expect(wait2).toHaveBeenLastCalledWith(item.id, false)
  expect(s.result.current.state.phase).toBe('working')
  s.rerender({ c: { ...item, url: 'https://other.example/mcp' }, read: second, report: wait2 })
  expect(s.result.current.state.phase).toBe('idle')
})
it.each([false, true])('ignores a late confirmation answer after unmount (rejected=%s)', async rejected => {
  let resolve!: () => void, reject!: (reason: Error) => void
  const s = setup(json(403, { code: 'step_up_required' }))
  s.stepUp.mockImplementation(() => new Promise<void>((ok, no) => { resolve = ok; reject = no }))
  s.start(); await s.finish(); s.unmount()
  await act(async () => { if (rejected) reject(new Error('late')); else resolve() })
  expect(s.result.current.state.phase).toBe('authorizing')
})
it.each([false, true])('a replacement identity ignores an old confirmation answer (rejected=%s)', async rejected => {
  let resolve!: () => void, reject!: (reason: Error) => void
  const stepUp = vi.fn(() => new Promise<void>((ok, no) => { resolve = ok; reject = no }))
  const fetch = vi.fn(async () => json(403, { code: 'step_up_required' }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp, here: () => ({ pathname: '/mcp', search: '' }) })
  vi.spyOn(window, 'open').mockReturnValue(null)
  const s = renderHook(({ c }) => useMcpOauth(c, vi.fn(async () => [c])), { initialProps: { c: item }, wrapper: ({ children }) => <ClientContext.Provider value={client}>{children}</ClientContext.Provider> })
  await act(async () => s.result.current.connect())
  s.rerender({ c: { ...item, url: 'https://other.example/mcp' } }); expect(s.result.current.state.phase).toBe('idle')
  await act(async () => { if (rejected) reject(new Error('old failure')); else resolve() })
  expect(s.result.current.state.phase).toBe('idle')
})
```

**Replace:** `web/src/hooks/useMcpOauth.ts`

Before:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
export interface OauthState { phase: 'idle' | 'authorizing' | 'waiting' | 'confirm' | 'connected' | 'failed' | 'unconfirmed'; link?: string; error?: string; code?: string }
export function useMcpOauth(_item: McpConnectionItem, _refresh: () => Promise<McpConnectionItem[]>, _waiting?: (id: string, active: boolean) => void) {
  return { state: { phase: 'idle' } as OauthState, connect: (_resource?: string) => {}, cancel: () => {} }
}
```

After:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
import { useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { authorize } from '../api/mcp'
import { ApiFailure, messageOf } from '../api/errors'
import { completion, consentTimeout, consentUrl, oauthHint } from '../lib/mcpOauth'
export interface OauthState { phase: 'idle' | 'authorizing' | 'waiting' | 'confirm' | 'working' | 'failed' | 'unconfirmed'; link?: string; error?: string; code?: string; retry?: 'accept' }
interface Attempt { abort: AbortController; popup: Window | null; dispose: () => void; before: McpConnectionItem; closedSeen: boolean; ready: boolean }
export function useMcpOauth(item: McpConnectionItem, refresh: () => Promise<McpConnectionItem[]>, waiting?: (id: string, active: boolean) => void) {
  const client = useClient()
  const [state, setState] = useState<OauthState>({ phase: 'idle' })
  const current = useRef<Attempt | null>(null)
  const version = useRef(0)
  const read = useRef(refresh); read.current = refresh
  const report = useRef(waiting); report.current = waiting
  const stop = (close = false) => {
    const a = current.current
    if (!a) return
    current.current = null; version.current++; a.abort.abort(); a.dispose(); report.current?.(a.before.id, false)
    if (close) { try { a.popup?.close() } catch { /* A severed handle is only a hint. */ } }
  }
  const cancel = () => { stop(true); setState({ phase: 'idle' }) }
  useEffect(() => {
    setState({ phase: 'idle' })
    return () => { version.current++; stop(true) }
  }, [item.id, item.url, item.cred_kind, item.oauth?.pending_client?.client_id])
  const connect = (resource?: string) => {
    if (current.current) return
    let popup: Window | null = null
    try {
      popup = window.open('', '_blank')
      if (popup) {
        popup.opener = null
        if (popup.opener !== null) { popup.close(); popup = null }
      }
    } catch { try { popup?.close() } catch { /* Use the isolated link. */ } popup = null }
    version.current++
    const a: Attempt = { abort: new AbortController(), popup, before: item, closedSeen: false, ready: false, dispose: () => {} }
    current.current = a; report.current?.(item.id, true); setState({ phase: 'authorizing' })
    let channel: BroadcastChannel | null = null
    let poll: ReturnType<typeof setInterval> | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let checking: Promise<McpConnectionItem[]> | null = null
    const settle = (phase: OauthState['phase'], error?: string, code?: string) => {
      if (current.current !== a) return
      stop(); setState({ phase, error, code })
    }
    const observe = async (trigger: 'hint' | 'focus' | 'closed' | 'expiry') => {
      if (current.current !== a || !a.ready) return
      try {
        checking ??= read.current().finally(() => { checking = null })
        const rows = await checking
        if (current.current !== a) return
        const after = rows.find(c => c.id === item.id)
        const result = completion(a.before, after)
        if (result === 'working') settle('working')
        else if (result === 'failed') settle('failed', after?.oauth_error?.message, after?.oauth_error?.code)
        else if (result === 'removed') settle('unconfirmed', 'The connection was removed.')
        else if (trigger === 'hint' || trigger === 'expiry') settle('unconfirmed')
      } catch (err) {
        if (current.current !== a) return
        if (trigger === 'hint' || trigger === 'expiry') settle('unconfirmed', messageOf(err))
        else setState(prev => ({ ...prev, error: messageOf(err) }))
      }
    }
    const focus = () => { void observe('focus') }
    const visible = () => { if (document.visibilityState === 'visible') focus() }
    a.dispose = () => {
      channel?.close(); clearInterval(poll); clearTimeout(expiry)
      window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visible)
    }
    try {
      channel = new BroadcastChannel('hennery-mcp-oauth')
      channel.onmessage = event => { if (oauthHint(event, location.origin, item.id)) void observe('hint') }
    } catch { /* Focus and the retained handle remain available. */ }
    // Listeners exist before navigation, but cannot complete a pending authorize.
    void (async () => {
      try {
        const response = await authorize(client, item.id, resource === undefined ? {} : { accept_resource: resource }, a.abort.signal)
        if (current.current !== a) return
        const url = consentUrl(response.consent_url)
        const until = consentTimeout(response.expires_at, response.serverTime)
        if (!url) throw new Error('The sign-in address is unsafe. Start Connect again.')
        a.ready = true
        setState({ phase: 'waiting', link: popup ? undefined : url })
        window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visible)
        poll = setInterval(() => {
          if (a.closedSeen || !a.popup) return
          try { if (!a.popup.closed) return } catch { /* COOP can sever access. */ }
          a.closedSeen = true; void observe('closed')
        }, 500)
        expiry = setTimeout(() => { void observe('expiry') }, until)
        if (popup) {
          try {
            if (popup.closed) { a.popup = null; setState({ phase: 'waiting', link: url }) }
            else popup.location.href = url
          }
          catch { try { popup.close() } catch { /* Use the link. */ } a.popup = null; setState({ phase: 'waiting', link: url }) }
        }
      } catch (err) {
        if (current.current !== a) return
        try { popup?.close() } catch { /* Already severed. */ }
        if (err instanceof ApiFailure && err.code === 'step_up_required') {
          // End the consent pause before the main-window dialog. No resend.
          stop()
          const confirmedVersion = version.current
          try { await client.confirm(); if (version.current === confirmedVersion) setState({ phase: 'confirm', retry: resource === undefined ? undefined : 'accept' }) }
          catch (failure) { if (version.current === confirmedVersion) setState({ phase: 'failed', error: messageOf(failure) }) }
        } else {
          settle('failed', messageOf(err), err instanceof ApiFailure ? err.code : undefined)
          void read.current().catch(() => {})
        }
      }
    })()
  }
  return { state, connect, cancel }
}
```

**Replace:** `web/src/screens/Mcp.tsx`

Before:

```typescript
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection, oauthRedirect } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import OauthClientForm from '../components/OauthClientForm'
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

export default function Mcp({ stdio = false, oauth = false }: { stdio?: boolean; oauth?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const redirect = useResource(() => oauth ? oauthRedirect(client) : Promise.resolve(null), [oauth])
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
    if ((connection.has_credential || connection.oauth?.client_id) && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
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
      {[list.error, hats.error, hosts.error, redirect.error].map(
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
            oauth={oauth} redirectUri={redirect.data?.redirect_uri}
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
            oauth={oauth}
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
            <Text>{pending.connection.label}</Text> goes, with {pending.connection.oauth ? 'its OAuth grant, client settings and mounts' : 'its token and its mounts'}. Sessions using{' '}
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
          {pending.connection.oauth && <p>This also deletes the OAuth grant and vendor client settings. Connect and enter client settings again afterwards.</p>}
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
  oauth: boolean
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
          oauth={props.oauth} redirectUri={c.oauth?.redirect_uri}
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
      {props.oauth && c.cred_kind === 'oauth_client' && <OauthClientForm connection={c} onChanged={props.onChanged} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```

After:

```typescript
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection, oauthRedirect } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import OauthClientForm from '../components/OauthClientForm'
import OauthConnect from '../components/OauthConnect'
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

export default function Mcp({ stdio = false, oauth = false }: { stdio?: boolean; oauth?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const redirect = useResource(() => oauth ? oauthRedirect(client) : Promise.resolve(null), [oauth])
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
  const refresh = async () => { const rows = await listConnections(client); list.set(rows); return rows }

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
    if ((connection.has_credential || connection.oauth?.client_id) && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
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
      {[list.error, hats.error, hosts.error, redirect.error].map(
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
            oauth={oauth} redirectUri={redirect.data?.redirect_uri}
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
            oauth={oauth}
            refresh={refresh}
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
            <Text>{pending.connection.label}</Text> goes, with {pending.connection.oauth ? 'its OAuth grant, client settings and mounts' : 'its token and its mounts'}. Sessions using{' '}
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
          {pending.connection.oauth && <p>This also deletes the OAuth grant and vendor client settings. Connect and enter client settings again afterwards.</p>}
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
  oauth: boolean
  refresh: () => Promise<McpConnectionItem[]>
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
  const [clientRevision, setClientRevision] = useState(0)
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
          oauth={props.oauth} redirectUri={c.oauth?.redirect_uri}
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
      {props.oauth && c.cred_kind === 'oauth_client' && <OauthClientForm connection={c} onChanged={item => { setClientRevision(n => n + 1); props.onChanged(item) }} />}
      {props.oauth && (c.cred_kind === 'oauth_client' || c.cred_kind === 'oauth_dcr') && <OauthConnect key={clientRevision} connection={c} refresh={props.refresh} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web typecheck` and `nix develop -c pnpm --dir web test`; both must exit 0. Review the task diff against the named lane rules, check the author, commit with signing disabled and push the own branch after green. Parent performs the task review.

<!-- END PHASE 3 FEATURE -->

### Task 4: Gateway reports, probe and shared attention reads

Render last report/timestamps, independent OAuth errors and exact accepted-resource wording. Probe replies fold the server item and say only that the probe answered. Share one coalesced reader for card/badge; pause periodic reads during consent, retain event invalidation, guard mutation/read races and dispose resources. Both capabilities gate the shell reader. Add the badge link capability here; Task 5 places it in the phone top bar and verifies both layouts.

<!-- PHASE 4 TEST 425cdbfc8ce777e09da5c60e4b1acf3eb4ad5fde -->

**Files:** `web/src/components/McpScope.test.tsx`, `web/src/components/McpScope.tsx`, `web/src/components/McpStatus.test.tsx`, `web/src/components/McpStatus.tsx`.

- [ ] Step 1: Add the failing tests and the explicitly incomplete compileable harness placeholders.

**Create:** `web/src/components/McpScope.test.tsx`

```typescript
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import McpScope, { McpBadge } from './McpScope'

afterEach(() => vi.useRealTimers())
it('counts only the last fetched needs_auth and error reports', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ status: 'needs_auth' }), connection({ id: 'other', status: 'error' }), connection({ id: 'working', status: 'ok' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge /></McpScope></ClientContext.Provider>)
  expect(await screen.findByText('2 need attention')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
})
```

**Create:** `web/src/components/McpScope.tsx`

```typescript
import type { ReactNode } from 'react'
export default function McpScope({ children }: { children: ReactNode; active: boolean }) { return children }
export function McpBadge() { return null }
```

**Create:** `web/src/components/McpStatus.test.tsx`

```typescript
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import McpStatus from './McpStatus'
it('renders independent authorization failure as text and folds the probe item, never a health guess', async () => {
  const c = connection({ cred_kind: 'oauth_dcr', status: 'error', checked_at: '2026-10-13T10:00:00Z', oauth_error: { code: 'consent_denied', message: '<script>denied</script>', at: '2026-10-13T09:00:00Z' } })
  const server = stubServer({ [`POST /api/mcp/connections/${c.id}/probe`]: json(200, c) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const changed = vi.fn()
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={changed} /></ClientContext.Provider>)
  expect(screen.getByText('<script>denied</script>')).toBeVisible(); expect(document.querySelector('script')).toBeNull()
  expect(screen.getByText('2026-10-13T10:00:00Z')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Probe now' })); await waitFor(() => expect(changed).toHaveBeenCalledWith(c))
  expect(screen.getByRole('status')).toHaveTextContent('Gateway report updated. A probe does not promise continuing health.')
  expect(server.sent[0].body).toEqual({})
  expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull()
})
```

**Create:** `web/src/components/McpStatus.tsx`

```typescript
import type { McpConnectionItem } from '../generated/protocol'
export default function McpStatus(_props: { connection: McpConnectionItem; onChanged: (c: McpConnectionItem) => void }) { return null }
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/components/McpScope.test.tsx src/components/McpStatus.test.tsx src/screens/Mcp.test.tsx`; expect exit 1 from failing assertions, not a missing import or compile error. Keep its actual counts in the ledger.

<!-- END PHASE 4 TEST -->

<!-- PHASE 4 FEATURE cfd841c5a961359373ed23177a1a1b0496529db9 -->

**Files:** `web/src/api/mcp.ts`, `web/src/components/McpScope.test.tsx`, `web/src/components/McpScope.tsx`, `web/src/components/McpStatus.test.tsx`, `web/src/components/McpStatus.tsx`, `web/src/components/Shell.oauth.test.tsx`, `web/src/components/Shell.tsx`, `web/src/manage.css`, `web/src/screens/Mcp.test.tsx`, `web/src/screens/Mcp.tsx`.

- [ ] Step 3: Apply the exact feature files.

**Replace:** `web/src/api/mcp.ts`

Before:

```typescript
// The MCP gateway's connection routes (gateway spec §9, plan 8a), typed.
// Which of them need a fresh step-up is the server's to say: the client
// opens the dialog on 403 `step_up_required` and retries once.
import type {
  CreateMcpConnectionRequest,
  McpConnectionItem,
  UpdateMcpConnectionRequest,
  McpStdioServerSet,
  McpStdioServersRequest,
  McpOauthRedirect,
  McpOauthClientRequest,
  McpAuthorizeRequest,
  McpAuthorizeResponse,
} from '../generated/protocol'
import type { Client } from './client'

const id = (value: string) => encodeURIComponent(value)

export function connections(client: Client): Promise<McpConnectionItem[]> {
  return client.request('GET', '/api/mcp/connections')
}

/** Step-up. */
export function createConnection(client: Client, connection: CreateMcpConnectionRequest): Promise<McpConnectionItem> {
  return client.request('POST', '/api/mcp/connections', connection)
}

/** Step-up when the change names `url`, `cred_kind`, `internal_network`,
 *  `static_header` or `static_prefix`, even with the stored value: send
 *  only what changed. */
export function updateConnection(
  client: Client,
  connectionId: string,
  change: UpdateMcpConnectionRequest,
): Promise<McpConnectionItem> {
  return client.request('PATCH', `/api/mcp/connections/${id(connectionId)}`, change)
}

/** Step-up. Its mounts and token go with it. */
export function deleteConnection(client: Client, connectionId: string): Promise<void> {
  return client.request('DELETE', `/api/mcp/connections/${id(connectionId)}`)
}

/** The whole set of hosts, replacing the one before. */
export function replaceMounts(client: Client, connectionId: string, hostIds: string[]): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/mounts`, { host_ids: hostIds })
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

export function oauthRedirect(client: Client): Promise<McpOauthRedirect> {
  return client.request('GET', '/api/mcp/oauth/redirect-uri')
}

export function setOauthClient(client: Client, connectionId: string, body: McpOauthClientRequest): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/oauth-client`, body)
}

/** Authorize needs another click after confirmation, never an automatic retry. */
export async function authorize(client: Client, connectionId: string, body: McpAuthorizeRequest = {}, signal?: AbortSignal): Promise<McpAuthorizeResponse & { serverTime?: number }> {
  let serverTime: number | undefined
  const result = await client.request<McpAuthorizeResponse>('POST', `/api/mcp/connections/${id(connectionId)}/authorize`, body, {
    stepUp: false, signal, onResponse: response => {
      const date = Date.parse(response.headers.get('date') ?? '')
      if (Number.isFinite(date)) serverTime = date
    },
  })
  return { ...result, serverTime }
}

export function probe(client: Client, connectionId: string): Promise<McpConnectionItem> {
  return client.request('POST', `/api/mcp/connections/${id(connectionId)}/probe`, {})
}
```

After:

```typescript
// The MCP gateway's connection routes (gateway spec §9, plan 8a), typed.
// Which of them need a fresh step-up is the server's to say: the client
// opens the dialog on 403 `step_up_required` and retries once.
import type {
  CreateMcpConnectionRequest,
  McpConnectionItem,
  UpdateMcpConnectionRequest,
  McpStdioServerSet,
  McpStdioServersRequest,
  McpOauthRedirect,
  McpOauthClientRequest,
  McpAuthorizeRequest,
  McpAuthorizeResponse,
} from '../generated/protocol'
import type { Client } from './client'

const id = (value: string) => encodeURIComponent(value)

export function connections(client: Client, signal?: AbortSignal): Promise<McpConnectionItem[]> {
  return client.request('GET', '/api/mcp/connections', undefined, { signal })
}

/** Step-up. */
export function createConnection(client: Client, connection: CreateMcpConnectionRequest): Promise<McpConnectionItem> {
  return client.request('POST', '/api/mcp/connections', connection)
}

/** Step-up when the change names `url`, `cred_kind`, `internal_network`,
 *  `static_header` or `static_prefix`, even with the stored value: send
 *  only what changed. */
export function updateConnection(
  client: Client,
  connectionId: string,
  change: UpdateMcpConnectionRequest,
): Promise<McpConnectionItem> {
  return client.request('PATCH', `/api/mcp/connections/${id(connectionId)}`, change)
}

/** Step-up. Its mounts and token go with it. */
export function deleteConnection(client: Client, connectionId: string): Promise<void> {
  return client.request('DELETE', `/api/mcp/connections/${id(connectionId)}`)
}

/** The whole set of hosts, replacing the one before. */
export function replaceMounts(client: Client, connectionId: string, hostIds: string[]): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/mounts`, { host_ids: hostIds })
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

export function oauthRedirect(client: Client): Promise<McpOauthRedirect> {
  return client.request('GET', '/api/mcp/oauth/redirect-uri')
}

export function setOauthClient(client: Client, connectionId: string, body: McpOauthClientRequest): Promise<McpConnectionItem> {
  return client.request('PUT', `/api/mcp/connections/${id(connectionId)}/oauth-client`, body)
}

/** Authorize needs another click after confirmation, never an automatic retry. */
export async function authorize(client: Client, connectionId: string, body: McpAuthorizeRequest = {}, signal?: AbortSignal): Promise<McpAuthorizeResponse & { serverTime?: number }> {
  let serverTime: number | undefined
  const result = await client.request<McpAuthorizeResponse>('POST', `/api/mcp/connections/${id(connectionId)}/authorize`, body, {
    stepUp: false, signal, onResponse: response => {
      const date = Date.parse(response.headers.get('date') ?? '')
      if (Number.isFinite(date)) serverTime = date
    },
  })
  return { ...result, serverTime }
}

export function probe(client: Client, connectionId: string): Promise<McpConnectionItem> {
  return client.request('POST', `/api/mcp/connections/${id(connectionId)}/probe`, {})
}
```

**Replace:** `web/src/components/McpScope.test.tsx`

Before:

```typescript
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import McpScope, { McpBadge } from './McpScope'

afterEach(() => vi.useRealTimers())
it('counts only the last fetched needs_auth and error reports', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ status: 'needs_auth' }), connection({ id: 'other', status: 'error' }), connection({ id: 'working', status: 'ok' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge /></McpScope></ClientContext.Provider>)
  expect(await screen.findByText('2 need attention')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
})
```

After:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json } from '../test-server'
import McpScope, { McpBadge, useMcpScope } from './McpScope'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
it('counts only the last fetched needs_auth and error reports', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ status: 'needs_auth' }), connection({ id: 'other', status: 'error' }), connection({ id: 'working', status: 'ok' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge /></McpScope></ClientContext.Provider>)
  expect(await screen.findByText('2 need attention')).toBeVisible()
  expect(screen.getByText('2 need attention', { exact: true })).toHaveClass('mcp-auth-count')
  expect(screen.getByLabelText('1 may need sign-in, 1 are failing, from the last gateway report')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
})
it('omits a zero attention badge and uses a neutral linked count for errors alone', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(200, [connection()])).mockResolvedValueOnce(json(200, [connection({ status: 'error' })]))
  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><McpBadge link /></McpScope></ClientContext.Provider>)
  await act(async () => {}); expect(screen.queryByText('0 need attention', { exact: true })).toBeNull(); expect(document.querySelector('.mcp-attention')).toBeNull()
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(screen.getByText('1 need attention', { exact: true })).toHaveClass('mcp-error-count')
  expect(screen.getByRole('link')).toHaveAttribute('href', '/mcp')
})
function Control() {
  const scope = useMcpScope()!
  return <><button onClick={() => scope.waiting('connection', true)}>Pause</button><button onClick={() => scope.waiting('connection', false)}>Resume</button><button onClick={() => scope.waiting('second', true)}>Pause second</button><button onClick={() => scope.waiting('second', false)}>Resume second</button><button onClick={() => scope.set([connection({ label: 'New' })])}>Mutation</button><output>{scope.data?.[0]?.label ?? 'No report'}</output><p role="alert">{scope.error}</p></>
}
it('pauses periodic reads during consent but keeps focus invalidation and resumes the cadence', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn(async () => json(200, []))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(fetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(120000) }); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => window.dispatchEvent(new Event('focus'))); expect(fetch).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(3)
})
it('reports read failures, clears them on recovery and sends an abortable request', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(500, { code: 'unavailable', message: 'offline' })).mockResolvedValueOnce(json(200, [connection({ label: 'Recovered' })]))
  const client = new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/hosts', search: '' }) })
  const s = render(<ClientContext.Provider value={client}><McpScope active={false}><Control /></McpScope></ClientContext.Provider>)
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('offline'))
  const signal = fetch.mock.calls[0][1].signal as AbortSignal
  expect(signal).toBeInstanceOf(AbortSignal)
  expect(signal.aborted).toBe(false)
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(screen.getByRole('status')).toHaveTextContent('Recovered'); expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  s.unmount(); expect(signal.aborted).toBe(true)
})
it('keeps multiple consents paused, uses visibility invalidation and disposes its timer and listeners', async () => {
  vi.useFakeTimers(); const fetch = vi.fn(async () => json(200, []))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const s = render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: 'Pause' })); fireEvent.click(screen.getByRole('button', { name: 'Pause second' })); fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(1)
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(fetch).toHaveBeenCalledTimes(1)
  visible.mockReturnValue('visible'); await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(fetch).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: 'Resume second' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(3)
  const rw = vi.spyOn(window, 'removeEventListener'), rd = vi.spyOn(document, 'removeEventListener')
  s.unmount(); expect(vi.getTimerCount()).toBe(0)
  expect(rw).toHaveBeenCalledWith('focus', expect.any(Function)); expect(rd).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
})
it('activating MCP refetches immediately and a settled mutation invalidates once', async () => {
  const fetch = vi.fn(async () => json(200, [connection({ label: 'Read' })]))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (active: boolean) => <ClientContext.Provider value={client}><McpScope active={active}><Control /></McpScope></ClientContext.Provider>
  const s = render(view(false)); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); await act(async () => {})
  s.rerender(view(true)); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: 'Mutation' })); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
  await act(async () => {}); expect(fetch).toHaveBeenCalledTimes(3)
})
it('a new client clears the old report, uses a fresh signal and ignores old answers', async () => {
  let release!: (r: Response) => void
  const firstFetch = vi.fn(async () => json(200, [connection({ label: 'Old' })]))
  const secondFetch = vi.fn(() => new Promise<Response>(ok => { release = ok }))
  const make = (fetch: typeof globalThis.fetch) => new Client({ fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const first = make(firstFetch as typeof globalThis.fetch), second = make(secondFetch as typeof globalThis.fetch)
  const view = (client: Client) => <ClientContext.Provider value={client}><McpScope active={false}><Control /></McpScope></ClientContext.Provider>
  const s = render(view(first)); await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Old'))
  s.rerender(view(second)); expect(screen.getByRole('status')).toHaveTextContent('No report')
  const signal = (secondFetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!
  expect(signal).toBeInstanceOf(AbortSignal)
  expect(signal.aborted).toBe(false)
  await act(async () => release(json(200, [connection({ label: 'Fresh' })])))
  expect(screen.getByRole('status')).toHaveTextContent('Fresh')
})
it('reads every five minutes away from MCP and never periodically while hidden', async () => {
  vi.useFakeTimers(); const fetch = vi.fn(async () => json(200, []))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/hosts', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active={false}><McpBadge /></McpScope></ClientContext.Provider>)
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) }); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(240000) }); expect(fetch).toHaveBeenCalledTimes(2)
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => { await vi.advanceTimersByTimeAsync(300000) }); expect(fetch).toHaveBeenCalledTimes(2)
  visibility.mockRestore()
})
it('coalesces events and never overwrites a mutation with an older pending read', async () => {
  let release!: (response: Response) => void, latest!: (response: Response) => void
  const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve })).mockImplementationOnce(() => new Promise<Response>(resolve => { latest = resolve })).mockImplementation(() => new Promise<Response>(() => {}))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><McpScope active><Control /></McpScope></ClientContext.Provider>)
  act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')) })
  expect(fetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Mutation' })); expect(screen.getByRole('status')).toHaveTextContent('New')
  await act(async () => release(json(200, [connection({ label: 'Old' })])))
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.getByRole('status')).toHaveTextContent('New')
  await act(async () => latest(json(200, [connection({ label: 'New' })])))
  expect(fetch).toHaveBeenCalledTimes(2)
})
```

**Replace:** `web/src/components/McpScope.tsx`

Before:

```typescript
import type { ReactNode } from 'react'
export default function McpScope({ children }: { children: ReactNode; active: boolean }) { return children }
export function McpBadge() { return null }
```

After:

```typescript
import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { McpConnectionItem } from '../generated/protocol'
import { useClient } from '../app-client'
import { connections } from '../api/mcp'
import { Unauthenticated, messageOf } from '../api/errors'
import { Link } from '../router'

interface Scope {
  data: McpConnectionItem[] | null; error: string | null; set: Dispatch<SetStateAction<McpConnectionItem[] | null>>
  refresh: () => Promise<McpConnectionItem[]>; waiting: (id: string, active: boolean) => void
}
const Context = createContext<Scope | null>(null)
export const useMcpScope = () => useContext(Context)

/** One reader for the badge and screen. The invalidation seam can later
 *  receive a push relay; no service worker is registered here. */
export default function McpScope({ children, active }: { children: ReactNode; active: boolean }) {
  const client = useClient()
  const [data, setData] = useState<McpConnectionItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const waits = useRef(new Set<string>())
  const epoch = useRef(0)
  const dirty = useRef(false)
  const pending = useRef<Promise<McpConnectionItem[]> | null>(null)
  const controller = useRef(new AbortController())
  const refresh = useCallback((): Promise<McpConnectionItem[]> => {
    if (pending.current) return pending.current
    const signal = controller.current.signal
    const task = (async () => {
      let rows: McpConnectionItem[] = []
      do {
        dirty.current = false
        const observed = epoch.current
        rows = await connections(client, signal)
        if (!signal.aborted && observed === epoch.current) { setData(rows); setError(null) }
      } while (dirty.current && !signal.aborted)
      return rows
    })()
    pending.current = task
    void task.catch(err => { if (!signal.aborted && !(err instanceof Unauthenticated)) setError(messageOf(err)) }).finally(() => { if (pending.current === task) pending.current = null })
    return task
  }, [client])
  const publish: Scope['set'] = useCallback(value => {
    epoch.current++; dirty.current = true; setData(value)
    void refresh().catch(() => {})
  }, [refresh])
  const waiting = useCallback((id: string, yes: boolean) => {
    if (yes) waits.current.add(id); else waits.current.delete(id)
    setPaused(waits.current.size > 0)
  }, [])
  useEffect(() => {
    controller.current = new AbortController(); pending.current = null; epoch.current++; setData(null)
    void refresh().catch(() => {})
    return () => { controller.current.abort(); epoch.current++ }
  }, [refresh])
  useEffect(() => {
    const read = () => { void refresh().catch(() => {}) }
    const visible = () => { if (document.visibilityState === 'visible') read() }
    window.addEventListener('focus', read); document.addEventListener('visibilitychange', visible)
    // Event reads remain enabled during consent; only timer reads pause.
    const timer = setInterval(() => { if (!paused && document.visibilityState === 'visible') read() }, active ? 60000 : 300000)
    return () => { clearInterval(timer); window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', visible) }
  }, [active, paused, refresh])
  useEffect(() => { if (active) void refresh().catch(() => {}) }, [active, refresh])
  return <Context.Provider value={{ data, error, set: publish, refresh, waiting }}>{children}</Context.Provider>
}

export function McpBadge({ link = false }: { link?: boolean } = {}) {
  const scope = useMcpScope()
  const auth = scope?.data?.filter(c => c.status === 'needs_auth').length ?? 0
  const errors = scope?.data?.filter(c => c.status === 'error').length ?? 0
  if (auth + errors === 0) return null
  const badge = <span className="mcp-attention" aria-label={`${auth} may need sign-in, ${errors} are failing, from the last gateway report`}><span className={auth > 0 ? 'mcp-auth-count' : 'mcp-error-count'}>{auth + errors} need attention</span></span>
  return link ? <Link to="/mcp" className="mcp-attention-link">{badge}</Link> : badge
}
```

**Replace:** `web/src/components/McpStatus.test.tsx`

Before:

```typescript
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import McpStatus from './McpStatus'
it('renders independent authorization failure as text and folds the probe item, never a health guess', async () => {
  const c = connection({ cred_kind: 'oauth_dcr', status: 'error', checked_at: '2026-10-13T10:00:00Z', oauth_error: { code: 'consent_denied', message: '<script>denied</script>', at: '2026-10-13T09:00:00Z' } })
  const server = stubServer({ [`POST /api/mcp/connections/${c.id}/probe`]: json(200, c) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const changed = vi.fn()
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={changed} /></ClientContext.Provider>)
  expect(screen.getByText('<script>denied</script>')).toBeVisible(); expect(document.querySelector('script')).toBeNull()
  expect(screen.getByText('2026-10-13T10:00:00Z')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Probe now' })); await waitFor(() => expect(changed).toHaveBeenCalledWith(c))
  expect(screen.getByRole('status')).toHaveTextContent('Gateway report updated. A probe does not promise continuing health.')
  expect(server.sent[0].body).toEqual({})
  expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull()
})
```

After:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import McpStatus from './McpStatus'
it('renders independent authorization failure as text and folds the probe item, never a health guess', async () => {
  const c = connection({ cred_kind: 'oauth_dcr', status: 'error', checked_at: '2026-10-13T10:00:00Z', oauth_error: { code: 'consent_denied', message: '<script>denied</script>', at: '2026-10-13T09:00:00Z' } })
  const server = stubServer({ [`POST /api/mcp/connections/${c.id}/probe`]: json(200, c) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const changed = vi.fn()
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={changed} /></ClientContext.Provider>)
  expect(screen.getByText('<script>denied</script>')).toBeVisible(); expect(document.querySelector('script')).toBeNull()
  expect(screen.getByText('2026-10-13T10:00:00Z')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Probe now' })); await waitFor(() => expect(changed).toHaveBeenCalledWith(c))
  expect(screen.getByRole('status')).toHaveTextContent('Probe answered. The card shows the gateway’s report.')
  expect(server.sent[0].body).toEqual({})
  expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull()
})
it('shares a pending probe, clears previous feedback and unlocks both failed and successful retries', async () => {
  let release!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { release = done }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const changed = vi.fn(), c = connection({ cred_kind: 'oauth_dcr', status: 'needs_auth' })
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={changed} /></ClientContext.Provider>)
  const button = screen.getByRole('button', { name: 'Probe now' })
  fireEvent.click(button); fireEvent.click(button); expect(fetch).toHaveBeenCalledTimes(1)
  expect(button).toHaveAttribute('aria-disabled', 'true'); expect(screen.getByRole('status')).toHaveTextContent('Probing…')
  await act(async () => release(json(400, { code: 'no_credential', message: 'vendor guess' })))
  expect(screen.getByRole('alert')).toHaveTextContent('Save a token or connect before probing this connection.')
  expect(button).toHaveAttribute('aria-disabled', 'false'); expect(changed).not.toHaveBeenCalled()
  fireEvent.click(button); expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => release(json(200, c))); expect(changed).toHaveBeenCalledWith(c)
  fireEvent.click(button); expect(screen.getByRole('status')).toHaveTextContent('Probing…')
  await act(async () => release(json(500, { code: 'unknown', message: 'unavailable' })))
  expect(screen.getByRole('alert')).toHaveTextContent('unavailable')
  expect(screen.queryByRole('status')).toBeNull()
})
it('renders an accepted resource and unverified timestamps without claiming a sent parameter', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const c = connection({ cred_kind: 'oauth_client', status: 'needs_auth', oauth: { redirect_uri: '', has_client_secret: false, accepted_resource: 'https://vendor.example/resource' } })
  render(<ClientContext.Provider value={client}><McpStatus connection={c} onChanged={vi.fn()} /></ClientContext.Provider>)
  expect(screen.getByText(c.status_at, { exact: true })).toBeVisible(); expect(screen.getByText('Never checked', { exact: true })).toBeVisible()
  expect(screen.getByText('Sign-in may be needed. An authorization-server outage can also cause this state; read the gateway note.', { exact: true })).toBeVisible()
  expect(screen.getByText('https://vendor.example/resource', { exact: true }).parentElement).toHaveTextContent('This records your acceptance, not the parameter sent.')
})
```

**Replace:** `web/src/components/McpStatus.tsx`

Before:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
export default function McpStatus(_props: { connection: McpConnectionItem; onChanged: (c: McpConnectionItem) => void }) { return null }
```

After:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
import { useRef, useState } from 'react'
import { useClient } from '../app-client'
import { probe } from '../api/mcp'
import { ApiFailure, messageOf } from '../api/errors'
import { capped } from '../lib/mcp'
import { oauthGuidance } from '../lib/mcpOauth'
import { Text } from '../lib/text'

export default function McpStatus({ connection: c, onChanged }: { connection: McpConnectionItem; onChanged: (c: McpConnectionItem) => void }) {
  const client = useClient()
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const send = async () => {
    if (running.current) return
    running.current = true; setBusy(true); setError(null); setMessage(null)
    try { onChanged(await probe(client, c.id)); setMessage('Probe answered. The card shows the gateway’s report.') }
    catch (err) { setError(err instanceof ApiFailure ? oauthGuidance(err.code) || messageOf(err) : messageOf(err)) }
    finally { running.current = false; setBusy(false) }
  }
  return <section className="mcp-report" aria-label="Gateway report">
    <p className="hint">The gateway’s last report; this is not a live health check.</p>
    {c.status === 'needs_auth' && (c.cred_kind === 'oauth_dcr' || c.cred_kind === 'oauth_client') && <p>Sign-in may be needed. An authorization-server outage can also cause this state; read the gateway note.</p>}
    <dl className="facts"><dt>Status recorded</dt><dd><Text>{c.status_at}</Text></dd><dt>Last checked</dt><dd><Text>{c.checked_at ?? 'Never checked'}</Text></dd></dl>
    {c.oauth_error && <div><p>Latest Connect did not complete:</p><p><Text>{capped(c.oauth_error.message)}</Text></p><p><Text>{c.oauth_error.at}</Text></p></div>}
    {c.oauth?.accepted_resource && <p>Accepted resource: <Text className="mono">{c.oauth.accepted_resource}</Text>. This records your acceptance, not the parameter sent.</p>}
    <button type="button" className="btn btn-ghost btn-sm" aria-disabled={busy} onClick={() => void send()}>Probe now</button>
    {busy && <p role="status">Probing…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="form-error"><Text>{error}</Text></p>}
  </section>
}
```

**Create:** `web/src/components/Shell.oauth.test.tsx`

```typescript
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import App from '../App'
import { host } from '../test-fixtures'
import { json, stubServer } from '../test-server'

afterEach(() => history.replaceState(null, '', '/'))
it.each([[], ['mcp_connections'], ['mcp_oauth'], ['mcp_connections', 'mcp_oauth']].map(features => ({ features })))('starts the off-screen MCP reader only with both capabilities: %j', async ({ features }) => {
  history.replaceState(null, '', '/hosts')
  const server = stubServer({ 'GET /api/capabilities': json(200, { mode: 'full', features }), 'GET /api/hosts': json(200, [host()]), 'GET /api/hats': json(200, []), 'GET /api/mcp/connections': json(200, []) })
  render(<App fetchImpl={server.fetch} />)
  await waitFor(() => expect(server.sent.some(s => s.path === '/api/hosts')).toBe(true)); await act(async () => {})
  expect(server.sent.filter(s => s.path === '/api/mcp/connections')).toHaveLength(features.length === 2 ? 1 : 0)
})
```

**Replace:** `web/src/components/Shell.tsx`

Before:

```typescript
// The signed-in app's frame (frontend spec §2): one component tree for every
// width (F-3). From 768 px a rail with the views beside the content; under
// it a top bar and a bottom tab bar. Which views exist comes from
// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
import { useEffect, useState } from 'react'
import { capabilities } from '../api/auth'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { CapabilitiesResponse } from '../generated/protocol'
import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
import { Icon } from '../lib/ui'
import { Link, type Route } from '../router'
import Hats from '../screens/Hats'
import Hosts from '../screens/Hosts'
import NewSession from '../screens/NewSession'
import Mcp from '../screens/Mcp'
import Placeholder from '../screens/Placeholder'
import SignOut from './SignOut'
import SessionView from '../screens/Session'
import { useMediaQuery } from '../hooks/useMediaQuery'
import SessionList from './SessionList'
import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'

/** The rail's width and up (frontend spec §2). */
export const DESKTOP = '(min-width: 768px)'

const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
  sessions: Icon.List,
  new: Icon.Plus,
  hosts: Icon.Cpu,
  mcp: Icon.Wrench,
  hats: Icon.Sparkle,
  settings: Icon.Shield,
}

/** `/sessions/:id`: the session, its header fed by the list store's summary
 *  (kept current by the list stream) when the list holds it. A session the
 *  view finds gone leaves the list. While the
 *  list's first page is on its way the header waits for it; only a session
 *  the list does not hold fetches its detail. The address is the selection
 *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
function SessionRoute({ id }: { id: string }) {
  const list = useSessionScope()?.list
  return (
    <SessionView
      id={id}
      summary={list?.all.get(id)}
      awaitSummary={!!list && list.loading && !list.error}
      onRemoved={list?.remove}
    />
  )
}

export default function Shell({ route }: { route: Route }) {
  const client = useClient()
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const desktop = useMediaQuery(DESKTOP)

  useEffect(() => {
    let live = true
    setError(null)
    capabilities(client).then(
      (c) => live && setCaps(c),
      (err) => {
        // A 401 has already sent the browser to sign in.
        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
      },
    )
    return () => {
      live = false
    }
  }, [client, attempt])

  if (!caps) {
    return (
      <main className="auth">
        <div className="auth-card" role="status">
          {error ? (
            <>
              <p className="form-error">
                <bdi>{error}</bdi>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </main>
    )
  }

  const views = viewsOf(caps.mode)
  const current = viewOf(route.name)
  const shown = current !== null && views.includes(current)
  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'

  const frame = (
    <div className="app">
      <aside className="rail" aria-label="Views">
        <div className="rail-head">
          <span className="brand-name">hennery</span>
          <WaitingBadge />
        </div>
        {views.includes('new') && (
          <Link to={PATH.new} className="new-btn">
            <Icon.Plus size={17} /> New session
          </Link>
        )}
        <nav className="rail-nav">
          {views
            .filter((v) => v !== 'new')
            .map((v) => {
              const Glyph = ICON[v]
              return (
                <Link
                  key={v}
                  to={PATH[v]}
                  className={'nav-item' + (v === current ? ' on' : '')}
                  aria-current={v === current ? 'page' : undefined}
                >
                  <Glyph size={17} /> {LABEL[v]}
                </Link>
              )
            })}
        </nav>
        <div className="rail-scroll">{desktop && <SessionList />}</div>
        <div className="rail-foot">
          <SignOut />
        </div>
      </aside>
      <div className="shell">
        <header className="mtopbar">
          <div className="mtb-mid">
            <div className="mtb-eyebrow">hennery</div>
            <div className="mtb-title">{title}</div>
          </div>
          <WaitingBadge />
        </header>
        <main className="main">
          {route.name === 'not_found' ? (
            <Placeholder title="Not found" text="No page lives at this address." />
          ) : !shown ? (
            <Placeholder title={title} text="This view is not part of this deployment." />
          ) : route.name === 'hosts' ? (
            <Hosts />
          ) : route.name === 'hats' ? (
            <Hats />
          ) : route.name === 'sessions' && !desktop ? (
            <SessionList screen />
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
            // A desktop at /sessions with no row to open: an empty hat, a
            // search with no match, or before the first page has come.
            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
          ) : (
            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
          )}
        </main>
        <nav className="tabbar" aria-label="Tabs">
          {tabsOf(caps.mode).map((v) => {
            const Glyph = ICON[v]
            return (
              <Link
                key={v}
                to={PATH[v]}
                className={'tab' + (v === current ? ' on' : '')}
                aria-current={v === current ? 'page' : undefined}
              >
                <Glyph size={20} />
                <span>{v === 'new' ? 'New' : LABEL[v]}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
  return views.includes('sessions') ? (
    <SessionScope route={route} desktop={desktop}>
      {frame}
    </SessionScope>
  ) : (
    frame
  )
}
```

After:

```typescript
// The signed-in app's frame (frontend spec §2): one component tree for every
// width (F-3). From 768 px a rail with the views beside the content; under
// it a top bar and a bottom tab bar. Which views exist comes from
// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
import { useEffect, useState } from 'react'
import { capabilities } from '../api/auth'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { CapabilitiesResponse } from '../generated/protocol'
import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
import { Icon } from '../lib/ui'
import { Link, type Route } from '../router'
import Hats from '../screens/Hats'
import Hosts from '../screens/Hosts'
import NewSession from '../screens/NewSession'
import Mcp from '../screens/Mcp'
import Placeholder from '../screens/Placeholder'
import SignOut from './SignOut'
import SessionView from '../screens/Session'
import { useMediaQuery } from '../hooks/useMediaQuery'
import SessionList from './SessionList'
import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'
import McpScope, { McpBadge } from './McpScope'

/** The rail's width and up (frontend spec §2). */
export const DESKTOP = '(min-width: 768px)'

const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
  sessions: Icon.List,
  new: Icon.Plus,
  hosts: Icon.Cpu,
  mcp: Icon.Wrench,
  hats: Icon.Sparkle,
  settings: Icon.Shield,
}

/** `/sessions/:id`: the session, its header fed by the list store's summary
 *  (kept current by the list stream) when the list holds it. A session the
 *  view finds gone leaves the list. While the
 *  list's first page is on its way the header waits for it; only a session
 *  the list does not hold fetches its detail. The address is the selection
 *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
function SessionRoute({ id }: { id: string }) {
  const list = useSessionScope()?.list
  return (
    <SessionView
      id={id}
      summary={list?.all.get(id)}
      awaitSummary={!!list && list.loading && !list.error}
      onRemoved={list?.remove}
    />
  )
}

export default function Shell({ route }: { route: Route }) {
  const client = useClient()
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const desktop = useMediaQuery(DESKTOP)

  useEffect(() => {
    let live = true
    setError(null)
    capabilities(client).then(
      (c) => live && setCaps(c),
      (err) => {
        // A 401 has already sent the browser to sign in.
        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
      },
    )
    return () => {
      live = false
    }
  }, [client, attempt])

  if (!caps) {
    return (
      <main className="auth">
        <div className="auth-card" role="status">
          {error ? (
            <>
              <p className="form-error">
                <bdi>{error}</bdi>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </main>
    )
  }

  const views = viewsOf(caps.mode)
  const current = viewOf(route.name)
  const shown = current !== null && views.includes(current)
  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'

  const frame = (
    <div className="app">
      <aside className="rail" aria-label="Views">
        <div className="rail-head">
          <span className="brand-name">hennery</span>
          <WaitingBadge />
        </div>
        {views.includes('new') && (
          <Link to={PATH.new} className="new-btn">
            <Icon.Plus size={17} /> New session
          </Link>
        )}
        <nav className="rail-nav">
          {views
            .filter((v) => v !== 'new')
            .map((v) => {
              const Glyph = ICON[v]
              return (
                <Link
                  key={v}
                  to={PATH[v]}
                  className={'nav-item' + (v === current ? ' on' : '')}
                  aria-current={v === current ? 'page' : undefined}
                >
                  <Glyph size={17} /> {LABEL[v]}{v === 'mcp' && <McpBadge />}
                </Link>
              )
            })}
        </nav>
        <div className="rail-scroll">{desktop && <SessionList />}</div>
        <div className="rail-foot">
          <SignOut />
        </div>
      </aside>
      <div className="shell">
        <header className="mtopbar">
          <div className="mtb-mid">
            <div className="mtb-eyebrow">hennery</div>
            <div className="mtb-title">{title}</div>
          </div>
          <WaitingBadge />
        </header>
        <main className="main">
          {route.name === 'not_found' ? (
            <Placeholder title="Not found" text="No page lives at this address." />
          ) : !shown ? (
            <Placeholder title={title} text="This view is not part of this deployment." />
          ) : route.name === 'hosts' ? (
            <Hosts />
          ) : route.name === 'hats' ? (
            <Hats />
          ) : route.name === 'sessions' && !desktop ? (
            <SessionList screen />
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
            // A desktop at /sessions with no row to open: an empty hat, a
            // search with no match, or before the first page has come.
            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
          ) : (
            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
          )}
        </main>
        <nav className="tabbar" aria-label="Tabs">
          {tabsOf(caps.mode).map((v) => {
            const Glyph = ICON[v]
            return (
              <Link
                key={v}
                to={PATH[v]}
                className={'tab' + (v === current ? ' on' : '')}
                aria-current={v === current ? 'page' : undefined}
              >
                <Glyph size={20} />
                <span>{v === 'new' ? 'New' : LABEL[v]}</span>{v === 'mcp' && <McpBadge />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
  const scoped = views.includes('sessions') ? (
    <SessionScope route={route} desktop={desktop}>
      {frame}
    </SessionScope>
  ) : (
    frame
  )
  return caps.features.includes('mcp_connections') && caps.features.includes('mcp_oauth') ? <McpScope active={route.name === 'mcp'}>{scoped}</McpScope> : scoped
}
```

**Replace:** `web/src/manage.css`

Before:

```css
/* The management screens (plan 4d): Hosts, Hats and Settings. Their own
   file, so the shell's index.css stays the shell's. Mobile-first: one
   column, every target at least 44 px under 768 px. */

.manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
.manage-head { display:flex; align-items:center; gap:12px; }
.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
.cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
.card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.card-title { font-family:var(--font-display); font-weight:700; font-size:16px; margin:0; min-width:0; overflow-wrap:anywhere; flex:1; }
.card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; }
.card-actions .spacer { flex:1; }
.card p { margin:0 0 10px; overflow-wrap:anywhere; }
.notice { border-color:var(--accent); }

.facts { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:4px 14px; margin:0; font-size:14px; }
.facts dt { color:var(--fg-muted); }
.facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }

.state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
.state-online { background:rgba(47,158,68,.13); color:#247A33; }
.state-offline { background:var(--surface-3); color:var(--fg-muted); }
.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
.host-revoked .card-title { color:var(--fg-muted); }
.tag { background:var(--accent-wash); color:var(--accent); }
.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }

.swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
.colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }

.inline-form { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:8px; }
.inline-form .field { margin:0; flex:1; min-width:180px; }
.select-field { display:inline-flex; flex-direction:column; gap:4px; }
.select-field .field-label { margin:0; font-size:12px; }
.select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }

.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
.pairing-code code { font-family:var(--font-mono); font-weight:700; }
.hint { color:var(--fg-muted); font-size:13px; }
.empty { color:var(--fg-muted); }
.sign-out-error { margin-top:8px; font-size:13px; }

.rules { margin-top:12px; }
.rule-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rule { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.rule .field { margin:0; }
.rule-prefix { flex:1; min-width:200px; }
.tester { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
.tester .field { margin:0 0 6px; }
.purge-list { margin:0 0 12px; padding-left:20px; overflow-wrap:anywhere; }

@media (max-width:767px) {
  .manage { padding:16px 14px calc(24px + env(safe-area-inset-bottom)); }
  .manage-head h1 { font-size:22px; }
  .manage-head .btn, .card-actions .btn, .inline-form .btn, .rule .btn { min-height:44px; }
  .select-field select, .colour-input { min-height:44px; }
}

/* MCP (plan 4e): the connection form, the token and the mounts. */
.connection .card-actions .btn[aria-disabled="true"] { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
.connection-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.connection-form .field, .connection-form .hint { margin:0; }
.field-row { display:flex; gap:10px; flex-wrap:wrap; }
.field-row .field { flex:1; min-width:160px; }
.check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
.check input { width:18px; height:18px; margin:0; flex:none; }
.hint.warn { color:#B26A00; }
.token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
.mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
.mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
.mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

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

.oauth-client { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); }
.oauth-client p { overflow-wrap:anywhere; }
.oauth-client form { display:grid; gap:12px; }
.oauth-client select { min-height:44px; max-width:100%; }
```

After:

```css
/* The management screens (plan 4d): Hosts, Hats and Settings. Their own
   file, so the shell's index.css stays the shell's. Mobile-first: one
   column, every target at least 44 px under 768 px. */

.manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
.manage-head { display:flex; align-items:center; gap:12px; }
.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
.cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
.card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.card-title { font-family:var(--font-display); font-weight:700; font-size:16px; margin:0; min-width:0; overflow-wrap:anywhere; flex:1; }
.card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; }
.card-actions .spacer { flex:1; }
.card p { margin:0 0 10px; overflow-wrap:anywhere; }
.notice { border-color:var(--accent); }

.facts { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:4px 14px; margin:0; font-size:14px; }
.facts dt { color:var(--fg-muted); }
.facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }

.state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
.state-online { background:rgba(47,158,68,.13); color:#247A33; }
.state-offline { background:var(--surface-3); color:var(--fg-muted); }
.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
.host-revoked .card-title { color:var(--fg-muted); }
.tag { background:var(--accent-wash); color:var(--accent); }
.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }

.swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
.colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }

.inline-form { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:8px; }
.inline-form .field { margin:0; flex:1; min-width:180px; }
.select-field { display:inline-flex; flex-direction:column; gap:4px; }
.select-field .field-label { margin:0; font-size:12px; }
.select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }

.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
.pairing-code code { font-family:var(--font-mono); font-weight:700; }
.hint { color:var(--fg-muted); font-size:13px; }
.empty { color:var(--fg-muted); }
.sign-out-error { margin-top:8px; font-size:13px; }

.rules { margin-top:12px; }
.rule-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rule { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.rule .field { margin:0; }
.rule-prefix { flex:1; min-width:200px; }
.tester { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
.tester .field { margin:0 0 6px; }
.purge-list { margin:0 0 12px; padding-left:20px; overflow-wrap:anywhere; }

@media (max-width:767px) {
  .manage { padding:16px 14px calc(24px + env(safe-area-inset-bottom)); }
  .manage-head h1 { font-size:22px; }
  .manage-head .btn, .card-actions .btn, .inline-form .btn, .rule .btn { min-height:44px; }
  .select-field select, .colour-input { min-height:44px; }
}

/* MCP (plan 4e): the connection form, the token and the mounts. */
.connection .card-actions .btn[aria-disabled="true"] { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
.connection-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.connection-form .field, .connection-form .hint { margin:0; }
.field-row { display:flex; gap:10px; flex-wrap:wrap; }
.field-row .field { flex:1; min-width:160px; }
.check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
.check input { width:18px; height:18px; margin:0; flex:none; }
.hint.warn { color:#B26A00; }
.token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
.mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
.mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
.mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

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

.oauth-client { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); }
.oauth-client p { overflow-wrap:anywhere; }
.oauth-client form { display:grid; gap:12px; }
.oauth-client select { min-height:44px; max-width:100%; }
.oauth-connect, .mcp-report { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); overflow-wrap:anywhere; }
.oauth-connect .notice { margin-top:12px; }
.oauth-connect a { display:inline-block; min-height:44px; padding:12px 0; }
.mcp-attention { display:inline-block; font-size:10px; line-height:1.2; white-space:normal; }
.mcp-auth-count { color:var(--warn); }
.mcp-error-count { color:var(--fg-2); }
```

**Replace:** `web/src/screens/Mcp.test.tsx`

Before:

```typescript
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

it('names the OAuth grant and client settings in deletion', async () => {
  open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: 'https://hennery.example/callback', has_client_secret: false } })]), 'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/callback' }) }, { mode: 'full', features: ['mcp_connections', 'mcp_oauth'] })
  const c = await card('Docs')
  await userEvent.click(within(c).getByRole('button', { name: 'Delete' }))
  const dialog = await screen.findByRole('dialog', { name: 'Delete this connection?' })
  expect(dialog.textContent).toContain('OAuth grant'); expect(dialog.textContent).toContain('client settings')
})

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

After:

```typescript
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => { history.replaceState(null, '', '/'); vi.restoreAllMocks(); vi.useRealTimers() })

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

const OAUTH_CAPS = { mode: 'full', features: ['mcp_connections', 'mcp_oauth'] }
const OAUTH_REDIRECT = json(200, { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback' })
it('confirms losing client settings even without a grant', async () => {
  const c = connection({ cred_kind: 'oauth_client', has_credential: false, oauth: { redirect_uri: '', has_client_secret: true, client_id: 'active' } })
  const s = open({ 'GET /api/mcp/connections': json(200, [c]), 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT }, OAUTH_CAPS)
  const docs = await card('Docs')
  await userEvent.click(within(docs).getByRole('button', { name: 'Edit' }))
  const url = within(docs).getByRole('textbox', { name: 'Server URL' })
  await userEvent.clear(url); await userEvent.type(url, 'https://other.example/mcp')
  await userEvent.click(within(docs).getByRole('button', { name: 'Save' }))
  const dialog = await screen.findByRole('dialog', { name: 'Delete the stored token?' })
  expect(dialog).toHaveTextContent('This also deletes the OAuth grant and vendor client settings. Connect and enter client settings again afterwards.')
  expect(sent(s, 'PATCH', ITEM)).toHaveLength(0)
})
it('saving the same client resets waiting and folds the returned report without duplicating list reads', async () => {
  const c = connection({ cred_kind: 'oauth_client', has_credential: true, status: 'ok', oauth: { redirect_uri: '', has_client_secret: false, client_id: 'public' } })
  const popup = { opener: null, closed: false, location: { href: '' }, close: vi.fn() }; vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
  const fresh = { ...c, label: 'Changed' }
  let reported = c
  const s = open({ 'GET /api/mcp/connections': () => json(200, [reported]), 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT,
    ['POST ' + ITEM + '/authorize']: json(200, { consent_url: 'https://vendor.example/authorize', expires_at: '2099-01-01T00:00:00Z' }),
    ['PUT ' + ITEM + '/oauth-client']: () => { reported = fresh; return json(200, fresh) },
  }, OAUTH_CAPS)
  const docs = await card('Docs'); expect(sent(s, 'GET', PATH)).toHaveLength(1)
  fireEvent.click(within(docs).getByRole('button', { name: 'Reconnect' }))
  expect(await within(docs).findByText('Waiting for sign-in. Return here after consent.', { exact: true })).toBeVisible()
  fireEvent.click(within(docs).getByRole('button', { name: 'Save client' }))
  expect(await card('Changed')).toBeVisible()
  expect(screen.queryByText('Waiting for sign-in. Return here after consent.', { exact: true })).toBeNull()
  expect(popup.close).toHaveBeenCalled()
})
it('only both capabilities enable the shared reader away from MCP', async () => {
  const s = open({ 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT }, OAUTH_CAPS)
  await card('Docs'); expect(sent(s, 'GET', '/api/mcp/oauth/redirect-uri')).toHaveLength(1)
  expect(sent(s, 'GET', PATH)).toHaveLength(1)
})
it('legacy deployments omit OAuth choices, report and redirect reads', async () => {
  const s = open({}); const docs = await card('Docs')
  expect(within(docs).queryByRole('region', { name: 'Gateway report' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Add connection' }))
  expect(screen.queryByRole('option', { name: 'OAuth: automatic registration' })).toBeNull()
  expect(screen.queryByRole('option', { name: 'OAuth: pre-registered client' })).toBeNull()
  expect(sent(s, 'GET', '/api/mcp/oauth/redirect-uri')).toHaveLength(0)
})
it('Connect pauses the shared screen reader until Stop waiting, then resumes its minute cadence', async () => {
  vi.useFakeTimers(); vi.spyOn(window, 'open').mockReturnValue(null)
  const c = connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: '', has_client_secret: false } })
  const s = open({ 'GET /api/mcp/connections': json(200, [c]), 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT,
    ['POST ' + ITEM + '/authorize']: json(200, { consent_url: 'https://vendor.example/authorize', expires_at: '2099-01-01T00:00:00Z' }),
  }, OAUTH_CAPS)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  const docs = screen.getByRole('listitem', { name: 'Docs' })
  await act(async () => fireEvent.click(within(docs).getByRole('button', { name: 'Connect' })))
  await act(async () => { await vi.advanceTimersByTimeAsync(61000) })
  expect(sent(s, 'GET', PATH)).toHaveLength(1)
  fireEvent.click(within(docs).getByRole('button', { name: 'Stop waiting' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
  expect(sent(s, 'GET', PATH)).toHaveLength(2)
})

it('hedges an OAuth needs_auth chip', async () => {
  open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'oauth_dcr', status: 'needs_auth', oauth: { redirect_uri: 'https://hennery.example/callback', has_client_secret: false } })]), 'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/callback' }) }, { mode: 'full', features: ['mcp_connections', 'mcp_oauth'] })
  const c = await card('Docs'); expect(within(c).getByText('May need sign-in', { exact: true })).toBeVisible()
})
it('names the OAuth grant and client settings in deletion', async () => {
  open({ 'GET /api/mcp/connections': json(200, [connection({ cred_kind: 'oauth_dcr', oauth: { redirect_uri: 'https://hennery.example/callback', has_client_secret: false } })]), 'GET /api/mcp/oauth/redirect-uri': json(200, { redirect_uri: 'https://hennery.example/callback' }) }, { mode: 'full', features: ['mcp_connections', 'mcp_oauth'] })
  const c = await card('Docs')
  await userEvent.click(within(c).getByRole('button', { name: 'Delete' }))
  const dialog = await screen.findByRole('dialog', { name: 'Delete this connection?' })
  expect(dialog.textContent).toContain('OAuth grant'); expect(dialog.textContent).toContain('client settings')
})

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

**Replace:** `web/src/screens/Mcp.tsx`

Before:

```typescript
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection, oauthRedirect } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import OauthClientForm from '../components/OauthClientForm'
import OauthConnect from '../components/OauthConnect'
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

export default function Mcp({ stdio = false, oauth = false }: { stdio?: boolean; oauth?: boolean }) {
  const client = useClient()
  const list = useResource(() => listConnections(client))
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const redirect = useResource(() => oauth ? oauthRedirect(client) : Promise.resolve(null), [oauth])
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
  const refresh = async () => { const rows = await listConnections(client); list.set(rows); return rows }

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
    if ((connection.has_credential || connection.oauth?.client_id) && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
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
      {[list.error, hats.error, hosts.error, redirect.error].map(
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
            oauth={oauth} redirectUri={redirect.data?.redirect_uri}
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
            oauth={oauth}
            refresh={refresh}
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
            <Text>{pending.connection.label}</Text> goes, with {pending.connection.oauth ? 'its OAuth grant, client settings and mounts' : 'its token and its mounts'}. Sessions using{' '}
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
          {pending.connection.oauth && <p>This also deletes the OAuth grant and vendor client settings. Connect and enter client settings again afterwards.</p>}
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
  oauth: boolean
  refresh: () => Promise<McpConnectionItem[]>
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
  const [clientRevision, setClientRevision] = useState(0)
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
          oauth={props.oauth} redirectUri={c.oauth?.redirect_uri}
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
      {props.oauth && c.cred_kind === 'oauth_client' && <OauthClientForm connection={c} onChanged={item => { setClientRevision(n => n + 1); props.onChanged(item) }} />}
      {props.oauth && (c.cred_kind === 'oauth_client' || c.cred_kind === 'oauth_dcr') && <OauthConnect key={clientRevision} connection={c} refresh={props.refresh} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```

After:

```typescript
// MCP (frontend spec §8, gateway spec §1, §9): the gateway's connections,
// each with its state, its token (write-only) and the hosts it is mounted
// on; adding, editing and deleting one. Creating, deleting, setting a token
// and the changes that move a token's reach need a fresh step-up, which the
// client asks for when the server refuses.
import { useEffect, useRef, useState } from 'react'
import { messageOf } from '../api/errors'
import { hats as listHats, hosts as listHosts } from '../api/manage'
import { connections as listConnections, createConnection, deleteConnection, updateConnection, oauthRedirect } from '../api/mcp'
import { useClient } from '../app-client'
import ConfirmDialog from '../components/ConfirmDialog'
import ConnectionForm from '../components/ConnectionForm'
import Mounts from '../components/Mounts'
import TokenForm from '../components/TokenForm'
import StdioServers from '../components/StdioServers'
import OauthClientForm from '../components/OauthClientForm'
import OauthConnect from '../components/OauthConnect'
import McpStatus from '../components/McpStatus'
import { useMcpScope } from '../components/McpScope'
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

export default function Mcp({ stdio = false, oauth = false }: { stdio?: boolean; oauth?: boolean }) {
  const client = useClient()
  const scope = useMcpScope()
  const local = useResource(() => scope ? Promise.resolve([]) : listConnections(client), [!!scope])
  const list = scope ?? local
  const hats = useResource(() => listHats(client))
  const hosts = useResource(() => listHosts(client))
  const redirect = useResource(() => oauth ? oauthRedirect(client) : Promise.resolve(null), [oauth])
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
  const refresh = scope?.refresh ?? (async () => { const rows = await listConnections(client); local.set(rows); return rows })

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
    if ((connection.has_credential || connection.oauth?.client_id) && dropsToken(connection, change)) setPending({ kind: 'drop_token', connection, change })
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
      {[list.error, hats.error, hosts.error, redirect.error].map(
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
            oauth={oauth} redirectUri={redirect.data?.redirect_uri}
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
            oauth={oauth}
            refresh={refresh}
            waiting={scope?.waiting}
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
            <Text>{pending.connection.label}</Text> goes, with {pending.connection.oauth ? 'its OAuth grant, client settings and mounts' : 'its token and its mounts'}. Sessions using{' '}
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
          {pending.connection.oauth && <p>This also deletes the OAuth grant and vendor client settings. Connect and enter client settings again afterwards.</p>}
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
  oauth: boolean
  refresh: () => Promise<McpConnectionItem[]>
  waiting?: (id: string, active: boolean) => void
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
  const [clientRevision, setClientRevision] = useState(0)
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
        <span className={`state mcp-${c.status}`}>{props.oauth && c.oauth && c.status === 'needs_auth' ? 'May need sign-in' : props.oauth && c.status === 'not_connected' && c.oauth ? 'Not connected' : statusLabel(c.status)}</span>
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
          oauth={props.oauth} redirectUri={c.oauth?.redirect_uri}
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
      {props.oauth && c.cred_kind === 'oauth_client' && <OauthClientForm connection={c} onChanged={item => { setClientRevision(n => n + 1); props.onChanged(item) }} />}
      {props.oauth && (c.cred_kind === 'oauth_client' || c.cred_kind === 'oauth_dcr') && <OauthConnect key={clientRevision} connection={c} refresh={props.refresh} waiting={props.waiting} />}
      {props.oauth && <McpStatus connection={c} onChanged={props.onChanged} />}
      <Mounts connection={c} hosts={hosts} onChanged={props.onChanged} />
    </li>
  )
}
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web typecheck` and `nix develop -c pnpm --dir web test`; both must exit 0. Review the task diff against the named lane rules, check the author, commit with signing disabled and push the own branch after green. Parent performs the task review.

Build the UI and embedded real binary/fake before the next browser red: `nix develop -c pnpm --dir web build`, then `HENNERY_WEB_REQUIRE=1 nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked`. Each tree uses its own default target.

<!-- END PHASE 4 FEATURE -->

### Task 5: Real collector and loopback vendor at two widths

Use the dependency-free Node loopback fixture for discovery/DCR/pre-registration/PKCE/interactive consent/COOP, rotating and revoked tokens and a stateful MCP handshake. The real collector and paired fake host prove callback headers/cookies, mount preservation, fresh-click step-up, write-only values, resource/issuer refusals, probe report semantics and 44px controls at both widths. No live vendor or real user data.

<!-- PHASE 5 TEST 26ab43fffed42f01e88f6a276e4f49074ae7322d -->

**Files:** `web/e2e/mcp-oauth.spec.ts`, `web/e2e/oauth-vendor.ts`, `web/src/test/oauthVendor.test.ts`.

- [ ] Step 1: Add the failing tests and the explicitly incomplete compileable harness placeholders.

**Create:** `web/e2e/mcp-oauth.spec.ts`

```typescript
import { expect, test, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'
import { startVendor, type Vendor } from './oauth-vendor'

const PASSWORD = 'correct horse battery staple'
const SECRET = 'e2e-vendor-secret-canary'
for (const width of [1280, 390]) test.describe(`OAuth at ${width} px`, () => {
  test.describe.configure({ mode: 'serial' })
  let collector: Collector, vendor: Vendor, page: Page
  const card = (name = 'OAuth docs') => page.getByRole('listitem', { name, exact: true })
  const listed = async (slug = 'oauth-docs') => {
    const response = await page.request.get('/api/mcp/connections'); expect(response.status()).toBe(200)
    const text = await response.text(); expect(text).not.toContain(SECRET)
    return JSON.parse(text).find((c: { slug: string }) => c.slug === slug)
  }
  async function add(name: string, slug: string, kind = 'oauth_dcr') {
    await page.getByRole('button', { name: 'Add connection', exact: true }).click()
    const form = page.getByRole('region', { name: 'Add a connection', exact: true })
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
    await form.getByRole('textbox', { name: 'Slug', exact: true }).fill(slug)
    await form.getByRole('textbox', { name: 'Server URL', exact: true }).fill(vendor.mcpUrl)
    await form.getByRole('combobox', { name: 'Authentication', exact: true }).selectOption(kind)
    await form.getByRole('checkbox', { name: 'Internal network', exact: true }).check()
    await form.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(card(name)).toBeVisible()
  }
  async function popup(name = 'OAuth docs', button = 'Reconnect') {
    const opened = page.context().waitForEvent('page')
    await card(name).getByRole('button', { name: button, exact: true }).click()
    const vendorPage = await opened
    await expect(vendorPage.getByRole('heading', { name: 'Vendor consent', exact: true })).toBeVisible()
    expect(await vendorPage.evaluate(() => window.opener === null)).toBe(true)
    return vendorPage
  }
  async function allow(vendorPage: Page, name = 'OAuth docs') {
    const returned = vendorPage.waitForResponse(r => new URL(r.url()).pathname === '/api/mcp/oauth/callback')
    await vendorPage.getByRole('link', { name: 'Allow', exact: true }).click()
    const response = await returned; expect(response.status()).toBe(200)
    const headers = response.headers()
    expect(headers['content-security-policy']).toContain("script-src 'self'")
    expect(headers['cache-control']).toBe('no-store'); expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['x-content-type-options']).toBe('nosniff')
    const body = await response.text(); expect(body).not.toContain(SECRET)
    const code = new URL(response.url()).searchParams.get('code')!
    expect(body).not.toContain(code); expect(body).toContain('/api/mcp/oauth/callback.js')
    await vendorPage.waitForURL(`${collector.origin}/api/mcp/oauth/callback`)
    await expect(card(name).getByText('Working', { exact: true })).toBeVisible()
    await expect(async () => expect(vendorPage.isClosed()).toBe(true)).toPass()
  }
  test.beforeAll(async ({ browser }) => {
    vendor = await startVendor(); collector = await startCollector()
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: 844 } })
    page = await context.newPage()
    const setup = await page.request.post('/api/setup', { headers: { Origin: collector.origin }, data: { token: new URL(collector.setupLink).hash.slice(1), password: PASSWORD, public_url: collector.origin } })
    expect(setup.status()).toBe(201); await page.goto('/mcp')
  })
  test.afterAll(async () => { try { await page?.context().close() } finally { try { await collector?.stop() } finally { await vendor?.stop() } } })
  test('creates DCR and completes real consent/cookie/PKCE exchange', async () => {
    await add('OAuth docs', 'oauth-docs')
    expect((await listed()).has_credential).toBe(false)
    await allow(await popup('OAuth docs', 'Connect'))
    expect((await listed()).has_credential).toBe(true); expect(vendor.counts.registrations).toBe(1); expect(vendor.counts.exchanges).toBe(1)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('consent_url')
    if (width === 390) expect((await card().getByRole('button', { name: 'Reconnect', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  test('denial is inert text and preserves a working grant', async () => {
    vendor.config.deny = true
    const p = await popup(); const returned = p.waitForResponse(r => new URL(r.url()).pathname === '/api/mcp/oauth/callback')
    await p.getByRole('link', { name: 'Deny', exact: true }).click(); const response = await returned
    expect(response.status()).toBe(400); expect(response.headers()['content-security-policy']).toBeTruthy()
    await expect(p.getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
    expect(await p.evaluate(() => document.querySelectorAll('script').length)).toBe(1)
    await expect(card().getByRole('region', { name: 'Gateway report', exact: true }).getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
    expect((await listed()).status).toBe('ok'); expect((await listed()).has_credential).toBe(true)
    await p.getByRole('button', { name: 'Close', exact: true }).click(); vendor.config.deny = false
  })
  test('COOP severs the handle without ending consent', async () => {
    vendor.config.coop = true; const p = await popup()
    await expect(card().getByText('Waiting for sign-in. Return here after consent.', { exact: true })).toBeVisible()
    await allow(p); vendor.config.coop = false
  })
  test('blocked popup uses a noopener/noreferrer link', async () => {
    await page.evaluate(() => { const open = window.open; window.open = () => null; (window as unknown as { restoreOpen: () => void }).restoreOpen = () => { window.open = open } })
    await card().getByRole('button', { name: 'Reconnect', exact: true }).click()
    const link = card().getByRole('link', { name: 'Open vendor sign-in', exact: true })
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const opened = page.context().waitForEvent('page'); await link.click(); const p = await opened
    await expect(p.getByRole('heading', { name: 'Vendor consent', exact: true })).toBeVisible()
    expect(await p.evaluate(() => window.opener === null)).toBe(true)
    await page.evaluate(() => (window as unknown as { restoreOpen: () => void }).restoreOpen())
    await allow(p)
  })
  test('authorize closes before step-up and waits for a fresh click', async () => {
    let requests = 0
    await page.route('**/api/mcp/connections/*/authorize', async route => {
      requests++; if (requests === 1) await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'step_up_required' }) }); else await route.continue()
    })
    const opened = page.context().waitForEvent('page'); await card().getByRole('button', { name: 'Reconnect', exact: true }).click(); const blank = await opened
    const dialog = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true }); await expect(dialog).toBeVisible()
    expect(blank.isClosed()).toBe(true)
    await dialog.getByLabel('Your password', { exact: true }).fill(PASSWORD); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(card().getByText('Confirmed. Click Connect again to open sign-in.', { exact: true })).toBeVisible(); expect(requests).toBe(1)
    await allow(await popup()); expect(requests).toBe(2); await page.unroute('**/api/mcp/connections/*/authorize')
  })
  test('public and confidential pre-registered clients are write-only and connect', async () => {
    for (const [name, slug, id] of [['Public docs', 'public-docs', 'public'], ['Private docs', 'private-docs', 'confidential']]) {
      await add(name, slug, 'oauth_client'); const editor = card(name).getByRole('region', { name: 'Pre-registered OAuth client', exact: true })
      await expect(editor.getByText(`${collector.origin}/api/mcp/oauth/callback`, { exact: true })).toBeVisible()
      await editor.getByRole('textbox', { name: 'Client ID', exact: true }).fill(id)
      if (id === 'confidential') { await editor.getByRole('combobox', { name: 'Client secret action', exact: true }).selectOption('replace'); await editor.getByLabel('Client secret', { exact: true }).fill(SECRET) }
      await editor.getByRole('button', { name: 'Save client', exact: true }).click()
      await expect(editor.getByRole('status')).toHaveText('Client saved. Connect to authorize it.')
      if (id === 'confidential') await expect(editor.getByLabel('Client secret', { exact: true })).toHaveValue('')
      expect(await page.evaluate(() => document.body.innerText)).not.toContain(SECRET)
      await allow(await popup(name, 'Connect'), name); const c = await listed(slug)
      expect(c.oauth.has_client_secret).toBe(id === 'confidential'); expect(c.has_credential).toBe(true)
    }
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(SECRET)
  })
  test('stale resource acceptance refetches a new comparison before connecting', async () => {
    vendor.config.resourcePath = '/different'; await add('Resource docs', 'resource-docs')
    await card('Resource docs').getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(card('Resource docs').getByText(`${vendor.origin}/different`, { exact: true })).toBeVisible()
    vendor.config.resourcePath = '/changed'; await card('Resource docs').getByRole('button', { name: 'Accept and connect', exact: true }).click()
    await expect(card('Resource docs').getByText(`${vendor.origin}/changed`, { exact: true })).toBeVisible()
    await allow(await popup('Resource docs', 'Accept and connect'), 'Resource docs')
    expect((await listed('resource-docs')).oauth.accepted_resource).toBe(`${vendor.origin}/changed`)
    vendor.config.resourcePath = '/mcp'
  })
  test('probe refreshes real access, then revocation yields needs_auth with an attention badge', async () => {
    vendor.expire(); await card().getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card().getByText('Gateway report updated. A probe does not promise continuing health.', { exact: true })).toBeVisible()
    expect(vendor.counts.refreshes).toBe(1); expect((await listed()).status).toBe('ok')
    vendor.revoke(); await page.waitForTimeout(10500)
    await card().getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card().getByText('Needs sign-in again', { exact: true })).toBeVisible()
    await expect(page.getByText('1 need attention', { exact: true }).first()).toBeVisible()
  })
})
```

**Create:** `web/e2e/oauth-vendor.ts`

```typescript
import { createServer } from 'node:http'

export interface VendorConfig { coop: boolean; deny: boolean; resourcePath: string; issuerPath: string; registration: boolean; s256: boolean; mcpStatus: number | null }
export interface Vendor {
  origin: string; mcpUrl: string; config: VendorConfig; counts: { registrations: number; exchanges: number; refreshes: number; handshakes: number }
  expire(): void; revoke(): void; stop(): Promise<void>
}
/** Loopback only; no files, processes or logging. */
export async function startVendor(): Promise<Vendor> {
  const server = createServer((_request, response) => { response.writeHead(404); response.end() })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('no loopback listener')
  const origin = `http://127.0.0.1:${address.port}`
  return { origin, mcpUrl: `${origin}/mcp`, config: { coop: false, deny: false, resourcePath: '/mcp', issuerPath: '', registration: true, s256: true, mcpStatus: null }, counts: { registrations: 0, exchanges: 0, refreshes: 0, handshakes: 0 }, expire() {}, revoke() {}, stop: () => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())) }
}
```

**Create:** `web/src/test/oauthVendor.test.ts`

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { startVendor } from '../../e2e/oauth-vendor'
it('serves loopback OAuth metadata and a stateful MCP discovery challenge', async () => {
  const vendor = await startVendor()
  try {
    const metadata = await fetch(`${vendor.origin}/.well-known/oauth-authorization-server`)
    expect(metadata.status).toBe(200)
    expect(await metadata.json()).toMatchObject({ issuer: vendor.origin, code_challenge_methods_supported: ['S256'] })
    const challenge = await fetch(vendor.mcpUrl, { method: 'POST', body: '{}' })
    expect(challenge.status).toBe(401); expect(challenge.headers.get('www-authenticate')).toContain('resource_metadata=')
  } finally { await vendor.stop() }
})
```

- [ ] Step 2: Run `nix develop -c pnpm --dir web test src/test/oauthVendor.test.ts`; expect exit 1 from failing assertions, not a missing import or compile error. Keep its actual counts in the ledger.

Run the embedded collector/testkit build from Task 4, then `CI=1 nix develop -c pnpm --dir web e2e e2e/mcp-oauth.spec.ts -g "creates DCR"`; expect assertion red at both widths with the incomplete vendor. Run locally before committing any browser-spec change.

<!-- END PHASE 5 TEST -->

<!-- PHASE 5 FEATURE 41c58391d3a490939b7b975db98350c5edfc2f90 -->

**Files:** `web/e2e/mcp-oauth.spec.ts`, `web/e2e/oauth-vendor.ts`, `web/src/components/OauthClientForm.test.tsx`, `web/src/components/OauthClientForm.tsx`, `web/src/components/Shell.tsx`, `web/src/manage.css`, `web/src/test/oauthVendor.test.ts`.

- [ ] Step 3: Apply the exact feature files.

**Replace:** `web/e2e/mcp-oauth.spec.ts`

Before:

```typescript
import { expect, test, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'
import { startVendor, type Vendor } from './oauth-vendor'

const PASSWORD = 'correct horse battery staple'
const SECRET = 'e2e-vendor-secret-canary'
for (const width of [1280, 390]) test.describe(`OAuth at ${width} px`, () => {
  test.describe.configure({ mode: 'serial' })
  let collector: Collector, vendor: Vendor, page: Page
  const card = (name = 'OAuth docs') => page.getByRole('listitem', { name, exact: true })
  const listed = async (slug = 'oauth-docs') => {
    const response = await page.request.get('/api/mcp/connections'); expect(response.status()).toBe(200)
    const text = await response.text(); expect(text).not.toContain(SECRET)
    return JSON.parse(text).find((c: { slug: string }) => c.slug === slug)
  }
  async function add(name: string, slug: string, kind = 'oauth_dcr') {
    await page.getByRole('button', { name: 'Add connection', exact: true }).click()
    const form = page.getByRole('region', { name: 'Add a connection', exact: true })
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
    await form.getByRole('textbox', { name: 'Slug', exact: true }).fill(slug)
    await form.getByRole('textbox', { name: 'Server URL', exact: true }).fill(vendor.mcpUrl)
    await form.getByRole('combobox', { name: 'Authentication', exact: true }).selectOption(kind)
    await form.getByRole('checkbox', { name: 'Internal network', exact: true }).check()
    await form.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(card(name)).toBeVisible()
  }
  async function popup(name = 'OAuth docs', button = 'Reconnect') {
    const opened = page.context().waitForEvent('page')
    await card(name).getByRole('button', { name: button, exact: true }).click()
    const vendorPage = await opened
    await expect(vendorPage.getByRole('heading', { name: 'Vendor consent', exact: true })).toBeVisible()
    expect(await vendorPage.evaluate(() => window.opener === null)).toBe(true)
    return vendorPage
  }
  async function allow(vendorPage: Page, name = 'OAuth docs') {
    const returned = vendorPage.waitForResponse(r => new URL(r.url()).pathname === '/api/mcp/oauth/callback')
    await vendorPage.getByRole('link', { name: 'Allow', exact: true }).click()
    const response = await returned; expect(response.status()).toBe(200)
    const headers = response.headers()
    expect(headers['content-security-policy']).toContain("script-src 'self'")
    expect(headers['cache-control']).toBe('no-store'); expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['x-content-type-options']).toBe('nosniff')
    const body = await response.text(); expect(body).not.toContain(SECRET)
    const code = new URL(response.url()).searchParams.get('code')!
    expect(body).not.toContain(code); expect(body).toContain('/api/mcp/oauth/callback.js')
    await vendorPage.waitForURL(`${collector.origin}/api/mcp/oauth/callback`)
    await expect(card(name).getByText('Working', { exact: true })).toBeVisible()
    await expect(async () => expect(vendorPage.isClosed()).toBe(true)).toPass()
  }
  test.beforeAll(async ({ browser }) => {
    vendor = await startVendor(); collector = await startCollector()
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: 844 } })
    page = await context.newPage()
    const setup = await page.request.post('/api/setup', { headers: { Origin: collector.origin }, data: { token: new URL(collector.setupLink).hash.slice(1), password: PASSWORD, public_url: collector.origin } })
    expect(setup.status()).toBe(201); await page.goto('/mcp')
  })
  test.afterAll(async () => { try { await page?.context().close() } finally { try { await collector?.stop() } finally { await vendor?.stop() } } })
  test('creates DCR and completes real consent/cookie/PKCE exchange', async () => {
    await add('OAuth docs', 'oauth-docs')
    expect((await listed()).has_credential).toBe(false)
    await allow(await popup('OAuth docs', 'Connect'))
    expect((await listed()).has_credential).toBe(true); expect(vendor.counts.registrations).toBe(1); expect(vendor.counts.exchanges).toBe(1)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('consent_url')
    if (width === 390) expect((await card().getByRole('button', { name: 'Reconnect', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  test('denial is inert text and preserves a working grant', async () => {
    vendor.config.deny = true
    const p = await popup(); const returned = p.waitForResponse(r => new URL(r.url()).pathname === '/api/mcp/oauth/callback')
    await p.getByRole('link', { name: 'Deny', exact: true }).click(); const response = await returned
    expect(response.status()).toBe(400); expect(response.headers()['content-security-policy']).toBeTruthy()
    await expect(p.getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
    expect(await p.evaluate(() => document.querySelectorAll('script').length)).toBe(1)
    await expect(card().getByRole('region', { name: 'Gateway report', exact: true }).getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
    expect((await listed()).status).toBe('ok'); expect((await listed()).has_credential).toBe(true)
    await p.getByRole('button', { name: 'Close', exact: true }).click(); vendor.config.deny = false
  })
  test('COOP severs the handle without ending consent', async () => {
    vendor.config.coop = true; const p = await popup()
    await expect(card().getByText('Waiting for sign-in. Return here after consent.', { exact: true })).toBeVisible()
    await allow(p); vendor.config.coop = false
  })
  test('blocked popup uses a noopener/noreferrer link', async () => {
    await page.evaluate(() => { const open = window.open; window.open = () => null; (window as unknown as { restoreOpen: () => void }).restoreOpen = () => { window.open = open } })
    await card().getByRole('button', { name: 'Reconnect', exact: true }).click()
    const link = card().getByRole('link', { name: 'Open vendor sign-in', exact: true })
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const opened = page.context().waitForEvent('page'); await link.click(); const p = await opened
    await expect(p.getByRole('heading', { name: 'Vendor consent', exact: true })).toBeVisible()
    expect(await p.evaluate(() => window.opener === null)).toBe(true)
    await page.evaluate(() => (window as unknown as { restoreOpen: () => void }).restoreOpen())
    await allow(p)
  })
  test('authorize closes before step-up and waits for a fresh click', async () => {
    let requests = 0
    await page.route('**/api/mcp/connections/*/authorize', async route => {
      requests++; if (requests === 1) await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'step_up_required' }) }); else await route.continue()
    })
    const opened = page.context().waitForEvent('page'); await card().getByRole('button', { name: 'Reconnect', exact: true }).click(); const blank = await opened
    const dialog = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true }); await expect(dialog).toBeVisible()
    expect(blank.isClosed()).toBe(true)
    await dialog.getByLabel('Your password', { exact: true }).fill(PASSWORD); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(card().getByText('Confirmed. Click Connect again to open sign-in.', { exact: true })).toBeVisible(); expect(requests).toBe(1)
    await allow(await popup()); expect(requests).toBe(2); await page.unroute('**/api/mcp/connections/*/authorize')
  })
  test('public and confidential pre-registered clients are write-only and connect', async () => {
    for (const [name, slug, id] of [['Public docs', 'public-docs', 'public'], ['Private docs', 'private-docs', 'confidential']]) {
      await add(name, slug, 'oauth_client'); const editor = card(name).getByRole('region', { name: 'Pre-registered OAuth client', exact: true })
      await expect(editor.getByText(`${collector.origin}/api/mcp/oauth/callback`, { exact: true })).toBeVisible()
      await editor.getByRole('textbox', { name: 'Client ID', exact: true }).fill(id)
      if (id === 'confidential') { await editor.getByRole('combobox', { name: 'Client secret action', exact: true }).selectOption('replace'); await editor.getByLabel('Client secret', { exact: true }).fill(SECRET) }
      await editor.getByRole('button', { name: 'Save client', exact: true }).click()
      await expect(editor.getByRole('status')).toHaveText('Client saved. Connect to authorize it.')
      if (id === 'confidential') await expect(editor.getByLabel('Client secret', { exact: true })).toHaveValue('')
      expect(await page.evaluate(() => document.body.innerText)).not.toContain(SECRET)
      await allow(await popup(name, 'Connect'), name); const c = await listed(slug)
      expect(c.oauth.has_client_secret).toBe(id === 'confidential'); expect(c.has_credential).toBe(true)
    }
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(SECRET)
  })
  test('stale resource acceptance refetches a new comparison before connecting', async () => {
    vendor.config.resourcePath = '/different'; await add('Resource docs', 'resource-docs')
    await card('Resource docs').getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(card('Resource docs').getByText(`${vendor.origin}/different`, { exact: true })).toBeVisible()
    vendor.config.resourcePath = '/changed'; await card('Resource docs').getByRole('button', { name: 'Accept and connect', exact: true }).click()
    await expect(card('Resource docs').getByText(`${vendor.origin}/changed`, { exact: true })).toBeVisible()
    await allow(await popup('Resource docs', 'Accept and connect'), 'Resource docs')
    expect((await listed('resource-docs')).oauth.accepted_resource).toBe(`${vendor.origin}/changed`)
    vendor.config.resourcePath = '/mcp'
  })
  test('probe refreshes real access, then revocation yields needs_auth with an attention badge', async () => {
    vendor.expire(); await card().getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card().getByText('Gateway report updated. A probe does not promise continuing health.', { exact: true })).toBeVisible()
    expect(vendor.counts.refreshes).toBe(1); expect((await listed()).status).toBe('ok')
    vendor.revoke(); await page.waitForTimeout(10500)
    await card().getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card().getByText('Needs sign-in again', { exact: true })).toBeVisible()
    await expect(page.getByText('1 need attention', { exact: true }).first()).toBeVisible()
  })
})
```

After:

```typescript
import { expect, test, type Page } from '@playwright/test'
import { startCollector, type Collector } from './collector'
import { startVendor, type Vendor } from './oauth-vendor'
import { testHost, type TestHost } from './host'

const PASSWORD = 'correct horse battery staple'
const SECRET = 'e2e-vendor-secret-canary'
for (const width of [1280, 390]) test.describe(`OAuth at ${width} px`, () => {
  test.describe.configure({ mode: 'serial' })
  let collector: Collector, vendor: Vendor, page: Page
  let host: TestHost, mountedHost: string
  const card = (name = 'OAuth docs') => page.getByRole('listitem', { name, exact: true })
  const listed = async (slug = 'oauth-docs') => {
    const response = await page.request.get('/api/mcp/connections'); expect(response.status()).toBe(200)
    const text = await response.text(); expect(text).not.toContain(SECRET)
    return JSON.parse(text).find((c: { slug: string }) => c.slug === slug)
  }
  async function add(name: string, slug: string, kind = 'oauth_dcr') {
    await page.getByRole('button', { name: 'Add connection', exact: true }).click()
    const form = page.getByRole('region', { name: 'Add a connection', exact: true })
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
    await form.getByRole('textbox', { name: 'Slug', exact: true }).fill(slug)
    await form.getByRole('textbox', { name: 'Server URL', exact: true }).fill(vendor.mcpUrl)
    await form.getByRole('combobox', { name: 'Authentication', exact: true }).selectOption(kind)
    await form.getByRole('checkbox', { name: 'Internal network', exact: true }).check()
    await form.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(card(name)).toBeVisible()
  }
  async function popup(name = 'OAuth docs', button = 'Reconnect') {
    const opened = page.context().waitForEvent('page')
    await card(name).getByRole('button', { name: button, exact: true }).click()
    const vendorPage = await opened
    await expect(vendorPage.getByRole('heading', { name: 'Vendor consent', exact: true })).toBeVisible()
    expect(await vendorPage.evaluate(() => window.opener === null)).toBe(true)
    expect(vendor.counts.pathReferrers).toBe(0)
    return vendorPage
  }
  async function allow(vendorPage: Page, name = 'OAuth docs') {
    const returned = vendorPage.waitForResponse(r => new URL(r.url()).pathname === '/api/mcp/oauth/callback')
    await vendorPage.getByRole('link', { name: 'Allow', exact: true }).click()
    const response = await returned; expect(response.status()).toBe(200)
    const headers = response.headers()
    expect(headers['content-security-policy']).toContain("script-src 'self'")
    expect(headers['cache-control']).toBe('no-store'); expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['x-content-type-options']).toBe('nosniff')
    const body = await response.text(); expect(body).not.toContain(SECRET)
    const code = new URL(response.url()).searchParams.get('code')!
    expect(body).not.toContain(code); expect(body).toContain('/api/mcp/oauth/callback.js')
    await vendorPage.waitForURL(`${collector.origin}/api/mcp/oauth/callback`)
    await expect(card(name).getByText('Working', { exact: true })).toBeVisible()
    await expect(async () => expect(vendorPage.isClosed()).toBe(true)).toPass()
  }
  test.beforeAll(async ({ browser }) => {
    vendor = await startVendor(); collector = await startCollector(); host = testHost()
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: 844 } })
    page = await context.newPage()
    const setup = await page.request.post('/api/setup', { headers: { Origin: collector.origin }, data: { token: new URL(collector.setupLink).hash.slice(1), password: PASSWORD, public_url: collector.origin } })
    expect(setup.status()).toBe(201); await page.goto('/mcp')
  })
  test.afterAll(async () => { try { await page?.context().close() } finally { try { await host?.stop() } finally { try { await collector?.stop() } finally { await vendor?.stop() } } } })
  test('creates DCR and completes real consent/cookie/PKCE exchange', async () => {
    await add('OAuth docs', 'oauth-docs')
    expect((await listed()).has_credential).toBe(false)
    await allow(await popup('OAuth docs', 'Connect'))
    expect((await listed()).has_credential).toBe(true); expect(vendor.counts.registrations).toBe(1); expect(vendor.counts.exchanges).toBe(1)
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    expect(stored).not.toContain(vendor.origin); expect(stored).not.toContain('/authorize')
    if (width === 390) expect((await card().getByRole('button', { name: 'Reconnect', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  test('mounts the OAuth grant on a real paired host before reconnecting', async () => {
    await page.goto('/hosts'); await page.getByRole('button', { name: 'Add host', exact: true }).click()
    const command = (await page.getByLabel('Pairing command', { exact: true }).textContent())!
    expect(await host.join(command, ['--name', 'OAuth test host', '--no-runtime'])).toBe(0)
    await expect(page.getByText('Paired: OAuth test host', { exact: true })).toBeVisible({ timeout: 15000 })
    await page.goto('/mcp')
    const mounted = card().getByRole('checkbox', { name: 'OAuth test host', exact: true })
    await mounted.click(); await expect(mounted).toBeChecked()
    const mounts = (await listed()).mounts; expect(mounts).toHaveLength(1); mountedHost = mounts[0]
  })
  test('denial is inert text and preserves a working grant', async () => {
    vendor.config.deny = true
    const p = await popup(); const returned = p.waitForResponse(r => new URL(r.url()).pathname === '/api/mcp/oauth/callback')
    await p.getByRole('link', { name: 'Deny', exact: true }).click(); const response = await returned
    expect(response.status()).toBe(400); expect(response.headers()['content-security-policy']).toBeTruthy()
    await expect(p.getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
    expect(await p.evaluate(() => document.querySelectorAll('script').length)).toBe(1)
    await expect(card().getByRole('region', { name: 'Gateway report', exact: true }).getByText('The vendor said: access_denied: <script>denied</script>', { exact: true })).toBeVisible()
    expect((await listed()).status).toBe('ok'); expect((await listed()).has_credential).toBe(true)
    expect((await listed()).mounts).toEqual([mountedHost])
    await p.getByRole('button', { name: 'Close', exact: true }).click(); vendor.config.deny = false
  })
  test('COOP severs the handle without ending consent', async () => {
    vendor.config.coop = true; const p = await popup()
    await expect(card().getByText('Waiting for sign-in. Return here after consent.', { exact: true })).toBeVisible()
    await allow(p); vendor.config.coop = false
  })
  test('blocked popup uses a noopener/noreferrer link', async () => {
    await page.evaluate(() => { const open = window.open; window.open = () => null; (window as unknown as { restoreOpen: () => void }).restoreOpen = () => { window.open = open } })
    await card().getByRole('button', { name: 'Reconnect', exact: true }).click()
    const link = card().getByRole('link', { name: 'Open vendor sign-in', exact: true })
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const opened = page.context().waitForEvent('page'); await link.click(); const p = await opened
    await expect(p.getByRole('heading', { name: 'Vendor consent', exact: true })).toBeVisible()
    expect(await p.evaluate(() => window.opener === null)).toBe(true)
    await page.evaluate(() => (window as unknown as { restoreOpen: () => void }).restoreOpen())
    await allow(p)
  })
  test('authorize closes before step-up and waits for a fresh click', async () => {
    let requests = 0
    await page.route('**/api/mcp/connections/*/authorize', async route => {
      requests++; if (requests === 1) await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'step_up_required' }) }); else await route.continue()
    })
    const opened = page.context().waitForEvent('page'); await card().getByRole('button', { name: 'Reconnect', exact: true }).click(); const blank = await opened
    const dialog = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true }); await expect(dialog).toBeVisible()
    expect(blank.isClosed()).toBe(true)
    await dialog.getByLabel('Your password', { exact: true }).fill(PASSWORD); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(card().getByText('Confirmed. Click Reconnect again to open sign-in.', { exact: true })).toBeVisible(); expect(requests).toBe(1)
    await allow(await popup()); expect(requests).toBe(2); await page.unroute('**/api/mcp/connections/*/authorize')
  })
  test('public and confidential pre-registered clients are write-only and connect', async () => {
    for (const [name, slug, id] of [['Public docs', 'public-docs', 'public'], ['Private docs', 'private-docs', 'confidential']]) {
      await add(name, slug, 'oauth_client'); const editor = card(name).getByRole('region', { name: 'Pre-registered OAuth client', exact: true })
      await expect(editor.getByText(`${collector.origin}/api/mcp/oauth/callback`, { exact: true })).toBeVisible()
      await editor.getByRole('textbox', { name: 'Client ID', exact: true }).fill(id)
      if (id === 'confidential') {
        await editor.getByRole('combobox', { name: 'Client secret action', exact: true }).selectOption('replace'); await editor.getByLabel('Client secret', { exact: true }).fill(SECRET)
        let refused = false
        await page.route('**/api/mcp/connections/*/oauth-client', async route => {
          if (!refused) { refused = true; await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'step_up_required' }) }) }
          else await route.continue()
        })
      }
      await editor.getByRole('button', { name: 'Save client', exact: true }).click()
      if (id === 'confidential') {
        const dialog = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true }); await expect(dialog).toBeVisible()
        await expect(editor.getByLabel('Client secret', { exact: true })).toHaveValue('')
        expect(await page.locator('input, textarea').evaluateAll((fields, secret) => fields.some(field => (field as HTMLInputElement | HTMLTextAreaElement).value.includes(secret)), SECRET)).toBe(false)
        await dialog.getByLabel('Your password', { exact: true }).fill(PASSWORD); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
        await page.unroute('**/api/mcp/connections/*/oauth-client')
      }
      await expect(editor.getByRole('status')).toHaveText('Client saved. Connect to authorize it.')
      expect(await page.locator('input[type="password"]').evaluateAll((fields, secret) => fields.some(field => (field as HTMLInputElement).value.includes(secret)), SECRET)).toBe(false)
      await allow(await popup(name, 'Connect'), name); const c = await listed(slug)
      expect(c.oauth.has_client_secret).toBe(id === 'confidential'); expect(c.has_credential).toBe(true)
    }
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(SECRET)
  })
  test('stale resource acceptance refetches a new comparison before connecting', async () => {
    vendor.config.resourcePath = '/different'; await add('Resource docs', 'resource-docs')
    await card('Resource docs').getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(card('Resource docs').getByText(`${vendor.origin}/different`, { exact: true })).toBeVisible()
    vendor.config.resourcePath = '/changed'; await card('Resource docs').getByRole('button', { name: 'Accept and connect', exact: true }).click()
    await expect(card('Resource docs').getByText(`${vendor.origin}/changed`, { exact: true })).toBeVisible()
    await allow(await popup('Resource docs', 'Accept and connect'), 'Resource docs')
    expect((await listed('resource-docs')).oauth.accepted_resource).toBe(`${vendor.origin}/changed`)
    vendor.config.resourcePath = '/mcp'
  })
  test('probe refreshes real access, then revocation yields needs_auth with an attention badge', async () => {
    vendor.expire(); await card().getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card().getByText('Probe answered. The card shows the gateway’s report.', { exact: true })).toBeVisible()
    expect(vendor.counts.refreshes).toBe(1); expect((await listed()).status).toBe('ok')
    vendor.revoke(); await page.waitForTimeout(10500)
    await card().getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card().getByText('May need sign-in', { exact: true })).toBeVisible()
    const attention = page.locator(width === 390 ? '.mtopbar' : '.rail-nav').getByText('1 need attention', { exact: true })
    await expect(attention).toBeVisible(); await expect(attention).toHaveCSS('color', 'rgb(178, 106, 0)')
    if (width === 390) expect((await page.locator('.mtopbar .mcp-attention-link').boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
  test('issuer changes require a deliberate client save and keep the old grant until consent', async () => {
    vendor.config.issuerPath = '/tenant'
    await card('Public docs').getByRole('button', { name: 'Reconnect', exact: true }).click()
    await expect(card('Public docs').getByText('The authorization server changed. Review and save the vendor client again before connecting.', { exact: true })).toBeVisible()
    const editor = card('Public docs').getByRole('region', { name: 'Pre-registered OAuth client', exact: true })
    await editor.getByRole('button', { name: 'Save client', exact: true }).click()
    await expect(editor.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.', { exact: true })).toBeVisible()
    expect((await listed('public-docs')).has_credential).toBe(true)
    await allow(await popup('Public docs'), 'Public docs')
    expect((await listed('public-docs')).oauth.pending_client).toBeUndefined()
    vendor.config.issuerPath = ''
  })
  test('foreign resources are refused without an acceptance action', async () => {
    vendor.config.resourcePath = 'https://other.example/mcp'; await add('Foreign docs', 'foreign-docs')
    await card('Foreign docs').getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(card('Foreign docs').getByText('The advertised resource cannot be accepted. Check the server URL.', { exact: true })).toBeVisible()
    await expect(card('Foreign docs').getByRole('button', { name: 'Accept and connect', exact: true })).toHaveCount(0)
    expect((await listed('foreign-docs')).has_credential).toBe(false); vendor.config.resourcePath = '/mcp'
  })
  test('a vendor without registration suggests pre-registered settings', async () => {
    vendor.config.registration = false; await add('Registered docs', 'registered-docs')
    await card('Registered docs').getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(card('Registered docs').getByText('This vendor does not offer automatic registration. Edit the connection to use a pre-registered client.', { exact: true })).toBeVisible()
    expect((await listed('registered-docs')).has_credential).toBe(false); vendor.config.registration = true
  })
  test('probe outage shows error without reconnect, preserves its cooldown report, and recovers', async () => {
    await add('Outage docs', 'outage-docs'); await allow(await popup('Outage docs', 'Connect'), 'Outage docs')
    vendor.config.mcpStatus = 503; await card('Outage docs').getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card('Outage docs').getByText('Is failing', { exact: true })).toBeVisible()
    await expect(card('Outage docs').getByRole('button', { name: 'Reconnect', exact: true })).toHaveCount(0)
    const failure = await listed('outage-docs'); expect(failure.status_note).toBeTruthy()
    await expect(card('Outage docs').getByText(failure.status_note, { exact: true })).toBeVisible()
    vendor.config.mcpStatus = null
    await card('Outage docs').getByRole('button', { name: 'Probe now', exact: true }).click()
    expect((await listed('outage-docs')).status).toBe('error')
    await page.waitForTimeout(10500)
    await card('Outage docs').getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(card('Outage docs').getByText('Working', { exact: true })).toBeVisible()
    const working = await listed('outage-docs')
    vendor.config.mcpStatus = 400; await page.waitForTimeout(10500)
    await card('Outage docs').getByRole('button', { name: 'Probe now', exact: true }).click()
    await expect(async () => { const unchanged = await listed('outage-docs'); expect(unchanged.status).toBe('ok'); expect(Date.parse(unchanged.checked_at)).toBeGreaterThan(Date.parse(working.checked_at)) }).toPass()
    vendor.config.mcpStatus = null
  })
  test('callback refusal is served without an operator cookie under its own CSP', async ({ browser }) => {
    const context = await browser.newContext()
    try {
      const callback = await context.newPage()
      const response = await callback.goto(`${collector.origin}/api/mcp/oauth/callback?state=unknown&code=never-echo-this-code`)
      expect(response!.status()).toBe(400)
      expect(response!.headers()['content-security-policy']).toContain("script-src 'self'")
      expect(response!.headers()['cache-control']).toBe('no-store')
      await callback.waitForURL(`${collector.origin}/api/mcp/oauth/callback`)
      await expect(callback.getByRole('heading', { name: 'Not connected', exact: true })).toBeVisible()
      await expect(callback.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
      expect(await callback.content()).not.toContain('never-echo-this-code')
      expect(await callback.locator('body').getAttribute('data-connection')).toBe('')
    } finally { await context.close() }
  })
})
```

**Replace:** `web/e2e/oauth-vendor.ts`

Before:

```typescript
import { createServer } from 'node:http'

export interface VendorConfig { coop: boolean; deny: boolean; resourcePath: string; issuerPath: string; registration: boolean; s256: boolean; mcpStatus: number | null }
export interface Vendor {
  origin: string; mcpUrl: string; config: VendorConfig; counts: { registrations: number; exchanges: number; refreshes: number; handshakes: number }
  expire(): void; revoke(): void; stop(): Promise<void>
}
/** Loopback only; no files, processes or logging. */
export async function startVendor(): Promise<Vendor> {
  const server = createServer((_request, response) => { response.writeHead(404); response.end() })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('no loopback listener')
  const origin = `http://127.0.0.1:${address.port}`
  return { origin, mcpUrl: `${origin}/mcp`, config: { coop: false, deny: false, resourcePath: '/mcp', issuerPath: '', registration: true, s256: true, mcpStatus: null }, counts: { registrations: 0, exchanges: 0, refreshes: 0, handshakes: 0 }, expire() {}, revoke() {}, stop: () => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())) }
}
```

After:

```typescript
import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'

export interface VendorConfig { coop: boolean; deny: boolean; resourcePath: string; issuerPath: string; registration: boolean; s256: boolean; mcpStatus: number | null }
export interface Vendor {
  origin: string; mcpUrl: string; config: VendorConfig; counts: { registrations: number; exchanges: number; refreshes: number; handshakes: number; pathReferrers: number }
  expire(): void; revoke(): void; stop(): Promise<void>
}
/** Loopback only; no files, processes or logging. */
export async function startVendor(): Promise<Vendor> {
  const config: VendorConfig = { coop: false, deny: false, resourcePath: '/mcp', issuerPath: '', registration: true, s256: true, mcpStatus: null }
  const counts = { registrations: 0, exchanges: 0, refreshes: 0, handshakes: 0, pathReferrers: 0 }
  const clients = new Map<string, string | null>([['public', null], ['confidential', 'e2e-vendor-secret-canary']])
  const codes = new Map<string, { client: string; challenge: string; redirect: string }>()
  const access = new Set<string>(), refresh = new Set<string>(), sessions = new Set<string>()
  const issue = () => {
    const token = randomBytes(24).toString('base64url'), renewal = randomBytes(24).toString('base64url')
    access.add(token); refresh.add(renewal)
    return { access_token: token, refresh_token: renewal, token_type: 'Bearer', expires_in: 3600 }
  }
  let origin = ''
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
  const server = createServer(async (request, response) => {
    // Only bounded requests on a private loopback listener. No diagnostics
    // include bodies, codes, tokens, client secrets or consent URLs.
    const json = (status: number, body: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)) }
    try {
      const url = new URL(request.url ?? '/', origin)
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of request) { size += chunk.length; if (size > 65536) { json(413, {}); return } chunks.push(chunk) }
      const raw = Buffer.concat(chunks).toString('utf8')
      const resource = config.resourcePath.startsWith('https:') ? config.resourcePath : `${origin}${config.resourcePath}`
      const issuer = `${origin}${config.issuerPath}`
      if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
        json(200, { resource, authorization_servers: [issuer], scopes_supported: ['read'] }); return
      }
      if (url.pathname.includes('/.well-known/oauth-authorization-server') || url.pathname.includes('/.well-known/openid-configuration')) {
        json(200, { issuer, authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, ...(config.registration ? { registration_endpoint: `${origin}/register` } : {}), code_challenge_methods_supported: config.s256 ? ['S256'] : [], token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'], authorization_response_iss_parameter_supported: true }); return
      }
      if (url.pathname === '/register' && request.method === 'POST') {
        if (!config.registration) { json(404, {}); return }
        const input = JSON.parse(raw)
        if (input.token_endpoint_auth_method !== 'none') { json(400, { error: 'invalid_client_metadata' }); return }
        counts.registrations++; const id = `registered-${counts.registrations}`; clients.set(id, null)
        json(201, { client_id: id, token_endpoint_auth_method: 'none' }); return
      }
      if (url.pathname === '/authorize') {
        if (request.headers.referer && new URL(request.headers.referer).pathname !== '/') counts.pathReferrers++
        response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', ...(config.coop ? { 'Cross-Origin-Opener-Policy': 'same-origin' } : {}) })
        const query = url.searchParams.toString()
        response.end(`<!doctype html><html><meta name="viewport" content="width=device-width"><h1>Vendor consent</h1><p>Test account</p><a href="/decision?${escape(query)}&choice=allow">Allow</a> <a href="/decision?${escape(query)}&choice=deny">Deny</a></html>`); return
      }
      if (url.pathname === '/decision') {
        const redirect = url.searchParams.get('redirect_uri') ?? ''
        const back = new URL(redirect)
        if (!['localhost', '127.0.0.1', '[::1]'].includes(back.hostname)) { json(400, {}); return }
        back.searchParams.set('state', url.searchParams.get('state') ?? ''); back.searchParams.set('iss', issuer)
        if (config.deny || url.searchParams.get('choice') === 'deny') {
          back.searchParams.set('error', 'access_denied'); back.searchParams.set('error_description', '<script>denied</script>')
        } else {
          const code = randomBytes(24).toString('base64url')
          codes.set(code, { client: url.searchParams.get('client_id') ?? '', challenge: url.searchParams.get('code_challenge') ?? '', redirect })
          back.searchParams.set('code', code)
        }
        response.writeHead(302, { Location: back.href, 'Cache-Control': 'no-store' }); response.end(); return
      }
      if (url.pathname === '/token' && request.method === 'POST') {
        const form = new URLSearchParams(raw)
        let client = form.get('client_id') ?? '', secret: string | null = null
        if (request.headers.authorization?.startsWith('Basic ')) {
          const pair = Buffer.from(request.headers.authorization.slice(6), 'base64').toString('utf8'); const colon = pair.indexOf(':')
          client = decodeURIComponent(pair.slice(0, colon)); secret = decodeURIComponent(pair.slice(colon + 1))
        }
        if (!clients.has(client) || clients.get(client) !== secret) { json(400, { error: 'invalid_client' }); return }
        if (form.get('grant_type') === 'authorization_code') {
          counts.exchanges++; const code = form.get('code') ?? '', held = codes.get(code); codes.delete(code)
          const challenge = createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url')
          if (!held || held.client !== client || held.challenge !== challenge || held.redirect !== form.get('redirect_uri')) { json(400, { error: 'invalid_grant' }); return }
          json(200, issue()); return
        }
        counts.refreshes++; const renewal = form.get('refresh_token') ?? ''
        if (!refresh.delete(renewal)) { json(400, { error: 'invalid_grant' }); return }
        json(200, issue()); return
      }
      if (url.pathname === '/mcp') {
        const bearer = request.headers.authorization?.replace(/^Bearer /, '') ?? ''
        if (!access.has(bearer)) {
          response.writeHead(401, { 'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`, 'Content-Type': 'application/json' }); response.end('{}'); return
        }
        if (config.mcpStatus) { json(config.mcpStatus, { error: 'outage' }); return }
        if (request.method === 'DELETE') { sessions.delete(String(request.headers['mcp-session-id'])); response.writeHead(204); response.end(); return }
        const body = JSON.parse(raw)
        if (body.method === 'initialize') {
          counts.handshakes++; const session = randomBytes(12).toString('hex'); sessions.add(session)
          response.setHeader('Mcp-Session-Id', session)
          json(200, { jsonrpc: '2.0', id: body.id, result: { protocolVersion: body.params.protocolVersion, capabilities: {}, serverInfo: { name: 'loopback-fixture', version: '1' } } }); return
        }
        if (!sessions.has(String(request.headers['mcp-session-id']))) { json(400, {}); return }
        if (body.method === 'notifications/initialized') { response.writeHead(202); response.end(); return }
        json(200, { jsonrpc: '2.0', id: body.id, result: { tools: [] } }); return
      }
      json(404, {})
    } catch { if (!response.headersSent) response.writeHead(400); response.end() }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('no loopback listener')
  origin = `http://127.0.0.1:${address.port}`
  return { origin, mcpUrl: `${origin}/mcp`, config, counts, expire() { access.clear() }, revoke() { access.clear(); refresh.clear() }, stop: () => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(err => err ? reject(err) : resolve()) }) }
}
```

**Replace:** `web/src/components/OauthClientForm.test.tsx`

Before:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'

const item = connection({ cred_kind: 'oauth_client', oauth: { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback', client_id: 'active', has_client_secret: true, pending_client: { client_id: 'pending', has_client_secret: true } } })
function setup() {
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, item) })
  const onChanged = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={onChanged} /></ClientContext.Provider>)
  return { ...server, onChanged }
}
it('starts from pending settings and explains the grant stays until consent', () => {
  setup(); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
  expect(document.body.textContent).toContain('The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect.')
})
it('keeps the secret of the selected slot, never the active id', async () => {
  const s = setup(); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending' })
})
it('does not let a changed id inherit a secret', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new secret or a public client for a new client ID.')
  expect(s.sent).toHaveLength(0)
})
it('explicit public client sends null', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending', client_secret: null })
})
it('clears secret before I/O, opts out of managers and correction, and ignores a duplicate send', async () => {
  let finish!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret')
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'new-password')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  expect(field).toHaveAttribute('data-lpignore', 'true'); expect(field).toHaveAttribute('data-bwignore', '')
  expect(field).toHaveAttribute('data-form-type', 'other'); expect(field).toHaveAttribute('name', 'vendor-client-secret')
  expect(field.closest('form')).toHaveAttribute('method', 'post'); expect(field.closest('form')).toHaveAttribute('autocomplete', 'off')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ client_id: 'pending', client_secret: 'secret-canary' })
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'false')
  fireEvent.change(field, { target: { value: 'replacement' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => finish(json(200, item))); expect(screen.getByRole('status')).toHaveTextContent('Client saved.')
  fireEvent.change(field, { target: { value: 'next' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(screen.queryByRole('status')).toBeNull(); await act(async () => finish(json(200, item)))
})
it('clears saved feedback when the destination changes', async () => {
  const server = stubServer({ ['PUT /api/mcp/connections/' + item.id + '/oauth-client']: json(200, item) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item)); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await screen.findByRole('status'); s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(screen.queryByRole('status')).toBeNull()
})
it('clears a retained field and resets draft intent on URL, kind or stored-client change', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item))
  fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'draft' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret'); fireEvent.change(field, { target: { value: 'discarded' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } }); expect(field).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const retained = screen.getByLabelText('Client secret'); fireEvent.change(retained, { target: { value: 'discarded-again' } })
  s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(retained).toHaveValue(''); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByLabelText('Client secret action')).toHaveValue('keep')
  s.rerender(view({ ...item, oauth: { ...item.oauth!, pending_client: { client_id: 'new', has_client_secret: false } } }))
  expect(screen.getByLabelText('Client ID')).toHaveValue('new')
})
it('shares a pending public-client write even though its request needs no entered secret', async () => {
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(ok => { resolve = ok }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  const save = screen.getByRole('button', { name: 'Save client' })
  fireEvent.click(save); fireEvent.click(save); expect(fetch).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => resolve(json(200, item))); expect(save).toHaveAttribute('aria-disabled', 'false')
})
```

After:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { connection } from '../test-fixtures'
import { json, stubServer } from '../test-server'
import OauthClientForm from './OauthClientForm'
import { useState } from 'react'

const item = connection({ cred_kind: 'oauth_client', oauth: { redirect_uri: 'https://hennery.example/api/mcp/oauth/callback', client_id: 'active', has_client_secret: true, pending_client: { client_id: 'pending', has_client_secret: true } } })
function setup() {
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, item) })
  const onChanged = vi.fn()
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(async () => {}), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={onChanged} /></ClientContext.Provider>)
  return { ...server, onChanged }
}
it('starts from pending settings and explains the grant stays until consent', () => {
  setup(); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByText('Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.')).toBeVisible()
  expect(screen.getByText(item.oauth!.redirect_uri)).toBeVisible()
  expect(document.body.textContent).toContain('The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect.')
})
it('keeps the secret of the selected slot, never the active id', async () => {
  const s = setup(); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending' })
})
it('does not let a changed id inherit a secret', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new secret or a public client for a new client ID.')
  expect(s.sent).toHaveLength(0)
})
it('explicit public client sends null', async () => {
  const s = setup(); fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); await waitFor(() => expect(s.onChanged).toHaveBeenCalled())
  expect(s.sent[0].body).toEqual({ client_id: 'pending', client_secret: null })
})
it('clears secret before I/O, opts out of managers and correction, and ignores a duplicate send', async () => {
  let finish!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret')
  expect(field).toHaveAttribute('type', 'password'); expect(field).toHaveAttribute('autocomplete', 'new-password')
  expect(field).toHaveAttribute('spellcheck', 'false'); expect(field).toHaveAttribute('autocorrect', 'off')
  expect(field).toHaveAttribute('autocapitalize', 'off'); expect(field).toHaveAttribute('data-1p-ignore', '')
  expect(field).toHaveAttribute('data-lpignore', 'true'); expect(field).toHaveAttribute('data-bwignore', '')
  expect(field).toHaveAttribute('data-form-type', 'other'); expect(field).toHaveAttribute('name', 'vendor-client-secret')
  expect(field.closest('form')).toHaveAttribute('method', 'post'); expect(field.closest('form')).toHaveAttribute('autocomplete', 'off')
  fireEvent.change(field, { target: { value: 'secret-canary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(field).toHaveValue(''); expect(document.body.textContent).not.toContain('secret-canary')
  expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ client_id: 'pending', client_secret: 'secret-canary' })
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Save client' })); expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => finish(json(400, { code: 'invalid', message: 'refused' })))
  expect(await screen.findByRole('alert')).toHaveTextContent('refused'); expect(field).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Save client' })).toHaveAttribute('aria-disabled', 'false')
  fireEvent.change(field, { target: { value: 'replacement' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(fetch).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => finish(json(200, item))); expect(screen.getByRole('status')).toHaveTextContent('Client saved.')
  fireEvent.change(field, { target: { value: 'next' } }); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  expect(screen.queryByRole('status')).toBeNull(); await act(async () => finish(json(200, item)))
})
it('clears saved feedback when the destination changes', async () => {
  const server = stubServer({ ['PUT /api/mcp/connections/' + item.id + '/oauth-client']: json(200, item) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item)); fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await screen.findByRole('status'); s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(screen.queryByRole('status')).toBeNull()
})
it('clears a retained field and resets draft intent on URL, kind or stored-client change', () => {
  const client = new Client({ fetch: vi.fn(), navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  const view = (c: typeof item) => <ClientContext.Provider value={client}><OauthClientForm connection={c} onChanged={vi.fn()} /></ClientContext.Provider>
  const s = render(view(item))
  fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'draft' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const field = screen.getByLabelText('Client secret'); fireEvent.change(field, { target: { value: 'discarded' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } }); expect(field).toHaveValue('')
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  const retained = screen.getByLabelText('Client secret'); fireEvent.change(retained, { target: { value: 'discarded-again' } })
  s.rerender(view({ ...item, url: 'https://other.example/mcp' }))
  expect(retained).toHaveValue(''); expect(screen.getByLabelText('Client ID')).toHaveValue('pending')
  expect(screen.getByLabelText('Client secret action')).toHaveValue('keep')
  s.rerender(view({ ...item, oauth: { ...item.oauth!, pending_client: { client_id: 'new', has_client_secret: false } } }))
  expect(screen.getByLabelText('Client ID')).toHaveValue('new')
})
it('keeps successful feedback when the server supplies the newly saved client id', async () => {
  const fresh = { ...item, oauth: { redirect_uri: item.oauth!.redirect_uri, has_client_secret: false } }
  const saved = { ...fresh, oauth: { ...fresh.oauth, client_id: 'new', has_client_secret: true } }
  const server = stubServer({ [`PUT /api/mcp/connections/${item.id}/oauth-client`]: json(200, saved) })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  function Editor() { const [c, change] = useState<typeof item>(fresh); return <OauthClientForm connection={c} onChanged={change} /> }
  render(<ClientContext.Provider value={client}><Editor /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'new' } })
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'replace' } })
  fireEvent.change(screen.getByLabelText('Client secret'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save client' }))
  await waitFor(() => expect(screen.getByText('new')).toBeVisible())
  expect(screen.getByRole('status')).toHaveTextContent('Client saved. Connect to authorize it.')
})
it('shares a pending public-client write even though its request needs no entered secret', async () => {
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(ok => { resolve = ok }))
  const client = new Client({ fetch: fetch as typeof globalThis.fetch, navigate: vi.fn(), stepUp: vi.fn(), here: () => ({ pathname: '/mcp', search: '' }) })
  render(<ClientContext.Provider value={client}><OauthClientForm connection={item} onChanged={vi.fn()} /></ClientContext.Provider>)
  fireEvent.change(screen.getByLabelText('Client secret action'), { target: { value: 'public' } })
  const save = screen.getByRole('button', { name: 'Save client' })
  fireEvent.click(save); fireEvent.click(save); expect(fetch).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('alert')).toBeNull()
  await act(async () => resolve(json(200, item))); expect(save).toHaveAttribute('aria-disabled', 'false')
})
```

**Replace:** `web/src/components/OauthClientForm.tsx`

Before:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useClient } from '../app-client'
import { setOauthClient } from '../api/mcp'
import { messageOf } from '../api/errors'
import { clientRequest } from '../lib/mcpOauth'
import { Text } from '../lib/text'
import { originOf } from '../lib/mcp'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm({ connection: c, onChanged }: OauthClientProps) {
  const client = useClient()
  const slot = c.oauth?.pending_client ?? c.oauth
  const stored = slot?.client_id
  const [id, setId] = useState(stored ?? '')
  const [mode, setMode] = useState<'keep' | 'public' | 'replace'>(stored ? 'keep' : 'public')
  const field = useRef<HTMLInputElement>(null)
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setId(stored ?? ''); setMode(stored ? 'keep' : 'public'); setSaved(false)
    if (field.current) field.current.value = ''
  }, [stored, c.url, c.cred_kind])
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (running.current) return
    const secret = field.current?.value ?? ''
    if (field.current) field.current.value = ''
    setSaved(false)
    const body = clientRequest(stored, id, mode, secret)
    if (!body) { setError('Choose a new secret or a public client for a new client ID. Enter a client ID and any replacement secret.'); return }
    running.current = true; setBusy(true); setError(null)
    try { onChanged(await setOauthClient(client, c.id, body)); setSaved(true) }
    catch (err) { setError(messageOf(err)) }
    finally { running.current = false; setBusy(false) }
  }
  return <section aria-label="Pre-registered OAuth client" className="oauth-client">
    <p>Register this redirect URI at the vendor: <Text className="mono">{c.oauth?.redirect_uri ?? ''}</Text></p>
    {c.oauth?.client_id && <p>Active client: <Text className="mono">{c.oauth.client_id}</Text>. Active secret: {c.oauth.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Pending client: <Text className="mono">{c.oauth.pending_client.client_id}</Text>. Pending secret: {c.oauth.pending_client.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.</p>}
    <p>Client secret: {slot?.has_client_secret ? 'Stored; never shown again.' : 'None stored.'}</p>
    <form method="post" autoComplete="off" onSubmit={send}>
      <label className="field"><span className="field-label">Client ID</span><input className="text-input mono" value={id} maxLength={512} autoComplete="off" spellCheck={false} onChange={e => setId(e.target.value)} /></label>
      <label className="select-field"><span className="field-label">Client secret action</span><select value={mode} onChange={e => { if (field.current) field.current.value = ''; setMode(e.target.value as typeof mode) }}>
        {stored && <option value="keep">Keep stored settings for this client ID</option>}
        <option value="public">Public client (no secret)</option><option value="replace">Set a new secret</option>
      </select></label>
      {mode === 'replace' && <label className="field"><span className="field-label">Client secret</span><input ref={field} type="password" className="text-input mono" name="vendor-client-secret" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="" data-lpignore="true" data-bwignore="" data-form-type="other" /></label>}
      <p className="hint">Client settings for <Text>{c.label}</Text> at <Text>{originOf(c.url) ?? c.url}</Text>, hat <Text>{c.hat_id}</Text>. The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect. No route shows it again.</p>
      <button type="submit" className="btn btn-primary btn-sm" aria-disabled={busy}>Save client</button>
      {saved && <p role="status">Client saved. Connect to authorize it.</p>}
      {error && <p className="form-error" role="alert"><Text>{error}</Text></p>}
    </form>
  </section>
}
```

After:

```typescript
import type { McpConnectionItem } from '../generated/protocol'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useClient } from '../app-client'
import { setOauthClient } from '../api/mcp'
import { messageOf } from '../api/errors'
import { clientRequest } from '../lib/mcpOauth'
import { Text } from '../lib/text'
import { originOf } from '../lib/mcp'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm({ connection: c, onChanged }: OauthClientProps) {
  const client = useClient()
  const slot = c.oauth?.pending_client ?? c.oauth
  const stored = slot?.client_id
  const [id, setId] = useState(stored ?? '')
  const [mode, setMode] = useState<'keep' | 'public' | 'replace'>(stored ? 'keep' : 'public')
  const field = useRef<HTMLInputElement>(null)
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setId(stored ?? ''); setMode(stored ? 'keep' : 'public')
    if (field.current) field.current.value = ''
  }, [stored, c.url, c.cred_kind])
  useEffect(() => { setSaved(false) }, [c.url, c.cred_kind])
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (running.current) return
    const secret = field.current?.value ?? ''
    if (field.current) field.current.value = ''
    setSaved(false)
    const body = clientRequest(stored, id, mode, secret)
    if (!body) { setError('Choose a new secret or a public client for a new client ID. Enter a client ID and any replacement secret.'); return }
    running.current = true; setBusy(true); setError(null)
    try { onChanged(await setOauthClient(client, c.id, body)); setSaved(true) }
    catch (err) { setError(messageOf(err)) }
    finally { running.current = false; setBusy(false) }
  }
  return <section aria-label="Pre-registered OAuth client" className="oauth-client">
    <p>Register this redirect URI at the vendor: <Text className="mono">{c.oauth?.redirect_uri ?? ''}</Text></p>
    {c.oauth?.client_id && <p>Active client: <Text className="mono">{c.oauth.client_id}</Text>. Active secret: {c.oauth.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Pending client: <Text className="mono">{c.oauth.pending_client.client_id}</Text>. Pending secret: {c.oauth.pending_client.has_client_secret ? 'stored' : 'none'}.</p>}
    {c.oauth?.pending_client && <p>Saved settings take effect after a successful Connect. The current grant stays in use meanwhile. The pending client uses the vendor token endpoint it is pinned to at the next Connect.</p>}
    <p>Client secret: {slot?.has_client_secret ? 'Stored; never shown again.' : 'None stored.'}</p>
    <form method="post" autoComplete="off" onSubmit={send}>
      <label className="field"><span className="field-label">Client ID</span><input className="text-input mono" value={id} maxLength={512} autoComplete="off" spellCheck={false} onChange={e => setId(e.target.value)} /></label>
      <label className="select-field"><span className="field-label">Client secret action</span><select value={mode} onChange={e => { if (field.current) field.current.value = ''; setMode(e.target.value as typeof mode) }}>
        {stored && <option value="keep">Keep stored settings for this client ID</option>}
        <option value="public">Public client (no secret)</option><option value="replace">Set a new secret</option>
      </select></label>
      {mode === 'replace' && <label className="field"><span className="field-label">Client secret</span><input ref={field} type="password" className="text-input mono" name="vendor-client-secret" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="" data-lpignore="true" data-bwignore="" data-form-type="other" /></label>}
      <p className="hint">Client settings for <Text>{c.label}</Text> at <Text>{originOf(c.url) ?? c.url}</Text>, hat <Text>{c.hat_id}</Text>. The gateway sends the secret only to the vendor token endpoint it is pinned to at the next Connect. No route shows it again.</p>
      <button type="submit" className="btn btn-primary btn-sm" aria-disabled={busy}>Save client</button>
      {saved && <p role="status">Client saved. Connect to authorize it.</p>}
      {error && <p className="form-error" role="alert"><Text>{error}</Text></p>}
    </form>
  </section>
}
```

**Replace:** `web/src/components/Shell.tsx`

Before:

```typescript
// The signed-in app's frame (frontend spec §2): one component tree for every
// width (F-3). From 768 px a rail with the views beside the content; under
// it a top bar and a bottom tab bar. Which views exist comes from
// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
import { useEffect, useState } from 'react'
import { capabilities } from '../api/auth'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { CapabilitiesResponse } from '../generated/protocol'
import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
import { Icon } from '../lib/ui'
import { Link, type Route } from '../router'
import Hats from '../screens/Hats'
import Hosts from '../screens/Hosts'
import NewSession from '../screens/NewSession'
import Mcp from '../screens/Mcp'
import Placeholder from '../screens/Placeholder'
import SignOut from './SignOut'
import SessionView from '../screens/Session'
import { useMediaQuery } from '../hooks/useMediaQuery'
import SessionList from './SessionList'
import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'
import McpScope, { McpBadge } from './McpScope'

/** The rail's width and up (frontend spec §2). */
export const DESKTOP = '(min-width: 768px)'

const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
  sessions: Icon.List,
  new: Icon.Plus,
  hosts: Icon.Cpu,
  mcp: Icon.Wrench,
  hats: Icon.Sparkle,
  settings: Icon.Shield,
}

/** `/sessions/:id`: the session, its header fed by the list store's summary
 *  (kept current by the list stream) when the list holds it. A session the
 *  view finds gone leaves the list. While the
 *  list's first page is on its way the header waits for it; only a session
 *  the list does not hold fetches its detail. The address is the selection
 *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
function SessionRoute({ id }: { id: string }) {
  const list = useSessionScope()?.list
  return (
    <SessionView
      id={id}
      summary={list?.all.get(id)}
      awaitSummary={!!list && list.loading && !list.error}
      onRemoved={list?.remove}
    />
  )
}

export default function Shell({ route }: { route: Route }) {
  const client = useClient()
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const desktop = useMediaQuery(DESKTOP)

  useEffect(() => {
    let live = true
    setError(null)
    capabilities(client).then(
      (c) => live && setCaps(c),
      (err) => {
        // A 401 has already sent the browser to sign in.
        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
      },
    )
    return () => {
      live = false
    }
  }, [client, attempt])

  if (!caps) {
    return (
      <main className="auth">
        <div className="auth-card" role="status">
          {error ? (
            <>
              <p className="form-error">
                <bdi>{error}</bdi>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </main>
    )
  }

  const views = viewsOf(caps.mode)
  const current = viewOf(route.name)
  const shown = current !== null && views.includes(current)
  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'

  const frame = (
    <div className="app">
      <aside className="rail" aria-label="Views">
        <div className="rail-head">
          <span className="brand-name">hennery</span>
          <WaitingBadge />
        </div>
        {views.includes('new') && (
          <Link to={PATH.new} className="new-btn">
            <Icon.Plus size={17} /> New session
          </Link>
        )}
        <nav className="rail-nav">
          {views
            .filter((v) => v !== 'new')
            .map((v) => {
              const Glyph = ICON[v]
              return (
                <Link
                  key={v}
                  to={PATH[v]}
                  className={'nav-item' + (v === current ? ' on' : '')}
                  aria-current={v === current ? 'page' : undefined}
                >
                  <Glyph size={17} /> {LABEL[v]}{v === 'mcp' && <McpBadge />}
                </Link>
              )
            })}
        </nav>
        <div className="rail-scroll">{desktop && <SessionList />}</div>
        <div className="rail-foot">
          <SignOut />
        </div>
      </aside>
      <div className="shell">
        <header className="mtopbar">
          <div className="mtb-mid">
            <div className="mtb-eyebrow">hennery</div>
            <div className="mtb-title">{title}</div>
          </div>
          <WaitingBadge />
        </header>
        <main className="main">
          {route.name === 'not_found' ? (
            <Placeholder title="Not found" text="No page lives at this address." />
          ) : !shown ? (
            <Placeholder title={title} text="This view is not part of this deployment." />
          ) : route.name === 'hosts' ? (
            <Hosts />
          ) : route.name === 'hats' ? (
            <Hats />
          ) : route.name === 'sessions' && !desktop ? (
            <SessionList screen />
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
            // A desktop at /sessions with no row to open: an empty hat, a
            // search with no match, or before the first page has come.
            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
          ) : (
            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
          )}
        </main>
        <nav className="tabbar" aria-label="Tabs">
          {tabsOf(caps.mode).map((v) => {
            const Glyph = ICON[v]
            return (
              <Link
                key={v}
                to={PATH[v]}
                className={'tab' + (v === current ? ' on' : '')}
                aria-current={v === current ? 'page' : undefined}
              >
                <Glyph size={20} />
                <span>{v === 'new' ? 'New' : LABEL[v]}</span>{v === 'mcp' && <McpBadge />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
  const scoped = views.includes('sessions') ? (
    <SessionScope route={route} desktop={desktop}>
      {frame}
    </SessionScope>
  ) : (
    frame
  )
  return caps.features.includes('mcp_connections') && caps.features.includes('mcp_oauth') ? <McpScope active={route.name === 'mcp'}>{scoped}</McpScope> : scoped
}
```

After:

```typescript
// The signed-in app's frame (frontend spec §2): one component tree for every
// width (F-3). From 768 px a rail with the views beside the content; under
// it a top bar and a bottom tab bar. Which views exist comes from
// `GET /api/capabilities`, which also tells a signed-out browser to sign in.
import { useEffect, useState } from 'react'
import { capabilities } from '../api/auth'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { CapabilitiesResponse } from '../generated/protocol'
import { LABEL, PATH, tabsOf, viewOf, viewsOf, type View } from '../lib/views'
import { Icon } from '../lib/ui'
import { Link, type Route } from '../router'
import Hats from '../screens/Hats'
import Hosts from '../screens/Hosts'
import NewSession from '../screens/NewSession'
import Mcp from '../screens/Mcp'
import Placeholder from '../screens/Placeholder'
import SignOut from './SignOut'
import SessionView from '../screens/Session'
import { useMediaQuery } from '../hooks/useMediaQuery'
import SessionList from './SessionList'
import SessionScope, { WaitingBadge, useSessionScope } from './SessionScope'
import McpScope, { McpBadge } from './McpScope'

/** The rail's width and up (frontend spec §2). */
export const DESKTOP = '(min-width: 768px)'

const ICON: Record<View, (p: { size?: number }) => React.JSX.Element> = {
  sessions: Icon.List,
  new: Icon.Plus,
  hosts: Icon.Cpu,
  mcp: Icon.Wrench,
  hats: Icon.Sparkle,
  settings: Icon.Shield,
}

/** `/sessions/:id`: the session, its header fed by the list store's summary
 *  (kept current by the list stream) when the list holds it. A session the
 *  view finds gone leaves the list. While the
 *  list's first page is on its way the header waits for it; only a session
 *  the list does not hold fetches its detail. The address is the selection
 *  (F-11, F-19): shown whatever the hat, and whether or not the list holds it. */
function SessionRoute({ id }: { id: string }) {
  const list = useSessionScope()?.list
  return (
    <SessionView
      id={id}
      summary={list?.all.get(id)}
      awaitSummary={!!list && list.loading && !list.error}
      onRemoved={list?.remove}
    />
  )
}

export default function Shell({ route }: { route: Route }) {
  const client = useClient()
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const desktop = useMediaQuery(DESKTOP)

  useEffect(() => {
    let live = true
    setError(null)
    capabilities(client).then(
      (c) => live && setCaps(c),
      (err) => {
        // A 401 has already sent the browser to sign in.
        if (live && !(err instanceof Error && err.name === 'Unauthenticated')) setError(messageOf(err))
      },
    )
    return () => {
      live = false
    }
  }, [client, attempt])

  if (!caps) {
    return (
      <main className="auth">
        <div className="auth-card" role="status">
          {error ? (
            <>
              <p className="form-error">
                <bdi>{error}</bdi>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </main>
    )
  }

  const views = viewsOf(caps.mode)
  const current = viewOf(route.name)
  const shown = current !== null && views.includes(current)
  const title = route.name === 'not_found' ? 'Not found' : current ? LABEL[current] : 'hennery'

  const frame = (
    <div className="app">
      <aside className="rail" aria-label="Views">
        <div className="rail-head">
          <span className="brand-name">hennery</span>
          <WaitingBadge />
        </div>
        {views.includes('new') && (
          <Link to={PATH.new} className="new-btn">
            <Icon.Plus size={17} /> New session
          </Link>
        )}
        <nav className="rail-nav">
          {views
            .filter((v) => v !== 'new')
            .map((v) => {
              const Glyph = ICON[v]
              return (
                <Link
                  key={v}
                  to={PATH[v]}
                  className={'nav-item' + (v === current ? ' on' : '')}
                  aria-current={v === current ? 'page' : undefined}
                >
                  <Glyph size={17} /> {LABEL[v]}{v === 'mcp' && <McpBadge />}
                </Link>
              )
            })}
        </nav>
        <div className="rail-scroll">{desktop && <SessionList />}</div>
        <div className="rail-foot">
          <SignOut />
        </div>
      </aside>
      <div className="shell">
        <header className="mtopbar">
          <div className="mtb-mid">
            <div className="mtb-eyebrow">hennery</div>
            <div className="mtb-title">{title}</div>
          </div>
          <WaitingBadge />
          <McpBadge link />
        </header>
        <main className="main">
          {route.name === 'not_found' ? (
            <Placeholder title="Not found" text="No page lives at this address." />
          ) : !shown ? (
            <Placeholder title={title} text="This view is not part of this deployment." />
          ) : route.name === 'hosts' ? (
            <Hosts />
          ) : route.name === 'hats' ? (
            <Hats />
          ) : route.name === 'sessions' && !desktop ? (
            <SessionList screen />
          ) : route.name === 'new' ? (
            <NewSession />
          ) : route.name === 'mcp' ? (
            // The gateway's screen exists only where its API is served
            // (4b: a screen behind a feature checks `features`).
            caps.features.includes('mcp_connections') ? (
              <Mcp stdio={caps.features.includes('mcp_stdio')} oauth={caps.features.includes('mcp_oauth')} />
            ) : (
              <Placeholder title={title} text="The MCP gateway is not part of this deployment." />
            )
          ) : route.name === 'session' ? (
            <SessionRoute key={route.id} id={route.id ?? ''} />
          ) : route.name === 'sessions' ? (
            // A desktop at /sessions with no row to open: an empty hat, a
            // search with no match, or before the first page has come.
            <Placeholder title={title} text="Pick a session from the list, or start a new one." />
          ) : (
            <Placeholder title={title} text="This screen arrives in a later part of the web UI." />
          )}
        </main>
        <nav className="tabbar" aria-label="Tabs">
          {tabsOf(caps.mode).map((v) => {
            const Glyph = ICON[v]
            return (
              <Link
                key={v}
                to={PATH[v]}
                className={'tab' + (v === current ? ' on' : '')}
                aria-current={v === current ? 'page' : undefined}
              >
                <Glyph size={20} />
                <span>{v === 'new' ? 'New' : LABEL[v]}</span>{v === 'mcp' && <McpBadge />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
  const scoped = views.includes('sessions') ? (
    <SessionScope route={route} desktop={desktop}>
      {frame}
    </SessionScope>
  ) : (
    frame
  )
  return caps.features.includes('mcp_connections') && caps.features.includes('mcp_oauth') ? <McpScope active={route.name === 'mcp'}>{scoped}</McpScope> : scoped
}
```

**Replace:** `web/src/manage.css`

Before:

```css
/* The management screens (plan 4d): Hosts, Hats and Settings. Their own
   file, so the shell's index.css stays the shell's. Mobile-first: one
   column, every target at least 44 px under 768 px. */

.manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
.manage-head { display:flex; align-items:center; gap:12px; }
.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
.cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
.card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.card-title { font-family:var(--font-display); font-weight:700; font-size:16px; margin:0; min-width:0; overflow-wrap:anywhere; flex:1; }
.card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; }
.card-actions .spacer { flex:1; }
.card p { margin:0 0 10px; overflow-wrap:anywhere; }
.notice { border-color:var(--accent); }

.facts { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:4px 14px; margin:0; font-size:14px; }
.facts dt { color:var(--fg-muted); }
.facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }

.state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
.state-online { background:rgba(47,158,68,.13); color:#247A33; }
.state-offline { background:var(--surface-3); color:var(--fg-muted); }
.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
.host-revoked .card-title { color:var(--fg-muted); }
.tag { background:var(--accent-wash); color:var(--accent); }
.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }

.swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
.colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }

.inline-form { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:8px; }
.inline-form .field { margin:0; flex:1; min-width:180px; }
.select-field { display:inline-flex; flex-direction:column; gap:4px; }
.select-field .field-label { margin:0; font-size:12px; }
.select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }

.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
.pairing-code code { font-family:var(--font-mono); font-weight:700; }
.hint { color:var(--fg-muted); font-size:13px; }
.empty { color:var(--fg-muted); }
.sign-out-error { margin-top:8px; font-size:13px; }

.rules { margin-top:12px; }
.rule-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rule { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.rule .field { margin:0; }
.rule-prefix { flex:1; min-width:200px; }
.tester { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
.tester .field { margin:0 0 6px; }
.purge-list { margin:0 0 12px; padding-left:20px; overflow-wrap:anywhere; }

@media (max-width:767px) {
  .manage { padding:16px 14px calc(24px + env(safe-area-inset-bottom)); }
  .manage-head h1 { font-size:22px; }
  .manage-head .btn, .card-actions .btn, .inline-form .btn, .rule .btn { min-height:44px; }
  .select-field select, .colour-input { min-height:44px; }
}

/* MCP (plan 4e): the connection form, the token and the mounts. */
.connection .card-actions .btn[aria-disabled="true"] { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
.connection-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.connection-form .field, .connection-form .hint { margin:0; }
.field-row { display:flex; gap:10px; flex-wrap:wrap; }
.field-row .field { flex:1; min-width:160px; }
.check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
.check input { width:18px; height:18px; margin:0; flex:none; }
.hint.warn { color:#B26A00; }
.token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
.mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
.mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
.mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

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

.oauth-client { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); }
.oauth-client p { overflow-wrap:anywhere; }
.oauth-client form { display:grid; gap:12px; }
.oauth-client select { min-height:44px; max-width:100%; }
.oauth-connect, .mcp-report { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); overflow-wrap:anywhere; }
.oauth-connect .notice { margin-top:12px; }
.oauth-connect a { display:inline-block; min-height:44px; padding:12px 0; }
.mcp-attention { display:inline-block; font-size:10px; line-height:1.2; white-space:normal; }
.mcp-auth-count { color:var(--warn); }
.mcp-error-count { color:var(--fg-2); }
```

After:

```css
/* The management screens (plan 4d): Hosts, Hats and Settings. Their own
   file, so the shell's index.css stays the shell's. Mobile-first: one
   column, every target at least 44 px under 768 px. */

.manage { width:100%; max-width:860px; margin:0 auto; padding:24px 20px calc(32px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
.manage-head { display:flex; align-items:center; gap:12px; }
.manage-head h1 { font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-.01em; margin:0; flex:1; }
.cards { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--sh-sm); padding:16px 18px; min-width:0; }
.card-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.card-title { font-family:var(--font-display); font-weight:700; font-size:16px; margin:0; min-width:0; overflow-wrap:anywhere; flex:1; }
.card-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; }
.card-actions .spacer { flex:1; }
.card p { margin:0 0 10px; overflow-wrap:anywhere; }
.notice { border-color:var(--accent); }

.facts { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:4px 14px; margin:0; font-size:14px; }
.facts dt { color:var(--fg-muted); }
.facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }

.state, .tag { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-radius:var(--r-full); padding:3px 9px; white-space:nowrap; }
.state-online { background:rgba(47,158,68,.13); color:#247A33; }
.state-offline { background:var(--surface-3); color:var(--fg-muted); }
.state-revoked { background:rgba(229,72,77,.12); color:var(--st-attn); }
.host-revoked .card-title { color:var(--fg-muted); }
.tag { background:var(--accent-wash); color:var(--accent); }
.tag-warn { background:rgba(232,145,12,.14); color:#B26A00; }

.swatch { width:18px; height:18px; border-radius:6px; flex:none; background:var(--fg-quiet); border:1px solid var(--border-strong); }
.colour-input { width:52px; height:40px; padding:2px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); }

.inline-form { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-top:8px; }
.inline-form .field { margin:0; flex:1; min-width:180px; }
.select-field { display:inline-flex; flex-direction:column; gap:4px; }
.select-field .field-label { margin:0; font-size:12px; }
.select-field select { min-height:36px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); background:var(--surface-2); color:var(--fg-1); padding:6px 8px; font:inherit; max-width:100%; }

.command { background:var(--ink); color:#fff; border-radius:var(--r-sm); padding:12px 14px; margin:0 0 10px; overflow-x:auto; font-family:var(--font-mono); font-size:13px; }
.pairing-code code { font-family:var(--font-mono); font-weight:700; }
.hint { color:var(--fg-muted); font-size:13px; }
.empty { color:var(--fg-muted); }
.sign-out-error { margin-top:8px; font-size:13px; }

.rules { margin-top:12px; }
.rule-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rule { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.rule .field { margin:0; }
.rule-prefix { flex:1; min-width:200px; }
.tester { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
.tester .field { margin:0 0 6px; }
.purge-list { margin:0 0 12px; padding-left:20px; overflow-wrap:anywhere; }

@media (max-width:767px) {
  .manage { padding:16px 14px calc(24px + env(safe-area-inset-bottom)); }
  .manage-head h1 { font-size:22px; }
  .manage-head .btn, .card-actions .btn, .inline-form .btn, .rule .btn { min-height:44px; }
  .select-field select, .colour-input { min-height:44px; }
}

/* MCP (plan 4e): the connection form, the token and the mounts. */
.connection .card-actions .btn[aria-disabled="true"] { opacity:.45; box-shadow:none; transform:none; cursor:not-allowed; }
.connection-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.connection-form .field, .connection-form .hint { margin:0; }
.field-row { display:flex; gap:10px; flex-wrap:wrap; }
.field-row .field { flex:1; min-width:160px; }
.check { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
.check input { width:18px; height:18px; margin:0; flex:none; }
.hint.warn { color:#B26A00; }
.token-form { border-top:1px solid var(--border); padding-top:12px; margin-top:12px; }
.mounts { border:0; border-top:1px solid var(--border); margin:12px 0 0; padding:12px 0 0; min-width:0; }
.mounts legend { font-weight:700; font-size:13px; padding:0; margin-bottom:6px; }
.mcp-ok { background:rgba(47,158,68,.13); color:#247A33; }
.mcp-not_connected { background:var(--surface-3); color:var(--fg-muted); }
.mcp-needs_auth { background:rgba(232,145,12,.14); color:#B26A00; }
.mcp-error { background:rgba(229,72,77,.12); color:var(--st-attn); }

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

.oauth-client { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); }
.oauth-client p { overflow-wrap:anywhere; }
.oauth-client form { display:grid; gap:12px; }
.oauth-client select { min-height:44px; max-width:100%; }
.oauth-connect, .mcp-report { margin-top:16px; padding-top:12px; border-top:1px solid var(--border); overflow-wrap:anywhere; }
.oauth-connect .notice { margin-top:12px; }
.oauth-connect a { display:inline-block; min-height:44px; padding:12px 0; }
.mcp-attention { display:inline-block; font-size:10px; line-height:1.2; white-space:normal; }
.mcp-auth-count { color:#B26A00; }
.mcp-error-count { color:var(--fg-2); }
.oauth-connect .btn, .oauth-client .btn, .mcp-report .btn { min-height:44px; }
.mcp-attention-link { display:inline-flex; align-items:center; max-width:80px; min-height:44px; }
```

**Replace:** `web/src/test/oauthVendor.test.ts`

Before:

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { startVendor } from '../../e2e/oauth-vendor'
it('serves loopback OAuth metadata and a stateful MCP discovery challenge', async () => {
  const vendor = await startVendor()
  try {
    const metadata = await fetch(`${vendor.origin}/.well-known/oauth-authorization-server`)
    expect(metadata.status).toBe(200)
    expect(await metadata.json()).toMatchObject({ issuer: vendor.origin, code_challenge_methods_supported: ['S256'] })
    const challenge = await fetch(vendor.mcpUrl, { method: 'POST', body: '{}' })
    expect(challenge.status).toBe(401); expect(challenge.headers.get('www-authenticate')).toContain('resource_metadata=')
  } finally { await vendor.stop() }
})
```

After:

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { startVendor } from '../../e2e/oauth-vendor'
import { createHash } from 'node:crypto'
import { Server } from 'node:http'
import { createConnection } from 'node:net'
it('serves loopback OAuth metadata and a stateful MCP discovery challenge', async () => {
  const vendor = await startVendor()
  try {
    const metadata = await fetch(`${vendor.origin}/.well-known/oauth-authorization-server`)
    expect(metadata.status).toBe(200)
    expect(await metadata.json()).toMatchObject({ issuer: vendor.origin, code_challenge_methods_supported: ['S256'] })
    const challenge = await fetch(vendor.mcpUrl, { method: 'POST', body: '{}' })
    expect(challenge.status).toBe(401); expect(challenge.headers.get('www-authenticate')).toContain('resource_metadata=')
  } finally { await vendor.stop() }
})
it('requires exact PKCE/client/redirect, consumes codes, rotates refresh and maintains MCP sessions', async () => {
  const vendor = await startVendor()
  try {
    const verifier = 'test-verifier', redirect = 'http://127.0.0.1:12345/callback'
    const client = await (await fetch(vendor.origin + '/register', { method: 'POST', body: JSON.stringify({ token_endpoint_auth_method: 'none' }) })).json() as { client_id: string }
    expect(vendor.counts.registrations).toBe(1)
    const code = async () => {
      const query = new URLSearchParams({ redirect_uri: redirect, state: 'state', client_id: client.client_id, code_challenge: createHash('sha256').update(verifier).digest('base64url'), choice: 'allow' })
      const answer = await fetch(vendor.origin + '/decision?' + query, { redirect: 'manual' })
      const back = new URL(answer.headers.get('location')!)
      expect(back.searchParams.get('state')).toBe('state'); expect(back.searchParams.get('iss')).toBe(vendor.origin)
      return back.searchParams.get('code')!
    }
    const exchange = (held: string, change: Record<string, string> = {}) => fetch(vendor.origin + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client.client_id, code: held, code_verifier: verifier, redirect_uri: redirect, ...change }) })
    const bad = await code(); expect((await exchange(bad, { code_verifier: 'wrong' })).status).toBe(400); expect((await exchange(bad)).status).toBe(400)
    expect((await exchange(await code(), { redirect_uri: 'http://127.0.0.1:12345/other' })).status).toBe(400)
    expect((await exchange(await code(), { client_id: 'public' })).status).toBe(400)
    const held = await code(), answer = await exchange(held); expect(answer.status).toBe(200)
    const grant = await answer.json() as { access_token: string; refresh_token: string }
    expect((await exchange(held)).status).toBe(400)
    const headers: Record<string, string> = { Authorization: 'Bearer ' + grant.access_token }
    const rpc = (body: unknown) => fetch(vendor.mcpUrl, { method: 'POST', headers, body: JSON.stringify(body) })
    const initialize = await rpc({ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })
    expect(initialize.status).toBe(200); expect(vendor.counts.handshakes).toBe(1)
    headers['Mcp-Session-Id'] = initialize.headers.get('mcp-session-id')!
    expect((await rpc({ method: 'notifications/initialized' })).status).toBe(202)
    expect((await rpc({ id: 2, method: 'tools/list' })).status).toBe(200)
    vendor.config.mcpStatus = 503; expect((await rpc({ id: 2, method: 'tools/list' })).status).toBe(503); vendor.config.mcpStatus = null
    expect((await fetch(vendor.mcpUrl, { method: 'DELETE', headers })).status).toBe(204)
    expect((await rpc({ id: 3, method: 'tools/list' })).status).toBe(400)
    vendor.expire(); expect((await rpc({ id: 4, method: 'tools/list' })).status).toBe(401)
    const renew = () => fetch(vendor.origin + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: client.client_id, refresh_token: grant.refresh_token }) })
    expect((await renew()).status).toBe(200); expect((await renew()).status).toBe(400); expect(vendor.counts.refreshes).toBe(2)
    const latest = await (await exchange(await code())).json() as { refresh_token: string }
    vendor.revoke()
    expect((await fetch(vendor.origin + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: client.client_id, refresh_token: latest.refresh_token }) })).status).toBe(400)
    expect(vendor.counts.exchanges).toBe(7)
  } finally { await vendor.stop() }
})
it('binds to the fixture loopback address and closes held sockets on stop', async () => {
  const listen = vi.spyOn(Server.prototype, 'listen')
  const vendor = await startVendor()
  const socket = createConnection({ host: '127.0.0.1', port: Number(new URL(vendor.origin).port) })
  let stopped: Promise<void> | undefined
  try {
    expect(listen).toHaveBeenCalledWith(0, '127.0.0.1', expect.any(Function))
    await new Promise<void>((ok, no) => { socket.once('connect', ok); socket.once('error', no) })
    const server = listen.mock.contexts[0] as Server
    const started = new Promise<void>(ok => server.once('request', () => ok()))
    socket.write('POST /register HTTP/1.1\r\nHost: loopback\r\nContent-Length: 100\r\n\r\nx')
    await started
    let closed = false; socket.on('close', () => { closed = true })
    stopped = vendor.stop()
    await vi.waitFor(() => expect(closed).toBe(true), { timeout: 1500 })
    await stopped
  } finally { socket.destroy(); await (stopped ?? vendor.stop()); listen.mockRestore() }
})
it('supports denial and metadata/COOP switches, refuses foreign returns and wrong client secrets', async () => {
  const vendor = await startVendor()
  try {
    vendor.config.coop = true; vendor.config.registration = false; vendor.config.s256 = false
    const consent = await fetch(vendor.origin + '/authorize?state=s', { headers: { Referer: 'http://localhost:1234/mcp' } })
    expect(consent.headers.get('cross-origin-opener-policy')).toBe('same-origin'); expect(vendor.counts.pathReferrers).toBe(1)
    const metadata = await (await fetch(vendor.origin + '/.well-known/oauth-authorization-server')).json() as { registration_endpoint?: string; code_challenge_methods_supported: string[] }
    expect(metadata.registration_endpoint).toBeUndefined(); expect(metadata.code_challenge_methods_supported).toEqual([])
    expect((await fetch(vendor.origin + '/register', { method: 'POST', body: '{}' })).status).toBe(404)
    expect((await fetch(vendor.origin + '/decision?redirect_uri=https%3A%2F%2Fforeign.example%2Fcallback', { redirect: 'manual' })).status).toBe(400)
    vendor.config.deny = true
    const denied = await fetch(vendor.origin + '/decision?redirect_uri=http%3A%2F%2Flocalhost%3A1234%2Fcallback&choice=allow', { redirect: 'manual' })
    expect(new URL(denied.headers.get('location')!).searchParams.get('error')).toBe('access_denied')
    const refusedClient = await fetch(vendor.origin + '/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from('confidential:wrong').toString('base64') }, body: 'grant_type=authorization_code' })
    expect(refusedClient.status).toBe(400); expect(await refusedClient.json()).toEqual({ error: 'invalid_client' })
    expect((await fetch(vendor.origin + '/missing')).status).toBe(404)
    expect((await fetch(vendor.origin + '/register', { method: 'POST', body: 'x'.repeat(65537) })).status).toBe(413)
  } finally { await vendor.stop() }
})
```

- [ ] Step 4: Run `nix develop -c pnpm --dir web typecheck` and `nix develop -c pnpm --dir web test`; both must exit 0. Review the task diff against the named lane rules, check the author, commit with signing disabled and push the own branch after green. Parent performs the task review.

Run the full gate below, including both-width OAuth specs and the full browser suite. Run every changed browser file locally before this commit. The vendor fixture never logs request bodies, consent URLs, codes, tokens or secrets.

<!-- END PHASE 5 FEATURE -->

## Full gate, replay and probes

Run from the worktree root inside the plain flake, with HOME/XDG/tool state pointing at lane scratch. Keep long foreground exec sessions and poll to their real exits; do not run a green check during source mutation.

1. Frozen install: `nix develop -c pnpm --dir web install --frozen-lockfile`.
2. Both generators: `nix develop -c cargo run -p hennery-proto --bin gen --locked` and `nix develop -c cargo run -p hennery-view --bin gen-view --locked`. Require no generated diff; also check their `--check` modes on replay. No DTO/schema change is authorized.
3. `nix develop -c pnpm --dir web typecheck`, `nix develop -c pnpm --dir web test`, `nix develop -c pnpm --dir web build`.
4. `HENNERY_WEB_REQUIRE=1 nix develop -c cargo build -p hennery -p hennery-testkit --bins --locked`.
5. `CI=1 nix develop -c pnpm --dir web e2e e2e/mcp-oauth.spec.ts`, then `CI=1 nix develop -c pnpm --dir web e2e`. OAuth is 14 cases per width (28); retain actual full-suite counts and existing-condition skips, rather than interpreting skips as passes.
6. Extract fenced Create/Before/After payloads into a fresh named worktree from `4684d1d9`, check block count > 0, apply each phase using its complete preimage and compare the entire staged tree with the corresponding actual task snapshot. Include the first-commit plan/README as constant artifacts. Tests-only phases fail on assertions; each feature typechecks and passes the complete unit suite. Repeat Task 5 browser red/green against this fresh tree's own embedded binary. Never copy implementation from git to make replay match.
7. Probe every classifier outcome separately: timeout normal/cap/floor/fallback; URL accepted/refused/parse classes and decoded destinations; hint matching/failed/malformed/origin/id/bound; working/failed/pending/removed; keep/public/replace/refusal intent; none/client/connect/reconnect/probe; each known guidance plus unknown/prototype rejection. Each has a positive assertion and an opposite or omitted-result mutation.
8. Probe each side-effect line: request metadata/routes/signals/step-up; popup open/isolate/close/navigation/fallback, channel/listener/timer installation and disposal, wait publication/abort/reset/late-result guards, observation/refusal/confirmation state; form clear/busy/duplicate/save/error/retry/manager boundaries; shared reader coalescing/invalidation/pause/visibility/abort/disposal, probe state and callback fold, screen grant/client confirmation and hook reset/wiring; vendor code/client/PKCE/refresh/session mutation, loopback binding and in-flight socket closure. Omit only one effect or change one valid guard per probe, retain assertion failures and restore exact bytes. Redundant guards that have no independent externally visible effect are not substituted for an untested side-effect line; the line's actual effect is probed independently.
9. M10 separately injects vendor-origin/authorize storage and entered-secret DOM values. New browser assertions must fail at both widths, while reverting to the former vacuous assertions must pass with the same injected violations. No secrets are printed. The early amendment challenge evidence is retained; changed assertions are included in the final browser gate.

Rust production source is untouched by this web-only plan; workspace Rust tests/clippy are outside this brief. The binary and generator checks still build against merged 8f. PR checks/reviewDecision/mergeStateStatus/unresolved threads are the parent's to report; no child GitHub action.

## After this plan

- **Backend flow identity:** add flow identity on the item or the broadcast. A newer ok stamp can reflect successful upstream use while consent is pending; until correlation exists, Working is a gateway report and never proof that sign-in completed (I1).
- **Password-manager residual:** the browser sees an entered client secret. Native password inputs, new-password autocomplete and manager opt-outs cannot guarantee that a browser/extension will not offer to save it. Accepted residual; no custom text-security workaround (M4).
- **Push:** push relay into a service worker is a later follow-up, outside this plan and outside 4f. No push subscription UI before testers. Use the existing connection invalidation seam when a future relay is authorized.
- **Hint browser proof (N3):** the current e2e can pass through focus/closed-handle refetch without hint delivery. Unit tests and 8f's matching envelope prove the hint path today. Add an end-to-end case that isolates BroadcastChannel delivery from those fallbacks and positively observes the subsequent server refetch; a hint must still never fabricate success. This is a test-strength follow-up, accepted by the scoped reviewer (parent, 2026-10-13).
- Preserve PQ1–5 defaults, no account label/chooser/compatibility bypass, and 8f's other backend follow-ups. Live-vendor matrix and maintainer product rulings remain parent/operator work. Do not infer hidden refresh health from absent status or notifications.

Generated with Claude AI — please review before distribution.
